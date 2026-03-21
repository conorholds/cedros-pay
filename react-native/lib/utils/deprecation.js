"use strict";
/**
 * Deprecation utilities for managing API lifecycle
 *
 * Provides helpers for marking APIs as deprecated with clear migration paths.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeprecationLevel = void 0;
exports.logDeprecation = logDeprecation;
exports.deprecate = deprecate;
exports.deprecateClass = deprecateClass;
exports.deprecateExport = deprecateExport;
exports.resetDeprecationWarnings = resetDeprecationWarnings;
const logger_1 = require("./logger");
/**
 * Deprecation severity levels
 */
var DeprecationLevel;
(function (DeprecationLevel) {
    /** Soft warning - API works but has a better alternative */
    DeprecationLevel["WARNING"] = "warning";
    /** Notice - API will be removed in next major version */
    DeprecationLevel["NOTICE"] = "notice";
    /** Critical - API will be removed soon, migration urgent */
    DeprecationLevel["CRITICAL"] = "critical";
})(DeprecationLevel || (exports.DeprecationLevel = DeprecationLevel = {}));
// Track which deprecations have been logged to avoid spam
const loggedDeprecations = new Set();
/**
 * Log a deprecation warning (once per session)
 *
 * @param info - Deprecation details
 *
 * @example
 * ```typescript
 * logDeprecation({
 *   feature: 'StripeManager class export',
 *   reason: 'Direct class imports create breaking changes',
 *   replacement: 'Use IStripeManager interface from context',
 *   removalVersion: '3.0.0',
 *   level: DeprecationLevel.NOTICE
 * });
 * ```
 */
function logDeprecation(info) {
    const key = `${info.feature}:${info.level}`;
    // Only log once per feature+level combination
    if (loggedDeprecations.has(key)) {
        return;
    }
    loggedDeprecations.add(key);
    const logger = (0, logger_1.getLogger)();
    const prefix = `[DEPRECATED${info.removalVersion ? ` - Remove in v${info.removalVersion}` : ''}]`;
    let message = `${prefix} ${info.feature}: ${info.reason}`;
    if (info.replacement) {
        message += `\n  → Use instead: ${info.replacement}`;
    }
    if (info.migrationGuide) {
        message += `\n  → Migration guide: ${info.migrationGuide}`;
    }
    switch (info.level) {
        case DeprecationLevel.CRITICAL:
            logger.error(message);
            break;
        case DeprecationLevel.NOTICE:
            logger.warn(message);
            break;
        case DeprecationLevel.WARNING:
        default:
            logger.warn(message);
            break;
    }
}
/**
 * Mark a function as deprecated with automatic warnings
 *
 * @param fn - Function to deprecate
 * @param info - Deprecation details
 * @returns Wrapped function that logs deprecation warnings
 *
 * @example
 * ```typescript
 * export const oldFunction = deprecate(
 *   (x: number) => x * 2,
 *   {
 *     feature: 'oldFunction',
 *     reason: 'Use the new API instead',
 *     replacement: 'newFunction',
 *     removalVersion: '3.0.0',
 *     level: DeprecationLevel.NOTICE
 *   }
 * );
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deprecate(fn, info) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((...args) => {
        logDeprecation(info);
        return fn(...args);
    });
}
/**
 * Mark a class as deprecated
 *
 * Returns a Proxy that logs deprecation warnings on construction
 *
 * @param Class - Class to deprecate
 * @param info - Deprecation details
 * @returns Proxied class that warns on instantiation
 *
 * @example
 * ```typescript
 * export const OldManager = deprecateClass(
 *   OldManagerImpl,
 *   {
 *     feature: 'OldManager class',
 *     reason: 'Use interface from context instead',
 *     replacement: 'useCedrosContext().manager',
 *     removalVersion: '3.0.0',
 *     level: DeprecationLevel.CRITICAL
 *   }
 * );
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deprecateClass(Class, info) {
    return new Proxy(Class, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        construct(target, args) {
            logDeprecation(info);
            return new target(...args);
        },
    });
}
/**
 * Create a deprecation notice for an export
 *
 * Use this to create a deprecated re-export that warns users
 *
 * @param value - Value to re-export
 * @param info - Deprecation details
 * @returns Proxied value that warns on access
 *
 * @example
 * ```typescript
 * // In index.ts
 * export const DeprecatedExport = deprecateExport(
 *   ActualImplementation,
 *   {
 *     feature: 'DeprecatedExport',
 *     reason: 'Moved to new package',
 *     replacement: '@new-package/export',
 *     removalVersion: '3.0.0',
 *     level: DeprecationLevel.NOTICE
 *   }
 * );
 * ```
 */
function deprecateExport(value, info) {
    // For classes, use deprecateClass
    if (typeof value === 'function' && value.prototype) {
        return deprecateClass(value, info);
    }
    // For functions, use deprecate
    if (typeof value === 'function') {
        return deprecate(value, info);
    }
    // For objects/primitives, use Proxy to warn on first access
    if (typeof value === 'object' && value !== null) {
        let warned = false;
        return new Proxy(value, {
            get(target, prop) {
                if (!warned) {
                    logDeprecation(info);
                    warned = true;
                }
                return Reflect.get(target, prop);
            },
        });
    }
    // Fallback: just return the value (can't proxy primitives)
    return value;
}
/**
 * Reset deprecation warnings (useful for testing)
 *
 * @internal
 */
function resetDeprecationWarnings() {
    loggedDeprecations.clear();
}
//# sourceMappingURL=deprecation.js.map