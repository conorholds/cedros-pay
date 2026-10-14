//! Authenticate notifications before trusting any economic event fields.
//!
//! Cedros hosts reserialize inbound JSON bodies, so Stripe's raw-byte HMAC can
//! never be verified here. Ingress is authenticated with the site's generated
//! `stripe.webhook_token` instead, and the authoritative Event is then fetched
//! from Stripe with the site API key; nothing in the posted payload is trusted.
use serde_json::Value;

use crate::error::{AppError, AppResult};
use crate::ids;
use crate::reqresp::RouteRequest;
use crate::seams::HostSeams;
use crate::stripe::api;

pub(super) fn authenticate<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<Value> {
    let token = seams
        .secret_get(ids::SECRET_STRIPE_WEBHOOK_TOKEN)?
        .filter(|token| !token.is_empty())
        .ok_or_else(|| {
            AppError::new(
                503,
                "unavailable",
                "Stripe webhook ingress token is not configured",
            )
        })?;
    // A 256-bit, random hex token belongs in the host secret store, never settings.
    if !crate::routes::admin_config::is_webhook_token(&token) {
        return Err(AppError::new(
            503,
            "unavailable",
            "Stripe ingress token must be 64 hexadecimal characters",
        ));
    }
    let mut supplied = req
        .query
        .iter()
        .filter(|(key, _)| key == "token")
        .map(|(_, value)| value.as_str())
        .chain(req.header("x-cedros-webhook-token"));
    let provided = supplied.next().unwrap_or("");
    if supplied.next().is_some() || !constant_time_eq(provided.as_bytes(), token.as_bytes()) {
        return Err(AppError::unauthorized("invalid webhook token"));
    }
    retrieve_event(seams, req)
}

fn retrieve_event<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<Value> {
    let hint = req.json_body()?;
    let id = hint
        .get("id")
        .and_then(Value::as_str)
        .filter(|id| {
            id.starts_with("evt_")
                && id.len() > 4
                && id.len() <= 255
                && id.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'_')
        })
        .ok_or_else(|| AppError::bad_request("invalid Stripe event identity"))?;
    let secret = seams
        .secret_get(ids::SECRET_STRIPE_KEY)?
        .filter(|secret| !secret.is_empty())
        .ok_or_else(|| AppError::new(503, "unavailable", "Stripe is not configured"))?;
    let live = if secret.starts_with("sk_live_") || secret.starts_with("rk_live_") {
        true
    } else if secret.starts_with("sk_test_") || secret.starts_with("rk_test_") {
        false
    } else {
        return Err(AppError::new(
            503,
            "unavailable",
            "Stripe account key mode is invalid",
        ));
    };
    let fetch = api::stripe_get(&secret, &format!("/v1/events/{id}"));
    let (status, body) =
        api::unwrap_fetch(&seams.http_fetch(&fetch.to_string())?).map_err(|_| provider_error())?;
    if status != 200 {
        return Err(provider_error());
    }
    let mut event: Value = serde_json::from_str(&body).map_err(|_| provider_error())?;
    // Retrieval preserves the snapshot's original API version, irrespective of
    // our outbound Stripe-Version header or webhook endpoint version. Dispatch
    // validates the fields needed by each event; never assume the snapshot uses
    // our request version. Keep its provenance in the receipt fingerprint.
    if event["id"] != id
        || event["object"] != "event"
        || event["livemode"].as_bool() != Some(live)
        || event["api_version"].as_str().is_none_or(str::is_empty)
        || !event["account"].is_null()
        || !event["context"].is_null()
        || event["created"].as_i64().is_none_or(|created| created < 0)
        || event["type"].as_str().is_none_or(str::is_empty)
        || !event["data"]["object"].is_object()
    {
        return Err(provider_error());
    }
    // This counter changes between deliveries; it is not part of event identity.
    if let Some(object) = event.as_object_mut() {
        object.remove("pending_webhooks");
    }
    Ok(event)
}

fn provider_error() -> AppError {
    AppError::new(
        502,
        "provider_unavailable",
        "could not authenticate the Stripe event for this account",
    )
}

fn constant_time_eq(left: &[u8], right: &[u8]) -> bool {
    if left.len() != right.len() {
        return false;
    }
    let mut difference = 0u8;
    for (left, right) in left.iter().zip(right) {
        difference |= left ^ right;
    }
    difference == 0
}
