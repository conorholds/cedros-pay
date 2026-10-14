use serde_json::Value;

use crate::routes::products::{catalog_currency, catalog_price_cents, is_capacity_product};

use super::{
    bool_field, first_string, int_field, normalize_interval, resolved_solana_plan, string_field,
    usd_to_cents, ResolvedPlan,
};

pub(super) fn settings_plan(plan: &Value, interval: &str) -> Option<ResolvedPlan> {
    if is_capacity_product(plan) {
        return None;
    }
    let annual = interval == "yearly";
    let price = if annual {
        "priceAnnualUsd"
    } else {
        "priceMonthlyUsd"
    };
    let stripe = if annual {
        "stripePriceIdAnnual"
    } else {
        "stripePriceIdMonthly"
    };
    let id = string_field(plan, "id")?;
    Some(ResolvedPlan {
        price_id: None,
        title: string_field(plan, "title").unwrap_or_else(|| id.clone()),
        description: string_field(plan, "description").unwrap_or_default(),
        price_cents: usd_to_cents(plan.get(price).and_then(Value::as_f64).unwrap_or(0.0)),
        currency: "USD".to_string(),
        interval: interval.to_string(),
        interval_count: 1,
        trial_days: int_field(plan, "trialDays").filter(|days| (0..=365).contains(days)),
        sort_order: int_field(plan, "sortOrder").unwrap_or(0),
        active: bool_field(plan, "isActive").unwrap_or(true),
        public: bool_field(plan, "public").unwrap_or(true),
        purchasable: true,
        stripe_inline: false,
        account_model: None,
        program: None,
        public_on_main_pricing_page: None,
        public_on_developer_page: None,
        stripe_price_id: string_field(plan, stripe),
        solana: resolved_solana_plan(plan, interval),
        id,
    })
}

pub(super) fn product_plan(product: &Value, interval: &str) -> Option<ResolvedPlan> {
    if is_capacity_product(product) {
        return None;
    }
    if let Some(price) = catalog_recurring_price(product, interval) {
        let id = string_field(product, "id")?;
        let metadata = product.get("metadata");
        return Some(ResolvedPlan {
            title: first_string(product, &["displayName", "title", "name"])
                .unwrap_or_else(|| id.clone()),
            description: first_string(product, &["shortDescription", "description"])
                .unwrap_or_default(),
            price_cents: int_field(price, "unitAmountCents")?,
            currency: string_field(price, "currency")
                .map(|currency| currency.to_ascii_uppercase())?,
            interval: interval.to_string(),
            interval_count: int_field(price, "billingIntervalCount")
                .filter(|count| *count > 0)
                .unwrap_or(1),
            trial_days: int_field(price, "trialDays").filter(|days| (0..=365).contains(days)),
            sort_order: int_field(product, "sortOrder").unwrap_or(0),
            active: bool_field(product, "active").unwrap_or(false)
                && bool_field(price, "active").unwrap_or(false),
            public: bool_field(product, "public").unwrap_or(false)
                && bool_field(price, "public").unwrap_or(false),
            purchasable: bool_field(product, "purchasable").unwrap_or(false)
                && bool_field(price, "purchasable").unwrap_or(false),
            stripe_inline: true,
            account_model: metadata.and_then(|value| string_field(value, "accountModel")),
            program: metadata.and_then(|value| string_field(value, "program")),
            public_on_main_pricing_page: metadata
                .and_then(|value| bool_field(value, "publicOnMainPricingPage")),
            public_on_developer_page: metadata
                .and_then(|value| bool_field(value, "publicOnDeveloperPage")),
            price_id: string_field(price, "id").or_else(|| string_field(price, "stableHandle")),
            stripe_price_id: string_field(price, "stripePriceId"),
            solana: None,
            id,
        });
    }
    let sub = product
        .get("subscription")
        .filter(|value| value.is_object())?;
    let product_interval = normalize_interval(subscription_interval(sub).as_deref()).ok()?;
    if product_interval != interval {
        return None;
    }
    let id = string_field(product, "id")?;
    Some(ResolvedPlan {
        price_id: string_field(product, "priceId"),
        title: first_string(product, &["displayName", "title", "name"])
            .unwrap_or_else(|| id.clone()),
        description: first_string(product, &["shortDescription", "description"])
            .unwrap_or_default(),
        price_cents: catalog_price_cents(product).unwrap_or(0),
        currency: catalog_currency(product),
        interval: interval.to_string(),
        interval_count: 1,
        trial_days: int_field(sub, "trialDays").filter(|days| (0..=365).contains(days)),
        sort_order: int_field(product, "sortOrder").unwrap_or(0),
        active: bool_field(product, "active").unwrap_or(false),
        public: bool_field(product, "public").unwrap_or(true),
        purchasable: bool_field(product, "purchasable").unwrap_or(true),
        stripe_inline: false,
        account_model: None,
        program: None,
        public_on_main_pricing_page: None,
        public_on_developer_page: None,
        stripe_price_id: string_field(sub, "stripePriceId")
            .or_else(|| string_field(product, "stripePriceId")),
        solana: None,
        id,
    })
}

pub(super) fn payment_methods_for_plan(plan: &ResolvedPlan) -> Vec<&'static str> {
    if plan.price_cents == 0 {
        return vec!["free"];
    }
    let mut methods = Vec::new();
    if plan.stripe_price_id.is_some() || plan.stripe_inline {
        methods.push("stripe");
    }
    if plan.solana.is_some() {
        methods.push("solana_subscription");
    }
    methods
}

fn catalog_recurring_price<'a>(product: &'a Value, interval: &str) -> Option<&'a Value> {
    let expected = if interval == "yearly" {
        "year"
    } else {
        "month"
    };
    let matches = product
        .get("prices")?
        .as_array()?
        .iter()
        .filter(|price| string_field(price, "billingInterval").as_deref() == Some(expected))
        .filter(|price| int_field(price, "unitAmountCents").is_some_and(|amount| amount > 0))
        .filter(|price| bool_field(price, "active") == Some(true))
        .filter(|price| bool_field(price, "public") == Some(true))
        .filter(|price| bool_field(price, "purchasable") == Some(true))
        .collect::<Vec<_>>();
    if matches.len() == 1 {
        Some(matches[0])
    } else {
        None
    }
}

fn subscription_interval(sub: &Value) -> Option<String> {
    string_field(sub, "billingPeriod")
        .or_else(|| string_field(sub, "interval"))
        .or_else(|| string_field(sub, "billing_period"))
}
