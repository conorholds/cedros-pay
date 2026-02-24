import { useMemo } from 'react';
import { isCartCheckout } from '../utils/cartHelpers';
import type { CartItem } from '../types';

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
export function usePaymentMode(
  resource?: string,
  items?: CartItem[]
): PaymentModeInfo {
  // Memoize return value to prevent unnecessary recalculations on every render
  return useMemo(() => {
    // Determine if this is cart mode (multi-item or single item with quantity > 1)
    const isCartMode = isCartCheckout(items);

    // Resolve the effective resource for single-item payments
    // Priority: explicit resource prop, then single item from array
    const effectiveResource =
      resource || (items?.length === 1 ? items[0].resource : '');

    return {
      isCartMode,
      effectiveResource,
    };
  }, [resource, items]);
}
