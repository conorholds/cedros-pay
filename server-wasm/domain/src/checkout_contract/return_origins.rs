use std::collections::BTreeSet;

use crate::error::{AppError, AppResult};
use crate::seams::HostSeams;

use super::api_request::ReturnUrls;

pub(super) fn validate<S: HostSeams>(
    seams: &S,
    urls: &ReturnUrls,
    allow_loopback: bool,
) -> AppResult<()> {
    let raw = seams
        .setting_get(crate::ids::SETTING_CHECKOUT_ALLOWED_RETURN_ORIGINS)?
        .ok_or_else(unavailable)?;
    let configured: Vec<String> = serde_json::from_str(&raw).map_err(|_| unavailable())?;
    if configured.is_empty() || configured.len() > 32 {
        return Err(unavailable());
    }
    let allowed = configured
        .iter()
        .map(|value| origin(value, allow_loopback, true))
        .collect::<AppResult<BTreeSet<_>>>()?;
    for value in [&urls.success, &urls.cancel] {
        let candidate = origin(value, allow_loopback, false)?;
        if !allowed.contains(&candidate) {
            return Err(AppError::new(
                422,
                "return_origin_not_allowed",
                "checkout return origin is not allowed",
            ));
        }
    }
    Ok(())
}

fn origin(value: &str, allow_loopback: bool, configured: bool) -> AppResult<String> {
    let (scheme, rest) = if let Some(rest) = value.strip_prefix("https://") {
        ("https", rest)
    } else if allow_loopback {
        ("http", value.strip_prefix("http://").ok_or_else(invalid)?)
    } else {
        return Err(invalid());
    };
    let authority_end = rest.find(['/', '?', '#']).unwrap_or(rest.len());
    let authority = &rest[..authority_end];
    if authority.is_empty()
        || authority.contains('@')
        || !authority.is_ascii()
        || authority.contains('[')
        || authority.contains(']')
    {
        return Err(invalid());
    }
    if configured && authority_end != rest.len() {
        return Err(invalid());
    }
    let (host, port) = authority
        .rsplit_once(':')
        .map_or((authority, None), |(host, port)| (host, Some(port)));
    if port.is_some_and(|port| {
        (scheme == "https" && port != "443") || (scheme == "http" && port != "80")
    }) {
        return Err(invalid());
    }
    let host = host.to_ascii_lowercase();
    let labels_valid = !host.is_empty()
        && host.len() <= 253
        && host.split('.').all(|label| {
            !label.is_empty()
                && !label.starts_with('-')
                && !label.ends_with('-')
                && !label.starts_with("xn--")
                && label
                    .bytes()
                    .all(|byte| byte.is_ascii_alphanumeric() || byte == b'-')
        });
    let loopback = host == "localhost" || host == "127.0.0.1";
    if !labels_valid || (scheme == "http" && (!allow_loopback || !loopback)) {
        return Err(invalid());
    }
    Ok(format!("{scheme}://{host}"))
}

fn unavailable() -> AppError {
    AppError::new(
        503,
        "return_origin_policy_unavailable",
        "checkout return origin policy is unavailable",
    )
}

fn invalid() -> AppError {
    AppError::unprocessable("checkout return origin is invalid")
}

/// Origin for a return URL supplied only by the authenticated host domain service.
pub(crate) fn trusted_origin(value: &str) -> AppResult<String> {
    origin(value, false, false)
}
