use serde_json::Value;

use crate::db::Db;
use crate::error::{AppError, AppResult};
use crate::ids;
use crate::seams::HostSeams;

/// Resolve the catalog price (server-trusted), currency, and a display name for the
/// Stripe line item. `404` unknown resource, `422` when it has no purchasable price.
pub(super) fn price_for_resource<S: HostSeams>(
    seams: &S,
    resource: &str,
) -> AppResult<(i64, String, String)> {
    let product = Db::new(seams, ids::DB_ACCESS)
        .read_one(ids::MODEL_CATALOG, resource)?
        .ok_or_else(|| AppError::not_found("unknown resource"))?;
    let amount_cents = crate::routes::products::catalog_price_cents(&product.payload)
        .ok_or_else(|| AppError::unprocessable("resource has no purchasable price"))?;
    let currency = crate::routes::products::catalog_currency(&product.payload);
    let product_name = ["displayName", "title", "name"]
        .iter()
        .find_map(|key| product.payload.get(*key).and_then(Value::as_str))
        .unwrap_or(resource)
        .to_string();
    Ok((amount_cents, currency, product_name))
}

/// Read a `stripe.{key}` setting (tolerant of raw or JSON-string storage).
fn read_stripe_setting<S: HostSeams>(seams: &S, key: &str) -> Option<String> {
    let raw = seams.setting_get(&format!("stripe.{key}")).ok().flatten()?;
    let value = serde_json::from_str::<Value>(&raw)
        .ok()
        .and_then(|v| v.as_str().map(str::to_string))
        .unwrap_or(raw);
    let trimmed = value.trim().to_string();
    (!trimmed.is_empty()).then_some(trimmed)
}

/// HTTPS is always supported. Operators can add mobile redirect schemes as a
/// JSON array or comma-separated `stripe.allowed_redirect_schemes` setting.
pub(crate) fn allowed_schemes<S: HostSeams>(seams: &S) -> Vec<String> {
    let raw = match read_stripe_setting(seams, "allowed_redirect_schemes") {
        Some(r) => r,
        None => return vec!["https".to_string()],
    };
    let mut parsed: Vec<String> = serde_json::from_str::<Value>(&raw)
        .ok()
        .and_then(|v| v.as_array().cloned())
        .map(|arr| {
            arr.iter()
                .filter_map(|x| x.as_str().map(|s| s.trim().to_lowercase()))
                .filter(|s| !s.is_empty())
                .collect()
        })
        .unwrap_or_else(|| {
            raw.split(',')
                .map(|s| s.trim().to_lowercase())
                .filter(|s| !s.is_empty())
                .collect()
        });
    if !parsed.iter().any(|scheme| scheme == "https") {
        parsed.push("https".to_string());
    }
    parsed
}

#[cfg(test)]
mod redirect_scheme_tests {
    use super::*;
    use crate::fake::FakeSeams;

    #[test]
    fn mobile_configuration_keeps_https_and_rejects_unconfigured_schemes() {
        for setting in [r#"["myapp"]"#, "myapp", " myapp, HTTPS ", "[]"] {
            let seams = FakeSeams::new();
            seams.set_setting("stripe.allowed_redirect_schemes", setting);
            let allowed = allowed_schemes(&seams);
            assert!(resolve_redirect(
                &seams,
                Some("https://site.example/return"),
                "success_url",
                &allowed
            )
            .is_ok());
            assert!(resolve_redirect(
                &seams,
                Some("http://site.example/return"),
                "success_url",
                &allowed
            )
            .is_err());
            assert!(
                resolve_redirect(&seams, Some("javascript:alert(1)"), "success_url", &allowed)
                    .is_err()
            );
            assert_eq!(
                resolve_redirect(&seams, Some("myapp://return"), "success_url", &allowed).is_ok(),
                setting != "[]"
            );
        }
    }
}

/// Resolve a redirect URL (request override → config default) and validate its scheme.
pub(crate) fn resolve_redirect<S: HostSeams>(
    seams: &S,
    override_url: Option<&str>,
    config_key: &str,
    allowed: &[String],
) -> AppResult<String> {
    let url = override_url
        .map(str::trim)
        .filter(|u| !u.is_empty())
        .map(str::to_string)
        .or_else(|| read_stripe_setting(seams, config_key))
        .ok_or_else(|| AppError::unprocessable(format!("{config_key} is required")))?;
    if !scheme_allowed(&url, allowed) {
        return Err(AppError::unprocessable(format!(
            "{config_key} must use an allowed redirect scheme"
        )));
    }
    Ok(url)
}

/// True when `url` has a `scheme://…` form whose scheme is in `allowed`. Rejects
/// schemeless URLs and script schemes (`javascript:`, `data:`) that have no `://`.
fn scheme_allowed(url: &str, allowed: &[String]) -> bool {
    match url.split_once("://") {
        Some((scheme, rest)) if !rest.is_empty() => {
            allowed.iter().any(|a| a.eq_ignore_ascii_case(scheme))
        }
        _ => false,
    }
}

/// Minimal email plausibility check (a single `@` with non-empty, space-free parts).
pub(crate) fn is_plausible_email(email: &str) -> bool {
    let email = email.trim();
    match email.split_once('@') {
        Some((local, domain)) => {
            !local.is_empty()
                && domain.contains('.')
                && !email.contains(char::is_whitespace)
                && domain.split('.').all(|p| !p.is_empty())
        }
        None => false,
    }
}

/// Buyer annotations never share the namespace read by settlement/CRM handlers.
pub(crate) fn public_metadata(
    extra: Option<&serde_json::Map<String, Value>>,
) -> AppResult<Vec<(String, String)>> {
    let Some(extra) = extra else {
        return Ok(Vec::new());
    };
    if extra.len() > 40 {
        return Err(AppError::unprocessable("too many checkout metadata fields"));
    }
    extra
        .iter()
        .map(|(key, value)| {
            let value = value.as_str().ok_or_else(|| {
                AppError::unprocessable("checkout metadata values must be strings")
            })?;
            if key.is_empty()
                || key.len() > 33
                || !key.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'_')
                || value.chars().count() > 500
            {
                return Err(AppError::unprocessable("invalid checkout metadata field"));
            }
            Ok((format!("custom_{key}"), value.to_string()))
        })
        .collect()
}
