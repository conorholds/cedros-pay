/**
 * Admin Dashboard — Returns Section
 *
 * List return requests with status filter, view details, update status.
 * Server: GET /admin/returns, GET /admin/returns/:id,
 *         POST /admin/returns, PUT /admin/returns/:id/status
 */

import { useState, useEffect, useCallback } from 'react';
import { Icons } from './icons';
import { ErrorBanner } from './ErrorBanner';
import type { SectionProps } from './types';
import { formatDateTime } from '../../utils/dateHelpers';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ReturnItem {
  productId: string;
  variantId?: string;
  quantity: number;
}

interface ReturnRequest {
  id: string;
  tenantId: string;
  orderId: string;
  status: ReturnStatus;
  items: ReturnItem[];
  reason?: string;
  metadata: Record<string, string>;
  createdAt: string;
  updatedAt?: string;
  statusUpdatedAt?: string;
}

type ReturnStatus = 'requested' | 'approved' | 'rejected' | 'received' | 'refunded';

// ─── Helpers ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: ReturnStatus[] = ['requested', 'approved', 'rejected', 'received', 'refunded'];

const statusBadgeVariant = (status: ReturnStatus): string => {
  switch (status) {
    case 'approved': return 'success';
    case 'refunded': return 'success';
    case 'rejected': return 'failed';
    case 'received': return 'muted';
    case 'requested': return 'pending';
    default: return 'muted';
  }
};

// ─── Detail View ─────────────────────────────────────────────────────────────

interface DetailViewProps {
  returnRequest: ReturnRequest;
  onBack: () => void;
  onStatusUpdated: (updated: ReturnRequest) => void;
  onError: (msg: string) => void;
  fetchWithAuth: <T>(path: string, options?: RequestInit) => Promise<T>;
}

function ReturnDetailView({ returnRequest: r, onBack, onStatusUpdated, onError, fetchWithAuth }: DetailViewProps) {
  const [newStatus, setNewStatus] = useState<ReturnStatus>(r.status);
  const [isUpdating, setIsUpdating] = useState(false);

  const updateStatus = async () => {
    if (!newStatus || newStatus === r.status) return;
    setIsUpdating(true);
    try {
      const updated = await fetchWithAuth<ReturnRequest>(
        `/admin/returns/${encodeURIComponent(r.id)}/status`,
        { method: 'PUT', body: JSON.stringify({ status: newStatus }) }
      );
      onStatusUpdated(updated);
    } catch {
      onError('Failed to update return status');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        className="cedros-admin__button cedros-admin__button--ghost cedros-admin__button--sm"
        onClick={onBack}
        style={{ marginBottom: '1rem' }}
      >
        &larr; Back to returns
      </button>

      <div className="cedros-admin__section-header">
        <h3 className="cedros-admin__section-title">
          Return <code style={{ fontSize: '0.8rem' }}>{r.id.slice(0, 12)}</code>
          <span
            className={`cedros-admin__badge cedros-admin__badge--${statusBadgeVariant(r.status)}`}
            style={{ marginLeft: '0.5rem' }}
          >
            {r.status}
          </span>
        </h3>
      </div>

      <div className="cedros-admin__table-container" style={{ maxWidth: '500px', marginBottom: '1rem' }}>
        <table className="cedros-admin__table">
          <tbody>
            <tr>
              <td style={{ fontWeight: 600, width: '35%' }}>Order ID</td>
              <td><code>{r.orderId}</code></td>
            </tr>
            {r.reason && (
              <tr>
                <td style={{ fontWeight: 600 }}>Reason</td>
                <td>{r.reason}</td>
              </tr>
            )}
            <tr>
              <td style={{ fontWeight: 600 }}>Created</td>
              <td>{formatDateTime(r.createdAt)}</td>
            </tr>
            {r.statusUpdatedAt && (
              <tr>
                <td style={{ fontWeight: 600 }}>Status Updated</td>
                <td>{formatDateTime(r.statusUpdatedAt)}</td>
              </tr>
            )}
            {r.updatedAt && (
              <tr>
                <td style={{ fontWeight: 600 }}>Last Updated</td>
                <td>{formatDateTime(r.updatedAt)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Items list */}
      <h4 style={{ fontSize: '0.85rem', fontWeight: 600, margin: '0 0 0.5rem' }}>
        Items ({r.items.length})
      </h4>
      <div className="cedros-admin__table-container" style={{ maxWidth: '500px', marginBottom: '1.25rem' }}>
        <table className="cedros-admin__table">
          <thead>
            <tr>
              <th>Product ID</th>
              <th>Variant ID</th>
              <th>Qty</th>
            </tr>
          </thead>
          <tbody>
            {r.items.map((item, idx) => (
              <tr key={idx}>
                <td><code style={{ fontSize: '0.75rem' }}>{item.productId}</code></td>
                <td>
                  {item.variantId
                    ? <code style={{ fontSize: '0.75rem' }}>{item.variantId}</code>
                    : <span style={{ color: 'var(--cedros-admin-text-muted, #888)' }}>—</span>}
                </td>
                <td>{item.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Metadata */}
      {Object.keys(r.metadata).length > 0 && (
        <>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 600, margin: '0 0 0.5rem' }}>Metadata</h4>
          <div className="cedros-admin__table-container" style={{ maxWidth: '500px', marginBottom: '1.25rem' }}>
            <table className="cedros-admin__table">
              <tbody>
                {Object.entries(r.metadata).map(([k, v]) => (
                  <tr key={k}>
                    <td style={{ fontWeight: 600, width: '40%' }}>{k}</td>
                    <td>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Status update */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', maxWidth: '400px' }}>
        <div className="cedros-admin__field" style={{ flex: 1 }}>
          <label className="cedros-admin__field-label">Update Status</label>
          <select
            className="cedros-admin__input"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value as ReturnStatus)}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="cedros-admin__button cedros-admin__button--primary"
          onClick={updateStatus}
          disabled={isUpdating || newStatus === r.status}
        >
          {isUpdating ? 'Updating...' : 'Update'}
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function ReturnsSection({ serverUrl, apiKey, pageSize = 20, authManager }: SectionProps) {
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState<'all' | ReturnStatus>('all');
  const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchWithAuth = useCallback(async <T,>(path: string, options?: RequestInit): Promise<T> => {
    if (authManager?.isAuthenticated()) {
      return authManager.fetchWithAuth<T>(path, options);
    }
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers['X-API-Key'] = apiKey;
    const res = await fetch(`${serverUrl}${path}`, { ...options, headers: { ...headers, ...options?.headers } });
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    return res.json();
  }, [serverUrl, apiKey, authManager]);

  const fetchReturns = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const qs = new URLSearchParams();
      qs.set('limit', String(pageSize));
      qs.set('offset', String(offset));
      if (statusFilter !== 'all') qs.set('status', statusFilter);

      const data = await fetchWithAuth<{ returns: ReturnRequest[] }>(`/admin/returns?${qs.toString()}`);
      setReturns(data.returns ?? []);
    } catch {
      setFetchError('Failed to load returns');
      setReturns([]);
    } finally {
      setIsLoading(false);
    }
  }, [fetchWithAuth, pageSize, offset, statusFilter]);

  useEffect(() => { fetchReturns(); }, [fetchReturns]);

  const openDetail = async (id: string) => {
    setLoadingDetail(true);
    setFetchError(null);
    try {
      const data = await fetchWithAuth<ReturnRequest>(`/admin/returns/${encodeURIComponent(id)}`);
      setSelectedReturn(data);
    } catch {
      setFetchError('Failed to load return details');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleStatusUpdated = (updated: ReturnRequest) => {
    setSelectedReturn(updated);
    setReturns((prev) => prev.map((r) => r.id === updated.id ? updated : r));
  };

  // ─── Detail view ────────────────────────────────────────────────────────

  if (selectedReturn) {
    return (
      <ReturnDetailView
        returnRequest={selectedReturn}
        onBack={() => setSelectedReturn(null)}
        onStatusUpdated={handleStatusUpdated}
        onError={setFetchError}
        fetchWithAuth={fetchWithAuth}
      />
    );
  }

  // ─── List view ──────────────────────────────────────────────────────────

  return (
    <div>
      <div className="cedros-admin__section-header">
        <h3 className="cedros-admin__section-title">Returns</h3>
      </div>

      <ErrorBanner message={fetchError} />

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
        <select
          className="cedros-admin__input"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as 'all' | ReturnStatus); setOffset(0); }}
          style={{ width: 'auto', fontSize: '0.85rem' }}
        >
          <option value="all">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        <span style={{ fontSize: '0.85rem', color: 'var(--cedros-admin-text-muted, #888)' }}>
          {returns.length} result{returns.length !== 1 ? 's' : ''}
        </span>
      </div>

      {isLoading || loadingDetail ? (
        <div className="cedros-admin__loading">{Icons.loading} Loading returns...</div>
      ) : returns.length === 0 ? (
        <div className="cedros-admin__empty">No returns found.</div>
      ) : (
        <>
          <div className="cedros-admin__table-container">
            <table className="cedros-admin__table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Items</th>
                  <th>Status</th>
                  <th>Reason</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {returns.map((r) => (
                  <tr key={r.id}>
                    <td><code style={{ fontSize: '0.75rem' }}>{r.orderId}</code></td>
                    <td>{r.items.length}</td>
                    <td>
                      <span className={`cedros-admin__badge cedros-admin__badge--${statusBadgeVariant(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                    <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.reason ?? <span style={{ color: 'var(--cedros-admin-text-muted, #888)' }}>—</span>}
                    </td>
                    <td>{formatDateTime(r.createdAt)}</td>
                    <td>
                      <button
                        type="button"
                        className="cedros-admin__button cedros-admin__button--ghost cedros-admin__button--sm"
                        onClick={() => openDetail(r.id)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', fontSize: '0.85rem' }}>
            <button
              type="button"
              className="cedros-admin__button cedros-admin__button--ghost cedros-admin__button--sm"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - pageSize))}
            >
              Previous
            </button>
            <span>Showing {returns.length} return{returns.length !== 1 ? 's' : ''}</span>
            <button
              type="button"
              className="cedros-admin__button cedros-admin__button--ghost cedros-admin__button--sm"
              disabled={returns.length < pageSize}
              onClick={() => setOffset(offset + pageSize)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
