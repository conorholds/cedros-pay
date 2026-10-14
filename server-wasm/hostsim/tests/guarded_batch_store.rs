use std::sync::{Arc, Mutex};
use std::thread;

use cedros_pay_extension_hostsim::SimStore;
use serde_json::{json, Value};

const MODEL: &str = "cedros-pay:credits";

fn absent_request(key: &str, value: i64) -> String {
    json!({
        "schemaVersion": 1,
        "conditions": [{
            "contentModelId": MODEL, "entryKey": key, "predicate": "absent",
        }],
        "ops": [{
            "op": "write", "contentModelId": MODEL, "entryKey": key,
            "data": { "value": value },
        }],
    })
    .to_string()
}

#[test]
fn concurrent_absent_claim_has_exactly_one_winner() {
    let store = Arc::new(Mutex::new(SimStore::new(1_800_000_000)));
    let handles = (0..50)
        .map(|attempt| {
            let store = Arc::clone(&store);
            thread::spawn(move || {
                let raw = store
                    .lock()
                    .unwrap()
                    .batch(&absent_request("claim:1", attempt))
                    .unwrap();
                serde_json::from_str::<Value>(&raw).unwrap()["outcome"].clone()
            })
        })
        .collect::<Vec<_>>();
    let outcomes = handles
        .into_iter()
        .map(|handle| handle.join().unwrap())
        .collect::<Vec<_>>();
    assert_eq!(
        outcomes
            .iter()
            .filter(|outcome| **outcome == "applied")
            .count(),
        1
    );
    assert_eq!(
        outcomes
            .iter()
            .filter(|outcome| **outcome == "conflict")
            .count(),
        49
    );
}

#[test]
fn version_claim_rotates_token_and_stale_retry_conflicts() {
    let mut store = SimStore::new(1_800_000_000);
    store.seed(MODEL, "account:1", json!({ "balance": 10 }));
    let read: Value =
        serde_json::from_str(&store.read(MODEL, r#"{"entryKeys":["account:1"]}"#).unwrap())
            .unwrap();
    let token = read["entries"][0]["version"].as_str().unwrap();
    let request = json!({
        "schemaVersion": 1,
        "conditions": [{
            "contentModelId": MODEL, "entryKey": "account:1", "predicate": "version",
            "expectedVersion": token,
        }],
        "ops": [{
            "op": "write", "contentModelId": MODEL, "entryKey": "account:1",
            "data": { "balance": 11 },
        }],
    })
    .to_string();
    let first: Value = serde_json::from_str(&store.batch(&request).unwrap()).unwrap();
    assert_eq!(first["outcome"], "applied");
    assert_ne!(first["entries"][0]["version"], token);
    let second: Value = serde_json::from_str(&store.batch(&request).unwrap()).unwrap();
    assert_eq!(second["outcome"], "conflict");
}

#[test]
fn invalid_later_operation_cannot_partially_apply() {
    let mut store = SimStore::new(1_800_000_000);
    let request = json!({
        "schemaVersion": 1,
        "conditions": [{
            "contentModelId": MODEL, "entryKey": "claim:rollback", "predicate": "absent",
        }],
        "ops": [
            { "op": "write", "contentModelId": MODEL, "entryKey": "claim:rollback", "data": {} },
            { "op": "unknown", "contentModelId": MODEL, "entryKey": "audit:rollback" },
        ],
    });
    assert_eq!(store.batch(&request.to_string()).unwrap_err(), "bad op");
    assert!(store.get(MODEL, "claim:rollback").is_none());
}

#[test]
fn duplicate_targets_are_rejected_without_writes() {
    let mut store = SimStore::new(1_800_000_000);
    let mut request: Value = serde_json::from_str(&absent_request("claim:duplicate", 1)).unwrap();
    let duplicate = request["ops"][0].clone();
    request["ops"].as_array_mut().unwrap().push(duplicate);
    assert_eq!(
        store.batch(&request.to_string()).unwrap_err(),
        "duplicate operation target"
    );
    assert!(store.get(MODEL, "claim:duplicate").is_none());
}

#[test]
fn guarded_only_policy_enforces_full_lifecycle() {
    let mut store = SimStore::new(1_800_000_000);
    store.seed(MODEL, "account:policy", json!({ "balance": 1 }));
    let enroll = json!({
        "ops": [{
            "op": "setWritePolicy", "contentModelId": MODEL, "policy": "guarded-only",
        }],
    });
    let applied: Value = serde_json::from_str(&store.batch(&enroll.to_string()).unwrap()).unwrap();
    assert_eq!(applied["applied"], 1);

    let error = store
        .write(MODEL, "account:policy", r#"{"balance":0}"#)
        .unwrap_err();
    assert!(error.contains("guarded-only"));
    assert!(store.delete(MODEL, "account:policy").is_err());
    assert_eq!(
        store.get(MODEL, "account:policy"),
        Some(json!({ "balance": 1 }))
    );

    let read: Value = serde_json::from_str(
        &store
            .read(MODEL, r#"{"entryKeys":["account:policy"]}"#)
            .unwrap(),
    )
    .unwrap();
    let guarded = json!({
        "schemaVersion": 1,
        "conditions": [{
            "contentModelId": MODEL, "entryKey": "account:policy", "predicate": "version",
            "expectedVersion": read["entries"][0]["version"],
        }],
        "ops": [{
            "op": "write", "contentModelId": MODEL, "entryKey": "account:policy",
            "data": { "balance": 2 },
        }],
    });
    assert!(store.batch(&guarded.to_string()).is_ok());

    let open = json!({
        "ops": [{ "op": "setWritePolicy", "contentModelId": MODEL, "policy": "open" }],
    });
    store.batch(&open.to_string()).expect("open policy");
    store
        .write(MODEL, "account:policy", r#"{"balance":3}"#)
        .expect("plain write restored");
}

#[test]
fn invalid_policy_batch_is_atomic() {
    let mut store = SimStore::new(1_800_000_000);
    let request = json!({
        "ops": [
            { "op": "write", "contentModelId": MODEL, "entryKey": "new", "data": {} },
            { "op": "setWritePolicy", "contentModelId": MODEL, "policy": "unknown" },
        ],
    });
    assert!(store.batch(&request.to_string()).is_err());
    assert!(store.get(MODEL, "new").is_none());
}
