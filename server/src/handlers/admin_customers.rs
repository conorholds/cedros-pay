//! Admin customer handlers

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
use crate::models::{Customer, CustomerAddress};

use super::cap_limit_opt;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListQuery {
    pub limit: Option<i32>,
    pub offset: Option<i32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateCustomerRequest {
    pub id: Option<String>,
    pub email: String,
    pub name: Option<String>,
    pub phone: Option<String>,
    #[serde(default)]
    pub addresses: Vec<CustomerAddress>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCustomerRequest {
    pub email: String,
    pub name: Option<String>,
    pub phone: Option<String>,
    #[serde(default)]
    pub addresses: Vec<CustomerAddress>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListCustomersResponse {
    pub customers: Vec<Customer>,
}

fn validate_email(email: &str) -> Result<(), String> {
    let trimmed = email.trim();
    if trimmed.is_empty() {
        return Err("email is required".to_string());
    }
    if !trimmed.contains('@') {
        return Err("email must contain '@'".to_string());
    }
    Ok(())
}

pub async fn list_customers(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Query(params): Query<ListQuery>,
) -> impl IntoResponse {
    let limit = cap_limit_opt(params.limit, 50);
    let offset = params.offset.unwrap_or(0).max(0);
    match state
        .store
        .list_customers(&tenant.tenant_id, limit, offset)
        .await
    {
        Ok(customers) => json_ok(ListCustomersResponse { customers }),
        Err(e) => {
            let (status, body) = error_response(
                ErrorCode::DatabaseError,
                Some(format!("Failed to list customers: {e}")),
                None,
            );
            json_error(status, body)
        }
    }
}

pub async fn get_customer(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Path(id): Path<String>,
) -> impl IntoResponse {
    match state.store.get_customer(&tenant.tenant_id, &id).await {
        Ok(Some(customer)) => json_ok(customer),
        Ok(None) => {
            let (status, body) = error_response(
                ErrorCode::ResourceNotFound,
                Some("customer not found".to_string()),
                None,
            );
            json_error(status, body)
        }
        Err(e) => {
            let (status, body) = error_response(
                ErrorCode::DatabaseError,
                Some(format!("Failed to get customer: {e}")),
                None,
            );
            json_error(status, body)
        }
    }
}

pub async fn create_customer(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Json(req): Json<CreateCustomerRequest>,
) -> impl IntoResponse {
    if let Err(message) = validate_email(&req.email) {
        let (status, body) = error_response(ErrorCode::InvalidField, Some(message), None);
        return json_error(status, body);
    }

    let now = Utc::now();
    let customer = Customer {
        id: req.id.unwrap_or_else(|| uuid::Uuid::new_v4().to_string()),
        tenant_id: tenant.tenant_id,
        email: req.email.trim().to_string(),
        name: req.name,
        phone: req.phone,
        addresses: req.addresses,
        created_at: now,
        updated_at: now,
    };

    match state.store.create_customer(customer.clone()).await {
        Ok(()) => json_ok(customer),
        Err(e) => {
            let (status, body) = error_response(
                ErrorCode::DatabaseError,
                Some(format!("Failed to create customer: {e}")),
                None,
            );
            json_error(status, body)
        }
    }
}

pub async fn update_customer(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Path(id): Path<String>,
    Json(req): Json<UpdateCustomerRequest>,
) -> impl IntoResponse {
    if let Err(message) = validate_email(&req.email) {
        let (status, body) = error_response(ErrorCode::InvalidField, Some(message), None);
        return json_error(status, body);
    }

    let existing = match state.store.get_customer(&tenant.tenant_id, &id).await {
        Ok(Some(customer)) => customer,
        Ok(None) => {
            let (status, body) = error_response(
                ErrorCode::ResourceNotFound,
                Some("customer not found".to_string()),
                None,
            );
            return json_error(status, body);
        }
        Err(e) => {
            let (status, body) = error_response(
                ErrorCode::DatabaseError,
                Some(format!("Failed to load customer: {e}")),
                None,
            );
            return json_error(status, body);
        }
    };

    let now = Utc::now();
    let updated = Customer {
        id: existing.id,
        tenant_id: existing.tenant_id,
        email: req.email.trim().to_string(),
        name: req.name,
        phone: req.phone,
        addresses: req.addresses,
        created_at: existing.created_at,
        updated_at: now,
    };

    match state.store.update_customer(updated.clone()).await {
        Ok(()) => json_ok(updated),
        Err(crate::storage::StorageError::NotFound) => {
            let (status, body) = error_response(
                ErrorCode::ResourceNotFound,
                Some("customer not found".to_string()),
                None,
            );
            json_error(status, body)
        }
        Err(e) => {
            let (status, body) = error_response(
                ErrorCode::DatabaseError,
                Some(format!("Failed to update customer: {e}")),
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
    async fn test_create_customer_persists() {
        let store = Arc::new(InMemoryStore::new());
        let state = Arc::new(AdminState {
            store: store.clone(),
            product_repo: Arc::new(InMemoryProductRepository::new(Vec::new())),
            coupon_repo: Arc::new(InMemoryCouponRepository::new(Vec::new())),
            stripe_client: None,
        });

        let tenant = TenantContext::default();
        let request = CreateCustomerRequest {
            id: Some("cust-1".to_string()),
            email: "buyer@example.com".to_string(),
            name: Some("Buyer".to_string()),
            phone: None,
            addresses: vec![],
        };

        let response = create_customer(State(state), tenant.clone(), Json(request))
            .await
            .into_response();
        assert_eq!(response.status(), StatusCode::OK);

        let stored = store
            .get_customer(&tenant.tenant_id, "cust-1")
            .await
            .unwrap()
            .expect("customer stored");
        assert_eq!(stored.email, "buyer@example.com");
    }

    #[tokio::test]
    async fn test_create_customer_rejects_invalid_email() {
        let store = Arc::new(InMemoryStore::new());
        let state = Arc::new(AdminState {
            store: store.clone(),
            product_repo: Arc::new(InMemoryProductRepository::new(Vec::new())),
            coupon_repo: Arc::new(InMemoryCouponRepository::new(Vec::new())),
            stripe_client: None,
        });

        let tenant = TenantContext::default();
        let request = CreateCustomerRequest {
            id: None,
            email: "invalid-email".to_string(),
            name: None,
            phone: None,
            addresses: vec![],
        };

        let response = create_customer(State(state), tenant.clone(), Json(request))
            .await
            .into_response();
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);

        let customers = store
            .list_customers(&tenant.tenant_id, 10, 0)
            .await
            .unwrap();
        assert!(customers.is_empty());
    }
}
