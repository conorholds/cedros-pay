//! Admin gift card handlers

use std::collections::HashMap;
use std::sync::Arc;

use axum::{
    extract::{Path, Query, State},
    response::IntoResponse,
    Json,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::errors::{error_response, ErrorCode};
use crate::handlers::admin::AdminState;
use crate::handlers::response::{json_error, json_ok};
use crate::middleware::TenantContext;
use crate::models::GiftCard;

const MAX_LIST_LIMIT: i32 = 1000;
const DEFAULT_LIST_LIMIT: i32 = 50;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListGiftCardsQuery {
    pub active_only: Option<bool>,
    pub limit: Option<i32>,
    pub offset: Option<i32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateGiftCardRequest {
    pub code: Option<String>,
    pub initial_balance: i64,
    pub balance: Option<i64>,
    pub currency: String,
    #[serde(default = "default_active")]
    pub active: bool,
    pub expires_at: Option<DateTime<Utc>>,
    #[serde(default)]
    pub metadata: HashMap<String, String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateGiftCardRequest {
    pub initial_balance: i64,
    pub balance: i64,
    pub currency: String,
    #[serde(default = "default_active")]
    pub active: bool,
    pub expires_at: Option<DateTime<Utc>>,
    #[serde(default)]
    pub metadata: HashMap<String, String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AdjustGiftCardBalanceRequest {
    pub new_balance: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListGiftCardsResponse {
    pub gift_cards: Vec<GiftCard>,
}

fn default_active() -> bool {
    true
}

fn cap_limit(limit: Option<i32>) -> i32 {
    limit.unwrap_or(DEFAULT_LIST_LIMIT).clamp(1, MAX_LIST_LIMIT)
}

fn normalize_code(value: Option<String>) -> Result<String, String> {
    match value {
        Some(code) => {
            let trimmed = code.trim();
            if trimmed.is_empty() {
                return Err("code is required".to_string());
            }
            Ok(trimmed.to_uppercase())
        }
        None => Ok(uuid::Uuid::new_v4().to_string().to_uppercase()),
    }
}

fn validate_currency(currency: &str) -> Result<String, String> {
    let trimmed = currency.trim();
    if trimmed.len() != 3 {
        return Err("currency must be 3-letter code".to_string());
    }
    Ok(trimmed.to_uppercase())
}

fn validate_balance(value: i64) -> Result<(), String> {
    if value < 0 {
        return Err("balance must be non-negative".to_string());
    }
    Ok(())
}

pub async fn list_gift_cards(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Query(params): Query<ListGiftCardsQuery>,
) -> impl IntoResponse {
    let limit = cap_limit(params.limit);
    let offset = params.offset.unwrap_or(0).max(0);
    match state
        .store
        .list_gift_cards(&tenant.tenant_id, params.active_only, limit, offset)
        .await
    {
        Ok(gift_cards) => json_ok(ListGiftCardsResponse { gift_cards }),
        Err(e) => {
            let (status, body) = error_response(
                ErrorCode::DatabaseError,
                Some(format!("Failed to list gift cards: {e}")),
                None,
            );
            json_error(status, body)
        }
    }
}

pub async fn get_gift_card(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Path(code): Path<String>,
) -> impl IntoResponse {
    let code = code.trim().to_uppercase();
    match state.store.get_gift_card(&tenant.tenant_id, &code).await {
        Ok(Some(card)) => json_ok(card),
        Ok(None) => {
            let (status, body) = error_response(
                ErrorCode::ResourceNotFound,
                Some("gift card not found".to_string()),
                None,
            );
            json_error(status, body)
        }
        Err(e) => {
            let (status, body) = error_response(
                ErrorCode::DatabaseError,
                Some(format!("Failed to get gift card: {e}")),
                None,
            );
            json_error(status, body)
        }
    }
}

pub async fn create_gift_card(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Json(req): Json<CreateGiftCardRequest>,
) -> impl IntoResponse {
    let code = match normalize_code(req.code) {
        Ok(value) => value,
        Err(message) => {
            let (status, body) = error_response(ErrorCode::InvalidField, Some(message), None);
            return json_error(status, body);
        }
    };
    if let Err(message) = validate_balance(req.initial_balance) {
        let (status, body) = error_response(ErrorCode::InvalidField, Some(message), None);
        return json_error(status, body);
    }
    let balance = req.balance.unwrap_or(req.initial_balance);
    if let Err(message) = validate_balance(balance) {
        let (status, body) = error_response(ErrorCode::InvalidField, Some(message), None);
        return json_error(status, body);
    }
    let currency = match validate_currency(&req.currency) {
        Ok(value) => value,
        Err(message) => {
            let (status, body) = error_response(ErrorCode::InvalidField, Some(message), None);
            return json_error(status, body);
        }
    };

    let now = Utc::now();
    let card = GiftCard {
        code,
        tenant_id: tenant.tenant_id,
        initial_balance: req.initial_balance,
        balance,
        currency,
        active: req.active,
        expires_at: req.expires_at,
        metadata: req.metadata,
        created_at: now,
        updated_at: now,
    };

    match state.store.create_gift_card(card.clone()).await {
        Ok(()) => json_ok(card),
        Err(e) => {
            let (status, body) = error_response(
                ErrorCode::DatabaseError,
                Some(format!("Failed to create gift card: {e}")),
                None,
            );
            json_error(status, body)
        }
    }
}

pub async fn update_gift_card(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Path(code): Path<String>,
    Json(req): Json<UpdateGiftCardRequest>,
) -> impl IntoResponse {
    let code = code.trim().to_uppercase();
    if let Err(message) = validate_balance(req.initial_balance) {
        let (status, body) = error_response(ErrorCode::InvalidField, Some(message), None);
        return json_error(status, body);
    }
    if let Err(message) = validate_balance(req.balance) {
        let (status, body) = error_response(ErrorCode::InvalidField, Some(message), None);
        return json_error(status, body);
    }
    let currency = match validate_currency(&req.currency) {
        Ok(value) => value,
        Err(message) => {
            let (status, body) = error_response(ErrorCode::InvalidField, Some(message), None);
            return json_error(status, body);
        }
    };

    let existing = match state.store.get_gift_card(&tenant.tenant_id, &code).await {
        Ok(Some(card)) => card,
        Ok(None) => {
            let (status, body) = error_response(
                ErrorCode::ResourceNotFound,
                Some("gift card not found".to_string()),
                None,
            );
            return json_error(status, body);
        }
        Err(e) => {
            let (status, body) = error_response(
                ErrorCode::DatabaseError,
                Some(format!("Failed to load gift card: {e}")),
                None,
            );
            return json_error(status, body);
        }
    };

    let updated = GiftCard {
        code: existing.code,
        tenant_id: existing.tenant_id,
        initial_balance: req.initial_balance,
        balance: req.balance,
        currency,
        active: req.active,
        expires_at: req.expires_at,
        metadata: req.metadata,
        created_at: existing.created_at,
        updated_at: Utc::now(),
    };

    match state.store.update_gift_card(updated.clone()).await {
        Ok(()) => json_ok(updated),
        Err(crate::storage::StorageError::NotFound) => {
            let (status, body) = error_response(
                ErrorCode::ResourceNotFound,
                Some("gift card not found".to_string()),
                None,
            );
            json_error(status, body)
        }
        Err(e) => {
            let (status, body) = error_response(
                ErrorCode::DatabaseError,
                Some(format!("Failed to update gift card: {e}")),
                None,
            );
            json_error(status, body)
        }
    }
}

pub async fn adjust_gift_card_balance(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Path(code): Path<String>,
    Json(req): Json<AdjustGiftCardBalanceRequest>,
) -> impl IntoResponse {
    if let Err(message) = validate_balance(req.new_balance) {
        let (status, body) = error_response(ErrorCode::InvalidField, Some(message), None);
        return json_error(status, body);
    }
    let code = code.trim().to_uppercase();
    let now = Utc::now();
    match state
        .store
        .adjust_gift_card_balance(&tenant.tenant_id, &code, req.new_balance, now)
        .await
    {
        Ok(()) => match state.store.get_gift_card(&tenant.tenant_id, &code).await {
            Ok(Some(card)) => json_ok(card),
            Ok(None) => {
                let (status, body) = error_response(
                    ErrorCode::ResourceNotFound,
                    Some("gift card not found".to_string()),
                    None,
                );
                json_error(status, body)
            }
            Err(e) => {
                let (status, body) = error_response(
                    ErrorCode::DatabaseError,
                    Some(format!("Failed to load gift card: {e}")),
                    None,
                );
                json_error(status, body)
            }
        },
        Err(crate::storage::StorageError::NotFound) => {
            let (status, body) = error_response(
                ErrorCode::ResourceNotFound,
                Some("gift card not found".to_string()),
                None,
            );
            json_error(status, body)
        }
        Err(e) => {
            let (status, body) = error_response(
                ErrorCode::DatabaseError,
                Some(format!("Failed to adjust gift card: {e}")),
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
    async fn test_create_gift_card_persists() {
        let store = Arc::new(InMemoryStore::new());
        let state = Arc::new(AdminState {
            store: store.clone(),
            product_repo: Arc::new(InMemoryProductRepository::new(Vec::new())),
            coupon_repo: Arc::new(InMemoryCouponRepository::new(Vec::new())),
            stripe_client: None,
        });

        let tenant = TenantContext::default();
        let request = CreateGiftCardRequest {
            code: Some("gift-1".to_string()),
            initial_balance: 5000,
            balance: None,
            currency: "usd".to_string(),
            active: true,
            expires_at: None,
            metadata: HashMap::new(),
        };

        let response = create_gift_card(State(state), tenant.clone(), Json(request))
            .await
            .into_response();
        assert_eq!(response.status(), StatusCode::OK);

        let stored = store
            .get_gift_card(&tenant.tenant_id, "GIFT-1")
            .await
            .unwrap()
            .expect("gift card stored");
        assert_eq!(stored.currency, "USD");
        assert_eq!(stored.balance, 5000);
    }

    #[tokio::test]
    async fn test_create_gift_card_rejects_negative_balance() {
        let store = Arc::new(InMemoryStore::new());
        let state = Arc::new(AdminState {
            store: store.clone(),
            product_repo: Arc::new(InMemoryProductRepository::new(Vec::new())),
            coupon_repo: Arc::new(InMemoryCouponRepository::new(Vec::new())),
            stripe_client: None,
        });

        let tenant = TenantContext::default();
        let request = CreateGiftCardRequest {
            code: None,
            initial_balance: -5,
            balance: None,
            currency: "usd".to_string(),
            active: true,
            expires_at: None,
            metadata: HashMap::new(),
        };

        let response = create_gift_card(State(state), tenant, Json(request))
            .await
            .into_response();
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    }
}
