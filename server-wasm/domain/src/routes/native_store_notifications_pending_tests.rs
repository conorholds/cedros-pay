//! Out-of-order notification convergence and durable target-progress tests.

use super::*;
use crate::fake::FakeSeams;
use serde_json::{json, Value};

fn tx(original: Option<&str>) -> NotifTx {
    NotifTx {
        transaction_id: Some("tx-late".into()),
        original_transaction_id: original.map(str::to_string),
        expires_date: None,
        bundle_id: Some("app.one".into()),
        environment: Some("Production".into()),
    }
}

fn seed_subscription(seams: &FakeSeams, provider: &str) {
    seams.seed(
        ids::MODEL_SUBSCRIPTIONS,
        "sub-late",
        json!({
            "subscriptionId": "sub-late", "customerRef": "user-1", "priceId": "pro",
            "status": "active", "provider": provider, "providerRef": "sub-late",
            "currentPeriodEnd": "2030-01-01T00:00:00Z", "cancelAtPeriodEnd": false,
            "createdAt": "2026-01-01T00:00:00Z", "updatedAt": "2026-01-01T00:00:00Z"
        }),
    );
}

fn seed_ledger(seams: &FakeSeams, provider: &str) {
    seams.seed(
        ids::MODEL_LEDGER,
        "apple-tx:tx-late",
        json!({
            "reference": "apple-tx:tx-late", "kind": "payment", "status": "succeeded",
            "grossCents": 700, "refundCents": 0, "currency": "usd",
            "customerProfileId": "user-1", "productId": "pro", "provider": provider,
            "providerRef": "tx-late", "createdAt": "2026-01-01T00:00:00Z",
            "processedAt": "2026-01-01T00:00:00Z"
        }),
    );
}

fn marker(seams: &FakeSeams, id: &str) -> Value {
    seams
        .get_entry(
            ids::MODEL_WEBHOOK_OUTBOX,
            &notification_identity::notification_marker_key(id),
        )
        .expect("notification marker")
}

#[test]
fn refund_before_receipt_stays_pending_then_replay_converges_both_targets() {
    let seams = FakeSeams::new();
    let event_id = "apple:refund-before-receipt";
    let notification = tx(Some("sub-late"));
    apply_apple_notification_at(&seams, event_id, 9_000, "REFUND", &notification).unwrap();
    let pending = marker(&seams, event_id);
    assert_eq!(pending["status"], "pending");
    assert_eq!(pending["targets"]["subscription"], "pending");
    assert_eq!(pending["targets"]["ledger"], "pending");
    assert_eq!(pending["eventTimeMillis"], 9_000);
    assert!(pending.get("processedAt").is_none());

    seed_subscription(&seams, APPLE_PROVIDER);
    seed_ledger(&seams, APPLE_PROVIDER);
    apply_apple_notification_at(&seams, event_id, 10_000, "REFUND", &notification).unwrap();
    assert_eq!(
        seams
            .get_entry(ids::MODEL_SUBSCRIPTIONS, "sub-late")
            .unwrap()["status"],
        "canceled"
    );
    assert_eq!(
        seams
            .get_entry(ids::MODEL_LEDGER, "apple-tx:tx-late")
            .unwrap()["status"],
        "refunded"
    );
    assert_eq!(marker(&seams, event_id)["status"], "applied");
    assert_eq!(seams.event_count(ids::EVENT_ENTITLEMENT_CHANGED), 2);
    apply_apple_notification_at(&seams, event_id, 2_000, "REFUND", &notification).unwrap();
    assert_eq!(seams.event_count(ids::EVENT_ENTITLEMENT_CHANGED), 2);
}

#[test]
fn cancellation_before_subscription_remains_pending_then_becomes_terminal() {
    let seams = FakeSeams::new();
    let event_id = "apple:cancel-before-subscription";
    let notification = tx(Some("sub-late"));
    apply_apple_notification_at(&seams, event_id, 3_000, "EXPIRED", &notification).unwrap();
    assert_eq!(marker(&seams, event_id)["status"], "pending");
    seed_subscription(&seams, APPLE_PROVIDER);
    apply_apple_notification_at(&seams, event_id, 3_000, "EXPIRED", &notification).unwrap();
    assert_eq!(
        seams
            .get_entry(ids::MODEL_SUBSCRIPTIONS, "sub-late")
            .unwrap()["status"],
        "canceled"
    );
    let complete = marker(&seams, event_id);
    assert_eq!(complete["status"], "applied");
    assert_eq!(complete["targets"]["ledger"], "not_required");
}

#[test]
fn partial_subscription_apply_waits_for_ledger_without_repeating_effect() {
    let seams = FakeSeams::new();
    let event_id = "apple:partial-refund";
    let notification = tx(Some("sub-late"));
    seed_subscription(&seams, APPLE_PROVIDER);
    apply_apple_notification_at(&seams, event_id, 4_000, "REFUND", &notification).unwrap();
    let partial = marker(&seams, event_id);
    assert_eq!(partial["targets"]["subscription"], "applied");
    assert_eq!(partial["targets"]["ledger"], "pending");
    assert_eq!(seams.event_count(ids::EVENT_ENTITLEMENT_CHANGED), 1);

    seed_ledger(&seams, APPLE_PROVIDER);
    apply_apple_notification_at(&seams, event_id, 4_000, "REFUND", &notification).unwrap();
    assert_eq!(marker(&seams, event_id)["status"], "applied");
    assert_eq!(seams.event_count(ids::EVENT_ENTITLEMENT_CHANGED), 2);
    apply_apple_notification_at(&seams, event_id, 4_000, "REFUND", &notification).unwrap();
    assert_eq!(seams.event_count(ids::EVENT_ENTITLEMENT_CHANGED), 2);
}

#[test]
fn occupied_other_provider_targets_complete_as_explicitly_irrelevant() {
    let seams = FakeSeams::new();
    let event_id = "apple:irrelevant-provider";
    let notification = tx(Some("sub-late"));
    seed_subscription(&seams, "stripe");
    seed_ledger(&seams, "stripe");
    apply_apple_notification_at(&seams, event_id, 5_000, "REFUND", &notification).unwrap();
    let complete = marker(&seams, event_id);
    assert_eq!(complete["status"], "applied");
    assert_eq!(complete["targets"]["subscription"], "irrelevant");
    assert_eq!(complete["targets"]["ledger"], "irrelevant");
    assert_eq!(seams.event_count(ids::EVENT_ENTITLEMENT_CHANGED), 0);
}
