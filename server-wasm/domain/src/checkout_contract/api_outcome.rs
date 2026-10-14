use serde::{Deserialize, Serialize};

use super::{AuthoritativeQuoteSnapshot, PaymentMethod};

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
/// Server-authoritative quote response and durable replay identity.
pub struct CanonicalQuoteResponse {
    pub schema_version: u8,
    pub operation_id: String,
    pub attempt_id: String,
    pub quote: AuthoritativeQuoteSnapshot,
    pub replayed: bool,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(
    tag = "status",
    rename_all = "snake_case",
    rename_all_fields = "camelCase"
)]
/// Finite payment lifecycle result. Every variant carries the operation,
/// attempt, and selected payment method that it describes.
pub enum CanonicalPaymentOutcome {
    ActionRequired {
        operation_id: String,
        attempt_id: String,
        payment_method: PaymentMethod,
        return_artifact: String,
        replayed: bool,
    },
    Processing {
        operation_id: String,
        attempt_id: String,
        payment_method: PaymentMethod,
        replayed: bool,
    },
    Paid {
        operation_id: String,
        attempt_id: String,
        payment_method: PaymentMethod,
        replayed: bool,
    },
    Terminal {
        operation_id: String,
        attempt_id: String,
        payment_method: PaymentMethod,
        code: String,
        replayed: bool,
    },
    Indeterminate {
        operation_id: String,
        attempt_id: String,
        payment_method: PaymentMethod,
        code: String,
        replayed: bool,
    },
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
/// Provider or ledger settlement classification; unknown states stay pending.
pub enum SettlementStatus {
    Paid,
    Unpaid,
    Pending,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(
    tag = "status",
    rename_all = "snake_case",
    rename_all_fields = "camelCase"
)]
/// Redacted return-correlation result exposed by the canonical SDK wire route.
pub enum CanonicalVerifyOutcome {
    Verified { checkout_attempt_id: String },
    Mismatch,
    Indeterminate,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(
    tag = "status",
    rename_all = "snake_case",
    rename_all_fields = "camelCase"
)]
/// Ephemeral checkout-URL resolution result. URLs are never durable fields.
pub enum CanonicalResolveOutcome {
    Resolved {
        operation_id: String,
        attempt_id: String,
        payment_method: PaymentMethod,
        checkout_url: String,
    },
    Mismatch {
        operation_id: String,
        attempt_id: String,
        payment_method: PaymentMethod,
    },
    Indeterminate {
        operation_id: String,
        attempt_id: String,
        payment_method: PaymentMethod,
    },
}
