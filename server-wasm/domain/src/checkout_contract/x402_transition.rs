use crate::error::{AppError, AppResult};
use crate::models::LedgerEntry;
use crate::seams::HostSeams;

use super::record::{OperationRecord, SettlementClaimState, SettlementState};
use super::PaymentMethod;

#[path = "x402_transition_apply.rs"]
mod apply;

pub(super) fn paid<S: HostSeams>(seams: &S, operation_id: &str) -> AppResult<()> {
    transition(seams, operation_id, SettlementState::Paid, None)
}

pub(super) fn terminal<S: HostSeams>(seams: &S, operation_id: &str, code: &str) -> AppResult<()> {
    transition(seams, operation_id, SettlementState::Terminal, Some(code))
}

fn transition<S: HostSeams>(
    seams: &S,
    operation_id: &str,
    target: SettlementState,
    terminal_code: Option<&str>,
) -> AppResult<()> {
    for _ in 0..3 {
        if apply::once(seams, operation_id, &target, terminal_code)? {
            return Ok(());
        }
    }
    Err(AppError::conflict("x402 settlement changed repeatedly"))
}

pub(super) fn validate_pending(record: &OperationRecord, operation_id: &str) -> AppResult<()> {
    if record.operation_id == operation_id
        && record.settlement_state == SettlementState::Pending
        && record.outcome.is_none()
        && record.x402_settlement.is_some()
    {
        Ok(())
    } else {
        Err(AppError::conflict("x402 checkout is not pending"))
    }
}

pub(super) fn update_claim(
    quote: &mut OperationRecord,
    checkout: &OperationRecord,
    target: &SettlementState,
    now: i64,
) -> AppResult<()> {
    let claim = quote
        .settlement_claim
        .as_mut()
        .filter(|claim| {
            claim.rail == PaymentMethod::X402
                && claim.checkout_operation_id == checkout.operation_id
                && claim.material_fingerprint == checkout.material_fingerprint
        })
        .ok_or_else(|| AppError::conflict("x402 quote claim is not owned by checkout"))?;
    claim.state = if *target == SettlementState::Paid {
        SettlementClaimState::Paid
    } else {
        SettlementClaimState::Terminal
    };
    claim.updated_at = now;
    Ok(())
}

pub(super) fn validate_ledger(ledger: &LedgerEntry, signature: &str) -> AppResult<()> {
    if ledger.reference == signature
        && ledger.provider_ref.as_deref() == Some(signature)
        && ledger.provider == "x402"
        && ledger.status == "pending"
    {
        Ok(())
    } else {
        Err(AppError::conflict("x402 pending ledger proof is invalid"))
    }
}
