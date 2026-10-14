import { useId, useState, type ReactNode } from 'react';
import { AdminDialog } from './AdminDialog';
import { AdvancedDetails } from './contentSettingsLayout';
import { Icons } from './icons';
import { LedgerTruncationWarning } from './LedgerTruncationWarning';
import { SetupNotice } from './SetupNotice';
import { adminSectionHref } from './adminTabRouting';
import { formatCurrencyAmount, selectPlural } from '../../i18n/formatting';
import type { PaymentRail, PaymentRailReadiness } from './regionalPaymentPolicy';
import type { PaymentStats } from './types';

export interface PayHubReadinessState {
  launchActive: boolean;
  paymentRails: PaymentRailReadiness;
  stats: PaymentStats;
}

const RAIL_LABELS: Record<PaymentRail, string> = {
  stripe: 'Stripe',
  x402: 'Crypto',
  credits: 'Credits',
};

interface LaunchStep {
  id: string;
  /** Verb phrase naming the work (Workbench step list). */
  label: string;
  /** Present state of that work, in words — never colour alone. */
  detail: string;
  done: boolean;
  /** Setup-notice copy used while this is the next incomplete step. */
  headline: string;
  body: string;
  action: ReactNode;
}

function AdminRouteLink({
  children,
  sectionId,
  tabId,
  primary = false,
}: {
  children: string;
  sectionId: string;
  tabId: string;
  primary?: boolean;
}) {
  return (
    <a
      className={`cedros-data-btn cedros-data-btn--${primary ? 'primary' : 'secondary'} cedros-data-btn--sm`}
      href={adminSectionHref(sectionId, tabId)}
      data-section-id={`cedros-pay:${sectionId}`}
      data-tab-id={`cedros-pay:${tabId}`}
    >
      {children}
    </a>
  );
}

function countPhrase(count: number, one: string, other: string, locale?: string): string {
  return `${new Intl.NumberFormat(locale).format(count)} ${selectPlural(count, { one, other }, locale)}`;
}

function joinLabels(labels: string[]): string {
  if (labels.length <= 1) return labels[0] ?? '';
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`;
}

function StepList({ steps }: { steps: LaunchStep[] }) {
  return (
    <ol className="cedros-admin__steps">
      {steps.map((step) => (
        <li
          key={step.id}
          className={`cedros-admin__step ${step.done ? 'cedros-admin__step--done' : ''}`}
        >
          <span className="cedros-admin__step-marker" aria-hidden="true">
            {step.done ? Icons.check : null}
          </span>
          <span className="cedros-admin__step-text">
            <span className="cedros-admin__step-label">
              {step.label}
              <span className="cedros-admin__visually-hidden">
                {step.done ? ' — done' : ' — to do'}
              </span>
            </span>
            <span className="cedros-admin__step-detail">{step.detail}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

function ActivationDialog({
  activating,
  error,
  onActivate,
  onClose,
}: {
  activating: boolean;
  error: string | null;
  onActivate: () => Promise<boolean>;
  onClose: () => void;
}) {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <AdminDialog labelledBy={titleId} describedBy={descriptionId} onClose={onClose}>
      <div className="cedros-data-dialog__heading cedros-admin__section-header">
        <h3 id={titleId} className="cedros-data-dialog__title cedros-admin__section-title">
          Activate checkout?
        </h3>
      </div>
      <div id={descriptionId} className="cedros-data-dialog__body cedros-admin__modal-body">
        <p>
          Cedros will finish the one-time setup needed to safely accept checkouts, carts,
          subscriptions, and refunds for this site.
        </p>
        <p>
          This setup stays enabled after checkout is activated.
        </p>
        {/* A failed activation leaves this dialog open, so its explanation has
            to live inside the panel — behind the overlay it is unreadable. */}
        {error ? (
          <div className="cedros-data-status cedros-data-status--error" role="alert">
            <span>{error}</span>
          </div>
        ) : null}
      </div>
      <div className="cedros-data-actions cedros-admin__modal-footer">
        <button
          type="button"
          className="cedros-data-btn cedros-data-btn--secondary cedros-admin__button"
          onClick={onClose}
          disabled={activating}
        >
          Cancel
        </button>
        <button
          type="button"
          className="cedros-data-btn cedros-data-btn--primary cedros-admin__button"
          onClick={async () => {
            if (await onActivate()) onClose();
          }}
          disabled={activating}
        >
          {activating ? 'Activating…' : error ? 'Try again' : 'Activate checkout'}
        </button>
      </div>
    </AdminDialog>
  );
}

function AttentionNotice({
  failedOrders,
  locale,
  pendingOrders,
  pendingRefunds,
}: {
  failedOrders: number;
  locale?: string;
  pendingOrders: number;
  pendingRefunds: number;
}) {
  const orders = pendingOrders + failedOrders;
  const clauses: string[] = [];
  if (orders > 0) clauses.push(countPhrase(orders, 'order', 'orders', locale));
  if (pendingRefunds > 0) clauses.push(countPhrase(pendingRefunds, 'refund', 'refunds', locale));
  if (clauses.length === 0) return null;

  return (
    <div className="cedros-data-status cedros-data-status--warning" role="status">
      <p className="cedros-admin__attention-text">
        {joinLabels(clauses)} {clauses.length === 1 && orders + pendingRefunds === 1 ? 'needs' : 'need'} attention.
      </p>
      <div className="cedros-data-status__actions">
        {orders > 0 ? (
          <AdminRouteLink sectionId="transactions" tabId="orders">
            {`Review ${countPhrase(orders, 'order', 'orders', locale)}`}
          </AdminRouteLink>
        ) : null}
        {pendingRefunds > 0 ? (
          <AdminRouteLink sectionId="transactions" tabId="refunds">
            {`Review ${countPhrase(pendingRefunds, 'refund', 'refunds', locale)}`}
          </AdminRouteLink>
        ) : null}
      </div>
    </div>
  );
}

function MetricLink({
  hint,
  label,
  sectionId,
  tabId,
  value,
}: {
  hint: string;
  label: string;
  sectionId: string;
  tabId: string;
  value: string;
}) {
  return (
    <a
      className="cedros-data-metric cedros-data-metric--interactive"
      href={adminSectionHref(sectionId, tabId)}
      data-section-id={`cedros-pay:${sectionId}`}
      data-tab-id={`cedros-pay:${tabId}`}
      aria-label={`${label}: ${value}. View in transactions.`}
    >
      <span className="cedros-data-metric__label">{label}</span>
      <span className="cedros-data-metric__value">{value}</span>
      <span className="cedros-data-metric__hint">{hint}</span>
    </a>
  );
}

export function PayHubReadiness({
  activationError,
  activating,
  locale,
  onActivate,
  readiness,
}: {
  activationError: string | null;
  activating: boolean;
  locale?: string;
  onActivate: () => Promise<boolean>;
  readiness: PayHubReadinessState;
}) {
  const [showActivation, setShowActivation] = useState(false);
  const activityTitleId = useId();

  const readyRails = (Object.keys(readiness.paymentRails) as PaymentRail[]).filter(
    (rail) => readiness.paymentRails[rail]
  );
  const hasPaymentRail = readyRails.length > 0;
  const sellableProducts = readiness.stats.sellableProducts ?? readiness.stats.activeProducts;
  const hasProduct = sellableProducts > 0;
  const checkoutActive = readiness.launchActive;
  const railNames = readyRails.map((rail) => RAIL_LABELS[rail]);
  const productPhrase = countPhrase(sellableProducts, 'product', 'products', locale);

  const steps: LaunchStep[] = [
    {
      id: 'rail',
      label: 'Connect a payment method',
      detail: hasPaymentRail
        ? `${joinLabels(railNames)} ${readyRails.length === 1 ? 'is' : 'are'} ready for checkout.`
        : 'Stripe, Crypto, and Credits are all unconfigured.',
      done: hasPaymentRail,
      headline: 'Start taking payments',
      body: 'Connect Stripe, Crypto, or Credits so Pay can collect money at checkout.',
      action: (
        <AdminRouteLink sectionId="settings-hub" tabId="stripe" primary>
          Set up Stripe
        </AdminRouteLink>
      ),
    },
    {
      id: 'product',
      label: 'Add a product with a price',
      detail: hasProduct
        ? `${productPhrase} can be sold at checkout.`
        : 'No active product has a checkout price.',
      done: hasProduct,
      headline: 'Add something to sell',
      body: 'Checkout needs at least one active product with a price.',
      action: (
        <AdminRouteLink sectionId="catalog" tabId="products" primary>
          Add a product
        </AdminRouteLink>
      ),
    },
  ];
  if (!checkoutActive) {
    steps.push({
      id: 'launch',
      label: 'Activate checkout',
      detail: hasPaymentRail && hasProduct
        ? 'Checkout is ready to activate.'
        : 'Waiting on the steps above.',
      done: false,
      headline: 'Open checkout',
      body: 'Activate checkout so customers can place orders.',
      action: (
        <button
          type="button"
          className="cedros-data-btn cedros-data-btn--primary cedros-data-btn--sm"
          onClick={() => setShowActivation(true)}
          disabled={!hasPaymentRail || !hasProduct || activating}
        >
          Activate checkout
        </button>
      ),
    });
  }

  const nextStep = steps.find((step) => !step.done);
  const pendingOrders = readiness.stats.orders?.pending ?? 0;
  const failedOrders = readiness.stats.orders?.failed ?? 0;
  const pendingRefunds = readiness.stats.pendingRefunds;
  const noPaymentsYet = readiness.stats.totalTransactions === 0;
  // A bounded ledger scan can stop early, so these totals are a floor rather
  // than an answer. Say so on the tiles instead of implying "all time".
  const statsTruncated = readiness.stats.truncated === true;
  const metricHint = statsTruncated ? 'Partial — scan limit reached' : 'All time';
  // Checkout that has never opened has no outcomes to report, so setup keeps the
  // screenful to one decision. Any recorded payment brings the card back.
  const showActivity = !nextStep || !noPaymentsYet || readiness.stats.totalRevenue > 0;

  return (
    <div className="cedros-data-stack cedros-admin__readiness">
      {nextStep ? (
        <>
          <SetupNotice
            title={nextStep.headline}
            description={nextStep.body}
            action={nextStep.action}
          />
          <StepList steps={steps} />
        </>
      ) : (
        <section className="cedros-data-card cedros-admin__launch">
          <div className="cedros-admin__launch-heading">
            <h3 className="cedros-data-card__title cedros-admin__field-group-title">
              Checkout is enabled
            </h3>
            <span className="cedros-data-pill cedros-data-pill--success cedros-admin__badge cedros-admin__badge--success">
              Enabled
            </span>
          </div>
          <p className="cedros-admin__launch-summary">
            {`${joinLabels(railNames)} · ${productPhrase}`}
          </p>
          <p className="cedros-admin__hint">
            This confirms site configuration, not provider health. Verify Stripe test or live
            mode and the Solana network in payment settings, then complete a test checkout.
          </p>
          <AdvancedDetails label="Setup steps">
            <StepList steps={steps} />
          </AdvancedDetails>
        </section>
      )}

      {activationError && !showActivation ? (
        <div className="cedros-data-status cedros-data-status--error" role="alert">
          <span>{activationError}</span>
          <div className="cedros-data-status__actions">
            <button
              type="button"
              className="cedros-data-btn cedros-data-btn--secondary cedros-data-btn--sm"
              onClick={() => setShowActivation(true)}
            >
              Try again
            </button>
          </div>
        </div>
      ) : null}

      <AttentionNotice
        failedOrders={failedOrders}
        locale={locale}
        pendingOrders={pendingOrders}
        pendingRefunds={pendingRefunds}
      />

      {showActivity ? (
      <section className="cedros-data-card cedros-admin__activity" aria-labelledby={activityTitleId}>
        <h3 id={activityTitleId} className="cedros-data-card__title cedros-admin__field-group-title">
          Payments
        </h3>
        <div className="cedros-data-summary-grid">
          <MetricLink
            label="Revenue collected"
            value={readiness.stats.revenueIncludesNonUsd ? 'See transactions' : formatCurrencyAmount(readiness.stats.totalRevenue, 'USD', locale)}
            hint={readiness.stats.revenueIncludesNonUsd ? 'Amounts include other currencies; no conversion applied' : metricHint}
            sectionId="transactions"
            tabId="transactions"
          />
          <MetricLink
            label="Payments completed"
            value={new Intl.NumberFormat(locale).format(readiness.stats.totalTransactions)}
            hint={metricHint}
            sectionId="transactions"
            tabId="orders"
          />
        </div>
        {statsTruncated ? (
          <LedgerTruncationWarning message="Payment stats may be partial because the ledger scan hit the admin row limit." />
        ) : null}
        {noPaymentsYet && !statsTruncated ? (
          <p className="cedros-data-empty">
            No payments yet — run one buyer checkout to confirm the setup end to end.
          </p>
        ) : null}
      </section>
      ) : null}

      {showActivation ? (
        <ActivationDialog
          activating={activating}
          error={activationError}
          onActivate={onActivate}
          onClose={() => setShowActivation(false)}
        />
      ) : null}
    </div>
  );
}
