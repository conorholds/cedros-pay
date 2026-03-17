/**
 * Admin Dashboard — Chat Logs Section
 *
 * Lists AI chat sessions with filters, view full message history per session.
 * Server: GET /admin/chats, GET /admin/chats/:sessionId
 */

import { useState, useEffect, useCallback } from 'react';
import { Icons } from './icons';
import { ErrorBanner } from './ErrorBanner';
import type { SectionProps } from './types';
import { formatDateTime } from '../../utils/dateHelpers';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ChatSessionSummary {
  id: string;
  customerId?: string;
  customerEmail?: string;
  status: string;
  messageCount: number;
  lastMessageAt: string;
  createdAt: string;
}

interface ChatMessageView {
  id: string;
  role: string;
  content: string;
  products?: Array<{ id: string; name: string; priceCents?: number | null; relevance: string }>;
  actions?: string[];
  createdAt: string;
}

interface SessionDetail {
  session: ChatSessionSummary;
  messages: ChatMessageView[];
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ChatLogsSection({ serverUrl, apiKey, pageSize = 20, authManager }: SectionProps) {
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all');
  const [selectedSession, setSelectedSession] = useState<SessionDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchWithAuth = useCallback(async <T,>(path: string): Promise<T> => {
    if (authManager?.isAuthenticated()) {
      return authManager.fetchWithAuth<T>(path);
    }
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers['X-API-Key'] = apiKey;
    const res = await fetch(`${serverUrl}${path}`, { headers });
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    return res.json();
  }, [serverUrl, apiKey, authManager]);

  const fetchSessions = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const qs = new URLSearchParams();
      qs.set('limit', String(pageSize));
      qs.set('offset', String(offset));
      if (statusFilter !== 'all') qs.set('status', statusFilter);

      const data = await fetchWithAuth<{ sessions: ChatSessionSummary[]; total: number }>(
        `/admin/chats?${qs.toString()}`
      );
      setSessions(data.sessions ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setFetchError('Failed to load chat sessions');
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  }, [fetchWithAuth, pageSize, offset, statusFilter]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const openSession = async (sessionId: string) => {
    setLoadingDetail(true);
    try {
      const data = await fetchWithAuth<SessionDetail>(`/admin/chats/${encodeURIComponent(sessionId)}`);
      setSelectedSession(data);
    } catch {
      setFetchError('Failed to load chat session');
    } finally {
      setLoadingDetail(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.floor(offset / pageSize) + 1;

  // ─── Detail view ────────────────────────────────────────────────────────

  if (selectedSession) {
    const { session, messages } = selectedSession;
    return (
      <div>
        <button
          type="button"
          className="cedros-admin__button cedros-admin__button--ghost cedros-admin__button--sm"
          onClick={() => setSelectedSession(null)}
          style={{ marginBottom: '1rem' }}
        >
          &larr; Back to sessions
        </button>

        <div className="cedros-admin__section-header">
          <h3 className="cedros-admin__section-title">
            Chat Session
            <span className="cedros-admin__badge cedros-admin__badge--muted" style={{ marginLeft: '0.5rem' }}>
              {session.messageCount} messages
            </span>
          </h3>
        </div>

        <div style={{ fontSize: '0.85rem', color: 'var(--cedros-admin-text-muted, #888)', marginBottom: '1rem' }}>
          {session.customerEmail && <span>Customer: <strong>{session.customerEmail}</strong> &middot; </span>}
          Started {formatDateTime(session.createdAt)} &middot; Last message {formatDateTime(session.lastMessageAt)}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '640px' }}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  maxWidth: '85%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.75rem',
                  fontSize: '0.85rem',
                  lineHeight: '1.4',
                  background: msg.role === 'user'
                    ? 'var(--cedros-admin-bg-dark, #1a1a1a)'
                    : 'var(--cedros-admin-bg-muted, #f5f5f5)',
                  color: msg.role === 'user'
                    ? '#fff'
                    : 'var(--cedros-admin-text, #333)',
                }}
              >
                <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.content}</span>
              </div>

              {/* Product results */}
              {msg.products && msg.products.length > 0 && (
                <div style={{ maxWidth: '85%', marginTop: '0.25rem', display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                  {msg.products.map((p) => (
                    <span key={p.id} className="cedros-admin__badge cedros-admin__badge--muted" style={{ fontSize: '0.75rem' }}>
                      {p.name}{p.priceCents != null ? ` ($${(p.priceCents / 100).toFixed(2)})` : ''}
                    </span>
                  ))}
                </div>
              )}

              {/* Actions */}
              {msg.actions && msg.actions.length > 0 && (
                <div style={{ maxWidth: '85%', marginTop: '0.25rem', fontSize: '0.75rem', fontStyle: 'italic', color: 'var(--cedros-admin-text-muted, #888)' }}>
                  {msg.actions.join(' · ')}
                </div>
              )}

              <div style={{ fontSize: '0.7rem', color: 'var(--cedros-admin-text-muted, #aaa)', marginTop: '0.15rem' }}>
                {formatDateTime(msg.createdAt)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── List view ──────────────────────────────────────────────────────────

  return (
    <div>
      <div className="cedros-admin__section-header">
        <h3 className="cedros-admin__section-title">Chat Logs</h3>
      </div>

      <ErrorBanner message={fetchError} />

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
        <select
          className="cedros-admin__input"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as 'all' | 'active' | 'archived'); setOffset(0); }}
          style={{ width: 'auto', fontSize: '0.85rem' }}
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
        <span style={{ fontSize: '0.85rem', color: 'var(--cedros-admin-text-muted, #888)' }}>
          {total} session{total !== 1 ? 's' : ''}
        </span>
      </div>

      {isLoading || loadingDetail ? (
        <div className="cedros-admin__loading">{Icons.loading} Loading chat sessions...</div>
      ) : sessions.length === 0 ? (
        <div className="cedros-admin__empty">No chat sessions found.</div>
      ) : (
        <>
          <div className="cedros-admin__table-container">
            <table className="cedros-admin__table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Messages</th>
                  <th>Status</th>
                  <th>Last Message</th>
                  <th>Started</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id}>
                    <td>
                      {s.customerEmail ? (
                        <span title={s.customerId}>{s.customerEmail}</span>
                      ) : s.customerId ? (
                        <code style={{ fontSize: '0.75rem' }}>{s.customerId.slice(0, 12)}...</code>
                      ) : (
                        <span style={{ color: 'var(--cedros-admin-text-muted, #888)' }}>Anonymous</span>
                      )}
                    </td>
                    <td>{s.messageCount}</td>
                    <td>
                      <span className={`cedros-admin__badge cedros-admin__badge--${s.status === 'active' ? 'success' : 'muted'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td>{formatDateTime(s.lastMessageAt)}</td>
                    <td>{formatDateTime(s.createdAt)}</td>
                    <td>
                      <button
                        type="button"
                        className="cedros-admin__button cedros-admin__button--ghost cedros-admin__button--sm"
                        onClick={() => openSession(s.id)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', fontSize: '0.85rem' }}>
              <button
                type="button"
                className="cedros-admin__button cedros-admin__button--ghost cedros-admin__button--sm"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - pageSize))}
              >
                Previous
              </button>
              <span>Page {currentPage} of {totalPages}</span>
              <button
                type="button"
                className="cedros-admin__button cedros-admin__button--ghost cedros-admin__button--sm"
                disabled={currentPage >= totalPages}
                onClick={() => setOffset(offset + pageSize)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
