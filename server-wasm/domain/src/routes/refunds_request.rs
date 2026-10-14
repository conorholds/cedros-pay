use serde::Deserialize;
use serde_json::json;
use sha2::{Digest, Sha256};

use crate::auth;
use crate::db::Db;
use crate::error::{AppError, AppResult};
use crate::guarded_batch::GuardedBatchOutcome;
use crate::ids;
use crate::reqresp::{RouteRequest, RouteResponse};
use crate::routes::matches;
use crate::seams::HostSeams;
use crate::time;
use crate::x402::pubkey;

use super::{
    derive_refund_id, load_refundable_payment_versioned, refund_response, store, RefundRow,
};

#[derive(Debug, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct RequestBody {
    #[serde(default)]
    original_purchase_id: String,
    #[serde(default)]
    recipient_wallet: String,
    #[serde(default)]
    reason: Option<String>,
}

pub(super) fn request_refund<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
) -> AppResult<RouteResponse> {
    if !matches(req, "POST", "/paywall/v1/refunds/request") {
        return Err(AppError::not_found("unknown refund route"));
    }
    let body: RequestBody = serde_json::from_value(req.json_body()?).map_err(|error| {
        AppError::bad_request("invalid refund request").with_internal(error.to_string())
    })?;
    let purchase_id = required(&body.original_purchase_id, "originalPurchaseId")?;
    let wallet = required(&body.recipient_wallet, "recipientWallet")?;
    pubkey::parse(wallet)
        .map_err(|_| AppError::bad_request("recipientWallet must be a valid Solana address"))?;
    let reason = body
        .reason
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string);
    let db = Db::new(seams, ids::DB_ACCESS);
    let original = load_refundable_payment_versioned(&db, purchase_id)?;
    authorize_owner(seams, req, &original.value, wallet)?;
    let refund_id = derive_refund_id(purchase_id);
    let fingerprint = fingerprint(
        purchase_id,
        wallet,
        reason.as_deref(),
        original.value.gross_cents,
        &original.value.currency,
    );
    if let Some(existing) = store::read::<_, RefundRow>(&db, &refund_id)? {
        return replay(existing.value, &fingerprint);
    }
    let row = new_row(
        seams.now_unix_secs(),
        refund_id.clone(),
        purchase_id,
        wallet,
        reason,
        fingerprint,
        &original.value,
    );
    let outcome = db.guarded_batch(
        &[
            store::version_condition(purchase_id, &original.version),
            store::absent_condition(&refund_id),
        ],
        &[store::write(&refund_id, &row)?],
    )?;
    match outcome {
        GuardedBatchOutcome::Applied { .. } => created(row),
        GuardedBatchOutcome::Conflict { .. } => resolve_conflict(&db, &refund_id, &row),
    }
}

fn authorize_owner<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
    original: &crate::models::LedgerEntry,
    recipient_wallet: &str,
) -> AppResult<()> {
    let buyer = auth::verify_buyer(seams, req)?;
    if original.customer_profile_id.as_deref() != Some(buyer.user_id.as_str()) {
        return Err(AppError::forbidden(
            "refund purchase ownership could not be verified",
        ));
    }
    if original.payer_wallet.as_deref() != Some(recipient_wallet) {
        return Err(AppError::forbidden(
            "refund destination must be the wallet that authorized the purchase",
        ));
    }
    Ok(())
}

fn resolve_conflict<S: HostSeams>(
    db: &Db<'_, S>,
    refund_id: &str,
    row: &RefundRow,
) -> AppResult<RouteResponse> {
    match store::read::<_, RefundRow>(db, refund_id)? {
        Some(existing) => replay(
            existing.value,
            row.fingerprint.as_deref().unwrap_or_default(),
        ),
        None => Err(AppError::conflict(
            "purchase changed while requesting refund; retry",
        )),
    }
}

fn new_row(
    now: i64,
    refund_id: String,
    purchase_id: &str,
    wallet: &str,
    reason: Option<String>,
    fingerprint: String,
    original: &crate::models::LedgerEntry,
) -> RefundRow {
    let created_at = time::iso8601(now);
    let token_settlement = original.token_settlement.as_ref();
    RefundRow {
        reference: refund_id,
        kind: "refund".to_string(),
        status: "pending".to_string(),
        gross_cents: original.gross_cents,
        refund_cents: 0,
        currency: original.currency.clone(),
        customer_profile_id: original.customer_profile_id.clone(),
        product_id: original.product_id.clone(),
        provider: "x402".to_string(),
        provider_ref: None,
        created_at: created_at.clone(),
        processed_at: created_at,
        original_purchase_id: purchase_id.to_string(),
        recipient_wallet: wallet.to_string(),
        payment_mint: token_settlement.map(|settlement| settlement.mint.clone()),
        refund_amount_microunits: token_settlement.map(|settlement| settlement.amount_atomic),
        token_decimals: token_settlement.map(|settlement| settlement.decimals),
        reason,
        fingerprint: Some(fingerprint),
        signing_attempt: None,
        settlement: None,
    }
}

fn replay(row: RefundRow, fingerprint: &str) -> AppResult<RouteResponse> {
    if row.fingerprint.as_deref() != Some(fingerprint) {
        return Err(AppError::conflict(
            "refund request identity was already used with different content",
        ));
    }
    Ok(RouteResponse::ok(&refund_response(&row)))
}

fn created(row: RefundRow) -> AppResult<RouteResponse> {
    let mut value = refund_response(&row);
    value["message"] =
        json!("Refund request submitted. An admin will review and process your request.");
    Ok(RouteResponse::ok(&value))
}

fn required<'a>(value: &'a str, field: &str) -> AppResult<&'a str> {
    let value = value.trim();
    if value.is_empty() {
        Err(AppError::bad_request(format!("{field} is required")))
    } else {
        Ok(value)
    }
}

fn fingerprint(
    purchase_id: &str,
    wallet: &str,
    reason: Option<&str>,
    amount: i64,
    currency: &str,
) -> String {
    let value = json!({
        "originalPurchaseId": purchase_id, "recipientWallet": wallet,
        "reason": reason, "amountCents": amount, "currency": currency,
    });
    hex::encode(Sha256::digest(value.to_string().as_bytes()))
}
