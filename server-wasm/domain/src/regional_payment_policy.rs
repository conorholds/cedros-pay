//! Tenant-scoped regional payment-rail policy.
//!
//! Country is supplied only by trusted host context. Buyer request bodies and
//! shipping addresses are intentionally not accepted as regional authority.

use std::collections::BTreeSet;

use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::{Digest, Sha256};

use crate::checkout_contract::PaymentMethod;
use crate::error::{AppError, AppResult};
use crate::seams::HostSeams;

pub const SETTING_KEY: &str = "shop.regional_payment_policy";
const ALL_METHODS: [RegionalPaymentMethod; 3] = [
    RegionalPaymentMethod::Stripe,
    RegionalPaymentMethod::X402,
    RegionalPaymentMethod::Credits,
];

#[derive(Clone, Copy, Debug, Deserialize, Eq, Ord, PartialEq, PartialOrd, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum RegionalPaymentMethod {
    Stripe,
    X402,
    Credits,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RegionalPaymentRule {
    pub id: String,
    pub label: String,
    pub countries: Vec<String>,
    pub methods: Vec<RegionalPaymentMethod>,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RegionalPaymentPolicy {
    pub schema_version: u8,
    pub enabled: bool,
    pub fallback_methods: Vec<RegionalPaymentMethod>,
    pub rules: Vec<RegionalPaymentRule>,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RegionalPolicyBinding {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub market_country: Option<String>,
    pub policy_fingerprint: String,
    pub allowed_methods: Vec<RegionalPaymentMethod>,
}

impl Default for RegionalPaymentPolicy {
    fn default() -> Self {
        Self {
            schema_version: 1,
            enabled: false,
            fallback_methods: ALL_METHODS.to_vec(),
            rules: Vec::new(),
        }
    }
}

impl RegionalPaymentPolicy {
    pub fn load<S: HostSeams>(seams: &S) -> AppResult<Self> {
        let Some(raw) = seams.setting_get(SETTING_KEY)? else {
            return Ok(Self::default());
        };
        let value = serde_json::from_str(&raw)
            .map_err(|_| AppError::internal("stored regional payment policy is invalid"))?;
        Self::from_value(&value).map_err(|error| {
            AppError::internal("stored regional payment policy is invalid")
                .with_internal(error.message)
        })
    }

    pub fn from_value(value: &Value) -> AppResult<Self> {
        let mut policy: Self = serde_json::from_value(value.clone())
            .map_err(|_| AppError::bad_request("regional_payment_policy has an invalid shape"))?;
        policy.normalize_and_validate()?;
        Ok(policy)
    }

    pub fn as_bridge_value(&self) -> AppResult<Value> {
        serde_json::to_value(self).map_err(|error| {
            AppError::internal("cannot encode regional payment policy")
                .with_internal(error.to_string())
        })
    }

    pub fn binding(&self, market_country: Option<&str>) -> AppResult<RegionalPolicyBinding> {
        let country = normalize_country(market_country);
        let methods = if !self.enabled {
            ALL_METHODS.to_vec()
        } else {
            self.rules
                .iter()
                .find(|rule| {
                    country
                        .as_ref()
                        .is_some_and(|value| rule.countries.contains(value))
                })
                .map(|rule| rule.methods.clone())
                .unwrap_or_else(|| self.fallback_methods.clone())
        };
        Ok(RegionalPolicyBinding {
            market_country: country,
            policy_fingerprint: self.fingerprint()?,
            allowed_methods: methods,
        })
    }

    pub fn enforce(
        &self,
        market_country: Option<&str>,
        requested: &[PaymentMethod],
    ) -> AppResult<RegionalPolicyBinding> {
        let binding = self.binding(market_country)?;
        if self.enabled
            && requested
                .iter()
                .map(regional_method)
                .any(|method| !binding.allowed_methods.contains(&method))
        {
            return Err(AppError::new(
                409,
                "payment_method_unavailable_in_region",
                "one or more requested payment methods are unavailable in this region",
            ));
        }
        Ok(binding)
    }

    fn fingerprint(&self) -> AppResult<String> {
        let bytes = serde_json::to_vec(self).map_err(|error| {
            AppError::internal("cannot fingerprint regional payment policy")
                .with_internal(error.to_string())
        })?;
        Ok(hex::encode(Sha256::digest(bytes)))
    }

    fn normalize_and_validate(&mut self) -> AppResult<()> {
        if self.schema_version != 1 {
            return Err(AppError::bad_request(
                "regional payment policy schemaVersion must be 1",
            ));
        }
        normalize_methods(&mut self.fallback_methods);
        let mut ids = BTreeSet::new();
        let mut countries = BTreeSet::new();
        for rule in &mut self.rules {
            rule.id = rule.id.trim().to_string();
            rule.label = rule.label.trim().to_string();
            if rule.id.is_empty()
                || rule.id.len() > 64
                || rule.label.is_empty()
                || rule.label.len() > 100
            {
                return Err(AppError::bad_request(
                    "regional payment rule id or label is invalid",
                ));
            }
            if !ids.insert(rule.id.clone()) {
                return Err(AppError::bad_request(
                    "regional payment rule ids must be unique",
                ));
            }
            normalize_methods(&mut rule.methods);
            if rule.countries.is_empty() {
                return Err(AppError::bad_request(
                    "regional payment rule countries must not be empty",
                ));
            }
            for country in &mut rule.countries {
                *country = country.trim().to_uppercase();
                if !valid_country(country) {
                    return Err(AppError::bad_request(
                        "regional payment countries must be ISO alpha-2 codes",
                    ));
                }
                if !countries.insert(country.clone()) {
                    return Err(AppError::bad_request(
                        "a country may appear in only one regional payment rule",
                    ));
                }
            }
            rule.countries.sort();
            rule.countries.dedup();
        }
        self.rules.sort_by(|left, right| left.id.cmp(&right.id));
        Ok(())
    }
}

fn normalize_methods(methods: &mut Vec<RegionalPaymentMethod>) {
    methods.sort();
    methods.dedup();
}

fn normalize_country(value: Option<&str>) -> Option<String> {
    value
        .map(str::trim)
        .map(str::to_uppercase)
        .filter(|value| valid_country(value))
}

fn valid_country(value: &str) -> bool {
    value.len() == 2 && value.bytes().all(|byte| byte.is_ascii_alphabetic())
}

fn regional_method(method: &PaymentMethod) -> RegionalPaymentMethod {
    match method {
        PaymentMethod::Stripe => RegionalPaymentMethod::Stripe,
        PaymentMethod::X402 => RegionalPaymentMethod::X402,
        PaymentMethod::Credits => RegionalPaymentMethod::Credits,
    }
}

#[cfg(test)]
#[path = "regional_payment_policy_tests.rs"]
mod tests;
