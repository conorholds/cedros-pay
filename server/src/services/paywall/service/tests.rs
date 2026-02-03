use super::*;
use crate::constants::{PAYMENT_CALLBACK_TIMEOUT, X402_SCHEME_SPL, X402_VERSION};
use crate::models::{
    get_asset, Coupon, GiftCard, PaymentProof, PaymentTransaction, Product, VerificationResult,
};
use crate::repositories::{InMemoryCouponRepository, InMemoryProductRepository};
use crate::storage::InMemoryStore;
use crate::webhooks::NoopNotifier;
use crate::x402::{Verifier, VerifierError};
use crate::NoopVerifier;
use async_trait::async_trait;
use chrono::Utc;
use parking_lot::Mutex;
use serde_json::json;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;

fn build_service(cart_ttl: Duration, refund_ttl: Duration) -> (PaywallService, Arc<InMemoryStore>) {
    let mut config = Config::default();
    config.storage.cart_quote_ttl = cart_ttl;
    config.storage.refund_quote_ttl = refund_ttl;

    let store = Arc::new(InMemoryStore::new());
    let asset = get_asset("USDC").expect("asset should be registered");
    let product = Product {
        id: "product-1".to_string(),
        tenant_id: "tenant-1".to_string(),
        crypto_price: Some(Money::new(asset, 100)),
        active: true,
        ..Product::default()
    };

    let product_repo = Arc::new(InMemoryProductRepository::new(vec![product]));
    let coupon_repo = Arc::new(InMemoryCouponRepository::new(Vec::new()));

    let service = PaywallService::new(
        config,
        store.clone(),
        Arc::new(NoopVerifier),
        Arc::new(NoopNotifier),
        product_repo,
        coupon_repo,
    );

    (service, store)
}

#[derive(Default, Clone)]
struct TestPaymentCallback {
    payments: Arc<Mutex<u32>>,
}

#[async_trait::async_trait]
impl crate::PaymentCallback for TestPaymentCallback {
    async fn on_payment_success(&self, _event: &PaymentEvent) -> Result<(), crate::PaymentCallbackError> {
        *self.payments.lock() += 1;
        Ok(())
    }
}

#[derive(Clone)]
struct SlowPaymentCallback {
    delay: Duration,
}

impl SlowPaymentCallback {
    fn new(delay: Duration) -> Self {
        Self { delay }
    }
}

#[async_trait::async_trait]
impl crate::PaymentCallback for SlowPaymentCallback {
    async fn on_payment_success(&self, _event: &PaymentEvent) -> Result<(), crate::PaymentCallbackError> {
        tokio::time::sleep(self.delay).await;
        Ok(())
    }
}

#[derive(Clone)]
struct FixedVerifier {
    result: VerificationResult,
}

#[async_trait]
impl Verifier for FixedVerifier {
    async fn verify(
        &self,
        _proof: crate::models::PaymentProof,
        _requirement: Requirement,
    ) -> Result<VerificationResult, VerifierError> {
        Ok(self.result.clone())
    }
}

#[tokio::test]
async fn test_cart_quote_uses_storage_ttl() {
    let (service, _store) = build_service(Duration::from_secs(123), Duration::from_secs(60));

    let quote = service
        .generate_cart_quote("tenant-1", vec![("product-1".to_string(), 1)], None)
        .await
        .unwrap();

    let ttl = quote.expires_at - quote.created_at;
    assert_eq!(ttl.num_seconds(), 123);
}

#[tokio::test]
async fn test_payment_callback_times_out() {
    let (service, _store) = build_service(Duration::from_secs(60), Duration::from_secs(60));
    let callback = Arc::new(SlowPaymentCallback::new(
        PAYMENT_CALLBACK_TIMEOUT + Duration::from_millis(50),
    ));
    let service = service.with_payment_callback(callback);
    let event = PaymentEvent::default();

    let result = tokio::time::timeout(
        PAYMENT_CALLBACK_TIMEOUT + Duration::from_millis(200),
        service.call_payment_callback(&event),
    )
    .await;

    assert!(result.is_ok());
}

#[tokio::test]
async fn test_cart_quote_store_failure_returns_error() {
    let (service, store) = build_service(Duration::from_secs(60), Duration::from_secs(60));
    store.set_fail_store_cart_quote(true);

    let result = service
        .generate_cart_quote("tenant-1", vec![("product-1".to_string(), 1)], None)
        .await;
    assert!(result.is_err());
}

#[tokio::test]
async fn test_cart_quote_reservation_failure_releases_reservations() {
    let mut config = Config::default();
    config.storage.cart_quote_ttl = Duration::from_secs(60);
    config.storage.refund_quote_ttl = Duration::from_secs(60);

    let store = Arc::new(InMemoryStore::new());
    store.set_fail_reserve_inventory(true);
    let asset = get_asset("USDC").expect("asset should be registered");
    let product = Product {
        id: "product-1".to_string(),
        tenant_id: "tenant-1".to_string(),
        crypto_price: Some(Money::new(asset, 100)),
        inventory_quantity: Some(2),
        active: true,
        ..Product::default()
    };

    let product_repo = Arc::new(InMemoryProductRepository::new(vec![product]));
    let coupon_repo = Arc::new(InMemoryCouponRepository::new(Vec::new()));

    let service = PaywallService::new(
        config,
        store.clone(),
        Arc::new(NoopVerifier),
        Arc::new(NoopNotifier),
        product_repo,
        coupon_repo,
    );

    let result = service
        .generate_cart_quote("tenant-1", vec![("product-1".to_string(), 1)], None)
        .await;
    assert!(result.is_err());
    assert_eq!(store.release_inventory_call_count(), 1);
}

#[tokio::test]
async fn test_cart_quote_respects_active_reservations() {
    let mut config = Config::default();
    config.storage.cart_quote_ttl = Duration::from_secs(60);
    config.storage.refund_quote_ttl = Duration::from_secs(60);

    let store = Arc::new(InMemoryStore::new());
    let asset = get_asset("USDC").expect("asset should be registered");
    let product = Product {
        id: "product-1".to_string(),
        tenant_id: "tenant-1".to_string(),
        crypto_price: Some(Money::new(asset, 100)),
        inventory_quantity: Some(1),
        active: true,
        ..Product::default()
    };

    let product_repo = Arc::new(InMemoryProductRepository::new(vec![product]));
    let coupon_repo = Arc::new(InMemoryCouponRepository::new(Vec::new()));

    let service = PaywallService::new(
        config,
        store.clone(),
        Arc::new(NoopVerifier),
        Arc::new(NoopNotifier),
        product_repo,
        coupon_repo,
    );

    let reservation = crate::models::InventoryReservation {
        id: "resv-1".to_string(),
        tenant_id: "tenant-1".to_string(),
        product_id: "product-1".to_string(),
        variant_id: None,
        quantity: 1,
        expires_at: Utc::now() + chrono::Duration::minutes(10),
        cart_id: Some("cart-existing".to_string()),
        status: "active".to_string(),
        created_at: Utc::now(),
    };
    store.reserve_inventory(reservation).await.unwrap();

    let err = service
        .generate_cart_quote("tenant-1", vec![("product-1".to_string(), 1)], None)
        .await
        .expect_err("expected out of stock due to reservation");
    match err {
        ServiceError::Coded { code, .. } => assert_eq!(code, ErrorCode::ProductNotFound),
        other => panic!("unexpected error: {other:?}"),
    }
}

#[tokio::test]
async fn test_cart_quote_applies_gift_card_partial() {
    let (service, store) = build_service(Duration::from_secs(60), Duration::from_secs(60));
    let now = Utc::now();
    store
        .create_gift_card(GiftCard {
            code: "GIFT-1".to_string(),
            tenant_id: "tenant-1".to_string(),
            initial_balance: 40,
            balance: 40,
            currency: "USDC".to_string(),
            active: true,
            expires_at: None,
            metadata: HashMap::new(),
            created_at: now,
            updated_at: now,
        })
        .await
        .unwrap();

    let quote = service
        .generate_cart_quote_with_metadata(
            "tenant-1",
            vec![CartQuoteItemInput {
                resource_id: "product-1".to_string(),
                variant_id: None,
                quantity: 1,
                metadata: HashMap::new(),
            }],
            HashMap::new(),
            None,
            Some("GIFT-1"),
        )
        .await
        .unwrap();

    assert_eq!(quote.total.atomic, 60);
    assert_eq!(
        quote.metadata.get("gift_card_code"),
        Some(&"GIFT-1".to_string())
    );
    assert_eq!(
        quote.metadata.get("gift_card_applied_amount"),
        Some(&"40".to_string())
    );
}

#[tokio::test]
async fn test_cart_quote_rejects_gift_card_currency_mismatch() {
    let (service, store) = build_service(Duration::from_secs(60), Duration::from_secs(60));
    let now = Utc::now();
    store
        .create_gift_card(GiftCard {
            code: "GIFT-2".to_string(),
            tenant_id: "tenant-1".to_string(),
            initial_balance: 20,
            balance: 20,
            currency: "EUR".to_string(),
            active: true,
            expires_at: None,
            metadata: HashMap::new(),
            created_at: now,
            updated_at: now,
        })
        .await
        .unwrap();

    let err = service
        .generate_cart_quote_with_metadata(
            "tenant-1",
            vec![CartQuoteItemInput {
                resource_id: "product-1".to_string(),
                variant_id: None,
                quantity: 1,
                metadata: HashMap::new(),
            }],
            HashMap::new(),
            None,
            Some("GIFT-2"),
        )
        .await
        .unwrap_err();

    assert_eq!(err.code(), ErrorCode::InvalidField);
}

#[tokio::test]
async fn test_resolve_user_id_from_wallet_uses_cache() {
    use axum::{
        extract::{Path, State},
        http::StatusCode,
        routing::get,
        Router,
    };
    use tokio::net::TcpListener;

    let hits: Arc<Mutex<u32>> = Arc::new(Mutex::new(0));
    let hits_state = hits.clone();

    let app = Router::new()
        .route(
            "/users/by-wallet/{wallet}",
            get(
                |Path(wallet): Path<String>,
                 State(hits): State<Arc<Mutex<u32>>>| async move {
                    *hits.lock() += 1;
                    (
                        StatusCode::OK,
                        axum::Json(json!({"user_id": "user-1", "wallet_address": wallet})),
                    )
                },
            ),
        )
        .with_state(hits_state);

    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, app).await.unwrap();
    });

    let mut config = Config::default();
    config.cedros_login.enabled = true;
    config.cedros_login.base_url = format!("http://{}", addr);
    config.cedros_login.api_key = "secret".to_string();

    let store = Arc::new(InMemoryStore::new());
    let product_repo = Arc::new(InMemoryProductRepository::new(Vec::new()));
    let coupon_repo = Arc::new(InMemoryCouponRepository::new(Vec::new()));

    let cedros_login = crate::services::CedrosLoginClient::new(
        config.cedros_login.base_url.clone(),
        config.cedros_login.api_key.clone(),
        Duration::from_secs(5),
        None,
        None,
    )
    .expect("cedros login");

    let service = PaywallService::new(
        config,
        store,
        Arc::new(NoopVerifier),
        Arc::new(NoopNotifier),
        product_repo,
        coupon_repo,
    )
    .with_cedros_login(Arc::new(cedros_login));

    assert_eq!(
        service.resolve_user_id_from_wallet("wallet-1").await,
        Some("user-1".to_string())
    );
    assert_eq!(
        service.resolve_user_id_from_wallet("wallet-1").await,
        Some("user-1".to_string())
    );
    assert_eq!(*hits.lock(), 1);
}

#[tokio::test]
async fn test_generate_quote_credits_uses_crypto_price() {
    let mut config = Config::default();
    config.cedros_login.enabled = true;
    config.cedros_login.base_url = "https://login.example.com".to_string();
    config.cedros_login.credits_enabled = true;

    let store = Arc::new(InMemoryStore::new());
    let asset = get_asset("USDC").expect("asset should be registered");
    let product = Product {
        id: "product-credits".to_string(),
        tenant_id: "tenant-1".to_string(),
        // Intentional mismatch: fiat and crypto differ; credits should use crypto.
        fiat_price: Some(Money::new(asset.clone(), 9999)),
        crypto_price: Some(Money::new(asset, 1234)),
        active: true,
        ..Product::default()
    };

    let product_repo = Arc::new(InMemoryProductRepository::new(vec![product]));
    let coupon_repo = Arc::new(InMemoryCouponRepository::new(Vec::new()));

    let service = PaywallService::new(
        config,
        store,
        Arc::new(NoopVerifier),
        Arc::new(NoopNotifier),
        product_repo,
        coupon_repo,
    );

    let quote = service
        .generate_quote("tenant-1", "product-credits", None)
        .await
        .unwrap();

    let credits = quote.credits.expect("credits option");
    assert_eq!(credits.currency, "USDC");
    assert_eq!(credits.amount, 1234);
}

#[tokio::test]
async fn test_generate_quote_credits_requires_cedros_login_enabled() {
    let mut config = Config::default();
    config.cedros_login.enabled = false;
    config.cedros_login.credits_enabled = true;

    let store = Arc::new(InMemoryStore::new());
    let asset = get_asset("USDC").expect("asset should be registered");
    let product = Product {
        id: "product-credits".to_string(),
        tenant_id: "tenant-1".to_string(),
        crypto_price: Some(Money::new(asset, 1234)),
        active: true,
        ..Product::default()
    };

    let product_repo = Arc::new(InMemoryProductRepository::new(vec![product]));
    let coupon_repo = Arc::new(InMemoryCouponRepository::new(Vec::new()));

    let service = PaywallService::new(
        config,
        store,
        Arc::new(NoopVerifier),
        Arc::new(NoopNotifier),
        product_repo,
        coupon_repo,
    );

    let quote = service
        .generate_quote("tenant-1", "product-credits", None)
        .await
        .unwrap();

    assert!(quote.credits.is_none());
}

#[tokio::test]
async fn test_authorize_credits_idempotent_returns_wallet_when_present() {
    let mut config = Config::default();
    config.cedros_login.enabled = true;
    config.cedros_login.credits_enabled = true;

    let store = Arc::new(InMemoryStore::new());

    let cedros_login = crate::services::CedrosLoginClient::new(
        "https://login.example.com".to_string(),
        "secret".to_string(),
        Duration::from_secs(5),
        None,
        None,
    )
    .expect("cedros login");

    let product_repo = Arc::new(InMemoryProductRepository::new(Vec::new()));
    let coupon_repo = Arc::new(InMemoryCouponRepository::new(Vec::new()));

    let service = PaywallService::new(
        config,
        store.clone(),
        Arc::new(NoopVerifier),
        Arc::new(NoopNotifier),
        product_repo,
        coupon_repo,
    )
    .with_cedros_login(Arc::new(cedros_login));

    let payment = PaymentTransaction {
        signature: "credits:hold-1".to_string(),
        tenant_id: "tenant-1".to_string(),
        resource_id: "product-1".to_string(),
        wallet: "wallet-1".to_string(),
        user_id: None,
        amount: Money::default(),
        created_at: Utc::now(),
        metadata: HashMap::new(),
    };
    store.record_payment(payment).await.unwrap();

    let result = service
        .authorize_with_wallet(
            "tenant-1",
            "product-1",
            AuthorizeWithWalletRequest {
                stripe_session_id: None,
                payment_header: None,
                coupon_code: None,
                wallet: None,
                credits_hold_id: Some("hold-1"),
            },
        )
        .await
        .unwrap();

    assert!(result.granted);
    assert_eq!(result.wallet, Some("wallet-1".to_string()));
}

#[tokio::test]
async fn test_create_credits_hold_idempotency_key_includes_user_id() {
    use axum::{
        extract::{Path, State},
        http::StatusCode,
        routing::post,
        Router,
    };
    use tokio::net::TcpListener;

    let calls: Arc<Mutex<Vec<serde_json::Value>>> = Arc::new(Mutex::new(Vec::new()));
    let calls_state = calls.clone();

    let app = Router::new()
        .route(
            "/credits/hold/{user_id}",
            post(
                |Path(_user_id): Path<String>,
                 State(calls): State<Arc<Mutex<Vec<serde_json::Value>>>>,
                 axum::Json(body): axum::Json<serde_json::Value>| async move {
                    calls.lock().push(body);
                    (
                        StatusCode::OK,
                        axum::Json(json!({
                            "holdId": "hold-1",
                            "isNew": true,
                            "amountLamports": 1234,
                            "expiresAt": Utc::now().to_rfc3339(),
                            "currency": "USDC"
                        })),
                    )
                },
            ),
        )
        .with_state(calls_state);

    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, app).await.unwrap();
    });

    let mut config = Config::default();
    config.cedros_login.enabled = true;
    config.cedros_login.credits_enabled = true;
    config.cedros_login.base_url = format!("http://{}", addr);
    config.cedros_login.api_key = "secret".to_string();

    let store = Arc::new(InMemoryStore::new());
    let asset = get_asset("USDC").expect("asset should be registered");
    let product = Product {
        id: "product-1".to_string(),
        tenant_id: "tenant-1".to_string(),
        crypto_price: Some(Money::new(asset, 1234)),
        active: true,
        ..Product::default()
    };
    let product_repo = Arc::new(InMemoryProductRepository::new(vec![product]));
    let coupon_repo = Arc::new(InMemoryCouponRepository::new(Vec::new()));

    let cedros_login = crate::services::CedrosLoginClient::new(
        config.cedros_login.base_url.clone(),
        config.cedros_login.api_key.clone(),
        Duration::from_secs(5),
        None,
        None,
    )
    .expect("cedros login");

    let service = PaywallService::new(
        config,
        store,
        Arc::new(NoopVerifier),
        Arc::new(NoopNotifier),
        product_repo,
        coupon_repo,
    )
    .with_cedros_login(Arc::new(cedros_login));

    service
        .create_credits_hold_for_user("tenant-1", "product-1", None, "user-1")
        .await
        .unwrap();

    let body = calls.lock().first().cloned().expect("create hold called");
    assert_eq!(
        body.get("idempotencyKey").and_then(|v| v.as_str()),
        Some("quote:tenant-1:user-1:product-1")
    );
}

#[tokio::test]
async fn test_create_cart_credits_hold_idempotency_key_includes_user_id() {
    use axum::{
        extract::{Path, State},
        http::StatusCode,
        routing::post,
        Router,
    };
    use tokio::net::TcpListener;

    let calls: Arc<Mutex<Vec<serde_json::Value>>> = Arc::new(Mutex::new(Vec::new()));
    let calls_state = calls.clone();

    let app = Router::new()
        .route(
            "/credits/hold/{user_id}",
            post(
                |Path(_user_id): Path<String>,
                 State(calls): State<Arc<Mutex<Vec<serde_json::Value>>>>,
                 axum::Json(body): axum::Json<serde_json::Value>| async move {
                    calls.lock().push(body);
                    (
                        StatusCode::OK,
                        axum::Json(json!({
                            "holdId": "hold-1",
                            "isNew": true,
                            "amountLamports": 1234,
                            "expiresAt": Utc::now().to_rfc3339(),
                            "currency": "USDC"
                        })),
                    )
                },
            ),
        )
        .with_state(calls_state);

    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, app).await.unwrap();
    });

    let mut config = Config::default();
    config.cedros_login.enabled = true;
    config.cedros_login.credits_enabled = true;
    config.cedros_login.base_url = format!("http://{}", addr);
    config.cedros_login.api_key = "secret".to_string();

    let store = Arc::new(InMemoryStore::new());
    let asset = get_asset("USDC").expect("asset should be registered");

    store
        .store_cart_quote(CartQuote {
            id: "cart-1".to_string(),
            tenant_id: "tenant-1".to_string(),
            items: vec![CartItem {
                resource_id: "product-1".to_string(),
                quantity: 1,
                price: Money::new(asset.clone(), 1234),
                ..CartItem::default()
            }],
            total: Money::new(asset.clone(), 1234),
            created_at: Utc::now(),
            expires_at: Utc::now() + chrono::Duration::minutes(5),
            ..CartQuote::default()
        })
        .await
        .unwrap();

    let product_repo = Arc::new(InMemoryProductRepository::new(Vec::new()));
    let coupon_repo = Arc::new(InMemoryCouponRepository::new(Vec::new()));

    let cedros_login = crate::services::CedrosLoginClient::new(
        config.cedros_login.base_url.clone(),
        config.cedros_login.api_key.clone(),
        Duration::from_secs(5),
        None,
        None,
    )
    .expect("cedros login");

    let service = PaywallService::new(
        config,
        store,
        Arc::new(NoopVerifier),
        Arc::new(NoopNotifier),
        product_repo,
        coupon_repo,
    )
    .with_cedros_login(Arc::new(cedros_login));

    service
        .create_cart_credits_hold_for_user("tenant-1", "cart-1", "user-1")
        .await
        .unwrap();

    let body = calls.lock().first().cloned().expect("create hold called");
    assert_eq!(
        body.get("idempotencyKey").and_then(|v| v.as_str()),
        Some("cart:tenant-1:user-1:cart-1")
    );
}

#[tokio::test]
async fn test_store_cart_quote_with_retry_succeeds_after_transient_failure() {
    use crate::storage::StorageError;

    let attempts: Arc<Mutex<u32>> = Arc::new(Mutex::new(0));
    let attempts_state = attempts.clone();

    store_cart_quote_with_retry("cart-1", move || {
        let attempts = attempts_state.clone();
        async move {
            let mut guard = attempts.lock();
            *guard += 1;
            if *guard == 1 {
                Err(StorageError::Database("boom".to_string()))
            } else {
                Ok(())
            }
        }
    })
    .await
    .unwrap();

    assert_eq!(*attempts.lock(), 2);
}

#[tokio::test]
async fn test_authorize_credits_for_user_records_user_id() {
    use axum::{routing::post, Router};
    use axum::http::StatusCode;
    use tokio::net::TcpListener;

    let app = Router::new().route(
        "/credits/capture/{hold_id}",
        post(|| async { StatusCode::OK }),
    );
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, app).await.unwrap();
    });

    let mut config = Config::default();
    config.cedros_login.enabled = true;
    config.cedros_login.credits_enabled = true;

    let base_url = format!("http://{}", addr);
    config.cedros_login.base_url = base_url.clone();
    config.cedros_login.api_key = "secret".to_string();

    let store = Arc::new(InMemoryStore::new());
    let asset = get_asset("USDC").expect("asset");
    let product = Product {
        id: "product-1".to_string(),
        tenant_id: "tenant-1".to_string(),
        crypto_price: Some(Money::new(asset, 1234)),
        active: true,
        ..Product::default()
    };

    let product_repo = Arc::new(InMemoryProductRepository::new(vec![product]));
    let coupon_repo = Arc::new(InMemoryCouponRepository::new(Vec::new()));

    let cedros_login = crate::services::CedrosLoginClient::new(
        base_url,
        "secret".to_string(),
        Duration::from_secs(5),
        None,
        None,
    )
    .expect("cedros login");

    let service = PaywallService::new(
        config,
        store.clone(),
        Arc::new(NoopVerifier),
        Arc::new(NoopNotifier),
        product_repo,
        coupon_repo,
    )
    .with_cedros_login(Arc::new(cedros_login));

    store
        .store_credits_hold(crate::storage::CreditsHold {
            hold_id: "hold-1".to_string(),
            tenant_id: "tenant-1".to_string(),
            user_id: "user-1".to_string(),
            resource_id: "product-1".to_string(),
            amount: 1234,
            amount_asset: "USDC".to_string(),
            created_at: Utc::now(),
            expires_at: Utc::now() + chrono::Duration::minutes(5),
        })
        .await
        .unwrap();

    let result = service
        .authorize_credits_for_user(
            "tenant-1",
            "product-1",
            "hold-1",
            None,
            None,
            "user-1",
        )
        .await
        .unwrap();

    assert!(result.granted);

    let payment = store
        .get_payment("tenant-1", "credits:hold-1")
        .await
        .unwrap()
        .expect("payment recorded");
    assert_eq!(payment.user_id.as_deref(), Some("user-1"));

    let hold = store
        .get_credits_hold("tenant-1", "hold-1")
        .await
        .unwrap();
    assert!(hold.is_none());
}

#[tokio::test]
async fn test_authorize_credits_rejects_hold_amount_mismatch() {
    use axum::http::StatusCode;
    use axum::{routing::post, Router};
    use tokio::net::TcpListener;

    let app = Router::new().route(
        "/credits/capture/{hold_id}",
        post(|| async { StatusCode::OK }),
    );
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, app).await.unwrap();
    });

    let mut config = Config::default();
    config.cedros_login.enabled = true;
    config.cedros_login.credits_enabled = true;

    let base_url = format!("http://{}", addr);
    config.cedros_login.base_url = base_url.clone();
    config.cedros_login.api_key = "secret".to_string();

    let store = Arc::new(InMemoryStore::new());
    let asset = get_asset("USDC").expect("asset");
    let product = Product {
        id: "product-1".to_string(),
        tenant_id: "tenant-1".to_string(),
        crypto_price: Some(Money::new(asset, 1234)),
        active: true,
        ..Product::default()
    };
    let product_repo = Arc::new(InMemoryProductRepository::new(vec![product]));
    let coupon_repo = Arc::new(InMemoryCouponRepository::new(Vec::new()));

    let cedros_login = crate::services::CedrosLoginClient::new(
        base_url,
        "secret".to_string(),
        Duration::from_secs(5),
        None,
        None,
    )
    .expect("cedros login");

    let service = PaywallService::new(
        config,
        store.clone(),
        Arc::new(NoopVerifier),
        Arc::new(NoopNotifier),
        product_repo,
        coupon_repo,
    )
    .with_cedros_login(Arc::new(cedros_login));

    // Wrong amount binding
    store
        .store_credits_hold(crate::storage::CreditsHold {
            hold_id: "hold-1".to_string(),
            tenant_id: "tenant-1".to_string(),
            user_id: "user-1".to_string(),
            resource_id: "product-1".to_string(),
            amount: 999,
            amount_asset: "USDC".to_string(),
            created_at: Utc::now(),
            expires_at: Utc::now() + chrono::Duration::minutes(5),
        })
        .await
        .unwrap();

    let err = service
        .authorize_credits_for_user("tenant-1", "product-1", "hold-1", None, None, "user-1")
        .await
        .expect_err("expected mismatch error");

    match err {
        ServiceError::Coded { code, .. } => assert_eq!(code, ErrorCode::InvalidPaymentProof),
        other => panic!("unexpected error: {other:?}"),
    }
}

#[tokio::test]
async fn test_stripe_authorize_binds_session_to_resource() {
    let (service, store) = build_service(Duration::from_secs(60), Duration::from_secs(60));

    let asset = get_asset("USDC").expect("asset should be registered");
    let payment = PaymentTransaction {
        signature: "stripe:test-session".to_string(),
        tenant_id: "tenant-1".to_string(),
        resource_id: "product-1".to_string(),
        wallet: "".to_string(),
        user_id: None,
        amount: Money::new(asset, 100),
        created_at: Utc::now(),
        metadata: HashMap::new(),
    };
    store.record_payment(payment).await.unwrap();

    // Correct resource succeeds
    let ok = service
        .authorize_with_wallet(
            "tenant-1",
            "product-1",
            AuthorizeWithWalletRequest {
                stripe_session_id: Some("test-session"),
                payment_header: None,
                coupon_code: None,
                wallet: None,
                credits_hold_id: None,
            },
        )
        .await
        .unwrap();
    assert!(ok.granted);

    // Wrong resource must fail
    let err = service
        .authorize_with_wallet(
            "tenant-1",
            "product-2",
            AuthorizeWithWalletRequest {
                stripe_session_id: Some("test-session"),
                payment_header: None,
                coupon_code: None,
                wallet: None,
                credits_hold_id: None,
            },
        )
        .await
        .expect_err("expected authorization error");

    match err {
        ServiceError::Coded { code, .. } => assert_eq!(code, ErrorCode::InvalidPaymentProof),
        other => panic!("unexpected error type: {other:?}"),
    }
}

#[tokio::test]
async fn test_authorize_x402_rejects_replay_on_other_resource() {
    let (service, store) = build_service(Duration::from_secs(60), Duration::from_secs(60));

    let asset = get_asset("USDC").expect("asset should be registered");
    let signature = "5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW";
    let payment = PaymentTransaction {
        signature: signature.to_string(),
        tenant_id: "tenant-1".to_string(),
        resource_id: "product-1".to_string(),
        wallet: "wallet-1".to_string(),
        user_id: None,
        amount: Money::new(asset, 100),
        created_at: Utc::now(),
        metadata: HashMap::new(),
    };
    store.record_payment(payment).await.unwrap();

    let header = json!({
        "x402Version": X402_VERSION,
        "scheme": X402_SCHEME_SPL,
        "network": service.config.x402.network.clone(),
        "payload": {
            "signature": signature,
            "transaction": "tx",
            "resource": "product-1",
            "resourceType": "regular"
        }
    })
    .to_string();

    let err = service
        .authorize_with_wallet(
            "tenant-1",
            "product-2",
            AuthorizeWithWalletRequest {
                stripe_session_id: None,
                payment_header: Some(&header),
                coupon_code: None,
                wallet: None,
                credits_hold_id: None,
            },
        )
        .await
        .expect_err("expected authorization error");

    match err {
        ServiceError::Coded { code, .. } => assert_eq!(code, ErrorCode::InvalidSignature),
        other => panic!("unexpected error type: {other:?}"),
    }
}

#[tokio::test]
async fn test_verify_payment_replay_resource_mismatch_fails() {
    let (service, store) = build_service(Duration::from_secs(60), Duration::from_secs(60));

    let asset = get_asset("USDC").expect("asset should be registered");
    let signature = "1".repeat(88);
    let payment = PaymentTransaction {
        signature: signature.clone(),
        tenant_id: "tenant-1".to_string(),
        resource_id: "product-1".to_string(),
        wallet: "wallet-1".to_string(),
        user_id: None,
        amount: Money::new(asset, 100),
        created_at: Utc::now(),
        metadata: HashMap::new(),
    };
    store.record_payment(payment).await.unwrap();

    let proof = PaymentProof {
        x402_version: 0,
        scheme: "solana".to_string(),
        network: "".to_string(),
        signature: signature.clone(),
        payer: "".to_string(),
        transaction: "".to_string(),
        resource_id: "product-2".to_string(),
        resource_type: "regular".to_string(),
        recipient_token_account: None,
        memo: None,
        fee_payer: None,
        metadata: HashMap::new(),
    };

    let result = service.verify_payment("tenant-1", proof).await;

    match result {
        Ok(_) => panic!("expected resource mismatch error"),
        Err(err) => match err {
        ServiceError::Coded { code, .. } => assert_eq!(code, ErrorCode::InvalidSignature),
        other => panic!("unexpected error type: {other:?}"),
        },
    }
}

#[tokio::test]
async fn test_verify_payment_rejects_invalid_resource_type() {
    let (service, _store) = build_service(Duration::from_secs(60), Duration::from_secs(60));

    let proof = PaymentProof {
        x402_version: 0,
        scheme: "solana".to_string(),
        network: "".to_string(),
        signature: "".to_string(),
        payer: "".to_string(),
        transaction: "".to_string(),
        resource_id: "product-1".to_string(),
        resource_type: "bogus".to_string(),
        recipient_token_account: None,
        memo: None,
        fee_payer: None,
        metadata: HashMap::new(),
    };

    let result = service.verify_payment("tenant-1", proof).await;
    match result {
        Ok(_) => panic!("expected invalid resource type error"),
        Err(err) => match err {
            ServiceError::Coded { code, .. } => assert_eq!(code, ErrorCode::InvalidResourceType),
            other => panic!("unexpected error type: {other:?}"),
        },
    }
}

#[tokio::test]
async fn test_cart_payment_records_cart_resource() {
    let asset = get_asset("USDC").expect("asset should be registered");
    let mint = asset
        .metadata
        .solana_mint
        .clone()
        .expect("USDC mint");
    let signature = "5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW";

    let mut config = Config::default();
    config.x402.payment_address = "11111111111111111111111111111111".to_string();
    config.x402.token_mint = mint;

    let store = Arc::new(InMemoryStore::new());
    let product = Product {
        id: "product-1".to_string(),
        tenant_id: "tenant-1".to_string(),
        crypto_price: Some(Money::new(asset, 100)),
        active: true,
        ..Product::default()
    };

    let verifier = FixedVerifier {
        result: VerificationResult {
            wallet: "wallet-1".to_string(),
            amount: 100,
            signature: signature.to_string(),
            expires_at: Utc::now() + chrono::Duration::minutes(10),
        },
    };

    let product_repo = Arc::new(InMemoryProductRepository::new(vec![product]));
    let coupon_repo = Arc::new(InMemoryCouponRepository::new(Vec::new()));
    let service = PaywallService::new(
        config,
        store.clone(),
        Arc::new(verifier),
        Arc::new(NoopNotifier),
        product_repo,
        coupon_repo,
    );

    let quote = service
        .generate_cart_quote("tenant-1", vec![("product-1".to_string(), 1)], None)
        .await
        .unwrap();

    let proof = PaymentProof {
        x402_version: 0,
        scheme: "solana".to_string(),
        network: service.config.x402.network.clone(),
        signature: signature.to_string(),
        payer: "wallet-1".to_string(),
        transaction: "tx".to_string(),
        resource_id: format!("cart:{}", quote.id),
        resource_type: "cart".to_string(),
        recipient_token_account: None,
        memo: None,
        fee_payer: None,
        metadata: HashMap::new(),
    };

    let result = service
        .authorize_cart("tenant-1", &quote.id, proof)
        .await
        .unwrap();
    assert!(result.granted);

    let stored = store
        .get_payment("tenant-1", signature)
        .await
        .unwrap()
        .expect("payment stored");
    assert_eq!(stored.resource_id, format!("cart:{}", quote.id));
}

#[tokio::test]
async fn test_payment_callback_called_on_x402_authorize() {
    let asset = get_asset("USDC").expect("asset should be registered");
    let mint = asset
        .metadata
        .solana_mint
        .clone()
        .expect("USDC mint");
    let signature = "5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW";

    let mut config = Config::default();
    config.x402.payment_address = "11111111111111111111111111111111".to_string();
    config.x402.token_mint = mint;

    let store = Arc::new(InMemoryStore::new());
    let product = Product {
        id: "product-1".to_string(),
        tenant_id: "tenant-1".to_string(),
        crypto_price: Some(Money::new(asset, 100)),
        active: true,
        ..Product::default()
    };

    let verifier = FixedVerifier {
        result: VerificationResult {
            wallet: "wallet-1".to_string(),
            amount: 100,
            signature: signature.to_string(),
            expires_at: Utc::now() + chrono::Duration::minutes(10),
        },
    };

    let callback = Arc::new(TestPaymentCallback::default());
    let product_repo = Arc::new(InMemoryProductRepository::new(vec![product]));
    let coupon_repo = Arc::new(InMemoryCouponRepository::new(Vec::new()));
    let service = PaywallService::new(
        config,
        store,
        Arc::new(verifier),
        Arc::new(NoopNotifier),
        product_repo,
        coupon_repo,
    )
    .with_payment_callback(callback.clone());

    let header = json!({
        "x402Version": X402_VERSION,
        "scheme": X402_SCHEME_SPL,
        "network": service.config.x402.network.clone(),
        "payload": {
            "signature": signature,
            "transaction": "tx",
            "resource": "product-1",
            "resourceType": "regular"
        }
    })
    .to_string();

    let result = service
        .authorize_with_wallet(
            "tenant-1",
            "product-1",
            AuthorizeWithWalletRequest {
                stripe_session_id: None,
                payment_header: Some(&header),
                coupon_code: None,
                wallet: None,
                credits_hold_id: None,
            },
        )
        .await
        .unwrap();
    assert!(result.granted);

    assert_eq!(*callback.payments.lock(), 1);
}

#[tokio::test]
async fn test_authorize_cart_rejects_already_paid_cart() {
    let asset = get_asset("USDC").expect("asset should be registered");
    let mint = asset
        .metadata
        .solana_mint
        .clone()
        .expect("USDC mint");
    let signature = "5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW";

    let mut config = Config::default();
    config.x402.payment_address = "11111111111111111111111111111111".to_string();
    config.x402.token_mint = mint;

    let store = Arc::new(InMemoryStore::new());
    let product = Product {
        id: "product-1".to_string(),
        tenant_id: "tenant-1".to_string(),
        crypto_price: Some(Money::new(asset, 100)),
        active: true,
        ..Product::default()
    };

    let verifier = FixedVerifier {
        result: VerificationResult {
            wallet: "wallet-1".to_string(),
            amount: 100,
            signature: signature.to_string(),
            expires_at: Utc::now() + chrono::Duration::minutes(10),
        },
    };

    let product_repo = Arc::new(InMemoryProductRepository::new(vec![product]));
    let coupon_repo = Arc::new(InMemoryCouponRepository::new(Vec::new()));
    let service = PaywallService::new(
        config,
        store.clone(),
        Arc::new(verifier),
        Arc::new(NoopNotifier),
        product_repo,
        coupon_repo,
    );

    let quote = service
        .generate_cart_quote("tenant-1", vec![("product-1".to_string(), 1)], None)
        .await
        .unwrap();

    let mut updated = quote.clone();
    updated.wallet_paid_by = Some("wallet-1".to_string());
    store.store_cart_quote(updated).await.unwrap();

    let proof = PaymentProof {
        x402_version: 0,
        scheme: "solana".to_string(),
        network: service.config.x402.network.clone(),
        signature: signature.to_string(),
        payer: "wallet-1".to_string(),
        transaction: "tx".to_string(),
        resource_id: format!("cart:{}", quote.id),
        resource_type: "cart".to_string(),
        recipient_token_account: None,
        memo: None,
        fee_payer: None,
        metadata: HashMap::new(),
    };

    let result = service.authorize_cart("tenant-1", &quote.id, proof).await;
    match result {
        Ok(_) => panic!("expected cart already paid error"),
        Err(err) => match err {
            ServiceError::Coded { code, .. } => assert_eq!(code, ErrorCode::CartAlreadyPaid),
            other => panic!("unexpected error type: {other:?}"),
        },
    }
}

#[tokio::test]
async fn test_refund_quote_uses_storage_ttl() {
    let (service, store) = build_service(Duration::from_secs(60), Duration::from_secs(321));

    let asset = get_asset("USDC").expect("asset should be registered");
    let payment = PaymentTransaction {
        signature: "sig-1".to_string(),
        tenant_id: "tenant-1".to_string(),
        resource_id: "product-1".to_string(),
        wallet: "wallet-1".to_string(),
        user_id: None,
        amount: Money::new(asset, 100),
        created_at: Utc::now(),
        metadata: HashMap::new(),
    };
    store.record_payment(payment).await.unwrap();

    let refund = match service
        .create_refund_request("tenant-1", "sig-1", Some("wallet-1"), None, None, None)
        .await
        .unwrap()
    {
        crate::services::paywall::service::RefundRequestResult::Crypto(r) => r,
        crate::services::paywall::service::RefundRequestResult::Stripe(_) => {
            panic!("expected crypto refund quote")
        }
    };

    let ttl = refund.expires_at - refund.created_at;
    assert_eq!(ttl.num_seconds(), 321);
}

#[test]
fn test_refund_succeeded_event_uses_refund_tenant() {
    let asset = get_asset("USDC").expect("asset");
    let refund = RefundQuote {
        id: "refund-1".to_string(),
        tenant_id: "tenant-1".to_string(),
        original_purchase_id: "sig-1".to_string(),
        recipient_wallet: "wallet-1".to_string(),
        amount: Money::new(asset, 100),
        reason: None,
        metadata: HashMap::new(),
        created_at: Utc::now(),
        expires_at: Utc::now(),
        processed_by: None,
        processed_at: None,
        signature: None,
    };

    let event = super::build_refund_succeeded_event(&refund, "admin", "sig");
    assert_eq!(event.tenant_id, "tenant-1");
}

#[tokio::test]
async fn test_create_refund_request_rejects_mismatched_token() {
    let (service, store) = build_service(Duration::from_secs(60), Duration::from_secs(321));

    let usdc = get_asset("USDC").expect("asset should be registered");
    let payment = PaymentTransaction {
        signature: "sig-1".to_string(),
        tenant_id: "tenant-1".to_string(),
        resource_id: "product-1".to_string(),
        wallet: "wallet-1".to_string(),
        user_id: None,
        amount: Money::new(usdc, 100),
        created_at: Utc::now(),
        metadata: HashMap::new(),
    };
    store.record_payment(payment).await.unwrap();

    let usd = get_asset("USD").expect("USD should be registered");
    let requested = Money::new(usd, 100);

    let result = service
        .create_refund_request(
            "tenant-1",
            "sig-1",
            Some("wallet-1"),
            Some(requested),
            None,
            None,
        )
        .await;

    match result {
        Ok(_) => panic!("expected invalid amount error"),
        Err(err) => match err {
            ServiceError::Coded { code, .. } => assert_eq!(code, ErrorCode::InvalidAmount),
            other => panic!("unexpected error type: {other:?}"),
        },
    }
}

#[tokio::test]
async fn test_cart_item_applied_coupons_are_per_item() {
    let mut config = Config::default();
    config.storage.cart_quote_ttl = Duration::from_secs(300);

    let store = Arc::new(InMemoryStore::new());
    let asset = get_asset("USDC").expect("asset should be registered");
    let products = vec![
        Product {
            id: "product-1".to_string(),
            tenant_id: "tenant-1".to_string(),
            crypto_price: Some(Money::new(asset.clone(), 100)),
            active: true,
            ..Product::default()
        },
        Product {
            id: "product-2".to_string(),
            tenant_id: "tenant-1".to_string(),
            crypto_price: Some(Money::new(asset, 200)),
            active: true,
            ..Product::default()
        },
    ];

    let coupons = vec![
        Coupon {
            code: "CART-ONE".to_string(),
            tenant_id: "tenant-1".to_string(),
            discount_type: "percentage".to_string(),
            discount_value: 10.0,
            scope: "specific".to_string(),
            product_ids: vec!["product-1".to_string()],
            auto_apply: true,
            applies_at: "catalog".to_string(),
            active: true,
            ..Coupon::default()
        },
        Coupon {
            code: "CART-TWO".to_string(),
            tenant_id: "tenant-1".to_string(),
            discount_type: "percentage".to_string(),
            discount_value: 5.0,
            scope: "specific".to_string(),
            product_ids: vec!["product-2".to_string()],
            auto_apply: true,
            applies_at: "catalog".to_string(),
            active: true,
            ..Coupon::default()
        },
    ];

    let product_repo = Arc::new(InMemoryProductRepository::new(products));
    let coupon_repo = Arc::new(InMemoryCouponRepository::new(coupons));

    let service = PaywallService::new(
        config,
        store,
        Arc::new(NoopVerifier),
        Arc::new(NoopNotifier),
        product_repo,
        coupon_repo,
    );

    let quote = service
        .generate_cart_quote(
            "tenant-1",
            vec![("product-1".to_string(), 1), ("product-2".to_string(), 1)],
            None,
        )
        .await
        .unwrap();

    let item_one = quote
        .items
        .iter()
        .find(|i| i.resource_id == "product-1")
        .unwrap();
    let item_two = quote
        .items
        .iter()
        .find(|i| i.resource_id == "product-2")
        .unwrap();

    assert_eq!(item_one.applied_coupons, vec!["CART-ONE".to_string()]);
    assert_eq!(item_two.applied_coupons, vec!["CART-TWO".to_string()]);
}

#[tokio::test]
async fn test_cart_coupon_metadata_sorted() {
    let mut config = Config::default();
    config.storage.cart_quote_ttl = Duration::from_secs(300);

    let store = Arc::new(InMemoryStore::new());
    let asset = get_asset("USDC").expect("asset should be registered");
    let product = Product {
        id: "product-1".to_string(),
        tenant_id: "tenant-1".to_string(),
        crypto_price: Some(Money::new(asset, 100)),
        active: true,
        ..Product::default()
    };

    let coupons = vec![
        Coupon {
            code: "ZETA".to_string(),
            tenant_id: "tenant-1".to_string(),
            discount_type: "percentage".to_string(),
            discount_value: 10.0,
            scope: "specific".to_string(),
            product_ids: vec!["product-1".to_string()],
            auto_apply: true,
            applies_at: "catalog".to_string(),
            active: true,
            ..Coupon::default()
        },
        Coupon {
            code: "ALPHA".to_string(),
            tenant_id: "tenant-1".to_string(),
            discount_type: "percentage".to_string(),
            discount_value: 5.0,
            scope: "specific".to_string(),
            product_ids: vec!["product-1".to_string()],
            auto_apply: true,
            applies_at: "catalog".to_string(),
            active: true,
            ..Coupon::default()
        },
    ];

    let product_repo = Arc::new(InMemoryProductRepository::new(vec![product]));
    let coupon_repo = Arc::new(InMemoryCouponRepository::new(coupons));

    let service = PaywallService::new(
        config,
        store,
        Arc::new(NoopVerifier),
        Arc::new(NoopNotifier),
        product_repo,
        coupon_repo,
    );

    let quote = service
        .generate_cart_quote("tenant-1", vec![("product-1".to_string(), 1)], None)
        .await
        .unwrap();

    assert_eq!(
        quote.metadata.get("coupon_codes"),
        Some(&"ALPHA,ZETA".to_string())
    );
    assert_eq!(
        quote.metadata.get("catalog_coupons"),
        Some(&"ALPHA,ZETA".to_string())
    );
}

#[test]
fn test_refund_lock_manager_cleanup() {
    // BUG-004: Verify TTL-based eviction works correctly
    let manager = RefundLockManager::new();

    // Add some locks
    let _lock1 = manager.get_lock("sig1");
    let _lock2 = manager.get_lock("sig2");

    // Verify locks were created
    {
        let locks = manager.locks.lock();
        assert_eq!(locks.len(), 2);
    }

    // Getting same lock should return the same Arc
    let lock1a = manager.get_lock("sig1");
    let lock1b = manager.get_lock("sig1");
    assert!(Arc::ptr_eq(&lock1a, &lock1b));

    // Verify cleanup_expired removes old entries (simulated by manipulating entry)
    {
        let mut locks = manager.locks.lock();
        // Set entry to be old
        if let Some(entry) = locks.get_mut("sig1") {
            entry.last_used =
                Instant::now() - std::time::Duration::from_secs(REFUND_LOCK_TTL_SECS + 1);
        }
        manager.cleanup_expired(&mut locks);
        // sig1 should be removed, sig2 should remain
        assert_eq!(locks.len(), 1);
        assert!(!locks.contains_key("sig1"));
        assert!(locks.contains_key("sig2"));
    }
}
