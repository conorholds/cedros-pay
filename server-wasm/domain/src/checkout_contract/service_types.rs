use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};

use crate::error::{AppError, AppResult};

#[derive(Debug, Clone)]
pub struct CheckoutCommand {
    pub idempotency_key: String,
    pub checkout_attempt_id: String,
    pub material: CheckoutMaterial,
    pub canonical_context: super::CanonicalOperationContext,
    /// Canonical API checkouts claim the authoritative quote and inventory in
    /// the same guarded write. Low-level ledger conformance tests opt out.
    pub guarded_settlement: bool,
    /// Server-captured catalog/profile revisions. Never accepted from clients;
    /// fence both initial claim and every transition licensing provider egress.
    pub authority_guards: Vec<crate::guarded_batch::GuardedCondition>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CheckoutMaterial {
    pub client_material_sha256: String,
    pub amount_cents: i64,
    pub currency: String,
    pub product_name: String,
    pub success_url: String,
    pub cancel_url: String,
    pub customer_email: Option<String>,
    pub client_reference_id: Option<String>,
    pub metadata: BTreeMap<String, String>,
}

impl CheckoutMaterial {
    pub(crate) fn validate(&self) -> AppResult<()> {
        let metadata_valid = self.metadata.len() <= 50
            && self.metadata.iter().all(|(key, value)| {
                !key.starts_with("cedros_pay_")
                    && !key.is_empty()
                    && key.len() <= 40
                    && key.bytes().all(|byte| byte.is_ascii_graphic())
                    && value.len() <= 500
                    && !value.chars().any(char::is_control)
            });
        if self.amount_cents <= 0
            || self.client_material_sha256.len() != 64
            || !self.client_material_sha256.bytes().all(lower_hex)
            || self.currency.len() != 3
            || !self.currency.bytes().all(|byte| byte.is_ascii_alphabetic())
            || self.product_name.trim().is_empty()
            || self.product_name.len() > 127
            || self.success_url.trim().is_empty()
            || self.success_url.len() > 2_048
            || self.cancel_url.trim().is_empty()
            || self.cancel_url.len() > 2_048
            || self
                .customer_email
                .as_ref()
                .is_some_and(|value| value.len() > 254)
            || self
                .client_reference_id
                .as_ref()
                .is_some_and(|value| value.is_empty() || value.len() > 255)
            || !metadata_valid
        {
            return Err(AppError::unprocessable("checkout material is invalid"));
        }
        Ok(())
    }
}

fn lower_hex(byte: u8) -> bool {
    byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte)
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "status", rename_all = "lowercase")]
pub enum CheckoutOutcome {
    Resolved {
        #[serde(rename = "operationId")]
        operation_id: String,
        #[serde(rename = "attemptId")]
        attempt_id: String,
        #[serde(rename = "returnArtifact", skip_serializing_if = "Option::is_none")]
        return_artifact: Option<String>,
        replayed: bool,
    },
    Terminal {
        durable: bool,
        code: String,
        replayed: bool,
    },
    Indeterminate {
        code: String,
    },
}

#[derive(Debug, Clone)]
pub struct ResolveCheckoutUrlRequest {
    pub expected_operation_id: String,
    pub expected_attempt_id: String,
    pub return_artifact: String,
}

#[derive(Debug, Clone)]
pub struct VerifyReturnRequest {
    pub expected_attempt_id: String,
    pub return_artifact: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "status", rename_all = "lowercase")]
pub enum VerifyReturnOutcome {
    Verified {
        #[serde(rename = "operationId")]
        operation_id: String,
        #[serde(rename = "checkoutAttemptId")]
        checkout_attempt_id: String,
        #[serde(rename = "settlementStatus")]
        settlement_status: super::SettlementStatus,
        #[serde(
            rename = "providerAmountCents",
            skip_serializing_if = "Option::is_none"
        )]
        provider_amount_cents: Option<i64>,
        #[serde(rename = "providerCurrency", skip_serializing_if = "Option::is_none")]
        provider_currency: Option<String>,
        #[serde(
            rename = "providerPaymentIntent",
            skip_serializing_if = "Option::is_none"
        )]
        provider_payment_intent: Option<String>,
    },
    Mismatch,
    Indeterminate,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "status", rename_all = "lowercase")]
pub enum CheckoutUrlOutcome {
    Resolved {
        #[serde(rename = "checkoutUrl")]
        checkout_url: String,
    },
    Mismatch,
    Indeterminate,
}
