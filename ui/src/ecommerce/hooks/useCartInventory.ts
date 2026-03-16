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

const FALLBACK_PRODUCT_LOOKUP_CONCURRENCY = 2;

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

function mapsEqual(left: CartInventoryMap, right: CartInventoryMap): boolean {
  if (left.size !== right.size) {
    return false;
  }

  for (const [key, leftValue] of left) {
    const rightValue = right.get(key);
    if (!rightValue) {
      return false;
    }

    if (
      leftValue.productId !== rightValue.productId ||
      leftValue.variantId !== rightValue.variantId ||
      leftValue.availableQty !== rightValue.availableQty ||
      leftValue.status !== rightValue.status ||
      leftValue.isOutOfStock !== rightValue.isOutOfStock ||
      leftValue.exceedsAvailable !== rightValue.exceedsAvailable ||
      leftValue.isLowStock !== rightValue.isLowStock ||
      leftValue.message !== rightValue.message
    ) {
      return false;
    }
  }

  return true;
}

async function loadProductsWithFallback(
  productIds: string[],
  getProductBySlug: (slug: string) => Promise<Product | null>
): Promise<Map<string, Product>> {
  const productMap = new Map<string, Product>();

  for (let start = 0; start < productIds.length; start += FALLBACK_PRODUCT_LOOKUP_CONCURRENCY) {
    const chunk = productIds.slice(start, start + FALLBACK_PRODUCT_LOOKUP_CONCURRENCY);
    const products = await Promise.all(
      chunk.map(async (id) => {
        try {
          return await getProductBySlug(id);
        } catch {
          return null;
        }
      })
    );

    for (const product of products) {
      if (product) {
        productMap.set(product.id, product);
        if (product.slug && product.slug !== product.id) {
          productMap.set(product.slug, product);
        }
      }
    }
  }

  return productMap;
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
  const inFlightRef = React.useRef<Promise<void> | null>(null);

  // Use a ref for items so fetchInventory doesn't re-create on qty-only changes
  const itemsRef = React.useRef(items);
  itemsRef.current = items;
  const productIdsRef = React.useRef<string[]>([]);

  // Extract unique product IDs from cart - only changes when products are added/removed
  const productIdSet = React.useMemo(() => {
    const ids = new Set<string>();
    for (const item of items) {
      ids.add(item.productId);
    }
    return ids;
  }, [items]);

  // Stable sorted key for dependency comparison
  const productIdsKey = React.useMemo(
    () => Array.from(productIdSet).sort().join(','),
    [productIdSet]
  );

  const productIds = React.useMemo(
    () => Array.from(productIdSet),
    [productIdSet]
  );
  productIdsRef.current = productIds;

  const fetchInventory = React.useCallback(async () => {
    if (skip || productIdsRef.current.length === 0) {
      setError(null);
      setIsLoading(false);
      setInventory((current) => (current.size === 0 ? current : new Map()));
      return;
    }

    if (inFlightRef.current) {
      return inFlightRef.current;
    }

    const run = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const requestedProductIds = productIdsRef.current;
        const productMap = config.adapter.getProductsByIds
          ? await config.adapter.getProductsByIds(requestedProductIds)
          : await loadProductsWithFallback(requestedProductIds, config.adapter.getProductBySlug);

        const newInventory: CartInventoryMap = new Map();
        for (const item of itemsRef.current) {
          const key = makeKey(item.productId, item.variantId);
          const product = productMap.get(item.productId) ?? null;
          newInventory.set(key, computeInventoryInfo(item, product));
        }

        setInventory((current) => (mapsEqual(current, newInventory) ? current : newInventory));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to check inventory');
      } finally {
        setIsLoading(false);
        inFlightRef.current = null;
      }
    };

    const pending = run();
    inFlightRef.current = pending;
    return pending;
    // productIdsKey changes only when the set of product IDs changes (not on qty changes)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.adapter, productIdsKey, skip]);

  // Initial fetch
  React.useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // Auto-refresh
  React.useEffect(() => {
    if (skip || refreshInterval <= 0 || productIds.length === 0) return;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const scheduleNext = () => {
      timeoutId = setTimeout(async () => {
        await fetchInventory();
        if (!cancelled) {
          scheduleNext();
        }
      }, refreshInterval);
    };

    scheduleNext();

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
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
