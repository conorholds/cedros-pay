use base64::engine::general_purpose::{STANDARD as BASE64, STANDARD_NO_PAD as BASE64_NO_PAD};
use base64::Engine;
use serde::Deserialize;
use serde_json::{json, Value};

use super::{requirement_for_resource, ResourceRequirement};
use crate::db::Db;
use crate::error::{AppError, AppResult};
use crate::ids;
use crate::models::LedgerEntry;
use crate::reqresp::{RouteRequest, RouteResponse};
use crate::routes::{cart, matches};
use crate::seams::HostSeams;
use crate::time;
use crate::x402;

#[path = "x402_confirmation.rs"]
mod confirmation;
#[path = "x402_verify_input.rs"]
mod input;
#[path = "x402_verify_output.rs"]
mod output;

use confirmation::poll_confirmation;
use input::{
    parse_verify_request, resolve_payment_requirement, solana_rpc_url, verify_transaction,
};
use output::{ledger_entry, response_for_confirmation, settlement};

const X_PAYMENT_RESPONSE_HEADER: &str = "X-PAYMENT-RESPONSE";
const AWAITING_CONFIRMATION_ERROR: &str = "payment submitted; awaiting on-chain confirmation";

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct XPayment {
    #[serde(default)]
    network: Option<String>,
    payload: XPaymentPayload,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct XPaymentPayload {
    transaction: Option<String>,
    #[serde(default)]
    resource: String,
    #[serde(default)]
    metadata: Value,
}

struct ParsedVerifyRequest {
    network: String,
    transaction: String,
    resource: String,
    payment: XPayment,
}

struct PaymentRequirement {
    cart_id: Option<String>,
    resource: ResourceRequirement,
}

struct VerifiedTransaction {
    transaction: String,
    recent_blockhash: String,
    payment: x402::verifier::VerifiedPayment,
}

struct ConfirmationContext<'a> {
    resolved: &'a PaymentRequirement,
    verified: &'a VerifiedTransaction,
    payload: &'a XPaymentPayload,
    network: &'a str,
    prepared: &'a crate::routes::x402_payment_store::Prepared,
    now: i64,
}

/// `POST /paywall/v1/verify` — x402 settlement. Persists a pending
/// `provider:"x402"` row before polling so reconciliation can finish stragglers.
pub(super) fn verify<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    if !matches(req, "POST", "/paywall/v1/verify") {
        return Err(AppError::not_found("unknown x402 route"));
    }
    let parsed = match parse_verify_request(req, x402::config::network(seams)) {
        Ok(parsed) => parsed,
        Err(response) => return Ok(response),
    };
    let resolved = match resolve_payment_requirement(seams, &parsed.resource, &parsed.network) {
        Ok(resolved) => resolved,
        Err(response) => return Ok(response),
    };
    let verified = match verify_transaction(
        seams,
        parsed.transaction,
        &resolved.resource,
        resolved.cart_id.is_some(),
        &parsed.network,
    ) {
        Ok(verified) => verified,
        Err(response) => return Ok(response),
    };

    let db = Db::new(seams, ids::DB_ACCESS);
    // Never create a durable pending claim when the payment cannot be broadcast.
    // Terminal replays remain readable if the operator later removes the RPC.
    let new_payment_rpc = if db
        .read_one(ids::MODEL_LEDGER, &verified.payment.signature)?
        .is_none()
    {
        match solana_rpc_url(&resolved.resource, &parsed.network) {
            Ok(url) => {
                if x402::rpc::verify_cluster(seams, &url, &parsed.network).is_err() {
                    return Ok(settlement(
                        false,
                        None,
                        &parsed.network,
                        "Solana RPC does not match the active network",
                    ));
                }
                Some(url)
            }
            Err(response) => return Ok(response),
        }
    } else {
        None
    };
    let now = seams.now_unix_secs();
    let fingerprint = crate::routes::checkout_claim::fingerprint(&json!({
        "schemaVersion": 1,
        "rail": "x402",
        "signature": verified.payment.signature,
        "resource": resolved.resource.requirement.resource_id,
        "amountAtomic": verified.payment.amount_atomic,
        "mint": verified.payment.mint,
        "network": parsed.network,
    }))?;
    let pending = ledger_entry(
        &resolved.resource,
        &verified,
        "pending",
        None,
        now,
        &parsed.network,
    );
    let prepared = crate::routes::x402_payment_store::prepare(
        &db,
        pending,
        resolved.cart_id.as_deref(),
        fingerprint,
    )?;
    if prepared.entry.status == "succeeded" {
        return Ok(settlement(
            true,
            Some(&verified.payment.signature),
            &parsed.network,
            "",
        ));
    }
    if prepared.entry.status == "failed" {
        return Ok(settlement(
            false,
            None,
            &parsed.network,
            "transaction failed on-chain",
        ));
    }
    let cluster_verified = new_payment_rpc.is_some();
    let rpc_url = match new_payment_rpc {
        Some(url) => url,
        None => match solana_rpc_url(&resolved.resource, &parsed.network) {
            Ok(url) => url,
            Err(response) => return Ok(response),
        },
    };
    if !cluster_verified && x402::rpc::verify_cluster(seams, &rpc_url, &parsed.network).is_err() {
        return Ok(settlement(
            false,
            None,
            &parsed.network,
            "Solana RPC does not match the active network",
        ));
    }

    let context = ConfirmationContext {
        resolved: &resolved,
        verified: &verified,
        payload: &parsed.payment.payload,
        network: &parsed.network,
        prepared: &prepared,
        now,
    };
    submit_and_poll(seams, &db, &context, &rpc_url)
}

fn submit_and_poll<S: HostSeams>(
    seams: &S,
    db: &Db<'_, S>,
    context: &ConfirmationContext<'_>,
    rpc_url: &str,
) -> AppResult<RouteResponse> {
    // The durable pending claim is committed before any broadcast. A crash can
    // therefore only cause an idempotent re-broadcast of this same signature.
    if let Ok(raw) = seams.http_fetch(
        &x402::rpc::build_send_transaction(rpc_url, &context.verified.transaction).to_string(),
    ) {
        if x402::rpc::parse_send_transaction(&raw)
            .is_ok_and(|signature| signature != context.verified.payment.signature)
        {
            return Ok(settlement(
                false,
                None,
                context.network,
                AWAITING_CONFIRMATION_ERROR,
            ));
        }
    }
    let confirmation = match poll_confirmation(seams, rpc_url, &context.verified.payment.signature)
    {
        Ok(confirmation) => confirmation,
        Err(_) => {
            return Ok(settlement(
                false,
                None,
                context.network,
                AWAITING_CONFIRMATION_ERROR,
            ));
        }
    };
    response_for_confirmation(seams, db, context, confirmation)
}
