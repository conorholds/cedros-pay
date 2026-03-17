//! Admin skill documentation content (expanded with all admin endpoints).

pub const SKILL_ADMIN: &str = r#"---
skill: admin
name: Admin
version: "1.0.0"
description: Administrative operations for store management
requiresAuth: true
requiresAdmin: true
---

# Admin Skill

Administrative operations for store management.

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
| GET | /admin/products/{id} | Get product |
| POST | /admin/products | Create product |
| PUT | /admin/products/{id} | Update product |
| DELETE | /admin/products/{id} | Delete product |

## Product Variations

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/products/{id}/variations | Get variations |
| PUT | /admin/products/{id}/variations | Update variations |
| PUT | /admin/products/{id}/variants/inventory | Bulk update variant inventory |

## Inventory

| Method | Path | Description |
|--------|------|-------------|
| PUT | /admin/products/{id}/inventory | Set inventory level |
| POST | /admin/products/{id}/inventory/adjust | Adjust inventory |
| GET | /admin/products/{id}/inventory/adjustments | List adjustments |

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
| GET | /admin/collections/{id} | Get collection |
| PUT | /admin/collections/{id} | Update collection |
| DELETE | /admin/collections/{id} | Delete collection |

## Orders

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/orders | List orders |
| GET | /admin/orders/{id} | Get order details |
| POST | /admin/orders/{id}/status | Update order status |
| POST | /admin/orders/{id}/fulfillments | Create fulfillment |
| POST | /admin/fulfillments/{id}/status | Update fulfillment status |

## Customers

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/customers | List customers |
| GET | /admin/customers/{id} | Get customer details |
| POST | /admin/customers | Create customer |
| PUT | /admin/customers/{id} | Update customer |

## Returns

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/returns | List returns |
| GET | /admin/returns/{id} | Get return details |
| POST | /admin/returns | Create return |
| POST | /admin/returns/{id}/status | Update return status |

## Disputes

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/disputes | List disputes |
| POST | /admin/disputes | Create dispute |
| GET | /admin/disputes/{id} | Get dispute details |
| POST | /admin/disputes/{id}/status | Update dispute status |

## Shipping

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/shipping/profiles | List shipping profiles |
| POST | /admin/shipping/profiles | Create profile |
| GET | /admin/shipping/profiles/{id} | Get profile |
| PUT | /admin/shipping/profiles/{id} | Update profile |
| DELETE | /admin/shipping/profiles/{id} | Delete profile |
| GET | /admin/shipping/profiles/{id}/rates | List rates |
| POST | /admin/shipping/profiles/{id}/rates | Create rate |
| PUT | /admin/shipping/rates/{id} | Update rate |
| DELETE | /admin/shipping/rates/{id} | Delete rate |

## Taxes

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/taxes | List tax rates |
| POST | /admin/taxes | Create tax rate |
| GET | /admin/taxes/{id} | Get tax rate |
| PUT | /admin/taxes/{id} | Update tax rate |
| DELETE | /admin/taxes/{id} | Delete tax rate |

## Coupons

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/coupons | List coupons |
| POST | /admin/coupons | Create coupon |
| PUT | /admin/coupons/{id} | Update coupon |
| DELETE | /admin/coupons/{id} | Delete coupon |

## Gift Cards

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/gift-cards | List gift cards |
| POST | /admin/gift-cards | Create gift card |
| GET | /admin/gift-cards/{code} | Get gift card |
| PUT | /admin/gift-cards/{code} | Update gift card |
| POST | /admin/gift-cards/{code}/adjust | Adjust balance |

## FAQ Management

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/faqs | List FAQ entries |
| POST | /admin/faqs | Create FAQ |
| GET | /admin/faqs/{id} | Get FAQ |
| PUT | /admin/faqs/{id} | Update FAQ |
| DELETE | /admin/faqs/{id} | Delete FAQ |

## Chat Sessions (CRM)

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/chats | List chat sessions |
| GET | /admin/chats/{sessionId} | Get chat history |
| GET | /admin/users/{userId}/chats | List user's chats |

## Webhooks & Dead-Letter Queue

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/webhooks | List webhooks |
| GET | /admin/webhooks/{id} | Get webhook details |
| POST | /admin/webhooks/{id}/retry | Retry webhook |
| DELETE | /admin/webhooks/{id} | Delete webhook |
| GET | /admin/webhooks/dlq | List dead-letter queue |
| POST | /admin/webhooks/dlq/{id}/retry | Retry from DLQ |
| DELETE | /admin/webhooks/dlq/{id} | Delete from DLQ |

## Config

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/config | List config categories |
| GET | /admin/config/{category} | Get config |
| PUT | /admin/config/{category} | Update config (full) |
| PATCH | /admin/config/{category} | Update config (partial) |
| POST | /admin/config/batch | Batch update |
| POST | /admin/config/validate | Validate config |
| GET | /admin/config/history | Config change history |

## AI Configuration

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/config/ai | Get AI settings |
| PUT | /admin/config/ai/api-key | Save AI API key |
| DELETE | /admin/config/ai/api-key/{provider} | Delete AI API key |
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
| GET | /admin/compliance/user-status/{userId} | User compliance status |

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
| PATCH | /admin/asset-redemptions/{id}/status | Update status |
| POST | /admin/asset-redemptions/{id}/complete | Complete redemption |

## Refunds & Transactions

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/refunds | List refunds |
| GET | /admin/stripe/refunds | List Stripe refunds |
| POST | /admin/stripe/refunds/{id}/process | Process Stripe refund |
| GET | /admin/credits/refund-requests | List credit refund requests |
| GET | /admin/transactions | List transactions |

## Audit & Stats

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/audit | Audit log |
| GET | /admin/stats | Dashboard statistics |

## Workflow Example

```
# 1. Create product
POST /admin/products { "title": "Widget", "priceCents": 999, ... }

# 2. Set inventory
PUT /admin/products/{id}/inventory { "quantity": 100 }

# 3. Upload image
POST /admin/images/upload (multipart)

# 4. Add to collection
POST /admin/collections { "name": "New Arrivals", "productIds": ["{id}"] }
```
"#;
