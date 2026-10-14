use super::*;
use crate::versioned_cart::rate_policy::{CartRateOperation, DurableRatePolicy, WINDOW_SECONDS};

fn seeded_rate(seams: &FakeSeams, subject: &str) -> (CartRateKey, String) {
    let key = CartRateKey::derive(subject, &provider_a(), DEFAULT_LANE);
    let entry_key = key.entry_key(CartRateOperation::Open);
    DurableRatePolicy::new(seams)
        .check(&key, CartRateOperation::Open)
        .unwrap();
    (key, entry_key)
}

#[test]
fn cleanup_requires_the_exact_marker_before_scanning() {
    let seams = FakeSeams::new();
    let error = cleanup_expired_rate_windows(&seams, 10).unwrap_err();
    assert_eq!(error.code, "guarded_write_policy_unavailable");
    assert_eq!(seams.entry_count(LANE_MODEL_ID), 0);
}

#[test]
fn cleanup_deletes_at_the_exact_expiry_boundary() {
    let seams = FakeSeams::new();
    crate::guarded_policy::enroll(&seams).unwrap();
    let now = 1_800_000_000;
    seams.set_now(now);
    let (_, entry_key) = seeded_rate(&seams, "buyer-a");
    assert!(seams.get_entry(LANE_MODEL_ID, &entry_key).is_some());

    seams.set_now(now + WINDOW_SECONDS);
    assert_eq!(cleanup_expired_rate_windows(&seams, 10).unwrap(), 1);
    assert!(seams.get_entry(LANE_MODEL_ID, &entry_key).is_none());
}

#[test]
fn cleanup_is_bounded_and_keeps_current_windows() {
    let seams = FakeSeams::new();
    crate::guarded_policy::enroll(&seams).unwrap();
    let now = 1_800_000_000;
    seams.set_now(now);
    seeded_rate(&seams, "buyer-a");
    seeded_rate(&seams, "buyer-b");
    assert_eq!(cleanup_expired_rate_windows(&seams, 10).unwrap(), 0);

    seams.set_now(now + WINDOW_SECONDS);
    assert_eq!(cleanup_expired_rate_windows(&seams, 1).unwrap(), 1);
    assert_eq!(seams.entry_count(LANE_MODEL_ID), 1);
}

#[test]
fn renewed_window_wins_over_stale_cleanup_snapshot() {
    let seams = FakeSeams::new();
    crate::guarded_policy::enroll(&seams).unwrap();
    let now = 1_800_000_000;
    seams.set_now(now);
    let (_, entry_key) = seeded_rate(&seams, "buyer-a");
    seams.set_now(now + WINDOW_SECONDS);
    let mut renewed = seams.get_entry(LANE_MODEL_ID, &entry_key).unwrap();
    renewed["windowStart"] = json!(now + WINDOW_SECONDS);
    renewed["count"] = json!(1);
    renewed["updatedAt"] = json!(crate::time::iso8601(now + WINDOW_SECONDS));
    seams.queue_guarded_race(vec![(LANE_MODEL_ID, &entry_key, renewed)]);

    assert_eq!(cleanup_expired_rate_windows(&seams, 10).unwrap(), 0);
    assert_eq!(
        seams.get_entry(LANE_MODEL_ID, &entry_key).unwrap()["windowStart"],
        now + WINDOW_SECONDS
    );
}

#[test]
fn cleanup_fails_closed_on_malformed_matching_rows() {
    let seams = FakeSeams::new();
    crate::guarded_policy::enroll(&seams).unwrap();
    let now = 1_800_000_000;
    seams.set_now(now);
    seams.seed(
        LANE_MODEL_ID,
        "rate:malformed:open",
        json!({
            "schemaVersion": 1,
            "recordType": "rate_window",
            "windowStart": now - WINDOW_SECONDS,
        }),
    );
    assert_eq!(
        cleanup_expired_rate_windows(&seams, 10).unwrap_err().status,
        500
    );
    assert!(seams
        .get_entry(LANE_MODEL_ID, "rate:malformed:open")
        .is_some());
}
