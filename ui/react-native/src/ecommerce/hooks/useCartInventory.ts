/**
 * Hook to fetch and track current inventory for cart items
 *
 * Provides real-time inventory data to detect:
 * - Out of stock items
 * - Low stock warnings
 * - Quantity exceeds available inventory
 */

import * as React from 'react';
import { useCedrosShop } from '../config/context';
import type { CartItem, Product } from '../types';

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

function makeKey(productId: string, variantId?: string): string {
  return `${productId}::${variantId ?? ''}`;
}

function getVariantInventory(
  product: Product,
  variantId?: string
): { qty?: number; status?: Product['inventoryStatus'] } {
  if (variantId && product.variants?.length) {
    const variant = product.variants.find((v) => v.id === variantId);
    if (variant) {
      return {
        qty: variant.inventoryQuantity,
        status: variant.inventoryStatus,
      };
    }
  }
  // Fall back to product-level inventory
  return {
    qty: product.inventoryQuantity,
    status: product.inventoryStatus,
  };
}

function computeInventoryInfo(
  cartItem: CartItem,
  product: Product | null
): CartItemInventory {
  const base: CartItemInventory = {
    productId: cartItem.productId,
    variantId: cartItem.variantId,
    isOutOfStock: false,
    exceedsAvailable: false,
    isLowStock: false,
  };

  if (!product) {
    // Product not found - could be deleted
    return {
      ...base,
      isOutOfStock: true,
      message: 'This product is no longer available',
    };
  }

  const { qty, status } = getVariantInventory(product, cartItem.variantId);
  base.availableQty = qty;
  base.status = status;

  // Check out of stock
  if (status === 'out_of_stock' || (typeof qty === 'number' && qty <= 0)) {
    return {
      ...base,
      isOutOfStock: true,
      message: 'Out of stock',
    };
  }

  // Check if requested qty exceeds available (only for finite inventory)
  if (typeof qty === 'number' && cartItem.qty > qty) {
    return {
      ...base,
      exceedsAvailable: true,
      message: qty === 0
        ? 'Out of stock'
        : `Only ${qty} available (you have ${cartItem.qty} in cart)`,
    };
  }

  // Check low stock
  if (status === 'low' || (typeof qty === 'number' && qty > 0 && qty <= 5)) {
    return {
      ...base,
      isLowStock: true,
      message: typeof qty === 'number' ? `Only ${qty} left` : 'Low stock',
    };
  }

  return base;
}

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

export function useCartInventory({
  items,
  refreshInterval = 30000,
  skip = false,
}: UseCartInventoryOptions): UseCartInventoryResult {
  const { config } = useCedrosShop();
  const [inventory, setInventory] = React.useState<CartInventoryMap>(new Map());
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Extract unique product IDs from cart
  const productIds = React.useMemo(() => {
    const ids = new Set<string>();
    for (const item of items) {
      ids.add(item.productId);
    }
    return Array.from(ids);
  }, [items]);

  const fetchInventory = React.useCallback(async () => {
    if (skip || productIds.length === 0) {
      setInventory(new Map());
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch products in parallel
      const products = await Promise.all(
        productIds.map(async (id) => {
          try {
            // Try by slug first (most common), then by ID
            const product = await config.adapter.getProductBySlug(id);
            return product;
          } catch {
            return null;
          }
        })
      );

      // Build product map
      const productMap = new Map<string, Product>();
      for (const product of products) {
        if (product) {
          productMap.set(product.id, product);
          // Also map by slug for lookup flexibility
          if (product.slug && product.slug !== product.id) {
            productMap.set(product.slug, product);
          }
        }
      }

      // Compute inventory info for each cart item
      const newInventory: CartInventoryMap = new Map();
      for (const item of items) {
        const key = makeKey(item.productId, item.variantId);
        const product = productMap.get(item.productId) ?? null;
        newInventory.set(key, computeInventoryInfo(item, product));
      }

      setInventory(newInventory);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check inventory');
    } finally {
      setIsLoading(false);
    }
  }, [config.adapter, items, productIds, skip]);

  // Initial fetch
  React.useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // Auto-refresh
  React.useEffect(() => {
    if (skip || refreshInterval <= 0 || productIds.length === 0) return;

    const handle = setInterval(fetchInventory, refreshInterval);
    return () => clearInterval(handle);
  }, [fetchInventory, productIds.length, refreshInterval, skip]);

  const getItemInventory = React.useCallback(
    (productId: string, variantId?: string) => {
      return inventory.get(makeKey(productId, variantId));
    },
    [inventory]
  );

  const hasIssues = React.useMemo(() => {
    for (const info of inventory.values()) {
      if (info.isOutOfStock || info.exceedsAvailable) {
        return true;
      }
    }
    return false;
  }, [inventory]);

  return {
    inventory,
    isLoading,
    error,
    refresh: fetchInventory,
    getItemInventory,
    hasIssues,
  };
}
