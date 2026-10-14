use crate::error::AppResult;
use crate::seams::HostSeams;

use super::record::{OperationRecord, ProviderCreateState, SettlementState};
use super::settlement_atomic_transition::PaymentFacts;
use super::DurableOutcome;

pub(super) fn paid<S: HostSeams>(
    seams: &S,
    operation_id: &str,
    provider_id: &str,
) -> AppResult<()> {
    super::settlement_atomic_transition::run(
        seams,
        operation_id,
        Some(provider_id),
        SettlementState::Paid,
        None,
        None,
    )
}

pub(super) fn paid_from_webhook<S: HostSeams>(
    seams: &S,
    operation_id: &str,
    provider_id: &str,
    amount_cents: i64,
    currency: &str,
    payment_intent: &str,
) -> AppResult<()> {
    super::settlement_atomic_transition::run(
        seams,
        operation_id,
        Some(provider_id),
        SettlementState::Paid,
        Some(PaymentFacts {
            amount: amount_cents,
            currency,
            payment_intent: Some(payment_intent),
        }),
        None,
    )
}

pub(super) fn terminal<S: HostSeams>(seams: &S, operation_id: &str) -> AppResult<()> {
    super::settlement_atomic_transition::run(
        seams,
        operation_id,
        None,
        SettlementState::Terminal,
        None,
        None,
    )
}

pub(super) fn provider_expired<S: HostSeams>(
    seams: &S,
    operation_id: &str,
    provider_id: &str,
) -> AppResult<()> {
    super::settlement_atomic_transition::run(
        seams,
        operation_id,
        Some(provider_id),
        SettlementState::Terminal,
        None,
        Some(super::settlement_atomic_transition::TerminalOutcome {
            code: "provider-session-expired",
            proof: "stripe-session-expired",
        }),
    )
}

pub(super) fn provider_failed<S: HostSeams>(
    seams: &S,
    operation_id: &str,
    provider_id: &str,
    amount_cents: i64,
    currency: &str,
) -> AppResult<()> {
    super::settlement_atomic_transition::run(
        seams,
        operation_id,
        Some(provider_id),
        SettlementState::Terminal,
        Some(PaymentFacts {
            amount: amount_cents,
            currency,
            payment_intent: None,
        }),
        Some(super::settlement_atomic_transition::TerminalOutcome {
            code: "provider-payment-failed",
            proof: "stripe-async-payment-failed",
        }),
    )
}

pub(super) fn terminal_from_webhook<S: HostSeams>(
    seams: &S,
    operation_id: &str,
    provider_id: &str,
    amount_cents: i64,
    currency: &str,
    cause: super::StripeSessionTerminal,
) -> AppResult<bool> {
    let key = super::identity::operation_entry_key(operation_id)?;
    let entry = crate::db::Db::new(seams, crate::ids::DB_ACCESS)
        .read_one(super::OPERATION_MODEL, &key)?
        .ok_or_else(|| crate::error::AppError::conflict("checkout operation was not found"))?;
    let record: OperationRecord = entry.parse()?;
    let provider_matches = matches!(
        &record.provider_create,
        ProviderCreateState::ProviderIdKnown { provider_id: stored } if stored == provider_id
    ) || matches!(
        &record.outcome,
        Some(DurableOutcome::Resolved { provider_artifacts, .. })
            if provider_artifacts.provider_checkout_id.as_deref() == Some(provider_id)
    );
    if record.operation_id != operation_id || !provider_matches {
        return Err(crate::error::AppError::conflict(
            "checkout lacks durable provider identity",
        ));
    }
    match record.settlement_state {
        SettlementState::Pending => {
            match cause {
                super::StripeSessionTerminal::Expired => {
                    super::settlement_atomic_transition::run(
                        seams,
                        operation_id,
                        Some(provider_id),
                        SettlementState::Terminal,
                        Some(PaymentFacts {
                            amount: amount_cents,
                            currency,
                            payment_intent: None,
                        }),
                        Some(super::settlement_atomic_transition::TerminalOutcome {
                            code: "provider-session-expired",
                            proof: "stripe-session-expired",
                        }),
                    )?;
                }
                super::StripeSessionTerminal::PaymentFailed => {
                    provider_failed(seams, operation_id, provider_id, amount_cents, currency)?;
                }
            }
            Ok(true)
        }
        SettlementState::Paid | SettlementState::Terminal => Ok(false),
    }
}
