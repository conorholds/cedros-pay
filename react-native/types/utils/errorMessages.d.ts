/**
 * User-Friendly Error Messages
 *
 * Provides contextual, actionable error messages for all payment error codes.
 * Messages are designed to:
 * - Be clear and non-technical
 * - Provide actionable next steps
 * - Avoid embarrassing the business
 * - Enable user self-service
 * - Support internationalization
 */
/**
 * User-friendly error message with actionable guidance
 */
export interface ErrorMessage {
    /** Short user-friendly message */
    message: string;
    /** Actionable next steps for the user */
    action?: string;
    /** Support-friendly technical detail (optional, for error reporting) */
    technicalHint?: string;
}
/**
 * Error message map: error code string -> User-friendly message with actions
 *
 * Translation key format: `errors.{error_code}.{message|action}`
 * Example: errors.insufficient_funds_token.message
 *
 * Note: Uses string keys instead of enum to avoid circular dependency with types/errors.ts
 */
export declare const ERROR_MESSAGES: Record<string, ErrorMessage>;
/**
 * Get user-friendly error message for an error code string
 *
 * @param code - Payment error code (as string)
 * @returns User-friendly error message with action
 */
export declare function getUserFriendlyError(code: string): ErrorMessage;
/**
 * Format error for display to user
 *
 * @param code - Payment error code (as string)
 * @param includeAction - Whether to include the action guidance (default: true)
 * @returns Formatted error string
 */
export declare function formatUserError(code: string, includeAction?: boolean): string;
//# sourceMappingURL=errorMessages.d.ts.map