"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ERROR_CATEGORIES = exports.PaymentError = exports.PaymentErrorCode = void 0;
// Error handling types
var errors_1 = require("./errors");
Object.defineProperty(exports, "PaymentErrorCode", { enumerable: true, get: function () { return errors_1.PaymentErrorCode; } });
Object.defineProperty(exports, "PaymentError", { enumerable: true, get: function () { return errors_1.PaymentError; } });
Object.defineProperty(exports, "ERROR_CATEGORIES", { enumerable: true, get: function () { return errors_1.ERROR_CATEGORIES; } });
//# sourceMappingURL=index.js.map