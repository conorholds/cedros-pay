/**
 * Public interface for route discovery management.
 *
 * Use this interface for type annotations instead of the concrete RouteDiscoveryManager class.
 */
export interface IRouteDiscoveryManager {
    /**
     * Discover route prefix from backend health endpoint
     */
    discoverPrefix(): Promise<string>;
    /**
     * Build API URL with discovered prefix
     */
    buildUrl(path: string): Promise<string>;
    /**
     * Reset cached prefix (useful for testing or reconnecting)
     */
    reset(): void;
}
/**
 * Internal implementation of route discovery for dynamic backend routing.
 *
 * PERFORMANCE OPTIMIZATIONS:
 * - Request deduplication: Multiple concurrent calls share a single in-flight HTTP request
 * - Response caching: Successful discovery results are cached to avoid repeated requests
 * - Exponential backoff: Failed requests retry with increasing delays (1s, 2s, 4s)
 *
 * CONCURRENT REQUEST HANDLING:
 * When multiple components mount simultaneously (e.g., during page hydration),
 * they all call discoverPrefix() concurrently. Without deduplication, this would
 * trigger N separate /cedros-health requests. With deduplication, all concurrent
 * callers share the same in-flight promise, resulting in exactly 1 HTTP request.
 *
 * Example scenario:
 * - 5 payment buttons mount at the same time
 * - All 5 call discoverPrefix() within milliseconds
 * - Only 1 /cedros-health request is made
 * - All 5 buttons receive the same cached prefix
 *
 * @internal
 * **DO NOT USE THIS CLASS DIRECTLY**
 *
 * This concrete class is not part of the stable API and may change without notice.
 *
 * @see {@link IRouteDiscoveryManager} for the stable interface
 * @see API_STABILITY.md for our API stability policy
 */
export declare class RouteDiscoveryManager implements IRouteDiscoveryManager {
    private readonly serverUrl;
    private routePrefix;
    private discoveryPromise;
    private failedDiscoveryAt;
    private readonly maxRetries;
    private readonly baseDelayMs;
    private readonly discoveryTimeoutMs;
    private readonly failedDiscoveryTtlMs;
    constructor(serverUrl: string);
    /**
     * Discover route prefix from backend health endpoint
     *
     * DEDUPLICATION: Multiple concurrent calls share the same in-flight request
     * SECURITY FIX: Only cache on success, retry on failures with exponential backoff
     * This prevents permanent bricking of payments due to transient failures
     */
    discoverPrefix(): Promise<string>;
    /**
     * Build API URL with discovered prefix
     */
    buildUrl(path: string): Promise<string>;
    /**
     * Reset cached prefix (useful for testing or reconnecting)
     */
    reset(): void;
}
//# sourceMappingURL=RouteDiscoveryManager.d.ts.map