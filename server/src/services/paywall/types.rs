//! Shared types and utilities for the paywall service

use chrono::Utc;
use std::time::Duration as StdDuration;
use tracing::warn;

/// Safely convert std Duration to chrono Duration with fallback
pub fn to_chrono_duration(duration: StdDuration) -> chrono::Duration {
    chrono::Duration::from_std(duration).unwrap_or_else(|_| {
        warn!("Duration conversion failed, using 5 minute fallback");
        chrono::Duration::minutes(5)
    })
}

/// Coupon selection scope per spec 19-services-paywall.md
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CouponScope {
    /// All coupons (no AppliesAt filter) - for Stripe payments
    All,
    /// Catalog coupons only (AppliesAt = "catalog")
    Catalog,
    /// Checkout coupons only (AppliesAt = "checkout", Scope = "all")
    Checkout,
}

/// Gasless transaction data
pub struct GaslessTransactionData {
    pub transaction: String,
    pub fee_payer: String,
    pub blockhash: String,
    pub last_valid_block_height: u64,
    pub signers: Vec<String>,
}

/// Refund quote response for the approve endpoint
pub struct RefundQuoteResponse {
    pub refund_id: String,
    pub scheme: String,
    pub network: String,
    pub max_amount_required: String,
    pub resource: String,
    pub description: String,
    pub pay_to: String,
    pub asset: String,
    pub max_timeout_seconds: i64,
    pub recipient_token_account: String,
    pub decimals: u8,
    pub token_symbol: String,
    pub memo: String,
    pub fee_payer: Option<String>,
    pub expires_at: chrono::DateTime<Utc>,
}

/// Verification result for payment
pub struct PaymentVerificationResult {
    pub success: bool,
    pub tx_hash: Option<String>,
    pub payer: Option<String>,
    pub error: Option<String>,
}
