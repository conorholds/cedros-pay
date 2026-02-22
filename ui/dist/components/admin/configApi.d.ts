import { IAdminAuthManager } from './AdminAuthManager';
/**
 * Admin Config API Client
 *
 * Client for interacting with the server's /admin/config/* endpoints.
 * Uses Ed25519 authentication headers.
 */
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
    secretsRedacted: boolean;
}
/** Config history entry */
export interface ConfigHistoryEntry {
    id: string;
    configKey: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE';
    changedAt: string;
    changedBy: string;
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
/** @deprecated Use IAdminAuthManager instead. Legacy auth used client-generated nonces vulnerable to replay. */
export interface AdminAuth {
    signerPublicKey: string;
    sign: (message: string) => Promise<string>;
}
/** Admin Config API client */
export declare class ConfigApiClient {
    private _serverUrl;
    private auth?;
    private authManager?;
    constructor(_serverUrl: string, auth?: AdminAuth | undefined, authManager?: IAdminAuthManager | undefined);
    /** Server URL passed at construction (retained for API compatibility). */
    get serverUrl(): string;
    private fetch;
    /** List all config categories */
    listCategories(limit?: number): Promise<ListCategoriesResponse>;
    /** Get config for a category */
    getConfig(category: string, redactSecrets?: boolean): Promise<GetConfigResponse>;
    /** Full update - replace entire category config */
    updateConfig(category: string, config: Record<string, unknown>, description?: string): Promise<void>;
    /** Partial update - update specific keys */
    patchConfig(category: string, updates: Record<string, unknown>, description?: string): Promise<void>;
    /** Batch update multiple categories */
    batchUpdate(updates: Array<{
        category: string;
        configKey: string;
        value: unknown;
        description?: string;
    }>): Promise<void>;
    /** Validate config before saving */
    validateConfig(category: string, config: Record<string, unknown>): Promise<ValidateConfigResponse>;
    /** Get config change history */
    getHistory(category?: string, limit?: number): Promise<ConfigHistoryResponse>;
}
/** Field metadata for special input types */
export interface FieldMeta {
    type?: 'dropdown' | 'number' | 'boolean' | 'token_mint' | 'toggle' | 'secret_array' | 'solana_address';
    options?: string[];
    unit?: string;
    /** Description text shown below the field label */
    description?: string;
    /** Hide this field from the UI */
    hidden?: boolean;
    /** Only show this field when another field has a truthy value */
    showWhen?: string;
}
/** Category metadata */
export interface CategoryMeta {
    label: string;
    description?: string;
    secrets: string[];
    icon: string;
    fields?: Record<string, FieldMeta>;
}
/** Known config categories and their metadata */
export declare const CONFIG_CATEGORIES: Record<string, CategoryMeta>;
/** Check if a field is a secret for a given category */
export declare function isSecretField(category: string, field: string): boolean;
/** Placeholder for redacted secrets */
export declare const REDACTED_VALUE = "[REDACTED]";
//# sourceMappingURL=configApi.d.ts.map