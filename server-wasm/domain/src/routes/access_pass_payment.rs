//! Safe public x402 terms for an immutable access-pass offer.

use serde_json::{json, Value};

use crate::blockchain_config;
use crate::error::{AppError, AppResult};
use crate::models::{AccessPassOffer, AccessPassRecord};
use crate::reqresp::RouteResponse;
use crate::seams::HostSeams;
use crate::x402;

const PURCHASE_PATH: &str = "/extensions/cedros-pay/access-passes/v1/purchase";

pub(super) struct PaymentTerms {
    pub network: String,
    pub pay_to: String,
    pub token_mint: String,
    pub token_decimals: u8,
    pub recipient_token_account: String,
    pub amount_atomic: u64,
}

pub(super) fn safe_payment_terms<S: HostSeams>(
    seams: &S,
    offer: &AccessPassOffer,
) -> AppResult<Value> {
    let terms = payment_terms(seams, offer)?;
    Ok(json!({
        "purchaseEndpoint": { "method": "POST", "path": PURCHASE_PATH },
        "requestBody": {
            "schemaVersion": 1, "offerRef": offer.offer_ref,
            "delegatedPublicKey": "base58-encoded 32-byte Ed25519 public key"
        },
        "proofHeader": "X-PAYMENT",
        "scheme": "solana-spl-transfer",
        "network": terms.network,
        "asset": terms.token_mint,
        "decimals": terms.token_decimals,
        "payTo": terms.pay_to,
        "recipientTokenAccount": terms.recipient_token_account,
        "amountAtomic": terms.amount_atomic.to_string(),
        "challengeRequired": true,
    }))
}

pub(super) fn payment_terms<S: HostSeams>(
    seams: &S,
    offer: &AccessPassOffer,
) -> AppResult<PaymentTerms> {
    if !x402::config::enabled(seams) {
        return Err(AppError::new(503, "pay_unavailable", "x402 is not enabled"));
    }
    let control = blockchain_config::resolve_x402_control(
        seams,
        x402::config::payment_address(seams),
        x402::config::network(seams),
    )?;
    if control.network != offer.network {
        return Err(AppError::new(
            409,
            "unsupported_rail",
            "offer network is not the active x402 network",
        ));
    }
    let token_mint = x402::config::token_mint(seams).ok_or_else(|| {
        AppError::new(503, "pay_unavailable", "x402 token mint is not configured")
    })?;
    let token_decimals = x402::config::token_decimals(seams);
    x402::config::validate_payment_asset(
        &control.network,
        &token_mint,
        token_decimals,
        x402::config::token_symbol(seams).as_deref(),
    )
    .map_err(|message| AppError::new(503, "pay_unavailable", message))?;
    let amount_atomic =
        x402::pricing::usd_cents_to_stablecoin_atomic(offer.price_amount_cents, token_decimals)
            .map_err(|_| AppError::internal("price conversion overflowed"))?;
    let recipient_token_account = x402::ata::derive_token_account(&control.pay_to, &token_mint)
        .map_err(AppError::internal)?;
    Ok(PaymentTerms {
        network: control.network,
        pay_to: control.pay_to,
        token_mint,
        token_decimals,
        recipient_token_account,
        amount_atomic,
    })
}

pub(super) fn issued(pass: &AccessPassRecord) -> RouteResponse {
    RouteResponse::ok(&json!({
        "schemaVersion":1,"status":"active","credential":{"passId":pass.pass_id},"subjectRef":pass.subject_ref,
        "sourceId":pass.offer.source_id,"startsAtMs":pass.starts_at_ms,"expiresAtMs":pass.expires_at_ms,
        "proof": {"algorithm":"Ed25519","format":"CEDROS-PASS-PROOF-V1","header":"request body proof"}
    }))
}
