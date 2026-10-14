use serde_json::Value;

pub(super) fn string_field(value: &Value, key: &str) -> Option<String> {
    value
        .get(key)
        .and_then(Value::as_str)
        .filter(|v| !v.trim().is_empty())
        .map(|v| v.trim().to_string())
}

pub(super) fn optional_i64(value: &Value, key: &str) -> Option<i64> {
    value.get(key).and_then(Value::as_i64)
}

pub(super) fn positive_i64(value: &Value, key: &str) -> Option<i64> {
    optional_i64(value, key).filter(|v| *v > 0)
}

pub(super) fn truthy(value: &Value, key: &str) -> bool {
    value.get(key).and_then(Value::as_bool).unwrap_or(false)
}

pub(super) fn non_empty_array(value: &Value, key: &str) -> bool {
    value
        .get(key)
        .and_then(Value::as_array)
        .is_some_and(|items| !items.is_empty())
}

pub(super) fn integer_field(value: &Value, keys: &[&str]) -> Option<u64> {
    keys.iter().find_map(|key| value.get(*key)?.as_u64())
}

pub(super) fn decimal_field_scaled(value: &Value, keys: &[&str], scale: u64) -> Option<u64> {
    keys.iter()
        .filter_map(|key| value.get(*key))
        .find_map(|v| scaled_decimal(v, scale))
}

fn scaled_decimal(value: &Value, scale: u64) -> Option<u64> {
    match value {
        Value::Number(n) => parse_scaled_decimal(&n.to_string(), scale),
        Value::String(s) => parse_scaled_decimal(s, scale),
        _ => None,
    }
}

fn parse_scaled_decimal(raw: &str, scale: u64) -> Option<u64> {
    let raw = raw.trim();
    if raw.is_empty() || raw.starts_with('-') {
        return None;
    }
    let digits = scale.ilog10() as usize;
    let (whole, fraction) = raw.split_once('.').unwrap_or((raw, ""));
    if whole.is_empty() || !whole.bytes().all(|b| b.is_ascii_digit()) {
        return None;
    }
    if fraction.len() > digits || !fraction.bytes().all(|b| b.is_ascii_digit()) {
        return None;
    }
    let mut frac = fraction.to_string();
    while frac.len() < digits {
        frac.push('0');
    }
    let whole_scaled = whole.parse::<u64>().ok()?.checked_mul(scale)?;
    let frac_scaled = if frac.is_empty() {
        0
    } else {
        frac.parse::<u64>().ok()?
    };
    whole_scaled.checked_add(frac_scaled)
}
