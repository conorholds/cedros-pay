/**
 * Request Deduplication Utilities
 *
 * Prevents duplicate API calls when users rapidly click payment buttons.
 * Includes:
 * - Request deduplication (prevents same request ID from firing multiple times)
 * - Button cooldown (0.2s timeout to prevent accidental double-clicks)
 * - In-flight request tracking
 */

import { getLogger } from './logger';

/**
 * Request deduplication cache
 * Maps request ID -> timestamp of last request
 */
const requestCache = new Map<string, number>();

/**
 * In-flight requests tracking
 * Maps request ID -> Promise
 */
const inFlightRequests = new Map<string, Promise<unknown>>();

/**
 * Button cooldown tracking
 * Maps button ID -> timestamp when cooldown expires
 */
const buttonCooldowns = new Map<string, number>();

/**
 * Default cooldown period (200ms = 0.2s)
 * Prevents accidental double-clicks while not feeling laggy
 */
export const DEFAULT_COOLDOWN_MS = 200;

/**
 * Default deduplication window (2 seconds)
 * Prevents identical requests within this time window
 */
export const DEFAULT_DEDUP_WINDOW_MS = 2000;

/**
 * Check if a button is currently in cooldown
 *
 * @param buttonId - Unique button identifier
 * @returns true if button is in cooldown, false otherwise
 */
export function isButtonInCooldown(buttonId: string): boolean {
  const cooldownExpiry = buttonCooldowns.get(buttonId);
  if (!cooldownExpiry) {
    return false;
  }

  const now = Date.now();
  if (now < cooldownExpiry) {
    return true;
  }

  // Cooldown expired, clean up
  buttonCooldowns.delete(buttonId);
  return false;
}

/**
 * Set button cooldown
 *
 * @param buttonId - Unique button identifier
 * @param cooldownMs - Cooldown duration in milliseconds (default: 200ms)
 */
export function setButtonCooldown(buttonId: string, cooldownMs: number = DEFAULT_COOLDOWN_MS): void {
  const cooldownExpiry = Date.now() + cooldownMs;
  buttonCooldowns.set(buttonId, cooldownExpiry);
}

/**
 * Check if a request is a duplicate
 *
 * @param requestId - Unique request identifier
 * @param windowMs - Deduplication window in milliseconds (default: 2000ms)
 * @returns true if request is a duplicate, false otherwise
 */
export function isDuplicateRequest(requestId: string, windowMs: number = DEFAULT_DEDUP_WINDOW_MS): boolean {
  const lastRequestTime = requestCache.get(requestId);
  if (!lastRequestTime) {
    return false;
  }

  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < windowMs) {
    getLogger().debug(`[Deduplication] Duplicate request blocked: ${requestId} (${timeSinceLastRequest}ms ago)`);
    return true;
  }

  return false;
}

/**
 * Mark a request as processed
 *
 * @param requestId - Unique request identifier
 */
export function markRequestProcessed(requestId: string): void {
  requestCache.set(requestId, Date.now());
}

/**
 * Check if a request is currently in flight
 *
 * @param requestId - Unique request identifier
 * @returns Promise if request is in flight, null otherwise
 */
export function getInFlightRequest<T>(requestId: string): Promise<T> | null {
  return (inFlightRequests.get(requestId) as Promise<T>) || null;
}

/**
 * Track an in-flight request
 *
 * @param requestId - Unique request identifier
 * @param promise - Promise representing the request
 * @returns The same promise (for chaining)
 */
export function trackInFlightRequest<T>(requestId: string, promise: Promise<T>): Promise<T> {
  inFlightRequests.set(requestId, promise);

  // Clean up when request completes (success or failure)
  const cleanup = () => {
    inFlightRequests.delete(requestId);
    markRequestProcessed(requestId);
  };

  promise.then(cleanup, cleanup);

  return promise;
}

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
export async function deduplicateRequest<T>(
  requestId: string,
  executor: () => Promise<T>,
  options: {
    windowMs?: number;
    throwOnDuplicate?: boolean;
  } = {}
): Promise<T> {
  const { windowMs = DEFAULT_DEDUP_WINDOW_MS, throwOnDuplicate = true } = options;

  // Check if request is already in flight
  const inFlight = getInFlightRequest<T>(requestId);
  if (inFlight) {
    getLogger().debug(`[Deduplication] Reusing in-flight request: ${requestId}`);
    return inFlight;
  }

  // Check if request is a duplicate
  if (isDuplicateRequest(requestId, windowMs)) {
    if (throwOnDuplicate) {
      throw new Error(`Duplicate request blocked: ${requestId}`);
    }
    getLogger().warn(`[Deduplication] Duplicate request blocked but not throwing: ${requestId}`);
    // Return a rejected promise that won't throw
    return Promise.reject(new Error('Duplicate request'));
  }

  // Execute and track the request
  const promise = executor();
  return trackInFlightRequest(requestId, promise);
}

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
 * import { Linking } from 'react-native';
 *
 * const handleClick = createDedupedClickHandler(
 *   'pay-button-stripe',
 *   async () => {
 *     const session = await createStripeSession(resourceId);
 *     await Linking.openURL(session.url);
 *   }
 * );
 * ```
 */
export function createDedupedClickHandler(
  buttonId: string,
  handler: () => Promise<void> | void,
  options: {
    cooldownMs?: number;
    deduplicationWindowMs?: number;
  } = {}
): () => Promise<void> {
  const { cooldownMs = DEFAULT_COOLDOWN_MS, deduplicationWindowMs = DEFAULT_DEDUP_WINDOW_MS } = options;

  return async () => {
    // Check button cooldown
    if (isButtonInCooldown(buttonId)) {
      getLogger().debug(`[Deduplication] Button in cooldown: ${buttonId}`);
      return;
    }

    // Set cooldown immediately (before async work)
    setButtonCooldown(buttonId, cooldownMs);

    // Execute with deduplication
    try {
      await deduplicateRequest(
        buttonId,
        async () => {
          const result = handler();
          // Handle both sync and async handlers
          if (result instanceof Promise) {
            await result;
          }
        },
        { windowMs: deduplicationWindowMs, throwOnDuplicate: false }
      );
    } catch (error) {
      // Silently ignore deduplication errors
      if (error instanceof Error && error.message.includes('Duplicate request')) {
        return;
      }
      // Re-throw other errors
      throw error;
    }
  };
}

/**
 * Clear all deduplication caches (for testing)
 */
export function clearDeduplicationCache(): void {
  requestCache.clear();
  inFlightRequests.clear();
  buttonCooldowns.clear();
}

/**
 * Get deduplication stats (for debugging)
 */
export function getDeduplicationStats() {
  return {
    cachedRequests: requestCache.size,
    inFlightRequests: inFlightRequests.size,
    activeCooldowns: buttonCooldowns.size,
  };
}
