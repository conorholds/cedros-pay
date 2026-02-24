/**
 * Admin Dashboard - Transactions Section
 *
 * Transaction history listing with filtering and sorting for the admin panel.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Icons } from './icons';
import { ErrorBanner } from './ErrorBanner';
import { StatsBar } from './StatsBar';
import type { SectionProps, PaymentStats, Transaction } from './types';
import { FilterDropdown } from './Dropdown';
import { formatDateTime } from '../../utils/dateHelpers';

export function TransactionsSection({ serverUrl, apiKey, pageSize = 20, authManager }: SectionProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<{ key: 'id' | 'resource' | 'method' | 'amount' | 'status' | 'date'; direction: 'asc' | 'desc' } | null>(null);

  const fetchStats = useCallback(async () => {
    setIsStatsLoading(true);
    try {
      setFetchError(null);
      let data: PaymentStats;

      if (authManager?.isAuthenticated()) {
        data = await authManager.fetchWithAuth<PaymentStats>('/admin/stats');
      } else {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (apiKey) headers['X-API-Key'] = apiKey;

        const res = await fetch(`${serverUrl}/admin/stats`, { headers });
        if (!res.ok) throw new Error(`Failed to fetch stats: ${res.status}`);
        data = await res.json();
      }

      setStats(data);
    } catch {
      setStats(null);
      setFetchError('Failed to load payment stats');
    } finally {
      setIsStatsLoading(false);
    }
  }, [serverUrl, apiKey, authManager]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const fetchTransactions = useCallback(async () => {
    try {
      setFetchError(null);
      let data: { transactions: Transaction[] };
      const queryParams = new URLSearchParams({ limit: pageSize.toString() });
      if (filter) queryParams.set('method', filter);
      const path = `/admin/transactions?${queryParams}`;

      if (authManager?.isAuthenticated()) {
        data = await authManager.fetchWithAuth<{ transactions: Transaction[] }>(path);
      } else {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (apiKey) headers['X-API-Key'] = apiKey;

        const res = await fetch(`${serverUrl}${path}`, { headers });
        if (!res.ok) throw new Error(`Failed to fetch transactions: ${res.status}`);
        data = await res.json();
      }

      setTransactions(data.transactions || []);
    } catch {
      setTransactions([]);
      setFetchError('Failed to load transactions');
    } finally {
      setIsLoading(false);
    }
  }, [serverUrl, apiKey, pageSize, filter, authManager]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const formatCurrency = (amount: number, currency = 'USD') =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);

  const toggleSort = (key: 'id' | 'resource' | 'method' | 'amount' | 'status' | 'date') => {
    setSortConfig((prev) => {
      if (!prev || prev.key !== key) {
        return { key, direction: 'asc' };
      }
      return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
    });
  };

  const getSortIcon = (key: 'id' | 'resource' | 'method' | 'amount' | 'status' | 'date') => {
    if (!sortConfig || sortConfig.key !== key) {
      return <span className="cedros-admin__sort-icon cedros-admin__sort-icon--idle">{Icons.chevronUp}</span>;
    }
    return (
      <span className="cedros-admin__sort-icon">
        {sortConfig.direction === 'asc' ? Icons.chevronUp : Icons.chevronDown}
      </span>
    );
  };

  const sortedTransactions = useMemo(() => {
    if (!sortConfig) return transactions;
    const direction = sortConfig.direction === 'asc' ? 1 : -1;
    const getValue = (txn: Transaction) => {
      switch (sortConfig.key) {
        case 'resource':
          return txn.resourceId;
        case 'method':
          return txn.method;
        case 'amount':
          return txn.amount;
        case 'status':
          return txn.status;
        case 'date':
          return new Date(txn.paidAt).getTime();
        case 'id':
        default:
          return txn.id;
      }
    };
    return [...transactions].sort((a, b) => {
      const aValue = getValue(a);
      const bValue = getValue(b);
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return (aValue - bValue) * direction;
      }
      return String(aValue).localeCompare(String(bValue), undefined, { sensitivity: 'base' }) * direction;
    });
  }, [transactions, sortConfig]);

  return (
    <div className="cedros-admin__page">
      <ErrorBanner message={fetchError} onRetry={() => { fetchStats(); fetchTransactions(); }} />
      {/* Stats Bar */}
      <StatsBar
        stats={[
          { label: 'Revenue', value: formatCurrency(stats?.totalRevenue ?? 0) },
          { label: 'Orders', value: stats?.totalTransactions ?? 0 },
          { label: 'Card', value: formatCurrency(stats?.revenueByMethod.stripe ?? 0), description: `${stats?.transactionsByMethod.stripe ?? 0} orders` },
          { label: 'Crypto', value: formatCurrency(stats?.revenueByMethod.x402 ?? 0), description: `${stats?.transactionsByMethod.x402 ?? 0} orders` },
          { label: 'Credits', value: formatCurrency(stats?.revenueByMethod.credits ?? 0), description: `${stats?.transactionsByMethod.credits ?? 0} orders` },
        ]}
        isLoading={isStatsLoading}
        onRefresh={fetchStats}
      />

      <div className="cedros-admin__section-header">
        <h3 className="cedros-admin__section-title">Transaction History</h3>
        <FilterDropdown
          value={filter}
          onChange={setFilter}
          options={[
            { value: '', label: 'All' },
            { value: 'stripe', label: 'Card' },
            { value: 'x402', label: 'Crypto' },
            { value: 'credits', label: 'Credits' },
          ]}
        />
      </div>

      {isLoading ? (
        <div className="cedros-admin__loading">{Icons.loading} Loading transactions...</div>
      ) : (
        <div className="cedros-admin__table-container">
          <table className="cedros-admin__table">
            <thead>
              <tr>
                <th aria-sort={sortConfig?.key === 'id' ? (sortConfig?.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className="cedros-admin__table-sort" onClick={() => toggleSort('id')}>
                    ID
                    {getSortIcon('id')}
                  </button>
                </th>
                <th aria-sort={sortConfig?.key === 'resource' ? (sortConfig?.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className="cedros-admin__table-sort" onClick={() => toggleSort('resource')}>
                    Resource
                    {getSortIcon('resource')}
                  </button>
                </th>
                <th aria-sort={sortConfig?.key === 'method' ? (sortConfig?.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className="cedros-admin__table-sort" onClick={() => toggleSort('method')}>
                    Method
                    {getSortIcon('method')}
                  </button>
                </th>
                <th aria-sort={sortConfig?.key === 'amount' ? (sortConfig?.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className="cedros-admin__table-sort" onClick={() => toggleSort('amount')}>
                    Amount
                    {getSortIcon('amount')}
                  </button>
                </th>
                <th aria-sort={sortConfig?.key === 'status' ? (sortConfig?.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className="cedros-admin__table-sort" onClick={() => toggleSort('status')}>
                    Status
                    {getSortIcon('status')}
                  </button>
                </th>
                <th aria-sort={sortConfig?.key === 'date' ? (sortConfig?.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className="cedros-admin__table-sort" onClick={() => toggleSort('date')}>
                    Date
                    {getSortIcon('date')}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedTransactions.map((txn) => (
                <tr key={txn.id}>
                  <td><code>{txn.id}</code></td>
                  <td>{txn.resourceId}</td>
                  <td>
                    <span className={`cedros-admin__badge cedros-admin__badge--${txn.method}`}>
                      {txn.method}
                    </span>
                  </td>
                  <td>${txn.amount.toFixed(2)} {txn.currency.toUpperCase()}</td>
                  <td>
                    <span className={`cedros-admin__badge cedros-admin__badge--${txn.status}`}>
                      {txn.status}
                    </span>
                  </td>
                  <td>{formatDateTime(txn.paidAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
