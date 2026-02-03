use std::sync::Arc;

use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};
use serde::{Deserialize, Serialize};

use super::response::json_ok;
use crate::middleware::tenant::TenantContext;
use crate::repositories::ProductRepository;

// ─────────────────────────────────────────────────────────────────────────────
// Response types
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PaymentOptionsResponse {
    pub version: String,
    pub server: String,
    pub resources: Vec<ResourceInfo>,
    pub payment: PaymentInfo,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResourceInfo {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub endpoint: String,
    pub price: PriceInfo,
    pub metadata: serde_json::Value,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PriceInfo {
    pub fiat: Option<FiatPrice>,
    pub crypto: Option<CryptoPrice>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FiatPrice {
    pub amount: f64,
    pub currency: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CryptoPrice {
    pub amount: f64,
    pub token: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PaymentInfo {
    pub methods: Vec<String>,
    pub x402: Option<X402Info>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct X402Info {
    pub network: String,
    pub payment_address: String,
    pub token_mint: String,
}

#[derive(Debug, Serialize)]
pub struct AgentJsonResponse {
    pub name: String,
    pub version: String,
    pub description: String,
    pub service_endpoint: String,
    pub capabilities: Vec<String>,
    pub authentication: AuthInfo,
    pub payment_methods: Vec<PaymentMethodInfo>,
    pub metadata: AgentMetadata,
}

#[derive(Debug, Serialize)]
pub struct AuthInfo {
    #[serde(rename = "type")]
    pub auth_type: String,
    pub schemes: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct PaymentMethodInfo {
    #[serde(rename = "type")]
    pub method_type: String,
    pub protocol: String,
    pub network: Option<String>,
    pub description: String,
}

#[derive(Debug, Serialize)]
pub struct AgentMetadata {
    pub project_url: String,
    pub documentation: String,
    pub discovery_rfc8615: String,
    pub discovery_mcp: String,
    pub openapi_spec: String,
}

#[derive(Debug, Deserialize)]
pub struct McpRequest {
    pub jsonrpc: String,
    pub id: serde_json::Value,
    pub method: String,
    #[serde(default)]
    pub params: serde_json::Value,
}

#[derive(Debug, Serialize)]
pub struct McpResponse {
    pub jsonrpc: String,
    pub id: serde_json::Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<McpError>,
}

#[derive(Debug, Serialize)]
pub struct McpError {
    pub code: i32,
    pub message: String,
    pub data: Option<serde_json::Value>,
}

// ─────────────────────────────────────────────────────────────────────────────
// Discovery state
// ─────────────────────────────────────────────────────────────────────────────

pub struct DiscoveryState {
    pub product_repo: Arc<dyn ProductRepository>,
    pub network: String,
    pub payment_address: String,
    pub token_mint: String,
    pub service_endpoint: String,
    /// Whether Stripe payment method is enabled (from config)
    pub stripe_enabled: bool,
    /// Whether x402 (crypto) payment method is enabled (from config)
    pub x402_enabled: bool,
    /// Whether credits payment method is enabled (from config)
    pub credits_enabled: bool,
}

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

/// GET /.well-known/payment-options - Payment method discovery
pub async fn payment_options(
    State(state): State<Arc<DiscoveryState>>,
    tenant: TenantContext,
) -> impl IntoResponse {
    let products = match state.product_repo.list_products(&tenant.tenant_id).await {
        Ok(products) => products,
        Err(e) => {
            tracing::error!(error = %e, "Failed to load products for payment discovery");
            return (
                StatusCode::SERVICE_UNAVAILABLE,
                Json(serde_json::json!({
                    "error": "service_unavailable",
                    "message": "Failed to load products"
                })),
            );
        }
    };

    let resources: Vec<ResourceInfo> = products
        .iter()
        .map(|p| ResourceInfo {
            id: p.id.clone(),
            name: p.description.clone(),
            description: Some(p.description.clone()),
            endpoint: format!("/paywall/{}", p.id),
            price: PriceInfo {
                fiat: p.fiat_price.as_ref().map(|price| FiatPrice {
                    amount: price.to_major(),
                    currency: price.asset.code.clone(),
                }),
                crypto: p.crypto_price.as_ref().map(|price| CryptoPrice {
                    amount: price.to_major(),
                    token: price.asset.code.clone(),
                }),
            },
            metadata: serde_json::to_value(&p.metadata).unwrap_or_else(|_| serde_json::json!({})),
        })
        .collect();

    // Build payment methods list based on config enabled flags
    let mut methods = Vec::new();
    if state.stripe_enabled {
        methods.push("stripe".to_string());
    }
    if state.x402_enabled {
        methods.push("x402-solana-spl-transfer".to_string());
    }
    if state.credits_enabled {
        methods.push("credits".to_string());
    }

    let resp = PaymentOptionsResponse {
        version: "1.0".to_string(),
        server: "cedros-pay".to_string(),
        resources,
        payment: PaymentInfo {
            methods,
            x402: Some(X402Info {
                network: state.network.clone(),
                payment_address: state.payment_address.clone(),
                token_mint: state.token_mint.clone(),
            }),
        },
    };

    json_ok(resp)
}

/// GET /.well-known/agent.json - Agent protocol card
pub async fn agent_json(State(state): State<Arc<DiscoveryState>>) -> impl IntoResponse {
    let resp = AgentJsonResponse {
        name: "Cedros Pay".to_string(),
        version: "1.0".to_string(),
        description: "Unified payment gateway for Stripe and x402 crypto payments".to_string(),
        service_endpoint: state.service_endpoint.clone(),
        capabilities: vec![
            "payment-processing".to_string(),
            "x402-payment".to_string(),
            "stripe-checkout".to_string(),
            "product-catalog".to_string(),
            "webhook-notifications".to_string(),
            "coupon-support".to_string(),
        ],
        authentication: AuthInfo {
            auth_type: "hybrid".to_string(),
            schemes: vec![
                "x402".to_string(),
                "stripe-session".to_string(),
                "none".to_string(),
            ],
        },
        payment_methods: vec![
            PaymentMethodInfo {
                method_type: "cryptocurrency".to_string(),
                protocol: "x402-solana-spl-transfer".to_string(),
                network: Some(state.network.clone()),
                description: "Instant USDC payments on Solana".to_string(),
            },
            PaymentMethodInfo {
                method_type: "fiat".to_string(),
                protocol: "stripe".to_string(),
                network: None,
                description: "Credit/debit card payments".to_string(),
            },
            PaymentMethodInfo {
                method_type: "credits".to_string(),
                protocol: "cedros-credits".to_string(),
                network: None,
                description: "Pay with cedros-login credits balance".to_string(),
            },
        ],
        metadata: AgentMetadata {
            project_url: "https://github.com/CedrosPay/server".to_string(),
            documentation: "https://docs.cedros.io".to_string(),
            discovery_rfc8615: "/.well-known/payment-options".to_string(),
            discovery_mcp: "POST /resources/list".to_string(),
            openapi_spec: "/openapi.json".to_string(),
        },
    };

    Json(resp)
}

/// POST /resources/list - MCP resources list (JSON-RPC 2.0)
pub async fn mcp_resources_list(
    State(state): State<Arc<DiscoveryState>>,
    tenant: TenantContext,
    Json(req): Json<McpRequest>,
) -> impl IntoResponse {
    if req.method != "resources/list" {
        let resp = McpResponse {
            jsonrpc: "2.0".to_string(),
            id: req.id,
            result: None,
            error: Some(McpError {
                code: -32601,
                message: "Method not found".to_string(),
                data: None,
            }),
        };
        return (StatusCode::OK, Json(resp));
    }

    let products = match state.product_repo.list_products(&tenant.tenant_id).await {
        Ok(products) => products,
        Err(e) => {
            tracing::error!(error = %e, "Failed to load products for MCP discovery");
            let resp = McpResponse {
                jsonrpc: "2.0".to_string(),
                id: req.id,
                result: None,
                error: Some(McpError {
                    code: -32603, // Internal error
                    message: "Failed to load products".to_string(),
                    data: None,
                }),
            };
            return (StatusCode::SERVICE_UNAVAILABLE, Json(resp));
        }
    };

    let resources: Vec<serde_json::Value> = products
        .iter()
        .map(|p| {
            serde_json::json!({
                "uri": format!("cedros-pay://paywall/{}", p.id),
                "name": p.description.clone(),
                "description": p.description.clone(),
                "mimeType": "application/json"
            })
        })
        .collect();

    let resp = McpResponse {
        jsonrpc: "2.0".to_string(),
        id: req.id,
        result: Some(serde_json::json!({ "resources": resources })),
        error: None,
    };

    (StatusCode::OK, Json(resp))
}

/// GET /openapi.json - OpenAPI specification
pub async fn openapi_spec() -> impl IntoResponse {
    // Return a minimal OpenAPI spec
    // In production, this would be generated from route definitions
    let spec = serde_json::json!({
        "openapi": "3.0.3",
        "info": {
            "title": "Cedros Pay API",
            "version": "1.0.0",
            "description": "Unified payment gateway for Stripe and x402 crypto payments"
        },
        "servers": [
            { "url": "/", "description": "Current server" }
        ],
        "paths": {
            "/cedros-health": {
                "get": {
                    "summary": "Health check",
                    "responses": {
                        "200": { "description": "Server is healthy" }
                    }
                }
            },
            "/paywall/v1/quote": {
                "post": {
                    "summary": "Get payment quote",
                    "responses": {
                        "402": { "description": "Payment required with quote" }
                    }
                }
            },
            "/paywall/v1/verify": {
                "post": {
                    "summary": "Verify x402 payment",
                    "responses": {
                        "200": { "description": "Payment verified" }
                    }
                }
            }
        }
    });

    (
        StatusCode::OK,
        [("Content-Type", "application/json")],
        Json(spec),
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::response::IntoResponse;
    use http_body_util::BodyExt;

    use crate::repositories::InMemoryProductRepository;

    #[tokio::test]
    async fn test_agent_json_uses_service_endpoint() {
        let state = Arc::new(DiscoveryState {
            product_repo: Arc::new(InMemoryProductRepository::new(Vec::new())),
            network: "mainnet-beta".to_string(),
            payment_address: "pay-addr".to_string(),
            token_mint: "mint-addr".to_string(),
            service_endpoint: "https://pay.example.com".to_string(),
            stripe_enabled: true,
            x402_enabled: true,
            credits_enabled: false,
        });

        let response = agent_json(State(state)).await.into_response();
        let body = response
            .into_body()
            .collect()
            .await
            .expect("collect body")
            .to_bytes();
        let json: serde_json::Value = serde_json::from_slice(&body).expect("parse json");

        assert_eq!(json["service_endpoint"], "https://pay.example.com");
    }
}
