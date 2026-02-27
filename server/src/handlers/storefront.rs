//! Public storefront settings endpoint.
//!
//! Exposes the `shop` config category (display settings like shopPage title,
//! description, catalog layout, etc.) without requiring admin authentication.
//! Also exposes payment method enabled/disabled flags (never secrets).

use std::sync::Arc;

use axum::{extract::State, response::IntoResponse};
use serde::Serialize;
use serde_json::Value as JsonValue;

use crate::config::PostgresConfigRepository;
use crate::constants::PRODUCTS_CACHE_MAX_AGE;
use crate::errors::{error_response, ErrorCode};
use crate::handlers::response::{json_error, json_ok_cached};
use crate::middleware::TenantContext;

/// Category name in `app_config` for storefront display settings.
const SHOP_CATEGORY: &str = "shop";

/// Shared state for the public storefront handler.
pub struct StorefrontState {
    pub repo: Arc<PostgresConfigRepository>,
}

/// Which payment methods are enabled. Only reads the `enabled` key — never secrets.
#[derive(Debug, Serialize)]
pub struct PaymentMethodsResponse {
    pub stripe: bool,
    pub x402: bool,
    pub credits: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StorefrontResponse {
    pub config: JsonValue,
    pub payment_methods: PaymentMethodsResponse,
}

/// Read the `enabled` config key for a payment category, defaulting to `false`.
async fn read_enabled_flag(
    repo: &PostgresConfigRepository,
    tenant_id: &str,
    category: &str,
) -> bool {
    match repo.get_config(tenant_id, category).await {
        Ok(entries) => entries
            .iter()
            .find(|e| e.config_key == "enabled")
            .and_then(|e| e.value.as_bool())
            .unwrap_or(false),
        Err(_) => false,
    }
}

/// GET /paywall/v1/storefront — public, no admin auth.
///
/// Returns `{ "config": { ... }, "paymentMethods": { ... } }`.
/// Empty config returns `{ "config": {} }` (HTTP 200, not 404).
pub async fn get_storefront_config(
    State(state): State<Arc<StorefrontState>>,
    tenant: TenantContext,
) -> impl IntoResponse {
    let tid = &tenant.tenant_id;
    match state.repo.get_config(tid, SHOP_CATEGORY).await {
        Ok(entries) => {
            let mut config = serde_json::Map::new();
            for entry in &entries {
                config.insert(entry.config_key.clone(), entry.value.clone());
            }

            let (stripe, x402, credits) = tokio::join!(
                read_enabled_flag(&state.repo, tid, "stripe"),
                read_enabled_flag(&state.repo, tid, "x402"),
                read_enabled_flag(&state.repo, tid, "cedros_login"),
            );

            json_ok_cached(
                StorefrontResponse {
                    config: JsonValue::Object(config),
                    payment_methods: PaymentMethodsResponse { stripe, x402, credits },
                },
                PRODUCTS_CACHE_MAX_AGE,
            )
            .into_response()
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to read storefront config");
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some("Failed to read storefront config".to_string()),
                None,
            );
            json_error(status, body).into_response()
        }
    }
}
