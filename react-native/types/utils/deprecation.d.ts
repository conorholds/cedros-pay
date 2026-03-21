/**
 * Deprecation utilities for managing API lifecycle
 *
 * Provides helpers for marking APIs as deprecated with clear migration paths.
 */
/**
 * Deprecation severity levels
 */
export declare enum DeprecationLevel {
    /** Soft warning - API works but has a better alternative */
    WARNING = "warning",
    /** Notice - API will be removed in next major version */
    NOTICE = "notice",
    /** Critical - API will be removed soon, migration urgent */
    CRITICAL = "critical"
}
/**
 * Deprecation metadata
 */
export interface DeprecationInfo {
    /** What is being deprecated */
    feature: string;
    /** Why it's deprecated */
    reason: string;
    /** What to use instead */
    replacement?: string;
    /** Version when it will be removed */
    removalVersion?: string;
    /** Additional migration notes */
    migrationGuide?: string;
    /** Severity level */
    level: DeprecationLevel;
}
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
export declare function logDeprecation(info: DeprecationInfo): void;
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
export declare function deprecate<T extends (...args: any[]) => any>(fn: T, info: DeprecationInfo): T;
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
export declare function deprecateClass<T extends new (...args: any[]) => any>(Class: T, info: DeprecationInfo): T;
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
export declare function deprecateExport<T>(value: T, info: DeprecationInfo): T;
/**
 * Reset deprecation warnings (useful for testing)
 *
 * @internal
 */
export declare function resetDeprecationWarnings(): void;
//# sourceMappingURL=deprecation.d.ts.map