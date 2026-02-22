use chrono::Utc;
use hmac::{Hmac, Mac};
use sha2::Sha256;
use subtle::ConstantTimeEq;

use crate::constants::WEBHOOK_TIMESTAMP_TOLERANCE;
use crate::errors::ErrorCode;
use crate::services::{ServiceError, ServiceResult};

pub(crate) fn verify_stripe_webhook_signature(
    payload: &[u8],
    signature_header: &str,
    webhook_secret: &str,
) -> ServiceResult<()> {
    // Empty secret is blocked at config validation, but check here for safety.
    if webhook_secret.is_empty() {
        return Err(ServiceError::Coded {
            code: ErrorCode::ConfigError,
            message: "webhook_secret not configured".into(),
        });
    }

    // "disabled" is treated as invalid for webhook verification.
    if webhook_secret == "disabled" {
        return Err(ServiceError::Coded {
            code: ErrorCode::ConfigError,
            message: "stripe.webhook_secret cannot be 'disabled'".into(),
        });
    }

    // SEC-08: Cap header length to prevent DoS via oversized signatures
    const MAX_SIGNATURE_HEADER_LEN: usize = 4096;
    const MAX_V1_SIGNATURES: usize = 10;
    if signature_header.len() > MAX_SIGNATURE_HEADER_LEN {
        return Err(ServiceError::Coded {
            code: ErrorCode::InvalidSignature,
            message: "signature header too large".into(),
        });
    }

    // Parse Stripe signature header: t=timestamp,v1=signature
    let mut timestamp: Option<i64> = None;
    let mut signatures: Vec<&str> = Vec::new();

    for part in signature_header.split(',') {
        let mut kv = part.splitn(2, '=');
        let key = kv.next().unwrap_or("");
        let value = kv.next().unwrap_or("");

        if key == "t" {
            timestamp = value.parse().ok();
        } else if key == "v1" {
            if signatures.len() >= MAX_V1_SIGNATURES {
                return Err(ServiceError::Coded {
                    code: ErrorCode::InvalidSignature,
                    message: "too many signatures".into(),
                });
            }
            signatures.push(value);
        }
    }

    let ts = timestamp.ok_or_else(|| ServiceError::Coded {
        code: ErrorCode::InvalidSignature,
        message: "missing timestamp in signature".into(),
    })?;

    // Check timestamp tolerance
    let now = Utc::now().timestamp();
    if (now - ts).abs() > WEBHOOK_TIMESTAMP_TOLERANCE.as_secs() as i64 {
        return Err(ServiceError::Coded {
            code: ErrorCode::InvalidSignature,
            message: "webhook timestamp too old".into(),
        });
    }

    // Compute expected signature over raw bytes: "{ts}." || payload
    let mut signed_payload = ts.to_string().into_bytes();
    signed_payload.push(b'.');
    signed_payload.extend_from_slice(payload);

    let mut mac = Hmac::<Sha256>::new_from_slice(webhook_secret.as_bytes())
        .map_err(|_| ServiceError::Internal("HMAC key error".into()))?;
    mac.update(&signed_payload);
    let expected = hex::encode(mac.finalize().into_bytes());

    // S-04: Compare signatures using constant-time fold to avoid short-circuit timing leak.
    // Iterator::any() would short-circuit on first match, leaking positional information.
    let signature_valid: bool = signatures
        .iter()
        .fold(subtle::Choice::from(0u8), |acc, s| {
            acc | s.as_bytes().ct_eq(expected.as_bytes())
        })
        .into();
    if !signature_valid {
        return Err(ServiceError::Coded {
            code: ErrorCode::InvalidSignature,
            message: "signature mismatch".into(),
        });
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_verify_stripe_webhook_signature_accepts_non_utf8_payload() {
        let payload = [0xffu8, 0x00, 0xfe, b'{', b'}'];
        let secret = "whsec_test";
        let ts = Utc::now().timestamp();

        let mut signed = ts.to_string().into_bytes();
        signed.push(b'.');
        signed.extend_from_slice(&payload);

        let mut mac = Hmac::<Sha256>::new_from_slice(secret.as_bytes()).expect("mac");
        mac.update(&signed);
        let expected = hex::encode(mac.finalize().into_bytes());

        let header = format!("t={},v1={}", ts, expected);
        verify_stripe_webhook_signature(&payload, &header, secret).expect("verify");
    }

    #[test]
    fn test_rejects_oversized_signature_header() {
        let payload = b"{}";
        let secret = "whsec_test";
        // 4097 bytes exceeds the 4096 limit
        let header = "t=1234567890,v1=".to_string() + &"a".repeat(4081);
        assert!(header.len() > 4096);
        let err = verify_stripe_webhook_signature(payload, &header, secret).unwrap_err();
        assert!(err.to_string().contains("too large"), "got: {err}");
    }

    #[test]
    fn test_rejects_too_many_v1_signatures() {
        let payload = b"{}";
        let secret = "whsec_test";
        // 11 v1= entries exceeds the 10-signature limit
        let sigs: Vec<String> = (0..11).map(|i| format!("v1=sig{i}")).collect();
        let header = format!("t=1234567890,{}", sigs.join(","));
        let err = verify_stripe_webhook_signature(payload, &header, secret).unwrap_err();
        assert!(err.to_string().contains("too many"), "got: {err}");
    }
}
