//! Typed Stripe Checkout create classification and retrieval for checkout.

use std::collections::BTreeMap;

use serde_json::{json, Value};

use crate::ids::STRIPE_API_BASE;

use super::checkout_api::{parse_checkout_session, CheckoutSession};

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CreateClassification {
    Resolved(CheckoutSession),
    Terminal { code: String, proof: String },
    Indeterminate,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RetrievedSession {
    pub id: String,
    pub url: Option<String>,
    pub status: SessionStatus,
    pub expires_at: i64,
    pub amount_total: i64,
    pub currency: String,
    pub payment_status: Option<String>,
    pub payment_intent: Option<String>,
    pub metadata: BTreeMap<String, String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SessionStatus {
    Open,
    Complete,
    Expired,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum RetrieveClassification {
    Found(RetrievedSession),
    Missing,
    Indeterminate,
}

pub fn classify_create(status: u16, body: &str) -> CreateClassification {
    if (200..300).contains(&status) {
        return parse_checkout_session(status, body)
            .map(CreateClassification::Resolved)
            .unwrap_or(CreateClassification::Indeterminate);
    }
    let Ok(value) = serde_json::from_str::<Value>(body) else {
        return CreateClassification::Indeterminate;
    };
    let Some(error) = value.get("error") else {
        return CreateClassification::Indeterminate;
    };
    let error_type = error.get("type").and_then(Value::as_str).unwrap_or("");
    let param = error.get("param").and_then(Value::as_str).unwrap_or("");
    let proven_absent = match (status, error_type) {
        (400, "invalid_request_error") => !param.is_empty(),
        (401, "authentication_error") | (403, "permission_error") => true,
        _ => false,
    };
    if !proven_absent {
        return CreateClassification::Indeterminate;
    }
    let provider_code = safe_code(error.get("code").and_then(Value::as_str), error_type);
    CreateClassification::Terminal {
        code: "provider-request-rejected".into(),
        proof: format!("stripe-no-session:{provider_code}"),
    }
}

pub fn build_retrieve(secret_key: &str, session_id: &str) -> Result<Value, String> {
    validate_session_id(session_id)?;
    Ok(json!({
        "method": "GET",
        "url": format!("{STRIPE_API_BASE}/v1/checkout/sessions/{session_id}"),
        "headers": [
            ["authorization", format!("Bearer {secret_key}")],
            ["stripe-version", crate::stripe::api::STRIPE_API_VERSION],
        ],
    }))
}

pub fn classify_retrieve(status: u16, body: &str) -> RetrieveClassification {
    let Ok(value) = serde_json::from_str::<Value>(body) else {
        return RetrieveClassification::Indeterminate;
    };
    if status == 404 && value.get("error").is_some() {
        return RetrieveClassification::Missing;
    }
    if !(200..300).contains(&status) || value.get("error").is_some() {
        return RetrieveClassification::Indeterminate;
    }
    let Some(id) = value.get("id").and_then(Value::as_str) else {
        return RetrieveClassification::Indeterminate;
    };
    if validate_session_id(id).is_err() {
        return RetrieveClassification::Indeterminate;
    }
    let status = match value.get("status").and_then(Value::as_str) {
        Some("open") => SessionStatus::Open,
        Some("complete") => SessionStatus::Complete,
        Some("expired") => SessionStatus::Expired,
        _ => return RetrieveClassification::Indeterminate,
    };
    let Some(expires_at) = value
        .get("expires_at")
        .and_then(Value::as_i64)
        .filter(|expires_at| *expires_at > 0)
    else {
        return RetrieveClassification::Indeterminate;
    };
    let Some(amount_total) = value
        .get("amount_total")
        .and_then(Value::as_i64)
        .filter(|amount| *amount > 0)
    else {
        return RetrieveClassification::Indeterminate;
    };
    let Some(currency) = value
        .get("currency")
        .and_then(Value::as_str)
        .filter(|value| value.len() == 3 && value.bytes().all(|byte| byte.is_ascii_alphabetic()))
    else {
        return RetrieveClassification::Indeterminate;
    };
    if value.get("mode").and_then(Value::as_str) != Some("payment") {
        return RetrieveClassification::Indeterminate;
    }
    let metadata = value
        .get("metadata")
        .and_then(Value::as_object)
        .map(|values| {
            values
                .iter()
                .filter_map(|(key, value)| value.as_str().map(|value| (key.clone(), value.into())))
                .collect()
        })
        .unwrap_or_default();
    RetrieveClassification::Found(RetrievedSession {
        id: id.into(),
        url: value.get("url").and_then(Value::as_str).map(str::to_string),
        status,
        expires_at,
        amount_total,
        currency: currency.to_ascii_uppercase(),
        payment_status: value
            .get("payment_status")
            .and_then(Value::as_str)
            .map(str::to_string),
        payment_intent: value
            .get("payment_intent")
            .and_then(Value::as_str)
            .map(str::to_string),
        metadata,
    })
}

pub fn validate_session_id(value: &str) -> Result<(), String> {
    super::checkout_api::validate_session_id(value)
}

pub fn validate_checkout_url(value: &str) -> bool {
    validate_checkout_url_with_policy(value, false)
}

pub fn validate_checkout_url_with_policy(value: &str, allow_loopback: bool) -> bool {
    let loopback = allow_loopback
        && (value.starts_with("http://127.0.0.1:") || value.starts_with("http://localhost:"));
    super::checkout_api::validate_checkout_url(value)
        || (value.len() <= 2_048 && !value.chars().any(char::is_control) && loopback)
}

fn safe_code(code: Option<&str>, fallback: &str) -> String {
    code.filter(|code| {
        !code.is_empty()
            && code.len() <= 64
            && code
                .bytes()
                .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'_' | b'-'))
    })
    .unwrap_or(fallback)
    .to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_proven_pre_creation_failures_are_terminal() {
        let terminal = classify_create(
            400,
            r#"{"error":{"type":"invalid_request_error","code":"parameter_missing","param":"success_url"}}"#,
        );
        assert!(matches!(terminal, CreateClassification::Terminal { .. }));
        assert_eq!(
            classify_create(500, r#"{"error":{"type":"api_error"}}"#),
            CreateClassification::Indeterminate
        );
        assert_eq!(
            classify_create(400, "not-json"),
            CreateClassification::Indeterminate
        );
    }

    #[test]
    fn checkout_urls_are_production_allowlisted_with_explicit_loopback_opt_in() {
        assert!(validate_checkout_url(
            "https://checkout.stripe.com/c/pay/cs_test"
        ));
        assert!(!validate_checkout_url("https://stripe.example/session"));
        assert!(!validate_checkout_url("http://127.0.0.1:4242/session"));
        assert!(validate_checkout_url_with_policy(
            "http://127.0.0.1:4242/session",
            true
        ));
    }

    #[test]
    fn create_rejects_provider_supplied_ids_and_redirect_hosts() {
        assert_eq!(
            classify_create(
                200,
                r#"{"id":"attacker-key","url":"https://checkout.stripe.com/pay"}"#,
            ),
            CreateClassification::Indeterminate
        );
        assert_eq!(
            classify_create(
                200,
                r#"{"id":"cs_valid","url":"https://attacker.example/phish"}"#,
            ),
            CreateClassification::Indeterminate
        );
    }

    #[test]
    fn retrieval_requires_exact_status_and_positive_expiry() {
        let valid = r#"{"id":"cs_exact","mode":"payment","status":"expired","expires_at":1800,"amount_total":500,"currency":"usd","payment_status":"unpaid","metadata":{}}"#;
        assert!(matches!(
            classify_retrieve(200, valid),
            RetrieveClassification::Found(RetrievedSession {
                status: SessionStatus::Expired,
                expires_at: 1800,
                ..
            })
        ));
        for malformed in [
            r#"{"id":"cs_exact","expires_at":1800}"#,
            r#"{"id":"cs_exact","status":"closed","expires_at":1800}"#,
            r#"{"id":"cs_exact","status":"open"}"#,
            r#"{"id":"cs_exact","status":"open","expires_at":0}"#,
        ] {
            assert_eq!(
                classify_retrieve(200, malformed),
                RetrieveClassification::Indeterminate
            );
        }
    }

    #[test]
    fn checkout_retrieval_pins_the_supported_api_version() {
        let request = build_retrieve("sk_test", "cs_exact").unwrap();
        assert!(request["headers"].as_array().unwrap().iter().any(|header| {
            header[0] == "stripe-version" && header[1] == crate::stripe::api::STRIPE_API_VERSION
        }));
    }
}
