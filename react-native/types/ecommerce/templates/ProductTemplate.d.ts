import * as React from 'react';
import { ViewStyle } from 'react-native';
import type { Product } from '../types';
export interface ProductTemplateProps {
    slug: string;
    style?: ViewStyle;
    onNavigateToCheckout?: () => void;
    onNavigateToCart?: () => void;
    onNavigateToProduct?: (product: Product) => void;
}
export declare function ProductTemplate({ slug, style, onNavigateToCheckout, onNavigateToProduct, }: ProductTemplateProps): React.JSX.Element;
//# sourceMappingURL=ProductTemplate.d.ts.map