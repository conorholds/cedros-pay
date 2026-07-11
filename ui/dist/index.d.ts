import { JSX as JSX_2 } from 'react/jsx-runtime';
import { Mock } from 'vitest';
import { ReactNode } from 'react';

export declare const autosaveFailureFixtures: {
    staleEtag: () => AutosaveProblemError;
    inProgress: () => AutosaveProblemError;
    invalidPatch: () => AutosaveProblemError;
    rateLimited: () => AutosaveProblemError;
    serverFailure: () => AutosaveProblemError;
};

export declare interface AutosaveProblemError extends Error {
    status: number;
    problem: {
        type: string;
        title: string;
        status: number;
        detail: string;
    };
}

declare interface CedrosAutosaveSaveResult<TResource = unknown> {
    resourceId?: string;
    revision?: number | string;
    etag?: string;
    savedAt?: string;
    canonicalPatchOrResource?: TResource;
    warnings?: string[];
    traceId?: string;
}

/**
 * Configuration for the Cedros Pay provider
 */
declare interface CedrosConfig {
    /**
     * Stripe publishable key. Required when card payments are enabled.
     * May be omitted for crypto-only integrations when `showCard` is `false`.
     */
    stripePublicKey?: string;
    serverUrl?: string;
    solanaCluster: SolanaCluster;
    tokenMint?: string;
    solanaEndpoint?: string;
    theme?: CedrosThemeMode;
    themeOverrides?: Partial<CedrosThemeTokens>;
    unstyled?: boolean;
    locale?: string;
    logLevel?: number;
    /**
     * Feature flag overrides.
     *
     * Flags resolve with this precedence:
     * 1. `featureFlags`
     * 2. environment variable override
     * 3. central registry default
     */
    featureFlags?: FeatureFlagOverrides;
    /**
     * Whether to show the card (Stripe) payment button. Defaults to `true`.
     * When set to `false`, `stripePublicKey` is not required.
     *
     * @default true
     */
    showCard?: boolean;
    /**
     * SAFETY: Allow unknown token mints (NOT RECOMMENDED)
     *
     * By default, CedrosPay validates token mints against known stablecoins (USDC, USDT, PYUSD, CASH).
     * Using an unrecognized token mint will throw an error to prevent sending funds to the wrong token.
     *
     * Set this to `true` ONLY if you are intentionally using a custom token, testnet token, or new stablecoin.
     *
     * WARNING: Typos in token mint addresses cause PERMANENT loss of funds.
     *
     * @default false
     */
    dangerouslyAllowUnknownMint?: boolean;
}

declare type CedrosThemeMode = 'light' | 'dark';

declare interface CedrosThemeTokens {
    surfaceBackground: string;
    surfaceText: string;
    surfaceBorder: string;
    stripeBackground: string;
    stripeText: string;
    stripeShadow: string;
    cryptoBackground: string;
    cryptoText: string;
    cryptoShadow: string;
    errorBackground: string;
    errorBorder: string;
    errorText: string;
    successBackground: string;
    successBorder: string;
    successText: string;
    modalOverlay: string;
    modalBackground: string;
    modalBorder: string;
    buttonBorderRadius: string;
    buttonPadding: string;
    buttonFontSize: string;
    buttonFontWeight: string;
}

export declare function createAutosaveProblemError(status: number, detail: string, title?: string): AutosaveProblemError;

export declare function createAutosaveSaveResult<TResource = unknown>(overrides?: Partial<CedrosAutosaveSaveResult<TResource>>): CedrosAutosaveSaveResult<TResource>;

/**
 * Creates a minimal mock provider for simple tests
 *
 * @returns Minimal mock provider component
 *
 * @example
 * ```typescript
 * const MinimalProvider = createMinimalMockProvider();
 *
 * render(
 *   <MinimalProvider>
 *     <YourComponent />
 *   </MinimalProvider>
 * );
 * ```
 */
export declare function createMinimalMockProvider(): ({ children }: {
    children: ReactNode;
}) => JSX_2.Element;

/**
 * Creates a mock CedrosProvider for testing
 *
 * @param config - Optional configuration
 * @returns Mock provider component
 *
 * @example
 * ```typescript
 * import { render } from '@testing-library/react';
 * import { createMockCedrosProvider } from '@cedros/pay-react/testing';
 *
 * const MockProvider = createMockCedrosProvider({
 *   stripePublicKey: 'pk_test_mock',
 *   serverUrl: 'http://localhost:8080',
 * });
 *
 * render(
 *   <MockProvider>
 *     <YourComponent />
 *   </MockProvider>
 * );
 * ```
 */
export declare function createMockCedrosProvider(config?: MockCedrosProviderConfig): ({ children }: {
    children: ReactNode;
}) => JSX_2.Element;

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
}>): Mock<(url: string) => Promise<{
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

/**
 * Create a mock Stripe instance
 *
 * @param options - Options for mock behavior
 * @returns Mock Stripe object
 */
export declare function createMockStripe(options?: {
    redirectSuccess?: boolean;
    sessionId?: string;
}): MockStripe;

/**
 * Create a mock wallet with custom behavior
 *
 * @param connected - Whether wallet is connected
 * @param publicKey - Mock public key string
 * @returns Mock wallet object
 */
export declare function createMockWallet(connected?: boolean, publicKey?: string): MockWallet;

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
export declare function createSpy(): Mock<(...args: unknown[]) => unknown>;

export declare function createSpy<T extends (...args: never[]) => unknown>(implementation: T): Mock<T>;

declare const FEATURE_FLAG_REGISTRY: FeatureFlagRegistry<{
    readonly complianceCheck: {
        readonly description: "Enable pre-flight compliance checks before Stripe checkout.";
        readonly default: false;
        readonly stage: "stable";
    };
}>;

declare type FeatureFlagName = keyof typeof FEATURE_FLAG_REGISTRY;

declare type FeatureFlagOverrides = Partial<Record<FeatureFlagName, boolean>>;

declare type FeatureFlagRegistry<T extends FeatureFlagRegistryInput> = {
    readonly [K in keyof T]: {
        readonly name: K & string;
        readonly description: T[K]['description'];
        readonly default: T[K]['default'];
        readonly stage: T[K]['stage'] extends FeatureFlagStage ? T[K]['stage'] : 'experimental';
        readonly envVar: string;
    };
};

declare type FeatureFlagRegistryInput = Record<string, {
    description: string;
    default: boolean;
    stage?: FeatureFlagStage;
}>;

declare type FeatureFlagStage = 'experimental' | 'stable';

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

/**
 * Configuration for creating a mock Cedros provider
 */
export declare interface MockCedrosProviderConfig extends Partial<CedrosConfig> {
    /** Mock implementations for managers (optional) */
    mockManagers?: {
        stripeManager?: Record<string, unknown>;
        x402Manager?: Record<string, unknown>;
        walletManager?: Record<string, unknown>;
        routeDiscoveryManager?: Record<string, unknown>;
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
export declare function mockPaymentFailure(error?: string): PaymentResult;

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
 * Mock supported Solana wallet adapter modules
 *
 * @example
 * ```typescript
 * vi.mock('@solana/wallet-adapter-phantom', () => mockPhantomWalletAdapter);
 * vi.mock('@solana/wallet-adapter-solflare', () => mockSolflareWalletAdapter);
 * ```
 */
export declare const mockPhantomWalletAdapter: {
    PhantomWalletAdapter: {
        new (): {};
    };
};

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
 * Mock Solana web3.js with common methods
 *
 * @example
 * ```typescript
 * vi.mock('@solana/web3.js', () => mockSolanaWeb3);
 * ```
 */
export declare const mockSolanaWeb3: {
    clusterApiUrl: Mock<() => string>;
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
        transfer: Mock<() => {
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

export declare const mockSolflareWalletAdapter: {
    SolflareWalletAdapter: {
        new (): {};
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
    getAssociatedTokenAddress: Mock<() => Promise<{
        toBase58: () => "mockTokenAddress123";
    }>>;
    createTransferInstruction: Mock<() => {
        keys: never[];
        programId: {};
        data: Uint8Array<ArrayBuffer>;
    }>;
    TOKEN_PROGRAM_ID: string;
};

declare interface MockStripe {
    redirectToCheckout: Mock<() => Promise<{
        error: {
            message: string;
        } | null;
    }>>;
    confirmCardPayment: Mock<() => Promise<{
        paymentIntent: {
            id: string;
            status: string;
        };
        error: null;
    }>>;
    _sessionId: string;
}

/**
 * Mock Stripe.js
 *
 * @example
 * ```typescript
 * vi.mock('@stripe/stripe-js', () => mockStripeJs);
 * ```
 */
export declare const mockStripeJs: {
    loadStripe: Mock<() => Promise<{
        redirectToCheckout: Mock<(_options: {
            sessionId: string;
        }) => Promise<{
            error: null;
        }>>;
        confirmCardPayment: Mock<() => Promise<{
            paymentIntent: {
                id: string;
                status: string;
            };
            error: null;
        }>>;
    }>>;
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
    json: () => Promise<SettlementResponse>;
    headers: Map<string, string>;
};

declare interface MockWallet {
    connected: boolean;
    connecting: boolean;
    connect: Mock<() => Promise<void>>;
    disconnect: Mock<() => Promise<void>>;
    publicKey: {
        toBase58: () => string;
        toString: () => string;
    } | null;
    signTransaction: Mock<() => Promise<{
        signature: Uint8Array;
        serialize: () => Uint8Array;
    }>>;
    signAllTransactions: Mock<() => Promise<unknown[]>>;
    select: Mock<(...args: unknown[]) => void>;
}

/**
 * Mock Solana wallet adapter (react)
 *
 * @example
 * ```typescript
 * vi.mock('@solana/wallet-adapter-react', () => mockWalletAdapter);
 * ```
 */
export declare const mockWalletAdapter: MockWalletModule;

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

declare interface MockWalletModule {
    ConnectionProvider: ({ children }: {
        children: React.ReactNode;
    }) => React.ReactNode;
    WalletProvider: ({ children }: {
        children: React.ReactNode;
    }) => React.ReactNode;
    useWallet: () => {
        connected: boolean;
        connecting: boolean;
        connect: Mock<() => Promise<void>>;
        disconnect: Mock<() => Promise<void>>;
        publicKey: {
            toBase58: () => string;
            toString: () => string;
        } | null;
        signTransaction: Mock<(...args: unknown[]) => unknown>;
        signAllTransactions: Mock<(...args: unknown[]) => unknown>;
        select: Mock<(...args: unknown[]) => void>;
    };
}

/**
 * Wrapper for testing with Solana wallet mocks
 *
 * @param walletState - Mock wallet state
 * @returns Mock wallet provider component
 *
 * @example
 * ```typescript
 * import { mockWalletProvider } from '@cedros/pay-react/testing';
 *
 * const WalletProvider = mockWalletProvider({
 *   connected: true,
 *   publicKey: 'mockWallet123',
 * });
 *
 * render(
 *   <WalletProvider>
 *     <CryptoButton resource="test" />
 *   </WalletProvider>
 * );
 * ```
 */
export declare function mockWalletProvider(walletState?: {
    connected?: boolean;
    publicKey?: string;
    connecting?: boolean;
}): ({ children }: {
    children: ReactNode;
}) => JSX_2.Element;

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

declare interface PaymentResult {
    success: boolean;
    transactionId?: string;
    error?: string;
    settlement?: SettlementResponse;
}

declare interface SettlementResponse {
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

/**
 * Core types for Cedros Pay.
 */
declare type SolanaCluster = 'mainnet-beta' | 'devnet' | 'testnet';

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
 * Wait for next tick (useful for testing async operations)
 *
 * @example
 * ```typescript
 * await waitForNextTick();
 * expect(mockFn).toHaveBeenCalled();
 * ```
 */
export declare function waitForNextTick(): Promise<void>;

declare interface X402Requirement {
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

export { }
