"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useRefundVerification = useRefundVerification;
const react_1 = require("react");
const context_1 = require("../context");
const errorHandling_1 = require("../utils/errorHandling");
/**
 * Hook for the x402 (crypto) refund request flow.
 *
 * Unlike a payment, a refund needs NO wallet signing: the buyer records a request and
 * the operator's server signs and broadcasts the on-chain payout after an admin approves
 * it. This hook therefore only:
 *  - submits a refund request (POST /paywall/v1/refunds/request), and
 *  - polls its status (GET /paywall/v1/refunds/{refundId}).
 *
 * @example
 * ```tsx
 * const { requestRefund, refreshStatus, refund, state } = useRefundVerification();
 *
 * // 1. Request a refund to a wallet you control.
 * const created = await requestRefund({
 *   originalPurchaseId: '5jX8…',           // the on-chain purchase signature
 *   recipientWallet: '9WzDXw…',            // where the tokens should be sent back
 * });
 *
 * // 2. Later, poll its status.
 * await refreshStatus(created.refundId);   // refund.status: pending → submitted → succeeded
 * ```
 */
function useRefundVerification() {
    const { x402Manager } = (0, context_1.useCedrosContext)();
    const [state, setState] = (0, react_1.useState)({
        status: 'idle',
        error: null,
        transactionId: null,
    });
    const [refund, setRefund] = (0, react_1.useState)(null);
    const isProcessingRef = (0, react_1.useRef)(false);
    /** Submit a refund request. Resolves with the created (pending) refund. */
    const requestRefund = (0, react_1.useCallback)(async (input) => {
        if (isProcessingRef.current) {
            throw new Error('Refund request already in progress');
        }
        isProcessingRef.current = true;
        setState({ status: 'loading', error: null, transactionId: null });
        try {
            const result = await x402Manager.requestRefund(input);
            setRefund(result);
            setState({ status: 'success', error: null, transactionId: result.signature ?? null });
            return result;
        }
        catch (error) {
            setState({
                status: 'error',
                error: (0, errorHandling_1.formatError)(error, 'Failed to request refund'),
                transactionId: null,
            });
            throw error;
        }
        finally {
            isProcessingRef.current = false;
        }
    }, [x402Manager]);
    /** Fetch the latest status of a refund by id (for polling). */
    const refreshStatus = (0, react_1.useCallback)(async (refundId) => {
        const result = await x402Manager.getRefundStatus(refundId);
        setRefund(result);
        return result;
    }, [x402Manager]);
    const reset = (0, react_1.useCallback)(() => {
        setState({ status: 'idle', error: null, transactionId: null });
        setRefund(null);
    }, []);
    return { state, refund, requestRefund, refreshStatus, reset };
}
//# sourceMappingURL=useRefundVerification.js.map