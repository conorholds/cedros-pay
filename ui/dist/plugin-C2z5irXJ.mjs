import { jsx as a, jsxs as l, Fragment as O } from "react/jsx-runtime";
import { useRef as X, useEffect as D, useLayoutEffect as kt, useId as Z, useState as w, useCallback as R, useMemo as $, lazy as jt } from "react";
import { f as wt, r as St, e as Ht, g as Vt, C as qt, a as qe, A as Gt } from "./adminModules-BgSESzo7.mjs";
import { u as Nt, b as Je } from "./useCedrosAutosave-BZATV2s-.mjs";
import { S as le, n as Kt } from "./locales-BNQRXSb3.mjs";
import { c as Se, b as ue, C as Yt, a as Jt } from "./constants-DA4fMjXZ.mjs";
const de = {
  cedrosBalance: "cedrosBalance",
  cedrosLogin: "cedrosLogin",
  cedrosPay: "cedrosPay",
  org: "org"
};
function ce(e, t) {
  const n = e.services?.[t];
  return n || e[t];
}
function zt() {
  return /* @__PURE__ */ a("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ a("path", { d: "M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" }) });
}
function Ct() {
  return /* @__PURE__ */ l("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ a("path", { d: "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" }),
    /* @__PURE__ */ a("circle", { cx: "12", cy: "12", r: "3" })
  ] });
}
function Xt() {
  return /* @__PURE__ */ l("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ a("rect", { x: "3", y: "3", width: "7", height: "7", rx: "1.5" }),
    /* @__PURE__ */ a("rect", { x: "14", y: "3", width: "7", height: "7", rx: "1.5" }),
    /* @__PURE__ */ a("rect", { x: "3", y: "14", width: "7", height: "7", rx: "1.5" }),
    /* @__PURE__ */ a("rect", { x: "14", y: "14", width: "7", height: "7", rx: "1.5" })
  ] });
}
const Be = {
  transactions: () => /* @__PURE__ */ a(zt, {}),
  settings: () => /* @__PURE__ */ a(Ct, {}),
  catalog: () => /* @__PURE__ */ a(Xt, {})
}, M = {
  settings: /* @__PURE__ */ a(Ct, {}),
  chevronRight: /* @__PURE__ */ a("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ a("path", { d: "m9 18 6-6-6-6" }) }),
  loading: /* @__PURE__ */ a("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "cedros-admin__spinner", children: /* @__PURE__ */ a("path", { d: "M21 12a9 9 0 1 1-6.219-8.56" }) }),
  refresh: /* @__PURE__ */ l("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ a("path", { d: "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" }),
    /* @__PURE__ */ a("path", { d: "M21 3v5h-5" }),
    /* @__PURE__ */ a("path", { d: "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" }),
    /* @__PURE__ */ a("path", { d: "M8 16H3v5" })
  ] }),
  check: /* @__PURE__ */ a("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ a("path", { d: "M20 6 9 17l-5-5" }) }),
  trash: /* @__PURE__ */ a("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ a("path", { d: "M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" }) }),
  plus: /* @__PURE__ */ a("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ a("path", { d: "M12 5v14M5 12h14" }) }),
  chevronDown: /* @__PURE__ */ a("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ a("path", { d: "m6 9 6 6 6-6" }) }),
  chevronUp: /* @__PURE__ */ a("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ a("path", { d: "m18 15-6-6-6 6" }) }),
  arrowUp: /* @__PURE__ */ l("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ a("path", { d: "m5 12 7-7 7 7" }),
    /* @__PURE__ */ a("path", { d: "M12 19V5" })
  ] }),
  arrowDown: /* @__PURE__ */ l("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ a("path", { d: "m5 12 7 7 7-7" }),
    /* @__PURE__ */ a("path", { d: "M12 5v14" })
  ] }),
  delete: /* @__PURE__ */ l("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ a("path", { d: "M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" }),
    /* @__PURE__ */ a("path", { d: "M10 11v6M14 11v6" })
  ] }),
  close: /* @__PURE__ */ a("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ a("path", { d: "M18 6 6 18M6 6l12 12" }) }),
  edit: /* @__PURE__ */ l("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ a("path", { d: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" }),
    /* @__PURE__ */ a("path", { d: "M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" })
  ] }),
  eye: /* @__PURE__ */ l("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ a("path", { d: "M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" }),
    /* @__PURE__ */ a("circle", { cx: "12", cy: "12", r: "3" })
  ] }),
  copy: /* @__PURE__ */ l("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ a("rect", { width: "14", height: "14", x: "8", y: "8", rx: "2", ry: "2" }),
    /* @__PURE__ */ a("path", { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" })
  ] }),
  eyeOff: /* @__PURE__ */ l("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ a("path", { d: "M9.88 9.88a3 3 0 1 0 4.24 4.24" }),
    /* @__PURE__ */ a("path", { d: "M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" }),
    /* @__PURE__ */ a("path", { d: "M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" }),
    /* @__PURE__ */ a("line", { x1: "2", x2: "22", y1: "2", y2: "22" })
  ] })
};
function ve({ message: e, onRetry: t }) {
  return e ? /* @__PURE__ */ l("div", { className: "cedros-data-status cedros-data-status--error cedros-admin__error-banner", role: "alert", children: [
    /* @__PURE__ */ a("span", { children: e }),
    t ? /* @__PURE__ */ a("div", { className: "cedros-data-status__actions", children: /* @__PURE__ */ a("button", { type: "button", className: "cedros-data-btn cedros-data-btn--secondary cedros-data-btn--sm", onClick: t, children: "Retry" }) }) : null
  ] }) : null;
}
function ze({ label: e, lines: t = 3 }) {
  return /* @__PURE__ */ l("div", { className: "cedros-admin__loading-state", role: "status", "aria-label": e, "aria-busy": "true", children: [
    /* @__PURE__ */ a("span", { className: "cedros-admin__visually-hidden", children: e }),
    /* @__PURE__ */ a("div", { className: "cedros-admin__loading-skeleton", "aria-hidden": "true", children: Array.from({ length: t }, (n, i) => /* @__PURE__ */ a("span", {}, i)) })
  ] });
}
function Pt(e, { intervalMs: t = 3e4, enabled: n = !0 } = {}) {
  const i = X(e);
  D(() => {
    i.current = e;
  }, [e]), D(() => {
    if (!n || t <= 0) return;
    const s = setInterval(() => i.current(), t);
    return () => clearInterval(s);
  }, [n, t]);
}
const Ne = {
  stripe: {
    label: "Stripe",
    secrets: ["secret_key", "webhook_secret"],
    icon: "💳",
    fields: {
      enabled: { hidden: !0 },
      // Shown in header toggle
      mode: {
        type: "segmented",
        options: ["test", "live"],
        optionLabels: { test: "Test mode", live: "Live mode" },
        default: "test",
        description: "Start in test mode while you set things up. Switch to live when you’re ready to accept real payments."
      },
      publishable_key: {
        label: "Publishable key",
        placeholder: "pk_live_…",
        description: "Identifies your account to Stripe in the browser. Safe to share.",
        helpUrl: "https://dashboard.stripe.com/apikeys",
        helpLabel: "Find your API keys"
      },
      secret_key: {
        label: "Secret key",
        placeholder: "sk_live_…",
        description: "Lets your server talk to Stripe. Stored encrypted once saved."
      },
      webhook_secret: {
        label: "Webhook signing secret",
        placeholder: "whsec_…",
        description: "Proves events really came from Stripe. Create a webhook endpoint for the URL below, then paste its signing secret here.",
        helpUrl: "https://dashboard.stripe.com/webhooks",
        helpLabel: "Set up your webhook"
      },
      tax_rate_id: {
        advanced: !0,
        type: "stripe_tax_rate_select",
        label: "Tax rate",
        placeholder: "txr_…",
        description: "Apply a Stripe tax rate at checkout. Leave empty if you don’t collect tax.",
        helpUrl: "https://dashboard.stripe.com/tax-rates",
        helpLabel: "Manage tax rates"
      },
      allowed_redirect_schemes: {
        advanced: !0,
        type: "array",
        label: "Mobile app redirect schemes",
        placeholder: "yourapp",
        description: "Custom URL schemes your mobile app uses to return from checkout, one per line. Regular https links always work."
      },
      success_url: { hidden: !0 },
      // Library provides default pages
      cancel_url: { hidden: !0 }
      // Library provides default pages
    },
    endpoints: [
      {
        label: "Your webhook endpoint",
        path: "/webhook/stripe",
        description: "Add this URL as a webhook endpoint in the Stripe Dashboard and select the checkout, subscription, and invoice events."
      }
    ]
  },
  native_store: {
    label: "App stores",
    description: "Verify Apple App Store and Google Play purchases and process store notifications.",
    secrets: ["apple_private_key", "google_private_key"],
    icon: "📱",
    groups: [
      {
        id: "apple",
        title: "Apple App Store",
        description: "Verify App Store purchases and receive Apple server notifications.",
        toggleField: "apple_enabled"
      },
      {
        id: "google",
        title: "Google Play",
        description: "Verify Play purchases and receive real-time developer notifications.",
        toggleField: "google_enabled"
      }
    ],
    fields: {
      enabled: { hidden: !0 },
      apple_enabled: { hidden: !0 },
      // Rendered as the Apple group toggle
      apple_issuer_id: {
        group: "apple",
        label: "Issuer ID",
        description: "From App Store Connect under Users and Access → Integrations → App Store Server API.",
        helpUrl: "https://appstoreconnect.apple.com/access/integrations/api",
        helpLabel: "Open App Store Connect"
      },
      apple_key_id: {
        group: "apple",
        label: "Key ID",
        description: "Shown beside the App Store Server API key you create."
      },
      apple_private_key: {
        group: "apple",
        type: "textarea",
        label: "Private key",
        placeholder: "-----BEGIN PRIVATE KEY-----",
        description: "Paste the contents of the .p8 key file you downloaded from Apple."
      },
      apple_bundle_id: {
        group: "apple",
        label: "Bundle ID",
        placeholder: "com.example.app",
        description: "Your iOS app’s bundle identifier."
      },
      apple_allow_sandbox_fallback: {
        group: "apple",
        type: "toggle",
        label: "Accept sandbox purchases",
        description: "Keep on while testing with TestFlight or the App Store sandbox."
      },
      google_enabled: { hidden: !0 },
      // Rendered as the Google group toggle
      google_service_account_email: {
        group: "google",
        label: "Service account email",
        placeholder: "name@project.iam.gserviceaccount.com",
        description: "The client_email from your service account JSON. The account needs Android Publisher access.",
        helpUrl: "https://play.google.com/console",
        helpLabel: "Open Play Console"
      },
      google_private_key: {
        group: "google",
        type: "textarea",
        label: "Service account private key",
        placeholder: "-----BEGIN PRIVATE KEY-----",
        description: "The private_key value from the same service account JSON."
      },
      google_package_name: {
        group: "google",
        label: "Package name",
        placeholder: "com.example.app",
        description: "Your Android app’s package name."
      },
      google_push_service_account_email: {
        group: "google",
        label: "Notification sender email",
        description: "The service-account email your Pub/Sub push subscription sends notifications as."
      },
      google_push_audience: {
        group: "google",
        label: "Notification audience",
        description: "The audience value set on the Pub/Sub push subscription. Often the push endpoint URL itself."
      }
    },
    endpoints: [
      {
        group: "apple",
        label: "Apple notification URL",
        path: "/paywall/v1/native-store/apple/notifications",
        description: "Paste into App Store Connect under App Store Server Notifications."
      },
      {
        group: "google",
        label: "Google RTDN endpoint",
        path: "/paywall/v1/native-store/google/notifications",
        description: "Use as the push endpoint for your Real-time developer notifications Pub/Sub subscription."
      }
    ]
  },
  x402: {
    label: "X402 (Crypto)",
    secrets: ["server_wallets"],
    icon: "⚡",
    fields: {
      enabled: { hidden: !0 },
      // Shown in header toggle
      payment_address: {
        type: "solana_address",
        label: "Payout wallet",
        description: "The Solana wallet that receives customer payments."
      },
      token_mint: {
        type: "token_mint",
        label: "Payment token",
        description: "The token customers pay with. USDC is the common choice."
      },
      gasless_enabled: {
        type: "toggle",
        label: "Cover network fees",
        description: "Pay the small Solana network fee for customers so they can pay without holding SOL."
      },
      server_wallets: {
        type: "secret_array",
        label: "Fee payer wallets",
        description: "Wallet keys your server uses to pay network fees. Keep their balances small and top up as needed.",
        showWhen: "gasless_enabled"
      },
      auto_create_token_account: {
        advanced: !0,
        type: "toggle",
        label: "Create missing token accounts",
        description: "Set up a customer’s token account automatically when one doesn’t exist. Requires fee payer wallets."
      },
      rounding_mode: {
        advanced: !0,
        type: "dropdown",
        options: ["standard", "ceiling"],
        optionLabels: { standard: "Round to nearest", ceiling: "Always round up" },
        label: "Price rounding",
        description: "How fractional token amounts are rounded at checkout."
      },
      token_symbol: { hidden: !0 },
      // Derived from the selected token
      token_decimals: { hidden: !0 },
      // Managed by token selector
      custom_token_symbol: { hidden: !0 },
      // Managed by token selector
      custom_token_icon: { hidden: !0 },
      // Managed by token selector
      network: { hidden: !0 },
      memo_prefix: { hidden: !0 },
      skip_preflight: { hidden: !0 },
      commitment: { hidden: !0 },
      compute_unit_limit: { hidden: !0 },
      compute_unit_price_micro_lamports: { hidden: !0 },
      allowed_tokens: { hidden: !0 }
      // Sensible default list
    }
  },
  paywall: {
    label: "Paywall",
    secrets: [],
    icon: "🚪",
    fields: {
      product_cache_ttl: { type: "number", unit: "seconds" }
    }
  },
  shop: {
    label: "Shop",
    secrets: [],
    icon: "🛒",
    fields: {
      guest_checkout: { type: "toggle", label: "Guest checkout" },
      refunds_enabled: { type: "toggle", label: "Refunds" },
      returns_enabled: { type: "toggle", label: "Returns" },
      inventory_enabled: { type: "toggle", label: "Inventory" },
      coupons_enabled: { type: "toggle", label: "Coupons" },
      shipping_enabled: { type: "toggle", label: "Shipping" },
      taxes_enabled: { type: "toggle", label: "Taxes" }
    }
  },
  coupons: {
    label: "Coupons",
    secrets: [],
    icon: "🎟️",
    fields: {
      cache_ttl: { type: "number", unit: "seconds" }
    }
  },
  subscriptions: {
    label: "Subscriptions",
    secrets: [],
    icon: "🔄",
    fields: {
      grace_period_hours: { type: "number", unit: "hours" }
    }
  },
  callbacks: {
    label: "Callbacks",
    secrets: ["hmac_secret"],
    icon: "🔔"
  },
  monitoring: {
    label: "Monitoring",
    secrets: [],
    icon: "📊",
    fields: {
      check_interval: { type: "number", unit: "seconds" },
      low_balance_threshold: { type: "number", unit: "SOL" }
    }
  },
  rate_limit: {
    label: "Rate limiting",
    secrets: [],
    icon: "⏱️"
  },
  circuit_breaker: {
    label: "Circuit breaker",
    secrets: [],
    icon: "🔌"
  },
  admin: {
    label: "Admin keys",
    secrets: [],
    icon: "👤"
  },
  api_keys: {
    label: "API keys",
    secrets: [],
    icon: "🔐"
  },
  cedros_login: {
    label: "Credits",
    secrets: ["api_key"],
    icon: "🪙",
    fields: {
      enabled: { hidden: !0 },
      // Implied by the credits toggle
      credits_enabled: { hidden: !0 },
      // Shown in header toggle
      base_url: { hidden: !0 },
      api_key: { hidden: !0 },
      timeout: { hidden: !0 },
      // Developer setting
      jwt_issuer: { hidden: !0 },
      // Internal auth config
      jwt_audience: { hidden: !0 }
      // Internal auth config
    }
  }
};
function At(e, t) {
  return Ne[e]?.secrets.includes(t) ?? !1;
}
function it(e, t, n) {
  const i = Ne[e]?.fields?.[t] ?? {}, s = i.type === "secret_array" || At(e, t), o = i.label ?? t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  let r = i.type;
  return r || (typeof n == "boolean" ? r = "boolean" : typeof n == "number" ? r = "number" : Array.isArray(n) ? r = "array" : typeof n == "object" && n !== null ? r = "object" : r = "string"), { ...i, type: r, isSecret: s, label: o };
}
const ae = "[REDACTED]";
function Zt(e, t) {
  if (e !== "stripe") return {};
  const n = {}, i = t.mode;
  if (i !== "test" && i !== "live") return n;
  for (const s of ["publishable_key", "secret_key"]) {
    const o = t[s];
    if (typeof o != "string" || o === ae) continue;
    const r = o.startsWith("pk_test_") || o.startsWith("sk_test_"), c = o.startsWith("pk_live_") || o.startsWith("sk_live_");
    i === "live" && r ? n[s] = "This is a test key, but live mode is selected." : i === "test" && c && (n[s] = "This is a live key, but test mode is selected.");
  }
  return n;
}
class Fe {
  constructor(t, n) {
    this._serverUrl = t, this.authManager = n;
  }
  _serverUrl;
  authManager;
  /** Server URL passed at construction. */
  get serverUrl() {
    return this._serverUrl;
  }
  async fetch(t, n = {}) {
    if (this.authManager?.isAuthenticated())
      return this.authManager.fetchWithAuth(t, n);
    throw new Error(
      "Admin authentication required. Provide an IAdminAuthManager to ConfigApi."
    );
  }
  /** List all config categories */
  async listCategories(t = 100) {
    return this.fetch(`/admin/config?limit=${t}`);
  }
  /** Get config for a category */
  async getConfig(t, n = !0) {
    return this.fetch(`/admin/config/${t}?redact_secrets=${n}`);
  }
  /** Full update - replace entire category config */
  async updateConfig(t, n, i) {
    await this.fetch(`/admin/config/${t}`, {
      method: "PUT",
      body: JSON.stringify({ config: n, description: i })
    });
  }
  /** Partial update - update specific keys */
  async patchConfig(t, n, i) {
    await this.fetch(`/admin/config/${t}`, {
      method: "PATCH",
      body: JSON.stringify({ updates: n, description: i })
    });
  }
  /** Batch update multiple categories */
  async batchUpdate(t) {
    await this.fetch("/admin/config/batch", {
      method: "POST",
      body: JSON.stringify({ updates: t })
    });
  }
  /** Validate config before saving */
  async validateConfig(t, n) {
    return this.fetch("/admin/config/validate", {
      method: "POST",
      body: JSON.stringify({ category: t, config: n })
    });
  }
  /** Get config change history */
  async getHistory(t, n = 50) {
    const i = new URLSearchParams({ limit: n.toString() });
    return t && i.set("category", t), this.fetch(`/admin/config/history?${i}`);
  }
  /** List active Stripe tax rates from the connected Stripe account */
  async listStripeTaxRates(t = 100, n = 0) {
    const i = new URLSearchParams({
      limit: t.toString(),
      offset: n.toString()
    });
    return this.fetch(`/admin/config/stripe/tax-rates?${i}`);
  }
}
const Ae = 4, K = 8, Qt = 80;
function ye(e, t, n) {
  for (let i = 0; i < e.length; i += 1) {
    const s = (t + n * i + e.length) % e.length;
    if (!e[s]?.disabled) return s;
  }
  return -1;
}
function en(e, t, n) {
  return e.key === "Home" ? ye(t, 0, 1) : e.key === "End" ? ye(t, t.length - 1, -1) : e.key === "ArrowDown" ? ye(t, n + 1, 1) : e.key === "ArrowUp" ? ye(t, n - 1, -1) : null;
}
function Tt(e, t) {
  if (!e) return;
  const n = t?.getBoundingClientRect();
  if (!n) return;
  e.style.minWidth = `${n.width}px`, e.style.maxHeight = `${Math.max(Qt, window.innerHeight - K * 2)}px`;
  const i = e.offsetWidth, s = e.offsetHeight, o = Math.max(K, window.innerWidth - i - K), r = window.innerHeight - n.bottom - Ae - K, c = n.top - Ae - K, d = s > r && c > r ? n.top - Ae - s : n.bottom + Ae, m = Math.max(K, window.innerHeight - s - K);
  e.style.left = `${Math.min(Math.max(K, n.left), o)}px`, e.style.top = `${Math.min(Math.max(K, d), m)}px`;
}
function tn(e) {
  const t = X(e);
  return kt(() => {
    t.current = e;
  }, [e]), t;
}
function nn(e, t, n) {
  kt(() => {
    if (!e) return;
    const i = () => Tt(n.current, t.current);
    return i(), window.addEventListener("resize", i), window.addEventListener("scroll", i, !0), () => {
      window.removeEventListener("resize", i), window.removeEventListener("scroll", i, !0);
    };
  }, [e, n, t]);
}
function an(e, t, n) {
  const i = e.value === n.value, s = document.createElement("button");
  if (s.type = "button", s.className = `cedros-dropdown-menu__item cedros-admin__dropdown-item ${i ? "cedros-admin__dropdown-item--selected" : ""}`.trim(), s.setAttribute("role", "option"), s.setAttribute("aria-selected", String(i)), s.disabled = e.disabled === !0, s.textContent = e.label, i) {
    const o = document.createElement("span");
    o.className = "cedros-admin__dropdown-check", o.setAttribute("aria-hidden", "true"), o.textContent = "✓", s.append(o);
  }
  return s.addEventListener("click", () => {
    e.disabled || (n.onChangeRef.current(e.value), n.closeAndRestoreFocus());
  }), s.addEventListener("keydown", (o) => {
    if (o.key === "Escape") {
      o.preventDefault(), n.closeAndRestoreFocus();
      return;
    }
    const r = en(o, n.options, t);
    r !== null && (o.preventDefault(), n.optionRefs.current[r]?.focus());
  }), n.optionRefs.current[t] = s, s;
}
function sn(e, t) {
  const {
    closeAndRestoreFocus: n,
    menuClassName: i,
    menuId: s,
    menuRef: o,
    onChangeRef: r,
    optionRefs: c,
    options: u,
    triggerRef: d,
    value: m
  } = e;
  D(() => {
    if (!t || typeof document > "u") return;
    const _ = document.createElement("div");
    _.className = "cedros-pay-admin cedros-data cedros-pay-admin__portaled-dropdown", _.dataset.extensionId = "cedros-pay";
    const b = document.createElement("div");
    b.id = s, b.className = `cedros-dropdown-menu__content cedros-admin__dropdown-menu ${i}`.trim(), b.setAttribute("role", "listbox");
    const h = {
      closeAndRestoreFocus: n,
      menuClassName: i,
      menuId: s,
      menuRef: o,
      onChangeRef: r,
      optionRefs: c,
      options: u,
      triggerRef: d,
      value: m
    };
    return u.forEach((v, x) => b.append(an(v, x, h))), o.current = b, _.append(b), document.body.append(_), Tt(b, d.current), () => {
      _.remove(), o.current = null, c.current = [];
    };
  }, [
    n,
    t,
    i,
    s,
    o,
    r,
    c,
    u,
    d,
    m
  ]);
}
function rn() {
  const [e, t] = w(!1), n = X(null), i = X(null), s = X(null);
  D(() => {
    const r = (c) => {
      const u = c.target;
      !n.current?.contains(u) && !i.current?.contains(u) && t(!1);
    };
    if (e)
      return document.addEventListener("mousedown", r), () => document.removeEventListener("mousedown", r);
  }, [e]);
  const o = R(() => {
    t(!1), queueMicrotask(() => s.current?.focus());
  }, []);
  return { isOpen: e, setIsOpen: t, closeAndRestoreFocus: o, dropdownRef: n, menuRef: i, triggerRef: s };
}
function on(e) {
  const { ariaLabel: t, ariaLabelledBy: n, className: i, disabled: s, displayLabel: o, isOpen: r } = e;
  return /* @__PURE__ */ l(
    "button",
    {
      ref: e.triggerRef,
      type: "button",
      className: `cedros-data-select cedros-admin__dropdown-trigger ${i}`.trim(),
      onClick: () => r ? e.onClose() : e.onOpen(),
      "aria-expanded": r,
      "aria-haspopup": "listbox",
      "aria-controls": r ? e.menuId : void 0,
      "aria-label": n ? void 0 : t,
      "aria-labelledby": n,
      disabled: s,
      onKeyDown: (c) => {
        c.key === "ArrowDown" || c.key === "ArrowUp" ? (c.preventDefault(), e.onOpen()) : c.key === "Escape" && r && (c.preventDefault(), e.onClose());
      },
      children: [
        /* @__PURE__ */ a("span", { children: o }),
        /* @__PURE__ */ a("span", { className: `cedros-admin__dropdown-chevron ${r ? "cedros-admin__dropdown-chevron--open" : ""}`, children: M.chevronDown })
      ]
    }
  );
}
function It({
  value: e,
  onChange: t,
  options: n,
  disabled: i,
  displayLabel: s,
  className: o,
  triggerClassName: r = "",
  menuClassName: c = "",
  ariaLabel: u,
  ariaLabelledBy: d
}) {
  const m = rn(), _ = Z(), b = X([]), h = tn(t), v = {
    closeAndRestoreFocus: m.closeAndRestoreFocus,
    menuClassName: c,
    menuId: _,
    menuRef: m.menuRef,
    onChangeRef: h,
    options: n,
    optionRefs: b,
    triggerRef: m.triggerRef,
    value: e
  };
  return sn(v, m.isOpen), nn(m.isOpen, m.triggerRef, m.menuRef), D(() => {
    if (!m.isOpen) return;
    const x = Math.max(0, n.findIndex((N) => N.value === e)), y = ye(n, x, 1);
    queueMicrotask(() => b.current[y]?.focus());
  }, [m.isOpen, n, e]), /* @__PURE__ */ a("div", { className: `cedros-dropdown-menu ${o}`.trim(), ref: m.dropdownRef, children: /* @__PURE__ */ a(
    on,
    {
      ariaLabel: u,
      ariaLabelledBy: d,
      className: r,
      disabled: i,
      displayLabel: s,
      isOpen: m.isOpen,
      menuId: _,
      onClose: m.closeAndRestoreFocus,
      onOpen: () => m.setIsOpen(!0),
      triggerRef: m.triggerRef
    }
  ) });
}
function Xa({ value: e, onChange: t, options: n, placeholder: i = "Filter", disabled: s, ariaLabel: o }) {
  const c = n.find((u) => u.value === e)?.label || i;
  return /* @__PURE__ */ a(
    It,
    {
      value: e,
      onChange: t,
      options: n,
      disabled: s,
      displayLabel: c,
      className: "cedros-admin__dropdown",
      ariaLabel: o
    }
  );
}
function Xe({ value: e, onChange: t, options: n, label: i, description: s, disabled: o, className: r, style: c }) {
  const d = n.find((_) => _.value === e)?.label || "Select an option", m = Z();
  return /* @__PURE__ */ l("div", { className: `cedros-admin__field ${r || ""}`, style: c, children: [
    /* @__PURE__ */ a("label", { id: m, className: "cedros-data-label cedros-admin__field-label", children: i }),
    /* @__PURE__ */ a(
      It,
      {
        value: e,
        onChange: t,
        options: n,
        disabled: o,
        displayLabel: d,
        className: "cedros-admin__dropdown cedros-admin__dropdown--form",
        triggerClassName: "cedros-admin__dropdown-trigger--form",
        menuClassName: "cedros-admin__dropdown-menu--form",
        ariaLabelledBy: m
      }
    ),
    s && /* @__PURE__ */ a("p", { className: "cedros-admin__field-description", children: s })
  ] });
}
function pe({
  checked: e,
  onCheckedChange: t,
  disabled: n = !1,
  "aria-label": i
}) {
  return /* @__PURE__ */ a(
    "button",
    {
      type: "button",
      role: "switch",
      "aria-checked": e,
      "aria-label": i,
      onClick: () => t(!e),
      disabled: n,
      className: `cedros-admin__switch ${e ? "cedros-admin__switch--checked" : ""}`,
      children: /* @__PURE__ */ a("span", { className: "cedros-admin__switch-thumb" })
    }
  );
}
const dn = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
function Ce(e) {
  return !e || e.trim() === "" ? { valid: !0 } : dn.test(e.trim()) ? { valid: !0 } : { valid: !1, error: "Invalid Solana address" };
}
function cn({
  label: e,
  value: t,
  onChange: n,
  decimals: i,
  onDecimalsChange: s,
  disabled: o = !1,
  description: r,
  customSymbol: c = "",
  customIcon: u = "",
  onCustomSymbolChange: d,
  onCustomIconChange: m
}) {
  const [_, b] = w(!1), h = Object.entries(le), x = !!le[t], N = _ || !!t && !x, L = (f) => {
    if (f === "custom")
      b(!0), x && n("");
    else {
      b(!1), n(f);
      const p = le[f];
      p && s && s(p.decimals), d && d(""), m && m("");
    }
  };
  return /* @__PURE__ */ l("div", { className: "cedros-data-field cedros-admin__field", children: [
    /* @__PURE__ */ a("label", { className: "cedros-data-label cedros-admin__field-label", children: e }),
    /* @__PURE__ */ l("div", { className: "cedros-admin__token-selector", children: [
      /* @__PURE__ */ l("div", { className: "cedros-admin__token-options", children: [
        h.map(([f, p]) => /* @__PURE__ */ l(
          "button",
          {
            type: "button",
            onClick: () => L(f),
            disabled: o,
            className: `cedros-admin__token-option ${t === f ? "cedros-admin__token-option--active" : ""}`,
            children: [
              /* @__PURE__ */ a(
                "img",
                {
                  src: p.icon,
                  alt: p.symbol,
                  className: "cedros-admin__token-option-icon",
                  onError: (g) => {
                    g.target.style.display = "none";
                  }
                }
              ),
              /* @__PURE__ */ a("span", { children: p.symbol })
            ]
          },
          f
        )),
        /* @__PURE__ */ l(
          "button",
          {
            type: "button",
            onClick: () => L("custom"),
            disabled: o,
            className: `cedros-admin__token-option ${N ? "cedros-admin__token-option--active" : ""}`,
            children: [
              /* @__PURE__ */ a("span", { className: "cedros-admin__token-option-plus", children: "+" }),
              /* @__PURE__ */ a("span", { children: "Custom" })
            ]
          }
        )
      ] }),
      N && /* @__PURE__ */ l("div", { className: "cedros-admin__token-custom", children: [
        /* @__PURE__ */ l("div", { className: "cedros-data-field cedros-admin__field", children: [
          /* @__PURE__ */ a("label", { className: "cedros-data-label cedros-admin__field-label", children: "Token mint address" }),
          (() => {
            const f = Ce(t);
            return /* @__PURE__ */ l(O, { children: [
              /* @__PURE__ */ a(
                "input",
                {
                  type: "text",
                  className: `cedros-admin__input cedros-admin__input--mono ${f.valid ? "" : "cedros-admin__input--error"}`,
                  value: t,
                  onChange: (p) => n(p.target.value),
                  placeholder: "e.g., EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
                  disabled: o
                }
              ),
              !f.valid && /* @__PURE__ */ a("span", { className: "cedros-admin__field-error", children: f.error })
            ] });
          })()
        ] }),
        /* @__PURE__ */ l("div", { className: "cedros-data-field cedros-admin__field", children: [
          /* @__PURE__ */ a("label", { className: "cedros-data-label cedros-admin__field-label", children: "Token symbol" }),
          /* @__PURE__ */ a(
            "input",
            {
              type: "text",
              className: "cedros-data-input cedros-admin__input cedros-admin__input--uppercase",
              value: c,
              onChange: (f) => d?.(f.target.value),
              placeholder: "e.g., MYTOKEN",
              disabled: o
            }
          )
        ] }),
        /* @__PURE__ */ l("div", { className: "cedros-data-field cedros-admin__field", children: [
          /* @__PURE__ */ a("label", { className: "cedros-data-label cedros-admin__field-label", children: "Token icon URL" }),
          /* @__PURE__ */ l("div", { className: "cedros-admin__token-icon-row", children: [
            /* @__PURE__ */ a(
              "input",
              {
                type: "text",
                className: "cedros-data-input cedros-admin__input",
                value: u,
                onChange: (f) => m?.(f.target.value),
                placeholder: "https://example.com/token-logo.png",
                disabled: o
              }
            ),
            u && /* @__PURE__ */ a(
              "img",
              {
                src: u,
                alt: "Token icon preview",
                className: "cedros-admin__token-icon-preview",
                onError: (f) => {
                  f.target.style.display = "none";
                }
              }
            )
          ] }),
          /* @__PURE__ */ a("div", { className: "cedros-admin__field-description", children: "Shown to customers during checkout" })
        ] }),
        /* @__PURE__ */ l("div", { className: "cedros-data-field cedros-admin__field cedros-admin__token-decimals", children: [
          /* @__PURE__ */ a("label", { className: "cedros-data-label cedros-admin__field-label", children: "Token decimals" }),
          /* @__PURE__ */ a(
            "input",
            {
              type: "number",
              className: "cedros-data-input cedros-admin__input cedros-admin__input--compact",
              value: i ?? 6,
              onChange: (f) => s?.(parseInt(f.target.value, 10) || 0),
              min: 0,
              max: 18,
              disabled: o
            }
          ),
          /* @__PURE__ */ a("div", { className: "cedros-admin__field-description", children: "Most SPL tokens use 6 decimals (like USDC)" })
        ] })
      ] }),
      t && x && /* @__PURE__ */ a("div", { className: "cedros-admin__token-address", children: t }),
      r && /* @__PURE__ */ a("div", { className: "cedros-admin__field-description", children: r })
    ] })
  ] });
}
function ln({
  label: e,
  value: t,
  onChange: n,
  disabled: i = !1,
  description: s
}) {
  const [o, r] = w(/* @__PURE__ */ new Set()), [c, u] = w(null), [d, m] = w(""), _ = Array.isArray(t) ? t : [], b = (f) => {
    r((p) => {
      const g = new Set(p);
      return g.has(f) ? g.delete(f) : g.add(f), g;
    });
  }, h = () => {
    n([..._, ""]), u(_.length), m("");
  }, v = (f, p) => {
    const g = [..._];
    g[f] = p, n(g);
  }, x = (f) => {
    const p = _.filter((g, P) => P !== f);
    n(p), r((g) => {
      const P = /* @__PURE__ */ new Set();
      return g.forEach((E) => {
        E < f ? P.add(E) : E > f && P.add(E - 1);
      }), P;
    });
  }, y = (f) => {
    u(f), m(_[f] || "");
  }, N = () => {
    c !== null && (v(c, d), u(null), m(""));
  }, L = () => {
    c !== null && _[c] === "" && x(c), u(null), m("");
  };
  return /* @__PURE__ */ l("div", { className: "cedros-data-field cedros-admin__field", children: [
    /* @__PURE__ */ l("div", { className: "cedros-admin__secret-array-header", children: [
      /* @__PURE__ */ a("label", { className: "cedros-data-label cedros-admin__field-label", children: e }),
      /* @__PURE__ */ l(
        "button",
        {
          type: "button",
          onClick: h,
          disabled: i,
          className: "cedros-data-btn cedros-admin__button cedros-data-btn--secondary cedros-admin__button--outline cedros-data-btn--sm cedros-admin__button--sm",
          children: [
            M.plus,
            "Add"
          ]
        }
      )
    ] }),
    /* @__PURE__ */ l("div", { className: "cedros-admin__secret-array-list", children: [
      _.length === 0 && /* @__PURE__ */ a("div", { className: "cedros-admin__secret-array-empty", children: 'No items. Click "Add" to create one.' }),
      _.map((f, p) => {
        const g = o.has(p), P = c === p, E = f === ae;
        return /* @__PURE__ */ a("div", { className: "cedros-admin__secret-array-item", children: P ? /* @__PURE__ */ l(O, { children: [
          /* @__PURE__ */ a(
            "input",
            {
              type: "text",
              className: "cedros-data-input cedros-admin__input cedros-admin__input--mono",
              value: d,
              onChange: (A) => m(A.target.value),
              placeholder: "Enter wallet keypair…",
              autoFocus: !0,
              onKeyDown: (A) => {
                A.key === "Enter" && N(), A.key === "Escape" && L();
              }
            }
          ),
          /* @__PURE__ */ a(
            "button",
            {
              type: "button",
              onClick: N,
              className: "cedros-data-btn cedros-admin__button cedros-data-btn--primary cedros-admin__button--primary cedros-admin__button--icon",
              title: "Save",
              "aria-label": `Save wallet keypair ${p + 1}`,
              children: M.check
            }
          ),
          /* @__PURE__ */ a(
            "button",
            {
              type: "button",
              onClick: L,
              className: "cedros-data-btn cedros-admin__button cedros-data-btn--secondary cedros-admin__button--outline cedros-admin__button--icon",
              title: "Cancel",
              "aria-label": `Cancel editing wallet keypair ${p + 1}`,
              children: M.close
            }
          )
        ] }) : /* @__PURE__ */ l(O, { children: [
          /* @__PURE__ */ a("div", { className: "cedros-admin__secret-array-value", children: g && !E ? f : E ? "[REDACTED]" : "••••••••••••••••••••" }),
          /* @__PURE__ */ a(
            "button",
            {
              type: "button",
              onClick: () => b(p),
              disabled: i || E,
              className: "cedros-data-btn cedros-admin__button cedros-data-btn--ghost cedros-admin__button--ghost cedros-admin__button--icon",
              title: g ? "Hide" : "Show",
              "aria-label": `${g ? "Hide" : "Show"} wallet keypair ${p + 1}`,
              children: g ? M.eyeOff : M.eye
            }
          ),
          /* @__PURE__ */ a(
            "button",
            {
              type: "button",
              onClick: () => y(p),
              disabled: i,
              className: "cedros-data-btn cedros-admin__button cedros-data-btn--ghost cedros-admin__button--ghost cedros-admin__button--icon",
              title: "Edit",
              "aria-label": `Edit wallet keypair ${p + 1}`,
              children: M.settings
            }
          ),
          /* @__PURE__ */ a(
            "button",
            {
              type: "button",
              onClick: () => x(p),
              disabled: i,
              className: "cedros-data-btn cedros-admin__button cedros-data-btn--danger cedros-admin__button--danger cedros-admin__button--icon",
              title: "Delete",
              "aria-label": `Delete wallet keypair ${p + 1}`,
              children: M.trash
            }
          )
        ] }) }, p);
      })
    ] }),
    s && /* @__PURE__ */ a("div", { className: "cedros-admin__field-description", children: s })
  ] });
}
function un(e) {
  const t = e.displayName || e.id, n = pn(e.percentage), i = e.inclusive ? "inclusive" : "exclusive", s = [e.country, e.state].filter(Boolean).join("-") || e.jurisdiction;
  return s ? `${t} - ${n}% ${i} - ${s}` : `${t} - ${n}% ${i}`;
}
function pn(e) {
  return Number.isFinite(e) ? e.toFixed(4).replace(/\.?0+$/, "") : "0";
}
function st({
  description: e,
  hint: t,
  helpUrl: n,
  helpLabel: i
}) {
  return /* @__PURE__ */ l(O, { children: [
    e,
    t && /* @__PURE__ */ l(O, { children: [
      e ? " " : "",
      t
    ] }),
    n && /* @__PURE__ */ l(O, { children: [
      e || t ? " " : "",
      /* @__PURE__ */ a(
        "a",
        {
          className: "cedros-admin__field-help",
          href: n,
          target: "_blank",
          rel: "noopener noreferrer",
          children: i ?? "Learn more"
        }
      )
    ] })
  ] });
}
function mn({
  client: e,
  value: t,
  label: n,
  description: i,
  placeholder: s,
  helpUrl: o,
  helpLabel: r,
  disabled: c = !1,
  onChange: u
}) {
  const [d, m] = w([]), [_, b] = w("idle"), [h, v] = w(null);
  D(() => {
    let N = !1;
    if (!e) {
      b("error"), v("Admin authentication is required to load Stripe tax rates.");
      return;
    }
    return b("loading"), v(null), e.listStripeTaxRates().then((L) => {
      N || (m(L.taxRates ?? []), b("loaded"));
    }).catch((L) => {
      N || (m([]), b("error"), v(
        L instanceof Error && L.message ? L.message : "Stripe tax rates could not be loaded."
      ));
    }), () => {
      N = !0;
    };
  }, [e]);
  const x = $(() => {
    const N = [{ value: "", label: "No Stripe tax rate" }];
    return !t || d.some((f) => f.id === t) || N.push({ value: t, label: `Saved tax rate (${t})` }), N.push(
      ...d.map((f) => ({
        value: f.id,
        label: un(f)
      }))
    ), N;
  }, [d, t]);
  if (_ === "error")
    return /* @__PURE__ */ l("div", { className: "cedros-data-field cedros-admin__field", children: [
      /* @__PURE__ */ a("label", { className: "cedros-data-label cedros-admin__field-label", children: n }),
      /* @__PURE__ */ a(
        "input",
        {
          "aria-label": n,
          type: "text",
          className: "cedros-data-input cedros-admin__input",
          value: t,
          placeholder: s,
          onChange: (N) => u(N.target.value),
          disabled: c
        }
      ),
      h && /* @__PURE__ */ a("div", { className: "cedros-admin__field-hint", children: h }),
      /* @__PURE__ */ a("div", { className: "cedros-admin__field-description", children: st({ description: i, helpUrl: o, helpLabel: r }) })
    ] });
  const y = _ === "idle" || _ === "loading" ? "Loading Stripe tax rates…" : _ === "loaded" && d.length === 0 ? "No active Stripe tax rates found." : void 0;
  return /* @__PURE__ */ a(
    Xe,
    {
      value: t,
      onChange: u,
      options: x,
      label: n,
      description: st({ description: i, hint: y, helpUrl: o, helpLabel: r }),
      disabled: c || _ !== "loaded"
    }
  );
}
function Y({
  meta: e,
  warning: t,
  children: n
}) {
  return /* @__PURE__ */ l("div", { className: "cedros-data-field cedros-admin__field", children: [
    n,
    t && /* @__PURE__ */ a("div", { className: "cedros-admin__field-hint", children: t }),
    (e.description || e.helpUrl) && /* @__PURE__ */ l("div", { className: "cedros-admin__field-description", children: [
      e.description,
      e.helpUrl && /* @__PURE__ */ l(O, { children: [
        e.description ? " " : "",
        /* @__PURE__ */ a(
          "a",
          {
            className: "cedros-admin__field-help",
            href: e.helpUrl,
            target: "_blank",
            rel: "noopener noreferrer",
            children: e.helpLabel ?? "Learn more"
          }
        )
      ] })
    ] })
  ] });
}
function hn({
  fieldKey: e,
  value: t,
  meta: n,
  originalValue: i,
  disabled: s,
  multiline: o,
  onChange: r
}) {
  const [c, u] = w(!1), d = t === ae, m = d ? "" : t, _ = d ? "Saved — enter a new value to replace it" : n.placeholder ?? "", b = () => {
    m === "" && i === ae && !d && r(e, ae);
  };
  return o ? /* @__PURE__ */ l("div", { className: "cedros-admin__input-affix", children: [
    /* @__PURE__ */ a(
      "textarea",
      {
        "aria-label": n.label,
        className: "cedros-data-textarea cedros-admin__textarea cedros-admin__textarea--mono",
        value: m,
        rows: 4,
        placeholder: _,
        onChange: (h) => r(e, h.target.value),
        onBlur: b,
        disabled: s
      }
    ),
    d && /* @__PURE__ */ a("span", { className: "cedros-admin__saved-chip", children: "Saved" })
  ] }) : /* @__PURE__ */ l("div", { className: "cedros-admin__input-group", children: [
    /* @__PURE__ */ l("div", { className: "cedros-admin__input-affix", children: [
      /* @__PURE__ */ a(
        "input",
        {
          "aria-label": n.label,
          type: c ? "text" : "password",
          className: "cedros-data-input cedros-admin__input",
          value: m,
          placeholder: _,
          onChange: (h) => r(e, h.target.value),
          onBlur: b,
          disabled: s,
          autoComplete: "off"
        }
      ),
      d && /* @__PURE__ */ a("span", { className: "cedros-admin__saved-chip", children: "Saved" })
    ] }),
    m !== "" && /* @__PURE__ */ a(
      "button",
      {
        type: "button",
        className: "cedros-data-btn cedros-admin__button cedros-data-btn--ghost cedros-admin__button--ghost cedros-admin__button--icon",
        onClick: () => u((h) => !h),
        "aria-label": c ? "Hide value" : "Show value",
        title: c ? "Hide" : "Show",
        children: c ? M.eyeOff : M.eye
      }
    )
  ] });
}
function fn({
  fieldKey: e,
  value: t,
  meta: n,
  values: i,
  originalValue: s,
  configClient: o,
  disabled: r = !1,
  warning: c,
  onChange: u
}) {
  if (n.type === "dropdown" && n.options)
    return /* @__PURE__ */ a(
      Xe,
      {
        value: t,
        onChange: (d) => u(e, d),
        options: n.options.map((d) => ({
          value: d,
          label: n.optionLabels?.[d] ?? d
        })),
        label: n.label,
        description: n.description,
        disabled: r
      }
    );
  if (n.type === "segmented" && n.options)
    return /* @__PURE__ */ l(Y, { meta: n, warning: c, children: [
      /* @__PURE__ */ a("label", { className: "cedros-data-label cedros-admin__field-label", children: n.label }),
      /* @__PURE__ */ a("div", { className: "cedros-admin__segmented", role: "group", "aria-label": n.label, children: n.options.map((d) => /* @__PURE__ */ a(
        "button",
        {
          type: "button",
          "aria-pressed": t === d,
          className: `cedros-admin__segmented-option ${t === d ? "cedros-admin__segmented-option--active" : ""}`,
          onClick: () => u(e, d),
          disabled: r,
          children: n.optionLabels?.[d] ?? d
        },
        d
      )) })
    ] });
  if (n.type === "token_mint")
    return /* @__PURE__ */ a(
      cn,
      {
        label: n.label,
        value: t,
        onChange: (d) => u(e, d),
        decimals: i.token_decimals ?? 6,
        onDecimalsChange: (d) => u("token_decimals", d),
        disabled: r,
        description: n.description,
        customSymbol: i.custom_token_symbol || "",
        customIcon: i.custom_token_icon || "",
        onCustomSymbolChange: (d) => u("custom_token_symbol", d),
        onCustomIconChange: (d) => u("custom_token_icon", d)
      }
    );
  if (n.type === "stripe_tax_rate_select")
    return /* @__PURE__ */ a(
      mn,
      {
        client: o,
        value: t ?? "",
        label: n.label,
        description: n.description,
        placeholder: n.placeholder,
        helpUrl: n.helpUrl,
        helpLabel: n.helpLabel,
        disabled: r,
        onChange: (d) => u(e, d)
      }
    );
  if (n.type === "toggle" || n.type === "boolean")
    return /* @__PURE__ */ a(Y, { meta: n, warning: c, children: /* @__PURE__ */ l("div", { className: "cedros-admin__toggle-field", children: [
      /* @__PURE__ */ a(
        pe,
        {
          checked: !!t,
          onCheckedChange: (d) => u(e, d),
          disabled: r,
          "aria-label": n.label
        }
      ),
      /* @__PURE__ */ a("span", { className: "cedros-data-label cedros-admin__field-label cedros-admin__toggle-field-label", children: n.label })
    ] }) });
  if (n.type === "solana_address") {
    const d = t || "", m = Ce(d);
    return /* @__PURE__ */ l(Y, { meta: n, warning: c, children: [
      /* @__PURE__ */ a("label", { className: "cedros-data-label cedros-admin__field-label", children: n.label }),
      /* @__PURE__ */ l("div", { className: "cedros-admin__input-affix", children: [
        /* @__PURE__ */ a(
          "input",
          {
            "aria-label": n.label,
            type: "text",
            className: `cedros-admin__input cedros-admin__input--mono ${m.valid ? "" : "cedros-admin__input--error"}`,
            value: d,
            onChange: (_) => u(e, _.target.value),
            disabled: r,
            placeholder: n.placeholder ?? "e.g. 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
          }
        ),
        d && m.valid && /* @__PURE__ */ a(
          "span",
          {
            className: "cedros-admin__input-affix-icon cedros-admin__input-affix-icon--success",
            title: "Valid Solana address",
            children: M.check
          }
        )
      ] }),
      !m.valid && /* @__PURE__ */ a("span", { className: "cedros-admin__field-error", children: m.error })
    ] });
  }
  if (n.type === "number")
    return /* @__PURE__ */ l(Y, { meta: n, warning: c, children: [
      /* @__PURE__ */ l("label", { className: "cedros-data-label cedros-admin__field-label", children: [
        n.label,
        n.unit && /* @__PURE__ */ l("span", { className: "cedros-admin__field-unit", children: [
          " (",
          n.unit,
          ")"
        ] })
      ] }),
      /* @__PURE__ */ a(
        "input",
        {
          "aria-label": n.label,
          type: "number",
          className: "cedros-data-input cedros-admin__input",
          value: t,
          onChange: (d) => u(e, parseFloat(d.target.value) || 0),
          disabled: r
        }
      )
    ] });
  if (n.type === "secret_array")
    return /* @__PURE__ */ a(
      ln,
      {
        label: n.label,
        value: t,
        onChange: (d) => u(e, d),
        disabled: r,
        description: n.description
      }
    );
  if (n.type === "array") {
    const d = t ?? [];
    return /* @__PURE__ */ l(Y, { meta: n, warning: c, children: [
      /* @__PURE__ */ a("label", { className: "cedros-data-label cedros-admin__field-label", children: n.label }),
      /* @__PURE__ */ a(
        "textarea",
        {
          "aria-label": n.label,
          className: "cedros-data-textarea cedros-admin__textarea",
          value: d.join(`
`),
          onChange: (m) => u(e, m.target.value.split(`
`).filter(Boolean)),
          placeholder: n.placeholder ?? "One item per line",
          rows: 3,
          disabled: r
        }
      )
    ] });
  }
  return n.type === "object" ? /* @__PURE__ */ l(Y, { meta: n, warning: c, children: [
    /* @__PURE__ */ a("label", { className: "cedros-data-label cedros-admin__field-label", children: n.label }),
    /* @__PURE__ */ a(
      "textarea",
      {
        "aria-label": n.label,
        className: "cedros-data-textarea cedros-admin__textarea cedros-admin__textarea--mono",
        value: JSON.stringify(t, null, 2),
        onChange: (d) => {
          try {
            u(e, JSON.parse(d.target.value));
          } catch {
          }
        },
        rows: 5,
        disabled: r
      }
    )
  ] }) : n.isSecret ? /* @__PURE__ */ l(Y, { meta: n, warning: c, children: [
    /* @__PURE__ */ a("label", { className: "cedros-data-label cedros-admin__field-label", children: n.label }),
    /* @__PURE__ */ a(
      hn,
      {
        fieldKey: e,
        value: t ?? "",
        meta: n,
        originalValue: s,
        disabled: r,
        multiline: n.type === "textarea",
        onChange: u
      }
    )
  ] }) : n.type === "textarea" ? /* @__PURE__ */ l(Y, { meta: n, warning: c, children: [
    /* @__PURE__ */ a("label", { className: "cedros-data-label cedros-admin__field-label", children: n.label }),
    /* @__PURE__ */ a(
      "textarea",
      {
        "aria-label": n.label,
        className: "cedros-data-textarea cedros-admin__textarea cedros-admin__textarea--mono",
        value: t ?? "",
        placeholder: n.placeholder,
        rows: 4,
        onChange: (d) => u(e, d.target.value),
        disabled: r
      }
    )
  ] }) : /* @__PURE__ */ l(Y, { meta: n, warning: c, children: [
    /* @__PURE__ */ a("label", { className: "cedros-data-label cedros-admin__field-label", children: n.label }),
    /* @__PURE__ */ a(
      "input",
      {
        "aria-label": n.label,
        type: "text",
        className: "cedros-data-input cedros-admin__input",
        value: t ?? "",
        placeholder: n.placeholder,
        onChange: (d) => u(e, d.target.value),
        disabled: r
      }
    )
  ] });
}
function rt({ endpoint: e, serverUrl: t }) {
  const [n, i] = w(!1), s = `${t.replace(/\/$/, "")}${e.path}`, o = async () => {
    try {
      await navigator.clipboard.writeText(s), i(!0), setTimeout(() => i(!1), 1600);
    } catch {
    }
  };
  return /* @__PURE__ */ l("div", { className: "cedros-data-field cedros-admin__field cedros-admin__endpoint", children: [
    /* @__PURE__ */ a("span", { className: "cedros-data-label cedros-admin__field-label", children: e.label }),
    /* @__PURE__ */ l("div", { className: "cedros-admin__endpoint-row", children: [
      /* @__PURE__ */ a("code", { className: "cedros-admin__endpoint-url", children: s }),
      /* @__PURE__ */ l(
        "button",
        {
          type: "button",
          className: "cedros-data-btn cedros-admin__button cedros-data-btn--secondary cedros-admin__button--outline cedros-data-btn--sm cedros-admin__button--sm",
          onClick: o,
          children: [
            n ? M.check : M.copy,
            n ? "Copied" : "Copy"
          ]
        }
      )
    ] }),
    e.description && /* @__PURE__ */ a("div", { className: "cedros-admin__field-description", children: e.description })
  ] });
}
function _n({
  category: e,
  values: t,
  originalConfig: n,
  serverUrl: i,
  configClient: s,
  disabled: o = !1,
  onChange: r
}) {
  const c = Ne[e], u = $(() => Zt(e, t), [e, t]), d = $(() => {
    const p = Object.keys(c?.fields ?? {}), g = Object.keys(t);
    return [
      ...p.filter((P) => g.includes(P)),
      ...g.filter((P) => !p.includes(P))
    ];
  }, [c, t]), m = (p) => {
    const g = it(e, p, n[p] ?? t[p]);
    if (g.hidden || g.showWhen && !t[g.showWhen]) return !1;
    if (p === "token_decimals") {
      const P = t.token_mint;
      if (P && le[P]) return !1;
    }
    return !0;
  }, _ = d.filter(m), b = (p) => it(e, p, n[p] ?? t[p]), h = _.filter((p) => {
    const g = b(p);
    return !g.group && !g.advanced;
  }), v = _.filter((p) => {
    const g = b(p);
    return !g.group && g.advanced;
  }), x = (p) => _.filter((g) => b(g).group === p), y = c?.endpoints ?? [], N = y.filter((p) => !p.group), L = (p) => /* @__PURE__ */ a(
    fn,
    {
      fieldKey: p,
      value: t[p],
      meta: b(p),
      values: t,
      originalValue: n[p],
      configClient: s,
      disabled: o,
      warning: u[p],
      onChange: r
    },
    p
  ), f = (p) => {
    const g = x(p.id), P = y.filter((A) => A.group === p.id);
    if (g.length === 0 && P.length === 0 && !p.toggleField) return null;
    const E = p.toggleField ? !!t[p.toggleField] : !0;
    return /* @__PURE__ */ l("section", { className: "cedros-data-card cedros-admin__field-group", children: [
      /* @__PURE__ */ l("div", { className: "cedros-data-card__header cedros-admin__field-group-header", children: [
        /* @__PURE__ */ l("div", { className: "cedros-admin__field-group-heading", children: [
          /* @__PURE__ */ a("h4", { className: "cedros-data-card__title cedros-admin__field-group-title", children: p.title }),
          p.description && /* @__PURE__ */ a("p", { className: "cedros-admin__field-group-description", children: p.description })
        ] }),
        p.toggleField && /* @__PURE__ */ a(
          pe,
          {
            checked: E,
            onCheckedChange: (A) => r(p.toggleField, A),
            disabled: o,
            "aria-label": `Enable ${p.title}`
          }
        )
      ] }),
      E && (g.length > 0 || P.length > 0) && /* @__PURE__ */ l("div", { className: "cedros-admin__field-group-body", children: [
        i && P.map((A) => /* @__PURE__ */ a(rt, { endpoint: A, serverUrl: i }, A.path)),
        g.map(L)
      ] })
    ] }, p.id);
  };
  return /* @__PURE__ */ a("div", { className: "cedros-admin__config-editor", children: /* @__PURE__ */ l("div", { className: "cedros-admin__config-fields", children: [
    h.map(L),
    i && N.map((p) => /* @__PURE__ */ a(rt, { endpoint: p, serverUrl: i }, p.path)),
    (c?.groups ?? []).map(f),
    v.length > 0 && /* @__PURE__ */ l("details", { className: "cedros-admin__advanced", children: [
      /* @__PURE__ */ l("summary", { className: "cedros-admin__advanced-summary", children: [
        /* @__PURE__ */ a("span", { className: "cedros-admin__advanced-chevron", children: M.chevronRight }),
        "Advanced"
      ] }),
      /* @__PURE__ */ a("div", { className: "cedros-admin__advanced-body", children: v.map(L) })
    ] })
  ] }) });
}
function ke(e) {
  return typeof e == "string" && e.trim() !== "";
}
function Et(e) {
  return ke(e);
}
function bn(e) {
  return Array.isArray(e) && e.some(Et);
}
function oe(e, t, n, i) {
  ke(e[t]) || i.push(`${n} is required.`);
}
function Oe(e, t, n, i) {
  Et(e[t]) || i.push(`${n} is required.`);
}
function gn(e, t, n) {
  const i = e.mode === "live" ? "live" : "test", s = ke(e.publishable_key) ? e.publishable_key.trim() : "", o = ke(e.secret_key) ? e.secret_key.trim() : "";
  s && !s.startsWith("pk_") && t.push("Stripe publishable key must start with pk_."), o && o !== ae && !o.startsWith("sk_") && t.push("Stripe secret key must start with sk_."), s.startsWith("pk_test_") && i === "live" && n.push("Stripe is in live mode, but the publishable key is a test key."), o.startsWith("sk_test_") && i === "live" && n.push("Stripe is in live mode, but the secret key is a test key.");
}
function yn(e, t, n) {
  oe(e, "publishable_key", "Stripe publishable key", t), Oe(e, "secret_key", "Stripe secret key", t), Oe(e, "webhook_secret", "Stripe webhook signing secret", t), gn(e, t, n);
}
function ot(e, t, n, i) {
  const s = ke(e[t]) ? e[t].trim() : "";
  s ? Ce(s).valid || i.push(`${n} must be a valid Solana address.`) : i.push(`${n} is required.`);
}
function vn(e, t) {
  ot(e, "payment_address", "Crypto payout wallet", t), ot(e, "token_mint", "Crypto payment token", t), (e.gasless_enabled || e.auto_create_token_account) && !bn(e.server_wallets) && t.push("Fee payer wallets are required when gasless features are enabled.");
}
function kn(e, t) {
  !e.apple_enabled && !e.google_enabled && t.push("Enable Apple App Store or Google Play before checking setup."), e.apple_enabled && (oe(e, "apple_issuer_id", "Apple issuer ID", t), oe(e, "apple_key_id", "Apple key ID", t), Oe(e, "apple_private_key", "Apple private key", t), oe(e, "apple_bundle_id", "Apple bundle ID", t)), e.google_enabled && (oe(e, "google_service_account_email", "Google service account email", t), Oe(e, "google_private_key", "Google private key", t), oe(e, "google_package_name", "Google package name", t));
}
function wn(e, t) {
  const n = [], i = [];
  return e === "stripe" && yn(t, n, i), e === "x402" && vn(t, n), e === "native_store" && kn(t, n), { valid: n.length === 0, errors: n, warnings: i };
}
function Sn(e, t) {
  const n = Array.from(/* @__PURE__ */ new Set([...e.errors, ...t.errors])), i = Array.from(/* @__PURE__ */ new Set([...e.warnings, ...t.warnings]));
  return { valid: n.length === 0, errors: n, warnings: i };
}
function De(e, t, {
  ready: n,
  delayMs: i = 800,
  resourceType: s = "admin-settings",
  resourceId: o = "default",
  extensionId: r
}) {
  return Nt({
    resourceType: s,
    resourceId: o,
    extensionId: r,
    draft: e,
    makePatch: (u, d) => u === d ? null : { draftKey: d },
    save: async (u, d) => {
      const m = await t();
      return m?.canonicalDraftKey ? { canonicalPatchOrResource: m.canonicalDraftKey } : {};
    },
    debounceProfile: i,
    enabled: n,
    getUpdateMask: () => ["draft"],
    maxRetries: 0
  }).status;
}
function Nn(e, t) {
  const n = Ne[e]?.fields;
  if (!n) return t;
  let i = t;
  for (const [s, o] of Object.entries(n)) {
    if (o.default === void 0 || !(s in t)) continue;
    const r = t[s];
    (r === "" || r === null || r === void 0) && (i === t && (i = { ...t }), i[s] = o.default);
  }
  return i;
}
function Cn(e, t) {
  const n = /* @__PURE__ */ new Set([...Object.keys(e), ...Object.keys(t)]);
  for (const i of n)
    if (JSON.stringify(e[i]) !== JSON.stringify(t[i])) return !0;
  return !1;
}
function Pn(e) {
  return e === "failed" ? "error" : e;
}
function An({
  serverUrl: e,
  authManager: t,
  category: n,
  title: i,
  description: s,
  enabledField: o = "enabled",
  enableImplies: r = [],
  showEnabledToggle: c = !1,
  blockedReason: u,
  blockedTitle: d = "Blocked",
  setupNote: m,
  hideEditor: _ = !1,
  hideActions: b = !1
}) {
  const h = $(
    () => new Fe(e, t),
    [e, t]
  ), [v, x] = w(null), [y, N] = w(null), [L, f] = w(!0), [p, g] = w(null), [P, E] = w(null), [A, U] = w(null), [ie, Q] = w(!1), se = Ne[n] || { label: n }, H = i || se.label, V = s || se.description, J = R(async () => {
    f(!0), g(null);
    try {
      const T = await h.getConfig(n, !0), C = Nn(n, T.config);
      x({ ...T, config: C }), N({ ...C }), E(null);
    } catch (T) {
      g(T instanceof Error && T.message ? T.message : "Failed to load settings");
    } finally {
      f(!1);
    }
  }, [h, n]);
  D(() => {
    J();
  }, [J]);
  const I = v?.config ?? null, S = $(
    () => !!(y && I && Cn(y, I)),
    [y, I]
  ), k = $(() => {
    if (!y) return null;
    for (const T of ["payment_address", "token_mint"]) {
      const C = y[T];
      if (typeof C == "string" && C && !Ce(C).valid)
        return "Fix the highlighted fields before saving.";
    }
    return null;
  }, [y]), W = R((T, C) => {
    E(null), N((G) => G && { ...G, [T]: C });
  }, []), q = R(async () => {
    if (!(!y || !v)) {
      if (k)
        throw E(k), new Error(k);
      E(null);
      try {
        await h.updateConfig(n, y, "Updated via Pay hub");
        const T = { ...y };
        for (const C of Object.keys(T)) {
          const G = T[C];
          At(n, C) && typeof G == "string" && G !== "" && (T[C] = ae);
        }
        return x((C) => C && { ...C, config: T }), N(T), { canonicalDraftKey: JSON.stringify(T) };
      } catch (T) {
        const C = T instanceof Error ? T.message : "Save failed";
        throw E(C), new Error(C);
      }
    }
  }, [h, n, y, v, k]), Ut = R(() => {
    if (!y) return;
    const C = !!!y[o], G = { [o]: C };
    if (C)
      for (const he of r) G[he] = !0;
    E(null), N((he) => he && { ...he, ...G });
  }, [y, o, r]), Wt = R(async () => {
    if (!y) return;
    const T = wn(n, y);
    if (!T.valid) {
      U(T);
      return;
    }
    Q(!0), U(null);
    try {
      const C = await h.validateConfig(n, y);
      U(Sn(T, C));
    } catch (C) {
      U({
        valid: !1,
        errors: [C instanceof Error ? C.message : "Validation failed"],
        warnings: []
      });
    } finally {
      Q(!1);
    }
  }, [h, n, y]), me = !!u, $e = !!(y ?? v?.config)?.[o], ee = !me && (!c || $e || S);
  D(() => {
    ee || U(null);
  }, [ee]), Pt(J, { enabled: !!p, intervalMs: 15e3 });
  const at = De(y ? JSON.stringify(y) : "", q, {
    ready: !L && !!y && !me,
    delayMs: 600,
    resourceType: "config-category",
    resourceId: n,
    extensionId: "cedros-pay"
  });
  return L && !v ? /* @__PURE__ */ a("div", { className: "cedros-data-card cedros-admin__section cedros-admin__payment-card", children: /* @__PURE__ */ a(ze, { label: `Loading ${H} settings…` }) }) : /* @__PURE__ */ l("div", { className: "cedros-data-card cedros-admin__section cedros-admin__payment-card", children: [
    /* @__PURE__ */ a(ve, { message: p ?? P, onRetry: p ? J : void 0 }),
    /* @__PURE__ */ l("div", { className: "cedros-data-card__header cedros-admin__section-header cedros-admin__payment-card-header", children: [
      /* @__PURE__ */ l("div", { className: "cedros-admin__payment-card-heading", children: [
        /* @__PURE__ */ a("h3", { className: "cedros-data-card__title cedros-admin__section-title", children: H }),
        V && /* @__PURE__ */ a("p", { className: "cedros-admin__text-muted cedros-admin__payment-card-description", children: V })
      ] }),
      c && v && /* @__PURE__ */ l("div", { className: "cedros-admin__payment-toggle-row", children: [
        /* @__PURE__ */ a(
          Je,
          {
            status: at,
            className: `cedros-admin__autosave-indicator cedros-admin__autosave-indicator--${Pn(at)}`
          }
        ),
        /* @__PURE__ */ a("span", { className: "cedros-admin__payment-toggle-label", children: $e ? "On" : "Off" }),
        /* @__PURE__ */ a(
          pe,
          {
            checked: $e,
            onCheckedChange: Ut,
            disabled: me,
            "aria-label": `Turn ${H} on or off`
          }
        )
      ] })
    ] }),
    me && /* @__PURE__ */ l("section", { className: "cedros-data-setup-notice", role: "status", children: [
      /* @__PURE__ */ l("div", { className: "cedros-data-setup-notice__body", children: [
        /* @__PURE__ */ a("h3", { children: d }),
        /* @__PURE__ */ a("p", { children: u })
      ] }),
      /* @__PURE__ */ a("div", { className: "cedros-data-actions", children: /* @__PURE__ */ a("a", { className: "cedros-data-btn cedros-data-btn--primary cedros-data-btn--sm", href: "/admin/extensions", children: "View extensions" }) })
    ] }),
    !me && !ee && v && /* @__PURE__ */ l("div", { className: "cedros-admin__payment-off-note", children: [
      H,
      " is turned off. Turn it on to set it up — Cedros won’t use it until you do."
    ] }),
    ee && m && /* @__PURE__ */ a("div", { className: "cedros-admin__payment-off-note", children: m }),
    ee && !_ && y && v && /* @__PURE__ */ a("div", { className: "cedros-admin__settings-editor cedros-admin__payment-editor", children: /* @__PURE__ */ a(
      _n,
      {
        category: v.category,
        values: y,
        originalConfig: v.config,
        serverUrl: e,
        configClient: h,
        onChange: W
      }
    ) }),
    ee && A && /* @__PURE__ */ a(
      "div",
      {
        className: `cedros-admin__payment-validation ${A.valid ? "cedros-admin__payment-validation--success" : "cedros-admin__payment-validation--error"}`,
        children: /* @__PURE__ */ l("div", { className: "cedros-admin__payment-validation-layout", children: [
          /* @__PURE__ */ l("div", { className: "cedros-admin__payment-validation-content", children: [
            /* @__PURE__ */ l("div", { className: "cedros-admin__payment-validation-title", children: [
              A.valid ? M.check : M.close,
              A.valid && A.warnings.length === 0 ? "Setup looks ready" : A.valid ? "Setup needs review" : "Some settings need attention"
            ] }),
            A.errors.length > 0 && /* @__PURE__ */ a("ul", { className: "cedros-admin__payment-validation-list", children: A.errors.map((T, C) => /* @__PURE__ */ a("li", { children: T }, C)) }),
            A.warnings.length > 0 && /* @__PURE__ */ a("ul", { className: "cedros-admin__payment-validation-list cedros-admin__payment-validation-list--warning", children: A.warnings.map((T, C) => /* @__PURE__ */ a("li", { children: T }, C)) })
          ] }),
          /* @__PURE__ */ a(
            "button",
            {
              type: "button",
              onClick: () => U(null),
              className: "cedros-admin__payment-validation-dismiss",
              title: "Dismiss",
              "aria-label": "Dismiss validation result",
              children: M.close
            }
          )
        ] })
      }
    ),
    ee && !b && /* @__PURE__ */ a("div", { className: "cedros-admin__payment-card-actions", children: /* @__PURE__ */ a("div", { className: "cedros-admin__payment-save-controls", children: /* @__PURE__ */ a(
      "button",
      {
        type: "button",
        className: "cedros-data-btn cedros-admin__button cedros-data-btn--secondary cedros-admin__button--outline cedros-data-btn--sm cedros-admin__button--sm",
        disabled: ie || !y,
        onClick: Wt,
        children: ie ? "Checking…" : "Check setup"
      }
    ) }) })
  ] });
}
function Pe({ description: e }) {
  return e ? /* @__PURE__ */ a("div", { className: "cedros-admin__field-description", children: e }) : null;
}
function Za({
  label: e,
  checked: t,
  onChange: n,
  description: i
}) {
  return /* @__PURE__ */ l("div", { className: "cedros-data-field cedros-admin__field", children: [
    /* @__PURE__ */ l("div", { className: "cedros-admin__toggle-field", children: [
      /* @__PURE__ */ a(pe, { checked: t, onCheckedChange: n, "aria-label": e }),
      /* @__PURE__ */ a("span", { className: "cedros-data-label cedros-admin__field-label cedros-admin__toggle-field-label", children: e })
    ] }),
    /* @__PURE__ */ a(Pe, { description: i })
  ] });
}
function ne({
  label: e,
  value: t,
  onChange: n,
  type: i = "text",
  placeholder: s,
  description: o
}) {
  const r = Z();
  return /* @__PURE__ */ l("div", { className: "cedros-data-field cedros-admin__field", children: [
    /* @__PURE__ */ a("label", { className: "cedros-data-label cedros-admin__field-label", htmlFor: r, children: e }),
    /* @__PURE__ */ a(
      "input",
      {
        id: r,
        className: "cedros-data-input cedros-admin__input",
        type: i,
        value: t,
        placeholder: s,
        onChange: (c) => n(c.target.value)
      }
    ),
    /* @__PURE__ */ a(Pe, { description: o })
  ] });
}
function dt({
  label: e,
  value: t,
  onChange: n,
  description: i,
  placeholder: s,
  nullable: o = !1,
  min: r = 0
}) {
  const c = Z(), u = (d) => {
    if (d.trim() === "") {
      n(o ? null : r);
      return;
    }
    const m = Number(d);
    Number.isFinite(m) && n(Math.max(r, Math.floor(m)));
  };
  return /* @__PURE__ */ l("div", { className: "cedros-data-field cedros-admin__field", children: [
    /* @__PURE__ */ a("label", { className: "cedros-data-label cedros-admin__field-label", htmlFor: c, children: e }),
    /* @__PURE__ */ a(
      "input",
      {
        id: c,
        className: "cedros-data-input cedros-admin__input",
        type: "number",
        min: r,
        value: t ?? "",
        placeholder: s,
        onChange: (d) => u(d.target.value)
      }
    ),
    /* @__PURE__ */ a(Pe, { description: i })
  ] });
}
function Tn(e) {
  switch (e) {
    case "USD":
    case "CAD":
    case "AUD":
      return "$";
    case "EUR":
      return "€";
    case "GBP":
      return "£";
    default:
      return "";
  }
}
function ct(e) {
  if (e == null) return "";
  const t = e < 0 ? "-" : "", n = Math.abs(e);
  return `${t}${Math.floor(n / 100)}.${String(n % 100).padStart(2, "0")}`;
}
function In(e) {
  const t = e.trim().replace(/^[$€£]/, "").trim();
  if (t === "") return null;
  const n = /^(\d+)(?:\.(\d{0,2}))?$/.exec(t);
  if (!n) return;
  const i = parseInt(n[1], 10), s = n[2] ? parseInt(n[2].padEnd(2, "0"), 10) : 0;
  return i * 100 + s;
}
function En({
  label: e,
  amountCents: t,
  currency: n = "USD",
  onChange: i,
  description: s,
  placeholder: o
}) {
  const r = Z(), [c, u] = w(() => ct(t)), d = X(t);
  D(() => {
    t !== d.current && (u(ct(t)), d.current = t);
  }, [t]);
  const m = (b) => {
    u(b);
    const h = In(b);
    h !== void 0 && (d.current = h, i(h));
  }, _ = Tn(n);
  return /* @__PURE__ */ l("div", { className: "cedros-data-field cedros-admin__field", children: [
    /* @__PURE__ */ a("label", { className: "cedros-data-label cedros-admin__field-label", htmlFor: r, children: e }),
    /* @__PURE__ */ l("div", { className: "cedros-admin__money-input", children: [
      _ && /* @__PURE__ */ a("span", { className: "cedros-admin__money-input-symbol", "aria-hidden": "true", children: _ }),
      /* @__PURE__ */ a(
        "input",
        {
          id: r,
          className: "cedros-data-input cedros-admin__input",
          inputMode: "decimal",
          value: c,
          placeholder: o,
          onChange: (b) => m(b.target.value)
        }
      ),
      !_ && /* @__PURE__ */ a("span", { className: "cedros-admin__money-input-code", children: n })
    ] }),
    /* @__PURE__ */ a(Pe, { description: s })
  ] });
}
function Ge({
  label: e,
  value: t,
  onChange: n,
  options: i,
  description: s
}) {
  const r = new Set(i.map((c) => c.value)).has(t) || !t ? i : [{ value: t, label: `Current: ${t}` }, ...i];
  return /* @__PURE__ */ a(
    Xe,
    {
      label: e,
      value: t,
      onChange: n,
      options: r,
      description: s
    }
  );
}
function Rn({ label: e, children: t }) {
  return /* @__PURE__ */ l("div", { className: "cedros-admin__info-line", role: "note", children: [
    e && /* @__PURE__ */ a("span", { className: "cedros-admin__info-line-label", children: e }),
    /* @__PURE__ */ a("span", { className: "cedros-admin__info-line-text", children: t })
  ] });
}
function Ze({
  label: e,
  value: t,
  onChange: n,
  mono: i = !1,
  rows: s = 4,
  placeholder: o,
  description: r
}) {
  const c = Z();
  return /* @__PURE__ */ l("div", { className: "cedros-data-field cedros-admin__field", children: [
    /* @__PURE__ */ a("label", { className: "cedros-data-label cedros-admin__field-label", htmlFor: c, children: e }),
    /* @__PURE__ */ a(
      "textarea",
      {
        id: c,
        className: `cedros-admin__textarea ${i ? "cedros-admin__textarea--mono" : ""}`,
        rows: s,
        value: t,
        placeholder: o,
        onChange: (u) => n(u.target.value)
      }
    ),
    /* @__PURE__ */ a(Pe, { description: r })
  ] });
}
function xn({ description: e }) {
  return e ? /* @__PURE__ */ a("div", { className: "cedros-admin__field-description", children: e }) : null;
}
function Ln({
  label: e,
  value: t,
  onChange: n,
  description: i,
  placeholder: s = "Add an amount"
}) {
  const [o, r] = w(""), [c, u] = w(null), d = Z(), m = () => {
    const h = o.trim();
    if (!h) return;
    const v = Number(h);
    if (!Number.isFinite(v) || v <= 0) {
      u("Enter a number greater than 0.");
      return;
    }
    if (t.includes(v)) {
      u("That amount is already in the list.");
      return;
    }
    n([...t, v]), r(""), u(null);
  }, _ = (h) => n(t.filter((v) => v !== h)), b = (h) => {
    (h.key === "Enter" || h.key === ",") && (h.preventDefault(), m());
  };
  return /* @__PURE__ */ l("div", { className: "cedros-data-field cedros-admin__field", children: [
    /* @__PURE__ */ a("label", { className: "cedros-data-label cedros-admin__field-label", htmlFor: d, children: e }),
    t.length > 0 && /* @__PURE__ */ a("div", { className: "cedros-admin__chips", role: "list", children: t.map((h) => /* @__PURE__ */ l("span", { className: "cedros-admin__chip", role: "listitem", children: [
      h,
      /* @__PURE__ */ a(
        "button",
        {
          type: "button",
          className: "cedros-admin__chip-remove",
          "aria-label": `Remove ${h}`,
          title: `Remove ${h}`,
          onClick: () => _(h),
          children: M.close
        }
      )
    ] }, h)) }),
    /* @__PURE__ */ l("div", { className: "cedros-admin__chip-add", children: [
      /* @__PURE__ */ a(
        "input",
        {
          id: d,
          "aria-label": e,
          className: "cedros-data-input cedros-admin__input",
          type: "number",
          min: "0",
          inputMode: "decimal",
          value: o,
          placeholder: s,
          onChange: (h) => {
            r(h.target.value), c && u(null);
          },
          onKeyDown: b
        }
      ),
      /* @__PURE__ */ l(
        "button",
        {
          type: "button",
          className: "cedros-data-btn cedros-admin__button cedros-data-btn--secondary cedros-admin__button--outline cedros-data-btn--sm cedros-admin__button--sm",
          onClick: m,
          disabled: !o.trim(),
          children: [
            M.plus,
            "Add"
          ]
        }
      )
    ] }),
    c ? /* @__PURE__ */ a("div", { className: "cedros-admin__field-error", children: c }) : /* @__PURE__ */ a(xn, { description: i })
  ] });
}
[
  ...Object.values(le).map((e) => ({
    symbol: e.symbol,
    decimals: e.decimals
  }))
];
function Mn({ status: e }) {
  return /* @__PURE__ */ a(
    Je,
    {
      status: e,
      className: `cedros-admin__autosave-indicator cedros-admin__autosave-indicator--${On(e)}`
    }
  );
}
function On(e) {
  return e === "failed" ? "error" : e;
}
function Qe({
  title: e,
  description: t,
  enabled: n,
  onToggleEnabled: i,
  offNote: s,
  disabledNote: o,
  toggleDisabled: r = !1,
  status: c,
  children: u
}) {
  const d = n && !r, m = r ? o ?? s : s;
  return /* @__PURE__ */ l("div", { className: "cedros-data-card cedros-admin__section cedros-admin__payment-card cedros-admin__content-settings-card", children: [
    /* @__PURE__ */ l("div", { className: "cedros-data-card__header cedros-admin__section-header cedros-admin__payment-card-header", children: [
      /* @__PURE__ */ l("div", { className: "cedros-admin__payment-card-heading", children: [
        /* @__PURE__ */ a("h3", { className: "cedros-data-card__title cedros-admin__section-title", children: e }),
        /* @__PURE__ */ a("p", { className: "cedros-admin__text-muted cedros-admin__payment-card-description", children: t })
      ] }),
      /* @__PURE__ */ l("div", { className: "cedros-admin__payment-toggle-row", children: [
        /* @__PURE__ */ a(Mn, { status: c }),
        /* @__PURE__ */ a("span", { className: "cedros-admin__payment-toggle-label", children: d ? "On" : "Off" }),
        /* @__PURE__ */ a(
          pe,
          {
            checked: d,
            onCheckedChange: i,
            disabled: r,
            "aria-label": `Turn ${e} on or off`
          }
        )
      ] })
    ] }),
    d ? /* @__PURE__ */ a("div", { className: "cedros-admin__config-fields", children: u }) : /* @__PURE__ */ a("div", { className: "cedros-admin__payment-off-note", children: m })
  ] });
}
function Dn({ children: e }) {
  return /* @__PURE__ */ l("details", { className: "cedros-admin__advanced", children: [
    /* @__PURE__ */ l("summary", { className: "cedros-admin__advanced-summary", children: [
      /* @__PURE__ */ a("span", { className: "cedros-admin__advanced-chevron", children: M.chevronRight }),
      "Advanced"
    ] }),
    /* @__PURE__ */ a("div", { className: "cedros-admin__advanced-body", children: e })
  ] });
}
function Fn({
  tipping: e,
  onChange: t,
  status: n,
  cryptoReady: i,
  cryptoEnabled: s
}) {
  const o = s ? "Add a payout wallet and payment token in Crypto before enabling tipping. Tips use that wallet and token." : "Turn on Crypto to enable tipping. Tips use the Crypto payout wallet and payment token.";
  return /* @__PURE__ */ l(
    Qe,
    {
      title: "Tipping",
      description: "Let readers leave a tip on your posts. They pick an amount and pay with the Crypto payment token; funds settle to the Crypto payout wallet.",
      enabled: e.enabled,
      onToggleEnabled: (r) => t({ enabled: r }),
      offNote: "Tipping is turned off. Turn it on to set it up — Cedros won't show a tip button on your posts until you do.",
      disabledNote: o,
      toggleDisabled: !i,
      status: n,
      children: [
        /* @__PURE__ */ a(
          Ln,
          {
            label: "Quick tip amounts",
            description: "One-tap amounts shown in the tip dialog. Readers can still enter a custom amount.",
            placeholder: "Add an amount (e.g. 5)",
            value: e.presets,
            onChange: (r) => t({ presets: r })
          }
        ),
        /* @__PURE__ */ a(
          ne,
          {
            label: "Button text",
            placeholder: "Tip",
            description: "What the tip button says on your posts.",
            value: e.label,
            onChange: (r) => t({ label: r })
          }
        ),
        /* @__PURE__ */ a(
          Ze,
          {
            label: "Tip dialog message",
            description: "Optional. A short, friendly line shown in the tip dialog.",
            placeholder: "Thanks for supporting independent writing!",
            value: e.description,
            onChange: (r) => t({ description: r }),
            rows: 3
          }
        )
      ]
    }
  );
}
const $n = [
  { value: "free", label: "Free to read" },
  { value: "paid", label: "Pay to unlock" },
  { value: "subscription", label: "Subscribers only" }
], Bn = [
  { value: "public", label: "Public" },
  { value: "preview", label: "Preview only" },
  { value: "locked", label: "Locked" }
], Un = [
  { value: "thumbnail", label: "Thumbnail" },
  { value: "watermarked", label: "Watermarked" },
  { value: "clip", label: "Clip" },
  { value: "poster", label: "Poster" },
  { value: "placeholder", label: "Placeholder" },
  { value: "none", label: "None" }
], et = "USD";
function Wn(e) {
  return e && Number.isFinite(e.amountCents) ? Math.trunc(e.amountCents) : null;
}
function jn(e) {
  return e && typeof e.currency == "string" && e.currency.trim() ? e.currency : et;
}
function Hn(e, t) {
  return e == null ? null : { amountCents: Math.trunc(e), currency: t || et };
}
function Vn(e) {
  if (!e || typeof e != "object") return null;
  const t = e, n = typeof t.currency == "string" && t.currency.trim() ? t.currency : et;
  return typeof t.amountCents == "number" && Number.isFinite(t.amountCents) ? { amountCents: Math.trunc(t.amountCents), currency: n } : typeof t.amount == "number" && Number.isFinite(t.amount) ? { amountCents: Math.round(t.amount * 100), currency: n } : null;
}
const qn = {
  enabled: !1,
  recipient: "",
  currencies: [],
  presets: [],
  label: "Tip",
  description: "",
  allowPerPostRecipient: !1
}, Ke = {
  enabled: !1,
  defaultAccessMode: "free",
  defaultPreviewParagraphs: 2,
  defaultPrice: null,
  acceptedPaymentMethods: [],
  subscriptionProductId: "",
  creditsPerArticle: null,
  freeReadsPerMonth: 0,
  lockedMessage: "Subscribe or purchase access to continue reading.",
  mediaEnabled: !1,
  mediaDefaultAccessMode: "public",
  mediaPreviewPolicy: {
    kind: "thumbnail",
    assetId: null,
    variantKind: null
  },
  mediaPayProductId: "",
  mediaRequiredEntitlementId: "",
  mediaRequiresLogin: !0,
  mediaLockedMessage: "Sign in and purchase access to view this media."
};
function Gn(e) {
  return {
    ...Ke,
    ...e,
    defaultPrice: Vn(e.defaultPrice),
    mediaPreviewPolicy: {
      ...Ke.mediaPreviewPolicy,
      ...e.mediaPreviewPolicy ?? {}
    }
  };
}
class Kn {
  constructor(t) {
    this.authManager = t;
  }
  authManager;
  async fetch(t, n = {}) {
    if (this.authManager?.isAuthenticated())
      return this.authManager.fetchWithAuth(t, n);
    throw new Error("Admin authentication required.");
  }
  async getTipping() {
    return this.fetch("/admin/site-settings/tipping");
  }
  async updateTipping(t) {
    return this.fetch("/admin/site-settings/tipping", {
      method: "PUT",
      body: JSON.stringify({ settings: t })
    });
  }
  async getMonetization() {
    return this.fetch("/admin/site-settings/monetization");
  }
  async updateMonetization(t) {
    return this.fetch("/admin/site-settings/monetization", {
      method: "PUT",
      body: JSON.stringify({ settings: t })
    });
  }
}
function Yn({
  monetization: e,
  onChange: t,
  status: n
}) {
  const i = e.defaultAccessMode, s = i === "free", o = i === "paid", r = i === "subscription", c = Wn(e.defaultPrice), u = jn(e.defaultPrice);
  return /* @__PURE__ */ l(
    Qe,
    {
      title: "Article paywall",
      description: "Set the default access and price for new posts, plus the message readers see when a post is locked. You can still change any individual post later.",
      enabled: e.enabled,
      onToggleEnabled: (d) => t({ enabled: d }),
      offNote: "The article paywall is turned off. Turn it on to set defaults — new posts stay free to read until you do.",
      status: n,
      children: [
        /* @__PURE__ */ a(
          Ge,
          {
            label: "Default access for new posts",
            description: "How new posts start out. You can still change access on any individual post.",
            value: i,
            options: $n,
            onChange: (d) => t({ defaultAccessMode: d })
          }
        ),
        !s && /* @__PURE__ */ l(O, { children: [
          /* @__PURE__ */ l("div", { className: "cedros-admin__form-row", children: [
            /* @__PURE__ */ a(
              dt,
              {
                label: "Free preview length",
                description: "Opening paragraphs readers see before the paywall. Set 0 to lock the post right away.",
                placeholder: "2",
                value: e.defaultPreviewParagraphs,
                onChange: (d) => t({ defaultPreviewParagraphs: d ?? 0 })
              }
            ),
            /* @__PURE__ */ a(
              dt,
              {
                label: "Free locked reads per month",
                description: "Locked posts each reader can open free monthly before they’re asked to pay. Set 0 to require payment every time.",
                placeholder: "0",
                value: e.freeReadsPerMonth,
                onChange: (d) => t({ freeReadsPerMonth: d ?? 0 })
              }
            )
          ] }),
          o && /* @__PURE__ */ a(
            En,
            {
              label: "Price per article",
              description: "What it costs to unlock one post — the same price on every payment method (card, crypto, or credits). Leave blank to unlock by subscription only.",
              placeholder: "0.00",
              amountCents: c,
              currency: u,
              onChange: (d) => t({ defaultPrice: Hn(d, u) })
            }
          ),
          o && /* @__PURE__ */ a(
            ne,
            {
              label: "Subscription for unlimited reads (optional)",
              description: "Readers subscribed to this Pay product read every paid post without paying per article. Paste its product ID from your catalog, or leave blank to only sell per-article access.",
              placeholder: "Paste a subscription product ID",
              value: e.subscriptionProductId,
              onChange: (d) => t({ subscriptionProductId: d })
            }
          ),
          r && /* @__PURE__ */ a(
            ne,
            {
              label: "Subscription that unlocks posts",
              description: "Readers subscribed to this Pay product get full access to subscriber-only posts. Paste its product ID from your catalog.",
              placeholder: "Paste a subscription product ID",
              value: e.subscriptionProductId,
              onChange: (d) => t({ subscriptionProductId: d })
            }
          ),
          /* @__PURE__ */ a(
            Ze,
            {
              label: "Locked post message",
              description: "What readers see when they reach a locked post. Keep it short and inviting.",
              placeholder: "Subscribe or buy access to keep reading.",
              value: e.lockedMessage,
              onChange: (d) => t({ lockedMessage: d }),
              rows: 3
            }
          )
        ] })
      ]
    }
  );
}
function Jn({
  monetization: e,
  onChange: t,
  status: n
}) {
  const i = e.mediaDefaultAccessMode, s = i === "public", o = i === "preview", r = e.mediaPreviewPolicy, c = (u) => t({ mediaPreviewPolicy: { ...r, ...u } });
  return /* @__PURE__ */ l(
    Qe,
    {
      title: "Gated media",
      description: "Lock images, video, and downloads by default, and choose what unlocks them.",
      enabled: e.mediaEnabled,
      onToggleEnabled: (u) => t({ mediaEnabled: u }),
      offNote: "Gated media is turned off. Turn it on to set defaults — your images, video, and downloads stay public until you do.",
      status: n,
      children: [
        /* @__PURE__ */ a(
          Ge,
          {
            label: "Default media access",
            description: "How new images, video, and downloads start out. ‘Public’ shows them to everyone, ‘Preview only’ shows a teaser, and ‘Locked’ hides them until unlocked.",
            value: i,
            options: Bn,
            onChange: (u) => t({ mediaDefaultAccessMode: u })
          }
        ),
        !s && /* @__PURE__ */ l(O, { children: [
          o && /* @__PURE__ */ a(
            Ge,
            {
              label: "What the preview shows",
              description: "The teaser readers see before they unlock.",
              value: r.kind,
              options: Un,
              onChange: (u) => c({ kind: u })
            }
          ),
          /* @__PURE__ */ l("div", { className: "cedros-admin__form-row", children: [
            /* @__PURE__ */ a(
              ne,
              {
                label: "Product that unlocks media",
                description: "Buying this Pay product unlocks your gated media. Set this or an entitlement — at least one is required.",
                placeholder: "Paste a Pay product ID",
                value: e.mediaPayProductId,
                onChange: (u) => t({ mediaPayProductId: u })
              }
            ),
            /* @__PURE__ */ a(
              ne,
              {
                label: "Or an entitlement that unlocks media",
                description: "Readers who already hold this entitlement get access without buying.",
                placeholder: "Paste an entitlement ID",
                value: e.mediaRequiredEntitlementId,
                onChange: (u) => t({ mediaRequiredEntitlementId: u })
              }
            )
          ] }),
          /* @__PURE__ */ a(
            Ze,
            {
              label: "Locked media message",
              description: "What readers see over locked media before they unlock it.",
              placeholder: "Sign in and buy access to view this.",
              value: e.mediaLockedMessage,
              onChange: (u) => t({ mediaLockedMessage: u }),
              rows: 3
            }
          ),
          /* @__PURE__ */ a(Rn, { label: "Sign-in required", children: "Locked and preview media need a signed-in Cedros Login identity so access reaches the right reader. Cedros handles this for you whenever media isn’t public." }),
          o && /* @__PURE__ */ a(Dn, { children: /* @__PURE__ */ l("div", { className: "cedros-admin__form-row", children: [
            /* @__PURE__ */ a(
              ne,
              {
                label: "Specific preview asset",
                description: "Point the preview at a particular uploaded asset instead of an auto-generated one. Leave blank to auto-generate.",
                placeholder: "Leave blank to auto-generate",
                value: r.assetId ?? "",
                onChange: (u) => c({ assetId: u.trim() ? u : null })
              }
            ),
            /* @__PURE__ */ a(
              ne,
              {
                label: "Preview variant",
                description: "Names a specific rendition of the preview asset. Leave blank unless Cedros support gave you one.",
                placeholder: "Leave blank to auto-generate",
                value: r.variantKind ?? "",
                onChange: (u) => c({ variantKind: u.trim() ? u : null })
              }
            )
          ] }) })
        ] })
      ]
    }
  );
}
function zn(e) {
  return !!(e.mediaPayProductId.trim() || e.mediaRequiredEntitlementId.trim());
}
function Xn(e) {
  if (!(!e.mediaEnabled || e.mediaDefaultAccessMode === "public") && !zn(e))
    throw new Error("Add a product or entitlement that unlocks your media before saving.");
}
function fe(e) {
  return typeof e == "string" ? e.trim() : "";
}
function Zn(e, t) {
  return typeof e == "number" && Number.isFinite(e) ? Math.trunc(e) : t;
}
function Qn(e) {
  const t = fe(e.token_mint), n = le[t], i = fe(e.token_symbol) || fe(e.custom_token_symbol);
  return {
    enabled: e.enabled === !0,
    paymentAddress: fe(e.payment_address),
    tokenMint: t,
    tokenSymbol: n?.symbol ?? i,
    tokenDecimals: n?.decimals ?? Zn(e.token_decimals, 6),
    tokenIcon: n?.icon ?? fe(e.custom_token_icon)
  };
}
function lt(e) {
  return e !== "" && Ce(e).valid;
}
function tt(e) {
  return !!(e?.enabled && lt(e.paymentAddress) && lt(e.tokenMint));
}
function ea(e) {
  return [
    {
      symbol: e.tokenSymbol || "TOKEN",
      decimals: e.tokenDecimals,
      logo: e.tokenIcon,
      mint: e.tokenMint
    }
  ];
}
function ut(e, t) {
  return tt(t) ? {
    ...e,
    recipient: t.paymentAddress,
    currencies: ea(t),
    allowPerPostRecipient: !1
  } : { ...e, enabled: !1, allowPerPostRecipient: !1 };
}
function ta(e, t) {
  if (e.enabled) {
    if (!t?.enabled)
      throw new Error("Turn on Crypto before turning tipping on.");
    if (!tt(t))
      throw new Error("Add a payout wallet and payment token in Crypto before turning tipping on.");
  }
}
function na({
  serverUrl: e,
  authManager: t,
  showPageHeader: n = !0
}) {
  const i = !n, s = $(() => new Kn(t), [t]), o = $(
    () => new Fe(e, t),
    [t, e]
  ), [r, c] = w(qn), [u, d] = w(
    Ke
  ), [m, _] = w(null), [b, h] = w(!0), [v, x] = w(!1), [y, N] = w(null), [L, f] = w(null), [p, g] = w(null), P = R(async () => {
    h(!0), N(null), f(null);
    try {
      const [S, k, W] = await Promise.all([
        s.getTipping(),
        s.getMonetization(),
        o.getConfig("x402", !0)
      ]), q = Qn(W.config);
      _(q), c(ut(S.settings, q)), d(Gn(k.settings)), x(!0);
    } catch (S) {
      N(
        S instanceof Error ? S.message : "Failed to load content monetization settings"
      );
    } finally {
      h(!1);
    }
  }, [s, o]);
  D(() => {
    P();
  }, [P]);
  const E = R((S) => {
    c((k) => ({ ...k, ...S }));
  }, []), A = R((S) => {
    d((k) => ({ ...k, ...S }));
  }, []), U = R(
    (S) => {
      g("article"), A(S);
    },
    [A]
  ), ie = R(
    (S) => {
      g("media"), A(S);
    },
    [A]
  ), Q = R(async () => {
    f(null);
    const S = ut(r, m);
    try {
      return ta(S, m), await s.updateTipping(S), c(S), { canonicalDraftKey: JSON.stringify(S) };
    } catch (k) {
      const W = k instanceof Error ? k.message : "Failed to save tipping settings";
      throw f(W), new Error(W);
    }
  }, [s, m, r]), se = R(async () => {
    f(null);
    const S = u.mediaEnabled && u.mediaDefaultAccessMode !== "public", k = {
      ...u,
      // One fixed-point unlock price (defaultPrice) for every rail; the legacy
      // per-rail credits price is retired.
      creditsPerArticle: null,
      mediaRequiresLogin: S ? !0 : u.mediaRequiresLogin
    };
    try {
      return Xn(k), await s.updateMonetization(k), d(k), { canonicalDraftKey: JSON.stringify(k) };
    } catch (W) {
      const q = W instanceof Error ? W.message : "Failed to save paywall defaults";
      throw f(q), new Error(q);
    }
  }, [s, u]), H = De(JSON.stringify(r), Q, {
    ready: v && !b,
    delayMs: 600,
    resourceType: "content-tipping-defaults",
    resourceId: "site-settings/tipping",
    extensionId: "cedros-pay"
  }), V = De(JSON.stringify(u), se, {
    ready: v && !b,
    delayMs: 600,
    resourceType: "content-monetization-defaults",
    resourceId: "site-settings/monetization",
    extensionId: "cedros-pay"
  }), J = p === "article" ? V : "idle", I = p === "media" ? V : "idle";
  return Pt(P, { enabled: !!y, intervalMs: 15e3 }), b && !v ? /* @__PURE__ */ a("div", { className: "cedros-data-card cedros-admin__section", children: /* @__PURE__ */ a(ze, { label: "Loading content monetization settings…" }) }) : !v && y ? /* @__PURE__ */ a("div", { className: "cedros-data-card cedros-admin__section", children: /* @__PURE__ */ a(ve, { message: y, onRetry: P }) }) : /* @__PURE__ */ l(
    "div",
    {
      className: `cedros-admin__content-settings ${i ? "cedros-admin__content-settings--embedded" : ""}`,
      children: [
        n && /* @__PURE__ */ a("div", { className: "cedros-admin__page-header", children: /* @__PURE__ */ l("div", { children: [
          /* @__PURE__ */ a("h2", { className: "cedros-admin__page-title", children: "Content" }),
          /* @__PURE__ */ a("p", { className: "cedros-admin__page-description", children: "Set publisher-wide defaults for tips, paywalled posts, and locked media. These apply to new content — you can still override any single post." })
        ] }) }),
        /* @__PURE__ */ a(ve, { message: y ?? L, onRetry: y ? P : void 0 }),
        /* @__PURE__ */ l("div", { className: "cedros-admin__content-settings-grid", children: [
          /* @__PURE__ */ a(
            Fn,
            {
              tipping: r,
              onChange: E,
              status: H,
              cryptoReady: tt(m),
              cryptoEnabled: m?.enabled === !0
            }
          ),
          /* @__PURE__ */ a(
            Yn,
            {
              monetization: u,
              onChange: U,
              status: J
            }
          ),
          /* @__PURE__ */ a(
            Jn,
            {
              monetization: u,
              onChange: ie,
              status: I
            }
          )
        ] })
      ]
    }
  );
}
const aa = [
  {
    key: "subscriptions",
    title: "Subscriptions",
    description: /* @__PURE__ */ l(O, { children: [
      "Show recurring plan management and subscription choices. Manage plans in",
      " ",
      /* @__PURE__ */ a(te, { sectionId: "catalog", tabId: "subscriptions", children: "Catalog" }),
      "."
    ] })
  },
  {
    key: "refunds",
    title: "Refunds",
    description: /* @__PURE__ */ l(O, { children: [
      "Show refund review workflows and refund request surfaces. Review requests in",
      " ",
      /* @__PURE__ */ a(te, { sectionId: "transactions", tabId: "refunds", children: "Transactions" }),
      "."
    ] })
  },
  {
    key: "returns",
    title: "Returns",
    description: /* @__PURE__ */ l(O, { children: [
      "Show return request workflows and return-related public UI. Manage requests in",
      " ",
      /* @__PURE__ */ a(te, { sectionId: "transactions", tabId: "returns", children: "Transactions" }),
      "."
    ] })
  },
  {
    key: "inventory",
    title: "Inventory",
    description: /* @__PURE__ */ l(O, { children: [
      "Show stock tracking and inventory adjustment tools. Manage stock in",
      " ",
      /* @__PURE__ */ a(te, { sectionId: "catalog", tabId: "inventory", children: "Catalog" }),
      "."
    ] })
  },
  {
    key: "coupons",
    title: "Coupons",
    description: /* @__PURE__ */ l(O, { children: [
      "Show coupon management and public coupon entry points. Manage coupons in",
      " ",
      /* @__PURE__ */ a(te, { sectionId: "catalog", tabId: "coupons", children: "Catalog" }),
      "."
    ] })
  },
  {
    key: "shipping",
    title: "Shipping",
    description: /* @__PURE__ */ l(O, { children: [
      "Show physical product fulfillment and shipping address collection. Configure products in",
      " ",
      /* @__PURE__ */ a(te, { sectionId: "catalog", tabId: "products", children: "Catalog" }),
      "."
    ] })
  },
  {
    key: "taxes",
    title: "Taxes",
    description: /* @__PURE__ */ l(O, { children: [
      "Show tax collection settings for checkout. Manage Stripe tax rates in",
      " ",
      /* @__PURE__ */ a(te, { sectionId: "settings-hub", tabId: "stripe", children: "Stripe settings" }),
      "."
    ] })
  }
];
function ia(e) {
  return `${ue}:${e}`;
}
function sa(e, t) {
  return `/admin/${`${Se}:${ia(e)}`}/${t}`;
}
function te({
  children: e,
  sectionId: t,
  tabId: n
}) {
  return /* @__PURE__ */ a(
    "a",
    {
      className: "cedros-admin__field-help",
      href: sa(t, n),
      "data-section-id": `cedros-pay:${t}`,
      "data-tab-id": `cedros-pay:${n}`,
      children: e
    }
  );
}
function ra({ state: e }) {
  return /* @__PURE__ */ a(
    Je,
    {
      status: e,
      className: `cedros-admin__autosave-indicator cedros-admin__autosave-indicator--${oa(e)}`
    }
  );
}
function oa(e) {
  return e === "failed" ? "error" : e;
}
function da({
  children: e,
  checked: t,
  description: n,
  disabled: i,
  onChange: s,
  saveState: o,
  title: r
}) {
  return /* @__PURE__ */ l("section", { className: "cedros-data-card cedros-admin__field-group", children: [
    /* @__PURE__ */ l("div", { className: "cedros-data-card__header cedros-admin__field-group-header", children: [
      /* @__PURE__ */ l("div", { className: "cedros-admin__field-group-heading", children: [
        /* @__PURE__ */ l("div", { className: "cedros-admin__section-header-left", children: [
          /* @__PURE__ */ a("h3", { className: "cedros-data-card__title cedros-admin__field-group-title", children: r }),
          /* @__PURE__ */ a("span", { className: "cedros-admin__section-badge", children: t ? "On" : "Off" })
        ] }),
        /* @__PURE__ */ a("p", { className: "cedros-admin__field-group-description", children: n })
      ] }),
      /* @__PURE__ */ l("div", { className: "cedros-admin__payment-toggle-row", children: [
        /* @__PURE__ */ a(ra, { state: o }),
        /* @__PURE__ */ a(
          pe,
          {
            checked: t,
            onCheckedChange: s,
            disabled: i,
            "aria-label": `Turn ${r} on or off`
          }
        )
      ] })
    ] }),
    e ? /* @__PURE__ */ a("div", { className: "cedros-admin__field-group-body", children: e }) : null
  ] });
}
function _e({
  disabled: e,
  label: t,
  onChange: n,
  placeholder: i,
  value: s
}) {
  return /* @__PURE__ */ l("div", { className: "cedros-data-field cedros-admin__field", children: [
    /* @__PURE__ */ a("label", { className: "cedros-data-label cedros-admin__field-label", children: t }),
    /* @__PURE__ */ a(
      "input",
      {
        type: "text",
        className: "cedros-data-input cedros-admin__input",
        value: s || "",
        onChange: (o) => n(o.target.value),
        placeholder: i,
        disabled: e
      }
    )
  ] });
}
function ca({
  disabled: e,
  onChange: t,
  settings: n
}) {
  return /* @__PURE__ */ l(O, { children: [
    /* @__PURE__ */ l("div", { className: "cedros-admin__form-row", children: [
      /* @__PURE__ */ a(
        _e,
        {
          label: "Page title",
          value: n.pageTitle,
          onChange: (i) => t("pageTitle", i),
          placeholder: "Choose Your Plan",
          disabled: e
        }
      ),
      /* @__PURE__ */ a(
        _e,
        {
          label: "Page subtitle",
          value: n.pageSubtitle,
          onChange: (i) => t("pageSubtitle", i),
          placeholder: "Select the plan that best fits your needs.",
          disabled: e
        }
      )
    ] }),
    /* @__PURE__ */ l("div", { className: "cedros-admin__form-row", children: [
      /* @__PURE__ */ a(
        _e,
        {
          label: "Annual savings badge",
          value: n.annualSavingsBadge,
          onChange: (i) => t("annualSavingsBadge", i),
          placeholder: "2 months free",
          disabled: e
        }
      ),
      /* @__PURE__ */ a(
        _e,
        {
          label: "Popular plan badge",
          value: n.popularBadgeText,
          onChange: (i) => t("popularBadgeText", i),
          placeholder: "Best Deal",
          disabled: e
        }
      )
    ] }),
    /* @__PURE__ */ a("div", { className: "cedros-admin__form-row", children: /* @__PURE__ */ a(
      _e,
      {
        label: "Footer notice",
        value: n.footerNotice,
        onChange: (i) => t("footerNotice", i),
        placeholder: "For information regarding invoices, taxes…",
        disabled: e
      }
    ) })
  ] });
}
function la({
  disabled: e,
  flags: t,
  onChange: n,
  onSubscriptionChange: i,
  saveState: s,
  statusFeature: o,
  subscriptionSettings: r
}) {
  return /* @__PURE__ */ a("div", { className: "cedros-admin__config-fields", children: aa.map((c) => /* @__PURE__ */ a(
    da,
    {
      title: c.title,
      description: c.description,
      checked: t[c.key],
      disabled: e,
      saveState: o === c.key ? s : "idle",
      onChange: (u) => n(c.key, u),
      children: c.key === "subscriptions" && t.subscriptions ? /* @__PURE__ */ a(
        ca,
        {
          settings: r,
          disabled: e,
          onChange: i
        }
      ) : null
    },
    c.key
  )) });
}
const j = {
  enabled: !0,
  plans: [],
  pageTitle: "Choose Your Plan",
  pageSubtitle: "Select the plan that best fits your needs.",
  annualSavingsBadge: "2 months free",
  popularBadgeText: "Best Deal",
  footerNotice: ""
};
function Ye(e) {
  return {
    enabled: e.enabled ?? j.enabled,
    pageTitle: e.pageTitle ?? j.pageTitle,
    pageSubtitle: e.pageSubtitle ?? j.pageSubtitle,
    annualSavingsBadge: e.annualSavingsBadge ?? j.annualSavingsBadge,
    popularBadgeText: e.popularBadgeText ?? j.popularBadgeText,
    footerNotice: e.footerNotice ?? j.footerNotice
  };
}
function pt(e) {
  const t = Ye(e);
  return {
    pageTitle: t.pageTitle,
    pageSubtitle: t.pageSubtitle,
    annualSavingsBadge: t.annualSavingsBadge,
    popularBadgeText: t.popularBadgeText,
    footerNotice: t.footerNotice
  };
}
const Re = {
  subscriptions: !0,
  refunds: !0,
  returns: !0,
  inventory: !0,
  coupons: !0,
  shipping: !0,
  taxes: !0
}, B = {
  refunds: "refunds_enabled",
  returns: "returns_enabled",
  inventory: "inventory_enabled",
  coupons: "coupons_enabled",
  shipping: "shipping_enabled",
  taxes: "taxes_enabled"
};
function re(e, t, n) {
  const i = e?.[t];
  return typeof i == "boolean" ? i : n;
}
function Rt(e) {
  return {
    refunds: re(e, B.refunds, !0),
    returns: re(e, B.returns, !0),
    inventory: re(e, B.inventory, !0),
    coupons: re(e, B.coupons, !0),
    shipping: re(e, B.shipping, !0),
    taxes: re(e, B.taxes, !0)
  };
}
function ua(e) {
  return {
    [B.refunds]: e.refunds,
    [B.returns]: e.returns,
    [B.inventory]: e.inventory,
    [B.coupons]: e.coupons,
    [B.shipping]: e.shipping,
    [B.taxes]: e.taxes
  };
}
function Qa(e, t) {
  const n = $(
    () => new Fe(e, t),
    [e, t]
  ), [i, s] = w(Re), [o, r] = w(null), c = R(async () => {
    if (!t?.isAuthenticated()) {
      s(Re);
      return;
    }
    try {
      const [u, d] = await Promise.all([
        n.getConfig("shop", !0),
        wt(t, "/admin/subscriptions/settings")
      ]);
      s({
        ...Rt(u.config),
        subscriptions: d.enabled ?? j.enabled
      }), r(null);
    } catch {
      s(Re), r("Failed to load feature visibility settings");
    }
  }, [t, n]);
  return D(() => {
    c();
  }, [c]), { flags: i, error: o, refresh: c };
}
const we = [
  "pageTitle",
  "pageSubtitle",
  "annualSavingsBadge",
  "popularBadgeText",
  "footerNotice"
], pa = [
  "enabled",
  "plans",
  "plans.id",
  "plans.priceMonthlyUsd",
  "plans.priceAnnualUsd",
  "plans.isActive",
  "plans.inventoryQuantity",
  "plans.inventorySold",
  "plans.stripeProductId",
  "plans.stripePriceIdMonthly",
  "plans.stripePriceIdAnnual",
  "plans.solanaSubscription"
], z = {
  extensionId: ue,
  resourceType: "subscription-settings",
  deriveResourceId: () => "default",
  patchSchema: {
    type: "object",
    additionalProperties: !1,
    properties: Object.fromEntries(we.map((e) => [e, "string"]))
  },
  allowedAutosaveFields: [...we],
  blockedFields: pa,
  debounceProfile: "text",
  optimisticUi: !1,
  conflictStrategy: "reject",
  validatePatch: fa,
  authzRequirements: ["admin_subscriptions_settings_update"],
  dataSensitivity: "moderate",
  payloadSizeExpectation: "<10KB",
  localPersistence: !0,
  telemetryLabels: {
    surface: "pay-hub-overview",
    resource: "subscription-page-copy"
  },
  migrationNotes: "Subscription page copy uses protocol autosave. Feature visibility and plan fields stay explicit saves."
};
function ma(e, t) {
  const n = {};
  for (const i of we)
    e[i] !== t[i] && (n[i] = t[i] ?? "");
  return Object.keys(n).length > 0 ? n : null;
}
function ha(e) {
  return we.filter((t) => t in e);
}
function fa(e) {
  const t = Object.keys(e).find(
    (n) => !we.includes(n)
  );
  return t ? { ok: !1, message: `Unsupported subscription page autosave field: ${t}` } : { ok: !0 };
}
async function _a(e, t, n) {
  const i = n.etag ?? `"subscription-settings:${n.baseRevision ?? 0}"`;
  return St(e).fetchWithAuth("/admin/subscriptions/settings", {
    method: "PATCH",
    headers: {
      "If-Match": i,
      "Idempotency-Key": n.idempotencyKey
    },
    body: JSON.stringify({
      autosave: !0,
      clientMutationId: n.clientMutationId,
      editingSessionId: n.editingSessionId,
      clientSeq: n.clientSeq,
      updateMask: n.updateMask,
      patch: t,
      schemaVersion: "v1"
    }),
    signal: n.signal
  });
}
function ba(e, t) {
  return {
    ...Rt(t),
    subscriptions: e.enabled ?? j.enabled
  };
}
function ga({ serverUrl: e, authManager: t }) {
  const n = $(
    () => new Fe(e, t),
    [e, t]
  ), [i, s] = w(j), [o, r] = w(
    Ye(j)
  ), [c, u] = w(
    Re
  ), [d, m] = w(0), [_, b] = w('"subscription-settings:0"'), [h, v] = w(null), [x, y] = w(!0), [N, L] = w(!1), [f, p] = w(null), g = R(async () => {
    y(!0), p(null);
    try {
      const [I, S] = await Promise.all([
        wt(t, "/admin/subscriptions/settings"),
        n.getConfig("shop", !0)
      ]), k = { ...j, ...I }, W = Ye(k), q = ba(k, S.config);
      s(k), m(k.revision ?? 0), b(k.etag ?? `"subscription-settings:${k.revision ?? 0}"`), r(W), u(q), v(null), L(!0);
    } catch {
      p("Failed to load Pay hub overview settings");
    } finally {
      y(!1);
    }
  }, [t, n]);
  D(() => {
    g();
  }, [g]);
  const P = $(
    () => pt(o),
    [o]
  ), E = R(
    (I, S) => {
      v("subscriptions"), r((k) => ({ ...k, [I]: S })), I === "enabled" && u((k) => ({ ...k, subscriptions: !!S }));
    },
    []
  ), A = R(
    (I, S) => {
      v(I), u((k) => ({ ...k, [I]: S })), I === "subscriptions" && E("enabled", S);
    },
    [E]
  ), U = R(
    (I) => {
      typeof I.revision == "number" && m(I.revision), typeof I.etag == "string" && b(I.etag), I.canonicalPatchOrResource && s(I.canonicalPatchOrResource);
    },
    []
  ), ie = R(
    async (I, S) => {
      const k = await _a(t, I, S);
      return U(k), {
        ...k,
        canonicalPatchOrResource: k.canonicalPatchOrResource ? pt(k.canonicalPatchOrResource) : void 0
      };
    },
    [t, U]
  ), Q = Nt({
    extensionId: z.extensionId,
    resourceType: z.resourceType,
    resourceId: z.deriveResourceId(P),
    baseRevision: d,
    etag: _,
    draft: P,
    makePatch: ma,
    validatePatch: z.validatePatch,
    save: ie,
    getUpdateMask: ha,
    debounceProfile: z.debounceProfile,
    conflictStrategy: z.conflictStrategy,
    persistenceKey: "subscription-settings:default:page-copy",
    blockedFields: z.blockedFields,
    enabled: N && !x,
    onConflict: () => p("Subscription page copy changed elsewhere. Reload before saving again."),
    onPermanentFailure: () => p("Failed to autosave subscription page copy")
  }), se = R(async () => {
    p(null);
    try {
      const I = {
        ...i,
        ...o
      }, S = ua(c), [k] = await Promise.all([
        St(t).fetchWithAuth(
          "/admin/subscriptions/settings",
          {
            method: "PUT",
            body: JSON.stringify(I)
          }
        ),
        n.patchConfig(
          "subscriptions",
          { enabled: o.enabled },
          "Updated via Pay hub overview"
        ),
        n.patchConfig("shop", S, "Updated via Pay hub overview")
      ]);
      s(k), m(k.revision ?? d), b(
        k.etag ?? `"subscription-settings:${k.revision ?? d}"`
      );
    } catch {
      throw p("Failed to save feature visibility settings"), new Error("Failed to save feature visibility settings");
    }
  }, [t, n, c, o, d, i]), H = JSON.stringify(c), V = De(H, async () => (await se(), { canonicalDraftKey: H }), {
    ready: N && !x,
    delayMs: 600,
    resourceType: "commerce-feature-visibility",
    resourceId: "default",
    extensionId: z.extensionId
  }), J = Q.status !== "idle" ? Q.status : V;
  return x ? /* @__PURE__ */ a(ze, { label: "Loading overview settings…" }) : !N && f ? /* @__PURE__ */ a(ve, { message: f, onRetry: g }) : /* @__PURE__ */ l("div", { className: "cedros-data-stack cedros-admin__settings", children: [
    /* @__PURE__ */ a(ve, { message: f }),
    /* @__PURE__ */ a(
      la,
      {
        flags: c,
        disabled: V === "saving",
        onChange: A,
        saveState: h === "subscriptions" ? J : V,
        statusFeature: h,
        subscriptionSettings: o,
        onSubscriptionChange: E
      }
    )
  ] });
}
const xt = "cedrosPaySectionId", Lt = "cedrosPayTabId", Mt = "cedrosPaySection", Ot = "cedrosPayTab";
function nt() {
  return typeof window > "u" ? null : window;
}
function mt(e) {
  return e && typeof e == "object" && !Array.isArray(e) ? e : {};
}
function ht(e) {
  return `${ue}:${e}`;
}
function Dt(e) {
  if (!e) return;
  const t = e.indexOf(":");
  return t === -1 ? e : e.slice(0, t) === ue ? e.slice(t + 1) : void 0;
}
function ya(e) {
  return {
    sectionId: e.searchParams.get(xt) ?? e.searchParams.get(Mt),
    tabId: e.searchParams.get(Lt) ?? e.searchParams.get(Ot)
  };
}
function va(e, t, n = {}) {
  if (!e) return;
  const i = Dt(e);
  if (i)
    return t.includes(i) ? i : n[i];
}
function xe(e, t, n = {}) {
  const i = nt();
  if (!i || !e) return;
  const s = new URL(i.location.href), { sectionId: o, tabId: r } = ya(s), c = Dt(o);
  if (!(c && c !== e))
    return va(r ?? void 0, t, n);
}
function ka(e, t) {
  const n = nt();
  if (!n || !e) return;
  const i = new URL(n.location.href);
  if (xe(e, [t]) === t) return;
  const o = ht(e), r = ht(t);
  i.searchParams.set(xt, o), i.searchParams.set(Lt, r), i.searchParams.delete(Mt), i.searchParams.delete(Ot);
  const c = mt(n.history.state), u = mt(c.pluginData), d = {
    moduleId: Se,
    sectionId: o,
    tabId: r,
    defaultTabId: r
  };
  n.history.pushState(
    {
      ...c,
      route: d,
      currentRoute: d,
      pluginData: {
        ...u,
        sectionId: o,
        tabId: r,
        defaultTabId: r
      }
    },
    "",
    `${i.pathname}${i.search}${i.hash}`
  );
}
function wa(e) {
  const t = nt();
  if (t)
    return t.addEventListener("popstate", e), () => t.removeEventListener("popstate", e);
}
const F = [
  {
    id: "overview",
    label: "Overview"
  },
  {
    id: "stripe",
    label: "Stripe",
    category: "stripe",
    description: "Accept payments through Stripe Checkout."
  },
  {
    id: "crypto",
    label: "Crypto",
    category: "x402",
    description: "Accept USDC and other Solana tokens, paid straight to your wallet."
  },
  {
    id: "credits",
    label: "Credits",
    category: "cedros_login",
    description: "Let signed-in users pay with credits held by Cedros Balance through the host seam.",
    // The server still stores the Pay-side credits flag in the cedros_login category.
    enabledField: "credits_enabled",
    enableImplies: ["enabled"]
  },
  {
    id: "content",
    label: "Content"
  },
  {
    id: "app_stores",
    label: "App stores",
    category: "native_store",
    description: "Verify Apple App Store and Google Play purchases and keep them in sync."
  }
], Te = "settings-hub", Le = {
  "payment-settings": "stripe"
}, Ue = F.map((e) => e.id);
function We(e) {
  const t = e ? Le[e] : void 0;
  return t || (F.some((n) => n.id === e) ? e : "overview");
}
function Sa(e, t) {
  const n = F.findIndex((i) => i.id === e);
  if (n < 0) return null;
  switch (t) {
    case "ArrowRight":
      return F[(n + 1) % F.length].id;
    case "ArrowLeft":
      return F[(n - 1 + F.length) % F.length].id;
    case "Home":
      return F[0].id;
    case "End":
      return F[F.length - 1].id;
    default:
      return null;
  }
}
function Na({
  activeTab: e,
  listId: t,
  onSelect: n,
  setTabRef: i,
  tab: s
}) {
  const o = e === s.id;
  return /* @__PURE__ */ a(
    "button",
    {
      ref: (r) => i(s.id, r),
      type: "button",
      role: "tab",
      id: `${t}-tab-${s.id}`,
      "aria-selected": o,
      "aria-controls": `${t}-panel-${s.id}`,
      tabIndex: o ? 0 : -1,
      className: `cedros-data-tabs__tab cedros-admin__tab ${o ? "cedros-admin__tab--active" : ""}`,
      onClick: () => n(s.id),
      children: s.label
    }
  );
}
function Ca({ activeTab: e, listId: t, onSelect: n }) {
  const i = X(/* @__PURE__ */ new Map()), s = R(
    (c, u = {}) => {
      if (n(c), u.focus) {
        const d = i.current.get(c);
        d && queueMicrotask(() => d.focus());
      }
    },
    [n]
  ), o = R((c, u) => {
    u ? i.current.set(c, u) : i.current.delete(c);
  }, []), r = R(
    (c) => {
      const u = Sa(e, c.key);
      u && (c.preventDefault(), s(u, { focus: !0 }));
    },
    [e, s]
  );
  return /* @__PURE__ */ a(
    "div",
    {
      className: "cedros-data-tabs cedros-data-tabs__list cedros-admin__tabs cedros-admin__tabs--line",
      role: "tablist",
      "aria-label": "Payment settings",
      onKeyDown: r,
      children: F.map((c) => /* @__PURE__ */ a(
        Na,
        {
          activeTab: e,
          listId: t,
          onSelect: s,
          setTabRef: o,
          tab: c
        },
        c.id
      ))
    }
  );
}
function Pa({
  activeTab: e,
  authManager: t,
  creditsDependencyInstalled: n,
  currentTab: i,
  serverUrl: s
}) {
  if (e === "overview")
    return /* @__PURE__ */ a(
      ga,
      {
        serverUrl: s,
        authManager: t
      }
    );
  if (e === "content")
    return /* @__PURE__ */ a(
      na,
      {
        serverUrl: s,
        authManager: t,
        showPageHeader: !1
      }
    );
  const o = e === "credits", r = ["stripe", "crypto", "credits", "app_stores"].includes(e), c = r ? o && !n ? "Credits require Cedros Balance and host conditional database transactions. Install Balance and upgrade the host before enabling this rail." : `${i.label} mutations are unavailable until Cedros Data provides atomic conditional database transactions and Pay adopts every claim path.` : void 0;
  return /* @__PURE__ */ a(O, { children: i.category && /* @__PURE__ */ a(
    An,
    {
      serverUrl: s,
      authManager: t,
      category: i.category,
      title: i.label,
      description: i.description,
      enabledField: i.enabledField,
      enableImplies: i.enableImplies,
      showEnabledToggle: !0,
      blockedReason: c,
      blockedTitle: "Payment rail unavailable",
      hideActions: r,
      hideEditor: r,
      setupNote: r ? "Configuration inspection remains available. Checkout, settlement, webhook, subscription, refund, and native-store mutations stay disabled until the host conditional transaction contract is installed and adopted." : void 0
    },
    i.category
  ) });
}
function Aa({
  serverUrl: e,
  authManager: t,
  defaultTabId: n,
  dependencies: i
}) {
  const [s, o] = w(
    () => xe(Te, Ue, Le) ?? We(n)
  ), r = Z();
  D(() => {
    const d = xe(Te, Ue, Le) ?? We(n);
    d !== s && o(d);
  }, [s, n]), D(() => wa(() => {
    const d = xe(
      Te,
      Ue,
      Le
    );
    o(d ?? We(n));
  }), [n]);
  const c = R((d) => {
    o(d), ka(Te, d);
  }, []), u = F.find((d) => d.id === s);
  return /* @__PURE__ */ l("div", { className: "cedros-data-stack cedros-admin__payment-settings", children: [
    /* @__PURE__ */ a("div", { className: "cedros-admin__page-header cedros-data__header", children: /* @__PURE__ */ l("div", { className: "cedros-data__header-text", children: [
      /* @__PURE__ */ a("h2", { className: "cedros-admin__page-title cedros-data__title", children: "Pay hub" }),
      /* @__PURE__ */ a("p", { className: "cedros-admin__page-description cedros-data__subtitle", children: "Configure the payment rails Cedros can use across web, iOS, Android, and crypto flows." })
    ] }) }),
    /* @__PURE__ */ a(
      Ca,
      {
        activeTab: s,
        listId: r,
        onSelect: c
      }
    ),
    /* @__PURE__ */ a(
      "div",
      {
        className: "cedros-data-tabs__panel cedros-admin__payment-settings-body",
        role: "tabpanel",
        id: `${r}-panel-${s}`,
        "aria-labelledby": `${r}-tab-${s}`,
        tabIndex: 0,
        children: /* @__PURE__ */ a(
          Pa,
          {
            activeTab: s,
            authManager: t,
            creditsDependencyInstalled: i?.cedrosBalanceInstalled === !0,
            currentTab: u,
            serverUrl: e
          }
        )
      }
    )
  ] });
}
function Ta(e) {
  return /* @__PURE__ */ a(Aa, { ...e });
}
const Ia = "cedros-pay:transactions", Ea = "cedros-pay:settings-hub";
function ft(e, t) {
  if (!e || typeof e != "object") return null;
  const n = e;
  for (const i of t) {
    const s = n[i];
    if (typeof s == "number" && Number.isFinite(s)) return s;
  }
  return null;
}
function Ie({
  label: e,
  sectionId: t = Ia,
  disabled: n = !1
}) {
  return /* @__PURE__ */ a(
    "button",
    {
      type: "button",
      className: "cedros-data-btn cedros-data-btn--secondary cedros-data-btn--sm cedros-dashboard__card-action",
      "data-module-id": Se,
      "data-section-id": t,
      disabled: n,
      "aria-disabled": n,
      children: e
    }
  );
}
function be({
  state: e,
  label: t
}) {
  return /* @__PURE__ */ l("div", { className: "cedros-data-card__header cedros-dashboard__card-header", children: [
    /* @__PURE__ */ a("h3", { className: "cedros-data-card__title", children: "Cedros Pay" }),
    /* @__PURE__ */ a("span", { className: `cedros-data-pill cedros-dashboard__state cedros-dashboard__state--${e}`, children: t })
  ] });
}
function ge({
  children: e,
  extensionId: t,
  state: n
}) {
  return /* @__PURE__ */ a("div", { className: "cedros-pay-dashboard cedros-data", "data-extension-id": t, children: /* @__PURE__ */ a(
    "section",
    {
      className: "cedros-data-card cedros-dashboard__card",
      "data-extension-id": t,
      "data-state": n,
      "aria-busy": n === "loading",
      children: e
    }
  ) });
}
function Ra({
  pluginContext: e,
  extensionId: t,
  isLoading: n,
  analyticsSnapshot: i,
  analyticsError: s
}) {
  const o = e.hasPermission("cedros-pay:admin"), r = e.serverUrl.length > 0;
  if (!o || !r)
    return /* @__PURE__ */ l(ge, { extensionId: t, state: "disabled", children: [
      /* @__PURE__ */ a(be, { state: "disabled", label: o ? "Setup needed" : "No access" }),
      /* @__PURE__ */ l("div", { className: "cedros-data-status cedros-data-status--warning", role: "status", children: [
        /* @__PURE__ */ a("span", { children: o ? "Connect Cedros Pay server access to view payment status." : "Cedros Pay admin access is required." }),
        /* @__PURE__ */ a("div", { className: "cedros-data-status__actions", children: /* @__PURE__ */ a(Ie, { label: "Open setup", sectionId: Ea, disabled: !o }) })
      ] })
    ] });
  if (n)
    return /* @__PURE__ */ l(ge, { extensionId: t, state: "loading", children: [
      /* @__PURE__ */ a(be, { state: "loading", label: "Loading" }),
      /* @__PURE__ */ l("div", { className: "cedros-dashboard__skeleton", "aria-hidden": "true", children: [
        /* @__PURE__ */ a("span", {}),
        /* @__PURE__ */ a("span", {}),
        /* @__PURE__ */ a("span", {})
      ] }),
      /* @__PURE__ */ a("span", { className: "cedros-dashboard__visually-hidden", role: "status", children: "Loading payment status…" })
    ] });
  if (s)
    return /* @__PURE__ */ l(ge, { extensionId: t, state: "error", children: [
      /* @__PURE__ */ a(be, { state: "error", label: "Unavailable" }),
      /* @__PURE__ */ l("div", { className: "cedros-data-status cedros-data-status--error", role: "alert", children: [
        /* @__PURE__ */ a("span", { children: "Cedros couldn't load payment status. Checkout data is safe. Review payments and try again." }),
        /* @__PURE__ */ a("div", { className: "cedros-data-status__actions", children: /* @__PURE__ */ a(Ie, { label: "Review payments" }) })
      ] })
    ] });
  const c = ft(i, ["paymentSucceeded", "payment_succeeded"]), u = ft(i, ["paymentFailed", "payment_failed"]);
  if (c === null && u === null)
    return /* @__PURE__ */ l(ge, { extensionId: t, state: "empty", children: [
      /* @__PURE__ */ a(be, { state: "empty", label: "No activity" }),
      /* @__PURE__ */ a("p", { className: "cedros-data-empty", children: "No payment activity in this dashboard window." }),
      /* @__PURE__ */ a(Ie, { label: "View transactions" })
    ] });
  const d = c ?? 0, m = u ?? 0, _ = d + m, b = _ > 0 ? Math.round(d / _ * 100) : 0, h = new Intl.NumberFormat(e.locale), v = new Intl.NumberFormat(e.locale, {
    style: "percent",
    maximumFractionDigits: 0
  });
  return /* @__PURE__ */ l(ge, { extensionId: t, state: "ready", children: [
    /* @__PURE__ */ a(be, { state: "ready", label: "Live" }),
    /* @__PURE__ */ l("dl", { className: "cedros-data-summary-grid cedros-dashboard__metrics", children: [
      /* @__PURE__ */ l("div", { className: "cedros-data-metric", children: [
        /* @__PURE__ */ a("dt", { className: "cedros-data-metric__label", children: "Succeeded" }),
        /* @__PURE__ */ a("dd", { className: "cedros-data-metric__value", children: h.format(d) })
      ] }),
      /* @__PURE__ */ l("div", { className: "cedros-data-metric", children: [
        /* @__PURE__ */ a("dt", { className: "cedros-data-metric__label", children: "Failed" }),
        /* @__PURE__ */ a("dd", { className: "cedros-data-metric__value", children: h.format(m) })
      ] }),
      /* @__PURE__ */ l("div", { className: "cedros-data-metric", children: [
        /* @__PURE__ */ a("dt", { className: "cedros-data-metric__label", children: "Success rate" }),
        /* @__PURE__ */ a("dd", { className: "cedros-data-metric__value", children: v.format(b / 100) })
      ] })
    ] }),
    /* @__PURE__ */ a(Ie, { label: "View transactions" })
  ] });
}
const xa = [
  "cedros-balance:balance-read"
];
function La(e) {
  return e && typeof e == "object" && !Array.isArray(e) ? e : void 0;
}
function _t(e) {
  return typeof e == "boolean" ? e : void 0;
}
function bt(e) {
  const t = /* @__PURE__ */ new Set([
    ...e?.permissions ?? [],
    ...e?.capabilities ?? []
  ]);
  return xa.every(
    (n) => t.has(n)
  );
}
function Ma(e) {
  const t = ce(
    e,
    de.org
  ), n = La(
    ce(
      e,
      de.cedrosBalance
    ) ?? e.cedrosBalance
  );
  return n ? _t(n.installed) ?? _t(n.enabled) ?? !0 ? bt(t) : !1 : bt(t);
}
const Oa = [
  "route",
  "currentRoute",
  "routeState",
  "navigationTarget",
  "adminRoute"
];
function Ft({ children: e }) {
  return /* @__PURE__ */ a("div", { className: "cedros-pay-admin cedros-data", "data-extension-id": "cedros-pay", children: e });
}
function $t(e) {
  return e.hasPermission("cedros-pay:admin") || e.hasPermission("admin");
}
function Bt(e, t, n) {
  const i = new Gt(e.serverUrl);
  return i.setCedrosLoginAuth(t ?? null, n), i.setHostSessionAuth(n), i;
}
const gt = (e) => jt(async () => {
  const i = (await e()).default;
  return { default: ({ pluginContext: o }) => {
    const r = o.getAccessToken(), c = $t(o), u = $(() => Bt(o, r, c), [c, o, r]), d = o.pluginData?.defaultTabId, m = typeof d == "string" && d.length > 0 ? d : void 0, _ = {
      serverUrl: o.serverUrl,
      locale: o.locale,
      authManager: u,
      defaultTabId: m,
      dependencies: o.dependencies
    };
    return /* @__PURE__ */ a(Ft, { children: /* @__PURE__ */ a(i, { ..._ }) });
  } };
}), Da = (e) => ({ pluginContext: t }) => {
  const n = t.getAccessToken(), i = $t(t), s = $(() => Bt(t, n, i), [i, t, n]), o = t.pluginData?.defaultTabId, r = typeof o == "string" && o.length > 0 ? o : void 0;
  return /* @__PURE__ */ a(Ft, { children: /* @__PURE__ */ a(
    e,
    {
      serverUrl: t.serverUrl,
      locale: t.locale,
      authManager: s,
      defaultTabId: r,
      dependencies: t.dependencies
    }
  ) });
}, Fa = {
  transactions: Be.transactions,
  catalog: Be.catalog,
  "settings-hub": Be.settings
}, je = "/extensions/cedros-pay";
function Me(e) {
  return e?.trim().replace(/\/+$/, "") ?? "";
}
function yt(e) {
  const t = Me(e);
  if (!t) return "";
  try {
    if (new URL(t).pathname.replace(/\/+$/, "").endsWith(je))
      return t;
  } catch {
    if (t.endsWith(je))
      return t;
  }
  return `${t}${je}`;
}
function $a(e, t) {
  const n = Me(
    e?.runtimeBaseUrl || e?.extensionBaseUrl || e?.apiBaseUrl
  );
  if (n)
    return n;
  const i = Me(e?.serverUrl), s = Me(t?.serverUrl);
  return i && i !== s ? i : yt(i || s);
}
function Ba(e) {
  const t = e?.trim().toLowerCase();
  return t === "owner" || t === "administrator" || t === "admin";
}
function Ua(e, t) {
  return e?.permissions?.includes(t) === !0 || e?.capabilities?.includes(t) === !0;
}
function He(e) {
  return e && typeof e == "object" && !Array.isArray(e) ? e : void 0;
}
function Ee(e) {
  return typeof e == "string" && e.trim().length > 0 ? e.trim() : void 0;
}
function Ve(e) {
  if (!e) return;
  const t = {
    moduleId: Ee(e.moduleId),
    sectionId: Ee(e.sectionId),
    tabId: Ee(e.tabId),
    defaultTabId: Ee(e.defaultTabId)
  };
  return Object.values(t).some(Boolean) ? t : void 0;
}
function Wa(e) {
  const t = He(e) ?? {}, n = Ve(t), i = [];
  n && i.push(n);
  for (const o of Oa) {
    const r = Ve(He(t[o]));
    r && i.push({ ...n, ...r });
  }
  const s = Ve(He(t.pluginData));
  return s && i.push({ ...n, ...s }), i;
}
function vt(e) {
  if (!e) return;
  const t = e.indexOf(":");
  if (t === -1) return e;
  if (e.slice(0, t) === ue)
    return e.slice(t + 1);
}
function ja(e) {
  return !e.moduleId || e.moduleId === Se || e.moduleId === ue;
}
function Ha(e, t) {
  return (!e || e === "settings-hub") && t === "payment-settings" ? "stripe" : t;
}
function Va(e) {
  for (const t of Wa(e)) {
    if (!ja(t)) continue;
    const n = vt(t.sectionId);
    if (t.sectionId && !n) continue;
    const i = vt(t.defaultTabId ?? t.tabId);
    if (!i) continue;
    const s = Ha(n, i);
    if ((n ? qe.filter((r) => r.id === n) : qe).some((r) => r.tabs.some((c) => c.id === s)))
      return s;
  }
}
const ei = {
  id: Se,
  name: "Cedros Pay",
  version: Jt,
  // The host resolves a loaded runtime admin module by manifest.extensionId +
  // manifest.moduleId; without this the host shows "Admin bundle not loaded".
  // Shares the single declared admin-module manifest (see ./extension/adminModules).
  manifest: Vt,
  sections: qe.map((e) => ({
    id: e.id,
    label: e.label,
    icon: Fa[e.id],
    group: e.group,
    order: e.order,
    requiredPermission: "cedros-pay:admin"
  })),
  groups: qt.map((e) => ({
    id: e.id,
    label: e.label,
    order: e.order,
    defaultCollapsed: e.defaultCollapsed
  })),
  components: {
    transactions: gt(
      () => import("./TransactionsHubSection-qun7lZf8.mjs").then((e) => ({ default: e.TransactionsHubSection }))
    ),
    catalog: gt(
      () => import("./CatalogSection-aQ2bvcWD.mjs").then((e) => ({ default: e.CatalogSection }))
    ),
    "settings-hub": Da(Ta)
  },
  contributions: {
    dashboardCards: [
      {
        id: Yt,
        Component: Ra,
        order: 20
      }
    ],
    custom: {
      cedrosShop: {
        commerceAnalytics: Ht
      }
    }
  },
  createPluginContext(e) {
    const t = ce(
      e,
      de.cedrosPay
    ), n = ce(
      e,
      de.cedrosLogin
    ), i = ce(e, de.org), s = $a(t, n), o = t?.locale || n?.locale || e.locale, r = Va(e);
    return {
      serverUrl: s,
      locale: o ? Kt(o) : void 0,
      userId: n?.user?.id,
      getAccessToken: () => n?.getAccessToken?.() ?? null,
      hasPermission: (c) => this.checkPermission?.(c, e) ?? !1,
      orgId: i?.orgId,
      dependencies: {
        cedrosBalanceInstalled: Ma(e)
      },
      pluginData: {
        walletAddress: t?.walletAddress,
        ...r ? { defaultTabId: r } : {}
      }
    };
  },
  checkPermission(e, t) {
    const n = ce(t, de.org);
    return Ba(n?.role) ? !0 : Ua(n, e);
  },
  cssNamespace: "cedros-dashboard"
};
export {
  Dn as A,
  Re as D,
  ve as E,
  Xe as F,
  M as I,
  ze as L,
  En as M,
  dt as N,
  Ge as S,
  Za as T,
  wa as a,
  Xa as b,
  ei as c,
  Qa as d,
  ne as e,
  Ze as f,
  Rn as g,
  De as h,
  tn as i,
  nn as j,
  Tt as k,
  j as l,
  ka as p,
  xe as r,
  Pt as u
};
