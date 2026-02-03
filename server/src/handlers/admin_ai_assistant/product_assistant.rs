//! Product Assistant handler - generates SEO, tags, categories via parallel AI calls.

use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};

use axum::{extract::State, response::IntoResponse, Json};
use parking_lot::Mutex;
use serde::{Deserialize, Serialize};

use crate::errors::{error_response, ErrorCode};
use crate::handlers::response::json_error;
use crate::middleware::TenantContext;
use crate::observability::{record_ai_cache_hit, record_ai_rate_limit_rejection};
use crate::services::{
    parse_json_response, slugify, CategoriesResult, SeoResult, TagsResult,
    DEFAULT_CATEGORIES_PROMPT, DEFAULT_SEO_PROMPT, DEFAULT_SHORT_DESC_PROMPT, DEFAULT_TAGS_PROMPT,
};

use super::{load_ai_config, load_prompt, AdminAiAssistantState};

// ============================================================================
// Response Caching
// ============================================================================

/// Simple in-memory cache for AI responses
pub struct AiResponseCache {
    /// Cache entries (cache_key -> (response, created_at))
    entries: Mutex<HashMap<String, (ProductAssistantResponse, Instant)>>,
    /// TTL for cache entries
    ttl: Duration,
    /// Max entries to prevent unbounded growth
    max_entries: usize,
}

impl Default for AiResponseCache {
    fn default() -> Self {
        Self::new(Duration::from_secs(3600), 1000) // 1 hour TTL, max 1000 entries
    }
}

impl AiResponseCache {
    pub fn new(ttl: Duration, max_entries: usize) -> Self {
        Self {
            entries: Mutex::new(HashMap::new()),
            ttl,
            max_entries,
        }
    }

    /// Generate cache key from tenant + name + description
    pub fn cache_key(tenant_id: &str, name: &str, description: &str) -> String {
        use std::hash::{Hash, Hasher};
        let mut hasher = std::collections::hash_map::DefaultHasher::new();
        tenant_id.hash(&mut hasher);
        name.hash(&mut hasher);
        description.hash(&mut hasher);
        format!("{:x}", hasher.finish())
    }

    /// Get cached response if valid
    pub fn get(
        &self,
        tenant_id: &str,
        name: &str,
        description: &str,
    ) -> Option<ProductAssistantResponse> {
        let key = Self::cache_key(tenant_id, name, description);
        let entries = self.entries.lock();

        entries.get(&key).and_then(|(response, created_at)| {
            if created_at.elapsed() < self.ttl {
                Some(response.clone())
            } else {
                None
            }
        })
    }

    /// Store response in cache
    pub fn set(
        &self,
        tenant_id: &str,
        name: &str,
        description: &str,
        response: ProductAssistantResponse,
    ) {
        let key = Self::cache_key(tenant_id, name, description);
        let mut entries = self.entries.lock();

        // Evict oldest entries if at capacity
        if entries.len() >= self.max_entries {
            let oldest_key = entries
                .iter()
                .min_by_key(|(_, (_, created))| *created)
                .map(|(k, _)| k.clone());
            if let Some(k) = oldest_key {
                entries.remove(&k);
            }
        }

        entries.insert(key, (response, Instant::now()));
    }

    /// Clean up expired entries
    pub fn cleanup(&self) {
        let mut entries = self.entries.lock();
        let ttl = self.ttl;
        entries.retain(|_, (_, created)| created.elapsed() < ttl);
    }
}

// ============================================================================
// Request/Response Types
// ============================================================================

/// POST /admin/ai/product-assistant request
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProductAssistantRequest {
    pub name: String,
    pub description: String,
}

/// POST /admin/ai/product-assistant response
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProductAssistantResponse {
    pub seo_title: String,
    pub seo_description: String,
    pub short_description: String,
    pub tags: Vec<String>,
    pub slug: String,
    pub suggested_category_ids: Vec<String>,
}

// ============================================================================
// Handler
// ============================================================================

/// POST /admin/ai/product-assistant - Generate product details with AI
pub async fn product_assistant(
    State(state): State<Arc<AdminAiAssistantState>>,
    tenant: TenantContext,
    Json(request): Json<ProductAssistantRequest>,
) -> impl IntoResponse {
    // Validate input
    if request.name.trim().is_empty() {
        let (status, body) = error_response(
            ErrorCode::InvalidField,
            Some("name is required".into()),
            None,
        );
        return json_error(status, body).into_response();
    }

    // Check rate limit
    if !state.rate_limiter.try_consume(&tenant.tenant_id) {
        record_ai_rate_limit_rejection(&tenant.tenant_id);
        let (status, body) = error_response(
            ErrorCode::RateLimited,
            Some("AI rate limit exceeded. Please wait before trying again.".into()),
            None,
        );
        return json_error(status, body).into_response();
    }

    // Check cache first
    if let Some(cached) = state
        .cache
        .get(&tenant.tenant_id, &request.name, &request.description)
    {
        record_ai_cache_hit("product_assistant");
        return Json(cached).into_response();
    }

    // Load AI config (model + API key)
    let (provider, model, api_key) = match load_ai_config(&state.repo, &tenant.tenant_id).await {
        Ok(cfg) => cfg,
        Err(e) => {
            tracing::warn!(error = %e, "AI not configured");
            let (status, body) = error_response(
                ErrorCode::ConfigError,
                Some(format!("AI not configured: {}", e)),
                None,
            );
            return json_error(status, body).into_response();
        }
    };

    // Load collections for category suggestions (active only, up to 100)
    let collections = state
        .store
        .list_collections(&tenant.tenant_id, Some(true), 100, 0)
        .await
        .unwrap_or_default();

    // Format collections for AI prompt
    let categories_context = if collections.is_empty() {
        "No categories available".to_string()
    } else {
        collections
            .iter()
            .map(|c| format!("- {}: {}", c.id, c.name))
            .collect::<Vec<_>>()
            .join("\n")
    };

    // Load custom prompts (or use defaults)
    let (seo_prompt, tags_prompt, categories_prompt, short_desc_prompt) = tokio::join!(
        load_prompt(&state.repo, &tenant.tenant_id, "seo", DEFAULT_SEO_PROMPT),
        load_prompt(&state.repo, &tenant.tenant_id, "tags", DEFAULT_TAGS_PROMPT),
        load_prompt(
            &state.repo,
            &tenant.tenant_id,
            "categories",
            DEFAULT_CATEGORIES_PROMPT
        ),
        load_prompt(
            &state.repo,
            &tenant.tenant_id,
            "short_desc",
            DEFAULT_SHORT_DESC_PROMPT
        ),
    );

    // Build user prompt with product info
    let user_prompt = format!(
        "Product Name: {}\n\nProduct Description: {}",
        request.name, request.description
    );

    // Replace {categories} placeholder in categories prompt
    let categories_system_prompt = categories_prompt.replace("{categories}", &categories_context);

    // Make 4 parallel AI calls with metrics
    let (seo_result, tags_result, categories_result, short_desc_result) = tokio::join!(
        state.ai_service.complete_with_metrics(
            provider,
            model,
            &api_key,
            &seo_prompt,
            &user_prompt,
            "seo"
        ),
        state.ai_service.complete_with_metrics(
            provider,
            model,
            &api_key,
            &tags_prompt,
            &user_prompt,
            "tags"
        ),
        state.ai_service.complete_with_metrics(
            provider,
            model,
            &api_key,
            &categories_system_prompt,
            &user_prompt,
            "categories"
        ),
        state.ai_service.complete_with_metrics(
            provider,
            model,
            &api_key,
            &short_desc_prompt,
            &user_prompt,
            "short_desc"
        ),
    );

    // Parse SEO result
    let (seo_title, seo_description) = match seo_result {
        Ok(raw) => match parse_json_response::<SeoResult>(&raw) {
            Ok(seo) => (seo.seo_title, seo.seo_description),
            Err(e) => {
                tracing::warn!(error = %e, raw = %raw, "Failed to parse SEO response");
                (String::new(), String::new())
            }
        },
        Err(e) => {
            tracing::warn!(error = %e, "SEO generation failed");
            (String::new(), String::new())
        }
    };

    // Parse tags result
    let tags = match tags_result {
        Ok(raw) => match parse_json_response::<TagsResult>(&raw) {
            Ok(t) => t.tags,
            Err(e) => {
                tracing::warn!(error = %e, raw = %raw, "Failed to parse tags response");
                Vec::new()
            }
        },
        Err(e) => {
            tracing::warn!(error = %e, "Tags generation failed");
            Vec::new()
        }
    };

    // Parse categories result
    let suggested_category_ids = match categories_result {
        Ok(raw) => match parse_json_response::<CategoriesResult>(&raw) {
            Ok(c) => c.category_ids,
            Err(e) => {
                tracing::warn!(error = %e, raw = %raw, "Failed to parse categories response");
                Vec::new()
            }
        },
        Err(e) => {
            tracing::warn!(error = %e, "Categories generation failed");
            Vec::new()
        }
    };

    // Short description (plain text, no JSON parsing)
    let short_description = match short_desc_result {
        Ok(raw) => raw.trim().to_string(),
        Err(e) => {
            tracing::warn!(error = %e, "Short description generation failed");
            String::new()
        }
    };

    // Generate slug from name (no AI needed)
    let slug = slugify(&request.name);

    let response = ProductAssistantResponse {
        seo_title,
        seo_description,
        short_description,
        tags,
        slug,
        suggested_category_ids,
    };

    // Cache the response
    state.cache.set(
        &tenant.tenant_id,
        &request.name,
        &request.description,
        response.clone(),
    );

    Json(response).into_response()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cache_key_deterministic() {
        let key1 = AiResponseCache::cache_key("t1", "name", "desc");
        let key2 = AiResponseCache::cache_key("t1", "name", "desc");
        assert_eq!(key1, key2);

        let key3 = AiResponseCache::cache_key("t1", "name", "desc2");
        assert_ne!(key1, key3);
    }

    #[test]
    fn test_cache_stores_and_retrieves() {
        let cache = AiResponseCache::new(Duration::from_secs(60), 10);
        let response = ProductAssistantResponse {
            seo_title: "Test".to_string(),
            seo_description: "Desc".to_string(),
            short_description: "Short".to_string(),
            tags: vec!["tag1".to_string()],
            slug: "test".to_string(),
            suggested_category_ids: vec![],
        };

        cache.set("tenant", "name", "desc", response.clone());
        let retrieved = cache.get("tenant", "name", "desc");
        assert!(retrieved.is_some());
        assert_eq!(retrieved.unwrap().seo_title, "Test");
    }
}
