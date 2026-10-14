//! Exact guarded-policy checks for payment-rail configuration activation.

use serde_json::{Map, Value};

use super::CategorySpec;
use crate::error::{AppError, AppResult};
use crate::seams::HostSeams;

pub(super) fn require_for_enable<S: HostSeams>(
    seams: &S,
    spec: CategorySpec,
    config: &Map<String, Value>,
) -> AppResult<()> {
    if !enables_guarded_rail(spec, config) {
        return Ok(());
    }
    crate::guarded_policy::require_active(seams)
        .map(drop)
        .map_err(|error| unavailable(spec, error))
}

pub(super) fn validation_error<S: HostSeams>(
    seams: &S,
    spec: CategorySpec,
    config: &Map<String, Value>,
) -> Option<String> {
    (enables_guarded_rail(spec, config) && crate::guarded_policy::require_active(seams).is_err())
        .then(|| requirement(spec))
}

fn enables_guarded_rail(spec: CategorySpec, config: &Map<String, Value>) -> bool {
    let enabled = |key: &str| config.get(key).and_then(Value::as_bool) == Some(true);
    match spec.category {
        "stripe" | "x402" | "subscriptions" => enabled("enabled"),
        "cedros_login" => enabled("credits_enabled"),
        "native_store" => {
            enabled("enabled") || enabled("apple_enabled") || enabled("google_enabled")
        }
        _ => false,
    }
}

fn unavailable(spec: CategorySpec, cause: AppError) -> AppError {
    AppError::new(503, "unavailable", requirement(spec)).with_internal(format!(
        "guarded database marker rejected: {}",
        cause.internal.as_deref().unwrap_or(cause.message.as_str())
    ))
}

fn requirement(spec: CategorySpec) -> String {
    format!(
        "{} payments require host conditional database mutations",
        spec.label
    )
}
