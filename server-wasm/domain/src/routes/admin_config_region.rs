use serde_json::{Map, Value};

use crate::error::AppResult;
use crate::regional_payment_policy::RegionalPaymentPolicy;

pub(super) fn validation_error(category: &str, config: &Map<String, Value>) -> Option<String> {
    if category != "shop" {
        return None;
    }
    config
        .get("regional_payment_policy")
        .and_then(|value| RegionalPaymentPolicy::from_value(value).err())
        .map(|error| error.message)
}

pub(super) fn normalize_value(
    category: &str,
    key: &str,
    value: &Value,
) -> AppResult<Option<Value>> {
    if category != "shop" || key != "regional_payment_policy" {
        return Ok(None);
    }
    RegionalPaymentPolicy::from_value(value)
        .and_then(|policy| policy.as_bridge_value())
        .map(Some)
}
