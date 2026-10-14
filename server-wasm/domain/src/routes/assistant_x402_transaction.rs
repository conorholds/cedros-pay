use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use ed25519_dalek::{Signature, VerifyingKey};
use serde::Deserialize;
use sha2::{Digest, Sha256};

use crate::blockchain_config::AssistantX402Control;
use crate::x402::{ata, pubkey, transaction};

use super::discovery::Requirement;

const TOKEN_PROGRAM: &str = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const MEMO_PROGRAM: &str = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";
const MAX_TRANSACTION_BYTES: usize = 1_232;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct SignResponse {
    pub(super) wallet_id: String,
    pub(super) wallet_version_id: String,
    pub(super) transaction_sha256: String,
    pub(super) signed_transaction_base64: String,
    pub(super) signature: String,
    pub(super) policy_decision_id: String,
    pub(super) signed_at: String,
}

pub(super) struct UnsignedTransaction {
    pub(super) wire_base64: String,
    pub(super) sha256: String,
}

pub(super) fn build(
    control: &AssistantX402Control,
    requirement: &Requirement,
    blockhash: &str,
) -> Result<UnsignedTransaction, &'static str> {
    let payer = pubkey::parse(&control.public_key).map_err(|_| "invalid payer")?;
    let source = pubkey::parse(
        &ata::derive_token_account(&control.public_key, &requirement.asset)
            .map_err(|_| "invalid source token account")?,
    )
    .map_err(|_| "invalid source token account")?;
    let destination = pubkey::parse(&requirement.recipient_token_account)
        .map_err(|_| "invalid destination token account")?;
    let mint = pubkey::parse(&requirement.asset).map_err(|_| "invalid token mint")?;
    let token = pubkey::parse(TOKEN_PROGRAM).expect("valid token program");
    let memo = pubkey::parse(MEMO_PROGRAM).expect("valid memo program");
    let recent = pubkey::parse(blockhash).map_err(|_| "invalid recent blockhash")?;
    let account_keys = vec![payer, source, destination, mint, token, memo];
    let mut transfer_data = vec![12];
    transfer_data.extend_from_slice(&requirement.amount.to_le_bytes());
    transfer_data.push(requirement.decimals);
    let instructions = vec![
        transaction::CompiledInstruction {
            program_id_index: 4,
            accounts: vec![1, 3, 2, 0],
            data: transfer_data,
        },
        transaction::CompiledInstruction {
            program_id_index: 5,
            accounts: Vec::new(),
            data: requirement.memo.as_bytes().to_vec(),
        },
    ];
    let message = transaction::build_legacy_message(1, 0, 3, &account_keys, &recent, &instructions);
    let parsed = transaction::ParsedTransaction {
        signatures: vec![[0; 64]],
        num_required_signatures: 1,
        account_keys,
        recent_blockhash: recent,
        instructions,
        message_bytes: message,
        version: None,
        has_address_table_lookups: false,
    };
    let bytes = parsed.serialize();
    if bytes.len() > MAX_TRANSACTION_BYTES {
        return Err("assistant x402 transaction is too large");
    }
    Ok(UnsignedTransaction {
        wire_base64: BASE64.encode(&bytes),
        sha256: hex::encode(Sha256::digest(&bytes)),
    })
}

pub(super) fn validate_signed(
    control: &AssistantX402Control,
    unsigned_base64: &str,
    transaction_sha256: &str,
    response: &SignResponse,
) -> Result<(), &'static str> {
    let signed_base64 = response.signed_transaction_base64.trim();
    if response.wallet_id != control.wallet_id
        || response.wallet_version_id != control.wallet_version_id
        || response.transaction_sha256 != transaction_sha256
        || !(1..=512).contains(&response.policy_decision_id.len())
        || response.policy_decision_id.chars().any(char::is_control)
        || response.policy_decision_id != response.policy_decision_id.trim()
        || !(1..=128).contains(&response.signed_at.len())
        || response.signed_at.chars().any(char::is_control)
        || response.signed_at != response.signed_at.trim()
        || response.signed_transaction_base64 != signed_base64
        || signed_base64.len() > 1_648
    {
        return Err("signer response references do not match");
    }
    let unsigned_bytes = BASE64
        .decode(unsigned_base64)
        .map_err(|_| "invalid unsigned transaction")?;
    let signed_bytes = BASE64
        .decode(signed_base64)
        .map_err(|_| "invalid signed transaction")?;
    if signed_bytes.len() != unsigned_bytes.len() || signed_bytes.len() > MAX_TRANSACTION_BYTES {
        return Err("signed transaction size changed");
    }
    let unsigned =
        transaction::parse(&unsigned_bytes).map_err(|_| "invalid unsigned transaction")?;
    let signed = transaction::parse(&signed_bytes).map_err(|_| "invalid signed transaction")?;
    let signature = signed.signatures.first().ok_or("missing payer signature")?;
    let payer = signed.account_keys.first().ok_or("missing payer")?;
    if unsigned.message_bytes != signed.message_bytes
        || unsigned.account_keys != signed.account_keys
        || signed.signatures.len() != 1
        || pubkey::encode_signature(signature) != response.signature
        || VerifyingKey::from_bytes(payer).is_err()
        || !VerifyingKey::from_bytes(payer).is_ok_and(|key| {
            key.verify_strict(&signed.message_bytes, &Signature::from_bytes(signature))
                .is_ok()
        })
        || pubkey::encode(payer) != control.public_key
    {
        return Err("signer changed or invalidated the transaction");
    }
    Ok(())
}

pub(super) fn payment_header(
    requirement: &Requirement,
    payer_public_key: &str,
    signed_base64: &str,
    signature: &str,
) -> String {
    BASE64.encode(
        serde_json::json!({
            "x402Version": 0,
            "scheme": requirement.scheme,
            "network": requirement.network,
            "payload": {
                "signature": signature,
                "transaction": signed_base64,
                "payer": payer_public_key,
                "resource": requirement.resource,
                "memo": requirement.memo,
                "recipientTokenAccount": requirement.recipient_token_account,
            }
        })
        .to_string(),
    )
}
