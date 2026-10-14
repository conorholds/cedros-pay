use crate::error::{AppError, AppResult};

use super::{CanonicalResolveRequest, CanonicalVerifyRequest};

pub(super) fn parse_resolve(body: &str) -> AppResult<CanonicalResolveRequest> {
    let request: CanonicalResolveRequest = super::api_validation::parse(body)?;
    common(
        request.schema_version,
        &request.expected_attempt_id,
        &request.return_artifact,
    )?;
    super::api_validation::operation_id(&request.operation_id)?;
    Ok(request)
}

pub(super) fn parse_verify(body: &str) -> AppResult<CanonicalVerifyRequest> {
    let request: CanonicalVerifyRequest = super::api_validation::parse(body)?;
    common(
        request.schema_version,
        &request.expected_attempt_id,
        &request.return_artifact,
    )?;
    Ok(request)
}

fn common(schema: u8, attempt: &str, artifact: &str) -> AppResult<()> {
    if schema != 1 {
        return Err(AppError::bad_request("unsupported schemaVersion"));
    }
    super::CheckoutAttemptId::parse_exact(attempt)?;
    crate::stripe::checkout_provider::validate_session_id(artifact)
        .map_err(|_| AppError::unprocessable("returnArtifact is invalid"))
}
