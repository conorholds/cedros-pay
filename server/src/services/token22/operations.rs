//! Token-22 minting and fee harvesting operations.

use std::str::FromStr;

use solana_sdk::{
    hash::Hash,
    instruction::{AccountMeta, Instruction},
    pubkey::Pubkey,
    transaction::Transaction,
};

use super::{Token22Service, TOKEN_2022_PROGRAM_ID};

/// Derive the associated token address for Token-22.
///
/// Same PDA derivation as for SPL Token ATAs, but with Token-22 as the
/// token program seed instead of the classic SPL Token program ID.
pub fn get_associated_token_address_2022(owner: &Pubkey, mint: &Pubkey) -> Pubkey {
    let seeds: &[&[u8]] = &[
        owner.as_ref(),
        TOKEN_2022_PROGRAM_ID.as_ref(),
        mint.as_ref(),
    ];
    let (address, _bump) = Pubkey::find_program_address(seeds, &spl_associated_token_account::id());
    address
}

/// Build CreateAssociatedTokenAccountIdempotent for Token-22.
///
/// Accounts (per ATA program spec):
///   0. [signer, writable] Funding account (payer)
///   1. [writable]         Associated token account address
///   2. []                 Wallet address (owner)
///   3. []                 Token mint
///   4. []                 System program
///   5. []                 Token program (Token-22)
///
/// Discriminator 1 = CreateIdempotent (no-op if account already exists).
pub(super) fn build_create_ata_idempotent_ix(payer: &Pubkey, owner: &Pubkey, mint: &Pubkey) -> Instruction {
    let ata = get_associated_token_address_2022(owner, mint);
    Instruction {
        program_id: spl_associated_token_account::id(),
        accounts: vec![
            AccountMeta::new(*payer, true),
            AccountMeta::new(ata, false),
            AccountMeta::new_readonly(*owner, false),
            AccountMeta::new_readonly(*mint, false),
            AccountMeta::new_readonly(solana_sdk::system_program::id(), false),
            AccountMeta::new_readonly(TOKEN_2022_PROGRAM_ID, false),
        ],
        data: vec![1u8], // CreateIdempotent
    }
}

/// Build Burn instruction for Token-22.
///
/// Instruction data: discriminator 8 (Burn) + amount as u64 LE.
/// Accounts: token_account (writable), mint (writable), authority (signer).
pub(super) fn build_burn_ix(
    token_account: &Pubkey,
    mint: &Pubkey,
    authority: &Pubkey,
    amount: u64,
) -> Instruction {
    let mut data = Vec::with_capacity(9);
    data.push(8u8); // Burn
    data.extend_from_slice(&amount.to_le_bytes());

    Instruction {
        program_id: TOKEN_2022_PROGRAM_ID,
        accounts: vec![
            AccountMeta::new(*token_account, false),
            AccountMeta::new(*mint, false),
            AccountMeta::new_readonly(*authority, true),
        ],
        data,
    }
}

/// Build MintTo instruction for Token-22.
///
/// Instruction data: discriminator 7 (MintTo) + amount as u64 LE.
pub(super) fn build_mint_to_ix(
    mint: &Pubkey,
    destination: &Pubkey,
    authority: &Pubkey,
    amount: u64,
) -> Instruction {
    let mut data = Vec::with_capacity(9);
    data.push(7u8); // MintTo
    data.extend_from_slice(&amount.to_le_bytes());

    Instruction {
        program_id: TOKEN_2022_PROGRAM_ID,
        accounts: vec![
            AccountMeta::new(*mint, false),
            AccountMeta::new(*destination, false),
            AccountMeta::new_readonly(*authority, true),
        ],
        data,
    }
}

/// Mint tokens to a user's associated token account.
///
/// Creates the ATA idempotently (no-op if it already exists), then mints
/// `amount` raw token units. Returns the confirming transaction signature.
/// Errors are returned as human-readable strings.
pub async fn mint_tokens(
    service: &Token22Service,
    mint: &Pubkey,
    recipient: &Pubkey,
    amount: u64,
) -> Result<String, String> {
    let authority = service.authority_pubkey();
    let ata = get_associated_token_address_2022(recipient, mint);

    let create_ata_ix = build_create_ata_idempotent_ix(&authority, recipient, mint);
    let mint_ix = build_mint_to_ix(mint, &ata, &authority, amount);

    let bh_response = service
        .blockhash_cache
        .get_blockhash()
        .await
        .map_err(|e| format!("blockhash fetch failed: {e}"))?;

    let blockhash = Hash::from_str(&bh_response.blockhash)
        .map_err(|e| format!("invalid blockhash from cache: {e}"))?;

    let tx = Transaction::new_signed_with_payer(
        &[create_ata_ix, mint_ix],
        Some(&authority),
        &[&*service.authority],
        blockhash,
    );

    let sig = service
        .rpc
        .send_and_confirm_transaction(&tx)
        .await
        .map_err(|e| format!("mint tokens tx failed: {e}"))?;

    Ok(sig.to_string())
}

/// Burn tokens from an owner's associated token account.
///
/// Submits a single Burn instruction for `amount` raw token units from the
/// owner's ATA. The service authority must be the mint authority (or a
/// delegated burn authority). Returns the confirming transaction signature.
/// Errors are returned as human-readable strings.
pub async fn burn_tokens(
    service: &Token22Service,
    mint: &Pubkey,
    owner: &Pubkey,
    amount: u64,
) -> Result<String, String> {
    let authority = service.authority_pubkey();
    let ata = get_associated_token_address_2022(owner, mint);

    let burn_ix = build_burn_ix(&ata, mint, &authority, amount);

    let bh_response = service
        .blockhash_cache
        .get_blockhash()
        .await
        .map_err(|e| format!("blockhash fetch failed: {e}"))?;

    let blockhash = Hash::from_str(&bh_response.blockhash)
        .map_err(|e| format!("invalid blockhash from cache: {e}"))?;

    let tx = Transaction::new_signed_with_payer(
        &[burn_ix],
        Some(&authority),
        &[&*service.authority],
        blockhash,
    );

    let sig = service
        .rpc
        .send_and_confirm_transaction(&tx)
        .await
        .map_err(|e| format!("burn tokens tx failed: {e}"))?;

    Ok(sig.to_string())
}

/// Build FreezeAccount instruction for Token-22.
///
/// Instruction data: discriminator 10 (FreezeAccount).
/// Accounts: token_account (writable), mint (read-only), authority (signer).
fn build_freeze_account_ix(
    token_account: &Pubkey,
    mint: &Pubkey,
    authority: &Pubkey,
) -> Instruction {
    Instruction {
        program_id: TOKEN_2022_PROGRAM_ID,
        accounts: vec![
            AccountMeta::new(*token_account, false),
            AccountMeta::new_readonly(*mint, false),
            AccountMeta::new_readonly(*authority, true),
        ],
        data: vec![10u8], // FreezeAccount
    }
}

/// Build ThawAccount instruction for Token-22.
///
/// Instruction data: discriminator 11 (ThawAccount).
/// Accounts: token_account (writable), mint (read-only), authority (signer).
fn build_thaw_account_ix(
    token_account: &Pubkey,
    mint: &Pubkey,
    authority: &Pubkey,
) -> Instruction {
    Instruction {
        program_id: TOKEN_2022_PROGRAM_ID,
        accounts: vec![
            AccountMeta::new(*token_account, false),
            AccountMeta::new_readonly(*mint, false),
            AccountMeta::new_readonly(*authority, true),
        ],
        data: vec![11u8], // ThawAccount
    }
}

/// Freeze a token account, preventing all transfers.
///
/// Requires the service authority to be the mint's freeze authority.
/// Returns the confirming transaction signature.
pub async fn freeze_account(
    service: &Token22Service,
    mint: &Pubkey,
    owner: &Pubkey,
) -> Result<String, String> {
    let authority = service.authority_pubkey();
    let ata = get_associated_token_address_2022(owner, mint);

    let ix = build_freeze_account_ix(&ata, mint, &authority);

    let bh_response = service
        .blockhash_cache
        .get_blockhash()
        .await
        .map_err(|e| format!("blockhash fetch failed: {e}"))?;

    let blockhash = Hash::from_str(&bh_response.blockhash)
        .map_err(|e| format!("invalid blockhash from cache: {e}"))?;

    let tx = Transaction::new_signed_with_payer(
        &[ix],
        Some(&authority),
        &[&*service.authority],
        blockhash,
    );

    let sig = service
        .rpc
        .send_and_confirm_transaction(&tx)
        .await
        .map_err(|e| format!("freeze account tx failed: {e}"))?;

    Ok(sig.to_string())
}

/// Thaw a frozen token account, re-enabling transfers.
///
/// Requires the service authority to be the mint's freeze authority.
/// Returns the confirming transaction signature.
pub async fn thaw_account(
    service: &Token22Service,
    mint: &Pubkey,
    owner: &Pubkey,
) -> Result<String, String> {
    let authority = service.authority_pubkey();
    let ata = get_associated_token_address_2022(owner, mint);

    let ix = build_thaw_account_ix(&ata, mint, &authority);

    let bh_response = service
        .blockhash_cache
        .get_blockhash()
        .await
        .map_err(|e| format!("blockhash fetch failed: {e}"))?;

    let blockhash = Hash::from_str(&bh_response.blockhash)
        .map_err(|e| format!("invalid blockhash from cache: {e}"))?;

    let tx = Transaction::new_signed_with_payer(
        &[ix],
        Some(&authority),
        &[&*service.authority],
        blockhash,
    );

    let sig = service
        .rpc
        .send_and_confirm_transaction(&tx)
        .await
        .map_err(|e| format!("thaw account tx failed: {e}"))?;

    Ok(sig.to_string())
}

/// Build WithdrawWithheldTokensFromAccounts instruction.
///
/// Token-22 TransferFeeExtension layout:
///   [0]: 26  — TransferFeeExtension discriminator
///   [1]: 3   — WithdrawWithheldTokensFromAccounts sub-instruction
///   [2]: num_accounts (u8)
///
/// Accounts:
///   0. [writable] Mint
///   1. [writable] Fee destination (treasury ATA)
///   2. [signer]   Withdraw withheld authority
///   3..N [writable] Source accounts with withheld fees
fn build_harvest_fees_ix(
    mint: &Pubkey,
    destination: &Pubkey,
    authority: &Pubkey,
    source_accounts: &[Pubkey],
) -> Instruction {
    let mut data = Vec::with_capacity(3);
    data.push(26u8); // TransferFeeExtension
    data.push(3u8); // WithdrawWithheldTokensFromAccounts
    data.push(source_accounts.len() as u8);

    let mut accounts = vec![
        AccountMeta::new(*mint, false),
        AccountMeta::new(*destination, false),
        AccountMeta::new_readonly(*authority, true),
    ];
    for src in source_accounts {
        accounts.push(AccountMeta::new(*src, false));
    }

    Instruction {
        program_id: TOKEN_2022_PROGRAM_ID,
        accounts,
        data,
    }
}

/// Harvest accumulated transfer fees from token accounts to the treasury.
///
/// Ensures the treasury ATA exists (idempotent create), then submits a
/// single WithdrawWithheldTokensFromAccounts instruction covering all
/// `source_accounts`. Returns the confirming transaction signature.
///
/// Errors if `source_accounts` is empty or any RPC call fails.
pub async fn harvest_fees(
    service: &Token22Service,
    mint: &Pubkey,
    treasury: &Pubkey,
    source_accounts: &[Pubkey],
) -> Result<String, String> {
    if source_accounts.is_empty() {
        return Err("no source accounts to harvest from".to_string());
    }

    let authority = service.authority_pubkey();
    let treasury_ata = get_associated_token_address_2022(treasury, mint);

    let create_treasury_ata_ix = build_create_ata_idempotent_ix(&authority, treasury, mint);
    let harvest_ix = build_harvest_fees_ix(mint, &treasury_ata, &authority, source_accounts);

    let bh_response = service
        .blockhash_cache
        .get_blockhash()
        .await
        .map_err(|e| format!("blockhash fetch failed: {e}"))?;

    let blockhash = Hash::from_str(&bh_response.blockhash)
        .map_err(|e| format!("invalid blockhash from cache: {e}"))?;

    let tx = Transaction::new_signed_with_payer(
        &[create_treasury_ata_ix, harvest_ix],
        Some(&authority),
        &[&*service.authority],
        blockhash,
    );

    let sig = service
        .rpc
        .send_and_confirm_transaction(&tx)
        .await
        .map_err(|e| format!("harvest fees tx failed: {e}"))?;

    Ok(sig.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn harvest_fees_rejects_empty_sources() {
        // Construct a minimal Token22Service is non-trivial without a live RPC,
        // so we test the guard logic directly via the public function signature.
        // The guard fires synchronously before any await, so we can drive it
        // with a dummy future by checking the Err path inline.
        //
        // Use a runtime only to satisfy the async boundary; the error is
        // returned before any I/O.
        let rt = tokio::runtime::Runtime::new().unwrap();
        let rpc = std::sync::Arc::new(
            solana_rpc_client::nonblocking::rpc_client::RpcClient::new_mock(
                "http://localhost:8899".to_string(),
            ),
        );
        let keypair = std::sync::Arc::new(solana_sdk::signature::Keypair::new());
        let cache = std::sync::Arc::new(crate::services::BlockhashCache::new(
            rpc.clone(),
            std::time::Duration::from_secs(1),
        ));
        let service = Token22Service::new(rpc, keypair, cache);
        let mint = Pubkey::new_unique();
        let treasury = Pubkey::new_unique();

        let result = rt.block_on(harvest_fees(&service, &mint, &treasury, &[]));
        assert_eq!(
            result,
            Err("no source accounts to harvest from".to_string())
        );
    }

    #[test]
    fn ata_derivation_is_deterministic() {
        let owner = Pubkey::new_unique();
        let mint = Pubkey::new_unique();
        let addr1 = get_associated_token_address_2022(&owner, &mint);
        let addr2 = get_associated_token_address_2022(&owner, &mint);
        assert_eq!(addr1, addr2);
    }

    #[test]
    fn burn_ix_has_correct_discriminator_and_length() {
        let token_account = Pubkey::new_unique();
        let mint = Pubkey::new_unique();
        let authority = Pubkey::new_unique();
        let ix = build_burn_ix(&token_account, &mint, &authority, 1_000_000);
        assert_eq!(ix.data[0], 8u8, "Burn discriminator must be 8");
        assert_eq!(ix.data.len(), 9, "Burn data must be 1 + 8 bytes");
        let amount = u64::from_le_bytes(ix.data[1..9].try_into().unwrap());
        assert_eq!(amount, 1_000_000);
        assert_eq!(ix.accounts.len(), 3);
        assert!(ix.accounts[2].is_signer, "authority must be signer");
        assert!(!ix.accounts[2].is_writable, "authority must be read-only");
    }
}
