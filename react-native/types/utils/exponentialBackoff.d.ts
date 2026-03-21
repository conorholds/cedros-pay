/**
 * Exponential Backoff and Retry Logic
 *
 * Implements retry logic with exponential backoff for failed requests.
 * Prevents hammering failing services and gives them time to recover.
 *
 * Features:
 * - Exponential delay with jitter
 * - Configurable max retries and max delay
 * - Automatic retry for retryable errors
 * - Respects Retry-After header (429 responses)
 *
 * Usage:
 * ```typescript
 * const result = await retryWithBackoff(
 *   async () => await fetch('/api/payment'),
 *   { maxRetries: 3, initialDelayMs: 1000 }
 * );
 * ```
 */
export interface RetryConfig {
    /** Maximum number of retry attempts (default: 3) */
    maxRetries?: number;
    /** Initial delay in milliseconds (default: 1000) */
    initialDelayMs?: number;
    /** Backoff multiplier (default: 2) */
    backoffFactor?: number;
    /** Maximum delay in milliseconds (default: 30000) */
    maxDelayMs?: number;
    /** Add random jitter to prevent thundering herd (default: true) */
    jitter?: boolean;
    /** Custom function to determine if error is retryable */
    shouldRetry?: (error: Error, attempt: number) => boolean;
    /** Optional name for logging */
    name?: string;
}
export interface RetryStats {
    attempts: number;
    totalDelay: number;
    lastError: Error | null;
}
/**
 * Retry a function with exponential backoff
 *
 * @param fn - Async function to retry
 * @param config - Retry configuration
 * @returns Promise that resolves with function result
 * @throws Last error if all retries fail
 *
 * @example
 * ```typescript
 * // Retry payment creation with default config
 * const session = await retryWithBackoff(
 *   async () => await createPaymentSession(),
 *   { name: 'create-session' }
 * );
 *
 * // Custom retry policy
 * const result = await retryWithBackoff(
 *   async () => await fetchQuote(),
 *   {
 *     maxRetries: 5,
 *     initialDelayMs: 500,
 *     backoffFactor: 1.5,
 *     shouldRetry: (error) => error.message.includes('TEMP'),
 *   }
 * );
 * ```
 */
export declare function retryWithBackoff<T>(fn: () => Promise<T>, config?: RetryConfig): Promise<T>;
/**
 * Preset retry configurations
 */
export declare const RETRY_PRESETS: {
    /** Quick retries for transient errors (3 retries, 1s initial, 2x backoff) */
    readonly QUICK: {
        readonly maxRetries: 3;
        readonly initialDelayMs: 1000;
        readonly backoffFactor: 2;
        readonly maxDelayMs: 10000;
    };
    /** Standard retries (3 retries, 2s initial, 2x backoff) */
    readonly STANDARD: {
        readonly maxRetries: 3;
        readonly initialDelayMs: 2000;
        readonly backoffFactor: 2;
        readonly maxDelayMs: 30000;
    };
    /** Aggressive retries for critical operations (5 retries, 500ms initial) */
    readonly AGGRESSIVE: {
        readonly maxRetries: 5;
        readonly initialDelayMs: 500;
        readonly backoffFactor: 1.5;
        readonly maxDelayMs: 15000;
    };
    /** Patient retries for slow backends (5 retries, 5s initial) */
    readonly PATIENT: {
        readonly maxRetries: 5;
        readonly initialDelayMs: 5000;
        readonly backoffFactor: 2;
        readonly maxDelayMs: 60000;
    };
};
//# sourceMappingURL=exponentialBackoff.d.ts.map