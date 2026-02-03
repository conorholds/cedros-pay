# Cedros Pay

[![npm version](https://badge.fury.io/js/%40cedros%2Fpay-react.svg)](https://www.npmjs.com/package/@cedros/pay-react)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@cedros/pay-react)](https://bundlephobia.com/package/@cedros/pay-react)
[![Stripe-only: <100KB](https://img.shields.io/badge/stripe--only-%3C100KB-success)]()
[![Tests](https://img.shields.io/badge/tests-55%20passed-brightgreen)](https://github.com/conorholds/cedros-pay/tree/main/ui)

> **Three payment rails. One React component.**

Stripe for cards. Solana USDC for wallets. Credits for cedros-login users. Uses your existing products. No deposit wallets. No monitoring. No custom crypto backend.

---

## Ecommerce UI (Cedros Shop)

This repo now includes a provider-agnostic storefront UI layer (catalog + cart + checkout orchestration) built in a shadcn-inspired style.

- Docs: `docs/ecommerce/README.md`
- Import: `import { ecommerce } from '@cedros/pay-react'`

## What is Cedros Pay?

**One component, three payment rails.** Stripe for cards, Solana USDC for wallets, Credits for account balances. No second checkout.

Cedros Pay connects traditional payments (Stripe) with crypto (Solana x402) and account credits (cedros-login) using the product IDs you already have. No deposit wallets to manage. No wallet infrastructure to secure. No custody risk.

### The Problem with Traditional Crypto Payments

Adding crypto to your store traditionally requires:

- Creating deposit wallets per user
- Monitoring deposits 24/7
- Sweeping funds to your merchant wallet
- Storing wallet state in your database
- Building Stripe separately
- Maintaining two systems

### The Cedros Pay Solution

```tsx
<CedrosPay
  resource="your-product-id" // from your DB
  onPaymentSuccess={(txId) => unlockContent(txId)}
/>
```

---

## How It Works (x402)

x402 makes Solana payments stateless. The client includes a signed transaction with the request. Your backend verifies it on-chain and unlocks the resource.

**Flow:**

```
Traditional:
User → Deposit Wallet (you manage) → Monitor → Sweep → Merchant
         ↓
  Store state in DB
         ↓
  Custody risk

x402:
User → Sign Transaction → Your Backend → Verify On-Chain → Merchant (Direct)
```

**Three key benefits:**

- No deposit wallets
- No sweeping funds
- No payment state in your DB

---

## Key Features

### 1. One Component, Three Rails

Stripe for cards, Solana USDC for wallets, Credits for account balances. No second checkout.

```tsx
<CedrosPay resource="product-1" />
// All three payment methods work
```

### 2. Works With Your Products

Pass your DB ID. No new schema.

```tsx
<CedrosPay resource="existing-product-123" />
// resource = your database primary key
```

### 3. Real Ecommerce, Not Just a Button

Carts, coupons, refunds, metadata.

```tsx
<CedrosPay
  items={[{ resource: "item-1", quantity: 2 }]}
  couponCode="LAUNCH50"
/>
```

### 4. Auto-Detects Payment Options

Shows available payment methods based on user context.

```tsx
// User without wallet, not logged in:
[Pay with Card]

// User with Phantom wallet:
[Pay with Card] [Pay with Crypto]

// User logged into cedros-login:
[Pay with Card] [Pay with Crypto] [Pay with Credits]
```

### 5. Agent-Ready

x402 over HTTP; agents pay per request.

```bash
GET /api/premium-data
X-PAYMENT: <signed-transaction>
# Agent gets data instantly
```

### 6. Credits Payment (cedros-login)

Let users pay with account credits. Instant, zero-fee payments.

```tsx
import { useCedrosLogin } from '@cedros/login-react';

function Checkout() {
  const { authToken } = useCedrosLogin();

  return (
    <CedrosPay
      resource="product-1"
      display={{ showCredits: !!authToken }}
      checkout={{ authToken }}
    />
  );
}
```

### 7. Self-Host or Roll Your Own

React UI + Rust backend. Open API.

```tsx
<CedrosPay resource="item" wallets={customWallets} renderModal={CustomModal} />
```

**Additional Features:**

- 🌍 **Open source** — MIT-licensed and extensible
- 🔐 **Stateless & secure** — No user accounts or deposit addresses required
- 🧱 **Minimal integration** — Middleware or proxy for Rust APIs

---

## Quick Start (3 Steps in ~3 Minutes)

If you can wrap a provider, you can ship triple-rail payments.

### Step 1: Install

**Option 1: Stripe + Crypto (Full Features)**

```bash
npm install @cedros/pay-react \
  @solana/web3.js \
  @solana/spl-token \
  @solana/wallet-adapter-base \
  @solana/wallet-adapter-react \
  @solana/wallet-adapter-react-ui \
  @solana/wallet-adapter-wallets
```

**Option 2: Stripe Only (Smaller Bundle - ~75KB)**

```bash
npm install @cedros/pay-react
```

Use the `stripe-only` entry point to get a dramatically smaller bundle:

```tsx
import { CedrosProvider, StripeButton } from "@cedros/pay-react/stripe-only";
import "@cedros/pay-react/style.css";

function App() {
  return (
    <CedrosProvider
      config={{
        stripePublicKey: "pk_test_...",
        serverUrl: window.location.origin,
        solanaCluster: "mainnet-beta",
      }}
    >
      <StripeButton resource="item-id" />
    </CedrosProvider>
  );
}
```

### CDN Usage (Optional)

For zero-build prototyping or simple sites, you can import directly from a CDN:

```html
<!-- Styles -->
<link
  rel="stylesheet"
  href="https://unpkg.com/@cedros/pay-react@0.1.0/dist/style.css"
/>

<!-- Library (ESM) -->
<script type="module">
  import {
    CedrosProvider,
    StripeButton,
  } from "https://unpkg.com/@cedros/pay-react@0.1.0/dist/index.mjs";
  // Your code here
</script>
```

**CDN Options:**

- [unpkg.com](https://unpkg.com/@cedros/pay-react) - Fast, reliable, global CDN
- [jsdelivr.com](https://cdn.jsdelivr.net/npm/@cedros/pay-react) - Multi-CDN with fallback

**Performance Notes:**

- CDN providers (unpkg, jsdelivr) automatically serve with immutable cache headers (`Cache-Control: public, max-age=31536000, immutable`)
- For self-hosted deployments, set the same cache headers on `/dist/*` assets for optimal performance
- Pin to specific version (`@0.1.0`) in production to ensure stability

**Option 3: Crypto Only**

If you only need Solana crypto payments:

```bash
npm install @cedros/pay-react \
  @solana/web3.js \
  @solana/spl-token \
  @solana/wallet-adapter-base \
  @solana/wallet-adapter-react \
  @solana/wallet-adapter-react-ui \
  @solana/wallet-adapter-wallets
```

Then use the `crypto-only` entry point:

```tsx
import { CedrosProvider, CryptoButton } from "@cedros/pay-react/crypto-only";
import "@cedros/pay-react/style.css";

function App() {
  return (
    <CedrosProvider
      config={{
        stripePublicKey: "pk_test_...", // Required even for crypto-only (use a placeholder)
        serverUrl: window.location.origin,
        solanaCluster: "mainnet-beta",
      }}
    >
      <CryptoButton resource="item-id" />
    </CedrosProvider>
  );
}
```

**Note:** Even when using the `crypto-only` entry point, `stripePublicKey` is still required in the config (use a test/placeholder key if you don't have Stripe integration). This is a known limitation that will be addressed in a future version.

**Using the full bundle but hiding crypto button:**

```tsx
<CedrosPay resource="item-id" display={{ showCrypto: false }} />
```

### Step 2: Configure Provider

Wrap your app with credentials + cluster:

```tsx
import { CedrosProvider } from "@cedros/pay-react";
import "@cedros/pay-react/style.css";

function App() {
  return (
    <CedrosProvider
      config={{
        stripePublicKey: "pk_test_...",
        serverUrl: "https://your-api.com",
        solanaCluster: "mainnet-beta",
      }}
    >
      <YourApp />
    </CedrosProvider>
  );
}
```

### Step 3: Drop in the Component

On success → fulfill order:

```tsx
import { CedrosPay } from "@cedros/pay-react";

function Checkout() {
  return (
    <CedrosPay
      resource="your-product-id"
      callbacks={{
        onPaymentSuccess: (result) => {
          // Unlock content / fulfill order
          unlockContent(result.transactionId);
        },
      }}
    />
  );
}
```

**Backend options:** Use the Rust server, or implement the open API.

**Links:**

- [Backend setup →](https://github.com/conorholds/cedros-pay/tree/main/server)
- [Full docs →](https://docs.cedrospay.com)
- [Example apps →](https://github.com/conorholds/cedros-pay/tree/main/ui/tree/main/examples)

**Cross-Domain Backend (Optional):**
If your backend is on a different domain (e.g., `api.example.com` while your frontend is on `example.com`), explicitly set `serverUrl`:

```tsx
<CedrosProvider
  config={{
    stripePublicKey: "pk_test_...",
    serverUrl: "https://api.example.com", // Explicit URL for cross-domain
    solanaCluster: "mainnet-beta",
  }}
>
  {/* ... */}
</CedrosProvider>
```

### Backend Setup

Your backend must implement the Cedros Pay API endpoints:

```bash
cargo install cedros-pay-server
```

**Required Endpoints (v2.0.0+):**

- `GET /cedros-health` - Health check and route discovery
- `POST /paywall/v1/quote` - x402 payment quote (resource ID in body)
- `POST /paywall/v1/verify` - Payment verification (resource ID in X-PAYMENT header)
- `POST /paywall/v1/stripe-session` - Create Stripe checkout (single item)
- `GET /paywall/v1/stripe-session/verify` - Verify Stripe payment session (security-critical)
- `POST /paywall/v1/cart/checkout` - Create Stripe checkout (cart)
- `POST /paywall/v1/cart/quote` - Get x402 quote for cart items
- `POST /paywall/v1/gasless-transaction` - Build gasless transaction (optional)
- `POST /paywall/v1/nonce` - Generate nonce for admin authentication
- `POST /paywall/v1/refunds/request` - Create refund request (requires signature from original payer or admin)
- `POST /paywall/v1/refunds/pending` - Get all pending refunds (admin-only, requires nonce)
- `POST /paywall/v1/refunds/approve` - Get fresh quote for pending refund (admin-only)
- `POST /paywall/v1/refunds/deny` - Deny pending refund (admin-only)

**Example - Quote Request:**

```bash
POST /paywall/v1/quote
Content-Type: application/json

{
  "resource": "premium-article",
  "couponCode": "SAVE20"  # optional
}

# Response: 402 Payment Required with x402 quote
```

**Example - Payment Verification:**

```bash
POST /paywall/v1/verify
X-PAYMENT: <base64-encoded-payment-proof>

# Payment proof includes resource ID and type
# No resource IDs in URL path (security improvement)
```

**Example - Refund Request:**

```bash
POST /paywall/v1/refunds/request
Content-Type: application/json
X-Signature: <base64-encoded-signature>
X-Message: request-refund:<transaction-signature>
X-Signer: <wallet-address>

{
  "originalPurchaseId": "5jHxP...2QvK",  // Original transaction signature
  "recipientWallet": "9xQeW...Yhq",
  "amount": 10.5,
  "token": "USDC",
  "reason": "Customer requested refund"
}

# Signer must be the original payer OR admin wallet
# Recipient wallet must match the payer from original transaction
# Only one refund allowed per transaction signature
```

**Example - Get Pending Refunds (Admin - Nonce Required):**

```bash
# Step 1: Generate nonce
POST /paywall/v1/nonce
Content-Type: application/json

{
  "purpose": "list-pending-refunds"
}
# Response: { "nonce": "abc123...", "expiresAt": 1234567890 }

# Step 2: Fetch pending refunds with nonce
POST /paywall/v1/refunds/pending
Content-Type: application/json
X-Signature: <base64-encoded-signature>
X-Message: list-pending-refunds:<nonce>
X-Signer: <admin-wallet-address>

# Returns array of pending refund requests
# Response: [{ refundId, originalPurchaseId, recipientWallet, amount, token, reason, ... }]
```

See [Backend Integration](https://github.com/conorholds/cedros-pay/tree/main/server) and `@backend-migration-resource-leakage.md` for complete API reference and migration guide.

---

## Production Deployment

### Content Security Policy (CSP) Headers

**⚠️ Important:** Cedros Pay requires specific Content Security Policy directives to function correctly in production. Without these, Stripe and Solana RPC calls will be blocked by the browser.

#### Required CSP Directives

```http
Content-Security-Policy:
  script-src 'self' https://js.stripe.com;
  connect-src 'self' https://api.stripe.com https://*.stripe.com https://api.mainnet-beta.solana.com https://*.solana.com;
  frame-src https://js.stripe.com https://checkout.stripe.com;
```

**Breakdown:**

- `script-src` - Allows Stripe.js to load and execute
- `connect-src` - Allows API calls to Stripe and Solana RPC endpoints
- `frame-src` - Allows Stripe Checkout iframe to load

#### Framework-Specific Examples

**Next.js (App Router)**

```typescript
// next.config.js
const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
              "connect-src 'self' https://api.stripe.com https://*.stripe.com https://api.mainnet-beta.solana.com https://*.solana.com https://*.helius-rpc.com https://*.quicknode.pro",
              "frame-src https://js.stripe.com https://checkout.stripe.com",
            ].join("; "),
          },
        ],
      },
    ];
  },
};
```

**Next.js (Pages Router with Middleware)**

```typescript
// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  response.headers.set(
    "Content-Security-Policy",
    [
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
      "connect-src 'self' https://api.stripe.com https://*.stripe.com https://api.mainnet-beta.solana.com https://*.solana.com",
      "frame-src https://js.stripe.com https://checkout.stripe.com",
    ].join("; ")
  );

  return response;
}
```

**Vite (Development)**

```typescript
// vite.config.ts
import { defineConfig } from "vite";

export default defineConfig({
  server: {
    headers: {
      "Content-Security-Policy": [
        "script-src 'self' 'unsafe-inline' https://js.stripe.com",
        "connect-src 'self' https://api.stripe.com https://*.stripe.com https://api.mainnet-beta.solana.com https://*.solana.com",
        "frame-src https://js.stripe.com https://checkout.stripe.com",
      ].join("; "),
    },
  },
});
```

**Nginx**

```nginx
# nginx.conf
location / {
  add_header Content-Security-Policy "script-src 'self' https://js.stripe.com; connect-src 'self' https://api.stripe.com https://*.stripe.com https://api.mainnet-beta.solana.com https://*.solana.com; frame-src https://js.stripe.com https://checkout.stripe.com;" always;
}
```

**Express.js**

```javascript
// server.js
const helmet = require("helmet");

app.use(
  helmet.contentSecurityPolicy({
    directives: {
      scriptSrc: ["'self'", "https://js.stripe.com"],
      connectSrc: [
        "'self'",
        "https://api.stripe.com",
        "https://*.stripe.com",
        "https://api.mainnet-beta.solana.com",
        "https://*.solana.com",
      ],
      frameSrc: ["https://js.stripe.com", "https://checkout.stripe.com"],
    },
  })
);
```

**HTML Meta Tag (Not Recommended)**

```html
<!-- Use server headers instead when possible -->
<meta
  http-equiv="Content-Security-Policy"
  content="script-src 'self' https://js.stripe.com; connect-src 'self' https://api.stripe.com https://*.stripe.com https://api.mainnet-beta.solana.com https://*.solana.com; frame-src https://js.stripe.com https://checkout.stripe.com;"
/>
```

#### Custom RPC Endpoints

If you're using a custom Solana RPC provider (Helius, QuickNode, etc.), add their domains to `connect-src`:

```http
connect-src 'self'
  https://api.stripe.com
  https://*.stripe.com
  https://mainnet.helius-rpc.com
  https://*.quicknode.pro
  https://rpc.ankr.com;
```

#### Devnet/Testnet

For development against Solana devnet or testnet:

```http
connect-src 'self'
  https://api.stripe.com
  https://*.stripe.com
  https://api.devnet.solana.com
  https://api.testnet.solana.com;
```

### Troubleshooting CSP Issues

**Symptom:** Stripe Checkout doesn't load or throws CORS errors

```
Refused to load the script 'https://js.stripe.com/v3/' because it violates the following Content Security Policy directive: "script-src 'self'"
```

**Fix:** Add `https://js.stripe.com` to `script-src`

---

**Symptom:** Solana RPC calls fail with network errors

```
Refused to connect to 'https://api.mainnet-beta.solana.com' because it violates the following Content Security Policy directive: "connect-src 'self'"
```

**Fix:** Add your Solana RPC endpoint to `connect-src`

---

**Symptom:** Stripe Checkout redirects fail or show blank page

```
Refused to display 'https://checkout.stripe.com' in a frame because it violates the following Content Security Policy directive: "frame-src 'self'"
```

**Fix:** Add `https://checkout.stripe.com` to `frame-src`

---

### Testing CSP in Development

1. Open browser DevTools → Console
2. Look for CSP violation warnings (usually in red)
3. Check the Network tab for blocked requests
4. Add blocked domains to appropriate CSP directives

**Chrome DevTools Example:**

```
[Report Only] Refused to connect to 'https://api.stripe.com/v1/tokens'
because it violates the document's Content Security Policy.
```

### Best Practices

✅ **DO:**

- Use server-side headers (not meta tags) for CSP
- Test CSP in staging before deploying to production
- Use wildcards sparingly (`*.stripe.com` is okay, `*` is not)
- Include your custom RPC provider domains

❌ **DON'T:**

- Use `'unsafe-inline'` in production unless necessary
- Block Stripe or Solana domains
- Forget to add `frame-src` for Stripe Checkout
- Use overly permissive directives like `* 'unsafe-eval'`

---

### CSP Helper Generator

**⚠️ RECOMMENDED:** Use the `generateCSP()` helper to automatically generate correct CSP directives for your configuration. This prevents common misconfigurations that break payment widgets.

#### Quick Start

```typescript
import { generateCSP, RPC_PROVIDERS } from "@cedros/pay-react";

// Generate CSP for production with custom RPC
const csp = generateCSP({
  solanaCluster: "mainnet-beta",
  solanaEndpoint: "https://mainnet.helius-rpc.com",
  allowUnsafeScripts: true, // Required for Next.js
});

// Use in your framework
response.setHeader("Content-Security-Policy", csp);
```

#### Configuration Options

```typescript
interface CSPConfig {
  solanaCluster?: "mainnet-beta" | "devnet" | "testnet";
  solanaEndpoint?: string; // Custom RPC URL
  customRpcProviders?: string[]; // Additional RPC providers
  allowUnsafeScripts?: boolean; // For Next.js, etc.
  additionalScriptSrc?: string[];
  additionalConnectSrc?: string[];
  additionalFrameSrc?: string[];
  includeStripe?: boolean; // Set false for crypto-only
}
```

#### Framework Examples

**Next.js App Router:**

```typescript
// next.config.js
import { generateCSP } from "@cedros/pay-react";

const csp = generateCSP({
  solanaCluster: "mainnet-beta",
  solanaEndpoint: process.env.SOLANA_RPC_URL,
  allowUnsafeScripts: true,
});

const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [{ key: "Content-Security-Policy", value: csp }],
      },
    ];
  },
};

export default nextConfig;
```

**Express with Helmet:**

```typescript
import { generateCSP } from "@cedros/pay-react";
import helmet from "helmet";

const cspDirectives = generateCSP(
  {
    solanaCluster: "mainnet-beta",
    solanaEndpoint: process.env.SOLANA_RPC_URL,
  },
  "helmet" // Returns object format for helmet
);

app.use(helmet.contentSecurityPolicy({ directives: cspDirectives }));
```

**Vite Development:**

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import { generateCSP } from "@cedros/pay-react";

const csp = generateCSP({
  solanaCluster: "devnet",
  allowUnsafeScripts: true,
});

export default defineConfig({
  server: {
    headers: {
      "Content-Security-Policy": csp,
    },
  },
});
```

#### Presets

Use presets for common scenarios:

```typescript
import { generateCSP, CSP_PRESETS } from "@cedros/pay-react";

// Production mainnet with custom RPC
const csp1 = generateCSP(
  CSP_PRESETS.MAINNET_CUSTOM_RPC("https://mainnet.helius-rpc.com")
);

// Next.js with mainnet
const csp2 = generateCSP(
  CSP_PRESETS.MAINNET_NEXTJS("https://mainnet.helius-rpc.com")
);

// Devnet testing
const csp3 = generateCSP(CSP_PRESETS.DEVNET());

// Crypto-only (no Stripe)
const csp4 = generateCSP(CSP_PRESETS.CRYPTO_ONLY());

// Stripe-only (no Solana)
const csp5 = generateCSP(CSP_PRESETS.STRIPE_ONLY());
```

#### Common RPC Providers

```typescript
import { RPC_PROVIDERS } from "@cedros/pay-react";

const csp = generateCSP({
  customRpcProviders: [
    RPC_PROVIDERS.HELIUS, // https://*.helius-rpc.com
    RPC_PROVIDERS.QUICKNODE, // https://*.quicknode.pro
    RPC_PROVIDERS.FLUX, // https://*.fluxrpc.com
    RPC_PROVIDERS.TRITON, // https://*.rpcpool.com
  ],
});
```

#### Output Formats

The helper supports multiple output formats:

```typescript
// HTTP header format (default)
const header = generateCSP(config, "header");
// "script-src 'self' https://js.stripe.com; connect-src ..."

// HTML meta tag format
const meta = generateCSP(config, "meta");

// Next.js config format
const nextjs = generateCSP(config, "nextjs");

// Express helmet format (object)
const helmet = generateCSP(config, "helmet");
// { scriptSrc: [...], connectSrc: [...], frameSrc: [...] }

// Nginx config format
const nginx = generateCSP(config, "nginx");

// Raw directives object
const directives = generateCSP(config, "directives");
```

#### Why Use the Helper?

✅ **Prevents common errors:**

- Forgetting Solana RPC endpoints
- Missing Stripe iframe domains
- Wrong cluster URLs (devnet vs mainnet)

✅ **Type-safe configuration:**

- TypeScript autocomplete for all options
- Validates cluster names
- Catches typos at compile time

✅ **Framework-agnostic:**

- Works with Next.js, Express, Vite, Nginx, etc.
- Multiple output formats
- No dependencies

---

### Security Best Practices

#### Subresource Integrity (SRI) for Stripe.js

**⚠️ IMPORTANT: Cedros Pay does NOT use SRI hashes for Stripe.js, and this is intentional.**

**Why SRI is NOT used:**

- **Stripe updates frequently** - Security patches and bug fixes are pushed without URL changes
- **SRI breaks automatic updates** - Hardcoded hashes prevent receiving critical security fixes
- **Stripe's official recommendation** - Stripe explicitly advises against using SRI
- **Alternative protection** - Content Security Policy (CSP) provides the security layer

**From Stripe's documentation:**

> "We do not recommend using Subresource Integrity (SRI) with Stripe.js. Stripe.js is served from a highly-available CDN, and we regularly update the library to address security issues and improve functionality. Using SRI would prevent you from receiving these automatic updates."

**How Cedros Pay Protects Against CDN Compromise:**

1. **Content Security Policy (CSP)**

   ```http
   Content-Security-Policy: script-src 'self' https://js.stripe.com
   ```

   - Prevents loading scripts from unauthorized domains
   - Blocks inline scripts and eval()
   - Works with Stripe's automatic updates

2. **Package Integrity via npm**

   ```json
   {
     "dependencies": {
       "@stripe/stripe-js": "^2.4.0"
     }
   }
   ```

   - `package-lock.json` contains integrity hashes for npm packages
   - npm verifies package integrity on installation
   - Protects against tampering with the loader

3. **HTTPS Enforcement**

   - Stripe.js is loaded over HTTPS only
   - Modern browsers enforce secure connections
   - Certificate pinning via browser trust store

4. **Version Pinning** (optional)
   ```json
   {
     "dependencies": {
       "@stripe/stripe-js": "2.4.0" // Exact version (no caret)
     }
   }
   ```
   - Prevents unexpected updates
   - Review changelog before upgrading
   - Balance security updates vs. stability

**Recommended Security Checklist:**

✅ **DO:**

- Use CSP headers with `script-src https://js.stripe.com`
- Keep `@stripe/stripe-js` updated for security patches
- Use HTTPS for all connections
- Enable npm package auditing (`npm audit`)
- Review Stripe's changelog before major updates
- Monitor Stripe's security advisories

❌ **DON'T:**

- Add SRI hashes to Stripe.js (breaks updates)
- Allow `script-src *` in CSP (too permissive)
- Use outdated versions of @stripe/stripe-js
- Load Stripe.js from third-party CDNs
- Disable HTTPS enforcement

**Alternative: Self-Hosting Stripe.js (NOT RECOMMENDED)**

While technically possible to self-host Stripe.js with SRI, Stripe strongly discourages this:

- ❌ Miss critical security updates
- ❌ Break PCI DSS compliance requirements
- ❌ Lose Stripe's CDN performance benefits
- ❌ Violate Stripe's Terms of Service

**For maximum security, follow Stripe's recommendations and use CSP instead of SRI.**

---

## 🌍 Internationalization (i18n)

Cedros Pay supports multiple languages with automatic browser locale detection and zero-configuration setup.

### Supported Languages

Currently available (auto-detected from `src/i18n/translations/` folder):

- 🇺🇸 **English** (en) - Default
- 🇪🇸 **Spanish** (es)

### Usage

**Automatic (recommended):**

```tsx
import { useTranslation } from "@cedros/pay-react";

function PaymentButton() {
  const { t } = useTranslation(); // Auto-detects browser language

  return (
    <button>{t("ui.pay_with_card")}</button> // "Pay with Card" or "Pagar con Tarjeta"
  );
}
```

**Manual locale override:**

```tsx
function SpanishOnlyButton() {
  const { t } = useTranslation("es"); // Force Spanish
  return <button>{t("ui.pay_with_card")}</button>; // Always "Pagar con Tarjeta"
}
```

**Error messages (automatic):**

```tsx
import { PaymentError } from "@cedros/pay-react";

// Errors are automatically localized based on user's browser language
error.getUserMessage(); // Returns localized message + action
error.getShortMessage(); // Returns just the message (no action)
error.getAction(); // Returns just the action guidance
```

### Available Translation Keys

**UI Labels:**

- `ui.pay_with_card` - "Pay with Card"
- `ui.pay_with_crypto` - "Pay with USDC"
- `ui.connect_wallet` - "Connect Wallet"
- `ui.processing` - "Processing..."
- `ui.loading` - "Loading..."
- `ui.close` - "Close"
- `ui.cancel` - "Cancel"
- `ui.confirm` - "Confirm"
- `ui.retry` - "Try Again"
- `ui.contact_support` - "Contact Support"

**Error Messages:**

```tsx
t("errors.insufficient_funds_token.message"); // "Insufficient balance in your wallet"
t("errors.insufficient_funds_token.action"); // "Add more funds to your wallet and try again."
```

**Wallet Messages:**

```tsx
t("wallet.no_wallet_detected"); // "No Solana wallet detected"
t("wallet.install_wallet"); // "Please install a Solana wallet..."
t("wallet.wallet_connection_failed"); // "Failed to connect wallet"
```

### Adding New Languages

1. **Create translation file** in `src/i18n/translations/{locale}.json`:

   ```json
   // src/i18n/translations/fr.json
   {
     "locale": "fr",
     "ui": {
       "pay_with_card": "Payer par Carte",
       "pay_with_crypto": "Payer avec USDC",
       ...
     },
     "errors": { ... }
   }
   ```

2. **That's it!** The system automatically detects new files and loads them.

See `src/i18n/TRANSLATION_INSTRUCTIONS.md` for detailed translation guidelines.

### Dynamic Language Loading

The i18n system:

- ✅ Auto-detects available languages from file system
- ✅ Only loads the language the user needs (tree-shakeable)
- ✅ Falls back to English if translation missing
- ✅ Zero configuration required

---

## Type Versioning Policy

Cedros Pay uses **semantic versioning for TypeScript types** to prevent breaking changes from affecting your code.

### How It Works

All types are exported in versioned namespaces (`v1`, `v2`, etc.):

```tsx
// Recommended: Use top-level exports (always points to current stable version)
import { X402Requirement, PaymentResult } from "@cedros/pay-react";

// Explicit version (locks to v1, won't break on v2 release)
import { v1 } from "@cedros/pay-react";
const requirement: v1.X402Requirement = {
  /* ... */
};

// Future: When v2 is released, you can migrate gradually
import { v2 } from "@cedros/pay-react";
const newRequirement: v2.X402Requirement = {
  /* ... */
};
```

### Breaking Change Example

If we need to change `X402Requirement.maxAmountRequired` from `string` to `bigint`:

1. **v1 namespace remains unchanged** - Your existing code keeps working
2. **v2 namespace** is created with the new type
3. **Top-level exports** point to v2 (with major version bump)
4. You can migrate at your own pace:

```tsx
// Your old code still works with v1
import { v1 } from "@cedros/pay-react";
const oldReq: v1.X402Requirement = { maxAmountRequired: "1000000" };

// New code uses v2
import { v2 } from "@cedros/pay-react";
const newReq: v2.X402Requirement = { maxAmountRequired: 1000000n };
```

### Stability Guarantee

- **v1 types are frozen** - No breaking changes, ever
- **Top-level exports** may change across major versions
- **Older versions remain available** for backward compatibility
- **Clear migration path** when breaking changes are necessary

---

## 📖 Core Concepts

### Single Item Purchase

```tsx
<CedrosPay
  resource="article-123"
  callbacks={{
    onPaymentSuccess: (result) => unlockContent(result.transactionId),
  }}
/>
```

### Cart Checkout (Multiple Items)

```tsx
<CedrosPay
  items={[
    { resource: "product-1", quantity: 2 },
    { resource: "product-2", quantity: 1 },
  ]}
  callbacks={{
    onPaymentSuccess: (result) => processOrder(result.transactionId),
  }}
/>
```

### Subscriptions

Cedros Pay supports recurring subscriptions with both Stripe and crypto (x402) payments.

**Stripe Subscription Checkout:**

```tsx
import { SubscribeButton } from "@cedros/pay-react";

<SubscribeButton
  resource="plan-pro"
  interval="monthly"
  trialDays={14}
  onSubscriptionSuccess={(result) => {
    console.log("Subscribed:", result.subscriptionStatus);
  }}
/>;
```

**Crypto Subscription (x402):**

```tsx
import { CryptoSubscribeButton } from "@cedros/pay-react";

<CryptoSubscribeButton
  resource="plan-pro"
  interval="monthly"
  onSubscriptionSuccess={(result) => {
    console.log("Subscription active until:", result.expiresAt);
  }}
/>;
```

**Credits Subscription (cedros-login):**

```tsx
import { CreditsSubscribeButton } from "@cedros/pay-react";

<CreditsSubscribeButton
  resource="plan-pro"
  interval="monthly"
  authToken={user.cedrosToken}
  userId={user.id}
  autoCheckStatus
  onSubscriptionSuccess={(result) => {
    console.log("Subscription active until:", result.expiresAt);
  }}
/>;
```

**Subscription Management (Upgrade/Downgrade/Cancel):**

```tsx
import { SubscriptionManagementPanel } from "@cedros/pay-react";

<SubscriptionManagementPanel
  resource="plan-pro"
  userId="user@example.com"
  availablePlans={[
    { resource: "plan-basic", name: "Basic", price: 999, currency: "USD", interval: "monthly" },
    { resource: "plan-pro", name: "Pro", price: 1999, currency: "USD", interval: "monthly" },
    { resource: "plan-enterprise", name: "Enterprise", price: 4999, currency: "USD", interval: "monthly" },
  ]}
  onSubscriptionChanged={(newResource) => console.log("Changed to:", newResource)}
  onSubscriptionCanceled={() => console.log("Subscription canceled")}
  showBillingPortal
/>;
```

**Programmatic Subscription Management:**

```tsx
import { useSubscriptionManagement } from "@cedros/pay-react";

function SubscriptionSettings({ userId }: { userId: string }) {
  const {
    subscription,
    status,
    loadSubscription,
    previewChange,
    changeSubscription,
    cancelSubscription,
    openBillingPortal,
  } = useSubscriptionManagement();

  useEffect(() => {
    loadSubscription("plan-pro", userId);
  }, [userId]);

  const handleUpgrade = async () => {
    // Preview proration before confirming
    const preview = await previewChange("plan-pro", "plan-enterprise", userId);
    if (preview && confirm(`Upgrade for $${preview.immediateAmount / 100}?`)) {
      await changeSubscription({ newResource: "plan-enterprise" });
    }
  };

  return (
    <div>
      {subscription && (
        <>
          <p>Plan: {subscription.resource}</p>
          <p>Status: {subscription.status}</p>
          <button onClick={handleUpgrade}>Upgrade to Enterprise</button>
          <button onClick={() => cancelSubscription(false)}>Cancel at Period End</button>
          <button onClick={() => openBillingPortal(userId)}>Manage Billing</button>
        </>
      )}
    </div>
  );
}
```

**Billing Intervals:** `weekly`, `monthly`, `yearly`, `custom`

**Subscription Features:**

- Trial periods (Stripe)
- Proration on plan changes
- Immediate or period-end cancellation
- Stripe billing portal integration
- Backend-verified subscription status for x402 gating

### Coupon Codes

```tsx
<CedrosPay
  resource="premium-content"
  checkout={{
    couponCode: "LAUNCH50", // Pass from user input or auto-apply
  }}
/>
```

**Coupon Stacking Supported!** Unlimited auto-apply coupons can stack with 1 manual coupon code. Percentage discounts apply first (multiplicatively), then fixed discounts are subtracted.

#### Two-Phase Coupon System

Coupons are applied in two phases to provide clear pricing transparency:

1. **Catalog-level coupons** - Product-specific discounts shown on product pages

   - Configured with `applies_at: catalog` and specific `product_ids`
   - Example: "20% off this specific item"
   - Discounted price shown immediately when viewing the product

2. **Checkout-level coupons** - Site-wide promotions applied at cart
   - Configured with `applies_at: checkout` and `scope: all`
   - Example: "10% off your entire order"
   - Applied after catalog discounts at checkout

**Single Product Quote Response:**

```json
{
  "crypto": {
    "maxAmountRequired": "184000", // Actual amount to charge (atomic units)
    "extra": {
      "original_amount": "1.000000",
      "discounted_amount": "0.184000",
      "applied_coupons": "PRODUCT20,SITE10,CRYPTO5AUTO,FIXED5", // All applied
      "catalog_coupons": "PRODUCT20", // Product-specific
      "checkout_coupons": "SITE10,CRYPTO5AUTO,FIXED5", // Site-wide
      "decimals": 6
    }
  }
}
```

**Cart Quote Response:**

```json
{
  "totalAmount": 2.7661,
  "metadata": {
    "subtotal_after_catalog": "3.820000",
    "discounted_amount": "2.766100",
    "catalog_coupons": "PRODUCT20",
    "checkout_coupons": "SITE10,CRYPTO5AUTO,FIXED5",
    "coupon_codes": "PRODUCT20,SITE10,CRYPTO5AUTO,FIXED5"
  },
  "items": [
    {
      "resource": "item-1",
      "priceAmount": 0.8, // After catalog discount
      "originalPrice": 1.0,
      "appliedCoupons": ["PRODUCT20"]
    }
  ]
}
```

**Display Guidelines:**

- **Product pages:** Show strikethrough original price with catalog discount
- **Cart:** Show catalog discounts on items, checkout discounts in summary
- **Always use `maxAmountRequired` for actual transactions** - `extra` fields are display-only

Coupons are configured server-side with:

- Percentage or fixed amount discounts
- Expiration dates
- Usage limits
- Auto-apply functionality
- Payment method filtering (Stripe-only, x402-only, or both)
- Phase configuration (`applies_at: catalog` or `checkout`)

After a successful x402 payment, parse applied coupons from the settlement response:

```tsx
import {
  parseCouponCodes,
  calculateDiscountPercentage,
} from "@cedros/pay-react";

// Parse applied coupons
const appliedCoupons = parseCouponCodes(settlement.metadata);
// ["SITE10", "CRYPTO5AUTO", "SAVE20"]

// Calculate total discount percentage
const discountPercent = calculateDiscountPercentage(
  parseFloat(settlement.metadata.original_amount),
  parseFloat(settlement.metadata.discounted_amount)
);
```

### Theme Customization

```tsx
<CedrosProvider
  config={{
    stripePublicKey: "pk_test_...",
    serverUrl: window.location.origin,
    solanaCluster: "mainnet-beta",
    theme: "dark", // "light" or "dark"
    themeOverrides: {
      stripeBackground: "#6366f1",
      cryptoBackground: "#0ea5e9",
      buttonBorderRadius: "12px",
    },
  }}
>
  {/* Your app */}
</CedrosProvider>
```

### Unstyled Mode (Custom Design Systems)

For complete control over styling, use the `unstyled` prop to disable all default styles:

```tsx
<CedrosProvider
  config={{
    stripePublicKey: "pk_test_...",
    serverUrl: window.location.origin,
    solanaCluster: "mainnet-beta",
    unstyled: true, // Disables all default CSS classes and styles
  }}
>
  <CedrosPay
    resource="item-id"
    display={{ className: "my-custom-button-class" }}
  />
</CedrosProvider>
```

**Why use unstyled mode?**

- Build custom design systems without fighting CSS specificity
- Use your own CSS framework (Tailwind, Material UI, etc.)
- Full control over component appearance and behavior
- No need to override or reset default styles

**What gets disabled:**

- All `cedros-theme__*` CSS classes
- Default inline styles from theme tokens
- Button styling (stripe/crypto gradients, hover effects)
- Error/success message styling

**What you still get:**

- All payment logic and wallet integration
- Event handlers and callbacks
- Component structure and behavior
- Props like `className` for your custom styling

---

## Admin Dashboard

Cedros Pay includes a complete admin dashboard for managing your store. Use it standalone or combine it with cedros-login for a unified admin experience.

### Standalone Dashboard

Drop in `<CedrosPayAdminDashboard />` for a complete payment admin interface:

```tsx
import { CedrosPayAdminDashboard } from "@cedros/pay-react";

function AdminPage() {
  return (
    <CedrosPayAdminDashboard
      serverUrl="https://api.example.com"
      title="My Store"
      defaultSection="transactions"
    />
  );
}
```

**Available Sections:**

| Section | Description |
|---------|-------------|
| `transactions` | Payment history with filtering by method |
| `products` | Manage products, pricing, and variations |
| `subscriptions` | Configure subscription plans |
| `coupons` | Create and manage discount codes |
| `refunds` | Process refund requests |
| `storefront` | Customize shop layout and appearance |
| `ai-settings` | Configure AI-powered features |
| `payment-settings` | Payment method configuration |
| `messaging` | Email and notification templates |
| `settings` | Server and integration settings |

### Unified Dashboard with Plugin System

For apps using both **cedros-login** and **cedros-pay**, use cedros-login's `AdminShell` component with the `cedrosPayPlugin` to create a combined admin interface:

```tsx
import { AdminShell, cedrosLoginPlugin, useCedrosLogin } from "@cedros/login-react";
import { cedrosPayPlugin } from "@cedros/pay-react";

function UnifiedAdmin() {
  const { user, getAccessToken, serverUrl } = useCedrosLogin();

  // Build host context from your auth providers
  const hostContext = {
    cedrosLogin: {
      user,
      getAccessToken,
      serverUrl,
    },
    cedrosPay: {
      serverUrl: "https://api.example.com",
    },
  };

  return (
    <AdminShell
      title="Admin Dashboard"
      plugins={[cedrosLoginPlugin, cedrosPayPlugin]}
      hostContext={hostContext}
      defaultSection="cedros-pay:transactions"
    />
  );
}
```

> **Note:** The `AdminShell` component is provided by `@cedros/login-react`. This package only exports the `cedrosPayPlugin` for use with their shell.

### cedrosPayPlugin Sections

The plugin registers these sections for the unified dashboard:

| Section ID | Group | Description |
|------------|-------|-------------|
| `transactions` | Store | Payment transactions |
| `products` | Store | Product management |
| `subscriptions` | Store | Subscription plans |
| `coupons` | Store | Coupon management |
| `refunds` | Store | Refund requests |
| `storefront` | Configuration | Storefront settings |
| `ai-settings` | Configuration | AI assistant settings |
| `payment-settings` | Configuration | Payment method toggles |
| `messaging` | Configuration | Email/webhook settings |
| `settings` | Configuration | Server configuration |

### Section Addressing

Sections are addressed using the format `pluginId:sectionId`:

- `cedros-pay:transactions` - Cedros Pay transactions
- `cedros-pay:products` - Cedros Pay products
- `cedros-login:users` - Cedros Login user management
- `cedros-login:orgs` - Cedros Login organizations

See the [cedros-login documentation](https://github.com/cedros-dev/cedros-login) for full `AdminShell` API reference and custom plugin creation.

---

## Props Reference

### CedrosProvider Configuration

| Prop                          | Type                                      | Description                                                                                                                                                    |
| ----------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `stripePublicKey`             | `string`                                  | Stripe publishable key (required)                                                                                                                              |
| `solanaCluster`               | `'mainnet-beta' \| 'devnet' \| 'testnet'` | Solana network (required)                                                                                                                                      |
| `serverUrl`                   | `string`                                  | Backend API URL (defaults to current origin)                                                                                                                   |
| `theme`                       | `'light' \| 'dark'`                       | Theme mode (default: 'light')                                                                                                                                  |
| `themeOverrides`              | `Partial<CedrosThemeTokens>`              | Custom theme token overrides                                                                                                                                   |
| `unstyled`                    | `boolean`                                 | Disable all default styles (default: false)                                                                                                                    |
| `solanaEndpoint`              | `string`                                  | Custom Solana RPC endpoint                                                                                                                                     |
| `tokenMint`                   | `string`                                  | SPL token mint address (default: USDC) - see [Token Mint Validation](#-token-mint-validation)                                                                  |
| `dangerouslyAllowUnknownMint` | `boolean`                                 | Allow unknown token mints (default: false) - ⚠️ WARNING: Only enable after triple-checking mint address - see [Token Mint Validation](#-token-mint-validation) |
| `logLevel`                    | `LogLevel`                                | Logging verbosity (default: `LogLevel.WARN` in production, `LogLevel.DEBUG` in development) - see [Logging](#-logging)                                         |

### CedrosPay Component

| Prop        | Type              | Description                                                  |
| ----------- | ----------------- | ------------------------------------------------------------ |
| `resource`  | `string`          | Single resource ID (use this OR items)                       |
| `items`     | `CartItem[]`      | Array of cart items (use this OR resource)                   |
| `checkout`  | `CheckoutOptions` | Customer email, coupons, redirects, metadata                 |
| `display`   | `DisplayOptions`  | Labels, visibility (showCard, showCrypto), layout, className |
| `callbacks` | `CallbackOptions` | onPaymentSuccess, onPaymentError, onPaymentAttempt           |
| `advanced`  | `AdvancedOptions` | Custom wallets, autoDetectWallets, testPageUrl               |

#### Checkout Options

| Field           | Type                     | Description                        |
| --------------- | ------------------------ | ---------------------------------- |
| `customerEmail` | `string`                 | Pre-fill email for Stripe checkout |
| `couponCode`    | `string`                 | Coupon code to apply               |
| `successUrl`    | `string`                 | Stripe redirect URL on success     |
| `cancelUrl`     | `string`                 | Stripe redirect URL on cancel      |
| `metadata`      | `Record<string, string>` | Custom tracking data               |

#### Display Options

| Field          | Type                         | Description                          |
| -------------- | ---------------------------- | ------------------------------------ |
| `cardLabel`    | `string`                     | Stripe button label                  |
| `cryptoLabel`  | `string`                     | Crypto button label                  |
| `creditsLabel` | `string`                     | Credits button label                 |
| `showCard`     | `boolean`                    | Show Stripe button (default: true)   |
| `showCrypto`   | `boolean`                    | Show crypto button (default: true)   |
| `showCredits`  | `boolean`                    | Show credits button (default: false) |
| `layout`       | `'vertical' \| 'horizontal'` | Button layout (default: 'vertical')  |
| `className`    | `string`                     | Custom CSS class                     |

#### Callback Options

| Field              | Type                                                  | Description                  |
| ------------------ | ----------------------------------------------------- | ---------------------------- |
| `onPaymentSuccess` | `(result: PaymentSuccessResult) => void`              | Called on successful payment |
| `onPaymentError`   | `(error: PaymentErrorDetail) => void`                 | Called on payment error      |
| `onPaymentAttempt` | `(method: 'stripe' \| 'crypto' \| 'credits') => void` | Called when payment starts   |

[Full API Reference →](https://github.com/conorholds/cedros-pay/tree/main/ui/tree/main/stories)

---

## ⚠️ Token Mint Validation

**CRITICAL:** Typos in token mint addresses result in payments being sent to the wrong token, causing **permanent loss of funds**.

Cedros Pay includes **strict validation** against known stablecoin addresses to prevent catastrophic misconfigurations. If you specify a `tokenMint` that doesn't match a known stablecoin, **initialization will fail with an error**.

### Known Stablecoins (mainnet-beta)

| Symbol | Mint Address                                   |
| ------ | ---------------------------------------------- |
| USDC   | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` |
| USDT   | `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB` |
| PYUSD  | `2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo` |
| CASH   | `CASHx9KJUStyftLFWGvEVf59SGeG9sh5FfcnZMVPCASH` |

### Strict Mode (Default)

By default, unknown token mints throw an error:

```tsx
<CedrosProvider
  config={{
    stripePublicKey: "pk_test_...",
    serverUrl: window.location.origin,
    solanaCluster: "mainnet-beta",
    tokenMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"  // ✅ USDC - works
  }}
>
  {/* ... */}
</CedrosProvider>

// Using an unknown token mint throws an error:
<CedrosProvider
  config={{
    stripePublicKey: "pk_test_...",
    serverUrl: window.location.origin,
    solanaCluster: "devnet",
    tokenMint: "CustomTokenMint123..."  // ❌ Throws error: SAFETY ERROR
  }}
>
  {/* ... */}
</CedrosProvider>
```

**Error Message:**

```
SAFETY ERROR: Unrecognized token mint address in CedrosConfig.tokenMint
  Provided: CustomTokenMint123...

This token mint does not match any known stablecoin addresses.
Using an unknown token mint can result in PERMANENT LOSS OF FUNDS if it's a typo.

Known stablecoin mints (mainnet-beta):
  USDC: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
  USDT: Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB
  PYUSD: 2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo
  CASH: CASHx9KJUStyftLFWGvEVf59SGeG9sh5FfcnZMVPCASH

If you are CERTAIN this is the correct mint address (custom token, testnet, or new stablecoin),
set dangerouslyAllowUnknownMint={true} in your CedrosProvider config.
```

### Permissive Mode (Opt-in)

For custom tokens, testnet tokens, or new stablecoins, you must explicitly opt-in:

```tsx
<CedrosProvider
  config={{
    stripePublicKey: "pk_test_...",
    serverUrl: window.location.origin,
    solanaCluster: "devnet",
    tokenMint: "CustomTokenMint123...", // Custom token
    dangerouslyAllowUnknownMint: true, // ⚠️ Explicit opt-in required
  }}
>
  {/* ... */}
</CedrosProvider>
```

**⚠️ WARNING:** Only enable `dangerouslyAllowUnknownMint` if you have **TRIPLE-CHECKED** the mint address. A typo will result in permanent loss of funds.

### Validation Points

Strict validation runs at **three points** to protect against fund loss:

1. **Config initialization** - When `<CedrosProvider>` mounts
2. **Payment quote** - When backend returns x402 quote with `asset` field
3. **Runtime** - When building Solana transactions

**Best Practices:**

1. ✅ Use known stablecoin mints in production (USDC, USDT, PYUSD, CASH)
2. ✅ Triple-check any custom mint addresses before enabling `dangerouslyAllowUnknownMint`
3. ✅ Test thoroughly on devnet before deploying to mainnet
4. ❌ Never copy-paste mint addresses without verification
5. ❌ Never use `dangerouslyAllowUnknownMint` unless absolutely necessary

---

## 📊 Logging

Cedros Pay includes structured logging with configurable log levels to control verbosity and keep production logs clean.

### Log Levels

```typescript
import { LogLevel } from "@cedros/pay-react";

export enum LogLevel {
  DEBUG = 0, // Detailed debug information (verbose)
  INFO = 1, // Informational messages
  WARN = 2, // Warnings and potentially problematic situations
  ERROR = 3, // Error messages only
  SILENT = 4, // No logging
}
```

### Default Behavior

- **Development:** `LogLevel.DEBUG` (show all logs)
- **Production:** `LogLevel.WARN` (warnings and errors only)

### Configuration

Control logging verbosity via the `logLevel` prop:

```typescript
import { CedrosProvider, LogLevel } from '@cedros/pay-react';

// Production: Only show errors
<CedrosProvider
  config={{
    stripePublicKey: "pk_live_...",
    serverUrl: window.location.origin,
    solanaCluster: "mainnet-beta",
    logLevel: LogLevel.ERROR
  }}
>
  <App />
</CedrosProvider>

// Development: Show all logs (default)
<CedrosProvider
  config={{
    stripePublicKey: "pk_test_...",
    serverUrl: window.location.origin,
    solanaCluster: "devnet",
    logLevel: LogLevel.DEBUG
  }}
>
  <App />
</CedrosProvider>

// CI/Testing: Silence all logs
<CedrosProvider
  config={{
    stripePublicKey: "pk_test_...",
    serverUrl: window.location.origin,
    solanaCluster: "devnet",
    logLevel: LogLevel.SILENT
  }}
>
  <App />
</CedrosProvider>
```

### Advanced Usage

For custom logging or integration with your logging infrastructure:

```typescript
import { createLogger, LogLevel } from "@cedros/pay-react";

// Create a custom logger instance
const logger = createLogger({
  level: LogLevel.INFO,
  prefix: "[MyApp]", // Optional prefix for all logs
});

// Use directly
logger.debug("Debug message");
logger.info("Info message");
logger.warn("Warning message");
logger.error("Error message");

// Update log level dynamically
logger.setLevel(LogLevel.ERROR);
```

### Log Format

All logs include timestamps and severity levels:

```
[2025-11-09T10:43:12.345Z] [CedrosPay] [WARN] Token mint validation warning...
[2025-11-09T10:43:15.678Z] [CedrosPay] [ERROR] Payment verification failed
```

### Best Practices

1. **Production:** Use `LogLevel.ERROR` or `LogLevel.WARN` to avoid exposing sensitive data
2. **Development:** Use `LogLevel.DEBUG` to troubleshoot payment flows
3. **CI/Testing:** Use `LogLevel.SILENT` to keep test output clean
4. **Monitoring:** Integrate with your logging infrastructure (Datadog, Sentry, etc.)

---

## 🪄 Example Use Cases

- Paywalled blog or API monetization
- Agent-to-agent microtransactions
- Subscription and one-time digital content unlocks
- AI service pay-per-call endpoints

---

### Semantic Versioning

We follow [Semantic Versioning](https://semver.org/):

- **Major (x.0.0)**: Breaking changes, API removals
- **Minor (0.x.0)**: New features, backwards-compatible additions
- **Patch (0.0.x)**: Bug fixes, no API changes

### Stable API Surface

**These exports are guaranteed stable** and follow semantic versioning:

- ✅ **Components** - All exported React components (CedrosPay, StripeButton, CryptoButton, CreditsButton, SubscribeButton, CryptoSubscribeButton, CreditsSubscribeButton, SubscriptionManagementPanel, etc.)
- ✅ **Hooks** - useCedrosContext, useStripeCheckout, useX402Payment, useCreditsPayment, useSubscription, useCryptoSubscription, useCreditsSubscription, useSubscriptionManagement, etc.
- ✅ **Manager Interfaces** - IStripeManager, IX402Manager, IWalletManager, ISubscriptionManager, ISubscriptionChangeManager, IRouteDiscoveryManager
- ✅ **Types** - All types exported via versioned namespaces (v1, v2, etc.)
- ✅ **Utilities** - validateConfig, parseCouponCodes, rate limiters, logging, events

**Use interfaces, not concrete classes:**

```typescript
// ✅ CORRECT: Use interface from context
import { useCedrosContext } from '@cedros/pay-react';

function MyComponent() {
  const { stripeManager } = useCedrosContext();
  // stripeManager is typed as IStripeManager (stable)
  await stripeManager.processPayment({ ... });
}

// ❌ WRONG: Direct class import (unsupported)
import { StripeManager } from '@cedros/pay-react'; // Not exported
const manager = new StripeManager(...); // Will break
```

### Deprecation Process

When APIs are deprecated:

1. **Deprecation Notice** - Warning logged, replacement documented
2. **Minimum 3 months** - Grace period for migration
3. **Migration Guide** - Step-by-step upgrade instructions
4. **Major Version** - Removal in next major release only

**Example Timeline:**

- v2.1.0: Deprecate oldAPI, introduce newAPI
- v2.2.0 - v2.x: Both supported, warnings logged
- v3.0.0: Remove oldAPI, only newAPI available

### Type Versioning

Types use versioned namespaces to prevent breaking changes:

```typescript
// Top-level exports (current stable version)
import { X402Requirement } from '@cedros/pay-react';

// Explicit version (locks to v1, won't break on v2)
import { v1 } from '@cedros/pay-react';
const req: v1.X402Requirement = { ... };

// Future version
import { v2 } from '@cedros/pay-react';
const newReq: v2.X402Requirement = { ... };
```

**Read more:** See [API_STABILITY.md](./API_STABILITY.md) for our complete stability policy.

---

## Error Telemetry (Optional)

Cedros Pay includes **opt-in error telemetry** with correlation IDs for production debugging. Telemetry is **disabled by default** and requires explicit configuration.

### Privacy-First Design

- ✅ **Opt-in only** - No data sent without your explicit configuration
- ✅ **User-controlled** - You choose what service to use (Sentry, Datadog, custom, or none)
- ✅ **PII sanitization** - Private keys, wallet addresses, emails automatically redacted
- ✅ **No hidden network calls** - Data only sent via your callback function

### Quick Start

```typescript
import { configureTelemetry, ErrorSeverity } from "@cedros/pay-react";
import * as Sentry from "@sentry/react";

// Enable telemetry with Sentry
configureTelemetry({
  enabled: true,
  sdkVersion: "2.0.0",
  environment: process.env.NODE_ENV,
  sanitizePII: true, // ALWAYS keep enabled
  onError: (error) => {
    Sentry.captureException(error.error, {
      extra: {
        correlationId: error.correlationId,
        paymentContext: error.paymentContext,
      },
      tags: error.tags,
      level: error.severity,
    });
  },
});
```

### Features

- **Correlation IDs** - Track errors across distributed systems
- **Error Enrichment** - Add payment context (method, stage, amount) without PII
- **PII Sanitization** - 15+ patterns including:
  - Private keys (Solana, Ethereum)
  - Wallet addresses
  - Seed phrases
  - API keys, JWT tokens
  - Credit cards, emails, phone numbers
- **Integration Examples** - Sentry, Datadog, custom backends

### Security Guarantees

```typescript
/**
 * SECURITY GUARANTEE:
 * - NEVER logs private keys, seed phrases, or wallet credentials
 * - NEVER sends data without explicit user configuration
 * - Sanitization ENABLED BY DEFAULT and cannot be fully disabled
 * - All sensitive crypto data patterns are redacted automatically
 */
```

### Correlation IDs for Support

```typescript
import { generateCorrelationId } from "@cedros/pay-react";

function PaymentButton() {
  const [correlationId] = useState(generateCorrelationId());

  const handleError = (error: Error) => {
    reportError(error, { correlationId });

    // Show correlation ID to user for support
    alert(`Payment failed. Support ID: ${correlationId}`);
  };
}
```

## Storybook Development

### Setup

1. **Copy the environment template:**

   ```bash
   cp .env.example .env
   ```

2. **Configure your credentials:**

   Edit `.env` and add your keys:

   ```bash
   # Stripe test key (required for card payments)
   VITE_STRIPE_PUBLIC_KEY=pk_test_your_key_here

   # Solana RPC endpoint (required for crypto payments)
   VITE_SOLANA_RPC_URL=https://your-rpc-endpoint/

   # Backend server URL
   VITE_SERVER_URL=http://localhost:8080
   ```

   **⚠️ Required for testing:**

   - **Stripe:** Get a test key from [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
   - **Solana RPC:** Public RPCs have strict rate limits. Get a free endpoint from:
     - [Helius](https://www.helius.dev/) (recommended)
     - [QuickNode](https://www.quicknode.com/)
     - [Alchemy](https://www.alchemy.com/)

3. **Run Storybook:**
   ```bash
   npm run storybook
   ```

### Troubleshooting

**Error: "Endpoint URL must start with `http:` or `https:`"**

This means `VITE_SOLANA_RPC_URL` or `VITE_STORYBOOK_SOLANA_ENDPOINT` is missing or empty in your `.env` file.

**Fix:**

```bash
# Add to .env
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com
# Or for Storybook-specific override:
VITE_STORYBOOK_SOLANA_ENDPOINT=https://api.devnet.solana.com
```

**Error: "Invalid Cedros configuration: serverUrl must be a non-empty string"**

The `VITE_SERVER_URL` or `VITE_STORYBOOK_SERVER_URL` is missing.

**Fix:**

```bash
# Add to .env
VITE_SERVER_URL=http://localhost:8080
```

### Environment Variables

| Variable                         | Description                       | Required                              |
| -------------------------------- | --------------------------------- | ------------------------------------- |
| `VITE_STRIPE_PUBLIC_KEY`         | Stripe publishable key            | ✅ For card payments                  |
| `VITE_SERVER_URL`                | Backend API endpoint              | ✅ (default: `http://localhost:8080`) |
| `VITE_SOLANA_CLUSTER`            | Solana network                    | Optional (default: `mainnet-beta`)    |
| `VITE_SOLANA_RPC_URL`            | Custom Solana RPC                 | ✅ For crypto payments                |
| `VITE_STORYBOOK_SERVER_URL`      | Override server URL for Storybook | Optional                              |
| `VITE_STORYBOOK_SOLANA_ENDPOINT` | Override RPC for Storybook        | Optional                              |

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on:

- Development setup and workflow
- Code standards and architecture principles
- Testing requirements
- PR submission process
- Security guidelines

Before submitting a PR, make sure all tests pass:

```bash
npm run lint
npm run type-check
npm test
npm run test:coverage
```

## License

MIT License - see [LICENSE](./LICENSE) for details.
