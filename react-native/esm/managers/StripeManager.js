import { initStripe, presentPaymentSheet, initPaymentSheet, StripeProvider, useStripe, } from '@stripe/stripe-react-native';
import { generateUUID } from '../utils/uuid';
import { getLogger } from '../utils/logger';
import { formatError, parseErrorResponse } from '../utils/errorHandling';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';
import { createRateLimiter, RATE_LIMITER_PRESETS } from '../utils/rateLimiter';
import { createCircuitBreaker, CircuitBreakerOpenError } from '../utils/circuitBreaker';
import { retryWithBackoff, RETRY_PRESETS } from '../utils/exponentialBackoff';
/**
 * Internal implementation of Stripe payment management for React Native.
 *
 * @internal
 * **DO NOT USE THIS CLASS DIRECTLY**
 *
 * This concrete class is not part of the stable API and may change without notice.
 * Constructor signatures, method signatures, and internal implementation details
 * are subject to change in any release (including patch releases).
 *
 * **Correct Usage:**
 * ```typescript
 * import { useCedrosContext } from '@cedros/pay-react-native';
 *
 * function MyComponent() {
 *   const { stripeManager } = useCedrosContext();
 *   // stripeManager is typed as IStripeManager (stable interface)
 *   await stripeManager.processPayment({ ... });
 * }
 * ```
 *
 * **Incorrect Usage (WILL BREAK):**
 * ```typescript
 * import { StripeManager } from '@cedros/pay-react-native'; // ❌ Not exported
 * const manager = new StripeManager(...); // ❌ Unsupported
 * ```
 *
 * @see {@link IStripeManager} for the stable interface
 * @see API_STABILITY.md for our API stability policy
 */
export class StripeManager {
    constructor(publicKey, routeDiscovery) {
        this.isStripeInitialized = false;
        this.rateLimiter = createRateLimiter(RATE_LIMITER_PRESETS.PAYMENT);
        this.circuitBreaker = createCircuitBreaker({
            failureThreshold: 5,
            timeout: 10000, // 10 seconds for faster recovery in payment flows
            name: 'stripe-manager',
        });
        this.publicKey = publicKey;
        this.routeDiscovery = routeDiscovery;
    }
    /**
     * Initialize Stripe React Native SDK
     */
    async initialize() {
        if (this.isStripeInitialized) {
            return;
        }
        await initStripe({
            publishableKey: this.publicKey,
        });
        this.isStripeInitialized = true;
        getLogger().debug('[StripeManager] Stripe React Native SDK initialized');
    }
    /**
     * Check if Stripe is initialized
     */
    isInitialized() {
        return this.isStripeInitialized;
    }
    /**
     * Create a Stripe checkout session
     */
    async createSession(request) {
        // Rate limiting check
        if (!this.rateLimiter.tryConsume()) {
            throw new Error('Rate limit exceeded for Stripe session creation. Please try again later.');
        }
        // Circuit breaker + retry logic
        try {
            return await this.circuitBreaker.execute(async () => {
                return await retryWithBackoff(async () => {
                    const url = await this.routeDiscovery.buildUrl('/paywall/v1/stripe-session');
                    getLogger().debug('[StripeManager] Creating session with request:', request);
                    if (request.couponCode) {
                        getLogger().debug('[StripeManager] Coupon code included:', request.couponCode);
                    }
                    else {
                        getLogger().debug('[StripeManager] No coupon code in request');
                    }
                    const response = await fetchWithTimeout(url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Idempotency-Key': generateUUID(),
                        },
                        body: JSON.stringify(request),
                    });
                    if (!response.ok) {
                        const errorMessage = await parseErrorResponse(response, 'Failed to create Stripe session');
                        throw new Error(errorMessage);
                    }
                    return await response.json();
                }, { ...RETRY_PRESETS.STANDARD, name: 'stripe-create-session' });
            });
        }
        catch (error) {
            if (error instanceof CircuitBreakerOpenError) {
                getLogger().error('[StripeManager] Circuit breaker is OPEN - Stripe service unavailable');
                throw new Error('Stripe payment service is temporarily unavailable. Please try again in a few moments.');
            }
            throw error;
        }
    }
    /**
     * Initialize and present payment sheet
     */
    async presentPayment(options) {
        if (!this.isStripeInitialized) {
            await this.initialize();
        }
        try {
            // Initialize payment sheet
            const sheetConfig = {
                paymentIntentClientSecret: options.paymentIntentClientSecret,
                setupIntentClientSecret: options.setupIntentClientSecret,
                customerId: options.customerId,
                allowsDelayedPaymentMethods: true,
            };
            if (options.customerEphemeralKeySecret) {
                sheetConfig.customerEphemeralKeySecret = options.customerEphemeralKeySecret;
            }
            const { error: initError } = await initPaymentSheet(sheetConfig);
            if (initError) {
                getLogger().error('[StripeManager] Payment sheet initialization failed:', initError);
                return {
                    success: false,
                    error: initError.message,
                };
            }
            // Present payment sheet
            const { error: presentError } = await presentPaymentSheet();
            if (presentError) {
                if (presentError.code === 'Canceled') {
                    // User canceled the payment
                    return {
                        success: false,
                        error: 'Payment canceled by user',
                    };
                }
                getLogger().error('[StripeManager] Payment presentation failed:', presentError);
                return {
                    success: false,
                    error: presentError.message,
                };
            }
            // Payment completed successfully
            return {
                success: true,
                transactionId: options.paymentIntentClientSecret?.split('_secret_')[0],
            };
        }
        catch (error) {
            getLogger().error('[StripeManager] Payment sheet error:', error);
            return {
                success: false,
                error: formatError(error, 'Payment sheet failed'),
            };
        }
    }
    /**
     * Handle complete payment flow: create session and present payment sheet
     * Note: For React Native, the backend needs to provide a PaymentIntent client secret
     * instead of a Checkout Session.
     */
    async processPayment(request) {
        try {
            // Create session - backend should return payment intent info for mobile
            const session = await this.createSession(request);
            // For React Native, we expect the backend to return payment intent details
            // The session response should include paymentIntentClientSecret
            if ('paymentIntentClientSecret' in session && session.paymentIntentClientSecret) {
                return await this.presentPayment({
                    paymentIntentClientSecret: session.paymentIntentClientSecret,
                    customerId: session.customerId,
                    customerEphemeralKeySecret: session.customerEphemeralKeySecret,
                });
            }
            // Fallback: if backend only provides sessionId (web-style), log warning
            // This would require backend changes to support mobile properly
            getLogger().warn('[StripeManager] Backend returned sessionId but React Native requires PaymentIntent client secret. ' +
                'Please update backend to return paymentIntentClientSecret for mobile flows.');
            return {
                success: false,
                error: 'Mobile payments require PaymentIntent client secret. Please contact support.',
            };
        }
        catch (error) {
            return {
                success: false,
                error: formatError(error, 'Unknown error'),
            };
        }
    }
    /**
     * Create a Stripe cart checkout session for multiple items
     */
    async processCartCheckout(options) {
        const { items, successUrl, cancelUrl, metadata, customerEmail, couponCode } = options;
        // Rate limiting check
        if (!this.rateLimiter.tryConsume()) {
            return {
                success: false,
                error: 'Rate limit exceeded for cart checkout. Please try again later.',
            };
        }
        try {
            const session = await this.circuitBreaker.execute(async () => {
                return await retryWithBackoff(async () => {
                    const url = await this.routeDiscovery.buildUrl('/paywall/v1/cart/checkout');
                    // Rust server uses 'coupon', Go server used 'couponCode'
                    // Send both for backwards compatibility during migration
                    const cartRequest = {
                        items,
                        successUrl,
                        cancelUrl,
                        metadata,
                        customerEmail,
                        coupon: couponCode, // New Rust server field
                        couponCode, // Legacy Go server field (backwards compat)
                    };
                    const response = await fetchWithTimeout(url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Idempotency-Key': generateUUID(),
                        },
                        body: JSON.stringify(cartRequest),
                    });
                    if (!response.ok) {
                        const errorMessage = await parseErrorResponse(response, 'Failed to create cart checkout session');
                        throw new Error(errorMessage);
                    }
                    return await response.json();
                }, { ...RETRY_PRESETS.STANDARD, name: 'stripe-cart-checkout' });
            });
            // For React Native, use PaymentSheet instead of redirect
            if (session.paymentIntentClientSecret) {
                return await this.presentPayment({
                    paymentIntentClientSecret: session.paymentIntentClientSecret,
                    customerId: session.customerId,
                    customerEphemeralKeySecret: session.customerEphemeralKeySecret,
                });
            }
            getLogger().warn('[StripeManager] Cart checkout returned sessionId but React Native requires PaymentIntent client secret. ' +
                'Please update backend to return paymentIntentClientSecret for mobile flows.');
            return {
                success: false,
                error: 'Mobile cart checkout requires PaymentIntent client secret. Please contact support.',
            };
        }
        catch (error) {
            if (error instanceof CircuitBreakerOpenError) {
                return {
                    success: false,
                    error: 'Stripe payment service is temporarily unavailable. Please try again in a few moments.',
                };
            }
            return {
                success: false,
                error: formatError(error, 'Cart checkout failed'),
            };
        }
    }
}
// Re-export StripeProvider for use in app setup
export { StripeProvider, useStripe };
//# sourceMappingURL=StripeManager.js.map