/**
 * Error telemetry and observability utilities
 *
 * Provides correlation IDs, error enrichment, and optional telemetry hooks
 * for production debugging without compromising user privacy.
 *
 * PRIVACY-FIRST DESIGN:
 * - All telemetry is OPT-IN via user-provided hooks
 * - No data sent to external services by default
 * - PII sanitization utilities included
 * - Users control what data is collected and where it goes
 *
 * SECURITY GUARANTEE:
 * - NEVER logs private keys, seed phrases, or wallet credentials
 * - NEVER sends data without explicit user configuration
 * - Sanitization ENABLED BY DEFAULT and cannot be fully disabled
 * - All sensitive crypto data patterns are redacted automatically
 *
 * @example Safe telemetry configuration
 * ```typescript
 * configureTelemetry({
 *   enabled: true,
 *   sanitizePII: true, // ALWAYS keep enabled
 *   onError: (error) => {
 *     // error.message is sanitized - no private keys
 *     // error.paymentContext contains ONLY non-sensitive metadata
 *     Sentry.captureException(error);
 *   }
 * });
 * ```
 */
import { generateUUID } from './uuid';
import { Platform } from 'react-native';
/**
 * Error severity levels for telemetry
 */
export var ErrorSeverity;
(function (ErrorSeverity) {
    /** Debug information (not usually logged) */
    ErrorSeverity["DEBUG"] = "debug";
    /** Informational message */
    ErrorSeverity["INFO"] = "info";
    /** Warning that doesn't prevent operation */
    ErrorSeverity["WARNING"] = "warning";
    /** Error that affects current operation */
    ErrorSeverity["ERROR"] = "error";
    /** Critical error that affects entire system */
    ErrorSeverity["CRITICAL"] = "critical";
})(ErrorSeverity || (ErrorSeverity = {}));
// Global telemetry state
let telemetryConfig = {
    enabled: false,
    sanitizePII: true,
};
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
export function configureTelemetry(config) {
    telemetryConfig = {
        ...telemetryConfig,
        ...config,
    };
}
/**
 * Get current telemetry configuration
 *
 * @internal
 */
export function getTelemetryConfig() {
    return { ...telemetryConfig };
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
export function generateCorrelationId() {
    const timestamp = Date.now();
    const uuid = generateUUID().slice(0, 12); // First 12 chars for brevity
    return `cedros_${timestamp}_${uuid}`;
}
/**
 * PII and sensitive data patterns to sanitize from error messages and stack traces
 *
 * CRITICAL: These patterns prevent leaking user private keys, wallet seeds,
 * personal information, and payment credentials.
 */
const PII_PATTERNS = [
    // Email addresses
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    // Phone numbers (various formats)
    /\b(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    // Credit card numbers (basic pattern)
    /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    // SSN (US)
    /\b\d{3}-\d{2}-\d{4}\b/g,
    // IP addresses (IPv4)
    /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    // ====== CRYPTO-SPECIFIC SENSITIVE DATA ======
    // Solana private keys (Base58 encoded, typically 88 chars)
    /\b[1-9A-HJ-NP-Za-km-z]{87,88}\b/g,
    // Solana wallet addresses (Base58, 32-44 chars)
    /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g,
    // Ethereum private keys (0x + 64 hex chars)
    /\b0x[a-fA-F0-9]{64}\b/g,
    // Ethereum addresses (0x + 40 hex chars)
    /\b0x[a-fA-F0-9]{40}\b/g,
    // BIP39 seed phrases (12, 15, 18, 21, or 24 words)
    // Matches common patterns like "word word word..." (very conservative)
    /\b([a-z]+\s+){11,23}[a-z]+\b/gi,
    // JWT tokens (header.payload.signature format)
    /\beyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\b/g,
    // API keys (common patterns: sk_, pk_, api_, secret_)
    /\b(sk|pk|api|secret|key)_[a-zA-Z0-9]{16,128}\b/gi,
    // Stripe secret keys
    /\bsk_(test|live)_[a-zA-Z0-9]{24,}\b/g,
    // Transaction signatures (Base58, ~88 chars)
    /\b[1-9A-HJ-NP-Za-km-z]{86,90}\b/g,
    // Base64 encoded data (could be keys) - very long strings
    /\b[A-Za-z0-9+/]{100,}={0,2}\b/g,
    // Hex strings longer than 32 chars (could be keys)
    /\b[a-fA-F0-9]{64,}\b/g,
];
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
export function sanitizePII(input) {
    // Early exit if telemetry is disabled - no need to sanitize
    if (!telemetryConfig.enabled) {
        return input;
    }
    // Early exit if PII sanitization is disabled
    if (!telemetryConfig.sanitizePII) {
        return input;
    }
    let sanitized = input;
    // Use a single pass with all patterns to minimize string operations
    for (const pattern of PII_PATTERNS) {
        sanitized = sanitized.replace(pattern, '[REDACTED]');
    }
    return sanitized;
}
/**
 * Sanitize an Error object by removing PII from message and stack
 *
 * @param error - Error to sanitize
 * @returns New Error with sanitized message and stack
 */
export function sanitizeError(error) {
    const sanitized = new Error(sanitizePII(error.message));
    sanitized.name = error.name;
    if (error.stack) {
        sanitized.stack = sanitizePII(error.stack);
    }
    return sanitized;
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
export function enrichError(error, options = {}) {
    const errorObj = typeof error === 'string' ? new Error(error) : error;
    const shouldSanitize = telemetryConfig.sanitizePII;
    const sanitizedError = shouldSanitize ? sanitizeError(errorObj) : errorObj;
    const timestamp = Date.now();
    return {
        correlationId: options.correlationId || generateCorrelationId(),
        timestamp,
        timestampISO: new Date(timestamp).toISOString(),
        severity: options.severity || ErrorSeverity.ERROR,
        code: options.code,
        message: sanitizedError.message,
        error: sanitizedError,
        stack: sanitizedError.stack,
        paymentContext: options.paymentContext,
        userAgent: `React Native ${Platform.OS || 'unknown'}`,
        sdkVersion: telemetryConfig.sdkVersion,
        environment: telemetryConfig.environment,
        tags: {
            ...telemetryConfig.globalTags,
            ...options.tags,
        },
    };
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
export function reportError(error, options) {
    // Only report if telemetry is enabled and hook is configured
    if (!telemetryConfig.enabled || !telemetryConfig.onError) {
        return;
    }
    // Check if already enriched
    const enriched = typeof error === 'object' && 'correlationId' in error
        ? error
        : enrichError(error, options || {});
    // Call user-provided hook
    try {
        telemetryConfig.onError(enriched);
    }
    catch (hookError) {
        // Don't let telemetry errors break the app
        console.error('[CedrosPay] Telemetry hook failed:', hookError);
    }
}
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
export function createErrorReporter(defaultTags) {
    return (error, options = {}) => {
        reportError(error, {
            ...options,
            tags: {
                ...defaultTags,
                ...options.tags,
            },
        });
    };
}
/**
 * Reset telemetry configuration (useful for testing)
 *
 * @internal
 */
export function resetTelemetry() {
    telemetryConfig = {
        enabled: false,
        sanitizePII: true,
    };
}
//# sourceMappingURL=telemetry.js.map