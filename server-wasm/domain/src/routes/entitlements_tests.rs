use serde_json::{json, Value};

use super::*;
use crate::fake::FakeSeams;

fn request(body: Value) -> RouteRequest {
    RouteRequest {
        route_id: ids::ROUTE_ENTITLEMENTS.into(),
        method: "POST".into(),
        path: "/entitlements/v1/check".into(),
        body: body.to_string(),
        context_json: json!({
            "permissionClaims": [ids::CAPABILITY_ENTITLEMENT_READ],
        })
        .to_string(),
        ..Default::default()
    }
}

fn parse_results(resp: RouteResponse) -> Value {
    serde_json::from_str(&resp.body).expect("json body")
}

#[test]
fn grants_media_asset_from_successful_product_purchase() {
    let seams = FakeSeams::new();
    seams.seed(
        ids::MODEL_LEDGER,
        "ord_1",
        json!({
            "reference": "ord_1",
            "kind": "payment",
            "status": "succeeded",
            "grossCents": 1200,
            "refundCents": 0,
            "currency": "USD",
            "customerProfileId": "login-user-1",
            "productId": "prod_media",
            "provider": "stripe",
            "createdAt": "2026-06-01T00:00:00Z",
            "processedAt": "2026-06-01T00:00:00Z"
        }),
    );

    let resp = handle(
        &seams,
        &request(json!({
            "userId": "login-user-1",
            "checks": [{
                "scope": "media_asset",
                "scopeId": "asset-1",
                "productId": "prod_media"
            }]
        })),
    )
    .unwrap();

    let body = parse_results(resp);
    assert_eq!(body["results"][0]["granted"], true);
}

#[test]
fn grants_media_asset_from_active_subscription_price() {
    let seams = FakeSeams::new();
    seams.seed(
        ids::MODEL_SUBSCRIPTIONS,
        "sub_1",
        json!({
            "subscriptionId": "sub_1",
            "customerRef": "login-user-1",
            "priceId": "prod_subscription",
            "status": "active",
            "provider": "stripe",
            "currentPeriodEnd": "2026-07-01T00:00:00Z",
            "cancelAtPeriodEnd": false,
            "createdAt": "2026-06-01T00:00:00Z",
            "updatedAt": "2026-06-01T00:00:00Z"
        }),
    );

    let resp = handle(
        &seams,
        &request(json!({
            "userId": "login-user-1",
            "checks": [{
                "scope": "media_asset",
                "scopeId": "asset-1",
                "productId": "prod_subscription"
            }]
        })),
    )
    .unwrap();

    let body = parse_results(resp);
    assert_eq!(body["results"][0]["granted"], true);
}

#[test]
fn native_subscription_payment_does_not_become_a_permanent_entitlement() {
    let seams = FakeSeams::new();
    seams.seed(
        ids::MODEL_LEDGER,
        "apple-tx:tx_1",
        json!({
            "reference": "apple-tx:tx_1",
            "kind": "payment",
            "status": "succeeded",
            "grossCents": 1200,
            "refundCents": 0,
            "currency": "USD",
            "customerProfileId": "login-user-1",
            "productId": "prod_subscription",
            "provider": "apple_app_store",
            "createdAt": "2026-06-01T00:00:00Z",
            "processedAt": "2026-06-01T00:00:00Z",
            "nativeStoreClaim": {
                "result": { "subscriptionId": "original-tx-1" }
            }
        }),
    );

    let response = handle(
        &seams,
        &request(json!({
            "userId": "login-user-1",
            "checks": [{
                "scope": "media_asset",
                "scopeId": "asset-1",
                "productId": "prod_subscription"
            }]
        })),
    )
    .unwrap();

    assert_eq!(parse_results(response)["results"][0]["granted"], false);
}

#[test]
fn denies_refunded_expired_or_wrong_user_records() {
    let seams = FakeSeams::new();
    seams.seed(
        ids::MODEL_LEDGER,
        "ord_refunded",
        json!({
            "reference": "ord_refunded",
            "kind": "payment",
            "status": "refunded",
            "grossCents": 1200,
            "refundCents": 1200,
            "currency": "USD",
            "customerProfileId": "login-user-1",
            "productId": "prod_media",
            "provider": "stripe",
            "createdAt": "2026-06-01T00:00:00Z",
            "processedAt": "2026-06-01T00:00:00Z"
        }),
    );
    seams.seed(
        ids::MODEL_SUBSCRIPTIONS,
        "sub_expired",
        json!({
            "subscriptionId": "sub_expired",
            "customerRef": "login-user-1",
            "priceId": "prod_subscription",
            "status": "active",
            "provider": "stripe",
            "currentPeriodEnd": "2026-05-01T00:00:00Z",
            "cancelAtPeriodEnd": false,
            "createdAt": "2026-04-01T00:00:00Z",
            "updatedAt": "2026-05-01T00:00:00Z"
        }),
    );

    let resp = handle(
        &seams,
        &request(json!({
            "userId": "login-user-1",
            "checks": [
                { "scope": "media_asset", "scopeId": "asset-1", "productId": "prod_media" },
                { "scope": "media_asset", "scopeId": "asset-2", "productId": "prod_subscription" }
            ]
        })),
    )
    .unwrap();

    let body = parse_results(resp);
    assert_eq!(body["results"][0]["granted"], false);
    assert_eq!(body["results"][1]["granted"], false);
}

#[test]
fn denies_active_subscription_without_parseable_period_end() {
    let seams = FakeSeams::new();
    for (id, period_end) in [
        ("sub_missing_end", None),
        ("sub_invalid_end", Some("not-a-date")),
    ] {
        let mut row = json!({
            "subscriptionId": id,
            "customerRef": "login-user-1",
            "priceId": "prod_subscription",
            "status": "active",
            "provider": "stripe",
            "cancelAtPeriodEnd": false,
            "createdAt": "2026-06-01T00:00:00Z",
            "updatedAt": "2026-06-01T00:00:00Z"
        });
        if let Some(end) = period_end {
            row["currentPeriodEnd"] = json!(end);
        }
        seams.seed(ids::MODEL_SUBSCRIPTIONS, id, row);
    }

    let resp = handle(
        &seams,
        &request(json!({
            "userId": "login-user-1",
            "checks": [{
                "scope": "media_asset",
                "scopeId": "asset-1",
                "productId": "prod_subscription"
            }]
        })),
    )
    .unwrap();

    let body = parse_results(resp);
    assert_eq!(body["results"][0]["granted"], false);
}

#[test]
fn rejects_unknown_fields_and_missing_capability() {
    let seams = FakeSeams::new();
    let err = handle(
        &seams,
        &request(json!({
            "userId": "login-user-1",
            "secretToken": "not-allowed",
            "checks": [{ "scope": "media_asset", "scopeId": "asset-1" }]
        })),
    )
    .unwrap_err();
    assert_eq!(err.status, 422);

    let mut req = request(json!({
        "userId": "login-user-1",
        "checks": [{ "scope": "media_asset", "scopeId": "asset-1" }]
    }));
    req.context_json = json!({ "permissionClaims": [] }).to_string();

    let err = handle(&seams, &req).unwrap_err();
    assert_eq!(err.status, 403);
}

#[test]
fn recurring_settlements_never_outlive_subscription_access() {
    for (provider, route) in [
        ("stripe", "subscription"),
        (
            "solana_subscription",
            "/paywall/v1/subscription/solana-subscription/activate",
        ),
    ] {
        let s = FakeSeams::new();
        s.seed(ids::MODEL_LEDGER, "invoice", json!({"reference":"invoice", "kind":"payment", "status":"succeeded", "grossCents":1200, "refundCents":0, "currency":"USD", "customerProfileId":"user", "productId":"plan", "provider":provider, "routePath":route}));
        let req = request(
            json!({"userId":"user", "checks":[{"scope":"media_asset", "scopeId":"asset", "productId":"plan"}]}),
        );
        for status in ["active", "canceled", "past_due"] {
            s.seed(ids::MODEL_SUBSCRIPTIONS, "subscription", json!({"subscriptionId":"subscription", "customerRef":"user", "priceId":"plan", "status":status, "currentPeriodEnd":"2030-01-01T00:00:00Z"}));
            let result = parse_results(handle(&s, &req).unwrap());
            assert_eq!(result["results"][0]["granted"], status == "active");
        }
    }
}

#[test]
fn impossible_refund_amounts_cannot_create_positive_entitlement_balance() {
    for (gross, refunded) in [(i64::MAX, -1), (1200, -500), (1200, 1201)] {
        let s = FakeSeams::new();
        s.seed(ids::MODEL_LEDGER, "payment", json!({"reference":"payment", "kind":"payment", "status":"succeeded", "grossCents":gross, "refundCents":refunded, "customerProfileId":"user", "productId":"plan"}));
        let req = request(
            json!({"userId":"user", "checks":[{"scope":"media_asset", "scopeId":"asset", "productId":"plan"}]}),
        );
        assert_eq!(
            parse_results(handle(&s, &req).unwrap())["results"][0]["granted"],
            false
        );
    }
}
