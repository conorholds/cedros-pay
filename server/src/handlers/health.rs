use std::sync::Arc;
use std::time::Instant;

use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};
use chrono::Utc;
use once_cell::sync::Lazy;
use parking_lot::RwLock;
use serde::Serialize;

use crate::workers::health_checker::HealthChecker;

/// Server start time for uptime calculation
static START_TIME: Lazy<Instant> = Lazy::new(Instant::now);

/// Wallet entry per spec (02-http-endpoints.md lines 60-67)
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WalletEntry {
    pub public_key: String,
    pub balance: String,
    pub status: String,
    pub last_checked: String,
}

/// Wallet health summary per spec (02-http-endpoints.md lines 55-59)
#[derive(Debug, Serialize)]
pub struct WalletHealthSummary {
    pub healthy: i32,
    pub unhealthy: i32,
    pub critical: i32,
}

/// Wallet health per spec (02-http-endpoints.md lines 54-68)
#[derive(Debug, Serialize)]
pub struct WalletHealth {
    pub summary: WalletHealthSummary,
    pub wallets: Vec<WalletEntry>,
}

/// Health response per spec (02-http-endpoints.md lines 40-70)
/// Fields: status, uptime (Go duration string), timestamp, rpcHealthy, routePrefix, network, features (array), walletHealth
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HealthResponse {
    pub status: String,
    pub uptime: String,
    pub timestamp: String,
    pub rpc_healthy: bool,
    pub route_prefix: String,
    pub network: String,
    pub features: Vec<String>,
    pub wallet_health: WalletHealth,
}

/// Health state that can be shared with the handler
#[derive(Clone)]
pub struct HealthState {
    pub health_checker: Option<Arc<HealthChecker>>,
    pub network: String,
    pub route_prefix: String,
    pub gasless_enabled: bool,
    pub auto_create_token_accounts: bool,
    pub balance_monitoring_enabled: bool,
}

impl Default for HealthState {
    fn default() -> Self {
        Self {
            health_checker: None,
            network: "mainnet-beta".to_string(),
            route_prefix: String::new(),
            gasless_enabled: false,
            auto_create_token_accounts: false,
            balance_monitoring_enabled: false,
        }
    }
}

/// Truncate public key per spec (02-http-endpoints.md lines 77-79): first 6 chars + "..."
/// Example: "Gm123456789..." → "Gm1234..."
fn truncate_pubkey(pubkey: &str) -> String {
    if pubkey.len() > 6 {
        format!("{}...", &pubkey[..6])
    } else {
        pubkey.to_string()
    }
}

/// Format duration as Go-style duration string per spec
/// Example: 45296 seconds → "12h34m56s"
fn format_uptime(secs: u64) -> String {
    let hours = secs / 3600;
    let mins = (secs % 3600) / 60;
    let secs_remaining = secs % 60;

    let mut result = String::new();
    if hours > 0 {
        result.push_str(&format!("{}h", hours));
    }
    if mins > 0 || hours > 0 {
        result.push_str(&format!("{}m", mins));
    }
    result.push_str(&format!("{}s", secs_remaining));
    result
}

/// Health check handler with real RPC and wallet status
/// Per spec (02-http-endpoints.md lines 40-70)
pub async fn health_with_state(State(state): State<Arc<RwLock<HealthState>>>) -> impl IntoResponse {
    let uptime = START_TIME.elapsed();
    let now = Utc::now();
    let state = state.read();

    let (rpc_healthy, wallet_health, healthy_count, _low_count, critical_count) =
        if let Some(ref checker) = state.health_checker {
            let health = checker.get_health();
            let (healthy, low, critical) = checker.get_wallet_summary();

            // Build wallets array per spec
            let wallets: Vec<WalletEntry> = health
                .wallets
                .values()
                .map(|w| WalletEntry {
                    public_key: truncate_pubkey(&w.public_key),
                    balance: format!("{:.6}", w.balance),
                    status: w.status.as_str().to_string(),
                    last_checked: now.to_rfc3339(),
                })
                .collect();

            let wallet_health = WalletHealth {
                summary: WalletHealthSummary {
                    healthy: healthy as i32,
                    unhealthy: low as i32,
                    critical: critical as i32,
                },
                wallets,
            };

            (health.rpc_healthy, wallet_health, healthy, low, critical)
        } else {
            (
                true,
                WalletHealth {
                    summary: WalletHealthSummary {
                        healthy: 0,
                        unhealthy: 0,
                        critical: 0,
                    },
                    wallets: vec![],
                },
                0,
                0,
                0,
            )
        };

    // Determine overall status per spec: "ok" | "degraded" | "error"
    let status = if rpc_healthy && critical_count == 0 {
        "ok"
    } else if critical_count > 0 && healthy_count == 0 {
        "error"
    } else {
        "degraded"
    };

    // Build features array per spec (02-http-endpoints.md lines 72-75)
    // Only optional features that deviate from defaults
    let mut features = Vec::new();
    if state.gasless_enabled {
        features.push("gasless".to_string());
    }
    if state.auto_create_token_accounts {
        features.push("auto-create-token-accounts".to_string());
    }
    if state.balance_monitoring_enabled {
        features.push("balance-monitoring".to_string());
    }

    let body = HealthResponse {
        status: status.to_string(),
        uptime: format_uptime(uptime.as_secs()),
        timestamp: now.to_rfc3339(),
        rpc_healthy,
        route_prefix: state.route_prefix.clone(),
        network: state.network.clone(),
        features,
        wallet_health,
    };

    // Return appropriate HTTP status code based on health status
    // Per HTTP semantics: 200 for ok/degraded, 503 for error
    let http_status = if status == "error" {
        StatusCode::SERVICE_UNAVAILABLE
    } else {
        StatusCode::OK
    };

    (http_status, Json(body))
}

/// Simple health check without state (for backwards compatibility)
pub async fn health() -> impl IntoResponse {
    let uptime = START_TIME.elapsed();
    let now = Utc::now();

    let body = HealthResponse {
        status: "ok".to_string(),
        uptime: format_uptime(uptime.as_secs()),
        timestamp: now.to_rfc3339(),
        rpc_healthy: true,
        route_prefix: String::new(),
        network: "mainnet-beta".to_string(),
        features: vec![],
        wallet_health: WalletHealth {
            summary: WalletHealthSummary {
                healthy: 0,
                unhealthy: 0,
                critical: 0,
            },
            wallets: vec![],
        },
    };
    Json(body)
}

/// Liveness probe for kubernetes
pub async fn liveness() -> impl IntoResponse {
    Json(serde_json::json!({
        "status": "ok"
    }))
}

/// Readiness probe for kubernetes
/// Returns 200 when ready, 503 when not ready
pub async fn readiness_with_state(
    State(state): State<Arc<RwLock<HealthState>>>,
) -> impl IntoResponse {
    let state = state.read();

    let ready = if let Some(ref checker) = state.health_checker {
        checker.is_rpc_healthy()
    } else {
        true
    };

    if ready {
        (
            StatusCode::OK,
            Json(serde_json::json!({
                "ready": true
            })),
        )
    } else {
        (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(serde_json::json!({
                "ready": false,
                "reason": "RPC unhealthy"
            })),
        )
    }
}

/// Simple readiness check (backwards compatibility)
pub async fn readiness() -> impl IntoResponse {
    Json(serde_json::json!({
        "ready": true
    }))
}
