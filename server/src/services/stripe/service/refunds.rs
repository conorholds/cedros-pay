//! Stripe refund processing
//!
//! Handles creating refunds against payment intents for the admin API.

use std::collections::HashMap;

use chrono::{DateTime, Utc};

use crate::errors::ErrorCode;
use crate::services::{ServiceError, ServiceResult};

use super::timestamp_to_datetime;
use super::StripeClient;

#[allow(dead_code)]
#[derive(Debug, Clone)]
pub(crate) struct AdminStripeRefund {
    pub id: String,
    pub amount: i64,
    pub currency: String,
    pub status: String,
    pub reason: Option<String>,
    pub created_at: DateTime<Utc>,
    pub charge: Option<String>,
    pub payment_intent: Option<String>,
    pub metadata: HashMap<String, String>,
}

impl StripeClient {
    // ========================================================================
    // Refunds (for Admin API)
    // ========================================================================

    pub(crate) async fn create_refund_for_payment_intent(
        &self,
        payment_intent_id: &str,
        amount: Option<i64>,
        reason: Option<&str>,
        metadata: HashMap<String, String>,
        idempotency_key: &str,
    ) -> ServiceResult<AdminStripeRefund> {
        if !self.is_enabled() {
            return Err(ServiceError::Coded {
                code: ErrorCode::ConfigError,
                message: "Stripe is not configured".into(),
            });
        }

        // https://docs.stripe.com/api/refunds/create
        let mut form: Vec<(String, String)> =
            vec![("payment_intent".into(), payment_intent_id.to_string())];

        if let Some(amount) = amount {
            if amount > 0 {
                form.push(("amount".into(), amount.to_string()));
            }
        }

        if let Some(reason) = reason {
            if !reason.is_empty() {
                form.push(("reason".into(), reason.to_string()));
            }
        }

        for (k, v) in metadata {
            form.push((format!("metadata[{}]", k), v));
        }

        let response = self
            .stripe_post_with_idempotency("refunds", &form, Some(idempotency_key))
            .await?;
        let parsed: super::super::models::StripeRefundObject = serde_json::from_value(response)
            .map_err(|e| ServiceError::Coded {
                code: ErrorCode::StripeError,
                message: format!("failed to parse response: {}", e),
            })?;

        Ok(AdminStripeRefund {
            id: parsed.id,
            amount: parsed.amount,
            currency: parsed.currency,
            status: parsed.status,
            reason: parsed.reason,
            created_at: timestamp_to_datetime(parsed.created),
            charge: parsed.charge,
            payment_intent: parsed.payment_intent,
            metadata: parsed.metadata,
        })
    }
}
