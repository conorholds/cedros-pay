//! Buyer x402 refund request/read routes and admin execution dispatch.

use serde_json::json;
use sha2::{Digest, Sha256};

use crate::db::Db;
use crate::error::{AppError, AppResult};
use crate::ids;
use crate::reqresp::{RouteRequest, RouteResponse, RouteSpec};
use crate::seams::HostSeams;

#[path = "refunds_execute.rs"]
mod execute;
#[path = "refund_model.rs"]
mod model;
#[path = "refunds_request.rs"]
mod request;
#[path = "refund_store.rs"]
pub(crate) mod store;

pub(crate) use execute::reconcile_submitted_refunds;
pub(crate) use model::{
    load_refundable_payment_versioned, read_refund_row, refund_response, RefundRow,
};

pub const ROUTES: &[RouteSpec] = &[
    RouteSpec {
        route_id: ids::ROUTE_REFUNDS_REQUEST,
        method: "POST",
        path: "/paywall/v1/refunds/request",
    },
    RouteSpec {
        route_id: ids::ROUTE_REFUNDS_GET,
        method: "GET",
        path: "/paywall/v1/refunds/{refundId}",
    },
    RouteSpec {
        route_id: ids::ROUTE_ADMIN_REFUNDS_DENY,
        method: "POST",
        path: "/admin/refunds/{refundId}/deny",
    },
    RouteSpec {
        route_id: ids::ROUTE_ADMIN_REFUNDS_PROCESS,
        method: "POST",
        path: "/admin/refunds/{refundId}/process",
    },
];

pub fn handle<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    match req.route_id.as_str() {
        ids::ROUTE_REFUNDS_REQUEST => request::request_refund(seams, req),
        ids::ROUTE_REFUNDS_GET => get_refund(seams, req),
        ids::ROUTE_ADMIN_REFUNDS_PROCESS => execute::process(seams, req),
        ids::ROUTE_ADMIN_REFUNDS_DENY => execute::deny(seams, req),
        _ => Err(AppError::not_found("unknown refund route")),
    }
}

fn get_refund<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    let refund_id = model::refund_id_from_path(&req.path)
        .ok_or_else(|| AppError::not_found("refund not found"))?;
    let db = Db::new(seams, ids::DB_ACCESS);
    let row =
        read_refund_row(&db, refund_id)?.ok_or_else(|| AppError::not_found("refund not found"))?;
    // Public status polling intentionally exposes only lifecycle facts. The
    // create response is authenticated and may include the buyer's full receipt;
    // this read never returns wallet, reason, amount, or purchase identifiers.
    Ok(RouteResponse::ok(&json!({
        "refundId": row.reference,
        "status": row.status,
        "processedAt": if row.status == "pending" { None } else { Some(row.processed_at) },
        "signature": row.provider_ref,
    })))
}

pub(crate) fn derive_refund_id(original_purchase_id: &str) -> String {
    let digest = Sha256::digest(original_purchase_id.as_bytes());
    format!("refund_{}", hex::encode(&digest[..16]))
}

#[cfg(test)]
#[path = "refunds_tests.rs"]
mod tests;
