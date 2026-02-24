/**
 * Test helper functions for simulating payment flows
 *
 * These helpers make it easy to simulate various payment scenarios
 * and test how your application responds.
 */

import { vi } from 'vitest';
import type { PaymentResult, X402Requirement, SettlementResponse } from '../types';

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
export function mockPaymentSuccess(sessionId: string = 'cs_test_mock123'): PaymentResult {
  return {
    success: true,
    transactionId: sessionId,
    error: undefined,
  };
}

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
export function mockPaymentFailure(error: string = 'Payment failed'): PaymentResult {
  return {
    success: false,
    transactionId: undefined,
    error,
  };
}

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
export function mockX402Quote(options: {
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
} = {}): X402Requirement {
  const {
    scheme = 'solana-spl-transfer',
    network = 'mainnet-beta',
    maxAmountRequired = '1000000',
    resource = 'test-resource',
    description = 'Test Payment',
    mimeType = 'application/json',
    payTo = 'mockRecipient123',
    maxTimeoutSeconds = 300,
    asset = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC mint
    extra = {
      recipientTokenAccount: 'mockTokenAccount123',
      decimals: 6,
      tokenSymbol: 'USDC',
      memo: 'test-payment',
    },
  } = options;

  return {
    scheme,
    network,
    maxAmountRequired,
    resource,
    description,
    mimeType,
    payTo,
    maxTimeoutSeconds,
    asset,
    extra,
  };
}

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
export function mockSettlement(options: {
  success?: boolean;
  error?: string | null;
  txHash?: string | null;
  networkId?: string | null;
  metadata?: Record<string, string | undefined>;
} = {}): SettlementResponse {
  const {
    success = true,
    error = null,
    txHash = 'mockSignature123',
    networkId = 'mainnet-beta',
    metadata,
  } = options;

  return {
    success,
    error,
    txHash,
    networkId,
    metadata,
  };
}

/**
 * Wait for next tick (useful for testing async operations)
 *
 * @example
 * ```typescript
 * await waitForNextTick();
 * expect(mockFn).toHaveBeenCalled();
 * ```
 */
export async function waitForNextTick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

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
export async function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
export function mockQuoteResponse(
  resourceId: string,
  options: {
    maxAmountRequired?: string;
    asset?: string;
    payTo?: string;
  } = {}
) {
  const {
    maxAmountRequired = '1000000',
    asset = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC mint
    payTo = 'mockRecipient123',
  } = options;

  return {
    ok: false,
    status: 402,
    json: async () => ({
      x402Version: 0,
      error: 'payment required',
      accepts: [
        {
          scheme: 'solana-spl-transfer',
          network: 'mainnet-beta',
          maxAmountRequired,
          resource: resourceId,
          description: 'Payment required',
          mimeType: 'application/json',
          payTo,
          maxTimeoutSeconds: 300,
          asset,
          extra: {
            recipientTokenAccount: 'mockTokenAccount123',
            decimals: 6,
            tokenSymbol: 'USDC',
            memo: `${resourceId}:${Date.now()}`,
          },
        },
      ],
    }),
    headers: new Map([
      ['content-type', 'application/json'],
    ]),
  };
}

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
export function mockVerifyResponse(success: boolean = true) {
  const settlement: SettlementResponse = success
    ? {
        success: true,
        error: null,
        txHash: 'mockSignature123',
        networkId: 'mainnet-beta',
      }
    : {
        success: false,
        error: 'Payment verification failed',
        txHash: null,
        networkId: null,
      };

  return {
    ok: success,
    status: success ? 200 : 402,
    json: async () => settlement,
    headers: new Map([
      ['x-payment-response', JSON.stringify(settlement)],
    ]),
  };
}

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
export function mockStripeSessionResponse(sessionId: string = 'cs_test_mock123') {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      sessionId,
      url: `https://checkout.stripe.com/pay/${sessionId}`,
    }),
  };
}

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
export function mockWalletConnect(publicKey: string = 'mockWallet123') {
  return {
    publicKey: {
      toBase58: () => publicKey,
      toString: () => publicKey,
    },
  };
}

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
export function mockSignTransaction() {
  return {
    signature: new Uint8Array(64).fill(1),
    serialize: () => new Uint8Array([1, 2, 3, 4, 5]),
  };
}

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
export function createSpy<T extends (...args: never[]) => unknown>(
  implementation?: T
): ReturnType<typeof vi.fn> {
  return vi.fn(implementation);
}

/**
 * Flushes all pending promises (useful for testing)
 *
 * @example
 * ```typescript
 * await flushPromises();
 * expect(asyncOperation).toHaveCompleted();
 * ```
 */
export async function flushPromises(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}
