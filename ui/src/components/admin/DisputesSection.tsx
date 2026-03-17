/**
 * Admin Dashboard — Disputes & Chargebacks Section
 *
 * List disputes with filters, view details, update status.
 * Server: GET /admin/disputes, GET /admin/disputes/:id, PUT /admin/disputes/:id/status
 */

import { useState, useEffect, useCallback } from 'react';
import { Icons } from './icons';
import { ErrorBanner } from './ErrorBanner';
import type { SectionProps } from './types';
import { formatDateTime } from '../../utils/dateHelpers';

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

// ─── Component ──────────────────────────────────────────────────────────────

export function DisputesSection({ serverUrl, apiKey, pageSize = 20, authManager }: SectionProps) {
  const [disputes, setDisputes] = useState<DisputeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDispute, setSelectedDispute] = useState<DisputeRecord | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

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
      setDisputes([]);
    } finally {
      setIsLoading(false);
    }
  }, [fetchWithAuth, pageSize, offset, statusFilter]);

  useEffect(() => { fetchDisputes(); }, [fetchDisputes]);

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
        { method: 'PUT', body: JSON.stringify({ status: newStatus }) }
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
          className="cedros-admin__button cedros-admin__button--ghost cedros-admin__button--sm"
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

        <div className="cedros-admin__table-container" style={{ maxWidth: '500px' }}>
          <table className="cedros-admin__table">
            <tbody>
              <tr><td style={{ fontWeight: 600, width: '35%' }}>Status</td><td>
                <span className={`cedros-admin__badge cedros-admin__badge--${statusBadge(d.status)}`}>{d.status}</span>
              </td></tr>
              <tr><td style={{ fontWeight: 600 }}>Amount</td><td>{formatAmount(d.amount, d.currency)}</td></tr>
              <tr><td style={{ fontWeight: 600 }}>Source</td><td>{d.source}</td></tr>
              {d.reason && <tr><td style={{ fontWeight: 600 }}>Reason</td><td>{d.reason}</td></tr>}
              {d.orderId && <tr><td style={{ fontWeight: 600 }}>Order ID</td><td><code>{d.orderId}</code></td></tr>}
              {d.chargeId && <tr><td style={{ fontWeight: 600 }}>Charge ID</td><td><code>{d.chargeId}</code></td></tr>}
              {d.paymentIntentId && <tr><td style={{ fontWeight: 600 }}>Payment Intent</td><td><code>{d.paymentIntentId}</code></td></tr>}
              <tr><td style={{ fontWeight: 600 }}>Created</td><td>{formatDateTime(d.createdAt)}</td></tr>
              {d.statusUpdatedAt && <tr><td style={{ fontWeight: 600 }}>Status Updated</td><td>{formatDateTime(d.statusUpdatedAt)}</td></tr>}
            </tbody>
          </table>
        </div>

        {/* Status update */}
        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-end', maxWidth: '400px' }}>
          <div className="cedros-admin__field" style={{ flex: 1 }}>
            <label className="cedros-admin__field-label">Update Status</label>
            <select className="cedros-admin__input" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
              <option value="needs_response">Needs Response</option>
              <option value="under_review">Under Review</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
              <option value="warning_closed">Warning Closed</option>
            </select>
          </div>
          <button
            type="button"
            className="cedros-admin__button cedros-admin__button--primary"
            onClick={updateStatus}
            disabled={isUpdating || newStatus === d.status}
          >
            {isUpdating ? 'Updating...' : 'Update'}
          </button>
        </div>
      </div>
    );
  }

  // ─── List view ────────────────────────────────────────────────────────

  return (
    <div>
      <div className="cedros-admin__section-header">
        <h3 className="cedros-admin__section-title">Disputes & Chargebacks</h3>
      </div>

      <ErrorBanner message={fetchError} />

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
        <select
          className="cedros-admin__input"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setOffset(0); }}
          style={{ width: 'auto', fontSize: '0.85rem' }}
        >
          <option value="all">All statuses</option>
          <option value="needs_response">Needs Response</option>
          <option value="under_review">Under Review</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
        </select>
      </div>

      {isLoading ? (
        <div className="cedros-admin__loading">{Icons.loading} Loading disputes...</div>
      ) : disputes.length === 0 ? (
        <div className="cedros-admin__empty">No disputes found.</div>
      ) : (
        <>
          <div className="cedros-admin__table-container">
            <table className="cedros-admin__table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Reason</th>
                  <th>Source</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {disputes.map((d) => (
                  <tr key={d.id}>
                    <td><code style={{ fontSize: '0.75rem' }}>{d.id.slice(0, 12)}</code></td>
                    <td>{formatAmount(d.amount, d.currency)}</td>
                    <td>
                      <span className={`cedros-admin__badge cedros-admin__badge--${statusBadge(d.status)}`}>
                        {d.status}
                      </span>
                    </td>
                    <td>{d.reason ?? '—'}</td>
                    <td>{d.source}</td>
                    <td>{formatDateTime(d.createdAt)}</td>
                    <td>
                      <button
                        type="button"
                        className="cedros-admin__button cedros-admin__button--ghost cedros-admin__button--sm"
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

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', fontSize: '0.85rem' }}>
            <button type="button" className="cedros-admin__button cedros-admin__button--ghost cedros-admin__button--sm"
              disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - pageSize))}>Previous</button>
            <span>Showing {disputes.length} dispute{disputes.length !== 1 ? 's' : ''}</span>
            <button type="button" className="cedros-admin__button cedros-admin__button--ghost cedros-admin__button--sm"
              disabled={disputes.length < pageSize} onClick={() => setOffset(offset + pageSize)}>Next</button>
          </div>
        </>
      )}
    </div>
  );
}
