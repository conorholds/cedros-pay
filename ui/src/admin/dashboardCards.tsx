import type { DashboardCardContributionProps } from './types';
import { adminSectionHref } from '../components/admin/adminTabRouting';
import { useDashboardPaymentStats } from './useDashboardPaymentStats';

function count(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

export function CedrosPayStatusCard({
  pluginContext,
  extensionId,
  refreshInterval,
}: DashboardCardContributionProps) {
  const { allowed, enabled, snapshot, error, accessError, loading, stale, retry } =
    useDashboardPaymentStats(pluginContext, refreshInterval);
  const settled = count(snapshot?.stats.totalTransactions);
  const failed = count(snapshot?.stats.orders?.failed);
  const refunds = count(snapshot?.stats.pendingRefunds);
  const partial = !!snapshot && (snapshot.stats.truncated || [settled, failed, refunds].includes(null));
  const empty = !!snapshot && !partial && settled === 0 && failed === 0 && refunds === 0;
  const state = !enabled ? 'disabled' : !snapshot ? (error ? 'error' : 'loading') : empty ? 'empty' : 'ready';
  const badge = accessError ? (accessError === 'unauthorized' ? 'Session expired' : 'No access')
    : !enabled ? (allowed ? 'Setup needed' : 'No access')
    : !snapshot ? (error ? 'Load failed' : 'Loading')
      : stale ? 'Stale' : error ? 'Refresh failed' : partial ? 'Partial data'
        : refunds !== null && refunds > 0 ? 'Refunds pending' : undefined;
  const formatter = new Intl.NumberFormat(pluginContext.locale);
  const checkedAt = snapshot ? new Date(snapshot.checkedAt) : undefined;
  const time = checkedAt ? new Intl.DateTimeFormat(pluginContext.locale, {
    hour: 'numeric', minute: '2-digit', second: '2-digit',
  }).format(checkedAt) : undefined;
  const actionClass = 'cedros-data-btn cedros-data-btn--secondary cedros-dashboard__card-action';

  return (
    <div className="cedros-pay-dashboard cedros-data" data-extension-id={extensionId}>
      <section className="cedros-data-card cedros-dashboard__card" data-state={state} aria-busy={loading} aria-label="Cedros Pay">
        <header className="cedros-data-card__header cedros-dashboard__card-header">
          <h3 className="cedros-data-card__title">Cedros Pay</h3>
          {badge && <span className={`cedros-data-pill cedros-dashboard__state cedros-dashboard__state--${error ? 'error' : badge === 'Loading' ? 'loading' : 'warning'}`}>{badge}</span>}
        </header>
        <div className="cedros-data-card__body cedros-dashboard__card-body">
          {!enabled ? (
            <p className="cedros-data-empty" role="status">
              {allowed ? 'Connect Cedros Pay server access to view payments.' : 'Cedros Pay admin access is required.'}
            </p>
          ) : accessError ? (
            <div className="cedros-data-status cedros-data-status--error" role="alert">
              {accessError === 'unauthorized'
                ? 'Your admin session expired. Reload admin to sign in again.'
                : 'You no longer have access to payment data. Ask a site administrator to restore your access.'}
            </div>
          ) : !snapshot && loading && !error ? (
            <>
              <div className="cedros-dashboard__skeleton" aria-hidden="true"><span /><span /><span /></div>
              <span className="cedros-dashboard__visually-hidden" role="status">Loading payments…</span>
            </>
          ) : !snapshot ? (
            <div className="cedros-data-status cedros-data-status--error" role="alert">
              Payment summary couldn't load. Try again. If this continues, check your admin access.
            </div>
          ) : (
            <>
              {error && <div className="cedros-data-status cedros-data-status--error" role="alert">Payment refresh failed. Showing the last available summary.</div>}
              {empty ? (
                <p className="cedros-data-empty">No settled payments, failed orders, or pending refunds. Activity appears here after checkout.</p>
              ) : (
                <dl className="cedros-data-summary-grid cedros-dashboard__metrics">
                  {[
                    { label: 'Settled payments', value: settled, hint: 'All recorded activity' },
                    { label: 'Failed orders', value: failed, hint: 'All recorded activity' },
                    { label: 'Pending refunds', value: refunds, hint: 'Awaiting review' },
                  ].map(({ label, value, hint }) => (
                    <div className="cedros-data-metric" key={label}>
                      <dt className="cedros-data-metric__label">{label}</dt>
                      <dd className="cedros-data-metric__value">{value === null ? '—' : formatter.format(value)}</dd>
                      <dd className="cedros-data-metric__hint">{hint}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {partial && <p className="cedros-data-empty">Partial summary; some records or totals are unavailable.</p>}
            </>
          )}
        </div>
        <footer className="cedros-dashboard__card-footer">
          <span className="cedros-dashboard__freshness" role="status">
            {checkedAt ? <>{stale ? 'Stale · ' : ''}Last checked <time dateTime={checkedAt.toISOString()} title={checkedAt.toLocaleString(pluginContext.locale)}>{time}</time></> : 'Payment ledger summary'}
          </span>
          {!enabled ? (
            allowed && <a className={actionClass} href={adminSectionHref('settings-hub', 'overview')}>Open setup</a>
          ) : accessError ? (
            accessError === 'unauthorized' && (
              <button type="button" className={actionClass} onClick={() => window.location.reload()}>Reload admin</button>
            )
          ) : error ? (
            <button type="button" className={actionClass} onClick={retry} disabled={loading}>
              {loading ? 'Retrying…' : 'Retry'}
            </button>
          ) : (
            <a className={actionClass} href={adminSectionHref('transactions', refunds !== null && refunds > 0 ? 'refunds' : 'transactions')}>
              {refunds !== null && refunds > 0 ? 'Review refunds' : 'View transactions'}
            </a>
          )}
        </footer>
      </section>
    </div>
  );
}
