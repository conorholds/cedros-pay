"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreditsManager = void 0;
const logger_1 = require("../utils/logger");
const errorHandling_1 = require("../utils/errorHandling");
const fetchWithTimeout_1 = require("../utils/fetchWithTimeout");
const uuid_1 = require("../utils/uuid");
const rateLimiter_1 = require("../utils/rateLimiter");
const circuitBreaker_1 = require("../utils/circuitBreaker");
const exponentialBackoff_1 = require("../utils/exponentialBackoff");
/**
 * Internal implementation of Credits payment management.
 *
 * @internal
 * **DO NOT USE THIS CLASS DIRECTLY**
 *
 * This concrete class is not part of the stable API and may change without notice.
 * Use the ICreditsManager interface via useCedrosContext() instead.
 *
 * @see {@link ICreditsManager} for the stable interface
 */
class CreditsManager {
    constructor(routeDiscovery) {
        this.rateLimiter = (0, rateLimiter_1.createRateLimiter)(rateLimiter_1.RATE_LIMITER_PRESETS.PAYMENT);
        this.circuitBreaker = (0, circuitBreaker_1.createCircuitBreaker)({
            failureThreshold: 5,
            timeout: 10000,
            name: 'credits-manager',
        });
        this.routeDiscovery = routeDiscovery;
    }
    async requestQuote(resource, couponCode) {
        if (!this.rateLimiter.tryConsume()) {
            throw new Error('Rate limit exceeded for credits quote. Please try again later.');
        }
        try {
            return await this.circuitBreaker.execute(async () => {
                return await (0, exponentialBackoff_1.retryWithBackoff)(async () => {
                    const url = await this.routeDiscovery.buildUrl('/paywall/v1/quote');
                    (0, logger_1.getLogger)().debug('[CreditsManager] Requesting quote for resource:', resource);
                    const response = await (0, fetchWithTimeout_1.fetchWithTimeout)(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ resource, couponCode }),
                    });
                    // 402 is expected - it contains the quote
                    if (response.status === 402) {
                        const data = await response.json();
                        // Return credits requirement if available
                        return data.credits || null;
                    }
                    if (!response.ok) {
                        const errorMessage = await (0, errorHandling_1.parseErrorResponse)(response, 'Failed to get credits quote');
                        throw new Error(errorMessage);
                    }
                    // 200 means resource is free or already accessible
                    return null;
                }, { ...exponentialBackoff_1.RETRY_PRESETS.STANDARD, name: 'credits-quote' });
            });
        }
        catch (error) {
            if (error instanceof circuitBreaker_1.CircuitBreakerOpenError) {
                (0, logger_1.getLogger)().error('[CreditsManager] Circuit breaker is OPEN - credits service unavailable');
                throw new Error('Credits service is temporarily unavailable. Please try again in a few moments.');
            }
            throw error;
        }
    }
    async requestCartQuote(items, couponCode) {
        if (!this.rateLimiter.tryConsume()) {
            throw new Error('Rate limit exceeded for cart credits quote. Please try again later.');
        }
        try {
            return await this.circuitBreaker.execute(async () => {
                return await (0, exponentialBackoff_1.retryWithBackoff)(async () => {
                    const url = await this.routeDiscovery.buildUrl('/paywall/v1/cart/quote');
                    (0, logger_1.getLogger)().debug('[CreditsManager] Requesting cart quote for items:', items.length);
                    const response = await (0, fetchWithTimeout_1.fetchWithTimeout)(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ items, couponCode }),
                    });
                    if (!response.ok) {
                        const errorMessage = await (0, errorHandling_1.parseErrorResponse)(response, 'Failed to get cart credits quote');
                        throw new Error(errorMessage);
                    }
                    const data = await response.json();
                    if (!data.credits) {
                        return null;
                    }
                    return {
                        cartId: data.cartId,
                        credits: data.credits,
                    };
                }, { ...exponentialBackoff_1.RETRY_PRESETS.STANDARD, name: 'credits-cart-quote' });
            });
        }
        catch (error) {
            if (error instanceof circuitBreaker_1.CircuitBreakerOpenError) {
                throw new Error('Credits service is temporarily unavailable. Please try again in a few moments.');
            }
            throw error;
        }
    }
    /**
     * Create a hold on user's credits
     * Requires Authorization header with cedros-login JWT token
     */
    async createHold(options) {
        const { resource, couponCode, authToken } = options;
        if (!this.rateLimiter.tryConsume()) {
            throw new Error('Rate limit exceeded for credits hold. Please try again later.');
        }
        try {
            return await this.circuitBreaker.execute(async () => {
                return await (0, exponentialBackoff_1.retryWithBackoff)(async () => {
                    const url = await this.routeDiscovery.buildUrl('/paywall/v1/credits/hold');
                    (0, logger_1.getLogger)().debug('[CreditsManager] Creating hold for resource:', resource);
                    const response = await (0, fetchWithTimeout_1.fetchWithTimeout)(url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${authToken}`,
                            'Idempotency-Key': (0, uuid_1.generateUUID)(),
                        },
                        body: JSON.stringify({ resource, couponCode }),
                    });
                    if (!response.ok) {
                        const errorMessage = await (0, errorHandling_1.parseErrorResponse)(response, 'Failed to create credits hold');
                        throw new Error(errorMessage);
                    }
                    return await response.json();
                }, { ...exponentialBackoff_1.RETRY_PRESETS.STANDARD, name: 'credits-create-hold' });
            });
        }
        catch (error) {
            if (error instanceof circuitBreaker_1.CircuitBreakerOpenError) {
                throw new Error('Credits service is temporarily unavailable. Please try again in a few moments.');
            }
            throw error;
        }
    }
    /**
     * Create a hold on user's credits for a cart
     * Requires Authorization header with cedros-login JWT token
     */
    async createCartHold(options) {
        const { cartId, authToken } = options;
        if (!this.rateLimiter.tryConsume()) {
            throw new Error('Rate limit exceeded for cart credits hold. Please try again later.');
        }
        try {
            return await this.circuitBreaker.execute(async () => {
                return await (0, exponentialBackoff_1.retryWithBackoff)(async () => {
                    const url = await this.routeDiscovery.buildUrl(`/paywall/v1/cart/${cartId}/credits/hold`);
                    (0, logger_1.getLogger)().debug('[CreditsManager] Creating cart hold for cart:', cartId);
                    const response = await (0, fetchWithTimeout_1.fetchWithTimeout)(url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${authToken}`,
                            'Idempotency-Key': (0, uuid_1.generateUUID)(),
                        },
                        body: JSON.stringify({}),
                    });
                    if (!response.ok) {
                        const errorMessage = await (0, errorHandling_1.parseErrorResponse)(response, 'Failed to create cart credits hold');
                        throw new Error(errorMessage);
                    }
                    return await response.json();
                }, { ...exponentialBackoff_1.RETRY_PRESETS.STANDARD, name: 'credits-create-cart-hold' });
            });
        }
        catch (error) {
            if (error instanceof circuitBreaker_1.CircuitBreakerOpenError) {
                throw new Error('Credits service is temporarily unavailable. Please try again in a few moments.');
            }
            throw error;
        }
    }
    async authorizePayment(options) {
        const { resource, holdId, couponCode, authToken, metadata } = options;
        if (!this.rateLimiter.tryConsume()) {
            return {
                success: false,
                error: 'Rate limit exceeded for credits authorization. Please try again later.',
                errorCode: 'rate_limit_exceeded',
            };
        }
        try {
            return await this.circuitBreaker.execute(async () => {
                return await (0, exponentialBackoff_1.retryWithBackoff)(async () => {
                    // Dedicated credits authorize endpoint
                    const url = await this.routeDiscovery.buildUrl('/paywall/v1/credits/authorize');
                    (0, logger_1.getLogger)().debug('[CreditsManager] Authorizing payment for resource:', resource);
                    const response = await (0, fetchWithTimeout_1.fetchWithTimeout)(url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${authToken}`,
                            'Idempotency-Key': (0, uuid_1.generateUUID)(),
                        },
                        body: JSON.stringify({
                            resource,
                            holdId,
                            couponCode,
                            ...metadata && { metadata },
                        }),
                    });
                    if (!response.ok) {
                        const data = await response.json().catch(() => ({}));
                        return {
                            success: false,
                            error: data.error?.message || 'Credits authorization failed',
                            errorCode: data.error?.code || 'authorization_failed',
                        };
                    }
                    const data = await response.json();
                    return {
                        success: true,
                        transactionId: data.transactionId,
                    };
                }, { ...exponentialBackoff_1.RETRY_PRESETS.STANDARD, name: 'credits-authorize' });
            });
        }
        catch (error) {
            if (error instanceof circuitBreaker_1.CircuitBreakerOpenError) {
                return {
                    success: false,
                    error: 'Credits service is temporarily unavailable. Please try again in a few moments.',
                    errorCode: 'service_unavailable',
                };
            }
            return {
                success: false,
                error: (0, errorHandling_1.formatError)(error, 'Credits authorization failed'),
                errorCode: 'authorization_failed',
            };
        }
    }
    async authorizeCartPayment(options) {
        const { cartId, holdId, authToken, metadata } = options;
        if (!this.rateLimiter.tryConsume()) {
            return {
                success: false,
                error: 'Rate limit exceeded for cart credits authorization. Please try again later.',
                errorCode: 'rate_limit_exceeded',
            };
        }
        try {
            return await this.circuitBreaker.execute(async () => {
                return await (0, exponentialBackoff_1.retryWithBackoff)(async () => {
                    // Dedicated cart credits authorize endpoint
                    const url = await this.routeDiscovery.buildUrl(`/paywall/v1/cart/${cartId}/credits/authorize`);
                    (0, logger_1.getLogger)().debug('[CreditsManager] Authorizing cart payment for cart:', cartId);
                    const response = await (0, fetchWithTimeout_1.fetchWithTimeout)(url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${authToken}`,
                            'Idempotency-Key': (0, uuid_1.generateUUID)(),
                        },
                        body: JSON.stringify({
                            holdId,
                            ...metadata && { metadata },
                        }),
                    });
                    if (!response.ok) {
                        const data = await response.json().catch((parseError) => {
                            (0, logger_1.getLogger)().error('[CreditsManager] Failed to parse error response JSON:', parseError, {
                                cartId,
                                status: response.status,
                                statusText: response.statusText,
                            });
                            return {};
                        });
                        return {
                            success: false,
                            error: data.error?.message || 'Cart credits authorization failed',
                            errorCode: data.error?.code || 'authorization_failed',
                        };
                    }
                    const data = await response.json();
                    return {
                        success: true,
                        transactionId: data.transactionId,
                    };
                }, { ...exponentialBackoff_1.RETRY_PRESETS.STANDARD, name: 'credits-cart-authorize' });
            });
        }
        catch (error) {
            if (error instanceof circuitBreaker_1.CircuitBreakerOpenError) {
                return {
                    success: false,
                    error: 'Credits service is temporarily unavailable. Please try again in a few moments.',
                    errorCode: 'service_unavailable',
                };
            }
            return {
                success: false,
                error: (0, errorHandling_1.formatError)(error, 'Cart credits authorization failed'),
                errorCode: 'authorization_failed',
            };
        }
    }
    async releaseHold(holdId, authToken) {
        if (!holdId)
            return;
        try {
            await this.circuitBreaker.execute(async () => {
                const url = await this.routeDiscovery.buildUrl(`/paywall/v1/credits/hold/${holdId}/release`);
                const response = await (0, fetchWithTimeout_1.fetchWithTimeout)(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Idempotency-Key': (0, uuid_1.generateUUID)(),
                    },
                });
                if (!response.ok) {
                    const errorMessage = await (0, errorHandling_1.parseErrorResponse)(response, 'Failed to release credits hold');
                    throw new Error(errorMessage);
                }
            });
        }
        catch (error) {
            if (error instanceof circuitBreaker_1.CircuitBreakerOpenError) {
                throw new Error('Credits service is temporarily unavailable. Please try again in a few moments.');
            }
            throw error;
        }
    }
    /**
     * Process a complete credits payment (convenience method)
     * Combines createHold + authorizePayment in one call
     *
     * @param resource - Resource being purchased
     * @param authToken - JWT token from cedros-login
     * @param couponCode - Optional coupon code
     * @param metadata - Optional metadata
     */
    async processPayment(resource, authToken, couponCode, metadata) {
        let holdId = null;
        try {
            // Step 1: Create hold
            const hold = await this.createHold({ resource, couponCode, authToken });
            holdId = hold.holdId;
            // Step 2: Authorize payment
            const result = await this.authorizePayment({
                resource,
                holdId,
                couponCode,
                authToken,
                metadata,
            });
            return {
                success: result.success,
                transactionId: result.transactionId,
                error: result.error,
            };
        }
        catch (error) {
            if (holdId) {
                try {
                    await this.releaseHold(holdId, authToken);
                }
                catch (releaseError) {
                    (0, logger_1.getLogger)().warn('[CreditsManager] Failed to release hold after payment failure:', releaseError);
                }
            }
            return {
                success: false,
                error: (0, errorHandling_1.formatError)(error, 'Credits payment failed'),
            };
        }
    }
}
exports.CreditsManager = CreditsManager;
//# sourceMappingURL=CreditsManager.js.map