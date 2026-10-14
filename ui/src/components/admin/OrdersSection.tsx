/**
 * Admin Orders Section
 *
 * Shows orders from /admin/orders with expandable detail including
 * fulfillment and order history.
 */

import { useState, useEffect, useCallback } from 'react';
import { ErrorBanner } from './ErrorBanner';
import { LedgerTruncationWarning } from './LedgerTruncationWarning';
import { LoadingState } from './LoadingState';
import { AnimatedDisclosure } from './AnimatedDisclosure';
import { StatsBar, type StatItem } from './StatsBar';
import { FilterDropdown } from './Dropdown';
import { SortableHeader } from './SortableHeader';
import { TableEmptyRow, TableErrorRow, TableLoadingRows } from './TableStateRows';
import { useBackgroundRefresh } from './useBackgroundRefresh';
import { useTableSort, type SortValue } from './useTableSort';
import type { AdminPagedResponse, SectionProps, PaymentStats } from './types';
import { formatDateTime } from '../../utils/dateHelpers';
import {
  formatCurrencyAmount,
  formatMinorCurrencyAmount,
  formatStripeMinorAmount,
  selectPlural,
} from '../../i18n/formatting';
import { safeHref } from '../../utils/safeHref';
import { fetchAdminJson } from './authFetch';

interface OrderItem {
  productId: string;
  variantId?: string;
  quantity: number;
}

interface AdminOrder {
  id: string;
  source: string;
  purchaseId: string;
  resourceId: string;
  status: string;
  items: OrderItem[];
  amount: number;
  amountAsset: string;
  customerEmail?: string;
  customerName?: string;
  metadata: Record<string, string>;
  createdAt: string;
}

interface Fulfillment {
  id: string;
  status: string;
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  createdAt: string;
}

interface OrderHistoryEntry {
  id: string;
  fromStatus: string;
  toStatus: string;
  note?: string;
  actor?: string;
  createdAt: string;
}

interface OrderDetail {
  order: AdminOrder;
  history: OrderHistoryEntry[];
  fulfillments: Fulfillment[];
}

interface OrdersResponse extends AdminPagedResponse {
  orders: AdminOrder[];
}

/** Stable accessor for the sortable order columns (see useTableSort). */
function orderSortValue(order: AdminOrder, key: string): SortValue {
  switch (key) {
    case 'status': return order.status;
    case 'amount': return order.amount;
    case 'source': return order.source;
    case 'customer': return order.customerEmail || order.customerName || '';
    case 'date': return order.createdAt;
    default: return null;
  }
}

export function OrdersSection({ pageSize = 20, authManager, locale }: SectionProps) {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [ordersTruncated, setOrdersTruncated] = useState(false);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const { sorted: sortedOrders, sortKey, sortDirection, toggleSort } = useTableSort(
    orders,
    orderSortValue,
    { key: 'date', direction: 'desc' }
  );

  const adminFetch = useCallback(async <T,>(path: string, opts?: RequestInit): Promise<T> => {
    return fetchAdminJson<T>(authManager, path, opts);
  }, [authManager]);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      setError(null);
      const params = new URLSearchParams({ limit: String(pageSize) });
      if (statusFilter) params.set('status', statusFilter);
      const data = await adminFetch<OrdersResponse>(
        `/admin/orders?${params}`
      );
      setOrders(data.orders || []);
      setOrdersTruncated(data.truncated === true);
    } catch {
      setError('Failed to load orders');
      setOrdersTruncated(false);
    } finally {
      setIsLoading(false);
    }
  }, [adminFetch, pageSize, statusFilter]);

  const fetchStats = useCallback(async () => {
    setIsStatsLoading(true);
    try {
      const data = await fetchAdminJson<PaymentStats>(authManager, '/admin/stats');
      setStats(data);
    } catch {
      setStats(null);
    } finally {
      setIsStatsLoading(false);
    }
  }, [authManager]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchOrders(); }, [fetchOrders]);
  useBackgroundRefresh(async () => {
    await Promise.all([fetchStats(), fetchOrders()]);
  });

  const fetchDetail = useCallback(async (orderId: string) => {
    setDetailLoading(true);
    try {
      const orderDetail = await adminFetch<OrderDetail>(`/admin/orders/${encodeURIComponent(orderId)}`);
      setDetail(orderDetail);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, [adminFetch]);

  const toggleExpand = (orderId: string) => {
    if (expandedId === orderId) {
      setExpandedId(null);
      setDetail(null);
    } else {
      setExpandedId(orderId);
      fetchDetail(orderId);
    }
  };

  const formatAmount = (amount: number, asset: string, source: string) => source === 'stripe'
    ? formatStripeMinorAmount(amount, asset, locale)
    : formatMinorCurrencyAmount(amount, asset, locale);

  const orderStats = stats?.orders;
  const statItems: StatItem[] = [
    // "Total" (not "Orders") so it doesn't read as a different number than the
    // Transactions tab's settled-only "Orders" stat, and to match the Returns/
    // Disputes headline stat.
    { label: 'Total', value: orderStats?.total ?? 0 },
    { label: 'Paid', value: orderStats?.paid ?? 0 },
    {
      label: 'Refunded',
      value: orderStats?.refunded ?? 0,
      variant: orderStats && orderStats.refunded > 0 ? 'warning' : 'muted',
    },
    {
      label: 'Pending',
      value: orderStats?.pending ?? 0,
      variant: orderStats && orderStats.pending > 0 ? 'warning' : 'muted',
    },
    {
      label: 'Revenue',
      value: stats?.revenueIncludesNonUsd ? 'See transactions' : formatCurrencyAmount(orderStats?.revenue ?? 0, 'USD', locale),
      variant: 'success',
    },
  ];

  return (
    <div className="cedros-data-stack cedros-admin__page">
      <ErrorBanner message={orders.length > 0 ? error : null} />
      {stats?.truncated ? (
        <LedgerTruncationWarning message="Order stats may be partial because the ledger scan hit the admin row limit." />
      ) : null}
      {ordersTruncated ? (
        <LedgerTruncationWarning message="Order list may be partial because the ledger scan hit the admin row limit." />
      ) : null}
      <StatsBar stats={statItems} isLoading={isStatsLoading && !stats} />

      <div className="cedros-data-toolbar cedros-admin__toolbar">
        <div className="cedros-admin__filter">
          <span className="cedros-admin__filter-label">Status</span>
          <FilterDropdown
            ariaLabel="Status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: '', label: 'All statuses' },
              { value: 'paid', label: 'Paid' },
              { value: 'processing', label: 'Processing' },
              { value: 'fulfilled', label: 'Fulfilled' },
              { value: 'shipped', label: 'Shipped' },
              { value: 'delivered', label: 'Delivered' },
              { value: 'cancelled', label: 'Cancelled' },
              { value: 'refunded', label: 'Refunded' },
            ]}
          />
        </div>
      </div>

      <>
          {orders.length > 0 ? (
          <div className="cedros-admin__table-info">
            Showing {orders.length} of {orderStats?.total ?? orders.length}{' '}
            {selectPlural(orderStats?.total ?? orders.length, { one: 'order', other: 'orders' }, locale)}
          </div>
          ) : null}
          <div className="cedros-data-table-wrap cedros-admin__table-container">
            <table className="cedros-data-table cedros-admin__table" aria-busy={isLoading}>
              <thead>
                <tr>
                  <th>Order</th>
                  <SortableHeader label="Status" sortKey="status" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                  <SortableHeader label="Amount" sortKey="amount" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                  <SortableHeader label="Source" sortKey="source" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                  <SortableHeader label="Customer" sortKey="customer" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                  <SortableHeader label="Date" sortKey="date" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                </tr>
              </thead>
              <tbody>
                {isLoading && sortedOrders.length === 0 ? (
                  <TableLoadingRows columns={6} label="Loading orders…" />
                ) : error && sortedOrders.length === 0 ? (
                  <TableErrorRow columns={6} message={error} onRetry={fetchOrders} />
                ) : sortedOrders.length === 0 ? (
                  <TableEmptyRow
                    columns={6}
                    filtered={Boolean(statusFilter)}
                    title={statusFilter ? 'No orders match this filter' : 'No orders yet'}
                    description={statusFilter ? 'Try a different status filter to see more orders.' : 'Orders appear here once customers complete a purchase.'}
                    action={statusFilter ? (
                      <button type="button" className="cedros-data-btn cedros-data-btn--ghost cedros-data-btn--sm" onClick={() => setStatusFilter('')}>
                        Clear filters
                      </button>
                    ) : undefined}
                  />
                ) : sortedOrders.map(order => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    expanded={expandedId === order.id}
                    detail={expandedId === order.id ? detail : null}
                    detailLoading={expandedId === order.id && detailLoading}
                    onToggle={() => toggleExpand(order.id)}
                    formatAmount={formatAmount}
                    locale={locale}
                  />
                ))}
              </tbody>
            </table>
          </div>
      </>
    </div>
  );
}


function OrderRow({
  order,
  expanded,
  detail,
  detailLoading,
  onToggle,
  formatAmount,
  locale,
}: {
  order: AdminOrder;
  expanded: boolean;
  detail: OrderDetail | null;
  detailLoading: boolean;
  onToggle: () => void;
  formatAmount: (amount: number, asset: string, source: string) => string;
  locale?: string;
}) {
  return (
    <>
      <tr
        className={`cedros-data-table__row--clickable ${expanded ? 'cedros-admin__table-row--active' : ''}`}
      >
        <td>
          <button
            type="button"
            className="cedros-data-table__row-activate cedros-admin__table-row-activate cedros-admin__mono"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-label={`${expanded ? 'Collapse' : 'Expand'} order ${order.id}`}
          >
            {order.id.slice(0, 12)}…
          </button>
        </td>
        <td>
          <span className={`cedros-data-pill cedros-admin__badge cedros-admin__badge--${statusVariant(order.status)}`}>
            {order.status}
          </span>
        </td>
        <td>{formatAmount(order.amount, order.amountAsset, order.source)}</td>
        <td>{order.source}</td>
        <td>{order.customerEmail || order.customerName || '—'}</td>
        <td>{formatDateTime(order.createdAt, locale)}</td>
      </tr>
      <tr aria-hidden={!expanded} className="cedros-admin__table-detail-row">
        <td colSpan={6} style={{ padding: 0 }}>
          <AnimatedDisclosure open={expanded}>
            <ExpandedDetail
              detail={detail}
              loading={detailLoading}
              metadata={order.metadata}
              locale={locale}
            />
          </AnimatedDisclosure>
        </td>
      </tr>
    </>
  );
}

function ExpandedDetail({
  detail,
  loading,
  metadata,
  locale,
}: {
  detail: OrderDetail | null;
  loading: boolean;
  metadata: Record<string, string>;
  locale?: string;
}) {
  if (loading) {
    return <LoadingState label="Loading order details…" lines={2} />;
  }

  return (
    <div style={{ padding: '1rem', background: 'var(--pay-admin-muted-bg)' }}>
      {/* Metadata */}
      {Object.keys(metadata).length > 0 ? (
        <div style={{ marginBottom: '1rem' }}>
          <div className="cedros-admin__label">Order metadata</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.25rem 1rem', fontSize: '0.8125rem' }}>
            {Object.entries(metadata).map(([k, v]) => (
              <div key={k} style={{ display: 'contents' }}>
                <span style={{ fontWeight: 500, color: 'var(--pay-admin-muted)' }}>{k}</span>
                <span>{v}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Fulfillments */}
      {detail?.fulfillments && detail.fulfillments.length > 0 ? (
        <div style={{ marginBottom: '1rem' }}>
          <div className="cedros-admin__label">Fulfillments</div>
          {detail.fulfillments.map(f => (
            <div key={f.id} style={{ fontSize: '0.8125rem', marginBottom: '0.25rem' }}>
              <span className={`cedros-data-pill cedros-admin__badge cedros-admin__badge--${statusVariant(f.status)}`}>{f.status}</span>
              {f.carrier ? <span style={{ marginLeft: '0.5rem' }}>{f.carrier}</span> : null}
              {f.trackingNumber ? (
                safeHref(f.trackingUrl) ? (
                  <a href={safeHref(f.trackingUrl)!} target="_blank" rel="noreferrer" style={{ marginLeft: '0.5rem' }}>
                    {f.trackingNumber}
                  </a>
                ) : (
                  <span style={{ marginLeft: '0.5rem' }}>{f.trackingNumber}</span>
                )
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {/* History */}
      {detail?.history && detail.history.length > 0 ? (
        <div>
          <div className="cedros-admin__label">Status history</div>
          {detail.history.map(h => (
            <div key={h.id} style={{ fontSize: '0.8125rem', marginBottom: '0.25rem' }}>
              <span style={{ color: 'var(--pay-admin-muted)' }}>{formatDateTime(h.createdAt, locale)}</span>
              {' '}{h.fromStatus} → {h.toStatus}
              {h.note ? <span style={{ marginLeft: '0.5rem', fontStyle: 'italic' }}>{h.note}</span> : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function statusVariant(status: string): string {
  switch (status) {
    case 'paid': case 'fulfilled': case 'delivered': case 'success': return 'success';
    case 'processing': case 'shipped': case 'pending': return 'warning';
    case 'cancelled': case 'refunded': case 'failed': return 'error';
    default: return 'default';
  }
}
