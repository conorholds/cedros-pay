"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionManagementPanel = SubscriptionManagementPanel;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_native_1 = require("react-native");
const useSubscriptionManagement_1 = require("../hooks/useSubscriptionManagement");
const context_1 = require("../context");
/**
 * Format amount for display
 */
function formatAmount(amount, currency) {
    try {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
        }).format(amount / 100);
    }
    catch {
        return `$${(amount / 100).toFixed(2)} ${currency}`;
    }
}
/**
 * Format date for display
 */
function formatDate(dateString) {
    try {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    }
    catch {
        return dateString;
    }
}
/**
 * Get status color
 */
function getStatusColor(status) {
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
function ProrationPreview({ preview, onConfirm, onCancel, isLoading, }) {
    const theme = (0, context_1.useCedrosTheme)();
    const isCredit = preview.immediateAmount < 0;
    return ((0, jsx_runtime_1.jsxs)(react_native_1.View, { style: styles.prorationPreview, children: [(0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [styles.previewTitle, { color: theme.tokens?.surfaceText || '#111827' }], children: "Change Preview" }), (0, jsx_runtime_1.jsxs)(react_native_1.View, { style: styles.previewDetails, children: [(0, jsx_runtime_1.jsxs)(react_native_1.View, { style: styles.previewRow, children: [(0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.previewLabel, children: "Current plan:" }), (0, jsx_runtime_1.jsxs)(react_native_1.Text, { style: styles.previewValue, children: [formatAmount(preview.currentPlanPrice, preview.currency), "/period"] })] }), (0, jsx_runtime_1.jsxs)(react_native_1.View, { style: styles.previewRow, children: [(0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.previewLabel, children: "New plan:" }), (0, jsx_runtime_1.jsxs)(react_native_1.Text, { style: styles.previewValue, children: [formatAmount(preview.newPlanPrice, preview.currency), "/period"] })] }), (0, jsx_runtime_1.jsxs)(react_native_1.View, { style: styles.previewRow, children: [(0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.previewLabel, children: "Days remaining:" }), (0, jsx_runtime_1.jsxs)(react_native_1.Text, { style: styles.previewValue, children: [preview.daysRemaining, " days"] })] }), preview.prorationDetails && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)(react_native_1.View, { style: styles.previewRow, children: [(0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.previewLabel, children: "Unused credit:" }), (0, jsx_runtime_1.jsxs)(react_native_1.Text, { style: styles.previewValue, children: ["-", formatAmount(preview.prorationDetails.unusedCredit, preview.currency)] })] }), (0, jsx_runtime_1.jsxs)(react_native_1.View, { style: styles.previewRow, children: [(0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.previewLabel, children: "New plan cost:" }), (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.previewValue, children: formatAmount(preview.prorationDetails.newPlanCost, preview.currency) })] })] })), (0, jsx_runtime_1.jsxs)(react_native_1.View, { style: [styles.previewRow, styles.previewTotal], children: [(0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.previewLabel, children: isCredit ? 'Credit to account:' : 'Amount due now:' }), (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: { color: isCredit ? '#22c55e' : '#ef4444', fontWeight: '600' }, children: formatAmount(Math.abs(preview.immediateAmount), preview.currency) })] }), (0, jsx_runtime_1.jsxs)(react_native_1.View, { style: styles.previewRow, children: [(0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.previewLabel, children: "Effective date:" }), (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.previewValue, children: formatDate(preview.effectiveDate) })] })] }), (0, jsx_runtime_1.jsxs)(react_native_1.View, { style: styles.previewActions, children: [(0, jsx_runtime_1.jsx)(react_native_1.TouchableOpacity, { onPress: onCancel, style: [styles.button, styles.cancelButton], disabled: isLoading, children: (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.cancelButtonText, children: "Cancel" }) }), (0, jsx_runtime_1.jsx)(react_native_1.TouchableOpacity, { onPress: onConfirm, style: [styles.button, styles.confirmButton], disabled: isLoading, children: isLoading ? ((0, jsx_runtime_1.jsx)(react_native_1.ActivityIndicator, { color: "#ffffff", size: "small" })) : ((0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.buttonText, children: "Confirm Change" })) })] })] }));
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
function SubscriptionManagementPanel({ resource, userId, availablePlans = [], onSubscriptionChanged, onSubscriptionCanceled, billingPortalReturnUrl, showBillingPortal = false, style, }) {
    const theme = (0, context_1.useCedrosTheme)();
    const { subscription, changePreview, status, error, loadSubscription, previewChange, changeSubscription, cancelSubscription, openBillingPortal, clearPreview, } = (0, useSubscriptionManagement_1.useSubscriptionManagement)();
    // Load subscription on mount
    (0, react_1.useEffect)(() => {
        loadSubscription(resource, userId);
    }, [resource, userId, loadSubscription]);
    // Handle plan change preview
    const handlePreviewChange = (0, react_1.useCallback)(async (newResource, newInterval) => {
        await previewChange(resource, newResource, userId, newInterval);
    }, [resource, userId, previewChange]);
    // Handle plan change confirmation
    const handleConfirmChange = (0, react_1.useCallback)(async () => {
        if (!changePreview)
            return;
        const selectedPlan = availablePlans.find((p) => p.price === changePreview.newPlanPrice && p.currency === changePreview.currency);
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
    const handleCancel = (0, react_1.useCallback)(async (immediate) => {
        const response = await cancelSubscription(immediate);
        if (response?.success) {
            onSubscriptionCanceled?.();
        }
    }, [cancelSubscription, onSubscriptionCanceled]);
    // Handle billing portal
    const handleOpenBillingPortal = (0, react_1.useCallback)(() => {
        openBillingPortal(userId, billingPortalReturnUrl);
    }, [userId, billingPortalReturnUrl, openBillingPortal]);
    const isLoading = status === 'loading';
    return ((0, jsx_runtime_1.jsxs)(react_native_1.View, { style: [styles.container, style], children: [error && ((0, jsx_runtime_1.jsx)(react_native_1.View, { style: [styles.errorContainer, { backgroundColor: theme.tokens?.errorBackground || '#fee2e2' }], children: (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [styles.errorText, { color: theme.tokens?.errorText || '#b91c1c' }], children: error }) })), isLoading && !subscription && ((0, jsx_runtime_1.jsxs)(react_native_1.View, { style: styles.loadingContainer, children: [(0, jsx_runtime_1.jsx)(react_native_1.ActivityIndicator, { size: "large", color: theme.tokens?.surfaceText || '#111827' }), (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [styles.loadingText, { color: theme.tokens?.surfaceText || '#6b7280' }], children: "Loading subscription..." })] })), subscription && ((0, jsx_runtime_1.jsxs)(react_native_1.ScrollView, { style: styles.content, children: [(0, jsx_runtime_1.jsxs)(react_native_1.View, { style: styles.detailsSection, children: [(0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [styles.title, { color: theme.tokens?.surfaceText || '#111827' }], children: "Current Subscription" }), (0, jsx_runtime_1.jsxs)(react_native_1.View, { style: styles.detailRow, children: [(0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.detailLabel, children: "Plan:" }), (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [styles.detailValue, { color: theme.tokens?.surfaceText || '#111827' }], children: subscription.resource })] }), (0, jsx_runtime_1.jsxs)(react_native_1.View, { style: styles.detailRow, children: [(0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.detailLabel, children: "Status:" }), (0, jsx_runtime_1.jsx)(react_native_1.View, { style: [
                                            styles.statusBadge,
                                            { backgroundColor: getStatusColor(subscription.status) },
                                        ], children: (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.statusText, children: subscription.status }) })] }), (0, jsx_runtime_1.jsxs)(react_native_1.View, { style: styles.detailRow, children: [(0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.detailLabel, children: "Price:" }), (0, jsx_runtime_1.jsxs)(react_native_1.Text, { style: [styles.detailValue, { color: theme.tokens?.surfaceText || '#111827' }], children: [formatAmount(subscription.pricePerPeriod, subscription.currency), "/", subscription.interval] })] }), (0, jsx_runtime_1.jsxs)(react_native_1.View, { style: styles.detailRow, children: [(0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.detailLabel, children: "Current period ends:" }), (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [styles.detailValue, { color: theme.tokens?.surfaceText || '#111827' }], children: formatDate(subscription.currentPeriodEnd) })] }), subscription.cancelAtPeriodEnd && ((0, jsx_runtime_1.jsx)(react_native_1.View, { style: [styles.cancelNotice, { backgroundColor: theme.tokens?.errorBackground || '#fee2e2' }], children: (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [styles.cancelNoticeText, { color: theme.tokens?.errorText || '#b91c1c' }], children: "Subscription will cancel at end of current period" }) }))] }), changePreview && ((0, jsx_runtime_1.jsx)(ProrationPreview, { preview: changePreview, onConfirm: handleConfirmChange, onCancel: clearPreview, isLoading: isLoading })), availablePlans.length > 0 && !changePreview && ((0, jsx_runtime_1.jsxs)(react_native_1.View, { style: styles.plansSection, children: [(0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [styles.plansTitle, { color: theme.tokens?.surfaceText || '#111827' }], children: "Available Plans" }), availablePlans.map((plan) => {
                                const isCurrent = plan.resource === subscription.resource;
                                return ((0, jsx_runtime_1.jsxs)(react_native_1.View, { style: [
                                        styles.planCard,
                                        isCurrent && [
                                            styles.currentPlan,
                                            { borderColor: theme.tokens?.successBorder || '#86efac' },
                                        ],
                                    ], children: [(0, jsx_runtime_1.jsxs)(react_native_1.View, { style: styles.planHeader, children: [(0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [styles.planName, { color: theme.tokens?.surfaceText || '#111827' }], children: plan.name }), (0, jsx_runtime_1.jsxs)(react_native_1.Text, { style: [styles.planPrice, { color: theme.tokens?.surfaceText || '#111827' }], children: [formatAmount(plan.price, plan.currency), "/", plan.interval] })] }), plan.description && ((0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [styles.planDescription, { color: theme.tokens?.surfaceText || '#6b7280' }], children: plan.description })), isCurrent ? ((0, jsx_runtime_1.jsx)(react_native_1.View, { style: [styles.currentBadge, { backgroundColor: theme.tokens?.successBackground || '#dcfce7' }], children: (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [styles.currentBadgeText, { color: theme.tokens?.successText || '#166534' }], children: "Current Plan" }) })) : ((0, jsx_runtime_1.jsx)(react_native_1.TouchableOpacity, { onPress: () => handlePreviewChange(plan.resource, plan.interval), style: [
                                                styles.changePlanButton,
                                                { backgroundColor: theme.tokens?.stripeBackground || '#635BFF' },
                                            ], disabled: isLoading, children: (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.changePlanButtonText, children: plan.price > subscription.pricePerPeriod ? 'Upgrade' : 'Downgrade' }) }))] }, plan.resource));
                            })] })), (0, jsx_runtime_1.jsxs)(react_native_1.View, { style: styles.actions, children: [showBillingPortal && subscription.paymentMethod === 'stripe' && ((0, jsx_runtime_1.jsx)(react_native_1.TouchableOpacity, { onPress: handleOpenBillingPortal, style: [styles.portalButton, { backgroundColor: theme.tokens?.stripeBackground || '#635BFF' }], disabled: isLoading, children: (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.portalButtonText, children: "Manage Billing" }) })), subscription.status === 'active' && !subscription.cancelAtPeriodEnd && ((0, jsx_runtime_1.jsx)(react_native_1.TouchableOpacity, { onPress: () => handleCancel(false), style: [styles.cancelSubscriptionButton, { borderColor: theme.tokens?.errorBorder || '#fca5a5' }], disabled: isLoading, children: (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [styles.cancelSubscriptionText, { color: theme.tokens?.errorText || '#b91c1c' }], children: "Cancel Subscription" }) }))] })] }))] }));
}
const styles = react_native_1.StyleSheet.create({
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
//# sourceMappingURL=SubscriptionManagementPanel.js.map