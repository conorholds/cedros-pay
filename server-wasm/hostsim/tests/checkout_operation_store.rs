use std::sync::{Arc, Mutex};
use std::thread;

use cedros_pay_extension_domain::checkout_contract::OPERATION_MODEL;
use cedros_pay_extension_hostsim::SimStore;
use serde_json::{json, Value};

fn entry_key() -> String {
    format!("checkout-operation:{}", "0".repeat(64))
}

fn absent_request(key: &str, owner: usize) -> String {
    json!({
        "schemaVersion": 1,
        "conditions": [{
            "contentModelId": OPERATION_MODEL, "entryKey": key, "predicate": "absent"
        }],
        "ops": [{
            "op": "write", "contentModelId": OPERATION_MODEL, "entryKey": key,
            "data": { "schemaVersion": 1, "leaseOwner": format!("owner-{owner}") }
        }]
    })
    .to_string()
}

#[test]
fn checkout_operation_absent_claim_has_one_winner_across_workers() {
    let key = entry_key();
    let store = Arc::new(Mutex::new(SimStore::new(1_800_000_000)));
    let handles = (0..50)
        .map(|owner| {
            let store = Arc::clone(&store);
            let key = key.clone();
            thread::spawn(move || {
                let raw = store
                    .lock()
                    .unwrap()
                    .batch(&absent_request(&key, owner))
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
        outcomes.iter().filter(|value| **value == "applied").count(),
        1
    );
    assert_eq!(
        outcomes
            .iter()
            .filter(|value| **value == "conflict")
            .count(),
        49
    );
}

#[test]
fn checkout_operation_model_can_be_enforced_as_guarded_only() {
    let key = entry_key();
    let mut store = SimStore::new(1_800_000_000);
    let enroll = json!({
        "ops": [{
            "op": "setWritePolicy", "contentModelId": OPERATION_MODEL,
            "policy": "guarded-only"
        }]
    });
    store.batch(&enroll.to_string()).unwrap();
    assert!(store.write(OPERATION_MODEL, &key, "{}").is_err());

    let applied: Value =
        serde_json::from_str(&store.batch(&absent_request(&key, 1)).unwrap()).unwrap();
    assert_eq!(applied["outcome"], "applied");
    assert!(store.get(OPERATION_MODEL, &key).is_some());
}
