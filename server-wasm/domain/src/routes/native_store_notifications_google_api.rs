//! Google Publisher API reconciliation for RTDN notifications.

use serde_json::Value;

use super::notification_commit::{
    apply_notification, LedgerRefund, NativeNotification, SubscriptionAction,
};
use super::GOOGLE_PROVIDER;
use crate::error::{AppError, AppResult};
use crate::native_store::google;
use crate::seams::HostSeams;
use crate::time;

pub(super) struct GoogleConfig {
    service_account_email: String,
    private_key: String,
    package_name: String,
    push_service_account_email: String,
    push_audience: String,
}

impl GoogleConfig {
    pub(super) fn package_name(&self) -> &str {
        &self.package_name
    }

    pub(super) fn verify_push_identity<S: HostSeams>(
        &self,
        seams: &S,
        bearer: Option<&str>,
        now: i64,
    ) -> AppResult<()> {
        let token = bearer
            .map(str::trim)
            .filter(|token| {
                (64..=8_192).contains(&token.len())
                    && token.bytes().all(|byte| {
                        byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_' | b'.')
                    })
            })
            .ok_or_else(|| AppError::unauthorized("Google push authentication required"))?;
        let request = serde_json::json!({
            "method": "POST",
            "url": "https://oauth2.googleapis.com/tokeninfo",
            "headers": [["content-type", "application/x-www-form-urlencoded"]],
            "body": format!("id_token={token}"),
        });
        let raw = seams.http_fetch(&request.to_string()).map_err(|_| {
            AppError::new(
                502,
                "verification_failed",
                "Google push verification failed",
            )
        })?;
        let (status, body) = crate::stripe::api::unwrap_fetch(&raw).map_err(|error| {
            AppError::new(
                502,
                "verification_failed",
                "Google push verification failed",
            )
            .with_internal(error)
        })?;
        let claims: Value = serde_json::from_str(&body).map_err(|error| {
            AppError::new(
                502,
                "verification_failed",
                "Google push verification failed",
            )
            .with_internal(error.to_string())
        })?;
        let expiration = claims
            .get("exp")
            .and_then(|value| {
                value
                    .as_i64()
                    .or_else(|| value.as_str().and_then(|value| value.parse().ok()))
            })
            .unwrap_or(0);
        let issuer = claims.get("iss").and_then(Value::as_str);
        let valid = status == 200
            && claims.get("email").and_then(Value::as_str)
                == Some(self.push_service_account_email.as_str())
            && claims.get("aud").and_then(Value::as_str) == Some(self.push_audience.as_str())
            && claims
                .get("email_verified")
                .is_some_and(|value| value == true || value.as_str() == Some("true"))
            && matches!(
                issuer,
                Some("accounts.google.com" | "https://accounts.google.com")
            )
            && expiration > now;
        valid
            .then_some(())
            .ok_or_else(|| AppError::unauthorized("invalid Google push identity"))
    }

    pub(super) fn access_token<S: HostSeams>(&self, seams: &S, now: i64) -> AppResult<String> {
        google::access_token(seams, &self.service_account_email, &self.private_key, now).map_err(
            |error| {
                AppError::new(502, "verification_failed", "Google OAuth failed")
                    .with_internal(error)
            },
        )
    }
}

pub(super) fn google_config<S: HostSeams>(seams: &S) -> AppResult<GoogleConfig> {
    let unavailable = || AppError::new(503, "unavailable", "Google native-store is not configured");
    let service_account_email =
        ns_str(seams, "google_service_account_email").ok_or_else(unavailable)?;
    let package_name = ns_str(seams, "google_package_name").ok_or_else(unavailable)?;
    if !google::valid_package_name(&package_name) {
        return Err(unavailable());
    }
    let push_service_account_email =
        ns_str(seams, "google_push_service_account_email").ok_or_else(unavailable)?;
    let push_audience = ns_str(seams, "google_push_audience").ok_or_else(unavailable)?;
    let private_key = seams
        .secret_get("native_store.google_private_key")?
        .filter(|key| !key.trim().is_empty())
        .ok_or_else(unavailable)?;
    Ok(GoogleConfig {
        service_account_email,
        private_key,
        package_name,
        push_service_account_email,
        push_audience,
    })
}

fn ns_str<S: HostSeams>(seams: &S, key: &str) -> Option<String> {
    let raw = seams
        .setting_get(&format!("native_store.{key}"))
        .ok()
        .flatten()?;
    let value = serde_json::from_str::<Value>(&raw)
        .ok()
        .and_then(|value| value.as_str().map(str::to_string))
        .unwrap_or(raw);
    let trimmed = value.trim().to_string();
    (!trimmed.is_empty()).then_some(trimmed)
}

pub(super) fn reconcile_google_subscription<S: HostSeams>(
    seams: &S,
    config: &GoogleConfig,
    token: &str,
    purchase_token: &str,
    notification_id: &str,
    event_time_ms: i64,
    now: i64,
) -> AppResult<()> {
    validate_provider_path_value(purchase_token, 4_096)?;
    let package = google::path_segment(&config.package_name);
    let token_path = google::path_segment(purchase_token);
    let url = format!(
        "{}/applications/{}/purchases/subscriptionsv2/tokens/{}",
        google::API_BASE,
        package,
        token_path
    );
    let value = api_get(seams, token, &url)?;
    let active = matches!(
        value.get("subscriptionState").and_then(Value::as_str),
        Some("SUBSCRIPTION_STATE_ACTIVE") | Some("SUBSCRIPTION_STATE_IN_GRACE_PERIOD")
    );
    let period_end = value
        .get("lineItems")
        .and_then(Value::as_array)
        .and_then(|items| items.first())
        .and_then(|item| item.get("expiryTime"))
        .and_then(Value::as_str)
        .and_then(time::parse_iso)
        .unwrap_or(0);
    let action = if active && period_end > now {
        SubscriptionAction::Renew {
            period_end_secs: period_end,
        }
    } else {
        SubscriptionAction::Cancel
    };
    apply_notification(
        seams,
        NativeNotification {
            id: notification_id.into(),
            event_time_ms,
            provider: GOOGLE_PROVIDER,
            subscription_id: Some(purchase_token.into()),
            provider_refs: vec![purchase_token.into()],
            subscription_action: Some(action),
            ledger_ref: None,
            ledger_refund: None,
        },
    )
}

pub(super) fn reconcile_google_one_time<S: HostSeams>(
    seams: &S,
    config: &GoogleConfig,
    token: &str,
    sku: &str,
    purchase_token: &str,
    notification_id: &str,
    event_time_ms: i64,
) -> AppResult<()> {
    validate_provider_path_value(sku, 255)?;
    validate_provider_path_value(purchase_token, 4_096)?;
    let package = google::path_segment(&config.package_name);
    let sku_path = google::path_segment(sku);
    let token_path = google::path_segment(purchase_token);
    let url = format!(
        "{}/applications/{}/purchases/products/{}/tokens/{}",
        google::API_BASE,
        package,
        sku_path,
        token_path
    );
    let refunded = api_get(seams, token, &url)?
        .get("purchaseState")
        .and_then(Value::as_i64)
        .unwrap_or(1)
        != 0;
    apply_notification(
        seams,
        NativeNotification {
            id: notification_id.into(),
            event_time_ms,
            provider: GOOGLE_PROVIDER,
            subscription_id: None,
            provider_refs: Vec::new(),
            subscription_action: None,
            ledger_ref: Some(format!("google-token:{purchase_token}")),
            ledger_refund: refunded.then_some(LedgerRefund::Full),
        },
    )
}

pub(super) fn reconcile_google_voided_purchase<S: HostSeams>(
    seams: &S,
    config: &GoogleConfig,
    token: &str,
    purchase_token: &str,
    order_id: &str,
    refund_type: i64,
) -> AppResult<LedgerRefund> {
    validate_provider_path_value(purchase_token, 4_096)?;
    validate_provider_path_value(order_id, 255)?;
    let package = google::path_segment(&config.package_name);
    let order = google::path_segment(order_id);
    let value = api_get(
        seams,
        token,
        &format!(
            "{}/applications/{}/orders/{}",
            google::API_BASE,
            package,
            order
        ),
    )?;
    if value.get("orderId").and_then(Value::as_str) != Some(order_id)
        || value.get("purchaseToken").and_then(Value::as_str) != Some(purchase_token)
    {
        return Err(AppError::forbidden(
            "Google voided purchase identity does not match",
        ));
    }
    match (refund_type, value.get("state").and_then(Value::as_str)) {
        (1, Some("REFUNDED" | "CANCELED")) => Ok(LedgerRefund::Full),
        (2, Some("PARTIALLY_REFUNDED")) => cumulative_partial_refund(&value),
        _ => Err(AppError::new(
            502,
            "verification_failed",
            "Google voided purchase state is not final",
        )),
    }
}

fn cumulative_partial_refund(order: &Value) -> AppResult<LedgerRefund> {
    let events = order
        .pointer("/orderHistory/partialRefundEvents")
        .and_then(Value::as_array)
        .ok_or_else(|| {
            AppError::new(
                502,
                "verification_failed",
                "Google partial refund details are missing",
            )
        })?;
    let mut currency: Option<String> = None;
    let mut amount_cents = 0_i64;
    for event in events.iter().filter(|event| {
        event.get("state").and_then(Value::as_str) == Some("PROCESSED_SUCCESSFULLY")
    }) {
        let total = event.pointer("/refundDetails/total").ok_or_else(|| {
            AppError::new(
                502,
                "verification_failed",
                "Google partial refund amount is missing",
            )
        })?;
        let event_currency = total
            .get("currencyCode")
            .and_then(Value::as_str)
            .filter(|value| {
                value.len() == 3 && value.bytes().all(|byte| byte.is_ascii_alphabetic())
            })
            .ok_or_else(|| {
                AppError::new(
                    502,
                    "verification_failed",
                    "Google refund currency is invalid",
                )
            })?
            .to_ascii_lowercase();
        if currency
            .as_deref()
            .is_some_and(|value| value != event_currency)
        {
            return Err(AppError::new(
                502,
                "verification_failed",
                "Google partial refund currencies conflict",
            ));
        }
        currency = Some(event_currency);
        let units = total
            .get("units")
            .and_then(|value| value.as_i64().or_else(|| value.as_str()?.parse().ok()))
            .filter(|value| *value >= 0)
            .ok_or_else(|| {
                AppError::new(
                    502,
                    "verification_failed",
                    "Google refund amount is invalid",
                )
            })?;
        let nanos = total.get("nanos").and_then(Value::as_i64).unwrap_or(0);
        if !(0..1_000_000_000).contains(&nanos) || nanos % 10_000_000 != 0 {
            return Err(AppError::new(
                502,
                "verification_failed",
                "Google refund amount cannot be represented in cents",
            ));
        }
        let cents = units
            .checked_mul(100)
            .and_then(|value| value.checked_add(nanos / 10_000_000))
            .ok_or_else(|| {
                AppError::new(
                    502,
                    "verification_failed",
                    "Google refund amount is invalid",
                )
            })?;
        amount_cents = amount_cents.checked_add(cents).ok_or_else(|| {
            AppError::new(
                502,
                "verification_failed",
                "Google refund amount is invalid",
            )
        })?;
    }
    let currency = currency.filter(|_| amount_cents > 0).ok_or_else(|| {
        AppError::new(
            502,
            "verification_failed",
            "Google partial refund is not settled",
        )
    })?;
    Ok(LedgerRefund::Cumulative {
        amount_cents,
        currency,
    })
}

fn validate_provider_path_value(value: &str, maximum: usize) -> AppResult<()> {
    if value.is_empty()
        || value.len() > maximum
        || value != value.trim()
        || value.chars().any(char::is_control)
    {
        return Err(AppError::unprocessable(
            "Google purchase identity is invalid",
        ));
    }
    Ok(())
}

fn api_get<S: HostSeams>(seams: &S, token: &str, url: &str) -> AppResult<Value> {
    google::api_get(seams, token, url).map_err(|error| {
        AppError::new(502, "verification_failed", "Google verification failed").with_internal(error)
    })
}
