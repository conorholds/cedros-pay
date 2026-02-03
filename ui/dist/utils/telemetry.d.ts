import { PaymentErrorCode } from '../types/errors';
/**
 * Correlation ID for tracking errors across distributed systems
 *
 * Format: cedros_<timestamp>_<uuid>
 * Example: cedros_1699564800000_a1b2c3d4
 */
export type CorrelationId = string;
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
export interface PaymentContext {
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
 * Enriched error with telemetry context
 */
export interface EnrichedError {
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
 * Telemetry hook for sending errors to monitoring service
 *
 * Users provide this function to integrate with their monitoring solution
 * (Sentry, Datadog, custom backend, etc.)
 */
export type TelemetryHook = (error: EnrichedError) => void | Promise<void>;
/**
 * Global telemetry configuration
 */
interface TelemetryConfig {
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
 * Get current telemetry configuration
 *
 * @internal
 */
export declare function getTelemetryConfig(): TelemetryConfig;
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
 * Sanitize an Error object by removing PII from message and stack
 *
 * @param error - Error to sanitize
 * @returns New Error with sanitized message and stack
 */
export declare function sanitizeError(error: Error): Error;
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
export declare function reportError(error: Error | string | EnrichedError, options?: {
    severity?: ErrorSeverity;
    code?: PaymentErrorCode | string;
    paymentContext?: PaymentContext;
    correlationId?: CorrelationId;
    tags?: Record<string, string>;
}): void;
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
 * Reset telemetry configuration (useful for testing)
 *
 * @internal
 */
export declare function resetTelemetry(): void;
export {};
//# sourceMappingURL=telemetry.d.ts.map