import { SortableHeader } from './SortableHeader';
import { ErrorBanner } from './ErrorBanner';
import { TableEmptyRow, TableErrorRow, TableLoadingRows } from './TableStateRows';
import type { Refund, StripeRefund } from './types';
import type { SortDirection } from './useTableSort';
import { formatDateTime } from '../../utils/dateHelpers';
import { formatCurrencyAmount, formatStripeMinorAmount, formatNumberValue } from '../../i18n/formatting';

const MAINNET_USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

interface SortProps {
  sortKey: string | null;
  sortDirection: SortDirection;
  onSort: (key: string) => void;
}

interface StripeRefundsPanelProps extends SortProps {
  refunds: StripeRefund[];
  sortedRefunds: StripeRefund[];
  isLoading: boolean;
  error: string | null;
  locale?: string;
  onRetry: () => void;
}

interface CreditsRefundsPanelProps extends SortProps {
  refundRequests: Refund[];
  sortedRefundRequests: Refund[];
  isLoading: boolean;
  error: string | null;
  locale?: string;
  onRetry: () => void;
}

interface X402RefundsPanelProps extends SortProps {
  refunds: Refund[];
  sortedRefunds: Refund[];
  isLoading: boolean;
  error: string | null;
  locale?: string;
  processingId: string | null;
  onProcess: (refund: Refund) => void;
  onDeny: (refundId: string) => void;
  onRetry: () => void;
}

function stripeBadgeVariant(status: StripeRefund['status']) {
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
}

function creditsBadgeVariant(status: Refund['status']) {
  switch (status) {
    case 'completed':
      return 'success';
    case 'pending':
      return 'pending';
    case 'failed':
    default:
      return 'muted';
  }
}

function formatReason(reason?: string) {
  if (!reason) return '—';
  return reason.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/** Shorten a long base58 id for display, keeping the head and tail. */
function truncateMiddle(value: string, head = 6, tail = 6): string {
  return value.length <= head + tail + 1 ? value : `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export function formatX402RefundAmount(refund: Refund, locale?: string): string {
  if (
    refund.refundAmountMicrounits == null ||
    refund.tokenDecimals == null ||
    !Number.isSafeInteger(refund.refundAmountMicrounits) ||
    !Number.isInteger(refund.tokenDecimals) ||
    refund.tokenDecimals < 0 ||
    refund.tokenDecimals > 9
  ) {
    return formatCurrencyAmount(refund.amount, refund.currency, locale);
  }
  const amount = refund.refundAmountMicrounits / (10 ** refund.tokenDecimals);
  const formatted = formatNumberValue(amount, locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: refund.tokenDecimals,
  });
  if (refund.paymentMint === MAINNET_USDC_MINT) return `${formatted} USDC`;
  if (refund.paymentMint) return `${formatted} SPL token (${truncateMiddle(refund.paymentMint)})`;
  return `${formatted} SPL token`;
}

export function StripeRefundsPanel({
  refunds,
  sortedRefunds,
  isLoading,
  error,
  locale,
  sortKey,
  sortDirection,
  onSort,
  onRetry,
}: StripeRefundsPanelProps) {
  return (
    <>
      <div className="cedros-admin__section-header">
        <h3 className="cedros-admin__section-title">Stripe refunds</h3>
      </div>

      {refunds.length > 0 ? <ErrorBanner message={error} /> : null}
      <div className="cedros-data-table-wrap cedros-admin__table-container">
          <table className="cedros-data-table cedros-admin__table" aria-busy={isLoading}>
            <thead>
              <tr>
                <SortableHeader label="Request ID" sortKey="id" activeKey={sortKey} direction={sortDirection} onSort={onSort} />
                <SortableHeader label="Stripe refund ID" sortKey="stripe" activeKey={sortKey} direction={sortDirection} onSort={onSort} />
                <SortableHeader label="Charge" sortKey="charge" activeKey={sortKey} direction={sortDirection} onSort={onSort} />
                <SortableHeader label="Amount" sortKey="amount" activeKey={sortKey} direction={sortDirection} onSort={onSort} />
                <SortableHeader label="Reason" sortKey="reason" activeKey={sortKey} direction={sortDirection} onSort={onSort} />
                <SortableHeader label="Status" sortKey="status" activeKey={sortKey} direction={sortDirection} onSort={onSort} />
                <SortableHeader label="Date" sortKey="date" activeKey={sortKey} direction={sortDirection} onSort={onSort} />
              </tr>
            </thead>
            <tbody>
              {error && refunds.length === 0 ? (
                <TableErrorRow columns={7} message={error} onRetry={onRetry} />
              ) : isLoading && refunds.length === 0 ? (
                <TableLoadingRows columns={7} label="Loading Stripe refunds…" />
              ) : refunds.length === 0 ? (
                <TableEmptyRow
                  columns={7}
                  title="No Stripe refunds"
                  description="Completed and provider-pending card refunds appear here. Start a full refund from the Transactions tab."
                />
              ) : sortedRefunds.map((refund) => (
                <tr key={refund.id}>
                  <td><code>{refund.id}</code></td>
                  <td><code>{refund.stripeRefundId ?? '—'}</code></td>
                  <td><code>{refund.chargeId ?? '—'}</code></td>
                  <td>{formatStripeMinorAmount(refund.amount, refund.currency, locale)}</td>
                  <td>{formatReason(refund.reason)}</td>
                  <td>
                    <span className={`cedros-data-pill cedros-admin__badge cedros-admin__badge--${stripeBadgeVariant(refund.status)}`}>
                      {refund.status}
                    </span>
                  </td>
                  <td>{formatDateTime(refund.createdAt, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
    </>
  );
}

export function CreditsRefundsPanel({
  refundRequests,
  sortedRefundRequests,
  isLoading,
  error,
  locale,
  sortKey,
  sortDirection,
  onSort,
  onRetry,
}: CreditsRefundsPanelProps) {
  return (
    <>
      <div className="cedros-admin__section-header" style={{ marginTop: '2rem' }}>
        <h3 className="cedros-admin__section-title">Credits refunds</h3>
      </div>
      <p className="cedros-admin__hint" style={{ marginBottom: '0.75rem' }}>
        Credits refunds are returned to the customer&apos;s Cedros Pay balance. This history is read-only.
      </p>

      {refundRequests.length > 0 ? <ErrorBanner message={error} /> : null}
      <div className="cedros-data-table-wrap cedros-admin__table-container">
          <table className="cedros-data-table cedros-admin__table" aria-busy={isLoading}>
            <thead>
              <tr>
                <SortableHeader label="Request ID" sortKey="id" activeKey={sortKey} direction={sortDirection} onSort={onSort} />
                <SortableHeader label="Original transaction" sortKey="original" activeKey={sortKey} direction={sortDirection} onSort={onSort} />
                <SortableHeader label="Amount" sortKey="amount" activeKey={sortKey} direction={sortDirection} onSort={onSort} />
                <SortableHeader label="Reason" sortKey="reason" activeKey={sortKey} direction={sortDirection} onSort={onSort} />
                <SortableHeader label="Status" sortKey="status" activeKey={sortKey} direction={sortDirection} onSort={onSort} />
                <SortableHeader label="Date" sortKey="date" activeKey={sortKey} direction={sortDirection} onSort={onSort} />
              </tr>
            </thead>
            <tbody>
              {error && refundRequests.length === 0 ? (
                <TableErrorRow columns={6} message={error} onRetry={onRetry} />
              ) : isLoading && refundRequests.length === 0 ? (
                <TableLoadingRows columns={6} label="Loading credits refunds…" />
              ) : refundRequests.length === 0 ? (
                <TableEmptyRow
                  columns={6}
                  title="No credits refunds"
                  description="Completed credits refunds will show up here."
                />
              ) : sortedRefundRequests.map((req) => (
                <tr key={req.id}>
                  <td><code>{req.id}</code></td>
                  <td><code>{req.originalTransactionId}</code></td>
                  <td>{formatCurrencyAmount(req.amount, req.currency, locale)}</td>
                  <td>{req.reason ?? '—'}</td>
                  <td>
                    <span className={`cedros-data-pill cedros-admin__badge cedros-admin__badge--${creditsBadgeVariant(req.status)}`}>
                      {req.status}
                    </span>
                  </td>
                  <td>{formatDateTime(req.createdAt, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
    </>
  );
}

export function X402RefundsPanel({
  refunds,
  sortedRefunds,
  isLoading,
  error,
  locale,
  processingId,
  sortKey,
  sortDirection,
  onSort,
  onProcess,
  onDeny,
  onRetry,
}: X402RefundsPanelProps) {
  return (
    <>
      <div className="cedros-admin__section-header" style={{ marginTop: '2rem' }}>
        <h3 className="cedros-admin__section-title">x402 refund requests</h3>
      </div>
      <p className="cedros-admin__hint" style={{ marginBottom: '0.75rem' }}>
        Process creates one policy-checked Solana payout to the original payer. Once
        signing starts, retry only this request; never send a separate payout manually.
      </p>

      {refunds.length > 0 ? <ErrorBanner message={error} /> : null}
      <div className="cedros-data-table-wrap cedros-admin__table-container">
          <table className="cedros-data-table cedros-admin__table" aria-busy={isLoading}>
            <thead>
              <tr>
                <SortableHeader label="ID" sortKey="id" activeKey={sortKey} direction={sortDirection} onSort={onSort} />
                <th>Recipient</th>
                <th>Original purchase</th>
                <SortableHeader label="Amount" sortKey="amount" activeKey={sortKey} direction={sortDirection} onSort={onSort} />
                <SortableHeader label="Reason" sortKey="reason" activeKey={sortKey} direction={sortDirection} onSort={onSort} />
                <SortableHeader label="Status" sortKey="status" activeKey={sortKey} direction={sortDirection} onSort={onSort} />
                <SortableHeader label="Date" sortKey="date" activeKey={sortKey} direction={sortDirection} onSort={onSort} />
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {error && refunds.length === 0 ? (
                <TableErrorRow columns={8} message={error} onRetry={onRetry} />
              ) : isLoading && refunds.length === 0 ? (
                <TableLoadingRows columns={8} label="Loading x402 refunds…" />
              ) : refunds.length === 0 ? (
                <TableEmptyRow
                  columns={8}
                  title="No x402 refund requests"
                  description="Crypto (x402) refund requests will appear here when submitted."
                />
              ) : sortedRefunds.map((refund) => (
                <tr key={refund.id}>
                  <td><code>{refund.id}</code></td>
                  <td>
                    {refund.recipientWallet
                      ? <code title={refund.recipientWallet}>{truncateMiddle(refund.recipientWallet)}</code>
                      : '—'}
                  </td>
                  <td>
                    {refund.originalPurchaseId
                      ? <code title={refund.originalPurchaseId}>{truncateMiddle(refund.originalPurchaseId)}</code>
                      : '—'}
                  </td>
                  <td>
                    <div>{formatX402RefundAmount(refund, locale)}</div>
                    {refund.refundAmountMicrounits != null ? (
                      <span className="cedros-admin__hint">
                        {formatCurrencyAmount(refund.amount, refund.currency, locale)} checkout value
                      </span>
                    ) : null}
                  </td>
                  <td>{refund.reason || '—'}</td>
                  <td>
                    <span className={`cedros-data-pill cedros-admin__badge cedros-admin__badge--${refund.status}`}>
                      {refund.status}
                    </span>
                    {refund.providerErrorCode ? (
                      <div className="cedros-admin__hint" title={refund.operationId ?? undefined}>
                        {formatReason(refund.providerErrorCode)}
                        {refund.providerRetryable ? ' — retry this request' : ''}
                      </div>
                    ) : null}
                  </td>
                  <td>{formatDateTime(refund.createdAt, locale)}</td>
                  <td>
                    {refund.status === 'pending' && (
                      <div className="cedros-data-actions">
                        <button
                          type="button"
                          className="cedros-data-btn cedros-data-btn--primary cedros-admin__button cedros-data-btn--sm cedros-admin__button--sm"
                          onClick={() => onProcess(refund)}
                          disabled={processingId !== null || isLoading || !!error}
                        >
                          {refund.signingStarted ? 'Retry same refund' : 'Process'}
                        </button>
                        {!refund.signingStarted ? (
                          <button
                            type="button"
                            className="cedros-data-btn cedros-admin__button cedros-data-btn--sm cedros-admin__button--sm"
                            onClick={() => onDeny(refund.id)}
                            disabled={processingId !== null || isLoading || !!error}
                          >
                            Deny
                          </button>
                        ) : null}
                      </div>
                    )}
                    {refund.status === 'processing' && 'Confirmation pending — do not resend'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
    </>
  );
}
