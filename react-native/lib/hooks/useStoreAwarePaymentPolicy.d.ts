import type { AvailablePaymentAdapters, CedrosPayPolicyOverrides, CedrosProductDefinition, OrchestratedPaymentMethod, PaymentPolicyPurchaseMode, PaymentPolicyResolution } from '../types/storePolicy';
interface UseStoreAwarePaymentPolicyArgs {
    product?: CedrosProductDefinition;
    policy?: CedrosPayPolicyOverrides;
    purchaseMode?: PaymentPolicyPurchaseMode;
}
interface UseStoreAwarePaymentPolicyResult {
    usesOrchestration: boolean;
    resolution: PaymentPolicyResolution | null;
    availableAdapters: AvailablePaymentAdapters;
    renderableMethods: OrchestratedPaymentMethod[];
}
export declare function useStoreAwarePaymentPolicy({ product, policy, purchaseMode, }: UseStoreAwarePaymentPolicyArgs): UseStoreAwarePaymentPolicyResult;
export {};
//# sourceMappingURL=useStoreAwarePaymentPolicy.d.ts.map