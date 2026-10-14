//! Guarded event identity, replay, and monotonic-projection regressions.

use serde_json::{json, Value};

use super::webhooks_test_support::*;
use crate::ids;
use crate::time;

#[test]
fn canonical_reordering_is_an_exact_duplicate_without_reemitting_effects() {
    let s = seams();
    seed_pending(&s, "ord_1", "pi_1", 5000, "p1");
    let first = r#"{"id":"evt_same","type":"payment_intent.succeeded","data":{"object":{"id":"pi_1","status":"succeeded","amount_received":5000,"amount":5000,"currency":"usd","metadata":{"reference":"ord_1","profileId":"p1"}}}}"#;
    let reordered = r#"{"data":{"object":{"metadata":{"profileId":"p1","reference":"ord_1"},"currency":"usd","amount":5000,"id":"pi_1","status":"succeeded","amount_received":5000}},"type":"payment_intent.succeeded","id":"evt_same"}"#;

    assert_eq!(invoke(&s, stripe_request(&s, first)).status, 200);
    let before = (
        s.events.borrow().len(),
        s.crm_events.borrow().len(),
        s.tags.borrow().len(),
    );
    let replay = invoke(&s, stripe_request(&s, reordered));

    assert_eq!(replay.status, 200);
    assert_eq!(
        serde_json::from_str::<serde_json::Value>(&replay.body).unwrap()["duplicate"],
        true
    );
    assert_eq!(s.event_count(ids::EVENT_PAYMENT_SUCCEEDED), 1);
    assert_eq!(
        before,
        (
            s.events.borrow().len(),
            s.crm_events.borrow().len(),
            s.tags.borrow().len()
        )
    );
}

#[test]
fn same_provider_id_with_changed_payload_conflicts_without_side_effects() {
    let s = seams();
    seed_pending(&s, "ord_1", "pi_1", 5000, "p1");
    let first = pi_succeeded("evt_collision", "ord_1", "pi_1", 5000, "p1");
    assert_eq!(invoke(&s, stripe_request(&s, &first)).status, 200);
    let before = (
        s.events.borrow().len(),
        s.crm_events.borrow().len(),
        s.tags.borrow().len(),
    );
    let changed = pi_succeeded("evt_collision", "ord_1", "pi_1", 4999, "p1");

    assert_eq!(invoke(&s, stripe_request(&s, &changed)).status, 409);
    assert_eq!(
        before,
        (
            s.events.borrow().len(),
            s.crm_events.borrow().len(),
            s.tags.borrow().len()
        )
    );
    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, "ord_1").unwrap()["grossCents"],
        5000
    );
}

#[test]
fn legacy_identity_without_fingerprint_fails_closed() {
    let s = seams();
    s.seed(
        ids::MODEL_WEBHOOK_OUTBOX,
        "evt:evt_legacy",
        json!({
            "eventId": "evt_legacy",
            "processedAt": "2026-01-01T00:00:00Z"
        }),
    );
    let body = json!({"id": "evt_legacy", "type": "ignored", "data": {"object": {}}}).to_string();

    assert_eq!(
        invoke(&s, stripe_request(&s, &body)).status,
        409
    );
    assert!(s.events.borrow().is_empty());
    assert!(s.crm_events.borrow().is_empty());
}

#[test]
fn invoices_never_change_subscription_period() {
    let s = seams();
    seed_subscription(&s, "sub_1", "2026-06-01T00:00:00Z");
    let newer = invoice("evt_new", 1_800_000_000);
    let older = invoice("evt_old", 1_700_000_000);

    assert_eq!(invoke(&s, stripe_request(&s, &newer)).status, 200);
    assert_eq!(invoke(&s, stripe_request(&s, &older)).status, 200);
    assert_eq!(
        s.get_entry(ids::MODEL_SUBSCRIPTIONS, "sub_1").unwrap()["currentPeriodEnd"],
        "2026-06-01T00:00:00Z"
    );
}

#[test]
fn paid_invoice_cannot_reactivate_a_terminal_subscription() {
    let s = seams();
    seed_subscription(&s, "sub_1", "2026-06-01T00:00:00Z");
    let mut subscription = s.get_entry(ids::MODEL_SUBSCRIPTIONS, "sub_1").unwrap();
    subscription["status"] = Value::String("canceled".to_string());
    s.seed(ids::MODEL_SUBSCRIPTIONS, "sub_1", subscription);

    assert_eq!(
        invoke(
            &s,
            stripe_request(&s, &invoice("evt_terminal", 1_800_000_000))
        )
        .status,
        200
    );
    assert_eq!(
        s.get_entry(ids::MODEL_SUBSCRIPTIONS, "sub_1").unwrap()["status"],
        "canceled"
    );
    assert_eq!(s.event_count(ids::EVENT_ENTITLEMENT_CHANGED), 0);
}

#[test]
fn subscription_checkout_projects_pending_then_signed_lifecycle_grants_access() {
    let s = seams();

    assert_eq!(
        invoke(
            &s,
            stripe_request(&s, &subscription_checkout("evt_checkout", "cs_1", "sub_checkout", true)),
        )
        .status,
        200
    );
    let pending = s
        .get_entry(ids::MODEL_SUBSCRIPTIONS, "sub_checkout")
        .unwrap();
    assert_eq!(pending["customerRef"], "user_1");
    assert_eq!(pending["priceId"], "cedros-individual");
    assert_eq!(pending["status"], "incomplete");
    assert_eq!(s.event_count(ids::EVENT_ENTITLEMENT_CHANGED), 0);

    assert_eq!(
        invoke(
            &s,
            stripe_request(&s, &subscription_lifecycle(
                    "evt_created",
                    "customer.subscription.created",
                    "sub_checkout",
                    "trialing",
                    true,
                )),
        )
        .status,
        200
    );
    let active = s
        .get_entry(ids::MODEL_SUBSCRIPTIONS, "sub_checkout")
        .unwrap();
    assert_eq!(active["customerRef"], "user_1");
    assert_eq!(active["priceId"], "cedros-individual");
    assert_eq!(active["status"], "trialing");
    assert_eq!(active["currentPeriodEnd"], time::iso8601(1_900_000_000));
    assert_eq!(s.event_count(ids::EVENT_SUBSCRIPTION_STARTED), 1);
    assert_eq!(s.event_count(ids::EVENT_ENTITLEMENT_CHANGED), 1);
    assert_eq!(s.crm_events.borrow().len(), 1);
    assert_eq!(s.crm_events.borrow()[0].3["cedrosLoginUserId"], "user_1");
}

#[test]
fn unknown_subscription_without_pay_trusted_identity_never_grants_access() {
    let s = seams();

    for (event_id, body) in [
        (
            "evt_untrusted_checkout",
            subscription_checkout("evt_untrusted_checkout", "cs_u", "sub_u", false),
        ),
        (
            "evt_untrusted_created",
            subscription_lifecycle(
                "evt_untrusted_created",
                "customer.subscription.created",
                "sub_u",
                "active",
                false,
            ),
        ),
    ] {
        assert_eq!(
            invoke(&s, stripe_request(&s, &body)).status,
            200,
            "{event_id}"
        );
    }

    assert!(s.get_entry(ids::MODEL_SUBSCRIPTIONS, "sub_u").is_none());
    assert_eq!(s.event_count(ids::EVENT_SUBSCRIPTION_STARTED), 0);
    assert_eq!(s.event_count(ids::EVENT_ENTITLEMENT_CHANGED), 0);
    assert!(s.crm_events.borrow().is_empty());
}

#[test]
fn late_checkout_session_cannot_regress_an_active_subscription() {
    let s = seams();
    let lifecycle = subscription_lifecycle(
        "evt_first",
        "customer.subscription.created",
        "sub_ordered",
        "active",
        true,
    );
    let checkout = subscription_checkout("evt_late", "cs_late", "sub_ordered", true);

    assert_eq!(invoke(&s, stripe_request(&s, &lifecycle)).status, 200);
    assert_eq!(invoke(&s, stripe_request(&s, &checkout)).status, 200);
    assert_eq!(
        s.get_entry(ids::MODEL_SUBSCRIPTIONS, "sub_ordered")
            .unwrap()["status"],
        "active"
    );
    assert_eq!(s.event_count(ids::EVENT_SUBSCRIPTION_STARTED), 1);
    assert_eq!(s.event_count(ids::EVENT_ENTITLEMENT_CHANGED), 1);
}

#[test]
fn deletion_cancels_access_once_and_late_updates_cannot_reactivate_it() {
    let s = seams();
    seed_subscription(&s, "sub_cancel", "2030-03-17T17:46:40Z");
    let deleted = subscription_lifecycle(
        "evt_deleted",
        "customer.subscription.deleted",
        "sub_cancel",
        "active",
        false,
    );

    assert_eq!(invoke(&s, stripe_request(&s, &deleted)).status, 200);
    assert_eq!(
        s.get_entry(ids::MODEL_SUBSCRIPTIONS, "sub_cancel").unwrap()["status"],
        "canceled"
    );
    assert_eq!(s.event_count(ids::EVENT_SUBSCRIPTION_CANCELED), 1);
    assert_eq!(s.event_count(ids::EVENT_ENTITLEMENT_CHANGED), 1);

    let replay = invoke(&s, stripe_request(&s, &deleted));
    assert_eq!(replay.status, 200);
    assert_eq!(
        serde_json::from_str::<Value>(&replay.body).unwrap()["duplicate"],
        true
    );
    let late = subscription_lifecycle(
        "evt_late_active",
        "customer.subscription.updated",
        "sub_cancel",
        "active",
        false,
    );
    assert_eq!(invoke(&s, stripe_request(&s, &late)).status, 200);
    assert_eq!(
        s.get_entry(ids::MODEL_SUBSCRIPTIONS, "sub_cancel").unwrap()["status"],
        "canceled"
    );
    assert_eq!(s.event_count(ids::EVENT_SUBSCRIPTION_CANCELED), 1);
    assert_eq!(s.event_count(ids::EVENT_ENTITLEMENT_CHANGED), 1);
}

#[test]
fn stale_subscription_update_cannot_restore_access() {
    let s = seams();
    seed_subscription(&s, "sub_ordered", "2030-03-17T17:46:40Z");

    let past_due = subscription_lifecycle_at(
        "evt_newer_past_due",
        "customer.subscription.updated",
        "sub_ordered",
        "past_due",
        false,
        2_000,
    );
    assert_eq!(invoke(&s, stripe_request(&s, &past_due)).status, 200);
    assert_eq!(
        s.get_entry(ids::MODEL_SUBSCRIPTIONS, "sub_ordered")
            .unwrap()["status"],
        "past_due"
    );

    let stale_active = subscription_lifecycle_at(
        "evt_older_active",
        "customer.subscription.updated",
        "sub_ordered",
        "active",
        false,
        1_000,
    );
    assert_eq!(invoke(&s, stripe_request(&s, &stale_active)).status, 200);
    let after_stale = s
        .get_entry(ids::MODEL_SUBSCRIPTIONS, "sub_ordered")
        .unwrap();
    assert_eq!(after_stale["status"], "past_due");
    assert_eq!(after_stale["lastProviderEventAt"], 2_000);
    assert_eq!(s.event_count(ids::EVENT_ENTITLEMENT_CHANGED), 1);

    let newer_active = subscription_lifecycle_at(
        "evt_newest_active",
        "customer.subscription.updated",
        "sub_ordered",
        "active",
        false,
        3_000,
    );
    assert_eq!(invoke(&s, stripe_request(&s, &newer_active)).status, 200);
    assert_eq!(
        s.get_entry(ids::MODEL_SUBSCRIPTIONS, "sub_ordered")
            .unwrap()["status"],
        "active"
    );
    assert_eq!(s.event_count(ids::EVENT_ENTITLEMENT_CHANGED), 2);
}

#[test]
fn provider_plan_change_updates_authoritative_entitlement_plan() {
    let s = seams();
    seed_subscription(&s, "sub_plan", "2030-03-17T17:46:40Z");
    let event = json!({
        "id": "evt_plan", "type": "customer.subscription.updated", "created": 2_000,
        "data": {"object": {
            "id": "sub_plan", "status": "active", "current_period_end": 1_900_000_000_i64,
            "cancel_at_period_end": false,
            "items": {"data": [{"price": {"id": "price_new"}}]}
        }}
    })
    .to_string();

    assert_eq!(
        invoke(&s, stripe_request(&s, &event)).status,
        200
    );
    assert_eq!(
        s.get_entry(ids::MODEL_SUBSCRIPTIONS, "sub_plan").unwrap()["priceId"],
        "price_new"
    );
    assert_eq!(s.event_count(ids::EVENT_ENTITLEMENT_CHANGED), 1);
    assert_eq!(s.event_count(ids::EVENT_SUBSCRIPTION_STARTED), 0);
}

#[test]
fn one_payment_intent_cannot_settle_two_ledger_payments() {
    let s = seams();
    seed_pending(&s, "ord_a", "pi_shared", 5000, "p1");
    seed_pending(&s, "ord_b", "pi_shared", 5000, "p1");

    assert_eq!(
        invoke(
            &s,
            stripe_request(&s, &pi_succeeded("evt_a", "ord_a", "pi_shared", 5000, "p1"))
        )
        .status,
        200
    );
    assert_eq!(
        invoke(
            &s,
            stripe_request(&s, &pi_succeeded("evt_b", "ord_b", "pi_shared", 5000, "p1"))
        )
        .status,
        409
    );
    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, "ord_a").unwrap()["status"],
        "succeeded"
    );
    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, "ord_b").unwrap()["status"],
        "pending"
    );
    assert_eq!(s.event_count(ids::EVENT_PAYMENT_SUCCEEDED), 1);
}

#[test]
fn legacy_settlement_without_identity_marker_blocks_a_second_payment() {
    let s = seams();
    seed_pending(&s, "ord_legacy", "pi_legacy", 5000, "p1");
    let mut legacy = s.get_entry(ids::MODEL_LEDGER, "ord_legacy").unwrap();
    legacy["status"] = json!("succeeded");
    s.seed(ids::MODEL_LEDGER, "ord_legacy", legacy);
    seed_pending(&s, "ord_second", "pi_legacy", 5000, "p1");

    assert_eq!(
        invoke(
            &s,
            stripe_request(&s, &pi_succeeded("evt_second", "ord_second", "pi_legacy", 5000, "p1"))
        )
        .status,
        409
    );
    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, "ord_second").unwrap()["status"],
        "pending"
    );
}

#[test]
fn older_refund_event_cannot_reduce_cumulative_refund() {
    let s = seams();
    seed_pending(&s, "ord_r", "pi_r", 5000, "p1");
    let mut newer: serde_json::Value =
        serde_json::from_str(&refund("evt_r_new", "re_new", 4000)).unwrap();
    newer["data"]["object"]["refunds"]["data"][0]["amount"] = json!(3000);
    let newer = newer.to_string();
    let older = refund("evt_r_old", "re_old", 1000);

    assert_eq!(invoke(&s, stripe_request(&s, &newer)).status, 200);
    assert_eq!(invoke(&s, stripe_request(&s, &older)).status, 200);
    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, "ord_r").unwrap()["refundCents"],
        4000
    );
}

fn invoice(event_id: &str, period_end: i64) -> String {
    json!({
        "id": event_id, "type": "invoice.paid",
        "data": {"object": {
            "id": format!("in_{event_id}"), "subscription": "sub_1", "customer":"cus_1",
            "billing_reason": "subscription_cycle", "period_end": period_end,
            "status": "paid", "paid": true, "paid_out_of_band": false, "amount_remaining": 0, "amount_paid": 0, "currency": "usd"
        }}
    })
    .to_string()
}

fn refund(event_id: &str, refund_id: &str, total: i64) -> String {
    json!({
        "id": event_id, "type": "charge.refunded",
        "data": {"object": {
            "id": "ch_1", "payment_intent": "pi_r", "amount_refunded": total,
            "currency": "usd", "metadata": {"reference": "ord_r"},
            "refunds": {"data": [{"id": refund_id, "amount": total, "status": "succeeded"}]}
        }}
    })
    .to_string()
}

fn subscription_checkout(
    event_id: &str,
    session_id: &str,
    subscription_id: &str,
    trusted: bool,
) -> String {
    json!({
        "id": event_id, "type": "checkout.session.completed",
        "data": {"object": {
            "id": session_id, "mode": "subscription", "subscription": subscription_id,
            "metadata": {
                "user_id": "user_1", "user_id_trusted": trusted.to_string(),
                "plan_id": "cedros-individual"
            }
        }}
    })
    .to_string()
}

fn subscription_lifecycle(
    event_id: &str,
    event_type: &str,
    subscription_id: &str,
    status: &str,
    trusted: bool,
) -> String {
    subscription_lifecycle_at(
        event_id,
        event_type,
        subscription_id,
        status,
        trusted,
        1_000,
    )
}

fn subscription_lifecycle_at(
    event_id: &str,
    event_type: &str,
    subscription_id: &str,
    status: &str,
    trusted: bool,
    event_created: i64,
) -> String {
    json!({
        "id": event_id, "type": event_type, "created": event_created,
        "data": {"object": {
            "id": subscription_id, "status": status,
            "current_period_end": 1_900_000_000_i64,
            "cancel_at_period_end": false,
            "metadata": {
                "user_id": "user_1", "user_id_trusted": trusted.to_string(),
                "plan_id": "cedros-individual"
            }
        }}
    })
    .to_string()
}

#[test]
fn first_delivery_of_old_paid_invoice_never_restores_failed_renewal_access() {
    let s = seams();
    seed_subscription(&s, "sub_1", "2026-06-01T00:00:00Z");
    let mut current = s.get_entry(ids::MODEL_SUBSCRIPTIONS, "sub_1").unwrap();
    current["status"] = json!("past_due");
    current["lastProviderEventAt"] = json!(2000);
    s.seed(ids::MODEL_SUBSCRIPTIONS, "sub_1", current.clone());
    let mut event: Value =
        serde_json::from_str(&invoice("evt_late_invoice", 1_900_000_000)).unwrap();
    event["created"] = json!(1000);
    event["data"]["object"]["amount_paid"] = json!(2900);
    event["data"]["object"]["payment_intent"] = json!("pi_late_invoice");
    queue_invoice_payment(&s, "pi_late_invoice", 2900, Some("cus_1"));
    assert_eq!(
        invoke(&s, stripe_request(&s, &event.to_string())).status,
        200
    );
    assert_eq!(
        s.get_entry(ids::MODEL_SUBSCRIPTIONS, "sub_1").unwrap(),
        current
    );
    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, "in_evt_late_invoice")
            .unwrap()["grossCents"],
        2900
    );
    assert_eq!(s.event_count(ids::EVENT_ENTITLEMENT_CHANGED), 0);
}

#[test]
fn invoice_cannot_count_underpaid_or_unsettled_intent_as_revenue() {
    for payment in [
        json!({"id":"pi_invoice", "status":"succeeded", "amount":2900, "amount_received":1, "currency":"usd"}),
        json!({"id":"pi_invoice", "status":"processing", "amount":2900, "amount_received":2900, "currency":"usd"}),
        json!({"id":"pi_invoice", "status":"succeeded", "amount":2900, "amount_received":2900, "currency":"eur"}),
    ] {
        let s = seams();
        seed_subscription(&s, "sub_1", "2026-06-01T00:00:00Z");
        s.set_secret(ids::SECRET_STRIPE_KEY, "sk_test_invoice");
        s.push_http_response(200, &payment.to_string());
        let mut event: Value =
            serde_json::from_str(&invoice("evt_unsettled", 1_900_000_000)).unwrap();
        event["data"]["object"]["amount_paid"] = json!(2900);
        event["data"]["object"]["payment_intent"] = json!("pi_invoice");
        assert_eq!(
            invoke(&s, stripe_request(&s, &event.to_string())).status,
            409
        );
        assert_eq!(s.entry_count(ids::MODEL_LEDGER), 0);
        assert_eq!(s.event_count(ids::EVENT_PAYMENT_SUCCEEDED), 0);
        assert!(s
            .get_entry(ids::MODEL_WEBHOOK_OUTBOX, "evt:evt_unsettled")
            .is_none());
    }
}

#[test]
fn authoritative_lifecycle_shortens_period_and_invalidates_entitlements() {
    let s = seams();
    seed_subscription(&s, "sub_1", "2030-01-01T00:00:00Z");
    let event = subscription_lifecycle(
        "evt_shorter",
        "customer.subscription.updated",
        "sub_1",
        "active",
        true,
    );
    assert_eq!(
        invoke(&s, stripe_request(&s, &event)).status,
        200
    );
    assert_eq!(
        s.get_entry(ids::MODEL_SUBSCRIPTIONS, "sub_1").unwrap()["currentPeriodEnd"],
        time::iso8601(1_900_000_000)
    );
    assert_eq!(s.event_count(ids::EVENT_ENTITLEMENT_CHANGED), 1);
}

#[test]
fn lifecycle_preserves_cedros_ownership_and_claim_evidence() {
    let s = seams();
    seed_subscription(&s, "sub_1", "2026-06-01T00:00:00Z");
    let mut old = s.get_entry(ids::MODEL_SUBSCRIPTIONS, "sub_1").unwrap();
    old["userId"] = json!("cedros-user");
    old["subscriptionClaim"] = json!({"fingerprint":"claim"});
    s.seed(ids::MODEL_SUBSCRIPTIONS, "sub_1", old);
    let mut event: Value = serde_json::from_str(&subscription_lifecycle(
        "evt_owner",
        "customer.subscription.updated",
        "sub_1",
        "active",
        true,
    ))
    .unwrap();
    event["data"]["object"]["customer"] = json!("cus_1");
    assert_eq!(
        invoke(&s, stripe_request(&s, &event.to_string())).status,
        200
    );
    let stored = s.get_entry(ids::MODEL_SUBSCRIPTIONS, "sub_1").unwrap();
    assert_eq!(stored["userId"], "cedros-user");
    assert_eq!(stored["stripeCustomerId"], "cus_1");
    assert_eq!(stored["subscriptionClaim"]["fingerprint"], "claim");
}

#[test]
fn modern_invoice_verifies_single_allocation_and_rejects_partial_lists() {
    for malformed in [false, true] {
        let s = seams();
        seed_subscription(&s, "sub_1", "2026-06-01T00:00:00Z");
        let event = json!({"id":"evt_modern", "type":"invoice.paid", "data":{"object":{
            "id":"in_modern", "parent":{"subscription_details":{"subscription":"sub_1"}},
            "status":"paid", "amount_remaining":0, "amount_paid":2900, "currency":"usd",
            "customer":"cus_1", "payments":{"has_more":malformed, "data":[{
                "invoice":"in_modern", "status":"paid", "amount_paid":2900, "currency":"usd",
                "payment":{"type":"payment_intent", "payment_intent":"pi_modern"}
            }]}
        }}});
        queue_invoice_payment(&s, "pi_modern", 2900, Some("cus_1"));
        let response = invoke(&s, stripe_request(&s, &event.to_string()));
        assert_eq!(response.status, if malformed { 403 } else { 200 });
        assert_eq!(
            s.entry_count(ids::MODEL_LEDGER),
            if malformed { 0 } else { 1 }
        );
        assert_eq!(
            s.event_count(ids::EVENT_PAYMENT_SUCCEEDED),
            if malformed { 0 } else { 1 }
        );
    }
}

#[test]
fn equal_timestamp_cannot_replay_different_entitlement_terms() {
    let s = seams();
    seed_subscription(&s, "sub_1", "2026-06-01T00:00:00Z");
    let mut old = s.get_entry(ids::MODEL_SUBSCRIPTIONS, "sub_1").unwrap();
    old["lastProviderEventAt"] = json!(1000);
    s.seed(ids::MODEL_SUBSCRIPTIONS, "sub_1", old.clone());
    let event = subscription_lifecycle(
        "evt_tied",
        "customer.subscription.updated",
        "sub_1",
        "active",
        true,
    );
    assert_eq!(
        invoke(&s, stripe_request(&s, &event)).status,
        200
    );
    assert_eq!(s.get_entry(ids::MODEL_SUBSCRIPTIONS, "sub_1").unwrap(), old);
}

#[test]
fn pay_owned_invoice_arriving_before_subscription_is_retried_not_discarded() {
    let s = seams();
    let mut event: Value =
        serde_json::from_str(&invoice("evt_before_subscription", 1_900_000_000)).unwrap();
    event["data"]["object"]["subscription_details"] =
        json!({"metadata":{"user_id_trusted":"true"}});
    let request = stripe_request(&s, &event.to_string());
    assert_eq!(invoke(&s, request.clone()).status, 409);
    assert!(s
        .get_entry(ids::MODEL_WEBHOOK_OUTBOX, "evt:evt_before_subscription")
        .is_none());
    seed_subscription(&s, "sub_1", "2026-06-01T00:00:00Z");
    assert_eq!(invoke(&s, request).status, 200);
}
