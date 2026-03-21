import { StripeProvider, useStripe } from '@stripe/stripe-react-native';
import type { StripeSessionRequest, StripeSessionResponse, PaymentResult } from '../types';
import { RouteDiscoveryManager } from './RouteDiscoveryManager';
import type { NormalizedCartItem } from '../utils/cartHelpers';
/**
 * Options for processing a cart checkout
 */
export interface ProcessCartCheckoutOptions {
    items: NormalizedCartItem[];
    successUrl?: string;
    cancelUrl?: string;
    metadata?: Record<string, string>;
    customerEmail?: string;
    couponCode?: string;
}
/**
 * Payment sheet initialization options
 */
interface PaymentSheetOptions {
    paymentIntentClientSecret?: string;
    setupIntentClientSecret?: string;
    customerId?: string;
    customerEphemeralKeySecret?: string;
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
 *   await stripeManager.processPayment({ resource: 'item-1' });
 * }
 * ```
 */
export interface IStripeManager {
    /**
     * Initialize Stripe React Native SDK
     */
    initialize(): Promise<void>;
    /**
     * Check if Stripe is initialized
     */
    isInitialized(): boolean;
    /**
     * Create a Stripe checkout session for a single item
     */
    createSession(request: StripeSessionRequest): Promise<StripeSessionResponse>;
    /**
     * Initialize and present payment sheet for a session
     */
    presentPayment(options: PaymentSheetOptions): Promise<PaymentResult>;
    /**
     * Complete payment flow: create session and present payment sheet
     */
    processPayment(request: StripeSessionRequest): Promise<PaymentResult>;
    /**
     * Create a Stripe cart checkout session for multiple items
     */
    processCartCheckout(options: ProcessCartCheckoutOptions): Promise<PaymentResult>;
}
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
export declare class StripeManager implements IStripeManager {
    private isStripeInitialized;
    private readonly publicKey;
    private readonly routeDiscovery;
    private readonly rateLimiter;
    private readonly circuitBreaker;
    constructor(publicKey: string, routeDiscovery: RouteDiscoveryManager);
    /**
     * Initialize Stripe React Native SDK
     */
    initialize(): Promise<void>;
    /**
     * Check if Stripe is initialized
     */
    isInitialized(): boolean;
    /**
     * Create a Stripe checkout session
     */
    createSession(request: StripeSessionRequest): Promise<StripeSessionResponse>;
    /**
     * Initialize and present payment sheet
     */
    presentPayment(options: PaymentSheetOptions): Promise<PaymentResult>;
    /**
     * Handle complete payment flow: create session and present payment sheet
     * Note: For React Native, the backend needs to provide a PaymentIntent client secret
     * instead of a Checkout Session.
     */
    processPayment(request: StripeSessionRequest): Promise<PaymentResult>;
    /**
     * Create a Stripe cart checkout session for multiple items
     */
    processCartCheckout(options: ProcessCartCheckoutOptions): Promise<PaymentResult>;
}
export { StripeProvider, useStripe };
//# sourceMappingURL=StripeManager.d.ts.map