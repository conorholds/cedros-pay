//! Gift card fulfillment service.
//!
//! After a gift card product is purchased, this service:
//! 1. Deposits credits to the recipient's cedros-login account
//! 2. Optionally mints Token-22 tokens for secondary market

use std::sync::Arc;

use chrono::Utc;
use solana_sdk::pubkey::Pubkey;
use tracing::{info, warn};

use crate::models::{GiftCardConfig, GiftCardRedemption, Product, TenantToken22Mint};
use crate::services::cedros_login::CedrosLoginClient;
use crate::services::token22::Token22Service;
use crate::storage::Store;

/// Gift card fulfillment service — deposits credits and optionally mints tokens.
pub struct GiftCardFulfillmentService {
    cedros_login: Arc<CedrosLoginClient>,
    token22: Option<Arc<Token22Service>>,
    store: Arc<dyn Store>,
}

impl GiftCardFulfillmentService {
    pub fn new(
        cedros_login: Arc<CedrosLoginClient>,
        token22: Option<Arc<Token22Service>>,
        store: Arc<dyn Store>,
    ) -> Self {
        Self {
            cedros_login,
            token22,
            store,
        }
    }

    /// Fulfill a gift card purchase: deposit credits and optionally mint tokens.
    ///
    /// When `recipient_user_id` is `None`, a one-time claim token is generated and
    /// the redemption is stored as unclaimed (`claimed = false`, `credits_issued = 0`).
    /// The recipient redeems later via `POST /paywall/v1/gift-card/claim/{token}`.
    ///
    /// `recipient_email` is stored on the pending redemption for display on the claim page.
    ///
    /// Best-effort — errors are logged but do not fail the payment.
    pub async fn fulfill_gift_card(
        &self,
        tenant_id: &str,
        order_id: &str,
        product: &Product,
        buyer_user_id: &str,
        recipient_user_id: Option<&str>,
        recipient_email: Option<&str>,
    ) {
        let gc = match &product.gift_card_config {
            Some(gc) => gc,
            None => return,
        };

        // When there is no known recipient, create a pending redemption with a claim token.
        let Some(recipient) = recipient_user_id else {
            self.record_pending_redemption(
                tenant_id,
                order_id,
                product,
                buyer_user_id,
                gc,
                recipient_email,
            )
            .await;
            return;
        };

        // Step 1: Deposit credits to recipient
        let credits_result = self
            .cedros_login
            .add_credits(
                recipient,
                gc.face_value_cents,
                &gc.currency,
                "gift_card",
                order_id,
            )
            .await;

        let credits_issued = match credits_result {
            Ok(balance) => {
                info!(
                    tenant_id = %tenant_id,
                    order_id = %order_id,
                    recipient = %recipient,
                    amount = gc.face_value_cents,
                    currency = %gc.currency,
                    "Gift card credits deposited"
                );
                balance.available
            }
            Err(e) => {
                warn!(
                    error = %e,
                    tenant_id = %tenant_id,
                    order_id = %order_id,
                    "Failed to deposit gift card credits"
                );
                return;
            }
        };

        // Step 2: Optionally mint Token-22 tokens for secondary market
        let (token_minted, token_mint_signature) = if gc.secondary_market {
            self.try_mint_token(tenant_id, recipient, gc.face_value_cents, order_id)
                .await
        } else {
            (false, None)
        };

        // Step 3: Record the redemption (immediately claimed)
        let now = Utc::now();
        let redemption = GiftCardRedemption {
            id: uuid::Uuid::new_v4().to_string(),
            tenant_id: tenant_id.to_string(),
            order_id: order_id.to_string(),
            product_id: product.id.clone(),
            buyer_user_id: buyer_user_id.to_string(),
            recipient_user_id: recipient.to_string(),
            face_value_cents: gc.face_value_cents,
            currency: gc.currency.clone(),
            credits_issued,
            token_minted,
            token_mint_signature,
            created_at: now,
            redemption_token: None,
            claimed: true,
            recipient_email: None,
            last_activity_at: Some(now),
        };

        if let Err(e) = self.store.record_gift_card_redemption(redemption).await {
            warn!(
                error = %e,
                tenant_id = %tenant_id,
                order_id = %order_id,
                "Failed to record gift card redemption"
            );
        }
    }

    /// Record a gift card redemption that is pending recipient claim.
    ///
    /// Called when no recipient user ID is available at purchase time.
    /// Generates a unique claim token the recipient can use later.
    async fn record_pending_redemption(
        &self,
        tenant_id: &str,
        order_id: &str,
        product: &Product,
        buyer_user_id: &str,
        gc: &GiftCardConfig,
        recipient_email: Option<&str>,
    ) {
        let redemption_token = uuid::Uuid::new_v4().to_string();

        let now = Utc::now();
        let redemption = GiftCardRedemption {
            id: uuid::Uuid::new_v4().to_string(),
            tenant_id: tenant_id.to_string(),
            order_id: order_id.to_string(),
            product_id: product.id.clone(),
            buyer_user_id: buyer_user_id.to_string(),
            // recipient not yet known; will be filled in at claim time
            recipient_user_id: String::new(),
            face_value_cents: gc.face_value_cents,
            currency: gc.currency.clone(),
            credits_issued: 0,
            token_minted: false,
            token_mint_signature: None,
            created_at: now,
            redemption_token: Some(redemption_token.clone()),
            claimed: false,
            recipient_email: recipient_email.map(String::from),
            last_activity_at: Some(now),
        };

        match self.store.record_gift_card_redemption(redemption).await {
            Ok(()) => {
                info!(
                    tenant_id = %tenant_id,
                    order_id = %order_id,
                    buyer = %buyer_user_id,
                    token = %redemption_token,
                    "Gift card pending redemption recorded; awaiting recipient claim"
                );
            }
            Err(e) => {
                warn!(
                    error = %e,
                    tenant_id = %tenant_id,
                    order_id = %order_id,
                    "Failed to record pending gift card redemption"
                );
            }
        }
    }

    /// Try to mint Token-22 tokens; returns (success, signature).
    async fn try_mint_token(
        &self,
        tenant_id: &str,
        recipient_user_id: &str,
        face_value_cents: i64,
        order_id: &str,
    ) -> (bool, Option<String>) {
        let token22 = match &self.token22 {
            Some(t) => t,
            None => {
                warn!(tenant_id = %tenant_id, "Token-22 service not configured for secondary market");
                return (false, None);
            }
        };

        // Get tenant's Token-22 mint config
        let mint_config: TenantToken22Mint =
            match self.store.get_tenant_token22_mint(tenant_id).await {
                Ok(Some(m)) => m,
                Ok(None) => {
                    warn!(tenant_id = %tenant_id, "No Token-22 mint configured for tenant");
                    return (false, None);
                }
                Err(e) => {
                    warn!(error = %e, tenant_id = %tenant_id, "Failed to get Token-22 mint config");
                    return (false, None);
                }
            };

        // Get recipient's embedded wallet
        let wallet_address = match self.cedros_login.get_embedded_wallet(recipient_user_id).await {
            Ok(Some(addr)) => addr,
            Ok(None) => {
                warn!(
                    tenant_id = %tenant_id,
                    user_id = %recipient_user_id,
                    "Recipient has no embedded wallet; skipping token mint"
                );
                return (false, None);
            }
            Err(e) => {
                warn!(error = %e, "Failed to get embedded wallet for token mint");
                return (false, None);
            }
        };

        let recipient_pubkey = match wallet_address.parse::<Pubkey>() {
            Ok(pk) => pk,
            Err(e) => {
                warn!(error = %e, wallet = %wallet_address, "Invalid wallet pubkey");
                return (false, None);
            }
        };

        let mint_pubkey = match mint_config.mint_address.parse::<Pubkey>() {
            Ok(pk) => pk,
            Err(e) => {
                warn!(error = %e, mint = %mint_config.mint_address, "Invalid mint pubkey");
                return (false, None);
            }
        };

        // Convert face value cents to token amount using configured decimals
        let amount = face_value_cents as u64;

        match crate::services::token22::mint_tokens(token22, &mint_pubkey, &recipient_pubkey, amount).await {
            Ok(sig) => {
                info!(
                    tenant_id = %tenant_id,
                    order_id = %order_id,
                    recipient = %recipient_user_id,
                    signature = %sig,
                    "Token-22 tokens minted for gift card"
                );
                (true, Some(sig))
            }
            Err(e) => {
                warn!(
                    error = %e,
                    tenant_id = %tenant_id,
                    order_id = %order_id,
                    "Failed to mint Token-22 tokens"
                );
                (false, None)
            }
        }
    }
}
