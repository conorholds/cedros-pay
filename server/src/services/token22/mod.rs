//! Token-22 service for secondary market gift card tokens.
//!
//! Creates Token-22 mints with transfer-fee extension and mints
//! store-credit tokens to user wallets. Uses raw instruction building
//! since the `spl-token-2022` crate has dependency conflicts.

use std::sync::Arc;

use solana_rpc_client::nonblocking::rpc_client::RpcClient;
use solana_sdk::{pubkey::Pubkey, signature::Keypair, signer::Signer};

use crate::config::X402Config;
use crate::services::BlockhashCache;
use crate::x402::ServerWallet;

mod mint;
mod operations;

pub use mint::{create_mint_with_transfer_fee, MintCreationResult};
pub use operations::{
    burn_tokens, freeze_account, get_associated_token_address_2022, harvest_fees, mint_tokens,
    thaw_account,
};

/// Well-known Token-22 program ID.
pub const TOKEN_2022_PROGRAM_ID: Pubkey =
    solana_sdk::pubkey!("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");

/// Token-22 service for creating mints and minting tokens.
pub struct Token22Service {
    rpc: Arc<RpcClient>,
    authority: Arc<Keypair>,
    blockhash_cache: Arc<BlockhashCache>,
}

impl Token22Service {
    pub fn new(
        rpc: Arc<RpcClient>,
        authority: Arc<Keypair>,
        blockhash_cache: Arc<BlockhashCache>,
    ) -> Self {
        Self {
            rpc,
            authority,
            blockhash_cache,
        }
    }

    /// Create a Token22Service from X402Config.
    ///
    /// Requires at least one server wallet in the config. Uses the first
    /// server wallet as the mint authority.
    pub fn new_from_config(config: &X402Config) -> Result<Self, String> {
        if config.rpc_url.is_empty() {
            return Err("x402.rpc_url is required for Token22Service".into());
        }
        let wallet_str = config
            .server_wallets
            .first()
            .ok_or("x402.server_wallets is empty; need at least one for Token22Service")?;
        let server_wallet = ServerWallet::from_string(wallet_str)
            .map_err(|e| format!("invalid server wallet: {e}"))?;
        let rpc = Arc::new(RpcClient::new(config.rpc_url.clone()));
        let blockhash_cache = Arc::new(BlockhashCache::with_default_ttl(rpc.clone()));
        Ok(Self {
            rpc,
            authority: Arc::new(server_wallet.keypair),
            blockhash_cache,
        })
    }

    pub fn authority_pubkey(&self) -> Pubkey {
        self.authority.pubkey()
    }
}
