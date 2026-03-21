"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RETRY_PRESETS = void 0;
exports.retryWithBackoff = retryWithBackoff;
const logger_1 = require("./logger");
/**
 * Default retry policy - retries on network errors and 5xx responses
 */
function defaultShouldRetry(error, attempt) {
    // Don't retry if max attempts reached
    if (attempt >= 3) {
        return false;
    }
    const errorMessage = error.message.toLowerCase();
    // Retry on network errors
    if (errorMessage.includes('network') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('fetch failed') ||
        errorMessage.includes('econnrefused')) {
        return true;
    }
    // Retry on 5xx server errors and 429 rate limit
    if (errorMessage.includes('503') ||
        errorMessage.includes('502') ||
        errorMessage.includes('500') ||
        errorMessage.includes('429')) {
        return true;
    }
    // Don't retry on 4xx client errors (except 429)
    if (errorMessage.includes('400') ||
        errorMessage.includes('401') ||
        errorMessage.includes('403') ||
        errorMessage.includes('404')) {
        return false;
    }
    return false;
}
/**
 * Calculate delay with exponential backoff and optional jitter
 */
function calculateDelay(attempt, initialDelayMs, backoffFactor, maxDelayMs, jitter) {
    // Exponential backoff: delay = initial * (factor ^ attempt)
    const exponentialDelay = initialDelayMs * Math.pow(backoffFactor, attempt);
    // Cap at max delay
    const cappedDelay = Math.min(exponentialDelay, maxDelayMs);
    // Add jitter (0-100% of delay) to prevent thundering herd
    if (jitter) {
        const jitterAmount = Math.random() * cappedDelay;
        return Math.floor(jitterAmount);
    }
    return Math.floor(cappedDelay);
}
/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
async function retryWithBackoff(fn, config = {}) {
    const { maxRetries = 3, initialDelayMs = 1000, backoffFactor = 2, maxDelayMs = 30000, jitter = true, shouldRetry = defaultShouldRetry, name = 'retry', } = config;
    let lastError = null;
    let totalDelay = 0;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const result = await fn();
            if (attempt > 0) {
                (0, logger_1.getLogger)().debug(`[Retry:${name}] Succeeded on attempt ${attempt + 1}/${maxRetries + 1} after ${totalDelay}ms`);
            }
            return result;
        }
        catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            // Check if we should retry
            const isLastAttempt = attempt === maxRetries;
            const shouldRetryError = shouldRetry(lastError, attempt);
            if (isLastAttempt || !shouldRetryError) {
                (0, logger_1.getLogger)().warn(`[Retry:${name}] Failed on attempt ${attempt + 1}/${maxRetries + 1}. ${isLastAttempt ? 'No more retries.' : 'Error not retryable.'}`);
                throw lastError;
            }
            // Calculate delay
            const delay = calculateDelay(attempt, initialDelayMs, backoffFactor, maxDelayMs, jitter);
            totalDelay += delay;
            (0, logger_1.getLogger)().warn(`[Retry:${name}] Attempt ${attempt + 1}/${maxRetries + 1} failed: ${lastError.message}. Retrying in ${delay}ms...`);
            await sleep(delay);
        }
    }
    // This should never be reached, but TypeScript needs it
    throw lastError || new Error('Retry failed with no error');
}
/**
 * Preset retry configurations
 */
exports.RETRY_PRESETS = {
    /** Quick retries for transient errors (3 retries, 1s initial, 2x backoff) */
    QUICK: {
        maxRetries: 3,
        initialDelayMs: 1000,
        backoffFactor: 2,
        maxDelayMs: 10000,
    },
    /** Standard retries (3 retries, 2s initial, 2x backoff) */
    STANDARD: {
        maxRetries: 3,
        initialDelayMs: 2000,
        backoffFactor: 2,
        maxDelayMs: 30000,
    },
    /** Aggressive retries for critical operations (5 retries, 500ms initial) */
    AGGRESSIVE: {
        maxRetries: 5,
        initialDelayMs: 500,
        backoffFactor: 1.5,
        maxDelayMs: 15000,
    },
    /** Patient retries for slow backends (5 retries, 5s initial) */
    PATIENT: {
        maxRetries: 5,
        initialDelayMs: 5000,
        backoffFactor: 2,
        maxDelayMs: 60000,
    },
};
//# sourceMappingURL=exponentialBackoff.js.map