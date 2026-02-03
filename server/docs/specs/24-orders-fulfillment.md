# Cedros Pay Server - Orders & Fulfillment (Phase 1)

**Scope:** Define order lifecycle, fulfillment records, inventory reservations, and admin endpoints
for single-merchant operations while preserving tenant_id for future expansion.

---

## Goals (Phase 1)

- Formalize **order state machine** and history.
- Introduce **fulfillment/shipment** records and tracking numbers.
- Add **inventory reservations** to prevent oversell during checkout.
- Add **admin orders endpoints** (list/search/get/update status/fulfillment).
- Emit **webhook events** for order + fulfillment lifecycle.

Non-goals for Phase 1:
- Carrier integrations, tax engines, returns/exchanges, multi-location inventory.

---

## Data Models

### OrderStatus

Allowed values:
- `created`
- `paid`
- `processing`
- `fulfilled`
- `shipped`
- `delivered`
- `cancelled`
- `refunded`

Rules:
- Must move forward unless explicitly allowed for cancellation/refund.
- `refunded` is terminal.
- `cancelled` is terminal.

### OrderHistoryEntry

```
{
  "id": "hist_...",
  "orderId": "ord_...",
  "fromStatus": "paid",
  "toStatus": "processing",
  "note": "manual update",
  "actor": "admin",
  "createdAt": "2026-01-28T00:00:00Z"
}
```

### Fulfillment

```
{
  "id": "ful_...",
  "orderId": "ord_...",
  "status": "pending",         // pending | shipped | delivered | cancelled
  "carrier": "usps",
  "trackingNumber": "9400...",
  "trackingUrl": "https://...",
  "items": [
    {"productId": "prod_1", "quantity": 1}
  ],
  "shippedAt": "2026-01-28T00:00:00Z",
  "deliveredAt": null,
  "metadata": {}
}
```

### InventoryReservation

```
{
  "id": "res_...",
  "productId": "prod_1",
  "quantity": 2,
  "expiresAt": "2026-01-28T00:15:00Z",
  "cartId": "cart_...",
  "status": "active"            // active | released | converted
}
```

---

## Storage Changes

### New Tables

1) `order_history`
- id (PK), tenant_id, order_id, from_status, to_status, note, actor, created_at

2) `fulfillments`
- id (PK), tenant_id, order_id, status, carrier, tracking_number, tracking_url,
  items (JSONB), shipped_at, delivered_at, metadata (JSONB), created_at, updated_at

3) `inventory_reservations`
- id (PK), tenant_id, product_id, quantity, expires_at, cart_id, status, created_at

### Changes to `orders`
- Add `updated_at`
- Add `status_updated_at`

---

## Repository/Storage API

Add to `Store`:
- create_fulfillment(order_id, ...)
- list_fulfillments(order_id)
- update_fulfillment_status(fulfillment_id, ...)
- append_order_history(order_id, ...)
- list_order_history(order_id)
- reserve_inventory(cart_id, items, ttl)
- release_inventory_reservations(cart_id)
- convert_reservations_to_sale(cart_id)

All methods require `tenant_id`.

---

## Order Status Transitions

Allowed transitions:
- created -> paid
- paid -> processing
- processing -> fulfilled
- fulfilled -> shipped
- shipped -> delivered
- paid/processing -> cancelled
- paid/processing/fulfilled/shipped -> refunded

Rules:
- Status changes must record an OrderHistoryEntry.
- Fulfillment updates should also update order status where applicable.

---

## HTTP Endpoints (Admin)

### GET /admin/orders

Query: `status`, `createdBefore`, `createdAfter`, `limit`, `offset`, `search` (orderId/email)

Response:
```
{
  "orders": [Order],
  "total": 123
}
```

### GET /admin/orders/{id}

Response:
```
{
  "order": Order,
  "history": [OrderHistoryEntry],
  "fulfillments": [Fulfillment]
}
```

### POST /admin/orders/{id}/status

Request:
```
{
  "status": "processing",
  "note": "packed",
  "actor": "admin"
}
```

### POST /admin/orders/{id}/fulfillments

Create fulfillment.

### POST /admin/fulfillments/{id}/status

Update fulfillment status + tracking fields.

---

## Cart/Checkout Integration

- On cart quote creation: reserve inventory for each item (if tracked inventory).
- On cart expiry: release reservations.
- On payment success: convert reservations to sale and decrement inventory quantity.

---

## Webhooks

Add events:
- `order.created`
- `order.paid`
- `order.updated`
- `order.fulfillment.created`
- `order.fulfillment.updated`
- `order.cancelled`
- `order.refunded`

Payload should include order id, status, items, amount, and timestamps.

---

## Tests (Phase 1)

- Order status transition validation (happy + invalid path)
- Inventory reservation: reserve, release, convert
- Fulfillment status update updates order status
- Admin order list filtering

---

## Migration Notes

- Add new tables with tenant_id indexes.
- Backfill `orders.updated_at` from `created_at`.
- Ensure order unique constraint remains on (tenant_id, source, purchase_id).

