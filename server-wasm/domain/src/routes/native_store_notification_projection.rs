//! Native-store notification state transitions and replay markers.

use serde_json::{json, Value};

use super::notification_commit::{
    append_write, Effect, LedgerRefund, NativeNotification, Plan, SubscriptionAction,
};
use super::notification_marker::TargetState;
use crate::db::{BatchOp, EntryRecord};
use crate::error::{AppError, AppResult};
use crate::guarded_batch::GuardedCondition;
use crate::ids;
use crate::models::{LedgerEntry, SubscriptionRecord};
use crate::time;

const STATE_FIELD: &str = "nativeStoreNotificationState";
const RECENT_LIMIT: usize = 16;

pub(super) fn append_subscription(
    plan: &mut Plan,
    row: EntryRecord,
    action: &SubscriptionAction,
    input: &NativeNotification,
    now: i64,
) -> AppResult<TargetState> {
    let key = row.entry_key.clone();
    let mut value = row.payload.clone();
    let mut sub: SubscriptionRecord = row.parse()?;
    if sub.provider != input.provider {
        return Ok(TargetState::Irrelevant);
    }
    if already_processed(&value, &input.id) {
        return Ok(TargetState::Applied);
    }
    let current_end = sub
        .current_period_end
        .as_deref()
        .and_then(time::parse_iso)
        .unwrap_or(0);
    let terminal = matches!(sub.status.as_str(), "canceled" | "refunded" | "revoked");
    let changed = transition_subscription(
        &mut sub,
        action,
        terminal,
        current_end,
        input.event_time_ms >= last_event_time(&value),
    );
    sub.updated_at = time::iso8601(now);
    merge_serialized(
        &mut value,
        serde_json::to_value(&sub).map_err(encode_error)?,
    )?;
    record_notification(&mut value, &input.id, input.event_time_ms);
    append_write(plan, ids::MODEL_SUBSCRIPTIONS, key.clone(), value, &row)?;
    if changed {
        plan.effects.push(Effect {
            reason: match action {
                SubscriptionAction::Cancel => "purchase_revoked",
                SubscriptionAction::Renew { .. } => "subscription_renewed",
            },
            customer: Some(sub.customer_ref),
            product: Some(sub.price_id),
            key,
        });
    }
    Ok(TargetState::Applied)
}

fn transition_subscription(
    sub: &mut SubscriptionRecord,
    action: &SubscriptionAction,
    terminal: bool,
    current_end: i64,
    ordered: bool,
) -> bool {
    match action {
        SubscriptionAction::Cancel if !terminal && ordered => {
            sub.status = "canceled".into();
            true
        }
        SubscriptionAction::Renew { period_end_secs }
            if !terminal && ordered && *period_end_secs > current_end =>
        {
            sub.status = "active".into();
            sub.current_period_end = Some(time::iso8601(*period_end_secs));
            true
        }
        _ => false,
    }
}

pub(super) fn append_ledger(
    plan: &mut Plan,
    row: EntryRecord,
    input: &NativeNotification,
    now: i64,
) -> AppResult<TargetState> {
    let key = row.entry_key.clone();
    let mut value = row.payload.clone();
    let mut ledger: LedgerEntry = row.parse()?;
    if ledger.provider != input.provider {
        // Exact provider identities are immutable. An occupied key owned by another
        // rail is permanently irrelevant and must never be overwritten.
        return Ok(TargetState::Irrelevant);
    }
    if already_processed(&value, &input.id) {
        return Ok(TargetState::Applied);
    }
    let refund_cents = match &input.ledger_refund {
        Some(LedgerRefund::Full) => ledger.gross_cents,
        Some(LedgerRefund::Cumulative {
            amount_cents,
            currency,
        }) => {
            if currency != &ledger.currency
                || *amount_cents < 0
                || *amount_cents > ledger.gross_cents
            {
                return Err(AppError::forbidden(
                    "native-store refund amount or currency mismatch",
                ));
            }
            *amount_cents
        }
        None => ledger.refund_cents,
    };
    let changed =
        refund_cents > ledger.refund_cents && input.event_time_ms >= last_event_time(&value);
    if changed {
        // Record the refund cashflow separately, atomically with the payment and
        // notification marker, so replay cannot inflate daily refund totals.
        let identity =
            serde_json::to_vec(&(input.provider, &input.id, &key)).map_err(encode_error)?;
        let refund_key = super::notification_identity::digest_id("native-refund", &identity);
        let refund = LedgerEntry {
            reference: refund_key.clone(),
            kind: "refund".into(),
            status: "succeeded".into(),
            gross_cents: refund_cents
                .checked_sub(ledger.refund_cents)
                .ok_or_else(|| AppError::conflict("native refund amount overflowed"))?,
            refund_cents: 0,
            provider_ref: Some(input.id.clone()),
            created_at: time::iso8601(now),
            processed_at: time::iso8601(now),
            ..ledger.clone()
        };
        plan.conditions.push(GuardedCondition::Absent {
            content_model_id: ids::MODEL_LEDGER,
            entry_key: refund_key.clone(),
        });
        plan.ops.push(BatchOp::Write {
            content_model_id: ids::MODEL_LEDGER,
            entry_key: refund_key,
            data: serde_json::to_value(refund).map_err(encode_error)?,
        });
        ledger.refund_cents = refund_cents;
        if ledger.refund_cents >= ledger.gross_cents {
            ledger.status = "refunded".into();
        }
    }
    merge_serialized(
        &mut value,
        serde_json::to_value(&ledger).map_err(encode_error)?,
    )?;
    record_notification(&mut value, &input.id, input.event_time_ms);
    append_write(plan, ids::MODEL_LEDGER, key.clone(), value, &row)?;
    if changed {
        plan.effects.push(Effect {
            reason: "purchase_revoked",
            customer: ledger.customer_profile_id,
            product: ledger.product_id,
            key,
        });
    }
    Ok(TargetState::Applied)
}

fn already_processed(value: &Value, id: &str) -> bool {
    value
        .pointer(&format!("/{STATE_FIELD}/recentIds"))
        .and_then(Value::as_array)
        .is_some_and(|ids| ids.iter().any(|value| value.as_str() == Some(id)))
}

fn last_event_time(value: &Value) -> i64 {
    value
        .pointer(&format!("/{STATE_FIELD}/lastEventTimeMillis"))
        .and_then(Value::as_i64)
        .unwrap_or(i64::MIN)
}

fn record_notification(value: &mut Value, id: &str, event_time_ms: i64) {
    let mut ids = value
        .pointer(&format!("/{STATE_FIELD}/recentIds"))
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();
    ids.push(Value::String(id.into()));
    if ids.len() > RECENT_LIMIT {
        ids.drain(..ids.len() - RECENT_LIMIT);
    }
    value[STATE_FIELD] = json!({ "lastEventTimeMillis": last_event_time(value).max(event_time_ms), "recentIds": ids });
}

fn merge_serialized(target: &mut Value, serialized: Value) -> AppResult<()> {
    let target = target
        .as_object_mut()
        .ok_or_else(|| AppError::internal("stored native projection is not an object"))?;
    let serialized = serialized
        .as_object()
        .ok_or_else(|| AppError::internal("encoded native projection is not an object"))?;
    target.extend(serialized.clone());
    Ok(())
}

fn encode_error(error: serde_json::Error) -> AppError {
    AppError::internal("cannot encode native-store projection").with_internal(error.to_string())
}
