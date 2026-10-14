use sha2::{Digest, Sha256};

use super::ProviderScope;
use crate::auth::Buyer;
use crate::ctx::RequestContext;
use crate::error::{AppError, AppResult};

/// Checkout authority established by the UCP authentication boundary. The
/// canonical domain owns this type and does not depend on its HTTP adapter.
pub struct UcpSessionAuthority {
    scope: String,
}
impl UcpSessionAuthority {
    /// Call only after verifying platform ownership or the checkout handoff MAC.
    pub(crate) fn from_verified_scope(scope: String) -> Self {
        Self { scope }
    }
    pub(crate) fn scope(&self) -> &str {
        &self.scope
    }
}

pub enum CanonicalActor<'a> {
    Verified(&'a Buyer),
    UcpSession(&'a UcpSessionAuthority),
    #[cfg(test)]
    GuestSession(&'a str),
}

#[derive(Clone, Debug)]
pub struct CanonicalScope {
    pub(super) actor_scope: ProviderScope,
    pub(super) merchant_namespace: String,
}

impl CanonicalScope {
    /// Derive a rail-neutral tenant/actor scope only from authenticated host
    /// context. The guest variant exists only for isolated domain tests.
    pub fn from_host(context: &RequestContext, actor: CanonicalActor<'_>) -> AppResult<Self> {
        let site = segment(context.site_id.as_deref(), "site")?;
        let environment = segment(context.environment.as_deref(), "environment")?;
        let (kind, actor) = match actor {
            CanonicalActor::Verified(buyer) => ("subject", buyer.user_id.as_str()),
            CanonicalActor::UcpSession(session) => ("ucp-session", session.scope()),
            #[cfg(test)]
            CanonicalActor::GuestSession(session) => ("guest", session),
        };
        if actor.is_empty()
            || actor.trim() != actor
            || actor.len() > 512
            || actor.chars().any(char::is_control)
        {
            return Err(unavailable("actor"));
        }
        let merchant_namespace = merchant_namespace(site, environment);
        let mut digest = Sha256::new();
        digest.update(b"cedros-pay-canonical-checkout-scope\0");
        // The authenticated site id is the stable merchant authority for
        // rail-neutral quotes. Provider accounts are bound only when checkout
        // selects a rail, so a merchant can quote without Stripe configured.
        for value in ["site-merchant", site, environment, kind, actor] {
            digest.update((value.len() as u64).to_be_bytes());
            digest.update(value.as_bytes());
        }
        Ok(Self {
            actor_scope: ProviderScope::from_host(&format!(
                "checkout:{}",
                hex::encode(digest.finalize())
            ))?,
            merchant_namespace,
        })
    }
}

fn merchant_namespace(site: &str, environment: &str) -> String {
    let mut digest = Sha256::new();
    digest.update(b"cedros-pay-checkout-merchant-namespace\0");
    for value in [site, environment] {
        digest.update((value.len() as u64).to_be_bytes());
        digest.update(value.as_bytes());
    }
    hex::encode(digest.finalize())
}

fn segment<'a>(value: Option<&'a str>, label: &str) -> AppResult<&'a str> {
    value
        .filter(|value| {
            !value.is_empty()
                && value.trim() == *value
                && value.len() <= 200
                && !value.chars().any(char::is_control)
        })
        .ok_or_else(|| unavailable(label))
}

fn unavailable(label: &str) -> AppError {
    AppError::new(
        503,
        "checkout_scope_unavailable",
        format!("trusted checkout {label} is unavailable"),
    )
}
