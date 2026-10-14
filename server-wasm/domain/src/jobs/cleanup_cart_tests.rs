use serde_json::{json, Value};

use super::*;
use crate::fake::FakeSeams;

#[test]
fn cleanup_reports_bounded_expired_cart_rate_deletions() {
    let seams = FakeSeams::new();
    crate::guarded_policy::enroll(&seams).unwrap();
    let now = 1_800_000_060;
    seams.set_now(now);
    let hash = "a".repeat(64);
    seams.seed(
        crate::versioned_cart::LANE_MODEL_ID,
        &format!("rate:{hash}:open"),
        json!({
            "schemaVersion": 1,
            "recordType": "rate_window",
            "keyHash": hash,
            "operation": "open",
            "windowStart": now - 60,
            "count": 1,
            "updatedAt": crate::time::iso8601(now - 60),
        }),
    );

    let outcome = run(
        &seams,
        &JobExecution {
            job_id: ids::JOB_CLEANUP.into(),
            ..Default::default()
        },
    )
    .unwrap();
    let details: Value = serde_json::from_str(&outcome.details_json).unwrap();

    assert_eq!(details["cartRateWindowsDeleted"], 1);
    assert_eq!(
        details["checkoutSettlements"],
        json!({ "scanned": 0, "committed": 0, "released": 0, "deferred": 0 })
    );
    assert_eq!(seams.entry_count(crate::versioned_cart::LANE_MODEL_ID), 0);
}
