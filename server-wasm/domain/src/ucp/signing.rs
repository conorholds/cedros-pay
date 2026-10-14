use crate::{
    error::{AppError, AppResult},
    reqresp::RouteResponse,
    seams::HostSeams,
};
use base64::{
    engine::general_purpose::{STANDARD, URL_SAFE_NO_PAD},
    Engine,
};
use p256::ecdsa::{signature::Signer, Signature, SigningKey};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};

pub(super) fn configured<S: HostSeams>(seams: &S) -> AppResult<bool> {
    Ok(seams
        .secret_get(crate::ids::SECRET_CHECKOUT_CONTEXT_MAC)?
        .is_some_and(|secret| secret.len() >= 32))
}

// Domain-separated deterministic key derivation uses the already-required,
// encrypted checkout privacy secret. No private key enters the public profile.
fn key<S: HostSeams>(seams: &S) -> AppResult<SigningKey> {
    for counter in 0..8 {
        let bytes = hex::decode(super::session_store::mac(
            seams,
            &["response-signing", &counter.to_string()],
        )?)
        .map_err(|_| AppError::internal("cannot derive signing key"))?;
        if let Ok(key) = SigningKey::from_slice(&bytes) {
            return Ok(key);
        }
    }
    Err(AppError::internal("cannot derive signing key"))
}
fn kid(key: &SigningKey) -> String {
    format!(
        "cedros-{}",
        hex::encode(Sha256::digest(
            key.verifying_key().to_encoded_point(false).as_bytes()
        ))
    )
}
pub(super) fn public_key<S: HostSeams>(seams: &S) -> AppResult<Value> {
    let key = key(seams)?;
    let point = key.verifying_key().to_encoded_point(false);
    Ok(
        json!({"kid":kid(&key),"kty":"EC","crv":"P-256","alg":"ES256","use":"sig","x":URL_SAFE_NO_PAD.encode(point.x().ok_or_else(||AppError::internal("invalid signing point"))?),"y":URL_SAFE_NO_PAD.encode(point.y().ok_or_else(||AppError::internal("invalid signing point"))?)}),
    )
}
pub(super) fn sign<S: HostSeams>(
    seams: &S,
    mut response: RouteResponse,
) -> AppResult<RouteResponse> {
    let key = key(seams)?;
    let digest = format!(
        "sha-256=:{}:",
        STANDARD.encode(Sha256::digest(response.body.as_bytes()))
    );
    let content_type = response
        .headers
        .iter()
        .find(|(name, _)| name.eq_ignore_ascii_case("content-type"))
        .map(|(_, value)| value.as_str())
        .ok_or_else(|| AppError::internal("missing response content type"))?;
    let params = format!(
        "(\"@status\" \"content-digest\" \"content-type\");created={};keyid=\"{}\"",
        seams.now_unix_secs(),
        kid(&key)
    );
    let base = format!(
        "\"@status\": {}\n\"content-digest\": {}\n\"content-type\": {}\n\"@signature-params\": {}",
        response.status, digest, content_type, params
    );
    let signature: Signature = key.sign(base.as_bytes());
    response.headers.extend([
        ("content-digest".into(), digest),
        ("signature-input".into(), format!("sig1={params}")),
        (
            "signature".into(),
            format!("sig1=:{}:", STANDARD.encode(signature.to_bytes())),
        ),
    ]);
    Ok(response)
}
