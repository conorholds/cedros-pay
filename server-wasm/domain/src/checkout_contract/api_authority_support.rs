use super::api_request::TipIntent;
use super::{AuthoritativeQuoteSnapshot, SafeSourceBinding};
use crate::auth::Buyer;
use crate::error::{AppError, AppResult};
use crate::routes::coupons::CouponPurpose;
use crate::seams::HostSeams;
use crate::versioned_cart::{TrustedCartProvider, VersionedCartService};

pub(super) fn discounted_subtotal<S: HostSeams>(
    seams: &S,
    promotion: Option<&str>,
    subtotal: u64,
    currency: &str,
) -> AppResult<u64> {
    let value = crate::routes::coupons::apply_to_cents(
        seams,
        promotion,
        i64::try_from(subtotal)
            .map_err(|_| AppError::unprocessable("quote subtotal overflowed"))?,
        currency,
        CouponPurpose::CartQuote,
    )?;
    u64::try_from(value.total_cents)
        .map_err(|_| AppError::unprocessable("quote discount is invalid"))
}

pub(super) fn checked_total(
    discounted: u64,
    pricing: &super::api_pricing::PricingOutcome,
) -> AppResult<u64> {
    let total = discounted
        .checked_add(pricing.shipping_cents)
        .and_then(|value| value.checked_add(pricing.tax_cents))
        .and_then(|value| value.checked_add(pricing.tip_cents))
        .ok_or_else(|| AppError::unprocessable("quote total overflowed"))?;
    if total == 0 || total > 1_000_000_000 {
        return Err(AppError::unprocessable(
            "quote total is outside the supported range",
        ));
    }
    Ok(total)
}

pub(super) fn choose_promotion(
    request: Option<&str>,
    stored: Option<&str>,
) -> AppResult<Option<String>> {
    match (request, stored) {
        (Some(requested), Some(stored)) if requested != stored => Err(AppError::new(
            409,
            "promotion_changed",
            "promotion does not match the authoritative cart",
        )),
        (Some(requested), _) => Ok(Some(requested.to_string())),
        (None, stored) => Ok(stored.map(str::to_string)),
    }
}

pub(super) fn tip_intent(snapshot: &AuthoritativeQuoteSnapshot) -> Option<TipIntent> {
    snapshot.applied_tip.as_ref().map(|tip| match tip {
        super::AppliedTip::Fixed { amount_cents } => TipIntent::Fixed {
            amount_cents: *amount_cents,
        },
        super::AppliedTip::Percentage { basis_points, .. } => TipIntent::Percentage {
            basis_points: *basis_points,
        },
    })
}

pub(super) fn revalidate_cart<S: HostSeams>(
    seams: &S,
    buyer: Option<&Buyer>,
    provider: Option<&TrustedCartProvider>,
    source: &SafeSourceBinding,
) -> AppResult<()> {
    let SafeSourceBinding::VersionedCart {
        lane,
        generation,
        version,
    } = source
    else {
        return Ok(());
    };
    let buyer = buyer.ok_or_else(cart_authority_unavailable)?;
    let provider = provider.cloned().ok_or_else(cart_authority_unavailable)?;
    let service = VersionedCartService::from_verified_buyer(seams, buyer, provider)?;
    let (current_generation, cart) = service.read_authoritative(lane)?;
    if current_generation.generation != *generation || cart.version != *version {
        return Err(AppError::new(
            409,
            "cart_changed",
            "versioned cart changed after quote",
        ));
    }
    Ok(())
}

pub(super) fn changed(message: &str) -> AppError {
    AppError::new(409, "quote_changed", message)
}

fn cart_authority_unavailable() -> AppError {
    AppError::new(
        503,
        "cart_authority_unavailable",
        "verified cart authority is unavailable",
    )
}
