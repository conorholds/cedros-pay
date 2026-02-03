use std::collections::HashMap;
use std::fmt;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
#[derive(Default)]
pub enum SubscriptionStatus {
    #[default]
    Active,
    Trialing,
    PastDue,
    Cancelled,
    Unpaid,
    Expired,
}

impl fmt::Display for SubscriptionStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            SubscriptionStatus::Active => write!(f, "active"),
            SubscriptionStatus::Trialing => write!(f, "trialing"),
            SubscriptionStatus::PastDue => write!(f, "past_due"),
            // Per spec (03-http-endpoints-subscriptions.md): Use American spelling "canceled"
            SubscriptionStatus::Cancelled => write!(f, "canceled"),
            SubscriptionStatus::Unpaid => write!(f, "unpaid"),
            SubscriptionStatus::Expired => write!(f, "expired"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
#[derive(Default)]
pub enum BillingPeriod {
    Day,
    Week,
    #[default]
    Month,
    Year,
}

impl fmt::Display for BillingPeriod {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            BillingPeriod::Day => write!(f, "day"),
            BillingPeriod::Week => write!(f, "week"),
            BillingPeriod::Month => write!(f, "month"),
            BillingPeriod::Year => write!(f, "year"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
#[derive(Default)]
pub enum PaymentMethod {
    #[default]
    Stripe,
    X402,
    /// Credits payment via cedros-login deposit system
    Credits,
}

impl fmt::Display for PaymentMethod {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            PaymentMethod::Stripe => write!(f, "stripe"),
            PaymentMethod::X402 => write!(f, "x402"),
            PaymentMethod::Credits => write!(f, "credits"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct Subscription {
    pub id: String,
    /// Tenant ID for multi-tenant isolation per spec (10-middleware.md)
    #[serde(default = "default_tenant")]
    pub tenant_id: String,
    pub product_id: String,
    /// Plan ID from SubscriptionPlan settings (for inventory tracking)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub plan_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub wallet: Option<String>,
    /// User ID from cedros-login (optional for wallet-only subscriptions)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stripe_customer_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stripe_subscription_id: Option<String>,
    pub payment_method: PaymentMethod,
    pub billing_period: BillingPeriod,
    /// Number of billing periods between charges (must be >= 1).
    ///
    /// # Invariant
    /// Value must be >= 1. Enforced at API boundary in handlers (subscriptions.rs).
    /// Type is i32 for JSON compatibility; validation rejects < 1.
    pub billing_interval: i32,
    pub status: SubscriptionStatus,
    pub current_period_start: DateTime<Utc>,
    pub current_period_end: DateTime<Utc>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub trial_end: Option<DateTime<Utc>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cancelled_at: Option<DateTime<Utc>>,
    #[serde(default)]
    pub cancel_at_period_end: bool,
    #[serde(default)]
    pub metadata: HashMap<String, String>,
    /// Payment signature used for this subscription (for x402/credits payments).
    /// Used for idempotency - prevents duplicate subscriptions for the same payment.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub payment_signature: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<DateTime<Utc>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<DateTime<Utc>>,
}

fn default_tenant() -> String {
    "default".to_string()
}

impl Subscription {
    /// Check if subscription is currently active.
    /// Must check both period_start and period_end to ensure the subscription
    /// has started and hasn't ended yet.
    pub fn is_active(&self) -> bool {
        let now = Utc::now();
        matches!(
            self.status,
            SubscriptionStatus::Active | SubscriptionStatus::Trialing | SubscriptionStatus::PastDue
        ) && self.current_period_start <= now
            && self.current_period_end > now
    }

    pub fn is_active_at(&self, t: DateTime<Utc>) -> bool {
        matches!(
            self.status,
            SubscriptionStatus::Active | SubscriptionStatus::Trialing | SubscriptionStatus::PastDue
        ) && self.current_period_start <= t
            && self.current_period_end > t // Use > for consistency with is_active()
    }

    pub fn is_trialing(&self) -> bool {
        matches!(self.status, SubscriptionStatus::Trialing)
    }

    pub fn days_until_expiration(&self) -> i64 {
        let now = Utc::now();
        if self.current_period_end <= now {
            return 0;
        }
        let delta = self.current_period_end - now;
        delta.num_days()
    }

    /// Check if subscription has access considering grace period
    pub fn has_access(&self, grace_period_hours: i64) -> bool {
        if self.is_active() {
            return true;
        }

        // Check grace period for x402/credits subscriptions (non-recurring payments)
        // Grace period applies when subscription is PastDue or recently expired
        // (i.e., the period has ended but we give extra time for payment)
        if matches!(
            self.payment_method,
            PaymentMethod::X402 | PaymentMethod::Credits
        ) && grace_period_hours > 0
            && matches!(
                self.status,
                SubscriptionStatus::PastDue | SubscriptionStatus::Expired
            )
        {
            let grace_end = self.current_period_end + chrono::Duration::hours(grace_period_hours);
            if Utc::now() < grace_end {
                return true;
            }
        }

        false
    }

    /// Check if subscription can be reactivated
    pub fn can_reactivate(&self) -> bool {
        self.cancel_at_period_end && self.current_period_end > Utc::now()
    }

    /// Validate that billing_interval has a valid value.
    ///
    /// Returns error message if validation fails. Interval must be >= 1.
    pub fn validate_billing_interval(&self) -> Result<(), String> {
        if self.billing_interval < 1 {
            return Err(format!(
                "billing_interval must be >= 1, got {}",
                self.billing_interval
            ));
        }
        Ok(())
    }
}

// ============================================================================
// Request/Response Types per spec 18-services-subscriptions.md
// ============================================================================

/// Request to create a Stripe subscription
/// Per spec 18-services-subscriptions.md
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateStripeSubscriptionRequest {
    pub product_id: String,
    /// Plan ID from SubscriptionPlan settings (for inventory tracking)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub plan_id: Option<String>,
    pub stripe_customer_id: String,
    pub stripe_subscription_id: String,
    pub billing_period: BillingPeriod,
    pub billing_interval: i32,
    pub current_period_start: DateTime<Utc>,
    pub current_period_end: DateTime<Utc>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub trial_end: Option<DateTime<Utc>>,
    #[serde(default)]
    pub metadata: Option<HashMap<String, String>>,
}

/// Request to create an x402 subscription
/// Per spec 18-services-subscriptions.md
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateX402SubscriptionRequest {
    pub wallet: String,
    pub product_id: String,
    /// Plan ID from SubscriptionPlan settings (for inventory tracking)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub plan_id: Option<String>,
    pub billing_period: BillingPeriod,
    pub billing_interval: i32,
    #[serde(default)]
    pub metadata: Option<HashMap<String, String>>,
}

/// Request to change/update a subscription
/// Per spec 18-services-subscriptions.md
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChangeSubscriptionRequest {
    pub subscription_id: String,
    pub new_product_id: String,
    pub new_billing_period: BillingPeriod,
    pub new_billing_interval: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub new_price_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub proration_behavior: Option<String>,
    #[serde(default)]
    pub metadata: Option<HashMap<String, String>>,
}
