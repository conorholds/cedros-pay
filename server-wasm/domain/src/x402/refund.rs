//! Core-managed x402 refund transaction construction and response validation.
//!
//! Pay constructs the only transaction Core may sign: one classic SPL
//! `TransferChecked` from the managed operational wallet to the original payer,
//! followed by the contract-defined refund memo. Core owns signing and broadcast;
//! Pay persists the unsigned request before egress and accepts signed evidence only
//! when every message byte is unchanged.

use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use ed25519_dalek::{Signature, VerifyingKey};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

use crate::blockchain_config::ManagedX402Signer;

use super::{ata, pubkey, transaction};

const TOKEN_PROGRAM: &str = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const MEMO_PROGRAM: &str = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";
const CONTRACT_VERSION: &str = "1.0.0";
const MAX_TRANSACTION_BYTES: usize = 1_232;
const MAX_SAFE_JSON_INTEGER: u64 = 9_007_199_254_740_991;
pub const MAX_FEE_LAMPORTS: u64 = 5_000;

#[derive(Debug, Clone, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RefundRequest {
    pub refund_id: String,
    pub expected_wallet_version_id: String,
    pub cluster: String,
    pub serialized_transaction_base64: String,
    pub transaction_sha256: String,
    pub recent_blockhash: String,
    pub payment_mint: String,
    pub refund_amount_microunits: u64,
    pub token_decimals: u8,
    pub original_payer: String,
    pub original_payment_signature: String,
    pub max_fee_lamports: u64,
}

#[derive(Debug, Clone, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RefundResponse {
    pub contract_version: String,
    pub operation_id: Option<String>,
    pub refund_id: String,
    pub status: String,
    pub error_code: Option<String>,
    pub retryable: bool,
    pub signature: Option<String>,
    pub signed_transaction_base64: Option<String>,
    pub transaction_sha256: Option<String>,
    pub recent_blockhash: Option<String>,
    pub network: String,
    pub cluster: String,
    pub wallet_id: Option<String>,
    pub wallet_version_id: Option<String>,
    pub policy_decision_id: Option<String>,
    pub signed_at: Option<String>,
    pub replayed: bool,
}

impl RefundResponse {
    pub fn has_signed_evidence(&self) -> bool {
        self.signature.is_some() && self.signed_transaction_base64.is_some()
    }
}

pub fn build_request(
    signer: &ManagedX402Signer,
    refund_id: &str,
    recent_blockhash: &str,
    payment_mint: &str,
    refund_amount_microunits: u64,
    token_decimals: u8,
    original_payer: &str,
    original_payment_signature: &str,
) -> Result<RefundRequest, &'static str> {
    if refund_id.len() < 16 || !safe_identifier(refund_id, 180) {
        return Err("refund id is outside the Core contract range");
    }
    if refund_amount_microunits == 0 || refund_amount_microunits > MAX_SAFE_JSON_INTEGER {
        return Err("refund amount is outside the Core contract range");
    }
    if token_decimals > 9 {
        return Err("refund token decimals are outside the Core contract range");
    }
    let payer = pubkey::parse(&signer.public_key).map_err(|_| "invalid managed refund wallet")?;
    let recipient = pubkey::parse(original_payer).map_err(|_| "invalid original payer")?;
    let mint = pubkey::parse(payment_mint).map_err(|_| "invalid refund mint")?;
    let blockhash = pubkey::parse(recent_blockhash).map_err(|_| "invalid recent blockhash")?;
    if original_payment_signature != original_payment_signature.trim()
        || bs58::decode(original_payment_signature)
            .into_vec()
            .ok()
            .is_none_or(|bytes| bytes.len() != 64)
    {
        return Err("invalid original payment signature");
    }
    let memo = format!("cedros:x402:refund:{refund_id}");
    let transaction = build_transaction(
        &payer,
        &recipient,
        &mint,
        refund_amount_microunits,
        token_decimals,
        &blockhash,
        &memo,
    );
    let bytes = transaction.serialize();
    if bytes.is_empty() || bytes.len() > MAX_TRANSACTION_BYTES {
        return Err("refund transaction is too large");
    }
    Ok(RefundRequest {
        refund_id: refund_id.to_string(),
        expected_wallet_version_id: signer.wallet_version_id.clone(),
        cluster: signer.cluster.clone(),
        serialized_transaction_base64: BASE64.encode(&bytes),
        transaction_sha256: hex::encode(Sha256::digest(&bytes)),
        recent_blockhash: recent_blockhash.to_string(),
        payment_mint: payment_mint.to_string(),
        refund_amount_microunits,
        token_decimals,
        original_payer: original_payer.to_string(),
        original_payment_signature: original_payment_signature.to_string(),
        max_fee_lamports: MAX_FEE_LAMPORTS,
    })
}

pub fn validate_response(
    raw: &str,
    request: &RefundRequest,
    expected_wallet_id: &str,
    expected_signer_public_key: &str,
) -> Result<RefundResponse, &'static str> {
    let response: RefundResponse =
        serde_json::from_str(raw).map_err(|_| "invalid refund signer response")?;
    if response.contract_version != CONTRACT_VERSION
        || response.refund_id != request.refund_id
        || response.network != "solana"
        || response.cluster != request.cluster
        || response.wallet_version_id.as_deref()
            != Some(request.expected_wallet_version_id.as_str())
    {
        return Err("refund signer response references do not match");
    }
    if !matches!(
        response.status.as_str(),
        "submitted" | "indeterminate" | "failed"
    ) || response
        .error_code
        .as_deref()
        .is_some_and(|value| !safe_identifier(value, 128))
    {
        return Err("refund signer response status is invalid");
    }
    match response.status.as_str() {
        "submitted" if response.retryable || response.error_code.is_some() => {
            return Err("submitted refund signer response is inconsistent");
        }
        "indeterminate" if !response.retryable || response.error_code.is_none() => {
            return Err("indeterminate refund signer response is inconsistent");
        }
        "failed" if response.error_code.is_none() => {
            return Err("failed refund signer response omitted its error code");
        }
        _ => {}
    }

    let evidence_fields = [
        response.signature.is_some(),
        response.signed_transaction_base64.is_some(),
        response.transaction_sha256.is_some(),
        response.recent_blockhash.is_some(),
        response.policy_decision_id.is_some(),
        response.signed_at.is_some(),
    ];
    if evidence_fields.iter().any(|present| *present)
        && evidence_fields.iter().any(|present| !*present)
    {
        return Err("refund signer response has partial evidence");
    }
    if matches!(response.status.as_str(), "submitted" | "indeterminate")
        && !response.has_signed_evidence()
    {
        return Err("refund signer response omitted signed evidence");
    }
    match response.error_code.as_deref() {
        Some("refund_signer_unavailable")
            if !response.retryable || response.has_signed_evidence() =>
        {
            return Err("refund signer unavailable response is inconsistent");
        }
        Some("wallet_rotated_or_unavailable" | "mint_not_allowed" | "refund_policy_denied")
            if response.retryable || response.has_signed_evidence() =>
        {
            return Err("refund policy failure response is inconsistent");
        }
        Some("insufficient_balance") if !response.retryable || !response.has_signed_evidence() => {
            return Err("insufficient balance response omitted reusable signed evidence");
        }
        Some("blockhash_expired") if response.retryable || !response.has_signed_evidence() => {
            return Err("expired blockhash response is inconsistent");
        }
        Some("broadcast_ambiguous" | "rpc_response_ambiguous")
            if response.status != "indeterminate"
                || !response.retryable
                || !response.has_signed_evidence() =>
        {
            return Err("ambiguous broadcast response is inconsistent");
        }
        _ => {}
    }
    if response.has_signed_evidence() {
        validate_signed_evidence(
            request,
            &response,
            expected_wallet_id,
            expected_signer_public_key,
        )?;
    } else if response
        .wallet_id
        .as_deref()
        .is_some_and(|id| id != expected_wallet_id)
    {
        return Err("refund signer response wallet does not match");
    }
    Ok(response)
}

fn build_transaction(
    managed_wallet: &pubkey::Pubkey,
    original_payer: &pubkey::Pubkey,
    mint: &pubkey::Pubkey,
    amount: u64,
    decimals: u8,
    recent_blockhash: &pubkey::Pubkey,
    memo: &str,
) -> transaction::ParsedTransaction {
    let source = ata::derive_token_account_bytes(managed_wallet, mint);
    let destination = ata::derive_token_account_bytes(original_payer, mint);
    let token = pubkey::parse(TOKEN_PROGRAM).expect("valid token program");
    let memo_program = pubkey::parse(MEMO_PROGRAM).expect("valid memo program");
    let account_keys = vec![
        *managed_wallet,
        source,
        destination,
        *mint,
        token,
        memo_program,
    ];
    let mut transfer_data = vec![12];
    transfer_data.extend_from_slice(&amount.to_le_bytes());
    transfer_data.push(decimals);
    let instructions = vec![
        transaction::CompiledInstruction {
            program_id_index: 4,
            accounts: vec![1, 3, 2, 0],
            data: transfer_data,
        },
        transaction::CompiledInstruction {
            program_id_index: 5,
            accounts: Vec::new(),
            data: memo.as_bytes().to_vec(),
        },
    ];
    let message_bytes =
        transaction::build_legacy_message(1, 0, 3, &account_keys, recent_blockhash, &instructions);
    transaction::ParsedTransaction {
        signatures: vec![[0; 64]],
        num_required_signatures: 1,
        account_keys,
        recent_blockhash: *recent_blockhash,
        instructions,
        message_bytes,
        version: None,
        has_address_table_lookups: false,
    }
}

fn validate_signed_evidence(
    request: &RefundRequest,
    response: &RefundResponse,
    expected_wallet_id: &str,
    expected_signer_public_key: &str,
) -> Result<(), &'static str> {
    if response
        .operation_id
        .as_deref()
        .is_none_or(|id| !safe_text(id, 128))
        || response.wallet_id.as_deref() != Some(expected_wallet_id)
        || response.transaction_sha256.as_deref() != Some(request.transaction_sha256.as_str())
        || response.recent_blockhash.as_deref() != Some(request.recent_blockhash.as_str())
        || response
            .policy_decision_id
            .as_deref()
            .is_none_or(|value| !safe_text(value, 512))
        || response
            .signed_at
            .as_deref()
            .is_none_or(|value| !safe_text(value, 128) || crate::time::parse_iso(value).is_none())
    {
        return Err("refund signer evidence references do not match");
    }
    let unsigned_bytes = BASE64
        .decode(request.serialized_transaction_base64.trim())
        .map_err(|_| "invalid stored unsigned refund transaction")?;
    let signed_bytes = BASE64
        .decode(
            response
                .signed_transaction_base64
                .as_deref()
                .ok_or("missing signed refund transaction")?,
        )
        .map_err(|_| "invalid signed refund transaction")?;
    if hex::encode(Sha256::digest(&unsigned_bytes)) != request.transaction_sha256 {
        return Err("stored unsigned refund transaction digest does not match");
    }
    if unsigned_bytes.len() != signed_bytes.len() || signed_bytes.len() > MAX_TRANSACTION_BYTES {
        return Err("signed refund transaction size changed");
    }
    let unsigned = transaction::parse(&unsigned_bytes)
        .map_err(|_| "invalid stored unsigned refund transaction")?;
    let signed =
        transaction::parse(&signed_bytes).map_err(|_| "invalid signed refund transaction")?;
    let signature = signed
        .signatures
        .first()
        .ok_or("missing refund signature")?;
    let payer = signed.fee_payer().ok_or("missing refund fee payer")?;
    let key = VerifyingKey::from_bytes(payer).map_err(|_| "invalid refund fee payer")?;
    if unsigned.message_bytes != signed.message_bytes
        || unsigned.signatures.len() != 1
        || signed.signatures.len() != 1
        || pubkey::encode(&unsigned.recent_blockhash) != request.recent_blockhash
        || pubkey::encode(payer) != expected_signer_public_key
        || pubkey::encode_signature(signature)
            != response
                .signature
                .as_deref()
                .ok_or("missing refund signature")?
        || key
            .verify_strict(&signed.message_bytes, &Signature::from_bytes(signature))
            .is_err()
    {
        return Err("refund signer changed or invalidated the transaction");
    }
    Ok(())
}

fn safe_identifier(value: &str, max: usize) -> bool {
    !value.is_empty()
        && value.len() <= max
        && value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'_' | b'-' | b'.' | b':'))
}

fn safe_text(value: &str, max: usize) -> bool {
    !value.is_empty()
        && value.len() <= max
        && value == value.trim()
        && !value.chars().any(char::is_control)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::x402::transfer;
    use ed25519_dalek::{Signer, SigningKey};

    const BUYER: &str = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
    const MINT: &str = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

    fn fixture() -> (SigningKey, ManagedX402Signer, RefundRequest) {
        let signing = SigningKey::from_bytes(&[0x11; 32]);
        let signer = ManagedX402Signer {
            wallet_id: "wallet-id".into(),
            wallet_version_id: "wallet-version".into(),
            public_key: pubkey::encode(&signing.verifying_key().to_bytes()),
            cluster: "mainnet-beta".into(),
        };
        let original_signature = bs58::encode([9u8; 64]).into_string();
        let request = build_request(
            &signer,
            "refund_0123456789abcdef",
            "11111111111111111111111111111111",
            MINT,
            2_500_000,
            6,
            BUYER,
            &original_signature,
        )
        .unwrap();
        (signing, signer, request)
    }

    fn signed_response(
        signing: &SigningKey,
        signer: &ManagedX402Signer,
        request: &RefundRequest,
    ) -> String {
        let bytes = BASE64
            .decode(&request.serialized_transaction_base64)
            .unwrap();
        let mut transaction = transaction::parse(&bytes).unwrap();
        transaction.signatures[0] = signing.sign(&transaction.message_bytes).to_bytes();
        serde_json::json!({
            "contractVersion": CONTRACT_VERSION,
            "operationId": "operation-id",
            "refundId": request.refund_id,
            "status": "submitted",
            "errorCode": null,
            "retryable": false,
            "signature": pubkey::encode_signature(&transaction.signatures[0]),
            "signedTransactionBase64": BASE64.encode(transaction.serialize()),
            "transactionSha256": request.transaction_sha256,
            "recentBlockhash": request.recent_blockhash,
            "network": "solana",
            "cluster": request.cluster,
            "walletId": signer.wallet_id,
            "walletVersionId": signer.wallet_version_id,
            "policyDecisionId": "policy-id",
            "signedAt": "2026-09-16T00:00:00Z",
            "replayed": false
        })
        .to_string()
    }

    #[test]
    fn builds_exact_refund_transfer_and_memo() {
        let (_, signer, request) = fixture();
        let bytes = BASE64
            .decode(&request.serialized_transaction_base64)
            .unwrap();
        let parsed = transaction::parse(&bytes).unwrap();
        let (details, memo) = transfer::extract_canonical_transfer(&parsed).unwrap();
        assert_eq!(
            pubkey::encode(parsed.fee_payer().unwrap()),
            signer.public_key
        );
        assert_eq!(details.amount, 2_500_000);
        assert_eq!(details.decimals, 6);
        assert_eq!(pubkey::encode(&details.mint), MINT);
        assert_eq!(memo, "cedros:x402:refund:refund_0123456789abcdef");
        assert_eq!(request.max_fee_lamports, 5_000);
    }

    #[test]
    fn accepts_only_the_exact_core_signed_message() {
        let (signing, signer, request) = fixture();
        let raw = signed_response(&signing, &signer, &request);
        assert!(validate_response(&raw, &request, &signer.wallet_id, &signer.public_key).is_ok());

        let mut changed: serde_json::Value = serde_json::from_str(&raw).unwrap();
        changed["recentBlockhash"] = serde_json::json!("changed");
        assert!(validate_response(
            &changed.to_string(),
            &request,
            &signer.wallet_id,
            &signer.public_key
        )
        .is_err());

        let mut corrupted_request = request.clone();
        corrupted_request.transaction_sha256 = "00".repeat(32);
        let mut matching_lie: serde_json::Value = serde_json::from_str(&raw).unwrap();
        matching_lie["transactionSha256"] = serde_json::json!(corrupted_request.transaction_sha256);
        assert!(validate_response(
            &matching_lie.to_string(),
            &corrupted_request,
            &signer.wallet_id,
            &signer.public_key
        )
        .is_err());

        let mut unsafe_retry: serde_json::Value = serde_json::from_str(&raw).unwrap();
        unsafe_retry["status"] = serde_json::json!("failed");
        unsafe_retry["errorCode"] = serde_json::json!("insufficient_balance");
        unsafe_retry["retryable"] = serde_json::json!(true);
        for field in [
            "signature",
            "signedTransactionBase64",
            "transactionSha256",
            "recentBlockhash",
            "policyDecisionId",
            "signedAt",
        ] {
            unsafe_retry[field] = serde_json::Value::Null;
        }
        assert!(validate_response(
            &unsafe_retry.to_string(),
            &request,
            &signer.wallet_id,
            &signer.public_key
        )
        .is_err());
    }
}
