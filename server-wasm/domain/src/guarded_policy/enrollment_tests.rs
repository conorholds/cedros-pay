use super::*;
use sha2::{Digest, Sha256};

#[test]
fn enrollment_is_atomic_durable_and_idempotent_across_instances() {
    let seams = FakeSeams::new();
    let first = enroll(&seams).unwrap();
    assert!(first.newly_enrolled);
    assert_eq!(first.marker.models, GUARDED_MODELS);
    assert_eq!(first.marker.model_set_sha256, MODEL_SET_SHA256);
    assert_eq!(seams.guarded_models().len(), GUARDED_MODELS.len());
    assert!(!seams.guarded_models().contains(CONTROL_MODEL));

    let restarted = enroll(&seams).unwrap();
    assert!(!restarted.newly_enrolled);
    assert_eq!(restarted.marker, first.marker);
    assert_eq!(require_active(&seams).unwrap(), first.marker);
    assert_eq!(seams.entry_count(CONTROL_MODEL), 1);
}

#[test]
fn injected_failure_rolls_back_every_policy_and_the_marker() {
    let seams = FakeSeams::new();
    seams.fail_next_guarded_batch_after(6);
    assert_eq!(enroll(&seams).unwrap_err().status, 500);
    assert!(seams.guarded_models().is_empty());
    assert!(seams.get_entry(CONTROL_MODEL, MARKER_KEY).is_none());
}

#[test]
fn exact_conflict_reread_is_success_but_mismatch_fails_closed() {
    let exact = FakeSeams::new();
    exact.set_guarded_models(&GUARDED_MODELS);
    exact.queue_guarded_race(vec![(CONTROL_MODEL, MARKER_KEY, marker_value(&exact))]);
    let result = enroll(&exact).unwrap();
    assert!(!result.newly_enrolled);
    assert_eq!(exact.entry_count(CONTROL_MODEL), 1);

    let mismatched = FakeSeams::new();
    mismatched.set_guarded_models(&GUARDED_MODELS);
    let mut stale = marker_value(&mismatched);
    stale["hostCommit"] = json!("stale");
    mismatched.queue_guarded_race(vec![(CONTROL_MODEL, MARKER_KEY, stale)]);
    assert_unavailable(enroll(&mismatched).unwrap_err());
}

#[test]
fn marker_contract_is_exact_and_canonical() {
    let seams = FakeSeams::new();
    let marker = enroll(&seams).unwrap().marker;
    assert_eq!(model_set_sha256(), MODEL_SET_SHA256);
    assert_eq!(marker.capability_id, CAPABILITY_ID);
    assert_eq!(marker.min_cedros_data_version, MIN_DATA_VERSION);
    assert_eq!(marker.request_schema_version, REQUEST_SCHEMA_VERSION);
    assert_eq!(marker.host_commit, HOST_COMMIT);
    assert_eq!(marker.policy, ACTIVE_POLICY);
    assert!(marker.active);
    assert_eq!(
        crate::time::parse_iso(&marker.host_timestamp),
        Some(seams.now_unix_secs())
    );
}

#[test]
fn compatible_prior_marker_is_upgraded_additively_and_idempotently() {
    let seams = FakeSeams::new();
    let prior_models = GUARDED_MODELS
        .iter()
        .copied()
        .filter(|model| *model != crate::ids::MODEL_PROGRAM_ACCESS)
        .collect::<Vec<_>>();
    seams.set_guarded_models(&prior_models);
    let prior_hash = serde_json::to_vec(&prior_models)
        .map(|value| hex::encode(Sha256::digest(value)))
        .unwrap();
    seams.seed(
        CONTROL_MODEL,
        MARKER_KEY,
        json!({
            "schemaVersion": 1,
            "capabilityId": CAPABILITY_ID,
            "minCedrosDataVersion": MIN_DATA_VERSION,
            "requestSchemaVersion": REQUEST_SCHEMA_VERSION,
            "hostCommit": HOST_COMMIT,
            "models": prior_models,
            "modelSetSha256": prior_hash,
            "policy": ACTIVE_POLICY,
            "active": true,
            "hostTimestamp": crate::time::iso8601(seams.now_unix_secs()),
        }),
    );

    let upgraded = enroll(&seams).unwrap();
    assert!(upgraded.newly_enrolled);
    assert_eq!(upgraded.marker.models, GUARDED_MODELS);
    assert_eq!(seams.guarded_models().len(), GUARDED_MODELS.len());
    assert!(seams
        .guarded_models()
        .contains(crate::ids::MODEL_PROGRAM_ACCESS));
    assert_eq!(seams.entry_count(CONTROL_MODEL), 1);

    let replay = enroll(&seams).unwrap();
    assert!(!replay.newly_enrolled);
    assert_eq!(replay.marker, upgraded.marker);
}

#[test]
fn legacy_exact_marker_upgrades_to_the_public_storage_cas_contract() {
    let seams = FakeSeams::new();
    seams.set_guarded_models(&GUARDED_MODELS);
    seams.seed(
        CONTROL_MODEL,
        MARKER_KEY,
        json!({
            "schemaVersion": 1,
            "capabilityId": "cedros-data:database-concurrency-v1",
            "minCedrosDataVersion": "0.1.9",
            "requestSchemaVersion": REQUEST_SCHEMA_VERSION,
            "hostCommit": "4b77968f8211791a198da6b71e1465a7ffa932cc",
            "models": GUARDED_MODELS,
            "modelSetSha256": MODEL_SET_SHA256,
            "policy": ACTIVE_POLICY,
            "active": true,
            "hostTimestamp": crate::time::iso8601(seams.now_unix_secs()),
        }),
    );

    let upgraded = enroll(&seams).unwrap();
    assert!(upgraded.newly_enrolled);
    assert_eq!(upgraded.marker.capability_id, CAPABILITY_ID);
    assert_eq!(upgraded.marker.min_cedros_data_version, MIN_DATA_VERSION);
    assert_eq!(upgraded.marker.host_commit, HOST_COMMIT);
    assert_eq!(require_active(&seams).unwrap(), upgraded.marker);
}
