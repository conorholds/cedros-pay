import { CustomerInfo, ShippingMethod } from '../types';
export declare function useShippingMethods({ enabled, customer, }: {
    enabled: boolean;
    customer: CustomerInfo;
}): {
    methods: ShippingMethod[];
    isLoading: boolean;
    error: string | null;
};
//# sourceMappingURL=useShippingMethods.d.ts.map