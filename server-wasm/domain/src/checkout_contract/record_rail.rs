use super::record::{
    OperationRecord, ProviderCreateState, SettlementState, X402Settlement, RECORD_SCHEMA_VERSION,
};
use super::{
    CanonicalOperationContext, CheckoutAttemptId, DurableOutcome, OperationIdentity, OperationKind,
    PaymentMethod, ProviderArtifacts,
};

impl OperationRecord {
    pub(super) fn settled_rail(
        identity: &OperationIdentity,
        attempt: &CheckoutAttemptId,
        context: CanonicalOperationContext,
        method: PaymentMethod,
        reference: &str,
        now: i64,
    ) -> Self {
        let operation_id = identity.public_operation_id();
        Self {
            schema_version: RECORD_SCHEMA_VERSION,
            provider_scope: identity.provider_scope().into(),
            operation: OperationKind::Checkout,
            operation_scope: OperationKind::Checkout.scope().into(),
            material_fingerprint: identity.fingerprint().into(),
            checkout_attempt_id: attempt.as_str().into(),
            operation_id: operation_id.clone(),
            canonical_context: context,
            provider_create: ProviderCreateState::NotStarted,
            settlement_state: SettlementState::Paid,
            settlement_effect: None,
            settlement_claim: None,
            x402_settlement: None,
            lease_owner: String::new(),
            lease_expires_at: 0,
            outcome: Some(DurableOutcome::Resolved {
                operation_id,
                checkout_attempt_id: attempt.as_str().into(),
                provider_artifacts: ProviderArtifacts {
                    provider_operation_id: Some(reference.into()),
                    outcome_proof: Some(format!("{}-settled", rail(method))),
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

    pub(super) fn prepared_x402(
        identity: &OperationIdentity,
        attempt: &CheckoutAttemptId,
        context: CanonicalOperationContext,
        settlement: X402Settlement,
        now: i64,
    ) -> Self {
        Self {
            schema_version: RECORD_SCHEMA_VERSION,
            provider_scope: identity.provider_scope().into(),
            operation: OperationKind::Checkout,
            operation_scope: OperationKind::Checkout.scope().into(),
            material_fingerprint: identity.fingerprint().into(),
            checkout_attempt_id: attempt.as_str().into(),
            operation_id: identity.public_operation_id(),
            canonical_context: context,
            provider_create: ProviderCreateState::NotStarted,
            settlement_state: SettlementState::Pending,
            settlement_effect: None,
            settlement_claim: None,
            x402_settlement: Some(settlement),
            lease_owner: String::new(),
            lease_expires_at: 0,
            outcome: None,
            created_at: now,
            updated_at: now,
            replay_until: Some(now.saturating_add(super::REPLAY_SECONDS)),
        }
    }

    pub(super) fn terminal_rail(
        identity: &OperationIdentity,
        attempt: &CheckoutAttemptId,
        context: CanonicalOperationContext,
        code: &str,
        now: i64,
    ) -> Self {
        let mut record = Self::settled_rail(
            identity,
            attempt,
            context,
            PaymentMethod::Credits,
            "credits-terminal",
            now,
        );
        record.settlement_state = SettlementState::Terminal;
        record.settlement_effect = Some(super::settlement_effect_store::terminal_intent(now));
        record.outcome = Some(DurableOutcome::Terminal {
            code: code.into(),
            durable: true,
            replayed: false,
            outcome_proof: Some("credits-balance-proof".into()),
        });
        record
    }
}

fn rail(method: PaymentMethod) -> &'static str {
    match method {
        PaymentMethod::Stripe => "stripe",
        PaymentMethod::X402 => "x402",
        PaymentMethod::Credits => "credits",
    }
}

pub(super) fn quote_id(record: &OperationRecord) -> crate::error::AppResult<&str> {
    match &record.canonical_context {
        CanonicalOperationContext::Checkout {
            quote_operation_id, ..
        } => Ok(quote_operation_id),
        _ => Err(crate::error::AppError::internal(
            "checkout context is invalid",
        )),
    }
}

/// Trusted subject persisted for restart-safe post-settlement effects.
pub(super) fn subject_ref(record: &OperationRecord) -> crate::error::AppResult<Option<&str>> {
    subject_ref_from_context(&record.canonical_context)
}

pub(super) fn subject_ref_from_context(
    context: &CanonicalOperationContext,
) -> crate::error::AppResult<Option<&str>> {
    match context {
        CanonicalOperationContext::Checkout { subject_ref, .. } => Ok(subject_ref.as_deref()),
        _ => Err(crate::error::AppError::internal(
            "checkout context is invalid",
        )),
    }
}
