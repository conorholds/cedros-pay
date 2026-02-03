//! Admin AI settings handlers
//!
//! Provides endpoints for managing AI provider API keys and model assignments.
//! API keys are stored encrypted at rest and returned masked in responses.

use std::sync::Arc;

use axum::{
    extract::{Path, State},
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};

use crate::config::PostgresConfigRepository;
use crate::errors::{error_response, ErrorCode};
use crate::handlers::response::json_error;
use crate::middleware::TenantContext;

// ============================================================================
// Types - matching UI team RFC
// ============================================================================

/// AI Provider identifiers
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AiProvider {
    Gemini,
    Openai,
}

impl AiProvider {
    fn config_key(&self) -> &'static str {
        match self {
            AiProvider::Gemini => "gemini_api_key",
            AiProvider::Openai => "openai_api_key",
        }
    }
}

impl std::fmt::Display for AiProvider {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AiProvider::Gemini => write!(f, "gemini"),
            AiProvider::Openai => write!(f, "openai"),
        }
    }
}

impl std::str::FromStr for AiProvider {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "gemini" => Ok(AiProvider::Gemini),
            "openai" => Ok(AiProvider::Openai),
            _ => Err(format!("Unknown provider: {}", s)),
        }
    }
}

/// AI Model identifiers
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
pub enum AiModel {
    #[default]
    NotSet,
    Gemini25Flash,
    Gemini25Pro,
    #[serde(rename = "OpenAI4o")]
    OpenAi4o,
    #[serde(rename = "OpenAI51")]
    OpenAi51,
    #[serde(rename = "OpenAI52")]
    OpenAi52,
}

impl AiModel {
    fn provider(&self) -> Option<AiProvider> {
        match self {
            AiModel::NotSet => None,
            AiModel::Gemini25Flash | AiModel::Gemini25Pro => Some(AiProvider::Gemini),
            AiModel::OpenAi4o | AiModel::OpenAi51 | AiModel::OpenAi52 => Some(AiProvider::Openai),
        }
    }
}

/// AI Task identifiers
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum AiTask {
    SiteChat,
    ProductSearcher,
    RelatedProductFinder,
    ProductDetailAssistant,
    FactFinder,
}

impl AiTask {
    /// Returns all defined AI tasks
    fn all() -> &'static [AiTask] {
        &[
            AiTask::SiteChat,
            AiTask::ProductSearcher,
            AiTask::RelatedProductFinder,
            AiTask::ProductDetailAssistant,
            AiTask::FactFinder,
        ]
    }
}

impl std::fmt::Display for AiTask {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AiTask::SiteChat => write!(f, "site_chat"),
            AiTask::ProductSearcher => write!(f, "product_searcher"),
            AiTask::RelatedProductFinder => write!(f, "related_product_finder"),
            AiTask::ProductDetailAssistant => write!(f, "product_detail_assistant"),
            AiTask::FactFinder => write!(f, "fact_finder"),
        }
    }
}

// ============================================================================
// Request/Response Types
// ============================================================================

/// Masked API key info (first 4 + last 4 chars)
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MaskedApiKey {
    pub provider: AiProvider,
    pub masked_key: String,
    pub configured: bool,
}

/// Model assignment for a task
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskAssignment {
    pub task: AiTask,
    pub assigned_model: AiModel,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub system_prompt: Option<String>,
}

/// GET /admin/config/ai response
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GetAiSettingsResponse {
    pub api_keys: Vec<MaskedApiKey>,
    pub assignments: Vec<TaskAssignment>,
}

/// PUT /admin/config/ai/api-key request
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveApiKeyRequest {
    pub provider: AiProvider,
    pub api_key: String,
}

/// PUT /admin/config/ai/api-key response
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveApiKeyResponse {
    pub provider: AiProvider,
    pub saved: bool,
    pub message: String,
}

/// DELETE /admin/config/ai/api-key/:provider response
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteApiKeyResponse {
    pub provider: AiProvider,
    pub deleted: bool,
    pub message: String,
}

/// PUT /admin/config/ai/assignment request
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveAssignmentRequest {
    pub task: AiTask,
    pub model: AiModel,
}

/// PUT /admin/config/ai/assignment response
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveAssignmentResponse {
    pub task: AiTask,
    pub model: AiModel,
    pub saved: bool,
    pub message: String,
}

/// PUT /admin/config/ai/prompt request
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SavePromptRequest {
    pub task: AiTask,
    pub system_prompt: String,
}

/// PUT /admin/config/ai/prompt response
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SavePromptResponse {
    pub task: AiTask,
    pub saved: bool,
    pub message: String,
}

/// Shared state for AI settings handlers
pub struct AdminAiState {
    pub repo: Arc<PostgresConfigRepository>,
}

const AI_CATEGORY: &str = "ai";

// ============================================================================
// Helper Functions
// ============================================================================

/// Mask an API key, showing only first 4 and last 4 chars
fn mask_api_key(key: &str) -> String {
    if key.len() <= 8 {
        return "*".repeat(key.len());
    }
    format!(
        "{}{}{}",
        &key[..4],
        "*".repeat(key.len() - 8),
        &key[key.len() - 4..]
    )
}

// ============================================================================
// Handlers
// ============================================================================

/// GET /admin/config/ai - Get AI settings (masked keys + task assignments)
pub async fn get_ai_settings(
    State(state): State<Arc<AdminAiState>>,
    tenant: TenantContext,
) -> impl IntoResponse {
    // Load all AI config entries
    let entries = match state.repo.get_config(&tenant.tenant_id, AI_CATEGORY).await {
        Ok(e) => e,
        Err(e) => {
            tracing::error!(error = %e, "Failed to get AI config");
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some("Failed to get AI settings".to_string()),
                None,
            );
            return json_error(status, body).into_response();
        }
    };

    // Build response
    let mut api_keys = Vec::new();

    // Check each provider
    for provider in [AiProvider::Gemini, AiProvider::Openai] {
        let key_name = provider.config_key();
        let entry = entries.iter().find(|e| e.config_key == key_name);

        if let Some(entry) = entry {
            // Decrypt the key to get masked version
            match state.repo.decrypt_entry(entry).await {
                Ok(decrypted) => {
                    if let Some(key_str) = decrypted.as_str() {
                        if !key_str.is_empty() {
                            api_keys.push(MaskedApiKey {
                                provider,
                                masked_key: mask_api_key(key_str),
                                configured: true,
                            });
                            continue;
                        }
                    }
                }
                Err(e) => {
                    tracing::warn!(error = %e, provider = %provider, "Failed to decrypt API key");
                }
            }
        }

        // Not configured
        api_keys.push(MaskedApiKey {
            provider,
            masked_key: String::new(),
            configured: false,
        });
    }

    // Load task assignments and system prompts
    let mut assignments = Vec::new();
    for task in AiTask::all() {
        let assignment_key = format!("assignment_{}", task);
        let prompt_key = format!("prompt_{}", task);

        let assignment_entry = entries.iter().find(|e| e.config_key == assignment_key);
        let prompt_entry = entries.iter().find(|e| e.config_key == prompt_key);

        let assigned_model = assignment_entry
            .and_then(|e| e.value.as_str())
            .and_then(|s| serde_json::from_str::<AiModel>(&format!("\"{}\"", s)).ok())
            .unwrap_or(AiModel::NotSet);

        let system_prompt = prompt_entry.and_then(|e| e.value.as_str().map(|s| s.to_string()));

        assignments.push(TaskAssignment {
            task: *task,
            assigned_model,
            system_prompt,
        });
    }

    let response = GetAiSettingsResponse {
        api_keys,
        assignments,
    };
    Json(response).into_response()
}

/// PUT /admin/config/ai/api-key - Save API key (encrypted)
pub async fn save_api_key(
    State(state): State<Arc<AdminAiState>>,
    tenant: TenantContext,
    Json(request): Json<SaveApiKeyRequest>,
) -> impl IntoResponse {
    // Validate API key is not empty
    if request.api_key.trim().is_empty() {
        let (status, body) = error_response(
            ErrorCode::InvalidField,
            Some("API key cannot be empty".to_string()),
            None,
        );
        return json_error(status, body).into_response();
    }

    let key_name = request.provider.config_key();

    // Store encrypted (PostgresConfigRepository handles encryption for secret fields)
    match state
        .repo
        .upsert_config(
            &tenant.tenant_id,
            key_name,
            AI_CATEGORY,
            serde_json::Value::String(request.api_key),
            Some("AI API key updated"),
            Some(&tenant.tenant_id),
        )
        .await
    {
        Ok(_) => {
            let response = SaveApiKeyResponse {
                provider: request.provider,
                saved: true,
                message: format!("{} API key saved", request.provider),
            };
            Json(response).into_response()
        }
        Err(e) => {
            tracing::error!(error = %e, provider = %request.provider, "Failed to save API key");
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some("Failed to save API key".to_string()),
                None,
            );
            json_error(status, body).into_response()
        }
    }
}

/// DELETE /admin/config/ai/api-key/:provider - Remove API key
pub async fn delete_api_key(
    State(state): State<Arc<AdminAiState>>,
    tenant: TenantContext,
    Path(provider_str): Path<String>,
) -> impl IntoResponse {
    let provider: AiProvider = match provider_str.parse() {
        Ok(p) => p,
        Err(_) => {
            let (status, body) = error_response(
                ErrorCode::InvalidField,
                Some(format!("Unknown provider: {}", provider_str)),
                None,
            );
            return json_error(status, body).into_response();
        }
    };

    let key_name = provider.config_key();

    // Delete the config entry
    match state.repo.delete_config(&tenant.tenant_id, key_name).await {
        Ok(deleted) => {
            let response = DeleteApiKeyResponse {
                provider,
                deleted,
                message: if deleted {
                    format!("{} API key removed", provider)
                } else {
                    format!("{} API key was not configured", provider)
                },
            };
            Json(response).into_response()
        }
        Err(e) => {
            tracing::error!(error = %e, provider = %provider, "Failed to delete API key");
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some("Failed to delete API key".to_string()),
                None,
            );
            json_error(status, body).into_response()
        }
    }
}

/// PUT /admin/config/ai/assignment - Assign model to task
pub async fn save_assignment(
    State(state): State<Arc<AdminAiState>>,
    tenant: TenantContext,
    Json(request): Json<SaveAssignmentRequest>,
) -> impl IntoResponse {
    // Validate: if model requires a provider, check that provider's API key is configured
    if let Some(required_provider) = request.model.provider() {
        let key_name = required_provider.config_key();
        match state.repo.get_config(&tenant.tenant_id, AI_CATEGORY).await {
            Ok(entries) => {
                let has_key = entries.iter().any(|e| e.config_key == key_name);
                if !has_key {
                    let (status, body) = error_response(
                        ErrorCode::InvalidField,
                        Some(format!(
                            "Cannot assign {} model without {} API key configured",
                            request
                                .model
                                .provider()
                                .map(|p| p.to_string())
                                .unwrap_or_default(),
                            required_provider
                        )),
                        None,
                    );
                    return json_error(status, body).into_response();
                }
            }
            Err(e) => {
                tracing::error!(error = %e, "Failed to check API key configuration");
                let (status, body) = error_response(
                    ErrorCode::InternalError,
                    Some("Failed to validate assignment".to_string()),
                    None,
                );
                return json_error(status, body).into_response();
            }
        }
    }

    let key_name = format!("assignment_{}", request.task);
    let model_str = serde_json::to_string(&request.model)
        .unwrap_or_default()
        .trim_matches('"')
        .to_string();

    // Store assignment
    match state
        .repo
        .upsert_config(
            &tenant.tenant_id,
            &key_name,
            AI_CATEGORY,
            serde_json::Value::String(model_str),
            Some(&format!(
                "AI task {} assigned to {:?}",
                request.task, request.model
            )),
            Some(&tenant.tenant_id),
        )
        .await
    {
        Ok(_) => {
            let response = SaveAssignmentResponse {
                task: request.task,
                model: request.model,
                saved: true,
                message: format!("{:?} assigned to {:?}", request.task, request.model),
            };
            Json(response).into_response()
        }
        Err(e) => {
            tracing::error!(error = %e, task = %request.task, "Failed to save assignment");
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some("Failed to save assignment".to_string()),
                None,
            );
            json_error(status, body).into_response()
        }
    }
}

/// PUT /admin/config/ai/prompt - Save system prompt for a task
pub async fn save_prompt(
    State(state): State<Arc<AdminAiState>>,
    tenant: TenantContext,
    Json(request): Json<SavePromptRequest>,
) -> impl IntoResponse {
    let key_name = format!("prompt_{}", request.task);

    // Store prompt
    match state
        .repo
        .upsert_config(
            &tenant.tenant_id,
            &key_name,
            AI_CATEGORY,
            serde_json::Value::String(request.system_prompt),
            Some(&format!("System prompt updated for {}", request.task)),
            Some(&tenant.tenant_id),
        )
        .await
    {
        Ok(_) => {
            let response = SavePromptResponse {
                task: request.task,
                saved: true,
                message: format!("System prompt saved for {:?}", request.task),
            };
            Json(response).into_response()
        }
        Err(e) => {
            tracing::error!(error = %e, task = %request.task, "Failed to save system prompt");
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some("Failed to save system prompt".to_string()),
                None,
            );
            json_error(status, body).into_response()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mask_api_key() {
        // "sk-1234567890abcdef" is 19 chars, first 4 + last 4 = 8, middle = 11 asterisks
        assert_eq!(mask_api_key("sk-1234567890abcdef"), "sk-1***********cdef");
        assert_eq!(mask_api_key("short"), "*****");
        assert_eq!(mask_api_key("12345678"), "********");
        // "123456789" is 9 chars, first 4 + last 4 = 8, middle = 1 asterisk
        assert_eq!(mask_api_key("123456789"), "1234*6789");
    }

    #[test]
    fn test_provider_config_key() {
        assert_eq!(AiProvider::Gemini.config_key(), "gemini_api_key");
        assert_eq!(AiProvider::Openai.config_key(), "openai_api_key");
    }

    #[test]
    fn test_model_provider() {
        assert_eq!(AiModel::NotSet.provider(), None);
        assert_eq!(AiModel::Gemini25Flash.provider(), Some(AiProvider::Gemini));
        assert_eq!(AiModel::Gemini25Pro.provider(), Some(AiProvider::Gemini));
        assert_eq!(AiModel::OpenAi4o.provider(), Some(AiProvider::Openai));
        assert_eq!(AiModel::OpenAi51.provider(), Some(AiProvider::Openai));
        assert_eq!(AiModel::OpenAi52.provider(), Some(AiProvider::Openai));
    }

    #[test]
    fn test_provider_from_str() {
        assert_eq!("gemini".parse::<AiProvider>().unwrap(), AiProvider::Gemini);
        assert_eq!("openai".parse::<AiProvider>().unwrap(), AiProvider::Openai);
        assert_eq!("GEMINI".parse::<AiProvider>().unwrap(), AiProvider::Gemini);
        assert!("unknown".parse::<AiProvider>().is_err());
    }
}
