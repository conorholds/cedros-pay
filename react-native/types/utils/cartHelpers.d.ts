/**
 * Cart utility functions
 */
/**
 * Normalized cart item for backend API
 */
export interface NormalizedCartItem {
    resource: string;
    quantity: number;
    /** Variant ID for variant-level inventory tracking */
    variantId?: string;
    metadata?: Record<string, string>;
}
/**
 * Normalize cart items for backend API consumption
 *
 * Ensures all items have a quantity (defaults to 1) and preserves metadata
 * Sanitizes negative, zero, and fractional quantities to prevent undercharging
 *
 * @param items - Array of cart items with optional quantity and metadata
 * @returns Array of normalized cart items ready for API submission
 *
 * @example
 * normalizeCartItems([
 *   {resource: 'item1', metadata: {sku: 'ABC123'}},
 *   {resource: 'item2', quantity: 3, metadata: {sku: 'XYZ789'}}
 * ])
 * // Returns: [
 * //   {resource: 'item1', quantity: 1, metadata: {sku: 'ABC123'}},
 * //   {resource: 'item2', quantity: 3, metadata: {sku: 'XYZ789'}}
 * // ]
 *
 * @example
 * // Sanitizes invalid quantities
 * normalizeCartItems([
 *   {resource: 'item1', quantity: -3}, // becomes 1
 *   {resource: 'item2', quantity: 0},  // becomes 1
 *   {resource: 'item3', quantity: 2.7} // becomes 2
 * ])
 */
export declare function normalizeCartItems(items: Array<{
    resource: string;
    quantity?: number;
    variantId?: string;
    metadata?: Record<string, string>;
}>): NormalizedCartItem[];
/**
 * Get total number of items in cart (sum of all quantities)
 *
 * @param items - Array of cart items with optional quantity
 * @returns Total item count (sanitized to positive integers)
 *
 * @example
 * getCartItemCount([
 *   {resource: 'item1', quantity: 2},
 *   {resource: 'item2', quantity: 3}
 * ])
 * // Returns: 5
 *
 * @example
 * getCartItemCount([{resource: 'item1'}])
 * // Returns: 1 (defaults to quantity 1)
 *
 * @example
 * getCartItemCount([
 *   {quantity: -2}, // treated as 1
 *   {quantity: 0},  // treated as 1
 *   {quantity: 2.7} // treated as 2
 * ])
 * // Returns: 4
 */
export declare function getCartItemCount(items: Array<{
    quantity?: number;
}>): number;
/**
 * Determine if the current payment flow is a cart checkout
 *
 * A cart checkout is defined as:
 * - Multiple items in the cart, OR
 * - A single item with quantity > 1
 *
 * @param items - Array of cart items with optional quantity
 * @returns true if this is a cart checkout, false otherwise
 *
 * @example
 * // Multiple items
 * isCartCheckout([{resource: 'item1', quantity: 1}, {resource: 'item2', quantity: 1}])
 * // Returns: true
 *
 * @example
 * // Single item with quantity > 1
 * isCartCheckout([{resource: 'item1', quantity: 2}])
 * // Returns: true
 *
 * @example
 * // Single item with quantity 1
 * isCartCheckout([{resource: 'item1', quantity: 1}])
 * // Returns: false
 *
 * @example
 * // No items
 * isCartCheckout([])
 * // Returns: false
 */
export declare function isCartCheckout(items?: Array<{
    quantity?: number;
}>): boolean;
//# sourceMappingURL=cartHelpers.d.ts.map