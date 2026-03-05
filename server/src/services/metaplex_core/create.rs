//! Create a Metaplex Core asset (NFT) with PermanentBurnDelegate.

use std::str::FromStr;

use mpl_core::instructions::CreateV1Builder;
use mpl_core::types::{PermanentBurnDelegate, Plugin, PluginAuthority, PluginAuthorityPair};
use solana_sdk::hash::Hash;
use solana_sdk::pubkey::Pubkey;
use solana_sdk::signature::Keypair;
use solana_sdk::signer::Signer;
use solana_sdk::transaction::Transaction;

use super::MetaplexCoreService;

/// Result of creating a Metaplex Core asset.
pub struct AssetCreationResult {
    pub asset_address: String,
    pub signature: String,
}

/// Create a Metaplex Core asset owned by `owner` with a PermanentBurnDelegate
/// allowing the server authority to burn it at redemption time.
///
/// Returns the asset address and confirming transaction signature.
pub async fn create_asset(
    svc: &MetaplexCoreService,
    owner: &Pubkey,
    name: String,
    product_id: &str,
) -> Result<AssetCreationResult, String> {
    let asset = Keypair::new();

    let uri = if svc.metadata_base_url.is_empty() {
        String::new()
    } else {
        format!(
            "{}/paywall/v1/products/{}/nft-metadata",
            svc.metadata_base_url, product_id
        )
    };

    let ix = CreateV1Builder::new()
        .asset(asset.pubkey())
        .payer(svc.authority.pubkey())
        .owner(Some(*owner))
        .update_authority(Some(svc.authority.pubkey()))
        .name(name)
        .uri(uri)
        .plugins(vec![PluginAuthorityPair {
            plugin: Plugin::PermanentBurnDelegate(PermanentBurnDelegate {}),
            authority: Some(PluginAuthority::UpdateAuthority),
        }])
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
        &[&svc.authority, &asset],
        blockhash,
    );

    let sig = svc
        .rpc
        .send_and_confirm_transaction(&tx)
        .await
        .map_err(|e| format!("create asset tx failed: {e}"))?;

    Ok(AssetCreationResult {
        asset_address: asset.pubkey().to_string(),
        signature: sig.to_string(),
    })
}
