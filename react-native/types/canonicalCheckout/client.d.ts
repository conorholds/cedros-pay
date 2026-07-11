import type { CheckoutCreateRequest, CheckoutDescriptor, CheckoutOutcome, CheckoutQuoteOutcome, CheckoutQuoteRequest, CheckoutReturnOutcome, CheckoutReturnRequest, CheckoutStatusRequest, CheckoutStatusResponse } from './publicContract';
import type { CedrosPayCheckoutOptions, CheckoutRequestOptions } from './transport';
export declare class CedrosPayCheckout {
    private readonly transport;
    private readonly inFlight;
    constructor(options?: CedrosPayCheckoutOptions);
    descriptor(options?: CheckoutRequestOptions): Promise<CheckoutDescriptor>;
    quote(request: CheckoutQuoteRequest, options?: CheckoutRequestOptions): Promise<CheckoutQuoteOutcome>;
    checkout(request: CheckoutCreateRequest, options?: CheckoutRequestOptions): Promise<CheckoutOutcome>;
    status(request: CheckoutStatusRequest, options?: CheckoutRequestOptions): Promise<CheckoutStatusResponse>;
    verifyReturn(request: CheckoutReturnRequest, options?: CheckoutRequestOptions): Promise<CheckoutReturnOutcome>;
    private deduplicate;
}
export { CheckoutRequestError } from './transport';
export type { CedrosPayCheckoutOptions, CheckoutRequestOptions } from './transport';
export { validateIdempotencyKey } from './inputValidation';
//# sourceMappingURL=client.d.ts.map