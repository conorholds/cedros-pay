/**
 * Admin Dashboard — Disputes & Chargebacks Section
 *
 * List disputes with filters, view details, update status.
 * Server: GET /admin/disputes, GET /admin/disputes/:id, POST /admin/disputes/:id/status
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

interface DisputeRecord {
  id: string;
  source: string;
  orderId?: string;
  paymentIntentId?: string;
  chargeId?: string;
  status: string;
  reason?: string;
  amount: number;
  currency: string;
  metadata: Record<string, string>;
  createdAt: string;
  updatedAt?: string;
  statusUpdatedAt?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const statusBadge = (status: string): string => {
  switch (status) {
    case 'won': return 'success';
    case 'lost': return 'failed';
    case 'needs_response': case 'warning_needs_response': return 'pending';
    default: return 'muted';
  }
};

const formatAmount = (cents: number, currency: string): string =>
  `${currency.toUpperCase()} ${(cents / 100).toFixed(2)}`;

/** Stable accessor for the sortable dispute columns (see useTableSort). */
function disputeSortValue(d: DisputeRecord, key: string): SortValue {
  switch (key) {
    case 'amount': return d.amount;
    case 'status': return d.status;
    case 'reason': return d.reason ?? '';
    case 'source': return d.source;
    case 'created': return d.createdAt;
    default: return null;
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export function DisputesSection({ pageSize = 20, authManager }: SectionProps) {
  const [disputes, setDisputes] = useState<DisputeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDispute, setSelectedDispute] = useState<DisputeRecord | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const { sorted: sortedDisputes, sortKey, sortDirection, toggleSort } = useTableSort(
    disputes,
    disputeSortValue,
    { key: 'created', direction: 'desc' }
  );

  const fetchWithAuth = useCallback(async <T,>(path: string, options?: RequestInit): Promise<T> => {
    return fetchAdminJson<T>(authManager, path, options);
  }, [authManager]);

  const fetchDisputes = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const qs = new URLSearchParams();
      qs.set('limit', String(pageSize));
      qs.set('offset', String(offset));
      if (statusFilter !== 'all') qs.set('status', statusFilter);

      const data = await fetchWithAuth<{ disputes: DisputeRecord[] }>(`/admin/disputes?${qs.toString()}`);
      setDisputes(data.disputes ?? []);
    } catch {
      setFetchError('Failed to load disputes');
    } finally {
      setIsLoading(false);
    }
  }, [fetchWithAuth, pageSize, offset, statusFilter]);

  useEffect(() => { fetchDisputes(); }, [fetchDisputes]);
  useBackgroundRefresh(fetchDisputes);

  const openDetail = async (id: string) => {
    try {
      const data = await fetchWithAuth<DisputeRecord>(`/admin/disputes/${encodeURIComponent(id)}`);
      setSelectedDispute(data);
      setNewStatus(data.status);
    } catch {
      setFetchError('Failed to load dispute details');
    }
  };

  const updateStatus = async () => {
    if (!selectedDispute || !newStatus.trim()) return;
    setIsUpdating(true);
    try {
      const updated = await fetchWithAuth<DisputeRecord>(
        `/admin/disputes/${encodeURIComponent(selectedDispute.id)}/status`,
        { method: 'POST', body: JSON.stringify({ status: newStatus }) }
      );
      setSelectedDispute(updated);
      fetchDisputes();
    } catch {
      setFetchError('Failed to update dispute status');
    } finally {
      setIsUpdating(false);
    }
  };

  // ─── Detail view ──────────────────────────────────────────────────────

  if (selectedDispute) {
    const d = selectedDispute;
    return (
      <div>
        <button
          type="button"
          className="cedros-data-btn cedros-admin__button cedros-data-btn--ghost cedros-admin__button--ghost cedros-data-btn--sm cedros-admin__button--sm"
          onClick={() => setSelectedDispute(null)}
          style={{ marginBottom: '1rem' }}
        >
          &larr; Back to disputes
        </button>

        <div className="cedros-admin__section-header">
          <h3 className="cedros-admin__section-title">
            Dispute <code style={{ fontSize: '0.8rem' }}>{d.id.slice(0, 12)}</code>
          </h3>
        </div>

        <div className="cedros-data-table-wrap cedros-admin__table-container" style={{ maxWidth: '500px' }}>
          <table className="cedros-data-table cedros-admin__table">
            <tbody>
              <tr><td style={{ fontWeight: 600, width: '35%' }}>Status</td><td>
                <span className={`cedros-data-pill cedros-admin__badge cedros-admin__badge--${statusBadge(d.status)}`}>{d.status}</span>
              </td></tr>
              <tr><td style={{ fontWeight: 600 }}>Amount</td><td>{formatAmount(d.amount, d.currency)}</td></tr>
              <tr><td style={{ fontWeight: 600 }}>Source</td><td>{d.source}</td></tr>
              {d.reason && <tr><td style={{ fontWeight: 600 }}>Reason</td><td>{d.reason}</td></tr>}
              {d.orderId && <tr><td style={{ fontWeight: 600 }}>Order ID</td><td><code>{d.orderId}</code></td></tr>}
              {d.chargeId && <tr><td style={{ fontWeight: 600 }}>Charge ID</td><td><code>{d.chargeId}</code></td></tr>}
              {d.paymentIntentId && <tr><td style={{ fontWeight: 600 }}>Payment intent</td><td><code>{d.paymentIntentId}</code></td></tr>}
              <tr><td style={{ fontWeight: 600 }}>Created</td><td>{formatDateTime(d.createdAt)}</td></tr>
              {d.statusUpdatedAt && <tr><td style={{ fontWeight: 600 }}>Status updated</td><td>{formatDateTime(d.statusUpdatedAt)}</td></tr>}
            </tbody>
          </table>
        </div>

        {/* Status update */}
        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-end', maxWidth: '400px' }}>
          <FormDropdown
            label="Update status"
            value={newStatus}
            onChange={setNewStatus}
            style={{ flex: 1 }}
            options={[
              { value: 'needs_response', label: 'Needs response' },
              { value: 'under_review', label: 'Under review' },
              { value: 'won', label: 'Won' },
              { value: 'lost', label: 'Lost' },
              { value: 'warning_closed', label: 'Warning closed' },
            ]}
          />
          <button
            type="button"
            className="cedros-data-btn cedros-admin__button cedros-data-btn--primary cedros-admin__button--primary"
            onClick={updateStatus}
            disabled={isUpdating || newStatus === d.status}
          >
            {isUpdating ? 'Updating…' : 'Update'}
          </button>
        </div>
      </div>
    );
  }

  // ─── List view ────────────────────────────────────────────────────────

  // Stats are derived from the loaded page until disputes has a dedicated
  // aggregate stats endpoint, matching the lightweight list-first workflow here.
  const countByStatus = (...values: string[]) =>
    disputes.filter((d) => values.includes(d.status)).length;
  const statItems: StatItem[] = [
    { label: 'Total', value: disputes.length },
    {
      label: 'Needs response',
      value: countByStatus('needs_response', 'warning_needs_response'),
      variant: countByStatus('needs_response', 'warning_needs_response') > 0 ? 'warning' : 'muted',
    },
    { label: 'Under review', value: countByStatus('under_review') },
    {
      label: 'Won',
      value: countByStatus('won'),
      variant: countByStatus('won') > 0 ? 'success' : 'muted',
    },
    {
      label: 'Lost',
      value: countByStatus('lost'),
      variant: countByStatus('lost') > 0 ? 'warning' : 'muted',
    },
  ];

  return (
    <div className="cedros-data-stack cedros-admin__page">
      <ErrorBanner message={disputes.length > 0 ? fetchError : null} />
      <StatsBar stats={statItems} isLoading={isLoading && disputes.length === 0} />

      <div className="cedros-data-toolbar cedros-admin__toolbar">
        <div className="cedros-admin__filter">
          <span className="cedros-admin__filter-label">Status</span>
          <FilterDropdown
            ariaLabel="Status"
            value={statusFilter}
            onChange={(value) => { setStatusFilter(value); setOffset(0); }}
            options={[
              { value: 'all', label: 'All statuses' },
              { value: 'needs_response', label: 'Needs response' },
              { value: 'under_review', label: 'Under review' },
              { value: 'won', label: 'Won' },
              { value: 'lost', label: 'Lost' },
            ]}
          />
        </div>
      </div>

      <>
          <div className="cedros-data-table-wrap cedros-admin__table-container">
          <table className="cedros-data-table cedros-admin__table" aria-busy={isLoading}>
            <thead>
              <tr>
                <th>ID</th>
                <SortableHeader label="Amount" sortKey="amount" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                <SortableHeader label="Status" sortKey="status" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                <SortableHeader label="Reason" sortKey="reason" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                <SortableHeader label="Source" sortKey="source" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                <SortableHeader label="Created" sortKey="created" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                <th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && sortedDisputes.length === 0 ? (
                <TableLoadingRows columns={7} label="Loading disputes…" />
              ) : fetchError && sortedDisputes.length === 0 ? (
                <TableErrorRow columns={7} message={fetchError} onRetry={fetchDisputes} />
              ) : sortedDisputes.length === 0 ? (
                <TableEmptyRow
                  columns={7}
                  filtered={statusFilter !== 'all'}
                  title={statusFilter !== 'all' ? 'No disputes match this filter' : 'No disputes yet'}
                  description={statusFilter !== 'all' ? 'Try a different status filter to see more disputes.' : 'Disputes and chargebacks appear here when a customer or bank contests a payment.'}
                  action={statusFilter !== 'all' ? (
                    <button type="button" className="cedros-data-btn cedros-data-btn--ghost cedros-data-btn--sm" onClick={() => setStatusFilter('all')}>
                      Clear filters
                    </button>
                  ) : undefined}
                />
              ) : sortedDisputes.map((d) => (
                <tr key={d.id}>
                  <td><code style={{ fontSize: '0.75rem' }}>{d.id.slice(0, 12)}</code></td>
                  <td>{formatAmount(d.amount, d.currency)}</td>
                  <td>
                    <span className={`cedros-data-pill cedros-admin__badge cedros-admin__badge--${statusBadge(d.status)}`}>
                      {d.status}
                    </span>
                  </td>
                  <td>{d.reason ?? '—'}</td>
                  <td>{d.source}</td>
                  <td>{formatDateTime(d.createdAt)}</td>
                  <td>
                    <button
                      type="button"
                      className="cedros-data-btn cedros-admin__button cedros-data-btn--ghost cedros-admin__button--ghost cedros-data-btn--sm cedros-admin__button--sm"
                      onClick={() => openDetail(d.id)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          {disputes.length > 0 ? (
          <div className="cedros-data-pagination">
            <button type="button" className="cedros-data-btn cedros-admin__button cedros-data-btn--ghost cedros-admin__button--ghost cedros-data-btn--sm cedros-admin__button--sm"
              disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - pageSize))}>Previous</button>
            <span>Showing {disputes.length} dispute{disputes.length !== 1 ? 's' : ''}</span>
            <button type="button" className="cedros-data-btn cedros-admin__button cedros-data-btn--ghost cedros-admin__button--ghost cedros-data-btn--sm cedros-admin__button--sm"
              disabled={disputes.length < pageSize} onClick={() => setOffset(offset + pageSize)}>Next</button>
          </div>
          ) : null}
        </>
    </div>
  );
}
