import type { OrchestratedPaymentMethod, PaymentPolicyContext, PaymentPolicyResolution } from '../types/storePolicy';
/**
 * Core payment policy resolver.
 *
 * This function is intentionally pure so it can be reused across UI,
 * checkout orchestration, and tests.
 */
export declare function resolveAllowedPaymentMethods(context: PaymentPolicyContext): OrchestratedPaymentMethod[];
export declare function resolvePaymentPolicy(context: PaymentPolicyContext): PaymentPolicyResolution;
export declare function collapseRenderablePaymentMethods(methods: OrchestratedPaymentMethod[]): OrchestratedPaymentMethod[];
//# sourceMappingURL=resolveAllowedPaymentMethods.d.ts.map