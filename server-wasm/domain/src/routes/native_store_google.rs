//! Google Play branch of `POST /paywall/v1/native-store/verify`.
//!
//! Mints an OAuth2 access token from the operator's service-account key (RS256
//! assertion, `native_store::google::sign_rs256_jwt`) and looks the purchase up on the
//! Android Publisher API: one-time products via `purchases/products`, subscriptions via
//! `purchases/subscriptionsv2`. The package name comes from the operator config (never
//! the client) to stop cross-app token replay; the over-claim gate (the catalog product
//! must declare the google store id) and the idempotent ledger are shared with Apple.

use serde_json::Value;

use super::google_state::{check_one_time, subscription_state};
use super::purchase_commit::{commit_purchase, Commit};
use super::{
    load_catalog_product, ns_bool, ns_setting, require_declared_store_product, verification_failed,
    VerifyReq,
};
use crate::error::{AppError, AppResult};
use crate::native_store::google;
use crate::reqresp::RouteResponse;
use crate::seams::HostSeams;

use google::API_BASE;

#[derive(Debug)]
struct GoogleConfig {
    service_account_email: String,
    private_key: String,
    package_name: String,
}

pub(super) fn verify_google<S: HostSeams>(
    seams: &S,
    body: &VerifyReq,
    user_id: Option<String>,
) -> AppResult<RouteResponse> {
    let cfg = google_config(seams)?;
    let purchase_token = body
        .purchase_token
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty() && s.len() <= 4_096 && !s.chars().any(char::is_control))
        .ok_or_else(|| {
            AppError::unprocessable("a bounded purchaseToken is required for google_play_billing")
        })?;
    // The operator's configured package wins over the client's (anti cross-app replay).
    let package = &cfg.package_name;
    let store_product_id = body.store_product_id.trim();
    if store_product_id.len() > 255 || store_product_id.chars().any(char::is_control) {
        return Err(AppError::unprocessable("storeProductId is invalid"));
    }

    // Gate (anti over-claim): the catalog product must declare this google store id.
    let product = load_catalog_product(seams, &body.product_id)?;
    require_declared_store_product(&product, "google", store_product_id)?;

    let now = seams.now_unix_secs();
    let token = access_token(seams, &cfg, now)?;

    let is_subscription = product
        .get("subscription")
        .and_then(|s| s.get("interval"))
        .is_some()
        || product.get("kind").and_then(Value::as_str) == Some("subscription");

    let sub = if is_subscription {
        let encoded_package = google::path_segment(package);
        let encoded_token = google::path_segment(purchase_token);
        let v = api_get(
            seams,
            &token,
            &format!("{API_BASE}/applications/{encoded_package}/purchases/subscriptionsv2/tokens/{encoded_token}"),
        )?;
        Some(subscription_state(
            &v,
            store_product_id,
            purchase_token,
            now,
        )?)
    } else {
        let encoded_package = google::path_segment(package);
        let encoded_product = google::path_segment(store_product_id);
        let encoded_token = google::path_segment(purchase_token);
        let v = api_get(
            seams,
            &token,
            &format!("{API_BASE}/applications/{encoded_package}/purchases/products/{encoded_product}/tokens/{encoded_token}"),
        )?;
        check_one_time(&v)?;
        None
    };

    let reference = format!("google-token:{purchase_token}");
    commit_purchase(
        seams,
        &product,
        body,
        user_id,
        Commit {
            ledger_ref: &reference,
            provider: "google_play",
            provider_ref: purchase_token,
            app_id: Some(package),
            sub,
        },
    )
}

fn google_config<S: HostSeams>(seams: &S) -> AppResult<GoogleConfig> {
    let disabled = |what: &str| {
        AppError::new(
            503,
            "unavailable",
            format!("Google Play verification is {what}"),
        )
    };
    if !ns_bool(seams, "enabled") || !ns_bool(seams, "google_enabled") {
        return Err(disabled("disabled"));
    }
    let service_account_email = ns_setting(seams, "google_service_account_email")
        .ok_or_else(|| disabled("not configured"))?;
    let package_name =
        ns_setting(seams, "google_package_name").ok_or_else(|| disabled("not configured"))?;
    if !google::valid_package_name(&package_name) {
        return Err(disabled("misconfigured"));
    }
    let private_key = seams
        .secret_get("native_store.google_private_key")?
        .filter(|s| !s.trim().is_empty())
        .ok_or_else(|| disabled("not configured"))?;
    Ok(GoogleConfig {
        service_account_email,
        private_key,
        package_name,
    })
}

/// Mint an OAuth2 access token via the shared Google client.
fn access_token<S: HostSeams>(seams: &S, cfg: &GoogleConfig, now: i64) -> AppResult<String> {
    google::access_token(seams, &cfg.service_account_email, &cfg.private_key, now)
        .map_err(|m| verification_failed("Google OAuth failed").with_internal(m))
}

fn api_get<S: HostSeams>(seams: &S, token: &str, url: &str) -> AppResult<Value> {
    google::api_get(seams, token, url)
        .map_err(|m| verification_failed("Google verification failed").with_internal(m))
}

#[cfg(test)]
#[path = "native_store_google_tests.rs"]
mod tests;
