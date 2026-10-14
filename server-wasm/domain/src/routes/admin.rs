//! `GET /admin/v1/status` — safe operator status for the Wasm backend.

use serde_json::json;

use crate::blockchain_config;
use crate::ctx::RequestContext;
use crate::error::{AppError, AppResult};
use crate::ids;
use crate::reqresp::{RouteRequest, RouteResponse, RouteSpec};
use crate::seams::HostSeams;

pub const ROUTES: &[RouteSpec] = &[RouteSpec {
    route_id: ids::ROUTE_ADMIN,
    method: "GET",
    path: "/admin/v1/status",
}];

pub fn handle<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    if !req.method.eq_ignore_ascii_case("GET") {
        return Err(AppError::not_found("unknown admin route"));
    }
    RequestContext::parse(&req.context_json).require_claim(ids::ROUTE_ADMIN)?;

    let guarded_policy_active = crate::guarded_policy::require_active(seams).is_ok();

    Ok(RouteResponse::ok(&json!({
        "extensionId": "cedros-pay",
        "version": env!("CARGO_PKG_VERSION"),
        "runtime": "wasm",
        "status": "ready",
        "launchStatus": if guarded_policy_active { "ready" } else { "blocked" },
        "guardedPolicy": {
            "active": guarded_policy_active,
            "modelCount": crate::guarded_policy::GUARDED_MODELS.len(),
            "modelSetSha256": crate::guarded_policy::MODEL_SET_SHA256,
        },
        "unsupportedRoutes": [],
        "unsupportedJobs": crate::jobs::managed::UNSUPPORTED_JOBS,
        "blockchainConfig": blockchain_config::read_status(seams),
        "routes": [
            ids::ROUTE_ADMIN,
            ids::ROUTE_ADMIN_STATS,
            ids::ROUTE_ADMIN_TRANSACTIONS_LIST,
            ids::ROUTE_ADMIN_ORDERS_LIST,
            ids::ROUTE_ADMIN_PRODUCTS_LIST,
            ids::ROUTE_ADMIN_COUPONS_LIST,
            ids::ROUTE_ADMIN_SUBSCRIPTIONS_SETTINGS_GET,
            ids::ROUTE_ADMIN_REFUNDS_LIST,
            ids::ROUTE_ADMIN_AFFILIATE_PAYOUTS_SETTLE,
            ids::ROUTE_ADMIN_RETURNS_LIST,
            ids::ROUTE_ADMIN_RETURNS_CREATE,
            ids::ROUTE_ADMIN_RETURNS_GET,
            ids::ROUTE_ADMIN_RETURNS_STATUS_UPDATE,
            ids::ROUTE_ADMIN_DISPUTES_LIST,
            ids::ROUTE_ADMIN_DISPUTES_GET,
            ids::ROUTE_ADMIN_DISPUTES_STATUS_UPDATE,
            ids::ROUTE_SUBSCRIPTIONS_STATUS,
            ids::ROUTE_STATS,
            ids::ROUTE_CREDITS_BALANCE,
            ids::ROUTE_PAYMENTS,
            ids::ROUTE_PRODUCT_RAG_RECORDS,
            ids::ROUTE_ENTITLEMENTS,
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
        ],
        "jobs": [
            ids::JOB_SANCTIONS_REFRESH,
            ids::JOB_SANCTIONS_SWEEP,
            ids::JOB_BALANCE_ALERT,
            ids::JOB_HEALTH_CHECK,
            ids::JOB_CLEANUP,
            ids::JOB_EMAIL,
            ids::JOB_STATS_ROLLUP,
            ids::JOB_SUBSCRIPTION_SYNC,
            ids::JOB_WEBHOOK_DELIVERY,
            ids::JOB_X402_RECONCILE,
        ]
    })))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::fake::FakeSeams;

    #[test]
    fn requires_admin_capability() {
        let s = FakeSeams::new();
        let req = RouteRequest {
            route_id: ids::ROUTE_ADMIN.into(),
            method: "GET".into(),
            path: "/admin/v1/status".into(),
            context_json: serde_json::json!({
                "authenticated": true,
                "permissionClaims": ["cedros-pay:balance-read"]
            })
            .to_string(),
            ..Default::default()
        };

        assert_eq!(crate::router::handle_route(&s, req).status, 403);
    }

    #[test]
    fn status_reads_blockchain_config_provider() {
        let s = FakeSeams::new();
        let req = RouteRequest {
            route_id: ids::ROUTE_ADMIN.into(),
            method: "GET".into(),
            path: "/admin/v1/status".into(),
            context_json: serde_json::json!({
                "authenticated": true,
                "permissionClaims": [ids::ROUTE_ADMIN]
            })
            .to_string(),
            ..Default::default()
        };

        let resp = crate::router::handle_route(&s, req);

        assert_eq!(resp.status, 200);
        let body: serde_json::Value = serde_json::from_str(&resp.body).unwrap();
        assert_eq!(body["version"], env!("CARGO_PKG_VERSION"));
        assert_eq!(body["launchStatus"], "blocked");
        assert_eq!(body["guardedPolicy"]["active"], false);
        assert_eq!(
            body["guardedPolicy"]["modelCount"],
            crate::guarded_policy::GUARDED_MODELS.len()
        );
        assert!(body["unsupportedRoutes"].as_array().unwrap().is_empty());
        assert_eq!(
            body["unsupportedJobs"],
            json!(crate::jobs::managed::UNSUPPORTED_JOBS)
        );
        assert!(body["jobs"]
            .as_array()
            .unwrap()
            .contains(&json!(ids::JOB_X402_RECONCILE)));
        assert_eq!(
            s.provider_requests.borrow()[0],
            (
                ids::PROVIDER_BLOCKCHAIN_CONFIG.to_string(),
                ids::PROVIDER_BLOCKCHAIN.to_string(),
                ids::OP_BLOCKCHAIN_CONFIG_READ.to_string(),
                serde_json::Value::Object(Default::default())
            )
        );
    }

    #[test]
    fn status_reports_ready_after_exact_guarded_policy_enrollment() {
        let s = FakeSeams::new();
        crate::guarded_policy::enroll(&s).unwrap();
        let req = RouteRequest {
            route_id: ids::ROUTE_ADMIN.into(),
            method: "GET".into(),
            path: "/admin/v1/status".into(),
            context_json: serde_json::json!({
                "authenticated": true,
                "permissionClaims": [ids::ROUTE_ADMIN]
            })
            .to_string(),
            ..Default::default()
        };

        let resp = crate::router::handle_route(&s, req);
        let body: serde_json::Value = serde_json::from_str(&resp.body).unwrap();

        assert_eq!(resp.status, 200);
        assert_eq!(body["launchStatus"], "ready");
        assert_eq!(body["guardedPolicy"]["active"], true);
    }
}
