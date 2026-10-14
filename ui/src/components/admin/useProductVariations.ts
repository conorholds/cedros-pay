/**
 * Hook for fetching and saving product variations via admin API
 */

import { useState, useCallback } from 'react';
import type { ProductVariant, ProductVariationConfig } from '../../types/productVariations';
import type { IAdminAuthManager } from './AdminAuthManager';
import { fetchAdminJson, requireAdminAuth } from './authFetch';

export interface ProductVariationsData {
  productId: string;
  variationConfig: ProductVariationConfig;
  variants: ProductVariant[];
}

export interface SaveVariationsPayload {
  variationConfig: ProductVariationConfig;
  /** If true, generates all possible variant combinations */
  generateAll?: boolean;
  /** Specific variants to create */
  createVariants?: Array<{
    optionValueIds: string[];
    inventoryQuantity?: number;
    sku?: string;
    price?: number;
  }>;
  /** Variants to update (by ID) */
  updateVariants?: Array<{
    id: string;
    inventoryQuantity?: number;
    sku?: string;
    price?: number;
    inventoryStatus?: string;
  }>;
  /** Variant IDs to delete */
  deleteVariantIds?: string[];
}

export interface SaveVariationsResult {
  variationConfig: ProductVariationConfig;
  variants: ProductVariant[];
  variantsCreated: number;
}

export interface UseProductVariationsOptions {
  productId: string;
  authManager?: IAdminAuthManager;
}

/** Bulk inventory update item */
export interface BulkInventoryUpdate {
  variantId: string;
  inventoryQuantity: number;
  inventoryStatus?: 'in_stock' | 'low' | 'out_of_stock' | 'backorder';
}

export interface UseProductVariationsResult {
  data: ProductVariationsData | null;
  isLoading: boolean;
  error: string | null;
  fetch: () => Promise<void>;
  save: (payload: SaveVariationsPayload) => Promise<SaveVariationsResult | null>;
  /** Bulk update variant inventory without modifying variation config */
  bulkUpdateInventory: (updates: BulkInventoryUpdate[]) => Promise<boolean>;
  isSaving: boolean;
}

export function useProductVariations({
  productId,
  authManager,
}: UseProductVariationsOptions): UseProductVariationsResult {
  const [data, setData] = useState<ProductVariationsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVariations = useCallback(async () => {
    if (!productId) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchAdminJson<ProductVariationsData>(
        authManager,
        `/admin/products/${productId}/variations`
      );

      // Ensure variationConfig exists with defaults
      if (!result.variationConfig) {
        result.variationConfig = { variationTypes: [] };
      }
      if (!result.variants) {
        result.variants = [];
      }

      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch variations';
      setError(message);
      // Set empty defaults on error
      setData({
        productId,
        variationConfig: { variationTypes: [] },
        variants: [],
      });
    } finally {
      setIsLoading(false);
    }
  }, [productId, authManager]);

  const saveVariations = useCallback(
    async (payload: SaveVariationsPayload): Promise<SaveVariationsResult | null> => {
      if (!productId) return null;

      setIsSaving(true);
      setError(null);

      try {
        const result = await requireAdminAuth(authManager).fetchWithAuth<{
          variationConfig: ProductVariationConfig;
          variants: ProductVariant[];
          variantsCreated: number;
        }>(
          `/admin/products/${productId}/variations`,
          {
            method: 'PUT',
            body: JSON.stringify(payload),
          }
        );

        const saved = {
          variationConfig: result.variationConfig,
          variants: result.variants,
          variantsCreated: result.variantsCreated,
        };

        // Update local state with response
        setData({
          productId,
          variationConfig: saved.variationConfig,
          variants: saved.variants,
        });

        return saved;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save variations';
        setError(message);
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [productId, authManager]
  );

  const bulkUpdateInventory = useCallback(
    async (updates: BulkInventoryUpdate[]): Promise<boolean> => {
      if (!productId || updates.length === 0) return false;

      setIsSaving(true);
      setError(null);

      try {
        await requireAdminAuth(authManager).fetchWithAuth(
          `/admin/products/${productId}/variants/inventory`,
          {
            method: 'PUT',
            body: JSON.stringify({ updates }),
          }
        );

        if (data) {
          const updatesMap = new Map(updates.map((u) => [u.variantId, u]));
          setData({
            ...data,
            variants: data.variants.map((v) => {
              const update = updatesMap.get(v.id);
              if (update) {
                return {
                  ...v,
                  inventoryQuantity: update.inventoryQuantity,
                  inventoryStatus: update.inventoryStatus ?? v.inventoryStatus,
                };
              }
              return v;
            }),
          });
        }

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update inventory';
        setError(message);
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [productId, authManager, data]
  );

  return {
    data,
    isLoading,
    error,
    fetch: fetchVariations,
    save: saveVariations,
    bulkUpdateInventory,
    isSaving,
  };
}
