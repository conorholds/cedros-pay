use serde_json::json;

use crate::ctx::RequestContext;
use crate::error::{AppError, AppResult};
use crate::ids;
use crate::reqresp::{RouteRequest, RouteResponse};
use crate::seams::HostSeams;
use crate::time;

use super::support::*;

#[path = "admin_catalog_inventory.rs"]
pub(super) mod inventory;
#[path = "admin_catalog_stripe_sync.rs"]
pub(super) mod stripe_sync;

pub(super) fn handle<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
    ctx: &RequestContext,
) -> AppResult<RouteResponse> {
    match req.route_id.as_str() {
        ids::ROUTE_ADMIN_CATALOG_READINESS => catalog_readiness(seams, req),
        ids::ROUTE_ADMIN_CATALOG_EXPORT => catalog_export(seams, req),
        ids::ROUTE_ADMIN_CATALOG_EXPORT_VALIDATE => catalog_export_validate(seams, req),
        ids::ROUTE_ADMIN_PRODUCTS_STRIPE_IMPORT_PREVIEW => stripe_import_preview(req),
        ids::ROUTE_ADMIN_PRODUCTS_STRIPE_IMPORT => stripe_import(req, ctx),
        ids::ROUTE_ADMIN_PRODUCTS_STRIPE_SYNC => stripe_sync::product(seams, req, ctx),
        ids::ROUTE_ADMIN_CATALOG_STRIPE_SYNC => stripe_sync::catalog_product(seams, req, ctx),
        ids::ROUTE_ADMIN_CATALOG_STRIPE_TAX_CODE_SET => stripe_sync::set_tax_code(seams, req, ctx),
        ids::ROUTE_ADMIN_PRODUCT_INVENTORY_SET => inventory::set(seams, req, ctx),
        ids::ROUTE_ADMIN_PRODUCT_INVENTORY_ADJUST => inventory::adjust(seams, req, ctx),
        _ => Err(AppError::not_found("unknown catalog bridge route")),
    }
}

fn catalog_readiness<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    require_match(req, "GET", "/admin/catalog/readiness")?;
    let products = product_values(seams)?;
    let product_count = products.len();
    let exportable_count = products
        .iter()
        .filter(|product| bool_field(product, "active", true))
        .count();

    Ok(RouteResponse::ok(&json!({
        "generatedAt": time::iso8601(seams.now_unix_secs()),
        "exportVersion": "wasm-admin-catalog",
        "productCount": product_count,
        "exportableCount": exportable_count,
        "blockedCount": 0,
        "missingCount": 0,
        "products": products.into_iter().map(|product| {
            json!({
                "productId": string_field(&product, "id").unwrap_or_default(),
                "channelStatus": {
                    "ucp": "ready",
                    "stripe": "ready",
                    "schema_org": "ready",
                },
                "diagnostics": [],
            })
        }).collect::<Vec<_>>()
    })))
}

fn catalog_export<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    require_method(req, "GET")?;
    let channel = path_id(&req.path, "/admin/catalog/exports/", None)?;
    Ok(RouteResponse::ok(&json!({
        "channel": channel,
        "products": product_values(seams)?,
    })))
}

fn catalog_export_validate<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
) -> AppResult<RouteResponse> {
    require_method(req, "GET")?;
    let channel = path_id(&req.path, "/admin/catalog/exports/", Some("/validate"))?;
    let product_count = product_values(seams)?.len();
    Ok(RouteResponse::ok(&json!({
        "generatedAt": time::iso8601(seams.now_unix_secs()),
        "exportVersion": "wasm-admin-catalog",
        "channel": channel,
        "valid": true,
        "productCount": product_count,
        "exportableCount": product_count,
        "blockedCount": 0,
        "missingCount": 0,
        "diagnostics": [],
    })))
}

fn stripe_import_preview(req: &RouteRequest) -> AppResult<RouteResponse> {
    require_match(req, "GET", "/admin/products/stripe-import-preview")?;
    Ok(RouteResponse::ok(&json!({
        "products": [],
        "importable": 0,
        "linked": 0,
        "conflicts": 0,
        "warnings": 0,
    })))
}

fn stripe_import(req: &RouteRequest, ctx: &RequestContext) -> AppResult<RouteResponse> {
    require_match(req, "POST", "/admin/products/import-stripe")?;
    ctx.require_admin_write()?;
    Ok(RouteResponse::ok(&json!({
        "imported": 0,
        "skipped": 0,
        "products": [],
    })))
}

fn require_method(req: &RouteRequest, method: &str) -> AppResult<()> {
    req.method
        .eq_ignore_ascii_case(method)
        .then_some(())
        .ok_or_else(|| AppError::not_found("unknown admin route"))
}
