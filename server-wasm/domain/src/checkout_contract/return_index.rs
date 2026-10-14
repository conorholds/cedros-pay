use serde::{Deserialize, Serialize};
use serde_json::to_value;
use sha2::{Digest, Sha256};

use crate::db::BatchOp;
use crate::error::{AppError, AppResult};
use crate::guarded_batch::{GuardedBatchOutcome, GuardedCondition};
use crate::seams::HostSeams;

use super::record::{validate_stored_outcome, OperationRecord, SettlementState};
use super::{DurableOutcome, OperationKind, OperationLedger, OPERATION_MODEL, RETURN_INDEX_MODEL};

const INDEX_SCHEMA_VERSION: u8 = 1;

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ReturnIndex {
    schema_version: u8,
    provider_scope_hash: String,
    return_artifact_hash: String,
    operation_entry_key: String,
}

pub(super) struct ReturnCorrelation {
    pub provider_scope: String,
    pub operation_id: String,
    pub checkout_attempt_id: String,
    pub material_fingerprint: String,
    pub operation_entry_key: String,
    pub session_id: String,
    pub settlement_state: SettlementState,
}

impl<S: HostSeams> OperationLedger<'_, S> {
    pub(super) fn write_completed(
        &self,
        key: &str,
        record: &OperationRecord,
        version_condition: GuardedCondition,
    ) -> AppResult<GuardedBatchOutcome> {
        let Some(artifact) = resolved_artifact(record)? else {
            return self.write(key, record, version_condition);
        };
        let index_key = index_key(&record.provider_scope, artifact);
        let index = ReturnIndex {
            schema_version: INDEX_SCHEMA_VERSION,
            provider_scope_hash: digest("scope", &record.provider_scope),
            return_artifact_hash: digest("artifact", artifact),
            operation_entry_key: key.into(),
        };
        let conditions = [
            version_condition,
            GuardedCondition::Absent {
                content_model_id: RETURN_INDEX_MODEL,
                entry_key: index_key.clone(),
            },
        ];
        let ops = [
            BatchOp::Write {
                content_model_id: OPERATION_MODEL,
                entry_key: key.into(),
                data: encode(record)?,
            },
            BatchOp::Write {
                content_model_id: RETURN_INDEX_MODEL,
                entry_key: index_key,
                data: encode(&index)?,
            },
        ];
        self.db.guarded_batch(&conditions, &ops)
    }

    pub(super) fn return_correlation(
        &self,
        provider_scope: &str,
        artifact: &str,
    ) -> AppResult<Option<ReturnCorrelation>> {
        let key = index_key(provider_scope, artifact);
        let Some(index_entry) = self.db.read_one(RETURN_INDEX_MODEL, &key)? else {
            return Ok(None);
        };
        let index: ReturnIndex = index_entry.parse()?;
        if index.schema_version != INDEX_SCHEMA_VERSION
            || index.provider_scope_hash != digest("scope", provider_scope)
            || index.return_artifact_hash != digest("artifact", artifact)
        {
            return Err(AppError::internal("checkout return index is invalid"));
        }
        let Some(operation_entry) = self
            .db
            .read_one(OPERATION_MODEL, &index.operation_entry_key)?
        else {
            return Err(AppError::internal("checkout return index is orphaned"));
        };
        let record: OperationRecord = operation_entry.parse()?;
        validate_stored_outcome(&record)?;
        correlation(record, index.operation_entry_key, artifact)
    }
}

fn correlation(
    record: OperationRecord,
    operation_entry_key: String,
    artifact: &str,
) -> AppResult<Option<ReturnCorrelation>> {
    let Some(DurableOutcome::Resolved {
        provider_artifacts, ..
    }) = &record.outcome
    else {
        return Ok(None);
    };
    if record.operation != OperationKind::Checkout
        || provider_artifacts.return_artifact_id.as_deref() != Some(artifact)
        || provider_artifacts.provider_checkout_id.as_deref() != Some(artifact)
    {
        return Ok(None);
    }
    Ok(Some(ReturnCorrelation {
        provider_scope: record.provider_scope,
        operation_id: record.operation_id,
        checkout_attempt_id: record.checkout_attempt_id,
        material_fingerprint: record.material_fingerprint,
        operation_entry_key,
        session_id: artifact.into(),
        settlement_state: record.settlement_state,
    }))
}

fn resolved_artifact(record: &OperationRecord) -> AppResult<Option<&str>> {
    let Some(DurableOutcome::Resolved {
        provider_artifacts, ..
    }) = &record.outcome
    else {
        return Ok(None);
    };
    if record.operation != OperationKind::Checkout {
        return Ok(None);
    }
    let artifact = provider_artifacts
        .return_artifact_id
        .as_deref()
        .ok_or_else(|| AppError::internal("resolved checkout has no return artifact"))?;
    if provider_artifacts.provider_checkout_id.as_deref() != Some(artifact) {
        return Err(AppError::internal(
            "resolved checkout provider artifacts do not correlate",
        ));
    }
    Ok(Some(artifact))
}

fn index_key(scope: &str, artifact: &str) -> String {
    let mut digest = Sha256::new();
    digest.update(b"cedros-pay-checkout-return-index\0");
    digest.update((scope.len() as u64).to_be_bytes());
    digest.update(scope.as_bytes());
    digest.update((artifact.len() as u64).to_be_bytes());
    digest.update(artifact.as_bytes());
    format!("checkout-return:{}", hex::encode(digest.finalize()))
}

fn digest(domain: &str, value: &str) -> String {
    let mut digest = Sha256::new();
    digest.update(b"cedros-pay-checkout-index-value\0");
    digest.update(domain.as_bytes());
    digest.update(value.as_bytes());
    hex::encode(digest.finalize())
}

fn encode<T: Serialize>(value: &T) -> AppResult<serde_json::Value> {
    to_value(value).map_err(|error| {
        AppError::internal("cannot encode checkout return index").with_internal(error.to_string())
    })
}
