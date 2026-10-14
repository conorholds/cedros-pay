use std::collections::BTreeMap;

use serde_json::{json, Value};

use crate::db::{BatchOp, Db, EntryRecord, Filter, Op, Query};
use crate::error::{AppError, AppResult};
use crate::guarded_batch::{GuardedBatchOutcome, GuardedCondition};
use crate::ids;
use crate::seams::HostSeams;

const PAGE_SIZE: i64 = 100;
const MAX_CATALOG_ENTRIES: usize = 10_000;

enum Mutation<'a> {
    Create(&'a str, &'a Value),
    Update(&'a str, &'a Value),
    Delete(&'a str),
}

pub(crate) fn create<S: HostSeams>(seams: &S, key: &str, value: &Value) -> AppResult<()> {
    commit(seams, Mutation::Create(key, value), None, &[]).map(|_| ())
}

pub(crate) fn create_guarded<S: HostSeams>(
    seams: &S,
    key: &str,
    value: &Value,
    additional_conditions: &[GuardedCondition],
) -> AppResult<()> {
    commit(
        seams,
        Mutation::Create(key, value),
        None,
        additional_conditions,
    )
    .map(|_| ())
}

pub(crate) fn update<S: HostSeams>(seams: &S, key: &str, value: &Value) -> AppResult<()> {
    commit(seams, Mutation::Update(key, value), None, &[]).map(|_| ())
}

pub(crate) fn update_versioned<S: HostSeams>(
    seams: &S,
    key: &str,
    value: &Value,
    expected_version: &str,
) -> AppResult<()> {
    update_versioned_guarded(seams, key, value, expected_version, &[])
}

pub(crate) fn update_versioned_guarded<S: HostSeams>(
    seams: &S,
    key: &str,
    value: &Value,
    expected_version: &str,
    additional_conditions: &[GuardedCondition],
) -> AppResult<()> {
    commit(
        seams,
        Mutation::Update(key, value),
        Some(expected_version),
        additional_conditions,
    )
    .map(|_| ())
}

pub(crate) fn delete<S: HostSeams>(seams: &S, key: &str) -> AppResult<bool> {
    commit(seams, Mutation::Delete(key), None, &[])
}

pub(crate) fn delete_versioned<S: HostSeams>(
    seams: &S,
    key: &str,
    expected_version: &str,
) -> AppResult<bool> {
    commit(seams, Mutation::Delete(key), Some(expected_version), &[])
}

fn commit<S: HostSeams>(
    seams: &S,
    mutation: Mutation<'_>,
    expected_target_version: Option<&str>,
    additional_conditions: &[GuardedCondition],
) -> AppResult<bool> {
    super::marker_required(seams)?;
    for _ in 0..3 {
        let db = Db::new(seams, ids::DB_ACCESS);
        let (mut catalog, fence) = load(&db)?;
        let target = target_entry(&db, &mutation)?;
        let existed = target.is_some();
        validate_precondition(&mutation, existed)?;
        apply_catalog_mutation(&mut catalog, &mutation);
        super::validate_unique_product_slugs(&catalog)?;
        super::validate_catalog(&catalog)?;
        let mut conditions = conditions(
            &mutation,
            target.as_ref(),
            fence.as_ref(),
            expected_target_version,
        )?;
        conditions.extend_from_slice(additional_conditions);
        let ops = ops(seams, &mutation)?;
        if matches!(
            db.guarded_batch(&conditions, &ops)?,
            GuardedBatchOutcome::Applied { .. }
        ) {
            return Ok(existed);
        }
    }
    Err(AppError::conflict(
        "catalog changed during bounded category validation attempts",
    ))
}

fn load<S: HostSeams>(db: &Db<'_, S>) -> AppResult<(BTreeMap<String, Value>, Option<EntryRecord>)> {
    let fence = db.read_one(ids::MODEL_CATALOG_FENCE, super::FENCE_KEY)?;
    let rows = db.read_paged(
        ids::MODEL_CATALOG,
        &Query::new().filter(Filter::new("active", Op::Eq, true)),
        PAGE_SIZE,
        (MAX_CATALOG_ENTRIES / PAGE_SIZE as usize) + 1,
    )?;
    if rows.len() > MAX_CATALOG_ENTRIES {
        return Err(AppError::unprocessable(
            "active public catalog exceeds bounded category validation scan",
        ));
    }
    let mut catalog = BTreeMap::new();
    for row in rows {
        if row.entry_key != super::FENCE_KEY {
            catalog.insert(row.entry_key, row.payload);
        }
    }
    Ok((catalog, fence))
}

fn target_entry<S: HostSeams>(
    db: &Db<'_, S>,
    mutation: &Mutation<'_>,
) -> AppResult<Option<EntryRecord>> {
    match mutation {
        Mutation::Create(key, _) | Mutation::Update(key, _) | Mutation::Delete(key) => {
            db.read_one(ids::MODEL_CATALOG, key)
        }
    }
}

fn validate_precondition(mutation: &Mutation<'_>, exists: bool) -> AppResult<()> {
    match mutation {
        Mutation::Create(_, _) if exists => Err(AppError::conflict("product id already exists")),
        Mutation::Update(_, _) if !exists => Err(AppError::not_found("product not found")),
        _ => Ok(()),
    }
}

fn apply_catalog_mutation(catalog: &mut BTreeMap<String, Value>, mutation: &Mutation<'_>) {
    match mutation {
        Mutation::Create(key, value) | Mutation::Update(key, value) => {
            catalog.insert((*key).into(), (*value).clone());
        }
        Mutation::Delete(key) => {
            catalog.remove(*key);
        }
    }
}

fn conditions(
    mutation: &Mutation<'_>,
    target: Option<&EntryRecord>,
    fence: Option<&EntryRecord>,
    expected_target_version: Option<&str>,
) -> AppResult<Vec<GuardedCondition>> {
    let mut conditions = Vec::with_capacity(2);
    let key = match mutation {
        Mutation::Create(key, _) | Mutation::Update(key, _) | Mutation::Delete(key) => key,
    };
    conditions.push(match expected_target_version {
        Some(expected_version) => GuardedCondition::Version {
            content_model_id: ids::MODEL_CATALOG,
            entry_key: (*key).into(),
            expected_version: expected_version.into(),
        },
        None => condition(ids::MODEL_CATALOG, key, target)?,
    });
    conditions.push(condition(
        ids::MODEL_CATALOG_FENCE,
        super::FENCE_KEY,
        fence,
    )?);
    Ok(conditions)
}

fn condition(
    content_model_id: &'static str,
    key: &str,
    entry: Option<&EntryRecord>,
) -> AppResult<GuardedCondition> {
    Ok(match entry {
        Some(entry) => GuardedCondition::Version {
            content_model_id,
            entry_key: key.into(),
            expected_version: required_version(&entry.version)?,
        },
        None => GuardedCondition::Absent {
            content_model_id,
            entry_key: key.into(),
        },
    })
}

fn required_version(version: &Option<String>) -> AppResult<String> {
    version
        .clone()
        .filter(|version| !version.is_empty())
        .ok_or_else(|| AppError::internal("catalog entry is missing its version fence"))
}

fn ops<S: HostSeams>(seams: &S, mutation: &Mutation<'_>) -> AppResult<Vec<BatchOp>> {
    let mut ops = Vec::with_capacity(2);
    match mutation {
        Mutation::Create(key, value) | Mutation::Update(key, value) => ops.push(BatchOp::Write {
            content_model_id: ids::MODEL_CATALOG,
            entry_key: (*key).into(),
            data: (*value).clone(),
        }),
        Mutation::Delete(key) => ops.push(BatchOp::Delete {
            content_model_id: ids::MODEL_CATALOG,
            entry_key: (*key).into(),
        }),
    }
    ops.push(BatchOp::Write {
        content_model_id: ids::MODEL_CATALOG_FENCE,
        entry_key: super::FENCE_KEY.into(),
        data: json!({
            "recordType": "seoSnapshotFence",
            "updatedAt": crate::time::iso8601(seams.now_unix_secs())
        }),
    });
    Ok(ops)
}
