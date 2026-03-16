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
use crate::models::{BillingPeriod, PaymentMethod, Product, Subscription};
use crate::repositories::ProductRepository;
use crate::services::subscriptions::CreateX402SubscriptionParams;
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
pub struct SubscriptionDetailsQuery {
    pub user_id: String,
    pub resource: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SubscriptionDetailsResponse {
    pub id: String,
    pub resource: String,
    pub status: String,
    pub interval: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub interval_days: Option<i32>,
    pub price_per_period: i64,
    pub currency: String,
    pub cancel_at_period_end: bool,
    pub current_period_start: DateTime<Utc>,
    pub current_period_end: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub payment_method: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub trial_end: Option<DateTime<Utc>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub customer_id: Option<String>,
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
    /// Optional plan ID - links subscription to a specific plan
    pub plan_id: Option<String>,
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
    /// Optional plan ID - links subscription to a specific plan
    pub plan_id: Option<String>,
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
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct StripeSessionRequest {
    pub resource: String,
    pub interval: String,
    pub interval_days: Option<i32>,
    pub trial_days: Option<i32>,
    pub customer_email: Option<String>,
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
pub struct ChangePreviewRequest {
    pub current_resource: String,
    pub new_resource: String,
    pub user_id: String,
    pub new_interval: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChangePreviewResponse {
    pub success: bool,
    pub immediate_amount: i64,
    pub currency: String,
    pub current_plan_price: i64,
    pub new_plan_price: i64,
    pub days_remaining: i64,
    pub effective_date: DateTime<Utc>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub proration_details: Option<ChangePreviewBreakdown>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChangePreviewBreakdown {
    pub unused_credit: i64,
    pub new_plan_cost: i64,
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
    let result = lookup_subscription_for_subject(
        &state.subscription_service,
        &tenant.tenant_id,
        &query.user_id,
        &query.resource,
    )
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

/// GET /paywall/v1/subscription/details - Get full subscription details for management UI
pub async fn details<S: Store + 'static>(
    State(state): State<Arc<SubscriptionAppState<S>>>,
    tenant: TenantContext,
    Query(query): Query<SubscriptionDetailsQuery>,
) -> impl IntoResponse {
    let (_, subscription) = match lookup_subscription_for_subject(
        &state.subscription_service,
        &tenant.tenant_id,
        &query.user_id,
        &query.resource,
    )
    .await
    {
        Ok(result) => result,
        Err(e) => {
            let (status, body) =
                crate::errors::error_response(e.code(), Some(e.safe_message()), None);
            return json_error(status, body);
        }
    };

    let subscription = match subscription {
        Some(subscription) => subscription,
        None => {
            let (status, body) = crate::errors::error_response(
                crate::errors::ErrorCode::SubscriptionNotFound,
                Some("Subscription not found".to_string()),
                None,
            );
            return json_error(status, body);
        }
    };

    let product = match state
        .product_repo
        .get_product(&tenant.tenant_id, &subscription.product_id)
        .await
    {
        Ok(product) => product,
        Err(_) => {
            let (status, body) = crate::errors::error_response(
                crate::errors::ErrorCode::ProductNotFound,
                Some(format!("Product not found: {}", subscription.product_id)),
                None,
            );
            return json_error(status, body);
        }
    };

    let (price_per_period, currency) =
        subscription_price_and_currency(&product, &subscription.payment_method);

    let resp = SubscriptionDetailsResponse {
        id: subscription.id.clone(),
        resource: subscription.product_id.clone(),
        status: subscription.status.to_string(),
        interval: billing_period_to_interval(&subscription.billing_period).to_string(),
        interval_days: (subscription.billing_period == BillingPeriod::Day)
            .then_some(subscription.billing_interval),
        price_per_period,
        currency,
        cancel_at_period_end: subscription.cancel_at_period_end,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        created_at: subscription
            .created_at
            .unwrap_or(subscription.current_period_start),
        payment_method: subscription.payment_method.to_string(),
        trial_end: subscription.trial_end,
        customer_id: subscription.stripe_customer_id.clone(),
    };
    json_ok(resp)
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
        match state
            .paywall_service
            .has_payment_been_processed(&tenant.tenant_id, sig)
            .await
        {
            Ok(v) => v,
            Err(e) => {
                let (status, body) =
                    crate::errors::error_response(e.code(), Some(e.safe_message()), None);
                return json_error(status, body);
            }
        }
    } else {
        false
    };

    if payment_verified {
        if let Some(sig) = req.payment_signature.as_deref() {
            let payment = match state
                .paywall_service
                .get_payment(&tenant.tenant_id, sig)
                .await
            {
                Ok(p) => p,
                Err(e) => {
                    let (status, body) =
                        crate::errors::error_response(e.code(), Some(e.safe_message()), None);
                    return json_error(status, body);
                }
            };
            if payment.resource_id != req.product_id || payment.wallet != req.wallet {
                let (status, body) = crate::errors::error_response(
                    crate::errors::ErrorCode::InvalidPaymentProof,
                    Some("payment signature does not match wallet/resource".to_string()),
                    None,
                );
                return json_error(status, body);
            }
        }
    }

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

    // SECURITY (H-004): Pass payment signature to subscription creation for idempotency.
    // The subscription service will use atomic UPSERT to prevent duplicates.
    let result = state
        .subscription_service
        .create_x402_subscription(CreateX402SubscriptionParams {
            tenant_id: tenant.tenant_id.clone(),
            wallet: req.wallet.clone(),
            product_id: req.product_id.clone(),
            billing_period,
            billing_interval,
            payment_signature: req.payment_signature.clone(),
            metadata: req.metadata.clone(),
            plan_id: req.plan_id.clone(),
        })
        .await;

    match result {
        Ok(sub) => {
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

    let (hold_id, processed_payment) = match req.hold_id.as_deref() {
        Some(hold_id) => {
            let signature = credits_hold_payment_signature(hold_id);
            let payment = match state
                .paywall_service
                .get_payment(&tenant.tenant_id, &signature)
                .await
            {
                Ok(payment) => payment,
                Err(crate::services::ServiceError::Coded {
                    code: crate::errors::ErrorCode::TransactionNotFound,
                    ..
                }) => {
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
                Err(e) => {
                    let (status, body) =
                        crate::errors::error_response(e.code(), Some(e.safe_message()), None);
                    return json_error(status, body);
                }
            };

            if payment.resource_id != req.product_id || payment.wallet != req.wallet {
                let (status, body) = crate::errors::error_response(
                    crate::errors::ErrorCode::InvalidPaymentProof,
                    Some("credits hold does not match wallet/resource".to_string()),
                    None,
                );
                return json_error(status, body);
            }

            (hold_id.to_string(), payment)
        }
        None => {
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
    };

    let activation_signature = credits_subscription_activation_signature(&hold_id);
    let activation_marker = crate::models::PaymentTransaction {
        signature: activation_signature.clone(),
        tenant_id: tenant.tenant_id.clone(),
        resource_id: req.product_id.clone(),
        wallet: req.wallet.clone(),
        user_id: processed_payment.user_id.clone(),
        amount: processed_payment.amount.clone(),
        created_at: Utc::now(),
        metadata: std::collections::HashMap::from([
            (
                "credits_hold_signature".to_string(),
                credits_hold_payment_signature(&hold_id),
            ),
            ("subscription_activation".to_string(), "true".to_string()),
        ]),
    };

    let activation_claimed = match state
        .subscription_service
        .store()
        .try_record_payment(activation_marker)
        .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!(error = %e, "Failed to persist credits subscription activation marker");
            let (status, body) =
                crate::errors::error_response(crate::errors::ErrorCode::DatabaseError, None, None);
            return json_error(status, body);
        }
    };

    if !activation_claimed {
        let (status, body) = crate::errors::error_response(
            crate::errors::ErrorCode::PaymentAlreadyUsed,
            Some("credits hold already used for subscription activation".to_string()),
            None,
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
            req.metadata.clone(),
            req.plan_id.clone(),
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
            if let Err(delete_err) = state
                .subscription_service
                .store()
                .delete_payment(&tenant.tenant_id, &activation_signature)
                .await
            {
                tracing::error!(
                    error = %delete_err,
                    activation_signature = %activation_signature,
                    "Failed to roll back credits subscription activation marker after error"
                );
            }
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

    let existing = match state
        .subscription_service
        .store()
        .get_subscription(&tenant.tenant_id, &req.subscription_id)
        .await
    {
        Ok(Some(subscription)) => subscription,
        Ok(None) => {
            let (status, body) = crate::errors::error_response(
                crate::errors::ErrorCode::SubscriptionNotFound,
                Some("Subscription not found".to_string()),
                None,
            );
            return json_error(status, body);
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to load subscription before cancellation");
            let (status, body) =
                crate::errors::error_response(crate::errors::ErrorCode::DatabaseError, None, None);
            return json_error(status, body);
        }
    };

    if existing.payment_method == PaymentMethod::Stripe {
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

        let stripe_sub_id = match existing.stripe_subscription_id.as_ref() {
            Some(id) => id,
            None => {
                let (status, body) = crate::errors::error_response(
                    crate::errors::ErrorCode::InvalidOperation,
                    Some("Subscription is missing a Stripe subscription ID".to_string()),
                    None,
                );
                return json_error(status, body);
            }
        };

        if let Err(e) = stripe_client
            .cancel_subscription(stripe_sub_id, at_period_end)
            .await
        {
            let (status, body) =
                crate::errors::error_response(e.code(), Some(e.safe_message()), None);
            return json_error(status, body);
        }
    }

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
            if existing.payment_method == PaymentMethod::Stripe {
                tracing::error!(
                    subscription_id = %req.subscription_id,
                    at_period_end,
                    error = %e,
                    "Stripe cancellation succeeded but local subscription update failed"
                );
            }
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
    let existing = match state
        .subscription_service
        .store()
        .get_subscription(&tenant.tenant_id, &req.subscription_id)
        .await
    {
        Ok(Some(subscription)) => subscription,
        Ok(None) => {
            let (status, body) = crate::errors::error_response(
                crate::errors::ErrorCode::SubscriptionNotFound,
                Some("Subscription not found".to_string()),
                None,
            );
            return json_error(status, body);
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to load subscription before reactivation");
            let (status, body) =
                crate::errors::error_response(crate::errors::ErrorCode::DatabaseError, None, None);
            return json_error(status, body);
        }
    };

    if existing.payment_method == PaymentMethod::Stripe {
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

        let stripe_sub_id = match existing.stripe_subscription_id.as_ref() {
            Some(id) => id,
            None => {
                let (status, body) = crate::errors::error_response(
                    crate::errors::ErrorCode::InvalidOperation,
                    Some("Subscription is missing a Stripe subscription ID".to_string()),
                    None,
                );
                return json_error(status, body);
            }
        };

        if let Err(e) = stripe_client.reactivate_subscription(stripe_sub_id).await {
            let (status, body) =
                crate::errors::error_response(e.code(), Some(e.safe_message()), None);
            return json_error(status, body);
        }
    }

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
            if existing.payment_method == PaymentMethod::Stripe {
                tracing::error!(
                    subscription_id = %req.subscription_id,
                    error = %e,
                    "Stripe reactivation succeeded but local subscription update failed"
                );
            }
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
    if let Some(ref email) = req.customer_email {
        if let Err(e) = crate::errors::validation::validate_email(email) {
            let (status, body) = crate::errors::error_response(
                crate::errors::ErrorCode::InvalidField,
                Some(e.message),
                None,
            );
            return json_error(status, body);
        }
    }

    if let Some(days) = req.trial_days {
        if days < 0 {
            let (status, body) = crate::errors::error_response(
                crate::errors::ErrorCode::InvalidField,
                Some("trialDays must be >= 0".to_string()),
                None,
            );
            return json_error(status, body);
        }
    }

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

    if let Err(msg) = validate_stripe_checkout_interval(&req, sub_config) {
        let (status, body) =
            crate::errors::error_response(crate::errors::ErrorCode::InvalidField, Some(msg), None);
        return json_error(status, body);
    }

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
    let idempotency_key = headers
        .get(crate::constants::HEADER_IDEMPOTENCY_KEY)
        .and_then(|v| v.to_str().ok())
        .filter(|v| !v.is_empty())
        .map(str::to_string);

    let metadata = build_stripe_subscription_metadata(&tenant.tenant_id, user_id);

    let checkout_req = crate::services::stripe::CreateSubscriptionRequest {
        product_id: req.resource.clone(),
        price_id,
        customer_email: req.customer_email,
        metadata,
        success_url: req.success_url,
        cancel_url: req.cancel_url,
        trial_days,
        idempotency_key,
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

/// POST /paywall/v1/subscription/change/preview - Preview proration for a Stripe plan change
pub async fn preview_change<S: Store + 'static>(
    State(state): State<Arc<SubscriptionAppState<S>>>,
    tenant: TenantContext,
    Json(req): Json<ChangePreviewRequest>,
) -> impl IntoResponse {
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

    let (_, subscription) = match lookup_subscription_for_subject(
        &state.subscription_service,
        &tenant.tenant_id,
        &req.user_id,
        &req.current_resource,
    )
    .await
    {
        Ok(result) => result,
        Err(e) => {
            let (status, body) =
                crate::errors::error_response(e.code(), Some(e.safe_message()), None);
            return json_error(status, body);
        }
    };

    let subscription = match subscription {
        Some(subscription) => subscription,
        None => {
            let (status, body) = crate::errors::error_response(
                crate::errors::ErrorCode::SubscriptionNotFound,
                Some("Subscription not found".to_string()),
                None,
            );
            return json_error(status, body);
        }
    };

    if subscription.product_id != req.current_resource {
        let (status, body) = crate::errors::error_response(
            crate::errors::ErrorCode::InvalidField,
            Some("currentResource does not match the subscription".to_string()),
            None,
        );
        return json_error(status, body);
    }

    let stripe_sub_id = match &subscription.stripe_subscription_id {
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

    let current_product = match state
        .product_repo
        .get_product(&tenant.tenant_id, &subscription.product_id)
        .await
    {
        Ok(product) => product,
        Err(_) => {
            let (status, body) = crate::errors::error_response(
                crate::errors::ErrorCode::ProductNotFound,
                Some(format!("Product not found: {}", subscription.product_id)),
                None,
            );
            return json_error(status, body);
        }
    };

    let new_product = match state
        .product_repo
        .get_product(&tenant.tenant_id, &req.new_resource)
        .await
    {
        Ok(product) => product,
        Err(_) => {
            let (status, body) = crate::errors::error_response(
                crate::errors::ErrorCode::ProductNotFound,
                Some(format!("Product not found: {}", req.new_resource)),
                None,
            );
            return json_error(status, body);
        }
    };

    if let Some(ref interval) = req.new_interval {
        let requested_period = match parse_billing_period(interval) {
            Ok(period) => period,
            Err(code) => {
                let (status, body) = crate::errors::error_response(
                    code,
                    Some(format!("invalid newInterval: {}", interval)),
                    None,
                );
                return json_error(status, body);
            }
        };

        let configured_period = new_product
            .subscription
            .as_ref()
            .and_then(|config| parse_billing_period(&config.billing_period).ok());
        if configured_period != Some(requested_period) {
            let (status, body) = crate::errors::error_response(
                crate::errors::ErrorCode::InvalidField,
                Some("newInterval does not match the target product".to_string()),
                None,
            );
            return json_error(status, body);
        }
    }

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

    match stripe_client
        .preview_proration(&stripe_sub_id, &new_price_id)
        .await
    {
        Ok(preview) => {
            let (current_plan_price, _) =
                subscription_price_and_currency(&current_product, &PaymentMethod::Stripe);
            let (new_plan_price, _) =
                subscription_price_and_currency(&new_product, &PaymentMethod::Stripe);
            let (unused_credit, new_plan_cost) =
                preview
                    .lines
                    .iter()
                    .fold((0i64, 0i64), |(credit, cost), line| {
                        if line.amount < 0 {
                            (credit + line.amount.abs(), cost)
                        } else {
                            (credit, cost + line.amount)
                        }
                    });

            let resp = ChangePreviewResponse {
                success: true,
                immediate_amount: preview.proration_amount,
                currency: preview.currency.to_uppercase(),
                current_plan_price,
                new_plan_price,
                days_remaining: (subscription.current_period_end - Utc::now())
                    .num_days()
                    .max(0),
                effective_date: Utc::now(),
                proration_details: (!preview.lines.is_empty()).then_some(ChangePreviewBreakdown {
                    unused_credit,
                    new_plan_cost,
                }),
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

/// POST /paywall/v1/subscription/change - Change subscription plan
pub async fn change<S: Store + 'static>(
    State(state): State<Arc<SubscriptionAppState<S>>>,
    tenant: TenantContext,
    headers: axum::http::HeaderMap,
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
    let idempotency_key = headers
        .get(crate::constants::HEADER_IDEMPOTENCY_KEY)
        .and_then(|v| v.to_str().ok())
        .filter(|v| !v.is_empty())
        .map(str::to_string);

    let stripe_result = match stripe_client
        .change_subscription(
            &stripe_sub_id,
            &new_price_id,
            &proration_behavior,
            idempotency_key.as_deref(),
        )
        .await
    {
        Ok(result) => result,
        Err(e) => {
            let (status, body) =
                crate::errors::error_response(e.code(), Some(e.safe_message()), None);
            return json_error(status, body);
        }
    };

    let local_change = state
        .subscription_service
        .change_subscription(
            &tenant.tenant_id,
            &req.subscription_id,
            &req.new_resource,
            None,
            None,
        )
        .await;

    match local_change {
        Ok(local_result) => {
            let resp = ChangeResponse {
                success: true,
                subscription_id: req.subscription_id.clone(),
                previous_resource: local_result.previous_product,
                new_resource: req.new_resource.clone(),
                status: stripe_result.status,
                current_period_end: stripe_result.current_period_end,
                proration_behavior: stripe_result.proration_behavior,
            };
            json_ok(resp)
        }
        Err(e) => {
            tracing::error!(
                subscription_id = %req.subscription_id,
                new_resource = %req.new_resource,
                error = %e,
                "Stripe subscription change succeeded but local subscription update failed"
            );
            let (status, body) =
                crate::errors::error_response(e.code(), Some(e.safe_message()), None);
            json_error(status, body)
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async fn lookup_subscription_for_subject<S: Store + 'static>(
    subscription_service: &Arc<SubscriptionService<S>>,
    tenant_id: &str,
    user_id: &str,
    resource: &str,
) -> Result<(bool, Option<Subscription>), crate::services::ServiceError> {
    if user_id.starts_with("cus_") {
        subscription_service
            .has_access_by_stripe_customer_id(tenant_id, user_id, resource)
            .await
    } else {
        subscription_service
            .has_access(tenant_id, user_id, resource)
            .await
    }
}

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

fn billing_period_to_interval(period: &BillingPeriod) -> &'static str {
    match period {
        BillingPeriod::Day => "custom",
        BillingPeriod::Week => "weekly",
        BillingPeriod::Month => "monthly",
        BillingPeriod::Year => "yearly",
    }
}

fn subscription_price_and_currency(
    product: &Product,
    payment_method: &PaymentMethod,
) -> (i64, String) {
    let preferred = match payment_method {
        PaymentMethod::Stripe => product
            .fiat_price
            .as_ref()
            .or(product.crypto_price.as_ref()),
        PaymentMethod::X402 | PaymentMethod::Credits => product
            .crypto_price
            .as_ref()
            .or(product.fiat_price.as_ref()),
    };

    preferred
        .map(|price| (price.atomic, price.asset.code.clone()))
        .unwrap_or_else(|| (0, "USD".to_string()))
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

fn credits_hold_payment_signature(hold_id: &str) -> String {
    format!("credits:{hold_id}")
}

fn credits_subscription_activation_signature(hold_id: &str) -> String {
    format!("subscription:credits:{hold_id}")
}

fn validate_stripe_checkout_interval(
    req: &StripeSessionRequest,
    sub_config: &crate::models::SubscriptionConfig,
) -> Result<(), String> {
    let configured_period = parse_billing_period(&sub_config.billing_period)
        .map_err(|_| "product has invalid subscription billing period".to_string())?;
    let configured_interval = billing_period_to_interval(&configured_period);

    if req.interval.to_lowercase() != configured_interval {
        return Err(format!(
            "interval must match the product subscription interval: {}",
            configured_interval
        ));
    }

    match configured_period {
        BillingPeriod::Day => {
            if req.interval_days != Some(sub_config.billing_interval) {
                return Err(format!(
                    "intervalDays must match the product subscription interval: {}",
                    sub_config.billing_interval
                ));
            }
        }
        _ if req.interval_days.is_some() => {
            return Err(
                "intervalDays is only supported for custom day-based subscriptions".to_string(),
            )
        }
        _ => {}
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    use axum::response::IntoResponse;
    use chrono::Utc;
    use http_body_util::BodyExt;

    use crate::models::{
        get_asset, BillingPeriod, Money, PaymentMethod, PaymentTransaction, Product, Subscription,
        SubscriptionConfig, SubscriptionStatus,
    };
    use crate::repositories::{InMemoryCouponRepository, InMemoryProductRepository};
    use crate::storage::memory::InMemoryStore;
    use crate::webhooks::NoopNotifier;
    use crate::Config;
    use crate::{NoopVerifier, PaywallService, StripeClient};

    fn build_state() -> Arc<SubscriptionAppState<InMemoryStore>> {
        let cfg = Config::default();
        let store = Arc::new(InMemoryStore::new());

        let asset = get_asset("USDC").expect("asset");
        let product_repo = Arc::new(InMemoryProductRepository::new(vec![Product {
            id: "prod-1".to_string(),
            tenant_id: "default".to_string(),
            fiat_price: Some(Money::new(asset.clone(), 2500)),
            crypto_price: Some(Money::new(asset, 100)),
            subscription: Some(SubscriptionConfig {
                billing_period: "monthly".to_string(),
                billing_interval: 1,
                trial_days: 0,
                stripe_price_id: Some("price_prod_1".to_string()),
                allow_x402: true,
                grace_period_hours: 0,
            }),
            active: true,
            created_at: Some(Utc::now()),
            ..Product::default()
        }]));
        let coupon_repo = Arc::new(InMemoryCouponRepository::new(Vec::new()));
        let notifier = Arc::new(NoopNotifier);

        let paywall_service = Arc::new(PaywallService::new(
            cfg.clone(),
            store.clone(),
            Arc::new(NoopVerifier),
            notifier.clone(),
            product_repo.clone(),
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
            product_repo,
        })
    }

    fn build_state_with_stripe() -> Arc<SubscriptionAppState<InMemoryStore>> {
        let state = build_state();
        let stripe_client = Arc::new(
            StripeClient::new(
                Config::default(),
                state.subscription_service.store(),
                Arc::new(NoopNotifier),
            )
            .expect("stripe client"),
        );

        Arc::new(SubscriptionAppState {
            subscription_service: state.subscription_service.clone(),
            stripe_client: Some(stripe_client),
            paywall_service: state.paywall_service.clone(),
            product_repo: state.product_repo.clone(),
        })
    }

    async fn seed_payment(
        state: &Arc<SubscriptionAppState<InMemoryStore>>,
        signature: &str,
        wallet: &str,
        resource_id: &str,
    ) {
        let asset = get_asset("USDC").expect("asset");
        let tx = PaymentTransaction {
            signature: signature.to_string(),
            tenant_id: "default".to_string(),
            resource_id: resource_id.to_string(),
            wallet: wallet.to_string(),
            user_id: None,
            amount: Money::new(asset, 100),
            created_at: Utc::now(),
            metadata: std::collections::HashMap::new(),
        };
        state
            .subscription_service
            .store()
            .record_payment(tx)
            .await
            .expect("seed payment");
    }

    #[tokio::test]
    async fn test_create_x402_requires_verified_payment() {
        let state = build_state();

        let response = create_x402(
            State(state.clone()),
            TenantContext::default(),
            Json(CreateX402SubscriptionRequest {
                wallet: "wallet-1".to_string(),
                product_id: "prod-1".to_string(),
                payment_signature: None,
                metadata: None,
                billing_period: None,
                billing_interval: None,
                plan_id: None,
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
                plan_id: None,
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

    #[tokio::test]
    async fn test_create_credits_rejects_hold_wallet_mismatch() {
        let state = build_state();
        seed_payment(&state, "credits:hold-wallet-mismatch", "wallet-a", "prod-1").await;

        let response = create_credits(
            State(state.clone()),
            TenantContext::default(),
            Json(CreateCreditsSubscriptionRequest {
                wallet: "wallet-b".to_string(),
                product_id: "prod-1".to_string(),
                hold_id: Some("hold-wallet-mismatch".to_string()),
                metadata: None,
                billing_period: None,
                billing_interval: None,
                plan_id: None,
            }),
        )
        .await
        .into_response();

        assert_eq!(response.status(), StatusCode::PAYMENT_REQUIRED);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(json["error"]["code"], "invalid_payment_proof");
    }

    #[tokio::test]
    async fn test_create_credits_rejects_hold_resource_mismatch() {
        let state = build_state();
        seed_payment(
            &state,
            "credits:hold-resource-mismatch",
            "wallet-1",
            "prod-other",
        )
        .await;

        let response = create_credits(
            State(state.clone()),
            TenantContext::default(),
            Json(CreateCreditsSubscriptionRequest {
                wallet: "wallet-1".to_string(),
                product_id: "prod-1".to_string(),
                hold_id: Some("hold-resource-mismatch".to_string()),
                metadata: None,
                billing_period: None,
                billing_interval: None,
                plan_id: None,
            }),
        )
        .await
        .into_response();

        assert_eq!(response.status(), StatusCode::PAYMENT_REQUIRED);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(json["error"]["code"], "invalid_payment_proof");
    }

    #[tokio::test]
    async fn test_create_credits_rejects_replayed_hold_id() {
        let state = build_state();
        seed_payment(&state, "credits:hold-replay", "wallet-1", "prod-1").await;

        let first = create_credits(
            State(state.clone()),
            TenantContext::default(),
            Json(CreateCreditsSubscriptionRequest {
                wallet: "wallet-1".to_string(),
                product_id: "prod-1".to_string(),
                hold_id: Some("hold-replay".to_string()),
                metadata: None,
                billing_period: None,
                billing_interval: None,
                plan_id: None,
            }),
        )
        .await
        .into_response();
        assert_eq!(first.status(), StatusCode::OK);

        let second = create_credits(
            State(state),
            TenantContext::default(),
            Json(CreateCreditsSubscriptionRequest {
                wallet: "wallet-1".to_string(),
                product_id: "prod-1".to_string(),
                hold_id: Some("hold-replay".to_string()),
                metadata: None,
                billing_period: None,
                billing_interval: None,
                plan_id: None,
            }),
        )
        .await
        .into_response();

        assert_eq!(second.status(), StatusCode::PAYMENT_REQUIRED);
        let body = second.into_body().collect().await.unwrap().to_bytes();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(json["error"]["code"], "payment_already_used");
    }

    #[tokio::test]
    async fn test_create_x402_rejects_signature_wallet_mismatch() {
        let state = build_state();
        seed_payment(&state, "sig-wallet-mismatch", "wallet-a", "prod-1").await;

        let response = create_x402(
            State(state.clone()),
            TenantContext::default(),
            Json(CreateX402SubscriptionRequest {
                wallet: "wallet-b".to_string(),
                product_id: "prod-1".to_string(),
                payment_signature: Some("sig-wallet-mismatch".to_string()),
                metadata: None,
                billing_period: None,
                billing_interval: None,
                plan_id: None,
            }),
        )
        .await
        .into_response();

        assert_eq!(response.status(), StatusCode::PAYMENT_REQUIRED);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(json["error"]["code"], "invalid_payment_proof");

        let subs = state
            .subscription_service
            .store()
            .get_subscriptions_by_wallet("default", "wallet-b")
            .await
            .unwrap();
        assert!(subs.is_empty());
    }

    #[tokio::test]
    async fn test_create_x402_rejects_signature_resource_mismatch() {
        let state = build_state();
        seed_payment(&state, "sig-resource-mismatch", "wallet-1", "prod-other").await;

        let response = create_x402(
            State(state.clone()),
            TenantContext::default(),
            Json(CreateX402SubscriptionRequest {
                wallet: "wallet-1".to_string(),
                product_id: "prod-1".to_string(),
                payment_signature: Some("sig-resource-mismatch".to_string()),
                metadata: None,
                billing_period: None,
                billing_interval: None,
                plan_id: None,
            }),
        )
        .await
        .into_response();

        assert_eq!(response.status(), StatusCode::PAYMENT_REQUIRED);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(json["error"]["code"], "invalid_payment_proof");

        let subs = state
            .subscription_service
            .store()
            .get_subscriptions_by_wallet("default", "wallet-1")
            .await
            .unwrap();
        assert!(subs.is_empty());
    }

    #[tokio::test]
    async fn test_status_supports_stripe_customer_id() {
        let state = build_state();
        let now = Utc::now();
        state
            .subscription_service
            .store()
            .save_subscription(Subscription {
                id: "sub-cus-1".to_string(),
                tenant_id: "default".to_string(),
                wallet: None,
                user_id: None,
                product_id: "prod-1".to_string(),
                plan_id: None,
                payment_method: PaymentMethod::Stripe,
                stripe_subscription_id: Some("sub_stripe_1".to_string()),
                stripe_customer_id: Some("cus_123".to_string()),
                status: SubscriptionStatus::Active,
                billing_period: BillingPeriod::Month,
                billing_interval: 1,
                current_period_start: now,
                current_period_end: now + chrono::Duration::days(30),
                trial_end: None,
                cancel_at_period_end: false,
                cancelled_at: None,
                payment_signature: None,
                created_at: Some(now),
                updated_at: Some(now),
                metadata: std::collections::HashMap::new(),
            })
            .await
            .expect("seed subscription");

        let response = status(
            State(state),
            TenantContext::default(),
            Query(SubscriptionStatusQuery {
                user_id: "cus_123".to_string(),
                resource: "prod-1".to_string(),
            }),
        )
        .await
        .into_response();

        assert_eq!(response.status(), StatusCode::OK);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(json["active"], true);
        assert_eq!(json["status"], "active");
    }

    #[tokio::test]
    async fn test_details_returns_subscription_management_payload() {
        let state = build_state();
        let now = Utc::now();
        state
            .subscription_service
            .store()
            .save_subscription(Subscription {
                id: "sub-details-1".to_string(),
                tenant_id: "default".to_string(),
                wallet: Some("wallet-1".to_string()),
                user_id: None,
                product_id: "prod-1".to_string(),
                plan_id: None,
                payment_method: PaymentMethod::Stripe,
                stripe_subscription_id: Some("sub_stripe_1".to_string()),
                stripe_customer_id: Some("cus_123".to_string()),
                status: SubscriptionStatus::Active,
                billing_period: BillingPeriod::Month,
                billing_interval: 1,
                current_period_start: now,
                current_period_end: now + chrono::Duration::days(30),
                trial_end: None,
                cancel_at_period_end: false,
                cancelled_at: None,
                payment_signature: None,
                created_at: Some(now),
                updated_at: Some(now),
                metadata: std::collections::HashMap::new(),
            })
            .await
            .expect("seed subscription");

        let response = details(
            State(state),
            TenantContext::default(),
            Query(SubscriptionDetailsQuery {
                user_id: "cus_123".to_string(),
                resource: "prod-1".to_string(),
            }),
        )
        .await
        .into_response();

        assert_eq!(response.status(), StatusCode::OK);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(json["id"], "sub-details-1");
        assert_eq!(json["resource"], "prod-1");
        assert_eq!(json["interval"], "monthly");
        assert_eq!(json["pricePerPeriod"], 2500);
        assert_eq!(json["currency"], "USDC");
        assert_eq!(json["customerId"], "cus_123");
    }

    #[tokio::test]
    async fn test_preview_change_returns_service_unavailable_without_stripe() {
        let state = build_state();
        let now = Utc::now();
        state
            .subscription_service
            .store()
            .save_subscription(Subscription {
                id: "sub-preview-1".to_string(),
                tenant_id: "default".to_string(),
                wallet: Some("wallet-1".to_string()),
                user_id: None,
                product_id: "prod-1".to_string(),
                plan_id: None,
                payment_method: PaymentMethod::Stripe,
                stripe_subscription_id: Some("sub_stripe_1".to_string()),
                stripe_customer_id: Some("cus_123".to_string()),
                status: SubscriptionStatus::Active,
                billing_period: BillingPeriod::Month,
                billing_interval: 1,
                current_period_start: now,
                current_period_end: now + chrono::Duration::days(30),
                trial_end: None,
                cancel_at_period_end: false,
                cancelled_at: None,
                payment_signature: None,
                created_at: Some(now),
                updated_at: Some(now),
                metadata: std::collections::HashMap::new(),
            })
            .await
            .expect("seed subscription");

        let response = preview_change(
            State(state),
            TenantContext::default(),
            Json(ChangePreviewRequest {
                current_resource: "prod-1".to_string(),
                new_resource: "prod-1".to_string(),
                user_id: "cus_123".to_string(),
                new_interval: Some("monthly".to_string()),
            }),
        )
        .await
        .into_response();

        assert_eq!(response.status(), StatusCode::SERVICE_UNAVAILABLE);
    }

    #[tokio::test]
    async fn test_cancel_stripe_subscription_requires_stripe_client() {
        let state = build_state();
        let now = Utc::now();
        state
            .subscription_service
            .store()
            .save_subscription(Subscription {
                id: "sub-cancel-1".to_string(),
                tenant_id: "default".to_string(),
                wallet: Some("wallet-1".to_string()),
                user_id: None,
                product_id: "prod-1".to_string(),
                plan_id: None,
                payment_method: PaymentMethod::Stripe,
                stripe_subscription_id: Some("sub_stripe_1".to_string()),
                stripe_customer_id: Some("cus_123".to_string()),
                status: SubscriptionStatus::Active,
                billing_period: BillingPeriod::Month,
                billing_interval: 1,
                current_period_start: now,
                current_period_end: now + chrono::Duration::days(30),
                trial_end: None,
                cancel_at_period_end: false,
                cancelled_at: None,
                payment_signature: None,
                created_at: Some(now),
                updated_at: Some(now),
                metadata: std::collections::HashMap::new(),
            })
            .await
            .expect("seed subscription");

        let response = cancel(
            State(state),
            TenantContext::default(),
            Json(CancelRequest {
                subscription_id: "sub-cancel-1".to_string(),
                at_period_end: Some(true),
            }),
        )
        .await
        .into_response();

        assert_eq!(response.status(), StatusCode::SERVICE_UNAVAILABLE);
    }

    #[tokio::test]
    async fn test_reactivate_stripe_subscription_requires_stripe_client() {
        let state = build_state();
        let now = Utc::now();
        state
            .subscription_service
            .store()
            .save_subscription(Subscription {
                id: "sub-reactivate-1".to_string(),
                tenant_id: "default".to_string(),
                wallet: Some("wallet-1".to_string()),
                user_id: None,
                product_id: "prod-1".to_string(),
                plan_id: None,
                payment_method: PaymentMethod::Stripe,
                stripe_subscription_id: Some("sub_stripe_1".to_string()),
                stripe_customer_id: Some("cus_123".to_string()),
                status: SubscriptionStatus::Active,
                billing_period: BillingPeriod::Month,
                billing_interval: 1,
                current_period_start: now,
                current_period_end: now + chrono::Duration::days(30),
                trial_end: None,
                cancel_at_period_end: true,
                cancelled_at: None,
                payment_signature: None,
                created_at: Some(now),
                updated_at: Some(now),
                metadata: std::collections::HashMap::new(),
            })
            .await
            .expect("seed subscription");

        let response = reactivate(
            State(state),
            TenantContext::default(),
            Json(ReactivateRequest {
                subscription_id: "sub-reactivate-1".to_string(),
            }),
        )
        .await
        .into_response();

        assert_eq!(response.status(), StatusCode::SERVICE_UNAVAILABLE);
    }

    #[tokio::test]
    async fn test_cancel_x402_subscription_still_updates_local_state_without_stripe() {
        let state = build_state();
        let now = Utc::now();
        state
            .subscription_service
            .store()
            .save_subscription(Subscription {
                id: "sub-x402-1".to_string(),
                tenant_id: "default".to_string(),
                wallet: Some("wallet-1".to_string()),
                user_id: None,
                product_id: "prod-1".to_string(),
                plan_id: None,
                payment_method: PaymentMethod::X402,
                stripe_subscription_id: None,
                stripe_customer_id: None,
                status: SubscriptionStatus::Active,
                billing_period: BillingPeriod::Month,
                billing_interval: 1,
                current_period_start: now,
                current_period_end: now + chrono::Duration::days(30),
                trial_end: None,
                cancel_at_period_end: false,
                cancelled_at: None,
                payment_signature: None,
                created_at: Some(now),
                updated_at: Some(now),
                metadata: std::collections::HashMap::new(),
            })
            .await
            .expect("seed subscription");

        let response = cancel(
            State(state.clone()),
            TenantContext::default(),
            Json(CancelRequest {
                subscription_id: "sub-x402-1".to_string(),
                at_period_end: Some(false),
            }),
        )
        .await
        .into_response();

        assert_eq!(response.status(), StatusCode::OK);
        let saved = state
            .subscription_service
            .store()
            .get_subscription("default", "sub-x402-1")
            .await
            .unwrap()
            .expect("subscription updated");
        assert_eq!(saved.status, SubscriptionStatus::Cancelled);
    }

    #[test]
    fn test_build_stripe_subscription_metadata_includes_user_id() {
        let m = build_stripe_subscription_metadata("tenant-1", Some("user-1".to_string()));
        assert_eq!(m.get("tenant_id").map(String::as_str), Some("tenant-1"));
        assert_eq!(m.get("user_id").map(String::as_str), Some("user-1"));
    }

    #[test]
    fn test_stripe_session_request_rejects_unknown_fields() {
        let err = serde_json::from_value::<StripeSessionRequest>(serde_json::json!({
            "resource": "prod-1",
            "interval": "monthly",
            "couponCode": "SAVE20",
        }))
        .expect_err("unknown fields should be rejected");

        assert!(err.to_string().contains("unknown field"));
    }

    #[tokio::test]
    async fn test_stripe_session_rejects_interval_mismatch() {
        let state = build_state_with_stripe();

        let response = stripe_session(
            State(state),
            TenantContext::default(),
            axum::http::HeaderMap::new(),
            Json(StripeSessionRequest {
                resource: "prod-1".to_string(),
                interval: "yearly".to_string(),
                interval_days: None,
                trial_days: None,
                customer_email: None,
                success_url: Some("https://example.com/success".to_string()),
                cancel_url: Some("https://example.com/cancel".to_string()),
            }),
        )
        .await
        .into_response();

        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    }

    #[tokio::test]
    async fn test_stripe_session_rejects_interval_days_for_fixed_subscription() {
        let state = build_state_with_stripe();

        let response = stripe_session(
            State(state),
            TenantContext::default(),
            axum::http::HeaderMap::new(),
            Json(StripeSessionRequest {
                resource: "prod-1".to_string(),
                interval: "monthly".to_string(),
                interval_days: Some(45),
                trial_days: None,
                customer_email: None,
                success_url: Some("https://example.com/success".to_string()),
                cancel_url: Some("https://example.com/cancel".to_string()),
            }),
        )
        .await
        .into_response();

        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    }
}
