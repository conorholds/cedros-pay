use super::*;
use crate::fake::FakeSeams;

const MAX_ID_LEN: usize = 256;

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

fn balance_request(subject: &str) -> RouteRequest {
    RouteRequest {
        route_id: ids::ROUTE_CREDITS_BALANCE.into(),
        method: "GET".into(),
        path: "/credits/v1/balance".into(),
        headers: vec![("authorization".into(), "Bearer rp".into())],
        query: vec![("subjectId".into(), subject.into())],
        ..Default::default()
    }
}

fn get_balance(seams: &FakeSeams, subject: &str) -> serde_json::Value {
    let response = handle(seams, &balance_request(subject)).unwrap();
    serde_json::from_str(&response.body).unwrap()
}

fn assert_error(seams: &FakeSeams, path: &str, body: serde_json::Value, status: u16) {
    let error = handle(seams, &post(path, body)).unwrap_err();
    assert_eq!(error.status, status, "unexpected error: {error:?}");
    let expected_code = match status {
        402 => "insufficient_funds",
        409 => "conflict",
        422 => "unprocessable",
        _ => panic!("test helper does not map status {status}"),
    };
    assert_eq!(error.code, expected_code, "unexpected error: {error:?}");
}

fn grant(seams: &FakeSeams, subject: &str, amount: i64, source_ref: &str) {
    handle(
        seams,
        &post(
            "/credits/v1/grant",
            json!({
                "subjectId": subject,
                "amountCents": amount,
                "currency": "USD",
                "sourceRef": source_ref,
            }),
        ),
    )
    .unwrap();
}

#[test]
fn grant_is_idempotent_on_source_ref() {
    let seams = seams();
    let body = json!({
        "subjectId": "u1",
        "amountCents": 1000,
        "currency": "USD",
        "sourceRef": "gift_1",
    });
    let first = handle(&seams, &post("/credits/v1/grant", body.clone())).unwrap();
    assert_eq!(
        serde_json::from_str::<serde_json::Value>(&first.body).unwrap()["applied"],
        true
    );
    let second = handle(&seams, &post("/credits/v1/grant", body)).unwrap();
    let response: serde_json::Value = serde_json::from_str(&second.body).unwrap();
    assert_eq!(response["applied"], false);
    assert_eq!(response["idempotent"], true);
    assert_eq!(get_balance(&seams, "u1")["balanceCents"], 1000);
    let crm = seams.crm_events.borrow();
    assert_eq!(crm.len(), 1);
    assert_eq!(crm[0].2, ids::CRM_EVENT_CREDIT_PURCHASE);
    assert_eq!(crm[0].3["customerId"], "u1");
    assert_eq!(crm[0].3["amountCents"], 1000);
    assert_eq!(crm[0].3["orderReference"], "gift_1");
    assert_eq!(seams.event_count(ids::EVENT_PAYMENT_SUCCEEDED), 1);
    let purchase = seams.events.borrow()[0].2.clone();
    assert_eq!(purchase["payment_rail"], "credits");
    assert_eq!(purchase["flow"], "credit-purchase");
    assert_eq!(purchase["amount_cents"], 1000);
    assert!(!purchase.to_string().contains("u1"));
}

#[test]
fn conflicting_source_ref_replays_are_rejected() {
    let cases = [
        (
            "/credits/v1/grant",
            json!({ "subjectId": "u2", "amountCents": 1000, "currency": "USD", "reason": "welcome", "sourceRef": "gift_1" }),
        ),
        (
            "/credits/v1/grant",
            json!({ "subjectId": "u1", "amountCents": 999, "currency": "USD", "reason": "welcome", "sourceRef": "gift_1" }),
        ),
        (
            "/credits/v1/authorize",
            json!({ "subjectId": "u1", "amountCents": 1000, "currency": "USD", "reason": "welcome", "sourceRef": "gift_1" }),
        ),
        (
            "/credits/v1/grant",
            json!({ "subjectId": "u1", "amountCents": 1000, "currency": "EUR", "reason": "welcome", "sourceRef": "gift_1" }),
        ),
        (
            "/credits/v1/grant",
            json!({ "subjectId": "u1", "amountCents": 1000, "currency": "USD", "reason": "different", "sourceRef": "gift_1" }),
        ),
    ];

    for (path, replay) in cases {
        let seams = seams();
        handle(
            &seams,
            &post(
                "/credits/v1/grant",
                json!({ "subjectId": "u1", "amountCents": 1000, "currency": "USD", "reason": "welcome", "sourceRef": "gift_1" }),
            ),
        )
        .unwrap();
        assert_error(&seams, path, replay, 409);
        assert_eq!(get_balance(&seams, "u1")["balanceCents"], 1000);
    }
}

#[test]
fn authorize_spend_does_not_emit_payment_succeeded() {
    let seams = seams();
    grant(&seams, "u1", 1000, "g1");
    handle(
        &seams,
        &post(
            "/credits/v1/authorize",
            json!({ "subjectId": "u1", "amountCents": 600, "sourceRef": "s1" }),
        ),
    )
    .unwrap();
    assert_eq!(seams.event_count(ids::EVENT_PAYMENT_SUCCEEDED), 1);
}

#[test]
fn authorize_debits_and_blocks_overspend() {
    let seams = seams();
    grant(&seams, "u1", 1000, "g1");
    handle(
        &seams,
        &post(
            "/credits/v1/authorize",
            json!({ "subjectId": "u1", "amountCents": 600, "sourceRef": "s1" }),
        ),
    )
    .unwrap();
    assert_eq!(get_balance(&seams, "u1")["balanceCents"], 400);
    assert_error(
        &seams,
        "/credits/v1/authorize",
        json!({ "subjectId": "u1", "amountCents": 600, "sourceRef": "s2" }),
        402,
    );
}

#[test]
fn hold_and_release_round_trip() {
    let seams = seams();
    grant(&seams, "u1", 1000, "g1");
    handle(
        &seams,
        &post(
            "/credits/v1/hold",
            json!({ "subjectId": "u1", "amountCents": 700, "holdId": "h1" }),
        ),
    )
    .unwrap();
    let held = get_balance(&seams, "u1");
    assert_eq!(held["heldCents"], 700);
    assert_eq!(held["availableCents"], 300);
    assert_error(
        &seams,
        "/credits/v1/hold",
        json!({ "subjectId": "u1", "amountCents": 400, "holdId": "h2" }),
        402,
    );
    handle(
        &seams,
        &post("/credits/v1/release", json!({ "holdId": "h1" })),
    )
    .unwrap();
    let released = handle(
        &seams,
        &post("/credits/v1/release", json!({ "holdId": "h1" })),
    )
    .unwrap();
    assert_eq!(
        serde_json::from_str::<serde_json::Value>(&released.body).unwrap()["idempotent"],
        true
    );
    assert_eq!(get_balance(&seams, "u1")["availableCents"], 1000);
}

#[test]
fn conflicting_hold_id_replays_are_rejected() {
    let cases = [
        json!({ "subjectId": "u2", "amountCents": 400, "holdId": "h1" }),
        json!({ "subjectId": "u1", "amountCents": 401, "holdId": "h1" }),
    ];

    for replay in cases {
        let seams = seams();
        grant(&seams, "u1", 1000, "g1");
        grant(&seams, "u2", 1000, "g2");
        handle(
            &seams,
            &post(
                "/credits/v1/hold",
                json!({ "subjectId": "u1", "amountCents": 400, "holdId": "h1" }),
            ),
        )
        .unwrap();
        assert_error(&seams, "/credits/v1/hold", replay, 409);
        assert_eq!(get_balance(&seams, "u1")["heldCents"], 400);
        assert_eq!(get_balance(&seams, "u2")["heldCents"], 0);
    }
}

#[test]
fn malformed_supplied_currencies_are_rejected() {
    for currency in ["dollars", "", "US1", "US$"] {
        let seams = seams();
        assert_error(
            &seams,
            "/credits/v1/grant",
            json!({ "subjectId": "u1", "amountCents": 100, "currency": currency, "sourceRef": "g1" }),
            422,
        );
        assert_eq!(get_balance(&seams, "u1")["balanceCents"], 0);
    }
}

#[test]
fn plausible_currency_is_normalized_without_rejecting_case_or_whitespace() {
    let seams = seams();
    handle(
        &seams,
        &post(
            "/credits/v1/grant",
            json!({ "subjectId": "u1", "amountCents": 100, "currency": " usd ", "sourceRef": "g1" }),
        ),
    )
    .unwrap();
    assert_eq!(get_balance(&seams, "u1")["currency"], "USD");
}

#[test]
fn hold_rejects_invalid_currency_and_unsupported_expiry_without_mutating_balance() {
    let seams = seams();
    grant(&seams, "u1", 1000, "g1");
    for body in [
        json!({ "subjectId": "u1", "amountCents": 100, "currency": "US1", "holdId": "h1" }),
        json!({ "subjectId": "u1", "amountCents": 100, "holdId": "h2", "expiresAt": "2026-07-11T00:00:00Z" }),
    ] {
        assert_error(&seams, "/credits/v1/hold", body, 422);
    }
    assert_eq!(get_balance(&seams, "u1")["heldCents"], 0);
}

#[test]
fn balance_overflow_is_rejected_without_changing_the_account() {
    let seams = seams();
    grant(&seams, "u1", i64::MAX, "g1");
    assert_error(
        &seams,
        "/credits/v1/grant",
        json!({ "subjectId": "u1", "amountCents": 1, "currency": "USD", "sourceRef": "g2" }),
        422,
    );
    assert_eq!(get_balance(&seams, "u1")["balanceCents"], i64::MAX);
}

#[test]
fn corrupted_negative_or_overheld_accounts_fail_closed() {
    for (balance, held) in [(-1, 0), (100, -1), (100, 101)] {
        let seams = seams();
        seams.seed(
            ids::MODEL_CREDITS,
            "acct:u1",
            json!({
                "subjectId": "u1", "balanceCents": balance, "heldCents": held,
                "currency": "USD", "updatedAt": "2026-01-01T00:00:00Z"
            }),
        );

        assert_eq!(
            handle(&seams, &balance_request("u1")).unwrap_err().status,
            500
        );
        assert_eq!(
            handle(
                &seams,
                &post(
                    "/credits/v1/authorize",
                    json!({"subjectId":"u1","amountCents":1,"sourceRef":"spend"}),
                ),
            )
            .unwrap_err()
            .status,
            500
        );
        assert!(seams.get_entry(ids::MODEL_CREDITS, "txn:spend").is_none());
    }
}

#[test]
fn empty_and_overlong_identifiers_are_rejected() {
    let overlong = "x".repeat(MAX_ID_LEN + 1);
    for subject in ["", "   ", overlong.as_str()] {
        let seams = seams();
        assert_error(
            &seams,
            "/credits/v1/grant",
            json!({ "subjectId": subject, "amountCents": 100, "sourceRef": "g1" }),
            422,
        );
    }
    for source_ref in ["", "   ", overlong.as_str()] {
        let seams = seams();
        assert_error(
            &seams,
            "/credits/v1/grant",
            json!({ "subjectId": "u1", "amountCents": 100, "sourceRef": source_ref }),
            422,
        );
    }
    for hold_id in ["", "   ", overlong.as_str()] {
        let seams = seams();
        grant(&seams, "u1", 1000, "g1");
        assert_error(
            &seams,
            "/credits/v1/hold",
            json!({ "subjectId": "u1", "amountCents": 100, "holdId": hold_id }),
            422,
        );
        assert_error(
            &seams,
            "/credits/v1/release",
            json!({ "holdId": hold_id }),
            422,
        );
    }
    let seams = seams();
    for subject in ["", "   ", overlong.as_str()] {
        let error = handle(&seams, &balance_request(subject)).unwrap_err();
        assert!(matches!(error.status, 400 | 422));
    }
}

#[test]
fn identifiers_at_the_limit_are_accepted() {
    let subject = "s".repeat(MAX_ID_LEN);
    let source_ref = "r".repeat(MAX_ID_LEN);
    let hold_id = "h".repeat(MAX_ID_LEN);
    let seams = seams();
    grant(&seams, &subject, 1000, &source_ref);
    handle(
        &seams,
        &post(
            "/credits/v1/hold",
            json!({ "subjectId": subject, "amountCents": 100, "holdId": hold_id }),
        ),
    )
    .unwrap();
}

#[test]
fn rejects_non_positive_and_missing_source_ref() {
    let seams = seams();
    assert_error(
        &seams,
        "/credits/v1/grant",
        json!({ "subjectId": "u1", "amountCents": 0, "sourceRef": "x" }),
        422,
    );
    assert_error(
        &seams,
        "/credits/v1/grant",
        json!({ "subjectId": "u1", "amountCents": 10, "sourceRef": "" }),
        422,
    );
}

#[test]
fn credit_contract_uses_stable_generic_error_codes() {
    let unconfigured = FakeSeams::new();
    let error = handle(&unconfigured, &balance_request("u1")).unwrap_err();
    assert_eq!((error.status, error.code), (403, "forbidden"));

    let seams = seams();
    let mut unauthorized = balance_request("u1");
    unauthorized.headers = vec![("authorization".into(), "Bearer wrong".into())];
    let error = handle(&seams, &unauthorized).unwrap_err();
    assert_eq!((error.status, error.code), (401, "unauthorized"));

    let mut missing_subject = balance_request("u1");
    missing_subject.query.clear();
    let error = handle(&seams, &missing_subject).unwrap_err();
    assert_eq!((error.status, error.code), (400, "bad_request"));

    let error = handle(
        &seams,
        &post("/credits/v1/release", json!({ "holdId": "missing" })),
    )
    .unwrap_err();
    assert_eq!((error.status, error.code), (404, "not_found"));
}

#[test]
fn host_handoff_exposes_only_read_only_credit_balance() {
    let handoff: serde_json::Value = serde_json::from_str(include_str!(
        "../../../../docs/fixtures/cedros-pay-route-contracts.json"
    ))
    .unwrap();
    let contracts = handoff["routeContracts"].as_array().unwrap();
    let balance = contracts
        .iter()
        .find(|contract| contract["routeId"] == ids::ROUTE_CREDITS_BALANCE)
        .expect("balance contract remains available");
    assert_eq!(
        balance["errorCodes"],
        serde_json::json!(["bad_request", "unauthorized", "forbidden", "internal_error"])
    );
    for route_id in [
        ids::ROUTE_CREDITS_GRANT,
        ids::ROUTE_CREDITS_AUTHORIZE,
        ids::ROUTE_CREDITS_HOLD,
        ids::ROUTE_CREDITS_RELEASE,
    ] {
        assert!(
            contracts
                .iter()
                .all(|contract| contract["routeId"] != route_id),
            "{route_id} must stay out of packaged discovery until host CAS adoption"
        );
    }
}
