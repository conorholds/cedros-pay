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
export interface FilterSidebarProps {
    facets: CatalogFacets;
    value: CatalogFilters;
    onChange: (next: CatalogFilters) => void;
    onClear: () => void;
    style?: ViewStyle;
    /** Which filters to show (defaults to all) */
    enabledFilters?: EnabledFilters;
}
/**
 * FilterSidebar - A sidebar-style filter panel for mobile/drawer use.
 * Alias for FilterPanel with a different name for semantic purposes.
 */
export declare function FilterSidebar({ facets, value, onChange, onClear, style, enabledFilters, }: FilterSidebarProps): React.JSX.Element | null;
//# sourceMappingURL=FilterSidebar.d.ts.map