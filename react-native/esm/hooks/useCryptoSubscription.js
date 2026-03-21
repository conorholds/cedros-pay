import { useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useCedrosContext } from '../context';
import { formatError } from '../utils/errorHandling';
/**
 * Hook for x402 crypto subscription payments
 *
 * Handles:
 * - Checking subscription status
 * - Requesting subscription quotes
 * - Processing crypto subscription payments
 *
 * @example
 * ```tsx
 * function CryptoSubscribePage() {
 *   const { checkStatus, processPayment, status, subscriptionStatus, expiresAt } = useCryptoSubscription();
 *
 *   // Check subscription on mount
 *   useEffect(() => {
 *     if (publicKey) {
 *       checkStatus({ resource: 'plan-pro', userId: publicKey.toString() });
 *     }
 *   }, [publicKey]);
 *
 *   // Process subscription payment
 *   const handleSubscribe = async () => {
 *     await processPayment('plan-pro', 'monthly');
 *   };
 * }
 * ```
 */
export function useCryptoSubscription() {
    const { subscriptionManager, x402Manager, walletManager } = useCedrosContext();
    const { publicKey, signTransaction } = useWallet();
    const [state, setState] = useState({
        status: 'idle',
        error: null,
        sessionId: null,
        subscriptionStatus: null,
        expiresAt: null,
    });
    const [quote, setQuote] = useState(null);
    /**
     * Validate wallet connection
     */
    const validateWalletConnection = useCallback(() => {
        if (!publicKey) {
            const error = 'Wallet not connected';
            setState((prev) => ({ ...prev, status: 'error', error }));
            return { valid: false, error };
        }
        if (!signTransaction) {
            const error = 'Wallet does not support signing';
            setState((prev) => ({ ...prev, status: 'error', error }));
            return { valid: false, error };
        }
        return { valid: true };
    }, [publicKey, signTransaction]);
    /**
     * Check subscription status for the connected wallet
     */
    const checkStatus = useCallback(async (resource) => {
        if (!publicKey) {
            setState((prev) => ({
                ...prev,
                status: 'error',
                error: 'Wallet not connected',
            }));
            return null;
        }
        setState((prev) => ({
            ...prev,
            status: 'checking',
            error: null,
        }));
        try {
            const response = await subscriptionManager.checkSubscriptionStatus({
                resource,
                userId: publicKey.toString(),
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
            const errorMessage = formatError(error, 'Failed to check subscription status');
            setState((prev) => ({
                ...prev,
                status: 'error',
                error: errorMessage,
            }));
            return null;
        }
    }, [publicKey, subscriptionManager]);
    /**
     * Request a subscription quote
     */
    const requestQuote = useCallback(async (resource, interval, options) => {
        setState((prev) => ({
            ...prev,
            status: 'loading',
            error: null,
        }));
        try {
            const fetchedQuote = await subscriptionManager.requestSubscriptionQuote(resource, interval, options);
            setQuote(fetchedQuote);
            setState((prev) => ({
                ...prev,
                status: 'idle',
            }));
            return fetchedQuote;
        }
        catch (error) {
            const errorMessage = formatError(error, 'Failed to get subscription quote');
            setState((prev) => ({
                ...prev,
                status: 'error',
                error: errorMessage,
            }));
            return null;
        }
    }, [subscriptionManager]);
    /**
     * Process a crypto subscription payment
     */
    const processPayment = useCallback(async (resource, interval, options) => {
        const validation = validateWalletConnection();
        if (!validation.valid) {
            return { success: false, error: validation.error };
        }
        setState((prev) => ({
            ...prev,
            status: 'loading',
            error: null,
        }));
        try {
            // Get subscription quote
            const subscriptionQuote = await subscriptionManager.requestSubscriptionQuote(resource, interval, options);
            setQuote(subscriptionQuote);
            const requirement = subscriptionQuote.requirement;
            // Validate the requirement
            if (!x402Manager.validateRequirement(requirement)) {
                throw new Error('Invalid subscription quote received from server');
            }
            // Check if gasless mode
            const isGasless = !!requirement.extra?.feePayer;
            let result;
            if (isGasless) {
                // Gasless flow: Backend builds and co-signs transaction
                const { transaction: txBase64, blockhash } = await x402Manager.buildGaslessTransaction({
                    resourceId: resource,
                    userWallet: publicKey.toString(),
                    feePayer: requirement.extra.feePayer,
                    couponCode: options?.couponCode,
                });
                const transaction = walletManager.deserializeTransaction(txBase64);
                const partialTx = await walletManager.partiallySignTransaction({
                    transaction,
                    signTransaction: signTransaction,
                    blockhash,
                });
                result = await x402Manager.submitGaslessTransaction({
                    resource,
                    partialTx,
                    couponCode: options?.couponCode,
                    resourceType: 'regular',
                    requirement,
                });
            }
            else {
                // Regular flow: user pays all fees
                const transaction = await walletManager.buildTransaction({
                    requirement,
                    payerPublicKey: publicKey,
                });
                const signedTx = await walletManager.signTransaction({
                    transaction,
                    signTransaction: signTransaction,
                });
                const paymentPayload = walletManager.buildPaymentPayload({
                    requirement,
                    signedTx,
                    payerPublicKey: publicKey,
                });
                result = await x402Manager.submitPayment({
                    resource,
                    payload: paymentPayload,
                    couponCode: options?.couponCode,
                    resourceType: 'regular',
                });
            }
            if (result.success) {
                // After successful payment, check updated subscription status
                const statusResponse = await subscriptionManager.checkSubscriptionStatus({
                    resource,
                    userId: publicKey.toString(),
                });
                setState({
                    status: 'success',
                    error: null,
                    sessionId: result.transactionId || null,
                    subscriptionStatus: statusResponse.status,
                    expiresAt: statusResponse.expiresAt || statusResponse.currentPeriodEnd || null,
                });
            }
            else {
                setState((prev) => ({
                    ...prev,
                    status: 'error',
                    error: result.error || 'Subscription payment failed',
                }));
            }
            return result;
        }
        catch (error) {
            const errorMessage = formatError(error, 'Subscription payment failed');
            setState((prev) => ({
                ...prev,
                status: 'error',
                error: errorMessage,
            }));
            return { success: false, error: errorMessage };
        }
    }, [
        validateWalletConnection,
        subscriptionManager,
        x402Manager,
        walletManager,
        publicKey,
        signTransaction,
    ]);
    /**
     * Reset the subscription state
     */
    const reset = useCallback(() => {
        setState({
            status: 'idle',
            error: null,
            sessionId: null,
            subscriptionStatus: null,
            expiresAt: null,
        });
        setQuote(null);
    }, []);
    return {
        ...state,
        quote,
        checkStatus,
        requestQuote,
        processPayment,
        reset,
    };
}
//# sourceMappingURL=useCryptoSubscription.js.map