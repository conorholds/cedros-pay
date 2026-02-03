import { Product, ProductVariant } from '../../types';
export declare function QuickViewDialog({ product, open, onOpenChange, productHref, onAddToCart, className, }: {
    product: Product | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    productHref?: (slug: string) => string;
    onAddToCart: (product: Product, variant: ProductVariant | null, qty: number) => void;
    className?: string;
}): import("react/jsx-runtime").JSX.Element | null;
//# sourceMappingURL=QuickViewDialog.d.ts.map