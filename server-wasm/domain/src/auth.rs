//! Buyer authentication through Cedros Login's public current-user contract.
//!
//! A buyer-facing Pay route receives the buyer's Login credential from its own
//! request. API clients use `Authorization: Bearer`; same-origin browser actions
//! may use Login's site-wide HttpOnly `cedros_access` cookie. Pay sends that
//! credential to Login's configured authoritative current-user endpoint, which
//! verifies the signature and live session before returning the user. No
//! operator-managed service credential is required.

use serde::Deserialize;
use serde_json::{json, Value};

use crate::error::{AppError, AppResult};
use crate::reqresp::RouteRequest;
use crate::seams::HostSeams;
use crate::stripe::api::unwrap_fetch;

mod browser_auth;
pub(crate) use browser_auth::buyer_token;

const SETTING_LOGIN_BASE_URL: &str = "cedros_login.base_url";
const CURRENT_USER_PATH: &str = "/extensions/cedros-login/public-auth/user";
const MAX_USER_ID_BYTES: usize = 160;

/// A verified buyer identity. `claims` remains an empty object for compatibility;
/// Pay authorization is based only on Login's authoritative user id.
#[derive(Debug, Clone)]
pub struct Buyer {
    pub user_id: String,
    pub claims: Value,
}

/// Verify the buyer's bearer token, or a same-origin browser access cookie,
/// against Cedros Login's public current-user contract.
pub fn verify_buyer<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<Buyer> {
    if !browser_auth::credential_present(req) {
        return Err(AppError::unauthorized("buyer authentication required"));
    }
    if req.bearer_token().is_none() && req.header("origin").is_none() {
        return Err(AppError::unauthorized("buyer authentication required"));
    }
    let origin = login_origin(seams)?;
    let token = browser_auth::buyer_token(req, &origin)
        .ok_or_else(|| AppError::unauthorized("buyer authentication required"))?;

    let request = current_user_request(&origin, token);
    let raw = seams.http_fetch(&request.to_string()).map_err(|error| {
        AppError::new(502, "provider_unavailable", "identity verification failed")
            .with_internal(error.message)
    })?;
    let (status, body) = unwrap_fetch(&raw).map_err(|error| {
        AppError::new(502, "provider_unavailable", "identity verification failed")
            .with_internal(error)
    })?;
    if matches!(status, 401 | 403) {
        return Err(AppError::unauthorized("buyer session is not active"));
    }
    if status != 200 {
        return Err(
            AppError::new(502, "provider_unavailable", "identity verification failed")
                .with_internal(format!("current-user HTTP {status}")),
        );
    }
    let result: CurrentUserResponse = serde_json::from_str(&body).map_err(|error| {
        AppError::new(
            502,
            "provider_unavailable",
            "malformed current-user response",
        )
        .with_internal(error.to_string())
    })?;
    let user_id = result.user.id.trim();
    if user_id.is_empty()
        || user_id.len() > MAX_USER_ID_BYTES
        || user_id.chars().any(char::is_control)
    {
        return Err(AppError::new(
            502,
            "provider_unavailable",
            "malformed current-user response",
        ));
    }
    Ok(Buyer {
        user_id: user_id.to_string(),
        claims: json!({}),
    })
}

/// Resolve the site's configured Login origin. The identity provider must never
/// be selected from request-controlled data such as the `Origin` header.
pub(crate) fn login_origin<S: HostSeams>(seams: &S) -> AppResult<String> {
    let configured = seams.setting_get(SETTING_LOGIN_BASE_URL)?;
    let candidate = configured
        .as_deref()
        .and_then(setting_string)
        .ok_or_else(login_origin_unavailable)?;
    normalize_https_origin(candidate.trim().trim_end_matches('/'))
        .ok_or_else(login_origin_unavailable)
}

/// The production host persists settings as JSON and its Wasm seam returns the
/// serialized JSON value. Host simulators historically returned the bare
/// string, so accept both representations without accepting another type.
fn setting_string(value: &str) -> Option<String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return None;
    }
    match serde_json::from_str::<Value>(trimmed) {
        Ok(Value::String(value)) => Some(value),
        Ok(_) => None,
        Err(_) => Some(trimmed.to_string()),
    }
}

fn normalize_https_origin(value: &str) -> Option<String> {
    let rest = value.strip_prefix("https://")?;
    if rest.is_empty()
        || rest.contains(['/', '?', '#', '@'])
        || !rest.is_ascii()
        || rest.contains(['[', ']'])
    {
        return None;
    }
    let (host, port) = rest
        .rsplit_once(':')
        .map_or((rest, None), |(host, port)| (host, Some(port)));
    if port.is_some_and(|port| port != "443") {
        return None;
    }
    let host = host.to_ascii_lowercase();
    let valid = host.len() <= 253
        && host.split('.').all(|label| {
            !label.is_empty()
                && !label.starts_with('-')
                && !label.ends_with('-')
                && !label.starts_with("xn--")
                && label
                    .bytes()
                    .all(|byte| byte.is_ascii_alphanumeric() || byte == b'-')
        });
    valid.then(|| format!("https://{host}"))
}

fn login_origin_unavailable() -> AppError {
    AppError::new(
        503,
        "unavailable",
        "Cedros Login site origin is unavailable",
    )
}

fn current_user_request(origin: &str, token: &str) -> Value {
    json!({
        "method": "GET",
        "url": format!("{origin}{CURRENT_USER_PATH}"),
        "headers": [
            ["authorization", format!("Bearer {token}")],
            ["accept", "application/json"],
        ],
        "body": "",
    })
}

#[derive(Deserialize)]
struct CurrentUserResponse {
    user: CurrentUser,
}

#[derive(Deserialize)]
struct CurrentUser {
    id: String,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::fake::FakeSeams;

    fn configured_seams() -> FakeSeams {
        let seams = FakeSeams::new();
        seams.set_setting(SETTING_LOGIN_BASE_URL, "https://site.example");
        seams
    }

    fn req_with_bearer(token: &str) -> RouteRequest {
        RouteRequest {
            route_id: "cedros-pay:purchases".into(),
            method: "GET".into(),
            path: "/paywall/v1/purchases".into(),
            headers: vec![
                ("authorization".into(), format!("Bearer {token}")),
                ("origin".into(), "https://site.example".into()),
            ],
            ..Default::default()
        }
    }

    #[test]
    fn verifies_current_user_against_configured_origin() {
        let seams = configured_seams();
        seams.push_http_response(200, r#"{"user":{"id":"user_42"}}"#);
        let buyer = verify_buyer(&seams, &req_with_bearer("end-user-jwt")).unwrap();
        assert_eq!(buyer.user_id, "user_42");
        assert_eq!(buyer.claims, json!({}));

        let outbound = &seams.http_requests.borrow()[0];
        assert_eq!(
            outbound["url"],
            "https://site.example/extensions/cedros-login/public-auth/user"
        );
        assert_eq!(outbound["method"], "GET");
        assert_eq!(outbound["body"], "");
        let headers = outbound["headers"].as_array().unwrap();
        assert!(headers
            .iter()
            .any(|header| header[0] == "authorization" && header[1] == "Bearer end-user-jwt"));
    }

    #[test]
    fn configured_origin_is_authoritative() {
        let seams = FakeSeams::new();
        seams.set_setting(SETTING_LOGIN_BASE_URL, "https://configured.example:443");
        seams.push_http_response(200, r#"{"user":{"id":"buyer"}}"#);
        verify_buyer(&seams, &req_with_bearer("token")).unwrap();
        assert_eq!(
            seams.http_requests.borrow()[0]["url"],
            "https://configured.example/extensions/cedros-login/public-auth/user"
        );
    }

    #[test]
    fn accepts_the_json_string_shape_returned_by_the_production_settings_seam() {
        let seams = FakeSeams::new();
        seams.set_setting(SETTING_LOGIN_BASE_URL, r#""https://site.example""#);
        seams.push_http_response(200, r#"{"user":{"id":"buyer"}}"#);

        verify_buyer(&seams, &req_with_bearer("token")).unwrap();

        assert_eq!(
            seams.http_requests.borrow()[0]["url"],
            "https://site.example/extensions/cedros-login/public-auth/user"
        );
    }

    #[test]
    fn rejects_non_string_json_settings() {
        let seams = FakeSeams::new();
        seams.set_setting(
            SETTING_LOGIN_BASE_URL,
            r#"{"origin":"https://site.example"}"#,
        );

        assert_eq!(
            verify_buyer(&seams, &req_with_bearer("token"))
                .unwrap_err()
                .status,
            503
        );
        assert!(seams.http_requests.borrow().is_empty());
    }

    #[test]
    fn request_origin_is_never_used_as_login_origin() {
        let seams = FakeSeams::new();
        let mut request = req_with_bearer("secret-token");
        request.headers.retain(|(name, _)| name != "origin");
        request
            .headers
            .push(("origin".into(), "https://attacker.example".into()));

        assert_eq!(verify_buyer(&seams, &request).unwrap_err().status, 503);
        assert!(seams.http_requests.borrow().is_empty());
    }

    #[test]
    fn missing_bearer_is_401_before_any_egress() {
        let seams = configured_seams();
        let request = RouteRequest::default();
        assert_eq!(verify_buyer(&seams, &request).unwrap_err().status, 401);
        assert!(seams.http_requests.borrow().is_empty());
    }

    #[test]
    fn rejected_session_is_401() {
        let seams = configured_seams();
        seams.push_http_response(401, r#"{"error":"unauthorized"}"#);
        assert_eq!(
            verify_buyer(&seams, &req_with_bearer("expired"))
                .unwrap_err()
                .status,
            401
        );
    }

    #[test]
    fn missing_subject_and_provider_error_fail_closed() {
        let malformed = configured_seams();
        malformed.push_http_response(200, r#"{"user":{}}"#);
        assert_eq!(
            verify_buyer(&malformed, &req_with_bearer("token"))
                .unwrap_err()
                .status,
            502
        );

        let unavailable = configured_seams();
        unavailable.push_http_response(503, "upstream down");
        assert_eq!(
            verify_buyer(&unavailable, &req_with_bearer("token"))
                .unwrap_err()
                .status,
            502
        );

        let transport = configured_seams();
        transport.push_http_error("egress unavailable");
        assert_eq!(
            verify_buyer(&transport, &req_with_bearer("token"))
                .unwrap_err()
                .status,
            502
        );
    }
}
