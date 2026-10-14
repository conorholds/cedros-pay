//! Validated, fingerprinted PaymentIntent checkout request preparation.

use serde::Deserialize;
use serde_json::json;

use crate::ctx::RequestContext;
use crate::error::{AppError, AppResult};
use crate::ids;
use crate::money;
use crate::reqresp::RouteRequest;
use crate::seams::HostSeams;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CheckoutReq {
    amount_cents: i64,
    #[serde(default)]
    currency: Option<String>,
    reference: String,
    #[serde(default)]
    profile_id: Option<String>,
    #[serde(default)]
    route_path: Option<String>,
    #[serde(default)]
    product_id: Option<String>,
}

pub(super) struct CheckoutPlan {
    pub(super) amount_cents: i64,
    pub(super) currency: String,
    pub(super) reference: String,
    pub(super) profile_id: Option<String>,
    pub(super) route_path: Option<String>,
    pub(super) product_id: Option<String>,
    pub(super) secret_key: String,
    pub(super) idempotency_key: String,
    pub(super) metadata: Vec<(String, String)>,
    pub(super) fingerprint: String,
    pub(super) now: i64,
}

pub(super) fn prepare<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<CheckoutPlan> {
    let body: CheckoutReq = serde_json::from_value(req.json_body()?).map_err(|error| {
        AppError::unprocessable("invalid request body").with_internal(error.to_string())
    })?;
    money::require_positive(body.amount_cents).map_err(AppError::unprocessable)?;
    if body.reference.trim().is_empty() {
        return Err(AppError::unprocessable("reference is required"));
    }
    let currency =
        money::normalize_currency(body.currency.as_deref().unwrap_or(money::DEFAULT_CURRENCY));
    let secret_key = seams
        .secret_get(ids::SECRET_STRIPE_KEY)?
        .filter(|secret| !secret.is_empty())
        .ok_or_else(|| AppError::new(503, "unavailable", "card payments are not configured"))?;
    let context = RequestContext::parse(&req.context_json);
    let idempotency_key = crate::routes::checkout_claim::provider_idempotency_key(
        context.idempotency_key.as_deref(),
        "pi",
        &body.reference,
    )?;
    let idempotency_key = crate::routes::checkout_claim::scoped_provider_key(
        &context,
        "paywall_request",
        &idempotency_key,
    )?;
    let mut metadata = metadata(&body);
    let fingerprint = crate::routes::checkout_claim::fingerprint(&json!({
        "schemaVersion": 1, "operation": "payment-intent",
        "reference": body.reference, "amountCents": body.amount_cents,
        "currency": currency, "profileId": body.profile_id,
        "routePath": body.route_path, "productId": body.product_id,
        "idempotencyKey": idempotency_key,
    }))?;
    metadata.push(("cedros_pay_operation".to_string(), fingerprint.clone()));
    Ok(CheckoutPlan {
        amount_cents: body.amount_cents,
        currency,
        reference: body.reference,
        profile_id: body.profile_id,
        route_path: body.route_path,
        product_id: body.product_id,
        secret_key,
        idempotency_key,
        metadata,
        fingerprint,
        now: seams.now_unix_secs(),
    })
}

fn metadata(body: &CheckoutReq) -> Vec<(String, String)> {
    let mut metadata = vec![("reference".to_string(), body.reference.clone())];
    for (key, value) in [
        ("profileId", body.profile_id.as_ref()),
        ("routePath", body.route_path.as_ref()),
        ("productId", body.product_id.as_ref()),
    ] {
        if let Some(value) = value {
            metadata.push((key.to_string(), value.clone()));
        }
    }
    metadata
}
