use serde::Deserialize;
use serde_json::{json, Map, Value};

use crate::error::{AppError, AppResult};
use crate::time;

#[path = "admin_catalog_ai_program_models.rs"]
mod program_models;
pub(super) use program_models::{
    program_invite_value, program_membership_value, ProgramInviteUpsertRequest,
    ProgramMembershipUpsertRequest,
};
#[path = "admin_catalog_ai_model_validation.rs"]
mod validation;
use validation::{
    has_active_price, one, usd, validate_currency, validate_handle, validate_metadata,
    validate_optional_text, validate_provider_price_id, validate_status, validate_text,
};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct QueryRequest {
    #[serde(default)]
    pub(super) stable_handle: Option<String>,
    #[serde(default)]
    pub(super) record_type: Option<String>,
    #[serde(default)]
    pub(super) include_archived: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct ProductUpsertRequest {
    pub(super) product: ProductInput,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct ProductActiveSetRequest {
    pub(super) product_id: String,
    pub(super) active: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct ProductDeleteRequest {
    pub(super) product_id: String,
    pub(super) confirmed: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct ProductInput {
    pub(super) stable_handle: String,
    pub(super) display_name: String,
    #[serde(default)]
    pub(super) description: String,
    pub(super) status: String,
    pub(super) public: bool,
    pub(super) purchasable: bool,
    pub(super) product_type: String,
    #[serde(default)]
    pub(super) sort_order: i64,
    #[serde(default)]
    pub(super) metadata: Map<String, Value>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct PriceUpsertRequest {
    pub(super) product_handle: String,
    pub(super) price: PriceInput,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct PriceInput {
    pub(super) stable_handle: String,
    pub(super) unit_amount_cents: i64,
    pub(super) currency: String,
    pub(super) billing_interval: String,
    #[serde(default = "one")]
    pub(super) billing_interval_count: i64,
    pub(super) status: String,
    pub(super) public: bool,
    pub(super) purchasable: bool,
    #[serde(default)]
    pub(super) trial_days: Option<i64>,
    #[serde(default)]
    pub(super) stripe_price_id: Option<String>,
    #[serde(default)]
    pub(super) metadata: Map<String, Value>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct ProgramUpsertRequest {
    pub(super) entitlement: ProgramInput,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct ProgramInput {
    pub(super) stable_handle: String,
    pub(super) display_name: String,
    pub(super) program: String,
    pub(super) status: String,
    #[serde(default)]
    pub(super) monthly_price_cents: Option<i64>,
    #[serde(default)]
    pub(super) annual_price_cents: Option<i64>,
    #[serde(default = "usd")]
    pub(super) currency: String,
    #[serde(default)]
    pub(super) expires_at: Option<String>,
    #[serde(default)]
    pub(super) renewal_required: bool,
    #[serde(default)]
    pub(super) minimum_qualified_sales_per_month: Option<i64>,
    #[serde(default)]
    pub(super) fallback_plan_handle: Option<String>,
    #[serde(default)]
    pub(super) metadata: Map<String, Value>,
}

pub(super) fn product_value(
    mut input: ProductInput,
    existing: Option<&Value>,
    now: i64,
) -> AppResult<Value> {
    validate_handle(&input.stable_handle, "product stableHandle")?;
    validate_text(&input.display_name, 120, "product displayName")?;
    validate_optional_text(&input.description, 2_000, "product description")?;
    validate_status(&input.status, true)?;
    if !matches!(
        input.product_type.as_str(),
        "subscription" | "capacityAddOn"
    ) {
        return Err(AppError::unprocessable(
            "productType must be subscription or capacityAddOn",
        ));
    }
    validate_metadata(&input.metadata)?;
    let available = input.status == "active";
    if (input.public || input.purchasable) && !available {
        return Err(AppError::unprocessable(
            "draft, archived, and legacy products cannot be public or purchasable",
        ));
    }
    preserve_stripe_sync_metadata(existing, &mut input.metadata);
    let prices = existing
        .and_then(|value| value.get("prices"))
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();
    if input.public && input.purchasable && !has_active_price(&prices) {
        return Err(AppError::unprocessable(
            "public purchasable products require an active purchasable price",
        ));
    }
    let created_at = existing
        .and_then(|value| value.get("createdAt"))
        .cloned()
        .unwrap_or_else(|| Value::String(time::iso8601(now)));
    let mut value = json!({
        "id": input.stable_handle,
        "stableHandle": input.stable_handle,
        "recordType": "product",
        "catalogSchemaVersion": 2,
        "displayName": input.display_name,
        "title": input.display_name,
        "slug": input.stable_handle,
        "description": input.description,
        "status": input.status,
        "active": available,
        "public": input.public,
        "purchasable": input.purchasable,
        "productType": input.product_type,
        "sortOrder": input.sort_order,
        "metadata": input.metadata,
        "prices": prices,
        "createdAt": created_at,
        "updatedAt": time::iso8601(now),
    });
    if let Some(stripe_product_id) = existing
        .and_then(|value| value.get("stripeProductId"))
        .and_then(Value::as_str)
        .filter(|value| value.starts_with("prod_"))
    {
        value["stripeProductId"] = Value::String(stripe_product_id.to_string());
    }
    Ok(value)
}

pub(super) fn price_value(
    product_handle: &str,
    mut input: PriceInput,
    existing: Option<&Value>,
    now: i64,
) -> AppResult<Value> {
    input.metadata.remove("cedros_stripe_price_fingerprint");
    input.metadata.remove("cedros_stripe_price_verified_at");
    validate_handle(product_handle, "productHandle")?;
    validate_handle(&input.stable_handle, "price stableHandle")?;
    validate_status(&input.status, false)?;
    validate_currency(&input.currency)?;
    validate_metadata(&input.metadata)?;
    if input.unit_amount_cents <= 0 {
        return Err(AppError::unprocessable(
            "unitAmountCents must be greater than zero",
        ));
    }
    if !matches!(input.billing_interval.as_str(), "month" | "year") {
        return Err(AppError::unprocessable(
            "billingInterval must be month or year",
        ));
    }
    if !(1..=12).contains(&input.billing_interval_count) {
        return Err(AppError::unprocessable(
            "billingIntervalCount must be between 1 and 12",
        ));
    }
    if input
        .trial_days
        .is_some_and(|days| !(0..=365).contains(&days))
    {
        return Err(AppError::unprocessable(
            "trialDays must be between 0 and 365",
        ));
    }
    if let Some(id) = input.stripe_price_id.as_deref() {
        validate_provider_price_id(id)?;
    }
    let active = input.status == "active";
    if (input.public || input.purchasable) && !active {
        return Err(AppError::unprocessable(
            "draft and archived prices cannot be public or purchasable",
        ));
    }
    let id = existing
        .and_then(|value| value.get("id"))
        .and_then(Value::as_str)
        .map(str::to_string)
        .unwrap_or_else(|| format!("{product_handle}-{}", input.stable_handle));
    let created_at = existing
        .and_then(|value| value.get("createdAt"))
        .cloned()
        .unwrap_or_else(|| Value::String(time::iso8601(now)));
    let stripe_price_id = if input.stripe_price_id.is_some() {
        input.stripe_price_id.clone()
    } else {
        existing
            .filter(|value| price_terms_match(value, &input))
            .and_then(|value| value.get("stripePriceId"))
            .and_then(Value::as_str)
            .filter(|value| value.starts_with("price_"))
            .map(str::to_string)
    };
    Ok(json!({
        "id": id,
        "stableHandle": input.stable_handle,
        "unitAmountCents": input.unit_amount_cents,
        "currency": input.currency.to_ascii_uppercase(),
        "billingInterval": input.billing_interval,
        "billingIntervalCount": input.billing_interval_count,
        "status": input.status,
        "active": active,
        "public": input.public,
        "purchasable": input.purchasable,
        "trialDays": input.trial_days,
        "stripePriceId": stripe_price_id,
        "metadata": input.metadata,
        "createdAt": created_at,
        "updatedAt": time::iso8601(now),
    }))
}

fn price_terms_match(existing: &Value, input: &PriceInput) -> bool {
    existing
        .get("unitAmountCents")
        .and_then(Value::as_i64)
        .is_some_and(|amount| amount == input.unit_amount_cents)
        && existing
            .get("currency")
            .and_then(Value::as_str)
            .is_some_and(|currency| currency.eq_ignore_ascii_case(&input.currency))
        && existing
            .get("billingInterval")
            .and_then(Value::as_str)
            .is_some_and(|interval| interval == input.billing_interval)
        && existing
            .get("billingIntervalCount")
            .and_then(Value::as_i64)
            .is_some_and(|count| count == input.billing_interval_count)
}

fn preserve_stripe_sync_metadata(existing: Option<&Value>, metadata: &mut Map<String, Value>) {
    const SERVER_OWNED_KEYS: &[&str] = &[
        "cedros_stripe_product_identity",
        "cedros_stripe_sync_fingerprint",
        "cedros_stripe_sync_status",
        "cedros_stripe_sync_source",
        "cedros_stripe_synced_at",
        "cedros_stripe_sync_error",
    ];
    let existing = existing
        .and_then(|value| value.get("metadata"))
        .and_then(Value::as_object);
    for key in SERVER_OWNED_KEYS {
        metadata.remove(*key);
        if let Some(value) = existing.and_then(|metadata| metadata.get(*key)) {
            metadata.insert((*key).to_string(), value.clone());
        }
    }
}

pub(super) fn program_value(
    input: ProgramInput,
    existing: Option<&Value>,
    now: i64,
) -> AppResult<Value> {
    validate_handle(&input.stable_handle, "entitlement stableHandle")?;
    validate_text(&input.display_name, 120, "entitlement displayName")?;
    validate_status(&input.status, false)?;
    validate_currency(&input.currency)?;
    validate_metadata(&input.metadata)?;
    if !matches!(
        input.program.as_str(),
        "ambassador" | "affiliate" | "salesPartner"
    ) {
        return Err(AppError::unprocessable(
            "program must be ambassador, affiliate, or salesPartner",
        ));
    }
    if input.monthly_price_cents.is_some_and(|amount| amount <= 0)
        || input.annual_price_cents.is_some_and(|amount| amount <= 0)
    {
        return Err(AppError::unprocessable(
            "monthlyPriceCents and annualPriceCents must be greater than zero when configured",
        ));
    }
    if input.monthly_price_cents.is_some() != input.annual_price_cents.is_some() {
        return Err(AppError::unprocessable(
            "monthlyPriceCents and annualPriceCents must be configured together",
        ));
    }
    if input
        .annual_price_cents
        .is_some_and(|amount| amount % 12 != 0)
    {
        return Err(AppError::unprocessable(
            "annualPriceCents must have an exact monthly equivalent",
        ));
    }
    let pricing_configured = input.monthly_price_cents.is_some();
    if input.status == "active" && !pricing_configured {
        return Err(AppError::unprocessable(
            "active program entitlements require approved monthly and annual prices",
        ));
    }
    let qualified_sale_policy = match (
        input.minimum_qualified_sales_per_month,
        input.fallback_plan_handle.as_deref(),
    ) {
        (None, None) => Value::Null,
        (Some(minimum), Some(fallback)) => {
            if input.program != "affiliate" {
                return Err(AppError::unprocessable(
                    "monthly qualified-sale requirements are only valid for Affiliate",
                ));
            }
            if minimum <= 0 {
                return Err(AppError::unprocessable(
                    "minimumQualifiedSalesPerMonth must be greater than zero",
                ));
            }
            validate_handle(fallback, "fallbackPlanHandle")?;
            json!({
                "kind": "monthlyQualifiedAffiliateSale",
                "minimumQualifiedSales": minimum,
                "period": "month",
                "fallbackPlanHandle": fallback,
                "transitionTiming": "nextBillingRenewal"
            })
        }
        _ => {
            return Err(AppError::unprocessable(
                "minimumQualifiedSalesPerMonth and fallbackPlanHandle must be configured together",
            ));
        }
    };
    if !qualified_sale_policy.is_null() && !input.renewal_required {
        return Err(AppError::unprocessable(
            "qualified-sale requirements require renewalRequired",
        ));
    }
    let created_at = existing
        .and_then(|value| value.get("createdAt"))
        .cloned()
        .unwrap_or_else(|| Value::String(time::iso8601(now)));
    Ok(json!({
        "id": input.stable_handle,
        "stableHandle": input.stable_handle,
        "recordType": "programEntitlement",
        "catalogSchemaVersion": 2,
        "displayName": input.display_name,
        "program": input.program,
        "accountModel": "individual",
        "status": input.status,
        "active": input.status == "active",
        "public": false,
        "purchasable": false,
        "pricing": {
            "kind": "fixedProgramRecurringPrices",
            "configured": pricing_configured,
            "currency": input.currency.to_ascii_uppercase(),
            "monthly": input.monthly_price_cents.map(|amount| json!({
                "unitAmountCents": amount,
                "billingInterval": "month",
                "billingIntervalCount": 1
            })),
            "annual": input.annual_price_cents.map(|amount| json!({
                "unitAmountCents": amount,
                "monthlyEquivalentCents": amount / 12,
                "billingInterval": "year",
                "billingIntervalCount": 1
            }))
        },
        "activation": {
            "mode": "applicationOrInvitation",
            "identityBound": true,
            "nonTransferable": true,
            "activationCodePurpose": "programEntitlementActivation",
            "referralCodePurpose": "customerReferralAttribution",
            "onePricingEntitlementAtATime": true,
            "stackable": false,
            "discountsBusiness": false,
            "discountsAddOns": false,
            "revocableWithoutWorkDeletion": true,
            "transitionPlanHandles": ["cedros-individual", "cedros-developer", "cedros-business"],
            "expiresAt": input.expires_at,
            "renewalRequired": input.renewal_required,
            "eligibilityPolicy": qualified_sale_policy
        },
        "metadata": input.metadata,
        "createdAt": created_at,
        "updatedAt": time::iso8601(now),
    }))
}
