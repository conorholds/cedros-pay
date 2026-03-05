//! Token-22 mint creation with transfer-fee extension.

use std::str::FromStr;

#[allow(deprecated)] // solana_sdk::system_instruction re-exported; solana_system_interface not in dep tree
use solana_sdk::system_instruction;
use solana_sdk::{
    hash::Hash,
    instruction::{AccountMeta, Instruction},
    pubkey::Pubkey,
    signature::Keypair,
    signer::Signer,
    transaction::Transaction,
};

use super::{Token22Service, TOKEN_2022_PROGRAM_ID};

/// Result of mint creation.
pub struct MintCreationResult {
    pub mint_address: Pubkey,
    pub signature: String,
}

/// Calculate space needed for a Token-22 mint with TransferFeeConfig extension.
///
/// Layout: Mint (82 bytes) + account_type (1) + extension header (4)
///         + TransferFeeConfig (108 bytes) = 195 bytes.
/// Rounded up to 234 bytes as an empirically safe size.
fn mint_space_with_transfer_fee() -> usize {
    // Base mint:          82 bytes
    // Account type:        1 byte
    // Extension type u16:  2 bytes
    // Extension length u16: 2 bytes
    // TransferFeeConfig:  108 bytes
    // Total: 195, rounded up for safety
    234
}

/// Build the InitializeTransferFeeConfig instruction (must precede InitializeMint2).
///
/// Instruction data layout:
///   [0]    : 26  — TransferFeeExtension discriminator
///   [1]    : 0   — sub-instruction InitializeTransferFeeConfig
///   [2]    : 1   — COption::Some for transfer_fee_config_authority
///   [3..35]: authority pubkey (32 bytes)
///   [36]   : 1   — COption::Some for withdraw_withheld_authority
///   [37..69]: authority pubkey (32 bytes)
///   [70..72]: transfer_fee_basis_points (u16 LE)
///   [72..80]: maximum_fee (u64 LE)
fn build_init_transfer_fee_config_ix(
    mint: &Pubkey,
    authority: &Pubkey,
    transfer_fee_bps: u16,
    max_fee: u64,
) -> Instruction {
    let mut data = Vec::with_capacity(80);
    data.push(26u8); // TransferFeeExtension
    data.push(0u8); // sub: InitializeTransferFeeConfig
    // transfer_fee_config_authority: COption::Some(authority)
    data.push(1u8);
    data.extend_from_slice(&authority.to_bytes());
    // withdraw_withheld_authority: COption::Some(authority)
    data.push(1u8);
    data.extend_from_slice(&authority.to_bytes());
    data.extend_from_slice(&transfer_fee_bps.to_le_bytes());
    data.extend_from_slice(&max_fee.to_le_bytes());

    Instruction {
        program_id: TOKEN_2022_PROGRAM_ID,
        accounts: vec![AccountMeta::new(*mint, false)],
        data,
    }
}

/// Build InitializeMint2 instruction for Token-22.
///
/// Discriminator 20 matches spl-token's InitializeMint2; Token-22 shares the same
/// layout but targets a different program ID.
fn build_init_mint2_ix(
    mint: &Pubkey,
    mint_authority: &Pubkey,
    freeze_authority: Option<&Pubkey>,
    decimals: u8,
) -> Instruction {
    let mut data = Vec::with_capacity(67);
    data.push(20u8); // InitializeMint2
    data.push(decimals);
    data.extend_from_slice(&mint_authority.to_bytes());
    match freeze_authority {
        Some(fa) => {
            data.push(1u8); // COption::Some
            data.extend_from_slice(&fa.to_bytes());
        }
        None => {
            data.push(0u8); // COption::None
            data.extend_from_slice(&[0u8; 32]);
        }
    }

    Instruction {
        program_id: TOKEN_2022_PROGRAM_ID,
        accounts: vec![AccountMeta::new(*mint, false)],
        data,
    }
}

/// Create a Token-22 mint with TransferFee extension.
///
/// Steps:
///   1. Allocate a new mint keypair.
///   2. Create the on-chain account with enough space for mint + extension.
///   3. Initialize the transfer-fee config (must precede InitializeMint2).
///   4. Initialize the mint.
///
/// Returns the new mint address and the confirming transaction signature.
/// Errors are returned as human-readable strings.
pub async fn create_mint_with_transfer_fee(
    service: &Token22Service,
    decimals: u8,
    transfer_fee_bps: u16,
    max_fee: u64,
) -> Result<MintCreationResult, String> {
    let mint_keypair = Keypair::new();
    let mint_pubkey = mint_keypair.pubkey();
    let authority = service.authority_pubkey();

    let space = mint_space_with_transfer_fee();
    let lamports = service
        .rpc
        .get_minimum_balance_for_rent_exemption(space)
        .await
        .map_err(|e| format!("rent exemption query failed: {e}"))?;

    let create_account_ix = system_instruction::create_account(
        &authority,
        &mint_pubkey,
        lamports,
        space as u64,
        &TOKEN_2022_PROGRAM_ID,
    );

    let init_fee_ix =
        build_init_transfer_fee_config_ix(&mint_pubkey, &authority, transfer_fee_bps, max_fee);

    let init_mint_ix = build_init_mint2_ix(&mint_pubkey, &authority, None, decimals);

    let bh_response = service
        .blockhash_cache
        .get_blockhash()
        .await
        .map_err(|e| format!("blockhash fetch failed: {e}"))?;

    let blockhash = Hash::from_str(&bh_response.blockhash)
        .map_err(|e| format!("invalid blockhash from cache: {e}"))?;

    let tx = Transaction::new_signed_with_payer(
        &[create_account_ix, init_fee_ix, init_mint_ix],
        Some(&authority),
        &[&*service.authority, &mint_keypair],
        blockhash,
    );

    let sig = service
        .rpc
        .send_and_confirm_transaction(&tx)
        .await
        .map_err(|e| format!("mint creation tx failed: {e}"))?;

    Ok(MintCreationResult {
        mint_address: mint_pubkey,
        signature: sig.to_string(),
    })
}
