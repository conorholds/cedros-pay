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

    // Compare signatures using timing-safe constant-time comparison.
    let signature_valid = signatures
        .iter()
        .any(|s| s.as_bytes().ct_eq(expected.as_bytes()).into());
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
}
