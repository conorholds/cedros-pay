//! Shared types for AI discovery endpoints.

use serde::{Deserialize, Serialize};

/// Skill reference in skill index
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillReference {
    pub id: String,
    pub name: String,
    pub path: String,
    pub description: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub requires_auth: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub requires_admin: Option<bool>,
}

/// Authentication info for skill metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillAuth {
    pub methods: Vec<String>,
    pub recommended: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub api_key_prefix: Option<String>,
    pub header: String,
}

/// Rate limits info
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RateLimits {
    pub auth_endpoints: String,
    pub api_endpoints: String,
    pub admin_endpoints: String,
}

/// Capabilities map
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Capabilities {
    pub products: bool,
    pub cart: bool,
    pub checkout: bool,
    pub subscriptions: bool,
    pub gift_cards: bool,
    pub coupons: bool,
    pub chat: bool,
    pub faq: bool,
    pub ai_assistant: bool,
    pub stripe_payments: bool,
    pub crypto_payments: bool,
    pub credits_payments: bool,
}

impl Default for Capabilities {
    fn default() -> Self {
        Self {
            products: true,
            cart: true,
            checkout: true,
            subscriptions: true,
            gift_cards: true,
            coupons: true,
            chat: true,
            faq: true,
            ai_assistant: true,
            stripe_payments: true,
            crypto_payments: true,
            credits_payments: true,
        }
    }
}

/// Downloadable bundles URLs
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadableBundles {
    pub claude_code: String,
    pub codex: String,
}

/// skill.json response
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillMetadata {
    pub name: String,
    pub version: String,
    pub description: String,
    pub homepage: String,
    pub api_base: String,
    pub category: String,
    pub capabilities: Capabilities,
    pub skills: Vec<SkillReference>,
    pub authentication: SkillAuth,
    pub rate_limits: RateLimits,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub downloadable_bundles: Option<DownloadableBundles>,
}

/// AI discovery index (/.well-known/ai-discovery.json)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiDiscoveryIndex {
    pub version: String,
    pub name: String,
    pub description: String,
    pub endpoints: AiDiscoveryEndpoints,
    pub skills: Vec<SkillReference>,
}

/// Endpoints map for ai-discovery.json
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiDiscoveryEndpoints {
    pub llms_txt: String,
    pub llms_full_txt: String,
    pub llms_admin_txt: String,
    pub skill_index_markdown: String,
    pub skill_index_json: String,
    pub agent_guide: String,
    pub openapi: String,
    pub a2a_agent_card: String,
    pub ai_plugin: String,
    pub mcp: String,
    pub health: String,
    pub auth_discovery: String,
    pub skills_bundle: String,
}

/// Heartbeat response (JSON)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HeartbeatResponse {
    pub status: String,
    pub version: String,
    pub timestamp: String,
    pub services: HeartbeatServices,
}

/// Service status for heartbeat
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HeartbeatServices {
    pub api: bool,
    pub database: bool,
    pub cache: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stripe: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rpc: Option<bool>,
}

/// OpenAI plugin manifest
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiPluginManifest {
    pub schema_version: String,
    pub name_for_human: String,
    pub name_for_model: String,
    pub description_for_human: String,
    pub description_for_model: String,
    pub auth: AiPluginAuth,
    pub api: AiPluginApi,
    pub logo_url: String,
    pub contact_email: String,
    pub legal_info_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiPluginAuth {
    #[serde(rename = "type")]
    pub auth_type: String,
    pub instructions: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiPluginApi {
    #[serde(rename = "type")]
    pub api_type: String,
    pub url: String,
}

/// MCP server discovery
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct McpDiscovery {
    pub name: String,
    pub version: String,
    pub protocol_version: String,
    pub description: String,
    pub capabilities: McpCapabilities,
    pub tools: Vec<McpTool>,
    pub authentication: McpAuth,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct McpCapabilities {
    pub tools: bool,
    pub resources: bool,
    pub prompts: bool,
    pub sampling: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct McpTool {
    pub name: String,
    pub description: String,
    pub input_schema: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct McpAuth {
    pub required: bool,
    pub schemes: Vec<String>,
    pub instructions: String,
}

/// A2A Agent Card (Google A2A protocol)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct A2aAgentCard {
    pub name: String,
    pub description: String,
    pub url: String,
    pub version: String,
    pub capabilities: A2aCapabilities,
    pub authentication: A2aAuthentication,
    pub skills: Vec<A2aSkill>,
    pub documentation_url: String,
    pub provider: A2aProvider,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct A2aCapabilities {
    pub streaming: bool,
    pub push_notifications: bool,
    pub state_management: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct A2aAuthentication {
    pub schemes: Vec<A2aAuthScheme>,
    pub scopes: Vec<A2aScope>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct A2aAuthScheme {
    pub scheme: String,
    pub description: String,
    pub instructions_url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub token_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct A2aScope {
    pub name: String,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct A2aSkill {
    pub id: String,
    pub name: String,
    pub description: String,
    pub input_modes: Vec<String>,
    pub output_modes: Vec<String>,
    pub documentation_url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub openapi_tag: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub required_scopes: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct A2aProvider {
    pub name: String,
    pub url: String,
}
