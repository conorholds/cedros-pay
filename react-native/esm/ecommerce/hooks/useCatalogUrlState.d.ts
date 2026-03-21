import type { CatalogFilters } from '../components/catalog/FilterPanel';
export type CatalogUrlState = {
    search: string;
    sort: string;
    page: number;
    category?: string;
    filters: CatalogFilters;
};
export interface ReadCatalogUrlStateOptions {
    /** The URL string to parse (e.g., from React Native Linking or deep linking) */
    url: string;
    includeCategory: boolean;
}
/**
 * Reads catalog state from a URL string.
 * In React Native, provide the URL from Linking or deep linking handlers.
 */
export declare function readCatalogUrlState({ url, includeCategory }: ReadCatalogUrlStateOptions): CatalogUrlState | null;
export interface BuildCatalogUrlOptions {
    baseUrl: string;
    state: CatalogUrlState;
    includeCategory: boolean;
}
/**
 * Builds a catalog URL with query parameters.
 * Use this with React Native navigation or Linking.openURL().
 */
export declare function buildCatalogUrl({ baseUrl, state, includeCategory }: BuildCatalogUrlOptions): string;
export interface UseCatalogUrlSyncOptions {
    /**
     * Callback when URL state changes. Use this for React Native navigation.
     * The callback receives the new URL with updated query parameters.
     */
    onStateChange?: (url: string) => void;
    /**
     * Base URL for building the catalog URL (without query params).
     */
    baseUrl: string;
    includeCategory: boolean;
}
/**
 * Hook to sync catalog state with URL parameters.
 * In React Native, use the onStateChange callback to update navigation state.
 * Browser history manipulation is not supported in React Native.
 */
export declare function useCatalogUrlSync(state: CatalogUrlState, { onStateChange, baseUrl, includeCategory }: UseCatalogUrlSyncOptions): void;
//# sourceMappingURL=useCatalogUrlState.d.ts.map