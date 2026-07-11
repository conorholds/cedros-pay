import { CedrosPayCheckout } from './client';
import type { CheckoutCreateRequest, CheckoutOutcome, CheckoutQuoteOutcome, CheckoutQuoteRequest, CheckoutReturnRequest, CheckoutStatusRequest } from './publicContract';
export type CheckoutHookState = 'idle' | 'loading' | 'resolved' | 'terminal' | 'indeterminate' | 'error';
export declare function useCedrosPayCheckout(clientOverride?: CedrosPayCheckout): {
    client: CedrosPayCheckout;
    state: CheckoutHookState;
    outcome: import("./publicContract").CheckoutResolved | import("./publicContract").CheckoutTerminal | import("./publicContract").CheckoutIndeterminate | (import("./publicContract").CheckoutResolved & {
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
    descriptor: () => Promise<import("./publicContract").CheckoutDescriptor>;
    quote: (request: CheckoutQuoteRequest) => Promise<CheckoutQuoteOutcome>;
    checkout: (request: CheckoutCreateRequest) => Promise<CheckoutOutcome>;
    status: (request: CheckoutStatusRequest) => Promise<import("./publicContract").CheckoutStatusResponse>;
    verifyReturn: (request: CheckoutReturnRequest) => Promise<import("./publicContract").CheckoutReturnOutcome>;
    reset: () => void;
};
//# sourceMappingURL=useCedrosPayCheckout.d.ts.map