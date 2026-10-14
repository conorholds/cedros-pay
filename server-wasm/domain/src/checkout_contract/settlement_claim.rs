use crate::db::{BatchOp, Db};
use crate::error::{AppError, AppResult};
use crate::guarded_batch::GuardedCondition;
use crate::seams::HostSeams;

use super::record::{OperationRecord, SettlementClaim, SettlementClaimState};
use super::{CanonicalOperationContext, OperationIdentity, PaymentMethod, OPERATION_MODEL};

pub(super) struct ClaimPlan {
    pub condition: GuardedCondition,
    pub op: BatchOp,
}

pub(super) fn prepare<S: HostSeams>(
    db: &Db<'_, S>,
    context: &CanonicalOperationContext,
    identity: &OperationIdentity,
    now: i64,
) -> AppResult<ClaimPlan> {
    let CanonicalOperationContext::Checkout {
        quote_operation_id,
        payment_method,
        ..
    } = context
    else {
        return Err(AppError::internal(
            "settlement claim requires checkout context",
        ));
    };
    prepare_state(
        db,
        quote_operation_id,
        *payment_method,
        &identity.public_operation_id(),
        identity.material_fingerprint(),
        now,
        SettlementClaimState::Prepared,
    )
}

pub(super) fn prepare_paid<S: HostSeams>(
    db: &Db<'_, S>,
    quote_operation_id: &str,
    rail: PaymentMethod,
    checkout_operation_id: &str,
    material_fingerprint: &str,
    now: i64,
) -> AppResult<ClaimPlan> {
    prepare_state(
        db,
        quote_operation_id,
        rail,
        checkout_operation_id,
        material_fingerprint,
        now,
        SettlementClaimState::Paid,
    )
}

fn prepare_state<S: HostSeams>(
    db: &Db<'_, S>,
    quote_operation_id: &str,
    rail: PaymentMethod,
    checkout_operation_id: &str,
    material_fingerprint: &str,
    now: i64,
    state: SettlementClaimState,
) -> AppResult<ClaimPlan> {
    let key = super::identity::operation_entry_key(quote_operation_id)?;
    let entry = db
        .read_one(OPERATION_MODEL, &key)?
        .ok_or_else(|| AppError::not_found("authoritative quote was not found"))?;
    let mut quote: OperationRecord = entry.parse()?;
    if let Some(existing) = &quote.settlement_claim {
        if exact(existing, rail, checkout_operation_id, material_fingerprint) {
            return Err(AppError::conflict(
                "checkout settlement is already prepared",
            ));
        }
        return Err(AppError::conflict(
            "authoritative quote is owned by another settlement",
        ));
    }
    quote.settlement_claim = Some(SettlementClaim {
        rail,
        checkout_operation_id: checkout_operation_id.into(),
        material_fingerprint: material_fingerprint.into(),
        state,
        updated_at: now,
    });
    quote.updated_at = now;
    Ok(ClaimPlan {
        condition: super::settlement_storage::version(OPERATION_MODEL, &entry)?,
        op: super::settlement_storage::write(OPERATION_MODEL, &key, &quote)?,
    })
}

fn exact(
    claim: &SettlementClaim,
    rail: PaymentMethod,
    operation_id: &str,
    fingerprint: &str,
) -> bool {
    claim.rail == rail
        && claim.checkout_operation_id == operation_id
        && claim.material_fingerprint == fingerprint
}
