import { formatDate } from '../../utils/dateHelpers';
import { SortableHeader } from './SortableHeader';
import { TableEmptyRow, TableErrorRow, TableLoadingRows } from './TableStateRows';
import type { Coupon } from './types';
import { useTableSort, type SortValue } from './useTableSort';

function couponSortValue(coupon: Coupon, key: string): SortValue {
  switch (key) {
    case 'discount': return coupon.discountValue ?? 0;
    case 'usage': return coupon.usageCount ?? 0;
    case 'status': return coupon.active ? 1 : 0;
    case 'expires': return coupon.expiresAt ?? null;
    case 'code': return coupon.code;
    default: return null;
  }
}

interface CouponsTableProps {
  coupons: Coupon[];
  isLoading: boolean;
  hasLoaded: boolean;
  loadError: string | null;
  onRetry: () => void;
  locale?: string;
}

export function CouponsTable({ coupons, isLoading, hasLoaded, loadError, onRetry, locale }: CouponsTableProps) {
  const { sorted, sortKey, sortDirection, toggleSort } = useTableSort(
    coupons,
    couponSortValue,
    { key: 'expires', direction: 'desc' }
  );

  return (
    <div className="cedros-data-table-wrap cedros-admin__table-container">
      <table className="cedros-data-table cedros-admin__table" aria-busy={isLoading}>
        <thead>
          <tr>
            <SortableHeader label="Code" sortKey="code" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
            <SortableHeader label="Discount" sortKey="discount" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
            <SortableHeader label="Usage" sortKey="usage" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
            <SortableHeader label="Status" sortKey="status" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
            <SortableHeader label="Expires" sortKey="expires" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
          </tr>
        </thead>
        <tbody>
          {isLoading && !hasLoaded && sorted.length === 0 ? (
            <TableLoadingRows columns={5} label="Loading coupons…" />
          ) : !hasLoaded && loadError && sorted.length === 0 ? (
            <TableErrorRow columns={5} message={loadError} onRetry={onRetry} />
          ) : sorted.length === 0 ? (
            <TableEmptyRow columns={5} description="Create a discount coupon to run promotions and reward customers at checkout." title="No coupons yet" />
          ) : sorted.map((coupon) => (
            <tr key={coupon.code}>
              <td><code>{coupon.code}</code></td>
              <td>{coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `$${coupon.discountValue.toFixed(2)}`}</td>
              <td>{coupon.usageCount}{coupon.usageLimit ? ` / ${coupon.usageLimit}` : ''}</td>
              <td>
                <span className={`cedros-admin__badge ${coupon.active ? 'cedros-admin__badge--success' : 'cedros-admin__badge--muted'}`}>
                  {coupon.active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td>{coupon.expiresAt ? formatDate(coupon.expiresAt, locale) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
