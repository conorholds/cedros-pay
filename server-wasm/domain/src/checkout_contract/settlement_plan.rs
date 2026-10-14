use crate::db::{BatchOp, Db, EntryRecord};
use crate::error::{AppError, AppResult};
use crate::guarded_batch::GuardedCondition;
use crate::models::LedgerEntry;
use crate::seams::HostSeams;

use super::inventory_types::{HoldStatus, StockRecord};
use super::record::{OperationRecord, SettlementState};
use super::settlement_storage::{required, version, write};
use super::{CanonicalOperationContext, INVENTORY_HOLD_MODEL, OPERATION_MODEL, STOCK_MODEL};

pub(super) struct Plan {
    pub conditions: Vec<GuardedCondition>,
    pub ops: Vec<BatchOp>,
}

impl Plan {
    pub fn new(checkout: &EntryRecord, quote: &EntryRecord) -> AppResult<Self> {
        Ok(Self {
            conditions: vec![
                version(OPERATION_MODEL, checkout)?,
                version(OPERATION_MODEL, quote)?,
            ],
            ops: vec![],
        })
    }
}

pub fn append_inventory<S: HostSeams>(
    db: &Db<'_, S>,
    checkout: &OperationRecord,
    target: &SettlementState,
    now: i64,
    plan: &mut Plan,
) -> AppResult<()> {
    let Some(reservation) = reservation(checkout)? else {
        return Ok(());
    };
    let hold_entry = required(db, INVENTORY_HOLD_MODEL, &reservation.hold_id)?;
    let mut hold: super::inventory_types::HoldRecord = hold_entry.parse()?;
    if hold.checkout_operation_id.as_deref() != Some(&checkout.operation_id)
        || hold.status != HoldStatus::CheckoutPending
    {
        return Err(AppError::conflict(
            "inventory hold is not pending for this checkout",
        ));
    }
    plan.conditions
        .push(version(INVENTORY_HOLD_MODEL, &hold_entry)?);
    for line in &hold.lines {
        let entry = required(db, STOCK_MODEL, &line.stock_key)?;
        let mut stock: StockRecord = entry.parse()?;
        if stock.reserved < line.quantity
            || (*target == SettlementState::Paid && stock.on_hand < line.quantity)
        {
            return Err(AppError::internal("inventory hold stock is inconsistent"));
        }
        stock.reserved -= line.quantity;
        if *target == SettlementState::Paid {
            stock.on_hand -= line.quantity;
            stock.sold = stock
                .sold
                .checked_add(line.quantity)
                .ok_or_else(|| AppError::internal("sold inventory overflowed"))?;
        }
        stock.updated_at = now;
        plan.conditions.push(version(STOCK_MODEL, &entry)?);
        plan.ops.push(write(STOCK_MODEL, &line.stock_key, &stock)?);
    }
    hold.status = if *target == SettlementState::Paid {
        HoldStatus::Committed
    } else {
        HoldStatus::Released
    };
    hold.updated_at = now;
    plan.ops
        .push(write(INVENTORY_HOLD_MODEL, &reservation.hold_id, &hold)?);
    Ok(())
}

pub fn append_direct_inventory<S: HostSeams>(
    db: &Db<'_, S>,
    checkout: &OperationRecord,
    now: i64,
    plan: &mut Plan,
) -> AppResult<()> {
    let Some(reservation) = reservation(checkout)? else {
        return Ok(());
    };
    let hold_entry = required(db, INVENTORY_HOLD_MODEL, &reservation.hold_id)?;
    let mut hold: super::inventory_types::HoldRecord = hold_entry.parse()?;
    if hold.status != HoldStatus::Active || hold.checkout_operation_id.is_some() {
        return Err(AppError::conflict(
            "quote inventory is owned by another checkout",
        ));
    }
    plan.conditions
        .push(version(INVENTORY_HOLD_MODEL, &hold_entry)?);
    for line in &hold.lines {
        let entry = required(db, STOCK_MODEL, &line.stock_key)?;
        let mut stock: StockRecord = entry.parse()?;
        if stock.reserved < line.quantity || stock.on_hand < line.quantity {
            return Err(AppError::internal("inventory hold stock is inconsistent"));
        }
        stock.reserved -= line.quantity;
        stock.on_hand -= line.quantity;
        stock.sold = stock
            .sold
            .checked_add(line.quantity)
            .ok_or_else(|| AppError::internal("sold inventory overflowed"))?;
        stock.updated_at = now;
        plan.conditions.push(version(STOCK_MODEL, &entry)?);
        plan.ops.push(write(STOCK_MODEL, &line.stock_key, &stock)?);
    }
    hold.status = HoldStatus::Committed;
    hold.checkout_operation_id = Some(checkout.operation_id.clone());
    hold.updated_at = now;
    plan.ops
        .push(write(INVENTORY_HOLD_MODEL, &reservation.hold_id, &hold)?);
    Ok(())
}

pub fn append_ledger<S: HostSeams>(
    db: &Db<'_, S>,
    provider_id: &str,
    snapshot: &super::AuthoritativeQuoteSnapshot,
    effect: &super::settlement_effect_record::SettlementEffectRecord,
    now: i64,
    plan: &mut Plan,
    payment_intent: Option<&str>,
) -> AppResult<()> {
    let amount = i64::try_from(snapshot.total_cents)
        .map_err(|_| AppError::unprocessable("quote total exceeds ledger range"))?;
    if let Some(intent) = payment_intent {
        let identity = crate::routes::webhooks::provider_payment_identity(
            db,
            intent,
            provider_id,
            amount,
            &snapshot.currency,
        )?;
        plan.conditions.extend(identity.conditions);
        plan.ops.extend(identity.ops);
    }
    let mut data = LedgerEntry {
        reference: provider_id.into(),
        kind: "payment".into(),
        status: "succeeded".into(),
        gross_cents: amount,
        currency: snapshot.currency.clone(),
        provider: "stripe".into(),
        provider_ref: Some(payment_intent.unwrap_or(provider_id).into()),
        created_at: crate::time::iso8601(now),
        processed_at: crate::time::iso8601(now),
        ..Default::default()
    };
    effect.apply_ledger_entitlement_identity(&mut data);
    let mut original = serde_json::json!({});
    match db.read_one(crate::ids::MODEL_LEDGER, provider_id)? {
        Some(entry) => {
            let stored: LedgerEntry = entry.parse()?;
            if stored.reference != data.reference
                || stored.kind != "payment"
                || stored.refund_cents < 0
                || stored.refund_cents > stored.gross_cents
                || stored.status != "succeeded"
                || stored.gross_cents != amount
                || stored.currency != data.currency
                || stored.provider != "stripe"
                || stored
                    .customer_profile_id
                    .as_ref()
                    .is_some_and(|subject| Some(subject) != data.customer_profile_id.as_ref())
                || stored
                    .product_id
                    .as_ref()
                    .is_some_and(|product| !data.product_ids.contains(product))
                || (!stored.product_ids.is_empty() && stored.product_ids != data.product_ids)
            {
                return Err(AppError::conflict(
                    "provider ledger proof conflicts with checkout",
                ));
            }
            if payment_intent.is_some_and(|intent| {
                stored
                    .provider_ref
                    .as_deref()
                    .is_some_and(|reference| reference != provider_id && reference != intent)
            }) {
                return Err(AppError::conflict("checkout payment identity changed"));
            }
            // Recovery fills entitlement identity; it must never erase refunds,
            // disputes, timestamps, or provider correlation already committed.
            original = entry.payload.clone();
            data = stored;
            if let Some(intent) = payment_intent {
                data.provider_ref = Some(intent.into());
            }
            effect.apply_ledger_entitlement_identity(&mut data);
            plan.conditions
                .push(version(crate::ids::MODEL_LEDGER, &entry)?);
        }
        None => {
            if payment_intent.is_none() {
                return Err(AppError::conflict(
                    "checkout lacks provider payment identity",
                ));
            }
            plan.conditions.push(GuardedCondition::Absent {
                content_model_id: crate::ids::MODEL_LEDGER,
                entry_key: provider_id.into(),
            });
        }
    }
    plan.ops.push(BatchOp::Write {
        content_model_id: crate::ids::MODEL_LEDGER,
        entry_key: provider_id.into(),
        data: crate::routes::webhooks::preserve_ledger_fields(&original, &data)?,
    });
    Ok(())
}

fn reservation(
    record: &OperationRecord,
) -> AppResult<Option<&super::inventory_types::InventoryReservationContext>> {
    match &record.canonical_context {
        CanonicalOperationContext::Checkout {
            inventory_reservation,
            ..
        } => Ok(inventory_reservation.as_ref()),
        _ => Err(AppError::internal("checkout context is invalid")),
    }
}
