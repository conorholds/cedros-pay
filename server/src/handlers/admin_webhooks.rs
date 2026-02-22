//! Admin webhook management handlers
//!
//! S-01: All handlers enforce tenant isolation via TenantContext extractor.
//! Results are filtered by tenant_id and mutations verify tenant ownership.

use std::sync::Arc;

use axum::{
    extract::{Path, Query, State},
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};

use crate::errors::{error_response, ErrorCode};
use crate::middleware::TenantContext;
use crate::storage::{Store, WebhookStatus};

use super::cap_limit;

// ============================================================================
// Request/Response Types
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct ListWebhooksQuery {
    pub status: Option<String>,
    #[serde(default = "default_limit")]
    pub limit: i32,
}

fn default_limit() -> i32 {
    100
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListWebhooksResponse {
    pub webhooks: Vec<WebhookResponse>,
    pub count: usize,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WebhookResponse {
    pub id: String,
    /// Tenant ID for multi-tenant visibility in admin views
    pub tenant_id: String,
    pub url: String,
    pub event_type: String,
    pub status: String,
    pub attempts: i32,
    pub max_attempts: i32,
    pub last_error: Option<String>,
    pub last_attempt_at: Option<String>,
    pub next_attempt_at: Option<String>,
    pub created_at: String,
    pub completed_at: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DlqListResponse {
    pub webhooks: Vec<DlqWebhookResponse>,
    pub count: usize,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DlqWebhookResponse {
    pub id: String,
    /// Tenant ID for multi-tenant visibility in admin views
    pub tenant_id: String,
    pub original_webhook_id: String,
    pub url: String,
    pub event_type: String,
    pub final_error: String,
    pub total_attempts: i32,
    pub first_attempt_at: String,
    pub last_attempt_at: String,
    pub moved_to_dlq_at: String,
}

fn webhook_to_response(w: crate::storage::PendingWebhook) -> WebhookResponse {
    WebhookResponse {
        id: w.id,
        tenant_id: w.tenant_id,
        url: w.url,
        event_type: w.event_type,
        status: format!("{:?}", w.status).to_lowercase(),
        attempts: w.attempts,
        max_attempts: w.max_attempts,
        last_error: w.last_error,
        last_attempt_at: w.last_attempt_at.map(|t| t.to_rfc3339()),
        next_attempt_at: w.next_attempt_at.map(|t| t.to_rfc3339()),
        created_at: w.created_at.to_rfc3339(),
        completed_at: w.completed_at.map(|t| t.to_rfc3339()),
    }
}

// ============================================================================
// Handlers
// ============================================================================

/// GET /admin/webhooks - List webhooks with optional status filter
pub async fn list_webhooks<S: Store + 'static>(
    State(store): State<Arc<S>>,
    tenant: TenantContext,
    Query(query): Query<ListWebhooksQuery>,
) -> impl IntoResponse {
    let status = query.status.as_ref().and_then(|s| match s.as_str() {
        "pending" => Some(WebhookStatus::Pending),
        "processing" => Some(WebhookStatus::Processing),
        "failed" => Some(WebhookStatus::Failed),
        "success" => Some(WebhookStatus::Success),
        _ => None,
    });

    match store.list_webhooks(&tenant.tenant_id, status, cap_limit(query.limit)).await {
        Ok(webhooks) => {
            let response = ListWebhooksResponse {
                count: webhooks.len(),
                webhooks: webhooks.into_iter().map(webhook_to_response).collect(),
            };
            Json(response).into_response()
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to list webhooks");
            let (status, body) = error_response(ErrorCode::DatabaseError, None, None);
            (status, Json(body)).into_response()
        }
    }
}

/// GET /admin/webhooks/{id} - Get webhook by ID
pub async fn get_webhook<S: Store + 'static>(
    State(store): State<Arc<S>>,
    tenant: TenantContext,
    Path(webhook_id): Path<String>,
) -> impl IntoResponse {
    match store.get_webhook(&webhook_id).await {
        Ok(Some(w)) if w.tenant_id == tenant.tenant_id => {
            Json(webhook_to_response(w)).into_response()
        }
        Ok(Some(_)) | Ok(None) => {
            // S-01: Return 404 for cross-tenant access attempts (same as not-found)
            let (status, body) = error_response(
                ErrorCode::ResourceNotFound,
                Some("Webhook not found".into()),
                None,
            );
            (status, Json(body)).into_response()
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to get webhook");
            let (status, body) = error_response(ErrorCode::DatabaseError, None, None);
            (status, Json(body)).into_response()
        }
    }
}

/// POST /admin/webhooks/{id}/retry - Retry a failed webhook
pub async fn retry_webhook<S: Store + 'static>(
    State(store): State<Arc<S>>,
    tenant: TenantContext,
    Path(webhook_id): Path<String>,
) -> impl IntoResponse {
    // S-01: Verify tenant ownership before mutation
    match store.get_webhook(&webhook_id).await {
        Ok(Some(w)) if w.tenant_id == tenant.tenant_id => {}
        Ok(_) => {
            let (status, body) = error_response(
                ErrorCode::ResourceNotFound,
                Some("Webhook not found".into()),
                None,
            );
            return (status, Json(body)).into_response();
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to get webhook for retry");
            let (status, body) = error_response(ErrorCode::DatabaseError, None, None);
            return (status, Json(body)).into_response();
        }
    }

    match store.retry_webhook(&webhook_id).await {
        Ok(_) => {
            let response = serde_json::json!({
                "status": "queued",
                "message": "Webhook queued for retry"
            });
            Json(response).into_response()
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to retry webhook");
            let (status, body) = error_response(ErrorCode::DatabaseError, None, None);
            (status, Json(body)).into_response()
        }
    }
}

/// DELETE /admin/webhooks/{id} - Delete a webhook
pub async fn delete_webhook<S: Store + 'static>(
    State(store): State<Arc<S>>,
    tenant: TenantContext,
    Path(webhook_id): Path<String>,
) -> impl IntoResponse {
    // S-01: Verify tenant ownership before mutation
    match store.get_webhook(&webhook_id).await {
        Ok(Some(w)) if w.tenant_id == tenant.tenant_id => {}
        Ok(_) => {
            let (status, body) = error_response(
                ErrorCode::ResourceNotFound,
                Some("Webhook not found".into()),
                None,
            );
            return (status, Json(body)).into_response();
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to get webhook for delete");
            let (status, body) = error_response(ErrorCode::DatabaseError, None, None);
            return (status, Json(body)).into_response();
        }
    }

    match store.delete_webhook(&webhook_id).await {
        Ok(_) => axum::http::StatusCode::NO_CONTENT.into_response(),
        Err(e) => {
            tracing::error!(error = %e, "Failed to delete webhook");
            let (status, body) = error_response(ErrorCode::DatabaseError, None, None);
            (status, Json(body)).into_response()
        }
    }
}

// ============================================================================
// DLQ Handlers
// ============================================================================

/// GET /admin/webhooks/dlq - List dead letter queue
pub async fn list_dlq<S: Store + 'static>(
    State(store): State<Arc<S>>,
    tenant: TenantContext,
    Query(query): Query<ListWebhooksQuery>,
) -> impl IntoResponse {
    match store.list_dlq(&tenant.tenant_id, cap_limit(query.limit)).await {
        Ok(webhooks) => {
            let response = DlqListResponse {
                count: webhooks.len(),
                webhooks: webhooks
                    .into_iter()
                    .map(|w| DlqWebhookResponse {
                        id: w.id,
                        tenant_id: w.tenant_id,
                        original_webhook_id: w.original_webhook_id,
                        url: w.url,
                        event_type: w.event_type,
                        final_error: w.final_error,
                        total_attempts: w.total_attempts,
                        first_attempt_at: w.first_attempt_at.to_rfc3339(),
                        last_attempt_at: w.last_attempt_at.to_rfc3339(),
                        moved_to_dlq_at: w.moved_to_dlq_at.to_rfc3339(),
                    })
                    .collect(),
            };
            Json(response).into_response()
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to list DLQ");
            let (status, body) = error_response(ErrorCode::DatabaseError, None, None);
            (status, Json(body)).into_response()
        }
    }
}

/// POST /admin/webhooks/dlq/{id}/retry - Retry from DLQ
pub async fn retry_from_dlq<S: Store + 'static>(
    State(store): State<Arc<S>>,
    tenant: TenantContext,
    Path(dlq_id): Path<String>,
) -> impl IntoResponse {
    // S-01: Verify tenant ownership before mutation via single-entry lookup
    match store.get_dlq_entry(&dlq_id).await {
        Ok(Some(entry)) if entry.tenant_id == tenant.tenant_id => {}
        Ok(_) => {
            let (status, body) = error_response(
                ErrorCode::ResourceNotFound,
                Some("DLQ entry not found".into()),
                None,
            );
            return (status, Json(body)).into_response();
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to verify DLQ ownership");
            let (status, body) = error_response(ErrorCode::DatabaseError, None, None);
            return (status, Json(body)).into_response();
        }
    }

    match store.retry_from_dlq(&dlq_id).await {
        Ok(_) => {
            let response = serde_json::json!({
                "status": "queued",
                "message": "Webhook requeued from DLQ"
            });
            Json(response).into_response()
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to retry from DLQ");
            let (status, body) = error_response(ErrorCode::DatabaseError, None, None);
            (status, Json(body)).into_response()
        }
    }
}

/// DELETE /admin/webhooks/dlq/{id} - Delete from DLQ
pub async fn delete_from_dlq<S: Store + 'static>(
    State(store): State<Arc<S>>,
    tenant: TenantContext,
    Path(dlq_id): Path<String>,
) -> impl IntoResponse {
    // S-01: Verify tenant ownership before mutation via single-entry lookup
    match store.get_dlq_entry(&dlq_id).await {
        Ok(Some(entry)) if entry.tenant_id == tenant.tenant_id => {}
        Ok(_) => {
            let (status, body) = error_response(
                ErrorCode::ResourceNotFound,
                Some("DLQ entry not found".into()),
                None,
            );
            return (status, Json(body)).into_response();
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to verify DLQ ownership");
            let (status, body) = error_response(ErrorCode::DatabaseError, None, None);
            return (status, Json(body)).into_response();
        }
    }

    match store.delete_from_dlq(&dlq_id).await {
        Ok(_) => axum::http::StatusCode::NO_CONTENT.into_response(),
        Err(e) => {
            tracing::error!(error = %e, "Failed to delete from DLQ");
            let (status, body) = error_response(ErrorCode::DatabaseError, None, None);
            (status, Json(body)).into_response()
        }
    }
}
