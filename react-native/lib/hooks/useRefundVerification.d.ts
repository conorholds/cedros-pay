import type { RefundRequestInput } from '../types';
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
export declare function useRefundVerification(): {
    state: import("../types").v1.PaymentState;
    refund: import("../types/core").RefundStatus | null;
    requestRefund: (input: RefundRequestInput) => Promise<import("../types/core").RefundStatus>;
    refreshStatus: (refundId: string) => Promise<import("../types/core").RefundStatus>;
    reset: () => void;
};
//# sourceMappingURL=useRefundVerification.d.ts.map