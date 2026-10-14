//! `POST /paywall/v1/subscription/stripe-session` — create a Stripe hosted
//! subscription Checkout session (the recurring counterpart of `stripe-session`).
//!
//! Public route (Stripe hosts the buyer + creates the customer). The recurring price
//! and trial are derived **entirely from the catalog**, never the request: the amount
//! is the product's catalog price, the billing interval is the product's stored
//! `subscription.interval`, and the trial is the product's stored
//! `subscription.trialDays`. The client-supplied `interval`/`trialDays` are ignored —
//! honoring them would let a buyer pick a cheaper billing frequency or grant
//! themselves a trial. Returns
//! `{ flow:'redirect_checkout', sessionId, url }` for `stripe.redirectToCheckout`.

use serde::Deserialize;
use serde_json::{json, Value};

use crate::db::Db;
use crate::error::{AppError, AppResult};
use crate::ids;
use crate::reqresp::{RouteRequest, RouteResponse, RouteSpec};
use crate::routes::matches;
use crate::routes::products::{
    catalog_currency, catalog_price_cents, is_capacity_handle, is_capacity_product,
};
use crate::routes::stripe_session::{
    allowed_schemes, is_plausible_email, required_idempotency_key, resolve_redirect,
};
use crate::seams::HostSeams;
use crate::stripe::api;
use crate::stripe::checkout_api::{self, SubscriptionCheckoutRequest};

/// Trial-day ceiling — the server never honors an absurd stored trial.
const MAX_TRIAL_DAYS: i64 = 365;
/// Custom-cadence ceiling (Stripe caps `day` interval_count at 365).
const MAX_INTERVAL_DAYS: i64 = 365;

pub const ROUTES: &[RouteSpec] = &[RouteSpec {
    route_id: ids::ROUTE_SUBSCRIPTION_STRIPE_SESSION,
    method: "POST",
    path: "/paywall/v1/subscription/stripe-session",
}];

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SessionReq {
    resource: String,
    #[serde(default)]
    customer_email: Option<String>,
    #[serde(default)]
    success_url: Option<String>,
    #[serde(default)]
    cancel_url: Option<String>,
    // The UI also sends interval/intervalDays/trialDays; they are IGNORED — the billing
    // cadence and trial are server-controlled from the catalog (anti-manipulation).
    #[serde(default)]
    #[allow(dead_code)]
    interval: Option<String>,
    #[serde(default)]
    #[allow(dead_code)]
    interval_days: Option<i64>,
    #[serde(default)]
    #[allow(dead_code)]
    trial_days: Option<i64>,
}

pub fn handle<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    crate::native_storefront_policy::require_request(seams, req)?;
    if !matches(req, "POST", "/paywall/v1/subscription/stripe-session") {
        return Err(AppError::not_found("unknown subscription session route"));
    }
    let body: SessionReq = serde_json::from_value(req.json_body()?).map_err(|e| {
        AppError::unprocessable("invalid request body").with_internal(e.to_string())
    })?;
    let resource = body.resource.trim();
    if resource.is_empty() {
        return Err(AppError::unprocessable("resource is required"));
    }
    if is_capacity_handle(resource) {
        return Err(AppError::unprocessable(
            "capacity add-ons require a scoped purchase",
        ));
    }
    if let Some(email) = body.customer_email.as_deref() {
        if !is_plausible_email(email) {
            return Err(AppError::unprocessable("invalid customer email"));
        }
    }

    let secret_key = seams
        .secret_get(ids::SECRET_STRIPE_KEY)?
        .filter(|s| !s.is_empty())
        .ok_or_else(|| AppError::new(503, "unavailable", "card payments are not configured"))?;

    let db = Db::new(seams, ids::DB_ACCESS);
    let product = db
        .read_one(ids::MODEL_CATALOG, resource)?
        .ok_or_else(|| AppError::not_found("unknown resource"))?;
    if is_capacity_product(&product.payload) {
        return Err(AppError::unprocessable(
            "capacity add-ons require a scoped purchase",
        ));
    }
    let amount_cents = catalog_price_cents(&product.payload)
        .ok_or_else(|| AppError::unprocessable("resource has no purchasable price"))?;
    let currency = catalog_currency(&product.payload);

    // Server-controlled recurring config from the catalog (never the request).
    let sub = product
        .payload
        .get("subscription")
        .filter(|v| v.is_object())
        .ok_or_else(|| AppError::unprocessable("resource is not a subscription product"))?;
    let (interval, interval_count) = stripe_interval(sub)?;
    let trial_period_days = sub
        .get("trialDays")
        .and_then(Value::as_i64)
        .filter(|d| *d > 0)
        .map(|d| d.min(MAX_TRIAL_DAYS));

    let allowed = allowed_schemes(seams);
    let success_url =
        resolve_redirect(seams, body.success_url.as_deref(), "success_url", &allowed)?;
    let cancel_url = resolve_redirect(seams, body.cancel_url.as_deref(), "cancel_url", &allowed)?;
    let product_name = ["displayName", "title", "name"]
        .iter()
        .find_map(|key| product.payload.get(*key).and_then(Value::as_str))
        .unwrap_or(resource)
        .to_string();
    let idempotency_key = required_idempotency_key(req)?;
    let provider_key = crate::routes::checkout_claim::scoped_provider_key(
        &crate::ctx::RequestContext::parse(&req.context_json),
        "catalog-session",
        &idempotency_key,
    )?;
    let claim = crate::routes::subscription_store::claim(
        &db,
        "catalog-session",
        &idempotency_key,
        json!({ "providerIdempotencyKey": provider_key, "resource": resource, "productName": product_name, "amountCents": amount_cents, "currency": currency,
            "interval": interval, "intervalCount": interval_count, "trialDays": trial_period_days,
            "successUrl": success_url, "cancelUrl": cancel_url, "customerEmail": body.customer_email }),
        seams.now_unix_secs(),
    )?;
    if let Some(result) = crate::routes::subscription_store::completed_result(&claim)? {
        return Ok(RouteResponse::ok(&result));
    }
    crate::routes::subscription_store::require_provider_retry_safe(&claim, seams.now_unix_secs())?;

    let fetch = checkout_api::build_subscription_checkout_fetch(
        &secret_key,
        &SubscriptionCheckoutRequest {
            amount_cents,
            currency,
            product_name,
            interval,
            interval_count,
            trial_period_days,
            require_payment_method: true,
            success_url,
            cancel_url,
            expires_at: checkout_api::session_expiry(
                claim.row.payload["createdAt"]
                    .as_str()
                    .ok_or_else(|| AppError::conflict("checkout initiation time is missing"))?,
            )?,
            customer_email: body.customer_email.clone(),
            idempotency_key: provider_key.clone(),
            metadata: vec![("resource".to_string(), resource.to_string())],
            promotion_code_id: None,
            coupon_id: None,
        },
    );
    let raw = seams.http_fetch(&fetch.to_string())?;
    let (status, resp_body) = api::unwrap_fetch(&raw).map_err(|e| {
        AppError::new(
            502,
            "provider_unavailable",
            "could not create the subscription session",
        )
        .with_internal(e)
    })?;
    let session = checkout_api::parse_checkout_session(status, &resp_body).map_err(|e| {
        AppError::new(
            502,
            "provider_unavailable",
            "could not create the subscription session",
        )
        .with_internal(e)
    })?;
    // No ledger row at creation: the subscription's amounts (trial=0, proration) only
    // settle on the first invoice, which the subscription webhook records.
    let result = json!({
        "flow": "redirect_checkout",
        "sessionId": session.id,
        "url": session.url,
    });
    crate::routes::subscription_store::complete_marker_with_result(
        &db,
        &claim,
        Some(result.clone()),
    )?;
    Ok(RouteResponse::ok(&result))
}

/// Map the catalog product's stored billing cadence to a Stripe `(interval,
/// interval_count)`. Fails closed on an unrecognized cadence.
fn stripe_interval(sub: &Value) -> AppResult<(String, i64)> {
    let interval = sub
        .get("interval")
        .and_then(Value::as_str)
        .unwrap_or("")
        .to_ascii_lowercase();
    match interval.as_str() {
        "weekly" | "week" => Ok(("week".to_string(), 1)),
        "monthly" | "month" => Ok(("month".to_string(), 1)),
        "yearly" | "year" | "annual" | "annually" => Ok(("year".to_string(), 1)),
        "daily" | "day" => Ok(("day".to_string(), 1)),
        "custom" => {
            let days = sub
                .get("intervalDays")
                .and_then(Value::as_i64)
                .filter(|d| *d > 0)
                .map(|d| d.min(MAX_INTERVAL_DAYS))
                .ok_or_else(|| {
                    AppError::unprocessable("custom subscription cadence needs intervalDays")
                })?;
            Ok(("day".to_string(), days))
        }
        _ => Err(AppError::unprocessable(
            "resource has an unsupported subscription interval",
        )),
    }
}

#[cfg(test)]
#[path = "subscription_session_tests.rs"]
mod tests;
