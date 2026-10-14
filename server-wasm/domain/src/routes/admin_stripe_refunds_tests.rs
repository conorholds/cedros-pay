use serde_json::json;

use super::*;
use crate::fake::FakeSeams;

fn seed_payment(seams: &FakeSeams) {
    seams.seed(
        ids::MODEL_LEDGER,
        "pay_race",
        json!({
            "reference": "pay_race", "kind": "payment", "status": "succeeded",
            "grossCents": 1500, "refundCents": 0, "currency": "usd",
            "customerProfileId": "user_1", "productId": "prod_1",
            "provider": "stripe", "providerRef": "pi_race",
            "createdAt": "2026-01-01T00:00:00Z", "processedAt": "2026-01-01T00:00:00Z"
        }),
    );
    seams.set_secret(ids::SECRET_STRIPE_KEY, "sk_test_fixture");
}

fn request() -> RouteRequest {
    RouteRequest {
        route_id: ids::ROUTE_ADMIN_STRIPE_REFUNDS_PROCESS.into(),
        method: "POST".into(),
        path: "/admin/stripe/refunds/pay_race/process".into(),
        context_json: json!({
            "authenticated": true, "siteId":"site-a", "permissionClaims": [ids::ROUTE_ADMIN],
            "csrfVerified": true
        })
        .to_string(),
        ..Default::default()
    }
}

fn context() -> RequestContext {
    RequestContext::parse(&request().context_json)
}

fn stripe_response(seams: &FakeSeams) {
    seams.push_http_response(
        200,
        r#"{"id":"re_race","status":"succeeded","amount":1500,"currency":"usd","payment_intent":"pi_race"}"#,
    );
}

#[test]
fn live_claim_blocks_a_second_worker_without_egress() {
    let seams = FakeSeams::new();
    seed_payment(&seams);
    let db = Db::new(&seams, ids::DB_ACCESS);
    let payment = store::read::<_, LedgerEntry>(&db, "pay_race")
        .unwrap()
        .unwrap();
    assert!(matches!(
        claim::acquire(&db, "pay_race", "site-a", payment, seams.now_unix_secs()).unwrap(),
        claim::Acquire::Active(_)
    ));

    assert_eq!(
        process(&seams, &request(), &context()).unwrap_err().status,
        409
    );
    assert!(seams.http_requests.borrow().is_empty());
}

#[test]
fn pending_refund_is_polled_by_id_and_never_prematurely_settled() {
    let s = FakeSeams::new();
    seed_payment(&s);
    s.push_http_response(
        200,
        r#"{"id":"re_pending","status":"pending","amount":1500,"currency":"usd","payment_intent":"pi_race"}"#,
    );
    let first = process(&s, &request(), &context()).unwrap();
    let value: serde_json::Value = serde_json::from_str(&first.body).unwrap();
    assert_eq!(value["processed"], false);
    let mut list = request();
    list.route_id = ids::ROUTE_ADMIN_TRANSACTIONS_LIST.into();
    list.method = "GET".into();
    list.path = "/admin/transactions".into();
    let listed = crate::router::handle_route(&s, list.clone());
    assert_eq!(listed.status, 200);
    let listed: serde_json::Value = serde_json::from_str(&listed.body).unwrap();
    let transaction = &listed["transactions"][0];
    assert_eq!(
        listed["total"], 1,
        "refund operation is not a phantom payment"
    );
    assert_eq!(transaction["amountMinor"], 1500);
    assert_eq!(transaction["refundedAmountMinor"], 0);
    assert_eq!(transaction["providerReference"], "pi_race");
    assert_eq!(
        transaction["refundProgress"],
        json!({
            "status":"unresolved", "refundId":"re_pending", "requestedAmountMinor":1500
        })
    );
    assert!(!listed.to_string().contains("fingerprint"));
    assert!(!listed.to_string().contains("user_1"));
    assert_eq!(
        s.http_requests.borrow().len(),
        1,
        "listing never contacts the provider"
    );
    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, "pay_race").unwrap()["status"],
        "succeeded"
    );
    s.push_http_response(
        200,
        r#"{"id":"re_pending","status":"succeeded","amount":1500,"currency":"usd","payment_intent":"pi_race"}"#,
    );
    process(&s, &request(), &context()).unwrap();
    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, "pay_race").unwrap()["processedAt"],
        "2026-01-01T00:00:00Z"
    );
    let requests = s.http_requests.borrow();
    assert_eq!(requests[0]["method"], "POST");
    assert_eq!(requests[1]["method"], "GET");
    assert!(requests[1]["url"]
        .as_str()
        .unwrap()
        .ends_with("/refunds/re_pending"));
    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, "pay_race").unwrap()["status"],
        "refunded"
    );
    let listed = crate::router::handle_route(&s, list);
    let listed: serde_json::Value = serde_json::from_str(&listed.body).unwrap();
    assert_eq!(
        listed["transactions"][0]["refundProgress"]["status"],
        "completed"
    );
    assert_eq!(listed["transactions"][0]["refundedAmountMinor"], 1500);
}

#[test]
fn mismatched_provider_payment_intent_cannot_mark_payment_refunded() {
    let s = FakeSeams::new();
    seed_payment(&s);
    s.push_http_response(
        200,
        r#"{"id":"re_wrong","status":"succeeded","amount":1500,"currency":"usd","payment_intent":"pi_other"}"#,
    );
    assert!(process(&s, &request(), &context()).is_err());
    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, "pay_race").unwrap()["status"],
        "succeeded"
    );
}

#[test]
fn checkout_session_amount_mismatch_cannot_resolve_refund_payment_intent() {
    let s = FakeSeams::new();
    seed_payment(&s);
    let mut payment = s.get_entry(ids::MODEL_LEDGER, "pay_race").unwrap();
    payment["providerRef"] = json!("cs_refund");
    s.seed(ids::MODEL_LEDGER, "pay_race", payment);
    s.push_http_response(
        200,
        r#"{"id":"cs_refund","mode":"payment","payment_status":"paid","amount_total":1499,"currency":"usd","payment_intent":"pi_race"}"#,
    );

    assert_eq!(process(&s, &request(), &context()).unwrap_err().status, 409);
    assert_eq!(s.http_requests.borrow().len(), 1);
    assert_eq!(s.http_requests.borrow()[0]["method"], "GET");
    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, "pay_race").unwrap()["status"],
        "succeeded"
    );
}

#[test]
fn crash_before_egress_is_reclaimed_after_lease_expiry() {
    let seams = FakeSeams::new();
    seed_payment(&seams);
    let db = Db::new(&seams, ids::DB_ACCESS);
    let payment = store::read::<_, LedgerEntry>(&db, "pay_race")
        .unwrap()
        .unwrap();
    let _abandoned =
        claim::acquire(&db, "pay_race", "site-a", payment, seams.now_unix_secs()).unwrap();
    seams.set_now(seams.now_unix_secs() + 121);
    stripe_response(&seams);

    assert_eq!(process(&seams, &request(), &context()).unwrap().status, 200);
    assert_eq!(seams.http_requests.borrow().len(), 1);
    assert_eq!(seams.event_count(ids::EVENT_ENTITLEMENT_CHANGED), 1);
}

#[test]
fn crash_after_provider_success_replays_same_idempotency_and_converges() {
    let seams = FakeSeams::new();
    seed_payment(&seams);
    let db = Db::new(&seams, ids::DB_ACCESS);
    let payment = store::read::<_, LedgerEntry>(&db, "pay_race")
        .unwrap()
        .unwrap();
    let active =
        match claim::acquire(&db, "pay_race", "site-a", payment, seams.now_unix_secs()).unwrap() {
            claim::Acquire::Active(active) => active,
            _ => panic!("active claim"),
        };
    stripe_response(&seams);
    let first = call_stripe(
        &seams,
        "sk_test_fixture",
        "pay_race",
        &active.payment.value,
        &active.claim,
        seams.now_unix_secs(),
    )
    .unwrap();
    assert_eq!(first.id, "re_race");
    drop(active);
    seams.set_now(seams.now_unix_secs() + 121);
    stripe_response(&seams);

    assert_eq!(process(&seams, &request(), &context()).unwrap().status, 200);
    let requests = seams.http_requests.borrow();
    assert_eq!(requests.len(), 2);
    assert_eq!(requests[0]["headers"], requests[1]["headers"]);
}

#[test]
fn payment_version_race_after_provider_success_retries_completion_without_second_egress() {
    let seams = FakeSeams::new();
    seed_payment(&seams);
    let db = Db::new(&seams, ids::DB_ACCESS);
    let payment = store::read::<_, LedgerEntry>(&db, "pay_race")
        .unwrap()
        .unwrap();
    let mut active =
        match claim::acquire(&db, "pay_race", "site-a", payment, seams.now_unix_secs()).unwrap() {
            claim::Acquire::Active(active) => active,
            _ => panic!("active claim"),
        };
    let unchanged = seams.get_entry(ids::MODEL_LEDGER, "pay_race").unwrap();
    seams.queue_guarded_race(vec![(ids::MODEL_LEDGER, "pay_race", unchanged)]);
    let refund = api::StripeRefund {
        id: "re_race".to_string(),
        status: "succeeded".to_string(),
        amount: 1500,
        currency: "usd".to_string(),
        charge: None,
        payment_intent: Some("pi_race".to_string()),
        operation_ref: None,
    };

    assert!(complete(&db, "pay_race", &mut active, &refund, seams.now_unix_secs()).unwrap());
    assert_eq!(
        seams.get_entry(ids::MODEL_LEDGER, "pay_race").unwrap()["status"],
        "refunded"
    );
    assert!(seams.http_requests.borrow().is_empty());
}

#[test]
fn ambiguous_refund_after_provider_horizon_recovers_by_operation_metadata() {
    let s = FakeSeams::new();
    seed_payment(&s);
    s.push_http_error("connection lost after Stripe accepted the refund");
    assert_eq!(process(&s, &request(), &context()).unwrap_err().status, 500);
    let operation = s
        .get_entry(ids::MODEL_LEDGER, "stripe-refund-op:pay_race")
        .unwrap()["fingerprint"]
        .as_str()
        .unwrap()
        .to_string();
    s.set_now(s.now_unix_secs() + crate::checkout_contract::PROVIDER_IDEMPOTENCY_SECONDS);
    s.push_http_response(
        200,
        &json!({
            "object": "list", "has_more": false,
            "data": [{
                "id": "re_recovered", "status": "succeeded", "amount": 1500,
                "currency": "usd", "payment_intent": "pi_race",
                "metadata": { "cedros_pay_operation": operation }
            }]
        })
        .to_string(),
    );

    let response = process(&s, &request(), &context()).unwrap();

    assert_eq!(response.status, 200);
    let requests = s.http_requests.borrow();
    assert_eq!(requests.len(), 2);
    assert!(requests[0]["body"]
        .as_str()
        .unwrap()
        .contains("metadata%5Bcedros_pay_operation%5D="));
    assert_eq!(requests[1]["method"], "GET");
    assert!(requests[1]["url"]
        .as_str()
        .unwrap()
        .contains("/v1/refunds?"));
    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, "pay_race").unwrap()["status"],
        "refunded"
    );
}

#[test]
fn ambiguous_refund_without_provider_proof_never_reposts_after_horizon() {
    let s = FakeSeams::new();
    seed_payment(&s);
    s.push_http_error("connection lost after Stripe accepted the refund");
    assert_eq!(process(&s, &request(), &context()).unwrap_err().status, 500);
    s.set_now(s.now_unix_secs() + crate::checkout_contract::PROVIDER_IDEMPOTENCY_SECONDS);
    s.push_http_response(200, r#"{"object":"list","has_more":false,"data":[]}"#);

    let error = process(&s, &request(), &context()).unwrap_err();

    assert_eq!(error.status, 409);
    let requests = s.http_requests.borrow();
    assert_eq!(requests.len(), 2);
    assert_eq!(requests[1]["method"], "GET");
}

fn deliver_refund(s: &FakeSeams, event_type: &str, id: &str) -> RouteResponse {
    const TOKEN: &str = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    s.set_secret(ids::SECRET_STRIPE_WEBHOOK_TOKEN, TOKEN);
    let refund = json!({"id":"re_race","status":"succeeded","amount":1500,"currency":"usd","payment_intent":"pi_race"});
    let object = if event_type == "charge.refunded" {
        json!({"id":"ch_race","payment_intent":"pi_race","amount_refunded":1500,"currency":"usd","refunds":{"data":[refund],"has_more":false}})
    } else {
        refund
    };
    let event = json!({"id":id,"type":event_type,"created":s.now_unix_secs(),"data":{"object":object}});
    s.seed_stripe_event(event.clone());
    crate::routes::webhooks::handle(
        s,
        &RouteRequest {
            route_id: ids::ROUTE_WEBHOOKS.into(),
            method: "POST".into(),
            path: "/webhook/stripe".into(),
            query: vec![("token".into(), TOKEN.into())],
            body: event.to_string(),
            ..Default::default()
        },
    )
    .unwrap()
}

#[test]
fn admin_and_webhook_refund_delivery_share_one_identity_and_one_effect() {
    for first in ["admin", "refund.updated", "charge.refunded"] {
        let s = FakeSeams::new();
        seed_payment(&s);
        // Webhook ledger amounts use normalized currency.
        let mut payment = s.get_entry(ids::MODEL_LEDGER, "pay_race").unwrap();
        payment["currency"] = json!("USD");
        s.seed(ids::MODEL_LEDGER, "pay_race", payment);
        if first == "admin" {
            stripe_response(&s);
            process(&s, &request(), &context()).unwrap();
        } else {
            deliver_refund(&s, first, "evt_first");
        }
        let effects = s.event_count(ids::EVENT_ENTITLEMENT_CHANGED);
        deliver_refund(&s, "refund.updated", "evt_changed");
        deliver_refund(&s, "charge.refunded", "evt_charge");
        process(&s, &request(), &context()).unwrap();
        assert_eq!(s.event_count(ids::EVENT_ENTITLEMENT_CHANGED), effects);
        assert_eq!(
            s.get_entry(ids::MODEL_LEDGER, "pay_race").unwrap()["refundCents"],
            1500
        );
        assert!(s.get_entry(ids::MODEL_LEDGER, "re_race").is_some());
        assert!(s
            .get_entry(ids::MODEL_LEDGER, "stripe-refund:re_race")
            .is_none());
        assert_eq!(
            s.http_requests.borrow().len(),
            usize::from(first == "admin")
        );
    }
}

#[test]
fn legacy_admin_refund_is_bound_by_its_receipt_and_not_projected_again() {
    let s = FakeSeams::new();
    seed_payment(&s);
    stripe_response(&s);
    process(&s, &request(), &context()).unwrap();
    let db = Db::new(&s, ids::DB_ACCESS);
    let mut row = s.get_entry(ids::MODEL_LEDGER, "re_race").unwrap();
    row["reference"] = json!("stripe-refund:re_race");
    row.as_object_mut().unwrap().remove("originalReference");
    row.as_object_mut().unwrap().remove("paymentIntentId");
    db.delete(ids::MODEL_LEDGER, "re_race").unwrap();
    s.seed(ids::MODEL_LEDGER, "stripe-refund:re_race", row);
    let before = s.event_count(ids::EVENT_ENTITLEMENT_CHANGED);
    deliver_refund(&s, "refund.updated", "evt_legacy");
    deliver_refund(&s, "charge.refunded", "evt_legacy_charge");
    assert_eq!(s.event_count(ids::EVENT_ENTITLEMENT_CHANGED), before);
    assert!(s.get_entry(ids::MODEL_LEDGER, "re_race").is_none());
    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, "pay_race").unwrap()["refundCents"],
        1500
    );
}

#[test]
fn full_refund_after_partial_requests_only_remaining_amount_and_replays_exactly() {
    let s = FakeSeams::new();
    seed_payment(&s);
    let mut payment = s.get_entry(ids::MODEL_LEDGER, "pay_race").unwrap();
    payment["refundCents"] = json!(500);
    s.seed(ids::MODEL_LEDGER, "pay_race", payment);
    s.push_http_response(200, r#"{"id":"re_remaining","status":"pending","amount":1000,"currency":"usd","payment_intent":"pi_race"}"#);
    let pending = process(&s, &request(), &context()).unwrap();
    assert_eq!(
        serde_json::from_str::<serde_json::Value>(&pending.body).unwrap()["processed"],
        false
    );
    s.push_http_response(200, r#"{"id":"re_remaining","status":"succeeded","amount":1000,"currency":"usd","payment_intent":"pi_race"}"#);
    process(&s, &request(), &context()).unwrap();
    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, "pay_race").unwrap()["refundCents"],
        1500
    );
    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, "re_remaining").unwrap()["grossCents"],
        1000
    );
    process(&s, &request(), &context()).unwrap();
    let requests = s.http_requests.borrow();
    assert!(requests[0]["body"]
        .as_str()
        .unwrap()
        .contains("amount=1000"));
    assert_eq!(requests[1]["method"], "GET");
    assert_eq!(requests.len(), 2);
}

#[test]
fn reversed_completed_refund_cannot_report_success_or_start_another_refund() {
    let s = FakeSeams::new();
    seed_payment(&s);
    stripe_response(&s);
    process(&s, &request(), &context()).unwrap();
    let mut payment = s.get_entry(ids::MODEL_LEDGER, "pay_race").unwrap();
    payment["refundCents"] = json!(0);
    payment["status"] = json!("succeeded");
    s.seed(ids::MODEL_LEDGER, "pay_race", payment);
    assert_eq!(process(&s, &request(), &context()).unwrap_err().status, 409);
    assert_eq!(s.http_requests.borrow().len(), 1);
}
