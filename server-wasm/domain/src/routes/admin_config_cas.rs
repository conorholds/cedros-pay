//! Atomic settings/secrets/audit mutation through Core's configuration CAS.

use std::collections::BTreeMap;

use serde_json::{json, Map, Value};

use super::{
    is_secret_key, regional, serialize_stored_value, storage_key, CategorySpec,
    REDACTED_PLACEHOLDER,
};
use crate::conditional_batch;
use crate::ctx::RequestContext;
use crate::db::{Db, Query};
use crate::error::{AppError, AppResult};
use crate::ids;
use crate::payment_availability;
use crate::seams::HostSeams;

const OPERATION: &str = "extension.configuration.compare-and-set";
const IDEMPOTENCY_PREFIX: &str = "extension-config:";

pub(super) struct CommitOutcome {
    pub committed_revision: Option<String>,
    pub updated_keys: usize,
}

pub(crate) fn current_revision<S: HostSeams>(seams: &S) -> AppResult<Option<String>> {
    let rows = Db::new(seams, ids::CONFIG_DB_ACCESS).read(
        ids::MODEL_CONFIG_AUDIT,
        // Host default orders the record updated_at, which audit payloads omit.
        &Query::new().limit(1),
    )?;
    Ok(rows.into_iter().next().and_then(|row| {
        row.payload["committedRevision"]
            .as_str()
            .map(str::to_string)
    }))
}

pub(super) fn commit<S: HostSeams>(
    seams: &S,
    req: &crate::reqresp::RouteRequest,
    ctx: &RequestContext,
    spec: CategorySpec,
    body: &Value,
    config: &Map<String, Value>,
) -> AppResult<CommitOutcome> {
    let mutation_id = required_mutation_id(body)?;
    validate_idempotency_header(req, mutation_id)?;
    let expected_revision = expected_revision(body)?;
    let reason = body
        .get("description")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string);
    if reason.as_ref().is_some_and(|value| value.len() > 500) {
        return Err(AppError::bad_request("description exceeds 500 characters"));
    }

    let mut settings = Vec::new();
    let mut secrets = Vec::new();
    let mut changed_keys = Vec::new();
    let mut overrides = BTreeMap::new();
    for (key, value) in config {
        if value == REDACTED_PLACEHOLDER {
            continue;
        }
        let full_key = storage_key(spec.category, key);
        changed_keys.push(full_key.clone());
        overrides.insert(full_key.clone(), value.clone());
        if is_secret_key(spec, key) {
            if value.is_null() {
                secrets.push(json!({"key": full_key, "action": "delete"}));
            } else {
                secrets.push(json!({
                    "key": full_key,
                    "action": "set",
                    "value": serialize_stored_value(value),
                }));
            }
        } else {
            let normalized = regional::normalize_value(spec.category, key, value)?;
            let value = normalized.unwrap_or_else(|| value.clone());
            overrides.insert(full_key.clone(), value.clone());
            settings.push(json!({"key": full_key, "value": value}));
        }
    }
    if settings.is_empty() && secrets.is_empty() {
        return Ok(CommitOutcome {
            committed_revision: expected_revision,
            updated_keys: 0,
        });
    }
    let updated_keys = settings.len() + secrets.len();
    if payment_availability::category_affects_shop_availability(spec.category) {
        let snapshot = payment_availability::bridge_payload_with_overrides(seams, &overrides)?;
        settings.push(json!({
            "key": ids::SETTING_SHOP_PAYMENT_AVAILABILITY_SNAPSHOT,
            "value": snapshot,
        }));
        changed_keys.push(ids::SETTING_SHOP_PAYMENT_AVAILABILITY_SNAPSHOT.into());
    }
    changed_keys.sort();

    let actor_id = ctx
        .actor_id
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty() && value.len() <= 200);
    let output = conditional_batch::execute(
        seams,
        ids::CONFIG_DB_ACCESS,
        OPERATION,
        json!({
            "mutationId": mutation_id,
            "expectedRevision": expected_revision,
            "settings": settings,
            "secrets": secrets,
            "audit": {
                "entryKey": format!("config-audit:{mutation_id}"),
                "changedKeys": changed_keys,
                "actorId": actor_id,
                "reason": reason,
            },
        }),
    )?;
    let committed_revision = output["committedRevision"]
        .as_str()
        .filter(|value| !value.is_empty())
        .ok_or_else(|| AppError::internal("configuration CAS returned no committed revision"))?;
    Ok(CommitOutcome {
        committed_revision: Some(committed_revision.into()),
        updated_keys,
    })
}

fn required_mutation_id(body: &Value) -> AppResult<&str> {
    body.get("mutationId")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| {
            !value.is_empty()
                && value.len() <= 160
                && value
                    .bytes()
                    .all(|byte| byte.is_ascii_alphanumeric() || b"._:-".contains(&byte))
        })
        .ok_or_else(|| {
            AppError::bad_request("mutationId must be 1-160 characters of [A-Za-z0-9._:-]")
        })
}

fn expected_revision(body: &Value) -> AppResult<Option<String>> {
    let Some(value) = body.get("expectedRevision") else {
        return Err(AppError::bad_request("expectedRevision is required"));
    };
    match value {
        Value::Null => Ok(None),
        Value::String(value) if !value.trim().is_empty() && value.len() <= 100 => {
            Ok(Some(value.clone()))
        }
        _ => Err(AppError::bad_request(
            "expectedRevision must be a non-empty opaque revision or null",
        )),
    }
}

fn validate_idempotency_header(
    req: &crate::reqresp::RouteRequest,
    mutation_id: &str,
) -> AppResult<()> {
    let expected = format!("{IDEMPOTENCY_PREFIX}{mutation_id}");
    if req.header("Idempotency-Key") != Some(expected.as_str()) {
        return Err(AppError::bad_request(
            "Idempotency-Key must equal extension-config:{mutationId}",
        ));
    }
    Ok(())
}
