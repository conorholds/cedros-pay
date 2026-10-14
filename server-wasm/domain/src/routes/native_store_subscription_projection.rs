//! Monotonic subscription projection included with a receipt claim.

use super::purchase_commit::Commit;
use super::VerifyReq;
use crate::db::{BatchOp, Db, EntryRecord};
use crate::error::{AppError, AppResult};
use crate::guarded_batch::GuardedCondition;
use crate::ids;
use crate::models::SubscriptionRecord;
use crate::seams::HostSeams;
use crate::time;

#[allow(clippy::too_many_arguments)]
pub(super) fn append_subscription<S: HostSeams>(
    seams: &S,
    body: &VerifyReq,
    user_id: Option<&str>,
    commit: &Commit<'_>,
    sub_id: &str,
    status: &str,
    period_end: i64,
    conditions: &mut Vec<GuardedCondition>,
    ops: &mut Vec<BatchOp>,
) -> AppResult<()> {
    let existing = Db::new(seams, ids::DB_ACCESS).read_one(ids::MODEL_SUBSCRIPTIONS, sub_id)?;
    if let Some(row) = existing {
        return append_existing(
            seams, body, user_id, commit, sub_id, status, period_end, row, conditions, ops,
        );
    }
    let now = time::iso8601(seams.now_unix_secs());
    let record = SubscriptionRecord {
        subscription_id: sub_id.into(),
        customer_ref: user_id.unwrap_or_default().into(),
        stripe_customer_id: None,
        price_id: body.product_id.clone(),
        status: status.into(),
        provider: commit.provider.into(),
        provider_ref: Some(commit.provider_ref.into()),
        current_period_end: Some(time::iso8601(period_end)),
        cancel_at_period_end: false,
        last_provider_event_at: None,
        created_at: now.clone(),
        updated_at: now,
    };
    conditions.push(GuardedCondition::Absent {
        content_model_id: ids::MODEL_SUBSCRIPTIONS,
        entry_key: sub_id.into(),
    });
    ops.push(write_subscription(sub_id, &record)?);
    Ok(())
}

#[allow(clippy::too_many_arguments)]
fn append_existing<S: HostSeams>(
    seams: &S,
    body: &VerifyReq,
    user_id: Option<&str>,
    commit: &Commit<'_>,
    sub_id: &str,
    status: &str,
    period_end: i64,
    row: EntryRecord,
    conditions: &mut Vec<GuardedCondition>,
    ops: &mut Vec<BatchOp>,
) -> AppResult<()> {
    let mut record: SubscriptionRecord = row.parse()?;
    validate_subscription(&record, body, user_id, commit.provider)?;
    let incoming_end = time::iso8601(period_end);
    let terminal = matches!(record.status.as_str(), "canceled" | "refunded" | "revoked");
    let advances = record
        .current_period_end
        .as_deref()
        .is_none_or(|end| incoming_end.as_str() > end);
    if terminal || !advances {
        return Ok(());
    }
    record.status = status.into();
    record.provider_ref = Some(commit.provider_ref.into());
    record.current_period_end = Some(incoming_end);
    record.updated_at = time::iso8601(seams.now_unix_secs());
    conditions.push(version_condition(sub_id, &row)?);
    ops.push(write_subscription(sub_id, &record)?);
    Ok(())
}

fn validate_subscription(
    record: &SubscriptionRecord,
    body: &VerifyReq,
    user_id: Option<&str>,
    provider: &str,
) -> AppResult<()> {
    if record.provider != provider
        || record.price_id != body.product_id
        || record.customer_ref != user_id.unwrap_or_default()
    {
        return Err(AppError::conflict(
            "the store subscription is already claimed by different purchase facts",
        ));
    }
    Ok(())
}

fn version_condition(key: &str, row: &EntryRecord) -> AppResult<GuardedCondition> {
    let expected_version = row.version.clone().ok_or_else(|| {
        AppError::new(
            503,
            "unavailable",
            "database version tokens are unavailable",
        )
    })?;
    Ok(GuardedCondition::Version {
        content_model_id: ids::MODEL_SUBSCRIPTIONS,
        entry_key: key.into(),
        expected_version,
    })
}

fn write_subscription(key: &str, record: &SubscriptionRecord) -> AppResult<BatchOp> {
    let data = serde_json::to_value(record).map_err(|error| {
        AppError::internal("cannot encode native subscription").with_internal(error.to_string())
    })?;
    Ok(BatchOp::Write {
        content_model_id: ids::MODEL_SUBSCRIPTIONS,
        entry_key: key.into(),
        data,
    })
}
