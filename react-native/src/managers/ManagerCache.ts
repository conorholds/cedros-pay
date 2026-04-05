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

import { StripeManager, type IStripeManager } from './StripeManager';
import { X402Manager, type IX402Manager } from './X402Manager';
import { WalletManager, type IWalletManager } from './WalletManager';
import { SubscriptionManager, type ISubscriptionManager } from './SubscriptionManager';
import { SubscriptionChangeManager, type ISubscriptionChangeManager } from './SubscriptionChangeManager';
import { CreditsManager, type ICreditsManager } from './CreditsManager';
import { StoreBillingManager, type IStoreBillingManager } from './StoreBillingManager';
import { RouteDiscoveryManager } from './RouteDiscoveryManager';
import { getLogger } from '../utils/logger';
import type { SolanaCluster } from '../types';
import type { CedrosStoreBillingConfig } from '../types/storePolicy';

/**
 * Cached manager set for a specific configuration
 */
interface CachedManagers {
  stripeManager: IStripeManager;
  x402Manager: IX402Manager;
  walletManager: IWalletManager;
  subscriptionManager: ISubscriptionManager;
  subscriptionChangeManager: ISubscriptionChangeManager;
  creditsManager: ICreditsManager;
  storeBillingManager: IStoreBillingManager;
  routeDiscovery: RouteDiscoveryManager;
  refCount: number; // Track number of providers using this cache entry
}

/**
 * Global cache of manager instances
 * Key: stringified config parameters
 * Value: manager instances + reference count
 */
const managerCache = new Map<string, CachedManagers>();

/**
 * Generate cache key from config parameters
 *
 * Managers are shared when:
 * - Same Stripe public key
 * - Same server URL
 * - Same Solana cluster
 * - Same Solana endpoint (if provided)
 * - Same dangerouslyAllowUnknownMint flag
 *
 * Note: Wallet pools are NOT cached - they remain per-provider for isolation
 */
function getCacheKey(
  stripePublicKey: string,
  serverUrl: string,
  solanaCluster: SolanaCluster,
  stripeReturnUrl?: string,
  solanaEndpoint?: string,
  dangerouslyAllowUnknownMint?: boolean,
  storeBillingConfig?: CedrosStoreBillingConfig
): string {
  return JSON.stringify({
    stripePublicKey,
    serverUrl,
    solanaCluster,
    stripeReturnUrl: stripeReturnUrl || '',
    solanaEndpoint: solanaEndpoint || '',
    dangerouslyAllowUnknownMint: dangerouslyAllowUnknownMint || false,
    storeBillingEnabled: storeBillingConfig?.enabled ?? true,
    storekitMode: storeBillingConfig?.storekitMode ?? 'STOREKIT_HYBRID_MODE',
    transactionHandling: storeBillingConfig?.transactionHandling ?? 'auto_finish',
  });
}

/**
 * Get or create managers for the given config
 *
 * If managers already exist for this config, return cached instances.
 * Otherwise, create new instances and cache them.
 *
 * @returns Cached or newly created manager instances
 */
export function getOrCreateManagers(
  stripePublicKey: string,
  serverUrl: string,
  solanaCluster: SolanaCluster,
  stripeReturnUrl?: string,
  solanaEndpoint?: string,
  dangerouslyAllowUnknownMint?: boolean,
  storeBillingConfig?: CedrosStoreBillingConfig
): {
  stripeManager: IStripeManager;
  x402Manager: IX402Manager;
  walletManager: IWalletManager;
  subscriptionManager: ISubscriptionManager;
  subscriptionChangeManager: ISubscriptionChangeManager;
  creditsManager: ICreditsManager;
  storeBillingManager: IStoreBillingManager;
  routeDiscovery: RouteDiscoveryManager;
} {
  const cacheKey = getCacheKey(
    stripePublicKey,
    serverUrl,
    solanaCluster,
    stripeReturnUrl,
    solanaEndpoint,
    dangerouslyAllowUnknownMint,
    storeBillingConfig
  );

  // Check cache
  let cached = managerCache.get(cacheKey);

  if (cached) {
    // Increment reference count
    cached.refCount++;
    getLogger().debug(
      `[ManagerCache] Reusing cached managers (refCount: ${cached.refCount}):`,
      { stripePublicKey: stripePublicKey.slice(0, 10) + '...', serverUrl }
    );
    return cached;
  }

  // Create new managers
  getLogger().debug(
    '[ManagerCache] Creating new manager instances:',
    { stripePublicKey: stripePublicKey.slice(0, 10) + '...', serverUrl }
  );

  const routeDiscovery = new RouteDiscoveryManager(serverUrl);
  const stripeManager = new StripeManager(stripePublicKey, routeDiscovery, {
    returnUrl: stripeReturnUrl,
  });
  const x402Manager = new X402Manager(routeDiscovery);
  const walletManager = new WalletManager(
    solanaCluster,
    solanaEndpoint,
    dangerouslyAllowUnknownMint ?? false
  );
  const subscriptionManager = new SubscriptionManager(stripePublicKey, routeDiscovery, {
    returnUrl: stripeReturnUrl,
  });
  const subscriptionChangeManager = new SubscriptionChangeManager(routeDiscovery);
  const creditsManager = new CreditsManager(routeDiscovery);
  const storeBillingManager = new StoreBillingManager(
    routeDiscovery,
    storeBillingConfig
  );

  // Cache with initial refCount of 1
  cached = {
    stripeManager,
    x402Manager,
    walletManager,
    subscriptionManager,
    subscriptionChangeManager,
    creditsManager,
    storeBillingManager,
    routeDiscovery,
    refCount: 1,
  };

  managerCache.set(cacheKey, cached);

  return cached;
}

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
export function releaseManagers(
  stripePublicKey: string,
  serverUrl: string,
  solanaCluster: SolanaCluster,
  stripeReturnUrl?: string,
  solanaEndpoint?: string,
  dangerouslyAllowUnknownMint?: boolean,
  storeBillingConfig?: CedrosStoreBillingConfig
): void {
  const cacheKey = getCacheKey(
    stripePublicKey,
    serverUrl,
    solanaCluster,
    stripeReturnUrl,
    solanaEndpoint,
    dangerouslyAllowUnknownMint,
    storeBillingConfig
  );

  const cached = managerCache.get(cacheKey);

  if (!cached) {
    getLogger().warn('[ManagerCache] Attempted to release non-existent managers:', { cacheKey });
    return;
  }

  cached.refCount--;

  getLogger().debug(
    `[ManagerCache] Released manager reference (refCount: ${cached.refCount}):`,
    { stripePublicKey: stripePublicKey.slice(0, 10) + '...', serverUrl }
  );

  // Remove from cache when no longer referenced
  if (cached.refCount <= 0) {
    void cached.storeBillingManager.destroy().catch((error) => {
      getLogger().warn('[ManagerCache] Failed to destroy store billing manager:', error);
    });
    managerCache.delete(cacheKey);
    getLogger().debug('[ManagerCache] Removed managers from cache (refCount reached 0)');
  }
}

/**
 * Clear all cached managers (for testing)
 *
 * @internal
 */
export function clearManagerCache(): void {
  managerCache.forEach((cached) => {
    void cached.storeBillingManager.destroy().catch((error) => {
      getLogger().warn('[ManagerCache] Failed to destroy store billing manager:', error);
    });
  });
  managerCache.clear();
  getLogger().debug('[ManagerCache] Cache cleared');
}

/**
 * Get cache statistics (for debugging)
 *
 * @internal
 */
export function getManagerCacheStats() {
  return {
    entries: managerCache.size,
    details: Array.from(managerCache.entries()).map(([key, value]) => ({
      config: JSON.parse(key),
      refCount: value.refCount,
    })),
  };
}
