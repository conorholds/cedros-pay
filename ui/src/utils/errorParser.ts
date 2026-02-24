/**
 * Error Response Parser
 *
 * Utilities for parsing backend error responses into structured PaymentError objects.
 */

import { PaymentError, PaymentErrorCode, type ErrorResponse } from '../types/errors';

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
export async function parseErrorResponse(response: Response): Promise<PaymentError> {
  const httpStatus = response.status;

  try {
    const body = await response.json();

    // Structured error format
    if (body.error && typeof body.error.code === 'string') {
      const errorResponse = body as ErrorResponse;
      return PaymentError.fromErrorResponse(errorResponse, httpStatus);
    }

    // Unknown format - create generic error
    return new PaymentError(
      PaymentErrorCode.INTERNAL_ERROR,
      body.error || body.message || 'An unknown error occurred',
      false,
      undefined,
      httpStatus
    );
  } catch (parseError) {
    // Failed to parse JSON - use status text
    return new PaymentError(
      PaymentErrorCode.INTERNAL_ERROR,
      response.statusText || 'Request failed',
      false,
      undefined,
      httpStatus
    );
  }
}

/**
 * Check if an error is retryable
 *
 * Convenience function to check if an error (of any type) is retryable.
 *
 * @param error - Error to check
 * @returns true if error is a PaymentError and is retryable
 */
export function isRetryableError(error: unknown): boolean {
  return error instanceof PaymentError && error.canRetry();
}

/**
 * Get user-friendly error message
 *
 * Extracts a user-friendly message from any error type.
 *
 * @param error - Error to extract message from
 * @returns User-friendly error message
 */
export function getUserErrorMessage(error: unknown): string {
  if (error instanceof PaymentError) {
    return error.getUserMessage();
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
