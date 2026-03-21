"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useRefundVerification = useRefundVerification;
const react_1 = require("react");
const wallet_adapter_react_1 = require("@solana/wallet-adapter-react");
const context_1 = require("../context");
const errorHandling_1 = require("../utils/errorHandling");
/**
 * Hook for refund verification flow
 *
 * Handles:
 * - Fetching x402 refund quote
 * - Building and signing refund transaction
 * - Submitting refund payment proof
 * - Managing refund payment state
 *
 * @example
 * ```tsx
 * const { fetchRefundQuote, processRefund, state, requirement } = useRefundVerification();
 *
 * // 1. Fetch refund quote
 * const refundRequirement = await fetchRefundQuote('refund_x89201c3d5e7f9a2b4567890123456789');
 *
 * // 2. Process refund payment
 * await processRefund('refund_x89201c3d5e7f9a2b4567890123456789');
 * ```
 */
function useRefundVerification() {
    const { x402Manager, walletManager } = (0, context_1.useCedrosContext)();
    const { publicKey, signTransaction } = (0, wallet_adapter_react_1.useWallet)();
    const [state, setState] = (0, react_1.useState)({
        status: 'idle',
        error: null,
        transactionId: null,
    });
    const [requirement, setRequirement] = (0, react_1.useState)(null);
    const [settlement, setSettlement] = (0, react_1.useState)(null);
    /**
     * Fetch x402 quote for a refund
     * @param refundId - Full refund ID including 'refund_' prefix (e.g., 'refund_x89201...')
     */
    const fetchRefundQuote = (0, react_1.useCallback)(async (refundId) => {
        try {
            setState((prev) => ({ ...prev, status: 'loading' }));
            const fetchedRequirement = await x402Manager.requestQuote({ resource: refundId });
            if (!x402Manager.validateRequirement(fetchedRequirement)) {
                throw new Error('Invalid refund requirement received from server');
            }
            setRequirement(fetchedRequirement);
            setState((prev) => ({ ...prev, status: 'idle' }));
            return fetchedRequirement;
        }
        catch (error) {
            const errorMessage = (0, errorHandling_1.formatError)(error, 'Failed to fetch refund requirement');
            setState({
                status: 'error',
                error: errorMessage,
                transactionId: null,
            });
            throw error;
        }
    }, [x402Manager]);
    /**
     * Process a refund payment (regular flow - wallet pays to receive refund)
     * @param refundId - Full refund ID including 'refund_' prefix
     * @param couponCode - Optional coupon code
     */
    const processRefund = (0, react_1.useCallback)(async (refundId, couponCode) => {
        if (!publicKey || !signTransaction) {
            throw new Error('Wallet not connected');
        }
        try {
            setState({
                status: 'loading',
                error: null,
                transactionId: null,
            });
            // Always fetch fresh quote (no stale requirements)
            const currentRequirement = await x402Manager.requestQuote({ resource: refundId, couponCode });
            if (!x402Manager.validateRequirement(currentRequirement)) {
                throw new Error('Invalid refund requirement received');
            }
            setRequirement(currentRequirement);
            // Build, sign, and submit transaction
            const transaction = await walletManager.buildTransaction({
                requirement: currentRequirement,
                payerPublicKey: publicKey,
            });
            const signedTx = await walletManager.signTransaction({
                transaction,
                signTransaction,
            });
            const paymentPayload = walletManager.buildPaymentPayload({
                requirement: currentRequirement,
                signedTx,
                payerPublicKey: publicKey,
            });
            // Submit with resourceType: 'refund'
            const result = await x402Manager.submitPayment({
                resource: refundId,
                payload: paymentPayload,
                couponCode,
                metadata: undefined, // no metadata for refunds
                resourceType: 'refund',
            });
            if (result.settlement) {
                setSettlement(result.settlement);
            }
            setState({
                status: 'success',
                error: null,
                transactionId: result.transactionId || signedTx.signature,
            });
            return result;
        }
        catch (error) {
            const errorMessage = (0, errorHandling_1.formatError)(error, 'Refund payment failed');
            setState({
                status: 'error',
                error: errorMessage,
                transactionId: null,
            });
            throw error;
        }
    }, [publicKey, signTransaction, x402Manager, walletManager]);
    /**
     * Process a gasless refund payment (backend pays gas fees)
     * @param refundId - Full refund ID including 'refund_' prefix
     */
    const processGaslessRefund = (0, react_1.useCallback)(async (refundId) => {
        if (!publicKey || !signTransaction) {
            throw new Error('Wallet not connected');
        }
        try {
            setState({
                status: 'loading',
                error: null,
                transactionId: null,
            });
            // Fetch fresh quote
            const currentRequirement = await x402Manager.requestQuote({ resource: refundId });
            if (!x402Manager.validateRequirement(currentRequirement)) {
                throw new Error('Invalid refund requirement received');
            }
            setRequirement(currentRequirement);
            // Request backend to build transaction (gasless flow)
            const { transaction: txBase64 } = await x402Manager.buildGaslessTransaction({
                resourceId: refundId,
                userWallet: publicKey.toString(),
                feePayer: currentRequirement.extra.feePayer,
            });
            const transaction = walletManager.deserializeTransaction(txBase64);
            // User signs only as transfer authority (not fee payer)
            const partialTx = await walletManager.partiallySignTransaction({
                transaction,
                signTransaction,
            });
            // Submit with resourceType: 'refund'
            const result = await x402Manager.submitGaslessTransaction({
                resource: refundId,
                partialTx,
                couponCode: undefined, // no couponCode
                metadata: undefined, // no metadata
                resourceType: 'refund',
                requirement: currentRequirement,
            });
            if (result.settlement) {
                setSettlement(result.settlement);
            }
            setState({
                status: 'success',
                error: null,
                transactionId: result.transactionId || 'gasless-refund-tx',
            });
            return result;
        }
        catch (error) {
            const errorMessage = (0, errorHandling_1.formatError)(error, 'Gasless refund payment failed');
            setState({
                status: 'error',
                error: errorMessage,
                transactionId: null,
            });
            throw error;
        }
    }, [publicKey, signTransaction, x402Manager, walletManager]);
    /**
     * Reset state to idle
     */
    const reset = (0, react_1.useCallback)(() => {
        setState({
            status: 'idle',
            error: null,
            transactionId: null,
        });
        setRequirement(null);
        setSettlement(null);
    }, []);
    return {
        state,
        requirement,
        settlement,
        fetchRefundQuote,
        processRefund,
        processGaslessRefund,
        reset,
    };
}
//# sourceMappingURL=useRefundVerification.js.map