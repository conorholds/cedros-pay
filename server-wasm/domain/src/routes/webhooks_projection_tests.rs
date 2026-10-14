use serde_json::json;

use super::webhooks_test_support::*;
use crate::ids;
use crate::seams::HostSeams;

#[path = "webhooks_projection_test_support.rs"]
mod projection_support;
use projection_support::*;

#[test]
fn payment_intent_success_preserves_claim_and_unknown_fields_for_exact_retry() {
    let s = seams();
    s.set_secret(ids::SECRET_RP_TOKEN, "rp_test");
    s.set_secret(ids::SECRET_STRIPE_KEY, "sk_test_fixture");
    let provider = r#"{"id":"pi_claim","status":"requires_payment_method","client_secret":"secret","amount":5000,"currency":"usd"}"#;
    let checkout = paywall_request();
    s.push_http_response(200, provider);
    assert_eq!(
        crate::routes::paywall::handle(&s, &checkout)
            .unwrap()
            .status,
        201
    );
    let mut claimed = s.get_entry(ids::MODEL_LEDGER, "ord_claim").unwrap();
    claimed["extensionMetadata"] = json!({ "keep": true });
    let original_claim = claimed["checkoutClaim"].clone();
    s.seed(ids::MODEL_LEDGER, "ord_claim", claimed);
    let body = pi_succeeded("evt_claim", "ord_claim", "pi_claim", 5000, "p1");

    assert_eq!(
        invoke(&s, stripe_request(&s, &body)).status,
        200
    );
    let row = s.get_entry(ids::MODEL_LEDGER, "ord_claim").unwrap();
    assert_eq!(row["checkoutClaim"], original_claim);
    assert_eq!(row["extensionMetadata"]["keep"], true);
    let before = effect_counts(&s);
    s.push_http_response(200, provider);
    assert_eq!(
        crate::routes::paywall::handle(&s, &checkout)
            .unwrap()
            .status,
        201
    );
    let retried = s.get_entry(ids::MODEL_LEDGER, "ord_claim").unwrap();
    assert_eq!(retried["status"], "succeeded");
    assert_eq!(retried["extensionMetadata"]["keep"], true);
    assert_eq!(effect_counts(&s), before);
}

#[test]
fn hosted_session_success_preserves_claim_for_exact_retry() {
    let s = seams();
    s.set_secret(ids::SECRET_STRIPE_KEY, "sk_test_fixture");
    s.seed(
        ids::MODEL_CATALOG,
        "prod_1",
        json!({ "id": "prod_1", "displayName": "Product", "price": {
            "amountCents": 1299, "currency": "USD"
        }}),
    );
    let request = hosted_checkout_request();
    let provider = r#"{"id":"cs_claim","url":"https://checkout.stripe.com/c"}"#;
    s.push_http_response(200, provider);
    assert_eq!(
        crate::routes::stripe_session::handle(&s, &request)
            .unwrap()
            .status,
        200
    );
    let original_claim =
        s.get_entry(ids::MODEL_LEDGER, "cs_claim").unwrap()["checkoutClaim"].clone();
    let body = session_completed("evt_session_claim", "cs_claim", "pi_claim", 1299);

    assert_eq!(
        invoke(&s, stripe_request(&s, &body)).status,
        200
    );
    let row = crate::db::Db::new(&s, ids::DB_ACCESS)
        .read_one(ids::MODEL_LEDGER, "cs_claim")
        .unwrap()
        .unwrap();
    assert_eq!(row.payload["checkoutClaim"], original_claim);
    s.push_http_response(200, provider);
    assert_eq!(
        crate::routes::stripe_session::handle(&s, &request)
            .unwrap()
            .status,
        200
    );
}

#[test]
fn refund_projection_preserves_claim_and_rejects_cross_rail_rows() {
    let s = seams();
    seed_claimed(&s, "ord_ref", "pi_ref", "prod_1");
    let original_time = s.get_entry(ids::MODEL_LEDGER, "ord_ref").unwrap()["processedAt"].clone();
    s.set_now(s.now_unix_secs() + 86_400);
    let refund = refund_event("evt_ref", "ord_ref", "pi_ref", 5000);
    assert_eq!(
        invoke(&s, stripe_request(&s, &refund)).status,
        200
    );
    let refunded = s.get_entry(ids::MODEL_LEDGER, "ord_ref").unwrap();
    assert_eq!(refunded["status"], "refunded");
    assert_eq!(refunded["processedAt"], original_time);
    assert_eq!(refunded["checkoutClaim"]["fingerprint"], "fp-claim");
    assert_eq!(refunded["extensionMetadata"]["keep"], true);

    seed_claimed(&s, "ord_x402", "pi_wrong", "prod_1");
    let mut non_stripe = s.get_entry(ids::MODEL_LEDGER, "ord_x402").unwrap();
    non_stripe["provider"] = json!("x402");
    s.seed(ids::MODEL_LEDGER, "ord_x402", non_stripe.clone());
    let event = pi_succeeded("evt_cross", "ord_x402", "pi_wrong", 5000, "p1");
    assert_eq!(
        invoke(&s, stripe_request(&s, &event)).status,
        403
    );
    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, "ord_x402").unwrap(),
        non_stripe
    );
    assert!(s
        .get_entry(ids::MODEL_WEBHOOK_OUTBOX, "evt:evt_cross")
        .is_none());
    let cross_refund = refund_event("evt_cross_refund", "ord_x402", "pi_wrong", 5000);
    assert_eq!(
        invoke(&s, stripe_request(&s, &cross_refund)).status,
        403
    );
    assert!(s
        .get_entry(ids::MODEL_WEBHOOK_OUTBOX, "evt:evt_cross_refund")
        .is_none());
    let cross_session = session_completed("evt_cross_session", "ord_x402", "pi_wrong", 5000);
    assert_eq!(
        invoke(&s, stripe_request(&s, &cross_session)).status,
        403
    );
    assert!(s
        .get_entry(ids::MODEL_WEBHOOK_OUTBOX, "evt:evt_cross_session")
        .is_none());

    seed_claimed(&s, "ord_currency", "pi_currency", "prod_1");
    let currency_mismatch = json!({
        "id": "evt_currency", "type": "payment_intent.succeeded",
        "data": { "object": {
            "id": "pi_currency", "amount": 5000, "currency": "eur",
            "metadata": { "reference": "ord_currency", "profileId": "p1" }
        }}
    })
    .to_string();
    assert_eq!(
        invoke(&s, stripe_request(&s, &currency_mismatch)).status,
        403
    );
    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, "ord_currency").unwrap()["status"],
        "pending"
    );
}

#[test]
fn checkout_refund_correlates_by_payment_intent_when_session_is_the_ledger_key() {
    let s = seams();
    seed_claimed(&s, "cs_refund", "pi_refund", "prod_1");
    let event = json!({
        "id": "evt_checkout_refund",
        "type": "charge.refunded",
        "data": { "object": {
            "id": "ch_refund",
            "payment_intent": "pi_refund",
            "amount_refunded": 5000,
            "currency": "usd",
            "metadata": {
                "cedros_pay_checkout": "true"
            },
            "refunds": { "data": [{
                "id": "re_checkout", "amount": 5000, "status": "succeeded"
            }] }
        }}
    })
    .to_string();

    assert_eq!(
        invoke(&s, stripe_request(&s, &event)).status,
        200
    );
    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, "cs_refund").unwrap()["status"],
        "refunded"
    );
    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, "re_checkout").unwrap()["originalReference"],
        "cs_refund"
    );
}

#[test]
fn charge_refund_with_explicit_pending_status_does_not_settle() {
    let s = seams();
    seed_claimed(&s, "cs_pending_refund", "pi_pending_refund", "prod_1");
    let event = json!({
        "id": "evt_pending_refund",
        "type": "charge.refunded",
        "data": { "object": {
            "id": "ch_pending_refund",
            "payment_intent": "pi_pending_refund",
            "amount_refunded": 5000,
            "currency": "usd",
            "metadata": { "cedros_pay_checkout": "true" },
            "refunds": { "data": [{
                "id": "re_pending_refund", "amount": 5000, "status": "pending"
            }] }
        }}
    })
    .to_string();

    assert_eq!(
        invoke(&s, stripe_request(&s, &event)).status,
        200
    );
    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, "cs_pending_refund").unwrap()["refundCents"],
        0
    );
    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, "re_pending_refund").unwrap()["status"],
        "pending"
    );
    assert_eq!(effect_counts(&s), (0, 0, 0));
}

#[test]
fn out_of_order_checkout_refund_is_retryable_until_payment_settlement_exists() {
    let s = seams();
    let event = json!({
        "id": "evt_early_refund",
        "type": "charge.refunded",
        "data": { "object": {
            "id": "ch_early",
            "payment_intent": "pi_early",
            "amount_refunded": 5000,
            "currency": "usd",
            "metadata": { "cedros_pay_checkout": "true" },
            "refunds": { "data": [{
                "id": "re_early", "amount": 5000, "status": "succeeded"
            }] }
        }}
    })
    .to_string();

    s.push_http_response(200, r#"{"object":"list","data":[],"has_more":false}"#);
    assert_eq!(
        invoke(&s, stripe_request(&s, &event)).status,
        409
    );
    assert!(s
        .get_entry(ids::MODEL_WEBHOOK_OUTBOX, "evt:evt_early_refund")
        .is_none());

    seed_claimed(&s, "cs_early", "pi_early", "prod_1");
    assert_eq!(
        invoke(&s, stripe_request(&s, &event)).status,
        200
    );
    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, "cs_early").unwrap()["status"],
        "refunded"
    );
}

#[test]
fn unrelated_account_refund_is_acknowledged_without_cedros_state() {
    let s = seams();
    let event = refund_event(
        "evt_unrelated_refund",
        "external_order",
        "pi_external",
        5000,
    );

    s.push_http_response(200, r#"{"object":"list","data":[],"has_more":false}"#);
    assert_eq!(
        invoke(&s, stripe_request(&s, &event)).status,
        200
    );
    assert_eq!(s.entry_count(ids::MODEL_LEDGER), 0);
    assert_eq!(effect_counts(&s), (0, 0, 0));
}

#[test]
fn unrelated_account_payment_failure_has_no_cedros_effects() {
    let s = seams();
    let event = failure_event("evt_unrelated_failure", "external_order", "pi_external");

    assert_eq!(
        invoke(&s, stripe_request(&s, &event)).status,
        200
    );
    assert_eq!(s.entry_count(ids::MODEL_LEDGER), 0);
    assert_eq!(effect_counts(&s), (0, 0, 0));
}

#[test]
fn refund_status_events_apply_success_once_and_ignore_stale_updates() {
    let s = seams();
    seed_claimed(&s, "cs_lifecycle", "pi_lifecycle", "prod_1");
    let mut payment = s.get_entry(ids::MODEL_LEDGER, "cs_lifecycle").unwrap();
    payment["status"] = json!("succeeded");
    s.seed(ids::MODEL_LEDGER, "cs_lifecycle", payment);

    let pending = refund_change_event("evt_ref_pending", "refund.created", "pending", 100);
    assert_eq!(
        invoke(&s, stripe_request(&s, &pending)).status,
        200
    );
    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, "re_lifecycle").unwrap()["status"],
        "pending"
    );
    assert_eq!(effect_counts(&s), (0, 0, 0));

    let succeeded = refund_change_event("evt_ref_succeeded", "refund.updated", "succeeded", 200);
    assert_eq!(
        invoke(&s, stripe_request(&s, &succeeded)).status,
        200
    );
    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, "cs_lifecycle").unwrap()["status"],
        "refunded"
    );
    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, "cs_lifecycle").unwrap()["refundCents"],
        5000
    );
    let effects_after_success = effect_counts(&s);
    assert_eq!(effects_after_success, (2, 0, 0));

    let failed = refund_change_event("evt_ref_failed", "refund.failed", "failed", 300);
    assert_eq!(
        invoke(&s, stripe_request(&s, &failed)).status,
        200
    );
    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, "cs_lifecycle").unwrap()["status"],
        "succeeded"
    );
    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, "cs_lifecycle").unwrap()["refundCents"],
        0
    );
    assert_eq!(effect_counts(&s), effects_after_success);

    let stale = refund_change_event("evt_ref_stale", "refund.updated", "succeeded", 250);
    assert_eq!(
        invoke(&s, stripe_request(&s, &stale)).status,
        200
    );
    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, "re_lifecycle").unwrap()["status"],
        "failed"
    );
    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, "cs_lifecycle").unwrap()["refundCents"],
        0
    );
    assert_eq!(effect_counts(&s), effects_after_success);
}

#[test]
fn unidentified_legacy_refunds_fail_closed_instead_of_matching_by_amount() {
    let s = seams();
    seed_claimed(&s, "cs_legacy_refund", "pi_legacy_refund", "prod_1");
    let event = json!({"id":"evt_unidentified","type":"charge.refunded","data":{"object":{
        "payment_intent":"pi_legacy_refund","amount_refunded":5000,"currency":"usd"
    }}})
    .to_string();
    assert_eq!(
        invoke(&s, stripe_request(&s, &event)).status,
        409
    );
    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, "cs_legacy_refund").unwrap()["refundCents"],
        0
    );
    assert!(s
        .get_entry(ids::MODEL_LEDGER, "refund:cs_legacy_refund")
        .is_none());
    s.seed(
        ids::MODEL_LEDGER,
        "refund:cs_legacy_refund",
        json!({"kind":"refund","status":"succeeded","grossCents":5000}),
    );
    let event = json!({"id":"evt_unbound_refund","type":"refund.updated","data":{"object":{
        "id":"re_unbound","payment_intent":"pi_legacy_refund","amount":5000,"currency":"usd","status":"succeeded"
    }}}).to_string();
    assert_eq!(
        invoke(&s, stripe_request(&s, &event)).status,
        409
    );
    assert!(s.get_entry(ids::MODEL_LEDGER, "re_unbound").is_none());
}

#[test]
fn cart_checkout_webhook_atomically_marks_cart_paid_and_exact_replay_has_no_effects() {
    let s = seams();
    configure_cart(&s);
    seed_cart(&s, None);
    s.push_http_response(
        200,
        r#"{"id":"cs_cart","url":"https://checkout.stripe.com/c"}"#,
    );
    let checkout = crate::routes::cart_checkout::handle(&s, &cart_checkout_request()).unwrap();
    assert_eq!(checkout.status, 200);
    let body = cart_session_event("evt_cart", "cs_cart");

    assert_eq!(
        invoke(&s, stripe_request(&s, &body)).status,
        200
    );
    let cart = s.get_entry(ids::MODEL_CART, CART_ID).unwrap();
    assert_eq!(cart["paidSignature"], "cs_cart");
    assert_eq!(cart["settlementClaim"]["status"], "succeeded");
    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, "cs_cart").unwrap()["status"],
        "succeeded"
    );
    assert!(s
        .get_entry(ids::MODEL_WEBHOOK_OUTBOX, "evt:evt_cart")
        .is_some());
    let db = crate::db::Db::new(&s, ids::DB_ACCESS);
    let settled_cart = db.read_one(ids::MODEL_CART, CART_ID).unwrap().unwrap();
    assert_eq!(
        crate::routes::cart_settlement::claim(
            &db,
            settled_cart,
            "x402",
            "other-fingerprint",
            "chain-signature",
            vec![],
            vec![],
        )
        .unwrap_err()
        .status,
        409
    );
    let before = effect_counts(&s);
    assert_eq!(
        json_body(&invoke(&s, stripe_request(&s, &body)).body)["duplicate"],
        true
    );
    assert_eq!(effect_counts(&s), before);
}

#[test]
fn failed_cart_checkout_releases_the_cart_settlement_claim() {
    let s = seams();
    configure_cart(&s);
    seed_cart(&s, None);
    s.push_http_response(
        200,
        r#"{"id":"cs_cart_failed","url":"https://checkout.stripe.com/c"}"#,
    );
    assert_eq!(
        crate::routes::cart_checkout::handle(&s, &cart_checkout_request())
            .unwrap()
            .status,
        200
    );
    let event = json!({
        "id": "evt_cart_failed",
        "type": "checkout.session.async_payment_failed",
        "data": { "object": {
            "id": "cs_cart_failed",
            "payment_intent": "pi_cart_failed",
            "mode": "payment",
            "status": "complete",
            "payment_status": "unpaid",
            "amount_total": 5000,
            "currency": "usd",
            "metadata": { "resource": format!("cart:{CART_ID}") }
        }}
    })
    .to_string();

    assert_eq!(
        invoke(&s, stripe_request(&s, &event)).status,
        200
    );
    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, "cs_cart_failed").unwrap()["status"],
        "failed"
    );
    let cart = s.get_entry(ids::MODEL_CART, CART_ID).unwrap();
    assert!(cart["settlementClaim"].is_null());
    assert!(cart["paidSignature"].is_null());
}

#[test]
fn competing_cart_rail_is_rejected_without_ledger_or_event_mutation() {
    let s = seams();
    seed_cart(
        &s,
        Some(json!({
            "schemaVersion": 1, "rail": "x402", "fingerprint": "other",
            "reference": "chain-sig", "status": "pending"
        })),
    );
    seed_claimed(&s, "cs_blocked", "cs_blocked", &format!("cart:{CART_ID}"));
    let before = s.get_entry(ids::MODEL_LEDGER, "cs_blocked").unwrap();

    let response = invoke(
        &s,
        stripe_request(&s, &cart_session_event("evt_blocked", "cs_blocked")),
    );

    assert_eq!(response.status, 409);
    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, "cs_blocked").unwrap(),
        before
    );
    assert!(s
        .get_entry(ids::MODEL_WEBHOOK_OUTBOX, "evt:evt_blocked")
        .is_none());
    assert_eq!(effect_counts(&s), (0, 0, 0));
}

#[test]
fn cart_version_race_rolls_back_ledger_event_and_effects() {
    let s = seams();
    configure_cart(&s);
    seed_cart(&s, None);
    s.push_http_response(
        200,
        r#"{"id":"cs_race","url":"https://checkout.stripe.com/c"}"#,
    );
    crate::routes::cart_checkout::handle(&s, &cart_checkout_request()).unwrap();
    let mut raced = s.get_entry(ids::MODEL_CART, CART_ID).unwrap();
    raced["operatorNote"] = json!("newer cart write");
    s.queue_guarded_race(vec![(ids::MODEL_CART, CART_ID, raced)]);

    let response = invoke(
        &s,
        stripe_request(&s, &cart_session_event("evt_cart_race", "cs_race")),
    );

    assert_eq!(response.status, 409);
    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, "cs_race").unwrap()["status"],
        "pending"
    );
    assert!(s
        .get_entry(ids::MODEL_WEBHOOK_OUTBOX, "evt:evt_cart_race")
        .is_none());
    assert_eq!(effect_counts(&s), (0, 0, 0));
}

#[test]
fn delayed_success_cannot_regress_refunded_payment() {
    let s = seams();
    seed_claimed(&s, "cs_terminal", "cs_terminal", "prod_1");
    let mut row = s.get_entry(ids::MODEL_LEDGER, "cs_terminal").unwrap();
    row["status"] = json!("refunded");
    row["refundCents"] = json!(5000);
    s.seed(ids::MODEL_LEDGER, "cs_terminal", row);

    assert_eq!(
        invoke(
            &s,
            stripe_request(&s, &session_completed("evt_delayed", "cs_terminal", "pi_terminal", 5000))
        )
        .status,
        200
    );
    let stored = s.get_entry(ids::MODEL_LEDGER, "cs_terminal").unwrap();
    assert_eq!(stored["status"], "refunded");
    assert_eq!(stored["refundCents"], 5000);
    assert_eq!(effect_counts(&s), (0, 0, 0));
}

#[test]
fn payment_failure_projects_pending_but_never_regresses_terminal_states() {
    let s = seams();
    seed_claimed(&s, "ord_failed", "pi_failed", "prod_1");
    let failure = failure_event("evt_failed_projection", "ord_failed", "pi_failed");
    assert_eq!(
        invoke(&s, stripe_request(&s, &failure)).status,
        200
    );
    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, "ord_failed").unwrap()["status"],
        "failed"
    );
    assert!(s
        .get_entry(ids::MODEL_WEBHOOK_OUTBOX, "evt:evt_failed_projection")
        .is_some());
    assert_eq!(s.event_count(ids::EVENT_PAYMENT_FAILED), 1);

    for (reference, status) in [("ord_succeeded", "succeeded"), ("ord_refunded", "refunded")] {
        seed_claimed(&s, reference, &format!("pi_{reference}"), "prod_1");
        let mut terminal = s.get_entry(ids::MODEL_LEDGER, reference).unwrap();
        terminal["status"] = json!(status);
        if status == "refunded" {
            terminal["refundCents"] = json!(5000);
        }
        s.seed(ids::MODEL_LEDGER, reference, terminal);
        let before = effect_counts(&s);
        let event = failure_event(
            &format!("evt_{reference}"),
            reference,
            &format!("pi_{reference}"),
        );
        assert_eq!(
            invoke(&s, stripe_request(&s, &event)).status,
            200
        );
        assert_eq!(
            s.get_entry(ids::MODEL_LEDGER, reference).unwrap()["status"],
            status
        );
        assert_eq!(effect_counts(&s), before);
    }
}

#[test]
fn retried_payment_intent_success_recovers_from_a_failed_attempt() {
    let s = seams();
    seed_claimed(&s, "ord_retry_success", "pi_retry_success", "prod_1");
    let failure = failure_event("evt_retry_failed", "ord_retry_success", "pi_retry_success");
    assert_eq!(invoke(&s, stripe_request(&s, &failure)).status, 200);
    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, "ord_retry_success").unwrap()["status"],
        "failed"
    );

    let success = pi_succeeded(
        "evt_retry_succeeded",
        "ord_retry_success",
        "pi_retry_success",
        5000,
        "p1",
    );
    assert_eq!(invoke(&s, stripe_request(&s, &success)).status, 200);
    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, "ord_retry_success").unwrap()["status"],
        "succeeded"
    );
    assert_eq!(s.event_count(ids::EVENT_PAYMENT_FAILED), 1);
    assert_eq!(s.event_count(ids::EVENT_PAYMENT_SUCCEEDED), 1);
}

#[test]
fn asynchronous_checkout_success_uses_the_same_paid_settlement_path() {
    let s = seams();
    seed_claimed(&s, "cs_async", "cs_async", "prod_1");
    let mut event: serde_json::Value = serde_json::from_str(&session_completed(
        "evt_async_success",
        "cs_async",
        "pi_async",
        5000,
    ))
    .unwrap();
    event["type"] = json!("checkout.session.async_payment_succeeded");

    assert_eq!(
        invoke(&s, stripe_request(&s, &event.to_string())).status,
        200
    );
    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, "cs_async").unwrap()["status"],
        "succeeded"
    );
    assert_eq!(s.event_count(ids::EVENT_PAYMENT_SUCCEEDED), 1);
}

#[test]
fn concurrent_terminal_winner_rolls_back_losing_event_and_effects() {
    let s = seams();
    seed_claimed(&s, "ord_terminal_race", "pi_terminal_race", "prod_1");
    let mut winner = s.get_entry(ids::MODEL_LEDGER, "ord_terminal_race").unwrap();
    winner["status"] = json!("refunded");
    winner["refundCents"] = json!(5000);
    s.queue_guarded_race(vec![(ids::MODEL_LEDGER, "ord_terminal_race", winner)]);
    let event = failure_event("evt_terminal_race", "ord_terminal_race", "pi_terminal_race");

    assert_eq!(
        invoke(&s, stripe_request(&s, &event)).status,
        409
    );
    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, "ord_terminal_race").unwrap()["status"],
        "refunded"
    );
    assert!(s
        .get_entry(ids::MODEL_WEBHOOK_OUTBOX, "evt:evt_terminal_race")
        .is_none());
    assert_eq!(effect_counts(&s), (0, 0, 0));
}

#[test]
fn malformed_subscription_is_retryable_and_does_not_consume_event() {
    let s = seams();
    s.seed(
        ids::MODEL_SUBSCRIPTIONS,
        "sub_bad",
        json!({ "status": "active" }),
    );
    let body = json!({
        "id": "evt_bad_sub", "type": "invoice.paid",
        "data": { "object": {
            "id": "in_bad", "subscription": "sub_bad",
            "billing_reason": "subscription_cycle", "status": "paid", "paid": true, "paid_out_of_band": false, "amount_remaining": 0, "amount_paid": 500, "currency": "usd"
        }}
    })
    .to_string();

    assert_eq!(
        invoke(&s, stripe_request(&s, &body)).status,
        500
    );
    assert!(s
        .get_entry(ids::MODEL_WEBHOOK_OUTBOX, "evt:evt_bad_sub")
        .is_none());
    assert_eq!(effect_counts(&s), (0, 0, 0));
}

#[test]
fn charge_snapshot_and_individual_partial_refunds_do_not_double_count() {
    for charge_first in [true, false] {
        let s = seams();
        seed_claimed(&s, "cs_partial", "pi_partial", "prod_1");
        let refunds = [
            json!({"id":"re_a","amount":1000,"status":"succeeded"}),
            json!({"id":"re_b","amount":1500,"status":"succeeded"}),
        ];
        let charge = json!({"id":"evt_charge_partial","type":"charge.refunded","created":200,"data":{"object":{
            "id":"ch_partial","payment_intent":"pi_partial","currency":"usd","amount_refunded":2500,
            "metadata":{"customerId":"customer_partial"},
            "refunds":{"has_more":false,"data":refunds}
        }}}).to_string();
        if charge_first {
            assert_eq!(
                invoke(&s, stripe_request(&s, &charge)).status,
                200
            );
        }
        for (i, refund) in refunds.iter().enumerate() {
            let mut object = refund.clone();
            object["payment_intent"] = json!("pi_partial");
            object["currency"] = json!("usd");
            object["metadata"] = json!({"customerId":"customer_partial"});
            let event = json!({"id":format!("evt_partial_{i}"),"type":"refund.updated","created":300,"data":{"object":object}}).to_string();
            assert_eq!(
                invoke(&s, stripe_request(&s, &event)).status,
                200
            );
        }
        if !charge_first {
            assert_eq!(
                invoke(&s, stripe_request(&s, &charge)).status,
                200
            );
        }
        assert_eq!(
            s.get_entry(ids::MODEL_LEDGER, "cs_partial").unwrap()["refundCents"],
            2500
        );
        assert_eq!(s.event_count(ids::EVENT_ENTITLEMENT_CHANGED), 2);
        let crm = s.crm_events.borrow();
        assert_eq!(crm.len(), 2);
        assert_ne!(crm[0].3["eventId"], crm[1].3["eventId"]);
    }
}

#[test]
fn hostile_charge_refund_sum_cannot_partially_commit() {
    let s = seams();
    seed_claimed(&s, "cs_over_refund", "pi_over_refund", "prod_1");
    let event = json!({"id":"evt_over_refund","type":"charge.refunded","data":{"object":{
        "payment_intent":"pi_over_refund","currency":"usd","amount_refunded":8000,
        "refunds":{"data":[{"id":"re_over_a","amount":4000,"status":"succeeded"},{"id":"re_over_b","amount":4000,"status":"succeeded"}]}
    }}}).to_string();
    assert_eq!(
        invoke(&s, stripe_request(&s, &event)).status,
        403
    );
    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, "cs_over_refund").unwrap()["refundCents"],
        0
    );
    assert!(s.get_entry(ids::MODEL_LEDGER, "re_over_a").is_none());
    assert!(s.get_entry(ids::MODEL_LEDGER, "re_over_b").is_none());
    assert!(s
        .get_entry(ids::MODEL_WEBHOOK_OUTBOX, "evt:evt_over_refund")
        .is_none());
    assert_eq!(s.event_count(ids::EVENT_REFUND_SETTLED), 0);
}

#[test]
fn payment_intent_retry_cannot_suppress_event_fulfillment() {
    let s = seams();
    s.set_secret(ids::SECRET_RP_TOKEN, "rp_test");
    s.set_secret(ids::SECRET_STRIPE_KEY, "sk_test_fixture");
    let request = paywall_request();
    s.push_http_response(200, r#"{"id":"pi_claim","status":"requires_action","client_secret":"secret","amount":5000,"currency":"usd"}"#);
    let response = crate::routes::paywall::handle(&s, &request).unwrap();
    assert!(response
        .headers
        .iter()
        .any(|(key, value)| key == "cache-control" && value == "no-store"));
    s.push_http_response(200, r#"{"id":"pi_claim","status":"succeeded","amount_received":5000,"amount":5000,"currency":"usd"}"#);
    crate::routes::paywall::handle(&s, &request).unwrap();
    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, "ord_claim").unwrap()["status"],
        "pending"
    );
    assert_eq!(s.event_count(ids::EVENT_PAYMENT_SUCCEEDED), 0);
    let event = pi_succeeded("evt_after_retry", "ord_claim", "pi_claim", 5000, "p1");
    assert_eq!(
        invoke(&s, stripe_request(&s, &event)).status,
        200
    );
    assert_eq!(
        invoke(&s, stripe_request(&s, &event)).status,
        200
    );
    assert_eq!(s.event_count(ids::EVENT_PAYMENT_SUCCEEDED), 1);
}

#[test]
fn same_second_refund_snapshots_cannot_reopen_terminal_states() {
    let s = seams();
    seed_claimed(&s, "cs_lifecycle", "pi_lifecycle", "prod_1");
    for (id, status, expected_total) in [
        ("evt_success", "succeeded", 5000),
        ("evt_stale_pending", "pending", 5000),
        ("evt_failure", "failed", 0),
        ("evt_stale_success", "succeeded", 0),
        ("evt_stale_action", "requires_action", 0),
    ] {
        let event = refund_change_event(id, "refund.updated", status, 200);
        assert_eq!(
            invoke(&s, stripe_request(&s, &event)).status,
            200
        );
        assert_eq!(
            s.get_entry(ids::MODEL_LEDGER, "cs_lifecycle").unwrap()["refundCents"],
            expected_total
        );
    }
    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, "re_lifecycle").unwrap()["status"],
        "failed"
    );
}

#[test]
fn refund_resolves_paid_checkout_before_completion_webhook() {
    let s = seams();
    s.set_secret(ids::SECRET_STRIPE_KEY, "sk_test_fixture");
    seed_pending(&s, "cs_early_refund", "cs_early_refund", 5000, "p1");
    s.push_http_response(
        200,
        &json!({"object":"list", "has_more":false, "data":[{
            "id":"cs_early_refund", "payment_intent":"pi_early_refund", "mode":"payment",
            "status":"complete", "payment_status":"paid", "amount_total":5000, "currency":"usd"
        }]})
        .to_string(),
    );
    let event = json!({"id":"evt_early_refund", "type":"refund.updated", "created":200,
        "data":{"object":{"id":"re_early", "payment_intent":"pi_early_refund", "amount":5000,
        "currency":"usd", "status":"succeeded"}}})
    .to_string();
    assert_eq!(
        invoke(&s, stripe_request(&s, &event)).status,
        200
    );
    let payment = s.get_entry(ids::MODEL_LEDGER, "cs_early_refund").unwrap();
    assert_eq!(payment["status"], "refunded");
    assert_eq!(payment["providerRef"], "pi_early_refund");
    let completed = session_completed("evt_later_paid", "cs_early_refund", "pi_early_refund", 5000);
    assert_eq!(
        invoke(&s, stripe_request(&s, &completed)).status,
        200
    );
    assert_eq!(s.event_count(ids::EVENT_PAYMENT_SUCCEEDED), 0);
    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, "cs_early_refund").unwrap()["refundCents"],
        5000
    );
}

#[test]
fn refund_checkout_mapping_rejects_wrong_provider_facts_without_mutation() {
    for (field, value) in [
        ("payment_intent", json!("pi_other")),
        ("amount_total", json!(4999)),
        ("currency", json!("eur")),
        ("payment_status", json!("unpaid")),
        ("status", json!("open")),
    ] {
        let s = seams();
        s.set_secret(ids::SECRET_STRIPE_KEY, "sk_test_fixture");
        seed_pending(&s, "cs_mapping", "cs_mapping", 5000, "p1");
        let mut session = json!({"id":"cs_mapping", "payment_intent":"pi_mapping", "mode":"payment",
            "status":"complete", "payment_status":"paid", "amount_total":5000, "currency":"usd"});
        session[field] = value;
        s.push_http_response(
            200,
            &json!({"object":"list","has_more":false,"data":[session]}).to_string(),
        );
        let event = json!({"id":"evt_mapping", "type":"refund.updated", "created":200, "data":{"object":{
            "id":"re_mapping", "payment_intent":"pi_mapping", "amount":5000, "currency":"usd", "status":"succeeded"
        }}}).to_string();
        assert_eq!(
            invoke(&s, stripe_request(&s, &event)).status,
            403,
            "{field}"
        );
        assert_eq!(
            s.get_entry(ids::MODEL_LEDGER, "cs_mapping").unwrap()["refundCents"],
            0
        );
        assert!(s.get_entry(ids::MODEL_LEDGER, "re_mapping").is_none());
        assert_eq!(effect_counts(&s), (0, 0, 0));
    }
}

#[test]
fn provider_metadata_cannot_change_payment_customer() {
    let s = seams();
    seed_pending(&s, "ord_owner", "pi_owner", 5000, "owner");
    let event = pi_succeeded("evt_owner", "ord_owner", "pi_owner", 5000, "victim");
    assert_eq!(
        invoke(&s, stripe_request(&s, &event)).status,
        200
    );
    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, "ord_owner").unwrap()["customerProfileId"],
        "owner"
    );
    assert!(s
        .tags
        .borrow()
        .iter()
        .all(|(profile, _, _)| profile != "victim"));
}
