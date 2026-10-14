//! Validation for transactions submitted to the host-managed x402 signer.
//!
//! # Security
//! The managed operational wallet signs as the transaction's fee payer. Pay first
//! ensures every instruction's program is on a strict allowlist limited to SPL Token
//!    and Memo. Programs that can increase the fee payer's SOL spend, such as Compute
//!    Budget priority-fee instructions or Associated Token Account rent creation, are
//!    deliberately absent.
//!
//! The buyer's own transfer authorization is a separate required signature that Solana
//! enforces on-chain, so the server fee-paying never substitutes for the buyer's consent.

use super::pubkey;
use super::transaction::ParsedTransaction;

/// Programs a gasless transaction may invoke. Keep this list narrow: Compute Budget
/// can add arbitrary priority fees charged to the server fee payer, and Associated
/// Token Account can debit the fee payer for account rent via CPI.
const ALLOWED_PROGRAMS: &[&str] = &[
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", // SPL Token
    "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr", // Memo v2
    "Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo", // Memo v1
];

/// Reject any instruction whose program is not allowlisted. This keeps a gasless
/// co-signature from authorizing direct SOL movement, arbitrary priority fees, or
/// fee-payer-funded account creation.
pub fn validate_programs(tx: &ParsedTransaction) -> Result<(), &'static str> {
    for ix in &tx.instructions {
        let program = tx
            .account_key(ix.program_id_index)
            .ok_or("instruction references an unknown program account")?;
        if !ALLOWED_PROGRAMS.contains(&pubkey::encode(program).as_str()) {
            return Err("transaction invokes a program not allowed for gasless");
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::x402::transaction;

    /// Build a minimal legacy transaction: 1 signer (the fee payer), `program_b58` as the
    /// only program, one empty instruction. Signatures start zeroed.
    fn tx_with_program(program_b58: &str) -> ParsedTransaction {
        let fee_payer_b58 = bs58::encode([0x11u8; 32]).into_string();
        let fee_payer = pubkey::parse(&fee_payer_b58).unwrap();
        let program = pubkey::parse(program_b58).unwrap();
        // message_bytes content is opaque to these tests (we sign over it as-is).
        ParsedTransaction {
            signatures: vec![[0u8; 64]],
            num_required_signatures: 1,
            account_keys: vec![fee_payer, program],
            recent_blockhash: [0u8; 32],
            instructions: vec![transaction::CompiledInstruction {
                program_id_index: 1,
                accounts: vec![],
                data: vec![],
            }],
            message_bytes: b"the message that gets signed".to_vec(),
            version: None,
            has_address_table_lookups: false,
        }
    }

    #[test]
    fn serialize_round_trips_a_real_transaction() {
        use base64::{engine::general_purpose::STANDARD, Engine};
        let bytes = STANDARD
            .decode(transaction::fixtures::TRANSFER_CHECKED_MEMO)
            .unwrap();
        let tx = transaction::parse(&bytes).unwrap();
        assert_eq!(
            tx.serialize(),
            bytes,
            "serialize is the exact inverse of parse"
        );
    }

    #[test]
    fn accepts_an_allowed_program() {
        let tx = tx_with_program("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
        assert_eq!(validate_programs(&tx), Ok(()));
    }

    #[test]
    fn rejects_a_disallowed_program_even_for_our_wallet() {
        let tx = tx_with_program("11111111111111111111111111111111");
        assert!(validate_programs(&tx).is_err());
    }

    #[test]
    fn rejects_compute_budget_priority_fee_instructions() {
        let tx = tx_with_program("ComputeBudget111111111111111111111111111111");
        assert_eq!(
            validate_programs(&tx).unwrap_err(),
            "transaction invokes a program not allowed for gasless"
        );
    }

    #[test]
    fn rejects_associated_token_account_rent_creation() {
        let tx = tx_with_program("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
        assert_eq!(
            validate_programs(&tx).unwrap_err(),
            "transaction invokes a program not allowed for gasless"
        );
    }
}
