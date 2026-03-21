/**
 * Default timeout for HTTP requests (15 seconds)
 */
export declare const DEFAULT_FETCH_TIMEOUT_MS = 15000;
/**
 * Fetch with timeout utility
 *
 * Wraps fetch() with an AbortController to enforce timeout
 * Properly handles external AbortSignals while adding timeout functionality
 * Default timeout: 15 seconds
 */
export declare function fetchWithTimeout(url: string, options?: RequestInit, timeoutMs?: number): Promise<Response>;
//# sourceMappingURL=fetchWithTimeout.d.ts.map