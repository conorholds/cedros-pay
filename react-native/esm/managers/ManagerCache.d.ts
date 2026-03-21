/**
 * Manager Cache - Global Singleton for Sharing Manager Instances
 *
 * **Problem Solved:**
 * Multiple `<CedrosProvider>` instances with identical configs would create duplicate managers,
 * causing:
 * - Multiple Stripe.js loads (wasted network bandwidth)
 * - Duplicate manager instances (memory waste)
 * - Slower page load times
 *
 * **Solution:**
 * Cache managers globally based on config parameters. Providers with identical configs
 * share manager instances. Providers with different configs get separate managers.
 *
 * **Example:**
 * ```tsx
 * // User 1 dashboard
 * <CedrosProvider config={{ stripePublicKey: 'pk_123', serverUrl: 'api.example.com' }}>
 *   <Dashboard userId="user1" />
 * </CedrosProvider>
 *
 * // User 2 dashboard (same config)
 * <CedrosProvider config={{ stripePublicKey: 'pk_123', serverUrl: 'api.example.com' }}>
 *   <Dashboard userId="user2" />
 * </CedrosProvider>
 * ```
 *
 * Both providers share the same StripeManager, X402Manager, and RouteDiscoveryManager.
 * Only one `loadStripe()` call is made. Wallet adapters remain isolated per provider.
 *
 * @internal
 */
import { type IStripeManager } from './StripeManager';
import { type IX402Manager } from './X402Manager';
import { type IWalletManager } from './WalletManager';
import { type ISubscriptionManager } from './SubscriptionManager';
import { type ISubscriptionChangeManager } from './SubscriptionChangeManager';
import { type ICreditsManager } from './CreditsManager';
import { RouteDiscoveryManager } from './RouteDiscoveryManager';
import type { SolanaCluster } from '../types';
/**
 * Get or create managers for the given config
 *
 * If managers already exist for this config, return cached instances.
 * Otherwise, create new instances and cache them.
 *
 * @returns Cached or newly created manager instances
 */
export declare function getOrCreateManagers(stripePublicKey: string, serverUrl: string, solanaCluster: SolanaCluster, solanaEndpoint?: string, dangerouslyAllowUnknownMint?: boolean): {
    stripeManager: IStripeManager;
    x402Manager: IX402Manager;
    walletManager: IWalletManager;
    subscriptionManager: ISubscriptionManager;
    subscriptionChangeManager: ISubscriptionChangeManager;
    creditsManager: ICreditsManager;
    routeDiscovery: RouteDiscoveryManager;
};
/**
 * Release a reference to cached managers
 *
 * Call this when a CedrosProvider unmounts.
 * When refCount reaches 0, managers are removed from cache.
 *
 * Note: We don't actively clean up manager resources (e.g., disconnect wallets)
 * because other providers may still be using them. Cleanup happens naturally
 * when all references are released and garbage collection runs.
 */
export declare function releaseManagers(stripePublicKey: string, serverUrl: string, solanaCluster: SolanaCluster, solanaEndpoint?: string, dangerouslyAllowUnknownMint?: boolean): void;
/**
 * Clear all cached managers (for testing)
 *
 * @internal
 */
export declare function clearManagerCache(): void;
/**
 * Get cache statistics (for debugging)
 *
 * @internal
 */
export declare function getManagerCacheStats(): {
    entries: number;
    details: {
        config: any;
        refCount: number;
    }[];
};
//# sourceMappingURL=ManagerCache.d.ts.map