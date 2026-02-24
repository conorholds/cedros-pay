/**
 * VariantInventoryGrid - Admin component for managing variant inventory
 *
 * Shows a grid/matrix of all product variants with editable inventory,
 * price, and SKU fields. Supports creating variants for unconfigured
 * combinations and bulk "Generate All" action.
 */

import { useMemo, useCallback } from 'react';
import type {
  ProductVariant,
  ProductVariationConfig,
  VariationType,
} from '../../ecommerce/types';
import { Icons } from './icons';
import { FilterDropdown } from './Dropdown';

export interface VariantInventoryGridProps {
  /** Variation config with types and values */
  variationConfig: ProductVariationConfig;
  /** Existing variants */
  variants: ProductVariant[];
  /** Called when variants change */
  onChange: (variants: ProductVariant[]) => void;
  /** Default price for new variants */
  defaultPrice?: number;
  /** Currency symbol for display */
  currencySymbol?: string;
  /** Max variants allowed (default: 100) */
  maxVariants?: number;
  /** Whether editing is disabled */
  disabled?: boolean;
}

interface VariantCombination {
  /** Combination key (sorted value IDs joined) */
  key: string;
  /** Human-readable title */
  title: string;
  /** Map of type ID to value ID */
  optionValueIds: string[];
  /** Map of type name to value label */
  options: Record<string, string>;
}

function generateVariantId(): string {
  return `variant_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Generate all possible combinations from variation types
 */
function generateCombinations(types: VariationType[]): VariantCombination[] {
  if (types.length === 0) return [];

  const sortedTypes = [...types].sort((a, b) => a.displayOrder - b.displayOrder);

  const combine = (
    typeIndex: number,
    current: { valueIds: string[]; options: Record<string, string> }
  ): VariantCombination[] => {
    if (typeIndex >= sortedTypes.length) {
      const key = current.valueIds.sort().join('|');
      const title = Object.values(current.options).join(' / ');
      return [
        {
          key,
          title,
          optionValueIds: [...current.valueIds],
          options: { ...current.options },
        },
      ];
    }

    const varType = sortedTypes[typeIndex];
    const results: VariantCombination[] = [];

    for (const val of varType.values) {
      results.push(
        ...combine(typeIndex + 1, {
          valueIds: [...current.valueIds, val.id],
          options: { ...current.options, [varType.name]: val.label },
        })
      );
    }

    return results;
  };

  return combine(0, { valueIds: [], options: {} });
}

/**
 * Get combination key for a variant
 */
function getVariantKey(variant: ProductVariant): string {
  if (variant.optionValueIds?.length) {
    return [...variant.optionValueIds].sort().join('|');
  }
  // Fallback for legacy variants without optionValueIds
  return Object.entries(variant.options)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join('|');
}

export function VariantInventoryGrid({
  variationConfig,
  variants,
  onChange,
  defaultPrice = 0,
  currencySymbol = '$',
  maxVariants = 100,
  disabled = false,
}: VariantInventoryGridProps) {
  // Generate all possible combinations
  const allCombinations = useMemo(
    () => generateCombinations(variationConfig.variationTypes),
    [variationConfig.variationTypes]
  );

  // Map existing variants by their combination key
  const variantsByKey = useMemo(() => {
    const map = new Map<string, ProductVariant>();
    for (const v of variants) {
      map.set(getVariantKey(v), v);
    }
    return map;
  }, [variants]);

  // Split into existing and possible (uncreated) combinations
  const { existingRows, possibleRows } = useMemo(() => {
    const existing: { combo: VariantCombination; variant: ProductVariant }[] = [];
    const possible: VariantCombination[] = [];

    for (const combo of allCombinations) {
      const variant = variantsByKey.get(combo.key);
      if (variant) {
        existing.push({ combo, variant });
      } else {
        possible.push(combo);
      }
    }

    return { existingRows: existing, possibleRows: possible };
  }, [allCombinations, variantsByKey]);

  const handleUpdateVariant = useCallback(
    (variantId: string, updates: Partial<ProductVariant>) => {
      onChange(
        variants.map((v) => (v.id === variantId ? { ...v, ...updates } : v))
      );
    },
    [variants, onChange]
  );

  const handleRemoveVariant = useCallback(
    (variantId: string) => {
      onChange(variants.filter((v) => v.id !== variantId));
    },
    [variants, onChange]
  );

  const handleCreateVariant = useCallback(
    (combo: VariantCombination) => {
      if (variants.length >= maxVariants) return;

      const newVariant: ProductVariant = {
        id: generateVariantId(),
        title: combo.title,
        options: combo.options,
        optionValueIds: combo.optionValueIds,
        price: defaultPrice,
        inventoryQuantity: 0,
        inventoryStatus: 'in_stock',
        autoGenerated: false,
      };

      onChange([...variants, newVariant]);
    },
    [variants, onChange, maxVariants, defaultPrice]
  );

  const handleGenerateAll = useCallback(() => {
    const remaining = maxVariants - variants.length;
    const toCreate = possibleRows.slice(0, remaining);

    const newVariants: ProductVariant[] = toCreate.map((combo) => ({
      id: generateVariantId(),
      title: combo.title,
      options: combo.options,
      optionValueIds: combo.optionValueIds,
      price: defaultPrice,
      inventoryQuantity: 0,
      inventoryStatus: 'in_stock',
      autoGenerated: true,
    }));

    onChange([...variants, ...newVariants]);
  }, [variants, onChange, possibleRows, maxVariants, defaultPrice]);

  if (variationConfig.variationTypes.length === 0) {
    return (
      <div className="cedros-admin__variant-grid-empty">
        Add variation types above to create product variants.
      </div>
    );
  }

  if (allCombinations.length === 0) {
    return (
      <div className="cedros-admin__variant-grid-empty">
        Add values to your variation types to create product variants.
      </div>
    );
  }

  return (
    <div className="cedros-admin__variant-grid">
      <div className="cedros-admin__variant-grid-header">
        <h4 className="cedros-admin__field-label" style={{ marginBottom: 0 }}>
          Variants
        </h4>
        <span style={{ fontSize: 12, opacity: 0.7 }}>
          {variants.length}/{maxVariants} variants ({allCombinations.length}{' '}
          possible)
        </span>
      </div>

      {possibleRows.length > 0 && variants.length < maxVariants && (
        <div className="cedros-admin__variant-grid-actions">
          <button
            type="button"
            className="cedros-admin__button cedros-admin__button--secondary"
            onClick={handleGenerateAll}
            disabled={disabled}
          >
            Generate All ({Math.min(possibleRows.length, maxVariants - variants.length)})
          </button>
          <span style={{ fontSize: 11, opacity: 0.7 }}>
            Creates variants with default price and 0 inventory
          </span>
        </div>
      )}

      <div className="cedros-admin__table-container">
        <table className="cedros-admin__table cedros-admin__variant-table">
          <thead>
            <tr>
              <th>Variant</th>
              <th style={{ width: 100 }}>Price</th>
              <th style={{ width: 80 }}>Qty</th>
              <th style={{ width: 100 }}>SKU</th>
              <th style={{ width: 100 }}>Status</th>
              <th style={{ width: 80 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {existingRows.map(({ combo, variant }) => (
              <tr key={variant.id}>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600 }}>{combo.title}</span>
                    <span style={{ fontSize: 11, opacity: 0.6 }}>
                      {Object.entries(combo.options)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(', ')}
                    </span>
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>{currencySymbol}</span>
                    <input
                      type="number"
                      className="cedros-admin__input cedros-admin__input--sm"
                      value={variant.price ?? ''}
                      onChange={(e) =>
                        handleUpdateVariant(variant.id, {
                          price:
                            e.target.value === ''
                              ? undefined
                              : parseFloat(e.target.value) || 0,
                        })
                      }
                      disabled={disabled}
                      min="0"
                      step="0.01"
                      style={{ width: 70 }}
                    />
                  </div>
                </td>
                <td>
                  <input
                    type="number"
                    className="cedros-admin__input cedros-admin__input--sm"
                    value={variant.inventoryQuantity ?? ''}
                    onChange={(e) =>
                      handleUpdateVariant(variant.id, {
                        inventoryQuantity:
                          e.target.value === ''
                            ? undefined
                            : parseInt(e.target.value) || 0,
                      })
                    }
                    disabled={disabled}
                    min="0"
                    style={{ width: 60 }}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    className="cedros-admin__input cedros-admin__input--sm"
                    value={variant.sku ?? ''}
                    onChange={(e) =>
                      handleUpdateVariant(variant.id, {
                        sku: e.target.value || undefined,
                      })
                    }
                    disabled={disabled}
                    placeholder="SKU"
                    style={{ width: 80 }}
                  />
                </td>
                <td>
                  <FilterDropdown
                    value={variant.inventoryStatus ?? 'in_stock'}
                    onChange={(val) =>
                      handleUpdateVariant(variant.id, {
                        inventoryStatus: val as ProductVariant['inventoryStatus'],
                      })
                    }
                    options={[
                      { value: 'in_stock', label: 'In stock' },
                      { value: 'low', label: 'Low' },
                      { value: 'out_of_stock', label: 'Out of stock' },
                      { value: 'backorder', label: 'Backorder' },
                    ]}
                    disabled={disabled}
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="cedros-admin__button cedros-admin__button--ghost cedros-admin__button--icon cedros-admin__button--danger"
                    onClick={() => handleRemoveVariant(variant.id)}
                    disabled={disabled}
                    title="Remove variant"
                  >
                    {Icons.trash}
                  </button>
                </td>
              </tr>
            ))}

            {possibleRows.length > 0 && variants.length < maxVariants && (
              <>
                <tr className="cedros-admin__variant-separator">
                  <td colSpan={6}>
                    <span style={{ fontSize: 11, opacity: 0.6 }}>
                      Uncreated combinations ({possibleRows.length})
                    </span>
                  </td>
                </tr>
                {possibleRows.slice(0, 10).map((combo) => (
                  <tr key={combo.key} className="cedros-admin__variant-possible">
                    <td>
                      <span style={{ opacity: 0.6 }}>{combo.title}</span>
                    </td>
                    <td colSpan={4} style={{ opacity: 0.5 }}>
                      Not created
                    </td>
                    <td>
                      <button
                        type="button"
                        className="cedros-admin__button cedros-admin__button--ghost cedros-admin__button--icon"
                        onClick={() => handleCreateVariant(combo)}
                        disabled={disabled}
                        title="Create variant"
                      >
                        {Icons.plus}
                      </button>
                    </td>
                  </tr>
                ))}
                {possibleRows.length > 10 && (
                  <tr className="cedros-admin__variant-more">
                    <td colSpan={6} style={{ textAlign: 'center', opacity: 0.6 }}>
                      +{possibleRows.length - 10} more combinations
                    </td>
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
