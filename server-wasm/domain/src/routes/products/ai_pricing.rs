//! Shared fail-closed fiat pricing authority for physical catalog authoring and storefront enforcement.
use crate::error::{AppError, AppResult};
use serde_json::Value;

const FIAT: &[&str] = &[
    "USD", "EUR", "GBP", "AUD", "CAD", "NZD", "CHF", "SGD", "HKD",
];

pub(crate) fn require_fiat_price(price: &Value) -> AppResult<()> {
    currency(&price["currency"]).map(|_| ())
}

pub(crate) fn require_product_price(product: &Value) -> AppResult<()> {
    unsupported_authority(product)?;
    let price = base_price(product)?;
    // The storefront and checkout prefer different legacy aliases. Every stored
    // alias must agree so a successful edit cannot display one price and sell another.
    for key in ["price", "fiatPrice"] {
        if let Some(value) = product.get(key).filter(|value| !value.is_null()) {
            if nested_price(value)? != price {
                return Err(unsupported());
            }
        }
    }
    if (product.get("fiatAmountCents").is_some() || product.get("fiatCurrency").is_some())
        && (
            amount(&product["fiatAmountCents"])?,
            currency(&product["fiatCurrency"])?,
        ) != price
    {
        return Err(unsupported());
    }
    if let Some(variants) = product.get("variants").filter(|value| !value.is_null()) {
        let variants = variants
            .as_array()
            .filter(|items| items.len() <= 100)
            .ok_or_else(unsupported)?;
        for variant in variants {
            unsupported_authority(variant)?;
            if let Some(value) = variant.get("price").filter(|value| !value.is_null()) {
                // A declared variant price must be explicit; ambiguous display-only
                // amounts and silently inherited currencies are outside this capability.
                nested_price(value)?;
            }
        }
    }
    Ok(())
}

fn base_price(product: &Value) -> AppResult<(i64, &str)> {
    if let Some(value) = product.get("price").filter(|value| !value.is_null()) {
        return nested_price(value);
    }
    if product.get("fiatAmountCents").is_some() || product.get("fiatCurrency").is_some() {
        return Ok((
            amount(&product["fiatAmountCents"])?,
            currency(&product["fiatCurrency"])?,
        ));
    }
    nested_price(&product["fiatPrice"])
}

fn nested_price(price: &Value) -> AppResult<(i64, &str)> {
    let object = price.as_object().ok_or_else(unsupported)?;
    // Do not reinterpret asset/atomic/provider-linked pricing as this capability's
    // amountCents/currency contract or retain a second pricing authority unnoticed.
    if object
        .keys()
        .any(|key| !matches!(key.as_str(), "amountCents" | "currency"))
    {
        return Err(unsupported());
    }
    Ok((
        amount(&price["amountCents"])?,
        currency(&price["currency"])?,
    ))
}

fn unsupported_authority(value: &Value) -> AppResult<()> {
    let object = value.as_object().ok_or_else(unsupported)?;
    if let Some(atomic) = object
        .get("cryptoAtomicAmount")
        .filter(|value| !value.is_null())
    {
        if atomic.as_u64() != Some(0) && atomic.as_str() != Some("0") {
            return Err(unsupported());
        }
    }
    for field in [
        "prices",
        "cryptoPrice",
        "subscription",
        "billingInterval",
        "paymentResource",
    ] {
        if let Some(material) = object.get(field) {
            let empty = material.is_null()
                || material.as_array().is_some_and(Vec::is_empty)
                || material.as_str().is_some_and(str::is_empty);
            if !empty {
                return Err(unsupported());
            }
        }
    }
    Ok(())
}

fn amount(value: &Value) -> AppResult<i64> {
    value
        .as_i64()
        .filter(|amount| (1..=100_000_000).contains(amount))
        .ok_or_else(unsupported)
}

fn currency(value: &Value) -> AppResult<&str> {
    value
        .as_str()
        .filter(|currency| FIAT.contains(currency))
        .ok_or_else(unsupported)
}

fn unsupported() -> AppError {
    AppError::unprocessable("physical product capability requires unambiguous supported fiat pricing; linked, recurring, crypto or ambiguous price authority must be reviewed through its dedicated catalog workflow")
}
