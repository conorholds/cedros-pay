//! Burn a Metaplex Core asset via the PermanentBurnDelegate.

use std::str::FromStr;

use mpl_core::instructions::BurnV1Builder;
use solana_sdk::hash::Hash;
use solana_sdk::pubkey::Pubkey;
use solana_sdk::signer::Signer;
use solana_sdk::transaction::Transaction;

use super::MetaplexCoreService;

/// Burn a Metaplex Core asset using the server's PermanentBurnDelegate authority.
///
/// Returns the confirming transaction signature.
pub async fn burn_asset(
    svc: &MetaplexCoreService,
    asset_address: &Pubkey,
) -> Result<String, String> {
    let ix = BurnV1Builder::new()
        .asset(*asset_address)
        .payer(svc.authority.pubkey())
        .authority(Some(svc.authority.pubkey()))
        .instruction();

    let bh = svc
        .blockhash_cache
        .get_blockhash()
        .await
        .map_err(|e| format!("blockhash fetch failed: {e}"))?;

    let blockhash =
        Hash::from_str(&bh.blockhash).map_err(|e| format!("invalid blockhash: {e}"))?;

    let tx = Transaction::new_signed_with_payer(
        &[ix],
        Some(&svc.authority.pubkey()),
        &[&svc.authority],
        blockhash,
    );

    let sig = svc
        .rpc
        .send_and_confirm_transaction(&tx)
        .await
        .map_err(|e| format!("burn asset tx failed: {e}"))?;

    Ok(sig.to_string())
}
