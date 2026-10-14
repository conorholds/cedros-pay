use super::*;
use crate::fake::FakeSeams;

fn seed(s: &FakeSeams, id: &str, status: &str, due: &str, attempts: i64) {
    s.seed(
        ids::MODEL_WEBHOOK_OUTBOX,
        &format!("out:{id}"),
        json!({
            "id": id, "url": "https://hooks.example.com/x", "payload": {"ok": true},
            "status": status, "attempts": attempts,
            "createdAt": "2026-05-31T00:00:00Z", "nextAttemptAt": due
        }),
    );
}

fn exec(attempt: u32) -> JobExecution {
    JobExecution {
        job_id: ids::JOB_WEBHOOK_DELIVERY.into(),
        metadata_json: String::new(),
        attempt,
    }
}

fn run_value(s: &FakeSeams, attempt: u32) -> Value {
    serde_json::from_str(&run(s, &exec(attempt)).unwrap().details_json).unwrap()
}

#[test]
fn claims_and_delivers_legacy_pending_item() {
    let s = FakeSeams::new();
    seed(&s, "1", "pending", "2026-05-31T00:00:00Z", 0);
    s.push_http_response(200, "{}");
    assert_eq!(run_value(&s, 1)["delivered"], 1);
    let item = s.get_entry(ids::MODEL_WEBHOOK_OUTBOX, "out:1").unwrap();
    assert_eq!(item["status"], "delivered");
    assert!(item.get("leaseOwner").is_none());
    let request = s.http_requests.borrow()[0].clone();
    assert!(request["headers"]
        .to_string()
        .contains("cedros-delivery-id"));
}

#[test]
fn reschedules_and_eventually_retires_failures() {
    let s = FakeSeams::new();
    seed(&s, "retry", "pending", "2026-05-31T00:00:00Z", 0);
    s.push_http_response(500, "no");
    assert_eq!(run_value(&s, 1)["retried"], 1);
    let item = s.get_entry(ids::MODEL_WEBHOOK_OUTBOX, "out:retry").unwrap();
    assert_eq!(item["attempts"], 1);
    assert_eq!(item["status"], "pending");

    seed(&s, "terminal", "pending", "2026-05-31T00:00:00Z", 7);
    s.push_http_response(503, "down");
    assert_eq!(run_value(&s, 2)["failed"], 1);
    assert_eq!(
        s.get_entry(ids::MODEL_WEBHOOK_OUTBOX, "out:terminal")
            .unwrap()["status"],
        "failed"
    );
}

#[test]
fn skips_future_and_live_leases() {
    let s = FakeSeams::new();
    seed(&s, "future", "pending", "2027-01-01T00:00:00Z", 0);
    s.seed(
        ids::MODEL_WEBHOOK_OUTBOX,
        "out:leased",
        json!({
            "id": "leased", "url": "https://hooks.example.com/x", "payload": {},
            "status": "leased", "attempts": 0, "leaseOwner": "other",
            "leaseExpiresAt": "2026-05-31T13:00:00Z",
            "createdAt": "2026-05-31T00:00:00Z", "nextAttemptAt": "2026-05-31T00:00:00Z"
        }),
    );
    let result = run_value(&s, 1);
    assert_eq!(result["delivered"], 0);
    assert!(s.http_requests.borrow().is_empty());
}

#[test]
fn two_workers_cannot_claim_the_same_version() {
    let s = FakeSeams::new();
    seed(&s, "race", "pending", "2026-05-31T00:00:00Z", 0);
    let db = Db::new(&s, ids::DB_ACCESS);
    let snapshot = candidates(&db, s.now_unix_secs(), 1).unwrap().remove(0);
    let stale = snapshot.clone();
    let first = state::claim(&db, snapshot, "worker-a", s.now_unix_secs()).unwrap();
    let second = state::claim(&db, stale, "worker-b", s.now_unix_secs()).unwrap();
    assert!(first.is_some());
    assert!(second.is_none());
}

#[test]
fn expired_lease_is_reclaimed_but_stale_completion_is_fenced() {
    let s = FakeSeams::new();
    seed(&s, "x", "pending", "2026-05-31T00:00:00Z", 0);
    let db = Db::new(&s, ids::DB_ACCESS);
    let record = candidates(&db, s.now_unix_secs(), 1).unwrap().remove(0);
    let stale_claim = state::claim(&db, record, "worker-a", s.now_unix_secs())
        .unwrap()
        .unwrap();
    s.set_now(s.now_unix_secs() + LEASE_SECS + 1);
    let expired = candidates(&db, s.now_unix_secs(), 1).unwrap().remove(0);
    let fresh_claim = state::claim(&db, expired, "worker-b", s.now_unix_secs())
        .unwrap()
        .unwrap();
    assert!(
        state::complete(&db, stale_claim, "worker-a", s.now_unix_secs(), Ok(200))
            .unwrap()
            .is_none()
    );
    assert_eq!(
        state::complete(&db, fresh_claim, "worker-b", s.now_unix_secs(), Ok(200)).unwrap(),
        Some("delivered".to_string())
    );
}

#[test]
fn crash_after_claim_waits_for_expiry_then_retries_once() {
    let s = FakeSeams::new();
    seed(&s, "crash", "pending", "2026-05-31T00:00:00Z", 0);
    let db = Db::new(&s, ids::DB_ACCESS);
    let record = candidates(&db, s.now_unix_secs(), 1).unwrap().remove(0);
    let _abandoned = state::claim(&db, record, "crashed", s.now_unix_secs())
        .unwrap()
        .unwrap();
    assert_eq!(run_value(&s, 2)["delivered"], 0);
    assert!(s.http_requests.borrow().is_empty());
    s.set_now(s.now_unix_secs() + LEASE_SECS + 1);
    s.push_http_response(200, "{}");
    assert_eq!(run_value(&s, 3)["delivered"], 1);
    assert_eq!(s.http_requests.borrow().len(), 1);
}

#[test]
fn crash_after_egress_retries_with_the_same_delivery_identity() {
    let s = FakeSeams::new();
    seed(&s, "after-egress", "pending", "2026-05-31T00:00:00Z", 0);
    let db = Db::new(&s, ids::DB_ACCESS);
    let record = candidates(&db, s.now_unix_secs(), 1).unwrap().remove(0);
    let claim = state::claim(&db, record, "crashed", s.now_unix_secs())
        .unwrap()
        .unwrap();
    s.push_http_response(200, "{}");
    assert_eq!(deliver(&s, &claim.item), Ok(200));
    drop(claim); // process dies before its completion CAS

    s.set_now(s.now_unix_secs() + LEASE_SECS + 1);
    s.push_http_response(200, "{}");
    assert_eq!(run_value(&s, 2)["delivered"], 1);
    let requests = s.http_requests.borrow();
    assert_eq!(requests.len(), 2);
    assert_eq!(requests[0]["headers"], requests[1]["headers"]);
}

#[test]
fn expired_leases_compete_by_due_time_under_pending_saturation() {
    let s = FakeSeams::new();
    for i in 0..25 {
        seed(
            &s,
            &format!("pending:{i}"),
            "pending",
            "2026-05-31T11:00:00Z",
            0,
        );
    }
    s.seed(
        ids::MODEL_WEBHOOK_OUTBOX,
        "out:expired",
        json!({
            "id":"expired", "url":"https://hooks.example.com/x", "payload":{},
            "status":"leased", "attempts":0, "leaseOwner":"crashed",
            "leaseExpiresAt":"2026-05-31T10:00:00Z", "createdAt":"2026-05-30T00:00:00Z",
            "nextAttemptAt":"2026-05-31T00:00:00Z"
        }),
    );
    let rows = candidates(&Db::new(&s, ids::DB_ACCESS), s.now_unix_secs(), 25).unwrap();
    assert_eq!(rows.len(), 25);
    assert_eq!(rows[0].entry_key, "out:expired");
}

#[test]
fn retry_backoff_starts_after_slow_egress_completes() {
    let s = FakeSeams::new();
    seed(&s, "slow", "pending", "2026-05-31T00:00:00Z", 0);
    let start = s.now_unix_secs();
    s.push_http_response(503, "unavailable");
    s.push_http_time_advance(90);
    run_value(&s, 1);
    let row = s.get_entry(ids::MODEL_WEBHOOK_OUTBOX, "out:slow").unwrap();
    assert_eq!(
        time::parse_iso(row["nextAttemptAt"].as_str().unwrap()),
        Some(start + 90 + 60)
    );
}

#[test]
fn slow_delivery_defers_unclaimed_work_before_the_job_deadline() {
    let s = FakeSeams::new();
    for id in ["a", "b", "c"] {
        seed(&s, id, "pending", "2026-05-31T00:00:00Z", 0);
    }
    s.push_http_response(200, "{}");
    s.push_http_time_advance(46);
    let outcome = run_value(&s, 1);
    assert_eq!(outcome["delivered"], 1);
    assert_eq!(outcome["deferred"], 2);
    assert_eq!(s.http_requests.borrow().len(), 1);
    assert_eq!(
        s.get_entry(ids::MODEL_WEBHOOK_OUTBOX, "out:b").unwrap()["status"],
        "pending"
    );
}

#[test]
fn malformed_or_overflowing_delivery_cannot_poison_other_financial_effects() {
    let seams = FakeSeams::new();
    seams.seed(
        ids::MODEL_WEBHOOK_OUTBOX,
        "out:broken",
        json!({
            "status":"pending", "nextAttemptAt":"2026-05-01T00:00:00Z"
        }),
    );
    seed(
        &seams,
        "overflow",
        "pending",
        "2026-05-01T00:00:00Z",
        i64::MAX,
    );
    seed(&seams, "good", "pending", "2026-05-31T00:00:00Z", 0);
    crate::durable_effects::ensure(
        &Db::new(&seams, ids::DB_ACCESS),
        "test",
        "fact",
        vec![crate::durable_effects::event(
            ids::EVENT_PAYMENT_SUCCEEDED,
            "Paid",
            json!({}),
        )],
        seams.now_unix_secs(),
    )
    .unwrap();
    seams.push_http_response(200, "{}");
    assert_eq!(run_value(&seams, 1)["delivered"], 1);
    assert_eq!(seams.event_count(ids::EVENT_PAYMENT_SUCCEEDED), 1);
    for key in ["out:broken", "out:overflow"] {
        assert_eq!(
            seams.get_entry(ids::MODEL_WEBHOOK_OUTBOX, key).unwrap()["status"],
            "failed"
        );
    }
    assert_eq!(seams.http_requests.borrow().len(), 1);
}
