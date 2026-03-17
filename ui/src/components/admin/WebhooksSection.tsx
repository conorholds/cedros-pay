/**
 * Admin Dashboard — Webhooks Section
 *
 * Two tabs: Active webhooks (with status filter + retry/delete) and
 * Dead Letter Queue (DLQ) with retry/delete.
 * Server: GET/POST/DELETE /admin/webhooks, GET/POST/DELETE /admin/webhooks/dlq
 */

import { useState, useEffect, useCallback } from 'react';
import { Icons } from './icons';
import { ErrorBanner } from './ErrorBanner';
import type { SectionProps } from './types';
import { formatDateTime } from '../../utils/dateHelpers';

// ─── Types ──────────────────────────────────────────────────────────────────

interface WebhookResponse {
  id: string;
  tenantId: string;
  url: string;
  eventType: string;
  status: string;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  lastAttemptAt?: string;
  nextAttemptAt?: string;
  createdAt: string;
  completedAt?: string;
}

interface DlqWebhookResponse {
  id: string;
  tenantId: string;
  originalWebhookId: string;
  url: string;
  eventType: string;
  finalError: string;
  totalAttempts: number;
  firstAttemptAt: string;
  lastAttemptAt: string;
  movedToDlqAt: string;
}

type ActiveStatusFilter = 'all' | 'pending' | 'processing' | 'failed' | 'success';
type ActiveTab = 'active' | 'dlq';

// ─── Helpers ────────────────────────────────────────────────────────────────

const webhookStatusBadge = (status: string): string => {
  if (status === 'success') return 'success';
  if (status === 'failed') return 'failed';
  if (status === 'pending' || status === 'processing') return 'pending';
  return 'muted';
};

const truncate = (s: string, max = 48): string =>
  s.length > max ? `${s.slice(0, max)}…` : s;

// ─── Component ──────────────────────────────────────────────────────────────

export function WebhooksSection({ serverUrl, apiKey, authManager }: SectionProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('active');

  // Active webhooks state
  const [webhooks, setWebhooks] = useState<WebhookResponse[]>([]);
  const [webhookCount, setWebhookCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<ActiveStatusFilter>('all');
  const [isLoadingWebhooks, setIsLoadingWebhooks] = useState(true);

  // DLQ state
  const [dlqWebhooks, setDlqWebhooks] = useState<DlqWebhookResponse[]>([]);
  const [dlqCount, setDlqCount] = useState(0);
  const [isLoadingDlq, setIsLoadingDlq] = useState(false);
  const [dlqLoaded, setDlqLoaded] = useState(false);

  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // ─── Auth helper ──────────────────────────────────────────────────────

  const fetchWithAuth = useCallback(async <T,>(path: string, options?: RequestInit): Promise<T> => {
    if (authManager?.isAuthenticated()) {
      return authManager.fetchWithAuth<T>(path, options);
    }
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers['X-API-Key'] = apiKey;
    const res = await fetch(`${serverUrl}${path}`, { ...options, headers: { ...headers, ...options?.headers } });
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    if (res.status === 204) return undefined as T;
    return res.json();
  }, [serverUrl, apiKey, authManager]);

  // ─── Fetch active webhooks ────────────────────────────────────────────

  const fetchWebhooks = useCallback(async () => {
    setIsLoadingWebhooks(true);
    setFetchError(null);
    try {
      const qs = new URLSearchParams({ limit: '100' });
      if (statusFilter !== 'all') qs.set('status', statusFilter);
      const data = await fetchWithAuth<{ webhooks: WebhookResponse[]; count: number }>(
        `/admin/webhooks?${qs.toString()}`
      );
      setWebhooks(data.webhooks ?? []);
      setWebhookCount(data.count ?? 0);
    } catch {
      setFetchError('Failed to load webhooks');
      setWebhooks([]);
    } finally {
      setIsLoadingWebhooks(false);
    }
  }, [fetchWithAuth, statusFilter]);

  useEffect(() => { fetchWebhooks(); }, [fetchWebhooks]);

  // ─── Fetch DLQ ───────────────────────────────────────────────────────

  const fetchDlq = useCallback(async () => {
    setIsLoadingDlq(true);
    setFetchError(null);
    try {
      const data = await fetchWithAuth<{ webhooks: DlqWebhookResponse[]; count: number }>(
        '/admin/webhooks/dlq?limit=100'
      );
      setDlqWebhooks(data.webhooks ?? []);
      setDlqCount(data.count ?? 0);
      setDlqLoaded(true);
    } catch {
      setFetchError('Failed to load DLQ webhooks');
      setDlqWebhooks([]);
    } finally {
      setIsLoadingDlq(false);
    }
  }, [fetchWithAuth]);

  const switchTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    setFetchError(null);
    setActionError(null);
    if (tab === 'dlq' && !dlqLoaded) fetchDlq();
  };

  // ─── Actions: active webhooks ────────────────────────────────────────

  const retryWebhook = async (id: string) => {
    setActionError(null);
    try {
      await fetchWithAuth(`/admin/webhooks/${encodeURIComponent(id)}/retry`, { method: 'POST' });
      fetchWebhooks();
    } catch {
      setActionError('Failed to retry webhook');
    }
  };

  const deleteWebhook = async (id: string) => {
    if (!window.confirm('Delete this webhook?')) return;
    setActionError(null);
    try {
      await fetchWithAuth(`/admin/webhooks/${encodeURIComponent(id)}`, { method: 'DELETE' });
      fetchWebhooks();
    } catch {
      setActionError('Failed to delete webhook');
    }
  };

  // ─── Actions: DLQ ────────────────────────────────────────────────────

  const retryDlq = async (id: string) => {
    setActionError(null);
    try {
      await fetchWithAuth(`/admin/webhooks/dlq/${encodeURIComponent(id)}/retry`, { method: 'POST' });
      fetchDlq();
    } catch {
      setActionError('Failed to retry DLQ webhook');
    }
  };

  const deleteDlq = async (id: string) => {
    if (!window.confirm('Delete this DLQ entry?')) return;
    setActionError(null);
    try {
      await fetchWithAuth(`/admin/webhooks/dlq/${encodeURIComponent(id)}`, { method: 'DELETE' });
      fetchDlq();
    } catch {
      setActionError('Failed to delete DLQ entry');
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────

  return (
    <div>
      <div className="cedros-admin__section-header">
        <h3 className="cedros-admin__section-title">Webhooks</h3>
      </div>

      <ErrorBanner message={fetchError} />
      <ErrorBanner message={actionError} />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem', borderBottom: '1px solid var(--cedros-admin-border, #e0e0e0)' }}>
        {(['active', 'dlq'] as ActiveTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => switchTab(tab)}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.85rem',
              fontWeight: activeTab === tab ? 600 : 400,
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid var(--cedros-admin-primary, #000)' : '2px solid transparent',
              cursor: 'pointer',
              color: activeTab === tab ? 'var(--cedros-admin-text, #333)' : 'var(--cedros-admin-text-muted, #888)',
              marginBottom: '-1px',
            }}
          >
            {tab === 'active' ? `Active Webhooks${webhookCount > 0 ? ` (${webhookCount})` : ''}` : `Dead Letter Queue${dlqCount > 0 ? ` (${dlqCount})` : ''}`}
          </button>
        ))}
      </div>

      {/* ── Active Webhooks tab ────────────────────────────────────────── */}
      {activeTab === 'active' && (
        <>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
            <select
              className="cedros-admin__input"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as ActiveStatusFilter); }}
              style={{ width: 'auto', fontSize: '0.85rem' }}
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="failed">Failed</option>
              <option value="success">Success</option>
            </select>
            <span style={{ fontSize: '0.85rem', color: 'var(--cedros-admin-text-muted, #888)' }}>
              {webhookCount} webhook{webhookCount !== 1 ? 's' : ''}
            </span>
          </div>

          {isLoadingWebhooks ? (
            <div className="cedros-admin__loading">{Icons.loading} Loading webhooks...</div>
          ) : webhooks.length === 0 ? (
            <div className="cedros-admin__empty">No webhooks found.</div>
          ) : (
            <div className="cedros-admin__table-container">
              <table className="cedros-admin__table">
                <thead>
                  <tr>
                    <th>URL</th>
                    <th>Event Type</th>
                    <th>Status</th>
                    <th>Attempts</th>
                    <th>Last Error</th>
                    <th>Created</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {webhooks.map((w) => (
                    <tr key={w.id}>
                      <td style={{ maxWidth: '200px' }}>
                        <span title={w.url} style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>
                          {truncate(w.url, 40)}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{w.eventType}</td>
                      <td>
                        <span className={`cedros-admin__badge cedros-admin__badge--${webhookStatusBadge(w.status)}`}>
                          {w.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{w.attempts}/{w.maxAttempts}</td>
                      <td style={{ fontSize: '0.8rem', maxWidth: '180px', color: 'var(--cedros-admin-text-muted, #888)' }}>
                        {w.lastError ? (
                          <span title={w.lastError}>{truncate(w.lastError, 40)}</span>
                        ) : '—'}
                      </td>
                      <td style={{ fontSize: '0.8rem' }}>{formatDateTime(w.createdAt)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button
                            type="button"
                            className="cedros-admin__button cedros-admin__button--ghost cedros-admin__button--sm"
                            onClick={() => retryWebhook(w.id)}
                          >
                            Retry
                          </button>
                          <button
                            type="button"
                            className="cedros-admin__button cedros-admin__button--ghost cedros-admin__button--sm"
                            onClick={() => deleteWebhook(w.id)}
                            style={{ color: 'var(--cedros-admin-danger, #c00)' }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── DLQ tab ───────────────────────────────────────────────────────── */}
      {activeTab === 'dlq' && (
        <>
          {isLoadingDlq ? (
            <div className="cedros-admin__loading">{Icons.loading} Loading DLQ...</div>
          ) : dlqWebhooks.length === 0 ? (
            <div className="cedros-admin__empty">Dead Letter Queue is empty.</div>
          ) : (
            <div className="cedros-admin__table-container">
              <table className="cedros-admin__table">
                <thead>
                  <tr>
                    <th>URL</th>
                    <th>Event Type</th>
                    <th>Attempts</th>
                    <th>Final Error</th>
                    <th>Moved to DLQ</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {dlqWebhooks.map((w) => (
                    <tr key={w.id}>
                      <td style={{ maxWidth: '200px' }}>
                        <span title={w.url} style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>
                          {truncate(w.url, 40)}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{w.eventType}</td>
                      <td style={{ fontSize: '0.85rem' }}>{w.totalAttempts}</td>
                      <td style={{ fontSize: '0.8rem', maxWidth: '200px', color: 'var(--cedros-admin-text-muted, #888)' }}>
                        <span title={w.finalError}>{truncate(w.finalError, 40)}</span>
                      </td>
                      <td style={{ fontSize: '0.8rem' }}>{formatDateTime(w.movedToDlqAt)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button
                            type="button"
                            className="cedros-admin__button cedros-admin__button--ghost cedros-admin__button--sm"
                            onClick={() => retryDlq(w.id)}
                          >
                            Retry
                          </button>
                          <button
                            type="button"
                            className="cedros-admin__button cedros-admin__button--ghost cedros-admin__button--sm"
                            onClick={() => deleteDlq(w.id)}
                            style={{ color: 'var(--cedros-admin-danger, #c00)' }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
