use super::record::OperationRecord;
use super::{CanonicalOperationContext, DurableOutcome, OperationKind, PaymentMethod};

pub(super) fn base(record: &OperationRecord) -> bool {
    super::api_validation::operation_id(&record.operation_id).is_ok()
        && super::ProviderScope::from_host(&record.provider_scope).is_ok()
        && !matches!(
            &record.canonical_context,
            CanonicalOperationContext::Checkout { quote_scope, .. }
                if super::ProviderScope::from_host(quote_scope).is_err()
        )
        && provider_request_valid(record)
        && !matches!(
            &record.canonical_context,
            CanonicalOperationContext::Checkout { subject_ref: Some(subject), .. }
                if !valid_subject_ref(subject)
        )
        && matches!(
            (record.operation, &record.canonical_context),
            (
                OperationKind::Quote,
                CanonicalOperationContext::Quote { .. }
            ) | (
                OperationKind::Checkout,
                CanonicalOperationContext::Checkout { .. }
            )
        )
}

fn provider_request_valid(record: &OperationRecord) -> bool {
    match &record.canonical_context {
        CanonicalOperationContext::Checkout {
            payment_method: PaymentMethod::Stripe,
            stripe_request: Some(request),
            ..
        } => request.valid_for_created_at(record.created_at),
        CanonicalOperationContext::Checkout {
            payment_method: PaymentMethod::Credits | PaymentMethod::X402,
            stripe_request: None,
            ..
        }
        | CanonicalOperationContext::Quote { .. } => true,
        CanonicalOperationContext::Checkout { .. } => false,
    }
}

pub(super) fn outcome(record: &OperationRecord) -> bool {
    record.outcome.as_ref().is_none_or(|outcome| match outcome {
        DurableOutcome::Resolved {
            operation_id,
            checkout_attempt_id,
            provider_artifacts,
            durable,
            ..
        } => {
            operation_id == &record.operation_id
                && checkout_attempt_id == &record.checkout_attempt_id
                && *durable
                && resolved_artifacts(record, provider_artifacts)
                && provider_artifacts.validate().is_ok()
        }
        DurableOutcome::Terminal {
            code,
            durable,
            outcome_proof,
            ..
        } => {
            *durable
                && super::ledger_outcome::validate_code(code).is_ok()
                && outcome_proof
                    .as_deref()
                    .is_none_or(super::artifacts::safe_proof)
        }
        DurableOutcome::Indeterminate {
            code,
            operation_id,
            checkout_attempt_id,
            provider_artifacts,
            ..
        } => {
            operation_id == &record.operation_id
                && checkout_attempt_id == &record.checkout_attempt_id
                && super::ledger_outcome::validate_code(code).is_ok()
                && provider_artifacts.validate().is_ok()
        }
    })
}

fn valid_subject_ref(value: &str) -> bool {
    !value.is_empty()
        && value.trim() == value
        && value.len() <= 512
        && !value.chars().any(char::is_control)
}

fn resolved_artifacts(record: &OperationRecord, artifacts: &super::ProviderArtifacts) -> bool {
    if record.operation != OperationKind::Checkout {
        return true;
    }
    match super::record_validation::checkout_method(record) {
        Some(PaymentMethod::Stripe) => {
            artifacts.provider_checkout_id.is_some()
                && artifacts.provider_checkout_id == artifacts.return_artifact_id
        }
        Some(PaymentMethod::Credits | PaymentMethod::X402) => {
            artifacts.provider_operation_id.is_some() && artifacts.return_artifact_id.is_none()
        }
        None => false,
    }
}
