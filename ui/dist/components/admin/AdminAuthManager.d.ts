/**
 * Admin Authentication Manager
 *
 * Handles Ed25519 signature authentication for admin API endpoints.
 * Supports two authentication methods:
 * 1. Wallet-based signing (Solana wallet adapter)
 * 2. Cedros-login JWT (if user is admin)
 */
/** Auth method type */
export type AdminAuthMethod = 'wallet' | 'cedros-login' | 'none';
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
    publicKey: {
        toBytes(): Uint8Array;
    } | null;
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
    setCedrosLoginAuth(token: string | null, isAdmin: boolean): void;
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
export declare class AdminAuthManager implements IAdminAuthManager {
    private readonly serverUrl;
    private walletSigner;
    private jwtToken;
    private isAdmin;
    constructor(serverUrl: string);
    getAuthMethod(): AdminAuthMethod;
    isAuthenticated(): boolean;
    setWalletSigner(signer: WalletSigner | null): void;
    setCedrosLoginAuth(token: string | null, isAdmin: boolean): void;
    createAuthHeaders(purpose: string): Promise<AdminAuthHeaders | JwtAuthHeaders>;
    private createWalletAuthHeaders;
    private createJwtAuthHeaders;
    private fetchNonce;
    fetchWithAuth<T>(path: string, options?: RequestInit): Promise<T>;
    private getPurposeFromPath;
}
/** Nonce purposes for admin endpoints */
export declare const ADMIN_NONCE_PURPOSES: {
    readonly STATS: "admin_stats";
    readonly PRODUCTS_LIST: "admin_products_list";
    readonly PRODUCTS_CREATE: "admin_products_create";
    readonly PRODUCTS_UPDATE: "admin_products_update";
    readonly PRODUCTS_DELETE: "admin_products_delete";
    readonly TRANSACTIONS_LIST: "admin_transactions_list";
    readonly COUPONS_LIST: "admin_coupons_list";
    readonly COUPONS_CREATE: "admin_coupons_create";
    readonly COUPONS_UPDATE: "admin_coupons_update";
    readonly COUPONS_DELETE: "admin_coupons_delete";
    readonly REFUNDS_LIST: "admin_refunds_list";
    readonly REFUNDS_PROCESS: "admin_refunds_process";
    readonly CONFIG_LIST: "admin_config_list";
    readonly CONFIG_GET: "admin_config_get";
    readonly CONFIG_UPDATE: "admin_config_update";
    readonly CONFIG_PATCH: "admin_config_patch";
};
//# sourceMappingURL=AdminAuthManager.d.ts.map