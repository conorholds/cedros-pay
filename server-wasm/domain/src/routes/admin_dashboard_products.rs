use serde_json::{json, Value};

use crate::ctx::RequestContext;
use crate::error::{AppError, AppResult};
use crate::ids;
use crate::reqresp::{RouteRequest, RouteResponse};
use crate::seams::HostSeams;

use super::support::*;

#[cfg(test)]
#[path = "admin_inventory_atomic_tests.rs"]
mod inventory_atomic_tests;
#[path = "admin_inventory_history.rs"]
mod inventory_history;
#[cfg(test)]
#[path = "admin_inventory_history_tests.rs"]
mod inventory_history_tests;
#[path = "admin_inventory_request.rs"]
pub(super) mod inventory_request;
#[cfg(test)]
#[path = "admin_inventory_test_support.rs"]
mod inventory_test_support;
#[cfg(test)]
#[path = "admin_inventory_tests.rs"]
mod inventory_tests;
#[cfg(test)]
#[path = "admin_product_update_identity_tests.rs"]
mod product_update_identity_tests;
#[path = "admin_variant_inventory.rs"]
mod variant_inventory;

pub(super) fn handle_products<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
    ctx: &RequestContext,
) -> AppResult<RouteResponse> {
    match req.route_id.as_str() {
        ids::ROUTE_ADMIN_PRODUCTS_LIST => products(seams, req),
        ids::ROUTE_ADMIN_PRODUCTS_CREATE => write_product(seams, req, ctx),
        ids::ROUTE_ADMIN_PRODUCTS_GET => product_detail(seams, req),
        ids::ROUTE_ADMIN_PRODUCTS_UPDATE => update_product(seams, req, ctx),
        ids::ROUTE_ADMIN_PRODUCTS_DELETE => delete_product(seams, req, ctx),
        ids::ROUTE_ADMIN_PRODUCT_INVENTORY_ADJUSTMENTS => {
            inventory_history::handle(seams, req, ctx)
        }
        ids::ROUTE_ADMIN_PRODUCT_VARIATIONS_GET => product_variations(seams, req),
        ids::ROUTE_ADMIN_PRODUCT_VARIATIONS_UPDATE => update_variations(seams, req, ctx),
        ids::ROUTE_ADMIN_PRODUCT_VARIANT_INVENTORY_UPDATE => {
            variant_inventory::handle(seams, req, ctx)
        }
        _ => Err(AppError::not_found("unknown product route")),
    }
}

fn products<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    require_match(req, "GET", "/admin/products")?;
    let all = product_values(seams)?;
    let page = all
        .into_iter()
        .skip(offset(req) as usize)
        .take(limit(req) as usize)
        .collect::<Vec<_>>();
    Ok(RouteResponse::ok(
        &json!({ "products": page, "count": page.len() }),
    ))
}

fn product_detail<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    let id = path_id(&req.path, "/admin/products/", None)?;
    let product =
        read_product(seams, &id)?.ok_or_else(|| AppError::not_found("product not found"))?;
    Ok(RouteResponse::ok(&admin_product(&id, product)))
}

fn write_product<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
    ctx: &RequestContext,
) -> AppResult<RouteResponse> {
    require_match(req, "POST", "/admin/products")?;
    ctx.require_admin_write()?;
    let (id, product) = product_from_body(req, seams.now_unix_secs())?;
    crate::routes::products::catalog::seo_categories::create(seams, &id, &product)?;
    let response = crate::checkout_contract::inventory_projection::overlay(seams, &id, product)?;
    Ok(RouteResponse::ok(&admin_product(&id, response)))
}

fn update_product<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
    ctx: &RequestContext,
) -> AppResult<RouteResponse> {
    if req.method != "PUT" {
        return Err(AppError::not_found("unknown product route"));
    }
    ctx.require_admin_write()?;
    let id = path_id(&req.path, "/admin/products/", None)?;
    if req.path != format!("/admin/products/{id}") {
        return Err(AppError::not_found("unknown product route"));
    }
    let (body_id, mut product) = product_from_body(req, seams.now_unix_secs())?;
    if id != body_id {
        return Err(AppError::bad_request(
            "product body id must exactly match the route id",
        ));
    }
    let existing =
        read_product_raw(seams, &id)?.ok_or_else(|| AppError::not_found("product not found"))?;
    preserve_product_lifecycle(&existing, &mut product);
    crate::routes::products::catalog::seo_categories::update(seams, &id, &product)?;
    let response = crate::checkout_contract::inventory_projection::overlay(seams, &id, product)?;
    Ok(RouteResponse::ok(&admin_product(&id, response)))
}

fn delete_product<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
    ctx: &RequestContext,
) -> AppResult<RouteResponse> {
    ctx.require_admin_write()?;
    let id = path_id(&req.path, "/admin/products/", None)?;
    let removed = remove_product(seams, &id)?;
    Ok(RouteResponse::ok(&json!({ "deleted": removed })))
}

pub(super) fn set_product_active<S: HostSeams>(
    seams: &S,
    id: &str,
    active: bool,
) -> AppResult<Value> {
    normalize_id(id)?;
    let existing =
        read_product_raw(seams, id)?.ok_or_else(|| AppError::not_found("product not found"))?;
    let mut product = product_object(existing);
    product.insert("active".into(), Value::Bool(active));
    product.insert(
        "updatedAt".into(),
        Value::String(crate::time::iso8601(seams.now_unix_secs())),
    );
    normalize_public_identity(&mut product)?;
    let value = Value::Object(product);
    crate::routes::products::catalog::seo_categories::update(seams, id, &value)?;
    let response = crate::checkout_contract::inventory_projection::overlay(seams, id, value)?;
    Ok(admin_product(id, response))
}

pub(super) fn remove_product<S: HostSeams>(seams: &S, id: &str) -> AppResult<bool> {
    normalize_id(id)?;
    crate::checkout_contract::inventory_admin::ensure_deletable(seams, &id)?;
    crate::routes::products::catalog::seo_categories::delete(seams, id)
}

fn product_variations<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    let id = path_id(&req.path, "/admin/products/", Some("/variations"))?;
    let product =
        read_product(seams, &id)?.ok_or_else(|| AppError::not_found("product not found"))?;
    Ok(RouteResponse::ok(&variation_response(&id, &product, 0)))
}

fn update_variations<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
    ctx: &RequestContext,
) -> AppResult<RouteResponse> {
    if req.method != "PUT" {
        return Err(AppError::not_found("unknown product route"));
    }
    ctx.require_admin_write()?;
    let id = path_id(&req.path, "/admin/products/", Some("/variations"))?;
    crate::routes::products::catalog::seo_categories::marker_required(seams)?;
    let existing =
        read_product_entry(seams, &id)?.ok_or_else(|| AppError::not_found("product not found"))?;
    let version = existing
        .version
        .clone()
        .filter(|value| !value.is_empty())
        .ok_or_else(|| AppError::internal("product is missing its version fence"))?;
    let mut product = product_object(existing.payload);
    let body = req.json_body()?;
    if let Some(config) = body.get("variationConfig") {
        product.insert("variationConfig".into(), config.clone());
    }
    let created = merge_variants(&mut product, &body);
    product.insert(
        "updatedAt".into(),
        Value::String(crate::time::iso8601(seams.now_unix_secs())),
    );
    let value = Value::Object(product);
    crate::routes::products::catalog::seo_categories::update_versioned(
        seams, &id, &value, &version,
    )?;
    let response = crate::checkout_contract::inventory_projection::overlay(seams, &id, value)?;
    Ok(RouteResponse::ok(&variation_response(
        &id, &response, created,
    )))
}
