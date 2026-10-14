//! Policy-bound managed fee-payer signing for x402 transactions.
//!
//! Pay validates the complete buyer-authorized transaction first, hashes the
//! exact serialized bytes, and asks Core/Vault to fill only signer slot zero.
//! The returned transaction is accepted only when every message byte and every
//! non-fee-payer signature is unchanged.

use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use serde::Deserialize;
use serde_json::json;
use sha2::{Digest, Sha256};

use crate::blockchain_config::{ManagedX402Signer, X402Control};
use crate::ids;
use crate::seams::HostSeams;

use super::{gasless, pubkey, transaction, transfer, verifier::Requirement};

const MAX_TRANSACTION_BYTES: usize = 1_232;
const LAMPORTS_PER_SIGNATURE: u64 = 5_000;
const MAX_X402_FEE_LAMPORTS: u64 = 10_000;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SignResponse {
    wallet_id: String,
    wallet_version_id: String,
    transaction_sha256: String,
    signed_transaction_base64: String,
    signature: String,
    policy_decision_id: String,
    signed_at: String,
}

/// Sign a managed gasless proof and return only Core/Vault's validated signed
/// transaction. Amount and mint precision are always exact; the retained
/// `_exact_amount` parameter preserves the existing caller API.
pub fn sign<S: HostSeams>(
    seams: &S,
    transaction_base64: &str,
    requirement: &Requirement,
    control: &X402Control,
    _exact_amount: bool,
) -> Result<String, &'static str> {
    let signer = control
        .managed_signer
        .as_ref()
        .ok_or("managed signer is unavailable")?;
    let bytes = BASE64
        .decode(transaction_base64.trim())
        .map_err(|_| "invalid transaction encoding")?;
    if bytes.is_empty() || bytes.len() > MAX_TRANSACTION_BYTES {
        return Err("managed transaction size is invalid");
    }
    let parsed = transaction::parse(&bytes).map_err(|_| "malformed transaction proof")?;
    if parsed.serialize() != bytes {
        return Err("managed transaction encoding is not canonical");
    }
    let intent = validate_unsigned(&parsed, requirement, signer)?;
    let transaction_sha256 = hex::encode(Sha256::digest(&bytes));
    let (request_id, idempotency_key) = request_identity(&intent.authority, &intent.memo);
    let max_lamports = LAMPORTS_PER_SIGNATURE
        .checked_mul(u64::from(parsed.num_required_signatures))
        .filter(|value| *value > 0 && *value <= MAX_X402_FEE_LAMPORTS)
        .ok_or("managed transaction fee cap is invalid")?;
    let payload = json!({
        "walletId": signer.wallet_id,
        "walletVersionId": signer.wallet_version_id,
        "cluster": signer.cluster,
        "serializedTransactionBase64": BASE64.encode(&bytes),
        "transactionSha256": transaction_sha256,
        "payTo": control.pay_to,
        "maxLamports": max_lamports,
        "requestId": request_id,
        "idempotencyKey": idempotency_key,
    });
    let raw = seams
        .provider_execute(
            ids::PROVIDER_BLOCKCHAIN_X402_SIGN,
            ids::PROVIDER_BLOCKCHAIN,
            ids::OP_BLOCKCHAIN_X402_SIGN,
            &payload.to_string(),
        )
        .map_err(|_| "managed signer is unavailable")?;
    let response: SignResponse =
        serde_json::from_str(&raw).map_err(|_| "managed signer response is invalid")?;
    validate_response(&parsed, signer, &transaction_sha256, response)
}

struct ValidatedIntent {
    authority: String,
    memo: String,
}

fn validate_unsigned(
    parsed: &transaction::ParsedTransaction,
    requirement: &Requirement,
    signer: &ManagedX402Signer,
) -> Result<ValidatedIntent, &'static str> {
    if parsed.num_required_signatures != 2
        || parsed.has_address_table_lookups
        || parsed.signatures.first() != Some(&[0; 64])
        || parsed.fee_payer().map(pubkey::encode).as_deref() != Some(signer.public_key.as_str())
        || !transfer::verify_non_fee_payer_signatures(parsed)
    {
        return Err("managed transaction signer references are invalid");
    }
    gasless::validate_programs(parsed)?;
    let (details, memo) = transfer::extract_canonical_transfer(parsed)?;
    let expected_mint = pubkey::parse(&requirement.token_mint)
        .map_err(|_| "managed transaction token mint is invalid")?;
    let expected_destination = pubkey::parse(&requirement.recipient_token_account)
        .map_err(|_| "managed transaction destination is invalid")?;
    let required = usize::from(parsed.num_required_signatures);
    if details.mint != expected_mint
        || details.destination != expected_destination
        || details.amount != requirement.min_amount_atomic
        || details.decimals != requirement.decimals
        || !parsed.account_keys[1..required].contains(&details.authority)
        || requirement.resource_id.as_ref().is_some_and(|resource| {
            !memo
                .split(';')
                .any(|field| field == super::verifier::expected_memo(resource))
        })
    {
        return Err("managed transaction does not match the x402 intent");
    }
    Ok(ValidatedIntent {
        authority: pubkey::encode(&details.authority),
        memo,
    })
}

fn request_identity(authority: &str, memo: &str) -> (String, String) {
    let mut digest = Sha256::new();
    digest.update(b"cedros-pay-managed-x402-intent\0");
    hash_part(&mut digest, authority);
    hash_part(&mut digest, memo);
    let identity = hex::encode(digest.finalize());
    (
        format!("cedros-pay-x402-request-{identity}"),
        format!("cedros-pay-x402-sign-{identity}"),
    )
}

fn hash_part(digest: &mut Sha256, value: &str) {
    digest.update((value.len() as u64).to_be_bytes());
    digest.update(value.as_bytes());
}

fn validate_response(
    unsigned: &transaction::ParsedTransaction,
    signer: &ManagedX402Signer,
    transaction_sha256: &str,
    response: SignResponse,
) -> Result<String, &'static str> {
    if response.wallet_id != signer.wallet_id
        || response.wallet_version_id != signer.wallet_version_id
        || response.transaction_sha256 != transaction_sha256
        || response.policy_decision_id.trim().is_empty()
        || response.signed_at.trim().is_empty()
    {
        return Err("managed signer response references do not match");
    }
    let signed_bytes = BASE64
        .decode(response.signed_transaction_base64.trim())
        .map_err(|_| "managed signed transaction encoding is invalid")?;
    if signed_bytes.len() != unsigned.serialize().len()
        || signed_bytes.len() > MAX_TRANSACTION_BYTES
    {
        return Err("managed signed transaction size is invalid");
    }
    let signed =
        transaction::parse(&signed_bytes).map_err(|_| "managed signed transaction is malformed")?;
    if signed.message_bytes != unsigned.message_bytes
        || signed.signatures.len() != unsigned.signatures.len()
        || signed.signatures.get(1..) != unsigned.signatures.get(1..)
        || !transfer::verify_required_signatures(&signed)
        || signed
            .signatures
            .first()
            .map(pubkey::encode_signature)
            .as_deref()
            != Some(response.signature.as_str())
    {
        return Err("managed signer changed or invalidated the transaction");
    }
    Ok(response.signed_transaction_base64)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::fake::FakeSeams;
    use ed25519_dalek::{Signer, SigningKey};

    const PAY_TO: &str = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
    const MINT: &str = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
    const TOKEN_PROGRAM: &str = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
    const MEMO_PROGRAM: &str = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";
    const AMOUNT: u64 = 1_500_000;

    struct Fixture {
        operational: SigningKey,
        partial: transaction::ParsedTransaction,
        partial_base64: String,
        requirement: Requirement,
        control: X402Control,
    }

    fn fixture(blockhash_byte: u8) -> Fixture {
        let operational = SigningKey::from_bytes(&[0x11; 32]);
        let buyer = SigningKey::from_bytes(&[0x22; 32]);
        let operational_key = operational.verifying_key().to_bytes();
        let buyer_key = buyer.verifying_key().to_bytes();
        let mint = pubkey::parse(MINT).unwrap();
        let destination =
            pubkey::parse(&super::super::ata::derive_token_account(PAY_TO, MINT).unwrap()).unwrap();
        let token_program = pubkey::parse(TOKEN_PROGRAM).unwrap();
        let memo_program = pubkey::parse(MEMO_PROGRAM).unwrap();
        let account_keys = vec![
            operational_key,
            buyer_key,
            [0x33; 32],
            destination,
            mint,
            token_program,
            memo_program,
        ];
        let mut transfer_data = vec![12];
        transfer_data.extend_from_slice(&AMOUNT.to_le_bytes());
        transfer_data.push(6);
        let instructions = vec![
            transaction::CompiledInstruction {
                program_id_index: 5,
                accounts: vec![2, 4, 3, 1],
                data: transfer_data,
            },
            transaction::CompiledInstruction {
                program_id_index: 6,
                accounts: Vec::new(),
                data: b"resource=prod_1;request=stable-request".to_vec(),
            },
        ];
        let blockhash = [blockhash_byte; 32];
        let message =
            transaction::build_legacy_message(2, 1, 3, &account_keys, &blockhash, &instructions);
        let partial = transaction::ParsedTransaction {
            signatures: vec![[0; 64], buyer.sign(&message).to_bytes()],
            num_required_signatures: 2,
            account_keys,
            recent_blockhash: blockhash,
            instructions,
            message_bytes: message,
            version: None,
            has_address_table_lookups: false,
        };
        let partial_base64 = BASE64.encode(partial.serialize());
        Fixture {
            operational,
            partial,
            partial_base64,
            requirement: Requirement {
                recipient_token_account: pubkey::encode(&destination),
                token_mint: MINT.into(),
                min_amount_atomic: AMOUNT,
                decimals: 6,
                resource_id: Some("prod_1".into()),
            },
            control: X402Control {
                pay_to: PAY_TO.into(),
                network: "devnet".into(),
                rpc_url: "https://rpc.example".into(),
                managed_signer: Some(ManagedX402Signer {
                    wallet_id: "00000000-0000-0000-0000-000000000001".into(),
                    wallet_version_id: "00000000-0000-0000-0000-000000000002".into(),
                    public_key: pubkey::encode(&operational_key),
                    cluster: "devnet".into(),
                }),
            },
        }
    }

    fn response(fixture: &Fixture) -> serde_json::Value {
        let mut signed = fixture.partial.clone();
        signed.signatures[0] = fixture
            .operational
            .sign(&fixture.partial.message_bytes)
            .to_bytes();
        let signed_transaction_base64 = BASE64.encode(signed.serialize());
        json!({
            "walletId": fixture.control.managed_signer.as_ref().unwrap().wallet_id,
            "walletVersionId": fixture.control.managed_signer.as_ref().unwrap().wallet_version_id,
            "transactionSha256": hex::encode(Sha256::digest(fixture.partial.serialize())),
            "signedTransactionBase64": signed_transaction_base64,
            "signature": pubkey::encode_signature(&signed.signatures[0]),
            "policyDecisionId": "policy-decision-id",
            "signedAt": "2026-08-11T12:00:00Z"
        })
    }

    #[test]
    fn sends_exact_policy_payload_and_accepts_only_the_returned_transaction() {
        let seams = FakeSeams::new();
        let fixture = fixture(7);
        let expected = response(&fixture);
        seams.push_provider_response(expected.clone());

        let signed = sign(
            &seams,
            &fixture.partial_base64,
            &fixture.requirement,
            &fixture.control,
            true,
        )
        .unwrap();

        assert_eq!(signed, expected["signedTransactionBase64"]);
        let request = &seams.provider_requests.borrow()[0];
        assert_eq!(request.0, ids::PROVIDER_BLOCKCHAIN_X402_SIGN);
        assert_eq!(request.1, ids::PROVIDER_BLOCKCHAIN);
        assert_eq!(request.2, ids::OP_BLOCKCHAIN_X402_SIGN);
        assert_eq!(request.3["payTo"], PAY_TO);
        assert_eq!(request.3["cluster"], "devnet");
        assert_eq!(request.3["maxLamports"], MAX_X402_FEE_LAMPORTS);
        assert_eq!(
            request.3["transactionSha256"],
            hex::encode(Sha256::digest(fixture.partial.serialize()))
        );
        assert_eq!(
            request.3["serializedTransactionBase64"],
            fixture.partial_base64
        );
    }

    #[test]
    fn exact_retry_reuses_identity_and_changed_bytes_keep_the_same_intent_key() {
        let seams = FakeSeams::new();
        let first = fixture(7);
        seams.push_provider_response(response(&first));
        sign(
            &seams,
            &first.partial_base64,
            &first.requirement,
            &first.control,
            true,
        )
        .unwrap();
        seams.push_provider_response(response(&first));
        sign(
            &seams,
            &first.partial_base64,
            &first.requirement,
            &first.control,
            true,
        )
        .unwrap();
        let changed = fixture(8);
        seams.push_provider_error("idempotency conflict");
        assert!(sign(
            &seams,
            &changed.partial_base64,
            &changed.requirement,
            &changed.control,
            true,
        )
        .is_err());
        let mut changed_references = fixture(7);
        let signer = changed_references.control.managed_signer.as_mut().unwrap();
        signer.wallet_id = "00000000-0000-0000-0000-000000000099".into();
        signer.wallet_version_id = "00000000-0000-0000-0000-000000000098".into();
        seams.push_provider_error("idempotency conflict");
        assert!(sign(
            &seams,
            &changed_references.partial_base64,
            &changed_references.requirement,
            &changed_references.control,
            true,
        )
        .is_err());

        let requests = seams.provider_requests.borrow();
        assert_eq!(requests[0].3, requests[1].3);
        assert_eq!(
            requests[0].3["idempotencyKey"],
            requests[2].3["idempotencyKey"]
        );
        assert_ne!(
            requests[0].3["transactionSha256"],
            requests[2].3["transactionSha256"]
        );
        assert_eq!(
            requests[0].3["idempotencyKey"],
            requests[3].3["idempotencyKey"]
        );
        assert_ne!(requests[0].3["walletId"], requests[3].3["walletId"]);
        assert_ne!(
            requests[0].3["walletVersionId"],
            requests[3].3["walletVersionId"]
        );
    }

    #[test]
    fn wrong_fee_payer_destination_or_amount_fails_before_provider_access() {
        let seams = FakeSeams::new();
        let mut wrong_payer = fixture(7);
        wrong_payer
            .control
            .managed_signer
            .as_mut()
            .unwrap()
            .public_key = pubkey::encode(&[0x44; 32]);
        assert!(sign(
            &seams,
            &wrong_payer.partial_base64,
            &wrong_payer.requirement,
            &wrong_payer.control,
            true,
        )
        .is_err());

        let mut wrong_destination = fixture(7);
        wrong_destination.requirement.recipient_token_account = pubkey::encode(&[0x55; 32]);
        assert!(sign(
            &seams,
            &wrong_destination.partial_base64,
            &wrong_destination.requirement,
            &wrong_destination.control,
            true,
        )
        .is_err());

        let mut over_cap = fixture(7);
        over_cap.requirement.min_amount_atomic -= 1;
        assert!(sign(
            &seams,
            &over_cap.partial_base64,
            &over_cap.requirement,
            &over_cap.control,
            true,
        )
        .is_err());
        assert!(seams.provider_requests.borrow().is_empty());
    }

    #[test]
    fn changed_references_digest_or_signed_message_in_provider_response_fail_closed() {
        let seams = FakeSeams::new();
        let base = fixture(7);
        for (field, value) in [
            ("walletId", "wrong-wallet"),
            ("walletVersionId", "stale-version"),
        ] {
            let mut wrong_reference = response(&base);
            wrong_reference[field] = json!(value);
            seams.push_provider_response(wrong_reference);
            assert!(sign(
                &seams,
                &base.partial_base64,
                &base.requirement,
                &base.control,
                true,
            )
            .is_err());
        }

        let mut wrong_digest = response(&base);
        wrong_digest["transactionSha256"] = json!("0".repeat(64));
        seams.push_provider_response(wrong_digest);
        assert!(sign(
            &seams,
            &base.partial_base64,
            &base.requirement,
            &base.control,
            true,
        )
        .is_err());

        let mut changed = response(&base);
        changed["signedTransactionBase64"] = json!(fixture(8).partial_base64);
        seams.push_provider_response(changed);
        assert!(sign(
            &seams,
            &base.partial_base64,
            &base.requirement,
            &base.control,
            true,
        )
        .is_err());
    }
}
