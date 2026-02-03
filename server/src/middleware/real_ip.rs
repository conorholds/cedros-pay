//! Real IP extraction middleware
//!
//! Extracts the real client IP from proxy headers when the server
//! is behind a reverse proxy or load balancer.
//!
//! Priority order:
//! 1. X-Forwarded-For (rightmost non-private IP for spoof protection)
//! 2. X-Real-IP
//! 3. RemoteAddr (fallback)
//!
//! ## Security Note (SEC-001)
//!
//! Using the FIRST IP in X-Forwarded-For is vulnerable to spoofing:
//! - Attacker sends: `X-Forwarded-For: fake_ip`
//! - Proxy appends: `X-Forwarded-For: fake_ip, real_client_ip`
//! - Server sees `fake_ip` as client (wrong!)
//!
//! We use the RIGHTMOST non-private IP, which is the client IP as seen
//! by the edge proxy. Private IPs (10.x, 192.168.x, etc.) are internal
//! proxies and are skipped.

use std::net::{IpAddr, SocketAddr};

use crate::config::Config;

use axum::{
    body::Body,
    extract::{ConnectInfo, Request},
    http::header::HeaderName,
    middleware::Next,
    response::Response,
};

/// Header names for real IP extraction (in priority order per spec 10-middleware.md)
pub const X_FORWARDED_FOR: &str = "x-forwarded-for";
pub const X_REAL_IP: &str = "x-real-ip";

/// Determine if the peer address is a trusted proxy.
///
/// When `server.trusted_proxy_cidrs` is configured, we only trust proxy headers if the immediate
/// peer IP is in that allowlist.
///
/// When not configured, we fall back to trusting private/loopback peers (backwards compatible).
fn is_trusted_proxy(peer_addr: Option<SocketAddr>, cfg: &Config) -> bool {
    let ip = match peer_addr {
        Some(addr) => addr.ip(),
        None => return false,
    };

    // When explicitly configured, only trust headers from peers in the allowlist.
    if !cfg.server.trusted_proxy_cidrs.is_empty() {
        return is_ip_in_cidrs(&ip, &cfg.server.trusted_proxy_cidrs);
    }

    // Backwards-compatible default: only trust private/loopback peers.
    is_private_ip(&ip)
}

/// Check if an IP address is private/internal (proxy address)
fn is_private_ip(ip: &IpAddr) -> bool {
    match ip {
        IpAddr::V4(v4) => v4.is_loopback() || v4.is_private() || v4.is_link_local(),
        IpAddr::V6(v6) => v6.is_loopback() || is_unique_local_v6(v6) || is_link_local_v6(v6),
    }
}

fn is_unique_local_v6(v6: &std::net::Ipv6Addr) -> bool {
    // fc00::/7 (RFC 4193)
    let seg0 = v6.segments()[0];
    (seg0 & 0xfe00) == 0xfc00
}

fn is_link_local_v6(v6: &std::net::Ipv6Addr) -> bool {
    // fe80::/10
    let seg0 = v6.segments()[0];
    (seg0 & 0xffc0) == 0xfe80
}

fn is_ip_in_cidrs(ip: &IpAddr, cidrs: &[String]) -> bool {
    cidrs.iter().any(|cidr| ip_in_cidr(ip, cidr))
}

fn ip_in_cidr(ip: &IpAddr, cidr: &str) -> bool {
    // Support both exact IPs (no slash) and CIDR notation.
    let (net_str, prefix_len) = match cidr.split_once('/') {
        Some((net_str, prefix_str)) => {
            let prefix_len = match prefix_str.trim().parse::<u8>() {
                Ok(p) => p,
                Err(_) => return false,
            };
            (net_str.trim(), Some(prefix_len))
        }
        None => (cidr.trim(), None),
    };

    let Ok(net_ip) = net_str.parse::<IpAddr>() else {
        return false;
    };

    match (ip, net_ip, prefix_len) {
        (IpAddr::V4(ipv4), IpAddr::V4(netv4), Some(prefix)) => {
            if prefix > 32 {
                return false;
            }
            let ip_u32 = u32::from_be_bytes(ipv4.octets());
            let net_u32 = u32::from_be_bytes(netv4.octets());
            let mask = if prefix == 0 {
                0
            } else {
                u32::MAX << (32 - prefix)
            };
            (ip_u32 & mask) == (net_u32 & mask)
        }
        (IpAddr::V6(ipv6), IpAddr::V6(netv6), Some(prefix)) => {
            if prefix > 128 {
                return false;
            }
            let ip_u128 = u128::from_be_bytes(ipv6.octets());
            let net_u128 = u128::from_be_bytes(netv6.octets());
            let mask = if prefix == 0 {
                0
            } else {
                u128::MAX << (128 - prefix)
            };
            (ip_u128 & mask) == (net_u128 & mask)
        }
        (IpAddr::V4(ipv4), IpAddr::V4(netv4), None) => ipv4 == &netv4,
        (IpAddr::V6(ipv6), IpAddr::V6(netv6), None) => ipv6 == &netv6,
        _ => false,
    }
}

/// Extension to store the extracted real IP
#[derive(Clone, Debug)]
pub struct RealIp(pub IpAddr);

impl RealIp {
    pub fn ip(&self) -> IpAddr {
        self.0
    }
}

/// Extension indicating whether this request is coming from a trusted proxy.
///
/// This is derived from the peer socket address (ConnectInfo) and used by other
/// middleware (e.g., tenant selection) to decide whether to trust proxy-controlled
/// request properties.
#[derive(Clone, Copy, Debug)]
pub struct TrustedProxy(pub bool);

/// Extract real IP from request headers
/// Priority order is X-Forwarded-For -> X-Real-IP -> RemoteAddr
///
/// For X-Forwarded-For, we use the rightmost non-private IP to prevent spoofing.
/// See SEC-001 for details on why first IP is vulnerable.
pub fn extract_real_ip<B>(
    req: &Request<B>,
    peer_addr: Option<SocketAddr>,
    cfg: &Config,
) -> Option<IpAddr> {
    let headers = req.headers();
    let trust_headers = is_trusted_proxy(peer_addr, cfg);

    // Priority 1: X-Forwarded-For (rightmost non-private IP for spoof protection)
    if trust_headers {
        if let Some(xff) = headers.get(X_FORWARDED_FOR) {
            if let Ok(value) = xff.to_str() {
                // X-Forwarded-For format: "client, proxy1, proxy2"
                // SEC-001 FIX: Use rightmost non-private IP instead of first
                // This is the client IP as seen by the edge proxy
                // Private IPs in the chain are internal proxies
                let ips: Vec<&str> = value.split(',').map(|s| s.trim()).collect();
                for ip_str in ips.iter().rev() {
                    if let Ok(ip) = ip_str.parse::<IpAddr>() {
                        let is_trusted_hop = if cfg.server.trusted_proxy_cidrs.is_empty() {
                            is_private_ip(&ip)
                        } else {
                            is_private_ip(&ip)
                                || is_ip_in_cidrs(&ip, &cfg.server.trusted_proxy_cidrs)
                        };

                        if !is_trusted_hop {
                            return Some(ip);
                        }
                    }
                }
                // If all IPs are private, fall through to other methods
            }
        }
    }

    // Priority 2: X-Real-IP
    if trust_headers {
        if let Some(ip) = get_ip_from_header(headers, X_REAL_IP) {
            return Some(ip);
        }
    }

    // Priority 3: Fall back to peer address (RemoteAddr)
    peer_addr.map(|addr| addr.ip())
}

fn get_ip_from_header(headers: &axum::http::HeaderMap, name: &'static str) -> Option<IpAddr> {
    headers
        .get(HeaderName::from_static(name))
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.parse().ok())
}

/// Middleware that extracts the real client IP and stores it as an extension
pub async fn real_ip_middleware(
    axum::extract::State(cfg): axum::extract::State<std::sync::Arc<Config>>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    mut request: Request<Body>,
    next: Next,
) -> Response {
    let trusted = is_trusted_proxy(Some(addr), &cfg);
    request.extensions_mut().insert(TrustedProxy(trusted));

    let real_ip = extract_real_ip(&request, Some(addr), &cfg);
    if let Some(ip) = real_ip {
        request.extensions_mut().insert(RealIp(ip));
    }
    next.run(request).await
}

/// Version without ConnectInfo for testing
pub async fn real_ip_middleware_no_connect(
    axum::extract::State(cfg): axum::extract::State<std::sync::Arc<Config>>,
    mut request: Request<Body>,
    next: Next,
) -> Response {
    request.extensions_mut().insert(TrustedProxy(false));
    let real_ip = extract_real_ip(&request, None, &cfg);
    if let Some(ip) = real_ip {
        request.extensions_mut().insert(RealIp(ip));
    }
    next.run(request).await
}

/// Get the real IP from request extensions
pub fn get_real_ip<B>(req: &Request<B>) -> Option<IpAddr> {
    req.extensions().get::<RealIp>().map(|r| r.0)
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::Request;

    fn cfg_with_trusted_proxy_cidrs(cidrs: &[&str]) -> Config {
        let mut cfg = Config::default();
        cfg.server.trusted_proxy_cidrs = cidrs.iter().map(|s| s.to_string()).collect();
        cfg
    }

    #[test]
    fn test_ip_in_cidr_v4_prefix() {
        assert!(ip_in_cidr(
            &"203.0.113.5".parse().unwrap(),
            "203.0.113.0/24"
        ));
        assert!(!ip_in_cidr(
            &"203.0.114.5".parse().unwrap(),
            "203.0.113.0/24"
        ));
    }

    #[test]
    fn test_ip_in_cidr_v4_exact() {
        assert!(ip_in_cidr(&"203.0.113.5".parse().unwrap(), "203.0.113.5"));
        assert!(!ip_in_cidr(&"203.0.113.6".parse().unwrap(), "203.0.113.5"));
    }

    #[test]
    fn test_extract_x_forwarded_for_single_public() {
        let req = Request::builder()
            .header(X_FORWARDED_FOR, "1.2.3.4")
            .body(())
            .unwrap();

        let cfg = Config::default();
        let peer = "10.0.0.1:12345".parse().unwrap();
        let ip = extract_real_ip(&req, Some(peer), &cfg);
        assert_eq!(ip, Some("1.2.3.4".parse().unwrap()));
    }

    #[test]
    fn test_extract_x_forwarded_for_rightmost_public_default_trust_private_peer() {
        // SEC-001: Use rightmost non-private IP.
        let req = Request::builder()
            .header(X_FORWARDED_FOR, "1.1.1.1, 2.2.2.2, 10.0.0.1, 10.0.0.2")
            .body(())
            .unwrap();

        let cfg = Config::default();
        let peer = "10.0.0.1:12345".parse().unwrap();
        let ip = extract_real_ip(&req, Some(peer), &cfg);
        assert_eq!(ip, Some("2.2.2.2".parse().unwrap()));
    }

    #[test]
    fn test_extract_x_forwarded_for_spoof_protection_default_trust_private_peer() {
        // SEC-001: Attacker controls first IP, proxy appends real client.
        let req = Request::builder()
            .header(X_FORWARDED_FOR, "99.99.99.99, 5.5.5.5")
            .body(())
            .unwrap();

        let cfg = Config::default();
        let peer = "10.0.0.1:12345".parse().unwrap();
        let ip = extract_real_ip(&req, Some(peer), &cfg);
        assert_eq!(ip, Some("5.5.5.5".parse().unwrap()));
    }

    #[test]
    fn test_extract_x_forwarded_for_ignored_when_peer_not_trusted() {
        // Peer is public and not in allowlist, so we must ignore XFF and fall back to peer.
        let req = Request::builder()
            .header(X_FORWARDED_FOR, "1.2.3.4")
            .body(())
            .unwrap();

        let cfg = cfg_with_trusted_proxy_cidrs(&["203.0.113.0/24"]);
        let peer = "198.51.100.10:12345".parse().unwrap();
        let ip = extract_real_ip(&req, Some(peer), &cfg);
        assert_eq!(ip, Some("198.51.100.10".parse().unwrap()));
    }

    #[test]
    fn test_extract_x_forwarded_for_skips_allowlisted_public_proxies() {
        // XFF: client, attacker, trusted-edge-proxy
        // When trusted proxies are configured, we treat allowlisted public proxy hops as trusted.
        let req = Request::builder()
            .header(X_FORWARDED_FOR, "1.1.1.1, 2.2.2.2, 203.0.113.5")
            .body(())
            .unwrap();

        let cfg = cfg_with_trusted_proxy_cidrs(&["203.0.113.0/24"]);
        let peer = "203.0.113.5:12345".parse().unwrap();
        let ip = extract_real_ip(&req, Some(peer), &cfg);
        assert_eq!(ip, Some("2.2.2.2".parse().unwrap()));
    }

    #[test]
    fn test_extract_x_real_ip() {
        let req = Request::builder()
            .header(X_REAL_IP, "5.6.7.8")
            .body(())
            .unwrap();

        let cfg = Config::default();
        let peer = "10.0.0.2:12345".parse().unwrap();
        let ip = extract_real_ip(&req, Some(peer), &cfg);
        assert_eq!(ip, Some("5.6.7.8".parse().unwrap()));
    }

    #[test]
    fn test_priority_order() {
        // X-Forwarded-For should take priority over X-Real-IP
        let req = Request::builder()
            .header(X_FORWARDED_FOR, "1.1.1.1")
            .header(X_REAL_IP, "2.2.2.2")
            .body(())
            .unwrap();

        let cfg = Config::default();
        let peer = "10.0.0.3:12345".parse().unwrap();
        let ip = extract_real_ip(&req, Some(peer), &cfg);
        assert_eq!(ip, Some("1.1.1.1".parse().unwrap()));
    }

    #[test]
    fn test_fallback_to_peer() {
        let req = Request::builder().body(()).unwrap();

        let cfg = Config::default();
        let peer = "192.168.1.1:12345".parse().unwrap();
        let ip = extract_real_ip(&req, Some(peer), &cfg);
        assert_eq!(ip, Some("192.168.1.1".parse().unwrap()));
    }

    #[test]
    fn test_all_private_fallback() {
        // If XFF only contains trusted hops, fall back to X-Real-IP.
        let req = Request::builder()
            .header(X_FORWARDED_FOR, "10.0.0.1, 192.168.1.1")
            .header(X_REAL_IP, "8.8.8.8")
            .body(())
            .unwrap();

        let cfg = Config::default();
        let peer = "10.0.0.1:12345".parse().unwrap();
        let ip = extract_real_ip(&req, Some(peer), &cfg);
        assert_eq!(ip, Some("8.8.8.8".parse().unwrap()));
    }

    #[test]
    fn test_is_private_ip() {
        // IPv4 private ranges
        assert!(is_private_ip(&"10.0.0.1".parse().unwrap()));
        assert!(is_private_ip(&"172.16.0.1".parse().unwrap()));
        assert!(is_private_ip(&"192.168.1.1".parse().unwrap()));
        assert!(is_private_ip(&"127.0.0.1".parse().unwrap()));

        // IPv4 public
        assert!(!is_private_ip(&"8.8.8.8".parse().unwrap()));
        assert!(!is_private_ip(&"1.1.1.1".parse().unwrap()));

        // IPv6 loopback
        assert!(is_private_ip(&"::1".parse().unwrap()));
    }
}
