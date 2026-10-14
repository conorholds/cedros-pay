//! Pay admin dashboard routes used by the bundled React admin module.

#[path = "admin_catalog_ai.rs"]
mod catalog_ai;
#[path = "admin_catalog_bridge.rs"]
mod catalog_bridge;
#[path = "admin_commerce_analytics.rs"]
mod commerce_analytics;
#[path = "admin_dashboard_coupons.rs"]
mod coupons;
#[path = "admin_dashboard_disputes.rs"]
pub(crate) mod disputes;
#[path = "admin_dashboard_handlers.rs"]
mod handlers;
#[path = "admin_dashboard_products.rs"]
mod products;
#[path = "admin_dashboard_refunds.rs"]
mod refunds;
#[path = "admin_dashboard_returns.rs"]
mod returns;
#[path = "admin_dashboard_subscriptions.rs"]
mod subscriptions;
#[path = "admin_dashboard_support.rs"]
mod support;
#[path = "admin_dashboard_support_catalog.rs"]
mod support_catalog;
#[path = "admin_dashboard_support_json.rs"]
mod support_json;
#[path = "admin_dashboard_support_ledger.rs"]
mod support_ledger;

use crate::ctx::RequestContext;
use crate::error::{AppError, AppResult};
use crate::ids;
use crate::reqresp::{RouteRequest, RouteResponse, RouteSpec};
use crate::seams::HostSeams;

pub const ROUTES: &[RouteSpec] = &[
    route(
        ids::ROUTE_ADMIN_CAPACITY_READ,
        "POST",
        "/admin/capacity/read",
    ),
    route(
        ids::ROUTE_ADMIN_CAPACITY_CONFIGURE,
        "POST",
        "/admin/capacity/configure",
    ),
    route(
        ids::ROUTE_ADMIN_CAPACITY_ENROLL,
        "POST",
        "/admin/capacity/enroll",
    ),
    route(
        ids::ROUTE_ADMIN_CAPACITY_ACTIVATE,
        "POST",
        "/admin/capacity/activate",
    ),
    route(
        ids::ROUTE_ADMIN_CAPACITY_COUPON_ENSURE,
        "POST",
        "/admin/capacity/coupon-ensure",
    ),
    route(ids::ROUTE_ADMIN_STATS, "GET", "/admin/stats"),
    route(
        ids::ROUTE_ADMIN_COMMERCE_ANALYTICS,
        "GET",
        "/admin/commerce-analytics",
    ),
    route(
        ids::ROUTE_ADMIN_COMMERCE_ANALYTICS_RECOVER,
        "POST",
        "/admin/commerce-analytics/abandoned-checkouts/{checkout_id}/recover",
    ),
    route(
        ids::ROUTE_ADMIN_TRANSACTIONS_LIST,
        "GET",
        "/admin/transactions",
    ),
    route(ids::ROUTE_ADMIN_ORDERS_LIST, "GET", "/admin/orders"),
    route(ids::ROUTE_ADMIN_ORDERS_GET, "GET", "/admin/orders/{id}"),
    route(ids::ROUTE_ADMIN_RETURNS_LIST, "GET", "/admin/returns"),
    route(ids::ROUTE_ADMIN_RETURNS_CREATE, "POST", "/admin/returns"),
    route(ids::ROUTE_ADMIN_RETURNS_GET, "GET", "/admin/returns/{id}"),
    route(
        ids::ROUTE_ADMIN_RETURNS_STATUS_UPDATE,
        "POST",
        "/admin/returns/{id}/status",
    ),
    route(ids::ROUTE_ADMIN_DISPUTES_LIST, "GET", "/admin/disputes"),
    route(ids::ROUTE_ADMIN_DISPUTES_GET, "GET", "/admin/disputes/{id}"),
    route(
        ids::ROUTE_ADMIN_DISPUTES_STATUS_UPDATE,
        "POST",
        "/admin/disputes/{id}/status",
    ),
    route(
        ids::ROUTE_ADMIN_CATALOG_READINESS,
        "GET",
        "/admin/catalog/readiness",
    ),
    route(
        ids::ROUTE_ADMIN_CATALOG_EXPORT,
        "GET",
        "/admin/catalog/exports/{channel}",
    ),
    route(
        ids::ROUTE_ADMIN_CATALOG_EXPORT_VALIDATE,
        "GET",
        "/admin/catalog/exports/{channel}/validate",
    ),
    route(
        ids::ROUTE_ADMIN_CATALOG_RECORDS_QUERY,
        "POST",
        "/admin/catalog/records/query",
    ),
    route(
        ids::ROUTE_ADMIN_CAPACITY_ACTIVATION_STATUS,
        "POST",
        "/admin/capacity/activation/status",
    ),
    route(
        ids::ROUTE_ADMIN_CAPACITY_TAX_READINESS,
        "POST",
        "/admin/capacity/tax/readiness",
    ),
    route(
        ids::ROUTE_ADMIN_CATALOG_PRODUCT_UPSERT,
        "PUT",
        "/admin/catalog/products/upsert",
    ),
    route(
        ids::ROUTE_ADMIN_CATALOG_PRODUCT_ACTIVE_SET,
        "POST",
        "/admin/catalog/products/active",
    ),
    route(
        ids::ROUTE_ADMIN_CATALOG_PRODUCT_DELETE,
        "POST",
        "/admin/catalog/products/delete",
    ),
    route(
        ids::ROUTE_ADMIN_CATALOG_PRICE_UPSERT,
        "PUT",
        "/admin/catalog/prices/upsert",
    ),
    route(
        ids::ROUTE_ADMIN_CATALOG_STRIPE_SYNC,
        "POST",
        "/admin/catalog/products/sync-stripe",
    ),
    route(
        ids::ROUTE_ADMIN_CATALOG_STRIPE_TAX_CODE_SET,
        "POST",
        "/admin/catalog/products/stripe-tax-code",
    ),
    route(
        ids::ROUTE_ADMIN_PROGRAM_ENTITLEMENT_UPSERT,
        "PUT",
        "/admin/catalog/program-entitlements/upsert",
    ),
    route(
        ids::ROUTE_ADMIN_PROGRAM_INVITE_UPSERT,
        "PUT",
        "/admin/catalog/program-invites/upsert",
    ),
    route(
        ids::ROUTE_ADMIN_PROGRAM_MEMBERSHIP_UPSERT,
        "PUT",
        "/admin/catalog/program-memberships/upsert",
    ),
    route(ids::ROUTE_ADMIN_PRODUCTS_LIST, "GET", "/admin/products"),
    route(ids::ROUTE_ADMIN_PRODUCTS_CREATE, "POST", "/admin/products"),
    route(
        ids::ROUTE_ADMIN_PRODUCTS_STRIPE_IMPORT_PREVIEW,
        "GET",
        "/admin/products/stripe-import-preview",
    ),
    route(
        ids::ROUTE_ADMIN_PRODUCTS_STRIPE_IMPORT,
        "POST",
        "/admin/products/import-stripe",
    ),
    route(ids::ROUTE_ADMIN_PRODUCTS_GET, "GET", "/admin/products/{id}"),
    route(
        ids::ROUTE_ADMIN_PRODUCTS_UPDATE,
        "PUT",
        "/admin/products/{id}",
    ),
    route(
        ids::ROUTE_ADMIN_PRODUCTS_DELETE,
        "DELETE",
        "/admin/products/{id}",
    ),
    route(
        ids::ROUTE_ADMIN_PRODUCTS_STRIPE_SYNC,
        "POST",
        "/admin/products/{id}/sync-stripe",
    ),
    route(
        ids::ROUTE_ADMIN_PRODUCT_INVENTORY_SET,
        "PUT",
        "/admin/products/{id}/inventory",
    ),
    route(
        ids::ROUTE_ADMIN_PRODUCT_INVENTORY_ADJUST,
        "POST",
        "/admin/products/{id}/inventory/adjust",
    ),
    route(
        ids::ROUTE_ADMIN_PRODUCT_INVENTORY_ADJUSTMENTS,
        "GET",
        "/admin/products/{id}/inventory/adjustments",
    ),
    route(
        ids::ROUTE_ADMIN_PRODUCT_VARIATIONS_GET,
        "GET",
        "/admin/products/{id}/variations",
    ),
    route(
        ids::ROUTE_ADMIN_PRODUCT_VARIATIONS_UPDATE,
        "PUT",
        "/admin/products/{id}/variations",
    ),
    route(
        ids::ROUTE_ADMIN_PRODUCT_VARIANT_INVENTORY_UPDATE,
        "PUT",
        "/admin/products/{id}/variants/inventory",
    ),
    route(ids::ROUTE_ADMIN_COUPONS_LIST, "GET", "/admin/coupons"),
    route(ids::ROUTE_ADMIN_COUPONS_CREATE, "POST", "/admin/coupons"),
    route(
        ids::ROUTE_ADMIN_COUPONS_UPDATE,
        "PUT",
        "/admin/coupons/{id}",
    ),
    route(
        ids::ROUTE_ADMIN_COUPONS_DELETE,
        "DELETE",
        "/admin/coupons/{id}",
    ),
    route(
        ids::ROUTE_ADMIN_SUBSCRIPTIONS_SETTINGS_GET,
        "GET",
        "/admin/subscriptions/settings",
    ),
    route(
        ids::ROUTE_ADMIN_SUBSCRIPTIONS_SETTINGS_UPDATE,
        "PUT",
        "/admin/subscriptions/settings",
    ),
    route(ids::ROUTE_ADMIN_REFUNDS_LIST, "GET", "/admin/refunds"),
    route(
        ids::ROUTE_ADMIN_CREDIT_REFUND_REQUESTS_LIST,
        "GET",
        "/admin/credits/refund-requests",
    ),
    route(
        ids::ROUTE_ADMIN_STRIPE_REFUNDS_LIST,
        "GET",
        "/admin/stripe/refunds",
    ),
    route(
        ids::ROUTE_ADMIN_STRIPE_REFUNDS_PROCESS,
        "POST",
        "/admin/stripe/refunds/{id}/process",
    ),
];

const fn route(route_id: &'static str, method: &'static str, path: &'static str) -> RouteSpec {
    RouteSpec {
        route_id,
        method,
        path,
    }
}

pub fn handle<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    let ctx = RequestContext::parse(&req.context_json);
    if is_ai_capability_route(&req.route_id) {
        ctx.require_claim_or_capability(ids::ROUTE_ADMIN, &req.route_id)?;
    } else {
        ctx.require_claim(ids::ROUTE_ADMIN)?;
    }
    dispatch(seams, req, &ctx)
}

fn dispatch<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
    ctx: &RequestContext,
) -> AppResult<RouteResponse> {
    match req.route_id.as_str() {
        id if crate::capacity::administration::is_route(id) => {
            crate::capacity::administration::handle(seams, req, ctx)
        }
        ids::ROUTE_ADMIN_STATS => handlers::stats(seams, req),
        id if is_commerce_analytics_route(id) => commerce_analytics::handle(seams, req, ctx),
        ids::ROUTE_ADMIN_TRANSACTIONS_LIST => handlers::transactions(seams, req),
        id if is_order_route(id) => handlers::handle_orders(seams, req),
        id if is_catalog_ai_route(id) => catalog_ai::handle(seams, req, ctx),
        id if is_catalog_bridge_route(id) => catalog_bridge::handle(seams, req, ctx),
        id if is_product_route(id) => handlers::handle_products(seams, req, ctx),
        id if is_coupon_route(id) => handlers::handle_coupons(seams, req, ctx),
        id if is_subscription_route(id) => handlers::handle_subscriptions(seams, req, ctx),
        id if is_refund_route(id) => handlers::handle_refunds(seams, req, ctx),
        id if is_return_route(id) => returns::handle(seams, req, ctx),
        id if is_dispute_route(id) => disputes::handle(seams, req, ctx),
        _ => Err(AppError::not_found("unknown admin dashboard route")),
    }
}

fn is_catalog_ai_route(route_id: &str) -> bool {
    matches!(
        route_id,
        ids::ROUTE_ADMIN_CATALOG_RECORDS_QUERY
            | ids::ROUTE_ADMIN_CAPACITY_ACTIVATION_STATUS
            | ids::ROUTE_ADMIN_CAPACITY_TAX_READINESS
            | ids::ROUTE_ADMIN_CATALOG_PRODUCT_UPSERT
            | ids::ROUTE_ADMIN_CATALOG_PRODUCT_ACTIVE_SET
            | ids::ROUTE_ADMIN_CATALOG_PRODUCT_DELETE
            | ids::ROUTE_ADMIN_CATALOG_PRICE_UPSERT
            | ids::ROUTE_ADMIN_PROGRAM_ENTITLEMENT_UPSERT
            | ids::ROUTE_ADMIN_PROGRAM_INVITE_UPSERT
            | ids::ROUTE_ADMIN_PROGRAM_MEMBERSHIP_UPSERT
    )
}

fn is_ai_capability_route(route_id: &str) -> bool {
    crate::capacity::administration::is_route(route_id)
        || is_catalog_ai_route(route_id)
        || matches!(
            route_id,
            ids::ROUTE_ADMIN_CATALOG_STRIPE_SYNC
                | ids::ROUTE_ADMIN_CATALOG_STRIPE_TAX_CODE_SET
                | ids::ROUTE_ADMIN_SUBSCRIPTIONS_SETTINGS_UPDATE
        )
}

fn is_commerce_analytics_route(route_id: &str) -> bool {
    matches!(
        route_id,
        ids::ROUTE_ADMIN_COMMERCE_ANALYTICS | ids::ROUTE_ADMIN_COMMERCE_ANALYTICS_RECOVER
    )
}

fn is_order_route(route_id: &str) -> bool {
    matches!(
        route_id,
        ids::ROUTE_ADMIN_ORDERS_LIST | ids::ROUTE_ADMIN_ORDERS_GET
    )
}

fn is_catalog_bridge_route(route_id: &str) -> bool {
    matches!(
        route_id,
        ids::ROUTE_ADMIN_CATALOG_READINESS
            | ids::ROUTE_ADMIN_CATALOG_EXPORT
            | ids::ROUTE_ADMIN_CATALOG_EXPORT_VALIDATE
            | ids::ROUTE_ADMIN_PRODUCTS_STRIPE_IMPORT_PREVIEW
            | ids::ROUTE_ADMIN_PRODUCTS_STRIPE_IMPORT
            | ids::ROUTE_ADMIN_PRODUCTS_STRIPE_SYNC
            | ids::ROUTE_ADMIN_CATALOG_STRIPE_SYNC
            | ids::ROUTE_ADMIN_CATALOG_STRIPE_TAX_CODE_SET
            | ids::ROUTE_ADMIN_PRODUCT_INVENTORY_SET
            | ids::ROUTE_ADMIN_PRODUCT_INVENTORY_ADJUST
    )
}

fn is_product_route(route_id: &str) -> bool {
    matches!(
        route_id,
        ids::ROUTE_ADMIN_PRODUCTS_LIST
            | ids::ROUTE_ADMIN_PRODUCTS_CREATE
            | ids::ROUTE_ADMIN_PRODUCTS_GET
            | ids::ROUTE_ADMIN_PRODUCTS_UPDATE
            | ids::ROUTE_ADMIN_PRODUCTS_DELETE
            | ids::ROUTE_ADMIN_PRODUCT_INVENTORY_ADJUSTMENTS
            | ids::ROUTE_ADMIN_PRODUCT_VARIATIONS_GET
            | ids::ROUTE_ADMIN_PRODUCT_VARIATIONS_UPDATE
            | ids::ROUTE_ADMIN_PRODUCT_VARIANT_INVENTORY_UPDATE
    )
}

fn is_coupon_route(route_id: &str) -> bool {
    matches!(
        route_id,
        ids::ROUTE_ADMIN_COUPONS_LIST
            | ids::ROUTE_ADMIN_COUPONS_CREATE
            | ids::ROUTE_ADMIN_COUPONS_UPDATE
            | ids::ROUTE_ADMIN_COUPONS_DELETE
    )
}

fn is_subscription_route(route_id: &str) -> bool {
    matches!(
        route_id,
        ids::ROUTE_ADMIN_SUBSCRIPTIONS_SETTINGS_GET
            | ids::ROUTE_ADMIN_SUBSCRIPTIONS_SETTINGS_UPDATE
    )
}

fn is_refund_route(route_id: &str) -> bool {
    matches!(
        route_id,
        ids::ROUTE_ADMIN_REFUNDS_LIST
            | ids::ROUTE_ADMIN_CREDIT_REFUND_REQUESTS_LIST
            | ids::ROUTE_ADMIN_STRIPE_REFUNDS_LIST
            | ids::ROUTE_ADMIN_STRIPE_REFUNDS_PROCESS
            | ids::ROUTE_ADMIN_CREDIT_REFUNDS_PROCESS
    )
}

fn is_return_route(route_id: &str) -> bool {
    matches!(
        route_id,
        ids::ROUTE_ADMIN_RETURNS_LIST
            | ids::ROUTE_ADMIN_RETURNS_CREATE
            | ids::ROUTE_ADMIN_RETURNS_GET
            | ids::ROUTE_ADMIN_RETURNS_STATUS_UPDATE
    )
}

fn is_dispute_route(route_id: &str) -> bool {
    matches!(
        route_id,
        ids::ROUTE_ADMIN_DISPUTES_LIST
            | ids::ROUTE_ADMIN_DISPUTES_GET
            | ids::ROUTE_ADMIN_DISPUTES_STATUS_UPDATE
    )
}

#[cfg(test)]
#[path = "admin_dashboard_tests.rs"]
mod tests;

#[cfg(test)]
#[path = "admin_dashboard_large_ledger_tests.rs"]
mod large_ledger_tests;

pub(crate) use catalog_bridge::stripe_sync::run_job as sync_stripe_catalog;
