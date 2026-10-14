//! Stripe Checkout Session helpers over the `http.fetch` egress seam.

use serde_json::{json, Value};

use crate::ids::STRIPE_API_BASE;
use crate::stripe::{api::STRIPE_API_VERSION, CHECKOUT_METADATA_MARKER};

/// One-hour hosted-session window, safely within Stripe's 30-minute to
/// 24-hour explicit expiry bounds.
pub const SESSION_TTL_SECONDS: i64 = 60 * 60;

/// Bind every retry to the durable operation's initial clock, never retry time.
pub(crate) fn session_expiry(created_at: &str) -> crate::error::AppResult<i64> {
    crate::time::parse_iso(created_at)
        .and_then(|created| created.checked_add(SESSION_TTL_SECONDS))
        .ok_or_else(|| {
            crate::error::AppError::conflict(
                "checkout initiation time is invalid; reconcile the operation",
            )
        })
}

/// Inputs for a hosted Checkout Session create (the redirect card flow). The
/// `amount_cents`/`currency`/`product_name` are server-derived from the catalog.
pub struct CheckoutSessionRequest {
    pub amount_cents: i64,
    pub currency: String,
    pub product_name: String,
    pub success_url: String,
    pub cancel_url: String,
    pub customer_email: Option<String>,
    pub client_reference_id: Option<String>,
    pub idempotency_key: String,
    pub expires_at: i64,
    pub metadata: Vec<(String, String)>,
}

/// The parsed outcome of a Checkout Session create.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CheckoutSession {
    pub id: String,
    pub url: Option<String>,
}

pub fn build_checkout_session_fetch(secret_key: &str, req: &CheckoutSessionRequest) -> Value {
    let mut params: Vec<(String, String)> = vec![
        ("mode".to_string(), "payment".to_string()),
        ("payment_method_types[0]".to_string(), "card".to_string()),
        ("success_url".to_string(), req.success_url.clone()),
        ("cancel_url".to_string(), req.cancel_url.clone()),
        ("expires_at".to_string(), req.expires_at.to_string()),
        ("line_items[0][quantity]".to_string(), "1".to_string()),
        (
            "line_items[0][price_data][currency]".to_string(),
            req.currency.to_lowercase(),
        ),
        (
            "line_items[0][price_data][unit_amount]".to_string(),
            req.amount_cents.to_string(),
        ),
        (
            "line_items[0][price_data][product_data][name]".to_string(),
            req.product_name.clone(),
        ),
    ];
    if let Some(email) = &req.customer_email {
        params.push(("customer_email".to_string(), email.clone()));
    }
    if let Some(reference) = &req.client_reference_id {
        params.push(("client_reference_id".to_string(), reference.clone()));
    }
    for (k, v) in &req.metadata {
        params.push((format!("metadata[{k}]"), v.clone()));
        params.push((format!("payment_intent_data[metadata][{k}]"), v.clone()));
    }
    for prefix in ["metadata", "payment_intent_data[metadata]"] {
        params.push((
            format!("{prefix}[{CHECKOUT_METADATA_MARKER}]"),
            "true".to_string(),
        ));
    }
    stripe_post(
        secret_key,
        "/v1/checkout/sessions",
        &req.idempotency_key,
        &params,
    )
}

pub struct SubscriptionCheckoutRequest {
    pub amount_cents: i64,
    pub currency: String,
    pub product_name: String,
    pub interval: String,
    pub interval_count: i64,
    pub trial_period_days: Option<i64>,
    pub require_payment_method: bool,
    pub success_url: String,
    pub cancel_url: String,
    pub expires_at: i64,
    pub customer_email: Option<String>,
    pub idempotency_key: String,
    pub metadata: Vec<(String, String)>,
    pub promotion_code_id: Option<String>,
    pub coupon_id: Option<String>,
}

pub struct PriceSubscriptionCheckoutRequest {
    pub price_id: String,
    pub trial_period_days: Option<i64>,
    pub require_payment_method: bool,
    pub success_url: String,
    pub cancel_url: String,
    pub expires_at: i64,
    pub customer_email: Option<String>,
    pub idempotency_key: String,
    pub metadata: Vec<(String, String)>,
    pub promotion_code_id: Option<String>,
    pub coupon_id: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct StripeCoupon {
    pub id: String,
    pub percent_off: u16,
    pub duration: String,
    pub duration_in_months: Option<u32>,
    pub valid: bool,
}

pub fn build_subscription_checkout_fetch(
    secret_key: &str,
    req: &SubscriptionCheckoutRequest,
) -> Value {
    let mut params: Vec<(String, String)> = vec![
        ("mode".to_string(), "subscription".to_string()),
        (
            "payment_method_collection".to_string(),
            if req.require_payment_method {
                "always"
            } else {
                "if_required"
            }
            .to_string(),
        ),
        ("success_url".to_string(), req.success_url.clone()),
        ("cancel_url".to_string(), req.cancel_url.clone()),
        ("expires_at".to_string(), req.expires_at.to_string()),
        ("line_items[0][quantity]".to_string(), "1".to_string()),
        (
            "line_items[0][price_data][currency]".to_string(),
            req.currency.to_lowercase(),
        ),
        (
            "line_items[0][price_data][unit_amount]".to_string(),
            req.amount_cents.to_string(),
        ),
        (
            "line_items[0][price_data][recurring][interval]".to_string(),
            req.interval.clone(),
        ),
        (
            "line_items[0][price_data][recurring][interval_count]".to_string(),
            req.interval_count.to_string(),
        ),
        (
            "line_items[0][price_data][product_data][name]".to_string(),
            req.product_name.clone(),
        ),
    ];
    if let Some(days) = req.trial_period_days.filter(|d| *d > 0) {
        params.push((
            "subscription_data[trial_period_days]".to_string(),
            days.to_string(),
        ));
    }
    if let Some(email) = &req.customer_email {
        params.push(("customer_email".to_string(), email.clone()));
    }
    for (k, v) in &req.metadata {
        params.push((format!("metadata[{k}]"), v.clone()));
        params.push((format!("subscription_data[metadata][{k}]"), v.clone()));
    }
    if let Some(coupon_id) = &req.coupon_id {
        params.push(("discounts[0][coupon]".to_string(), coupon_id.clone()));
    } else if let Some(promotion_code_id) = &req.promotion_code_id {
        params.push((
            "discounts[0][promotion_code]".to_string(),
            promotion_code_id.clone(),
        ));
    }
    stripe_post(
        secret_key,
        "/v1/checkout/sessions",
        &req.idempotency_key,
        &params,
    )
}

pub fn build_price_subscription_checkout_fetch(
    secret_key: &str,
    req: &PriceSubscriptionCheckoutRequest,
) -> Value {
    let mut params: Vec<(String, String)> = vec![
        ("mode".to_string(), "subscription".to_string()),
        (
            "payment_method_collection".to_string(),
            if req.require_payment_method {
                "always"
            } else {
                "if_required"
            }
            .to_string(),
        ),
        ("success_url".to_string(), req.success_url.clone()),
        ("cancel_url".to_string(), req.cancel_url.clone()),
        ("expires_at".to_string(), req.expires_at.to_string()),
        ("line_items[0][price]".to_string(), req.price_id.clone()),
        ("line_items[0][quantity]".to_string(), "1".to_string()),
    ];
    if let Some(email) = &req.customer_email {
        params.push(("customer_email".to_string(), email.clone()));
    }
    for (k, v) in &req.metadata {
        params.push((format!("metadata[{k}]"), v.clone()));
        params.push((format!("subscription_data[metadata][{k}]"), v.clone()));
    }
    if let Some(days) = req.trial_period_days.filter(|days| *days > 0) {
        params.push((
            "subscription_data[trial_period_days]".to_string(),
            days.to_string(),
        ));
    }
    if let Some(coupon_id) = &req.coupon_id {
        params.push(("discounts[0][coupon]".to_string(), coupon_id.clone()));
    } else if let Some(promotion_code_id) = &req.promotion_code_id {
        params.push((
            "discounts[0][promotion_code]".to_string(),
            promotion_code_id.clone(),
        ));
    }
    stripe_post(
        secret_key,
        "/v1/checkout/sessions",
        &req.idempotency_key,
        &params,
    )
}

pub fn build_coupon_retrieve_fetch(secret_key: &str, coupon_id: &str) -> Value {
    json!({
        "method": "GET",
        "url": format!("{STRIPE_API_BASE}/v1/coupons/{coupon_id}"),
        "headers": [
            ["authorization", format!("Bearer {secret_key}")],
            ["stripe-version", STRIPE_API_VERSION],
        ],
    })
}

pub fn build_invite_coupon_create_fetch(
    secret_key: &str,
    coupon_id: &str,
    percent_off: u16,
    duration_months: Option<u32>,
    name: &str,
) -> Value {
    let mut params = vec![
        ("id".to_string(), coupon_id.to_string()),
        ("percent_off".to_string(), percent_off.to_string()),
        (
            "duration".to_string(),
            if duration_months.is_some() {
                "repeating"
            } else {
                "forever"
            }
            .to_string(),
        ),
        ("name".to_string(), name.to_string()),
        ("metadata[cedros_source]".to_string(), "invite".to_string()),
    ];
    if let Some(months) = duration_months {
        params.push(("duration_in_months".to_string(), months.to_string()));
    }
    stripe_post(
        secret_key,
        "/v1/coupons",
        &format!("invite-coupon:{coupon_id}"),
        &params,
    )
}

pub fn parse_coupon(http_status: u16, body: &str) -> Result<Option<StripeCoupon>, String> {
    if http_status == 404 {
        return Ok(None);
    }
    let value: Value = serde_json::from_str(body)
        .map_err(|_| "stripe returned a non-JSON coupon response".to_string())?;
    if let Some(error) = value.get("error") {
        return Err(error
            .get("message")
            .and_then(Value::as_str)
            .unwrap_or("stripe rejected the coupon request")
            .to_string());
    }
    if !(200..300).contains(&http_status) {
        return Err(format!("stripe returned HTTP {http_status}"));
    }
    let percent = value
        .get("percent_off")
        .and_then(Value::as_f64)
        .filter(|percent| percent.fract() == 0.0 && (1.0..=100.0).contains(percent))
        .map(|percent| percent as u16)
        .ok_or_else(|| "stripe coupon has invalid percent_off".to_string())?;
    Ok(Some(StripeCoupon {
        id: value
            .get("id")
            .and_then(Value::as_str)
            .ok_or_else(|| "stripe coupon response missing id".to_string())?
            .to_string(),
        percent_off: percent,
        duration_in_months: match value.get("duration_in_months") {
            None | Some(Value::Null) => None,
            Some(months) => Some(
                months
                    .as_u64()
                    .and_then(|value| u32::try_from(value).ok())
                    .filter(|value| *value > 0)
                    .ok_or_else(|| "stripe coupon has invalid duration_in_months".to_string())?,
            ),
        },
        duration: value
            .get("duration")
            .and_then(Value::as_str)
            .ok_or_else(|| "stripe coupon response missing duration".to_string())?
            .to_string(),
        valid: value
            .get("valid")
            .and_then(Value::as_bool)
            .ok_or_else(|| "stripe coupon response missing valid state".to_string())?,
    }))
}

pub fn build_promotion_code_lookup_fetch(secret_key: &str, code: &str) -> Value {
    stripe_get_with_params(
        secret_key,
        "/v1/promotion_codes",
        &[
            ("code".to_string(), code.to_string()),
            ("active".to_string(), "true".to_string()),
            ("limit".to_string(), "1".to_string()),
        ],
    )
}

pub fn parse_promotion_code_id(http_status: u16, body: &str) -> Result<Option<String>, String> {
    let value: Value = serde_json::from_str(body)
        .map_err(|_| "stripe returned a non-JSON response".to_string())?;
    if let Some(error) = value.get("error") {
        let msg = error
            .get("message")
            .and_then(Value::as_str)
            .unwrap_or("stripe rejected the promotion code lookup");
        return Err(msg.to_string());
    }
    if !(200..300).contains(&http_status) {
        return Err(format!("stripe returned HTTP {http_status}"));
    }
    Ok(value
        .get("data")
        .and_then(Value::as_array)
        .and_then(|items| items.first())
        .and_then(|item| item.get("id"))
        .and_then(Value::as_str)
        .map(str::to_string))
}

pub fn parse_checkout_session(http_status: u16, body: &str) -> Result<CheckoutSession, String> {
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
    let id = value
        .get("id")
        .and_then(Value::as_str)
        .ok_or_else(|| "stripe response missing session id".to_string())?;
    validate_session_id(id)?;
    let url = value.get("url").and_then(Value::as_str).map(str::to_string);
    if url
        .as_deref()
        .is_some_and(|url| !validate_checkout_url(url))
    {
        return Err("stripe response contains an invalid checkout URL".to_string());
    }
    Ok(CheckoutSession {
        id: id.to_string(),
        url,
    })
}

pub fn validate_session_id(value: &str) -> Result<(), String> {
    let valid = value.starts_with("cs_")
        && value.len() <= 255
        && value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'_' | b'-'));
    valid
        .then_some(())
        .ok_or_else(|| "invalid Stripe Checkout Session identifier".to_string())
}

pub fn validate_checkout_url(value: &str) -> bool {
    value.len() <= 2_048
        && !value.chars().any(char::is_control)
        && value.starts_with("https://checkout.stripe.com/")
}

fn stripe_get_with_params(secret_key: &str, path: &str, params: &[(String, String)]) -> Value {
    json!({
        "method": "GET",
        "url": format!("{STRIPE_API_BASE}{path}?{}", form_encode(params)),
        "headers": [
            ["authorization", format!("Bearer {secret_key}")],
            ["stripe-version", STRIPE_API_VERSION],
        ],
    })
}

fn stripe_post(
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

fn form_encode(pairs: &[(String, String)]) -> String {
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
