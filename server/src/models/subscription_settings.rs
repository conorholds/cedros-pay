//! Subscription plan settings for admin configuration
//!
//! These models define the subscription plans available for purchase,
//! separate from actual active Subscription records.

use serde::{Deserialize, Serialize};

/// Full subscription configuration for a tenant
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SubscriptionSettings {
    /// Feature toggle - whether subscriptions are enabled
    #[serde(default)]
    pub enabled: bool,

    /// All subscription plans
    #[serde(default)]
    pub plans: Vec<SubscriptionPlan>,

    /// Page title (e.g., "Choose Your Plan")
    #[serde(skip_serializing_if = "Option::is_none")]
    pub page_title: Option<String>,

    /// Page subtitle (e.g., "Select the plan that best fits your needs.")
    #[serde(skip_serializing_if = "Option::is_none")]
    pub page_subtitle: Option<String>,

    /// Annual savings badge text (e.g., "2 months free")
    #[serde(skip_serializing_if = "Option::is_none")]
    pub annual_savings_badge: Option<String>,

    /// Popular badge text (e.g., "Best Deal")
    #[serde(skip_serializing_if = "Option::is_none")]
    pub popular_badge_text: Option<String>,

    /// Footer notice/legal text
    #[serde(skip_serializing_if = "Option::is_none")]
    pub footer_notice: Option<String>,
}

/// Individual subscription plan definition
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubscriptionPlan {
    /// Unique plan ID (e.g., "plan_starter")
    pub id: String,

    /// Plan title (e.g., "Starter", "Pro", "Enterprise")
    pub title: String,

    /// Plan description
    #[serde(default)]
    pub description: String,

    /// Monthly price in USD (e.g., 10 for $10/month)
    pub price_monthly_usd: f64,

    /// Annual price in USD (e.g., 100 for $100/year)
    pub price_annual_usd: f64,

    /// Feature list (bullet points)
    #[serde(default)]
    pub features: Vec<String>,

    /// Bold text above features (e.g., "100 requests/month")
    #[serde(skip_serializing_if = "Option::is_none")]
    pub feature_highlight: Option<String>,

    /// Custom button text (default: "Purchase")
    #[serde(skip_serializing_if = "Option::is_none")]
    pub button_text: Option<String>,

    /// Whether this plan should be highlighted as popular
    #[serde(default)]
    pub is_popular: bool,

    /// Whether this plan is available for purchase
    #[serde(default = "default_true")]
    pub is_active: bool,

    /// Display order (lower numbers first)
    #[serde(default)]
    pub sort_order: i32,

    /// Stripe Price ID for monthly billing (auto-generated)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stripe_price_id_monthly: Option<String>,

    /// Stripe Price ID for annual billing (auto-generated)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stripe_price_id_annual: Option<String>,

    /// Stripe Product ID (auto-generated)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stripe_product_id: Option<String>,

    /// Inventory quantity limit (null = unlimited)
    /// When set, limits the number of subscriptions that can be created for this plan
    #[serde(skip_serializing_if = "Option::is_none")]
    pub inventory_quantity: Option<i32>,

    /// Number of subscriptions sold for this plan (read-only, computed)
    /// Populated by backend when returning settings, not stored in config
    #[serde(skip_serializing_if = "Option::is_none")]
    pub inventory_sold: Option<i32>,
}

fn default_true() -> bool {
    true
}

impl SubscriptionPlan {
    /// Generate a plan ID if not provided
    pub fn ensure_id(&mut self) {
        if self.id.is_empty() {
            self.id = format!(
                "plan_{}",
                uuid::Uuid::new_v4()
                    .to_string()
                    .split('-')
                    .next()
                    .unwrap_or("unknown")
            );
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_deserialize_settings() {
        let json = r#"{
            "enabled": true,
            "pageTitle": "Choose Your Plan",
            "plans": [
                {
                    "id": "plan_starter",
                    "title": "Starter",
                    "description": "For individuals",
                    "priceMonthlyUsd": 10,
                    "priceAnnualUsd": 100,
                    "features": ["Feature 1", "Feature 2"],
                    "isActive": true
                }
            ]
        }"#;

        let settings: SubscriptionSettings = serde_json::from_str(json).unwrap();
        assert!(settings.enabled);
        assert_eq!(settings.plans.len(), 1);
        assert_eq!(settings.plans[0].title, "Starter");
        assert_eq!(settings.plans[0].price_monthly_usd, 10.0);
    }

    #[test]
    fn test_ensure_id() {
        let mut plan = SubscriptionPlan {
            id: String::new(),
            title: "Test".into(),
            description: String::new(),
            price_monthly_usd: 10.0,
            price_annual_usd: 100.0,
            features: vec![],
            feature_highlight: None,
            button_text: None,
            is_popular: false,
            is_active: true,
            sort_order: 0,
            stripe_price_id_monthly: None,
            stripe_price_id_annual: None,
            stripe_product_id: None,
            inventory_quantity: None,
            inventory_sold: None,
        };

        plan.ensure_id();
        assert!(plan.id.starts_with("plan_"));
    }
}
