"use strict";
/**
 * Shared resilience helpers for payment managers.
 *
 * Centralizes the user-facing error strings and the circuit-breaker catch
 * pattern that the managers (Stripe, Credits, X402, Subscription, Wallet)
 * would otherwise repeat. The wording is a behavioral contract — callers and
 * tests assert the exact text, so these helpers must produce byte-identical
 * messages to the original inline literals.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.serviceUnavailableMessage = serviceUnavailableMessage;
exports.rateLimitExceededMessage = rateLimitExceededMessage;
exports.withCircuitBreaker = withCircuitBreaker;
const circuitBreaker_1 = require("../utils/circuitBreaker");
/**
 * Standard "service unavailable" message shown when the circuit breaker is OPEN.
 *
 * @param service - Human-readable service label (e.g. `'Credits service'`).
 * @returns Exactly `` `${service} is temporarily unavailable. Please try again in a few moments.` ``
 */
function serviceUnavailableMessage(service) {
    return `${service} is temporarily unavailable. Please try again in a few moments.`;
}
/**
 * Standard "rate limit exceeded" message shown when a rate limiter rejects a request.
 *
 * @param action - Human-readable action label (e.g. `'credits quote'`).
 * @returns Exactly `` `Rate limit exceeded for ${action}. Please try again later.` ``
 */
function rateLimitExceededMessage(action) {
    return `Rate limit exceeded for ${action}. Please try again later.`;
}
/**
 * Run a function through the circuit breaker, translating an OPEN circuit into
 * the standard service-unavailable error.
 *
 * Use only where a method's catch is exactly the throw-style boilerplate (no
 * extra logging, rethrow on non-breaker errors). Methods that log before
 * throwing, return a result object, or rethrow a transformed error must keep
 * their own control flow and use {@link serviceUnavailableMessage} directly.
 *
 * @param breaker - Circuit breaker instance protecting the call.
 * @param service - Human-readable service label for the unavailable message.
 * @param fn - The async operation to execute under the breaker.
 * @returns The resolved value of `fn`.
 * @throws Error with {@link serviceUnavailableMessage} when the circuit is OPEN.
 * @throws The original error for any other failure.
 */
async function withCircuitBreaker(breaker, service, fn) {
    try {
        return await breaker.execute(fn);
    }
    catch (error) {
        if (error instanceof circuitBreaker_1.CircuitBreakerOpenError) {
            throw new Error(serviceUnavailableMessage(service));
        }
        throw error;
    }
}
//# sourceMappingURL=resilience.js.map