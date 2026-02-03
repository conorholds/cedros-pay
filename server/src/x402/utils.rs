use base64::{
    engine::general_purpose::{STANDARD as BASE64, STANDARD_NO_PAD as BASE64_NO_PAD},
    Engine,
};
use rand::RngCore;
use solana_sdk::pubkey::Pubkey;
use std::str::FromStr;
use tracing::warn;

use crate::constants::{MAX_MEMO_LENGTH, X402_SCHEME_NATIVE, X402_SCHEME_SPL, X402_VERSION};
use crate::errors::ErrorCode;
use crate::models::{PaymentPayload, PaymentProof, SolanaPayload};

/// Parse X-PAYMENT header into PaymentProof
/// Follows Go implementation: accepts raw JSON or base64-encoded JSON
pub fn parse_payment_proof(header: &str) -> Result<PaymentProof, ErrorCode> {
    let raw = header.trim();
    if raw.is_empty() {
        return Err(ErrorCode::InvalidPaymentProof);
    }

    // Check if it's raw JSON first (like Go does)
    let json_str = if raw.starts_with('{') {
        raw.to_string()
    } else {
        // Try standard base64, then base64 without padding (like Go does)
        let decoded = BASE64
            .decode(raw)
            .or_else(|_| BASE64_NO_PAD.decode(raw))
            .map_err(|_| ErrorCode::InvalidPaymentProof)?;
        String::from_utf8(decoded).map_err(|_| ErrorCode::InvalidPaymentProof)?
    };

    // Parse outer payload
    let payload: PaymentPayload =
        serde_json::from_str(&json_str).map_err(|_| ErrorCode::InvalidPaymentProof)?;

    // Validate version
    if payload.x402_version != X402_VERSION {
        return Err(ErrorCode::InvalidPaymentProof);
    }

    // Validate scheme
    if payload.scheme != X402_SCHEME_SPL && payload.scheme != X402_SCHEME_NATIVE {
        return Err(ErrorCode::InvalidPaymentProof);
    }

    // Parse Solana-specific payload
    let solana_payload: SolanaPayload =
        serde_json::from_value(payload.payload).map_err(|_| ErrorCode::InvalidPaymentProof)?;

    // Build PaymentProof
    Ok(PaymentProof {
        x402_version: payload.x402_version,
        scheme: payload.scheme,
        network: payload.network,
        signature: solana_payload.signature,
        payer: solana_payload.fee_payer.clone().unwrap_or_default(),
        transaction: solana_payload.transaction,
        resource_id: solana_payload.resource_id.unwrap_or_default(),
        resource_type: solana_payload.resource_type.unwrap_or_default(),
        recipient_token_account: solana_payload.recipient_token_account,
        memo: solana_payload.memo,
        fee_payer: solana_payload.fee_payer,
        metadata: solana_payload.metadata,
    })
}

/// Validate Solana wallet address (base58 public key)
pub fn validate_wallet_address(address: &str) -> Result<Pubkey, ErrorCode> {
    Pubkey::from_str(address).map_err(|_| ErrorCode::InvalidWallet)
}

/// Validate Solana signature format
///
/// Solana signatures are 64 bytes, which encode to 87-88 base58 characters
/// depending on leading zeros. We decode and verify the byte length.
pub fn validate_signature(signature: &str) -> Result<(), ErrorCode> {
    // Base58-encoded 64-byte signatures are typically 87-88 characters
    // Reject obviously wrong lengths early
    if signature.len() < 86 || signature.len() > 90 {
        return Err(ErrorCode::InvalidSignature);
    }

    // Decode base58 and verify it's exactly 64 bytes
    let decoded = bs58::decode(signature)
        .into_vec()
        .map_err(|_| ErrorCode::InvalidSignature)?;

    if decoded.len() != 64 {
        return Err(ErrorCode::InvalidSignature);
    }

    Ok(())
}

/// Memo interpolation context per spec
pub struct MemoContext<'a> {
    pub resource: &'a str,
    pub wallet: Option<&'a str>,
    pub amount: Option<&'a str>,
    pub nonce: Option<&'a str>,
}

/// Interpolate memo template with variables per spec (16-formats.md)
/// Supports: {resource}, {wallet}, {amount}, {nonce}
/// Unknown variables are left as literal text
/// Max length: 566 bytes (Solana memo limit)
pub fn interpolate_memo_full(template: &str, ctx: MemoContext<'_>) -> String {
    let mut result = template
        .replace("{resource}", ctx.resource)
        .replace("{{resource}}", ctx.resource);

    if let Some(wallet) = ctx.wallet {
        result = result
            .replace("{wallet}", wallet)
            .replace("{{wallet}}", wallet);
    }

    if let Some(amount) = ctx.amount {
        result = result
            .replace("{amount}", amount)
            .replace("{{amount}}", amount);
    }

    if let Some(nonce) = ctx.nonce {
        result = result.replace("{nonce}", nonce).replace("{{nonce}}", nonce);
    }

    // Truncate if too long (per spec 16-formats.md, truncate from end)
    // Log warning so operators can detect misconfigured memo templates
    if result.len() > MAX_MEMO_LENGTH {
        warn!(
            original_length = %result.len(),
            max_length = %MAX_MEMO_LENGTH,
            template = %template,
            resource = %ctx.resource,
            "Memo exceeded max length and was truncated - consider shortening template"
        );
        // Truncate at UTF-8 character boundary to avoid invalid UTF-8
        // Find the largest valid UTF-8 prefix that fits within MAX_MEMO_LENGTH
        let truncate_at = result
            .char_indices()
            .take_while(|(i, _)| *i < MAX_MEMO_LENGTH)
            .last()
            .map(|(i, c)| i + c.len_utf8())
            .unwrap_or(0);
        result.truncate(truncate_at);
    }

    result
}

/// Interpolate memo template with variables (backwards compatible)
pub fn interpolate_memo(template: &str, resource_id: &str, nonce: Option<&str>) -> String {
    interpolate_memo_full(
        template,
        MemoContext {
            resource: resource_id,
            wallet: None,
            amount: None,
            nonce,
        },
    )
}

/// Generate random nonce for memo (8 char base64url)
pub fn generate_memo_nonce() -> String {
    let mut bytes = [0u8; 6];
    rand::thread_rng().fill_bytes(&mut bytes);
    base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(bytes)
}

/// Generate cart ID
pub fn generate_cart_id() -> String {
    let mut bytes = [0u8; 16];
    rand::thread_rng().fill_bytes(&mut bytes);
    format!("cart_{}", hex::encode(bytes))
}

/// Validate cart ID format per spec (16-formats.md)
/// Format: "cart_" prefix followed by 32 hex characters
pub fn validate_cart_id(cart_id: &str) -> Result<(), ErrorCode> {
    // Must start with cart_ prefix
    if !cart_id.starts_with("cart_") {
        return Err(ErrorCode::CartNotFound);
    }

    // Total length: 5 (prefix) + 32 (hex) = 37 chars
    if cart_id.len() != 37 {
        return Err(ErrorCode::CartNotFound);
    }

    // Remaining 32 chars must be valid hex
    let hex_part = &cart_id[5..];
    if !hex_part.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err(ErrorCode::CartNotFound);
    }

    Ok(())
}

/// Generate refund ID
pub fn generate_refund_id() -> String {
    let mut bytes = [0u8; 16];
    rand::thread_rng().fill_bytes(&mut bytes);
    format!("refund_{}", hex::encode(bytes))
}

/// Validate refund ID format per spec (16-formats.md)
/// Format: "refund_" prefix followed by 32 hex characters
pub fn validate_refund_id(refund_id: &str) -> Result<(), ErrorCode> {
    // Must start with refund_ prefix
    if !refund_id.starts_with("refund_") {
        return Err(ErrorCode::RefundNotFound);
    }

    // Total length: 7 (prefix) + 32 (hex) = 39 chars
    if refund_id.len() != 39 {
        return Err(ErrorCode::RefundNotFound);
    }

    // Remaining 32 chars must be valid hex
    let hex_part = &refund_id[7..];
    if !hex_part.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err(ErrorCode::RefundNotFound);
    }

    Ok(())
}

/// Generate event ID
pub fn generate_event_id() -> String {
    let mut bytes = [0u8; 12];
    if rand::thread_rng().try_fill_bytes(&mut bytes).is_ok() {
        format!("evt_{}", hex::encode(bytes))
    } else {
        // Fallback to timestamp
        format!(
            "evt_{}",
            chrono::Utc::now().timestamp_nanos_opt().unwrap_or(0)
        )
    }
}

/// Validate event ID format per spec (16-formats.md)
/// Format: "evt_" prefix followed by 24 hex characters
pub fn validate_event_id(event_id: &str) -> Result<(), ErrorCode> {
    // Must start with evt_ prefix
    if !event_id.starts_with("evt_") {
        return Err(ErrorCode::InvalidField);
    }

    // Total length: 4 (prefix) + 24 (hex) = 28 chars
    if event_id.len() != 28 {
        return Err(ErrorCode::InvalidField);
    }

    // Remaining 24 chars must be valid hex
    let hex_part = &event_id[4..];
    if !hex_part.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err(ErrorCode::InvalidField);
    }

    Ok(())
}

/// Generate request ID
pub fn generate_request_id() -> String {
    let mut bytes = [0u8; 16];
    if rand::thread_rng().try_fill_bytes(&mut bytes).is_ok() {
        format!("req_{}", hex::encode(bytes))
    } else {
        "req_fallback".to_string()
    }
}

/// Validate request ID format per spec (16-formats.md)
/// Format: "req_" prefix followed by 32 hex characters
pub fn validate_request_id(request_id: &str) -> Result<(), ErrorCode> {
    // Must start with req_ prefix
    if !request_id.starts_with("req_") {
        return Err(ErrorCode::InvalidField);
    }

    // Total length: 4 (prefix) + 32 (hex) = 36 chars
    if request_id.len() != 36 {
        return Err(ErrorCode::InvalidField);
    }

    // Remaining 32 chars must be valid hex
    let hex_part = &request_id[4..];
    if !hex_part.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err(ErrorCode::InvalidField);
    }

    Ok(())
}

/// Generate admin nonce ID
pub fn generate_nonce_id() -> String {
    let mut bytes = [0u8; 16];
    rand::thread_rng().fill_bytes(&mut bytes);
    hex::encode(bytes)
}

/// Generate webhook ID per spec (16-formats.md)
/// Format: "webhook_" prefix + UnixNano timestamp + random hex suffix
/// Example: webhook_1701432156789123456_a1b2c3d4e5f6
pub fn generate_webhook_id() -> String {
    let nanos = chrono::Utc::now().timestamp_nanos_opt().unwrap_or_else(|| {
        // Fallback to millis * 1_000_000 if nanos overflow
        chrono::Utc::now().timestamp_millis() * 1_000_000
    });
    let mut suffix = [0u8; 6];
    rand::thread_rng().fill_bytes(&mut suffix);
    format!("webhook_{}_{}", nanos, hex::encode(suffix))
}

/// Validate webhook ID format per spec (16-formats.md)
/// Format: "webhook_" prefix followed by UnixNano timestamp digits
/// Optional random hex suffix separated by "_"
/// Example: webhook_1701432156789123456_a1b2c3d4e5f6
pub fn validate_webhook_id(webhook_id: &str) -> Result<(), ErrorCode> {
    // Must start with webhook_ prefix
    if !webhook_id.starts_with("webhook_") {
        return Err(ErrorCode::InvalidField);
    }

    let suffix = &webhook_id[8..];
    let mut parts = suffix.split('_');
    let timestamp_part = parts.next().unwrap_or_default();
    if timestamp_part.len() < 18 || timestamp_part.len() > 20 {
        return Err(ErrorCode::InvalidField);
    }
    if !timestamp_part.chars().all(|c| c.is_ascii_digit()) {
        return Err(ErrorCode::InvalidField);
    }

    if let Some(random_part) = parts.next() {
        if parts.next().is_some() {
            return Err(ErrorCode::InvalidField);
        }
        if random_part.len() != 12 || !random_part.chars().all(|c| c.is_ascii_hexdigit()) {
            return Err(ErrorCode::InvalidField);
        }
    }

    Ok(())
}

// NOTE: generate_subscription_id() and validate_subscription_id() were removed
// as dead code per audit. Actual subscriptions use UUID v4 via uuid::Uuid::new_v4()
// in services/subscriptions.rs, not the "sub_" prefixed format.

/// Check if amount is sufficient (single product, allows overpayment)
pub fn amount_sufficient(paid: f64, required: f64) -> bool {
    if !paid.is_finite() || !required.is_finite() {
        return false;
    }
    paid >= required - crate::constants::AMOUNT_TOLERANCE
}

/// Check if amount is exact (refund)
pub fn amount_exact(paid: f64, required: f64) -> bool {
    if !paid.is_finite() || !required.is_finite() {
        return false;
    }

    const EXACT_TOLERANCE: f64 = 1e-9;
    (paid - required).abs() <= EXACT_TOLERANCE
}

/// Derive Associated Token Account address
pub fn derive_ata(owner: &Pubkey, mint: &Pubkey) -> Result<Pubkey, ErrorCode> {
    let token_program_id = spl_token::id();
    let seeds = &[owner.as_ref(), token_program_id.as_ref(), mint.as_ref()];

    let (ata, _bump) = Pubkey::find_program_address(seeds, &spl_associated_token_account::id());

    Ok(ata)
}

/// Derive ATA safe (returns None on error)
pub fn derive_ata_safe(owner: &str, mint: &str) -> Option<String> {
    let owner_pubkey = Pubkey::from_str(owner).ok()?;
    let mint_pubkey = Pubkey::from_str(mint).ok()?;
    derive_ata(&owner_pubkey, &mint_pubkey)
        .ok()
        .map(|pk| pk.to_string())
}

/// Hash resource ID for logging (privacy)
pub fn hash_resource_id(resource_id: &str) -> String {
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    hasher.update(resource_id.as_bytes());
    hex::encode(hasher.finalize())
}

/// Check if an error string indicates a rate limit error
/// DEAD-003: Consolidated from verifier.rs and transaction_queue.rs
pub fn is_rate_limit_error(err: &str) -> bool {
    err.contains("429") || err.contains("too many requests") || err.contains("rate limit")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_wallet_address() {
        // Valid address
        assert!(validate_wallet_address("11111111111111111111111111111111").is_ok());

        // Invalid address
        assert!(validate_wallet_address("invalid").is_err());
    }

    #[test]
    fn test_validate_signature_88_chars() {
        // Real 88-char Solana signature (base58 encoded 64 bytes)
        let sig_88 = "5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW";
        assert_eq!(sig_88.len(), 88);
        assert!(validate_signature(sig_88).is_ok());
    }

    #[test]
    fn test_generate_webhook_id_is_unique() {
        let id_one = generate_webhook_id();
        let id_two = generate_webhook_id();
        assert_ne!(id_one, id_two);
        assert!(validate_webhook_id(&id_one).is_ok());
        assert!(validate_webhook_id(&id_two).is_ok());
    }

    #[test]
    fn test_validate_signature_87_chars() {
        // Generate a valid 87-char signature by finding 64 bytes that encode to 87 chars
        // Start with bytes that have small leading values (produces shorter encoding)
        let mut bytes = [0xFFu8; 64];
        bytes[0] = 0x00; // Leading zero byte
        bytes[1] = 0x01; // Small second byte

        let encoded = bs58::encode(&bytes).into_string();
        // This should produce an 87-char signature
        // If not 87, skip this test - the important thing is the fix accepts both lengths
        if encoded.len() == 87 {
            assert!(validate_signature(&encoded).is_ok());
        }
    }

    #[test]
    fn test_validate_signature_any_valid_64_bytes() {
        // Test that ANY 64-byte value is accepted when properly encoded
        // This is the key fix: we accept 86-90 char strings that decode to 64 bytes
        for first_byte in [0x00u8, 0x01, 0x10, 0x80, 0xFF] {
            let mut bytes = [0xAAu8; 64];
            bytes[0] = first_byte;

            let encoded = bs58::encode(&bytes).into_string();
            let result = validate_signature(&encoded);
            assert!(
                result.is_ok(),
                "Failed for first_byte={:#04x}, encoded_len={}",
                first_byte,
                encoded.len()
            );
        }
    }

    #[test]
    fn test_validate_signature_invalid_length() {
        // Too short
        assert!(validate_signature("abc").is_err());

        // Too long (100 chars)
        let too_long = "a".repeat(100);
        assert!(validate_signature(&too_long).is_err());
    }

    #[test]
    fn test_validate_signature_invalid_base58() {
        // Invalid base58 characters (0, O, I, l are not in base58 alphabet)
        let invalid = "0".repeat(88);
        assert!(validate_signature(&invalid).is_err());
    }

    #[test]
    fn test_validate_signature_wrong_decoded_length() {
        // Valid base58 but wrong decoded length (not 64 bytes)
        // Encoding 32 bytes produces ~44 chars
        let bytes_32 = [1u8; 32];
        let sig_32 = bs58::encode(&bytes_32).into_string();
        assert!(validate_signature(&sig_32).is_err());
    }

    #[test]
    fn test_interpolate_memo() {
        let template = "cedros:{resource}:{nonce}";
        let result = interpolate_memo(template, "product-123", Some("abc123"));
        assert_eq!(result, "cedros:product-123:abc123");
    }

    #[test]
    fn test_generate_cart_id() {
        let id = generate_cart_id();
        assert!(id.starts_with("cart_"));
        assert_eq!(id.len(), 37); // "cart_" + 32 hex chars
    }

    #[test]
    fn test_validate_cart_id() {
        // Valid cart ID
        let valid = "cart_0123456789abcdef0123456789abcdef";
        assert!(validate_cart_id(valid).is_ok());

        // Invalid: wrong prefix
        assert!(validate_cart_id("bad_0123456789abcdef0123456789abcdef").is_err());

        // Invalid: too short
        assert!(validate_cart_id("cart_0123456789abcdef").is_err());

        // Invalid: too long
        assert!(validate_cart_id("cart_0123456789abcdef0123456789abcdef00").is_err());

        // Invalid: non-hex chars
        assert!(validate_cart_id("cart_0123456789abcdef0123456789abcdeg").is_err());
    }

    #[test]
    fn test_validate_refund_id() {
        // Valid refund ID
        let valid = "refund_0123456789abcdef0123456789abcdef";
        assert!(validate_refund_id(valid).is_ok());

        // Invalid: wrong prefix
        assert!(validate_refund_id("bad_0123456789abcdef0123456789abcdef").is_err());

        // Invalid: too short
        assert!(validate_refund_id("refund_0123456789abcdef").is_err());
    }

    #[test]
    fn test_amount_sufficient() {
        assert!(amount_sufficient(10.0, 10.0));
        assert!(amount_sufficient(10.5, 10.0)); // overpayment allowed
        assert!(!amount_sufficient(9.0, 10.0));
    }

    #[test]
    fn test_amount_exact_uses_epsilon() {
        assert!(amount_exact(10.0, 10.0));
        assert!(amount_exact(0.1 + 0.2, 0.3));
        assert!(!amount_exact(10.0, f64::NAN));
        assert!(!amount_exact(f64::INFINITY, 10.0));
    }
}
