//! Guarded-only write-policy behavior for the host simulation store.

use serde_json::{json, Value};

use super::{SimStore, StoredEntry};

pub(super) fn enforce(store: &SimStore, model: &str) -> Result<(), String> {
    if model.contains(':') && store.guarded_only_models.contains(model) {
        return Err(format!(
            "collection {model} is guarded-only: mutations must run through a guarded conditional batch"
        ));
    }
    Ok(())
}

pub(super) fn execute_plain_batch(store: &mut SimStore, request: &Value) -> Result<String, String> {
    let ops = request["ops"].as_array().ok_or("no ops")?.clone();
    let policies = validate_sequence(store, &ops)?;
    apply_ops(store, &ops)?;
    store.guarded_only_models = policies;
    Ok(json!({ "applied": ops.len() }).to_string())
}

fn validate_sequence(
    store: &SimStore,
    ops: &[Value],
) -> Result<std::collections::BTreeSet<String>, String> {
    let mut policies = store.guarded_only_models.clone();
    for op in ops {
        let model = op["contentModelId"]
            .as_str()
            .filter(|model| !model.is_empty())
            .ok_or("no model")?;
        match op["op"].as_str() {
            Some("write" | "delete") => {
                require_key(op)?;
                if model.contains(':') && policies.contains(model) {
                    return Err(format!(
                        "collection {model} is guarded-only: mutations must run through a guarded conditional batch"
                    ));
                }
            }
            Some("setWritePolicy") => update_policy(&mut policies, model, op)?,
            _ => return Err("bad op".into()),
        }
    }
    Ok(policies)
}

fn require_key(op: &Value) -> Result<&str, String> {
    op["entryKey"]
        .as_str()
        .filter(|key| !key.is_empty())
        .ok_or_else(|| "no key".into())
}

pub(super) fn update_policy(
    policies: &mut std::collections::BTreeSet<String>,
    model: &str,
    op: &Value,
) -> Result<(), String> {
    match op["policy"].as_str() {
        Some("guarded-only") => {
            policies.insert(model.into());
        }
        Some("open") => {
            policies.remove(model);
        }
        _ => return Err("setWritePolicy policy must be guarded-only or open".into()),
    }
    Ok(())
}

fn apply_ops(store: &mut SimStore, ops: &[Value]) -> Result<(), String> {
    for op in ops {
        let model = op["contentModelId"].as_str().expect("validated");
        match op["op"].as_str() {
            Some("write") => {
                let key = require_key(op)?;
                let entry = StoredEntry {
                    payload: op.get("data").cloned().unwrap_or(Value::Null),
                    updated_at: store.now,
                    version: store.new_version(),
                };
                store
                    .db
                    .entry(model.into())
                    .or_default()
                    .insert(key.into(), entry);
            }
            Some("delete") => {
                let key = require_key(op)?;
                if let Some(collection) = store.db.get_mut(model) {
                    collection.remove(key);
                }
            }
            Some("setWritePolicy") => {}
            _ => unreachable!("validated"),
        }
    }
    Ok(())
}
