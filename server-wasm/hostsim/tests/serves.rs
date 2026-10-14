//! End-to-end: load the compiled `cedros-extension.server.wasm` through real
//! Wasmtime component-model linking and prove it serves routes/jobs.
//!
//! Requires the component to be built first:
//!   cargo build -p cedros-pay-extension-guest --target wasm32-wasip2 --release
//! If it is absent, these tests fail so the suite cannot report runtime
//! coverage without actually loading the component. `make cedros-verify` builds
//! then runs these.

use cedros_pay_extension_domain::ids;
use cedros_pay_extension_hostsim::{component_path, Sim};
use serde_json::{json, Value};
use std::time::Instant;

/// Loads the component; fails closed if the runtime artifact is missing.
fn sim() -> Sim {
    let path = component_path();
    if !path.exists() {
        panic!(
            "component not built at {} - run `cargo build -p cedros-pay-extension-guest --target wasm32-wasip2 --release` or `make cedros-verify`",
            path.display()
        );
    }
    Sim::load(&path).expect("load component")
}

fn rt() -> tokio::runtime::Runtime {
    tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .unwrap()
}

fn admin_ctx(claims: &[&str]) -> String {
    json!({ "authenticated": true, "permissionClaims": claims }).to_string()
}

fn host_admin_ctx() -> String {
    json!({
        "actorId": "admin-user-1",
        "authenticated": true,
        "systemAdmin": true,
        "permissionClaims": [
            "manage_settings",
            "manage_users",
            "data:settings:read",
            "data:settings:write"
        ],
        "csrfVerified": true,
        "siteId": "site-1",
        "environment": "development"
    })
    .to_string()
}

#[test]
fn loads_and_lists_its_routes() {
    let sim = sim();
    let routes = rt().block_on(sim.list_routes()).expect("list_routes");
    let ids: Vec<&str> = routes.iter().map(|(id, _, _)| id.as_str()).collect();
    for expected in [
        ids::ROUTE_STATS,
        ids::ROUTE_CREDITS_BALANCE,
        ids::ROUTE_PAYMENTS,
        ids::ROUTE_PRODUCT_RAG_RECORDS,
        ids::ROUTE_SUBSCRIPTIONS_STATUS,
        ids::ROUTE_BUYER_SUBSCRIPTION_CANCEL,
        ids::ROUTE_BUYER_SUBSCRIPTION_PORTAL,
        ids::ROUTE_ASSISTANT_X402_PURCHASE,
        ids::ROUTE_ADMIN,
        ids::ROUTE_ADMIN_CONFIG_LIST,
        ids::ROUTE_ADMIN_CONFIG_HISTORY,
        ids::ROUTE_ADMIN_CONFIG_VALIDATE,
        ids::ROUTE_ADMIN_CONFIG_STRIPE_GET,
        ids::ROUTE_ADMIN_CONFIG_STRIPE_UPDATE,
        ids::ROUTE_ADMIN_CONFIG_X402_GET,
        ids::ROUTE_ADMIN_CONFIG_X402_UPDATE,
        ids::ROUTE_ADMIN_CONFIG_CEDROS_LOGIN_GET,
        ids::ROUTE_ADMIN_CONFIG_CEDROS_LOGIN_UPDATE,
        ids::ROUTE_ADMIN_CONFIG_NATIVE_STORE_GET,
        ids::ROUTE_ADMIN_CONFIG_NATIVE_STORE_UPDATE,
        ids::ROUTE_ADMIN_CONFIG_SHOP_GET,
        ids::ROUTE_ADMIN_CONFIG_SHOP_UPDATE,
        ids::ROUTE_ADMIN_CONFIG_SUBSCRIPTIONS_GET,
        ids::ROUTE_ADMIN_CONFIG_SUBSCRIPTIONS_UPDATE,
        ids::ROUTE_ADMIN_SHIPPING_PROFILES_LIST,
        ids::ROUTE_ADMIN_SHIPPING_PROFILES_CREATE,
        ids::ROUTE_ADMIN_SHIPPING_PROFILES_GET,
        ids::ROUTE_ADMIN_SHIPPING_PROFILES_UPDATE,
        ids::ROUTE_ADMIN_SHIPPING_PROFILES_DELETE,
        ids::ROUTE_ADMIN_SHIPPING_RATES_LIST,
        ids::ROUTE_ADMIN_SHIPPING_RATES_CREATE,
        ids::ROUTE_ADMIN_SHIPPING_RATES_UPDATE,
        ids::ROUTE_ADMIN_SHIPPING_RATES_DELETE,
        ids::ROUTE_ADMIN_TAX_RATES_LIST,
        ids::ROUTE_ADMIN_TAX_RATES_CREATE,
        ids::ROUTE_ADMIN_TAX_RATES_GET,
        ids::ROUTE_ADMIN_TAX_RATES_UPDATE,
        ids::ROUTE_ADMIN_TAX_RATES_DELETE,
        ids::ROUTE_ADMIN_SITE_SETTINGS_TIPPING_GET,
        ids::ROUTE_ADMIN_SITE_SETTINGS_TIPPING_UPDATE,
        ids::ROUTE_ADMIN_SITE_SETTINGS_MONETIZATION_GET,
        ids::ROUTE_ADMIN_SITE_SETTINGS_MONETIZATION_UPDATE,
    ] {
        assert!(
            ids.contains(&expected),
            "missing route {expected} in {ids:?}"
        );
    }
    for disabled in [
        ids::ROUTE_PAYWALL,
        ids::ROUTE_STRIPE_SESSION,
        ids::ROUTE_CART_QUOTE,
        ids::ROUTE_CART_GET,
        ids::ROUTE_CART_CHECKOUT,
        ids::ROUTE_DERIVE_TOKEN_ACCOUNT,
        ids::ROUTE_BLOCKHASH,
        ids::ROUTE_QUOTE,
        ids::ROUTE_VERIFY,
        ids::ROUTE_CREDITS_GRANT,
        ids::ROUTE_CREDITS_AUTHORIZE,
        ids::ROUTE_CREDITS_HOLD,
        ids::ROUTE_CREDITS_RELEASE,
        ids::ROUTE_CART_CREDITS_AUTHORIZE,
    ] {
        assert!(
            !ids.contains(&disabled),
            "conditional-write route {disabled} must not be mounted"
        );
    }
    // every served path is namespace-relative + absolute
    assert!(routes.iter().all(|(_, _, path)| path.starts_with('/')));
}

#[test]
fn loads_and_lists_its_jobs() {
    let sim = sim();
    let jobs = rt().block_on(sim.list_jobs()).expect("list_jobs");
    let ids: Vec<&str> = jobs.iter().map(String::as_str).collect();
    for expected in [
        ids::JOB_SANCTIONS_REFRESH,
        ids::JOB_SANCTIONS_SWEEP,
        ids::JOB_BALANCE_ALERT,
        ids::JOB_HEALTH_CHECK,
        ids::JOB_CLEANUP,
        ids::JOB_EMAIL,
        ids::JOB_STATS_ROLLUP,
        ids::JOB_WEBHOOK_DELIVERY,
        ids::JOB_SUBSCRIPTION_SYNC,
        ids::JOB_X402_RECONCILE,
    ] {
        assert!(ids.contains(&expected), "missing job {expected} in {ids:?}");
    }
}

#[test]
fn serves_admin_status_with_admin_claim() {
    let sim = sim();
    let (status, body) = rt()
        .block_on(sim.handle(
            "GET",
            "/admin/v1/status",
            ids::ROUTE_ADMIN,
            vec![],
            vec![],
            "",
            &admin_ctx(&[ids::ROUTE_ADMIN]),
        ))
        .unwrap();
    assert_eq!(status, 200, "body: {body}");
    assert_eq!(
        serde_json::from_str::<Value>(&body).unwrap()["runtime"],
        "wasm"
    );
}

#[test]
fn serves_pay_hub_config_with_host_admin_envelope() {
    let sim = sim();
    sim.store()
        .set_secret(ids::SECRET_STRIPE_KEY, "sk_live_component_secret");

    let (status, body) = rt()
        .block_on(sim.handle(
            "GET",
            "/admin/config/stripe",
            ids::ROUTE_ADMIN_CONFIG_STRIPE_GET,
            vec![],
            vec![],
            "",
            &host_admin_ctx(),
        ))
        .unwrap();

    assert_eq!(status, 200, "body: {body}");
    let body: Value = serde_json::from_str(&body).unwrap();
    assert_eq!(body["category"], "stripe");
    assert_eq!(body["config"]["secret_key"], "[REDACTED]");
    assert_eq!(body["secretsRedacted"], true);
}

#[test]
fn built_component_maps_login_inactive_and_active_sessions_normally() {
    let sim = sim();
    {
        let mut store = sim.store();
        store.set_setting("cedros_login.base_url", "https://site.example");
        store.push_http(401, r#"{"error":"unauthorized"}"#);
        store.push_http(200, r#"{"user":{"id":"buyer-1"}}"#);
    }
    let (inactive_status, inactive_body) = rt()
        .block_on(sim.handle(
            "GET",
            "/paywall/v1/purchases",
            ids::ROUTE_PURCHASES,
            vec![(
                "authorization".to_string(),
                "Bearer customer-session".to_string(),
            )],
            vec![],
            "",
            "",
        ))
        .unwrap();
    let (active_status, active_body) = rt()
        .block_on(sim.handle(
            "GET",
            "/paywall/v1/purchases",
            ids::ROUTE_PURCHASES,
            vec![(
                "authorization".to_string(),
                "Bearer customer-session".to_string(),
            )],
            vec![],
            "",
            "",
        ))
        .unwrap();

    assert_eq!(inactive_status, 401, "body: {inactive_body}");
    assert_eq!(active_status, 200, "body: {active_body}");
    assert_eq!(
        serde_json::from_str::<Value>(&active_body).unwrap()["purchases"],
        json!([])
    );
    assert_eq!(sim.store().http_fetch_calls, 2);
}

#[test]
fn built_component_does_not_advertise_plan_selection_without_public_plans() {
    let sim = sim();
    sim.store().set_setting(
        "subscriptions.settings",
        &json!({
            "enabled": true,
            "plans": [{
                "id": "private",
                "title": "Private",
                "priceMonthlyUsd": 10,
                "priceAnnualUsd": 100,
                "isActive": true,
                "public": false
            }]
        })
        .to_string(),
    );

    let (status, body) = rt()
        .block_on(sim.handle(
            "GET",
            "/paywall/v1/subscription/plans",
            ids::ROUTE_SUBSCRIPTION_PLANS,
            vec![],
            vec![("interval".to_string(), "monthly".to_string())],
            "",
            "",
        ))
        .unwrap();

    assert_eq!(status, 200, "body: {body}");
    let body: Value = serde_json::from_str(&body).unwrap();
    assert_eq!(body["configuredEnabled"], true);
    assert_eq!(body["enabled"], false);
    assert_eq!(body["unavailableReason"], "no_active_public_plans");
    assert_eq!(body["plans"], json!([]));
}

#[test]
fn serves_pay_hub_shop_config_with_host_admin_envelope() {
    let sim = sim();
    sim.store().set_setting("shop.refunds_enabled", "false");

    let (status, body) = rt()
        .block_on(sim.handle(
            "GET",
            "/admin/config/shop",
            ids::ROUTE_ADMIN_CONFIG_SHOP_GET,
            vec![],
            vec![],
            "",
            &host_admin_ctx(),
        ))
        .unwrap();

    assert_eq!(status, 200, "body: {body}");
    let body: Value = serde_json::from_str(&body).unwrap();
    assert_eq!(body["category"], "shop");
    assert_eq!(body["config"]["refunds_enabled"], false);
}

#[test]
#[ignore = "repeatable local benchmark harness for the built Wasm component"]
fn bench_component_invocations() {
    let sim = sim();
    let rt = rt();
    let list_start = Instant::now();
    for _ in 0..50 {
        rt.block_on(sim.list_routes()).expect("list_routes bench");
    }
    let list_elapsed = list_start.elapsed();
    let route_start = Instant::now();
    for _ in 0..50 {
        rt.block_on(sim.handle(
            "GET",
            "/admin/v1/status",
            ids::ROUTE_ADMIN,
            vec![],
            vec![],
            "",
            &admin_ctx(&[ids::ROUTE_ADMIN]),
        ))
        .expect("admin status bench");
    }
    println!(
        "bench_component_invocations list_routes_50={:?} admin_status_50={:?}",
        list_elapsed,
        route_start.elapsed()
    );
}

#[test]
fn serves_read_only_credits_balance() {
    let sim = sim();
    sim.store().set_secret(ids::SECRET_RP_TOKEN, "rp");
    sim.store().seed(
        ids::MODEL_CREDITS,
        "acct:u1",
        json!({
            "subjectId": "u1",
            "balanceCents": 1000,
            "heldCents": 250,
            "currency": "USD",
            "updatedAt": "2026-07-10T00:00:00Z"
        }),
    );
    let auth = || vec![("authorization".to_string(), "Bearer rp".to_string())];

    rt().block_on(async {
        let (status, body) = sim
            .handle(
                "GET",
                "/credits/v1/balance",
                ids::ROUTE_CREDITS_BALANCE,
                auth(),
                vec![("subjectId".to_string(), "u1".to_string())],
                "",
                "",
            )
            .await
            .expect("balance");
        assert_eq!(status, 200);
        assert_eq!(
            serde_json::from_str::<Value>(&body).unwrap()["balanceCents"],
            1000
        );
        assert_eq!(
            serde_json::from_str::<Value>(&body).unwrap()["availableCents"],
            750
        );
    });
}

#[test]
fn credits_without_token_fails_closed() {
    let sim = sim();
    sim.store().set_secret(ids::SECRET_RP_TOKEN, "rp");
    let (status, _) = rt()
        .block_on(sim.handle(
            "GET",
            "/credits/v1/balance",
            ids::ROUTE_CREDITS_BALANCE,
            vec![],
            vec![("subjectId".to_string(), "u1".to_string())],
            "",
            "",
        ))
        .unwrap();
    assert_eq!(status, 401);
}

#[test]
fn serves_payment_status() {
    let sim = sim();
    sim.store().set_secret(ids::SECRET_RP_TOKEN, "rp");
    sim.store().seed(
        ids::MODEL_LEDGER,
        "ord_1",
        json!({
            "reference": "ord_1", "kind": "payment", "status": "succeeded",
            "grossCents": 5000, "refundCents": 500, "currency": "USD",
            "provider": "stripe", "createdAt": "2026-05-31T10:00:00Z", "processedAt": "2026-05-31T10:00:00Z"
        }),
    );
    let (status, body) = rt()
        .block_on(sim.handle(
            "GET",
            "/payments/v1/status",
            ids::ROUTE_PAYMENTS,
            vec![("authorization".to_string(), "Bearer rp".to_string())],
            vec![("ref".to_string(), "ord_1".to_string())],
            "",
            "",
        ))
        .unwrap();
    assert_eq!(status, 200, "body: {body}");
    let v: Value = serde_json::from_str(&body).unwrap();
    assert_eq!(v["status"], "succeeded");
    assert_eq!(v["netCents"], 4500);
}

#[test]
fn rollup_job_then_stats_route_end_to_end() {
    let sim = sim();
    // a succeeded payment on a fixed past day (clock-independent)
    sim.store().seed(
        ids::MODEL_LEDGER,
        "p1",
        json!({
            "reference": "p1", "kind": "payment", "status": "succeeded",
            "grossCents": 4200, "refundCents": 0, "currency": "USD", "routePath": "/x",
            "provider": "stripe", "createdAt": "2020-06-15T10:00:00Z", "processedAt": "2020-06-15T10:00:00Z"
        }),
    );

    rt().block_on(async {
        // job rolls the day into the stats-rollup model
        let (job_status, details) = sim
            .run_job(
                ids::JOB_STATS_ROLLUP,
                &json!({ "day": "2020-06-15" }).to_string(),
                1,
            )
            .await
            .expect("rollup job");
        assert_eq!(job_status, "succeeded", "details: {details}");

        // stats route reads the rollup (PALL window includes the past day)
        let (status, body) = sim
            .handle(
                "GET",
                "/stats/v1/summary",
                ids::ROUTE_STATS,
                vec![],
                vec![
                    ("window".to_string(), "PALL".to_string()),
                    ("include".to_string(), "revenue".to_string()),
                ],
                "",
                &admin_ctx(&["cedros-pay:balance-read"]),
            )
            .await
            .expect("stats");
        assert_eq!(status, 200, "body: {body}");
        assert_eq!(
            serde_json::from_str::<Value>(&body).unwrap()["grossCents"],
            4200
        );
    });
}

#[test]
fn stats_unauthenticated_fails_closed() {
    let sim = sim();
    let (status, _) = rt()
        .block_on(sim.handle(
            "GET",
            "/stats/v1/summary",
            ids::ROUTE_STATS,
            vec![],
            vec![],
            "",
            &json!({ "authenticated": false }).to_string(),
        ))
        .unwrap();
    assert_eq!(status, 401);
}

#[test]
fn serves_read_only_subscription_status() {
    let sim = sim();
    sim.store().set_secret(ids::SECRET_RP_TOKEN, "rp");
    sim.store().seed(
        ids::MODEL_SUBSCRIPTIONS,
        "sub_1",
        json!({
            "subscriptionId": "sub_1", "customerRef": "cus_1", "priceId": "price_1",
            "status": "active", "provider": "stripe", "providerRef": "sub_1",
            "currentPeriodEnd": "2030-01-01T00:00:00Z", "cancelAtPeriodEnd": false,
            "createdAt": "2026-01-01T00:00:00Z", "updatedAt": "2026-01-01T00:00:00Z"
        }),
    );
    let auth = || vec![("authorization".to_string(), "Bearer rp".to_string())];
    rt().block_on(async {
        let (status, body) = sim
            .handle(
                "GET",
                "/subscription/v1/status",
                ids::ROUTE_SUBSCRIPTIONS_STATUS,
                auth(),
                vec![("subscriptionId".to_string(), "sub_1".to_string())],
                "",
                "",
            )
            .await
            .expect("status");
        assert_eq!(status, 200);
        assert_eq!(
            serde_json::from_str::<Value>(&body).unwrap()["status"],
            "active"
        );
    });
}
