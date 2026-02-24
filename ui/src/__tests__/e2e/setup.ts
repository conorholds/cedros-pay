/**
 * E2E Test Setup and Utilities
 *
 * This file provides infrastructure for end-to-end tests that verify:
 * - Full component rendering with real providers
 * - Complete payment flows (Stripe + x402)
 * - Manager lifecycle and caching
 * - Multi-provider scenarios
 *
 * Unlike unit tests, E2E tests use:
 * - Real DOM (jsdom)
 * - Real React Context
 * - Real manager instances (with mocked network calls)
 * - Real wallet adapters (mocked)
 */

import { vi } from 'vitest';
import type { Stripe } from '@stripe/stripe-js';
import type { Connection, Transaction, VersionedTransaction } from '@solana/web3.js';
import { clearDeduplicationCache } from '../../utils/requestDeduplication';

/**
 * Mock Stripe instance for E2E tests
 */
export function createMockStripe(): Stripe {
  return {
    redirectToCheckout: vi.fn().mockResolvedValue({ error: null }),
  } as unknown as Stripe;
}

/**
 * Mock Stripe loadStripe function
 */
export function mockLoadStripe() {
  const mockStripe = createMockStripe();

  vi.mock('@stripe/stripe-js', () => ({
    loadStripe: vi.fn().mockResolvedValue(mockStripe),
  }));

  return mockStripe;
}

/**
 * Mock fetch for backend API calls
 *
 * Simulates real backend responses for:
 * - Stripe session creation
 * - x402 quote requests
 * - x402 payment verification
 * - Health checks
 */
export function mockBackendAPIs() {
  const originalFetch = global.fetch;

  global.fetch = vi.fn((url: string | URL | Request, options?: RequestInit) => {
    const urlString = url.toString();

    // Health check (both /health and /cedros-health)
    if (urlString.includes('/health') || urlString.includes('cedros-health')) {
      return Promise.resolve(new Response(JSON.stringify({ status: 'ok' }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Prefix': '', // Empty prefix for tests
        },
      }));
    }

    // Stripe session creation
    if (urlString.includes('/stripe-session')) {
      return Promise.resolve(new Response(JSON.stringify({
        sessionId: 'sess_test_123',
        url: 'https://checkout.stripe.com/test',
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));
    }

    // Stripe cart checkout
    if (urlString.includes('/cart/checkout')) {
      return Promise.resolve(new Response(JSON.stringify({
        sessionId: 'sess_cart_123',
        url: 'https://checkout.stripe.com/cart',
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));
    }

    // x402 quote (HTTP 402)
    if (urlString.match(/\/paywall\/v1\/[^/]+$/) && options?.method === 'GET') {
      const x402Response = {
        x402Version: 0,
        error: 'payment required',
        accepts: [{
          scheme: 'solana-spl-transfer',
          network: 'devnet',
          maxAmountRequired: '1000000',
          resource: 'test-resource',
          description: 'Test payment',
          mimeType: 'application/json',
          payTo: 'recipient-wallet-address',
          maxTimeoutSeconds: 300,
          asset: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
          extra: {
            recipientTokenAccount: 'recipient-token-account',
            decimals: 6,
            tokenSymbol: 'USDC',
          },
        }],
      };

      return Promise.resolve(new Response(JSON.stringify(x402Response), {
        status: 402,
        headers: {
          'Content-Type': 'application/json',
          'X-402-Version': '0',
        },
      }));
    }

    // x402 payment verification
    if (urlString.includes('/verify') && options?.method === 'POST') {
      const settlementResponse = {
        success: true,
        error: null,
        txHash: '5h4VdCqPK2aBCbYdKZYHPMqGNGqMJjPgKvQ2pLjxNqxK',
        networkId: 'devnet',
        metadata: {
          coupon_codes: '',
          original_amount: '1.00',
          discounted_amount: '1.00',
        },
      };

      return Promise.resolve(new Response(JSON.stringify({ data: 'test' }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-PAYMENT-RESPONSE': btoa(JSON.stringify(settlementResponse)),
        },
      }));
    }

    // Default fallback
    return Promise.reject(new Error(`Unmocked URL: ${urlString}`));
  }) as typeof fetch;

  return () => {
    global.fetch = originalFetch;
  };
}

/**
 * Mock Solana Connection
 */
export function createMockConnection(): Connection {
  return {
    getLatestBlockhash: vi.fn().mockResolvedValue({
      blockhash: 'mock-blockhash',
      lastValidBlockHeight: 1000000,
    }),
    sendRawTransaction: vi.fn().mockResolvedValue('mock-signature'),
    confirmTransaction: vi.fn().mockResolvedValue({ value: { err: null } }),
    getBalance: vi.fn().mockResolvedValue(1000000000), // 1 SOL
  } as unknown as Connection;
}

/**
 * Mock wallet adapter for testing
 */
export function createMockWalletAdapter(name: string = 'Phantom') {
  return {
    name,
    url: 'https://phantom.app',
    icon: 'data:image/svg+xml;base64,mock',
    readyState: 'Installed',
    publicKey: {
      toBase58: () => 'mock-wallet-public-key',
      toString: () => 'mock-wallet-public-key',
    },
    connected: false,
    connecting: false,
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    signTransaction: vi.fn().mockImplementation((tx: Transaction | VersionedTransaction) => Promise.resolve(tx)),
    signAllTransactions: vi.fn().mockImplementation((txs: (Transaction | VersionedTransaction)[]) => Promise.resolve(txs)),
  };
}

/**
 * Wait for async state updates in React
 */
export function waitForAsync(ms: number = 100): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Clean up after E2E tests
 */
export function cleanupE2E() {
  vi.clearAllMocks();
  vi.restoreAllMocks();

  // Clear deduplication cache to prevent test pollution
  clearDeduplicationCache();
}
