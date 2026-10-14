//! Capacity records use a distinct discriminator/key namespace within the already
//! guarded subscription collection. They never have legacy customerRef/status
//! fields, and cannot participate in base selection or provisioning.
use super::wire;
use crate::{
    db::{BatchOp, Db, EntryRecord, Filter, Op, Query},
    error::{AppError, AppResult},
    guarded_batch::{GuardedBatchOutcome, GuardedCondition},
    ids,
    seams::HostSeams,
};
use serde_json::{json, Value};
pub const MODEL: &str = ids::MODEL_SUBSCRIPTIONS;
pub fn key(kind: &str, identity: &Value) -> AppResult<String> {
    Ok(format!(
        "capacity:{kind}:{}",
        wire::digest(identity)?.trim_start_matches("sha256:")
    ))
}
pub fn get<S: HostSeams>(s: &S, key: &str) -> AppResult<Option<EntryRecord>> {
    Db::new(s, ids::DB_ACCESS).read_one(MODEL, key)
}
pub fn condition(key: &str, row: Option<&EntryRecord>) -> GuardedCondition {
    match row {
        Some(row) => GuardedCondition::Version {
            content_model_id: MODEL,
            entry_key: key.into(),
            expected_version: row.version.clone().unwrap_or_default(),
        },
        None => GuardedCondition::Absent {
            content_model_id: MODEL,
            entry_key: key.into(),
        },
    }
}
pub fn write(key: &str, mut value: Value) -> BatchOp {
    value["capacitySortKey"] = key.into();
    BatchOp::Write {
        content_model_id: MODEL,
        entry_key: key.into(),
        data: value,
    }
}
pub fn commit<S: HostSeams>(
    s: &S,
    conditions: &[GuardedCondition],
    ops: &[BatchOp],
) -> AppResult<bool> {
    Ok(matches!(
        Db::new(s, ids::DB_ACCESS).guarded_batch(conditions, ops)?,
        GuardedBatchOutcome::Applied { .. }
    ))
}
pub fn scope(binding: &Value) -> Value {
    json!({"payInstallationId":binding["payInstallationId"],"environment":binding["environment"],"organizationId":binding["scope"]["organizationId"]})
}
pub fn scoped_record(kind: &str, scope: &Value, data: Value) -> Value {
    json!({"capacityRecordType":kind,"capacityScope":scope,"data":data})
}
pub fn list<S: HostSeams>(s: &S, kind: &str, scope: Option<&Value>) -> AppResult<Vec<EntryRecord>> {
    let mut q = Query::new().filter(Filter::new("capacityRecordType", Op::Eq, kind));
    if let Some(scope) = scope {
        q = q.filter(Filter::new("capacityScope", Op::Eq, scope.clone()));
    }
    let q = q.order("capacitySortKey", crate::db::Dir::Asc);
    complete_read(s, MODEL, &q)
}
pub fn complete_read<S: HostSeams>(s: &S, model: &str, q: &Query) -> AppResult<Vec<EntryRecord>> {
    let db = Db::new(s, ids::DB_ACCESS);
    let expected = db.count(model, q)?;
    if !(0..=10_000).contains(&expected) {
        return Err(wire::unavailable());
    }
    let rows = db.read_paged(model, q, 100, 100)?;
    let unique = rows
        .iter()
        .map(|r| &r.entry_key)
        .collect::<std::collections::BTreeSet<_>>();
    if rows.len() as i64 != expected
        || unique.len() != rows.len()
        || db.count(model, q)? != expected
    {
        return Err(wire::unavailable());
    }
    Ok(rows)
}
pub fn claim_receipt<S: HostSeams>(
    s: &S,
    identity: &Value,
    command: &Value,
) -> AppResult<EntryRecord> {
    let key = key("receipt", identity)?;
    let digest = wire::digest(command)?;
    for _ in 0..4 {
        if let Some(row) = get(s, &key).map_err(|e| receipt_error(s, "read", e))? {
            if row.payload["commandDigest"] != digest {
                return Err(wire::conflict("idempotency_conflict"));
            }
            return Ok(row);
        }
        let value = json!({"capacityRecordType":"receipt","commandDigest":digest,"capacityIdentity":identity,"command":command,"outcome":null,"operationId":wire::random("capop")?,"createdAt":crate::time::iso8601(s.now_unix_secs())});
        if commit(s, &[condition(&key, None)], &[write(&key, value)])
            .map_err(|e| receipt_error(s, "compare-and-set", e))?
        {
            return get(s, &key)
                .map_err(|e| receipt_error(s, "read-back", e))?
                .ok_or_else(wire::unavailable);
        }
    }
    Err(wire::unavailable())
}
fn receipt_error<S: HostSeams>(s: &S, step: &'static str, error: AppError) -> AppError {
    let kind = match error.message.as_str() {
        "a backend dependency failed" => "host-import",
        "database returned an unexpected shape" => "read-shape",
        "database returned an unexpected guarded batch shape" => "compare-and-set-shape",
        "database returned an invalid guarded batch outcome" => "compare-and-set-outcome",
        _ => "other",
    };
    s.log(
        "warn",
        &format!(
            "capacity receipt failed step={step} kind={kind} code={}",
            error.code
        ),
    );
    error
}
pub fn finish<S: HostSeams>(s: &S, receipt: &EntryRecord, outcome: &Value) -> AppResult<Value> {
    for _ in 0..4 {
        let row = get(s, &receipt.entry_key)?.ok_or_else(wire::unavailable)?;
        if !row.payload["outcome"].is_null() {
            return Ok(row.payload["outcome"].clone());
        }
        let mut next = row.payload.clone();
        next["outcome"] = outcome.clone();
        if commit(
            s,
            &[condition(&row.entry_key, Some(&row))],
            &[write(&row.entry_key, next)],
        )? {
            return Ok(outcome.clone());
        }
    }
    Err(wire::unavailable())
}
