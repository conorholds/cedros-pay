//! Static skill documentation content (markdown with YAML frontmatter).

pub const SKILL_PRODUCTS: &str = r#"---
skill: products
name: Products
version: "1.0.0"
description: Browse products, categories, collections, and search catalog
requiresAuth: false
---

# Products Skill

Browse and search the product catalog.

## List Products

```
GET /products
```

Query parameters:
- `limit` (int, default 20): Max items per page
- `offset` (int, default 0): Pagination offset
- `collection` (string): Filter by collection slug

Response:
```json
{
  "products": [
    {
      "id": "prod_123",
      "title": "Product Name",
      "description": "Product description",
      "slug": "product-name",
      "priceCents": 1999,
      "images": [{"url": "https://..."}],
      "variants": [...],
      "active": true
    }
  ],
  "total": 100
}
```

## Get Product

```
GET /products/:id
```

Returns single product with full details including variants.

## List Categories

```
GET /categories
```

Returns hierarchical category tree.

## List Collections

```
GET /collections
```

Returns product collections with metadata.

## Search Products

Use the `/chat` endpoint with a product query - the AI will search and return relevant products.
"#;

pub const SKILL_CART: &str = r#"---
skill: cart
name: Cart
version: "1.0.0"
description: Shopping cart management
requiresAuth: false
---

# Cart Skill

Manage shopping cart items and prepare for checkout.

## Create Cart

```
POST /cart
Content-Type: application/json

{
  "items": [
    {"productId": "prod_123", "variantId": "var_456", "quantity": 1}
  ]
}
```

Response includes `cartId` for subsequent operations.

## Get Cart

```
GET /cart/:cartId
```

Returns cart with items, subtotal, and applied discounts.

## Update Cart

```
PUT /cart/:cartId
Content-Type: application/json

{
  "items": [
    {"productId": "prod_123", "variantId": "var_456", "quantity": 2}
  ]
}
```

## Apply Coupon

```
POST /cart/:cartId/coupon
Content-Type: application/json

{"code": "SAVE10"}
```

## Apply Gift Card

```
POST /cart/:cartId/gift-card
Content-Type: application/json

{"code": "GIFT-XXXX-XXXX"}
```

## Get Quote

```
POST /cart/:cartId/quote
Content-Type: application/json

{
  "paymentMethod": "stripe"
}
```

Returns payment quote with total, tax, and payment details.
"#;

pub const SKILL_CHECKOUT: &str = r#"---
skill: checkout
name: Checkout
version: "1.0.0"
description: Payment processing
requiresAuth: false
---

# Checkout Skill

Process payments via multiple methods.

## Payment Methods

1. **Stripe** - Credit/debit cards
2. **x402** - Crypto payments (USDC on Solana)
3. **Credits** - cedros-login credit balance

## Stripe Checkout

```
POST /cart/:cartId/checkout/stripe
Content-Type: application/json

{
  "successUrl": "https://example.com/success",
  "cancelUrl": "https://example.com/cancel"
}
```

Returns Stripe checkout session URL.

## x402 Crypto Payment

```
POST /cart/:cartId/quote
Content-Type: application/json

{"paymentMethod": "x402"}
```

Returns payment details including wallet address and amount.

After payment:
```
POST /cart/:cartId/verify
Content-Type: application/json

{"signature": "tx_signature_here"}
```

## Credits Payment

Requires cedros-login authentication.

```
POST /cart/:cartId/checkout/credits
Authorization: Bearer <cedros-login-token>
```

## Order Status

After successful payment, order is created automatically.
Webhook notifications sent to configured endpoints.
"#;

pub const SKILL_CHAT: &str = r#"---
skill: chat
name: Chat
version: "1.0.0"
description: AI shopping assistant
requiresAuth: false
---

# Chat Skill

AI-powered conversational shopping assistant.

## Send Message

```
POST /chat
Content-Type: application/json

{
  "sessionId": "sess_123",  // Optional, creates new if omitted
  "message": "Do you have any red shoes under $100?"
}
```

Response:
```json
{
  "sessionId": "sess_123",
  "message": "Yes! I found these red shoes for you:",
  "products": [
    {
      "id": "prod_456",
      "name": "Red Running Shoes",
      "priceCents": 7999,
      "slug": "red-running-shoes"
    }
  ],
  "faqs": [],
  "actions": ["Searched for: red shoes under $100"]
}
```

## Capabilities

The assistant can:
- Search products by description, color, price, category
- Answer questions about shipping, returns, policies (from FAQ)
- Provide product recommendations
- Help navigate the catalog

## Session Management

- Sessions persist conversation history
- Omit `sessionId` to start new conversation
- Include `sessionId` to continue existing conversation
"#;

pub const SKILL_SUBSCRIPTIONS: &str = r#"---
skill: subscriptions
name: Subscriptions
version: "1.0.0"
description: Recurring payment subscriptions
requiresAuth: true
---

# Subscriptions Skill

Manage recurring payment subscriptions via Stripe.

## Authentication Required

All subscription endpoints require authentication via:
- cedros-login JWT token
- Or Stripe customer session

## List Subscriptions

```
GET /subscriptions
Authorization: Bearer <token>
```

Returns active subscriptions for the authenticated user.

## Create Subscription

```
POST /subscriptions
Authorization: Bearer <token>
Content-Type: application/json

{
  "priceId": "price_123",
  "successUrl": "https://example.com/success",
  "cancelUrl": "https://example.com/cancel"
}
```

Returns Stripe checkout session for subscription.

## Cancel Subscription

```
DELETE /subscriptions/:subscriptionId
Authorization: Bearer <token>
```

Cancels subscription at end of current billing period.

## Update Payment Method

```
POST /subscriptions/:subscriptionId/payment-method
Authorization: Bearer <token>
```

Returns Stripe portal URL to update payment details.
"#;

pub const SKILL_ADMIN: &str = r#"---
skill: admin
name: Admin
version: "1.0.0"
description: Administrative operations
requiresAuth: true
requiresAdmin: true
---

# Admin Skill

Administrative operations for store management.

## Authentication

All admin endpoints require:
1. Valid authentication (API key or JWT)
2. Admin role or tenant owner permissions

Header: `Authorization: Bearer <admin-token>`

## Products Management

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/products | List all products |
| POST | /admin/products | Create product |
| PUT | /admin/products/:id | Update product |
| DELETE | /admin/products/:id | Delete product |

## Categories

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/categories | List categories |
| POST | /admin/categories | Create category |
| PUT | /admin/categories/:id | Update category |

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
| GET | /admin/chats/:sessionId | Get chat history |

## FAQ Management

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/faqs | List FAQ entries |
| POST | /admin/faqs | Create FAQ |
| PUT | /admin/faqs/:id | Update FAQ |
| DELETE | /admin/faqs/:id | Delete FAQ |

## AI Configuration

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/ai/config | Get AI settings |
| PUT | /admin/ai/config | Update AI settings |
| POST | /admin/ai/assistant | AI product assistant |

## Settings

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/config/:category | Get config |
| PUT | /admin/config/:category | Update config |
"#;
