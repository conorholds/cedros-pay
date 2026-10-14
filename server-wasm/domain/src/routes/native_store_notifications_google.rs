use base64::engine::general_purpose::STANDARD;
use base64::Engine;
use serde::Deserialize;
use serde_json::{json, Value};

use super::native_store_notifications_google_api::{
    google_config, reconcile_google_one_time, reconcile_google_subscription,
    reconcile_google_voided_purchase,
};
use super::notification_identity::digest_id;
use super::{
    apply_notification, LedgerRefund, NativeNotification, SubscriptionAction, GOOGLE_PROVIDER,
};
use crate::error::{AppError, AppResult};
use crate::reqresp::{RouteRequest, RouteResponse};
use crate::routes::matches;
use crate::seams::HostSeams;

#[derive(Deserialize)]
struct PubSubEnvelope {
    message: PubSubMessage,
}

#[derive(Deserialize)]
struct PubSubMessage {
    #[serde(default)]
    data: String,
    #[serde(default, alias = "messageId")]
    message_id: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct GoogleNotification {
    #[serde(default)]
    package_name: Option<String>,
    #[serde(default)]
    event_time_millis: Option<String>,
    #[serde(default)]
    subscription_notification: Option<GoogleTokenNotif>,
    #[serde(default)]
    one_time_product_notification: Option<GoogleOneTimeNotif>,
    #[serde(default)]
    voided_purchase_notification: Option<GoogleVoidedNotif>,
    #[serde(default)]
    test_notification: Option<Value>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct GoogleTokenNotif {
    #[serde(default)]
    purchase_token: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct GoogleOneTimeNotif {
    #[serde(default)]
    purchase_token: Option<String>,
    #[serde(default)]
    sku: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct GoogleVoidedNotif {
    #[serde(default)]
    purchase_token: Option<String>,
    #[serde(default)]
    order_id: Option<String>,
    #[serde(default)]
    product_type: Option<i64>,
    #[serde(default)]
    refund_type: Option<i64>,
}

pub(super) fn google_notification<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
) -> AppResult<RouteResponse> {
    if !matches(req, "POST", "/paywall/v1/native-store/google/notifications") {
        return Err(AppError::not_found(
            "unknown native-store notification route",
        ));
    }
    let cfg = google_config(seams)?;
    let now = seams.now_unix_secs();
    cfg.verify_push_identity(seams, req.bearer_token(), now)?;
    let env: PubSubEnvelope = serde_json::from_value(req.json_body()?).map_err(|e| {
        AppError::unprocessable("invalid notification body").with_internal(e.to_string())
    })?;
    let decoded = STANDARD
        .decode(env.message.data.trim())
        .map_err(|_| AppError::unprocessable("notification data is not base64"))?;
    let notif: GoogleNotification = serde_json::from_slice(&decoded).map_err(|e| {
        AppError::unprocessable("unreadable notification").with_internal(e.to_string())
    })?;
    if notif.package_name.as_deref() != Some(cfg.package_name()) {
        return Err(AppError::forbidden(
            "Google notification is for a different app",
        ));
    }
    let notification_count = usize::from(notif.subscription_notification.is_some())
        + usize::from(notif.one_time_product_notification.is_some())
        + usize::from(notif.voided_purchase_notification.is_some())
        + usize::from(notif.test_notification.is_some());
    if notification_count != 1 {
        return Err(AppError::unprocessable(
            "Google notification must contain exactly one event",
        ));
    }
    if notif.test_notification.is_some() {
        return Ok(RouteResponse::ok(&json!({ "received": true })));
    }
    let notification_id = env
        .message
        .message_id
        .filter(|id| !id.trim().is_empty())
        .map(|id| format!("google:{id}"))
        .unwrap_or_else(|| digest_id("google", &decoded));
    let event_time_ms = notif
        .event_time_millis
        .as_deref()
        .and_then(|value| value.parse().ok())
        .unwrap_or_else(|| now.saturating_mul(1000));
    if event_time_ms < 0 || event_time_ms > now.saturating_mul(1000).saturating_add(300_000) {
        return Err(AppError::unprocessable(
            "Google notification event time is invalid",
        ));
    }
    let token = cfg.access_token(seams, now)?;

    if let Some(t) = notif
        .subscription_notification
        .and_then(|n| n.purchase_token)
    {
        reconcile_google_subscription(
            seams,
            &cfg,
            &token,
            &t,
            &notification_id,
            event_time_ms,
            now,
        )?;
    } else if let Some(voided) = notif.voided_purchase_notification {
        let purchase_token = voided
            .purchase_token
            .filter(|value| !value.trim().is_empty())
            .ok_or_else(|| AppError::unprocessable("voided purchase token is required"))?;
        let order_id = voided
            .order_id
            .filter(|value| !value.trim().is_empty())
            .ok_or_else(|| AppError::unprocessable("voided purchase order is required"))?;
        let product_type = voided
            .product_type
            .filter(|value| matches!(value, 1 | 2))
            .ok_or_else(|| AppError::unprocessable("voided purchase product type is invalid"))?;
        let refund_type = voided
            .refund_type
            .filter(|value| matches!(value, 1 | 2))
            .ok_or_else(|| AppError::unprocessable("voided purchase refund type is invalid"))?;
        let ledger_refund = reconcile_google_voided_purchase(
            seams,
            &cfg,
            &token,
            &purchase_token,
            &order_id,
            refund_type,
        )?;
        let cancel_subscription = product_type == 1 && matches!(&ledger_refund, LedgerRefund::Full);
        apply_notification(
            seams,
            NativeNotification {
                id: notification_id,
                event_time_ms,
                provider: GOOGLE_PROVIDER,
                subscription_id: cancel_subscription.then(|| purchase_token.clone()),
                provider_refs: vec![purchase_token.clone()],
                subscription_action: cancel_subscription.then_some(SubscriptionAction::Cancel),
                ledger_ref: Some(format!("google-token:{purchase_token}")),
                ledger_refund: Some(ledger_refund),
            },
        )?;
    } else if let Some(ot) = notif.one_time_product_notification {
        if let (Some(t), Some(sku)) = (ot.purchase_token, ot.sku) {
            reconcile_google_one_time(
                seams,
                &cfg,
                &token,
                &sku,
                &t,
                &notification_id,
                event_time_ms,
            )?;
        }
    }
    Ok(RouteResponse::ok(&json!({ "received": true })))
}
