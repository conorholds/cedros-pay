//! Product Search handler - finds products matching a user query using AI.

use std::sync::Arc;

use axum::{extract::State, response::IntoResponse, Json};
use serde::{Deserialize, Serialize};

use crate::errors::{error_response, ErrorCode};
use crate::handlers::response::json_error;
use crate::middleware::TenantContext;
use crate::models::Product;
use crate::observability::record_ai_rate_limit_rejection;
use crate::services::{parse_json_response, ProductSearchResult, DEFAULT_PRODUCT_SEARCH_PROMPT};

use super::{load_ai_config, load_prompt, AdminAiAssistantState};

// ============================================================================
// Request/Response Types
// ============================================================================

/// POST /admin/ai/product-search request
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProductSearchRequest {
    /// User's search query (e.g., "do you have any red boots")
    pub query: String,
}

/// A matched product with details for display
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProductMatch {
    pub id: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub image_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub price_cents: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub slug: Option<String>,
    /// Why this product matches the query
    pub relevance: String,
}

/// POST /admin/ai/product-search response
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProductSearchResponse {
    pub products: Vec<ProductMatch>,
    pub reasoning: String,
}

// ============================================================================
// Helper Functions
// ============================================================================

/// Format a product for AI context (similar to related_products but includes price)
fn format_product_for_search(product: &Product) -> String {
    let title = product.title.as_deref().unwrap_or(&product.id);
    let desc = if product.description.len() > 300 {
        format!("{}...", &product.description[..300])
    } else {
        product.description.clone()
    };
    let tags = if product.tags.is_empty() {
        "none".to_string()
    } else {
        product.tags.join(", ")
    };
    let categories = if product.category_ids.is_empty() {
        "none".to_string()
    } else {
        product.category_ids.join(", ")
    };
    let price = product
        .variants
        .first()
        .and_then(|v| v.price.as_ref())
        .and_then(|p| p.amount)
        .map(|a| format!("${:.2}", a))
        .unwrap_or_else(|| "N/A".to_string());

    format!(
        "- {}: {}\n  Price: {}\n  Tags: {}\n  Categories: {}\n  Description: {}",
        product.id, title, price, tags, categories, desc
    )
}

/// Format product catalog for AI search context
fn format_catalog_for_search(products: &[Product], max_products: usize) -> String {
    let filtered: Vec<_> = products
        .iter()
        .filter(|p| p.active)
        .take(max_products)
        .collect();

    if filtered.is_empty() {
        return "No products available.".to_string();
    }

    filtered
        .iter()
        .map(|p| format_product_for_search(p))
        .collect::<Vec<_>>()
        .join("\n\n")
}

/// Convert a Product to a ProductMatch with relevance info
fn product_to_match(product: &Product, relevance: String) -> ProductMatch {
    ProductMatch {
        id: product.id.clone(),
        name: product.title.clone().unwrap_or_else(|| product.id.clone()),
        description: if product.description.is_empty() {
            None
        } else if product.description.len() > 200 {
            Some(format!("{}...", &product.description[..200]))
        } else {
            Some(product.description.clone())
        },
        image_url: product.images.first().map(|img| img.url.clone()),
        price_cents: product
            .variants
            .first()
            .and_then(|v| v.price.as_ref())
            .and_then(|p| p.amount)
            .map(|a| (a * 100.0) as i64),
        slug: product.slug.clone(),
        relevance,
    }
}

// ============================================================================
// Handler
// ============================================================================

/// POST /admin/ai/product-search - Search products using AI
pub async fn product_search(
    State(state): State<Arc<AdminAiAssistantState>>,
    tenant: TenantContext,
    Json(request): Json<ProductSearchRequest>,
) -> impl IntoResponse {
    // Validate query
    let query = request.query.trim();
    if query.is_empty() {
        let (status, body) = error_response(
            ErrorCode::InvalidField,
            Some("query is required".into()),
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

    // Load AI config
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

    // Load all products for catalog context
    let all_products = match state.product_repo.list_products(&tenant.tenant_id).await {
        Ok(products) => products,
        Err(e) => {
            tracing::error!(error = %e, "Failed to load products");
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some("Failed to load product catalog".into()),
                None,
            );
            return json_error(status, body).into_response();
        }
    };

    // Need at least 1 product
    if all_products.is_empty() || !all_products.iter().any(|p| p.active) {
        return Json(ProductSearchResponse {
            products: vec![],
            reasoning: "No products available in catalog.".to_string(),
        })
        .into_response();
    }

    // Format catalog for AI (max 50 products to stay within token limits)
    let catalog_context = format_catalog_for_search(&all_products, 50);

    // Load custom prompt or use default
    let system_prompt = load_prompt(
        &state.repo,
        &tenant.tenant_id,
        "product_search",
        DEFAULT_PRODUCT_SEARCH_PROMPT,
    )
    .await;

    // Build user prompt
    let user_prompt = format!(
        "Customer query: \"{}\"\n\nAvailable Products:\n{}",
        query, catalog_context
    );

    // Call AI
    let ai_result = state
        .ai_service
        .complete_with_metrics(
            provider,
            model,
            &api_key,
            &system_prompt,
            &user_prompt,
            "product_search",
        )
        .await;

    let (products, reasoning) = match ai_result {
        Ok(raw) => match parse_json_response::<ProductSearchResult>(&raw) {
            Ok(result) => {
                // Map AI results to full product details, validating IDs exist
                let products: Vec<ProductMatch> = result
                    .matches
                    .into_iter()
                    .filter_map(|m| {
                        all_products
                            .iter()
                            .find(|p| p.id == m.product_id && p.active)
                            .map(|p| product_to_match(p, m.relevance))
                    })
                    .take(3) // Limit to 3 results
                    .collect();
                (products, result.reasoning)
            }
            Err(e) => {
                tracing::warn!(error = %e, raw = %raw, "Failed to parse product search response");
                (vec![], "Failed to parse AI response.".to_string())
            }
        },
        Err(e) => {
            tracing::warn!(error = %e, "Product search AI call failed");
            (vec![], format!("AI service error: {}", e))
        }
    };

    Json(ProductSearchResponse {
        products,
        reasoning,
    })
    .into_response()
}
