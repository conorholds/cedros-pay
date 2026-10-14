//! Require exact token balance effects, not merely a successful instruction.

use serde_json::Value;

use super::super::{ata, pubkey, transaction::ParsedTransaction, transfer};

pub(super) fn verify(tx: &ParsedTransaction, result: &Value) -> Result<(), &'static str> {
    let (payment, _) = transfer::extract_canonical_transfer(tx)?;
    if !transfer::transfer_authority_is_required_signer(tx, &payment.authority) {
        return Err("transfer authority is not a signer");
    }
    let source = tx
        .account_keys
        .iter()
        .position(|key| *key == payment.source)
        .ok_or("transfer source missing")?;
    let destination = tx
        .account_keys
        .iter()
        .position(|key| *key == payment.destination)
        .ok_or("transfer destination missing")?;
    let pre_source = balance(result, "preTokenBalances", source, &payment)?;
    let post_source = balance(result, "postTokenBalances", source, &payment)?;
    let pre_destination = balance(result, "preTokenBalances", destination, &payment)?;
    let post_destination = balance(result, "postTokenBalances", destination, &payment)?;
    if pre_source.0.checked_sub(post_source.0) != Some(payment.amount)
        || post_destination.0.checked_sub(pre_destination.0) != Some(payment.amount)
        || pre_source.1 != payment.authority
        || post_source.1 != payment.authority
        || pre_destination.1 != post_destination.1
        || ata::derive_token_account_bytes(&post_destination.1, &payment.mint)
            != payment.destination
    {
        return Err("token balances do not prove the authorized payment");
    }
    Ok(())
}

fn balance(
    result: &Value,
    field: &str,
    index: usize,
    payment: &transfer::TransferDetails,
) -> Result<(u64, pubkey::Pubkey), &'static str> {
    let rows = result["meta"][field]
        .as_array()
        .ok_or("token balances missing")?;
    let mut matches = rows
        .iter()
        .filter(|row| row["accountIndex"].as_u64() == Some(index as u64));
    let row = matches.next().ok_or("token account balance missing")?;
    if matches.next().is_some()
        || row["mint"].as_str() != Some(pubkey::encode(&payment.mint).as_str())
        || row["programId"].as_str() != Some("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
        || row["uiTokenAmount"]["decimals"].as_u64() != Some(u64::from(payment.decimals))
    {
        return Err("token balance identity is invalid");
    }
    let amount = row["uiTokenAmount"]["amount"]
        .as_str()
        .ok_or("atomic token amount missing")?;
    if amount.is_empty() || !amount.bytes().all(|byte| byte.is_ascii_digit()) {
        return Err("atomic token amount is invalid");
    }
    let amount = amount
        .parse::<u64>()
        .map_err(|_| "atomic token amount overflow")?;
    let owner = pubkey::parse(row["owner"].as_str().ok_or("token owner missing")?)?;
    Ok((amount, owner))
}
