//! Stripe API calls (PaymentIntent + Subscription) over the `http.fetch` egress
//! seam.
//!
//! Builds the `http.fetch` request envelope (`{method,url,headers,body}`) with
//! form-encoded params and an `Idempotency-Key` header, and parses the response
//! (or Stripe error). The actual call is the caller's `seams.http_fetch`, so
//! this is pure and fully testable.

use serde::Deserialize;
use serde_json::{json, Value};

use crate::ids::STRIPE_API_BASE;

#[path = "payment_intent.rs"]
mod payment_intent;
pub use payment_intent::{
    parse_payment_intent, PaymentIntent, PaymentIntentFailure, PaymentIntentRequest,
};

/// Builds the `http.fetch` request envelope. `secret_key` is the Stripe secret
/// key from the `secrets` seam (never logged).
pub fn build_payment_intent_fetch(secret_key: &str, req: &PaymentIntentRequest) -> Value {
    let mut params: Vec<(String, String)> = vec![
        ("amount".to_string(), req.amount_cents.to_string()),
        ("currency".to_string(), req.currency.to_lowercase()),
        (
            "automatic_payment_methods[enabled]".to_string(),
            "true".to_string(),
        ),
        (
            format!("metadata[{}]", crate::stripe::CHECKOUT_METADATA_MARKER),
            "true".to_string(),
        ),
    ];
    for (k, v) in &req.metadata {
        params.push((format!("metadata[{k}]"), v.clone()));
    }
    stripe_post(
        secret_key,
        "/v1/payment_intents",
        &req.idempotency_key,
        &params,
    )
}

/// Inputs for a Subscription create.
pub struct SubscriptionCreate {
    pub customer_ref: String,
    pub price_id: String,
    pub idempotency_key: String,
    pub operation_ref: String,
}

/// The parsed outcome of a Subscription create/cancel.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Subscription {
    pub id: String,
    pub customer: String,
    pub status: String,
    /// Current Stripe Price for the single subscription item, when present.
    /// This is provider state, not a client-supplied plan projection.
    pub price_id: Option<String>,
    pub current_period_end: Option<i64>,
    pub cancel_at_period_end: bool,
}

/// Builds the `http.fetch` request for `POST /v1/subscriptions`.
pub fn build_create_subscription_fetch(secret_key: &str, req: &SubscriptionCreate) -> Value {
    let params = vec![
        ("customer".to_string(), req.customer_ref.clone()),
        ("items[0][price]".to_string(), req.price_id.clone()),
        (
            "metadata[cedros_pay_operation]".to_string(),
            req.operation_ref.clone(),
        ),
    ];
    stripe_post(
        secret_key,
        "/v1/subscriptions",
        &req.idempotency_key,
        &params,
    )
}

/// Builds the `http.fetch` request to retrieve a subscription.
pub fn build_retrieve_subscription_fetch(secret_key: &str, subscription_id: &str) -> Value {
    let subscription_id = path_segment(subscription_id);
    stripe_get(secret_key, &format!("/v1/subscriptions/{subscription_id}"))
}

pub fn build_list_subscriptions_fetch(
    secret_key: &str,
    customer_ref: &str,
    starting_after: Option<&str>,
    expand_discounts: bool,
) -> Value {
    let mut params = vec![
        ("customer".to_string(), customer_ref.to_string()),
        ("status".to_string(), "all".to_string()),
        ("limit".to_string(), "100".to_string()),
    ];
    if expand_discounts {
        params.push(("expand[]".to_string(), "data.discounts".to_string()));
    }
    if let Some(cursor) = starting_after {
        params.push(("starting_after".to_string(), cursor.to_string()));
    }
    stripe_get(
        secret_key,
        &format!("/v1/subscriptions?{}", form_encode(&params)),
    )
}

pub fn build_retrieve_payment_intent_fetch(secret_key: &str, payment_intent: &str) -> Value {
    stripe_get(
        secret_key,
        &format!("/v1/payment_intents/{}", path_segment(payment_intent)),
    )
}

pub fn build_search_payment_intents_fetch(
    secret_key: &str,
    operation_ref: &str,
    page: Option<&str>,
) -> Value {
    let mut params = vec![
        (
            "query".to_string(),
            format!("metadata[\"cedros_pay_operation\"]:\"{operation_ref}\""),
        ),
        ("limit".to_string(), "100".to_string()),
    ];
    if let Some(page) = page {
        params.push(("page".to_string(), page.to_string()));
    }
    stripe_get(
        secret_key,
        &format!("/v1/payment_intents/search?{}", form_encode(&params)),
    )
}

/// Builds the `http.fetch` request to cancel a subscription at period end
/// (`POST /v1/subscriptions/{id}` with `cancel_at_period_end=true`).
pub fn build_cancel_subscription_fetch(
    secret_key: &str,
    subscription_id: &str,
    idempotency_key: &str,
) -> Value {
    let params = vec![("cancel_at_period_end".to_string(), "true".to_string())];
    let subscription_id = path_segment(subscription_id);
    stripe_post(
        secret_key,
        &format!("/v1/subscriptions/{subscription_id}"),
        idempotency_key,
        &params,
    )
}

/// Parses a `http.fetch` response body into a [`Subscription`].
pub fn parse_subscription(http_status: u16, body: &str) -> Result<Subscription, String> {
    let value: Value = serde_json::from_str(body)
        .map_err(|_| "stripe returned a non-JSON response".to_string())?;
    if let Some(error) = value.get("error") {
        let msg = error
            .get("message")
            .and_then(Value::as_str)
            .unwrap_or("stripe rejected the request");
        return Err(msg.to_string());
    }
    if !(200..300).contains(&http_status) {
        return Err(format!("stripe returned HTTP {http_status}"));
    }
    // Stripe's 2025-03 "Basil" versions moved `current_period_end` from the
    // subscription to its items; read the item fallback (latest-ending item)
    // before the typed parse consumes the value, so an unpinned or future
    // response shape still yields a period end instead of `None`.
    let items_period_end = subscription_items_period_end(&value);
    let price_id = subscription_price_id(&value)?;
    let raw: RawSubscription = serde_json::from_value(value)
        .map_err(|_| "stripe response missing subscription fields".to_string())?;
    if !valid_subscription_id(&raw.id)
        || !valid_customer_id(&raw.customer)
        || !matches!(
            raw.status.as_str(),
            "incomplete"
                | "incomplete_expired"
                | "trialing"
                | "active"
                | "past_due"
                | "canceled"
                | "unpaid"
                | "paused"
        )
        || raw.current_period_end.is_some_and(|value| value <= 0)
        || items_period_end.is_some_and(|value| value <= 0)
    {
        return Err("stripe response contains invalid subscription fields".to_string());
    }
    Ok(Subscription {
        id: raw.id,
        customer: raw.customer,
        status: raw.status,
        price_id,
        current_period_end: raw.current_period_end.or(items_period_end),
        cancel_at_period_end: raw.cancel_at_period_end,
    })
}

pub fn valid_subscription_id(value: &str) -> bool {
    value.starts_with("sub_")
        && value.len() <= 255
        && value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'_' | b'-'))
}

pub(crate) fn valid_customer_id(value: &str) -> bool {
    value.starts_with("cus_")
        && value.len() > 4
        && value.len() <= 255
        && value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || byte == b'_')
}

fn subscription_items_period_end(value: &Value) -> Option<i64> {
    value
        .get("items")?
        .get("data")?
        .as_array()?
        .iter()
        .filter_map(|item| item.get("current_period_end").and_then(Value::as_i64))
        .max()
}

pub(crate) fn subscription_price_id(value: &Value) -> Result<Option<String>, String> {
    let Some(items) = value.pointer("/items/data").and_then(Value::as_array) else {
        return Ok(None);
    };
    let mut prices = items.iter().filter_map(|item| {
        item.get("price").and_then(|price| {
            price
                .as_str()
                .or_else(|| price.get("id").and_then(Value::as_str))
        })
    });
    let Some(price) = prices.next() else {
        return Ok(None);
    };
    if !valid_price_id(price) || prices.any(|candidate| candidate != price) {
        return Err("stripe response contains invalid subscription price fields".to_string());
    }
    Ok(Some(price.to_string()))
}

fn valid_price_id(value: &str) -> bool {
    value.starts_with("price_")
        && value.len() <= 255
        && value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'_' | b'-'))
}

#[derive(Deserialize)]
struct RawSubscription {
    id: String,
    customer: String,
    status: String,
    #[serde(default)]
    current_period_end: Option<i64>,
    #[serde(default)]
    cancel_at_period_end: bool,
}

/// A Stripe refund as returned by `POST /v1/refunds`.
#[derive(Debug, Clone)]
pub struct StripeRefund {
    pub id: String,
    /// `succeeded` | `pending` | `failed` | `canceled` | `requires_action`.
    pub status: String,
    /// Refunded amount in the smallest currency unit (integer cents — never f64).
    pub amount: i64,
    pub currency: String,
    /// The charge the refund applied to, when Stripe returns it.
    pub charge: Option<String>,
    /// The PaymentIntent the refund applied to, when Stripe returns it.
    pub payment_intent: Option<String>,
    /// Durable Cedros operation identity copied from Stripe metadata.
    pub operation_ref: Option<String>,
}

/// Builds the `http.fetch` POST to create a Stripe refund against a PaymentIntent.
/// `amount_cents` omitted = full refund; `reason` is one of Stripe's enum values.
pub fn build_refund_fetch(
    secret_key: &str,
    payment_intent: &str,
    amount_cents: Option<i64>,
    reason: Option<&str>,
    idempotency_key: &str,
    operation_ref: &str,
) -> Value {
    let mut params = vec![("payment_intent".to_string(), payment_intent.to_string())];
    if let Some(amount) = amount_cents.filter(|a| *a > 0) {
        params.push(("amount".to_string(), amount.to_string()));
    }
    if let Some(reason) = reason.filter(|r| !r.is_empty()) {
        params.push(("reason".to_string(), reason.to_string()));
    }
    params.push((
        "metadata[cedros_pay_operation]".to_string(),
        operation_ref.to_string(),
    ));
    stripe_post(secret_key, "/v1/refunds", idempotency_key, &params)
}

/// Parses a `http.fetch` response body into a [`StripeRefund`].
pub fn parse_refund(http_status: u16, body: &str) -> Result<StripeRefund, String> {
    let value: Value = serde_json::from_str(body)
        .map_err(|_| "stripe returned a non-JSON response".to_string())?;
    if let Some(error) = value.get("error") {
        let msg = error
            .get("message")
            .and_then(Value::as_str)
            .unwrap_or("stripe rejected the refund");
        return Err(msg.to_string());
    }
    if !(200..300).contains(&http_status) {
        return Err(format!("stripe returned HTTP {http_status}"));
    }
    let id = value
        .get("id")
        .and_then(Value::as_str)
        .ok_or_else(|| "stripe refund response missing id".to_string())?;
    Ok(StripeRefund {
        id: id.to_string(),
        status: value
            .get("status")
            .and_then(Value::as_str)
            .unwrap_or("pending")
            .to_string(),
        amount: value.get("amount").and_then(Value::as_i64).unwrap_or(0),
        currency: value
            .get("currency")
            .and_then(Value::as_str)
            .unwrap_or("usd")
            .to_string(),
        charge: value
            .get("charge")
            .and_then(Value::as_str)
            .map(str::to_string),
        payment_intent: value
            .get("payment_intent")
            .and_then(Value::as_str)
            .map(str::to_string),
        operation_ref: value
            .get("metadata")
            .and_then(|metadata| metadata.get("cedros_pay_operation"))
            .and_then(Value::as_str)
            .map(str::to_string),
    })
}

/// Builds the `http.fetch` POST for a Stripe Customer Billing Portal session. The buyer
/// is redirected to Stripe's hosted page to manage (change/cancel/payment method/invoices)
/// their subscription and returned to `return_url`.
pub fn build_billing_portal_fetch(
    secret_key: &str,
    customer_id: &str,
    return_url: &str,
    idempotency_key: &str,
    configuration: Option<&str>,
) -> Value {
    let mut params = vec![
        ("customer".to_string(), customer_id.to_string()),
        ("return_url".to_string(), return_url.to_string()),
    ];
    if let Some(configuration) = configuration {
        params.push(("configuration".into(), configuration.into()));
    }
    stripe_post(
        secret_key,
        "/v1/billing_portal/sessions",
        idempotency_key,
        &params,
    )
}

/// Parses a billing-portal session response into its hosted `url`.
pub fn parse_portal_url(http_status: u16, body: &str) -> Result<String, String> {
    let value: Value = serde_json::from_str(body)
        .map_err(|_| "stripe returned a non-JSON response".to_string())?;
    if let Some(error) = value.get("error") {
        let msg = error
            .get("message")
            .and_then(Value::as_str)
            .unwrap_or("stripe rejected the portal request");
        return Err(msg.to_string());
    }
    if !(200..300).contains(&http_status) {
        return Err(format!("stripe returned HTTP {http_status}"));
    }
    let url = value
        .get("url")
        .and_then(Value::as_str)
        .ok_or_else(|| "stripe portal response missing url".to_string())?;
    if url.len() > 2_048
        || url.chars().any(char::is_control)
        || !url.starts_with("https://billing.stripe.com/")
    {
        return Err("stripe portal response contains an invalid url".to_string());
    }
    Ok(url.to_string())
}

/// Unwraps the `http.fetch` envelope `{status,body}` into `(http_status, body)`.
pub fn unwrap_fetch(raw: &str) -> Result<(u16, String), String> {
    let envelope: Value =
        serde_json::from_str(raw).map_err(|_| "malformed egress response".to_string())?;
    let status = envelope
        .get("status")
        .and_then(Value::as_u64)
        .filter(|status| (100..=599).contains(status))
        .ok_or_else(|| "malformed egress status".to_string())? as u16;
    let body = envelope
        .get("body")
        .and_then(Value::as_str)
        .ok_or_else(|| "malformed egress body".to_string())?
        .to_string();
    Ok((status, body))
}

/// Every Stripe call pins this API version so response shapes match this
/// module's parsers regardless of the operator account's default version.
/// 2024-06-20 predates the 2025-03 "Basil" release, which removed top-level
/// `current_period_end` from Subscription objects (see `parse_subscription`'s
/// items fallback for defense in depth). Bump only together with the parsers.
pub const STRIPE_API_VERSION: &str = "2024-06-20";

/// Builds a `http.fetch` GET to a Stripe endpoint.
pub(crate) fn stripe_get(secret_key: &str, path: &str) -> Value {
    json!({
        "method": "GET",
        "url": format!("{STRIPE_API_BASE}{path}"),
        "headers": [
            ["authorization", format!("Bearer {secret_key}")],
            ["stripe-version", STRIPE_API_VERSION],
        ],
    })
}

/// Builds a form-encoded `http.fetch` POST to a Stripe endpoint with an
/// idempotency key. Shared by PaymentIntent and Subscription calls.
pub(crate) fn stripe_post(
    secret_key: &str,
    path: &str,
    idempotency_key: &str,
    params: &[(String, String)],
) -> Value {
    json!({
        "method": "POST",
        "url": format!("{STRIPE_API_BASE}{path}"),
        "headers": [
            ["authorization", format!("Bearer {secret_key}")],
            ["content-type", "application/x-www-form-urlencoded"],
            ["idempotency-key", idempotency_key],
            ["stripe-version", STRIPE_API_VERSION],
        ],
        "body": form_encode(params),
    })
}

/// `application/x-www-form-urlencoded` encoding (RFC 3986 percent-encoding;
/// space as `%20`, which Stripe accepts).
pub(crate) fn form_encode(pairs: &[(String, String)]) -> String {
    let mut out = String::new();
    for (i, (k, v)) in pairs.iter().enumerate() {
        if i > 0 {
            out.push('&');
        }
        percent_encode_into(&mut out, k);
        out.push('=');
        percent_encode_into(&mut out, v);
    }
    out
}

fn percent_encode_into(out: &mut String, s: &str) {
    for &b in s.as_bytes() {
        match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                out.push(b as char)
            }
            _ => out.push_str(&format!("%{b:02X}")),
        }
    }
}

fn path_segment(value: &str) -> String {
    let mut out = String::with_capacity(value.len());
    percent_encode_into(&mut out, value);
    out
}

#[cfg(test)]
#[path = "api_tests.rs"]
mod tests;
