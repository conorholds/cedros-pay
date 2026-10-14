//! Pay-owned payment-method availability snapshot for Cedros Shop checkout.
//!
//! The Wasm `settings` seam is scoped to this extension. Pay therefore writes a
//! Pay-local snapshot and the host mirrors that exact payload into Shop's
//! `cedros-shop:pay.payment-availability` bridge key before enabling Shop
//! checkout.

use std::collections::BTreeMap;

use serde_json::{json, Value};

use crate::blockchain_config;
use crate::error::AppResult;
use crate::ids;
use crate::seams::HostSeams;

const STRIPE_ENABLED: &str = "stripe.enabled";
const STRIPE_PUBLISHABLE_KEY: &str = "stripe.publishable_key";
const X402_ENABLED: &str = "x402.enabled";
const X402_PAYMENT_ADDRESS: &str = "x402.payment_address";
const X402_TOKEN_MINT: &str = "x402.token_mint";
const X402_NETWORK: &str = "x402.network";
const CEDROS_LOGIN_ENABLED: &str = "cedros_login.enabled";
const CEDROS_LOGIN_CREDITS_ENABLED: &str = "cedros_login.credits_enabled";

/// Returns true when an admin config category can affect buyer checkout payment
/// availability for Cedros Shop.
pub fn category_affects_shop_availability(category: &str) -> bool {
    matches!(category, "stripe" | "x402" | "cedros_login" | "shop")
}

/// Build the host-mirrored bridge payload from Pay-owned settings and secrets.
///
/// Output shape matches Shop's `cedros-shop:pay.payment-availability` contract:
/// `paymentMethods.stripe`, `paymentMethods.x402`, `paymentMethods.credits`,
/// and explicit local `paymentMethods.methods`. Each rail fails closed unless
/// the minimum Pay execution configuration for that rail is present.
pub fn bridge_payload<S: HostSeams>(seams: &S) -> AppResult<Value> {
    bridge_payload_with_overrides(seams, &BTreeMap::new())
}

/// Builds the bridge payload against a proposed atomic configuration change.
/// Overrides use full storage keys and may include secret values only in memory.
pub fn bridge_payload_with_overrides<S: HostSeams>(
    seams: &S,
    overrides: &BTreeMap<String, Value>,
) -> AppResult<Value> {
    if crate::guarded_policy::require_active(seams).is_err() {
        seams.log(
            "warn",
            "payment availability disabled: guarded database marker unavailable",
        );
        return Ok(unavailable_payload());
    }
    let regional_policy = match overrides.get(crate::regional_payment_policy::SETTING_KEY) {
        Some(value) => crate::regional_payment_policy::RegionalPaymentPolicy::from_value(value)?,
        None => crate::regional_payment_policy::RegionalPaymentPolicy::load(seams)?,
    };
    Ok(json!({
        "paymentMethods": {
            "stripe": { "available": stripe_available(seams, overrides)? },
            "x402": { "available": x402_available(seams, overrides)? },
            "credits": { "available": credits_available(seams, overrides)? },
            "methods": {},
            "regionalPolicy": regional_policy.as_bridge_value()?
        }
    }))
}

fn unavailable_payload() -> Value {
    json!({
        "paymentMethods": {
            "stripe": { "available": false },
            "x402": { "available": false },
            "credits": { "available": false },
            "methods": {},
            "regionalPolicy": crate::regional_payment_policy::RegionalPaymentPolicy::default()
        }
    })
}

fn stripe_available<S: HostSeams>(
    seams: &S,
    overrides: &BTreeMap<String, Value>,
) -> AppResult<bool> {
    Ok(read_bool(seams, overrides, STRIPE_ENABLED)?
        && setting_present(seams, overrides, STRIPE_PUBLISHABLE_KEY)?
        && secret_present(seams, overrides, ids::SECRET_STRIPE_KEY)?)
}

fn x402_available<S: HostSeams>(seams: &S, overrides: &BTreeMap<String, Value>) -> AppResult<bool> {
    if !read_bool(seams, overrides, X402_ENABLED)?
        || !setting_present(seams, overrides, X402_TOKEN_MINT)?
    {
        return Ok(false);
    }
    let legacy_pay_to = setting_string(seams, overrides, X402_PAYMENT_ADDRESS)?;
    let legacy_network =
        setting_string(seams, overrides, X402_NETWORK)?.unwrap_or_else(|| "solana".to_string());
    Ok(
        blockchain_config::resolve_x402_control(seams, legacy_pay_to, legacy_network)
            .is_ok_and(|control| !control.rpc_url.is_empty()),
    )
}

fn credits_available<S: HostSeams>(
    seams: &S,
    overrides: &BTreeMap<String, Value>,
) -> AppResult<bool> {
    Ok(read_bool(seams, overrides, CEDROS_LOGIN_ENABLED)?
        && read_bool(seams, overrides, CEDROS_LOGIN_CREDITS_ENABLED)?)
}

fn read_bool<S: HostSeams>(
    seams: &S,
    overrides: &BTreeMap<String, Value>,
    key: &str,
) -> AppResult<bool> {
    if let Some(value) = overrides.get(key) {
        return Ok(value.as_bool().unwrap_or(false));
    }
    let Some(raw) = seams.setting_get(key)? else {
        return Ok(false);
    };
    Ok(parse_stored_value(&raw).as_bool().unwrap_or(false))
}

fn setting_present<S: HostSeams>(
    seams: &S,
    overrides: &BTreeMap<String, Value>,
    key: &str,
) -> AppResult<bool> {
    if let Some(value) = overrides.get(key) {
        return Ok(value_present(value));
    }
    let Some(raw) = seams.setting_get(key)? else {
        return Ok(false);
    };
    Ok(stored_string(&raw).is_some_and(|value| !value.trim().is_empty()))
}

fn setting_string<S: HostSeams>(
    seams: &S,
    overrides: &BTreeMap<String, Value>,
    key: &str,
) -> AppResult<Option<String>> {
    if let Some(value) = overrides.get(key) {
        return Ok(value
            .as_str()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(str::to_string));
    }
    Ok(seams.setting_get(key)?.and_then(|raw| {
        stored_string(&raw)
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
    }))
}

fn secret_present<S: HostSeams>(
    seams: &S,
    overrides: &BTreeMap<String, Value>,
    key: &str,
) -> AppResult<bool> {
    if let Some(value) = overrides.get(key) {
        return Ok(value_present(value));
    }
    let Some(raw) = seams.secret_get(key)? else {
        return Ok(false);
    };
    Ok(stored_string(&raw).is_some_and(|value| !value.trim().is_empty()))
}

fn value_present(value: &Value) -> bool {
    !value.is_null() && value.as_str().is_none_or(|text| !text.trim().is_empty())
}

fn stored_string(raw: &str) -> Option<String> {
    parse_stored_value(raw).as_str().map(str::to_string)
}

fn parse_stored_value(raw: &str) -> Value {
    serde_json::from_str(raw).unwrap_or_else(|_| Value::String(raw.to_string()))
}

#[cfg(test)]
#[path = "payment_availability_tests.rs"]
mod tests;
