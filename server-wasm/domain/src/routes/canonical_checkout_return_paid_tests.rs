use super::test_support::*;
use super::{handle, ROUTE_CREATE, ROUTE_RETURN_VERIFY};

fn create_stripe_checkout(seams: &crate::fake::FakeSeams, key: &str) -> (String, String) {
    let quote = quote(seams, &format!("{key}-quote"), "site-a");
    queue_auth(seams, "buyer-1");
    let artifact = format!("cs_{key}");
    seams.push_http_response(
        200,
        &serde_json::json!({
            "id": artifact,
            "url": "https://checkout.stripe.com/return"
        })
        .to_string(),
    );
    let checkout = request(
        ROUTE_CREATE,
        "POST",
        "/checkout",
        checkout_body(
            &format!("{key}-checkout"),
            quote["operationId"].as_str().unwrap(),
            "stripe",
            None,
        ),
        Some(&format!("{key}-checkout")),
        "site-a",
    );
    let created = ok_json(handle(seams, &checkout).unwrap());
    (
        created["operationId"].as_str().unwrap().into(),
        created["returnArtifact"].as_str().unwrap().into(),
    )
}

fn verify_request(artifact: &str) -> crate::reqresp::RouteRequest {
    request(
        ROUTE_RETURN_VERIFY,
        "POST",
        "/checkout/return/verify",
        verify_body(artifact),
        None,
        "site-a",
    )
}

fn assert_indeterminate(
    key: &str,
    queue_provider: impl FnOnce(&crate::fake::FakeSeams, &str, &str),
) {
    let seams = setup();
    let (operation_id, artifact) = create_stripe_checkout(&seams, key);
    queue_auth(&seams, "buyer-1");
    queue_provider(&seams, &operation_id, &artifact);
    assert_eq!(
        ok_json(handle(&seams, &verify_request(&artifact)).unwrap())["status"],
        "indeterminate"
    );
    assert!(seams
        .get_entry(crate::ids::MODEL_LEDGER, &artifact)
        .is_none());
    let key = crate::checkout_contract::checkout_operation_key(&operation_id).unwrap();
    assert_eq!(
        seams
            .get_entry(crate::checkout_contract::OPERATION_MODEL, &key)
            .unwrap()["settlementState"],
        "pending"
    );
}

#[test]
fn operationless_return_verifies_only_paid_and_replays_without_stripe_egress() {
    let seams = setup();
    let (operation_id, artifact) = create_stripe_checkout(&seams, "paid-proof");
    let verify = verify_request(&artifact);
    queue_auth(&seams, "buyer-1");
    seams.push_http_response(200, &retrieval(&seams, &operation_id, &artifact, "unpaid"));
    assert_eq!(
        ok_json(handle(&seams, &verify).unwrap())["status"],
        "indeterminate"
    );
    assert!(seams
        .get_entry(crate::ids::MODEL_LEDGER, &artifact)
        .is_none());

    queue_auth(&seams, "buyer-1");
    seams.push_http_response(200, &retrieval(&seams, &operation_id, &artifact, "paid"));
    let paid = ok_json(handle(&seams, &verify).unwrap());
    assert_eq!(paid["status"], "verified");
    let ledger = seams
        .get_entry(crate::ids::MODEL_LEDGER, &artifact)
        .unwrap();
    assert_eq!(ledger["status"], "succeeded");
    assert_eq!(ledger["providerRef"], "pi_canonical");
    assert_eq!(ledger["customerProfileId"], "buyer-1");
    assert_eq!(ledger["productIds"], serde_json::json!(["product-1"]));

    let before_replay = seams.http_requests.borrow().len();
    queue_auth(&seams, "buyer-1");
    assert_eq!(ok_json(handle(&seams, &verify).unwrap()), paid);
    assert_eq!(seams.http_requests.borrow().len(), before_replay + 1);
}

#[test]
fn exact_durable_ledger_proof_settles_and_verifies_without_stripe_egress() {
    let seams = setup();
    let (operation_id, artifact) = create_stripe_checkout(&seams, "ledger-proof");
    seams.seed(
        crate::ids::MODEL_LEDGER,
        &artifact,
        serde_json::to_value(crate::models::LedgerEntry {
            reference: artifact.clone(),
            kind: "payment".into(),
            status: "succeeded".into(),
            gross_cents: 1_500,
            currency: "USD".into(),
            provider: "stripe".into(),
            provider_ref: Some(artifact.clone()),
            ..Default::default()
        })
        .unwrap(),
    );
    let before = seams.http_requests.borrow().len();
    queue_auth(&seams, "buyer-1");
    let response = ok_json(handle(&seams, &verify_request(&artifact)).unwrap());
    assert_eq!(response["status"], "verified");
    assert_eq!(seams.http_requests.borrow().len(), before + 1);
    let key = crate::checkout_contract::checkout_operation_key(&operation_id).unwrap();
    assert_eq!(
        seams
            .get_entry(crate::checkout_contract::OPERATION_MODEL, &key)
            .unwrap()["settlementState"],
        "paid"
    );
}

#[test]
fn conflicting_ledger_entitlement_identity_fails_closed() {
    let seams = setup();
    let (operation_id, artifact) = create_stripe_checkout(&seams, "identity-conflict");
    seams.seed(
        crate::ids::MODEL_LEDGER,
        &artifact,
        serde_json::to_value(crate::models::LedgerEntry {
            reference: artifact.clone(),
            kind: "payment".into(),
            status: "succeeded".into(),
            gross_cents: 1_500,
            currency: "USD".into(),
            customer_profile_id: Some("different-buyer".into()),
            product_id: Some("different-product".into()),
            product_ids: vec!["different-product".into()],
            provider: "stripe".into(),
            provider_ref: Some(artifact.clone()),
            ..Default::default()
        })
        .unwrap(),
    );

    queue_auth(&seams, "buyer-1");
    let error = handle(&seams, &verify_request(&artifact)).unwrap_err();
    assert_eq!(error.status, 409);
    let key = crate::checkout_contract::checkout_operation_key(&operation_id).unwrap();
    assert_eq!(
        seams
            .get_entry(crate::checkout_contract::OPERATION_MODEL, &key)
            .unwrap()["settlementState"],
        "pending"
    );
    assert_eq!(seams.entry_count(crate::ids::MODEL_WEBHOOK_OUTBOX), 0);
}

#[test]
fn provider_nonpayment_and_uncertainty_never_verify_or_settle() {
    for (key, status) in [
        ("complete-unpaid", "complete"),
        ("expired-unpaid", "expired"),
    ] {
        assert_indeterminate(key, |seams, operation, artifact| {
            let mut body: serde_json::Value =
                serde_json::from_str(&retrieval(seams, operation, artifact, "unpaid")).unwrap();
            body["status"] = serde_json::json!(status);
            seams.push_http_response(200, &body.to_string());
        });
    }
    assert_indeterminate("missing", |seams, _, _| {
        seams.push_http_response(404, r#"{"error":{"type":"invalid_request_error"}}"#);
    });
    assert_indeterminate("malformed", |seams, _, _| {
        seams.push_http_response(200, "not-json")
    });
    assert_indeterminate("missing-payment", |seams, operation, artifact| {
        let mut body: serde_json::Value =
            serde_json::from_str(&retrieval(seams, operation, artifact, "unpaid")).unwrap();
        body.as_object_mut().unwrap().remove("payment_status");
        seams.push_http_response(200, &body.to_string());
    });
    assert_indeterminate("transport", |seams, _, _| {
        seams.push_http_error("unavailable")
    });
}

#[test]
fn paid_provider_proof_with_changed_payment_facts_fails_closed() {
    for (key, field, changed) in [
        ("amount-mismatch", "amount_total", serde_json::json!(1)),
        ("currency-mismatch", "currency", serde_json::json!("eur")),
    ] {
        let seams = setup();
        let (operation_id, artifact) = create_stripe_checkout(&seams, key);
        queue_auth(&seams, "buyer-1");
        let mut body: serde_json::Value =
            serde_json::from_str(&retrieval(&seams, &operation_id, &artifact, "paid")).unwrap();
        body[field] = changed;
        seams.push_http_response(200, &body.to_string());

        let error = handle(&seams, &verify_request(&artifact)).unwrap_err();
        assert_eq!(error.status, 403, "{key}");
        assert!(seams
            .get_entry(crate::ids::MODEL_LEDGER, &artifact)
            .is_none());
        let operation_key =
            crate::checkout_contract::checkout_operation_key(&operation_id).unwrap();
        assert_eq!(
            seams
                .get_entry(crate::checkout_contract::OPERATION_MODEL, &operation_key)
                .unwrap()["settlementState"],
            "pending"
        );
    }
}
