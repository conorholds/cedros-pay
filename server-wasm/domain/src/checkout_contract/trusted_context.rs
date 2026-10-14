#[cfg(test)]
use crate::ctx::RequestContext;
#[cfg(test)]
use crate::error::{AppError, AppResult};

use super::ProviderScope;

#[derive(Debug, Clone)]
pub struct TrustedProviderContext {
    pub(crate) scope: ProviderScope,
}

impl TrustedProviderContext {
    /// Derives isolation only from host context and the trusted Stripe binding.
    #[cfg(test)]
    pub fn from_host(context: &RequestContext, stripe_account_id: &str) -> AppResult<Self> {
        let site = trusted_segment(context.site_id.as_deref(), "site")?;
        let environment = trusted_segment(context.environment.as_deref(), "environment")?;
        let account = trusted_account(stripe_account_id)?;
        let scope = ProviderScope::from_host(&format!("{site}:{environment}:stripe:{account}"))?;
        Ok(Self { scope })
    }

    pub fn provider_scope(&self) -> &str {
        self.scope.as_str()
    }
}

#[cfg(test)]
fn trusted_account(value: &str) -> AppResult<&str> {
    let valid = value.starts_with("acct_")
        && value.len() > "acct_".len()
        && value.len() <= 255
        && value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || byte == b'_');
    if valid {
        Ok(value)
    } else {
        Err(unavailable("Stripe account binding"))
    }
}

#[cfg(test)]
fn trusted_segment<'a>(value: Option<&'a str>, label: &str) -> AppResult<&'a str> {
    value
        .filter(|value| {
            !value.trim().is_empty()
                && value.trim() == *value
                && value.len() <= 200
                && !value.contains(':')
                && !value.chars().any(char::is_control)
        })
        .ok_or_else(|| unavailable(label))
}

#[cfg(test)]
fn unavailable(label: &str) -> AppError {
    AppError::new(
        503,
        "provider_scope_unavailable",
        format!("trusted host {label} is unavailable"),
    )
}
