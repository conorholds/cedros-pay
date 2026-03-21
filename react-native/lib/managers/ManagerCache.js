"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrCreateManagers = getOrCreateManagers;
exports.releaseManagers = releaseManagers;
exports.clearManagerCache = clearManagerCache;
exports.getManagerCacheStats = getManagerCacheStats;
const StripeManager_1 = require("./StripeManager");
const X402Manager_1 = require("./X402Manager");
const WalletManager_1 = require("./WalletManager");
const SubscriptionManager_1 = require("./SubscriptionManager");
const SubscriptionChangeManager_1 = require("./SubscriptionChangeManager");
const CreditsManager_1 = require("./CreditsManager");
const RouteDiscoveryManager_1 = require("./RouteDiscoveryManager");
const logger_1 = require("../utils/logger");
/**
 * Global cache of manager instances
 * Key: stringified config parameters
 * Value: manager instances + reference count
 */
const managerCache = new Map();
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
function getCacheKey(stripePublicKey, serverUrl, solanaCluster, solanaEndpoint, dangerouslyAllowUnknownMint) {
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
function getOrCreateManagers(stripePublicKey, serverUrl, solanaCluster, solanaEndpoint, dangerouslyAllowUnknownMint) {
    const cacheKey = getCacheKey(stripePublicKey, serverUrl, solanaCluster, solanaEndpoint, dangerouslyAllowUnknownMint);
    // Check cache
    let cached = managerCache.get(cacheKey);
    if (cached) {
        // Increment reference count
        cached.refCount++;
        (0, logger_1.getLogger)().debug(`[ManagerCache] Reusing cached managers (refCount: ${cached.refCount}):`, { stripePublicKey: stripePublicKey.slice(0, 10) + '...', serverUrl });
        return cached;
    }
    // Create new managers
    (0, logger_1.getLogger)().debug('[ManagerCache] Creating new manager instances:', { stripePublicKey: stripePublicKey.slice(0, 10) + '...', serverUrl });
    const routeDiscovery = new RouteDiscoveryManager_1.RouteDiscoveryManager(serverUrl);
    const stripeManager = new StripeManager_1.StripeManager(stripePublicKey, routeDiscovery);
    const x402Manager = new X402Manager_1.X402Manager(routeDiscovery);
    const walletManager = new WalletManager_1.WalletManager(solanaCluster, solanaEndpoint, dangerouslyAllowUnknownMint ?? false);
    const subscriptionManager = new SubscriptionManager_1.SubscriptionManager(stripePublicKey, routeDiscovery);
    const subscriptionChangeManager = new SubscriptionChangeManager_1.SubscriptionChangeManager(routeDiscovery);
    const creditsManager = new CreditsManager_1.CreditsManager(routeDiscovery);
    // Cache with initial refCount of 1
    cached = {
        stripeManager,
        x402Manager,
        walletManager,
        subscriptionManager,
        subscriptionChangeManager,
        creditsManager,
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
function releaseManagers(stripePublicKey, serverUrl, solanaCluster, solanaEndpoint, dangerouslyAllowUnknownMint) {
    const cacheKey = getCacheKey(stripePublicKey, serverUrl, solanaCluster, solanaEndpoint, dangerouslyAllowUnknownMint);
    const cached = managerCache.get(cacheKey);
    if (!cached) {
        (0, logger_1.getLogger)().warn('[ManagerCache] Attempted to release non-existent managers:', { cacheKey });
        return;
    }
    cached.refCount--;
    (0, logger_1.getLogger)().debug(`[ManagerCache] Released manager reference (refCount: ${cached.refCount}):`, { stripePublicKey: stripePublicKey.slice(0, 10) + '...', serverUrl });
    // Remove from cache when no longer referenced
    if (cached.refCount <= 0) {
        managerCache.delete(cacheKey);
        (0, logger_1.getLogger)().debug('[ManagerCache] Removed managers from cache (refCount reached 0)');
    }
}
/**
 * Clear all cached managers (for testing)
 *
 * @internal
 */
function clearManagerCache() {
    managerCache.clear();
    (0, logger_1.getLogger)().debug('[ManagerCache] Cache cleared');
}
/**
 * Get cache statistics (for debugging)
 *
 * @internal
 */
function getManagerCacheStats() {
    return {
        entries: managerCache.size,
        details: Array.from(managerCache.entries()).map(([key, value]) => ({
            config: JSON.parse(key),
            refCount: value.refCount,
        })),
    };
}
//# sourceMappingURL=ManagerCache.js.map