export declare const CHECKOUT_PROTOCOL: "cedros-pay-checkout";
export declare const CHECKOUT_SCHEMA_VERSION: 1;
export declare const CHECKOUT_QUOTE_SCOPE: "cedros-pay-checkout:quote";
export declare const CHECKOUT_CREATE_SCOPE: "cedros-pay-checkout:checkout";
export declare const MAX_CHECKOUT_IDEMPOTENCY_KEY_LENGTH = 67;
export type CheckoutPaymentMethod = 'stripe' | 'x402' | 'credits';
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
export interface CheckoutQuoteLineInput {
    resource: string;
    variantId?: string;
    qty: number;
}
export type CheckoutQuoteSource = {
    kind: 'versioned_cart';
    lane: string;
    generation: string;
    version: number;
} | {
    kind: 'items';
    items: CheckoutQuoteLineInput[];
};
export interface CheckoutContact {
    email?: string;
    phone?: string;
    displayName?: string;
}
export interface CheckoutAddress {
    line1: string;
    line2?: string;
    city: string;
    region?: string;
    postalCode: string;
    country: string;
}
export type CheckoutFulfillment = {
    kind: 'digital';
} | {
    kind: 'shipping';
    address: CheckoutAddress;
    shipping: {
        optionId: string;
    };
};
export interface CheckoutCustomerContext {
    fulfillment: CheckoutFulfillment;
    contact?: CheckoutContact;
    returnUrls: {
        success: string;
        cancel: string;
    };
}
export type CheckoutTipIntent = {
    kind: 'fixed';
    amountCents: number;
} | {
    kind: 'percentage';
    basisPoints: number;
};
export interface CheckoutQuoteRequest {
    schemaVersion: typeof CHECKOUT_SCHEMA_VERSION;
    idempotencyKey: string;
    attemptId: string;
    clientMaterialSha256: string;
    source: CheckoutQuoteSource;
    promotionCode?: string;
    customerContext: CheckoutCustomerContext;
    tip?: CheckoutTipIntent;
    requestedPaymentMethods: CheckoutPaymentMethod[];
}
export type CheckoutAuthoritativeSource = {
    kind: 'items';
    intentSha256: string;
} | {
    kind: 'versioned_cart';
    lane: string;
    generation: string;
    version: number;
};
export interface CheckoutQuoteLine {
    resource: string;
    variantId?: string;
    qty: number;
    unitAmountCents: number;
    lineTotalCents: number;
    currency: string;
    title: string;
    image?: string;
    paymentResource: string;
    shippingProfileId?: string;
}
export type CheckoutAppliedTip = {
    kind: 'fixed';
    amountCents: number;
} | {
    kind: 'percentage';
    basisPoints: number;
    amountCents: number;
};
export interface CheckoutInventoryHold {
    holdId: string;
    expiresAt: string;
}
export interface CheckoutQuote {
    schemaVersion: typeof CHECKOUT_SCHEMA_VERSION;
    source: CheckoutAuthoritativeSource;
    lines: CheckoutQuoteLine[];
    currency: string;
    subtotalCents: number;
    discountCents: number;
    shippingCents: number;
    taxCents: number;
    tipCents: number;
    totalCents: number;
    shippingRateId?: string;
    taxRateId?: string;
    appliedTip?: CheckoutAppliedTip;
    inventoryHold?: CheckoutInventoryHold;
    promotionCode?: string;
    requestedPaymentMethods: CheckoutPaymentMethod[];
    expiresAt: string;
}
export interface CheckoutQuoteResponse {
    schemaVersion: typeof CHECKOUT_SCHEMA_VERSION;
    operationId: string;
    attemptId: string;
    quote: CheckoutQuote;
    replayed: boolean;
}
export type CheckoutRailProof = {
    kind: 'stripe';
} | {
    kind: 'x402';
    transaction: string;
} | {
    kind: 'credits';
};
export interface CheckoutCreateRequest {
    schemaVersion: typeof CHECKOUT_SCHEMA_VERSION;
    idempotencyKey: string;
    attemptId: string;
    clientMaterialSha256: string;
    quoteOperationId: string;
    paymentMethod: CheckoutPaymentMethod;
    customerContext: CheckoutCustomerContext;
    railProof?: CheckoutRailProof;
}
export interface CheckoutStatusRequest {
    operationId: string;
}
export interface CheckoutOperationRequest {
    schemaVersion: typeof CHECKOUT_SCHEMA_VERSION;
    operationId: string;
    expectedAttemptId: string;
    returnArtifact: string;
}
export type CheckoutReturnRequest = CheckoutOperationRequest;
export type CheckoutProviderRequest = CheckoutOperationRequest;
//# sourceMappingURL=contract.d.ts.map