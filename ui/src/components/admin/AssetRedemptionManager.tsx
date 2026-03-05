/**
 * AssetRedemptionManager
 *
 * Admin component for managing asset redemption requests.
 * Supports filtering, reviewing, approving, rejecting, and completing redemptions.
 *
 * Props:
 *   serverUrl  — base URL for the Cedros Pay server
 *   apiKey     — optional X-API-Key for unauthenticated admin access
 *   authManager — optional auth manager for JWT-authenticated requests
 */

import { useState, useEffect, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AssetRedemptionStatus =
  | 'pending_info'
  | 'info_submitted'
  | 'under_review'
  | 'approved'
  | 'completed'
  | 'rejected';

interface AssetRedemption {
  id: string;
  tenantId: string;
  orderId: string;
  productId: string;
  collectionId: string;
  userId?: string;
  status: AssetRedemptionStatus;
  formData: Record<string, unknown>;
  adminNotes?: string;
  tokenMintSignature?: string;
  tokenBurnSignature?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssetRedemptionManagerProps {
  serverUrl: string;
  apiKey?: string;
  authManager?: {
    isAuthenticated: () => boolean;
    fetchWithAuth: <T>(path: string, opts?: RequestInit) => Promise<T>;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'pending_info', label: 'Pending Info' },
  { value: 'info_submitted', label: 'Info Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected', label: 'Rejected' },
];

function statusBadgeClass(status: AssetRedemptionStatus): string {
  switch (status) {
    case 'pending_info':   return 'cedros-admin__badge cedros-admin__badge--muted';
    case 'info_submitted': return 'cedros-admin__badge cedros-admin__badge--info';
    case 'under_review':   return 'cedros-admin__badge cedros-admin__badge--warning';
    case 'approved':       return 'cedros-admin__badge cedros-admin__badge--success';
    case 'completed':      return 'cedros-admin__badge cedros-admin__badge--success';
    case 'rejected':       return 'cedros-admin__badge cedros-admin__badge--failed';
    default:               return 'cedros-admin__badge cedros-admin__badge--muted';
  }
}

function statusLabel(status: AssetRedemptionStatus): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function shortId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 8)}…` : id;
}

function solscanLink(sig: string): string {
  return `https://solscan.io/tx/${sig}`;
}

// ---------------------------------------------------------------------------
// Detail Panel
// ---------------------------------------------------------------------------
interface DetailPanelProps {
  redemption: AssetRedemption;
  onAction: (id: string, status: AssetRedemptionStatus, notes: string) => Promise<void>;
  onComplete: (id: string) => Promise<void>;
  actionBusy: boolean;
}

function DetailPanel({ redemption, onAction, onComplete, actionBusy }: DetailPanelProps) {
  const [notes, setNotes] = useState(redemption.adminNotes ?? '');

  const formEntries = Object.entries(redemption.formData ?? {});

  return (
    <div style={{ padding: '1rem 1.25rem', background: 'rgba(0,0,0,0.02)', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Form data */}
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.6 }}>
            Form Data
          </div>
          {formEntries.length === 0 ? (
            <div style={{ fontSize: '0.85rem', opacity: 0.5 }}>No form data submitted.</div>
          ) : (
            <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px', fontSize: '0.85rem' }}>
              {formEntries.map(([k, v]) => (
                <>
                  <dt key={`k-${k}`} style={{ fontWeight: 500, color: 'rgba(0,0,0,0.6)', whiteSpace: 'nowrap' }}>{k}</dt>
                  <dd key={`v-${k}`} style={{ margin: 0, wordBreak: 'break-word' }}>{String(v ?? '—')}</dd>
                </>
              ))}
            </dl>
          )}

          {/* Token signatures */}
          {(redemption.tokenMintSignature || redemption.tokenBurnSignature) && (
            <div style={{ marginTop: 12, fontSize: '0.8rem' }}>
              <div style={{ fontWeight: 600, marginBottom: 4, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Signatures</div>
              {redemption.tokenMintSignature && (
                <div>
                  Mint:{' '}
                  <a href={solscanLink(redemption.tokenMintSignature)} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                    {shortId(redemption.tokenMintSignature)}
                  </a>
                </div>
              )}
              {redemption.tokenBurnSignature && (
                <div>
                  Burn:{' '}
                  <a href={solscanLink(redemption.tokenBurnSignature)} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                    {shortId(redemption.tokenBurnSignature)}
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Admin notes + actions */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: 4 }}>Admin Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={4}
            style={{ width: '100%', padding: '0.4rem 0.6rem', border: '1px solid rgba(0,0,0,0.2)', borderRadius: 4, fontSize: '0.85rem', resize: 'vertical', boxSizing: 'border-box' }}
            placeholder="Internal notes (not shown to user)..."
          />

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: 8, flexWrap: 'wrap' }}>
            {redemption.status === 'info_submitted' && (
              <button
                className="cedros-admin__button cedros-admin__button--primary cedros-admin__button--sm"
                disabled={actionBusy}
                onClick={() => onAction(redemption.id, 'under_review', notes)}
              >
                {actionBusy ? 'Saving...' : 'Mark Under Review'}
              </button>
            )}
            {redemption.status === 'under_review' && (
              <>
                <button
                  className="cedros-admin__button cedros-admin__button--primary cedros-admin__button--sm"
                  disabled={actionBusy}
                  onClick={() => onAction(redemption.id, 'approved', notes)}
                >
                  {actionBusy ? 'Saving...' : 'Approve'}
                </button>
                <button
                  className="cedros-admin__button cedros-admin__button--outline cedros-admin__button--danger cedros-admin__button--sm"
                  disabled={actionBusy}
                  onClick={() => onAction(redemption.id, 'rejected', notes)}
                >
                  {actionBusy ? 'Saving...' : 'Reject'}
                </button>
              </>
            )}
            {redemption.status === 'approved' && (
              <button
                className="cedros-admin__button cedros-admin__button--primary cedros-admin__button--sm"
                disabled={actionBusy}
                onClick={() => onComplete(redemption.id)}
              >
                {actionBusy ? 'Processing...' : 'Complete'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function AssetRedemptionManager({ serverUrl, apiKey, authManager }: AssetRedemptionManagerProps) {
  const [redemptions, setRedemptions] = useState<AssetRedemption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);

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

  const fetchRedemptions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const qs = statusFilter ? `?status=${encodeURIComponent(statusFilter)}&limit=50&offset=0` : '?limit=50&offset=0';
      const data = await adminFetch<{ redemptions: AssetRedemption[] }>(`/admin/asset-redemptions${qs}`);
      setRedemptions(data.redemptions ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load redemptions');
    } finally {
      setIsLoading(false);
    }
  }, [adminFetch, statusFilter]);

  useEffect(() => { fetchRedemptions(); }, [fetchRedemptions]);

  const handleStatusUpdate = useCallback(async (id: string, status: AssetRedemptionStatus, adminNotes: string) => {
    setActionBusyId(id);
    setError(null);
    try {
      await adminFetch(`/admin/asset-redemptions/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, adminNotes }),
      });
      setExpandedId(null);
      await fetchRedemptions();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update status');
    } finally {
      setActionBusyId(null);
    }
  }, [adminFetch, fetchRedemptions]);

  const handleComplete = useCallback(async (id: string) => {
    setActionBusyId(id);
    setError(null);
    try {
      await adminFetch(`/admin/asset-redemptions/${id}/complete`, { method: 'POST' });
      setExpandedId(null);
      await fetchRedemptions();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to complete redemption');
    } finally {
      setActionBusyId(null);
    }
  }, [adminFetch, fetchRedemptions]);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  return (
    <div className="cedros-admin__page">
      {/* Filter bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: 4 }}>Status</label>
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setExpandedId(null); }}
            style={{ padding: '0.4rem 0.6rem', border: '1px solid rgba(0,0,0,0.2)', borderRadius: 4, fontSize: '0.9rem', minWidth: 160 }}
          >
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div style={{ alignSelf: 'flex-end' }}>
          <button
            className="cedros-admin__button cedros-admin__button--outline"
            onClick={fetchRedemptions}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{ padding: '0.75rem 1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, color: '#dc2626', marginBottom: '1rem', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="cedros-admin__loading">Loading redemptions...</div>
      ) : redemptions.length === 0 ? (
        <div className="cedros-admin__empty">No redemption requests found.</div>
      ) : (
        <div className="cedros-admin__table-container">
          <table className="cedros-admin__table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Order</th>
                <th>Product</th>
                <th>Collection</th>
                <th>User</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {redemptions.map(r => (
                <>
                  <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => toggleExpand(r.id)}>
                    <td>{formatDate(r.createdAt)}</td>
                    <td><code title={r.orderId}>{shortId(r.orderId)}</code></td>
                    <td><code title={r.productId}>{shortId(r.productId)}</code></td>
                    <td><code title={r.collectionId}>{shortId(r.collectionId)}</code></td>
                    <td>{r.userId ? <code title={r.userId}>{shortId(r.userId)}</code> : <span style={{ opacity: 0.4 }}>—</span>}</td>
                    <td>
                      <span className={statusBadgeClass(r.status)}>
                        {statusLabel(r.status)}
                      </span>
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {(r.status === 'info_submitted' || r.status === 'under_review' || r.status === 'approved') && (
                          <button
                            className="cedros-admin__button cedros-admin__button--outline cedros-admin__button--sm"
                            onClick={() => toggleExpand(r.id)}
                          >
                            {expandedId === r.id ? 'Close' : 'Review'}
                          </button>
                        )}
                        {r.status === 'under_review' && (
                          <>
                            <button
                              className="cedros-admin__button cedros-admin__button--primary cedros-admin__button--sm"
                              disabled={actionBusyId === r.id}
                              onClick={() => handleStatusUpdate(r.id, 'approved', r.adminNotes ?? '')}
                            >
                              Approve
                            </button>
                            <button
                              className="cedros-admin__button cedros-admin__button--outline cedros-admin__button--danger cedros-admin__button--sm"
                              disabled={actionBusyId === r.id}
                              onClick={() => handleStatusUpdate(r.id, 'rejected', r.adminNotes ?? '')}
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {r.status === 'approved' && (
                          <button
                            className="cedros-admin__button cedros-admin__button--primary cedros-admin__button--sm"
                            disabled={actionBusyId === r.id}
                            onClick={() => handleComplete(r.id)}
                          >
                            {actionBusyId === r.id ? 'Processing...' : 'Complete'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedId === r.id && (
                    <tr key={`${r.id}-detail`}>
                      <td colSpan={7} style={{ padding: 0 }}>
                        <DetailPanel
                          redemption={r}
                          onAction={handleStatusUpdate}
                          onComplete={handleComplete}
                          actionBusy={actionBusyId === r.id}
                        />
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
