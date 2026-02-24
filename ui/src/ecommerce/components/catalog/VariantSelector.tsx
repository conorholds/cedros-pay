import * as React from 'react';
import type { Product, ProductVariant } from '../../types';
import { cn } from '../../utils/cn';
import { Button } from '../ui/button';

function getOptionNames(variants: ProductVariant[]) {
  const set = new Set<string>();
  for (const v of variants) {
    for (const k of Object.keys(v.options)) set.add(k);
  }
  return Array.from(set);
}

function getOptionValues(variants: ProductVariant[], optionName: string) {
  const set = new Set<string>();
  for (const v of variants) {
    const val = v.options[optionName];
    if (val) set.add(val);
  }
  return Array.from(set);
}

function findVariant(variants: ProductVariant[], selected: Record<string, string>) {
  return (
    variants.find((v) =>
      Object.entries(selected).every(([k, val]) => v.options[k] === val)
    ) ?? null
  );
}

/**
 * Check if a variant is out of stock
 */
function isVariantOutOfStock(variant: ProductVariant): boolean {
  if (variant.inventoryStatus === 'out_of_stock') return true;
  if (typeof variant.inventoryQuantity === 'number' && variant.inventoryQuantity <= 0) return true;
  return false;
}

/**
 * Check if a variant has low stock
 */
function isVariantLowStock(variant: ProductVariant): boolean {
  if (variant.inventoryStatus === 'low') return true;
  if (
    typeof variant.inventoryQuantity === 'number' &&
    variant.inventoryQuantity > 0 &&
    variant.inventoryQuantity <= 5
  ) {
    return true;
  }
  return false;
}

/**
 * Get inventory info for display
 */
function getInventoryInfo(variant: ProductVariant): { isOutOfStock: boolean; isLow: boolean; quantity?: number } {
  const isOutOfStock = isVariantOutOfStock(variant);
  const isLow = !isOutOfStock && isVariantLowStock(variant);
  const quantity = typeof variant.inventoryQuantity === 'number' ? variant.inventoryQuantity : undefined;
  return { isOutOfStock, isLow, quantity };
}

/**
 * Check if selecting a particular option value would lead to any in-stock variant
 */
function wouldLeadToInStockVariant(
  variants: ProductVariant[],
  currentSelected: Record<string, string>,
  optionName: string,
  optionValue: string
): boolean {
  const hypotheticalSelected = { ...currentSelected, [optionName]: optionValue };

  // Find all variants that match the hypothetical selection (partial match)
  const matchingVariants = variants.filter((v) =>
    Object.entries(hypotheticalSelected).every(([k, val]) => v.options[k] === val)
  );

  // If no matching variants, this combination doesn't exist
  if (matchingVariants.length === 0) return false;

  // Check if any matching variant is in stock
  return matchingVariants.some((v) => !isVariantOutOfStock(v));
}

export interface VariantSelectorProps {
  product: Product;
  value: { selectedOptions: Record<string, string>; variantId?: string };
  onChange: (next: { selectedOptions: Record<string, string>; variant: ProductVariant | null }) => void;
  className?: string;
  /** Show inventory status on options (default: true) */
  showInventory?: boolean;
  /** Disable out-of-stock options (default: false - they remain selectable but marked) */
  disableOutOfStock?: boolean;
}

export function VariantSelector({
  product,
  value,
  onChange,
  className,
  showInventory = true,
  disableOutOfStock = false,
}: VariantSelectorProps) {
  const variants = React.useMemo(() => product.variants ?? [], [product.variants]);
  const optionNames = React.useMemo(() => getOptionNames(variants), [variants]);

  // Get currently selected variant for inventory display
  const selectedVariant = React.useMemo(
    () => findVariant(variants, value.selectedOptions),
    [variants, value.selectedOptions]
  );

  const selectedInventory = React.useMemo(
    () => (selectedVariant ? getInventoryInfo(selectedVariant) : null),
    [selectedVariant]
  );

  if (variants.length === 0 || optionNames.length === 0) return null;

  return (
    <div className={cn('space-y-4', className)}>
      {optionNames.map((optionName) => {
        const values = getOptionValues(variants, optionName);
        const selectedValue = value.selectedOptions[optionName];

        return (
          <div key={optionName} className="space-y-2">
            <div className="flex items-baseline justify-between">
              <div className="text-sm font-medium text-neutral-950 dark:text-neutral-50">
                {optionName}
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                {selectedValue || 'Select'}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {values.map((v) => {
                const isActive = v === selectedValue;
                const hasInStockPath = wouldLeadToInStockVariant(
                  variants,
                  value.selectedOptions,
                  optionName,
                  v
                );
                const isOptionDisabled = disableOutOfStock && !hasInStockPath;

                return (
                  <Button
                    key={v}
                    type="button"
                    size="sm"
                    variant={isActive ? 'default' : 'outline'}
                    onClick={() => {
                      const nextSelected = { ...value.selectedOptions, [optionName]: v };
                      const variant = findVariant(variants, nextSelected);
                      onChange({ selectedOptions: nextSelected, variant });
                    }}
                    aria-pressed={isActive}
                    disabled={isOptionDisabled}
                    className={cn(
                      !hasInStockPath && !isOptionDisabled && 'opacity-50 line-through'
                    )}
                  >
                    {v}
                    {!hasInStockPath && !isOptionDisabled && (
                      <span className="ml-1 text-[10px] opacity-70">(Out)</span>
                    )}
                  </Button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Selected variant inventory status */}
      {showInventory && selectedVariant && selectedInventory && (
        <div className="pt-2">
          {selectedInventory.isOutOfStock ? (
            <div className="text-sm font-medium text-red-600 dark:text-red-400">
              Out of stock
            </div>
          ) : selectedInventory.isLow && selectedInventory.quantity !== undefined ? (
            <div className="text-sm text-amber-600 dark:text-amber-400">
              Only <span className="font-semibold">{selectedInventory.quantity}</span> left
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
