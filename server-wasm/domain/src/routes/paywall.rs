//! `POST /paywall/v1/checkout` — create a Stripe PaymentIntent.
//!
//! Authenticated relying-party route: callers must present the configured shared
//! secret before the extension calls Stripe over the `http.fetch` egress seam (operator must allowlist `api.stripe.com`),
//! keying the call with the request idempotency key, then records a pending
//! ledger row. The Stripe secret key comes from the `secrets` seam.

use crate::error::{AppError, AppResult};
use crate::ids;
use crate::reqresp::{RouteRequest, RouteResponse, RouteSpec};
use crate::routes::{matches, verify_relying_party};
use crate::seams::HostSeams;

#[path = "paywall_checkout.rs"]
mod checkout;
#[path = "paywall_provider.rs"]
mod provider;
#[path = "paywall_request.rs"]
mod request;

pub const ROUTES: &[RouteSpec] = &[RouteSpec {
    route_id: ids::ROUTE_PAYWALL,
    method: "POST",
    path: "/paywall/v1/checkout",
}];

pub fn handle<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    crate::native_storefront_policy::require_request(seams, req)?;
    if !matches(req, "POST", "/paywall/v1/checkout") {
        return Err(AppError::not_found("unknown paywall route"));
    }
    verify_relying_party(seams, req)?;
    checkout::execute(seams, request::prepare(seams, req)?)
}

/// Unwraps the `http.fetch` envelope `{status,body}` then parses the Stripe body.
#[cfg(test)]
#[path = "paywall_tests.rs"]
mod tests;
