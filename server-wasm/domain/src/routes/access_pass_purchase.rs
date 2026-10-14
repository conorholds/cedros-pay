//! Public Solana x402 purchase and confirmed pass issuance.

use base64::{
    engine::general_purpose::{STANDARD as BASE64, STANDARD_NO_PAD},
    Engine,
};
use serde::Deserialize;
use serde_json::json;
use sha2::{Digest, Sha256};

use super::access_pass::{
    bounded_id, load_offer, parse_body, pass_key, require_purchasable, require_schema,
};
use crate::blockchain_config;
use crate::db::{BatchOp, Db};
use crate::error::{AppError, AppResult};
use crate::guarded_batch::{GuardedBatchOutcome, GuardedCondition};
use crate::ids;
use crate::models::{
    AccessPassChallenge, AccessPassOffer, AccessPassRecord, LedgerEntry, TokenSettlement,
};
use crate::reqresp::{RouteRequest, RouteResponse};
use crate::seams::HostSeams;
use crate::x402;

#[path = "access_pass_purchase_support.rs"]
mod support;
pub(super) use support::subject_ref;
use support::{
    challenge_key, decode_payment, encode_error, opaque, random_id, short_hash,
    validate_public_key, version_guard,
};

const CHALLENGE_TTL_SECONDS: i64 = 300;
const PURCHASE_PATH: &str = "/extensions/cedros-pay/access-passes/v1/purchase";

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct PurchaseRequest {
    schema_version: u8,
    offer_ref: String,
    delegated_public_key: String,
    #[serde(default)]
    challenge_id: Option<String>,
}

pub(super) fn purchase<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    if !crate::routes::matches(req, "POST", "/access-passes/v1/purchase") {
        return Err(AppError::not_found("route not found"));
    }
    let body: PurchaseRequest = parse_body(req)?;
    require_schema(body.schema_version)?;
    validate_public_key(&body.delegated_public_key)?;
    let offer = load_offer(seams, &body.offer_ref)?;
    let Some(header) = req.header("x-payment") else {
        require_purchasable(&offer, seams.now_unix_secs() * 1000)?;
        return challenge(seams, &offer, &body.delegated_public_key);
    };
    let challenge_id = body
        .challenge_id
        .as_deref()
        .filter(|value| bounded_id(value, 16, 96))
        .ok_or_else(|| {
            AppError::new(
                400,
                "missing_challenge",
                "challengeId is required with X-PAYMENT",
            )
        })?;
    settle(
        seams,
        &offer,
        &body.delegated_public_key,
        challenge_id,
        header,
    )
}

fn challenge<S: HostSeams>(
    seams: &S,
    offer: &AccessPassOffer,
    delegated_key: &str,
) -> AppResult<RouteResponse> {
    let terms = super::access_pass_payment::payment_terms(seams, offer)?;
    let now = seams.now_unix_secs();
    let challenge_id = random_id("capch")?;
    let memo = format!(
        "cedros-pass-v1:{}:{}:{}",
        short_hash(&offer.terms_hash),
        short_hash(delegated_key),
        short_hash(&challenge_id)
    );
    let record = AccessPassChallenge {
        schema_version: 1,
        kind: "payment_challenge".into(),
        challenge_id: challenge_id.clone(),
        offer: offer.clone(),
        delegated_public_key: delegated_key.into(),
        amount_atomic: terms.amount_atomic,
        token_mint: terms.token_mint.clone(),
        token_decimals: terms.token_decimals,
        recipient_token_account: terms.recipient_token_account.clone(),
        pay_to: terms.pay_to.clone(),
        memo: memo.clone(),
        created_at_ms: now * 1000,
        expires_at_ms: (now + CHALLENGE_TTL_SECONDS) * 1000,
    };
    let db = Db::new(seams, ids::DB_ACCESS);
    let key = challenge_key(&challenge_id);
    let outcome = db.guarded_batch(
        &[GuardedCondition::Absent {
            content_model_id: ids::MODEL_ACCESS_PASSES,
            entry_key: key.clone(),
        }],
        &[BatchOp::Write {
            content_model_id: ids::MODEL_ACCESS_PASSES,
            entry_key: key,
            data: serde_json::to_value(&record).map_err(encode_error)?,
        }],
    )?;
    if matches!(outcome, GuardedBatchOutcome::Conflict { .. }) {
        return Err(AppError::conflict("challenge collision; retry"));
    }
    Ok(RouteResponse::json(
        402,
        &json!({
            "schemaVersion": 1, "offerRef": offer.offer_ref, "challengeId": challenge_id,
            "expiresAtMs": record.expires_at_ms,
            "accepts": [{
                "scheme": "solana-spl-transfer", "network": terms.network,
                "maxAmountRequired": terms.amount_atomic.to_string(), "resource": offer.source_id,
                "description": "Cash Captcha fixed-term access pass", "mimeType": "application/json",
                "payTo": terms.pay_to, "maxTimeoutSeconds": CHALLENGE_TTL_SECONDS,
                "asset": terms.token_mint,
                "extra": { "recipientTokenAccount": terms.recipient_token_account, "decimals": terms.token_decimals, "memo": memo }
            }],
            "purchaseEndpoint": { "method": "POST", "path": PURCHASE_PATH }
        }),
    ))
}

fn settle<S: HostSeams>(
    seams: &S,
    offer: &AccessPassOffer,
    delegated_key: &str,
    challenge_id: &str,
    header: &str,
) -> AppResult<RouteResponse> {
    let db = Db::new(seams, ids::DB_ACCESS);
    let challenge: AccessPassChallenge = db
        .read_one(ids::MODEL_ACCESS_PASSES, &challenge_key(challenge_id))?
        .ok_or_else(|| AppError::new(400, "challenge_missing", "payment challenge does not exist"))?
        .parse()?;
    if seams.now_unix_secs() * 1000 > challenge.expires_at_ms {
        return Err(AppError::new(
            410,
            "challenge_expired",
            "payment challenge expired",
        ));
    }
    if challenge.offer.terms_hash != offer.terms_hash
        || challenge.delegated_public_key != delegated_key
    {
        return Err(AppError::new(
            409,
            "challenge_mismatch",
            "challenge does not match offer and delegated key",
        ));
    }
    let transaction = decode_payment(header)?;
    let verified = x402::verifier::verify_canonical_proof(
        &transaction,
        &x402::verifier::CanonicalRequirement {
            recipient_token_account: challenge.recipient_token_account.clone(),
            token_mint: challenge.token_mint.clone(),
            amount_atomic: challenge.amount_atomic,
            decimals: challenge.token_decimals,
            memo: challenge.memo.clone(),
        },
    )
    .map_err(|error| AppError::new(402, error.code(), "payment proof was rejected"))?;
    let transaction_bytes = BASE64
        .decode(transaction.trim())
        .map_err(|_| AppError::new(402, "malformed_proof", "payment proof was rejected"))?;
    let parsed_transaction = x402::transaction::parse(&transaction_bytes)
        .map_err(|_| AppError::new(402, "malformed_proof", "payment proof was rejected"))?;
    let recent_blockhash = x402::pubkey::encode(&parsed_transaction.recent_blockhash);
    // One challenge represents one purchase intent. A second valid transfer
    // cannot buy a second pass from the same challenge.
    let pass_id = opaque("cpass", challenge_id);
    let subject_ref = subject_ref(&verified.payer_wallet, delegated_key);
    let now = seams.now_unix_secs();
    let pass = AccessPassRecord {
        schema_version: 1,
        pass_id: pass_id.clone(),
        subject_ref,
        status: "pending".into(),
        offer: challenge.offer.clone(),
        delegated_public_key: delegated_key.into(),
        payment_reference: verified.signature.clone(),
        payer_wallet: verified.payer_wallet.clone(),
        starts_at_ms: None,
        expires_at_ms: None,
        created_at: crate::time::iso8601(now),
        updated_at: crate::time::iso8601(now),
    };
    let ledger = LedgerEntry {
        reference: verified.signature.clone(),
        kind: "payment".into(),
        status: "pending".into(),
        gross_cents: offer.price_amount_cents as i64,
        refund_cents: 0,
        currency: offer.currency.clone(),
        customer_profile_id: None,
        route_path: Some(PURCHASE_PATH.into()),
        product_id: Some(offer.offer_ref.clone()),
        product_ids: vec![offer.offer_ref.clone()],
        provider: "x402".into(),
        provider_ref: Some(verified.signature.clone()),
        payer_wallet: Some(verified.payer_wallet.clone()),
        created_at: crate::time::iso8601(now),
        processed_at: crate::time::iso8601(now),
        token_settlement: Some(TokenSettlement {
            amount_atomic: verified.amount_atomic,
            mint: verified.mint.clone(),
            decimals: challenge.token_decimals,
            transaction_base64: Some(transaction.clone()),
            recent_blockhash: Some(recent_blockhash),
            network: Some(offer.network.clone()),
        }),
    };
    let new_purchase = db
        .read_one(ids::MODEL_ACCESS_PASSES, &pass_key(&pass_id))?
        .is_none();
    let verified_rpc = if new_purchase {
        Some(verified_rpc_url(seams, &offer.network)?)
    } else {
        None
    };
    let prepared = prepare(&db, &pass, &ledger)?;
    if prepared.0.status == "active" {
        return Ok(super::access_pass_payment::issued(&prepared.0));
    }
    if prepared.0.status == "failed" {
        return Err(AppError::new(
            402,
            "payment_failed",
            "payment failed on chain",
        ));
    }
    let rpc_url = match verified_rpc {
        Some(value) => value,
        None => verified_rpc_url(seams, &offer.network)?,
    };
    if let Ok(raw) =
        seams.http_fetch(&x402::rpc::build_send_transaction(&rpc_url, &transaction).to_string())
    {
        if x402::rpc::parse_send_transaction(&raw)
            .is_ok_and(|signature| signature != verified.signature)
        {
            return Ok(RouteResponse::json(
                202,
                &json!({"schemaVersion":1,"status":"pending","passId":pass_id,"retryable":true}),
            ));
        }
    }
    let mut confirmation = x402::rpc::Confirmation::NotFound;
    for _ in 0..6 {
        let raw = seams
            .http_fetch(
                &x402::rpc::build_get_signature_statuses(&rpc_url, &verified.signature).to_string(),
            )
            .map_err(|error| {
                AppError::new(
                    503,
                    "pay_unavailable",
                    "Solana finality service is unavailable",
                )
                .with_internal(error.message)
            })?;
        confirmation = x402::rpc::parse_signature_status(&raw).map_err(|error| {
            AppError::new(
                503,
                "pay_unavailable",
                "Solana finality service is unavailable",
            )
            .with_internal(error.message)
        })?;
        if matches!(
            confirmation,
            x402::rpc::Confirmation::Confirmed
                | x402::rpc::Confirmation::Finalized
                | x402::rpc::Confirmation::Failed(_)
        ) {
            break;
        }
    }
    match confirmation {
        x402::rpc::Confirmation::Confirmed
        | x402::rpc::Confirmation::Finalized
        | x402::rpc::Confirmation::Failed(_) => {
            match x402::rpc::load_confirmed_transaction(
                seams,
                &rpc_url,
                &verified.signature,
                &transaction,
            ) {
                Ok(x402::rpc::ConfirmedTransaction::Succeeded) => {
                    finalize(&db, prepared, seams.now_unix_secs(), offer.duration_seconds)
                }
                Ok(x402::rpc::ConfirmedTransaction::Failed(_)) => {
                    fail(&db, prepared, seams.now_unix_secs())
                }
                _ => Ok(RouteResponse::json(
                    202,
                    &json!({"schemaVersion":1,"status":"pending","passId":pass_id,"retryable":true}),
                )),
            }
        }
        _ => Ok(RouteResponse::json(
            202,
            &json!({"schemaVersion":1,"status":"pending","passId":pass_id,"retryable":true}),
        )),
    }
}

fn verified_rpc_url<S: HostSeams>(seams: &S, network: &str) -> AppResult<String> {
    let rpc_url = blockchain_config::read_solana_rpc_url(seams).map_err(|_| {
        AppError::new(
            503,
            "pay_unavailable",
            "Solana finality service is unavailable",
        )
    })?;
    x402::rpc::verify_cluster(seams, &rpc_url, network).map_err(|error| {
        AppError::new(503, "pay_unavailable", "Solana RPC network mismatch")
            .with_internal(error.message)
    })?;
    Ok(rpc_url)
}

fn prepare<S: HostSeams>(
    db: &Db<'_, S>,
    pass: &AccessPassRecord,
    ledger: &LedgerEntry,
) -> AppResult<(
    AccessPassRecord,
    crate::db::EntryRecord,
    LedgerEntry,
    crate::db::EntryRecord,
)> {
    let pass_key = pass_key(&pass.pass_id);
    for _ in 0..3 {
        if let Some(pass_row) = db.read_one(ids::MODEL_ACCESS_PASSES, &pass_key)? {
            let stored: AccessPassRecord = pass_row.parse()?;
            if stored.payment_reference != pass.payment_reference
                || stored.delegated_public_key != pass.delegated_public_key
                || stored.offer.terms_hash != pass.offer.terms_hash
            {
                return Err(AppError::new(
                    409,
                    "payment_replay",
                    "payment was already bound to different pass terms",
                ));
            }
            let ledger_row = db
                .read_one(ids::MODEL_LEDGER, &pass.payment_reference)?
                .ok_or_else(|| AppError::internal("pass payment ledger is missing"))?;
            let stored_ledger = ledger_row.parse()?;
            return Ok((stored, pass_row, stored_ledger, ledger_row));
        }
        if db
            .read_one(ids::MODEL_LEDGER, &pass.payment_reference)?
            .is_some()
        {
            return Err(AppError::new(
                409,
                "payment_replay",
                "payment was already bound to another purchase",
            ));
        }
        let conditions = [
            GuardedCondition::Absent {
                content_model_id: ids::MODEL_ACCESS_PASSES,
                entry_key: pass_key.clone(),
            },
            GuardedCondition::Absent {
                content_model_id: ids::MODEL_LEDGER,
                entry_key: ledger.reference.clone(),
            },
        ];
        let ops = [
            BatchOp::Write {
                content_model_id: ids::MODEL_ACCESS_PASSES,
                entry_key: pass_key.clone(),
                data: serde_json::to_value(pass).map_err(encode_error)?,
            },
            BatchOp::Write {
                content_model_id: ids::MODEL_LEDGER,
                entry_key: ledger.reference.clone(),
                data: serde_json::to_value(ledger).map_err(encode_error)?,
            },
        ];
        if matches!(
            db.guarded_batch(&conditions, &ops)?,
            GuardedBatchOutcome::Applied { .. }
        ) {
            continue;
        }
    }
    Err(AppError::conflict(
        "pass purchase changed concurrently; retry",
    ))
}

pub(super) fn finalize<S: HostSeams>(
    db: &Db<'_, S>,
    prepared: (
        AccessPassRecord,
        crate::db::EntryRecord,
        LedgerEntry,
        crate::db::EntryRecord,
    ),
    now: i64,
    duration: u32,
) -> AppResult<RouteResponse> {
    let (mut pass, pass_row, mut ledger, ledger_row) = prepared;
    pass.status = "active".into();
    pass.starts_at_ms = Some(now * 1000);
    pass.expires_at_ms = Some((now + duration as i64) * 1000);
    pass.updated_at = crate::time::iso8601(now);
    ledger.status = "succeeded".into();
    ledger.processed_at = crate::time::iso8601(now);
    transition(db, &pass_row, &ledger_row, &pass, &ledger)?;
    Ok(super::access_pass_payment::issued(&pass))
}

pub(super) fn fail<S: HostSeams>(
    db: &Db<'_, S>,
    prepared: (
        AccessPassRecord,
        crate::db::EntryRecord,
        LedgerEntry,
        crate::db::EntryRecord,
    ),
    now: i64,
) -> AppResult<RouteResponse> {
    let (mut pass, pass_row, mut ledger, ledger_row) = prepared;
    pass.status = "failed".into();
    pass.updated_at = crate::time::iso8601(now);
    ledger.status = "failed".into();
    ledger.processed_at = crate::time::iso8601(now);
    transition(db, &pass_row, &ledger_row, &pass, &ledger)?;
    Err(AppError::new(
        402,
        "payment_failed",
        "payment failed on chain",
    ))
}

fn transition<S: HostSeams>(
    db: &Db<'_, S>,
    pass_row: &crate::db::EntryRecord,
    ledger_row: &crate::db::EntryRecord,
    pass: &AccessPassRecord,
    ledger: &LedgerEntry,
) -> AppResult<()> {
    let conditions = [
        version_guard(ids::MODEL_ACCESS_PASSES, pass_row)?,
        version_guard(ids::MODEL_LEDGER, ledger_row)?,
    ];
    let ops = [
        BatchOp::Write {
            content_model_id: ids::MODEL_ACCESS_PASSES,
            entry_key: pass_key(&pass.pass_id),
            data: serde_json::to_value(pass).map_err(encode_error)?,
        },
        BatchOp::Write {
            content_model_id: ids::MODEL_LEDGER,
            entry_key: ledger.reference.clone(),
            data: serde_json::to_value(ledger).map_err(encode_error)?,
        },
    ];
    if matches!(
        db.guarded_batch(&conditions, &ops)?,
        GuardedBatchOutcome::Conflict { .. }
    ) {
        return Err(AppError::conflict("pass changed concurrently; retry"));
    }
    Ok(())
}
