"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useSubscriptionManagement = useSubscriptionManagement;
const react_1 = require("react");
const react_native_1 = require("react-native");
const context_1 = require("../context");
/**
 * Hook for managing existing subscriptions (upgrade, downgrade, cancel)
 *
 * @example
 * ```tsx
 * function SubscriptionSettings({ userId }: { userId: string }) {
 *   const {
 *     subscription,
 *     status,
 *     error,
 *     loadSubscription,
 *     previewChange,
 *     changeSubscription,
 *     cancelSubscription,
 *     openBillingPortal,
 *   } = useSubscriptionManagement();
 *
 *   useEffect(() => {
 *     loadSubscription('plan-pro', userId);
 *   }, [userId]);
 *
 *   const handleUpgrade = async () => {
 *     const preview = await previewChange('plan-pro', 'plan-enterprise', userId);
 *     if (preview && confirm(`Upgrade for $${preview.immediateAmount / 100}?`)) {
 *       await changeSubscription({ newResource: 'plan-enterprise' });
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       {subscription && (
 *         <div>
 *           <p>Plan: {subscription.resource}</p>
 *           <p>Status: {subscription.status}</p>
 *           <button onClick={handleUpgrade}>Upgrade</button>
 *           <button onClick={() => cancelSubscription()}>Cancel</button>
 *         </div>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
function useSubscriptionManagement() {
    const { subscriptionChangeManager } = (0, context_1.useCedrosContext)();
    const [state, setState] = (0, react_1.useState)({
        status: 'idle',
        error: null,
        subscription: null,
        changePreview: null,
        userId: null,
    });
    // Use refs to track latest state values and prevent stale closures
    const stateRef = (0, react_1.useRef)(state);
    stateRef.current = state;
    /**
     * Load subscription details
     */
    const loadSubscription = (0, react_1.useCallback)(async (resource, userId) => {
        setState((prev) => ({ ...prev, status: 'loading', error: null }));
        try {
            const details = await subscriptionChangeManager.getDetails(resource, userId);
            setState((prev) => ({
                ...prev,
                status: 'success',
                subscription: details,
                userId,
            }));
            return details;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to load subscription';
            setState((prev) => ({ ...prev, status: 'error', error: errorMessage }));
            return null;
        }
    }, [subscriptionChangeManager]);
    /**
     * Preview a subscription change (get proration details)
     */
    const previewChange = (0, react_1.useCallback)(async (currentResource, newResource, userId, newInterval) => {
        setState((prev) => ({ ...prev, status: 'loading', error: null }));
        try {
            const request = {
                currentResource,
                newResource,
                userId,
                newInterval,
            };
            const preview = await subscriptionChangeManager.previewChange(request);
            setState((prev) => ({
                ...prev,
                status: 'idle',
                changePreview: preview,
            }));
            return preview;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to preview change';
            setState((prev) => ({ ...prev, status: 'error', error: errorMessage }));
            return null;
        }
    }, [subscriptionChangeManager]);
    /**
     * Change subscription plan (upgrade or downgrade)
     */
    const changeSubscription = (0, react_1.useCallback)(async (options) => {
        // Use ref to access latest state values and prevent stale closures
        const { subscription, userId } = stateRef.current;
        if (!subscription || !userId) {
            setState((prev) => ({ ...prev, status: 'error', error: 'No subscription loaded' }));
            return null;
        }
        setState((prev) => ({ ...prev, status: 'loading', error: null }));
        try {
            const request = {
                currentResource: subscription.resource,
                newResource: options.newResource,
                userId,
                newInterval: options.newInterval,
                prorationBehavior: options.prorationBehavior,
                immediate: options.immediate,
            };
            const response = await subscriptionChangeManager.changeSubscription(request);
            if (response.success) {
                // Update local subscription state with new values
                setState((prev) => ({
                    ...prev,
                    status: 'success',
                    subscription: prev.subscription
                        ? {
                            ...prev.subscription,
                            resource: response.newResource,
                            interval: response.newInterval,
                            status: response.status,
                        }
                        : null,
                    changePreview: null,
                }));
            }
            else {
                setState((prev) => ({
                    ...prev,
                    status: 'error',
                    error: response.error || 'Failed to change subscription',
                }));
            }
            return response;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to change subscription';
            setState((prev) => ({ ...prev, status: 'error', error: errorMessage }));
            return null;
        }
    }, [subscriptionChangeManager]);
    /**
     * Cancel subscription
     */
    const cancelSubscription = (0, react_1.useCallback)(async (immediate) => {
        // Use ref to access latest state values and prevent stale closures
        const { subscription, userId } = stateRef.current;
        if (!subscription || !userId) {
            setState((prev) => ({ ...prev, status: 'error', error: 'No subscription loaded' }));
            return null;
        }
        setState((prev) => ({ ...prev, status: 'loading', error: null }));
        try {
            const request = {
                resource: subscription.resource,
                userId,
                immediate,
            };
            const response = await subscriptionChangeManager.cancel(request);
            if (response.success) {
                // Update local subscription state
                const newStatus = immediate ? 'canceled' : subscription.status;
                setState((prev) => ({
                    ...prev,
                    status: 'success',
                    subscription: prev.subscription
                        ? {
                            ...prev.subscription,
                            status: newStatus,
                            cancelAtPeriodEnd: !immediate,
                        }
                        : null,
                }));
            }
            else {
                setState((prev) => ({
                    ...prev,
                    status: 'error',
                    error: response.error || 'Failed to cancel subscription',
                }));
            }
            return response;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to cancel subscription';
            setState((prev) => ({ ...prev, status: 'error', error: errorMessage }));
            return null;
        }
    }, [subscriptionChangeManager]);
    /**
     * Open Stripe billing portal
     */
    const openBillingPortal = (0, react_1.useCallback)(async (userId, returnUrl) => {
        setState((prev) => ({ ...prev, status: 'loading', error: null }));
        try {
            const response = await subscriptionChangeManager.getBillingPortalUrl({
                userId,
                returnUrl,
            });
            // Open billing portal in external browser
            await react_native_1.Linking.openURL(response.url);
            return response;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to open billing portal';
            setState((prev) => ({ ...prev, status: 'error', error: errorMessage }));
            return null;
        }
    }, [subscriptionChangeManager]);
    /**
     * Clear change preview
     */
    const clearPreview = (0, react_1.useCallback)(() => {
        setState((prev) => ({ ...prev, changePreview: null }));
    }, []);
    /**
     * Reset state
     */
    const reset = (0, react_1.useCallback)(() => {
        setState({
            status: 'idle',
            error: null,
            subscription: null,
            changePreview: null,
            userId: null,
        });
    }, []);
    return {
        ...state,
        loadSubscription,
        previewChange,
        changeSubscription,
        cancelSubscription,
        openBillingPortal,
        clearPreview,
        reset,
    };
}
//# sourceMappingURL=useSubscriptionManagement.js.map