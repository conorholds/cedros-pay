use serde::Deserialize;
use serde_json::{json, Value};
use sha2::{Digest, Sha256};

use crate::error::{AppError, AppResult};
use crate::reqresp::RouteRequest;
use crate::seams::HostSeams;
use crate::stripe::api::unwrap_fetch;

const LOOKUP_PATH: &str = "/extensions/cedros-login/public-auth/account/invite-discount";
const MAX_CODE_LEN: usize = 128;
const ATTEMPTS: usize = 2;

#[derive(Clone, Debug, PartialEq, Eq)]
pub(super) struct InviteDiscount {
    pub(super) percent_off: u16,
    pub(super) duration_months: Option<u32>,
    pub(super) code: String,
    redeemed_at: String,
}

impl InviteDiscount {
    pub(super) fn discounted_cents(&self, original_cents: i64) -> AppResult<i64> {
        let original = u64::try_from(original_cents)
            .map_err(|_| AppError::internal("subscription price is invalid"))?;
        let discounted =
            crate::x402::pricing::apply_bps_discount(original, u32::from(self.percent_off) * 100)
                .map_err(|_| AppError::internal("invite discount calculation failed"))?;
        i64::try_from(discounted)
            .map_err(|_| AppError::internal("invite-discounted price overflowed"))
    }

    pub(super) fn public_json(&self) -> Value {
        json!({
            "percentOff": self.percent_off,
            "code": self.code,
            "redeemedAt": self.redeemed_at,
            "duration": self.duration(),
            "durationMonths": self.duration_months,
            "billingInterval": self.duration_months.map(|_| "monthly"),
            "paymentMethods": ["stripe"],
            "stacking": "invite_wins",
        })
    }

    pub(super) fn duration(&self) -> &'static str {
        if self.duration_months.is_some() {
            "fixed_months"
        } else {
            "subscription_lifetime"
        }
    }

    pub(super) fn stripe_duration(&self) -> &'static str {
        if self.duration_months.is_some() {
            "repeating"
        } else {
            "forever"
        }
    }

    pub(super) fn validate_interval(&self, interval: &str, count: i64) -> AppResult<()> {
        if self.duration_months.is_some() && (interval != "monthly" || count != 1) {
            return Err(AppError::unprocessable(
                "fixed-month invite discounts require monthly billing",
            ));
        }
        Ok(())
    }

    pub(super) fn idempotency_suffix(&self) -> String {
        let digest = Sha256::digest(self.code.as_bytes());
        let short_hash = digest[..6]
            .iter()
            .map(|byte| format!("{byte:02x}"))
            .collect::<String>();
        let base = format!("{}-{short_hash}", self.percent_off);
        match self.duration_months {
            Some(months) => format!("{base}-months-{months}"),
            None => base,
        }
    }

    pub(super) fn stripe_coupon_id(&self) -> String {
        format!("cedros_invite_{}", self.idempotency_suffix())
    }

    pub(super) fn stripe_coupon_name(&self) -> String {
        let suffix = format!(" - {}% off", self.percent_off);
        let available = 40usize.saturating_sub(suffix.len());
        let code = self.code.chars().take(available).collect::<String>();
        format!("{code}{suffix}")
    }
}

pub(super) fn project_plan_prices(
    plans: &mut Vec<Value>,
    discount: Option<&InviteDiscount>,
) -> AppResult<()> {
    for plan in plans.iter_mut() {
        let original = plan
            .get("priceCents")
            .and_then(Value::as_i64)
            .ok_or_else(|| AppError::internal("subscription plan price is missing"))?;
        plan["originalPriceCents"] = json!(original);
        if let Some(discount) = discount.filter(|_| original != 0) {
            // Invite coupons are applied by Stripe. Never advertise the same
            // discounted amount on a rail that still collects the full price.
            let methods = plan
                .get_mut("paymentMethods")
                .and_then(Value::as_array_mut)
                .ok_or_else(|| AppError::internal("subscription payment methods are missing"))?;
            methods.retain(|method| method.as_str() == Some("stripe"));
            plan["priceCents"] = json!(discount.discounted_cents(original)?);
        }
    }
    if discount.is_some() {
        plans.retain(|plan| {
            plan.get("paymentMethods")
                .and_then(Value::as_array)
                .is_some_and(|methods| !methods.is_empty())
        });
    }
    Ok(())
}

#[derive(Deserialize)]
struct LookupResponse {
    discount: Option<WireDiscount>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct WireDiscount {
    percent_off: u16,
    duration_months: Option<u32>,
    code: String,
    redeemed_at: String,
}

/// Resolve the authenticated buyer's live invite grant. Missing credentials or
/// Login origin mean the optional integration is unavailable. Lookup
/// faults are retried once and then safely degrade to undiscounted pricing.
pub(super) fn lookup<S: HostSeams>(seams: &S, req: &RouteRequest) -> Option<InviteDiscount> {
    let origin = match crate::auth::login_origin(seams) {
        Ok(origin) => origin,
        Err(_) => {
            seams.log(
                "warn",
                "extensionId=cedros-pay operation=invite-discount-lookup outcome=undiscounted-fallback cause=login_origin_unavailable",
            );
            return None;
        }
    };
    let token = crate::auth::buyer_token(req, &origin)?;

    let request = json!({
        "method": "GET",
        "url": format!("{origin}{LOOKUP_PATH}"),
        "headers": [["authorization", format!("Bearer {token}")]],
    });
    let mut last_cause = "unknown".to_string();
    for _ in 0..ATTEMPTS {
        match attempt(seams, &request) {
            Ok(discount) => return discount,
            Err(cause) => last_cause = cause,
        }
    }
    seams.log(
        "warn",
        &format!(
            "extensionId=cedros-pay operation=invite-discount-lookup outcome=undiscounted-fallback cause={last_cause}"
        ),
    );
    None
}

fn attempt<S: HostSeams>(seams: &S, request: &Value) -> Result<Option<InviteDiscount>, String> {
    let raw = seams
        .http_fetch(&request.to_string())
        .map_err(|_| "host_egress_error".to_string())?;
    let (status, body) = unwrap_fetch(&raw).map_err(|_| "malformed_http_envelope".to_string())?;
    if status != 200 {
        return Err(format!("http_status_{status}"));
    }
    let response: LookupResponse =
        serde_json::from_str(&body).map_err(|_| "malformed_response_json".to_string())?;
    response.discount.map(validate).transpose()
}

fn validate(discount: WireDiscount) -> Result<InviteDiscount, String> {
    let code = discount.code.trim();
    if !(1..=100).contains(&discount.percent_off)
        || matches!(discount.duration_months, Some(months) if months == 0 || months > i32::MAX as u32)
        || code.is_empty()
        || code.len() > MAX_CODE_LEN
        || code.chars().any(char::is_control)
        || crate::time::parse_iso(&discount.redeemed_at).is_none()
    {
        return Err("invalid_discount_contract".to_string());
    }
    Ok(InviteDiscount {
        percent_off: discount.percent_off,
        duration_months: discount.duration_months,
        code: code.to_string(),
        redeemed_at: discount.redeemed_at,
    })
}
