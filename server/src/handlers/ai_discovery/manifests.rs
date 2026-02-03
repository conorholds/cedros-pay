//! Standard manifest endpoints for AI discovery.
//!
//! - /.well-known/ai-discovery.json - Canonical entry point
//! - /.well-known/ai-plugin.json - OpenAI plugin manifest
//! - /.well-known/agent.json - A2A Agent Card (enhanced version)
//! - /.well-known/mcp - MCP server discovery (GET)

use axum::{response::IntoResponse, Json};

use super::content::{get_skills, SERVICE_DESCRIPTION, SERVICE_NAME, VERSION};
use super::types::{
    A2aAgentCard, A2aAuthScheme, A2aAuthentication, A2aCapabilities, A2aProvider, A2aScope,
    A2aSkill, AiDiscoveryEndpoints, AiDiscoveryIndex, AiPluginApi, AiPluginAuth, AiPluginManifest,
    McpAuth, McpCapabilities, McpDiscovery, McpTool,
};

/// GET /.well-known/ai-discovery.json - Canonical entry point
pub async fn ai_discovery_json() -> impl IntoResponse {
    let skills = get_skills();

    let index = AiDiscoveryIndex {
        version: "1.0.0".to_string(),
        name: SERVICE_NAME.to_string(),
        description: SERVICE_DESCRIPTION.to_string(),
        endpoints: AiDiscoveryEndpoints {
            llms_txt: "/llms.txt".to_string(),
            llms_full_txt: "/llms-full.txt".to_string(),
            llms_admin_txt: "/llms-admin.txt".to_string(),
            skill_index_markdown: "/skill.md".to_string(),
            skill_index_json: "/skill.json".to_string(),
            agent_guide: "/agent.md".to_string(),
            openapi: "/openapi.json".to_string(),
            a2a_agent_card: "/.well-known/agent.json".to_string(),
            ai_plugin: "/.well-known/ai-plugin.json".to_string(),
            mcp: "/.well-known/mcp".to_string(),
            health: "/heartbeat.json".to_string(),
            auth_discovery: "/.well-known/payment-options".to_string(),
            skills_bundle: "/.well-known/skills.zip".to_string(),
        },
        skills,
    };

    Json(index)
}

/// GET /.well-known/ai-plugin.json - OpenAI plugin manifest
pub async fn ai_plugin_json() -> impl IntoResponse {
    let manifest = AiPluginManifest {
        schema_version: "v1".to_string(),
        name_for_human: "Cedros Pay".to_string(),
        name_for_model: "cedros_pay".to_string(),
        description_for_human: "E-commerce payments with Stripe, crypto, and AI shopping assistant"
            .to_string(),
        description_for_model: format!(
            "{}. Use this to help users browse products, manage carts, checkout, \
            and get answers about store policies. The /chat endpoint provides an AI assistant \
            that can search products and answer questions.",
            SERVICE_DESCRIPTION
        ),
        auth: AiPluginAuth {
            auth_type: "none".to_string(),
            instructions:
                "Most endpoints are public. Admin endpoints require Authorization header."
                    .to_string(),
        },
        api: AiPluginApi {
            api_type: "openapi".to_string(),
            url: "/openapi.json".to_string(),
        },
        logo_url: "https://cedros.io/logo.png".to_string(),
        contact_email: "support@cedros.io".to_string(),
        legal_info_url: "https://cedros.io/legal".to_string(),
    };

    Json(manifest)
}

/// GET /.well-known/agent.json - A2A Agent Card (API-first)
pub async fn a2a_agent_json() -> impl IntoResponse {
    let skills = get_skills();

    let a2a_skills: Vec<A2aSkill> = skills
        .iter()
        .map(|s| A2aSkill {
            id: s.id.clone(),
            name: s.name.clone(),
            description: s.description.clone(),
            input_modes: vec!["application/json".to_string()],
            output_modes: vec!["application/json".to_string()],
            documentation_url: s.path.clone(),
            openapi_tag: Some(s.name.clone()),
            required_scopes: if s.requires_admin == Some(true) {
                Some(vec!["admin:read".to_string(), "admin:write".to_string()])
            } else if s.requires_auth == Some(true) {
                Some(vec!["user:read".to_string()])
            } else {
                None
            },
        })
        .collect();

    let agent_card = A2aAgentCard {
        name: "Cedros Pay".to_string(),
        description: SERVICE_DESCRIPTION.to_string(),
        url: "/".to_string(),
        version: VERSION.to_string(),
        capabilities: A2aCapabilities {
            streaming: false,
            push_notifications: true, // webhooks
            state_management: true,   // cart sessions
        },
        authentication: A2aAuthentication {
            schemes: vec![
                A2aAuthScheme {
                    scheme: "bearer".to_string(),
                    description: "API key authentication".to_string(),
                    instructions_url: "/agent.md".to_string(),
                    token_url: None,
                },
                A2aAuthScheme {
                    scheme: "oauth2".to_string(),
                    description: "cedros-login JWT tokens".to_string(),
                    instructions_url: "/skills/subscriptions.md".to_string(),
                    token_url: Some("/login".to_string()),
                },
                A2aAuthScheme {
                    scheme: "x402".to_string(),
                    description: "Crypto payment protocol (USDC on Solana)".to_string(),
                    instructions_url: "/skills/checkout.md".to_string(),
                    token_url: None,
                },
            ],
            scopes: vec![
                A2aScope {
                    name: "user:read".to_string(),
                    description: "Read user data and subscriptions".to_string(),
                },
                A2aScope {
                    name: "user:write".to_string(),
                    description: "Modify user data".to_string(),
                },
                A2aScope {
                    name: "admin:read".to_string(),
                    description: "Read admin data (products, orders, customers)".to_string(),
                },
                A2aScope {
                    name: "admin:write".to_string(),
                    description: "Perform admin operations".to_string(),
                },
            ],
        },
        skills: a2a_skills,
        documentation_url: "/llms-full.txt".to_string(),
        provider: A2aProvider {
            name: "Cedros".to_string(),
            url: "https://cedros.io".to_string(),
        },
    };

    Json(agent_card)
}

/// GET /.well-known/mcp - MCP server discovery
pub async fn mcp_discovery() -> impl IntoResponse {
    let discovery = McpDiscovery {
        name: SERVICE_NAME.to_string(),
        version: VERSION.to_string(),
        protocol_version: "2024-11-05".to_string(),
        description: SERVICE_DESCRIPTION.to_string(),
        capabilities: McpCapabilities {
            tools: true,
            resources: true,
            prompts: false,
            sampling: false,
        },
        tools: vec![
            McpTool {
                name: "search_products".to_string(),
                description: "Search the product catalog".to_string(),
                input_schema: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "Search query"
                        },
                        "limit": {
                            "type": "integer",
                            "description": "Max results (default 10)"
                        }
                    },
                    "required": ["query"]
                }),
            },
            McpTool {
                name: "get_product".to_string(),
                description: "Get product details by ID".to_string(),
                input_schema: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "productId": {
                            "type": "string",
                            "description": "Product ID"
                        }
                    },
                    "required": ["productId"]
                }),
            },
            McpTool {
                name: "create_cart".to_string(),
                description: "Create a shopping cart".to_string(),
                input_schema: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "items": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "productId": {"type": "string"},
                                    "variantId": {"type": "string"},
                                    "quantity": {"type": "integer"}
                                },
                                "required": ["productId", "quantity"]
                            }
                        }
                    },
                    "required": ["items"]
                }),
            },
            McpTool {
                name: "chat".to_string(),
                description: "Send message to AI shopping assistant".to_string(),
                input_schema: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "message": {
                            "type": "string",
                            "description": "User message"
                        },
                        "sessionId": {
                            "type": "string",
                            "description": "Session ID for conversation continuity"
                        }
                    },
                    "required": ["message"]
                }),
            },
            McpTool {
                name: "get_checkout_url".to_string(),
                description: "Get Stripe checkout URL for a cart".to_string(),
                input_schema: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "cartId": {
                            "type": "string",
                            "description": "Cart ID"
                        },
                        "successUrl": {
                            "type": "string",
                            "description": "URL to redirect on success"
                        },
                        "cancelUrl": {
                            "type": "string",
                            "description": "URL to redirect on cancel"
                        }
                    },
                    "required": ["cartId", "successUrl", "cancelUrl"]
                }),
            },
        ],
        authentication: McpAuth {
            required: false,
            schemes: vec!["bearer".to_string(), "x402".to_string()],
            instructions: "Most operations are public. Admin tools require Authorization header."
                .to_string(),
        },
    };

    Json(discovery)
}
