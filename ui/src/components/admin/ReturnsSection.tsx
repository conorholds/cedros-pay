/**
 * Admin Dashboard — Returns Section
 *
 * List return requests with status filter, view details, update status.
 * Server: GET /admin/returns, GET /admin/returns/:id,
 *         POST /admin/returns, POST /admin/returns/:id/status
 */

import { useState, useEffect, useCallback } from 'react';
import { ErrorBanner } from './ErrorBanner';
import { StatsBar, type StatItem } from './StatsBar';
import { FilterDropdown, FormDropdown } from './Dropdown';
import { SortableHeader } from './SortableHeader';
import { TableEmptyRow, TableErrorRow, TableLoadingRows } from './TableStateRows';
import { useBackgroundRefresh } from './useBackgroundRefresh';
import { useTableSort, type SortValue } from './useTableSort';
import type { SectionProps } from './types';
import { formatDateTime } from '../../utils/dateHelpers';
import { fetchAdminJson } from './authFetch';

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

const titleCase = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** Stable accessor for the sortable return columns (see useTableSort). */
function returnSortValue(r: ReturnRequest, key: string): SortValue {
  switch (key) {
    case 'orderId': return r.orderId;
    case 'items': return r.items.length;
    case 'status': return r.status;
    case 'created': return r.createdAt;
    default: return null;
  }
}

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
        { method: 'POST', body: JSON.stringify({ status: newStatus }) }
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
        className="cedros-data-btn cedros-admin__button cedros-data-btn--ghost cedros-admin__button--ghost cedros-data-btn--sm cedros-admin__button--sm"
        onClick={onBack}
        style={{ marginBottom: '1rem' }}
      >
        &larr; Back to returns
      </button>

      <div className="cedros-admin__section-header">
        <h3 className="cedros-admin__section-title">
          Return <code style={{ fontSize: '0.8rem' }}>{r.id.slice(0, 12)}</code>
          <span
            className={`cedros-data-pill cedros-admin__badge cedros-admin__badge--${statusBadgeVariant(r.status)}`}
            style={{ marginLeft: '0.5rem' }}
          >
            {r.status}
          </span>
        </h3>
      </div>

      <div className="cedros-data-table-wrap cedros-admin__table-container" style={{ maxWidth: '500px', marginBottom: '1rem' }}>
        <table className="cedros-data-table cedros-admin__table">
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
                <td style={{ fontWeight: 600 }}>Status updated</td>
                <td>{formatDateTime(r.statusUpdatedAt)}</td>
              </tr>
            )}
            {r.updatedAt && (
              <tr>
                <td style={{ fontWeight: 600 }}>Last updated</td>
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
      <div className="cedros-data-table-wrap cedros-admin__table-container" style={{ maxWidth: '500px', marginBottom: '1.25rem' }}>
        <table className="cedros-data-table cedros-admin__table">
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
                    : <span className="cedros-admin__text-muted">—</span>}
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
          <div className="cedros-data-table-wrap cedros-admin__table-container" style={{ maxWidth: '500px', marginBottom: '1.25rem' }}>
            <table className="cedros-data-table cedros-admin__table">
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
        <FormDropdown
          label="Update status"
          value={newStatus}
          onChange={(value) => setNewStatus(value as ReturnStatus)}
          options={STATUS_OPTIONS.map((s) => ({ value: s, label: titleCase(s) }))}
          style={{ flex: 1 }}
        />
        <button
          type="button"
          className="cedros-data-btn cedros-admin__button cedros-data-btn--primary cedros-admin__button--primary"
          onClick={updateStatus}
          disabled={isUpdating || newStatus === r.status}
        >
          {isUpdating ? 'Updating…' : 'Update'}
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function ReturnsSection({ pageSize = 20, authManager }: SectionProps) {
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState<'all' | ReturnStatus>('all');
  const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null);
  const { sorted: sortedReturns, sortKey, sortDirection, toggleSort } = useTableSort(
    returns,
    returnSortValue,
    { key: 'created', direction: 'desc' }
  );

  const fetchWithAuth = useCallback(async <T,>(path: string, options?: RequestInit): Promise<T> => {
    return fetchAdminJson<T>(authManager, path, options);
  }, [authManager]);

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
    } finally {
      setIsLoading(false);
    }
  }, [fetchWithAuth, pageSize, offset, statusFilter]);

  useEffect(() => { fetchReturns(); }, [fetchReturns]);
  useBackgroundRefresh(fetchReturns);

  const openDetail = async (id: string) => {
    setFetchError(null);
    try {
      const data = await fetchWithAuth<ReturnRequest>(`/admin/returns/${encodeURIComponent(id)}`);
      setSelectedReturn(data);
    } catch {
      setFetchError('Failed to load return details');
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

  // Stats are derived from the loaded page until returns has a dedicated
  // aggregate stats endpoint, matching the lightweight list-first workflow here.
  const countByStatus = (status: ReturnStatus) => returns.filter((r) => r.status === status).length;
  const statItems: StatItem[] = [
    { label: 'Total', value: returns.length },
    {
      label: 'Requested',
      value: countByStatus('requested'),
      variant: countByStatus('requested') > 0 ? 'warning' : 'muted',
    },
    { label: 'Approved', value: countByStatus('approved') },
    { label: 'Refunded', value: countByStatus('refunded'), variant: 'success' },
  ];

  return (
    <div className="cedros-data-stack cedros-admin__page">
      <ErrorBanner message={returns.length > 0 ? fetchError : null} />
      <StatsBar stats={statItems} isLoading={isLoading && returns.length === 0} />

      <div className="cedros-data-toolbar cedros-admin__toolbar">
        <div className="cedros-admin__filter">
          <span className="cedros-admin__filter-label">Status</span>
          <FilterDropdown
            ariaLabel="Status"
            value={statusFilter}
            onChange={(value) => { setStatusFilter(value as 'all' | ReturnStatus); setOffset(0); }}
            options={[
              { value: 'all', label: 'All statuses' },
              ...STATUS_OPTIONS.map((s) => ({ value: s, label: titleCase(s) })),
            ]}
          />
        </div>
      </div>

      <>
          <div className="cedros-data-table-wrap cedros-admin__table-container">
          <table className="cedros-data-table cedros-admin__table" aria-busy={isLoading}>
            <thead>
              <tr>
                <SortableHeader label="Order ID" sortKey="orderId" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                <SortableHeader label="Items" sortKey="items" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                <SortableHeader label="Status" sortKey="status" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                <th>Reason</th>
                <SortableHeader label="Created" sortKey="created" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                <th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && sortedReturns.length === 0 ? (
                <TableLoadingRows columns={6} label="Loading returns…" />
              ) : fetchError && sortedReturns.length === 0 ? (
                <TableErrorRow columns={6} message={fetchError} onRetry={fetchReturns} />
              ) : sortedReturns.length === 0 ? (
                <TableEmptyRow
                  columns={6}
                  filtered={statusFilter !== 'all'}
                  title={statusFilter !== 'all' ? 'No returns match this filter' : 'No returns yet'}
                  description={statusFilter !== 'all' ? 'Try a different status filter to see more returns.' : 'No return requests have been created yet.'}
                  action={statusFilter !== 'all' ? (
                    <button type="button" className="cedros-data-btn cedros-data-btn--ghost cedros-data-btn--sm" onClick={() => setStatusFilter('all')}>
                      Clear filters
                    </button>
                  ) : undefined}
                />
              ) : sortedReturns.map((r) => (
                <tr key={r.id}>
                  <td><code style={{ fontSize: '0.75rem' }}>{r.orderId}</code></td>
                  <td>{r.items.length}</td>
                  <td>
                    <span className={`cedros-data-pill cedros-admin__badge cedros-admin__badge--${statusBadgeVariant(r.status)}`}>
                      {r.status}
                    </span>
                  </td>
                  <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.reason ?? <span className="cedros-admin__text-muted">—</span>}
                  </td>
                  <td>{formatDateTime(r.createdAt)}</td>
                  <td>
                    <button
                      type="button"
                      className="cedros-data-btn cedros-admin__button cedros-data-btn--ghost cedros-admin__button--ghost cedros-data-btn--sm cedros-admin__button--sm"
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

          {returns.length > 0 ? (
          <div className="cedros-data-pagination">
            <button
              type="button"
              className="cedros-data-btn cedros-admin__button cedros-data-btn--ghost cedros-admin__button--ghost cedros-data-btn--sm cedros-admin__button--sm"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - pageSize))}
            >
              Previous
            </button>
            <span>Showing {returns.length} return{returns.length !== 1 ? 's' : ''}</span>
            <button
              type="button"
              className="cedros-data-btn cedros-admin__button cedros-data-btn--ghost cedros-admin__button--ghost cedros-data-btn--sm cedros-admin__button--sm"
              disabled={returns.length < pageSize}
              onClick={() => setOffset(offset + pageSize)}
            >
              Next
            </button>
          </div>
          ) : null}
        </>
    </div>
  );
}
