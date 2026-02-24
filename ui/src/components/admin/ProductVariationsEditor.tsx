/**
 * ProductVariationsEditor - Integrated admin component for product variations
 *
 * Combines VariationTypeEditor and VariantInventoryGrid with the useProductVariations
 * hook to provide a complete variation management experience.
 */

import { useEffect, useCallback, useState } from 'react';
import type { ProductVariationConfig, ProductVariant } from '../../ecommerce/types';
import type { IAdminAuthManager } from './AdminAuthManager';
import { useProductVariations } from './useProductVariations';
import { VariationTypeEditor } from './VariationTypeEditor';
import { VariantInventoryGrid } from './VariantInventoryGrid';
import { Icons } from './icons';

export interface ProductVariationsEditorProps {
  serverUrl: string;
  productId: string;
  productTitle?: string;
  defaultPrice?: number;
  currencySymbol?: string;
  /** @deprecated Use authManager instead */
  apiKey?: string;
  authManager?: IAdminAuthManager;
  onClose?: () => void;
}

export function ProductVariationsEditor({
  serverUrl,
  productId,
  productTitle,
  defaultPrice = 0,
  currencySymbol = '$',
  apiKey,
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
  } = useProductVariations({ serverUrl, productId, apiKey, authManager });

  // Local state for editing (before save)
  const [localConfig, setLocalConfig] = useState<ProductVariationConfig>({ variationTypes: [] });
  const [localVariants, setLocalVariants] = useState<ProductVariant[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Fetch on mount
  useEffect(() => {
    fetchVariations();
  }, [fetchVariations]);

  // Sync local state when data loads
  useEffect(() => {
    if (data) {
      setLocalConfig(data.variationConfig);
      setLocalVariants(data.variants);
      setHasChanges(false);
    }
  }, [data]);

  const handleConfigChange = useCallback((config: ProductVariationConfig) => {
    setLocalConfig(config);
    setHasChanges(true);
    setSaveSuccess(false);
  }, []);

  const handleVariantsChange = useCallback((variants: ProductVariant[]) => {
    setLocalVariants(variants);
    setHasChanges(true);
    setSaveSuccess(false);
  }, []);

  const handleSave = useCallback(async () => {
    // Determine which variants are new vs updated
    const existingIds = new Set((data?.variants ?? []).map((v) => v.id));
    const newVariants = localVariants.filter((v) => !existingIds.has(v.id));
    const updatedVariants = localVariants.filter((v) => existingIds.has(v.id));
    const deletedIds = (data?.variants ?? [])
      .filter((v) => !localVariants.some((lv) => lv.id === v.id))
      .map((v) => v.id);

    const result = await saveVariations({
      variationConfig: localConfig,
      createVariants: newVariants.map((v) => ({
        optionValueIds: v.optionValueIds ?? [],
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
      setHasChanges(false);
      setSaveSuccess(true);
      // Clear success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  }, [localConfig, localVariants, data?.variants, saveVariations]);

  if (isLoading) {
    return (
      <div className="cedros-admin__variations-editor">
        <div className="cedros-admin__variations-editor-header">
          <h3 className="cedros-admin__section-title">
            {productTitle ? `Variations: ${productTitle}` : 'Product Variations'}
          </h3>
          {onClose && (
            <button
              type="button"
              className="cedros-admin__button cedros-admin__button--ghost"
              onClick={onClose}
            >
              {Icons.close}
            </button>
          )}
        </div>
        <div className="cedros-admin__loading">{Icons.loading} Loading variations...</div>
      </div>
    );
  }

  return (
    <div className="cedros-admin__variations-editor">
      <div className="cedros-admin__variations-editor-header">
        <h3 className="cedros-admin__section-title">
          {productTitle ? `Variations: ${productTitle}` : 'Product Variations'}
        </h3>
        <div className="cedros-admin__variations-editor-actions">
          {saveSuccess && (
            <span className="cedros-admin__success-text">
              {Icons.check} Saved
            </span>
          )}
          {hasChanges && (
            <span className="cedros-admin__unsaved-text">Unsaved changes</span>
          )}
          <button
            type="button"
            className="cedros-admin__button cedros-admin__button--primary"
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
          {onClose && (
            <button
              type="button"
              className="cedros-admin__button cedros-admin__button--ghost"
              onClick={onClose}
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
