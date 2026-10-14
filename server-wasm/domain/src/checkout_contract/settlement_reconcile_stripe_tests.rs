use serde_json::{json, Value};

use super::super::*;

#[test]
fn exact_expired_unpaid_proof_releases_once_and_becomes_terminal() {
    let (seams, operation_id, provider_id, hold_id) = pending("expired");
    queue_retrieval(
        &seams,
        &operation_id,
        &provider_id,
        "expired",
        Some("unpaid"),
    );

    let report = reconcile_settlements(&seams, 100).unwrap();

    assert_eq!(
        (report.released, report.committed, report.deferred),
        (1, 0, 0)
    );
    assert_eq!(inventory_lifecycle_tests::stock(&seams)["reserved"], 0);
    assert_eq!(
        seams.get_entry(INVENTORY_HOLD_MODEL, &hold_id).unwrap()["status"],
        "released"
    );
    assert!(matches!(
        api_tests::facade(&seams).status(&operation_id).unwrap(),
        CanonicalPaymentOutcome::Terminal { ref code, .. }
            if code == "provider-session-expired"
    ));
    assert_eq!(reconcile_settlements(&seams, 100).unwrap().scanned, 0);
}

#[test]
fn correlated_paid_provider_proof_commits_inventory_and_effect_atomically() {
    let (seams, operation_id, provider_id, _) = pending("provider-paid");
    queue_retrieval(
        &seams,
        &operation_id,
        &provider_id,
        "complete",
        Some("paid"),
    );

    let report = reconcile_settlements(&seams, 100).unwrap();

    assert_eq!((report.committed, report.released), (1, 0));
    let stock = inventory_lifecycle_tests::stock(&seams);
    assert_eq!(
        (stock["reserved"].as_u64(), stock["sold"].as_u64()),
        (Some(0), Some(2))
    );
    let commerce = crate::db::Db::new(&seams, crate::ids::DB_ACCESS)
        .read(crate::ids::MODEL_LEDGER, &crate::db::Query::new())
        .unwrap();
    assert_eq!(
        commerce
            .iter()
            .filter(|row| row.payload["kind"] == "payment")
            .count(),
        1
    );
    assert_eq!(
        commerce
            .iter()
            .filter(|row| row.payload["kind"] == "order")
            .count(),
        1
    );
    assert_eq!(
        crate::db::Db::new(&seams, crate::ids::DB_ACCESS)
            .read(
                crate::ids::MODEL_WEBHOOK_OUTBOX,
                &crate::db::Query::new().filter(crate::db::Filter::new(
                    "recordType",
                    crate::db::Op::Eq,
                    "canonicalSettlementEffect"
                ))
            )
            .unwrap()
            .len(),
        1
    );
}

#[test]
fn local_expiry_and_uncertain_provider_states_never_release_stock() {
    for (id, status, payment) in [
        ("open", "open", Some("unpaid")),
        ("open-paid", "open", Some("paid")),
        ("expired-paid", "expired", Some("paid")),
        ("complete-unpaid", "complete", Some("unpaid")),
        ("expired-unknown", "expired", None),
    ] {
        let (seams, operation_id, provider_id, hold_id) = pending(id);
        queue_retrieval(&seams, &operation_id, &provider_id, status, payment);
        assert_deferred(&seams, &hold_id);
    }

    let (missing, _, _, hold_id) = pending("missing");
    missing.push_http_response(404, r#"{"error":{"type":"invalid_request_error"}}"#);
    assert_deferred(&missing, &hold_id);

    let (malformed, _, _, hold_id) = pending("malformed");
    malformed.push_http_response(
        200,
        r#"{"id":"cs_malformed","status":"closed","expires_at":1}"#,
    );
    assert_deferred(&malformed, &hold_id);
}

#[test]
fn paid_provider_proof_with_changed_amount_or_currency_is_deferred() {
    for (id, field, changed) in [
        ("paid-amount-mismatch", "amount_total", json!(1)),
        ("paid-currency-mismatch", "currency", json!("eur")),
    ] {
        let (seams, operation_id, provider_id, hold_id) = pending(id);
        let mut response: Value = serde_json::from_str(&api_tests::retrieval(
            &seams,
            &operation_id,
            &provider_id,
            "",
        ))
        .unwrap();
        response["status"] = json!("complete");
        response["payment_status"] = json!("paid");
        response[field] = changed;
        seams.push_http_response(200, &response.to_string());

        assert_deferred(&seams, &hold_id);
    }
}

#[test]
fn expired_release_failure_rolls_back_and_exact_retry_converges() {
    let (seams, operation_id, provider_id, hold_id) = pending("rollback");
    queue_retrieval(
        &seams,
        &operation_id,
        &provider_id,
        "expired",
        Some("unpaid"),
    );
    seams.fail_guarded_commit_after_next_http();

    assert!(reconcile_settlements(&seams, 100).is_err());
    assert_eq!(inventory_lifecycle_tests::stock(&seams)["reserved"], 2);
    assert_eq!(
        seams.get_entry(INVENTORY_HOLD_MODEL, &hold_id).unwrap()["status"],
        "checkout_pending"
    );

    queue_retrieval(
        &seams,
        &operation_id,
        &provider_id,
        "expired",
        Some("unpaid"),
    );
    assert_eq!(reconcile_settlements(&seams, 100).unwrap().released, 1);
    assert_eq!(inventory_lifecycle_tests::stock(&seams)["reserved"], 0);
}

fn pending(id: &str) -> (crate::fake::FakeSeams, String, String, String) {
    let seams = inventory_lifecycle_tests::setup_tracked(10);
    seams.set_secret(crate::ids::SECRET_STRIPE_KEY, "sk_test_redacted");
    let quote = api_tests::facade(&seams)
        .quote(
            &format!("{id}-quote"),
            &api_tests::quote_body(&format!("{id}-quote"), json!(["stripe"])),
        )
        .unwrap();
    let hold_id = quote.quote.inventory_hold.as_ref().unwrap().hold_id.clone();
    let provider_id = format!("cs_{id}");
    seams.push_http_response(
        200,
        &json!({ "id": provider_id, "url": "https://checkout.stripe.com/session" }).to_string(),
    );
    let outcome = api_tests::facade(&seams)
        .checkout(
            &format!("{id}-checkout"),
            &api_tests::checkout_body(&format!("{id}-checkout"), &quote.operation_id, "stripe"),
        )
        .unwrap();
    let CanonicalPaymentOutcome::ActionRequired { operation_id, .. } = outcome else {
        panic!("expected action required")
    };
    let expiry = seams.get_entry(INVENTORY_HOLD_MODEL, &hold_id).unwrap()["expiresAt"]
        .as_i64()
        .unwrap();
    seams.set_now(expiry + 1);
    (seams, operation_id, provider_id, hold_id)
}

fn queue_retrieval(
    seams: &crate::fake::FakeSeams,
    operation_id: &str,
    provider_id: &str,
    status: &str,
    payment_status: Option<&str>,
) {
    let mut response: Value =
        serde_json::from_str(&api_tests::retrieval(seams, operation_id, provider_id, "")).unwrap();
    response["status"] = json!(status);
    response["payment_status"] = payment_status.map_or(Value::Null, |value| json!(value));
    seams.push_http_response(200, &response.to_string());
}

fn assert_deferred(seams: &crate::fake::FakeSeams, hold_id: &str) {
    let report = reconcile_settlements(seams, 100).unwrap();
    assert_eq!(
        (report.deferred, report.released, report.committed),
        (1, 0, 0)
    );
    assert_eq!(inventory_lifecycle_tests::stock(seams)["reserved"], 2);
    assert_eq!(
        seams.get_entry(INVENTORY_HOLD_MODEL, hold_id).unwrap()["status"],
        "checkout_pending"
    );
}

#[test]
fn digital_checkout_settles_without_return_webhook_or_inventory_hold() {
    for (missing_url, legacy) in [(false, false), (true, false), (true, true)] {
        let seams = api_tests::setup();
        seams.set_secret(crate::ids::SECRET_STRIPE_KEY, "sk_test_redacted");
        let quote = api_tests::facade(&seams)
            .quote(
                "digital-quote",
                &api_tests::quote_body("digital-quote", json!(["stripe"])),
            )
            .unwrap();
        assert!(quote.quote.inventory_hold.is_none());
        let mut created = json!({"id":"cs_digital", "url":"https://checkout.stripe.com/digital"});
        if missing_url {
            created.as_object_mut().unwrap().remove("url");
        }
        seams.push_http_response(200, &created.to_string());
        let outcome = api_tests::facade(&seams)
            .checkout(
                "digital-checkout",
                &api_tests::checkout_body("digital-checkout", &quote.operation_id, "stripe"),
            )
            .unwrap();
        assert!(matches!(
            &outcome,
            CanonicalPaymentOutcome::ActionRequired { .. }
        ));
        let operation_id = match outcome {
            CanonicalPaymentOutcome::ActionRequired { operation_id, .. }
            | CanonicalPaymentOutcome::Indeterminate { operation_id, .. } => operation_id,
            other => panic!("unexpected initiation: {other:?}"),
        };
        if missing_url && !legacy {
            let mut retrieval: Value = serde_json::from_str(&api_tests::retrieval(
                &seams,
                &operation_id,
                "cs_digital",
                "https://checkout.stripe.com/resumed",
            ))
            .unwrap();
            retrieval["status"] = json!("open");
            retrieval["payment_status"] = json!("unpaid");
            seams.push_http_response(200, &retrieval.to_string());
            assert!(matches!(
                api_tests::facade(&seams)
                    .resolve(&api_tests::resolve_body(&operation_id, "cs_digital"))
                    .unwrap(),
                CanonicalResolveOutcome::Resolved { .. }
            ));
            assert!(matches!(
                api_tests::facade(&seams).status(&operation_id).unwrap(),
                CanonicalPaymentOutcome::ActionRequired { .. }
            ));
        }
        if legacy {
            let key = super::super::identity::operation_entry_key(&operation_id).unwrap();
            let mut record: super::super::record::OperationRecord =
                serde_json::from_value(seams.get_entry(OPERATION_MODEL, &key).unwrap()).unwrap();
            let Some(DurableOutcome::Resolved {
                provider_artifacts, ..
            }) = record.outcome
            else {
                panic!("resolved session");
            };
            record.outcome = Some(DurableOutcome::Indeterminate {
                operation_id: record.operation_id.clone(),
                checkout_attempt_id: record.checkout_attempt_id.clone(),
                provider_artifacts,
                code: "provider-response-incomplete".into(),
                replayed: false,
            });
            record.provider_create = super::super::record::ProviderCreateState::AttemptedUnknown {
                attempted_at: record.created_at,
            };
            seams.seed(OPERATION_MODEL, &key, serde_json::to_value(record).unwrap());
        }
        queue_retrieval(
            &seams,
            &operation_id,
            "cs_digital",
            "complete",
            Some("paid"),
        );
        assert_eq!(reconcile_settlements(&seams, 1).unwrap().committed, 1);
        assert!(matches!(
            api_tests::facade(&seams).status(&operation_id).unwrap(),
            CanonicalPaymentOutcome::Paid { .. }
        ));
        assert_eq!(reconcile_settlements(&seams, 1).unwrap().scanned, 0);
        assert!(matches!(
            api_tests::facade(&seams)
                .checkout(
                    "digital-checkout",
                    &api_tests::checkout_body("digital-checkout", &quote.operation_id, "stripe")
                )
                .unwrap(),
            CanonicalPaymentOutcome::Paid { .. }
        ));
        let requests = seams.http_requests.borrow();
        assert_eq!(
            requests
                .iter()
                .filter(|request| request["method"] == "POST")
                .count(),
            1,
            "recovery must retrieve, never create another session"
        );
    }
}

#[test]
fn competing_payment_intent_claim_cannot_partially_fulfill_checkout() {
    let (seams, operation_id, provider_id, hold_id) = pending("identity-race");
    let response: Value = serde_json::from_str(&api_tests::retrieval(
        &seams,
        &operation_id,
        &provider_id,
        "",
    ))
    .unwrap();
    let intent = response["payment_intent"].as_str().unwrap();
    let identity = crate::routes::webhooks::provider_payment_identity(
        &crate::db::Db::new(&seams, crate::ids::DB_ACCESS),
        intent,
        "another-purchase",
        1500,
        "USD",
    )
    .unwrap();
    let crate::db::BatchOp::Write {
        entry_key, data, ..
    } = &identity.ops[0]
    else {
        panic!("identity write");
    };
    seams.queue_guarded_race(vec![]); // durable scan progress
    seams.queue_guarded_race(vec![(
        crate::ids::MODEL_WEBHOOK_OUTBOX,
        entry_key,
        data.clone(),
    )]);
    seams.push_http_response(200, &response.to_string());
    assert_eq!(reconcile_settlements(&seams, 1).unwrap_err().status, 409);
    assert!(seams
        .get_entry(crate::ids::MODEL_LEDGER, &provider_id)
        .is_none());
    assert_eq!(
        seams.get_entry(INVENTORY_HOLD_MODEL, &hold_id).unwrap()["status"],
        "checkout_pending"
    );
    assert_eq!(inventory_lifecycle_tests::stock(&seams)["sold"], 0);
    assert_eq!(deliver_settlement_effects(&seams, 10).unwrap().delivered, 0);
}

#[test]
fn incomplete_provider_identity_never_fulfills_and_recovery_preserves_partial_refunds() {
    let (seams, operation_id, provider_id, _) = pending("preserve-refund");
    let mut response: Value = serde_json::from_str(&api_tests::retrieval(
        &seams,
        &operation_id,
        &provider_id,
        "",
    ))
    .unwrap();
    response.as_object_mut().unwrap().remove("payment_intent");
    seams.push_http_response(200, &response.to_string());
    assert_eq!(reconcile_settlements(&seams, 1).unwrap().deferred, 1);
    let original_time = "2026-01-01T00:00:00Z";
    seams.seed(
        crate::ids::MODEL_LEDGER,
        &provider_id,
        json!({
            "reference":provider_id, "kind":"payment", "status":"succeeded", "grossCents":1500,
            "refundCents":500, "currency":"USD", "provider":"stripe", "providerRef":provider_id,
            "createdAt":original_time, "processedAt":original_time,
            "checkoutClaim":{"fingerprint":"preserve-this"}, "disputeStatus":"won"
        }),
    );
    assert_eq!(reconcile_settlements(&seams, 1).unwrap().committed, 1);
    let row = seams
        .get_entry(crate::ids::MODEL_LEDGER, &provider_id)
        .unwrap();
    assert_eq!(row["refundCents"], 500);
    assert_eq!(row["processedAt"], original_time);
    assert_eq!(row["checkoutClaim"]["fingerprint"], "preserve-this");
    assert_eq!(row["disputeStatus"], "won");
}
