use super::*;
use crate::fake::FakeSeams;

fn req(subscription_id: &str, claims: &[&str]) -> RouteRequest {
    RouteRequest {
        route_id: ids::ROUTE_SUBSCRIPTION_ENTITLEMENTS.into(),
        method: "GET".into(),
        path: format!("/subscriptions/v1/{subscription_id}/entitlements"),
        context_json: json!({
            "authenticated": true,
            "permissionClaims": claims,
        })
        .to_string(),
        ..Default::default()
    }
}

fn seed_subscription(seams: &FakeSeams, subscription_id: &str, product_id: &str) {
    seed_subscription_with_status(
        seams,
        subscription_id,
        product_id,
        "active",
        Some("2030-01-01T00:00:00Z"),
    );
}

fn seed_subscription_with_status(
    seams: &FakeSeams,
    subscription_id: &str,
    product_id: &str,
    status: &str,
    current_period_end: Option<&str>,
) {
    seams.seed(
        ids::MODEL_SUBSCRIPTIONS,
        subscription_id,
        json!({
            "subscriptionId": subscription_id,
            "customerRef": "cust_123",
            "productId": product_id,
            "priceId": "price_growth",
            "status": status,
            "provider": "stripe",
            "providerRef": subscription_id,
            "createdAt": "2026-06-01T00:00:00Z",
            "updatedAt": "2026-06-28T00:00:00Z"
        }),
    );
    if let Some(current_period_end) = current_period_end {
        let mut sub = seams
            .get_entry(ids::MODEL_SUBSCRIPTIONS, subscription_id)
            .unwrap();
        sub["currentPeriodEnd"] = json!(current_period_end);
        seams.seed(ids::MODEL_SUBSCRIPTIONS, subscription_id, sub);
    }
}

#[test]
fn returns_generic_and_managed_provider_entitlements_for_subscription_product() {
    let seams = FakeSeams::new();
    seed_subscription(&seams, "sub_123", "prod_growth");
    seams.seed(
        ids::MODEL_CATALOG,
        "prod_growth",
        json!({
            "id": "prod_growth",
            "active": true,
            "metadata": {
                "buyerEmail": "buyer@example.com",
                "entitlements": {
                    "cedros.portal.siteQuantity": 3,
                    "email.monthlySends": 10000,
                    "apiSecret": "do-not-return",
                    "apiKey": "do-not-return",
                    "authToken": "do-not-return",
                    "nested": { "clientToken": "do-not-return", "enabled": true }
                }
            },
            "entitlements": {
                "managedProviderLimits": {
                    "dailyRequestLimit": 1000,
                    "monthlyRequestLimit": 50000,
                    "monthlySpendCents": 25000,
                    "throttleRpm": 120,
                    "routes": {
                        "cedros-providers-manager:intelligence-execute-turn": {
                            "monthlyRequestLimit": 25000,
                            "monthlySpendCents": 15000,
                            "throttleRpm": 60,
                            "ignored": "private"
                        }
                    },
                    "families": {
                        "intelligence": {
                            "monthlyRequestLimit": 5000,
                            "monthlySpendCents": 10000
                        }
                    }
                }
            }
        }),
    );

    let response = handle(&seams, &req("sub_123", &[CLAIM_SUBSCRIPTION_READ])).unwrap();
    let body: Value = serde_json::from_str(&response.body).unwrap();

    assert_eq!(response.status, 200);
    assert_eq!(body["subscriptionId"], "sub_123");
    assert_eq!(body["customerId"], "cust_123");
    assert_eq!(body["productId"], "prod_growth");
    assert_eq!(body["status"], "active");
    assert_eq!(body["entitlements"]["cedros.portal.siteQuantity"], 3);
    assert_eq!(body["entitlements"]["email.monthlySends"], 10000);
    assert_eq!(
        body["entitlements"]["managedProviderLimits"]["monthlyRequestLimit"],
        50000
    );
    assert_eq!(
        body["entitlements"]["managedProviderLimits"]["routes"]
            ["cedros-providers-manager:intelligence-execute-turn"]["throttleRpm"],
        60
    );
    assert!(body.to_string().contains("managedProviderLimits"));
    assert!(!body.to_string().contains("buyer@example.com"));
    assert_eq!(body["entitlements"]["nested"]["enabled"], true);
    assert!(!body.to_string().contains("do-not-return"));
    assert!(body["entitlements"].get("apiKey").is_none());
    assert!(body["entitlements"].get("authToken").is_none());
    assert!(body["entitlements"]["nested"].get("clientToken").is_none());
    assert!(body["entitlements"]["managedProviderLimits"]["routes"]
        ["cedros-providers-manager:intelligence-execute-turn"]
        .get("ignored")
        .is_none());
}

#[test]
fn rejects_inactive_or_expired_subscriptions_before_returning_limits() {
    for (subscription_id, status, current_period_end) in [
        ("sub_canceled", "canceled", None),
        ("sub_past_due", "past_due", None),
        ("sub_incomplete", "incomplete", None),
        ("sub_expired", "active", Some("2026-05-01T00:00:00Z")),
        ("sub_missing_end", "active", None),
        ("sub_invalid_end", "active", Some("not-a-date")),
    ] {
        let seams = FakeSeams::new();
        seed_subscription_with_status(
            &seams,
            subscription_id,
            "prod_growth",
            status,
            current_period_end,
        );
        seams.seed(
            ids::MODEL_CATALOG,
            "prod_growth",
            json!({
                "id": "prod_growth",
                "entitlements": {
                    "managedProviderLimits": { "monthlyRequestLimit": 50000 }
                }
            }),
        );

        let error = handle(&seams, &req(subscription_id, &[CLAIM_SUBSCRIPTION_READ])).unwrap_err();

        assert_eq!(error.status, 403);
        assert_eq!(error.code, "forbidden");
    }
}

#[test]
fn requires_subscription_read_claim() {
    let seams = FakeSeams::new();
    seed_subscription(&seams, "sub_123", "prod_growth");

    let error = handle(&seams, &req("sub_123", &[])).unwrap_err();

    assert_eq!(error.status, 403);
}

#[test]
fn fails_closed_when_entitlements_are_absent() {
    let seams = FakeSeams::new();
    seed_subscription(&seams, "sub_123", "prod_growth");
    seams.seed(
        ids::MODEL_CATALOG,
        "prod_growth",
        json!({ "id": "prod_growth", "active": true }),
    );

    let error = handle(&seams, &req("sub_123", &[CLAIM_SUBSCRIPTION_READ])).unwrap_err();

    assert_eq!(error.status, 404);
}

#[test]
fn preserves_byok_zero_spend_from_catalog_metadata_namespace() {
    for entitlements in [
        json!({
            "cedros.portal.siteQuantity": 5,
            "managedProviderLimits": { "monthlySpendCents": 0 }
        }),
        json!(
            r#"{"cedros.portal.siteQuantity":5,"managedProviderLimits":{"monthlySpendCents":0}}"#
        ),
    ] {
        let seams = FakeSeams::new();
        seed_subscription(&seams, "sub_123", "cedros-agency");
        seams.seed(
            ids::MODEL_CATALOG,
            "cedros-agency",
            json!({
                "id": "cedros-agency",
                "metadata": { "entitlements": entitlements }
            }),
        );

        let response = handle(&seams, &req("sub_123", &[CLAIM_SUBSCRIPTION_READ])).unwrap();
        let body: Value = serde_json::from_str(&response.body).unwrap();

        assert_eq!(response.status, 200);
        assert_eq!(body["entitlements"]["cedros.portal.siteQuantity"], 5);
        assert_eq!(
            body["entitlements"]["managedProviderLimits"],
            json!({ "monthlySpendCents": 0 })
        );
    }
}

#[test]
fn filters_invalid_limits_from_catalog_metadata_namespace() {
    let seams = FakeSeams::new();
    seed_subscription(&seams, "sub_123", "prod_growth");
    seams.seed(
        ids::MODEL_CATALOG,
        "prod_growth",
        json!({
            "id": "prod_growth",
            "metadata": { "entitlements": { "managedProviderLimits": {
                "monthlySpendCents": 0,
                "dailyRequestLimit": -1,
                "monthlyRequestLimit": "1000",
                "unknown": 100,
                "apiKey": "do-not-return",
                "families": { "email": { "throttleRpm": 10, "unknown": 20 } }
            } } }
        }),
    );

    let response = handle(&seams, &req("sub_123", &[CLAIM_SUBSCRIPTION_READ])).unwrap();
    let body: Value = serde_json::from_str(&response.body).unwrap();

    assert_eq!(
        body["entitlements"]["managedProviderLimits"],
        json!({
            "monthlySpendCents": 0,
            "families": { "email": { "throttleRpm": 10 } }
        })
    );
}

#[test]
fn rejects_catalog_namespace_without_any_valid_limits() {
    for limits in [
        json!({ "monthlySpendCents": -1 }),
        json!({ "monthlySpendCents": "0" }),
        json!(false),
    ] {
        let seams = FakeSeams::new();
        seed_subscription(&seams, "sub_123", "prod_growth");
        seams.seed(
            ids::MODEL_CATALOG,
            "prod_growth",
            json!({
                "id": "prod_growth",
                "metadata": { "entitlements": { "managedProviderLimits": limits } }
            }),
        );

        let error = handle(&seams, &req("sub_123", &[CLAIM_SUBSCRIPTION_READ])).unwrap_err();

        assert_eq!(error.status, 404);
    }
}

#[test]
fn retains_explicit_and_subscription_limit_precedence_over_catalog_namespace() {
    let seams = FakeSeams::new();
    seed_subscription(&seams, "sub_123", "prod_growth");
    seams.seed(
        ids::MODEL_CATALOG,
        "prod_growth",
        json!({
            "id": "prod_growth",
            "metadata": { "entitlements": { "managedProviderLimits": { "monthlySpendCents": 0 } } },
            "managedProviderLimits": { "monthlySpendCents": 100 }
        }),
    );
    let response = handle(&seams, &req("sub_123", &[CLAIM_SUBSCRIPTION_READ])).unwrap();
    let body: Value = serde_json::from_str(&response.body).unwrap();
    assert_eq!(
        body["entitlements"]["managedProviderLimits"]["monthlySpendCents"],
        100
    );

    let mut subscription = seams
        .get_entry(ids::MODEL_SUBSCRIPTIONS, "sub_123")
        .unwrap();
    subscription["metadata"] =
        json!({ "entitlements": { "managedProviderLimits": { "monthlySpendCents": 200 } } });
    seams.seed(ids::MODEL_SUBSCRIPTIONS, "sub_123", subscription);
    let response = handle(&seams, &req("sub_123", &[CLAIM_SUBSCRIPTION_READ])).unwrap();
    let body: Value = serde_json::from_str(&response.body).unwrap();
    assert_eq!(
        body["entitlements"]["managedProviderLimits"]["monthlySpendCents"],
        200
    );
}
