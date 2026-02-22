//! Stripe sync helpers for admin coupon handlers.

use std::collections::HashMap;

use axum::response::{IntoResponse, Response};

use crate::errors::{error_response, ErrorCode};
use crate::handlers::response::json_error;
use crate::models::Coupon;
use crate::services::StripeClient;

/// Creates a Stripe coupon + promotion code for a new coupon.
///
/// Returns `(stripe_coupon_id, stripe_promotion_code_id)`.
/// On Stripe error, returns `Err(response)` so the caller can propagate it directly.
pub(crate) async fn stripe_ids_for_create_coupon(
    stripe_client: &StripeClient,
    coupon_code: &str,
    tenant_id: &str,
    discount_type: &str,
    discount_value: f64,
    currency: Option<&str>,
    minimum_amount_cents: Option<i64>,
    first_purchase_only: bool,
) -> Result<(Option<String>, Option<String>), Response> {
    let mut metadata = HashMap::new();
    metadata.insert("coupon_code".to_string(), coupon_code.to_string());
    metadata.insert("tenant_id".to_string(), tenant_id.to_string());

    let coupon_id = stripe_client
        .create_stripe_coupon(discount_type, discount_value, currency, metadata.clone())
        .await
        .map_err(|e| {
            tracing::error!(error = %e, "Failed to auto-create Stripe coupon");
            let (status, body) = error_response(
                ErrorCode::StripeError,
                Some("Failed to create Stripe coupon".to_string()),
                None,
            );
            json_error(status, body).into_response()
        })?;

    let promo_id = stripe_client
        .create_stripe_promotion_code_with_restrictions(
            &coupon_id,
            coupon_code,
            metadata,
            minimum_amount_cents,
            currency,
            first_purchase_only,
        )
        .await
        .map_err(|e| {
            tracing::error!(error = %e, "Failed to auto-create Stripe promotion code");
            let (status, body) = error_response(
                ErrorCode::StripeError,
                Some("Failed to create Stripe promotion code".to_string()),
                None,
            );
            json_error(status, body).into_response()
        })?;

    tracing::info!(
        coupon_code = %coupon_code,
        stripe_coupon_id = %coupon_id,
        stripe_promotion_code_id = %promo_id,
        "Auto-created Stripe coupon and promotion code"
    );
    Ok((Some(coupon_id), Some(promo_id)))
}

/// Syncs an existing coupon to Stripe on update.
///
/// Returns `(stripe_coupon_id, stripe_promotion_code_id)`.
/// On hard Stripe error, returns `Err(response)`.
/// Sync failures are treated as non-fatal warnings.
pub(crate) async fn stripe_ids_for_update_coupon(
    stripe_client: &StripeClient,
    existing: &Coupon,
    coupon_code: &str,
    tenant_id: &str,
    discount_type: &str,
    discount_value: f64,
    currency: Option<&str>,
    minimum_amount_cents: Option<i64>,
    first_purchase_only: bool,
    deactivate: bool,
) -> Result<(Option<String>, Option<String>), Response> {
    if existing.stripe_coupon_id.is_some() {
        let mut metadata = HashMap::new();
        metadata.insert("coupon_code".to_string(), coupon_code.to_string());
        metadata.insert("tenant_id".to_string(), tenant_id.to_string());

        // Sync metadata to Stripe coupon (non-fatal)
        if let Some(ref stripe_coupon_id) = existing.stripe_coupon_id {
            if let Err(e) = stripe_client
                .update_stripe_coupon(stripe_coupon_id, metadata)
                .await
            {
                tracing::warn!(
                    error = %e,
                    "Failed to sync coupon metadata to Stripe (non-fatal)"
                );
            } else {
                tracing::info!(
                    stripe_coupon_id = %stripe_coupon_id,
                    "Synced coupon metadata to Stripe"
                );
            }
        }

        // Deactivate promotion code in Stripe if coupon is being deactivated (non-fatal)
        if deactivate {
            if let Some(ref stripe_promo_id) = existing.stripe_promotion_code_id {
                if let Err(e) = stripe_client
                    .deactivate_stripe_promotion_code(stripe_promo_id)
                    .await
                {
                    tracing::warn!(
                        error = %e,
                        "Failed to deactivate promotion code in Stripe (non-fatal)"
                    );
                } else {
                    tracing::info!(
                        stripe_promotion_code_id = %stripe_promo_id,
                        "Deactivated promotion code in Stripe"
                    );
                }
            }
        }

        return Ok((
            existing.stripe_coupon_id.clone(),
            existing.stripe_promotion_code_id.clone(),
        ));
    }

    // No existing Stripe coupon – auto-create
    let result = stripe_ids_for_create_coupon(
        stripe_client,
        coupon_code,
        tenant_id,
        discount_type,
        discount_value,
        currency,
        minimum_amount_cents,
        first_purchase_only,
    )
    .await?;

    // Retag the log line as "on update"
    tracing::info!(
        coupon_code = %coupon_code,
        "Auto-created Stripe coupon and promotion code on update"
    );
    Ok(result)
}
