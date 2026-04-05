use std::collections::HashMap;
use std::sync::Arc;

use axum::{
    extract::State,
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    Json,
};
use serde::Deserialize;

use crate::errors::{error_response, ErrorCode};
use crate::handlers::paywall::AppState;
use crate::middleware::tenant::TenantContext;
use crate::models::PaymentMethod;
use crate::services::NativeStoreVerificationRequest;
use crate::storage::Store;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VerifyNativeStorePurchaseRequest {
    pub product_id: String,
    pub method: String,
    pub store_product_id: String,
    #[serde(default)]
    pub transaction_id: Option<String>,
    #[serde(default)]
    pub original_transaction_id: Option<String>,
    #[serde(default)]
    pub purchase_token: Option<String>,
    #[serde(default)]
    pub package_name: Option<String>,
    #[serde(default)]
    pub metadata: HashMap<String, String>,
}

pub async fn verify_native_store_purchase<S: Store + 'static>(
    State(state): State<Arc<AppState<S>>>,
    tenant: TenantContext,
    headers: HeaderMap,
    Json(request): Json<VerifyNativeStorePurchaseRequest>,
) -> impl IntoResponse {
    if let Err(message) = super::validate_metadata_map_size(&request.metadata) {
        let (status, body) = error_response(ErrorCode::InvalidField, Some(message), None);
        return (status, Json(body)).into_response();
    }

    let method = match request.method.as_str() {
        "apple_iap" => PaymentMethod::AppleIap,
        "google_play_billing" => PaymentMethod::GooglePlayBilling,
        _ => {
            let (status, body) = error_response(
                ErrorCode::InvalidField,
                Some("method must be 'apple_iap' or 'google_play_billing'".into()),
                None,
            );
            return (status, Json(body)).into_response();
        }
    };

    let auth_header = headers
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .unwrap_or_default();
    let user_id = state
        .paywall_service
        .extract_user_id_from_auth_header(auth_header)
        .await;

    let Some(native_store_service) = state.native_store_service.as_ref() else {
        let (status, body) = error_response(
            ErrorCode::ConfigError,
            Some("native store verification service is not configured".into()),
            None,
        );
        return (status, Json(body)).into_response();
    };

    match native_store_service
        .verify_purchase(NativeStoreVerificationRequest {
            tenant_id: tenant.tenant_id,
            user_id,
            product_id: request.product_id,
            method,
            store_product_id: request.store_product_id,
            transaction_id: request.transaction_id,
            original_transaction_id: request.original_transaction_id,
            purchase_token: request.purchase_token,
            package_name: request.package_name,
            metadata: request.metadata,
        })
        .await
    {
        Ok(response) => (axum::http::StatusCode::OK, Json(response)).into_response(),
        Err(error) => {
            let (status, body) = error_response(error.code(), Some(error.safe_message()), None);
            (status, Json(body)).into_response()
        }
    }
}

fn missing_native_store_service_response() -> axum::response::Response {
    let (status, body) = error_response(
        ErrorCode::ConfigError,
        Some("native store verification service is not configured".into()),
        None,
    );
    (status, Json(body)).into_response()
}

fn invalid_notification_tenant_response() -> axum::response::Response {
    let (status, body) = error_response(
        ErrorCode::InvalidField,
        Some(
            "native store notifications require an explicit tenant context; default tenant fallback is not allowed"
                .into(),
        ),
        None,
    );
    (status, Json(body)).into_response()
}

pub async fn apple_notification<S: Store + 'static>(
    State(state): State<Arc<AppState<S>>>,
    tenant: TenantContext,
    body: String,
) -> impl IntoResponse {
    if tenant.is_default {
        return invalid_notification_tenant_response();
    }

    let Some(native_store_service) = state.native_store_service.as_ref() else {
        return missing_native_store_service_response();
    };

    match native_store_service
        .handle_apple_server_notification(&tenant.tenant_id, &body)
        .await
    {
        Ok(response) => (StatusCode::OK, Json(response)).into_response(),
        Err(error) => {
            let (status, body) = error_response(error.code(), Some(error.safe_message()), None);
            (status, Json(body)).into_response()
        }
    }
}

pub async fn google_notification<S: Store + 'static>(
    State(state): State<Arc<AppState<S>>>,
    tenant: TenantContext,
    headers: HeaderMap,
    body: String,
) -> impl IntoResponse {
    if tenant.is_default {
        return invalid_notification_tenant_response();
    }

    let Some(native_store_service) = state.native_store_service.as_ref() else {
        return missing_native_store_service_response();
    };

    let auth_header = headers
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .unwrap_or_default();

    match native_store_service
        .handle_google_rtdn(&tenant.tenant_id, auth_header, &body)
        .await
    {
        Ok(response) => (StatusCode::OK, Json(response)).into_response(),
        Err(error) => {
            let (status, body) = error_response(error.code(), Some(error.safe_message()), None);
            (status, Json(body)).into_response()
        }
    }
}
