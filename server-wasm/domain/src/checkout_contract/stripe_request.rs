use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

use crate::error::{AppError, AppResult};

const MIN_SESSION_TTL_SECONDS: i64 = 30 * 60;
const MAX_SESSION_TTL_SECONDS: i64 = 24 * 60 * 60;
const PROVIDER_NAMESPACE_PREFIX: &str = "checkout-provider:";

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct StripeRequestBinding {
    pub idempotency_key: String,
    pub expires_at: i64,
}

impl StripeRequestBinding {
    pub fn derive(provider_namespace: &str, exact_public_key: &str, now: i64) -> AppResult<Self> {
        super::ExternalIdempotencyKey::parse_exact(exact_public_key)?;
        if !valid_provider_namespace(provider_namespace) {
            return Err(AppError::internal("checkout provider namespace is invalid"));
        }
        let mut digest = Sha256::new();
        digest.update(b"cedros-pay-stripe-checkout-idempotency-v1\0");
        hash(&mut digest, provider_namespace);
        hash(&mut digest, exact_public_key);
        Ok(Self {
            idempotency_key: format!("cedros-pay-checkout-{}", hex::encode(digest.finalize())),
            expires_at: now.saturating_add(crate::stripe::checkout_api::SESSION_TTL_SECONDS),
        })
    }

    pub(super) fn provider_namespace(
        merchant_namespace: &str,
        stripe_account: &str,
    ) -> AppResult<String> {
        if merchant_namespace.len() != 64 || !merchant_namespace.bytes().all(lower_hex) {
            return Err(AppError::internal("checkout merchant namespace is invalid"));
        }
        if !valid_account(stripe_account) {
            return Err(AppError::internal("checkout Stripe account is invalid"));
        }
        let mut digest = Sha256::new();
        digest.update(b"cedros-pay-checkout-provider-namespace-v1\0");
        hash(&mut digest, merchant_namespace);
        hash(&mut digest, stripe_account);
        Ok(format!(
            "{PROVIDER_NAMESPACE_PREFIX}{}",
            hex::encode(digest.finalize())
        ))
    }

    pub fn valid_for_created_at(&self, created_at: i64) -> bool {
        self.idempotency_key
            .strip_prefix("cedros-pay-checkout-")
            .is_some_and(|digest| digest.len() == 64 && digest.bytes().all(lower_hex))
            && self.expires_at >= created_at.saturating_add(MIN_SESSION_TTL_SECONDS)
            && self.expires_at <= created_at.saturating_add(MAX_SESSION_TTL_SECONDS)
    }
}

fn valid_provider_namespace(value: &str) -> bool {
    value
        .strip_prefix(PROVIDER_NAMESPACE_PREFIX)
        .is_some_and(|digest| digest.len() == 64 && digest.bytes().all(lower_hex))
}

fn hash(digest: &mut Sha256, value: &str) {
    digest.update((value.len() as u64).to_be_bytes());
    digest.update(value.as_bytes());
}

fn valid_account(value: &str) -> bool {
    value.starts_with("acct_")
        && value.len() > 5
        && value.len() <= 255
        && value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'_' | b'-'))
}

fn lower_hex(byte: u8) -> bool {
    byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte)
}
