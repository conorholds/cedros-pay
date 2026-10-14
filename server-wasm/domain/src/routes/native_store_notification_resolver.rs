//! Resolution of durable notification targets that may arrive out of order.

use super::notification_commit::{NativeNotification, Plan};
use super::notification_marker::TargetState;
use super::notification_projection::{append_ledger, append_subscription};
use crate::db::{Db, EntryRecord, Filter, Op, Query};
use crate::error::{AppError, AppResult};
use crate::ids;
use crate::models::SubscriptionRecord;
use crate::seams::HostSeams;

pub(super) fn resolve_subscription<S: HostSeams>(
    db: &Db<'_, S>,
    input: &NativeNotification,
    plan: &mut Plan,
    now: i64,
) -> AppResult<TargetState> {
    let (Some(id), Some(action)) = (&input.subscription_id, &input.subscription_action) else {
        return Ok(TargetState::NotRequired);
    };
    match find_subscription(db, id, &input.provider_refs, input.provider)? {
        Resolution::Found(row) => append_subscription(plan, row, action, input, now),
        Resolution::Pending => Ok(TargetState::Pending),
        Resolution::Irrelevant => Ok(TargetState::Irrelevant),
    }
}

pub(super) fn resolve_ledger<S: HostSeams>(
    db: &Db<'_, S>,
    input: &NativeNotification,
    plan: &mut Plan,
    now: i64,
) -> AppResult<TargetState> {
    let Some(reference) = &input.ledger_ref else {
        return Ok(TargetState::NotRequired);
    };
    match db.read_one(ids::MODEL_LEDGER, reference)? {
        Some(row) => append_ledger(plan, row, input, now),
        None => Ok(TargetState::Pending),
    }
}

enum Resolution {
    Found(EntryRecord),
    Pending,
    Irrelevant,
}

fn find_subscription<S: HostSeams>(
    db: &Db<'_, S>,
    id: &str,
    refs: &[String],
    provider: &str,
) -> AppResult<Resolution> {
    let mut exact_key_is_other_provider = false;
    if let Some(row) = db.read_one(ids::MODEL_SUBSCRIPTIONS, id)? {
        let sub: SubscriptionRecord = row.parse()?;
        if sub.provider == provider {
            return Ok(Resolution::Found(row));
        }
        exact_key_is_other_provider = true;
    }
    for provider_ref in refs.iter().filter(|value| !value.trim().is_empty()) {
        let rows = db.read(
            ids::MODEL_SUBSCRIPTIONS,
            &Query::new()
                .filter(Filter::new("provider", Op::Eq, provider))
                .filter(Filter::new("providerRef", Op::Eq, provider_ref.as_str()))
                .limit(2),
        )?;
        match rows.len() {
            0 => {}
            1 => return Ok(Resolution::Found(rows.into_iter().next().expect("one row"))),
            _ => {
                return Err(AppError::conflict(
                    "native-store subscription mapping is ambiguous",
                ))
            }
        }
    }
    // An occupied exact identity owned by another provider can never become a valid
    // target without corrupting that provider's record, so it is permanently irrelevant.
    Ok(if exact_key_is_other_provider {
        Resolution::Irrelevant
    } else {
        Resolution::Pending
    })
}
