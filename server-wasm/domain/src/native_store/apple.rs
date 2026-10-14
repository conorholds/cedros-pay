//! Apple App Store Server API: JWT signing and JWS receipt chain validation.
//!
//! # Security model
//!
//! - [`sign_store_jwt`] produces an App Store Connect API bearer token. The
//!   caller supplies the operator's private key (from their `.p8` AuthKey file),
//!   their Issuer ID and Key ID. The JWT is valid for 20 minutes (1200 s).
//!
//! - [`verify_apple_jws_at`] verifies signed transactions/renewals returned by
//!   the App Store Server API. The caller supplies the raw JWS, the DER bytes of
//!   the trust anchor, and the validation time. **The production trust anchor is
//!   Apple Root CA G3** (public cert at
//!   <https://www.apple.com/certificateauthority/AppleRootCA-G3.cer>); it is a
//!   public X.509 certificate, not operator data, so the production caller should
//!   embed or fetch it separately and pass it here.
//!
//! # Chain-validation invariants
//!
//! All of the following must hold or the function returns `Err`:
//!
//! 1. The `x5c` header contains at least 2 entries (leaf .. root).
//! 2. The root (`x5c` last entry) byte-equals `trust_anchor_der` (trust-anchor
//!    pin — no trust-on-first-use).
//! 3. Every cert in `x5c` is valid at the caller-supplied validation time.
//! 4. Each non-root cert's ECDSA signature verifies under its issuer cert's
//!    SubjectPublicKeyInfo (P-256 or P-384 supported).
//! 5. The JWS ES256 signature verifies under the leaf cert's P-256 SPKI.
//!
//! Both P-256 and P-384 issuer keys are supported (Apple's WWDR G6 and root are
//! P-384; the leaf is P-256).

use base64::engine::general_purpose::{STANDARD, URL_SAFE_NO_PAD};
use base64::Engine;
use p256::ecdsa::{signature::Signer, SigningKey};
use p256::pkcs8::DecodePrivateKey;
use x509_cert::der::{Decode, Encode};
use x509_cert::Certificate;

use super::jws::verify_es256;

// OIDs for EC named curves (from RFC 5480).
const OID_P256: &str = "1.2.840.10045.3.1.7";
const OID_P384: &str = "1.3.132.0.34";

/// Apple Root CA G3 (DER) — the universal public trust anchor that every Apple JWS
/// chain (App Store Server API / notifications) terminates at. This is *not* operator
/// data (every Apple device ships it); it is the fixed root all callers pin to.
///
/// SHA-256: `63343abfb89a6a03ebb57e9b3f5fa7be7c4f5c756f3017b3a8c488c3653e9179`
/// Source: <https://www.apple.com/certificateauthority/AppleRootCA-G3.cer>
pub const APPLE_ROOT_CA_G3: &[u8] = include_bytes!("apple_root_ca_g3.der");

// ── JWT signing ───────────────────────────────────────────────────────────────

/// Build and sign an App Store Connect API JWT for the given operator credentials.
///
/// # Parameters
/// - `private_key_pem`: PKCS#8 PEM (`-----BEGIN PRIVATE KEY-----`) P-256 private
///   key as distributed in Apple's `.p8` AuthKey file.
/// - `issuer_id`: The Issuer ID shown in App Store Connect → Users and Access →
///   Integrations → In-App Purchase.
/// - `key_id`: The Key ID that matches `private_key_pem` (10-character string).
/// - `bundle_id`: App bundle identifier (e.g. `"com.example.myapp"`).
/// - `now_secs`: Current Unix timestamp in seconds (caller-supplied so the domain
///   crate stays pure — no host-clock seam required).
///
/// # Returns
/// A compact JWS string (`header.payload.signature`) that can be sent as a
/// `Bearer` token in the `Authorization` header of App Store Server API requests.
/// The token is valid for 1200 seconds (20 minutes) from `now_secs`.
///
/// # Errors
/// Returns a description string on any key-parsing or encoding failure.
pub fn sign_store_jwt(
    private_key_pem: &str,
    issuer_id: &str,
    key_id: &str,
    bundle_id: &str,
    now_secs: i64,
) -> Result<String, String> {
    let signing_key =
        SigningKey::from_pkcs8_pem(private_key_pem).map_err(|e| format!("bad private key: {e}"))?;

    let header = serde_json::json!({
        "alg": "ES256",
        "kid": key_id,
        "typ": "JWT"
    });
    let payload = serde_json::json!({
        "iss": issuer_id,
        "iat": now_secs,
        "exp": now_secs + 1200,
        "aud": "appstoreconnect-v1",
        "bid": bundle_id
    });

    let header_b64 = URL_SAFE_NO_PAD.encode(
        serde_json::to_string(&header)
            .map_err(|e| format!("header encode: {e}"))?
            .as_bytes(),
    );
    let payload_b64 = URL_SAFE_NO_PAD.encode(
        serde_json::to_string(&payload)
            .map_err(|e| format!("payload encode: {e}"))?
            .as_bytes(),
    );

    let signing_input = format!("{header_b64}.{payload_b64}");
    let sig: p256::ecdsa::Signature = signing_key.sign(signing_input.as_bytes());
    let sig_b64 = URL_SAFE_NO_PAD.encode(sig.to_bytes());

    Ok(format!("{signing_input}.{sig_b64}"))
}

// ── JWS chain validation ──────────────────────────────────────────────────────

/// Verify an Apple App Store Server JWS at `now_unix_secs` and return the payload
/// bytes on success.
///
/// The caller is responsible for supplying the correct `trust_anchor_der`. In
/// production this is **Apple Root CA G3** (a public cert — not operator data):
/// <https://www.apple.com/certificateauthority/AppleRootCA-G3.cer>
/// The caller must also provide the current Unix timestamp from its host-clock
/// seam so certificate validity is deterministic and testable.
///
/// # Validation steps (all must pass)
/// 1. Parse the JWS protected header; read the `x5c` array (base64-STANDARD DER).
/// 2. Pin the root: `x5c` last entry must byte-equal `trust_anchor_der`.
/// 3. Enforce each cert's `notBefore`/`notAfter` validity window at `now_unix_secs`.
/// 4. Verify each non-root cert's signature under its issuer's SPKI (P-256 or P-384).
/// 5. Verify the JWS ES256 signature under the leaf cert's P-256 SPKI.
///
/// # Errors
/// Any step that fails returns a descriptive `Err` string; the function never
/// panics and never returns `Ok` if the chain, certificate validity, or JWS
/// signature is invalid.
pub fn verify_apple_jws_at(
    jws: &str,
    trust_anchor_der: &[u8],
    now_unix_secs: i64,
) -> Result<Vec<u8>, String> {
    // ── 1. Parse header and extract x5c ──────────────────────────────────────
    let header_b64 = jws.split('.').next().ok_or("malformed jws: no header")?;
    let header_bytes = URL_SAFE_NO_PAD
        .decode(header_b64)
        .map_err(|_| "malformed jws: header not base64url")?;
    let header: serde_json::Value =
        serde_json::from_slice(&header_bytes).map_err(|_| "malformed jws header json")?;

    let x5c = header["x5c"]
        .as_array()
        .ok_or("x5c header missing or not array")?;
    if x5c.len() < 2 {
        return Err("x5c must contain at least 2 certs (leaf + root)".into());
    }

    // Decode each cert: x5c entries are base64-STANDARD (not URL-safe), per RFC 7515.
    let certs_der: Vec<Vec<u8>> = x5c
        .iter()
        .enumerate()
        .map(|(i, v)| {
            let s = v.as_str().ok_or_else(|| format!("x5c[{i}] not a string"))?;
            STANDARD
                .decode(s)
                .map_err(|_| format!("x5c[{i}] not valid base64"))
        })
        .collect::<Result<_, _>>()?;

    // ── 2. Trust-anchor pin ───────────────────────────────────────────────────
    // The last entry in x5c must byte-equal the caller-supplied trust anchor.
    let root_der = certs_der.last().expect("non-empty vec");
    if root_der.as_slice() != trust_anchor_der {
        return Err("trust anchor mismatch: x5c root does not match supplied anchor".into());
    }

    // ── 3. Enforce certificate validity windows ─────────────────────────────
    verify_cert_validity_at(&certs_der, now_unix_secs)?;

    // ── 4. Verify the certificate chain ──────────────────────────────────────
    // certs_der: [leaf, (intermediates...), root]
    // Each cert[i] must be signed by cert[i+1]'s key.
    for child_idx in 0..(certs_der.len() - 1) {
        let child_der = &certs_der[child_idx];
        let issuer_der = &certs_der[child_idx + 1];
        verify_cert_signed_by(child_der, issuer_der)
            .map_err(|e| format!("chain[{child_idx}] sig invalid: {e}"))?;
    }

    // ── 5. JWS signature under leaf public key ───────────────────────────────
    let leaf_cert = Certificate::from_der(&certs_der[0])
        .map_err(|e| format!("failed to parse leaf cert: {e}"))?;
    let leaf_spki = &leaf_cert.tbs_certificate.subject_public_key_info;
    let leaf_pub_bytes = leaf_spki
        .subject_public_key
        .as_bytes()
        .ok_or("leaf public key bit string has unused bits")?;
    let leaf_vk = p256::ecdsa::VerifyingKey::from_sec1_bytes(leaf_pub_bytes)
        .map_err(|_| "leaf cert is not a valid P-256 public key")?;

    let verified = verify_es256(jws, &leaf_vk).map_err(|e| format!("JWS sig: {e}"))?;
    Ok(verified.payload)
}

fn verify_cert_validity_at(certs_der: &[Vec<u8>], now_unix_secs: i64) -> Result<(), String> {
    if now_unix_secs < 0 {
        return Err("certificate validation time is before the Unix epoch".into());
    }
    let now = now_unix_secs as u64;

    for (idx, cert_der) in certs_der.iter().enumerate() {
        let cert = Certificate::from_der(cert_der)
            .map_err(|e| format!("failed to parse cert[{idx}] for validity: {e}"))?;
        let validity = cert.tbs_certificate.validity;
        let not_before = validity.not_before.to_unix_duration().as_secs();
        let not_after = validity.not_after.to_unix_duration().as_secs();
        if now < not_before {
            return Err(format!(
                "cert[{idx}] not yet valid: notBefore={not_before}, now={now}"
            ));
        }
        if now > not_after {
            return Err(format!(
                "cert[{idx}] expired: notAfter={not_after}, now={now}"
            ));
        }
    }
    Ok(())
}

/// Verify that `child_der` was signed by the key in `issuer_der`.
///
/// Supports both P-256 and P-384 issuer keys (Apple's intermediate and root
/// use P-384; the leaf uses P-256). The signed bytes are the DER re-encoding
/// of `tbsCertificate`, exactly as required by RFC 5280.
fn verify_cert_signed_by(child_der: &[u8], issuer_der: &[u8]) -> Result<(), String> {
    let child = Certificate::from_der(child_der).map_err(|e| format!("parse child cert: {e}"))?;
    let issuer_cert =
        Certificate::from_der(issuer_der).map_err(|e| format!("parse issuer cert: {e}"))?;

    // Signed bytes: DER encoding of tbs_certificate.
    let tbs_bytes = child
        .tbs_certificate
        .to_der()
        .map_err(|e| format!("re-encode TBS: {e}"))?;

    // Signature bytes from the child cert's BIT STRING (DER-encoded ECDSA signature).
    let sig_bytes = child
        .signature
        .as_bytes()
        .ok_or("child cert signature BIT STRING has unused bits")?;

    // Issuer SPKI — determine curve from algorithm parameters OID.
    let issuer_spki = &issuer_cert.tbs_certificate.subject_public_key_info;
    let issuer_pub_bytes = issuer_spki
        .subject_public_key
        .as_bytes()
        .ok_or("issuer public key BIT STRING has unused bits")?;

    let curve_oid: x509_cert::der::asn1::ObjectIdentifier = issuer_spki
        .algorithm
        .parameters
        .as_ref()
        .ok_or("issuer SPKI has no parameters")?
        .decode_as()
        .map_err(|_| "issuer SPKI parameters is not an OID")?;

    let curve_oid_str = curve_oid.to_string();
    match curve_oid_str.as_str() {
        oid if oid == OID_P256 => {
            use p256::ecdsa::{signature::Verifier, DerSignature, VerifyingKey};
            let vk = VerifyingKey::from_sec1_bytes(issuer_pub_bytes)
                .map_err(|_| "issuer: invalid P-256 SPKI")?;
            let sig = DerSignature::from_bytes(sig_bytes)
                .map_err(|_| "child cert: invalid P-256 DER signature")?;
            vk.verify(&tbs_bytes, &sig)
                .map_err(|_| "P-256 cert signature verification failed".to_string())
        }
        oid if oid == OID_P384 => {
            use p384::ecdsa::{signature::Verifier, DerSignature, VerifyingKey};
            let vk = VerifyingKey::from_sec1_bytes(issuer_pub_bytes)
                .map_err(|_| "issuer: invalid P-384 SPKI")?;
            let sig = DerSignature::from_bytes(sig_bytes)
                .map_err(|_| "child cert: invalid P-384 DER signature")?;
            vk.verify(&tbs_bytes, &sig)
                .map_err(|_| "P-384 cert signature verification failed".to_string())
        }
        other => Err(format!("unsupported issuer curve OID: {other}")),
    }
}

#[cfg(test)]
#[path = "apple_tests.rs"]
mod tests;
