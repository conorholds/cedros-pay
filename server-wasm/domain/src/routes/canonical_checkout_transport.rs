use crate::checkout_contract::CanonicalCheckoutFacade;
use crate::error::{AppError, AppResult};
use crate::reqresp::RouteRequest;
use crate::seams::HostSeams;

use super::{
    rate, ROUTE_CREATE, ROUTE_DESCRIPTOR, ROUTE_QUOTE, ROUTE_RESOLVE, ROUTE_RETURN_VERIFY,
    ROUTE_STATUS,
};

pub(super) enum Operation<'a> {
    Descriptor,
    Quote { idempotency_key: &'a str },
    Create { idempotency_key: &'a str },
    Status { operation_id: &'a str },
    Resolve,
    VerifyReturn,
}

impl Operation<'_> {
    pub fn rate_operation(&self) -> rate::Operation {
        match self {
            Self::Descriptor => rate::Operation::Descriptor,
            Self::Quote { .. } => rate::Operation::Quote,
            Self::Create { .. } => rate::Operation::Create,
            Self::Status { .. } => rate::Operation::Status,
            Self::Resolve => rate::Operation::Resolve,
            Self::VerifyReturn => rate::Operation::VerifyReturn,
        }
    }
}

pub(super) fn preflight<S: HostSeams>(request: &RouteRequest) -> AppResult<Operation<'_>> {
    unique_header(request, "authorization")?
        .ok_or_else(|| AppError::unauthorized("buyer authentication required"))?;
    match (
        request.route_id.as_str(),
        request.method.as_str(),
        request.path.as_str(),
    ) {
        (ROUTE_DESCRIPTOR, "GET", "/checkout/descriptor") => {
            read(request)?;
            Ok(Operation::Descriptor)
        }
        (ROUTE_QUOTE, "POST", "/checkout/quote") => {
            post(request)?;
            let key = idempotency_key(request)?;
            CanonicalCheckoutFacade::<S>::preflight_quote(key, &request.body)?;
            Ok(Operation::Quote {
                idempotency_key: key,
            })
        }
        (ROUTE_CREATE, "POST", "/checkout") => {
            post(request)?;
            let key = idempotency_key(request)?;
            CanonicalCheckoutFacade::<S>::preflight_checkout(key, &request.body)?;
            Ok(Operation::Create {
                idempotency_key: key,
            })
        }
        (ROUTE_RESOLVE, "POST", "/checkout/resolve") => {
            post(request)?;
            CanonicalCheckoutFacade::<S>::preflight_resolve(&request.body)?;
            Ok(Operation::Resolve)
        }
        (ROUTE_RETURN_VERIFY, "POST", "/checkout/return/verify") => {
            post(request)?;
            CanonicalCheckoutFacade::<S>::preflight_verify_return(&request.body)?;
            Ok(Operation::VerifyReturn)
        }
        (ROUTE_STATUS, "GET", path) => status::<S>(request, path),
        _ => Err(AppError::not_found("unknown canonical checkout route")),
    }
}

fn read(request: &RouteRequest) -> AppResult<()> {
    if !request.body.is_empty() || !request.query.is_empty() {
        return Err(AppError::bad_request(
            "checkout descriptor request is invalid",
        ));
    }
    Ok(())
}

fn status<'a, S: HostSeams>(request: &'a RouteRequest, path: &'a str) -> AppResult<Operation<'a>> {
    if !request.body.is_empty() || !request.query.is_empty() || path.contains('%') {
        return Err(AppError::bad_request("checkout status request is invalid"));
    }
    let operation_id = path
        .strip_prefix("/checkout/")
        .filter(|value| !value.contains('/'))
        .ok_or_else(|| AppError::not_found("unknown canonical checkout route"))?;
    CanonicalCheckoutFacade::<S>::preflight_status(operation_id)?;
    Ok(Operation::Status { operation_id })
}

fn post(request: &RouteRequest) -> AppResult<()> {
    if !request.query.is_empty() {
        return Err(AppError::bad_request(
            "checkout route does not accept query parameters",
        ));
    }
    let content_type = unique_header(request, "content-type")?
        .ok_or_else(|| AppError::bad_request("Content-Type must be application/json"))?;
    if !content_type.eq_ignore_ascii_case("application/json") {
        return Err(AppError::bad_request(
            "Content-Type must be application/json",
        ));
    }
    Ok(())
}

fn idempotency_key(request: &RouteRequest) -> AppResult<&str> {
    unique_header(request, "idempotency-key")?
        .ok_or_else(|| AppError::bad_request("Idempotency-Key header is required"))
}

fn unique_header<'a>(request: &'a RouteRequest, name: &str) -> AppResult<Option<&'a str>> {
    let values = request
        .headers
        .iter()
        .filter(|(key, _)| key.eq_ignore_ascii_case(name))
        .map(|(_, value)| value)
        .collect::<Vec<_>>();
    if values.len() > 1
        || values
            .iter()
            .any(|value| value.chars().any(char::is_control))
    {
        return Err(AppError::bad_request(
            "checkout request headers are ambiguous",
        ));
    }
    Ok(values.first().map(|value| value.as_str()))
}
