use std::time::Duration;

// ============================================================================
// Timeouts and Timing
// ============================================================================

/// Time-based estimate for blockhash validity window
pub const BLOCKHASH_VALIDITY_WINDOW: Duration = Duration::from_secs(90);

/// RPC polling frequency (fallback only, when WebSocket fails)
pub const RPC_POLL_INTERVAL: Duration = Duration::from_secs(2);

/// Maximum wait for transaction confirmation
pub const DEFAULT_CONFIRMATION_TIMEOUT: Duration = Duration::from_secs(120);

/// How long verified payments remain cached for access
pub const DEFAULT_ACCESS_TTL: Duration = Duration::from_secs(45 * 60);

/// Default quote TTL
pub const DEFAULT_QUOTE_TTL: Duration = Duration::from_secs(5 * 60);

/// Cart quote TTL
pub const DEFAULT_CART_QUOTE_TTL: Duration = Duration::from_secs(15 * 60);

/// Refund quote TTL
pub const DEFAULT_REFUND_QUOTE_TTL: Duration = Duration::from_secs(15 * 60);

/// Nonce TTL (hardcoded per spec)
pub const NONCE_TTL: Duration = Duration::from_secs(5 * 60);

/// Idempotency window (24 hours)
pub const IDEMPOTENCY_WINDOW: Duration = Duration::from_secs(24 * 60 * 60);

/// Health check timeout
pub const HEALTH_CHECK_TIMEOUT: Duration = Duration::from_secs(10);

/// Maximum time to wait for embedded payment callbacks
pub const PAYMENT_CALLBACK_TIMEOUT: Duration = Duration::from_secs(3);

// ============================================================================
// Amount Tolerances
// ============================================================================

/// Floating point tolerance for single product amount comparisons
/// Allows slight overpayment (tips)
pub const AMOUNT_TOLERANCE: f64 = 1e-9;

/// Cart payment tolerance (exact match only, no tips)
pub const CART_AMOUNT_TOLERANCE: f64 = 1e-6;

// ============================================================================
// Wallet Health Thresholds
// ============================================================================

/// Minimum SOL balance for healthy status
pub const MIN_HEALTHY_BALANCE: f64 = 0.005;

/// Critical SOL balance threshold
pub const CRITICAL_BALANCE: f64 = 0.001;

/// Wallet health check interval
pub const HEALTH_CHECK_INTERVAL: Duration = Duration::from_secs(5 * 60);

// ============================================================================
// Transaction Queue
// ============================================================================

/// Worker poll frequency
pub const QUEUE_POLL_INTERVAL: Duration = Duration::from_millis(50);

/// Transaction send timeout
pub const TX_TIMEOUT: Duration = Duration::from_secs(30);

/// Confirmation wait timeout
pub const TX_CONFIRM_TIMEOUT: Duration = Duration::from_secs(60);

/// Maximum retries for rate-limited transactions
pub const MAX_TX_RETRIES: u32 = 3;

/// Maximum total retry duration
pub const MAX_RETRY_DURATION: Duration = Duration::from_secs(120);

/// Maximum retries for network timeout errors per spec 22-x402-verifier.md line 258
pub const MAX_NETWORK_TIMEOUT_RETRIES: u32 = 2;

/// Fixed backoff for network timeout retries per spec 22-x402-verifier.md line 258
pub const NETWORK_TIMEOUT_BACKOFF: Duration = Duration::from_millis(500);

// ============================================================================
// Rate Limit Backoff
// ============================================================================

/// Initial backoff for rate-limited requests
pub const RATE_LIMIT_INITIAL_BACKOFF: Duration = Duration::from_millis(500);

/// Backoff multiplier for exponential retry
pub const RATE_LIMIT_BACKOFF_MULTIPLIER: f64 = 2.0;

/// Maximum backoff duration
pub const RATE_LIMIT_MAX_BACKOFF: Duration = Duration::from_secs(2);

// ============================================================================
// Request Limits
// ============================================================================

/// Maximum request body size (2 MiB) - protects against DoS via large payloads
pub const MAX_REQUEST_BODY_SIZE: usize = 2 * 1024 * 1024;

/// Maximum number of items in a cart
pub const MAX_CART_ITEMS: usize = 100;

/// Maximum cart item quantity
pub const MAX_ITEM_QUANTITY: i32 = 10_000;

/// Maximum metadata JSON size (10 KiB)
pub const MAX_METADATA_SIZE: usize = 10 * 1024;

// ============================================================================
// HTTP Cache Settings
// ============================================================================

/// Product list cache duration (seconds)
pub const PRODUCTS_CACHE_MAX_AGE: u32 = 60;

// ============================================================================
// Token Account Creation
// ============================================================================

/// Maximum attempts for waiting for token account propagation
pub const MAX_ATA_PROPAGATION_ATTEMPTS: u32 = 30;

/// Initial backoff for ATA propagation wait
pub const ATA_PROPAGATION_INITIAL_BACKOFF: Duration = Duration::from_millis(500);

/// Maximum backoff for ATA propagation wait
pub const ATA_PROPAGATION_MAX_BACKOFF: Duration = Duration::from_secs(2);

// ============================================================================
// Webhook System
// ============================================================================

/// Default webhook retry max attempts
pub const WEBHOOK_MAX_ATTEMPTS: u32 = 5;

/// Default webhook initial retry interval
pub const WEBHOOK_INITIAL_INTERVAL: Duration = Duration::from_secs(1);

/// Default webhook max retry interval
pub const WEBHOOK_MAX_INTERVAL: Duration = Duration::from_secs(5 * 60);

/// Default webhook timeout (Duration)
pub const WEBHOOK_TIMEOUT_DURATION: Duration = Duration::from_secs(10);

/// Webhook queue poll interval
pub const WEBHOOK_POLL_INTERVAL: Duration = Duration::from_secs(5);

/// Webhooks processed per cycle
pub const WEBHOOKS_PER_CYCLE: i32 = 10;

/// Webhook signature timestamp tolerance
pub const WEBHOOK_TIMESTAMP_TOLERANCE: Duration = Duration::from_secs(5 * 60);

// ============================================================================
// Stripe API
// ============================================================================

/// Stripe API request timeout
pub const STRIPE_API_TIMEOUT: Duration = Duration::from_secs(30);

// ============================================================================
// Token Mints (Mainnet)
// ============================================================================

/// USDC token mint address on mainnet
pub const USDC_MINT: &str = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

/// USDT token mint address on mainnet
pub const USDT_MINT: &str = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";

/// PYUSD token mint address on mainnet
pub const PYUSD_MINT: &str = "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo";

/// Native SOL wrapped token address
pub const WSOL_MINT: &str = "So11111111111111111111111111111111111111112";

// ============================================================================
// Token Decimals
// ============================================================================

/// USDC decimals
pub const USDC_DECIMALS: u8 = 6;

/// USDT decimals
pub const USDT_DECIMALS: u8 = 6;

/// PYUSD decimals
pub const PYUSD_DECIMALS: u8 = 6;

/// SOL decimals
pub const SOL_DECIMALS: u8 = 9;

/// USD (fiat) decimals
pub const USD_DECIMALS: u8 = 2;

// ============================================================================
// Solana Programs
// ============================================================================

/// SPL Token program ID
pub const TOKEN_PROGRAM_ID: &str = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

/// SPL Token 2022 program ID
pub const TOKEN_2022_PROGRAM_ID: &str = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

/// Associated Token Account program ID
pub const ATA_PROGRAM_ID: &str = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";

/// Memo program ID
pub const MEMO_PROGRAM_ID: &str = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";

// ============================================================================
// X402 Protocol
// ============================================================================

/// x402 version
pub const X402_VERSION: i32 = 0;

/// Solana SPL transfer scheme
pub const X402_SCHEME_SPL: &str = "solana-spl-transfer";

/// Solana native scheme
pub const X402_SCHEME_NATIVE: &str = "solana";

/// Mainnet network identifier
pub const NETWORK_MAINNET: &str = "mainnet-beta";

/// Devnet network identifier
pub const NETWORK_DEVNET: &str = "devnet";

/// Testnet network identifier
pub const NETWORK_TESTNET: &str = "testnet";

// ============================================================================
// ID Prefixes
// ============================================================================

/// Cart ID prefix
pub const CART_ID_PREFIX: &str = "cart_";

/// Refund ID prefix
pub const REFUND_ID_PREFIX: &str = "refund_";

/// Event ID prefix
pub const EVENT_ID_PREFIX: &str = "evt_";

/// Request ID prefix
pub const REQUEST_ID_PREFIX: &str = "req_";

/// Webhook ID prefix
pub const WEBHOOK_ID_PREFIX: &str = "webhook_";

/// Stripe payment signature prefix
pub const STRIPE_SIGNATURE_PREFIX: &str = "stripe:";

// ============================================================================
// HTTP Headers
// ============================================================================

/// X-PAYMENT header for x402 proof
pub const HEADER_X_PAYMENT: &str = "X-PAYMENT";

/// X-PAYMENT-RESPONSE header for settlement response
pub const HEADER_X_PAYMENT_RESPONSE: &str = "X-PAYMENT-RESPONSE";

/// X-Stripe-Session header
pub const HEADER_X_STRIPE_SESSION: &str = "X-Stripe-Session";

/// X-Wallet header for wallet address
pub const HEADER_X_WALLET: &str = "X-Wallet";

/// X-Signature header for admin auth
pub const HEADER_X_SIGNATURE: &str = "X-Signature";

/// X-Message header for admin auth
pub const HEADER_X_MESSAGE: &str = "X-Message";

/// X-Signer header for admin auth
pub const HEADER_X_SIGNER: &str = "X-Signer";

/// Idempotency key header
pub const HEADER_IDEMPOTENCY_KEY: &str = "Idempotency-Key";

/// API key header
pub const HEADER_X_API_KEY: &str = "X-API-Key";

/// Cedros event type header (webhooks)
pub const HEADER_CEDROS_EVENT_TYPE: &str = "X-Cedros-Event-Type";

/// Cedros delivery ID header (webhooks)
pub const HEADER_CEDROS_DELIVERY_ID: &str = "X-Cedros-Delivery-ID";

/// Cedros signature header (webhooks)
pub const HEADER_CEDROS_SIGNATURE: &str = "X-Cedros-Signature";

/// Cedros timestamp header (webhooks)
pub const HEADER_CEDROS_TIMESTAMP: &str = "X-Cedros-Timestamp";

/// X-Request-ID header
pub const HEADER_X_REQUEST_ID: &str = "X-Request-ID";

// ============================================================================
// Constant Aliases for Compatibility
// ============================================================================

/// Alias for HEADER_X_API_KEY (used in middleware/auth.rs)
pub const HEADER_API_KEY: &str = HEADER_X_API_KEY;

/// Alias for HEADER_X_WALLET (used in middleware/auth.rs)
pub const HEADER_WALLET: &str = HEADER_X_WALLET;

/// Idempotency key TTL (same as IDEMPOTENCY_WINDOW)
pub const IDEMPOTENCY_KEY_TTL: Duration = IDEMPOTENCY_WINDOW;

/// Webhook backoff base (in seconds)
pub const WEBHOOK_BACKOFF_BASE: u64 = 1;

/// Webhook backoff max (in seconds)
pub const WEBHOOK_BACKOFF_MAX: u64 = 300;

/// Webhook timeout in seconds
pub const WEBHOOK_TIMEOUT: u64 = 10;

// ============================================================================
// Event Types
// ============================================================================

/// Payment succeeded event type
pub const EVENT_PAYMENT_SUCCEEDED: &str = "payment.succeeded";

/// Refund succeeded event type
pub const EVENT_REFUND_SUCCEEDED: &str = "refund.succeeded";

// ============================================================================
// Resource Types
// ============================================================================

/// Regular resource type
pub const RESOURCE_TYPE_REGULAR: &str = "regular";

/// Cart resource type
pub const RESOURCE_TYPE_CART: &str = "cart";

/// Refund resource type
pub const RESOURCE_TYPE_REFUND: &str = "refund";

// ============================================================================
// Compute Units (Solana)
// ============================================================================

/// Default compute unit limit
pub const DEFAULT_COMPUTE_UNIT_LIMIT: u32 = 200_000;

/// Default compute unit price (microlamports)
pub const DEFAULT_COMPUTE_UNIT_PRICE: u64 = 1;

// ============================================================================
// Memo
// ============================================================================

/// Maximum memo length (Solana limit)
pub const MAX_MEMO_LENGTH: usize = 566;

/// Default memo template
pub const DEFAULT_MEMO_TEMPLATE: &str = "Payment for {resource}";

// ============================================================================
// Stripe
// ============================================================================

/// Stripe checkout session mode for payments
pub const STRIPE_MODE_PAYMENT: &str = "payment";

/// Stripe checkout session mode for subscriptions
pub const STRIPE_MODE_SUBSCRIPTION: &str = "subscription";

// ============================================================================
// Limits
// ============================================================================

/// Maximum product ID length
pub const MAX_PRODUCT_ID_LENGTH: usize = 255;

/// Minimum product ID length
pub const MIN_PRODUCT_ID_LENGTH: usize = 1;

/// Maximum Stripe amount in cents ($999,999.99)
pub const MAX_STRIPE_AMOUNT_CENTS: i64 = 99_999_999;

/// Minimum Stripe amount in cents ($0.50 for USD, varies by currency)
pub const MIN_STRIPE_AMOUNT_CENTS: i64 = 50;

/// Maximum quantity per line item in Stripe checkout
pub const MAX_STRIPE_LINE_ITEM_QUANTITY: i32 = 999_999;

// ============================================================================
// Cache TTLs
// ============================================================================

/// Default product cache TTL
pub const DEFAULT_PRODUCT_CACHE_TTL: Duration = Duration::from_secs(5 * 60);

/// Default coupon cache TTL
pub const DEFAULT_COUPON_CACHE_TTL: Duration = Duration::from_secs(60);
