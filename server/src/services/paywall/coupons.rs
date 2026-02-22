//! Coupon selection and application logic
//! Per spec 19-services-paywall.md

use chrono::Utc;
use tracing::warn;

use crate::models::{Asset, Coupon, Money, PaymentMethod, RoundingMode};
use crate::repositories::CouponRepository;

use super::types::CouponScope;

/// Select coupons for a payment based on scope and payment method
/// Per spec 19-services-paywall.md lines 131-150
pub async fn select_coupons_for_payment(
    coupon_repo: &dyn CouponRepository,
    tenant_id: &str,
    product_id: &str,
    payment_method: PaymentMethod,
    manual_coupon: Option<&Coupon>,
    scope: CouponScope,
) -> Vec<Coupon> {
    let now = Utc::now();
    let mut result = Vec::new();

    // Convert payment method to string for matching
    let pm_str = match payment_method {
        PaymentMethod::Stripe => "stripe",
        PaymentMethod::X402 => "x402",
        PaymentMethod::Credits => "credits",
    };

    // Get auto-apply coupons based on scope
    let auto_apply_coupons = match scope {
        CouponScope::All => {
            // For Stripe: Get all auto-apply coupons for this product
            coupon_repo
                .get_auto_apply_coupons_for_payment(tenant_id, product_id, &payment_method)
                .await
                .unwrap_or_default()
        }
        CouponScope::Catalog => {
            // Get catalog-only coupons (AppliesAt = "catalog")
            let all = coupon_repo
                .get_auto_apply_coupons_for_payment(tenant_id, product_id, &payment_method)
                .await
                .unwrap_or_default();
            all.into_iter()
                .filter(|c| c.applies_at.eq_ignore_ascii_case("catalog"))
                .collect()
        }
        CouponScope::Checkout => {
            // Get checkout coupons (AppliesAt = "checkout", Scope = "all")
            // Uses SQL-level filtering for efficiency
            coupon_repo
                .get_checkout_auto_apply_coupons(tenant_id, &payment_method)
                .await
                .unwrap_or_default()
        }
    };

    // Filter to valid coupons
    for coupon in auto_apply_coupons {
        if coupon.active
            && coupon.starts_at.map(|s| s <= now).unwrap_or(true)
            && coupon.expires_at.map(|e| e > now).unwrap_or(true)
            && coupon
                .usage_limit
                .map(|l| coupon.usage_count < l)
                .unwrap_or(true)
            && (coupon.payment_method.is_empty()
                || coupon.payment_method.eq_ignore_ascii_case(pm_str))
            // BUG-15: Skip first_purchase_only coupons — no customer context to verify eligibility
            && !coupon.first_purchase_only
        {
            result.push(coupon);
        }
    }

    // Add manual coupon if provided (comes last per spec)
    if let Some(manual) = manual_coupon {
        // Validate manual coupon
        // BUG-15: Skip first_purchase_only coupons — no customer context to verify eligibility
        if manual.active
            && !manual.first_purchase_only
            && manual.starts_at.map(|s| s <= now).unwrap_or(true)
            && manual.expires_at.map(|e| e > now).unwrap_or(true)
            && manual
                .usage_limit
                .map(|l| manual.usage_count < l)
                .unwrap_or(true)
            && (manual.payment_method.is_empty()
                || manual.payment_method.eq_ignore_ascii_case(pm_str))
        {
            // Don't add duplicates
            if !result
                .iter()
                .any(|c| c.code.eq_ignore_ascii_case(&manual.code))
            {
                result.push(manual.clone());
            }
        }
    }

    result
}

/// Stack coupons per spec: apply all percentage discounts multiplicatively,
/// then sum fixed discounts once, floor at zero.
/// Per spec (19-services-paywall.md lines 185-195)
pub fn stack_coupons_on_money(
    price: Money,
    coupons: &[Coupon],
    rounding_mode: RoundingMode,
) -> Money {
    stack_coupons_on_money_iter(price, coupons.iter(), rounding_mode)
}

/// Iterator-based coupon stacking to avoid per-call allocations.
///
/// The iterator must be cloneable so we can perform the required two-pass logic
/// (percentages first, then fixed discounts).
pub fn stack_coupons_on_money_iter<'a, I>(
    price: Money,
    coupons: I,
    rounding_mode: RoundingMode,
) -> Money
where
    I: Clone + IntoIterator<Item = &'a Coupon>,
{
    let mut result = price.clone();

    // 1. Apply ALL percentage discounts first (multiplicatively)
    // Per spec (19-services-paywall.md line 188): Values < 0 or > 100 are ignored
    for coupon in coupons
        .clone()
        .into_iter()
        .filter(|c| c.discount_type.eq_ignore_ascii_case("percentage"))
        .filter(|c| c.discount_value >= 0.0 && c.discount_value <= 100.0)
    {
        let multiplier = 1.0 - (coupon.discount_value / 100.0);
        result = match rounding_mode {
            RoundingMode::Ceiling => result.multiply_by_float(multiplier).round_up_to_cents(),
            RoundingMode::Standard => result.multiply_by_float(multiplier),
        };
    }

    // 2. Sum ALL fixed discounts, apply once
    // Per spec: Only valid non-negative fixed discounts are applied
    let total_fixed: i64 = coupons
        .into_iter()
        .filter(|c| c.discount_type.eq_ignore_ascii_case("fixed"))
        .filter(|c| {
            if c.discount_value < 0.0 {
                warn!(
                    coupon_code = %c.code,
                    discount_value = %c.discount_value,
                    "Skipping fixed coupon with negative discount_value - possible misconfiguration"
                );
                false
            } else {
                true
            }
        })
        .filter_map(|c| fixed_discount_atomic(c, &result.asset))
        .sum();

    result = result.subtract_atomic(total_fixed);

    // 3. Floor at zero - log warning as this may indicate misconfiguration
    if result.atomic < 0 {
        warn!(
            original_atomic = %price.atomic,
            total_fixed_discount = %total_fixed,
            "Discount exceeded price - clamping to zero. Consider reviewing coupon configuration."
        );
        result.atomic = 0;
    }

    result
}

/// Convert fixed discount to atomic units
/// Per spec: USD-pegged equivalence for stablecoins
fn fixed_discount_atomic(coupon: &Coupon, asset: &Asset) -> Option<i64> {
    // USD-pegged equivalence for stablecoins
    let allowed = ["USD", "USDC", "USDT", "PYUSD", "CASH"];
    if let Some(curr) = coupon.currency.as_ref() {
        if !allowed.contains(&curr.to_uppercase().as_str())
            || !allowed.contains(&asset.code.to_uppercase().as_str())
        {
            return None;
        }
    }
    Some(Money::from_major(asset.clone(), coupon.discount_value).atomic)
}

/// Interpolate memo template with resource ID and nonce
/// Per spec (19-services-paywall.md): Replace `{{resource}}` and `{{nonce}}`
pub fn interpolate_memo(template: Option<&str>, resource_id: &str) -> Option<String> {
    let template = template?;
    if template.is_empty() {
        return None;
    }

    let nonce = uuid::Uuid::new_v4().to_string();
    let result = template
        .replace("{{resource}}", resource_id)
        .replace("{{nonce}}", &nonce);

    Some(result)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_stack_coupons_iter_matches_slice() {
        let asset = crate::models::get_asset("USDC").expect("asset");
        let price = Money::from_major(asset, 10.00);

        let pct = Coupon {
            code: "P10".to_string(),
            discount_type: "percentage".to_string(),
            discount_value: 10.0,
            active: true,
            ..Default::default()
        };

        let fixed = Coupon {
            code: "F1".to_string(),
            discount_type: "fixed".to_string(),
            discount_value: 1.0,
            currency: Some("USD".to_string()),
            active: true,
            ..Default::default()
        };

        let coupons = vec![pct, fixed];
        let refs: Vec<&Coupon> = coupons.iter().collect();

        let a = stack_coupons_on_money(price.clone(), &coupons, RoundingMode::Standard);
        let b = stack_coupons_on_money_iter(
            price.clone(),
            refs.iter().copied(),
            RoundingMode::Standard,
        );
        assert_eq!(a.atomic, b.atomic);
        assert_eq!(a.asset.code, b.asset.code);

        let a = stack_coupons_on_money(price.clone(), &coupons, RoundingMode::Ceiling);
        let b = stack_coupons_on_money_iter(price, refs.iter().copied(), RoundingMode::Ceiling);
        assert_eq!(a.atomic, b.atomic);
        assert_eq!(a.asset.code, b.asset.code);
    }
}
