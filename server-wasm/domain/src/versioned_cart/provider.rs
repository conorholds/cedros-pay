use sha2::{Digest, Sha256};

use crate::ctx::RequestContext;
use crate::error::{AppError, AppResult};

const PROVIDER_FAMILY: &str = "cedros-shop";
const MAX_CONTEXT_SEGMENT_BYTES: usize = 200;

/// Provider namespace derived exclusively from host-authenticated context.
#[derive(Clone, Debug)]
pub struct TrustedCartProvider(String);

impl TrustedCartProvider {
    /// Bind carts to one host site/environment and the fixed Shop provider family.
    pub fn from_host_context(context: &RequestContext) -> AppResult<Self> {
        let site = trusted_segment(context.site_id.as_deref(), "site")?;
        let environment = trusted_segment(context.environment.as_deref(), "environment")?;
        let mut digest = Sha256::new();
        digest.update(b"cedros-pay:versioned-cart-provider-v1\0");
        hash_part(&mut digest, site);
        hash_part(&mut digest, environment);
        Ok(Self(format!(
            "{PROVIDER_FAMILY}:{}",
            hex::encode(digest.finalize())
        )))
    }

    pub(super) fn as_str(&self) -> &str {
        &self.0
    }

    #[cfg(test)]
    pub(super) fn for_test(value: &str) -> Self {
        Self(value.to_string())
    }
}

fn trusted_segment<'a>(value: Option<&'a str>, label: &str) -> AppResult<&'a str> {
    value
        .filter(|value| {
            !value.is_empty()
                && value.trim() == *value
                && value.len() <= MAX_CONTEXT_SEGMENT_BYTES
                && !value.chars().any(char::is_control)
        })
        .ok_or_else(|| {
            AppError::new(
                503,
                "provider_scope_unavailable",
                format!("trusted host {label} is unavailable"),
            )
        })
}

fn hash_part(digest: &mut Sha256, value: &str) {
    digest.update((value.len() as u64).to_be_bytes());
    digest.update(value.as_bytes());
}
