//! Atomic schema-v1 guarded batches for the host simulation store.

use serde_json::{json, Value};
use std::collections::BTreeSet;

use super::{SimStore, StoredEntry};

pub(super) fn execute(store: &mut SimStore, request: &Value) -> Result<String, String> {
    validate(request)?;
    let conditions = request["conditions"].as_array().expect("validated");
    for (index, condition) in conditions.iter().enumerate() {
        if !matches_condition(store, condition) {
            return Ok(conflict(index, condition).to_string());
        }
    }
    let ops = request["ops"].as_array().expect("validated").clone();
    let mut db = store.db.clone();
    let mut policies = store.guarded_only_models.clone();
    let failure_after = store.guarded_failure_after_ops.take();
    let mut entries = Vec::new();
    for (index, op) in ops.iter().enumerate() {
        match op["op"].as_str() {
            Some("write") => {
                let model = op["contentModelId"].as_str().expect("validated");
                let key = op["entryKey"].as_str().expect("validated");
                let version = store.new_version();
                let entry = StoredEntry {
                    payload: op.get("data").cloned().unwrap_or(Value::Null),
                    updated_at: store.now,
                    version: version.clone(),
                };
                db.entry(model.into())
                    .or_default()
                    .insert(key.into(), entry);
                entries.push(json!({
                    "contentModelId": model, "entryKey": key, "version": version,
                }));
            }
            Some("delete") => {
                let model = op["contentModelId"].as_str().expect("validated");
                let key = op["entryKey"].as_str().expect("validated");
                if let Some(collection) = db.get_mut(model) {
                    collection.remove(key);
                }
            }
            Some("setWritePolicy") => {
                let model = op["contentModelId"].as_str().expect("validated");
                super::policy::update_policy(&mut policies, model, op)?;
            }
            _ => return Err("bad op".into()),
        }
        if failure_after == Some(index + 1) {
            return Err("injected guarded batch failure".into());
        }
    }
    store.db = db;
    store.guarded_only_models = policies;
    Ok(json!({ "outcome": "applied", "applied": ops.len(), "entries": entries }).to_string())
}

fn validate(request: &Value) -> Result<(), String> {
    if request["schemaVersion"].as_u64() != Some(1) {
        return Err("unsupported schema version".into());
    }
    let conditions = request["conditions"].as_array().ok_or("no conditions")?;
    let ops = request["ops"].as_array().ok_or("no ops")?;
    if conditions.is_empty() || conditions.len() > 32 || ops.is_empty() || ops.len() > 128 {
        return Err("guarded batch bounds exceeded".into());
    }
    validate_conditions(conditions)?;
    validate_ops(ops)?;
    Ok(())
}

fn validate_conditions(conditions: &[Value]) -> Result<(), String> {
    let mut targets = BTreeSet::new();
    for condition in conditions {
        let target = target(condition)?;
        if !targets.insert(target) {
            return Err("duplicate condition target".into());
        }
        match condition["predicate"].as_str() {
            Some("absent") => {}
            Some("version")
                if condition["expectedVersion"]
                    .as_str()
                    .is_some_and(|v| !v.is_empty()) => {}
            _ => return Err("bad condition".into()),
        }
    }
    Ok(())
}

fn validate_ops(ops: &[Value]) -> Result<(), String> {
    let mut targets = BTreeSet::new();
    for op in ops {
        match op["op"].as_str() {
            Some("write") if op.get("data").is_some() => insert_target(&mut targets, op)?,
            Some("delete") => insert_target(&mut targets, op)?,
            Some("setWritePolicy") => {
                let model = op["contentModelId"]
                    .as_str()
                    .filter(|model| !model.is_empty())
                    .ok_or("no model")?;
                let mut policies = std::collections::BTreeSet::new();
                super::policy::update_policy(&mut policies, model, op)?;
            }
            _ => return Err("bad op".into()),
        }
    }
    Ok(())
}

fn insert_target<'a>(
    targets: &mut BTreeSet<(&'a str, &'a str)>,
    op: &'a Value,
) -> Result<(), String> {
    if !targets.insert(target(op)?) {
        return Err("duplicate operation target".into());
    }
    Ok(())
}

fn target(value: &Value) -> Result<(&str, &str), String> {
    let model = value["contentModelId"].as_str().ok_or("no model")?;
    let key = value["entryKey"].as_str().ok_or("no key")?;
    if model.is_empty() || key.is_empty() {
        return Err("empty target".into());
    }
    Ok((model, key))
}

fn matches_condition(store: &SimStore, condition: &Value) -> bool {
    let Some(model) = condition["contentModelId"].as_str() else {
        return false;
    };
    let Some(key) = condition["entryKey"].as_str() else {
        return false;
    };
    let entry = store
        .db
        .get(model)
        .and_then(|collection| collection.get(key));
    match condition["predicate"].as_str() {
        Some("absent") => entry.is_none(),
        Some("version") => {
            entry.map(|row| row.version.as_str()) == condition["expectedVersion"].as_str()
        }
        _ => false,
    }
}

fn conflict(index: usize, condition: &Value) -> Value {
    json!({
        "outcome": "conflict",
        "conflict": {
            "conditionIndex": index,
            "contentModelId": condition["contentModelId"],
            "entryKey": condition["entryKey"],
            "predicate": condition["predicate"],
        }
    })
}
