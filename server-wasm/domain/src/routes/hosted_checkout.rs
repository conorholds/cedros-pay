//! Durable initiation/finalization for hosted Stripe Checkout sessions.

use serde_json::{json, Value};

use crate::db::{BatchOp, Db, EntryRecord};
use crate::error::{AppError, AppResult};
use crate::guarded_batch::{GuardedBatchOutcome, GuardedCondition};
use crate::ids;
use crate::models::LedgerEntry;
use crate::seams::HostSeams;
use crate::time;

const RESULT_FIELD: &str = "checkoutResult";

pub(super) struct Claim {
    pub(super) key: String,
    pub(super) fingerprint: String,
    pub(super) row: EntryRecord,
}

pub(super) fn claim<S: HostSeams>(
    db: &Db<'_, S>,
    operation: &str,
    idempotency_key: &str,
    facts: Value,
    now: i64,
) -> AppResult<Claim> {
    let identity = crate::routes::checkout_claim::fingerprint(&json!({
        "schemaVersion": 1,
        "operation": operation,
        "idempotencyKey": idempotency_key,
    }))?;
    let fingerprint = crate::routes::checkout_claim::fingerprint(&json!({
        "schemaVersion": 1,
        "operation": operation,
        "idempotencyKey": idempotency_key,
        "facts": facts,
    }))?;
    let key = format!("checkout-claim:{identity}");
    let entry = LedgerEntry {
        reference: key.clone(),
        kind: "checkout_operation".into(),
        status: "initiating".into(),
        gross_cents: facts["amountCents"].as_i64().unwrap_or_default(),
        refund_cents: 0,
        currency: facts["currency"].as_str().unwrap_or("USD").into(),
        customer_profile_id: None,
        route_path: None,
        product_id: facts["resource"].as_str().map(str::to_string),
        product_ids: facts["resource"]
            .as_str()
            .map(str::to_string)
            .into_iter()
            .collect(),
        provider: "stripe".into(),
        provider_ref: None,
        payer_wallet: None,
        created_at: time::iso8601(now),
        processed_at: time::iso8601(now),
        token_settlement: None,
    };
    let value = crate::routes::checkout_claim::ledger_value(&entry, &fingerprint)?;
    let row = crate::routes::checkout_claim::claim_ledger(db, &key, value, &fingerprint)?;
    Ok(Claim {
        key,
        fingerprint,
        row,
    })
}

pub(super) fn finalize<S: HostSeams>(
    db: &Db<'_, S>,
    claim: &Claim,
    session_id: &str,
    session_url: Option<&str>,
    entry: &LedgerEntry,
) -> AppResult<()> {
    let completed = completed_value(claim, session_id, session_url, &entry.processed_at)?;
    let conditions = [
        crate::routes::checkout_claim::version_guard(&claim.row, &claim.key)?,
        GuardedCondition::Absent {
            content_model_id: ids::MODEL_LEDGER,
            entry_key: session_id.to_string(),
        },
    ];
    let ops = [
        BatchOp::Write {
            content_model_id: ids::MODEL_LEDGER,
            entry_key: claim.key.clone(),
            data: completed.clone(),
        },
        BatchOp::Write {
            content_model_id: ids::MODEL_LEDGER,
            entry_key: session_id.to_string(),
            data: crate::routes::checkout_claim::ledger_value(entry, &claim.fingerprint)?,
        },
    ];
    if matches!(
        db.guarded_batch(&conditions, &ops)?,
        GuardedBatchOutcome::Applied { .. }
    ) {
        return Ok(());
    }
    let settled = db
        .read_one(ids::MODEL_LEDGER, session_id)?
        .ok_or_else(|| AppError::conflict("checkout session changed concurrently; retry"))?;
    crate::routes::checkout_claim::validate(&settled, &claim.fingerprint)?;
    complete_after_race(db, claim, session_id, session_url, &entry.processed_at)
}

pub(super) fn completed_result(claim: &Claim) -> AppResult<Option<(String, Option<String>)>> {
    if claim.row.payload.get("status").and_then(Value::as_str) != Some("completed") {
        return Ok(None);
    }
    parse_result(&claim.row.payload).map(Some)
}

pub(super) fn require_provider_retry_safe(claim: &Claim, now: i64) -> AppResult<()> {
    let started = claim
        .row
        .payload
        .get("createdAt")
        .and_then(Value::as_str)
        .and_then(time::parse_iso)
        .ok_or_else(|| AppError::internal("checkout operation has an invalid createdAt"))?;
    if now >= started && now - started < crate::checkout_contract::PROVIDER_IDEMPOTENCY_SECONDS {
        return Ok(());
    }
    Err(AppError::conflict(
        "Stripe checkout outcome is unknown; use a new checkout operation",
    ))
}

fn completed_value(
    claim: &Claim,
    session_id: &str,
    session_url: Option<&str>,
    processed_at: &str,
) -> AppResult<Value> {
    let mut value = claim.row.payload.clone();
    value["status"] = Value::String("completed".into());
    value["providerRef"] = Value::String(session_id.into());
    value["processedAt"] = Value::String(processed_at.into());
    value[RESULT_FIELD] = json!({
        "schemaVersion": 1,
        "sessionId": session_id,
        "url": session_url,
    });
    Ok(value)
}

fn complete_after_race<S: HostSeams>(
    db: &Db<'_, S>,
    claim: &Claim,
    session_id: &str,
    session_url: Option<&str>,
    processed_at: &str,
) -> AppResult<()> {
    let row = db
        .read_one(ids::MODEL_LEDGER, &claim.key)?
        .ok_or_else(|| AppError::conflict("checkout operation marker disappeared"))?;
    crate::routes::checkout_claim::validate(&row, &claim.fingerprint)?;
    if row.payload.get("status").and_then(Value::as_str) == Some("completed") {
        let stored = parse_result(&row.payload)?;
        if stored == (session_id.to_string(), session_url.map(str::to_string)) {
            return Ok(());
        }
        return Err(AppError::conflict(
            "checkout operation result changed concurrently",
        ));
    }
    let current = Claim {
        key: claim.key.clone(),
        fingerprint: claim.fingerprint.clone(),
        row,
    };
    let conditions = [crate::routes::checkout_claim::version_guard(
        &current.row,
        &claim.key,
    )?];
    let ops = [BatchOp::Write {
        content_model_id: ids::MODEL_LEDGER,
        entry_key: claim.key.clone(),
        data: completed_value(&current, session_id, session_url, processed_at)?,
    }];
    if matches!(
        db.guarded_batch(&conditions, &ops)?,
        GuardedBatchOutcome::Applied { .. }
    ) {
        return Ok(());
    }
    let winner = db
        .read_one(ids::MODEL_LEDGER, &claim.key)?
        .ok_or_else(|| AppError::conflict("checkout operation marker disappeared"))?;
    crate::routes::checkout_claim::validate(&winner, &claim.fingerprint)?;
    if parse_result(&winner.payload)? == (session_id.to_string(), session_url.map(str::to_string)) {
        Ok(())
    } else {
        Err(AppError::conflict(
            "checkout operation result changed concurrently",
        ))
    }
}

fn parse_result(value: &Value) -> AppResult<(String, Option<String>)> {
    let result = value
        .get(RESULT_FIELD)
        .filter(|result| result.get("schemaVersion").and_then(Value::as_i64) == Some(1))
        .ok_or_else(|| AppError::internal("completed checkout operation has no result"))?;
    let session_id = result
        .get("sessionId")
        .and_then(Value::as_str)
        .filter(|id| crate::stripe::checkout_provider::validate_session_id(id).is_ok())
        .ok_or_else(|| AppError::internal("completed checkout operation has an invalid session"))?;
    let url = match result.get("url") {
        None | Some(Value::Null) => None,
        Some(Value::String(url))
            if crate::stripe::checkout_provider::validate_checkout_url(url) =>
        {
            Some(url.clone())
        }
        _ => {
            return Err(AppError::internal(
                "completed checkout operation has an invalid URL",
            ))
        }
    };
    Ok((session_id.into(), url))
}
