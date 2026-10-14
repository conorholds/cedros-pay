//! Apple App Store receipt lookup, verification, and fraud gates.

use serde::Deserialize;
use serde_json::{json, Value};

pub(in crate::routes) use super::apple_config::{apple_config, AppleConfig};
use super::purchase_commit::{commit_purchase, Commit};
use super::{load_catalog_product, require_declared_store_product, verification_failed, VerifyReq};
use crate::error::{AppError, AppResult};
use crate::native_store::apple;
use crate::reqresp::RouteResponse;
use crate::seams::HostSeams;

const PROD_BASE: &str = "https://api.storekit.itunes.apple.com";
const SANDBOX_BASE: &str = "https://api.storekit-sandbox.itunes.apple.com";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct AppleTx {
    #[serde(default)]
    pub(super) transaction_id: Option<String>,
    #[serde(default)]
    pub(super) original_transaction_id: Option<String>,
    #[serde(default)]
    pub(super) product_id: Option<String>,
    #[serde(default)]
    pub(super) bundle_id: Option<String>,
    #[serde(default)]
    pub(super) expires_date: Option<i64>,
    #[serde(default)]
    pub(super) revocation_date: Option<i64>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct AppleLookup {
    #[serde(default)]
    signed_transaction_info: Option<String>,
}

pub(super) fn verify_apple<S: HostSeams>(
    seams: &S,
    body: &VerifyReq,
    user_id: Option<String>,
) -> AppResult<RouteResponse> {
    let cfg = apple_config(seams)?;
    let tx_id = body
        .transaction_id
        .as_deref()
        .map(str::trim)
        .filter(|id| valid_transaction_id(id))
        .ok_or_else(|| {
            AppError::unprocessable("a valid transactionId is required for apple_iap")
        })?;
    let tx = fetch_apple_tx(seams, &cfg, tx_id)?;
    finalize_apple(seams, body, user_id, cfg.bundle_id.as_deref(), tx)
}

pub(super) fn fetch_apple_tx<S: HostSeams>(
    seams: &S,
    cfg: &AppleConfig,
    tx_id: &str,
) -> AppResult<AppleTx> {
    let jwt = apple::sign_store_jwt(
        cfg.private_key(),
        &cfg.issuer_id,
        &cfg.key_id,
        cfg.bundle_id.as_deref().unwrap_or(""),
        seams.now_unix_secs(),
    )
    .map_err(|error| {
        AppError::new(500, "config_error", "could not sign the store token").with_internal(error)
    })?;
    let bases: &[&str] = if cfg.allow_sandbox {
        &[PROD_BASE, SANDBOX_BASE]
    } else {
        &[PROD_BASE]
    };
    let mut last = String::from("apple verification failed");
    for base in bases {
        let fetch = json!({ "method": "GET", "url": format!("{base}/inApps/v1/transactions/{tx_id}"),
            "headers": [["authorization", format!("Bearer {jwt}")]] });
        let (status, response) = unwrap_fetch(&seams.http_fetch(&fetch.to_string())?)?;
        if !(200..300).contains(&status) {
            last = format!("apple returned HTTP {status}");
            continue;
        }
        let lookup: AppleLookup = serde_json::from_str(&response).map_err(|error| {
            verification_failed("invalid apple response").with_internal(error.to_string())
        })?;
        let signed = lookup
            .signed_transaction_info
            .ok_or_else(|| verification_failed("apple response missing signedTransactionInfo"))?;
        let payload =
            apple::verify_apple_jws_at(&signed, apple::APPLE_ROOT_CA_G3, seams.now_unix_secs())
                .map_err(|error| {
                    verification_failed("apple receipt signature is invalid").with_internal(error)
                })?;
        return serde_json::from_slice(&payload).map_err(|error| {
            verification_failed("unreadable apple receipt").with_internal(error.to_string())
        });
    }
    Err(verification_failed("apple verification failed").with_internal(last))
}

pub(super) fn finalize_apple<S: HostSeams>(
    seams: &S,
    body: &VerifyReq,
    user_id: Option<String>,
    expected_bundle: Option<&str>,
    tx: AppleTx,
) -> AppResult<RouteResponse> {
    let requested_tx_id = body
        .transaction_id
        .as_deref()
        .map(str::trim)
        .filter(|id| valid_transaction_id(id))
        .ok_or_else(|| {
            AppError::unprocessable("a valid transactionId is required for apple_iap")
        })?;
    let tx_id = tx
        .transaction_id
        .clone()
        .filter(|id| valid_transaction_id(id))
        .ok_or_else(|| verification_failed("apple receipt missing transaction id"))?;
    if tx_id != requested_tx_id {
        return Err(AppError::new(
            403,
            "transaction_mismatch",
            "receipt does not match the requested transaction",
        ));
    }
    if tx
        .original_transaction_id
        .as_deref()
        .is_some_and(|id| !valid_transaction_id(id))
    {
        return Err(verification_failed(
            "apple receipt contains an invalid original transaction id",
        ));
    }
    if expected_bundle.is_some_and(|bundle| tx.bundle_id.as_deref() != Some(bundle)) {
        return Err(AppError::new(
            403,
            "bundle_mismatch",
            "receipt is for a different app",
        ));
    }
    if tx.revocation_date.is_some() {
        return Err(AppError::new(
            403,
            "purchase_revoked",
            "this purchase has been refunded or revoked",
        ));
    }
    let receipt_product = tx.product_id.clone().unwrap_or_default();
    if receipt_product != body.store_product_id {
        return Err(AppError::new(
            403,
            "product_mismatch",
            "receipt does not match the requested product",
        ));
    }
    let product = load_catalog_product(seams, &body.product_id)?;
    require_declared_store_product(&product, "apple", &receipt_product)?;
    let sub = tx.expires_date.map(|expires| {
        let end = expires / 1000;
        let status = if end > seams.now_unix_secs() {
            "active"
        } else {
            "expired"
        };
        (
            tx.original_transaction_id
                .clone()
                .unwrap_or_else(|| tx_id.clone()),
            status,
            end,
        )
    });
    let reference = format!("apple-tx:{tx_id}");
    commit_purchase(
        seams,
        &product,
        body,
        user_id,
        Commit {
            ledger_ref: &reference,
            provider: "apple_app_store",
            provider_ref: &tx_id,
            app_id: tx.bundle_id.as_deref(),
            sub,
        },
    )
}

fn valid_transaction_id(id: &str) -> bool {
    !matches!(id, "" | "." | "..")
        && id.len() <= 128
        && id
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_' | b'.'))
}

fn unwrap_fetch(raw: &str) -> AppResult<(u16, String)> {
    let envelope: Value = serde_json::from_str(raw).map_err(|error| {
        verification_failed("malformed egress response").with_internal(error.to_string())
    })?;
    Ok((
        envelope.get("status").and_then(Value::as_u64).unwrap_or(0) as u16,
        envelope
            .get("body")
            .and_then(Value::as_str)
            .unwrap_or("")
            .to_string(),
    ))
}
