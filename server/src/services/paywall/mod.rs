//! Paywall service module
//!
//! This module handles payment processing, authorization, and verification
//! for the Cedros Pay system. It supports both Stripe and x402 (Solana SPL token)
//! payment methods.
//!
//! ## Module Structure
//!
//! - `types`: Shared types (CouponScope, GaslessTransactionData, etc.)
//! - `amounts`: Amount comparison utilities
//! - `coupons`: Coupon selection and stacking logic
//! - `service`: Main PaywallService implementation

pub mod amounts;
pub mod coupons;
pub mod service;
pub mod types;

// Re-export main types for convenience
pub use amounts::{amount_exact, amount_sufficient};
pub use coupons::{interpolate_memo, select_coupons_for_payment, stack_coupons_on_money};
pub use service::PaywallService;
pub use types::{
    CouponScope, GaslessTransactionData, PaymentVerificationResult, RefundQuoteResponse,
};
