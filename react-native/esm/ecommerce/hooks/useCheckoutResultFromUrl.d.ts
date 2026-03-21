import type { CheckoutReturnResult } from '../adapters/CommerceAdapter';
export type CheckoutResult = CheckoutReturnResult;
export interface UseCheckoutResultFromUrlOptions {
    /**
     * The URL to parse for checkout result parameters.
     * In React Native, this should be provided from Linking or deep linking handlers.
     */
    url: string | null | undefined;
}
export declare function useCheckoutResultFromUrl(options: UseCheckoutResultFromUrlOptions): CheckoutResult;
//# sourceMappingURL=useCheckoutResultFromUrl.d.ts.map