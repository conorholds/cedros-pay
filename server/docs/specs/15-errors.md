# Cedros Pay Server - Error Handling

49 error codes with handling specifications (47 exported + 3 internal message codes).

---

## Error Response Format

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {}
  }
}
```

---

## Payment Verification Errors (HTTP 402)

| Code | Constant | Description |
|------|----------|-------------|
| `invalid_payment_proof` | `ErrCodeInvalidPaymentProof` | Invalid payment proof format or structure |
| `invalid_signature` | `ErrCodeInvalidSignature` | Signature validation failed |
| `invalid_transaction` | `ErrCodeInvalidTransaction` | Transaction validation failed |
| `transaction_not_found` | `ErrCodeTransactionNotFound` | Transaction not found on chain |
| `transaction_not_confirmed` | `ErrCodeTransactionNotConfirmed` | Transaction not yet confirmed |
| `transaction_failed` | `ErrCodeTransactionFailed` | Transaction execution failed |
| `amount_below_minimum` | `ErrCodeAmountBelowMinimum` | Payment amount below required minimum |
| `amount_mismatch` | `ErrCodeAmountMismatch` | Payment amount doesn't match quote |
| `insufficient_funds_sol` | `ErrCodeInsufficientFunds` | Insufficient SOL for fees |
| `insufficient_funds_token` | `ErrCodeInsufficientFundsToken` | Insufficient token balance |
| `invalid_token_mint` | `ErrCodeInvalidTokenMint` | Wrong token mint address |
| `not_spl_transfer` | `ErrCodeNotSPLTransfer` | Transaction is not an SPL transfer |
| `missing_token_account` | `ErrCodeMissingTokenAccount` | Token account doesn't exist |
| `invalid_token_program` | `ErrCodeInvalidTokenProgram` | Invalid token program ID |
| `missing_memo` | `ErrCodeMissingMemo` | Required memo missing |
| `invalid_memo` | `ErrCodeInvalidMemo` | Memo format invalid |
| `payment_already_used` | `ErrCodePaymentAlreadyUsed` | Payment proof already used (replay) |
| `signature_reused` | `ErrCodeSignatureReused` | Transaction signature already processed |
| `quote_expired` | `ErrCodeQuoteExpired` | Payment quote has expired |
| `transaction_expired` | `ErrCodeTransactionExpired` | Transaction too old |

---

## Recipient/Sender Validation (HTTP 400/403)

| Code | Constant | HTTP | Description |
|------|----------|------|-------------|
| `invalid_recipient` | `ErrCodeInvalidRecipient` | 400 | Payment sent to wrong recipient |
| `invalid_sender` | `ErrCodeInvalidSender` | 400 | Invalid sender address |
| `unauthorized_refund_issuer` | `ErrCodeUnauthorizedRefundIssuer` | 403 | Not authorized to issue refunds |

---

## Validation Errors (HTTP 400)

| Code | Constant | Description |
|------|----------|-------------|
| `missing_field` | `ErrCodeMissingField` | Required field missing |
| `invalid_field` | `ErrCodeInvalidField` | Field value invalid |
| `invalid_amount` | `ErrCodeInvalidAmount` | Invalid amount format |
| `invalid_wallet` | `ErrCodeInvalidWallet` | Invalid wallet address |
| `invalid_resource` | `ErrCodeInvalidResource` | Invalid resource ID |
| `invalid_coupon` | `ErrCodeInvalidCoupon` | Coupon code invalid |
| `invalid_cart_item` | `ErrCodeInvalidCartItem` | Invalid cart item |
| `empty_cart` | `ErrCodeEmptyCart` | Cart has no items |
| `cart_already_paid` | `ErrCodeCartAlreadyPaid` | Cart already paid |
| `refund_already_processed` | `ErrCodeRefundAlreadyProcessed` | Refund already processed |
| `mixed_tokens_in_cart` | `ErrCodeMixedTokensInCart` | Cart contains items with different tokens |
| `invalid_resource_type` | `ErrCodeInvalidResourceType` | Invalid resourceType in payment proof |
| `nonce_expired` | `ErrCodeNonceExpired` | Admin nonce has expired |
| `nonce_already_used` | `ErrCodeNonceAlreadyUsed` | Admin nonce already consumed |
| `invalid_nonce_purpose` | `ErrCodeInvalidNoncePurpose` | Nonce purpose doesn't match operation |

---

## Resource Not Found Errors (HTTP 404)

| Code | Constant | Description |
|------|----------|-------------|
| `resource_not_found` | `ErrCodeResourceNotFound` | Resource/product not found |
| `cart_not_found` | `ErrCodeCartNotFound` | Cart quote not found |
| `refund_not_found` | `ErrCodeRefundNotFound` | Refund quote not found |
| `product_not_found` | `ErrCodeProductNotFound` | Product not in catalog |
| `coupon_not_found` | `ErrCodeCouponNotFound` | Coupon code not found |
| `session_not_found` | `ErrCodeSessionNotFound` | Stripe session not found |
| `subscription_not_found` | `ErrCodeSubscriptionNotFound` | Subscription not found |
| `nonce_not_found` | `ErrCodeNonceNotFound` | Admin nonce not found or expired |

---

## Coupon Errors (HTTP 409)

| Code | Constant | Description |
|------|----------|-------------|
| `coupon_expired` | `ErrCodeCouponExpired` | Coupon has expired |
| `coupon_usage_limit_reached` | `ErrCodeCouponUsageLimitReached` | Coupon usage limit exceeded |
| `coupon_not_applicable` | `ErrCodeCouponNotApplicable` | Coupon not valid for this product |
| `coupon_wrong_payment_method` | `ErrCodeCouponWrongPaymentMethod` | Coupon not valid for payment method |

---

## External Service Errors (HTTP 502)

| Code | Constant | Description |
|------|----------|-------------|
| `stripe_error` | `ErrCodeStripeError` | Stripe API error |
| `rpc_error` | `ErrCodeRPCError` | Solana RPC error |
| `network_error` | `ErrCodeNetworkError` | Network connectivity error |

---

## Internal Errors (HTTP 500)

| Code | Constant | Description |
|------|----------|-------------|
| `internal_error` | `ErrCodeInternalError` | Internal server error |
| `database_error` | `ErrCodeDatabaseError` | Database operation failed |
| `config_error` | `ErrCodeConfigError` | Configuration error |

---

## Internal Error Codes (Used in Message Mapping)

These error codes are used internally for message handling but don't have exported constants. They are mapped to appropriate HTTP status codes and user-friendly messages:

| Code | HTTP Status | User Message |
|------|-------------|--------------|
| `server_insufficient_funds` | 500 | Service temporarily unavailable due to insufficient server funds. Please try again later or contact support. |
| `send_failed` | 402 | Transaction failed to send. Please check your wallet balance and try again. |
| `send_failed_after_account_creation` | 402 | Transaction failed after creating token account. Please check the blockchain explorer and retry if needed. |

**When These Occur:**
- `server_insufficient_funds`: Server wallet has insufficient SOL for gasless transaction fees
- `send_failed`: RPC `sendTransaction` failed (could be network issue, invalid tx, or blockhash expired)
- `send_failed_after_account_creation`: After successfully creating a token account for the recipient, the retry of the original payment transaction failed

---

## Error Code Behavior

### IsRetryable()

**Retryable errors:**
- `rpc_error`
- `network_error`
- `stripe_error`
- `transaction_not_confirmed`

**Not retryable:**
- All validation errors
- All permanent failures
- Payment replay errors

### HTTPStatus()

| Error Category | HTTP Status |
|----------------|-------------|
| Payment verification | 402 |
| Validation | 400 |
| Authentication | 401 |
| Authorization | 403 |
| Not found | 404 |
| Conflict | 409 |
| Rate limit | 429 |
| External service | 502 |
| Internal | 500 |

---

## User-Friendly Error Messages

Implementations MUST provide human-readable messages for frontend display:

| Error Code | User-Friendly Message |
|------------|----------------------|
| `insufficient_funds_token` | "Insufficient token balance. Please add more tokens to your wallet and try again." |
| `insufficient_funds_sol` | "Insufficient SOL for transaction fees. Please add some SOL to your wallet and try again." |
| `server_insufficient_funds` | "Service temporarily unavailable due to insufficient server funds. Please try again later or contact support." |
| `amount_below_minimum` | "Payment amount is less than required. Please check the payment amount and try again." |
| `invalid_signature` | "Invalid transaction signature. Please try again." |
| `invalid_memo` | "Invalid payment memo. Please use the payment details provided by the quote." |
| `invalid_token_mint` | "Wrong token used for payment. Please use the correct token specified in the quote." |
| `invalid_recipient` | "Payment sent to wrong address. Please check the recipient address and try again." |
| `missing_token_account` | "Token account not found. Please create a token account for this token first." |
| `send_failed` | "Transaction failed to send. Please check your wallet balance and try again." |
| `transaction_not_found` | "Transaction not found on the blockchain. It may have been dropped. Please try again." |
| `transaction_expired` | "Transaction timed out. Please check the blockchain explorer and try again if needed." |
| `transaction_failed` | "Transaction failed on the blockchain. Check your wallet for details. You may need to adjust your transaction settings or add more SOL for fees." |
| `payment_already_used` | "This payment has already been processed. Each payment can only be used once." |
| `amount_mismatch` | "Payment amount does not match the required amount. Please pay the exact amount shown." |

---

## Smart Error Detection

Parse underlying Solana errors to provide specific messages:

| Pattern | Detected As |
|---------|-------------|
| `custom program error: 0x1` | Insufficient token balance |
| `insufficient lamports` | Insufficient SOL for fees |
| `account not found` | Token account doesn't exist |
| `Transaction simulation failed` | Various - parse inner error |
| `blockhash not found` | Transaction expired |

### Detection Functions

```go
func isInsufficientFundsTokenError(err error) bool
func isInsufficientFundsSOLError(err error) bool
func isAccountNotFoundError(err error) bool
func isTransactionNotFoundError(err error) bool
func isAlreadyProcessedError(err error) bool
func isRateLimitError(err error) bool
```

---

## Partial Failure Handling

Some operations have multiple steps where partial failure is handled gracefully:

### Coupon Usage Increment (Non-Fatal)

If coupon usage increment fails after successful payment:
- **Payment succeeds** (user gets access)
- Error is logged as warning
- Usage count may be slightly inaccurate
- Reason: Payment verification is the critical path; usage tracking is best-effort

### Webhook Delivery (Async)

If webhook delivery fails after successful payment:
- **Payment succeeds** (user gets access)
- Webhook retried according to retry policy
- Eventually moved to DLQ if all retries fail
- Reason: Webhook is notification, not gating

### Metrics Recording (Non-Fatal)

If metrics recording fails:
- **Operation succeeds**
- Error logged but not propagated
- Reason: Observability should not affect correctness

---

## Error Logging

### What to Log

- Error code
- Error message
- Request ID
- Wallet (truncated)
- Resource ID
- Stack trace (for internal errors)

### What NOT to Log

- Full wallet addresses
- Private keys
- Full transaction data
- Sensitive user data

### Log Format

```json
{
  "level": "error",
  "timestamp": "2025-12-01T10:00:00Z",
  "request_id": "req_abc123",
  "error_code": "insufficient_funds_token",
  "message": "payment verification failed",
  "wallet": "7cVf...jpT",
  "resource_id": "product-1",
  "details": {
    "required_amount": 1000000,
    "available_balance": 500000
  }
}
```
