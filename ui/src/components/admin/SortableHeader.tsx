/**
 * SortableHeader
 *
 * A `<th>` whose label is a button that drives `useTableSort`. Renders the
 * host-style sort caret: faint when idle, solid (up/down) on the active
 * column. Sets `aria-sort` so assistive tech announces the current order.
 */

import type { ReactNode } from 'react';
import { Icons } from './icons';
import type { SortDirection } from './useTableSort';

export interface SortableHeaderProps {
  label: ReactNode;
  /** Column key passed to `toggleSort` / matched against `activeKey`. */
  sortKey: string;
  activeKey: string | null;
  direction: SortDirection;
  onSort: (key: string) => void;
  /** Optional inline style for width hints, matching sibling `<th>`s. */
  style?: React.CSSProperties;
  /** Extra `<th>` class — e.g. `cedros-admin__table-cell--numeric`. */
  className?: string;
}

export function SortableHeader({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
  style,
  className,
}: SortableHeaderProps) {
  const isActive = activeKey === sortKey;
  const ariaSort = isActive ? (direction === 'asc' ? 'ascending' : 'descending') : 'none';

  return (
    <th aria-sort={ariaSort} style={style} className={className}>
      <button type="button" className="cedros-data-table__sort cedros-admin__table-sort" onClick={() => onSort(sortKey)}>
        <span>{label}</span>
        <span
          className={`cedros-admin__sort-icon ${isActive ? '' : 'cedros-admin__sort-icon--idle'}`}
          aria-hidden="true"
        >
          {isActive && direction === 'desc' ? Icons.chevronDown : Icons.chevronUp}
        </span>
      </button>
    </th>
  );
}
