//! Admin handlers for asset redemption management.

use std::sync::Arc;

use axum::{
    extract::{Path, Query, State},
    response::IntoResponse,
    Json,
};
use serde::Deserialize;

use crate::errors::validation::validate_resource_id;
use crate::errors::{error_response, ErrorCode};
use crate::handlers::admin::audit;
use crate::handlers::response::{json_error, json_ok};
use crate::middleware::TenantContext;
use crate::repositories::ProductRepository;
use crate::services::AssetFulfillmentService;
use crate::storage::Store;

/// Shared state for asset redemption admin routes.
pub struct AssetRedemptionAdminState {
    pub store: Arc<dyn Store>,
    /// Product repository for looking up token quantities during burn.
    pub products: Arc<dyn ProductRepository>,
    /// Optional fulfillment service used to burn tokens on completion.
    pub asset_fulfillment: Option<Arc<AssetFulfillmentService>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListRedemptionsQuery {
    pub status: Option<String>,
    pub collection_id: Option<String>,
    pub limit: Option<i32>,
    pub offset: Option<i32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateStatusRequest {
    pub status: String,
    pub admin_notes: Option<String>,
}

const VALID_STATUSES: &[&str] = &[
    "pending_info",
    "info_submitted",
    "under_review",
    "approved",
    "completed",
    "rejected",
];

/// GET /admin/asset-redemptions — list redemptions with optional filters.
///
/// Query params: `status`, `collectionId`, `limit` (max 200), `offset`.
pub async fn list_redemptions(
    State(state): State<Arc<AssetRedemptionAdminState>>,
    tenant: TenantContext,
    Query(query): Query<ListRedemptionsQuery>,
) -> impl IntoResponse {
    let limit = query.limit.unwrap_or(50).min(200);
    let offset = query.offset.unwrap_or(0).max(0);

    match state
        .store
        .list_asset_redemptions(
            &tenant.tenant_id,
            query.status.as_deref(),
            query.collection_id.as_deref(),
            limit,
            offset,
        )
        .await
    {
        Ok(redemptions) => {
            json_ok(serde_json::json!({ "redemptions": redemptions })).into_response()
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to list asset redemptions");
            let (status, body) = error_response(
                ErrorCode::DatabaseError,
                Some("Failed to list redemptions".to_string()),
                None,
            );
            json_error(status, body).into_response()
        }
    }
}

/// Valid status transitions for asset redemptions.
fn valid_transitions(from: &str) -> &'static [&'static str] {
    match from {
        "pending_info" => &["info_submitted", "rejected"],
        "info_submitted" => &["under_review", "rejected"],
        "under_review" => &["approved", "rejected"],
        "approved" => &["completed"],
        // Terminal states — no transitions allowed
        "completed" | "rejected" => &[],
        _ => &[],
    }
}

/// PATCH /admin/asset-redemptions/:id/status — update redemption status.
///
/// Body: `{ "status": "<valid_status>", "adminNotes": "<optional>" }`.
/// Validates the transition is allowed. Returns 400 for invalid transitions,
/// 404 if redemption not found.
pub async fn update_status(
    State(state): State<Arc<AssetRedemptionAdminState>>,
    tenant: TenantContext,
    Path(id): Path<String>,
    Json(req): Json<UpdateStatusRequest>,
) -> impl IntoResponse {
    if let Err(e) = validate_resource_id(&id) {
        let (status, body) = error_response(ErrorCode::InvalidResource, Some(e.message), None);
        return json_error(status, body).into_response();
    }

    // Cap admin_notes to 10 KiB
    if let Some(ref notes) = req.admin_notes {
        if notes.len() > 10 * 1024 {
            let (status, body) = error_response(
                ErrorCode::InvalidField,
                Some("admin_notes too long (max 10240 bytes)".to_string()),
                None,
            );
            return json_error(status, body).into_response();
        }
    }

    if !VALID_STATUSES.contains(&req.status.as_str()) {
        let (status, body) = error_response(
            ErrorCode::InvalidField,
            Some(format!(
                "Invalid status '{}'. Must be one of: {}",
                req.status,
                VALID_STATUSES.join(", ")
            )),
            None,
        );
        return json_error(status, body).into_response();
    }

    // Fetch current redemption to validate transition
    let redemption = match state.store.get_asset_redemption(&tenant.tenant_id, &id).await {
        Ok(Some(r)) => r,
        Ok(None) => {
            let (status, body) = error_response(
                ErrorCode::ResourceNotFound,
                Some("Redemption not found".to_string()),
                None,
            );
            return json_error(status, body).into_response();
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to get redemption for transition check");
            let (status, body) = error_response(ErrorCode::DatabaseError, None, None);
            return json_error(status, body).into_response();
        }
    };

    let current = serde_json::to_value(&redemption.status)
        .ok()
        .and_then(|v| v.as_str().map(String::from))
        .unwrap_or_default();

    if !valid_transitions(&current).contains(&req.status.as_str()) {
        let (status, body) = error_response(
            ErrorCode::InvalidField,
            Some(format!(
                "Cannot transition from '{}' to '{}'. Allowed: {:?}",
                current,
                req.status,
                valid_transitions(&current)
            )),
            None,
        );
        return json_error(status, body).into_response();
    }

    match state
        .store
        .update_asset_redemption_status(
            &tenant.tenant_id,
            &id,
            &req.status,
            req.admin_notes.as_deref(),
        )
        .await
    {
        Ok(()) => {
            audit(
                &*state.store,
                &tenant,
                "asset_redemption",
                &id,
                "update_status",
                Some(serde_json::json!({ "status": &req.status })),
            )
            .await;
            json_ok(serde_json::json!({ "updated": true })).into_response()
        }
        Err(crate::storage::StorageError::NotFound) => {
            let (status, body) = error_response(
                ErrorCode::ResourceNotFound,
                Some("Redemption not found".to_string()),
                None,
            );
            json_error(status, body).into_response()
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to update redemption status");
            let (status, body) = error_response(
                ErrorCode::DatabaseError,
                Some("Failed to update status".to_string()),
                None,
            );
            json_error(status, body).into_response()
        }
    }
}

/// POST /admin/asset-redemptions/:id/complete — mark redemption as completed.
///
/// Requires the redemption to be in `approved` status. Transitions it to
/// `completed`. Token burn (Phase 3) is not yet implemented.
pub async fn complete_redemption(
    State(state): State<Arc<AssetRedemptionAdminState>>,
    tenant: TenantContext,
    Path(id): Path<String>,
) -> impl IntoResponse {
    if let Err(e) = validate_resource_id(&id) {
        let (status, body) = error_response(ErrorCode::InvalidResource, Some(e.message), None);
        return json_error(status, body).into_response();
    }

    let redemption = match state.store.get_asset_redemption(&tenant.tenant_id, &id).await {
        Ok(Some(r)) => r,
        Ok(None) => {
            let (status, body) = error_response(
                ErrorCode::ResourceNotFound,
                Some("Redemption not found".to_string()),
                None,
            );
            return json_error(status, body).into_response();
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to get redemption");
            let (status, body) = error_response(
                ErrorCode::DatabaseError,
                Some("Database error".to_string()),
                None,
            );
            return json_error(status, body).into_response();
        }
    };

    if redemption.status != crate::models::AssetRedemptionStatus::Approved {
        let (status, body) = error_response(
            ErrorCode::InvalidField,
            Some("Redemption must be in 'approved' status to complete".to_string()),
            None,
        );
        return json_error(status, body).into_response();
    }

    // Look up the product to determine how many tokens to burn
    let burn_amount = match state.products.get_product(&tenant.tenant_id, &redemption.product_id).await {
        Ok(p) => p.tokenized_asset_config.map(|c| c.tokens_per_unit as u64).unwrap_or(1),
        Err(e) => {
            tracing::warn!(error = %e, product_id = %redemption.product_id, "Failed to look up product for burn amount, defaulting to 1");
            1
        }
    };

    // Best-effort token burn — logs on failure, does not block completion.
    if let (Some(svc), Some(user_id)) = (&state.asset_fulfillment, &redemption.user_id) {
        if let Some(sig) = svc
            .burn_redemption_tokens(
                &tenant.tenant_id,
                &redemption.collection_id,
                &redemption.product_id,
                user_id,
                burn_amount,
            )
            .await
        {
            if let Err(e) = state
                .store
                .record_token_burn_signature(&tenant.tenant_id, &id, &sig)
                .await
            {
                tracing::warn!(error = %e, signature = %sig, "Failed to persist burn signature");
            }
        }
    }

    match state
        .store
        .update_asset_redemption_status(
            &tenant.tenant_id,
            &id,
            "completed",
            Some("Redemption completed by admin"),
        )
        .await
    {
        Ok(()) => {
            audit(&*state.store, &tenant, "asset_redemption", &id, "complete", None).await;
            json_ok(serde_json::json!({ "completed": true, "id": id })).into_response()
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to complete redemption");
            let (status, body) = error_response(
                ErrorCode::DatabaseError,
                Some("Failed to complete".to_string()),
                None,
            );
            json_error(status, body).into_response()
        }
    }
}
