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

import { getLogger } from './logger';
import { PaymentError } from '../types/errors';

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
  /** Optional key used to coalesce identical in-flight operations */
  inFlightKey?: string;
}

export interface RetryStats {
  attempts: number;
  totalDelay: number;
  lastError: Error | null;
}

const MAX_RETRY_AFTER_MS = 5 * 60 * 1000;
const inFlightRetries = new Map<string, Promise<unknown>>();

function parseRetryAfterMs(retryAfterHeader: string | null): number | undefined {
  if (!retryAfterHeader) {
    return undefined;
  }

  const seconds = Number(retryAfterHeader);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(seconds * 1000, MAX_RETRY_AFTER_MS);
  }

  const retryAt = Date.parse(retryAfterHeader);
  if (Number.isNaN(retryAt)) {
    return undefined;
  }

  return Math.min(Math.max(retryAt - Date.now(), 0), MAX_RETRY_AFTER_MS);
}

export class RetryableHttpError extends Error {
  public readonly httpStatus: number;
  public readonly retryAfterMs?: number;

  constructor(message: string, httpStatus: number, retryAfterMs?: number) {
    super(message);
    this.name = 'RetryableHttpError';
    this.httpStatus = httpStatus;
    this.retryAfterMs = retryAfterMs;

    Object.setPrototypeOf(this, RetryableHttpError.prototype);
  }

  static fromResponse(response: Response, message: string): RetryableHttpError {
    const retryAfterHeader =
      response.headers && typeof response.headers.get === 'function'
        ? response.headers.get('Retry-After')
        : null;

    return new RetryableHttpError(
      message,
      response.status,
      parseRetryAfterMs(retryAfterHeader)
    );
  }
}

function getRetryStatus(error: Error): number | undefined {
  if (error instanceof PaymentError) {
    return error.httpStatus;
  }
  if (error instanceof RetryableHttpError) {
    return error.httpStatus;
  }
  return undefined;
}

function getRetryAfterDelay(error: Error): number | undefined {
  if (error instanceof RetryableHttpError) {
    return error.retryAfterMs;
  }
  return undefined;
}

/**
 * Default retry policy - retries on network errors and 5xx responses.
 * Uses structured httpStatus from PaymentError when available, falling
 * back to message substring matching for plain Error instances.
 */
function defaultShouldRetry(error: Error, _attempt: number): boolean {
  // Prefer structured status code when available (avoids false positives
  // from substring matching on error messages like "Error at line 500").
  const status = getRetryStatus(error);
  if (status != null) {
    const s = status;
    return s === 429 || (s >= 500 && s < 600);
  }

  const errorMessage = error.message.toLowerCase();

  // Retry on network errors (no HTTP status — connection-level failures)
  if (
    errorMessage.includes('network') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('fetch failed') ||
    errorMessage.includes('econnrefused')
  ) {
    return true;
  }

  // No structured status and no recognisable network error — don't retry
  return false;
}

/**
 * Calculate delay with exponential backoff and optional jitter
 */
function calculateDelay(
  attempt: number,
  initialDelayMs: number,
  backoffFactor: number,
  maxDelayMs: number,
  jitter: boolean
): number {
  // Exponential backoff: delay = initial * (factor ^ attempt)
  const exponentialDelay = initialDelayMs * Math.pow(backoffFactor, attempt);

  // Cap at max delay
  const cappedDelay = Math.min(exponentialDelay, maxDelayMs);

  // Add jitter (50-100% of delay) to prevent thundering herd while guaranteeing a minimum wait
  if (jitter) {
    return Math.floor(cappedDelay * 0.5 + Math.random() * cappedDelay * 0.5);
  }

  return Math.floor(cappedDelay);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
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
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    backoffFactor = 2,
    maxDelayMs = 30000,
    jitter = true,
    shouldRetry = defaultShouldRetry,
    name = 'retry',
    inFlightKey,
  } = config;

  const execute = async (): Promise<T> => {
    let lastError: Error | null = null;
    let totalDelay = 0;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await fn();

        if (attempt > 0) {
          getLogger().debug(
            `[Retry:${name}] Succeeded on attempt ${attempt + 1}/${maxRetries + 1} after ${totalDelay}ms`
          );
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        const isLastAttempt = attempt === maxRetries;
        const shouldRetryError = shouldRetry(lastError, attempt);

        if (isLastAttempt || !shouldRetryError) {
          getLogger().warn(
            `[Retry:${name}] Failed on attempt ${attempt + 1}/${maxRetries + 1}. ${
              isLastAttempt ? 'No more retries.' : 'Error not retryable.'
            }`
          );
          throw lastError;
        }

        const retryAfterDelay = getRetryAfterDelay(lastError);
        const delay = retryAfterDelay ?? calculateDelay(
          attempt,
          initialDelayMs,
          backoffFactor,
          maxDelayMs,
          jitter
        );
        totalDelay += delay;

        getLogger().warn(
          `[Retry:${name}] Attempt ${attempt + 1}/${maxRetries + 1} failed: ${lastError.message}. Retrying in ${delay}ms...`
        );

        await sleep(delay);
      }
    }

    throw lastError || new Error('Retry failed with no error');
  };

  if (!inFlightKey) {
    return execute();
  }

  const existing = inFlightRetries.get(inFlightKey);
  if (existing) {
    return existing as Promise<T>;
  }

  const pending = execute().finally(() => {
    if (inFlightRetries.get(inFlightKey) === pending) {
      inFlightRetries.delete(inFlightKey);
    }
  });
  inFlightRetries.set(inFlightKey, pending);
  return pending as Promise<T>;
}

/**
 * Preset retry configurations
 */
export const RETRY_PRESETS = {
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
  /** At most one retry for writes with a real idempotency guarantee */
  IDEMPOTENT_WRITE: {
    maxRetries: 1,
    initialDelayMs: 1000,
    backoffFactor: 2,
    maxDelayMs: 10000,
  },
  /** Never automatically retry non-idempotent writes */
  WRITE_ONCE: {
    maxRetries: 0,
    initialDelayMs: 1000,
    backoffFactor: 2,
    maxDelayMs: 10000,
  },
} as const;
