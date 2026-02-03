import { AdminAuthMethod, IAdminAuthManager } from './AdminAuthManager';
export interface UseAdminAuthOptions {
    /** Backend server URL */
    serverUrl: string;
    /** JWT token from cedros-login */
    cedrosLoginToken?: string;
    /** Whether the cedros-login user is an admin */
    isAdmin?: boolean;
}
export interface UseAdminAuthResult {
    /** Current auth method being used */
    authMethod: AdminAuthMethod;
    /** Whether user is authenticated for admin access */
    isAuthenticated: boolean;
    /** Whether wallet is connected */
    walletConnected: boolean;
    /** Connected wallet address (truncated for display) */
    walletAddress: string | null;
    /** Whether cedros-login is available and user is admin */
    cedrosLoginAvailable: boolean;
    /** Admin auth manager instance */
    authManager: IAdminAuthManager;
    /** Fetch with admin auth */
    fetchWithAuth: <T>(path: string, options?: RequestInit) => Promise<T>;
}
/**
 * Hook for admin authentication
 *
 * Automatically uses wallet signing if available, falls back to cedros-login JWT.
 *
 * @example
 * ```tsx
 * function AdminDashboard({ serverUrl }) {
 *   const { isAuthenticated, authMethod, fetchWithAuth } = useAdminAuth({
 *     serverUrl,
 *     cedrosLoginToken: userToken,
 *     isAdmin: user?.isAdmin,
 *   });
 *
 *   if (!isAuthenticated) {
 *     return <div>Please connect wallet or sign in as admin</div>;
 *   }
 *
 *   const stats = await fetchWithAuth('/admin/stats');
 * }
 * ```
 */
export declare function useAdminAuth({ serverUrl, cedrosLoginToken, isAdmin, }: UseAdminAuthOptions): UseAdminAuthResult;
export default useAdminAuth;
//# sourceMappingURL=useAdminAuth.d.ts.map