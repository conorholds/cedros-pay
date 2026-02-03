import type { X402Response } from '../types';
import { getLogger } from './logger';

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
export function formatError(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return fallback;
}

/**
 * Error code to user-friendly message mapping for X402 verification errors
 */
const X402_ERROR_MAP: Record<string, string> = {
  service_unavailable: 'Service temporarily unavailable. Please try again later or contact support.',
  server_insufficient_funds: 'Service temporarily unavailable. Please try again later or contact support.',
  insufficient_funds_token: 'Insufficient token balance in your wallet. Please add more tokens and try again.',
  insufficient_funds_sol: 'Insufficient SOL for transaction fees. Please add some SOL to your wallet and try again.',
  insufficient_amount: 'Payment amount is insufficient. Please check the required amount.',
  invalid_signature: 'Transaction signature is invalid. Please try again.',
  send_failed: 'Failed to send transaction. Please try again or contact support.',
  timeout: 'Transaction timed out. Please check the blockchain explorer or try again.',
};

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
export async function parseErrorResponse(
  response: Response,
  defaultMessage: string,
  parseVerificationError: boolean = false
): Promise<string> {
  try {
    const errorData: X402Response = await response.json();

    // Handle X402Response verification errors with user-friendly messages
    if (parseVerificationError && errorData.verificationError) {
      getLogger().debug(`Payment verification failed: ${errorData.verificationError.code}`);

      const code = errorData.verificationError.code;
      return X402_ERROR_MAP[code] || errorData.verificationError.message || defaultMessage;
    }

    // Standard error response - handle both string and nested object formats
    // Backend can return: { error: "message" } OR { error: { code, message } }
    if (typeof errorData.error === 'string') {
      return errorData.error;
    } else if (errorData.error && typeof errorData.error === 'object' && 'message' in errorData.error) {
      return (errorData.error as { message: string }).message;
    }
    return defaultMessage;
  } catch {
    // Fallback to text if JSON parsing fails
    return (await response.text()) || defaultMessage;
  }
}
