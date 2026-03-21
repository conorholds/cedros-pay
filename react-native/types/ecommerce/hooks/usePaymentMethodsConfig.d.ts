/**
 * Hook to fetch enabled payment methods from admin configuration.
 *
 * Automatically uses the adapter from CedrosShopProvider context.
 * Falls back to all methods enabled if config is not available.
 */
import type { PaymentMethodsConfig } from '../adapters/CommerceAdapter';
export declare function usePaymentMethodsConfig(): {
    config: PaymentMethodsConfig;
    isLoading: boolean;
};
//# sourceMappingURL=usePaymentMethodsConfig.d.ts.map