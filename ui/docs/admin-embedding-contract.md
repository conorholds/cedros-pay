# Admin Plugin Embedding Contract v2

> Versioned integration contract for teams embedding `cedrosPayPlugin` into a host application via `AdminShell`. Pin your integration against a specific contract version to avoid drift.

**Contract version:** 2
**Package:** `@cedros/pay-react`
**Last updated:** 2026-02-27

---

## 1. Section ID Reference

### Programmatic access

```ts
import { CEDROS_PAY_SECTIONS, CEDROS_PAY_SECTION_IDS } from '@cedros/pay-react';

// Build-time allowlist
const allowlist = CEDROS_PAY_SECTION_IDS;
// → ['cedros-pay:transactions', 'cedros-pay:products', ...]
```

### Full section table

If your host app uses an allowlist for deep-link routing (e.g. `?section=cedros-pay:products`), you **must** include all IDs below.

| Qualified ID | Label | Group | Order | Primary Endpoints |
|---|---|---|---|---|
| `cedros-pay:transactions` | Transactions | Store | 0 | `GET /admin/transactions` |
| `cedros-pay:products` | Products | Store | 1 | `GET/POST /admin/products`, `PUT/DELETE /admin/products/{id}` |
| `cedros-pay:subscriptions` | Subscriptions | Store | 2 | `GET/POST /admin/subscriptions`, `PUT /admin/subscriptions/{id}` |
| `cedros-pay:coupons` | Coupons | Store | 3 | `GET/POST /admin/coupons`, `PUT/DELETE /admin/coupons/{id}` |
| `cedros-pay:refunds` | Refunds | Store | 4 | `GET /admin/refunds`, `POST /admin/refunds/{id}/{approve,deny}` |
| `cedros-pay:storefront` | Storefront | Configuration | 10 | `GET/PUT /admin/config/shop` |
| `cedros-pay:ai-settings` | Store AI | Configuration | 11 | `GET /admin/config/ai`, `PUT /admin/config/ai/{api-key,assignment,prompt}` |
| `cedros-pay:faqs` | Knowledge Base | Configuration | 12 | `GET/POST /admin/faqs`, `PUT/DELETE /admin/faqs/{id}` |
| `cedros-pay:payment-settings` | Payment Options | Configuration | 13 | `GET/PUT /admin/config/{stripe,x402,cedros_login}` |
| `cedros-pay:messaging` | Store Messages | Configuration | 14 | `GET/PUT /admin/config/messaging` |
| `cedros-pay:settings` | Store Server | Configuration | 15 | `GET/PUT /admin/config/server` |

### Sidebar groups

| Group | Order | Default Collapsed |
|---|---|---|
| Store | 1 | No |
| Configuration | 2 | Yes |

Missing allowlist entries cause **silent fallback** to the default section — the feature looks broken but isn't.

---

## 2. Frontend Admin Auth Flow

This section explains how a JWT token flows from your host application into the `Authorization` header on every `/admin/*` request. This is the most common source of 401 debugging — read it carefully.

### The pipeline

```
hostContext              createPluginContext()         wrapSection()              AdminAuthManager
─────────────           ─────────────────────        ──────────────             ─────────────────
cedrosLogin: {    →     pluginContext: {        →    token = useCedrosLogin()   →   setCedrosLoginAuth(token)
  getAccessToken()        getAccessToken()             ._internal               →   fetchWithAuth(path)
  user                    serverUrl                    .getAccessToken()         →   headers: { Authorization:
}                         userId                      ?? pluginContext               Bearer <token> }
cedrosPay: {            }                               .getAccessToken()
  serverUrl
  jwtToken
}
```

### Step-by-step

1. **Host provides `hostContext`** with both `cedrosLogin` and `cedrosPay` fields.

2. **`createPluginContext()`** (in `plugin.tsx`) builds a `PluginContext` with a `getAccessToken` callback that prefers `cedrosLogin.getAccessToken()`, falling back to `cedrosPay.jwtToken`.

3. **`wrapSection()`** (the React component wrapper) reads the JWT via the `useCedrosLogin()` React hook's internal accessor (`_internal.getAccessToken()`), falling back to `pluginContext.getAccessToken()`. This ensures the token is **reactive** — when the user logs in, refreshes their token, or the token rotates, the component automatically gets the new value.

4. **`AdminAuthManager`** receives the token via `setCedrosLoginAuth(token, isAdmin)` and attaches it as `Authorization: Bearer <token>` on every `fetchWithAuth()` call.

### Critical: `getAccessToken` must be reactive

The `hostContext.cedrosLogin.getAccessToken` callback is called on **every render** of admin sections. It must:

- Return the **current** JWT string (not a stale closure)
- Return `null` when unauthenticated (not throw)
- Reflect token refreshes immediately (not require a page reload)

If `getAccessToken` returns a stale token, admin sections will see 401s intermittently after token rotation.

### Minimal wiring example

```tsx
// In your host app's admin shell
const hostContext = {
  cedrosLogin: {
    user: currentUser,
    getAccessToken: () => authStore.getAccessToken(), // must be reactive!
    serverUrl: CEDROS_LOGIN_URL,
  },
  cedrosPay: {
    serverUrl: CEDROS_PAY_URL,
    jwtToken: authStore.getAccessToken(), // fallback — kept in sync
  },
};

<AdminShell plugins={[cedrosPayPlugin]} hostContext={hostContext} />
```

### Auth method priority

`AdminAuthManager` supports two auth methods. Priority order:

1. **JWT auth** (cedros-login token) — used when `setCedrosLoginAuth()` has been called with a valid token
2. **Wallet auth** (Solana wallet signing) — used when a wallet signer is set and no JWT is available

In admin plugin context, JWT auth is always used (wallet auth is for standalone/non-login deployments).

---

## 3. Route Contract

Cedros Pay uses two route prefixes. Host deployments must not rewrite these unless intentional:

| Prefix | Purpose | Auth |
|--------|---------|------|
| `/admin/*` | Admin CRUD (products, config, transactions, AI, etc.) | JWT via `Authorization: Bearer <token>` — must be `is_system_admin` |
| `/paywall/v1/*` | Public payment endpoints (storefront, quote, verify, etc.) | None (public) or JWT for user-scoped operations |

**Do not assume** `/v1/pay/admin/*` or other rewritten paths unless your reverse proxy explicitly maps them. When embedding under a path prefix (e.g. `/v1/pay/`), the `cedrosPay.serverUrl` should include the prefix so that the SDK's relative paths (`/admin/*`) resolve correctly.

### Route prefix mapping example

If your reverse proxy serves cedros-pay at `/v1/pay/`:

```
SDK request:     /admin/products
serverUrl:       https://api.example.com/v1/pay
Actual request:  https://api.example.com/v1/pay/admin/products
```

The SDK prepends `serverUrl` to all relative paths. Set `cedrosPay.serverUrl` accordingly — do **not** rewrite paths in a proxy.

---

## 4. Backend Configuration Notes

### PostgreSQL URL defaults

When using Postgres storage, the server resolves `postgres_url` with this fallback chain:

```
paywall.postgres_url   →  falls back to  →  storage.postgres_url
coupons.postgres_url   →  falls back to  →  storage.postgres_url
subscriptions.postgres_url  →  falls back to  →  storage.postgres_url
```

**If you set `storage.postgres_url`**, you do not need to set the per-subsystem URLs — they inherit automatically.

**If you set per-subsystem URLs directly** (e.g. `paywall.postgres_url` and `coupons.postgres_url`), you must set **all** of them that use Postgres. Missing URLs cause a runtime error:

```
Error: paywall.postgres_url is required when product_source=postgres
Error: coupons.postgres_url is required when coupon_source=postgres
```

**Recommendation:** Set `storage.postgres_url` once and let the subsystems inherit.

---

## 5. Required Verification Steps (Release Gate)

Before shipping an admin integration, verify each of the following manually or in CI:

- [ ] Open each admin configuration section from the sidebar
- [ ] Save one value in each section
- [ ] Reload the page and verify the persisted value returns correctly
- [ ] Verify the request path is `/admin/...` (not a rewritten path) in the Network tab
- [ ] Verify requests carry `Authorization: Bearer <jwt>` header
- [ ] Verify no 401/403 for a valid `is_system_admin` user
- [ ] Verify deep-link routing: navigate to `?section=cedros-pay:ai-settings` (and other sections) and confirm the correct section loads without fallback

---

## 6. Auth Troubleshooting

| Symptom | Root Cause | Fix |
|---------|-----------|-----|
| 401 + `"no valid auth method"` | `Authorization` header missing at server | Check that `hostContext.cedrosLogin.getAccessToken()` returns a valid JWT and that it propagates to fetch calls |
| 401 after token refresh | `getAccessToken` returns stale closure | Ensure the callback reads from reactive state (not a captured variable from mount time) |
| 401 + `"JWT validation failed"` | Issuer, audience, JWKS, or expiry mismatch | Verify `iss`/`aud` claims match server config; check JWKS endpoint is reachable; check token expiry |
| 403 + `"not system admin"` | Token is valid but user lacks admin claim | Ensure the user has `is_system_admin: true` in their cedros-login profile |
| Section loads but shows empty/error | Backend endpoint unreachable or wrong prefix | Check Network tab for the actual request URL; verify route prefix matches deployment |
| Deep-link falls back to wrong section | Section ID missing from host app allowlist | Add the qualified section ID (`cedros-pay:<section>`) to your allowlist — see Section 1 |

---

## 7. Versioning

This document is versioned independently of the package. When the plugin adds or removes sections, renames route prefixes, or changes auth requirements, the contract version will increment.

| Contract Version | Package Version | Changes |
|-----------------|----------------|---------|
| v1 | 1.1.x | Initial contract — 11 sections, `/admin/*` + `/paywall/v1/*` routes |
| v2 | 1.1.x | Added: full section table with order/labels/endpoints, auth flow docs, `getAccessToken` reactivity requirement, route prefix mapping, postgres_url defaults, exported `CEDROS_PAY_SECTIONS` constant |

Host teams should reference a specific contract version in their integration code or CI checks.
