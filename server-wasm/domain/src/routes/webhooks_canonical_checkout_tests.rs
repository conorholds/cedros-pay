use serde_json::json;

use super::webhooks_test_support::{invoke, stripe_request, TOKEN};
use crate::checkout_contract::api_tests;

#[test]
fn signed_checkout_session_webhook_converges_inventory_without_browser_return() {
    let seams = api_tests::setup();
    seams.set_secret(crate::ids::SECRET_STRIPE_WEBHOOK_TOKEN, TOKEN);
    seams.set_secret(crate::ids::SECRET_STRIPE_KEY, "sk_test_redacted");
    seams.seed(
        crate::ids::MODEL_CATALOG,
        "product-1",
        json!({
            "id": "product-1", "active": true, "title": "Tracked product",
            "price": { "amountCents": 725, "currency": "USD" },
            "paymentResource": "product-1", "inventoryQuantity": 10
        }),
    );
    let quote = api_tests::facade(&seams)
        .quote(
            "webhook-quote",
            &api_tests::quote_body("webhook-quote", json!(["stripe"])),
        )
        .unwrap();
    seams.push_http_response(
        200,
        r#"{"id":"cs_webhook_canonical","url":"https://checkout.stripe.com/webhook"}"#,
    );
    let checkout = api_tests::facade(&seams)
        .checkout(
            "webhook-checkout",
            &api_tests::checkout_body("webhook-checkout", &quote.operation_id, "stripe"),
        )
        .unwrap();
    let operation_id = match checkout {
        crate::checkout_contract::CanonicalPaymentOutcome::ActionRequired {
            operation_id, ..
        } => operation_id,
        other => panic!("expected action required, got {other:?}"),
    };
    let body = json!({
        "id": "evt_canonical_checkout",
        "type": "checkout.session.completed",
        "data": { "object": {
            "id": "cs_webhook_canonical",
            "payment_intent": "pi_webhook_canonical",
            "mode": "payment",
            "status": "complete",
            "payment_status": "paid",
            "amount_total": 1500,
            "currency": "usd",
            "metadata": { "cedros_pay_operation_id": operation_id }
        }}
    })
    .to_string();
    assert_eq!(
        invoke(&seams, stripe_request(&seams, &body)).status,
        200
    );
    let checkout_key = crate::checkout_contract::checkout_operation_key(&operation_id).unwrap();
    assert_eq!(
        seams
            .get_entry(crate::checkout_contract::OPERATION_MODEL, &checkout_key)
            .unwrap()["settlementState"],
        "paid"
    );
    let stock_key = crate::checkout_contract::checkout_stock_key("product-1");
    let stock = seams
        .get_entry(crate::checkout_contract::STOCK_MODEL, &stock_key)
        .unwrap();
    assert_eq!(
        (stock["reserved"].as_u64(), stock["sold"].as_u64()),
        (Some(0), Some(2))
    );
}

#[test]
fn completed_but_unpaid_checkout_waits_and_async_failure_releases_inventory() {
    let seams = api_tests::setup();
    seams.set_secret(crate::ids::SECRET_STRIPE_WEBHOOK_TOKEN, TOKEN);
    seams.set_secret(crate::ids::SECRET_STRIPE_KEY, "sk_test_redacted");
    seams.seed(
        crate::ids::MODEL_CATALOG,
        "product-1",
        json!({
            "id": "product-1", "active": true, "title": "Tracked product",
            "price": { "amountCents": 725, "currency": "USD" },
            "paymentResource": "product-1", "inventoryQuantity": 10
        }),
    );
    let quote = api_tests::facade(&seams)
        .quote(
            "unpaid-webhook-quote",
            &api_tests::quote_body("unpaid-webhook-quote", json!(["stripe"])),
        )
        .unwrap();
    seams.push_http_response(
        200,
        r#"{"id":"cs_webhook_unpaid","url":"https://checkout.stripe.com/webhook"}"#,
    );
    let checkout = api_tests::facade(&seams)
        .checkout(
            "unpaid-webhook-checkout",
            &api_tests::checkout_body("unpaid-webhook-checkout", &quote.operation_id, "stripe"),
        )
        .unwrap();
    let operation_id = match checkout {
        crate::checkout_contract::CanonicalPaymentOutcome::ActionRequired {
            operation_id, ..
        } => operation_id,
        other => panic!("expected action required, got {other:?}"),
    };
    let body = json!({
        "id": "evt_canonical_checkout_unpaid",
        "type": "checkout.session.completed",
        "data": { "object": {
            "id": "cs_webhook_unpaid",
            "payment_intent": "pi_webhook_unpaid",
            "mode": "payment",
            "status": "complete",
            "payment_status": "unpaid",
            "amount_total": 1500,
            "currency": "usd",
            "metadata": { "cedros_pay_operation_id": operation_id }
        }}
    })
    .to_string();

    assert_eq!(
        invoke(&seams, stripe_request(&seams, &body)).status,
        200
    );
    let checkout_key = crate::checkout_contract::checkout_operation_key(&operation_id).unwrap();
    assert_eq!(
        seams
            .get_entry(crate::checkout_contract::OPERATION_MODEL, &checkout_key)
            .unwrap()["settlementState"],
        "pending"
    );
    assert!(seams
        .get_entry(crate::ids::MODEL_LEDGER, "cs_webhook_unpaid")
        .is_none());
    let stock_key = crate::checkout_contract::checkout_stock_key("product-1");
    let stock = seams
        .get_entry(crate::checkout_contract::STOCK_MODEL, &stock_key)
        .unwrap();
    assert_eq!(
        (stock["reserved"].as_u64(), stock["sold"].as_u64()),
        (Some(2), Some(0))
    );

    let failed = json!({
        "id": "evt_canonical_checkout_failed",
        "type": "checkout.session.async_payment_failed",
        "data": { "object": {
            "id": "cs_webhook_unpaid",
            "payment_intent": "pi_webhook_unpaid",
            "mode": "payment",
            "status": "complete",
            "payment_status": "unpaid",
            "amount_total": 1500,
            "currency": "usd",
            "metadata": { "cedros_pay_operation_id": operation_id }
        }}
    })
    .to_string();
    assert_eq!(
        invoke(&seams, stripe_request(&seams, &failed)).status,
        200
    );
    assert_eq!(
        seams
            .get_entry(crate::checkout_contract::OPERATION_MODEL, &checkout_key)
            .unwrap()["settlementState"],
        "terminal"
    );
    assert_eq!(
        seams
            .get_entry(crate::checkout_contract::OPERATION_MODEL, &checkout_key)
            .unwrap()["outcome"]["code"],
        "provider-payment-failed"
    );
    let stock = seams
        .get_entry(crate::checkout_contract::STOCK_MODEL, &stock_key)
        .unwrap();
    assert_eq!(
        (stock["reserved"].as_u64(), stock["sold"].as_u64()),
        (Some(0), Some(0))
    );

    let later_failure = failed.replace(
        "evt_canonical_checkout_failed",
        "evt_canonical_checkout_failed_later",
    );
    assert_eq!(
        invoke(
            &seams,
            stripe_request(&seams, &later_failure)
        )
        .status,
        200
    );
}
