import * as React from 'react';
import { ViewStyle } from 'react-native';
import type { Product } from '../../types';
import type { ProductCardLayout, ImageCropPosition } from '../../hooks/useStorefrontSettings';
export interface ProductGridProps {
    products: Product[];
    columns?: {
        base?: number;
        md?: number;
        lg?: number;
    };
    onAddToCart?: (product: Product, variant: any) => void;
    onQuickView?: (product: Product) => void;
    onProductPress?: (product: Product) => void;
    style?: ViewStyle;
    /** Card layout style */
    layout?: ProductCardLayout;
    /** Image crop/focus position */
    imageCrop?: ImageCropPosition;
}
export declare function ProductGrid({ products, columns, onAddToCart, onQuickView, onProductPress, style, layout, imageCrop, }: ProductGridProps): React.JSX.Element;
//# sourceMappingURL=ProductGrid.d.ts.map