/**
 * Configure global telemetry settings
 *
 * @param config - Telemetry configuration
 *
 * @example
 * ```typescript
 * import { configureTelemetry } from '@cedros/pay-react';
 * import * as Sentry from '@sentry/react';
 *
 * configureTelemetry({
 *   enabled: true,
 *   sdkVersion: '2.0.0',
 *   environment: process.env.NODE_ENV,
 *   onError: (error) => {
 *     Sentry.captureException(error.error, {
 *       extra: {
 *         correlationId: error.correlationId,
 *         paymentContext: error.paymentContext,
 *       },
 *       tags: error.tags,
 *       level: error.severity,
 *     });
 *   },
 * });
 * ```
 */
export declare function configureTelemetry(config: Partial<TelemetryConfig>): void;

/**
 * Correlation ID for tracking errors across distributed systems
 *
 * Format: cedros_<timestamp>_<uuid>
 * Example: cedros_1699564800000_a1b2c3d4
 */
export declare type CorrelationId = string;

/**
 * Create a tagged error reporter for a specific context
 *
 * Useful for creating module-specific error reporters with consistent tags.
 *
 * @param defaultTags - Tags to include in all errors from this reporter
 * @returns Error reporter function with pre-configured tags
 *
 * @example
 * ```typescript
 * const reportStripeError = createErrorReporter({
 *   module: 'stripe',
 *   component: 'StripeButton',
 * });
 *
 * reportStripeError(new Error('Session creation failed'), {
 *   severity: ErrorSeverity.ERROR,
 *   code: 'stripe_session_failed',
 * });
 * ```
 */
export declare function createErrorReporter(defaultTags: Record<string, string>): (error: Error | string, options?: {
    severity?: ErrorSeverity;
    code?: PaymentErrorCode | string;
    paymentContext?: PaymentContext;
    correlationId?: CorrelationId;
    tags?: Record<string, string>;
}) => void;

/**
 * Enriched error with telemetry context
 */
export declare interface EnrichedError {
    /** Unique correlation ID for tracking */
    correlationId: CorrelationId;
    /** Timestamp when error occurred */
    timestamp: number;
    /** ISO 8601 timestamp string */
    timestampISO: string;
    /** Error severity */
    severity: ErrorSeverity;
    /** Error code (if available) */
    code?: PaymentErrorCode | string;
    /** Error message (sanitized) */
    message: string;
    /** Original error object (sanitized) */
    error?: Error;
    /** Stack trace (sanitized) */
    stack?: string;
    /** Payment context */
    paymentContext?: PaymentContext;
    /** User agent string */
    userAgent?: string;
    /** SDK version */
    sdkVersion?: string;
    /** Environment (production, development, test) */
    environment?: string;
    /** Additional tags for filtering */
    tags?: Record<string, string>;
}

/**
 * Enrich an error with telemetry context
 *
 * @param error - Original error
 * @param options - Enrichment options
 * @returns Enriched error with correlation ID and context
 *
 * @example
 * ```typescript
 * const enriched = enrichError(new Error('Payment failed'), {
 *   severity: ErrorSeverity.ERROR,
 *   code: 'payment_verification_failed',
 *   paymentContext: {
 *     paymentMethod: 'crypto',
 *     resourceId: 'item-123',
 *     amount: '1000000',
 *     currency: 'USDC',
 *     stage: 'verify',
 *   },
 * });
 * ```
 */
export declare function enrichError(error: Error | string, options?: {
    severity?: ErrorSeverity;
    code?: PaymentErrorCode | string;
    paymentContext?: PaymentContext;
    correlationId?: CorrelationId;
    tags?: Record<string, string>;
}): EnrichedError;

/**
 * Error severity levels for telemetry
 */
export declare enum ErrorSeverity {
    /** Debug information (not usually logged) */
    DEBUG = "debug",
    /** Informational message */
    INFO = "info",
    /** Warning that doesn't prevent operation */
    WARNING = "warning",
    /** Error that affects current operation */
    ERROR = "error",
    /** Critical error that affects entire system */
    CRITICAL = "critical"
}

/**
 * Generate a new correlation ID
 *
 * @returns Correlation ID in format: cedros_<timestamp>_<uuid>
 *
 * @example
 * ```typescript
 * const correlationId = generateCorrelationId();
 * // => "cedros_1699564800000_a1b2c3d4e5f6"
 * ```
 */
export declare function generateCorrelationId(): CorrelationId;

/* Excluded from this release type: getTelemetryConfig */

/**
 * Payment context for error enrichment
 *
 * IMPORTANT: This context contains ONLY non-sensitive metadata.
 * The following are NEVER included:
 * - Private keys or seed phrases
 * - Wallet credentials or passwords
 * - Credit card numbers or CVV
 * - Full transaction payloads
 * - User email or personal information
 * - Actual wallet addresses (sanitized to [REDACTED])
 *
 * Only business context (amount, currency, stage) is included for debugging.
 */
export declare interface PaymentContext {
    /** Payment method attempted (stripe, crypto, etc.) */
    paymentMethod?: 'stripe' | 'crypto' | 'unknown';
    /** Resource ID being purchased (product SKU, not user data) */
    resourceId?: string;
    /** Cart ID for multi-item purchases */
    cartId?: string;
    /** Transaction ID if available (public blockchain txn hash, not user data) */
    transactionId?: string;
    /** Amount in atomic units (e.g., "1000000" for 1 USDC) */
    amount?: string;
    /** Currency or token symbol (e.g., "USDC", "USD") */
    currency?: string;
    /** Payment flow stage (for identifying where failure occurred) */
    stage?: 'init' | 'quote' | 'sign' | 'submit' | 'verify' | 'complete';
    /** Additional metadata (sanitized) - never include sensitive data here */
    metadata?: Record<string, string | number | boolean>;
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
 * Report an error to the configured telemetry hook
 *
 * Only sends if telemetry is enabled and a hook is configured.
 *
 * @param error - Error to report (can be Error, string, or EnrichedError)
 * @param options - Enrichment options (if error is not already enriched)
 *
 * @example
 * ```typescript
 * // Simple error reporting
 * reportError(new Error('Payment failed'));
 *
 * // With context
 * reportError(new Error('Insufficient funds'), {
 *   severity: ErrorSeverity.WARNING,
 *   code: 'insufficient_funds',
 *   paymentContext: {
 *     paymentMethod: 'crypto',
 *     amount: '1000000',
 *     currency: 'USDC',
 *   },
 * });
 *
 * // Already enriched
 * const enriched = enrichError(error, { ... });
 * reportError(enriched);
 * ```
 */
declare function reportError_2(error: Error | string | EnrichedError, options?: {
    severity?: ErrorSeverity;
    code?: PaymentErrorCode | string;
    paymentContext?: PaymentContext;
    correlationId?: CorrelationId;
    tags?: Record<string, string>;
}): void;
export { reportError_2 as reportError }

/* Excluded from this release type: resetTelemetry */

/**
 * Sanitize an Error object by removing PII from message and stack
 *
 * @param error - Error to sanitize
 * @returns New Error with sanitized message and stack
 */
export declare function sanitizeError(error: Error): Error;

/**
 * Sanitize PII from a string
 *
 * @param input - String potentially containing PII
 * @returns Sanitized string with PII replaced by [REDACTED]
 *
 * @example
 * ```typescript
 * sanitizePII('Error: user@example.com failed')
 * // => "Error: [REDACTED] failed"
 * ```
 */
export declare function sanitizePII(input: string): string;

/**
 * Global telemetry configuration
 */
declare interface TelemetryConfig {
    /** User-provided telemetry hook (optional) */
    onError?: TelemetryHook;
    /** Enable telemetry (default: false) */
    enabled: boolean;
    /** Sanitize PII from errors (default: true) */
    sanitizePII: boolean;
    /** SDK version for telemetry */
    sdkVersion?: string;
    /** Environment name */
    environment?: string;
    /** Additional tags to include in all errors */
    globalTags?: Record<string, string>;
}

/**
 * Telemetry hook for sending errors to monitoring service
 *
 * Users provide this function to integrate with their monitoring solution
 * (Sentry, Datadog, custom backend, etc.)
 */
export declare type TelemetryHook = (error: EnrichedError) => void | Promise<void>;

export { }
