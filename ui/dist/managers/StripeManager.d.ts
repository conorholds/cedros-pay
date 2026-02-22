import { StripeSessionRequest, StripeSessionResponse, PaymentResult } from '../types';
import { RouteDiscoveryManager } from './RouteDiscoveryManager';
import { NormalizedCartItem } from '../utils/cartHelpers';
/**
 * Options for processing a cart checkout
 *
 * All fields beyond `items` are optional and forwarded as-is to the backend
 * cart checkout endpoint. The backend may ignore fields it does not support.
 */
export interface ProcessCartCheckoutOptions {
    items: NormalizedCartItem[];
    successUrl?: string;
    cancelUrl?: string;
    metadata?: Record<string, string>;
    customerEmail?: string;
    customerName?: string;
    customerPhone?: string;
    /** Serialized shipping address forwarded to the backend */
    shippingAddress?: Record<string, string>;
    /** Serialized billing address forwarded to the backend */
    billingAddress?: Record<string, string>;
    couponCode?: string;
    tipAmount?: number;
    shippingMethodId?: string;
    paymentMethodId?: string;
}
/**
 * Public interface for Stripe payment management.
 *
 * Use this interface for type annotations instead of the concrete StripeManager class.
 * This allows internal implementation changes without breaking your code.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { stripeManager } = useCedrosContext();
 *   // stripeManager is typed as IStripeManager
 *   await stripeManager.createSession({ resource: 'item-1' });
 * }
 * ```
 */
export interface IStripeManager {
    /**
     * Initialize Stripe.js library
     */
    initialize(): Promise<void>;
    /**
     * Create a Stripe checkout session for a single item
     */
    createSession(request: StripeSessionRequest): Promise<StripeSessionResponse>;
    /**
     * Redirect to Stripe checkout page
     */
    redirectToCheckout(sessionId: string): Promise<PaymentResult>;
    /**
     * Complete payment flow: create session and redirect
     */
    processPayment(request: StripeSessionRequest): Promise<PaymentResult>;
    /**
     * Create a Stripe cart checkout session for multiple items
     */
    processCartCheckout(options: ProcessCartCheckoutOptions): Promise<PaymentResult>;
}
/**
 * Internal implementation of Stripe payment management.
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
 * import { useCedrosContext } from '@cedros/pay-react';
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
 * import { StripeManager } from '@cedros/pay-react'; // ❌ Not exported
 * const manager = new StripeManager(...); // ❌ Unsupported
 * ```
 *
 * @see {@link IStripeManager} for the stable interface
 * @see API_STABILITY.md for our API stability policy
 */
export declare class StripeManager implements IStripeManager {
    private stripe;
    private initPromise;
    private readonly publicKey;
    private readonly routeDiscovery;
    private readonly rateLimiter;
    private readonly circuitBreaker;
    constructor(publicKey: string, routeDiscovery: RouteDiscoveryManager);
    /**
     * Initialize Stripe.js library
     *
     * Concurrent callers share a single loadStripe() call via a cached promise.
     */
    initialize(): Promise<void>;
    /**
     * Create a Stripe checkout session
     */
    createSession(request: StripeSessionRequest): Promise<StripeSessionResponse>;
    /**
     * Redirect to Stripe checkout
     */
    redirectToCheckout(sessionId: string): Promise<PaymentResult>;
    /**
     * Handle complete payment flow: create session and redirect
     */
    processPayment(request: StripeSessionRequest): Promise<PaymentResult>;
    /**
     * Create a Stripe cart checkout session for multiple items
     */
    processCartCheckout(options: ProcessCartCheckoutOptions): Promise<PaymentResult>;
}
//# sourceMappingURL=StripeManager.d.ts.map