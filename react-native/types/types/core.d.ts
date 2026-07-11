import type { FulfillmentType } from './storePolicy';
/**
 * Core payment contract types shared by type modules.
 *
 * This module intentionally has no imports from `types/index.ts`, so leaf type
 * modules can depend on these contracts without creating barrel cycles.
 */
export interface CartItem {
    resource: string;
    quantity?: number;
    metadata?: Record<string, string>;
    fulfillmentType?: FulfillmentType;
}
export interface X402Requirement {
    scheme: string;
    network: string;
    maxAmountRequired: string;
    resource: string;
    description: string;
    mimeType: string;
    payTo: string;
    maxTimeoutSeconds: number;
    asset: string;
    extra?: {
        recipientTokenAccount?: string;
        decimals?: number;
        tokenSymbol?: string;
        memo?: string;
        feePayer?: string;
    };
}
export interface SettlementResponse {
    success: boolean;
    error: string | null;
    txHash: string | null;
    networkId: string | null;
    metadata?: {
        coupon_codes?: string;
        original_amount?: string;
        discounted_amount?: string;
        [key: string]: string | undefined;
    };
}
export interface PaymentResult {
    success: boolean;
    transactionId?: string;
    error?: string;
    settlement?: SettlementResponse;
}
/** Input for requesting an x402 (crypto) refund. The buyer never signs — the server
 * sends the refunded tokens to `recipientWallet` after an admin approves it. */
export interface RefundRequestInput {
    /** The original x402 purchase's on-chain signature. */
    originalPurchaseId: string;
    /** The Solana wallet (owner) that should receive the refunded tokens. */
    recipientWallet: string;
    /** Optional human-readable reason. */
    reason?: string;
}
/** Status of an x402 refund, as returned by POST /paywall/v1/refunds/request and
 * GET /paywall/v1/refunds/{refundId}. Amount is integer cents (never a float). */
export interface RefundStatus {
    refundId: string;
    /** `pending` (awaiting admin), `submitted` (broadcast on-chain, confirming),
     * `succeeded` (paid out), or `denied` (rejected by an admin). */
    status: 'pending' | 'submitted' | 'succeeded' | 'denied';
    originalPurchaseId: string;
    recipientWallet: string;
    amountCents: number;
    currency: string;
    reason?: string | null;
    createdAt: string;
    /** Settlement time, null until processed. */
    processedAt?: string | null;
    /** On-chain payout signature, null until broadcast. */
    signature?: string | null;
    /** Present on the create response. */
    message?: string;
}
//# sourceMappingURL=core.d.ts.map