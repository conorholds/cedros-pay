//! Admin handler for looking up a user's KYC and accredited investor status.
//!
//! GET `/admin/compliance/user-status/:user_id` — proxies to cedros-login.

use std::sync::Arc;

use axum::{extract::State, response::IntoResponse, Json};
use serde::Serialize;

use crate::errors::{error_response, ErrorCode};
use crate::handlers::admin::audit;
use crate::handlers::response::json_error;
use crate::middleware::TenantContext;
use crate::services::CedrosLoginClient;
use crate::storage::Store;

/// Shared state for compliance KYC handlers.
pub struct ComplianceKycState {
    pub cedros_login: Arc<CedrosLoginClient>,
    pub store: Arc<dyn Store>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct UserStatusResponse {
    user_id: String,
    kyc_status: String,
    accredited_investor: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    accredited_verified_at: Option<String>,
}

/// GET /admin/compliance/user-status/:user_id
pub async fn get_user_compliance_status(
    State(state): State<Arc<ComplianceKycState>>,
    tenant: TenantContext,
    axum::extract::Path(user_id): axum::extract::Path<String>,
) -> impl IntoResponse {
    if user_id.is_empty() {
        let (status, body) = error_response(
            ErrorCode::InvalidField,
            Some("user_id is required".to_string()),
            None,
        );
        return json_error(status, body).into_response();
    }

    audit(
        &*state.store,
        &tenant,
        "compliance",
        "user_status",
        "lookup",
        Some(serde_json::json!({ "user_id": user_id })),
    )
    .await;

    match state.cedros_login.get_user_compliance(&user_id).await {
        Ok(Some(status)) => {
            let kyc_str = serde_json::to_value(&status.kyc_status)
                .ok()
                .and_then(|v| v.as_str().map(|s| s.to_string()))
                .unwrap_or_else(|| "none".to_string());

            Json(UserStatusResponse {
                user_id,
                kyc_status: kyc_str,
                accredited_investor: status.accredited_investor,
                accredited_verified_at: status.accredited_verified_at.map(|dt| dt.to_rfc3339()),
            })
            .into_response()
        }
        Ok(None) => {
            // cedros-login returned 404 — user has no compliance record
            Json(UserStatusResponse {
                user_id,
                kyc_status: "none".to_string(),
                accredited_investor: false,
                accredited_verified_at: None,
            })
            .into_response()
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to fetch user compliance status");
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some("Failed to fetch compliance status from cedros-login".to_string()),
                None,
            );
            json_error(status, body).into_response()
        }
    }
}
