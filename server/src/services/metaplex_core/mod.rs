//! Metaplex Core service for non-fungible tokenized assets.
//!
//! Creates single-account NFTs using Metaplex Core with a
//! `PermanentBurnDelegate` plugin so the server can burn at redemption
//! completion without requiring the buyer's signature.

use std::sync::Arc;

use solana_rpc_client::nonblocking::rpc_client::RpcClient;
use solana_sdk::signature::Keypair;

use crate::config::X402Config;
use crate::services::BlockhashCache;
use crate::x402::ServerWallet;

mod burn;
mod create;

pub use burn::burn_asset;
pub use create::{create_asset, AssetCreationResult};

/// Metaplex Core NFT service — mint and burn single-account assets.
pub struct MetaplexCoreService {
    pub(crate) rpc: Arc<RpcClient>,
    pub(crate) authority: Arc<Keypair>,
    pub(crate) blockhash_cache: Arc<BlockhashCache>,
    pub(crate) metadata_base_url: String,
}

impl MetaplexCoreService {
    /// Create from X402Config, mirroring `Token22Service::new_from_config`.
    ///
    /// Uses the first server wallet as the update authority / payer.
    /// `metadata_base_url` is the server's public URL for NFT metadata URIs.
    pub fn new_from_config(config: &X402Config, metadata_base_url: String) -> Result<Self, String> {
        if config.rpc_url.is_empty() {
            return Err("x402.rpc_url is required for MetaplexCoreService".into());
        }
        let wallet_str = config
            .server_wallets
            .first()
            .ok_or("x402.server_wallets is empty; need at least one for MetaplexCoreService")?;
        let server_wallet = ServerWallet::from_string(wallet_str)
            .map_err(|e| format!("invalid server wallet: {e}"))?;
        let rpc = Arc::new(RpcClient::new(config.rpc_url.clone()));
        let blockhash_cache = Arc::new(BlockhashCache::with_default_ttl(rpc.clone()));
        Ok(Self {
            rpc,
            authority: Arc::new(server_wallet.keypair),
            blockhash_cache,
            metadata_base_url,
        })
    }
}
