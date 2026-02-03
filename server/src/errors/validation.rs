//! Input validation utilities for API request parameters
//!
//! Provides centralized validation for common input types to prevent:
//! - Injection attacks (SQL, NoSQL, command injection)
//! - Excessively long inputs that could cause DoS
//! - Malformed data that could cause unexpected behavior

use once_cell::sync::Lazy;
use regex::Regex;

/// Maximum length for resource identifiers
const MAX_RESOURCE_ID_LENGTH: usize = 256;

/// Maximum length for coupon codes
const MAX_COUPON_CODE_LENGTH: usize = 64;

/// Maximum length for email addresses (per RFC 5321)
const MAX_EMAIL_LENGTH: usize = 254;

/// Pattern for safe identifiers: alphanumeric, underscore, hyphen, colon, forward slash
/// Allows paths like "product/premium" or "tier:gold"
static SAFE_IDENTIFIER_PATTERN: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^[a-zA-Z0-9_\-:/]+$").expect("valid regex pattern"));

/// Pattern for coupon codes: alphanumeric, underscore, hyphen (case-insensitive)
static COUPON_CODE_PATTERN: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^[a-zA-Z0-9_\-]+$").expect("valid regex pattern"));

/// Basic email pattern - validates format, not deliverability
static EMAIL_PATTERN: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$")
        .expect("valid regex pattern")
});

/// Validation result with detailed error information
#[derive(Debug, Clone)]
pub struct ValidationError {
    pub field: String,
    pub message: String,
}

impl std::fmt::Display for ValidationError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}: {}", self.field, self.message)
    }
}

/// Validate a resource identifier
///
/// Resource IDs must:
/// - Be non-empty
/// - Be at most 256 characters
/// - Contain only alphanumeric characters, underscores, hyphens, colons, or forward slashes
pub fn validate_resource_id(value: &str) -> Result<(), ValidationError> {
    if value.is_empty() {
        return Err(ValidationError {
            field: "resource".to_string(),
            message: "resource ID cannot be empty".to_string(),
        });
    }

    if value.len() > MAX_RESOURCE_ID_LENGTH {
        return Err(ValidationError {
            field: "resource".to_string(),
            message: format!(
                "resource ID too long (max {} characters)",
                MAX_RESOURCE_ID_LENGTH
            ),
        });
    }

    if !SAFE_IDENTIFIER_PATTERN.is_match(value) {
        return Err(ValidationError {
            field: "resource".to_string(),
            message: "resource ID contains invalid characters".to_string(),
        });
    }

    Ok(())
}

/// Validate a coupon code
///
/// Coupon codes must:
/// - Be non-empty
/// - Be at most 64 characters
/// - Contain only alphanumeric characters, underscores, or hyphens
pub fn validate_coupon_code(value: &str) -> Result<(), ValidationError> {
    if value.is_empty() {
        return Err(ValidationError {
            field: "coupon_code".to_string(),
            message: "coupon code cannot be empty".to_string(),
        });
    }

    if value.len() > MAX_COUPON_CODE_LENGTH {
        return Err(ValidationError {
            field: "coupon_code".to_string(),
            message: format!(
                "coupon code too long (max {} characters)",
                MAX_COUPON_CODE_LENGTH
            ),
        });
    }

    if !COUPON_CODE_PATTERN.is_match(value) {
        return Err(ValidationError {
            field: "coupon_code".to_string(),
            message: "coupon code contains invalid characters".to_string(),
        });
    }

    Ok(())
}

/// Validate an email address
///
/// Email addresses must:
/// - Be non-empty
/// - Be at most 254 characters (per RFC 5321)
/// - Match a basic email format pattern
pub fn validate_email(value: &str) -> Result<(), ValidationError> {
    if value.is_empty() {
        return Err(ValidationError {
            field: "email".to_string(),
            message: "email cannot be empty".to_string(),
        });
    }

    if value.len() > MAX_EMAIL_LENGTH {
        return Err(ValidationError {
            field: "email".to_string(),
            message: format!("email too long (max {} characters)", MAX_EMAIL_LENGTH),
        });
    }

    if !EMAIL_PATTERN.is_match(value) {
        return Err(ValidationError {
            field: "email".to_string(),
            message: "invalid email format".to_string(),
        });
    }

    Ok(())
}

/// Maximum length for redirect URLs
const MAX_REDIRECT_URL_LENGTH: usize = 2048;

/// DNS rebinding domains that resolve to arbitrary IPs
const DNS_REBINDING_DOMAINS: &[&str] = &[
    ".xip.io",
    ".nip.io",
    ".sslip.io",
    ".localtest.me",
    ".lvh.me",
    ".vcap.me",
];

/// Check if an IP address is private/internal (SSRF risk)
fn is_private_ip(ip: &str) -> bool {
    use std::net::{IpAddr, Ipv4Addr, Ipv6Addr};

    // Try parsing as IPv4
    if let Ok(ipv4) = ip.parse::<Ipv4Addr>() {
        return ipv4.is_loopback()           // 127.0.0.0/8
            || ipv4.is_private()             // 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
            || ipv4.is_link_local()          // 169.254.0.0/16
            || ipv4.is_broadcast()           // 255.255.255.255
            || ipv4.is_unspecified()         // 0.0.0.0
            || ipv4.octets()[0] == 0; // 0.0.0.0/8
    }

    // Try parsing as IPv6
    if let Ok(ipv6) = ip.parse::<Ipv6Addr>() {
        return ipv6.is_loopback()           // ::1
            || ipv6.is_unspecified()        // ::
            || is_ipv6_private(&ipv6);
    }

    // Try parsing as general IpAddr (handles both)
    if let Ok(addr) = ip.parse::<IpAddr>() {
        return match addr {
            IpAddr::V4(v4) => is_private_ip(&v4.to_string()),
            IpAddr::V6(v6) => is_private_ip(&v6.to_string()),
        };
    }

    false
}

/// Check if IPv6 address is in private range
fn is_ipv6_private(ip: &std::net::Ipv6Addr) -> bool {
    let segments = ip.segments();
    // fc00::/7 - Unique local addresses
    (segments[0] & 0xfe00) == 0xfc00
        // fe80::/10 - Link-local addresses
        || (segments[0] & 0xffc0) == 0xfe80
        // ::ffff:0:0/96 - IPv4-mapped addresses (check the embedded IPv4)
        || (segments[0] == 0 && segments[1] == 0 && segments[2] == 0
            && segments[3] == 0 && segments[4] == 0 && segments[5] == 0xffff)
}

/// Decode potential IP obfuscation (octal, hex, decimal)
/// Returns the decoded IP if it's an obfuscated form, or None
fn decode_obfuscated_ip(host: &str) -> Option<String> {
    // Check for decimal IP (single large number like 2130706433 = 127.0.0.1)
    if let Ok(num) = host.parse::<u32>() {
        let octets = [
            ((num >> 24) & 0xff) as u8,
            ((num >> 16) & 0xff) as u8,
            ((num >> 8) & 0xff) as u8,
            (num & 0xff) as u8,
        ];
        return Some(format!(
            "{}.{}.{}.{}",
            octets[0], octets[1], octets[2], octets[3]
        ));
    }

    // Check for hex IP (0x7f000001)
    if host.starts_with("0x") || host.starts_with("0X") {
        if let Ok(num) = u32::from_str_radix(&host[2..], 16) {
            let octets = [
                ((num >> 24) & 0xff) as u8,
                ((num >> 16) & 0xff) as u8,
                ((num >> 8) & 0xff) as u8,
                (num & 0xff) as u8,
            ];
            return Some(format!(
                "{}.{}.{}.{}",
                octets[0], octets[1], octets[2], octets[3]
            ));
        }
    }

    // Check for octal notation (0177.0.0.1 or mixed like 0300.0250.0.1)
    // Each octet can be octal (starts with 0), hex (0x), or decimal
    let parts: Vec<&str> = host.split('.').collect();
    if parts.len() == 4 {
        let mut has_octal = false;
        let mut octets = [0u8; 4];
        for (i, part) in parts.iter().enumerate() {
            if let Some(val) = parse_octet(part) {
                octets[i] = val;
                // Check if this was an octal representation
                if part.starts_with('0') && part.len() > 1 && !part.starts_with("0x") {
                    has_octal = true;
                }
            } else {
                return None; // Not a valid IP
            }
        }
        if has_octal {
            return Some(format!(
                "{}.{}.{}.{}",
                octets[0], octets[1], octets[2], octets[3]
            ));
        }
    }

    None
}

/// Parse a single IP octet that might be in octal, hex, or decimal
fn parse_octet(s: &str) -> Option<u8> {
    if s.starts_with("0x") || s.starts_with("0X") {
        // Hex
        u8::from_str_radix(&s[2..], 16).ok()
    } else if s.starts_with('0') && s.len() > 1 {
        // Octal
        u8::from_str_radix(s, 8).ok()
    } else {
        // Decimal
        s.parse().ok()
    }
}

/// Validate a redirect URL for security.
///
/// Redirect URLs must:
/// - Be non-empty
/// - Be at most 2048 characters
/// - Use https:// scheme (http:// allowed only if explicitly enabled)
/// - Not point to internal/private IP ranges (SSRF prevention)
/// - Not use DNS rebinding domains
/// - Not contain dangerous characters
pub fn validate_redirect_url(value: &str) -> Result<(), ValidationError> {
    // Backwards-compatible default: allow http://localhost.
    validate_redirect_url_with_policy(value, true)
}

pub fn validate_redirect_url_with_env(
    value: &str,
    environment: &str,
) -> Result<(), ValidationError> {
    let allow_http_localhost = !environment.eq_ignore_ascii_case("production");
    validate_redirect_url_with_policy(value, allow_http_localhost)
}

fn validate_redirect_url_with_policy(
    value: &str,
    allow_http_localhost: bool,
) -> Result<(), ValidationError> {
    if value.is_empty() {
        return Err(ValidationError {
            field: "url".to_string(),
            message: "redirect URL cannot be empty".to_string(),
        });
    }

    if value.len() > MAX_REDIRECT_URL_LENGTH {
        return Err(ValidationError {
            field: "url".to_string(),
            message: format!(
                "redirect URL too long (max {} characters)",
                MAX_REDIRECT_URL_LENGTH
            ),
        });
    }

    // Block newlines (HTTP header injection) - check early
    if value.contains('\n') || value.contains('\r') {
        return Err(ValidationError {
            field: "url".to_string(),
            message: "redirect URL contains invalid characters".to_string(),
        });
    }

    // Block credential injection (@)
    // Must check before URL parsing since @ is valid in URLs for credentials
    if value.contains('@') {
        return Err(ValidationError {
            field: "url".to_string(),
            message: "redirect URL cannot contain credentials".to_string(),
        });
    }

    // Parse URL to extract host
    let parsed = url::Url::parse(value).map_err(|_| ValidationError {
        field: "url".to_string(),
        message: "invalid URL format".to_string(),
    })?;

    let scheme = parsed.scheme();
    let host = parsed.host().ok_or_else(|| ValidationError {
        field: "url".to_string(),
        message: "URL must have a host".to_string(),
    })?;

    // Check for localhost based on parsed host type
    // Only allow exact localhost addresses (127.0.0.1 and ::1), not the entire loopback range
    // This prevents SSRF attacks using other loopback addresses like 127.0.0.2
    let is_localhost = match &host {
        url::Host::Domain(d) => d.eq_ignore_ascii_case("localhost"),
        url::Host::Ipv4(ip) => *ip == std::net::Ipv4Addr::LOCALHOST, // Only 127.0.0.1
        url::Host::Ipv6(ip) => *ip == std::net::Ipv6Addr::LOCALHOST, // Only ::1
    };

    // Must use https:// (allow http://localhost only when enabled)
    if scheme != "https" && (!allow_http_localhost || scheme != "http" || !is_localhost) {
        return Err(ValidationError {
            field: "url".to_string(),
            message: "redirect URL must use https:// scheme".to_string(),
        });
    }

    // Host string for pattern matching
    let host_str = parsed.host_str().unwrap_or("");
    let lower_host = host_str.to_lowercase();

    // Check for DNS rebinding domains
    for domain in DNS_REBINDING_DOMAINS {
        if lower_host.ends_with(domain) {
            return Err(ValidationError {
                field: "url".to_string(),
                message: "redirect URL uses a DNS rebinding domain".to_string(),
            });
        }
    }

    // Check for private IP addresses (SSRF prevention)
    match &host {
        url::Host::Domain(domain) => {
            // Check for obfuscated IPs in domain-like strings (octal, hex, decimal)
            if let Some(decoded_ip) = decode_obfuscated_ip(domain) {
                if is_private_ip(&decoded_ip) {
                    return Err(ValidationError {
                        field: "url".to_string(),
                        message: "redirect URL contains obfuscated private IP".to_string(),
                    });
                }
            }
        }
        url::Host::Ipv4(ip) => {
            // Use std library methods for reliable detection
            if !is_localhost
                && (ip.is_private()
                    || ip.is_loopback()
                    || ip.is_link_local()
                    || ip.is_broadcast()
                    || ip.is_unspecified()
                    || ip.octets()[0] == 0)
            {
                return Err(ValidationError {
                    field: "url".to_string(),
                    message: "redirect URL points to private IP address".to_string(),
                });
            }
        }
        url::Host::Ipv6(ip) => {
            // Use std library methods for reliable detection
            if !is_localhost && (ip.is_loopback() || ip.is_unspecified() || is_ipv6_private(ip)) {
                return Err(ValidationError {
                    field: "url".to_string(),
                    message: "redirect URL points to private IP address".to_string(),
                });
            }
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_resource_ids() {
        assert!(validate_resource_id("product-123").is_ok());
        assert!(validate_resource_id("tier:premium").is_ok());
        assert!(validate_resource_id("org/repo/item").is_ok());
        assert!(validate_resource_id("simple").is_ok());
        assert!(validate_resource_id("with_underscore").is_ok());
        assert!(validate_resource_id("UPPERCASE").is_ok());
        assert!(validate_resource_id("123numeric").is_ok());
    }

    #[test]
    fn test_invalid_resource_ids() {
        assert!(validate_resource_id("").is_err());
        assert!(validate_resource_id("has spaces").is_err());
        assert!(validate_resource_id("has\nnewline").is_err());
        assert!(validate_resource_id("has;semicolon").is_err());
        assert!(validate_resource_id("has<html>").is_err());
        assert!(validate_resource_id("$(command)").is_err());
        assert!(validate_resource_id(&"a".repeat(257)).is_err());
    }

    #[test]
    fn test_valid_coupon_codes() {
        assert!(validate_coupon_code("SAVE20").is_ok());
        assert!(validate_coupon_code("summer-sale").is_ok());
        assert!(validate_coupon_code("CODE_123").is_ok());
        assert!(validate_coupon_code("a").is_ok());
    }

    #[test]
    fn test_invalid_coupon_codes() {
        assert!(validate_coupon_code("").is_err());
        assert!(validate_coupon_code("has space").is_err());
        assert!(validate_coupon_code("has:colon").is_err());
        assert!(validate_coupon_code("has/slash").is_err());
        assert!(validate_coupon_code(&"a".repeat(65)).is_err());
    }

    #[test]
    fn test_valid_emails() {
        assert!(validate_email("test@example.com").is_ok());
        assert!(validate_email("user.name@domain.org").is_ok());
        assert!(validate_email("user+tag@example.co.uk").is_ok());
        assert!(validate_email("a@b.co").is_ok());
    }

    #[test]
    fn test_invalid_emails() {
        assert!(validate_email("").is_err());
        assert!(validate_email("notanemail").is_err());
        assert!(validate_email("@nodomain.com").is_err());
        assert!(validate_email("noat.com").is_err());
        assert!(validate_email("has space@example.com").is_err());
        assert!(validate_email(&format!("{}@example.com", "a".repeat(255))).is_err());
    }

    #[test]
    fn test_valid_redirect_urls() {
        assert!(validate_redirect_url("https://example.com/success").is_ok());
        assert!(validate_redirect_url(
            "https://shop.example.com/payment/complete?session={CHECKOUT_SESSION_ID}"
        )
        .is_ok());
        assert!(validate_redirect_url("http://localhost:3000/success").is_ok());
        assert!(validate_redirect_url("http://127.0.0.1:3000/success").is_ok());
    }

    #[test]
    fn test_redirect_urls_production_rejects_http_localhost() {
        assert!(
            validate_redirect_url_with_env("https://example.com/success", "production").is_ok()
        );

        // In production, disallow http:// even for localhost.
        assert!(
            validate_redirect_url_with_env("http://localhost:3000/success", "production").is_err()
        );
        assert!(
            validate_redirect_url_with_env("http://127.0.0.1:3000/success", "production").is_err()
        );

        // Non-production retains localhost http for dev UX.
        assert!(
            validate_redirect_url_with_env("http://localhost:3000/success", "development").is_ok()
        );
    }

    #[test]
    fn test_invalid_redirect_urls() {
        // Empty
        assert!(validate_redirect_url("").is_err());
        // HTTP (non-localhost)
        assert!(validate_redirect_url("http://example.com/success").is_err());
        // Internal IPs (SSRF)
        assert!(validate_redirect_url("https://10.0.0.1/success").is_err());
        assert!(validate_redirect_url("https://172.16.0.1/success").is_err());
        assert!(validate_redirect_url("https://192.168.1.1/success").is_err());
        // Credential injection
        assert!(validate_redirect_url("https://user:pass@example.com/success").is_err());
        // Newlines (header injection)
        assert!(validate_redirect_url("https://example.com/success\r\nX-Injected: true").is_err());
    }

    #[test]
    fn test_ssrf_bypass_patterns() {
        // Octal notation: 0177.0.0.02 = 127.0.0.2 (loopback but not exactly localhost)
        assert!(validate_redirect_url("https://0177.0.0.02/success").is_err()); // 127.0.0.2

        // Hex notation: 0x7f000001 = 127.0.0.1
        // 0x0a000001 = 10.0.0.1 (private IP)
        assert!(validate_redirect_url("https://0x0a000001/success").is_err());

        // Decimal notation: 167772161 = 10.0.0.1
        assert!(validate_redirect_url("https://167772161/success").is_err());

        // Mixed octal: 0300.0250.0.1 = 192.168.0.1
        assert!(validate_redirect_url("https://0300.0250.0.1/success").is_err());

        // IPv6 loopback ::1 is allowed for localhost dev (same as 127.0.0.1)
        assert!(validate_redirect_url("https://[::1]/success").is_ok());
        assert!(validate_redirect_url("http://[::1]:3000/success").is_ok());

        // IPv6 private (fc00::/7)
        assert!(validate_redirect_url("https://[fc00::1]/success").is_err());
        assert!(validate_redirect_url("https://[fd00::1]/success").is_err());

        // IPv6 link-local (fe80::/10)
        assert!(validate_redirect_url("https://[fe80::1]/success").is_err());

        // DNS rebinding domains
        assert!(validate_redirect_url("https://127.0.0.1.xip.io/success").is_err());
        assert!(validate_redirect_url("https://10.0.0.1.nip.io/success").is_err());
        assert!(validate_redirect_url("https://192.168.1.1.sslip.io/success").is_err());
        assert!(validate_redirect_url("https://anything.localtest.me/success").is_err());
        assert!(validate_redirect_url("https://app.lvh.me/success").is_err());

        // Link-local
        assert!(validate_redirect_url("https://169.254.1.1/success").is_err());

        // 0.0.0.0/8 range
        assert!(validate_redirect_url("https://0.1.2.3/success").is_err());
    }

    #[test]
    fn test_decode_obfuscated_ip() {
        // Decimal encoding
        assert_eq!(
            decode_obfuscated_ip("2130706433"),
            Some("127.0.0.1".to_string())
        );
        assert_eq!(
            decode_obfuscated_ip("167772161"),
            Some("10.0.0.1".to_string())
        );

        // Hex encoding
        assert_eq!(
            decode_obfuscated_ip("0x7f000001"),
            Some("127.0.0.1".to_string())
        );
        assert_eq!(
            decode_obfuscated_ip("0x0a000001"),
            Some("10.0.0.1".to_string())
        );

        // Octal notation
        assert_eq!(
            decode_obfuscated_ip("0177.0.0.01"),
            Some("127.0.0.1".to_string())
        );
        assert_eq!(
            decode_obfuscated_ip("0300.0250.0.01"),
            Some("192.168.0.1".to_string())
        );

        // Regular IP (no decoding needed)
        assert_eq!(decode_obfuscated_ip("127.0.0.1"), None);
        assert_eq!(decode_obfuscated_ip("example.com"), None);
    }

    #[test]
    fn test_is_private_ip() {
        // Private IPv4 ranges
        assert!(is_private_ip("10.0.0.1"));
        assert!(is_private_ip("10.255.255.255"));
        assert!(is_private_ip("172.16.0.1"));
        assert!(is_private_ip("172.31.255.255"));
        assert!(is_private_ip("192.168.0.1"));
        assert!(is_private_ip("192.168.255.255"));

        // Loopback
        assert!(is_private_ip("127.0.0.1"));
        assert!(is_private_ip("127.255.255.255"));

        // Link-local
        assert!(is_private_ip("169.254.0.1"));

        // Public IPs (not private)
        assert!(!is_private_ip("8.8.8.8"));
        assert!(!is_private_ip("1.1.1.1"));
        assert!(!is_private_ip("203.0.113.1"));

        // IPv6 private
        assert!(is_private_ip("::1")); // loopback
        assert!(is_private_ip("fc00::1")); // unique local
        assert!(is_private_ip("fd12:3456:789a::1")); // unique local
        assert!(is_private_ip("fe80::1")); // link-local
    }
}
