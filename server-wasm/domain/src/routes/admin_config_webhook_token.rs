//! Site-generated Stripe webhook ingress token and the endpoint URL that carries it.
//!
//! Cedros hosts reserialize inbound JSON, so Stripe's raw-byte signature cannot
//! be checked. Pay authenticates webhook ingress with a random 256-bit token in
//! the endpoint URL and then fetches the authoritative Event from Stripe. The
//! token is minted here on first read and stored only in host secrets; operators
//! copy the finished URL into Stripe and can clear the token to rotate it.

use serde_json::{json, Value};

use crate::error::{AppError, AppResult};
use crate::ids;
use crate::seams::HostSeams;

/// Stripe endpoint path (relative to the site origin) before the token query.
pub(super) const ENDPOINT_PATH: &str = "/extensions/cedros-pay/webhook/stripe";

/// Stripe event types the webhook route projects; the operator selects exactly
/// these when creating the endpoint in Stripe.
pub(super) const STRIPE_EVENTS: &[&str] = &[
    "checkout.session.completed",
    "checkout.session.expired",
    "checkout.session.async_payment_succeeded",
    "checkout.session.async_payment_failed",
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "invoice.paid",
    "payment_intent.succeeded",
    "payment_intent.payment_failed",
    "charge.refunded",
    "charge.refund.updated",
    "charge.dispute.created",
    "charge.dispute.updated",
    "charge.dispute.closed",
    "charge.dispute.funds_withdrawn",
];

/// Exactly 64 lowercase-or-uppercase hexadecimal characters (256 bits).
pub fn is_webhook_token(token: &str) -> bool {
    token.len() == 64 && token.bytes().all(|byte| byte.is_ascii_hexdigit())
}

/// Returns the stored token, minting and persisting one when absent or malformed.
pub(super) fn ensure_token<S: HostSeams>(seams: &S) -> AppResult<String> {
    if let Some(token) = seams
        .secret_get(ids::SECRET_STRIPE_WEBHOOK_TOKEN)?
        .filter(|token| is_webhook_token(token))
    {
        return Ok(token);
    }
    let mut bytes = [0u8; 32];
    getrandom::fill(&mut bytes).map_err(|error| {
        AppError::internal("cannot generate Stripe webhook ingress token")
            .with_internal(error.to_string())
    })?;
    let token = hex::encode(bytes);
    seams.secret_set(ids::SECRET_STRIPE_WEBHOOK_TOKEN, &token)?;
    seams.log("info", "generated Stripe webhook ingress token");
    Ok(token)
}

/// Endpoint description for the admin UI: the tokenised path and event list.
pub(super) fn endpoint<S: HostSeams>(seams: &S) -> AppResult<Value> {
    let token = ensure_token(seams)?;
    Ok(json!({
        "path": format!("{ENDPOINT_PATH}?token={token}"),
        "events": STRIPE_EVENTS,
    }))
}

#[cfg(test)]
#[path = "admin_config_webhook_token_tests.rs"]
mod tests;
