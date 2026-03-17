//! Token-22 NFT creation and burning for non-fungible tokenized assets.
//!
//! Creates Token-22 mints with supply=1, 0 decimals, and extensions:
//! MetadataPointer, PermanentDelegate, MintCloseAuthority, optional TransferFee.
//! After minting, mint authority is removed to lock supply at 1.

use std::str::FromStr;

#[allow(deprecated)]
use solana_sdk::system_instruction;
use solana_sdk::{
    hash::Hash,
    instruction::{AccountMeta, Instruction},
    pubkey::Pubkey,
    signature::Keypair,
    signer::Signer,
    transaction::Transaction,
};

use super::operations::{build_burn_ix, build_create_ata_idempotent_ix, build_mint_to_ix};
use super::{Token22Service, TOKEN_2022_PROGRAM_ID};

/// Result of NFT mint creation.
pub struct NftMintResult {
    pub mint_address: String,
    pub signature: String,
}

/// Optional transfer fee configuration for NFT mints.
pub struct NftTransferFee {
    pub basis_points: u16,
    pub max_fee: u64,
}

/// Create a Token-22 NFT mint with supply=1 and compliance extensions.
///
/// Single transaction: CreateAccount, init extensions, InitializeMint2,
/// TokenMetadata::Initialize, create ATA, MintTo(1), remove mint authority.
/// Returns the new mint address and confirming transaction signature.
pub async fn create_nft_mint(
    service: &Token22Service,
    owner: &Pubkey,
    name: &str,
    symbol: &str,
    uri: &str,
    transfer_fee: Option<NftTransferFee>,
) -> Result<NftMintResult, String> {
    let mint_kp = Keypair::new();
    let mint = mint_kp.pubkey();
    let authority = service.authority_pubkey();

    let space = nft_mint_space(name, symbol, uri, transfer_fee.is_some());
    let lamports = service
        .rpc
        .get_minimum_balance_for_rent_exemption(space)
        .await
        .map_err(|e| format!("rent exemption query failed: {e}"))?;

    let create_account_ix = system_instruction::create_account(
        &authority, &mint, lamports, space as u64, &TOKEN_2022_PROGRAM_ID,
    );

    let mut ixs = vec![
        create_account_ix,
        build_init_metadata_pointer_ix(&mint, &authority),
        build_init_permanent_delegate_ix(&mint, &authority),
        build_init_mint_close_authority_ix(&mint, &authority),
    ];

    if let Some(ref fee) = transfer_fee {
        ixs.push(build_init_transfer_fee_config_ix(
            &mint, &authority, fee.basis_points, fee.max_fee,
        ));
    }

    ixs.push(build_init_mint2_ix(&mint, &authority, 0));
    ixs.push(build_init_token_metadata_ix(&mint, &authority, name, symbol, uri));

    let ata = super::operations::get_associated_token_address_2022(owner, &mint);
    ixs.push(build_create_ata_idempotent_ix(&authority, owner, &mint));
    ixs.push(build_mint_to_ix(&mint, &ata, &authority, 1));
    ixs.push(build_set_authority_ix(&mint, &authority, None, 0));

    let bh = service
        .blockhash_cache
        .get_blockhash()
        .await
        .map_err(|e| format!("blockhash fetch failed: {e}"))?;
    let blockhash =
        Hash::from_str(&bh.blockhash).map_err(|e| format!("invalid blockhash: {e}"))?;

    let tx = Transaction::new_signed_with_payer(
        &ixs, Some(&authority), &[&*service.authority, &mint_kp], blockhash,
    );

    let sig = service
        .rpc
        .send_and_confirm_transaction(&tx)
        .await
        .map_err(|e| format!("create NFT mint tx failed: {e}"))?;

    Ok(NftMintResult {
        mint_address: mint.to_string(),
        signature: sig.to_string(),
    })
}

/// Burn a Token-22 NFT using PermanentDelegate, then close the mint.
///
/// Two instructions: Burn(1) from owner's ATA, CloseAccount on the mint.
/// Returns the confirming transaction signature.
pub async fn burn_nft(
    service: &Token22Service,
    mint: &Pubkey,
    owner: &Pubkey,
) -> Result<String, String> {
    let authority = service.authority_pubkey();
    let ata = super::operations::get_associated_token_address_2022(owner, mint);

    let burn_ix = build_burn_ix(&ata, mint, &authority, 1);
    let close_ix = build_close_account_ix(mint, &authority, &authority);

    let bh = service
        .blockhash_cache
        .get_blockhash()
        .await
        .map_err(|e| format!("blockhash fetch failed: {e}"))?;
    let blockhash =
        Hash::from_str(&bh.blockhash).map_err(|e| format!("invalid blockhash: {e}"))?;

    let tx = Transaction::new_signed_with_payer(
        &[burn_ix, close_ix],
        Some(&authority),
        &[&*service.authority],
        blockhash,
    );

    let sig = service
        .rpc
        .send_and_confirm_transaction(&tx)
        .await
        .map_err(|e| format!("burn NFT tx failed: {e}"))?;

    Ok(sig.to_string())
}

// ---------------------------------------------------------------------------
// Instruction builders
// ---------------------------------------------------------------------------

/// InitializeMetadataPointer (disc 39, sub 0) — self-referencing.
fn build_init_metadata_pointer_ix(mint: &Pubkey, authority: &Pubkey) -> Instruction {
    let mut data = Vec::with_capacity(68);
    data.push(39u8); // MetadataPointerExtension
    data.push(0u8); // sub: Initialize
    data.push(1u8); // COption::Some — authority
    data.extend_from_slice(&authority.to_bytes());
    data.push(1u8); // COption::Some — metadata_address = mint (self)
    data.extend_from_slice(&mint.to_bytes());
    Instruction {
        program_id: TOKEN_2022_PROGRAM_ID,
        accounts: vec![AccountMeta::new(*mint, false)],
        data,
    }
}

/// InitializePermanentDelegate (disc 35).
fn build_init_permanent_delegate_ix(mint: &Pubkey, delegate: &Pubkey) -> Instruction {
    let mut data = Vec::with_capacity(33);
    data.push(35u8);
    data.extend_from_slice(&delegate.to_bytes());
    Instruction {
        program_id: TOKEN_2022_PROGRAM_ID,
        accounts: vec![AccountMeta::new(*mint, false)],
        data,
    }
}

/// InitializeMintCloseAuthority (disc 25).
fn build_init_mint_close_authority_ix(mint: &Pubkey, authority: &Pubkey) -> Instruction {
    let mut data = Vec::with_capacity(34);
    data.push(25u8);
    data.push(1u8); // COption::Some
    data.extend_from_slice(&authority.to_bytes());
    Instruction {
        program_id: TOKEN_2022_PROGRAM_ID,
        accounts: vec![AccountMeta::new(*mint, false)],
        data,
    }
}

/// InitializeTransferFeeConfig (disc 26, sub 0).
fn build_init_transfer_fee_config_ix(
    mint: &Pubkey, authority: &Pubkey, fee_bps: u16, max_fee: u64,
) -> Instruction {
    let mut data = Vec::with_capacity(80);
    data.push(26u8);
    data.push(0u8); // sub: InitializeTransferFeeConfig
    data.push(1u8); data.extend_from_slice(&authority.to_bytes()); // config authority
    data.push(1u8); data.extend_from_slice(&authority.to_bytes()); // withdraw authority
    data.extend_from_slice(&fee_bps.to_le_bytes());
    data.extend_from_slice(&max_fee.to_le_bytes());
    Instruction {
        program_id: TOKEN_2022_PROGRAM_ID,
        accounts: vec![AccountMeta::new(*mint, false)],
        data,
    }
}

/// InitializeMint2 (disc 20) — 0 decimals, server authority as mint+freeze.
fn build_init_mint2_ix(mint: &Pubkey, authority: &Pubkey, decimals: u8) -> Instruction {
    let mut data = Vec::with_capacity(67);
    data.push(20u8);
    data.push(decimals);
    data.extend_from_slice(&authority.to_bytes()); // mint_authority
    data.push(1u8); // COption::Some — freeze_authority
    data.extend_from_slice(&authority.to_bytes());
    Instruction {
        program_id: TOKEN_2022_PROGRAM_ID,
        accounts: vec![AccountMeta::new(*mint, false)],
        data,
    }
}

/// TokenMetadata::Initialize — spl-token-metadata-interface.
///
/// Discriminator: sha256("spl_token_metadata_interface:initialize_account")[0..8].
fn build_init_token_metadata_ix(
    mint: &Pubkey, authority: &Pubkey, name: &str, symbol: &str, uri: &str,
) -> Instruction {
    let disc = token_metadata_init_discriminator();
    let mut data = Vec::with_capacity(8 + 12 + name.len() + symbol.len() + uri.len());
    data.extend_from_slice(&disc);
    // Borsh-encoded strings: u32 LE length + UTF-8 bytes
    for s in [name, symbol, uri] {
        data.extend_from_slice(&(s.len() as u32).to_le_bytes());
        data.extend_from_slice(s.as_bytes());
    }
    Instruction {
        program_id: TOKEN_2022_PROGRAM_ID,
        accounts: vec![
            AccountMeta::new(*mint, false),           // metadata (self-ref)
            AccountMeta::new_readonly(*authority, false), // update authority
            AccountMeta::new(*mint, false),            // mint
            AccountMeta::new_readonly(*authority, true),  // mint authority (signer)
        ],
        data,
    }
}

/// SetAuthority (disc 6). authority_type: 0=MintTokens, 2=CloseAccount, etc.
fn build_set_authority_ix(
    account: &Pubkey, current: &Pubkey, new_auth: Option<&Pubkey>, auth_type: u8,
) -> Instruction {
    let mut data = Vec::with_capacity(35);
    data.push(6u8);
    data.push(auth_type);
    match new_auth {
        Some(pk) => { data.push(1u8); data.extend_from_slice(&pk.to_bytes()); }
        None => { data.push(0u8); data.extend_from_slice(&[0u8; 32]); }
    }
    Instruction {
        program_id: TOKEN_2022_PROGRAM_ID,
        accounts: vec![
            AccountMeta::new(*account, false),
            AccountMeta::new_readonly(*current, true),
        ],
        data,
    }
}

/// CloseAccount (disc 9).
fn build_close_account_ix(
    account: &Pubkey, destination: &Pubkey, authority: &Pubkey,
) -> Instruction {
    Instruction {
        program_id: TOKEN_2022_PROGRAM_ID,
        accounts: vec![
            AccountMeta::new(*account, false),
            AccountMeta::new(*destination, false),
            AccountMeta::new_readonly(*authority, true),
        ],
        data: vec![9u8],
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Compute mint account space for an NFT with embedded metadata.
///
/// Layout: mint(82) + type(1) + MetadataPointer(68) + PermanentDelegate(36)
/// + MintCloseAuthority(36) + [TransferFee(112)] + TokenMetadata TLV header(4)
/// + metadata content(80 + strings) + padding(64).
pub fn nft_mint_space(name: &str, symbol: &str, uri: &str, with_transfer_fee: bool) -> usize {
    let base = 82 + 1 + 68 + 36 + 36;
    let fee = if with_transfer_fee { 112 } else { 0 };
    // TokenMetadata TLV: header(4) + update_authority(32) + mint(32)
    //   + borsh strings: 3×u32(12) + content + additional_metadata vec len(4)
    let metadata = 4 + 32 + 32 + 12 + name.len() + symbol.len() + uri.len() + 4;
    base + fee + metadata + 64 // 64 bytes padding for safety
}

/// Discriminator for spl-token-metadata-interface Initialize instruction.
fn token_metadata_init_discriminator() -> [u8; 8] {
    use sha2::{Digest, Sha256};
    let hash = Sha256::digest(b"spl_token_metadata_interface:initialize_account");
    let mut disc = [0u8; 8];
    disc.copy_from_slice(&hash[..8]);
    disc
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn nft_mint_space_without_fee() {
        let name = "Test NFT"; // 8
        let symbol = "TEST"; // 4
        let uri = "https://example.com/meta.json"; // 29
        let space = nft_mint_space(name, symbol, uri, false);
        // base: 82+1+68+36+36 = 223
        // metadata: 4+32+32+12+8+4+29+4 = 125
        // padding: 64
        assert_eq!(space, 223 + 125 + 64);
    }

    #[test]
    fn nft_mint_space_with_fee() {
        let space = nft_mint_space("Test NFT", "TEST", "https://example.com/meta.json", true);
        let without = nft_mint_space("Test NFT", "TEST", "https://example.com/meta.json", false);
        assert_eq!(space, without + 112);
    }

    #[test]
    fn metadata_discriminator_is_sha256_prefix() {
        use sha2::{Digest, Sha256};
        let hash = Sha256::digest(b"spl_token_metadata_interface:initialize_account");
        let disc = token_metadata_init_discriminator();
        assert_eq!(&disc, &hash[..8]);
    }

    #[test]
    fn init_metadata_pointer_ix_layout() {
        let mint = Pubkey::new_unique();
        let auth = Pubkey::new_unique();
        let ix = build_init_metadata_pointer_ix(&mint, &auth);
        assert_eq!(ix.data[0], 39);
        assert_eq!(ix.data[1], 0);
        assert_eq!(ix.data.len(), 68);
        assert_eq!(ix.accounts.len(), 1);
    }

    #[test]
    fn init_permanent_delegate_ix_layout() {
        let mint = Pubkey::new_unique();
        let delegate = Pubkey::new_unique();
        let ix = build_init_permanent_delegate_ix(&mint, &delegate);
        assert_eq!(ix.data[0], 35);
        assert_eq!(ix.data.len(), 33);
    }

    #[test]
    fn init_mint_close_authority_ix_layout() {
        let mint = Pubkey::new_unique();
        let auth = Pubkey::new_unique();
        let ix = build_init_mint_close_authority_ix(&mint, &auth);
        assert_eq!(ix.data[0], 25);
        assert_eq!(ix.data.len(), 34);
    }

    #[test]
    fn set_authority_remove_mint_ix_layout() {
        let mint = Pubkey::new_unique();
        let auth = Pubkey::new_unique();
        let ix = build_set_authority_ix(&mint, &auth, None, 0);
        assert_eq!(ix.data[0], 6);
        assert_eq!(ix.data[1], 0); // MintTokens authority type
        assert_eq!(ix.data[2], 0); // COption::None
        assert_eq!(ix.data.len(), 35);
    }

    #[test]
    fn close_account_ix_layout() {
        let acct = Pubkey::new_unique();
        let dest = Pubkey::new_unique();
        let auth = Pubkey::new_unique();
        let ix = build_close_account_ix(&acct, &dest, &auth);
        assert_eq!(ix.data[0], 9);
        assert_eq!(ix.data.len(), 1);
        assert_eq!(ix.accounts.len(), 3);
    }
}
