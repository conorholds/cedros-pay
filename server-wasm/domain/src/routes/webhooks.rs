//! `POST /webhook/stripe` — token-authenticated, atomically deduplicated event ingest.
//!
//! The site-generated ingress token in the endpoint URL authenticates the hint
//! and Stripe's authenticated Events API supplies the authoritative payload.
//! Receipts and derived mutations commit atomically before external effects.

use serde_json::{json, Value};

use crate::db::Db;
use crate::error::{AppError, AppResult};
use crate::ids;
use crate::reqresp::{RouteRequest, RouteResponse, RouteSpec};
use crate::routes::matches;
use crate::seams::HostSeams;

#[path = "webhook_authentication.rs"]
mod authentication;

#[path = "webhook_commit.rs"]
mod webhook_commit;
#[path = "webhook_disputes.rs"]
mod webhook_disputes;
#[path = "webhook_effects.rs"]
mod webhook_effects;
#[path = "webhook_payment_support.rs"]
mod webhook_payment_support;
pub(crate) use webhook_payment_support::{preserve_ledger_fields, provider_payment_identity};
#[path = "stripe_reconciliation.rs"]
mod reconciliation;
#[path = "webhook_payments.rs"]
mod webhook_payments;
pub(crate) use reconciliation::run as reconcile_payments;
#[path = "webhook_refunds.rs"]
mod webhook_refunds;
#[path = "webhook_subscriptions.rs"]
mod webhook_subscriptions;

pub const ROUTES: &[RouteSpec] = &[RouteSpec {
    route_id: ids::ROUTE_WEBHOOKS,
    method: "POST",
    path: "/webhook/stripe",
}];

pub fn handle<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    if !matches(req, "POST", "/webhook/stripe") {
        return Err(AppError::not_found("unknown webhook route"));
    }
    let event = authentication::authenticate(seams, req)?;
    let event_id = required_event_id(&event)?;
    if crate::capacity::reconcile::webhook(seams, &event)? {
        return Ok(RouteResponse::json(
            202,
            &json!({"received": true, "reconciliation": "pending"}),
        ));
    }
    let fingerprint = webhook_commit::fingerprint(&event)?;
    let db = Db::new(seams, ids::DB_ACCESS);
    if webhook_commit::preflight(&db, event_id, &fingerprint)? {
        return Ok(duplicate_response());
    }

    let event_type = event.get("type").and_then(Value::as_str).unwrap_or("");
    let event_created = event.get("created").and_then(Value::as_i64);
    let object = event
        .pointer("/data/object")
        .cloned()
        .unwrap_or(Value::Null);
    let now = seams.now_unix_secs();
    let result = match event_type {
        // Checkout owns these PaymentIntents. Its Session event/reconciliation
        // commits the order and inventory; a parallel PI projection must neither
        // grant twice nor retry forever looking for a standalone PI ledger row.
        "payment_intent.succeeded" | "payment_intent.payment_failed"
            if meta(&object, "cedros_pay_operation_id").is_some()
                || meta(&object, "resource").is_some() =>
        {
            webhook_commit::commit(&db, event_id, &fingerprint, now, vec![], vec![])?
        }
        "payment_intent.succeeded" => {
            webhook_payments::succeeded(seams, &db, event_id, &fingerprint, &object, now)?
        }
        "checkout.session.completed" => {
            if object.get("mode").and_then(Value::as_str) == Some("subscription") {
                webhook_subscriptions::session_completed(
                    seams,
                    &db,
                    event_id,
                    &fingerprint,
                    &object,
                    now,
                )?
            } else {
                webhook_payments::session_completed(
                    seams,
                    &db,
                    event_id,
                    &fingerprint,
                    &object,
                    now,
                )?
            }
        }
        "checkout.session.async_payment_succeeded" => {
            webhook_payments::session_completed(seams, &db, event_id, &fingerprint, &object, now)?
        }
        "checkout.session.async_payment_failed" | "checkout.session.expired" => {
            webhook_payments::session_failed(seams, &db, event_id, &fingerprint, &object, now)?
        }
        "payment_intent.payment_failed" => {
            webhook_payments::failed(seams, &db, event_id, &fingerprint, &object, now)?
        }
        "charge.refunded" => webhook_refunds::refunded(
            seams,
            &db,
            event_id,
            &fingerprint,
            &object,
            event_created.unwrap_or(now),
            now,
        )?,
        "refund.created" | "refund.updated" | "refund.failed" | "charge.refund.updated" => {
            webhook_refunds::changed(
                seams,
                &db,
                event_id,
                &fingerprint,
                &object,
                event_created.unwrap_or(now),
                now,
            )?
        }
        "invoice.paid" => {
            webhook_subscriptions::invoice_paid(seams, &db, event_id, &fingerprint, &object, now)?
        }
        "customer.subscription.created" | "customer.subscription.updated" => {
            webhook_subscriptions::lifecycle(
                seams,
                &db,
                event_id,
                &fingerprint,
                &object,
                now,
                webhook_subscriptions::LifecycleEvent {
                    created_at: event_created,
                    deleted: false,
                },
            )?
        }
        "customer.subscription.deleted" => webhook_subscriptions::lifecycle(
            seams,
            &db,
            event_id,
            &fingerprint,
            &object,
            now,
            webhook_subscriptions::LifecycleEvent {
                created_at: event_created,
                deleted: true,
            },
        )?,
        "charge.dispute.created" => webhook_disputes::dispute(
            seams,
            &db,
            event_id,
            &fingerprint,
            &object,
            webhook_disputes::DisputeEvent {
                created_at: event_created.unwrap_or(now),
                processed_at: now,
                crm_event_type: ids::CRM_EVENT_DISPUTE_OPENED,
            },
        )?,
        "charge.dispute.updated" => webhook_disputes::dispute(
            seams,
            &db,
            event_id,
            &fingerprint,
            &object,
            webhook_disputes::DisputeEvent {
                created_at: event_created.unwrap_or(now),
                processed_at: now,
                crm_event_type: ids::CRM_EVENT_DISPUTE_UPDATED,
            },
        )?,
        "charge.dispute.closed" => webhook_disputes::dispute(
            seams,
            &db,
            event_id,
            &fingerprint,
            &object,
            webhook_disputes::DisputeEvent {
                created_at: event_created.unwrap_or(now),
                processed_at: now,
                crm_event_type: ids::CRM_EVENT_DISPUTE_CLOSED,
            },
        )?,
        "charge.dispute.funds_withdrawn" => webhook_disputes::dispute(
            seams,
            &db,
            event_id,
            &fingerprint,
            &object,
            webhook_disputes::DisputeEvent {
                created_at: event_created.unwrap_or(now),
                processed_at: now,
                crm_event_type: ids::CRM_EVENT_CHARGEBACK_OPENED,
            },
        )?,
        _ => webhook_commit::commit(&db, event_id, &fingerprint, now, vec![], vec![])?,
    };
    if result == webhook_commit::CommitResult::Duplicate {
        return Ok(duplicate_response());
    }
    Ok(RouteResponse::ok(&json!({ "received": true })))
}

fn required_event_id(event: &Value) -> AppResult<&str> {
    event
        .get("id")
        .and_then(Value::as_str)
        .filter(|id| !id.trim().is_empty())
        .ok_or_else(|| AppError::bad_request("event is missing id"))
}

fn duplicate_response() -> RouteResponse {
    RouteResponse::ok(&json!({ "received": true, "duplicate": true }))
}

fn meta<'a>(object: &'a Value, key: &str) -> Option<&'a str> {
    object
        .pointer(&format!("/metadata/{key}"))
        .and_then(Value::as_str)
}

fn object_str<'a>(object: &'a Value, key: &str) -> Option<&'a str> {
    object
        .get(key)
        .and_then(Value::as_str)
        .filter(|value| !value.trim().is_empty())
}

#[cfg(test)]
#[path = "webhooks_test_support.rs"]
mod webhooks_test_support;

#[cfg(test)]
#[path = "webhooks_tests.rs"]
mod webhooks_tests;

#[cfg(test)]
#[path = "webhooks_lifecycle_tests.rs"]
mod webhooks_lifecycle_tests;

#[cfg(test)]
#[path = "webhooks_concurrency_tests.rs"]
mod webhooks_concurrency_tests;

#[cfg(test)]
#[path = "webhooks_projection_tests.rs"]
mod webhooks_projection_tests;

#[path = "webhook_canonical_checkout.rs"]
mod webhook_canonical_checkout;

#[cfg(test)]
#[path = "webhooks_canonical_checkout_tests.rs"]
mod webhooks_canonical_checkout_tests;

#[cfg(test)]
#[path = "webhooks_authentication_tests.rs"]
mod webhooks_authentication_tests;
