use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

use crate::db::Db;
use crate::error::{AppError, AppResult};
use crate::models::LedgerEntry;
use crate::seams::HostSeams;

use super::store;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RefundRow {
    pub reference: String,
    pub kind: String,
    pub status: String,
    pub gross_cents: i64,
    #[serde(default)]
    pub refund_cents: i64,
    pub currency: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub customer_profile_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub product_id: Option<String>,
    pub provider: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub provider_ref: Option<String>,
    pub created_at: String,
    pub processed_at: String,
    pub original_purchase_id: String,
    pub recipient_wallet: String,
    /// Token facts snapshotted from the original durable payment so operators
    /// see the asset actually returned, not only its fiat-priced checkout value.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub payment_mint: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub refund_amount_microunits: Option<u64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub token_decimals: Option<u8>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub fingerprint: Option<String>,
    /// Exact Core request persisted before provider egress. Retries must reuse
    /// this request byte-for-byte so Core's refund-id idempotency cannot conflict
    /// and a fresh blockhash can never create a second payout.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub signing_attempt: Option<RefundSigningAttempt>,
    /// Exact server-signed refund transaction facts. A submitted payout is not
    /// safe to retry or finalize without these bytes: signature status alone
    /// cannot prove that the observed transaction encoded the intended refund.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub settlement: Option<RefundSettlementEvidence>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct RefundSettlementEvidence {
    pub transaction_base64: String,
    pub recent_blockhash: String,
    pub network: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct RefundSigningAttempt {
    pub request: crate::x402::refund::RefundRequest,
    pub signer_wallet_id: String,
    pub signer_public_key: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub response: Option<crate::x402::refund::RefundResponse>,
}

pub(crate) fn load_refundable_payment_versioned<S: HostSeams>(
    db: &Db<'_, S>,
    purchase_id: &str,
) -> AppResult<store::Versioned<LedgerEntry>> {
    let payment = store::read::<_, LedgerEntry>(db, purchase_id)?
        .ok_or_else(|| AppError::not_found("unknown purchase"))?;
    if payment.value.kind != "payment" || payment.value.provider != "x402" {
        return Err(AppError::unprocessable("not a refundable x402 payment"));
    }
    if payment.value.status != "succeeded" || payment.value.net_cents() <= 0 {
        return Err(AppError::unprocessable("purchase is not refundable"));
    }
    Ok(payment)
}

pub(crate) fn read_refund_row<S: HostSeams>(
    db: &Db<'_, S>,
    refund_id: &str,
) -> AppResult<Option<RefundRow>> {
    let Some(record) = db.read_one(crate::ids::MODEL_LEDGER, refund_id)? else {
        return Ok(None);
    };
    match record.parse::<RefundRow>() {
        Ok(row) if row.kind == "refund" => Ok(Some(row)),
        _ => Ok(None),
    }
}

pub(crate) fn refund_response(row: &RefundRow) -> Value {
    json!({
        "refundId": row.reference, "status": row.status,
        "originalPurchaseId": row.original_purchase_id,
        "recipientWallet": row.recipient_wallet, "amountCents": row.gross_cents,
        "paymentMint": row.payment_mint,
        "refundAmountMicrounits": row.refund_amount_microunits,
        "tokenDecimals": row.token_decimals,
        "currency": row.currency, "reason": row.reason, "createdAt": row.created_at,
        "processedAt": if row.status == "pending" { Value::Null } else { json!(row.processed_at) },
        "signature": row.provider_ref,
    })
}

pub(super) fn refund_id_from_path(path: &str) -> Option<&str> {
    const MARKER: &str = "/paywall/v1/refunds/";
    let start = path.find(MARKER)? + MARKER.len();
    let id = path[start..].split('/').next().unwrap_or("");
    (!id.is_empty() && id != "request").then_some(id)
}
