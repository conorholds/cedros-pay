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
export declare enum CircuitState {
    CLOSED = "CLOSED",
    OPEN = "OPEN",
    HALF_OPEN = "HALF_OPEN"
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
export declare class CircuitBreakerOpenError extends Error {
    constructor(message: string);
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
export declare function createCircuitBreaker(config: CircuitBreakerConfig): CircuitBreaker;
/**
 * Preset circuit breaker configurations
 */
export declare const CIRCUIT_BREAKER_PRESETS: {
    /** Strict: Opens quickly (3 failures), long timeout (60s) */
    readonly STRICT: {
        readonly failureThreshold: 3;
        readonly timeout: 60000;
    };
    /** Standard: Balanced settings (5 failures, 30s timeout) */
    readonly STANDARD: {
        readonly failureThreshold: 5;
        readonly timeout: 30000;
    };
    /** Lenient: Tolerates more failures (10 failures, 15s timeout) */
    readonly LENIENT: {
        readonly failureThreshold: 10;
        readonly timeout: 15000;
    };
};
//# sourceMappingURL=circuitBreaker.d.ts.map