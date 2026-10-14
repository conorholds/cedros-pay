use serde::{Deserialize, Serialize};

use super::{
    CanonicalOperationContext, CheckoutAttemptId, DurableOutcome, OperationIdentity, OperationKind,
    OperationLease, OperationOwner, LEASE_SECONDS,
};

pub(super) const RECORD_SCHEMA_VERSION: u8 = 1;
pub(super) use super::record_state::{
    ProviderCreateState, SettlementClaim, SettlementClaimState, SettlementEffectIntent,
    SettlementState, X402Settlement,
};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct OperationRecord {
    pub(super) schema_version: u8,
    pub(super) provider_scope: String,
    pub(super) operation: OperationKind,
    pub(super) operation_scope: String,
    pub(super) material_fingerprint: String,
    pub(super) checkout_attempt_id: String,
    pub(super) operation_id: String,
    pub(super) canonical_context: CanonicalOperationContext,
    #[serde(default)]
    pub(super) provider_create: ProviderCreateState,
    #[serde(default)]
    pub(super) settlement_state: SettlementState,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(super) settlement_effect: Option<SettlementEffectIntent>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(super) settlement_claim: Option<SettlementClaim>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(super) x402_settlement: Option<X402Settlement>,
    pub(super) lease_owner: String,
    pub(super) lease_expires_at: i64,
    pub(super) outcome: Option<DurableOutcome>,
    pub(super) created_at: i64,
    pub(super) updated_at: i64,
    pub(super) replay_until: Option<i64>,
}

impl OperationRecord {
    pub(super) fn initial(
        identity: &OperationIdentity,
        attempt_id: &CheckoutAttemptId,
        owner: &OperationOwner,
        canonical_context: CanonicalOperationContext,
        now: i64,
    ) -> Self {
        Self {
            schema_version: RECORD_SCHEMA_VERSION,
            provider_scope: identity.provider_scope().into(),
            operation: identity.operation(),
            operation_scope: identity.operation().scope().into(),
            material_fingerprint: identity.fingerprint().into(),
            checkout_attempt_id: attempt_id.as_str().into(),
            operation_id: operation_id(identity),
            canonical_context,
            provider_create: ProviderCreateState::NotStarted,
            settlement_state: SettlementState::Pending,
            settlement_effect: None,
            settlement_claim: None,
            x402_settlement: None,
            lease_owner: owner.as_str().into(),
            lease_expires_at: now.saturating_add(LEASE_SECONDS),
            outcome: None,
            created_at: now,
            updated_at: now,
            replay_until: None,
        }
    }

    pub(super) fn lease(&self, entry_key: &str, version: String) -> OperationLease {
        let stripe_request = match &self.canonical_context {
            CanonicalOperationContext::Checkout { stripe_request, .. } => stripe_request.clone(),
            CanonicalOperationContext::Quote { .. } => None,
        };
        OperationLease {
            entry_key: entry_key.into(),
            version,
            owner: self.lease_owner.clone(),
            operation_id: self.operation_id.clone(),
            checkout_attempt_id: self.checkout_attempt_id.clone(),
            stripe_request,
        }
    }
}

pub(super) use super::record_validation::{validate_match, validate_stored_outcome};

pub(super) fn operation_id(identity: &OperationIdentity) -> String {
    let digest = identity
        .entry_key()
        .strip_prefix("checkout-operation:")
        .expect("operation identity key prefix");
    format!("payop_{digest}")
}
