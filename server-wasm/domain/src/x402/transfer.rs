//! SPL token transfer extraction, memo extraction, and ed25519 signature
//! verification over a parsed Solana transaction. Pure compute, wasip2-safe.

use ed25519_dalek::{Signature, VerifyingKey};

use super::pubkey::{self, Pubkey};
use super::transaction::ParsedTransaction;

/// Classic SPL Token program.
const TOKEN_PROGRAM_ID: &str = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
/// SPL Memo program.
const MEMO_PROGRAM_ID: &str = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";
const MEMO_V1_PROGRAM_ID: &str = "Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo";

/// The destination/mint/amount of an SPL `TransferChecked` instruction.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TransferDetails {
    pub source: Pubkey,
    pub destination: Pubkey,
    pub mint: Pubkey,
    /// TransferChecked authority. This is the buyer signer even when the
    /// host-managed operational wallet pays transaction fees in gasless mode.
    pub authority: Pubkey,
    pub amount: u64,
    pub decimals: u8,
}

/// Extract the SPL `TransferChecked` (opcode 12) transfer from a parsed tx.
///
/// SECURITY: a plain `Transfer` (opcode 3) carries no mint, so an attacker could
/// pay a worthless token without proving the required mint. It is rejected.
pub fn extract_transfer(tx: &ParsedTransaction) -> Result<TransferDetails, &'static str> {
    let token_program = pubkey::parse(TOKEN_PROGRAM_ID).expect("valid token program id");
    for ix in &tx.instructions {
        let program_id = tx
            .account_key(ix.program_id_index)
            .ok_or("instruction references unknown program")?;
        if *program_id != token_program || ix.data.is_empty() {
            continue;
        }
        match ix.data[0] {
            12 => return decode_transfer_checked(tx, ix),
            3 => return Err("plain SPL Transfer is not accepted; TransferChecked required"),
            _ => continue,
        }
    }
    Err("no SPL token transfer instruction found")
}

/// Extract the only permitted canonical checkout transfer. Every instruction
/// must be either that one `TransferChecked` or one SPL memo; unknown programs,
/// additional token instructions, and duplicate memos fail closed.
pub fn extract_canonical_transfer(
    tx: &ParsedTransaction,
) -> Result<(TransferDetails, String), &'static str> {
    let token = pubkey::parse(TOKEN_PROGRAM_ID).expect("valid token program id");
    let memo = pubkey::parse(MEMO_PROGRAM_ID).expect("valid memo program id");
    let memo_v1 = pubkey::parse(MEMO_V1_PROGRAM_ID).expect("valid memo program id");
    let mut transfer = None;
    let mut memo_value = None;
    for ix in &tx.instructions {
        let program = tx
            .account_key(ix.program_id_index)
            .ok_or("instruction references unknown program")?;
        if *program == token {
            if transfer.is_some() || ix.data.first() != Some(&12) {
                return Err("canonical payment requires exactly one TransferChecked");
            }
            transfer = Some(decode_transfer_checked(tx, ix)?);
        } else if *program == memo || *program == memo_v1 {
            if memo_value.is_some() {
                return Err("canonical payment requires exactly one memo");
            }
            memo_value =
                Some(String::from_utf8(ix.data.clone()).map_err(|_| "memo is not valid UTF-8")?);
        } else {
            return Err("canonical payment invokes a disallowed program");
        }
    }
    Ok((
        transfer.ok_or("canonical payment omitted TransferChecked")?,
        memo_value.ok_or("canonical payment omitted memo")?,
    ))
}

fn decode_transfer_checked(
    tx: &ParsedTransaction,
    ix: &super::transaction::CompiledInstruction,
) -> Result<TransferDetails, &'static str> {
    if ix.accounts.len() != 4 || ix.data.len() != 10 {
        return Err("malformed transfer_checked instruction");
    }
    let source = *tx
        .account_key(ix.accounts[0])
        .ok_or("missing source account")?;
    let destination = *tx
        .account_key(ix.accounts[2])
        .ok_or("missing destination account")?;
    let amount = u64::from_le_bytes(ix.data[1..9].try_into().unwrap());
    if source == destination || amount == 0 {
        return Err("payment must move tokens between distinct accounts");
    }
    if !tx.is_writable(ix.accounts[0]) || !tx.is_writable(ix.accounts[2]) {
        return Err("payment token accounts must be writable");
    }
    Ok(TransferDetails {
        source,
        mint: *tx
            .account_key(ix.accounts[1])
            .ok_or("missing mint account")?,
        destination: *tx
            .account_key(ix.accounts[2])
            .ok_or("missing destination account")?,
        authority: *tx
            .account_key(ix.accounts[3])
            .ok_or("missing transfer authority")?,
        amount: u64::from_le_bytes(ix.data[1..9].try_into().unwrap()),
        decimals: ix.data[9],
    })
}

/// The first SPL Memo instruction's UTF-8 payload, if present. x402 binds the
/// resource id + nonce into the memo to prevent proof replay across resources.
pub fn extract_memo(tx: &ParsedTransaction) -> Option<String> {
    let memo_program = pubkey::parse(MEMO_PROGRAM_ID).ok()?;
    for ix in &tx.instructions {
        if tx.account_key(ix.program_id_index) == Some(&memo_program) {
            return String::from_utf8(ix.data.clone()).ok();
        }
    }
    None
}

/// Verify the fee payer's ed25519 signature over the signed message bytes. The
/// chain enforces this on submit too, but a local pre-check rejects forged or
/// tampered proofs fast.
pub fn verify_fee_payer_signature(tx: &ParsedTransaction) -> bool {
    let (Some(payer), Some(sig)) = (tx.account_keys.first(), tx.signatures.first()) else {
        return false;
    };
    let Ok(verifying_key) = VerifyingKey::from_bytes(payer) else {
        return false;
    };
    verifying_key
        .verify_strict(&tx.message_bytes, &Signature::from_bytes(sig))
        .is_ok()
}

/// Verify every required signer, including the buyer authority in gasless
/// transactions where the server is signer zero.
pub fn verify_required_signatures(tx: &ParsedTransaction) -> bool {
    let required = usize::from(tx.num_required_signatures);
    if required == 0 || tx.signatures.len() != required || tx.account_keys.len() < required {
        return false;
    }
    tx.account_keys[..required]
        .iter()
        .zip(&tx.signatures[..required])
        .all(|(key, signature)| {
            VerifyingKey::from_bytes(key).is_ok_and(|verifier| {
                verifier
                    .verify_strict(&tx.message_bytes, &Signature::from_bytes(signature))
                    .is_ok()
            })
        })
}

/// Solana only authorizes a token transfer when its authority is one of the
/// message's required signers. Checking signatures alone is insufficient: a
/// hostile proof can name an unsigned account as the instruction authority and
/// rely on a dishonest RPC to claim that the transaction confirmed.
pub fn transfer_authority_is_required_signer(tx: &ParsedTransaction, authority: &Pubkey) -> bool {
    let required = usize::from(tx.num_required_signatures);
    required > 0
        && required <= tx.account_keys.len()
        && tx.account_keys[..required].contains(authority)
}

/// Verify every required signer except signer zero. Managed gasless x402 calls
/// use this before asking Core/Vault to fill the fee-payer signature slot, so a
/// valid buyer authorization is required before any operational-wallet request.
pub fn verify_non_fee_payer_signatures(tx: &ParsedTransaction) -> bool {
    let required = usize::from(tx.num_required_signatures);
    if required < 2 || tx.signatures.len() != required || tx.account_keys.len() < required {
        return false;
    }
    tx.account_keys[1..required]
        .iter()
        .zip(&tx.signatures[1..required])
        .all(|(key, signature)| {
            VerifyingKey::from_bytes(key).is_ok_and(|verifier| {
                verifier
                    .verify_strict(&tx.message_bytes, &Signature::from_bytes(signature))
                    .is_ok()
            })
        })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::x402::pubkey;
    use crate::x402::transaction::{fixtures::*, parse};

    #[test]
    fn rejects_noop_and_invalid_transfer_accounts() {
        let original = parse(&decode(TRANSFER_CHECKED_MEMO)).unwrap();
        for source_index in [2, 255] {
            let mut tx = original.clone();
            tx.instructions[0].accounts[0] = source_index;
            assert!(extract_canonical_transfer(&tx).is_err());
        }
        let mut tx = original.clone();
        tx.instructions[0].data[1..9].copy_from_slice(&0u64.to_le_bytes());
        assert!(extract_canonical_transfer(&tx).is_err());
        let mut tx = original.clone();
        tx.instructions[0].accounts.push(0);
        assert!(extract_canonical_transfer(&tx).is_err());
        let mut tx = original;
        tx.message_bytes[2] = 5;
        assert!(extract_canonical_transfer(&tx).is_err());
    }

    #[test]
    fn extracts_transfer_checked_details() {
        let tx = parse(&decode(TRANSFER_CHECKED)).unwrap();
        let d = extract_transfer(&tx).unwrap();
        assert_eq!(pubkey::encode(&d.destination), DEST_ATA);
        assert_eq!(pubkey::encode(&d.mint), MINT);
        assert_eq!(d.amount, AMOUNT);
        assert_eq!(d.decimals, DECIMALS);
    }

    #[test]
    fn rejects_plain_transfer() {
        let tx = parse(&decode(PLAIN_TRANSFER)).unwrap();
        assert_eq!(
            extract_transfer(&tx),
            Err("plain SPL Transfer is not accepted; TransferChecked required")
        );
    }

    #[test]
    fn extracts_memo_and_transfer_together() {
        let tx = parse(&decode(TRANSFER_CHECKED_MEMO)).unwrap();
        assert_eq!(
            extract_memo(&tx).as_deref(),
            Some("resource=prod_1;nonce=abc123")
        );
        assert_eq!(extract_transfer(&tx).unwrap().amount, AMOUNT);
    }

    #[test]
    fn canonical_transfer_rejects_duplicate_value_movement() {
        let mut tx = parse(&decode(TRANSFER_CHECKED_MEMO)).unwrap();
        tx.instructions.push(tx.instructions[0].clone());
        assert!(extract_canonical_transfer(&tx).is_err());
    }

    #[test]
    fn no_memo_on_transfer_only_tx() {
        let tx = parse(&decode(TRANSFER_CHECKED)).unwrap();
        assert_eq!(extract_memo(&tx), None);
    }

    #[test]
    fn verifies_genuine_signature_and_rejects_tampering() {
        let tx = parse(&decode(TRANSFER_CHECKED)).unwrap();
        assert!(
            verify_fee_payer_signature(&tx),
            "genuine signature must verify"
        );
        let mut tampered = tx.clone();
        let last = tampered.message_bytes.len() - 1;
        tampered.message_bytes[last] ^= 0x01;
        assert!(
            !verify_fee_payer_signature(&tampered),
            "tampered message must fail"
        );
    }
}
