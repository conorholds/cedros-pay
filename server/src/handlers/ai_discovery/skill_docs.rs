//! Static skill documentation content (markdown with YAML frontmatter).

pub use super::skill_docs_admin::SKILL_ADMIN;

pub const SKILL_PRODUCTS: &str = r#"---
skill: products
name: Products
version: "1.0.0"
description: Browse products, collections, FAQs, and search catalog
requiresAuth: false
---

# Products Skill

Browse and search the product catalog.

## List Products

```
GET /paywall/v1/products
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
GET /paywall/v1/products/{id}
```

Returns single product with full details including variants.

## Get Product by Slug

```
GET /paywall/v1/products/by-slug/{slug}
```

Look up a product by its URL-friendly slug.

## NFT Metadata

```
GET /paywall/v1/products/{id}/nft-metadata
```

Returns Metaplex-compatible NFT metadata JSON for a product.

## List Collections

```
GET /paywall/v1/collections
```

Returns product collections with metadata.

## Get Collection

```
GET /paywall/v1/collections/{id}
```

Returns collection details with associated products.

## List FAQs

```
GET /paywall/v1/faqs
```

Returns published FAQ entries.

## Search Products

Use the `/paywall/v1/chat` endpoint with a product query — the AI will search and return relevant products.
"#;

pub const SKILL_CART: &str = r#"---
skill: cart
name: Cart
version: "1.0.0"
description: Shopping cart — quote, checkout, and verify
requiresAuth: false
---

# Cart Skill

Create a cart quote and proceed to checkout.

## Create Cart Quote

```
POST /paywall/v1/cart/quote
Content-Type: application/json

{
  "items": [
    {"productId": "prod_123", "variantId": "var_456", "quantity": 1}
  ],
  "couponCode": "SAVE10"
}
```

Response includes `cartId`, line items, subtotal, total, and payment options.

## Get Cart

```
GET /paywall/v1/cart/{cartId}
```

Returns cart with items, totals, and applied discounts.

## Check Inventory

```
GET /paywall/v1/cart/{cartId}/inventory-status
```

Returns per-item inventory availability.

## Checkout via Stripe

```
POST /paywall/v1/cart/checkout
Content-Type: application/json

{
  "cartId": "cart_abc",
  "successUrl": "https://example.com/success",
  "cancelUrl": "https://example.com/cancel"
}
```

Returns Stripe checkout session URL.

## Checkout via x402 (Crypto)

1. Quote already returned in `POST /paywall/v1/cart/quote` response.
2. Submit on-chain payment, then verify:

```
POST /paywall/v1/cart/{cartId}/verify
Content-Type: application/json

{"signature": "tx_signature_here"}
```

## Checkout via Credits

Requires Bearer JWT from cedros-login:

```
POST /paywall/v1/cart/{cartId}/credits/authorize
Authorization: Bearer <token>
```

Or place a hold first:

```
POST /paywall/v1/cart/{cartId}/credits/hold
Authorization: Bearer <token>
```
"#;

pub const SKILL_CHECKOUT: &str = r#"---
skill: checkout
name: Checkout
version: "1.0.0"
description: Payment processing — Stripe, x402 crypto, and credits
requiresAuth: false
---

# Checkout Skill

Process payments via three methods.

## Payment Methods

1. **Stripe** — Credit/debit cards
2. **x402** — Crypto payments (USDC on Solana)
3. **Credits** — cedros-login credit balance

## Cart Checkout (Multi-item)

### Stripe

```
POST /paywall/v1/cart/checkout
{ "cartId": "cart_abc", "successUrl": "...", "cancelUrl": "..." }
```

Returns `{ "url": "https://checkout.stripe.com/..." }`.

### x402 (Crypto)

```
POST /paywall/v1/cart/quote
{ "items": [...] }
```
→ Returns cart with x402 payment details (address, amount, mint).

After on-chain payment:
```
POST /paywall/v1/cart/{cartId}/verify
{ "signature": "tx_signature" }
```

### Credits

```
POST /paywall/v1/cart/{cartId}/credits/authorize
Authorization: Bearer <token>
```

## Single-Resource Checkout

For paywall-protected individual resources:

### x402

```
POST /paywall/v1/quote
```
→ Returns HTTP 402 with x402 payment header.

After payment:
```
POST /paywall/v1/verify
```

### Stripe

```
POST /paywall/v1/stripe-session
{ "productId": "prod_123", "successUrl": "...", "cancelUrl": "..." }
```

### Credits

```
POST /paywall/v1/credits/authorize
Authorization: Bearer <token>
{ "productId": "prod_123" }
```

## Verification

```
GET /paywall/v1/stripe-session/verify?sessionId=cs_xxx
GET /paywall/v1/x402-transaction/verify?signature=xxx
```

## Order Status

After successful payment, an order is created automatically.
Webhook notifications are sent to configured endpoints.
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
POST /paywall/v1/chat
Content-Type: application/json

{
  "sessionId": "sess_123",
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

Manage recurring payment subscriptions via Stripe, x402, or credits.

## Authentication

Most subscription endpoints require a Bearer JWT.

## Check Status

```
GET /paywall/v1/subscription/status
Authorization: Bearer <token>
```

## Get Details

```
GET /paywall/v1/subscription/details
Authorization: Bearer <token>
```

## Subscribe via Stripe

```
POST /paywall/v1/subscription/stripe-session
{ "productId": "prod_123", "successUrl": "...", "cancelUrl": "..." }
```

Returns Stripe checkout session URL.

## Subscribe via x402

```
POST /paywall/v1/subscription/quote
```
→ Returns HTTP 402 with payment quote.

After on-chain payment:
```
POST /paywall/v1/subscription/x402/activate
{ "signature": "tx_signature" }
```

## Subscribe via Credits

```
POST /paywall/v1/subscription/credits/activate
Authorization: Bearer <token>
```

## Cancel

```
POST /paywall/v1/subscription/cancel
Authorization: Bearer <token>
```

## Billing Portal

```
POST /paywall/v1/subscription/portal
Authorization: Bearer <token>
```

Returns Stripe portal URL to manage payment methods.

## Change Plan

Preview proration:
```
POST /paywall/v1/subscription/change/preview
Authorization: Bearer <token>
{ "newProductId": "prod_456" }
```

Confirm change:
```
POST /paywall/v1/subscription/change
Authorization: Bearer <token>
{ "newProductId": "prod_456" }
```

## Reactivate

```
POST /paywall/v1/subscription/reactivate
Authorization: Bearer <token>
```
"#;
