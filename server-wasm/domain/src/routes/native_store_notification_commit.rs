//! Guarded notification claims and monotonic native-store projections.
use super::notification_identity::{notification_fingerprint, notification_marker_key};
use super::notification_marker::{NotificationMarker, TargetState};
use super::notification_resolver::{resolve_ledger, resolve_subscription};
use crate::db::{BatchOp, Db, EntryRecord};
use crate::error::{AppError, AppResult};
use crate::guarded_batch::{GuardedBatchOutcome, GuardedCondition};
use crate::ids;
use crate::seams::HostSeams;
use serde_json::Value;
const MAX_ATTEMPTS: usize = 3;

#[derive(Clone)]
pub(super) enum SubscriptionAction {
    Cancel,
    Renew { period_end_secs: i64 },
}

#[derive(Clone)]
pub(super) enum LedgerRefund {
    Full,
    Cumulative { amount_cents: i64, currency: String },
}

#[derive(Clone)]
pub(super) struct NativeNotification {
    pub id: String,
    pub event_time_ms: i64,
    pub provider: &'static str,
    pub subscription_id: Option<String>,
    pub provider_refs: Vec<String>,
    pub subscription_action: Option<SubscriptionAction>,
    pub ledger_ref: Option<String>,
    pub ledger_refund: Option<LedgerRefund>,
}

pub(super) fn apply_notification<S: HostSeams>(
    seams: &S,
    input: NativeNotification,
) -> AppResult<()> {
    let db = Db::new(seams, ids::DB_ACCESS);
    for _ in 0..MAX_ATTEMPTS {
        let plan = mutation_plan(&db, seams.now_unix_secs(), &input)?;
        if plan.ops.is_empty() {
            return Ok(());
        }
        match db.guarded_batch(&plan.conditions, &plan.ops)? {
            GuardedBatchOutcome::Applied { .. } => {
                for effect_id in &plan.effect_ids {
                    crate::durable_effects::dispatch_effect_best_effort(seams, effect_id);
                }
                return Ok(());
            }
            GuardedBatchOutcome::Conflict { .. } => continue,
        }
    }
    Err(AppError::conflict(
        "native-store notification state changed concurrently",
    ))
}

pub(super) struct Plan {
    pub conditions: Vec<GuardedCondition>,
    pub ops: Vec<BatchOp>,
    pub effects: Vec<Effect>,
    pub effect_ids: Vec<String>,
}

pub(super) struct Effect {
    pub reason: &'static str,
    pub customer: Option<String>,
    pub product: Option<String>,
    pub key: String,
}

fn mutation_plan<S: HostSeams>(
    db: &Db<'_, S>,
    now: i64,
    input: &NativeNotification,
) -> AppResult<Plan> {
    let fingerprint = notification_fingerprint(input);
    let mut marker = NotificationMarker::load(
        db,
        notification_marker_key(&input.id),
        &input.id,
        &fingerprint,
        input.subscription_action.is_some(),
        input.ledger_ref.is_some(),
        input.event_time_ms,
        now,
    )?;
    let mut effective_input = input.clone();
    effective_input.event_time_ms = marker.event_time_ms()?;
    let mut plan = Plan {
        conditions: Vec::new(),
        ops: Vec::new(),
        effects: Vec::new(),
        effect_ids: Vec::new(),
    };
    if marker.state("subscription")? == TargetState::Pending {
        let state = resolve_subscription(db, &effective_input, &mut plan, now)?;
        marker.set_state("subscription", state);
    }
    if marker.state("ledger")? == TargetState::Pending {
        let state = resolve_ledger(db, &effective_input, &mut plan, now)?;
        marker.set_state("ledger", state);
    }
    if let Some((condition, op)) = marker.finish(now)? {
        plan.conditions.push(condition);
        plan.ops.push(op);
    }
    for effect in &plan.effects {
        let actions = vec![crate::routes::entitlements::changed_action(
            effect.reason,
            effect.customer.as_deref(),
            effect.product.as_deref(),
            Some(&effect.key),
            Some(&input.id),
            now,
        )];
        let source_id = format!(
            "{}:{}:{}:{}",
            input.provider, input.id, effect.reason, effect.key
        );
        if let Some(effect) =
            crate::durable_effects::plan("native-store-notification", &source_id, actions, now)?
        {
            plan.effect_ids.push(effect.effect_id.clone());
            plan.conditions.push(effect.condition);
            plan.ops.push(effect.op);
        }
    }
    Ok(plan)
}

pub(super) fn append_write(
    plan: &mut Plan,
    model: &'static str,
    key: String,
    data: Value,
    row: &EntryRecord,
) -> AppResult<()> {
    let expected_version = row.version.clone().ok_or_else(|| {
        AppError::new(
            503,
            "unavailable",
            "database version tokens are unavailable",
        )
    })?;
    plan.conditions.push(GuardedCondition::Version {
        content_model_id: model,
        entry_key: key.clone(),
        expected_version,
    });
    plan.ops.push(BatchOp::Write {
        content_model_id: model,
        entry_key: key,
        data,
    });
    Ok(())
}
