use super::*;
use crate::db::{BatchOp, Db};
use crate::fake::FakeSeams;
use crate::guarded_batch::{GuardedBatchOutcome, GuardedCondition};
use crate::ids;
use crate::seams::HostSeams;
use serde_json::{json, Value};

#[path = "enforcement_tests.rs"]
mod enforcement_tests;
#[path = "enrollment_tests.rs"]
mod enrollment_tests;
#[path = "validation_tests.rs"]
mod validation_tests;

fn marker_value(seams: &FakeSeams) -> Value {
    serde_json::to_value(GuardedPolicyMarker::new(seams.now_unix_secs())).unwrap()
}

fn assert_unavailable(error: crate::error::AppError) {
    assert_eq!(
        (error.status, error.code),
        (503, "guarded_write_policy_unavailable")
    );
}
