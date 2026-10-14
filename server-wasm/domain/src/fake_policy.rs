//! Guarded-only write-policy behavior for the domain test seam.

use serde_json::{json, Value};

use super::{err, FakeSeams, HostResult, StoredEntry};

const GUARDED_ONLY: &str = "guarded-only";
const OPEN: &str = "open";

pub(super) fn enforce(seams: &FakeSeams, model: &str) -> HostResult<()> {
    if model.contains(':') && seams.guarded_only_models.borrow().contains(model) {
        return Err(err(&format!(
            "collection {model} is guarded-only: mutations must run through a guarded conditional batch"
        )));
    }
    Ok(())
}

pub(super) fn execute_plain_batch(
    seams: &FakeSeams,
    request: &Value,
    supports_policy: bool,
) -> HostResult<String> {
    let ops = request["ops"].as_array().ok_or_else(|| err("no ops"))?;
    let policies = validate_sequence(seams, ops, supports_policy)?;
    apply_ops(seams, ops)?;
    *seams.guarded_only_models.borrow_mut() = policies;
    Ok(json!({ "applied": ops.len() }).to_string())
}

fn validate_sequence(
    seams: &FakeSeams,
    ops: &[Value],
    supports_policy: bool,
) -> HostResult<std::collections::BTreeSet<String>> {
    let mut policies = seams.guarded_only_models.borrow().clone();
    for op in ops {
        let model = op["contentModelId"]
            .as_str()
            .filter(|model| !model.is_empty())
            .ok_or_else(|| err("no model"))?;
        match op["op"].as_str() {
            Some("write" | "delete") => {
                require_key(op)?;
                if model.contains(':') && policies.contains(model) {
                    return Err(err(&format!(
                        "collection {model} is guarded-only: mutations must run through a guarded conditional batch"
                    )));
                }
            }
            Some("setWritePolicy") if supports_policy => update_policy(&mut policies, model, op)?,
            _ => return Err(err("bad op")),
        }
    }
    Ok(policies)
}

fn require_key(op: &Value) -> HostResult<&str> {
    op["entryKey"]
        .as_str()
        .filter(|key| !key.is_empty())
        .ok_or_else(|| err("no key"))
}

pub(super) fn update_policy(
    policies: &mut std::collections::BTreeSet<String>,
    model: &str,
    op: &Value,
) -> HostResult<()> {
    match op["policy"].as_str() {
        Some(GUARDED_ONLY) => {
            policies.insert(model.into());
        }
        Some(OPEN) => {
            policies.remove(model);
        }
        _ => return Err(err("setWritePolicy policy must be guarded-only or open")),
    }
    Ok(())
}

fn apply_ops(seams: &FakeSeams, ops: &[Value]) -> HostResult<()> {
    let now = *seams.now.borrow();
    let mut db = seams.db.borrow_mut();
    for op in ops {
        let model = op["contentModelId"].as_str().expect("validated");
        match op["op"].as_str() {
            Some("write") => {
                let key = require_key(op)?;
                let entry = StoredEntry {
                    payload: op.get("data").cloned().unwrap_or(Value::Null),
                    updated_at: now,
                    version: seams.new_version(),
                };
                db.entry(model.into())
                    .or_default()
                    .insert(key.into(), entry);
            }
            Some("delete") => {
                let key = require_key(op)?;
                if let Some(collection) = db.get_mut(model) {
                    collection.remove(key);
                }
            }
            Some("setWritePolicy") => {}
            _ => unreachable!("validated"),
        }
    }
    Ok(())
}
