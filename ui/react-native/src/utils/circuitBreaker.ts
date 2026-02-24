/**
 * Circuit Breaker Pattern Implementation
 *
 * Prevents cascading failures by "opening the circuit" when a service is failing,
 * giving it time to recover before attempting requests again.
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Service is failing, requests fail immediately
 * - HALF_OPEN: Testing if service has recovered
 *
 * Flow:
 * 1. CLOSED → OPEN: After N consecutive failures
 * 2. OPEN → HALF_OPEN: After timeout expires
 * 3. HALF_OPEN → CLOSED: If request succeeds
 * 4. HALF_OPEN → OPEN: If request fails
 *
 * Usage:
 * ```typescript
 * const breaker = createCircuitBreaker({ failureThreshold: 5, timeout: 30000 });
 *
 * const result = await breaker.execute(async () => {
 *   return await fetch('/api/payment');
 * });
 * ```
 */

import { getLogger } from './logger';

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerConfig {
  /** Number of consecutive failures before opening circuit */
  failureThreshold: number;
  /** Time in ms to wait before attempting recovery (OPEN → HALF_OPEN) */
  timeout: number;
  /** Optional name for logging/debugging */
  name?: string;
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  rejections: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
}

export interface CircuitBreaker {
  /** Execute a function with circuit breaker protection */
  execute: <T>(fn: () => Promise<T>) => Promise<T>;
  /** Get current circuit state */
  getState: () => CircuitState;
  /** Get circuit breaker statistics */
  getStats: () => CircuitBreakerStats;
  /** Manually reset circuit to CLOSED state */
  reset: () => void;
  /** Manually trip circuit to OPEN state */
  trip: () => void;
}

/**
 * Error thrown when circuit breaker is OPEN
 */
export class CircuitBreakerOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}

/**
 * Create a circuit breaker instance
 *
 * @param config - Circuit breaker configuration
 * @returns Circuit breaker instance
 *
 * @example
 * ```typescript
 * const paymentBreaker = createCircuitBreaker({
 *   failureThreshold: 5,
 *   timeout: 30000,
 *   name: 'payment-service',
 * });
 *
 * try {
 *   const result = await paymentBreaker.execute(async () => {
 *     return await createPaymentSession();
 *   });
 * } catch (error) {
 *   if (error instanceof CircuitBreakerOpenError) {
 *     console.error('Payment service is down, please try again later');
 *   }
 * }
 * ```
 */
export function createCircuitBreaker(config: CircuitBreakerConfig): CircuitBreaker {
  const { failureThreshold, timeout, name = 'circuit-breaker' } = config;

  let state: CircuitState = CircuitState.CLOSED;
  let failureCount = 0;
  let successCount = 0;
  let rejectionCount = 0;
  let lastFailureTime: number | null = null;
  let lastSuccessTime: number | null = null;
  let nextAttemptTime: number | null = null;

  /**
   * Check if circuit should transition from OPEN to HALF_OPEN
   */
  function checkStateTransition(): void {
    if (state === CircuitState.OPEN && nextAttemptTime !== null) {
      const now = Date.now();
      if (now >= nextAttemptTime) {
        getLogger().debug(`[CircuitBreaker:${name}] Transitioning OPEN → HALF_OPEN (timeout expired)`);
        state = CircuitState.HALF_OPEN;
        nextAttemptTime = null;
      }
    }
  }

  /**
   * Record a successful execution
   */
  function recordSuccess(): void {
    lastSuccessTime = Date.now();
    successCount++;

    if (state === CircuitState.HALF_OPEN) {
      getLogger().debug(`[CircuitBreaker:${name}] Success in HALF_OPEN → CLOSED`);
      state = CircuitState.CLOSED;
      failureCount = 0;
    } else if (state === CircuitState.CLOSED) {
      // Reset failure count on success
      failureCount = 0;
    }
  }

  /**
   * Record a failed execution
   */
  function recordFailure(error: Error): void {
    lastFailureTime = Date.now();
    failureCount++;

    getLogger().warn(`[CircuitBreaker:${name}] Failure recorded (${failureCount}/${failureThreshold}):`, error.message);

    if (state === CircuitState.HALF_OPEN) {
      // Failed during recovery attempt → back to OPEN
      getLogger().warn(`[CircuitBreaker:${name}] Failed in HALF_OPEN → OPEN`);
      state = CircuitState.OPEN;
      nextAttemptTime = Date.now() + timeout;
    } else if (state === CircuitState.CLOSED && failureCount >= failureThreshold) {
      // Hit failure threshold → OPEN
      getLogger().error(`[CircuitBreaker:${name}] Failure threshold reached (${failureCount}) → OPEN`);
      state = CircuitState.OPEN;
      nextAttemptTime = Date.now() + timeout;
    }
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async function execute<T>(fn: () => Promise<T>): Promise<T> {
    checkStateTransition();

    if (state === CircuitState.OPEN) {
      rejectionCount++;
      const waitTime = nextAttemptTime ? Math.ceil((nextAttemptTime - Date.now()) / 1000) : 0;
      throw new CircuitBreakerOpenError(
        `Circuit breaker is OPEN. Service is unavailable. Retry in ${waitTime}s.`
      );
    }

    try {
      const result = await fn();
      recordSuccess();
      return result;
    } catch (error) {
      recordFailure(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get current circuit state
   */
  function getState(): CircuitState {
    checkStateTransition();
    return state;
  }

  /**
   * Get circuit breaker statistics
   */
  function getStats(): CircuitBreakerStats {
    checkStateTransition();
    return {
      state,
      failures: failureCount,
      successes: successCount,
      rejections: rejectionCount,
      lastFailureTime,
      lastSuccessTime,
    };
  }

  /**
   * Manually reset circuit to CLOSED state
   */
  function reset(): void {
    getLogger().debug(`[CircuitBreaker:${name}] Manual reset → CLOSED`);
    state = CircuitState.CLOSED;
    failureCount = 0;
    successCount = 0;
    rejectionCount = 0;
    lastFailureTime = null;
    lastSuccessTime = null;
    nextAttemptTime = null;
  }

  /**
   * Manually trip circuit to OPEN state
   */
  function trip(): void {
    getLogger().warn(`[CircuitBreaker:${name}] Manual trip → OPEN`);
    state = CircuitState.OPEN;
    nextAttemptTime = Date.now() + timeout;
  }

  return {
    execute,
    getState,
    getStats,
    reset,
    trip,
  };
}

/**
 * Preset circuit breaker configurations
 */
export const CIRCUIT_BREAKER_PRESETS = {
  /** Strict: Opens quickly (3 failures), long timeout (60s) */
  STRICT: { failureThreshold: 3, timeout: 60000 },
  /** Standard: Balanced settings (5 failures, 30s timeout) */
  STANDARD: { failureThreshold: 5, timeout: 30000 },
  /** Lenient: Tolerates more failures (10 failures, 15s timeout) */
  LENIENT: { failureThreshold: 10, timeout: 15000 },
} as const;
