import { PaymentError } from '../types/errors';
/**
 * Parse JSON error response from backend API
 *
 * Expects structured error format from backend:
 * {
 *   error: {
 *     code: "insufficient_funds_token",
 *     message: "Insufficient token balance",
 *     retryable: false,
 *     details?: { ... }
 *   }
 * }
 *
 * @param response - Fetch Response object
 * @returns PaymentError with structured error information
 */
export declare function parseErrorResponse(response: Response): Promise<PaymentError>;
/**
 * Check if an error is retryable
 *
 * Convenience function to check if an error (of any type) is retryable.
 *
 * @param error - Error to check
 * @returns true if error is a PaymentError and is retryable
 */
export declare function isRetryableError(error: unknown): boolean;
/**
 * Get user-friendly error message
 *
 * Extracts a user-friendly message from any error type.
 *
 * @param error - Error to extract message from
 * @returns User-friendly error message
 */
export declare function getUserErrorMessage(error: unknown): string;
//# sourceMappingURL=errorParser.d.ts.map