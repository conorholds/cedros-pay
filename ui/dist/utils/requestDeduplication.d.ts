/**
 * Request Deduplication Utilities
 *
 * Prevents duplicate API calls when users rapidly click payment buttons.
 * Includes:
 * - Request deduplication (prevents same request ID from firing multiple times)
 * - Button cooldown (0.2s timeout to prevent accidental double-clicks)
 * - In-flight request tracking
 */
/**
 * Default cooldown period (200ms = 0.2s)
 * Prevents accidental double-clicks while not feeling laggy
 */
export declare const DEFAULT_COOLDOWN_MS = 200;
/**
 * Default deduplication window (2 seconds)
 * Prevents identical requests within this time window
 */
export declare const DEFAULT_DEDUP_WINDOW_MS = 2000;
/**
 * Check if a button is currently in cooldown
 *
 * @param buttonId - Unique button identifier
 * @returns true if button is in cooldown, false otherwise
 */
export declare function isButtonInCooldown(buttonId: string): boolean;
/**
 * Set button cooldown
 *
 * @param buttonId - Unique button identifier
 * @param cooldownMs - Cooldown duration in milliseconds (default: 200ms)
 */
export declare function setButtonCooldown(buttonId: string, cooldownMs?: number): void;
/**
 * Check if a request is a duplicate
 *
 * @param requestId - Unique request identifier
 * @param windowMs - Deduplication window in milliseconds (default: 2000ms)
 * @returns true if request is a duplicate, false otherwise
 */
export declare function isDuplicateRequest(requestId: string, windowMs?: number): boolean;
/**
 * Mark a request as processed
 *
 * @param requestId - Unique request identifier
 */
export declare function markRequestProcessed(requestId: string): void;
/**
 * Check if a request is currently in flight
 *
 * @param requestId - Unique request identifier
 * @returns Promise if request is in flight, null otherwise
 */
export declare function getInFlightRequest<T>(requestId: string): Promise<T> | null;
/**
 * Track an in-flight request
 *
 * @param requestId - Unique request identifier
 * @param promise - Promise representing the request
 * @returns The same promise (for chaining)
 */
export declare function trackInFlightRequest<T>(requestId: string, promise: Promise<T>): Promise<T>;
/**
 * Deduplicate a request
 *
 * Combines duplicate detection, in-flight tracking, and request execution.
 * If an identical request is already in flight, returns the existing promise.
 * If the request was recently completed, blocks it.
 *
 * @param requestId - Unique request identifier
 * @param executor - Function that executes the request
 * @param options - Deduplication options
 * @returns Promise with request result
 *
 * @example
 * ```ts
 * const result = await deduplicateRequest(
 *   `stripe-session-${resourceId}`,
 *   () => createStripeSession(resourceId)
 * );
 * ```
 */
export declare function deduplicateRequest<T>(requestId: string, executor: () => Promise<T>, options?: {
    windowMs?: number;
    throwOnDuplicate?: boolean;
}): Promise<T>;
/**
 * Create a deduplicated button click handler
 *
 * Wraps a click handler with deduplication and cooldown protection.
 *
 * @param buttonId - Unique button identifier
 * @param handler - Original click handler
 * @param options - Deduplication options
 * @returns Wrapped click handler
 *
 * @example
 * ```tsx
 * const handleClick = createDedupedClickHandler(
 *   'pay-button-stripe',
 *   async () => {
 *     const session = await createStripeSession(resourceId);
 *     window.location.href = session.url;
 *   }
 * );
 * ```
 */
export declare function createDedupedClickHandler(buttonId: string, handler: () => Promise<void> | void, options?: {
    cooldownMs?: number;
    deduplicationWindowMs?: number;
}): () => Promise<void>;
/**
 * Clear all deduplication caches (for testing)
 */
export declare function clearDeduplicationCache(): void;
/**
 * Get deduplication stats (for debugging)
 */
export declare function getDeduplicationStats(): {
    cachedRequests: number;
    inFlightRequests: number;
    activeCooldowns: number;
};
//# sourceMappingURL=requestDeduplication.d.ts.map