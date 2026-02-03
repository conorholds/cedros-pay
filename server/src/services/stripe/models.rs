//! Stripe API request and response types
//!
//! This module contains all the data structures used for Stripe API communication.

use std::collections::HashMap;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::models::BillingPeriod;

// ============================================================================
// Public Request/Response Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct StripeSession {
    pub session_id: String,
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct CreateSessionRequest {
    pub resource_id: String,
    pub amount_cents: i64,
    pub currency: String,
    pub price_id: Option<String>,
    pub customer_email: Option<String>,
    /// Stripe checkout: `billing_address_collection` (e.g. "required")
    pub billing_address_collection: Option<String>,
    /// Stripe checkout: `phone_number_collection[enabled]=true`
    #[serde(default)]
    pub phone_number_collection_enabled: bool,
    /// Stripe checkout: `shipping_address_collection[allowed_countries][]`
    pub shipping_address_collection_countries: Option<Vec<String>>,
    pub metadata: HashMap<String, String>,
    pub success_url: Option<String>,
    pub cancel_url: Option<String>,
    pub description: String,
    pub coupon_code: Option<String>,
    pub original_amount: Option<i64>,
    pub discount_amount: Option<i64>,
    pub stripe_coupon_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct CreateCartSessionRequest {
    pub items: Vec<CartLineItem>,
    pub customer_email: Option<String>,
    /// Stripe checkout: `billing_address_collection` (e.g. "required")
    pub billing_address_collection: Option<String>,
    /// Stripe checkout: `phone_number_collection[enabled]=true`
    #[serde(default)]
    pub phone_number_collection_enabled: bool,
    /// Stripe checkout: `shipping_address_collection[allowed_countries][]`
    pub shipping_address_collection_countries: Option<Vec<String>>,
    pub metadata: HashMap<String, String>,
    pub success_url: Option<String>,
    pub cancel_url: Option<String>,
    pub coupon_code: Option<String>,
    pub stripe_coupon_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct CartLineItem {
    pub price_id: String,
    pub resource: String,
    /// Per spec: int (i32)
    pub quantity: i32,
    pub description: String,
    pub metadata: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct CreateSubscriptionRequest {
    pub product_id: String,
    pub price_id: String,
    pub customer_email: Option<String>,
    pub metadata: HashMap<String, String>,
    pub success_url: Option<String>,
    pub cancel_url: Option<String>,
    pub trial_days: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebhookEvent {
    pub event_type: String,
    pub session_id: String,
    pub resource_id: String,
    pub customer: Option<String>,
    pub metadata: HashMap<String, String>,
    pub amount_total: i64,
    pub currency: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub payment_intent: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubscriptionWebhookEvent {
    pub event_type: String,
    pub stripe_subscription_id: String,
    pub stripe_customer_id: String,
    pub product_id: String,
    pub status: String,
    pub current_period_start: DateTime<Utc>,
    pub current_period_end: DateTime<Utc>,
    pub cancel_at_period_end: bool,
    pub cancelled_at: Option<DateTime<Utc>>,
    pub metadata: HashMap<String, String>,
    pub price_id: Option<String>,
    pub billing_period: BillingPeriod,
    pub billing_interval: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ProrationPreview {
    pub amount_due: i64,
    pub proration_amount: i64,
    pub currency: String,
    pub next_payment_date: DateTime<Utc>,
    pub lines: Vec<ProrationLine>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubscriptionChangeResult {
    pub subscription_id: String,
    pub previous_price_id: String,
    pub new_price_id: String,
    pub status: String,
    pub current_period_end: DateTime<Utc>,
    pub proration_behavior: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ProrationLine {
    pub description: String,
    pub amount: i64,
    pub period_start: DateTime<Utc>,
    pub period_end: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateSubscriptionRequest {
    pub subscription_id: String,
    pub new_price_id: String,
    pub proration_behavior: Option<String>,
    pub metadata: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateSubscriptionResult {
    pub proration_amount: i64,
    pub effective_date: i64,
}

/// Session verification info for handlers
pub struct SessionVerifyInfo {
    pub verified: bool,
    pub resource_id: Option<String>,
    pub paid_at: Option<DateTime<Utc>>,
    pub amount: Option<String>,
    pub customer: Option<String>,
    pub metadata: Option<serde_json::Value>,
}

// ============================================================================
// Internal Stripe API Response Types
// ============================================================================

#[derive(Debug, Deserialize)]
pub(super) struct StripeRefundObject {
    pub id: String,
    pub amount: i64,
    pub currency: String,
    pub status: String,
    pub reason: Option<String>,
    pub created: i64,
    pub charge: Option<String>,
    pub payment_intent: Option<String>,
    #[serde(default)]
    pub metadata: HashMap<String, String>,
}

#[derive(Debug, Deserialize)]
pub(super) struct StripeCheckoutSession {
    pub id: String,
    pub url: Option<String>,
    pub payment_status: Option<String>,
    pub metadata: HashMap<String, String>,
}

#[derive(Debug, Deserialize)]
pub(super) struct StripeWebhookEvent {
    #[serde(rename = "type")]
    pub event_type: String,
    pub data: StripeEventData,
}

#[derive(Debug, Deserialize)]
pub(super) struct StripeEventData {
    pub object: StripeEventObject,
}

#[derive(Debug, Deserialize)]
pub(super) struct StripeEventObject {
    pub id: String,
    pub customer: Option<String>,
    pub amount_total: Option<i64>,
    pub currency: Option<String>,
    pub payment_intent: Option<String>,
    #[serde(default)]
    pub metadata: HashMap<String, String>,
}

// ============================================================================
// Webhook Event Wrappers
// ============================================================================

/// Raw webhook event for type detection
#[derive(Debug, Deserialize)]
pub(super) struct RawWebhookEvent {
    /// Event ID from Stripe - deserialized but not used directly (kept for logging/debugging)
    pub id: String,
    #[serde(rename = "type")]
    pub event_type: String,
}

/// Wrapper for subscription events
#[derive(Debug, Deserialize)]
pub(super) struct SubscriptionEventWrapper {
    pub data: SubscriptionEventData,
}

#[derive(Debug, Deserialize)]
pub(super) struct SubscriptionEventData {
    pub object: SubscriptionEventObject,
}

#[derive(Debug, Deserialize)]
pub(super) struct SubscriptionEventObject {
    pub id: String,
    pub status: String,
    #[serde(default)]
    pub metadata: HashMap<String, String>,
}

/// Wrapper for invoice events
#[derive(Debug, Deserialize)]
pub(super) struct InvoiceEventWrapper {
    pub data: InvoiceEventData,
}

#[derive(Debug, Deserialize)]
pub(super) struct InvoiceEventData {
    pub object: InvoiceEventObject,
}

#[derive(Debug, Deserialize)]
pub(super) struct InvoiceEventObject {
    /// Invoice ID from Stripe - deserialized for complete event representation
    pub id: String,
    pub subscription: Option<String>,
    pub subscription_details: Option<SubscriptionDetails>,
}

#[derive(Debug, Deserialize)]
pub(super) struct SubscriptionDetails {
    #[serde(default)]
    pub metadata: HashMap<String, String>,
}

/// Wrapper for charge events
#[derive(Debug, Deserialize)]
pub(super) struct ChargeEventWrapper {
    pub data: ChargeEventData,
}

#[derive(Debug, Deserialize)]
pub(super) struct ChargeEventData {
    pub object: ChargeEventObject,
}

#[derive(Debug, Deserialize)]
pub(super) struct ChargeEventObject {
    pub id: String,
    pub amount_refunded: i64,
    pub currency: Option<String>,
    #[serde(default)]
    pub metadata: HashMap<String, String>,
}
