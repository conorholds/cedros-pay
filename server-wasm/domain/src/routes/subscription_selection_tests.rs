use super::*;
use crate::fake::FakeSeams;
use serde_json::Value;
use std::collections::BTreeSet;

fn configure_login(s: &FakeSeams, user_id: &str) {
    s.set_setting("cedros_login.base_url", "https://site.example");
    s.push_http_response(200, &format!(r#"{{"user":{{"id":"{user_id}"}}}}"#));
}

fn configure_stripe(s: &FakeSeams) {
    s.set_secret(ids::SECRET_STRIPE_KEY, "sk_test");
    s.set_setting("stripe.success_url", "https://app.example/success");
    s.set_setting("stripe.cancel_url", "https://app.example/cancel");
}

fn set_settings(s: &FakeSeams) {
    s.set_setting(
        SETTINGS_KEY,
        &json!({
            "enabled": true,
            "plans": [
                {
                    "id": "free",
                    "title": "Free",
                    "description": "Starter access",
                    "priceMonthlyUsd": 0,
                    "priceAnnualUsd": 0,
                    "isActive": true,
                    "sortOrder": 2
                },
                {
                    "id": "pro",
                    "title": "Pro",
                    "description": "Paid access",
                    "priceMonthlyUsd": 12,
                    "priceAnnualUsd": 99,
                    "trialDays": 3,
                    "isActive": true,
                    "sortOrder": 1,
                    "stripePriceIdMonthly": "price_month",
                    "stripePriceIdAnnual": "price_year",
                    "solanaSubscription": {
                        "enabled": true,
                        "planId": 7,
                        "merchantAddress": "11111111111111111111111111111111",
                        "tokenMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
                        "monthlyAmountAtomic": 12000000,
                        "monthlyPeriodHours": 720
                    }
                },
                {
                    "id": "hidden_free",
                    "title": "Hidden Free",
                    "description": "Private starter access",
                    "priceMonthlyUsd": 0,
                    "priceAnnualUsd": 0,
                    "isActive": true,
                    "public": false,
                    "sortOrder": 3
                },
                {
                    "id": "hidden_pro",
                    "title": "Hidden Pro",
                    "description": "Private paid access",
                    "priceMonthlyUsd": 7,
                    "priceAnnualUsd": 70,
                    "isActive": true,
                    "public": false,
                    "sortOrder": 4,
                    "stripePriceIdMonthly": "price_hidden_month",
                    "stripePriceIdAnnual": "price_hidden_year"
                }
            ]
        })
        .to_string(),
    );
}

fn seed_catalog_plan(s: &FakeSeams, id: &str, public: bool, purchasable: bool) {
    s.seed(
        ids::MODEL_CATALOG,
        id,
        json!({
            "id": id,
            "stableHandle": id,
            "recordType": "product",
            "catalogSchemaVersion": 2,
            "displayName": "Individual",
            "description": "One person. One primary site.",
            "status": "active",
            "active": true,
            "public": public,
            "purchasable": purchasable,
            "productType": "subscription",
            "sortOrder": 10,
            "metadata": {
                "accountModel": "individual",
                "program": "standard",
                "publicOnMainPricingPage": true,
                "privateValue": "must-not-project"
            },
            "prices": [
                {
                    "id": format!("{id}-{id}-monthly"),
                    "stableHandle": format!("{id}-monthly"),
                    "unitAmountCents": 2900,
                    "currency": "USD",
                    "billingInterval": "month",
                    "billingIntervalCount": 1,
                    "trialDays": 3,
                    "status": "active",
                    "active": true,
                    "public": true,
                    "purchasable": true
                },
                {
                    "id": format!("{id}-{id}-annual"),
                    "stableHandle": format!("{id}-annual"),
                    "unitAmountCents": 22800,
                    "currency": "USD",
                    "billingInterval": "year",
                    "billingIntervalCount": 1,
                    "trialDays": 3,
                    "status": "active",
                    "active": true,
                    "public": true,
                    "purchasable": true
                }
            ]
        }),
    );
}

fn req(route_id: &str, method: &str, path: &str) -> RouteRequest {
    RouteRequest {
        route_id: route_id.into(),
        method: method.into(),
        path: path.into(),
        headers: vec![("authorization".into(), "Bearer user-token".into())],
        context_json: r#"{"siteId":"site-a","idempotencyKey":"subscription-plan-test-attempt"}"#
            .into(),
        ..Default::default()
    }
}

fn body(resp: &RouteResponse) -> Value {
    serde_json::from_str(&resp.body).unwrap()
}

#[test]
fn plans_reads_public_settings_plans_in_sort_order() {
    let s = FakeSeams::new();
    set_settings(&s);
    let mut r = req(
        ids::ROUTE_SUBSCRIPTION_PLANS,
        "GET",
        "/paywall/v1/subscription/plans",
    );
    r.query = vec![("interval".into(), "monthly".into())];

    let resp = handle(&s, &r).unwrap();
    let out = body(&resp);
    assert_eq!(out["enabled"], true);
    assert_eq!(out["plans"].as_array().unwrap().len(), 2);
    assert_eq!(out["plans"][0]["planId"], "pro");
    assert_eq!(out["plans"][0]["priceCents"], 1200);
    assert_eq!(out["plans"][1]["free"], true);
}

#[test]
fn free_settings_plan_remains_selectable_beside_paid_catalog() {
    for interval in ["monthly", "annual"] {
        let s = FakeSeams::new();
        set_settings(&s);
        seed_catalog_plan(&s, "catalog-paid", true, true);
        let mut r = req(
            ids::ROUTE_SUBSCRIPTION_PLANS,
            "GET",
            "/paywall/v1/subscription/plans",
        );
        r.query = vec![("interval".into(), interval.into())];
        let out = body(&handle(&s, &r).unwrap());
        let plans = out["plans"].as_array().unwrap();
        assert_eq!(plans.len(), 2);
        assert_eq!(plans[0]["planId"], "free");
        assert_eq!(plans[0]["priceCents"], 0);
        assert_eq!(plans[1]["planId"], "catalog-paid");
        assert!(plans
            .iter()
            .all(|plan| plan["planId"] != "hidden_free" && plan["planId"] != "pro"));
    }
}

#[test]
fn free_settings_plan_cannot_override_catalog_price_or_disabled_settings() {
    let s = FakeSeams::new();
    set_settings(&s);
    seed_catalog_plan(&s, "free", true, true);
    let r = req(
        ids::ROUTE_SUBSCRIPTION_PLANS,
        "GET",
        "/paywall/v1/subscription/plans",
    );
    let out = body(&handle(&s, &r).unwrap());
    assert_eq!(out["plans"].as_array().unwrap().len(), 1);
    assert_eq!(out["plans"][0]["priceCents"], 2900);
    s.set_setting(SETTINGS_KEY, &json!({"enabled": false, "plans": [{"id": "disabled-free", "title": "Free", "priceMonthlyUsd": 0, "isActive": true}]}).to_string());
    let out = body(&handle(&s, &r).unwrap());
    assert_eq!(out["plans"].as_array().unwrap().len(), 1);
    assert_eq!(out["plans"][0]["planId"], "free");
}

#[test]
fn plans_are_unavailable_until_an_active_public_plan_exists() {
    let s = FakeSeams::new();
    s.set_setting(
        SETTINGS_KEY,
        &json!({
            "enabled": true,
            "plans": [
                {
                    "id": "private",
                    "title": "Private",
                    "priceMonthlyUsd": 10,
                    "priceAnnualUsd": 100,
                    "isActive": true,
                    "public": false
                },
                {
                    "id": "inactive",
                    "title": "Inactive",
                    "priceMonthlyUsd": 10,
                    "priceAnnualUsd": 100,
                    "isActive": false,
                    "public": true
                }
            ]
        })
        .to_string(),
    );
    let r = req(
        ids::ROUTE_SUBSCRIPTION_PLANS,
        "GET",
        "/paywall/v1/subscription/plans",
    );

    let out = body(&handle(&s, &r).unwrap());

    assert_eq!(out["configuredEnabled"], true);
    assert_eq!(out["enabled"], false);
    assert_eq!(out["unavailableReason"], "no_active_public_plans");
    assert_eq!(out["plans"], json!([]));
}

#[test]
fn plans_read_mcp_catalog_prices_and_allowlisted_pricing_placement() {
    let s = FakeSeams::new();
    set_settings(&s);
    seed_catalog_plan(&s, "cedros-individual", true, true);

    let mut monthly = req(
        ids::ROUTE_SUBSCRIPTION_PLANS,
        "GET",
        "/paywall/v1/subscription/plans",
    );
    monthly.query = vec![("interval".into(), "month".into())];
    let monthly = body(&handle(&s, &monthly).unwrap());

    assert_eq!(monthly["enabled"], true);
    assert_eq!(monthly["plans"].as_array().unwrap().len(), 2);
    assert_eq!(monthly["plans"][0]["planId"], "free");
    let monthly = json!({"plans": [monthly["plans"][1].clone()]});
    assert_eq!(monthly["plans"][0]["planId"], "cedros-individual");
    assert_eq!(
        monthly["plans"][0]["priceId"],
        "cedros-individual-cedros-individual-monthly"
    );
    assert_eq!(monthly["plans"][0]["priceCents"], 2900);
    assert_eq!(monthly["plans"][0]["trialDays"], 3);
    assert_eq!(monthly["plans"][0]["accountModel"], "individual");
    assert_eq!(monthly["plans"][0]["program"], "standard");
    assert_eq!(monthly["plans"][0]["publicOnMainPricingPage"], true);
    assert_eq!(monthly["plans"][0]["paymentMethods"], json!(["stripe"]));
    assert!(!monthly.to_string().contains("privateValue"));

    let mut annual = req(
        ids::ROUTE_SUBSCRIPTION_PLANS,
        "GET",
        "/paywall/v1/subscription/plans",
    );
    annual.query = vec![("interval".into(), "year".into())];
    let annual = body(&handle(&s, &annual).unwrap());
    assert_eq!(annual["plans"].as_array().unwrap().len(), 2);
    assert_eq!(annual["plans"][0]["planId"], "free");
    let annual = json!({"plans": [annual["plans"][1].clone()]});
    assert_eq!(annual["plans"][0]["priceCents"], 22800);
    assert_eq!(annual["plans"][0]["interval"], "yearly");
}

#[test]
fn checkout_resolves_mcp_catalog_product_before_legacy_settings() {
    let s = FakeSeams::new();
    set_settings(&s);
    seed_catalog_plan(&s, "pro", true, true);

    let plan = support::resolve_plan(&s, "pro", "monthly").unwrap();
    assert_eq!(plan.price_cents, 2900);
    assert_eq!(plan.price_id.as_deref(), Some("pro-pro-monthly"));
}

#[test]
fn mcp_catalog_plan_fails_closed_when_product_or_price_is_not_purchasable() {
    let s = FakeSeams::new();
    seed_catalog_plan(&s, "private", false, false);
    seed_catalog_plan(&s, "draft-price", true, true);
    let mut draft_price = s.get_entry(ids::MODEL_CATALOG, "draft-price").unwrap();
    draft_price["prices"][0]["status"] = json!("draft");
    draft_price["prices"][0]["active"] = json!(false);
    draft_price["prices"][0]["public"] = json!(false);
    draft_price["prices"][0]["purchasable"] = json!(false);
    s.seed(ids::MODEL_CATALOG, "draft-price", draft_price);

    let r = req(
        ids::ROUTE_SUBSCRIPTION_PLANS,
        "GET",
        "/paywall/v1/subscription/plans",
    );
    let out = body(&handle(&s, &r).unwrap());
    assert_eq!(out["enabled"], false);
    assert_eq!(out["plans"], json!([]));
}

#[test]
fn free_selection_requires_verified_user_and_is_idempotent() {
    let s = FakeSeams::new();
    set_settings(&s);
    configure_login(&s, "user_1");
    let mut r = req(
        ids::ROUTE_SUBSCRIPTION_FREE_SELECTION,
        "POST",
        "/paywall/v1/subscription/free-selection",
    );
    r.body = json!({ "planId": "free", "userId": "user_1" }).to_string();

    let first = handle(&s, &r).unwrap();
    let first_body = body(&first);
    assert_eq!(first_body["complete"], true);
    assert_eq!(first_body["status"], "free_selected");
    assert_eq!(s.entry_count(ids::MODEL_SUBSCRIPTIONS), 1);

    configure_login(&s, "user_1");
    let second = handle(&s, &r).unwrap();
    assert_eq!(
        body(&second)["subscriptionId"],
        first_body["subscriptionId"]
    );
    assert_eq!(s.entry_count(ids::MODEL_SUBSCRIPTIONS), 1);
}

#[test]
fn free_selection_uses_listed_settings_plan_when_non_plan_catalog_record_shares_id() {
    let s = FakeSeams::new();
    set_settings(&s);
    configure_login(&s, "user_1");
    s.seed(
        ids::MODEL_CATALOG,
        "free",
        json!({
            "id": "free",
            "recordType": "product",
            "active": true,
            "public": false,
            "purchasable": false,
            "productType": "subscription",
            "prices": []
        }),
    );
    let mut r = req(
        ids::ROUTE_SUBSCRIPTION_FREE_SELECTION,
        "POST",
        "/paywall/v1/subscription/free-selection",
    );
    r.body = json!({ "planId": "free", "userId": "user_1" }).to_string();

    let out = body(&handle(&s, &r).unwrap());

    assert_eq!(out["complete"], true);
    assert_eq!(out["planId"], "free");
    assert_eq!(out["status"], "free_selected");
}

#[test]
fn free_selection_rejects_private_plan_before_writing() {
    let s = FakeSeams::new();
    set_settings(&s);
    configure_login(&s, "user_1");
    let mut r = req(
        ids::ROUTE_SUBSCRIPTION_FREE_SELECTION,
        "POST",
        "/paywall/v1/subscription/free-selection",
    );
    r.body = json!({ "planId": "hidden_free", "userId": "user_1" }).to_string();

    let err = handle(&s, &r).unwrap_err();
    assert_eq!(err.status, 422);
    assert_eq!(s.entry_count(ids::MODEL_SUBSCRIPTIONS), 0);
}

#[test]
fn free_selection_rejects_mismatched_user_before_writing() {
    let s = FakeSeams::new();
    set_settings(&s);
    configure_login(&s, "user_1");
    let mut r = req(
        ids::ROUTE_SUBSCRIPTION_FREE_SELECTION,
        "POST",
        "/paywall/v1/subscription/free-selection",
    );
    r.body = json!({ "planId": "free", "userId": "user_2" }).to_string();

    let err = handle(&s, &r).unwrap_err();
    assert_eq!(err.status, 401);
    assert_eq!(s.entry_count(ids::MODEL_SUBSCRIPTIONS), 0);
}

#[test]
fn selection_status_returns_only_the_verified_users_selection() {
    let s = FakeSeams::new();
    configure_login(&s, "user_1");
    s.seed(
        ids::MODEL_SUBSCRIPTIONS,
        "sub_other",
        json!({
            "subscriptionId": "sub_other",
            "customerRef": "user_2",
            "priceId": "pro",
            "status": "active",
            "provider": "stripe",
            "currentPeriodEnd": "2030-01-01T00:00:00Z",
            "cancelAtPeriodEnd": false,
            "createdAt": "2026-01-01T00:00:00Z",
            "updatedAt": "2026-01-01T00:00:00Z"
        }),
    );
    s.seed(
        ids::MODEL_SUBSCRIPTIONS,
        "sub_own",
        json!({
            "subscriptionId": "sub_own",
            "customerRef": "user_1",
            "priceId": "pro",
            "status": "active",
            "provider": "stripe",
            "currentPeriodEnd": "2030-01-01T00:00:00Z",
            "cancelAtPeriodEnd": false,
            "createdAt": "2026-01-01T00:00:00Z",
            "updatedAt": "2026-01-01T00:00:00Z"
        }),
    );
    let mut r = req(
        ids::ROUTE_SUBSCRIPTION_SELECTION_STATUS,
        "GET",
        "/paywall/v1/subscription/selection-status",
    );
    r.query = vec![("userId".into(), "user_1".into())];

    let resp = handle(&s, &r).unwrap();
    let out = body(&resp);
    assert_eq!(out["complete"], true);
    assert_eq!(out["subscriptionId"], "sub_own");
}

#[test]
fn capacity_add_ons_are_not_selectable_base_plans() {
    for handle in [
        "cedros-addon-sites",
        "cedros-addon-managed-capacity",
        "cedros-addon-campaign-email",
        "custom-capacity",
    ] {
        let s = FakeSeams::new();
        seed_catalog_plan(&s, handle, true, true);
        let mut product = s.get_entry(ids::MODEL_CATALOG, handle).unwrap();
        product["productType"] = json!("capacityAddOn");
        s.seed(ids::MODEL_CATALOG, handle, product);
        seed_catalog_plan(&s, "cedros-individual", true, true);

        let response = handle_plans_for_capacity_test(&s);
        assert_eq!(response["plans"].as_array().unwrap().len(), 1);
        assert_eq!(response["plans"][0]["planId"], "cedros-individual");

        // A legacy settings collision must not turn capacity into a free base plan.
        s.set_setting(
            SETTINGS_KEY,
            &json!({
                "enabled": true,
                "plans": [{ "id": handle, "priceMonthlyUsd": 0, "isActive": true }]
            })
            .to_string(),
        );
        assert_eq!(
            resolve_plan(&s, handle, "monthly").err().unwrap().status,
            422
        );
        assert_eq!(
            resolve_plan(&s, handle, "yearly").err().unwrap().status,
            422
        );
        assert_eq!(s.http_requests.borrow().len(), 0);
        assert_eq!(s.entry_count(ids::MODEL_SUBSCRIPTIONS), 0);
    }
}

fn handle_plans_for_capacity_test(s: &FakeSeams) -> Value {
    body(
        &handle(
            s,
            &req(
                ids::ROUTE_SUBSCRIPTION_PLANS,
                "GET",
                "/paywall/v1/subscription/plans",
            ),
        )
        .unwrap(),
    )
}

#[test]
fn reserved_capacity_handles_cannot_fall_back_to_legacy_settings() {
    let s = FakeSeams::new();
    s.set_setting(
        SETTINGS_KEY,
        &json!({
            "enabled": true,
            "plans": [{ "id": "cedros-addon-sites", "isActive": true, "priceMonthlyUsd": 0 }]
        })
        .to_string(),
    );
    assert_eq!(handle_plans_for_capacity_test(&s)["plans"], json!([]));
    assert_eq!(
        resolve_plan(&s, "cedros-addon-sites", "monthly")
            .err()
            .unwrap()
            .status,
        422
    );

    s.seed(
        ids::MODEL_CATALOG,
        "custom-capacity",
        json!({
            "id": "custom-capacity", "productType": "capacityAddOn"
        }),
    );
    s.set_setting(
        SETTINGS_KEY,
        &json!({
            "enabled": true,
            "plans": [{ "id": "custom-capacity", "isActive": true, "priceMonthlyUsd": 0 }]
        })
        .to_string(),
    );
    assert_eq!(handle_plans_for_capacity_test(&s)["plans"], json!([]));
}

#[test]
fn capacity_subscriptions_never_complete_or_replace_base_selection() {
    for (field, reference) in [
        ("priceId", "cedros-addon-sites"),
        ("productId", "cedros-addon-managed-capacity"),
        ("planId", "cedros-addon-campaign-email"),
        ("priceId", "custom-capacity"),
        ("priceId", "price_capacity"),
    ] {
        for with_base in [false, true] {
            let s = FakeSeams::new();
            configure_login(&s, "user_1");
            s.seed(
                ids::MODEL_CATALOG,
                "custom-capacity",
                json!({
                    "id": "custom-capacity", "productType": "capacityAddOn",
                    "prices": [{ "stripePriceId": "price_capacity" }]
                }),
            );
            let mut addon = json!({
                "subscriptionId": "a_addon", "customerRef": "user_1",
                "status": "active", "provider": "stripe",
                "currentPeriodEnd": "2030-01-01T00:00:00Z"
            });
            addon[field] = json!(reference);
            s.seed(ids::MODEL_SUBSCRIPTIONS, "a_addon", addon);
            if with_base {
                s.seed(
                    ids::MODEL_SUBSCRIPTIONS,
                    "z_base",
                    json!({
                        "subscriptionId": "z_base", "customerRef": "user_1",
                        "priceId": "pro", "status": "active", "provider": "stripe",
                        "currentPeriodEnd": "2030-01-01T00:00:00Z"
                    }),
                );
            }
            let mut r = req(
                ids::ROUTE_SUBSCRIPTION_SELECTION_STATUS,
                "GET",
                "/paywall/v1/subscription/selection-status",
            );
            r.query = vec![("userId".into(), "user_1".into())];
            let response = body(&handle(&s, &r).unwrap());
            assert_eq!(response["complete"], with_base, "{field}: {reference}");
            if with_base {
                assert_eq!(response["subscriptionId"], "z_base");
            } else {
                assert_eq!(response["status"], "no_selection");
            }
        }
    }
}

#[test]
fn selection_status_accepts_exact_login_extension_service_identity() {
    let s = FakeSeams::new();
    s.seed(
        ids::MODEL_SUBSCRIPTIONS,
        "sub_own",
        json!({
            "subscriptionId": "sub_own",
            "customerRef": "user_1",
            "priceId": "free",
            "status": "active",
            "provider": "free",
            "currentPeriodEnd": "2030-01-01T00:00:00Z",
            "cancelAtPeriodEnd": false,
            "createdAt": "2026-01-01T00:00:00Z",
            "updatedAt": "2026-01-01T00:00:00Z"
        }),
    );
    let mut r = req(
        ids::ROUTE_SUBSCRIPTION_SELECTION_STATUS,
        "GET",
        "/paywall/v1/subscription/selection-status",
    );
    r.headers.clear();
    r.query = vec![("userId".into(), "user_1".into())];
    r.context_json = json!({
        "authenticated": true,
        "authScheme": "extension-service",
        "actorId": "cedros-login",
        "principalId": "cedros-login",
        "permissionClaims": ["cedros-pay:subscription-read"]
    })
    .to_string();

    let out = body(&handle(&s, &r).unwrap());
    assert_eq!(out["complete"], true);
    assert_eq!(out["subscriptionId"], "sub_own");
}

#[test]
fn selection_status_rejects_inexact_extension_service_identity() {
    let s = FakeSeams::new();
    for context in [
        json!({
            "authenticated": true,
            "authScheme": "extension-service",
            "actorId": "another-extension",
            "principalId": "another-extension",
            "permissionClaims": ["cedros-pay:subscription-read"]
        }),
        json!({
            "authenticated": true,
            "authScheme": "extension-service",
            "actorId": "cedros-login",
            "principalId": "cedros-login",
            "permissionClaims": ["cedros-pay:subscription-read", "extra"]
        }),
    ] {
        let mut r = req(
            ids::ROUTE_SUBSCRIPTION_SELECTION_STATUS,
            "GET",
            "/paywall/v1/subscription/selection-status",
        );
        r.headers.clear();
        r.query = vec![("userId".into(), "user_1".into())];
        r.context_json = context.to_string();

        let err = handle(&s, &r).unwrap_err();
        assert_eq!(err.status, 401);
    }
}

#[test]
fn selection_status_projects_only_configured_plan_entitlements() {
    let s = FakeSeams::new();
    configure_login(&s, "user_1");
    s.seed(
        ids::MODEL_CATALOG,
        "cedros-individual",
        json!({
            "id": "cedros-individual",
            "metadata": {
                "buyerEmail": "buyer@example.com",
                "entitlements": {
                    "cedros.portal.siteQuantity": 1,
                    "email.monthlySends": 10000,
                    "apiSecret": "do-not-return",
                    "apiKey": "do-not-return",
                    "bearerToken": "do-not-return",
                    "private-key": "do-not-return",
                    "nested": { "clientToken": "do-not-return", "enabled": true }
                }
            }
        }),
    );
    s.seed(
        ids::MODEL_SUBSCRIPTIONS,
        "sub_own",
        json!({
            "subscriptionId": "sub_own",
            "customerRef": "user_1",
            "productId": "cedros-individual",
            "status": "active",
            "provider": "stripe",
            "currentPeriodEnd": "2030-01-01T00:00:00Z",
            "cancelAtPeriodEnd": false,
            "createdAt": "2026-01-01T00:00:00Z",
            "updatedAt": "2026-01-01T00:00:00Z"
        }),
    );
    let mut r = req(
        ids::ROUTE_SUBSCRIPTION_SELECTION_STATUS,
        "GET",
        "/paywall/v1/subscription/selection-status",
    );
    r.query = vec![("userId".into(), "user_1".into())];

    let out = body(&handle(&s, &r).unwrap());

    assert_eq!(out["entitlements"]["cedros.portal.siteQuantity"], 1);
    assert_eq!(out["entitlements"]["email.monthlySends"], 10000);
    assert_eq!(out["entitlements"]["nested"]["enabled"], true);
    assert!(!out.to_string().contains("buyer@example.com"));
    assert!(!out.to_string().contains("do-not-return"));
    assert!(out["entitlements"].get("apiKey").is_none());
    assert!(out["entitlements"].get("bearerToken").is_none());
    assert!(out["entitlements"].get("private-key").is_none());
    assert!(out["entitlements"]["nested"].get("clientToken").is_none());
}

#[test]
fn selection_status_requires_parseable_future_period_end() {
    let s = FakeSeams::new();
    configure_login(&s, "user_1");
    s.seed(
        ids::MODEL_SUBSCRIPTIONS,
        "sub_missing_end",
        json!({
            "subscriptionId": "sub_missing_end",
            "customerRef": "user_1",
            "priceId": "pro",
            "status": "active",
            "provider": "stripe",
            "cancelAtPeriodEnd": false,
            "createdAt": "2026-01-01T00:00:00Z",
            "updatedAt": "2026-01-01T00:00:00Z"
        }),
    );
    s.seed(
        ids::MODEL_SUBSCRIPTIONS,
        "sub_invalid_end",
        json!({
            "subscriptionId": "sub_invalid_end",
            "customerRef": "user_1",
            "priceId": "pro",
            "status": "active",
            "provider": "stripe",
            "currentPeriodEnd": "not-a-date",
            "cancelAtPeriodEnd": false,
            "createdAt": "2026-01-02T00:00:00Z",
            "updatedAt": "2026-01-02T00:00:00Z"
        }),
    );
    let mut r = req(
        ids::ROUTE_SUBSCRIPTION_SELECTION_STATUS,
        "GET",
        "/paywall/v1/subscription/selection-status",
    );
    r.query = vec![("userId".into(), "user_1".into())];

    let resp = handle(&s, &r).unwrap();
    let out = body(&resp);
    assert_eq!(out["complete"], false);
    assert_eq!(out["selection"], "incomplete");
}

#[test]
fn paid_plan_session_uses_stripe_price_and_trusted_metadata() {
    let s = FakeSeams::new();
    set_settings(&s);
    configure_stripe(&s);
    configure_login(&s, "user_1");
    s.push_http_response(200, r#"{"discount":null}"#);
    s.push_http_response(200, r#"{"data":[{"id":"promo_123","active":true}]}"#);
    s.push_http_response(
        200,
        r#"{"id":"cs_123","url":"https://checkout.stripe.com/cs_123"}"#,
    );
    let mut r = req(
        ids::ROUTE_SUBSCRIPTION_PLAN_STRIPE_SESSION,
        "POST",
        "/paywall/v1/subscription/plan/stripe-session",
    );
    r.context_json = r#"{"siteId":"site-a","idempotencyKey":"idem_123"}"#.into();
    r.body = json!({
        "planId": "pro",
        "interval": "yearly",
        "customerEmail": "buyer@example.com",
        "couponCode": "SAVE10",
        "metadata": { "user_id": "attacker", "campaign": "summer" }
    })
    .to_string();

    let resp = handle(&s, &r).unwrap();
    assert_eq!(body(&resp)["sessionId"], "cs_123");
    let requests = s.http_requests.borrow();
    assert_eq!(
        requests[2]["url"],
        "https://api.stripe.com/v1/promotion_codes?code=SAVE10&active=true&limit=1"
    );
    let checkout = requests[3]["body"].as_str().unwrap();
    assert!(checkout.contains(&format!(
        "expires_at={}",
        s.now_unix_secs() + checkout_api::SESSION_TTL_SECONDS
    )));
    assert!(checkout.contains("line_items%5B0%5D%5Bprice%5D=price_year"));
    assert!(checkout.contains("metadata%5Buser_id%5D=user_1"));
    assert!(!checkout.contains("metadata%5Buser_id%5D=attacker"));
    assert!(checkout.contains("subscription_data%5Bmetadata%5D%5Bplan_id%5D=pro"));
    assert!(checkout.contains("subscription_data%5Btrial_period_days%5D=3"));
    assert!(checkout.contains("discounts%5B0%5D%5Bpromotion_code%5D=promo_123"));
    assert!(checkout.contains("customer_email=buyer%40example.com"));
}

#[test]
fn paid_plan_session_requires_an_external_attempt_key_before_stripe_work() {
    let s = FakeSeams::new();
    set_settings(&s);
    configure_stripe(&s);
    configure_login(&s, "user_1");
    let mut request = req(
        ids::ROUTE_SUBSCRIPTION_PLAN_STRIPE_SESSION,
        "POST",
        "/paywall/v1/subscription/plan/stripe-session",
    );
    request.context_json.clear();
    request.body = json!({"planId":"pro","interval":"monthly"}).to_string();

    let error = handle(&s, &request).unwrap_err();

    assert_eq!(error.status, 400);
    assert_eq!(error.message, "idempotency key required");
    assert_eq!(s.http_requests.borrow().len(), 1, "only login auth runs");
}

#[test]
fn paid_mcp_catalog_plan_uses_server_controlled_inline_recurring_price() {
    let s = FakeSeams::new();
    seed_catalog_plan(&s, "cedros-individual", true, true);
    configure_stripe(&s);
    configure_login(&s, "user_1");
    s.push_http_response(200, r#"{"discount":null}"#);
    s.push_http_response(
        200,
        r#"{"id":"cs_catalog","url":"https://checkout.stripe.com/cs_catalog"}"#,
    );
    let mut r = req(
        ids::ROUTE_SUBSCRIPTION_PLAN_STRIPE_SESSION,
        "POST",
        "/paywall/v1/subscription/plan/stripe-session",
    );
    r.context_json = r#"{"siteId":"site-a","idempotencyKey":"idem_catalog"}"#.into();
    r.body = json!({
        "planId": "cedros-individual",
        "interval": "yearly",
        "customerEmail": "buyer@example.com",
        "metadata": { "user_id": "attacker" }
    })
    .to_string();

    let response = handle(&s, &r).unwrap();
    assert_eq!(body(&response)["sessionId"], "cs_catalog");
    let requests = s.http_requests.borrow();
    let checkout = requests.last().unwrap()["body"].as_str().unwrap();
    assert!(checkout.contains("unit_amount%5D=22800"));
    assert!(checkout.contains("recurring%5D%5Binterval%5D=year"));
    assert!(checkout.contains("trial_period_days%5D=3"));
    assert!(checkout.contains("metadata%5Bplan_id%5D=cedros-individual"));
    assert!(checkout.contains(
        "subscription_data%5Bmetadata%5D%5Bcatalog_price_id%5D=cedros-individual-cedros-individual-annual"
    ));
    assert!(checkout.contains("subscription_data%5Bmetadata%5D%5Buser_id%5D=user_1"));
    assert!(!checkout.contains("attacker"));
}

fn seed_program_pricing(s: &FakeSeams, expires_at: &str) {
    s.seed(
        ids::MODEL_CATALOG,
        "cedros-program-affiliate",
        json!({
            "recordType":"programEntitlement",
            "stableHandle":"cedros-program-affiliate",
            "accountModel":"individual",
            "status":"active",
            "pricing":{
                "configured":true,
                "currency":"USD",
                "monthly":{"unitAmountCents":1900},
                "annual":{"unitAmountCents":18000}
            }
        }),
    );
    s.seed(
        ids::MODEL_PROGRAM_ACCESS,
        &crate::routes::program_access::membership_key("user_1"),
        json!({
            "recordType":"programMembership",
            "subjectId":"user_1",
            "programHandle":"cedros-program-affiliate",
            "status":"active",
            "expiresAt":expires_at,
            "transitionPlanHandle":"cedros-individual"
        }),
    );
}

#[test]
fn individual_checkout_uses_identity_bound_program_price_without_stacking() {
    let s = FakeSeams::new();
    seed_catalog_plan(&s, "cedros-individual", true, true);
    seed_program_pricing(&s, "2099-01-01T00:00:00Z");
    configure_stripe(&s);
    configure_login(&s, "user_1");
    s.push_http_response(200, r#"{"discount":null}"#);
    s.push_http_response(
        200,
        r#"{"id":"cs_program","url":"https://checkout.stripe.com/cs_program"}"#,
    );
    let mut r = req(
        ids::ROUTE_SUBSCRIPTION_PLAN_STRIPE_SESSION,
        "POST",
        "/paywall/v1/subscription/plan/stripe-session",
    );
    r.body = json!({
        "planId": "cedros-individual",
        "interval": "yearly"
    })
    .to_string();

    let response = handle(&s, &r).unwrap();
    let response = body(&response);
    assert_eq!(response["originalPriceCents"], 22_800);
    assert_eq!(response["priceCents"], 18_000);
    assert_eq!(
        response["programPricing"]["programHandle"],
        "cedros-program-affiliate"
    );
    let requests = s.http_requests.borrow();
    let checkout = requests.last().unwrap()["body"].as_str().unwrap();
    assert!(checkout.contains("unit_amount%5D=18000"));
    assert!(checkout.contains(
        "subscription_data%5Bmetadata%5D%5Bprogram_entitlement%5D=cedros-program-affiliate"
    ));
    assert!(!checkout.contains("coupon"));
    assert!(!checkout.contains("promotion_code"));
}

#[test]
fn expired_program_membership_falls_back_to_individual_and_active_program_rejects_coupon() {
    let expired = FakeSeams::new();
    seed_catalog_plan(&expired, "cedros-individual", true, true);
    seed_program_pricing(&expired, "2020-01-01T00:00:00Z");
    configure_stripe(&expired);
    configure_login(&expired, "user_1");
    expired.push_http_response(200, r#"{"discount":null}"#);
    expired.push_http_response(
        200,
        r#"{"id":"cs_standard","url":"https://checkout.stripe.com/cs_standard"}"#,
    );
    let mut request = req(
        ids::ROUTE_SUBSCRIPTION_PLAN_STRIPE_SESSION,
        "POST",
        "/paywall/v1/subscription/plan/stripe-session",
    );
    request.body = json!({"planId":"cedros-individual","interval":"monthly"}).to_string();
    let response = body(&handle(&expired, &request).unwrap());
    assert_eq!(response["priceCents"], 2_900);
    assert!(response["programPricing"].is_null());

    let active = FakeSeams::new();
    seed_catalog_plan(&active, "cedros-individual", true, true);
    seed_program_pricing(&active, "2099-01-01T00:00:00Z");
    configure_stripe(&active);
    configure_login(&active, "user_1");
    active.push_http_response(200, r#"{"discount":null}"#);
    let mut request = req(
        ids::ROUTE_SUBSCRIPTION_PLAN_STRIPE_SESSION,
        "POST",
        "/paywall/v1/subscription/plan/stripe-session",
    );
    request.body = json!({
        "planId":"cedros-individual",
        "interval":"monthly",
        "couponCode":"SAVE10"
    })
    .to_string();
    let error = handle(&active, &request).unwrap_err();
    assert_eq!(error.status, 422);
    assert_eq!(active.http_requests.borrow().len(), 2);
}

#[test]
fn paid_mcp_catalog_plan_rejects_non_purchasable_plan_before_stripe_checkout() {
    let s = FakeSeams::new();
    seed_catalog_plan(&s, "invite-only", true, false);
    configure_stripe(&s);
    configure_login(&s, "user_1");
    let mut r = req(
        ids::ROUTE_SUBSCRIPTION_PLAN_STRIPE_SESSION,
        "POST",
        "/paywall/v1/subscription/plan/stripe-session",
    );
    r.body = json!({ "planId": "invite-only", "interval": "monthly" }).to_string();

    let err = handle(&s, &r).unwrap_err();
    assert_eq!(err.status, 422);
    assert_eq!(err.message, "plan is not purchasable");
    assert_eq!(s.http_requests.borrow().len(), 1);
}

#[test]
fn paid_plan_session_rejects_free_plan_before_stripe() {
    let s = FakeSeams::new();
    set_settings(&s);
    configure_stripe(&s);
    configure_login(&s, "user_1");
    let mut r = req(
        ids::ROUTE_SUBSCRIPTION_PLAN_STRIPE_SESSION,
        "POST",
        "/paywall/v1/subscription/plan/stripe-session",
    );
    r.body = json!({ "planId": "free", "interval": "monthly" }).to_string();

    let err = handle(&s, &r).unwrap_err();
    assert_eq!(err.status, 422);
    assert_eq!(s.http_requests.borrow().len(), 1);
}

#[test]
fn paid_plan_session_rejects_private_plan_before_stripe_checkout() {
    let s = FakeSeams::new();
    set_settings(&s);
    configure_stripe(&s);
    configure_login(&s, "user_1");
    let mut r = req(
        ids::ROUTE_SUBSCRIPTION_PLAN_STRIPE_SESSION,
        "POST",
        "/paywall/v1/subscription/plan/stripe-session",
    );
    r.body = json!({ "planId": "hidden_pro", "interval": "monthly" }).to_string();

    let err = handle(&s, &r).unwrap_err();
    assert_eq!(err.status, 422);
    assert_eq!(s.http_requests.borrow().len(), 1);
}

#[test]
fn solana_subscription_prepare_returns_derived_terms() {
    let s = FakeSeams::new();
    set_settings(&s);
    s.set_setting("x402.network", "devnet");
    configure_login(&s, "user_1");
    s.push_http_response(200, r#"{"discount":null}"#);
    let mut r = req(
        ids::ROUTE_SUBSCRIPTION_PLAN_SOLANA_SUBSCRIPTION,
        "POST",
        "/paywall/v1/subscription/plan/solana-subscription",
    );
    r.body = json!({
        "planId": "pro",
        "interval": "monthly",
        "wallet": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        "numberOfPayments": 6
    })
    .to_string();

    let resp = handle(&s, &r).unwrap();
    let out = body(&resp);
    assert_eq!(out["method"], "solana_subscription");
    assert_eq!(out["planId"], "pro");
    assert_eq!(out["userId"], "user_1");
    assert_eq!(out["network"], "devnet");
    assert_eq!(out["amountAtomic"], 12000000);
    assert_eq!(out["periodHours"], 720);
    assert_eq!(out["numberOfPayments"], 6);
    assert!(out["subscriptionAddress"].as_str().unwrap().len() > 30);
    assert!(out["subscriberTokenAccount"].as_str().unwrap().len() > 30);
}

#[test]
fn solana_subscription_prepare_rejects_invalid_wallet_before_writing() {
    let s = FakeSeams::new();
    set_settings(&s);
    configure_login(&s, "user_1");
    let mut r = req(
        ids::ROUTE_SUBSCRIPTION_PLAN_SOLANA_SUBSCRIPTION,
        "POST",
        "/paywall/v1/subscription/plan/solana-subscription",
    );
    r.body = json!({
        "planId": "pro",
        "interval": "monthly",
        "wallet": "not-base58"
    })
    .to_string();

    let err = handle(&s, &r).unwrap_err();
    assert_eq!(err.status, 422);
    assert_eq!(err.code, "invalid_wallet");
    assert_eq!(s.entry_count(ids::MODEL_SUBSCRIPTIONS), 0);
}

#[test]
fn router_dispatches_all_published_selection_routes() {
    let route_ids: BTreeSet<_> = ROUTES.iter().map(|route| route.route_id).collect();
    assert_eq!(
        route_ids,
        BTreeSet::from([
            ids::ROUTE_SUBSCRIPTION_SELECTION_STATUS,
            ids::ROUTE_SUBSCRIPTION_PLANS,
            ids::ROUTE_SUBSCRIPTION_FREE_SELECTION,
            ids::ROUTE_SUBSCRIPTION_PLAN_STRIPE_SESSION,
            ids::ROUTE_SUBSCRIPTION_PLAN_SOLANA_SUBSCRIPTION,
            ids::ROUTE_SUBSCRIPTION_SOLANA_SUBSCRIPTION_COLLECT_INITIAL,
            ids::ROUTE_SUBSCRIPTION_SOLANA_SUBSCRIPTION_ACTIVATE,
        ])
    );
}

#[test]
fn selection_status_resolves_stripe_price_to_the_catalog_plan() {
    for catalog_present in [true, false] {
        let s = FakeSeams::new();
        configure_login(&s, "user_1");
        if catalog_present {
            s.seed(
                ids::MODEL_CATALOG,
                "cedros-agency",
                json!({
                    "id": "cedros-agency",
                    "prices": [{"stripePriceId": "price_agency_monthly"}],
                    "metadata": {"entitlements": {"cedros.portal.siteQuantity": 5}}
                }),
            );
        }
        s.seed(
            ids::MODEL_SUBSCRIPTIONS,
            "sub_own",
            json!({
                "subscriptionId": "sub_own", "customerRef": "user_1",
                "priceId": "price_agency_monthly", "status": "active",
                "provider": "stripe", "currentPeriodEnd": "2030-01-01T00:00:00Z"
            }),
        );
        let mut r = req(
            ids::ROUTE_SUBSCRIPTION_SELECTION_STATUS,
            "GET",
            "/paywall/v1/subscription/selection-status",
        );
        r.query = vec![("userId".into(), "user_1".into())];
        let out = body(&handle(&s, &r).unwrap());
        let expected = if catalog_present {
            "cedros-agency"
        } else {
            "price_agency_monthly"
        };
        assert_eq!(out["planId"], expected);
        assert_eq!(out["resource"], expected);
        assert_eq!(out["subscriptionId"], "sub_own");
        assert_eq!(out["complete"], true);
        if catalog_present {
            assert_eq!(out["entitlements"]["cedros.portal.siteQuantity"], 5);
        } else {
            assert!(out.get("entitlements").is_none());
        }
    }
}
