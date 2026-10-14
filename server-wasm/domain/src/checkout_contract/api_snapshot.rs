use serde::{Deserialize, Serialize};

use super::inventory_types::{InventoryHoldSnapshot, InventoryReservationContext};
use super::{PaymentMethod, QuoteSource};

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
/// Safe durable quote facts computed exclusively from server authorities.
pub struct AuthoritativeQuoteSnapshot {
    pub schema_version: u8,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub order_context: Option<crate::commerce_orders::OrderContext>,
    pub source: SafeSourceBinding,
    pub lines: Vec<AuthoritativeQuoteLine>,
    pub currency: String,
    pub subtotal_cents: u64,
    pub discount_cents: u64,
    pub shipping_cents: u64,
    pub tax_cents: u64,
    pub tip_cents: u64,
    pub total_cents: u64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub shipping_rate_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tax_rate_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub applied_tip: Option<AppliedTip>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub inventory_hold: Option<InventoryHoldSnapshot>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub promotion_code: Option<String>,
    pub requested_payment_methods: Vec<PaymentMethod>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub x402: Option<X402QuoteBinding>,
    pub expires_at: String,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
/// Exact public Solana challenge pinned to this authoritative quote.
pub struct X402QuoteBinding {
    pub network: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub token_symbol: Option<String>,
    pub pay_to: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub fee_payer: Option<String>,
    pub recipient_token_account: String,
    pub token_mint: String,
    pub amount_atomic: u64,
    pub decimals: u8,
    pub memo: String,
    pub config_fingerprint: String,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(tag = "kind", rename_all = "snake_case", deny_unknown_fields)]
/// Durable source binding without raw cart contents or buyer context.
pub enum SafeSourceBinding {
    VersionedCart {
        lane: String,
        generation: String,
        version: u64,
    },
    Items {
        intent_sha256: String,
    },
}

impl SafeSourceBinding {
    pub(super) fn from_request(source: &QuoteSource, intent_sha256: String) -> Self {
        match source {
            QuoteSource::VersionedCart {
                lane,
                generation,
                version,
            } => Self::VersionedCart {
                lane: lane.clone(),
                generation: generation.clone(),
                version: *version,
            },
            QuoteSource::Items { .. } => Self::Items { intent_sha256 },
        }
    }
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
/// One server-resolved public catalog line and its checked integer total.
pub struct AuthoritativeQuoteLine {
    pub resource: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub variant_id: Option<String>,
    pub qty: u64,
    pub unit_amount_cents: u64,
    pub line_total_cents: u64,
    pub currency: String,
    pub title: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub image: Option<String>,
    pub payment_resource: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub shipping_profile_id: Option<String>,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(
    tag = "kind",
    rename_all = "snake_case",
    rename_all_fields = "camelCase",
    deny_unknown_fields
)]
pub enum AppliedTip {
    Fixed {
        amount_cents: u64,
    },
    Percentage {
        basis_points: u32,
        amount_cents: u64,
    },
}

#[derive(Clone, Debug, Default, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CustomerContextHashes {
    pub fulfillment_sha256: String,
    pub contact_sha256: String,
    pub return_urls_sha256: String,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(tag = "kind", rename_all = "snake_case", deny_unknown_fields)]
pub enum CanonicalOperationContext {
    Quote {
        snapshot: Box<AuthoritativeQuoteSnapshot>,
        customer_context_hashes: CustomerContextHashes,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        inventory_reservation: Option<InventoryReservationContext>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        regional_policy: Option<crate::regional_payment_policy::RegionalPolicyBinding>,
    },
    Checkout {
        quote_operation_id: String,
        /// Rail-neutral host-derived merchant/actor scope owning the quote.
        quote_scope: String,
        /// Trusted buyer subject for restart-safe settlement effects. This is
        /// never accepted from request material or returned publicly.
        #[serde(default, skip_serializing_if = "Option::is_none")]
        subject_ref: Option<String>,
        payment_method: PaymentMethod,
        /// Durable provider request identity and expiry. Present only for
        /// Stripe so crash retries reuse byte-identical provider material.
        #[serde(default, skip_serializing_if = "Option::is_none")]
        stripe_request: Option<super::StripeRequestBinding>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        inventory_reservation: Option<InventoryReservationContext>,
    },
}
