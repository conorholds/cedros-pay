use serde_json::json;

use super::{
    validate_outcome, GuardPredicate, GuardedBatchOutcome, GuardedCondition, GuardedConflict,
    GuardedEntryVersion,
};
use crate::db::{BatchOp, Db, WritePolicy};
use crate::fake::FakeSeams;

const ACCESS: &str = "cedros-pay:store-db";
const MODEL: &str = "cedros-pay:credits";

fn write(key: &str, value: i64) -> BatchOp {
    BatchOp::Write {
        content_model_id: MODEL,
        entry_key: key.into(),
        data: json!({ "value": value }),
    }
}

#[test]
fn absent_claim_applies_once_and_returns_version() {
    let seams = FakeSeams::new();
    let db = Db::new(&seams, ACCESS);
    let guard = GuardedCondition::Absent {
        content_model_id: MODEL,
        entry_key: "claim:1".into(),
    };
    let first = db
        .guarded_batch(std::slice::from_ref(&guard), &[write("claim:1", 1)])
        .unwrap();
    let GuardedBatchOutcome::Applied { applied, entries } = first else {
        panic!("first claim must apply");
    };
    assert_eq!(applied, 1);
    assert_eq!(entries.len(), 1);
    assert!(!entries[0].version.is_empty());
    assert_eq!(seams.db_compare_and_set_request_count(), 1);

    let second = db.guarded_batch(&[guard], &[write("claim:1", 2)]).unwrap();
    let GuardedBatchOutcome::Conflict { conflict } = second else {
        panic!("second claim must conflict");
    };
    assert_eq!(conflict.condition_index, 0);
    assert_eq!(conflict.predicate, GuardPredicate::Absent);
    assert_eq!(
        seams.get_entry(MODEL, "claim:1"),
        Some(json!({ "value": 1 }))
    );
}

#[test]
fn version_guard_rotates_token_and_rejects_stale_write() {
    let seams = FakeSeams::new();
    seams.seed(MODEL, "account:1", json!({ "balance": 10 }));
    let db = Db::new(&seams, ACCESS);
    let original = db.read_one(MODEL, "account:1").unwrap().unwrap();
    let token = original.version.expect("read exposes version");
    let guard = GuardedCondition::Version {
        content_model_id: MODEL,
        entry_key: "account:1".into(),
        expected_version: token.clone(),
    };
    let applied = db
        .guarded_batch(std::slice::from_ref(&guard), &[write("account:1", 11)])
        .unwrap();
    let GuardedBatchOutcome::Applied { entries, .. } = applied else {
        panic!("fresh token must apply");
    };
    assert_ne!(entries[0].version, token);
    assert!(matches!(
        db.guarded_batch(&[guard], &[write("account:1", 12)])
            .unwrap(),
        GuardedBatchOutcome::Conflict { .. }
    ));
}

#[test]
fn validation_rejects_empty_and_duplicate_targets_before_host_call() {
    let seams = FakeSeams::new();
    let db = Db::new(&seams, ACCESS);
    let guard = GuardedCondition::Absent {
        content_model_id: MODEL,
        entry_key: "claim:1".into(),
    };
    assert_eq!(
        db.guarded_batch(std::slice::from_ref(&guard), &[])
            .unwrap_err()
            .status,
        400
    );
    assert_eq!(
        db.guarded_batch(&[guard.clone(), guard], &[write("claim:1", 1)])
            .unwrap_err()
            .status,
        400
    );
    assert!(seams.get_entry(MODEL, "claim:1").is_none());
}

#[test]
fn commerce_mutation_uses_named_cas_not_the_legacy_batch_parser() {
    let seams = FakeSeams::new();
    seams.use_legacy_batch_parser();
    let db = Db::new(&seams, ACCESS);
    let result = db.guarded_batch(
        &[GuardedCondition::Absent {
            content_model_id: MODEL,
            entry_key: "claim:legacy".into(),
        }],
        &[write("claim:legacy", 99)],
    );
    assert!(matches!(
        result.unwrap(),
        GuardedBatchOutcome::Applied { .. }
    ));
    assert_eq!(seams.db_compare_and_set_request_count(), 1);
    assert_eq!(
        seams.get_entry(MODEL, "claim:legacy"),
        Some(json!({ "value": 99 }))
    );
}

#[test]
fn named_cas_rejects_host_policy_operations_before_the_host_call() {
    let seams = FakeSeams::new();
    let db = Db::new(&seams, ACCESS);
    let error = db
        .guarded_batch(
            &[GuardedCondition::Absent {
                content_model_id: MODEL,
                entry_key: "policy:1".into(),
            }],
            &[BatchOp::SetWritePolicy {
                content_model_id: MODEL,
                policy: WritePolicy::GuardedOnly,
            }],
        )
        .unwrap_err();

    assert_eq!(error.status, 400);
    assert_eq!(seams.db_compare_and_set_request_count(), 0);
}

#[test]
fn malformed_applied_outcome_fails_closed() {
    let guard = GuardedCondition::Absent {
        content_model_id: MODEL,
        entry_key: "claim:1".into(),
    };
    let outcome = GuardedBatchOutcome::Applied {
        applied: 1,
        entries: vec![GuardedEntryVersion {
            content_model_id: MODEL.into(),
            entry_key: "wrong-target".into(),
            version: String::new(),
        }],
    };
    assert_eq!(
        validate_outcome(outcome, &[guard], &[write("claim:1", 1)])
            .unwrap_err()
            .status,
        500
    );
}

#[test]
fn malformed_conflict_outcome_fails_closed() {
    let guard = GuardedCondition::Absent {
        content_model_id: MODEL,
        entry_key: "claim:1".into(),
    };
    let outcome = GuardedBatchOutcome::Conflict {
        conflict: GuardedConflict {
            condition_index: 0,
            content_model_id: MODEL.into(),
            entry_key: "different".into(),
            predicate: GuardPredicate::Version,
        },
    };
    assert_eq!(
        validate_outcome(outcome, &[guard], &[write("claim:1", 1)])
            .unwrap_err()
            .status,
        500
    );
}

#[test]
fn guarded_only_policy_blocks_plain_mutations_and_can_be_lifted() {
    let seams = FakeSeams::new();
    seams.seed(MODEL, "account:policy", json!({ "balance": 10 }));
    let db = Db::new(&seams, ACCESS);
    db.set_write_policy(MODEL, WritePolicy::GuardedOnly)
        .expect("enroll policy");

    assert_eq!(
        db.write(MODEL, "account:policy", &json!({ "balance": 0 }))
            .unwrap_err()
            .status,
        500
    );
    assert_eq!(db.delete(MODEL, "account:policy").unwrap_err().status, 500);
    assert_eq!(
        db.batch(&[write("account:policy", 0)]).unwrap_err().status,
        500
    );
    assert_eq!(
        seams.get_entry(MODEL, "account:policy"),
        Some(json!({ "balance": 10 }))
    );

    let current = db.read_one(MODEL, "account:policy").unwrap().unwrap();
    let outcome = db
        .guarded_batch(
            &[GuardedCondition::Version {
                content_model_id: MODEL,
                entry_key: "account:policy".into(),
                expected_version: current.version.unwrap(),
            }],
            &[write("account:policy", 11)],
        )
        .expect("guarded write");
    assert!(matches!(outcome, GuardedBatchOutcome::Applied { .. }));

    db.set_write_policy(MODEL, WritePolicy::Open)
        .expect("lift policy");
    db.write(MODEL, "account:policy", &json!({ "balance": 12 }))
        .expect("plain write restored");
}

#[test]
fn policy_can_enroll_atomically_with_last_guarded_write() {
    let seams = FakeSeams::new();
    let db = Db::new(&seams, ACCESS);
    let outcome = super::execute_host_policy(
        &seams,
        ACCESS,
        &[GuardedCondition::Absent {
            content_model_id: crate::guarded_policy::CONTROL_MODEL,
            entry_key: crate::guarded_policy::MARKER_KEY.into(),
        }],
        &[
            BatchOp::SetWritePolicy {
                content_model_id: MODEL,
                policy: WritePolicy::GuardedOnly,
            },
            BatchOp::Write {
                content_model_id: crate::guarded_policy::CONTROL_MODEL,
                entry_key: crate::guarded_policy::MARKER_KEY.into(),
                data: json!({ "active": true }),
            },
        ],
    )
    .expect("guarded enrollment");
    let GuardedBatchOutcome::Applied { applied, entries } = outcome else {
        panic!("fresh guard must apply");
    };
    assert_eq!(applied, 2);
    assert_eq!(entries.len(), 1, "policy ops do not return entry tokens");
    assert!(db.write(MODEL, "account:other", &json!({})).is_err());
}

#[test]
fn conflict_rolls_back_write_policy_enrollment() {
    let seams = FakeSeams::new();
    seams.seed(
        crate::guarded_policy::CONTROL_MODEL,
        crate::guarded_policy::MARKER_KEY,
        json!({ "active": true }),
    );
    let db = Db::new(&seams, ACCESS);
    let outcome = super::execute_host_policy(
        &seams,
        ACCESS,
        &[GuardedCondition::Absent {
            content_model_id: crate::guarded_policy::CONTROL_MODEL,
            entry_key: crate::guarded_policy::MARKER_KEY.into(),
        }],
        &[
            BatchOp::SetWritePolicy {
                content_model_id: MODEL,
                policy: WritePolicy::GuardedOnly,
            },
            BatchOp::Write {
                content_model_id: crate::guarded_policy::CONTROL_MODEL,
                entry_key: crate::guarded_policy::MARKER_KEY.into(),
                data: json!({ "active": false }),
            },
        ],
    )
    .expect("domain conflict");
    assert!(matches!(outcome, GuardedBatchOutcome::Conflict { .. }));
    db.write(MODEL, "account:still-open", &json!({}))
        .expect("conflicted enrollment must not apply");
}

#[test]
fn policy_helper_fails_safely_on_pre_policy_host() {
    let seams = FakeSeams::new();
    seams.use_legacy_batch_parser();
    let db = Db::new(&seams, ACCESS);
    assert!(db
        .set_write_policy(MODEL, WritePolicy::GuardedOnly)
        .is_err());
    db.write(MODEL, "account:legacy", &json!({}))
        .expect("unknown policy op must not enroll or mutate data");
}
