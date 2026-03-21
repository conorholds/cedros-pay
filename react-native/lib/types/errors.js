"use strict";
/**
 * Cedros Pay - Error Code Types
 *
 * Structured error handling with machine-readable error codes.
 * Based on backend error code specification (ERROR_CODES.md v1.0)
 *
 * Benefits:
 * - Type-safe error handling (no string matching fragility)
 * - Robust error recovery logic based on error codes
 * - Analytics tracking with structured error data
 * - Retry logic based on retryable flag
 * - User-friendly error messages per error type
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ERROR_CATEGORIES = exports.PaymentError = exports.PaymentErrorCode = void 0;
const errorMessages_1 = require("../utils/errorMessages");
/**
 * Payment error codes returned by the backend API
 *
 * Organized by HTTP status code category:
 * - 400: Validation errors
 * - 402: Payment verification failures
 * - 404: Resource not found
 * - 409: Business rule conflicts (coupons)
 * - 500: Internal server errors
 * - 502: External service failures
 */
var PaymentErrorCode;
(function (PaymentErrorCode) {
    // ===== Payment Verification Errors (402) =====
    // x402 spec + Solana-specific transaction failures
    /** Invalid payment proof format or structure */
    PaymentErrorCode["INVALID_PAYMENT_PROOF"] = "invalid_payment_proof";
    /** Invalid transaction signature */
    PaymentErrorCode["INVALID_SIGNATURE"] = "invalid_signature";
    /** Invalid transaction structure */
    PaymentErrorCode["INVALID_TRANSACTION"] = "invalid_transaction";
    /** Transaction not found on blockchain */
    PaymentErrorCode["TRANSACTION_NOT_FOUND"] = "transaction_not_found";
    /** Transaction not confirmed yet (RETRYABLE) */
    PaymentErrorCode["TRANSACTION_NOT_CONFIRMED"] = "transaction_not_confirmed";
    /** Transaction failed on-chain */
    PaymentErrorCode["TRANSACTION_FAILED"] = "transaction_failed";
    /** Transaction timed out */
    PaymentErrorCode["TRANSACTION_EXPIRED"] = "transaction_expired";
    /** Payment sent to wrong address */
    PaymentErrorCode["INVALID_RECIPIENT"] = "invalid_recipient";
    /** Invalid sender wallet */
    PaymentErrorCode["INVALID_SENDER"] = "invalid_sender";
    /** Only authorized wallets can issue refunds */
    PaymentErrorCode["UNAUTHORIZED_REFUND_ISSUER"] = "unauthorized_refund_issuer";
    /** Payment amount less than required */
    PaymentErrorCode["AMOUNT_BELOW_MINIMUM"] = "amount_below_minimum";
    /** Payment amount doesn't match quote */
    PaymentErrorCode["AMOUNT_MISMATCH"] = "amount_mismatch";
    /** Insufficient SOL for transaction fees */
    PaymentErrorCode["INSUFFICIENT_FUNDS_SOL"] = "insufficient_funds_sol";
    /** Insufficient token balance */
    PaymentErrorCode["INSUFFICIENT_FUNDS_TOKEN"] = "insufficient_funds_token";
    /** Wrong token used for payment */
    PaymentErrorCode["INVALID_TOKEN_MINT"] = "invalid_token_mint";
    /** Transaction is not a valid SPL token transfer */
    PaymentErrorCode["NOT_SPL_TRANSFER"] = "not_spl_transfer";
    /** Token account not found */
    PaymentErrorCode["MISSING_TOKEN_ACCOUNT"] = "missing_token_account";
    /** Invalid token program */
    PaymentErrorCode["INVALID_TOKEN_PROGRAM"] = "invalid_token_program";
    /** Required memo missing from transaction */
    PaymentErrorCode["MISSING_MEMO"] = "missing_memo";
    /** Invalid memo format */
    PaymentErrorCode["INVALID_MEMO"] = "invalid_memo";
    /** Payment signature already used (replay protection) */
    PaymentErrorCode["PAYMENT_ALREADY_USED"] = "payment_already_used";
    /** Transaction signature reused */
    PaymentErrorCode["SIGNATURE_REUSED"] = "signature_reused";
    /** Payment quote has expired */
    PaymentErrorCode["QUOTE_EXPIRED"] = "quote_expired";
    // ===== Validation Errors (400) =====
    // Request input validation
    /** Required field missing */
    PaymentErrorCode["MISSING_FIELD"] = "missing_field";
    /** Field format invalid */
    PaymentErrorCode["INVALID_FIELD"] = "invalid_field";
    /** Amount invalid or negative */
    PaymentErrorCode["INVALID_AMOUNT"] = "invalid_amount";
    /** Wallet address invalid */
    PaymentErrorCode["INVALID_WALLET"] = "invalid_wallet";
    /** Resource ID invalid */
    PaymentErrorCode["INVALID_RESOURCE"] = "invalid_resource";
    /** Coupon code invalid */
    PaymentErrorCode["INVALID_COUPON"] = "invalid_coupon";
    /** Cart item invalid */
    PaymentErrorCode["INVALID_CART_ITEM"] = "invalid_cart_item";
    /** Cart is empty */
    PaymentErrorCode["EMPTY_CART"] = "empty_cart";
    // ===== Resource/State Errors (404) =====
    // Resource not found or in wrong state
    /** Generic resource not found */
    PaymentErrorCode["RESOURCE_NOT_FOUND"] = "resource_not_found";
    /** Cart not found */
    PaymentErrorCode["CART_NOT_FOUND"] = "cart_not_found";
    /** Refund not found */
    PaymentErrorCode["REFUND_NOT_FOUND"] = "refund_not_found";
    /** Product not found */
    PaymentErrorCode["PRODUCT_NOT_FOUND"] = "product_not_found";
    /** Coupon not found */
    PaymentErrorCode["COUPON_NOT_FOUND"] = "coupon_not_found";
    /** Session not found */
    PaymentErrorCode["SESSION_NOT_FOUND"] = "session_not_found";
    /** Cart already paid */
    PaymentErrorCode["CART_ALREADY_PAID"] = "cart_already_paid";
    /** Refund already processed */
    PaymentErrorCode["REFUND_ALREADY_PROCESSED"] = "refund_already_processed";
    // ===== Coupon-Specific Errors (409) =====
    // Business rule conflicts
    /** Coupon has expired */
    PaymentErrorCode["COUPON_EXPIRED"] = "coupon_expired";
    /** Coupon usage limit reached */
    PaymentErrorCode["COUPON_USAGE_LIMIT_REACHED"] = "coupon_usage_limit_reached";
    /** Coupon not applicable to this purchase */
    PaymentErrorCode["COUPON_NOT_APPLICABLE"] = "coupon_not_applicable";
    /** Coupon not valid for payment method */
    PaymentErrorCode["COUPON_WRONG_PAYMENT_METHOD"] = "coupon_wrong_payment_method";
    // ===== External Service Errors (502) =====
    // Third-party service failures (RETRYABLE)
    /** Stripe API error (RETRYABLE) */
    PaymentErrorCode["STRIPE_ERROR"] = "stripe_error";
    /** Solana RPC error (RETRYABLE) */
    PaymentErrorCode["RPC_ERROR"] = "rpc_error";
    /** Network communication error (RETRYABLE) */
    PaymentErrorCode["NETWORK_ERROR"] = "network_error";
    // ===== Internal/System Errors (500) =====
    // Server-side errors
    /** Internal server error */
    PaymentErrorCode["INTERNAL_ERROR"] = "internal_error";
    /** Database operation failed */
    PaymentErrorCode["DATABASE_ERROR"] = "database_error";
    /** Server configuration error */
    PaymentErrorCode["CONFIG_ERROR"] = "config_error";
    // ===== Credits Payment Errors (402) =====
    // Credits-specific payment failures
    /** User doesn't have enough credits for purchase */
    PaymentErrorCode["INSUFFICIENT_CREDITS"] = "insufficient_credits";
    /** Credits hold expired before authorization */
    PaymentErrorCode["CREDITS_HOLD_EXPIRED"] = "credits_hold_expired";
    /** Credits hold not found */
    PaymentErrorCode["CREDITS_HOLD_NOT_FOUND"] = "credits_hold_not_found";
    // ===== Security Errors (400/403) =====
    // Security-related validation failures
    /** Redirect URL blocked by SSRF protection */
    PaymentErrorCode["INVALID_REDIRECT_URL"] = "invalid_redirect_url";
    /** Rate limit exceeded */
    PaymentErrorCode["RATE_LIMIT_EXCEEDED"] = "rate_limit_exceeded";
    /** Admin nonce already used (replay protection) */
    PaymentErrorCode["NONCE_ALREADY_USED"] = "nonce_already_used";
})(PaymentErrorCode || (exports.PaymentErrorCode = PaymentErrorCode = {}));
/**
 * Payment error class with structured error information
 *
 * Extends Error with type-safe error code, retryability flag,
 * and optional details for robust error handling.
 */
class PaymentError extends Error {
    constructor(code, message, retryable = false, details, httpStatus) {
        super(message);
        this.name = 'PaymentError';
        this.code = code;
        this.retryable = retryable;
        this.details = details;
        this.httpStatus = httpStatus;
        // Maintain proper prototype chain for instanceof checks
        Object.setPrototypeOf(this, PaymentError.prototype);
    }
    /**
     * Check if this error is retryable
     */
    canRetry() {
        return this.retryable;
    }
    /**
     * Check if this is a specific error code
     */
    is(code) {
        return this.code === code;
    }
    /**
     * Check if this error is in a specific category
     */
    isInCategory(codes) {
        return codes.includes(this.code);
    }
    /**
     * Get a user-friendly error message
     * Uses structured error messages with actionable guidance
     */
    getUserMessage() {
        const errorInfo = this.getErrorInfo();
        // Return message + action for maximum helpfulness
        if (errorInfo.action) {
            return `${errorInfo.message} ${errorInfo.action}`;
        }
        return errorInfo.message;
    }
    /**
     * Get short error message without action guidance
     */
    getShortMessage() {
        return this.getErrorInfo().message;
    }
    /**
     * Get actionable guidance for this error
     */
    getAction() {
        return this.getErrorInfo().action;
    }
    /**
     * Get error info from error messages map
     * @private
     */
    getErrorInfo() {
        // Use error code as string to avoid circular dependency
        return (0, errorMessages_1.getUserFriendlyError)(this.code);
    }
    /**
     * Create PaymentError from API error response
     *
     * If `retryable` field is not present (Rust server), infers retryability
     * from error codes using ERROR_CATEGORIES.RETRYABLE.
     */
    static fromErrorResponse(response, httpStatus) {
        // Infer retryability from error code if not explicitly provided
        // Rust server doesn't include retryable field; Go server did
        const isRetryable = response.error.retryable ??
            exports.ERROR_CATEGORIES.RETRYABLE.includes(response.error.code);
        return new PaymentError(response.error.code, response.error.message, isRetryable, response.error.details, httpStatus);
    }
    /**
     * Create PaymentError from unknown error
     * Useful for catch blocks where error type is unknown
     */
    static fromUnknown(error) {
        if (error instanceof PaymentError) {
            return error;
        }
        if (error instanceof Error) {
            return new PaymentError(PaymentErrorCode.INTERNAL_ERROR, error.message, false);
        }
        return new PaymentError(PaymentErrorCode.INTERNAL_ERROR, String(error), false);
    }
}
exports.PaymentError = PaymentError;
/**
 * Error code categories for bulk error handling
 */
exports.ERROR_CATEGORIES = {
    /** Insufficient funds errors requiring user to add funds */
    INSUFFICIENT_FUNDS: [
        PaymentErrorCode.INSUFFICIENT_FUNDS_SOL,
        PaymentErrorCode.INSUFFICIENT_FUNDS_TOKEN,
    ],
    /** Transaction state errors that may resolve with time */
    TRANSACTION_PENDING: [
        PaymentErrorCode.TRANSACTION_NOT_CONFIRMED,
        PaymentErrorCode.TRANSACTION_NOT_FOUND,
    ],
    /** Validation errors requiring input correction */
    VALIDATION: [
        PaymentErrorCode.MISSING_FIELD,
        PaymentErrorCode.INVALID_FIELD,
        PaymentErrorCode.INVALID_AMOUNT,
        PaymentErrorCode.INVALID_WALLET,
        PaymentErrorCode.INVALID_RESOURCE,
        PaymentErrorCode.INVALID_CART_ITEM,
        PaymentErrorCode.EMPTY_CART,
    ],
    /** Coupon-related errors */
    COUPON: [
        PaymentErrorCode.INVALID_COUPON,
        PaymentErrorCode.COUPON_NOT_FOUND,
        PaymentErrorCode.COUPON_EXPIRED,
        PaymentErrorCode.COUPON_USAGE_LIMIT_REACHED,
        PaymentErrorCode.COUPON_NOT_APPLICABLE,
        PaymentErrorCode.COUPON_WRONG_PAYMENT_METHOD,
    ],
    /** Retryable errors (temporary failures) */
    RETRYABLE: [
        PaymentErrorCode.TRANSACTION_NOT_CONFIRMED,
        PaymentErrorCode.RPC_ERROR,
        PaymentErrorCode.NETWORK_ERROR,
        PaymentErrorCode.STRIPE_ERROR,
    ],
    /** Resource not found errors */
    NOT_FOUND: [
        PaymentErrorCode.RESOURCE_NOT_FOUND,
        PaymentErrorCode.CART_NOT_FOUND,
        PaymentErrorCode.REFUND_NOT_FOUND,
        PaymentErrorCode.PRODUCT_NOT_FOUND,
        PaymentErrorCode.COUPON_NOT_FOUND,
        PaymentErrorCode.SESSION_NOT_FOUND,
        PaymentErrorCode.CREDITS_HOLD_NOT_FOUND,
    ],
    /** Credits-related errors */
    CREDITS: [
        PaymentErrorCode.INSUFFICIENT_CREDITS,
        PaymentErrorCode.CREDITS_HOLD_EXPIRED,
        PaymentErrorCode.CREDITS_HOLD_NOT_FOUND,
    ],
    /** Security/rate limit errors */
    SECURITY: [
        PaymentErrorCode.INVALID_REDIRECT_URL,
        PaymentErrorCode.RATE_LIMIT_EXCEEDED,
        PaymentErrorCode.NONCE_ALREADY_USED,
    ],
};
//# sourceMappingURL=errors.js.map