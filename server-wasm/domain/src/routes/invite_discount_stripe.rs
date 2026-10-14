use crate::error::{AppError, AppResult};
use crate::seams::HostSeams;
use crate::stripe::api;
use crate::stripe::checkout_api::{self, StripeCoupon};

use super::invite_discount::InviteDiscount;

/// Ensure Stripe has the deterministic coupon used to keep the
/// catalog Price identity intact while applying an invite percentage.
pub(super) fn ensure_coupon<S: HostSeams>(
    seams: &S,
    secret_key: &str,
    discount: &InviteDiscount,
) -> AppResult<String> {
    let coupon_id = discount.stripe_coupon_id();
    if let Some(coupon) = retrieve(seams, secret_key, &coupon_id)? {
        validate(&coupon, discount)?;
        return Ok(coupon_id);
    }

    let request = checkout_api::build_invite_coupon_create_fetch(
        secret_key,
        &coupon_id,
        discount.percent_off,
        discount.duration_months,
        &discount.stripe_coupon_name(),
    );
    let raw = seams.http_fetch(&request.to_string())?;
    let (status, body) = api::unwrap_fetch(&raw).map_err(provider_error)?;
    match checkout_api::parse_coupon(status, &body) {
        Ok(Some(coupon)) => {
            validate(&coupon, discount)?;
            Ok(coupon_id)
        }
        create_error => {
            // A concurrent checkout may have created the deterministic coupon
            // after our GET. Re-read once before surfacing the provider error.
            if let Some(coupon) = retrieve(seams, secret_key, &coupon_id)? {
                validate(&coupon, discount)?;
                return Ok(coupon_id);
            }
            Err(provider_error(create_error.err().unwrap_or_else(|| {
                "Stripe did not create the invite coupon".to_string()
            })))
        }
    }
}

fn retrieve<S: HostSeams>(
    seams: &S,
    secret_key: &str,
    coupon_id: &str,
) -> AppResult<Option<StripeCoupon>> {
    let request = checkout_api::build_coupon_retrieve_fetch(secret_key, coupon_id);
    let raw = seams.http_fetch(&request.to_string())?;
    let (status, body) = api::unwrap_fetch(&raw).map_err(provider_error)?;
    checkout_api::parse_coupon(status, &body).map_err(provider_error)
}

fn validate(coupon: &StripeCoupon, discount: &InviteDiscount) -> AppResult<()> {
    if coupon.id != discount.stripe_coupon_id()
        || coupon.percent_off != discount.percent_off
        || coupon.duration != discount.stripe_duration()
        || coupon.duration_in_months != discount.duration_months
        || !coupon.valid
    {
        return Err(provider_error(
            "Stripe invite coupon does not match the live grant".to_string(),
        ));
    }
    Ok(())
}

fn provider_error(message: String) -> AppError {
    AppError::new(
        502,
        "provider_unavailable",
        "could not apply the invite discount",
    )
    .with_internal(message)
}
