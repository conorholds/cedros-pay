use base64::Engine;
use serde_json::{json, Value};

use super::solana::{ata_for_token_program, DerivedSubscriptionAddresses};
use super::support::ResolvedSolanaPlan;
use crate::error::{AppError, AppResult};
use crate::seams::HostSeams;
use crate::x402::{pubkey, rpc};

const TOKEN_ACCOUNT_LEN: usize = 165;

pub(super) fn preflight_initial_collection<S: HostSeams>(
    seams: &S,
    rpc_url: &str,
    wallet: &str,
    solana: &ResolvedSolanaPlan,
    addresses: &DerivedSubscriptionAddresses,
    token_program_address: &str,
) -> AppResult<()> {
    let receiver = solana.receiver_token_account.clone().unwrap_or_else(|| {
        let merchant = pubkey::parse(&solana.merchant_address).expect("validated merchant");
        let mint = pubkey::parse(&solana.token_mint).expect("validated mint");
        let token_program = pubkey::parse(token_program_address).expect("validated token program");
        ata_for_token_program(&merchant, &mint, &token_program)
    });
    let raw = seams.http_fetch(
        &build_get_multiple_accounts(
            rpc_url,
            &[
                addresses.subscriber_token_account.as_str(),
                receiver.as_str(),
            ],
        )
        .to_string(),
    )?;
    let accounts = rpc::parse_result(&raw).map_err(|error| {
        AppError::new(
            502,
            "rpc_error",
            "unable to verify Solana subscription collectability",
        )
        .with_internal(error.message)
    })?;
    let values = accounts["value"]
        .as_array()
        .ok_or_else(|| AppError::new(502, "rpc_error", "Solana account response was malformed"))?;
    let delegator = token_account(values.first(), token_program_address)?;
    let receiver = token_account(values.get(1), token_program_address)?;
    validate_delegator(wallet, solana, addresses, &delegator)?;
    if receiver.mint != solana.token_mint {
        return Err(invalid_payment_proof(
            "receiver token account mint does not match subscription mint",
        ));
    }
    Ok(())
}

fn build_get_multiple_accounts(rpc_url: &str, accounts: &[&str]) -> Value {
    json!({
        "method": "POST",
        "url": rpc_url,
        "headers": [["content-type", "application/json"]],
        "body": json!({
            "jsonrpc": "2.0",
            "id": 1,
            "method": "getMultipleAccounts",
            "params": [
                accounts,
                { "encoding": "base64", "commitment": "confirmed" }
            ],
        }).to_string(),
    })
}

struct TokenAccount {
    mint: String,
    owner: String,
    amount: u64,
    delegate: Option<String>,
    delegated_amount: u64,
}

fn token_account(value: Option<&Value>, token_program_address: &str) -> AppResult<TokenAccount> {
    let value = value
        .filter(|value| !value.is_null())
        .ok_or_else(|| invalid_payment_proof("required token account was not found"))?;
    if value["owner"].as_str() != Some(token_program_address) {
        return Err(invalid_payment_proof(
            "token account is not owned by the expected token program",
        ));
    }
    decode_token_account(&account_data(value)?)
}

fn account_data(value: &Value) -> AppResult<Vec<u8>> {
    let Some(data) = value["data"].as_array() else {
        return Err(AppError::new(
            502,
            "rpc_error",
            "Solana account data was malformed",
        ));
    };
    let encoded = data
        .first()
        .and_then(Value::as_str)
        .ok_or_else(|| AppError::new(502, "rpc_error", "Solana account data was missing"))?;
    base64::engine::general_purpose::STANDARD
        .decode(encoded)
        .map_err(|error| {
            AppError::new(502, "rpc_error", "Solana account data was invalid")
                .with_internal(error.to_string())
        })
}

fn decode_token_account(data: &[u8]) -> AppResult<TokenAccount> {
    if data.len() < TOKEN_ACCOUNT_LEN {
        return Err(invalid_payment_proof(
            "token account is shorter than the SPL token account layout",
        ));
    }
    Ok(TokenAccount {
        mint: pubkey::encode(slice_key(data, 0)?),
        owner: pubkey::encode(slice_key(data, 32)?),
        amount: read_u64(data, 64)?,
        delegate: read_option_key(data, 72)?,
        delegated_amount: read_u64(data, 121)?,
    })
}

fn validate_delegator(
    wallet: &str,
    solana: &ResolvedSolanaPlan,
    addresses: &DerivedSubscriptionAddresses,
    token: &TokenAccount,
) -> AppResult<()> {
    let amount = u64::try_from(solana.amount_atomic).map_err(|_| invalid_metadata())?;
    if token.mint != solana.token_mint {
        return Err(invalid_payment_proof(
            "subscriber token account mint does not match subscription mint",
        ));
    }
    if token.owner != wallet {
        return Err(invalid_payment_proof(
            "subscriber token account owner does not match subscription wallet",
        ));
    }
    if token.amount < amount {
        return Err(invalid_payment_proof(
            "subscriber balance is below the collectible amount",
        ));
    }
    if token.delegate.as_deref() != Some(addresses.subscription_authority_address.as_str()) {
        return Err(invalid_payment_proof(
            "subscriber token account is not delegated to the subscription authority",
        ));
    }
    if token.delegated_amount < amount {
        return Err(invalid_payment_proof(
            "subscriber delegated amount is below the collectible amount",
        ));
    }
    Ok(())
}

fn slice_key(data: &[u8], offset: usize) -> AppResult<&pubkey::Pubkey> {
    data.get(offset..offset + 32)
        .and_then(|bytes| bytes.try_into().ok())
        .ok_or_else(|| invalid_payment_proof("token account data could not be decoded"))
}

fn read_u64(data: &[u8], offset: usize) -> AppResult<u64> {
    data.get(offset..offset + 8)
        .and_then(|bytes| bytes.try_into().ok())
        .map(u64::from_le_bytes)
        .ok_or_else(|| invalid_payment_proof("token account data could not be decoded"))
}

fn read_option_key(data: &[u8], offset: usize) -> AppResult<Option<String>> {
    let tag = data
        .get(offset..offset + 4)
        .and_then(|bytes| bytes.try_into().ok())
        .map(u32::from_le_bytes)
        .ok_or_else(|| invalid_payment_proof("token account data could not be decoded"))?;
    if tag == 0 {
        Ok(None)
    } else {
        Ok(Some(pubkey::encode(slice_key(data, offset + 4)?)))
    }
}

fn invalid_metadata() -> AppError {
    AppError::new(
        422,
        "invalid_resource",
        "plan has invalid Solana subscription metadata",
    )
}

fn invalid_payment_proof(message: &'static str) -> AppError {
    AppError::new(422, "invalid_payment_proof", message)
}
