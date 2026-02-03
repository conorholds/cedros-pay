import { ProductVariant, ProductVariationConfig } from '../../ecommerce/types';
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
export declare function VariantInventoryGrid({ variationConfig, variants, onChange, defaultPrice, currencySymbol, maxVariants, disabled, }: VariantInventoryGridProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=VariantInventoryGrid.d.ts.map