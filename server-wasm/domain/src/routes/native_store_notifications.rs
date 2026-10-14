//! Native-store webhook routes. Apple notifications are signed JWS payloads that
//! must also match the configured app identity; Google RTDN payloads are reconciled
//! by re-verifying the purchase token against Android Publisher API truth.

use crate::error::{AppError, AppResult};
use crate::ids;
use crate::reqresp::{RouteRequest, RouteResponse, RouteSpec};
use crate::seams::HostSeams;

#[path = "native_store_notifications_apple_apply.rs"]
mod apple_apply;
#[path = "native_store_notifications_apple.rs"]
mod apple_flow;
#[path = "native_store_notification_commit.rs"]
mod notification_commit;
#[path = "native_store_notification_identity.rs"]
mod notification_identity;
#[path = "native_store_notification_marker.rs"]
mod notification_marker;
#[path = "native_store_notification_projection.rs"]
mod notification_projection;
#[path = "native_store_notification_resolver.rs"]
mod notification_resolver;
use notification_commit::{
    apply_notification, LedgerRefund, NativeNotification, SubscriptionAction,
};

pub const ROUTES: &[RouteSpec] = &[
    RouteSpec {
        route_id: ids::ROUTE_NATIVE_STORE_APPLE_NOTIFICATION,
        method: "POST",
        path: "/paywall/v1/native-store/apple/notifications",
    },
    RouteSpec {
        route_id: ids::ROUTE_NATIVE_STORE_GOOGLE_NOTIFICATION,
        method: "POST",
        path: "/paywall/v1/native-store/google/notifications",
    },
];

pub fn handle<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    match req.route_id.as_str() {
        ids::ROUTE_NATIVE_STORE_APPLE_NOTIFICATION => apple_flow::apple_notification(seams, req),
        ids::ROUTE_NATIVE_STORE_GOOGLE_NOTIFICATION => {
            native_store_notifications_google::google_notification(seams, req)
        }
        _ => Err(AppError::not_found(
            "unknown native-store notification route",
        )),
    }
}

pub(super) const GOOGLE_PROVIDER: &str = "google_play";
#[path = "native_store_notifications_google.rs"]
mod native_store_notifications_google;
#[path = "native_store_notifications_google_api.rs"]
mod native_store_notifications_google_api;

#[cfg(test)]
#[path = "native_store_notifications_tests.rs"]
mod tests;

#[cfg(test)]
#[path = "native_store_notifications_guarded_tests.rs"]
mod guarded_tests;

#[cfg(test)]
#[path = "native_store_notifications_pending_tests.rs"]
mod pending_tests;

#[cfg(test)]
#[path = "native_store_notifications_google_tests.rs"]
mod google_tests;

#[cfg(test)]
use apple_apply::{apply_apple_notification, apply_apple_notification_at, NotifTx, APPLE_PROVIDER};
#[cfg(test)]
use apple_flow::validate_notification_app;
