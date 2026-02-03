//! Admin chat endpoints for viewing chat sessions and history.
//!
//! Provides CRM-style access to customer chat conversations.

use std::sync::Arc;

use axum::{
    extract::{Path, Query, State},
    response::IntoResponse,
    Json,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use super::response::json_error;
use crate::errors::{error_response, ErrorCode};
use crate::handlers::admin_ai_assistant::ProductMatch;
use crate::middleware::TenantContext;
use crate::models::ChatMessage;
use crate::storage::Store;

// ============================================================================
// State
// ============================================================================

/// Shared state for admin chat handlers
pub struct AdminChatState {
    pub store: Arc<dyn Store>,
}

impl AdminChatState {
    pub fn new(store: Arc<dyn Store>) -> Self {
        Self { store }
    }
}

// ============================================================================
// Request/Response Types
// ============================================================================

/// Query params for listing chat sessions
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListSessionsQuery {
    /// Filter by customer ID
    #[serde(default)]
    pub customer_id: Option<String>,
    /// Filter by status (active, archived)
    #[serde(default)]
    pub status: Option<String>,
    /// Page size (default 20, max 100)
    #[serde(default = "default_limit")]
    pub limit: i32,
    /// Offset for pagination
    #[serde(default)]
    pub offset: i32,
}

fn default_limit() -> i32 {
    20
}

/// A chat session summary for listing
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatSessionSummary {
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub customer_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub customer_email: Option<String>,
    pub status: String,
    pub message_count: i32,
    pub last_message_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}

/// GET /admin/chats response
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListSessionsResponse {
    pub sessions: Vec<ChatSessionSummary>,
    pub total: i64,
    pub limit: i32,
    pub offset: i32,
}

/// A message in the chat history
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatMessageView {
    pub id: String,
    pub role: String,
    pub content: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub products: Option<Vec<ProductMatch>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub actions: Option<Vec<String>>,
    pub created_at: DateTime<Utc>,
}

/// GET /admin/chats/:sessionId response
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GetSessionResponse {
    pub session: ChatSessionSummary,
    pub messages: Vec<ChatMessageView>,
}

// ============================================================================
// Handlers
// ============================================================================

/// GET /admin/chats - List chat sessions
pub async fn list_chat_sessions(
    State(state): State<Arc<AdminChatState>>,
    tenant: TenantContext,
    Query(query): Query<ListSessionsQuery>,
) -> impl IntoResponse {
    // Clamp limit to max 100
    let limit = query.limit.clamp(1, 100);

    let (sessions, total) = match state
        .store
        .list_chat_sessions(
            &tenant.tenant_id,
            query.customer_id.as_deref(),
            query.status.as_deref(),
            limit,
            query.offset,
        )
        .await
    {
        Ok(result) => result,
        Err(e) => {
            tracing::error!(error = %e, "Failed to list chat sessions");
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some("Failed to list chat sessions".into()),
                None,
            );
            return json_error(status, body).into_response();
        }
    };

    let session_summaries: Vec<ChatSessionSummary> = sessions
        .into_iter()
        .map(|s| ChatSessionSummary {
            id: s.id,
            customer_id: s.customer_id,
            customer_email: s.customer_email,
            status: s.status,
            message_count: s.message_count,
            last_message_at: s.last_message_at,
            created_at: s.created_at,
        })
        .collect();

    Json(ListSessionsResponse {
        sessions: session_summaries,
        total,
        limit,
        offset: query.offset,
    })
    .into_response()
}

/// GET /admin/chats/:sessionId - Get chat session with messages
pub async fn get_chat_session(
    State(state): State<Arc<AdminChatState>>,
    tenant: TenantContext,
    Path(session_id): Path<String>,
) -> impl IntoResponse {
    // Load session
    let session = match state
        .store
        .get_chat_session(&tenant.tenant_id, &session_id)
        .await
    {
        Ok(Some(s)) => s,
        Ok(None) => {
            let (status, body) = error_response(
                ErrorCode::InvalidResource,
                Some("Chat session not found".into()),
                None,
            );
            return json_error(status, body).into_response();
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to load chat session");
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some("Failed to load chat session".into()),
                None,
            );
            return json_error(status, body).into_response();
        }
    };

    // Load messages
    let messages = match state
        .store
        .list_chat_messages(&tenant.tenant_id, &session_id, 100, 0)
        .await
    {
        Ok(msgs) => msgs,
        Err(e) => {
            tracing::error!(error = %e, "Failed to load chat messages");
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some("Failed to load chat messages".into()),
                None,
            );
            return json_error(status, body).into_response();
        }
    };

    let message_views: Vec<ChatMessageView> = messages.into_iter().map(message_to_view).collect();

    Json(GetSessionResponse {
        session: ChatSessionSummary {
            id: session.id,
            customer_id: session.customer_id,
            customer_email: session.customer_email,
            status: session.status,
            message_count: session.message_count,
            last_message_at: session.last_message_at,
            created_at: session.created_at,
        },
        messages: message_views,
    })
    .into_response()
}

/// Query params for listing user chat sessions
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListUserSessionsQuery {
    /// Filter by status (active, archived)
    #[serde(default)]
    pub status: Option<String>,
    /// Page size (default 20, max 100)
    #[serde(default = "default_limit")]
    pub limit: i32,
    /// Offset for pagination
    #[serde(default)]
    pub offset: i32,
}

/// GET /admin/users/:userId/chats - List chat sessions for a specific user
pub async fn list_user_chat_sessions(
    State(state): State<Arc<AdminChatState>>,
    tenant: TenantContext,
    Path(user_id): Path<String>,
    Query(query): Query<ListUserSessionsQuery>,
) -> impl IntoResponse {
    // Clamp limit to max 100
    let limit = query.limit.clamp(1, 100);

    let (sessions, total) = match state
        .store
        .list_chat_sessions(
            &tenant.tenant_id,
            Some(&user_id),
            query.status.as_deref(),
            limit,
            query.offset,
        )
        .await
    {
        Ok(result) => result,
        Err(e) => {
            tracing::error!(error = %e, user_id = %user_id, "Failed to list user chat sessions");
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some("Failed to list chat sessions".into()),
                None,
            );
            return json_error(status, body).into_response();
        }
    };

    let session_summaries: Vec<ChatSessionSummary> = sessions
        .into_iter()
        .map(|s| ChatSessionSummary {
            id: s.id,
            customer_id: s.customer_id,
            customer_email: s.customer_email,
            status: s.status,
            message_count: s.message_count,
            last_message_at: s.last_message_at,
            created_at: s.created_at,
        })
        .collect();

    Json(ListSessionsResponse {
        sessions: session_summaries,
        total,
        limit,
        offset: query.offset,
    })
    .into_response()
}

/// Convert a ChatMessage to a view model
fn message_to_view(msg: ChatMessage) -> ChatMessageView {
    let (products, actions) = if let Some(ref results) = msg.tool_results {
        let products = results
            .get("products")
            .and_then(|v| serde_json::from_value::<Vec<ProductMatch>>(v.clone()).ok());
        let actions = results
            .get("actions")
            .and_then(|v| serde_json::from_value::<Vec<String>>(v.clone()).ok());
        (products, actions)
    } else {
        (None, None)
    };

    ChatMessageView {
        id: msg.id,
        role: msg.role,
        content: msg.content,
        products,
        actions,
        created_at: msg.created_at,
    }
}
