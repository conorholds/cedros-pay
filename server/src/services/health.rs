//! Health check service
//!
//! Provides component-level health checks for the application.

use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};

use chrono::{DateTime, Utc};
use parking_lot::RwLock;
use serde::Serialize;
use tokio::time::timeout;

use crate::storage::Store;

/// Component health status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum HealthStatus {
    /// Component is healthy
    Healthy,
    /// Component is degraded but operational
    Degraded,
    /// Component is unhealthy
    Unhealthy,
}

impl HealthStatus {
    pub fn is_healthy(&self) -> bool {
        matches!(self, HealthStatus::Healthy)
    }

    pub fn is_operational(&self) -> bool {
        !matches!(self, HealthStatus::Unhealthy)
    }
}

/// Individual component health check result
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ComponentHealth {
    pub name: String,
    pub status: HealthStatus,
    pub latency_ms: Option<u64>,
    pub message: Option<String>,
    pub last_checked: DateTime<Utc>,
}

/// Overall health check response
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HealthReport {
    pub status: HealthStatus,
    pub version: String,
    pub uptime_seconds: u64,
    pub timestamp: DateTime<Utc>,
    pub components: Vec<ComponentHealth>,
}

impl HealthReport {
    /// Calculate overall status from components
    pub fn from_components(components: Vec<ComponentHealth>, uptime: Duration) -> Self {
        let status = if components.iter().all(|c| c.status == HealthStatus::Healthy) {
            HealthStatus::Healthy
        } else if components
            .iter()
            .any(|c| c.status == HealthStatus::Unhealthy)
        {
            HealthStatus::Unhealthy
        } else {
            HealthStatus::Degraded
        };

        Self {
            status,
            version: env!("CARGO_PKG_VERSION").to_string(),
            uptime_seconds: uptime.as_secs(),
            timestamp: Utc::now(),
            components,
        }
    }
}

/// Health check configuration
#[derive(Debug, Clone)]
pub struct HealthCheckConfig {
    /// Timeout for individual health checks
    pub timeout: Duration,
    /// Cache duration for health check results
    pub cache_duration: Duration,
    /// Enable database health check
    pub check_database: bool,
    /// Enable RPC health check
    pub check_rpc: bool,
    /// Enable Stripe health check
    pub check_stripe: bool,
}

impl Default for HealthCheckConfig {
    fn default() -> Self {
        Self {
            timeout: Duration::from_secs(5),
            cache_duration: Duration::from_secs(30),
            check_database: true,
            check_rpc: true,
            check_stripe: true,
        }
    }
}

/// Cached health check result
struct CachedResult {
    result: ComponentHealth,
    cached_at: Instant,
}

/// Health check service
pub struct HealthChecker<S: Store> {
    store: Arc<S>,
    config: HealthCheckConfig,
    start_time: Instant,
    cache: RwLock<HashMap<String, CachedResult>>,
    rpc_url: Option<String>,
    http_client: reqwest::Client,
}

impl<S: Store + 'static> HealthChecker<S> {
    /// Create a new health checker
    pub fn new(store: Arc<S>, config: HealthCheckConfig) -> Self {
        Self {
            store,
            config,
            start_time: Instant::now(),
            cache: RwLock::new(HashMap::new()),
            rpc_url: None,
            http_client: reqwest::Client::new(),
        }
    }

    /// Set RPC URL for health checks
    pub fn with_rpc_url(mut self, url: String) -> Self {
        self.rpc_url = Some(url);
        self
    }

    /// Get uptime duration
    pub fn uptime(&self) -> Duration {
        self.start_time.elapsed()
    }

    /// Run all health checks
    pub async fn check_all(&self) -> HealthReport {
        let mut components = Vec::new();

        // Database check
        if self.config.check_database {
            components.push(self.check_database().await);
        }

        // RPC check
        if self.config.check_rpc {
            if let Some(ref url) = self.rpc_url {
                components.push(self.check_rpc(url).await);
            }
        }

        // Always add basic checks
        components.push(self.check_memory());

        HealthReport::from_components(components, self.uptime())
    }

    /// Check database connectivity
    async fn check_database(&self) -> ComponentHealth {
        let name = "database".to_string();

        // Check cache first
        if let Some(cached) = self.get_cached(&name) {
            return cached;
        }

        let start = Instant::now();
        let result = timeout(self.config.timeout, self.ping_database()).await;
        let latency = start.elapsed().as_millis() as u64;

        let health = match result {
            Ok(Ok(())) => ComponentHealth {
                name: name.clone(),
                status: if latency < 100 {
                    HealthStatus::Healthy
                } else {
                    HealthStatus::Degraded
                },
                latency_ms: Some(latency),
                message: None,
                last_checked: Utc::now(),
            },
            Ok(Err(e)) => ComponentHealth {
                name: name.clone(),
                status: HealthStatus::Unhealthy,
                latency_ms: Some(latency),
                message: Some(e.to_string()),
                last_checked: Utc::now(),
            },
            Err(_) => ComponentHealth {
                name: name.clone(),
                status: HealthStatus::Unhealthy,
                latency_ms: None,
                message: Some("timeout".to_string()),
                last_checked: Utc::now(),
            },
        };

        self.cache_result(&name, health.clone());
        health
    }

    /// Ping database to check connectivity
    async fn ping_database(&self) -> Result<(), String> {
        // Use store-level health check (read-only for DB backends) per spec.
        self.store.health_check().await.map_err(|e| e.to_string())?;
        Ok(())
    }

    /// Check RPC connectivity
    async fn check_rpc(&self, url: &str) -> ComponentHealth {
        let name = "rpc".to_string();

        // Check cache first
        if let Some(cached) = self.get_cached(&name) {
            return cached;
        }

        let start = Instant::now();
        let result = timeout(self.config.timeout, self.ping_rpc(url)).await;
        let latency = start.elapsed().as_millis() as u64;

        let health = match result {
            Ok(Ok(())) => ComponentHealth {
                name: name.clone(),
                status: if latency < 500 {
                    HealthStatus::Healthy
                } else {
                    HealthStatus::Degraded
                },
                latency_ms: Some(latency),
                message: None,
                last_checked: Utc::now(),
            },
            Ok(Err(e)) => ComponentHealth {
                name: name.clone(),
                status: HealthStatus::Unhealthy,
                latency_ms: Some(latency),
                message: Some(e),
                last_checked: Utc::now(),
            },
            Err(_) => ComponentHealth {
                name: name.clone(),
                status: HealthStatus::Unhealthy,
                latency_ms: None,
                message: Some("timeout".to_string()),
                last_checked: Utc::now(),
            },
        };

        self.cache_result(&name, health.clone());
        health
    }

    /// Ping RPC endpoint
    async fn ping_rpc(&self, url: &str) -> Result<(), String> {
        let body = serde_json::json!({
            "jsonrpc": "2.0",
            "id": 1,
            "method": "getHealth"
        });

        let response = self
            .http_client
            .post(url)
            .json(&body)
            .timeout(Duration::from_secs(5))
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if response.status().is_success() {
            Ok(())
        } else {
            Err(format!("HTTP {}", response.status()))
        }
    }

    /// Check memory usage
    fn check_memory(&self) -> ComponentHealth {
        // Simple memory check - this is platform-dependent
        // For a real implementation, you'd want to use sys-info or similar
        ComponentHealth {
            name: "memory".to_string(),
            status: HealthStatus::Healthy,
            latency_ms: None,
            message: None,
            last_checked: Utc::now(),
        }
    }

    /// Get cached result if not expired
    fn get_cached(&self, name: &str) -> Option<ComponentHealth> {
        let cache = self.cache.read();
        cache.get(name).and_then(|cached| {
            if cached.cached_at.elapsed() < self.config.cache_duration {
                Some(cached.result.clone())
            } else {
                None
            }
        })
    }

    /// Cache a health check result
    fn cache_result(&self, name: &str, result: ComponentHealth) {
        let mut cache = self.cache.write();
        cache.insert(
            name.to_string(),
            CachedResult {
                result,
                cached_at: Instant::now(),
            },
        );
    }

    /// Clear the cache
    pub fn clear_cache(&self) {
        let mut cache = self.cache.write();
        cache.clear();
    }
}

/// Simple liveness check (for kubernetes /livez)
#[derive(Debug, Serialize)]
pub struct LivenessResponse {
    pub status: &'static str,
}

impl Default for LivenessResponse {
    fn default() -> Self {
        Self { status: "ok" }
    }
}

/// Simple readiness check (for kubernetes /readyz)
#[derive(Debug, Serialize)]
pub struct ReadinessResponse {
    pub ready: bool,
    pub reason: Option<String>,
}

impl ReadinessResponse {
    pub fn ready() -> Self {
        Self {
            ready: true,
            reason: None,
        }
    }

    pub fn not_ready(reason: impl Into<String>) -> Self {
        Self {
            ready: false,
            reason: Some(reason.into()),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_health_status() {
        assert!(HealthStatus::Healthy.is_healthy());
        assert!(HealthStatus::Healthy.is_operational());
        assert!(!HealthStatus::Degraded.is_healthy());
        assert!(HealthStatus::Degraded.is_operational());
        assert!(!HealthStatus::Unhealthy.is_healthy());
        assert!(!HealthStatus::Unhealthy.is_operational());
    }

    #[test]
    fn test_health_report_all_healthy() {
        let components = vec![
            ComponentHealth {
                name: "db".to_string(),
                status: HealthStatus::Healthy,
                latency_ms: Some(10),
                message: None,
                last_checked: Utc::now(),
            },
            ComponentHealth {
                name: "rpc".to_string(),
                status: HealthStatus::Healthy,
                latency_ms: Some(50),
                message: None,
                last_checked: Utc::now(),
            },
        ];

        let report = HealthReport::from_components(components, Duration::from_secs(100));
        assert_eq!(report.status, HealthStatus::Healthy);
    }

    #[test]
    fn test_health_report_degraded() {
        let components = vec![
            ComponentHealth {
                name: "db".to_string(),
                status: HealthStatus::Healthy,
                latency_ms: Some(10),
                message: None,
                last_checked: Utc::now(),
            },
            ComponentHealth {
                name: "rpc".to_string(),
                status: HealthStatus::Degraded,
                latency_ms: Some(1000),
                message: Some("slow".to_string()),
                last_checked: Utc::now(),
            },
        ];

        let report = HealthReport::from_components(components, Duration::from_secs(100));
        assert_eq!(report.status, HealthStatus::Degraded);
    }

    #[test]
    fn test_health_report_unhealthy() {
        let components = vec![ComponentHealth {
            name: "db".to_string(),
            status: HealthStatus::Unhealthy,
            latency_ms: None,
            message: Some("connection failed".to_string()),
            last_checked: Utc::now(),
        }];

        let report = HealthReport::from_components(components, Duration::from_secs(100));
        assert_eq!(report.status, HealthStatus::Unhealthy);
    }
}
