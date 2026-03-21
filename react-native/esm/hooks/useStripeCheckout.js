import { useState, useCallback, useRef } from 'react';
import { useCedrosContext } from '../context';
import { normalizeCartItems } from '../utils/cartHelpers';
/**
 * Hook for Stripe checkout flow
 *
 * Handles:
 * - Creating Stripe session
 * - Redirecting to checkout
 * - Managing payment state
 */
export function useStripeCheckout() {
    const { stripeManager } = useCedrosContext();
    const [state, setState] = useState({
        status: 'idle',
        error: null,
        transactionId: null,
    });
    // Track in-flight payment requests to prevent concurrent submissions
    const isProcessingRef = useRef(false);
    const processPayment = useCallback(async (resource, successUrl, cancelUrl, metadata, customerEmail, couponCode) => {
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
    const processCartCheckout = useCallback(async (items, successUrl, cancelUrl, metadata, customerEmail, couponCode) => {
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
        const normalizedItems = normalizeCartItems(items);
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
    const reset = useCallback(() => {
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