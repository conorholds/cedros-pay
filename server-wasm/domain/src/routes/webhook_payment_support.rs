//! Shared preparation and post-commit helpers for Stripe payment projections.

use serde::Serialize;
use serde_json::Value;
use sha2::{Digest, Sha256};

use crate::db::{BatchOp, Db, Filter, Op, Query};
use crate::error::{AppError, AppResult};
use crate::guarded_batch::GuardedCondition;
use crate::ids;
use crate::models::LedgerEntry;
use crate::money;
use crate::seams::HostSeams;
use crate::time;

pub(super) struct PaymentProjection {
    pub(super) entry: LedgerEntry,
    pub(super) changed: bool,
    pub(super) emit_effects: bool,
}

pub(crate) struct ProviderPaymentIdentity {
    pub(crate) conditions: Vec<GuardedCondition>,
    pub(crate) ops: Vec<BatchOp>,
}

/// Claims one Stripe PaymentIntent for exactly one Pay ledger payment. The
/// marker lives outside the ledger so aggregate ledger reads cannot count it,
/// but commits atomically with settlement and the inbound-event receipt.
pub(crate) fn provider_payment_identity<S: HostSeams>(
    db: &Db<'_, S>,
    provider_ref: &str,
    reference: &str,
    amount: i64,
    currency: &str,
) -> AppResult<ProviderPaymentIdentity> {
    if !valid_payment_intent(provider_ref) || reference.trim().is_empty() || amount <= 0 {
        return Err(AppError::forbidden(
            "Stripe payment identity is missing or invalid",
        ));
    }
    let key = format!(
        "provider-payment:stripe:{}",
        hex::encode(Sha256::digest(provider_ref.as_bytes()))
    );
    let expected = serde_json::json!({
        "schemaVersion": 1,
        "kind": "providerPaymentIdentity",
        "provider": "stripe",
        "providerRef": provider_ref,
        "reference": reference,
        "amountCents": amount,
        "currency": currency,
    });
    if let Some(row) = db.read_one(ids::MODEL_WEBHOOK_OUTBOX, &key)? {
        if row.payload != expected {
            return Err(AppError::conflict(
                "Stripe payment identity is already bound to another payment",
            ));
        }
        return Ok(ProviderPaymentIdentity {
            conditions: Vec::new(),
            ops: Vec::new(),
        });
    }
    // Markers were introduced after ledger settlement existed. Before claiming
    // an unmarked identity, reconcile against legacy terminal rows so an older
    // successful payment cannot be credited again under a new Pay reference.
    for status in ["succeeded", "refunded"] {
        let rows = db.read(
            ids::MODEL_LEDGER,
            &Query::new()
                .filter(Filter::new("provider", Op::Eq, "stripe"))
                .filter(Filter::new("providerRef", Op::Eq, provider_ref))
                .filter(Filter::new("kind", Op::Eq, "payment"))
                .filter(Filter::new("status", Op::Eq, status)),
        )?;
        for row in rows {
            let payment: LedgerEntry = row.parse()?;
            if row.entry_key != reference
                || payment.reference != reference
                || payment.gross_cents != amount
                || payment.currency != currency
            {
                return Err(AppError::conflict(
                    "Stripe payment identity is already bound to another payment",
                ));
            }
        }
    }
    Ok(ProviderPaymentIdentity {
        conditions: vec![GuardedCondition::Absent {
            content_model_id: ids::MODEL_WEBHOOK_OUTBOX,
            entry_key: key.clone(),
        }],
        ops: vec![BatchOp::Write {
            content_model_id: ids::MODEL_WEBHOOK_OUTBOX,
            entry_key: key,
            data: expected,
        }],
    })
}

fn valid_payment_intent(value: &str) -> bool {
    value.starts_with("pi_")
        && value.len() > 3
        && value.len() <= 255
        && value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'_' | b'-'))
}

pub(super) fn settled_entry(
    mut existing: LedgerEntry,
    provider_ref: Option<String>,
    profile: Option<String>,
    now: i64,
) -> AppResult<PaymentProjection> {
    if existing.status == "refunded" {
        return Ok(unchanged(existing));
    }
    // payment_intent.payment_failed describes a failed confirmation attempt,
    // not a terminal PaymentIntent. The same intent can be retried and later
    // succeed, so success must monotonically win over that provisional state.
    let emit_effects = matches!(
        existing.status.as_str(),
        "initiating" | "pending" | "failed"
    );
    if !emit_effects && existing.status != "succeeded" {
        return Err(AppError::forbidden("payment state cannot be settled"));
    }
    let next_profile = existing.customer_profile_id.clone().or(profile);
    let changed = existing.status != "succeeded"
        || existing.provider_ref != provider_ref
        || existing.customer_profile_id != next_profile;
    existing.status = "succeeded".to_string();
    existing.provider_ref = provider_ref;
    existing.customer_profile_id = next_profile;
    if changed {
        existing.processed_at = time::iso8601(now);
    }
    Ok(PaymentProjection {
        entry: existing,
        changed,
        emit_effects,
    })
}

pub(super) fn failed_entry(mut existing: LedgerEntry, now: i64) -> AppResult<PaymentProjection> {
    match existing.status.as_str() {
        "initiating" | "pending" => {
            existing.status = "failed".to_string();
            existing.processed_at = time::iso8601(now);
            Ok(PaymentProjection {
                entry: existing,
                changed: true,
                emit_effects: true,
            })
        }
        "failed" | "succeeded" | "refunded" => Ok(unchanged(existing)),
        _ => Err(AppError::forbidden("payment state cannot be failed")),
    }
}

fn unchanged(entry: LedgerEntry) -> PaymentProjection {
    PaymentProjection {
        entry,
        changed: false,
        emit_effects: false,
    }
}

pub(super) fn validate_checkout_match(
    existing: &LedgerEntry,
    provider_ref: Option<&str>,
    amount: i64,
    currency: &str,
) -> AppResult<()> {
    validate_payment_facts(existing, amount, currency)?;
    if existing.provider_ref.as_deref() != provider_ref {
        return Err(AppError::forbidden("payment provider reference mismatch"));
    }
    Ok(())
}

pub(super) fn validate_session_match(
    existing: &LedgerEntry,
    session_id: &str,
    payment_intent: Option<&str>,
    amount: i64,
    currency: &str,
) -> AppResult<()> {
    validate_payment_facts(existing, amount, currency)?;
    if existing.reference != session_id
        || !matches!(
            existing.provider_ref.as_deref(),
            Some(reference) if reference == session_id || Some(reference) == payment_intent
        )
    {
        return Err(AppError::forbidden(
            "checkout session provider reference mismatch",
        ));
    }
    Ok(())
}

fn validate_payment_facts(existing: &LedgerEntry, amount: i64, currency: &str) -> AppResult<()> {
    if existing.kind != "payment" || existing.provider != "stripe" {
        return Err(AppError::forbidden("payment is not a Stripe checkout"));
    }
    if existing.gross_cents != amount || existing.currency != currency {
        return Err(AppError::forbidden("payment amount or currency mismatch"));
    }
    Ok(())
}

pub(crate) fn preserve_ledger_fields(original: &Value, entry: &LedgerEntry) -> AppResult<Value> {
    let mut preserved = original
        .as_object()
        .cloned()
        .ok_or_else(|| AppError::internal("stored payment is not a JSON object"))?;
    let encoded = encode(entry)?;
    let fields = encoded
        .as_object()
        .ok_or_else(|| AppError::internal("encoded payment is not a JSON object"))?;
    preserved.extend(fields.clone());
    Ok(Value::Object(preserved))
}

pub(super) fn normalized_currency(object: &Value) -> String {
    money::normalize_currency(
        object
            .get("currency")
            .and_then(Value::as_str)
            .unwrap_or("usd"),
    )
}

pub(super) fn required_amount(object: &Value, field: &str) -> AppResult<i64> {
    object
        .get(field)
        .and_then(Value::as_i64)
        .filter(|amount| *amount > 0)
        .ok_or_else(|| AppError::forbidden("Stripe payment amount is missing or invalid"))
}

pub(super) fn required_currency(object: &Value) -> AppResult<String> {
    let currency = object
        .get("currency")
        .and_then(Value::as_str)
        .filter(|currency| !currency.trim().is_empty())
        .ok_or_else(|| AppError::forbidden("Stripe payment currency is missing"))?;
    let normalized = currency.trim().to_ascii_uppercase();
    if normalized.len() != 3 || !normalized.bytes().all(|byte| byte.is_ascii_alphabetic()) {
        return Err(AppError::forbidden("Stripe payment currency is invalid"));
    }
    Ok(normalized)
}

pub(super) fn encode<T: Serialize>(value: &T) -> AppResult<Value> {
    serde_json::to_value(value).map_err(|error| {
        AppError::internal("cannot encode Stripe webhook projection")
            .with_internal(error.to_string())
    })
}
