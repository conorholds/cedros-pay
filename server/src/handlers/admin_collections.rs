//! Admin collection handlers

use std::sync::Arc;

use axum::{
    extract::{Path, Query, State},
    response::IntoResponse,
    Json,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};

use crate::errors::{error_response, ErrorCode};
use crate::handlers::admin::AdminState;
use crate::handlers::response::{json_error, json_ok};
use crate::middleware::TenantContext;
use crate::models::Collection;

use super::cap_limit_opt;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListCollectionsQuery {
    pub active_only: Option<bool>,
    pub limit: Option<i32>,
    pub offset: Option<i32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateCollectionRequest {
    pub id: Option<String>,
    pub name: String,
    pub description: Option<String>,
    #[serde(default)]
    pub product_ids: Vec<String>,
    #[serde(default = "default_active")]
    pub active: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCollectionRequest {
    pub name: String,
    pub description: Option<String>,
    #[serde(default)]
    pub product_ids: Vec<String>,
    #[serde(default = "default_active")]
    pub active: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListCollectionsResponse {
    pub collections: Vec<Collection>,
}

fn default_active() -> bool {
    true
}

fn normalize_product_ids(mut ids: Vec<String>) -> Result<Vec<String>, String> {
    for id in &mut ids {
        *id = id.trim().to_string();
        if id.is_empty() {
            return Err("product_ids must not contain empty values".to_string());
        }
    }
    ids.sort();
    ids.dedup();
    Ok(ids)
}

pub async fn list_collections(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Query(params): Query<ListCollectionsQuery>,
) -> impl IntoResponse {
    let limit = cap_limit_opt(params.limit, 50);
    let offset = params.offset.unwrap_or(0).max(0);
    match state
        .store
        .list_collections(&tenant.tenant_id, params.active_only, limit, offset)
        .await
    {
        Ok(collections) => json_ok(ListCollectionsResponse { collections }),
        Err(e) => {
            let (status, body) = error_response(
                ErrorCode::DatabaseError,
                Some(format!("Failed to list collections: {e}")),
                None,
            );
            json_error(status, body)
        }
    }
}

pub async fn get_collection(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Path(id): Path<String>,
) -> impl IntoResponse {
    match state.store.get_collection(&tenant.tenant_id, &id).await {
        Ok(Some(collection)) => json_ok(collection),
        Ok(None) => {
            let (status, body) = error_response(
                ErrorCode::ResourceNotFound,
                Some("collection not found".to_string()),
                None,
            );
            json_error(status, body)
        }
        Err(e) => {
            let (status, body) = error_response(
                ErrorCode::DatabaseError,
                Some(format!("Failed to get collection: {e}")),
                None,
            );
            json_error(status, body)
        }
    }
}

pub async fn create_collection(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Json(req): Json<CreateCollectionRequest>,
) -> impl IntoResponse {
    if req.name.trim().is_empty() {
        let (status, body) = error_response(
            ErrorCode::InvalidField,
            Some("name is required".to_string()),
            None,
        );
        return json_error(status, body);
    }
    let product_ids = match normalize_product_ids(req.product_ids) {
        Ok(value) => value,
        Err(message) => {
            let (status, body) = error_response(ErrorCode::InvalidField, Some(message), None);
            return json_error(status, body);
        }
    };

    let now = Utc::now();
    let collection = Collection {
        id: req.id.unwrap_or_else(|| uuid::Uuid::new_v4().to_string()),
        tenant_id: tenant.tenant_id,
        name: req.name.trim().to_string(),
        description: req.description,
        product_ids,
        active: req.active,
        created_at: now,
        updated_at: now,
    };

    match state.store.create_collection(collection.clone()).await {
        Ok(()) => json_ok(collection),
        Err(e) => {
            let (status, body) = error_response(
                ErrorCode::DatabaseError,
                Some(format!("Failed to create collection: {e}")),
                None,
            );
            json_error(status, body)
        }
    }
}

pub async fn update_collection(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Path(id): Path<String>,
    Json(req): Json<UpdateCollectionRequest>,
) -> impl IntoResponse {
    if req.name.trim().is_empty() {
        let (status, body) = error_response(
            ErrorCode::InvalidField,
            Some("name is required".to_string()),
            None,
        );
        return json_error(status, body);
    }
    let product_ids = match normalize_product_ids(req.product_ids) {
        Ok(value) => value,
        Err(message) => {
            let (status, body) = error_response(ErrorCode::InvalidField, Some(message), None);
            return json_error(status, body);
        }
    };

    let existing = match state.store.get_collection(&tenant.tenant_id, &id).await {
        Ok(Some(collection)) => collection,
        Ok(None) => {
            let (status, body) = error_response(
                ErrorCode::ResourceNotFound,
                Some("collection not found".to_string()),
                None,
            );
            return json_error(status, body);
        }
        Err(e) => {
            let (status, body) = error_response(
                ErrorCode::DatabaseError,
                Some(format!("Failed to load collection: {e}")),
                None,
            );
            return json_error(status, body);
        }
    };

    let updated = Collection {
        id: existing.id,
        tenant_id: existing.tenant_id,
        name: req.name.trim().to_string(),
        description: req.description,
        product_ids,
        active: req.active,
        created_at: existing.created_at,
        updated_at: Utc::now(),
    };

    match state.store.update_collection(updated.clone()).await {
        Ok(()) => json_ok(updated),
        Err(crate::storage::StorageError::NotFound) => {
            let (status, body) = error_response(
                ErrorCode::ResourceNotFound,
                Some("collection not found".to_string()),
                None,
            );
            json_error(status, body)
        }
        Err(e) => {
            let (status, body) = error_response(
                ErrorCode::DatabaseError,
                Some(format!("Failed to update collection: {e}")),
                None,
            );
            json_error(status, body)
        }
    }
}

pub async fn delete_collection(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Path(id): Path<String>,
) -> impl IntoResponse {
    match state.store.delete_collection(&tenant.tenant_id, &id).await {
        Ok(()) => json_ok(serde_json::json!({ "deleted": true })),
        Err(crate::storage::StorageError::NotFound) => {
            let (status, body) = error_response(
                ErrorCode::ResourceNotFound,
                Some("collection not found".to_string()),
                None,
            );
            json_error(status, body)
        }
        Err(e) => {
            let (status, body) = error_response(
                ErrorCode::DatabaseError,
                Some(format!("Failed to delete collection: {e}")),
                None,
            );
            json_error(status, body)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    use axum::http::StatusCode;
    use axum::response::IntoResponse;

    use crate::repositories::{InMemoryCouponRepository, InMemoryProductRepository};
    use crate::storage::{InMemoryStore, Store};

    #[tokio::test]
    async fn test_create_collection_persists() {
        let store = Arc::new(InMemoryStore::new());
        let state = Arc::new(AdminState {
            store: store.clone(),
            product_repo: Arc::new(InMemoryProductRepository::new(Vec::new())),
            coupon_repo: Arc::new(InMemoryCouponRepository::new(Vec::new())),
            stripe_client: None,
        });

        let tenant = TenantContext::default();
        let request = CreateCollectionRequest {
            id: Some("col-1".to_string()),
            name: "Featured".to_string(),
            description: None,
            product_ids: vec!["prod-1".to_string(), "prod-2".to_string()],
            active: true,
        };

        let response = create_collection(State(state), tenant.clone(), Json(request))
            .await
            .into_response();
        assert_eq!(response.status(), StatusCode::OK);

        let stored = store
            .get_collection(&tenant.tenant_id, "col-1")
            .await
            .unwrap()
            .expect("collection stored");
        assert_eq!(stored.product_ids.len(), 2);
    }

    #[tokio::test]
    async fn test_create_collection_rejects_empty_name() {
        let store = Arc::new(InMemoryStore::new());
        let state = Arc::new(AdminState {
            store: store.clone(),
            product_repo: Arc::new(InMemoryProductRepository::new(Vec::new())),
            coupon_repo: Arc::new(InMemoryCouponRepository::new(Vec::new())),
            stripe_client: None,
        });

        let tenant = TenantContext::default();
        let request = CreateCollectionRequest {
            id: None,
            name: "  ".to_string(),
            description: None,
            product_ids: vec![],
            active: true,
        };

        let response = create_collection(State(state), tenant, Json(request))
            .await
            .into_response();
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    }
}
