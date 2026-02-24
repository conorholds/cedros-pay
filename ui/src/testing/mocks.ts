/**
 * Mock implementations for Solana and Stripe dependencies
 *
 * These mocks can be used with vi.mock() in Vitest or jest.mock() in Jest
 * to avoid needing real Solana/Stripe connections in tests.
 */

import { vi } from 'vitest';

/**
 * Mock Solana web3.js with common methods
 *
 * @example
 * ```typescript
 * vi.mock('@solana/web3.js', () => mockSolanaWeb3);
 * ```
 */
export const mockSolanaWeb3 = {
  clusterApiUrl: vi.fn(() => 'https://api.devnet.solana.com'),
  Connection: class MockConnection {
    async getLatestBlockhash() {
      return {
        blockhash: 'mockedBlockhash123',
        lastValidBlockHeight: 1000000,
      };
    }

    async getBalance() {
      return 1000000000; // 1 SOL
    }

    async getSignatureStatus() {
      return { value: { confirmationStatus: 'confirmed' } };
    }

    async getAccountInfo() {
      return {
        data: new Uint8Array(),
        executable: false,
        lamports: 1000000,
        owner: new Uint8Array(32),
        rentEpoch: 0,
      };
    }

    async sendRawTransaction() {
      return 'mockedSignature123';
    }

    async confirmTransaction() {
      return { value: { err: null } };
    }
  },
  SystemProgram: {
    transfer: vi.fn(() => ({
      keys: [],
      programId: {},
      data: new Uint8Array(),
    })),
  },
  Transaction: class MockTransaction {
    recentBlockhash?: string;
    feePayer?: unknown;
    instructions: unknown[] = [];

    add(instruction: unknown) {
      this.instructions.push(instruction);
      return this;
    }

    serialize() {
      return new Uint8Array([1, 2, 3, 4, 5]);
    }
  },
  LAMPORTS_PER_SOL: 1_000_000_000,
  PublicKey: class MockPublicKey {
    constructor(public value: string | Uint8Array) {}

    toString() {
      return typeof this.value === 'string' ? this.value : 'mockPublicKey123';
    }

    toBase58() {
      return this.toString();
    }

    toBytes() {
      return new Uint8Array(32);
    }
  },
};

/**
 * Mock SPL Token with transfer instruction
 *
 * @example
 * ```typescript
 * vi.mock('@solana/spl-token', () => mockSplToken);
 * ```
 */
export const mockSplToken = {
  getAssociatedTokenAddress: vi.fn(async () => ({
    toBase58: () => 'mockTokenAddress123',
  })),
  createTransferInstruction: vi.fn(() => ({
    keys: [],
    programId: {},
    data: new Uint8Array(),
  })),
  TOKEN_PROGRAM_ID: 'mockTokenProgramId',
};

/**
 * Mock Solana wallet adapter (react)
 *
 * @example
 * ```typescript
 * vi.mock('@solana/wallet-adapter-react', () => mockWalletAdapter);
 * ```
 */
export const mockWalletAdapter = {
  ConnectionProvider: ({ children }: { children: React.ReactNode }) => children,
  WalletProvider: ({ children }: { children: React.ReactNode }) => children,
  useWallet: () => ({
    connected: false,
    connecting: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
    publicKey: null,
    signTransaction: vi.fn(),
    signAllTransactions: vi.fn(),
    select: vi.fn(),
  }),
};

/**
 * Mock Solana wallet adapter wallets
 *
 * @example
 * ```typescript
 * vi.mock('@solana/wallet-adapter-wallets', () => mockWalletAdapterWallets);
 * ```
 */
export const mockWalletAdapterWallets = {
  PhantomWalletAdapter: class MockPhantomWalletAdapter {},
  SolflareWalletAdapter: class MockSolflareWalletAdapter {},
  BackpackWalletAdapter: class MockBackpackWalletAdapter {},
};

/**
 * Mock Stripe.js
 *
 * @example
 * ```typescript
 * vi.mock('@stripe/stripe-js', () => mockStripeJs);
 * ```
 */
export const mockStripeJs = {
  loadStripe: vi.fn(async () => ({
    redirectToCheckout: vi.fn(async (_options: { sessionId: string }) => ({
      error: null,
    })),
    confirmCardPayment: vi.fn(async () => ({
      paymentIntent: { id: 'pi_mock123', status: 'succeeded' },
      error: null,
    })),
  })),
};

/**
 * Create a mock wallet with custom behavior
 *
 * @param connected - Whether wallet is connected
 * @param publicKey - Mock public key string
 * @returns Mock wallet object
 */
export function createMockWallet(
  connected: boolean = true,
  publicKey: string = 'mockWallet123'
) {
  return {
    connected,
    connecting: false,
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    publicKey: connected ? { toBase58: () => publicKey, toString: () => publicKey } : null,
    signTransaction: vi.fn().mockResolvedValue({
      signature: new Uint8Array(64),
      serialize: () => new Uint8Array([1, 2, 3]),
    }),
    signAllTransactions: vi.fn().mockResolvedValue([]),
    select: vi.fn(),
  };
}

/**
 * Create a mock Stripe instance
 *
 * @param options - Options for mock behavior
 * @returns Mock Stripe object
 */
export function createMockStripe(options: {
  redirectSuccess?: boolean;
  sessionId?: string;
} = {}) {
  const { redirectSuccess = true } = options;
  const _sessionId = options.sessionId ?? 'cs_test_mock123';

  return {
    redirectToCheckout: vi.fn().mockResolvedValue({
      error: redirectSuccess ? null : { message: 'Mock redirect error' },
    }),
    confirmCardPayment: vi.fn().mockResolvedValue({
      paymentIntent: {
        id: 'pi_mock123',
        status: 'succeeded',
      },
      error: null,
    }),
    _sessionId, // Store for potential inspection
  };
}

/**
 * Mock fetch for backend API calls
 *
 * @param responses - Map of URL patterns to responses
 * @returns Mock fetch function
 *
 * @example
 * ```typescript
 * global.fetch = createMockFetch({
 *   '/paywall/v1/quote': { status: 402, body: { recipient: '...' } },
 *   '/paywall/v1/verify': { status: 200, body: { success: true } },
 * });
 * ```
 */
export function createMockFetch(
  responses: Record<string, { status: number; body: unknown; headers?: Record<string, string> }>
) {
  return vi.fn((url: string) => {
    for (const [pattern, response] of Object.entries(responses)) {
      if (url.includes(pattern)) {
        return Promise.resolve({
          ok: response.status >= 200 && response.status < 300,
          status: response.status,
          json: async () => response.body,
          text: async () => JSON.stringify(response.body),
          headers: new Map(Object.entries(response.headers || {})),
        });
      }
    }

    // Default 404 response
    return Promise.resolve({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Not found' }),
      text: async () => JSON.stringify({ error: 'Not found' }),
      headers: new Map(),
    });
  });
}
