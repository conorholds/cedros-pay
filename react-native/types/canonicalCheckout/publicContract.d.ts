import { CHECKOUT_CREATE_SCOPE, CHECKOUT_PROTOCOL, CHECKOUT_QUOTE_SCOPE } from './contract';
export { CHECKOUT_PROTOCOL, CHECKOUT_QUOTE_SCOPE, CHECKOUT_CREATE_SCOPE };
export interface CheckoutDescriptor {
    protocol: typeof CHECKOUT_PROTOCOL;
    providerScope: string;
    replayTtlMs: number;
    acceptsExternalIdempotencyKey: true;
    maxIdempotencyKeyLength: 67;
    idempotencyKeyCharacterSet: 'ascii-visible';
    operationScopes: {
        quote: typeof CHECKOUT_QUOTE_SCOPE;
        checkout: typeof CHECKOUT_CREATE_SCOPE;
    };
}
export interface CheckoutQuoteRequest {
    idempotencyKey: string;
    attemptId: string;
    cartGeneration?: number;
    lines: Array<{
        productId: string;
        quantity: number;
        variantId?: string;
    }>;
    couponCode?: string;
    customerEmail?: string;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
}
export interface CheckoutCreateRequest {
    idempotencyKey: string;
    attemptId: string;
    quoteOperationId: string;
    /** Informational only. Pay settles from the authoritative quote. */
    amountCents: number;
    /** Informational only. Pay settles from the authoritative quote. */
    currency: string;
    productName: string;
    successUrl: string;
    cancelUrl: string;
    customerEmail?: string;
    clientReferenceId?: string;
    metadata?: Record<string, string>;
}
export type CheckoutResolved = {
    status: 'resolved';
    operationId: string;
    attemptId: string;
    returnArtifact?: string;
    replayed: boolean;
};
export type CheckoutTerminal = {
    status: 'terminal';
    durable: true;
    code: string;
    replayed: boolean;
};
export type CheckoutIndeterminate = {
    status: 'indeterminate';
    code: string;
};
export type CheckoutOutcome = CheckoutResolved | CheckoutTerminal | CheckoutIndeterminate;
export type CheckoutQuoteOutcome = CheckoutTerminal | CheckoutIndeterminate | (CheckoutResolved & {
    quote: {
        cartGeneration: number;
        currency: string;
        lines: Array<{
            productId: string;
            quantity: number;
            unitAmountCents: number;
        }>;
        discountCents: number;
        taxCents: number;
        shippingCents: number;
        totalCents: number;
    };
});
export interface CheckoutStatusRequest {
    operationId: string;
    resolveProviderUrl?: boolean;
}
export type CheckoutStatusResponse = {
    outcome: CheckoutOutcome;
    providerUrl?: {
        status: 'resolved';
        checkoutUrl: string;
    } | {
        status: 'mismatch';
    } | {
        status: 'indeterminate';
    };
};
export interface CheckoutReturnRequest {
    expectedAttemptId: string;
    returnArtifact: string;
}
export type CheckoutReturnOutcome = {
    status: 'verified';
    checkoutAttemptId: string;
} | {
    status: 'mismatch';
} | {
    status: 'indeterminate';
};
//# sourceMappingURL=publicContract.d.ts.map