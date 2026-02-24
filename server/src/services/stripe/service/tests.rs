//! Unit tests for StripeClient

use std::collections::HashMap;
use std::sync::Arc;

use parking_lot::Mutex;

use crate::config::Config;
use crate::errors::ErrorCode;
use crate::services::stripe::WebhookEvent;
use crate::services::ServiceError;
use crate::storage::InMemoryStore;
use crate::webhooks::Notifier;

use super::{require_session_url, StripeCheckoutSession, StripeClient};

#[test]
fn test_require_session_url_missing() {
    let session = StripeCheckoutSession {
        id: "cs_test".to_string(),
        url: None,
        payment_status: None,
        metadata: HashMap::new(),
    };

    let err = require_session_url(&session).expect_err("expected missing url error");
    match err {
        ServiceError::Coded { code, .. } => {
            assert_eq!(code, ErrorCode::StripeError)
        }
        other => panic!("unexpected error type: {other:?}"),
    }
}

#[derive(Default)]
struct TestNotifier {
    events: Mutex<Vec<crate::models::PaymentEvent>>,
}

#[async_trait::async_trait]
impl Notifier for TestNotifier {
    async fn payment_succeeded(&self, event: crate::models::PaymentEvent) {
        self.events.lock().push(event);
    }

    async fn refund_succeeded(&self, _event: crate::models::RefundEvent) {}

    async fn subscription_created(
        &self,
        _tenant_id: &str,
        _subscription_id: &str,
        _product_id: &str,
        _wallet: Option<&str>,
    ) {
    }

    async fn subscription_updated(
        &self,
        _tenant_id: &str,
        _subscription_id: &str,
        _product_id: &str,
        _wallet: Option<&str>,
    ) {
    }

    async fn subscription_cancelled(
        &self,
        _tenant_id: &str,
        _subscription_id: &str,
        _product_id: &str,
        _wallet: Option<&str>,
    ) {
    }

    async fn subscription_renewed(
        &self,
        _tenant_id: &str,
        _subscription_id: &str,
        _product_id: &str,
        _wallet: Option<&str>,
    ) {
    }

    async fn subscription_payment_failed(
        &self,
        _tenant_id: &str,
        _subscription_id: &str,
        _product_id: &str,
        _wallet: Option<&str>,
    ) {
    }

    async fn refund_processed(
        &self,
        _tenant_id: &str,
        _charge_id: &str,
        _amount: i64,
        _currency: &str,
    ) {
    }
}

#[tokio::test]
async fn test_handle_completion_uses_tenant_id() {
    let cfg = Config::default();
    let store = Arc::new(InMemoryStore::new());
    let notifier = Arc::new(TestNotifier::default());
    let client = StripeClient::new(cfg, store, notifier.clone()).unwrap();

    let mut metadata = HashMap::new();
    metadata.insert("tenant_id".to_string(), "tenant-a".to_string());

    let event = WebhookEvent {
        event_type: "checkout.session.completed".to_string(),
        session_id: "sess-1".to_string(),
        resource_id: "res-1".to_string(),
        customer: None,
        metadata,
        amount_total: 500,
        currency: "usd".to_string(),
        payment_intent: None,
    };

    client.handle_completion(event).await.unwrap();

    let events = notifier.events.lock();
    assert_eq!(events.len(), 1);
    assert_eq!(events[0].tenant_id, "tenant-a");
}
