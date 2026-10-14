use serde_json::json;

use crate::checkout_contract::inventory_admin;
use crate::ctx::RequestContext;
use crate::error::{AppError, AppResult};
use crate::reqresp::{RouteRequest, RouteResponse};
use crate::seams::HostSeams;

use super::super::catalog_bridge::inventory::audit_json;
use super::super::support::path_id;

const MAX_LIMIT: usize = 100;
const MAX_OFFSET: usize = 500;

pub(super) fn handle<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
    ctx: &RequestContext,
) -> AppResult<RouteResponse> {
    ctx.require_admin()?;
    let id = path_id(
        &req.path,
        "/admin/products/",
        Some("/inventory/adjustments"),
    )?;
    let limit = parameter(req, "limit", 50, 1, MAX_LIMIT)?;
    let offset = parameter(req, "offset", 0, 0, MAX_OFFSET)?;
    let (records, truncated) = inventory_admin::history(seams, &id)?;
    let total_scanned = records.len();
    let page = records
        .into_iter()
        .skip(offset)
        .take(limit)
        .map(|record| audit_json(&record))
        .collect::<Vec<_>>();
    Ok(RouteResponse::ok(&json!({
        "productId": id,
        "adjustments": page,
        "limit": limit,
        "offset": offset,
        "hasMore": truncated || offset.saturating_add(page.len()) < total_scanned,
        "historyTruncated": truncated,
    })))
}

fn parameter(
    req: &RouteRequest,
    name: &str,
    default: usize,
    minimum: usize,
    maximum: usize,
) -> AppResult<usize> {
    let values = req
        .query
        .iter()
        .filter(|(key, _)| key == name)
        .map(|(_, value)| value)
        .collect::<Vec<_>>();
    if values.len() > 1 {
        return Err(AppError::bad_request(format!(
            "duplicate {name} query parameter"
        )));
    }
    let Some(value) = values.first() else {
        return Ok(default);
    };
    let parsed = value
        .parse::<usize>()
        .map_err(|_| AppError::bad_request(format!("{name} must be an integer")))?;
    if parsed < minimum || parsed > maximum {
        return Err(AppError::bad_request(format!(
            "{name} must be between {minimum} and {maximum}"
        )));
    }
    Ok(parsed)
}
