use serde_json::{json, Value};

use super::handle;
use crate::error::AppError;
use crate::fake::FakeSeams;
use crate::ids;
use crate::reqresp::{RouteRequest, RouteResponse};

pub(super) const TOKEN: &str = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

/// Builds an authenticated Stripe notification for `body` and registers the
/// same payload as the Event that ingress retrieves from Stripe.
pub(super) fn stripe_request(seams: &FakeSeams, body: &str) -> RouteRequest {
    seams.seed_stripe_event(serde_json::from_str(body).expect("stripe event fixture is JSON"));
    RouteRequest {
        route_id: ids::ROUTE_WEBHOOKS.into(),
        method: "POST".into(),
        path: "/webhook/stripe".into(),
        query: vec![("token".into(), TOKEN.into())],
        body: body.to_string(),
        ..Default::default()
    }
}

pub(super) fn seams() -> FakeSeams {
    let seams = FakeSeams::new();
    seams.set_secret(ids::SECRET_STRIPE_WEBHOOK_TOKEN, TOKEN);
    seams.set_secret(ids::SECRET_STRIPE_KEY, "sk_test_fixture");
    seams
}

pub(super) fn invoke(seams: &FakeSeams, request: RouteRequest) -> RouteResponse {
    handle(seams, &request).unwrap_or_else(AppError::into_response)
}

pub(super) fn seed_pending(
    seams: &FakeSeams,
    reference: &str,
    provider_ref: &str,
    amount: i64,
    profile: &str,
) {
    seams.seed(
        ids::MODEL_LEDGER,
        reference,
        json!({
            "reference": reference, "kind": "payment", "status": "pending",
            "grossCents": amount, "refundCents": 0, "currency": "USD",
            "customerProfileId": profile, "productId": "prod_1", "provider": "stripe",
            "providerRef": provider_ref, "createdAt": "2026-05-31T00:00:00Z",
            "processedAt": "2026-05-31T00:00:00Z"
        }),
    );
}

pub(super) fn seed_subscription(seams: &FakeSeams, id: &str, period_end: &str) {
    seams.seed(
        ids::MODEL_SUBSCRIPTIONS,
        id,
        json!({
            "subscriptionId": id, "customerRef": "cus_1", "priceId": "price_1",
            "status": "active", "provider": "stripe", "providerRef": id,
            "currentPeriodEnd": period_end, "cancelAtPeriodEnd": false,
            "createdAt": "2026-01-01T00:00:00Z", "updatedAt": "2026-01-01T00:00:00Z"
        }),
    );
}

pub(super) fn pi_succeeded(
    id: &str,
    reference: &str,
    pi_id: &str,
    amount: i64,
    profile: &str,
) -> String {
    json!({
        "id": id, "type": "payment_intent.succeeded",
        "data": { "object": {
            "id": pi_id, "amount": amount, "currency": "usd",
            "status": "succeeded", "amount_received": amount,
            "metadata": { "reference": reference, "profileId": profile, "customerId": "cust_1" }
        }}
    })
    .to_string()
}

pub(super) fn session_completed(
    id: &str,
    session_id: &str,
    pi_id: &str,
    amount_total: i64,
) -> String {
    json!({
        "id": id, "type": "checkout.session.completed",
        "data": { "object": {
            "id": session_id, "payment_intent": pi_id,
            "mode": "payment", "status": "complete", "payment_status": "paid",
            "amount_total": amount_total, "currency": "usd",
            "metadata": { "resource": "prod_1" }
        }}
    })
    .to_string()
}

pub(super) fn event_payload(seams: &FakeSeams, event_id: &str) -> Value {
    seams
        .events
        .borrow()
        .iter()
        .find(|(id, _, _)| id == event_id)
        .map(|(_, _, payload)| payload.clone())
        .expect("event payload exists")
}

pub(super) fn queue_invoice_payment(s: &FakeSeams, id: &str, amount: i64, customer: Option<&str>) {
    s.set_secret(ids::SECRET_STRIPE_KEY, "sk_test_invoice");
    s.push_http_response(
        200,
        &json!({"id": id, "status": "succeeded", "amount": amount,
        "amount_received": amount, "currency": "usd", "customer": customer})
        .to_string(),
    );
}
