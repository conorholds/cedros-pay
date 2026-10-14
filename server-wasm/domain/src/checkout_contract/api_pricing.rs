use super::api_request::CustomerContext;
use super::{AppliedTip, AuthoritativeQuoteLine};
use crate::error::AppResult;
use crate::seams::HostSeams;

pub(super) struct PricingOutcome {
    pub shipping_cents: u64,
    pub shipping_rate_id: Option<String>,
    pub tax_cents: u64,
    pub tax_rate_id: Option<String>,
    pub tip_cents: u64,
    pub applied_tip: Option<AppliedTip>,
}

pub(super) fn resolve<S: HostSeams>(
    seams: &S,
    lines: &[AuthoritativeQuoteLine],
    currency: &str,
    discounted_subtotal: u64,
    context: &CustomerContext,
    tip: Option<&super::api_request::TipIntent>,
) -> AppResult<PricingOutcome> {
    let shipping = super::pricing_shipping::resolve(
        seams,
        lines,
        currency,
        discounted_subtotal,
        &context.fulfillment,
    )?;
    let tax = super::pricing_tax::resolve(
        seams,
        discounted_subtotal,
        shipping.amount_cents,
        &context.fulfillment,
    )?;
    let tip = super::pricing_tip::resolve(seams, discounted_subtotal, tip)?;
    Ok(PricingOutcome {
        shipping_cents: shipping.amount_cents,
        shipping_rate_id: shipping.rate_id,
        tax_cents: tax.amount_cents,
        tax_rate_id: tax.rate_id,
        tip_cents: tip.amount_cents,
        applied_tip: tip.applied,
    })
}
