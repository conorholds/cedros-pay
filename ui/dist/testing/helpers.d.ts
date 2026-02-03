import { vi } from 'vitest';
import { PaymentResult, X402Requirement, SettlementResponse } from '../types';
/**
 * Simulates a successful Stripe payment
 *
 * @param sessionId - Mock session ID
 * @returns Mock payment result
 *
 * @example
 * ```typescript
 * const result = mockPaymentSuccess('cs_test_123');
 * expect(result.success).toBe(true);
 * ```
 */
export declare function mockPaymentSuccess(sessionId?: string): PaymentResult;
/**
 * Simulates a failed Stripe payment
 *
 * @param error - Error message
 * @returns Mock payment result
 *
 * @example
 * ```typescript
 * const result = mockPaymentFailure('Card declined');
 * expect(result.success).toBe(false);
 * expect(result.error).toBe('Card declined');
 * ```
 */
export declare function mockPaymentFailure(error?: string): PaymentResult;
/**
 * Creates a mock x402 requirement (payment quote)
 *
 * @param options - Quote options
 * @returns Mock x402 requirement
 *
 * @example
 * ```typescript
 * const quote = mockX402Quote({
 *   maxAmountRequired: '1000000', // 1 USDC
 *   payTo: 'recipientWallet123',
 * });
 * ```
 */
export declare function mockX402Quote(options?: {
    scheme?: string;
    network?: string;
    maxAmountRequired?: string;
    resource?: string;
    description?: string;
    mimeType?: string;
    payTo?: string;
    maxTimeoutSeconds?: number;
    asset?: string;
    extra?: {
        recipientTokenAccount?: string;
        decimals?: number;
        tokenSymbol?: string;
        memo?: string;
        feePayer?: string;
    };
}): X402Requirement;
/**
 * Creates a mock settlement response (payment verification)
 *
 * @param options - Settlement options
 * @returns Mock settlement response
 *
 * @example
 * ```typescript
 * const settlement = mockSettlement({
 *   txHash: 'tx123',
 *   success: true,
 * });
 * ```
 */
export declare function mockSettlement(options?: {
    success?: boolean;
    error?: string | null;
    txHash?: string | null;
    networkId?: string | null;
    metadata?: Record<string, string | undefined>;
}): SettlementResponse;
/**
 * Wait for next tick (useful for testing async operations)
 *
 * @example
 * ```typescript
 * await waitForNextTick();
 * expect(mockFn).toHaveBeenCalled();
 * ```
 */
export declare function waitForNextTick(): Promise<void>;
/**
 * Wait for a specific amount of time
 *
 * @param ms - Milliseconds to wait
 *
 * @example
 * ```typescript
 * await wait(1000); // Wait 1 second
 * ```
 */
export declare function wait(ms: number): Promise<void>;
/**
 * Creates a mock backend response for /paywall/v1/quote
 *
 * @param resourceId - Resource ID
 * @param options - Quote options
 * @returns Mock fetch response
 *
 * @example
 * ```typescript
 * global.fetch = vi.fn().mockResolvedValue(
 *   mockQuoteResponse('premium-article')
 * );
 * ```
 */
export declare function mockQuoteResponse(resourceId: string, options?: {
    maxAmountRequired?: string;
    asset?: string;
    payTo?: string;
}): {
    ok: boolean;
    status: number;
    json: () => Promise<{
        x402Version: number;
        error: string;
        accepts: {
            scheme: string;
            network: string;
            maxAmountRequired: string;
            resource: string;
            description: string;
            mimeType: string;
            payTo: string;
            maxTimeoutSeconds: number;
            asset: string;
            extra: {
                recipientTokenAccount: string;
                decimals: number;
                tokenSymbol: string;
                memo: string;
            };
        }[];
    }>;
    headers: Map<string, string>;
};
/**
 * Creates a mock backend response for /paywall/v1/verify
 *
 * @param success - Whether verification succeeded
 * @returns Mock fetch response
 *
 * @example
 * ```typescript
 * global.fetch = vi.fn().mockResolvedValue(
 *   mockVerifyResponse(true)
 * );
 * ```
 */
export declare function mockVerifyResponse(success?: boolean): {
    ok: boolean;
    status: number;
    json: () => Promise<import("../types").v1.SettlementResponse>;
    headers: Map<string, string>;
};
/**
 * Creates a mock backend response for /paywall/v1/stripe-session
 *
 * @param sessionId - Stripe session ID
 * @returns Mock fetch response
 *
 * @example
 * ```typescript
 * global.fetch = vi.fn().mockResolvedValue(
 *   mockStripeSessionResponse('cs_test_123')
 * );
 * ```
 */
export declare function mockStripeSessionResponse(sessionId?: string): {
    ok: boolean;
    status: number;
    json: () => Promise<{
        sessionId: string;
        url: string;
    }>;
};
/**
 * Simulates wallet connection flow
 *
 * @returns Mock wallet connect result
 *
 * @example
 * ```typescript
 * const mockConnect = vi.fn().mockResolvedValue(mockWalletConnect());
 * ```
 */
export declare function mockWalletConnect(publicKey?: string): {
    publicKey: {
        toBase58: () => string;
        toString: () => string;
    };
};
/**
 * Simulates transaction signing
 *
 * @returns Mock signed transaction
 *
 * @example
 * ```typescript
 * const mockSign = vi.fn().mockResolvedValue(mockSignTransaction());
 * ```
 */
export declare function mockSignTransaction(): {
    signature: Uint8Array<ArrayBuffer>;
    serialize: () => Uint8Array<ArrayBuffer>;
};
/**
 * Creates a spy function that tracks calls
 *
 * @param implementation - Optional implementation
 * @returns Spy function
 *
 * @example
 * ```typescript
 * const onSuccess = createSpy((result) => console.log(result));
 * // Use in your test
 * expect(onSuccess).toHaveBeenCalledWith(expectedResult);
 * ```
 */
export declare function createSpy<T extends (...args: never[]) => unknown>(implementation?: T): ReturnType<typeof vi.fn>;
/**
 * Flushes all pending promises (useful for testing)
 *
 * @example
 * ```typescript
 * await flushPromises();
 * expect(asyncOperation).toHaveCompleted();
 * ```
 */
export declare function flushPromises(): Promise<void>;
//# sourceMappingURL=helpers.d.ts.map