//! Related Products handler - finds related products using AI analysis.

use std::sync::Arc;

use axum::{extract::State, response::IntoResponse, Json};
use serde::{Deserialize, Serialize};

use crate::errors::{error_response, ErrorCode};
use crate::handlers::response::json_error;
use crate::middleware::TenantContext;
use crate::models::Product;
use crate::observability::record_ai_rate_limit_rejection;
use crate::repositories::ProductRepositoryError;
use crate::services::{
    parse_json_response, RelatedProductsResult, DEFAULT_RELATED_PRODUCTS_PROMPT,
};

use super::{load_ai_config, load_prompt, AdminAiAssistantState};

// ============================================================================
// Request/Response Types
// ============================================================================

/// POST /admin/ai/related-products request
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RelatedProductsRequest {
    /// Product ID to find related products for (optional if name/description provided)
    pub product_id: Option<String>,
    /// Product name (used if product_id not provided)
    pub name: Option<String>,
    /// Product description (used if product_id not provided)
    pub description: Option<String>,
    /// Product tags (used for similarity matching)
    pub tags: Option<Vec<String>>,
    /// Product category IDs (used for similarity matching)
    pub category_ids: Option<Vec<String>>,
}

/// POST /admin/ai/related-products response
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RelatedProductsResponse {
    pub related_product_ids: Vec<String>,
    pub reasoning: String,
}

// ============================================================================
// Helper Functions
// ============================================================================

/// Format a product for AI context
fn format_product_for_ai(product: &Product) -> String {
    let title = product.title.as_deref().unwrap_or(&product.id);
    let desc = if product.description.len() > 200 {
        format!("{}...", &product.description[..200])
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

    format!(
        "- {}: {}\n  Tags: {}\n  Categories: {}\n  Description: {}",
        product.id, title, tags, categories, desc
    )
}

/// Format product catalog for AI context (excludes the current product)
fn format_catalog_for_ai(
    products: &[Product],
    exclude_id: Option<&str>,
    max_products: usize,
) -> String {
    let filtered: Vec<_> = products
        .iter()
        .filter(|p| p.active && exclude_id.map_or(true, |id| p.id != id))
        .take(max_products)
        .collect();

    if filtered.is_empty() {
        return "No other products available.".to_string();
    }

    filtered
        .iter()
        .map(|p| format_product_for_ai(p))
        .collect::<Vec<_>>()
        .join("\n\n")
}

// ============================================================================
// Handler
// ============================================================================

/// POST /admin/ai/related-products - Find related products using AI
pub async fn related_products(
    State(state): State<Arc<AdminAiAssistantState>>,
    tenant: TenantContext,
    Json(request): Json<RelatedProductsRequest>,
) -> impl IntoResponse {
    // Validate: need either product_id or name
    if request.product_id.is_none() && request.name.is_none() {
        let (status, body) = error_response(
            ErrorCode::InvalidField,
            Some("Either productId or name is required".into()),
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

    // Get product info (load from DB or use request data)
    let (product_id, product_name, product_desc, product_tags, product_categories) =
        if let Some(ref id) = request.product_id {
            match state.product_repo.get_product(&tenant.tenant_id, id).await {
                Ok(product) => (
                    Some(product.id.clone()),
                    product.title.clone().unwrap_or_else(|| product.id.clone()),
                    product.description.clone(),
                    product.tags.clone(),
                    product.category_ids.clone(),
                ),
                Err(ProductRepositoryError::NotFound) => {
                    let (status, body) = error_response(
                        ErrorCode::ProductNotFound,
                        Some(format!("Product not found: {}", id)),
                        None,
                    );
                    return json_error(status, body).into_response();
                }
                Err(e) => {
                    tracing::error!(error = %e, "Failed to load product");
                    let (status, body) = error_response(
                        ErrorCode::InternalError,
                        Some("Failed to load product".into()),
                        None,
                    );
                    return json_error(status, body).into_response();
                }
            }
        } else {
            (
                None,
                request.name.clone().unwrap_or_default(),
                request.description.clone().unwrap_or_default(),
                request.tags.clone().unwrap_or_default(),
                request.category_ids.clone().unwrap_or_default(),
            )
        };

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

    // Need at least 2 products (current + at least one other)
    if all_products.len() < 2 {
        return Json(RelatedProductsResponse {
            related_product_ids: vec![],
            reasoning: "Not enough products in catalog to find related items.".to_string(),
        })
        .into_response();
    }

    // Format catalog for AI (max 50 products to stay within token limits)
    let catalog_context = format_catalog_for_ai(&all_products, product_id.as_deref(), 50);

    // Format current product info
    let current_product = format!(
        "Name: {}\nDescription: {}\nTags: {}\nCategories: {}",
        product_name,
        if product_desc.len() > 500 {
            format!("{}...", &product_desc[..500])
        } else {
            product_desc
        },
        if product_tags.is_empty() {
            "none".to_string()
        } else {
            product_tags.join(", ")
        },
        if product_categories.is_empty() {
            "none".to_string()
        } else {
            product_categories.join(", ")
        }
    );

    // Load custom prompt or use default
    let system_prompt = load_prompt(
        &state.repo,
        &tenant.tenant_id,
        "related_products",
        DEFAULT_RELATED_PRODUCTS_PROMPT,
    )
    .await;

    // Build user prompt
    let user_prompt = format!(
        "Current Product:\n{}\n\nAvailable Products:\n{}",
        current_product, catalog_context
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
            "related_products",
        )
        .await;

    let (related_ids, reasoning) = match ai_result {
        Ok(raw) => match parse_json_response::<RelatedProductsResult>(&raw) {
            Ok(result) => {
                // Validate that returned IDs exist in catalog
                let valid_ids: Vec<String> = result
                    .related_product_ids
                    .into_iter()
                    .filter(|id| all_products.iter().any(|p| &p.id == id && p.active))
                    .collect();
                (valid_ids, result.reasoning)
            }
            Err(e) => {
                tracing::warn!(error = %e, raw = %raw, "Failed to parse related products response");
                (vec![], "Failed to parse AI response.".to_string())
            }
        },
        Err(e) => {
            tracing::warn!(error = %e, "Related products AI call failed");
            (vec![], format!("AI service error: {}", e))
        }
    };

    Json(RelatedProductsResponse {
        related_product_ids: related_ids,
        reasoning,
    })
    .into_response()
}
