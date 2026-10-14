//! Guarded-batch behavior for the domain test seam.

use serde_json::{json, Value};
use std::collections::BTreeSet;

use super::{err, FakeSeams, HostResult, StoredEntry};

pub(super) fn execute(seams: &FakeSeams, request: &Value) -> HostResult<String> {
    validate_request(request)?;
    let conditions = request["conditions"].as_array().expect("validated");
    let mut db = seams.db.borrow().clone();
    for (index, condition) in conditions.iter().enumerate() {
        if !matches_condition(&db, condition) {
            return Ok(conflict(index, condition).to_string());
        }
    }
    let ops = request["ops"].as_array().expect("validated");
    let now = *seams.now.borrow();
    let failure_after = seams.guarded_failure_after_ops.borrow_mut().take();
    let mut policies = seams.guarded_only_models.borrow().clone();
    let mut entries = Vec::new();
    for (index, op) in ops.iter().enumerate() {
        match op["op"].as_str() {
            Some("write") => {
                let model = op["contentModelId"].as_str().expect("validated");
                let key = op["entryKey"].as_str().expect("validated");
                let version = seams.new_version();
                let stored = StoredEntry {
                    payload: op.get("data").cloned().unwrap_or(Value::Null),
                    updated_at: now,
                    version: version.clone(),
                };
                db.entry(model.into())
                    .or_default()
                    .insert(key.into(), stored);
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
            _ => return Err(err("bad op")),
        }
        if failure_after == Some(index + 1) {
            return Err(err("injected guarded batch failure"));
        }
    }
    *seams.db.borrow_mut() = db;
    *seams.guarded_only_models.borrow_mut() = policies;
    Ok(json!({ "outcome": "applied", "applied": ops.len(), "entries": entries }).to_string())
}

impl FakeSeams {
    pub fn fail_next_guarded_batch_after(&self, applied_ops: usize) {
        *self.guarded_failure_after_ops.borrow_mut() = Some(applied_ops);
    }

    pub fn guarded_models(&self) -> BTreeSet<String> {
        self.guarded_only_models.borrow().clone()
    }

    pub fn set_guarded_models(&self, models: &[&str]) {
        *self.guarded_only_models.borrow_mut() =
            models.iter().map(|model| (*model).to_string()).collect();
    }
}

fn validate_request(request: &Value) -> HostResult<()> {
    if request["schemaVersion"].as_u64() != Some(1) {
        return Err(err("unsupported schema version"));
    }
    let conditions = request["conditions"]
        .as_array()
        .ok_or_else(|| err("no conditions"))?;
    let ops = request["ops"].as_array().ok_or_else(|| err("no ops"))?;
    if conditions.is_empty() || conditions.len() > 32 || ops.is_empty() || ops.len() > 128 {
        return Err(err("guarded batch bounds exceeded"));
    }
    validate_conditions(conditions)?;
    validate_ops(ops)?;
    Ok(())
}

fn validate_conditions(conditions: &[Value]) -> HostResult<()> {
    let mut targets = BTreeSet::new();
    for condition in conditions {
        if !targets.insert(target(condition)?) {
            return Err(err("duplicate condition target"));
        }
        match condition["predicate"].as_str() {
            Some("absent") => {}
            Some("version")
                if condition["expectedVersion"]
                    .as_str()
                    .is_some_and(|v| !v.is_empty()) => {}
            _ => return Err(err("bad condition")),
        }
    }
    Ok(())
}

fn validate_ops(ops: &[Value]) -> HostResult<()> {
    let mut targets = BTreeSet::new();
    for op in ops {
        match op["op"].as_str() {
            Some("write") if op.get("data").is_some() => insert_target(&mut targets, op)?,
            Some("delete") => insert_target(&mut targets, op)?,
            Some("setWritePolicy") => {
                let model = op["contentModelId"]
                    .as_str()
                    .filter(|model| !model.is_empty())
                    .ok_or_else(|| err("no model"))?;
                let mut policies = std::collections::BTreeSet::new();
                super::policy::update_policy(&mut policies, model, op)?;
            }
            _ => return Err(err("bad op")),
        }
    }
    Ok(())
}

fn insert_target<'a>(targets: &mut BTreeSet<(&'a str, &'a str)>, op: &'a Value) -> HostResult<()> {
    if !targets.insert(target(op)?) {
        return Err(err("duplicate operation target"));
    }
    Ok(())
}

fn target(value: &Value) -> HostResult<(&str, &str)> {
    let model = value["contentModelId"]
        .as_str()
        .ok_or_else(|| err("no model"))?;
    let key = value["entryKey"].as_str().ok_or_else(|| err("no key"))?;
    if model.is_empty() || key.is_empty() {
        return Err(err("empty target"));
    }
    Ok((model, key))
}

fn matches_condition(
    db: &std::collections::BTreeMap<String, super::Collection>,
    condition: &Value,
) -> bool {
    let model = condition["contentModelId"].as_str().expect("validated");
    let key = condition["entryKey"].as_str().expect("validated");
    let entry = db.get(model).and_then(|collection| collection.get(key));
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
