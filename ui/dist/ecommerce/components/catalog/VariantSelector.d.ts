import { Product, ProductVariant } from '../../types';
export interface VariantSelectorProps {
    product: Product;
    value: {
        selectedOptions: Record<string, string>;
        variantId?: string;
    };
    onChange: (next: {
        selectedOptions: Record<string, string>;
        variant: ProductVariant | null;
    }) => void;
    className?: string;
    /** Show inventory status on options (default: true) */
    showInventory?: boolean;
    /** Disable out-of-stock options (default: false - they remain selectable but marked) */
    disableOutOfStock?: boolean;
}
export declare function VariantSelector({ product, value, onChange, className, showInventory, disableOutOfStock, }: VariantSelectorProps): import("react/jsx-runtime").JSX.Element | null;
//# sourceMappingURL=VariantSelector.d.ts.map