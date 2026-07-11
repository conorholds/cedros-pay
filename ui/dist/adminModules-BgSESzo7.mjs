import { b as y } from "./index-BFt38o8Q.mjs";
import { g as c, b as T, f as p } from "./fetchWithTimeout-D-qpKB_T.mjs";
import { C as E, a as A, b as S, c as I } from "./constants-DA4fMjXZ.mjs";
class b {
  serverUrl;
  walletSigner = null;
  jwtToken = null;
  isAdminUser = !1;
  hostSessionAllowed = !1;
  constructor(e) {
    this.serverUrl = e;
  }
  getAuthMethod() {
    return this.walletSigner?.publicKey && this.walletSigner.signMessage ? "wallet" : this.jwtToken && this.isAdminUser ? "cedros-login" : this.hostSessionAllowed ? "host-session" : "none";
  }
  isAuthenticated() {
    return this.getAuthMethod() !== "none";
  }
  setWalletSigner(e) {
    this.walletSigner = e, c().debug("[AdminAuthManager] Wallet signer updated:", !!e?.publicKey);
  }
  setCedrosLoginAuth(e, s) {
    this.jwtToken = e, this.isAdminUser = s ?? !1, c().debug("[AdminAuthManager] Cedros-login auth updated:", { hasToken: !!e, isAdmin: this.isAdminUser });
  }
  setHostSessionAuth(e) {
    this.hostSessionAllowed = e, c().debug("[AdminAuthManager] Host-session auth updated:", { enabled: e });
  }
  async createAuthHeaders(e) {
    const s = this.getAuthMethod();
    if (s === "wallet")
      return this.createWalletAuthHeaders(e);
    if (s === "cedros-login")
      return this.createJwtAuthHeaders();
    if (s === "host-session")
      return {};
    throw new Error("No admin authentication configured. Connect a wallet or sign in as admin.");
  }
  async createWalletAuthHeaders(e) {
    if (!this.walletSigner?.publicKey || !this.walletSigner.signMessage)
      throw new Error("Wallet not connected or does not support message signing");
    const s = await this.fetchNonce(e), i = new TextEncoder().encode(s.nonce), n = await this.walletSigner.signMessage(i), a = y.encode(this.walletSigner.publicKey.toBytes()), u = T.fromUint8Array(n);
    return {
      "X-Signer": a,
      "X-Message": s.nonce,
      "X-Signature": u
    };
  }
  createJwtAuthHeaders() {
    if (!this.jwtToken)
      throw new Error("No JWT token available");
    return {
      Authorization: `Bearer ${this.jwtToken}`
    };
  }
  canonicalAuthPath(e) {
    const s = e.search(/[?#]/);
    return s === -1 ? e : e.slice(0, s);
  }
  async fetchNonce(e) {
    const s = `${this.serverUrl}/paywall/v1/nonce`, i = typeof e == "string" ? { purpose: e } : { path: this.canonicalAuthPath(e.path), method: e.method.toUpperCase() };
    c().debug("[AdminAuthManager] Fetching nonce:", i);
    const n = await p(s, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(i)
    });
    if (!n.ok) {
      const a = await n.text();
      throw new Error(`Failed to fetch nonce: ${n.status} ${a}`);
    }
    return await n.json();
  }
  async fetchWithAuth(e, s = {}) {
    const i = this.getAuthMethod();
    if (i === "none")
      throw new Error("No admin authentication configured");
    const n = (s.method || "GET").toUpperCase(), a = await this.createAuthHeaders({ path: e, method: n }), u = {
      // Only set Content-Type for methods that typically carry a body
      ...n !== "GET" && n !== "HEAD" ? { "Content-Type": "application/json" } : {},
      ...s.headers || {},
      ...a
    }, f = i === "host-session" ? "include" : "same-origin", r = await p(`${this.serverUrl}${e}`, {
      ...s,
      credentials: s.credentials ?? f,
      headers: u
    });
    if (!r.ok) {
      let d = `Admin API error ${r.status}`;
      try {
        const o = await r.json();
        o && typeof o.error == "string" ? d = o.error : o && typeof o.error?.message == "string" ? d = o.error.message : o && typeof o.message == "string" && (d = o.message);
      } catch {
      }
      throw new Error(d);
    }
    if (r.status !== 204)
      return await r.json();
  }
}
function w(t) {
  if (!t?.isAuthenticated())
    throw new Error("Admin authentication required");
  return t;
}
function h(t, e, s) {
  return w(t).fetchWithAuth(e, s);
}
const m = "custom.cedrosShop.commerceAnalytics", g = {
  bridgeId: m,
  version: 1,
  methods: [
    "getSnapshot",
    "listAbandonedCheckouts",
    "listPaymentEvents",
    "recoverCheckout"
  ],
  endpoints: {
    snapshotPath: "/admin/commerce-analytics",
    recoverPathTemplate: "/admin/commerce-analytics/abandoned-checkouts/{checkoutId}/recover"
  },
  data: {
    abandonedCheckouts: !0,
    paymentEvents: !0,
    recoveryTokens: !1,
    providerPayloads: !1
  }
}, N = {
  ...g,
  createBridge: P
};
function P(t) {
  const e = C(t), s = _(e), i = (n) => h(
    s,
    `/admin/commerce-analytics${v(n)}`
  );
  return {
    bridgeId: m,
    version: 1,
    getSnapshot: i,
    listAbandonedCheckouts: async (n) => (await i(n)).abandonedCheckouts,
    listPaymentEvents: async (n) => (await i(n)).paymentEvents,
    recoverCheckout: async (n) => {
      const a = O(n);
      return h(
        s,
        `/admin/commerce-analytics/abandoned-checkouts/${encodeURIComponent(a)}/recover`,
        { method: "POST" }
      );
    }
  };
}
function C(t) {
  return "pluginContext" in t ? t.pluginContext : t;
}
function _(t) {
  const e = t.hasPermission("cedros-pay:admin") || t.hasPermission("admin"), s = new b(t.serverUrl);
  return s.setCedrosLoginAuth(t.getAccessToken(), e), s.setHostSessionAuth(e), s;
}
function v(t) {
  return t?.limit ? `?${new URLSearchParams({ limit: String(Math.trunc(t.limit)) }).toString()}` : "";
}
function O(t) {
  if (!t || typeof t.checkoutId != "string")
    throw new Error("checkoutId is required");
  const e = t.checkoutId.trim();
  if (!e)
    throw new Error("checkoutId is required");
  return e;
}
const G = [
  // ── Catalog ──
  { id: "products", qualifiedId: "cedros-pay:products", label: "Products", parentId: "catalog", endpoints: ["GET /admin/catalog/readiness", "GET /admin/catalog/exports/{channel}", "GET /admin/catalog/exports/{channel}/validate", "GET /admin/products", "POST /admin/products", "GET /admin/products/{id}", "PUT /admin/products/{id}", "DELETE /admin/products/{id}", "GET /admin/products/stripe-import-preview", "POST /admin/products/import-stripe", "POST /admin/products/{id}/sync-stripe"] },
  { id: "inventory", qualifiedId: "cedros-pay:inventory", label: "Inventory", parentId: "catalog", endpoints: ["PUT /admin/products/{id}/inventory", "POST /admin/products/{id}/inventory/adjust", "GET /admin/products/{id}/inventory/adjustments", "PUT /admin/products/{id}/variants/inventory"] },
  { id: "subscriptions", qualifiedId: "cedros-pay:subscriptions", label: "Subscriptions", parentId: "catalog", endpoints: ["GET /admin/subscriptions/settings", "PUT /admin/subscriptions/settings"] },
  { id: "coupons", qualifiedId: "cedros-pay:coupons", label: "Coupons", parentId: "catalog", endpoints: ["GET /admin/coupons", "POST /admin/coupons", "PUT /admin/coupons/{id}", "DELETE /admin/coupons/{id}"] },
  // ── Transactions ──
  { id: "transactions", qualifiedId: "cedros-pay:transactions", label: "Transactions", parentId: "transactions", endpoints: ["GET /admin/transactions"] },
  { id: "orders", qualifiedId: "cedros-pay:orders", label: "Orders", parentId: "transactions", endpoints: ["GET /admin/orders", "GET /admin/orders/{id}"] },
  { id: "refunds", qualifiedId: "cedros-pay:refunds", label: "Refunds", parentId: "transactions", endpoints: ["GET /admin/refunds", "GET /admin/credits/refund-requests", "GET /admin/stripe/refunds", "POST /admin/stripe/refunds/{id}/process", "POST /admin/refunds/{id}/deny"] },
  { id: "returns", qualifiedId: "cedros-pay:returns", label: "Returns", parentId: "transactions", endpoints: ["GET /admin/returns", "POST /admin/returns", "GET /admin/returns/{id}", "POST /admin/returns/{id}/status"] },
  { id: "disputes", qualifiedId: "cedros-pay:disputes", label: "Disputes", parentId: "transactions", endpoints: ["GET /admin/disputes", "POST /admin/disputes", "GET /admin/disputes/{id}", "POST /admin/disputes/{id}/status"] },
  // ── Extension Settings / Pay hub ──
  { id: "overview", qualifiedId: "cedros-pay:overview", label: "Overview", parentId: "settings-hub", endpoints: ["GET /admin/subscriptions/settings", "PUT /admin/subscriptions/settings", "GET /admin/config/shop", "PATCH /admin/config/shop", "PATCH /admin/config/subscriptions"] },
  { id: "stripe", qualifiedId: "cedros-pay:stripe", label: "Stripe", parentId: "settings-hub", endpoints: ["GET /admin/config/stripe", "PUT /admin/config/stripe"] },
  { id: "crypto", qualifiedId: "cedros-pay:crypto", label: "Crypto", parentId: "settings-hub", endpoints: ["GET /admin/config/x402", "PUT /admin/config/x402"] },
  { id: "credits", qualifiedId: "cedros-pay:credits", label: "Credits", parentId: "settings-hub", endpoints: ["GET /admin/config/cedros_login", "PUT /admin/config/cedros_login"] },
  { id: "content", qualifiedId: "cedros-pay:content", label: "Content", parentId: "settings-hub", endpoints: ["GET /admin/config/x402", "GET /admin/site-settings/tipping", "PUT /admin/site-settings/tipping", "GET /admin/site-settings/monetization", "PUT /admin/site-settings/monetization"] },
  { id: "app_stores", qualifiedId: "cedros-pay:app_stores", label: "App stores", parentId: "settings-hub", endpoints: ["GET /admin/config/native_store", "PUT /admin/config/native_store"] }
];
function l(t) {
  return G.filter((e) => e.parentId === t).map((e) => ({
    id: e.id,
    qualifiedId: e.qualifiedId,
    label: e.label
  }));
}
const M = [
  // ── Monetization group ──
  { id: "catalog", qualifiedId: "cedros-pay:catalog", label: "Catalog", group: "Monetization", order: 0, tabs: l("catalog") },
  { id: "transactions", qualifiedId: "cedros-pay:transactions", label: "Transactions", group: "Monetization", order: 1, tabs: l("transactions") },
  // ── Extension-owned settings group ──
  { id: "settings-hub", qualifiedId: "cedros-pay:settings-hub", label: "Pay hub", group: "Extension Settings", order: 20, tabs: l("settings-hub") }
], U = M.map((t) => t.qualifiedId), H = [
  { id: "Monetization", label: "Monetization", order: 1, defaultCollapsed: !1 },
  { id: "Extension Settings", label: "Extension Settings", order: 8, defaultCollapsed: !1 }
], k = {
  moduleId: I,
  extensionId: S,
  displayName: "Cedros Pay Admin",
  version: A,
  packageName: "@cedros/pay-react",
  packageSubpath: "./admin",
  sectionIds: [...U],
  sectionIcons: {
    "cedros-pay:transactions": "history",
    "cedros-pay:catalog": "extensions",
    "cedros-pay:settings-hub": "security"
  },
  contributions: {
    dashboardCards: [
      {
        id: E,
        displayName: "Cedros Pay Status",
        description: "Shows checkout health and payment activity from safe dashboard analytics.",
        order: 20
      }
    ],
    custom: {
      cedrosShop: {
        commerceAnalytics: g
      }
    }
  }
}, x = [k];
export {
  b as A,
  H as C,
  M as a,
  U as b,
  G as c,
  x as d,
  N as e,
  h as f,
  k as g,
  w as r
};
