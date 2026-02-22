use std::sync::Arc;

use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};

use super::response::{json_error, json_ok, json_response};
use crate::errors::validation::{validate_coupon_code, validate_resource_id};
use crate::errors::{error_response, ErrorCode};
use crate::middleware::tenant::TenantContext;
use crate::repositories::ProductRepository;
use crate::services::{BlockhashCache, PaywallService, StripeClient, StripeWebhookProcessor};
use crate::storage::Store;

// ─────────────────────────────────────────────────────────────────────────────
// Shared State
// ─────────────────────────────────────────────────────────────────────────────

/// Shared application state for all handlers
pub struct AppState<S: Store> {
    pub store: Arc<S>,
    pub paywall_service: Arc<PaywallService>,
    pub product_repo: Arc<dyn ProductRepository>,
    pub stripe_client: Option<Arc<StripeClient>>,
    pub stripe_webhook_processor: Option<Arc<StripeWebhookProcessor<S>>>,
    /// Admin public keys for signature verification
    pub admin_public_keys: Vec<String>,
    /// Cached blockhash for transaction building
    pub blockhash_cache: Option<Arc<BlockhashCache>>,
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared types used across handlers
// ─────────────────────────────────────────────────────────────────────────────

/// x402 payment requirement (mapped from Requirement model)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AcceptEntry {
    pub scheme: String,
    pub network: String,
    pub max_amount_required: String,
    pub resource: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mime_type: Option<String>,
    pub pay_to: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_timeout_seconds: Option<i64>,
    pub asset: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub extra: Option<serde_json::Value>,
}

// ─────────────────────────────────────────────────────────────────────────────
// Request/Response types
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QuoteQuery {
    pub resource: Option<String>,
    /// Coupon code to apply (query param: couponCode)
    pub coupon_code: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QuoteResponse {
    pub resource: String,
    pub expires_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stripe: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub crypto: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub credits: Option<serde_json::Value>,
}

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

/// GET /paywall/v1/quote - Get payment quote for a resource
pub async fn quote<S: Store + 'static>(
    State(state): State<Arc<AppState<S>>>,
    tenant: TenantContext,
    Query(query): Query<QuoteQuery>,
) -> impl IntoResponse {
    // Validate resource parameter
    let resource = match &query.resource {
        Some(r) if !r.is_empty() => {
            if let Err(e) = validate_resource_id(r) {
                let (status, body) = error_response(
                    ErrorCode::InvalidResource,
                    Some(e.message),
                    Some(serde_json::json!({ "field": e.field })),
                );
                return json_error(status, body);
            }
            r.clone()
        }
        _ => {
            let (status, body) = error_response(
                ErrorCode::MissingField,
                Some("resource is required".to_string()),
                Some(serde_json::json!({ "field": "resource" })),
            );
            return json_error(status, body);
        }
    };

    // Validate coupon parameter if provided
    if let Some(ref coupon) = query.coupon_code {
        if !coupon.is_empty() {
            if let Err(e) = validate_coupon_code(coupon) {
                let (status, body) = error_response(
                    ErrorCode::InvalidCoupon,
                    Some(e.message),
                    Some(serde_json::json!({ "field": e.field })),
                );
                return json_error(status, body);
            }
        }
    }

    let result = state
        .paywall_service
        .generate_quote(&tenant.tenant_id, &resource, query.coupon_code.as_deref())
        .await;

    match result {
        Ok(quote) => {
            let crypto_json = quote.crypto.map(|c| {
                serde_json::json!({
                    "scheme": c.scheme,
                    "network": c.network,
                    "maxAmountRequired": c.max_amount_required,
                    "resource": c.resource_id,
                    "description": c.description,
                    "mimeType": c.mime_type,
                    "payTo": c.pay_to,
                    "asset": c.asset,
                    "maxTimeoutSeconds": c.max_timeout_seconds,
                    "extra": c.extra
                })
            });

            let stripe_json = quote.stripe.map(|s| {
                serde_json::json!({
                    "priceId": s.price_id,
                    "amountCents": s.amount_cents,
                    "currency": s.currency,
                    "description": s.description
                })
            });

            let credits_json = quote.credits.map(|c| {
                serde_json::json!({
                    "amount": c.amount,
                    "currency": c.currency,
                    "description": c.description,
                    "resource": c.resource_id
                })
            });

            let resp = QuoteResponse {
                resource: quote.resource_id,
                expires_at: quote.expires_at.to_rfc3339(),
                stripe: stripe_json,
                crypto: crypto_json,
                credits: credits_json,
            };
            json_ok(resp)
        }
        Err(e) => {
            // Use proper HTTP status code from error code per spec 15-errors.md
            let (status, error_body) = error_response(e.code(), Some(e.safe_message()), None);
            json_error(status, error_body)
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /paywall/v1/quote - Returns HTTP 402 with x402 quote
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QuotePostRequest {
    pub resource: String,
    pub coupon_code: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Quote402Response {
    pub x402_version: i32,
    /// Error message for x402 compliance (matches Go server)
    pub error: String,
    pub accepts: Vec<AcceptEntry>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ShopConfigResponse {
    pub checkout: ShopCheckoutConfigResponse,
    /// Stripe configuration for frontend initialization
    pub stripe: Option<ShopStripeConfigResponse>,
    /// x402 (crypto) payment configuration
    pub x402: Option<ShopX402ConfigResponse>,
    /// Which payment methods are enabled
    pub payment_methods: PaymentMethodsConfigResponse,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ShopCheckoutConfigResponse {
    pub guest_checkout: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ShopStripeConfigResponse {
    /// Stripe publishable key (pk_test_... or pk_live_...)
    pub publishable_key: String,
    /// Stripe mode: "test" or "live"
    pub mode: String,
    /// Whether Stripe payments are enabled
    pub enabled: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ShopX402ConfigResponse {
    /// Solana network (mainnet, devnet, etc.)
    pub network: String,
    /// Payment address for x402 transfers
    pub payment_address: String,
    /// Token mint address (for SPL tokens)
    pub token_mint: String,
    /// Token symbol (e.g., "USDC")
    pub token_symbol: String,
    /// Whether x402 payments are enabled
    pub enabled: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PaymentMethodsConfigResponse {
    pub stripe: bool,
    pub x402: bool,
    pub credits: bool,
}

/// GET /paywall/v1/shop - Public shop checkout config
///
/// Returns shop configuration including:
/// - Checkout settings (guest checkout enabled)
/// - Stripe configuration (publishable key, mode)
/// - x402 crypto payment configuration
/// - Enabled payment methods
///
/// This endpoint provides all necessary config for frontend payment initialization.
pub async fn shop_config<S: Store + 'static>(
    State(state): State<Arc<AppState<S>>>,
    _tenant: TenantContext,
) -> impl IntoResponse {
    let config = &state.paywall_service.config;

    // Build Stripe config if enabled and has publishable key
    let stripe_config = if config.stripe.enabled && !config.stripe.publishable_key.is_empty() {
        Some(ShopStripeConfigResponse {
            publishable_key: config.stripe.publishable_key.clone(),
            mode: config.stripe.mode.clone(),
            enabled: true,
        })
    } else {
        None
    };

    // Build x402 config if enabled
    let x402_config = if config.x402.enabled {
        Some(ShopX402ConfigResponse {
            network: config.x402.network.clone(),
            payment_address: config.x402.payment_address.clone(),
            token_mint: config.x402.token_mint.clone(),
            token_symbol: config.x402.token_symbol.clone(),
            enabled: true,
        })
    } else {
        None
    };

    // Check credits enabled (from cedros_login config)
    let credits_enabled = config.cedros_login.credits_enabled;

    let resp = ShopConfigResponse {
        checkout: ShopCheckoutConfigResponse {
            guest_checkout: config.shop.checkout.guest_checkout,
        },
        stripe: stripe_config,
        x402: x402_config,
        payment_methods: PaymentMethodsConfigResponse {
            stripe: config.stripe.enabled && !config.stripe.publishable_key.is_empty(),
            x402: config.x402.enabled && !config.x402.payment_address.is_empty(),
            credits: credits_enabled,
        },
    };
    (StatusCode::OK, Json(resp))
}

/// POST /paywall/v1/quote - Get payment quote (returns HTTP 402)
pub async fn quote_402<S: Store + 'static>(
    State(state): State<Arc<AppState<S>>>,
    tenant: TenantContext,
    Json(req): Json<QuotePostRequest>,
) -> impl IntoResponse {
    // Validate resource parameter
    if let Err(e) = validate_resource_id(&req.resource) {
        let (status, body) = error_response(
            ErrorCode::InvalidResource,
            Some(e.message),
            Some(serde_json::json!({ "field": e.field })),
        );
        return json_error(status, body);
    }

    // Validate coupon_code parameter if provided
    if let Some(ref coupon) = req.coupon_code {
        if !coupon.is_empty() {
            if let Err(e) = validate_coupon_code(coupon) {
                let (status, body) = error_response(
                    ErrorCode::InvalidCoupon,
                    Some(e.message),
                    Some(serde_json::json!({ "field": e.field })),
                );
                return json_error(status, body);
            }
        }
    }

    let result = state
        .paywall_service
        .generate_quote(&tenant.tenant_id, &req.resource, req.coupon_code.as_deref())
        .await;

    match result {
        Ok(quote) => {
            let mut accepts = Vec::new();

            if let Some(crypto) = quote.crypto {
                accepts.push(AcceptEntry {
                    scheme: crypto.scheme,
                    network: crypto.network,
                    max_amount_required: crypto.max_amount_required,
                    resource: crypto.resource_id,
                    description: if crypto.description.is_empty() {
                        None
                    } else {
                        Some(crypto.description)
                    },
                    mime_type: Some(crypto.mime_type),
                    pay_to: crypto.pay_to,
                    max_timeout_seconds: crypto.max_timeout_seconds.map(|v| v as i64),
                    asset: crypto.asset,
                    // BUG-002: Handle serialization errors properly
                    extra: crypto.extra.and_then(|e| match serde_json::to_value(e) {
                        Ok(v) => Some(v),
                        Err(err) => {
                            tracing::warn!(error = %err, "Failed to serialize crypto extra data");
                            None
                        }
                    }),
                });
            }

            let resp = Quote402Response {
                x402_version: 0,
                error: "payment required".to_string(),
                accepts,
            };

            // Return HTTP 402 Payment Required
            json_response(StatusCode::PAYMENT_REQUIRED, resp)
        }
        Err(e) => {
            // Use proper HTTP status code from error code per spec 15-errors.md
            let (status, error_body) =
                crate::errors::error_response(e.code(), Some(e.safe_message()), None);
            json_error(status, error_body)
        }
    }
}
