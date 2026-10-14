//! Host-derived authority for one selected checkout rail.

use serde_json::json;
use sha2::{Digest, Sha256};

use super::{AuthoritativeQuoteSnapshot, MaterialFingerprint, PaymentMethod, ProviderScope};
use crate::auth::Buyer;
use crate::db::Db;
use crate::error::{AppError, AppResult};
use crate::models::CreditAccount;
use crate::seams::HostSeams;

pub(super) struct RailAuthority {
    pub scope: ProviderScope,
    pub fingerprint: String,
    pub stripe_account: Option<String>,
}

pub(super) fn resolve<S: HostSeams>(
    seams: &S,
    quote_scope: &str,
    buyer: Option<&Buyer>,
    method: PaymentMethod,
    quote: &AuthoritativeQuoteSnapshot,
) -> AppResult<RailAuthority> {
    let (rail, parts) = match method {
        PaymentMethod::Stripe => ("stripe", stripe_parts(seams)?),
        PaymentMethod::Credits => ("credits", credits_parts(seams, buyer, &quote.currency)?),
        PaymentMethod::X402 => ("x402", x402_parts(seams, quote)?),
    };
    let stripe_account = (method == PaymentMethod::Stripe).then(|| parts[0].clone());
    let fingerprint = authority_fingerprint(rail, &parts);
    let scope = scoped_provider(quote_scope, rail, &fingerprint)?;
    Ok(RailAuthority {
        scope,
        fingerprint,
        stripe_account,
    })
}

/// Reconstructs the checkout rail authority from trusted scope and provider
/// configuration so return artifacts never need a caller-supplied operation id.
pub(super) fn stripe_return_scope<S: HostSeams>(
    seams: &S,
    quote_scope: &str,
) -> AppResult<ProviderScope> {
    let fingerprint = authority_fingerprint("stripe", &stripe_parts(seams)?);
    scoped_provider(quote_scope, "stripe", &fingerprint)
}

fn scoped_provider(quote_scope: &str, rail: &str, fingerprint: &str) -> AppResult<ProviderScope> {
    let mut scope = Sha256::new();
    scope.update(b"cedros-pay-canonical-checkout-rail-scope\0");
    hash_part(&mut scope, quote_scope);
    hash_part(&mut scope, rail);
    hash_part(&mut scope, fingerprint);
    ProviderScope::from_host(&format!("checkout-rail:{}", hex::encode(scope.finalize())))
}

pub(super) fn validate_quote_credits<S: HostSeams>(
    seams: &S,
    buyer: Option<&Buyer>,
    currency: &str,
) -> AppResult<()> {
    credits_parts(seams, buyer, currency).map(drop)
}

pub(super) fn x402_config_fingerprint(
    network: &str,
    pay_to: &str,
    fee_payer: Option<&str>,
    recipient: &str,
    mint: &str,
    decimals: u8,
) -> String {
    MaterialFingerprint::from_server_material(&json!({
        "network": network,
        "payTo": pay_to,
        "feePayer": fee_payer,
        "recipientTokenAccount": recipient,
        "tokenMint": mint,
        "decimals": decimals,
    }))
    .as_str()
    .into()
}

fn stripe_parts<S: HostSeams>(seams: &S) -> AppResult<Vec<String>> {
    Ok(vec![stripe_account(seams)?])
}

pub(super) fn stripe_account<S: HostSeams>(seams: &S) -> AppResult<String> {
    seams
        .secret_get(crate::ids::SECRET_CHECKOUT_STRIPE_ACCOUNT)?
        .filter(|value| valid_stripe_account(value))
        .ok_or_else(|| unavailable("Stripe account"))
}

fn credits_parts<S: HostSeams>(
    seams: &S,
    buyer: Option<&Buyer>,
    currency: &str,
) -> AppResult<Vec<String>> {
    let buyer = buyer.ok_or_else(|| AppError::unauthorized("credits require a verified buyer"))?;
    let account_key = format!("acct:{}", buyer.user_id);
    let entry = Db::new(seams, crate::ids::DB_ACCESS)
        .read_one(crate::ids::MODEL_CREDITS, &account_key)?
        .ok_or_else(|| unavailable("credits account"))?;
    let account: CreditAccount = entry.parse()?;
    if account.subject_id != buyer.user_id || account.currency != currency {
        return Err(unavailable("credits account"));
    }
    Ok(vec![
        crate::ids::MODEL_CREDITS.into(),
        account_key,
        account.subject_id,
        account.currency,
    ])
}

fn x402_parts<S: HostSeams>(
    seams: &S,
    quote: &AuthoritativeQuoteSnapshot,
) -> AppResult<Vec<String>> {
    let binding = quote
        .x402
        .as_ref()
        .ok_or_else(|| unavailable("x402 binding"))?;
    let expected = x402_config_fingerprint(
        &binding.network,
        &binding.pay_to,
        binding.fee_payer.as_deref(),
        &binding.recipient_token_account,
        &binding.token_mint,
        binding.decimals,
    );
    if binding.config_fingerprint != expected {
        return Err(AppError::internal("stored x402 authority is invalid"));
    }
    let current = crate::blockchain_config::resolve_x402_control(
        seams,
        crate::x402::config::payment_address(seams),
        crate::x402::config::network(seams),
    )
    .map_err(|_| unavailable("x402 control"))?;
    let current_fee_payer = current
        .managed_signer
        .as_ref()
        .map(|signer| signer.public_key.as_str());
    if current.network != binding.network
        || current.pay_to != binding.pay_to
        || current_fee_payer != binding.fee_payer.as_deref()
        || crate::x402::ata::derive_token_account(&current.pay_to, &binding.token_mint)
            .ok()
            .as_deref()
            != Some(binding.recipient_token_account.as_str())
    {
        return Err(AppError::new(
            409,
            "x402_configuration_changed",
            "x402 payment authority changed; request a new quote",
        ));
    }
    Ok(vec![
        binding.network.clone(),
        binding.pay_to.clone(),
        binding.fee_payer.clone().unwrap_or_default(),
        binding.recipient_token_account.clone(),
        binding.token_mint.clone(),
        binding.decimals.to_string(),
        binding.config_fingerprint.clone(),
    ])
}

fn authority_fingerprint(rail: &str, parts: &[String]) -> String {
    let mut digest = Sha256::new();
    digest.update(b"cedros-pay-checkout-rail-authority\0");
    hash_part(&mut digest, rail);
    for part in parts {
        hash_part(&mut digest, part);
    }
    hex::encode(digest.finalize())
}

fn hash_part(digest: &mut Sha256, value: &str) {
    digest.update((value.len() as u64).to_be_bytes());
    digest.update(value.as_bytes());
}

fn valid_stripe_account(value: &str) -> bool {
    value.starts_with("acct_")
        && value.len() > 5
        && value.len() <= 255
        && value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || byte == b'_')
}

fn unavailable(label: &str) -> AppError {
    AppError::new(
        503,
        "checkout_authority_unavailable",
        format!("trusted checkout {label} is unavailable"),
    )
}
