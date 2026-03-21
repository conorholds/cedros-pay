"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CIRCUIT_BREAKER_PRESETS = exports.CircuitBreakerOpenError = exports.CircuitState = void 0;
exports.createCircuitBreaker = createCircuitBreaker;
const logger_1 = require("./logger");
var CircuitState;
(function (CircuitState) {
    CircuitState["CLOSED"] = "CLOSED";
    CircuitState["OPEN"] = "OPEN";
    CircuitState["HALF_OPEN"] = "HALF_OPEN";
})(CircuitState || (exports.CircuitState = CircuitState = {}));
/**
 * Error thrown when circuit breaker is OPEN
 */
class CircuitBreakerOpenError extends Error {
    constructor(message) {
        super(message);
        this.name = 'CircuitBreakerOpenError';
    }
}
exports.CircuitBreakerOpenError = CircuitBreakerOpenError;
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
function createCircuitBreaker(config) {
    const { failureThreshold, timeout, name = 'circuit-breaker' } = config;
    let state = CircuitState.CLOSED;
    let failureCount = 0;
    let successCount = 0;
    let rejectionCount = 0;
    let lastFailureTime = null;
    let lastSuccessTime = null;
    let nextAttemptTime = null;
    /**
     * Check if circuit should transition from OPEN to HALF_OPEN
     */
    function checkStateTransition() {
        if (state === CircuitState.OPEN && nextAttemptTime !== null) {
            const now = Date.now();
            if (now >= nextAttemptTime) {
                (0, logger_1.getLogger)().debug(`[CircuitBreaker:${name}] Transitioning OPEN → HALF_OPEN (timeout expired)`);
                state = CircuitState.HALF_OPEN;
                nextAttemptTime = null;
            }
        }
    }
    /**
     * Record a successful execution
     */
    function recordSuccess() {
        lastSuccessTime = Date.now();
        successCount++;
        if (state === CircuitState.HALF_OPEN) {
            (0, logger_1.getLogger)().debug(`[CircuitBreaker:${name}] Success in HALF_OPEN → CLOSED`);
            state = CircuitState.CLOSED;
            failureCount = 0;
        }
        else if (state === CircuitState.CLOSED) {
            // Reset failure count on success
            failureCount = 0;
        }
    }
    /**
     * Record a failed execution
     */
    function recordFailure(error) {
        lastFailureTime = Date.now();
        failureCount++;
        (0, logger_1.getLogger)().warn(`[CircuitBreaker:${name}] Failure recorded (${failureCount}/${failureThreshold}):`, error.message);
        if (state === CircuitState.HALF_OPEN) {
            // Failed during recovery attempt → back to OPEN
            (0, logger_1.getLogger)().warn(`[CircuitBreaker:${name}] Failed in HALF_OPEN → OPEN`);
            state = CircuitState.OPEN;
            nextAttemptTime = Date.now() + timeout;
        }
        else if (state === CircuitState.CLOSED && failureCount >= failureThreshold) {
            // Hit failure threshold → OPEN
            (0, logger_1.getLogger)().error(`[CircuitBreaker:${name}] Failure threshold reached (${failureCount}) → OPEN`);
            state = CircuitState.OPEN;
            nextAttemptTime = Date.now() + timeout;
        }
    }
    /**
     * Execute a function with circuit breaker protection
     */
    async function execute(fn) {
        checkStateTransition();
        if (state === CircuitState.OPEN) {
            rejectionCount++;
            const waitTime = nextAttemptTime ? Math.ceil((nextAttemptTime - Date.now()) / 1000) : 0;
            throw new CircuitBreakerOpenError(`Circuit breaker is OPEN. Service is unavailable. Retry in ${waitTime}s.`);
        }
        try {
            const result = await fn();
            recordSuccess();
            return result;
        }
        catch (error) {
            recordFailure(error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    /**
     * Get current circuit state
     */
    function getState() {
        checkStateTransition();
        return state;
    }
    /**
     * Get circuit breaker statistics
     */
    function getStats() {
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
    function reset() {
        (0, logger_1.getLogger)().debug(`[CircuitBreaker:${name}] Manual reset → CLOSED`);
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
    function trip() {
        (0, logger_1.getLogger)().warn(`[CircuitBreaker:${name}] Manual trip → OPEN`);
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
exports.CIRCUIT_BREAKER_PRESETS = {
    /** Strict: Opens quickly (3 failures), long timeout (60s) */
    STRICT: { failureThreshold: 3, timeout: 60000 },
    /** Standard: Balanced settings (5 failures, 30s timeout) */
    STANDARD: { failureThreshold: 5, timeout: 30000 },
    /** Lenient: Tolerates more failures (10 failures, 15s timeout) */
    LENIENT: { failureThreshold: 10, timeout: 15000 },
};
//# sourceMappingURL=circuitBreaker.js.map