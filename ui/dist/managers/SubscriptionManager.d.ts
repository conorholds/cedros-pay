import { PaymentResult, SubscriptionSessionRequest, SubscriptionSessionResponse, SubscriptionStatusRequest, SubscriptionStatusResponse, SubscriptionQuote, BillingInterval, ActivateX402SubscriptionRequest, ActivateX402SubscriptionResponse } from '../types';
import { RouteDiscoveryManager } from './RouteDiscoveryManager';
/**
 * Options for requesting a subscription quote (x402)
 */
export interface SubscriptionQuoteOptions {
    /** Coupon code for discount */
    couponCode?: string;
    /** Custom interval in days (for 'custom' interval) */
    intervalDays?: number;
}
/**
 * Public interface for subscription management.
 *
 * Use this interface for type annotations instead of the concrete SubscriptionManager class.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { subscriptionManager } = useCedrosContext();
 *   await subscriptionManager.processSubscription({
 *     resource: 'plan-pro',
 *     interval: 'monthly',
 *   });
 * }
 * ```
 */
export interface ISubscriptionManager {
    /**
     * Initialize Stripe.js library (for redirect flow)
     */
    initialize(): Promise<void>;
    /**
     * Create a Stripe subscription checkout session
     */
    createSubscriptionSession(request: SubscriptionSessionRequest): Promise<SubscriptionSessionResponse>;
    /**
     * Redirect to Stripe checkout page
     */
    redirectToCheckout(sessionId: string): Promise<PaymentResult>;
    /**
     * Complete subscription flow: create session and redirect (Stripe)
     */
    processSubscription(request: SubscriptionSessionRequest): Promise<PaymentResult>;
    /**
     * Check subscription status (for x402 gating)
     */
    checkSubscriptionStatus(request: SubscriptionStatusRequest): Promise<SubscriptionStatusResponse>;
    /**
     * Request a subscription quote for x402 crypto payment
     */
    requestSubscriptionQuote(resource: string, interval: BillingInterval, options?: SubscriptionQuoteOptions): Promise<SubscriptionQuote>;
    /**
     * Activate x402 subscription after payment verification
     */
    activateX402Subscription(request: ActivateX402SubscriptionRequest): Promise<ActivateX402SubscriptionResponse>;
}
/**
 * Internal implementation of subscription management.
 *
 * @internal
 * **DO NOT USE THIS CLASS DIRECTLY**
 *
 * @see {@link ISubscriptionManager} for the stable interface
 */
export declare class SubscriptionManager implements ISubscriptionManager {
    private stripe;
    private initPromise;
    private readonly publicKey;
    private readonly routeDiscovery;
    private readonly sessionRateLimiter;
    private readonly statusRateLimiter;
    private readonly circuitBreaker;
    constructor(publicKey: string, routeDiscovery: RouteDiscoveryManager);
    /**
     * Initialize Stripe.js library
     *
     * Concurrent callers share a single loadStripe() call via a cached promise.
     */
    initialize(): Promise<void>;
    /** Internal helper: execute with rate limiting, circuit breaker, and retry */
    private executeWithResilience;
    /**
     * Create a Stripe subscription checkout session
     */
    createSubscriptionSession(request: SubscriptionSessionRequest): Promise<SubscriptionSessionResponse>;
    /**
     * Redirect to Stripe checkout
     */
    redirectToCheckout(sessionId: string): Promise<PaymentResult>;
    /**
     * Complete subscription flow: create session and redirect
     */
    processSubscription(request: SubscriptionSessionRequest): Promise<PaymentResult>;
    /**
     * Check subscription status (for x402 gating)
     */
    checkSubscriptionStatus(request: SubscriptionStatusRequest): Promise<SubscriptionStatusResponse>;
    /**
     * Request a subscription quote for x402 crypto payment
     */
    requestSubscriptionQuote(resource: string, interval: BillingInterval, options?: SubscriptionQuoteOptions): Promise<SubscriptionQuote>;
    /** Activate x402 subscription after payment verification */
    activateX402Subscription(request: ActivateX402SubscriptionRequest): Promise<ActivateX402SubscriptionResponse>;
}
//# sourceMappingURL=SubscriptionManager.d.ts.map