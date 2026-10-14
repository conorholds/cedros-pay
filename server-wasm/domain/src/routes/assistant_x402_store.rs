use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::db::{BatchOp, Db, EntryRecord};
use crate::error::{AppError, AppResult};
use crate::guarded_batch::{GuardedBatchOutcome, GuardedCondition};
use crate::ids;
use crate::seams::HostSeams;

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct PurchaseRecord {
    pub(super) schema_version: u8,
    pub(super) fingerprint: String,
    pub(super) resource_url: String,
    pub(super) run_id: String,
    pub(super) request_id: String,
    pub(super) idempotency_key: String,
    pub(super) wallet_id: String,
    pub(super) wallet_version_id: String,
    pub(super) payer_public_key: String,
    pub(super) cluster: String,
    pub(super) requirement_digest: String,
    pub(super) pay_to: String,
    pub(super) asset: String,
    pub(super) recipient_token_account: String,
    pub(super) amount_microunits: u64,
    pub(super) decimals: u8,
    pub(super) memo: String,
    pub(super) blockhash: String,
    pub(super) unsigned_wire_base64: String,
    pub(super) transaction_sha256: String,
    #[serde(default)]
    pub(super) signed_wire_base64: Option<String>,
    #[serde(default)]
    pub(super) signature: Option<String>,
    #[serde(default)]
    pub(super) policy_decision_id: Option<String>,
    pub(super) status: String,
    #[serde(default)]
    pub(super) output: Option<Value>,
    pub(super) is_error: bool,
    pub(super) created_at: String,
    pub(super) updated_at: String,
}

pub(super) struct StoredPurchase {
    pub(super) entry: EntryRecord,
    pub(super) record: PurchaseRecord,
    pub(super) replayed: bool,
}

pub(super) fn key(idempotency_key: &str) -> String {
    let digest = super::contract::digest_json(&Value::String(idempotency_key.to_string()));
    format!("assistant-x402-{}", digest.trim_start_matches("sha256:"))
}

pub(super) fn load<S: HostSeams>(
    db: &Db<'_, S>,
    entry_key: &str,
) -> AppResult<Option<StoredPurchase>> {
    let Some(entry) = db.read_one(ids::MODEL_SUPPORT_AI, entry_key)? else {
        return Ok(None);
    };
    let record = entry.parse()?;
    Ok(Some(StoredPurchase {
        entry,
        record,
        replayed: true,
    }))
}

pub(super) fn claim<S: HostSeams>(
    db: &Db<'_, S>,
    entry_key: &str,
    record: PurchaseRecord,
) -> AppResult<StoredPurchase> {
    let op = BatchOp::Write {
        content_model_id: ids::MODEL_SUPPORT_AI,
        entry_key: entry_key.to_string(),
        data: serde_json::to_value(&record).map_err(|error| {
            AppError::internal("cannot encode Assistant purchase state")
                .with_internal(error.to_string())
        })?,
    };
    let guard = GuardedCondition::Absent {
        content_model_id: ids::MODEL_SUPPORT_AI,
        entry_key: entry_key.to_string(),
    };
    match db.guarded_batch(&[guard], &[op])? {
        GuardedBatchOutcome::Applied { .. } => {
            let mut stored = load(db, entry_key)?.ok_or_else(|| {
                AppError::internal("Assistant purchase claim disappeared after commit")
            })?;
            stored.replayed = false;
            Ok(stored)
        }
        GuardedBatchOutcome::Conflict { .. } => load(db, entry_key)?
            .ok_or_else(|| AppError::conflict("Assistant purchase claim changed concurrently")),
    }
}

pub(super) fn update<S: HostSeams>(
    db: &Db<'_, S>,
    stored: StoredPurchase,
    record: PurchaseRecord,
) -> AppResult<StoredPurchase> {
    let version = stored
        .entry
        .version
        .clone()
        .ok_or_else(|| AppError::conflict("Assistant purchase state lacks a version fence"))?;
    let guard = GuardedCondition::Version {
        content_model_id: ids::MODEL_SUPPORT_AI,
        entry_key: stored.entry.entry_key.clone(),
        expected_version: version,
    };
    let op = BatchOp::Write {
        content_model_id: ids::MODEL_SUPPORT_AI,
        entry_key: stored.entry.entry_key.clone(),
        data: serde_json::to_value(record).map_err(|error| {
            AppError::internal("cannot encode Assistant purchase state")
                .with_internal(error.to_string())
        })?,
    };
    match db.guarded_batch(&[guard], &[op])? {
        GuardedBatchOutcome::Applied { .. } => load(db, &stored.entry.entry_key)?
            .ok_or_else(|| AppError::internal("Assistant purchase state disappeared after update")),
        GuardedBatchOutcome::Conflict { .. } => Err(AppError::conflict(
            "Assistant purchase changed concurrently; retry the exact request",
        )),
    }
}
