import type { CheckoutCreateRequest as WireCreateRequest, CheckoutOperationRequest, CheckoutQuoteRequest as WireQuoteRequest, CheckoutQuoteResponse as WireQuoteResponse } from './contract';
import type { CheckoutOutcome as WireOutcome, CheckoutProviderUrlOutcome as WireProviderOutcome } from './outcomes';
import type { CheckoutCreateRequest, CheckoutOutcome, CheckoutQuoteOutcome, CheckoutQuoteRequest, CheckoutReturnOutcome } from './publicContract';
export declare function quoteWireRequest(request: CheckoutQuoteRequest): WireQuoteRequest;
export declare function createWireRequest(request: CheckoutCreateRequest): WireCreateRequest;
export declare function quoteOutcome(response: WireQuoteResponse): CheckoutQuoteOutcome;
export declare function checkoutOutcome(response: WireOutcome): CheckoutOutcome;
export declare function providerOutcome(response: WireProviderOutcome): {
    status: "mismatch";
} | {
    status: "indeterminate";
} | {
    status: "resolved";
    checkoutUrl: string;
};
export declare function operationRequest(response: WireOutcome): CheckoutOperationRequest | undefined;
export declare function verifyOutcome(value: unknown): CheckoutReturnOutcome;
export declare function indeterminate(code?: string): CheckoutOutcome & {
    status: 'indeterminate';
};
//# sourceMappingURL=publicMapping.d.ts.map