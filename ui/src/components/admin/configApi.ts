/** Config category summary */
export interface ConfigCategory {
  category: string;
  keyCount: number;
  lastUpdated: string;
  hasSecrets: boolean;
}

/** List categories response */
export interface ListCategoriesResponse {
  categories: ConfigCategory[];
  count: number;
}

/** Get config response */
export interface GetConfigResponse {
  category: string;
  config: Record<string, unknown>;
  updatedAt: string;
  committedRevision: string | null;
  secretsRedacted: boolean;
  /** Stripe only: the tokenised webhook path to register and the events to select. */
  webhookEndpoint?: WebhookEndpoint;
}

/** Server-generated webhook endpoint description (Stripe category). */
export interface WebhookEndpoint {
  /** Path relative to the site origin, including the ingress token query. */
  path: string;
  /** Stripe event types the operator selects for the endpoint. */
  events: string[];
}

export interface ConfigMutationResponse {
  category: string;
  updated: boolean;
  updatedAt: string;
  committedRevision: string | null;
  message: string;
}

/** Config history entry */
export interface ConfigHistoryEntry {
  id: string;
  mutationId: string;
  previousRevision: string | null;
  committedRevision: string;
  changedKeys: string[];
  changedAt: string;
  changedBy: string | null;
  reason: string | null;
}

/** History response */
export interface ConfigHistoryResponse {
  history: ConfigHistoryEntry[];
  count: number;
}

/** Validation response */
export interface ValidateConfigResponse {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

import type { IAdminAuthManager } from './AdminAuthManager';
import { generateUUID } from '../../utils/uuid';

/** Admin Config API client */
export class ConfigApiClient {
  private committedRevision: string | null | undefined;
  private identityGeneration: number | undefined;
  private pendingMutations = new Map<
    string,
    { mutationId: string; expectedRevision: string | null }
  >();

  constructor(
    private _serverUrl: string,
    private authManager?: IAdminAuthManager
  ) {}

  /** Server URL passed at construction. */
  get serverUrl(): string {
    return this._serverUrl;
  }

  private async fetch<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (this.authManager?.isAuthenticated()) {
      return this.authManager.fetchWithAuth<T>(path, options);
    }

    throw new Error(
      'Admin authentication required. Provide an IAdminAuthManager to ConfigApi.'
    );
  }

  /** List all config categories */
  async listCategories(limit = 100): Promise<ListCategoriesResponse> {
    return this.fetch(`/admin/config?limit=${limit}`);
  }

  /** Get config for a category */
  async getConfig(category: string): Promise<GetConfigResponse> {
    const generation = this.syncIdentity();
    const response = await this.fetch<GetConfigResponse>(
      `/admin/config/${category}`
    );
    this.assertIdentity(generation);
    this.committedRevision = response.committedRevision;
    // An authoritative reload resolves any prior unknown/conflicted completion.
    // A subsequent edit must use the newly observed revision and operation id.
    this.pendingMutations.clear();
    return response;
  }

  /** Full update - replace entire category config */
  async updateConfig(
    category: string,
    config: Record<string, unknown>,
    description?: string
  ): Promise<ConfigMutationResponse> {
    return this.mutateConfig('PUT', category, 'config', config, description);
  }

  /** Partial update - update specific keys */
  async patchConfig(
    category: string,
    updates: Record<string, unknown>,
    description?: string
  ): Promise<ConfigMutationResponse> {
    return this.mutateConfig('PATCH', category, 'updates', updates, description);
  }

  private async mutateConfig(
    method: 'PUT' | 'PATCH',
    category: string,
    field: 'config' | 'updates',
    values: Record<string, unknown>,
    description?: string
  ): Promise<ConfigMutationResponse> {
    const generation = this.syncIdentity();
    const fingerprint = JSON.stringify([
      method,
      category,
      field,
      values,
      description,
    ]);
    const pending = this.pendingMutations.get(fingerprint) ?? {
      mutationId: `config-${generateUUID()}`,
      expectedRevision: this.committedRevision ?? null,
    };
    this.pendingMutations.set(fingerprint, pending);
    const response = await this.fetch<ConfigMutationResponse>(`/admin/config/${category}`, {
      method,
      headers: { 'Idempotency-Key': `extension-config:${pending.mutationId}` },
      body: JSON.stringify({
        [field]: values,
        description,
        mutationId: pending.mutationId,
        expectedRevision: pending.expectedRevision,
      }),
    });
    this.assertIdentity(generation);
    this.committedRevision = response.committedRevision;
    this.pendingMutations.delete(fingerprint);
    return response;
  }

  private syncIdentity(): number | undefined {
    const generation = this.authManager?.getIdentityGeneration?.();
    if (this.identityGeneration !== generation) {
      this.identityGeneration = generation;
      this.committedRevision = undefined;
      this.pendingMutations.clear();
    }
    return generation;
  }

  private assertIdentity(expected: number | undefined): void {
    if (this.authManager?.getIdentityGeneration?.() !== expected) {
      this.syncIdentity();
      throw new Error('Admin identity changed while the configuration request was in flight.');
    }
  }

  /** Validate config before saving */
  async validateConfig(
    category: string,
    config: Record<string, unknown>
  ): Promise<ValidateConfigResponse> {
    return this.fetch('/admin/config/validate', {
      method: 'POST',
      body: JSON.stringify({ category, config }),
    });
  }

  /** Get config change history */
  async getHistory(category?: string, limit = 50): Promise<ConfigHistoryResponse> {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (category) params.set('category', category);
    return this.fetch(`/admin/config/history?${params}`);
  }
}

export {
  CONFIG_CATEGORIES,
  isSecretField,
  REDACTED_VALUE,
  getClientFieldWarnings,
  type FieldMeta,
  type FieldGroupMeta,
  type EndpointMeta,
  type CategoryMeta,
} from './configMetadata';
