//! Verification-only durable snapshot coverage for the local process bridge.

use cedros_pay_extension_hostsim::{component_path, Sim, SimStore};
use serde_json::json;

#[test]
fn snapshot_round_trip_preserves_database_clock_and_next_revision() {
    let mut first = SimStore::new(1_000);
    first.seed("bridge:model", "entry-a", json!({"value": 1}));
    let snapshot = first.snapshot().expect("encode snapshot");
    let mut restored = SimStore::from_snapshot(snapshot).expect("restore snapshot");

    assert_eq!(restored.now, 1_000);
    assert_eq!(
        restored.get("bridge:model", "entry-a"),
        Some(json!({"value": 1}))
    );
    restored.seed("bridge:model", "entry-b", json!({"value": 2}));
    let read = restored
        .read(
            "bridge:model",
            r#"{"orderBy":{"field":"value","direction":"asc"}}"#,
        )
        .expect("read restored store");
    assert!(read.contains("hostsim-v1"));
    assert!(read.contains("hostsim-v2"));
}

#[test]
fn restored_store_loads_the_compiled_component() {
    let mut store = SimStore::new(2_000);
    store.seed("bridge:model", "entry", json!({"value": true}));
    let store = SimStore::from_snapshot(store.snapshot().unwrap()).unwrap();
    let sim = Sim::load_with_store(&component_path(), store).expect("load component");
    assert_eq!(
        sim.store().get("bridge:model", "entry"),
        Some(json!({"value": true}))
    );
}

#[test]
fn malformed_snapshot_is_rejected() {
    assert!(SimStore::from_snapshot(json!({"now": "not-an-integer"})).is_err());
}
