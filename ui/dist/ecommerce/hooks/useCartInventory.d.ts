import { CartItem } from '../types';
export type CartItemInventory = {
    productId: string;
    variantId?: string;
    /** Current available quantity (undefined = unlimited) */
    availableQty?: number;
    /** Inventory status from product/variant */
    status?: 'in_stock' | 'low' | 'out_of_stock' | 'backorder';
    /** True if item is now out of stock */
    isOutOfStock: boolean;
    /** True if requested qty exceeds available */
    exceedsAvailable: boolean;
    /** True if stock is low (1-5 remaining) */
    isLowStock: boolean;
    /** Human-readable message for display */
    message?: string;
};
export type CartInventoryMap = Map<string, CartItemInventory>;
export interface UseCartInventoryOptions {
    /** Cart items to check inventory for */
    items: CartItem[];
    /** Refresh interval in ms (0 to disable auto-refresh, default: 30000) */
    refreshInterval?: number;
    /** Skip fetching (e.g., when cart is empty) */
    skip?: boolean;
}
export interface UseCartInventoryResult {
    /** Map of product::variant key to inventory info */
    inventory: CartInventoryMap;
    /** True while fetching inventory */
    isLoading: boolean;
    /** Error message if fetch failed */
    error: string | null;
    /** Manually refresh inventory */
    refresh: () => void;
    /** Get inventory for a specific cart item */
    getItemInventory: (productId: string, variantId?: string) => CartItemInventory | undefined;
    /** True if any item has inventory issues */
    hasIssues: boolean;
}
export declare function useCartInventory({ items, refreshInterval, skip, }: UseCartInventoryOptions): UseCartInventoryResult;
//# sourceMappingURL=useCartInventory.d.ts.map