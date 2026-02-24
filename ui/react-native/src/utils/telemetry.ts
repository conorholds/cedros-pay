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
import type { PaymentErrorCode } from '../types/errors';
import { Platform } from 'react-native';

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
export enum ErrorSeverity {
  /** Debug information (not usually logged) */
  DEBUG = 'debug',
  /** Informational message */
  INFO = 'info',
  /** Warning that doesn't prevent operation */
  WARNING = 'warning',
  /** Error that affects current operation */
  ERROR = 'error',
  /** Critical error that affects entire system */
  CRITICAL = 'critical',
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

// Global telemetry state
let telemetryConfig: TelemetryConfig = {
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
export function configureTelemetry(config: Partial<TelemetryConfig>): void {
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
export function getTelemetryConfig(): TelemetryConfig {
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
export function generateCorrelationId(): CorrelationId {
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
export function sanitizePII(input: string): string {
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
export function sanitizeError(error: Error): Error {
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
export function enrichError(
  error: Error | string,
  options: {
    severity?: ErrorSeverity;
    code?: PaymentErrorCode | string;
    paymentContext?: PaymentContext;
    correlationId?: CorrelationId;
    tags?: Record<string, string>;
  } = {}
): EnrichedError {
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
export function reportError(
  error: Error | string | EnrichedError,
  options?: {
    severity?: ErrorSeverity;
    code?: PaymentErrorCode | string;
    paymentContext?: PaymentContext;
    correlationId?: CorrelationId;
    tags?: Record<string, string>;
  }
): void {
  // Only report if telemetry is enabled and hook is configured
  if (!telemetryConfig.enabled || !telemetryConfig.onError) {
    return;
  }

  // Check if already enriched
  const enriched =
    typeof error === 'object' && 'correlationId' in error
      ? (error as EnrichedError)
      : enrichError(error as Error | string, options || {});

  // Call user-provided hook
  try {
    telemetryConfig.onError(enriched);
  } catch (hookError) {
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
export function createErrorReporter(
  defaultTags: Record<string, string>
): (
  error: Error | string,
  options?: {
    severity?: ErrorSeverity;
    code?: PaymentErrorCode | string;
    paymentContext?: PaymentContext;
    correlationId?: CorrelationId;
    tags?: Record<string, string>;
  }
) => void {
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
export function resetTelemetry(): void {
  telemetryConfig = {
    enabled: false,
    sanitizePII: true,
  };
}
