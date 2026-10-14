use serde::{Deserialize, Serialize};

use crate::error::{AppError, AppResult};

/// Safe, non-capability-bearing provider correlation data.
#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ProviderArtifacts {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub provider_operation_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub provider_quote_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub provider_checkout_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub provider_payment_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub return_artifact_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub outcome_proof: Option<String>,
}

impl ProviderArtifacts {
    pub fn validate(&self) -> AppResult<()> {
        for value in [
            &self.provider_operation_id,
            &self.provider_quote_id,
            &self.provider_checkout_id,
            &self.provider_payment_id,
            &self.return_artifact_id,
        ]
        .into_iter()
        .flatten()
        {
            if !safe_token(value, 255) {
                return Err(unsafe_artifact());
            }
        }
        if self
            .outcome_proof
            .as_deref()
            .is_some_and(|value| !safe_proof(value))
        {
            return Err(unsafe_artifact());
        }
        Ok(())
    }
}

pub(super) fn safe_proof(value: &str) -> bool {
    safe_token(value, 512)
}

fn safe_token(value: &str, max: usize) -> bool {
    let lower = value.to_ascii_lowercase();
    !value.is_empty()
        && value.len() <= max
        && value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'_' | b'-' | b':'))
        && !lower.contains("secret")
        && !lower.contains("sk_live")
        && !lower.starts_with("bearer")
}

fn unsafe_artifact() -> AppError {
    AppError::bad_request("provider artifacts must be safe opaque identifiers or proofs")
}
