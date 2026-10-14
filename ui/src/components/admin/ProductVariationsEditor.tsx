/**
 * ProductVariationsEditor - Integrated admin component for product variations
 *
 * Combines VariationTypeEditor and VariantInventoryGrid with the useProductVariations
 * hook to provide a complete variation management experience.
 */

import { useEffect, useCallback, useState } from 'react';
import type { ProductVariationConfig, ProductVariant } from '../../types/productVariations';
import type { IAdminAuthManager } from './AdminAuthManager';
import { useProductVariations } from './useProductVariations';
import { VariationTypeEditor } from './VariationTypeEditor';
import { VariantInventoryGrid } from './VariantInventoryGrid';
import { Icons } from './icons';
import { AutosaveStatusIndicator, type CedrosAutosaveState } from '../../autosave';
import { LoadingState } from './LoadingState';
import { useAutosave } from './useAutosave';

export interface ProductVariationsEditorProps {
  productId: string;
  productTitle?: string;
  defaultPrice?: number;
  currencySymbol?: string;
  authManager?: IAdminAuthManager;
  onClose?: () => void;
}

function statusClass(status: CedrosAutosaveState): string {
  if (status === 'failed') return 'error';
  return status;
}

export function ProductVariationsEditor({
  productId,
  productTitle,
  defaultPrice = 0,
  currencySymbol = '$',
  authManager,
  onClose,
}: ProductVariationsEditorProps) {
  const {
    data,
    isLoading,
    error,
    fetch: fetchVariations,
    save: saveVariations,
    isSaving,
  } = useProductVariations({ productId, authManager });

  // Local state for editing (before save)
  const [localConfig, setLocalConfig] = useState<ProductVariationConfig>({ variationTypes: [] });
  const [localVariants, setLocalVariants] = useState<ProductVariant[]>([]);

  // Fetch on mount
  useEffect(() => {
    fetchVariations();
  }, [fetchVariations]);

  // Sync local state when data loads
  useEffect(() => {
    if (data) {
      setLocalConfig(data.variationConfig);
      setLocalVariants(data.variants);
    }
  }, [data]);

  const handleConfigChange = useCallback((config: ProductVariationConfig) => {
    setLocalConfig(config);
  }, []);

  const handleVariantsChange = useCallback((variants: ProductVariant[]) => {
    setLocalVariants(variants);
  }, []);

  const saveDraft = useCallback(async () => {
    const existingIds = new Set((data?.variants ?? []).map((v) => v.id));
    const newVariants = localVariants.filter((v) => !existingIds.has(v.id));
    const updatedVariants = localVariants.filter((v) => existingIds.has(v.id));
    const deletedIds = (data?.variants ?? [])
      .filter((v) => !localVariants.some((lv) => lv.id === v.id))
      .map((v) => v.id);

    const result = await saveVariations({
      variationConfig: localConfig,
      createVariants: newVariants.map((v) => ({
        optionValueIds: v.optionValueIds,
        inventoryQuantity: v.inventoryQuantity,
        sku: v.sku,
        price: v.price,
      })),
      updateVariants: updatedVariants.map((v) => ({
        id: v.id,
        inventoryQuantity: v.inventoryQuantity,
        sku: v.sku,
        price: v.price,
        inventoryStatus: v.inventoryStatus,
      })),
      deleteVariantIds: deletedIds.length > 0 ? deletedIds : undefined,
    });

    if (result) {
      return {
        canonicalDraftKey: JSON.stringify({
          localConfig: result.variationConfig,
          localVariants: result.variants,
        }),
      };
    }
    throw new Error('Failed to save variations');
  }, [localConfig, localVariants, data?.variants, saveVariations]);

  const saveStatus = useAutosave(
    JSON.stringify({ localConfig, localVariants }),
    saveDraft,
    {
      ready: !isLoading && Boolean(data),
      delayMs: 600,
      resourceType: 'product-variations',
      resourceId: productId,
      extensionId: 'cedros-pay',
    }
  );

  if (isLoading) {
    return (
      <div className="cedros-admin__variations-editor">
        <div className="cedros-admin__variations-editor-header">
          <h3 id="cedros-pay-product-variations-title" className="cedros-admin__section-title">
            {productTitle ? `Variations: ${productTitle}` : 'Product variations'}
          </h3>
          {onClose && (
            <button
              type="button"
              className="cedros-data-btn cedros-admin__button cedros-data-btn--ghost cedros-admin__button--ghost"
              onClick={onClose}
              aria-label="Close product variations"
              title="Close"
            >
              {Icons.close}
            </button>
          )}
        </div>
        <LoadingState label="Loading variations…" />
      </div>
    );
  }

  return (
    <div className="cedros-admin__variations-editor">
      <div className="cedros-admin__variations-editor-header">
        <h3 id="cedros-pay-product-variations-title" className="cedros-admin__section-title">
          {productTitle ? `Variations: ${productTitle}` : 'Product variations'}
        </h3>
        <div className="cedros-admin__variations-editor-actions">
          <AutosaveStatusIndicator
            status={saveStatus}
            className={`cedros-admin__autosave-indicator cedros-admin__autosave-indicator--${statusClass(saveStatus)}`}
          />
          {onClose && (
            <button
              type="button"
              className="cedros-data-btn cedros-admin__button cedros-data-btn--ghost cedros-admin__button--ghost"
              onClick={onClose}
              aria-label="Close product variations"
              title="Close"
            >
              {Icons.close}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="cedros-admin__error-banner">
          {error}
        </div>
      )}

      <div className="cedros-admin__variations-editor-content">
        <div className="cedros-admin__variations-editor-section">
          <VariationTypeEditor
            value={localConfig}
            onChange={handleConfigChange}
            disabled={isSaving}
          />
        </div>

        {localConfig.variationTypes.length > 0 && (
          <div className="cedros-admin__variations-editor-section">
            <VariantInventoryGrid
              variationConfig={localConfig}
              variants={localVariants}
              onChange={handleVariantsChange}
              defaultPrice={defaultPrice}
              currencySymbol={currencySymbol}
              disabled={isSaving}
            />
          </div>
        )}
      </div>
    </div>
  );
}
