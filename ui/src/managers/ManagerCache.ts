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
import type { IWalletManager } from './WalletManager';
import { SubscriptionManager, type ISubscriptionManager } from './SubscriptionManager';
import { SubscriptionChangeManager, type ISubscriptionChangeManager } from './SubscriptionChangeManager';
import { CreditsManager, type ICreditsManager } from './CreditsManager';
import { RouteDiscoveryManager } from './RouteDiscoveryManager';
import { getLogger } from '../utils/logger';
import type { SolanaCluster } from '../types';

// Lazy-load WalletManager to avoid pulling @solana/* into the default entry point.
// Uses dynamic import() which is resolved at call time, not at module parse time.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _WalletManagerClass: (new (...args: any[]) => IWalletManager) | null = null;

async function getWalletManagerClass() {
  if (!_WalletManagerClass) {
    const mod = await import('./WalletManager');
    _WalletManagerClass = mod.WalletManager;
  }
  return _WalletManagerClass!;
}

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
  routeDiscovery: RouteDiscoveryManager;
  refCount: number; // Track number of providers using this cache entry
}

/**
 * Global cache of manager instances
 * Key: stringified config parameters
 * Value: manager instances + reference count
 */
const managerCache = new Map<string, CachedManagers>();
const managerCacheInFlight = new Map<string, Promise<CachedManagers>>();

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
  solanaEndpoint?: string,
  dangerouslyAllowUnknownMint?: boolean
): string {
  return JSON.stringify({
    stripePublicKey,
    serverUrl,
    solanaCluster,
    solanaEndpoint: solanaEndpoint || '',
    dangerouslyAllowUnknownMint: dangerouslyAllowUnknownMint || false,
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
export async function getOrCreateManagers(
  stripePublicKey: string,
  serverUrl: string,
  solanaCluster: SolanaCluster,
  solanaEndpoint?: string,
  dangerouslyAllowUnknownMint?: boolean
): Promise<{
  stripeManager: IStripeManager;
  x402Manager: IX402Manager;
  walletManager: IWalletManager;
  subscriptionManager: ISubscriptionManager;
  subscriptionChangeManager: ISubscriptionChangeManager;
  creditsManager: ICreditsManager;
  routeDiscovery: RouteDiscoveryManager;
}> {
  const cacheKey = getCacheKey(
    stripePublicKey,
    serverUrl,
    solanaCluster,
    solanaEndpoint,
    dangerouslyAllowUnknownMint
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

  const inFlight = managerCacheInFlight.get(cacheKey);
  if (inFlight) {
    cached = await inFlight;
    cached.refCount++;
    getLogger().debug(
      `[ManagerCache] Reusing in-flight managers (refCount: ${cached.refCount}):`,
      { stripePublicKey: stripePublicKey.slice(0, 10) + '...', serverUrl }
    );
    return cached;
  }

  // Create new managers
  getLogger().debug(
    '[ManagerCache] Creating new manager instances:',
    { stripePublicKey: stripePublicKey.slice(0, 10) + '...', serverUrl }
  );
  const creationPromise = (async (): Promise<CachedManagers> => {
    const routeDiscovery = new RouteDiscoveryManager(serverUrl);
    const stripeManager = new StripeManager(stripePublicKey, routeDiscovery);
    const x402Manager = new X402Manager(routeDiscovery);
    const WalletManagerCls = await getWalletManagerClass();
    const walletManager = new WalletManagerCls(
      solanaCluster,
      solanaEndpoint,
      dangerouslyAllowUnknownMint ?? false
    );
    const subscriptionManager = new SubscriptionManager(stripePublicKey, routeDiscovery);
    const subscriptionChangeManager = new SubscriptionChangeManager(routeDiscovery);
    const creditsManager = new CreditsManager(routeDiscovery);

    // Cache with initial refCount of 1 for the creator call
    return {
      stripeManager,
      x402Manager,
      walletManager,
      subscriptionManager,
      subscriptionChangeManager,
      creditsManager,
      routeDiscovery,
      refCount: 1,
    };
  })();

  managerCacheInFlight.set(cacheKey, creationPromise);

  try {
    cached = await creationPromise;
    managerCache.set(cacheKey, cached);
    return cached;
  } finally {
    managerCacheInFlight.delete(cacheKey);
  }
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
  solanaEndpoint?: string,
  dangerouslyAllowUnknownMint?: boolean
): void {
  const cacheKey = getCacheKey(
    stripePublicKey,
    serverUrl,
    solanaCluster,
    solanaEndpoint,
    dangerouslyAllowUnknownMint
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
  managerCache.clear();
  managerCacheInFlight.clear();
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
