use serde_json::to_value;
use sha2::{Digest, Sha256};

use super::contract::{GuardedPolicyMarker, GUARDED_MODELS};
use crate::db::{BatchOp, Db, WritePolicy};
use crate::error::{AppError, AppResult};
use crate::guarded_batch::{GuardedBatchOutcome, GuardedCondition};
use crate::ids;
use crate::seams::HostSeams;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct EnrollmentResult {
    pub newly_enrolled: bool,
    pub marker: GuardedPolicyMarker,
}

/// Atomically enroll the exact compiled model set. No caller controls models,
/// policy, capability, schema, host provenance, or marker identity.
pub fn enroll<S: HostSeams>(seams: &S) -> AppResult<EnrollmentResult> {
    let db = Db::new(seams, ids::DB_ACCESS);
    let existing = db.read_one(super::CONTROL_MODEL, super::MARKER_KEY)?;
    if let Some(existing) = existing {
        let marker: GuardedPolicyMarker = serde_json::from_value(existing.payload.clone())
            .map_err(|error| {
                super::validation::unavailable(format!("guarded-only marker schema: {error}"))
            })?;
        if let Ok(marker) = super::validation::validate(marker.clone()) {
            return success(false, marker);
        }
        validate_upgrade_source(&marker)?;
        let expected_version = existing
            .version
            .filter(|version| !version.is_empty())
            .ok_or_else(|| {
                super::validation::unavailable(
                    "guarded-only marker upgrade omitted its version fence",
                )
            })?;
        let next = GuardedPolicyMarker::new(seams.now_unix_secs());
        let condition = GuardedCondition::Version {
            content_model_id: super::CONTROL_MODEL,
            entry_key: super::MARKER_KEY.into(),
            expected_version,
        };
        let mut ops = GUARDED_MODELS
            .iter()
            .filter(|model| !marker.models.iter().any(|current| current == **model))
            .map(|model| BatchOp::SetWritePolicy {
                content_model_id: model,
                policy: WritePolicy::GuardedOnly,
            })
            .collect::<Vec<_>>();
        ops.push(BatchOp::Write {
            content_model_id: super::CONTROL_MODEL,
            entry_key: super::MARKER_KEY.into(),
            data: to_value(&next).map_err(|error| {
                AppError::internal("cannot encode guarded-only marker")
                    .with_internal(error.to_string())
            })?,
        });
        return match crate::guarded_batch::execute_host_policy(
            seams,
            ids::DB_ACCESS,
            &[condition],
            &ops,
        )? {
            GuardedBatchOutcome::Applied { .. } => success(true, next),
            GuardedBatchOutcome::Conflict { .. } => {
                let marker = read_existing(seams)?.ok_or_else(|| {
                    super::validation::unavailable(
                        "enrollment upgrade conflict omitted durable marker",
                    )
                })?;
                success(false, marker)
            }
        };
    }
    let marker = GuardedPolicyMarker::new(seams.now_unix_secs());
    let condition = GuardedCondition::Absent {
        content_model_id: super::CONTROL_MODEL,
        entry_key: super::MARKER_KEY.into(),
    };
    let mut ops = GUARDED_MODELS
        .iter()
        .map(|model| BatchOp::SetWritePolicy {
            content_model_id: model,
            policy: WritePolicy::GuardedOnly,
        })
        .collect::<Vec<_>>();
    ops.push(BatchOp::Write {
        content_model_id: super::CONTROL_MODEL,
        entry_key: super::MARKER_KEY.into(),
        data: to_value(&marker).map_err(|error| {
            AppError::internal("cannot encode guarded-only marker").with_internal(error.to_string())
        })?,
    });
    match crate::guarded_batch::execute_host_policy(seams, ids::DB_ACCESS, &[condition], &ops)? {
        GuardedBatchOutcome::Applied { .. } => success(true, marker),
        GuardedBatchOutcome::Conflict { .. } => {
            let marker = read_existing(seams)?.ok_or_else(|| {
                super::validation::unavailable("enrollment conflict omitted durable marker")
            })?;
            success(false, marker)
        }
    }
}

fn validate_upgrade_source(marker: &GuardedPolicyMarker) -> AppResult<()> {
    const LEGACY_CAPABILITY_ID: &str = "cedros-data:database-concurrency-v1";
    const LEGACY_MIN_DATA_VERSION: &str = "0.1.9";
    const LEGACY_HOST_COMMIT: &str = "4b77968f8211791a198da6b71e1465a7ffa932cc";
    let mut sorted = marker.models.clone();
    sorted.sort();
    sorted.dedup();
    let marker_hash = serde_json::to_vec(&marker.models)
        .map(|value| hex::encode(Sha256::digest(value)))
        .map_err(|error| {
            super::validation::unavailable(format!("guarded-only marker upgrade hash: {error}"))
        })?;
    let legacy_contract = marker.capability_id == LEGACY_CAPABILITY_ID
        && marker.min_cedros_data_version == LEGACY_MIN_DATA_VERSION
        && marker.host_commit == LEGACY_HOST_COMMIT;
    let current_contract = marker.capability_id == super::CAPABILITY_ID
        && marker.min_cedros_data_version == super::MIN_DATA_VERSION
        && marker.host_commit == super::HOST_COMMIT;
    let compatible = marker.schema_version == 1
        && (legacy_contract || current_contract)
        && marker.request_schema_version == super::REQUEST_SCHEMA_VERSION
        && marker.policy == super::ACTIVE_POLICY
        && marker.active
        && crate::time::parse_iso(&marker.host_timestamp).is_some()
        && sorted == marker.models
        && marker_hash == marker.model_set_sha256
        && marker
            .models
            .iter()
            .all(|model| GUARDED_MODELS.contains(&model.as_str()))
        && (legacy_contract || marker.models.len() < GUARDED_MODELS.len());
    compatible.then_some(()).ok_or_else(|| {
        super::validation::unavailable("guarded-only enrollment marker is incompatible")
    })
}

fn read_existing<S: HostSeams>(seams: &S) -> AppResult<Option<GuardedPolicyMarker>> {
    let Some(marker) = super::validation::read_optional(seams)? else {
        return Ok(None);
    };
    super::validation::validate(marker).map(Some)
}

fn success(newly_enrolled: bool, marker: GuardedPolicyMarker) -> AppResult<EnrollmentResult> {
    super::validation::validate(marker.clone())?;
    Ok(EnrollmentResult {
        newly_enrolled,
        marker,
    })
}
