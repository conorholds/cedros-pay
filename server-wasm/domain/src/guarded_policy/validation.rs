use super::contract::{
    GuardedPolicyMarker, ACTIVE_POLICY, CAPABILITY_ID, GUARDED_MODELS, HOST_COMMIT,
    MIN_DATA_VERSION, REQUEST_SCHEMA_VERSION,
};
use crate::db::Db;
use crate::error::{AppError, AppResult};
use crate::ids;
use crate::seams::HostSeams;

pub fn require_active<S: HostSeams>(seams: &S) -> AppResult<GuardedPolicyMarker> {
    let stored = read_optional(seams)?
        .ok_or_else(|| unavailable("guarded-only enrollment marker is missing"))?;
    validate(stored)
}

pub(super) fn read_optional<S: HostSeams>(seams: &S) -> AppResult<Option<GuardedPolicyMarker>> {
    let stored = Db::new(seams, ids::DB_ACCESS)
        .read_one(super::CONTROL_MODEL, super::MARKER_KEY)
        .map_err(|error| unavailable(format!("guarded-only marker read: {}", error.message)))?;
    stored
        .map(|entry| {
            serde_json::from_value(entry.payload)
                .map_err(|error| unavailable(format!("guarded-only marker schema: {error}")))
        })
        .transpose()
}

pub(super) fn validate(marker: GuardedPolicyMarker) -> AppResult<GuardedPolicyMarker> {
    let exact_models = marker
        .models
        .iter()
        .map(String::as_str)
        .eq(GUARDED_MODELS.iter().copied());
    if marker.schema_version != 1
        || marker.capability_id != CAPABILITY_ID
        || marker.min_cedros_data_version != MIN_DATA_VERSION
        || marker.request_schema_version != REQUEST_SCHEMA_VERSION
        || marker.host_commit != HOST_COMMIT
        || !exact_models
        || marker.model_set_sha256 != super::MODEL_SET_SHA256
        || super::model_set_sha256() != super::MODEL_SET_SHA256
        || marker.policy != ACTIVE_POLICY
        || !marker.active
        || crate::time::parse_iso(&marker.host_timestamp).is_none()
    {
        return Err(unavailable(
            "guarded-only enrollment marker is incompatible",
        ));
    }
    Ok(marker)
}

pub(super) fn unavailable(detail: impl Into<String>) -> AppError {
    AppError::new(
        503,
        "guarded_write_policy_unavailable",
        "guarded-only database policy is not active",
    )
    .with_internal(detail)
}
