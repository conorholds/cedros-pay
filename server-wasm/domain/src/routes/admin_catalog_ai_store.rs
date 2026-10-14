use serde_json::{Map, Value};

use crate::db::{BatchOp, Db, EntryRecord, Query};
use crate::error::{AppError, AppResult};
use crate::guarded_batch::{GuardedBatchOutcome, GuardedCondition};
use crate::ids;
use crate::routes::products::catalog::seo_categories;
use crate::seams::HostSeams;

const PAGE_SIZE: i64 = 100;
const MAX_SCAN_PAGES: usize = 101;

pub(super) fn records<S: HostSeams>(seams: &S) -> AppResult<Vec<EntryRecord>> {
    let rows = Db::new(seams, ids::DB_ACCESS).read_paged(
        ids::MODEL_CATALOG,
        &Query::new(),
        PAGE_SIZE,
        MAX_SCAN_PAGES,
    )?;
    if rows.len() >= PAGE_SIZE as usize * MAX_SCAN_PAGES {
        return Err(AppError::unprocessable(
            "catalog exceeds bounded administration scan",
        ));
    }
    Ok(rows
        .into_iter()
        .filter(|entry| visible_record(&entry.entry_key, &entry.payload))
        .collect())
}

pub(in crate::routes::admin_dashboard) fn find_by_handle<S: HostSeams>(
    seams: &S,
    handle: &str,
) -> AppResult<Option<EntryRecord>> {
    let matches = records(seams)?
        .into_iter()
        .filter(|entry| stable_handle(entry) == handle)
        .collect::<Vec<_>>();
    match matches.len() {
        0 => Ok(None),
        1 => Ok(matches.into_iter().next()),
        _ => Err(AppError::conflict(format!(
            "multiple catalog records use stableHandle {handle}"
        ))),
    }
}

pub(in crate::routes::admin_dashboard) fn save<S: HostSeams>(
    seams: &S,
    existing: Option<&EntryRecord>,
    key: &str,
    value: &Value,
) -> AppResult<EntryRecord> {
    match existing {
        Some(existing) => {
            let version = existing
                .version
                .as_deref()
                .filter(|version| !version.is_empty())
                .ok_or_else(|| AppError::internal("catalog record is missing its version fence"))?;
            seo_categories::update_versioned(seams, &existing.entry_key, value, version)?;
            read_exact(seams, &existing.entry_key)
        }
        None => {
            seo_categories::create(seams, key, value)?;
            read_exact(seams, key)
        }
    }
}

pub(super) fn response_record(entry: &EntryRecord) -> Value {
    let mut object = entry.payload.as_object().cloned().unwrap_or_default();
    object.insert("id".into(), Value::String(entry.entry_key.clone()));
    object.insert(
        "catalogVersion".into(),
        entry
            .version
            .clone()
            .map(Value::String)
            .unwrap_or(Value::Null),
    );
    Value::Object(object)
}

pub(super) fn program_access_record<S: HostSeams>(
    seams: &S,
    key: &str,
) -> AppResult<Option<EntryRecord>> {
    Db::new(seams, ids::DB_ACCESS).read_one(ids::MODEL_PROGRAM_ACCESS, key)
}

pub(super) fn save_program_access<S: HostSeams>(
    seams: &S,
    existing: Option<&EntryRecord>,
    key: &str,
    value: &Value,
) -> AppResult<EntryRecord> {
    crate::guarded_policy::require_active(seams)?;
    let condition = match existing {
        Some(existing) => GuardedCondition::Version {
            content_model_id: ids::MODEL_PROGRAM_ACCESS,
            entry_key: key.to_string(),
            expected_version: existing
                .version
                .clone()
                .filter(|version| !version.is_empty())
                .ok_or_else(|| {
                    AppError::internal("program access record is missing its version fence")
                })?,
        },
        None => GuardedCondition::Absent {
            content_model_id: ids::MODEL_PROGRAM_ACCESS,
            entry_key: key.to_string(),
        },
    };
    let op = BatchOp::Write {
        content_model_id: ids::MODEL_PROGRAM_ACCESS,
        entry_key: key.to_string(),
        data: value.clone(),
    };
    if matches!(
        Db::new(seams, ids::DB_ACCESS).guarded_batch(&[condition], &[op])?,
        GuardedBatchOutcome::Conflict { .. }
    ) {
        return Err(AppError::conflict(
            "program access record changed concurrently; retry",
        ));
    }
    program_access_record(seams, key)?
        .ok_or_else(|| AppError::internal("program access mutation could not be read back"))
}

pub(super) fn program_access_response(entry: &EntryRecord) -> Value {
    let mut value = response_record(entry);
    if let Some(object) = value.as_object_mut() {
        let configured = object.remove("activationCodeSha256").is_some();
        if configured {
            object.insert("activationCodeConfigured".into(), Value::Bool(true));
        }
    }
    value
}

pub(super) fn stable_handle(entry: &EntryRecord) -> &str {
    entry
        .payload
        .get("stableHandle")
        .and_then(Value::as_str)
        .unwrap_or(&entry.entry_key)
}

pub(super) fn record_type(value: &Value) -> &str {
    value
        .get("recordType")
        .and_then(Value::as_str)
        .unwrap_or("product")
}

pub(super) fn prices(value: &Value) -> Vec<Value> {
    value
        .get("prices")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default()
}

pub(super) fn replace_prices(value: &Value, prices: Vec<Value>, now: i64) -> Value {
    let mut object = value.as_object().cloned().unwrap_or_else(Map::new);
    object.insert("prices".into(), Value::Array(prices));
    object.insert("updatedAt".into(), Value::String(crate::time::iso8601(now)));
    Value::Object(object)
}

fn read_exact<S: HostSeams>(seams: &S, key: &str) -> AppResult<EntryRecord> {
    Db::new(seams, ids::DB_ACCESS)
        .read_one(ids::MODEL_CATALOG, key)?
        .ok_or_else(|| AppError::internal("catalog mutation could not be read back"))
}

fn visible_record(key: &str, value: &Value) -> bool {
    key != seo_categories::FENCE_KEY
        && !key.starts_with("coupon:")
        && record_type(value) != "coupon"
}
