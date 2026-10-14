//! Component-level proof that retired and marker-guarded mutations fail before
//! authentication, database mutation, HTTP egress, or provider execution.

use cedros_pay_extension_domain::ids;
use cedros_pay_extension_hostsim::{component_path, Sim};
use serde_json::Value;

fn sim() -> Sim {
    Sim::load(&component_path()).expect("load built component")
}

fn rt() -> tokio::runtime::Runtime {
    tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .expect("runtime")
}

#[test]
fn retired_and_marker_guarded_routes_fail_before_host_side_effects() {
    let sim = sim();
    for route_id in [
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
        let (status, _) = invoke(&sim, route_id);
        assert_eq!(status, 404, "{route_id}");
    }

    for route_id in [
        ids::ROUTE_WEBHOOKS,
        ids::ROUTE_SUBSCRIPTION_STRIPE_SESSION,
        ids::ROUTE_SUBSCRIPTION_FREE_SELECTION,
        ids::ROUTE_SUBSCRIPTION_PLAN_STRIPE_SESSION,
        ids::ROUTE_SUBSCRIPTION_SOLANA_SUBSCRIPTION_ACTIVATE,
        ids::ROUTE_REFUNDS_REQUEST,
        ids::ROUTE_NATIVE_STORE_VERIFY,
        ids::ROUTE_NATIVE_STORE_APPLE_NOTIFICATION,
        ids::ROUTE_NATIVE_STORE_GOOGLE_NOTIFICATION,
        ids::ROUTE_ADMIN_CREDIT_REFUNDS_PROCESS,
        ids::ROUTE_ADMIN_REFUNDS_PROCESS,
        ids::ROUTE_ADMIN_REFUNDS_DENY,
        ids::ROUTE_ADMIN_STRIPE_REFUNDS_PROCESS,
        ids::ROUTE_SUBSCRIPTIONS_CREATE,
        ids::ROUTE_SUBSCRIPTIONS_CANCEL,
        ids::ROUTE_SUBSCRIPTIONS_PORTAL,
    ] {
        let (status, body) = invoke(&sim, route_id);
        let body: Value = serde_json::from_str(&body).expect("error envelope");
        assert_eq!(status, 503, "{route_id}");
        assert_eq!(
            body["error"]["code"], "guarded_write_policy_unavailable",
            "{route_id}"
        );
    }

    let store = sim.store();
    assert_eq!(store.mutation_calls, 0);
    assert_eq!(store.http_fetch_calls, 0);
    assert_eq!(store.provider_calls, 0);
    assert!(store.events.is_empty());
    assert!(store.tags.is_empty());
}

#[test]
fn every_gated_job_fails_before_host_side_effects() {
    let sim = sim();
    for job_id in [
        ids::JOB_CLEANUP,
        ids::JOB_WEBHOOK_DELIVERY,
        ids::JOB_SUBSCRIPTION_SYNC,
        ids::JOB_X402_RECONCILE,
    ] {
        let (status, details) = rt()
            .block_on(sim.run_job(job_id, "{}", 1))
            .expect("direct job invocation");
        assert_eq!(status, "retryable", "{job_id}: {details}");
        assert!(details.contains("guarded-only database policy"), "{job_id}");
    }

    let store = sim.store();
    assert_eq!(store.mutation_calls, 0);
    assert_eq!(store.http_fetch_calls, 0);
    assert_eq!(store.provider_calls, 0);
    assert!(store.events.is_empty());
    assert!(store.tags.is_empty());
}

fn invoke(sim: &Sim, route_id: &str) -> (u16, String) {
    rt().block_on(sim.handle(
        "POST",
        "/must-not-dispatch",
        route_id,
        vec![],
        vec![],
        "not-json",
        "",
    ))
    .expect("direct invocation")
}
