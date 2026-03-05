/**
 * Admin Orders Section
 *
 * Order management with gift card fulfillment visibility.
 * Shows orders from /admin/orders with expandable detail including
 * gift card redemption status, fulfillments, and order history.
 */

import { useState, useEffect, useCallback } from 'react';
import { Icons } from './icons';
import { ErrorBanner } from './ErrorBanner';
import type { SectionProps } from './types';
import { formatDateTime } from '../../utils/dateHelpers';
import { safeHref } from '../../ecommerce/utils/safeHref';

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

interface GiftCardRedemption {
  id: string;
  orderId: string;
  productId: string;
  buyerUserId: string;
  recipientUserId: string;
  faceValueCents: number;
  currency: string;
  creditsIssued: number;
  tokenMinted: boolean;
  tokenMintSignature?: string;
  createdAt: string;
}

export function OrdersSection({ serverUrl, apiKey, pageSize = 20, authManager }: SectionProps) {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [redemptions, setRedemptions] = useState<GiftCardRedemption[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  const adminFetch = useCallback(async <T,>(path: string, opts?: RequestInit): Promise<T> => {
    if (authManager?.isAuthenticated()) {
      return authManager.fetchWithAuth<T>(path, opts);
    }
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers['X-API-Key'] = apiKey;
    const res = await fetch(`${serverUrl}${path}`, { ...opts, headers: { ...headers, ...opts?.headers } });
    if (!res.ok) {
      const text = await res.text().catch(() => `HTTP ${res.status}`);
      throw new Error(text);
    }
    return res.json();
  }, [serverUrl, apiKey, authManager]);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      setError(null);
      const params = new URLSearchParams({ limit: String(pageSize) });
      if (statusFilter) params.set('status', statusFilter);
      const data = await adminFetch<{ orders: AdminOrder[]; total: number }>(
        `/admin/orders?${params}`
      );
      setOrders(data.orders);
      setTotal(data.total);
    } catch {
      setError('Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  }, [adminFetch, pageSize, statusFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const fetchDetail = useCallback(async (orderId: string) => {
    setDetailLoading(true);
    try {
      const [orderDetail, gcRedemptions] = await Promise.all([
        adminFetch<OrderDetail>(`/admin/orders/${encodeURIComponent(orderId)}`),
        adminFetch<GiftCardRedemption[]>(`/admin/gift-card-redemptions?limit=50`).catch(() => []),
      ]);
      setDetail(orderDetail);
      setRedemptions(gcRedemptions.filter(r => r.orderId === orderId));
    } catch {
      setDetail(null);
      setRedemptions([]);
    } finally {
      setDetailLoading(false);
    }
  }, [adminFetch]);

  const toggleExpand = (orderId: string) => {
    if (expandedId === orderId) {
      setExpandedId(null);
      setDetail(null);
      setRedemptions([]);
    } else {
      setExpandedId(orderId);
      fetchDetail(orderId);
    }
  };

  const formatAmount = (amount: number, asset: string) => {
    if (asset === 'USD' || asset === 'usd') return `$${(amount / 100).toFixed(2)}`;
    return `${amount} ${asset}`;
  };

  return (
    <div className="cedros-admin__section">
      <div className="cedros-admin__section-header">
        <h2 className="cedros-admin__section-title">Orders</h2>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select
            className="cedros-admin__input"
            style={{ width: 'auto', minWidth: '120px' }}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="paid">Paid</option>
            <option value="processing">Processing</option>
            <option value="fulfilled">Fulfilled</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
          </select>
          <button type="button" className="cedros-admin__button cedros-admin__button--secondary" onClick={fetchOrders}>
            {Icons.refresh} Refresh
          </button>
        </div>
      </div>

      {error ? <ErrorBanner message={error} onRetry={fetchOrders} /> : null}

      {isLoading ? (
        <div className="cedros-admin__loading-text">Loading orders...</div>
      ) : orders.length === 0 ? (
        <div className="cedros-admin__empty">No orders found.</div>
      ) : (
        <>
          <div className="cedros-admin__table-info">
            {total} order{total === 1 ? '' : 's'} total
          </div>
          <table className="cedros-admin__table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Status</th>
                <th>Amount</th>
                <th>Source</th>
                <th>Customer</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <OrderRow
                  key={order.id}
                  order={order}
                  expanded={expandedId === order.id}
                  detail={expandedId === order.id ? detail : null}
                  redemptions={expandedId === order.id ? redemptions : []}
                  detailLoading={expandedId === order.id && detailLoading}
                  onToggle={() => toggleExpand(order.id)}
                  formatAmount={formatAmount}
                />
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

function OrderRow({
  order,
  expanded,
  detail,
  redemptions,
  detailLoading,
  onToggle,
  formatAmount,
}: {
  order: AdminOrder;
  expanded: boolean;
  detail: OrderDetail | null;
  redemptions: GiftCardRedemption[];
  detailLoading: boolean;
  onToggle: () => void;
  formatAmount: (amount: number, asset: string) => string;
}) {
  const hasGiftCard = order.metadata?.recipient_email || redemptions.length > 0;

  return (
    <>
      <tr
        onClick={onToggle}
        style={{ cursor: 'pointer' }}
        className={expanded ? 'cedros-admin__table-row--active' : ''}
      >
        <td>
          <span className="cedros-admin__mono">{order.id.slice(0, 12)}...</span>
          {hasGiftCard ? <span className="cedros-admin__badge cedros-admin__badge--info" style={{ marginLeft: '0.5rem' }}>Gift Card</span> : null}
        </td>
        <td>
          <span className={`cedros-admin__badge cedros-admin__badge--${statusVariant(order.status)}`}>
            {order.status}
          </span>
        </td>
        <td>{formatAmount(order.amount, order.amountAsset)}</td>
        <td>{order.source}</td>
        <td>{order.customerEmail || order.customerName || '—'}</td>
        <td>{formatDateTime(order.createdAt)}</td>
      </tr>
      {expanded ? (
        <tr>
          <td colSpan={6} style={{ padding: 0 }}>
            <ExpandedDetail
              detail={detail}
              redemptions={redemptions}
              loading={detailLoading}
              formatAmount={formatAmount}
              metadata={order.metadata}
            />
          </td>
        </tr>
      ) : null}
    </>
  );
}

function ExpandedDetail({
  detail,
  redemptions,
  loading,
  formatAmount,
  metadata,
}: {
  detail: OrderDetail | null;
  redemptions: GiftCardRedemption[];
  loading: boolean;
  formatAmount: (amount: number, asset: string) => string;
  metadata: Record<string, string>;
}) {
  if (loading) {
    return <div style={{ padding: '1rem' }} className="cedros-admin__loading-text">Loading details...</div>;
  }

  return (
    <div style={{ padding: '1rem', background: 'var(--cedros-admin-bg-muted, #f9fafb)' }}>
      {/* Metadata */}
      {Object.keys(metadata).length > 0 ? (
        <div style={{ marginBottom: '1rem' }}>
          <div className="cedros-admin__label">Order Metadata</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.25rem 1rem', fontSize: '0.8125rem' }}>
            {Object.entries(metadata).map(([k, v]) => (
              <div key={k} style={{ display: 'contents' }}>
                <span style={{ fontWeight: 500, color: 'var(--cedros-admin-text-muted)' }}>{k}</span>
                <span>{v}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Gift Card Redemptions */}
      {redemptions.length > 0 ? (
        <div style={{ marginBottom: '1rem' }}>
          <div className="cedros-admin__label">Gift Card Fulfillment</div>
          {redemptions.map(r => (
            <div key={r.id} style={{ fontSize: '0.8125rem', padding: '0.5rem', border: '1px solid var(--cedros-admin-border)', borderRadius: '0.5rem', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Face value: {formatAmount(r.faceValueCents, r.currency)}</span>
                <span className={`cedros-admin__badge cedros-admin__badge--${r.creditsIssued > 0 ? 'success' : 'warning'}`}>
                  {r.creditsIssued > 0 ? 'Credits issued' : 'Pending'}
                </span>
              </div>
              <div style={{ marginTop: '0.25rem', color: 'var(--cedros-admin-text-muted)' }}>
                Recipient: {r.recipientUserId || '—'}
                {r.tokenMinted ? (
                  <span className="cedros-admin__badge cedros-admin__badge--info" style={{ marginLeft: '0.5rem' }}>
                    Token minted
                  </span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Fulfillments */}
      {detail?.fulfillments && detail.fulfillments.length > 0 ? (
        <div style={{ marginBottom: '1rem' }}>
          <div className="cedros-admin__label">Fulfillments</div>
          {detail.fulfillments.map(f => (
            <div key={f.id} style={{ fontSize: '0.8125rem', marginBottom: '0.25rem' }}>
              <span className={`cedros-admin__badge cedros-admin__badge--${statusVariant(f.status)}`}>{f.status}</span>
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
          <div className="cedros-admin__label">Status History</div>
          {detail.history.map(h => (
            <div key={h.id} style={{ fontSize: '0.8125rem', marginBottom: '0.25rem' }}>
              <span style={{ color: 'var(--cedros-admin-text-muted)' }}>{formatDateTime(h.createdAt)}</span>
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
