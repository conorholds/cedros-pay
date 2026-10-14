//! Test-only emulation of Core's extension configuration CAS operation.

use serde_json::{json, Value};

use super::{err, FakeSeams, StoredEntry};
use crate::seams::{HostError, HostResult};

impl FakeSeams {
    pub fn push_provider_error(&self, message: &str) {
        self.provider_responses
            .borrow_mut()
            .push_back(Err(HostError::new(message)));
    }

    pub fn set_blockchain_config(&self, config: Value) {
        *self.blockchain_config.borrow_mut() = Some(config);
    }
}

pub(super) fn execute(seams: &FakeSeams, params: &Value) -> HostResult<Value> {
    let mutation_id = params["mutationId"]
        .as_str()
        .ok_or_else(|| err("configuration mutationId is required"))?;
    if let Some((recorded, output)) = seams.config_receipts.borrow().get(mutation_id) {
        if recorded != params {
            return Err(err(
                "configuration mutationId was reused with different request material",
            ));
        }
        let mut replay = output.clone();
        replay["alreadyApplied"] = json!(true);
        return Ok(replay);
    }

    let expected = params["expectedRevision"].as_str();
    if seams.config_revision.borrow().as_deref() != expected {
        return Err(err(
            "cedros.db.v1|precondition|extension.configuration.compare-and-set",
        ));
    }
    for change in params["settings"].as_array().into_iter().flatten() {
        let key = change["key"]
            .as_str()
            .ok_or_else(|| err("configuration setting key is required"))?;
        seams
            .settings
            .borrow_mut()
            .insert(key.into(), change["value"].to_string());
    }
    for change in params["secrets"].as_array().into_iter().flatten() {
        let key = change["key"]
            .as_str()
            .ok_or_else(|| err("configuration secret key is required"))?;
        match change["action"].as_str() {
            Some("set") => {
                let value = change["value"]
                    .as_str()
                    .ok_or_else(|| err("configuration secret value is required"))?;
                seams.secrets.borrow_mut().insert(key.into(), value.into());
            }
            Some("delete") => {
                seams.secrets.borrow_mut().remove(key);
            }
            _ => return Err(err("invalid configuration secret action")),
        }
    }

    let revision = seams.new_version();
    *seams.config_revision.borrow_mut() = Some(revision.clone());
    let audit = &params["audit"];
    let audit_key = audit["entryKey"]
        .as_str()
        .ok_or_else(|| err("configuration audit entryKey is required"))?;
    let payload = json!({
        "mutationId": mutation_id,
        "previousRevision": expected,
        "committedRevision": revision,
        "changedKeys": audit["changedKeys"],
        "actorId": audit["actorId"],
        "reason": audit["reason"],
    });
    let now = *seams.now.borrow() + seams.config_receipts.borrow().len() as i64;
    let row_version = seams.new_version();
    seams
        .db
        .borrow_mut()
        .entry(crate::ids::MODEL_CONFIG_AUDIT.into())
        .or_default()
        .insert(
            audit_key.into(),
            StoredEntry {
                payload,
                updated_at: now,
                version: row_version,
            },
        );
    let output = json!({"committedRevision": revision, "alreadyApplied": false});
    seams
        .config_receipts
        .borrow_mut()
        .insert(mutation_id.into(), (params.clone(), output.clone()));
    Ok(output)
}
