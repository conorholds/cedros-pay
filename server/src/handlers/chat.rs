//! Public chat endpoint for customer-facing AI assistant.
//!
//! Provides conversational AI with tool calling for product search.

use std::sync::Arc;

use axum::{extract::State, response::IntoResponse, Json};
use chrono::Utc;
use serde::{Deserialize, Serialize};

use super::response::json_error;
use crate::config::PostgresConfigRepository;
use crate::errors::{error_response, ErrorCode};
use crate::handlers::admin_ai::AiTask;
use crate::handlers::admin_ai::{AiModel, AiProvider};
use crate::handlers::admin_ai_assistant::{AiRateLimiter, ProductMatch};
use crate::middleware::tenant::TenantContext;
use crate::models::{ChatMessage, ChatSession};
use crate::observability::record_ai_rate_limit_rejection;
use crate::repositories::ProductRepository;
use crate::services::{
    AiError, AiService, ChatOrchestrator, FactFinderConfig, FaqMatch, DEFAULT_CHAT_SYSTEM_PROMPT,
    DEFAULT_FACT_FINDER_PROMPT,
};
use crate::storage::Store;

// ============================================================================
// State
// ============================================================================

/// Shared state for chat handler
pub struct ChatState {
    pub store: Arc<dyn Store>,
    pub config_repo: Arc<PostgresConfigRepository>,
    pub product_repo: Arc<dyn ProductRepository>,
    pub orchestrator: ChatOrchestrator,
    pub rate_limiter: AiRateLimiter,
}

impl ChatState {
    pub fn new(
        store: Arc<dyn Store>,
        config_repo: Arc<PostgresConfigRepository>,
        product_repo: Arc<dyn ProductRepository>,
        ai_service: Arc<AiService>,
        rate_limiter: AiRateLimiter,
    ) -> Self {
        Self {
            store,
            config_repo,
            product_repo,
            orchestrator: ChatOrchestrator::new(ai_service),
            rate_limiter,
        }
    }
}

// ============================================================================
// Request/Response Types
// ============================================================================

/// POST /chat request
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatRequest {
    /// Optional session ID - creates new if omitted
    #[serde(default)]
    pub session_id: Option<String>,
    /// The user's message
    pub message: String,
}

/// POST /chat response
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatResponse {
    /// The session ID (new or existing)
    pub session_id: String,
    /// The assistant's response
    pub message: String,
    /// Products found via tool calls (if any)
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub products: Vec<ProductMatch>,
    /// FAQ entries found via fact_finder (if any)
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub faqs: Vec<FaqMatch>,
    /// Actions taken (for future extensibility)
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub actions: Vec<String>,
}

// ============================================================================
// Handler
// ============================================================================

/// POST /chat - Public chat endpoint
pub async fn chat(
    State(state): State<Arc<ChatState>>,
    tenant: TenantContext,
    Json(request): Json<ChatRequest>,
) -> impl IntoResponse {
    // Validate message
    let message = request.message.trim();
    if message.is_empty() {
        let (status, body) = error_response(
            ErrorCode::InvalidField,
            Some("message is required".into()),
            None,
        );
        return json_error(status, body).into_response();
    }

    // Check rate limit
    if !state.rate_limiter.try_consume(&tenant.tenant_id) {
        record_ai_rate_limit_rejection(&tenant.tenant_id);
        let (status, body) = error_response(
            ErrorCode::RateLimited,
            Some("Chat rate limit exceeded. Please wait before trying again.".into()),
            None,
        );
        return json_error(status, body).into_response();
    }

    // Load or create session
    let (session, _is_new) = match load_or_create_session(&state, &tenant.tenant_id, &request).await
    {
        Ok(result) => result,
        Err(e) => {
            tracing::error!(error = %e, "Failed to load/create session");
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some("Failed to manage chat session".into()),
                None,
            );
            return json_error(status, body).into_response();
        }
    };

    // Load AI config
    let (provider, model, api_key) =
        match load_ai_config(&state.config_repo, &tenant.tenant_id).await {
            Ok(cfg) => cfg,
            Err(e) => {
                tracing::warn!(error = %e, "AI not configured for chat");
                let (status, body) = error_response(
                    ErrorCode::ConfigError,
                    Some(format!("Chat not configured: {}", e)),
                    None,
                );
                return json_error(status, body).into_response();
            }
        };

    // Load conversation history
    let history = match state
        .store
        .list_chat_messages(&tenant.tenant_id, &session.id, 20, 0)
        .await
    {
        Ok(msgs) => msgs,
        Err(e) => {
            tracing::error!(error = %e, "Failed to load chat history");
            vec![] // Continue with empty history
        }
    };

    // Load products, FAQs, prompts, and fact_finder config in parallel
    let (products_result, faqs_result, system_prompt, fact_finder_config) = tokio::join!(
        state.product_repo.list_products(&tenant.tenant_id),
        state.store.search_faqs(&tenant.tenant_id, "", 100),
        load_prompt(&state.config_repo, &tenant.tenant_id),
        load_fact_finder_config(&state.config_repo, &tenant.tenant_id),
    );

    let products = match products_result {
        Ok(prods) => prods,
        Err(e) => {
            tracing::error!(error = %e, "Failed to load products");
            vec![]
        }
    };

    let faqs = match faqs_result {
        Ok(f) => f,
        Err(e) => {
            tracing::error!(error = %e, "Failed to load FAQs");
            vec![]
        }
    };

    // Save user message first
    let user_msg = ChatMessage::user(
        tenant.tenant_id.clone(),
        session.id.clone(),
        generate_id(),
        message.to_string(),
    );

    if let Err(e) = state.store.create_chat_message(user_msg).await {
        tracing::error!(error = %e, "Failed to save user message");
        // Continue anyway - don't fail the chat
    }

    // Process the message
    let result = state
        .orchestrator
        .process_message(
            provider,
            model,
            &api_key,
            Some(&system_prompt),
            &history,
            message,
            &products,
            &faqs,
            fact_finder_config.as_ref(),
        )
        .await;

    match result {
        Ok(chat_result) => {
            // Save assistant message
            let tool_results = if chat_result.products.is_empty() && chat_result.faqs.is_empty() {
                None
            } else {
                Some(serde_json::json!({
                    "products": chat_result.products,
                    "faqs": chat_result.faqs,
                    "actions": chat_result.actions,
                }))
            };

            let assistant_msg = ChatMessage::assistant(
                tenant.tenant_id.clone(),
                session.id.clone(),
                generate_id(),
                chat_result.message.clone(),
                tool_results,
            );

            if let Err(e) = state.store.create_chat_message(assistant_msg).await {
                tracing::error!(error = %e, "Failed to save assistant message");
            }

            // Update session
            let now = Utc::now();
            let new_count = session.message_count + 2; // user + assistant
            if let Err(e) = state
                .store
                .update_chat_session(&tenant.tenant_id, &session.id, new_count, now, now)
                .await
            {
                tracing::error!(error = %e, "Failed to update session");
            }

            Json(ChatResponse {
                session_id: session.id,
                message: chat_result.message,
                products: chat_result.products,
                faqs: chat_result.faqs,
                actions: chat_result.actions,
            })
            .into_response()
        }
        Err(e) => {
            tracing::error!(error = %e, "Chat processing failed");
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some("Failed to process message".into()),
                None,
            );
            json_error(status, body).into_response()
        }
    }
}

// ============================================================================
// Helper Functions
// ============================================================================

/// Load existing session or create a new one
async fn load_or_create_session(
    state: &ChatState,
    tenant_id: &str,
    request: &ChatRequest,
) -> Result<(ChatSession, bool), String> {
    if let Some(ref session_id) = request.session_id {
        // Try to load existing session
        match state.store.get_chat_session(tenant_id, session_id).await {
            Ok(Some(session)) => return Ok((session, false)),
            Ok(None) => {
                // Session ID provided but doesn't exist - create with that ID
                let session = ChatSession::new(tenant_id.to_string(), session_id.clone());
                state
                    .store
                    .create_chat_session(session.clone())
                    .await
                    .map_err(|e| format!("Failed to create session: {}", e))?;
                return Ok((session, true));
            }
            Err(e) => return Err(format!("Failed to load session: {}", e)),
        }
    }

    // No session ID - create new
    let session = ChatSession::new(tenant_id.to_string(), generate_id());
    state
        .store
        .create_chat_session(session.clone())
        .await
        .map_err(|e| format!("Failed to create session: {}", e))?;
    Ok((session, true))
}

/// Load AI configuration
async fn load_ai_config(
    repo: &PostgresConfigRepository,
    tenant_id: &str,
) -> Result<(AiProvider, AiModel, String), AiError> {
    // Reuse the existing config loading logic
    crate::handlers::admin_ai_assistant::load_ai_config(repo, tenant_id).await
}

/// Load custom chat system prompt or use default
async fn load_prompt(repo: &PostgresConfigRepository, tenant_id: &str) -> String {
    crate::handlers::admin_ai_assistant::load_prompt(
        repo,
        tenant_id,
        "chat_system",
        DEFAULT_CHAT_SYSTEM_PROMPT,
    )
    .await
}

/// Load fact finder AI configuration (optional - falls back to keyword search if not configured)
async fn load_fact_finder_config(
    repo: &PostgresConfigRepository,
    tenant_id: &str,
) -> Option<FactFinderConfig> {
    use crate::handlers::admin_ai_assistant::{model_to_provider, provider_config_key};

    let entries = repo.get_config(tenant_id, "ai").await.ok()?;

    // Get model assignment for FactFinder task
    let assignment_key = format!("assignment_{}", AiTask::FactFinder);
    let model = entries
        .iter()
        .find(|e| e.config_key == assignment_key)
        .and_then(|e| e.value.as_str())
        .and_then(|s| serde_json::from_str::<AiModel>(&format!("\"{}\"", s)).ok())
        .unwrap_or(AiModel::NotSet);

    if model == AiModel::NotSet {
        return None;
    }

    let provider = model_to_provider(model)?;

    // Get API key
    let key_name = provider_config_key(provider);
    let entry = entries.iter().find(|e| e.config_key == key_name)?;

    let api_key = repo
        .decrypt_entry(entry)
        .await
        .ok()?
        .as_str()
        .map(|s| s.to_string())?;

    if api_key.is_empty() {
        return None;
    }

    // Load custom prompt or use default
    let prompt = crate::handlers::admin_ai_assistant::load_prompt(
        repo,
        tenant_id,
        "fact_finder",
        DEFAULT_FACT_FINDER_PROMPT,
    )
    .await;

    Some(FactFinderConfig {
        provider,
        model,
        api_key,
        prompt,
    })
}

/// Generate a unique ID
fn generate_id() -> String {
    uuid::Uuid::new_v4().to_string()
}
