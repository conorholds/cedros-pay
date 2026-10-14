use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

use crate::auth::Buyer;
use crate::ctx::RequestContext;
use crate::db::{BatchOp, Db};
use crate::error::{AppError, AppResult};
use crate::guarded_batch::{GuardedBatchOutcome, GuardedCondition};
use crate::seams::HostSeams;

const WINDOW_SECONDS: i64 = 60;

#[derive(Clone, Copy)]
pub(super) enum Operation {
    Descriptor,
    Quote,
    Create,
    Status,
    Resolve,
    VerifyReturn,
}

impl Operation {
    fn name(self) -> &'static str {
        match self {
            Self::Descriptor => "descriptor",
            Self::Quote => "quote",
            Self::Create => "create",
            Self::Status => "status",
            Self::Resolve => "resolve",
            Self::VerifyReturn => "verify-return",
        }
    }

    fn limit(self) -> u32 {
        match self {
            Self::Descriptor | Self::Status => 120,
            Self::Quote => 60,
            Self::Create | Self::Resolve | Self::VerifyReturn => 30,
        }
    }
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct RateRecord {
    schema_version: u8,
    operation: String,
    window_started_at: i64,
    count: u32,
    updated_at: i64,
}

pub(super) fn check<S: HostSeams>(
    seams: &S,
    buyer: &Buyer,
    context: &RequestContext,
    operation: Operation,
) -> AppResult<()> {
    let key = key(context, &buyer.user_id, operation)?;
    for _ in 0..3 {
        if attempt(seams, &key, operation)? {
            return Ok(());
        }
    }
    Err(AppError::conflict(
        "checkout rate state changed repeatedly; retry",
    ))
}

fn attempt<S: HostSeams>(seams: &S, key: &str, operation: Operation) -> AppResult<bool> {
    let db = Db::new(seams, crate::ids::DB_ACCESS);
    let now = seams.now_unix_secs();
    let (mut record, condition) = match db.read_one(crate::guarded_policy::CONTROL_MODEL, key)? {
        Some(entry) => {
            let record: RateRecord = entry.parse()?;
            validate(&record, operation, now)?;
            let version = entry
                .version
                .clone()
                .filter(|version| !version.is_empty())
                .ok_or_else(|| AppError::internal("checkout rate state omitted its version"))?;
            (
                record,
                GuardedCondition::Version {
                    content_model_id: crate::guarded_policy::CONTROL_MODEL,
                    entry_key: key.into(),
                    expected_version: version,
                },
            )
        }
        None => (
            RateRecord {
                schema_version: 1,
                operation: operation.name().into(),
                window_started_at: now,
                count: 0,
                updated_at: now,
            },
            GuardedCondition::Absent {
                content_model_id: crate::guarded_policy::CONTROL_MODEL,
                entry_key: key.into(),
            },
        ),
    };
    if now >= record.window_started_at.saturating_add(WINDOW_SECONDS) {
        record.window_started_at = now;
        record.count = 0;
    }
    if record.count >= operation.limit() {
        return Err(AppError::too_many("checkout request rate exceeded"));
    }
    record.count += 1;
    record.updated_at = now;
    let data = serde_json::to_value(record).map_err(|error| {
        AppError::internal("cannot encode checkout rate state").with_internal(error.to_string())
    })?;
    Ok(matches!(
        db.guarded_batch(
            &[condition],
            &[BatchOp::Write {
                content_model_id: crate::guarded_policy::CONTROL_MODEL,
                entry_key: key.into(),
                data,
            }],
        )?,
        GuardedBatchOutcome::Applied { .. }
    ))
}

fn validate(record: &RateRecord, operation: Operation, now: i64) -> AppResult<()> {
    if record.schema_version == 1
        && record.operation == operation.name()
        && record.window_started_at <= now
        && record.updated_at >= record.window_started_at
        && record.updated_at <= now
    {
        Ok(())
    } else {
        Err(AppError::new(
            503,
            "checkout_rate_policy_unavailable",
            "checkout request policy is unavailable",
        ))
    }
}

fn key(context: &RequestContext, subject: &str, operation: Operation) -> AppResult<String> {
    let site = segment(context.site_id.as_deref())?;
    let environment = segment(context.environment.as_deref())?;
    let subject = segment(Some(subject))?;
    let mut digest = Sha256::new();
    digest.update(b"cedros-pay-checkout-rate\0");
    for value in [site, environment, subject, operation.name()] {
        digest.update((value.len() as u64).to_be_bytes());
        digest.update(value.as_bytes());
    }
    Ok(format!("checkout-rate:{}", hex::encode(digest.finalize())))
}

fn segment(value: Option<&str>) -> AppResult<&str> {
    value
        .filter(|value| {
            !value.is_empty()
                && value.trim() == *value
                && value.len() <= 512
                && !value.chars().any(char::is_control)
        })
        .ok_or_else(|| {
            AppError::new(
                503,
                "checkout_rate_policy_unavailable",
                "checkout request policy is unavailable",
            )
        })
}
