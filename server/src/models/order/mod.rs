use std::collections::HashMap;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum OrderStatus {
    Created,
    Paid,
    Processing,
    Fulfilled,
    Shipped,
    Delivered,
    Cancelled,
    Refunded,
}

impl OrderStatus {
    pub fn is_terminal(&self) -> bool {
        matches!(self, OrderStatus::Cancelled | OrderStatus::Refunded)
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            OrderStatus::Created => "created",
            OrderStatus::Paid => "paid",
            OrderStatus::Processing => "processing",
            OrderStatus::Fulfilled => "fulfilled",
            OrderStatus::Shipped => "shipped",
            OrderStatus::Delivered => "delivered",
            OrderStatus::Cancelled => "cancelled",
            OrderStatus::Refunded => "refunded",
        }
    }
}

pub fn is_valid_order_transition(from: &str, to: &str) -> bool {
    let from = normalize_status(from);
    let to = normalize_status(to);

    matches!(
        (from.as_deref(), to.as_deref()),
        (Some("created"), Some("paid"))
            | (Some("paid"), Some("processing"))
            | (Some("processing"), Some("fulfilled"))
            | (Some("fulfilled"), Some("shipped"))
            | (Some("shipped"), Some("delivered"))
            | (Some("paid"), Some("cancelled"))
            | (Some("processing"), Some("cancelled"))
            | (Some("paid"), Some("refunded"))
            | (Some("processing"), Some("refunded"))
            | (Some("fulfilled"), Some("refunded"))
            | (Some("shipped"), Some("refunded"))
    )
}

fn normalize_status(input: &str) -> Option<String> {
    let trimmed = input.trim();
    if trimmed.is_empty() {
        return None;
    }
    Some(trimmed.to_lowercase())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OrderItem {
    pub product_id: String,
    /// Variant ID for variant-level inventory tracking
    #[serde(skip_serializing_if = "Option::is_none")]
    pub variant_id: Option<String>,
    pub quantity: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct OrderShipping {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub phone: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub address: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Order {
    pub id: String,
    pub tenant_id: String,
    /// Payment source, e.g. "stripe" or "x402".
    pub source: String,
    /// Unique purchase identifier within the source (e.g., Stripe session id).
    pub purchase_id: String,
    /// Resource id for the purchase (product id or cart:<id>).
    pub resource_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub customer: Option<String>,
    pub status: String,
    pub items: Vec<OrderItem>,
    pub amount: i64,
    pub amount_asset: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub customer_email: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub customer_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub receipt_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub shipping: Option<OrderShipping>,
    #[serde(default)]
    pub metadata: HashMap<String, String>,
    pub created_at: DateTime<Utc>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<DateTime<Utc>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status_updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OrderHistoryEntry {
    pub id: String,
    pub tenant_id: String,
    pub order_id: String,
    pub from_status: String,
    pub to_status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub note: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub actor: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum FulfillmentStatus {
    Pending,
    Shipped,
    Delivered,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Fulfillment {
    pub id: String,
    pub tenant_id: String,
    pub order_id: String,
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub carrier: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tracking_number: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tracking_url: Option<String>,
    #[serde(default)]
    pub items: Vec<OrderItem>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub shipped_at: Option<DateTime<Utc>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub delivered_at: Option<DateTime<Utc>>,
    #[serde(default)]
    pub metadata: HashMap<String, String>,
    pub created_at: DateTime<Utc>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ReservationStatus {
    Active,
    Released,
    Converted,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InventoryReservation {
    pub id: String,
    pub tenant_id: String,
    pub product_id: String,
    /// Variant ID for variant-level inventory reservations
    #[serde(skip_serializing_if = "Option::is_none")]
    pub variant_id: Option<String>,
    pub quantity: i32,
    pub expires_at: DateTime<Utc>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cart_id: Option<String>,
    pub status: String,
    pub created_at: DateTime<Utc>,
}

#[cfg(test)]
mod tests {
    use super::is_valid_order_transition;

    #[test]
    fn test_order_transition_happy_path() {
        assert!(is_valid_order_transition("paid", "processing"));
        assert!(is_valid_order_transition("processing", "fulfilled"));
    }

    #[test]
    fn test_order_transition_rejects_backwards() {
        assert!(!is_valid_order_transition("processing", "paid"));
        assert!(!is_valid_order_transition("delivered", "shipped"));
    }
}
