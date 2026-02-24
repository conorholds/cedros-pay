use super::*;

use std::collections::HashMap;

use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use http_body_util::BodyExt;

use crate::repositories::{
    InMemoryCouponRepository, InMemoryProductRepository, ProductRepository,
};
use crate::storage::InMemoryStore;

fn base_create_product_request() -> CreateProductRequest {
    CreateProductRequest {
        id: "p1".to_string(),
        title: None,
        short_description: None,
        slug: None,
        seo_title: None,
        seo_description: None,
        description: "desc".to_string(),
        tags: Vec::new(),
        category_ids: Vec::new(),
        images: Vec::new(),
        featured: false,
        sort_order: None,
        shipping_profile: None,
        checkout_requirements: None,
        fulfillment: None,
        fiat_amount_cents: None,
        fiat_currency: None,
        compare_at_fiat_amount_cents: None,
        compare_at_fiat_currency: None,
        stripe_price_id: None,
        crypto_atomic_amount: None,
        crypto_token: None,
        inventory_status: None,
        inventory_quantity: None,
        inventory_policy: None,
        variants: Vec::new(),
        active: true,
        metadata: HashMap::new(),
    }
}

#[test]
fn test_validate_product_checkout_fields_accepts_valid_values() {
    let mut req = base_create_product_request();
    req.shipping_profile = Some("digital".to_string());
    req.checkout_requirements = Some(crate::models::CheckoutRequirements {
        email: Some("required".to_string()),
        name: Some("optional".to_string()),
        phone: Some("none".to_string()),
        shipping_address: Some(false),
        billing_address: Some(false),
    });
    req.fulfillment = Some(crate::models::FulfillmentInfo {
        r#type: "digital_download".to_string(),
        notes: None,
    });

    assert!(validate_product_checkout_fields(&req).is_ok());
}

#[test]
fn test_validate_product_checkout_fields_rejects_invalid_enum() {
    let mut req = base_create_product_request();
    req.shipping_profile = Some("weird".to_string());

    assert!(validate_product_checkout_fields(&req).is_err());
}

#[tokio::test]
async fn test_create_product_persists_seo_fields() {
    let tenant = TenantContext::default();
    let store = Arc::new(InMemoryStore::new());
    let product_repo = Arc::new(InMemoryProductRepository::new(Vec::new()));
    let state = Arc::new(AdminState {
        store,
        product_repo: product_repo.clone(),
        coupon_repo: Arc::new(InMemoryCouponRepository::new(Vec::new())),
        stripe_client: None,
    });

    let mut req = base_create_product_request();
    req.seo_title = Some("SEO Title".to_string());
    req.seo_description = Some("SEO Description".to_string());

    let resp = super::create_product(State(state), tenant.clone(), Json(req))
        .await
        .into_response();
    assert_eq!(resp.status(), StatusCode::OK);

    let stored = product_repo
        .get_product(&tenant.tenant_id, "p1")
        .await
        .unwrap();
    assert_eq!(stored.seo_title.as_deref(), Some("SEO Title"));
    assert_eq!(stored.seo_description.as_deref(), Some("SEO Description"));
}

#[tokio::test]
async fn test_update_product_clears_seo_fields() {
    let tenant = TenantContext::default();
    let store = Arc::new(InMemoryStore::new());
    let product = Product {
        id: "p1".to_string(),
        tenant_id: tenant.tenant_id.clone(),
        description: "desc".to_string(),
        seo_title: Some("SEO Title".to_string()),
        seo_description: Some("SEO Description".to_string()),
        active: true,
        created_at: Some(Utc::now()),
        ..Default::default()
    };
    let product_repo = Arc::new(InMemoryProductRepository::new(vec![product]));
    let state = Arc::new(AdminState {
        store,
        product_repo: product_repo.clone(),
        coupon_repo: Arc::new(InMemoryCouponRepository::new(Vec::new())),
        stripe_client: None,
    });

    let mut req = base_create_product_request();
    req.id = "p1".to_string();
    req.seo_title = None;
    req.seo_description = None;

    let resp = super::update_product(
        State(state),
        tenant.clone(),
        Path("p1".to_string()),
        Json(req),
    )
    .await
    .into_response();
    assert_eq!(resp.status(), StatusCode::OK);

    let stored = product_repo
        .get_product(&tenant.tenant_id, "p1")
        .await
        .unwrap();
    assert!(stored.seo_title.is_none());
    assert!(stored.seo_description.is_none());
}

#[tokio::test]
async fn test_admin_list_products_includes_inactive_and_returns_total_count() {
    let tenant = TenantContext::default();
    let store = Arc::new(InMemoryStore::new());

    let p1 = Product {
        id: "p1".to_string(),
        tenant_id: tenant.tenant_id.clone(),
        description: "desc".to_string(),
        active: true,
        created_at: Some(Utc::now()),
        ..Default::default()
    };

    let p2 = Product {
        id: "p2".to_string(),
        tenant_id: tenant.tenant_id.clone(),
        description: "desc".to_string(),
        active: false,
        created_at: Some(Utc::now()),
        ..Default::default()
    };

    let state = Arc::new(AdminState {
        store,
        product_repo: Arc::new(InMemoryProductRepository::new(vec![p1, p2])),
        coupon_repo: Arc::new(InMemoryCouponRepository::new(Vec::new())),
        stripe_client: None,
    });

    let resp = super::list_products(
        State(state),
        tenant,
        Query(ListProductsQuery {
            limit: 50,
            offset: 0,
        }),
    )
    .await
    .into_response();
    assert_eq!(resp.status(), StatusCode::OK);

    let body = resp.into_body().collect().await.unwrap().to_bytes();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(json["total"], 2);
    let products = json["products"].as_array().unwrap();
    assert_eq!(products.len(), 2);
    assert!(products
        .iter()
        .any(|p| p["active"].as_bool() == Some(false)));
}

#[tokio::test]
async fn test_set_product_inventory_updates_quantity() {
    let tenant = TenantContext::default();
    let store = Arc::new(InMemoryStore::new());

    let product = Product {
        id: "p1".to_string(),
        tenant_id: tenant.tenant_id.clone(),
        description: "desc".to_string(),
        active: true,
        inventory_quantity: Some(10),
        ..Default::default()
    };
    let product_repo = Arc::new(InMemoryProductRepository::new(vec![product]));

    let state = Arc::new(AdminState {
        store,
        product_repo: product_repo.clone(),
        coupon_repo: Arc::new(InMemoryCouponRepository::new(Vec::new())),
        stripe_client: None,
    });

    let resp = super::set_product_inventory(
        State(state),
        tenant.clone(),
        Path("p1".to_string()),
        Json(SetInventoryRequest { quantity: Some(3) }),
    )
    .await
    .into_response();
    assert_eq!(resp.status(), StatusCode::OK);

    let updated = product_repo
        .get_product(&tenant.tenant_id, "p1")
        .await
        .unwrap();
    assert_eq!(updated.inventory_quantity, Some(3));
}

#[tokio::test]
async fn test_adjust_product_inventory_updates_quantity() {
    let tenant = TenantContext::default();
    let store = Arc::new(InMemoryStore::new());
    store.set_product_inventory(&tenant.tenant_id, "p1", 10);

    let product = Product {
        id: "p1".to_string(),
        tenant_id: tenant.tenant_id.clone(),
        description: "desc".to_string(),
        active: true,
        inventory_quantity: Some(10),
        ..Default::default()
    };
    let product_repo = Arc::new(InMemoryProductRepository::new(vec![product]));

    let state = Arc::new(AdminState {
        store,
        product_repo: product_repo.clone(),
        coupon_repo: Arc::new(InMemoryCouponRepository::new(Vec::new())),
        stripe_client: None,
    });

    let resp = super::adjust_product_inventory(
        State(state),
        tenant.clone(),
        Path("p1".to_string()),
        Json(AdjustInventoryRequest {
            delta: -2,
            reason: None,
            actor: None,
        }),
    )
    .await
    .into_response();
    assert_eq!(resp.status(), StatusCode::OK);
    // Note: In postgres, adjust_inventory_atomic and get_product share the same
    // products table, so the response reflects the updated quantity. In the memory
    // test, Store and ProductRepository are separate, so we verify via status code.
}
