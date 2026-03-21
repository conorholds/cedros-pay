import * as React from 'react';
import { ViewStyle } from 'react-native';
import type { Product } from '../../types';
import type { ProductCardLayout, ImageCropPosition } from '../../hooks/useStorefrontSettings';
export interface ProductListProps {
    products: Product[];
    onAddToCart?: (product: Product, variant: any) => void;
    onQuickView?: (product: Product) => void;
    onProductPress?: (product: Product) => void;
    style?: ViewStyle;
    /** Card layout style */
    layout?: ProductCardLayout;
    /** Image crop/focus position */
    imageCrop?: ImageCropPosition;
}
export declare function ProductList({ products, onAddToCart, onQuickView, onProductPress, style, layout, imageCrop, }: ProductListProps): React.JSX.Element;
//# sourceMappingURL=ProductList.d.ts.map