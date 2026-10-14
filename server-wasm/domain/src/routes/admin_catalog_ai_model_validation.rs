use serde_json::{Map, Value};

use crate::error::{AppError, AppResult};

const MAX_METADATA_BYTES: usize = 32 * 1024;
const MAX_METADATA_FIELDS: usize = 64;

pub(super) fn has_active_price(prices: &[Value]) -> bool {
    prices.iter().any(|price| {
        price.get("active").and_then(Value::as_bool) == Some(true)
            && price.get("purchasable").and_then(Value::as_bool) == Some(true)
    })
}

pub(super) fn validate_handle(value: &str, label: &str) -> AppResult<()> {
    let valid = !value.is_empty()
        && value.len() <= 120
        && !value.starts_with('-')
        && !value.ends_with('-')
        && value
            .bytes()
            .all(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit() || byte == b'-');
    valid.then_some(()).ok_or_else(|| {
        AppError::unprocessable(format!(
            "{label} must use lowercase letters, numbers, and interior dashes"
        ))
    })
}

pub(super) fn validate_status(status: &str, allow_legacy: bool) -> AppResult<()> {
    let valid =
        matches!(status, "draft" | "active" | "archived") || (allow_legacy && status == "legacy");
    valid.then_some(()).ok_or_else(|| {
        AppError::unprocessable(if allow_legacy {
            "status must be draft, active, archived, or legacy"
        } else {
            "status must be draft, active, or archived"
        })
    })
}

pub(super) fn validate_currency(currency: &str) -> AppResult<()> {
    (currency.len() == 3 && currency.bytes().all(|byte| byte.is_ascii_alphabetic()))
        .then_some(())
        .ok_or_else(|| AppError::unprocessable("currency must be a three-letter code"))
}

pub(super) fn validate_text(value: &str, max: usize, label: &str) -> AppResult<()> {
    if value.trim().is_empty() || value.len() > max {
        Err(AppError::unprocessable(format!(
            "{label} must be between 1 and {max} characters"
        )))
    } else {
        Ok(())
    }
}

pub(super) fn validate_optional_text(value: &str, max: usize, label: &str) -> AppResult<()> {
    if value.len() > max {
        Err(AppError::unprocessable(format!(
            "{label} must be at most {max} characters"
        )))
    } else {
        Ok(())
    }
}

pub(super) fn validate_provider_price_id(value: &str) -> AppResult<()> {
    let valid = value.starts_with("price_")
        && value.len() <= 255
        && value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || byte == b'_');
    valid
        .then_some(())
        .ok_or_else(|| AppError::unprocessable("stripePriceId is invalid"))
}

pub(super) fn validate_metadata(metadata: &Map<String, Value>) -> AppResult<()> {
    if metadata.len() > MAX_METADATA_FIELDS
        || serde_json::to_vec(metadata)
            .map(|bytes| bytes.len() > MAX_METADATA_BYTES)
            .unwrap_or(true)
    {
        return Err(AppError::unprocessable("metadata is too large"));
    }
    if metadata.keys().any(|key| {
        let key = key.to_ascii_lowercase();
        key.contains("secret") || key.contains("invitecode") || key.contains("activationcode")
    }) {
        return Err(AppError::unprocessable(
            "metadata cannot contain secrets or activation codes",
        ));
    }
    Ok(())
}

pub(super) fn one() -> i64 {
    1
}

pub(super) fn usd() -> String {
    "USD".to_string()
}
