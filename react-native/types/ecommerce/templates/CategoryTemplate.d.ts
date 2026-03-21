import * as React from 'react';
import { ViewStyle } from 'react-native';
import type { Product } from '../types';
export interface CategoryTemplateProps {
    categorySlug: string;
    style?: ViewStyle;
    onNavigateToShop?: () => void;
    onNavigateToProduct?: (product: Product) => void;
    onNavigateToCheckout?: () => void;
}
export declare function CategoryTemplate({ categorySlug, style, onNavigateToShop, onNavigateToProduct, onNavigateToCheckout, }: CategoryTemplateProps): React.JSX.Element;
//# sourceMappingURL=CategoryTemplate.d.ts.map