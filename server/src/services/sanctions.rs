//! Sanctions and jurisdiction enforcement.
//!
//! Static lists of OFAC-designated Solana wallet addresses and blocked
//! jurisdictions. These must be manually updated as OFAC publishes new
//! designations. A future enhancement could fetch from an API.

/// OFAC-designated Solana wallet addresses (Tornado Cash, Blender.io, etc.).
///
/// Sources:
/// - <https://home.treasury.gov/policy-issues/financial-sanctions/specially-designated-nationals-and-blocked-persons-list-sdn-human-readable-lists>
/// - <https://www.chainalysis.com/blog/ofac-sanction-solana-addresses/>
const SANCTIONED_WALLETS: &[&str] = &[
    // Blender.io
    "FW3g7yRSFCVPJsiBaKFbuiCfGHPPCKqBjP2rMXkmCjBr",
    // Known OFAC-listed Solana addresses (illustrative — update from SDN list)
];

/// ISO 3166-1 alpha-2 codes under OFAC comprehensive sanctions.
const BLOCKED_JURISDICTIONS: &[&str] = &[
    "KP", // North Korea
    "IR", // Iran
    "SY", // Syria
    "CU", // Cuba
];

/// Returns `true` if the wallet address is on the OFAC sanctions list.
pub fn is_sanctioned(wallet: &str) -> bool {
    SANCTIONED_WALLETS.iter().any(|&w| w == wallet)
}

/// Returns `true` if the country code is in the global blocked jurisdictions list.
pub fn is_blocked_jurisdiction(country_code: &str) -> bool {
    let upper = country_code.to_uppercase();
    BLOCKED_JURISDICTIONS.iter().any(|&c| c == upper)
}

/// Returns `true` if a tokenized asset with `allowed_jurisdictions` permits the
/// given country. An empty `allowed_jurisdictions` list means all non-blocked
/// jurisdictions are permitted.
pub fn is_allowed_for_asset(country_code: &str, allowed_jurisdictions: &[String]) -> bool {
    if allowed_jurisdictions.is_empty() {
        return true;
    }
    let upper = country_code.to_uppercase();
    allowed_jurisdictions.iter().any(|j| j.to_uppercase() == upper)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sanctioned_wallet_detected() {
        assert!(is_sanctioned(
            "FW3g7yRSFCVPJsiBaKFbuiCfGHPPCKqBjP2rMXkmCjBr"
        ));
    }

    #[test]
    fn clean_wallet_not_sanctioned() {
        assert!(!is_sanctioned("11111111111111111111111111111111"));
    }

    #[test]
    fn blocked_jurisdictions() {
        assert!(is_blocked_jurisdiction("KP"));
        assert!(is_blocked_jurisdiction("ir")); // case-insensitive
        assert!(!is_blocked_jurisdiction("US"));
    }

    #[test]
    fn allowed_for_asset_empty_list() {
        assert!(is_allowed_for_asset("US", &[]));
    }

    #[test]
    fn allowed_for_asset_matching() {
        let allowed = vec!["US".to_string(), "CA".to_string()];
        assert!(is_allowed_for_asset("US", &allowed));
        assert!(is_allowed_for_asset("ca", &allowed)); // case-insensitive
        assert!(!is_allowed_for_asset("GB", &allowed));
    }
}
