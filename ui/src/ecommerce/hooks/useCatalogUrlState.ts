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

export function readCatalogUrlState({ includeCategory }: { includeCategory: boolean }): CatalogUrlState | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);

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
}

export function useCatalogUrlSync(state: CatalogUrlState, { includeCategory }: { includeCategory: boolean }) {
  // Stable scalar key for tags array dependency comparison
  const tagsKey = state.filters.tags?.join(',') ?? '';

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const handle = window.setTimeout(() => {
      const url = new URL(window.location.href);
      const params = url.searchParams;

      if (state.search.trim()) params.set('q', state.search.trim());
      else params.delete('q');

      if (state.sort && state.sort !== 'featured') params.set('sort', state.sort);
      else params.delete('sort');

      if (state.page && state.page !== 1) params.set('page', String(state.page));
      else params.delete('page');

      if (includeCategory) {
        if (state.category) params.set('cat', state.category);
        else params.delete('cat');
      }

      writeFilters(params, state.filters);

      const next = `${url.pathname}?${params.toString()}${url.hash}`;
      const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (next !== current) window.history.replaceState({}, '', next);
    }, 250);

    return () => window.clearTimeout(handle);
    // Using individual filter properties for granular control
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
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
