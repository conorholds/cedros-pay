//! LLMs.txt endpoints per llmstxt.org specification.

use axum::response::IntoResponse;

use super::content::{get_public_skills, get_skills, SERVICE_DESCRIPTION, SERVICE_NAME};

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
# Admin endpoints: Require Authorization header with Bearer token
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

1. Browse products: `GET /products`
2. Create cart: `POST /cart` with items
3. Get quote: `POST /cart/:cartId/quote`
4. Checkout: `POST /cart/:cartId/checkout/stripe`

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
    let skills: Vec<String> = get_skills()
        .iter()
        .map(|s| format!("- [{}]({}): {}", s.path, s.path, s.description))
        .collect();

    let content = format!(
        r#"# {name} API

> {description}

All endpoints are relative to the API base URL.

## Authentication for AI Agents

### Public Endpoints (No Auth Required)

Most read operations and the chat endpoint are public:
- `GET /products` - List products
- `GET /categories` - List categories
- `POST /cart` - Create/manage cart
- `POST /chat` - AI chat assistant

### Authenticated Endpoints

Admin operations require a Bearer token:
```
Authorization: Bearer <api-key-or-jwt>
```

## Core Endpoints

### Products

| Method | Path | Description |
|--------|------|-------------|
| GET | /products | List products (paginated) |
| GET | /products/:id | Get product details |
| GET | /categories | List categories |
| GET | /collections | List collections |

### Cart & Checkout

| Method | Path | Description |
|--------|------|-------------|
| POST | /cart | Create cart |
| GET | /cart/:id | Get cart |
| PUT | /cart/:id | Update cart |
| POST | /cart/:id/quote | Get payment quote |
| POST | /cart/:id/checkout/stripe | Stripe checkout |
| POST | /cart/:id/verify | Verify crypto payment |
| POST | /cart/:id/coupon | Apply coupon |
| POST | /cart/:id/gift-card | Apply gift card |

### Chat (AI Assistant)

| Method | Path | Description |
|--------|------|-------------|
| POST | /chat | Send message to AI assistant |

Request:
```json
{{
  "sessionId": "optional-session-id",
  "message": "Do you have any blue shirts?"
}}
```

Response:
```json
{{
  "sessionId": "sess_123",
  "message": "Yes! I found these blue shirts:",
  "products": [...],
  "faqs": []
}}
```

### Subscriptions

| Method | Path | Description |
|--------|------|-------------|
| GET | /subscriptions | List user subscriptions |
| POST | /subscriptions | Create subscription |
| DELETE | /subscriptions/:id | Cancel subscription |

## Error Format

```json
{{
  "code": "error_code",
  "message": "Human-readable description",
  "details": {{}}
}}
```

Common error codes:
- `invalid_field` - Validation error
- `not_found` - Resource not found
- `rate_limited` - Too many requests
- `unauthorized` - Authentication required
- `forbidden` - Insufficient permissions

## Rate Limits

| Category | Limit |
|----------|-------|
| Public endpoints | 100 req/min per IP |
| Admin endpoints | 60 req/min per key |
| Chat endpoint | 20 req/min per session |

## Docs

- [/agent.md](/agent.md): Integration guide
- [/llms.txt](/llms.txt): Brief summary
- [/llms-admin.txt](/llms-admin.txt): Admin operations

## Skills

{skills}

## API

- [/openapi.json](/openapi.json): Full OpenAPI spec
- [/skill.json](/skill.json): Skill metadata
- [/.well-known/ai-discovery.json](/.well-known/ai-discovery.json): Discovery index
"#,
        name = SERVICE_NAME,
        description = SERVICE_DESCRIPTION,
        skills = skills.join("\n")
    );

    ([("Content-Type", "text/plain; charset=utf-8")], content)
}

/// GET /llms-admin.txt - Admin operations documentation
pub async fn llms_admin_txt() -> impl IntoResponse {
    let content = format!(
        r#"# {name} Admin API

> Administrative operations for store management. Requires valid authentication plus admin role.

## Prerequisites

Admin operations require:
1. Valid authentication (API key or JWT)
2. Admin role or tenant owner permissions

Header: `Authorization: Bearer <admin-token>`

## Products

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/products | List all products |
| POST | /admin/products | Create product |
| GET | /admin/products/:id | Get product |
| PUT | /admin/products/:id | Update product |
| DELETE | /admin/products/:id | Delete product |

### Create Product Example

```
POST /admin/products
Authorization: Bearer <admin-token>
Content-Type: application/json

{{
  "title": "New Product",
  "description": "Product description",
  "priceCents": 1999,
  "active": true
}}
```

## Categories

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/categories | List categories |
| POST | /admin/categories | Create category |
| PUT | /admin/categories/:id | Update category |
| DELETE | /admin/categories/:id | Delete category |

## Orders

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/orders | List orders |
| GET | /admin/orders/:id | Get order details |
| PATCH | /admin/orders/:id | Update order status |

## Customers

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/customers | List customers |
| GET | /admin/customers/:id | Get customer details |

## Chat Sessions (CRM)

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/chats | List chat sessions |
| GET | /admin/chats/:sessionId | Get full chat history |

## FAQ Management

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/faqs | List FAQ entries |
| POST | /admin/faqs | Create FAQ entry |
| PUT | /admin/faqs/:id | Update FAQ entry |
| DELETE | /admin/faqs/:id | Delete FAQ entry |

## AI Configuration

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/ai/config | Get AI settings |
| PUT | /admin/ai/config | Update AI settings |
| POST | /admin/ai/assistant | AI product assistant |
| POST | /admin/ai/related | Find related products |

## Coupons

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/coupons | List coupons |
| POST | /admin/coupons | Create coupon |
| PUT | /admin/coupons/:id | Update coupon |
| DELETE | /admin/coupons/:id | Delete coupon |

## Gift Cards

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/gift-cards | List gift cards |
| POST | /admin/gift-cards | Create gift card |
| GET | /admin/gift-cards/:id | Get gift card |
| PUT | /admin/gift-cards/:id | Update gift card |

## Settings

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/config/:category | Get config category |
| PUT | /admin/config/:category | Update config category |

## Error Handling

Admin-specific errors:
- `unauthorized` (401) - Missing or invalid token
- `forbidden` (403) - Valid token but insufficient permissions
- `not_found` (404) - Resource doesn't exist

## API

- [/openapi.json](/openapi.json): Full OpenAPI spec
- [/llms.txt](/llms.txt): Brief summary
- [/llms-full.txt](/llms-full.txt): Complete documentation
"#,
        name = SERVICE_NAME
    );

    ([("Content-Type", "text/plain; charset=utf-8")], content)
}
