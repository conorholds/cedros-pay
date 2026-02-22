//! Admin subscription plan management handlers
//!
//! Provides GET/PUT endpoints for managing subscription plan configuration.
//! Integrates with Stripe for automatic Price creation.

use std::sync::Arc;

use axum::{extract::State, response::IntoResponse, Json};
use serde::{Deserialize, Serialize};

use crate::config::PostgresConfigRepository;
use crate::errors::{error_response, ErrorCode};
use crate::handlers::response::json_error;
use crate::middleware::TenantContext;
use crate::models::{SubscriptionPlan, SubscriptionSettings};
use crate::services::StripeClient;

/// Config category for subscription settings
const SETTINGS_CATEGORY: &str = "subscriptions";
/// Config key for subscription settings
const SETTINGS_KEY: &str = "settings";

/// Shared state for subscription admin handlers
pub struct AdminSubscriptionsState {
    pub config_repo: Arc<PostgresConfigRepository>,
    pub stripe_client: Option<Arc<StripeClient>>,
}

// ============================================================================
// Response Types
// ============================================================================

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GetSettingsResponse {
    #[serde(flatten)]
    pub settings: SubscriptionSettings,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSettingsRequest {
    #[serde(flatten)]
    pub settings: SubscriptionSettings,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSettingsResponse {
    pub success: bool,
    pub message: String,
    #[serde(flatten)]
    pub settings: SubscriptionSettings,
}

// ============================================================================
// Handlers
// ============================================================================

/// GET /admin/subscriptions/settings - Get subscription settings
pub async fn get_settings(
    State(state): State<Arc<AdminSubscriptionsState>>,
    tenant: TenantContext,
) -> impl IntoResponse {
    match state
        .config_repo
        .get_config(&tenant.tenant_id, SETTINGS_CATEGORY)
        .await
    {
        Ok(entries) => {
            // Find the settings entry
            let settings = entries
                .iter()
                .find(|e| e.config_key == SETTINGS_KEY)
                .and_then(|e| serde_json::from_value::<SubscriptionSettings>(e.value.clone()).ok())
                .unwrap_or_default();

            Json(GetSettingsResponse { settings }).into_response()
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to get subscription settings");
            // Return default settings if not found
            Json(GetSettingsResponse {
                settings: SubscriptionSettings::default(),
            })
            .into_response()
        }
    }
}

/// PUT /admin/subscriptions/settings - Update subscription settings
pub async fn update_settings(
    State(state): State<Arc<AdminSubscriptionsState>>,
    tenant: TenantContext,
    Json(request): Json<UpdateSettingsRequest>,
) -> impl IntoResponse {
    let mut settings = request.settings;

    // Ensure all plans have IDs
    for plan in &mut settings.plans {
        plan.ensure_id();
    }

    // Create/update Stripe products and prices for plans
    if let Some(ref stripe) = state.stripe_client {
        for plan in &mut settings.plans {
            if let Err(e) = sync_plan_to_stripe(stripe, plan, &tenant.tenant_id).await {
                tracing::warn!(
                    error = %e,
                    plan_id = %plan.id,
                    "Failed to sync plan to Stripe, continuing without Stripe IDs"
                );
            }
        }
    }

    // Sort plans by sort_order
    settings.plans.sort_by_key(|p| p.sort_order);

    // Save to config
    let value = match serde_json::to_value(&settings) {
        Ok(v) => v,
        Err(e) => {
            tracing::error!(error = %e, "Failed to serialize subscription settings");
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some("Failed to serialize settings".to_string()),
                None,
            );
            return json_error(status, body).into_response();
        }
    };

    match state
        .config_repo
        .upsert_config(
            &tenant.tenant_id,
            SETTINGS_KEY,
            SETTINGS_CATEGORY,
            value,
            Some("Subscription settings update"),
            Some(&tenant.tenant_id),
        )
        .await
    {
        Ok(_) => {
            tracing::info!(
                tenant_id = %tenant.tenant_id,
                plan_count = settings.plans.len(),
                "Updated subscription settings"
            );

            Json(UpdateSettingsResponse {
                success: true,
                message: format!("Updated {} subscription plans", settings.plans.len()),
                settings,
            })
            .into_response()
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to save subscription settings");
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some("Failed to save subscription settings".to_string()),
                None,
            );
            json_error(status, body).into_response()
        }
    }
}

// ============================================================================
// Stripe Integration
// ============================================================================

/// Sync a subscription plan to Stripe (create Product + monthly/annual Prices)
async fn sync_plan_to_stripe(
    stripe: &StripeClient,
    plan: &mut SubscriptionPlan,
    tenant_id: &str,
) -> Result<(), String> {
    // Skip if Stripe is not enabled
    if !stripe.is_enabled() {
        return Ok(());
    }

    // Create or update the Stripe Product
    let product_id = if let Some(ref existing_id) = plan.stripe_product_id {
        // Product already exists, could update metadata here if needed
        existing_id.clone()
    } else {
        // Create new product
        let mut metadata = std::collections::HashMap::new();
        metadata.insert("tenant_id".to_string(), tenant_id.to_string());
        metadata.insert("plan_id".to_string(), plan.id.clone());

        let description = if plan.description.is_empty() {
            None
        } else {
            Some(plan.description.as_str())
        };

        match stripe
            .create_stripe_product(&plan.title, description, metadata)
            .await
        {
            Ok(id) => {
                plan.stripe_product_id = Some(id.clone());
                id
            }
            Err(e) => return Err(format!("Failed to create Stripe product: {}", e)),
        }
    };

    // Create monthly price if not exists and price > 0
    // NOTE: price_monthly_usd is f64 from JSON (no integer-cents alternative in public API).
    // .round() mitigates IEEE 754 imprecision for currency values (≤2 decimal places).
    if plan.stripe_price_id_monthly.is_none() && plan.price_monthly_usd > 0.0 {
        let monthly_cents = (plan.price_monthly_usd * 100.0).round() as i64;
        match stripe
            .create_stripe_recurring_price(&product_id, monthly_cents, "usd", "month", 1)
            .await
        {
            Ok(price_id) => {
                plan.stripe_price_id_monthly = Some(price_id);
            }
            Err(e) => {
                tracing::warn!(error = %e, "Failed to create monthly Stripe price");
            }
        }
    }

    // Create annual price if not exists and price > 0
    // Same f64→cents note as monthly above.
    if plan.stripe_price_id_annual.is_none() && plan.price_annual_usd > 0.0 {
        let annual_cents = (plan.price_annual_usd * 100.0).round() as i64;
        match stripe
            .create_stripe_recurring_price(&product_id, annual_cents, "usd", "year", 1)
            .await
        {
            Ok(price_id) => {
                plan.stripe_price_id_annual = Some(price_id);
            }
            Err(e) => {
                tracing::warn!(error = %e, "Failed to create annual Stripe price");
            }
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_deserialize_update_request() {
        let json = r#"{
            "enabled": true,
            "pageTitle": "Choose Your Plan",
            "plans": [
                {
                    "id": "plan_starter",
                    "title": "Starter",
                    "description": "For individuals",
                    "priceMonthlyUsd": 10,
                    "priceAnnualUsd": 100,
                    "features": ["Feature 1"],
                    "isActive": true
                }
            ]
        }"#;

        let request: UpdateSettingsRequest = serde_json::from_str(json).unwrap();
        assert!(request.settings.enabled);
        assert_eq!(request.settings.plans.len(), 1);
    }

    #[test]
    fn test_serialize_response() {
        let settings = SubscriptionSettings {
            enabled: true,
            page_title: Some("Test".to_string()),
            ..Default::default()
        };

        let response = GetSettingsResponse { settings };
        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("\"enabled\":true"));
        assert!(json.contains("\"pageTitle\":\"Test\""));
    }
}
