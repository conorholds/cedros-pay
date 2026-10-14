//! Finalized Solana transaction loading and account resolution shared by the
//! subscription authorization and initial-collection proof verifiers.

use serde_json::Value;

use crate::x402::pubkey;

pub(super) use super::solana_rpc_transaction::fetch_finalized;

#[derive(Debug)]
pub(super) struct MessageAccount {
    pub(super) pubkey: String,
    pub(super) signer: bool,
    pub(super) writable: bool,
}

pub(super) fn account_keys(tx: &Value) -> Vec<MessageAccount> {
    let message = &tx["transaction"]["message"];
    let Some(keys) = message.get("accountKeys").and_then(Value::as_array) else {
        return Vec::new();
    };
    let header = &message["header"];
    let required = header["numRequiredSignatures"].as_u64().unwrap_or(0) as usize;
    let readonly_signed = header["numReadonlySignedAccounts"].as_u64().unwrap_or(0) as usize;
    let readonly_unsigned = header["numReadonlyUnsignedAccounts"].as_u64().unwrap_or(0) as usize;
    let mut accounts = keys
        .iter()
        .enumerate()
        .filter_map(|(index, key)| {
            message_account(
                key,
                index < required,
                raw_writable(
                    index,
                    keys.len(),
                    required,
                    readonly_signed,
                    readonly_unsigned,
                ),
            )
        })
        .collect::<Vec<_>>();
    append_loaded(
        &mut accounts,
        &tx["meta"]["loadedAddresses"],
        "writable",
        true,
    );
    append_loaded(
        &mut accounts,
        &tx["meta"]["loadedAddresses"],
        "readonly",
        false,
    );
    accounts
}

pub(super) fn instructions(tx: &Value) -> Vec<&Value> {
    let mut instructions = tx["transaction"]["message"]["instructions"]
        .as_array()
        .into_iter()
        .flatten()
        .collect::<Vec<_>>();
    instructions.extend(
        tx["meta"]["innerInstructions"]
            .as_array()
            .into_iter()
            .flatten()
            .flat_map(|group| group["instructions"].as_array().into_iter().flatten()),
    );
    instructions
}

pub(super) fn program_id<'a>(
    instruction: &'a Value,
    accounts: &'a [MessageAccount],
) -> Option<&'a str> {
    instruction
        .get("programId")
        .and_then(Value::as_str)
        .or_else(|| {
            let index = instruction.get("programIdIndex")?.as_u64()? as usize;
            accounts.get(index).map(|account| account.pubkey.as_str())
        })
}

pub(super) fn resolve_accounts<'a>(
    instruction: &Value,
    accounts: &'a [MessageAccount],
) -> Option<Vec<&'a MessageAccount>> {
    instruction
        .get("accounts")?
        .as_array()?
        .iter()
        .map(|value| {
            if let Some(index) = value.as_u64() {
                accounts.get(index as usize)
            } else {
                let pubkey = value.as_str()?;
                accounts.iter().find(|account| account.pubkey == pubkey)
            }
        })
        .collect()
}

pub(super) fn data(instruction: &Value) -> Option<&str> {
    instruction.get("data").and_then(Value::as_str)
}

pub(super) fn address_matches(data: &[u8], offset: usize, address: &str) -> bool {
    pubkey::parse(address)
        .ok()
        .is_some_and(|key| data.get(offset..offset + 32) == Some(key.as_ref()))
}

pub(super) fn read_u64(data: &[u8], offset: usize) -> Option<u64> {
    Some(u64::from_le_bytes(
        data.get(offset..offset + 8)?.try_into().ok()?,
    ))
}

pub(super) fn read_i64(data: &[u8], offset: usize) -> Option<i64> {
    Some(i64::from_le_bytes(
        data.get(offset..offset + 8)?.try_into().ok()?,
    ))
}

fn message_account(value: &Value, signer: bool, writable: bool) -> Option<MessageAccount> {
    if let Some(pubkey) = value.as_str() {
        return Some(MessageAccount {
            pubkey: pubkey.into(),
            signer,
            writable,
        });
    }
    Some(MessageAccount {
        pubkey: value.get("pubkey")?.as_str()?.to_string(),
        signer: value
            .get("signer")
            .and_then(Value::as_bool)
            .unwrap_or(signer),
        writable: value
            .get("writable")
            .and_then(Value::as_bool)
            .unwrap_or(writable),
    })
}

fn raw_writable(
    index: usize,
    count: usize,
    required: usize,
    readonly_signed: usize,
    readonly_unsigned: usize,
) -> bool {
    if index < required {
        return index < required.saturating_sub(readonly_signed);
    }
    index < count.saturating_sub(readonly_unsigned)
}

fn append_loaded(accounts: &mut Vec<MessageAccount>, loaded: &Value, field: &str, writable: bool) {
    accounts.extend(
        loaded[field]
            .as_array()
            .into_iter()
            .flatten()
            .filter_map(Value::as_str)
            .map(|pubkey| MessageAccount {
                pubkey: pubkey.into(),
                signer: false,
                writable,
            }),
    );
}
