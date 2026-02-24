/**
 * Admin Authentication Manager
 *
 * Handles Ed25519 signature authentication for admin API endpoints.
 * Supports two authentication methods:
 * 1. Wallet-based signing (Solana wallet adapter)
 * 2. Cedros-login JWT (if user is admin)
 */

import bs58 from 'bs58';
import { getLogger } from '../../utils/logger';
import { fetchWithTimeout } from '../../utils/fetchWithTimeout';

/** Auth method type */
export type AdminAuthMethod = 'wallet' | 'cedros-login' | 'none';

/** Nonce response from server */
interface NonceResponse {
  nonce_id: string;
  expires_at: string;
}

/** Admin auth credentials */
export interface AdminCredentials {
  method: AdminAuthMethod;
  /** For wallet auth: base58-encoded public key */
  publicKey?: string;
  /** For cedros-login auth: JWT token */
  jwtToken?: string;
  /** Whether user is confirmed admin (for cedros-login) */
  isAdmin?: boolean;
}

/** Wallet signer interface (subset of wallet adapter) */
export interface WalletSigner {
  publicKey: { toBytes(): Uint8Array } | null;
  signMessage?(message: Uint8Array): Promise<Uint8Array>;
}

/** Admin auth headers for API requests */
export interface AdminAuthHeaders {
  'X-Signer': string;
  'X-Message': string;
  'X-Signature': string;
}

/** JWT auth headers for cedros-login */
export interface JwtAuthHeaders {
  'Authorization': string;
}

/** Public interface for admin auth management */
export interface IAdminAuthManager {
  /** Get current auth method */
  getAuthMethod(): AdminAuthMethod;

  /** Check if authenticated */
  isAuthenticated(): boolean;

  /** Set wallet signer for wallet-based auth */
  setWalletSigner(signer: WalletSigner | null): void;

  /** Set cedros-login JWT for JWT-based auth */
  setCedrosLoginAuth(token: string | null, isAdmin?: boolean): void;

  /** Create auth headers for admin request */
  createAuthHeaders(purpose: string): Promise<AdminAuthHeaders | JwtAuthHeaders>;

  /** Fetch with admin auth headers */
  fetchWithAuth<T>(path: string, options?: RequestInit): Promise<T>;
}

/**
 * Admin Authentication Manager
 *
 * Manages authentication for admin API endpoints.
 * Prioritizes wallet auth over cedros-login when both available.
 */
export class AdminAuthManager implements IAdminAuthManager {
  private readonly serverUrl: string;
  private walletSigner: WalletSigner | null = null;
  private jwtToken: string | null = null;
  private isAdminUser: boolean = false;

  constructor(serverUrl: string) {
    this.serverUrl = serverUrl;
  }

  getAuthMethod(): AdminAuthMethod {
    if (this.walletSigner?.publicKey && this.walletSigner.signMessage) {
      return 'wallet';
    }
    // UI-01 fix: require isAdmin flag for cedros-login auth
    if (this.jwtToken && this.isAdminUser) {
      return 'cedros-login';
    }
    return 'none';
  }

  isAuthenticated(): boolean {
    return this.getAuthMethod() !== 'none';
  }

  setWalletSigner(signer: WalletSigner | null): void {
    this.walletSigner = signer;
    getLogger().debug('[AdminAuthManager] Wallet signer updated:', !!signer?.publicKey);
  }

  setCedrosLoginAuth(token: string | null, isAdmin?: boolean): void {
    this.jwtToken = token;
    this.isAdminUser = isAdmin ?? false;
    getLogger().debug('[AdminAuthManager] Cedros-login auth updated:', { hasToken: !!token, isAdmin: this.isAdminUser });
  }

  async createAuthHeaders(purpose: string): Promise<AdminAuthHeaders | JwtAuthHeaders> {
    const method = this.getAuthMethod();

    if (method === 'wallet') {
      return this.createWalletAuthHeaders(purpose);
    }

    if (method === 'cedros-login') {
      return this.createJwtAuthHeaders();
    }

    throw new Error('No admin authentication configured. Connect a wallet or sign in as admin.');
  }

  private async createWalletAuthHeaders(purpose: string): Promise<AdminAuthHeaders> {
    if (!this.walletSigner?.publicKey || !this.walletSigner.signMessage) {
      throw new Error('Wallet not connected or does not support message signing');
    }

    // Fetch nonce from server
    const nonce = await this.fetchNonce(purpose);

    // Sign the nonce ID with wallet
    const messageBytes = new TextEncoder().encode(nonce.nonce_id);
    const signatureBytes = await this.walletSigner.signMessage(messageBytes);

    // Convert to base58 strings (Solana standard encoding)
    const publicKeyBase58 = bs58.encode(this.walletSigner.publicKey.toBytes());
    const signatureBase58 = bs58.encode(signatureBytes);

    return {
      'X-Signer': publicKeyBase58,
      'X-Message': nonce.nonce_id,
      'X-Signature': signatureBase58,
    };
  }

  private createJwtAuthHeaders(): JwtAuthHeaders {
    if (!this.jwtToken) {
      throw new Error('No JWT token available');
    }

    return {
      'Authorization': `Bearer ${this.jwtToken}`,
    };
  }

  private async fetchNonce(purpose: string): Promise<NonceResponse> {
    const url = `${this.serverUrl}/paywall/v1/nonce`;
    getLogger().debug('[AdminAuthManager] Fetching nonce for purpose:', purpose);

    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ purpose }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to fetch nonce: ${response.status} ${text}`);
    }

    return await response.json();
  }

  async fetchWithAuth<T>(path: string, options: RequestInit = {}): Promise<T> {
    const method = this.getAuthMethod();

    if (method === 'none') {
      throw new Error('No admin authentication configured');
    }

    // Determine purpose from path for nonce
    const purpose = this.getPurposeFromPath(path, options.method || 'GET');
    const authHeaders = await this.createAuthHeaders(purpose);

    const reqMethod = (options.method || 'GET').toUpperCase();
    const headers: Record<string, string> = {
      // Only set Content-Type for methods that typically carry a body
      ...(reqMethod !== 'GET' && reqMethod !== 'HEAD' ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers as Record<string, string> || {}),
      ...authHeaders,
    };

    const response = await fetchWithTimeout(`${this.serverUrl}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      // Parse error body safely — expose only known safe fields to prevent PII/internal leakage
      let safeMessage = `Admin API error ${response.status}`;
      try {
        const body = await response.json();
        if (body && typeof body.error === 'string') {
          safeMessage = body.error;
        } else if (body && typeof body.message === 'string') {
          safeMessage = body.message;
        }
      } catch {
        // Non-JSON error body — use status code only
      }
      throw new Error(safeMessage);
    }

    return await response.json();
  }

  private getPurposeFromPath(path: string, method: string): string {
    // Map paths to nonce purposes as defined by server-rust
    const purposeMap: Record<string, Record<string, string>> = {
      '/admin/stats': { GET: 'admin_stats' },
      '/admin/products': {
        GET: 'admin_products_list',
        POST: 'admin_products_create',
      },
      '/admin/transactions': { GET: 'admin_transactions_list' },
      '/admin/coupons': {
        GET: 'admin_coupons_list',
        POST: 'admin_coupons_create',
      },
      '/admin/refunds': { GET: 'admin_refunds_list' },
      '/admin/config': { GET: 'admin_config_list' },
    };

    // Check exact path match first
    const pathPurposes = purposeMap[path];
    if (pathPurposes?.[method]) {
      return pathPurposes[method];
    }

    // Check for parameterized paths
    if (path.startsWith('/admin/products/')) {
      if (method === 'PUT') return 'admin_products_update';
      if (method === 'DELETE') return 'admin_products_delete';
    }
    if (path.startsWith('/admin/coupons/')) {
      if (method === 'PUT') return 'admin_coupons_update';
      if (method === 'DELETE') return 'admin_coupons_delete';
    }
    if (path.startsWith('/admin/refunds/') && path.includes('/process')) {
      return 'admin_refunds_process';
    }
    if (path.startsWith('/admin/config/')) {
      if (method === 'GET') return 'admin_config_get';
      if (method === 'PUT') return 'admin_config_update';
      if (method === 'PATCH') return 'admin_config_patch';
    }

    // Fallback to generic purpose
    return `admin_${method.toLowerCase()}`;
  }
}

/** Nonce purposes for admin endpoints */
export const ADMIN_NONCE_PURPOSES = {
  STATS: 'admin_stats',
  PRODUCTS_LIST: 'admin_products_list',
  PRODUCTS_CREATE: 'admin_products_create',
  PRODUCTS_UPDATE: 'admin_products_update',
  PRODUCTS_DELETE: 'admin_products_delete',
  TRANSACTIONS_LIST: 'admin_transactions_list',
  COUPONS_LIST: 'admin_coupons_list',
  COUPONS_CREATE: 'admin_coupons_create',
  COUPONS_UPDATE: 'admin_coupons_update',
  COUPONS_DELETE: 'admin_coupons_delete',
  REFUNDS_LIST: 'admin_refunds_list',
  REFUNDS_PROCESS: 'admin_refunds_process',
  CONFIG_LIST: 'admin_config_list',
  CONFIG_GET: 'admin_config_get',
  CONFIG_UPDATE: 'admin_config_update',
  CONFIG_PATCH: 'admin_config_patch',
} as const;
