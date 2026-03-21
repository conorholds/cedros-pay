"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useStripeCheckout = useStripeCheckout;
const react_1 = require("react");
const context_1 = require("../context");
const cartHelpers_1 = require("../utils/cartHelpers");
/**
 * Hook for Stripe checkout flow
 *
 * Handles:
 * - Creating Stripe session
 * - Redirecting to checkout
 * - Managing payment state
 */
function useStripeCheckout() {
    const { stripeManager } = (0, context_1.useCedrosContext)();
    const [state, setState] = (0, react_1.useState)({
        status: 'idle',
        error: null,
        transactionId: null,
    });
    // Track in-flight payment requests to prevent concurrent submissions
    const isProcessingRef = (0, react_1.useRef)(false);
    const processPayment = (0, react_1.useCallback)(async (resource, successUrl, cancelUrl, metadata, customerEmail, couponCode) => {
        // Deduplication: prevent concurrent payment requests
        if (isProcessingRef.current) {
            return { success: false, error: 'Payment already in progress' };
        }
        isProcessingRef.current = true;
        setState({
            status: 'loading',
            error: null,
            transactionId: null,
        });
        const request = {
            resource,
            successUrl,
            cancelUrl,
            metadata,
            customerEmail,
            couponCode,
        };
        try {
            const result = await stripeManager.processPayment(request);
            setState({
                status: result.success ? 'success' : 'error',
                error: result.success ? null : (result.error || 'Payment failed'),
                transactionId: result.success ? (result.transactionId || null) : null,
            });
            return result;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Payment failed';
            setState({
                status: 'error',
                error: errorMessage,
                transactionId: null,
            });
            return { success: false, error: errorMessage };
        }
        finally {
            isProcessingRef.current = false;
        }
    }, [stripeManager]);
    const processCartCheckout = (0, react_1.useCallback)(async (items, successUrl, cancelUrl, metadata, customerEmail, couponCode) => {
        // Deduplication: prevent concurrent payment requests
        if (isProcessingRef.current) {
            return { success: false, error: 'Payment already in progress' };
        }
        isProcessingRef.current = true;
        setState({
            status: 'loading',
            error: null,
            transactionId: null,
        });
        // Normalize items before passing to manager
        const normalizedItems = (0, cartHelpers_1.normalizeCartItems)(items);
        try {
            const result = await stripeManager.processCartCheckout({
                items: normalizedItems,
                successUrl,
                cancelUrl,
                metadata,
                customerEmail,
                couponCode,
            });
            setState({
                status: result.success ? 'success' : 'error',
                error: result.success ? null : (result.error || 'Cart checkout failed'),
                transactionId: result.success ? (result.transactionId || null) : null,
            });
            return result;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Cart checkout failed';
            setState({
                status: 'error',
                error: errorMessage,
                transactionId: null,
            });
            return { success: false, error: errorMessage };
        }
        finally {
            isProcessingRef.current = false;
        }
    }, [stripeManager]);
    const reset = (0, react_1.useCallback)(() => {
        setState({
            status: 'idle',
            error: null,
            transactionId: null,
        });
        isProcessingRef.current = false;
    }, []);
    return {
        ...state,
        processPayment,
        processCartCheckout,
        reset,
    };
}
//# sourceMappingURL=useStripeCheckout.js.map