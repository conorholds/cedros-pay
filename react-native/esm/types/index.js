/**
 * Core types for Cedros Pay
 *
 * VERSIONING POLICY:
 * - Types are exported in versioned namespaces (v1, v2, etc.)
 * - Current version is always re-exported at top level for convenience
 * - Breaking changes require a new namespace version
 * - Older versions remain available for backward compatibility
 *
 * Example:
 *   import { X402Requirement } from '@cedros/pay-react'; // Current version (v1)
 *   import { v1 } from '@cedros/pay-react'; // Explicit v1
 *   import { v2 } from '@cedros/pay-react'; // Future version
 */
// Error handling types
export { PaymentErrorCode, PaymentError, ERROR_CATEGORIES } from './errors';
//# sourceMappingURL=index.js.map