use super::*;
use crate::versioned_cart::rate_policy::{DurableRatePolicy, MAX_CAS_RETRIES, WINDOW_SECONDS};

fn key(subject: &str, provider: TrustedCartProvider) -> CartRateKey {
    CartRateKey::derive(subject, &provider, DEFAULT_LANE)
}

#[test]
fn independent_policy_instances_share_one_durable_quota() {
    let seams = FakeSeams::new();
    crate::guarded_policy::enroll(&seams).unwrap();
    let key = key("buyer-a", provider_a());
    let limit = CartRateOperation::Open.limit();
    for index in 0..limit {
        let policy = DurableRatePolicy::new(&seams);
        policy.check(&key, CartRateOperation::Open).unwrap();
        assert_eq!(
            seams
                .get_entry(LANE_MODEL_ID, &key.entry_key(CartRateOperation::Open))
                .unwrap()["count"],
            index + 1
        );
    }

    let error = DurableRatePolicy::new(&seams)
        .check(&key, CartRateOperation::Open)
        .unwrap_err();
    assert_eq!((error.status, error.code), (429, "rate_limited"));
    assert!(!error.message.contains(key.as_str()));
}

#[test]
fn exact_window_boundary_replaces_the_expired_counter() {
    let seams = FakeSeams::new();
    crate::guarded_policy::enroll(&seams).unwrap();
    let now = 1_800_000_000;
    seams.set_now(now);
    let key = key("buyer-a", provider_a());
    let policy = DurableRatePolicy::new(&seams);
    for _ in 0..CartRateOperation::Rotate.limit() {
        policy.check(&key, CartRateOperation::Rotate).unwrap();
    }
    assert_eq!(
        policy
            .check(&key, CartRateOperation::Rotate)
            .unwrap_err()
            .status,
        429
    );

    seams.set_now(now + WINDOW_SECONDS);
    DurableRatePolicy::new(&seams)
        .check(&key, CartRateOperation::Rotate)
        .unwrap();
    let stored = seams
        .get_entry(LANE_MODEL_ID, &key.entry_key(CartRateOperation::Rotate))
        .unwrap();
    assert_eq!(stored["windowStart"], now + WINDOW_SECONDS);
    assert_eq!(stored["count"], 1);
    assert_eq!(seams.entry_count(LANE_MODEL_ID), 1);
}

#[test]
fn guarded_conflict_retries_against_the_competing_counter() {
    let seams = FakeSeams::new();
    crate::guarded_policy::enroll(&seams).unwrap();
    let now = 1_800_000_000;
    seams.set_now(now);
    let key = key("buyer-a", provider_a());
    let entry_key = key.entry_key(CartRateOperation::Apply);
    seams.queue_guarded_race(vec![(
        LANE_MODEL_ID,
        entry_key.as_str(),
        json!({
            "schemaVersion": 1,
            "recordType": "rate_window",
            "keyHash": key.as_str(),
            "operation": "apply",
            "windowStart": now,
            "count": 1,
            "updatedAt": crate::time::iso8601(now),
        }),
    )]);

    DurableRatePolicy::new(&seams)
        .check(&key, CartRateOperation::Apply)
        .unwrap();
    assert_eq!(
        seams.get_entry(LANE_MODEL_ID, &entry_key).unwrap()["count"],
        2
    );
}

#[test]
fn injected_storage_failure_rolls_back_the_counter() {
    let seams = FakeSeams::new();
    crate::guarded_policy::enroll(&seams).unwrap();
    let key = key("buyer-a", provider_a());
    let entry_key = key.entry_key(CartRateOperation::Read);
    seams.fail_next_guarded_batch_after(1);
    assert_eq!(
        DurableRatePolicy::new(&seams)
            .check(&key, CartRateOperation::Read)
            .unwrap_err()
            .status,
        500
    );
    assert!(seams.get_entry(LANE_MODEL_ID, &entry_key).is_none());
}

#[test]
fn trusted_subject_and_provider_scopes_never_share_counters() {
    let seams = FakeSeams::new();
    crate::guarded_policy::enroll(&seams).unwrap();
    let keys = [
        key("buyer-a", provider_a()),
        key("buyer-b", provider_a()),
        key("buyer-a", provider_b()),
    ];
    for key in &keys {
        DurableRatePolicy::new(&seams)
            .check(key, CartRateOperation::Apply)
            .unwrap();
    }
    assert_eq!(seams.entry_count(LANE_MODEL_ID), 3);
    assert_eq!(MAX_CAS_RETRIES, 5);
}

#[test]
fn two_production_adapters_share_the_same_request_budget() {
    let seams = FakeSeams::new();
    crate::guarded_policy::enroll(&seams).unwrap();
    for _ in 0..=CartRateOperation::Open.limit() {
        authenticated(&seams, "buyer-a");
    }
    let first = AuthenticatedCartAdapter::new(&seams);
    let second = AuthenticatedCartAdapter::new(&seams);
    let request = transport_request(json!({ "lane": DEFAULT_LANE }));
    for index in 0..CartRateOperation::Open.limit() {
        let adapter = if index % 2 == 0 { &first } else { &second };
        adapter.open(&request).unwrap();
    }
    let error = second.open(&request).unwrap_err();
    assert_eq!((error.status, error.code), (429, "rate_limited"));
    assert_eq!(seams.entry_count(GENERATION_MODEL_ID), 1);
    assert_eq!(seams.entry_count(CART_MODEL_ID), 0);
}
