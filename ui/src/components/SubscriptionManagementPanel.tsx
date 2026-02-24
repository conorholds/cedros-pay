import { useEffect, useCallback, useMemo, useRef } from 'react';
import { useSubscriptionManagement } from '../hooks/useSubscriptionManagement';
import { useCedrosTheme } from '../context';
import type { BillingInterval, ChangePreviewResponse } from '../types';
import {
  getSubscriptionPanelStyles,
  formatAmount,
  formatDate,
  getStatusColor,
} from './subscriptionPanelStyles';

/**
 * Available plan for upgrade/downgrade
 */
export interface AvailablePlan {
  /** Plan resource ID */
  resource: string;
  /** Display name */
  name: string;
  /** Price per period (in cents) */
  price: number;
  /** Currency */
  currency: string;
  /** Billing interval */
  interval: BillingInterval;
  /** Optional description */
  description?: string;
}

/**
 * Props for SubscriptionManagementPanel
 */
export interface SubscriptionManagementPanelProps {
  /** Current plan resource ID */
  resource: string;
  /** User identifier (email, customer ID, or wallet address) */
  userId: string;
  /** Available plans for upgrade/downgrade */
  availablePlans?: AvailablePlan[];
  /** Callback when subscription is successfully changed */
  onSubscriptionChanged?: (newResource: string, newInterval: BillingInterval) => void;
  /** Callback when subscription is canceled */
  onSubscriptionCanceled?: () => void;
  /** Return URL for billing portal */
  billingPortalReturnUrl?: string;
  /** Show billing portal button (Stripe subscriptions only) */
  showBillingPortal?: boolean;
  /** Custom class name */
  className?: string;
  /** Custom styles */
  style?: React.CSSProperties;
}

/** Proration preview component */
function ProrationPreview({
  preview,
  onConfirm,
  onCancel,
  isLoading,
  styles,
}: {
  preview: ChangePreviewResponse;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
  styles: ReturnType<typeof getSubscriptionPanelStyles>;
}) {
  const isCredit = preview.immediateAmount < 0;

  return (
    <div className="cedros-proration-preview" style={styles.prorationPreview}>
      <h4 style={styles.previewTitle}>Change Preview</h4>
      <div style={styles.previewDetails}>
        <div style={styles.previewRow}>
          <span>Current plan:</span>
          <span>{formatAmount(preview.currentPlanPrice, preview.currency)}/period</span>
        </div>
        <div style={styles.previewRow}>
          <span>New plan:</span>
          <span>{formatAmount(preview.newPlanPrice, preview.currency)}/period</span>
        </div>
        <div style={styles.previewRow}>
          <span>Days remaining:</span>
          <span>{preview.daysRemaining} days</span>
        </div>
        {preview.prorationDetails && (
          <>
            <div style={styles.previewRow}>
              <span>Unused credit:</span>
              <span>-{formatAmount(preview.prorationDetails.unusedCredit, preview.currency)}</span>
            </div>
            <div style={styles.previewRow}>
              <span>New plan cost:</span>
              <span>{formatAmount(preview.prorationDetails.newPlanCost, preview.currency)}</span>
            </div>
          </>
        )}
        <div style={{ ...styles.previewRow, ...styles.previewTotal }}>
          <span>{isCredit ? 'Credit to account:' : 'Amount due now:'}</span>
          <span style={{ color: isCredit ? '#22c55e' : '#ef4444' }}>
            {formatAmount(Math.abs(preview.immediateAmount), preview.currency)}
          </span>
        </div>
        <div style={styles.previewRow}>
          <span>Effective date:</span>
          <span>{formatDate(preview.effectiveDate)}</span>
        </div>
      </div>
      <div style={styles.previewActions}>
        <button onClick={onCancel} style={styles.cancelButton} disabled={isLoading}>
          Cancel
        </button>
        <button onClick={onConfirm} style={styles.confirmButton} disabled={isLoading}>
          {isLoading ? 'Processing...' : 'Confirm Change'}
        </button>
      </div>
    </div>
  );
}

/**
 * Subscription management panel component
 *
 * Provides a UI for viewing and managing existing subscriptions:
 * - View current subscription details
 * - Upgrade or downgrade to different plans
 * - Cancel subscription
 * - Access Stripe billing portal
 *
 * @example
 * ```tsx
 * <SubscriptionManagementPanel
 *   resource="plan-pro"
 *   userId="user@example.com"
 *   availablePlans={[
 *     { resource: 'plan-basic', name: 'Basic', price: 999, currency: 'USD', interval: 'monthly' },
 *     { resource: 'plan-pro', name: 'Pro', price: 1999, currency: 'USD', interval: 'monthly' },
 *     { resource: 'plan-enterprise', name: 'Enterprise', price: 4999, currency: 'USD', interval: 'monthly' },
 *   ]}
 *   onSubscriptionChanged={(newResource) => console.log('Changed to:', newResource)}
 *   showBillingPortal
 * />
 * ```
 */
export function SubscriptionManagementPanel({
  resource,
  userId,
  availablePlans = [],
  onSubscriptionChanged,
  onSubscriptionCanceled,
  billingPortalReturnUrl,
  showBillingPortal = false,
  className,
  style,
}: SubscriptionManagementPanelProps) {
  const { mode } = useCedrosTheme();
  const styles = useMemo(() => getSubscriptionPanelStyles(mode === 'dark'), [mode]);

  const {
    subscription,
    changePreview,
    status,
    error,
    loadSubscription,
    previewChange,
    changeSubscription,
    cancelSubscription,
    openBillingPortal,
    clearPreview,
  } = useSubscriptionManagement();

  // Load subscription on mount
  useEffect(() => {
    loadSubscription(resource, userId);
  }, [resource, userId, loadSubscription]);

  // Track which plan was selected for change so confirmation doesn't rely on price matching
  const pendingPlanRef = useRef<{ resource: string; interval?: BillingInterval } | null>(null);

  // Handle plan change preview
  const handlePreviewChange = useCallback(
    async (newResource: string, newInterval?: BillingInterval) => {
      pendingPlanRef.current = { resource: newResource, interval: newInterval };
      await previewChange(resource, newResource, userId, newInterval);
    },
    [resource, userId, previewChange]
  );

  // Handle plan change confirmation
  const handleConfirmChange = useCallback(async () => {
    if (!changePreview) return;

    const pending = pendingPlanRef.current;
    const response = await changeSubscription({
      newResource: pending?.resource || resource,
      newInterval: pending?.interval,
      immediate: true,
    });

    if (response?.success && pending && pending.interval) {
      onSubscriptionChanged?.(pending.resource, pending.interval);
      pendingPlanRef.current = null;
    }
  }, [changePreview, resource, changeSubscription, onSubscriptionChanged]);

  // Handle cancellation
  const handleCancel = useCallback(
    async (immediate: boolean) => {
      const response = await cancelSubscription(immediate);
      if (response?.success) {
        onSubscriptionCanceled?.();
      }
    },
    [cancelSubscription, onSubscriptionCanceled]
  );

  // Handle billing portal
  const handleOpenBillingPortal = useCallback(() => {
    openBillingPortal(userId, billingPortalReturnUrl);
  }, [userId, billingPortalReturnUrl, openBillingPortal]);

  const isLoading = status === 'loading';

  return (
    <div className={`cedros-subscription-panel ${className || ''}`} style={{ ...styles.container, ...style }}>
      {/* Error display */}
      {error && (
        <div className="cedros-subscription-error" style={styles.error}>
          {error}
        </div>
      )}

      {/* Loading state */}
      {isLoading && !subscription && (
        <div className="cedros-subscription-loading" style={styles.loading}>
          Loading subscription...
        </div>
      )}

      {/* Subscription details */}
      {subscription && (
        <>
          <div className="cedros-subscription-details" style={styles.details}>
            <h3 style={styles.title}>Current Subscription</h3>
            <div style={styles.detailRow}>
              <span style={styles.label}>Plan:</span>
              <span style={styles.value}>{subscription.resource}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.label}>Status:</span>
              <span
                style={{
                  ...styles.statusBadge,
                  backgroundColor: getStatusColor(subscription.status),
                }}
              >
                {subscription.status}
              </span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.label}>Price:</span>
              <span style={styles.value}>
                {formatAmount(subscription.pricePerPeriod, subscription.currency)}/{subscription.interval}
              </span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.label}>Current period ends:</span>
              <span style={styles.value}>{formatDate(subscription.currentPeriodEnd)}</span>
            </div>
            {subscription.cancelAtPeriodEnd && (
              <div style={styles.cancelNotice}>
                Subscription will cancel at end of current period
              </div>
            )}
          </div>

          {/* Proration preview */}
          {changePreview && (
            <ProrationPreview
              preview={changePreview}
              onConfirm={handleConfirmChange}
              onCancel={clearPreview}
              isLoading={isLoading}
              styles={styles}
            />
          )}

          {/* Available plans */}
          {availablePlans.length > 0 && !changePreview && (
            <div className="cedros-available-plans" style={styles.plansSection}>
              <h4 style={styles.plansTitle}>Available Plans</h4>
              <div style={styles.plansList}>
                {availablePlans.map((plan) => {
                  const isCurrent = plan.resource === subscription.resource;
                  return (
                    <div
                      key={plan.resource}
                      style={{
                        ...styles.planCard,
                        ...(isCurrent ? styles.currentPlan : {}),
                      }}
                    >
                      <div style={styles.planName}>{plan.name}</div>
                      <div style={styles.planPrice}>
                        {formatAmount(plan.price, plan.currency)}/{plan.interval}
                      </div>
                      {plan.description && <div style={styles.planDescription}>{plan.description}</div>}
                      {isCurrent ? (
                        <span style={styles.currentBadge}>Current Plan</span>
                      ) : (
                        <button
                          onClick={() => handlePreviewChange(plan.resource, plan.interval)}
                          style={styles.changePlanButton}
                          disabled={isLoading}
                        >
                          {plan.price > subscription.pricePerPeriod ? 'Upgrade' : 'Downgrade'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="cedros-subscription-actions" style={styles.actions}>
            {showBillingPortal && subscription.paymentMethod === 'stripe' && (
              <button onClick={handleOpenBillingPortal} style={styles.portalButton} disabled={isLoading}>
                Manage Billing
              </button>
            )}
            {subscription.status === 'active' && !subscription.cancelAtPeriodEnd && (
              <button
                onClick={() => handleCancel(false)}
                style={styles.cancelSubscriptionButton}
                disabled={isLoading}
              >
                Cancel Subscription
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
