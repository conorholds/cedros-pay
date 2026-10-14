use super::*;

pub(super) fn validate_coupon(code: &str) -> AppResult<()> {
    let code = code.trim();
    if code.is_empty()
        || code.len() > 64
        || !code
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || matches!(b, b'_' | b'-'))
    {
        Err(AppError::unprocessable("couponCode is invalid"))
    } else {
        Ok(())
    }
}

pub(super) fn stable_free_subscription_id(user_id: &str, plan_id: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(user_id.as_bytes());
    hasher.update([0]);
    hasher.update(plan_id.as_bytes());
    let digest = hasher.finalize();
    format!("sub_free_{}", hex::encode(&digest[..16]))
}

pub(super) fn plan_matches(row: &Value, plan_id: &str) -> bool {
    first_string(row, &["planId", "productId", "priceId"]).as_deref() == Some(plan_id)
}

pub(super) fn provider_payment(row: &Value) -> String {
    match string_field(row, "provider").as_deref() {
        Some("stripe") => "stripe".to_string(),
        Some("credits") => "credits".to_string(),
        Some("free") => "free".to_string(),
        _ => "unknown".to_string(),
    }
}

pub(super) fn malformed_settings(message: String) -> AppError {
    AppError::internal("stored subscription settings are malformed").with_internal(message)
}

pub(super) fn plan_not_found() -> AppError {
    AppError::not_found("subscription plan not found")
}

pub(super) fn bool_field(value: &Value, key: &str) -> Option<bool> {
    value.get(key).and_then(Value::as_bool)
}

pub(super) fn int_field(value: &Value, key: &str) -> Option<i64> {
    value.get(key).and_then(Value::as_i64)
}

pub(super) fn string_field(value: &Value, key: &str) -> Option<String> {
    value.get(key).and_then(Value::as_str).map(str::to_string)
}

pub(super) fn first_string(value: &Value, keys: &[&str]) -> Option<String> {
    keys.iter().find_map(|key| string_field(value, key))
}

pub(super) fn usd_to_cents(amount: f64) -> i64 {
    (amount * 100.0).round().max(0.0) as i64
}
