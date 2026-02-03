//! Chat session and message models for site chat feature.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;

/// A chat session between a customer and the AI assistant.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatSession {
    pub id: String,
    pub tenant_id: String,
    /// Optional link to Customer record if identified
    #[serde(skip_serializing_if = "Option::is_none")]
    pub customer_id: Option<String>,
    /// Email for anonymous users or from checkout flow
    #[serde(skip_serializing_if = "Option::is_none")]
    pub customer_email: Option<String>,
    /// Session status: "active", "archived"
    pub status: String,
    /// Number of messages in this session
    pub message_count: i32,
    pub last_message_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl ChatSession {
    /// Create a new active chat session
    pub fn new(tenant_id: String, id: String) -> Self {
        let now = Utc::now();
        Self {
            id,
            tenant_id,
            customer_id: None,
            customer_email: None,
            status: "active".to_string(),
            message_count: 0,
            last_message_at: now,
            created_at: now,
            updated_at: now,
        }
    }
}

/// A single message in a chat session.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatMessage {
    pub id: String,
    pub tenant_id: String,
    pub session_id: String,
    /// Message role: "user", "assistant", "tool"
    pub role: String,
    /// Text content of the message
    pub content: String,
    /// Tool calls made by assistant (JSON array)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_calls: Option<Value>,
    /// Results from tool execution (JSON object with products, actions, etc.)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_results: Option<Value>,
    pub created_at: DateTime<Utc>,
}

impl ChatMessage {
    /// Create a new user message
    pub fn user(tenant_id: String, session_id: String, id: String, content: String) -> Self {
        Self {
            id,
            tenant_id,
            session_id,
            role: "user".to_string(),
            content,
            tool_calls: None,
            tool_results: None,
            created_at: Utc::now(),
        }
    }

    /// Create a new assistant message
    pub fn assistant(
        tenant_id: String,
        session_id: String,
        id: String,
        content: String,
        tool_results: Option<Value>,
    ) -> Self {
        Self {
            id,
            tenant_id,
            session_id,
            role: "assistant".to_string(),
            content,
            tool_calls: None,
            tool_results,
            created_at: Utc::now(),
        }
    }
}

/// Message role constants
pub mod role {
    pub const USER: &str = "user";
    pub const ASSISTANT: &str = "assistant";
    pub const TOOL: &str = "tool";
}

/// Session status constants
pub mod status {
    pub const ACTIVE: &str = "active";
    pub const ARCHIVED: &str = "archived";
}
