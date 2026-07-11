import type { CheckoutCreateRequest, CheckoutOperationRequest, CheckoutQuoteRequest, CheckoutStatusRequest } from './contract';
export declare function validateQuoteRequest(request: CheckoutQuoteRequest): void;
export declare function validateCreateRequest(request: CheckoutCreateRequest): void;
export declare function validateStatusRequest(request: CheckoutStatusRequest): void;
export declare function validateOperationRequest(request: CheckoutOperationRequest): void;
export declare const validateReturnRequest: typeof validateOperationRequest;
export declare const validateProviderRequest: typeof validateOperationRequest;
export declare function validateIdempotencyKey(value: string): void;
//# sourceMappingURL=inputValidation.d.ts.map