//! AI Product Assistant handlers
//!
//! Takes product name/description and generates SEO fields, tags, categories via parallel AI calls.
//! Includes per-tenant rate limiting and response caching.

mod product_assistant;
mod product_search;
mod rate_limit;
mod related_products;

use std::sync::Arc;

use crate::config::PostgresConfigRepository;
use crate::handlers::admin_ai::{AiModel, AiProvider, AiTask};
use crate::repositories::ProductRepository;
use crate::services::{AiError, AiService};
use crate::storage::Store;

// Re-exports
pub use product_assistant::{
    product_assistant, AiResponseCache, ProductAssistantRequest, ProductAssistantResponse,
};
pub use product_search::{
    product_search, ProductMatch, ProductSearchRequest, ProductSearchResponse,
};
pub use rate_limit::AiRateLimiter;
pub use related_products::{related_products, RelatedProductsRequest, RelatedProductsResponse};

// ============================================================================
// State
// ============================================================================

/// Shared state for AI assistant handlers
pub struct AdminAiAssistantState {
    pub repo: Arc<PostgresConfigRepository>,
    pub store: Arc<dyn Store>,
    pub product_repo: Arc<dyn ProductRepository>,
    pub ai_service: AiService,
    pub rate_limiter: AiRateLimiter,
    pub cache: AiResponseCache,
}

// ============================================================================
// Config Helpers (shared by handlers)
// ============================================================================

const AI_CATEGORY: &str = "ai";

/// Load AI configuration for a task
pub async fn load_ai_config(
    repo: &PostgresConfigRepository,
    tenant_id: &str,
) -> Result<(AiProvider, AiModel, String), AiError> {
    let task = AiTask::ProductDetailAssistant;
    let entries = repo
        .get_config(tenant_id, AI_CATEGORY)
        .await
        .map_err(|e| AiError::NotConfigured(format!("Failed to load AI config: {}", e)))?;

    // Get model assignment
    let assignment_key = format!("assignment_{}", task);
    let model = entries
        .iter()
        .find(|e| e.config_key == assignment_key)
        .and_then(|e| e.value.as_str())
        .and_then(|s| serde_json::from_str::<AiModel>(&format!("\"{}\"", s)).ok())
        .unwrap_or(AiModel::NotSet);

    if model == AiModel::NotSet {
        return Err(AiError::NotConfigured(
            "No model assigned for ProductDetailAssistant task".to_string(),
        ));
    }

    // Get provider from model
    let provider = model_to_provider(model).ok_or_else(|| {
        AiError::NotConfigured(format!("Model {:?} has no associated provider", model))
    })?;

    // Get API key
    let key_name = provider_config_key(provider);
    let entry = entries
        .iter()
        .find(|e| e.config_key == key_name)
        .ok_or_else(|| AiError::ApiKeyMissing(provider.to_string()))?;

    let api_key = repo
        .decrypt_entry(entry)
        .await
        .map_err(|e| AiError::ServiceError(format!("Failed to decrypt API key: {}", e)))?
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| AiError::ApiKeyMissing(provider.to_string()))?;

    if api_key.is_empty() {
        return Err(AiError::ApiKeyMissing(provider.to_string()));
    }

    Ok((provider, model, api_key))
}

/// Load custom prompt for a sub-task, or use default
pub async fn load_prompt(
    repo: &PostgresConfigRepository,
    tenant_id: &str,
    sub_task: &str,
    default: &str,
) -> String {
    let prompt_key = format!("prompt_product_detail_assistant_{}", sub_task);

    if let Ok(entries) = repo.get_config(tenant_id, AI_CATEGORY).await {
        if let Some(entry) = entries.iter().find(|e| e.config_key == prompt_key) {
            if let Some(prompt) = entry.value.as_str() {
                if !prompt.is_empty() {
                    return prompt.to_string();
                }
            }
        }
    }

    default.to_string()
}

pub fn model_to_provider(model: AiModel) -> Option<AiProvider> {
    match model {
        AiModel::NotSet => None,
        AiModel::Gemini25Flash | AiModel::Gemini25Pro => Some(AiProvider::Gemini),
        AiModel::OpenAi4o | AiModel::OpenAi51 | AiModel::OpenAi52 => Some(AiProvider::Openai),
    }
}

pub fn provider_config_key(provider: AiProvider) -> &'static str {
    match provider {
        AiProvider::Gemini => "gemini_api_key",
        AiProvider::Openai => "openai_api_key",
    }
}
