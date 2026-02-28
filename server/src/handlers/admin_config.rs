//! Admin configuration management handlers
//!
//! Provides CRUD operations for application configuration stored in PostgreSQL.
//! Supports encrypted secrets and audit trailing.

use std::sync::Arc;

use axum::{
    extract::{Path, Query, State},
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;

use crate::config::{
    default_keys_for_category, secret_fields_for_category, BatchUpsertItem,
    PostgresConfigRepository, KNOWN_CATEGORIES, REDACTED_PLACEHOLDER,
};
use crate::errors::{error_response, ErrorCode};
use crate::handlers::response::json_error;
use crate::middleware::TenantContext;

use super::cap_limit;

// ============================================================================
// Request/Response Types
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct ListCategoriesQuery {
    #[serde(default = "default_limit")]
    pub limit: i32,
}

#[derive(Debug, Deserialize)]
pub struct GetConfigQuery {
    /// If true, redact secrets (default true)
    #[serde(default = "default_redact")]
    pub redact_secrets: bool,
}

#[derive(Debug, Deserialize)]
pub struct GetHistoryQuery {
    pub category: Option<String>,
    #[serde(default = "default_limit")]
    pub limit: i32,
}

fn default_limit() -> i32 {
    100
}

fn default_redact() -> bool {
    true
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListCategoriesResponse {
    pub categories: Vec<CategoryMeta>,
    pub count: usize,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CategoryMeta {
    pub category: String,
    pub key_count: i64,
    pub last_updated: Option<String>,
    pub has_secrets: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GetConfigResponse {
    pub category: String,
    pub config: JsonValue,
    pub updated_at: Option<String>,
    pub secrets_redacted: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateConfigRequest {
    pub config: JsonValue,
    pub description: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateConfigResponse {
    pub category: String,
    pub updated: bool,
    pub message: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PatchConfigRequest {
    pub updates: JsonValue,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchUpdateRequest {
    pub updates: Vec<BatchUpdateItem>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchUpdateItem {
    pub category: String,
    pub config_key: String,
    pub value: JsonValue,
    pub description: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchUpdateResponse {
    pub updated_count: usize,
    pub message: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ValidateConfigRequest {
    pub category: String,
    pub config: JsonValue,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ValidateConfigResponse {
    pub valid: bool,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GetHistoryResponse {
    pub history: Vec<HistoryEntry>,
    pub count: usize,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryEntry {
    pub id: String,
    pub config_key: String,
    pub action: String,
    pub changed_at: String,
    pub changed_by: Option<String>,
}

/// Shared state for admin config handlers
pub struct AdminConfigState {
    pub repo: Arc<PostgresConfigRepository>,
}

// ============================================================================
// Handlers
// ============================================================================

/// GET /admin/config - List all config categories
pub async fn list_categories(
    State(state): State<Arc<AdminConfigState>>,
    tenant: TenantContext,
    Query(query): Query<ListCategoriesQuery>,
) -> impl IntoResponse {
    let _limit = cap_limit(query.limit);

    match state.repo.list_categories(&tenant.tenant_id).await {
        Ok(db_categories) => {
            let mut seen: std::collections::HashSet<String> = std::collections::HashSet::new();
            let mut categories: Vec<CategoryMeta> = db_categories
                .into_iter()
                .map(|c| {
                    seen.insert(c.category.clone());
                    CategoryMeta {
                        has_secrets: !secret_fields_for_category(&c.category).is_empty(),
                        category: c.category,
                        key_count: c.key_count,
                        last_updated: c.last_updated.map(|d| d.to_rfc3339()),
                    }
                })
                .collect();
            // Append known categories not yet in DB
            for &cat in KNOWN_CATEGORIES {
                if !seen.contains(cat) {
                    categories.push(CategoryMeta {
                        has_secrets: !secret_fields_for_category(cat).is_empty(),
                        category: cat.to_string(),
                        key_count: 0,
                        last_updated: None,
                    });
                }
            }
            let response = ListCategoriesResponse {
                count: categories.len(),
                categories,
            };
            Json(response).into_response()
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to list config categories");
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some("Failed to list config categories".to_string()),
                None,
            );
            json_error(status, body).into_response()
        }
    }
}

/// GET /admin/config/:category - Get config for a category
pub async fn get_config(
    State(state): State<Arc<AdminConfigState>>,
    tenant: TenantContext,
    Path(category): Path<String>,
    Query(query): Query<GetConfigQuery>,
) -> impl IntoResponse {
    match state.repo.get_config(&tenant.tenant_id, &category).await {
        Ok(entries) => {
            if entries.is_empty() {
                let default_keys = default_keys_for_category(&category);
                if default_keys.is_empty() {
                    // Truly unknown category
                    let (status, body) = error_response(
                        ErrorCode::ResourceNotFound,
                        Some("Config category not found".to_string()),
                        None,
                    );
                    return json_error(status, body).into_response();
                }
                // Return default schema with null values for known categories
                let config: serde_json::Map<String, JsonValue> = default_keys
                    .iter()
                    .map(|k| (k.to_string(), JsonValue::Null))
                    .collect();
                let response = GetConfigResponse {
                    category,
                    config: JsonValue::Object(config),
                    updated_at: None,
                    secrets_redacted: query.redact_secrets,
                };
                return Json(response).into_response();
            }

            // Merge entries into a single config object
            let mut config = serde_json::Map::new();
            let mut latest_updated: Option<chrono::DateTime<chrono::Utc>> = None;

            for entry in &entries {
                // Use the decrypted value if available and not redacting
                let value = if query.redact_secrets {
                    entry.value.clone()
                } else {
                    match state.repo.decrypt_entry(entry).await {
                        Ok(v) => v,
                        Err(e) => {
                            tracing::warn!(error = %e, key = %entry.config_key, "Failed to decrypt config entry");
                            entry.value.clone()
                        }
                    }
                };

                config.insert(entry.config_key.clone(), value);

                if latest_updated.map_or(true, |t| entry.updated_at > t) {
                    latest_updated = Some(entry.updated_at);
                }
            }

            // Backfill missing default keys so UI always shows all fields
            for key in default_keys_for_category(&category) {
                config.entry(key.to_string()).or_insert(JsonValue::Null);
            }

            let response = GetConfigResponse {
                category,
                config: JsonValue::Object(config),
                updated_at: latest_updated.map(|d| d.to_rfc3339()),
                secrets_redacted: query.redact_secrets,
            };
            Json(response).into_response()
        }
        Err(e) => {
            tracing::error!(error = %e, category = %category, "Failed to get config");
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some("Failed to get config".to_string()),
                None,
            );
            json_error(status, body).into_response()
        }
    }
}

/// PUT /admin/config/:category - Full update of a config category
pub async fn update_config(
    State(state): State<Arc<AdminConfigState>>,
    tenant: TenantContext,
    Path(category): Path<String>,
    Json(request): Json<UpdateConfigRequest>,
) -> impl IntoResponse {
    let updated_by = Some(tenant.tenant_id.as_str());

    // If the incoming value contains the category as a single key-value object, extract it
    let config_obj = if let Some(obj) = request.config.as_object() {
        obj.clone()
    } else {
        tracing::warn!("Config must be a JSON object");
        let (status, body) = error_response(
            ErrorCode::InvalidField,
            Some("Config must be a JSON object".to_string()),
            None,
        );
        return json_error(status, body).into_response();
    };

    // Collect items for atomic batch upsert
    let items: Vec<BatchUpsertItem> = config_obj
        .into_iter()
        .filter(|(_, value)| *value != REDACTED_PLACEHOLDER)
        .map(|(key, value)| BatchUpsertItem {
            category: category.clone(),
            config_key: key,
            value,
            description: request.description.clone(),
            updated_by: updated_by.map(|s| s.to_string()),
        })
        .collect();

    let update_count = match state
        .repo
        .batch_upsert_config(&tenant.tenant_id, items)
        .await
    {
        Ok(n) => n,
        Err(e) => {
            tracing::error!(error = %e, "Failed to update config");
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some("Failed to update config".to_string()),
                None,
            );
            return json_error(status, body).into_response();
        }
    };

    let response = UpdateConfigResponse {
        category,
        updated: update_count > 0,
        message: format!("Updated {} config keys", update_count),
    };
    Json(response).into_response()
}

/// PATCH /admin/config/:category - Partial update of a config category
pub async fn patch_config(
    State(state): State<Arc<AdminConfigState>>,
    tenant: TenantContext,
    Path(category): Path<String>,
    Json(request): Json<PatchConfigRequest>,
) -> impl IntoResponse {
    let updated_by = Some(tenant.tenant_id.as_str());

    let updates_obj = if let Some(obj) = request.updates.as_object() {
        obj.clone()
    } else {
        let (status, body) = error_response(
            ErrorCode::InvalidField,
            Some("Updates must be a JSON object".to_string()),
            None,
        );
        return json_error(status, body).into_response();
    };

    let mut update_count = 0;
    for (key, value) in updates_obj {
        // Skip if value is [REDACTED]
        if value == REDACTED_PLACEHOLDER {
            continue;
        }

        match state
            .repo
            .upsert_config(
                &tenant.tenant_id,
                &key,
                &category,
                value,
                request.description.as_deref(),
                updated_by,
            )
            .await
        {
            Ok(_) => update_count += 1,
            Err(e) => {
                tracing::error!(error = %e, key = %key, "Failed to patch config key");
                let (status, body) = error_response(
                    ErrorCode::InternalError,
                    Some("Failed to patch config".to_string()),
                    None,
                );
                return json_error(status, body).into_response();
            }
        }
    }

    let response = UpdateConfigResponse {
        category,
        updated: update_count > 0,
        message: format!("Patched {} config keys", update_count),
    };
    Json(response).into_response()
}

/// POST /admin/config/batch - Atomic batch update
pub async fn batch_update(
    State(state): State<Arc<AdminConfigState>>,
    tenant: TenantContext,
    Json(request): Json<BatchUpdateRequest>,
) -> impl IntoResponse {
    let updated_by = Some(tenant.tenant_id.as_str());

    let items: Vec<BatchUpsertItem> = request
        .updates
        .into_iter()
        .filter(|item| item.value != REDACTED_PLACEHOLDER)
        .map(|item| BatchUpsertItem {
            category: item.category,
            config_key: item.config_key,
            value: item.value,
            description: item.description,
            updated_by: updated_by.map(|s| s.to_string()),
        })
        .collect();

    let update_count = match state
        .repo
        .batch_upsert_config(&tenant.tenant_id, items)
        .await
    {
        Ok(n) => n,
        Err(e) => {
            tracing::error!(error = %e, "Failed to batch update config");
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some("Failed to batch update config".to_string()),
                None,
            );
            return json_error(status, body).into_response();
        }
    };

    let response = BatchUpdateResponse {
        updated_count: update_count,
        message: format!("Batch updated {} config keys", update_count),
    };
    Json(response).into_response()
}

/// POST /admin/config/validate - Validate config without saving
pub async fn validate_config(
    State(_state): State<Arc<AdminConfigState>>,
    tenant: TenantContext,
    Json(request): Json<ValidateConfigRequest>,
) -> impl IntoResponse {
    let _ = tenant; // Used for logging context
    let mut errors = Vec::new();
    let mut warnings = Vec::new();

    // Basic validation - check if config is a valid object
    if !request.config.is_object() {
        errors.push("Config must be a JSON object".to_string());
    }

    // Validate category-specific rules
    match request.category.as_str() {
        "stripe" => {
            if let Some(obj) = request.config.as_object() {
                if obj.get("secret_key").is_none() {
                    warnings.push("stripe.secret_key is not set".to_string());
                }
                if obj.get("webhook_secret").is_none() {
                    warnings.push("stripe.webhook_secret is not set".to_string());
                }
            }
        }
        "x402" => {
            if let Some(obj) = request.config.as_object() {
                if obj.get("payment_address").is_none() {
                    errors.push("x402.payment_address is required".to_string());
                }
                if obj.get("token_mint").is_none() {
                    errors.push("x402.token_mint is required".to_string());
                }
            }
        }
        _ => {}
    }

    let response = ValidateConfigResponse {
        valid: errors.is_empty(),
        errors,
        warnings,
    };
    Json(response).into_response()
}

/// GET /admin/config/history - Get config change history
pub async fn get_history(
    State(state): State<Arc<AdminConfigState>>,
    tenant: TenantContext,
    Query(query): Query<GetHistoryQuery>,
) -> impl IntoResponse {
    let limit = cap_limit(query.limit);

    match state
        .repo
        .get_history(&tenant.tenant_id, query.category.as_deref(), limit)
        .await
    {
        Ok(history) => {
            let response = GetHistoryResponse {
                count: history.len(),
                history: history
                    .into_iter()
                    .map(|h| HistoryEntry {
                        id: h.id.to_string(),
                        config_key: h.config_key,
                        action: h.action,
                        changed_at: h.changed_at.to_rfc3339(),
                        changed_by: h.changed_by,
                    })
                    .collect(),
            };
            Json(response).into_response()
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to get config history");
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some("Failed to get config history".to_string()),
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
    fn test_cap_limit() {
        assert_eq!(cap_limit(0), 1);
        assert_eq!(cap_limit(-5), 1);
        assert_eq!(cap_limit(50), 50);
        assert_eq!(cap_limit(1500), 1000);
    }

    #[test]
    fn test_default_values() {
        assert_eq!(default_limit(), 100);
        assert!(default_redact());
    }

    #[test]
    fn test_known_categories_have_default_keys() {
        for &cat in KNOWN_CATEGORIES {
            assert!(
                !default_keys_for_category(cat).is_empty(),
                "known category '{}' should have default keys",
                cat
            );
        }
    }

    #[test]
    fn test_unknown_category_has_no_default_keys() {
        assert!(default_keys_for_category("nonexistent").is_empty());
    }
}
