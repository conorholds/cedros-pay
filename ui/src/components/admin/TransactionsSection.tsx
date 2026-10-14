/**
 * Admin Dashboard - Transactions Section
 *
 * Transaction history listing with filtering and sorting for the admin panel.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'cedros:admin';
import { AdminPagination } from './AdminPagination';
import { DestructiveConfirmDialog } from './DestructiveConfirmDialog';
import { Icons } from './icons';
import { LedgerTruncationWarning } from './LedgerTruncationWarning';
import { StatsBar } from './StatsBar';
import { SortableHeader } from './SortableHeader';
import { TableEmptyRow, TableErrorRow, TableLoadingRows } from './TableStateRows';
import { useBackgroundRefresh } from './useBackgroundRefresh';
import { useTableSort, type SortValue } from './useTableSort';
import type { SectionProps, PaymentStats, Transaction, TransactionsResponse } from './types';
import { FilterDropdown } from './Dropdown';
import { formatDateTime } from '../../utils/dateHelpers';
import { formatCurrencyAmount, selectPlural } from '../../i18n/formatting';
import { fetchAdminJson } from './authFetch';
import { transactionAmount } from './transactionAmounts';

const TRANSACTIONS_LOAD_TOAST_ID = 'cedros-pay:transactions-load';

/** Search is a server round trip, so let typing settle before sending it. */
const SEARCH_DEBOUNCE_MS = 250;

interface StripeRefundProcessResponse {
  processed: boolean;
  status: string;
  refundId?: string;
}

function paymentMethodLabel(method: Transaction['method']): string {
  switch (method) {
    case 'stripe': return 'Card · Stripe';
    case 'x402': return 'Crypto · Solana';
    case 'credits': return 'Credits';
  }
}

function paymentStatusLabel(status: Transaction['status']): string {
  switch (status) {
    case 'completed': return 'Complete';
    case 'pending': return 'Pending confirmation';
    case 'failed': return 'Failed';
    case 'refunded': return 'Refunded';
  }
}

function paymentStatusDescription(status: Transaction['status']): string {
  switch (status) {
    case 'completed': return 'Payment is complete.';
    case 'pending': return 'Payment is not complete. Check again before asking the customer to retry.';
    case 'failed': return 'Payment did not complete.';
    case 'refunded': return 'The payment was refunded.';
  }
}

function notifyRefreshFailure(): void {
  toast.error("Transactions data couldn't load.", {
    id: TRANSACTIONS_LOAD_TOAST_ID,
    description: 'Try again in a moment.',
  });
}

/** Stable accessor for the sortable transaction columns (see useTableSort). */
function transactionSortValue(txn: Transaction, key: string): SortValue {
  switch (key) {
    case 'resource': return txn.resourceId;
    case 'method': return txn.method;
    case 'amount': return txn.amount;
    case 'status': return txn.status;
    case 'date': return txn.paidAt;
    case 'id': return txn.id;
    default: return null;
  }
}

export function TransactionsSection({ pageSize = 20, authManager, locale }: SectionProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [transactionsTruncated, setTransactionsTruncated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedTransactions, setHasLoadedTransactions] = useState(false);
  const hasLoadedTransactionsRef = useRef(false);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('');
  // What the field shows vs what has been sent. Search runs on the server, so
  // the term settles before it becomes a request.
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState<number | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);
  const [pendingRefund, setPendingRefund] = useState<Transaction | null>(null);
  const [processingRefundId, setProcessingRefundId] = useState<string | null>(null);
  const processingRefundRef = useRef(false);
  const transactionsRequest = useRef(0);
  const statsRequest = useRef(0);
  const [statsError, setStatsError] = useState(false);
  const [refundNotice, setRefundNotice] = useState<{ id: string; message: string } | null>(null);
  const [providerPendingRefundIds, setProviderPendingRefundIds] = useState<Set<string>>(
    () => new Set()
  );
  // Older runtimes ignore `search` instead of failing. They are detected by a
  // response that does not echo the term, then told about rather than retried.
  const [searchSupported, setSearchSupported] = useState(true);
  const { sorted: sortedTransactions, sortKey, sortDirection, toggleSort } = useTableSort(
    transactions,
    transactionSortValue,
    { key: 'date', direction: 'desc' }
  );

  const fetchStats = useCallback(async () => {
    const request = ++statsRequest.current;
    setIsStatsLoading(true);
    try {
      const data = await fetchAdminJson<PaymentStats>(authManager, '/admin/stats');
      if (request !== statsRequest.current) return;
      setStats(data);
      setStatsError(false);
    } catch {
      if (request !== statsRequest.current) return;
      setStatsError(true);
      notifyRefreshFailure();
    } finally {
      if (request === statsRequest.current) setIsStatsLoading(false);
    }
  }, [authManager]);

  useEffect(() => {
    fetchStats();
    return () => { statsRequest.current += 1; };
  }, [fetchStats]);

  // Settle typing before it becomes a request; the field itself stays live.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Any change to what is being listed restarts at the first page; otherwise a
  // deep offset lands on an empty page of a smaller result set.
  useEffect(() => {
    setOffset(0);
  }, [filter, search]);

  const fetchTransactions = useCallback(async () => {
    const request = ++transactionsRequest.current;
    setIsLoading(true);
    try {
      setTransactionsError(null);
      const appliedSearch = searchSupported ? search : '';
      const queryParams = new URLSearchParams({
        limit: pageSize.toString(),
        offset: offset.toString(),
      });
      if (filter) queryParams.set('method', filter);
      if (appliedSearch) queryParams.set('search', appliedSearch);
      const path = `/admin/transactions?${queryParams}`;
      const data = await fetchAdminJson<TransactionsResponse>(authManager, path);
      if (request !== transactionsRequest.current) return;
      if (appliedSearch && typeof data.search !== 'string') {
        setSearchSupported(false);
      }
      setTransactions(data.transactions || []);
      setTotal(typeof data.total === 'number' ? data.total : undefined);
      setHasMore(data.hasMore === true);
      setTransactionsTruncated(data.truncated === true);
      setHasLoadedTransactions(true);
      hasLoadedTransactionsRef.current = true;
    } catch {
      if (request !== transactionsRequest.current) return;
      setTransactionsError('Failed to load transactions');
      if (hasLoadedTransactionsRef.current) notifyRefreshFailure();
    } finally {
      if (request === transactionsRequest.current) setIsLoading(false);
    }
  }, [pageSize, offset, filter, search, searchSupported, authManager]);

  useEffect(() => {
    fetchTransactions();
    return () => { transactionsRequest.current += 1; };
  }, [fetchTransactions]);

  useBackgroundRefresh(async () => {
    await Promise.all([fetchStats(), fetchTransactions()]);
  });

  const formatCurrency = (amount: number, currency = 'USD') =>
    formatCurrencyAmount(amount, currency, locale);
  const revenueValue = (amount: number) => !stats ? 'Unavailable'
    : stats.revenueIncludesNonUsd ? 'See transactions' : formatCurrency(amount);

  const formatOrderCount = (count: number) =>
    `${count} ${selectPlural(count, { one: 'order', other: 'orders' }, locale)}`;

  const hasActiveFilters = Boolean(filter) || Boolean(searchInput.trim());
  const clearFilters = () => {
    setFilter('');
    setSearchInput('');
  };

  const processRefund = async () => {
    if (!pendingRefund || processingRefundRef.current) return;
    processingRefundRef.current = true;
    const transaction = pendingRefund;
    setProcessingRefundId(transaction.id);
    setRefundNotice(null);
    try {
      const id = encodeURIComponent(transaction.id);
      const path = `/admin/stripe/refunds/${id}/process`;
      const outcome = await fetchAdminJson<StripeRefundProcessResponse>(
        authManager,
        path,
        { method: 'POST' }
      );
      setPendingRefund(null);
      const completed =
        outcome.processed === true &&
        (outcome.status === 'succeeded' || outcome.status === 'refunded');
      if (completed) {
        toast.success('Refund completed.', {
          description: `The remaining payment was refunded through ${paymentMethodLabel(transaction.method)}. The customer's bank may take time to display it.`,
        });
      } else {
        setProviderPendingRefundIds(current => new Set(current).add(transaction.id));
        setRefundNotice({ id: transaction.id, message: `Refund for ${transaction.id} is not confirmed complete. Resume only this same refund to check its outcome; do not make a separate payout.` });
        toast.warning('Refund confirmation pending.', {
          description: 'The refund is not confirmed complete. Do not submit it again as a new refund; resume the same request to check its outcome.',
        });
      }
      await Promise.all([fetchStats(), fetchTransactions()]);
    } catch {
      setPendingRefund(null);
      setProviderPendingRefundIds(current => new Set(current).add(transaction.id));
      setRefundNotice({ id: transaction.id, message: `Refund outcome for ${transaction.id} is unknown. Stripe may have accepted it. Resume only this same refund; do not make a separate payout.` });
      toast.error('Refund outcome unknown.', {
        description: 'Stripe may have accepted the request. Resume only this same refund to reconcile it.',
      });
      await Promise.all([fetchStats(), fetchTransactions()]);
    } finally {
      processingRefundRef.current = false;
      setProcessingRefundId(null);
    }
  };

  return (
    <div className="cedros-data-stack cedros-admin__page">
      {refundNotice && !transactions.some(txn => txn.id === refundNotice.id && txn.status === 'refunded') ? <div className="cedros-data-status cedros-data-status--warning cedros-admin__payment-reference" role="status">{refundNotice.message}</div> : null}
      {statsError || (hasLoadedTransactions && transactionsError) ? (
        <div className="cedros-data-status cedros-data-status--warning" role="status">
          Live payment data is unavailable. Any displayed values are from the last successful load.
          Wait for a successful refresh before acting on payment status.
        </div>
      ) : null}
      {stats?.truncated ? (
        <LedgerTruncationWarning message="Payment stats may be partial because the ledger scan hit the admin row limit." />
      ) : null}
      {transactionsTruncated ? (
        <LedgerTruncationWarning message="Transaction list may be partial because the ledger scan hit the admin row limit." />
      ) : null}
      {/* Stats Bar */}
      <StatsBar
        stats={[
          { label: 'Revenue', value: revenueValue(stats?.totalRevenue ?? 0), description: stats?.revenueIncludesNonUsd ? 'Amounts include other currencies; no conversion applied' : 'All methods' },
          { label: 'Orders', value: stats?.totalTransactions ?? 0, description: 'All methods' },
          { label: 'Card revenue', value: revenueValue(stats?.revenueByMethod?.stripe ?? 0), description: formatOrderCount(stats?.transactionsByMethod?.stripe ?? 0) },
          { label: 'Crypto revenue', value: revenueValue(stats?.revenueByMethod?.x402 ?? 0), description: formatOrderCount(stats?.transactionsByMethod?.x402 ?? 0) },
          { label: 'Credits revenue', value: revenueValue(stats?.revenueByMethod?.credits ?? 0), description: formatOrderCount(stats?.transactionsByMethod?.credits ?? 0) },
        ]}
        isLoading={isStatsLoading && !stats}
      />

      {/* Host toolbar anatomy: controls sit in `__left` so the row's spare
          space falls after them instead of between them. */}
      <div className="cedros-data-toolbar cedros-admin__toolbar">
        <div className="cedros-data-toolbar__left">
          <div className="cedros-admin__filter cedros-admin__toolbar-search">
            <label className="cedros-admin__filter-label" htmlFor="cedros-pay-transaction-filter">Search</label>
            <div className="cedros-admin__search-field">
              <span className="cedros-admin__search-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </span>
              <input
                id="cedros-pay-transaction-filter"
                type="search"
                className="cedros-data-input cedros-admin__input"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Filter transactions…"
              />
              {searchInput ? (
                <button
                  type="button"
                  className="cedros-admin__search-clear"
                  aria-label="Clear search"
                  title="Clear search"
                  onClick={() => setSearchInput('')}
                >
                  {Icons.close}
                </button>
              ) : null}
            </div>
          </div>
          <div className="cedros-admin__filter">
            <span className="cedros-admin__filter-label">Method</span>
            <FilterDropdown
              ariaLabel="Method"
              value={filter}
              onChange={setFilter}
              options={[
                { value: '', label: 'All methods' },
                { value: 'stripe', label: 'Card' },
                { value: 'x402', label: 'Crypto' },
                { value: 'credits', label: 'Credits' },
              ]}
            />
          </div>
        </div>
      </div>

      {searchInput && !searchSupported ? (
        <div className="cedros-data-status cedros-data-status--warning" role="status">
          <span>
            This Pay runtime can&apos;t search transactions, so the list below is unfiltered.
            Update the Pay extension to search by transaction or resource ID.
          </span>
        </div>
      ) : null}

      <div className="cedros-data-table-wrap cedros-admin__table-container">
          <table className="cedros-data-table cedros-admin__table" aria-busy={isLoading}>
            <thead>
              <tr>
                <th>ID</th>
                <SortableHeader label="Resource" sortKey="resource" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                <SortableHeader label="Method" sortKey="method" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                <SortableHeader label="Amount" sortKey="amount" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} className="cedros-admin__table-cell--numeric" />
                <SortableHeader label="Status" sortKey="status" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                <SortableHeader label="Date" sortKey="date" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && !hasLoadedTransactions && sortedTransactions.length === 0 ? (
                <TableLoadingRows columns={7} label="Loading transactions…" />
              ) : !hasLoadedTransactions && transactionsError && sortedTransactions.length === 0 ? (
                <TableErrorRow columns={7} message={transactionsError} onRetry={fetchTransactions} />
              ) : sortedTransactions.length === 0 ? (
                <TableEmptyRow
                  columns={7}
                  filtered={hasActiveFilters}
                  title={hasActiveFilters ? 'No transactions match your filters' : 'No transactions yet'}
                  description={hasActiveFilters ? 'Try a different term or payment method.' : 'Payment attempts will appear here as customers check out.'}
                  action={hasActiveFilters ? (
                    <button type="button" className="cedros-data-btn cedros-data-btn--ghost cedros-data-btn--sm" onClick={clearFilters}>
                      Clear filters
                    </button>
                  ) : undefined}
                />
              ) : sortedTransactions.map((txn) => (
                <tr key={txn.id}>
                  <td className="cedros-admin__payment-reference"><code>{txn.id}</code>
                    {txn.providerReference ? <div><span className="cedros-admin__hint">Provider: </span><code>{txn.providerReference}</code></div> : null}
                  </td>
                  <td className="cedros-admin__payment-reference">{txn.resourceId}</td>
                  <td>
                    <span className={`cedros-data-pill cedros-admin__badge cedros-admin__badge--${txn.method}`}>
                      {paymentMethodLabel(txn.method)}
                    </span>
                  </td>
                  <td className="cedros-admin__table-cell--numeric">{transactionAmount(txn, locale)}
                    {(txn.refundedAmountMinor ?? 0) > 0 && txn.status !== 'refunded' ? <div className="cedros-admin__hint">Partially refunded</div> : null}
                  </td>
                  <td>
                    <span
                      className={`cedros-data-pill cedros-admin__badge cedros-admin__badge--${txn.status}`}
                      title={paymentStatusDescription(txn.status)}
                    >
                      {paymentStatusLabel(txn.status)}
                    </span>
                  </td>
                  <td>{formatDateTime(txn.paidAt, locale)}</td>
                  <td>
                    {txn.status === 'completed' && txn.refundProgress?.status === 'reversed' ? (
                      <span className="cedros-admin__hint">Refund reversed — review in Stripe</span>
                    ) : txn.status === 'completed' && (providerPendingRefundIds.has(txn.id) || txn.refundProgress?.status === 'unresolved') ? (
                      <div>
                        <span className="cedros-admin__hint">Refund unresolved — do not send a new payout</span>
                        <button type="button" className="cedros-data-btn cedros-data-btn--sm" disabled={processingRefundId !== null || isLoading || !!transactionsError} onClick={() => setPendingRefund(txn)}>Resume same refund</button>
                      </div>
                    ) : txn.status === 'completed' && txn.amount > 0 && txn.method === 'stripe' ? (
                      <button
                        type="button"
                        className="cedros-data-btn cedros-admin__button cedros-data-btn--sm cedros-admin__button--sm"
                        onClick={() => setPendingRefund(txn)}
                        disabled={processingRefundId !== null || isLoading || !!transactionsError}
                      >
                        Refund
                      </button>
                    ) : txn.status === 'pending' ? (
                      <span className="cedros-admin__hint">Do not retry yet</span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
      </div>

      <AdminPagination
        count={sortedTransactions.length}
        offset={offset}
        pageSize={pageSize}
        total={total}
        hasMore={hasMore}
        label="transactions"
        onOffsetChange={setOffset}
      />

      {pendingRefund ? (
        <DestructiveConfirmDialog
          title={`Refund ${transactionAmount(pendingRefund, locale, true)}?`}
          impact={`This refunds the remaining payment through ${paymentMethodLabel(pendingRefund.method)} for transaction ${pendingRefund.id}. Any existing request is resumed with the same identity. The server checks the refundable amount; the customer may not see funds immediately.`}
          confirmLabel="Confirm refund"
          confirmingLabel="Refunding…"
          isConfirming={processingRefundId === pendingRefund.id}
          onCancel={() => setPendingRefund(null)}
          onConfirm={processRefund}
        />
      ) : null}
    </div>
  );
}
