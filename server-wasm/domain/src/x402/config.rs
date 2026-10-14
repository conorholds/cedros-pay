//! Operator x402 settings, read through the `settings` seam.
//!
//! Mirrors how `routes::admin_config` persists the `x402` category: each key is
//! stored under `x402.{key}` (string values stored raw, others as JSON). These
//! readers decode identically and apply safe defaults.

use serde_json::Value;

use crate::seams::HostSeams;

pub const MAINNET_USDC_MINT: &str = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
pub const DEVNET_USDC_MINT: &str = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
pub const USDC_DECIMALS: u8 = 6;

/// Reject a token advertised as USDC unless its cluster, canonical mint, and
/// precision agree. Other explicitly named assets remain supported.
pub fn validate_payment_asset(
    network: &str,
    mint: &str,
    decimals: u8,
    symbol: Option<&str>,
) -> Result<(), &'static str> {
    let claims_usdc = symbol.is_some_and(|value| value.trim().eq_ignore_ascii_case("USDC"))
        || mint == MAINNET_USDC_MINT
        || mint == DEVNET_USDC_MINT;
    if !claims_usdc {
        return Ok(());
    }
    let expected_mint = match network {
        "solana" | "mainnet-beta" => MAINNET_USDC_MINT,
        "devnet" => DEVNET_USDC_MINT,
        _ => return Err("USDC is not supported on the configured Solana network"),
    };
    if mint != expected_mint || decimals != USDC_DECIMALS {
        return Err("configured USDC mint or decimals do not match the Solana network");
    }
    Ok(())
}

fn read<S: HostSeams>(seams: &S, key: &str) -> Option<Value> {
    let raw = seams.setting_get(&format!("x402.{key}")).ok().flatten()?;
    Some(serde_json::from_str(&raw).unwrap_or(Value::String(raw)))
}

fn read_string<S: HostSeams>(seams: &S, key: &str) -> Option<String> {
    read(seams, key)
        .and_then(|v| v.as_str().map(str::to_string))
        .filter(|s| !s.trim().is_empty())
}

/// Whether the operator has enabled the x402 rail.
pub fn enabled<S: HostSeams>(seams: &S) -> bool {
    read(seams, "enabled")
        .and_then(|v| v.as_bool())
        .unwrap_or(false)
}

/// The recipient wallet (owner) that receives x402 payments.
pub fn payment_address<S: HostSeams>(seams: &S) -> Option<String> {
    read_string(seams, "payment_address")
}

/// The accepted SPL mint (e.g. USDC).
pub fn token_mint<S: HostSeams>(seams: &S) -> Option<String> {
    read_string(seams, "token_mint")
}

/// The x402 network label advertised in the quote (default "solana").
pub fn network<S: HostSeams>(seams: &S) -> String {
    read_string(seams, "network").unwrap_or_else(|| "solana".to_string())
}

/// Whether gasless co-signing is enabled (the server pays the SOL fee so buyers
/// without SOL can still pay). Off by default.
pub fn gasless_enabled<S: HostSeams>(seams: &S) -> bool {
    read(seams, "gasless_enabled")
        .and_then(|v| v.as_bool())
        .unwrap_or(false)
}

/// The token's display symbol (e.g. "USDC"), if the operator set one.
pub fn token_symbol<S: HostSeams>(seams: &S) -> Option<String> {
    read_string(seams, "token_symbol")
}

/// The mint's decimal precision (default 6, USDC).
pub fn token_decimals<S: HostSeams>(seams: &S) -> u8 {
    read(seams, "token_decimals")
        .and_then(|v| {
            v.as_u64()
                .or_else(|| v.as_str().and_then(|s| s.parse().ok()))
        })
        .unwrap_or(6)
        .min(u8::MAX as u64) as u8
}

/// Helper: read a numeric `x402.{key}` setting (accepts a JSON number or string),
/// clamped to `[0, max]`, defaulting to `default`.
fn read_u64<S: HostSeams>(seams: &S, key: &str, default: u64, max: u64) -> u64 {
    read(seams, key)
        .and_then(|v| {
            v.as_u64()
                .or_else(|| v.as_str().and_then(|s| s.parse().ok()))
        })
        .unwrap_or(default)
        .min(max)
}

/// Compute-unit limit for server-built transactions (refunds). Default 200_000 —
/// ample for an idempotent ATA create plus an SPL transfer. Operator-settable via the
/// admin `x402.compute_unit_limit` key.
pub fn compute_unit_limit<S: HostSeams>(seams: &S) -> u32 {
    read_u64(seams, "compute_unit_limit", 200_000, u32::MAX as u64) as u32
}

/// Compute-unit price (priority fee) in micro-lamports for server-built transactions.
/// Default 0 (no priority fee — the operator opts in to one). Operator-settable via
/// the admin `x402.compute_unit_price_micro_lamports` key.
pub fn compute_unit_price<S: HostSeams>(seams: &S) -> u64 {
    read_u64(seams, "compute_unit_price_micro_lamports", 0, u64::MAX)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::fake::FakeSeams;

    #[test]
    fn reads_string_and_numeric_settings_with_defaults() {
        let s = FakeSeams::new();
        assert_eq!(token_decimals(&s), 6);
        assert!(!enabled(&s));

        s.set_setting("x402.token_decimals", "9");
        s.set_setting("x402.enabled", "true");
        assert_eq!(token_decimals(&s), 9);
        assert!(enabled(&s));
    }

    #[test]
    fn reads_gasless_config() {
        let s = FakeSeams::new();
        assert!(!gasless_enabled(&s));

        s.set_setting("x402.gasless_enabled", "true");
        assert!(gasless_enabled(&s));
    }

    #[test]
    fn usdc_identity_is_cluster_and_precision_bound() {
        assert!(validate_payment_asset("mainnet-beta", MAINNET_USDC_MINT, 6, Some("USDC")).is_ok());
        assert!(validate_payment_asset("devnet", DEVNET_USDC_MINT, 6, Some("usdc")).is_ok());
        assert!(validate_payment_asset("devnet", MAINNET_USDC_MINT, 6, Some("USDC")).is_err());
        assert!(
            validate_payment_asset("mainnet-beta", MAINNET_USDC_MINT, 9, Some("USDC")).is_err()
        );
        assert!(validate_payment_asset(
            "mainnet-beta",
            "So11111111111111111111111111111111111111112",
            6,
            Some("USDC")
        )
        .is_err());
    }
}
