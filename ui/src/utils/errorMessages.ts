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
export const ERROR_MESSAGES: Record<string, ErrorMessage> = {
  // ===== PAYMENT VERIFICATION ERRORS (402) =====

  invalid_payment_proof: {
    message: 'Payment verification failed',
    action: 'Please try your payment again. If this continues, contact support.',
    technicalHint: 'Invalid payment proof format',
  },

  invalid_signature: {
    message: 'Transaction signature is invalid',
    action: 'Please approve the transaction in your wallet and try again.',
    technicalHint: 'Transaction signature verification failed',
  },

  invalid_transaction: {
    message: 'Transaction format is invalid',
    action: 'Please try your payment again. If this continues, try updating your wallet app.',
    technicalHint: 'Malformed transaction structure',
  },

  transaction_not_found: {
    message: 'Transaction not found on the blockchain',
    action: 'Your transaction may still be processing. Please wait a moment and check your wallet, or try again.',
    technicalHint: 'Transaction signature not found on-chain',
  },

  transaction_not_confirmed: {
    message: 'Transaction is still processing',
    action: 'Please wait a moment for the blockchain to confirm your transaction, then try again.',
    technicalHint: 'Transaction not yet confirmed',
  },

  transaction_failed: {
    message: 'Transaction failed on the blockchain',
    action: 'Check your wallet for details. You may need to adjust your transaction settings or add more SOL for fees.',
    technicalHint: 'On-chain transaction failure',
  },

  transaction_expired: {
    message: 'Transaction took too long to process',
    action: 'Please try your payment again. Consider increasing transaction priority if your wallet supports it.',
    technicalHint: 'Transaction blockhash expired',
  },

  invalid_recipient: {
    message: 'Payment was sent to the wrong address',
    action: 'Please try again and ensure you approve the correct transaction in your wallet.',
    technicalHint: 'Recipient address mismatch',
  },

  invalid_sender: {
    message: 'Payment sender wallet is invalid',
    action: 'Please reconnect your wallet and try again.',
    technicalHint: 'Sender address validation failed',
  },

  unauthorized_refund_issuer: {
    message: 'You are not authorized to issue refunds',
    action: 'Only authorized accounts can process refunds. Please contact support if you believe this is an error.',
    technicalHint: 'Refund issuer not in authorized list',
  },

  amount_below_minimum: {
    message: 'Payment amount is too low',
    action: 'Please check the required amount and try again.',
    technicalHint: 'Amount below minimum threshold',
  },

  amount_mismatch: {
    message: 'Payment amount does not match the quote',
    action: 'The price may have changed. Please refresh and try your payment again.',
    technicalHint: 'Amount does not match quote',
  },

  insufficient_funds_sol: {
    message: 'Not enough SOL for transaction fees',
    action: 'Add at least 0.001 SOL to your wallet to cover network fees, then try again.',
    technicalHint: 'Insufficient SOL balance for fees',
  },

  insufficient_funds_token: {
    message: 'Insufficient balance in your wallet',
    action: 'Add more funds to your wallet and try again.',
    technicalHint: 'Insufficient token balance',
  },

  invalid_token_mint: {
    message: 'Incorrect payment token',
    action: 'Please pay with the correct token as shown in the payment details.',
    technicalHint: 'Token mint address mismatch',
  },

  not_spl_transfer: {
    message: 'Transaction is not a valid token transfer',
    action: 'Please ensure you are sending the correct token type from your wallet.',
    technicalHint: 'Transaction is not an SPL token transfer',
  },

  missing_token_account: {
    message: 'Token account not found',
    action: 'Your wallet may need to create a token account first. Try again or use a different wallet.',
    technicalHint: 'Associated token account does not exist',
  },

  invalid_token_program: {
    message: 'Invalid token program',
    action: 'Please try your payment again. If this continues, try using a different wallet.',
    technicalHint: 'Token program ID mismatch',
  },

  missing_memo: {
    message: 'Payment memo is required but was not included',
    action: 'Please try your payment again and ensure transaction details are approved in your wallet.',
    technicalHint: 'Required memo instruction missing',
  },

  invalid_memo: {
    message: 'Payment memo format is invalid',
    action: 'Please try your payment again.',
    technicalHint: 'Memo does not match expected format',
  },

  payment_already_used: {
    message: 'This payment has already been processed',
    action: 'Check your transaction history. If you need to make another payment, please start a new transaction.',
    technicalHint: 'Payment signature already recorded',
  },

  signature_reused: {
    message: 'Transaction signature has already been used',
    action: 'Please create a new payment transaction.',
    technicalHint: 'Duplicate signature detected',
  },

  quote_expired: {
    message: 'Payment quote has expired',
    action: 'Prices are updated frequently. Please refresh and try your payment again.',
    technicalHint: 'Quote timestamp expired',
  },

  // ===== VALIDATION ERRORS (400) =====

  missing_field: {
    message: 'Required information is missing',
    action: 'Please check all required fields and try again.',
    technicalHint: 'Required field not provided',
  },

  invalid_field: {
    message: 'Some information is invalid',
    action: 'Please check your input and try again.',
    technicalHint: 'Field validation failed',
  },

  invalid_amount: {
    message: 'Payment amount is invalid',
    action: 'Please check the amount and try again.',
    technicalHint: 'Amount validation failed',
  },

  invalid_wallet: {
    message: 'Wallet address is invalid',
    action: 'Please reconnect your wallet and try again.',
    technicalHint: 'Wallet address validation failed',
  },

  invalid_resource: {
    message: 'Invalid item selection',
    action: 'Please refresh the page and try again.',
    technicalHint: 'Resource ID validation failed',
  },

  invalid_coupon: {
    message: 'Invalid coupon code',
    action: 'Please check the coupon code and try again.',
    technicalHint: 'Coupon code format invalid',
  },

  invalid_cart_item: {
    message: 'One or more cart items are invalid',
    action: 'Please review your cart and try again.',
    technicalHint: 'Cart item validation failed',
  },

  empty_cart: {
    message: 'Your cart is empty',
    action: 'Please add items to your cart before checking out.',
    technicalHint: 'Cart contains no items',
  },

  // ===== RESOURCE/STATE ERRORS (404) =====

  resource_not_found: {
    message: 'Item not found',
    action: 'This item may no longer be available. Please refresh and try again.',
    technicalHint: 'Resource not found in database',
  },

  cart_not_found: {
    message: 'Shopping cart not found',
    action: 'Your cart may have expired. Please start a new order.',
    technicalHint: 'Cart ID not found',
  },

  refund_not_found: {
    message: 'Refund not found',
    action: 'Please check your refund reference number or contact support.',
    technicalHint: 'Refund ID not found',
  },

  product_not_found: {
    message: 'Product not available',
    action: 'This product may no longer be available. Please browse our current selection.',
    technicalHint: 'Product ID not found',
  },

  coupon_not_found: {
    message: 'Coupon code not found',
    action: 'Please check the coupon code or remove it to continue.',
    technicalHint: 'Coupon code not in database',
  },

  session_not_found: {
    message: 'Payment session expired',
    action: 'Please start a new payment.',
    technicalHint: 'Session ID not found or expired',
  },

  cart_already_paid: {
    message: 'This order has already been paid',
    action: 'Check your order history. If you need to make another purchase, please start a new order.',
    technicalHint: 'Cart marked as paid',
  },

  refund_already_processed: {
    message: 'This refund has already been processed',
    action: 'Check your transaction history or contact support for details.',
    technicalHint: 'Refund already completed',
  },

  // ===== COUPON-SPECIFIC ERRORS (409) =====

  coupon_expired: {
    message: 'Coupon has expired',
    action: 'Please remove the coupon code or use a different code.',
    technicalHint: 'Coupon expiration date passed',
  },

  coupon_usage_limit_reached: {
    message: 'Coupon usage limit reached',
    action: 'This coupon has been fully redeemed. Please try a different code.',
    technicalHint: 'Coupon max uses exceeded',
  },

  coupon_not_applicable: {
    message: 'Coupon cannot be applied to this purchase',
    action: 'Please check the coupon terms or remove it to continue.',
    technicalHint: 'Coupon conditions not met',
  },

  coupon_wrong_payment_method: {
    message: 'Coupon not valid for this payment method',
    action: 'Try a different payment method or remove the coupon code.',
    technicalHint: 'Coupon restricted to specific payment methods',
  },

  // ===== EXTERNAL SERVICE ERRORS (502) =====

  stripe_error: {
    message: 'Card payment service temporarily unavailable',
    action: 'Please try again in a moment, or use cryptocurrency payment instead.',
    technicalHint: 'Stripe API error',
  },

  rpc_error: {
    message: 'Blockchain network temporarily unavailable',
    action: 'Please try again in a moment, or use card payment instead.',
    technicalHint: 'Solana RPC error',
  },

  network_error: {
    message: 'Network connection issue',
    action: 'Please check your internet connection and try again.',
    technicalHint: 'Network request failed',
  },

  // ===== INTERNAL/SYSTEM ERRORS (500) =====

  internal_error: {
    message: 'Something went wrong on our end',
    action: 'Please try again. If this continues, contact support.',
    technicalHint: 'Internal server error',
  },

  database_error: {
    message: 'Service temporarily unavailable',
    action: 'Please try again in a moment.',
    technicalHint: 'Database operation failed',
  },

  config_error: {
    message: 'Service configuration error',
    action: 'Please contact support for assistance.',
    technicalHint: 'Server misconfiguration',
  },
};

/**
 * Get user-friendly error message for an error code string
 *
 * @param code - Payment error code (as string)
 * @returns User-friendly error message with action
 */
export function getUserFriendlyError(code: string): ErrorMessage {
  return ERROR_MESSAGES[code] || {
    message: 'An unexpected error occurred',
    action: 'Please try again or contact support if this continues.',
    technicalHint: `Unknown error code: ${code}`,
  };
}

/**
 * Format error for display to user
 *
 * @param code - Payment error code (as string)
 * @param includeAction - Whether to include the action guidance (default: true)
 * @returns Formatted error string
 */
export function formatUserError(code: string, includeAction: boolean = true): string {
  const error = getUserFriendlyError(code);
  if (includeAction && error.action) {
    return `${error.message} ${error.action}`;
  }
  return error.message;
}
