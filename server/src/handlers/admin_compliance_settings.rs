//! Admin handlers for per-tenant sanctions sweep configuration.
//!
//! GET/PUT `/admin/compliance/sweep-settings` — read and update the
//! `SanctionsSweepSettings` stored in `app_config` under the `compliance`
//! category, key `sanctions_sweep`.

use std::sync::Arc;

use axum::{extract::State, response::IntoResponse, Json};
use serde::{Deserialize, Serialize};

use crate::config::PostgresConfigRepository;
use crate::errors::{error_response, ErrorCode};
use crate::handlers::admin::audit;
use crate::handlers::response::json_error;
use crate::middleware::TenantContext;
use crate::models::compliance::SanctionsSweepSettings;
use crate::storage::Store;

const SETTINGS_CATEGORY: &str = "compliance";
const SETTINGS_KEY: &str = "sanctions_sweep";

/// Shared state for sweep-settings handlers.
pub struct SweepSettingsState {
    pub config_repo: Arc<PostgresConfigRepository>,
    pub store: Arc<dyn Store>,
}

// ── Response / Request types ────────────────────────────────────────────────

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct GetSweepSettingsResponse {
    #[serde(flatten)]
    settings: SanctionsSweepSettings,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSweepSettingsRequest {
    #[serde(flatten)]
    settings: SanctionsSweepSettings,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct UpdateSweepSettingsResponse {
    success: bool,
    message: String,
    #[serde(flatten)]
    settings: SanctionsSweepSettings,
}

// ── Handlers ────────────────────────────────────────────────────────────────

/// GET /admin/compliance/sweep-settings
pub async fn get_sweep_settings(
    State(state): State<Arc<SweepSettingsState>>,
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
                .and_then(|e| {
                    serde_json::from_value::<SanctionsSweepSettings>(e.value.clone()).ok()
                })
                .unwrap_or_default();

            Json(GetSweepSettingsResponse { settings }).into_response()
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to get sweep settings");
            Json(GetSweepSettingsResponse {
                settings: SanctionsSweepSettings::default(),
            })
            .into_response()
        }
    }
}

/// PUT /admin/compliance/sweep-settings
pub async fn update_sweep_settings(
    State(state): State<Arc<SweepSettingsState>>,
    tenant: TenantContext,
    Json(request): Json<UpdateSweepSettingsRequest>,
) -> impl IntoResponse {
    let settings = request.settings;

    // Validate batch_size
    if settings.batch_size < 1 || settings.batch_size > 10_000 {
        let (status, body) = error_response(
            ErrorCode::InvalidField,
            Some("batch_size must be between 1 and 10000".to_string()),
            None,
        );
        return json_error(status, body).into_response();
    }

    let value = match serde_json::to_value(&settings) {
        Ok(v) => v,
        Err(e) => {
            tracing::error!(error = %e, "Failed to serialize sweep settings");
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
            Some("Sanctions sweep settings"),
            Some(&tenant.tenant_id),
        )
        .await
    {
        Ok(_) => {
            tracing::info!(
                tenant_id = %tenant.tenant_id,
                enabled = settings.enabled,
                batch_size = settings.batch_size,
                "Updated sanctions sweep settings"
            );

            audit(
                &*state.store,
                &tenant,
                "compliance",
                "sanctions_sweep_settings",
                "update",
                None,
            )
            .await;

            Json(UpdateSweepSettingsResponse {
                success: true,
                message: "Sanctions sweep settings updated".to_string(),
                settings,
            })
            .into_response()
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to save sweep settings");
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some("Failed to save sweep settings".to_string()),
                None,
            );
            json_error(status, body).into_response()
        }
    }
}
