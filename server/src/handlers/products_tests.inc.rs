use super::*;

use async_trait::async_trait;
use http_body_util::BodyExt;
use std::sync::Arc;

use crate::models::{Coupon, PaymentMethod, Product};
use crate::repositories::{CouponRepositoryError, ProductRepositoryError};
use crate::storage::InMemoryStore;

#[test]
fn test_remaining_uses_clamps_at_zero() {
    assert_eq!(remaining_uses(Some(5), 7), Some(0));
}

#[test]
fn test_remaining_uses_subtracts_when_available() {
    assert_eq!(remaining_uses(Some(10), 3), Some(7));
}

#[derive(Clone)]
struct TestProductRepo {
    products: Vec<Product>,
}

#[async_trait]
impl ProductRepository for TestProductRepo {
    async fn get_product(&self, tenant_id: &str, id: &str) -> Result<Product, ProductRepositoryError> {
        self.products
            .iter()
            .find(|p| p.tenant_id == tenant_id && p.id == id)
            .cloned()
            .ok_or(ProductRepositoryError::NotFound)
    }

    async fn get_product_by_stripe_price_id(
        &self,
        _tenant_id: &str,
        _stripe_price_id: &str,
    ) -> Result<Product, ProductRepositoryError> {
        Err(ProductRepositoryError::NotFound)
    }

    async fn list_products(&self, tenant_id: &str) -> Result<Vec<Product>, ProductRepositoryError> {
        Ok(self
            .products
            .iter()
            .filter(|p| p.tenant_id == tenant_id && p.active)
            .cloned()
            .collect())
    }

    async fn list_products_paginated(
        &self,
        tenant_id: &str,
        limit: usize,
        offset: usize,
    ) -> Result<Vec<Product>, ProductRepositoryError> {
        if limit == 0 {
            return Ok(Vec::new());
        }

        let products: Vec<Product> = self
            .products
            .iter()
            .filter(|p| p.tenant_id == tenant_id && p.active)
            .cloned()
            .collect();

        if offset >= products.len() {
            return Ok(Vec::new());
        }

        let end = (offset + limit).min(products.len());
        Ok(products[offset..end].to_vec())
    }

    async fn list_all_products_paginated(
        &self,
        tenant_id: &str,
        limit: usize,
        offset: usize,
    ) -> Result<Vec<Product>, ProductRepositoryError> {
        if limit == 0 {
            return Ok(Vec::new());
        }

        let products: Vec<Product> = self
            .products
            .iter()
            .filter(|p| p.tenant_id == tenant_id)
            .cloned()
            .collect();

        if offset >= products.len() {
            return Ok(Vec::new());
        }

        let end = (offset + limit).min(products.len());
        Ok(products[offset..end].to_vec())
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

    async fn delete_product(&self, _tenant_id: &str, _id: &str) -> Result<(), ProductRepositoryError> {
        Ok(())
    }

    async fn close(&self) -> Result<(), ProductRepositoryError> {
        Ok(())
    }
}

struct EmptyCouponRepo;

#[async_trait]
impl CouponRepository for EmptyCouponRepo {
    async fn get_coupon(&self, _tenant_id: &str, _code: &str) -> Result<Coupon, CouponRepositoryError> {
        Err(CouponRepositoryError::NotFound)
    }

    async fn list_coupons(&self, _tenant_id: &str) -> Result<Vec<Coupon>, CouponRepositoryError> {
        Ok(Vec::new())
    }

    async fn get_auto_apply_coupons_for_payment(
        &self,
        _tenant_id: &str,
        _product_id: &str,
        _payment_method: &PaymentMethod,
    ) -> Result<Vec<Coupon>, CouponRepositoryError> {
        Ok(Vec::new())
    }

    async fn get_all_auto_apply_coupons_for_payment(
        &self,
        _tenant_id: &str,
        _payment_method: &PaymentMethod,
    ) -> Result<std::collections::HashMap<String, Vec<Coupon>>, CouponRepositoryError> {
        Ok(std::collections::HashMap::new())
    }

    async fn create_coupon(&self, _coupon: Coupon) -> Result<(), CouponRepositoryError> {
        Ok(())
    }

    async fn update_coupon(&self, _coupon: Coupon) -> Result<(), CouponRepositoryError> {
        Ok(())
    }

    async fn increment_usage(&self, _tenant_id: &str, _code: &str) -> Result<(), CouponRepositoryError> {
        Ok(())
    }

    async fn delete_coupon(&self, _tenant_id: &str, _code: &str) -> Result<(), CouponRepositoryError> {
        Ok(())
    }

    async fn close(&self) -> Result<(), CouponRepositoryError> {
        Ok(())
    }
}

fn build_state_with_store(
    products: Vec<Product>,
) -> (Arc<ProductsAppState>, Arc<InMemoryStore>) {
    let store = Arc::new(InMemoryStore::new());
    let state = Arc::new(ProductsAppState {
        store: store.clone(),
        product_repo: Arc::new(TestProductRepo { products }),
        coupon_repo: Arc::new(EmptyCouponRepo),
    });
    (state, store)
}

fn build_state(products: Vec<Product>) -> Arc<ProductsAppState> {
    build_state_with_store(products).0
}

fn product(id: &str) -> Product {
    Product {
        id: id.to_string(),
        tenant_id: "default".to_string(),
        description: format!("Product {id}"),
        active: true,
        ..Default::default()
    }
}

#[tokio::test]
async fn test_get_product_by_id_returns_product() {
    let state = build_state(vec![product("p1")]);

    let response = get_product(
        State(state),
        TenantContext::default(),
        Path("p1".to_string()),
    )
    .await
    .into_response();

    assert_eq!(response.status(), StatusCode::OK);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(json["id"], "p1");
}

#[tokio::test]
async fn test_get_product_by_slug_returns_product() {
    let mut p = product("p1");
    p.slug = Some("my-product".to_string());
    let state = build_state(vec![p]);

    let response = get_product_by_slug(
        State(state),
        TenantContext::default(),
        Path("my-product".to_string()),
    )
    .await
    .into_response();

    assert_eq!(response.status(), StatusCode::OK);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(json["slug"], "my-product");
}

#[tokio::test]
async fn test_list_products_pagination_limit_offset() {
    let state = build_state(vec![product("p1"), product("p2"), product("p3")]);

    let response = list_products(
        State(state),
        TenantContext::default(),
        Query(ListProductsQuery {
            limit: 1,
            offset: Some(1),
            collection_id: None,
        }),
    )
    .await
    .into_response();

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    let products = json["products"].as_array().unwrap();
    assert_eq!(products.len(), 1);
    assert_eq!(products[0]["id"], "p2");
}

#[tokio::test]
async fn test_list_products_pagination_offset_out_of_range() {
    let state = build_state(vec![product("p1"), product("p2")]);

    let response = list_products(
        State(state),
        TenantContext::default(),
        Query(ListProductsQuery {
            limit: 2,
            offset: Some(5),
            collection_id: None,
        }),
    )
    .await
    .into_response();

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    let products = json["products"].as_array().unwrap();
    assert!(products.is_empty());
}

#[tokio::test]
async fn test_list_products_default_limit_applied() {
    let products = (0..101).map(|i| product(&format!("p{i}"))).collect::<Vec<_>>();
    let state = build_state(products);

    let response = list_products(
        State(state),
        TenantContext::default(),
        Query(ListProductsQuery {
            limit: default_limit(),
            offset: None,
            collection_id: None,
        }),
    )
    .await
    .into_response();

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    let products = json["products"].as_array().unwrap();
    assert_eq!(products.len(), default_limit() as usize);
}

#[tokio::test]
async fn test_list_products_includes_image_url_and_amount_cents_fields() {
    let mut p = product("p1");
    p.title = Some("Title".to_string());
    p.images = vec![crate::models::ProductImage {
        url: "https://example.com/img.png".to_string(),
        alt: None,
    }];
    p.fiat_price = Some(crate::models::Money::new(
        crate::models::get_asset("USD").expect("USD"),
        123,
    ));
    p.compare_at_fiat_price = Some(crate::models::Money::new(
        crate::models::get_asset("USD").expect("USD"),
        200,
    ));

    let state = build_state(vec![p]);

    let response = list_products(
        State(state),
        TenantContext::default(),
        Query(ListProductsQuery {
            limit: 10,
            offset: None,
            collection_id: None,
        }),
    )
    .await
    .into_response();

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    let products = json["products"].as_array().unwrap();
    assert_eq!(products.len(), 1);
    assert_eq!(products[0]["imageUrl"], "https://example.com/img.png");
    assert_eq!(products[0]["fiatAmountCents"], 123);
    assert_eq!(products[0]["compareAtAmountCents"], 200);
}

#[tokio::test]
async fn test_list_products_filters_by_collection() {
    use crate::models::Collection;
    use chrono::Utc;

    let p1 = product("p1");
    let mut p2 = product("p2");
    p2.active = false;

    let (state, store) = build_state_with_store(vec![p1.clone(), p2.clone()]);
    let now = Utc::now();
    store
        .create_collection(Collection {
            id: "col-1".to_string(),
            tenant_id: "default".to_string(),
            name: "Featured".to_string(),
            description: None,
            product_ids: vec![p1.id.clone(), p2.id.clone()],
            active: true,
            created_at: now,
            updated_at: now,
        })
        .await
        .unwrap();

    let response = list_products(
        State(state),
        TenantContext::default(),
        Query(ListProductsQuery {
            limit: 10,
            offset: None,
            collection_id: Some("col-1".to_string()),
        }),
    )
    .await
    .into_response();

    assert_eq!(response.status(), StatusCode::OK);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    let products = json["products"].as_array().unwrap();
    assert_eq!(products.len(), 1);
    assert_eq!(products[0]["id"], "p1");
}

#[tokio::test]
async fn test_list_products_collection_pagination_skips_inactive() {
    use crate::models::Collection;
    use chrono::Utc;

    let mut p1 = product("p1");
    p1.active = true;
    let mut p2 = product("p2");
    p2.active = false;

    let (state, store) = build_state_with_store(vec![p1.clone(), p2.clone()]);
    let now = Utc::now();
    store
        .create_collection(Collection {
            id: "col-2".to_string(),
            tenant_id: "default".to_string(),
            name: "Featured".to_string(),
            description: None,
            product_ids: vec![p2.id.clone(), p1.id.clone()],
            active: true,
            created_at: now,
            updated_at: now,
        })
        .await
        .unwrap();

    let response = list_products(
        State(state),
        TenantContext::default(),
        Query(ListProductsQuery {
            limit: 1,
            offset: None,
            collection_id: Some("col-2".to_string()),
        }),
    )
    .await
    .into_response();

    assert_eq!(response.status(), StatusCode::OK);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    let products = json["products"].as_array().unwrap();
    assert_eq!(products.len(), 1);
    assert_eq!(products[0]["id"], "p1");
}

#[tokio::test]
async fn test_list_products_collection_not_found() {
    let state = build_state(vec![product("p1")]);

    let response = list_products(
        State(state),
        TenantContext::default(),
        Query(ListProductsQuery {
            limit: 10,
            offset: None,
            collection_id: Some("col-missing".to_string()),
        }),
    )
    .await
    .into_response();

    assert_eq!(response.status(), StatusCode::OK);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    let products = json["products"].as_array().unwrap();
    assert!(products.is_empty());
}
