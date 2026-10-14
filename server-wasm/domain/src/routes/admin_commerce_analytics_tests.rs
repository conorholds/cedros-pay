use serde_json::{json, Value};

use crate::fake::FakeSeams;
use crate::ids;
use crate::reqresp::{RouteRequest, RouteResponse};
use crate::time;

fn admin_ctx() -> String {
    json!({
        "authenticated": true,
        "permissionClaims": [ids::ROUTE_ADMIN],
        "csrfVerified": true
    })
    .to_string()
}

fn request(route_id: &str, method: &str, path: &str) -> RouteRequest {
    RouteRequest {
        route_id: route_id.into(),
        method: method.into(),
        path: path.into(),
        context_json: admin_ctx(),
        ..Default::default()
    }
}

fn body(resp: &RouteResponse) -> Value {
    serde_json::from_str(&resp.body).expect("json response")
}

#[test]
fn commerce_analytics_returns_redacted_bridge_records() {
    let seams = FakeSeams::new();
    seams.set_now(time::parse_iso("2026-06-01T12:00:00Z").unwrap());
    seed_cart(
        &seams,
        "cart_expired",
        "2026-06-01T10:00:00Z",
        None,
        "secret-token-mint",
    );
    seed_cart(
        &seams,
        "cart_active",
        "2026-06-01T13:00:00Z",
        None,
        "active-secret-token",
    );
    seed_cart(
        &seams,
        "cart_paid",
        "2026-06-01T10:00:00Z",
        Some("paid-signature-secret"),
        "paid-secret-token",
    );
    seams.seed(
        ids::MODEL_LEDGER,
        "pay_analytics",
        json!({
            "reference": "pay_analytics",
            "kind": "payment",
            "status": "succeeded",
            "grossCents": 2000,
            "currency": "USD",
            "provider": "stripe",
            "providerRef": "pi_secret_raw_provider_ref",
            "productId": "cart:cart_expired",
            "processedAt": "2026-06-01T11:00:00Z"
        }),
    );

    let resp = crate::router::handle_route(
        &seams,
        request(
            ids::ROUTE_ADMIN_COMMERCE_ANALYTICS,
            "GET",
            "/admin/commerce-analytics",
        ),
    );
    assert_eq!(resp.status, 200);
    let text = resp.body.clone();
    let out = body(&resp);

    assert_eq!(out["abandonedCheckouts"].as_array().unwrap().len(), 1);
    assert_eq!(out["abandonedCheckouts"][0]["checkoutId"], "cart_expired");
    assert_eq!(out["abandonedCheckouts"][0]["recoverable"], true);
    assert_eq!(out["paymentEvents"].as_array().unwrap().len(), 1);
    assert_eq!(out["paymentEvents"][0]["paymentRail"], "stripe");
    assert!(out["paymentEvents"][0]["eventId"]
        .as_str()
        .unwrap()
        .starts_with("cedros-pay:payment-event:"));
    for secret in [
        "secret-token-mint",
        "active-secret-token",
        "paid-secret-token",
        "paid-signature-secret",
        "pi_secret_raw_provider_ref",
    ] {
        assert!(!text.contains(secret), "response leaked {secret}");
    }
}

#[test]
fn recover_checkout_returns_snapshot_and_rejects_active_cart() {
    let seams = FakeSeams::new();
    seams.set_now(time::parse_iso("2026-06-01T12:00:00Z").unwrap());
    seed_cart(
        &seams,
        "cart_expired",
        "2026-06-01T10:00:00Z",
        None,
        "secret-token-mint",
    );
    seed_cart(
        &seams,
        "cart_active",
        "2026-06-01T13:00:00Z",
        None,
        "active-secret-token",
    );

    let recovered = crate::router::handle_route(
        &seams,
        request(
            ids::ROUTE_ADMIN_COMMERCE_ANALYTICS_RECOVER,
            "POST",
            "/admin/commerce-analytics/abandoned-checkouts/cart_expired/recover",
        ),
    );
    assert_eq!(recovered.status, 200);
    let recovered_text = recovered.body.clone();
    let out = body(&recovered);
    assert_eq!(out["status"], "recovered");
    assert_eq!(out["cart"]["items"][0]["productId"], "prod_1");
    assert_eq!(out["navigateTarget"]["moduleId"], "cedros-pay:admin");
    assert!(!recovered_text.to_ascii_lowercase().contains("token"));
    assert!(!recovered_text.to_ascii_lowercase().contains("url"));

    let active = crate::router::handle_route(
        &seams,
        request(
            ids::ROUTE_ADMIN_COMMERCE_ANALYTICS_RECOVER,
            "POST",
            "/admin/commerce-analytics/abandoned-checkouts/cart_active/recover",
        ),
    );
    assert_eq!(active.status, 400);
}

fn seed_cart(
    seams: &FakeSeams,
    cart_id: &str,
    expires_at: &str,
    paid_signature: Option<&str>,
    token_mint: &str,
) {
    seams.seed(
        ids::MODEL_CART,
        cart_id,
        json!({
            "cartId": cart_id,
            "items": [{
                "resource": "prod_1",
                "variantId": "var_1",
                "quantity": 2,
                "lineAtomic": 2_000_000,
                "lineCents": 2000
            }],
            "totalAtomic": 2_000_000,
            "totalCents": 2000,
            "currency": "USD",
            "tokenMint": token_mint,
            "recipientTokenAccount": "secret-recipient-account",
            "paidSignature": paid_signature,
            "createdAt": "2026-06-01T09:00:00Z",
            "expiresAt": expires_at
        }),
    );
}
