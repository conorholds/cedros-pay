import { CatalogFilters } from '../components/catalog/FilterPanel';
export type CatalogUrlState = {
    search: string;
    sort: string;
    page: number;
    category?: string;
    filters: CatalogFilters;
};
export declare function readCatalogUrlState({ includeCategory }: {
    includeCategory: boolean;
}): CatalogUrlState | null;
export declare function useCatalogUrlSync(state: CatalogUrlState, { includeCategory }: {
    includeCategory: boolean;
}): void;
//# sourceMappingURL=useCatalogUrlState.d.ts.map