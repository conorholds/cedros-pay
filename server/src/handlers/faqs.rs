//! Public FAQ endpoints for storefront display.

use std::sync::Arc;

use axum::{
    extract::{Query, State},
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};

use crate::errors::{error_response, ErrorCode};
use crate::handlers::response::json_error;
use crate::middleware::TenantContext;
use crate::models::Faq;
use crate::storage::Store;

const MAX_LIMIT: i32 = 100;
const DEFAULT_LIMIT: i32 = 50;

/// Shared state for public FAQ handlers
pub struct FaqsState {
    pub store: Arc<dyn Store>,
}

impl FaqsState {
    pub fn new(store: Arc<dyn Store>) -> Self {
        Self { store }
    }
}

/// Query params for listing public FAQs
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListPublicFaqsQuery {
    #[serde(default = "default_limit")]
    pub limit: i32,
    #[serde(default)]
    pub offset: i32,
}

fn default_limit() -> i32 {
    DEFAULT_LIMIT
}

/// Public FAQ response (simplified, no tenant_id)
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PublicFaq {
    pub id: String,
    pub question: String,
    pub answer: String,
}

/// GET /faqs response
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListPublicFaqsResponse {
    pub faqs: Vec<PublicFaq>,
    pub total: i64,
}

impl From<Faq> for PublicFaq {
    fn from(faq: Faq) -> Self {
        Self {
            id: faq.id,
            question: faq.question,
            answer: faq.answer,
        }
    }
}

/// GET /faqs - List FAQs for public display
///
/// Returns only FAQs where active=true AND display_on_page=true.
/// No authentication required.
pub async fn list_public_faqs(
    State(state): State<Arc<FaqsState>>,
    tenant: TenantContext,
    Query(query): Query<ListPublicFaqsQuery>,
) -> impl IntoResponse {
    let limit = query.limit.clamp(1, MAX_LIMIT);
    let offset = query.offset.max(0);

    match state
        .store
        .list_public_faqs(&tenant.tenant_id, limit, offset)
        .await
    {
        Ok((faqs, total)) => {
            let public_faqs: Vec<PublicFaq> = faqs.into_iter().map(PublicFaq::from).collect();
            Json(ListPublicFaqsResponse {
                faqs: public_faqs,
                total,
            })
            .into_response()
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to list public FAQs");
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some("Failed to load FAQs".to_string()),
                None,
            );
            json_error(status, body).into_response()
        }
    }
}
