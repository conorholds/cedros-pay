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
export declare enum PaymentErrorCode {
    /** Invalid payment proof format or structure */
    INVALID_PAYMENT_PROOF = "invalid_payment_proof",
    /** Invalid transaction signature */
    INVALID_SIGNATURE = "invalid_signature",
    /** Invalid transaction structure */
    INVALID_TRANSACTION = "invalid_transaction",
    /** Transaction not found on blockchain */
    TRANSACTION_NOT_FOUND = "transaction_not_found",
    /** Transaction not confirmed yet (RETRYABLE) */
    TRANSACTION_NOT_CONFIRMED = "transaction_not_confirmed",
    /** Transaction failed on-chain */
    TRANSACTION_FAILED = "transaction_failed",
    /** Transaction timed out */
    TRANSACTION_EXPIRED = "transaction_expired",
    /** Payment sent to wrong address */
    INVALID_RECIPIENT = "invalid_recipient",
    /** Invalid sender wallet */
    INVALID_SENDER = "invalid_sender",
    /** Only authorized wallets can issue refunds */
    UNAUTHORIZED_REFUND_ISSUER = "unauthorized_refund_issuer",
    /** Payment amount less than required */
    AMOUNT_BELOW_MINIMUM = "amount_below_minimum",
    /** Payment amount doesn't match quote */
    AMOUNT_MISMATCH = "amount_mismatch",
    /** Insufficient SOL for transaction fees */
    INSUFFICIENT_FUNDS_SOL = "insufficient_funds_sol",
    /** Insufficient token balance */
    INSUFFICIENT_FUNDS_TOKEN = "insufficient_funds_token",
    /** Wrong token used for payment */
    INVALID_TOKEN_MINT = "invalid_token_mint",
    /** Transaction is not a valid SPL token transfer */
    NOT_SPL_TRANSFER = "not_spl_transfer",
    /** Token account not found */
    MISSING_TOKEN_ACCOUNT = "missing_token_account",
    /** Invalid token program */
    INVALID_TOKEN_PROGRAM = "invalid_token_program",
    /** Required memo missing from transaction */
    MISSING_MEMO = "missing_memo",
    /** Invalid memo format */
    INVALID_MEMO = "invalid_memo",
    /** Payment signature already used (replay protection) */
    PAYMENT_ALREADY_USED = "payment_already_used",
    /** Transaction signature reused */
    SIGNATURE_REUSED = "signature_reused",
    /** Payment quote has expired */
    QUOTE_EXPIRED = "quote_expired",
    /** Required field missing */
    MISSING_FIELD = "missing_field",
    /** Field format invalid */
    INVALID_FIELD = "invalid_field",
    /** Amount invalid or negative */
    INVALID_AMOUNT = "invalid_amount",
    /** Wallet address invalid */
    INVALID_WALLET = "invalid_wallet",
    /** Resource ID invalid */
    INVALID_RESOURCE = "invalid_resource",
    /** Coupon code invalid */
    INVALID_COUPON = "invalid_coupon",
    /** Cart item invalid */
    INVALID_CART_ITEM = "invalid_cart_item",
    /** Cart is empty */
    EMPTY_CART = "empty_cart",
    /** Generic resource not found */
    RESOURCE_NOT_FOUND = "resource_not_found",
    /** Cart not found */
    CART_NOT_FOUND = "cart_not_found",
    /** Refund not found */
    REFUND_NOT_FOUND = "refund_not_found",
    /** Product not found */
    PRODUCT_NOT_FOUND = "product_not_found",
    /** Coupon not found */
    COUPON_NOT_FOUND = "coupon_not_found",
    /** Session not found */
    SESSION_NOT_FOUND = "session_not_found",
    /** Cart already paid */
    CART_ALREADY_PAID = "cart_already_paid",
    /** Refund already processed */
    REFUND_ALREADY_PROCESSED = "refund_already_processed",
    /** Coupon has expired */
    COUPON_EXPIRED = "coupon_expired",
    /** Coupon usage limit reached */
    COUPON_USAGE_LIMIT_REACHED = "coupon_usage_limit_reached",
    /** Coupon not applicable to this purchase */
    COUPON_NOT_APPLICABLE = "coupon_not_applicable",
    /** Coupon not valid for payment method */
    COUPON_WRONG_PAYMENT_METHOD = "coupon_wrong_payment_method",
    /** Stripe API error (RETRYABLE) */
    STRIPE_ERROR = "stripe_error",
    /** Solana RPC error (RETRYABLE) */
    RPC_ERROR = "rpc_error",
    /** Network communication error (RETRYABLE) */
    NETWORK_ERROR = "network_error",
    /** Internal server error */
    INTERNAL_ERROR = "internal_error",
    /** Database operation failed */
    DATABASE_ERROR = "database_error",
    /** Server configuration error */
    CONFIG_ERROR = "config_error",
    /** User doesn't have enough credits for purchase */
    INSUFFICIENT_CREDITS = "insufficient_credits",
    /** Credits hold expired before authorization */
    CREDITS_HOLD_EXPIRED = "credits_hold_expired",
    /** Credits hold not found */
    CREDITS_HOLD_NOT_FOUND = "credits_hold_not_found",
    /** Redirect URL blocked by SSRF protection */
    INVALID_REDIRECT_URL = "invalid_redirect_url",
    /** Rate limit exceeded */
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded",
    /** Admin nonce already used (replay protection) */
    NONCE_ALREADY_USED = "nonce_already_used"
}
/**
 * Structured error response from backend API
 *
 * NOTE: The Rust server does not include a `retryable` field.
 * Retryability is inferred from error codes using ERROR_CATEGORIES.RETRYABLE.
 */
export interface ErrorResponse {
    error: {
        /** Machine-readable error code */
        code: PaymentErrorCode;
        /** Human-readable error message for display */
        message: string;
        /** Whether the operation can be safely retried (optional - legacy Go server only) */
        retryable?: boolean;
        /** Additional context (resourceId, amounts, etc.) */
        details?: Record<string, unknown>;
    };
}
/**
 * Payment error class with structured error information
 *
 * Extends Error with type-safe error code, retryability flag,
 * and optional details for robust error handling.
 */
export declare class PaymentError extends Error {
    /** Machine-readable error code enum */
    readonly code: PaymentErrorCode;
    /** Whether this error can be safely retried */
    readonly retryable: boolean;
    /** Additional error context */
    readonly details?: Record<string, unknown>;
    /** HTTP status code (if from API response) */
    readonly httpStatus?: number;
    constructor(code: PaymentErrorCode, message: string, retryable?: boolean, details?: Record<string, unknown>, httpStatus?: number);
    /**
     * Check if this error is retryable
     */
    canRetry(): boolean;
    /**
     * Check if this is a specific error code
     */
    is(code: PaymentErrorCode): boolean;
    /**
     * Check if this error is in a specific category
     */
    isInCategory(codes: readonly PaymentErrorCode[]): boolean;
    /**
     * Get a user-friendly error message
     * Uses structured error messages with actionable guidance
     */
    getUserMessage(): string;
    /**
     * Get short error message without action guidance
     */
    getShortMessage(): string;
    /**
     * Get actionable guidance for this error
     */
    getAction(): string | undefined;
    /**
     * Get error info from error messages map
     * @private
     */
    private getErrorInfo;
    /**
     * Create PaymentError from API error response
     *
     * If `retryable` field is not present (Rust server), infers retryability
     * from error codes using ERROR_CATEGORIES.RETRYABLE.
     */
    static fromErrorResponse(response: ErrorResponse, httpStatus?: number): PaymentError;
    /**
     * Create PaymentError from unknown error
     * Useful for catch blocks where error type is unknown
     */
    static fromUnknown(error: unknown): PaymentError;
}
/**
 * Error code categories for bulk error handling
 */
export declare const ERROR_CATEGORIES: {
    /** Insufficient funds errors requiring user to add funds */
    readonly INSUFFICIENT_FUNDS: readonly [PaymentErrorCode.INSUFFICIENT_FUNDS_SOL, PaymentErrorCode.INSUFFICIENT_FUNDS_TOKEN];
    /** Transaction state errors that may resolve with time */
    readonly TRANSACTION_PENDING: readonly [PaymentErrorCode.TRANSACTION_NOT_CONFIRMED, PaymentErrorCode.TRANSACTION_NOT_FOUND];
    /** Validation errors requiring input correction */
    readonly VALIDATION: readonly [PaymentErrorCode.MISSING_FIELD, PaymentErrorCode.INVALID_FIELD, PaymentErrorCode.INVALID_AMOUNT, PaymentErrorCode.INVALID_WALLET, PaymentErrorCode.INVALID_RESOURCE, PaymentErrorCode.INVALID_CART_ITEM, PaymentErrorCode.EMPTY_CART];
    /** Coupon-related errors */
    readonly COUPON: readonly [PaymentErrorCode.INVALID_COUPON, PaymentErrorCode.COUPON_NOT_FOUND, PaymentErrorCode.COUPON_EXPIRED, PaymentErrorCode.COUPON_USAGE_LIMIT_REACHED, PaymentErrorCode.COUPON_NOT_APPLICABLE, PaymentErrorCode.COUPON_WRONG_PAYMENT_METHOD];
    /** Retryable errors (temporary failures) */
    readonly RETRYABLE: readonly [PaymentErrorCode.TRANSACTION_NOT_CONFIRMED, PaymentErrorCode.RPC_ERROR, PaymentErrorCode.NETWORK_ERROR, PaymentErrorCode.STRIPE_ERROR];
    /** Resource not found errors */
    readonly NOT_FOUND: readonly [PaymentErrorCode.RESOURCE_NOT_FOUND, PaymentErrorCode.CART_NOT_FOUND, PaymentErrorCode.REFUND_NOT_FOUND, PaymentErrorCode.PRODUCT_NOT_FOUND, PaymentErrorCode.COUPON_NOT_FOUND, PaymentErrorCode.SESSION_NOT_FOUND, PaymentErrorCode.CREDITS_HOLD_NOT_FOUND];
    /** Credits-related errors */
    readonly CREDITS: readonly [PaymentErrorCode.INSUFFICIENT_CREDITS, PaymentErrorCode.CREDITS_HOLD_EXPIRED, PaymentErrorCode.CREDITS_HOLD_NOT_FOUND];
    /** Security/rate limit errors */
    readonly SECURITY: readonly [PaymentErrorCode.INVALID_REDIRECT_URL, PaymentErrorCode.RATE_LIMIT_EXCEEDED, PaymentErrorCode.NONCE_ALREADY_USED];
};
//# sourceMappingURL=errors.d.ts.map