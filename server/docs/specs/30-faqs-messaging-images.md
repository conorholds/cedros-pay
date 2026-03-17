# Cedros Pay Server - FAQs, Messaging & Image Storage

Specification for the FAQ knowledge base, order notification messaging (email + webhook), and
S3-compatible image upload with automatic resizing.

---

## FAQs

Knowledge base entries used by the AI chat system and displayed on the storefront.

### Faq Model

```
id:               String (UUID)
tenant_id:        String
question:         String (max 1000 chars)
answer:           String (max 10000 chars)
keywords:         Vec<String> (lowercase, trimmed)
active:           bool (default true)
use_in_chat:      bool (default true)  — available to AI chat tool calling
display_on_page:  bool (default true)  — shown on public FAQ page
created_at:       DateTime
updated_at:       DateTime
```

---

### Admin Endpoints

All admin endpoints require admin authentication and create audit log entries.

| Method | Path | Description |
|--------|------|-------------|
| GET    | /admin/faqs | List FAQs (query: `activeOnly`, `limit`, `offset`) |
| GET    | /admin/faqs/:id | Get single FAQ |
| POST   | /admin/faqs | Create FAQ |
| PUT    | /admin/faqs/:id | Update FAQ |
| DELETE | /admin/faqs/:id | Delete FAQ |

#### GET /admin/faqs

Response:
```json
{
  "faqs": [...],
  "total": 42
}
```

#### POST /admin/faqs — Create

Request:
```json
{
  "question": "...",
  "answer": "...",
  "keywords": ["shipping", "returns"],
  "active": true,
  "useInChat": true,
  "displayOnPage": true
}
```

#### PUT /admin/faqs/:id — Update

Same request body as create.

#### DELETE /admin/faqs/:id

Response:
```json
{ "deleted": true }
```

---

### Public Endpoints

#### GET /faqs

Lists active FAQs that are set to display on the public page (where `active=true` AND
`display_on_page=true`). Does not expose `tenant_id` or internal metadata.

Query parameters: `limit` (default 50, max 100), `offset`.

Response:
```json
{
  "faqs": [
    { "id": "...", "question": "...", "answer": "..." }
  ],
  "total": 12
}
```

---

### Validation

| Field      | Rules |
|------------|-------|
| `question` | Required, trimmed, max 1000 chars |
| `answer`   | Required, trimmed, max 10000 chars |
| `keywords` | Each entry trimmed to lowercase; empty strings filtered out |

---

### Storage Methods

| Method | Description |
|--------|-------------|
| `store.list_faqs(tenant_id, active_only, limit, offset)` | Returns `(Vec<Faq>, total)` |
| `store.list_public_faqs(tenant_id, limit, offset)` | Returns `(Vec<Faq>, total)` where `active=true AND display_on_page=true` |
| `store.get_faq(tenant_id, id)` | Fetch single FAQ |
| `store.create_faq(faq)` | Insert new FAQ |
| `store.update_faq(faq)` | Update existing FAQ |
| `store.delete_faq(tenant_id, id)` | Remove FAQ |

---

## Messaging

Internal service for order notifications. Supports email (SMTP) and webhook delivery.

### MessagingConfig

```
email_enabled:    bool
email_provider:   String (e.g., "smtp")
smtp_host:        String
smtp_port:        u16
smtp_username:    String
smtp_password:    String (redacted in Debug)
from_email:       String
from_name:        String
webhook_enabled:  bool
webhook_url:      String
webhook_secret:   String (redacted in Debug)
webhook_timeout:  Duration
```

`smtp_password` and `webhook_secret` are redacted from `Debug` output to prevent accidental
secret leakage in logs.

---

### MessagingService Trait

```
notify_order_created(&self, order: &Order)
```

---

### Factory

`create_messaging_service(config, store)` returns a `NoopMessagingService` when both
`email_enabled` and `webhook_enabled` are `false`.

---

### Webhook Delivery

On `notify_order_created`, a POST request is sent to `webhook_url` with the following payload:

```json
{
  "event": "order.created",
  "orderId": "ord_...",
  "customerEmail": "user@example.com",
  "items": [...],
  "total": 5000,
  "paymentMethod": "x402",
  "timestamp": "2026-03-17T12:00:00Z"
}
```

Authentication header: `X-Signature: sha256={hmac}` using `webhook_secret`.

Retry behaviour: one retry after 500ms on failure.

---

### Email Delivery

- HTML receipt template with a plain text variant.
- Subject: `"Order Confirmation - {order_id}"`.
- Email is queued in the database via `store.enqueue_email(PendingEmail)` rather than sent
  synchronously.

#### PendingEmail

```
to:         String
subject:    String
html_body:  String
text_body:  String
queued_at:  DateTime
```

---

### Email Worker (`workers/email.rs`)

Background worker that drains the email queue and delivers via SMTP.

Process:
1. `store.dequeue_emails()` — fetch pending emails.
2. Send each via SMTP using the `lettre` crate.
3. `store.mark_email_sent(id)` — mark as delivered on success.

Spawned at server startup via `workers::spawn_email_worker(store, messaging_config)`.

---

### Validation

| Rule | Detail |
|------|--------|
| `email_enabled=true` | `smtp_host` and `from_email` are required |
| `smtp_password` | Redacted from `Debug` output |

---

### Storage Methods

| Method | Description |
|--------|-------------|
| `store.enqueue_email(pending_email)` | Insert email into queue |
| `store.dequeue_emails()` | Returns `Vec<PendingEmail>` |
| `store.mark_email_sent(id)` | Mark queued email as delivered |

---

## Image Storage

S3-compatible image upload with automatic resize and thumbnail generation.

### ImageStorageService

Maintains a per-tenant S3 client cached for 5 minutes. Credentials are read from the
`app_config` table (category `"storage"`).

---

### Upload Pipeline

1. Validate magic bytes — JPEG, PNG, GIF, and WebP accepted; all others rejected.
2. Decode the image.
3. Resize to a maximum of 2048px on the longest edge (maintains aspect ratio).
4. Generate a thumbnail at 400px on the longest edge.
5. Encode both the full image and thumbnail as lossless WebP.
6. Upload to S3:
   - Full image: `{tenant_id}/images/{uuid}.webp`
   - Thumbnail: `{tenant_id}/images/{uuid}_thumb.webp`

---

### UploadResult

```
url:        String  — e.g., "{cdn_url}/{tenant_id}/images/{uuid}.webp"
thumb_url:  String  — e.g., "{cdn_url}/{tenant_id}/images/{uuid}_thumb.webp"
```

---

### ImageStorageError Variants

| Variant | Description |
|---------|-------------|
| `NotConfigured` | No S3 credentials found for tenant |
| `InvalidImage` | File fails magic byte validation |
| `TooLarge` | Upload exceeds `MAX_IMAGE_UPLOAD_SIZE` |
| `S3` | S3 request error |
| `Config` | Configuration read error |
| `Processing` | Image decode/encode/resize failure |

---

### Admin Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST   | /admin/images/upload | Upload image (multipart `file` field) |
| DELETE | /admin/images | Delete image by URL |

#### POST /admin/images/upload

Accepts a multipart form with a `file` field. Returns:

```json
{
  "url": "https://cdn.example.com/tenant_abc/images/uuid.webp",
  "thumbUrl": "https://cdn.example.com/tenant_abc/images/uuid_thumb.webp"
}
```

#### DELETE /admin/images

Request:
```json
{ "url": "https://cdn.example.com/tenant_abc/images/uuid.webp" }
```

Response:
```json
{ "deleted": true }
```

---

### Configuration

Stored per-tenant in the `app_config` table under category `"storage"`. Encrypted fields are
noted below.

| Key | Type | Notes |
|-----|------|-------|
| `bucket_name` | String | S3 bucket name |
| `access_key_id` | String | Encrypted at rest |
| `secret_access_key` | String | Encrypted at rest |
| `region` | String | AWS region or equivalent |
| `endpoint_url` | String | S3-compatible endpoint (e.g., Cloudflare R2, MinIO) |
| `cdn_url` | String | Public CDN base URL prefixed to returned image URLs |

---

### Constants

| Constant | Description |
|----------|-------------|
| `MAX_IMAGE_UPLOAD_SIZE` | Maximum accepted multipart upload size |
