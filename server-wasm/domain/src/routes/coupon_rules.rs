use serde_json::Value;

use crate::error::{AppError, AppResult};
use crate::{time, x402};

use super::coupon_values::{
    decimal_field_scaled, integer_field, non_empty_array, optional_i64, positive_i64, string_field,
    truthy,
};

#[derive(Debug, Clone, Copy)]
pub(crate) enum CouponPurpose {
    CartQuote,
    StripeSession,
}

#[derive(Debug, Clone, Copy)]
pub(super) enum CouponDiscount {
    Bps(u32),
    FixedCents(i64),
}

pub(super) fn validate_coupon_doc(
    doc: &Value,
    code: &str,
    purpose: CouponPurpose,
    amount_cents: i64,
    currency: &str,
    now: i64,
) -> AppResult<()> {
    if string_field(doc, "recordType").is_some_and(|record_type| record_type != "coupon") {
        return Err(invalid("couponCode is malformed"));
    }
    if string_field(doc, "code")
        .map(|stored| stored.trim().to_uppercase())
        .as_deref()
        != Some(code)
    {
        return Err(invalid("couponCode is malformed"));
    }
    if doc.get("active").and_then(Value::as_bool) != Some(true) {
        return Err(AppError::new(
            422,
            "coupon_not_applicable",
            "couponCode is inactive",
        ));
    }
    validate_time_window(doc, now)?;
    validate_usage(doc)?;
    validate_supported_scope(doc)?;
    validate_minimum_amount(doc, amount_cents)?;
    validate_purpose(doc, purpose)?;
    validate_currency(doc, currency)
}

pub(super) fn discount_from_doc(doc: &Value, currency: &str) -> AppResult<CouponDiscount> {
    let discount_type = string_field(doc, "discountType");
    match discount_type.as_deref() {
        Some("percentage") => parse_bps_discount(doc),
        Some("fixed") => parse_fixed_discount(doc, currency),
        Some(_) => Err(not_applicable("couponCode discount type is not supported")),
        None => parse_bps_discount(doc).or_else(|_| parse_fixed_discount(doc, currency)),
    }
}

pub(super) fn invalid(message: &'static str) -> AppError {
    AppError::new(422, "invalid_coupon", message)
}

pub(super) fn not_applicable(message: &'static str) -> AppError {
    AppError::new(422, "coupon_not_applicable", message)
}

fn validate_time_window(doc: &Value, now: i64) -> AppResult<()> {
    if let Some(starts_at) = string_field(doc, "startsAt") {
        let start =
            parse_window_start(&starts_at).ok_or_else(|| invalid("couponCode is malformed"))?;
        if now < start {
            return Err(not_applicable("couponCode is not active yet"));
        }
    }
    if let Some(expires_at) = string_field(doc, "expiresAt") {
        let expiry =
            parse_window_end(&expires_at).ok_or_else(|| invalid("couponCode is malformed"))?;
        if now > expiry {
            return Err(AppError::new(
                422,
                "coupon_expired",
                "couponCode has expired",
            ));
        }
    }
    Ok(())
}

/// Window bounds accept full ISO timestamps or the admin form's date-only
/// `YYYY-MM-DD` values. A date-only start begins at 00:00:00 UTC.
fn parse_window_start(value: &str) -> Option<i64> {
    time::parse_iso(value).or_else(|| time::parse_date(value))
}

/// A date-only expiry is valid through the END of that day (23:59:59 UTC), so
/// "expires 2026-07-31" honours codes redeemed on the 31st.
fn parse_window_end(value: &str) -> Option<i64> {
    time::parse_iso(value).or_else(|| time::parse_date(value).map(|day| day + 86_399))
}

fn validate_usage(doc: &Value) -> AppResult<()> {
    if truthy(doc, "firstPurchaseOnly") || positive_i64(doc, "usageLimitPerCustomer").is_some() {
        return Err(not_applicable(
            "couponCode has customer restrictions that are not supported here",
        ));
    }
    if let Some(limit) = optional_i64(doc, "usageLimit") {
        if limit <= 0 {
            return Err(invalid("couponCode is malformed"));
        }
        if optional_i64(doc, "usageCount").unwrap_or(0) < 0 {
            return Err(invalid("couponCode is malformed"));
        }
        return Err(not_applicable(
            "couponCode usage limits are not supported by this checkout path",
        ));
    }
    Ok(())
}

fn validate_supported_scope(doc: &Value) -> AppResult<()> {
    if string_field(doc, "scope").is_some_and(|scope| scope != "all_products")
        || non_empty_array(doc, "productIds")
        || non_empty_array(doc, "categoryIds")
    {
        return Err(not_applicable(
            "couponCode has product restrictions that are not supported here",
        ));
    }
    Ok(())
}

fn validate_minimum_amount(doc: &Value, amount_cents: i64) -> AppResult<()> {
    let Some(minimum) = optional_i64(doc, "minimumAmountCents") else {
        return Ok(());
    };
    if minimum < 0 {
        return Err(invalid("couponCode is malformed"));
    }
    if amount_cents < minimum {
        return Err(not_applicable(
            "couponCode does not apply to this checkout amount",
        ));
    }
    Ok(())
}

fn validate_purpose(doc: &Value, purpose: CouponPurpose) -> AppResult<()> {
    if let Some(method) = string_field(doc, "paymentMethod") {
        let ok = match purpose {
            CouponPurpose::CartQuote => method == "any",
            CouponPurpose::StripeSession => {
                method == "any" || method == "stripe" || method == "card"
            }
        };
        if !ok {
            return Err(not_applicable(
                "couponCode does not apply to this payment method",
            ));
        }
    }
    if let Some(applies_at) = string_field(doc, "appliesAt") {
        let ok = match purpose {
            CouponPurpose::CartQuote => applies_at == "both" || applies_at == "cart",
            CouponPurpose::StripeSession => applies_at == "both" || applies_at == "checkout",
        };
        if !ok {
            return Err(not_applicable(
                "couponCode does not apply at this checkout step",
            ));
        }
    }
    Ok(())
}

fn validate_currency(doc: &Value, currency: &str) -> AppResult<()> {
    if let Some(coupon_currency) = string_field(doc, "currency") {
        if !coupon_currency.eq_ignore_ascii_case(currency) {
            return Err(not_applicable(
                "couponCode does not apply to this checkout currency",
            ));
        }
    }
    Ok(())
}

fn parse_bps_discount(doc: &Value) -> AppResult<CouponDiscount> {
    let bps = integer_field(doc, &["discountBps", "bps"])
        .or_else(|| decimal_field_scaled(doc, &["discountValue", "percentOff", "percentage"], 100))
        .ok_or_else(|| invalid("couponCode percentage discount is malformed"))?;
    if bps == 0 || bps > 10_000 {
        return Err(invalid("couponCode percentage discount is malformed"));
    }
    Ok(CouponDiscount::Bps(bps as u32))
}

fn parse_fixed_discount(doc: &Value, currency: &str) -> AppResult<CouponDiscount> {
    validate_currency(doc, currency)?;
    let cents = integer_field(
        doc,
        &[
            "discountCents",
            "discountValueCents",
            "amountOffCents",
            "fixedAmountCents",
            "amountCents",
        ],
    )
    .or_else(|| decimal_field_scaled(doc, &["discountValue", "amountOff"], 100))
    .ok_or_else(|| invalid("couponCode fixed discount is malformed"))?;
    if cents == 0 || cents > i64::MAX as u64 {
        return Err(invalid("couponCode fixed discount is malformed"));
    }
    Ok(CouponDiscount::FixedCents(cents as i64))
}

impl CouponDiscount {
    pub(super) fn apply_cents(self, original_cents: i64) -> AppResult<i64> {
        let original =
            u64::try_from(original_cents).map_err(|_| invalid("couponCode amount is invalid"))?;
        let discounted = match self {
            Self::Bps(bps) => x402::pricing::apply_bps_discount(original, bps)
                .map_err(|_| invalid("couponCode percentage discount is malformed"))?,
            Self::FixedCents(cents) => x402::pricing::apply_fixed_discount(original, cents as u64),
        };
        i64::try_from(discounted).map_err(|_| AppError::internal("discounted total overflowed"))
    }

    pub(super) fn apply_atomic(self, original_atomic: u64, token_decimals: u8) -> AppResult<u64> {
        match self {
            Self::Bps(bps) => x402::pricing::apply_bps_discount(original_atomic, bps)
                .map_err(|_| invalid("couponCode percentage discount is malformed")),
            Self::FixedCents(cents) => {
                let discount_atomic =
                    x402::pricing::usd_cents_to_stablecoin_atomic(cents as u64, token_decimals)
                        .map_err(|_| AppError::internal("coupon discount conversion overflowed"))?;
                Ok(x402::pricing::apply_fixed_discount(
                    original_atomic,
                    discount_atomic,
                ))
            }
        }
    }

    pub(super) fn metadata(self) -> (&'static str, Option<u32>, Option<i64>) {
        match self {
            Self::Bps(bps) => ("percentage", Some(bps), None),
            Self::FixedCents(cents) => ("fixed", None, Some(cents)),
        }
    }
}
