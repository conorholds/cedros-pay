use serde_json::{json, Value};

use super::settlement_effect_test_support::{effect_id, settle_credits, setup_credits};
use super::*;
use crate::auth::Buyer;
use crate::ctx::RequestContext;
use crate::reqresp::{JobExecution, RouteRequest};
use crate::seams::HostSeams;

fn entitlement_request(user_id: &str, product_ids: &[&str]) -> RouteRequest {
    RouteRequest {
        route_id: crate::ids::ROUTE_ENTITLEMENTS.into(),
        method: "POST".into(),
        path: "/entitlements/v1/check".into(),
        body: json!({
            "userId": user_id,
            "checks": product_ids.iter().map(|product_id| json!({
                "scope": "media_asset",
                "scopeId": format!("asset-{product_id}"),
                "productId": product_id,
            })).collect::<Vec<_>>(),
        })
        .to_string(),
        context_json: json!({
            "permissionClaims": [crate::ids::CAPABILITY_ENTITLEMENT_READ],
        })
        .to_string(),
        ..Default::default()
    }
}

fn settle_multi_product_credits(seams: &crate::fake::FakeSeams) -> String {
    seams.seed(
        crate::ids::MODEL_CATALOG,
        "product-2",
        json!({
            "id": "product-2", "active": true, "title": "Second product",
            "price": { "amountCents": 500, "currency": "USD" },
            "paymentResource": "product-2",
        }),
    );
    let context = RequestContext {
        site_id: Some("site-a".into()),
        environment: Some("production".into()),
        ..Default::default()
    };
    let buyer = Buyer {
        user_id: "buyer-1".into(),
        claims: Value::Null,
    };
    let facade = CanonicalCheckoutFacade::for_verified_buyer(seams, &context, &buyer).unwrap();
    let mut quote_body: Value = serde_json::from_str(&api_tests::quote_body(
        "multi-entitlement-quote",
        json!(["credits"]),
    ))
    .unwrap();
    quote_body["source"]["items"] = json!([
        { "resource": "product-1", "qty": 1 },
        { "resource": "product-2", "qty": 1 },
    ]);
    let quote = facade
        .quote("multi-entitlement-quote", &quote_body.to_string())
        .unwrap();
    match facade
        .checkout(
            "multi-entitlement-checkout",
            &api_tests::checkout_body("multi-entitlement-checkout", &quote.operation_id, "credits"),
        )
        .unwrap()
    {
        CanonicalPaymentOutcome::Paid { operation_id, .. } => operation_id,
        other => panic!("expected paid checkout, got {other:?}"),
    }
}

#[test]
fn credits_settlement_delivers_each_effect_once_and_marks_the_intent() {
    let seams = setup_credits();
    let operation_id = settle_credits(&seams, "once");
    let effect_id = effect_id(&seams, &operation_id);
    let raw = seams
        .get_entry(crate::ids::MODEL_WEBHOOK_OUTBOX, &effect_id)
        .unwrap();
    assert_eq!(raw["status"], "effect_pending");
    let serialized = raw.to_string();
    assert!(!serialized.contains("buyer@example.com"));
    assert!(!serialized.contains(&format!("checkout:{operation_id}")));
    assert_eq!(raw["providerReferenceSha256"].as_str().unwrap().len(), 64);

    let outcome = crate::jobs::delivery::run(
        &seams,
        &JobExecution {
            job_id: crate::ids::JOB_WEBHOOK_DELIVERY.into(),
            metadata_json: json!({ "batchSize": 20 }).to_string(),
            attempt: 1,
        },
    )
    .unwrap();
    let details: Value = serde_json::from_str(&outcome.details_json).unwrap();
    assert_eq!(details["settlementEffects"]["scanned"], 1);
    assert_eq!(details["settlementEffects"]["delivered"], 1);
    assert_eq!(seams.event_count(crate::ids::EVENT_PAYMENT_SUCCEEDED), 1);
    assert_eq!(seams.event_count(crate::ids::EVENT_CHECKOUT_SETTLED), 1);
    assert_eq!(seams.event_count(crate::ids::EVENT_ENTITLEMENT_CHANGED), 1);
    assert_eq!(seams.crm_events.borrow().len(), 1);
    let checkout = seams
        .get_entry(
            OPERATION_MODEL,
            &identity::operation_entry_key(&operation_id).unwrap(),
        )
        .unwrap();
    assert_eq!(checkout["settlementEffect"]["dispatched"], true);

    assert_eq!(deliver_settlement_effects(&seams, 20).unwrap().scanned, 0);
    assert_eq!(seams.event_count(crate::ids::EVENT_PAYMENT_SUCCEEDED), 1);
    assert_eq!(seams.crm_events.borrow().len(), 1);
}

#[test]
fn canonical_purchase_is_immediately_readable_as_a_buyer_product_entitlement() {
    let seams = setup_credits();
    let operation_id = settle_multi_product_credits(&seams);
    let ledger = seams
        .get_entry(crate::ids::MODEL_LEDGER, &operation_id)
        .unwrap();
    assert_eq!(ledger["customerProfileId"], "buyer-1");
    assert_eq!(ledger["productId"], "product-1");
    assert_eq!(ledger["productIds"], json!(["product-1", "product-2"]));

    let granted = crate::routes::entitlements::handle(
        &seams,
        &entitlement_request("buyer-1", &["product-1", "product-2", "not-purchased"]),
    )
    .unwrap();
    let granted: Value = serde_json::from_str(&granted.body).unwrap();
    assert_eq!(granted["results"][0]["granted"], true);
    assert_eq!(granted["results"][1]["granted"], true);
    assert_eq!(granted["results"][2]["granted"], false);

    let wrong_buyer = crate::routes::entitlements::handle(
        &seams,
        &entitlement_request("buyer-2", &["product-1"]),
    )
    .unwrap();
    let wrong_buyer: Value = serde_json::from_str(&wrong_buyer.body).unwrap();
    assert_eq!(wrong_buyer["results"][0]["granted"], false);
}

#[test]
fn delivery_failure_is_redacted_backed_off_and_retried() {
    let seams = setup_credits();
    let operation_id = settle_credits(&seams, "retry");
    let effect_id = effect_id(&seams, &operation_id);
    let now = seams.now_unix_secs();
    seams.fail_next_event("provider token buyer@example.com");

    let first = deliver_settlement_effects(&seams, 20).unwrap();
    assert_eq!((first.retried, first.delivered), (1, 0));
    let pending = seams
        .get_entry(crate::ids::MODEL_WEBHOOK_OUTBOX, &effect_id)
        .unwrap();
    assert_eq!(pending["status"], "effect_pending");
    assert_eq!(pending["lastError"], "analytics_delivery_failed");
    assert!(!pending.to_string().contains("provider token"));
    assert_eq!(deliver_settlement_effects(&seams, 20).unwrap().scanned, 0);

    seams.set_now(now + 31);
    assert_eq!(deliver_settlement_effects(&seams, 20).unwrap().delivered, 1);
    assert_eq!(seams.event_count(crate::ids::EVENT_PAYMENT_SUCCEEDED), 1);
}

#[test]
fn exhausted_delivery_budget_preserves_pending_effect_for_the_next_invocation() {
    let seams = setup_credits();
    let operation_id = settle_credits(&seams, "budget");
    let key = effect_id(&seams, &operation_id);
    let before = seams
        .get_entry(crate::ids::MODEL_WEBHOOK_OUTBOX, &key)
        .unwrap();
    let budget = crate::work_budget::WorkBudget::new(&seams);
    seams.set_now(seams.now_unix_secs() + 90);
    seams.db_reads.borrow_mut().clear();

    let report = deliver_settlement_effects_with_budget(&seams, 20, &budget).unwrap();
    assert_eq!(report.scanned, 0);
    assert!(seams.db_reads.borrow().is_empty());
    assert_eq!(
        seams
            .get_entry(crate::ids::MODEL_WEBHOOK_OUTBOX, &key)
            .unwrap(),
        before
    );
    assert_eq!(seams.event_count(crate::ids::EVENT_PAYMENT_SUCCEEDED), 0);

    assert_eq!(deliver_settlement_effects(&seams, 20).unwrap().delivered, 1);
    assert_eq!(seams.event_count(crate::ids::EVENT_PAYMENT_SUCCEEDED), 1);
    assert_eq!(deliver_settlement_effects(&seams, 20).unwrap().scanned, 0);
}

#[test]
fn partial_delivery_is_checkpointed_before_a_later_target_failure() {
    let seams = setup_credits();
    let operation_id = settle_credits(&seams, "partial");
    let now = seams.now_unix_secs();
    seams.fail_next_crm("crm unavailable");

    assert_eq!(deliver_settlement_effects(&seams, 20).unwrap().retried, 1);
    assert_eq!(seams.event_count(crate::ids::EVENT_PAYMENT_SUCCEEDED), 1);
    assert_eq!(seams.event_count(crate::ids::EVENT_CHECKOUT_SETTLED), 1);
    assert_eq!(seams.event_count(crate::ids::EVENT_ENTITLEMENT_CHANGED), 0);
    assert_eq!(seams.crm_events.borrow().len(), 0);

    seams.set_now(now + 31);
    assert_eq!(deliver_settlement_effects(&seams, 20).unwrap().delivered, 1);
    assert_eq!(seams.event_count(crate::ids::EVENT_PAYMENT_SUCCEEDED), 1);
    assert_eq!(seams.event_count(crate::ids::EVENT_CHECKOUT_SETTLED), 1);
    assert_eq!(seams.event_count(crate::ids::EVENT_ENTITLEMENT_CHANGED), 1);
    assert_eq!(seams.crm_events.borrow().len(), 1);
    assert_eq!(
        seams
            .get_entry(
                crate::ids::MODEL_WEBHOOK_OUTBOX,
                &effect_id(&seams, &operation_id),
            )
            .unwrap()["status"],
        "effect_delivered"
    );
}

#[test]
fn failed_guarded_commit_rolls_back_money_inventory_and_effect() {
    let seams = setup_credits();
    let before = seams
        .get_entry(crate::ids::MODEL_CREDITS, "acct:buyer-1")
        .unwrap();
    let context = RequestContext {
        site_id: Some("site-a".into()),
        environment: Some("production".into()),
        ..Default::default()
    };
    let buyer = Buyer {
        user_id: "buyer-1".into(),
        claims: Value::Null,
    };
    let facade = CanonicalCheckoutFacade::for_verified_buyer(&seams, &context, &buyer).unwrap();
    let quote = facade
        .quote(
            "effect-quote-rollback",
            &api_tests::quote_body("effect-quote-rollback", json!(["credits"])),
        )
        .unwrap();
    seams.fail_next_guarded_batch_after(3);
    let result = facade.checkout(
        "effect-checkout-rollback",
        &api_tests::checkout_body("effect-checkout-rollback", &quote.operation_id, "credits"),
    );
    assert!(result.is_err());
    assert_eq!(
        seams
            .get_entry(crate::ids::MODEL_CREDITS, "acct:buyer-1")
            .unwrap(),
        before
    );
    assert_eq!(seams.entry_count(crate::ids::MODEL_LEDGER), 0);
    assert_eq!(seams.entry_count(crate::ids::MODEL_WEBHOOK_OUTBOX), 0);
}
