use crate::error::{AppError, AppResult};

use super::record::{OperationRecord, SettlementState};
use super::{CanonicalOperationContext, DurableOutcome};

pub(super) fn checkout(
    record: &OperationRecord,
    operation_id: &str,
    provider_id: Option<&str>,
    target: &SettlementState,
) -> AppResult<()> {
    if record.operation_id != operation_id || record.settlement_state != SettlementState::Pending {
        return Err(AppError::conflict("checkout settlement state is invalid"));
    }
    // A response may identify the created session but omit its redirect URL.
    // Verified settlement still applies to that exact durable provider identity.
    if let (
        Some(id),
        Some(DurableOutcome::Indeterminate {
            provider_artifacts, ..
        }),
    ) = (provider_id, &record.outcome)
    {
        if matches!(target, SettlementState::Paid | SettlementState::Terminal)
            && provider_artifacts.provider_checkout_id.as_deref() == Some(id)
            && match &record.provider_create {
                super::record::ProviderCreateState::ProviderIdKnown { provider_id } => {
                    provider_id == id
                }
                // Older incomplete responses retained the id only in artifacts.
                super::record::ProviderCreateState::AttemptedUnknown { .. } => true,
                super::record::ProviderCreateState::NotStarted => false,
            }
        {
            return Ok(());
        }
    }
    match (target, &record.outcome, provider_id) {
        (
            SettlementState::Paid,
            Some(DurableOutcome::Resolved {
                provider_artifacts, ..
            }),
            Some(id),
        ) if provider_artifacts.provider_checkout_id.as_deref() == Some(id) => Ok(()),
        (SettlementState::Terminal, Some(DurableOutcome::Terminal { durable: true, .. }), None) => {
            Ok(())
        }
        (
            SettlementState::Terminal,
            Some(DurableOutcome::Resolved {
                provider_artifacts, ..
            }),
            Some(id),
        ) if provider_artifacts.provider_checkout_id.as_deref() == Some(id) => Ok(()),
        _ => Err(AppError::conflict(
            "checkout lacks durable settlement proof",
        )),
    }
}

pub(super) fn quote_id(record: &OperationRecord) -> AppResult<&str> {
    match &record.canonical_context {
        CanonicalOperationContext::Checkout {
            quote_operation_id, ..
        } => Ok(quote_operation_id),
        _ => Err(AppError::internal("checkout context is invalid")),
    }
}

pub(super) fn quote_snapshot(
    record: &OperationRecord,
) -> AppResult<&super::AuthoritativeQuoteSnapshot> {
    match &record.canonical_context {
        CanonicalOperationContext::Quote { snapshot, .. } => Ok(snapshot),
        _ => Err(AppError::internal("quote context is invalid")),
    }
}
