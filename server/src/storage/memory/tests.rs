use super::*;
use chrono::Duration as ChronoDuration;

#[tokio::test]
async fn test_cart_quote_tenant_isolation() {
    let store = InMemoryStore::new();
    let cart_id = "shared-cart";

    let cart_a = CartQuote {
        id: cart_id.to_string(),
        tenant_id: "tenant-a".to_string(),
        ..Default::default()
    };
    store.store_cart_quote(cart_a.clone()).await.unwrap();

    let cart_b = CartQuote {
        id: cart_id.to_string(),
        tenant_id: "tenant-b".to_string(),
        ..Default::default()
    };
    store.store_cart_quote(cart_b.clone()).await.unwrap();

    let fetched_a = store
        .get_cart_quote("tenant-a", cart_id)
        .await
        .unwrap()
        .expect("tenant-a cart");
    let fetched_b = store
        .get_cart_quote("tenant-b", cart_id)
        .await
        .unwrap()
        .expect("tenant-b cart");

    assert_eq!(fetched_a.tenant_id, "tenant-a");
    assert_eq!(fetched_b.tenant_id, "tenant-b");
}

#[tokio::test]
async fn test_webhook_retry_requeues_pending() {
    let store = InMemoryStore::new();
    let webhook = PendingWebhook {
        id: "wh-1".to_string(),
        tenant_id: "default".to_string(),
        url: "https://example.com".to_string(),
        payload: serde_json::json!({ "ok": true }),
        payload_bytes: Vec::new(),
        headers: std::collections::HashMap::new(),
        event_type: "payment.succeeded".to_string(),
        status: WebhookStatus::Failed,
        attempts: 1,
        max_attempts: 3,
        last_error: Some("failed".to_string()),
        last_attempt_at: Some(Utc::now()),
        next_attempt_at: None,
        created_at: Utc::now(),
        completed_at: None,
    };

    store.enqueue_webhook(webhook).await.unwrap();

    let retry_at = Utc::now() - chrono::Duration::seconds(1);
    store
        .mark_webhook_retry("wh-1", "retry", retry_at)
        .await
        .unwrap();

    let mut items = store.dequeue_webhooks(1).await.unwrap();
    assert_eq!(items.len(), 1);
    assert_eq!(items.remove(0).status, WebhookStatus::Processing);
}

#[tokio::test]
async fn test_enqueue_webhook_is_idempotent_on_duplicate_id() {
    let store = InMemoryStore::new();
    let now = Utc::now();

    let webhook = PendingWebhook {
        id: "wh-dup".to_string(),
        tenant_id: "default".to_string(),
        url: "https://example.com".to_string(),
        payload: serde_json::json!({"ok": true}),
        payload_bytes: Vec::new(),
        headers: std::collections::HashMap::new(),
        event_type: "payment.succeeded".to_string(),
        status: WebhookStatus::Pending,
        attempts: 0,
        max_attempts: 3,
        last_error: None,
        last_attempt_at: None,
        next_attempt_at: Some(now),
        created_at: now,
        completed_at: None,
    };

    store.enqueue_webhook(webhook.clone()).await.unwrap();

    let mut replacement = webhook;
    replacement.attempts = 99;
    replacement.last_error = Some("overwrite".to_string());
    store.enqueue_webhook(replacement).await.unwrap();

    let stored = store.get_webhook("wh-dup").await.unwrap().expect("webhook");
    assert_eq!(stored.attempts, 0);
    assert_eq!(stored.last_error, None);
}

#[tokio::test]
async fn test_inventory_reservations_convert() {
    let store = InMemoryStore::new();
    let now = Utc::now();
    let reservation = InventoryReservation {
        id: "res-1".to_string(),
        tenant_id: "tenant-a".to_string(),
        product_id: "prod-1".to_string(),
        variant_id: None,
        quantity: 2,
        expires_at: now + ChronoDuration::minutes(5),
        cart_id: Some("cart-1".to_string()),
        status: "active".to_string(),
        created_at: now,
    };

    store.reserve_inventory(reservation).await.unwrap();
    let active = store
        .list_active_reservations_for_cart("tenant-a", "cart-1")
        .await
        .unwrap();
    assert_eq!(active.len(), 1);

    let converted = store
        .convert_inventory_reservations("tenant-a", "cart-1", now)
        .await
        .unwrap();
    assert_eq!(converted, 1);

    let active_after = store
        .list_active_reservations_for_cart("tenant-a", "cart-1")
        .await
        .unwrap();
    assert!(active_after.is_empty());
}

#[tokio::test]
async fn test_inventory_reservations_cleanup_expired() {
    let store = InMemoryStore::new();
    let now = Utc::now();
    let reservation = InventoryReservation {
        id: "res-expired".to_string(),
        tenant_id: "tenant-a".to_string(),
        product_id: "prod-1".to_string(),
        variant_id: None,
        quantity: 1,
        expires_at: now - ChronoDuration::minutes(1),
        cart_id: Some("cart-2".to_string()),
        status: "active".to_string(),
        created_at: now - ChronoDuration::minutes(2),
    };

    store.reserve_inventory(reservation).await.unwrap();
    let cleaned = store
        .cleanup_expired_inventory_reservations(now)
        .await
        .unwrap();
    assert_eq!(cleaned, 1);

    let active = store
        .list_active_reservations_for_cart("tenant-a", "cart-2")
        .await
        .unwrap();
    assert!(active.is_empty());
}

#[tokio::test]
async fn test_list_pending_refunds_respects_limit() {
    let store = InMemoryStore::new();
    let asset = crate::models::get_asset("USDC").expect("asset registered");
    let now = Utc::now();

    for idx in 0..2 {
        let refund = RefundQuote {
            id: format!("refund-{}", idx),
            tenant_id: "tenant-a".to_string(),
            original_purchase_id: "orig-1".to_string(),
            recipient_wallet: "wallet-1".to_string(),
            amount: crate::models::Money::new(asset.clone(), 100),
            reason: None,
            metadata: HashMap::new(),
            created_at: now + ChronoDuration::seconds(idx),
            expires_at: now + ChronoDuration::hours(1),
            processed_by: None,
            processed_at: None,
            signature: None,
        };
        store.store_refund_quote(refund).await.unwrap();
    }

    let results = store.list_pending_refunds("tenant-a", 1).await.unwrap();
    assert_eq!(results.len(), 1);
    assert_eq!(results[0].id, "refund-0");
}

#[tokio::test]
async fn test_store_credits_hold_conflicts_on_binding_change() {
    let store = InMemoryStore::new();
    let now = Utc::now();

    let original = CreditsHold {
        tenant_id: "tenant-a".to_string(),
        hold_id: "hold-1".to_string(),
        user_id: "user-1".to_string(),
        resource_id: "prod-1".to_string(),
        amount: 100,
        amount_asset: "USDC".to_string(),
        created_at: now,
        expires_at: now + ChronoDuration::minutes(5),
    };

    store.store_credits_hold(original).await.unwrap();

    let conflicting = CreditsHold {
        tenant_id: "tenant-a".to_string(),
        hold_id: "hold-1".to_string(),
        user_id: "user-2".to_string(),
        resource_id: "prod-1".to_string(),
        amount: 100,
        amount_asset: "USDC".to_string(),
        created_at: now,
        expires_at: now + ChronoDuration::minutes(10),
    };

    let err = store.store_credits_hold(conflicting).await.unwrap_err();
    assert!(matches!(err, StorageError::Conflict));

    let persisted = store
        .get_credits_hold("tenant-a", "hold-1")
        .await
        .unwrap()
        .expect("hold");
    assert_eq!(persisted.user_id, "user-1");
}

#[tokio::test]
async fn test_store_credits_hold_refreshes_expiry_on_matching_binding() {
    let store = InMemoryStore::new();
    let now = Utc::now();

    let original = CreditsHold {
        tenant_id: "tenant-a".to_string(),
        hold_id: "hold-2".to_string(),
        user_id: "user-1".to_string(),
        resource_id: "prod-1".to_string(),
        amount: 100,
        amount_asset: "USDC".to_string(),
        created_at: now,
        expires_at: now + ChronoDuration::minutes(5),
    };

    store.store_credits_hold(original).await.unwrap();

    let refreshed_expiry = now + ChronoDuration::minutes(15);
    let refresh = CreditsHold {
        tenant_id: "tenant-a".to_string(),
        hold_id: "hold-2".to_string(),
        user_id: "user-1".to_string(),
        resource_id: "prod-1".to_string(),
        amount: 100,
        amount_asset: "USDC".to_string(),
        created_at: now,
        expires_at: refreshed_expiry,
    };

    store.store_credits_hold(refresh).await.unwrap();

    let persisted = store
        .get_credits_hold("tenant-a", "hold-2")
        .await
        .unwrap()
        .expect("hold");
    assert_eq!(persisted.expires_at, refreshed_expiry);
}
