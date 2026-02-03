//! Stablecoin validation for Solana token mints
//!
//! This module validates that configured token mints are known stablecoins.
//! Using non-stablecoin tokens (SOL, BONK, etc.) will cause pricing issues
//! because the system rounds to 2 decimal places assuming a $1 peg.
//!
//! # Network Support
//!
//! This module supports both mainnet and devnet stablecoins:
//!
//! **Mainnet stablecoins:**
//! - USDC: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
//! - USDT: `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB`
//! - PYUSD: `2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo`
//! - CASH: `CASHx9KJUStyftLFWGvEVf59SGeG9sh5FfcnZMVPCASH`
//!
//! **Devnet stablecoins (for testing):**
//! - USDC-Dev: `Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr`
//! - USDC-Dev (Circle faucet): `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`

use std::collections::HashMap;

use once_cell::sync::Lazy;

/// Known stablecoin mint addresses mapped to their symbols.
/// These are the ONLY tokens that should be used for payments.
/// Includes both mainnet and devnet addresses.
///
/// WARNING: Using non-stablecoin tokens will cause:
/// - Incorrect pricing (1 SOL ≠ $1, 1 BONK ≠ $1)
/// - Precision loss from improper rounding
/// - Potential payment failures
pub static KNOWN_STABLECOINS: Lazy<HashMap<&'static str, &'static str>> = Lazy::new(|| {
    let mut m = HashMap::new();
    // Mainnet stablecoins
    m.insert("CASHx9KJUStyftLFWGvEVf59SGeG9sh5FfcnZMVPCASH", "CASH"); // CASH stablecoin (mainnet)
    m.insert("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", "USDC"); // USDC (mainnet)
    m.insert("Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", "USDT"); // USDT (mainnet)
    m.insert("2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo", "PYUSD"); // PayPal USD (mainnet)
                                                                       // Devnet stablecoins (for testing)
    m.insert("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr", "USDC-Dev"); // USDC-Dev (devnet)
    m.insert("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU", "USDC-Dev"); // USDC-Dev Circle faucet (devnet)
    m
});

/// Reverse lookup: symbol -> mint address for O(1) lookups
/// Note: For symbols with multiple networks, this returns the mainnet address.
/// Use `get_mint_for_symbol_on_network` for network-specific lookups.
static SYMBOL_TO_MINT: Lazy<HashMap<&'static str, &'static str>> = Lazy::new(|| {
    let mut m = HashMap::new();
    // Mainnet addresses (default)
    m.insert("CASH", "CASHx9KJUStyftLFWGvEVf59SGeG9sh5FfcnZMVPCASH");
    m.insert("USDC", "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
    m.insert("USDT", "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB");
    m.insert("PYUSD", "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo");
    // Devnet addresses
    m.insert("USDC-Dev", "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr");
    m
});

/// Validates that a token mint address is a known stablecoin.
/// Returns the stablecoin symbol if valid, or an error message if not.
///
/// # Why this matters
/// - Typo in token mint = payments go to wrong token = permanent loss
/// - Non-stablecoins have unpredictable values (1 SOL ≠ $1, 1 BONK ≠ $1)
/// - System rounds to 2 decimal places assuming $1 peg
pub fn validate_stablecoin_mint(mint_address: &str) -> Result<&'static str, String> {
    match KNOWN_STABLECOINS.get(mint_address) {
        Some(symbol) => Ok(symbol),
        None => Err(format!(
            r#"token mint {} is not a recognized stablecoin

⚠️  WARNING: Only stablecoins are supported for payments!

The system rounds all amounts to 2 decimal places (cents) assuming a $1 peg.
Using non-stablecoin tokens (SOL, BONK, etc.) will cause:
  - Incorrect pricing (1 SOL ≠ $1, 1 BONK ≠ $1)
  - Precision loss from improper rounding
  - Potential payment failures

Supported stablecoins (mainnet):
  - USDC: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
  - USDT: Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB
  - PYUSD: 2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo
  - CASH: CASHx9KJUStyftLFWGvEVf59SGeG9sh5FfcnZMVPCASH

Supported stablecoins (devnet):
  - USDC-Dev: Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr
  - USDC-Dev (Circle faucet): 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"#,
            mint_address
        )),
    }
}

/// Returns true if the mint address is a known stablecoin.
pub fn is_stablecoin(mint_address: &str) -> bool {
    KNOWN_STABLECOINS.contains_key(mint_address)
}

/// Returns the symbol for a stablecoin mint address, or None if not recognized.
pub fn get_stablecoin_symbol(mint_address: &str) -> Option<&'static str> {
    KNOWN_STABLECOINS.get(mint_address).copied()
}

/// Returns the mint address for a stablecoin symbol, or None if not found.
/// Uses O(1) HashMap lookup instead of O(n) iteration.
pub fn get_mint_for_symbol(symbol: &str) -> Option<&'static str> {
    SYMBOL_TO_MINT.get(symbol).copied()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_usdc() {
        let result = validate_stablecoin_mint("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "USDC");
    }

    #[test]
    fn test_validate_unknown_token() {
        let result = validate_stablecoin_mint("SomeRandomTokenMintAddress12345");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("not a recognized stablecoin"));
    }

    #[test]
    fn test_is_stablecoin() {
        assert!(is_stablecoin(
            "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
        ));
        assert!(!is_stablecoin("NotAStablecoin"));
    }

    #[test]
    fn test_get_mint_for_symbol() {
        assert_eq!(
            get_mint_for_symbol("USDC"),
            Some("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")
        );
        assert_eq!(get_mint_for_symbol("UNKNOWN"), None);
    }

    #[test]
    fn test_validate_usdc_devnet() {
        // USDC-Dev on devnet
        let result = validate_stablecoin_mint("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr");
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "USDC-Dev");

        // Circle faucet USDC-Dev on devnet
        let result2 = validate_stablecoin_mint("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
        assert!(result2.is_ok());
        assert_eq!(result2.unwrap(), "USDC-Dev");
    }

    #[test]
    fn test_get_mint_for_symbol_devnet() {
        assert_eq!(
            get_mint_for_symbol("USDC-Dev"),
            Some("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr")
        );
    }
}
