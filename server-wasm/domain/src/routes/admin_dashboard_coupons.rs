use serde_json::json;

use crate::ctx::RequestContext;
use crate::db::{BatchOp, Db};
use crate::error::{AppError, AppResult};
use crate::guarded_batch::{GuardedBatchOutcome, GuardedCondition};
use crate::ids;
use crate::reqresp::{RouteRequest, RouteResponse};
use crate::seams::HostSeams;

use super::support::*;

#[cfg(test)]
#[path = "admin_coupon_concurrency_tests.rs"]
mod concurrency_tests;

pub(super) fn handle_coupons<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
    ctx: &RequestContext,
) -> AppResult<RouteResponse> {
    match req.route_id.as_str() {
        ids::ROUTE_ADMIN_COUPONS_LIST => coupons(seams, req),
        ids::ROUTE_ADMIN_COUPONS_CREATE => write_coupon(seams, req, ctx),
        ids::ROUTE_ADMIN_COUPONS_UPDATE => update_coupon(seams, req, ctx),
        ids::ROUTE_ADMIN_COUPONS_DELETE => delete_coupon(seams, req, ctx),
        _ => Err(AppError::not_found("unknown coupon route")),
    }
}

fn coupons<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    require_match(req, "GET", "/admin/coupons")?;
    let coupons = coupon_values(seams)?
        .into_iter()
        .take(limit(req) as usize)
        .collect::<Vec<_>>();
    Ok(RouteResponse::ok(
        &json!({ "coupons": coupons, "count": coupons.len() }),
    ))
}

fn write_coupon<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
    ctx: &RequestContext,
) -> AppResult<RouteResponse> {
    require_match(req, "POST", "/admin/coupons")?;
    ctx.require_admin_write()?;
    let coupon = coupon_from_body(req)?;
    let code =
        string_field(&coupon, "code").ok_or_else(|| AppError::bad_request("code is required"))?;
    crate::routes::products::catalog::seo_categories::marker_required(seams)?;
    let key = coupon_key(&code);
    let outcome = Db::new(seams, ids::DB_ACCESS).guarded_batch(
        &[GuardedCondition::Absent {
            content_model_id: ids::MODEL_CATALOG,
            entry_key: key.clone(),
        }],
        &[write_op(key, coupon.clone())],
    )?;
    if !matches!(outcome, GuardedBatchOutcome::Applied { .. }) {
        return Err(AppError::conflict("coupon code already exists"));
    }
    Ok(RouteResponse::ok(&coupon))
}

fn update_coupon<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
    ctx: &RequestContext,
) -> AppResult<RouteResponse> {
    if req.method != "PUT" {
        return Err(AppError::not_found("unknown coupon route"));
    }
    ctx.require_admin_write()?;
    let code = path_id(&req.path, "/admin/coupons/", None)?;
    let coupon = coupon_from_body(req)?;
    let body_code = string_field(&coupon, "code").unwrap_or_default();
    if coupon_key(&code) != coupon_key(&body_code) {
        return Err(AppError::bad_request(
            "coupon body code must match the route code",
        ));
    }
    crate::routes::products::catalog::seo_categories::marker_required(seams)?;
    let key = coupon_key(&code);
    let db = Db::new(seams, ids::DB_ACCESS);
    let existing = db
        .read_one(ids::MODEL_CATALOG, &key)?
        .ok_or_else(|| AppError::not_found("coupon not found"))?;
    let outcome = db.guarded_batch(
        &[version_condition(&key, existing.version)?],
        &[write_op(key, coupon.clone())],
    )?;
    if !matches!(outcome, GuardedBatchOutcome::Applied { .. }) {
        return Err(AppError::conflict("coupon changed while saving"));
    }
    Ok(RouteResponse::ok(&coupon))
}

fn delete_coupon<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
    ctx: &RequestContext,
) -> AppResult<RouteResponse> {
    if req.method != "DELETE" {
        return Err(AppError::not_found("unknown coupon route"));
    }
    ctx.require_admin_write()?;
    let code = path_id(&req.path, "/admin/coupons/", None)?;
    crate::routes::products::catalog::seo_categories::marker_required(seams)?;
    let key = coupon_key(&code);
    let db = Db::new(seams, ids::DB_ACCESS);
    let Some(existing) = db.read_one(ids::MODEL_CATALOG, &key)? else {
        return Ok(RouteResponse::ok(&json!({ "deleted": false })));
    };
    let outcome = db.guarded_batch(
        &[version_condition(&key, existing.version)?],
        &[BatchOp::Delete {
            content_model_id: ids::MODEL_CATALOG,
            entry_key: key,
        }],
    )?;
    if !matches!(outcome, GuardedBatchOutcome::Applied { .. }) {
        return Err(AppError::conflict("coupon changed while deleting"));
    }
    Ok(RouteResponse::ok(&json!({ "deleted": true })))
}

fn write_op(key: String, data: serde_json::Value) -> BatchOp {
    BatchOp::Write {
        content_model_id: ids::MODEL_CATALOG,
        entry_key: key,
        data,
    }
}

fn version_condition(key: &str, version: Option<String>) -> AppResult<GuardedCondition> {
    Ok(GuardedCondition::Version {
        content_model_id: ids::MODEL_CATALOG,
        entry_key: key.into(),
        expected_version: version
            .filter(|value| !value.is_empty())
            .ok_or_else(|| AppError::internal("coupon is missing its version fence"))?,
    })
}
