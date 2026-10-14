//! Host-managed initial Solana subscription collection boundary.

use crate::error::{AppError, AppResult};
use crate::seams::HostSeams;

pub(super) struct CollectionTransactionInput<'a> {
    pub(super) program_address: &'a str,
    pub(super) collector_address: &'a str,
    pub(super) subscription_address: &'a str,
    pub(super) plan_address: &'a str,
    pub(super) subscription_authority_address: &'a str,
    pub(super) subscriber_token_account: &'a str,
    pub(super) receiver_token_account: &'a str,
    pub(super) wallet: &'a str,
    pub(super) token_mint: &'a str,
    pub(super) token_program_address: &'a str,
    pub(super) event_authority_address: &'a str,
    pub(super) amount_atomic: i64,
}

pub(super) struct PreparedCollection {
    pub(super) signed_transaction: String,
    pub(super) signature: String,
    pub(super) blockhash: String,
}

/// Preserve the published route without taking ownership of a collector key.
/// A future implementation must use a published Wallet/host signing capability.
pub(super) fn prepare<S: HostSeams>(
    _seams: &S,
    _rpc_url: &str,
    input: &CollectionTransactionInput<'_>,
) -> AppResult<PreparedCollection> {
    let addresses = [
        input.program_address,
        input.collector_address,
        input.subscription_address,
        input.plan_address,
        input.subscription_authority_address,
        input.subscriber_token_account,
        input.receiver_token_account,
        input.wallet,
        input.token_mint,
        input.token_program_address,
        input.event_authority_address,
    ];
    if input.amount_atomic <= 0 || addresses.iter().any(|address| address.trim().is_empty()) {
        return Err(AppError::unprocessable(
            "Solana collection intent is invalid",
        ));
    }
    Err(AppError::new(
        503,
        "collector_signer_unavailable",
        "Solana subscription collection requires a host-managed signing contract",
    ))
}
