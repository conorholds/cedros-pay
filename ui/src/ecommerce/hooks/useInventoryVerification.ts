/**
 * Hook for on-demand inventory verification before checkout
 *
 * Unlike useCartInventory (which continuously monitors), this hook provides
 * a verify() function to check inventory right before payment processing.
 */

import * as React from 'react';
import { useCedrosShop } from '../config/context';
import type { CartItem, Product } from '../types';

export type InventoryIssue = {
  productId: string;
  variantId?: string;
  /** Product/variant title for display */
  title: string;
  /** Quantity requested in cart */
  requestedQty: number;
  /** Currently available quantity (0 if out of stock) */
  availableQty: number;
  /** Type of issue */
  type: 'out_of_stock' | 'insufficient_stock' | 'product_unavailable';
  /** Human-readable message */
  message: string;
};

export type VerificationResult = {
  /** Whether all items passed verification */
  ok: boolean;
  /** List of items with inventory issues */
  issues: InventoryIssue[];
  /** Timestamp of verification */
  verifiedAt: Date;
};

export interface UseInventoryVerificationOptions {
  /** Cart items to verify */
  items: CartItem[];
}

export interface UseInventoryVerificationResult {
  /** Most recent verification result (null if never verified) */
  result: VerificationResult | null;
  /** True while verification is in progress */
  isVerifying: boolean;
  /** Error if verification failed entirely */
  error: string | null;
  /** Trigger verification and return result */
  verify: () => Promise<VerificationResult>;
  /** Clear the current result */
  reset: () => void;
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
  return {
    qty: product.inventoryQuantity,
    status: product.inventoryStatus,
  };
}

function getItemTitle(item: CartItem, product: Product | null, variantId?: string): string {
  if (!product) return item.titleSnapshot ?? 'Unknown Product';

  const baseTitle = product.title ?? item.titleSnapshot ?? 'Product';
  if (variantId && product.variants?.length) {
    const variant = product.variants.find((v) => v.id === variantId);
    if (variant?.title) {
      return `${baseTitle} - ${variant.title}`;
    }
  }
  return baseTitle;
}

function checkItem(item: CartItem, product: Product | null): InventoryIssue | null {
  const title = getItemTitle(item, product, item.variantId);

  // Product not found - could be deleted
  if (!product) {
    return {
      productId: item.productId,
      variantId: item.variantId,
      title,
      requestedQty: item.qty,
      availableQty: 0,
      type: 'product_unavailable',
      message: 'This product is no longer available',
    };
  }

  const { qty, status } = getVariantInventory(product, item.variantId);

  // Out of stock
  if (status === 'out_of_stock' || (typeof qty === 'number' && qty <= 0)) {
    return {
      productId: item.productId,
      variantId: item.variantId,
      title,
      requestedQty: item.qty,
      availableQty: 0,
      type: 'out_of_stock',
      message: 'This item is out of stock',
    };
  }

  // Insufficient stock (only for finite inventory)
  if (typeof qty === 'number' && item.qty > qty) {
    return {
      productId: item.productId,
      variantId: item.variantId,
      title,
      requestedQty: item.qty,
      availableQty: qty,
      type: 'insufficient_stock',
      message: qty === 0 ? 'This item is out of stock' : `Only ${qty} available`,
    };
  }

  // No issues
  return null;
}

export function useInventoryVerification({
  items,
}: UseInventoryVerificationOptions): UseInventoryVerificationResult {
  const { config } = useCedrosShop();
  const [result, setResult] = React.useState<VerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Extract unique product IDs
  const productIds = React.useMemo(() => {
    const ids = new Set<string>();
    for (const item of items) {
      ids.add(item.productId);
    }
    return Array.from(ids);
  }, [items]);

  const verify = React.useCallback(async (): Promise<VerificationResult> => {
    if (items.length === 0) {
      const emptyResult: VerificationResult = {
        ok: true,
        issues: [],
        verifiedAt: new Date(),
      };
      setResult(emptyResult);
      return emptyResult;
    }

    setIsVerifying(true);
    setError(null);

    try {
      let productMap = new Map<string, Product>();
      if (config.adapter.getProductsByIds) {
        productMap = await config.adapter.getProductsByIds(productIds);
      } else {
        // Fetch all products in parallel
        const products = await Promise.all(
          productIds.map(async (id) => {
            try {
              return await config.adapter.getProductBySlug(id);
            } catch {
              return null;
            }
          })
        );

        // Build product map
        productMap = new Map<string, Product>();
        for (const product of products) {
          if (product) {
            productMap.set(product.id, product);
            if (product.slug && product.slug !== product.id) {
              productMap.set(product.slug, product);
            }
          }
        }
      }

      // Check each cart item
      const issues: InventoryIssue[] = [];
      for (const item of items) {
        const product = productMap.get(item.productId) ?? null;
        const issue = checkItem(item, product);
        if (issue) {
          issues.push(issue);
        }
      }

      const verificationResult: VerificationResult = {
        ok: issues.length === 0,
        issues,
        verifiedAt: new Date(),
      };

      setResult(verificationResult);
      setIsVerifying(false);
      return verificationResult;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to verify inventory';
      setError(errorMsg);
      setIsVerifying(false);

      // Return a failed result
      const failedResult: VerificationResult = {
        ok: false,
        issues: [],
        verifiedAt: new Date(),
      };
      setResult(failedResult);
      return failedResult;
    }
  }, [config.adapter, items, productIds]);

  const reset = React.useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    result,
    isVerifying,
    error,
    verify,
    reset,
  };
}
