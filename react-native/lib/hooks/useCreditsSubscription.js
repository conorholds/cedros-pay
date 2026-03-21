"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useCreditsSubscription = useCreditsSubscription;
const react_1 = require("react");
const context_1 = require("../context");
const errorHandling_1 = require("../utils/errorHandling");
/**
 * Hook for credits subscription payments
 *
 * Handles:
 * - Checking subscription status
 * - Requesting subscription quotes with credits
 * - Processing credits subscription payments
 *
 * @example
 * ```tsx
 * function CreditsSubscribePage() {
 *   const { checkStatus, processPayment, status, subscriptionStatus } = useCreditsSubscription();
 *
 *   const handleSubscribe = async () => {
 *     await processPayment('plan-pro', 'monthly', authToken);
 *   };
 * }
 * ```
 */
function useCreditsSubscription() {
    const { subscriptionManager, creditsManager } = (0, context_1.useCedrosContext)();
    const [state, setState] = (0, react_1.useState)({
        status: 'idle',
        error: null,
        sessionId: null,
        subscriptionStatus: null,
        expiresAt: null,
        creditsRequirement: null,
    });
    /**
     * Check subscription status for a user
     * @param resource - Subscription resource/plan ID
     * @param userId - User ID (from cedros-login)
     */
    const checkStatus = (0, react_1.useCallback)(async (resource, userId) => {
        setState((prev) => ({
            ...prev,
            status: 'checking',
            error: null,
        }));
        try {
            const response = await subscriptionManager.checkSubscriptionStatus({
                resource,
                userId,
            });
            setState((prev) => ({
                ...prev,
                status: response.active ? 'success' : 'idle',
                subscriptionStatus: response.status,
                expiresAt: response.expiresAt || response.currentPeriodEnd || null,
            }));
            return response;
        }
        catch (error) {
            const errorMessage = (0, errorHandling_1.formatError)(error, 'Failed to check subscription status');
            setState((prev) => ({
                ...prev,
                status: 'error',
                error: errorMessage,
            }));
            return null;
        }
    }, [subscriptionManager]);
    /**
     * Request a subscription quote with credits requirement
     * Uses creditsManager to get the credits price for the subscription resource
     */
    const requestQuote = (0, react_1.useCallback)(async (resource, _interval, options) => {
        setState((prev) => ({
            ...prev,
            status: 'loading',
            error: null,
        }));
        try {
            // Get credits quote for the subscription resource
            // The server determines the credits amount based on the resource and interval
            const creditsRequirement = await creditsManager.requestQuote(resource, options?.couponCode);
            setState((prev) => ({
                ...prev,
                status: 'idle',
                creditsRequirement,
            }));
            return creditsRequirement;
        }
        catch (error) {
            const errorMessage = (0, errorHandling_1.formatError)(error, 'Failed to get subscription quote');
            setState((prev) => ({
                ...prev,
                status: 'error',
                error: errorMessage,
            }));
            return null;
        }
    }, [creditsManager]);
    /**
     * Process a credits subscription payment
     * @param resource - Subscription plan resource ID
     * @param interval - Billing interval
     * @param authToken - JWT token from cedros-login
     * @param options - Additional options (couponCode, intervalDays)
     */
    const processPayment = (0, react_1.useCallback)(async (resource, interval, authToken, options) => {
        if (!authToken) {
            const error = 'Authentication required for credits payment';
            setState((prev) => ({ ...prev, status: 'error', error }));
            return { success: false, error };
        }
        setState((prev) => ({
            ...prev,
            status: 'loading',
            error: null,
        }));
        try {
            // Use the standard credits payment flow
            // The resource ID identifies it as a subscription on the server side
            const result = await creditsManager.processPayment(resource, authToken, options?.couponCode, {
                interval,
                ...(options?.intervalDays && { intervalDays: String(options.intervalDays) }),
            });
            if (result.success) {
                setState({
                    status: 'success',
                    error: null,
                    sessionId: result.transactionId || null,
                    subscriptionStatus: 'active',
                    expiresAt: null, // Will be updated on next status check
                    creditsRequirement: null,
                });
            }
            else {
                setState((prev) => ({
                    ...prev,
                    status: 'error',
                    error: result.error || 'Credits subscription payment failed',
                }));
            }
            return result;
        }
        catch (error) {
            const errorMessage = (0, errorHandling_1.formatError)(error, 'Credits subscription payment failed');
            setState((prev) => ({
                ...prev,
                status: 'error',
                error: errorMessage,
            }));
            return { success: false, error: errorMessage };
        }
    }, [creditsManager]);
    /**
     * Reset the subscription state
     */
    const reset = (0, react_1.useCallback)(() => {
        setState({
            status: 'idle',
            error: null,
            sessionId: null,
            subscriptionStatus: null,
            expiresAt: null,
            creditsRequirement: null,
        });
    }, []);
    return {
        ...state,
        checkStatus,
        requestQuote,
        processPayment,
        reset,
    };
}
//# sourceMappingURL=useCreditsSubscription.js.map