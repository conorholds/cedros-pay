use std::cell::RefCell;

use serde_json::{json, Value};

use super::*;
use crate::seams::{HostError, HostResult};

struct BoundarySpy {
    marker: Option<Value>,
    calls: RefCell<Vec<String>>,
}

impl BoundarySpy {
    fn new(marker: Option<Value>) -> Self {
        Self {
            marker,
            calls: RefCell::new(Vec::new()),
        }
    }

    fn record(&self, call: &str) {
        self.calls.borrow_mut().push(call.into());
    }

    fn unavailable<T>(&self, call: &str) -> HostResult<T> {
        self.record(call);
        Err(HostError::new(format!("unexpected {call}")))
    }
}

impl HostSeams for BoundarySpy {
    fn log(&self, _level: &str, _message: &str) {
        self.record("log");
    }

    fn now_unix_secs(&self) -> i64 {
        1_781_256_000
    }

    fn db_read(&self, access: &str, model: &str, _query: &str) -> HostResult<String> {
        assert_eq!(access, ids::DB_ACCESS);
        assert_eq!(model, crate::guarded_policy::CONTROL_MODEL);
        self.record("marker_read");
        let entries = self.marker.iter().map(|payload| {
            json!({
                "entryKey": crate::guarded_policy::MARKER_KEY,
                "payload": payload,
                "updatedAt": "2026-07-11T00:00:00Z",
                "version": "marker-version",
            })
        });
        Ok(json!({ "entries": entries.collect::<Vec<_>>() }).to_string())
    }

    fn db_count(&self, _a: &str, _m: &str, _q: &str) -> HostResult<String> {
        self.unavailable("db_count")
    }

    fn db_write(&self, _a: &str, _m: &str, _k: &str, _d: &str) -> HostResult<String> {
        self.unavailable("db_write")
    }

    fn db_delete(&self, _a: &str, _m: &str, _k: &str) -> HostResult<String> {
        self.unavailable("db_delete")
    }

    fn db_batch(&self, _a: &str, _ops: &str) -> HostResult<String> {
        self.unavailable("db_batch")
    }

    fn db_migrate(&self, _a: &str, _m: &str, _mode: &str) -> HostResult<String> {
        self.unavailable("db_migrate")
    }

    fn setting_get(&self, _key: &str) -> HostResult<Option<String>> {
        self.unavailable("setting_get")
    }

    fn setting_set(&self, _key: &str, _value: &str) -> HostResult<()> {
        self.unavailable("setting_set")
    }

    fn settings_all(&self) -> HostResult<String> {
        self.unavailable("settings_all")
    }

    fn secret_get(&self, _key: &str) -> HostResult<Option<String>> {
        self.record("secret_get");
        Ok(None)
    }

    fn secret_set(&self, _key: &str, _value: &str) -> HostResult<()> {
        self.unavailable("secret_set")
    }

    fn secret_delete(&self, _key: &str) -> HostResult<bool> {
        self.unavailable("secret_delete")
    }

    fn emit_event(&self, _id: &str, _label: &str, _metadata: &str) -> HostResult<()> {
        self.unavailable("emit_event")
    }

    fn emit_record(&self, _c: &str, _t: &str, _x: &str, _p: &str) -> HostResult<()> {
        self.unavailable("emit_record")
    }

    fn tag_assign(&self, _a: &str, _p: &str, _s: &str, _j: &str) -> HostResult<String> {
        self.unavailable("tag_assign")
    }

    fn tag_unassign(&self, _a: &str, _p: &str, _s: &str) -> HostResult<String> {
        self.unavailable("tag_unassign")
    }

    fn tag_read(&self, _a: &str, _p: &str) -> HostResult<String> {
        self.unavailable("tag_read")
    }

    fn crm_submit(&self, _a: &str, _s: &str, _e: &str, _p: &str) -> HostResult<()> {
        self.unavailable("crm_submit")
    }

    fn provider_execute(
        &self,
        _access: &str,
        _provider: &str,
        _operation: &str,
        _payload: &str,
    ) -> HostResult<String> {
        self.unavailable("provider_execute")
    }

    fn http_fetch(&self, _request: &str) -> HostResult<String> {
        self.unavailable("http_fetch")
    }
}

#[test]
fn invalid_markers_fail_before_every_other_host_capability() {
    for marker in invalid_markers() {
        let seams = BoundarySpy::new(marker);
        let error = dispatch(&seams, &protected_route()).unwrap_err();
        assert_eq!(error.status, 503);
        assert_eq!(error.code, "guarded_write_policy_unavailable");
        assert_eq!(*seams.calls.borrow(), ["marker_read"]);
    }
}

#[test]
fn every_guarded_route_is_marker_first() {
    for route_id in guarded_route_ids() {
        let seams = BoundarySpy::new(None);
        let error = dispatch(
            &seams,
            &RouteRequest {
                route_id: route_id.into(),
                ..Default::default()
            },
        )
        .unwrap_err();
        assert_eq!(error.code, "guarded_write_policy_unavailable", "{route_id}");
        assert_eq!(*seams.calls.borrow(), ["marker_read"], "{route_id}");
    }
}

#[test]
fn exact_marker_is_read_before_the_protected_handler() {
    let seams = BoundarySpy::new(Some(exact_marker()));
    let error = dispatch(&seams, &protected_route()).unwrap_err();
    assert_ne!(error.code, "guarded_write_policy_unavailable");
    assert_eq!(*seams.calls.borrow(), ["marker_read", "secret_get"]);
}

#[test]
fn retired_routes_are_not_dispatched_and_have_zero_effects() {
    for route_id in super::contract_tests::retired_route_ids() {
        let seams = BoundarySpy::new(Some(exact_marker()));
        let error = dispatch(
            &seams,
            &RouteRequest {
                route_id: route_id.into(),
                method: "POST".into(),
                ..Default::default()
            },
        )
        .unwrap_err();
        assert_eq!(error.status, 404, "{route_id}");
        assert!(seams.calls.borrow().is_empty(), "{route_id}");
    }
}

#[test]
fn every_protected_job_reads_the_marker_first() {
    for job_id in [
        ids::JOB_CLEANUP,
        ids::JOB_WEBHOOK_DELIVERY,
        ids::JOB_CATALOG_SYNC,
        ids::JOB_SUBSCRIPTION_SYNC,
        ids::JOB_X402_RECONCILE,
    ] {
        let seams = BoundarySpy::new(None);
        let outcome = run_job(
            &seams,
            JobExecution {
                job_id: job_id.into(),
                ..Default::default()
            },
        );
        assert_eq!(outcome.status, crate::reqresp::JobStatus::Retryable);
        assert_eq!(*seams.calls.borrow(), ["marker_read", "log"], "{job_id}");
    }
}

fn guarded_route_ids() -> [&'static str; 31] {
    [
        ids::ROUTE_WEBHOOKS,
        ids::ROUTE_CHECKOUT_DESCRIPTOR,
        ids::ROUTE_CHECKOUT_QUOTE,
        ids::ROUTE_CHECKOUT_CREATE,
        ids::ROUTE_CHECKOUT_STATUS,
        ids::ROUTE_CHECKOUT_RESOLVE,
        ids::ROUTE_CHECKOUT_RETURN_VERIFY,
        ids::ROUTE_VERSIONED_CART_OPEN,
        ids::ROUTE_VERSIONED_CART_READ,
        ids::ROUTE_VERSIONED_CART_ROTATE,
        ids::ROUTE_VERSIONED_CART_APPLY,
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
        ids::ROUTE_ADMIN_RETURNS_CREATE,
        ids::ROUTE_ADMIN_RETURNS_STATUS_UPDATE,
        ids::ROUTE_ADMIN_DISPUTES_STATUS_UPDATE,
        ids::ROUTE_SUBSCRIPTIONS_CREATE,
        ids::ROUTE_SUBSCRIPTIONS_CANCEL,
        ids::ROUTE_SUBSCRIPTIONS_PORTAL,
        ids::ROUTE_BUYER_SUBSCRIPTION_CANCEL,
        ids::ROUTE_BUYER_SUBSCRIPTION_PORTAL,
    ]
}

fn protected_route() -> RouteRequest {
    RouteRequest {
        route_id: ids::ROUTE_WEBHOOKS.into(),
        method: "POST".into(),
        path: "/webhook/stripe".into(),
        ..Default::default()
    }
}

fn invalid_markers() -> Vec<Option<Value>> {
    let mut reordered = exact_marker();
    reordered["models"].as_array_mut().unwrap().swap(0, 1);
    let mut stale = exact_marker();
    stale["hostCommit"] = json!("stale-host");
    vec![
        None,
        Some(json!({ "schemaVersion": 1 })),
        Some(reordered),
        Some(stale),
    ]
}

fn exact_marker() -> Value {
    json!({
        "schemaVersion": 1,
        "capabilityId": crate::guarded_policy::CAPABILITY_ID,
        "minCedrosDataVersion": crate::guarded_policy::MIN_DATA_VERSION,
        "requestSchemaVersion": crate::guarded_policy::REQUEST_SCHEMA_VERSION,
        "hostCommit": crate::guarded_policy::HOST_COMMIT,
        "models": crate::guarded_policy::GUARDED_MODELS,
        "modelSetSha256": crate::guarded_policy::MODEL_SET_SHA256,
        "policy": crate::guarded_policy::ACTIVE_POLICY,
        "active": true,
        "hostTimestamp": "2026-07-11T00:00:00Z",
    })
}

#[test]
fn ucp_checkout_checks_activation_before_profiles_settings_or_payment_seams() {
    for route in crate::ucp::ROUTES {
        let public = route.route_id == crate::ucp::PROFILE_ROUTE
            || route.route_id.starts_with("cedros-pay:ucp-catalog-");
        assert_eq!(
            crate::conditional_mutations::route_policy(route.route_id),
            if public {
                crate::conditional_mutations::RoutePolicy::Unprotected
            } else {
                crate::conditional_mutations::RoutePolicy::Guarded
            }
        );
        if public {
            continue;
        }
        let seams = BoundarySpy::new(None);
        let error = dispatch(
            &seams,
            &RouteRequest {
                route_id: route.route_id.into(),
                method: route.method.into(),
                path: route.path.into(),
                ..Default::default()
            },
        )
        .unwrap_err();
        assert_eq!(error.status, 503);
        assert_eq!(*seams.calls.borrow(), ["marker_read"]);
    }
}
