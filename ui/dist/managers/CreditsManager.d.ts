import { CreditsRequirement, CreditsPaymentResult, CreditsHoldResponse, CartCreditsQuote, PaymentResult } from '../types';
import { RouteDiscoveryManager } from './RouteDiscoveryManager';
import { NormalizedCartItem } from '../utils/cartHelpers';
/**
 * Options for creating a credits hold
 */
export interface CreateCreditsHoldOptions {
    resource: string;
    couponCode?: string;
    /** JWT token from cedros-login for user authentication */
    authToken: string;
}
/**
 * Options for processing a credits payment
 */
export interface ProcessCreditsPaymentOptions {
    resource: string;
    holdId: string;
    couponCode?: string;
    /** JWT token from cedros-login for user authentication */
    authToken: string;
    metadata?: Record<string, string>;
}
/**
 * Options for creating a cart credits hold
 */
export interface CreateCartCreditsHoldOptions {
    cartId: string;
    /** JWT token from cedros-login for user authentication */
    authToken: string;
}
/**
 * Options for processing a credits cart payment
 */
export interface ProcessCreditsCartPaymentOptions {
    cartId: string;
    holdId: string;
    /** JWT token from cedros-login for user authentication */
    authToken: string;
    metadata?: Record<string, string>;
}
/**
 * Public interface for Credits payment management.
 *
 * Use this interface for type annotations instead of the concrete CreditsManager class.
 * This allows internal implementation changes without breaking your code.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { creditsManager } = useCedrosContext();
 *   // creditsManager is typed as ICreditsManager
 *   const quote = await creditsManager.requestQuote('item-1');
 * }
 * ```
 */
export interface ICreditsManager {
    /**
     * Request a credits quote for a single resource
     * @param resource - Resource ID to get quote for
     * @param couponCode - Optional coupon code for discount
     * @returns Credits requirement with amount and details
     */
    requestQuote(resource: string, couponCode?: string): Promise<CreditsRequirement | null>;
    /**
     * Request a credits quote for a cart
     * @param items - Cart items to get quote for
     * @param couponCode - Optional coupon code for discount
     * @returns Cart credits quote with total amount
     */
    requestCartQuote(items: NormalizedCartItem[], couponCode?: string): Promise<{
        cartId: string;
        credits: CartCreditsQuote;
    } | null>;
    /**
     * Create a hold on user's credits
     * Requires user authentication via cedros-login JWT token
     * @param options - Hold creation options including resource and auth token
     */
    createHold(options: CreateCreditsHoldOptions): Promise<CreditsHoldResponse>;
    /**
     * Create a hold on user's credits for a cart
     * Requires user authentication via cedros-login JWT token
     * @param options - Cart hold creation options
     */
    createCartHold(options: CreateCartCreditsHoldOptions): Promise<CreditsHoldResponse>;
    /**
     * Authorize a credits payment using a hold
     * @param options - Payment options including hold ID
     */
    authorizePayment(options: ProcessCreditsPaymentOptions): Promise<CreditsPaymentResult>;
    /**
     * Authorize a credits cart payment using a hold
     * @param options - Cart payment options including hold ID
     */
    authorizeCartPayment(options: ProcessCreditsCartPaymentOptions): Promise<CreditsPaymentResult>;
    /**
     * Release a previously created credits hold.
     * This should be used when checkout fails after hold creation.
     */
    releaseHold(holdId: string, authToken: string): Promise<void>;
    /**
     * Complete credits payment flow: create hold and authorize
     * Convenience method that combines createHold + authorizePayment
     * @param resource - Resource being purchased
     * @param authToken - JWT token from cedros-login
     * @param couponCode - Optional coupon code
     * @param metadata - Optional metadata
     */
    processPayment(resource: string, authToken: string, couponCode?: string, metadata?: Record<string, string>): Promise<PaymentResult>;
}
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
export declare class CreditsManager implements ICreditsManager {
    private readonly routeDiscovery;
    private readonly rateLimiter;
    private readonly circuitBreaker;
    constructor(routeDiscovery: RouteDiscoveryManager);
    requestQuote(resource: string, couponCode?: string): Promise<CreditsRequirement | null>;
    requestCartQuote(items: NormalizedCartItem[], couponCode?: string): Promise<{
        cartId: string;
        credits: CartCreditsQuote;
    } | null>;
    /**
     * Create a hold on user's credits
     * Requires Authorization header with cedros-login JWT token
     */
    createHold(options: CreateCreditsHoldOptions): Promise<CreditsHoldResponse>;
    /**
     * Create a hold on user's credits for a cart
     * Requires Authorization header with cedros-login JWT token
     */
    createCartHold(options: CreateCartCreditsHoldOptions): Promise<CreditsHoldResponse>;
    authorizePayment(options: ProcessCreditsPaymentOptions): Promise<CreditsPaymentResult>;
    authorizeCartPayment(options: ProcessCreditsCartPaymentOptions): Promise<CreditsPaymentResult>;
    releaseHold(holdId: string, authToken: string): Promise<void>;
    /**
     * Process a complete credits payment (convenience method)
     * Combines createHold + authorizePayment in one call
     *
     * @param resource - Resource being purchased
     * @param authToken - JWT token from cedros-login
     * @param couponCode - Optional coupon code
     * @param metadata - Optional metadata
     */
    processPayment(resource: string, authToken: string, couponCode?: string, metadata?: Record<string, string>): Promise<PaymentResult>;
}
//# sourceMappingURL=CreditsManager.d.ts.map