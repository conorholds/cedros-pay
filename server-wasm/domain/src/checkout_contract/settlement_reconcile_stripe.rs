use crate::db::Db;
use crate::error::AppResult;
use crate::seams::HostSeams;
use crate::stripe::checkout_provider::{RetrieveClassification, SessionStatus};

use super::provider::Correlation;
use super::record::{OperationRecord, SettlementState};
use super::settlement_reconcile::PendingResult;

pub(super) fn reconcile<S: HostSeams>(
    seams: &S,
    record: &OperationRecord,
    operation_key: &str,
    provider_id: &str,
) -> AppResult<PendingResult> {
    let super::CanonicalOperationContext::Checkout {
        payment_method: super::PaymentMethod::Stripe,
        stripe_request: Some(binding),
        ..
    } = &record.canonical_context
    else {
        return Ok(PendingResult::Deferred);
    };
    if !binding.valid_for_created_at(record.created_at) {
        return Ok(PendingResult::Deferred);
    }
    if super::api_status_support::ledger_proves_paid(seams, provider_id)? {
        return transition(seams, &record.operation_id, provider_id, true, None);
    }
    let Some(secret) = seams
        .secret_get(crate::ids::SECRET_STRIPE_KEY)?
        .filter(|value| !value.is_empty())
    else {
        return Ok(PendingResult::Deferred);
    };
    let RetrieveClassification::Found(session) =
        super::provider::retrieve(seams, &secret, provider_id)
    else {
        return Ok(PendingResult::Deferred);
    };
    let correlation = Correlation {
        ledger_key: operation_key,
        attempt_id: &record.checkout_attempt_id,
        operation_id: &record.operation_id,
        provider_scope: &record.provider_scope,
        material_fingerprint: &record.material_fingerprint,
    };
    if !super::provider::matches_correlation(&session, provider_id, &correlation)
        || session.expires_at != binding.expires_at
    {
        return Ok(PendingResult::Deferred);
    }
    match (session.status, session.payment_status.as_deref()) {
        (SessionStatus::Complete, Some("paid")) => {
            let Some(intent) = session.payment_intent.as_deref() else {
                return Ok(PendingResult::Deferred);
            };
            transition(
                seams,
                &record.operation_id,
                provider_id,
                true,
                Some((session.amount_total, session.currency.as_str(), intent)),
            )
        }
        (SessionStatus::Expired, Some("unpaid")) => {
            transition(seams, &record.operation_id, provider_id, false, None)
        }
        (SessionStatus::Open | SessionStatus::Complete, _) | (SessionStatus::Expired, _) => {
            Ok(PendingResult::Deferred)
        }
    }
}

fn transition<S: HostSeams>(
    seams: &S,
    operation_id: &str,
    provider_id: &str,
    paid: bool,
    expected_payment: Option<(i64, &str, &str)>,
) -> AppResult<PendingResult> {
    let result = if paid {
        if let Some((amount, currency, intent)) = expected_payment {
            super::settlement_atomic::paid_from_webhook(
                seams,
                operation_id,
                provider_id,
                amount,
                currency,
                intent,
            )
        } else {
            super::settlement_atomic::paid(seams, operation_id, provider_id)
        }
    } else {
        super::settlement_atomic::provider_expired(seams, operation_id, provider_id)
    };
    match result {
        Ok(()) if paid => Ok(PendingResult::Committed),
        Ok(()) => Ok(PendingResult::Released),
        Err(error) if error.status == 403 => Ok(PendingResult::Deferred),
        Err(error) if error.status == 409 => settled_race(seams, operation_id, error),
        Err(error) => Err(error),
    }
}

fn settled_race<S: HostSeams>(
    seams: &S,
    operation_id: &str,
    conflict: crate::error::AppError,
) -> AppResult<PendingResult> {
    let key = super::identity::operation_entry_key(operation_id)?;
    let Some(entry) =
        Db::new(seams, crate::ids::DB_ACCESS).read_one(super::OPERATION_MODEL, &key)?
    else {
        return Err(conflict);
    };
    let record: OperationRecord = entry.parse()?;
    match record.settlement_state {
        SettlementState::Paid => Ok(PendingResult::Committed),
        SettlementState::Terminal => Ok(PendingResult::Released),
        SettlementState::Pending => Err(conflict),
    }
}
