use serde_json::json;

use crate::ctx::RequestContext;
use crate::error::{AppError, AppResult};
use crate::ids;
use crate::reqresp::{RouteRequest, RouteResponse};
use crate::seams::HostSeams;

use super::support::*;

#[path = "admin_credit_refunds.rs"]
mod credits;
#[path = "admin_refund_effects.rs"]
mod effects;
#[path = "admin_stripe_refunds.rs"]
mod stripe;

pub(super) fn stripe_progress<S: HostSeams>(
    seams: &S,
    payment: &serde_json::Value,
) -> AppResult<serde_json::Value> {
    stripe::progress(seams, payment)
}

pub(super) fn handle_refunds<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
    ctx: &RequestContext,
) -> AppResult<RouteResponse> {
    match req.route_id.as_str() {
        ids::ROUTE_ADMIN_REFUNDS_LIST => refunds(seams, req, "x402"),
        ids::ROUTE_ADMIN_CREDIT_REFUND_REQUESTS_LIST => refunds(seams, req, "credits"),
        ids::ROUTE_ADMIN_STRIPE_REFUNDS_LIST => refunds(seams, req, "stripe"),
        ids::ROUTE_ADMIN_STRIPE_REFUNDS_PROCESS => stripe::process(seams, req, ctx),
        ids::ROUTE_ADMIN_CREDIT_REFUNDS_PROCESS => credits::process(seams, req, ctx),
        _ => Err(AppError::not_found("unknown refund route")),
    }
}

fn refunds<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
    provider: &str,
) -> AppResult<RouteResponse> {
    let path = match provider {
        "stripe" => "/admin/stripe/refunds",
        "credits" => "/admin/credits/refund-requests",
        _ => "/admin/refunds",
    };
    require_match(req, "GET", path)?;
    let limit = limit(req);
    let offset = offset(req);
    let page = ledger_page(seams, "admin refunds", offset, limit, |value| {
        Ok((kind(&value) == "refund" && payment_method(&value) == provider).then_some(value))
    })?;
    let total = page.total;
    let refunds = page
        .entries
        .into_iter()
        .map(|value| refund_json(&value, provider))
        .collect::<Vec<_>>();
    Ok(RouteResponse::ok(&json!({
        "refunds": refunds,
        "count": refunds.len(),
        "total": total,
        "hasMore": page_has_more(total, offset, limit, page.truncated),
        "truncated": page.truncated,
    })))
}
