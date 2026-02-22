//! Stripe subscription management
//!
//! Handles cancelling, reactivating, querying, previewing proration for,
//! and changing subscriptions.

use chrono::Utc;

use crate::errors::ErrorCode;
use crate::services::{ServiceError, ServiceResult};

use super::super::models::{ProrationLine, ProrationPreview, SubscriptionChangeResult};
use super::{timestamp_to_datetime, StripeClient};

impl StripeClient {
    /// Cancel a subscription
    pub async fn cancel_subscription(
        &self,
        stripe_sub_id: &str,
        at_period_end: bool,
    ) -> ServiceResult<()> {
        if at_period_end {
            let form: Vec<(String, String)> =
                vec![("cancel_at_period_end".into(), "true".to_string())];
            self.stripe_post(&format!("subscriptions/{}", stripe_sub_id), &form)
                .await?;
        } else {
            self.stripe_delete(&format!("subscriptions/{}", stripe_sub_id))
                .await?;
        }
        Ok(())
    }

    /// Reactivate a cancelled subscription
    pub async fn reactivate_subscription(&self, stripe_sub_id: &str) -> ServiceResult<()> {
        let form: Vec<(String, String)> =
            vec![("cancel_at_period_end".into(), "false".to_string())];
        self.stripe_post(&format!("subscriptions/{}", stripe_sub_id), &form)
            .await?;
        Ok(())
    }

    /// Get subscription details
    pub async fn get_subscription(&self, stripe_sub_id: &str) -> ServiceResult<serde_json::Value> {
        self.stripe_get(&format!("subscriptions/{}", stripe_sub_id))
            .await
    }

    /// Preview proration for subscription change
    pub async fn preview_proration(
        &self,
        stripe_sub_id: &str,
        new_price_id: &str,
    ) -> ServiceResult<ProrationPreview> {
        // Get current subscription
        let sub = self
            .stripe_get(&format!("subscriptions/{}", stripe_sub_id))
            .await?;
        let items = sub
            .get("items")
            .and_then(|v| v.get("data"))
            .and_then(|v| v.as_array())
            .ok_or_else(|| ServiceError::Coded {
                code: ErrorCode::StripeError,
                message: "missing subscription items".into(),
            })?;

        let item_id = items
            .first()
            .and_then(|v| v.get("id"))
            .and_then(|v| v.as_str())
            .ok_or_else(|| ServiceError::Coded {
                code: ErrorCode::StripeError,
                message: "missing item id".into(),
            })?;

        // Get upcoming invoice with proration
        let now = Utc::now().timestamp();
        let form = vec![
            ("subscription", stripe_sub_id.to_string()),
            ("subscription_items[0][id]", item_id.to_string()),
            ("subscription_items[0][price]", new_price_id.to_string()),
            (
                "subscription_proration_behavior",
                "create_prorations".to_string(),
            ),
            ("subscription_proration_date", now.to_string()),
        ];

        let response = self
            .stripe_get_with_params("invoices/upcoming", &form)
            .await?;

        let amount_due = response
            .get("amount_due")
            .and_then(|v| v.as_i64())
            .unwrap_or(0);
        let currency = response
            .get("currency")
            .and_then(|v| v.as_str())
            .unwrap_or("usd")
            .to_string();
        let next_date = response
            .get("next_payment_attempt")
            .and_then(|v| v.as_i64())
            .unwrap_or(now);

        let mut lines = Vec::new();
        let mut proration_amount = 0i64;

        if let Some(line_data) = response
            .get("lines")
            .and_then(|v| v.get("data"))
            .and_then(|v| v.as_array())
        {
            for line in line_data {
                let desc = line
                    .get("description")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                let amt = line.get("amount").and_then(|v| v.as_i64()).unwrap_or(0);
                let proration = line
                    .get("proration")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(false);

                if proration {
                    proration_amount += amt;
                }

                let period = line.get("period").unwrap_or(&serde_json::Value::Null);
                let start = period.get("start").and_then(|v| v.as_i64()).unwrap_or(now);
                let end = period.get("end").and_then(|v| v.as_i64()).unwrap_or(now);

                lines.push(ProrationLine {
                    description: desc,
                    amount: amt,
                    period_start: timestamp_to_datetime(start),
                    period_end: timestamp_to_datetime(end),
                });
            }
        }

        Ok(ProrationPreview {
            amount_due,
            proration_amount,
            currency,
            next_payment_date: timestamp_to_datetime(next_date),
            lines,
        })
    }

    /// Change subscription to a different plan/price
    pub async fn change_subscription(
        &self,
        stripe_sub_id: &str,
        new_price_id: &str,
        proration_behavior: &str,
    ) -> ServiceResult<SubscriptionChangeResult> {
        // Get current subscription
        let sub = self
            .stripe_get(&format!("subscriptions/{}", stripe_sub_id))
            .await?;

        let items = sub
            .get("items")
            .and_then(|v| v.get("data"))
            .and_then(|v| v.as_array())
            .ok_or_else(|| ServiceError::Coded {
                code: ErrorCode::StripeError,
                message: "missing subscription items".into(),
            })?;

        let item_id = items
            .first()
            .and_then(|v| v.get("id"))
            .and_then(|v| v.as_str())
            .ok_or_else(|| ServiceError::Coded {
                code: ErrorCode::StripeError,
                message: "missing item id".into(),
            })?;

        let previous_price_id = items
            .first()
            .and_then(|v| v.get("price"))
            .and_then(|v| v.get("id"))
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();

        // Update subscription with new price
        let form: Vec<(String, String)> = vec![
            ("items[0][id]".into(), item_id.to_string()),
            ("items[0][price]".into(), new_price_id.to_string()),
            ("proration_behavior".into(), proration_behavior.to_string()),
        ];

        let response = self
            .stripe_post(&format!("subscriptions/{}", stripe_sub_id), &form)
            .await?;

        let status = response
            .get("status")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown")
            .to_string();
        let current_period_end = response
            .get("current_period_end")
            .and_then(|v| v.as_i64())
            .unwrap_or(0);

        Ok(SubscriptionChangeResult {
            subscription_id: stripe_sub_id.to_string(),
            previous_price_id,
            new_price_id: new_price_id.to_string(),
            status,
            current_period_end: timestamp_to_datetime(current_period_end),
            proration_behavior: proration_behavior.to_string(),
        })
    }
}
