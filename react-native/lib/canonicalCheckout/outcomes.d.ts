import type { CheckoutPaymentMethod } from './contract';
interface CheckoutLifecycleBase {
    operationId: string;
    attemptId: string;
    paymentMethod: CheckoutPaymentMethod;
    replayed: boolean;
}
export interface CheckoutActionRequired extends CheckoutLifecycleBase {
    status: 'action_required';
    returnArtifact: string;
}
export interface CheckoutProcessing extends CheckoutLifecycleBase {
    status: 'processing';
}
export interface CheckoutPaid extends CheckoutLifecycleBase {
    status: 'paid';
}
export interface CheckoutTerminal extends CheckoutLifecycleBase {
    status: 'terminal';
    code: string;
}
export interface CheckoutIndeterminate extends CheckoutLifecycleBase {
    status: 'indeterminate';
    code: string;
}
export type CheckoutOutcome = CheckoutActionRequired | CheckoutProcessing | CheckoutPaid | CheckoutTerminal | CheckoutIndeterminate;
interface CheckoutOperationOutcomeBase {
    operationId: string;
    attemptId: string;
    paymentMethod: CheckoutPaymentMethod;
}
export type CheckoutProviderUrlOutcome = (CheckoutOperationOutcomeBase & {
    status: 'resolved';
    checkoutUrl: string;
}) | (CheckoutOperationOutcomeBase & {
    status: 'mismatch' | 'indeterminate';
});
export type CheckoutReturnOutcome = CheckoutOperationOutcomeBase & {
    status: 'verified' | 'mismatch' | 'indeterminate';
    settlementStatus: 'paid' | 'unpaid' | 'pending';
};
export interface CheckoutApiErrorBody {
    error: {
        code: string;
        message: string;
    };
}
export {};
//# sourceMappingURL=outcomes.d.ts.map