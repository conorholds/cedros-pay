import * as React from 'react';
import { ViewStyle } from 'react-native';
export type CatalogFilters = {
    tags?: string[];
    priceMin?: number;
    priceMax?: number;
    inStock?: boolean;
};
export type CatalogFacets = {
    tags?: string[];
    price?: {
        min: number;
        max: number;
    };
};
/** Which filters are enabled/visible */
export type EnabledFilters = {
    tags?: boolean;
    priceRange?: boolean;
    inStock?: boolean;
};
export interface FilterPanelProps {
    facets: CatalogFacets;
    value: CatalogFilters;
    onChange: (next: CatalogFilters) => void;
    onClear: () => void;
    style?: ViewStyle;
    /** Which filters to show (defaults to all) */
    enabledFilters?: EnabledFilters;
}
export declare function FilterPanel({ facets, value, onChange, onClear, style, enabledFilters, }: FilterPanelProps): React.JSX.Element | null;
//# sourceMappingURL=FilterPanel.d.ts.map