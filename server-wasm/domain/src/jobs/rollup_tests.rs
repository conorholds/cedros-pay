use super::*;
use crate::fake::FakeSeams;

fn payment(s: &FakeSeams, reference: &str, gross: i64, route: &str, processed_at: &str) {
    s.seed(
        ids::MODEL_LEDGER,
        reference,
        json!({
            "reference": reference, "kind": "payment", "status": "succeeded",
            "grossCents": gross, "refundCents": 0, "currency": "USD",
            "routePath": route, "provider": "stripe",
            "createdAt": processed_at, "processedAt": processed_at
        }),
    );
}

#[test]
fn rolls_up_one_day_and_attributes_routes() {
    let s = FakeSeams::new();
    payment(&s, "a", 10_000, "/pricing", "2026-05-30T08:00:00Z");
    payment(&s, "b", 5_000, "/pricing", "2026-05-30T20:00:00Z");
    payment(&s, "c", 1_000, "/blog", "2026-05-30T21:00:00Z");
    // outside the day — excluded
    payment(&s, "d", 99_999, "/pricing", "2026-05-31T01:00:00Z");

    let exec = JobExecution {
        job_id: ids::JOB_STATS_ROLLUP.into(),
        metadata_json: json!({ "day": "2026-05-30" }).to_string(),
        attempt: 1,
    };
    let outcome = run(&s, &exec).unwrap();
    assert!(matches!(
        outcome.status,
        crate::reqresp::JobStatus::Succeeded
    ));

    let row = s.get_entry(ids::MODEL_ROLLUP, "2026-05-30").unwrap();
    assert_eq!(row["grossCents"], 16_000);
    assert_eq!(row["txnCount"], 3);
    let routes = row["routes"].as_array().unwrap();
    assert_eq!(routes[0]["key"], "/pricing");
    assert_eq!(routes[0]["grossCents"], 15_000);
}

#[test]
fn refund_outflow_comes_from_settled_refund_rows_bucketed_by_their_own_day() {
    let s = FakeSeams::new();
    // A payment on the 30th plus its discrete partial refund on the same day.
    payment(&s, "p1", 10_000, "/pricing", "2026-05-30T08:00:00Z");
    s.seed(
        ids::MODEL_LEDGER,
        "stripe-refund:re_1",
        json!({
            "reference": "stripe-refund:re_1", "kind": "refund", "status": "succeeded",
            "grossCents": 4_000, "refundCents": 0, "currency": "USD", "provider": "stripe",
            "createdAt": "2026-05-30T12:00:00Z", "processedAt": "2026-05-30T12:00:00Z"
        }),
    );
    // A refund settled the NEXT day must not count toward the 30th.
    s.seed(
        ids::MODEL_LEDGER,
        "stripe-refund:re_2",
        json!({
            "reference": "stripe-refund:re_2", "kind": "refund", "status": "succeeded",
            "grossCents": 1_000, "refundCents": 0, "currency": "USD", "provider": "stripe",
            "createdAt": "2026-05-31T09:00:00Z", "processedAt": "2026-05-31T09:00:00Z"
        }),
    );

    let exec = JobExecution {
        job_id: ids::JOB_STATS_ROLLUP.into(),
        metadata_json: json!({ "day": "2026-05-30" }).to_string(),
        attempt: 1,
    };
    run(&s, &exec).unwrap();
    let row = s.get_entry(ids::MODEL_ROLLUP, "2026-05-30").unwrap();
    assert_eq!(row["grossCents"], 10_000);
    assert_eq!(row["refundCents"], 4_000, "only the 30th's refund row");
}

#[test]
fn defaults_to_yesterday_and_is_idempotent() {
    let s = FakeSeams::new(); // now 2026-05-31
    payment(&s, "a", 2_000, "/pricing", "2026-05-30T10:00:00Z");
    let exec = JobExecution {
        job_id: ids::JOB_STATS_ROLLUP.into(),
        metadata_json: String::new(),
        attempt: 1,
    };
    run(&s, &exec).unwrap();
    run(&s, &exec).unwrap(); // re-run overwrites, no duplication
    assert_eq!(s.entry_count(ids::MODEL_ROLLUP), 1);
    assert_eq!(
        s.get_entry(ids::MODEL_ROLLUP, "2026-05-30").unwrap()["grossCents"],
        2_000
    );
}
#[test]
fn rollup_cap_rejects_overflow_without_overwriting_complete_summary() {
    for kind in ["payment", "refund"] {
        let s = FakeSeams::new();
        for i in 0..10_001 {
            s.seed(
                ids::MODEL_LEDGER,
                &format!("row:{i:05}"),
                json!({
                    "reference":format!("row:{i}"), "kind":kind, "status":"succeeded",
                    "grossCents":100, "refundCents":0, "currency":"USD", "provider":"stripe",
                    "createdAt":"2026-05-30T12:00:00Z", "processedAt":"2026-05-30T12:00:00Z"
                }),
            );
        }
        s.seed(ids::MODEL_ROLLUP, "2026-05-30", json!({"complete":true}));
        let exec = JobExecution {
            job_id: ids::JOB_STATS_ROLLUP.into(),
            metadata_json: json!({"day":"2026-05-30"}).to_string(),
            attempt: 1,
        };
        assert_eq!(run(&s, &exec).unwrap_err().status, 422);
        assert_eq!(
            s.get_entry(ids::MODEL_ROLLUP, "2026-05-30").unwrap(),
            json!({"complete":true})
        );
        Db::new(&s, ids::DB_ACCESS)
            .delete(ids::MODEL_LEDGER, "row:10000")
            .unwrap();
        run(&s, &exec).unwrap();
        let summary = s.get_entry(ids::MODEL_ROLLUP, "2026-05-30").unwrap();
        assert_eq!(
            summary[if kind == "payment" {
                "grossCents"
            } else {
                "refundCents"
            }],
            1_000_000
        );
    }
}

#[test]
fn shipped_empty_day_metadata_uses_yesterday() {
    let s = FakeSeams::new();
    let result = run(
        &s,
        &JobExecution {
            metadata_json: json!({"day":""}).to_string(),
            ..Default::default()
        },
    )
    .unwrap();
    assert_eq!(
        serde_json::from_str::<Value>(&result.details_json).unwrap()["day"],
        "2026-05-30"
    );
}

#[test]
fn refunded_payments_stay_in_gross_and_failed_payments_do_not() {
    let s = FakeSeams::new();
    for (id, status) in [("paid", "refunded"), ("failed", "failed")] {
        payment(&s, id, 1000, "/pricing", "2026-05-30T08:00:00Z");
        let mut row = s.get_entry(ids::MODEL_LEDGER, id).unwrap();
        row["status"] = json!(status);
        row["refundCents"] = json!(1000);
        s.seed(ids::MODEL_LEDGER, id, row);
    }
    run(&s, &JobExecution::default()).unwrap();
    let summary = s.get_entry(ids::MODEL_ROLLUP, "2026-05-30").unwrap();
    assert_eq!(summary["grossCents"], 1000);
    assert_eq!(summary["txnCount"], 1);
}

#[test]
fn incompatible_currency_and_corrupt_rows_preserve_the_previous_rollup() {
    for kind in ["payment", "refund"] {
        for invalid in [json!({"currency":"EUR"}), json!({"grossCents":"invalid"})] {
            let s = FakeSeams::new();
            payment(&s, "valid", 1000, "/pricing", "2026-05-30T08:00:00Z");
            let mut row = s.get_entry(ids::MODEL_LEDGER, "valid").unwrap();
            row["reference"] = json!("invalid");
            row["kind"] = json!(kind);
            row.as_object_mut()
                .unwrap()
                .extend(invalid.as_object().unwrap().clone());
            s.seed(ids::MODEL_LEDGER, "invalid", row);
            s.seed(ids::MODEL_ROLLUP, "2026-05-30", json!({"previous":true}));
            assert!(run(&s, &JobExecution::default()).is_err());
            assert_eq!(
                s.get_entry(ids::MODEL_ROLLUP, "2026-05-30").unwrap(),
                json!({"previous":true})
            );
        }
    }
}
