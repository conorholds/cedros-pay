//! Agent integration guide endpoint.

use axum::response::IntoResponse;

use super::content::{SERVICE_DESCRIPTION, SERVICE_NAME, VERSION};

/// GET /agent.md - Integration guide for AI agents
pub async fn agent_md() -> impl IntoResponse {
    let content = format!(
        r#"---
title: Agent Integration Guide
version: "{version}"
audience: AI agents, automated systems
recommendedAuth: api-key
---

# {name} - Agent Integration Guide

## Overview

{description}

This guide helps AI agents integrate with the Cedros Pay API for:
- Browsing and searching products
- Managing shopping carts
- Processing payments
- Using the AI chat assistant
- Administrative operations (with auth)

## Why This API is Agent-Friendly

1. **Public endpoints** - Most read operations require no authentication
2. **AI chat assistant** - Natural language product search and FAQ
3. **Structured responses** - Consistent JSON with camelCase fields
4. **Rate limiting info** - Clear limits in headers
5. **Multiple formats** - llms.txt, OpenAPI, MCP, A2A support

## Quick Start

### 1. List Products (No Auth)

```python
import requests

response = requests.get("https://your-store.cedros.io/products")
products = response.json()["products"]

for p in products:
    print(f"{{p['title']}} - ${{p['priceCents']/100:.2f}}")
```

### 2. AI Chat Assistant (No Auth)

```python
response = requests.post(
    "https://your-store.cedros.io/chat",
    json={{"message": "Do you have any blue shirts under $50?"}}
)

result = response.json()
print(result["message"])

for product in result.get("products", []):
    print(f"  - {{product['name']}}: ${{product['priceCents']/100:.2f}}")
```

### 3. Create Cart and Checkout

```python
# Create cart
cart = requests.post(
    "https://your-store.cedros.io/cart",
    json={{
        "items": [
            {{"productId": "prod_123", "quantity": 1}}
        ]
    }}
).json()

cart_id = cart["id"]

# Get Stripe checkout URL
checkout = requests.post(
    f"https://your-store.cedros.io/cart/{{cart_id}}/checkout/stripe",
    json={{
        "successUrl": "https://example.com/success",
        "cancelUrl": "https://example.com/cancel"
    }}
).json()

print(f"Checkout URL: {{checkout['url']}}")
```

## Complete Integration Example

### Python

```python
import requests
import time

class CedrosPayClient:
    def __init__(self, base_url, api_key=None):
        self.base_url = base_url.rstrip("/")
        self.session = requests.Session()
        if api_key:
            self.session.headers["Authorization"] = f"Bearer {{api_key}}"

    def search_products(self, query):
        \"\"\"Use AI assistant to search products.\"\"\"
        resp = self.session.post(
            f"{{self.base_url}}/chat",
            json={{"message": query}}
        )
        return resp.json()

    def list_products(self, limit=20, offset=0):
        \"\"\"List products with pagination.\"\"\"
        resp = self.session.get(
            f"{{self.base_url}}/products",
            params={{"limit": limit, "offset": offset}}
        )
        return resp.json()

    def create_cart(self, items):
        \"\"\"Create a cart with items.\"\"\"
        resp = self.session.post(
            f"{{self.base_url}}/cart",
            json={{"items": items}}
        )
        return resp.json()

    def get_quote(self, cart_id, payment_method="stripe"):
        \"\"\"Get payment quote for cart.\"\"\"
        resp = self.session.post(
            f"{{self.base_url}}/cart/{{cart_id}}/quote",
            json={{"paymentMethod": payment_method}}
        )
        return resp.json()

    def checkout_stripe(self, cart_id, success_url, cancel_url):
        \"\"\"Get Stripe checkout URL.\"\"\"
        resp = self.session.post(
            f"{{self.base_url}}/cart/{{cart_id}}/checkout/stripe",
            json={{
                "successUrl": success_url,
                "cancelUrl": cancel_url
            }}
        )
        return resp.json()

# Usage
client = CedrosPayClient("https://your-store.cedros.io")

# Search with AI
results = client.search_products("comfortable running shoes")
print(f"AI says: {{results['message']}}")

# Create order
cart = client.create_cart([
    {{"productId": results["products"][0]["id"], "quantity": 1}}
])
checkout = client.checkout_stripe(
    cart["id"],
    "https://example.com/success",
    "https://example.com/cancel"
)
print(f"Complete purchase at: {{checkout['url']}}")
```

### JavaScript/Node.js

```javascript
class CedrosPayClient {{
  constructor(baseUrl, apiKey = null) {{
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.headers = {{ 'Content-Type': 'application/json' }};
    if (apiKey) {{
      this.headers['Authorization'] = `Bearer ${{apiKey}}`;
    }}
  }}

  async searchProducts(query) {{
    const resp = await fetch(`${{this.baseUrl}}/chat`, {{
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({{ message: query }})
    }});
    return resp.json();
  }}

  async createCart(items) {{
    const resp = await fetch(`${{this.baseUrl}}/cart`, {{
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({{ items }})
    }});
    return resp.json();
  }}

  async checkoutStripe(cartId, successUrl, cancelUrl) {{
    const resp = await fetch(`${{this.baseUrl}}/cart/${{cartId}}/checkout/stripe`, {{
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({{ successUrl, cancelUrl }})
    }});
    return resp.json();
  }}
}}

// Usage
const client = new CedrosPayClient('https://your-store.cedros.io');

const results = await client.searchProducts('blue running shoes');
console.log(`AI: ${{results.message}}`);

if (results.products.length > 0) {{
  const cart = await client.createCart([
    {{ productId: results.products[0].id, quantity: 1 }}
  ]);
  const checkout = await client.checkoutStripe(
    cart.id,
    'https://example.com/success',
    'https://example.com/cancel'
  );
  console.log(`Checkout: ${{checkout.url}}`);
}}
```

## Best Practices

### 1. Handle Rate Limits

```python
def api_call_with_retry(url, method="GET", **kwargs):
    max_retries = 3
    for attempt in range(max_retries):
        resp = requests.request(method, url, **kwargs)
        if resp.status_code == 429:
            retry_after = int(resp.headers.get("Retry-After", 60))
            time.sleep(retry_after)
            continue
        return resp
    raise Exception("Rate limit exceeded after retries")
```

### 2. Use the Chat Endpoint for Search

The `/chat` endpoint provides AI-powered search that understands natural language:
- "red shoes under $100"
- "comfortable office chairs"
- "gifts for a 5 year old"

This is more flexible than traditional search parameters.

### 3. Error Handling

All errors return consistent JSON:
```json
{{
  "code": "error_code",
  "message": "Human-readable description",
  "details": {{}}
}}
```

Handle these codes:
- `invalid_field` - Fix request parameters
- `not_found` - Resource doesn't exist
- `rate_limited` - Wait and retry
- `cart_expired` - Create new cart

## Discovery Endpoints

| Endpoint | Purpose |
|----------|---------|
| /llms.txt | Brief API summary |
| /llms-full.txt | Complete documentation |
| /skill.json | Machine-readable skills |
| /openapi.json | OpenAPI specification |
| /.well-known/ai-discovery.json | Master discovery index |
| /.well-known/mcp | MCP tool definitions |

## Authentication (Admin Operations)

For admin operations, include API key in header:
```
Authorization: Bearer sk_your_api_key
```

Admin endpoints include:
- `GET /admin/products` - List all products
- `POST /admin/products` - Create product
- `GET /admin/orders` - List orders
- `GET /admin/chats` - List chat sessions (CRM)
"#,
        name = SERVICE_NAME,
        version = VERSION,
        description = SERVICE_DESCRIPTION
    );

    ([("Content-Type", "text/markdown; charset=utf-8")], content)
}
