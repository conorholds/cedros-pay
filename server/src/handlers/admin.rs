//! Admin dashboard handlers
//!
//! Provides admin endpoints for stats, products, transactions, coupons, and refunds
//! for the cedros-pay admin dashboard UI.
//!
//! Handler logic is split across sub-modules:
//! - [`super::admin_products`] – product CRUD
//! - [`super::admin_coupons`] – coupon CRUD
//! - [`super::admin_refunds`] – refunds and credits refund requests

use std::collections::HashMap;
use std::sync::Arc;

use axum::{
    extract::{Query, State},
    response::IntoResponse,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::errors::{error_response, ErrorCode};
use crate::handlers::response::{json_error, json_ok};
use crate::middleware::TenantContext;
use crate::models::{Product, ProductImage, ProductVariant};
use crate::repositories::{CouponRepository, ProductRepository};
use crate::storage::Store;

// Re-export moved handlers so the router in lib.rs keeps working unchanged.
pub use crate::handlers::admin_coupons::{
    create_coupon, delete_coupon, list_coupons, update_coupon,
};
pub use crate::handlers::admin_products::{
    adjust_product_inventory, create_product, delete_product, get_product, list_products,
    set_product_inventory, update_product,
};
pub use crate::handlers::admin_refunds::{
    list_credits_refund_requests, list_refunds, process_refund,
};

pub(crate) use super::cap_limit;

pub(crate) fn default_limit() -> i32 {
    20
}

// ============================================================================
// Shared State
// ============================================================================

/// Shared state for admin handlers
pub struct AdminState {
    pub store: Arc<dyn Store>,
    pub product_repo: Arc<dyn ProductRepository>,
    pub coupon_repo: Arc<dyn CouponRepository>,
    /// Optional Stripe client for auto-creating products/prices
    pub stripe_client: Option<Arc<crate::services::StripeClient>>,
}

// ============================================================================
// Shared product info type (used by 19+ files via `use crate::handlers::admin::AdminProductInfo`)
// ============================================================================

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminProductInfo {
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub short_description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub slug: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub seo_title: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub seo_description: Option<String>,
    pub description: String,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub tags: Vec<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub category_ids: Vec<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub images: Vec<ProductImage>,
    #[serde(default)]
    pub featured: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sort_order: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub shipping_profile: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub checkout_requirements: Option<crate::models::CheckoutRequirements>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fulfillment: Option<crate::models::FulfillmentInfo>,
    pub fiat_amount_cents: Option<i64>,
    pub fiat_currency: Option<String>,
    pub compare_at_fiat_amount_cents: Option<i64>,
    pub compare_at_fiat_currency: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stripe_product_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stripe_price_id: Option<String>,
    pub crypto_atomic_amount: Option<i64>,
    pub crypto_token: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub inventory_status: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub inventory_quantity: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub inventory_policy: Option<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub variants: Vec<ProductVariant>,
    pub active: bool,
    pub metadata: HashMap<String, String>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListProductsResponse {
    pub products: Vec<AdminProductInfo>,
    pub total: i64,
}

impl From<&Product> for AdminProductInfo {
    fn from(p: &Product) -> Self {
        AdminProductInfo {
            id: p.id.clone(),
            title: p.title.clone(),
            short_description: p.short_description.clone(),
            slug: p.slug.clone(),
            seo_title: p.seo_title.clone(),
            seo_description: p.seo_description.clone(),
            description: p.description.clone(),
            tags: p.tags.clone(),
            category_ids: p.category_ids.clone(),
            images: p.images.clone(),
            featured: p.featured,
            sort_order: p.sort_order,
            shipping_profile: p.shipping_profile.clone(),
            checkout_requirements: p.checkout_requirements.clone(),
            fulfillment: p.fulfillment.clone(),
            fiat_amount_cents: p.fiat_price.as_ref().map(|m| m.atomic),
            fiat_currency: p.fiat_price.as_ref().map(|m| m.asset.code.clone()),
            compare_at_fiat_amount_cents: p.compare_at_fiat_price.as_ref().map(|m| m.atomic),
            compare_at_fiat_currency: p
                .compare_at_fiat_price
                .as_ref()
                .map(|m| m.asset.code.clone()),
            stripe_product_id: p.stripe_product_id.clone(),
            stripe_price_id: p.stripe_price_id.clone(),
            crypto_atomic_amount: p.crypto_price.as_ref().map(|m| m.atomic),
            crypto_token: p.crypto_price.as_ref().map(|m| m.asset.code.clone()),
            inventory_status: p.inventory_status.clone(),
            inventory_quantity: p.inventory_quantity,
            inventory_policy: p.inventory_policy.clone(),
            variants: p.variants.clone(),
            active: p.active,
            metadata: p.metadata.clone(),
            created_at: p.created_at,
            updated_at: p.updated_at,
        }
    }
}

// ============================================================================
// Stats Endpoint
// ============================================================================

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StatsResponse {
    pub total_revenue: f64,
    pub total_transactions: i64,
    pub active_products: i64,
    pub pending_refunds: i64,
    pub revenue_by_method: HashMap<String, f64>,
    pub transactions_by_method: HashMap<String, i64>,
}

/// GET /api/admin/stats - Get dashboard stats overview
pub async fn get_stats(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
) -> impl IntoResponse {
    // Get stats from storage
    let stats = match state.store.get_admin_stats(&tenant.tenant_id).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!(error = %e, "Failed to get admin stats");
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some("Failed to get stats".to_string()),
                None,
            );
            return json_error(status, body).into_response();
        }
    };

    // Get active products count
    let active_products = match state.product_repo.list_products(&tenant.tenant_id).await {
        Ok(products) => products.iter().filter(|p| p.active).count() as i64,
        Err(e) => {
            tracing::error!(error = %e, "Failed to get active products count");
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some("Failed to get stats".to_string()),
                None,
            );
            return json_error(status, body).into_response();
        }
    };

    // Get pending refunds count
    let pending_refunds = match state
        .store
        .list_pending_refunds(&tenant.tenant_id, 1000)
        .await
    {
        Ok(refunds) => refunds.len() as i64,
        Err(e) => {
            tracing::error!(error = %e, "Failed to get pending refunds count");
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some("Failed to get stats".to_string()),
                None,
            );
            return json_error(status, body).into_response();
        }
    };

    let response = StatsResponse {
        total_revenue: stats.total_revenue,
        total_transactions: stats.total_transactions,
        active_products,
        pending_refunds,
        revenue_by_method: stats.revenue_by_method,
        transactions_by_method: stats.transactions_by_method,
    };

    json_ok(response).into_response()
}

// ============================================================================
// Transactions
// ============================================================================

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListTransactionsQuery {
    #[serde(default = "default_limit")]
    pub limit: i32,
    #[serde(default)]
    pub offset: i32,
    pub method: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TransactionInfo {
    pub id: String,
    pub resource_id: String,
    pub method: String,
    pub amount: f64,
    pub currency: String,
    pub status: String,
    pub paid_at: DateTime<Utc>,
    pub wallet: Option<String>,
    pub user_id: Option<String>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListTransactionsResponse {
    pub transactions: Vec<TransactionInfo>,
    /// Number of transactions in this page (not a global total count).
    pub count: i64,
}

/// GET /api/admin/transactions - List transactions
pub async fn list_transactions(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Query(query): Query<ListTransactionsQuery>,
) -> impl IntoResponse {
    let limit = cap_limit(query.limit);
    let offset = query.offset.max(0);

    match state
        .store
        .list_purchases(&tenant.tenant_id, query.method.as_deref(), limit, offset)
        .await
    {
        Ok(purchases) => {
            let transactions: Vec<TransactionInfo> = purchases
                .iter()
                .map(|p| {
                    let (amount, currency, method) = parse_purchase_amount(&p.amount);
                    TransactionInfo {
                        id: p.signature.clone(),
                        resource_id: p.resource_id.clone(),
                        method,
                        amount,
                        currency,
                        status: "completed".to_string(),
                        paid_at: p.paid_at,
                        wallet: p.wallet.clone(),
                        user_id: p.user_id.clone(),
                        metadata: p.metadata.clone(),
                    }
                })
                .collect();

            let response = ListTransactionsResponse {
                count: transactions.len() as i64,
                transactions,
            };
            json_ok(response).into_response()
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to list transactions");
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some("Failed to list transactions".to_string()),
                None,
            );
            json_error(status, body).into_response()
        }
    }
}

fn parse_purchase_amount(amount_str: &str) -> (f64, String, String) {
    // Amount format is typically "1000000 USDC" or similar
    let parts: Vec<&str> = amount_str.split_whitespace().collect();
    if parts.len() >= 2 {
        let amount = parts[0].parse::<f64>().unwrap_or(0.0);
        let currency = parts[1].to_string();
        let method = if currency == "USD" {
            "stripe".to_string()
        } else {
            "x402".to_string()
        };
        (amount, currency, method)
    } else {
        (0.0, "USDC".to_string(), "x402".to_string())
    }
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    use std::sync::Arc;

    use axum::extract::State;
    use axum::http::StatusCode;
    use axum::response::IntoResponse;

    use async_trait::async_trait;

    use crate::models::Product;
    use crate::repositories::{
        InMemoryCouponRepository, ProductRepository, ProductRepositoryError,
    };
    use crate::storage::InMemoryStore;

    struct FailingListProductsRepo;

    #[async_trait]
    impl ProductRepository for FailingListProductsRepo {
        async fn get_product(
            &self,
            _tenant_id: &str,
            _id: &str,
        ) -> Result<Product, ProductRepositoryError> {
            Err(ProductRepositoryError::NotFound)
        }

        async fn get_product_by_stripe_price_id(
            &self,
            _tenant_id: &str,
            _stripe_price_id: &str,
        ) -> Result<Product, ProductRepositoryError> {
            Err(ProductRepositoryError::NotFound)
        }

        async fn list_products(
            &self,
            _tenant_id: &str,
        ) -> Result<Vec<Product>, ProductRepositoryError> {
            Err(ProductRepositoryError::Storage(
                "injected list_products failure".to_string(),
            ))
        }

        async fn list_products_paginated(
            &self,
            _tenant_id: &str,
            _limit: usize,
            _offset: usize,
        ) -> Result<Vec<Product>, ProductRepositoryError> {
            Ok(Vec::new())
        }

        async fn list_all_products_paginated(
            &self,
            _tenant_id: &str,
            _limit: usize,
            _offset: usize,
        ) -> Result<Vec<Product>, ProductRepositoryError> {
            Ok(Vec::new())
        }

        async fn create_product(&self, _product: Product) -> Result<(), ProductRepositoryError> {
            Ok(())
        }

        async fn update_product(&self, _product: Product) -> Result<(), ProductRepositoryError> {
            Ok(())
        }

        async fn decrement_inventory_atomic(
            &self,
            _tenant_id: &str,
            _product_id: &str,
            _quantity: i32,
            _allow_backorder: bool,
        ) -> Result<Option<(i32, i32)>, ProductRepositoryError> {
            Ok(None)
        }

        async fn delete_product(
            &self,
            _tenant_id: &str,
            _id: &str,
        ) -> Result<(), ProductRepositoryError> {
            Ok(())
        }

        async fn close(&self) -> Result<(), ProductRepositoryError> {
            Ok(())
        }
    }

    #[test]
    fn test_cap_limit() {
        assert_eq!(cap_limit(0), 1);
        assert_eq!(cap_limit(-5), 1);
        assert_eq!(cap_limit(50), 50);
        assert_eq!(cap_limit(1500), 1000);
    }

    #[test]
    fn test_parse_purchase_amount() {
        let (amount, currency, method) = parse_purchase_amount("1000000 USDC");
        assert_eq!(amount, 1000000.0);
        assert_eq!(currency, "USDC");
        assert_eq!(method, "x402");

        let (amount, currency, method) = parse_purchase_amount("500 USD");
        assert_eq!(amount, 500.0);
        assert_eq!(currency, "USD");
        assert_eq!(method, "stripe");
    }

    #[tokio::test]
    async fn test_get_stats_returns_error_when_product_lookup_fails() {
        let state = Arc::new(AdminState {
            store: Arc::new(InMemoryStore::new()),
            product_repo: Arc::new(FailingListProductsRepo),
            coupon_repo: Arc::new(InMemoryCouponRepository::new(Vec::new())),
            stripe_client: None,
        });

        let tenant = TenantContext::default();
        let response = super::get_stats(State(state), tenant).await.into_response();
        assert_eq!(response.status(), StatusCode::INTERNAL_SERVER_ERROR);
    }
}
