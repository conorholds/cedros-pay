use super::*;

#[test]
fn lane_quota_is_durable_and_fresh_service_recovers_admitted_lanes() {
    let seams = FakeSeams::new();
    let cart_service = service(&seams, "buyer-a", provider_a());
    cart_service.admit_lane(DEFAULT_LANE).unwrap();
    assert_eq!(
        cart_service.admit_lane("lane-overflow").unwrap_err().status,
        429
    );
    let fresh = service(&seams, "buyer-a", provider_a());
    fresh.require_lane(DEFAULT_LANE).unwrap();
    assert_eq!(fresh.require_lane("lane-overflow").unwrap_err().status, 404);
}

#[test]
fn concurrent_last_slot_has_one_winner_and_never_exceeds_quota() {
    let seams = FakeSeams::new();
    let cart_service = service(&seams, "buyer-a", provider_a());
    let key = identity::lane_registry_key(&cart_service.scope_hash);
    let raced = json!({
        "schemaVersion": 1,
        "scopeHash": cart_service.scope_hash.clone(),
        "laneHashes": [identity::lane_hash("raced-winner")],
        "updatedAt": crate::time::iso8601(seams.now_unix_secs()),
    });
    seams.queue_guarded_race(vec![(LANE_MODEL_ID, &key, raced)]);

    assert_eq!(
        cart_service.admit_lane("raced-loser").unwrap_err().status,
        429
    );
    cart_service.require_lane("raced-winner").unwrap();
    assert_eq!(
        cart_service.require_lane("raced-loser").unwrap_err().status,
        404
    );
    let stored = seams.get_entry(LANE_MODEL_ID, &key).unwrap();
    assert_eq!(
        stored["laneHashes"].as_array().unwrap().len(),
        lane_admission::MAX_LANES
    );
}
