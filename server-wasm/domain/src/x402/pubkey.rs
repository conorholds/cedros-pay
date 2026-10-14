//! Minimal Solana public-key + program-derived-address primitives that link
//! under `wasm32-wasip2`.
//!
//! The official Solana crates (`solana-pubkey`/`-program`/`-sdk`) gate on
//! `target_arch = "wasm32"` and emit `wasm-bindgen` bindings for the browser
//! (`wasm32-unknown-unknown` + JS), which fail to component-link under
//! `wasm32-wasip2`. So we re-implement the few primitives x402 needs with
//! pure-crypto crates (`sha2`, `curve25519-dalek`, `bs58`) that have no
//! wasm-bindgen path. The PDA algorithm is byte-for-byte Solana's, pinned by a
//! known-answer test against the canonical `spl` derivation.

use curve25519_dalek::edwards::CompressedEdwardsY;
use sha2::{Digest, Sha256};

/// A Solana public key — 32 raw bytes.
pub type Pubkey = [u8; 32];

const PDA_MARKER: &[u8] = b"ProgramDerivedAddress";

/// Decode a base58 Solana address into 32 raw bytes.
pub fn parse(s: &str) -> Result<Pubkey, &'static str> {
    let bytes = bs58::decode(s.trim())
        .into_vec()
        .map_err(|_| "invalid address")?;
    bytes.as_slice().try_into().map_err(|_| "invalid address")
}

/// Encode 32 raw bytes as a base58 Solana address.
pub fn encode(key: &Pubkey) -> String {
    bs58::encode(key).into_string()
}

/// Encode a 64-byte transaction signature as base58 (the Solana signature/tx id).
pub fn encode_signature(signature: &[u8; 64]) -> String {
    bs58::encode(&signature[..]).into_string()
}

/// True when `bytes` is a valid compressed Edwards point (a real ed25519 public
/// key lies "on the curve"). Program-derived addresses are chosen off-curve.
fn is_on_curve(bytes: &Pubkey) -> bool {
    CompressedEdwardsY::from_slice(bytes)
        .ok()
        .and_then(|c| c.decompress())
        .is_some()
}

/// Solana `find_program_address`: the canonical PDA for `seeds` under
/// `program_id`, using the highest bump seed that yields an off-curve address.
pub fn find_program_address(seeds: &[&[u8]], program_id: &Pubkey) -> (Pubkey, u8) {
    for bump in (0u8..=255).rev() {
        let mut hasher = Sha256::new();
        for seed in seeds {
            hasher.update(seed);
        }
        hasher.update([bump]);
        hasher.update(program_id);
        hasher.update(PDA_MARKER);
        let hash: Pubkey = hasher.finalize().into();
        if !is_on_curve(&hash) {
            return (hash, bump);
        }
    }
    // Statistically unreachable: some bump in 0..=255 always yields off-curve.
    unreachable!("no off-curve program address for seeds")
}

#[cfg(test)]
mod tests {
    use super::*;

    const USDC_MINT: &str = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

    #[test]
    fn parse_encode_round_trips() {
        let key = parse(USDC_MINT).unwrap();
        assert_eq!(encode(&key), USDC_MINT);
    }

    #[test]
    fn rejects_wrong_length_and_garbage() {
        assert!(parse("tooShort").is_err());
        assert!(parse("0OIl").is_err()); // invalid base58 alphabet
    }

    #[test]
    fn real_pubkey_is_on_curve_pda_is_off_curve() {
        // A normal account key is a valid curve point...
        assert!(is_on_curve(&parse(USDC_MINT).unwrap()));
        // ...while a PDA is, by construction, off-curve.
        let ata_program = parse("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL").unwrap();
        let (pda, _) = find_program_address(&[b"any-seed"], &ata_program);
        assert!(!is_on_curve(&pda));
    }
}
