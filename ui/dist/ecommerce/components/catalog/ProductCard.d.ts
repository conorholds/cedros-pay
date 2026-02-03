import { Product, ProductVariant } from '../../types';
import { ProductCardLayout, ImageCropPosition } from '../../hooks/useStorefrontSettings';
export declare function ProductCard({ product, href, onAddToCart, onQuickView, className, layout, imageCrop, }: {
    product: Product;
    href?: string;
    onAddToCart?: (product: Product, variant: ProductVariant | null) => void;
    onQuickView?: (product: Product) => void;
    className?: string;
    /** Card layout style */
    layout?: ProductCardLayout;
    /** Image crop/focus position */
    imageCrop?: ImageCropPosition;
}): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=ProductCard.d.ts.map