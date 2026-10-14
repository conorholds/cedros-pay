//! Associated-token-account (ATA) derivation — pure, deterministic, no network.
//!
//! The classic SPL ATA is a program-derived address from
//! `(owner, token-program, mint)`, so it needs no RPC call. Derived via [`super::pubkey`] (wasip2-safe) rather than the
//! `spl-associated-token-account` crate, which does not link under wasip2.

use super::pubkey::{self, Pubkey};

/// Classic SPL Token program (`TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`).
const TOKEN_PROGRAM_ID: &str = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
/// Associated Token Account program (`ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL`).
const ASSOCIATED_TOKEN_PROGRAM_ID: &str = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";

/// Derive the classic SPL associated token account for `owner` holding `mint`, as
/// raw 32-byte public-key bytes. Pure PDA math, no RPC. The byte-level form the
/// refund builder needs to place an ATA into a transaction's account-key array.
pub fn derive_token_account_bytes(owner: &Pubkey, mint: &Pubkey) -> Pubkey {
    let token_program = pubkey::parse(TOKEN_PROGRAM_ID).expect("valid const token program id");
    let ata_program =
        pubkey::parse(ASSOCIATED_TOKEN_PROGRAM_ID).expect("valid const ata program id");
    let (ata, _bump) = pubkey::find_program_address(
        &[owner.as_ref(), token_program.as_ref(), mint.as_ref()],
        &ata_program,
    );
    ata
}

/// Derive the classic SPL associated token account for `owner` holding `mint`.
///
/// Returns the base58 ATA address, or an error string when either input is not a
/// valid base58 Solana public key.
pub fn derive_token_account(owner: &str, mint: &str) -> Result<String, &'static str> {
    let owner = pubkey::parse(owner).map_err(|_| "invalid owner address")?;
    let mint = pubkey::parse(mint).map_err(|_| "invalid mint address")?;
    Ok(pubkey::encode(&derive_token_account_bytes(&owner, &mint)))
}

#[cfg(test)]
mod tests {
    use super::*;

    const OWNER: &str = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
    const USDC_MINT: &str = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
    // Canonical ATA captured from the reference `spl-associated-token-account`
    // derivation on the host target. Pins the hand-rolled PDA byte-for-byte.
    const OWNER_USDC_ATA: &str = "FGETo8T8wMcN2wCjav8VK6eh3dLk63evNDPxzLSJra8B";

    #[test]
    fn matches_canonical_spl_derivation() {
        assert_eq!(
            derive_token_account(OWNER, USDC_MINT).unwrap(),
            OWNER_USDC_ATA
        );
    }

    #[test]
    fn is_deterministic_and_well_formed() {
        let a = derive_token_account(OWNER, USDC_MINT).unwrap();
        assert_eq!(a, derive_token_account(OWNER, USDC_MINT).unwrap());
        assert!(pubkey::parse(&a).is_ok());
        assert_ne!(a, OWNER);
        assert_ne!(a, USDC_MINT);
    }

    #[test]
    fn tolerates_surrounding_whitespace() {
        let trimmed = derive_token_account(OWNER, USDC_MINT).unwrap();
        let padded =
            derive_token_account(&format!("  {OWNER} "), &format!(" {USDC_MINT}  ")).unwrap();
        assert_eq!(trimmed, padded);
    }

    #[test]
    fn rejects_invalid_owner_and_mint() {
        assert_eq!(
            derive_token_account("not-base58!", USDC_MINT),
            Err("invalid owner address")
        );
        assert_eq!(derive_token_account(OWNER, ""), Err("invalid mint address"));
        assert_eq!(
            derive_token_account("", USDC_MINT),
            Err("invalid owner address")
        );
    }
}
