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
export function createRateLimiter(config: RateLimiterConfig): RateLimiter {
  const { maxRequests, windowMs } = config;

  // Token bucket state
  let tokens = maxRequests;
  let lastRefillTimestamp = Date.now();

  // Calculate refill rate: tokens per millisecond
  const refillRate = maxRequests / windowMs;

  /**
   * Refill tokens based on elapsed time since last refill
   */
  function refillTokens(): void {
    const now = Date.now();
    const elapsedMs = now - lastRefillTimestamp;

    if (elapsedMs > 0) {
      const tokensToAdd = elapsedMs * refillRate;
      tokens = Math.min(maxRequests, tokens + tokensToAdd);
      lastRefillTimestamp = now;
    }
  }

  /**
   * Try to consume one token
   * @returns true if request is allowed, false if rate limited
   */
  function tryConsume(): boolean {
    refillTokens();

    if (tokens >= 1) {
      tokens -= 1;
      return true;
    }

    return false;
  }

  /**
   * Get number of available tokens (fractional)
   * @returns Number of tokens available
   */
  function getAvailableTokens(): number {
    refillTokens();
    return Math.floor(tokens);
  }

  /**
   * Get time until at least one token will be available
   * @returns Time in milliseconds until next token
   */
  function getTimeUntilRefill(): number {
    refillTokens();

    if (tokens >= 1) {
      return 0;
    }

    const tokensNeeded = 1 - tokens;
    const msNeeded = tokensNeeded / refillRate;
    return Math.ceil(msNeeded);
  }

  /**
   * Reset the rate limiter to initial state
   */
  function reset(): void {
    tokens = maxRequests;
    lastRefillTimestamp = Date.now();
  }

  return {
    tryConsume,
    getAvailableTokens,
    getTimeUntilRefill,
    reset,
  };
}

/**
 * Preset rate limiter configurations for common use cases
 */
export const RATE_LIMITER_PRESETS = {
  /** 10 requests per minute - recommended for payment requests */
  PAYMENT: { maxRequests: 10, windowMs: 60000 },
  /** 30 requests per minute - for quote fetching */
  QUOTE: { maxRequests: 30, windowMs: 60000 },
  /** 5 requests per minute - strict limit for sensitive operations */
  STRICT: { maxRequests: 5, windowMs: 60000 },
  /** 100 requests per minute - permissive for UI interactions */
  PERMISSIVE: { maxRequests: 100, windowMs: 60000 },
} as const;
