pub mod ai;
pub mod blockhash_cache;
pub mod cedros_login;
pub mod health;
pub mod messaging;
pub mod paywall;
pub mod stripe;
pub mod stripe_webhooks;
pub mod subscriptions;

use async_trait::async_trait;

use crate::errors::ErrorCode;
use crate::models::SubscriptionInfo;
use thiserror::Error;

// ============================================================================
// SubscriptionChecker Trait
// ============================================================================

/// Per spec (19-services-paywall.md): Interface for checking subscription access
/// Used by PaywallService to check if a wallet has subscription access to a resource
#[async_trait]
pub trait SubscriptionChecker: Send + Sync {
    /// Check if wallet has active subscription access to a product
    /// Returns (has_access, subscription_info)
    async fn has_access(
        &self,
        tenant_id: &str,
        wallet: &str,
        product_id: &str,
    ) -> ServiceResult<(bool, Option<SubscriptionInfo>)>;
}

#[derive(Debug, Error)]
pub enum ServiceError {
    #[error("{code:?}: {message}")]
    Coded { code: ErrorCode, message: String },
    #[error("internal error: {0}")]
    Internal(String),
}

impl ServiceError {
    /// Returns the error code as a string (for backwards compatibility)
    pub fn code_str(&self) -> &str {
        match self {
            ServiceError::Coded { code, .. } => code.as_str(),
            ServiceError::Internal(_) => "internal_error",
        }
    }

    /// Returns the ErrorCode enum value for use with error_response
    pub fn code(&self) -> ErrorCode {
        match self {
            ServiceError::Coded { code, .. } => *code,
            ServiceError::Internal(_) => ErrorCode::InternalError,
        }
    }

    /// Returns a user-safe error message that doesn't expose internal details.
    /// Use this instead of to_string() when constructing error responses.
    pub fn safe_message(&self) -> String {
        match self {
            ServiceError::Coded { code, message } => {
                // For certain error types, expose the message as it's expected to be user-safe
                match code {
                    // User-input validation errors - safe to show details
                    ErrorCode::ResourceNotFound
                    | ErrorCode::CartNotFound
                    | ErrorCode::ProductNotFound
                    | ErrorCode::EmptyCart
                    | ErrorCode::CartTooLarge
                    | ErrorCode::InvalidQuantity
                    | ErrorCode::InvalidField
                    | ErrorCode::MissingField
                    | ErrorCode::QuoteExpired
                    | ErrorCode::AmountMismatch
                    | ErrorCode::NetworkMismatch
                    | ErrorCode::InvalidWallet
                    | ErrorCode::InvalidSignature
                    | ErrorCode::InvalidTransaction
                    | ErrorCode::InvalidAmount
                    | ErrorCode::InvalidCoupon
                    | ErrorCode::CartAlreadyPaid
                    | ErrorCode::TransactionExpired
                    | ErrorCode::InvalidPaymentProof => message.clone(),
                    // For internal/database/config errors, use generic message to avoid info disclosure
                    ErrorCode::InternalError
                    | ErrorCode::DatabaseError
                    | ErrorCode::ConfigError
                    | ErrorCode::StripeError
                    | ErrorCode::RpcError
                    | ErrorCode::NetworkError => code.default_message().to_string(),
                    // For all other codes, use code's default message for safety
                    _ => code.default_message().to_string(),
                }
            }
            // Never expose internal error details to users
            ServiceError::Internal(_) => "An internal error occurred".to_string(),
        }
    }
}

pub type ServiceResult<T> = Result<T, ServiceError>;

pub use blockhash_cache::{BlockhashCache, BlockhashCacheError, BlockhashResponse};
pub use cedros_login::{CedrosLoginClaims, CedrosLoginClient, CedrosLoginError};
pub use health::{
    ComponentHealth, HealthCheckConfig, HealthChecker, HealthReport, HealthStatus,
    LivenessResponse, ReadinessResponse,
};
pub use messaging::{create_messaging_service, MessagingService};
pub use paywall::{PaywallService, RefundQuoteResponse};
pub use stripe::StripeClient;
pub use stripe_webhooks::{StripeEventType, StripeWebhookProcessor};
pub use subscriptions::{ChangeSubscriptionResult, StripeSubscriptionUpdate, SubscriptionService};

pub use ai::{
    parse_json_response, slugify, AiError, AiService, CategoriesResult, ChatOrchestrator,
    ChatResult, FactFinderConfig, FactFinderMatch, FactFinderResult, FaqMatch, ProductSearchMatch,
    ProductSearchResult, RelatedProductsResult, SeoResult, TagsResult, DEFAULT_CATEGORIES_PROMPT,
    DEFAULT_CHAT_SYSTEM_PROMPT, DEFAULT_FACT_FINDER_PROMPT, DEFAULT_PRODUCT_SEARCH_PROMPT,
    DEFAULT_RELATED_PRODUCTS_PROMPT, DEFAULT_SEO_PROMPT, DEFAULT_SHORT_DESC_PROMPT,
    DEFAULT_TAGS_PROMPT,
};
