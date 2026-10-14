//! Durable fingerprints and guarded writes for checkout initiation.

use std::collections::BTreeMap;

use serde_json::{Map, Value};
use sha2::{Digest, Sha256};

use crate::db::{BatchOp, Db, EntryRecord};
use crate::error::{AppError, AppResult};
use crate::guarded_batch::{GuardedBatchOutcome, GuardedCondition};
use crate::ids;
use crate::models::LedgerEntry;
use crate::seams::HostSeams;

pub(super) const CLAIM_FIELD: &str = "checkoutClaim";

pub(super) fn provider_idempotency_key(
    external: Option<&str>,
    namespace: &str,
    durable_identity: &str,
) -> AppResult<String> {
    if let Some(external) = external {
        return crate::checkout_contract::ExternalIdempotencyKey::parse_exact(external)
            .map(|key| key.as_str().to_string());
    }

    let mut digest = Sha256::new();
    digest.update(b"cedros-pay-provider-idempotency-v1\0");
    for part in [namespace, durable_identity] {
        digest.update((part.len() as u64).to_be_bytes());
        digest.update(part.as_bytes());
    }
    let derived = format!("{namespace}:{}", hex::encode(digest.finalize()));
    crate::checkout_contract::ExternalIdempotencyKey::parse_exact(&derived)
        .map(|key| key.as_str().to_string())
}

/// Stripe idempotency is account-wide; a browser key must never address
/// another site's or another operation's provider result. Keep local claim
/// identities unchanged and bind this derived key into their facts, so legacy
/// in-flight operations fail closed instead of silently using a new key.
pub(super) fn scoped_provider_key(
    context: &crate::ctx::RequestContext,
    operation: &str,
    identity: &str,
) -> AppResult<String> {
    let site = context.require_site_id()?;
    Ok(format!(
        "cp:{}",
        fingerprint(&serde_json::json!({
            "schemaVersion": 1, "siteId": site, "environment": context.environment,
            "operation": operation, "identity": identity,
        }))?
    ))
}

pub(super) fn fingerprint(value: &Value) -> AppResult<String> {
    let bytes = serde_json::to_vec(&canonicalize(value)).map_err(|error| {
        AppError::internal("cannot encode checkout fingerprint").with_internal(error.to_string())
    })?;
    Ok(hex::encode(Sha256::digest(bytes)))
}

pub(super) fn ledger_value(entry: &LedgerEntry, fingerprint: &str) -> AppResult<Value> {
    let mut value = serde_json::to_value(entry).map_err(|error| {
        AppError::internal("cannot encode checkout ledger entry").with_internal(error.to_string())
    })?;
    value[CLAIM_FIELD] = serde_json::json!({
        "schemaVersion": 1,
        "fingerprint": fingerprint,
    });
    Ok(value)
}

pub(super) fn merge_ledger_value(
    existing: &Value,
    entry: &LedgerEntry,
    fingerprint: &str,
) -> AppResult<Value> {
    let mut value = existing
        .as_object()
        .cloned()
        .ok_or_else(|| AppError::internal("checkout ledger row is not a JSON object"))?;
    let encoded = serde_json::to_value(entry).map_err(|error| {
        AppError::internal("cannot encode checkout ledger entry").with_internal(error.to_string())
    })?;
    let fields = encoded
        .as_object()
        .ok_or_else(|| AppError::internal("encoded checkout ledger row is not an object"))?;
    value.extend(fields.clone());
    value.insert(
        CLAIM_FIELD.to_string(),
        serde_json::json!({ "schemaVersion": 1, "fingerprint": fingerprint }),
    );
    Ok(Value::Object(value))
}

pub(super) fn stored_fingerprint(row: &EntryRecord) -> AppResult<&str> {
    row.payload
        .get(CLAIM_FIELD)
        .and_then(|claim| claim.get("fingerprint"))
        .and_then(Value::as_str)
        .filter(|fingerprint| !fingerprint.is_empty())
        .ok_or_else(|| AppError::conflict("checkout claim fingerprint is missing"))
}

pub(super) fn validate(row: &EntryRecord, expected: &str) -> AppResult<()> {
    if stored_fingerprint(row)? == expected {
        return Ok(());
    }
    Err(AppError::conflict(
        "checkout identity was already used with different payment facts",
    ))
}

pub(super) fn claim_ledger<'a, S: HostSeams>(
    db: &Db<'a, S>,
    key: &str,
    value: Value,
    fingerprint: &str,
) -> AppResult<EntryRecord> {
    if let Some(row) = db.read_one(ids::MODEL_LEDGER, key)? {
        validate(&row, fingerprint)?;
        return Ok(row);
    }
    let conditions = [GuardedCondition::Absent {
        content_model_id: ids::MODEL_LEDGER,
        entry_key: key.to_string(),
    }];
    let ops = [BatchOp::Write {
        content_model_id: ids::MODEL_LEDGER,
        entry_key: key.to_string(),
        data: value,
    }];
    if matches!(
        db.guarded_batch(&conditions, &ops)?,
        GuardedBatchOutcome::Conflict { .. }
    ) {
        let row = db
            .read_one(ids::MODEL_LEDGER, key)?
            .ok_or_else(|| AppError::conflict("checkout claim changed concurrently; retry"))?;
        validate(&row, fingerprint)?;
        return Ok(row);
    }
    db.read_one(ids::MODEL_LEDGER, key)?
        .ok_or_else(|| AppError::internal("applied checkout claim was not readable"))
}

pub(super) fn version_guard(row: &EntryRecord, key: &str) -> AppResult<GuardedCondition> {
    let expected_version = row
        .version
        .clone()
        .ok_or_else(|| AppError::internal("database entry omitted required concurrency version"))?;
    Ok(GuardedCondition::Version {
        content_model_id: ids::MODEL_LEDGER,
        entry_key: key.to_string(),
        expected_version,
    })
}

pub(super) fn release<S: HostSeams>(
    db: &Db<'_, S>,
    row: &EntryRecord,
    key: &str,
    fingerprint: &str,
) -> AppResult<()> {
    validate(row, fingerprint)?;
    let conditions = [version_guard(row, key)?];
    let ops = [BatchOp::Delete {
        content_model_id: ids::MODEL_LEDGER,
        entry_key: key.to_string(),
    }];
    if matches!(
        db.guarded_batch(&conditions, &ops)?,
        GuardedBatchOutcome::Conflict { .. }
    ) {
        return Err(AppError::conflict(
            "checkout claim changed while releasing provider failure",
        ));
    }
    Ok(())
}

fn canonicalize(value: &Value) -> Value {
    match value {
        Value::Object(object) => {
            let sorted = object
                .iter()
                .map(|(key, value)| (key.clone(), canonicalize(value)))
                .collect::<BTreeMap<_, _>>();
            let mut object = Map::new();
            object.extend(sorted);
            Value::Object(object)
        }
        Value::Array(values) => Value::Array(values.iter().map(canonicalize).collect()),
        other => other.clone(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn provider_key_validates_external_values_and_bounds_derived_values() {
        assert_eq!(
            provider_idempotency_key(Some("attempt-1"), "pi", "ignored").unwrap(),
            "attempt-1"
        );
        assert!(provider_idempotency_key(Some(" bad"), "pi", "ignored").is_err());

        let first = provider_idempotency_key(None, "pi", &"r".repeat(10_000)).unwrap();
        let replay = provider_idempotency_key(None, "pi", &"r".repeat(10_000)).unwrap();
        assert_eq!(first, replay);
        assert_eq!(
            first.len(),
            crate::checkout_contract::MAX_IDEMPOTENCY_KEY_LENGTH
        );
        assert!(first.starts_with("pi:"));
    }
}

#[cfg(test)]
mod scoped_key_tests {
    use super::*;
    #[test]
    fn provider_identity_is_site_environment_and_operation_bound() {
        let ctx = crate::ctx::RequestContext::parse(r#"{"siteId":"site-a","environment":"live"}"#);
        let first = scoped_provider_key(&ctx, "create", "shared-attempt").unwrap();
        assert_eq!(
            first,
            scoped_provider_key(&ctx, "create", "shared-attempt").unwrap()
        );
        assert_ne!(
            first,
            scoped_provider_key(&ctx, "cancel", "shared-attempt").unwrap()
        );
        for other in [
            r#"{"siteId":"site-b","environment":"live"}"#,
            r#"{"siteId":"site-a","environment":"test"}"#,
        ] {
            assert_ne!(
                first,
                scoped_provider_key(
                    &crate::ctx::RequestContext::parse(other),
                    "create",
                    "shared-attempt"
                )
                .unwrap()
            );
        }
        assert!(scoped_provider_key(
            &crate::ctx::RequestContext::default(),
            "create",
            "shared-attempt"
        )
        .is_err());
        assert_eq!(first.len(), 67);
    }
}
