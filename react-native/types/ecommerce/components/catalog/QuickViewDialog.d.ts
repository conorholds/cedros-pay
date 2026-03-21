import * as React from 'react';
import { ViewStyle } from 'react-native';
import type { Product, ProductVariant } from '../../types';
export interface QuickViewDialogProps {
    product: Product | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onViewDetails?: (slug: string) => void;
    onAddToCart: (product: Product, variant: ProductVariant | null, qty: number) => void;
    style?: ViewStyle;
}
export declare function QuickViewDialog({ product, open, onOpenChange, onViewDetails, onAddToCart, style, }: QuickViewDialogProps): React.JSX.Element | null;
//# sourceMappingURL=QuickViewDialog.d.ts.map