//! Authenticated HTTP boundary for the Shop versioned-cart capability.

use crate::error::{AppError, AppResult};
use crate::reqresp::{RouteRequest, RouteResponse, RouteSpec};
use crate::seams::HostSeams;

use super::AuthenticatedCartAdapter;

/// Open or recover the authenticated buyer's authoritative cart generation.
pub const ROUTE_OPEN: &str = "cedros-pay:versioned-cart-open";
/// Read the authenticated buyer's authoritative cart.
pub const ROUTE_READ: &str = "cedros-pay:versioned-cart-read";
/// Rotate the server-owned generation and fence delayed writers.
pub const ROUTE_ROTATE: &str = "cedros-pay:versioned-cart-rotate";
/// Apply an idempotent, generation- and version-guarded cart mutation.
pub const ROUTE_APPLY: &str = "cedros-pay:versioned-cart-apply";

/// Exact route specifications for the versioned-cart capability.
pub const ROUTES: &[RouteSpec] = &[
    route(ROUTE_OPEN, "/cart/open"),
    route(ROUTE_READ, "/cart/read"),
    route(ROUTE_ROTATE, "/cart/rotate"),
    route(ROUTE_APPLY, "/cart/apply"),
];

const fn route(route_id: &'static str, path: &'static str) -> RouteSpec {
    RouteSpec {
        route_id,
        method: "POST",
        path,
    }
}

/// Dispatches one capability operation after proving the exact guarded marker.
///
/// The marker read is the first host interaction. Authentication, rate
/// enforcement, catalog authority, and cart storage occur only afterward.
pub fn handle_route<S: HostSeams>(seams: &S, request: &RouteRequest) -> AppResult<RouteResponse> {
    crate::guarded_policy::require_active(seams)?;
    let adapter = AuthenticatedCartAdapter::new(seams);
    match request.route_id.as_str() {
        ROUTE_OPEN => bound(request, "/cart/open").and_then(|()| adapter.open_active(request)),
        ROUTE_READ => bound(request, "/cart/read").and_then(|()| adapter.read_active(request)),
        ROUTE_ROTATE => {
            bound(request, "/cart/rotate").and_then(|()| adapter.rotate_active(request))
        }
        ROUTE_APPLY => bound(request, "/cart/apply").and_then(|()| adapter.apply_active(request)),
        _ => Err(AppError::not_found("unknown versioned cart route")),
    }
}

fn bound(request: &RouteRequest, path: &str) -> AppResult<()> {
    crate::routes::matches(request, "POST", path)
        .then_some(())
        .ok_or_else(|| AppError::not_found("unknown versioned cart route"))
}
