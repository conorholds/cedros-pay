import * as React from 'react';
import { ViewStyle } from 'react-native';
import type { Category } from '../../types';
export interface CategoryNavProps {
    categories: Category[];
    activeSlug?: string;
    onSelect?: (category: Category) => void;
    style?: ViewStyle;
}
export declare function CategoryNav({ categories, activeSlug, onSelect, style, }: CategoryNavProps): React.JSX.Element;
//# sourceMappingURL=CategoryNav.d.ts.map