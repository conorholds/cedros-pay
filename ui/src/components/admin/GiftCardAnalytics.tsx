/**
 * Gift Card & Tokenization Analytics
 *
 * Displays summary stats computed from the gift card and redemption APIs.
 */

import { useState, useEffect, useCallback } from 'react';
import type { SectionProps } from './types';

interface GiftCard {
  code: string;
  initialBalance: number;
  balance: number;
  currency: string;
  active: boolean;
  expiresAt?: string;
}

interface GiftCardRedemption {
  id: string;
  faceValueCents: number;
  currency: string;
  creditsIssued: number;
  tokenMinted: boolean;
  createdAt: string;
}

interface Stats {
  totalCards: number;
  activeCards: number;
  expiredCards: number;
  totalIssuedCents: number;
  totalRemainingCents: number;
  totalRedeemedCents: number;
  redemptionCount: number;
  tokensMinted: number;
  currency: string;
}

export function GiftCardAnalytics({ serverUrl, apiKey, authManager }: SectionProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const adminFetch = useCallback(async <T,>(path: string): Promise<T> => {
    if (authManager?.isAuthenticated()) {
      return authManager.fetchWithAuth<T>(path);
    }
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers['X-API-Key'] = apiKey;
    const res = await fetch(`${serverUrl}${path}`, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }, [serverUrl, apiKey, authManager]);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [cardsData, redemptionsData] = await Promise.all([
        adminFetch<{ giftCards: GiftCard[] }>('/admin/gift-cards?limit=50'),
        adminFetch<{ redemptions: GiftCardRedemption[] }>('/admin/gift-card-redemptions?limit=50').catch(() => ({ redemptions: [] })),
      ]);

      const cards = cardsData.giftCards ?? [];
      const redemptions = redemptionsData.redemptions ?? [];
      const now = new Date();

      const activeCards = cards.filter(c => c.active && (!c.expiresAt || new Date(c.expiresAt) > now)).length;
      const expiredCards = cards.filter(c => c.expiresAt && new Date(c.expiresAt) <= now).length;
      const totalIssuedCents = cards.reduce((s, c) => s + c.initialBalance, 0);
      const totalRemainingCents = cards.reduce((s, c) => s + c.balance, 0);
      const totalRedeemedCents = redemptions.reduce((s, r) => s + r.faceValueCents, 0);
      const tokensMinted = redemptions.filter(r => r.tokenMinted).length;
      const currency = cards[0]?.currency || redemptions[0]?.currency || 'USD';

      setStats({
        totalCards: cards.length,
        activeCards,
        expiredCards,
        totalIssuedCents,
        totalRemainingCents,
        totalRedeemedCents,
        redemptionCount: redemptions.length,
        tokensMinted,
        currency: currency.toUpperCase(),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  }, [adminFetch]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const formatCents = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  if (isLoading) return <div className="cedros-admin__loading">Loading analytics...</div>;
  if (error) return (
    <div style={{ padding: '0.75rem', background: 'rgba(220,38,38,0.08)', borderRadius: 6, fontSize: 13, color: '#b91c1c' }}>
      {error}
      <button className="cedros-admin__button cedros-admin__button--sm" style={{ marginLeft: 8 }} onClick={fetchStats}>Retry</button>
    </div>
  );
  if (!stats) return null;

  const usageRate = stats.totalIssuedCents > 0
    ? (((stats.totalIssuedCents - stats.totalRemainingCents) / stats.totalIssuedCents) * 100).toFixed(1)
    : '0.0';

  return (
    <div>
      <h3 className="cedros-admin__section-title" style={{ marginBottom: '1rem' }}>Gift Card & Token Analytics</h3>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <StatCard label="Total Cards" value={String(stats.totalCards)} />
        <StatCard label="Active" value={String(stats.activeCards)} accent="green" />
        <StatCard label="Expired" value={String(stats.expiredCards)} accent={stats.expiredCards > 0 ? 'amber' : undefined} />
        <StatCard label="Total Issued" value={formatCents(stats.totalIssuedCents)} sub={stats.currency} />
        <StatCard label="Remaining Balance" value={formatCents(stats.totalRemainingCents)} sub={stats.currency} />
        <StatCard label="Usage Rate" value={`${usageRate}%`} sub="issued vs. spent" />
        <StatCard label="Redemptions" value={String(stats.redemptionCount)} />
        <StatCard label="Tokens Minted" value={String(stats.tokensMinted)} sub={`of ${stats.redemptionCount} redemptions`} />
      </div>

      {/* Breakdown bar */}
      {stats.totalIssuedCents > 0 && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Balance Breakdown</div>
          <div style={{ display: 'flex', height: 24, borderRadius: 6, overflow: 'hidden', background: 'rgba(0,0,0,0.05)' }}>
            <div
              style={{
                width: `${((stats.totalIssuedCents - stats.totalRemainingCents) / stats.totalIssuedCents) * 100}%`,
                background: '#2563eb',
                minWidth: 2,
              }}
              title={`Spent: ${formatCents(stats.totalIssuedCents - stats.totalRemainingCents)}`}
            />
            <div
              style={{
                width: `${(stats.totalRemainingCents / stats.totalIssuedCents) * 100}%`,
                background: '#60a5fa',
                minWidth: 2,
              }}
              title={`Remaining: ${formatCents(stats.totalRemainingCents)}`}
            />
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: 6, fontSize: 12, opacity: 0.7 }}>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#2563eb', borderRadius: 2, marginRight: 4 }} />Spent</span>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#60a5fa', borderRadius: 2, marginRight: 4 }} />Remaining</span>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: 'green' | 'amber' }) {
  const accentColor = accent === 'green' ? '#166534' : accent === 'amber' ? '#92400e' : undefined;
  return (
    <div style={{
      padding: '0.75rem 1rem',
      borderRadius: 8,
      border: '1px solid rgba(0,0,0,0.08)',
      background: 'rgba(0,0,0,0.01)',
    }}>
      <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: accentColor }}>{value}</div>
      {sub && <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
