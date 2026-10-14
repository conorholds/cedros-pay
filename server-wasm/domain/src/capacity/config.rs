//! Operator-owned activation and billing bindings. Defaults never authorize sales.
use super::wire;
use crate::{error::AppResult, seams::HostSeams};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::BTreeMap;
pub const SETTING: &str = "subscriptions.capacity_v1";
#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Config {
    pub pay_installation_id: String,
    pub environment: String,
    pub sales_enabled: bool,
    pub joint_activation_verified: bool,
    pub stripe_portal_configuration_id: String,
    pub portal_origin: String,
    pub recovery_path: String,
    pub organizations: BTreeMap<String, Organization>,
}
#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Organization {
    pub stripe_customer_id: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub accounting_version: Option<u32>,
    pub base_subscription_ids: Vec<String>,
    /// Explicit subscription-to-customer ownership, independently approved by the operator.
    #[serde(default)]
    pub base_customer_refs: BTreeMap<String, String>,
    #[serde(default)]
    pub canonical_site_ids: Vec<String>,
    #[serde(default)]
    pub base_plan_allowances: BTreeMap<String, ApprovedAllowances>,
    pub commercial_verified: bool,
    pub runtime_ready: bool,
}
#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ApprovedAllowances {
    pub approval_id: String,
    pub included_allowances: Vec<Value>,
}
impl Config {
    pub fn load<S: HostSeams>(s: &S) -> AppResult<Self> {
        let raw = s.setting_get(SETTING)?.ok_or_else(wire::unavailable)?;
        let c: Self = serde_json::from_str(&raw).map_err(|_| wire::unavailable())?;
        c.validate()?;
        let mode = s
            .setting_get("stripe.mode")?
            .ok_or_else(wire::unavailable)?;
        let mode = serde_json::from_str::<Value>(&mode).unwrap_or(Value::String(mode));
        if mode != c.environment {
            return Err(wire::unavailable());
        }
        Ok(c)
    }
    pub fn validate(&self) -> AppResult<()> {
        let c = self;
        if !provider_id(&c.stripe_portal_configuration_id, "bpc_")
            || c.pay_installation_id.is_empty()
            || !matches!(c.environment.as_str(), "test" | "live")
            || !https_origin(&c.portal_origin)
            || !c.recovery_path.starts_with('/')
            || c.recovery_path.starts_with("//")
            || c.recovery_path.contains(['?', '#', '\\'])
        {
            return Err(wire::unavailable());
        }
        if c.organizations
            .values()
            .any(|o| o.accounting_version.is_some_and(|v| v != 2))
        {
            return Err(wire::unavailable());
        }
        Ok(())
    }
    pub fn organization(&self, target: &Value) -> AppResult<&Organization> {
        let org = self
            .organizations
            .get(wire::text(&target["scope"], "organizationId")?)
            .ok_or_else(wire::unavailable)?;
        if !org
            .base_subscription_ids
            .iter()
            .any(|id| target["baseSubscriptionId"] == *id)
            || !provider_id(&org.stripe_customer_id, "cus_")
        {
            return Err(wire::unavailable());
        }
        Ok(org)
    }
    pub fn sale(&self, target: &Value) -> AppResult<()> {
        let org = self.organization(target)?;
        if !self.sales_enabled
            || !self.joint_activation_verified
            || !org.commercial_verified
            || !org.runtime_ready
        {
            return Err(wire::unavailable());
        }
        Ok(())
    }
}
pub fn provider_id(s: &str, prefix: &str) -> bool {
    s.starts_with(prefix)
        && s.len() <= 160
        && s.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'_')
}
pub fn https_origin(s: &str) -> bool {
    s.strip_prefix("https://").is_some_and(|h| {
        !h.is_empty()
            && !h.contains(['/', ':', '@', '?', '#', '\\'])
            && h.bytes()
                .all(|b| b.is_ascii_alphanumeric() || b == b'.' || b == b'-')
    })
}
