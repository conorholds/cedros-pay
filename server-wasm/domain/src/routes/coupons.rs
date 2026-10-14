//! Coupon resolution and exact discount application for checkout pricing routes.

use crate::db::Db;
use crate::error::{AppError, AppResult};
use crate::ids;
use crate::models::AppliedCoupon;
use crate::seams::HostSeams;

use super::coupon_rules::{
    discount_from_doc, invalid, not_applicable, validate_coupon_doc, CouponDiscount,
};

const COUPON_PREFIX: &str = "coupon:";

pub(crate) use super::coupon_rules::CouponPurpose;

pub(crate) struct CouponApplication {
    pub total_cents: i64,
    pub total_atomic: Option<u64>,
    pub applied_coupon: Option<AppliedCoupon>,
}

struct ResolvedCoupon {
    code: String,
    discount: CouponDiscount,
}

pub(crate) fn requested_code(candidates: &[Option<&str>]) -> AppResult<Option<String>> {
    let mut selected: Option<String> = None;
    for candidate in candidates.iter().flatten() {
        let Some(code) = normalize_code(candidate)? else {
            continue;
        };
        if selected.as_deref().is_some_and(|existing| existing != code) {
            return Err(invalid("conflicting coupon codes"));
        }
        selected = Some(code);
    }
    Ok(selected)
}

pub(crate) fn apply_to_cart<S: HostSeams>(
    seams: &S,
    code: Option<&str>,
    original_cents: i64,
    original_atomic: u64,
    token_decimals: u8,
) -> AppResult<CouponApplication> {
    let Some(code) = code else {
        return Ok(CouponApplication {
            total_cents: original_cents,
            total_atomic: Some(original_atomic),
            applied_coupon: None,
        });
    };
    let coupon = resolve_coupon(seams, code, CouponPurpose::CartQuote, original_cents, "USD")?;
    let total_cents = coupon.discount.apply_cents(original_cents)?;
    let total_atomic = coupon
        .discount
        .apply_atomic(original_atomic, token_decimals)?;
    require_supported_discounted_total(total_cents, total_atomic)?;
    Ok(CouponApplication {
        total_cents,
        total_atomic: Some(total_atomic),
        applied_coupon: Some(coupon.applied(
            original_cents,
            total_cents,
            Some(original_atomic),
            Some(total_atomic),
        )),
    })
}

pub(crate) fn apply_to_cents<S: HostSeams>(
    seams: &S,
    code: Option<&str>,
    original_cents: i64,
    currency: &str,
    purpose: CouponPurpose,
) -> AppResult<CouponApplication> {
    let Some(code) = code else {
        return Ok(CouponApplication {
            total_cents: original_cents,
            total_atomic: None,
            applied_coupon: None,
        });
    };
    let coupon = resolve_coupon(seams, code, purpose, original_cents, currency)?;
    let total_cents = coupon.discount.apply_cents(original_cents)?;
    if total_cents <= 0 {
        return Err(not_applicable(
            "couponCode discounts to a free checkout, which is not supported",
        ));
    }
    Ok(CouponApplication {
        total_cents,
        total_atomic: None,
        applied_coupon: Some(coupon.applied(original_cents, total_cents, None, None)),
    })
}

pub(crate) fn matching_snapshot_coupon(
    requested: Option<&str>,
    applied: Option<&AppliedCoupon>,
) -> AppResult<()> {
    let Some(requested) = requested else {
        return Ok(());
    };
    if applied.as_ref().map(|c| c.code.as_str()) == Some(requested) {
        return Ok(());
    }
    Err(not_applicable(
        "couponCode must be applied to the stored cart quote before checkout",
    ))
}

fn resolve_coupon<S: HostSeams>(
    seams: &S,
    code: &str,
    purpose: CouponPurpose,
    amount_cents: i64,
    currency: &str,
) -> AppResult<ResolvedCoupon> {
    let code = normalize_code(code)?.ok_or_else(|| invalid("couponCode is invalid"))?;
    let key = coupon_key(&code);
    let record = Db::new(seams, ids::DB_ACCESS)
        .read_one(ids::MODEL_CATALOG, &key)?
        .ok_or_else(|| AppError::new(422, "coupon_not_found", "couponCode was not found"))?;
    let payload = record.payload;
    validate_coupon_doc(
        &payload,
        &code,
        purpose,
        amount_cents,
        currency,
        seams.now_unix_secs(),
    )?;
    Ok(ResolvedCoupon {
        code,
        discount: discount_from_doc(&payload, currency)?,
    })
}

impl ResolvedCoupon {
    fn applied(
        &self,
        original_total_cents: i64,
        discounted_total_cents: i64,
        original_total_atomic: Option<u64>,
        discounted_total_atomic: Option<u64>,
    ) -> AppliedCoupon {
        let (discount_type, discount_bps, discount_cents) = self.discount.metadata();
        AppliedCoupon {
            code: self.code.clone(),
            discount_type: discount_type.to_string(),
            discount_bps,
            discount_cents,
            original_total_cents,
            discounted_total_cents,
            original_total_atomic,
            discounted_total_atomic,
        }
    }
}

fn require_supported_discounted_total(total_cents: i64, total_atomic: u64) -> AppResult<()> {
    if total_cents <= 0 || total_atomic == 0 {
        return Err(not_applicable(
            "couponCode discounts to a free checkout, which is not supported",
        ));
    }
    Ok(())
}

fn normalize_code(code: &str) -> AppResult<Option<String>> {
    let trimmed = code.trim();
    if trimmed.is_empty() {
        return Ok(None);
    }
    if trimmed.len() > 80 {
        return Err(invalid("couponCode must be 1-80 characters"));
    }
    Ok(Some(trimmed.to_uppercase()))
}

fn coupon_key(code: &str) -> String {
    format!("{COUPON_PREFIX}{}", code.trim().to_uppercase())
}
