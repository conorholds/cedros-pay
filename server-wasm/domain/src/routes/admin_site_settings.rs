//! Pay-owned admin writes for blog tipping and monetization defaults.

use serde_json::{json, Map, Value};

use crate::ctx::RequestContext;
use crate::error::{AppError, AppResult};
use crate::ids;
use crate::reqresp::{RouteRequest, RouteResponse, RouteSpec};
use crate::routes::matches;
use crate::seams::HostSeams;
use crate::time;

pub const ROUTES: &[RouteSpec] = &[
    RouteSpec {
        route_id: ids::ROUTE_ADMIN_SITE_SETTINGS_TIPPING_GET,
        method: "GET",
        path: "/admin/site-settings/tipping",
    },
    RouteSpec {
        route_id: ids::ROUTE_ADMIN_SITE_SETTINGS_TIPPING_UPDATE,
        method: "PUT",
        path: "/admin/site-settings/tipping",
    },
    RouteSpec {
        route_id: ids::ROUTE_ADMIN_SITE_SETTINGS_MONETIZATION_GET,
        method: "GET",
        path: "/admin/site-settings/monetization",
    },
    RouteSpec {
        route_id: ids::ROUTE_ADMIN_SITE_SETTINGS_MONETIZATION_UPDATE,
        method: "PUT",
        path: "/admin/site-settings/monetization",
    },
];

#[derive(Clone, Copy)]
enum SiteSettingsKind {
    Tipping,
    Monetization,
}

impl SiteSettingsKind {
    fn id(self) -> &'static str {
        match self {
            Self::Tipping => "tipping",
            Self::Monetization => "monetization",
        }
    }

    fn storage_key(self) -> &'static str {
        match self {
            Self::Tipping => ids::SETTING_SITE_TIPPING,
            Self::Monetization => ids::SETTING_SITE_MONETIZATION,
        }
    }

    fn path(self) -> &'static str {
        match self {
            Self::Tipping => "/admin/site-settings/tipping",
            Self::Monetization => "/admin/site-settings/monetization",
        }
    }

    fn allowed_keys(self) -> &'static [&'static str] {
        match self {
            Self::Tipping => &[
                "enabled",
                "recipient",
                "currencies",
                "presets",
                "label",
                "description",
                "allowPerPostRecipient",
            ],
            Self::Monetization => &[
                "enabled",
                "defaultAccessMode",
                "defaultPreviewParagraphs",
                "defaultPrice",
                "acceptedPaymentMethods",
                "subscriptionProductId",
                "creditsPerArticle",
                "freeReadsPerMonth",
                "lockedMessage",
                "mediaEnabled",
                "mediaDefaultAccessMode",
                "mediaPreviewPolicy",
                "mediaPayProductId",
                "mediaRequiredEntitlementId",
                "mediaRequiresLogin",
                "mediaLockedMessage",
            ],
        }
    }

    fn defaults(self) -> Map<String, Value> {
        let value = match self {
            Self::Tipping => json!({
                "enabled": false,
                "recipient": "",
                "currencies": [],
                "presets": [],
                "label": "Tip",
                "description": "",
                "allowPerPostRecipient": false,
            }),
            Self::Monetization => json!({
                "enabled": false,
                "defaultAccessMode": "free",
                "defaultPreviewParagraphs": 2,
                "defaultPrice": null,
                "acceptedPaymentMethods": [],
                "subscriptionProductId": "",
                "creditsPerArticle": null,
                "freeReadsPerMonth": 0,
                "lockedMessage": "Subscribe or purchase access to continue reading.",
                "mediaEnabled": false,
                "mediaDefaultAccessMode": "public",
                "mediaPreviewPolicy": {
                    "kind": "thumbnail",
                    "assetId": null,
                    "variantKind": null
                },
                "mediaPayProductId": "",
                "mediaRequiredEntitlementId": "",
                "mediaRequiresLogin": true,
                "mediaLockedMessage": "Sign in and purchase access to view this media.",
            }),
        };
        value.as_object().cloned().unwrap_or_default()
    }
}

pub fn handle<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    let ctx = RequestContext::parse(&req.context_json);
    ctx.require_claim(ids::ROUTE_ADMIN)?;

    match req.route_id.as_str() {
        ids::ROUTE_ADMIN_SITE_SETTINGS_TIPPING_GET => {
            get_settings(seams, req, SiteSettingsKind::Tipping)
        }
        ids::ROUTE_ADMIN_SITE_SETTINGS_TIPPING_UPDATE => {
            ctx.require_admin_write()?;
            update_settings(seams, req, SiteSettingsKind::Tipping)
        }
        ids::ROUTE_ADMIN_SITE_SETTINGS_MONETIZATION_GET => {
            get_settings(seams, req, SiteSettingsKind::Monetization)
        }
        ids::ROUTE_ADMIN_SITE_SETTINGS_MONETIZATION_UPDATE => {
            ctx.require_admin_write()?;
            update_settings(seams, req, SiteSettingsKind::Monetization)
        }
        _ => Err(AppError::not_found("unknown admin site settings route")),
    }
}

fn get_settings<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
    kind: SiteSettingsKind,
) -> AppResult<RouteResponse> {
    if !matches(req, "GET", kind.path()) {
        return Err(AppError::not_found("unknown admin site settings route"));
    }
    Ok(RouteResponse::ok(&json!({
        "kind": kind.id(),
        "key": kind.storage_key(),
        "settings": load_settings(seams, kind)?,
        "updatedAt": null,
    })))
}

fn update_settings<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
    kind: SiteSettingsKind,
) -> AppResult<RouteResponse> {
    if !matches(req, "PUT", kind.path()) {
        return Err(AppError::not_found("unknown admin site settings route"));
    }
    let body = req.json_body()?;
    let settings = body
        .get("settings")
        .and_then(Value::as_object)
        .ok_or_else(|| AppError::bad_request("settings must be a JSON object"))?;
    validate_settings(kind, settings)?;

    let mut merged = load_settings(seams, kind)?;
    for (key, value) in settings {
        merged.insert(key.clone(), value.clone());
    }
    validate_merged_settings(kind, &merged)?;
    let value = Value::Object(merged.clone());
    seams.setting_set(kind.storage_key(), &value.to_string())?;

    Ok(RouteResponse::ok(&json!({
        "kind": kind.id(),
        "key": kind.storage_key(),
        "settings": merged,
        "updated": true,
        "updatedAt": time::iso8601(seams.now_unix_secs()),
    })))
}

fn load_settings<S: HostSeams>(seams: &S, kind: SiteSettingsKind) -> AppResult<Map<String, Value>> {
    let mut settings = kind.defaults();
    let Some(raw) = seams.setting_get(kind.storage_key())? else {
        return Ok(settings);
    };
    let parsed: Value = serde_json::from_str(&raw)
        .map_err(|_| AppError::internal("stored site settings are not valid JSON"))?;
    let object = parsed
        .as_object()
        .ok_or_else(|| AppError::internal("stored site settings are not a JSON object"))?;
    for (key, value) in object {
        if kind.allowed_keys().contains(&key.as_str()) {
            settings.insert(key.clone(), value.clone());
        }
    }
    Ok(settings)
}

fn validate_settings(kind: SiteSettingsKind, settings: &Map<String, Value>) -> AppResult<()> {
    for (key, value) in settings {
        if !kind.allowed_keys().contains(&key.as_str()) {
            return Err(AppError::bad_request(format!(
                "unknown site settings key: {key}"
            )));
        }
        reject_secret_like_key(key)?;
        reject_secret_like_fields(value)?;
        validate_value(kind, key, value)?;
    }
    Ok(())
}

fn reject_secret_like_fields(value: &Value) -> AppResult<()> {
    match value {
        Value::Object(object) => {
            for (key, nested) in object {
                reject_secret_like_key(key)?;
                reject_secret_like_fields(nested)?;
            }
        }
        Value::Array(values) => {
            for nested in values {
                reject_secret_like_fields(nested)?;
            }
        }
        _ => {}
    }
    Ok(())
}

fn reject_secret_like_key(key: &str) -> AppResult<()> {
    let normalized: String = key
        .chars()
        .filter(|ch| ch.is_ascii_alphanumeric())
        .flat_map(char::to_lowercase)
        .collect();
    let secret_markers = [
        "secret",
        "password",
        "privatekey",
        "apikey",
        "authorization",
        "cookie",
        "cardnumber",
        "cvc",
        "cvv",
        "bankaccount",
        "rawwalletaddress",
        "accesstoken",
        "refreshtoken",
        "bearertoken",
    ];
    if secret_markers
        .iter()
        .any(|marker| normalized.contains(marker))
    {
        Err(AppError::bad_request(format!(
            "secret-looking field is not allowed: {key}"
        )))
    } else {
        Ok(())
    }
}

fn validate_value(kind: SiteSettingsKind, key: &str, value: &Value) -> AppResult<()> {
    match (kind, key) {
        (_, "enabled") | (SiteSettingsKind::Tipping, "allowPerPostRecipient") => {
            require_bool(key, value)
        }
        (SiteSettingsKind::Monetization, "mediaEnabled")
        | (SiteSettingsKind::Monetization, "mediaRequiresLogin") => require_bool(key, value),
        (SiteSettingsKind::Tipping, "recipient")
        | (SiteSettingsKind::Tipping, "label")
        | (SiteSettingsKind::Tipping, "description")
        | (SiteSettingsKind::Monetization, "defaultAccessMode")
        | (SiteSettingsKind::Monetization, "subscriptionProductId")
        | (SiteSettingsKind::Monetization, "lockedMessage")
        | (SiteSettingsKind::Monetization, "mediaPayProductId")
        | (SiteSettingsKind::Monetization, "mediaRequiredEntitlementId")
        | (SiteSettingsKind::Monetization, "mediaLockedMessage") => {
            require_string_or_null(key, value)
        }
        (SiteSettingsKind::Monetization, "mediaDefaultAccessMode") => {
            require_string_in(key, value, &["public", "preview", "locked"])
        }
        (SiteSettingsKind::Monetization, "mediaPreviewPolicy") => {
            require_media_preview_policy(value)
        }
        (SiteSettingsKind::Tipping, "currencies")
        | (SiteSettingsKind::Monetization, "acceptedPaymentMethods") => require_array(key, value),
        (SiteSettingsKind::Tipping, "presets") => require_number_array(key, value),
        (SiteSettingsKind::Monetization, "defaultPreviewParagraphs")
        | (SiteSettingsKind::Monetization, "freeReadsPerMonth") => {
            require_non_negative_integer(key, value)
        }
        (SiteSettingsKind::Monetization, "creditsPerArticle") => {
            if value.is_null() {
                Ok(())
            } else {
                require_non_negative_integer(key, value)
            }
        }
        (SiteSettingsKind::Monetization, "defaultPrice") => require_article_price(value),
        _ => Err(AppError::bad_request(format!(
            "unknown site settings key: {key}"
        ))),
    }
}

fn validate_merged_settings(
    kind: SiteSettingsKind,
    settings: &Map<String, Value>,
) -> AppResult<()> {
    if !matches!(kind, SiteSettingsKind::Monetization) {
        return Ok(());
    }
    if !bool_field(settings, "mediaEnabled")
        || string_field(settings, "mediaDefaultAccessMode") == Some("public")
    {
        return Ok(());
    }
    if !bool_field(settings, "mediaRequiresLogin") {
        return Err(AppError::bad_request(
            "enabled media monetization requires Cedros Login",
        ));
    }
    if string_field(settings, "mediaPayProductId").is_none()
        && string_field(settings, "mediaRequiredEntitlementId").is_none()
    {
        return Err(AppError::bad_request(
            "enabled locked media requires a Pay product or entitlement",
        ));
    }
    Ok(())
}

fn require_bool(key: &str, value: &Value) -> AppResult<()> {
    if value.is_boolean() {
        Ok(())
    } else {
        Err(AppError::bad_request(format!("{key} must be a boolean")))
    }
}

fn require_string_or_null(key: &str, value: &Value) -> AppResult<()> {
    if value.is_string() || value.is_null() {
        Ok(())
    } else {
        Err(AppError::bad_request(format!(
            "{key} must be a string or null"
        )))
    }
}

fn require_string_in(key: &str, value: &Value, allowed: &[&str]) -> AppResult<()> {
    match value.as_str() {
        Some(value) if allowed.contains(&value) => Ok(()),
        _ => Err(AppError::bad_request(format!(
            "{key} must be one of: {}",
            allowed.join(", ")
        ))),
    }
}

fn require_array(key: &str, value: &Value) -> AppResult<()> {
    if value.is_array() {
        Ok(())
    } else {
        Err(AppError::bad_request(format!("{key} must be an array")))
    }
}

fn require_number_array(key: &str, value: &Value) -> AppResult<()> {
    let Some(values) = value.as_array() else {
        return Err(AppError::bad_request(format!("{key} must be an array")));
    };
    if values.iter().all(Value::is_number) {
        Ok(())
    } else {
        Err(AppError::bad_request(format!(
            "{key} must contain only numbers"
        )))
    }
}

fn require_media_preview_policy(value: &Value) -> AppResult<()> {
    let Some(object) = value.as_object() else {
        return Err(AppError::bad_request(
            "mediaPreviewPolicy must be a JSON object",
        ));
    };
    for (key, nested) in object {
        match key.as_str() {
            "kind" => require_string_in(
                "mediaPreviewPolicy.kind",
                nested,
                &[
                    "thumbnail",
                    "watermarked",
                    "clip",
                    "poster",
                    "placeholder",
                    "none",
                ],
            )?,
            "assetId" | "variantKind" => require_string_or_null(key, nested)?,
            _ => {
                return Err(AppError::bad_request(format!(
                    "unknown mediaPreviewPolicy key: {key}"
                )));
            }
        }
    }
    if !object.contains_key("kind") {
        return Err(AppError::bad_request("mediaPreviewPolicy.kind is required"));
    }
    Ok(())
}

fn require_non_negative_integer(key: &str, value: &Value) -> AppResult<()> {
    match value.as_i64() {
        Some(number) if number >= 0 => Ok(()),
        _ => Err(AppError::bad_request(format!(
            "{key} must be a non-negative integer"
        ))),
    }
}

/// The article unlock price is fixed-point money: `{ amountCents: <non-negative
/// integer>, currency: <non-empty string> }`, or null. `as_i64` rejects floats
/// (e.g. 4.99), so a float-dollar amount can never be stored.
fn require_article_price(value: &Value) -> AppResult<()> {
    if value.is_null() {
        return Ok(());
    }
    let Some(object) = value.as_object() else {
        return Err(AppError::bad_request(
            "defaultPrice must be an object with integer amountCents and a currency, or null",
        ));
    };
    require_non_negative_integer(
        "defaultPrice.amountCents",
        object.get("amountCents").unwrap_or(&Value::Null),
    )?;
    match object.get("currency").and_then(Value::as_str) {
        Some(currency) if !currency.trim().is_empty() => {}
        _ => {
            return Err(AppError::bad_request(
                "defaultPrice.currency must be a non-empty string",
            ));
        }
    }
    for key in object.keys() {
        if key != "amountCents" && key != "currency" {
            return Err(AppError::bad_request(format!(
                "defaultPrice has unexpected key: {key}"
            )));
        }
    }
    Ok(())
}

fn bool_field(settings: &Map<String, Value>, key: &str) -> bool {
    settings.get(key).and_then(Value::as_bool).unwrap_or(false)
}

fn string_field<'a>(settings: &'a Map<String, Value>, key: &str) -> Option<&'a str> {
    settings
        .get(key)
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
}

#[cfg(test)]
#[path = "admin_site_settings_tests.rs"]
mod admin_site_settings_tests;
