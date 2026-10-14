use serde_json::json;

use super::*;
use crate::fake::FakeSeams;

fn seed_payment(seams: &FakeSeams) {
    seams.seed(
        ids::MODEL_LEDGER,
        "credit_pay",
        json!({
            "reference": "credit_pay", "kind": "payment", "status": "succeeded",
            "grossCents": 500, "refundCents": 0, "currency": "USD",
            "customerProfileId": "user_credit", "productId": "prod_credit",
            "provider": "credits", "providerRef": "credit_pay",
            "createdAt": "2026-01-01T00:00:00Z", "processedAt": "2026-01-01T00:00:00Z"
        }),
    );
}

fn request() -> RouteRequest {
    RouteRequest {
        route_id: ids::ROUTE_ADMIN_CREDIT_REFUNDS_PROCESS.into(),
        method: "POST".into(),
        path: "/admin/credits/refund-requests/credit_pay/process".into(),
        context_json: json!({
            "authenticated": true, "permissionClaims": [ids::ROUTE_ADMIN],
            "csrfVerified": true
        })
        .to_string(),
        ..Default::default()
    }
}

fn context() -> RequestContext {
    RequestContext::parse(&request().context_json)
}

#[test]
fn payment_race_conflicts_without_balance_or_partial_refund_rows() {
    let seams = FakeSeams::new();
    seed_payment(&seams);
    let unchanged = seams.get_entry(ids::MODEL_LEDGER, "credit_pay").unwrap();
    seams.queue_guarded_race(vec![(ids::MODEL_LEDGER, "credit_pay", unchanged)]);

    assert_eq!(
        process(&seams, &request(), &context()).unwrap_err().status,
        409
    );
    assert!(seams
        .get_entry(ids::MODEL_LEDGER, "credits-refund:credit_pay")
        .is_none());
    assert!(seams
        .get_entry(ids::MODEL_CREDITS, "acct:user_credit")
        .is_none());
    assert!(seams.events.borrow().is_empty());
}

#[test]
fn exact_replay_does_not_double_credit_or_reemit_effects() {
    let seams = FakeSeams::new();
    seed_payment(&seams);
    let first = process(&seams, &request(), &context()).unwrap();
    let event_count = seams.events.borrow().len();
    let second = process(&seams, &request(), &context()).unwrap();

    assert_eq!(
        seams.get_entry(ids::MODEL_LEDGER, "credit_pay").unwrap()["processedAt"],
        "2026-01-01T00:00:00Z"
    );
    assert_eq!(first.status, 200);
    assert_eq!(second.status, 200);
    assert_eq!(
        seams
            .get_entry(ids::MODEL_CREDITS, "acct:user_credit")
            .unwrap()["balanceCents"],
        500
    );
    assert_eq!(seams.events.borrow().len(), event_count);
    assert_eq!(
        seams.entry_count(ids::MODEL_CREDITS),
        2,
        "one account plus one immutable transaction"
    );
}

#[test]
fn refund_replay_requires_matching_cashflow_before_any_credit_or_effect() {
    for stored_refund in [
        None,
        Some(json!({
            "reference":"credits-refund:credit_pay", "kind":"refund", "status":"succeeded",
            "grossCents":499, "refundCents":0, "currency":"USD", "provider":"credits",
            "customerProfileId":"user_credit", "createdAt":"2026-01-01T00:00:00Z",
            "processedAt":"2026-01-02T00:00:00Z"
        })),
    ] {
        let seams = FakeSeams::new();
        seed_payment(&seams);
        let mut payment = seams.get_entry(ids::MODEL_LEDGER, "credit_pay").unwrap();
        payment["status"] = json!("refunded");
        payment["refundCents"] = json!(500);
        seams.seed(ids::MODEL_LEDGER, "credit_pay", payment);
        if let Some(refund) = stored_refund {
            seams.seed(ids::MODEL_LEDGER, "credits-refund:credit_pay", refund);
        }
        assert_eq!(
            process(&seams, &request(), &context()).unwrap_err().status,
            409
        );
        assert_eq!(seams.entry_count(ids::MODEL_CREDITS), 0);
        assert!(seams.events.borrow().is_empty());
    }
}
