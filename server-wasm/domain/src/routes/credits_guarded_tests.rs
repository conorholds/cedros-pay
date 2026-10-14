use super::*;
use crate::db::BatchOp;
use crate::fake::FakeSeams;

fn seams() -> FakeSeams {
    let seams = FakeSeams::new();
    seams.set_secret(ids::SECRET_RP_TOKEN, "rp");
    seams
}

fn post(path: &str, body: serde_json::Value) -> RouteRequest {
    RouteRequest {
        route_id: ids::ROUTE_CREDITS_GRANT.into(),
        method: "POST".into(),
        path: path.into(),
        headers: vec![("authorization".into(), "Bearer rp".into())],
        body: body.to_string(),
        ..Default::default()
    }
}

fn invoke(seams: &FakeSeams, path: &str, body: serde_json::Value) -> AppResult<serde_json::Value> {
    let response = handle(seams, &post(path, body))?;
    serde_json::from_str(&response.body).map_err(|error| {
        AppError::internal("invalid test response").with_internal(error.to_string())
    })
}

fn grant(seams: &FakeSeams, amount: i64, source_ref: &str) {
    invoke(
        seams,
        "/credits/v1/grant",
        json!({
            "subjectId": "u1", "amountCents": amount,
            "currency": "USD", "sourceRef": source_ref,
        }),
    )
    .unwrap();
}

fn account(balance: i64, held: i64) -> serde_json::Value {
    json!({
        "subjectId": "u1", "balanceCents": balance, "heldCents": held,
        "currency": "USD", "updatedAt": "2026-05-31T12:00:00Z",
    })
}

fn txn(source_ref: &str, kind: &str, amount: i64, balance: i64) -> serde_json::Value {
    json!({
        "sourceRef": source_ref, "subjectId": "u1", "kind": kind,
        "amountCents": amount, "currency": "USD", "balanceAfterCents": balance,
        "createdAt": "2026-05-31T12:00:00Z",
    })
}

fn stored_account(seams: &FakeSeams) -> serde_json::Value {
    seams
        .get_entry(ids::MODEL_CREDITS, "acct:u1")
        .expect("account")
}

#[test]
fn strict_move_api_rejects_unguarded_extra_writes_before_mutation() {
    let seams = seams();
    let extra = BatchOp::Write {
        content_model_id: ids::MODEL_LEDGER,
        entry_key: "ledger:g1".into(),
        data: json!({ "status": "succeeded" }),
    };
    let error = moves_api::apply_guarded_credit_move(
        &seams,
        &CreditMove {
            subject_id: "u1",
            amount_cents: 500,
            currency: Some("USD"),
            kind: "grant",
            delta: 500,
            source_ref: "g1",
            reason: None,
        },
        &[],
        &[extra],
    )
    .unwrap_err();
    assert_eq!((error.status, error.code), (400, "bad_request"));
    assert!(seams.get_entry(ids::MODEL_CREDITS, "acct:u1").is_none());
    assert!(seams.get_entry(ids::MODEL_LEDGER, "ledger:g1").is_none());
}

#[test]
fn strict_move_api_commits_matching_guarded_extra_write() {
    let seams = seams();
    let ledger_key = "ledger:g1";
    let extra = BatchOp::Write {
        content_model_id: ids::MODEL_LEDGER,
        entry_key: ledger_key.into(),
        data: json!({ "status": "succeeded" }),
    };
    let guard = crate::guarded_batch::GuardedCondition::Absent {
        content_model_id: ids::MODEL_LEDGER,
        entry_key: ledger_key.into(),
    };
    let outcome = moves_api::apply_guarded_credit_move(
        &seams,
        &CreditMove {
            subject_id: "u1",
            amount_cents: 500,
            currency: Some("USD"),
            kind: "grant",
            delta: 500,
            source_ref: "g1",
            reason: None,
        },
        &[guard],
        &[extra],
    )
    .unwrap();
    assert!(outcome.applied);
    assert_eq!(stored_account(&seams)["balanceCents"], 500);
    assert_eq!(
        seams.get_entry(ids::MODEL_LEDGER, ledger_key).unwrap()["status"],
        "succeeded"
    );
}

#[test]
fn absent_account_grant_uses_atomic_identity_and_account_guards() {
    let seams = seams();
    let result = invoke(
        &seams,
        "/credits/v1/grant",
        json!({
            "subjectId": "u1", "amountCents": 500,
            "currency": "USD", "sourceRef": "g1",
        }),
    )
    .unwrap();
    assert_eq!(
        (result["applied"].as_bool(), result["balanceCents"].as_i64()),
        (Some(true), Some(500))
    );
    assert!(seams.get_entry(ids::MODEL_CREDITS, "txn:g1").is_some());
}

#[test]
fn competing_grants_preserve_winner_and_loser_can_retry() {
    let seams = seams();
    seams.queue_guarded_race(vec![
        (ids::MODEL_CREDITS, "acct:u1", account(700, 0)),
        (ids::MODEL_CREDITS, "txn:g2", txn("g2", "grant", 700, 700)),
    ]);
    let error = invoke(
        &seams,
        "/credits/v1/grant",
        json!({ "subjectId": "u1", "amountCents": 500, "sourceRef": "g1" }),
    )
    .unwrap_err();
    assert_eq!((error.status, error.code), (409, "conflict"));
    assert_eq!(stored_account(&seams)["balanceCents"], 700);
    assert!(seams.get_entry(ids::MODEL_CREDITS, "txn:g1").is_none());

    let retry = invoke(
        &seams,
        "/credits/v1/grant",
        json!({ "subjectId": "u1", "amountCents": 500, "sourceRef": "g1" }),
    )
    .unwrap();
    assert_eq!(retry["balanceCents"], 1200);
}

#[test]
fn competing_debits_never_overspend_or_write_losing_audit() {
    let seams = seams();
    grant(&seams, 1000, "seed");
    seams.queue_guarded_race(vec![
        (ids::MODEL_CREDITS, "acct:u1", account(400, 0)),
        (
            ids::MODEL_CREDITS,
            "txn:s2",
            txn("s2", "authorize", 600, 400),
        ),
    ]);
    let error = invoke(
        &seams,
        "/credits/v1/authorize",
        json!({ "subjectId": "u1", "amountCents": 600, "sourceRef": "s1" }),
    )
    .unwrap_err();
    assert_eq!((error.status, error.code), (409, "conflict"));
    assert_eq!(stored_account(&seams)["balanceCents"], 400);
    assert!(seams.get_entry(ids::MODEL_CREDITS, "txn:s1").is_none());

    let retry = invoke(
        &seams,
        "/credits/v1/authorize",
        json!({ "subjectId": "u1", "amountCents": 600, "sourceRef": "s1" }),
    )
    .unwrap_err();
    assert_eq!((retry.status, retry.code), (402, "insufficient_funds"));
}

#[test]
fn grant_racing_debit_converges_without_lost_update() {
    let seams = seams();
    grant(&seams, 1000, "seed");
    seams.queue_guarded_race(vec![
        (ids::MODEL_CREDITS, "acct:u1", account(800, 0)),
        (
            ids::MODEL_CREDITS,
            "txn:s1",
            txn("s1", "authorize", 200, 800),
        ),
    ]);
    let error = invoke(
        &seams,
        "/credits/v1/grant",
        json!({ "subjectId": "u1", "amountCents": 500, "sourceRef": "g1" }),
    )
    .unwrap_err();
    assert_eq!(error.status, 409);
    let retry = invoke(
        &seams,
        "/credits/v1/grant",
        json!({ "subjectId": "u1", "amountCents": 500, "sourceRef": "g1" }),
    )
    .unwrap();
    assert_eq!(retry["balanceCents"], 1300);
}

#[test]
fn exact_racing_replay_returns_stored_success_but_conflicting_replay_fails() {
    for (stored_amount, expected_status) in [(500, 200), (400, 409)] {
        let seams = seams();
        seams.queue_guarded_race(vec![
            (ids::MODEL_CREDITS, "acct:u1", account(stored_amount, 0)),
            (
                ids::MODEL_CREDITS,
                "txn:g1",
                txn("g1", "grant", stored_amount, stored_amount),
            ),
        ]);
        let result = invoke(
            &seams,
            "/credits/v1/grant",
            json!({ "subjectId": "u1", "amountCents": 500, "sourceRef": "g1" }),
        );
        if expected_status == 200 {
            let body = result.unwrap();
            assert_eq!(
                (body["applied"].as_bool(), body["idempotent"].as_bool()),
                (Some(false), Some(true))
            );
        } else {
            assert_eq!(result.unwrap_err().status, expected_status);
        }
    }
}

#[test]
fn hold_racing_debit_conflicts_without_partial_hold() {
    let seams = seams();
    grant(&seams, 1000, "seed");
    seams.queue_guarded_race(vec![
        (ids::MODEL_CREDITS, "acct:u1", account(300, 0)),
        (
            ids::MODEL_CREDITS,
            "txn:s1",
            txn("s1", "authorize", 700, 300),
        ),
    ]);
    let error = invoke(
        &seams,
        "/credits/v1/hold",
        json!({ "subjectId": "u1", "amountCents": 400, "holdId": "h1" }),
    )
    .unwrap_err();
    assert_eq!(error.status, 409);
    assert_eq!(stored_account(&seams)["heldCents"], 0);
    assert!(seams.get_entry(ids::MODEL_CREDITS, "hold:h1").is_none());
}

#[test]
fn competing_exact_hold_is_idempotent_and_conflicting_hold_is_rejected() {
    for (stored_amount, expected_status) in [(400, 200), (300, 409)] {
        let seams = seams();
        grant(&seams, 1000, "seed");
        seams.queue_guarded_race(vec![
            (ids::MODEL_CREDITS, "acct:u1", account(1000, stored_amount)),
            (
                ids::MODEL_CREDITS,
                "hold:h1",
                json!({
                    "holdId": "h1", "subjectId": "u1", "amountCents": stored_amount,
                    "currency": "USD", "status": "held",
                    "createdAt": "2026-05-31T12:00:00Z",
                }),
            ),
        ]);
        let result = invoke(
            &seams,
            "/credits/v1/hold",
            json!({ "subjectId": "u1", "amountCents": 400, "holdId": "h1" }),
        );
        if expected_status == 200 {
            assert_eq!(result.unwrap()["idempotent"], true);
        } else {
            assert_eq!(result.unwrap_err().status, expected_status);
        }
    }
}

#[test]
fn concurrent_double_release_returns_idempotent_winner_state() {
    let seams = seams();
    grant(&seams, 1000, "seed");
    invoke(
        &seams,
        "/credits/v1/hold",
        json!({ "subjectId": "u1", "amountCents": 400, "holdId": "h1" }),
    )
    .unwrap();
    seams.queue_guarded_race(vec![
        (ids::MODEL_CREDITS, "acct:u1", account(1000, 0)),
        (
            ids::MODEL_CREDITS,
            "hold:h1",
            json!({
                "holdId": "h1", "subjectId": "u1", "amountCents": 400,
                "currency": "USD", "status": "released",
                "createdAt": "2026-05-31T12:00:00Z",
            }),
        ),
    ]);
    let result = invoke(&seams, "/credits/v1/release", json!({ "holdId": "h1" })).unwrap();
    assert_eq!(
        (result["status"].as_str(), result["idempotent"].as_bool()),
        (Some("released"), Some(true))
    );
    assert_eq!(stored_account(&seams)["heldCents"], 0);
}

#[path = "credits_guarded_replay_tests.rs"]
mod replay_tests;

#[test]
fn movement_amount_and_direction_must_match_the_immutable_ledger() {
    for (kind, amount, delta) in [
        ("grant", 500, -500),
        ("authorize", 500, 500),
        ("grant", 0, 500),
        ("grant", -500, -500),
        ("authorize", 500, -501),
    ] {
        let s = seams();
        let movement = CreditMove {
            subject_id: "u1",
            amount_cents: amount,
            currency: Some("USD"),
            kind,
            delta,
            source_ref: "malformed",
            reason: None,
        };
        assert!(apply_guarded_credit_move(&s, &movement, &[], &[]).is_err());
        assert_eq!(s.entry_count(ids::MODEL_CREDITS), 0);
    }
}
