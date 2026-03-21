import * as React from 'react';
import { ViewStyle } from 'react-native';
import type { Product, ProductVariant } from '../../types';
import type { ProductCardLayout, ImageCropPosition } from '../../hooks/useStorefrontSettings';
export interface ProductCardProps {
    product: Product;
    onPress?: () => void;
    onAddToCart?: (product: Product, variant: ProductVariant | null) => void;
    onQuickView?: (product: Product) => void;
    style?: ViewStyle;
    /** Card layout style */
    layout?: ProductCardLayout;
    /** Image crop/focus position - mapped to resizeMode */
    imageCrop?: ImageCropPosition;
}
export declare function ProductCard({ product, onPress, onAddToCart, onQuickView, style, layout, imageCrop, }: ProductCardProps): React.JSX.Element;
//# sourceMappingURL=ProductCard.d.ts.map