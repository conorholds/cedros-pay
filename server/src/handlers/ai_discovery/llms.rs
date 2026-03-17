//! LLMs.txt endpoints per llmstxt.org specification.

use axum::response::IntoResponse;

use super::content::{get_llms_full_content, get_public_skills, SERVICE_DESCRIPTION, SERVICE_NAME};

/// GET /ai.txt - AI crawler permissions
pub async fn ai_txt() -> impl IntoResponse {
    let content = r#"# AI Access Policy
# This file signals permissions for AI crawlers and agents.

# Policy: Allow all AI access
User-agent: *
Allow: /

# AI Discovery Entry Point
AI-Discovery: /.well-known/ai-discovery.json

# Quick Links for AI Systems
LLMs-Txt: /llms.txt
LLMs-Full: /llms-full.txt
LLMs-Admin: /llms-admin.txt
OpenAPI: /openapi.json
Skills: /skill.json
Agent-Guide: /agent.md

# Authentication
# Public endpoints: No authentication required
# Admin endpoints: Require Ed25519 signature (X-Signer + X-Message + X-Signature)
# See /agent.md for complete authentication guide

# Rate Limits
# Public endpoints: 100 req/min per IP
# Admin endpoints: 60 req/min per key
# Chat endpoint: 20 req/min per session

# Contact
# Documentation: https://docs.cedros.io
# GitHub: https://github.com/CedrosPay
"#
    .to_string();

    ([("Content-Type", "text/plain; charset=utf-8")], content)
}

/// GET /llms.txt - Brief summary per llmstxt.org spec
pub async fn llms_txt() -> impl IntoResponse {
    let skills: Vec<String> = get_public_skills()
        .iter()
        .map(|s| format!("- [{}]({}): {}", s.path, s.path, s.description))
        .collect();

    let content = format!(
        r#"# {name}

> {description}

Cedros Pay is an e-commerce payment API supporting Stripe, crypto (x402/Solana), and credits payments. Features include product catalog, shopping cart, checkout, subscriptions, gift cards, coupons, and AI-powered chat assistant.

## Quick Start

1. Browse products: `GET /paywall/v1/products`
2. Get cart quote: `POST /paywall/v1/cart/quote` with items
3. Checkout (Stripe): `POST /paywall/v1/cart/checkout`
4. Or verify (x402): `POST /paywall/v1/cart/{{cartId}}/verify`

## Docs

- [/agent.md](/agent.md): Agent integration guide with code examples
- [/llms-full.txt](/llms-full.txt): Complete API documentation
- [/llms-admin.txt](/llms-admin.txt): Admin operations reference

## Skills

{skills}

## API

- [/openapi.json](/openapi.json): Full OpenAPI 3.0 specification
- [/skill.json](/skill.json): Machine-readable skill metadata
- [/.well-known/ai-discovery.json](/.well-known/ai-discovery.json): AI discovery index
"#,
        name = SERVICE_NAME,
        description = SERVICE_DESCRIPTION,
        skills = skills.join("\n")
    );

    ([("Content-Type", "text/plain; charset=utf-8")], content)
}

/// GET /llms-full.txt - Complete documentation
pub async fn llms_full_txt() -> impl IntoResponse {
    let content = get_llms_full_content("");

    ([("Content-Type", "text/plain; charset=utf-8")], content)
}

/// GET /llms-admin.txt - Admin operations documentation
pub async fn llms_admin_txt() -> impl IntoResponse {
    let content = format!(
        r#"# {name} Admin API

> Administrative operations for store management.

## Authentication

All admin endpoints require **Ed25519 signature** authentication:

```
X-Signer: <base58-public-key>
X-Message: <message-string>
X-Signature: <base58-signature>
```

Alternatively, a Bearer JWT with admin role:
```
Authorization: Bearer <admin-jwt>
```

## Products

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/products | List all products |
| GET | /admin/products/{{id}} | Get product |
| POST | /admin/products | Create product |
| PUT | /admin/products/{{id}} | Update product |
| DELETE | /admin/products/{{id}} | Delete product |

### Create Product Example

```
POST /admin/products
X-Signer: <key>
X-Message: <msg>
X-Signature: <sig>
Content-Type: application/json

{{
  "title": "New Product",
  "description": "Product description",
  "priceCents": 1999,
  "active": true
}}
```

## Product Variations

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/products/{{id}}/variations | Get variations |
| PUT | /admin/products/{{id}}/variations | Update variations |
| PUT | /admin/products/{{id}}/variants/inventory | Bulk update inventory |

## Inventory

| Method | Path | Description |
|--------|------|-------------|
| PUT | /admin/products/{{id}}/inventory | Set inventory level |
| POST | /admin/products/{{id}}/inventory/adjust | Adjust inventory |
| GET | /admin/products/{{id}}/inventory/adjustments | List adjustments |

## Images

| Method | Path | Description |
|--------|------|-------------|
| POST | /admin/images/upload | Upload image |
| DELETE | /admin/images | Delete image |

## Collections

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/collections | List collections |
| POST | /admin/collections | Create collection |
| GET | /admin/collections/{{id}} | Get collection |
| PUT | /admin/collections/{{id}} | Update collection |
| DELETE | /admin/collections/{{id}} | Delete collection |

## Orders

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/orders | List orders |
| GET | /admin/orders/{{id}} | Get order details |
| POST | /admin/orders/{{id}}/status | Update order status |
| POST | /admin/orders/{{id}}/fulfillments | Create fulfillment |
| POST | /admin/fulfillments/{{id}}/status | Update fulfillment status |

## Customers

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/customers | List customers |
| GET | /admin/customers/{{id}} | Get customer details |
| POST | /admin/customers | Create customer |
| PUT | /admin/customers/{{id}} | Update customer |

## Returns

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/returns | List returns |
| GET | /admin/returns/{{id}} | Get return details |
| POST | /admin/returns | Create return |
| POST | /admin/returns/{{id}}/status | Update return status |

## Disputes

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/disputes | List disputes |
| POST | /admin/disputes | Create dispute |
| GET | /admin/disputes/{{id}} | Get dispute details |
| POST | /admin/disputes/{{id}}/status | Update dispute status |

## Shipping

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/shipping/profiles | List shipping profiles |
| POST | /admin/shipping/profiles | Create profile |
| GET | /admin/shipping/profiles/{{id}} | Get profile |
| PUT | /admin/shipping/profiles/{{id}} | Update profile |
| DELETE | /admin/shipping/profiles/{{id}} | Delete profile |
| GET | /admin/shipping/profiles/{{id}}/rates | List rates |
| POST | /admin/shipping/profiles/{{id}}/rates | Create rate |
| PUT | /admin/shipping/rates/{{id}} | Update rate |
| DELETE | /admin/shipping/rates/{{id}} | Delete rate |

## Taxes

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/taxes | List tax rates |
| POST | /admin/taxes | Create tax rate |
| GET | /admin/taxes/{{id}} | Get tax rate |
| PUT | /admin/taxes/{{id}} | Update tax rate |
| DELETE | /admin/taxes/{{id}} | Delete tax rate |

## Coupons

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/coupons | List coupons |
| POST | /admin/coupons | Create coupon |
| PUT | /admin/coupons/{{id}} | Update coupon |
| DELETE | /admin/coupons/{{id}} | Delete coupon |

## Gift Cards

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/gift-cards | List gift cards |
| POST | /admin/gift-cards | Create gift card |
| GET | /admin/gift-cards/{{code}} | Get gift card |
| PUT | /admin/gift-cards/{{code}} | Update gift card |
| POST | /admin/gift-cards/{{code}}/adjust | Adjust balance |

## FAQ Management

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/faqs | List FAQ entries |
| POST | /admin/faqs | Create FAQ |
| GET | /admin/faqs/{{id}} | Get FAQ |
| PUT | /admin/faqs/{{id}} | Update FAQ |
| DELETE | /admin/faqs/{{id}} | Delete FAQ |

## Chat Sessions (CRM)

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/chats | List chat sessions |
| GET | /admin/chats/{{sessionId}} | Get chat history |
| GET | /admin/users/{{userId}}/chats | List user's chats |

## Webhooks & Dead-Letter Queue

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/webhooks | List webhooks |
| GET | /admin/webhooks/{{id}} | Get webhook details |
| POST | /admin/webhooks/{{id}}/retry | Retry webhook |
| DELETE | /admin/webhooks/{{id}} | Delete webhook |
| GET | /admin/webhooks/dlq | List dead-letter queue |
| POST | /admin/webhooks/dlq/{{id}}/retry | Retry from DLQ |
| DELETE | /admin/webhooks/dlq/{{id}} | Delete from DLQ |

## Config

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/config | List config categories |
| GET | /admin/config/{{category}} | Get config |
| PUT | /admin/config/{{category}} | Update config (full) |
| PATCH | /admin/config/{{category}} | Update config (partial) |
| POST | /admin/config/batch | Batch update |
| POST | /admin/config/validate | Validate config |
| GET | /admin/config/history | Config change history |

## AI Configuration

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/config/ai | Get AI settings |
| PUT | /admin/config/ai/api-key | Save AI API key |
| DELETE | /admin/config/ai/api-key/{{provider}} | Delete AI API key |
| PUT | /admin/config/ai/assignment | Save AI assignment |
| PUT | /admin/config/ai/prompt | Save AI prompt |

## AI Assistants

| Method | Path | Description |
|--------|------|-------------|
| POST | /admin/ai/product-assistant | Product assistant |
| POST | /admin/ai/related-products | Find related products |
| POST | /admin/ai/product-search | AI product search |

## Subscription Settings

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/subscriptions/settings | Get settings |
| PUT | /admin/subscriptions/settings | Update settings |

## Compliance

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/compliance/holders | List holders |
| GET | /admin/compliance/actions | List actions |
| POST | /admin/compliance/freeze | Freeze holder |
| POST | /admin/compliance/thaw | Thaw holder |
| GET | /admin/compliance/report | Generate report |
| GET | /admin/compliance/sweep-settings | Get sweep settings |
| PUT | /admin/compliance/sweep-settings | Update sweep settings |
| GET | /admin/compliance/sanctions-api | Get sanctions settings |
| PUT | /admin/compliance/sanctions-api | Update sanctions settings |
| POST | /admin/compliance/sanctions-api/refresh | Refresh sanctions |
| GET | /admin/compliance/user-status/{{userId}} | User compliance status |

## Token-22

| Method | Path | Description |
|--------|------|-------------|
| POST | /admin/token22/initialize | Initialize mint |
| GET | /admin/token22/status | Get Token-22 status |
| POST | /admin/token22/harvest-fees | Harvest fees |

## Asset Redemptions

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/asset-redemptions | List redemptions |
| PATCH | /admin/asset-redemptions/{{id}}/status | Update status |
| POST | /admin/asset-redemptions/{{id}}/complete | Complete redemption |

## Refunds & Transactions

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/refunds | List refunds |
| GET | /admin/stripe/refunds | List Stripe refunds |
| POST | /admin/stripe/refunds/{{id}}/process | Process Stripe refund |
| GET | /admin/credits/refund-requests | List credit refund requests |
| GET | /admin/transactions | List transactions |

## Audit & Stats

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/audit | Audit log |
| GET | /admin/stats | Dashboard statistics |

## Error Handling

Admin-specific errors:
- `unauthorized` (401) — Missing or invalid credentials
- `forbidden` (403) — Valid credentials but insufficient permissions
- `not_found` (404) — Resource doesn't exist

## API

- [/openapi.json](/openapi.json): Full OpenAPI spec
- [/llms.txt](/llms.txt): Brief summary
- [/llms-full.txt](/llms-full.txt): Complete documentation
"#,
        name = SERVICE_NAME
    );

    ([("Content-Type", "text/plain; charset=utf-8")], content)
}
