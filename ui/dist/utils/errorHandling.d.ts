/**
 * Format error into user-friendly message string
 *
 * Consolidates the repetitive `error instanceof Error ? error.message : fallback`
 * pattern used throughout the codebase into a single utility.
 *
 * @param error - The error to format (can be Error, string, or unknown type)
 * @param fallback - Fallback message if error cannot be converted to string
 * @returns User-friendly error message string
 *
 * @example
 * formatError(new Error('Failed'), 'Unknown error') // Returns: 'Failed'
 * formatError('Custom error', 'Unknown error')      // Returns: 'Custom error'
 * formatError(null, 'Unknown error')                // Returns: 'Unknown error'
 */
export declare function formatError(error: unknown, fallback: string): string;
/**
 * Parse error response from failed HTTP requests
 *
 * Shared utility for consistent error handling across managers.
 * Tries JSON parsing first, falls back to plain text if that fails.
 * Supports both standard error responses and X402Response verification errors.
 *
 * @param response - The failed HTTP response
 * @param defaultMessage - Fallback message if parsing fails
 * @param parseVerificationError - If true, handle X402Response verification errors with detailed mapping
 * @returns User-friendly error message
 */
export declare function parseErrorResponse(response: Response, defaultMessage: string, parseVerificationError?: boolean): Promise<string>;
//# sourceMappingURL=errorHandling.d.ts.map