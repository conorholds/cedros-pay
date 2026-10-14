//! `POST /paywall/v1/stripe-session` — create a Stripe hosted Checkout session for a
//! catalog product.
//!
//! Public route priced from the catalog snapshot rather than client input. Redirects
//! are validated before any provider call; the
//! session uses idempotent `http_fetch`; a pending ledger row is finalized by webhook.

use serde::Deserialize;
use serde_json::{json, Map, Value};

use crate::db::Db;
use crate::error::{AppError, AppResult};
use crate::ids;
use crate::models::LedgerEntry;
use crate::reqresp::{RouteRequest, RouteResponse, RouteSpec};
use crate::routes::matches;
use crate::seams::HostSeams;
use crate::stripe::api;
use crate::stripe::checkout_api::{self, CheckoutSessionRequest};
use crate::time;

#[path = "stripe_session_support.rs"]
mod support;
use support::price_for_resource;
pub(crate) use support::{allowed_schemes, is_plausible_email, public_metadata, resolve_redirect};

pub const ROUTES: &[RouteSpec] = &[RouteSpec {
    route_id: ids::ROUTE_STRIPE_SESSION,
    method: "POST",
    path: "/paywall/v1/stripe-session",
}];

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SessionReq {
    resource: String,
    #[serde(default)]
    customer_email: Option<String>,
    #[serde(default)]
    metadata: Option<Map<String, Value>>,
    #[serde(default)]
    success_url: Option<String>,
    #[serde(default)]
    cancel_url: Option<String>,
    #[serde(default)]
    coupon_code: Option<String>,
}

pub fn handle<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    crate::native_storefront_policy::require_request(seams, req)?;
    if !matches(req, "POST", "/paywall/v1/stripe-session") {
        return Err(AppError::not_found("unknown stripe session route"));
    }
    let body: SessionReq = serde_json::from_value(req.json_body()?).map_err(|e| {
        AppError::unprocessable("invalid request body").with_internal(e.to_string())
    })?;
    let resource = body.resource.trim();
    if resource.is_empty() {
        return Err(AppError::unprocessable("resource is required"));
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

    // Resolve redirect URLs (request override → configured default) and validate their
    // scheme to block open-redirect / script-scheme injection on this public route.
    let allowed = allowed_schemes(seams);
    let success_url =
        resolve_redirect(seams, body.success_url.as_deref(), "success_url", &allowed)?;
    let cancel_url = resolve_redirect(seams, body.cancel_url.as_deref(), "cancel_url", &allowed)?;

    // Catalog-derived pricing (server-trusted; never the client's number).
    let (original_amount_cents, currency, product_name) = price_for_resource(seams, resource)?;
    let coupon_code = crate::routes::coupons::requested_code(&[body.coupon_code.as_deref()])?;
    let priced = crate::routes::coupons::apply_to_cents(
        seams,
        coupon_code.as_deref(),
        original_amount_cents,
        &currency,
        crate::routes::coupons::CouponPurpose::StripeSession,
    )?;
    let amount_cents = priced.total_cents;

    // A resource is not an attempt identity: two buyers can concurrently buy the
    // same product. Fail closed unless the host supplies the stable request key it
    // will reuse after a lost response.
    let idempotency_key = required_idempotency_key(req)?;
    let provider_key = crate::routes::checkout_claim::scoped_provider_key(
        &crate::ctx::RequestContext::parse(&req.context_json),
        "hosted-product-checkout",
        &idempotency_key,
    )?;

    let mut metadata = vec![("resource".to_string(), resource.to_string())];
    if let Some(coupon) = &priced.applied_coupon {
        metadata.push(("coupon_code".to_string(), coupon.code.clone()));
        metadata.push((
            "original_amount_cents".to_string(),
            coupon.original_total_cents.to_string(),
        ));
        metadata.push((
            "discounted_amount_cents".to_string(),
            coupon.discounted_total_cents.to_string(),
        ));
    }
    metadata.extend(public_metadata(body.metadata.as_ref())?);

    let now = seams.now_unix_secs();
    let db = Db::new(seams, ids::DB_ACCESS);
    let claim = crate::routes::hosted_checkout::claim(
        &db,
        "hosted-product-checkout",
        &idempotency_key,
        json!({
            "providerIdempotencyKey": provider_key,
            "resource": resource,
            "productName": product_name,
            "amountCents": amount_cents,
            "currency": currency,
            "customerEmail": body.customer_email,
            "successUrl": success_url,
            "cancelUrl": cancel_url,
            "metadata": metadata,
        }),
        now,
    )?;
    if let Some((session_id, url)) = crate::routes::hosted_checkout::completed_result(&claim)? {
        return Ok(RouteResponse::ok(&json!({
            "sessionId": session_id,
            "url": url,
        })));
    }
    crate::routes::hosted_checkout::require_provider_retry_safe(&claim, now)?;
    metadata.push(("cedros_pay_operation".into(), claim.fingerprint.clone()));

    let fetch = checkout_api::build_checkout_session_fetch(
        &secret_key,
        &CheckoutSessionRequest {
            amount_cents,
            currency: currency.clone(),
            product_name,
            success_url,
            cancel_url,
            customer_email: body.customer_email.clone(),
            client_reference_id: Some(resource.to_string()),
            idempotency_key: provider_key.clone(),
            expires_at: checkout_api::session_expiry(
                claim.row.payload["createdAt"]
                    .as_str()
                    .ok_or_else(|| AppError::conflict("checkout initiation time is missing"))?,
            )?,
            metadata,
        },
    );
    let raw = seams.http_fetch(&fetch.to_string())?;
    let (status, resp_body) = api::unwrap_fetch(&raw).map_err(|e| {
        AppError::new(
            502,
            "provider_unavailable",
            "could not create the checkout session",
        )
        .with_internal(e)
    })?;
    let session = checkout_api::parse_checkout_session(status, &resp_body).map_err(|e| {
        AppError::new(
            502,
            "provider_unavailable",
            "could not create the checkout session",
        )
        .with_internal(e)
    })?;

    // Pending ledger row keyed by the session id; the Stripe webhook finalizes it.
    let entry = LedgerEntry {
        reference: session.id.clone(),
        kind: "payment".to_string(),
        status: "pending".to_string(),
        gross_cents: amount_cents,
        refund_cents: 0,
        currency,
        customer_profile_id: None,
        route_path: None,
        product_id: Some(resource.to_string()),
        product_ids: vec![resource.to_string()],
        provider: "stripe".to_string(),
        provider_ref: Some(session.id.clone()),
        payer_wallet: None,
        created_at: time::iso8601(now),
        processed_at: time::iso8601(now),
        token_settlement: None,
    };
    crate::routes::hosted_checkout::finalize(
        &db,
        &claim,
        &session.id,
        session.url.as_deref(),
        &entry,
    )?;

    Ok(RouteResponse::ok(&json!({
        "sessionId": session.id,
        "url": session.url,
    })))
}

pub(crate) fn required_idempotency_key(req: &RouteRequest) -> AppResult<String> {
    let context = crate::ctx::RequestContext::parse(&req.context_json);
    let value = context
        .idempotency_key
        .as_deref()
        .ok_or_else(|| AppError::bad_request("idempotency key required"))?;
    crate::checkout_contract::ExternalIdempotencyKey::parse_exact(value)
        .map(|key| key.as_str().to_string())
}

#[cfg(test)]
#[path = "stripe_session_tests.rs"]
mod tests;
