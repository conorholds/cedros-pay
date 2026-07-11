export declare class CedrosPayCheckout {
    private readonly transport;
    private readonly inFlight;
    constructor(options?: CedrosPayCheckoutOptions);
    /** Reads the authenticated, host-derived capability descriptor. */
    descriptor(options?: CheckoutRequestOptions): Promise<CheckoutDescriptor>;
    quote(request: CheckoutQuoteRequest, options?: CheckoutRequestOptions): Promise<CheckoutQuoteOutcome>;
    checkout(request: CheckoutCreateRequest, options?: CheckoutRequestOptions): Promise<CheckoutOutcome>;
    status(request: CheckoutStatusRequest, options?: CheckoutRequestOptions): Promise<CheckoutStatusResponse>;
    verifyReturn(request: CheckoutReturnRequest, options?: CheckoutRequestOptions): Promise<CheckoutReturnOutcome>;
    private deduplicate;
}

export declare interface CedrosPayCheckoutOptions {
    serverUrl?: string;
    fetch?: typeof globalThis.fetch;
    headers?: HeadersInit;
    timeoutMs?: number;
}

export declare const CHECKOUT_CREATE_SCOPE: "cedros-pay-checkout:checkout";

export declare const CHECKOUT_PROTOCOL: "cedros-pay-checkout";

export declare const CHECKOUT_QUOTE_SCOPE: "cedros-pay-checkout:quote";

export declare interface CheckoutCreateRequest {
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

export declare interface CheckoutDescriptor {
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

export declare type CheckoutHookState = 'idle' | 'loading' | 'resolved' | 'terminal' | 'indeterminate' | 'error';

export declare type CheckoutIndeterminate = {
    status: 'indeterminate';
    code: string;
};

export declare type CheckoutOutcome = CheckoutResolved | CheckoutTerminal | CheckoutIndeterminate;

export declare type CheckoutQuoteOutcome = CheckoutTerminal | CheckoutIndeterminate | (CheckoutResolved & {
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

export declare interface CheckoutQuoteRequest {
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

export declare class CheckoutRequestError extends Error {
    readonly status: number;
    readonly code: string;
    constructor(status: number, code: string, message: string);
}

export declare interface CheckoutRequestOptions {
    signal?: AbortSignal;
    timeoutMs?: number;
}

export declare type CheckoutResolved = {
    status: 'resolved';
    operationId: string;
    attemptId: string;
    returnArtifact?: string;
    replayed: boolean;
};

export declare type CheckoutReturnOutcome = {
    status: 'verified';
    checkoutAttemptId: string;
} | {
    status: 'mismatch';
} | {
    status: 'indeterminate';
};

export declare interface CheckoutReturnRequest {
    expectedAttemptId: string;
    returnArtifact: string;
}

export declare interface CheckoutStatusRequest {
    operationId: string;
    resolveProviderUrl?: boolean;
}

export declare type CheckoutStatusResponse = {
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

export declare type CheckoutTerminal = {
    status: 'terminal';
    durable: true;
    code: string;
    replayed: boolean;
};

export declare function useCedrosPayCheckout(clientOverride?: CedrosPayCheckout): {
    client: CedrosPayCheckout;
    state: CheckoutHookState;
    outcome: CheckoutResolved | CheckoutTerminal | CheckoutIndeterminate | (CheckoutResolved & {
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
    }) | null;
    error: Error | null;
    descriptor: () => Promise<CheckoutDescriptor>;
    quote: (request: CheckoutQuoteRequest) => Promise<CheckoutQuoteOutcome>;
    checkout: (request: CheckoutCreateRequest) => Promise<CheckoutOutcome>;
    status: (request: CheckoutStatusRequest) => Promise<CheckoutStatusResponse>;
    verifyReturn: (request: CheckoutReturnRequest) => Promise<CheckoutReturnOutcome>;
    reset: () => void;
};

export declare function validateIdempotencyKey(value: string): void;

export { }
