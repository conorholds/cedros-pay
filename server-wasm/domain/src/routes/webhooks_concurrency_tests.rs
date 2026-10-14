//! Deterministic concurrent Stripe identity winner/loser behavior.

use serde_json::{json, Value};

use super::webhook_commit;
use super::webhooks_test_support::*;
use crate::ids;
use crate::seams::HostSeams;
use crate::time;

#[test]
fn concurrent_legacy_winner_is_acked_without_blindly_replaying_effects() {
    let s = seams();
    seed_pending(&s, "ord_race", "pi_race", 5000, "p1");
    let now = s.now_unix_secs();
    let body = pi_succeeded("evt_race", "ord_race", "pi_race", 5000, "p1");
    let request = stripe_request(&s, &body);
    let event: Value = s.stripe_event("evt_race").unwrap();
    let fingerprint = webhook_commit::fingerprint(&event).unwrap();
    queue_competing_commit(&s, &fingerprint, now);

    let response = invoke(&s, request);

    assert_eq!(response.status, 200);
    assert_eq!(
        serde_json::from_str::<Value>(&response.body).unwrap()["duplicate"],
        true
    );
    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, "ord_race").unwrap()["status"],
        "succeeded"
    );
    assert!(s.events.borrow().is_empty());
    assert!(s.crm_events.borrow().is_empty());
    assert!(s.tags.borrow().is_empty());
}

#[test]
fn replay_restores_the_exact_effect_snapshot_when_its_outbox_row_is_missing() {
    let s = seams();
    seed_pending(&s, "ord_restore", "pi_restore", 5000, "p1");
    let body = pi_succeeded("evt_restore", "ord_restore", "pi_restore", 5000, "p1");
    let request = stripe_request(&s, &body);

    assert_eq!(invoke(&s, request.clone()).status, 200);
    let marker = s
        .get_entry(ids::MODEL_WEBHOOK_OUTBOX, "evt:evt_restore")
        .unwrap();
    let effect_id = marker["effectId"].as_str().unwrap().to_string();
    assert!(marker["effectRecord"].is_object());
    let original_ids = s
        .events
        .borrow()
        .iter()
        .map(|(event_id, _, payload)| {
            (
                event_id.clone(),
                payload["idempotency_key"].as_str().unwrap().to_string(),
            )
        })
        .collect::<Vec<_>>();

    s.db_delete(ids::DB_ACCESS, ids::MODEL_WEBHOOK_OUTBOX, &effect_id)
        .unwrap();
    s.events.borrow_mut().clear();
    s.crm_events.borrow_mut().clear();
    s.tags.borrow_mut().clear();

    let response = invoke(&s, request);

    assert_eq!(response.status, 200);
    assert_eq!(
        serde_json::from_str::<Value>(&response.body).unwrap()["duplicate"],
        true
    );
    assert_eq!(
        s.events
            .borrow()
            .iter()
            .map(|(event_id, _, payload)| {
                (
                    event_id.clone(),
                    payload["idempotency_key"].as_str().unwrap().to_string(),
                )
            })
            .collect::<Vec<_>>(),
        original_ids
    );
    assert_eq!(
        s.get_entry(ids::MODEL_WEBHOOK_OUTBOX, &effect_id).unwrap()["status"],
        "domain_effect_delivered"
    );
}

#[test]
fn concurrent_mismatched_winner_fails_conflict_without_loser_effects() {
    let s = seams();
    seed_pending(&s, "ord_race", "pi_race", 5000, "p1");
    let now = s.now_unix_secs();
    let body = pi_succeeded("evt_race", "ord_race", "pi_race", 5000, "p1");
    queue_competing_commit(&s, "different-canonical-fingerprint", now);

    let response = invoke(&s, stripe_request(&s, &body));

    assert_eq!(response.status, 409);
    assert!(s.events.borrow().is_empty());
    assert!(s.crm_events.borrow().is_empty());
    assert!(s.tags.borrow().is_empty());
}

#[test]
fn projection_race_rolls_back_event_identity_and_all_side_effects() {
    let s = seams();
    seed_pending(&s, "ord_race", "pi_race", 5000, "p1");
    let now = s.now_unix_secs();
    let body = pi_succeeded("evt_state_race", "ord_race", "pi_race", 5000, "p1");
    s.queue_guarded_race(vec![(
        ids::MODEL_LEDGER,
        "ord_race",
        json!({
            "reference": "ord_race", "kind": "payment", "status": "pending",
            "grossCents": 5000, "refundCents": 0, "currency": "USD",
            "customerProfileId": "p1", "productId": "prod_1", "provider": "stripe",
            "providerRef": "pi_race", "createdAt": "2026-05-31T00:00:00Z",
            "processedAt": time::iso8601(now)
        }),
    )]);

    let response = invoke(&s, stripe_request(&s, &body));

    assert_eq!(response.status, 409);
    assert!(s
        .get_entry(ids::MODEL_WEBHOOK_OUTBOX, "evt:evt_state_race")
        .is_none());
    assert!(s.events.borrow().is_empty());
    assert!(s.crm_events.borrow().is_empty());
    assert!(s.tags.borrow().is_empty());
}

fn queue_competing_commit(seams: &crate::fake::FakeSeams, fingerprint: &str, now: i64) {
    seams.queue_guarded_race(vec![
        (
            ids::MODEL_LEDGER,
            "ord_race",
            json!({
                "reference": "ord_race", "kind": "payment", "status": "succeeded",
                "grossCents": 5000, "refundCents": 0, "currency": "USD",
                "customerProfileId": "p1", "productId": "prod_1", "provider": "stripe",
                "providerRef": "pi_race", "createdAt": "2026-05-31T00:00:00Z",
                "processedAt": time::iso8601(now)
            }),
        ),
        (
            ids::MODEL_WEBHOOK_OUTBOX,
            "evt:evt_race",
            json!({
                "eventId": "evt_race", "processedAt": time::iso8601(now),
                "fingerprint": fingerprint
            }),
        ),
    ]);
}
