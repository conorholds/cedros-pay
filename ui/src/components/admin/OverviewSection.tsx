/**
 * Admin Dashboard - Overview Section
 *
 * Payment statistics and revenue dashboard for the admin panel.
 */

import { useState, useCallback, useEffect } from 'react';
import { Icons } from './icons';
import { ErrorBanner } from './ErrorBanner';
import type { SectionProps, PaymentStats } from './types';
import { getLogger } from '../../utils/logger';

export function OverviewSection({ serverUrl, apiKey, refreshInterval = 30000, authManager }: SectionProps) {
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setFetchError(null);
      let data: PaymentStats;

      if (authManager?.isAuthenticated()) {
        // Use authenticated request via authManager
        data = await authManager.fetchWithAuth<PaymentStats>('/admin/stats');
      } else {
        // Fallback to legacy API key auth (deprecated)
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (apiKey) headers['X-API-Key'] = apiKey;

        const res = await fetch(`${serverUrl}/admin/stats`, { headers });
        if (!res.ok) throw new Error(`Failed to fetch stats: ${res.status}`);
        data = await res.json();
      }

      setStats(data);
    } catch (error) {
      getLogger().error('[OverviewSection] Failed to fetch stats:', error, {
        serverUrl: serverUrl.slice(0, 20) + '...',
        hasApiKey: !!apiKey,
        usingAuth: !!authManager,
      });
      setStats(null);
      setFetchError('Failed to load payment stats');
    } finally {
      setIsLoading(false);
    }
  }, [serverUrl, apiKey, authManager]);

  useEffect(() => {
    fetchStats();
    if (refreshInterval > 0) {
      const interval = setInterval(fetchStats, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchStats, refreshInterval]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const handleRefresh = useCallback(() => {
    setIsLoading(true);
    fetchStats();
  }, [fetchStats]);

  return (
    <div className="cedros-admin__overview">
      <ErrorBanner message={fetchError} onRetry={fetchStats} />
      {/* Payment Stats Section */}
      <div className="cedros-admin__section">
        <div className="cedros-admin__section-header">
          <div className="cedros-admin__section-header-left">
            <h3 className="cedros-admin__section-title">Payment Statistics</h3>
          </div>
          <div className="cedros-admin__section-header-right">
            <button
              className="cedros-admin__refresh-btn"
              onClick={handleRefresh}
              disabled={isLoading}
              title="Refresh stats"
            >
              {isLoading ? Icons.loading : Icons.refresh}
            </button>
          </div>
        </div>

        <div className="cedros-admin__stats-grid">
          <div className="cedros-admin__stat-card cedros-admin__stat-card--revenue">
            <span className="cedros-admin__stat-label">Total Revenue</span>
            <span className="cedros-admin__stat-value">
              {isLoading ? <span className="cedros-admin__skeleton cedros-admin__skeleton--lg" /> : formatCurrency(stats?.totalRevenue ?? 0)}
            </span>
            <span className="cedros-admin__stat-desc">Lifetime payment volume</span>
          </div>

          <div className="cedros-admin__stat-card cedros-admin__stat-card--transactions">
            <span className="cedros-admin__stat-label">Transactions</span>
            <span className="cedros-admin__stat-value">
              {isLoading ? <span className="cedros-admin__skeleton cedros-admin__skeleton--value" /> : stats?.totalTransactions ?? 0}
            </span>
            <span className="cedros-admin__stat-desc">Total completed</span>
          </div>

          <div className="cedros-admin__stat-card cedros-admin__stat-card--active">
            <span className="cedros-admin__stat-label">Active Products</span>
            <span className="cedros-admin__stat-value cedros-admin__stat-value--success">
              {isLoading ? <span className="cedros-admin__skeleton cedros-admin__skeleton--value" /> : stats?.activeProducts ?? 0}
            </span>
            <span className="cedros-admin__stat-desc">Paywall resources</span>
          </div>

          <div className="cedros-admin__stat-card cedros-admin__stat-card--pending">
            <span className="cedros-admin__stat-label">Pending Refunds</span>
            <span className={`cedros-admin__stat-value ${(stats?.pendingRefunds ?? 0) > 0 ? 'cedros-admin__stat-value--warning' : ''}`}>
              {isLoading ? <span className="cedros-admin__skeleton cedros-admin__skeleton--value" /> : stats?.pendingRefunds ?? 0}
            </span>
            <span className="cedros-admin__stat-desc">Awaiting processing</span>
          </div>
        </div>
      </div>

      {/* Revenue by Method Section */}
      <div className="cedros-admin__section">
        <div className="cedros-admin__section-header">
          <div className="cedros-admin__section-header-left">
            <h3 className="cedros-admin__section-title">Revenue by Payment Method</h3>
          </div>
        </div>

        <div className="cedros-admin__method-grid">
          <div className="cedros-admin__method-card cedros-admin__method-card--stripe">
            <span className="cedros-admin__method-label">Stripe (Card)</span>
            <span className="cedros-admin__method-value">
              {formatCurrency(stats?.revenueByMethod.stripe ?? 0)}
            </span>
            <span className="cedros-admin__method-count">
              {stats?.transactionsByMethod.stripe ?? 0} transactions
            </span>
          </div>
          <div className="cedros-admin__method-card cedros-admin__method-card--crypto">
            <span className="cedros-admin__method-label">x402 (Crypto)</span>
            <span className="cedros-admin__method-value">
              {formatCurrency(stats?.revenueByMethod.x402 ?? 0)}
            </span>
            <span className="cedros-admin__method-count">
              {stats?.transactionsByMethod.x402 ?? 0} transactions
            </span>
          </div>
          <div className="cedros-admin__method-card cedros-admin__method-card--credits">
            <span className="cedros-admin__method-label">Credits</span>
            <span className="cedros-admin__method-value">
              {formatCurrency(stats?.revenueByMethod.credits ?? 0)}
            </span>
            <span className="cedros-admin__method-count">
              {stats?.transactionsByMethod.credits ?? 0} transactions
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
