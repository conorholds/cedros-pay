//! Signed Apple App Store notification verification and mapping.

use serde::Deserialize;
use serde_json::json;

use super::apple_apply::{apply_apple_notification_at, NotifTx};
use super::notification_identity::digest_id;
use crate::error::{AppError, AppResult};
use crate::native_store::apple;
use crate::reqresp::{RouteRequest, RouteResponse};
use crate::routes::{matches, native_store};
use crate::seams::HostSeams;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Envelope {
    signed_payload: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Notification {
    notification_type: String,
    #[serde(default)]
    notification_uuid: Option<String>,
    #[serde(default)]
    signed_date: Option<i64>,
    #[serde(default)]
    data: Option<NotificationData>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct NotificationData {
    #[serde(default)]
    signed_transaction_info: Option<String>,
    #[serde(default)]
    bundle_id: Option<String>,
    #[serde(default)]
    environment: Option<String>,
}

pub(super) fn apple_notification<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
) -> AppResult<RouteResponse> {
    if !matches(req, "POST", "/paywall/v1/native-store/apple/notifications") {
        return Err(AppError::not_found(
            "unknown native-store notification route",
        ));
    }
    let envelope: Envelope = serde_json::from_value(req.json_body()?).map_err(|error| {
        AppError::unprocessable("invalid notification body").with_internal(error.to_string())
    })?;
    let now = seams.now_unix_secs();
    let payload = verify_jws(
        &envelope.signed_payload,
        now,
        "notification signature is invalid",
    )?;
    let notification: Notification = serde_json::from_slice(&payload).map_err(|error| {
        AppError::unprocessable("unreadable notification").with_internal(error.to_string())
    })?;
    if notification.notification_type == "TEST" {
        return received();
    }
    if let Some(data) = notification.data {
        let config = native_store::apple_config(seams)?;
        validate_notification_app(
            &config,
            data.bundle_id.as_deref(),
            data.environment.as_deref(),
        )?;
        let Some(signed) = data.signed_transaction_info else {
            return received();
        };
        let transaction: NotifTx = serde_json::from_slice(&verify_jws(
            &signed,
            now,
            "transaction signature is invalid",
        )?)
        .map_err(|error| {
            AppError::unprocessable("unreadable transaction").with_internal(error.to_string())
        })?;
        validate_notification_app(
            &config,
            transaction.bundle_id.as_deref(),
            transaction.environment.as_deref(),
        )?;
        let id = notification
            .notification_uuid
            .filter(|id| !id.trim().is_empty())
            .map(|id| format!("apple:{id}"))
            .unwrap_or_else(|| digest_id("apple", envelope.signed_payload.as_bytes()));
        apply_apple_notification_at(
            seams,
            &id,
            notification.signed_date.unwrap_or(now.saturating_mul(1000)),
            &notification.notification_type,
            &transaction,
        )?;
    }
    received()
}

fn verify_jws(signed: &str, now: i64, message: &'static str) -> AppResult<Vec<u8>> {
    apple::verify_apple_jws_at(signed, apple::APPLE_ROOT_CA_G3, now)
        .map_err(|error| AppError::new(400, "invalid_signature", message).with_internal(error))
}

fn received() -> AppResult<RouteResponse> {
    Ok(RouteResponse::ok(&json!({ "received": true })))
}

pub(super) fn validate_notification_app(
    config: &native_store::AppleConfig,
    bundle: Option<&str>,
    environment: Option<&str>,
) -> AppResult<()> {
    if config
        .bundle_id
        .as_deref()
        .is_some_and(|expected| bundle != Some(expected))
    {
        return Err(AppError::new(
            403,
            "bundle_mismatch",
            "notification is for a different app",
        ));
    }
    if !config.allow_sandbox && environment != Some("Production") {
        return Err(AppError::new(
            403,
            "environment_mismatch",
            "notification is for an unconfigured Apple environment",
        ));
    }
    if config.allow_sandbox && !matches!(environment, Some("Production" | "Sandbox")) {
        return Err(AppError::new(
            403,
            "environment_mismatch",
            "notification is for an unknown Apple environment",
        ));
    }
    Ok(())
}
