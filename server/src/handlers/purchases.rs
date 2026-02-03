use std::sync::Arc;

use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};

use crate::errors::{error_response, ErrorCode};
use crate::handlers::paywall::AppState;
use crate::middleware::tenant::TenantContext;
use crate::storage::Store;

#[derive(Debug, Deserialize)]
pub struct ListPurchasesQuery {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListPurchasesResponse {
    pub purchases: Vec<crate::storage::Purchase>,
}

/// GET /paywall/v1/purchases - List purchase history for the authenticated user.
pub async fn list_purchases<S: Store + 'static>(
    State(state): State<Arc<AppState<S>>>,
    tenant: TenantContext,
    headers: axum::http::HeaderMap,
    Query(query): Query<ListPurchasesQuery>,
) -> impl IntoResponse {
    let auth = headers
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .unwrap_or_default();

    let user_id = match state
        .paywall_service
        .extract_user_id_from_auth_header(auth)
        .await
    {
        Some(id) => id,
        None => {
            let (status, body) = error_response(
                ErrorCode::Unauthorized,
                Some("missing or invalid authorization".into()),
                None,
            );
            return (status, Json(body)).into_response();
        }
    };

    let limit = query.limit.unwrap_or(50).clamp(1, 500);
    let offset = query.offset.unwrap_or(0).max(0);

    match state
        .store
        .list_purchases_by_user_id(&tenant.tenant_id, &user_id, limit, offset)
        .await
    {
        Ok(purchases) => {
            (StatusCode::OK, Json(ListPurchasesResponse { purchases })).into_response()
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to list purchases");
            let (status, body) = error_response(ErrorCode::DatabaseError, None, None);
            (status, Json(body)).into_response()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    use axum::extract::Query;
    use axum::response::IntoResponse;

    use crate::repositories::{InMemoryCouponRepository, InMemoryProductRepository};
    use crate::storage::memory::InMemoryStore;
    use crate::webhooks::NoopNotifier;
    use crate::{Config, NoopVerifier};

    #[tokio::test]
    async fn test_list_purchases_requires_authorization() {
        let cfg = Config::default();
        let store = Arc::new(InMemoryStore::new());

        let paywall_service = Arc::new(crate::services::PaywallService::new(
            cfg,
            store.clone(),
            Arc::new(NoopVerifier),
            Arc::new(NoopNotifier),
            Arc::new(InMemoryProductRepository::new(Vec::new())),
            Arc::new(InMemoryCouponRepository::new(Vec::new())),
        ));

        let state = Arc::new(crate::handlers::paywall::AppState {
            store: store.clone(),
            paywall_service,
            product_repo: Arc::new(InMemoryProductRepository::new(Vec::new())),
            stripe_client: None,
            stripe_webhook_processor: None,
            admin_public_keys: Vec::new(),
            blockhash_cache: None,
        });

        let response = list_purchases::<InMemoryStore>(
            State(state),
            TenantContext::default(),
            axum::http::HeaderMap::new(),
            Query(ListPurchasesQuery {
                limit: None,
                offset: None,
            }),
        )
        .await
        .into_response();

        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }
}
