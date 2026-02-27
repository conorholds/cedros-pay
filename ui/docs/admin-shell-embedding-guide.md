# AdminShell Multi-Plugin Embedding Guide

> How to set up a unified admin dashboard using `AdminShell` with `cedrosLoginPlugin` and `cedrosPayPlugin`. Covers hostContext wiring, section ordering, deep-link allowlists, and auth token flow.

**Audience:** Teams embedding both cedros-login and cedros-pay into a single admin UI.
**Last updated:** 2026-02-27

---

## Table of Contents

1. [Quick Start](#1-quick-start)
2. [Structuring hostContext](#2-structuring-hostcontext)
3. [Section Ordering Across Plugins](#3-section-ordering-across-plugins)
4. [Building a Deep-Link Allowlist](#4-building-a-deep-link-allowlist)
5. [Auth Token Flow](#5-auth-token-flow)
6. [Route Prefix Mapping](#6-route-prefix-mapping)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Quick Start

### Install

```bash
npm install @cedros/login-react @cedros/pay-react
```

### Minimal setup

```tsx
import { AdminShell, cedrosLoginPlugin } from '@cedros/login-react';
import { cedrosPayPlugin } from '@cedros/pay-react';

function AdminDashboard() {
  const { user, getAccessToken } = useAuth(); // your auth provider

  const hostContext = {
    cedrosLogin: {
      user,
      getAccessToken,             // () => string | null — MUST be reactive
      serverUrl: CEDROS_LOGIN_URL,
    },
    cedrosPay: {
      serverUrl: CEDROS_PAY_URL,
      jwtToken: getAccessToken(), // fallback — kept in sync on each render
    },
  };

  return (
    <AdminShell
      plugins={[cedrosLoginPlugin, cedrosPayPlugin]}
      hostContext={hostContext}
      title="Admin"
    />
  );
}
```

That's it. AdminShell handles plugin registration, sidebar rendering, section routing, and auth bridging. The rest of this guide explains how each piece works so you can debug and customize.

---

## 2. Structuring hostContext

### The HostContext type

`HostContext` is defined in `@cedros/login-react` and re-exported by `@cedros/pay-react`:

```ts
interface HostContext {
  cedrosLogin?: {
    user: { id: string; email?: string; name?: string; picture?: string } | null;
    getAccessToken: () => string | null;
    serverUrl: string;
  };
  cedrosPay?: {
    serverUrl: string;
    jwtToken?: string;        // fallback JWT (prefer getAccessToken)
    walletAddress?: string;   // for wallet-based auth (standalone only)
  };
  org?: {
    orgId: string;
    role: string;             // 'owner' | 'admin' | 'member'
    permissions: string[];    // e.g., ['login:users:read', 'login:settings:read']
  };
  dashboardPermissions?: {
    canAccess: (sectionId: string) => boolean;
  };
  custom?: Record<string, unknown>;
}
```

### Which fields each plugin reads

| Field | cedros-login reads | cedros-pay reads |
|-------|-------------------|-----------------|
| `cedrosLogin.user` | User display + userId | — |
| `cedrosLogin.getAccessToken` | Primary auth token | Primary auth token (via fallback chain) |
| `cedrosLogin.serverUrl` | API base URL | Fallback server URL |
| `cedrosPay.serverUrl` | — | API base URL |
| `cedrosPay.jwtToken` | — | Fallback JWT (when `getAccessToken` unavailable) |
| `cedrosPay.walletAddress` | — | Wallet auth context (standalone only) |
| `org.orgId` | Org-scoped operations | Passed to pluginContext |
| `org.permissions` | Section visibility filtering | Section visibility filtering |
| `dashboardPermissions.canAccess` | Owner-level section filtering | Owner-level section filtering |

### Critical: `getAccessToken` must be reactive

This is the #1 source of 401 debugging. The callback is called on **every render** of every admin section. It must:

- Return the **current** JWT string (not a stale closure captured at mount time)
- Return `null` when unauthenticated (not throw)
- Reflect token refreshes immediately (not require a page reload)

```tsx
// WRONG — captures token at mount time, goes stale after refresh
const token = getToken();
const hostContext = {
  cedrosLogin: { getAccessToken: () => token, ... },
};

// RIGHT — reads fresh value on every call
const hostContext = {
  cedrosLogin: { getAccessToken: () => authStore.getAccessToken(), ... },
};
```

### Full example with org context

```tsx
const hostContext: HostContext = {
  cedrosLogin: {
    user: currentUser,
    getAccessToken: () => authStore.getAccessToken(),
    serverUrl: 'https://auth.example.com',
  },
  cedrosPay: {
    serverUrl: 'https://pay.example.com',
    jwtToken: authStore.getAccessToken(),
  },
  org: {
    orgId: currentOrg.id,
    role: currentOrgMembership.role,
    permissions: currentOrgMembership.permissions,
  },
};
```

---

## 3. Section Ordering Across Plugins

### How groups merge

AdminShell merges sidebar groups across all registered plugins by **label**. First plugin to declare a group label wins — later plugins' order values for the same label are ignored.

```
buildGroupOrder(plugins):
  for each plugin (in registration order):
    for each group in plugin.groups:
      if group.label not yet seen → register it with group.order
      if group.label already seen → skip (first-wins)
```

### Default group layout with both plugins

When registered as `[cedrosLoginPlugin, cedrosPayPlugin]`:

| Sidebar Position | Group Label | Declared By | Group Order |
|---|---|---|---|
| 1st | **Users** | cedros-login | 0 |
| 2nd | **Store** | cedros-pay | 1 |
| 3rd | **Configuration** | cedros-login | 2 |

**Both plugins contribute sections to "Configuration"** — cedros-login declares the group (order 2), and cedros-pay's sections merge into it. Within a group, sections sort by their `order` value.

### Section order within groups

Sections are sorted by `order` within their group. Both plugins' sections interleave:

**Users** (cedros-login only):

| Order | Section | Plugin |
|---|---|---|
| 0 | Users | cedros-login |
| 1 | Team | cedros-login |
| 2 | Deposits | cedros-login |
| 3 | Withdrawals | cedros-login |

**Store** (cedros-pay only):

| Order | Section | Plugin |
|---|---|---|
| 0 | Transactions | cedros-pay |
| 1 | Products | cedros-pay |
| 2 | Subscriptions | cedros-pay |
| 3 | Coupons | cedros-pay |
| 4 | Refunds | cedros-pay |

**Configuration** (both plugins):

| Order | Section | Plugin |
|---|---|---|
| 0 | Authentication | cedros-login |
| 1 | Email & SMTP | cedros-login |
| 2 | Webhooks | cedros-login |
| 3 | User Wallets | cedros-login |
| 4 | Credit System | cedros-login |
| 5 | Auth Server | cedros-login |
| 10 | Storefront | cedros-pay |
| 11 | Store AI | cedros-pay |
| 12 | Knowledge Base | cedros-pay |
| 13 | Payment Options | cedros-pay |
| 14 | Store Messages | cedros-pay |
| 15 | Store Server | cedros-pay |

cedros-pay uses order 10+ deliberately to sort after cedros-login's 0-5 within the shared Configuration group.

### Plugin registration order matters

The order you pass plugins to `AdminShell` affects:

1. **Group ownership** — first plugin to declare a group label controls its order value
2. **Default section** — if no `defaultSection` is specified, the first section of the first plugin is shown

```tsx
// cedros-login groups get their declared order values
<AdminShell plugins={[cedrosLoginPlugin, cedrosPayPlugin]} ... />
```

---

## 4. Building a Deep-Link Allowlist

### Programmatic (recommended)

```ts
import { cedrosLoginPlugin } from '@cedros/login-react';
import { cedrosPayPlugin, CEDROS_PAY_SECTION_IDS } from '@cedros/pay-react';

// Option A: derive from plugin objects
const allSectionIds = [cedrosLoginPlugin, cedrosPayPlugin].flatMap(plugin =>
  plugin.sections.map(s => `${plugin.id}:${s.id}`)
);

// Option B: use pre-built constants (cedros-pay only)
const paySectionIds = CEDROS_PAY_SECTION_IDS;
// → ['cedros-pay:transactions', 'cedros-pay:products', ...]
```

### Static reference

If you need a hardcoded list (e.g., for server-side routing or config files):

**cedros-login sections (10):**

| Qualified ID | Label |
|---|---|
| `cedros-login:users` | Users |
| `cedros-login:team` | Team |
| `cedros-login:deposits` | Deposits |
| `cedros-login:withdrawals` | Withdrawals |
| `cedros-login:settings-auth` | Authentication |
| `cedros-login:settings-email` | Email & SMTP |
| `cedros-login:settings-webhooks` | Webhooks |
| `cedros-login:settings-wallet` | User Wallets |
| `cedros-login:settings-credits` | Credit System |
| `cedros-login:settings-server` | Auth Server |

**cedros-pay sections (11):**

| Qualified ID | Label |
|---|---|
| `cedros-pay:transactions` | Transactions |
| `cedros-pay:products` | Products |
| `cedros-pay:subscriptions` | Subscriptions |
| `cedros-pay:coupons` | Coupons |
| `cedros-pay:refunds` | Refunds |
| `cedros-pay:storefront` | Storefront |
| `cedros-pay:ai-settings` | Store AI |
| `cedros-pay:faqs` | Knowledge Base |
| `cedros-pay:payment-settings` | Payment Options |
| `cedros-pay:messaging` | Store Messages |
| `cedros-pay:settings` | Store Server |

**Total: 21 sections** across 3 sidebar groups.

### Deep-link URL format

```
https://admin.example.com/?section=cedros-pay:products
```

AdminShell reads the `section` query param and navigates to the matching qualified section ID. Missing or invalid IDs silently fall back to the default section — which looks broken but isn't.

---

## 5. Auth Token Flow

### The full pipeline

```
Your App                  AdminShell               Plugin                   Section Component          API Call
────────                  ──────────               ──────                   ─────────────────          ────────
authStore.getAccessToken
    │
    ▼
hostContext = {
  cedrosLogin: {
    getAccessToken ─────► createPluginContext() ──► pluginContext = {
  }                         │                        getAccessToken ──────► wrapSection():
  cedrosPay: {              │                        serverUrl               token = useCedrosLogin()
    serverUrl               │                      }                          ._internal.getAccessToken()
    jwtToken (fallback)     │                                                ?? pluginContext.getAccessToken()
  }                         │                                                      │
}                           │                                                      ▼
                            │                                               AdminAuthManager
                            │                                                 .setCedrosLoginAuth(token)
                            │                                                      │
                            │                                                      ▼
                            │                                               fetchWithAuth('/admin/...')
                            │                                                 headers: {
                            │                                                   Authorization: Bearer <token>
                            │                                                 }
```

### Step-by-step explanation

1. **Your app** provides `hostContext` with a reactive `getAccessToken` callback.

2. **AdminShell** calls each plugin's `createPluginContext(hostContext)` to build a `PluginContext`.

3. **cedros-login plugin** copies `getAccessToken` directly from `hostContext.cedrosLogin`.

4. **cedros-pay plugin** builds a `getAccessToken` that tries `cedrosLogin.getAccessToken()` first, then falls back to `cedrosPay.jwtToken`.

5. **Section wrappers** (cedros-pay's `wrapSection()`) additionally try the React context hook `useCedrosLogin()._internal.getAccessToken()` as the highest-priority source. This ensures tokens are reactive within the React render cycle.

6. **AdminAuthManager** receives the resolved token via `setCedrosLoginAuth(token, isAdmin)` and attaches `Authorization: Bearer <token>` to every `fetchWithAuth()` call.

### Token priority (cedros-pay sections)

From highest to lowest priority:

```
1. useCedrosLogin()._internal.getAccessToken()    ← React context (most reactive)
2. pluginContext.getAccessToken()                   ← from createPluginContext
   2a. hostContext.cedrosLogin.getAccessToken()     ← preferred source
   2b. hostContext.cedrosPay.jwtToken               ← fallback
```

### Token priority (cedros-login sections)

```
1. hostContext.cedrosLogin.getAccessToken()         ← direct from hostContext
```

### What happens when auth fails

| Scenario | What breaks | Root cause |
|----------|------------|------------|
| `getAccessToken` returns `null` | All admin sections show 401 | User not authenticated |
| `getAccessToken` returns stale token | Intermittent 401s after token refresh | Closure captured at mount time |
| `cedrosPay.jwtToken` set but `cedrosLogin` missing | cedros-login sections fail, cedros-pay works | Incomplete hostContext |
| JWT missing `is_system_admin` claim | 403 on all admin endpoints | User is not an admin |

---

## 6. Route Prefix Mapping

Each plugin talks to its own backend server. The `serverUrl` in hostContext tells the SDK where to send requests.

### Default route layout

| Plugin | serverUrl | Request paths | Example full URL |
|--------|-----------|--------------|------------------|
| cedros-login | `https://auth.example.com` | `/admin/users`, `/admin/settings/*` | `https://auth.example.com/admin/users` |
| cedros-pay | `https://pay.example.com` | `/admin/products`, `/admin/config/*` | `https://pay.example.com/admin/products` |
| cedros-pay (public) | same | `/paywall/v1/quote`, `/paywall/v1/storefront` | `https://pay.example.com/paywall/v1/quote` |

### When using a reverse proxy with path prefixes

If your proxy mounts cedros-pay at `/v1/pay/`:

```
serverUrl:        https://api.example.com/v1/pay
SDK requests:     /admin/products  →  https://api.example.com/v1/pay/admin/products
                  /paywall/v1/quote  →  https://api.example.com/v1/pay/paywall/v1/quote
```

Include the prefix in `serverUrl` — do **not** rewrite paths in the proxy.

### Both servers behind one domain

```tsx
const hostContext = {
  cedrosLogin: {
    serverUrl: 'https://api.example.com/auth',    // proxy: /auth/* → login server
    ...
  },
  cedrosPay: {
    serverUrl: 'https://api.example.com/pay',     // proxy: /pay/* → pay server
  },
};
```

---

## 7. Troubleshooting

### Auth issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| 401 on all admin sections | `getAccessToken` returns `null` | Verify user is logged in and `getAccessToken()` returns a string |
| 401 after token refresh | Stale closure in `getAccessToken` | Ensure callback reads from reactive state, not a captured variable |
| 401 on cedros-pay only | `cedrosPay.serverUrl` points to wrong server | Check the URL matches your pay server deployment |
| 403 on all sections | JWT lacks `is_system_admin` claim | Mark user as system admin in cedros-login |
| cedros-login sections work, pay sections 401 | `cedrosPay.serverUrl` missing or wrong | Both `serverUrl` fields must be set correctly |

### Section / sidebar issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| Sections missing from sidebar | `org.permissions` filtering them out | Check `requiredPermission` on sections vs user's permissions |
| Deep-link falls back to default | Qualified ID not in allowlist | Add all 21 section IDs (see Section 4) |
| Sections in wrong order | Plugin registration order or order values | Check group order (first-wins) and section order values |
| "Configuration" group shows twice | Two groups with different labels | Both plugins must use exact same label string (`"Configuration"`) |
| Section renders but API calls fail | Wrong `serverUrl` for that plugin | Each plugin uses its own `serverUrl` from hostContext |

### Common mistakes

1. **Passing the same `serverUrl` to both plugins** — cedros-login and cedros-pay are separate servers with different `/admin/*` endpoints.

2. **Setting `jwtToken` but not `getAccessToken`** — `jwtToken` is a fallback. The primary auth path is `cedrosLogin.getAccessToken()`. If you only set `jwtToken`, token refresh won't work.

3. **Forgetting `user` in `cedrosLogin`** — AdminShell uses `user` for the profile dropdown. Without it, the UI shows an anonymous state even when authenticated.

4. **Not including `org.permissions`** — cedros-login sections use `requiredPermission` for visibility. Without org permissions, AdminShell falls back to "show everything if authenticated" which may not be what you want.
