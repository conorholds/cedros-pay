//! Validated catalog price projections and durable verification markers.
use super::metadata_mut;
use crate::error::{AppError, AppResult};
use serde_json::{json, Value};

pub(super) fn price_handles(product: &Value) -> AppResult<Vec<String>> {
    let mut handles = product
        .get("prices")
        .and_then(Value::as_array)
        .into_iter()
        .flat_map(|prices| prices.iter())
        .filter(|price| {
            price.get("status").and_then(Value::as_str) == Some("active")
                && price.get("purchasable").and_then(Value::as_bool) == Some(true)
        })
        .filter_map(|price| {
            price
                .get("stableHandle")
                .and_then(Value::as_str)
                .map(str::to_string)
        })
        .collect::<Vec<_>>();
    handles.sort();
    if handles.windows(2).any(|pair| pair[0] == pair[1]) {
        return Err(AppError::conflict("duplicate catalog price handles"));
    }
    if handles.is_empty() {
        return Err(AppError::unprocessable(
            "product has no active purchasable catalog prices to synchronize",
        ));
    }
    if handles.len() > 100 {
        return Err(AppError::unprocessable(
            "Stripe synchronization supports at most 100 active prices per product",
        ));
    }
    Ok(handles)
}

pub(super) struct PriceSpec {
    pub(super) handle: String,
    pub(super) unit_amount_cents: i64,
    pub(super) currency: String,
    pub(super) interval: Option<String>,
    pub(super) interval_count: Option<i64>,
    pub(super) stripe_price_id: Option<String>,
    pub(super) verified_fingerprint: Option<String>,
    pub(super) verified_at: Option<i64>,
    pub(super) tax_behavior: Option<String>,
}

pub(super) fn price_spec(product: &Value, handle: &str) -> AppResult<PriceSpec> {
    let price = product
        .get("prices")
        .and_then(Value::as_array)
        .and_then(|prices| {
            prices
                .iter()
                .find(|price| price.get("stableHandle").and_then(Value::as_str) == Some(handle))
        })
        .ok_or_else(|| AppError::conflict("catalog price changed during Stripe sync"))?;
    Ok(PriceSpec {
        tax_behavior: (product["productType"] == "capacityAddOn").then(|| "exclusive".into()),
        verified_fingerprint: price["metadata"]["cedros_stripe_price_fingerprint"]
            .as_str()
            .map(str::to_string),
        verified_at: price["metadata"]["cedros_stripe_price_verified_at"]
            .as_str()
            .and_then(crate::time::parse_iso),
        handle: handle.to_string(),
        unit_amount_cents: price
            .get("unitAmountCents")
            .and_then(Value::as_i64)
            .filter(|amount| *amount > 0)
            .ok_or_else(|| AppError::unprocessable("catalog price amount is invalid"))?,
        currency: price
            .get("currency")
            .and_then(Value::as_str)
            .filter(|currency| currency.len() == 3)
            .ok_or_else(|| AppError::unprocessable("catalog price currency is invalid"))?
            .to_ascii_uppercase(),
        interval: price
            .get("billingInterval")
            .and_then(Value::as_str)
            .map(str::to_string),
        interval_count: price.get("billingIntervalCount").and_then(Value::as_i64),
        stripe_price_id: price
            .get("stripePriceId")
            .and_then(Value::as_str)
            .filter(|value| crate::capacity::config::provider_id(value, "price_"))
            .map(str::to_string),
    })
}

pub(super) fn set_price_id(
    product: &Value,
    handle: &str,
    stripe_price_id: &str,
    stripe_product_id: &str,
    now: i64,
) -> AppResult<Value> {
    let mut spec = price_spec(product, handle)?;
    spec.stripe_price_id = Some(stripe_price_id.into());
    let fingerprint = price_fingerprint(stripe_product_id, &spec)?;
    let mut payload = product.clone();
    let prices = payload
        .get_mut("prices")
        .and_then(Value::as_array_mut)
        .ok_or_else(|| AppError::conflict("catalog prices disappeared during Stripe sync"))?;
    let price = prices
        .iter_mut()
        .find(|price| price.get("stableHandle").and_then(Value::as_str) == Some(handle))
        .ok_or_else(|| AppError::conflict("catalog price changed during Stripe sync"))?;
    price["stripePriceId"] = Value::String(stripe_price_id.to_string());
    let metadata = metadata_mut(price);
    metadata.insert("cedros_stripe_price_fingerprint".into(), json!(fingerprint));
    metadata.insert(
        "cedros_stripe_price_verified_at".into(),
        json!(crate::time::iso8601(now)),
    );
    Ok(payload)
}

pub(super) fn price_fingerprint(product_id: &str, spec: &PriceSpec) -> AppResult<String> {
    crate::routes::checkout_claim::fingerprint(&json!([
        product_id,
        spec.handle,
        spec.unit_amount_cents,
        spec.currency,
        spec.interval,
        spec.interval_count,
        spec.stripe_price_id,
        spec.tax_behavior
    ]))
}
