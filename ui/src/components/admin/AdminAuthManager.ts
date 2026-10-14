/** Admin authentication uses Cedros Login or the host-verified admin session. */

import { getLogger } from '../../utils/logger';
import { fetchWithTimeout } from '../../utils/fetchWithTimeout';
import { AdminReadCache } from './AdminReadCache';
import { AdminDataEvents } from './AdminDataEvents';

/** Auth method type */
export type AdminAuthMethod = 'cedros-login' | 'host-session' | 'none';

/** JWT auth headers for cedros-login */
export interface JwtAuthHeaders {
  'Authorization': string;
}

/** Host-session auth relies on the embedding host's same-origin admin session. */
export type HostSessionAuthHeaders = Record<string, never>;
export type AdminAuthHeaders = JwtAuthHeaders | HostSessionAuthHeaders;

/** Preserve HTTP status so consumers can distinguish lost access from transient failures. */
export class AdminApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'AdminApiError';
  }
}

/** Public interface for admin auth management */
export interface IAdminAuthManager {
  /** Get current auth method */
  getAuthMethod(): AdminAuthMethod;

  /** Check if authenticated */
  isAuthenticated(): boolean;

  /** Set cedros-login JWT for JWT-based auth */
  setCedrosLoginAuth(token: string | null, isAdmin?: boolean): void;

  /** Create auth headers for admin request */
  createAuthHeaders(): Promise<AdminAuthHeaders>;

  /** Fetch with admin auth headers */
  fetchWithAuth<T>(path: string, options?: RequestInit): Promise<T>;

  /** Retain one shared Core invalidation stream for a mounted admin surface. */
  retainDataEvents?(): () => void;

  /** Monotonic identity fence for clients that retain mutation state. */
  getIdentityGeneration?(): number;
}

/**
 * Admin Authentication Manager
 *
 * Manages authentication for admin API endpoints.
 * Server routes independently enforce host identity, Pay permissions, and CSRF.
 */
export class AdminAuthManager implements IAdminAuthManager {
  private readonly serverUrl: string;
  private jwtToken: string | null = null;
  private isAdminUser: boolean = false;
  private hostSessionAllowed: boolean = false;
  private identityGeneration = 0;
  // A stale financial read must reach the screen as an error. Screens can keep
  // their last snapshot visible, but must not mistake it for a successful refresh.
  private readonly readCache = new AdminReadCache({ staleIfErrorMs: 0 });
  private readonly dataEvents: AdminDataEvents;

  constructor(serverUrl: string) {
    this.serverUrl = serverUrl;
    this.dataEvents = new AdminDataEvents({
      serverUrl,
      authHeaders: async () => ({
        ...(await this.createAuthHeaders()),
      }),
      credentials: () => this.getAuthMethod() === 'host-session' ? 'include' : 'same-origin',
      invalidate: () => this.readCache.invalidate(),
    });
  }

  getAuthMethod(): AdminAuthMethod {
    // Cedros Login auth must include the admin claim.
    if (this.jwtToken && this.isAdminUser) {
      return 'cedros-login';
    }
    if (this.hostSessionAllowed) {
      return 'host-session';
    }
    return 'none';
  }

  isAuthenticated(): boolean {
    return this.getAuthMethod() !== 'none';
  }

  setCedrosLoginAuth(token: string | null, isAdmin?: boolean): void {
    if (this.jwtToken !== token || this.isAdminUser !== (isAdmin ?? false)) {
      this.resetIdentity();
    }
    this.jwtToken = token;
    this.isAdminUser = isAdmin ?? false;
    getLogger().debug('[AdminAuthManager] Cedros-login auth updated:', { hasToken: !!token, isAdmin: this.isAdminUser });
  }

  setHostSessionAuth(enabled: boolean): void {
    if (this.hostSessionAllowed !== enabled) this.resetIdentity();
    this.hostSessionAllowed = enabled;
    getLogger().debug('[AdminAuthManager] Host-session auth updated:', { enabled });
  }

  async createAuthHeaders(): Promise<AdminAuthHeaders> {
    const method = this.getAuthMethod();

    if (method === 'cedros-login') {
      return this.createJwtAuthHeaders();
    }

    if (method === 'host-session') {
      return {};
    }

    throw new Error('No admin authentication configured. Sign in as admin.');
  }

  private createJwtAuthHeaders(): JwtAuthHeaders {
    if (!this.jwtToken) {
      throw new Error('No JWT token available');
    }

    return {
      'Authorization': `Bearer ${this.jwtToken}`,
    };
  }

  async fetchWithAuth<T>(path: string, options: RequestInit = {}): Promise<T> {
    const reqMethod = (options.method || 'GET').toUpperCase();
    if (reqMethod === 'GET' && !options.signal) {
      return this.readCache.read(path, () => this.performFetch<T>(path, options, reqMethod));
    }
    const mutation = reqMethod !== 'GET' && reqMethod !== 'HEAD';
    if (mutation) this.readCache.invalidate();
    try {
      return await this.performFetch<T>(path, options, reqMethod);
    } finally {
      // A timeout or unreadable response may follow a committed mutation.
      // Also fence GETs started while that mutation was in flight.
      if (mutation) this.readCache.invalidate();
    }
  }

  retainDataEvents(): () => void {
    return this.dataEvents.retain();
  }

  getIdentityGeneration(): number {
    return this.identityGeneration;
  }

  private resetIdentity(): void {
    this.identityGeneration += 1;
    this.readCache.resetIdentity();
    this.dataEvents.restartIdentity();
  }

  private async performFetch<T>(
    path: string,
    options: RequestInit,
    reqMethod: string
  ): Promise<T> {
    const method = this.getAuthMethod();

    if (method === 'none') {
      throw new Error('No admin authentication configured');
    }

    const authHeaders = await this.createAuthHeaders();
    const headers: Record<string, string> = {
      // Only set Content-Type for methods that typically carry a body
      ...(reqMethod !== 'GET' && reqMethod !== 'HEAD' ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers as Record<string, string> || {}),
      ...authHeaders,
    };

    // Host-session auth rides the embedding host's admin session cookie. The
    // admin SPA and the data API can sit on different origins (e.g. sibling
    // dev-stack ports), where 'same-origin' silently drops the cookie and the
    // host fails closed with 401. 'include' lets the host's CORS allowlist and
    // admin-trusted-origin CSRF checks decide instead.
    const defaultCredentials: RequestCredentials =
      method === 'host-session' ? 'include' : 'same-origin';
    const response = await fetchWithTimeout(`${this.serverUrl}${path}`, {
      ...options,
      credentials: options.credentials ?? defaultCredentials,
      headers,
    });

    if (!response.ok) {
      // Parse error body safely — expose only known safe fields to prevent PII/internal leakage
      let safeMessage = `Admin API error ${response.status}`;
      try {
        const body = await response.json();
        if (body && typeof body.error === 'string') {
          safeMessage = body.error;
        } else if (body && typeof body.error?.message === 'string') {
          // Wasm extension error envelope: { error: { code, message } }
          safeMessage = body.error.message;
        } else if (body && typeof body.message === 'string') {
          safeMessage = body.message;
        }
      } catch {
        // Non-JSON error body — use status code only
      }
      throw new AdminApiError(safeMessage, response.status);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return await response.json();
  }
}
