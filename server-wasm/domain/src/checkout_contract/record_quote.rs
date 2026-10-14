use super::record::{
    operation_id, OperationRecord, ProviderCreateState, SettlementState, RECORD_SCHEMA_VERSION,
};
use super::{
    CanonicalOperationContext, CheckoutAttemptId, DurableOutcome, OperationIdentity, OperationKind,
};

impl OperationRecord {
    pub(super) fn resolved_quote(
        identity: &OperationIdentity,
        attempt_id: &CheckoutAttemptId,
        context: CanonicalOperationContext,
        now: i64,
    ) -> Self {
        let operation_id = operation_id(identity);
        Self {
            schema_version: RECORD_SCHEMA_VERSION,
            provider_scope: identity.provider_scope().into(),
            operation: OperationKind::Quote,
            operation_scope: OperationKind::Quote.scope().into(),
            material_fingerprint: identity.fingerprint().into(),
            checkout_attempt_id: attempt_id.as_str().into(),
            operation_id: operation_id.clone(),
            canonical_context: context,
            provider_create: ProviderCreateState::NotStarted,
            settlement_state: SettlementState::Pending,
            settlement_effect: None,
            settlement_claim: None,
            x402_settlement: None,
            lease_owner: String::new(),
            lease_expires_at: 0,
            outcome: Some(DurableOutcome::Resolved {
                operation_id,
                checkout_attempt_id: attempt_id.as_str().into(),
                provider_artifacts: super::ProviderArtifacts {
                    outcome_proof: Some(format!(
                        "authoritative-quote:{}",
                        identity.material_fingerprint()
                    )),
                    ..Default::default()
                },
                durable: true,
                replayed: false,
            }),
            created_at: now,
            updated_at: now,
            replay_until: Some(now.saturating_add(super::REPLAY_SECONDS)),
        }
    }
}
