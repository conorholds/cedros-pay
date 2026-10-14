use super::*;
use crate::fake::FakeSeams;

fn setup(session: bool) -> (FakeSeams, Value, &'static str) {
    let seams = FakeSeams::new();
    seams.set_secret(ids::SECRET_STRIPE_KEY, "sk_test_redacted");
    let reference = if session {
        "cs_recovery"
    } else {
        "pay-recovery"
    };
    let provider = if session { reference } else { "pi_recovery" };
    seams.seed(ids::MODEL_LEDGER, reference, json!({
        "reference":reference, "kind":"payment", "provider":"stripe", "providerRef":provider,
        "status":"pending", "grossCents":1500, "currency":"USD", "createdAt":"2026-01-01T00:00:00Z", "processedAt":"2026-01-01T00:00:00Z"
    }));
    let object = if session {
        json!({
            "id":reference, "object":"checkout.session", "livemode":false,
            "mode":"payment", "status":"complete", "payment_status":"paid", "payment_intent":"pi_recovery",
            "amount_total":1500, "currency":"usd", "metadata":{}
        })
    } else {
        json!({
            "id":provider, "object":"payment_intent", "livemode":false, "status":"succeeded",
            "amount":1500, "amount_received":1500, "currency":"usd", "metadata":{"reference":reference}
        })
    };
    (seams, object, reference)
}

#[test]
fn missed_webhook_recovery_survives_crash_after_provider_read_and_never_recreates_payment() {
    for session in [false, true] {
        let (seams, object, reference) = setup(session);
        seams.push_http_response(200, &object.to_string());
        seams.fail_guarded_commit_after_next_http();
        assert!(run(&seams, 1).is_err());
        assert_eq!(
            seams.get_entry(ids::MODEL_LEDGER, reference).unwrap()["status"],
            "pending"
        );
        assert_eq!(seams.event_count(ids::EVENT_PAYMENT_SUCCEEDED), 0);
        seams.push_http_response(200, &object.to_string());
        assert_eq!(run(&seams, 1).unwrap(), 1);
        assert_eq!(
            seams.get_entry(ids::MODEL_LEDGER, reference).unwrap()["status"],
            "succeeded"
        );
        crate::durable_effects::run(&seams, 100, &crate::work_budget::WorkBudget::new(&seams))
            .unwrap();
        assert_eq!(seams.event_count(ids::EVENT_PAYMENT_SUCCEEDED), 1);
        assert_eq!(run(&seams, 1).unwrap(), 0);
        // The real webhook after reconciliation converges through the same fences.
        let db = Db::new(&seams, ids::DB_ACCESS);
        let fingerprint = webhook_commit::fingerprint(&object).unwrap();
        if session {
            webhook_payments::session_completed(
                &seams,
                &db,
                "evt_late",
                &fingerprint,
                &object,
                seams.now_unix_secs(),
            )
            .unwrap();
        } else {
            webhook_payments::succeeded(
                &seams,
                &db,
                "evt_late",
                &fingerprint,
                &object,
                seams.now_unix_secs(),
            )
            .unwrap();
        }
        crate::durable_effects::run(&seams, 100, &crate::work_budget::WorkBudget::new(&seams))
            .unwrap();
        assert_eq!(seams.event_count(ids::EVENT_PAYMENT_SUCCEEDED), 1);
        assert!(seams
            .http_requests
            .borrow()
            .iter()
            .all(|request| request["method"] == "GET"));
    }
}

#[test]
fn uncertain_stale_or_wrong_provider_responses_cannot_fulfill() {
    for (field, value) in [
        ("payment_status", json!("unpaid")),
        ("status", json!("open")),
        ("livemode", json!(true)),
        ("id", json!("cs_other")),
    ] {
        let (seams, mut object, reference) = setup(true);
        object[field] = value;
        seams.push_http_response(200, &object.to_string());
        assert_eq!(run(&seams, 1).unwrap(), 0);
        assert_eq!(
            seams.get_entry(ids::MODEL_LEDGER, reference).unwrap()["status"],
            "pending"
        );
        assert_eq!(seams.event_count(ids::EVENT_PAYMENT_SUCCEEDED), 0);
    }
    let (seams, mut object, reference) = setup(false);
    object["amount_received"] = json!(1);
    seams.push_http_response(200, &object.to_string());
    assert!(run(&seams, 1).is_err());
    assert_eq!(
        seams.get_entry(ids::MODEL_LEDGER, reference).unwrap()["status"],
        "pending"
    );
}

#[test]
fn previously_failed_intent_recovers_without_a_second_payment() {
    let (seams, object, reference) = setup(false);
    let mut row = seams.get_entry(ids::MODEL_LEDGER, reference).unwrap();
    row["status"] = json!("failed");
    seams.seed(ids::MODEL_LEDGER, reference, row);
    seams.push_http_response(200, &object.to_string());
    assert_eq!(run(&seams, 1).unwrap(), 1);
    assert_eq!(seams.entry_count(ids::MODEL_LEDGER), 1);
}
