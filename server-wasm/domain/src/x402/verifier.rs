//! x402 payment-proof verification — the full security decision, pure compute.
//!
//! Given a base64 signed Solana transaction (the `X-PAYMENT` proof) and the
//! [`Requirement`] derived from the priced resource, this checks that the
//! proof is a genuine, correctly-addressed, exact-amount SPL payment for
//! exactly this resource. On-chain submission/confirmation happens separately via
//! [`super::rpc`]; this decides whether the proof is acceptable to submit.

use base64::{engine::general_purpose::STANDARD as BASE64, Engine};

use super::pubkey;
use super::transaction;
use super::transfer;

/// What a valid payment proof must satisfy, derived from the priced resource.
#[derive(Debug, Clone)]
pub struct Requirement {
    /// Expected destination token account (the recipient's ATA for `token_mint`).
    pub recipient_token_account: String,
    /// Expected SPL mint (base58).
    pub token_mint: String,
    /// Exact amount in the token's atomic units.
    pub min_amount_atomic: u64,
    /// Exact mint precision encoded by `TransferChecked`.
    pub decimals: u8,
    /// When set, the transaction memo must bind this resource id (replay
    /// protection across resources).
    pub resource_id: Option<String>,
}

/// Exact, quote-pinned requirement used by canonical checkout. Its memo is
/// matched verbatim rather than as the resource field used by paywall quotes.
#[derive(Debug, Clone)]
pub struct CanonicalRequirement {
    pub recipient_token_account: String,
    pub token_mint: String,
    pub amount_atomic: u64,
    pub decimals: u8,
    pub memo: String,
}

/// The accepted outcome of verification.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct VerifiedPayment {
    /// Base58 transaction signature — the settlement id used for confirmation,
    /// the ledger key, and replay deduplication.
    pub signature: String,
    /// Actual amount transferred (atomic units).
    pub amount_atomic: u64,
    /// SPL mint that was paid.
    pub mint: String,
    /// Wallet that authorized the SPL transfer (not necessarily the fee payer).
    pub payer_wallet: String,
}

/// Why a proof was rejected. `code` is a stable, redacted classifier suitable for
/// the `payment-failed` analytics `cause_code` and the API error envelope.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum VerifierError {
    MalformedProof,
    InvalidSignature,
    NoTokenTransfer,
    InvalidRecipient,
    InvalidTokenMint,
    AmountTooLow,
    AmountMismatch,
    DecimalsMismatch,
    UnsafeInstructions,
    ResourceMemoMissing,
    ResourceMemoMismatch,
}

impl VerifierError {
    /// Stable, safe classifier string (no raw provider/chain detail).
    pub fn code(&self) -> &'static str {
        match self {
            VerifierError::MalformedProof => "malformed_proof",
            VerifierError::InvalidSignature => "invalid_signature",
            VerifierError::NoTokenTransfer => "no_token_transfer",
            VerifierError::InvalidRecipient => "invalid_recipient",
            VerifierError::InvalidTokenMint => "invalid_token_mint",
            VerifierError::AmountTooLow => "amount_too_low",
            VerifierError::AmountMismatch => "amount_mismatch",
            VerifierError::DecimalsMismatch => "decimals_mismatch",
            VerifierError::UnsafeInstructions => "unsafe_instructions",
            VerifierError::ResourceMemoMissing => "resource_memo_missing",
            VerifierError::ResourceMemoMismatch => "resource_memo_mismatch",
        }
    }
}

/// Verify a canonical checkout proof against the exact challenge persisted in
/// its quote. The returned transaction bytes are safe to persist and rebroadcast.
pub fn verify_canonical_proof(
    proof_base64: &str,
    req: &CanonicalRequirement,
) -> Result<VerifiedPayment, VerifierError> {
    let bytes = BASE64
        .decode(proof_base64.trim())
        .map_err(|_| VerifierError::MalformedProof)?;
    let tx = transaction::parse(&bytes).map_err(|_| VerifierError::MalformedProof)?;
    if !transfer::verify_required_signatures(&tx) {
        return Err(VerifierError::InvalidSignature);
    }
    let (details, memo) =
        transfer::extract_canonical_transfer(&tx).map_err(|_| VerifierError::UnsafeInstructions)?;
    if !transfer::transfer_authority_is_required_signer(&tx, &details.authority) {
        return Err(VerifierError::InvalidSignature);
    }
    let mint = pubkey::parse(&req.token_mint).map_err(|_| VerifierError::InvalidTokenMint)?;
    let recipient =
        pubkey::parse(&req.recipient_token_account).map_err(|_| VerifierError::InvalidRecipient)?;
    if details.mint != mint {
        return Err(VerifierError::InvalidTokenMint);
    }
    if details.destination != recipient {
        return Err(VerifierError::InvalidRecipient);
    }
    if details.amount != req.amount_atomic {
        return Err(VerifierError::AmountMismatch);
    }
    if details.decimals != req.decimals {
        return Err(VerifierError::DecimalsMismatch);
    }
    if memo != req.memo {
        return Err(VerifierError::ResourceMemoMismatch);
    }
    let signature = pubkey::encode_signature(
        tx.signatures
            .first()
            .ok_or(VerifierError::InvalidSignature)?,
    );
    Ok(VerifiedPayment {
        signature,
        amount_atomic: details.amount,
        mint: req.token_mint.clone(),
        payer_wallet: pubkey::encode(&details.authority),
    })
}

/// The canonical memo field that binds an on-chain payment to the resource it pays for.
///
/// The single source of truth for the resource↔payment binding: `/quote` (and the
/// cart quote) emit this via the AcceptEntry `extra.memo`, the wallet writes it
/// verbatim into the SPL Memo instruction, and [`verify_proof`] requires the
/// on-chain memo to include it as an exact semicolon-delimited field. Without it
/// the verifier cannot bind a payment to its resource, so the two must agree by
/// construction.
pub fn expected_memo(resource_id: &str) -> String {
    format!("resource={resource_id}")
}

fn memo_has_resource_binding(memo: &str, resource_id: &str) -> bool {
    let expected = expected_memo(resource_id);
    memo.split(';').any(|field| field == expected)
}

/// Verify a base64 payment proof against `req`. Returns the settlement details to
/// submit/confirm, or a classified rejection. Does not touch any host seam.
pub fn verify_proof(
    proof_base64: &str,
    req: &Requirement,
) -> Result<VerifiedPayment, VerifierError> {
    let bytes = BASE64
        .decode(proof_base64.trim())
        .map_err(|_| VerifierError::MalformedProof)?;
    let tx = transaction::parse(&bytes).map_err(|_| VerifierError::MalformedProof)?;

    // Authenticity: every required signer must have signed the exact message.
    if !transfer::verify_required_signatures(&tx) {
        return Err(VerifierError::InvalidSignature);
    }

    // Permit only the intended value movement and its correlation memo. Extra
    // programs or token instructions can change balances beyond the payment.
    let (details, memo) =
        transfer::extract_canonical_transfer(&tx).map_err(|_| VerifierError::UnsafeInstructions)?;
    if !transfer::transfer_authority_is_required_signer(&tx, &details.authority) {
        return Err(VerifierError::InvalidSignature);
    }

    let expected_mint =
        pubkey::parse(&req.token_mint).map_err(|_| VerifierError::InvalidTokenMint)?;
    if details.mint != expected_mint {
        return Err(VerifierError::InvalidTokenMint);
    }

    let expected_dest =
        pubkey::parse(&req.recipient_token_account).map_err(|_| VerifierError::InvalidRecipient)?;
    if details.destination != expected_dest {
        return Err(VerifierError::InvalidRecipient);
    }

    if details.amount < req.min_amount_atomic {
        return Err(VerifierError::AmountTooLow);
    }
    if details.amount != req.min_amount_atomic {
        return Err(VerifierError::AmountMismatch);
    }
    if details.decimals != req.decimals {
        return Err(VerifierError::DecimalsMismatch);
    }

    if let Some(resource_id) = &req.resource_id {
        if !memo_has_resource_binding(&memo, resource_id) {
            return Err(VerifierError::ResourceMemoMismatch);
        }
    }

    let signature = pubkey::encode_signature(
        tx.signatures
            .first()
            .ok_or(VerifierError::InvalidSignature)?,
    );
    Ok(VerifiedPayment {
        signature,
        amount_atomic: details.amount,
        mint: req.token_mint.clone(),
        payer_wallet: pubkey::encode(&details.authority),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::x402::transaction::fixtures::*;
    use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
    use ed25519_dalek::{Signer, SigningKey};

    fn base_requirement() -> Requirement {
        Requirement {
            recipient_token_account: DEST_ATA.to_string(),
            token_mint: MINT.to_string(),
            min_amount_atomic: AMOUNT,
            decimals: DECIMALS,
            resource_id: Some("prod_1".into()),
        }
    }

    #[test]
    fn accepts_a_matching_transfer_checked_proof() {
        let v = verify_proof(TRANSFER_CHECKED_MEMO, &base_requirement()).unwrap();
        assert_eq!(v.amount_atomic, AMOUNT);
        assert_eq!(v.mint, MINT);
        assert_eq!(v.payer_wallet, PAYER);
        assert_eq!(v.signature.len(), 88); // base58 of a 64-byte signature
    }

    #[test]
    fn canonical_verification_pins_amount_decimals_and_exact_memo() {
        let requirement = CanonicalRequirement {
            recipient_token_account: DEST_ATA.into(),
            token_mint: MINT.into(),
            amount_atomic: AMOUNT,
            decimals: DECIMALS,
            memo: "resource=prod_1;nonce=abc123".into(),
        };
        assert!(verify_canonical_proof(TRANSFER_CHECKED_MEMO, &requirement).is_ok());
        let mut wrong_amount = requirement.clone();
        wrong_amount.amount_atomic += 1;
        assert_eq!(
            verify_canonical_proof(TRANSFER_CHECKED_MEMO, &wrong_amount).unwrap_err(),
            VerifierError::AmountMismatch
        );
        let mut wrong_decimals = requirement.clone();
        wrong_decimals.decimals += 1;
        assert_eq!(
            verify_canonical_proof(TRANSFER_CHECKED_MEMO, &wrong_decimals).unwrap_err(),
            VerifierError::DecimalsMismatch
        );
    }

    #[test]
    fn rejects_overpayment() {
        let mut req = base_requirement();
        req.min_amount_atomic = AMOUNT - 1;
        assert_eq!(
            verify_proof(TRANSFER_CHECKED_MEMO, &req).unwrap_err(),
            VerifierError::AmountMismatch
        );
    }

    #[test]
    fn rejects_underpayment() {
        let mut req = base_requirement();
        req.min_amount_atomic = AMOUNT + 1;
        assert_eq!(
            verify_proof(TRANSFER_CHECKED_MEMO, &req).unwrap_err(),
            VerifierError::AmountTooLow
        );
    }

    #[test]
    fn rejects_wrong_transfer_checked_decimals() {
        let mut req = base_requirement();
        req.decimals = DECIMALS + 1;
        assert_eq!(
            verify_proof(TRANSFER_CHECKED_MEMO, &req).unwrap_err(),
            VerifierError::DecimalsMismatch
        );
    }

    #[test]
    fn rejects_wrong_recipient() {
        let mut req = base_requirement();
        req.recipient_token_account = MINT.to_string(); // any other valid pubkey
        assert_eq!(
            verify_proof(TRANSFER_CHECKED_MEMO, &req).unwrap_err(),
            VerifierError::InvalidRecipient
        );
    }

    #[test]
    fn rejects_wrong_mint() {
        let mut req = base_requirement();
        req.token_mint = "So11111111111111111111111111111111111111112".to_string(); // wSOL
        assert_eq!(
            verify_proof(TRANSFER_CHECKED_MEMO, &req).unwrap_err(),
            VerifierError::InvalidTokenMint
        );
    }

    #[test]
    fn rejects_plain_transfer_proof() {
        assert_eq!(
            verify_proof(PLAIN_TRANSFER, &base_requirement()).unwrap_err(),
            VerifierError::UnsafeInstructions
        );
    }

    #[test]
    fn enforces_resource_memo_binding() {
        let mut req = base_requirement();
        req.resource_id = Some("prod_1".to_string());
        // The memo fixture carries `resource=prod_1`.
        assert!(verify_proof(TRANSFER_CHECKED_MEMO, &req).is_ok());
        // The transfer-only proof has no memo → rejected when a resource is required.
        assert_eq!(
            verify_proof(TRANSFER_CHECKED, &req).unwrap_err(),
            VerifierError::UnsafeInstructions
        );
        // A different resource id → mismatch.
        req.resource_id = Some("prod_OTHER".to_string());
        assert_eq!(
            verify_proof(TRANSFER_CHECKED_MEMO, &req).unwrap_err(),
            VerifierError::ResourceMemoMismatch
        );
        // Prefixes must not match: `resource=prod_1;...` is not valid for `prod`.
        req.resource_id = Some("prod".to_string());
        assert_eq!(
            verify_proof(TRANSFER_CHECKED_MEMO, &req).unwrap_err(),
            VerifierError::ResourceMemoMismatch
        );
    }

    #[test]
    fn rejects_garbage_proof() {
        assert_eq!(
            verify_proof("not base64!!", &base_requirement()).unwrap_err(),
            VerifierError::MalformedProof
        );
    }

    #[test]
    fn rejects_a_transfer_whose_authority_did_not_sign() {
        let proof = unsigned_authority_proof("resource=prod_1;nonce=forged");
        let mut requirement = base_requirement();
        requirement.resource_id = Some("prod_1".into());
        assert_eq!(
            verify_proof(&proof, &requirement).unwrap_err(),
            VerifierError::InvalidSignature
        );
        assert_eq!(
            verify_canonical_proof(
                &proof,
                &CanonicalRequirement {
                    recipient_token_account: DEST_ATA.into(),
                    token_mint: MINT.into(),
                    amount_atomic: AMOUNT,
                    decimals: DECIMALS,
                    memo: "resource=prod_1;nonce=forged".into(),
                },
            )
            .unwrap_err(),
            VerifierError::InvalidSignature
        );
    }

    fn unsigned_authority_proof(memo_value: &str) -> String {
        let payer = SigningKey::from_bytes(&[0x51; 32]);
        let unsigned_authority = SigningKey::from_bytes(&[0x52; 32]);
        let token = pubkey::parse("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA").unwrap();
        let memo = pubkey::parse("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr").unwrap();
        let account_keys = vec![
            payer.verifying_key().to_bytes(),
            unsigned_authority.verifying_key().to_bytes(),
            [0x53; 32],
            pubkey::parse(MINT).unwrap(),
            pubkey::parse(DEST_ATA).unwrap(),
            token,
            memo,
        ];
        let mut transfer_data = vec![12];
        transfer_data.extend_from_slice(&AMOUNT.to_le_bytes());
        transfer_data.push(DECIMALS);
        let instructions = vec![
            transaction::CompiledInstruction {
                program_id_index: 5,
                accounts: vec![2, 3, 4, 1],
                data: transfer_data,
            },
            transaction::CompiledInstruction {
                program_id_index: 6,
                accounts: Vec::new(),
                data: memo_value.as_bytes().to_vec(),
            },
        ];
        let blockhash = [0x54; 32];
        let message =
            transaction::build_legacy_message(1, 0, 2, &account_keys, &blockhash, &instructions);
        let parsed = transaction::ParsedTransaction {
            signatures: vec![payer.sign(&message).to_bytes()],
            num_required_signatures: 1,
            account_keys,
            recent_blockhash: blockhash,
            instructions,
            message_bytes: message,
            version: None,
            has_address_table_lookups: false,
        };
        BASE64.encode(parsed.serialize())
    }
}
