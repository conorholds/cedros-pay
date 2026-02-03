import { X402Requirement, PaymentResult, PaymentPayload, SettlementResponse } from '../types';
import { RouteDiscoveryManager } from './RouteDiscoveryManager';
import { NormalizedCartItem } from '../utils/cartHelpers';
/**
 * Options for requesting a payment quote
 */
export interface RequestQuoteOptions {
    resource: string;
    couponCode?: string;
}
/**
 * Options for requesting a cart quote
 */
export interface RequestCartQuoteOptions {
    items: NormalizedCartItem[];
    metadata?: Record<string, string>;
    couponCode?: string;
}
/**
 * Options for submitting a payment
 */
export interface SubmitPaymentOptions {
    resource: string;
    payload: PaymentPayload;
    couponCode?: string;
    metadata?: Record<string, string>;
    resourceType?: "regular" | "cart" | "refund";
}
/**
 * Options for building a gasless transaction
 */
export interface BuildGaslessTransactionOptions {
    resourceId: string;
    userWallet: string;
    feePayer?: string;
    couponCode?: string;
}
/**
 * Options for submitting a gasless transaction
 */
export interface SubmitGaslessTransactionOptions {
    resource: string;
    partialTx: string;
    couponCode?: string;
    metadata?: Record<string, string>;
    resourceType?: "regular" | "cart" | "refund";
    requirement?: X402Requirement;
}
/**
 * Public interface for x402 payment protocol management.
 *
 * Use this interface for type annotations instead of the concrete X402Manager class.
 */
export interface IX402Manager {
    /**
     * Request a payment quote for a single resource
     */
    requestQuote(options: RequestQuoteOptions): Promise<X402Requirement>;
    /**
     * Request a cart quote for multiple items
     */
    requestCartQuote(options: RequestCartQuoteOptions): Promise<{
        cartId: string;
        quote: X402Requirement;
    }>;
    /**
     * Build X-PAYMENT header from payment payload
     */
    buildPaymentHeader(payload: PaymentPayload): string;
    /**
     * Parse X-PAYMENT-RESPONSE header
     */
    parseSettlementResponse(response: Response): SettlementResponse | null;
    /**
     * Submit payment with signed transaction
     */
    submitPayment(options: SubmitPaymentOptions): Promise<PaymentResult>;
    /**
     * Build a gasless transaction (server pays fees)
     */
    buildGaslessTransaction(options: BuildGaslessTransactionOptions): Promise<{
        transaction: string;
        blockhash: string;
        feePayer: string;
    }>;
    /**
     * Submit gasless partial transaction for co-signing
     */
    submitGaslessTransaction(options: SubmitGaslessTransactionOptions): Promise<PaymentResult>;
    /**
     * Validate x402 requirement structure
     */
    validateRequirement(req: X402Requirement): boolean;
}
/**
 * Internal implementation of x402 payment protocol.
 *
 * @internal
 * **DO NOT USE THIS CLASS DIRECTLY**
 *
 * This concrete class is not part of the stable API and may change without notice.
 *
 * **Correct Usage:**
 * ```typescript
 * import { useCedrosContext } from '@cedros/pay-react';
 *
 * function MyComponent() {
 *   const { x402Manager } = useCedrosContext();
 *   await x402Manager.requestQuote({ resource: 'item-1' });
 * }
 * ```
 *
 * @see {@link IX402Manager} for the stable interface
 * @see API_STABILITY.md for our API stability policy
 */
export declare class X402Manager implements IX402Manager {
    private readonly routeDiscovery;
    private readonly quoteRateLimiter;
    private readonly verifyRateLimiter;
    private readonly circuitBreaker;
    constructor(routeDiscovery: RouteDiscoveryManager);
    /**
     * Request a protected resource and get x402 requirement
     * SECURITY: Resource ID and coupon codes sent in request body to prevent leakage
     * Prevents exposure of product IDs, SKUs, and business-sensitive identifiers in logs
     */
    requestQuote(options: RequestQuoteOptions): Promise<X402Requirement>;
    /**
     * Request a cart quote for multiple items
     */
    requestCartQuote(options: RequestCartQuoteOptions): Promise<{
        cartId: string;
        quote: X402Requirement;
    }>;
    /**
     * Build X-PAYMENT header from payment payload (base64 encoded)
     */
    buildPaymentHeader(payload: PaymentPayload): string;
    /**
     * Parse X-PAYMENT-RESPONSE header (base64 encoded settlement response)
     */
    parseSettlementResponse(response: Response): SettlementResponse | null;
    /**
     * Retry request with payment proof
     * SECURITY: Coupon and metadata sent in X-PAYMENT header payload, NOT query strings
     */
    submitPayment(options: SubmitPaymentOptions): Promise<PaymentResult>;
    /**
     * Build a complete gasless transaction on the backend
     * Returns an unsigned transaction with all instructions (compute budget, transfer, memo)
     */
    buildGaslessTransaction(options: BuildGaslessTransactionOptions): Promise<{
        transaction: string;
        blockhash: string;
        feePayer: string;
    }>;
    /**
     * Submit gasless partial transaction for co-signing
     * Sends the partially-signed transaction in X-Payment header for backend co-signing
     * SECURITY: Coupon and metadata sent in X-PAYMENT header payload, NOT query strings
     */
    submitGaslessTransaction(options: SubmitGaslessTransactionOptions): Promise<PaymentResult>;
    /**
     * Handle payment verification response (shared logic for both submitPayment and submitGaslessTransaction)
     * Parses settlement header and extracts transaction ID from response body
     * @param response - HTTP response from payment verification endpoint
     * @param defaultTxId - Fallback transaction ID if JSON parsing fails
     * @returns Settlement data and transaction ID
     */
    private handlePaymentVerification;
    /**
     * Validate x402 requirement structure
     */
    validateRequirement(req: X402Requirement): boolean;
}
//# sourceMappingURL=X402Manager.d.ts.map