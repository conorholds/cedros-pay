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
export declare function FilterPanel({ facets, value, onChange, onClear, className, enabledFilters, }: {
    facets: CatalogFacets;
    value: CatalogFilters;
    onChange: (next: CatalogFilters) => void;
    onClear: () => void;
    className?: string;
    /** Which filters to show (defaults to all) */
    enabledFilters?: EnabledFilters;
}): import("react/jsx-runtime").JSX.Element | null;
//# sourceMappingURL=FilterPanel.d.ts.map