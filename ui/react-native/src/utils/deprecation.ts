/**
 * Deprecation utilities for managing API lifecycle
 *
 * Provides helpers for marking APIs as deprecated with clear migration paths.
 */

import { getLogger } from './logger';

/**
 * Deprecation severity levels
 */
export enum DeprecationLevel {
  /** Soft warning - API works but has a better alternative */
  WARNING = 'warning',
  /** Notice - API will be removed in next major version */
  NOTICE = 'notice',
  /** Critical - API will be removed soon, migration urgent */
  CRITICAL = 'critical',
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

// Track which deprecations have been logged to avoid spam
const loggedDeprecations = new Set<string>();

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
export function logDeprecation(info: DeprecationInfo): void {
  const key = `${info.feature}:${info.level}`;

  // Only log once per feature+level combination
  if (loggedDeprecations.has(key)) {
    return;
  }

  loggedDeprecations.add(key);

  const logger = getLogger();
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
export function deprecate<T extends (...args: any[]) => any>(
  fn: T,
  info: DeprecationInfo
): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((...args: any[]) => {
    logDeprecation(info);
    return fn(...args);
  }) as T;
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
export function deprecateClass<T extends new (...args: any[]) => any>(
  Class: T,
  info: DeprecationInfo
): T {
  return new Proxy(Class, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    construct(target, args): any {
      logDeprecation(info);
      return new target(...args);
    },
  }) as T;
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
export function deprecateExport<T>(value: T, info: DeprecationInfo): T {
  // For classes, use deprecateClass
  if (typeof value === 'function' && value.prototype) {
    return deprecateClass(value as never, info) as T;
  }

  // For functions, use deprecate
  if (typeof value === 'function') {
    return deprecate(value as never, info) as T;
  }

  // For objects/primitives, use Proxy to warn on first access
  if (typeof value === 'object' && value !== null) {
    let warned = false;
    return new Proxy(value as object, {
      get(target, prop) {
        if (!warned) {
          logDeprecation(info);
          warned = true;
        }
        return Reflect.get(target, prop);
      },
    }) as T;
  }

  // Fallback: just return the value (can't proxy primitives)
  return value;
}

/**
 * Reset deprecation warnings (useful for testing)
 *
 * @internal
 */
export function resetDeprecationWarnings(): void {
  loggedDeprecations.clear();
}
