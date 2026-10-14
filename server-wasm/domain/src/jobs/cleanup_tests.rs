use super::*;
use crate::db::WritePolicy;
use crate::fake::FakeSeams;

fn execution() -> JobExecution {
    JobExecution {
        job_id: ids::JOB_CLEANUP.into(),
        metadata_json: String::new(),
        attempt: 1,
    }
}

fn active() -> FakeSeams {
    let seams = FakeSeams::new();
    crate::guarded_policy::enroll(&seams).unwrap();
    seams
}

fn settled_outbox(id: &str) -> Value {
    json!({
        "id": id, "url": "https://example.test/hook", "payload": {},
        "status": "delivered", "attempts": 1,
        "createdAt": "2026-01-01T00:00:00Z",
        "nextAttemptAt": "2026-01-01T00:00:00Z",
    })
}

fn deleted(outcome: &JobOutcome) -> i64 {
    serde_json::from_str::<Value>(&outcome.details_json).unwrap()["deleted"]
        .as_i64()
        .unwrap()
}

#[test]
fn prunes_ordinary_settled_outbox_but_keeps_recent_and_pending() {
    let s = active();
    s.seed(ids::MODEL_WEBHOOK_OUTBOX, "out:old", settled_outbox("old"));
    s.seed(
        ids::MODEL_WEBHOOK_OUTBOX,
        "evt:new",
        json!({ "eventId": "new", "processedAt": "2026-05-30T00:00:00Z" }),
    );
    s.seed(
        ids::MODEL_WEBHOOK_OUTBOX,
        "out:done",
        settled_outbox("done"),
    );
    s.seed(
        ids::MODEL_WEBHOOK_OUTBOX,
        "out:pending",
        json!({
            "id": "pending", "status": "pending",
            "createdAt": "2026-01-01T00:00:00Z",
        }),
    );

    let outcome = run(&s, &execution()).unwrap();
    assert_eq!(deleted(&outcome), 2);
    assert!(s.get_entry(ids::MODEL_WEBHOOK_OUTBOX, "out:old").is_none());
    assert!(s.get_entry(ids::MODEL_WEBHOOK_OUTBOX, "out:done").is_none());
    assert!(s.get_entry(ids::MODEL_WEBHOOK_OUTBOX, "evt:new").is_some());
    assert!(s
        .get_entry(ids::MODEL_WEBHOOK_OUTBOX, "out:pending")
        .is_some());
}

#[test]
fn guarded_only_policy_allows_cleanup_through_guarded_deletes() {
    let s = active();
    s.seed(ids::MODEL_WEBHOOK_OUTBOX, "out:old", settled_outbox("old"));
    Db::new(&s, ids::DB_ACCESS)
        .set_write_policy(ids::MODEL_WEBHOOK_OUTBOX, WritePolicy::GuardedOnly)
        .unwrap();

    let outcome = run(&s, &execution()).unwrap();
    assert_eq!(deleted(&outcome), 1);
    assert!(s.get_entry(ids::MODEL_WEBHOOK_OUTBOX, "out:old").is_none());
}

#[test]
fn scan_delete_version_race_retains_the_changed_row() {
    let s = active();
    s.seed(
        ids::MODEL_WEBHOOK_OUTBOX,
        "out:raced",
        settled_outbox("raced"),
    );
    s.queue_guarded_race(vec![(
        ids::MODEL_WEBHOOK_OUTBOX,
        "out:raced",
        json!({
            "eventId": "raced", "status": "pending",
            "targets": { "ledger": "pending" },
            "createdAt": "2026-05-31T00:00:00Z",
        }),
    )]);

    let outcome = run(&s, &execution()).unwrap();
    assert_eq!(deleted(&outcome), 0);
    assert_eq!(
        s.get_entry(ids::MODEL_WEBHOOK_OUTBOX, "out:raced").unwrap()["status"],
        "pending"
    );
}

#[test]
fn more_than_thirty_two_rows_are_deleted_in_valid_guarded_chunks() {
    let s = active();
    for index in 0..70 {
        let key = format!("out:{index:03}");
        s.seed(ids::MODEL_WEBHOOK_OUTBOX, &key, settled_outbox(&key));
    }

    let outcome = run(&s, &execution()).unwrap();
    assert_eq!(deleted(&outcome), 70);
    assert_eq!(s.entry_count(ids::MODEL_WEBHOOK_OUTBOX), 0);
}

#[test]
fn pending_target_aware_live_leased_and_recent_rows_are_untouched() {
    let s = active();
    s.seed(
        ids::MODEL_WEBHOOK_OUTBOX,
        "evt:pending-target",
        json!({
            "eventId": "pending-target", "status": "pending",
            "targets": { "subscription": "applied", "ledger": "pending" },
            "processedAt": "2026-01-01T00:00:00Z",
            "createdAt": "2026-01-01T00:00:00Z",
        }),
    );
    s.seed(
        ids::MODEL_WEBHOOK_OUTBOX,
        "out:leased",
        json!({
            "id": "leased", "status": "leased",
            "processedAt": "2026-01-01T00:00:00Z",
            "createdAt": "2026-01-01T00:00:00Z",
            "leaseExpiresAt": "2026-06-01T00:00:00Z",
        }),
    );
    s.seed(
        ids::MODEL_WEBHOOK_OUTBOX,
        "out:recent",
        json!({
            "id": "recent", "status": "delivered",
            "createdAt": "2026-05-30T00:00:00Z",
        }),
    );
    for status in ["effect_pending", "effect_leased"] {
        s.seed(
            ids::MODEL_WEBHOOK_OUTBOX,
            &format!("effect:{status}"),
            json!({
                "recordType": "canonicalSettlementEffect",
                "status": status,
                "createdAt": "2026-01-01T00:00:00Z",
            }),
        );
    }

    let outcome = run(&s, &execution()).unwrap();
    assert_eq!(deleted(&outcome), 0);
    assert_eq!(s.entry_count(ids::MODEL_WEBHOOK_OUTBOX), 5);
}

#[test]
fn one_conflicted_row_does_not_corrupt_or_block_other_deletes() {
    let s = active();
    for id in ["a", "b", "c"] {
        s.seed(
            ids::MODEL_WEBHOOK_OUTBOX,
            &format!("out:{id}"),
            settled_outbox(id),
        );
    }
    s.queue_guarded_race(vec![(
        ids::MODEL_WEBHOOK_OUTBOX,
        "out:b",
        json!({
            "eventId": "b", "status": "pending",
            "targets": { "ledger": "pending" },
            "createdAt": "2026-05-31T00:00:00Z",
        }),
    )]);

    let outcome = run(&s, &execution()).unwrap();
    assert_eq!(deleted(&outcome), 2);
    assert!(s.get_entry(ids::MODEL_WEBHOOK_OUTBOX, "out:a").is_none());
    assert!(s.get_entry(ids::MODEL_WEBHOOK_OUTBOX, "out:c").is_none());
    assert_eq!(
        s.get_entry(ids::MODEL_WEBHOOK_OUTBOX, "out:b").unwrap()["status"],
        "pending"
    );
}

#[test]
fn missing_marker_fails_before_cleanup_scans_or_mutations() {
    let s = FakeSeams::new();
    s.seed(ids::MODEL_WEBHOOK_OUTBOX, "out:old", settled_outbox("old"));

    let error = run(&s, &execution()).unwrap_err();

    assert_eq!(error.code, "guarded_write_policy_unavailable");
    assert!(s.get_entry(ids::MODEL_WEBHOOK_OUTBOX, "out:old").is_some());
    assert!(s.last_db_batch_request().is_none());
}

#[test]
fn cleanup_retains_financial_delivery_and_authenticated_event_receipts_forever() {
    let seams = active();
    let db = Db::new(&seams, ids::DB_ACCESS);
    let now = seams.now_unix_secs();
    let plan = crate::durable_effects::plan(
        "credit",
        "immutable-source",
        vec![crate::durable_effects::event(
            ids::EVENT_PAYMENT_SUCCEEDED,
            "Settled",
            json!({}),
        )],
        now,
    )
    .unwrap()
    .unwrap();
    crate::durable_effects::ensure_plan(&db, &plan).unwrap();
    crate::durable_effects::dispatch_effect_best_effort(&seams, &plan.effect_id);
    seams.seed(
        ids::MODEL_WEBHOOK_OUTBOX,
        "evt:financial",
        json!({
            "eventId":"evt_financial", "fingerprint":"bound", "processedAt":time::iso8601(now)
        }),
    );
    seams.seed(ids::MODEL_WEBHOOK_OUTBOX, "canonical:delivered", json!({
        "recordType":"canonicalSettlementEffect", "status":"effect_delivered", "createdAt":time::iso8601(now)
    }));
    seams.seed(
        ids::MODEL_WEBHOOK_OUTBOX,
        "evt:legacy",
        json!({
            "eventId":"evt_legacy", "processedAt":time::iso8601(now), "createdAt":time::iso8601(now)
        }),
    );
    seams.set_now(now + 4_000 * 86400);
    assert_eq!(deleted(&run(&seams, &execution()).unwrap()), 0);
    crate::durable_effects::ensure_plan(&db, &plan).unwrap();
    crate::durable_effects::dispatch_effect_best_effort(&seams, &plan.effect_id);
    assert_eq!(seams.event_count(ids::EVENT_PAYMENT_SUCCEEDED), 1);
    assert!(seams
        .get_entry(ids::MODEL_WEBHOOK_OUTBOX, "evt:financial")
        .is_some());
    assert!(seams
        .get_entry(ids::MODEL_WEBHOOK_OUTBOX, "evt:legacy")
        .is_some());
    assert!(seams
        .get_entry(ids::MODEL_WEBHOOK_OUTBOX, "canonical:delivered")
        .is_some());
}
