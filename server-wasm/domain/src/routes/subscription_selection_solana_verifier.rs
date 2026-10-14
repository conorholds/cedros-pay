//! Verification of the finalized official `Subscribe` instruction.

use super::solana::DerivedSubscriptionAddresses;
use super::solana_transaction as transaction;
use crate::error::{AppError, AppResult};
use crate::seams::HostSeams;
use crate::x402::pubkey;

const SUBSCRIBE_DISCRIMINATOR: u8 = 11;
const SUBSCRIBE_DATA_LEN: usize = 74;
const SYSTEM_PROGRAM_ADDRESS: &str = "11111111111111111111111111111111";

pub(super) struct ExpectedSolanaAuthorization<'a> {
    pub(super) signature: &'a str,
    pub(super) program_address: &'a str,
    pub(super) subscriber: &'a str,
    pub(super) merchant: &'a str,
    pub(super) addresses: &'a DerivedSubscriptionAddresses,
    pub(super) token_mint: &'a str,
    pub(super) solana_plan_id: u64,
    pub(super) amount_atomic: i64,
    pub(super) period_hours: u64,
    pub(super) expected_created_at: Option<i64>,
    pub(super) expected_subscription_authority_init_id: Option<i64>,
}

pub(super) fn verify_authorization_transaction<S: HostSeams>(
    seams: &S,
    rpc_url: &str,
    expected: &ExpectedSolanaAuthorization<'_>,
) -> AppResult<()> {
    let tx = transaction::fetch_finalized(seams, rpc_url, expected.signature, expected.token_mint)?;
    let accounts = transaction::account_keys(&tx);
    let matched = transaction::instructions(&tx)
        .into_iter()
        .any(|instruction| {
            transaction::program_id(instruction, &accounts) == Some(expected.program_address)
                && instruction_accounts_match(instruction, &accounts, expected)
                && transaction::data(instruction)
                    .is_some_and(|data| instruction_data_matches(data, expected))
        });
    if matched {
        Ok(())
    } else {
        Err(AppError::new(
            422,
            "invalid_payment_proof",
            "authorization transaction does not match expected subscription plan",
        ))
    }
}

fn instruction_accounts_match(
    instruction: &serde_json::Value,
    message_accounts: &[transaction::MessageAccount],
    expected: &ExpectedSolanaAuthorization<'_>,
) -> bool {
    let Some(accounts) = transaction::resolve_accounts(instruction, message_accounts) else {
        return false;
    };
    let expected_keys = [
        expected.subscriber,
        expected.merchant,
        expected.addresses.plan_address.as_str(),
        expected.addresses.subscription_address.as_str(),
        expected.addresses.subscription_authority_address.as_str(),
        SYSTEM_PROGRAM_ADDRESS,
        expected.addresses.event_authority_address.as_str(),
        expected.program_address,
    ];
    (accounts.len() == expected_keys.len() || accounts.len() == expected_keys.len() + 1)
        && accounts
            .iter()
            .zip(expected_keys)
            .all(|(actual, expected)| actual.pubkey == expected)
        && accounts[0].signer
        && accounts[0].writable
        && accounts[3].writable
        && accounts
            .get(8)
            .is_none_or(|payer| payer.signer && payer.writable)
}

fn instruction_data_matches(data: &str, expected: &ExpectedSolanaAuthorization<'_>) -> bool {
    let Ok(data) = bs58::decode(data).into_vec() else {
        return false;
    };
    let Ok(mint) = pubkey::parse(expected.token_mint) else {
        return false;
    };
    let Ok(amount_atomic) = u64::try_from(expected.amount_atomic) else {
        return false;
    };
    data.len() == SUBSCRIBE_DATA_LEN
        && data[0] == SUBSCRIBE_DISCRIMINATOR
        && read_u64(&data, 1) == Some(expected.solana_plan_id)
        && data[9] == expected.addresses.plan_bump
        && data.get(10..42).is_some_and(|bytes| bytes == mint.as_ref())
        && read_u64(&data, 42) == Some(amount_atomic)
        && read_u64(&data, 50) == Some(expected.period_hours)
        && expected
            .expected_created_at
            .is_none_or(|created| read_i64(&data, 58) == Some(created))
        && expected
            .expected_subscription_authority_init_id
            .is_none_or(|init| read_i64(&data, 66) == Some(init))
}

fn read_u64(data: &[u8], offset: usize) -> Option<u64> {
    Some(u64::from_le_bytes(
        data.get(offset..offset + 8)?.try_into().ok()?,
    ))
}

fn read_i64(data: &[u8], offset: usize) -> Option<i64> {
    Some(i64::from_le_bytes(
        data.get(offset..offset + 8)?.try_into().ok()?,
    ))
}
