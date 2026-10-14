//! Operator-owned Apple App Store configuration.

use super::{ns_bool, ns_setting};
use crate::error::{AppError, AppResult};
use crate::seams::HostSeams;

#[derive(Debug)]
pub(in crate::routes) struct AppleConfig {
    pub(in crate::routes) issuer_id: String,
    pub(in crate::routes) key_id: String,
    pub(in crate::routes) bundle_id: Option<String>,
    private_key: String,
    pub(in crate::routes) allow_sandbox: bool,
}

impl AppleConfig {
    pub(super) fn private_key(&self) -> &str {
        &self.private_key
    }
}

pub(in crate::routes) fn apple_config<S: HostSeams>(seams: &S) -> AppResult<AppleConfig> {
    let disabled = |what: &str| {
        AppError::new(
            503,
            "unavailable",
            format!("Apple native-store verification is {what}"),
        )
    };
    if !ns_bool(seams, "enabled") || !ns_bool(seams, "apple_enabled") {
        return Err(disabled("disabled"));
    }
    let issuer_id =
        ns_setting(seams, "apple_issuer_id").ok_or_else(|| disabled("not configured"))?;
    let key_id = ns_setting(seams, "apple_key_id").ok_or_else(|| disabled("not configured"))?;
    let private_key = seams
        .secret_get("native_store.apple_private_key")?
        .filter(|key| !key.trim().is_empty())
        .ok_or_else(|| disabled("not configured"))?;
    Ok(AppleConfig {
        issuer_id,
        key_id,
        bundle_id: ns_setting(seams, "apple_bundle_id"),
        private_key,
        allow_sandbox: ns_bool(seams, "apple_allow_sandbox_fallback"),
    })
}
