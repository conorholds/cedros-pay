//! Per-request delegated-key authorization for Cash Captcha.

use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use serde::Deserialize;
use serde_json::json;
use sha2::{Digest, Sha256};

use super::access_pass::{
    bounded_id, parse_body, pass_key, require_cash_captcha_service, require_schema,
};
use crate::db::{BatchOp, Db};
use crate::error::{AppError, AppResult};
use crate::guarded_batch::{GuardedBatchOutcome, GuardedCondition};
use crate::ids;
use crate::models::{AccessPassRecord, LedgerEntry};
use crate::reqresp::{RouteRequest, RouteResponse};
use crate::seams::HostSeams;

const CLOCK_SKEW_MS: i64 = 30_000;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct AuthorizationRequest {
    schema_version: u8,
    credential: Option<Credential>,
    delegated_public_key: Option<String>,
    request: Option<ProtectedRequest>,
    proof: Option<RequestProof>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Credential {
    pass_id: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ProtectedRequest {
    method: String,
    source_id: String,
    path: String,
    #[serde(default)]
    query: Vec<(String, String)>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct RequestProof {
    algorithm: String,
    timestamp_ms: i64,
    nonce: String,
    signature_base64: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct RequestUsage {
    schema_version: u8,
    kind: String,
    used_requests: u32,
    expires_at_ms: i64,
}

pub(super) fn authorize<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    authorize_inner(seams, req).map_err(|error| {
        if error.code == "internal_error" {
            let detail = error.internal.unwrap_or(error.message);
            AppError::new(503, "pay_unavailable", "Pay authorization is unavailable")
                .with_internal(detail)
        } else {
            error
        }
    })
}

fn authorize_inner<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    if !crate::routes::matches(req, "POST", "/access-passes/v1/authorize") {
        return Err(AppError::not_found("route not found"));
    }
    require_cash_captcha_service(req)?;
    let body: AuthorizationRequest = parse_body(req)?;
    require_schema(body.schema_version)?;
    let credential = body
        .credential
        .ok_or_else(|| denial(401, "missing_credential", "pass credential is required"))?;
    if !bounded_id(&credential.pass_id, 16, 96) {
        return Err(denial(
            400,
            "malformed_credential",
            "pass credential is malformed",
        ));
    }
    let delegated_key = body
        .delegated_public_key
        .ok_or_else(|| denial(400, "malformed_proof", "delegatedPublicKey is required"))?;
    let protected = body
        .request
        .ok_or_else(|| denial(400, "malformed_proof", "request binding is required"))?;
    let proof = body
        .proof
        .ok_or_else(|| denial(400, "malformed_proof", "request proof is required"))?;
    validate_request(&protected)?;
    validate_proof_shape(&proof)?;

    let db = Db::new(seams, ids::DB_ACCESS);
    let pass: AccessPassRecord = db
        .read_one(ids::MODEL_ACCESS_PASSES, &pass_key(&credential.pass_id))?
        .ok_or_else(|| denial(402, "unpaid", "pass was not issued"))?
        .parse()?;
    if delegated_key != pass.delegated_public_key {
        return Err(denial(
            403,
            "wrong_delegated_key",
            "delegated key does not match the pass",
        ));
    }
    if protected.source_id != pass.offer.source_id
        || protected.path != expected_path(&pass.offer.source_id)
    {
        return Err(denial(
            403,
            "wrong_source",
            "request is outside the pass source scope",
        ));
    }
    let now_ms = seams.now_unix_secs() * 1000;
    if (now_ms - proof.timestamp_ms).abs() > CLOCK_SKEW_MS {
        return Err(denial(
            401,
            "stale_proof",
            "request proof timestamp is outside the accepted clock skew",
        ));
    }
    let canonical = canonical_message(&pass.pass_id, &protected, &proof);
    verify_signature(
        &delegated_key,
        canonical.as_bytes(),
        &proof.signature_base64,
    )?;

    match pass.status.as_str() {
        "pending" => return Err(denial(402, "pending_payment", "payment is not confirmed")),
        "failed" => return Err(denial(402, "unpaid", "payment did not confirm")),
        "revoked" => return Err(denial(403, "revoked", "pass was revoked")),
        "active" => {}
        "disputed" => return Err(denial(403, "disputed", "payment is disputed")),
        "reversed" => return Err(denial(403, "reversed", "payment was reversed")),
        _ => return Err(denial(403, "revoked", "pass is not active")),
    }
    let starts = pass
        .starts_at_ms
        .ok_or_else(|| denial(403, "not_started", "pass has not started"))?;
    let expires = pass
        .expires_at_ms
        .ok_or_else(|| denial(403, "expired", "pass has no valid expiry"))?;
    if now_ms < starts {
        return Err(denial(403, "not_started", "pass has not started"));
    }
    if now_ms >= expires {
        return Err(denial(403, "expired", "pass expired"));
    }
    if expires - starts != pass.offer.duration_seconds as i64 * 1000 {
        return Err(denial(
            403,
            "invalid_terms",
            "pass validity does not match its immutable terms",
        ));
    }
    let ledger: LedgerEntry = db
        .read_one(ids::MODEL_LEDGER, &pass.payment_reference)?
        .ok_or_else(|| denial(402, "unpaid", "payment record is missing"))?
        .parse()?;
    if ledger.status == "pending" {
        return Err(denial(402, "pending_payment", "payment is not confirmed"));
    }
    if ledger.status == "refunded" || ledger.refund_cents > 0 {
        return Err(denial(403, "refunded", "payment was refunded"));
    }
    if ledger.status != "succeeded" {
        return Err(denial(403, "reversed", "payment is no longer settled"));
    }
    consume_request(
        &db,
        &pass.pass_id,
        &proof.nonce,
        pass.offer.maximum_total_requests,
        now_ms,
        expires,
    )?;

    Ok(RouteResponse::ok(&json!({
        "schemaVersion": 1, "active": true, "passId": pass.pass_id,
        "subjectRef": pass.subject_ref, "subjectBindingVerified": true,
        "sourceId": pass.offer.source_id, "startsAtMs": starts, "expiresAtMs": expires,
        "maximumTotalRequests": pass.offer.maximum_total_requests,
    })))
}

fn validate_request(request: &ProtectedRequest) -> AppResult<()> {
    if request.method != "GET"
        || !bounded_id(&request.source_id, 2, 64)
        || request.path != expected_path(&request.source_id)
    {
        return Err(denial(
            400,
            "malformed_proof",
            "protected request binding is invalid",
        ));
    }
    if request.query.len() > 64
        || request.query.iter().any(|(key, value)| {
            key.len() > 256
                || value.len() > 2048
                || key.chars().any(char::is_control)
                || value.chars().any(char::is_control)
        })
    {
        return Err(denial(400, "malformed_proof", "canonical query is invalid"));
    }
    Ok(())
}

fn validate_proof_shape(proof: &RequestProof) -> AppResult<()> {
    if proof.algorithm != "Ed25519"
        || !bounded_id(&proof.nonce, 16, 128)
        || proof.signature_base64.len() > 128
    {
        return Err(denial(400, "malformed_proof", "request proof is malformed"));
    }
    Ok(())
}

fn verify_signature(public_key: &str, message: &[u8], signature: &str) -> AppResult<()> {
    let key: [u8; 32] = bs58::decode(public_key)
        .into_vec()
        .ok()
        .and_then(|v| v.try_into().ok())
        .ok_or_else(|| denial(400, "malformed_proof", "delegated public key is malformed"))?;
    let signature: [u8; 64] = BASE64
        .decode(signature)
        .ok()
        .and_then(|v| v.try_into().ok())
        .ok_or_else(|| denial(400, "malformed_proof", "signature is malformed"))?;
    let key = VerifyingKey::from_bytes(&key)
        .map_err(|_| denial(400, "malformed_proof", "delegated public key is malformed"))?;
    key.verify(message, &Signature::from_bytes(&signature))
        .map_err(|_| {
            denial(
                401,
                "invalid_signature",
                "request proof signature is invalid",
            )
        })
}

fn consume_request<S: HostSeams>(
    db: &Db<'_, S>,
    pass_id: &str,
    nonce: &str,
    maximum_total_requests: Option<u32>,
    used_at_ms: i64,
    expires_at_ms: i64,
) -> AppResult<()> {
    let nonce_key = format!("nonce:{}:{}", digest(pass_id), digest(nonce));
    let nonce_condition = GuardedCondition::Absent {
        content_model_id: ids::MODEL_ACCESS_PASSES,
        entry_key: nonce_key.clone(),
    };
    let nonce_write = BatchOp::Write {
        content_model_id: ids::MODEL_ACCESS_PASSES,
        entry_key: nonce_key,
        data: json!({"schemaVersion":1,"kind":"request_nonce","usedAtMs":used_at_ms,"expiresAtMs":expires_at_ms}),
    };
    let Some(maximum) = maximum_total_requests else {
        return match db.guarded_batch(&[nonce_condition], &[nonce_write])? {
            GuardedBatchOutcome::Applied { .. } => Ok(()),
            GuardedBatchOutcome::Conflict { .. } => Err(replay_denial()),
        };
    };

    let usage_key = format!("usage:{}", digest(pass_id));
    for _ in 0..8 {
        let stored = db.read_one(ids::MODEL_ACCESS_PASSES, &usage_key)?;
        let used = match stored.as_ref() {
            Some(entry) => {
                let usage: RequestUsage = entry.parse()?;
                if usage.schema_version != 1
                    || usage.kind != "request_usage"
                    || usage.expires_at_ms != expires_at_ms
                {
                    return Err(AppError::internal("stored access pass usage is invalid"));
                }
                usage.used_requests
            }
            None => 0,
        };
        if used >= maximum {
            return Err(denial(
                403,
                "request_limit_exceeded",
                "pass request limit was reached",
            ));
        }
        let usage_condition = match stored {
            Some(entry) => GuardedCondition::Version {
                content_model_id: ids::MODEL_ACCESS_PASSES,
                entry_key: usage_key.clone(),
                expected_version: entry
                    .version
                    .ok_or_else(|| AppError::internal("stored access pass usage has no version"))?,
            },
            None => GuardedCondition::Absent {
                content_model_id: ids::MODEL_ACCESS_PASSES,
                entry_key: usage_key.clone(),
            },
        };
        let outcome = db.guarded_batch(
            &[nonce_condition.clone(), usage_condition],
            &[
                nonce_write.clone(),
                BatchOp::Write {
                    content_model_id: ids::MODEL_ACCESS_PASSES,
                    entry_key: usage_key.clone(),
                    data: json!({"schemaVersion":1,"kind":"request_usage","usedRequests":used + 1,"expiresAtMs":expires_at_ms}),
                },
            ],
        )?;
        match outcome {
            GuardedBatchOutcome::Applied { .. } => return Ok(()),
            GuardedBatchOutcome::Conflict { conflict } if conflict.condition_index == 0 => {
                return Err(replay_denial());
            }
            GuardedBatchOutcome::Conflict { .. } => continue,
        }
    }
    Err(AppError::internal(
        "access pass usage changed too often while authorizing request",
    ))
}

fn replay_denial() -> AppError {
    denial(409, "replay", "request proof nonce was already used")
}

fn canonical_message(pass_id: &str, request: &ProtectedRequest, proof: &RequestProof) -> String {
    format!(
        "CEDROS-PASS-PROOF-V1\npass-id:{pass_id}\nmethod:{}\nsource-id:{}\npath:{}\nquery:{}\ntimestamp-ms:{}\nnonce:{}",
        request.method, request.source_id, request.path, canonical_query(&request.query), proof.timestamp_ms, proof.nonce
    )
}

fn canonical_query(query: &[(String, String)]) -> String {
    let mut pairs = query
        .iter()
        .map(|(key, value)| (percent_encode(key), percent_encode(value)))
        .collect::<Vec<_>>();
    pairs.sort();
    pairs
        .into_iter()
        .map(|(key, value)| format!("{key}={value}"))
        .collect::<Vec<_>>()
        .join("&")
}

fn percent_encode(value: &str) -> String {
    let mut out = String::new();
    for byte in value.as_bytes() {
        if byte.is_ascii_alphanumeric() || matches!(*byte, b'-' | b'.' | b'_' | b'~') {
            out.push(*byte as char);
        } else {
            out.push_str(&format!("%{byte:02X}"));
        }
    }
    out
}

fn expected_path(source_id: &str) -> String {
    format!("/extensions/cash-captcha/v1/sources/{source_id}")
}
fn digest(value: &str) -> String {
    hex::encode(Sha256::digest(value.as_bytes()))
}
fn denial(status: u16, code: &'static str, message: &'static str) -> AppError {
    AppError::new(status, code, message)
}
