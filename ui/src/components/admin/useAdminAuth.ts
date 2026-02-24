/**
 * Admin Auth Hook
 *
 * React hook for admin authentication.
 * Integrates with wallet adapter and cedros-login.
 */

import { useMemo, useEffect, useCallback } from 'react';
import { AdminAuthManager, type AdminAuthMethod, type IAdminAuthManager } from './AdminAuthManager';

/** Minimal wallet interface to avoid importing @solana/wallet-adapter-react */
export interface AdminWalletState {
  publicKey: { toBase58(): string; toBytes(): Uint8Array } | null;
  signMessage?: (message: Uint8Array) => Promise<Uint8Array>;
}

export interface UseAdminAuthOptions {
  /** Backend server URL */
  serverUrl: string;
  /** JWT token from cedros-login */
  cedrosLoginToken?: string;
  /** Whether the cedros-login user is an admin */
  isAdmin?: boolean;
  /** Wallet state (from useWallet or equivalent). Defaults to disconnected. */
  wallet?: AdminWalletState;
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
const DISCONNECTED_WALLET: AdminWalletState = { publicKey: null };

export function useAdminAuth({
  serverUrl,
  cedrosLoginToken,
  isAdmin = false,
  wallet = DISCONNECTED_WALLET,
}: UseAdminAuthOptions): UseAdminAuthResult {

  // Create auth manager with cedros-login token set synchronously.
  // This avoids a race condition: child section effects fire before parent
  // effects, so a useEffect-based setCedrosLoginAuth would run too late.
  const authManager = useMemo(() => {
    const mgr = new AdminAuthManager(serverUrl);
    mgr.setCedrosLoginAuth(cedrosLoginToken ?? null, isAdmin);
    return mgr;
  }, [serverUrl, cedrosLoginToken, isAdmin]);

  // Update wallet signer when wallet changes (must stay in useEffect
  // because wallet hooks provide values after render)
  useEffect(() => {
    if (wallet.publicKey && wallet.signMessage) {
      authManager.setWalletSigner({
        publicKey: wallet.publicKey,
        signMessage: wallet.signMessage,
      });
    } else {
      authManager.setWalletSigner(null);
    }
  }, [authManager, wallet.publicKey, wallet.signMessage]);

  const authMethod = authManager.getAuthMethod();
  const isAuthenticated = authManager.isAuthenticated();
  const walletConnected = !!(wallet.publicKey && wallet.signMessage);
  const cedrosLoginAvailable = !!cedrosLoginToken;

  // Get truncated wallet address for display
  const walletAddress = useMemo(() => {
    if (!wallet.publicKey) return null;
    const addr = wallet.publicKey.toBase58();
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  }, [wallet.publicKey]);

  const fetchWithAuth = useCallback(
    <T>(path: string, options?: RequestInit) => authManager.fetchWithAuth<T>(path, options),
    [authManager]
  );

  return {
    authMethod,
    isAuthenticated,
    walletConnected,
    walletAddress,
    cedrosLoginAvailable,
    authManager,
    fetchWithAuth,
  };
}

export default useAdminAuth;
