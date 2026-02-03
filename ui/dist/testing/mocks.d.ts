/**
 * Mock implementations for Solana and Stripe dependencies
 *
 * These mocks can be used with vi.mock() in Vitest or jest.mock() in Jest
 * to avoid needing real Solana/Stripe connections in tests.
 */
/**
 * Mock Solana web3.js with common methods
 *
 * @example
 * ```typescript
 * vi.mock('@solana/web3.js', () => mockSolanaWeb3);
 * ```
 */
export declare const mockSolanaWeb3: {
    clusterApiUrl: import('vitest').Mock<() => string>;
    Connection: {
        new (): {
            getLatestBlockhash(): Promise<{
                blockhash: string;
                lastValidBlockHeight: number;
            }>;
            getBalance(): Promise<number>;
            getSignatureStatus(): Promise<{
                value: {
                    confirmationStatus: string;
                };
            }>;
            getAccountInfo(): Promise<{
                data: Uint8Array<ArrayBuffer>;
                executable: boolean;
                lamports: number;
                owner: Uint8Array<ArrayBuffer>;
                rentEpoch: number;
            }>;
            sendRawTransaction(): Promise<string>;
            confirmTransaction(): Promise<{
                value: {
                    err: null;
                };
            }>;
        };
    };
    SystemProgram: {
        transfer: import('vitest').Mock<() => {
            keys: never[];
            programId: {};
            data: Uint8Array<ArrayBuffer>;
        }>;
    };
    Transaction: {
        new (): {
            recentBlockhash?: string;
            feePayer?: unknown;
            instructions: unknown[];
            add(instruction: unknown): /*elided*/ any;
            serialize(): Uint8Array<ArrayBuffer>;
        };
    };
    LAMPORTS_PER_SOL: number;
    PublicKey: {
        new (value: string | Uint8Array): {
            value: string | Uint8Array;
            toString(): string;
            toBase58(): string;
            toBytes(): Uint8Array<ArrayBuffer>;
        };
    };
};
/**
 * Mock SPL Token with transfer instruction
 *
 * @example
 * ```typescript
 * vi.mock('@solana/spl-token', () => mockSplToken);
 * ```
 */
export declare const mockSplToken: {
    getAssociatedTokenAddress: import('vitest').Mock<() => Promise<{
        toBase58: () => "mockTokenAddress123";
    }>>;
    createTransferInstruction: import('vitest').Mock<() => {
        keys: never[];
        programId: {};
        data: Uint8Array<ArrayBuffer>;
    }>;
    TOKEN_PROGRAM_ID: string;
};
/**
 * Mock Solana wallet adapter (react)
 *
 * @example
 * ```typescript
 * vi.mock('@solana/wallet-adapter-react', () => mockWalletAdapter);
 * ```
 */
export declare const mockWalletAdapter: {
    ConnectionProvider: ({ children }: {
        children: React.ReactNode;
    }) => import('react').ReactNode;
    WalletProvider: ({ children }: {
        children: React.ReactNode;
    }) => import('react').ReactNode;
    useWallet: () => {
        connected: boolean;
        connecting: boolean;
        connect: import('vitest').Mock<import('@vitest/spy').Procedure>;
        disconnect: import('vitest').Mock<import('@vitest/spy').Procedure>;
        publicKey: null;
        signTransaction: import('vitest').Mock<import('@vitest/spy').Procedure>;
        signAllTransactions: import('vitest').Mock<import('@vitest/spy').Procedure>;
        select: import('vitest').Mock<import('@vitest/spy').Procedure>;
    };
};
/**
 * Mock Solana wallet adapter wallets
 *
 * @example
 * ```typescript
 * vi.mock('@solana/wallet-adapter-wallets', () => mockWalletAdapterWallets);
 * ```
 */
export declare const mockWalletAdapterWallets: {
    PhantomWalletAdapter: {
        new (): {};
    };
    SolflareWalletAdapter: {
        new (): {};
    };
    BackpackWalletAdapter: {
        new (): {};
    };
};
/**
 * Mock Stripe.js
 *
 * @example
 * ```typescript
 * vi.mock('@stripe/stripe-js', () => mockStripeJs);
 * ```
 */
export declare const mockStripeJs: {
    loadStripe: import('vitest').Mock<() => Promise<{
        redirectToCheckout: import('vitest').Mock<(_options: {
            sessionId: string;
        }) => Promise<{
            error: null;
        }>>;
        confirmCardPayment: import('vitest').Mock<() => Promise<{
            paymentIntent: {
                id: string;
                status: string;
            };
            error: null;
        }>>;
    }>>;
};
/**
 * Create a mock wallet with custom behavior
 *
 * @param connected - Whether wallet is connected
 * @param publicKey - Mock public key string
 * @returns Mock wallet object
 */
export declare function createMockWallet(connected?: boolean, publicKey?: string): {
    connected: boolean;
    connecting: boolean;
    connect: import('vitest').Mock<import('@vitest/spy').Procedure>;
    disconnect: import('vitest').Mock<import('@vitest/spy').Procedure>;
    publicKey: {
        toBase58: () => string;
        toString: () => string;
    } | null;
    signTransaction: import('vitest').Mock<import('@vitest/spy').Procedure>;
    signAllTransactions: import('vitest').Mock<import('@vitest/spy').Procedure>;
    select: import('vitest').Mock<import('@vitest/spy').Procedure>;
};
/**
 * Create a mock Stripe instance
 *
 * @param options - Options for mock behavior
 * @returns Mock Stripe object
 */
export declare function createMockStripe(options?: {
    redirectSuccess?: boolean;
    sessionId?: string;
}): {
    redirectToCheckout: import('vitest').Mock<import('@vitest/spy').Procedure>;
    confirmCardPayment: import('vitest').Mock<import('@vitest/spy').Procedure>;
    _sessionId: string;
};
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
export declare function createMockFetch(responses: Record<string, {
    status: number;
    body: unknown;
    headers?: Record<string, string>;
}>): import('vitest').Mock<(url: string) => Promise<{
    ok: boolean;
    status: number;
    json: () => Promise<unknown>;
    text: () => Promise<string>;
    headers: Map<string, string>;
}> | Promise<{
    ok: boolean;
    status: number;
    json: () => Promise<{
        error: string;
    }>;
    text: () => Promise<string>;
    headers: Map<any, any>;
}>>;
//# sourceMappingURL=mocks.d.ts.map