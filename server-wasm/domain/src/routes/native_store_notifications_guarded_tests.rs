//! Guarded notification identity, ordering, and side-effect regressions.

use super::*;
use crate::fake::FakeSeams;
use serde_json::json;

fn active_subscription(seams: &FakeSeams) {
    seams.seed(
        ids::MODEL_SUBSCRIPTIONS,
        "sub-1",
        json!({
        "subscriptionId": "sub-1", "customerRef": "user-1", "priceId": "pro",
        "status": "active", "provider": APPLE_PROVIDER, "providerRef": "original-1",
        "currentPeriodEnd": "2030-01-01T00:00:00Z", "cancelAtPeriodEnd": false,
        "createdAt": "2026-01-01T00:00:00Z", "updatedAt": "2026-01-01T00:00:00Z" }),
    );
}

fn transaction(expires_ms: Option<i64>) -> NotifTx {
    NotifTx {
        transaction_id: Some("tx-1".into()),
        original_transaction_id: Some("sub-1".into()),
        expires_date: expires_ms,
        bundle_id: Some("app.one".into()),
        environment: Some("Production".into()),
    }
}

#[test]
fn duplicate_notification_claim_emits_no_duplicate_side_effect() {
    let seams = FakeSeams::new();
    active_subscription(&seams);
    let tx = transaction(Some(1_950_000_000_000));
    apply_apple_notification_at(&seams, "apple:event-1", 2_000, "DID_RENEW", &tx).unwrap();
    apply_apple_notification_at(&seams, "apple:event-1", 2_000, "DID_RENEW", &tx).unwrap();
    let stored = seams.get_entry(ids::MODEL_SUBSCRIPTIONS, "sub-1").unwrap();
    assert_eq!(
        stored["nativeStoreNotificationState"]["recentIds"],
        json!(["apple:event-1"])
    );
    assert_eq!(seams.entry_count(ids::MODEL_WEBHOOK_OUTBOX), 2);
    assert_eq!(seams.event_count(ids::EVENT_ENTITLEMENT_CHANGED), 1);
}

#[test]
fn same_notification_identity_with_changed_provider_facts_conflicts() {
    let seams = FakeSeams::new();
    active_subscription(&seams);
    apply_apple_notification_at(
        &seams,
        "apple:event-conflict",
        2_000,
        "DID_RENEW",
        &transaction(Some(1_950_000_000_000)),
    )
    .unwrap();
    let error = apply_apple_notification_at(
        &seams,
        "apple:event-conflict",
        2_000,
        "DID_RENEW",
        &transaction(Some(2_000_000_000_000)),
    )
    .unwrap_err();
    assert_eq!(error.status, 409);
    assert_eq!(seams.event_count(ids::EVENT_ENTITLEMENT_CHANGED), 1);
}

#[test]
fn stale_cancel_cannot_shorten_newer_state_and_terminal_state_cannot_reactivate() {
    let seams = FakeSeams::new();
    active_subscription(&seams);
    apply_apple_notification_at(
        &seams,
        "apple:renew",
        2_000,
        "DID_RENEW",
        &transaction(Some(1_950_000_000_000)),
    )
    .unwrap();
    apply_apple_notification_at(
        &seams,
        "apple:stale-expiry",
        1_000,
        "EXPIRED",
        &transaction(None),
    )
    .unwrap();
    assert_eq!(
        seams.get_entry(ids::MODEL_SUBSCRIPTIONS, "sub-1").unwrap()["status"],
        "active"
    );
    apply_apple_notification_at(&seams, "apple:revoke", 3_000, "REVOKE", &transaction(None))
        .unwrap();
    apply_apple_notification_at(
        &seams,
        "apple:late-renew",
        4_000,
        "DID_RENEW",
        &transaction(Some(2_000_000_000_000)),
    )
    .unwrap();
    assert_eq!(
        seams.get_entry(ids::MODEL_SUBSCRIPTIONS, "sub-1").unwrap()["status"],
        "canceled"
    );
    assert_eq!(seams.event_count(ids::EVENT_ENTITLEMENT_CHANGED), 2);
}

#[test]
fn refund_updates_ledger_and_subscription_atomically_and_replays_safely() {
    let seams = FakeSeams::new();
    active_subscription(&seams);
    seams.seed(
        ids::MODEL_LEDGER,
        "apple-tx:tx-1",
        json!({
        "reference": "apple-tx:tx-1", "kind": "payment", "status": "succeeded",
        "grossCents": 700, "refundCents": 0, "currency": "usd", "customerProfileId": "user-1",
        "productId": "pro", "provider": APPLE_PROVIDER, "providerRef": "tx-1",
        "createdAt": "2026-01-01T00:00:00Z", "processedAt": "2026-01-01T00:00:00Z" }),
    );
    let tx = transaction(None);
    apply_apple_notification_at(&seams, "apple:refund", 2_000, "REFUND", &tx).unwrap();
    apply_apple_notification_at(&seams, "apple:refund", 2_000, "REFUND", &tx).unwrap();
    assert_eq!(
        seams.get_entry(ids::MODEL_SUBSCRIPTIONS, "sub-1").unwrap()["status"],
        "canceled"
    );
    let ledger = seams.get_entry(ids::MODEL_LEDGER, "apple-tx:tx-1").unwrap();
    assert_eq!(
        (ledger["status"].as_str(), ledger["refundCents"].as_i64()),
        (Some("refunded"), Some(700))
    );
    assert_eq!(seams.event_count(ids::EVENT_ENTITLEMENT_CHANGED), 2);
}

#[test]
fn racing_terminal_projection_fences_renewal_and_emits_nothing() {
    let seams = FakeSeams::new();
    active_subscription(&seams);
    let mut canceled = seams.get_entry(ids::MODEL_SUBSCRIPTIONS, "sub-1").unwrap();
    canceled["status"] = json!("canceled");
    seams.queue_guarded_race(vec![(ids::MODEL_SUBSCRIPTIONS, "sub-1", canceled)]);

    apply_apple_notification_at(
        &seams,
        "apple:racing-renewal",
        2_000,
        "DID_RENEW",
        &transaction(Some(1_950_000_000_000)),
    )
    .unwrap();

    let stored = seams.get_entry(ids::MODEL_SUBSCRIPTIONS, "sub-1").unwrap();
    assert_eq!(stored["status"], "canceled");
    let marker = seams
        .get_entry(
            ids::MODEL_WEBHOOK_OUTBOX,
            &notification_identity::notification_marker_key("apple:racing-renewal"),
        )
        .unwrap();
    assert_eq!(marker["status"], "applied");
    assert_eq!(marker["targets"]["subscription"], "applied");
    assert_eq!(seams.event_count(ids::EVENT_ENTITLEMENT_CHANGED), 0);
}

#[test]
fn cumulative_native_refunds_record_only_the_delta_and_reject_invalid_totals() {
    let seams = FakeSeams::new();
    seams.seed(
        ids::MODEL_LEDGER,
        "google-play:purchase",
        json!({
            "reference":"google-play:purchase", "kind":"payment", "status":"succeeded",
            "grossCents":1000, "refundCents":0, "currency":"USD", "provider":GOOGLE_PROVIDER,
            "createdAt":"2026-01-01T00:00:00Z", "processedAt":"2026-01-01T00:00:00Z"
        }),
    );
    let notification = |id: &str, amount| NativeNotification {
        id: id.into(),
        event_time_ms: 2000,
        provider: GOOGLE_PROVIDER,
        subscription_id: None,
        provider_refs: vec![],
        subscription_action: None,
        ledger_ref: Some("google-play:purchase".into()),
        ledger_refund: Some(LedgerRefund::Cumulative {
            amount_cents: amount,
            currency: "USD".into(),
        }),
    };
    apply_notification(&seams, notification("first", 300)).unwrap();
    apply_notification(&seams, notification("second", 700)).unwrap();
    apply_notification(&seams, notification("second", 700)).unwrap();
    let refunds = crate::db::Db::new(&seams, ids::DB_ACCESS)
        .read(
            ids::MODEL_LEDGER,
            &crate::db::Query::new().filter(crate::db::Filter::new(
                "kind",
                crate::db::Op::Eq,
                "refund",
            )),
        )
        .unwrap();
    assert_eq!(refunds.len(), 2);
    assert_eq!(
        refunds
            .iter()
            .map(|r| r.payload["grossCents"].as_i64().unwrap())
            .sum::<i64>(),
        700
    );
    let before = seams
        .get_entry(ids::MODEL_LEDGER, "google-play:purchase")
        .unwrap();
    assert_eq!(before["processedAt"], "2026-01-01T00:00:00Z");
    assert_eq!(
        apply_notification(&seams, notification("invalid", 1200))
            .unwrap_err()
            .status,
        403
    );
    assert_eq!(
        seams
            .get_entry(ids::MODEL_LEDGER, "google-play:purchase")
            .unwrap(),
        before
    );
    assert_eq!(seams.entry_count(ids::MODEL_LEDGER), 3);
}
