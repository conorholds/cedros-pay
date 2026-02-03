import { CartItem } from '../types';
/**
 * Payment mode information returned by usePaymentMode
 */
export interface PaymentModeInfo {
    /** True if this is a multi-item cart checkout */
    isCartMode: boolean;
    /** The primary resource ID (for single-item payments) */
    effectiveResource: string;
}
/**
 * Hook to resolve payment mode
 *
 * Determines whether a payment is single-item or cart-based.
 *
 * @param resource - Optional single resource ID (for single-item payments)
 * @param items - Optional array of cart items (for cart payments)
 * @returns PaymentModeInfo object with computed payment mode data
 *
 * @example
 * // Single resource payment
 * const { isCartMode, effectiveResource } = usePaymentMode('item-1');
 * // Returns: { isCartMode: false, effectiveResource: 'item-1' }
 *
 * @example
 * // Single item in cart
 * const { isCartMode, effectiveResource } = usePaymentMode(undefined, [{ resource: 'item-1', quantity: 1 }]);
 * // Returns: { isCartMode: false, effectiveResource: 'item-1' }
 *
 * @example
 * // Multiple items in cart
 * const { isCartMode } = usePaymentMode(undefined, [
 *   { resource: 'item-1', quantity: 2 },
 *   { resource: 'item-2', quantity: 1 }
 * ]);
 * // Returns: { isCartMode: true, effectiveResource: '' }
 */
export declare function usePaymentMode(resource?: string, items?: CartItem[]): PaymentModeInfo;
//# sourceMappingURL=usePaymentMode.d.ts.map