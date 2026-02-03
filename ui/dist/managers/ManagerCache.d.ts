import { IStripeManager } from './StripeManager';
import { IX402Manager } from './X402Manager';
import { IWalletManager } from './WalletManager';
import { ISubscriptionManager } from './SubscriptionManager';
import { ISubscriptionChangeManager } from './SubscriptionChangeManager';
import { ICreditsManager } from './CreditsManager';
import { RouteDiscoveryManager } from './RouteDiscoveryManager';
import { SolanaCluster } from '../types';
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