//! Row parsing helpers for PostgreSQL storage

use std::collections::HashMap;

use crate::models::{
    get_asset, BillingPeriod, CartItem, CartQuote, ChatMessage, ChatSession, Collection, Customer,
    CustomerAddress, DisputeRecord, Faq, Fulfillment, GiftCard, InventoryAdjustment,
    InventoryReservation, Money, Order, OrderHistoryEntry, OrderItem, OrderShipping, PaymentMethod,
    PaymentTransaction, RefundQuote, ReturnRequest, ShippingProfile, ShippingRate,
    StripeRefundRequest, Subscription, SubscriptionStatus, TaxRate,
};
use crate::storage::{
    AdminNonce, CreditsHold, DlqWebhook, EmailStatus, IdempotencyResponse, PendingEmail,
    PendingWebhook, StorageError, StorageResult, WebhookStatus,
};
use chrono::{DateTime, Utc};
use sqlx::postgres::PgRow;
use sqlx::Row;
use tracing::warn;

fn validate_tenant_id(id: String, context: &str) -> StorageResult<String> {
    if id.trim().is_empty() {
        return Err(StorageError::Database(format!(
            "empty tenant_id value when parsing {context}"
        )));
    }
    Ok(id)
}

/// Parse tenant_id from a row.
///
/// SECURITY: this must fail closed. Defaulting to "default" can cause cross-tenant
/// data leakage if a query omits `tenant_id`.
fn parse_tenant_id(row: &PgRow, context: &str) -> StorageResult<String> {
    match row.try_get::<String, _>("tenant_id") {
        Ok(id) => validate_tenant_id(id, context),
        Err(e) => {
            warn!(context = context, error = %e, "tenant_id column missing or invalid");
            Err(StorageError::Database(format!(
                "tenant_id column missing or invalid when parsing {context}"
            )))
        }
    }
}

fn parse_string_map(
    value: serde_json::Value,
    context: &str,
) -> StorageResult<HashMap<String, String>> {
    serde_json::from_value(value)
        .map_err(|e| StorageError::internal(&format!("failed to parse {context}"), e))
}

pub fn parse_cart_quote(row: PgRow) -> StorageResult<CartQuote> {
    let id: String = row.get("id");
    let tenant_id = parse_tenant_id(&row, "cart_quote")?;
    let items_json: serde_json::Value = row.get("items");
    let total_amount: i64 = row.get("total_amount");
    let total_asset: String = row.get("total_asset");
    let metadata_json: serde_json::Value = row.get("metadata");
    let created_at: DateTime<Utc> = row.get("created_at");
    let expires_at: DateTime<Utc> = row.get("expires_at");
    let wallet_paid_by: Option<String> = row.get("wallet_paid_by");

    let items: Vec<CartItem> = serde_json::from_value(items_json)
        .map_err(|e| StorageError::internal("failed to parse items", e))?;
    let metadata = parse_string_map(metadata_json, "cart metadata")?;

    let asset = get_asset(&total_asset)
        .ok_or_else(|| StorageError::Database(format!("unknown asset: {}", total_asset)))?;

    // Try to get applied_coupons from metadata or default to empty
    let applied_coupons: Vec<String> = metadata
        .get("coupon_codes")
        .map(|s| s.split(',').map(|c| c.trim().to_string()).collect())
        .unwrap_or_default();

    // Try to get original_total from metadata or default to None
    let original_total = metadata.get("original_amount").and_then(|s| {
        s.parse::<i64>()
            .ok()
            .map(|atomic| Money::from_atomic(asset.clone(), atomic))
    });

    Ok(CartQuote {
        id,
        tenant_id,
        items,
        total: Money::from_atomic(asset, total_amount),
        original_total,
        metadata,
        applied_coupons,
        created_at,
        expires_at,
        wallet_paid_by,
    })
}

pub fn parse_refund_quote(row: PgRow) -> StorageResult<RefundQuote> {
    let id: String = row.get("id");
    let tenant_id = parse_tenant_id(&row, "refund_quote")?;
    let original_purchase_id: String = row.get("original_purchase_id");
    let recipient_wallet: String = row.get("recipient_wallet");
    let amount: i64 = row.get("amount");
    let amount_asset: String = row.get("amount_asset");
    let reason: Option<String> = row.get("reason");
    let metadata_json: serde_json::Value = row.get("metadata");
    let created_at: DateTime<Utc> = row.get("created_at");
    let expires_at: DateTime<Utc> = row.get("expires_at");
    let processed_by: Option<String> = row.get("processed_by");
    let processed_at: Option<DateTime<Utc>> = row.get("processed_at");
    let signature: Option<String> = row.get("signature");

    let metadata = parse_string_map(metadata_json, "refund metadata")?;
    let asset = get_asset(&amount_asset)
        .ok_or_else(|| StorageError::Database(format!("unknown asset: {}", amount_asset)))?;

    Ok(RefundQuote {
        id,
        tenant_id,
        original_purchase_id,
        recipient_wallet,
        amount: Money::from_atomic(asset, amount),
        reason,
        metadata,
        created_at,
        expires_at,
        processed_by,
        processed_at,
        signature,
    })
}

pub fn parse_order(row: PgRow) -> StorageResult<Order> {
    let id: String = row.get("id");
    let tenant_id = parse_tenant_id(&row, "order")?;
    let source: String = row.get("source");
    let purchase_id: String = row.get("purchase_id");
    let resource_id: String = row.get("resource_id");
    let user_id: Option<String> = row.get("user_id");
    let customer: Option<String> = row.get("customer");
    let status: String = row.get("status");
    let items_json: serde_json::Value = row.get("items");
    let amount: i64 = row.get("amount");
    let amount_asset: String = row.get("amount_asset");
    let customer_email: Option<String> = row.get("customer_email");
    let customer_name: Option<String> = row.try_get("customer_name").ok().flatten();
    let receipt_url: Option<String> = row.try_get("receipt_url").ok().flatten();
    let shipping_json: Option<serde_json::Value> = row.get("shipping");
    let metadata_json: serde_json::Value = row.get("metadata");
    let created_at: DateTime<Utc> = row.get("created_at");
    let updated_at: Option<DateTime<Utc>> = row.try_get("updated_at").ok();
    let status_updated_at: Option<DateTime<Utc>> = row.try_get("status_updated_at").ok();

    let items: Vec<OrderItem> = serde_json::from_value(items_json)
        .map_err(|e| StorageError::internal("failed to parse order items", e))?;
    let shipping: Option<OrderShipping> = match shipping_json {
        Some(v) => serde_json::from_value(v)
            .map(Some)
            .map_err(|e| StorageError::internal("failed to parse order shipping", e))?,
        None => None,
    };
    let metadata = parse_string_map(metadata_json, "order metadata")?;

    Ok(Order {
        id,
        tenant_id,
        source,
        purchase_id,
        resource_id,
        user_id,
        customer,
        status,
        items,
        amount,
        amount_asset,
        customer_email,
        customer_name,
        receipt_url,
        shipping,
        metadata,
        created_at,
        updated_at,
        status_updated_at,
    })
}

pub fn parse_order_history(row: PgRow) -> StorageResult<OrderHistoryEntry> {
    Ok(OrderHistoryEntry {
        id: row.get("id"),
        tenant_id: parse_tenant_id(&row, "order_history")?,
        order_id: row.get("order_id"),
        from_status: row.get("from_status"),
        to_status: row.get("to_status"),
        note: row.get("note"),
        actor: row.get("actor"),
        created_at: row.get("created_at"),
    })
}

pub fn parse_fulfillment(row: PgRow) -> StorageResult<Fulfillment> {
    let items_json: serde_json::Value = row.get("items");
    let items: Vec<OrderItem> = serde_json::from_value(items_json)
        .map_err(|e| StorageError::internal("failed to parse fulfillment items", e))?;
    let metadata_json: serde_json::Value = row.get("metadata");
    let metadata = parse_string_map(metadata_json, "fulfillment metadata")?;

    Ok(Fulfillment {
        id: row.get("id"),
        tenant_id: parse_tenant_id(&row, "fulfillment")?,
        order_id: row.get("order_id"),
        status: row.get("status"),
        carrier: row.get("carrier"),
        tracking_number: row.get("tracking_number"),
        tracking_url: row.get("tracking_url"),
        items,
        shipped_at: row.get("shipped_at"),
        delivered_at: row.get("delivered_at"),
        metadata,
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    })
}

pub fn parse_return_request(row: PgRow) -> StorageResult<ReturnRequest> {
    let items_json: serde_json::Value = row.get("items");
    let items: Vec<OrderItem> = serde_json::from_value(items_json)
        .map_err(|e| StorageError::internal("failed to parse return items", e))?;
    let metadata_json: serde_json::Value = row.get("metadata");
    let metadata = parse_string_map(metadata_json, "return metadata")?;

    Ok(ReturnRequest {
        id: row.get("id"),
        tenant_id: parse_tenant_id(&row, "return")?,
        order_id: row.get("order_id"),
        status: row.get("status"),
        items,
        reason: row.get("reason"),
        metadata,
        created_at: row.get("created_at"),
        updated_at: row.try_get("updated_at").ok(),
        status_updated_at: row.try_get("status_updated_at").ok(),
    })
}

pub fn parse_inventory_reservation(row: PgRow) -> StorageResult<InventoryReservation> {
    Ok(InventoryReservation {
        id: row.get("id"),
        tenant_id: parse_tenant_id(&row, "inventory_reservation")?,
        product_id: row.get("product_id"),
        variant_id: row.get("variant_id"),
        quantity: row.get("quantity"),
        expires_at: row.get("expires_at"),
        cart_id: row.get("cart_id"),
        status: row.get("status"),
        created_at: row.get("created_at"),
    })
}

pub fn parse_inventory_adjustment(row: PgRow) -> StorageResult<InventoryAdjustment> {
    Ok(InventoryAdjustment {
        id: row.get("id"),
        tenant_id: parse_tenant_id(&row, "inventory_adjustment")?,
        product_id: row.get("product_id"),
        variant_id: row.get("variant_id"),
        delta: row.get("delta"),
        quantity_before: row.get("quantity_before"),
        quantity_after: row.get("quantity_after"),
        reason: row.get("reason"),
        actor: row.get("actor"),
        created_at: row.get("created_at"),
    })
}

pub fn parse_shipping_profile(row: PgRow) -> StorageResult<ShippingProfile> {
    let countries_json: serde_json::Value = row.get("countries");
    let countries: Vec<String> = serde_json::from_value(countries_json)
        .map_err(|e| StorageError::internal("failed to parse shipping countries", e))?;

    Ok(ShippingProfile {
        id: row.get("id"),
        tenant_id: parse_tenant_id(&row, "shipping_profile")?,
        name: row.get("name"),
        description: row.get("description"),
        countries,
        active: row.get("active"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    })
}

pub fn parse_shipping_rate(row: PgRow) -> StorageResult<ShippingRate> {
    Ok(ShippingRate {
        id: row.get("id"),
        tenant_id: parse_tenant_id(&row, "shipping_rate")?,
        profile_id: row.get("profile_id"),
        name: row.get("name"),
        rate_type: row.get("rate_type"),
        amount_atomic: row.get("amount_atomic"),
        currency: row.get("currency"),
        min_subtotal: row.get("min_subtotal"),
        max_subtotal: row.get("max_subtotal"),
        active: row.get("active"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    })
}

pub fn parse_tax_rate(row: PgRow) -> StorageResult<TaxRate> {
    Ok(TaxRate {
        id: row.get("id"),
        tenant_id: parse_tenant_id(&row, "tax_rate")?,
        name: row.get("name"),
        country: row.get("country"),
        region: row.get("region"),
        rate_bps: row.get("rate_bps"),
        active: row.get("active"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    })
}

pub fn parse_customer(row: PgRow) -> StorageResult<Customer> {
    let addresses_json: serde_json::Value = row.get("addresses");
    let addresses: Vec<CustomerAddress> = serde_json::from_value(addresses_json)
        .map_err(|e| StorageError::internal("failed to parse customer addresses", e))?;

    Ok(Customer {
        id: row.get("id"),
        tenant_id: parse_tenant_id(&row, "customer")?,
        email: row.get("email"),
        name: row.get("name"),
        phone: row.get("phone"),
        addresses,
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    })
}

pub fn parse_dispute(row: PgRow) -> StorageResult<DisputeRecord> {
    let metadata_json: serde_json::Value = row.get("metadata");
    let metadata = parse_string_map(metadata_json, "dispute metadata")?;

    Ok(DisputeRecord {
        id: row.get("id"),
        tenant_id: parse_tenant_id(&row, "dispute")?,
        source: row.get("source"),
        order_id: row.get("order_id"),
        payment_intent_id: row.get("payment_intent_id"),
        charge_id: row.get("charge_id"),
        status: row.get("status"),
        reason: row.get("reason"),
        amount: row.get("amount"),
        currency: row.get("currency"),
        metadata,
        created_at: row.get("created_at"),
        updated_at: row.try_get("updated_at").ok(),
        status_updated_at: row.try_get("status_updated_at").ok(),
    })
}

pub fn parse_gift_card(row: PgRow) -> StorageResult<GiftCard> {
    let metadata_json: serde_json::Value = row.get("metadata");
    let metadata = parse_string_map(metadata_json, "gift card metadata")?;

    Ok(GiftCard {
        code: row.get("code"),
        tenant_id: parse_tenant_id(&row, "gift_card")?,
        initial_balance: row.get("initial_balance"),
        balance: row.get("balance"),
        currency: row.get("currency"),
        active: row.get("active"),
        expires_at: row.try_get("expires_at").ok(),
        metadata,
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    })
}

pub fn parse_collection(row: PgRow) -> StorageResult<Collection> {
    let product_ids_json: serde_json::Value = row.get("product_ids");
    let product_ids: Vec<String> = serde_json::from_value(product_ids_json).map_err(|e| {
        StorageError::internal("failed to parse collection product_ids", e)
    })?;

    Ok(Collection {
        id: row.get("id"),
        tenant_id: parse_tenant_id(&row, "collection")?,
        name: row.get("name"),
        description: row.get("description"),
        product_ids,
        active: row.get("active"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    })
}

pub fn parse_payment_transaction(row: PgRow) -> StorageResult<PaymentTransaction> {
    let signature: String = row.get("signature");
    let tenant_id = parse_tenant_id(&row, "payment_transaction")?;
    let resource_id: String = row.get("resource_id");
    let wallet: String = row.get("wallet");
    let user_id: Option<String> = row.get("user_id");
    let amount: i64 = row.get("amount");
    let amount_asset: String = row.get("amount_asset");
    let created_at: DateTime<Utc> = row.get("created_at");
    let metadata_json: serde_json::Value = row.get("metadata");

    let metadata = parse_string_map(metadata_json, "payment metadata")?;
    let asset = get_asset(&amount_asset)
        .ok_or_else(|| StorageError::Database(format!("unknown asset: {}", amount_asset)))?;

    Ok(PaymentTransaction {
        signature,
        tenant_id,
        resource_id,
        wallet,
        user_id,
        amount: Money::from_atomic(asset, amount),
        created_at,
        metadata,
    })
}

pub fn parse_stripe_refund_request(row: PgRow) -> StorageResult<StripeRefundRequest> {
    let id: String = row.get("id");
    let tenant_id = parse_tenant_id(&row, "stripe_refund_request")?;
    let original_purchase_id: String = row.get("original_purchase_id");
    let stripe_payment_intent_id: String = row.get("stripe_payment_intent_id");
    let stripe_refund_id: Option<String> = row.get("stripe_refund_id");
    let stripe_charge_id: Option<String> = row.get("stripe_charge_id");
    let amount: i64 = row.get("amount");
    let currency: String = row.get("currency");
    let status: String = row.get("status");
    let reason: Option<String> = row.get("reason");
    let metadata_json: serde_json::Value = row.get("metadata");
    let created_at: DateTime<Utc> = row.get("created_at");
    let processed_by: Option<String> = row.get("processed_by");
    let processed_at: Option<DateTime<Utc>> = row.get("processed_at");
    let last_error: Option<String> = row.get("last_error");

    let metadata = parse_string_map(metadata_json, "stripe refund request metadata")?;

    Ok(StripeRefundRequest {
        id,
        tenant_id,
        original_purchase_id,
        stripe_payment_intent_id,
        stripe_refund_id,
        stripe_charge_id,
        amount,
        currency,
        status,
        reason,
        metadata,
        created_at,
        processed_by,
        processed_at,
        last_error,
    })
}

pub fn parse_credits_hold(row: PgRow) -> StorageResult<CreditsHold> {
    let tenant_id = parse_tenant_id(&row, "credits_hold")?;
    let hold_id: String = row.get("hold_id");
    let user_id: String = row.get("user_id");
    let resource_id: String = row.get("resource_id");
    let amount: i64 = row.get("amount");
    let amount_asset: String = row.get("amount_asset");
    let created_at: DateTime<Utc> = row.get("created_at");
    let expires_at: DateTime<Utc> = row.get("expires_at");

    Ok(CreditsHold {
        tenant_id,
        hold_id,
        user_id,
        resource_id,
        amount,
        amount_asset,
        created_at,
        expires_at,
    })
}

pub fn parse_admin_nonce(row: PgRow) -> StorageResult<AdminNonce> {
    // Purpose is nullable in DB but required in model - default to empty string for wildcards
    let purpose: Option<String> = row.get("purpose");
    let tenant_id = parse_tenant_id(&row, "admin_nonce")?;
    Ok(AdminNonce {
        id: row.get("id"),
        tenant_id,
        purpose: purpose.unwrap_or_default(),
        created_at: row.get("created_at"),
        expires_at: row.get("expires_at"),
        consumed_at: row.get("consumed_at"),
    })
}

pub fn parse_webhook(row: PgRow) -> StorageResult<PendingWebhook> {
    let status_str: String = row.get("status");
    let headers_json: serde_json::Value = row.get("headers");
    let tenant_id = parse_tenant_id(&row, "webhook")?;

    let status = match status_str.as_str() {
        "pending" => WebhookStatus::Pending,
        "processing" => WebhookStatus::Processing,
        "success" => WebhookStatus::Success,
        "failed" => WebhookStatus::Failed,
        unknown => {
            tracing::warn!(
                status = %unknown,
                "Unknown webhook status in database, defaulting to Pending"
            );
            WebhookStatus::Pending
        }
    };

    let headers = parse_string_map(headers_json, "webhook headers")?;

    Ok(PendingWebhook {
        id: row.get("id"),
        tenant_id,
        url: row.get("url"),
        payload: row.get("payload"),
        payload_bytes: row.try_get("payload_bytes").unwrap_or_default(),
        headers,
        event_type: row.get("event_type"),
        status,
        attempts: row.get("attempts"),
        max_attempts: row.get("max_attempts"),
        last_error: row.get("last_error"),
        last_attempt_at: row.get("last_attempt_at"),
        next_attempt_at: row.get("next_attempt_at"),
        created_at: row.get("created_at"),
        completed_at: row.get("completed_at"),
    })
}

pub fn parse_email(row: PgRow) -> StorageResult<PendingEmail> {
    let status_str: String = row.get("status");
    let tenant_id = parse_tenant_id(&row, "email")?;

    let status = match status_str.as_str() {
        "pending" => EmailStatus::Pending,
        "completed" => EmailStatus::Completed,
        "failed" => EmailStatus::Failed,
        unknown => {
            tracing::warn!(
                status = %unknown,
                "Unknown email status in database, defaulting to Pending"
            );
            EmailStatus::Pending
        }
    };

    Ok(PendingEmail {
        id: row.get("id"),
        tenant_id,
        to_email: row.get("to_email"),
        from_email: row.get("from_email"),
        from_name: row.get("from_name"),
        subject: row.get("subject"),
        body_text: row.get("body_text"),
        body_html: row.get("body_html"),
        status,
        attempts: row.get("attempts"),
        max_attempts: row.get("max_attempts"),
        last_error: row.get("last_error"),
        last_attempt_at: row.get("last_attempt_at"),
        next_attempt_at: row.get("next_attempt_at"),
        created_at: row.get("created_at"),
        completed_at: row.get("completed_at"),
    })
}

pub fn parse_subscription(row: PgRow) -> StorageResult<Subscription> {
    let status_str: String = row.get("status");
    let payment_method_str: String = row.get("payment_method");
    let billing_period_str: String = row.get("billing_period");
    let metadata_json: serde_json::Value = row.get("metadata");
    let tenant_id = parse_tenant_id(&row, "subscription")?;

    let status = match status_str.as_str() {
        "active" => SubscriptionStatus::Active,
        "trialing" => SubscriptionStatus::Trialing,
        "past_due" => SubscriptionStatus::PastDue,
        "cancelled" | "canceled" => SubscriptionStatus::Cancelled,
        "unpaid" => SubscriptionStatus::Unpaid,
        "expired" => SubscriptionStatus::Expired,
        unknown => {
            // B-01: Fail-safe — unknown status defaults to Expired (not Active)
            // to prevent granting unauthorized access on data corruption
            tracing::warn!(
                status = %unknown,
                "Unknown subscription status in database, defaulting to Expired (fail-safe)"
            );
            SubscriptionStatus::Expired
        }
    };

    let payment_method = match payment_method_str.as_str() {
        "stripe" => PaymentMethod::Stripe,
        "x402" => PaymentMethod::X402,
        "credits" => PaymentMethod::Credits,
        unknown => {
            tracing::warn!(
                payment_method = %unknown,
                "Unknown payment method in database, defaulting to Stripe"
            );
            PaymentMethod::Stripe
        }
    };

    let billing_period = match billing_period_str.as_str() {
        "day" => BillingPeriod::Day,
        "week" => BillingPeriod::Week,
        "month" => BillingPeriod::Month,
        "year" => BillingPeriod::Year,
        unknown => {
            tracing::warn!(
                billing_period = %unknown,
                "Unknown billing period in database, defaulting to Month"
            );
            BillingPeriod::Month
        }
    };

    let metadata = parse_string_map(metadata_json, "subscription metadata")?;

    Ok(Subscription {
        id: row.get("id"),
        tenant_id,
        product_id: row.get("product_id"),
        plan_id: row.get("plan_id"),
        wallet: row.get("wallet"),
        user_id: row.get("user_id"),
        stripe_customer_id: row.get("stripe_customer_id"),
        stripe_subscription_id: row.get("stripe_subscription_id"),
        payment_method,
        billing_period,
        billing_interval: row.get("billing_interval"),
        status,
        current_period_start: row.get("current_period_start"),
        current_period_end: row.get("current_period_end"),
        trial_end: row.get("trial_end"),
        cancelled_at: row.get("cancelled_at"),
        cancel_at_period_end: row.get("cancel_at_period_end"),
        metadata,
        payment_signature: row.get("payment_signature"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    })
}

pub fn parse_idempotency_response(row: PgRow) -> StorageResult<IdempotencyResponse> {
    let headers_json: serde_json::Value = row.get("headers");
    let body: Vec<u8> = row.get("body");

    Ok(IdempotencyResponse {
        status_code: row.get("status_code"),
        headers: parse_string_map(headers_json, "idempotency headers")?,
        body,
        cached_at: row.get("cached_at"),
    })
}

pub fn parse_dlq_webhook(row: PgRow) -> StorageResult<DlqWebhook> {
    let headers_json: serde_json::Value = row.get("headers");
    let headers = parse_string_map(headers_json, "dlq headers")?;
    let tenant_id = parse_tenant_id(&row, "dlq_webhook")?;

    Ok(DlqWebhook {
        id: row.get("id"),
        tenant_id,
        original_webhook_id: row.get("original_webhook_id"),
        url: row.get("url"),
        payload: row.get("payload"),
        payload_bytes: row.try_get("payload_bytes").unwrap_or_default(),
        headers,
        event_type: row.get("event_type"),
        final_error: row.get("final_error"),
        total_attempts: row.get("total_attempts"),
        first_attempt_at: row.get("first_attempt_at"),
        last_attempt_at: row.get("last_attempt_at"),
        moved_to_dlq_at: row.get("moved_to_dlq_at"),
    })
}

pub fn parse_chat_session(row: PgRow) -> StorageResult<ChatSession> {
    let tenant_id = parse_tenant_id(&row, "chat_session")?;
    Ok(ChatSession {
        id: row.get("id"),
        tenant_id,
        customer_id: row.get("customer_id"),
        customer_email: row.get("customer_email"),
        status: row.get("status"),
        message_count: row.get("message_count"),
        last_message_at: row.get("last_message_at"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    })
}

pub fn parse_chat_message(row: PgRow) -> StorageResult<ChatMessage> {
    let tenant_id = parse_tenant_id(&row, "chat_message")?;
    Ok(ChatMessage {
        id: row.get("id"),
        tenant_id,
        session_id: row.get("session_id"),
        role: row.get("role"),
        content: row.get("content"),
        tool_calls: row.get("tool_calls"),
        tool_results: row.get("tool_results"),
        created_at: row.get("created_at"),
    })
}

pub fn parse_faq(row: PgRow) -> StorageResult<Faq> {
    let tenant_id = parse_tenant_id(&row, "faq")?;
    Ok(Faq {
        id: row.get("id"),
        tenant_id,
        question: row.get("question"),
        answer: row.get("answer"),
        keywords: row.get("keywords"),
        active: row.get("active"),
        use_in_chat: row.get("use_in_chat"),
        display_on_page: row.get("display_on_page"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_parse_string_map_rejects_non_string_values() {
        let err = parse_string_map(json!({"k": 1}), "test metadata").unwrap_err();
        match err {
            StorageError::Database(msg) => assert!(msg.contains("test metadata")),
            other => panic!("unexpected error type: {other:?}"),
        }
    }
}
