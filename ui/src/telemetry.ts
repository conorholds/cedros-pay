/**
 * @cedros/pay-react/telemetry - Optional error telemetry module
 *
 * This module is opt-in and provides error tracking, correlation IDs,
 * and PII sanitization for integration with monitoring services.
 *
 * **Usage:**
 * ```typescript
 * import { configureTelemetry, ErrorSeverity } from '@cedros/pay-react/telemetry';
 * import * as Sentry from '@sentry/react';
 *
 * configureTelemetry({
 *   enabled: true,
 *   sanitizePII: true,
 *   onError: (error) => {
 *     Sentry.captureException(error.error, {
 *       extra: { correlationId: error.correlationId },
 *     });
 *   },
 * });
 * ```
 *
 * By default, telemetry is **disabled** and this module adds **no overhead**
 * unless explicitly imported and configured.
 */

export {
  configureTelemetry,
  getTelemetryConfig,
  generateCorrelationId,
  sanitizePII,
  sanitizeError,
  enrichError,
  reportError,
  createErrorReporter,
  resetTelemetry,
  ErrorSeverity,
  type CorrelationId,
  type PaymentContext,
  type EnrichedError,
  type TelemetryHook,
} from './utils/telemetry';
