//! Guarded Stripe payment, failure, checkout-session, and refund projections.
use serde_json::Value;

use super::webhook_commit::{self, CommitResult};
use super::webhook_payment_support::{
    failed_entry, preserve_ledger_fields, provider_payment_identity, required_amount,
    required_currency, settled_entry, validate_checkout_match, validate_session_match,
    PaymentProjection, ProviderPaymentIdentity,
};
use super::{meta, object_str};
use crate::db::Db;
use crate::error::{AppError, AppResult};
use crate::ids;
use crate::models::LedgerEntry;
use crate::seams::HostSeams;

#[path = "webhook_payment_effects.rs"]
mod effects;
use effects::{purchase_actions, PurchaseEffect};
#[path = "webhook_payment_failures.rs"]
mod failures;
pub(super) use failures::failed;

struct WebhookReceipt<'a> {
    event_id: &'a str,
    fingerprint: &'a str,
    now: i64,
}

pub(super) fn succeeded<S: HostSeams>(
    seams: &S,
    db: &Db<'_, S>,
    event_id: &str,
    fingerprint: &str,
    object: &Value,
    now: i64,
) -> AppResult<CommitResult> {
    let reference = meta(object, "reference")
        .or_else(|| object_str(object, "id"))
        .unwrap_or(event_id)
        .to_string();
    let amount = required_amount(object, "amount")?;
    if object_str(object, "status") != Some("succeeded")
        || required_amount(object, "amount_received")? != amount
    {
        return Err(AppError::forbidden(
            "Stripe PaymentIntent is not fully paid",
        ));
    }
    let currency = required_currency(object)?;
    let provider_ref = object_str(object, "id")
        .ok_or_else(|| AppError::forbidden("Stripe payment identity is missing"))?
        .to_string();
    let Some(row) = db.read_one(ids::MODEL_LEDGER, &reference)? else {
        if meta(object, crate::stripe::CHECKOUT_METADATA_MARKER) == Some("true") {
            return Err(AppError::conflict(
                "Cedros Stripe payment is not recorded yet; retry the event",
            ));
        }
        return webhook_commit::commit(db, event_id, fingerprint, now, vec![], vec![]);
    };
    let existing: LedgerEntry = row.parse()?;
    let profile = existing.customer_profile_id.clone();
    validate_checkout_match(&existing, Some(&provider_ref), amount, &currency)?;
    let projection = settled_entry(existing, Some(provider_ref.clone()), profile.clone(), now)?;
    let identity = provider_payment_identity(db, &provider_ref, &reference, amount, &currency)?;
    let actions = if projection.emit_effects {
        purchase_actions(
            seams,
            db,
            PurchaseEffect {
                event_id,
                object,
                reference: &reference,
                entry: &projection.entry,
                profile,
                now,
            },
        )?
    } else {
        Vec::new()
    };
    commit_payment(
        db,
        WebhookReceipt {
            event_id,
            fingerprint,
            now,
        },
        &row,
        &projection,
        identity,
        actions,
    )
}

pub(super) fn session_completed<S: HostSeams>(
    seams: &S,
    db: &Db<'_, S>,
    event_id: &str,
    fingerprint: &str,
    object: &Value,
    now: i64,
) -> AppResult<CommitResult> {
    // A completed Checkout Session can still be awaiting a delayed payment.
    // Stripe's authoritative fulfillment signal is payment_status=paid, not
    // the browser return and not completion alone.
    if object_str(object, "mode") != Some("payment")
        || object_str(object, "status") != Some("complete")
        || object_str(object, "payment_status") != Some("paid")
    {
        return webhook_commit::commit(db, event_id, fingerprint, now, vec![], vec![]);
    }
    let session_id = object_str(object, "id").unwrap_or(event_id).to_string();
    let Some(row) =
        super::webhook_canonical_checkout::ensure_ledger(seams, db, object, &session_id)?
    else {
        if meta(object, crate::stripe::CHECKOUT_METADATA_MARKER) == Some("true") {
            return Err(AppError::conflict(
                "Cedros Stripe session is not recorded yet; retry the event",
            ));
        }
        return webhook_commit::commit(db, event_id, fingerprint, now, vec![], vec![]);
    };
    let existing: LedgerEntry = row.parse()?;
    let amount = required_amount(object, "amount_total")?;
    let currency = required_currency(object)?;
    let profile = existing.customer_profile_id.clone();
    let provider_ref = object_str(object, "payment_intent")
        .ok_or_else(|| AppError::forbidden("checkout session payment identity is missing"))?
        .to_string();
    validate_session_match(
        &existing,
        &session_id,
        Some(&provider_ref),
        amount,
        &currency,
    )?;
    let projection = settled_entry(existing, Some(provider_ref.clone()), profile.clone(), now)?;
    let identity = provider_payment_identity(db, &provider_ref, &session_id, amount, &currency)?;
    let actions = if projection.emit_effects {
        purchase_actions(
            seams,
            db,
            PurchaseEffect {
                event_id,
                object,
                reference: &session_id,
                entry: &projection.entry,
                profile,
                now,
            },
        )?
    } else {
        Vec::new()
    };
    commit_session(
        db,
        WebhookReceipt {
            event_id,
            fingerprint,
            now,
        },
        object,
        &row,
        &projection,
        identity,
        actions,
    )
}

pub(super) fn session_failed<S: HostSeams>(
    seams: &S,
    db: &Db<'_, S>,
    event_id: &str,
    fingerprint: &str,
    object: &Value,
    now: i64,
) -> AppResult<CommitResult> {
    let session_status = object_str(object, "status");
    let terminal_session = object_str(object, "mode") == Some("payment")
        && object_str(object, "payment_status") == Some("unpaid")
        && matches!(session_status, Some("complete" | "expired"));
    if !terminal_session {
        return webhook_commit::commit(db, event_id, fingerprint, now, vec![], vec![]);
    }
    let session_id = object_str(object, "id")
        .ok_or_else(|| AppError::forbidden("checkout session identity is missing"))?;
    let amount = required_amount(object, "amount_total")?;
    let currency = required_currency(object)?;
    let operation_id = meta(object, "cedros_pay_operation_id");
    if let Some(operation_id) = operation_id {
        crate::checkout_contract::terminal_stripe_webhook(
            seams,
            operation_id,
            session_id,
            amount,
            &currency,
            if session_status == Some("expired") {
                crate::checkout_contract::StripeSessionTerminal::Expired
            } else {
                crate::checkout_contract::StripeSessionTerminal::PaymentFailed
            },
        )?;
    }
    let Some(row) = db.read_one(ids::MODEL_LEDGER, session_id)? else {
        if operation_id.is_none()
            && meta(object, crate::stripe::CHECKOUT_METADATA_MARKER) == Some("true")
        {
            return Err(AppError::conflict(
                "Cedros Stripe session is not recorded yet; retry the event",
            ));
        }
        return webhook_commit::commit(db, event_id, fingerprint, now, vec![], vec![]);
    };
    let existing: LedgerEntry = row.parse()?;
    validate_session_match(
        &existing,
        session_id,
        object_str(object, "payment_intent"),
        amount,
        &currency,
    )?;
    let projection = failed_entry(existing, now)?;
    commit_session(
        db,
        WebhookReceipt {
            event_id,
            fingerprint,
            now,
        },
        object,
        &row,
        &projection,
        ProviderPaymentIdentity {
            conditions: Vec::new(),
            ops: Vec::new(),
        },
        Vec::new(),
    )
}

fn commit_payment<S: HostSeams>(
    db: &Db<'_, S>,
    receipt: WebhookReceipt<'_>,
    row: &crate::db::EntryRecord,
    projection: &PaymentProjection,
    mut identity: ProviderPaymentIdentity,
    actions: Vec<crate::durable_effects::Action>,
) -> AppResult<CommitResult> {
    if projection.changed {
        identity.conditions.push(webhook_commit::version_condition(
            ids::MODEL_LEDGER,
            row.entry_key.clone(),
            row.version.clone(),
        )?);
        identity.ops.push(crate::db::BatchOp::Write {
            content_model_id: ids::MODEL_LEDGER,
            entry_key: row.entry_key.clone(),
            data: preserve_ledger_fields(&row.payload, &projection.entry)?,
        });
    }
    webhook_commit::commit_with_effects(
        db,
        receipt.event_id,
        receipt.fingerprint,
        receipt.now,
        identity.conditions,
        identity.ops,
        actions,
    )
}

fn commit_session<S: HostSeams>(
    db: &Db<'_, S>,
    receipt: WebhookReceipt<'_>,
    object: &Value,
    row: &crate::db::EntryRecord,
    projection: &PaymentProjection,
    identity: ProviderPaymentIdentity,
    actions: Vec<crate::durable_effects::Action>,
) -> AppResult<CommitResult> {
    let mut conditions = identity.conditions;
    let mut ops = identity.ops;
    if projection.changed {
        conditions.push(webhook_commit::version_condition(
            ids::MODEL_LEDGER,
            row.entry_key.clone(),
            row.version.clone(),
        )?);
        ops.push(crate::db::BatchOp::Write {
            content_model_id: ids::MODEL_LEDGER,
            entry_key: row.entry_key.clone(),
            data: preserve_ledger_fields(&row.payload, &projection.entry)?,
        });
    }
    append_cart_transition(db, object, row, projection, &mut conditions, &mut ops)?;
    webhook_commit::commit_with_effects(
        db,
        receipt.event_id,
        receipt.fingerprint,
        receipt.now,
        conditions,
        ops,
        actions,
    )
}

fn append_cart_transition<S: HostSeams>(
    db: &Db<'_, S>,
    object: &Value,
    row: &crate::db::EntryRecord,
    projection: &PaymentProjection,
    conditions: &mut Vec<crate::guarded_batch::GuardedCondition>,
    ops: &mut Vec<crate::db::BatchOp>,
) -> AppResult<()> {
    let Some(cart_id) = projection
        .entry
        .product_id
        .as_deref()
        .and_then(|resource| resource.strip_prefix("cart:"))
    else {
        return Ok(());
    };
    if meta(object, "resource") != projection.entry.product_id.as_deref() {
        return Err(AppError::forbidden(
            "checkout session cart identity mismatch",
        ));
    }
    let checkout_fingerprint = crate::routes::checkout_claim::stored_fingerprint(row)?;
    let mutation = if projection.entry.status == "failed" {
        crate::routes::cart_settlement::webhook_failure(
            db,
            cart_id,
            &row.entry_key,
            checkout_fingerprint,
        )?
    } else {
        crate::routes::cart_settlement::webhook_completion(
            db,
            cart_id,
            &row.entry_key,
            checkout_fingerprint,
        )?
    };
    if let Some(mutation) = mutation {
        conditions.push(mutation.condition);
        ops.push(mutation.op);
    }
    Ok(())
}
