//! Buyer-facing asset redemption endpoints.
//!
//! Allows buyers to view redemption forms, submit redemption info,
//! and check redemption status for tokenized asset purchases.
//!
//! Routes (nested under `/paywall/v1`):
//! - `GET  /asset-redemption/:product_id/form`   — returns the redemption form config
//! - `POST /asset-redemption/:product_id/submit` — submit redemption form data
//! - `GET  /asset-redemption/:product_id/status` — check redemption status

use std::sync::Arc;

use axum::{
    extract::{Path, State},
    response::IntoResponse,
    Json,
};
use serde::Deserialize;

use crate::errors::validation::validate_resource_id;
use crate::errors::{error_response, ErrorCode};
use crate::handlers::response::{json_error, json_ok};
use crate::middleware::tenant::TenantContext;
use crate::repositories::{ProductRepository, ProductRepositoryError};
use crate::services::CedrosLoginClient;
use crate::storage::Store;

/// State for asset redemption buyer routes.
pub struct AssetRedemptionState {
    pub store: Arc<dyn Store>,
    pub products: Arc<dyn ProductRepository>,
    /// Optional auth client — when present, submit/status enforce ownership.
    pub cedros_login: Option<Arc<CedrosLoginClient>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubmitRedemptionRequest {
    pub form_data: serde_json::Value,
}

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

/// GET /asset-redemption/:product_id/form
///
/// Returns the redemption form configuration for the given tokenized product,
/// sourced from the product's linked asset-class collection.
///
/// Errors:
/// - 404 if product not found or not a tokenized asset
/// - 404 if the linked collection is missing or has no tokenization config
pub async fn get_redemption_form(
    State(state): State<Arc<AssetRedemptionState>>,
    tenant: TenantContext,
    Path(product_id): Path<String>,
) -> impl IntoResponse {
    if let Err(e) = validate_resource_id(&product_id) {
        let (status, body) = error_response(ErrorCode::InvalidResource, Some(e.message), None);
        return json_error(status, body).into_response();
    }

    let product = match state
        .products
        .get_product(&tenant.tenant_id, &product_id)
        .await
    {
        Ok(p) => p,
        Err(ProductRepositoryError::NotFound) => {
            let (status, body) = error_response(
                ErrorCode::ProductNotFound,
                Some("product not found".into()),
                None,
            );
            return json_error(status, body).into_response();
        }
        Err(e) => {
            tracing::error!(error = %e, product_id = %product_id, "Failed to get product");
            let (status, body) = error_response(ErrorCode::InternalError, None, None);
            return json_error(status, body).into_response();
        }
    };

    let asset_config = match &product.tokenized_asset_config {
        Some(c) => c.clone(),
        None => {
            let (status, body) = error_response(
                ErrorCode::InvalidField,
                Some("product is not a tokenized asset".into()),
                None,
            );
            return json_error(status, body).into_response();
        }
    };

    let collection = match state
        .store
        .get_collection(&tenant.tenant_id, &asset_config.asset_class_collection_id)
        .await
    {
        Ok(Some(c)) => c,
        Ok(None) => {
            let (status, body) = error_response(
                ErrorCode::ResourceNotFound,
                Some("asset class collection not found".into()),
                None,
            );
            return json_error(status, body).into_response();
        }
        Err(e) => {
            tracing::error!(
                error = %e,
                collection_id = %asset_config.asset_class_collection_id,
                "Failed to get collection"
            );
            let (status, body) = error_response(ErrorCode::DatabaseError, None, None);
            return json_error(status, body).into_response();
        }
    };

    let tokenization = match &collection.tokenization_config {
        Some(tc) => tc.clone(),
        None => {
            let (status, body) = error_response(
                ErrorCode::InvalidField,
                Some("collection has no tokenization config".into()),
                None,
            );
            return json_error(status, body).into_response();
        }
    };

    match &tokenization.redemption_config {
        Some(rc) => json_ok(serde_json::json!({
            "productId": product_id,
            "collectionId": asset_config.asset_class_collection_id,
            "assetClass": tokenization.asset_class,
            "redemptionConfig": rc,
        }))
        .into_response(),
        None => json_ok(serde_json::json!({
            "productId": product_id,
            "collectionId": asset_config.asset_class_collection_id,
            "assetClass": tokenization.asset_class,
            "redemptionConfig": null,
            "message": "no redemption form configured for this asset class",
        }))
        .into_response(),
    }
}

/// POST /asset-redemption/:product_id/submit
///
/// Finds the most-recent `pending_info` redemption for this product,
/// persists the buyer-submitted form data, and transitions to `info_submitted`.
///
/// When the redemption has a `user_id`, the caller must provide a valid
/// `Authorization: Bearer <jwt>` matching that user. Guest redemptions
/// (user_id = None) are accessible without auth.
///
/// Errors:
/// - 401 if redemption has user_id but no valid auth token
/// - 403 if caller's user_id doesn't match redemption owner
/// - 404 if no pending redemption exists for this product
/// - 500 on database failure
pub async fn submit_redemption(
    State(state): State<Arc<AssetRedemptionState>>,
    tenant: TenantContext,
    headers: axum::http::HeaderMap,
    Path(product_id): Path<String>,
    Json(req): Json<SubmitRedemptionRequest>,
) -> impl IntoResponse {
    if let Err(e) = validate_resource_id(&product_id) {
        let (status, body) = error_response(ErrorCode::InvalidResource, Some(e.message), None);
        return json_error(status, body).into_response();
    }

    // Validate form_data: must be a flat object with string values, bounded size
    if let Err(msg) = validate_form_data(&req.form_data) {
        let (status, body) = error_response(ErrorCode::InvalidField, Some(msg), None);
        return json_error(status, body).into_response();
    }

    let caller_user_id = extract_caller_user_id(&state, &headers).await;

    let redemptions = match state
        .store
        .list_asset_redemptions(&tenant.tenant_id, Some("pending_info"), None, 100, 0)
        .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!(error = %e, product_id = %product_id, "Failed to list redemptions");
            let (status, body) = error_response(ErrorCode::DatabaseError, None, None);
            return json_error(status, body).into_response();
        }
    };

    let redemption = match redemptions.into_iter().find(|r| r.product_id == product_id) {
        Some(r) => r,
        None => {
            let (status, body) = error_response(
                ErrorCode::ResourceNotFound,
                Some("no pending redemption found for this product".into()),
                None,
            );
            return json_error(status, body).into_response();
        }
    };

    // Ownership check: if redemption has a user_id, the caller must match
    if let Some(ref owner) = redemption.user_id {
        match &caller_user_id {
            None => {
                let (status, body) = error_response(
                    ErrorCode::Unauthorized,
                    Some("authentication required to submit redemption".into()),
                    None,
                );
                return json_error(status, body).into_response();
            }
            Some(caller) if caller != owner => {
                let (status, body) = error_response(
                    ErrorCode::Forbidden,
                    Some("not authorized for this redemption".into()),
                    None,
                );
                return json_error(status, body).into_response();
            }
            _ => {} // caller matches owner
        }
    }

    match state
        .store
        .update_asset_redemption_form_data(&tenant.tenant_id, &redemption.id, &req.form_data)
        .await
    {
        Ok(()) => json_ok(serde_json::json!({
            "submitted": true,
            "redemptionId": redemption.id,
            "status": "info_submitted",
        }))
        .into_response(),
        Err(e) => {
            tracing::error!(
                error = %e,
                redemption_id = %redemption.id,
                "Failed to persist form data"
            );
            let (status, body) = error_response(ErrorCode::DatabaseError, None, None);
            json_error(status, body).into_response()
        }
    }
}

/// GET /asset-redemption/:product_id/status
///
/// Returns redemption records for the given product scoped to the caller.
/// Authenticated users only see their own redemptions; unauthenticated callers
/// only see guest (user_id = null) redemptions.
///
/// Errors:
/// - 404 if no visible redemptions exist for this product
/// - 500 on database failure
pub async fn get_redemption_status(
    State(state): State<Arc<AssetRedemptionState>>,
    tenant: TenantContext,
    headers: axum::http::HeaderMap,
    Path(product_id): Path<String>,
) -> impl IntoResponse {
    if let Err(e) = validate_resource_id(&product_id) {
        let (status, body) = error_response(ErrorCode::InvalidResource, Some(e.message), None);
        return json_error(status, body).into_response();
    }

    let caller_user_id = extract_caller_user_id(&state, &headers).await;

    let redemptions = match state
        .store
        .list_asset_redemptions(&tenant.tenant_id, None, None, 100, 0)
        .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!(error = %e, product_id = %product_id, "Failed to list redemptions");
            let (status, body) = error_response(ErrorCode::DatabaseError, None, None);
            return json_error(status, body).into_response();
        }
    };

    // Filter by product AND ownership
    let matching: Vec<_> = redemptions
        .into_iter()
        .filter(|r| {
            if r.product_id != product_id {
                return false;
            }
            // Scope by caller: authenticated users see their own, guests see unowned
            match (&caller_user_id, &r.user_id) {
                (Some(caller), Some(owner)) => caller == owner,
                (None, None) => true,     // guest sees guest redemptions
                (Some(_), None) => true,  // auth'd user can see guest redemptions for their product
                (None, Some(_)) => false, // unauthenticated cannot see auth'd redemptions
            }
        })
        .collect();

    if matching.is_empty() {
        let (status, body) = error_response(
            ErrorCode::ResourceNotFound,
            Some("no redemption found for this product".into()),
            None,
        );
        return json_error(status, body).into_response();
    }

    json_ok(serde_json::json!({ "redemptions": matching })).into_response()
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth helper
// ─────────────────────────────────────────────────────────────────────────────

/// Extract user_id from Authorization Bearer token (if present and valid).
/// Returns None if no auth header, invalid token, or no CedrosLoginClient.
async fn extract_caller_user_id(
    state: &AssetRedemptionState,
    headers: &axum::http::HeaderMap,
) -> Option<String> {
    let client = state.cedros_login.as_ref()?;
    let auth = headers
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .unwrap_or_default();
    if auth.is_empty() {
        return None;
    }
    client.extract_user_id_from_auth_header(auth).await
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation helpers
// ─────────────────────────────────────────────────────────────────────────────

/// Max total serialized size of form_data (100 KiB).
const MAX_FORM_DATA_SIZE: usize = 100 * 1024;
/// Max number of fields in form_data.
const MAX_FORM_DATA_FIELDS: usize = 50;
/// Max length of a single string value (accommodates base64 file uploads).
const MAX_FIELD_VALUE_LEN: usize = 2 * 1024 * 1024;

/// Validates that form_data is a flat JSON object with string values and bounded size.
fn validate_form_data(data: &serde_json::Value) -> Result<(), String> {
    let obj = data
        .as_object()
        .ok_or_else(|| "formData must be a JSON object".to_string())?;

    if obj.is_empty() {
        return Err("formData must not be empty".to_string());
    }

    if obj.len() > MAX_FORM_DATA_FIELDS {
        return Err(format!(
            "formData has too many fields ({}, max {})",
            obj.len(),
            MAX_FORM_DATA_FIELDS
        ));
    }

    for (key, value) in obj {
        if key.is_empty() || key.len() > 200 {
            return Err(format!(
                "field key must be 1-200 characters, got {}",
                key.len()
            ));
        }

        match value {
            serde_json::Value::String(s) => {
                if s.len() > MAX_FIELD_VALUE_LEN {
                    return Err(format!(
                        "field '{}' value too large ({} bytes, max {})",
                        key,
                        s.len(),
                        MAX_FIELD_VALUE_LEN
                    ));
                }
            }
            serde_json::Value::Null => {} // treat null as empty/optional
            _ => {
                return Err(format!(
                    "field '{}' must be a string or null, got {}",
                    key,
                    value_type_name(value)
                ));
            }
        }
    }

    // Check total serialized size
    let serialized = serde_json::to_string(data).unwrap_or_default();
    if serialized.len() > MAX_FORM_DATA_SIZE {
        return Err(format!(
            "formData too large ({} bytes, max {})",
            serialized.len(),
            MAX_FORM_DATA_SIZE
        ));
    }

    Ok(())
}

fn value_type_name(v: &serde_json::Value) -> &'static str {
    match v {
        serde_json::Value::Null => "null",
        serde_json::Value::Bool(_) => "boolean",
        serde_json::Value::Number(_) => "number",
        serde_json::Value::String(_) => "string",
        serde_json::Value::Array(_) => "array",
        serde_json::Value::Object(_) => "object",
    }
}
