//! Content-model entry shapes (JSONB document model — no joins). Each maps to a
//! declared content model; see `ids` for the model ids and the realignment
//! audit §5/§6 for the data-layer mapping.

use serde::{Deserialize, Serialize};
use serde_json::Value;

// ── access-passes ───────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AccessPassOffer {
    pub schema_version: u8,
    pub offer_ref: String,
    pub product_type: String,
    pub source_id: String,
    pub duration_seconds: u32,
    pub price_amount_cents: u64,
    pub currency: String,
    pub rail: String,
    pub network: String,
    pub active: bool,
    pub effective_at_ms: i64,
    pub retirement_at_ms: Option<i64>,
    pub maximum_total_requests: Option<u32>,
    pub terms_version: u32,
    pub terms_hash: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AccessPassChallenge {
    pub schema_version: u8,
    pub kind: String,
    pub challenge_id: String,
    pub offer: AccessPassOffer,
    pub delegated_public_key: String,
    pub amount_atomic: u64,
    pub token_mint: String,
    pub token_decimals: u8,
    pub recipient_token_account: String,
    pub pay_to: String,
    pub memo: String,
    pub created_at_ms: i64,
    pub expires_at_ms: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AccessPassRecord {
    pub schema_version: u8,
    pub pass_id: String,
    pub subject_ref: String,
    pub status: String,
    pub offer: AccessPassOffer,
    pub delegated_public_key: String,
    pub payment_reference: String,
    pub payer_wallet: String,
    pub starts_at_ms: Option<i64>,
    pub expires_at_ms: Option<i64>,
    pub created_at: String,
    pub updated_at: String,
}

// ── commerce-ledger ───────────────────────────────────────────────────────────

/// One payment/refund row (model `cedros-pay:commerce-ledger`, key = reference).
/// Timestamps are ISO-8601 UTC so range filters compare chronologically.
/// The on-chain ground truth of an x402 settlement: the exact atomic amount and mint
/// the buyer paid, snapshotted on the payment row at `/verify`. A refund pays back
/// *this* exact amount of *this* exact mint, so it stays correct even if the operator
/// later re-configures `token_mint` / `token_decimals` (which would otherwise make a
/// fiat-cents recompute pay the wrong magnitude or token).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct TokenSettlement {
    /// Actual atomic amount transferred on-chain.
    pub amount_atomic: u64,
    /// The SPL mint that was paid (base58).
    pub mint: String,
    /// The mint's decimals at settlement time.
    pub decimals: u8,
    /// Exact signed transaction submitted for this payment. Pending x402 rows
    /// need this evidence after a restart to verify finalized chain effects.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub transaction_base64: Option<String>,
    /// Blockhash embedded in `transaction_base64`, used to prove expiry.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub recent_blockhash: Option<String>,
    /// Cluster label whose genesis hash must match the configured RPC.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub network: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LedgerEntry {
    pub reference: String,
    /// `payment` | `refund`.
    pub kind: String,
    /// `succeeded` | `failed` | `pending` | `refunded`.
    pub status: String,
    pub gross_cents: i64,
    #[serde(default)]
    pub refund_cents: i64,
    pub currency: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub customer_profile_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub route_path: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub product_id: Option<String>,
    /// Every product granted by a canonical multi-line checkout. `product_id`
    /// remains the primary/legacy projection for single-product consumers.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub product_ids: Vec<String>,
    pub provider: String,
    /// Provider-side id (e.g. Stripe PaymentIntent id).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub provider_ref: Option<String>,
    /// Authoritative wallet that signed the x402 token transfer. Refunds may
    /// only return funds to this wallet; legacy rows without it fail closed.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub payer_wallet: Option<String>,
    pub created_at: String,
    /// Cashflow time for this row. Refunding a payment preserves its original
    /// settlement time; the separate refund row carries the refund cashflow time.
    pub processed_at: String,
    /// On-chain settlement snapshot (x402 payments only; the refund payout source).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub token_settlement: Option<TokenSettlement>,
}

impl LedgerEntry {
    pub fn net_cents(&self) -> i64 {
        crate::money::sub(self.gross_cents, self.refund_cents)
    }
}

// ── cart ─────────────────────────────────────────────────────────────────────

/// A stored multi-item cart quote (model `cedros-pay:cart`, key = `cart_<32 hex>`).
///
/// `/cart/quote` resolves and prices the items once, then stores this snapshot;
/// `/verify` settles against `total_atomic`/`token_mint`/`recipient_token_account`
/// from here (the client never re-sends items), so the two agree by construction
/// even if a catalog price changes between quote and payment. Timestamps are
/// ISO-8601 UTC so the `expires_at` range filter compares chronologically.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppliedCoupon {
    pub code: String,
    pub discount_type: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub discount_bps: Option<u32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub discount_cents: Option<i64>,
    pub original_total_cents: i64,
    pub discounted_total_cents: i64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub original_total_atomic: Option<u64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub discounted_total_atomic: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CartRow {
    pub cart_id: String,
    pub items: Vec<CartLine>,
    /// Summed line atomic units = the verify requirement amount (exact).
    pub total_atomic: u64,
    /// Ledger `gross_cents` for the settled cart.
    pub total_cents: i64,
    /// Undiscounted cart total at quote time, when a coupon was applied.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub original_total_atomic: Option<u64>,
    /// Undiscounted fiat total at quote time, when a coupon was applied.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub original_total_cents: Option<i64>,
    /// Applied coupon audit snapshot, when the quote included a coupon.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub applied_coupon: Option<AppliedCoupon>,
    pub currency: String,
    /// Mint snapshot at quote time (the accepted SPL token).
    pub token_mint: String,
    /// Mint precision frozen with the quote.
    #[serde(default)]
    pub token_decimals: u8,
    /// Recipient ATA snapshot (the SPL transfer destination `/verify` checks).
    pub recipient_token_account: String,
    /// `None` while pending; the settling signature once paid (replay-safe).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub paid_signature: Option<String>,
    /// Durable ownership of the cart settlement while a provider call or chain
    /// confirmation is in flight. Only the owning rail/fingerprint may resume it.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub settlement_claim: Option<CartSettlementClaim>,
    pub created_at: String,
    pub expires_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CartSettlementClaim {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub started_at: Option<String>,
    pub schema_version: u8,
    pub rail: String,
    pub fingerprint: String,
    pub reference: String,
    pub status: String,
}

/// One resolved, priced cart line (a snapshot, not a live catalog reference).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CartLine {
    pub resource: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub variant_id: Option<String>,
    pub quantity: u32,
    /// `unit_atomic * quantity` (exact integer atomic units).
    pub line_atomic: u64,
    /// `unit_cents * quantity` (fiat minor units).
    pub line_cents: i64,
}

// ── credits ────────────────────────────────────────────────────────────────────

/// A subject's credit balance (model `cedros-pay:credits`, key = `acct:{id}`).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreditAccount {
    pub subject_id: String,
    pub balance_cents: i64,
    /// Credits currently held (authorized, not captured).
    #[serde(default)]
    pub held_cents: i64,
    pub currency: String,
    pub updated_at: String,
}

impl CreditAccount {
    pub fn available_cents(&self) -> i64 {
        crate::money::sub(self.balance_cents, self.held_cents)
    }

    pub fn valid_for(&self, subject_id: &str) -> bool {
        self.subject_id == subject_id
            && self.balance_cents >= 0
            && self.held_cents >= 0
            && self.held_cents <= self.balance_cents
            && crate::money::normalize_currency(&self.currency) == self.currency
    }
}

/// An idempotency/audit record for a credit mutation (key = `txn:{sourceRef}`).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreditTxn {
    pub source_ref: String,
    pub subject_id: String,
    /// `grant` | `authorize`.
    pub kind: String,
    pub amount_cents: i64,
    pub currency: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
    /// Balance after applying this txn (returned on idempotent replay).
    pub balance_after_cents: i64,
    pub created_at: String,
}

/// A credit hold (key = `hold:{holdId}`). Releasing/capturing is idempotent on
/// `status`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreditHold {
    pub hold_id: String,
    pub subject_id: String,
    pub amount_cents: i64,
    pub currency: String,
    /// `held` | `released` | `captured`.
    pub status: String,
    pub created_at: String,
}

// ── stats-rollup ────────────────────────────────────────────────────────────────

/// A pre-aggregated daily summary (model `cedros-pay:stats-rollup`, key = day
/// `YYYY-MM-DD`). The rollup job maintains these; the stats route reads them.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DailySummary {
    pub day: String,
    pub bucket_start: String,
    pub currency: String,
    pub gross_cents: i64,
    pub refund_cents: i64,
    pub txn_count: i64,
    #[serde(default)]
    pub routes: Vec<Attribution>,
    #[serde(default)]
    pub products: Vec<Attribution>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub subscriptions: Option<SubscriptionSnapshot>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Attribution {
    pub key: String,
    pub gross_cents: i64,
    pub txn_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubscriptionSnapshot {
    pub mrr_cents: i64,
    pub arr_cents: i64,
    pub active_count: i64,
    pub churn30d: f64,
}

// ── webhook-outbox ──────────────────────────────────────────────────────────────

/// Idempotency marker for a processed inbound event (key = `evt:{eventId}`).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessedEvent {
    pub event_id: String,
    pub processed_at: String,
    /// SHA-256 of canonical provider JSON. Legacy rows omit this and therefore
    /// fail closed on replay because an exact duplicate cannot be proven.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub fingerprint: Option<String>,
    /// Deterministic domain-effect record committed with this marker, when the
    /// event produced external effects.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub effect_id: Option<String>,
    /// Immutable initial effect record used to restore a missing outbox row
    /// without recomputing targets from newer local state.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub effect_record: Option<Value>,
    /// Distinguishes a current marker with no effects from a legacy marker that
    /// cannot safely infer whether transient effects were already delivered.
    #[serde(default)]
    pub effects_complete: bool,
}

/// An outbound delivery queued for the webhook-delivery job (key = `out:{id}`).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OutboxItem {
    pub id: String,
    pub url: String,
    pub payload: Value,
    /// `pending` | `delivered` | `failed`.
    pub status: String,
    #[serde(default)]
    pub attempts: i64,
    pub created_at: String,
    /// Earliest next attempt (ISO-8601); the delivery job filters on this.
    pub next_attempt_at: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_error: Option<String>,
    /// Current delivery owner. Missing on legacy rows and cleared when terminal.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub lease_owner: Option<String>,
    /// Lease deadline. Missing legacy values are treated as unclaimed.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub lease_expires_at: Option<String>,
}

// ── subscriptions ───────────────────────────────────────────────────────────────

/// A subscription record (model `cedros-pay:subscriptions`, key = subscription
/// id). Mirrors the provider's lifecycle; the webhook path keeps `status` and
/// `current_period_end` in sync.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubscriptionRecord {
    pub subscription_id: String,
    pub customer_ref: String,
    /// Stripe billing identity is separate from the Cedros entitlement subject.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub stripe_customer_id: Option<String>,
    pub price_id: String,
    /// `active` | `incomplete` | `past_due` | `canceled` | `trialing` | …
    pub status: String,
    pub provider: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub provider_ref: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub current_period_end: Option<String>,
    #[serde(default)]
    pub cancel_at_period_end: bool,
    /// Stripe's root event creation time for the latest applied lifecycle event.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_provider_event_at: Option<i64>,
    pub created_at: String,
    pub updated_at: String,
}

impl SubscriptionRecord {
    pub(crate) fn stripe_customer(&self) -> &str {
        self.stripe_customer_id
            .as_deref()
            .unwrap_or(&self.customer_ref)
    }
}
