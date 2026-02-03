use axum::http::Request;
use base64::Engine;
use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use subtle::ConstantTimeEq;

/// Headers used for Ed25519 signature verification
pub const X_SIGNATURE: &str = "X-Signature";
pub const X_MESSAGE: &str = "X-Message";
pub const X_SIGNER: &str = "X-Signer";

/// Result of signature verification
#[derive(Debug)]
pub enum SignatureVerifyResult {
    Valid { signer: String },
    Invalid { reason: String },
    Missing { reason: String },
}

/// Verify Ed25519 signature from request headers
fn verify_signature_impl(
    signature_b64: &str,
    message: &str,
    signer_b58: &str,
) -> SignatureVerifyResult {
    // Decode base64 signature
    let signature_bytes = match base64::engine::general_purpose::STANDARD.decode(signature_b64) {
        Ok(b) => b,
        Err(_) => {
            return SignatureVerifyResult::Invalid {
                reason: "invalid base64 signature".into(),
            }
        }
    };

    if signature_bytes.len() != 64 {
        return SignatureVerifyResult::Invalid {
            reason: "signature must be 64 bytes".into(),
        };
    }

    // Decode base58 public key
    let pubkey_bytes = match bs58::decode(signer_b58).into_vec() {
        Ok(b) => b,
        Err(_) => {
            return SignatureVerifyResult::Invalid {
                reason: "invalid base58 public key".into(),
            }
        }
    };

    if pubkey_bytes.len() != 32 {
        return SignatureVerifyResult::Invalid {
            reason: "public key must be 32 bytes".into(),
        };
    }

    // Create verifying key
    let pubkey_array: [u8; 32] = match pubkey_bytes.as_slice().try_into() {
        Ok(arr) => arr,
        Err(_) => {
            return SignatureVerifyResult::Invalid {
                reason: "invalid public key length".into(),
            }
        }
    };
    let verifying_key = match VerifyingKey::from_bytes(&pubkey_array) {
        Ok(k) => k,
        Err(_) => {
            return SignatureVerifyResult::Invalid {
                reason: "invalid public key".into(),
            }
        }
    };

    // Create signature
    let sig_array: [u8; 64] = match signature_bytes.as_slice().try_into() {
        Ok(arr) => arr,
        Err(_) => {
            return SignatureVerifyResult::Invalid {
                reason: "invalid signature length".into(),
            }
        }
    };
    let signature = Signature::from_bytes(&sig_array);

    // Verify signature over message bytes
    match verifying_key.verify(message.as_bytes(), &signature) {
        Ok(_) => SignatureVerifyResult::Valid {
            signer: signer_b58.to_string(),
        },
        Err(_) => SignatureVerifyResult::Invalid {
            reason: "signature verification failed".into(),
        },
    }
}

/// Extract signature headers from request
fn extract_headers<B>(
    request: &Request<B>,
) -> Result<(String, String, String), SignatureVerifyResult> {
    const MAX_HEADER_LEN: usize = 4096;

    let signature_b64 = match request.headers().get(X_SIGNATURE) {
        Some(h) => match h.to_str() {
            Ok(s) => {
                if s.is_empty() || s.len() > MAX_HEADER_LEN {
                    return Err(SignatureVerifyResult::Invalid {
                        reason: "invalid signature header length".into(),
                    });
                }
                s.to_string()
            }
            Err(_) => {
                return Err(SignatureVerifyResult::Invalid {
                    reason: "invalid signature header encoding".into(),
                })
            }
        },
        None => {
            return Err(SignatureVerifyResult::Missing {
                reason: "missing X-Signature header".into(),
            })
        }
    };

    let message = match request.headers().get(X_MESSAGE) {
        Some(h) => match h.to_str() {
            Ok(s) => {
                if s.is_empty() || s.len() > MAX_HEADER_LEN {
                    return Err(SignatureVerifyResult::Invalid {
                        reason: "invalid message header length".into(),
                    });
                }
                s.to_string()
            }
            Err(_) => {
                return Err(SignatureVerifyResult::Invalid {
                    reason: "invalid message header encoding".into(),
                })
            }
        },
        None => {
            return Err(SignatureVerifyResult::Missing {
                reason: "missing X-Message header".into(),
            })
        }
    };

    let signer_b58 = match request.headers().get(X_SIGNER) {
        Some(h) => match h.to_str() {
            Ok(s) => {
                if s.is_empty() || s.len() > MAX_HEADER_LEN {
                    return Err(SignatureVerifyResult::Invalid {
                        reason: "invalid signer header length".into(),
                    });
                }
                s.to_string()
            }
            Err(_) => {
                return Err(SignatureVerifyResult::Invalid {
                    reason: "invalid signer header encoding".into(),
                })
            }
        },
        None => {
            return Err(SignatureVerifyResult::Missing {
                reason: "missing X-Signer header".into(),
            })
        }
    };

    Ok((signature_b64, message, signer_b58))
}

/// Verify admin request from headers against a list of allowed admin keys.
///
/// This is designed for middleware use - it extracts signature headers and verifies
/// the signer is in the allowed admin list. Any message is accepted as long as
/// the signature is valid (proves wallet ownership).
pub fn verify_admin_from_headers<B>(
    request: &Request<B>,
    allowed_admin_keys: &[String],
) -> SignatureVerifyResult {
    let (signature_b64, message, signer_b58) = match extract_headers(request) {
        Ok(h) => h,
        Err(e) => return e,
    };

    // SG-001: Verify signer is in allowed admin list (fully constant-time)
    // Use fold instead of any() to check ALL keys without short-circuiting
    let signer_allowed: bool = allowed_admin_keys
        .iter()
        .fold(subtle::Choice::from(0u8), |acc, k| {
            acc | k.as_bytes().ct_eq(signer_b58.as_bytes())
        })
        .into();
    if !signer_allowed {
        return SignatureVerifyResult::Invalid {
            reason: "signer not in allowed admin list".into(),
        };
    }

    verify_signature_impl(&signature_b64, &message, &signer_b58)
}

/// Verify an admin signature directly (for body-based signatures)
///
/// This is used when the signature is in the request body rather than headers.
/// The message should typically be the nonce to prevent replay attacks.
pub fn verify_admin_signature(
    signature_b64: &str,
    message: &str,
    signer_b58: &str,
    expected_admin_keys: &[String],
) -> SignatureVerifyResult {
    // SG-001: Verify signer is in allowed admin list (fully constant-time)
    // Use fold instead of any() to check ALL keys without short-circuiting
    let signer_allowed: bool = expected_admin_keys
        .iter()
        .fold(subtle::Choice::from(0u8), |acc, k| {
            acc | k.as_bytes().ct_eq(signer_b58.as_bytes())
        })
        .into();
    if !signer_allowed {
        return SignatureVerifyResult::Invalid {
            reason: "signer not in allowed admin list".into(),
        };
    }

    verify_signature_impl(signature_b64, message, signer_b58)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_signature_verify_result() {
        let valid = SignatureVerifyResult::Valid {
            signer: "test".into(),
        };
        assert!(matches!(valid, SignatureVerifyResult::Valid { .. }));
    }
}
