/**
 * Hook for x402 crypto payment flow
 *
 * Handles:
 * - Fetching x402 quote
 * - Building and signing transaction
 * - Submitting payment proof
 * - Managing payment state
 */
export declare function useX402Payment(): {
    requirement: import("../types").v1.X402Requirement | null;
    settlement: import("../types").v1.SettlementResponse | null;
    fetchQuote: (resource: string) => Promise<import("../types").v1.X402Requirement>;
    processPayment: (resource: string, couponCode?: string, metadata?: Record<string, string>) => Promise<import("../types").v1.PaymentResult>;
    processCartPayment: (items: Array<{
        resource: string;
        quantity?: number;
        variantId?: string;
    }>, metadata?: Record<string, string>, couponCode?: string) => Promise<import("../types").v1.PaymentResult>;
    reset: () => void;
    status: import("../types").v1.PaymentStatus;
    error: string | null;
    transactionId: string | null;
};
//# sourceMappingURL=useX402Payment.d.ts.map