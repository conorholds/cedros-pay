//! Guarded x402 payment claims and monotonic ledger/cart transitions.

use crate::db::{BatchOp, Db, EntryRecord};
use crate::error::{AppError, AppResult};
use crate::guarded_batch::{GuardedBatchOutcome, GuardedCondition};
use crate::ids;
use crate::models::{CartRow, LedgerEntry};
use crate::routes::{analytics_events, entitlements};
use crate::seams::HostSeams;
use serde_json::Value;

pub(crate) struct Prepared {
    ledger: EntryRecord,
    pub(crate) entry: LedgerEntry,
    cart: Option<EntryRecord>,
    fingerprint: String,
}

pub(crate) fn prepare<S: HostSeams>(
    db: &Db<'_, S>,
    entry: LedgerEntry,
    cart_id: Option<&str>,
    fingerprint: String,
) -> AppResult<Prepared> {
    if let Some(ledger) = db.read_one(ids::MODEL_LEDGER, &entry.reference)? {
        crate::routes::checkout_claim::validate(&ledger, &fingerprint)?;
        let stored = ledger.parse()?;
        let cart = load_owned_cart(db, cart_id, &fingerprint, &entry.reference)?;
        return Ok(Prepared {
            ledger,
            entry: stored,
            cart,
            fingerprint,
        });
    }
    let data = crate::routes::checkout_claim::ledger_value(&entry, &fingerprint)?;
    let (ledger, cart) = match cart_id {
        Some(cart_id) => claim_cart_payment(db, cart_id, &entry.reference, &fingerprint, data)?,
        None => {
            let ledger = crate::routes::checkout_claim::claim_ledger(
                db,
                &entry.reference,
                data,
                &fingerprint,
            )?;
            (ledger, None)
        }
    };
    let stored = ledger.parse()?;
    Ok(Prepared {
        ledger,
        entry: stored,
        cart,
        fingerprint,
    })
}

pub(crate) fn transition<S: HostSeams>(
    db: &Db<'_, S>,
    prepared: &Prepared,
    status: &str,
    now: i64,
) -> AppResult<bool> {
    transition_with_effects(db, prepared, status, now, Vec::new())
}

pub(crate) fn transition_with_effects<S: HostSeams>(
    db: &Db<'_, S>,
    prepared: &Prepared,
    status: &str,
    now: i64,
    actions: Vec<crate::durable_effects::Action>,
) -> AppResult<bool> {
    let effect_time = if prepared.entry.status == status {
        crate::time::parse_iso(&prepared.entry.processed_at).unwrap_or(now)
    } else {
        now
    };
    let effect = crate::durable_effects::plan(
        "x402-payment",
        &prepared.entry.reference,
        actions,
        effect_time,
    )?;
    if prepared.entry.status == status {
        if let Some(effect) = effect.as_ref() {
            crate::durable_effects::ensure_plan(db, effect)?;
            crate::durable_effects::dispatch_effect_best_effort(db.host(), &effect.effect_id);
        }
        return Ok(false);
    }
    if prepared.entry.status != "pending" {
        return Err(AppError::conflict("x402 payment is already settled"));
    }
    let mut entry = prepared.entry.clone();
    entry.status = status.to_string();
    entry.processed_at = crate::time::iso8601(now);
    let mut conditions = vec![crate::routes::checkout_claim::version_guard(
        &prepared.ledger,
        &entry.reference,
    )?];
    let mut ops = vec![BatchOp::Write {
        content_model_id: ids::MODEL_LEDGER,
        entry_key: entry.reference.clone(),
        data: crate::routes::checkout_claim::ledger_value(&entry, &prepared.fingerprint)?,
    }];
    if let Some(cart_record) = &prepared.cart {
        append_cart_transition(
            cart_record,
            &entry.reference,
            status,
            &mut conditions,
            &mut ops,
        )?;
    }
    let effect_id = if let Some(effect) = effect {
        let effect_id = Some(effect.effect_id.clone());
        conditions.push(effect.condition);
        ops.push(effect.op);
        effect_id
    } else {
        None
    };
    match db.guarded_batch(&conditions, &ops)? {
        GuardedBatchOutcome::Applied { .. } => {
            if let Some(effect_id) = effect_id {
                crate::durable_effects::dispatch_effect_best_effort(db.host(), &effect_id);
            }
            Ok(true)
        }
        GuardedBatchOutcome::Conflict { .. } => resolve_transition(db, prepared, status),
    }
}

pub(crate) fn settlement_actions(
    reference: &str,
    amount: i64,
    currency: &str,
    profile_id: Option<&str>,
    product_id: Option<&str>,
    crm_object: &Value,
    now: i64,
) -> Vec<crate::durable_effects::Action> {
    let mut actions = vec![
        analytics_events::payment_succeeded_action("x402", "checkout", amount, currency, now),
        entitlements::changed_action(
            "purchase_completed",
            profile_id,
            product_id,
            Some(reference),
            Some(reference),
            now,
        ),
    ];
    if let Some(action) = crate::crm_events::payment_succeeded_action(
        "x402", reference, crm_object, amount, currency, now, reference,
    ) {
        actions.push(action);
    }
    actions
}

pub(crate) fn resume<S: HostSeams>(
    db: &Db<'_, S>,
    ledger: EntryRecord,
    entry: LedgerEntry,
) -> AppResult<Prepared> {
    let fingerprint = ledger
        .payload
        .get(crate::routes::checkout_claim::CLAIM_FIELD)
        .and_then(|claim| claim.get("fingerprint"))
        .and_then(serde_json::Value::as_str)
        .ok_or_else(|| AppError::conflict("legacy x402 payment lacks a guarded claim"))?
        .to_string();
    let cart_id = entry
        .product_id
        .as_deref()
        .and_then(|product| product.strip_prefix("cart:"));
    let cart = load_owned_cart(db, cart_id, &fingerprint, &entry.reference)?;
    Ok(Prepared {
        ledger,
        entry,
        cart,
        fingerprint,
    })
}

fn claim_cart_payment<S: HostSeams>(
    db: &Db<'_, S>,
    cart_id: &str,
    reference: &str,
    fingerprint: &str,
    ledger: serde_json::Value,
) -> AppResult<(EntryRecord, Option<EntryRecord>)> {
    let cart = db
        .read_one(ids::MODEL_CART, cart_id)?
        .ok_or_else(|| AppError::not_found("cart not found"))?;
    let conditions = vec![GuardedCondition::Absent {
        content_model_id: ids::MODEL_LEDGER,
        entry_key: reference.to_string(),
    }];
    let ops = vec![BatchOp::Write {
        content_model_id: ids::MODEL_LEDGER,
        entry_key: reference.to_string(),
        data: ledger,
    }];
    let cart = crate::routes::cart_settlement::claim(
        db,
        cart,
        "x402",
        fingerprint,
        reference,
        conditions,
        ops,
    )?;
    let ledger = db
        .read_one(ids::MODEL_LEDGER, reference)?
        .ok_or_else(|| AppError::conflict("x402 cart claim omitted payment ledger"))?;
    crate::routes::checkout_claim::validate(&ledger, fingerprint)?;
    Ok((ledger, Some(cart)))
}

fn load_owned_cart<S: HostSeams>(
    db: &Db<'_, S>,
    cart_id: Option<&str>,
    fingerprint: &str,
    reference: &str,
) -> AppResult<Option<EntryRecord>> {
    let Some(cart_id) = cart_id else {
        return Ok(None);
    };
    let record = db
        .read_one(ids::MODEL_CART, cart_id)?
        .ok_or_else(|| AppError::conflict("x402 payment cart is missing"))?;
    let cart: CartRow = record.parse()?;
    if cart.paid_signature.as_deref() == Some(reference) {
        return Ok(Some(record));
    }
    crate::routes::cart_settlement::validate_owner(&cart, "x402", fingerprint)?;
    Ok(Some(record))
}

fn append_cart_transition(
    record: &EntryRecord,
    reference: &str,
    status: &str,
    conditions: &mut Vec<GuardedCondition>,
    ops: &mut Vec<BatchOp>,
) -> AppResult<()> {
    let mut cart: CartRow = record.parse()?;
    crate::routes::cart_settlement::validate_owner(&cart, "x402", cart_fingerprint(&cart)?)?;
    if status == "succeeded" {
        cart.paid_signature = Some(reference.to_string());
        if let Some(claim) = cart.settlement_claim.as_mut() {
            claim.status = "succeeded".to_string();
        }
    } else if status == "failed" {
        cart.settlement_claim = None;
    }
    conditions.push(crate::routes::cart_settlement::version_guard(record)?);
    ops.push(crate::routes::cart_settlement::write_cart(&cart)?);
    Ok(())
}

fn cart_fingerprint(cart: &CartRow) -> AppResult<&str> {
    cart.settlement_claim
        .as_ref()
        .map(|claim| claim.fingerprint.as_str())
        .ok_or_else(|| AppError::conflict("x402 cart settlement claim is missing"))
}

fn resolve_transition<S: HostSeams>(
    db: &Db<'_, S>,
    prepared: &Prepared,
    status: &str,
) -> AppResult<bool> {
    let current = db
        .read_one(ids::MODEL_LEDGER, &prepared.entry.reference)?
        .ok_or_else(|| AppError::conflict("x402 payment changed concurrently; retry"))?;
    crate::routes::checkout_claim::validate(&current, &prepared.fingerprint)?;
    let current: LedgerEntry = current.parse()?;
    if current.status == status {
        return Ok(false);
    }
    Err(AppError::conflict(
        "x402 payment changed concurrently; retry with current state",
    ))
}
