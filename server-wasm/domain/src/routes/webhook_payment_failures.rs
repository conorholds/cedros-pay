//! Monotonic projection and durable-effect planning for failed PaymentIntents.

use serde_json::Value;

use super::super::webhook_commit::{self, CommitResult};
use super::super::webhook_effects;
use super::super::webhook_payment_support::{
    failed_entry, normalized_currency, required_amount, required_currency, validate_checkout_match,
    PaymentProjection, ProviderPaymentIdentity,
};
use super::super::{meta, object_str};
use super::{commit_payment, WebhookReceipt};
use crate::crm_events;
use crate::db::{Db, EntryRecord};
use crate::error::{AppError, AppResult};
use crate::ids;
use crate::models::LedgerEntry;
use crate::routes::analytics_events;
use crate::seams::HostSeams;

pub(in crate::routes::webhooks) fn failed<S: HostSeams>(
    _seams: &S,
    db: &Db<'_, S>,
    event_id: &str,
    fingerprint: &str,
    object: &Value,
    now: i64,
) -> AppResult<CommitResult> {
    let projection = projection(db, object, now)?;
    let actions = projection
        .as_ref()
        .filter(|(_, projection)| projection.emit_effects)
        .map(|_| effect_actions(event_id, object, now))
        .unwrap_or_default();
    match &projection {
        Some((row, projection)) => commit_payment(
            db,
            WebhookReceipt {
                event_id,
                fingerprint,
                now,
            },
            row,
            projection,
            ProviderPaymentIdentity {
                conditions: Vec::new(),
                ops: Vec::new(),
            },
            actions,
        ),
        None => webhook_commit::commit_with_effects(
            db,
            event_id,
            fingerprint,
            now,
            vec![],
            vec![],
            actions,
        ),
    }
}

fn projection<S: HostSeams>(
    db: &Db<'_, S>,
    object: &Value,
    now: i64,
) -> AppResult<Option<(EntryRecord, PaymentProjection)>> {
    let Some(reference) = meta(object, "reference") else {
        if meta(object, crate::stripe::CHECKOUT_METADATA_MARKER) == Some("true") {
            return Err(AppError::conflict(
                "Cedros Stripe payment correlation is missing; retry the event",
            ));
        }
        return Ok(None);
    };
    let Some(row) = db.read_one(ids::MODEL_LEDGER, reference)? else {
        if meta(object, crate::stripe::CHECKOUT_METADATA_MARKER) == Some("true") {
            return Err(AppError::conflict(
                "Cedros Stripe payment is not recorded yet; retry the event",
            ));
        }
        return Ok(None);
    };
    let existing: LedgerEntry = row.parse()?;
    let amount = required_amount(object, "amount")?;
    let currency = required_currency(object)?;
    let provider_ref = object_str(object, "id")
        .ok_or_else(|| crate::error::AppError::forbidden("Stripe payment identity is missing"))?;
    validate_checkout_match(&existing, Some(provider_ref), amount, &currency)?;
    Ok(Some((row, failed_entry(existing, now)?)))
}

fn effect_actions(event_id: &str, object: &Value, now: i64) -> Vec<crate::durable_effects::Action> {
    let cause = object
        .pointer("/last_payment_error/code")
        .and_then(Value::as_str)
        .unwrap_or("unknown");
    let amount = object.get("amount").and_then(Value::as_i64).unwrap_or(0);
    let currency = normalized_currency(object);
    let mut actions = Vec::new();
    if let Some(profile_id) = meta(object, "profileId") {
        actions.push(webhook_effects::tag_action(profile_id, ids::TAG_AT_RISK));
    }
    let cause_code = redacted_failure_cause(cause);
    actions.push(analytics_events::payment_failed_action(
        "stripe", "checkout", amount, &currency, cause_code, now,
    ));
    if let Some(action) =
        crm_events::payment_failed_action(event_id, object, amount, &currency, now, cause_code)
    {
        actions.push(action);
    }
    actions
}

fn redacted_failure_cause(cause: &str) -> &'static str {
    match cause {
        "permission_denied" => "permission_denied",
        "provider_unavailable" => "provider_unavailable",
        "retryable_downstream_failed" => "retryable_downstream_failed",
        "validation_failed" => "validation_failed",
        _ => "downstream_failed",
    }
}
