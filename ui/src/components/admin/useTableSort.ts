/**
 * useTableSort
 *
 * Client-side sorting for admin list tables. Mirrors the host's sortable
 * column headers: clicking a header sorts ascending, clicking the active
 * header again flips the direction. Sorts the currently-loaded rows only
 * (server pagination is unaffected).
 *
 * Pass a stable `getValue` (module-level fn or `useCallback`) that maps a row
 * + column key to a comparable value; `null`/`undefined` always sort last.
 */

import { useCallback, useMemo, useState } from 'react';

export type SortDirection = 'asc' | 'desc';

export type SortValue = string | number | null | undefined;

export interface TableSort {
  key: string | null;
  direction: SortDirection;
}

/** Locale-aware, nulls-last comparison used for every sortable column. */
function compareValues(a: SortValue, b: SortValue): number {
  const aMissing = a === null || a === undefined;
  const bMissing = b === null || b === undefined;
  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

export interface UseTableSortResult<T> {
  sorted: T[];
  sortKey: string | null;
  sortDirection: SortDirection;
  toggleSort: (key: string) => void;
}

export function useTableSort<T>(
  rows: T[],
  getValue: (row: T, key: string) => SortValue,
  initial: { key: string; direction?: SortDirection } | null = null
): UseTableSortResult<T> {
  const [state, setState] = useState<TableSort>({
    key: initial?.key ?? null,
    direction: initial?.direction ?? 'asc',
  });

  const toggleSort = useCallback((key: string) => {
    setState((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' }
    );
  }, []);

  const sorted = useMemo(() => {
    if (!state.key) return rows;
    const factor = state.direction === 'asc' ? 1 : -1;
    const key = state.key;
    return [...rows].sort((a, b) => factor * compareValues(getValue(a, key), getValue(b, key)));
  }, [rows, state, getValue]);

  return { sorted, sortKey: state.key, sortDirection: state.direction, toggleSort };
}
