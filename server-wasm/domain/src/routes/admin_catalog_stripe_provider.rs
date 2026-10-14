//! Provider reconciliation and verification, shared by explicit and scheduled sync.
use super::{
    parse_price, parse_product, price_fingerprint, provider_error, PriceSpec, PRODUCT_IDENTITY,
};
use crate::error::{AppError, AppResult};
use crate::seams::HostSeams;
use crate::stripe::catalog_sync::{self, CreatePriceRequest, StripePrice, StripeProduct};
use serde_json::Value;

pub(super) fn ensure_product<S: HostSeams>(
    seams: &S,
    secret: &str,
    product: &Value,
    handle: &str,
    display_name: &str,
    description: &str,
) -> AppResult<(StripeProduct, bool)> {
    let existing_id = product["stripeProductId"]
        .as_str()
        .or_else(|| product["metadata"][PRODUCT_IDENTITY].as_str())
        .filter(|id| crate::capacity::config::provider_id(id, "prod_"))
        .ok_or_else(|| AppError::unprocessable("invalid Stripe product identity"))?;
    let fetch = catalog_sync::build_retrieve_product_fetch(secret, existing_id);
    if let Some(existing) = parse_product(&fetch_stripe(seams, &fetch)?)? {
        if existing.id != existing_id
            || existing
                .catalog_handle
                .as_deref()
                .is_some_and(|value| value != handle)
        {
            return Err(AppError::conflict(
                "Stripe product belongs to a different catalog record",
            ));
        }
        let update = catalog_sync::build_update_product_fetch(
            secret,
            existing_id,
            handle,
            display_name,
            description,
        );
        let product = parse_product(&fetch_stripe(seams, &update)?)?
            .ok_or_else(|| provider_error("Stripe product update returned no product"))?;
        if product.id != existing_id || !product.active {
            return Err(provider_error(
                "Stripe product update did not confirm the requested product",
            ));
        }
        return Ok((product, false));
    }
    let create = catalog_sync::build_create_product_fetch(
        secret,
        existing_id,
        handle,
        display_name,
        description,
    );
    let product = parse_product(&fetch_stripe(seams, &create)?)?
        .ok_or_else(|| provider_error("Stripe product create returned no product"))?;
    if product.id != existing_id || !product.active {
        return Err(provider_error(
            "Stripe product create did not confirm the requested product",
        ));
    }
    Ok((product, true))
}

pub(super) fn ensure_price<S: HostSeams>(
    seams: &S,
    secret: &str,
    product_handle: &str,
    stripe_product_id: &str,
    spec: &PriceSpec,
    resuming: bool,
) -> AppResult<(StripePrice, bool, bool, i64)> {
    // Partial sweeps reuse only locally verified, unchanged price terms. This
    // allows large products to advance beyond a prior invocation's deadline.
    if resuming
        && spec.verified_at.is_some_and(|time| {
            seams.now_unix_secs() >= time && seams.now_unix_secs() - time < 86_400
        })
        && spec.verified_fingerprint.as_deref()
            == Some(price_fingerprint(stripe_product_id, spec)?.as_str())
    {
        if let Some(id) = spec.stripe_price_id.as_ref() {
            return Ok((
                StripePrice {
                    id: id.clone(),
                    active: true,
                    product_id: stripe_product_id.into(),
                    unit_amount_cents: spec.unit_amount_cents,
                    currency: spec.currency.clone(),
                    interval: spec.interval.clone(),
                    interval_count: spec.interval_count,
                    tax_behavior: spec.tax_behavior.clone(),
                },
                false,
                false,
                spec.verified_at
                    .ok_or_else(|| AppError::internal("verified price timestamp missing"))?,
            ));
        }
    }
    if let Some(existing_id) = spec.stripe_price_id.as_deref() {
        let fetch = catalog_sync::build_retrieve_price_fetch(secret, existing_id);
        if let Some(price) = parse_price(&fetch_stripe(seams, &fetch)?)? {
            if price.id == existing_id && price_matches(&price, stripe_product_id, spec) {
                return Ok((price, false, false, seams.now_unix_secs()));
            }
        }
    }

    let request = CreatePriceRequest {
        product_handle,
        price_handle: &spec.handle,
        stripe_product_id,
        unit_amount_cents: spec.unit_amount_cents,
        currency: &spec.currency,
        interval: spec.interval.as_deref(),
        interval_count: spec.interval_count,
        tax_behavior: spec.tax_behavior.as_deref(),
    };
    let lookup = catalog_sync::build_lookup_price_fetch(secret, &request);
    if let Some(price) = catalog_sync::parse_lookup_price_fetch(&fetch_stripe(seams, &lookup)?)
        .map_err(|error| provider_error(&error))?
    {
        if !price_matches(&price, stripe_product_id, spec) {
            return Err(provider_error(
                "Stripe lookup price does not match catalog terms",
            ));
        }
        return Ok((
            price,
            false,
            spec.stripe_price_id.is_some(),
            seams.now_unix_secs(),
        ));
    }
    let create = catalog_sync::build_create_price_fetch(secret, &request);
    let price = parse_price(&fetch_stripe(seams, &create)?)?
        .ok_or_else(|| provider_error("Stripe price create returned no price"))?;
    if !price_matches(&price, stripe_product_id, spec) {
        return Err(provider_error(
            "Stripe created price does not match catalog terms",
        ));
    }
    Ok((
        price,
        true,
        spec.stripe_price_id.is_some(),
        seams.now_unix_secs(),
    ))
}

pub(super) fn fetch_stripe<S: HostSeams>(seams: &S, request: &Value) -> AppResult<String> {
    seams.http_fetch(&request.to_string()).map_err(|error| {
        AppError::new(
            502,
            "provider_unavailable",
            "Could not synchronize the Stripe catalog",
        )
        .with_internal(error.message)
    })
}

fn price_matches(price: &StripePrice, stripe_product_id: &str, spec: &PriceSpec) -> bool {
    price.active
        && spec
            .tax_behavior
            .as_ref()
            .is_none_or(|tax| price.tax_behavior.as_ref() == Some(tax))
        && price.product_id == stripe_product_id
        && price.unit_amount_cents == spec.unit_amount_cents
        && price.currency.eq_ignore_ascii_case(&spec.currency)
        && price.interval == spec.interval
        && price.interval_count.unwrap_or(1) == spec.interval_count.unwrap_or(1)
}
