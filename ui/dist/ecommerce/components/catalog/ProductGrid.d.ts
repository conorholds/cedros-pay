import { Product } from '../../types';
import { ProductCardLayout, ImageCropPosition } from '../../hooks/useStorefrontSettings';
import { ProductCard } from './ProductCard';
export declare function ProductGrid({ products, columns, onAddToCart, onQuickView, getProductHref, className, layout, imageCrop, }: {
    products: Product[];
    columns?: {
        base?: number;
        md?: number;
        lg?: number;
    };
    onAddToCart?: Parameters<typeof ProductCard>[0]['onAddToCart'];
    onQuickView?: (product: Product) => void;
    getProductHref?: (product: Product) => string;
    className?: string;
    /** Card layout style */
    layout?: ProductCardLayout;
    /** Image crop/focus position */
    imageCrop?: ImageCropPosition;
}): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=ProductGrid.d.ts.map