use std::sync::Arc;

use axum::{
    extract::{Path, Query, State},
    response::IntoResponse,
};
use serde::{Deserialize, Serialize};

use crate::constants::PRODUCTS_CACHE_MAX_AGE;
use crate::errors::{error_response, ErrorCode};
use crate::handlers::response::{json_error, json_ok_cached};
use crate::middleware::tenant::TenantContext;
use crate::storage::Store;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CollectionInfo {
    pub id: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub product_ids: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CollectionsResponse {
    pub collections: Vec<CollectionInfo>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListCollectionsQuery {
    #[serde(default = "default_limit")]
    pub limit: i32,
    #[serde(default)]
    pub offset: i32,
}

pub struct CollectionsAppState<S: Store> {
    pub store: Arc<S>,
}

const MAX_LIST_LIMIT: i32 = 1000;

fn default_limit() -> i32 {
    100
}

fn cap_limit(limit: i32) -> i32 {
    limit.clamp(1, MAX_LIST_LIMIT)
}

fn collection_to_info(c: &crate::models::Collection) -> CollectionInfo {
    CollectionInfo {
        id: c.id.clone(),
        name: c.name.clone(),
        description: c.description.clone(),
        product_ids: c.product_ids.clone(),
    }
}

/// GET /paywall/v1/collections - List active collections
pub async fn list_collections<S: Store + 'static>(
    State(state): State<Arc<CollectionsAppState<S>>>,
    tenant: TenantContext,
    Query(query): Query<ListCollectionsQuery>,
) -> impl IntoResponse {
    let limit = cap_limit(query.limit);
    let offset = query.offset.max(0);

    match state
        .store
        .list_collections(&tenant.tenant_id, Some(true), limit, offset)
        .await
    {
        Ok(collections) => {
            let resp = CollectionsResponse {
                collections: collections.iter().map(collection_to_info).collect(),
            };
            json_ok_cached(resp, PRODUCTS_CACHE_MAX_AGE).into_response()
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to list collections");
            let (status, body) = error_response(ErrorCode::InternalError, None, None);
            json_error(status, body).into_response()
        }
    }
}

/// GET /paywall/v1/collections/:id - Get active collection by ID
pub async fn get_collection<S: Store + 'static>(
    State(state): State<Arc<CollectionsAppState<S>>>,
    tenant: TenantContext,
    Path(id): Path<String>,
) -> impl IntoResponse {
    if let Err(e) = crate::errors::validation::validate_resource_id(&id) {
        let (status, body) = error_response(ErrorCode::InvalidResource, Some(e.message), None);
        return json_error(status, body).into_response();
    }

    match state.store.get_collection(&tenant.tenant_id, &id).await {
        Ok(Some(collection)) => {
            if !collection.active {
                let (status, body) = error_response(
                    ErrorCode::ResourceNotFound,
                    Some("collection not available".to_string()),
                    None,
                );
                return json_error(status, body).into_response();
            }
            json_ok_cached(collection_to_info(&collection), PRODUCTS_CACHE_MAX_AGE).into_response()
        }
        Ok(None) => {
            let (status, body) = error_response(
                ErrorCode::ResourceNotFound,
                Some("collection not found".to_string()),
                None,
            );
            json_error(status, body).into_response()
        }
        Err(e) => {
            tracing::error!(error = %e, collection_id = %id, "Failed to get collection");
            let (status, body) = error_response(ErrorCode::InternalError, None, None);
            json_error(status, body).into_response()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    use axum::extract::{Path, Query, State};
    use axum::http::StatusCode;
    use axum::response::IntoResponse;
    use chrono::Utc;
    use http_body_util::BodyExt;

    use crate::models::Collection;
    use crate::storage::InMemoryStore;

    #[tokio::test]
    async fn test_list_collections_returns_active_only() {
        let store = Arc::new(InMemoryStore::new());
        let now = Utc::now();

        store
            .create_collection(Collection {
                id: "c1".to_string(),
                tenant_id: "default".to_string(),
                name: "Active".to_string(),
                description: None,
                product_ids: vec!["p1".to_string()],
                active: true,
                created_at: now,
                updated_at: now,
            })
            .await
            .unwrap();

        store
            .create_collection(Collection {
                id: "c2".to_string(),
                tenant_id: "default".to_string(),
                name: "Inactive".to_string(),
                description: None,
                product_ids: vec![],
                active: false,
                created_at: now,
                updated_at: now,
            })
            .await
            .unwrap();

        let state = Arc::new(CollectionsAppState { store });
        let resp = list_collections(
            State(state),
            TenantContext::default(),
            Query(ListCollectionsQuery {
                limit: 50,
                offset: 0,
            }),
        )
        .await
        .into_response();

        assert_eq!(resp.status(), StatusCode::OK);
        let body = resp.into_body().collect().await.unwrap().to_bytes();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
        let collections = json["collections"].as_array().unwrap();
        assert_eq!(collections.len(), 1);
        assert_eq!(collections[0]["id"], "c1");
    }

    #[tokio::test]
    async fn test_get_collection_rejects_inactive() {
        let store = Arc::new(InMemoryStore::new());
        let now = Utc::now();

        store
            .create_collection(Collection {
                id: "c2".to_string(),
                tenant_id: "default".to_string(),
                name: "Inactive".to_string(),
                description: None,
                product_ids: vec![],
                active: false,
                created_at: now,
                updated_at: now,
            })
            .await
            .unwrap();

        let state = Arc::new(CollectionsAppState { store });
        let resp = get_collection(
            State(state),
            TenantContext::default(),
            Path("c2".to_string()),
        )
        .await
        .into_response();

        assert_eq!(resp.status(), StatusCode::NOT_FOUND);
    }
}
