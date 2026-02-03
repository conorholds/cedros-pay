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
export declare function useRefundVerification(): {
    state: import("../types").v1.PaymentState;
    requirement: import("../types").v1.X402Requirement | null;
    settlement: import("../types").v1.SettlementResponse | null;
    fetchRefundQuote: (refundId: string) => Promise<import("../types").v1.X402Requirement>;
    processRefund: (refundId: string, couponCode?: string) => Promise<import("../types").v1.PaymentResult>;
    processGaslessRefund: (refundId: string) => Promise<import("../types").v1.PaymentResult>;
    reset: () => void;
};
//# sourceMappingURL=useRefundVerification.d.ts.map