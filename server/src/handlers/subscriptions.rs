use std::sync::Arc;

use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use super::response::{json_error, json_ok};
use crate::errors::{error_response, ErrorCode};
use crate::middleware::tenant::TenantContext;
use crate::models::BillingPeriod;
use crate::repositories::ProductRepository;
use crate::services::{PaywallService, StripeClient, SubscriptionService};
use crate::storage::Store;

// ─────────────────────────────────────────────────────────────────────────────
// Request/Response types
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubscriptionStatusQuery {
    /// User ID - can be wallet address or Stripe customer ID
    pub user_id: String,
    /// Product/resource ID
    pub resource: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SubscriptionStatusResponse {
    pub active: bool,
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expires_at: Option<DateTime<Utc>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub current_period_end: Option<DateTime<Utc>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub interval: Option<String>,
    pub cancel_at_period_end: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateX402SubscriptionRequest {
    pub wallet: String,
    pub product_id: String,
    /// Optional x402 payment signature - if provided, verifies payment
    pub payment_signature: Option<String>,
    /// Optional custom metadata
    pub metadata: Option<std::collections::HashMap<String, String>>,
    pub billing_period: Option<String>,
    pub billing_interval: Option<i32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateCreditsSubscriptionRequest {
    pub wallet: String,
    pub product_id: String,
    /// Optional credits hold ID - if provided, verifies payment was captured
    pub hold_id: Option<String>,
    /// Optional custom metadata
    pub metadata: Option<std::collections::HashMap<String, String>>,
    pub billing_period: Option<String>,
    pub billing_interval: Option<i32>,
}

/// Response for x402/activate per spec (03-http-endpoints-subscriptions.md)
/// Note: cancelAtPeriodEnd and paymentMethod are NOT in the spec response
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct X402ActivateResponse {
    pub subscription_id: String,
    pub product_id: String,
    pub wallet: String,
    pub status: String,
    pub current_period_start: DateTime<Utc>,
    pub current_period_end: DateTime<Utc>,
    pub billing_period: String,
    pub billing_interval: i32,
    /// Optional: Payment quote if payment not yet made (per spec 03-http-endpoints-subscriptions.md)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub quote: Option<serde_json::Value>,
}

/// Full subscription response for internal use or other endpoints
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SubscriptionResponse {
    pub subscription_id: String,
    pub product_id: String,
    pub wallet: String,
    pub status: String,
    pub payment_method: String,
    pub current_period_start: DateTime<Utc>,
    pub current_period_end: DateTime<Utc>,
    pub billing_period: String,
    pub billing_interval: i32,
    pub cancel_at_period_end: bool,
    /// Optional: Payment quote if payment not yet made (per spec 03-http-endpoints-subscriptions.md)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub quote: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CancelRequest {
    pub subscription_id: String,
    pub at_period_end: Option<bool>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CancelResponse {
    pub success: bool,
    /// Per spec, response field is atPeriodEnd (same as input)
    #[serde(rename = "atPeriodEnd")]
    pub at_period_end: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReactivateRequest {
    pub subscription_id: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReactivateResponse {
    pub success: bool,
    pub subscription_id: String,
    pub status: String,
    pub cancel_at_period_end: bool,
    pub current_period_end: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StripeSessionRequest {
    pub resource: String,
    pub interval: String,
    pub interval_days: Option<i32>,
    pub trial_days: Option<i32>,
    pub customer_email: Option<String>,
    pub metadata: Option<serde_json::Value>,
    pub coupon_code: Option<String>,
    pub success_url: Option<String>,
    pub cancel_url: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StripeSessionResponse {
    pub session_id: String,
    pub url: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubscriptionQuoteRequest {
    pub resource: String,
    pub interval: String,
    pub coupon_code: Option<String>,
    pub interval_days: Option<i32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PortalRequest {
    pub customer_id: String,
    pub return_url: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PortalResponse {
    pub url: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChangeRequest {
    pub subscription_id: String,
    pub new_resource: String,
    pub proration_behavior: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChangeResponse {
    pub success: bool,
    pub subscription_id: String,
    pub previous_resource: String,
    pub new_resource: String,
    pub status: String,
    pub current_period_end: DateTime<Utc>,
    pub proration_behavior: String,
}

// ─────────────────────────────────────────────────────────────────────────────
// Subscription service state wrapper
// ─────────────────────────────────────────────────────────────────────────────

pub struct SubscriptionAppState<S: Store> {
    pub subscription_service: Arc<SubscriptionService<S>>,
    pub stripe_client: Option<Arc<StripeClient>>,
    pub paywall_service: Arc<PaywallService>,
    pub product_repo: Arc<dyn ProductRepository>,
}

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

/// GET /paywall/v1/subscription/status - Get subscription status for user/resource
pub async fn status<S: Store + 'static>(
    State(state): State<Arc<SubscriptionAppState<S>>>,
    tenant: TenantContext,
    Query(query): Query<SubscriptionStatusQuery>,
) -> impl IntoResponse {
    let result = state
        .subscription_service
        .has_access(&tenant.tenant_id, &query.user_id, &query.resource)
        .await;

    match result {
        Ok((has_access, sub_opt)) => {
            // Per spec (03-http-endpoints-subscriptions.md): status must be one of:
            // "active" | "trialing" | "past_due" | "canceled" | "unpaid" | "expired"
            // When no subscription exists, use "expired" as the default
            let resp = SubscriptionStatusResponse {
                active: has_access,
                status: sub_opt
                    .as_ref()
                    .map(|s| s.status.to_string())
                    .unwrap_or_else(|| "expired".to_string()),
                expires_at: sub_opt.as_ref().map(|s| s.current_period_end),
                current_period_end: sub_opt.as_ref().map(|s| s.current_period_end),
                interval: sub_opt.as_ref().map(|s| s.billing_period.to_string()),
                cancel_at_period_end: sub_opt
                    .as_ref()
                    .map(|s| s.cancel_at_period_end)
                    .unwrap_or(false),
            };
            json_ok(resp)
        }
        Err(e) => {
            let (status, body) =
                crate::errors::error_response(e.code(), Some(e.safe_message()), None);
            json_error(status, body)
        }
    }
}

/// POST /paywall/v1/subscription/x402/activate - Activate x402 subscription
/// Per spec (03-http-endpoints-subscriptions.md): if paymentSignature is omitted or invalid,
/// the response includes a quote for the user to complete payment.
pub async fn create_x402<S: Store + 'static>(
    State(state): State<Arc<SubscriptionAppState<S>>>,
    tenant: TenantContext,
    Json(req): Json<CreateX402SubscriptionRequest>,
) -> impl IntoResponse {
    // Per spec (17-validation.md): billing_period must be valid enum value
    let billing_period = if let Some(ref period_str) = req.billing_period {
        match parse_billing_period(period_str) {
            Ok(period) => period,
            Err(code) => {
                let (status, body) = crate::errors::error_response(
                    code,
                    Some(format!("invalid billing_period: {}", period_str)),
                    None,
                );
                return json_error(status, body);
            }
        }
    } else {
        BillingPeriod::Month
    };

    // Per spec (17-validation.md): billing_interval must be >= 1
    let billing_interval = req.billing_interval.unwrap_or(1);
    if billing_interval < 1 {
        let (status, body) = crate::errors::error_response(
            crate::errors::ErrorCode::InvalidField,
            Some("billing_interval must be >= 1".to_string()),
            None,
        );
        return json_error(status, body);
    }

    // SECURITY (H-004): Check if payment was already processed for a subscription.
    // This prevents creating duplicate subscriptions for the same payment.
    // Note: This check has TOCTOU race, but is mitigated by idempotency below.
    let payment_already_used = if let Some(ref sig) = req.payment_signature {
        state
            .subscription_service
            .store()
            .get_subscription_by_payment_signature(&tenant.tenant_id, sig)
            .await
            .map(|s| s.is_some())
            .unwrap_or(false)
    } else {
        false
    };

    if payment_already_used {
        let (status, body) = error_response(
            ErrorCode::PaymentAlreadyUsed,
            Some("Payment signature already used for a subscription".to_string()),
            None,
        );
        return json_error(status, body);
    }

    // Check if payment signature was provided and valid
    let payment_verified = if let Some(ref sig) = req.payment_signature {
        // Verify the payment signature via paywall service
        state
            .paywall_service
            .has_payment_been_processed(&tenant.tenant_id, sig)
            .await
            .unwrap_or(false)
    } else {
        false
    };

    // SECURITY (H-004): Pass payment signature to subscription creation for idempotency.
    // The subscription service will use atomic UPSERT to prevent duplicates.
    let result = state
        .subscription_service
        .create_x402_subscription(
            &tenant.tenant_id,
            &req.wallet,
            &req.product_id,
            billing_period,
            billing_interval,
            req.payment_signature.as_deref(),
        )
        .await;

    match result {
        Ok(sub) => {
            // Per spec: include quote if payment not yet made
            let quote = if !payment_verified {
                // Generate quote for the product
                match state
                    .paywall_service
                    .generate_quote(&tenant.tenant_id, &req.product_id, None)
                    .await
                {
                    Ok(q) => Some(serde_json::to_value(q).unwrap_or_default()),
                    Err(_) => None,
                }
            } else {
                None
            };

            // Per spec (03-http-endpoints-subscriptions.md): x402/activate response
            // does NOT include cancelAtPeriodEnd or paymentMethod
            let resp = X402ActivateResponse {
                subscription_id: sub.id.clone(),
                product_id: sub.product_id.clone(),
                wallet: sub.wallet.clone().unwrap_or_default(),
                status: sub.status.to_string(),
                current_period_start: sub.current_period_start,
                current_period_end: sub.current_period_end,
                billing_period: sub.billing_period.to_string(),
                billing_interval: sub.billing_interval,
                quote,
            };
            json_ok(resp)
        }
        Err(e) => {
            let (status, body) =
                crate::errors::error_response(e.code(), Some(e.safe_message()), None);
            json_error(status, body)
        }
    }
}

/// POST /paywall/v1/subscription/credits/activate - Activate credits subscription
/// Similar to x402/activate but payment is via cedros-login credits hold
pub async fn create_credits<S: Store + 'static>(
    State(state): State<Arc<SubscriptionAppState<S>>>,
    tenant: TenantContext,
    Json(req): Json<CreateCreditsSubscriptionRequest>,
) -> impl IntoResponse {
    // Validate billing_period
    let billing_period = if let Some(ref period_str) = req.billing_period {
        match parse_billing_period(period_str) {
            Ok(period) => period,
            Err(code) => {
                let (status, body) = crate::errors::error_response(
                    code,
                    Some(format!("invalid billing_period: {}", period_str)),
                    None,
                );
                return json_error(status, body);
            }
        }
    } else {
        BillingPeriod::Month
    };

    // Validate billing_interval
    let billing_interval = req.billing_interval.unwrap_or(1);
    if billing_interval < 1 {
        let (status, body) = crate::errors::error_response(
            crate::errors::ErrorCode::InvalidField,
            Some("billing_interval must be >= 1".to_string()),
            None,
        );
        return json_error(status, body);
    }

    // CREDITS-001: Credits subscription activation must not create an active subscription
    // without proof that payment was captured and recorded.
    let payment_verified = match req.hold_id.as_deref() {
        Some(hold_id) => {
            let signature = format!("credits:{}", hold_id);
            state
                .paywall_service
                .has_payment_been_processed(&tenant.tenant_id, &signature)
                .await
                .unwrap_or(false)
        }
        None => false,
    };

    if !payment_verified {
        let quote = state
            .paywall_service
            .generate_quote(&tenant.tenant_id, &req.product_id, None)
            .await
            .ok()
            .and_then(|q| serde_json::to_value(q).ok());

        let (status, body) = crate::errors::error_response(
            crate::errors::ErrorCode::PaymentRequired,
            Some("payment required".to_string()),
            quote.map(|q| serde_json::json!({ "quote": q })),
        );
        return json_error(status, body);
    }

    let result = state
        .subscription_service
        .create_credits_subscription(
            &tenant.tenant_id,
            &req.wallet,
            &req.product_id,
            billing_period,
            billing_interval,
        )
        .await;

    match result {
        Ok(sub) => {
            // Reuse X402ActivateResponse since the structure is the same
            let resp = X402ActivateResponse {
                subscription_id: sub.id.clone(),
                product_id: sub.product_id.clone(),
                wallet: sub.wallet.clone().unwrap_or_default(),
                status: sub.status.to_string(),
                current_period_start: sub.current_period_start,
                current_period_end: sub.current_period_end,
                billing_period: sub.billing_period.to_string(),
                billing_interval: sub.billing_interval,
                quote: None,
            };
            json_ok(resp)
        }
        Err(e) => {
            let (status, body) =
                crate::errors::error_response(e.code(), Some(e.safe_message()), None);
            json_error(status, body)
        }
    }
}

/// POST /paywall/v1/subscription/cancel - Cancel subscription
pub async fn cancel<S: Store + 'static>(
    State(state): State<Arc<SubscriptionAppState<S>>>,
    tenant: TenantContext,
    Json(req): Json<CancelRequest>,
) -> impl IntoResponse {
    let at_period_end = req.at_period_end.unwrap_or(true);

    let result = state
        .subscription_service
        .cancel(&tenant.tenant_id, &req.subscription_id, at_period_end)
        .await;

    match result {
        Ok(sub) => {
            let resp = CancelResponse {
                success: true,
                at_period_end: sub.cancel_at_period_end,
            };
            json_ok(resp)
        }
        Err(e) => {
            let (status, body) =
                crate::errors::error_response(e.code(), Some(e.safe_message()), None);
            json_error(status, body)
        }
    }
}

/// POST /paywall/v1/subscription/reactivate - Reactivate cancelled subscription
pub async fn reactivate<S: Store + 'static>(
    State(state): State<Arc<SubscriptionAppState<S>>>,
    tenant: TenantContext,
    Json(req): Json<ReactivateRequest>,
) -> impl IntoResponse {
    let result = state
        .subscription_service
        .reactivate(&tenant.tenant_id, &req.subscription_id)
        .await;

    match result {
        Ok(sub) => {
            let resp = ReactivateResponse {
                success: true,
                subscription_id: sub.id.clone(),
                status: sub.status.to_string(),
                cancel_at_period_end: sub.cancel_at_period_end,
                current_period_end: sub.current_period_end,
            };
            json_ok(resp)
        }
        Err(e) => {
            let (status, body) =
                crate::errors::error_response(e.code(), Some(e.safe_message()), None);
            json_error(status, body)
        }
    }
}

/// POST /paywall/v1/subscription/stripe-session - Create Stripe subscription session
pub async fn stripe_session<S: Store + 'static>(
    State(state): State<Arc<SubscriptionAppState<S>>>,
    tenant: TenantContext,
    headers: axum::http::HeaderMap,
    Json(req): Json<StripeSessionRequest>,
) -> impl IntoResponse {
    // SEC-006: Validate redirect URLs to prevent SSRF
    if let Some(ref url) = req.success_url {
        if let Err(e) = crate::errors::validation::validate_redirect_url_with_env(
            url,
            &state.paywall_service.config.logging.environment,
        ) {
            let (status, body) = crate::errors::error_response(
                crate::errors::ErrorCode::InvalidField,
                Some(format!("success_url: {}", e.message)),
                None,
            );
            return json_error(status, body);
        }
    }
    if let Some(ref url) = req.cancel_url {
        if let Err(e) = crate::errors::validation::validate_redirect_url_with_env(
            url,
            &state.paywall_service.config.logging.environment,
        ) {
            let (status, body) = crate::errors::error_response(
                crate::errors::ErrorCode::InvalidField,
                Some(format!("cancel_url: {}", e.message)),
                None,
            );
            return json_error(status, body);
        }
    }

    // Check if Stripe is configured
    let stripe_client = match &state.stripe_client {
        Some(client) => client,
        None => {
            let (status, body) = crate::errors::error_response(
                crate::errors::ErrorCode::ServiceUnavailable,
                Some("Stripe is not configured".to_string()),
                None,
            );
            return json_error(status, body);
        }
    };

    // Look up product to get Stripe price ID
    let product = match state
        .product_repo
        .get_product(&tenant.tenant_id, &req.resource)
        .await
    {
        Ok(p) => p,
        Err(_) => {
            let (status, body) = crate::errors::error_response(
                crate::errors::ErrorCode::ProductNotFound,
                Some(format!("Product not found: {}", req.resource)),
                None,
            );
            return json_error(status, body);
        }
    };

    // Get subscription config and price ID
    let sub_config = match &product.subscription {
        Some(cfg) => cfg,
        None => {
            let (status, body) = crate::errors::error_response(
                crate::errors::ErrorCode::InvalidResource,
                Some("Product does not support subscriptions".to_string()),
                None,
            );
            return json_error(status, body);
        }
    };

    let price_id = match &sub_config.stripe_price_id {
        Some(id) => id.clone(),
        None => {
            let (status, body) = crate::errors::error_response(
                crate::errors::ErrorCode::InvalidResource,
                Some("Product has no Stripe subscription price ID".to_string()),
                None,
            );
            return json_error(status, body);
        }
    };

    // Create checkout request
    let trial_days = req
        .trial_days
        .or(if sub_config.trial_days > 0 {
            Some(sub_config.trial_days)
        } else {
            None
        })
        .map(|d| d as i64);
    let auth = headers
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .unwrap_or_default();
    let user_id = state
        .paywall_service
        .extract_user_id_from_auth_header(auth)
        .await;

    let metadata = build_stripe_subscription_metadata(&tenant.tenant_id, user_id);

    let checkout_req = crate::services::stripe::CreateSubscriptionRequest {
        product_id: req.resource.clone(),
        price_id,
        customer_email: req.customer_email,
        metadata,
        success_url: req.success_url,
        cancel_url: req.cancel_url,
        trial_days,
    };

    // Create session
    match stripe_client
        .create_subscription_checkout(checkout_req)
        .await
    {
        Ok(session) => {
            let resp = StripeSessionResponse {
                session_id: session.session_id,
                url: session.url,
            };
            json_ok(resp)
        }
        Err(e) => {
            let (status, body) =
                crate::errors::error_response(e.code(), Some(e.safe_message()), None);
            json_error(status, body)
        }
    }
}

/// POST /paywall/v1/subscription/quote - Get subscription quote
/// Per spec, returns HTTP 402 with x402 requirement and subscription info
pub async fn quote<S: Store + 'static>(
    State(state): State<Arc<SubscriptionAppState<S>>>,
    tenant: TenantContext,
    Json(req): Json<SubscriptionQuoteRequest>,
) -> impl IntoResponse {
    // Generate quote using paywall service
    let result = state
        .paywall_service
        .generate_quote(&tenant.tenant_id, &req.resource, req.coupon_code.as_deref())
        .await;

    match result {
        Ok(quote) => {
            // Calculate subscription period info
            let interval_secs = match req.interval.to_lowercase().as_str() {
                "daily" | "day" => 86400i64,
                "weekly" | "week" => 604800i64,
                "monthly" | "month" => 2592000i64, // 30 days
                "yearly" | "year" => 31536000i64,  // 365 days
                "custom" => req
                    .interval_days
                    .map(|d| (d as i64) * 86400)
                    .unwrap_or(2592000),
                _ => 2592000i64,
            };

            let now = Utc::now();
            let period_end = now + chrono::Duration::seconds(interval_secs);

            // Build requirement object per spec
            let mut requirement = serde_json::json!({
                "resource": quote.resource_id,
                "expiresAt": quote.expires_at.to_rfc3339()
            });

            if let Some(crypto) = quote.crypto {
                requirement["scheme"] = serde_json::json!(crypto.scheme);
                requirement["network"] = serde_json::json!(crypto.network);
                requirement["maxAmountRequired"] = serde_json::json!(crypto.max_amount_required);
                requirement["payTo"] = serde_json::json!(crypto.pay_to);
                requirement["asset"] = serde_json::json!(crypto.asset);
                if let Some(timeout) = crypto.max_timeout_seconds {
                    requirement["maxTimeoutSeconds"] = serde_json::json!(timeout);
                }
            }

            if let Some(stripe) = quote.stripe {
                requirement["stripe"] = serde_json::json!({
                    "priceId": stripe.price_id,
                    "amountCents": stripe.amount_cents,
                    "currency": stripe.currency,
                    "description": stripe.description
                });
            }

            // Build response per spec with requirement and subscription fields
            let resp = serde_json::json!({
                "requirement": requirement,
                "subscription": {
                    "interval": req.interval,
                    "intervalDays": req.interval_days.unwrap_or(0),
                    "durationSeconds": interval_secs,
                    "periodStart": now.to_rfc3339(),
                    "periodEnd": period_end.to_rfc3339()
                }
            });

            // Return 402 per spec
            (StatusCode::PAYMENT_REQUIRED, Json(resp))
        }
        Err(e) => {
            let (status, body) =
                crate::errors::error_response(e.code(), Some(e.safe_message()), None);
            json_error(status, body)
        }
    }
}

/// POST /paywall/v1/subscription/portal - Get Stripe billing portal URL
pub async fn portal<S: Store + 'static>(
    State(state): State<Arc<SubscriptionAppState<S>>>,
    tenant: TenantContext, // SEC-004: Add tenant context for isolation
    Json(req): Json<PortalRequest>,
) -> impl IntoResponse {
    // SEC-005: Validate return_url to prevent SSRF
    if let Err(e) = crate::errors::validation::validate_redirect_url_with_env(
        &req.return_url,
        &state.paywall_service.config.logging.environment,
    ) {
        let (status, body) = crate::errors::error_response(
            crate::errors::ErrorCode::InvalidField,
            Some(format!("return_url: {}", e.message)),
            None,
        );
        return json_error(status, body);
    }

    // Check if Stripe is configured
    let stripe_client = match &state.stripe_client {
        Some(client) => client,
        None => {
            let (status, body) = crate::errors::error_response(
                crate::errors::ErrorCode::ServiceUnavailable,
                Some("Stripe is not configured".to_string()),
                None,
            );
            return json_error(status, body);
        }
    };

    // SEC-004: Log tenant context for audit trail (customer_id is Stripe-scoped, not tenant-scoped)
    tracing::debug!(
        tenant_id = %tenant.tenant_id,
        customer_id = %req.customer_id,
        "Creating billing portal session"
    );

    // Create billing portal session
    match stripe_client
        .create_billing_portal_session(&req.customer_id, &req.return_url)
        .await
    {
        Ok(url) => {
            let resp = PortalResponse { url };
            json_ok(resp)
        }
        Err(e) => {
            let (status, body) =
                crate::errors::error_response(e.code(), Some(e.safe_message()), None);
            json_error(status, body)
        }
    }
}

/// POST /paywall/v1/subscription/change - Change subscription plan
pub async fn change<S: Store + 'static>(
    State(state): State<Arc<SubscriptionAppState<S>>>,
    tenant: TenantContext,
    Json(req): Json<ChangeRequest>,
) -> impl IntoResponse {
    // Check if Stripe is configured
    let stripe_client = match &state.stripe_client {
        Some(client) => client,
        None => {
            let (status, body) = crate::errors::error_response(
                crate::errors::ErrorCode::ServiceUnavailable,
                Some("Stripe is not configured".to_string()),
                None,
            );
            return json_error(status, body);
        }
    };

    // Look up subscription to get Stripe subscription ID
    let sub = match state
        .subscription_service
        .store()
        .get_subscription(&tenant.tenant_id, &req.subscription_id)
        .await
    {
        Ok(Some(s)) => s,
        Ok(None) => {
            let (status, body) = crate::errors::error_response(
                crate::errors::ErrorCode::SubscriptionNotFound,
                Some("Subscription not found".to_string()),
                None,
            );
            return json_error(status, body);
        }
        Err(e) => {
            // Don't expose database error details - log for debugging
            tracing::error!(error = %e, "Failed to get subscription");
            let (status, body) =
                crate::errors::error_response(crate::errors::ErrorCode::DatabaseError, None, None);
            return json_error(status, body);
        }
    };

    let stripe_sub_id = match &sub.stripe_subscription_id {
        Some(id) => id.clone(),
        None => {
            let (status, body) = crate::errors::error_response(
                crate::errors::ErrorCode::InvalidOperation,
                Some("Subscription is not a Stripe subscription".to_string()),
                None,
            );
            return json_error(status, body);
        }
    };

    // Look up new product to get its Stripe price ID
    let new_product = match state
        .product_repo
        .get_product(&tenant.tenant_id, &req.new_resource)
        .await
    {
        Ok(p) => p,
        Err(_) => {
            let (status, body) = crate::errors::error_response(
                crate::errors::ErrorCode::ProductNotFound,
                Some(format!("Product not found: {}", req.new_resource)),
                None,
            );
            return json_error(status, body);
        }
    };

    let new_price_id = match new_product
        .subscription
        .as_ref()
        .and_then(|s| s.stripe_price_id.as_ref())
    {
        Some(id) => id.clone(),
        None => {
            let (status, body) = crate::errors::error_response(
                crate::errors::ErrorCode::InvalidResource,
                Some("New product has no Stripe subscription price ID".to_string()),
                None,
            );
            return json_error(status, body);
        }
    };

    let proration_behavior = req
        .proration_behavior
        .unwrap_or_else(|| "create_prorations".to_string());

    // Change subscription via Stripe
    match stripe_client
        .change_subscription(&stripe_sub_id, &new_price_id, &proration_behavior)
        .await
    {
        Ok(result) => {
            let resp = ChangeResponse {
                success: true,
                subscription_id: req.subscription_id.clone(),
                previous_resource: sub.product_id.clone(),
                new_resource: req.new_resource.clone(),
                status: result.status,
                current_period_end: result.current_period_end,
                proration_behavior: result.proration_behavior,
            };
            json_ok(resp)
        }
        Err(e) => {
            let (status, body) =
                crate::errors::error_response(e.code(), Some(e.safe_message()), None);
            json_error(status, body)
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/// Parse billing period string, returning error for invalid values per spec (17-validation.md)
fn parse_billing_period(s: &str) -> Result<BillingPeriod, crate::errors::ErrorCode> {
    match s.to_lowercase().as_str() {
        "day" | "daily" => Ok(BillingPeriod::Day),
        "week" | "weekly" => Ok(BillingPeriod::Week),
        "month" | "monthly" => Ok(BillingPeriod::Month),
        "year" | "yearly" | "annual" => Ok(BillingPeriod::Year),
        _ => Err(crate::errors::ErrorCode::InvalidField),
    }
}

fn build_stripe_subscription_metadata(
    tenant_id: &str,
    user_id: Option<String>,
) -> std::collections::HashMap<String, String> {
    let mut metadata = std::collections::HashMap::new();
    metadata.insert("tenant_id".to_string(), tenant_id.to_string());
    if let Some(uid) = user_id {
        metadata.insert("user_id".to_string(), uid);
    }
    metadata
}

#[cfg(test)]
mod tests {
    use super::*;

    use axum::response::IntoResponse;
    use chrono::Utc;

    use crate::models::{get_asset, Money, Product};
    use crate::repositories::{InMemoryCouponRepository, InMemoryProductRepository};
    use crate::storage::memory::InMemoryStore;
    use crate::webhooks::NoopNotifier;
    use crate::Config;
    use crate::{NoopVerifier, PaywallService};

    fn build_state() -> Arc<SubscriptionAppState<InMemoryStore>> {
        let cfg = Config::default();
        let store = Arc::new(InMemoryStore::new());

        let asset = get_asset("USDC").expect("asset");
        let product = Product {
            id: "prod-1".to_string(),
            tenant_id: "default".to_string(),
            crypto_price: Some(Money::new(asset, 100)),
            active: true,
            created_at: Some(Utc::now()),
            ..Product::default()
        };
        let product_repo = Arc::new(InMemoryProductRepository::new(vec![product]));
        let coupon_repo = Arc::new(InMemoryCouponRepository::new(Vec::new()));
        let notifier = Arc::new(NoopNotifier);

        let paywall_service = Arc::new(PaywallService::new(
            cfg.clone(),
            store.clone(),
            Arc::new(NoopVerifier),
            notifier.clone(),
            product_repo,
            coupon_repo,
        ));

        let subscription_service = Arc::new(SubscriptionService::new(
            Arc::new(cfg),
            store.clone(),
            notifier.clone() as Arc<dyn crate::webhooks::Notifier>,
        ));

        Arc::new(SubscriptionAppState {
            subscription_service,
            stripe_client: None,
            paywall_service,
            product_repo: Arc::new(InMemoryProductRepository::new(Vec::new())),
        })
    }

    #[tokio::test]
    async fn test_create_credits_requires_verified_payment() {
        let state = build_state();

        let response = create_credits(
            State(state.clone()),
            TenantContext::default(),
            Json(CreateCreditsSubscriptionRequest {
                wallet: "wallet-1".to_string(),
                product_id: "prod-1".to_string(),
                hold_id: None,
                metadata: None,
                billing_period: None,
                billing_interval: None,
            }),
        )
        .await
        .into_response();

        assert_eq!(response.status(), StatusCode::PAYMENT_REQUIRED);

        let subs = state
            .subscription_service
            .store()
            .get_subscriptions_by_wallet("default", "wallet-1")
            .await
            .unwrap();
        assert!(subs.is_empty());
    }

    #[test]
    fn test_build_stripe_subscription_metadata_includes_user_id() {
        let m = build_stripe_subscription_metadata("tenant-1", Some("user-1".to_string()));
        assert_eq!(m.get("tenant_id").map(String::as_str), Some("tenant-1"));
        assert_eq!(m.get("user_id").map(String::as_str), Some("user-1"));
    }
}
