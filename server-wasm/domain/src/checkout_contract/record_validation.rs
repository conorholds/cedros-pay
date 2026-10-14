use crate::error::{AppError, AppResult};

use super::record::{OperationRecord, ProviderCreateState, SettlementState, RECORD_SCHEMA_VERSION};
use super::{
    CanonicalOperationContext, CheckoutAttemptId, OperationIdentity, OperationKind, PaymentMethod,
};

pub(super) fn validate_match(
    record: &OperationRecord,
    identity: &OperationIdentity,
    attempt: &CheckoutAttemptId,
) -> AppResult<()> {
    let matches = record.schema_version == RECORD_SCHEMA_VERSION
        && record.provider_scope == identity.provider_scope()
        && record.operation == identity.operation()
        && record.operation_scope == identity.operation().scope()
        && record.material_fingerprint == identity.fingerprint()
        && record.checkout_attempt_id == attempt.as_str()
        && record.operation_id == identity.public_operation_id();
    if matches {
        validate_stored_outcome(record)
    } else {
        Err(AppError::new(
            409,
            "idempotency_mismatch",
            "idempotency key was already used for different checkout material",
        ))
    }
}

pub(super) fn validate_stored_outcome(record: &OperationRecord) -> AppResult<()> {
    if !super::record_validation_stored::base(record) {
        return Err(AppError::internal(
            "stored checkout operation invariant is invalid",
        ));
    }
    if super::record_validation_stored::outcome(record) && state_valid(record) {
        Ok(())
    } else {
        Err(AppError::internal(
            "stored checkout operation outcome violates its invariant",
        ))
    }
}

fn state_valid(record: &OperationRecord) -> bool {
    let provider = match &record.provider_create {
        ProviderCreateState::NotStarted => true,
        ProviderCreateState::AttemptedUnknown { attempted_at } => {
            record.operation == OperationKind::Checkout
                && *attempted_at >= record.created_at
                && *attempted_at <= record.updated_at
        }
        ProviderCreateState::ProviderIdKnown { provider_id } => {
            record.operation == OperationKind::Checkout
                && !provider_id.is_empty()
                && provider_id.len() <= 255
                && provider_id
                    .bytes()
                    .all(|b| b.is_ascii_alphanumeric() || matches!(b, b'_' | b'-' | b':'))
        }
    };
    let settlement = match (record.operation, &record.settlement_state) {
        (OperationKind::Quote, _) => record.settlement_effect.is_none(),
        (OperationKind::Checkout, SettlementState::Pending) => record.settlement_effect.is_none(),
        (OperationKind::Checkout, SettlementState::Paid) => {
            record.settlement_effect.as_ref().is_some_and(|intent| {
                intent.status == SettlementState::Paid
                    && intent.effect_id.as_deref().is_some_and(valid_effect_id)
            })
        }
        (OperationKind::Checkout, SettlementState::Terminal) => {
            record.settlement_effect.as_ref().is_some_and(|intent| {
                intent.status == SettlementState::Terminal
                    && intent.effect_id.is_none()
                    && intent.dispatched
            })
        }
    };
    let x402 = match checkout_method(record) {
        Some(PaymentMethod::X402) => record.x402_settlement.is_some(),
        _ => record.x402_settlement.is_none(),
    };
    let claim = record.settlement_claim.as_ref().is_none_or(|claim| {
        record.operation == OperationKind::Quote
            && !claim.checkout_operation_id.is_empty()
            && !claim.material_fingerprint.is_empty()
    });
    provider && settlement && x402 && claim
}

fn valid_effect_id(value: &str) -> bool {
    value
        .strip_prefix("settlement-effect:")
        .is_some_and(|hash| hash.len() == 64 && hash.bytes().all(lower_hex))
}

fn lower_hex(byte: u8) -> bool {
    byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte)
}

pub(super) fn checkout_method(record: &OperationRecord) -> Option<PaymentMethod> {
    match &record.canonical_context {
        CanonicalOperationContext::Checkout { payment_method, .. } => Some(*payment_method),
        _ => None,
    }
}
