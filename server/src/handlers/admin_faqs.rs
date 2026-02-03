//! Admin FAQ handlers for managing knowledge base entries

use std::sync::Arc;

use axum::{
    extract::{Path, Query, State},
    response::IntoResponse,
    Json,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};

use crate::errors::{error_response, ErrorCode};
use crate::handlers::admin::AdminState;
use crate::handlers::response::{json_error, json_ok};
use crate::middleware::TenantContext;
use crate::models::Faq;

const MAX_LIST_LIMIT: i32 = 1000;
const DEFAULT_LIST_LIMIT: i32 = 50;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListFaqsQuery {
    pub active_only: Option<bool>,
    pub limit: Option<i32>,
    pub offset: Option<i32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateFaqRequest {
    pub question: String,
    pub answer: String,
    #[serde(default)]
    pub keywords: Vec<String>,
    #[serde(default = "default_true")]
    pub active: bool,
    #[serde(default = "default_true")]
    pub use_in_chat: bool,
    #[serde(default = "default_true")]
    pub display_on_page: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateFaqRequest {
    pub question: String,
    pub answer: String,
    #[serde(default)]
    pub keywords: Vec<String>,
    #[serde(default = "default_true")]
    pub active: bool,
    #[serde(default = "default_true")]
    pub use_in_chat: bool,
    #[serde(default = "default_true")]
    pub display_on_page: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListFaqsResponse {
    pub faqs: Vec<Faq>,
    pub total: i64,
}

fn default_true() -> bool {
    true
}

fn cap_limit(limit: Option<i32>) -> i32 {
    limit.unwrap_or(DEFAULT_LIST_LIMIT).clamp(1, MAX_LIST_LIMIT)
}

fn validate_question(value: &str) -> Result<String, String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err("question is required".to_string());
    }
    if trimmed.len() > 1000 {
        return Err("question must be 1000 characters or less".to_string());
    }
    Ok(trimmed.to_string())
}

fn validate_answer(value: &str) -> Result<String, String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err("answer is required".to_string());
    }
    if trimmed.len() > 10000 {
        return Err("answer must be 10000 characters or less".to_string());
    }
    Ok(trimmed.to_string())
}

fn normalize_keywords(keywords: Vec<String>) -> Vec<String> {
    keywords
        .into_iter()
        .map(|k| k.trim().to_lowercase())
        .filter(|k| !k.is_empty())
        .collect()
}

pub async fn list_faqs(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Query(params): Query<ListFaqsQuery>,
) -> impl IntoResponse {
    let limit = cap_limit(params.limit);
    let offset = params.offset.unwrap_or(0).max(0);
    let active_only = params.active_only.unwrap_or(false);

    match state
        .store
        .list_faqs(&tenant.tenant_id, active_only, limit, offset)
        .await
    {
        Ok((faqs, total)) => json_ok(ListFaqsResponse { faqs, total }),
        Err(e) => {
            let (status, body) = error_response(
                ErrorCode::DatabaseError,
                Some(format!("Failed to list FAQs: {e}")),
                None,
            );
            json_error(status, body)
        }
    }
}

pub async fn get_faq(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Path(faq_id): Path<String>,
) -> impl IntoResponse {
    match state.store.get_faq(&tenant.tenant_id, &faq_id).await {
        Ok(Some(faq)) => json_ok(faq),
        Ok(None) => {
            let (status, body) = error_response(
                ErrorCode::ResourceNotFound,
                Some("FAQ not found".to_string()),
                None,
            );
            json_error(status, body)
        }
        Err(e) => {
            let (status, body) = error_response(
                ErrorCode::DatabaseError,
                Some(format!("Failed to get FAQ: {e}")),
                None,
            );
            json_error(status, body)
        }
    }
}

pub async fn create_faq(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Json(req): Json<CreateFaqRequest>,
) -> impl IntoResponse {
    let question = match validate_question(&req.question) {
        Ok(q) => q,
        Err(message) => {
            let (status, body) = error_response(ErrorCode::InvalidField, Some(message), None);
            return json_error(status, body);
        }
    };

    let answer = match validate_answer(&req.answer) {
        Ok(a) => a,
        Err(message) => {
            let (status, body) = error_response(ErrorCode::InvalidField, Some(message), None);
            return json_error(status, body);
        }
    };

    let now = Utc::now();
    let faq = Faq {
        id: uuid::Uuid::new_v4().to_string(),
        tenant_id: tenant.tenant_id,
        question,
        answer,
        keywords: normalize_keywords(req.keywords),
        active: req.active,
        use_in_chat: req.use_in_chat,
        display_on_page: req.display_on_page,
        created_at: now,
        updated_at: now,
    };

    match state.store.create_faq(faq.clone()).await {
        Ok(()) => json_ok(faq),
        Err(e) => {
            let (status, body) = error_response(
                ErrorCode::DatabaseError,
                Some(format!("Failed to create FAQ: {e}")),
                None,
            );
            json_error(status, body)
        }
    }
}

pub async fn update_faq(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Path(faq_id): Path<String>,
    Json(req): Json<UpdateFaqRequest>,
) -> impl IntoResponse {
    let question = match validate_question(&req.question) {
        Ok(q) => q,
        Err(message) => {
            let (status, body) = error_response(ErrorCode::InvalidField, Some(message), None);
            return json_error(status, body);
        }
    };

    let answer = match validate_answer(&req.answer) {
        Ok(a) => a,
        Err(message) => {
            let (status, body) = error_response(ErrorCode::InvalidField, Some(message), None);
            return json_error(status, body);
        }
    };

    let existing = match state.store.get_faq(&tenant.tenant_id, &faq_id).await {
        Ok(Some(faq)) => faq,
        Ok(None) => {
            let (status, body) = error_response(
                ErrorCode::ResourceNotFound,
                Some("FAQ not found".to_string()),
                None,
            );
            return json_error(status, body);
        }
        Err(e) => {
            let (status, body) = error_response(
                ErrorCode::DatabaseError,
                Some(format!("Failed to load FAQ: {e}")),
                None,
            );
            return json_error(status, body);
        }
    };

    let updated = Faq {
        id: existing.id,
        tenant_id: existing.tenant_id,
        question,
        answer,
        keywords: normalize_keywords(req.keywords),
        active: req.active,
        use_in_chat: req.use_in_chat,
        display_on_page: req.display_on_page,
        created_at: existing.created_at,
        updated_at: Utc::now(),
    };

    match state.store.update_faq(updated.clone()).await {
        Ok(()) => json_ok(updated),
        Err(crate::storage::StorageError::NotFound) => {
            let (status, body) = error_response(
                ErrorCode::ResourceNotFound,
                Some("FAQ not found".to_string()),
                None,
            );
            json_error(status, body)
        }
        Err(e) => {
            let (status, body) = error_response(
                ErrorCode::DatabaseError,
                Some(format!("Failed to update FAQ: {e}")),
                None,
            );
            json_error(status, body)
        }
    }
}

pub async fn delete_faq(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Path(faq_id): Path<String>,
) -> impl IntoResponse {
    match state.store.delete_faq(&tenant.tenant_id, &faq_id).await {
        Ok(()) => json_ok(serde_json::json!({ "deleted": true })),
        Err(crate::storage::StorageError::NotFound) => {
            let (status, body) = error_response(
                ErrorCode::ResourceNotFound,
                Some("FAQ not found".to_string()),
                None,
            );
            json_error(status, body)
        }
        Err(e) => {
            let (status, body) = error_response(
                ErrorCode::DatabaseError,
                Some(format!("Failed to delete FAQ: {e}")),
                None,
            );
            json_error(status, body)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    use axum::http::StatusCode;
    use axum::response::IntoResponse;

    use crate::repositories::{InMemoryCouponRepository, InMemoryProductRepository};
    use crate::storage::{InMemoryStore, Store};

    #[tokio::test]
    async fn test_create_faq_persists() {
        let store = Arc::new(InMemoryStore::new());
        let state = Arc::new(AdminState {
            store: store.clone(),
            product_repo: Arc::new(InMemoryProductRepository::new(Vec::new())),
            coupon_repo: Arc::new(InMemoryCouponRepository::new(Vec::new())),
            stripe_client: None,
        });

        let tenant = TenantContext::default();
        let request = CreateFaqRequest {
            question: "How do I return an item?".to_string(),
            answer: "Contact support within 30 days.".to_string(),
            keywords: vec!["return".to_string(), "refund".to_string()],
            active: true,
            use_in_chat: true,
            display_on_page: true,
        };

        let response = create_faq(State(state), tenant.clone(), Json(request))
            .await
            .into_response();
        assert_eq!(response.status(), StatusCode::OK);

        let (faqs, _) = store
            .list_faqs(&tenant.tenant_id, false, 10, 0)
            .await
            .unwrap();
        assert_eq!(faqs.len(), 1);
        assert_eq!(faqs[0].question, "How do I return an item?");
        assert_eq!(faqs[0].keywords, vec!["return", "refund"]);
    }

    #[tokio::test]
    async fn test_create_faq_rejects_empty_question() {
        let store = Arc::new(InMemoryStore::new());
        let state = Arc::new(AdminState {
            store: store.clone(),
            product_repo: Arc::new(InMemoryProductRepository::new(Vec::new())),
            coupon_repo: Arc::new(InMemoryCouponRepository::new(Vec::new())),
            stripe_client: None,
        });

        let tenant = TenantContext::default();
        let request = CreateFaqRequest {
            question: "   ".to_string(),
            answer: "Some answer".to_string(),
            keywords: vec![],
            active: true,
            use_in_chat: true,
            display_on_page: true,
        };

        let response = create_faq(State(state), tenant, Json(request))
            .await
            .into_response();
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    }
}
