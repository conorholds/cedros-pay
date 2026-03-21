import * as React from 'react';
import { ViewStyle } from 'react-native';
import type { Product } from '../types';
export interface ShopTemplateProps {
    style?: ViewStyle;
    initialCategorySlug?: string;
    onNavigateToProduct?: (product: Product) => void;
    onNavigateToCheckout?: () => void;
}
export declare function ShopTemplate({ style, initialCategorySlug, onNavigateToProduct, onNavigateToCheckout, }: ShopTemplateProps): React.JSX.Element;
//# sourceMappingURL=ShopTemplate.d.ts.map