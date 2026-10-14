//! Validated public input for Pay-owned initial collection.

use serde::Deserialize;

use super::solana::{validate_address, validate_signature};
use super::solana_activation_support::validate_number_of_payments;
use crate::error::AppResult;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct CollectInitialReq {
    pub(super) plan_id: String,
    pub(super) interval: String,
    pub(super) wallet: String,
    pub(super) authorization_signature: String,
    pub(super) wallet_binding_message: String,
    pub(super) wallet_binding_signature: String,
    pub(super) subscription_address: String,
    pub(super) subscription_authority_address: Option<String>,
    pub(super) plan_address: Option<String>,
    pub(super) number_of_payments: Option<u32>,
}

pub(super) fn validate(req: &CollectInitialReq) -> AppResult<()> {
    for address in [
        Some(req.wallet.as_str()),
        Some(req.subscription_address.as_str()),
        req.subscription_authority_address.as_deref(),
        req.plan_address.as_deref(),
    ]
    .into_iter()
    .flatten()
    {
        validate_address(address, "Solana collection addresses must be valid")?;
    }
    validate_signature(&req.authorization_signature)?;
    validate_number_of_payments(req.number_of_payments)
}
