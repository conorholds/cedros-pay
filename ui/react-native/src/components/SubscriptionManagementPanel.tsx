import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  ViewStyle,
} from 'react-native';
import { useSubscriptionManagement } from '../hooks/useSubscriptionManagement';
import { useCedrosTheme } from '../context';
import type { BillingInterval, ChangePreviewResponse } from '../types';

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
  /** Custom container style */
  style?: ViewStyle;
}

/**
 * Format amount for display
 */
function formatAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount / 100);
  } catch {
    return `$${(amount / 100).toFixed(2)} ${currency}`;
  }
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * Get status color
 */
function getStatusColor(status: string): string {
  switch (status) {
    case 'active':
      return '#22c55e';
    case 'trialing':
      return '#3b82f6';
    case 'past_due':
      return '#f59e0b';
    case 'canceled':
      return '#ef4444';
    case 'unpaid':
      return '#dc2626';
    default:
      return '#6b7280';
  }
}

/** Proration preview component */
function ProrationPreview({
  preview,
  onConfirm,
  onCancel,
  isLoading,
}: {
  preview: ChangePreviewResponse;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const theme = useCedrosTheme();
  const isCredit = preview.immediateAmount < 0;

  return (
    <View style={styles.prorationPreview}>
      <Text style={[styles.previewTitle, { color: theme.tokens?.surfaceText || '#111827' }]}>
        Change Preview
      </Text>
      <View style={styles.previewDetails}>
        <View style={styles.previewRow}>
          <Text style={styles.previewLabel}>Current plan:</Text>
          <Text style={styles.previewValue}>
            {formatAmount(preview.currentPlanPrice, preview.currency)}/period
          </Text>
        </View>
        <View style={styles.previewRow}>
          <Text style={styles.previewLabel}>New plan:</Text>
          <Text style={styles.previewValue}>
            {formatAmount(preview.newPlanPrice, preview.currency)}/period
          </Text>
        </View>
        <View style={styles.previewRow}>
          <Text style={styles.previewLabel}>Days remaining:</Text>
          <Text style={styles.previewValue}>{preview.daysRemaining} days</Text>
        </View>
        {preview.prorationDetails && (
          <>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Unused credit:</Text>
              <Text style={styles.previewValue}>
                -{formatAmount(preview.prorationDetails.unusedCredit, preview.currency)}
              </Text>
            </View>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>New plan cost:</Text>
              <Text style={styles.previewValue}>
                {formatAmount(preview.prorationDetails.newPlanCost, preview.currency)}
              </Text>
            </View>
          </>
        )}
        <View style={[styles.previewRow, styles.previewTotal]}>
          <Text style={styles.previewLabel}>
            {isCredit ? 'Credit to account:' : 'Amount due now:'}
          </Text>
          <Text style={{ color: isCredit ? '#22c55e' : '#ef4444', fontWeight: '600' }}>
            {formatAmount(Math.abs(preview.immediateAmount), preview.currency)}
          </Text>
        </View>
        <View style={styles.previewRow}>
          <Text style={styles.previewLabel}>Effective date:</Text>
          <Text style={styles.previewValue}>{formatDate(preview.effectiveDate)}</Text>
        </View>
      </View>
      <View style={styles.previewActions}>
        <TouchableOpacity
          onPress={onCancel}
          style={[styles.button, styles.cancelButton]}
          disabled={isLoading}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onConfirm}
          style={[styles.button, styles.confirmButton]}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.buttonText}>Confirm Change</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

/**
 * Subscription management panel component (React Native)
 *
 * Provides a UI for viewing and managing existing subscriptions:
 * - View current subscription details
 * - Upgrade or downgrade to different plans
 * - Cancel subscription
 * - Access Stripe billing portal
 */
export function SubscriptionManagementPanel({
  resource,
  userId,
  availablePlans = [],
  onSubscriptionChanged,
  onSubscriptionCanceled,
  billingPortalReturnUrl,
  showBillingPortal = false,
  style,
}: SubscriptionManagementPanelProps) {
  const theme = useCedrosTheme();

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

  // Handle plan change preview
  const handlePreviewChange = useCallback(
    async (newResource: string, newInterval?: BillingInterval) => {
      await previewChange(resource, newResource, userId, newInterval);
    },
    [resource, userId, previewChange]
  );

  // Handle plan change confirmation
  const handleConfirmChange = useCallback(async () => {
    if (!changePreview) return;

    const selectedPlan = availablePlans.find(
      (p) => p.price === changePreview.newPlanPrice && p.currency === changePreview.currency
    );

    const response = await changeSubscription({
      newResource: selectedPlan?.resource || resource,
      newInterval: selectedPlan?.interval,
      immediate: true,
    });

    if (response?.success && selectedPlan) {
      onSubscriptionChanged?.(selectedPlan.resource, selectedPlan.interval);
    }
  }, [changePreview, availablePlans, resource, changeSubscription, onSubscriptionChanged]);

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
    <View style={[styles.container, style]}>
      {/* Error display */}
      {error && (
        <View style={[styles.errorContainer, { backgroundColor: theme.tokens?.errorBackground || '#fee2e2' }]}>
          <Text style={[styles.errorText, { color: theme.tokens?.errorText || '#b91c1c' }]}>
            {error}
          </Text>
        </View>
      )}

      {/* Loading state */}
      {isLoading && !subscription && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.tokens?.surfaceText || '#111827'} />
          <Text style={[styles.loadingText, { color: theme.tokens?.surfaceText || '#6b7280' }]}>
            Loading subscription...
          </Text>
        </View>
      )}

      {/* Subscription details */}
      {subscription && (
        <ScrollView style={styles.content}>
          <View style={styles.detailsSection}>
            <Text style={[styles.title, { color: theme.tokens?.surfaceText || '#111827' }]}>
              Current Subscription
            </Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Plan:</Text>
              <Text style={[styles.detailValue, { color: theme.tokens?.surfaceText || '#111827' }]}>
                {subscription.resource}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status:</Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(subscription.status) },
                ]}
              >
                <Text style={styles.statusText}>{subscription.status}</Text>
              </View>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Price:</Text>
              <Text style={[styles.detailValue, { color: theme.tokens?.surfaceText || '#111827' }]}>
                {formatAmount(subscription.pricePerPeriod, subscription.currency)}/{subscription.interval}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Current period ends:</Text>
              <Text style={[styles.detailValue, { color: theme.tokens?.surfaceText || '#111827' }]}>
                {formatDate(subscription.currentPeriodEnd)}
              </Text>
            </View>
            {subscription.cancelAtPeriodEnd && (
              <View style={[styles.cancelNotice, { backgroundColor: theme.tokens?.errorBackground || '#fee2e2' }]}>
                <Text style={[styles.cancelNoticeText, { color: theme.tokens?.errorText || '#b91c1c' }]}>
                  Subscription will cancel at end of current period
                </Text>
              </View>
            )}
          </View>

          {/* Proration preview */}
          {changePreview && (
            <ProrationPreview
              preview={changePreview}
              onConfirm={handleConfirmChange}
              onCancel={clearPreview}
              isLoading={isLoading}
            />
          )}

          {/* Available plans */}
          {availablePlans.length > 0 && !changePreview && (
            <View style={styles.plansSection}>
              <Text style={[styles.plansTitle, { color: theme.tokens?.surfaceText || '#111827' }]}>
                Available Plans
              </Text>
              {availablePlans.map((plan) => {
                const isCurrent = plan.resource === subscription.resource;
                return (
                  <View
                    key={plan.resource}
                    style={[
                      styles.planCard,
                      isCurrent && [
                        styles.currentPlan,
                        { borderColor: theme.tokens?.successBorder || '#86efac' },
                      ],
                    ]}
                  >
                    <View style={styles.planHeader}>
                      <Text style={[styles.planName, { color: theme.tokens?.surfaceText || '#111827' }]}>
                        {plan.name}
                      </Text>
                      <Text style={[styles.planPrice, { color: theme.tokens?.surfaceText || '#111827' }]}>
                        {formatAmount(plan.price, plan.currency)}/{plan.interval}
                      </Text>
                    </View>
                    {plan.description && (
                      <Text style={[styles.planDescription, { color: theme.tokens?.surfaceText || '#6b7280' }]}>
                        {plan.description}
                      </Text>
                    )}
                    {isCurrent ? (
                      <View style={[styles.currentBadge, { backgroundColor: theme.tokens?.successBackground || '#dcfce7' }]}>
                        <Text style={[styles.currentBadgeText, { color: theme.tokens?.successText || '#166534' }]}>
                          Current Plan
                        </Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        onPress={() => handlePreviewChange(plan.resource, plan.interval)}
                        style={[
                          styles.changePlanButton,
                          { backgroundColor: theme.tokens?.stripeBackground || '#635BFF' },
                        ]}
                        disabled={isLoading}
                      >
                        <Text style={styles.changePlanButtonText}>
                          {plan.price > subscription.pricePerPeriod ? 'Upgrade' : 'Downgrade'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            {showBillingPortal && subscription.paymentMethod === 'stripe' && (
              <TouchableOpacity
                onPress={handleOpenBillingPortal}
                style={[styles.portalButton, { backgroundColor: theme.tokens?.stripeBackground || '#635BFF' }]}
                disabled={isLoading}
              >
                <Text style={styles.portalButtonText}>Manage Billing</Text>
              </TouchableOpacity>
            )}
            {subscription.status === 'active' && !subscription.cancelAtPeriodEnd && (
              <TouchableOpacity
                onPress={() => handleCancel(false)}
                style={[styles.cancelSubscriptionButton, { borderColor: theme.tokens?.errorBorder || '#fca5a5' }]}
                disabled={isLoading}
              >
                <Text style={[styles.cancelSubscriptionText, { color: theme.tokens?.errorText || '#b91c1c' }]}>
                  Cancel Subscription
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  errorContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  content: {
    maxHeight: 600,
  },
  detailsSection: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  cancelNotice: {
    marginTop: 12,
    padding: 12,
    borderRadius: 6,
  },
  cancelNoticeText: {
    fontSize: 14,
  },
  prorationPreview: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  previewDetails: {
    marginBottom: 16,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  previewLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  previewValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  previewTotal: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 8,
    marginTop: 8,
  },
  previewActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#22c55e',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  plansSection: {
    marginBottom: 24,
  },
  plansTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  planCard: {
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  currentPlan: {
    borderWidth: 2,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  planName: {
    fontSize: 16,
    fontWeight: '600',
  },
  planPrice: {
    fontSize: 16,
    fontWeight: '600',
  },
  planDescription: {
    fontSize: 14,
    marginBottom: 12,
  },
  currentBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  currentBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  changePlanButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  changePlanButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  actions: {
    gap: 12,
  },
  portalButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  portalButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelSubscriptionButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  cancelSubscriptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
