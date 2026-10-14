//! Typed PaymentIntent response parsing with retry-safe failure classification.

use serde::Deserialize;
use serde_json::Value;

/// Inputs for a PaymentIntent create.
pub struct PaymentIntentRequest {
    pub amount_cents: i64,
    pub currency: String,
    /// Stripe `Idempotency-Key` reused across indeterminate retries.
    pub idempotency_key: String,
    /// Extra `metadata[k]=v` form params.
    pub metadata: Vec<(String, String)>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PaymentIntent {
    pub id: String,
    pub status: String,
    pub client_secret: Option<String>,
    pub amount: Option<i64>,
    pub currency: Option<String>,
    pub operation_ref: Option<String>,
}

/// Only a well-formed 4xx proves Stripe rejected a create request. Network,
/// 5xx, and malformed responses may follow a committed provider-side mutation.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PaymentIntentFailure {
    Definitive(String),
    Indeterminate(String),
}

impl PaymentIntentFailure {
    pub fn message(&self) -> &str {
        match self {
            Self::Definitive(message) | Self::Indeterminate(message) => message,
        }
    }

    pub fn is_definitive(&self) -> bool {
        matches!(self, Self::Definitive(_))
    }
}

pub fn parse_payment_intent(
    http_status: u16,
    body: &str,
) -> Result<PaymentIntent, PaymentIntentFailure> {
    let value: Value = serde_json::from_str(body).map_err(|_| {
        PaymentIntentFailure::Indeterminate("stripe returned a non-JSON response".to_string())
    })?;
    if let Some(error) = value.get("error") {
        let message = error
            .get("message")
            .and_then(Value::as_str)
            .unwrap_or("stripe rejected the request");
        return Err(classify(http_status, message));
    }
    if !(200..300).contains(&http_status) {
        return Err(classify(
            http_status,
            &format!("stripe returned HTTP {http_status}"),
        ));
    }
    let raw: RawPaymentIntent = serde_json::from_value(value).map_err(|_| {
        PaymentIntentFailure::Indeterminate(
            "stripe response missing payment intent fields".to_string(),
        )
    })?;
    if !valid_payment_intent_id(&raw.id)
        || !matches!(
            raw.status.as_str(),
            "requires_payment_method"
                | "requires_confirmation"
                | "requires_action"
                | "processing"
                | "requires_capture"
                | "canceled"
                | "succeeded"
        )
        || raw.client_secret.as_deref().is_some_and(str::is_empty)
        || (matches!(
            raw.status.as_str(),
            "requires_payment_method" | "requires_confirmation" | "requires_action"
        ) && raw.client_secret.is_none())
    {
        return Err(PaymentIntentFailure::Indeterminate(
            "stripe response contains invalid payment intent fields".to_string(),
        ));
    }
    Ok(PaymentIntent {
        id: raw.id,
        status: raw.status,
        client_secret: raw.client_secret,
        amount: raw.amount,
        currency: raw.currency,
        operation_ref: raw
            .metadata
            .and_then(|metadata| metadata.cedros_pay_operation),
    })
}

fn valid_payment_intent_id(value: &str) -> bool {
    value.starts_with("pi_")
        && value.len() <= 255
        && value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'_' | b'-'))
}

fn classify(status: u16, message: &str) -> PaymentIntentFailure {
    if (400..500).contains(&status) {
        PaymentIntentFailure::Definitive(message.to_string())
    } else {
        PaymentIntentFailure::Indeterminate(message.to_string())
    }
}

#[derive(Deserialize)]
struct RawPaymentIntent {
    id: String,
    status: String,
    #[serde(default)]
    client_secret: Option<String>,
    #[serde(default)]
    amount: Option<i64>,
    #[serde(default)]
    currency: Option<String>,
    #[serde(default)]
    metadata: Option<PaymentIntentMetadata>,
}

#[derive(Deserialize)]
struct PaymentIntentMetadata {
    #[serde(default)]
    cedros_pay_operation: Option<String>,
}
