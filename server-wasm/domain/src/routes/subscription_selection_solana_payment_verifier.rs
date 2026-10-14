//! Verification of a finalized official `TransferSubscription` collection.

use super::solana::DerivedSubscriptionAddresses;
use super::solana_transaction as transaction;
use crate::error::{AppError, AppResult};
use crate::seams::HostSeams;
use crate::x402::pubkey;

const TRANSFER_SUBSCRIPTION_DISCRIMINATOR: u8 = 10;
const TRANSFER_DATA_LEN: usize = 73;
const EVENT_TAG: u64 = 0x1d9acb512ea545e4;
const SUBSCRIPTION_TRANSFER_EVENT: u8 = 2;
const TRANSFER_EVENT_LEN: usize = 265;

pub(super) struct ExpectedInitialPayment<'a> {
    pub(super) signature: &'a str,
    pub(super) program_address: &'a str,
    pub(super) subscriber: &'a str,
    pub(super) addresses: &'a DerivedSubscriptionAddresses,
    pub(super) subscriber_token_account: &'a str,
    pub(super) receiver_token_account: &'a str,
    pub(super) collector_address: &'a str,
    pub(super) token_mint: &'a str,
    pub(super) token_program_address: &'a str,
    pub(super) amount_atomic: i64,
    pub(super) period_hours: u64,
    pub(super) now: i64,
}

#[derive(Debug, Clone)]
pub(super) struct VerifiedInitialPayment {
    pub(super) block_time: i64,
    pub(super) period_start: i64,
    pub(super) period_end: i64,
}

pub(super) fn verify_initial_payment<S: HostSeams>(
    seams: &S,
    rpc_url: &str,
    expected: &ExpectedInitialPayment<'_>,
) -> AppResult<VerifiedInitialPayment> {
    let tx = transaction::fetch_finalized(seams, rpc_url, expected.signature, expected.token_mint)?;
    let accounts = transaction::account_keys(&tx);
    verify_balance_changes(&tx, &accounts, expected)?;
    let instructions = transaction::instructions(&tx);
    let transfer = instructions.iter().any(|instruction| {
        transaction::program_id(instruction, &accounts) == Some(expected.program_address)
            && transfer_accounts_match(instruction, &accounts, expected)
            && transaction::data(instruction)
                .is_some_and(|data| transfer_data_matches(data, expected))
    });
    let event = instructions.iter().find_map(|instruction| {
        (transaction::program_id(instruction, &accounts) == Some(expected.program_address))
            .then(|| event_from_instruction(instruction, &accounts, expected))
            .flatten()
    });
    let block_time = tx["blockTime"]
        .as_i64()
        .ok_or_else(|| AppError::new(502, "rpc_error", "Solana transaction omitted block time"))?;
    let event = event.filter(|event| event_period_is_valid(event, block_time, expected));
    match (transfer, event) {
        (true, Some(event)) => Ok(VerifiedInitialPayment {
            block_time,
            period_start: event.period_start,
            period_end: event.period_end,
        }),
        _ => Err(AppError::new(
            422,
            "invalid_payment_proof",
            "payment transaction does not contain the expected initial subscription collection",
        )),
    }
}

fn transfer_accounts_match(
    instruction: &serde_json::Value,
    message_accounts: &[transaction::MessageAccount],
    expected: &ExpectedInitialPayment<'_>,
) -> bool {
    let Some(accounts) = transaction::resolve_accounts(instruction, message_accounts) else {
        return false;
    };
    let expected_keys = [
        expected.addresses.subscription_address.as_str(),
        expected.addresses.plan_address.as_str(),
        expected.addresses.subscription_authority_address.as_str(),
        expected.subscriber_token_account,
        expected.receiver_token_account,
        expected.collector_address,
        expected.token_mint,
        expected.token_program_address,
        expected.addresses.event_authority_address.as_str(),
        expected.program_address,
    ];
    accounts.len() >= expected_keys.len()
        && accounts
            .iter()
            .zip(expected_keys)
            .all(|(actual, expected)| actual.pubkey == expected)
        && accounts[0].writable
        && accounts[3].writable
        && accounts[4].writable
        && accounts[5].signer
}

fn transfer_data_matches(data: &str, expected: &ExpectedInitialPayment<'_>) -> bool {
    let Ok(data) = bs58::decode(data).into_vec() else {
        return false;
    };
    let Ok(amount) = u64::try_from(expected.amount_atomic) else {
        return false;
    };
    let (Ok(subscriber), Ok(mint)) = (
        pubkey::parse(expected.subscriber),
        pubkey::parse(expected.token_mint),
    ) else {
        return false;
    };
    data.len() == TRANSFER_DATA_LEN
        && data[0] == TRANSFER_SUBSCRIPTION_DISCRIMINATOR
        && transaction::read_u64(&data, 1) == Some(amount)
        && data
            .get(9..41)
            .is_some_and(|bytes| bytes == subscriber.as_ref())
        && data.get(41..73).is_some_and(|bytes| bytes == mint.as_ref())
}

struct TransferEvent {
    period_start: i64,
    period_end: i64,
    amount_pulled: u64,
}

fn event_from_instruction(
    instruction: &serde_json::Value,
    message_accounts: &[transaction::MessageAccount],
    expected: &ExpectedInitialPayment<'_>,
) -> Option<TransferEvent> {
    let accounts = transaction::resolve_accounts(instruction, message_accounts)?;
    let event_authority = accounts.first()?;
    // A successful EmitEvent self-CPI proves the PDA signature inside the
    // program; RPC message-level signer flags do not expose CPI signer status.
    if event_authority.pubkey != expected.addresses.event_authority_address {
        return None;
    }
    let data = bs58::decode(transaction::data(instruction)?)
        .into_vec()
        .ok()?;
    event_data(&data, expected)
}

fn event_data(data: &[u8], expected: &ExpectedInitialPayment<'_>) -> Option<TransferEvent> {
    let amount = u64::try_from(expected.amount_atomic).ok()?;
    let expected_addresses = [
        (9, expected.addresses.subscription_address.as_str()),
        (41, expected.addresses.plan_address.as_str()),
        (73, expected.subscriber),
        (105, expected.token_mint),
        (201, expected.receiver_token_account),
        (233, expected.collector_address),
    ];
    if data.len() != TRANSFER_EVENT_LEN
        || data.get(..8)? != EVENT_TAG.to_le_bytes()
        || data[8] != SUBSCRIPTION_TRANSFER_EVENT
        || transaction::read_u64(data, 137)? != amount
        || !expected_addresses
            .iter()
            .all(|(offset, address)| transaction::address_matches(data, *offset, address))
    {
        return None;
    }
    Some(TransferEvent {
        period_start: transaction::read_i64(data, 145)?,
        period_end: transaction::read_i64(data, 153)?,
        amount_pulled: transaction::read_u64(data, 161)?,
    })
}

fn event_period_is_valid(
    event: &TransferEvent,
    block_time: i64,
    expected: &ExpectedInitialPayment<'_>,
) -> bool {
    let Some(period_seconds) = expected
        .period_hours
        .checked_mul(3600)
        .and_then(|seconds| i64::try_from(seconds).ok())
    else {
        return false;
    };
    let duration = event.period_end.checked_sub(event.period_start);
    event.amount_pulled == u64::try_from(expected.amount_atomic).unwrap_or(u64::MAX)
        && duration.is_some_and(|seconds| seconds > 0 && seconds <= period_seconds)
        && block_time >= event.period_start
        && block_time < event.period_end
        && event.period_end > expected.now
}

fn verify_balance_changes(
    tx: &serde_json::Value,
    accounts: &[transaction::MessageAccount],
    expected: &ExpectedInitialPayment<'_>,
) -> AppResult<()> {
    let invalid = || {
        AppError::new(
            422,
            "invalid_payment_proof",
            "subscription token balance effects do not match the payment",
        )
    };
    let source = accounts
        .iter()
        .position(|account| account.pubkey == expected.subscriber_token_account)
        .ok_or_else(invalid)?;
    let destination = accounts
        .iter()
        .position(|account| account.pubkey == expected.receiver_token_account)
        .ok_or_else(invalid)?;
    let balance = |field: &str, index: usize| -> Option<(u64, u64, String)> {
        let mut rows = tx["meta"][field]
            .as_array()?
            .iter()
            .filter(|row| row["accountIndex"].as_u64() == Some(index as u64));
        let row = rows.next()?;
        if rows.next().is_some()
            || row["mint"].as_str()? != expected.token_mint
            || row["programId"].as_str()? != expected.token_program_address
        {
            return None;
        }
        let raw = row["uiTokenAmount"]["amount"].as_str()?;
        if raw.is_empty() || !raw.bytes().all(|byte| byte.is_ascii_digit()) {
            return None;
        }
        Some((
            raw.parse().ok()?,
            row["uiTokenAmount"]["decimals"].as_u64()?,
            row["owner"].as_str()?.to_string(),
        ))
    };
    let pre_source = balance("preTokenBalances", source).ok_or_else(invalid)?;
    let post_source = balance("postTokenBalances", source).ok_or_else(invalid)?;
    let pre_destination = balance("preTokenBalances", destination).ok_or_else(invalid)?;
    let post_destination = balance("postTokenBalances", destination).ok_or_else(invalid)?;
    let usdc = matches!(
        expected.token_mint,
        crate::x402::config::MAINNET_USDC_MINT | crate::x402::config::DEVNET_USDC_MINT
    );
    let amount = u64::try_from(expected.amount_atomic).map_err(|_| invalid())?;
    if source == destination
        || amount == 0
        || pre_source.0.checked_sub(post_source.0) != Some(amount)
        || post_destination.0.checked_sub(pre_destination.0) != Some(amount)
        || pre_source.1 != post_source.1
        || pre_source.1 != pre_destination.1
        || pre_source.1 != post_destination.1
        || pre_source.2 != expected.subscriber
        || post_source.2 != expected.subscriber
        || pre_destination.2 != post_destination.2
        || (usdc
            && (pre_source.1 != 6
                || expected.token_program_address != super::solana::DEFAULT_SOLANA_TOKEN_PROGRAM))
    {
        return Err(invalid());
    }
    Ok(())
}
