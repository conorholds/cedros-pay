/**
 * Gift Card Inventory Manager
 *
 * Admin UI for listing, creating, and adjusting gift card balances.
 * Uses GET/POST/PUT /admin/gift-cards and POST /admin/gift-cards/:code/adjust.
 */

import { useState, useEffect, useCallback } from 'react';
import type { SectionProps } from './types';

interface GiftCard {
  code: string;
  tenantId: string;
  initialBalance: number;
  balance: number;
  currency: string;
  active: boolean;
  expiresAt?: string;
  metadata: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

type ViewMode = 'list' | 'create' | 'adjust';

export function GiftCardManager({ serverUrl, apiKey, authManager }: SectionProps) {
  const [cards, setCards] = useState<GiftCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedCard, setSelectedCard] = useState<GiftCard | null>(null);
  const [activeOnly, setActiveOnly] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

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

  const fetchCards = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const qs = activeOnly ? '?activeOnly=true&limit=50' : '?limit=50';
      const data = await adminFetch<{ giftCards: GiftCard[] }>(`/admin/gift-cards${qs}`);
      setCards(data.giftCards ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load gift cards');
    } finally {
      setIsLoading(false);
    }
  }, [adminFetch, activeOnly]);

  useEffect(() => { fetchCards(); }, [fetchCards]);

  const formatCents = (cents: number, currency: string) =>
    `$${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric',
      });
    } catch { return iso; }
  };

  const openAdjust = (card: GiftCard) => {
    setSelectedCard(card);
    setViewMode('adjust');
    setActionMessage(null);
  };

  if (viewMode === 'create') {
    return (
      <CreateGiftCardForm
        onSubmit={async (form) => {
          await adminFetch('/admin/gift-cards', {
            method: 'POST',
            body: JSON.stringify(form),
          });
          setViewMode('list');
          fetchCards();
        }}
        onCancel={() => setViewMode('list')}
      />
    );
  }

  if (viewMode === 'adjust' && selectedCard) {
    return (
      <AdjustBalanceForm
        card={selectedCard}
        formatCents={formatCents}
        onSubmit={async (newBalance) => {
          await adminFetch(`/admin/gift-cards/${encodeURIComponent(selectedCard.code)}/adjust`, {
            method: 'POST',
            body: JSON.stringify({ newBalance }),
          });
          setViewMode('list');
          fetchCards();
        }}
        onToggleActive={async () => {
          await adminFetch(`/admin/gift-cards/${encodeURIComponent(selectedCard.code)}`, {
            method: 'PUT',
            body: JSON.stringify({
              initialBalance: selectedCard.initialBalance,
              balance: selectedCard.balance,
              currency: selectedCard.currency,
              active: !selectedCard.active,
              expiresAt: selectedCard.expiresAt,
              metadata: selectedCard.metadata,
            }),
          });
          setViewMode('list');
          fetchCards();
        }}
        onCancel={() => { setViewMode('list'); setSelectedCard(null); }}
      />
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 className="cedros-admin__section-title" style={{ margin: 0 }}>Gift Card Inventory</h3>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
            <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} />
            Active only
          </label>
          <button
            className="cedros-admin__button cedros-admin__button--primary cedros-admin__button--sm"
            onClick={() => { setViewMode('create'); setActionMessage(null); }}
          >
            + New Gift Card
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '0.75rem', background: 'rgba(220,38,38,0.08)', borderRadius: 6, marginBottom: '1rem', fontSize: 13, color: '#b91c1c' }}>
          {error}
          <button className="cedros-admin__button cedros-admin__button--sm" style={{ marginLeft: 8 }} onClick={fetchCards}>Retry</button>
        </div>
      )}

      {actionMessage && (
        <div style={{ padding: '0.75rem', background: 'rgba(22,163,74,0.08)', borderRadius: 6, marginBottom: '1rem', fontSize: 13, color: '#166534' }}>
          {actionMessage}
        </div>
      )}

      {isLoading ? (
        <div className="cedros-admin__loading">Loading...</div>
      ) : !cards.length ? (
        <div className="cedros-admin__empty" style={{ padding: '2rem', textAlign: 'center', opacity: 0.6 }}>
          No gift cards found.
        </div>
      ) : (
        <div className="cedros-admin__table-container">
          <table className="cedros-admin__table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Balance</th>
                <th>Initial</th>
                <th>Status</th>
                <th>Expires</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cards.map((c) => (
                <tr key={c.code}>
                  <td><code style={{ fontSize: 12 }}>{c.code.slice(0, 12)}...</code></td>
                  <td style={{ fontWeight: 600 }}>{formatCents(c.balance, c.currency)}</td>
                  <td style={{ opacity: 0.7 }}>{formatCents(c.initialBalance, c.currency)}</td>
                  <td>
                    <span className={`cedros-admin__badge ${c.active ? 'cedros-admin__badge--success' : 'cedros-admin__badge--muted'}`}>
                      {c.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ fontSize: 13 }}>{c.expiresAt ? formatDate(c.expiresAt) : '—'}</td>
                  <td style={{ fontSize: 13 }}>{formatDate(c.createdAt)}</td>
                  <td>
                    <button
                      className="cedros-admin__button cedros-admin__button--outline cedros-admin__button--sm"
                      onClick={() => openAdjust(c)}
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create Gift Card Form
// ---------------------------------------------------------------------------

function CreateGiftCardForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (form: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    code: '',
    initialBalance: '',
    currency: 'USD',
    expiresAt: '',
  });
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cents = Math.round(parseFloat(form.initialBalance) * 100);
    if (!cents || cents < 0) { setError('Initial balance must be positive'); return; }
    setIsBusy(true);
    setError(null);
    try {
      await onSubmit({
        ...(form.code.trim() ? { code: form.code.trim().toUpperCase() } : {}),
        initialBalance: cents,
        currency: form.currency.toUpperCase(),
        ...(form.expiresAt ? { expiresAt: new Date(form.expiresAt).toISOString() } : {}),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create gift card');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div>
      <h3 className="cedros-admin__section-title" style={{ marginBottom: '1rem' }}>Create Gift Card</h3>
      {error && (
        <div style={{ padding: '0.75rem', background: 'rgba(220,38,38,0.08)', borderRadius: 6, marginBottom: '1rem', fontSize: 13, color: '#b91c1c' }}>
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="cedros-admin__form-row">
          <div className="cedros-admin__field">
            <label className="cedros-admin__field-label">Code (optional, auto-generated if empty)</label>
            <input
              type="text"
              className="cedros-admin__input"
              value={form.code}
              onChange={(e) => setForm(f => ({ ...f, code: e.target.value }))}
              placeholder="Leave blank to auto-generate"
            />
          </div>
          <div className="cedros-admin__field">
            <label className="cedros-admin__field-label">Initial Balance ($)</label>
            <input
              type="number"
              className="cedros-admin__input"
              value={form.initialBalance}
              onChange={(e) => setForm(f => ({ ...f, initialBalance: e.target.value }))}
              placeholder="25.00"
              step="0.01"
              min="0"
              required
            />
          </div>
        </div>
        <div className="cedros-admin__form-row">
          <div className="cedros-admin__field">
            <label className="cedros-admin__field-label">Currency</label>
            <input
              type="text"
              className="cedros-admin__input"
              value={form.currency}
              onChange={(e) => setForm(f => ({ ...f, currency: e.target.value }))}
              maxLength={3}
              required
            />
          </div>
          <div className="cedros-admin__field">
            <label className="cedros-admin__field-label">Expiration date (optional)</label>
            <input
              type="date"
              className="cedros-admin__input"
              value={form.expiresAt}
              onChange={(e) => setForm(f => ({ ...f, expiresAt: e.target.value }))}
            />
          </div>
        </div>
        <div className="cedros-admin__form-actions" style={{ marginTop: '1rem' }}>
          <button type="submit" className="cedros-admin__button cedros-admin__button--primary" disabled={isBusy}>
            {isBusy ? 'Creating...' : 'Create Gift Card'}
          </button>
          <button type="button" className="cedros-admin__button cedros-admin__button--outline" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Adjust Balance / Manage Gift Card
// ---------------------------------------------------------------------------

function AdjustBalanceForm({
  card,
  formatCents,
  onSubmit,
  onToggleActive,
  onCancel,
}: {
  card: GiftCard;
  formatCents: (cents: number, currency: string) => string;
  onSubmit: (newBalance: number) => Promise<void>;
  onToggleActive: () => Promise<void>;
  onCancel: () => void;
}) {
  const [newBalanceDollars, setNewBalanceDollars] = useState((card.balance / 100).toFixed(2));
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cents = Math.round(parseFloat(newBalanceDollars) * 100);
    if (isNaN(cents) || cents < 0) { setError('Balance must be >= 0'); return; }
    setIsBusy(true);
    setError(null);
    try {
      await onSubmit(cents);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to adjust balance');
    } finally {
      setIsBusy(false);
    }
  };

  const handleToggle = async () => {
    setIsBusy(true);
    setError(null);
    try {
      await onToggleActive();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
      setIsBusy(false);
    }
  };

  return (
    <div>
      <h3 className="cedros-admin__section-title" style={{ marginBottom: '1rem' }}>Manage Gift Card</h3>

      {error && (
        <div style={{ padding: '0.75rem', background: 'rgba(220,38,38,0.08)', borderRadius: 6, marginBottom: '1rem', fontSize: 13, color: '#b91c1c' }}>
          {error}
        </div>
      )}

      {/* Card details */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', maxWidth: 500, marginBottom: '1.5rem', fontSize: 13 }}>
        <div style={{ fontWeight: 500 }}>Code</div>
        <div style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{card.code}</div>
        <div style={{ fontWeight: 500 }}>Current Balance</div>
        <div style={{ fontWeight: 600 }}>{formatCents(card.balance, card.currency)}</div>
        <div style={{ fontWeight: 500 }}>Initial Balance</div>
        <div>{formatCents(card.initialBalance, card.currency)}</div>
        <div style={{ fontWeight: 500 }}>Status</div>
        <div>
          <span className={`cedros-admin__badge ${card.active ? 'cedros-admin__badge--success' : 'cedros-admin__badge--muted'}`}>
            {card.active ? 'Active' : 'Inactive'}
          </span>
        </div>
        {card.expiresAt && (<>
          <div style={{ fontWeight: 500 }}>Expires</div>
          <div>{new Date(card.expiresAt).toLocaleDateString()}</div>
        </>)}
      </div>

      {/* Adjust balance */}
      <form onSubmit={handleSubmit}>
        <div className="cedros-admin__field" style={{ maxWidth: 250 }}>
          <label className="cedros-admin__field-label">New Balance ($)</label>
          <input
            type="number"
            className="cedros-admin__input"
            value={newBalanceDollars}
            onChange={(e) => setNewBalanceDollars(e.target.value)}
            step="0.01"
            min="0"
            required
          />
        </div>
        <div className="cedros-admin__form-actions" style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
          <button type="submit" className="cedros-admin__button cedros-admin__button--primary" disabled={isBusy}>
            {isBusy ? 'Saving...' : 'Adjust Balance'}
          </button>
          <button
            type="button"
            className={`cedros-admin__button ${card.active ? 'cedros-admin__button--danger' : 'cedros-admin__button--outline'}`}
            onClick={handleToggle}
            disabled={isBusy}
          >
            {card.active ? 'Deactivate' : 'Reactivate'}
          </button>
          <button type="button" className="cedros-admin__button cedros-admin__button--outline" onClick={onCancel}>
            Back
          </button>
        </div>
      </form>
    </div>
  );
}
