//! Static content and skill definitions for AI discovery.
//!
//! This module provides both handlers and composable content functions.
//! For library consumers who want to compose unified discovery:
//!
//! ```ignore
//! use cedros_pay::ai_discovery::{get_skills_with_base, get_llms_content};
//!
//! // Get skills with custom base path for federated discovery
//! let skills = get_skills_with_base("/pay");
//!
//! // Get llms.txt content with custom base
//! let content = get_llms_content("/pay");
//! ```

use super::types::{
    AiDiscoveryEndpoints, AiDiscoveryIndex, Capabilities, DownloadableBundles, RateLimits,
    SkillAuth, SkillMetadata, SkillReference,
};

pub const VERSION: &str = "1.0.0";
pub const SERVICE_NAME: &str = "cedros-pay";
pub const SERVICE_DESCRIPTION: &str =
    "E-commerce payment API with products, cart, checkout, subscriptions, and AI chat support";

// ============================================================================
// Composable content functions (for library consumers)
// ============================================================================

/// Get all skill definitions with paths prefixed by base_path.
///
/// # Arguments
/// * `base_path` - Path prefix (e.g., "/pay" for federated setup, "" for standalone)
///
/// # Example
/// ```ignore
/// let skills = get_skills_with_base("/pay");
/// // skills[0].path == "/pay/skills/products.md"
/// ```
pub fn get_skills_with_base(base_path: &str) -> Vec<SkillReference> {
    let prefix = base_path.trim_end_matches('/');
    vec![
        SkillReference {
            id: "products".to_string(),
            name: "Products".to_string(),
            path: format!("{}/skills/products.md", prefix),
            description: "Browse products, collections, FAQs, and search catalog".to_string(),
            requires_auth: Some(false),
            requires_admin: None,
        },
        SkillReference {
            id: "cart".to_string(),
            name: "Cart".to_string(),
            path: format!("{}/skills/cart.md", prefix),
            description: "Shopping cart — quote, checkout, and verify".to_string(),
            requires_auth: Some(false),
            requires_admin: None,
        },
        SkillReference {
            id: "checkout".to_string(),
            name: "Checkout".to_string(),
            path: format!("{}/skills/checkout.md", prefix),
            description: "Payment processing — Stripe, x402 crypto, and credits".to_string(),
            requires_auth: Some(false),
            requires_admin: None,
        },
        SkillReference {
            id: "chat".to_string(),
            name: "Chat".to_string(),
            path: format!("{}/skills/chat.md", prefix),
            description: "AI-powered shopping assistant with product search and FAQ".to_string(),
            requires_auth: Some(false),
            requires_admin: None,
        },
        SkillReference {
            id: "subscriptions".to_string(),
            name: "Subscriptions".to_string(),
            path: format!("{}/skills/subscriptions.md", prefix),
            description: "Recurring payment subscriptions via Stripe, x402, or credits"
                .to_string(),
            requires_auth: Some(true),
            requires_admin: None,
        },
        SkillReference {
            id: "admin".to_string(),
            name: "Admin".to_string(),
            path: format!("{}/skills/admin.md", prefix),
            description:
                "Administrative operations — products, orders, customers, shipping, compliance"
                    .to_string(),
            requires_auth: Some(true),
            requires_admin: Some(true),
        },
    ]
}

/// Get AI discovery index with paths prefixed by base_path.
pub fn get_ai_discovery_index(base_path: &str) -> AiDiscoveryIndex {
    let prefix = base_path.trim_end_matches('/');
    AiDiscoveryIndex {
        version: "1.0.0".to_string(),
        name: SERVICE_NAME.to_string(),
        description: SERVICE_DESCRIPTION.to_string(),
        endpoints: AiDiscoveryEndpoints {
            llms_txt: format!("{}/llms.txt", prefix),
            llms_full_txt: format!("{}/llms-full.txt", prefix),
            llms_admin_txt: format!("{}/llms-admin.txt", prefix),
            skill_index_markdown: format!("{}/skill.md", prefix),
            skill_index_json: format!("{}/skill.json", prefix),
            agent_guide: format!("{}/agent.md", prefix),
            openapi: format!("{}/openapi.json", prefix),
            a2a_agent_card: format!("{}/.well-known/agent.json", prefix),
            ai_plugin: format!("{}/.well-known/ai-plugin.json", prefix),
            mcp: format!("{}/.well-known/mcp", prefix),
            health: format!("{}/heartbeat.json", prefix),
            auth_discovery: format!("{}/.well-known/payment-options", prefix),
            skills_bundle: format!("{}/.well-known/skills.zip", prefix),
        },
        skills: get_skills_with_base(base_path),
    }
}

/// Get skill metadata (skill.json content) with paths prefixed by base_path.
pub fn get_skill_metadata(base_path: &str) -> SkillMetadata {
    let prefix = base_path.trim_end_matches('/');
    SkillMetadata {
        name: SERVICE_NAME.to_string(),
        version: VERSION.to_string(),
        description: SERVICE_DESCRIPTION.to_string(),
        homepage: "https://cedros.io".to_string(),
        api_base: prefix.to_string(),
        category: "e-commerce".to_string(),
        capabilities: Capabilities::default(),
        skills: get_skills_with_base(base_path),
        authentication: SkillAuth {
            methods: vec!["api_key".to_string(), "jwt".to_string(), "x402".to_string()],
            recommended: "api_key".to_string(),
            api_key_prefix: Some("Bearer".to_string()),
            header: "Authorization".to_string(),
        },
        rate_limits: RateLimits {
            auth_endpoints: "100 req/min per IP".to_string(),
            api_endpoints: "100 req/min per IP".to_string(),
            admin_endpoints: "60 req/min per key".to_string(),
        },
        downloadable_bundles: Some(DownloadableBundles {
            claude_code: format!("{}/.well-known/skills.zip", prefix),
            codex: format!("{}/.well-known/skills.zip", prefix),
        }),
    }
}

/// Get llms.txt content with paths prefixed by base_path.
pub fn get_llms_content(base_path: &str) -> String {
    let prefix = base_path.trim_end_matches('/');
    let skills = get_skills_with_base(base_path)
        .into_iter()
        .filter(|s| s.requires_admin != Some(true))
        .collect::<Vec<_>>();

    let skills_str: String = skills
        .iter()
        .map(|s| format!("- [{}]({}): {}", s.path, s.path, s.description))
        .collect::<Vec<_>>()
        .join("\n");

    format!(
        r#"# {name}

> {description}

Cedros Pay is an e-commerce payment API supporting Stripe, crypto (x402/Solana), and credits payments. Features include product catalog, shopping cart, checkout, subscriptions, gift cards, coupons, and AI-powered chat assistant.

## Quick Start

1. Browse products: `GET {prefix}/paywall/v1/products`
2. Get cart quote: `POST {prefix}/paywall/v1/cart/quote` with items
3. Checkout (Stripe): `POST {prefix}/paywall/v1/cart/checkout`
4. Or verify (x402): `POST {prefix}/paywall/v1/cart/{{cartId}}/verify`

## Docs

- [{prefix}/agent.md]({prefix}/agent.md): Agent integration guide with code examples
- [{prefix}/llms-full.txt]({prefix}/llms-full.txt): Complete API documentation
- [{prefix}/llms-admin.txt]({prefix}/llms-admin.txt): Admin operations reference

## Skills

{skills}

## API

- [{prefix}/openapi.json]({prefix}/openapi.json): Full OpenAPI 3.0 specification
- [{prefix}/skill.json]({prefix}/skill.json): Machine-readable skill metadata
- [{prefix}/.well-known/ai-discovery.json]({prefix}/.well-known/ai-discovery.json): AI discovery index
"#,
        name = SERVICE_NAME,
        description = SERVICE_DESCRIPTION,
        prefix = prefix,
        skills = skills_str
    )
}

/// Get llms-full.txt content with paths prefixed by base_path.
pub fn get_llms_full_content(base_path: &str) -> String {
    let prefix = base_path.trim_end_matches('/');
    let skills = get_skills_with_base(base_path);
    let skills_str: String = skills
        .iter()
        .map(|s| format!("- [{}]({}): {}", s.path, s.path, s.description))
        .collect::<Vec<_>>()
        .join("\n");

    format!(
        r#"# {name} API

> {description}

All endpoints are relative to the API base URL: {prefix}

## Authentication for AI Agents

### Public Endpoints (No Auth Required)

Most read operations and the chat endpoint are public:
- `GET {prefix}/paywall/v1/products` — List products
- `GET {prefix}/paywall/v1/collections` — List collections
- `GET {prefix}/paywall/v1/faqs` — List FAQs
- `POST {prefix}/paywall/v1/cart/quote` — Create cart quote
- `POST {prefix}/paywall/v1/chat` — AI chat assistant

### Authenticated Endpoints

Subscription and credits endpoints require a Bearer JWT:
```
Authorization: Bearer <jwt-token>
```

Admin operations require Ed25519 signature:
```
X-Signer: <base58-public-key>
X-Message: <message>
X-Signature: <base58-signature>
```

## Core Endpoints

### Products & Catalog

| Method | Path | Description |
|--------|------|-------------|
| GET | {prefix}/paywall/v1/products | List products (paginated) |
| GET | {prefix}/paywall/v1/products/{{id}} | Get product details |
| GET | {prefix}/paywall/v1/products/by-slug/{{slug}} | Get product by slug |
| GET | {prefix}/paywall/v1/products/{{id}}/nft-metadata | NFT metadata |
| GET | {prefix}/paywall/v1/products.txt | Products as plain text |
| GET | {prefix}/paywall/v1/collections | List collections |
| GET | {prefix}/paywall/v1/collections/{{id}} | Get collection |
| GET | {prefix}/paywall/v1/faqs | List FAQs |

### Cart & Checkout

| Method | Path | Description |
|--------|------|-------------|
| POST | {prefix}/paywall/v1/cart/quote | Create cart and get quote |
| POST | {prefix}/paywall/v1/cart/checkout | Stripe checkout |
| GET | {prefix}/paywall/v1/cart/{{cartId}} | Get cart details |
| POST | {prefix}/paywall/v1/cart/{{cartId}}/verify | Verify x402 payment |
| GET | {prefix}/paywall/v1/cart/{{cartId}}/inventory-status | Check inventory |
| POST | {prefix}/paywall/v1/cart/{{cartId}}/credits/authorize | Pay with credits |
| POST | {prefix}/paywall/v1/cart/{{cartId}}/credits/hold | Place credits hold |
| POST | {prefix}/paywall/v1/coupons/validate | Validate coupon |

### Single-Resource Payment

| Method | Path | Description |
|--------|------|-------------|
| POST | {prefix}/paywall/v1/quote | Get x402 quote (HTTP 402) |
| POST | {prefix}/paywall/v1/verify | Verify x402 payment |
| POST | {prefix}/paywall/v1/stripe-session | Create Stripe session |
| GET | {prefix}/paywall/v1/stripe-session/verify | Verify Stripe session |
| GET | {prefix}/paywall/v1/x402-transaction/verify | Verify x402 tx |

### Credits

| Method | Path | Description |
|--------|------|-------------|
| GET | {prefix}/paywall/v1/credits/balance | Get balance |
| POST | {prefix}/paywall/v1/credits/authorize | Authorize payment |
| POST | {prefix}/paywall/v1/credits/hold | Place hold |
| POST | {prefix}/paywall/v1/credits/hold/{{holdId}}/release | Release hold |

### Purchases & Refunds

| Method | Path | Description |
|--------|------|-------------|
| GET | {prefix}/paywall/v1/purchases | List purchases |
| POST | {prefix}/paywall/v1/refunds/request | Request refund |
| POST | {prefix}/paywall/v1/refunds/approve | Approve refund |
| POST | {prefix}/paywall/v1/refunds/deny | Deny refund |
| POST | {prefix}/paywall/v1/refunds/pending | List pending |
| GET | {prefix}/paywall/v1/refunds/{{refundId}} | Get refund details |
| POST | {prefix}/paywall/v1/nonce | Create refund nonce |

### Subscriptions

| Method | Path | Description |
|--------|------|-------------|
| GET | {prefix}/paywall/v1/subscription/status | Get status |
| GET | {prefix}/paywall/v1/subscription/details | Get details |
| POST | {prefix}/paywall/v1/subscription/stripe-session | Stripe subscribe |
| POST | {prefix}/paywall/v1/subscription/quote | x402 quote |
| POST | {prefix}/paywall/v1/subscription/x402/activate | x402 activate |
| POST | {prefix}/paywall/v1/subscription/credits/activate | Credits activate |
| POST | {prefix}/paywall/v1/subscription/cancel | Cancel |
| POST | {prefix}/paywall/v1/subscription/portal | Billing portal |
| POST | {prefix}/paywall/v1/subscription/change/preview | Preview change |
| POST | {prefix}/paywall/v1/subscription/change | Change plan |
| POST | {prefix}/paywall/v1/subscription/reactivate | Reactivate |

### Gift Cards

| Method | Path | Description |
|--------|------|-------------|
| GET | {prefix}/paywall/v1/gift-card/claim/{{token}} | Get claim info |
| POST | {prefix}/paywall/v1/gift-card/claim/{{token}} | Claim gift card |
| GET | {prefix}/paywall/v1/gift-card/balance/{{code}} | Check balance |

### Asset Redemptions

| Method | Path | Description |
|--------|------|-------------|
| GET | {prefix}/paywall/v1/asset-redemption/{{productId}}/form | Get form |
| POST | {prefix}/paywall/v1/asset-redemption/{{productId}}/submit | Submit |
| GET | {prefix}/paywall/v1/asset-redemption/{{productId}}/status | Status |

### Chat (AI Assistant)

| Method | Path | Description |
|--------|------|-------------|
| POST | {prefix}/paywall/v1/chat | Send message |

### Compliance & Storefront

| Method | Path | Description |
|--------|------|-------------|
| POST | {prefix}/paywall/v1/compliance-check | Check wallet compliance |
| GET | {prefix}/paywall/v1/shop | Get shop config |
| GET | {prefix}/paywall/v1/storefront | Get storefront config |

## Error Format

```json
{{{{
  "code": "error_code",
  "message": "Human-readable description",
  "details": {{{{}}}}
}}}}
```

Common error codes:
- `invalid_field` — Validation error
- `not_found` — Resource not found
- `rate_limited` — Too many requests
- `unauthorized` — Authentication required
- `forbidden` — Insufficient permissions

## Rate Limits

| Category | Limit |
|----------|-------|
| Public endpoints | 100 req/min per IP |
| Admin endpoints | 60 req/min per key |
| Chat endpoint | 20 req/min per session |

## Docs

- [{prefix}/agent.md]({prefix}/agent.md): Integration guide
- [{prefix}/llms.txt]({prefix}/llms.txt): Brief summary
- [{prefix}/llms-admin.txt]({prefix}/llms-admin.txt): Admin operations

## Skills

{skills}

## API

- [{prefix}/openapi.json]({prefix}/openapi.json): Full OpenAPI spec
- [{prefix}/skill.json]({prefix}/skill.json): Skill metadata
- [{prefix}/.well-known/ai-discovery.json]({prefix}/.well-known/ai-discovery.json): Discovery index
"#,
        name = SERVICE_NAME,
        description = SERVICE_DESCRIPTION,
        prefix = prefix,
        skills = skills_str
    )
}

// ============================================================================
// Original functions (for internal handler use)
// ============================================================================

/// Get all skill definitions (standalone mode, no prefix)
pub fn get_skills() -> Vec<SkillReference> {
    get_skills_with_base("")
}

/// Get skills that don't require admin
pub fn get_public_skills() -> Vec<SkillReference> {
    get_skills()
        .into_iter()
        .filter(|s| s.requires_admin != Some(true))
        .collect()
}

/// Individual skill file content
pub fn get_skill_content(skill_id: &str) -> Option<String> {
    use super::skill_docs::*;
    match skill_id {
        "products" => Some(SKILL_PRODUCTS.to_string()),
        "cart" => Some(SKILL_CART.to_string()),
        "checkout" => Some(SKILL_CHECKOUT.to_string()),
        "chat" => Some(SKILL_CHAT.to_string()),
        "subscriptions" => Some(SKILL_SUBSCRIPTIONS.to_string()),
        "admin" => Some(SKILL_ADMIN.to_string()),
        _ => None,
    }
}
