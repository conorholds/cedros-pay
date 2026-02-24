import * as React from 'react';
import type { CatalogFilters } from '../components/catalog/FilterPanel';

export type CatalogUrlState = {
  search: string;
  sort: string;
  page: number;
  category?: string;
  filters: CatalogFilters;
};

function parseNumber(value: string | null): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function parseFilters(params: URLSearchParams): CatalogFilters {
  const tagsRaw = params.get('tags');
  const tags = tagsRaw
    ? tagsRaw
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    : undefined;

  const priceMin = parseNumber(params.get('min'));
  const priceMax = parseNumber(params.get('max'));
  const inStockRaw = params.get('inStock');
  const inStock = inStockRaw === '1' ? true : inStockRaw === '0' ? false : undefined;

  return {
    tags: tags && tags.length ? tags : undefined,
    priceMin,
    priceMax,
    inStock,
  };
}

function writeFilters(params: URLSearchParams, filters: CatalogFilters) {
  if (filters.tags?.length) params.set('tags', filters.tags.join(','));
  else params.delete('tags');

  if (typeof filters.priceMin === 'number') params.set('min', String(filters.priceMin));
  else params.delete('min');

  if (typeof filters.priceMax === 'number') params.set('max', String(filters.priceMax));
  else params.delete('max');

  if (typeof filters.inStock === 'boolean') params.set('inStock', filters.inStock ? '1' : '0');
  else params.delete('inStock');
}

export interface ReadCatalogUrlStateOptions {
  /** The URL string to parse (e.g., from React Native Linking or deep linking) */
  url: string;
  includeCategory: boolean;
}

/**
 * Reads catalog state from a URL string.
 * In React Native, provide the URL from Linking or deep linking handlers.
 */
export function readCatalogUrlState({ url, includeCategory }: ReadCatalogUrlStateOptions): CatalogUrlState | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const params = parsed.searchParams;

    const search = params.get('q') ?? '';
    const sort = params.get('sort') ?? 'featured';
    const page = parseNumber(params.get('page')) ?? 1;

    const filters = parseFilters(params);
    const category = includeCategory ? params.get('cat') ?? undefined : undefined;

    return {
      search,
      sort,
      page: Math.max(1, Math.floor(page)),
      category,
      filters,
    };
  } catch {
    // Fallback for non-standard URLs
    const queryIndex = url.indexOf('?');
    if (queryIndex === -1) {
      return {
        search: '',
        sort: 'featured',
        page: 1,
        filters: {},
      };
    }
    const search = url.slice(queryIndex + 1);
    const params = new URLSearchParams(search);

    return {
      search: params.get('q') ?? '',
      sort: params.get('sort') ?? 'featured',
      page: parseNumber(params.get('page')) ?? 1,
      category: includeCategory ? params.get('cat') ?? undefined : undefined,
      filters: parseFilters(params),
    };
  }
}

export interface BuildCatalogUrlOptions {
  baseUrl: string;
  state: CatalogUrlState;
  includeCategory: boolean;
}

/**
 * Builds a catalog URL with query parameters.
 * Use this with React Native navigation or Linking.openURL().
 */
export function buildCatalogUrl({ baseUrl, state, includeCategory }: BuildCatalogUrlOptions): string {
  const url = new URL(baseUrl);
  const params = url.searchParams;

  if (state.search.trim()) params.set('q', state.search.trim());

  if (state.sort && state.sort !== 'featured') params.set('sort', state.sort);

  if (state.page && state.page !== 1) params.set('page', String(state.page));

  if (includeCategory) {
    if (state.category) params.set('cat', state.category);
  }

  writeFilters(params, state.filters);

  return `${url.pathname}?${params.toString()}`;
}

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
export function useCatalogUrlSync(
  state: CatalogUrlState,
  { onStateChange, baseUrl, includeCategory }: UseCatalogUrlSyncOptions
) {
  // Serialize tags for stable dependency comparison
  const tagsKey = JSON.stringify(state.filters.tags ?? []);

  React.useEffect(() => {
    if (!onStateChange) return;

    const handle = setTimeout(() => {
      const newUrl = buildCatalogUrl({ baseUrl, state, includeCategory });
      onStateChange(newUrl);
    }, 250);

    return () => clearTimeout(handle);
    // Using individual filter properties for granular control
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    onStateChange,
    baseUrl,
    includeCategory,
    state.category,
    state.page,
    state.search,
    state.sort,
    tagsKey,
    state.filters.priceMin,
    state.filters.priceMax,
    state.filters.inStock,
  ]);
}
