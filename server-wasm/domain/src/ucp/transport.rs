use crate::{
    error::{AppError, AppResult},
    reqresp::RouteRequest,
};
pub(super) fn validate_route(req: &RouteRequest) -> AppResult<()> {
    let spec = super::ROUTES
        .iter()
        .find(|r| r.route_id == req.route_id)
        .ok_or_else(|| AppError::not_found("unknown UCP route"))?;
    let path = req
        .path
        .strip_prefix("/extensions/cedros-pay")
        .unwrap_or(&req.path);
    let expected = spec.path.split('/').collect::<Vec<_>>();
    let actual = path.split('/').collect::<Vec<_>>();
    if req.method != spec.method
        || expected.len() != actual.len()
        || !expected
            .iter()
            .zip(actual)
            .all(|(a, b)| if *a == "{id}" { valid_id(b) } else { *a == b })
    {
        return Err(AppError::not_found("unknown UCP route"));
    }
    Ok(())
}
pub(super) fn valid_id(id: &str) -> bool {
    id.strip_prefix("ucp_").is_some_and(|v| {
        v.len() == 64
            && v.bytes()
                .all(|c| c.is_ascii_digit() || (b'a'..=b'f').contains(&c))
    })
}
pub(super) fn session_id(req: &RouteRequest) -> AppResult<&str> {
    req.path
        .split('/')
        .find(|p| valid_id(p))
        .ok_or_else(|| AppError::not_found("UCP session not found"))
}
