use std::collections::HashMap;
use std::env;
use std::net::SocketAddr;
use std::net::ToSocketAddrs;
use std::sync::mpsc;
use std::sync::Mutex;
use std::thread;
use std::time::Duration;

use config::{Config as RawConfig, ConfigError as RawConfigError, File};
use serde::{Deserialize, Deserializer, Serialize};
use serde_with::{serde_as, DurationSeconds};
use thiserror::Error;

/// Custom deserializer for PaywallResource that accepts both:
/// - Go-style map format: `{ "resource-id": { description: "...", ... } }`
/// - List format: `[ { resource_id: "resource-id", description: "...", ... } ]`
fn deserialize_resources<'de, D>(deserializer: D) -> Result<Vec<PaywallResource>, D::Error>
where
    D: Deserializer<'de>,
{
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum ResourcesFormat {
        Map(HashMap<String, PaywallResource>),
        List(Vec<PaywallResource>),
    }

    match ResourcesFormat::deserialize(deserializer)? {
        ResourcesFormat::Map(map) => Ok(map
            .into_iter()
            .map(|(id, mut resource)| {
                resource.resource_id = id;
                resource
            })
            .collect()),
        ResourcesFormat::List(list) => Ok(list),
    }
}

use crate::constants::WEBHOOK_MAX_ATTEMPTS;
use crate::models::stablecoins::validate_stablecoin_mint;
use crate::repositories::postgres::validate_table_name;

const DEFAULT_ROUTE_PREFIX: &str = "";
const DEFAULT_X402_NETWORK: &str = "mainnet-beta";
const DEFAULT_MEMO_PREFIX: &str = "cedros";
const DEFAULT_COMMITMENT: &str = "confirmed";
const DEFAULT_STRIPE_MODE: &str = "test";

/// Validate a webhook URL to prevent SSRF attacks.
/// Rejects private IP ranges, localhost, and non-HTTPS in production.
fn validate_webhook_url(url: &str, allow_http: bool) -> Result<(), String> {
    let parsed = url::Url::parse(url).map_err(|e| format!("invalid URL: {}", e))?;

    // Require HTTPS for production (configurable for development)
    match parsed.scheme() {
        "https" => {}
        "http" if allow_http => {
            tracing::warn!(
                "Webhook URL uses HTTP instead of HTTPS. This is insecure for production use."
            );
        }
        "http" => {
            return Err("webhook URL must use HTTPS in production".to_string());
        }
        scheme => {
            return Err(format!("webhook URL must use HTTPS, got: {}", scheme));
        }
    }

    // Extract host and normalize FQDN (remove trailing dot)
    let host = parsed
        .host_str()
        .ok_or_else(|| "webhook URL missing host".to_string())?
        .trim_end_matches('.');

    // Block localhost variants (including FQDN forms like localhost.)
    if host == "localhost"
        || host == "localhost.localdomain"
        || host == "127.0.0.1"
        || host == "::1"
        || host == "[::1]"
        || host.ends_with(".localhost")
    {
        return Err("webhook URL cannot point to localhost".to_string());
    }

    fn is_private_ip(ip: std::net::IpAddr) -> bool {
        match ip {
            std::net::IpAddr::V4(ipv4) => {
                ipv4.is_loopback()           // 127.0.0.0/8
                    || ipv4.is_private()     // 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
                    || ipv4.is_link_local()  // 169.254.0.0/16
                    || ipv4.is_broadcast()   // 255.255.255.255
                    || ipv4.is_unspecified() // 0.0.0.0
            }
            std::net::IpAddr::V6(ipv6) => {
                let seg0 = ipv6.segments()[0];
                let is_unique_local = (seg0 & 0xfe00) == 0xfc00; // fc00::/7
                let is_link_local = (seg0 & 0xffc0) == 0xfe80; // fe80::/10
                let is_multicast = (seg0 & 0xff00) == 0xff00; // ff00::/8

                ipv6.is_loopback()           // ::1
                    || ipv6.is_unspecified() // ::
                    || is_unique_local
                    || is_link_local
                    || is_multicast
                    // IPv4-mapped addresses (::ffff:x.x.x.x) - check the embedded IPv4
                    || match ipv6.to_ipv4_mapped() {
                        Some(v4) => v4.is_private() || v4.is_loopback(),
                        None => false,
                    }
            }
        }
    }

    // Parse IP address and check for private ranges.
    // Note: url::Url host_str may include brackets for IPv6 literals (e.g. "[::1]").
    let host_for_ip = host.trim_start_matches('[').trim_end_matches(']');
    if let Ok(ip) = host_for_ip.parse::<std::net::IpAddr>() {
        if is_private_ip(ip) {
            return Err(format!(
                "webhook URL cannot point to private/reserved IP address: {}",
                ip
            ));
        }
    } else {
        let dns_validation_disabled = std::env::var("CEDROS_DISABLE_DNS_VALIDATION")
            .ok()
            .filter(|v| !v.is_empty())
            .is_some();
        if dns_validation_disabled {
            if allow_http {
                tracing::warn!(
                    "CEDROS_DISABLE_DNS_VALIDATION is set; webhook hostname DNS checks are disabled (development only)"
                );
                return Ok(());
            }
            tracing::warn!(
                "CEDROS_DISABLE_DNS_VALIDATION is set but ignored in production; webhook hostname DNS checks remain enabled"
            );
        }

        // Resolve hostnames to prevent DNS rebinding to private IPs
        let port = parsed.port_or_known_default().unwrap_or_else(|| {
            if parsed.scheme() == "http" {
                80
            } else {
                443
            }
        });
        let host = host.to_string();
        let addrs = resolve_socket_addrs_with_timeout(Duration::from_secs(2), move || {
            (host.as_str(), port)
                .to_socket_addrs()
                .map(|iter| iter.collect::<Vec<SocketAddr>>())
                .map_err(|e| format!("failed to resolve webhook host: {}", e))
        })?;

        for addr in addrs {
            if is_private_ip(addr.ip()) {
                return Err(format!(
                    "webhook URL cannot resolve to private/reserved IP address: {}",
                    addr.ip()
                ));
            }
        }
    }

    Ok(())
}

fn resolve_socket_addrs_with_timeout<F>(
    timeout: Duration,
    resolve: F,
) -> Result<Vec<SocketAddr>, String>
where
    F: FnOnce() -> Result<Vec<SocketAddr>, String> + Send + 'static,
{
    trait ResolveJob: Send {
        fn call(self: Box<Self>) -> Result<Vec<SocketAddr>, String>;
    }

    impl<F> ResolveJob for F
    where
        F: FnOnce() -> Result<Vec<SocketAddr>, String> + Send,
    {
        fn call(self: Box<Self>) -> Result<Vec<SocketAddr>, String> {
            (*self)()
        }
    }

    struct DnsJob {
        resolve: Box<dyn ResolveJob>,
        resp: mpsc::Sender<Result<Vec<SocketAddr>, String>>,
    }

    static DNS_POOL: once_cell::sync::Lazy<mpsc::Sender<DnsJob>> =
        once_cell::sync::Lazy::new(|| {
            const WORKERS: usize = 4;
            let (tx, rx) = mpsc::channel::<DnsJob>();
            let rx = std::sync::Arc::new(Mutex::new(rx));

            for _ in 0..WORKERS {
                let rx = rx.clone();
                thread::spawn(move || loop {
                    let job = {
                        let guard = match rx.lock() {
                            Ok(g) => g,
                            Err(poisoned) => poisoned.into_inner(),
                        };
                        guard.recv()
                    };
                    let Ok(job) = job else {
                        break;
                    };
                    let res = job.resolve.call();
                    let _ = job.resp.send(res);
                });
            }

            tx
        });

    let (tx, rx) = mpsc::channel();
    DNS_POOL
        .send(DnsJob {
            resolve: Box::new(resolve),
            resp: tx,
        })
        .map_err(|_| "webhook host resolution worker disconnected".to_string())?;

    match rx.recv_timeout(timeout) {
        Ok(res) => res,
        Err(mpsc::RecvTimeoutError::Timeout) => Err("timed out resolving webhook host".to_string()),
        Err(mpsc::RecvTimeoutError::Disconnected) => {
            Err("webhook host resolution worker disconnected".to_string())
        }
    }
}

#[cfg(test)]
mod dns_timeout_tests {
    use super::*;

    #[test]
    fn test_dns_resolution_timeout_is_bounded() {
        let result = resolve_socket_addrs_with_timeout(Duration::from_millis(50), || {
            std::thread::sleep(Duration::from_millis(200));
            Ok(vec![])
        });

        assert!(result.is_err());
        assert!(
            result.unwrap_err().to_lowercase().contains("timed out"),
            "expected a timeout error"
        );
    }
}

#[derive(Debug, Error)]
pub enum ConfigError {
    #[error("configuration load error: {0}")]
    Load(#[from] RawConfigError),
    #[error("configuration validation failed: {0}")]
    Validation(String),
}

#[serde_as]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerConfig {
    #[serde(default = "default_server_address")]
    pub address: String,
    #[serde(default)]
    pub public_url: String,
    #[serde(default)]
    pub route_prefix: String,
    #[serde(default)]
    pub admin_metrics_api_key: Option<String>,
    #[serde(default = "default_cors_origins")]
    pub cors_allowed_origins: Vec<String>,
    /// Trusted reverse proxy / load balancer CIDR allowlist.
    ///
    /// When configured, proxy-controlled headers (e.g. X-Forwarded-For) are only trusted when the
    /// immediate peer IP is within one of these ranges.
    #[serde(default)]
    pub trusted_proxy_cidrs: Vec<String>,
    /// Read timeout for HTTP requests (YAML-only, no env override per spec)
    #[serde_as(as = "Option<DurationSeconds<u64>>")]
    #[serde(default = "default_read_timeout")]
    pub read_timeout: Option<Duration>,
    /// Write timeout for HTTP responses (YAML-only, no env override per spec)
    #[serde_as(as = "Option<DurationSeconds<u64>>")]
    #[serde(default = "default_write_timeout")]
    pub write_timeout: Option<Duration>,
    /// Idle timeout for keep-alive connections (YAML-only, no env override per spec)
    #[serde_as(as = "Option<DurationSeconds<u64>>")]
    #[serde(default = "default_idle_timeout")]
    pub idle_timeout: Option<Duration>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoggingConfig {
    #[serde(default = "default_log_level")]
    pub level: String,
    #[serde(default = "default_log_format")]
    pub format: String,
    #[serde(default = "default_log_environment")]
    pub environment: String,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct StripeConfig {
    /// Whether Stripe payments are enabled (default: true for backwards compat)
    #[serde(default = "default_true")]
    pub enabled: bool,
    #[serde(default)]
    pub secret_key: String,
    #[serde(default)]
    pub webhook_secret: String,
    #[serde(default)]
    pub publishable_key: String,
    #[serde(default)]
    pub success_url: String,
    #[serde(default)]
    pub cancel_url: String,
    #[serde(default)]
    pub tax_rate_id: String,
    #[serde(default = "default_stripe_mode")]
    pub mode: String,
}

// SEC-001: Custom Debug implementation to prevent secret exposure in logs
impl std::fmt::Debug for StripeConfig {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("StripeConfig")
            .field("enabled", &self.enabled)
            .field("secret_key", &"[REDACTED]")
            .field("webhook_secret", &"[REDACTED]")
            .field("publishable_key", &self.publishable_key)
            .field("success_url", &self.success_url)
            .field("cancel_url", &self.cancel_url)
            .field("tax_rate_id", &self.tax_rate_id)
            .field("mode", &self.mode)
            .finish()
    }
}

#[serde_as]
#[derive(Clone, Serialize, Deserialize)]
pub struct X402Config {
    /// Whether x402 (crypto) payments are enabled (default: true for backwards compat)
    #[serde(default = "default_true")]
    pub enabled: bool,
    #[serde(default)]
    pub payment_address: String,
    #[serde(default)]
    pub token_mint: String,
    #[serde(default = "default_token_symbol")]
    pub token_symbol: String,
    #[serde(default = "default_token_decimals")]
    pub token_decimals: u8,
    #[serde(default = "default_x402_network")]
    pub network: String,
    #[serde(default)]
    pub rpc_url: String,
    #[serde(default)]
    pub ws_url: String,
    #[serde(default = "default_memo_prefix")]
    pub memo_prefix: String,
    #[serde(default)]
    pub skip_preflight: bool,
    #[serde(default = "default_commitment")]
    pub commitment: String,
    #[serde(default)]
    pub gasless_enabled: bool,
    #[serde(default)]
    pub auto_create_token_account: bool,
    #[serde(default)]
    pub server_wallets: Vec<String>,
    #[serde(default = "default_allowed_tokens")]
    pub allowed_tokens: Vec<String>,
    #[serde(default = "default_compute_unit_limit")]
    pub compute_unit_limit: u32,
    #[serde(default = "default_compute_unit_price")]
    pub compute_unit_price_micro_lamports: u64,
    #[serde(default = "default_rounding_mode")]
    pub rounding_mode: String,
    #[serde_as(as = "Option<DurationSeconds<u64>>")]
    #[serde(default = "default_tx_queue_min_time_between")]
    pub tx_queue_min_time_between: Option<Duration>,
    #[serde(default = "default_tx_queue_max_in_flight")]
    pub tx_queue_max_in_flight: usize,
}

// SEC-001c: Custom Debug implementation to prevent server wallet private key exposure in logs
impl std::fmt::Debug for X402Config {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("X402Config")
            .field("enabled", &self.enabled)
            .field("payment_address", &self.payment_address)
            .field("token_mint", &self.token_mint)
            .field("token_symbol", &self.token_symbol)
            .field("token_decimals", &self.token_decimals)
            .field("network", &self.network)
            .field("rpc_url", &self.rpc_url)
            .field("ws_url", &self.ws_url)
            .field("memo_prefix", &self.memo_prefix)
            .field("skip_preflight", &self.skip_preflight)
            .field("commitment", &self.commitment)
            .field("gasless_enabled", &self.gasless_enabled)
            .field("auto_create_token_account", &self.auto_create_token_account)
            .field(
                "server_wallets",
                &format!("[<{} wallets>]", self.server_wallets.len()),
            )
            .field("allowed_tokens", &self.allowed_tokens)
            .field("compute_unit_limit", &self.compute_unit_limit)
            .field(
                "compute_unit_price_micro_lamports",
                &self.compute_unit_price_micro_lamports,
            )
            .field("rounding_mode", &self.rounding_mode)
            .field("tx_queue_min_time_between", &self.tx_queue_min_time_between)
            .field("tx_queue_max_in_flight", &self.tx_queue_max_in_flight)
            .finish()
    }
}

#[serde_as]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PostgresPoolConfig {
    #[serde(default = "default_pg_max_open")]
    pub max_open_conns: u32,
    /// Minimum number of DB connections to keep warm.
    ///
    /// Backwards compatible: accepts legacy `max_idle_conns` field name.
    #[serde(default = "default_pg_max_idle", alias = "max_idle_conns")]
    pub min_connections: u32,
    #[serde_as(as = "DurationSeconds<u64>")]
    #[serde(default = "default_pg_conn_max_lifetime")]
    pub conn_max_lifetime: Duration,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
#[derive(Default)]
pub enum StorageBackend {
    /// In-memory storage (for testing only)
    #[default]
    Memory,
    /// PostgreSQL database (production)
    Postgres,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SchemaMapping {
    #[serde(default = "default_payments_table")]
    pub payments_table: String,
    #[serde(default = "default_sessions_table")]
    pub sessions_table: String,
    #[serde(default = "default_products_table")]
    pub products_table: String,
    #[serde(default = "default_coupons_table")]
    pub coupons_table: String,
    #[serde(default = "default_cart_quotes_table")]
    pub cart_quotes_table: String,
    #[serde(default = "default_refund_quotes_table")]
    pub refund_quotes_table: String,
    #[serde(default = "default_admin_nonces_table")]
    pub admin_nonces_table: String,
    #[serde(default = "default_webhook_queue_table")]
    pub webhook_queue_table: String,
    #[serde(default = "default_credits_holds_table")]
    pub credits_holds_table: String,
}

#[serde_as]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageConfig {
    #[serde(default)]
    pub backend: StorageBackend,
    #[serde(default)]
    pub postgres_url: Option<String>,
    #[serde(default = "default_cart_quote_ttl")]
    #[serde_as(as = "DurationSeconds<u64>")]
    pub cart_quote_ttl: Duration,
    #[serde(default = "default_refund_quote_ttl")]
    #[serde_as(as = "DurationSeconds<u64>")]
    pub refund_quote_ttl: Duration,
    #[serde(default)]
    pub postgres_pool: PostgresPoolConfig,
    #[serde(default)]
    pub schema_mapping: SchemaMapping,
    /// Archival configuration per spec (08-storage.md)
    #[serde(default)]
    pub archival: ArchivalConfig,
    /// Enable inventory holds when creating cart quotes (default: true)
    /// When enabled, inventory is reserved for the hold duration to prevent overselling
    #[serde(default = "default_inventory_holds_enabled")]
    pub inventory_holds_enabled: bool,
    /// Duration for inventory holds, separate from cart_quote_ttl (default: 15 minutes)
    #[serde(default = "default_inventory_hold_ttl")]
    #[serde_as(as = "DurationSeconds<u64>")]
    pub inventory_hold_ttl: Duration,
}

/// Archival configuration per spec (08-storage.md lines 393-399)
#[serde_as]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArchivalConfig {
    /// Enable automatic archival of old payment signatures
    #[serde(default)]
    pub enabled: bool,
    /// Retention period for payment signatures (default: 90 days = 2160h)
    #[serde(default = "default_archival_retention_period")]
    #[serde_as(as = "DurationSeconds<u64>")]
    pub retention_period: Duration,
    /// How often to run the archival cleanup (default: 24h)
    #[serde(default = "default_archival_run_interval")]
    #[serde_as(as = "DurationSeconds<u64>")]
    pub run_interval: Duration,
}

impl Default for ArchivalConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            retention_period: default_archival_retention_period(),
            run_interval: default_archival_run_interval(),
        }
    }
}
