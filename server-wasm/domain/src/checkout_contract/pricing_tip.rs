use serde::{Deserialize, Serialize};

use super::api_request::TipIntent;
use super::AppliedTip;
use crate::error::{AppError, AppResult};
use crate::seams::HostSeams;

pub(super) const POLICY_SETTING: &str = "checkout.tipping_policy";

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct CheckoutTippingPolicy {
    pub schema_version: u8,
    pub enabled: bool,
    pub allow_fixed: bool,
    pub allow_percentage: bool,
    pub max_amount_cents: u64,
    pub max_percentage_bps: u32,
}

#[derive(Debug)]
pub(super) struct TipCharge {
    pub amount_cents: u64,
    pub applied: Option<AppliedTip>,
}

pub(super) fn resolve<S: HostSeams>(
    seams: &S,
    subtotal: u64,
    intent: Option<&TipIntent>,
) -> AppResult<TipCharge> {
    let Some(intent) = intent else {
        return Ok(TipCharge {
            amount_cents: 0,
            applied: None,
        });
    };
    let policy = load(seams)?;
    validate_policy(&policy)?;
    if !policy.enabled {
        return Err(AppError::unprocessable("checkout tipping is disabled"));
    }
    let (amount, applied) = match intent {
        TipIntent::Fixed { amount_cents } if policy.allow_fixed && *amount_cents > 0 => (
            *amount_cents,
            AppliedTip::Fixed {
                amount_cents: *amount_cents,
            },
        ),
        TipIntent::Percentage { basis_points }
            if policy.allow_percentage
                && *basis_points > 0
                && *basis_points <= policy.max_percentage_bps =>
        {
            let amount = super::pricing_tax::half_up_bps(subtotal, *basis_points)?;
            (
                amount,
                AppliedTip::Percentage {
                    basis_points: *basis_points,
                    amount_cents: amount,
                },
            )
        }
        _ => {
            return Err(AppError::unprocessable(
                "tip is not allowed by checkout policy",
            ))
        }
    };
    if amount == 0 || amount > policy.max_amount_cents {
        return Err(AppError::unprocessable(
            "tip exceeds the configured checkout limit",
        ));
    }
    Ok(TipCharge {
        amount_cents: amount,
        applied: Some(applied),
    })
}

#[cfg(test)]
pub(super) fn store<S: HostSeams>(seams: &S, policy: &CheckoutTippingPolicy) -> AppResult<()> {
    validate_policy(policy)?;
    Ok(seams.setting_set(
        POLICY_SETTING,
        &serde_json::to_string(policy).map_err(|error| {
            AppError::internal("cannot encode checkout tipping policy")
                .with_internal(error.to_string())
        })?,
    )?)
}

fn load<S: HostSeams>(seams: &S) -> AppResult<CheckoutTippingPolicy> {
    let raw = seams.setting_get(POLICY_SETTING)?.ok_or_else(|| {
        AppError::new(
            503,
            "tipping_policy_unavailable",
            "checkout tipping policy is not configured",
        )
    })?;
    serde_json::from_str(&raw).map_err(|error| {
        AppError::new(
            503,
            "tipping_policy_unavailable",
            "checkout tipping policy is invalid",
        )
        .with_internal(error.to_string())
    })
}

fn validate_policy(policy: &CheckoutTippingPolicy) -> AppResult<()> {
    if policy.schema_version != 1
        || policy.max_amount_cents == 0
        || policy.max_amount_cents > 100_000_000
        || policy.max_percentage_bps == 0
        || policy.max_percentage_bps > 10_000
    {
        return Err(AppError::new(
            503,
            "tipping_policy_unavailable",
            "checkout tipping policy is invalid",
        ));
    }
    Ok(())
}
