use std::collections::BTreeSet;

use super::api_request::{QuoteItemIntent, ShippingAddress, ShippingIntent};
use crate::error::{AppError, AppResult};

pub(super) fn items(items: &[QuoteItemIntent]) -> AppResult<()> {
    if items.is_empty() || items.len() > 100 {
        return Err(invalid("quote requires 1 to 100 items"));
    }
    let mut unique = BTreeSet::new();
    for item in items {
        identifier(&item.resource, "resource")?;
        if let Some(variant) = item.variant_id.as_deref() {
            identifier(variant, "variantId")?;
        }
        if item.qty == 0 || item.qty > 999 {
            return Err(invalid("qty is outside the supported range"));
        }
        if !unique.insert((&item.resource, item.variant_id.as_deref())) {
            return Err(invalid("duplicate quote item"));
        }
    }
    Ok(())
}

pub(super) fn cart_source(lane: &str, generation: &str, version: u64) -> AppResult<()> {
    identifier(lane, "lane")?;
    text(generation, 256, "generation")?;
    if version > 100_000 {
        return Err(invalid("cart version is outside the supported range"));
    }
    Ok(())
}

pub(super) fn shipping(address: &ShippingAddress, shipping: &ShippingIntent) -> AppResult<()> {
    for (field, value, limit) in [
        ("address line1", address.line1.as_str(), 200),
        ("address city", address.city.as_str(), 100),
        ("address postalCode", address.postal_code.as_str(), 32),
        ("shipping optionId", shipping.option_id.as_str(), 128),
    ] {
        text(value, limit, field)?;
    }
    if address.country.len() != 2
        || !address
            .country
            .bytes()
            .all(|byte| byte.is_ascii_alphabetic())
    {
        return Err(invalid("address country must be two letters"));
    }
    optional(&address.line2, 200, "address line2")?;
    optional(&address.region, 100, "address region")
}

pub(super) fn return_url(value: &str) -> AppResult<()> {
    let authority = value
        .strip_prefix("https://")
        .and_then(|rest| rest.split(['/', '?', '#']).next());
    if value.len() <= 2_048
        && !value.chars().any(char::is_control)
        && !value.chars().any(char::is_whitespace)
        && authority.is_some_and(|host| !host.is_empty() && !host.contains('@'))
    {
        Ok(())
    } else {
        Err(invalid("return URL must be an HTTPS URL without userinfo"))
    }
}

pub(super) fn optional(value: &Option<String>, limit: usize, field: &str) -> AppResult<()> {
    value
        .as_deref()
        .map_or(Ok(()), |value| text(value, limit, field))
}

fn identifier(value: &str, field: &str) -> AppResult<()> {
    text(value, 128, field)?;
    if value
        .bytes()
        .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_' | b'.' | b':'))
    {
        Ok(())
    } else {
        Err(invalid(format!("{field} contains unsupported characters")))
    }
}

fn text(value: &str, limit: usize, field: &str) -> AppResult<()> {
    if value.is_empty()
        || value.len() > limit
        || value.trim() != value
        || value.chars().any(char::is_control)
    {
        Err(invalid(format!("{field} is invalid")))
    } else {
        Ok(())
    }
}

fn invalid(message: impl Into<String>) -> AppError {
    AppError::unprocessable(message)
}
