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

import { getLogger } from '../utils/logger';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';

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
export class RouteDiscoveryManager implements IRouteDiscoveryManager {
  private readonly serverUrl: string;
  private routePrefix: string | null = null;
  private discoveryPromise: Promise<string> | null = null;
  private readonly maxRetries: number = 3;
  private readonly baseDelayMs: number = 1000;

  constructor(serverUrl: string) {
    this.serverUrl = serverUrl;
  }

  /**
   * Discover route prefix from backend health endpoint
   *
   * DEDUPLICATION: Multiple concurrent calls share the same in-flight request
   * SECURITY FIX: Only cache on success, retry on failures with exponential backoff
   * This prevents permanent bricking of payments due to transient failures
   */
  async discoverPrefix(): Promise<string> {
    // Return cached value if available (only set on successful discovery)
    if (this.routePrefix !== null) {
      return this.routePrefix;
    }

    // Return pending promise if discovery is in progress
    // DEDUPLICATION: This prevents multiple simultaneous /cedros-health calls
    if (this.discoveryPromise) {
      return this.discoveryPromise;
    }

    // Start new discovery with iterative retry logic
    // CRITICAL: Assign promise synchronously before any await to prevent race conditions
    const discoveryTask = (async (): Promise<string> => {
      let attempt = 0;

      while (attempt < this.maxRetries) {
        try {
          const response = await fetchWithTimeout(`${this.serverUrl}/cedros-health`);

          if (!response.ok) {
            // Don't retry 4xx client errors (404, 401, etc.) - they won't succeed on retry
            if (response.status >= 400 && response.status < 500) {
              getLogger().warn(`Route discovery received ${response.status} - not retrying client error`);
              // Cache empty prefix to prevent retry spam on persistent 4xx errors
              this.routePrefix = '';
              return '';
            }
            throw new Error(`Health check returned ${response.status}`);
          }

          const health = await response.json();
          const prefix = health.routePrefix || '';

          // SECURITY FIX: Only cache on successful discovery
          this.routePrefix = prefix;

          getLogger().debug('Route discovery successful, prefix:', prefix || '(empty)');
          return prefix;
        } catch (error) {
          attempt++;

          // If we've exhausted retries, fall back to empty prefix for this request only
          if (attempt >= this.maxRetries) {
            getLogger().warn(
              `Route discovery failed after ${attempt} attempts, using empty prefix for this request:`,
              error
            );
            // Don't cache the empty prefix - allow next request to retry
            return '';
          }

          // Exponential backoff before retry
          const delayMs = this.baseDelayMs * Math.pow(2, attempt - 1);
          getLogger().warn(
            `Route discovery failed (attempt ${attempt}/${this.maxRetries}), retrying in ${delayMs}ms:`,
            error
          );

          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }

      // This should never be reached due to the return in the catch block, but TypeScript needs it
      return '';
    })();

    // DEDUPLICATION FIX: Assign promise synchronously before any await
    // This ensures all concurrent callers see the same in-flight promise
    this.discoveryPromise = discoveryTask;

    try {
      return await this.discoveryPromise;
    } finally {
      // Clear promise after completion (success or all retries exhausted)
      // Only clear if it's still our promise to avoid race conditions
      if (this.discoveryPromise === discoveryTask) {
        this.discoveryPromise = null;
      }
    }
  }

  /**
   * Build API URL with discovered prefix
   */
  async buildUrl(path: string): Promise<string> {
    const prefix = await this.discoverPrefix();
    // Ensure path starts with / and prefix doesn't have trailing /
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.serverUrl}${prefix}${cleanPath}`;
  }

  /**
   * Reset cached prefix (useful for testing or reconnecting)
   */
  reset(): void {
    this.routePrefix = null;
    this.discoveryPromise = null;
  }
}
