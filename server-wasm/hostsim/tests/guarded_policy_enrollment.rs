use std::sync::{Arc, Mutex};
use std::thread;

use cedros_pay_extension_domain::guarded_policy::{
    ACTIVE_POLICY, CAPABILITY_ID, CONTROL_MODEL, GUARDED_MODELS, HOST_COMMIT, MARKER_KEY,
    MIN_DATA_VERSION, MODEL_SET_SHA256, REQUEST_SCHEMA_VERSION,
};
use cedros_pay_extension_hostsim::SimStore;
use serde_json::{json, Value};

#[test]
fn injected_enrollment_failure_has_no_policy_or_marker() {
    let mut store = SimStore::new(1_800_000_000);
    store.fail_next_guarded_batch_after(6);
    assert_eq!(
        store.batch(&enrollment_request(false)).unwrap_err(),
        "injected guarded batch failure"
    );
    assert!(store.guarded_models().is_empty());
    assert!(store.get(CONTROL_MODEL, MARKER_KEY).is_none());
}

#[test]
fn opposite_order_workers_have_one_winner_and_one_exact_marker() {
    let store = Arc::new(Mutex::new(SimStore::new(1_800_000_000)));
    let workers = (0..20)
        .map(|index| {
            let store = Arc::clone(&store);
            thread::spawn(move || {
                let raw = store
                    .lock()
                    .unwrap()
                    .batch(&enrollment_request(index % 2 == 1))
                    .unwrap();
                serde_json::from_str::<Value>(&raw).unwrap()["outcome"].clone()
            })
        })
        .collect::<Vec<_>>();
    let outcomes = workers
        .into_iter()
        .map(|worker| worker.join().unwrap())
        .collect::<Vec<_>>();
    assert_eq!(
        outcomes.iter().filter(|value| **value == "applied").count(),
        1
    );
    assert_eq!(
        outcomes
            .iter()
            .filter(|value| **value == "conflict")
            .count(),
        19
    );
    let store = store.lock().unwrap();
    assert_eq!(store.guarded_models(), expected_models());
    assert_eq!(store.get(CONTROL_MODEL, MARKER_KEY), Some(marker()));
}

#[test]
fn all_models_enforce_plain_and_allow_guarded_write_delete() {
    let mut store = SimStore::new(1_800_000_000);
    let applied: Value =
        serde_json::from_str(&store.batch(&enrollment_request(false)).unwrap()).unwrap();
    assert_eq!(applied["outcome"], "applied");
    for model in GUARDED_MODELS {
        assert!(store.write(model, "plain", "{}").is_err(), "{model}");
        let written: Value =
            serde_json::from_str(&store.batch(&guarded_write(model, "guarded")).unwrap()).unwrap();
        let version = written["entries"][0]["version"].as_str().unwrap();
        assert!(store.delete(model, "guarded").is_err(), "{model}");
        assert_eq!(
            serde_json::from_str::<Value>(
                &store
                    .batch(&guarded_delete(model, "guarded", version))
                    .unwrap()
            )
            .unwrap()["outcome"],
            "applied"
        );
    }
    store.write(CONTROL_MODEL, "open-probe", "{}").unwrap();
    assert!(store
        .delete(CONTROL_MODEL, "open-probe")
        .unwrap()
        .contains("true"));
}

fn enrollment_request(reverse: bool) -> String {
    let mut models = GUARDED_MODELS.to_vec();
    if reverse {
        models.reverse();
    }
    let mut ops = models
        .into_iter()
        .map(|model| {
            json!({
                "op": "setWritePolicy", "contentModelId": model, "policy": ACTIVE_POLICY,
            })
        })
        .collect::<Vec<_>>();
    ops.push(json!({
        "op": "write", "contentModelId": CONTROL_MODEL,
        "entryKey": MARKER_KEY, "data": marker(),
    }));
    json!({
        "schemaVersion": REQUEST_SCHEMA_VERSION,
        "conditions": [{
            "contentModelId": CONTROL_MODEL, "entryKey": MARKER_KEY, "predicate": "absent",
        }],
        "ops": ops,
    })
    .to_string()
}

fn marker() -> Value {
    json!({
        "schemaVersion": 1,
        "capabilityId": CAPABILITY_ID,
        "minCedrosDataVersion": MIN_DATA_VERSION,
        "requestSchemaVersion": REQUEST_SCHEMA_VERSION,
        "hostCommit": HOST_COMMIT,
        "models": GUARDED_MODELS,
        "modelSetSha256": MODEL_SET_SHA256,
        "policy": ACTIVE_POLICY,
        "active": true,
        "hostTimestamp": "2027-01-15T08:00:00Z",
    })
}

fn expected_models() -> std::collections::BTreeSet<String> {
    GUARDED_MODELS.iter().map(|model| (*model).into()).collect()
}

fn guarded_write(model: &str, key: &str) -> String {
    json!({
        "schemaVersion": 1,
        "conditions": [{
            "contentModelId": model, "entryKey": key, "predicate": "absent",
        }],
        "ops": [{
            "op": "write", "contentModelId": model, "entryKey": key, "data": {},
        }],
    })
    .to_string()
}

fn guarded_delete(model: &str, key: &str, version: &str) -> String {
    json!({
        "schemaVersion": 1,
        "conditions": [{
            "contentModelId": model, "entryKey": key, "predicate": "version",
            "expectedVersion": version,
        }],
        "ops": [{ "op": "delete", "contentModelId": model, "entryKey": key }],
    })
    .to_string()
}
