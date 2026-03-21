import * as React from 'react';
import { ViewStyle } from 'react-native';
import type { Product, ProductVariant } from '../../types';
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
    style?: ViewStyle;
    /** Show inventory status on options (default: true) */
    showInventory?: boolean;
    /** Disable out-of-stock options (default: false - they remain selectable but marked) */
    disableOutOfStock?: boolean;
}
export declare function VariantSelector({ product, value, onChange, style, showInventory, disableOutOfStock, }: VariantSelectorProps): React.JSX.Element | null;
//# sourceMappingURL=VariantSelector.d.ts.map