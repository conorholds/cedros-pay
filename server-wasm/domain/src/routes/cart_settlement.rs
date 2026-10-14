//! Guarded ownership and finalization of a cart across payment rails.

use serde_json::to_value;

use crate::db::{BatchOp, Db, EntryRecord};
use crate::error::{AppError, AppResult};
use crate::guarded_batch::{GuardedBatchOutcome, GuardedCondition};
use crate::ids;
use crate::models::{CartRow, CartSettlementClaim};
use crate::seams::HostSeams;

pub(super) struct CompletionMutation {
    pub(super) condition: GuardedCondition,
    pub(super) op: BatchOp,
}

pub(super) fn claim<S: HostSeams>(
    db: &Db<'_, S>,
    record: EntryRecord,
    rail: &str,
    fingerprint: &str,
    reference: &str,
    mut extra_conditions: Vec<GuardedCondition>,
    mut extra_ops: Vec<BatchOp>,
) -> AppResult<EntryRecord> {
    let mut cart: CartRow = record.parse()?;
    validate_owner(&cart, rail, fingerprint)?;
    if cart.settlement_claim.is_some() {
        return Ok(record);
    }
    cart.settlement_claim = Some(CartSettlementClaim {
        started_at: Some(crate::time::iso8601(db.host().now_unix_secs())),
        schema_version: 1,
        rail: rail.to_string(),
        fingerprint: fingerprint.to_string(),
        reference: reference.to_string(),
        status: "initiating".to_string(),
    });
    extra_conditions.push(version_guard(&record)?);
    extra_ops.push(write_cart(&cart)?);
    match db.guarded_batch(&extra_conditions, &extra_ops)? {
        GuardedBatchOutcome::Applied { .. } => read_cart(db, &cart.cart_id),
        GuardedBatchOutcome::Conflict { .. } => {
            let current = read_cart(db, &cart.cart_id)?;
            validate_owner(&current.parse()?, rail, fingerprint)?;
            Ok(current)
        }
    }
}

pub(super) fn validate_owner(cart: &CartRow, rail: &str, fingerprint: &str) -> AppResult<()> {
    if cart.paid_signature.is_some() {
        return Err(AppError::conflict("cart is already settled"));
    }
    if let Some(claim) = &cart.settlement_claim {
        if claim.schema_version == 1 && claim.rail == rail && claim.fingerprint == fingerprint {
            return Ok(());
        }
        return Err(AppError::conflict(
            "cart settlement is already owned by another payment attempt",
        ));
    }
    Ok(())
}

pub(super) fn finalize<S: HostSeams>(
    db: &Db<'_, S>,
    record: &EntryRecord,
    rail: &str,
    fingerprint: &str,
    reference: &str,
    mut conditions: Vec<GuardedCondition>,
    mut ops: Vec<BatchOp>,
) -> AppResult<bool> {
    let mut cart: CartRow = record.parse()?;
    validate_owner(&cart, rail, fingerprint)?;
    let claim = cart
        .settlement_claim
        .as_mut()
        .ok_or_else(|| AppError::conflict("cart settlement claim is missing"))?;
    claim.reference = reference.to_string();
    claim.status = "pending".to_string();
    conditions.push(version_guard(record)?);
    ops.push(write_cart(&cart)?);
    Ok(matches!(
        db.guarded_batch(&conditions, &ops)?,
        GuardedBatchOutcome::Applied { .. }
    ))
}

pub(super) fn version_guard(record: &EntryRecord) -> AppResult<GuardedCondition> {
    let expected_version = record
        .version
        .clone()
        .ok_or_else(|| AppError::internal("cart entry omitted required concurrency version"))?;
    Ok(GuardedCondition::Version {
        content_model_id: ids::MODEL_CART,
        entry_key: record.entry_key.clone(),
        expected_version,
    })
}

pub(super) fn write_cart(cart: &CartRow) -> AppResult<BatchOp> {
    Ok(BatchOp::Write {
        content_model_id: ids::MODEL_CART,
        entry_key: cart.cart_id.clone(),
        data: to_value(cart).map_err(|error| {
            AppError::internal("cannot encode guarded cart").with_internal(error.to_string())
        })?,
    })
}

pub(super) fn webhook_completion<S: HostSeams>(
    db: &Db<'_, S>,
    cart_id: &str,
    session_id: &str,
    fingerprint: &str,
) -> AppResult<Option<CompletionMutation>> {
    let record = read_cart(db, cart_id)?;
    let mut cart: CartRow = record.parse()?;
    let claim = cart
        .settlement_claim
        .as_mut()
        .ok_or_else(|| AppError::conflict("cart settlement claim is missing"))?;
    if claim.schema_version != 1
        || claim.rail != "stripe"
        || claim.fingerprint != fingerprint
        || claim.reference != session_id
    {
        return Err(AppError::conflict(
            "cart settlement is owned by another payment attempt",
        ));
    }
    if let Some(paid) = cart.paid_signature.as_deref() {
        if paid == session_id && claim.status == "succeeded" {
            return Ok(None);
        }
        return Err(AppError::conflict("cart is already settled"));
    }
    claim.status = "succeeded".to_string();
    cart.paid_signature = Some(session_id.to_string());
    Ok(Some(CompletionMutation {
        condition: version_guard(&record)?,
        op: write_cart(&cart)?,
    }))
}

pub(super) fn webhook_failure<S: HostSeams>(
    db: &Db<'_, S>,
    cart_id: &str,
    session_id: &str,
    fingerprint: &str,
) -> AppResult<Option<CompletionMutation>> {
    let record = read_cart(db, cart_id)?;
    let mut cart: CartRow = record.parse()?;
    let Some(claim) = cart.settlement_claim.as_ref() else {
        return Ok(None);
    };
    if claim.schema_version != 1
        || claim.rail != "stripe"
        || claim.fingerprint != fingerprint
        || claim.reference != session_id
    {
        return Err(AppError::conflict(
            "cart settlement is owned by another payment attempt",
        ));
    }
    if cart.paid_signature.is_some() {
        return Ok(None);
    }
    cart.settlement_claim = None;
    Ok(Some(CompletionMutation {
        condition: version_guard(&record)?,
        op: write_cart(&cart)?,
    }))
}

fn read_cart<S: HostSeams>(db: &Db<'_, S>, cart_id: &str) -> AppResult<EntryRecord> {
    db.read_one(ids::MODEL_CART, cart_id)?
        .ok_or_else(|| AppError::conflict("cart changed concurrently; retry"))
}

#[cfg(test)]
pub(crate) fn mark_paid<S: HostSeams>(
    db: &Db<'_, S>,
    cart_id: &str,
    reference: &str,
) -> AppResult<()> {
    let Some(record) = db.read_one(ids::MODEL_CART, cart_id)? else {
        return Ok(());
    };
    let mut cart: CartRow = record.parse()?;
    if cart.paid_signature.as_deref() == Some(reference) {
        return Ok(());
    }
    if cart
        .settlement_claim
        .as_ref()
        .is_some_and(|claim| claim.reference != reference)
    {
        return Err(AppError::conflict("cart is owned by another payment"));
    }
    cart.paid_signature = Some(reference.to_string());
    if let Some(claim) = cart.settlement_claim.as_mut() {
        claim.status = "succeeded".to_string();
    }
    let conditions = [version_guard(&record)?];
    let ops = [write_cart(&cart)?];
    if matches!(
        db.guarded_batch(&conditions, &ops)?,
        GuardedBatchOutcome::Conflict { .. }
    ) {
        return Err(AppError::conflict(
            "cart changed while finalizing settlement",
        ));
    }
    Ok(())
}
