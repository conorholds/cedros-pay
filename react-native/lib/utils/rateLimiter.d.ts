/**
 * Rate Limiter - Token Bucket Algorithm
 *
 * Prevents spamming backend with payment requests by enforcing
 * a maximum number of requests per time window.
 *
 * Features:
 * - Token bucket algorithm (allows bursts, enforces long-term rate)
 * - Automatic token refill over time
 * - Thread-safe (uses timestamps, not intervals)
 * - Memory efficient (no timers or intervals)
 *
 * Usage:
 * ```typescript
 * const limiter = createRateLimiter({ maxRequests: 10, windowMs: 60000 });
 *
 * if (limiter.tryConsume()) {
 *   await makePaymentRequest();
 * } else {
 *   console.error('Rate limit exceeded');
 * }
 * ```
 */
export interface RateLimiterConfig {
    /** Maximum number of requests allowed per time window */
    maxRequests: number;
    /** Time window in milliseconds */
    windowMs: number;
}
export interface RateLimiter {
    /** Try to consume a token. Returns true if request is allowed, false if rate limited */
    tryConsume: () => boolean;
    /** Get remaining tokens available */
    getAvailableTokens: () => number;
    /** Get time until next token refill (in ms) */
    getTimeUntilRefill: () => number;
    /** Reset the rate limiter (useful for testing or manual override) */
    reset: () => void;
}
/**
 * Creates a rate limiter using token bucket algorithm
 *
 * @param config - Rate limiter configuration
 * @returns Rate limiter instance
 *
 * @example
 * ```typescript
 * // Allow 5 payment requests per minute
 * const paymentLimiter = createRateLimiter({
 *   maxRequests: 5,
 *   windowMs: 60000
 * });
 *
 * async function handlePayment() {
 *   if (!paymentLimiter.tryConsume()) {
 *     throw new Error('Rate limit exceeded. Please wait before trying again.');
 *   }
 *   await processPayment();
 * }
 * ```
 */
export declare function createRateLimiter(config: RateLimiterConfig): RateLimiter;
/**
 * Preset rate limiter configurations for common use cases
 */
export declare const RATE_LIMITER_PRESETS: {
    /** 10 requests per minute - recommended for payment requests */
    readonly PAYMENT: {
        readonly maxRequests: 10;
        readonly windowMs: 60000;
    };
    /** 30 requests per minute - for quote fetching */
    readonly QUOTE: {
        readonly maxRequests: 30;
        readonly windowMs: 60000;
    };
    /** 5 requests per minute - strict limit for sensitive operations */
    readonly STRICT: {
        readonly maxRequests: 5;
        readonly windowMs: 60000;
    };
    /** 100 requests per minute - permissive for UI interactions */
    readonly PERMISSIVE: {
        readonly maxRequests: 100;
        readonly windowMs: 60000;
    };
};
//# sourceMappingURL=rateLimiter.d.ts.map