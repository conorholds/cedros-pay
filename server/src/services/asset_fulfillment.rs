//! Asset fulfillment service.
//!
//! After a tokenized asset product is purchased, this service:
//! 1. Looks up the collection's tokenization config
//! 2. For fungible assets: mints tokens from the collection's Token-22 mint
//! 3. For non-fungible assets: creates a Metaplex Core NFT with PermanentBurnDelegate
//! 4. Records an AssetRedemption with status `pending_info`

use std::sync::Arc;

use chrono::Utc;
use solana_sdk::pubkey::Pubkey;
use tracing::{info, warn};

use crate::models::{AssetRedemption, AssetRedemptionStatus, Product, TenantToken22Mint};
use crate::repositories::ProductRepository;
use crate::services::cedros_login::CedrosLoginClient;
use crate::services::metaplex_core::MetaplexCoreService;
use crate::services::token22::Token22Service;
use crate::storage::Store;

/// Asset fulfillment service — mints tokens and tracks redemption lifecycle.
pub struct AssetFulfillmentService {
    cedros_login: Arc<CedrosLoginClient>,
    token22: Option<Arc<Token22Service>>,
    metaplex_core: Option<Arc<MetaplexCoreService>>,
    store: Arc<dyn Store>,
    product_repo: Arc<dyn ProductRepository>,
}

impl AssetFulfillmentService {
    pub fn new(
        cedros_login: Arc<CedrosLoginClient>,
        token22: Option<Arc<Token22Service>>,
        metaplex_core: Option<Arc<MetaplexCoreService>>,
        store: Arc<dyn Store>,
        product_repo: Arc<dyn ProductRepository>,
    ) -> Self {
        Self {
            cedros_login,
            token22,
            metaplex_core,
            store,
            product_repo,
        }
    }

    /// Fulfill a tokenized asset purchase.
    ///
    /// Best-effort — errors are logged but do not fail the payment.
    pub async fn fulfill_tokenized_asset(
        &self,
        tenant_id: &str,
        order_id: &str,
        product: &Product,
        user_id: Option<&str>,
        quantity: i32,
    ) {
        let config = match &product.tokenized_asset_config {
            Some(c) => c,
            None => return,
        };

        let collection_id = &config.asset_class_collection_id;

        // Look up the collection to get tokenization config
        let collection = match self.store.get_collection(tenant_id, collection_id).await {
            Ok(Some(c)) => c,
            Ok(None) => {
                warn!(
                    tenant_id = %tenant_id,
                    collection_id = %collection_id,
                    "Asset class collection not found"
                );
                return;
            }
            Err(e) => {
                warn!(error = %e, tenant_id = %tenant_id, "Failed to get asset class collection");
                return;
            }
        };

        let tokenization = match &collection.tokenization_config {
            Some(tc) => tc,
            None => {
                warn!(
                    tenant_id = %tenant_id,
                    collection_id = %collection_id,
                    "Collection has no tokenization config"
                );
                return;
            }
        };

        // Mint tokens for fungible asset classes
        let token_mint_signature = if tokenization.asset_class.is_fungible() {
            let total_tokens = config.tokens_per_unit * quantity as i64;
            self.try_mint_collection_tokens(
                tenant_id,
                collection_id,
                user_id,
                total_tokens as u64,
                order_id,
            )
            .await
        } else {
            // NFT minting: create Metaplex Core asset with PermanentBurnDelegate
            self.try_mint_nft(tenant_id, order_id, &product.id, user_id).await
        };

        // Record asset redemption with pending_info status
        let now = Utc::now();
        let redemption = AssetRedemption {
            id: uuid::Uuid::new_v4().to_string(),
            tenant_id: tenant_id.to_string(),
            order_id: order_id.to_string(),
            product_id: product.id.clone(),
            collection_id: collection_id.clone(),
            user_id: user_id.map(String::from),
            status: AssetRedemptionStatus::PendingInfo,
            form_data: serde_json::Value::Object(Default::default()),
            admin_notes: None,
            token_mint_signature,
            token_burn_signature: None,
            created_at: now,
            updated_at: now,
        };

        if let Err(e) = self.store.record_asset_redemption(redemption).await {
            warn!(
                error = %e,
                tenant_id = %tenant_id,
                order_id = %order_id,
                "Failed to record asset redemption"
            );
        }
    }

    /// Try to mint tokens from a collection's Token-22 mint.
    async fn try_mint_collection_tokens(
        &self,
        tenant_id: &str,
        collection_id: &str,
        user_id: Option<&str>,
        amount: u64,
        order_id: &str,
    ) -> Option<String> {
        let token22 = match &self.token22 {
            Some(t) => t,
            None => {
                warn!(tenant_id = %tenant_id, "Token-22 service not configured");
                return None;
            }
        };

        let user = match user_id {
            Some(u) => u,
            None => {
                warn!(tenant_id = %tenant_id, order_id = %order_id, "No user_id; skipping token mint");
                return None;
            }
        };

        // Get the collection-specific mint config
        let mint_config: TenantToken22Mint = match self
            .store
            .get_token22_mint_for_collection(tenant_id, collection_id)
            .await
        {
            Ok(Some(m)) => m,
            Ok(None) => {
                warn!(
                    tenant_id = %tenant_id,
                    collection_id = %collection_id,
                    "No Token-22 mint configured for asset class"
                );
                return None;
            }
            Err(e) => {
                warn!(error = %e, tenant_id = %tenant_id, "Failed to get collection mint config");
                return None;
            }
        };

        // Get recipient's embedded wallet
        let wallet_address = match self.cedros_login.get_embedded_wallet(user).await {
            Ok(Some(addr)) => addr,
            Ok(None) => {
                warn!(tenant_id = %tenant_id, user_id = %user, "No embedded wallet; skipping token mint");
                return None;
            }
            Err(e) => {
                warn!(error = %e, "Failed to get embedded wallet for asset token mint");
                return None;
            }
        };

        let recipient_pubkey = match wallet_address.parse::<Pubkey>() {
            Ok(pk) => pk,
            Err(e) => {
                warn!(error = %e, wallet = %wallet_address, "Invalid wallet pubkey");
                return None;
            }
        };

        let mint_pubkey = match mint_config.mint_address.parse::<Pubkey>() {
            Ok(pk) => pk,
            Err(e) => {
                warn!(error = %e, mint = %mint_config.mint_address, "Invalid mint pubkey");
                return None;
            }
        };

        match crate::services::token22::mint_tokens(token22, &mint_pubkey, &recipient_pubkey, amount).await {
            Ok(sig) => {
                info!(
                    tenant_id = %tenant_id,
                    order_id = %order_id,
                    collection_id = %collection_id,
                    signature = %sig,
                    amount = amount,
                    "Asset tokens minted"
                );
                Some(sig)
            }
            Err(e) => {
                warn!(
                    error = %e,
                    tenant_id = %tenant_id,
                    order_id = %order_id,
                    "Failed to mint asset tokens"
                );
                None
            }
        }
    }

    /// Create a Metaplex Core NFT asset for a non-fungible tokenized product.
    ///
    /// Best-effort: returns `None` on any error (logged as warnings). Returns
    /// the confirming transaction signature on success.
    async fn try_mint_nft(
        &self,
        tenant_id: &str,
        order_id: &str,
        product_id: &str,
        user_id: Option<&str>,
    ) -> Option<String> {
        let metaplex = match &self.metaplex_core {
            Some(m) => m,
            None => {
                warn!(tenant_id = %tenant_id, "MetaplexCoreService not configured; skipping NFT mint");
                return None;
            }
        };
        let user = user_id?;

        let wallet_address = match self.cedros_login.get_embedded_wallet(user).await {
            Ok(Some(addr)) => addr,
            Ok(None) => {
                warn!(tenant_id = %tenant_id, user_id = %user, "No embedded wallet; skipping NFT mint");
                return None;
            }
            Err(e) => {
                warn!(error = %e, "Failed to get embedded wallet for NFT mint");
                return None;
            }
        };

        let owner_pubkey = match wallet_address.parse::<Pubkey>() {
            Ok(pk) => pk,
            Err(e) => {
                warn!(error = %e, wallet = %wallet_address, "Invalid wallet pubkey for NFT mint");
                return None;
            }
        };

        let name = format!("Cedros Asset #{}", &product_id[..8.min(product_id.len())]);

        match crate::services::metaplex_core::create_asset(metaplex, &owner_pubkey, name, product_id).await {
            Ok(result) => {
                info!(
                    tenant_id = %tenant_id,
                    order_id = %order_id,
                    product_id = %product_id,
                    asset = %result.asset_address,
                    signature = %result.signature,
                    "Metaplex Core NFT minted"
                );
                // Persist asset address on the product (best-effort)
                self.persist_nft_mint_address(tenant_id, product_id, &result.asset_address).await;
                Some(result.signature)
            }
            Err(e) => {
                warn!(error = %e, "Failed to create Metaplex Core NFT");
                None
            }
        }
    }

    /// Persist the NFT mint address on the product's tokenized_asset_config.
    ///
    /// Best-effort: errors are logged but do not fail the overall flow.
    async fn persist_nft_mint_address(&self, tenant_id: &str, product_id: &str, mint_addr: &str) {
        match self.product_repo.get_product(tenant_id, product_id).await {
            Ok(mut product) => {
                if let Some(ref mut cfg) = product.tokenized_asset_config {
                    cfg.nft_mint_address = Some(mint_addr.to_string());
                    if let Err(e) = self.product_repo.update_product(product).await {
                        warn!(error = %e, product_id = %product_id, "Failed to persist NFT mint address");
                    }
                }
            }
            Err(e) => {
                warn!(error = %e, product_id = %product_id, "Failed to fetch product for NFT mint persistence");
            }
        }
    }

    /// Burn tokens for a completed redemption.
    ///
    /// Dispatches based on whether the product has an NFT mint address
    /// (Metaplex Core burn) or falls back to fungible Token-22 burn.
    /// Best-effort — returns `None` on any error (logged as warnings).
    pub async fn burn_redemption_tokens(
        &self,
        tenant_id: &str,
        collection_id: &str,
        product_id: &str,
        user_id: &str,
        amount: u64,
    ) -> Option<String> {
        // Check if this product has a Metaplex Core NFT to burn
        if let Ok(product) = self.product_repo.get_product(tenant_id, product_id).await {
            if let Some(ref tac) = product.tokenized_asset_config {
                if let Some(ref nft_addr) = tac.nft_mint_address {
                    return self.burn_nft_asset(nft_addr).await;
                }
            }
        }

        // Fungible path: Token-22 burn
        self.burn_fungible_tokens(tenant_id, collection_id, user_id, amount)
            .await
    }

    /// Burn a Metaplex Core NFT asset via PermanentBurnDelegate.
    async fn burn_nft_asset(&self, asset_address: &str) -> Option<String> {
        let metaplex = match &self.metaplex_core {
            Some(m) => m,
            None => {
                warn!("MetaplexCoreService not configured; skipping NFT burn");
                return None;
            }
        };

        let asset_pubkey = match asset_address.parse::<Pubkey>() {
            Ok(pk) => pk,
            Err(e) => {
                warn!(error = %e, asset = %asset_address, "Invalid asset pubkey for NFT burn");
                return None;
            }
        };

        match crate::services::metaplex_core::burn_asset(metaplex, &asset_pubkey).await {
            Ok(sig) => Some(sig),
            Err(e) => {
                warn!(error = %e, asset = %asset_address, "Failed to burn Metaplex Core NFT");
                None
            }
        }
    }

    /// Burn fungible Token-22 tokens from an owner's ATA.
    async fn burn_fungible_tokens(
        &self,
        tenant_id: &str,
        collection_id: &str,
        user_id: &str,
        amount: u64,
    ) -> Option<String> {
        let token22 = self.token22.as_ref()?;

        let mint_config = match self
            .store
            .get_token22_mint_for_collection(tenant_id, collection_id)
            .await
        {
            Ok(Some(m)) => m,
            Ok(None) => {
                warn!(
                    tenant_id = %tenant_id,
                    collection_id = %collection_id,
                    "No Token-22 mint for collection; skipping burn"
                );
                return None;
            }
            Err(e) => {
                warn!(error = %e, "Failed to get collection mint config for burn");
                return None;
            }
        };

        let mint_pubkey = match mint_config.mint_address.parse::<Pubkey>() {
            Ok(pk) => pk,
            Err(e) => {
                warn!(error = %e, mint = %mint_config.mint_address, "Invalid mint pubkey for burn");
                return None;
            }
        };

        let wallet_address = match self.cedros_login.get_embedded_wallet(user_id).await {
            Ok(Some(addr)) => addr,
            Ok(None) => {
                warn!(user_id = %user_id, "No embedded wallet; skipping token burn");
                return None;
            }
            Err(e) => {
                warn!(error = %e, "Failed to get embedded wallet for token burn");
                return None;
            }
        };

        let owner_pubkey = match wallet_address.parse::<Pubkey>() {
            Ok(pk) => pk,
            Err(e) => {
                warn!(error = %e, wallet = %wallet_address, "Invalid wallet pubkey for burn");
                return None;
            }
        };

        match crate::services::token22::burn_tokens(token22, &mint_pubkey, &owner_pubkey, amount)
            .await
        {
            Ok(sig) => Some(sig),
            Err(e) => {
                warn!(error = %e, "Failed to burn redemption tokens");
                None
            }
        }
    }
}
