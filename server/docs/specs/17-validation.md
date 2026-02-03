# Cedros Pay Server - Validation Rules

Complete input validation rules for reimplementation.

---

## Configuration Validation (Startup)

| Field | Rule | Error |
|-------|------|-------|
| `stripe.secret_key` | Required when publishable key set | "stripe.secret_key is required when publishable key is set" |
| `x402.payment_address` | Required | "x402.payment_address is required" |
| `x402.token_mint` | Required | "x402.token_mint is required" |
| `x402.token_mint` | Must be USDC, USDT, PYUSD, or CASH | "token_mint validation failed" |
| `x402.rpc_url` | Required | "x402.rpc_url is required" |
| `x402.server_wallet_keys` | Required when gasless or auto_create enabled | "x402.server_wallet_keys required when gasless_enabled..." |
| `paywall.resources` | At least one when product_source='yaml' | "must define at least one resource" |
| `resource pricing` | At least one of fiat/crypto/stripe_price_id | "must define fiat_amount_cents, crypto_atomic_amount, or stripe_price_id" |

---

## Request Validation

### Quote Request

| Field | Rule | Error Code |
|-------|------|------------|
| `resource` | Required, non-empty | `missing_field` |

### Cart Quote Request

| Field | Rule | Error Code |
|-------|------|------------|
| `items` | At least one item | `empty_cart` |
| `items[].resource` | Required for each item | `invalid_cart_item` |
| `items[].quantity` | Defaults to 1 if ≤ 0 | (silent default) |
| All items | Must have same token type | `invalid_cart_item` |

### Cart Checkout Request

| Field | Rule | Error Code |
|-------|------|------------|
| `items` | At least one item | `empty_cart` |
| `items[].priceId` OR `items[].resource` | One required per item | `invalid_cart_item` |
| `couponCode` | Must apply to all items if provided | `coupon_not_applicable` |

### Refund Request

| Field | Rule | Error Code |
|-------|------|------------|
| `originalPurchaseId` | Required | `missing_field` |
| `recipientWallet` | Required, valid Solana address | `invalid_wallet` |
| `amount` | Must be > 0 | `invalid_amount` |
| `token` | Required | `missing_field` |
| Existing refund | One refund per original tx | `refund_already_processed` |

### Subscription Request

| Field | Rule | Error Code |
|-------|------|------------|
| `resource` | Required | `missing_field` |
| `interval` | Required (weekly/monthly/yearly/custom) | `invalid_field` |

---

## Payment Verification

### X-PAYMENT Header

| Check | Rule | Error Code |
|-------|------|------------|
| Header presence | Required | `invalid_payment_proof` |
| Base64 decode | Must be valid base64 or JSON | `invalid_payment_proof` |
| `x402Version` | Must be 0 | `invalid_payment_proof` |
| `scheme` | Must be "solana-spl-transfer" or "solana" | `invalid_payment_proof` |
| `network` | Must match configured network | `invalid_payment_proof` |
| `payload.transaction` | Required | `invalid_transaction` |

### Transaction Verification

| Check | Rule | Error Code |
|-------|------|------------|
| Signature format | Valid base58 | `invalid_signature` |
| Transaction found | Must exist on chain | `transaction_not_found` |
| Confirmation | Must be confirmed | `transaction_not_confirmed` |
| Execution | Must not have failed | `transaction_failed` |
| Recipient | Must match expected token account | `invalid_recipient` |
| Token mint | Must match expected mint | `invalid_token_mint` |
| Amount | Must match quoted amount exactly | `amount_mismatch` |
| Replay | Signature must not be reused | `payment_already_used` |

---

## Coupon Validation

| Check | Rule | Error Code |
|-------|------|------------|
| `active` | Must be true | `invalid_coupon` |
| `starts_at` | Current time must be ≥ start | `invalid_coupon` |
| `expires_at` | Current time must be < expiry | `coupon_expired` |
| `usage_limit` | usage_count must be < limit | `coupon_usage_limit_reached` |
| `scope` (catalog) | Must be "specific" with product_ids | `coupon_not_applicable` |
| `scope` (checkout) | Must be "all" | `coupon_not_applicable` |
| `payment_method` | Must match if specified | `coupon_wrong_payment_method` |

---

## Wallet Address Validation

Solana wallet addresses must be:
- Valid base58 encoding
- 32 bytes when decoded
- Valid Ed25519 public key

```go
_, err := solana.PublicKeyFromBase58(address)
if err != nil {
    return errors.New("invalid wallet address")
}
```

---

## Signature Verification (Admin Auth)

Required headers for admin operations:

| Header | Rule | Error |
|--------|------|-------|
| `X-Signature` | Required, valid base64 | "signature required" |
| `X-Message` | Required | "signature required" |
| `X-Signer` | Required, valid base58 address | "invalid signer address" |

Verification:
1. Decode signature from base64
2. Decode signer public key from base58
3. Verify Ed25519 signature over message bytes
4. Check signer is authorized (payment address or allowed list)

---

## Amount Validation

### Positive Amount
```go
if amount <= 0 {
    return errors.New("amount must be positive")
}
```

### Exact Match (Payment)
```go
if paymentAmount != requiredAmount {
    return errors.New("payment amount does not match required amount")
}
```

Note: No overpayment is allowed. Amount must match exactly.

---

## Product ID Validation

| Rule | Limit |
|------|-------|
| Minimum length | 1 character |
| Maximum length | 255 characters |

---

## Table Name Validation (SQL Injection Prevention)

```go
validTableName := regexp.MustCompile(`^[a-zA-Z_][a-zA-Z0-9_]*$`)
if !validTableName.MatchString(tableName) {
    return errors.New("invalid table name")
}
```

---

## Private Key Validation

Accepts two formats:

### Base58 Format
- Must decode to valid bytes
- Standard Solana keypair format

### JSON Array Format
- Must be `[1,2,3,...]` format
- Must be exactly 64 bytes
- Each element must be 0-255

```go
// Example valid formats:
"5abc..." // base58
"[1,2,3,...64 bytes...]" // JSON array
```

---

## Token Mint Validation

Only allowed stablecoins:

| Symbol | Mint Address |
|--------|--------------|
| USDC | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` |
| USDT | `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB` |
| PYUSD | `2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo` |
| CASH | (configured address) |

---

## Subscription Period Validation

| Field | Valid Values |
|-------|--------------|
| `billing_period` | day, week, month, year |
| `billing_interval` | ≥ 1 |

