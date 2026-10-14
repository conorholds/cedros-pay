//! `POST /paywall/v1/cart/checkout` — create a Stripe hosted Checkout session for a
//! stored cart (the cart's third settlement rail, beside x402 and credits).
//!
//! Public route (Stripe hosts the buyer). The amount is the cart's stored fiat total
//! snapshot — never the client's — so a caller can only pay the real cart price. The
//! redirect URLs and email are validated (reusing the single-product
//! [`crate::routes::stripe_session`] guards) before any provider call; a pending
//! ledger row keyed by the Stripe session id is recorded (the webhook finalizes it),
//! and `{ sessionId, url }` is returned. The cart is billed as one line item for its
//! total; per-item itemization and shipping options are not supported here.

use serde::Deserialize;
use serde_json::{json, Map, Value};

use crate::ctx::RequestContext;
use crate::db::{BatchOp, Db};
use crate::error::{AppError, AppResult};
use crate::guarded_batch::GuardedCondition;
use crate::ids;
use crate::models::{CartRow, LedgerEntry};
use crate::reqresp::{RouteRequest, RouteResponse, RouteSpec};
use crate::routes::cart::is_valid_cart_id;
use crate::routes::matches;
use crate::routes::stripe_session::{allowed_schemes, is_plausible_email, resolve_redirect};
use crate::seams::HostSeams;
use crate::stripe::api;
use crate::stripe::checkout_api::{self, CheckoutSessionRequest};
use crate::time;

pub const ROUTES: &[RouteSpec] = &[RouteSpec {
    route_id: ids::ROUTE_CART_CHECKOUT,
    method: "POST",
    path: "/paywall/v1/cart/checkout",
}];

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CartCheckoutReq {
    cart_id: String,
    #[serde(default)]
    customer_email: Option<String>,
    #[serde(default)]
    metadata: Option<Map<String, Value>>,
    #[serde(default)]
    success_url: Option<String>,
    #[serde(default)]
    cancel_url: Option<String>,
    // The UI also sends items/customer*/shipping*/tip/etc.; serde ignores
    // unknown fields, so checkout binds to the stored cart snapshot, not re-sent items.
    #[serde(default)]
    coupon: Option<String>,
    #[serde(default)]
    coupon_code: Option<String>,
    #[serde(default)]
    discount_code: Option<String>,
}

pub fn handle<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    crate::native_storefront_policy::require_request(seams, req)?;
    if !matches(req, "POST", "/paywall/v1/cart/checkout") {
        return Err(AppError::not_found("unknown cart checkout route"));
    }
    let body: CartCheckoutReq = serde_json::from_value(req.json_body()?).map_err(|e| {
        AppError::unprocessable("invalid request body").with_internal(e.to_string())
    })?;
    let cart_id = body.cart_id.trim();
    if !is_valid_cart_id(cart_id) {
        return Err(AppError::not_found("cart not found"));
    }
    if let Some(email) = body.customer_email.as_deref() {
        if !is_plausible_email(email) {
            return Err(AppError::unprocessable("invalid customer email"));
        }
    }

    let db = Db::new(seams, ids::DB_ACCESS);
    let cart_record = db
        .read_one(ids::MODEL_CART, cart_id)?
        .ok_or_else(|| AppError::not_found("cart not found"))?;
    let cart: CartRow = cart_record.parse()?;
    let coupon_code = crate::routes::coupons::requested_code(&[
        body.coupon.as_deref(),
        body.coupon_code.as_deref(),
        body.discount_code.as_deref(),
    ])?;
    crate::routes::coupons::matching_snapshot_coupon(
        coupon_code.as_deref(),
        cart.applied_coupon.as_ref(),
    )?;
    // A cart already settled on any rail must not be re-checked out.
    if cart.paid_signature.is_some() {
        return Err(AppError::conflict("cart is already settled"));
    }
    let now = seams.now_unix_secs();
    if time::parse_iso(&cart.expires_at)
        .map(|exp| now > exp)
        .unwrap_or(false)
    {
        return Err(AppError::new(
            422,
            "unprocessable_entity",
            "cart quote has expired",
        ));
    }

    let secret_key = seams
        .secret_get(ids::SECRET_STRIPE_KEY)?
        .filter(|s| !s.is_empty())
        .ok_or_else(|| AppError::new(503, "unavailable", "card payments are not configured"))?;

    let allowed = allowed_schemes(seams);
    let success_url =
        resolve_redirect(seams, body.success_url.as_deref(), "success_url", &allowed)?;
    let cancel_url = resolve_redirect(seams, body.cancel_url.as_deref(), "cancel_url", &allowed)?;

    let resource = format!("cart:{cart_id}");
    let context = RequestContext::parse(&req.context_json);
    let idempotency_key = crate::routes::checkout_claim::provider_idempotency_key(
        context.idempotency_key.as_deref(),
        "cc",
        cart_id,
    )?;
    let idempotency_key = crate::routes::checkout_claim::scoped_provider_key(
        &context,
        "cart_checkout",
        &idempotency_key,
    )?;
    let mut metadata = vec![("resource".to_string(), resource.clone())];
    metadata.extend(crate::routes::stripe_session::public_metadata(
        body.metadata.as_ref(),
    )?);
    let claim_fingerprint = crate::routes::checkout_claim::fingerprint(&json!({
        "schemaVersion": 1,
        "rail": "stripe",
        "cartId": cart_id,
        "amountCents": cart.total_cents,
        "currency": cart.currency,
        "customerEmail": body.customer_email,
        "successUrl": success_url,
        "cancelUrl": cancel_url,
        "metadata": metadata,
        "idempotencyKey": idempotency_key,
    }))?;
    let claimed_cart = crate::routes::cart_settlement::claim(
        &db,
        cart_record,
        "stripe",
        &claim_fingerprint,
        &idempotency_key,
        vec![],
        vec![],
    )?;

    let fetch = checkout_api::build_checkout_session_fetch(
        &secret_key,
        &CheckoutSessionRequest {
            amount_cents: cart.total_cents,
            currency: cart.currency.clone(),
            product_name: format!("{} item cart", cart.items.len()),
            success_url,
            cancel_url,
            customer_email: body.customer_email.clone(),
            client_reference_id: Some(resource.clone()),
            idempotency_key: idempotency_key.clone(),
            expires_at: checkout_api::session_expiry(
                claimed_cart.payload["settlementClaim"]["startedAt"]
                    .as_str()
                    .ok_or_else(|| {
                        AppError::conflict(
                            "checkout initiation time is missing; reconcile the cart",
                        )
                    })?,
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

    let entry = LedgerEntry {
        reference: session.id.clone(),
        kind: "payment".to_string(),
        status: "pending".to_string(),
        gross_cents: cart.total_cents,
        refund_cents: 0,
        currency: cart.currency.clone(),
        customer_profile_id: None,
        route_path: None,
        product_ids: vec![resource.clone()],
        product_id: Some(resource),
        provider: "stripe".to_string(),
        provider_ref: Some(session.id.clone()),
        payer_wallet: None,
        created_at: time::iso8601(now),
        processed_at: time::iso8601(now),
        token_settlement: None,
    };
    let conditions = vec![GuardedCondition::Absent {
        content_model_id: ids::MODEL_LEDGER,
        entry_key: session.id.clone(),
    }];
    let ops = vec![BatchOp::Write {
        content_model_id: ids::MODEL_LEDGER,
        entry_key: session.id.clone(),
        data: crate::routes::checkout_claim::ledger_value(&entry, &claim_fingerprint)?,
    }];
    if !crate::routes::cart_settlement::finalize(
        &db,
        &claimed_cart,
        "stripe",
        &claim_fingerprint,
        &session.id,
        conditions,
        ops,
    )? {
        let existing = db
            .read_one(ids::MODEL_LEDGER, &session.id)?
            .ok_or_else(|| AppError::conflict("cart checkout changed concurrently; retry"))?;
        crate::routes::checkout_claim::validate(&existing, &claim_fingerprint)?;
    }

    Ok(RouteResponse::ok(&json!({
        "sessionId": session.id,
        "url": session.url,
    })))
}

#[cfg(test)]
#[path = "cart_checkout_tests.rs"]
mod tests;
