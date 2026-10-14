//! Public Universal Commerce Protocol adapter. Catalog and discovery are
//! anonymous; checkout identity comes from the platform's own signed profile.
pub(crate) mod auth;
mod catalog;
mod cleanup;
mod handoff;
mod intent;
mod profile;
pub(crate) mod session_store;
mod sessions;
mod signing;
pub(crate) use cleanup::expired;
#[cfg(test)]
mod tests;
mod transport;
use crate::{
    error::{AppError, AppResult},
    reqresp::{RouteRequest, RouteResponse, RouteSpec},
    seams::HostSeams,
};
pub const VERSION: &str = "2026-04-08";
pub const SESSION_MODEL: &str = "cedros-pay:ucp-sessions";
pub const PROFILE_ROUTE: &str = "cedros-pay:ucp-profile";
pub const ROUTES: &[RouteSpec] = &[
    RouteSpec {
        route_id: "cedros-pay:ucp-handoff",
        method: "GET",
        path: "/ucp/handoff/{id}",
    },
    RouteSpec {
        route_id: "cedros-pay:ucp-handoff-submit",
        method: "POST",
        path: "/ucp/handoff/{id}",
    },
    RouteSpec {
        route_id: PROFILE_ROUTE,
        method: "GET",
        path: "/ucp/profile",
    },
    RouteSpec {
        route_id: "cedros-pay:ucp-catalog-search",
        method: "POST",
        path: "/ucp/v1/catalog/search",
    },
    RouteSpec {
        route_id: "cedros-pay:ucp-catalog-lookup",
        method: "POST",
        path: "/ucp/v1/catalog/lookup",
    },
    RouteSpec {
        route_id: "cedros-pay:ucp-catalog-product",
        method: "POST",
        path: "/ucp/v1/catalog/product",
    },
    RouteSpec {
        route_id: "cedros-pay:ucp-checkout-create",
        method: "POST",
        path: "/ucp/v1/checkout-sessions",
    },
    RouteSpec {
        route_id: "cedros-pay:ucp-checkout-get",
        method: "GET",
        path: "/ucp/v1/checkout-sessions/{id}",
    },
    RouteSpec {
        route_id: "cedros-pay:ucp-checkout-update",
        method: "PUT",
        path: "/ucp/v1/checkout-sessions/{id}",
    },
    RouteSpec {
        route_id: "cedros-pay:ucp-checkout-complete",
        method: "POST",
        path: "/ucp/v1/checkout-sessions/{id}/complete",
    },
    RouteSpec {
        route_id: "cedros-pay:ucp-checkout-cancel",
        method: "POST",
        path: "/ucp/v1/checkout-sessions/{id}/cancel",
    },
];
pub fn handle<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    let response = match dispatch(seams, req) {
        Ok(response) => response,
        Err(error) => RouteResponse::json(error.status, &serde_json::json!({
            "ucp":{"version":VERSION,"status":"error"},
            "messages":[{"type":"error","code":error.code,"content":error.message,"severity":"unrecoverable"}]
        })).with_header("cache-control","no-store"),
    };
    if req.route_id == PROFILE_ROUTE || req.route_id.starts_with("cedros-pay:ucp-handoff") {
        return Ok(response);
    }
    // Catalog queries and error responses may be unsigned. Publishing products
    // does not depend on configuring a checkout signing secret.
    if (req.route_id.starts_with("cedros-pay:ucp-catalog-") || response.status >= 400)
        && !signing::configured(seams)?
    {
        return Ok(response);
    }
    signing::sign(seams, response)
}
fn dispatch<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    transport::validate_route(req)?;
    if req.body.len() > 16384 {
        return Err(AppError::new(
            413,
            "payload_too_large",
            "UCP request exceeds 16 KiB",
        ));
    }
    let origin = crate::auth::login_origin(seams)?;
    match req.route_id.as_str() {
        "cedros-pay:ucp-handoff" | "cedros-pay:ucp-handoff-submit" => {
            crate::guarded_policy::require_active(seams)?;
            handoff::handle(seams, req, &origin)
        }
        PROFILE_ROUTE => profile::response(seams, &origin),
        "cedros-pay:ucp-catalog-search"
        | "cedros-pay:ucp-catalog-lookup"
        | "cedros-pay:ucp-catalog-product" => catalog::handle(seams, req, &origin),
        _ => {
            crate::guarded_policy::require_active(seams)?;
            let platform = auth::verify(seams, req, &origin)?;
            sessions::handle(seams, req, &origin, &platform)
        }
    }
}
fn idempotency_key(req: &RouteRequest) -> AppResult<&str> {
    let key = req
        .header("idempotency-key")
        .ok_or_else(|| AppError::bad_request("Idempotency-Key is required"))?;
    crate::checkout_contract::ExternalIdempotencyKey::parse_exact(key)?;
    Ok(key)
}
fn envelope(capability: &str) -> serde_json::Value {
    serde_json::json!({"version":VERSION,"status":"success","capabilities":{capability:[{"version":VERSION}]}})
}
