use serde_json::Value;

use super::webhook_commit::{self, CommitResult};
use super::{meta, object_str};
use crate::crm_events;
use crate::db::{BatchOp, Db};
use crate::error::{AppError, AppResult};
use crate::guarded_batch::GuardedCondition;
use crate::ids;
use crate::models::SubscriptionRecord;
use crate::routes::{analytics_events, entitlements};
use crate::seams::HostSeams;
use crate::time;

#[path = "webhook_subscription_invoices.rs"]
mod invoices;
pub(super) use invoices::invoice_paid;

pub(super) struct LifecycleEvent {
    pub(super) created_at: Option<i64>,
    pub(super) deleted: bool,
}

pub(super) fn session_completed<S: HostSeams>(
    _seams: &S,
    db: &Db<'_, S>,
    event_id: &str,
    fingerprint: &str,
    object: &Value,
    now: i64,
) -> AppResult<CommitResult> {
    let Some(subscription_id) = object_str(object, "subscription") else {
        return webhook_commit::commit(db, event_id, fingerprint, now, vec![], vec![]);
    };
    if db
        .read_one(ids::MODEL_SUBSCRIPTIONS, subscription_id)?
        .is_some()
    {
        return webhook_commit::commit(db, event_id, fingerprint, now, vec![], vec![]);
    }
    let Some((customer_ref, price_id)) = trusted_selection(object) else {
        return webhook_commit::commit(db, event_id, fingerprint, now, vec![], vec![]);
    };
    let record = SubscriptionRecord {
        subscription_id: subscription_id.to_string(),
        customer_ref,
        stripe_customer_id: object_str(object, "customer").map(str::to_string),
        price_id,
        status: "incomplete".to_string(),
        provider: "stripe".to_string(),
        provider_ref: Some(subscription_id.to_string()),
        current_period_end: None,
        cancel_at_period_end: false,
        last_provider_event_at: None,
        created_at: time::iso8601(now),
        updated_at: time::iso8601(now),
    };
    webhook_commit::commit(
        db,
        event_id,
        fingerprint,
        now,
        vec![GuardedCondition::Absent {
            content_model_id: ids::MODEL_SUBSCRIPTIONS,
            entry_key: subscription_id.to_string(),
        }],
        vec![subscription_write(subscription_id, &record, None)?],
    )
}

pub(super) fn lifecycle<S: HostSeams>(
    _seams: &S,
    db: &Db<'_, S>,
    event_id: &str,
    fingerprint: &str,
    object: &Value,
    now: i64,
    event: LifecycleEvent,
) -> AppResult<CommitResult> {
    let LifecycleEvent {
        created_at: event_created,
        deleted,
    } = event;
    let Some(subscription_id) = object_str(object, "id") else {
        return webhook_commit::commit(db, event_id, fingerprint, now, vec![], vec![]);
    };
    let existing = db.read_one(ids::MODEL_SUBSCRIPTIONS, subscription_id)?;
    let previous_payload = existing.as_ref().map(|row| row.payload.clone());
    let (mut record, condition, previous) = match existing {
        Some(row) => {
            let record: SubscriptionRecord = row.parse()?;
            let previous = Some(record.clone());
            let condition = webhook_commit::version_condition(
                ids::MODEL_SUBSCRIPTIONS,
                subscription_id.to_string(),
                row.version,
            )?;
            (record, condition, previous)
        }
        None => {
            let Some((customer_ref, price_id)) = trusted_selection(object) else {
                return webhook_commit::commit(db, event_id, fingerprint, now, vec![], vec![]);
            };
            (
                SubscriptionRecord {
                    subscription_id: subscription_id.to_string(),
                    customer_ref,
                    stripe_customer_id: object_str(object, "customer").map(str::to_string),
                    price_id,
                    status: "incomplete".to_string(),
                    provider: "stripe".to_string(),
                    provider_ref: Some(subscription_id.to_string()),
                    current_period_end: None,
                    cancel_at_period_end: false,
                    last_provider_event_at: None,
                    created_at: time::iso8601(now),
                    updated_at: time::iso8601(now),
                },
                GuardedCondition::Absent {
                    content_model_id: ids::MODEL_SUBSCRIPTIONS,
                    entry_key: subscription_id.to_string(),
                },
                None,
            )
        }
    };

    let incoming_status = if deleted {
        "canceled"
    } else {
        object_str(object, "status").unwrap_or("incomplete")
    };
    let Some(event_created) = event_created else {
        return webhook_commit::commit(db, event_id, fingerprint, now, vec![], vec![]);
    };
    let restores_access = !entitled_status(&record.status) && entitled_status(incoming_status);
    if record
        .last_provider_event_at
        .is_some_and(|last| event_created < last || (event_created == last && restores_access))
    {
        return webhook_commit::commit(db, event_id, fingerprint, now, vec![], vec![]);
    }
    if terminal_status(&record.status) && !terminal_status(incoming_status) {
        return webhook_commit::commit(db, event_id, fingerprint, now, vec![], vec![]);
    }
    let price = crate::stripe::api::subscription_price_id(object).map_err(AppError::forbidden)?;
    let period = subscription_period_end(object)
        .filter(|end| *end > 0)
        .map(time::iso8601);
    if record.last_provider_event_at == Some(event_created)
        && entitled_status(incoming_status)
        && (price
            .as_ref()
            .is_some_and(|price| price != &record.price_id)
            || period != record.current_period_end)
    {
        // Stripe timestamps have second precision, not a total order. A later
        // provider read resolves conflicting access-bearing snapshots safely.
        return webhook_commit::commit(db, event_id, fingerprint, now, vec![], vec![]);
    }
    if let Some(customer) = object_str(object, "customer") {
        if !crate::stripe::api::valid_customer_id(customer)
            || (crate::stripe::api::valid_customer_id(record.stripe_customer())
                && record.stripe_customer() != customer)
        {
            return Err(AppError::conflict("Stripe subscription customer changed"));
        }
        record.stripe_customer_id = Some(customer.to_string());
    }
    if let Some(price_id) = price {
        record.price_id = price_id;
    }
    record.status = incoming_status.to_string();
    record.cancel_at_period_end = deleted
        || object
            .get("cancel_at_period_end")
            .and_then(Value::as_bool)
            .unwrap_or(false);
    record.current_period_end = subscription_period_end(object)
        .filter(|end| *end > 0)
        .map(time::iso8601);
    record.last_provider_event_at = Some(event_created);
    record.updated_at = time::iso8601(now);

    let effect = lifecycle_effect(previous.as_ref(), &record, now);
    let login_user_id = trusted_selection(object)
        .filter(|(user_id, _)| user_id == &record.customer_ref)
        .map(|(user_id, _)| user_id);
    let actions = lifecycle_actions(event_id, &record, now, effect, login_user_id.as_deref());
    webhook_commit::commit_with_effects(
        db,
        event_id,
        fingerprint,
        now,
        vec![condition],
        vec![subscription_write(
            subscription_id,
            &record,
            previous_payload.as_ref(),
        )?],
        actions,
    )
}

#[derive(Clone, Copy)]
enum LifecycleEffect {
    None,
    Started,
    AccessChanged,
    Canceled,
}

fn lifecycle_effect(
    previous: Option<&SubscriptionRecord>,
    current: &SubscriptionRecord,
    now: i64,
) -> LifecycleEffect {
    let was_entitled = previous.is_some_and(|record| entitled_record(record, now));
    let is_entitled = entitled_record(current, now);
    let terms_changed = previous.is_some_and(|record| {
        record.price_id != current.price_id
            || record.current_period_end != current.current_period_end
            || record.cancel_at_period_end != current.cancel_at_period_end
    });
    if was_entitled && is_entitled && terms_changed {
        LifecycleEffect::AccessChanged
    } else if !was_entitled && is_entitled {
        if previous.is_none_or(|record| record.status == "incomplete") {
            LifecycleEffect::Started
        } else {
            LifecycleEffect::AccessChanged
        }
    } else if was_entitled && terminal_status(&current.status) {
        LifecycleEffect::Canceled
    } else if was_entitled != is_entitled {
        LifecycleEffect::AccessChanged
    } else {
        LifecycleEffect::None
    }
}

fn lifecycle_actions(
    event_id: &str,
    record: &SubscriptionRecord,
    now: i64,
    effect: LifecycleEffect,
    login_user_id: Option<&str>,
) -> Vec<crate::durable_effects::Action> {
    let mut actions = Vec::new();
    let reason = match effect {
        LifecycleEffect::Started => {
            if let Some(action) = crm_events::subscription_created_action(
                event_id,
                &record.customer_ref,
                &record.subscription_id,
                &record.price_id,
                now,
                login_user_id,
            ) {
                actions.push(action);
            }
            actions.push(analytics_events::subscription_started_action(
                "stripe",
                &record.price_id,
                &record.status,
                now,
            ));
            "subscription_created"
        }
        LifecycleEffect::Canceled => {
            if let Some(action) = crm_events::subscription_canceled_action(
                event_id,
                &record.customer_ref,
                &record.subscription_id,
                &record.price_id,
                now,
            ) {
                actions.push(action);
            }
            actions.push(analytics_events::subscription_canceled_action(
                "stripe",
                &record.price_id,
                &record.status,
                now,
            ));
            "subscription_canceled"
        }
        LifecycleEffect::AccessChanged => "subscription_status_changed",
        LifecycleEffect::None => return actions,
    };
    actions.push(entitlements::changed_action(
        reason,
        Some(&record.customer_ref),
        Some(&record.price_id),
        Some(&record.subscription_id),
        Some(event_id),
        now,
    ));
    actions
}

fn trusted_selection(object: &Value) -> Option<(String, String)> {
    if meta(object, "user_id_trusted") != Some("true") {
        return None;
    }
    Some((
        meta(object, "user_id")?.trim().to_string(),
        meta(object, "plan_id")?.trim().to_string(),
    ))
    .filter(|(user_id, plan_id)| !user_id.is_empty() && !plan_id.is_empty())
}

fn subscription_write(
    subscription_id: &str,
    record: &SubscriptionRecord,
    previous: Option<&Value>,
) -> AppResult<BatchOp> {
    let fields = serde_json::to_value(record).map_err(|error| {
        AppError::internal("cannot encode subscription projection").with_internal(error.to_string())
    })?;
    let mut data = previous.cloned().unwrap_or_else(|| serde_json::json!({}));
    for (key, value) in fields
        .as_object()
        .ok_or_else(|| AppError::internal("invalid subscription projection"))?
    {
        data[key] = value.clone();
    }
    // Omitted optional fields must clear obsolete access evidence.
    if record.current_period_end.is_none() {
        data.as_object_mut()
            .ok_or_else(|| AppError::internal("invalid subscription projection"))?
            .remove("currentPeriodEnd");
    }
    Ok(BatchOp::Write {
        content_model_id: ids::MODEL_SUBSCRIPTIONS,
        entry_key: subscription_id.to_string(),
        data,
    })
}

fn entitled_record(record: &SubscriptionRecord, now: i64) -> bool {
    entitled_status(&record.status)
        && record
            .current_period_end
            .as_deref()
            .and_then(time::parse_iso)
            .is_some_and(|period_end| period_end > now)
}

fn entitled_status(status: &str) -> bool {
    matches!(status, "active" | "trialing")
}

fn terminal_status(status: &str) -> bool {
    matches!(
        status,
        "canceled" | "expired" | "ended" | "incomplete_expired"
    )
}

fn subscription_period_end(object: &Value) -> Option<i64> {
    object
        .get("current_period_end")
        .and_then(Value::as_i64)
        .or_else(|| {
            object
                .pointer("/items/data/0/current_period_end")
                .and_then(Value::as_i64)
        })
}
