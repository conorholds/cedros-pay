//! Admin handlers for per-tenant dynamic sanctions API configuration.
//!
//! GET/PUT `/admin/compliance/sanctions-api` — read and update settings.
//! POST `/admin/compliance/sanctions-api/refresh` — force immediate refresh.

use std::sync::Arc;

use axum::{extract::State, response::IntoResponse, Json};
use serde::{Deserialize, Serialize};

use crate::config::PostgresConfigRepository;
use crate::errors::{error_response, ErrorCode};
use crate::handlers::admin::audit;
use crate::handlers::response::json_error;
use crate::middleware::TenantContext;
use crate::models::compliance::SanctionsApiSettings;
use crate::services::sanctions_list::SanctionsListService;
use crate::storage::Store;

const SETTINGS_CATEGORY: &str = "compliance";
const SETTINGS_KEY: &str = "sanctions_api";

/// Shared state for sanctions-api policy handlers.
pub struct CompliancePolicyState {
    pub config_repo: Arc<PostgresConfigRepository>,
    pub sanctions_service: Arc<SanctionsListService>,
    pub store: Arc<dyn Store>,
}

// ── Response / Request types ────────────────────────────────────────────────

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct GetSanctionsApiResponse {
    #[serde(flatten)]
    settings: SanctionsApiSettings,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSanctionsApiRequest {
    #[serde(flatten)]
    settings: SanctionsApiSettings,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct UpdateSanctionsApiResponse {
    success: bool,
    message: String,
    #[serde(flatten)]
    settings: SanctionsApiSettings,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct RefreshResponse {
    success: bool,
    message: String,
}

// ── Handlers ────────────────────────────────────────────────────────────────

/// GET /admin/compliance/sanctions-api
pub async fn get_sanctions_api_settings(
    State(state): State<Arc<CompliancePolicyState>>,
    tenant: TenantContext,
) -> impl IntoResponse {
    match state
        .config_repo
        .get_config(&tenant.tenant_id, SETTINGS_CATEGORY)
        .await
    {
        Ok(entries) => {
            let settings = entries
                .iter()
                .find(|e| e.config_key == SETTINGS_KEY)
                .and_then(|e| serde_json::from_value::<SanctionsApiSettings>(e.value.clone()).ok())
                .unwrap_or_default();

            Json(GetSanctionsApiResponse { settings }).into_response()
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to get sanctions API settings");
            Json(GetSanctionsApiResponse {
                settings: SanctionsApiSettings::default(),
            })
            .into_response()
        }
    }
}

/// PUT /admin/compliance/sanctions-api
pub async fn update_sanctions_api_settings(
    State(state): State<Arc<CompliancePolicyState>>,
    tenant: TenantContext,
    Json(request): Json<UpdateSanctionsApiRequest>,
) -> impl IntoResponse {
    let settings = request.settings;

    // Validate URL format when enabled
    if settings.enabled && !settings.api_url.is_empty() {
        if url::Url::parse(&settings.api_url).is_err() {
            let (status, body) = error_response(
                ErrorCode::InvalidField,
                Some("api_url must be a valid URL".to_string()),
                None,
            );
            return json_error(status, body).into_response();
        }
    }

    // Validate refresh interval
    if settings.refresh_interval_secs < 60 {
        let (status, body) = error_response(
            ErrorCode::InvalidField,
            Some("refresh_interval_secs must be at least 60".to_string()),
            None,
        );
        return json_error(status, body).into_response();
    }

    let value = match serde_json::to_value(&settings) {
        Ok(v) => v,
        Err(e) => {
            tracing::error!(error = %e, "Failed to serialize sanctions API settings");
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some("Failed to serialize settings".to_string()),
                None,
            );
            return json_error(status, body).into_response();
        }
    };

    match state
        .config_repo
        .upsert_config(
            &tenant.tenant_id,
            SETTINGS_KEY,
            SETTINGS_CATEGORY,
            value,
            Some("Dynamic sanctions API settings"),
            Some(&tenant.tenant_id),
        )
        .await
    {
        Ok(_) => {
            tracing::info!(
                tenant_id = %tenant.tenant_id,
                enabled = settings.enabled,
                api_url = %settings.api_url,
                "Updated sanctions API settings"
            );

            audit(
                &*state.store,
                &tenant,
                "compliance",
                "sanctions_api_settings",
                "update",
                None,
            )
            .await;

            Json(UpdateSanctionsApiResponse {
                success: true,
                message: "Sanctions API settings updated".to_string(),
                settings,
            })
            .into_response()
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to save sanctions API settings");
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some("Failed to save settings".to_string()),
                None,
            );
            json_error(status, body).into_response()
        }
    }
}

/// POST /admin/compliance/sanctions-api/refresh
pub async fn force_refresh(
    State(state): State<Arc<CompliancePolicyState>>,
    tenant: TenantContext,
) -> impl IntoResponse {
    // Load current settings
    let settings = match state
        .config_repo
        .get_config(&tenant.tenant_id, SETTINGS_CATEGORY)
        .await
    {
        Ok(entries) => entries
            .iter()
            .find(|e| e.config_key == SETTINGS_KEY)
            .and_then(|e| serde_json::from_value::<SanctionsApiSettings>(e.value.clone()).ok())
            .unwrap_or_default(),
        Err(e) => {
            tracing::error!(error = %e, "Failed to load sanctions API settings for refresh");
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some("Failed to load settings".to_string()),
                None,
            );
            return json_error(status, body).into_response();
        }
    };

    if !settings.enabled || settings.api_url.is_empty() {
        let (status, body) = error_response(
            ErrorCode::InvalidField,
            Some("Sanctions API is not enabled or URL is empty".to_string()),
            None,
        );
        return json_error(status, body).into_response();
    }

    match state
        .sanctions_service
        .refresh(&tenant.tenant_id, &settings)
        .await
    {
        Ok(()) => {
            tracing::info!(
                tenant_id = %tenant.tenant_id,
                "Forced sanctions list refresh completed"
            );

            audit(
                &*state.store,
                &tenant,
                "compliance",
                "sanctions_api",
                "force_refresh",
                None,
            )
            .await;

            Json(RefreshResponse {
                success: true,
                message: "Sanctions list refreshed successfully".to_string(),
            })
            .into_response()
        }
        Err(e) => {
            tracing::error!(error = %e, "Forced sanctions list refresh failed");
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some(format!("Refresh failed: {}", e)),
                None,
            );
            json_error(status, body).into_response()
        }
    }
}
