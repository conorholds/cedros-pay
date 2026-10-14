//! JWS (JSON Web Signature) verification for native-store receipts.
//!
//! Apple's App Store Server API returns signed transactions/renewals as a compact
//! ES256 (P-256 ECDSA) JWS whose `x5c` header carries the signing certificate chain.
//! This module is the security-critical core: verifying the ES256 signature over the
//! `header.payload` signing input. Pure RustCrypto (`p256`) — no wasm-bindgen, so it
//! component-links under `wasm32-wasip2`; ECDSA verify needs no randomness.
//!
//! (The `x5c` certificate-chain validation — parsing each DER cert, verifying each is
//! signed by its issuer, and anchoring to the Apple Root CA — is a follow-up built on
//! this primitive; the signature verify here is what every receipt's trust rests on.)

use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine;
use p256::ecdsa::{signature::Verifier, Signature, VerifyingKey};

/// The decoded parts of a compact JWS: the raw header/payload bytes the caller
/// inspects, after the ES256 signature has been verified.
#[derive(Debug, Clone)]
pub struct VerifiedJws {
    pub header: Vec<u8>,
    pub payload: Vec<u8>,
}

/// Verify a compact JWS (`header.payload.signature`, all base64url) against an ES256
/// public key, returning the decoded header + payload only when the signature is
/// authentic. Fails closed on any malformation or signature mismatch.
pub fn verify_es256(jws: &str, verifying_key: &VerifyingKey) -> Result<VerifiedJws, &'static str> {
    let mut parts = jws.split('.');
    let header_b64 = parts.next().ok_or("malformed jws")?;
    let payload_b64 = parts.next().ok_or("malformed jws")?;
    let sig_b64 = parts.next().ok_or("malformed jws")?;
    if header_b64.is_empty() || payload_b64.is_empty() || parts.next().is_some() {
        return Err("malformed jws");
    }

    // ES256 signature is fixed-width r||s (64 bytes). Verify over the exact signing
    // input bytes `header.payload` (no re-encoding).
    let sig_bytes = URL_SAFE_NO_PAD
        .decode(sig_b64)
        .map_err(|_| "invalid signature encoding")?;
    let signature = Signature::from_slice(&sig_bytes).map_err(|_| "invalid signature")?;
    let signing_input = format!("{header_b64}.{payload_b64}");
    verifying_key
        .verify(signing_input.as_bytes(), &signature)
        .map_err(|_| "signature verification failed")?;

    Ok(VerifiedJws {
        header: URL_SAFE_NO_PAD
            .decode(header_b64)
            .map_err(|_| "invalid header encoding")?,
        payload: URL_SAFE_NO_PAD
            .decode(payload_b64)
            .map_err(|_| "invalid payload encoding")?,
    })
}

/// Build an ES256 verifying key from a SEC1-encoded public point (the form extracted
/// from a leaf certificate's SubjectPublicKeyInfo).
pub fn verifying_key_from_sec1(bytes: &[u8]) -> Result<VerifyingKey, &'static str> {
    VerifyingKey::from_sec1_bytes(bytes).map_err(|_| "invalid p256 public key")
}

#[cfg(test)]
mod tests {
    use super::*;
    use p256::ecdsa::{signature::Signer, SigningKey};

    fn b64(bytes: &[u8]) -> String {
        URL_SAFE_NO_PAD.encode(bytes)
    }

    /// Self-contained KAT: sign a JWS with a fixed P-256 key, verify it, then prove
    /// any tamper (payload, signature, or wrong key) is rejected.
    #[test]
    fn verifies_a_genuine_es256_jws_and_rejects_every_tamper() {
        let signing = SigningKey::from_slice(&[7u8; 32]).unwrap();
        let vk = *signing.verifying_key();

        let header = b64(br#"{"alg":"ES256","x5c":["..."]}"#);
        let payload = b64(br#"{"transactionId":"tx_1","productId":"plan_pro"}"#);
        let signing_input = format!("{header}.{payload}");
        let sig: Signature = signing.sign(signing_input.as_bytes());
        let jws = format!("{signing_input}.{}", b64(&sig.to_bytes()));

        // Genuine JWS verifies and surfaces the payload.
        let out = verify_es256(&jws, &vk).unwrap();
        assert_eq!(
            out.payload,
            br#"{"transactionId":"tx_1","productId":"plan_pro"}"#
        );

        // Tampered payload (same signature) is rejected.
        let forged = format!(
            "{header}.{}.{}",
            b64(br#"{"transactionId":"tx_HACKED","productId":"plan_pro"}"#),
            b64(&sig.to_bytes())
        );
        assert!(verify_es256(&forged, &vk).is_err());

        // A different key cannot verify it.
        let other = SigningKey::from_slice(&[9u8; 32]).unwrap();
        assert!(verify_es256(&jws, other.verifying_key()).is_err());

        // The SEC1 round-trip yields the same key (as extracted from a cert's SPKI).
        let sec1 = vk.to_encoded_point(false);
        let vk2 = verifying_key_from_sec1(sec1.as_bytes()).unwrap();
        assert!(verify_es256(&jws, &vk2).is_ok());
    }

    #[test]
    fn rejects_malformed_jws() {
        let vk = *SigningKey::from_slice(&[7u8; 32]).unwrap().verifying_key();
        assert!(verify_es256("only.two", &vk).is_err());
        assert!(verify_es256("a.b.c.d", &vk).is_err());
        assert!(verify_es256(".b.c", &vk).is_err());
        assert!(verify_es256("a.b.notbase64!!", &vk).is_err());
    }
}
