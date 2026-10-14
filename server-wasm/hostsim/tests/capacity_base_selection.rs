//! Packaged-Wasm regressions for capacity/base-plan isolation. Fixture prices
//! are synthetic test data, not approved commercial offers.

use cedros_pay_extension_domain::{guarded_policy, ids};
use cedros_pay_extension_hostsim::{component_path, Sim};
use serde_json::{json, Value};

#[tokio::test(flavor = "current_thread")]
async fn capacity_preserves_base_selection_on_repeated_authenticated_reads() {
    let sim = Sim::load(&component_path()).expect("load built component");
    {
        let mut store = sim.store();
        store.set_setting("cedros_login.base_url", "https://site.example");
        for (id, user, plan) in [
            ("a_addon", "buyer-1", "cedros-addon-sites"),
            ("b_other_base", "buyer-2", "cedros-business"),
            ("z_base", "buyer-1", "cedros-individual"),
        ] {
            store.seed(
                ids::MODEL_SUBSCRIPTIONS,
                id,
                json!({
                    "subscriptionId": id, "customerRef": user, "priceId": plan,
                    "status": "active", "provider": "stripe",
                    "currentPeriodEnd": "2099-01-01T00:00:00Z"
                }),
            );
        }
        for _ in 0..2 {
            store.push_http(200, r#"{"user":{"id":"buyer-1"}}"#);
        }
    }
    for _ in 0..2 {
        let (status, body) = sim
            .handle(
                "GET",
                "/paywall/v1/subscription/selection-status",
                ids::ROUTE_SUBSCRIPTION_SELECTION_STATUS,
                vec![("authorization".into(), "Bearer fixture-session".into())],
                vec![("userId".into(), "buyer-1".into())],
                "",
                "{}",
            )
            .await
            .unwrap();
        assert_eq!(status, 200, "{body}");
        let body: Value = serde_json::from_str(&body).unwrap();
        assert_eq!(body["complete"], true);
        assert_eq!(body["subscriptionId"], "z_base");
        assert_eq!(body["planId"], "cedros-individual");
    }
    let (status, _) = sim
        .handle(
            "GET",
            "/paywall/v1/subscription/selection-status",
            ids::ROUTE_SUBSCRIPTION_SELECTION_STATUS,
            vec![],
            vec![("userId".into(), "buyer-1".into())],
            "",
            "{}",
        )
        .await
        .unwrap();
    assert_eq!(status, 401);
    assert_eq!(sim.store().mutation_calls, 0);
    assert_eq!(sim.store().http_fetch_calls, 2);
}

#[tokio::test(flavor = "current_thread")]
async fn capacity_is_not_published_as_a_base_plan_or_sold_by_unscoped_checkout() {
    let sim = Sim::load(&component_path()).expect("load built component");
    sim.store().seed(
        guarded_policy::CONTROL_MODEL,
        guarded_policy::MARKER_KEY,
        json!({
            "schemaVersion": 1,
            "capabilityId": guarded_policy::CAPABILITY_ID,
            "minCedrosDataVersion": guarded_policy::MIN_DATA_VERSION,
            "requestSchemaVersion": guarded_policy::REQUEST_SCHEMA_VERSION,
            "hostCommit": guarded_policy::HOST_COMMIT,
            "models": guarded_policy::GUARDED_MODELS,
            "modelSetSha256": guarded_policy::MODEL_SET_SHA256,
            "policy": guarded_policy::ACTIVE_POLICY,
            "active": true,
            "hostTimestamp": "2026-07-11T00:00:00Z"
        }),
    );
    let handle = "cedros-addon-sites";
    sim.store().seed(
        ids::MODEL_CATALOG,
        handle,
        json!({
            "id": handle, "stableHandle": handle, "productType": "capacityAddOn",
            "active": true, "public": true, "purchasable": true,
            "prices": [{
                "id": "fixture-monthly", "unitAmountCents": 100, "currency": "USD",
                "billingInterval": "month", "billingIntervalCount": 1,
                "active": true, "public": true, "purchasable": true
            }]
        }),
    );
    let (status, body) = sim
        .handle(
            "GET",
            "/paywall/v1/subscription/plans",
            ids::ROUTE_SUBSCRIPTION_PLANS,
            vec![],
            vec![],
            "",
            "{}",
        )
        .await
        .unwrap();
    assert_eq!(status, 200, "{body}");
    let body: Value = serde_json::from_str(&body).unwrap();
    assert_eq!(body["enabled"], false);
    assert_eq!(body["plans"], json!([]));
    for _ in 0..2 {
        let (status, body) = sim
            .handle(
                "POST",
                "/paywall/v1/subscription/stripe-session",
                ids::ROUTE_SUBSCRIPTION_STRIPE_SESSION,
                vec![],
                vec![],
                &json!({ "resource": handle }).to_string(),
                "{}",
            )
            .await
            .unwrap();
        assert_eq!(status, 422, "{body}");
    }
    assert_eq!(sim.store().mutation_calls, 0);
    assert_eq!(sim.store().http_fetch_calls, 0);
}
