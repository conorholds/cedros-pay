"use strict";
/**
 * Subscription Manager
 *
 * Handles subscription-related operations for both Stripe and x402 crypto subscriptions.
 * Follows the same patterns as StripeManager for consistency.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionManager = void 0;
const stripe_react_native_1 = require("@stripe/stripe-react-native");
const uuid_1 = require("../utils/uuid");
const logger_1 = require("../utils/logger");
const errorHandling_1 = require("../utils/errorHandling");
const fetchWithTimeout_1 = require("../utils/fetchWithTimeout");
const rateLimiter_1 = require("../utils/rateLimiter");
const circuitBreaker_1 = require("../utils/circuitBreaker");
const exponentialBackoff_1 = require("../utils/exponentialBackoff");
/**
 * Internal implementation of subscription management.
 *
 * @internal
 * **DO NOT USE THIS CLASS DIRECTLY**
 *
 * @see {@link ISubscriptionManager} for the stable interface
 */
class SubscriptionManager {
    constructor(publicKey, routeDiscovery) {
        this.isStripeInitialized = false;
        // Separate rate limiters for different operation types
        this.sessionRateLimiter = (0, rateLimiter_1.createRateLimiter)(rateLimiter_1.RATE_LIMITER_PRESETS.PAYMENT);
        this.statusRateLimiter = (0, rateLimiter_1.createRateLimiter)(rateLimiter_1.RATE_LIMITER_PRESETS.QUOTE);
        this.circuitBreaker = (0, circuitBreaker_1.createCircuitBreaker)({
            failureThreshold: 5,
            timeout: 10000, // 10 seconds for faster recovery
            name: 'subscription-manager',
        });
        this.publicKey = publicKey;
        this.routeDiscovery = routeDiscovery;
    }
    /** Initialize Stripe React Native SDK */
    async initialize() {
        if (this.isStripeInitialized)
            return;
        await (0, stripe_react_native_1.initStripe)({
            publishableKey: this.publicKey,
        });
        this.isStripeInitialized = true;
        (0, logger_1.getLogger)().debug('[SubscriptionManager] Stripe React Native SDK initialized');
    }
    /** Internal helper: execute with rate limiting, circuit breaker, and retry */
    async executeWithResilience(rateLimiter, operation, retryName, errorContext) {
        if (!rateLimiter.tryConsume()) {
            throw new Error(`Rate limit exceeded. Please try again later.`);
        }
        try {
            return await this.circuitBreaker.execute(() => (0, exponentialBackoff_1.retryWithBackoff)(operation, { ...exponentialBackoff_1.RETRY_PRESETS.STANDARD, name: retryName }));
        }
        catch (error) {
            if (error instanceof circuitBreaker_1.CircuitBreakerOpenError) {
                (0, logger_1.getLogger)().error(`[SubscriptionManager] Circuit breaker OPEN for ${errorContext}`);
                throw new Error('Service temporarily unavailable. Please try again in a few moments.');
            }
            throw error;
        }
    }
    /**
     * Create a Stripe subscription checkout session
     */
    async createSubscriptionSession(request) {
        // Rate limiting check
        if (!this.sessionRateLimiter.tryConsume()) {
            throw new Error('Rate limit exceeded for subscription session creation. Please try again later.');
        }
        // Circuit breaker + retry logic
        try {
            return await this.circuitBreaker.execute(async () => {
                return await (0, exponentialBackoff_1.retryWithBackoff)(async () => {
                    const url = await this.routeDiscovery.buildUrl('/paywall/v1/subscription/stripe-session');
                    (0, logger_1.getLogger)().debug('[SubscriptionManager] Creating subscription session:', {
                        resource: request.resource,
                        interval: request.interval,
                        trialDays: request.trialDays,
                    });
                    const response = await (0, fetchWithTimeout_1.fetchWithTimeout)(url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Idempotency-Key': (0, uuid_1.generateUUID)(),
                        },
                        body: JSON.stringify(request),
                    });
                    if (!response.ok) {
                        const errorMessage = await (0, errorHandling_1.parseErrorResponse)(response, 'Failed to create subscription session');
                        throw new Error(errorMessage);
                    }
                    return await response.json();
                }, { ...exponentialBackoff_1.RETRY_PRESETS.STANDARD, name: 'subscription-create-session' });
            });
        }
        catch (error) {
            if (error instanceof circuitBreaker_1.CircuitBreakerOpenError) {
                (0, logger_1.getLogger)().error('[SubscriptionManager] Circuit breaker is OPEN - service unavailable');
                throw new Error('Subscription service is temporarily unavailable. Please try again in a few moments.');
            }
            throw error;
        }
    }
    /**
     * Redirect to Stripe checkout — not supported on React Native.
     * Use processSubscription() instead, which uses the native Payment Sheet.
     */
    async redirectToCheckout(_sessionId) {
        (0, logger_1.getLogger)().warn('[SubscriptionManager] redirectToCheckout is not supported on React Native. ' +
            'Use processSubscription() instead.');
        return {
            success: false,
            error: 'redirectToCheckout is not available on React Native. Use processSubscription() instead.',
        };
    }
    /**
     * Initialize and present the native Payment Sheet for a subscription.
     */
    async presentPayment(options) {
        if (!this.isStripeInitialized) {
            await this.initialize();
        }
        try {
            const sheetConfig = {
                paymentIntentClientSecret: options.paymentIntentClientSecret,
                customerId: options.customerId,
                allowsDelayedPaymentMethods: true,
            };
            if (options.customerEphemeralKeySecret) {
                sheetConfig.customerEphemeralKeySecret = options.customerEphemeralKeySecret;
            }
            const { error: initError } = await (0, stripe_react_native_1.initPaymentSheet)(sheetConfig);
            if (initError) {
                (0, logger_1.getLogger)().error('[SubscriptionManager] Payment sheet initialization failed:', initError);
                return { success: false, error: initError.message };
            }
            const { error: presentError } = await (0, stripe_react_native_1.presentPaymentSheet)();
            if (presentError) {
                if (presentError.code === 'Canceled') {
                    return { success: false, error: 'Payment canceled by user' };
                }
                (0, logger_1.getLogger)().error('[SubscriptionManager] Payment presentation failed:', presentError);
                return { success: false, error: presentError.message };
            }
            return {
                success: true,
                transactionId: options.paymentIntentClientSecret.split('_secret_')[0],
            };
        }
        catch (error) {
            (0, logger_1.getLogger)().error('[SubscriptionManager] Payment sheet error:', error);
            return { success: false, error: (0, errorHandling_1.formatError)(error, 'Payment sheet failed') };
        }
    }
    /**
     * Complete subscription flow: create session and present Payment Sheet.
     * Backend must return paymentIntentClientSecret for React Native flows.
     */
    async processSubscription(request) {
        try {
            const session = await this.createSubscriptionSession(request);
            // For React Native, backend should return payment intent details
            const sessionRecord = session;
            if (sessionRecord.paymentIntentClientSecret) {
                return await this.presentPayment({
                    paymentIntentClientSecret: sessionRecord.paymentIntentClientSecret,
                    customerId: sessionRecord.customerId,
                    customerEphemeralKeySecret: sessionRecord.customerEphemeralKeySecret,
                });
            }
            // Fallback: backend only provides sessionId (web-style)
            (0, logger_1.getLogger)().warn('[SubscriptionManager] Backend returned sessionId but React Native requires ' +
                'PaymentIntent client secret. Please update backend to return ' +
                'paymentIntentClientSecret for mobile subscription flows.');
            return {
                success: false,
                error: 'Mobile subscriptions require PaymentIntent client secret. Please contact support.',
            };
        }
        catch (error) {
            return {
                success: false,
                error: (0, errorHandling_1.formatError)(error, 'Subscription failed'),
            };
        }
    }
    /**
     * Check subscription status (for x402 gating)
     */
    async checkSubscriptionStatus(request) {
        // Rate limiting check
        if (!this.statusRateLimiter.tryConsume()) {
            throw new Error('Rate limit exceeded for subscription status check. Please try again later.');
        }
        try {
            return await this.circuitBreaker.execute(async () => {
                return await (0, exponentialBackoff_1.retryWithBackoff)(async () => {
                    const params = new URLSearchParams({
                        resource: request.resource,
                        userId: request.userId,
                    });
                    const url = await this.routeDiscovery.buildUrl(`/paywall/v1/subscription/status?${params.toString()}`);
                    (0, logger_1.getLogger)().debug('[SubscriptionManager] Checking subscription status:', request);
                    const response = await (0, fetchWithTimeout_1.fetchWithTimeout)(url, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    });
                    if (!response.ok) {
                        const errorMessage = await (0, errorHandling_1.parseErrorResponse)(response, 'Failed to check subscription status');
                        throw new Error(errorMessage);
                    }
                    return await response.json();
                }, { ...exponentialBackoff_1.RETRY_PRESETS.STANDARD, name: 'subscription-status-check' });
            });
        }
        catch (error) {
            if (error instanceof circuitBreaker_1.CircuitBreakerOpenError) {
                (0, logger_1.getLogger)().error('[SubscriptionManager] Circuit breaker is OPEN for status check');
                throw new Error('Subscription status service is temporarily unavailable. Please try again in a few moments.');
            }
            throw error;
        }
    }
    /**
     * Request a subscription quote for x402 crypto payment
     */
    async requestSubscriptionQuote(resource, interval, options) {
        // Rate limiting check (uses quote limiter)
        if (!this.statusRateLimiter.tryConsume()) {
            throw new Error('Rate limit exceeded for subscription quote. Please try again later.');
        }
        try {
            return await this.circuitBreaker.execute(async () => {
                return await (0, exponentialBackoff_1.retryWithBackoff)(async () => {
                    const url = await this.routeDiscovery.buildUrl('/paywall/v1/subscription/quote');
                    const requestBody = {
                        resource,
                        interval,
                        couponCode: options?.couponCode,
                        intervalDays: options?.intervalDays,
                    };
                    (0, logger_1.getLogger)().debug('[SubscriptionManager] Requesting subscription quote:', requestBody);
                    const response = await (0, fetchWithTimeout_1.fetchWithTimeout)(url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(requestBody),
                    });
                    // x402 quotes return 402 status with the quote in the body
                    if (response.status !== 402 && !response.ok) {
                        const errorMessage = await (0, errorHandling_1.parseErrorResponse)(response, 'Failed to get subscription quote');
                        throw new Error(errorMessage);
                    }
                    return await response.json();
                }, { ...exponentialBackoff_1.RETRY_PRESETS.STANDARD, name: 'subscription-quote' });
            });
        }
        catch (error) {
            if (error instanceof circuitBreaker_1.CircuitBreakerOpenError) {
                (0, logger_1.getLogger)().error('[SubscriptionManager] Circuit breaker is OPEN for quote');
                throw new Error('Subscription quote service is temporarily unavailable. Please try again in a few moments.');
            }
            throw error;
        }
    }
    /** Cancel a subscription */
    async cancelSubscription(request) {
        return this.executeWithResilience(this.sessionRateLimiter, async () => {
            const url = await this.routeDiscovery.buildUrl('/paywall/v1/subscription/cancel');
            (0, logger_1.getLogger)().debug('[SubscriptionManager] Canceling subscription:', request);
            const response = await (0, fetchWithTimeout_1.fetchWithTimeout)(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(request),
            });
            if (!response.ok)
                throw new Error(await (0, errorHandling_1.parseErrorResponse)(response, 'Failed to cancel'));
            return await response.json();
        }, 'subscription-cancel', 'cancellation');
    }
    /** Get Stripe billing portal URL for subscription management */
    async getBillingPortalUrl(request) {
        return this.executeWithResilience(this.statusRateLimiter, async () => {
            const url = await this.routeDiscovery.buildUrl('/paywall/v1/subscription/portal');
            (0, logger_1.getLogger)().debug('[SubscriptionManager] Getting billing portal URL:', request);
            const response = await (0, fetchWithTimeout_1.fetchWithTimeout)(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(request),
            });
            if (!response.ok)
                throw new Error(await (0, errorHandling_1.parseErrorResponse)(response, 'Failed to get portal'));
            return await response.json();
        }, 'subscription-portal', 'portal');
    }
    /** Activate x402 subscription after payment verification */
    async activateX402Subscription(request) {
        return this.executeWithResilience(this.sessionRateLimiter, async () => {
            const url = await this.routeDiscovery.buildUrl('/paywall/v1/subscription/x402/activate');
            (0, logger_1.getLogger)().debug('[SubscriptionManager] Activating x402 subscription:', request);
            const response = await (0, fetchWithTimeout_1.fetchWithTimeout)(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(request),
            });
            if (!response.ok)
                throw new Error(await (0, errorHandling_1.parseErrorResponse)(response, 'Failed to activate'));
            return await response.json();
        }, 'subscription-activate', 'activation');
    }
}
exports.SubscriptionManager = SubscriptionManager;
//# sourceMappingURL=SubscriptionManager.js.map