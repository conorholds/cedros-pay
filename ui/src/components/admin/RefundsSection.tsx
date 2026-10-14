/**
 * Refunds Section Component
 *
 * Admin dashboard component for managing refund requests across Stripe, Credits, and x402.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { ErrorBanner } from './ErrorBanner';
import { DestructiveConfirmDialog } from './DestructiveConfirmDialog';
import { LedgerTruncationWarning } from './LedgerTruncationWarning';
import {
  CreditsRefundsPanel,
  formatX402RefundAmount,
  StripeRefundsPanel,
  X402RefundsPanel,
} from './RefundMethodSections';
import { StatsBar, type StatItem } from './StatsBar';
import { SetupNotice } from './SetupNotice';
import { useBackgroundRefresh } from './useBackgroundRefresh';
import { adminSectionHref } from './adminTabRouting';
import { useRefundMethodAvailability } from './useRefundMethodAvailability';
import { useTableSort, type SortValue } from './useTableSort';
import type { AdminPagedResponse, SectionProps, Refund, StripeRefund } from './types';
import { getLogger } from '../../utils/logger';
import { fetchAdminJson, requireAdminAuth } from './authFetch';

/** Stable accessor for the sortable Stripe refund columns (see useTableSort). */
function stripeSortValue(refund: StripeRefund, key: string): SortValue {
  switch (key) {
    case 'stripe': return refund.stripeRefundId ?? '';
    case 'charge': return refund.chargeId ?? '';
    case 'amount': return refund.amount ?? 0;
    case 'reason': return refund.reason ?? '';
    case 'status': return refund.status ?? '';
    case 'date': return refund.createdAt;
    case 'id': return refund.id;
    default: return null;
  }
}

/** Stable accessor for the sortable credits refund columns (see useTableSort). */
function creditsSortValue(req: Refund, key: string): SortValue {
  switch (key) {
    case 'original': return req.originalTransactionId ?? '';
    case 'amount': return req.amount ?? 0;
    case 'reason': return req.reason ?? '';
    case 'status': return req.status ?? '';
    case 'date': return req.createdAt;
    case 'id': return req.id;
    default: return null;
  }
}

/** Stable accessor for the sortable x402 refund columns (see useTableSort). */
function x402SortValue(refund: Refund, key: string): SortValue {
  switch (key) {
    case 'transaction': return refund.transactionId ?? '';
    case 'amount': return refund.amount ?? 0;
    case 'reason': return refund.reason ?? '';
    case 'status': return refund.status ?? '';
    case 'date': return refund.createdAt;
    case 'id': return refund.id;
    default: return null;
  }
}

export function RefundsSection({ pageSize = 20, authManager, locale }: SectionProps) {
  // x402 refunds state
  const [x402Refunds, setX402Refunds] = useState<Refund[]>([]);
  const [x402Loading, setX402Loading] = useState(true);
  const [x402Error, setX402Error] = useState<string | null>(null);
  const [x402Truncated, setX402Truncated] = useState(false);

  // Credits refunds state
  const [creditsRefunds, setCreditsRefunds] = useState<Refund[]>([]);
  const [creditsLoading, setCreditsLoading] = useState(true);
  const [creditsError, setCreditsError] = useState<string | null>(null);

  // Stripe refunds state
  const [stripeRefunds, setStripeRefunds] = useState<StripeRefund[]>([]);
  const [stripeLoading, setStripeLoading] = useState(true);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [stripeTruncated, setStripeTruncated] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const processingRef = useRef<string | null>(null);
  const [pendingX402Refund, setPendingX402Refund] = useState<Refund | null>(null);

  const [actionError, setActionError] = useState<string | null>(null);
  const {
    availability,
    isLoading: methodsLoading,
    error: methodsError,
  } = useRefundMethodAvailability(authManager);
  const methodsReady = availability !== null;
  const stripeEnabled = availability?.stripe === true;
  const creditsEnabled = availability?.credits === true;
  const x402Enabled = availability?.x402 === true;
  const anyMethodEnabled = stripeEnabled || creditsEnabled || x402Enabled;

  const {
    sorted: sortedStripeRefunds,
    sortKey: stripeSortKey,
    sortDirection: stripeSortDirection,
    toggleSort: toggleStripeSort,
  } = useTableSort(stripeRefunds, stripeSortValue, { key: 'date', direction: 'desc' });

  const {
    sorted: sortedCreditsRefunds,
    sortKey: creditsSortKey,
    sortDirection: creditsSortDirection,
    toggleSort: toggleCreditsSort,
  } = useTableSort(creditsRefunds, creditsSortValue, { key: 'date', direction: 'desc' });

  const {
    sorted: sortedX402Refunds,
    sortKey: x402SortKey,
    sortDirection: x402SortDirection,
    toggleSort: toggleX402Sort,
  } = useTableSort(x402Refunds, x402SortValue, { key: 'date', direction: 'desc' });

  // Fetch x402 refunds
  const fetchX402Refunds = useCallback(async () => {
    if (!x402Enabled) {
      setX402Refunds([]);
      setX402Error(null);
      setX402Loading(false);
      return;
    }
    setX402Loading(true);
    setX402Error(null);
    try {
      const path = `/admin/refunds?limit=${pageSize}`;
      const data = await fetchAdminJson<{ refunds: Refund[] } & AdminPagedResponse>(
        authManager,
        path
      );
      setX402Refunds(data.refunds || []);
      setX402Truncated(data.truncated === true);
    } catch {
      getLogger().error('[RefundsSection] Failed to fetch x402 refunds:');
      setX402Error('Failed to load x402 refunds');
    } finally {
      setX402Loading(false);
    }
  }, [pageSize, authManager, x402Enabled]);

  useEffect(() => {
    if (!methodsReady) return;
    fetchX402Refunds();
  }, [methodsReady, fetchX402Refunds]);

  // Fetch completed and in-flight Credits refunds.
  const fetchCreditsRefunds = useCallback(async () => {
    if (!creditsEnabled) {
      setCreditsRefunds([]);
      setCreditsError(null);
      setCreditsLoading(false);
      return;
    }
    setCreditsLoading(true);
    setCreditsError(null);
    try {
      const path = `/admin/credits/refund-requests?limit=${pageSize}&offset=0`;
      const data = await fetchAdminJson<{ refunds: Refund[] } & AdminPagedResponse>(
        authManager,
        path
      );

      setCreditsRefunds(data.refunds ?? []);
    } catch {
      getLogger().error('[RefundsSection] Failed to fetch credits refunds:');
      setCreditsError('Failed to load credits refunds');
    } finally {
      setCreditsLoading(false);
    }
  }, [pageSize, authManager, creditsEnabled]);

  useEffect(() => {
    if (!methodsReady) return;
    fetchCreditsRefunds();
  }, [methodsReady, fetchCreditsRefunds]);

  // Fetch Stripe refunds
  const fetchStripeRefunds = useCallback(async () => {
    if (!stripeEnabled) {
      setStripeRefunds([]);
      setStripeError(null);
      setStripeLoading(false);
      return;
    }
    setStripeLoading(true);
    setStripeError(null);
    try {
      const path = `/admin/stripe/refunds?limit=${pageSize}`;
      const data = await fetchAdminJson<{ refunds: StripeRefund[] } & AdminPagedResponse>(
        authManager,
        path
      );
      setStripeRefunds(data.refunds || []);
      setStripeTruncated(data.truncated === true);
    } catch {
      getLogger().error('[RefundsSection] Failed to fetch Stripe refunds:');
      setStripeError('Failed to load Stripe refunds');
    } finally {
      setStripeLoading(false);
    }
  }, [pageSize, authManager, stripeEnabled]);

  useEffect(() => {
    if (!methodsReady) return;
    fetchStripeRefunds();
  }, [methodsReady, fetchStripeRefunds]);

  const processX402Refund = async () => {
    if (!pendingX402Refund || processingRef.current) return;
    const refund = pendingX402Refund;
    processingRef.current = refund.id;
    setProcessingId(refund.id);
    setActionError(null);
    try {
      const id = encodeURIComponent(refund.id);
      await requireAdminAuth(authManager).fetchWithAuth(`/admin/refunds/${id}/process`, {
        method: 'POST',
      });
      setPendingX402Refund(null);
      await fetchX402Refunds();
    } catch {
      getLogger().error('[RefundsSection] Failed to process x402 refund:');
      setActionError(
        'Refund outcome is unknown. Refresh the status before acting; if retry is offered, retry this same refund and do not send another payout.'
      );
      setPendingX402Refund(null);
      await fetchX402Refunds();
    } finally {
      processingRef.current = null;
      setProcessingId(null);
    }
  };

  const denyX402Refund = async (refundId: string) => {
    if (processingRef.current) return;
    processingRef.current = refundId;
    setProcessingId(refundId);
    setActionError(null);
    try {
      const path = `/admin/refunds/${encodeURIComponent(refundId)}/deny`;
      await requireAdminAuth(authManager).fetchWithAuth(path, { method: 'POST' });
      await fetchX402Refunds();
    } catch {
      getLogger().error('[RefundsSection] Failed to deny x402 refund:');
      setActionError('Failed to deny x402 refund');
    } finally {
      processingRef.current = null;
      setProcessingId(null);
    }
  };

  // Compute stats
  const stripePending = stripeEnabled ? stripeRefunds.filter(r => r.status === 'pending' || r.status === 'requires_action').length : 0;
  const creditsPending = creditsEnabled ? creditsRefunds.filter(r => r.status === 'pending').length : 0;
  const x402Pending = x402Enabled ? x402Refunds.filter(r => r.status === 'pending' || r.status === 'processing').length : 0;
  const totalPending = stripePending + creditsPending + x402Pending;

  // Do not add unlike currencies/assets into a fictitious USD total.
  const completedRefunds =
    (stripeEnabled ? stripeRefunds.filter(r => r.status === 'succeeded').length : 0)
    + (creditsEnabled ? creditsRefunds.filter(r => r.status === 'completed').length : 0)
    + (x402Enabled ? x402Refunds.filter(r => r.status === 'completed').length : 0);

  const isStatsLoading =
    methodsLoading ||
    (stripeEnabled && stripeLoading) ||
    (creditsEnabled && creditsLoading) ||
    (x402Enabled && x402Loading);
  const visibleError = methodsError ?? actionError;
  // Tones are reserved for values that need attention: a pending queue does,
  // a refunded total does not (Workbench §7 Metrics).
  const refundStats: StatItem[] = [
    {
      label: 'Pending',
      value: totalPending,
      description: 'Awaiting review or provider confirmation',
      ...(totalPending > 0 ? { variant: 'warning' as const } : {}),
    },
    ...(stripeEnabled ? [{ label: 'Card pending', value: stripePending, description: 'Stripe' }] : []),
    ...(creditsEnabled ? [{ label: 'Credits pending', value: creditsPending, description: 'Credits ledger' }] : []),
    ...(x402Enabled ? [{ label: 'Crypto pending', value: x402Pending, description: 'x402' }] : []),
    { label: 'Completed', value: completedRefunds, description: 'All currencies and assets' },
  ];

  useBackgroundRefresh(
    async () => {
      await Promise.all([fetchX402Refunds(), fetchCreditsRefunds(), fetchStripeRefunds()]);
    },
    {
      enabled: anyMethodEnabled,
      intervalMs: 20000,
    }
  );

  return (
    <div className="cedros-data-stack cedros-admin__page">
      <ErrorBanner message={visibleError} />
      {x402Truncated || stripeTruncated ? (
        <LedgerTruncationWarning message="Refund list may be partial because the ledger scan hit the admin row limit." />
      ) : null}
      <StatsBar
        stats={refundStats}
        isLoading={isStatsLoading}
      />

      {!methodsLoading && !methodsError && !anyMethodEnabled && (
        <SetupNotice
          title="Refund processing unavailable"
          description="Enable at least one supported payment rail in Pay hub to view and process its refunds."
          action={(
            <a className="cedros-data-btn cedros-data-btn--primary cedros-data-btn--sm" href={adminSectionHref('settings-hub', 'overview')}>
              Open Pay hub
            </a>
          )}
        />
      )}

      {/* Stripe Refunds Section */}
      {stripeEnabled && (
        <StripeRefundsPanel
          refunds={stripeRefunds}
          sortedRefunds={sortedStripeRefunds}
          isLoading={stripeLoading}
          error={stripeError}
          locale={locale}
          sortKey={stripeSortKey}
          sortDirection={stripeSortDirection}
          onSort={toggleStripeSort}
          onRetry={fetchStripeRefunds}
        />
      )}

      {/* Credits Refunds Section */}
      {creditsEnabled && (
        <CreditsRefundsPanel
          refundRequests={creditsRefunds}
          sortedRefundRequests={sortedCreditsRefunds}
          isLoading={creditsLoading}
          error={creditsError}
          locale={locale}
          sortKey={creditsSortKey}
          sortDirection={creditsSortDirection}
          onSort={toggleCreditsSort}
          onRetry={fetchCreditsRefunds}
        />
      )}

      {/* x402 Refunds Section */}
      {x402Enabled && (
        <X402RefundsPanel
          refunds={x402Refunds}
          sortedRefunds={sortedX402Refunds}
          isLoading={x402Loading}
          error={x402Error}
          locale={locale}
          processingId={processingId}
          sortKey={x402SortKey}
          sortDirection={x402SortDirection}
          onSort={toggleX402Sort}
          onProcess={setPendingX402Refund}
          onDeny={denyX402Refund}
          onRetry={fetchX402Refunds}
        />
      )}

      {pendingX402Refund ? (
        <DestructiveConfirmDialog
          title={`${pendingX402Refund.signingStarted ? 'Retry' : 'Process'} ${formatX402RefundAmount(pendingX402Refund, locale)} refund?`}
          impact={pendingX402Refund.signingStarted
            ? 'This asks Core to resume the exact previously signed Solana transaction. It will not create new transaction bytes or change the recipient.'
            : `This asks Core to sign and broadcast one ${formatX402RefundAmount(pendingX402Refund, locale)} payout on Solana to the original payer. After signing begins, the refund cannot be denied.`}
          confirmLabel={pendingX402Refund.signingStarted ? 'Retry same refund' : 'Process refund'}
          confirmingLabel="Submitting…"
          isConfirming={processingId === pendingX402Refund.id}
          onCancel={() => setPendingX402Refund(null)}
          onConfirm={processX402Refund}
        />
      ) : null}
    </div>
  );
}
