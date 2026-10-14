//! Authenticated HTTP boundary for the canonical checkout contract.

#[path = "canonical_checkout_rate.rs"]
mod rate;
#[path = "canonical_checkout_transport.rs"]
mod transport;

use crate::checkout_contract::CanonicalCheckoutFacade;
use crate::ctx::RequestContext;
use crate::error::{AppError, AppResult};
use crate::reqresp::{RouteRequest, RouteResponse, RouteSpec};
use crate::seams::HostSeams;

pub const ROUTE_QUOTE: &str = "cedros-pay:checkout-quote";
pub const ROUTE_DESCRIPTOR: &str = "cedros-pay:checkout-descriptor";
pub const ROUTE_CREATE: &str = "cedros-pay:checkout-create";
pub const ROUTE_STATUS: &str = "cedros-pay:checkout-status";
pub const ROUTE_RESOLVE: &str = "cedros-pay:checkout-resolve";
pub const ROUTE_RETURN_VERIFY: &str = "cedros-pay:checkout-return-verify";

pub const ROUTES: &[RouteSpec] = &[
    RouteSpec {
        route_id: ROUTE_DESCRIPTOR,
        method: "GET",
        path: "/checkout/descriptor",
    },
    RouteSpec {
        route_id: ROUTE_QUOTE,
        method: "POST",
        path: "/checkout/quote",
    },
    RouteSpec {
        route_id: ROUTE_CREATE,
        method: "POST",
        path: "/checkout",
    },
    RouteSpec {
        route_id: ROUTE_STATUS,
        method: "GET",
        path: "/checkout/{operationId}",
    },
    RouteSpec {
        route_id: ROUTE_RESOLVE,
        method: "POST",
        path: "/checkout/resolve",
    },
    RouteSpec {
        route_id: ROUTE_RETURN_VERIFY,
        method: "POST",
        path: "/checkout/return/verify",
    },
];

/// Direct-invocation-safe handler. The guarded marker is intentionally the
/// first host call even when a caller bypasses shared router preflight.
pub fn handle<S: HostSeams>(seams: &S, request: &RouteRequest) -> AppResult<RouteResponse> {
    crate::guarded_policy::require_active(seams)?;
    let operation = transport::preflight::<S>(request)?;
    let buyer = crate::auth::verify_buyer(seams, request)?;
    let context = RequestContext::parse(&request.context_json);
    rate::check(seams, &buyer, &context, operation.rate_operation())?;
    let facade = CanonicalCheckoutFacade::for_verified_buyer(seams, &context, &buyer)?;
    dispatch(&facade, request, operation)
}

fn dispatch<S: HostSeams>(
    facade: &CanonicalCheckoutFacade<'_, S>,
    request: &RouteRequest,
    operation: transport::Operation<'_>,
) -> AppResult<RouteResponse> {
    match operation {
        transport::Operation::Descriptor => Ok(RouteResponse::ok(&facade.descriptor()?)),
        transport::Operation::Quote { idempotency_key } => {
            let response = facade.quote(idempotency_key, &request.body)?;
            quote_response(response)
        }
        transport::Operation::Create { idempotency_key } => {
            let response = facade.checkout(idempotency_key, &request.body)?;
            if matches!(
                &response,
                crate::checkout_contract::CanonicalPaymentOutcome::Terminal { code, .. }
                    if code == "idempotency-mismatch"
            ) {
                return Err(AppError::new(
                    409,
                    "idempotency_mismatch",
                    "idempotency key was already used for different checkout material",
                ));
            }
            Ok(RouteResponse::ok(&response))
        }
        transport::Operation::Status { operation_id } => {
            Ok(RouteResponse::ok(&facade.status(operation_id)?))
        }
        transport::Operation::Resolve => Ok(RouteResponse::ok(&facade.resolve(&request.body)?)),
        transport::Operation::VerifyReturn => Ok(RouteResponse::ok(&facade.verify(&request.body)?)),
    }
}

fn quote_response(
    response: crate::checkout_contract::CanonicalQuoteResponse,
) -> AppResult<RouteResponse> {
    let mut value = serde_json::to_value(response).map_err(|error| {
        AppError::internal("cannot encode checkout quote response").with_internal(error.to_string())
    })?;
    // A buyer needs the exact public Solana challenge to construct and review
    // the transaction. Keep the durable authority fingerprint server-only: it
    // is an internal anti-drift value, not a wallet instruction.
    if let Some(quote) = value
        .get_mut("quote")
        .and_then(serde_json::Value::as_object_mut)
    {
        if let Some(x402) = quote
            .get_mut("x402")
            .and_then(serde_json::Value::as_object_mut)
        {
            x402.remove("configFingerprint");
        }
    }
    Ok(RouteResponse::ok(&value))
}

#[cfg(test)]
#[path = "canonical_checkout_boundary_tests.rs"]
mod boundary_tests;
#[cfg(test)]
#[path = "canonical_checkout_conflict_tests.rs"]
mod conflict_tests;
#[cfg(test)]
#[path = "canonical_checkout_descriptor_tests.rs"]
mod descriptor_tests;
#[cfg(test)]
#[path = "canonical_checkout_marker_tests.rs"]
mod marker_tests;
#[cfg(test)]
#[path = "canonical_checkout_rail_tests.rs"]
mod rail_tests;
#[cfg(test)]
#[path = "canonical_checkout_region_tests.rs"]
mod region_tests;
#[cfg(test)]
#[path = "canonical_checkout_return_paid_tests.rs"]
mod return_paid_tests;
#[cfg(test)]
#[path = "canonical_checkout_return_tests.rs"]
mod return_tests;
#[cfg(test)]
#[path = "canonical_checkout_test_support.rs"]
pub(crate) mod test_support;
#[cfg(test)]
#[path = "canonical_checkout_tests.rs"]
mod tests;

#[cfg(test)]
#[path = "canonical_checkout_physical_tests.rs"]
mod physical_tests;
