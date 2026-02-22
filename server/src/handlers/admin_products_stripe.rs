//! Stripe auto-create / sync helpers for admin product handlers.
//!
//! Isolated here to keep `admin_products.rs` within the 500-line file budget.

use std::collections::HashMap;

use axum::response::{IntoResponse, Response};

use crate::errors::{error_response, ErrorCode};
use crate::handlers::response::json_error;
use crate::services::StripeClient;

/// Creates Stripe product + price when a new product with a fiat price is saved
/// and no `stripe_price_id` was supplied by the caller.
///
/// Returns `(stripe_product_id, stripe_price_id)`. On Stripe error, returns
/// `Err(response)` so the caller can propagate it directly.
pub(crate) async fn stripe_ids_for_create(
    stripe_client: &StripeClient,
    product_id: &str,
    tenant_id: &str,
    stripe_name: &str,
    description: &str,
    amount_cents: i64,
    currency: &str,
    metadata: HashMap<String, String>,
) -> Result<(Option<String>, Option<String>), Response> {
    let mut meta = metadata;
    meta.insert("product_id".to_string(), product_id.to_string());
    meta.insert("tenant_id".to_string(), tenant_id.to_string());

    let prod_id = stripe_client
        .create_stripe_product(stripe_name, Some(description), meta)
        .await
        .map_err(|e| {
            tracing::error!(error = %e, "Failed to auto-create Stripe product");
            let (status, body) = error_response(
                ErrorCode::StripeError,
                Some("Failed to create Stripe product".to_string()),
                None,
            );
            json_error(status, body).into_response()
        })?;

    let price_id = stripe_client
        .create_stripe_price(&prod_id, amount_cents, currency)
        .await
        .map_err(|e| {
            tracing::error!(error = %e, "Failed to auto-create Stripe price");
            let (status, body) = error_response(
                ErrorCode::StripeError,
                Some("Failed to create Stripe price".to_string()),
                None,
            );
            json_error(status, body).into_response()
        })?;

    tracing::info!(
        product_id = %product_id,
        stripe_product_id = %prod_id,
        stripe_price_id = %price_id,
        "Auto-created Stripe product and price"
    );
    Ok((Some(prod_id), Some(price_id)))
}

/// Syncs an existing product to Stripe on update and returns the final
/// `(stripe_product_id, stripe_price_id)` pair.
///
/// Logic:
/// 1. If the product already has a `stripe_product_id`, sync name/description/metadata.
/// 2. If no Stripe product yet and fiat price is provided, auto-create product + price.
/// 3. Otherwise, preserve existing Stripe IDs (or use caller-supplied `stripe_price_id`).
pub(crate) async fn stripe_ids_for_update(
    stripe_client: &StripeClient,
    product_id: &str,
    tenant_id: &str,
    stripe_name: &str,
    description: &str,
    fiat_amount_cents: Option<i64>,
    fiat_currency: Option<&str>,
    caller_stripe_price_id: Option<String>,
    existing_stripe_product_id: Option<&str>,
    existing_stripe_price_id: Option<String>,
    metadata: HashMap<String, String>,
) -> Result<(Option<String>, Option<String>), Response> {
    if let Some(existing_prod_id) = existing_stripe_product_id {
        // Sync metadata / name / description to Stripe (non-fatal on failure)
        let mut meta = metadata;
        meta.insert("product_id".to_string(), product_id.to_string());
        meta.insert("tenant_id".to_string(), tenant_id.to_string());

        if let Err(e) = stripe_client
            .update_stripe_product(existing_prod_id, stripe_name, Some(description), meta)
            .await
        {
            tracing::warn!(
                error = %e,
                "Failed to sync product update to Stripe (non-fatal)"
            );
        } else {
            tracing::info!(
                product_id = %product_id,
                stripe_product_id = %existing_prod_id,
                "Synced product update to Stripe"
            );
        }

        return Ok((
            Some(existing_prod_id.to_string()),
            caller_stripe_price_id.or(existing_stripe_price_id),
        ));
    }

    // No existing Stripe product – auto-create if fiat price provided and no price ID
    if let Some(amount_cents) = fiat_amount_cents {
        if caller_stripe_price_id.is_none() && existing_stripe_price_id.is_none() {
            let mut meta = metadata;
            meta.insert("product_id".to_string(), product_id.to_string());
            meta.insert("tenant_id".to_string(), tenant_id.to_string());

            let prod_id = stripe_client
                .create_stripe_product(stripe_name, Some(description), meta)
                .await
                .map_err(|e| {
                    tracing::error!(error = %e, "Failed to auto-create Stripe product");
                    let (status, body) = error_response(
                        ErrorCode::StripeError,
                        Some("Failed to create Stripe product".to_string()),
                        None,
                    );
                    json_error(status, body).into_response()
                })?;

            let currency = fiat_currency.unwrap_or("usd");
            let price_id = stripe_client
                .create_stripe_price(&prod_id, amount_cents, currency)
                .await
                .map_err(|e| {
                    tracing::error!(error = %e, "Failed to auto-create Stripe price");
                    let (status, body) = error_response(
                        ErrorCode::StripeError,
                        Some("Failed to create Stripe price".to_string()),
                        None,
                    );
                    json_error(status, body).into_response()
                })?;

            tracing::info!(
                product_id = %product_id,
                stripe_product_id = %prod_id,
                stripe_price_id = %price_id,
                "Auto-created Stripe product and price on update"
            );
            return Ok((Some(prod_id), Some(price_id)));
        }
    }

    // Preserve existing IDs, preferring caller-supplied stripe_price_id
    Ok((
        existing_stripe_product_id.map(str::to_string),
        caller_stripe_price_id.or(existing_stripe_price_id),
    ))
}
