//! PaywallService implementation
//!
//! Main service for payment processing, quote generation, and authorization.

use std::collections::{HashMap, HashSet};
use std::sync::Arc;
use std::time::{Duration, Instant};

use parking_lot::Mutex;

use chrono::Utc;
use sha2::{Digest, Sha256};
use solana_sdk::pubkey::Pubkey;
use std::str::FromStr;
use subtle::ConstantTimeEq;
use tracing::{debug, error, info, warn};

use crate::config::Config;
use crate::constants::{PAYMENT_CALLBACK_TIMEOUT, STRIPE_SIGNATURE_PREFIX};
use crate::errors::ErrorCode;
use crate::models::{
    get_asset, Asset, AssetMetadata, AssetType, AuthorizationResult, CartItem, CartQuote, Coupon,
    CreditsOption, CryptoQuote, Money, Order, OrderItem, PaymentEvent, PaymentTransaction, Product,
    Quote, RefundQuote, Requirement, RoundingMode, SettlementResponse, SolanaExtra, StripeOption,
};
use crate::observability::record_payment;
use crate::repositories::{CouponRepository, ProductRepository};
use crate::services::cedros_login::CedrosLoginClient;
use crate::services::messaging::MessagingService;
use crate::services::{ServiceError, ServiceResult, SubscriptionChecker};
use crate::storage::Store;
use crate::webhooks::Notifier;
use crate::x402::gasless::{GaslessError, GaslessTransactionBuilder};
use crate::x402::utils::validate_signature;
use crate::x402::{generate_cart_id, generate_refund_id, Verifier, VerifierError};

// Import from sibling modules
use super::coupons::{interpolate_memo, stack_coupons_on_money, stack_coupons_on_money_iter};
use super::types::{to_chrono_duration, GaslessTransactionData, PaymentVerificationResult};

// Re-export types that were previously defined here
pub use super::coupons::select_coupons_for_payment;
pub use super::types::{CouponScope, RefundQuoteResponse};

include!("refund_locks.rs");

// ============================================================================
// PaywallService
// ============================================================================

pub struct PaywallService {
    pub config: Config,
    pub store: Arc<dyn Store>,
    pub verifier: Arc<dyn Verifier>,
    pub notifier: Arc<dyn Notifier>,
    pub products: Arc<dyn ProductRepository>,
    pub coupons: Arc<dyn CouponRepository>,
    gasless_builder: Option<Arc<GaslessTransactionBuilder>>,
    /// Per spec (19-services-paywall.md): Optional subscription checker for access control
    subscription_checker: Option<Arc<dyn SubscriptionChecker>>,
    /// Lock manager to prevent race conditions in cumulative refund validation
    refund_locks: RefundLockManager,
    /// Optional cedros-login client for user_id resolution
    cedros_login: Option<Arc<CedrosLoginClient>>,

    wallet_user_cache: crate::ttl_cache::TtlCache<Option<String>>,

    /// Optional library callback for embedding applications.
    payment_callback: Option<Arc<dyn crate::PaymentCallback>>,

    /// Optional messaging service for email receipts and order webhooks
    messaging: Option<Arc<dyn MessagingService>>,
}

impl PaywallService {
    pub fn new(
        config: Config,
        store: Arc<dyn Store>,
        verifier: Arc<dyn Verifier>,
        notifier: Arc<dyn Notifier>,
        products: Arc<dyn ProductRepository>,
        coupons: Arc<dyn CouponRepository>,
    ) -> Self {
        // Initialize gasless builder if enabled
        let gasless_builder = if config.x402.gasless_enabled {
            GaslessTransactionBuilder::new(&config.x402)
                .ok()
                .map(Arc::new)
        } else {
            None
        };

        Self {
            config,
            store,
            verifier,
            notifier,
            products,
            coupons,
            gasless_builder,
            subscription_checker: None,
            refund_locks: RefundLockManager::new(),
            cedros_login: None,
            wallet_user_cache: crate::ttl_cache::TtlCache::new(10_000),
            payment_callback: None,
            messaging: None,
        }
    }

    /// Set gasless builder (for testing or custom configuration)
    pub fn with_gasless_builder(mut self, builder: Arc<GaslessTransactionBuilder>) -> Self {
        self.gasless_builder = Some(builder);
        self
    }

    /// Per spec (19-services-paywall.md): Set subscription checker for access control
    pub fn set_subscription_checker(&mut self, checker: Arc<dyn SubscriptionChecker>) {
        self.subscription_checker = Some(checker);
    }

    /// Per spec (19-services-paywall.md): Builder method to set subscription checker
    pub fn with_subscription_checker(mut self, checker: Arc<dyn SubscriptionChecker>) -> Self {
        self.subscription_checker = Some(checker);
        self
    }

    /// Set cedros-login client for user_id resolution
    pub fn with_cedros_login(mut self, client: Arc<CedrosLoginClient>) -> Self {
        self.cedros_login = Some(client);
        self
    }

    /// Set payment callback for library embedding.
    pub fn with_payment_callback(mut self, callback: Arc<dyn crate::PaymentCallback>) -> Self {
        self.payment_callback = Some(callback);
        self
    }

    /// Set messaging service for email receipts and order webhooks
    pub fn with_messaging(mut self, service: Arc<dyn MessagingService>) -> Self {
        self.messaging = Some(service);
        self
    }

    /// Send order notifications via messaging service (fire-and-forget)
    pub(crate) async fn notify_order_created(&self, order: &Order) {
        if let Some(ref messaging) = self.messaging {
            messaging.notify_order_created(order).await;
        }
    }

    pub(crate) async fn call_payment_callback(&self, event: &PaymentEvent) {
        let Some(cb) = self.payment_callback.as_ref() else {
            return;
        };
        match tokio::time::timeout(PAYMENT_CALLBACK_TIMEOUT, cb.on_payment_success(event)).await {
            Ok(Ok(())) => {}
            Ok(Err(e)) => {
                tracing::warn!(error = %e, "PaymentCallback::on_payment_success failed");
            }
            Err(_) => {
                tracing::warn!(
                    timeout_ms = PAYMENT_CALLBACK_TIMEOUT.as_millis(),
                    "PaymentCallback::on_payment_success timed out"
                );
            }
        };
    }

    pub(crate) async fn call_refund_callback(&self, event: &crate::models::RefundEvent) {
        let Some(cb) = self.payment_callback.as_ref() else {
            return;
        };
        match tokio::time::timeout(PAYMENT_CALLBACK_TIMEOUT, cb.on_refund_processed(event)).await {
            Ok(Ok(())) => {}
            Ok(Err(e)) => {
                tracing::warn!(error = %e, "PaymentCallback::on_refund_processed failed");
            }
            Err(_) => {
                tracing::warn!(
                    timeout_ms = PAYMENT_CALLBACK_TIMEOUT.as_millis(),
                    "PaymentCallback::on_refund_processed timed out"
                );
            }
        }
    }

    /// Resolve user_id from wallet address via cedros-login
    /// Returns None if cedros-login is not configured or lookup fails
    pub(crate) async fn resolve_user_id_from_wallet(&self, wallet: &str) -> Option<String> {
        // REL-001: Add timeout to prevent hanging requests
        const LOOKUP_TIMEOUT: Duration = Duration::from_secs(5);
        const POSITIVE_TTL: Duration = Duration::from_secs(15 * 60);
        const NEGATIVE_TTL: Duration = Duration::from_secs(60);

        let client = self.cedros_login.as_ref()?;

        if let Some(cached) = self.wallet_user_cache.get(wallet) {
            return cached;
        }

        // REL-001: Wrap in timeout to prevent indefinite hanging
        match tokio::time::timeout(LOOKUP_TIMEOUT, client.lookup_user_by_wallet(wallet)).await {
            Ok(Ok(user_id)) => {
                self.wallet_user_cache
                    .set(wallet.to_string(), user_id.clone(), POSITIVE_TTL);
                user_id
            }
            Ok(Err(e)) => {
                tracing::debug!(wallet = %wallet, error = %e, "Failed to resolve user_id from wallet");
                self.wallet_user_cache
                    .set(wallet.to_string(), None, NEGATIVE_TTL);
                None
            }
            Err(_) => {
                tracing::warn!(wallet = %wallet, timeout_secs = LOOKUP_TIMEOUT.as_secs(), "cedros-login lookup timed out");
                self.wallet_user_cache
                    .set(wallet.to_string(), None, NEGATIVE_TTL);
                None
            }
        }
    }

    pub(crate) async fn extract_user_id_from_auth_header(
        &self,
        auth_header: &str,
    ) -> Option<String> {
        let client = self.cedros_login.as_ref()?;
        client.extract_user_id_from_auth_header(auth_header).await
    }
}

include!("quotes.rs");
mod authorize_part1;
mod authorize_part2;
pub use authorize_part1::AuthorizeWithWalletRequest;
include!("cart.rs");
include!("refunds.rs");
include!("helpers.rs");
include!("verify.rs");

#[cfg(test)]
mod tests {
    include!("tests.rs");
}
