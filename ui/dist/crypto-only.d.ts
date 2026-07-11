import { CSSProperties } from 'react';
import { default as default_2 } from 'react';
import { IRouteDiscoveryManager } from '../../shared/route-discovery-core';
import { JSX as JSX_2 } from 'react/jsx-runtime';
import { PublicKey } from '@solana/web3.js';
import { ReactNode } from 'react';
import { Transaction } from '@solana/web3.js';
import { WalletAdapter } from '@solana/wallet-adapter-base';

/**
 * Request to activate a Solana program-managed subscription after wallet authorization.
 */
export declare interface ActivateSolanaSubscriptionRequest {
    /** Cedros Login JWT used as Bearer token for authenticated activation */
    authToken: string;
    /** Cedros plan ID */
    planId: string;
    /** Billing interval */
    interval: SolanaBillingInterval;
    /** Subscriber wallet address */
    wallet: string;
    /** Confirmed Solana transaction signature for the subscribe instruction */
    authorizationSignature: string;
    /** On-chain subscription PDA/address created by the wallet flow */
    subscriptionAddress: string;
    /** Subscriber SubscriptionAuthority PDA used by the program */
    subscriptionAuthorityAddress?: string;
    /** Plan PDA used in the authorization transaction */
    planAddress?: string;
    /** Number of future payments authorized */
    numberOfPayments?: number;
    /** Optional activation metadata */
    metadata?: Record<string, string>;
}

/**
 * Response from Solana subscription activation.
 */
export declare interface ActivateSolanaSubscriptionResponse {
    subscriptionId: string;
    productId: string;
    wallet: string;
    status: SolanaSubscriptionStatus;
    paymentMethod: 'solana_subscription';
    currentPeriodStart: string;
    currentPeriodEnd: string;
    billingPeriod: string;
    billingInterval: number;
    solana: SolanaSubscriptionState;
}

/**
 * Request to activate an x402 subscription after payment verification.
 *
 * The server accepts productId/wallet/paymentSignature. The legacy
 * resource/walletAddress/transactionSignature aliases are still accepted by
 * SubscriptionManager for older callers.
 */
export declare interface ActivateX402SubscriptionRequest {
    /** Product/plan ID */
    productId?: string;
    /** Legacy alias for productId */
    resource?: string;
    /** User wallet address */
    wallet?: string;
    /** Legacy alias for wallet */
    walletAddress?: string;
    /** Verified x402 payment signature */
    paymentSignature?: string;
    /** Legacy alias for paymentSignature */
    transactionSignature?: string;
    /** Server billing period: day, week, month, or year */
    billingPeriod?: 'day' | 'week' | 'month' | 'year';
    /** Number of billing periods covered by this payment */
    billingInterval?: number;
    /** Client interval alias used to derive billingPeriod/billingInterval */
    interval?: BillingInterval;
    /** Custom interval in days when interval is custom */
    intervalDays?: number;
    /** Optional plan ID for inventory/selection tracking */
    planId?: string;
    /** Optional activation metadata */
    metadata?: Record<string, string>;
}

/**
 * Response from x402 subscription activation
 */
export declare interface ActivateX402SubscriptionResponse {
    /** Whether activation was successful (added by SubscriptionManager) */
    success: boolean;
    /** Subscription ID */
    subscriptionId: string;
    /** Product/plan ID */
    productId: string;
    /** User wallet address */
    wallet: string;
    /** Subscription status after activation */
    status: SubscriptionStatus;
    /** When subscription period starts (ISO 8601) */
    currentPeriodStart: string;
    /** When subscription period ends (ISO 8601) */
    currentPeriodEnd: string;
    /** Billing period returned by the server */
    billingPeriod: string;
    /** Number of billing periods covered by the activation payment */
    billingInterval: number;
    /** When subscription period starts (ISO 8601) */
    periodStart: string;
    /** When subscription period ends (ISO 8601) */
    periodEnd: string;
    /** Optional quote if activation failed upstream and payment is required */
    quote?: unknown;
    /** Error message if activation failed */
    error?: string;
}

/**
 * Available plan for upgrade/downgrade
 */
export declare interface AvailablePlan {
    /** Plan resource ID */
    resource: string;
    /** Display name */
    name: string;
    /** Price per period (in cents) */
    price: number;
    /** Currency */
    currency: string;
    /** Billing interval */
    interval: BillingInterval;
    /** Optional description */
    description?: string;
}

/**
 * Base event detail interface
 */
declare interface BaseEventDetail {
    timestamp: number;
    method: PaymentMethod_2;
}

/**
 * Subscription billing interval
 */
export declare type BillingInterval = 'weekly' | 'monthly' | 'yearly' | 'custom';

/**
 * Request for Stripe billing portal
 */
export declare interface BillingPortalRequest {
    /** Stripe customer ID */
    customerId: string;
    /** URL to return to after portal session */
    returnUrl?: string;
}

/**
 * Response from billing portal request
 */
export declare interface BillingPortalResponse {
    /** Stripe billing portal URL */
    url: string;
}

declare type BrowserSolanaProvider = {
    publicKey?: unknown;
    connect?: (options?: {
        onlyIfTrusted?: boolean;
    }) => Promise<{
        publicKey?: unknown;
    } | void>;
    signTransaction?: (transaction: Transaction) => Promise<Transaction>;
    signAndSendTransaction?: (transaction: Transaction, options?: Record<string, unknown>) => Promise<string | {
        signature?: string;
    }>;
};

declare type BrowserSolanaProvider_2 = {
    publicKey?: unknown;
    connect?: (options?: {
        onlyIfTrusted?: boolean;
    }) => Promise<{
        publicKey?: unknown;
    } | void>;
    signTransaction?: (transaction: Transaction) => Promise<Transaction>;
    signAndSendTransaction?: (transaction: Transaction, options?: Record<string, unknown>) => Promise<string | {
        signature?: string;
    }>;
};

declare type BrowserSolanaProvider_3 = {
    publicKey?: unknown;
    connect?: (options?: {
        onlyIfTrusted?: boolean;
    }) => Promise<{
        publicKey?: unknown;
    } | void>;
    signTransaction?: (transaction: Transaction) => Promise<Transaction>;
    signAndSendTransaction?: (transaction: Transaction, options?: Record<string, unknown>) => Promise<string | {
        signature?: string;
    }>;
};

/**
 * Options for building a payment payload
 */
declare interface BuildPaymentPayloadOptions {
    requirement: X402Requirement;
    signedTx: {
        serialized: string;
        signature: string;
    };
    payerPublicKey: PublicKey;
}

export declare interface BuildSolanaLifecycleTransactionOptions {
    action: SolanaSubscriptionLifecycleAction;
    solana: SubscriptionDetailsSolanaState;
    subscriberPublicKey?: PublicKey | string;
}

export declare interface BuildSolanaPlanTransactionOptions {
    action: SolanaPlanLifecycleAction;
    config: SolanaSubscriptionPlanConfig;
    interval?: 'monthly' | 'annual';
    ownerPublicKey?: PublicKey | string;
}

export declare interface BuildSolanaSubscriptionAuthorizationOptions {
    prepared: PrepareSolanaSubscriptionResponse;
    subscriberPublicKey: PublicKey | string;
    expectedCreatedAt?: number | bigint;
    expectedSubscriptionAuthorityInitId?: number | bigint;
}

export declare function buildSolanaSubscriptionAuthorizationTransaction(options: BuildSolanaSubscriptionAuthorizationOptions): SolanaSubscriptionAuthorizationTransaction;

export declare function buildSolanaSubscriptionLifecycleTransaction(options: BuildSolanaLifecycleTransactionOptions): Transaction;

export declare function buildSolanaSubscriptionPlanTransaction(options: BuildSolanaPlanTransactionOptions): SolanaPlanTransaction;

/**
 * Options for building a Solana transaction
 */
declare interface BuildTransactionOptions {
    requirement: X402Requirement;
    payerPublicKey: PublicKey;
    blockhash?: string;
}

/**
 * Calculate total discount percentage
 *
 * @param originalAmount - Original price before discounts
 * @param discountedAmount - Final price after discounts
 * @returns Discount percentage (0-100)
 *
 * @example
 * calculateDiscountPercentage(100, 75)
 * // Returns: 25.0
 */
export declare function calculateDiscountPercentage(originalAmount: number, discountedAmount: number): number;

/**
 * Request to cancel a subscription
 */
export declare interface CancelSubscriptionRequest {
    /** Subscription ID */
    subscriptionId: string;
    /** Whether to keep access until the period end (default: true) */
    atPeriodEnd?: boolean;
}

/**
 * Response from subscription cancellation
 */
export declare interface CancelSubscriptionResponse {
    /** Whether cancellation was successful */
    success: boolean;
    /** Whether the subscription is set to cancel at period end */
    atPeriodEnd: boolean;
    /** Error message if cancellation failed */
    error?: string;
}

/**
 * Core payment contract types shared by type modules.
 *
 * This module intentionally has no imports from `types/index.ts`, so leaf type
 * modules can depend on these contracts without creating barrel cycles.
 */
declare interface CartItem {
    resource: string;
    quantity?: number;
    metadata?: Record<string, string>;
}

/**
 * Event name constants
 */
export declare const CEDROS_EVENTS: {
    readonly PAYMENT_START: "cedros:payment:start";
    readonly WALLET_CONNECT: "cedros:wallet:connect";
    readonly WALLET_CONNECTED: "cedros:wallet:connected";
    readonly WALLET_ERROR: "cedros:wallet:error";
    readonly PAYMENT_PROCESSING: "cedros:payment:processing";
    readonly PAYMENT_SUCCESS: "cedros:payment:success";
    readonly PAYMENT_ERROR: "cedros:payment:error";
};

/**
 * Configuration for the Cedros Pay provider
 */
export declare interface CedrosConfig {
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

/**
 * Context value containing configuration and manager instances.
 *
 * Managers are typed as interfaces to prevent direct instantiation
 * and allow for future implementation changes.
 */
export declare interface CedrosContextValue {
    config: CedrosConfig;
    featureFlags: ResolvedFeatureFlags;
    subscriptionManager: ISubscriptionManager;
    subscriptionChangeManager: ISubscriptionChangeManager;
    /** Context-scoped wallet pool (for internal use by CedrosPay component) */
    walletPool: LazyWalletPool;
    /** Cached Solana availability check result (null = not checked yet, string = error message, undefined = available) */
    solanaError: string | null | undefined;
}

/**
 * Provider component that initializes managers and provides config
 *
 * Usage:
 * <CedrosProvider config={{ stripePublicKey, serverUrl, solanaCluster }}>
 *   <App />
 * </CedrosProvider>
 */
export declare function CedrosProvider({ config, children }: CedrosProviderProps): JSX_2.Element;

/**
 * Props for CedrosProvider
 */
declare interface CedrosProviderProps {
    config: CedrosConfig;
    children: ReactNode;
}

declare interface CedrosThemeContextValue {
    mode: CedrosThemeMode;
    setMode: (mode: CedrosThemeMode) => void;
    tokens: CedrosThemeTokens;
    className: string;
    style: CSSProperties;
    unstyled: boolean;
}

export declare type CedrosThemeMode = 'light' | 'dark';

export declare interface CedrosThemeTokens {
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

/**
 * Options for changing subscription
 */
export declare interface ChangeOptions {
    /** New resource/plan ID */
    newResource: string;
    /** New billing interval (optional) */
    newInterval?: BillingInterval;
    /** Proration behavior (Stripe only) */
    prorationBehavior?: ProrationBehavior;
    /** Apply change immediately vs at period end */
    immediate?: boolean;
}

/**
 * Request for subscription change preview (proration calculation)
 */
export declare interface ChangePreviewRequest {
    /** Current resource/plan ID */
    currentResource: string;
    /** New resource/plan ID to preview */
    newResource: string;
    /** User identifier */
    userId: string;
    /** New billing interval (if changing interval) */
    newInterval?: BillingInterval;
}

/**
 * Response from subscription change preview
 */
export declare interface ChangePreviewResponse {
    /** Whether preview was successful */
    success: boolean;
    /** Amount to be charged immediately (positive) or credited (negative) in cents */
    immediateAmount: number;
    /** Currency for the amounts */
    currency: string;
    /** Current plan price per period (in cents) */
    currentPlanPrice: number;
    /** New plan price per period (in cents) */
    newPlanPrice: number;
    /** Days remaining in current period */
    daysRemaining: number;
    /** When the new plan would become effective (ISO 8601) */
    effectiveDate: string;
    /** Breakdown of proration calculation */
    prorationDetails?: {
        /** Credit for unused time on current plan (in cents) */
        unusedCredit: number;
        /** Cost for remaining time on new plan (in cents) */
        newPlanCost: number;
    };
    /** Error message if preview failed */
    error?: string;
}

/**
 * Request to change subscription plan (upgrade/downgrade)
 */
export declare interface ChangeSubscriptionRequest {
    /** Subscription ID */
    subscriptionId: string;
    /** New resource/plan ID to change to */
    newResource: string;
    /** How to handle proration (Stripe only) */
    prorationBehavior?: ProrationBehavior;
}

/**
 * Response from subscription change
 */
export declare interface ChangeSubscriptionResponse {
    /** Whether change was successful */
    success: boolean;
    /** Subscription ID */
    subscriptionId: string;
    /** Previous resource/plan ID */
    previousResource: string;
    /** Updated subscription status */
    status: SubscriptionStatus;
    /** New resource/plan ID */
    newResource: string;
    /** Current billing period end (ISO 8601) */
    currentPeriodEnd: string;
    /** Stripe proration behavior applied to the change */
    prorationBehavior: ProrationBehavior;
    /** Error message if change failed */
    error?: string;
}

/**
 * Preset circuit breaker configurations
 */
export declare const CIRCUIT_BREAKER_PRESETS: {
    /** Strict: Opens quickly (3 failures), long timeout (60s) */
    readonly STRICT: {
        readonly failureThreshold: 3;
        readonly timeout: 60000;
    };
    /** Standard: Balanced settings (5 failures, 30s timeout) */
    readonly STANDARD: {
        readonly failureThreshold: 5;
        readonly timeout: 30000;
    };
    /** Lenient: Tolerates more failures (10 failures, 15s timeout) */
    readonly LENIENT: {
        readonly failureThreshold: 10;
        readonly timeout: 15000;
    };
};

export declare interface CircuitBreaker {
    /** Execute a function with circuit breaker protection */
    execute: <T>(fn: () => Promise<T>) => Promise<T>;
    /** Get current circuit state */
    getState: () => CircuitState;
    /** Get circuit breaker statistics */
    getStats: () => CircuitBreakerStats;
    /** Manually reset circuit to CLOSED state */
    reset: () => void;
    /** Manually trip circuit to OPEN state */
    trip: () => void;
}

export declare interface CircuitBreakerConfig {
    /** Number of failures within the window before opening circuit */
    failureThreshold: number;
    /** Time in ms to wait before attempting recovery (OPEN → HALF_OPEN) */
    timeout: number;
    /** Sliding window in ms for counting failures (default: timeout * 2). Failures older than this are discarded. */
    failureWindow?: number;
    /** Optional name for logging/debugging */
    name?: string;
}

/**
 * Error thrown when circuit breaker is OPEN
 */
export declare class CircuitBreakerOpenError extends Error {
    constructor(message: string);
}

export declare interface CircuitBreakerStats {
    state: CircuitState;
    failures: number;
    successes: number;
    rejections: number;
    lastFailureTime: number | null;
    lastSuccessTime: number | null;
}

/**
 * Circuit Breaker Pattern Implementation
 *
 * Prevents cascading failures by "opening the circuit" when a service is failing,
 * giving it time to recover before attempting requests again.
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Service is failing, requests fail immediately
 * - HALF_OPEN: Testing if service has recovered
 *
 * Flow:
 * 1. CLOSED → OPEN: After N consecutive failures
 * 2. OPEN → HALF_OPEN: After timeout expires
 * 3. HALF_OPEN → CLOSED: If request succeeds
 * 4. HALF_OPEN → OPEN: If request fails
 *
 * Usage:
 * ```typescript
 * const breaker = createCircuitBreaker({ failureThreshold: 5, timeout: 30000 });
 *
 * const result = await breaker.execute(async () => {
 *   return await fetch('/api/payment');
 * });
 * ```
 */
export declare enum CircuitState {
    CLOSED = "CLOSED",
    OPEN = "OPEN",
    HALF_OPEN = "HALF_OPEN"
}

/**
 * Result of a compliance pre-flight check.
 *
 * - `cleared: true` → the user may proceed to payment.
 * - `cleared: false` → blocked; `reasons` describes why.
 */
export declare interface ComplianceCheckResult {
    cleared: boolean;
    reasons?: string[];
}

/**
 * Pre-checkout compliance gate page.
 *
 * Renders three states:
 * - **Checking:** spinner + "Verifying purchase eligibility..."
 * - **Cleared:** auto-fires `onCleared()` callback
 * - **Blocked:** card showing reasons + "Go back" button
 *
 * Uses `useCedrosTheme()` for styling. Works with `unstyled` mode.
 */
export declare function ComplianceGatePage({ resources, onCleared, onBlocked, onCancel, authToken, wallet, children, }: ComplianceGatePageProps): JSX_2.Element | null;

/**
 * Props for the ComplianceGatePage component.
 *
 * @example
 * ```tsx
 * <ComplianceGatePage
 *   resources={['product-1']}
 *   onCleared={() => stripeManager.processPayment(...)}
 *   onCancel={() => navigate('/shop')}
 * />
 * ```
 */
export declare interface ComplianceGatePageProps {
    /** Product/resource IDs to check compliance for */
    resources: string[];
    /** Called automatically when compliance passes */
    onCleared: () => void;
    /** Called when compliance is blocked, with the list of reasons */
    onBlocked?: (reasons: string[]) => void;
    /** Called when the user clicks "Go back" */
    onCancel?: () => void;
    /** Optional auth token (cedros-login JWT) for authenticated checks */
    authToken?: string;
    /** Optional Solana wallet address for token-gate checks */
    wallet?: string;
    /** Custom content shown while checking */
    children?: React.ReactNode;
}

declare interface ConfirmSolanaSubscriptionLifecycleRequest {
    subscriptionId: string;
    wallet: string;
    signature: string;
}

declare interface ConfirmSolanaSubscriptionLifecycleResponse {
    success: boolean;
    subscriptionId: string;
    status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'expired';
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: string;
    solanaStatus: SolanaSubscriptionStatus;
}

/**
 * Coupon interface matching backend types
 */
export declare interface Coupon {
    code: string;
    discountType: "percentage" | "fixed";
    discountValue: number;
    currency?: string;
    description?: string;
}

/**
 * Create a circuit breaker instance
 *
 * @param config - Circuit breaker configuration
 * @returns Circuit breaker instance
 *
 * @example
 * ```typescript
 * const paymentBreaker = createCircuitBreaker({
 *   failureThreshold: 5,
 *   timeout: 30000,
 *   name: 'payment-service',
 * });
 *
 * try {
 *   const result = await paymentBreaker.execute(async () => {
 *     return await createPaymentSession();
 *   });
 * } catch (error) {
 *   if (error instanceof CircuitBreakerOpenError) {
 *     console.error('Payment service is down, please try again later');
 *   }
 * }
 * ```
 */
export declare function createCircuitBreaker(config: CircuitBreakerConfig): CircuitBreaker;

/**
 * Create a new logger instance with custom configuration
 */
export declare function createLogger(config: LoggerConfig): Logger;

/**
 * Creates a rate limiter using token bucket algorithm
 *
 * @param config - Rate limiter configuration
 * @returns Rate limiter instance
 *
 * @example
 * ```typescript
 * // Allow 5 payment requests per minute
 * const paymentLimiter = createRateLimiter({
 *   maxRequests: 5,
 *   windowMs: 60000
 * });
 *
 * async function handlePayment() {
 *   if (!paymentLimiter.tryConsume()) {
 *     throw new Error('Rate limit exceeded. Please wait before trying again.');
 *   }
 *   await processPayment();
 * }
 * ```
 */
export declare function createRateLimiter(config: RateLimiterConfig): RateLimiter;

/**
 * Create a translation function for a specific locale
 *
 * @param translations - Loaded translations object
 * @returns Translation function
 */
export declare function createTranslator(translations: Translations, fallbackTranslations?: Translations): TranslateFn;

/**
 * Create a new wallet pool instance
 *
 * Each CedrosProvider should create its own pool for isolation.
 *
 * @param poolId - Optional pool ID for debugging (auto-generated if not provided)
 * @returns New wallet pool instance
 *
 * @example
 * ```typescript
 * const walletPool = createWalletPool('user-123-session');
 * const wallets = walletPool.getAdapters();
 *
 * // Later, on component unmount:
 * await walletPool.cleanup();
 * ```
 */
export declare function createWalletPool(poolId?: string): WalletPool;

/**
 * Displays the authenticated user's credits balance.
 *
 * Requires the user to be logged in via cedros-login.
 * Fetches balance on mount and provides a refresh button.
 *
 * @example
 * ```tsx
 * <CreditsBalance authToken={jwt} />
 * ```
 */
export declare function CreditsBalance({ authToken, className, formatBalance, showHeld, }: CreditsBalanceProps): JSX_2.Element | null;

/** Props for the CreditsBalance component */
export declare interface CreditsBalanceProps {
    /** JWT token from cedros-login for user authentication */
    authToken?: string;
    /** Custom CSS class name */
    className?: string;
    /** Custom formatter for the balance display. Receives available amount and currency. */
    formatBalance?: (available: number, currency: string) => string;
    /** Whether to show the held/reserved amount */
    showHeld?: boolean;
}

/** Credits balance state returned by the hook */
export declare interface CreditsBalanceState {
    /** Available balance in atomic units */
    available: number;
    /** Held (reserved) balance in atomic units */
    held: number;
    /** Currency/token symbol */
    currency: string;
    /** Whether balance is currently being fetched */
    loading: boolean;
    /** Error message if fetch failed */
    error: string | null;
    /** Manually refresh the balance */
    refresh: () => void;
}

/**
 * Credits payment requirement
 * Returned in quote response when credits payment is available
 */
export declare interface CreditsRequirement {
    /** Credits amount required (in cents/smallest currency unit) */
    amount: number;
    /** Currency for display (e.g., "USD") */
    currency: string;
    /** Human-readable description */
    description: string;
    /** Resource being purchased */
    resource: string;
}

/**
 * Button component for credits subscription payments
 *
 * Handles subscription payments using cedros-login credits balance.
 * Requires user to be authenticated with cedros-login.
 *
 * @example
 * ```tsx
 * <CreditsSubscribeButton
 *   resource="plan-pro"
 *   interval="monthly"
 *   authToken={authToken}
 *   userId={userId}
 *   autoCheckStatus
 *   onSuccess={(txId) => console.log('Subscribed!', txId)}
 * />
 * ```
 */
export declare function CreditsSubscribeButton({ resource, interval, intervalDays, authToken, userId, couponCode, label, disabled, onAttempt, onSuccess, onError, className, hideMessages, autoCheckStatus, }: CreditsSubscribeButtonProps): JSX_2.Element;

/**
 * Props for CreditsSubscribeButton component
 */
declare interface CreditsSubscribeButtonProps {
    /** Resource/plan ID for the subscription */
    resource: string;
    /** Billing interval */
    interval: BillingInterval;
    /** Custom interval in days (only used when interval is 'custom') */
    intervalDays?: number;
    /** JWT token from cedros-login for authentication */
    authToken?: string;
    /** User ID from cedros-login for subscription status checks */
    userId?: string;
    /** Coupon code for discount */
    couponCode?: string;
    /** Custom button label */
    label?: string;
    /** Disable button */
    disabled?: boolean;
    /** Track subscription attempt for analytics */
    onAttempt?: (method: PaymentMethod_2) => void;
    /** Callback on successful subscription */
    onSuccess?: (transactionId: string) => void;
    /** Callback on error */
    onError?: (error: string) => void;
    /** Additional CSS class */
    className?: string;
    /** Hide inline success/error messages */
    hideMessages?: boolean;
    /** Auto-check subscription status on mount when userId is provided */
    autoCheckStatus?: boolean;
}

/**
 * Options for subscription quote and payment
 */
declare interface CreditsSubscriptionOptions {
    couponCode?: string;
    intervalDays?: number;
    /** Cedros Login subject used to bind subscription ownership. */
    userId?: string;
}

/**
 * Button component for x402 crypto subscription payments
 *
 * Shows subscription status when active, otherwise allows subscribing
 *
 * @example
 * ```tsx
 * <CryptoSubscribeButton
 *   resource="plan-pro"
 *   interval="monthly"
 *   autoCheckStatus
 *   onSuccess={(txId) => console.log('Subscribed!', txId)}
 * />
 * ```
 */
export declare function CryptoSubscribeButton({ resource, interval, intervalDays, couponCode, label, disabled, onAttempt, onSuccess, onError, className, testPageUrl, hideMessages, autoCheckStatus, }: CryptoSubscribeButtonProps): JSX_2.Element;

/**
 * Props for CryptoSubscribeButton component
 */
declare interface CryptoSubscribeButtonProps {
    /** Resource/plan ID for the subscription */
    resource: string;
    /** Billing interval */
    interval: BillingInterval;
    /** Custom interval in days (only used when interval is 'custom') */
    intervalDays?: number;
    /** Coupon code for discount */
    couponCode?: string;
    /** Custom button label */
    label?: string;
    /** Disable button */
    disabled?: boolean;
    /** Track subscription attempt for analytics */
    onAttempt?: (method: 'stripe' | 'crypto') => void;
    /** Callback on successful subscription */
    onSuccess?: (transactionId: string) => void;
    /** Callback on error */
    onError?: (error: string) => void;
    /** Additional CSS class */
    className?: string;
    /** URL to open in a new tab for crypto testing */
    testPageUrl?: string;
    /** Hide inline success/error messages */
    hideMessages?: boolean;
    /** Auto-check subscription status on mount when wallet is connected */
    autoCheckStatus?: boolean;
}

/**
 * Preset CSP configurations for common scenarios
 */
export declare const CSP_PRESETS: {
    /**
     * Mainnet production with custom RPC (recommended)
     */
    readonly MAINNET_CUSTOM_RPC: (rpcEndpoint: string) => CSPConfig;
    /**
     * Mainnet with Next.js (may require unsafe-inline/eval for some setups)
     * Note: Modern Next.js supports strict CSP without unsafe directives.
     * Only enable allowUnsafeScripts if necessary and understand the security implications.
     */
    readonly MAINNET_NEXTJS: (rpcEndpoint?: string) => CSPConfig;
    /**
     * Devnet for testing
     */
    readonly DEVNET: () => CSPConfig;
    /**
     * Crypto-only payments (no Stripe)
     */
    readonly CRYPTO_ONLY: (rpcEndpoint?: string) => CSPConfig;
    /**
     * Stripe-only payments (no Solana)
     */
    readonly STRIPE_ONLY: () => CSPConfig;
};

/**
 * CSP generation options
 */
export declare interface CSPConfig {
    /**
     * Solana network cluster
     * Determines which Solana RPC endpoints to include
     */
    solanaCluster?: SolanaCluster;
    /**
     * Custom Solana RPC endpoint URL
     * If provided, this domain will be added to connect-src
     * @example "https://mainnet.helius-rpc.com"
     */
    solanaEndpoint?: string;
    /**
     * Additional custom RPC providers
     * Common providers: Helius, QuickNode, Alchemy, Ankr
     * @example ["https://*.helius-rpc.com", "https://*.quicknode.pro"]
     */
    customRpcProviders?: string[];
    /**
     * Whether to include 'unsafe-inline' and 'unsafe-eval' in script-src
     * Required for some frameworks (Next.js, etc.)
     * @default false
     */
    allowUnsafeScripts?: boolean;
    /**
     * Additional domains to include in script-src
     * @example ["https://cdn.example.com"]
     */
    additionalScriptSrc?: string[];
    /**
     * Additional domains to include in connect-src
     * @example ["https://api.example.com"]
     */
    additionalConnectSrc?: string[];
    /**
     * Additional domains to include in frame-src
     * @example ["https://embed.example.com"]
     */
    additionalFrameSrc?: string[];
    /**
     * Whether to include Stripe directives
     * Set to false if only using crypto payments
     * @default true
     */
    includeStripe?: boolean;
    /**
     * Whether to include Solana RPC directives
     * Set to false if only using Stripe payments
     * @default true
     */
    includeSolana?: boolean;
}

/**
 * Generated CSP directives
 */
export declare interface CSPDirectives {
    scriptSrc: string[];
    connectSrc: string[];
    frameSrc: string[];
}

/**
 * CSP output format for different frameworks
 */
export declare type CSPFormat = 'header' | 'meta' | 'nextjs' | 'helmet' | 'nginx' | 'directives';

export declare type Currency = 'USD' | 'EUR' | 'GBP';

export declare type DateInput = string | number | Date;

/**
 * Detect user's preferred locale from browser
 *
 * @returns Detected locale code (e.g., 'en', 'es')
 */
export declare function detectLocale(): Locale;

/**
 * Emit payment error event
 */
export declare function emitPaymentError(method: PaymentMethod_2, error: string, resource?: string, itemCount?: number): void;

/**
 * Emit payment processing event
 */
export declare function emitPaymentProcessing(method: PaymentMethod_2, resource?: string, itemCount?: number): void;

/**
 * Emit payment start event
 */
export declare function emitPaymentStart(method: PaymentMethod_2, resource?: string, itemCount?: number): void;

/**
 * Emit payment success event
 */
export declare function emitPaymentSuccess(method: PaymentMethod_2, transactionId: string, resource?: string, itemCount?: number): void;

/**
 * Emit wallet connect event (connection initiated)
 */
export declare function emitWalletConnect(wallet: WalletProvider): void;

/**
 * Emit wallet connected event (connection successful)
 */
export declare function emitWalletConnected(wallet: WalletProvider, publicKey: string): void;

/**
 * Emit wallet error event
 */
export declare function emitWalletError(error: string, wallet?: WalletProvider): void;

/**
 * Error code categories for bulk error handling
 */
export declare const ERROR_CATEGORIES: {
    /** Insufficient funds errors requiring user to add funds */
    readonly INSUFFICIENT_FUNDS: readonly [PaymentErrorCode.INSUFFICIENT_FUNDS_SOL, PaymentErrorCode.INSUFFICIENT_FUNDS_TOKEN];
    /** Transaction state errors that may resolve with time */
    readonly TRANSACTION_PENDING: readonly [PaymentErrorCode.TRANSACTION_NOT_CONFIRMED, PaymentErrorCode.TRANSACTION_NOT_FOUND];
    /** Validation errors requiring input correction */
    readonly VALIDATION: readonly [PaymentErrorCode.MISSING_FIELD, PaymentErrorCode.INVALID_FIELD, PaymentErrorCode.INVALID_AMOUNT, PaymentErrorCode.INVALID_WALLET, PaymentErrorCode.INVALID_RESOURCE, PaymentErrorCode.INVALID_CART_ITEM, PaymentErrorCode.EMPTY_CART];
    /** Coupon-related errors */
    readonly COUPON: readonly [PaymentErrorCode.INVALID_COUPON, PaymentErrorCode.COUPON_NOT_FOUND, PaymentErrorCode.COUPON_EXPIRED, PaymentErrorCode.COUPON_USAGE_LIMIT_REACHED, PaymentErrorCode.COUPON_NOT_APPLICABLE, PaymentErrorCode.COUPON_WRONG_PAYMENT_METHOD];
    /** Retryable errors (temporary failures) */
    readonly RETRYABLE: readonly [PaymentErrorCode.TRANSACTION_NOT_CONFIRMED, PaymentErrorCode.RPC_ERROR, PaymentErrorCode.NETWORK_ERROR, PaymentErrorCode.STRIPE_ERROR];
    /** Resource not found errors */
    readonly NOT_FOUND: readonly [PaymentErrorCode.RESOURCE_NOT_FOUND, PaymentErrorCode.CART_NOT_FOUND, PaymentErrorCode.REFUND_NOT_FOUND, PaymentErrorCode.PRODUCT_NOT_FOUND, PaymentErrorCode.COUPON_NOT_FOUND, PaymentErrorCode.SESSION_NOT_FOUND, PaymentErrorCode.CREDITS_HOLD_NOT_FOUND];
    /** Credits-related errors */
    readonly CREDITS: readonly [PaymentErrorCode.INSUFFICIENT_CREDITS, PaymentErrorCode.CREDITS_HOLD_EXPIRED, PaymentErrorCode.CREDITS_HOLD_NOT_FOUND];
    /** Security/rate limit errors */
    readonly SECURITY: readonly [PaymentErrorCode.INVALID_REDIRECT_URL, PaymentErrorCode.RATE_LIMIT_EXCEEDED, PaymentErrorCode.NONCE_ALREADY_USED];
};

export declare const FEATURE_FLAG_NAMES: readonly "complianceCheck"[];

export declare const FEATURE_FLAG_REGISTRY: FeatureFlagRegistry<{
    readonly complianceCheck: {
        readonly description: "Enable pre-flight compliance checks before Stripe checkout.";
        readonly default: false;
        readonly stage: "stable";
    };
}>;

export declare type FeatureFlagDefinition = (typeof FEATURE_FLAG_REGISTRY)[FeatureFlagName];

export declare type FeatureFlagEnv = Record<string, string | undefined>;

export declare type FeatureFlagName = keyof typeof FEATURE_FLAG_REGISTRY;

export declare type FeatureFlagOverrides = Partial<Record<FeatureFlagName, boolean>>;

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
 * Format coupon codes for display
 *
 * @param coupons - Array of coupon codes
 * @param separator - Separator string (default: ", ")
 * @returns Formatted string
 *
 * @example
 * formatCouponCodes(["SITE10", "CRYPTO5AUTO", "SAVE20"])
 * // Returns: "SITE10, CRYPTO5AUTO, SAVE20"
 */
export declare function formatCouponCodes(coupons: string[], separator?: string): string;

/**
 * Format CSP directives for different frameworks and environments
 *
 * @param directives - CSP directives from generateCSPDirectives()
 * @param format - Output format
 * @returns Formatted CSP string or object
 *
 * @example
 * ```typescript
 * const directives = generateCSPDirectives({ solanaCluster: 'mainnet-beta' });
 *
 * // HTTP Header format
 * const header = formatCSP(directives, 'header');
 * // "script-src 'self' https://js.stripe.com; connect-src 'self' ..."
 *
 * // Next.js config format
 * const nextjs = formatCSP(directives, 'nextjs');
 *
 * // Express helmet format
 * const helmet = formatCSP(directives, 'helmet');
 * ```
 */
export declare function formatCSP(directives: CSPDirectives, format?: CSPFormat): string | Record<string, string[]>;

export declare function formatCurrencyAmount(value: number, currency?: string, locale?: string, options?: Intl.NumberFormatOptions): string;

export declare function formatDateOnly(value: DateInput, locale?: string, options?: Intl.DateTimeFormatOptions): string;

export declare function formatDateTimeValue(value: DateInput, locale?: string, options?: Intl.DateTimeFormatOptions): string;

export declare function formatMinorCurrencyAmount(minorValue: number, currency?: string, locale?: string, options?: Intl.NumberFormatOptions): string;

export declare function formatNumberValue(value: number, locale?: string, options?: Intl.NumberFormatOptions): string;

/**
 * Generate CSP string for Cedros Pay (convenience function)
 *
 * Combines generateCSPDirectives() and formatCSP() into a single call.
 *
 * @param config - CSP configuration options
 * @param format - Output format (default: 'header')
 * @returns Formatted CSP string or object
 *
 * @example
 * ```typescript
 * // Quick CSP generation for HTTP headers
 * const csp = generateCSP({
 *   solanaCluster: 'mainnet-beta',
 *   solanaEndpoint: 'https://mainnet.helius-rpc.com',
 *   allowUnsafeScripts: true,
 * });
 * // "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com; ..."
 *
 * // For Express helmet
 * const helmetCSP = generateCSP({ solanaCluster: 'mainnet-beta' }, 'helmet');
 * app.use(helmet.contentSecurityPolicy({ directives: helmetCSP }));
 * ```
 */
export declare function generateCSP(config?: CSPConfig, format?: CSPFormat): string | Record<string, string[]>;

/**
 * Generate CSP directives for Cedros Pay
 *
 * @param config - CSP configuration options
 * @returns Object containing script-src, connect-src, and frame-src arrays
 *
 * @example
 * ```typescript
 * const directives = generateCSPDirectives({
 *   solanaCluster: 'mainnet-beta',
 *   solanaEndpoint: 'https://mainnet.helius-rpc.com',
 *   allowUnsafeScripts: true, // Required for Next.js
 * });
 * ```
 */
export declare function generateCSPDirectives(config?: CSPConfig): CSPDirectives;

/**
 * Get list of available locales by discovering translation files dynamically
 * Uses Vite's import.meta.glob to find all translation JSON files
 *
 * @returns Array of available locale codes
 */
export declare function getAvailableLocales(): Promise<Locale[]>;

export declare function getFeatureFlagDefinition(name: FeatureFlagName): FeatureFlagDefinition;

export declare function getFeatureFlagDefinitions(): FeatureFlagDefinition[];

export declare function getLocaleDirection(locale?: string | null): TextDirection;

/**
 * Get error message in current locale
 *
 * @param errorCode - Error code string (e.g., 'insufficient_funds_token')
 * @param translations - Current translations
 * @param includeAction - Whether to include action guidance
 * @returns Localized error message
 */
export declare function getLocalizedError(errorCode: string, translations: Translations, includeAction?: boolean): string;

/**
 * Get or create the default logger instance
 */
export declare function getLogger(): Logger;

/**
 * Get user-friendly error message
 *
 * Extracts a user-friendly message from any error type.
 *
 * @param error - Error to extract message from
 * @returns User-friendly error message
 */
export declare function getUserErrorMessage(error: unknown): string;

export { IRouteDiscoveryManager }

export declare function isFeatureEnabled(name: FeatureFlagName, options?: ResolveFeatureFlagsOptions): boolean;

/**
 * Check if an error is retryable
 *
 * Convenience function to check if an error (of any type) is retryable.
 *
 * @param error - Error to check
 * @returns true if error is a PaymentError and is retryable
 */
export declare function isRetryableError(error: unknown): boolean;

/**
 * Public interface for subscription change operations.
 */
export declare interface ISubscriptionChangeManager {
    /** Change subscription plan (upgrade or downgrade) */
    changeSubscription(request: ChangeSubscriptionRequest): Promise<ChangeSubscriptionResponse>;
    /** Preview subscription change (get proration details) */
    previewChange(request: ChangePreviewRequest): Promise<ChangePreviewResponse>;
    /** Get full subscription details */
    getDetails(resource: string, userId: string): Promise<SubscriptionDetails>;
    /** Cancel a subscription */
    cancel(request: CancelSubscriptionRequest): Promise<CancelSubscriptionResponse>;
    /** Get Stripe billing portal URL */
    getBillingPortalUrl(request: BillingPortalRequest): Promise<BillingPortalResponse>;
    /** Confirm a Solana subscription lifecycle transaction after wallet signature */
    confirmSolanaLifecycle(action: SolanaSubscriptionLifecycleAction, request: ConfirmSolanaSubscriptionLifecycleRequest): Promise<ConfirmSolanaSubscriptionLifecycleResponse>;
}

/**
 * Public interface for subscription management.
 *
 * Use this interface for type annotations instead of the concrete SubscriptionManager class.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { subscriptionManager } = useCedrosContext();
 *   await subscriptionManager.processSubscription({
 *     resource: 'plan-pro',
 *     interval: 'monthly',
 *   });
 * }
 * ```
 */
export declare interface ISubscriptionManager {
    /**
     * Initialize Stripe.js library (for redirect flow)
     */
    initialize(): Promise<void>;
    /**
     * Create a Stripe subscription checkout session
     */
    createSubscriptionSession(request: SubscriptionSessionRequest): Promise<SubscriptionSessionResponse>;
    /**
     * Redirect to Stripe checkout page
     */
    redirectToCheckout(sessionId: string): Promise<PaymentResult>;
    /**
     * Complete subscription flow: create session and redirect (Stripe)
     */
    processSubscription(request: SubscriptionSessionRequest): Promise<PaymentResult>;
    /**
     * Check subscription status (for x402 gating)
     */
    checkSubscriptionStatus(request: SubscriptionStatusRequest): Promise<SubscriptionStatusResponse>;
    /**
     * Request a subscription quote for x402 crypto payment
     */
    requestSubscriptionQuote(resource: string, interval: BillingInterval, options?: SubscriptionQuoteOptions): Promise<SubscriptionQuote>;
    /**
     * Activate x402 subscription after payment verification
     */
    activateX402Subscription(request: ActivateX402SubscriptionRequest): Promise<ActivateX402SubscriptionResponse>;
    /**
     * Activate Solana delegated subscription after wallet authorization.
     */
    activateSolanaSubscription(request: ActivateSolanaSubscriptionRequest): Promise<ActivateSolanaSubscriptionResponse>;
}

/**
 * Public interface for Solana wallet and transaction management.
 *
 * Use this interface for type annotations instead of the concrete WalletManager class.
 */
export declare interface IWalletManager {
    /**
     * Build a Solana transaction from x402 requirement
     */
    buildTransaction(options: BuildTransactionOptions): Promise<Transaction>;
    /**
     * Build payment payload from signed transaction
     */
    buildPaymentPayload(options: BuildPaymentPayloadOptions): PaymentPayload;
    /**
     * Sign transaction using wallet adapter (fully signed)
     */
    signTransaction(options: SignTransactionOptions): Promise<{
        serialized: string;
        signature: string;
    }>;
    /**
     * Deserialize a base64-encoded transaction
     */
    deserializeTransaction(base64Transaction: string): Transaction;
    /**
     * Partially sign transaction for gasless mode
     */
    partiallySignTransaction(options: PartiallySignTransactionOptions): Promise<string>;
    /**
     * Get wallet SOL balance
     */
    getBalance(publicKey: PublicKey): Promise<number>;
    /**
     * Verify transaction on-chain
     */
    verifyTransaction(signature: string): Promise<boolean>;
}

/** Simple symbol lookup map derived from token metadata. */
export declare const KNOWN_STABLECOINS: Record<string, string>;

/** Minimal interface matching WalletPool to avoid importing the module at parse time */
declare interface LazyWalletPool {
    getAdapters(): WalletAdapterLike[];
    cleanup(): Promise<void>;
    isInitialized(): boolean;
    getId(): string;
}

/**
 * Load translations for a specific locale with fallback to English
 *
 * @param locale - Requested locale (e.g., 'es', 'zh')
 * @returns Translations object (always succeeds, falls back to English)
 */
export declare function loadLocale(locale: Locale): Promise<Translations>;

/**
 * Locale helpers shared by the web i18n loader and consumers.
 *
 * Translation filenames still include a few legacy region-style aliases
 * (`jp`, `kr`, `vn`, `in`). Runtime locale values are normalized to canonical
 * BCP 47 language subtags so browser/device locales can resolve correctly.
 */
export declare type Locale = string;

/**
 * Structured logger with level-based filtering
 */
export declare class Logger {
    private config;
    constructor(config: LoggerConfig);
    /**
     * Update the log level dynamically
     */
    setLevel(level: LogLevel): void;
    /**
     * Get the current log level
     */
    getLevel(): LogLevel;
    /**
     * Debug-level logging (most verbose)
     * Use for detailed debugging information
     */
    debug(...args: unknown[]): void;
    /**
     * Info-level logging
     * Use for general informational messages
     */
    info(...args: unknown[]): void;
    /**
     * Warning-level logging
     * Use for potentially problematic situations
     */
    warn(...args: unknown[]): void;
    /**
     * Error-level logging
     * Use for error conditions
     */
    error(...args: unknown[]): void;
    /**
     * Internal log method with formatting
     */
    private log;
}

/**
 * Logger configuration
 */
export declare interface LoggerConfig {
    level: LogLevel;
    prefix?: string;
}

/**
 * Structured logging with configurable log levels
 *
 * Supports filtering logs by severity level to control verbosity.
 * Production deployments should use LogLevel.ERROR or LogLevel.WARN.
 */
/**
 * Log severity levels (lowest to highest)
 */
export declare enum LogLevel {
    DEBUG = 0,// Detailed debug information
    INFO = 1,// Informational messages
    WARN = 2,// Warning messages
    ERROR = 3,// Error messages
    SILENT = 4
}

/**
 * Log security report to console (development only)
 *
 * @param report - Security report from validateSecurity()
 *
 * @example
 * ```typescript
 * import { validateSecurity, logSecurityReport } from '@cedros/pay-react';
 *
 * const report = validateSecurity();
 * logSecurityReport(report);
 * ```
 */
export declare function logSecurityReport(report: SecurityReport): void;

/**
 * Request to create a native Stripe PaymentSheet subscription session.
 *
 * This remains separate from redirect checkout so consumers can choose the
 * contract intentionally.
 */
export declare interface MobileSubscriptionSessionRequest {
    /** Resource/plan ID for the subscription */
    resource: string;
    /** Billing interval */
    interval: BillingInterval;
    /** Custom interval in days (only used when interval is 'custom') */
    intervalDays?: number;
    /** Number of trial days (0 for no trial) */
    trialDays?: number;
    /** Customer email for Stripe customer reuse/bootstrap */
    customerEmail?: string;
    /** Metadata for tracking */
    metadata?: Record<string, string>;
    /** Coupon code for discount */
    couponCode?: string;
}

export declare function normalizeLocale(locale?: string | null): Locale;

/**
 * Parse coupon codes from metadata
 *
 * Parses comma-separated coupon codes from the coupon_codes field
 *
 * @param metadata - Metadata object from settlement response or cart callback
 * @returns Array of coupon codes that were applied
 *
 * @example
 * // Multiple coupons
 * parseCouponCodes({ coupon_codes: "SITE10,CRYPTO5AUTO,SAVE20" })
 * // Returns: ["SITE10", "CRYPTO5AUTO", "SAVE20"]
 *
 * @example
 * // Single coupon
 * parseCouponCodes({ coupon_codes: "SAVE20" })
 * // Returns: ["SAVE20"]
 *
 * @example
 * // No coupons applied
 * parseCouponCodes({})
 * // Returns: []
 */
export declare function parseCouponCodes(metadata?: Record<string, string | undefined> | SettlementResponse["metadata"]): string[];

export declare function parseFeatureFlagBoolean(value: string | undefined): boolean | undefined;

/**
 * Options for partially signing a transaction (gasless mode)
 */
declare interface PartiallySignTransactionOptions {
    transaction: Transaction;
    signTransaction: (tx: Transaction) => Promise<Transaction>;
    blockhash?: string;
}

/**
 * Cedros Pay - Error Code Types
 *
 * Structured error handling with machine-readable error codes.
 * Based on backend error code specification (ERROR_CODES.md v1.0)
 *
 * Benefits:
 * - Type-safe error handling (no string matching fragility)
 * - Robust error recovery logic based on error codes
 * - Analytics tracking with structured error data
 * - Retry logic based on retryable flag
 * - User-friendly error messages per error type
 */
/**
 * Payment error codes returned by the backend API
 *
 * Organized by HTTP status code category:
 * - 400: Validation errors
 * - 402: Payment verification failures
 * - 404: Resource not found
 * - 409: Business rule conflicts (coupons)
 * - 500: Internal server errors
 * - 502: External service failures
 */
declare enum PaymentErrorCode {
    /** Invalid payment proof format or structure */
    INVALID_PAYMENT_PROOF = "invalid_payment_proof",
    /** Invalid transaction signature */
    INVALID_SIGNATURE = "invalid_signature",
    /** Invalid transaction structure */
    INVALID_TRANSACTION = "invalid_transaction",
    /** Transaction not found on blockchain */
    TRANSACTION_NOT_FOUND = "transaction_not_found",
    /** Transaction not confirmed yet (RETRYABLE) */
    TRANSACTION_NOT_CONFIRMED = "transaction_not_confirmed",
    /** Transaction failed on-chain */
    TRANSACTION_FAILED = "transaction_failed",
    /** Transaction timed out */
    TRANSACTION_EXPIRED = "transaction_expired",
    /** Payment sent to wrong address */
    INVALID_RECIPIENT = "invalid_recipient",
    /** Invalid sender wallet */
    INVALID_SENDER = "invalid_sender",
    /** Only authorized wallets can issue refunds */
    UNAUTHORIZED_REFUND_ISSUER = "unauthorized_refund_issuer",
    /** Payment amount less than required */
    AMOUNT_BELOW_MINIMUM = "amount_below_minimum",
    /** Payment amount doesn't match quote */
    AMOUNT_MISMATCH = "amount_mismatch",
    /** Insufficient SOL for transaction fees */
    INSUFFICIENT_FUNDS_SOL = "insufficient_funds_sol",
    /** Insufficient token balance */
    INSUFFICIENT_FUNDS_TOKEN = "insufficient_funds_token",
    /** Wrong token used for payment */
    INVALID_TOKEN_MINT = "invalid_token_mint",
    /** Transaction is not a valid SPL token transfer */
    NOT_SPL_TRANSFER = "not_spl_transfer",
    /** Token account not found */
    MISSING_TOKEN_ACCOUNT = "missing_token_account",
    /** Invalid token program */
    INVALID_TOKEN_PROGRAM = "invalid_token_program",
    /** Required memo missing from transaction */
    MISSING_MEMO = "missing_memo",
    /** Invalid memo format */
    INVALID_MEMO = "invalid_memo",
    /** Payment signature already used (replay protection) */
    PAYMENT_ALREADY_USED = "payment_already_used",
    /** Transaction signature reused */
    SIGNATURE_REUSED = "signature_reused",
    /** Payment quote has expired */
    QUOTE_EXPIRED = "quote_expired",
    /** Required field missing */
    MISSING_FIELD = "missing_field",
    /** Field format invalid */
    INVALID_FIELD = "invalid_field",
    /** Amount invalid or negative */
    INVALID_AMOUNT = "invalid_amount",
    /** Wallet address invalid */
    INVALID_WALLET = "invalid_wallet",
    /** Resource ID invalid */
    INVALID_RESOURCE = "invalid_resource",
    /** Coupon code invalid */
    INVALID_COUPON = "invalid_coupon",
    /** Cart item invalid */
    INVALID_CART_ITEM = "invalid_cart_item",
    /** Cart is empty */
    EMPTY_CART = "empty_cart",
    /** Generic resource not found */
    RESOURCE_NOT_FOUND = "resource_not_found",
    /** Cart not found */
    CART_NOT_FOUND = "cart_not_found",
    /** Refund not found */
    REFUND_NOT_FOUND = "refund_not_found",
    /** Product not found */
    PRODUCT_NOT_FOUND = "product_not_found",
    /** Coupon not found */
    COUPON_NOT_FOUND = "coupon_not_found",
    /** Session not found */
    SESSION_NOT_FOUND = "session_not_found",
    /** Cart already paid */
    CART_ALREADY_PAID = "cart_already_paid",
    /** Refund already processed */
    REFUND_ALREADY_PROCESSED = "refund_already_processed",
    /** Coupon has expired */
    COUPON_EXPIRED = "coupon_expired",
    /** Coupon usage limit reached */
    COUPON_USAGE_LIMIT_REACHED = "coupon_usage_limit_reached",
    /** Coupon not applicable to this purchase */
    COUPON_NOT_APPLICABLE = "coupon_not_applicable",
    /** Coupon not valid for payment method */
    COUPON_WRONG_PAYMENT_METHOD = "coupon_wrong_payment_method",
    /** Stripe API error (RETRYABLE) */
    STRIPE_ERROR = "stripe_error",
    /** Solana RPC error (RETRYABLE) */
    RPC_ERROR = "rpc_error",
    /** Network communication error (RETRYABLE) */
    NETWORK_ERROR = "network_error",
    /** Internal server error */
    INTERNAL_ERROR = "internal_error",
    /** Database operation failed */
    DATABASE_ERROR = "database_error",
    /** Server configuration error */
    CONFIG_ERROR = "config_error",
    /** User doesn't have enough credits for purchase */
    INSUFFICIENT_CREDITS = "insufficient_credits",
    /** Credits hold expired before authorization */
    CREDITS_HOLD_EXPIRED = "credits_hold_expired",
    /** Credits hold not found */
    CREDITS_HOLD_NOT_FOUND = "credits_hold_not_found",
    /** Redirect URL blocked by SSRF protection */
    INVALID_REDIRECT_URL = "invalid_redirect_url",
    /** Rate limit exceeded */
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded",
    /** Admin nonce already used (replay protection) */
    NONCE_ALREADY_USED = "nonce_already_used"
}

/**
 * Payment error event detail
 */
export declare interface PaymentErrorDetail extends BaseEventDetail {
    error: string;
    resource?: string;
    itemCount?: number;
}

/**
 * Payment method for price display
 */
export declare type PaymentMethod = 'stripe' | 'x402';

/**
 * Internal callback/event payment method surfaced to consumer callbacks
 * (onPaymentAttempt / onPaymentSuccess / onPaymentError). Uses `'crypto'` for the
 * Solana flow.
 *
 * NOTE: distinct from the public `PaymentMethod` exported from
 * `@cedros/pay-react/payments` (defined in `ProductPrice`), which uses `'x402'`
 * to match the server's `payment_method` wire values. Map between the two when
 * crossing the callback/wire boundary.
 */
declare type PaymentMethod_2 = 'stripe' | 'crypto' | 'credits';

/**
 * Display payment-method-specific discount badge
 *
 * Shows badges like "3% off with crypto!" or "Save with card!" based on
 * which payment method has active coupons.
 *
 * Usage:
 * ```tsx
 * <PaymentMethodBadge product={productData} paymentMethod="x402" />
 * ```
 */
export declare function PaymentMethodBadge({ product, paymentMethod, className, style, }: PaymentMethodBadgeProps): JSX_2.Element | null;

/**
 * Props for PaymentMethodBadge component
 */
declare interface PaymentMethodBadgeProps {
    product: Product;
    paymentMethod: PaymentMethod;
    className?: string;
    style?: default_2.CSSProperties;
}

/**
 * Payment mode information returned by usePaymentMode
 */
declare interface PaymentModeInfo {
    /** True if this is a multi-item cart checkout */
    isCartMode: boolean;
    /** The primary resource ID (for single-item payments) */
    effectiveResource: string;
}

/**
 * x402 payment payload (official spec)
 * Sent in X-Payment header
 */
declare interface PaymentPayload {
    x402Version: number;
    scheme: string;
    network: string;
    payload: {
        signature: string;
        transaction: string;
        payer?: string;
        memo?: string;
        recipientTokenAccount?: string;
        metadata?: Record<string, unknown>;
    };
}

/**
 * Payment processing event detail
 */
export declare interface PaymentProcessingDetail extends BaseEventDetail {
    resource?: string;
    itemCount?: number;
}

declare interface PaymentResult {
    success: boolean;
    transactionId?: string;
    error?: string;
    settlement?: SettlementResponse;
}

export declare interface PaymentSheetSubscriptionSessionResponse {
    /** Flow discriminator for native Stripe PaymentSheet flows */
    flow: 'payment_sheet';
    /** Stripe subscription ID created server-side */
    subscriptionId?: string;
    /** Stripe PaymentIntent client secret for immediate payment flows */
    paymentIntentClientSecret?: string;
    /** Stripe SetupIntent client secret for setup-first subscription flows */
    setupIntentClientSecret?: string;
    /** Stripe customer ID for PaymentSheet customer context */
    customerId?: string;
    /** Ephemeral key secret for PaymentSheet customer context */
    customerEphemeralKeySecret?: string;
    /** Optional server session ID for analytics or follow-up verification */
    sessionId?: string;
    /** Optional hosted URL when the backend also creates a fallback redirect flow */
    url?: string;
    /** Stripe subscription status when no client confirmation is required */
    status?: string;
}

/**
 * Payment start event detail
 */
export declare interface PaymentStartDetail extends BaseEventDetail {
    resource?: string;
    itemCount?: number;
}

/**
 * Payment state
 */
export declare interface PaymentState {
    status: PaymentStatus;
    error: string | null;
    transactionId: string | null;
}

declare type PaymentStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * Payment success event detail
 */
export declare interface PaymentSuccessDetail extends BaseEventDetail {
    transactionId: string;
    resource?: string;
    itemCount?: number;
}

/**
 * Request to prepare a Solana program-managed subscription for a configured plan.
 */
export declare interface PrepareSolanaSubscriptionRequest {
    /** Cedros plan ID */
    planId: string;
    /** Billing interval */
    interval: SolanaBillingInterval;
    /** Subscriber wallet address */
    wallet: string;
    /** Number of future payments the wallet should authorize */
    numberOfPayments?: number;
}

/**
 * On-chain plan terms returned by /subscription/plan/solana-subscription.
 */
export declare interface PrepareSolanaSubscriptionResponse {
    method: 'solana_subscription';
    planId: string;
    resource: string;
    userId: string;
    wallet: string;
    network: string;
    programAddress: string;
    merchantAddress: string;
    solanaPlanId: number;
    planAddress: string;
    planBump: number;
    subscriptionAddress: string;
    subscriptionAuthorityAddress: string;
    eventAuthorityAddress: string;
    subscriberTokenAccount: string;
    tokenMint: string;
    tokenProgramAddress: string;
    receiverTokenAccount?: string;
    collectorAddress: string;
    amountAtomic: number;
    periodHours: number;
    numberOfPayments: number;
    expectedAmount: number;
    expectedPeriodHours: number;
    expectedCreatedAt?: number;
    expectedSubscriptionAuthorityInitId?: number;
}

/**
 * Product from /paywall/v1/products endpoint
 * Includes payment-method-specific pricing and coupons
 */
declare interface Product {
    id: string;
    description: string;
    fiatAmount: number;
    fiatCurrency: string;
    cryptoAmount: number;
    cryptoToken: string;
    effectiveFiatAmount: number;
    effectiveCryptoAmount: number;
    hasStripeCoupon: boolean;
    hasCryptoCoupon: boolean;
    stripeCouponCode: string;
    cryptoCouponCode: string;
    stripeDiscountPercent: number;
    cryptoDiscountPercent: number;
    creditsAmount?: number;
    effectiveCreditsAmount?: number;
    hasCreditsDiscount?: boolean;
    creditsDiscountPercent?: number;
}

/**
 * Display product price based on selected payment method
 *
 * Shows the effective price (after auto-applied coupons) for the selected
 * payment method. Optionally shows original price with strikethrough if
 * a discount is applied.
 *
 * Usage:
 * ```tsx
 * <ProductPrice
 *   product={productData}
 *   paymentMethod="x402"
 *   showOriginalPrice={true}
 * />
 * ```
 */
export declare function ProductPrice({ product, paymentMethod, showOriginalPrice, className, style, }: ProductPriceProps): JSX_2.Element;

/**
 * Props for ProductPrice component
 */
declare interface ProductPriceProps {
    product: Product;
    paymentMethod: PaymentMethod;
    showOriginalPrice?: boolean;
    className?: string;
    style?: default_2.CSSProperties;
}

/**
 * Proration behavior when changing subscriptions
 */
export declare type ProrationBehavior = 'create_prorations' | 'none' | 'always_invoice';

/**
 * Preset rate limiter configurations for common use cases
 */
export declare const RATE_LIMITER_PRESETS: {
    /** 10 requests per minute - recommended for payment requests */
    readonly PAYMENT: {
        readonly maxRequests: 10;
        readonly windowMs: 60000;
    };
    /** 30 requests per minute - for quote fetching */
    readonly QUOTE: {
        readonly maxRequests: 30;
        readonly windowMs: 60000;
    };
    /** 5 requests per minute - strict limit for sensitive operations */
    readonly STRICT: {
        readonly maxRequests: 5;
        readonly windowMs: 60000;
    };
    /** 100 requests per minute - permissive for UI interactions */
    readonly PERMISSIVE: {
        readonly maxRequests: 100;
        readonly windowMs: 60000;
    };
};

export declare interface RateLimiter {
    /** Try to consume a token. Returns true if request is allowed, false if rate limited */
    tryConsume: () => boolean;
    /** Get remaining tokens available */
    getAvailableTokens: () => number;
    /** Get time until next token refill (in ms) */
    getTimeUntilRefill: () => number;
    /** Reset the rate limiter (useful for testing or manual override) */
    reset: () => void;
}

/**
 * Rate Limiter - Token Bucket Algorithm
 *
 * Prevents spamming backend with payment requests by enforcing
 * a maximum number of requests per time window.
 *
 * Features:
 * - Token bucket algorithm (allows bursts, enforces long-term rate)
 * - Automatic token refill over time
 * - Thread-safe (uses timestamps, not intervals)
 * - Memory efficient (no timers or intervals)
 *
 * Usage:
 * ```typescript
 * const limiter = createRateLimiter({ maxRequests: 10, windowMs: 60000 });
 *
 * if (limiter.tryConsume()) {
 *   await makePaymentRequest();
 * } else {
 *   console.error('Rate limit exceeded');
 * }
 * ```
 */
export declare interface RateLimiterConfig {
    /** Maximum number of requests allowed per time window */
    maxRequests: number;
    /** Time window in milliseconds */
    windowMs: number;
}

export declare interface RedirectCheckoutSubscriptionSessionResponse {
    /** Flow discriminator for browser/mobile redirect checkout */
    flow?: 'redirect_checkout';
    /** Stripe checkout session ID */
    sessionId: string;
    /** Stripe checkout URL */
    url: string;
}

/** Input for requesting an x402 (crypto) refund. The buyer never signs — the server
 * sends the refunded tokens to `recipientWallet` after an admin approves it. */
export declare interface RefundRequestInput {
    /** The original x402 purchase's on-chain signature. */
    originalPurchaseId: string;
    /** The Solana wallet (owner) that should receive the refunded tokens. */
    recipientWallet: string;
    /** Optional human-readable reason. */
    reason?: string;
}

/** Status of an x402 refund, as returned by POST /paywall/v1/refunds/request and
 * GET /paywall/v1/refunds/{refundId}. Amount is integer cents (never a float). */
export declare interface RefundStatus {
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

export declare type ResolvedFeatureFlags = Record<FeatureFlagName, boolean>;

export declare function resolveFeatureFlags(options?: ResolveFeatureFlagsOptions): ResolvedFeatureFlags;

export declare type ResolveFeatureFlagsOptions = {
    featureFlags?: FeatureFlagOverrides;
    env?: FeatureFlagEnv;
};

/**
 * Preset retry configurations
 */
export declare const RETRY_PRESETS: {
    /** Quick retries for transient errors (3 retries, 1s initial, 2x backoff) */
    readonly QUICK: {
        readonly maxRetries: 3;
        readonly initialDelayMs: 1000;
        readonly backoffFactor: 2;
        readonly maxDelayMs: 10000;
    };
    /** Standard retries (3 retries, 2s initial, 2x backoff) */
    readonly STANDARD: {
        readonly maxRetries: 3;
        readonly initialDelayMs: 2000;
        readonly backoffFactor: 2;
        readonly maxDelayMs: 30000;
    };
    /** Aggressive retries for critical operations (5 retries, 500ms initial) */
    readonly AGGRESSIVE: {
        readonly maxRetries: 5;
        readonly initialDelayMs: 500;
        readonly backoffFactor: 1.5;
        readonly maxDelayMs: 15000;
    };
    /** Patient retries for slow backends (5 retries, 5s initial) */
    readonly PATIENT: {
        readonly maxRetries: 5;
        readonly initialDelayMs: 5000;
        readonly backoffFactor: 2;
        readonly maxDelayMs: 60000;
    };
    /** At most one retry for writes with a real idempotency guarantee */
    readonly IDEMPOTENT_WRITE: {
        readonly maxRetries: 1;
        readonly initialDelayMs: 1000;
        readonly backoffFactor: 2;
        readonly maxDelayMs: 10000;
    };
    /** Never automatically retry non-idempotent writes */
    readonly WRITE_ONCE: {
        readonly maxRetries: 0;
        readonly initialDelayMs: 1000;
        readonly backoffFactor: 2;
        readonly maxDelayMs: 10000;
    };
};

/**
 * Exponential Backoff and Retry Logic
 *
 * Implements retry logic with exponential backoff for failed requests.
 * Prevents hammering failing services and gives them time to recover.
 *
 * Features:
 * - Exponential delay with jitter
 * - Configurable max retries and max delay
 * - Automatic retry for retryable errors
 * - Respects Retry-After header (429 responses)
 *
 * Usage:
 * ```typescript
 * const result = await retryWithBackoff(
 *   async () => await fetch('/api/payment'),
 *   { maxRetries: 3, initialDelayMs: 1000 }
 * );
 * ```
 */
export declare interface RetryConfig {
    /** Maximum number of retry attempts (default: 3) */
    maxRetries?: number;
    /** Initial delay in milliseconds (default: 1000) */
    initialDelayMs?: number;
    /** Backoff multiplier (default: 2) */
    backoffFactor?: number;
    /** Maximum delay in milliseconds (default: 30000) */
    maxDelayMs?: number;
    /** Add random jitter to prevent thundering herd (default: true) */
    jitter?: boolean;
    /** Custom function to determine if error is retryable */
    shouldRetry?: (error: Error, attempt: number) => boolean;
    /** Optional name for logging */
    name?: string;
    /** Optional key used to coalesce identical in-flight operations */
    inFlightKey?: string;
}

export declare interface RetryStats {
    attempts: number;
    totalDelay: number;
    lastError: Error | null;
}

/**
 * Retry a function with exponential backoff
 *
 * @param fn - Async function to retry
 * @param config - Retry configuration
 * @returns Promise that resolves with function result
 * @throws Last error if all retries fail
 *
 * @example
 * ```typescript
 * // Retry payment creation with default config
 * const session = await retryWithBackoff(
 *   async () => await createPaymentSession(),
 *   { name: 'create-session' }
 * );
 *
 * // Custom retry policy
 * const result = await retryWithBackoff(
 *   async () => await fetchQuote(),
 *   {
 *     maxRetries: 5,
 *     initialDelayMs: 500,
 *     backoffFactor: 1.5,
 *     shouldRetry: (error) => error.message.includes('TEMP'),
 *   }
 * );
 * ```
 */
export declare function retryWithBackoff<T>(fn: () => Promise<T>, config?: RetryConfig): Promise<T>;

/**
 * Common RPC provider patterns for convenience
 *
 * SECURITY NOTE: These use wildcard subdomains for provider flexibility.
 * In production, consider using specific endpoints instead of wildcards.
 * Pass these to customRpcProviders array in CSPConfig.
 */
export declare const RPC_PROVIDERS: {
    readonly HELIUS: "https://*.helius-rpc.com";
    readonly QUICKNODE: "https://*.quicknode.pro";
    readonly ALCHEMY: "https://*.alchemy.com";
    readonly ANKR: "https://rpc.ankr.com";
    readonly TRITON: "https://*.rpcpool.com";
};

/**
 * Security recommendations for production deployment
 */
export declare const SECURITY_RECOMMENDATIONS: {
    readonly CSP: "Use generateCSP() from @cedros/pay-react to generate Content Security Policy headers";
    readonly HTTPS: "Always serve payment pages over HTTPS in production";
    readonly PACKAGE_UPDATES: "Keep @stripe/stripe-js and @cedros/pay-react updated for security patches";
    readonly AUDIT: "Run npm audit regularly to check for known vulnerabilities";
    readonly MONITORING: "Monitor Stripe security advisories and apply updates promptly";
    readonly NO_SRI: "Do NOT use SRI hashes for Stripe.js - use CSP instead";
};

/**
 * Security Validation Utilities
 *
 * Provides runtime security checks and recommendations for Cedros Pay deployments.
 * Helps developers identify potential security issues during development.
 */
/**
 * Security check result
 */
export declare interface SecurityCheckResult {
    passed: boolean;
    severity: 'info' | 'warning' | 'error';
    message: string;
    recommendation?: string;
}

/**
 * Security validation report
 */
export declare interface SecurityReport {
    checks: SecurityCheckResult[];
    overallStatus: 'secure' | 'warnings' | 'vulnerable';
    summary: string;
}

export declare function selectPlural<T extends string>(count: number, forms: Partial<Record<Intl.LDMLPluralRule, T>> & {
    other: T;
}, locale?: string): T;

export declare interface SendSolanaLifecycleTransactionOptions extends BuildSolanaLifecycleTransactionOptions {
    provider?: BrowserSolanaProvider_2;
    rpcEndpoint?: string;
}

export declare interface SendSolanaPlanTransactionOptions extends BuildSolanaPlanTransactionOptions {
    provider?: BrowserSolanaProvider_3;
    rpcEndpoint?: string;
    network?: string;
}

declare interface SendSolanaPlanTransactionResult {
    signature: string;
    planAddress: string;
    createdAt?: number;
}

export declare function sendSolanaSubscriptionLifecycleTransaction(options: SendSolanaLifecycleTransactionOptions): Promise<string>;

export declare function sendSolanaSubscriptionPlanTransaction(options: SendSolanaPlanTransactionOptions): Promise<SendSolanaPlanTransactionResult>;

export declare interface SettlementResponse {
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
 * Options for signing a transaction
 */
declare interface SignTransactionOptions {
    transaction: Transaction;
    signTransaction: (tx: Transaction) => Promise<Transaction>;
}

declare type SolanaBillingInterval = 'monthly' | 'yearly';

/**
 * Core types for Cedros Pay.
 */
export declare type SolanaCluster = 'mainnet-beta' | 'devnet' | 'testnet';

declare interface SolanaLifecycleOptions {
    provider?: Parameters<typeof sendSolanaSubscriptionLifecycleTransaction>[0]['provider'];
    rpcEndpoint?: string;
}

export declare type SolanaPlanLifecycleAction = 'create' | 'update' | 'delete';

export declare interface SolanaPlanTransaction {
    transaction: Transaction;
    planAddress: string;
}

export declare interface SolanaSubscriptionAuthorizationTransaction {
    transaction: Transaction;
    planAddress: string;
    subscriptionAddress: string;
    subscriptionAuthorityAddress: string;
}

export declare interface SolanaSubscriptionCheckoutOptions {
    prepareEndpoint: string;
    activateEndpoint: string;
    authToken: string;
    planId: string;
    interval: Extract<BillingInterval, 'monthly' | 'yearly'>;
    numberOfPayments?: number;
    rpcEndpoint?: string;
    provider?: BrowserSolanaProvider;
}

declare type SolanaSubscriptionLifecycleAction = 'cancel' | 'resume' | 'revoke' | 'revoke_authority' | 'close_authority';

declare interface SolanaSubscriptionPlanConfig {
    enabled?: boolean;
    planId: number;
    monthlyPlanId?: number;
    annualPlanId?: number;
    merchantAddress: string;
    tokenMint: string;
    tokenProgramAddress?: string;
    receiverTokenAccount?: string;
    collectorAddress?: string;
    planAddress?: string;
    monthlyPlanAddress?: string;
    annualPlanAddress?: string;
    programAddress?: string;
    monthlyAmountAtomic?: number;
    annualAmountAtomic?: number;
    monthlyPeriodHours?: number;
    annualPeriodHours?: number;
    expectedCreatedAt?: number;
    monthlyExpectedCreatedAt?: number;
    annualExpectedCreatedAt?: number;
    expectedSubscriptionAuthorityInitId?: number;
    metadataUri?: string;
    endTs?: number;
    monthlyEndTs?: number;
    annualEndTs?: number;
    destinations?: string[];
    pullers?: string[];
    status?: 'active' | 'sunset';
    monthlyStatus?: 'active' | 'sunset';
    annualStatus?: 'active' | 'sunset';
}

export declare interface SolanaSubscriptionState {
    programAddress: string;
    merchantAddress: string;
    solanaPlanId: number;
    planAddress?: string;
    subscriptionAddress: string;
    subscriptionAuthorityAddress?: string;
    tokenMint: string;
    tokenProgramAddress: string;
    receiverTokenAccount?: string;
    collectorAddress?: string;
    amountAtomic: number;
    periodHours: number;
    numberOfPayments: number;
    paymentsCollected: number;
    nextCollectionAt: string;
    status: string;
}

declare type SolanaSubscriptionStatus = 'active' | 'past_due' | 'cancel_pending' | 'cancelled' | 'exhausted';

/**
 * Apply stacked coupons to a price using the same logic as the backend.
 *
 * Keep this aligned with the backend StackCouponsOnMoney() behavior:
 * 1. Apply all percentage discounts first (multiplicatively)
 * 2. Sum all fixed discounts and apply at the end
 * 3. Round to cents (2 decimal places) at the end
 *
 * @param subtotal - Original cart subtotal before checkout coupons
 * @param checkoutCoupons - Array of checkout-level coupons from /products endpoint
 * @returns Final price after all discounts applied, rounded to cents
 *
 * @example
 * // Cart: $1.20, Coupons: [5% off, $0.50 off]
 * stackCheckoutCoupons(1.20, [
 *   { code: "CRYPTO5AUTO", discountType: "percentage", discountValue: 5 },
 *   { code: "FIXED5", discountType: "fixed", discountValue: 0.50 }
 * ])
 * // Step 1: Apply 5%: $1.20 × 0.95 = $1.14
 * // Step 2: Apply $0.50: $1.14 - $0.50 = $0.64
 * // Returns: 0.64
 *
 * @example
 * // Multiple percentage discounts (stacked multiplicatively)
 * stackCheckoutCoupons(100, [
 *   { code: "SAVE10", discountType: "percentage", discountValue: 10 },
 *   { code: "EXTRA20", discountType: "percentage", discountValue: 20 },
 *   { code: "DOLLAR1", discountType: "fixed", discountValue: 1 },
 *   { code: "HALFOFF", discountType: "fixed", discountValue: 0.50 }
 * ])
 * // Step 1: $100 × 0.9 = $90
 * // Step 2: $90 × 0.8 = $72
 * // Step 3: $72 - $1.50 = $70.50
 * // Returns: 70.50
 */
export declare function stackCheckoutCoupons(subtotal: number, checkoutCoupons: Coupon[]): number;

export declare function startSolanaSubscriptionCheckout(options: SolanaSubscriptionCheckoutOptions): Promise<ActivateSolanaSubscriptionResponse>;

/**
 * Button component for Stripe subscription checkout
 *
 * Handles redirect to Stripe-hosted subscription checkout
 *
 * @example
 * ```tsx
 * <SubscribeButton
 *   resource="plan-pro"
 *   interval="monthly"
 *   trialDays={14}
 *   onSuccess={(sessionId) => console.log('Redirecting...', sessionId)}
 *   onError={() => showSubscriptionUnavailable()}
 * />
 * ```
 */
export declare function SubscribeButton({ resource, interval, intervalDays, trialDays, successUrl, cancelUrl, customerEmail, label, disabled, onAttempt, onSuccess, onError, className, }: SubscribeButtonProps): JSX_2.Element;

/**
 * Props for SubscribeButton component
 */
declare interface SubscribeButtonProps {
    /** Resource/plan ID for the subscription */
    resource: string;
    /** Billing interval */
    interval: BillingInterval;
    /** Custom interval in days (only used when interval is 'custom') */
    intervalDays?: number;
    /** Number of trial days (0 for no trial) */
    trialDays?: number;
    /** URL to redirect on success */
    successUrl?: string;
    /** URL to redirect on cancel */
    cancelUrl?: string;
    /** Customer email (pre-fills Stripe checkout) */
    customerEmail?: string;
    /** Custom button label */
    label?: string;
    /** Disable button */
    disabled?: boolean;
    /** Track subscription attempt for analytics */
    onAttempt?: (method: 'stripe' | 'crypto') => void;
    /** Callback on successful subscription redirect */
    onSuccess?: (sessionId: string) => void;
    /** Callback on error */
    onError?: (error: string) => void;
    /** Additional CSS class */
    className?: string;
}

/**
 * Full subscription details (for management UI)
 */
export declare interface SubscriptionDetails {
    /** Unique subscription ID */
    id: string;
    /** Resource/plan ID */
    resource: string;
    /** Current status */
    status: SubscriptionStatus;
    /** Billing interval */
    interval: BillingInterval;
    /** Custom interval in days (for 'custom' interval) */
    intervalDays?: number;
    /** Price per period (in cents for fiat, atomic units for crypto) */
    pricePerPeriod: number;
    /** Currency (e.g., "USD", "USDC") */
    currency: string;
    /** Whether subscription will cancel at period end */
    cancelAtPeriodEnd: boolean;
    /** Current period start (ISO 8601) */
    currentPeriodStart: string;
    /** Current period end (ISO 8601) */
    currentPeriodEnd: string;
    /** When subscription was created (ISO 8601) */
    createdAt: string;
    /** Payment method type */
    paymentMethod: 'stripe' | 'x402' | 'credits' | 'free' | 'solana_subscription';
    /** Stripe customer ID when present */
    customerId?: string;
    /** Solana program-managed subscription state when paymentMethod is solana_subscription */
    solana?: SubscriptionDetailsSolanaState;
    /** Trial end date if in trial (ISO 8601) */
    trialEnd?: string;
}

declare interface SubscriptionDetailsSolanaState {
    network: string;
    wallet: string;
    programAddress: string;
    merchantAddress: string;
    solanaPlanId: number;
    planAddress?: string;
    subscriptionAddress: string;
    subscriptionAuthorityAddress?: string;
    eventAuthorityAddress?: string;
    subscriberTokenAccount?: string;
    tokenMint: string;
    tokenProgramAddress: string;
    receiverTokenAccount?: string;
    collectorAddress?: string;
    amountAtomic: number;
    periodHours: number;
    numberOfPayments: number;
    paymentsCollected: number;
    nextCollectionAt: string;
    status: SolanaSubscriptionStatus;
}

/**
 * Subscription management panel component
 *
 * Provides a UI for viewing and managing existing subscriptions:
 * - View current subscription details
 * - Upgrade or downgrade to different plans
 * - Cancel subscription
 * - Access Stripe billing portal
 *
 * @example
 * ```tsx
 * <SubscriptionManagementPanel
 *   resource="plan-pro"
 *   userId="user@example.com"
 *   availablePlans={[
 *     { resource: 'plan-basic', name: 'Basic', price: 999, currency: 'USD', interval: 'monthly' },
 *     { resource: 'plan-pro', name: 'Pro', price: 1999, currency: 'USD', interval: 'monthly' },
 *     { resource: 'plan-enterprise', name: 'Enterprise', price: 4999, currency: 'USD', interval: 'monthly' },
 *   ]}
 *   onSubscriptionChanged={(newResource) => console.log('Changed to:', newResource)}
 *   showBillingPortal
 * />
 * ```
 */
export declare function SubscriptionManagementPanel({ resource, userId, availablePlans, onSubscriptionChanged, onSubscriptionCanceled, billingPortalReturnUrl, showBillingPortal, solanaProvider, solanaRpcEndpoint, className, style, }: SubscriptionManagementPanelProps): JSX_2.Element;

/**
 * Props for SubscriptionManagementPanel
 */
export declare interface SubscriptionManagementPanelProps {
    /** Current plan resource ID */
    resource: string;
    /** User identifier (email, customer ID, or wallet address) */
    userId: string;
    /** Available plans for upgrade/downgrade */
    availablePlans?: AvailablePlan[];
    /** Callback when subscription is successfully changed */
    onSubscriptionChanged?: (newResource: string, newInterval: BillingInterval) => void;
    /** Callback when subscription is canceled */
    onSubscriptionCanceled?: () => void;
    /** Return URL for billing portal */
    billingPortalReturnUrl?: string;
    /** Show billing portal button (Stripe subscriptions only) */
    showBillingPortal?: boolean;
    /** Optional Solana wallet provider override for lifecycle actions */
    solanaProvider?: SolanaLifecycleOptions['provider'];
    /** Optional Solana RPC endpoint override for lifecycle actions */
    solanaRpcEndpoint?: string;
    /** Custom class name */
    className?: string;
    /** Custom styles */
    style?: React.CSSProperties;
}

/**
 * State for subscription management operations
 */
export declare interface SubscriptionManagementState {
    /** Current operation status */
    status: 'idle' | 'loading' | 'success' | 'error';
    /** Error message if status is 'error' */
    error: string | null;
    /** Full subscription details */
    subscription: SubscriptionDetails | null;
    /** Preview of a pending change */
    changePreview: ChangePreviewResponse | null;
    /** User ID used to load the subscription (wallet address, email, or customer ID) */
    userId: string | null;
}

/**
 * Subscription payment result
 * Extends PaymentResult with subscription-specific fields
 */
export declare interface SubscriptionPaymentResult extends PaymentResult {
    /** Subscription status after payment */
    subscriptionStatus?: SubscriptionStatus;
    /** New expiry date after payment (ISO 8601) */
    expiresAt?: string;
    /** Current billing period end (ISO 8601) */
    currentPeriodEnd?: string;
}

/**
 * x402 subscription quote
 * Extends standard X402Requirement with subscription-specific details
 */
export declare interface SubscriptionQuote {
    /** Standard x402 payment requirement */
    requirement: X402Requirement;
    /** Subscription-specific details */
    subscription: {
        /** Billing interval */
        interval: BillingInterval;
        /** Custom interval in days (for 'custom' interval) */
        intervalDays?: number;
        /** Duration in seconds this payment covers */
        durationSeconds: number;
        /** When the subscription period starts (ISO 8601) */
        periodStart: string;
        /** When the subscription period ends (ISO 8601) */
        periodEnd: string;
    };
}

/**
 * Options for requesting a subscription quote (x402)
 */
export declare interface SubscriptionQuoteOptions {
    /** Coupon code for discount */
    couponCode?: string;
    /** Custom interval in days (for 'custom' interval) */
    intervalDays?: number;
}

/**
 * Response from subscription session creation
 */
export declare type SubscriptionSessionFlow = 'redirect_checkout' | 'payment_sheet';

/**
 * Request to create a Stripe subscription session
 */
export declare interface SubscriptionSessionRequest {
    /** Resource/plan ID for the subscription */
    resource: string;
    /** Billing interval */
    interval: BillingInterval;
    /** Custom interval in days (only used when interval is 'custom') */
    intervalDays?: number;
    /** Number of trial days (0 for no trial) */
    trialDays?: number;
    /** Customer email (pre-fills Stripe checkout) */
    customerEmail?: string;
    /** URL to redirect on success */
    successUrl?: string;
    /** URL to redirect on cancel */
    cancelUrl?: string;
}

export declare type SubscriptionSessionResponse = RedirectCheckoutSubscriptionSessionResponse | PaymentSheetSubscriptionSessionResponse;

/**
 * Subscription payment state
 */
export declare interface SubscriptionState {
    /** Current state of the subscription flow */
    status: 'idle' | 'loading' | 'checking' | 'success' | 'error';
    /** Error message if status is 'error' */
    error: string | null;
    /** Stripe checkout session ID (for redirect flow) */
    sessionId: string | null;
    /** Subscription status after verification */
    subscriptionStatus: SubscriptionStatus | null;
    /** When subscription expires (ISO 8601) */
    expiresAt: string | null;
}

/**
 * Subscription status
 */
export declare type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'expired';

/**
 * Request to check subscription status
 */
export declare interface SubscriptionStatusRequest {
    /** Resource/plan ID */
    resource: string;
    /** User identifier (wallet address for crypto, email/customer ID for Stripe) */
    userId: string;
}

/**
 * Response from subscription status check
 */
export declare interface SubscriptionStatusResponse {
    /** Whether subscription is currently active */
    active: boolean;
    /** Current subscription status */
    status: SubscriptionStatus;
    /** Subscription expiry timestamp (ISO 8601) */
    expiresAt?: string;
    /** Current billing period end timestamp (ISO 8601) */
    currentPeriodEnd?: string;
    /** Billing interval */
    interval?: BillingInterval;
    /** Whether subscription will cancel at period end */
    cancelAtPeriodEnd?: boolean;
}

export declare type TextDirection = 'ltr' | 'rtl';

/**
 * Validation result for token mint checks
 */
declare interface TokenMintValidationResult {
    isValid: boolean;
    isKnownStablecoin: boolean;
    symbol?: string;
    warning?: string;
    error?: string;
}

export declare type TranslateFn = (key: string, params?: Record<string, TranslateParam>) => string;

/**
 * Translation function type
 */
declare type TranslateParam = string | number | Date;

/**
 * Translation structure matching translations/*.json files
 */
export declare interface Translations {
    locale: string;
    ui: {
        pay_with_card: string;
        pay_with_crypto: string;
        pay_with_usdc: string;
        pay_with_credits: string;
        purchase: string;
        card: string;
        usdc_solana: string;
        crypto: string;
        credits: string;
        connect_wallet: string;
        connecting: string;
        processing: string;
        loading: string;
        close: string;
        cancel: string;
        confirm: string;
        retry: string;
        go_back: string;
        contact_support: string;
        disconnect: string;
        payment_successful: string;
        subscribe: string;
        subscribe_with_crypto: string;
        subscribe_with_credits: string;
        subscribed: string;
        subscribed_until: string;
        subscription_active: string;
        redirecting_to_checkout: string;
    };
    errors: {
        [errorCode: string]: {
            message: string;
            action?: string;
        };
    };
    validation: {
        unknown_token_mint: string;
        token_typo_warning: string;
    };
    wallet: {
        no_wallet_detected: string;
        install_wallet: string;
        wallet_not_connected: string;
        connect_your_wallet: string;
        wallet_connection_failed: string;
        try_again: string;
        transaction_rejected: string;
        approve_in_wallet: string;
        select_wallet: string;
        change: string;
    };
}

/**
 * Hook to access Cedros context
 *
 * @throws Error if used outside CedrosProvider
 */
export declare function useCedrosContext(): CedrosContextValue;

/**
 * Access current Cedros theme settings and utilities.
 *
 * Provides:
 * - `mode`: the active theme mode
 * - `setMode`: update the theme at runtime
 * - `tokens`: resolved color tokens
 * - `className`: CSS class to apply for theming
 * - `style`: CSS variables for inline application
 */
export declare function useCedrosTheme(): CedrosThemeContextValue;

/**
 * Reads the locale override from CedrosProvider before falling back to browser
 * locale detection.
 */
export declare function useCedrosTranslation(): UseTranslationResult;

/**
 * Hook for checking purchase compliance before Stripe checkout.
 *
 * Calls `POST /paywall/v1/compliance-check` with the given resource IDs
 * and returns the server's verdict (cleared / blocked with reasons).
 *
 * @example
 * ```tsx
 * const { checkCompliance, loading, result } = useComplianceCheck();
 * await checkCompliance(['product-1']);
 * if (result?.cleared) { // proceed }
 * ```
 */
export declare function useComplianceCheck(): {
    checkCompliance: (resources: string[], authToken?: string, wallet?: string) => Promise<ComplianceCheckResult>;
    loading: boolean;
    result: ComplianceCheckResult | null;
    error: string | null;
};

/**
 * Hook that fetches and tracks the authenticated user's credits balance.
 *
 * @param authToken - JWT token from cedros-login. Balance is fetched when provided.
 * @returns Credits balance state including available, held, currency, and refresh function.
 *
 * @example
 * ```tsx
 * function BalanceDisplay({ authToken }: { authToken: string }) {
 *   const { available, currency, loading } = useCreditsBalance(authToken);
 *   if (loading) return <span>Loading…</span>;
 *   return <span>{available} {currency}</span>;
 * }
 * ```
 */
export declare function useCreditsBalance(authToken?: string): CreditsBalanceState;

/**
 * Hook for credits subscription payments
 *
 * Handles:
 * - Checking subscription status
 * - Requesting subscription quotes with credits
 * - Processing credits subscription payments
 *
 * @example
 * ```tsx
 * function CreditsSubscribePage() {
 *   const { checkStatus, processPayment, status, subscriptionStatus } = useCreditsSubscription();
 *
 *   const handleSubscribe = async () => {
 *     await processPayment('plan-pro', 'monthly', authToken);
 *   };
 * }
 * ```
 */
export declare function useCreditsSubscription(): {
    checkStatus: (resource: string, userId: string) => Promise<SubscriptionStatusResponse | null>;
    requestQuote: (resource: string, _interval: BillingInterval, options?: CreditsSubscriptionOptions) => Promise<CreditsRequirement | null>;
    processPayment: (resource: string, interval: BillingInterval, authToken: string, options?: CreditsSubscriptionOptions) => Promise<PaymentResult>;
    reset: () => void;
    /** Credits requirement from subscription quote */
    creditsRequirement: CreditsRequirement | null;
    status: "idle" | "loading" | "checking" | "success" | "error";
    error: string | null;
    sessionId: string | null;
    subscriptionStatus: SubscriptionStatus | null;
    expiresAt: string | null;
};

/**
 * Hook for x402 crypto subscription payments
 *
 * Handles:
 * - Checking subscription status
 * - Requesting subscription quotes
 * - Processing crypto subscription payments
 *
 * @example
 * ```tsx
 * function CryptoSubscribePage() {
 *   const { checkStatus, processPayment, status, subscriptionStatus, expiresAt } = useCryptoSubscription();
 *
 *   // Check subscription on mount
 *   useEffect(() => {
 *     if (publicKey) {
 *       checkStatus({ resource: 'plan-pro', userId: publicKey.toString() });
 *     }
 *   }, [publicKey]);
 *
 *   // Process subscription payment
 *   const handleSubscribe = async () => {
 *     await processPayment('plan-pro', 'monthly');
 *   };
 * }
 * ```
 */
export declare function useCryptoSubscription(): {
    quote: SubscriptionQuote | null;
    checkStatus: (resource: string) => Promise<SubscriptionStatusResponse | null>;
    requestQuote: (resource: string, interval: BillingInterval, options?: SubscriptionQuoteOptions) => Promise<SubscriptionQuote | null>;
    processPayment: (resource: string, interval: BillingInterval, options?: SubscriptionQuoteOptions) => Promise<PaymentResult>;
    reset: () => void;
    status: "idle" | "loading" | "checking" | "success" | "error";
    error: string | null;
    sessionId: string | null;
    subscriptionStatus: SubscriptionStatus | null;
    expiresAt: string | null;
};

/**
 * Get error message in current locale
 *
 * Convenience function for getting localized error messages.
 * Uses the translation hook internally.
 *
 * @param errorCode - Error code string
 * @param includeAction - Whether to include action guidance
 * @returns Localized error message
 *
 * @example
 * ```tsx
 * function ErrorDisplay({ error }: { error: PaymentError }) {
 *   const errorMessage = useLocalizedError(error.code);
 *   return <div>{errorMessage}</div>;
 * }
 * ```
 */
export declare function useLocalizedError(errorCode: string, includeAction?: boolean): string;

/**
 * Hook to resolve payment mode
 *
 * Determines whether a payment is single-item or cart-based.
 *
 * @param resource - Optional single resource ID (for single-item payments)
 * @param items - Optional array of cart items (for cart payments)
 * @returns PaymentModeInfo object with computed payment mode data
 *
 * @example
 * // Single resource payment
 * const { isCartMode, effectiveResource } = usePaymentMode('item-1');
 * // Returns: { isCartMode: false, effectiveResource: 'item-1' }
 *
 * @example
 * // Single item in cart
 * const { isCartMode, effectiveResource } = usePaymentMode(undefined, [{ resource: 'item-1', quantity: 1 }]);
 * // Returns: { isCartMode: false, effectiveResource: 'item-1' }
 *
 * @example
 * // Multiple items in cart
 * const { isCartMode } = usePaymentMode(undefined, [
 *   { resource: 'item-1', quantity: 2 },
 *   { resource: 'item-2', quantity: 1 }
 * ]);
 * // Returns: { isCartMode: true, effectiveResource: '' }
 */
export declare function usePaymentMode(resource?: string, items?: CartItem[]): PaymentModeInfo;

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
    state: PaymentState;
    refund: RefundStatus | null;
    requestRefund: (input: RefundRequestInput) => Promise<RefundStatus>;
    refreshStatus: (refundId: string) => Promise<RefundStatus>;
    reset: () => void;
};

/**
 * Hook for subscription management
 *
 * Handles:
 * - Creating Stripe subscription sessions and redirecting to checkout
 * - Checking subscription status (for x402 gating)
 * - Requesting subscription quotes (for x402 crypto payments)
 *
 * @example
 * ```tsx
 * function SubscribePage() {
 *   const { processSubscription, checkStatus, status, error } = useSubscription();
 *
 *   const handleSubscribe = async () => {
 *     await processSubscription({
 *       resource: 'plan-pro',
 *       interval: 'monthly',
 *     });
 *   };
 *
 *   return (
 *     <button onClick={handleSubscribe} disabled={status === 'loading'}>
 *       {status === 'loading' ? 'Processing...' : 'Subscribe'}
 *     </button>
 *   );
 * }
 * ```
 */
export declare function useSubscription(): {
    processSubscription: (request: SubscriptionSessionRequest) => Promise<PaymentResult>;
    checkStatus: (request: SubscriptionStatusRequest) => Promise<SubscriptionStatusResponse>;
    requestQuote: (resource: string, interval: BillingInterval, options?: SubscriptionQuoteOptions) => Promise<SubscriptionQuote>;
    reset: () => void;
    status: "idle" | "loading" | "checking" | "success" | "error";
    error: string | null;
    sessionId: string | null;
    subscriptionStatus: SubscriptionStatus | null;
    expiresAt: string | null;
};

/**
 * Hook for managing existing subscriptions (upgrade, downgrade, cancel)
 *
 * @example
 * ```tsx
 * function SubscriptionSettings({ userId }: { userId: string }) {
 *   const {
 *     subscription,
 *     status,
 *     error,
 *     loadSubscription,
 *     previewChange,
 *     changeSubscription,
 *     cancelSubscription,
 *     openBillingPortal,
 *   } = useSubscriptionManagement();
 *
 *   useEffect(() => {
 *     loadSubscription('plan-pro', userId);
 *   }, [userId]);
 *
 *   const handleUpgrade = async () => {
 *     const preview = await previewChange('plan-pro', 'plan-enterprise', userId);
 *     if (preview && confirm(`Upgrade for $${preview.immediateAmount / 100}?`)) {
 *       await changeSubscription({ newResource: 'plan-enterprise' });
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       {subscription && (
 *         <div>
 *           <p>Plan: {subscription.resource}</p>
 *           <p>Status: {subscription.status}</p>
 *           <button onClick={handleUpgrade}>Upgrade</button>
 *           <button onClick={() => cancelSubscription()}>Cancel</button>
 *         </div>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export declare function useSubscriptionManagement(): {
    loadSubscription: (resource: string, userId: string) => Promise<SubscriptionDetails | null>;
    previewChange: (currentResource: string, newResource: string, userId: string, newInterval?: BillingInterval) => Promise<ChangePreviewResponse | null>;
    changeSubscription: (options: ChangeOptions) => Promise<ChangeSubscriptionResponse | null>;
    cancelSubscription: (immediate?: boolean, solanaOptions?: SolanaLifecycleOptions) => Promise<CancelSubscriptionResponse | null>;
    confirmSolanaLifecycle: (action: SolanaSubscriptionLifecycleAction, solanaOptions?: SolanaLifecycleOptions) => Promise<boolean>;
    openBillingPortal: (userId: string, returnUrl?: string) => Promise<BillingPortalResponse | null>;
    clearPreview: () => void;
    reset: () => void;
    /** Current operation status */
    status: "idle" | "loading" | "success" | "error";
    /** Error message if status is 'error' */
    error: string | null;
    /** Full subscription details */
    subscription: SubscriptionDetails | null;
    /** Preview of a pending change */
    changePreview: ChangePreviewResponse | null;
    /** User ID used to load the subscription (wallet address, email, or customer ID) */
    userId: string | null;
};

/**
 * Hook for accessing translations
 *
 * @param requestedLocale - Optional locale override (defaults to browser locale)
 * @returns Translation function and locale info
 *
 * @example
 * ```tsx
 * function PaymentButton() {
 *   const { t } = useTranslation();
 *   return <button>{t('ui.pay_with_card')}</button>;
 * }
 *
 * // With locale override
 * function SpanishButton() {
 *   const { t } = useTranslation('es');
 *   return <button>{t('ui.pay_with_card')}</button>; // "Pagar con Tarjeta"
 * }
 * ```
 */
export declare function useTranslation(requestedLocale?: Locale): UseTranslationResult;

/**
 * Translation hook return value
 */
export declare interface UseTranslationResult {
    /** Translation function */
    t: TranslateFn;
    /** Current locale */
    locale: Locale;
    /** Whether translations are loaded */
    isLoading: boolean;
    /** Full translations object (for advanced usage) */
    translations: Translations | null;
}

/**
 * Validate Cedros configuration before initializing providers/managers.
 *
 * Throws a detailed error listing every issue so developers can
 * correct misconfiguration quickly during integration.
 *
 * Returns a normalized config with serverUrl defaulted to window.location.origin
 */
export declare function validateConfig(config: CedrosConfig): CedrosConfig & {
    serverUrl: string;
};

/**
 * Run all security checks and generate a report
 *
 * @returns Security validation report with all checks
 *
 * @example
 * ```typescript
 * import { validateSecurity } from '@cedros/pay-react';
 *
 * const report = validateSecurity();
 * console.log(report.summary);
 *
 * if (report.overallStatus === 'vulnerable') {
 *   console.error('Security issues detected:');
 *   report.checks.forEach(check => {
 *     if (!check.passed) {
 *       console.error(`- ${check.message}`);
 *       if (check.recommendation) {
 *         console.error(`  Recommendation: ${check.recommendation}`);
 *       }
 *     }
 *   });
 * }
 * ```
 */
export declare function validateSecurity(): SecurityReport;

/**
 * Validate a token mint address with strict mode by default
 *
 * STRICT MODE (default):
 * - Throws error for unknown mints to prevent fund loss
 * - Requires explicit dangerouslyAllowUnknownMint opt-in
 *
 * PERMISSIVE MODE (allowUnknown=true):
 * - Warns but doesn't fail for unknown mints
 * - Use only for custom tokens, testnet, or new stablecoins
 *
 * @param tokenMint - The token mint address to validate
 * @param context - Where the mint is being used (for better error messages)
 * @param allowUnknown - Whether to allow unknown mints (default: false)
 * @returns Validation result with errors or warnings
 *
 * @example
 * ```typescript
 * // Strict mode (default) - throws for unknown mints
 * const result = validateTokenMint(config.tokenMint, 'CedrosConfig', config.dangerouslyAllowUnknownMint);
 * if (!result.isValid) {
 *   throw new Error(result.error);
 * }
 *
 * // Permissive mode - warns for unknown mints
 * const result = validateTokenMint(customMint, 'custom', true);
 * if (result.warning) {
 *   console.warn(result.warning);
 * }
 * ```
 */
export declare function validateTokenMint(tokenMint: string | undefined, context?: string, allowUnknown?: boolean): TokenMintValidationResult;

/**
 * Structural type matching @solana/wallet-adapter-base WalletAdapter.
 * Using a local interface avoids a runtime import of @solana/wallet-adapter-base
 * which Metro may resolve even for type-only imports.
 */
declare interface WalletAdapterLike {
    name: string;
    connected: boolean;
    publicKey: {
        toBase58(): string;
    } | null;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
}

/**
 * Wallet connect event detail
 */
export declare interface WalletConnectDetail {
    timestamp: number;
    wallet: WalletProvider;
    publicKey?: string;
}

/**
 * Wallet error event detail
 */
export declare interface WalletErrorDetail {
    timestamp: number;
    wallet?: WalletProvider;
    error: string;
}

/**
 * Wallet pool instance scoped to a specific React context
 *
 * Each instance maintains its own set of wallet adapters and handles cleanup.
 */
export declare class WalletPool {
    private adapters;
    private readonly poolId;
    private isCleanedUp;
    constructor(poolId?: string);
    /**
     * Get wallet adapters for this pool
     *
     * Lazy initialization: adapters are created on first access.
     * Returns empty array in SSR environments.
     */
    getAdapters(): WalletAdapter[];
    /**
     * Cleanup wallet adapters
     *
     * Disconnects all wallets and clears the adapter cache.
     * Called automatically when CedrosProvider unmounts.
     *
     * IMPORTANT: After cleanup, getAdapters() will return empty array.
     */
    cleanup(): Promise<void>;
    /**
     * Check if this pool has been initialized
     *
     * Useful for testing or debugging.
     */
    isInitialized(): boolean;
    /**
     * Get pool ID (for debugging/logging)
     */
    getId(): string;
}

/**
 * Wallet provider type
 */
export declare type WalletProvider = 'phantom' | 'solflare' | 'backpack' | string;

export declare interface X402Requirement {
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
