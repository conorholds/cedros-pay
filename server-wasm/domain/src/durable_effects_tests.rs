use super::*;
use crate::fake::FakeSeams;
use serde_json::json;

#[test]
fn crash_recovery_redelivers_with_the_same_target_identity() {
    let seams = FakeSeams::new();
    let plan = plan(
        "test",
        "payment-1",
        vec![event("test:event", "Test", json!({"fact":"durable"}))],
        seams.now_unix_secs(),
    )
    .unwrap()
    .unwrap();
    let db = Db::new(&seams, ids::DB_ACCESS);
    db.guarded_batch(&[plan.condition], &[plan.op]).unwrap();
    let row = candidates(&db, seams.now_unix_secs(), 1).unwrap().remove(0);
    let candidate = decode_candidate(&row).unwrap();
    let abandoned = claim(&db, candidate, "crashed", seams.now_unix_secs())
        .unwrap()
        .unwrap();
    let target = abandoned.record.targets[0].clone();
    deliver(&seams, &target).unwrap();
    drop(abandoned); // process dies before the target checkpoint
    let first_id = seams.events.borrow()[0].2["idempotency_key"].clone();
    seams.set_now(seams.now_unix_secs() + LEASE_SECONDS + 1);
    let budget = WorkBudget::new(&seams);
    assert_eq!(run(&seams, 10, &budget).unwrap().delivered, 1);
    let events = seams.events.borrow();
    assert_eq!(events.len(), 2);
    assert_eq!(first_id, events[1].2["idempotency_key"]);
}

#[test]
fn same_source_identity_can_only_be_committed_once() {
    let seams = FakeSeams::new();
    let db = Db::new(&seams, ids::DB_ACCESS);
    let first = plan(
        "test",
        "same",
        vec![event("test:event", "Test", json!({}))],
        seams.now_unix_secs(),
    )
    .unwrap()
    .unwrap();
    assert!(matches!(
        db.guarded_batch(&[first.condition], &[first.op]).unwrap(),
        GuardedBatchOutcome::Applied { .. }
    ));
    let replay = plan(
        "test",
        "same",
        vec![event("test:event", "Test", json!({}))],
        seams.now_unix_secs(),
    )
    .unwrap()
    .unwrap();
    assert!(matches!(
        db.guarded_batch(&[replay.condition], &[replay.op]).unwrap(),
        GuardedBatchOutcome::Conflict { .. }
    ));
}

#[test]
fn retry_resumes_after_the_last_checkpointed_target() {
    let seams = FakeSeams::new();
    let plan = plan(
        "test",
        "partial-delivery",
        vec![
            event("test:event", "Test", json!({"fact":"durable"})),
            crm(
                "test.crm",
                json!({"eventId":"partial-delivery","eventType":"test.crm"}),
            ),
        ],
        seams.now_unix_secs(),
    )
    .unwrap()
    .unwrap();
    let db = Db::new(&seams, ids::DB_ACCESS);
    db.guarded_batch(&[plan.condition], &[plan.op]).unwrap();
    seams.fail_next_crm("temporarily unavailable");

    let first = run(&seams, 10, &WorkBudget::new(&seams)).unwrap();

    assert_eq!(first.retried, 1);
    assert_eq!(seams.event_count("test:event"), 1);
    assert!(seams.crm_events.borrow().is_empty());
    seams.set_now(seams.now_unix_secs() + 31);

    let second = run(&seams, 10, &WorkBudget::new(&seams)).unwrap();

    assert_eq!(second.delivered, 1);
    assert_eq!(seams.event_count("test:event"), 1);
    assert_eq!(seams.crm_events.borrow().len(), 1);
}

#[test]
fn malformed_records_are_quarantined_without_poisoning_the_worker() {
    let seams = FakeSeams::new();
    seams.seed(
        ids::MODEL_WEBHOOK_OUTBOX,
        "domain-effect:malformed",
        json!({
            "recordType": RECORD_TYPE,
            "status": STATUS_PENDING,
            "nextAttemptAt": crate::time::iso8601(seams.now_unix_secs())
        }),
    );
    let valid = plan(
        "test",
        "valid-after-malformed",
        vec![event("test:event", "Test", json!({}))],
        seams.now_unix_secs(),
    )
    .unwrap()
    .unwrap();
    Db::new(&seams, ids::DB_ACCESS)
        .guarded_batch(&[valid.condition], &[valid.op])
        .unwrap();

    let report = run(&seams, 10, &WorkBudget::new(&seams)).unwrap();

    assert_eq!(report.failed, 1);
    assert_eq!(report.delivered, 1);
    assert_eq!(seams.event_count("test:event"), 1);
    let quarantined = seams
        .get_entry(ids::MODEL_WEBHOOK_OUTBOX, "domain-effect:malformed")
        .unwrap();
    assert_eq!(quarantined["status"], STATUS_FAILED);
    assert_eq!(quarantined["lastError"], "invalid_effect_record");
}

#[test]
fn ensure_accepts_an_equivalent_already_delivered_effect() {
    let seams = FakeSeams::new();
    let actions = vec![event("test:event", "Test", json!({"fact":"one"}))];
    let plan = plan(
        "repair",
        "already-delivered",
        actions.clone(),
        seams.now_unix_secs(),
    )
    .unwrap()
    .unwrap();
    Db::new(&seams, ids::DB_ACCESS)
        .guarded_batch(&[plan.condition], &[plan.op])
        .unwrap();
    dispatch_best_effort(&seams, "repair", "already-delivered");

    ensure(
        &Db::new(&seams, ids::DB_ACCESS),
        "repair",
        "already-delivered",
        actions,
        seams.now_unix_secs(),
    )
    .unwrap();

    assert_eq!(seams.event_count("test:event"), 1);
}
