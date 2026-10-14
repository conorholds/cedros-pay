//! Explicit administrator activation of guarded-only database enforcement.

use serde::Serialize;

use crate::ctx::RequestContext;
use crate::error::{AppError, AppResult};
use crate::ids;
use crate::reqresp::{RouteRequest, RouteResponse, RouteSpec};
use crate::seams::HostSeams;

pub const ROUTES: &[RouteSpec] = &[RouteSpec {
    route_id: ids::ROUTE_GUARDED_POLICY_ENROLL,
    method: "POST",
    path: "/admin/guarded-policy/enroll",
}];

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct EnrollmentResponse {
    newly_enrolled: bool,
    model_count: usize,
    model_set_sha256: &'static str,
}

/// Enrolls the exact compiled model set in one host transaction.
///
/// The request accepts only an empty body or `{}`. Authentication and host
/// verified CSRF authorization occur before the first database operation.
pub fn handle<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    if !crate::routes::matches(req, "POST", "/admin/guarded-policy/enroll") {
        return Err(AppError::not_found(
            "unknown guarded policy enrollment route",
        ));
    }
    require_empty_body(req)?;
    let context = RequestContext::parse(&req.context_json);
    context.require_claim_or_capability(ids::ROUTE_ADMIN, ids::ROUTE_GUARDED_POLICY_ENROLL)?;
    context.require_admin_write_or_capability(ids::ROUTE_GUARDED_POLICY_ENROLL)?;

    let result = crate::guarded_policy::enroll(seams)?;
    Ok(RouteResponse::ok(&EnrollmentResponse {
        newly_enrolled: result.newly_enrolled,
        model_count: crate::guarded_policy::GUARDED_MODELS.len(),
        model_set_sha256: crate::guarded_policy::MODEL_SET_SHA256,
    }))
}

fn require_empty_body(req: &RouteRequest) -> AppResult<()> {
    match req.json_body()? {
        serde_json::Value::Null => Ok(()),
        serde_json::Value::Object(fields) if fields.is_empty() => Ok(()),
        _ => Err(AppError::bad_request(
            "guarded policy enrollment body must be empty",
        )),
    }
}

#[cfg(test)]
#[path = "guarded_policy_enrollment_tests.rs"]
mod tests;
