import * as React from 'react';
import { ViewStyle } from 'react-native';
export type SortOption = 'featured' | 'priceAsc' | 'priceDesc' | 'newest' | 'bestselling';
export interface SortDropdownProps {
    value: SortOption;
    onChange: (value: SortOption) => void;
    options?: SortOption[];
    style?: ViewStyle;
}
export declare function SortDropdown({ value, onChange, options, style, }: SortDropdownProps): React.JSX.Element;
//# sourceMappingURL=SortDropdown.d.ts.map