import { describe, it, expect } from 'vitest';
import { PaymentError, PaymentErrorCode, ERROR_CATEGORIES, type ErrorResponse } from '../types/errors';
import { parseErrorResponse, isRetryableError, getUserErrorMessage } from '../utils/errorParser';

describe('Payment Error Handling', () => {
  describe('PaymentError', () => {
    it('creates error with code and message', () => {
      const error = new PaymentError(
        PaymentErrorCode.INSUFFICIENT_FUNDS_TOKEN,
        'Insufficient token balance',
        false
      );

      expect(error.code).toBe(PaymentErrorCode.INSUFFICIENT_FUNDS_TOKEN);
      expect(error.message).toBe('Insufficient token balance');
      expect(error.retryable).toBe(false);
    });

    it('creates retryable error', () => {
      const error = new PaymentError(
        PaymentErrorCode.TRANSACTION_NOT_CONFIRMED,
        'Transaction pending',
        true
      );

      expect(error.canRetry()).toBe(true);
      expect(error.retryable).toBe(true);
    });

    it('includes HTTP status code', () => {
      const error = new PaymentError(
        PaymentErrorCode.RESOURCE_NOT_FOUND,
        'Resource not found',
        false,
        undefined,
        404
      );

      expect(error.httpStatus).toBe(404);
    });

    it('includes error details', () => {
      const error = new PaymentError(
        PaymentErrorCode.AMOUNT_MISMATCH,
        'Amount mismatch',
        false,
        { expected: '1000', actual: '900' }
      );

      expect(error.details).toEqual({ expected: '1000', actual: '900' });
    });

    it('checks specific error code with is()', () => {
      const error = new PaymentError(
        PaymentErrorCode.INSUFFICIENT_FUNDS_SOL,
        'Insufficient SOL',
        false
      );

      expect(error.is(PaymentErrorCode.INSUFFICIENT_FUNDS_SOL)).toBe(true);
      expect(error.is(PaymentErrorCode.INSUFFICIENT_FUNDS_TOKEN)).toBe(false);
    });

    it('checks error category with isInCategory()', () => {
      const error = new PaymentError(
        PaymentErrorCode.INSUFFICIENT_FUNDS_TOKEN,
        'Insufficient funds',
        false
      );

      expect(error.isInCategory(ERROR_CATEGORIES.INSUFFICIENT_FUNDS)).toBe(true);
      expect(error.isInCategory(ERROR_CATEGORIES.VALIDATION)).toBe(false);
    });

    it('creates from structured error response', () => {
      const errorResponse: ErrorResponse = {
        error: {
          code: PaymentErrorCode.QUOTE_EXPIRED,
          message: 'Payment quote has expired',
          retryable: false,
          details: { quoteId: 'quote-123' },
        },
      };

      const error = PaymentError.fromErrorResponse(errorResponse, 402);

      expect(error.code).toBe(PaymentErrorCode.QUOTE_EXPIRED);
      expect(error.message).toBe('Payment quote has expired');
      expect(error.retryable).toBe(false);
      expect(error.details).toEqual({ quoteId: 'quote-123' });
      expect(error.httpStatus).toBe(402);
    });

    it('creates from unknown error', () => {
      const jsError = new Error('Something went wrong');
      const error = PaymentError.fromUnknown(jsError);

      expect(error instanceof PaymentError).toBe(true);
      expect(error.code).toBe(PaymentErrorCode.INTERNAL_ERROR);
      expect(error.message).toBe('Something went wrong');
    });

    it('passes through existing PaymentError in fromUnknown', () => {
      const originalError = new PaymentError(
        PaymentErrorCode.INVALID_SIGNATURE,
        'Invalid sig',
        false
      );

      const error = PaymentError.fromUnknown(originalError);

      expect(error).toBe(originalError);
      expect(error.code).toBe(PaymentErrorCode.INVALID_SIGNATURE);
    });
  });

  describe('parseErrorResponse', () => {
    it('parses structured error response', async () => {
      const response = new Response(
        JSON.stringify({
          error: {
            code: 'insufficient_funds_token',
            message: 'Insufficient token balance',
            retryable: false,
          },
        }),
        { status: 402 }
      );

      const error = await parseErrorResponse(response);

      expect(error.code).toBe(PaymentErrorCode.INSUFFICIENT_FUNDS_TOKEN);
      expect(error.message).toBe('Insufficient token balance');
      expect(error.httpStatus).toBe(402);
    });

    it('parses structured error with details', async () => {
      const response = new Response(
        JSON.stringify({
          error: {
            code: 'amount_mismatch',
            message: 'Amount does not match quote',
            retryable: false,
            details: { expected: '1000', actual: '900' },
          },
        }),
        { status: 402 }
      );

      const error = await parseErrorResponse(response);

      expect(error.code).toBe(PaymentErrorCode.AMOUNT_MISMATCH);
      expect(error.details).toEqual({ expected: '1000', actual: '900' });
    });

    it('parses retryable error', async () => {
      const response = new Response(
        JSON.stringify({
          error: {
            code: 'transaction_not_confirmed',
            message: 'Transaction pending confirmation',
            retryable: true,
          },
        }),
        { status: 402 }
      );

      const error = await parseErrorResponse(response);

      expect(error.code).toBe(PaymentErrorCode.TRANSACTION_NOT_CONFIRMED);
      expect(error.retryable).toBe(true);
      expect(error.canRetry()).toBe(true);
    });

    it('handles unknown format as internal error', async () => {
      const response = new Response(
        JSON.stringify({ error: 'some error' }),
        { status: 500 }
      );

      const error = await parseErrorResponse(response);

      expect(error.code).toBe(PaymentErrorCode.INTERNAL_ERROR);
      expect(error.message).toBe('some error');
    });

    it('handles JSON parse error gracefully', async () => {
      const response = new Response('Not valid JSON', { status: 500 });

      const error = await parseErrorResponse(response);

      expect(error instanceof PaymentError).toBe(true);
      expect(error.code).toBe(PaymentErrorCode.INTERNAL_ERROR);
    });
  });

  describe('ERROR_CATEGORIES', () => {
    it('contains insufficient funds errors', () => {
      expect(ERROR_CATEGORIES.INSUFFICIENT_FUNDS).toContain(
        PaymentErrorCode.INSUFFICIENT_FUNDS_SOL
      );
      expect(ERROR_CATEGORIES.INSUFFICIENT_FUNDS).toContain(
        PaymentErrorCode.INSUFFICIENT_FUNDS_TOKEN
      );
    });

    it('contains retryable errors', () => {
      expect(ERROR_CATEGORIES.RETRYABLE).toContain(
        PaymentErrorCode.TRANSACTION_NOT_CONFIRMED
      );
      expect(ERROR_CATEGORIES.RETRYABLE).toContain(PaymentErrorCode.RPC_ERROR);
      expect(ERROR_CATEGORIES.RETRYABLE).toContain(PaymentErrorCode.NETWORK_ERROR);
      expect(ERROR_CATEGORIES.RETRYABLE).toContain(PaymentErrorCode.STRIPE_ERROR);
    });

    it('contains validation errors', () => {
      expect(ERROR_CATEGORIES.VALIDATION).toContain(PaymentErrorCode.MISSING_FIELD);
      expect(ERROR_CATEGORIES.VALIDATION).toContain(PaymentErrorCode.INVALID_FIELD);
      expect(ERROR_CATEGORIES.VALIDATION).toContain(PaymentErrorCode.INVALID_AMOUNT);
    });

    it('contains coupon errors', () => {
      expect(ERROR_CATEGORIES.COUPON).toContain(PaymentErrorCode.COUPON_EXPIRED);
      expect(ERROR_CATEGORIES.COUPON).toContain(PaymentErrorCode.COUPON_NOT_FOUND);
      expect(ERROR_CATEGORIES.COUPON).toContain(PaymentErrorCode.COUPON_USAGE_LIMIT_REACHED);
    });
  });

  describe('isRetryableError', () => {
    it('returns true for retryable errors', () => {
      const error = new PaymentError(
        PaymentErrorCode.NETWORK_ERROR,
        'Network error',
        true
      );

      expect(isRetryableError(error)).toBe(true);
    });

    it('returns false for non-retryable errors', () => {
      const error = new PaymentError(
        PaymentErrorCode.INSUFFICIENT_FUNDS_TOKEN,
        'Insufficient funds',
        false
      );

      expect(isRetryableError(error)).toBe(false);
    });

    it('returns false for non-PaymentError', () => {
      const error = new Error('Regular error');
      expect(isRetryableError(error)).toBe(false);
    });
  });

  describe('getUserErrorMessage', () => {
    it('extracts message from PaymentError', () => {
      const error = new PaymentError(
        PaymentErrorCode.INVALID_SIGNATURE,
        'Invalid signature',
        false
      );

      // getUserMessage() now returns user-friendly message with action
      expect(getUserErrorMessage(error)).toBe(
        'Transaction signature is invalid Please approve the transaction in your wallet and try again.'
      );
    });

    it('extracts message from regular Error', () => {
      const error = new Error('Something failed');
      expect(getUserErrorMessage(error)).toBe('Something failed');
    });

    it('converts unknown errors to string', () => {
      expect(getUserErrorMessage('String error')).toBe('String error');
      expect(getUserErrorMessage(null)).toBe('null');
      expect(getUserErrorMessage(undefined)).toBe('undefined');
    });
  });
});
