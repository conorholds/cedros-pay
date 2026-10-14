use super::webhooks_test_support::*;
use crate::ids;
use crate::seams::HostSeams;
use crate::time;
use serde_json::json;

#[test]
fn finalizes_a_checkout_session_and_records_the_payment_intent() {
    let s = seams();
    // A hosted Checkout session route wrote a pending row keyed by the session id,
    // with provider_ref = the session id (the PI is unknown at creation).
    seed_pending(&s, "cs_123", "cs_123", 5000, "p1");
    let resp = invoke(
        &s,
        stripe_request(&s, &session_completed("evt_s1", "cs_123", "pi_456", 5000)),
    );
    assert_eq!(resp.status, 200);
    let entry = s.get_entry(ids::MODEL_LEDGER, "cs_123").unwrap();
    assert_eq!(entry["status"], "succeeded");
    // The PaymentIntent is now recorded so a refund can target it.
    assert_eq!(entry["providerRef"], "pi_456");
    assert_eq!(entry["grossCents"], 5000);
    assert_eq!(s.event_count(ids::EVENT_PAYMENT_SUCCEEDED), 1);
}

#[test]
fn checkout_session_amount_mismatch_is_rejected() {
    let s = seams();
    seed_pending(&s, "cs_123", "cs_123", 5000, "p1");
    let resp = invoke(
        &s,
        stripe_request(&s, &session_completed("evt_s1", "cs_123", "pi_456", 9999)),
    );
    assert_eq!(resp.status, 403);
    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, "cs_123").unwrap()["status"],
        "pending"
    );
}

#[test]
fn unknown_checkout_session_is_acked_without_error() {
    let s = seams();
    let resp = invoke(
        &s,
        stripe_request(&s, &session_completed("evt_s1", "cs_unknown", "pi_456", 5000)),
    );
    assert_eq!(resp.status, 200);
    assert_eq!(s.event_count(ids::EVENT_PAYMENT_SUCCEEDED), 0);
}

#[test]
fn unmarked_uninitiated_payment_intent_is_out_of_scope() {
    let s = seams();
    let resp = invoke(
        &s,
        stripe_request(&s, &pi_succeeded("evt_0", "ord_1", "pi_x", 5000, "p1")),
    );
    assert_eq!(resp.status, 200);
    assert!(s.get_entry(ids::MODEL_LEDGER, "ord_1").is_none());
}

#[test]
fn marked_payment_intent_retries_until_cedros_ledger_exists() {
    let s = seams();
    let body = json!({
        "id": "evt_marked_early", "type": "payment_intent.succeeded",
        "data": { "object": {
            "id": "pi_early", "status": "succeeded", "amount_received": 5000, "amount": 5000, "currency": "usd",
            "metadata": {
                "reference": "ord_early", "cedros_pay_checkout": "true"
            }
        }}
    })
    .to_string();

    assert_eq!(invoke(&s, stripe_request(&s, &body)).status, 409);
    assert!(s
        .get_entry(ids::MODEL_WEBHOOK_OUTBOX, "evt:evt_marked_early")
        .is_none());
}

#[test]
fn marked_checkout_session_retries_until_cedros_ledger_exists() {
    let s = seams();
    for (event_id, event_type, payment_status) in [
        (
            "evt_marked_session_success",
            "checkout.session.completed",
            "paid",
        ),
        (
            "evt_marked_session_failure",
            "checkout.session.async_payment_failed",
            "unpaid",
        ),
    ] {
        let body = json!({
            "id": event_id,
            "type": event_type,
            "data": { "object": {
                "id": "cs_early", "payment_intent": "pi_early",
                "mode": "payment", "status": "complete",
                "payment_status": payment_status,
                "amount_total": 5000, "currency": "usd",
                "metadata": { "cedros_pay_checkout": "true" }
            }}
        })
        .to_string();

        assert_eq!(invoke(&s, stripe_request(&s, &body)).status, 409);
        assert!(s
            .get_entry(ids::MODEL_WEBHOOK_OUTBOX, &format!("evt:{event_id}"))
            .is_none());
    }
}

#[test]
fn marked_failed_payment_intent_retries_when_correlation_is_missing() {
    let s = seams();
    let body = json!({
        "id": "evt_marked_failure_missing_reference",
        "type": "payment_intent.payment_failed",
        "data": { "object": {
            "id": "pi_early_failure", "amount": 5000, "currency": "usd",
            "metadata": { "cedros_pay_checkout": "true" }
        }}
    })
    .to_string();

    assert_eq!(invoke(&s, stripe_request(&s, &body)).status, 409);
    assert!(s
        .get_entry(
            ids::MODEL_WEBHOOK_OUTBOX,
            "evt:evt_marked_failure_missing_reference"
        )
        .is_none());
}

#[test]
fn rejects_amount_mismatch_for_initiated_payment() {
    let s = seams();
    seed_pending(&s, "ord_1", "pi_x", 5000, "p1");
    let resp = invoke(
        &s,
        stripe_request(&s, &pi_succeeded("evt_0", "ord_1", "pi_x", 1, "p1")),
    );
    assert_eq!(resp.status, 403);
    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, "ord_1").unwrap()["status"],
        "pending"
    );
}

#[test]
fn rejects_missing_wrong_and_unconfigured_ingress_tokens() {
    let s = seams();
    let body = pi_succeeded("evt_1", "ord_1", "pi_x", 5000, "p1");
    let mut missing = stripe_request(&s, &body);
    missing.query.clear();
    assert_eq!(invoke(&s, missing).status, 401);

    let mut wrong = stripe_request(&s, &body);
    wrong.query = vec![("token".into(), "whsec_test".into())];
    assert_eq!(invoke(&s, wrong).status, 401);

    // The posted payload is only a lookup hint; an unknown event id never
    // reaches projection because Stripe cannot return it.
    let mut unknown = stripe_request(&s, &body);
    unknown.body = json!({"id": "evt_unknown"}).to_string();
    s.push_http_response(404, r#"{"error":{"type":"invalid_request_error"}}"#);
    assert_eq!(invoke(&s, unknown).status, 502);
    assert!(s.get_entry(ids::MODEL_LEDGER, "ord_1").is_none());

    let unconfigured = crate::fake::FakeSeams::new();
    unconfigured.set_secret(ids::SECRET_STRIPE_KEY, "sk_test_fixture");
    let response = invoke(&unconfigured, stripe_request(&unconfigured, &body));
    assert_eq!(response.status, 503);
    assert!(unconfigured.http_requests.borrow().is_empty());
}

#[test]
fn records_succeeded_payment_with_tag_and_event() {
    let s = seams();
    seed_pending(&s, "ord_1", "pi_x", 5000, "p1");
    let now = s.now_unix_secs();
    let resp = invoke(
        &s,
        stripe_request(&s, &pi_succeeded("evt_1", "ord_1", "pi_x", 5000, "p1")),
    );
    assert_eq!(resp.status, 200);
    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, "ord_1").unwrap()["grossCents"],
        5000
    );
    assert!(s
        .tags
        .borrow()
        .iter()
        .any(|(p, slug, _)| p == "p1" && slug == ids::TAG_FIRST_PURCHASE));
    assert_eq!(s.event_count(ids::EVENT_PAYMENT_SUCCEEDED), 1);
    let payload = event_payload(&s, ids::EVENT_PAYMENT_SUCCEEDED);
    assert_eq!(payload["payment_rail"], "stripe");
    assert_eq!(payload["flow"], "checkout");
    assert_eq!(payload["amount_cents"], 5000);
    assert_eq!(payload["currency"], "USD");
    assert_eq!(payload["occurred_at"], time::iso8601(now));
    assert_eq!(s.event_count(ids::EVENT_ENTITLEMENT_CHANGED), 1);
    let entitlement = event_payload(&s, ids::EVENT_ENTITLEMENT_CHANGED);
    assert_eq!(entitlement["reason"], "purchase_completed");
    assert_eq!(entitlement["userId"], "p1");
    assert_eq!(entitlement["productId"], "prod_1");
    assert_eq!(entitlement["entitlementId"], "ord_1");
    let crm = s.crm_events.borrow();
    assert_eq!(crm[0].0, ids::CRM_SOURCE_ACCESS);
    assert_eq!(crm[0].1, ids::CRM_SOURCE_KIND);
    assert_eq!(crm[0].2, ids::CRM_EVENT_PURCHASE_COMPLETED);
    assert_eq!(crm[0].3["customerId"], "cust_1");
    assert_eq!(crm[0].3["eventId"], "evt_1");
    assert_eq!(crm[0].3["orderReference"], "ord_1");
    assert!(crm[0].3.get("wallet").is_none());
}

#[test]
fn dedupes_replayed_events() {
    let s = seams();
    seed_pending(&s, "ord_1", "pi_x", 5000, "p1");
    let body = pi_succeeded("evt_dup", "ord_1", "pi_x", 5000, "p1");
    invoke(&s, stripe_request(&s, &body));
    let second = invoke(&s, stripe_request(&s, &body));
    let v: serde_json::Value = serde_json::from_str(&second.body).unwrap();
    assert_eq!(v["duplicate"], true);
    assert_eq!(s.event_count(ids::EVENT_PAYMENT_SUCCEEDED), 1);
    assert_eq!(s.event_count(ids::EVENT_ENTITLEMENT_CHANGED), 1);
}

#[test]
fn second_purchase_tags_repeat() {
    let s = seams();
    seed_pending(&s, "ord_1", "pi_x", 5000, "p2");
    seed_pending(&s, "ord_2", "pi_2", 9000, "p2");
    invoke(
        &s,
        stripe_request(&s, &pi_succeeded("evt_1", "ord_1", "pi_x", 5000, "p2")),
    );
    let body = json!({
        "id": "evt_2", "type": "payment_intent.succeeded",
        "data": { "object": { "id": "pi_2", "status": "succeeded", "amount_received": 9000, "amount": 9000, "currency": "usd",
            "metadata": { "reference": "ord_2", "profileId": "p2" } } }
    })
    .to_string();
    invoke(&s, stripe_request(&s, &body));
    assert!(s
        .tags
        .borrow()
        .iter()
        .any(|(p, slug, _)| p == "p2" && slug == ids::TAG_REPEAT));
}

#[test]
fn failed_payment_tags_at_risk_when_profile_is_present() {
    let s = seams();
    seed_pending(&s, "ord_failed", "pi_failed", 9000, "p3");
    let now = s.now_unix_secs();
    let body = json!({
        "id": "evt_failed", "type": "payment_intent.payment_failed",
        "data": { "object": {
            "id": "pi_failed", "amount": 9000, "currency": "usd",
            "last_payment_error": { "code": "card_declined" },
            "metadata": {
                "reference": "ord_failed",
                "profileId": "p3",
                "email": "buyer@example.com",
                "wallet": "raw-wallet",
                "walletAddressHash": "hash_1"
            }
        }}
    })
    .to_string();

    let resp = invoke(&s, stripe_request(&s, &body));

    assert_eq!(resp.status, 200);
    assert!(s
        .tags
        .borrow()
        .iter()
        .any(|(p, slug, _)| p == "p3" && slug == ids::TAG_AT_RISK));
    let payload = event_payload(&s, ids::EVENT_PAYMENT_FAILED);
    assert_eq!(payload["payment_rail"], "stripe");
    assert_eq!(payload["flow"], "checkout");
    assert_eq!(payload["amount_cents"], 9000);
    assert_eq!(payload["currency"], "USD");
    assert_eq!(payload["cause_code"], "downstream_failed");
    assert_eq!(payload["occurred_at"], time::iso8601(now));
    assert!(payload.get("cause").is_none());
    let crm = s.crm_events.borrow();
    assert_eq!(crm[0].2, ids::CRM_EVENT_PAYMENT_FAILED);
    assert_eq!(crm[0].3["email"], "buyer@example.com");
    assert_eq!(crm[0].3["walletAddressHash"], "hash_1");
    assert_eq!(crm[0].3["causeCode"], "downstream_failed");
    assert!(crm[0].3.get("wallet").is_none());
}

#[test]
fn refunded_payment_emits_contract_payload() {
    let s = seams();
    seed_pending(&s, "ord_1", "pi_x", 5000, "p1");
    let now = s.now_unix_secs();
    let body = json!({
    "id": "evt_refund", "type": "charge.refunded",
    "data": { "object": {
            "payment_intent": "pi_x",
            "amount_refunded": 2500,
            "refunds": {"data": [{"id":"re_contract","amount":2500,"status":"succeeded"}]},
            "currency": "usd",
            "metadata": { "reference": "ord_1", "customerId": "cust_1" }
        }}
    })
    .to_string();

    let resp = invoke(&s, stripe_request(&s, &body));

    assert_eq!(resp.status, 200);
    let payload = event_payload(&s, ids::EVENT_REFUND_SETTLED);
    assert_eq!(payload["payment_rail"], "stripe");
    assert_eq!(payload["flow"], "checkout");
    assert_eq!(payload["amount_cents"], 2500);
    assert_eq!(payload["currency"], "USD");
    assert_eq!(payload["occurred_at"], time::iso8601(now));
    let crm = s.crm_events.borrow();
    assert_eq!(crm[0].2, ids::CRM_EVENT_REFUND_SETTLED);
    assert_eq!(crm[0].3["customerId"], "cust_1");
    assert_eq!(crm[0].3["refundRef"], "re_contract");
    drop(crm);
    // A discrete refund row is recorded so the admin refunds list shows it, and the
    // original payment's cumulative refund total is bumped.
    let refund_row = s.get_entry(ids::MODEL_LEDGER, "re_contract").unwrap();
    assert_eq!(refund_row["kind"], "refund");
    assert_eq!(refund_row["provider"], "stripe");
    assert_eq!(refund_row["grossCents"], 2500);
    assert_eq!(refund_row["originalReference"], "ord_1");
    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, "ord_1").unwrap()["refundCents"],
        2500
    );
}

#[test]
fn discrete_refund_row_keyed_by_stripe_refund_id() {
    let s = seams();
    seed_pending(&s, "ord_2", "pi_y", 5000, "p2");
    let body = json!({
        "id": "evt_r2", "type": "charge.refunded",
        "data": { "object": {
            "id": "ch_1", "payment_intent": "pi_y", "amount_refunded": 1500, "currency": "usd",
            "metadata": { "reference": "ord_2" },
            "refunds": { "data": [{
                "id": "re_abc", "amount": 1500, "reason": "requested_by_customer",
                "status": "succeeded"
            }] }
        }}
    })
    .to_string();
    let resp = invoke(&s, stripe_request(&s, &body));
    assert_eq!(resp.status, 200);
    // Keyed by the discrete Stripe refund id, with its own amount + reason.
    let row = s.get_entry(ids::MODEL_LEDGER, "re_abc").unwrap();
    assert_eq!(row["kind"], "refund");
    assert_eq!(row["provider"], "stripe");
    assert_eq!(row["grossCents"], 1500);
    assert_eq!(row["providerRef"], "re_abc");
    assert_eq!(row["paymentIntentId"], "pi_y");
    assert_eq!(row["reason"], "requested_by_customer");
}

#[test]
fn subscription_cycle_invoice_emits_renewal_crm_event() {
    let s = seams();
    seed_subscription(&s, "sub_1", "2026-06-01T00:00:00Z");
    let body = json!({
        "id": "evt_invoice_renew", "type": "invoice.paid",
        "data": { "object": {
            "id": "in_1",
            "subscription": "sub_1",
            "customer": "cus_1",
            "billing_reason": "subscription_cycle",
            "status": "paid", "paid": true, "paid_out_of_band": false, "amount_remaining": 0, "amount_paid": 2900,
            "currency": "usd",
            "payment_intent": "pi_invoice_1",
            "hosted_invoice_url": "https://example.test/invoices/in_1",
            "lines": { "data": [{ "period": { "end": 1800000000 }, "price": { "id": "price_2" } }] },
            "subscription_details": {
                "metadata": {
                    "cedrosLoginUserId": "user_1",
                    "wallet": "raw-wallet",
                    "walletAddressHash": "hash_1"
                }
            }
        }}
    })
    .to_string();

    queue_invoice_payment(&s, "pi_invoice_1", 2900, Some("cus_1"));
    let resp = invoke(&s, stripe_request(&s, &body));

    assert_eq!(resp.status, 200);
    let stored = s.get_entry(ids::MODEL_SUBSCRIPTIONS, "sub_1").unwrap();
    assert_eq!(stored["status"], "active");
    assert_eq!(stored["currentPeriodEnd"], "2026-06-01T00:00:00Z");
    assert_eq!(stored["updatedAt"], "2026-01-01T00:00:00Z");
    let crm = s.crm_events.borrow();
    assert_eq!(crm[0].2, ids::CRM_EVENT_SUBSCRIPTION_RENEWED);
    assert_eq!(crm[0].3["customerId"], "cus_1");
    assert_eq!(crm[0].3["cedrosLoginUserId"], "user_1");
    assert_eq!(crm[0].3["subscriptionRef"], "sub_1");
    assert_eq!(crm[0].3["invoiceRef"], "in_1");
    assert_eq!(crm[0].3["priceId"], "price_2");
    assert_eq!(crm[0].3["amountCents"], 2900);
    assert_eq!(crm[0].3["currency"], "USD");
    assert_eq!(crm[0].3["walletAddressHash"], "hash_1");
    assert!(crm[0].3.get("wallet").is_none());
    // Recurring revenue surfaces as payment-succeeded(flow:subscription).
    assert_eq!(s.event_count(ids::EVENT_PAYMENT_SUCCEEDED), 1);
    let revenue = event_payload(&s, ids::EVENT_PAYMENT_SUCCEEDED);
    assert_eq!(revenue["payment_rail"], "stripe");
    assert_eq!(revenue["flow"], "subscription");
    assert_eq!(revenue["amount_cents"], 2900);
    assert_eq!(revenue["currency"], "USD");
    assert!(!revenue.to_string().contains("user_1"));
    let invoice = s.get_entry(ids::MODEL_LEDGER, "in_1").unwrap();
    assert_eq!(invoice["kind"], "payment");
    assert_eq!(invoice["status"], "succeeded");
    assert_eq!(invoice["grossCents"], 2900);
    assert_eq!(invoice["refundCents"], 0);
    assert_eq!(invoice["currency"], "USD");
    assert_eq!(invoice["providerRef"], "pi_invoice_1");
    assert_eq!(invoice["customerProfileId"], "cus_1");
    assert_eq!(invoice["productId"], "price_1");
}

#[test]
fn duplicate_real_world_invoice_with_a_new_event_id_does_not_double_count() {
    let s = seams();
    seed_subscription(&s, "sub_1", "2026-06-01T00:00:00Z");
    let invoice = |event_id: &str| {
        json!({
            "id": event_id, "type": "invoice.paid",
            "data": {"object": {
                "id": "in_same", "subscription": "sub_1", "customer":"cus_1",
                "billing_reason": "subscription_cycle", "status": "paid", "paid": true, "paid_out_of_band": false, "amount_remaining": 0, "amount_paid": 2900,
                "currency": "usd", "payment_intent": "pi_same_invoice",
                "period_end": 1_800_000_000_i64
            }}
        })
        .to_string()
    };

    queue_invoice_payment(&s, "pi_same_invoice", 2900, Some("cus_1"));
    assert_eq!(
        invoke(&s, stripe_request(&s, &invoice("evt_one"))).status,
        200
    );
    let crm_after_first = s.crm_events.borrow().len();
    let mut later_subscription = s.get_entry(ids::MODEL_SUBSCRIPTIONS, "sub_1").unwrap();
    later_subscription["status"] = json!("past_due");
    later_subscription["priceId"] = json!("price_newer_plan");
    s.seed(ids::MODEL_SUBSCRIPTIONS, "sub_1", later_subscription);
    assert_eq!(
        invoke(&s, stripe_request(&s, &invoice("evt_two"))).status,
        200
    );

    assert_eq!(s.event_count(ids::EVENT_PAYMENT_SUCCEEDED), 1);
    assert_eq!(s.crm_events.borrow().len(), crm_after_first);
    assert_eq!(s.entry_count(ids::MODEL_LEDGER), 1);
    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, "in_same").unwrap()["providerRef"],
        "pi_same_invoice"
    );
    assert_eq!(
        s.get_entry(ids::MODEL_SUBSCRIPTIONS, "sub_1").unwrap()["status"],
        "past_due"
    );
    assert_eq!(
        s.get_entry(ids::MODEL_SUBSCRIPTIONS, "sub_1").unwrap()["priceId"],
        "price_newer_plan"
    );
}

#[test]
fn subscription_invoice_and_refund_reconcile_to_exact_ledger_net() {
    let s = seams();
    seed_subscription(&s, "sub_1", "2026-06-01T00:00:00Z");
    let paid = json!({
        "id": "evt_invoice_paid", "type": "invoice.paid",
        "data": {"object": {
            "id": "in_refund", "subscription": "sub_1", "customer":"cus_1",
            "billing_reason": "subscription_cycle", "status": "paid", "paid": true, "paid_out_of_band": false, "amount_remaining": 0, "amount_paid": 2900,
            "currency": "usd", "payment_intent": "pi_invoice_refund",
            "period_end": 1_800_000_000_i64
        }}
    })
    .to_string();
    let refunded = json!({
        "id": "evt_invoice_refund", "type": "charge.refunded", "created": 2_000,
        "data": {"object": {
            "id": "ch_invoice", "payment_intent": "pi_invoice_refund",
            "amount_refunded": 1000, "currency": "usd",
            "metadata": {"reference": "in_refund"},
            "refunds": {"data": [{
                "id": "re_invoice", "amount": 1000, "status": "succeeded"
            }]}
        }}
    })
    .to_string();

    queue_invoice_payment(&s, "pi_invoice_refund", 2900, Some("cus_1"));
    assert_eq!(invoke(&s, stripe_request(&s, &paid)).status, 200);
    assert_eq!(invoke(&s, stripe_request(&s, &refunded)).status, 200);
    let replayed_paid = paid.replace("evt_invoice_paid", "evt_invoice_paid_replayed");
    assert_eq!(invoke(&s, stripe_request(&s, &replayed_paid)).status, 200);

    let payment = s.get_entry(ids::MODEL_LEDGER, "in_refund").unwrap();
    let refund = s.get_entry(ids::MODEL_LEDGER, "re_invoice").unwrap();
    assert_eq!(payment["grossCents"], 2900);
    assert_eq!(payment["refundCents"], 1000);
    assert_eq!(refund["grossCents"], 1000);
    assert_eq!(refund["refundCents"], 1000);
    assert_eq!(
        payment["grossCents"].as_i64().unwrap() - payment["refundCents"].as_i64().unwrap(),
        1900
    );
}

#[test]
fn initial_subscription_invoice_cannot_invent_access_or_period_without_subscription_state() {
    let s = seams();
    seed_subscription(&s, "sub_1", "2026-06-01T00:00:00Z");
    let body = json!({
        "id": "evt_invoice_create", "type": "invoice.paid",
        "data": { "object": {
            "id": "in_initial",
            "subscription": "sub_1",
            "customer": "cus_1",
            "billing_reason": "subscription_create",
            "status": "paid", "paid": true, "paid_out_of_band": false, "amount_remaining": 0, "amount_paid": 0,
            "currency": "usd",
            "lines": { "data": [{ "period": { "end": 1800000000 } }] }
        }}
    })
    .to_string();

    let resp = invoke(&s, stripe_request(&s, &body));

    assert_eq!(resp.status, 200);
    assert!(s.crm_events.borrow().is_empty());
    // The create-time invoice is not a billed cycle, so no revenue event fires.
    assert_eq!(s.event_count(ids::EVENT_PAYMENT_SUCCEEDED), 0);
    assert!(s
        .get_entry(ids::MODEL_WEBHOOK_OUTBOX, "evt:evt_invoice_create")
        .is_some());
    assert_eq!(
        s.get_entry(ids::MODEL_SUBSCRIPTIONS, "sub_1").unwrap()["currentPeriodEnd"],
        "2026-06-01T00:00:00Z"
    );
}

#[test]
fn dispute_created_emits_public_safe_crm_payload() {
    let s = seams();
    seed_pending(&s, "ord_1", "pi_1", 5000, "cus_1");
    let body = json!({
        "id": "evt_dispute", "type": "charge.dispute.created",
        "data": { "object": {
            "id": "dp_1",
            "amount": 2500,
            "currency": "usd",
            "status": "needs_response",
            "reason": "fraudulent",
            "payment_intent": "pi_1",
            "evidence_details": { "due_by": 1800000000 },
            "metadata": {
                "customerId": "cus_1",
                "reference": "ord_1",
                "wallet": "raw-wallet",
                "rawEvidence": "private evidence"
            }
        }}
    })
    .to_string();

    let resp = invoke(&s, stripe_request(&s, &body));

    assert_eq!(resp.status, 200);
    let stored = s
        .get_entry(ids::MODEL_LEDGER, "dp_1")
        .expect("dispute webhook persists an admin-readable record");
    assert_eq!(stored["kind"], "dispute");
    assert_eq!(stored["status"], "needs_response");
    assert_eq!(stored["amount"], 2500);
    assert_eq!(stored["currency"], "USD");
    assert_eq!(stored["orderId"], "ord_1");
    assert_eq!(stored["metadata"]["reference"], "ord_1");
    assert!(stored["metadata"].get("customerId").is_none());
    assert!(stored["metadata"].get("wallet").is_none());
    assert!(stored["metadata"].get("rawEvidence").is_none());
    let crm = s.crm_events.borrow();
    assert_eq!(crm[0].2, ids::CRM_EVENT_DISPUTE_OPENED);
    assert_eq!(crm[0].3["customerId"], "cus_1");
    assert_eq!(crm[0].3["disputeId"], "dp_1");
    assert_eq!(crm[0].3["disputeStatus"], "needs_response");
    assert_eq!(crm[0].3["disputeReason"], "fraudulent");
    assert_eq!(crm[0].3["disputedAmountCents"], 2500);
    assert_eq!(crm[0].3["disputedCurrency"], "USD");
    assert_eq!(crm[0].3["paymentIntentRef"], "pi_1");
    assert_eq!(crm[0].3["orderReference"], "ord_1");
    assert_eq!(crm[0].3["evidenceDueAt"], time::iso8601(1800000000));
    assert!(crm[0].3.get("wallet").is_none());
    assert!(crm[0].3.get("rawEvidence").is_none());
    // Admin risk signal: coarse, identifier-free.
    assert_eq!(s.event_count(ids::EVENT_DISPUTE_OPENED), 1);
    let dispute = event_payload(&s, ids::EVENT_DISPUTE_OPENED);
    assert_eq!(dispute["dispute_kind"], "dispute");
    assert_eq!(dispute["amount_bucket"], "low");
    assert_eq!(dispute["flow"], "dispute");
    let serialized = dispute.to_string();
    assert!(!serialized.contains("cus_1"));
    assert!(!serialized.contains("dp_1"));
    assert!(!serialized.contains("fraudulent"));
}

#[test]
fn dispute_updated_and_closed_do_not_emit_analytics() {
    let s = seams();
    seed_pending(&s, "ord_1", "pi_1", 5000, "cus_1");
    for (id, event_type) in [
        ("evt_disp_upd", "charge.dispute.updated"),
        ("evt_disp_close", "charge.dispute.closed"),
    ] {
        let body = json!({
            "id": id, "type": event_type,
            "data": { "object": { "id": "dp_x", "payment_intent": "pi_1", "amount": 2500, "currency": "usd",
                "status": "under_review", "metadata": { "customerId": "cus_1" } } }
        })
        .to_string();
        assert_eq!(invoke(&s, stripe_request(&s, &body)).status, 200);
    }
    // Only newly-opened disputes/chargebacks are operator-actionable analytics.
    assert_eq!(s.event_count(ids::EVENT_DISPUTE_OPENED), 0);
}

#[test]
fn dispute_webhooks_update_persisted_state_and_ignore_older_delivery() {
    let s = seams();
    seed_pending(&s, "ord_ordered", "pi_1", 5000, "cus_ordered");
    let event = |id: &str, event_type: &str, created: i64, status: &str| {
        json!({
            "id": id,
            "type": event_type,
            "created": created,
            "data": { "object": {
                "id": "dp_ordered", "payment_intent": "pi_1",
                "amount": 2500,
                "currency": "usd",
                "status": status,
                "metadata": { "reference": "ord_ordered", "customerId": "cus_ordered" }
            }}
        })
        .to_string()
    };

    let created = event(
        "evt_disp_created",
        "charge.dispute.created",
        100,
        "needs_response",
    );
    assert_eq!(invoke(&s, stripe_request(&s, &created)).status, 200);
    let original_created_at =
        s.get_entry(ids::MODEL_LEDGER, "dp_ordered").unwrap()["createdAt"].clone();

    let updated = event(
        "evt_disp_updated",
        "charge.dispute.updated",
        200,
        "under_review",
    );
    assert_eq!(invoke(&s, stripe_request(&s, &updated)).status, 200);
    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, "dp_ordered").unwrap()["status"],
        "under_review"
    );

    let stale = event("evt_disp_stale", "charge.dispute.closed", 150, "lost");
    assert_eq!(invoke(&s, stripe_request(&s, &stale)).status, 200);
    let equal_second_stale = event(
        "evt_disp_equal_second_stale",
        "charge.dispute.created",
        200,
        "needs_response",
    );
    assert_eq!(
        invoke(&s, stripe_request(&s, &equal_second_stale)).status,
        200
    );
    let stored = s.get_entry(ids::MODEL_LEDGER, "dp_ordered").unwrap();
    assert_eq!(stored["status"], "under_review");
    assert_eq!(stored["createdAt"], original_created_at);
    assert!(s
        .get_entry(ids::MODEL_WEBHOOK_OUTBOX, "evt:evt_disp_stale")
        .is_some());
    assert!(s
        .get_entry(ids::MODEL_WEBHOOK_OUTBOX, "evt:evt_disp_equal_second_stale")
        .is_some());
    assert_eq!(s.crm_events.borrow().len(), 2);
}

#[test]
fn dispute_funds_withdrawn_emits_chargeback_opened() {
    let s = seams();
    seed_pending(&s, "ord_1", "pi_1", 5000, "cus_1");
    let body = json!({
        "id": "evt_chargeback", "type": "charge.dispute.funds_withdrawn",
        "data": { "object": {
            "id": "dp_2", "payment_intent": "pi_1",
            "amount": 4900,
            "currency": "usd",
            "status": "under_review",
            "reason": "product_not_received",
            "metadata": { "email": "buyer@example.com" }
        }}
    })
    .to_string();

    let resp = invoke(&s, stripe_request(&s, &body));

    assert_eq!(resp.status, 200);
    let crm = s.crm_events.borrow();
    assert_eq!(crm[0].2, ids::CRM_EVENT_CHARGEBACK_OPENED);
    assert!(
        crm[0].3.get("email").is_none(),
        "untrusted dispute metadata cannot supply customer identity"
    );
    assert_eq!(crm[0].3["disputeId"], "dp_2");
    assert_eq!(crm[0].3["chargebackId"], "dp_2");
    assert_eq!(crm[0].3["disputedAmountCents"], 4900);
    assert_eq!(s.event_count(ids::EVENT_DISPUTE_OPENED), 1);
    let chargeback = event_payload(&s, ids::EVENT_DISPUTE_OPENED);
    assert_eq!(chargeback["dispute_kind"], "chargeback");
    assert_eq!(chargeback["amount_bucket"], "low");
}

#[test]
fn posted_payload_fields_are_ignored_in_favor_of_the_stripe_event() {
    let s = seams();
    seed_pending(&s, "ord_1", "pi_x", 5000, "p1");
    s.seed_stripe_event(
        serde_json::from_str(&pi_succeeded("evt_real", "ord_1", "pi_x", 5000, "p1")).unwrap(),
    );
    let mut tampered: serde_json::Value =
        serde_json::from_str(&pi_succeeded("evt_real", "ord_1", "pi_x", 1, "p1")).unwrap();
    tampered["data"]["object"]["metadata"]["profileId"] = json!("attacker");
    let request = crate::reqresp::RouteRequest {
        route_id: ids::ROUTE_WEBHOOKS.into(),
        method: "POST".into(),
        path: "/webhook/stripe".into(),
        query: vec![("token".into(), TOKEN.into())],
        body: tampered.to_string(),
        ..Default::default()
    };
    assert_eq!(invoke(&s, request).status, 200);
    let ledger = s.get_entry(ids::MODEL_LEDGER, "ord_1").unwrap();
    assert_eq!(ledger["status"], "succeeded");
    assert_eq!(ledger["grossCents"], 5000);
    assert_eq!(ledger["customerProfileId"], "p1");
}
