/**
 * AdminPagination
 *
 * The one pager for admin tables, mirroring the host `.cedros-data-pagination`
 * class + ARIA contract. Two modes, chosen by whether the backend reports a
 * total:
 *  - known total  → "Showing 1–20 of 214" plus numbered pages
 *  - unknown total → cursor mode: "Page 3" plus previous/next only
 *
 * Boundary controls are disabled rather than hidden, so the row never changes
 * shape as you page through a collection.
 */

import { Icons } from './icons';

export interface AdminPaginationProps {
  /** Rows rendered on the current page. */
  count: number;
  /** Zero-based index of the first row on this page. */
  offset: number;
  pageSize: number;
  /** Total matching rows when the backend knows it; omit for cursor mode. */
  total?: number;
  /** Cursor-mode hint that a further page exists. */
  hasMore?: boolean;
  /** Plural noun for assistive text, e.g. "transactions". */
  label: string;
  onOffsetChange: (offset: number) => void;
}

/** Up to 7 page slots: first, last, a window around current, ellipsis gaps. */
export function paginationPages(current: number, pageCount: number): (number | 'gap')[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }
  const window = new Set<number>([1, pageCount, current, current - 1, current + 1]);
  if (current <= 3) [2, 3, 4].forEach((page) => window.add(page));
  if (current >= pageCount - 2) {
    [pageCount - 3, pageCount - 2, pageCount - 1].forEach((page) => window.add(page));
  }
  const pages = [...window].filter((page) => page >= 1 && page <= pageCount).sort((a, b) => a - b);

  const slots: (number | 'gap')[] = [];
  pages.forEach((page, index) => {
    if (index > 0 && page - pages[index - 1]! > 1) slots.push('gap');
    slots.push(page);
  });
  return slots;
}

export function AdminPagination({
  count,
  offset,
  pageSize,
  total,
  hasMore,
  label,
  onOffsetChange,
}: AdminPaginationProps) {
  const knownTotal = typeof total === 'number';
  const canGoBack = offset > 0;
  const canGoForward = knownTotal ? offset + count < total : hasMore === true;

  // Nothing to page through, in either direction, is not a control surface.
  if (!canGoBack && !canGoForward) return null;

  const currentPage = Math.floor(offset / pageSize) + 1;
  const pageCount = knownTotal ? Math.max(1, Math.ceil(total / pageSize)) : 0;
  const summary = knownTotal
    ? `Showing ${offset + 1}–${offset + count} of ${total.toLocaleString()}`
    : `Page ${currentPage}`;

  const arrow = (direction: 'previous' | 'next') => {
    const isPrevious = direction === 'previous';
    const disabled = isPrevious ? !canGoBack : !canGoForward;
    return (
      <button
        type="button"
        className="cedros-data-btn cedros-data-btn--secondary cedros-data-btn--sm cedros-data-pagination__arrow"
        aria-label={`${isPrevious ? 'Previous' : 'Next'} page of ${label}`}
        disabled={disabled}
        onClick={() =>
          onOffsetChange(isPrevious ? Math.max(0, offset - pageSize) : offset + pageSize)
        }
      >
        {isPrevious ? Icons.chevronLeft : Icons.chevronRight}
      </button>
    );
  };

  return (
    <nav
      className={`cedros-data-pagination${knownTotal ? '' : ' cedros-data-pagination--cursor'}`}
      aria-label={`${label} pagination`}
    >
      <span className="cedros-data-pagination__label cedros-data-pagination__summary">
        {summary}
      </span>
      <div className="cedros-data-pagination__controls">
        {arrow('previous')}
        {knownTotal ? (
          <div className="cedros-data-pagination__pages">
            {paginationPages(currentPage, pageCount).map((slot, index) =>
              slot === 'gap' ? (
                <span key={`gap-${index}`} className="cedros-data-pagination__ellipsis" aria-hidden="true">
                  …
                </span>
              ) : (
                <button
                  key={slot}
                  type="button"
                  className="cedros-data-btn cedros-data-btn--ghost cedros-data-btn--sm cedros-data-pagination__page"
                  aria-label={`Page ${slot}`}
                  aria-current={slot === currentPage ? 'page' : undefined}
                  disabled={slot === currentPage}
                  onClick={() => onOffsetChange((slot - 1) * pageSize)}
                >
                  {slot}
                </button>
              )
            )}
          </div>
        ) : null}
        {arrow('next')}
      </div>
    </nav>
  );
}
