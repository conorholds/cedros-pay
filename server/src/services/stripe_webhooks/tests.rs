use super::*;

use parking_lot::Mutex;

use crate::models::{CartQuote, PaymentTransaction, RefundQuote, Subscription, SubscriptionStatus};
use crate::storage::{
    AdminNonce, AdminStats, CreditsHold, DlqWebhook, IdempotencyResponse, InMemoryStore,
    PendingEmail, PendingWebhook, Purchase, StorageError, StorageResult, Store, WebhookStatus,
};
use crate::webhooks::{NoopNotifier, Notifier};

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

use hmac::{Hmac, Mac};
use sha2::Sha256;

#[derive(Default)]
struct FailingCompleteIdempotencyStore {
    idempotency: Mutex<std::collections::HashMap<String, (IdempotencyResponse, DateTime<Utc>)>>,
}

#[async_trait::async_trait]
impl Store for FailingCompleteIdempotencyStore {
    async fn store_cart_quote(&self, _quote: CartQuote) -> StorageResult<()> {
        unimplemented!()
    }

    async fn store_cart_quotes(&self, _quotes: Vec<CartQuote>) -> StorageResult<()> {
        unimplemented!()
    }

    async fn get_cart_quote(
        &self,
        _tenant_id: &str,
        _cart_id: &str,
    ) -> StorageResult<Option<CartQuote>> {
        unimplemented!()
    }

    async fn get_cart_quotes(
        &self,
        _tenant_id: &str,
        _cart_ids: &[String],
    ) -> StorageResult<Vec<CartQuote>> {
        unimplemented!()
    }

    async fn mark_cart_paid(
        &self,
        _tenant_id: &str,
        _cart_id: &str,
        _wallet: &str,
    ) -> StorageResult<()> {
        unimplemented!()
    }

    async fn has_cart_access(
        &self,
        _tenant_id: &str,
        _cart_id: &str,
        _wallet: &str,
    ) -> StorageResult<bool> {
        unimplemented!()
    }

    async fn cleanup_expired_cart_quotes(&self) -> StorageResult<u64> {
        unimplemented!()
    }

    async fn store_refund_quote(&self, _quote: RefundQuote) -> StorageResult<()> {
        unimplemented!()
    }

    async fn store_refund_quotes(&self, _quotes: Vec<RefundQuote>) -> StorageResult<()> {
        unimplemented!()
    }

    async fn get_refund_quote(
        &self,
        _tenant_id: &str,
        _refund_id: &str,
    ) -> StorageResult<Option<RefundQuote>> {
        unimplemented!()
    }

    async fn get_refund_by_original_purchase_id(
        &self,
        _tenant_id: &str,
        _original_purchase_id: &str,
    ) -> StorageResult<Option<RefundQuote>> {
        unimplemented!()
    }

    async fn get_all_refunds_for_purchase(
        &self,
        _tenant_id: &str,
        _original_purchase_id: &str,
    ) -> StorageResult<Vec<RefundQuote>> {
        unimplemented!()
    }

    async fn list_pending_refunds(
        &self,
        _tenant_id: &str,
        _limit: i32,
    ) -> StorageResult<Vec<RefundQuote>> {
        unimplemented!()
    }

    async fn list_credits_refund_requests(
        &self,
        _tenant_id: &str,
        _status: Option<&str>,
        _limit: i32,
        _offset: i32,
    ) -> StorageResult<(Vec<RefundQuote>, i64)> {
        unimplemented!()
    }

    async fn mark_refund_processed(
        &self,
        _tenant_id: &str,
        _refund_id: &str,
        _processed_by: &str,
        _signature: &str,
    ) -> StorageResult<()> {
        unimplemented!()
    }

    async fn delete_refund_quote(&self, _tenant_id: &str, _refund_id: &str) -> StorageResult<()> {
        unimplemented!()
    }

    async fn cleanup_expired_refund_quotes(&self) -> StorageResult<u64> {
        unimplemented!()
    }

    async fn store_stripe_refund_request(
        &self,
        _req: crate::models::StripeRefundRequest,
    ) -> StorageResult<()> {
        unimplemented!()
    }

    async fn get_stripe_refund_request(
        &self,
        _tenant_id: &str,
        _request_id: &str,
    ) -> StorageResult<Option<crate::models::StripeRefundRequest>> {
        unimplemented!()
    }

    async fn list_pending_stripe_refund_requests(
        &self,
        _tenant_id: &str,
        _limit: i32,
    ) -> StorageResult<Vec<crate::models::StripeRefundRequest>> {
        unimplemented!()
    }

    async fn get_pending_stripe_refund_request_by_original_purchase_id(
        &self,
        _tenant_id: &str,
        _original_purchase_id: &str,
    ) -> StorageResult<Option<crate::models::StripeRefundRequest>> {
        unimplemented!()
    }

    async fn get_stripe_refund_request_by_charge_id(
        &self,
        _tenant_id: &str,
        _stripe_charge_id: &str,
    ) -> StorageResult<Option<crate::models::StripeRefundRequest>> {
        Ok(None)
    }

    async fn try_store_order(&self, _order: crate::models::Order) -> StorageResult<bool> {
        Ok(false)
    }

    async fn get_order(
        &self,
        _tenant_id: &str,
        _order_id: &str,
    ) -> StorageResult<Option<crate::models::Order>> {
        Ok(None)
    }

    async fn list_orders(
        &self,
        _tenant_id: &str,
        _limit: i32,
        _offset: i32,
    ) -> StorageResult<Vec<crate::models::Order>> {
        Ok(Vec::new())
    }

    async fn list_orders_filtered(
        &self,
        _tenant_id: &str,
        _status: Option<&str>,
        _search: Option<&str>,
        _created_before: Option<DateTime<Utc>>,
        _created_after: Option<DateTime<Utc>>,
        _limit: i32,
        _offset: i32,
    ) -> StorageResult<(Vec<crate::models::Order>, i64)> {
        Ok((Vec::new(), 0))
    }

    async fn update_order_status(
        &self,
        _tenant_id: &str,
        _order_id: &str,
        _status: &str,
        _status_updated_at: DateTime<Utc>,
        _updated_at: DateTime<Utc>,
    ) -> StorageResult<()> {
        Ok(())
    }

    async fn append_order_history(
        &self,
        _entry: crate::models::OrderHistoryEntry,
    ) -> StorageResult<()> {
        Ok(())
    }

    async fn update_order_status_with_history(
        &self,
        _tenant_id: &str,
        _order_id: &str,
        _status: &str,
        _status_updated_at: DateTime<Utc>,
        _updated_at: DateTime<Utc>,
        _entry: crate::models::OrderHistoryEntry,
    ) -> StorageResult<()> {
        Ok(())
    }

    async fn list_order_history(
        &self,
        _tenant_id: &str,
        _order_id: &str,
        _limit: i32,
    ) -> StorageResult<Vec<crate::models::OrderHistoryEntry>> {
        Ok(Vec::new())
    }

    async fn create_fulfillment(
        &self,
        _fulfillment: crate::models::Fulfillment,
    ) -> StorageResult<()> {
        Ok(())
    }

    async fn list_fulfillments(
        &self,
        _tenant_id: &str,
        _order_id: &str,
        _limit: i32,
    ) -> StorageResult<Vec<crate::models::Fulfillment>> {
        Ok(Vec::new())
    }

    async fn update_fulfillment_status(
        &self,
        _tenant_id: &str,
        _fulfillment_id: &str,
        _status: &str,
        _shipped_at: Option<DateTime<Utc>>,
        _delivered_at: Option<DateTime<Utc>>,
        _updated_at: DateTime<Utc>,
        _tracking_number: Option<&str>,
        _tracking_url: Option<&str>,
        _carrier: Option<&str>,
    ) -> StorageResult<Option<crate::models::Fulfillment>> {
        Ok(None)
    }

    async fn create_return_request(
        &self,
        _request: crate::models::ReturnRequest,
    ) -> StorageResult<()> {
        Ok(())
    }

    async fn update_return_status(
        &self,
        _tenant_id: &str,
        _return_id: &str,
        _status: &str,
        _status_updated_at: DateTime<Utc>,
        _updated_at: DateTime<Utc>,
    ) -> StorageResult<()> {
        Ok(())
    }

    async fn get_return_request(
        &self,
        _tenant_id: &str,
        _return_id: &str,
    ) -> StorageResult<Option<crate::models::ReturnRequest>> {
        Ok(None)
    }

    async fn list_return_requests(
        &self,
        _tenant_id: &str,
        _status: Option<&str>,
        _order_id: Option<&str>,
        _limit: i32,
        _offset: i32,
    ) -> StorageResult<Vec<crate::models::ReturnRequest>> {
        Ok(Vec::new())
    }

    async fn reserve_inventory(
        &self,
        _reservation: crate::models::InventoryReservation,
    ) -> StorageResult<()> {
        Ok(())
    }

    async fn get_active_inventory_reservation_quantity(
        &self,
        _tenant_id: &str,
        _product_id: &str,
        _variant_id: Option<&str>,
        _now: DateTime<Utc>,
    ) -> StorageResult<i64> {
        Ok(0)
    }

    async fn get_active_inventory_reservation_quantity_excluding_cart(
        &self,
        _tenant_id: &str,
        _product_id: &str,
        _variant_id: Option<&str>,
        _exclude_cart_id: &str,
        _now: DateTime<Utc>,
    ) -> StorageResult<i64> {
        Ok(0)
    }

    async fn list_active_reservations_for_cart(
        &self,
        _tenant_id: &str,
        _cart_id: &str,
    ) -> StorageResult<Vec<crate::models::InventoryReservation>> {
        Ok(Vec::new())
    }

    async fn release_inventory_reservations(
        &self,
        _tenant_id: &str,
        _cart_id: &str,
        _released_at: DateTime<Utc>,
    ) -> StorageResult<u64> {
        Ok(0)
    }

    async fn convert_inventory_reservations(
        &self,
        _tenant_id: &str,
        _cart_id: &str,
        _converted_at: DateTime<Utc>,
    ) -> StorageResult<u64> {
        Ok(0)
    }

    async fn cleanup_expired_inventory_reservations(
        &self,
        _now: DateTime<Utc>,
    ) -> StorageResult<u64> {
        Ok(0)
    }

    async fn record_inventory_adjustment(
        &self,
        _adjustment: crate::models::InventoryAdjustment,
    ) -> StorageResult<()> {
        Ok(())
    }

    async fn list_inventory_adjustments(
        &self,
        _tenant_id: &str,
        _product_id: &str,
        _limit: i32,
        _offset: i32,
    ) -> StorageResult<Vec<crate::models::InventoryAdjustment>> {
        Ok(Vec::new())
    }

    async fn update_inventory_batch(
        &self,
        _tenant_id: &str,
        _updates: Vec<(String, Option<String>, i32)>,
        _reason: Option<&str>,
        _actor: Option<&str>,
    ) -> StorageResult<std::collections::HashMap<String, (i32, i32)>> {
        Ok(std::collections::HashMap::new())
    }

    async fn adjust_inventory_atomic(
        &self,
        _tenant_id: &str,
        _product_id: &str,
        _delta: i32,
    ) -> StorageResult<(i32, i32)> {
        Ok((0, 0))
    }

    async fn create_shipping_profile(
        &self,
        _profile: crate::models::ShippingProfile,
    ) -> StorageResult<()> {
        Ok(())
    }

    async fn update_shipping_profile(
        &self,
        _profile: crate::models::ShippingProfile,
    ) -> StorageResult<()> {
        Ok(())
    }

    async fn get_shipping_profile(
        &self,
        _tenant_id: &str,
        _profile_id: &str,
    ) -> StorageResult<Option<crate::models::ShippingProfile>> {
        Ok(None)
    }

    async fn list_shipping_profiles(
        &self,
        _tenant_id: &str,
        _limit: i32,
        _offset: i32,
    ) -> StorageResult<Vec<crate::models::ShippingProfile>> {
        Ok(Vec::new())
    }

    async fn delete_shipping_profile(
        &self,
        _tenant_id: &str,
        _profile_id: &str,
    ) -> StorageResult<()> {
        Ok(())
    }

    async fn create_shipping_rate(&self, _rate: crate::models::ShippingRate) -> StorageResult<()> {
        Ok(())
    }

    async fn update_shipping_rate(&self, _rate: crate::models::ShippingRate) -> StorageResult<()> {
        Ok(())
    }

    async fn list_shipping_rates(
        &self,
        _tenant_id: &str,
        _profile_id: &str,
        _limit: i32,
        _offset: i32,
    ) -> StorageResult<Vec<crate::models::ShippingRate>> {
        Ok(Vec::new())
    }

    async fn delete_shipping_rate(&self, _tenant_id: &str, _rate_id: &str) -> StorageResult<()> {
        Ok(())
    }

    async fn create_tax_rate(&self, _rate: crate::models::TaxRate) -> StorageResult<()> {
        Ok(())
    }

    async fn update_tax_rate(&self, _rate: crate::models::TaxRate) -> StorageResult<()> {
        Ok(())
    }

    async fn get_tax_rate(
        &self,
        _tenant_id: &str,
        _rate_id: &str,
    ) -> StorageResult<Option<crate::models::TaxRate>> {
        Ok(None)
    }

    async fn list_tax_rates(
        &self,
        _tenant_id: &str,
        _limit: i32,
        _offset: i32,
    ) -> StorageResult<Vec<crate::models::TaxRate>> {
        Ok(Vec::new())
    }

    async fn delete_tax_rate(&self, _tenant_id: &str, _rate_id: &str) -> StorageResult<()> {
        Ok(())
    }

    async fn create_customer(&self, _customer: crate::models::Customer) -> StorageResult<()> {
        Ok(())
    }

    async fn update_customer(&self, _customer: crate::models::Customer) -> StorageResult<()> {
        Ok(())
    }

    async fn get_customer(
        &self,
        _tenant_id: &str,
        _customer_id: &str,
    ) -> StorageResult<Option<crate::models::Customer>> {
        Ok(None)
    }

    async fn list_customers(
        &self,
        _tenant_id: &str,
        _limit: i32,
        _offset: i32,
    ) -> StorageResult<Vec<crate::models::Customer>> {
        Ok(Vec::new())
    }

    async fn create_dispute(&self, _dispute: crate::models::DisputeRecord) -> StorageResult<()> {
        Ok(())
    }

    async fn update_dispute_status(
        &self,
        _tenant_id: &str,
        _dispute_id: &str,
        _status: &str,
        _status_updated_at: DateTime<Utc>,
        _updated_at: DateTime<Utc>,
    ) -> StorageResult<()> {
        Ok(())
    }

    async fn get_dispute(
        &self,
        _tenant_id: &str,
        _dispute_id: &str,
    ) -> StorageResult<Option<crate::models::DisputeRecord>> {
        Ok(None)
    }

    async fn list_disputes(
        &self,
        _tenant_id: &str,
        _status: Option<&str>,
        _source: Option<&str>,
        _order_id: Option<&str>,
        _limit: i32,
        _offset: i32,
    ) -> StorageResult<Vec<crate::models::DisputeRecord>> {
        Ok(Vec::new())
    }

    async fn create_gift_card(&self, _card: crate::models::GiftCard) -> StorageResult<()> {
        Ok(())
    }

    async fn update_gift_card(&self, _card: crate::models::GiftCard) -> StorageResult<()> {
        Ok(())
    }

    async fn get_gift_card(
        &self,
        _tenant_id: &str,
        _code: &str,
    ) -> StorageResult<Option<crate::models::GiftCard>> {
        Ok(None)
    }

    async fn list_gift_cards(
        &self,
        _tenant_id: &str,
        _active_only: Option<bool>,
        _limit: i32,
        _offset: i32,
    ) -> StorageResult<Vec<crate::models::GiftCard>> {
        Ok(Vec::new())
    }

    async fn adjust_gift_card_balance(
        &self,
        _tenant_id: &str,
        _code: &str,
        _new_balance: i64,
        _updated_at: DateTime<Utc>,
    ) -> StorageResult<()> {
        Ok(())
    }

    async fn try_adjust_gift_card_balance(
        &self,
        _tenant_id: &str,
        _code: &str,
        _deduction: i64,
        _updated_at: DateTime<Utc>,
    ) -> StorageResult<Option<i64>> {
        Ok(Some(0)) // Default mock: always succeeds
    }

    async fn create_collection(&self, _collection: crate::models::Collection) -> StorageResult<()> {
        Ok(())
    }

    async fn update_collection(&self, _collection: crate::models::Collection) -> StorageResult<()> {
        Ok(())
    }

    async fn get_collection(
        &self,
        _tenant_id: &str,
        _collection_id: &str,
    ) -> StorageResult<Option<crate::models::Collection>> {
        Ok(None)
    }

    async fn list_collections(
        &self,
        _tenant_id: &str,
        _active_only: Option<bool>,
        _limit: i32,
        _offset: i32,
    ) -> StorageResult<Vec<crate::models::Collection>> {
        Ok(Vec::new())
    }

    async fn delete_collection(&self, _tenant_id: &str, _collection_id: &str) -> StorageResult<()> {
        Ok(())
    }

    async fn record_payment(&self, _tx: PaymentTransaction) -> StorageResult<()> {
        unimplemented!()
    }

    async fn record_payments(&self, _txs: Vec<PaymentTransaction>) -> StorageResult<()> {
        unimplemented!()
    }

    async fn try_record_payment(&self, _tx: PaymentTransaction) -> StorageResult<bool> {
        unimplemented!()
    }

    async fn delete_payment(&self, _tenant_id: &str, _signature: &str) -> StorageResult<()> {
        unimplemented!()
    }

    async fn has_payment_been_processed(
        &self,
        _tenant_id: &str,
        _signature: &str,
    ) -> StorageResult<bool> {
        unimplemented!()
    }

    async fn get_payment(
        &self,
        _tenant_id: &str,
        _signature: &str,
    ) -> StorageResult<Option<PaymentTransaction>> {
        unimplemented!()
    }

    async fn get_purchase_by_signature(
        &self,
        _tenant_id: &str,
        _signature: &str,
    ) -> StorageResult<Option<Purchase>> {
        unimplemented!()
    }

    async fn store_credits_hold(&self, _hold: CreditsHold) -> StorageResult<()> {
        unimplemented!()
    }

    async fn get_credits_hold(
        &self,
        _tenant_id: &str,
        _hold_id: &str,
    ) -> StorageResult<Option<CreditsHold>> {
        unimplemented!()
    }

    async fn delete_credits_hold(&self, _tenant_id: &str, _hold_id: &str) -> StorageResult<()> {
        unimplemented!()
    }

    async fn cleanup_expired_credits_holds(&self) -> StorageResult<u64> {
        unimplemented!()
    }

    async fn list_purchases_by_user_id(
        &self,
        _tenant_id: &str,
        _user_id: &str,
        _limit: i64,
        _offset: i64,
    ) -> StorageResult<Vec<Purchase>> {
        unimplemented!()
    }

    async fn has_valid_access(
        &self,
        _tenant_id: &str,
        _resource: &str,
        _wallet: &str,
    ) -> StorageResult<bool> {
        unimplemented!()
    }

    async fn archive_old_payments(&self, _older_than: DateTime<Utc>) -> StorageResult<u64> {
        unimplemented!()
    }

    async fn create_nonce(&self, _nonce: AdminNonce) -> StorageResult<()> {
        unimplemented!()
    }

    async fn get_nonce(
        &self,
        _tenant_id: &str,
        _nonce_id: &str,
    ) -> StorageResult<Option<AdminNonce>> {
        unimplemented!()
    }

    async fn consume_nonce(&self, _tenant_id: &str, _nonce_id: &str) -> StorageResult<()> {
        unimplemented!()
    }

    async fn cleanup_expired_nonces(&self) -> StorageResult<u64> {
        unimplemented!()
    }

    async fn enqueue_webhook(&self, _webhook: PendingWebhook) -> StorageResult<String> {
        unimplemented!()
    }

    async fn dequeue_webhooks(&self, _limit: i32) -> StorageResult<Vec<PendingWebhook>> {
        unimplemented!()
    }

    async fn mark_webhook_processing(&self, _webhook_id: &str) -> StorageResult<()> {
        unimplemented!()
    }

    async fn mark_webhook_success(&self, _webhook_id: &str) -> StorageResult<()> {
        unimplemented!()
    }

    async fn mark_webhook_failed(
        &self,
        _webhook_id: &str,
        _error: &str,
        _next_attempt_at: DateTime<Utc>,
    ) -> StorageResult<()> {
        unimplemented!()
    }

    async fn mark_webhook_retry(
        &self,
        _webhook_id: &str,
        _error: &str,
        _next_attempt_at: DateTime<Utc>,
    ) -> StorageResult<()> {
        unimplemented!()
    }

    async fn get_webhook(&self, _webhook_id: &str) -> StorageResult<Option<PendingWebhook>> {
        unimplemented!()
    }

    async fn list_webhooks(
        &self,
        _tenant_id: &str,
        _status: Option<WebhookStatus>,
        _limit: i32,
    ) -> StorageResult<Vec<PendingWebhook>> {
        unimplemented!()
    }

    async fn retry_webhook(&self, _webhook_id: &str) -> StorageResult<()> {
        unimplemented!()
    }

    async fn delete_webhook(&self, _webhook_id: &str) -> StorageResult<()> {
        unimplemented!()
    }

    async fn cleanup_old_webhooks(&self, _retention_days: i32) -> StorageResult<u64> {
        unimplemented!()
    }

    async fn save_idempotency_key(
        &self,
        key: &str,
        response: IdempotencyResponse,
        ttl: std::time::Duration,
    ) -> StorageResult<()> {
        if ttl == WEBHOOK_COMPLETED_TTL {
            return Err(StorageError::Database(
                "forced idempotency completion failure".into(),
            ));
        }

        let expires_at = Utc::now()
            + chrono::Duration::from_std(ttl).unwrap_or_else(|_| chrono::Duration::minutes(5));
        self.idempotency
            .lock()
            .insert(key.to_string(), (response, expires_at));
        Ok(())
    }

    async fn get_idempotency_key(&self, key: &str) -> StorageResult<Option<IdempotencyResponse>> {
        let now = Utc::now();
        let mut guard = self.idempotency.lock();
        if let Some((resp, expires_at)) = guard.get(key) {
            if *expires_at > now {
                return Ok(Some(resp.clone()));
            }
        }
        guard.remove(key);
        Ok(None)
    }

    async fn delete_idempotency_key(&self, key: &str) -> StorageResult<()> {
        self.idempotency.lock().remove(key);
        Ok(())
    }

    async fn cleanup_expired_idempotency_keys(&self) -> StorageResult<u64> {
        unimplemented!()
    }

    async fn save_subscription(&self, _sub: Subscription) -> StorageResult<()> {
        unimplemented!()
    }

    async fn get_subscription(
        &self,
        _tenant_id: &str,
        _id: &str,
    ) -> StorageResult<Option<Subscription>> {
        unimplemented!()
    }

    async fn get_subscription_by_wallet(
        &self,
        _tenant_id: &str,
        _wallet: &str,
        _product_id: &str,
    ) -> StorageResult<Option<Subscription>> {
        unimplemented!()
    }

    async fn get_subscriptions_by_wallet(
        &self,
        _tenant_id: &str,
        _wallet: &str,
    ) -> StorageResult<Vec<Subscription>> {
        unimplemented!()
    }

    async fn get_subscription_by_stripe_id(
        &self,
        _tenant_id: &str,
        _stripe_sub_id: &str,
    ) -> StorageResult<Option<Subscription>> {
        unimplemented!()
    }

    async fn find_subscription_by_stripe_id(
        &self,
        _stripe_sub_id: &str,
    ) -> StorageResult<Option<Subscription>> {
        unimplemented!()
    }

    async fn get_subscription_by_payment_signature(
        &self,
        _tenant_id: &str,
        _payment_signature: &str,
    ) -> StorageResult<Option<Subscription>> {
        Ok(None)
    }

    async fn list_active_subscriptions(
        &self,
        _tenant_id: &str,
        _product_id: Option<&str>,
    ) -> StorageResult<Vec<Subscription>> {
        unimplemented!()
    }

    async fn list_expiring_subscriptions(
        &self,
        _tenant_id: &str,
        _before: DateTime<Utc>,
    ) -> StorageResult<Vec<Subscription>> {
        unimplemented!()
    }

    async fn update_subscription_status(
        &self,
        _tenant_id: &str,
        _id: &str,
        _status: SubscriptionStatus,
    ) -> StorageResult<()> {
        unimplemented!()
    }

    async fn delete_subscription(&self, _tenant_id: &str, _id: &str) -> StorageResult<()> {
        unimplemented!()
    }

    async fn get_subscriptions_by_stripe_customer_id(
        &self,
        _tenant_id: &str,
        _customer_id: &str,
    ) -> StorageResult<Vec<Subscription>> {
        unimplemented!()
    }

    async fn list_subscriptions_by_product(
        &self,
        _tenant_id: &str,
        _product_id: &str,
    ) -> StorageResult<Vec<Subscription>> {
        unimplemented!()
    }

    async fn count_subscriptions_by_plan(
        &self,
        _tenant_id: &str,
        _plan_id: &str,
    ) -> StorageResult<i64> {
        Ok(0)
    }

    async fn list_tenant_ids(&self) -> StorageResult<Vec<String>> {
        unimplemented!()
    }

    async fn move_to_dlq(&self, _webhook: PendingWebhook, _final_error: &str) -> StorageResult<()> {
        unimplemented!()
    }

    async fn list_dlq(&self, _tenant_id: &str, _limit: i32) -> StorageResult<Vec<DlqWebhook>> {
        unimplemented!()
    }

    async fn get_dlq_entry(&self, _dlq_id: &str) -> StorageResult<Option<DlqWebhook>> {
        unimplemented!()
    }

    async fn retry_from_dlq(&self, _dlq_id: &str) -> StorageResult<()> {
        unimplemented!()
    }

    async fn delete_from_dlq(&self, _dlq_id: &str) -> StorageResult<()> {
        unimplemented!()
    }

    async fn get_admin_stats(&self, _tenant_id: &str) -> StorageResult<AdminStats> {
        unimplemented!()
    }

    async fn list_purchases(
        &self,
        _tenant_id: &str,
        _method: Option<&str>,
        _limit: i32,
        _offset: i32,
    ) -> StorageResult<Vec<Purchase>> {
        unimplemented!()
    }

    async fn close(&self) -> StorageResult<()> {
        unimplemented!()
    }

    async fn health_check(&self) -> StorageResult<()> {
        unimplemented!()
    }

    // Chat methods (unimplemented for this test mock)
    async fn create_chat_session(&self, _session: crate::models::ChatSession) -> StorageResult<()> {
        unimplemented!()
    }

    async fn get_chat_session(
        &self,
        _tenant_id: &str,
        _session_id: &str,
    ) -> StorageResult<Option<crate::models::ChatSession>> {
        unimplemented!()
    }

    async fn update_chat_session(
        &self,
        _tenant_id: &str,
        _session_id: &str,
        _message_count: i32,
        _last_message_at: DateTime<Utc>,
        _updated_at: DateTime<Utc>,
    ) -> StorageResult<()> {
        unimplemented!()
    }

    async fn list_chat_sessions(
        &self,
        _tenant_id: &str,
        _customer_id: Option<&str>,
        _status: Option<&str>,
        _limit: i32,
        _offset: i32,
    ) -> StorageResult<(Vec<crate::models::ChatSession>, i64)> {
        unimplemented!()
    }

    async fn create_chat_message(&self, _message: crate::models::ChatMessage) -> StorageResult<()> {
        unimplemented!()
    }

    async fn list_chat_messages(
        &self,
        _tenant_id: &str,
        _session_id: &str,
        _limit: i32,
        _offset: i32,
    ) -> StorageResult<Vec<crate::models::ChatMessage>> {
        unimplemented!()
    }

    async fn create_faq(&self, _faq: crate::models::Faq) -> StorageResult<()> {
        unimplemented!()
    }

    async fn get_faq(
        &self,
        _tenant_id: &str,
        _faq_id: &str,
    ) -> StorageResult<Option<crate::models::Faq>> {
        unimplemented!()
    }

    async fn update_faq(&self, _faq: crate::models::Faq) -> StorageResult<()> {
        unimplemented!()
    }

    async fn delete_faq(&self, _tenant_id: &str, _faq_id: &str) -> StorageResult<()> {
        unimplemented!()
    }

    async fn list_faqs(
        &self,
        _tenant_id: &str,
        _active_only: bool,
        _limit: i32,
        _offset: i32,
    ) -> StorageResult<(Vec<crate::models::Faq>, i64)> {
        unimplemented!()
    }

    async fn search_faqs(
        &self,
        _tenant_id: &str,
        _query: &str,
        _limit: i32,
    ) -> StorageResult<Vec<crate::models::Faq>> {
        unimplemented!()
    }

    async fn list_public_faqs(
        &self,
        _tenant_id: &str,
        _limit: i32,
        _offset: i32,
    ) -> StorageResult<(Vec<crate::models::Faq>, i64)> {
        unimplemented!()
    }

    fn as_any(&self) -> &dyn std::any::Any {
        self
    }

    // Email queue methods (unimplemented for this test mock)
    async fn enqueue_email(&self, _email: PendingEmail) -> StorageResult<String> {
        unimplemented!()
    }

    async fn dequeue_emails(&self, _limit: i32) -> StorageResult<Vec<PendingEmail>> {
        unimplemented!()
    }

    async fn mark_email_processing(&self, _email_id: &str) -> StorageResult<()> {
        unimplemented!()
    }

    async fn mark_email_success(&self, _email_id: &str) -> StorageResult<()> {
        unimplemented!()
    }

    async fn mark_email_retry(
        &self,
        _email_id: &str,
        _error: &str,
        _next_attempt_at: DateTime<Utc>,
    ) -> StorageResult<()> {
        unimplemented!()
    }

    async fn mark_email_failed(&self, _email_id: &str, _error: &str) -> StorageResult<()> {
        unimplemented!()
    }

    async fn get_email(&self, _email_id: &str) -> StorageResult<Option<PendingEmail>> {
        unimplemented!()
    }

    async fn cleanup_old_emails(&self, _retention_days: i32) -> StorageResult<u64> {
        unimplemented!()
    }
}

#[tokio::test]
async fn test_webhook_claim_uses_idempotency_store() {
    let mut cfg = Config::default();
    cfg.stripe.webhook_secret = "whsec_test".to_string();
    let cfg = Arc::new(cfg);

    let store = Arc::new(InMemoryStore::new());
    let notifier = Arc::new(TestNotifier::default());
    let subscription_service = Arc::new(SubscriptionService::new(
        cfg.clone(),
        store.clone(),
        Arc::new(NoopNotifier),
    ));
    let processor = StripeWebhookProcessor::new(
        cfg.clone(),
        store.clone(),
        notifier,
        subscription_service,
        Arc::new(crate::repositories::InMemoryProductRepository::new(
            Vec::new(),
        )),
    );

    let key = "stripe_webhook:evt_1";
    assert!(processor.try_claim_webhook(key).await.unwrap());
    assert!(!processor.try_claim_webhook(key).await.unwrap());

    processor.release_webhook_claim(key).await;
    assert!(processor.try_claim_webhook(key).await.unwrap());
}

#[tokio::test]
async fn test_process_webhook_does_not_release_claim_on_completion_failure() {
    let mut cfg = Config::default();
    cfg.stripe.webhook_secret = "whsec_test".to_string();
    let cfg = Arc::new(cfg);

    let store = Arc::new(FailingCompleteIdempotencyStore::default());
    let subscription_service = Arc::new(SubscriptionService::new(
        cfg.clone(),
        store.clone(),
        Arc::new(NoopNotifier),
    ));
    let processor = StripeWebhookProcessor::new(
        cfg.clone(),
        store.clone(),
        Arc::new(NoopNotifier),
        subscription_service,
        Arc::new(crate::repositories::InMemoryProductRepository::new(
            Vec::new(),
        )),
    );

    let ts = Utc::now().timestamp();
    let payload = serde_json::json!({
        "id": "evt_complete_fail",
        "type": "some.unknown.event",
        "data": {"object": {}}
    });

    let body = serde_json::to_vec(&payload).unwrap();
    let signed_payload = format!("{}.{}", ts, String::from_utf8_lossy(&body));
    let mut mac = Hmac::<Sha256>::new_from_slice(cfg.stripe.webhook_secret.as_bytes()).unwrap();
    mac.update(signed_payload.as_bytes());
    let sig = hex::encode(mac.finalize().into_bytes());
    let header = format!("t={},v1={}", ts, sig);

    processor.process_webhook(&body, &header).await.unwrap();

    // Completion marker write fails; the processing claim should still exist (not released).
    let key = "stripe_webhook:evt_complete_fail";
    assert!(store.get_idempotency_key(key).await.unwrap().is_some());
}

#[tokio::test]
async fn test_webhook_claim_is_atomic_under_concurrency() {
    let mut cfg = Config::default();
    cfg.stripe.webhook_secret = "whsec_test".to_string();
    let cfg = Arc::new(cfg);

    let store = Arc::new(InMemoryStore::new());
    let notifier = Arc::new(TestNotifier::default());
    let subscription_service = Arc::new(SubscriptionService::new(
        cfg.clone(),
        store.clone(),
        Arc::new(NoopNotifier),
    ));
    let processor = Arc::new(StripeWebhookProcessor::new(
        cfg,
        store,
        notifier,
        subscription_service,
        Arc::new(crate::repositories::InMemoryProductRepository::new(
            Vec::new(),
        )),
    ));

    let key = "stripe_webhook:evt_concurrent".to_string();
    let p1 = processor.clone();
    let k1 = key.clone();
    let t1 = tokio::spawn(async move { p1.try_claim_webhook(&k1).await.unwrap() });

    let p2 = processor.clone();
    let k2 = key.clone();
    let t2 = tokio::spawn(async move { p2.try_claim_webhook(&k2).await.unwrap() });

    let (r1, r2) = tokio::join!(t1, t2);
    let claimed1 = r1.unwrap();
    let claimed2 = r2.unwrap();

    assert!(
        claimed1 ^ claimed2,
        "exactly one concurrent claim should win"
    );
}

#[tokio::test]
async fn test_checkout_completed_records_stripe_payment() {
    let mut cfg = Config::default();
    cfg.stripe.webhook_secret = "whsec_test".to_string();

    let cfg = Arc::new(cfg);
    let store = Arc::new(InMemoryStore::new());
    let notifier = Arc::new(TestNotifier::default());
    let subscription_service = Arc::new(SubscriptionService::new(
        cfg.clone(),
        store.clone(),
        Arc::new(NoopNotifier),
    ));
    let processor = StripeWebhookProcessor::new(
        cfg.clone(),
        store.clone(),
        notifier.clone(),
        subscription_service,
        Arc::new(crate::repositories::InMemoryProductRepository::new(
            Vec::new(),
        )),
    );

    // Use a fixed timestamp within tolerance.
    let ts = Utc::now().timestamp();
    let payload = serde_json::json!({
        "id": "evt_1",
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": "cs_test_1",
                "mode": "payment",
                "customer": "cus_1",
                "amount_total": 500,
                "currency": "usd",
                "metadata": {
                    "tenant_id": "tenant-a",
                    "resource_id": "res-1"
                }
            }
        }
    });

    let body = serde_json::to_vec(&payload).unwrap();
    let signed_payload = format!("{}.{}", ts, String::from_utf8_lossy(&body));
    let mut mac = Hmac::<Sha256>::new_from_slice(cfg.stripe.webhook_secret.as_bytes()).unwrap();
    mac.update(signed_payload.as_bytes());
    let sig = hex::encode(mac.finalize().into_bytes());
    let header = format!("t={},v1={}", ts, sig);

    processor.process_webhook(&body, &header).await.unwrap();

    // Payment is recorded under stripe:<session_id>.
    let stored = store
        .get_payment("tenant-a", "stripe:cs_test_1")
        .await
        .unwrap()
        .expect("payment recorded");
    assert_eq!(stored.resource_id, "res-1");
}

#[tokio::test]
async fn test_checkout_completed_stores_order_and_decrements_inventory() {
    let mut cfg = Config::default();
    cfg.stripe.webhook_secret = "whsec_test".to_string();

    let cfg = Arc::new(cfg);
    let store = Arc::new(InMemoryStore::new());
    let notifier = Arc::new(TestNotifier::default());
    let subscription_service = Arc::new(SubscriptionService::new(
        cfg.clone(),
        store.clone(),
        Arc::new(NoopNotifier),
    ));

    let product_repo = Arc::new(crate::repositories::InMemoryProductRepository::new(vec![
        crate::models::Product {
            id: "res-1".to_string(),
            tenant_id: "tenant-a".to_string(),
            description: "desc".to_string(),
            active: true,
            inventory_quantity: Some(2),
            ..Default::default()
        },
    ]));

    let processor = StripeWebhookProcessor::new(
        cfg.clone(),
        store.clone(),
        notifier,
        subscription_service,
        product_repo.clone(),
    );

    let event: RawStripeEvent = serde_json::from_value(serde_json::json!({
        "id": "evt_1",
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": "cs_test_1",
                "mode": "payment",
                "customer": "cus_1",
                "amount_total": 500,
                "currency": "usd",
                "customer_details": {
                    "email": "a@example.com",
                    "name": "A",
                    "phone": "+15555555555"
                },
                "shipping_details": {
                    "name": "A",
                    "phone": "+15555555555",
                    "address": {
                        "line1": "1 Main",
                        "city": "SF",
                        "state": "CA",
                        "postal_code": "94105",
                        "country": "US"
                    }
                },
                "metadata": {
                    "tenant_id": "tenant-a",
                    "resource_id": "res-1"
                }
            }
        }
    }))
    .unwrap();

    processor.handle_checkout_completed(&event).await.unwrap();

    let orders = store.list_orders("tenant-a", 10, 0).await.unwrap();
    assert_eq!(orders.len(), 1);
    assert_eq!(orders[0].purchase_id, "cs_test_1");
    assert_eq!(orders[0].resource_id, "res-1");
    assert_eq!(orders[0].customer_email.as_deref(), Some("a@example.com"));
    assert!(orders[0].shipping.is_some());

    let updated = product_repo.get_product("tenant-a", "res-1").await.unwrap();
    assert_eq!(updated.inventory_quantity, Some(1));

    let adjustments = store
        .list_inventory_adjustments("tenant-a", "res-1", 10, 0)
        .await
        .unwrap();
    assert_eq!(adjustments.len(), 1);
    assert_eq!(adjustments[0].delta, -1);
}

#[tokio::test]
async fn test_checkout_completed_aggregates_inventory_updates_for_duplicates() {
    let mut cfg = Config::default();
    cfg.stripe.webhook_secret = "whsec_test".to_string();

    let cfg = Arc::new(cfg);
    let store = Arc::new(InMemoryStore::new());
    let notifier = Arc::new(TestNotifier::default());
    let subscription_service = Arc::new(SubscriptionService::new(
        cfg.clone(),
        store.clone(),
        Arc::new(NoopNotifier),
    ));

    let product_repo = Arc::new(crate::repositories::InMemoryProductRepository::new(vec![
        crate::models::Product {
            id: "res-1".to_string(),
            tenant_id: "tenant-a".to_string(),
            description: "desc".to_string(),
            active: true,
            inventory_quantity: Some(5),
            ..Default::default()
        },
    ]));

    let processor = StripeWebhookProcessor::new(
        cfg.clone(),
        store.clone(),
        notifier,
        subscription_service,
        product_repo.clone(),
    );

    let cart_id = "cart-dup";
    let cart = crate::models::CartQuote {
        id: cart_id.to_string(),
        tenant_id: "tenant-a".to_string(),
        items: vec![
            crate::models::CartItem {
                resource_id: "res-1".to_string(),
                variant_id: None,
                quantity: 1,
                price: crate::models::Money::new(crate::models::get_asset("USD").unwrap(), 100),
                original_price: None,
                description: None,
                applied_coupons: Vec::new(),
                metadata: Default::default(),
            },
            crate::models::CartItem {
                resource_id: "res-1".to_string(),
                variant_id: None,
                quantity: 2,
                price: crate::models::Money::new(crate::models::get_asset("USD").unwrap(), 100),
                original_price: None,
                description: None,
                applied_coupons: Vec::new(),
                metadata: Default::default(),
            },
        ],
        total: crate::models::Money::new(crate::models::get_asset("USD").unwrap(), 300),
        original_total: None,
        metadata: Default::default(),
        applied_coupons: Vec::new(),
        created_at: Utc::now(),
        expires_at: Utc::now(),
        wallet_paid_by: None,
    };
    store.store_cart_quote(cart).await.unwrap();

    let event: RawStripeEvent = serde_json::from_value(serde_json::json!({
        "id": "evt_1",
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": "cs_test_1",
                "mode": "payment",
                "customer": "cus_1",
                "amount_total": 300,
                "currency": "usd",
                "metadata": {
                    "tenant_id": "tenant-a",
                    "resource_id": "cart:cart-dup"
                }
            }
        }
    }))
    .unwrap();

    processor.handle_checkout_completed(&event).await.unwrap();

    let updated = product_repo.get_product("tenant-a", "res-1").await.unwrap();
    assert_eq!(updated.inventory_quantity, Some(2));

    let adjustments = store
        .list_inventory_adjustments("tenant-a", "res-1", 10, 0)
        .await
        .unwrap();
    assert_eq!(adjustments.len(), 1);
    assert_eq!(adjustments[0].delta, -3);
}

#[tokio::test]
async fn test_checkout_completed_replay_converts_reservations() {
    let mut cfg = Config::default();
    cfg.stripe.webhook_secret = "whsec_test".to_string();

    let cfg = Arc::new(cfg);
    let store = Arc::new(InMemoryStore::new());
    let notifier = Arc::new(TestNotifier::default());
    let subscription_service = Arc::new(SubscriptionService::new(
        cfg.clone(),
        store.clone(),
        Arc::new(NoopNotifier),
    ));

    let product_repo = Arc::new(crate::repositories::InMemoryProductRepository::new(vec![
        crate::models::Product {
            id: "res-1".to_string(),
            tenant_id: "tenant-a".to_string(),
            description: "desc".to_string(),
            active: true,
            inventory_quantity: Some(2),
            ..Default::default()
        },
    ]));

    let processor = StripeWebhookProcessor::new(
        cfg.clone(),
        store.clone(),
        notifier,
        subscription_service,
        product_repo,
    );

    let cart_id = "cart-1";
    let cart = crate::models::CartQuote {
        id: cart_id.to_string(),
        tenant_id: "tenant-a".to_string(),
        items: vec![crate::models::CartItem {
            resource_id: "res-1".to_string(),
            variant_id: None,
            quantity: 1,
            price: crate::models::Money::new(crate::models::get_asset("USD").unwrap(), 500),
            original_price: None,
            description: None,
            applied_coupons: Vec::new(),
            metadata: Default::default(),
        }],
        total: crate::models::Money::new(crate::models::get_asset("USD").unwrap(), 500),
        original_total: None,
        metadata: Default::default(),
        applied_coupons: Vec::new(),
        created_at: Utc::now(),
        expires_at: Utc::now(),
        wallet_paid_by: None,
    };
    store.store_cart_quote(cart).await.unwrap();

    let reservation = crate::models::InventoryReservation {
        id: uuid::Uuid::new_v4().to_string(),
        tenant_id: "tenant-a".to_string(),
        product_id: "res-1".to_string(),
        variant_id: None,
        quantity: 1,
        expires_at: Utc::now(),
        cart_id: Some(cart_id.to_string()),
        status: "active".to_string(),
        created_at: Utc::now(),
    };
    store.reserve_inventory(reservation).await.unwrap();

    let existing_order = crate::models::Order {
        id: uuid::Uuid::new_v4().to_string(),
        tenant_id: "tenant-a".to_string(),
        source: "stripe".to_string(),
        purchase_id: "cs_test_1".to_string(),
        resource_id: format!("cart:{cart_id}"),
        user_id: None,
        customer: Some("cus_1".to_string()),
        status: "paid".to_string(),
        items: vec![crate::models::OrderItem {
            product_id: "res-1".to_string(),
            variant_id: None,
            quantity: 1,
        }],
        amount: 500,
        amount_asset: "USD".to_string(),
        customer_email: None,
        customer_name: None,
        receipt_url: None,
        shipping: None,
        metadata: Default::default(),
        created_at: Utc::now(),
        updated_at: Some(Utc::now()),
        status_updated_at: Some(Utc::now()),
    };
    assert!(store.try_store_order(existing_order).await.unwrap());

    let event: RawStripeEvent = serde_json::from_value(serde_json::json!({
        "id": "evt_1",
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": "cs_test_1",
                "mode": "payment",
                "customer": "cus_1",
                "amount_total": 500,
                "currency": "usd",
                "metadata": {
                    "tenant_id": "tenant-a",
                    "resource_id": "cart:cart-1"
                }
            }
        }
    }))
    .unwrap();

    let active_before = store
        .list_active_reservations_for_cart("tenant-a", cart_id)
        .await
        .unwrap();
    assert_eq!(active_before.len(), 1);

    processor.handle_checkout_completed(&event).await.unwrap();

    let active_after = store
        .list_active_reservations_for_cart("tenant-a", cart_id)
        .await
        .unwrap();
    assert!(active_after.is_empty());
}

#[tokio::test]
async fn test_checkout_completed_skips_notify_on_order_failure() {
    let mut cfg = Config::default();
    cfg.stripe.webhook_secret = "whsec_test".to_string();

    let cfg = Arc::new(cfg);
    let store = Arc::new(InMemoryStore::new());
    store.set_fail_try_store_order(true);
    let notifier = Arc::new(TestNotifier::default());
    let subscription_service = Arc::new(SubscriptionService::new(
        cfg.clone(),
        store.clone(),
        Arc::new(NoopNotifier),
    ));

    let processor = StripeWebhookProcessor::new(
        cfg.clone(),
        store.clone(),
        notifier.clone(),
        subscription_service,
        Arc::new(crate::repositories::InMemoryProductRepository::new(
            Vec::new(),
        )),
    );

    let event: RawStripeEvent = serde_json::from_value(serde_json::json!({
        "id": "evt_1",
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": "cs_test_1",
                "mode": "payment",
                "customer": "cus_1",
                "amount_total": 500,
                "currency": "usd",
                "metadata": {
                    "tenant_id": "tenant-a",
                    "resource_id": "res-1"
                }
            }
        }
    }))
    .unwrap();

    let result = processor.handle_checkout_completed(&event).await;
    assert!(result.is_err());

    let events = notifier.events.lock();
    assert!(events.is_empty());
}

#[tokio::test]
async fn test_checkout_completed_records_stripe_payment_user_id_from_metadata() {
    let mut cfg = Config::default();
    cfg.stripe.webhook_secret = "whsec_test".to_string();

    let cfg = Arc::new(cfg);
    let store = Arc::new(InMemoryStore::new());
    let notifier = Arc::new(TestNotifier::default());
    let subscription_service = Arc::new(SubscriptionService::new(
        cfg.clone(),
        store.clone(),
        Arc::new(NoopNotifier),
    ));
    let processor = StripeWebhookProcessor::new(
        cfg.clone(),
        store.clone(),
        notifier,
        subscription_service,
        Arc::new(crate::repositories::InMemoryProductRepository::new(
            Vec::new(),
        )),
    );

    let ts = Utc::now().timestamp();
    let payload = serde_json::json!({
        "id": "evt_1",
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": "cs_test_1",
                "mode": "payment",
                "customer": "cus_1",
                "amount_total": 500,
                "currency": "usd",
                "metadata": {
                    "tenant_id": "tenant-a",
                    "resource_id": "res-1",
                    "user_id": "user-1",
                    "user_id_trusted": "true"
                }
            }
        }
    });

    let body = serde_json::to_vec(&payload).unwrap();
    let signed_payload = format!("{}.{}", ts, String::from_utf8_lossy(&body));
    let mut mac = Hmac::<Sha256>::new_from_slice(cfg.stripe.webhook_secret.as_bytes()).unwrap();
    mac.update(signed_payload.as_bytes());
    let sig = hex::encode(mac.finalize().into_bytes());
    let header = format!("t={},v1={}", ts, sig);

    processor.process_webhook(&body, &header).await.unwrap();

    let stored = store
        .get_payment("tenant-a", "stripe:cs_test_1")
        .await
        .unwrap()
        .expect("payment recorded");
    assert_eq!(stored.user_id.as_deref(), Some("user-1"));
}

#[tokio::test]
async fn test_checkout_completed_ignores_untrusted_user_id_metadata() {
    let mut cfg = Config::default();
    cfg.stripe.webhook_secret = "whsec_test".to_string();

    let cfg = Arc::new(cfg);
    let store = Arc::new(InMemoryStore::new());
    let notifier = Arc::new(TestNotifier::default());
    let subscription_service = Arc::new(SubscriptionService::new(
        cfg.clone(),
        store.clone(),
        Arc::new(NoopNotifier),
    ));
    let processor = StripeWebhookProcessor::new(
        cfg.clone(),
        store.clone(),
        notifier,
        subscription_service,
        Arc::new(crate::repositories::InMemoryProductRepository::new(
            Vec::new(),
        )),
    );

    let ts = Utc::now().timestamp();
    let payload = serde_json::json!({
        "id": "evt_1",
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": "cs_test_1",
                "mode": "payment",
                "customer": "cus_1",
                "amount_total": 500,
                "currency": "usd",
                "metadata": {
                    "tenant_id": "tenant-a",
                    "resource_id": "res-1",
                    "user_id": "spoofed-user"
                }
            }
        }
    });

    let body = serde_json::to_vec(&payload).unwrap();
    let signed_payload = format!("{}.{}", ts, String::from_utf8_lossy(&body));
    let mut mac = Hmac::<Sha256>::new_from_slice(cfg.stripe.webhook_secret.as_bytes()).unwrap();
    mac.update(signed_payload.as_bytes());
    let sig = hex::encode(mac.finalize().into_bytes());
    let header = format!("t={},v1={}", ts, sig);

    processor.process_webhook(&body, &header).await.unwrap();

    let stored = store
        .get_payment("tenant-a", "stripe:cs_test_1")
        .await
        .unwrap()
        .expect("payment recorded");
    assert!(stored.user_id.is_none());
}

#[tokio::test]
async fn test_checkout_completed_rejects_missing_tenant_id_in_production() {
    let mut cfg = Config::default();
    cfg.logging.environment = "production".to_string();
    cfg.stripe.webhook_secret = "whsec_test".to_string();

    let cfg = Arc::new(cfg);
    let store = Arc::new(InMemoryStore::new());
    let notifier = Arc::new(TestNotifier::default());
    let subscription_service = Arc::new(SubscriptionService::new(
        cfg.clone(),
        store.clone(),
        Arc::new(NoopNotifier),
    ));
    let processor = StripeWebhookProcessor::new(
        cfg.clone(),
        store.clone(),
        notifier,
        subscription_service,
        Arc::new(crate::repositories::InMemoryProductRepository::new(
            Vec::new(),
        )),
    );

    let ts = Utc::now().timestamp();
    let payload = serde_json::json!({
        "id": "evt_1",
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": "cs_test_1",
                "mode": "payment",
                "customer": "cus_1",
                "amount_total": 500,
                "currency": "usd",
                "metadata": {
                    "resource_id": "res-1"
                }
            }
        }
    });

    let body = serde_json::to_vec(&payload).unwrap();
    let signed_payload = format!("{}.{}", ts, String::from_utf8_lossy(&body));
    let mut mac = Hmac::<Sha256>::new_from_slice(cfg.stripe.webhook_secret.as_bytes()).unwrap();
    mac.update(signed_payload.as_bytes());
    let sig = hex::encode(mac.finalize().into_bytes());
    let header = format!("t={},v1={}", ts, sig);

    let res = processor.process_webhook(&body, &header).await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_checkout_completed_does_not_notify_when_already_recorded() {
    let mut cfg = Config::default();
    cfg.stripe.webhook_secret = "whsec_test".to_string();

    let cfg = Arc::new(cfg);
    let store = Arc::new(InMemoryStore::new());
    let notifier = Arc::new(TestNotifier::default());
    let subscription_service = Arc::new(SubscriptionService::new(
        cfg.clone(),
        store.clone(),
        Arc::new(NoopNotifier),
    ));
    let processor = StripeWebhookProcessor::new(
        cfg.clone(),
        store.clone(),
        notifier.clone(),
        subscription_service,
        Arc::new(crate::repositories::InMemoryProductRepository::new(
            Vec::new(),
        )),
    );

    for event_id in ["evt_1", "evt_2"] {
        let ts = Utc::now().timestamp();
        let payload = serde_json::json!({
            "id": event_id,
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "id": "cs_test_1",
                    "mode": "payment",
                    "customer": "cus_1",
                    "amount_total": 500,
                    "currency": "usd",
                    "metadata": {
                        "tenant_id": "tenant-a",
                        "resource_id": "res-1"
                    }
                }
            }
        });

        let body = serde_json::to_vec(&payload).unwrap();
        let signed_payload = format!("{}.{}", ts, String::from_utf8_lossy(&body));
        let mut mac = Hmac::<Sha256>::new_from_slice(cfg.stripe.webhook_secret.as_bytes()).unwrap();
        mac.update(signed_payload.as_bytes());
        let sig = hex::encode(mac.finalize().into_bytes());
        let header = format!("t={},v1={}", ts, sig);

        processor.process_webhook(&body, &header).await.unwrap();
    }

    let events = notifier.events.lock();
    assert_eq!(events.len(), 1);
    assert_eq!(events[0].tenant_id, "tenant-a");
    assert_eq!(events[0].resource_id, "res-1");
}

#[tokio::test]
async fn test_checkout_completed_rejects_unknown_currency() {
    let mut cfg = Config::default();
    cfg.stripe.webhook_secret = "whsec_test".to_string();

    let cfg = Arc::new(cfg);
    let store = Arc::new(InMemoryStore::new());
    let notifier = Arc::new(TestNotifier::default());
    let subscription_service = Arc::new(SubscriptionService::new(
        cfg.clone(),
        store.clone(),
        Arc::new(NoopNotifier),
    ));
    let processor = StripeWebhookProcessor::new(
        cfg.clone(),
        store.clone(),
        notifier.clone(),
        subscription_service,
        Arc::new(crate::repositories::InMemoryProductRepository::new(
            Vec::new(),
        )),
    );

    let ts = Utc::now().timestamp();
    let payload = serde_json::json!({
        "id": "evt_1",
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": "cs_test_1",
                "mode": "payment",
                "customer": "cus_1",
                "amount_total": 500,
                "currency": "zzz",
                "metadata": {
                    "tenant_id": "tenant-a",
                    "resource_id": "res-1"
                }
            }
        }
    });

    let body = serde_json::to_vec(&payload).unwrap();
    let signed_payload = format!("{}.{}", ts, String::from_utf8_lossy(&body));
    let mut mac = Hmac::<Sha256>::new_from_slice(cfg.stripe.webhook_secret.as_bytes()).unwrap();
    mac.update(signed_payload.as_bytes());
    let sig = hex::encode(mac.finalize().into_bytes());
    let header = format!("t={},v1={}", ts, sig);

    let result = processor.process_webhook(&body, &header).await;
    assert!(result.is_err());
}

#[tokio::test]
async fn test_checkout_completed_rejects_missing_amount_total() {
    let mut cfg = Config::default();
    cfg.stripe.webhook_secret = "whsec_test".to_string();

    let cfg = Arc::new(cfg);
    let store = Arc::new(InMemoryStore::new());
    let notifier = Arc::new(TestNotifier::default());
    let subscription_service = Arc::new(SubscriptionService::new(
        cfg.clone(),
        store.clone(),
        Arc::new(NoopNotifier),
    ));
    let processor = StripeWebhookProcessor::new(
        cfg.clone(),
        store.clone(),
        notifier.clone(),
        subscription_service,
        Arc::new(crate::repositories::InMemoryProductRepository::new(
            Vec::new(),
        )),
    );

    let ts = Utc::now().timestamp();
    let payload = serde_json::json!({
        "id": "evt_1",
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": "cs_test_1",
                "mode": "payment",
                "customer": "cus_1",
                "currency": "usd",
                "metadata": {
                    "tenant_id": "tenant-a",
                    "resource_id": "res-1"
                }
            }
        }
    });

    let body = serde_json::to_vec(&payload).unwrap();
    let signed_payload = format!("{}.{}", ts, String::from_utf8_lossy(&body));
    let mut mac = Hmac::<Sha256>::new_from_slice(cfg.stripe.webhook_secret.as_bytes()).unwrap();
    mac.update(signed_payload.as_bytes());
    let sig = hex::encode(mac.finalize().into_bytes());
    let header = format!("t={},v1={}", ts, sig);

    let result = processor.process_webhook(&body, &header).await;
    assert!(result.is_err());

    let stored = store
        .get_payment("tenant-a", "stripe:cs_test_1")
        .await
        .unwrap();
    assert!(stored.is_none());
}

#[tokio::test]
async fn test_checkout_completed_requires_resource_id() {
    let mut cfg = Config::default();
    cfg.stripe.webhook_secret = "whsec_test".to_string();

    let cfg = Arc::new(cfg);
    let store = Arc::new(InMemoryStore::new());
    let notifier = Arc::new(TestNotifier::default());
    let subscription_service = Arc::new(SubscriptionService::new(
        cfg.clone(),
        store.clone(),
        Arc::new(NoopNotifier),
    ));
    let processor = StripeWebhookProcessor::new(
        cfg.clone(),
        store.clone(),
        notifier.clone(),
        subscription_service,
        Arc::new(crate::repositories::InMemoryProductRepository::new(
            Vec::new(),
        )),
    );

    let ts = Utc::now().timestamp();
    let payload = serde_json::json!({
        "id": "evt_1",
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": "cs_test_1",
                "mode": "payment",
                "customer": "cus_1",
                "amount_total": 500,
                "currency": "usd",
                "metadata": {
                    "tenant_id": "tenant-a"
                }
            }
        }
    });

    let body = serde_json::to_vec(&payload).unwrap();
    let signed_payload = format!("{}.{}", ts, String::from_utf8_lossy(&body));
    let mut mac = Hmac::<Sha256>::new_from_slice(cfg.stripe.webhook_secret.as_bytes()).unwrap();
    mac.update(signed_payload.as_bytes());
    let sig = hex::encode(mac.finalize().into_bytes());
    let header = format!("t={},v1={}", ts, sig);

    let result = processor.process_webhook(&body, &header).await;
    assert!(result.is_err());
}

#[tokio::test]
async fn test_checkout_completed_cart_missing_quote_errors() {
    let mut cfg = Config::default();
    cfg.stripe.webhook_secret = "whsec_test".to_string();

    let cfg = Arc::new(cfg);
    let store = Arc::new(InMemoryStore::new());
    let notifier = Arc::new(TestNotifier::default());
    let subscription_service = Arc::new(SubscriptionService::new(
        cfg.clone(),
        store.clone(),
        Arc::new(NoopNotifier),
    ));
    let processor = StripeWebhookProcessor::new(
        cfg.clone(),
        store.clone(),
        notifier.clone(),
        subscription_service,
        Arc::new(crate::repositories::InMemoryProductRepository::new(
            Vec::new(),
        )),
    );

    let ts = Utc::now().timestamp();
    let payload = serde_json::json!({
        "id": "evt_1",
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": "cs_test_1",
                "mode": "payment",
                "customer": "cus_1",
                "amount_total": 500,
                "currency": "usd",
                "metadata": {
                    "tenant_id": "tenant-a",
                    "resource_id": "cart:missing"
                }
            }
        }
    });

    let body = serde_json::to_vec(&payload).unwrap();
    let signed_payload = format!("{}.{}", ts, String::from_utf8_lossy(&body));
    let mut mac = Hmac::<Sha256>::new_from_slice(cfg.stripe.webhook_secret.as_bytes()).unwrap();
    mac.update(signed_payload.as_bytes());
    let sig = hex::encode(mac.finalize().into_bytes());
    let header = format!("t={},v1={}", ts, sig);

    let result = processor.process_webhook(&body, &header).await;
    assert!(result.is_err());
}

#[tokio::test]
async fn test_subscription_created_is_idempotent_by_stripe_id() {
    let mut cfg = Config::default();
    cfg.stripe.webhook_secret = "whsec_test".to_string();

    let cfg = Arc::new(cfg);
    let store = Arc::new(InMemoryStore::new());
    let notifier = Arc::new(TestNotifier::default());
    let subscription_service = Arc::new(SubscriptionService::new(
        cfg.clone(),
        store.clone(),
        Arc::new(NoopNotifier),
    ));
    let processor = StripeWebhookProcessor::new(
        cfg.clone(),
        store.clone(),
        notifier,
        subscription_service,
        Arc::new(crate::repositories::InMemoryProductRepository::new(
            Vec::new(),
        )),
    );

    let now = Utc::now().timestamp();
    let sub_obj = serde_json::json!({
        "id": "sub_1",
        "customer": "cus_1",
        "status": "active",
        "current_period_start": now,
        "current_period_end": now + 3600,
        "cancel_at_period_end": false,
        "canceled_at": null,
        "metadata": {
            "tenant_id": "tenant-a",
            "wallet": "wallet-1",
            "product_id": "prod-1",
            "user_id": "user-1",
            "user_id_trusted": "true"
        }
    });

    for (event_id, event_type) in [
        ("evt_1", "customer.subscription.created"),
        ("evt_2", "customer.subscription.created"),
    ] {
        let ts = Utc::now().timestamp();
        let payload = serde_json::json!({
            "id": event_id,
            "type": event_type,
            "data": { "object": sub_obj.clone() }
        });
        let body = serde_json::to_vec(&payload).unwrap();
        let signed_payload = format!("{}.{}", ts, String::from_utf8_lossy(&body));
        let mut mac = Hmac::<Sha256>::new_from_slice(cfg.stripe.webhook_secret.as_bytes()).unwrap();
        mac.update(signed_payload.as_bytes());
        let sig = hex::encode(mac.finalize().into_bytes());
        let header = format!("t={},v1={}", ts, sig);

        processor.process_webhook(&body, &header).await.unwrap();
    }

    let subs = store
        .list_active_subscriptions("tenant-a", None)
        .await
        .unwrap();
    assert_eq!(subs.len(), 1);
    assert_eq!(subs[0].stripe_subscription_id.as_deref(), Some("sub_1"));
    assert_eq!(subs[0].user_id.as_deref(), Some("user-1"));
}

#[tokio::test]
async fn test_notify_payment_succeeded_uses_tenant_id() {
    let cfg = Arc::new(Config::default());
    let store = Arc::new(InMemoryStore::new());
    let notifier = Arc::new(TestNotifier::default());
    let subscription_service = Arc::new(SubscriptionService::new(
        cfg.clone(),
        store.clone(),
        Arc::new(NoopNotifier),
    ));
    let processor = StripeWebhookProcessor::new(
        cfg,
        store,
        notifier.clone(),
        subscription_service,
        Arc::new(crate::repositories::InMemoryProductRepository::new(
            Vec::new(),
        )),
    );

    processor
        .notify_payment_succeeded(
            "evt_test",
            "tenant-a",
            "res-1",
            "stripe",
            None,
            None,
            Some(500),
            Some("usd".to_string()),
            Some("user-1".to_string()),
        )
        .await;

    let events = notifier.events.lock();
    assert_eq!(events.len(), 1);
    assert_eq!(events[0].tenant_id, "tenant-a");
    assert_eq!(events[0].event_id, "stripe_evt:evt_test");
}

#[tokio::test]
async fn test_charge_refunded_missing_tenant_id_does_not_error_in_production() {
    let mut cfg = Config::default();
    cfg.logging.environment = "production".to_string();
    let cfg = Arc::new(cfg);

    let store = Arc::new(InMemoryStore::new());
    let subscription_service = Arc::new(SubscriptionService::new(
        cfg.clone(),
        store.clone(),
        Arc::new(NoopNotifier),
    ));
    let processor = StripeWebhookProcessor::new(
        cfg,
        store,
        Arc::new(NoopNotifier),
        subscription_service,
        Arc::new(crate::repositories::InMemoryProductRepository::new(
            Vec::new(),
        )),
    );

    let event: RawStripeEvent = serde_json::from_value(serde_json::json!({
        "id": "evt_missing_tenant",
        "type": "charge.refunded",
        "data": {
            "object": {
                "id": "ch_missing_tenant",
                "amount_refunded": 500,
                "currency": "usd",
                "metadata": {}
            }
        }
    }))
    .unwrap();

    processor.handle_charge_refunded(&event).await.unwrap();
}

#[tokio::test]
async fn test_charge_refunded_updates_stripe_refund_request_status() {
    let cfg = Arc::new(Config::default());
    let store = Arc::new(InMemoryStore::new());
    let subscription_service = Arc::new(SubscriptionService::new(
        cfg.clone(),
        store.clone(),
        Arc::new(NoopNotifier),
    ));
    let processor = StripeWebhookProcessor::new(
        cfg,
        store.clone(),
        Arc::new(NoopNotifier),
        subscription_service,
        Arc::new(crate::repositories::InMemoryProductRepository::new(
            Vec::new(),
        )),
    );

    let req = crate::models::StripeRefundRequest {
        id: "srr_1".to_string(),
        tenant_id: "default".to_string(),
        original_purchase_id: "stripe:cs_test".to_string(),
        stripe_payment_intent_id: "pi_1".to_string(),
        stripe_refund_id: Some("re_1".to_string()),
        stripe_charge_id: Some("ch_1".to_string()),
        amount: 500,
        currency: "usd".to_string(),
        status: "pending".to_string(),
        reason: None,
        metadata: HashMap::new(),
        created_at: Utc::now(),
        processed_by: Some("admin".to_string()),
        processed_at: Some(Utc::now()),
        last_error: None,
    };
    store.store_stripe_refund_request(req).await.unwrap();

    let event: RawStripeEvent = serde_json::from_value(serde_json::json!({
        "id": "evt_ref_1",
        "type": "charge.refunded",
        "data": {
            "object": {
                "id": "ch_1",
                "amount_refunded": 500,
                "currency": "usd",
                "metadata": { "tenant_id": "default" }
            }
        }
    }))
    .unwrap();

    processor.handle_charge_refunded(&event).await.unwrap();

    let updated = store
        .get_stripe_refund_request("default", "srr_1")
        .await
        .unwrap()
        .unwrap();
    assert_eq!(updated.status, "succeeded");
}

#[test]
fn test_timestamp_to_datetime_rejects_invalid() {
    let err = timestamp_to_datetime(i64::MAX).expect_err("expected invalid timestamp error");
    match err {
        ServiceError::Coded { code, .. } => assert_eq!(code, ErrorCode::InvalidField),
        other => panic!("unexpected error type: {other:?}"),
    }
}
