//! Guarded, monotonic Stripe refund projection.

use serde_json::{json, Value};

use super::webhook_commit::{self, CommitResult};
use super::webhook_effects;
use super::webhook_payment_support::{preserve_ledger_fields, required_amount, required_currency};
use super::{meta, object_str};
use crate::db::{BatchOp, Db, Filter, Op, Query};
use crate::error::{AppError, AppResult};
use crate::guarded_batch::GuardedCondition;
use crate::ids;
use crate::models::LedgerEntry;
use crate::seams::HostSeams;
use crate::time;

#[path = "webhook_refund_rows.rs"]
mod rows;
use rows::{changed_refund_row, ChangedRefundRow};

pub(super) fn refunded<S: HostSeams>(
    _seams: &S,
    db: &Db<'_, S>,
    event_id: &str,
    fingerprint: &str,
    object: &Value,
    event_created: i64,
    now: i64,
) -> AppResult<CommitResult> {
    // A charge's amount_refunded is a cumulative snapshot, not a new refund.
    // Project each identified refund through the same delta path as refund.*.
    // Missing/paginated details cannot safely be turned into a synthetic refund.
    let refunds = object
        .pointer("/refunds/data")
        .and_then(Value::as_array)
        .filter(|rows| !rows.is_empty() && rows.len() <= 29)
        .ok_or_else(|| {
            AppError::conflict("charge refund identities are missing; deliver refund events")
        })?;
    if object.pointer("/refunds/has_more").and_then(Value::as_bool) == Some(true) {
        return Err(AppError::conflict(
            "charge refunds are paginated; deliver refund events",
        ));
    }
    // Validate the entire snapshot before applying any of its members.
    let mut seen = std::collections::BTreeSet::new();
    let mut conditions: Vec<GuardedCondition> = Vec::new();
    let mut ops: Vec<BatchOp> = Vec::new();
    let mut actions = Vec::new();
    for refund in refunds {
        let mut refund = refund.clone();
        let id = object_str(&refund, "id")
            .ok_or_else(|| AppError::forbidden("refund identity missing"))?
            .to_string();
        if !seen.insert(id.clone()) {
            return Err(AppError::forbidden("duplicate charge refund identity"));
        }
        for field in ["payment_intent", "currency"] {
            if !refund[field].is_null() && refund[field] != object[field] {
                return Err(AppError::forbidden("charge refund identity mismatch"));
            }
            refund[field] = object[field].clone();
        }
        refund["charge"] = object["id"].clone();
        refund["metadata"] = object["metadata"].clone();
        let projection = RefundChange::prepare(db, &refund, event_created, now)?;
        if let Some(effect) = &projection.effect {
            actions.extend(webhook_effects::refund_actions(
                &format!("{event_id}:{id}"),
                &refund,
                now,
                effect,
            ));
        }
        for condition in projection.conditions {
            if let Some(previous) = conditions
                .iter()
                .find(|previous| previous.target() == condition.target())
            {
                match (previous, &condition) {
                    (
                        GuardedCondition::Version {
                            expected_version: a,
                            ..
                        },
                        GuardedCondition::Version {
                            expected_version: b,
                            ..
                        },
                    ) if a == b => {}
                    _ => {
                        return Err(AppError::conflict(
                            "refund payment changed during preparation",
                        ))
                    }
                }
            } else {
                conditions.push(condition);
            }
        }
        for op in projection.ops {
            if let Some(previous) = ops
                .iter_mut()
                .find(|previous| previous.target() == op.target())
            {
                match (previous, &op) {
                    (BatchOp::Write { data, .. }, BatchOp::Write { data: incoming, .. })
                        if data["kind"] == "payment" && incoming["kind"] == "payment" =>
                    {
                        let gross = data["grossCents"].as_i64().ok_or_else(|| {
                            AppError::internal("refund payment amount is missing")
                        })?;
                        let total = data["refundCents"]
                            .as_i64()
                            .and_then(|amount| amount.checked_add(projection.delta))
                            .filter(|total| *total >= 0 && *total <= gross)
                            .ok_or_else(|| {
                                AppError::forbidden("charge refunds exceed the payment")
                            })?;
                        data["refundCents"] = json!(total);
                        if total == gross {
                            data["status"] = json!("refunded");
                        } else if data["status"] == "refunded" {
                            data["status"] = json!("succeeded");
                        }
                    }
                    _ => return Err(AppError::conflict("charge refund identities collide")),
                }
            } else {
                ops.push(op);
            }
        }
    }
    // Payment, every refund, event receipt, and effects share one host CAS.
    webhook_commit::commit_with_effects(db, event_id, fingerprint, now, conditions, ops, actions)
}

pub(super) fn changed<S: HostSeams>(
    _seams: &S,
    db: &Db<'_, S>,
    event_id: &str,
    fingerprint: &str,
    object: &Value,
    event_created: i64,
    now: i64,
) -> AppResult<CommitResult> {
    let projection = RefundChange::prepare(db, object, event_created, now)?;
    let actions = projection
        .effect
        .as_ref()
        .map(|effect| webhook_effects::refund_actions(event_id, object, now, effect))
        .unwrap_or_default();
    webhook_commit::commit_with_effects(
        db,
        event_id,
        fingerprint,
        now,
        projection.conditions,
        projection.ops,
        actions,
    )
}

struct RefundChange {
    delta: i64,
    conditions: Vec<GuardedCondition>,
    ops: Vec<BatchOp>,
    effect: Option<webhook_effects::RefundEffect>,
}

impl RefundChange {
    fn prepare<S: HostSeams>(
        db: &Db<'_, S>,
        object: &Value,
        event_created: i64,
        now: i64,
    ) -> AppResult<Self> {
        let refund_id = object_str(object, "id")
            .filter(|id| id.starts_with("re_") && id.len() <= 255)
            .ok_or_else(|| AppError::forbidden("Stripe refund identity is missing or invalid"))?;
        let payment_intent = object_str(object, "payment_intent")
            .ok_or_else(|| AppError::forbidden("Stripe refund payment identity is missing"))?;
        let amount = required_amount(object, "amount")?;
        let currency = required_currency(object)?;
        let status = object_str(object, "status")
            .filter(|status| {
                matches!(
                    *status,
                    "pending" | "requires_action" | "succeeded" | "failed" | "canceled"
                )
            })
            .ok_or_else(|| AppError::forbidden("Stripe refund status is missing or invalid"))?;
        let candidate_reference = meta(object, "reference").unwrap_or(payment_intent);
        let Some(payment_row) = find_payment(db, candidate_reference, payment_intent)? else {
            if meta(object, crate::stripe::CHECKOUT_METADATA_MARKER) == Some("true") {
                return Err(AppError::conflict(
                    "Stripe Checkout payment is not settled yet; retry the refund event",
                ));
            }
            return Ok(Self {
                delta: 0,
                conditions: vec![],
                ops: vec![],
                effect: None,
            });
        };
        let mut payment: LedgerEntry = payment_row.parse()?;
        validate_payment(&payment, payment_intent, amount, &currency)?;

        let mut refund_key = refund_id.to_string();
        let existing_refund = crate::routes::stripe_refund_identity::read(
            db,
            refund_id,
            &payment_row.entry_key,
            payment_intent,
            amount,
            &currency,
        )?;
        if let Some(row) = &existing_refund {
            refund_key = row.entry_key.clone();
        }
        if existing_refund.is_none()
            && db
                .read_one(
                    ids::MODEL_LEDGER,
                    &format!("refund:{}", payment_row.entry_key),
                )?
                .is_some()
        {
            return Err(AppError::conflict(
                "unidentified legacy refund requires provider reconciliation",
            ));
        }
        let previous_status = existing_refund
            .as_ref()
            .and_then(|row| row.payload.get("status"))
            .and_then(Value::as_str)
            .map(str::to_string);
        if existing_refund.as_ref().is_some_and(|row| {
            row.payload
                .get("providerEventCreated")
                .and_then(Value::as_i64)
                .is_some_and(|previous| event_created < previous)
        }) {
            return Ok(Self {
                delta: 0,
                conditions: vec![],
                ops: vec![],
                effect: None,
            });
        }
        // Stripe timestamps have second precision. Terminal states dominate stale
        // intermediate snapshots even when delivery order is reversed within a second.
        if matches!(previous_status.as_deref(), Some("failed" | "canceled"))
            || (previous_status.as_deref() == Some("succeeded")
                && matches!(status, "pending" | "requires_action"))
        {
            return Ok(Self {
                delta: 0,
                conditions: vec![],
                ops: vec![],
                effect: None,
            });
        }
        let was_succeeded = previous_status.as_deref() == Some("succeeded");
        let is_succeeded = status == "succeeded";
        if !was_succeeded && is_succeeded {
            payment.refund_cents = payment
                .refund_cents
                .checked_add(amount)
                .ok_or_else(|| AppError::forbidden("Stripe refund total overflowed"))?;
        } else if was_succeeded && !is_succeeded {
            payment.refund_cents = payment
                .refund_cents
                .checked_sub(amount)
                .filter(|total| *total >= 0)
                .ok_or_else(|| AppError::conflict("Stripe refund reversal is inconsistent"))?;
        }
        if payment.refund_cents > payment.gross_cents {
            return Err(AppError::forbidden(
                "refund amount exceeds the Stripe payment",
            ));
        }
        if payment.refund_cents >= payment.gross_cents {
            payment.status = "refunded".to_string();
        } else if payment.status == "refunded" {
            payment.status = "succeeded".to_string();
        }

        let payment_key = payment_row.entry_key.clone();
        let mut conditions = vec![webhook_commit::version_condition(
            ids::MODEL_LEDGER,
            payment_key.clone(),
            payment_row.version,
        )?];
        let mut ops = vec![BatchOp::Write {
            content_model_id: ids::MODEL_LEDGER,
            entry_key: payment_key.clone(),
            data: preserve_ledger_fields(&payment_row.payload, &payment)?,
        }];
        let refund_row = changed_refund_row(
            object,
            ChangedRefundRow {
                refund_key: &refund_key,
                refund_id,
                reference: &payment_key,
                amount,
                currency: &currency,
                status,
                event_created,
                now,
            },
        );
        match existing_refund {
            Some(row) => conditions.push(webhook_commit::version_condition(
                ids::MODEL_LEDGER,
                refund_key.clone(),
                row.version,
            )?),
            None => conditions.push(GuardedCondition::Absent {
                content_model_id: ids::MODEL_LEDGER,
                entry_key: refund_key.clone(),
            }),
        }
        ops.push(BatchOp::Write {
            content_model_id: ids::MODEL_LEDGER,
            entry_key: refund_key,
            data: refund_row,
        });
        Ok(Self {
            delta: match (was_succeeded, is_succeeded) {
                (false, true) => amount,
                (true, false) => -amount,
                _ => 0,
            },
            conditions,
            ops,
            effect: (!was_succeeded && is_succeeded).then_some(webhook_effects::RefundEffect {
                amount,
                currency,
                reference: payment_key,
                user_id: payment.customer_profile_id,
                product_id: payment.product_id,
            }),
        })
    }
}

pub(super) fn find_payment<S: HostSeams>(
    db: &Db<'_, S>,
    reference: &str,
    payment_intent: &str,
) -> AppResult<Option<crate::db::EntryRecord>> {
    if let Some(row) = db.read_one(ids::MODEL_LEDGER, reference)? {
        return Ok(Some(row));
    }
    let mut rows = db.read(
        ids::MODEL_LEDGER,
        &Query::new()
            .filter(Filter::new("kind", Op::Eq, "payment"))
            .filter(Filter::new("provider", Op::Eq, "stripe"))
            .filter(Filter::new("providerRef", Op::Eq, payment_intent))
            .limit(2),
    )?;
    if rows.len() > 1 {
        return Err(AppError::conflict("Stripe payment identity is not unique"));
    }
    if let Some(row) = rows.pop() {
        return Ok(Some(row));
    }
    checkout_payment(db, payment_intent)
}

/// Canonical reconciliation can record a paid Session before its completion
/// webhook has supplied the PaymentIntent. Resolve that provider-owned mapping
/// so an earlier refund/dispute delivery is not incorrectly acknowledged away.
fn checkout_payment<S: HostSeams>(
    db: &Db<'_, S>,
    payment_intent: &str,
) -> AppResult<Option<crate::db::EntryRecord>> {
    if !payment_intent.starts_with("pi_")
        || payment_intent.len() > 255
        || !payment_intent
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b == b'_')
    {
        return Err(AppError::forbidden("invalid Stripe payment identity"));
    }
    let Some(secret) = db
        .host()
        .secret_get(ids::SECRET_STRIPE_KEY)?
        .filter(|key| !key.is_empty())
    else {
        return Ok(None);
    };
    let fetch = crate::stripe::api::stripe_get(
        &secret,
        &format!("/v1/checkout/sessions?payment_intent={payment_intent}&limit=100"),
    );
    let (status, body) = crate::stripe::api::unwrap_fetch(
        &db.host().http_fetch(&fetch.to_string())?,
    )
    .map_err(|_| AppError::new(502, "provider_unavailable", "cannot resolve Stripe payment"))?;
    let value: Value = serde_json::from_str(&body)
        .map_err(|_| AppError::new(502, "provider_unavailable", "invalid Stripe session list"))?;
    let sessions = value["data"]
        .as_array()
        .filter(|_| status == 200 && value["object"] == "list" && value["has_more"] == false)
        .ok_or_else(|| {
            AppError::new(
                502,
                "provider_unavailable",
                "incomplete Stripe session list",
            )
        })?;
    let mut found = None;
    for session in sessions {
        let id = object_str(session, "id")
            .filter(|id| crate::stripe::checkout_provider::validate_session_id(id).is_ok())
            .ok_or_else(|| AppError::forbidden("invalid Stripe session identity"))?;
        let Some(mut row) = db.read_one(ids::MODEL_LEDGER, id)? else {
            continue;
        };
        let payment: LedgerEntry = row.parse()?;
        if payment.kind != "payment"
            || payment.provider != "stripe"
            || payment.reference != id
            || payment.provider_ref.as_deref() != Some(id)
            || session["payment_intent"] != payment_intent
            || session["mode"] != "payment"
            || session["status"] != "complete"
            || session["payment_status"] != "paid"
            || session["amount_total"].as_i64() != Some(payment.gross_cents)
            || !session["currency"]
                .as_str()
                .is_some_and(|currency| currency.eq_ignore_ascii_case(&payment.currency))
        {
            return Err(AppError::forbidden(
                "Stripe session does not match the local payment",
            ));
        }
        if found.is_some() {
            return Err(AppError::conflict("Stripe payment identity is not unique"));
        }
        row.payload["providerRef"] = json!(payment_intent);
        found = Some(row);
    }
    Ok(found)
}

fn validate_payment(
    payment: &LedgerEntry,
    payment_intent: &str,
    refund_amount: i64,
    currency: &str,
) -> AppResult<()> {
    if payment.kind != "payment"
        || payment.provider != "stripe"
        || payment.provider_ref.as_deref() != Some(payment_intent)
    {
        return Err(AppError::forbidden(
            "refund does not match a Stripe payment",
        ));
    }
    if payment.gross_cents <= 0
        || payment.refund_cents < 0
        || payment.refund_cents > payment.gross_cents
        || !payment.currency.eq_ignore_ascii_case(currency)
        || refund_amount > payment.gross_cents
    {
        return Err(AppError::forbidden("refund amount or currency mismatch"));
    }
    Ok(())
}
