/**
 * Refunds Section Component
 *
 * Admin dashboard component for managing refund requests across Stripe, Credits, and x402.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Icons } from './icons';
import { ErrorBanner } from './ErrorBanner';
import { StatsBar } from './StatsBar';
import type { SectionProps, Refund, StripeRefund, CreditsRefundRequest } from './types';
import { getLogger } from '../../utils/logger';
import { formatDateTime } from '../../utils/dateHelpers';

export function RefundsSection({ serverUrl, apiKey, pageSize = 20, authManager }: SectionProps) {
  // x402 refunds state
  const [x402Refunds, setX402Refunds] = useState<Refund[]>([]);
  const [x402Loading, setX402Loading] = useState(true);
  const [x402SortConfig, setX402SortConfig] = useState<{ key: 'id' | 'transaction' | 'amount' | 'reason' | 'status' | 'date'; direction: 'asc' | 'desc' } | null>(null);

  // Credits refunds state
  const [creditsRefunds, setCreditsRefunds] = useState<CreditsRefundRequest[]>([]);
  const [creditsLoading, setCreditsLoading] = useState(true);
  const [creditsProcessingId, setCreditsProcessingId] = useState<string | null>(null);
  const [creditsSortConfig, setCreditsSortConfig] = useState<{ key: 'id' | 'original' | 'user' | 'amount' | 'reason' | 'status' | 'date'; direction: 'asc' | 'desc' } | null>(null);

  // Stripe refunds state
  const [stripeRefunds, setStripeRefunds] = useState<StripeRefund[]>([]);
  const [stripeLoading, setStripeLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [stripeSortConfig, setStripeSortConfig] = useState<{ key: 'id' | 'stripe' | 'charge' | 'amount' | 'reason' | 'status' | 'date'; direction: 'asc' | 'desc' } | null>(null);

  // Reject modal state
  const [rejectModalRequest, setRejectModalRequest] = useState<CreditsRefundRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Fetch x402 refunds
  const fetchX402Refunds = useCallback(async () => {
    try {
      let data: { refunds: Refund[] };
      const path = `/admin/refunds?limit=${pageSize}`;

      if (authManager?.isAuthenticated()) {
        data = await authManager.fetchWithAuth<{ refunds: Refund[] }>(path);
      } else {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (apiKey) headers['X-API-Key'] = apiKey;
        const res = await fetch(`${serverUrl}${path}`, { headers });
        if (!res.ok) throw new Error(`Failed to fetch x402 refunds: ${res.status}`);
        data = await res.json();
      }
      setX402Refunds(data.refunds || []);
    } catch (error) {
      getLogger().error('[RefundsSection] Failed to fetch x402 refunds:', error, {
        serverUrl: serverUrl.slice(0, 20) + '...',
        hasApiKey: !!apiKey,
      });
      setX402Refunds([]);
      setFetchError('Failed to load x402 refunds');
    } finally {
      setX402Loading(false);
    }
  }, [serverUrl, apiKey, pageSize, authManager]);

  useEffect(() => {
    fetchX402Refunds();
  }, [fetchX402Refunds]);

  // Fetch Credits refund requests
  const fetchCreditsRefunds = useCallback(async () => {
    try {
      let data:
        | { refundRequests: CreditsRefundRequest[] }
        | { requests: CreditsRefundRequest[] }
        | CreditsRefundRequest[];
      const path = `/admin/credits/refund-requests?status=pending&limit=${pageSize}&offset=0`;

      if (authManager?.isAuthenticated()) {
        data = await authManager.fetchWithAuth<{ refundRequests: CreditsRefundRequest[] }>(path);
      } else {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (apiKey) headers['X-API-Key'] = apiKey;
        const res = await fetch(`${serverUrl}${path}`, { headers });
        if (!res.ok) throw new Error(`Failed to fetch credits refund requests: ${res.status}`);
        data = await res.json();
      }

      const list = Array.isArray(data)
        ? data
        : ('refundRequests' in data ? data.refundRequests : (data.requests || []));
      setCreditsRefunds(list);
    } catch (error) {
      getLogger().error('[RefundsSection] Failed to fetch credits refunds:', error, {
        serverUrl: serverUrl.slice(0, 20) + '...',
        hasApiKey: !!apiKey,
      });
      setCreditsRefunds([]);
      setFetchError('Failed to load credits refunds');
    } finally {
      setCreditsLoading(false);
    }
  }, [serverUrl, apiKey, pageSize, authManager]);

  useEffect(() => {
    fetchCreditsRefunds();
  }, [fetchCreditsRefunds]);

  const processCreditsRefund = async (request: CreditsRefundRequest) => {
    setCreditsProcessingId(request.id);
    try {
      const path = `/admin/credits/refund-requests/${request.id}/process`;
      const body = JSON.stringify({ amountLamports: request.amountLamports, reason: request.reason });

      if (authManager?.isAuthenticated()) {
        await authManager.fetchWithAuth(path, { method: 'POST', body });
      } else {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (apiKey) headers['X-API-Key'] = apiKey;
        const res = await fetch(`${serverUrl}${path}`, { method: 'POST', headers, body });
        if (!res.ok) throw new Error(`Failed to process credits refund: ${res.status}`);
      }

      await fetchCreditsRefunds();
    } catch (error) {
      getLogger().error('[RefundsSection] Failed to process credits refund:', error, {
        serverUrl: serverUrl.slice(0, 20) + '...',
        hasApiKey: !!apiKey,
        requestId: request.id,
      });
      setFetchError('Failed to process credits refund');
    } finally {
      setCreditsProcessingId(null);
    }
  };

  const openRejectModal = (request: CreditsRefundRequest) => {
    setRejectReason(request.reason ?? '');
    setRejectModalRequest(request);
  };

  const closeRejectModal = () => {
    setRejectModalRequest(null);
    setRejectReason('');
  };

  const handleRejectConfirm = async () => {
    if (!rejectModalRequest) return;
    const request = rejectModalRequest;
    const reason = rejectReason;
    closeRejectModal();
    setCreditsProcessingId(request.id);
    try {
      const path = `/admin/credits/refund-requests/${request.id}/reject`;
      const body = JSON.stringify({ reason });

      if (authManager?.isAuthenticated()) {
        await authManager.fetchWithAuth(path, { method: 'POST', body });
      } else {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (apiKey) headers['X-API-Key'] = apiKey;
        const res = await fetch(`${serverUrl}${path}`, { method: 'POST', headers, body });
        if (!res.ok) throw new Error(`Failed to reject credits refund: ${res.status}`);
      }

      await fetchCreditsRefunds();
    } catch (error) {
      getLogger().error('[RefundsSection] Failed to reject credits refund:', error, {
        serverUrl: serverUrl.slice(0, 20) + '...',
        hasApiKey: !!apiKey,
        requestId: request.id,
      });
      setFetchError('Failed to reject credits refund');
    } finally {
      setCreditsProcessingId(null);
    }
  };

  // Fetch Stripe refunds
  const fetchStripeRefunds = useCallback(async () => {
    try {
      let data: { refunds: StripeRefund[] };
      const path = `/admin/stripe/refunds?limit=${pageSize}`;

      if (authManager?.isAuthenticated()) {
        data = await authManager.fetchWithAuth<{ refunds: StripeRefund[] }>(path);
      } else {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (apiKey) headers['X-API-Key'] = apiKey;
        const res = await fetch(`${serverUrl}${path}`, { headers });
        if (!res.ok) throw new Error(`Failed to fetch Stripe refunds: ${res.status}`);
        data = await res.json();
      }
      setStripeRefunds(data.refunds || []);
    } catch (error) {
      getLogger().error('[RefundsSection] Failed to fetch Stripe refunds:', error, {
        serverUrl: serverUrl.slice(0, 20) + '...',
        hasApiKey: !!apiKey,
      });
      setStripeRefunds([]);
      setFetchError('Failed to load Stripe refunds');
    } finally {
      setStripeLoading(false);
    }
  }, [serverUrl, apiKey, pageSize, authManager]);

  useEffect(() => {
    fetchStripeRefunds();
  }, [fetchStripeRefunds]);

  // Process a Stripe refund
  const processStripeRefund = async (refundId: string) => {
    setProcessingId(refundId);
    try {
      const path = `/admin/stripe/refunds/${refundId}/process`;
      if (authManager?.isAuthenticated()) {
        await authManager.fetchWithAuth(path, { method: 'POST' });
      } else {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (apiKey) headers['X-API-Key'] = apiKey;
        const res = await fetch(`${serverUrl}${path}`, { method: 'POST', headers });
        if (!res.ok) throw new Error(`Failed to process refund: ${res.status}`);
      }
      // Refresh the list
      await fetchStripeRefunds();
    } catch (error) {
      getLogger().error('[RefundsSection] Failed to process Stripe refund:', error, {
        serverUrl: serverUrl.slice(0, 20) + '...',
        hasApiKey: !!apiKey,
        refundId,
      });
      setFetchError('Failed to process Stripe refund');
    } finally {
      setProcessingId(null);
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    // Stripe amounts are in cents
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount / 100);
  };
  const formatReason = (reason?: string) => {
    if (!reason) return '—';
    return reason.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const creditsBadgeVariant = (status: CreditsRefundRequest['status']) => {
    switch (status) {
      case 'processed':
        return 'success';
      case 'pending':
        return 'pending';
      case 'rejected':
      default:
        return 'muted';
    }
  };

  const formatCreditsAmount = (amountLamports: number, currency?: string) => {
    if (!currency) return `${amountLamports.toLocaleString()} (atomic)`;
    if (currency.toLowerCase() === 'usd') {
      return `${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amountLamports / 1_000_000)} (USD credits)`;
    }
    return `${amountLamports.toLocaleString()} ${currency.toUpperCase()} (atomic)`;
  };

  const stripeBadgeVariant = (status: StripeRefund['status']) => {
    switch (status) {
      case 'succeeded':
        return 'success';
      case 'failed':
        return 'failed';
      case 'pending':
      case 'requires_action':
        return 'pending';
      case 'canceled':
      default:
        return 'muted';
    }
  };

  const formatStripeRefundId = (refund: StripeRefund) => refund.stripeRefundId ?? '—';
  const formatChargeId = (refund: StripeRefund) => refund.chargeId ?? '—';

  // Compute stats
  const stripePending = stripeRefunds.filter(r => r.status === 'pending' || r.status === 'requires_action').length;
  const creditsPending = creditsRefunds.filter(r => r.status === 'pending').length;
  const x402Pending = x402Refunds.filter(r => r.status === 'pending').length;
  const totalPending = stripePending + creditsPending + x402Pending;

  // Total refunded (completed refunds only)
  const stripeRefundedCents = stripeRefunds.filter(r => r.status === 'succeeded').reduce((sum, r) => sum + r.amount, 0);
  const creditsRefundedLamports = creditsRefunds.filter(r => r.status === 'processed').reduce((sum, r) => sum + r.amountLamports, 0);
  const x402RefundedUsd = x402Refunds.filter(r => r.status === 'completed').reduce((sum, r) => sum + r.amount, 0);
  const totalRefundedUsd = (stripeRefundedCents / 100) + (creditsRefundedLamports / 1_000_000) + x402RefundedUsd;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  const isStatsLoading = stripeLoading || creditsLoading || x402Loading;

  const toggleStripeSort = (key: 'id' | 'stripe' | 'charge' | 'amount' | 'reason' | 'status' | 'date') => {
    setStripeSortConfig((prev) => {
      if (!prev || prev.key !== key) {
        return { key, direction: 'asc' };
      }
      return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
    });
  };

  const toggleCreditsSort = (key: 'id' | 'original' | 'user' | 'amount' | 'reason' | 'status' | 'date') => {
    setCreditsSortConfig((prev) => {
      if (!prev || prev.key !== key) {
        return { key, direction: 'asc' };
      }
      return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
    });
  };

  const toggleX402Sort = (key: 'id' | 'transaction' | 'amount' | 'reason' | 'status' | 'date') => {
    setX402SortConfig((prev) => {
      if (!prev || prev.key !== key) {
        return { key, direction: 'asc' };
      }
      return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
    });
  };

  const getSortIcon = (isActive: boolean, direction: 'asc' | 'desc' | undefined) => {
    if (!isActive || !direction) {
      return <span className="cedros-admin__sort-icon cedros-admin__sort-icon--idle">{Icons.chevronUp}</span>;
    }
    return (
      <span className="cedros-admin__sort-icon">
        {direction === 'asc' ? Icons.chevronUp : Icons.chevronDown}
      </span>
    );
  };

  const sortedStripeRefunds = useMemo(() => {
    if (!stripeSortConfig) return stripeRefunds;
    const direction = stripeSortConfig.direction === 'asc' ? 1 : -1;
    const getValue = (refund: StripeRefund) => {
      switch (stripeSortConfig.key) {
        case 'stripe':
          return refund.stripeRefundId ?? '';
        case 'charge':
          return refund.chargeId ?? '';
        case 'amount':
          return refund.amount ?? 0;
        case 'reason':
          return refund.reason ?? '';
        case 'status':
          return refund.status ?? '';
        case 'date':
          return new Date(refund.createdAt).getTime();
        case 'id':
        default:
          return refund.id;
      }
    };
    return [...stripeRefunds].sort((a, b) => {
      const aValue = getValue(a);
      const bValue = getValue(b);
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return (aValue - bValue) * direction;
      }
      return String(aValue).localeCompare(String(bValue), undefined, { sensitivity: 'base' }) * direction;
    });
  }, [stripeRefunds, stripeSortConfig]);

  const sortedCreditsRefunds = useMemo(() => {
    if (!creditsSortConfig) return creditsRefunds;
    const direction = creditsSortConfig.direction === 'asc' ? 1 : -1;
    const getValue = (req: CreditsRefundRequest) => {
      switch (creditsSortConfig.key) {
        case 'original':
          return req.originalTransactionId ?? '';
        case 'user':
          return req.userId ?? '';
        case 'amount':
          return req.amountLamports ?? 0;
        case 'reason':
          return req.reason ?? '';
        case 'status':
          return req.status ?? '';
        case 'date':
          return new Date(req.createdAt).getTime();
        case 'id':
        default:
          return req.id;
      }
    };
    return [...creditsRefunds].sort((a, b) => {
      const aValue = getValue(a);
      const bValue = getValue(b);
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return (aValue - bValue) * direction;
      }
      return String(aValue).localeCompare(String(bValue), undefined, { sensitivity: 'base' }) * direction;
    });
  }, [creditsRefunds, creditsSortConfig]);

  const sortedX402Refunds = useMemo(() => {
    if (!x402SortConfig) return x402Refunds;
    const direction = x402SortConfig.direction === 'asc' ? 1 : -1;
    const getValue = (refund: Refund) => {
      switch (x402SortConfig.key) {
        case 'transaction':
          return refund.transactionId ?? '';
        case 'amount':
          return refund.amount ?? 0;
        case 'reason':
          return refund.reason ?? '';
        case 'status':
          return refund.status ?? '';
        case 'date':
          return new Date(refund.createdAt).getTime();
        case 'id':
        default:
          return refund.id;
      }
    };
    return [...x402Refunds].sort((a, b) => {
      const aValue = getValue(a);
      const bValue = getValue(b);
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return (aValue - bValue) * direction;
      }
      return String(aValue).localeCompare(String(bValue), undefined, { sensitivity: 'base' }) * direction;
    });
  }, [x402Refunds, x402SortConfig]);

  return (
    <div className="cedros-admin__page">
      <ErrorBanner message={fetchError} onRetry={() => { fetchX402Refunds(); fetchCreditsRefunds(); fetchStripeRefunds(); }} />
      <StatsBar
        stats={[
          { label: 'Pending', value: totalPending, variant: totalPending > 0 ? 'warning' : 'muted' },
          { label: 'Card Pending', value: stripePending, description: 'Stripe' },
          { label: 'Credits Pending', value: creditsPending },
          { label: 'Crypto Pending', value: x402Pending, description: 'x402' },
          { label: 'Total Refunded', value: formatCurrency(totalRefundedUsd), variant: 'success' },
        ]}
        isLoading={isStatsLoading}
      />

      {/* Stripe Refunds Section */}
      <div className="cedros-admin__section-header">
        <h3 className="cedros-admin__section-title">Stripe Refund Requests</h3>
      </div>

      {stripeLoading ? (
        <div className="cedros-admin__loading">{Icons.loading} Loading Stripe refunds...</div>
      ) : stripeRefunds.length === 0 ? (
        <div className="cedros-admin__empty">No Stripe refund requests found.</div>
      ) : (
        <div className="cedros-admin__table-container">
          <table className="cedros-admin__table">
            <thead>
              <tr>
                <th aria-sort={stripeSortConfig?.key === 'id' ? (stripeSortConfig?.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className="cedros-admin__table-sort" onClick={() => toggleStripeSort('id')}>
                    Request ID
                    {getSortIcon(stripeSortConfig?.key === 'id', stripeSortConfig?.direction)}
                  </button>
                </th>
                <th aria-sort={stripeSortConfig?.key === 'stripe' ? (stripeSortConfig?.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className="cedros-admin__table-sort" onClick={() => toggleStripeSort('stripe')}>
                    Stripe Refund ID
                    {getSortIcon(stripeSortConfig?.key === 'stripe', stripeSortConfig?.direction)}
                  </button>
                </th>
                <th aria-sort={stripeSortConfig?.key === 'charge' ? (stripeSortConfig?.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className="cedros-admin__table-sort" onClick={() => toggleStripeSort('charge')}>
                    Charge
                    {getSortIcon(stripeSortConfig?.key === 'charge', stripeSortConfig?.direction)}
                  </button>
                </th>
                <th aria-sort={stripeSortConfig?.key === 'amount' ? (stripeSortConfig?.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className="cedros-admin__table-sort" onClick={() => toggleStripeSort('amount')}>
                    Amount
                    {getSortIcon(stripeSortConfig?.key === 'amount', stripeSortConfig?.direction)}
                  </button>
                </th>
                <th aria-sort={stripeSortConfig?.key === 'reason' ? (stripeSortConfig?.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className="cedros-admin__table-sort" onClick={() => toggleStripeSort('reason')}>
                    Reason
                    {getSortIcon(stripeSortConfig?.key === 'reason', stripeSortConfig?.direction)}
                  </button>
                </th>
                <th aria-sort={stripeSortConfig?.key === 'status' ? (stripeSortConfig?.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className="cedros-admin__table-sort" onClick={() => toggleStripeSort('status')}>
                    Status
                    {getSortIcon(stripeSortConfig?.key === 'status', stripeSortConfig?.direction)}
                  </button>
                </th>
                <th aria-sort={stripeSortConfig?.key === 'date' ? (stripeSortConfig?.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className="cedros-admin__table-sort" onClick={() => toggleStripeSort('date')}>
                    Date
                    {getSortIcon(stripeSortConfig?.key === 'date', stripeSortConfig?.direction)}
                  </button>
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedStripeRefunds.map((refund) => (
                <tr key={refund.id}>
                  <td><code>{refund.id}</code></td>
                  <td><code>{formatStripeRefundId(refund)}</code></td>
                  <td><code>{formatChargeId(refund)}</code></td>
                  <td>{formatAmount(refund.amount, refund.currency)}</td>
                  <td>{formatReason(refund.reason)}</td>
                  <td>
                    <span className={`cedros-admin__badge cedros-admin__badge--${stripeBadgeVariant(refund.status)}`}>
                      {refund.status}
                    </span>
                  </td>
                  <td>{formatDateTime(refund.createdAt)}</td>
                  <td>
                    {(refund.status === 'pending' || refund.status === 'requires_action') && (
                      <button
                        className="cedros-admin__button cedros-admin__button--primary cedros-admin__button--sm"
                        onClick={() => processStripeRefund(refund.id)}
                        disabled={processingId === refund.id}
                      >
                        {processingId === refund.id ? 'Processing...' : 'Process'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Credits Refunds Section */}
      <div className="cedros-admin__section-header" style={{ marginTop: '2rem' }}>
        <h3 className="cedros-admin__section-title">Credits Refund Requests</h3>
      </div>

      {creditsLoading ? (
        <div className="cedros-admin__loading">{Icons.loading} Loading credits refunds...</div>
      ) : creditsRefunds.length === 0 ? (
        <div className="cedros-admin__empty">No credits refund requests found.</div>
      ) : (
        <div className="cedros-admin__table-container">
          <table className="cedros-admin__table">
            <thead>
              <tr>
                <th aria-sort={creditsSortConfig?.key === 'id' ? (creditsSortConfig?.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className="cedros-admin__table-sort" onClick={() => toggleCreditsSort('id')}>
                    Request ID
                    {getSortIcon(creditsSortConfig?.key === 'id', creditsSortConfig?.direction)}
                  </button>
                </th>
                <th aria-sort={creditsSortConfig?.key === 'original' ? (creditsSortConfig?.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className="cedros-admin__table-sort" onClick={() => toggleCreditsSort('original')}>
                    Original Tx
                    {getSortIcon(creditsSortConfig?.key === 'original', creditsSortConfig?.direction)}
                  </button>
                </th>
                <th aria-sort={creditsSortConfig?.key === 'user' ? (creditsSortConfig?.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className="cedros-admin__table-sort" onClick={() => toggleCreditsSort('user')}>
                    User
                    {getSortIcon(creditsSortConfig?.key === 'user', creditsSortConfig?.direction)}
                  </button>
                </th>
                <th aria-sort={creditsSortConfig?.key === 'amount' ? (creditsSortConfig?.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className="cedros-admin__table-sort" onClick={() => toggleCreditsSort('amount')}>
                    Amount
                    {getSortIcon(creditsSortConfig?.key === 'amount', creditsSortConfig?.direction)}
                  </button>
                </th>
                <th aria-sort={creditsSortConfig?.key === 'reason' ? (creditsSortConfig?.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className="cedros-admin__table-sort" onClick={() => toggleCreditsSort('reason')}>
                    Reason
                    {getSortIcon(creditsSortConfig?.key === 'reason', creditsSortConfig?.direction)}
                  </button>
                </th>
                <th aria-sort={creditsSortConfig?.key === 'status' ? (creditsSortConfig?.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className="cedros-admin__table-sort" onClick={() => toggleCreditsSort('status')}>
                    Status
                    {getSortIcon(creditsSortConfig?.key === 'status', creditsSortConfig?.direction)}
                  </button>
                </th>
                <th aria-sort={creditsSortConfig?.key === 'date' ? (creditsSortConfig?.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className="cedros-admin__table-sort" onClick={() => toggleCreditsSort('date')}>
                    Date
                    {getSortIcon(creditsSortConfig?.key === 'date', creditsSortConfig?.direction)}
                  </button>
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedCreditsRefunds.map((req) => (
                <tr key={req.id}>
                  <td><code>{req.id}</code></td>
                  <td><code>{req.originalTransactionId}</code></td>
                  <td><code>{req.userId ?? '—'}</code></td>
                  <td>{formatCreditsAmount(req.amountLamports, req.currency)}</td>
                  <td>{req.reason ?? '—'}</td>
                  <td>
                    <span className={`cedros-admin__badge cedros-admin__badge--${creditsBadgeVariant(req.status)}`}>
                      {req.status}
                    </span>
                  </td>
                  <td>{formatDateTime(req.createdAt)}</td>
                  <td>
                    {req.status === 'pending' ? (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          className="cedros-admin__button cedros-admin__button--primary cedros-admin__button--sm"
                          onClick={() => processCreditsRefund(req)}
                          disabled={creditsProcessingId === req.id}
                        >
                          {creditsProcessingId === req.id ? 'Processing...' : 'Process'}
                        </button>
                        <button
                          className="cedros-admin__button cedros-admin__button--outline cedros-admin__button--danger cedros-admin__button--sm"
                          onClick={() => openRejectModal(req)}
                          disabled={creditsProcessingId === req.id}
                        >
                          Reject
                        </button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* x402 Refunds Section */}
      <div className="cedros-admin__section-header" style={{ marginTop: '2rem' }}>
        <h3 className="cedros-admin__section-title">x402 Refund Requests</h3>
      </div>

      {x402Loading ? (
        <div className="cedros-admin__loading">{Icons.loading} Loading x402 refunds...</div>
      ) : x402Refunds.length === 0 ? (
        <div className="cedros-admin__empty">No x402 refund requests found.</div>
      ) : (
        <div className="cedros-admin__table-container">
          <table className="cedros-admin__table">
            <thead>
              <tr>
                <th aria-sort={x402SortConfig?.key === 'id' ? (x402SortConfig?.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className="cedros-admin__table-sort" onClick={() => toggleX402Sort('id')}>
                    ID
                    {getSortIcon(x402SortConfig?.key === 'id', x402SortConfig?.direction)}
                  </button>
                </th>
                <th aria-sort={x402SortConfig?.key === 'transaction' ? (x402SortConfig?.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className="cedros-admin__table-sort" onClick={() => toggleX402Sort('transaction')}>
                    Transaction
                    {getSortIcon(x402SortConfig?.key === 'transaction', x402SortConfig?.direction)}
                  </button>
                </th>
                <th aria-sort={x402SortConfig?.key === 'amount' ? (x402SortConfig?.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className="cedros-admin__table-sort" onClick={() => toggleX402Sort('amount')}>
                    Amount
                    {getSortIcon(x402SortConfig?.key === 'amount', x402SortConfig?.direction)}
                  </button>
                </th>
                <th aria-sort={x402SortConfig?.key === 'reason' ? (x402SortConfig?.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className="cedros-admin__table-sort" onClick={() => toggleX402Sort('reason')}>
                    Reason
                    {getSortIcon(x402SortConfig?.key === 'reason', x402SortConfig?.direction)}
                  </button>
                </th>
                <th aria-sort={x402SortConfig?.key === 'status' ? (x402SortConfig?.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className="cedros-admin__table-sort" onClick={() => toggleX402Sort('status')}>
                    Status
                    {getSortIcon(x402SortConfig?.key === 'status', x402SortConfig?.direction)}
                  </button>
                </th>
                <th aria-sort={x402SortConfig?.key === 'date' ? (x402SortConfig?.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className="cedros-admin__table-sort" onClick={() => toggleX402Sort('date')}>
                    Date
                    {getSortIcon(x402SortConfig?.key === 'date', x402SortConfig?.direction)}
                  </button>
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedX402Refunds.map((refund) => (
                <tr key={refund.id}>
                  <td><code>{refund.id}</code></td>
                  <td><code>{refund.transactionId}</code></td>
                  <td>${refund.amount.toFixed(2)}</td>
                  <td>{refund.reason || '—'}</td>
                  <td>
                    <span className={`cedros-admin__badge cedros-admin__badge--${refund.status}`}>
                      {refund.status}
                    </span>
                  </td>
                  <td>{formatDateTime(refund.createdAt)}</td>
                  <td></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalRequest && (
        <div className="cedros-admin__modal-overlay" onClick={closeRejectModal}>
          <div
            className="cedros-admin__modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cedros-admin__modal-header">
              <h3 className="cedros-admin__modal-title">Reject Refund Request</h3>
              <button
                type="button"
                className="cedros-admin__modal-close"
                onClick={closeRejectModal}
                aria-label="Close"
              >
                {Icons.close}
              </button>
            </div>
            <div className="cedros-admin__modal-body">
              <p style={{ marginBottom: '1rem', color: 'var(--admin-muted)' }}>
                Rejecting refund request <code>{rejectModalRequest.id}</code> for {formatCreditsAmount(rejectModalRequest.amountLamports, rejectModalRequest.currency)}.
              </p>
              <label className="cedros-admin__form-field">
                <span className="cedros-admin__form-label">Reason (optional)</span>
                <textarea
                  className="cedros-admin__input"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Enter rejection reason..."
                  rows={3}
                  style={{ resize: 'vertical' }}
                />
              </label>
            </div>
            <div className="cedros-admin__modal-footer">
              <button
                type="button"
                className="cedros-admin__button cedros-admin__button--outline"
                onClick={closeRejectModal}
              >
                Cancel
              </button>
              <button
                type="button"
                className="cedros-admin__button cedros-admin__button--primary cedros-admin__button--danger"
                onClick={handleRejectConfirm}
              >
                Reject Refund
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
