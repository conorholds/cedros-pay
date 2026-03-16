//! Admin image upload and delete handlers.
//!
//! - `POST /admin/images/upload` — multipart image upload → resize → WebP → S3
//! - `DELETE /admin/images` — delete image (and thumbnail) from S3

use std::sync::Arc;

use axum::{
    extract::{Multipart, State},
    response::IntoResponse,
};
use serde::{Deserialize, Serialize};

use crate::constants::MAX_IMAGE_UPLOAD_SIZE;
use crate::errors::{error_response, ErrorCode};
use crate::handlers::response::{json_error, json_ok};
use crate::middleware::TenantContext;
use crate::services::image_storage::{ImageStorageError, ImageStorageService};

/// Handler state for image upload/delete routes.
pub struct ImageUploadState {
    pub image_service: Arc<ImageStorageService>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct UploadResponse {
    url: String,
    thumb_url: String,
}

#[derive(Debug, Deserialize)]
pub struct DeleteRequest {
    url: String,
}

#[derive(Debug, Serialize)]
struct DeleteResponse {
    deleted: bool,
}

/// POST /admin/images/upload
///
/// Accepts multipart/form-data with a `file` field containing the image.
/// Returns `{ url, thumbUrl }` on success.
pub async fn upload_image(
    State(state): State<Arc<ImageUploadState>>,
    tenant: TenantContext,
    mut multipart: Multipart,
) -> impl IntoResponse {
    // Extract the file field from multipart
    let data = match extract_file_field(&mut multipart).await {
        Ok(d) => d,
        Err(msg) => {
            let (status, body) = error_response(ErrorCode::InvalidField, Some(msg), None);
            return json_error(status, body);
        }
    };

    match state
        .image_service
        .upload_image(&tenant.tenant_id, &data, MAX_IMAGE_UPLOAD_SIZE)
        .await
    {
        Ok(result) => {
            tracing::info!(
                tenant_id = %tenant.tenant_id,
                url = %result.url,
                "Image uploaded"
            );
            json_ok(UploadResponse {
                url: result.url,
                thumb_url: result.thumb_url,
            })
        }
        Err(e) => {
            let (code, msg) = map_storage_error(&e);
            tracing::warn!(
                tenant_id = %tenant.tenant_id,
                error = %e,
                "Image upload failed"
            );
            let (status, body) = error_response(code, Some(msg), None);
            json_error(status, body)
        }
    }
}

/// DELETE /admin/images
///
/// Accepts `{ "url": "..." }` JSON body. Deletes the image and its thumbnail.
pub async fn delete_image(
    State(state): State<Arc<ImageUploadState>>,
    tenant: TenantContext,
    axum::Json(body): axum::Json<DeleteRequest>,
) -> impl IntoResponse {
    if body.url.is_empty() {
        let (status, body) =
            error_response(ErrorCode::MissingField, Some("url is required".into()), None);
        return json_error(status, body);
    }

    match state
        .image_service
        .delete_image(&tenant.tenant_id, &body.url)
        .await
    {
        Ok(()) => {
            tracing::info!(
                tenant_id = %tenant.tenant_id,
                url = %body.url,
                "Image deleted"
            );
            json_ok(DeleteResponse { deleted: true })
        }
        Err(e) => {
            let (code, msg) = map_storage_error(&e);
            tracing::warn!(
                tenant_id = %tenant.tenant_id,
                error = %e,
                "Image delete failed"
            );
            let (status, body) = error_response(code, Some(msg), None);
            json_error(status, body)
        }
    }
}

/// Extract file bytes from the first `file` field in the multipart request.
async fn extract_file_field(multipart: &mut Multipart) -> Result<Vec<u8>, String> {
    while let Ok(Some(field)) = multipart.next_field().await {
        if field.name() == Some("file") {
            return field
                .bytes()
                .await
                .map(|b| b.to_vec())
                .map_err(|e| format!("failed to read file field: {}", e));
        }
    }
    Err("missing 'file' field in multipart body".into())
}

fn map_storage_error(e: &ImageStorageError) -> (ErrorCode, String) {
    match e {
        ImageStorageError::NotConfigured(msg) => (ErrorCode::ConfigError, msg.clone()),
        ImageStorageError::InvalidImage(msg) => (ErrorCode::InvalidField, msg.clone()),
        ImageStorageError::TooLarge { size, max } => (
            ErrorCode::InvalidField,
            format!("image too large: {} bytes exceeds {} byte limit", size, max),
        ),
        ImageStorageError::S3(msg) => (ErrorCode::InternalError, msg.clone()),
        ImageStorageError::Config(msg) => (ErrorCode::ConfigError, msg.clone()),
        ImageStorageError::Processing(msg) => (ErrorCode::InternalError, msg.clone()),
    }
}
