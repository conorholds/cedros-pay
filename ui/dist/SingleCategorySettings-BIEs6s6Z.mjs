import { jsxs as o, jsx as t, Fragment as U } from "react/jsx-runtime";
import { useState as k, useEffect as V, useMemo as H, useCallback as I } from "react";
import { $ as T, a2 as Z, a0 as Q, a7 as ee } from "./index-C1hbnxn0.mjs";
import { u as te } from "./useAutosave-YwMqRzqy.mjs";
import { A as re } from "./AutosaveIndicator-B3T328jH.mjs";
import { S as O } from "./CedrosContext-BnJ2Cf7R.mjs";
import { PublicKey as ie } from "@solana/web3.js";
class ne {
  constructor(s, d, n) {
    this._serverUrl = s, this.auth = d, this.authManager = n;
  }
  /** Server URL passed at construction (retained for API compatibility). */
  get serverUrl() {
    return this._serverUrl;
  }
  async fetch(s, d = {}) {
    if (this.authManager?.isAuthenticated())
      return this.authManager.fetchWithAuth(s, d);
    throw this.auth ? new Error(
      "Legacy AdminAuth is no longer supported due to replay vulnerability. Use IAdminAuthManager instead."
    ) : new Error(
      "Admin authentication required. Provide an IAdminAuthManager to ConfigApi."
    );
  }
  /** List all config categories */
  async listCategories(s = 100) {
    return this.fetch(`/admin/config?limit=${s}`);
  }
  /** Get config for a category */
  async getConfig(s, d = !0) {
    return this.fetch(`/admin/config/${s}?redact_secrets=${d}`);
  }
  /** Full update - replace entire category config */
  async updateConfig(s, d, n) {
    await this.fetch(`/admin/config/${s}`, {
      method: "PUT",
      body: JSON.stringify({ config: d, description: n })
    });
  }
  /** Partial update - update specific keys */
  async patchConfig(s, d, n) {
    await this.fetch(`/admin/config/${s}`, {
      method: "PATCH",
      body: JSON.stringify({ updates: d, description: n })
    });
  }
  /** Batch update multiple categories */
  async batchUpdate(s) {
    await this.fetch("/admin/config/batch", {
      method: "POST",
      body: JSON.stringify({ updates: s })
    });
  }
  /** Validate config before saving */
  async validateConfig(s, d) {
    return this.fetch("/admin/config/validate", {
      method: "POST",
      body: JSON.stringify({ category: s, config: d })
    });
  }
  /** Get config change history */
  async getHistory(s, d = 50) {
    const n = new URLSearchParams({ limit: d.toString() });
    return s && n.set("category", s), this.fetch(`/admin/config/history?${n}`);
  }
}
const L = {
  server: {
    label: "Server",
    secrets: [],
    icon: "🖥️",
    fields: {
      admin_metrics_api_key: { hidden: !0 },
      // Moved to metrics tab
      cors_allowed_origins: { hidden: !0 }
      // Moved to security tab
    }
  },
  security: {
    label: "Security",
    description: "Configure CORS, rate limiting, and other security settings",
    secrets: [],
    icon: "🔒",
    fields: {
      cors_allowed_origins: {
        description: 'List of allowed origins for CORS requests. Use ["*"] to allow all origins (not recommended for production).'
      }
    }
  },
  metrics: {
    label: "Metrics",
    description: "Configure metrics collection and API access",
    secrets: ["admin_metrics_api_key"],
    icon: "📊",
    fields: {
      admin_metrics_api_key: {
        description: "API key for accessing the admin metrics endpoint. Keep this secret."
      }
    }
  },
  logging: {
    label: "Logging",
    secrets: [],
    icon: "📝",
    fields: {
      level: { type: "dropdown", options: ["trace", "debug", "info", "warn", "error"] },
      format: { hidden: !0 },
      // Developer setting
      environment: { hidden: !0 }
      // Developer setting
    }
  },
  stripe: {
    label: "Stripe",
    secrets: ["secret_key", "webhook_secret"],
    icon: "💳",
    fields: {
      enabled: { hidden: !0 },
      // Shown in header toggle
      secret_key: {
        description: "Stripe Dashboard → Developers → API keys → Secret key. Use the test key (sk_test_...) for testing, or the live key (sk_live_...) for production."
      },
      publishable_key: {
        description: "Stripe Dashboard → Developers → API keys → Publishable key. Starts with pk_test_... or pk_live_..."
      },
      mode: {
        type: "dropdown",
        options: ["test", "live"],
        description: 'Use "test" mode with test API keys during development, then switch to "live" with live keys for real payments.'
      },
      webhook_url: {
        description: "The full URL Stripe sends webhook events to. Default is your server URL + /webhook/stripe (e.g. https://example.com/webhook/stripe). Only change this if you've customized the route in your cedros-pay server."
      },
      webhook_secret: {
        description: `Stripe Dashboard → Developers → Webhooks → "Create an event destination" → select events: checkout.session.completed, customer.subscription.created, customer.subscription.updated, customer.subscription.deleted, invoice.paid, invoice.payment_failed → Continue → choose "Webhook endpoint" → enter your server's webhook endpoint, e.g. https://example.com/webhook/stripe (your server URL + /webhook/stripe) → after creating, click the endpoint and "Click to reveal" the signing secret. Starts with whsec_...`
      },
      tax_rate_id: {
        description: `Stripe Dashboard → More → Product catalog → Tax rates → "+ New" → set the percentage, region, and whether tax is inclusive or exclusive → Save → copy the tax rate ID from the detail page (starts with txr_...). Leave empty if you don't collect tax.`
      },
      success_url: { hidden: !0 },
      // Library provides default pages
      cancel_url: { hidden: !0 }
      // Library provides default pages
    }
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
        description: "The Solana wallet address where payments are received. This is where customer funds are sent."
      },
      token_mint: {
        type: "token_mint",
        description: "The SPL token used for payments. Most commonly USDC."
      },
      token_decimals: {
        type: "number",
        description: "Number of decimal places for the token (e.g., USDC has 6 decimals).",
        hidden: !0
        // Managed by token_mint selector
      },
      custom_token_symbol: {
        description: 'Display symbol for your custom token (e.g., "MYTOKEN").',
        hidden: !0
        // Managed by token_mint selector
      },
      custom_token_icon: {
        description: "URL to your token's icon image.",
        hidden: !0
        // Managed by token_mint selector
      },
      rpc_url: {
        description: "Custom Solana RPC endpoint. Leave empty to use the default public RPC."
      },
      gasless_enabled: {
        type: "toggle",
        description: "When enabled, your server pays transaction fees so customers don't need SOL."
      },
      server_wallets: {
        type: "secret_array",
        description: "Server keypair(s) used to sign and pay for transactions. Required for gasless payments.",
        showWhen: "gasless_enabled"
      },
      rounding_mode: {
        type: "dropdown",
        options: ["nearest", "up", "down"],
        description: "How to round fractional token amounts: nearest (default), up (always round up), or down (always round down)."
      },
      network: { hidden: !0 },
      ws_url: { hidden: !0 },
      // Derived from rpc_url
      skip_preflight: { hidden: !0 },
      // Always false; not a user decision
      commitment: { hidden: !0 },
      // Internal Solana parameter
      compute_unit_limit: { hidden: !0 },
      // Internal Solana parameter
      compute_unit_price: { hidden: !0 }
      // Internal Solana parameter
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
  email: {
    label: "Email",
    description: "Email receipts for customers after purchase",
    secrets: ["smtp_password"],
    icon: "📧",
    fields: {
      enabled: { hidden: !0 },
      // Shown in header toggle
      provider: {
        type: "dropdown",
        options: ["sendgrid", "mailgun", "postmark", "ses", "resend", "custom"],
        description: "Email service provider."
      },
      smtp_host: {
        description: "SMTP server hostname.",
        showWhen: "provider"
      },
      smtp_port: {
        type: "number",
        description: "SMTP server port (typically 587 for TLS).",
        showWhen: "provider"
      },
      smtp_user: {
        description: "SMTP authentication username or API key name.",
        showWhen: "provider"
      },
      smtp_password: {
        description: "SMTP password or API key.",
        showWhen: "provider"
      },
      from_address: {
        description: "Sender email address (e.g., orders@yourstore.com)."
      },
      from_name: {
        description: 'Sender display name (e.g., "Your Store").'
      }
    }
  },
  webhook: {
    label: "Webhook",
    description: "HTTP notifications when purchases occur",
    secrets: ["secret"],
    icon: "🔔",
    fields: {
      enabled: { hidden: !0 },
      // Shown in header toggle
      url: {
        description: "URL to receive POST notifications (e.g., https://api.yoursite.com/webhooks/orders)."
      },
      secret: {
        description: "Shared secret for HMAC-SHA256 signature verification."
      },
      retry_attempts: {
        type: "number",
        description: "Number of retry attempts on failure (default: 3)."
      }
    }
  },
  messaging: {
    label: "Messaging",
    description: "Email and webhook notifications for purchases",
    secrets: ["smtp_password", "webhook_secret"],
    icon: "📬",
    fields: {
      // Email settings
      email_enabled: {
        type: "boolean",
        description: "Send order confirmation emails to customers."
      },
      smtp_host: {
        description: "SMTP server hostname.",
        showWhen: "email_enabled"
      },
      smtp_port: {
        type: "number",
        description: "SMTP server port (typically 587 for TLS).",
        showWhen: "email_enabled"
      },
      smtp_username: {
        description: "SMTP authentication username or API key.",
        showWhen: "email_enabled"
      },
      smtp_password: {
        description: "SMTP password or API key.",
        showWhen: "email_enabled"
      },
      from_email: {
        description: "Sender email address (e.g., orders@yourstore.com).",
        showWhen: "email_enabled"
      },
      from_name: {
        description: 'Sender display name (e.g., "Your Store").',
        showWhen: "email_enabled"
      },
      // Webhook settings
      webhook_enabled: {
        type: "boolean",
        description: "Send webhook notifications when purchases complete."
      },
      webhook_url: {
        description: "URL to receive POST notifications.",
        showWhen: "webhook_enabled"
      },
      webhook_secret: {
        description: "Shared secret for HMAC-SHA256 signature verification.",
        showWhen: "webhook_enabled"
      },
      webhook_timeout: {
        type: "number",
        description: "Request timeout in seconds (default: 30).",
        showWhen: "webhook_enabled"
      }
    }
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
    label: "Rate Limiting",
    secrets: [],
    icon: "⏱️"
  },
  circuit_breaker: {
    label: "Circuit Breaker",
    secrets: [],
    icon: "🔌"
  },
  admin: {
    label: "Admin Keys",
    secrets: [],
    icon: "👤"
  },
  api_keys: {
    label: "API Keys",
    secrets: [],
    icon: "🔐"
  },
  cedros_login: {
    label: "Cedros Login",
    secrets: ["api_key"],
    icon: "🔑",
    fields: {
      enabled: { hidden: !0 },
      // Shown in header toggle
      credits_enabled: { hidden: !0 },
      // Shown in header toggle when relevant
      base_url: { hidden: !0 },
      // Deployment setting
      timeout: { hidden: !0 },
      // Developer setting
      jwt_issuer: { hidden: !0 },
      // Internal auth config
      jwt_audience: { hidden: !0 }
      // Internal auth config
    }
  },
  shop: {
    label: "Storefront",
    description: "Product pages & display settings",
    secrets: [],
    icon: "🏪",
    fields: {
      enabled: { hidden: !0 },
      // Shown in StorefrontSection header toggle
      "relatedProducts.mode": {
        type: "dropdown",
        options: ["most_recent", "by_category", "manual", "ai"]
      },
      "relatedProducts.maxItems": { type: "number" }
    }
  }
};
function G(b, s) {
  return L[b]?.secrets.includes(s) ?? !1;
}
const z = "[REDACTED]";
function B(b) {
  if (!b || b.trim() === "")
    return { valid: !0 };
  try {
    return new ie(b.trim()), { valid: !0 };
  } catch {
    return { valid: !1, error: "Invalid Solana address" };
  }
}
function oe({
  label: b,
  value: s,
  onChange: d,
  decimals: n,
  onDecimalsChange: S,
  disabled: c = !1,
  description: l,
  customSymbol: m = "",
  customIcon: h = "",
  onCustomSymbolChange: p,
  onCustomIconChange: g
}) {
  const [w, A] = k(!1), f = Object.entries(O), _ = !!O[s], x = w || !!s && !_, C = (e) => {
    if (e === "custom")
      A(!0), _ && d("");
    else {
      A(!1), d(e);
      const i = O[e];
      i && S && S(i.decimals), p && p(""), g && g("");
    }
  };
  return /* @__PURE__ */ o("div", { className: "cedros-admin__field", children: [
    /* @__PURE__ */ t("label", { className: "cedros-admin__field-label", children: b }),
    /* @__PURE__ */ o("div", { style: { display: "flex", flexDirection: "column", gap: "0.5rem" }, children: [
      /* @__PURE__ */ o("div", { style: { display: "flex", flexWrap: "wrap", gap: "0.5rem" }, children: [
        f.map(([e, i]) => /* @__PURE__ */ o(
          "button",
          {
            type: "button",
            onClick: () => C(e),
            disabled: c,
            style: {
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 0.75rem",
              border: s === e ? "2px solid var(--cedros-admin-primary, #171717)" : "1px solid var(--cedros-admin-border, #d4d4d4)",
              borderRadius: "0.5rem",
              background: s === e ? "var(--cedros-admin-primary-bg, #f5f5f5)" : "var(--cedros-admin-bg, #fff)",
              cursor: c ? "not-allowed" : "pointer",
              opacity: c ? 0.5 : 1,
              fontWeight: s === e ? 600 : 400
            },
            children: [
              /* @__PURE__ */ t(
                "img",
                {
                  src: i.icon,
                  alt: i.symbol,
                  style: { width: 20, height: 20, borderRadius: "50%" },
                  onError: (r) => {
                    r.target.style.display = "none";
                  }
                }
              ),
              /* @__PURE__ */ t("span", { children: i.symbol })
            ]
          },
          e
        )),
        /* @__PURE__ */ o(
          "button",
          {
            type: "button",
            onClick: () => C("custom"),
            disabled: c,
            style: {
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 0.75rem",
              border: x ? "2px solid var(--cedros-admin-primary, #171717)" : "1px solid var(--cedros-admin-border, #d4d4d4)",
              borderRadius: "0.5rem",
              background: x ? "var(--cedros-admin-primary-bg, #f5f5f5)" : "var(--cedros-admin-bg, #fff)",
              cursor: c ? "not-allowed" : "pointer",
              opacity: c ? 0.5 : 1,
              fontWeight: x ? 600 : 400
            },
            children: [
              /* @__PURE__ */ t("span", { style: { fontSize: "1rem" }, children: "+" }),
              /* @__PURE__ */ t("span", { children: "Custom" })
            ]
          }
        )
      ] }),
      x && /* @__PURE__ */ o("div", { style: {
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        padding: "1rem",
        background: "var(--cedros-admin-bg-muted, #f9fafb)",
        borderRadius: "0.5rem",
        border: "1px solid var(--cedros-admin-border, #e5e7eb)"
      }, children: [
        /* @__PURE__ */ o("div", { children: [
          /* @__PURE__ */ t("label", { style: {
            display: "block",
            fontSize: "0.75rem",
            fontWeight: 500,
            marginBottom: "0.25rem",
            color: "var(--cedros-admin-text-muted, #64748b)"
          }, children: "Token Mint Address" }),
          (() => {
            const e = B(s);
            return /* @__PURE__ */ o(U, { children: [
              /* @__PURE__ */ t(
                "input",
                {
                  type: "text",
                  className: `cedros-admin__input ${e.valid ? "" : "cedros-admin__input--error"}`,
                  value: s,
                  onChange: (i) => d(i.target.value),
                  placeholder: "e.g., EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
                  disabled: c,
                  style: {
                    fontFamily: "monospace",
                    fontSize: "0.875rem",
                    borderColor: e.valid ? void 0 : "var(--cedros-admin-error, #dc2626)"
                  }
                }
              ),
              !e.valid && /* @__PURE__ */ t("span", { style: { color: "var(--cedros-admin-error, #dc2626)", fontSize: "0.75rem", marginTop: "0.25rem", display: "block" }, children: e.error })
            ] });
          })()
        ] }),
        /* @__PURE__ */ o("div", { children: [
          /* @__PURE__ */ t("label", { style: {
            display: "block",
            fontSize: "0.75rem",
            fontWeight: 500,
            marginBottom: "0.25rem",
            color: "var(--cedros-admin-text-muted, #64748b)"
          }, children: "Token Symbol" }),
          /* @__PURE__ */ t(
            "input",
            {
              type: "text",
              className: "cedros-admin__input",
              value: m,
              onChange: (e) => p?.(e.target.value),
              placeholder: "e.g., MYTOKEN",
              disabled: c,
              style: { textTransform: "uppercase" }
            }
          )
        ] }),
        /* @__PURE__ */ o("div", { children: [
          /* @__PURE__ */ t("label", { style: {
            display: "block",
            fontSize: "0.75rem",
            fontWeight: 500,
            marginBottom: "0.25rem",
            color: "var(--cedros-admin-text-muted, #64748b)"
          }, children: "Token Icon URL" }),
          /* @__PURE__ */ o("div", { style: { display: "flex", gap: "0.5rem", alignItems: "center" }, children: [
            /* @__PURE__ */ t(
              "input",
              {
                type: "text",
                className: "cedros-admin__input",
                value: h,
                onChange: (e) => g?.(e.target.value),
                placeholder: "https://example.com/token-logo.png",
                disabled: c,
                style: { flex: 1 }
              }
            ),
            h && /* @__PURE__ */ t(
              "img",
              {
                src: h,
                alt: "Token icon preview",
                style: {
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  border: "1px solid var(--cedros-admin-border, #e5e7eb)",
                  objectFit: "cover"
                },
                onError: (e) => {
                  e.target.style.display = "none";
                }
              }
            )
          ] }),
          /* @__PURE__ */ t("div", { style: {
            fontSize: "0.7rem",
            color: "var(--cedros-admin-text-muted, #94a3b8)",
            marginTop: "0.25rem"
          }, children: "Shown to customers during checkout" })
        ] }),
        /* @__PURE__ */ o("div", { children: [
          /* @__PURE__ */ t("label", { style: {
            display: "block",
            fontSize: "0.75rem",
            fontWeight: 500,
            marginBottom: "0.25rem",
            color: "var(--cedros-admin-text-muted, #64748b)"
          }, children: "Token Decimals" }),
          /* @__PURE__ */ t(
            "input",
            {
              type: "number",
              className: "cedros-admin__input",
              value: n ?? 6,
              onChange: (e) => S?.(parseInt(e.target.value, 10) || 0),
              min: 0,
              max: 18,
              disabled: c,
              style: { width: "100px" }
            }
          ),
          /* @__PURE__ */ t("div", { style: {
            fontSize: "0.7rem",
            color: "var(--cedros-admin-text-muted, #94a3b8)",
            marginTop: "0.25rem"
          }, children: "Most SPL tokens use 6 decimals (like USDC)" })
        ] })
      ] }),
      s && _ && /* @__PURE__ */ t("div", { style: {
        fontSize: "0.75rem",
        color: "var(--cedros-admin-text-muted, #64748b)",
        fontFamily: "monospace",
        wordBreak: "break-all"
      }, children: s }),
      l && /* @__PURE__ */ t("div", { style: {
        fontSize: "0.75rem",
        color: "var(--cedros-admin-text-muted, #64748b)",
        marginTop: "0.25rem"
      }, children: l })
    ] })
  ] });
}
function se({
  label: b,
  value: s,
  onChange: d,
  disabled: n = !1,
  description: S
}) {
  const [c, l] = k(/* @__PURE__ */ new Set()), [m, h] = k(null), [p, g] = k(""), w = Array.isArray(s) ? s : [], A = (e) => {
    l((i) => {
      const r = new Set(i);
      return r.has(e) ? r.delete(e) : r.add(e), r;
    });
  }, f = () => {
    d([...w, ""]), h(w.length), g("");
  }, P = (e, i) => {
    const r = [...w];
    r[e] = i, d(r);
  }, _ = (e) => {
    const i = w.filter((r, y) => y !== e);
    d(i), l((r) => {
      const y = /* @__PURE__ */ new Set();
      return r.forEach((v) => {
        v < e ? y.add(v) : v > e && y.add(v - 1);
      }), y;
    });
  }, R = (e) => {
    h(e), g(w[e] || "");
  }, x = () => {
    m !== null && (P(m, p), h(null), g(""));
  }, C = () => {
    m !== null && w[m] === "" && _(m), h(null), g("");
  };
  return /* @__PURE__ */ o("div", { className: "cedros-admin__field", children: [
    /* @__PURE__ */ o("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }, children: [
      /* @__PURE__ */ t("label", { className: "cedros-admin__field-label", style: { marginBottom: 0 }, children: b }),
      /* @__PURE__ */ o(
        "button",
        {
          type: "button",
          onClick: f,
          disabled: n,
          style: {
            display: "flex",
            alignItems: "center",
            gap: "0.25rem",
            padding: "0.25rem 0.5rem",
            fontSize: "0.75rem",
            border: "1px solid var(--cedros-admin-border, #d4d4d4)",
            borderRadius: "0.375rem",
            background: "var(--cedros-admin-bg, #fff)",
            cursor: n ? "not-allowed" : "pointer",
            opacity: n ? 0.5 : 1
          },
          children: [
            T.plus,
            "Add"
          ]
        }
      )
    ] }),
    /* @__PURE__ */ o("div", { style: { display: "flex", flexDirection: "column", gap: "0.5rem" }, children: [
      w.length === 0 && /* @__PURE__ */ t("div", { style: {
        padding: "1rem",
        textAlign: "center",
        color: "var(--cedros-admin-text-muted, #64748b)",
        fontSize: "0.875rem",
        border: "1px dashed var(--cedros-admin-border, #d4d4d4)",
        borderRadius: "0.5rem"
      }, children: 'No items. Click "Add" to create one.' }),
      w.map((e, i) => {
        const r = c.has(i), y = m === i, v = e === z;
        return /* @__PURE__ */ t(
          "div",
          {
            style: {
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem",
              background: "var(--cedros-admin-bg-muted, #f9fafb)",
              borderRadius: "0.375rem",
              border: "1px solid var(--cedros-admin-border, #e5e7eb)"
            },
            children: y ? /* @__PURE__ */ o(U, { children: [
              /* @__PURE__ */ t(
                "input",
                {
                  type: "text",
                  className: "cedros-admin__input",
                  value: p,
                  onChange: (a) => g(a.target.value),
                  placeholder: "Enter wallet keypair...",
                  autoFocus: !0,
                  style: { flex: 1, fontFamily: "monospace", fontSize: "0.75rem" },
                  onKeyDown: (a) => {
                    a.key === "Enter" && x(), a.key === "Escape" && C();
                  }
                }
              ),
              /* @__PURE__ */ t(
                "button",
                {
                  type: "button",
                  onClick: x,
                  style: {
                    padding: "0.375rem",
                    border: "none",
                    background: "var(--cedros-admin-success, #22c55e)",
                    color: "#fff",
                    borderRadius: "0.25rem",
                    cursor: "pointer"
                  },
                  title: "Save",
                  children: T.check
                }
              ),
              /* @__PURE__ */ t(
                "button",
                {
                  type: "button",
                  onClick: C,
                  style: {
                    padding: "0.375rem",
                    border: "none",
                    background: "var(--cedros-admin-text-muted, #64748b)",
                    color: "#fff",
                    borderRadius: "0.25rem",
                    cursor: "pointer"
                  },
                  title: "Cancel",
                  children: T.close
                }
              )
            ] }) : /* @__PURE__ */ o(U, { children: [
              /* @__PURE__ */ t("div", { style: {
                flex: 1,
                fontFamily: "monospace",
                fontSize: "0.75rem",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              }, children: r && !v ? e : v ? "[REDACTED]" : "••••••••••••••••••••" }),
              /* @__PURE__ */ t(
                "button",
                {
                  type: "button",
                  onClick: () => A(i),
                  disabled: n || v,
                  style: {
                    padding: "0.375rem",
                    border: "none",
                    background: "transparent",
                    cursor: n || v ? "not-allowed" : "pointer",
                    opacity: n || v ? 0.5 : 1,
                    color: "var(--cedros-admin-text-muted, #64748b)"
                  },
                  title: r ? "Hide" : "Show",
                  children: r ? T.eyeOff : T.eye
                }
              ),
              /* @__PURE__ */ t(
                "button",
                {
                  type: "button",
                  onClick: () => R(i),
                  disabled: n,
                  style: {
                    padding: "0.375rem",
                    border: "none",
                    background: "transparent",
                    cursor: n ? "not-allowed" : "pointer",
                    opacity: n ? 0.5 : 1,
                    color: "var(--cedros-admin-text-muted, #64748b)"
                  },
                  title: "Edit",
                  children: T.settings
                }
              ),
              /* @__PURE__ */ t(
                "button",
                {
                  type: "button",
                  onClick: () => _(i),
                  disabled: n,
                  style: {
                    padding: "0.375rem",
                    border: "none",
                    background: "transparent",
                    cursor: n ? "not-allowed" : "pointer",
                    opacity: n ? 0.5 : 1,
                    color: "var(--cedros-admin-error, #ef4444)"
                  },
                  title: "Delete",
                  children: T.trash
                }
              )
            ] })
          },
          i
        );
      })
    ] }),
    S && /* @__PURE__ */ t("div", { style: {
      fontSize: "0.75rem",
      color: "var(--cedros-admin-text-muted, #64748b)",
      marginTop: "0.5rem"
    }, children: S })
  ] });
}
function J(b, s, d) {
  const n = G(b, s), S = s.replace(/_/g, " ").replace(/\b\w/g, (h) => h.toUpperCase()), l = L[b]?.fields?.[s], m = {
    isSecret: n,
    label: S,
    description: l?.description,
    hidden: l?.hidden,
    showWhen: l?.showWhen
  };
  return l?.type === "dropdown" && l.options ? { ...m, type: "dropdown", options: l.options } : l?.type === "token_mint" ? { ...m, type: "token_mint" } : l?.type === "toggle" ? { ...m, type: "toggle" } : l?.type === "secret_array" ? { ...m, type: "secret_array", isSecret: !0 } : l?.type === "solana_address" ? { ...m, type: "solana_address" } : l?.type === "number" ? { ...m, type: "number", unit: l.unit } : typeof d == "boolean" ? { ...m, type: "boolean" } : typeof d == "number" ? { ...m, type: "number", unit: l?.unit } : Array.isArray(d) ? { ...m, type: "array" } : typeof d == "object" && d !== null ? { ...m, type: "object" } : { ...m, type: "string" };
}
function ae({
  category: b,
  config: s,
  originalConfig: d,
  isLoading: n = !1,
  onSave: S
}) {
  const [c, l] = k(s), [m, h] = k(/* @__PURE__ */ new Set());
  V(() => {
    l(s);
  }, [s]);
  const p = H(() => {
    const e = { ...c };
    for (const i of Object.keys(e))
      if (G(b, i)) {
        const r = d[i], y = e[i];
        (y === z || y === r) && (e[i] = z);
      }
    return e;
  }, [c, d, b]), g = H(() => {
    const e = c.token_mint;
    return typeof e != "string" || !e ? !1 : !B(e).valid;
  }, [c]), { status: w, error: A } = te({
    data: p,
    onSave: S,
    debounceMs: 1500,
    enabled: !g
  }), f = I((e, i) => {
    l((r) => ({ ...r, [e]: i }));
  }, []), P = I((e) => {
    h((i) => {
      const r = new Set(i);
      return r.has(e) ? r.delete(e) : r.add(e), r;
    });
  }, []), _ = (e) => e ? /* @__PURE__ */ t("div", { style: {
    fontSize: "0.75rem",
    color: "var(--cedros-admin-text-muted, #64748b)",
    marginTop: "0.25rem"
  }, children: e }) : null, R = (e, i) => {
    const r = J(b, e, d[e] ?? i);
    if (r.type === "dropdown" && r.options)
      return /* @__PURE__ */ t(
        Z,
        {
          value: i,
          onChange: (a) => f(e, a),
          options: r.options.map((a) => ({ value: a, label: a })),
          label: r.label,
          description: r.description,
          disabled: n
        }
      );
    if (r.type === "token_mint")
      return /* @__PURE__ */ t(
        oe,
        {
          label: r.label,
          value: i,
          onChange: (a) => f(e, a),
          decimals: c.token_decimals ?? 6,
          onDecimalsChange: (a) => f("token_decimals", a),
          disabled: n,
          description: r.description,
          customSymbol: c.custom_token_symbol || "",
          customIcon: c.custom_token_icon || "",
          onCustomSymbolChange: (a) => f("custom_token_symbol", a),
          onCustomIconChange: (a) => f("custom_token_icon", a)
        }
      );
    if (r.type === "toggle")
      return /* @__PURE__ */ o("div", { className: "cedros-admin__field", children: [
        /* @__PURE__ */ o("div", { style: { display: "flex", alignItems: "center", gap: "0.75rem" }, children: [
          /* @__PURE__ */ t(
            "button",
            {
              type: "button",
              role: "switch",
              "aria-checked": i,
              onClick: () => f(e, !i),
              disabled: n,
              style: {
                width: 44,
                height: 24,
                borderRadius: 12,
                border: "none",
                backgroundColor: i ? "var(--cedros-admin-primary, #171717)" : "var(--cedros-admin-border, #d4d4d4)",
                cursor: n ? "not-allowed" : "pointer",
                position: "relative",
                transition: "background-color 0.2s",
                opacity: n ? 0.5 : 1,
                flexShrink: 0
              },
              children: /* @__PURE__ */ t(
                "span",
                {
                  style: {
                    position: "absolute",
                    top: 2,
                    left: i ? 22 : 2,
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    backgroundColor: "#fff",
                    transition: "left 0.2s",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
                  }
                }
              )
            }
          ),
          /* @__PURE__ */ t("span", { className: "cedros-admin__field-label", style: { marginBottom: 0 }, children: r.label })
        ] }),
        _(r.description)
      ] });
    if (r.type === "solana_address") {
      const a = i || "", N = B(a);
      return /* @__PURE__ */ o("div", { className: "cedros-admin__field", children: [
        /* @__PURE__ */ t("label", { className: "cedros-admin__field-label", children: r.label }),
        /* @__PURE__ */ o("div", { style: { position: "relative" }, children: [
          /* @__PURE__ */ t(
            "input",
            {
              type: "text",
              className: `cedros-admin__input ${N.valid ? "" : "cedros-admin__input--error"}`,
              value: a,
              onChange: (M) => f(e, M.target.value),
              disabled: n,
              placeholder: "e.g. 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
              style: {
                width: "100%",
                fontFamily: "monospace",
                fontSize: "0.875rem",
                borderColor: N.valid ? void 0 : "var(--cedros-admin-error, #dc2626)",
                paddingRight: a && N.valid ? "2rem" : void 0
              }
            }
          ),
          a && N.valid && /* @__PURE__ */ t(
            "span",
            {
              style: {
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--cedros-admin-success, #16a34a)",
                fontSize: "1rem"
              },
              title: "Valid Solana address",
              children: "✓"
            }
          )
        ] }),
        !N.valid && /* @__PURE__ */ t("span", { style: { color: "var(--cedros-admin-error, #dc2626)", fontSize: "0.75rem", marginTop: "0.25rem", display: "block" }, children: N.error }),
        _(r.description)
      ] });
    }
    if (r.type === "boolean")
      return /* @__PURE__ */ o("div", { className: "cedros-admin__field", children: [
        /* @__PURE__ */ o("label", { className: "cedros-admin__checkbox", children: [
          /* @__PURE__ */ t(
            "input",
            {
              type: "checkbox",
              checked: i,
              onChange: (a) => f(e, a.target.checked),
              disabled: n
            }
          ),
          r.label
        ] }),
        _(r.description)
      ] });
    if (r.type === "number")
      return /* @__PURE__ */ o("div", { className: "cedros-admin__field", children: [
        /* @__PURE__ */ o("label", { className: "cedros-admin__field-label", children: [
          r.label,
          r.unit && /* @__PURE__ */ o("span", { className: "cedros-admin__field-unit", children: [
            " (",
            r.unit,
            ")"
          ] })
        ] }),
        /* @__PURE__ */ t(
          "input",
          {
            type: "number",
            className: "cedros-admin__input",
            value: i,
            onChange: (a) => f(e, parseFloat(a.target.value) || 0),
            disabled: n
          }
        ),
        _(r.description)
      ] });
    if (r.type === "secret_array")
      return /* @__PURE__ */ t(
        se,
        {
          label: r.label,
          value: i,
          onChange: (a) => f(e, a),
          disabled: n,
          description: r.description
        }
      );
    if (r.type === "array") {
      const a = i;
      return /* @__PURE__ */ o("div", { className: "cedros-admin__field", children: [
        /* @__PURE__ */ t("label", { className: "cedros-admin__field-label", children: r.label }),
        /* @__PURE__ */ t(
          "textarea",
          {
            className: "cedros-admin__textarea",
            value: a.join(`
`),
            onChange: (N) => f(e, N.target.value.split(`
`).filter(Boolean)),
            placeholder: "One item per line",
            rows: 3,
            disabled: n
          }
        ),
        _(r.description)
      ] });
    }
    if (r.type === "object")
      return /* @__PURE__ */ o("div", { className: "cedros-admin__field", children: [
        /* @__PURE__ */ t("label", { className: "cedros-admin__field-label", children: r.label }),
        /* @__PURE__ */ t(
          "textarea",
          {
            className: "cedros-admin__textarea cedros-admin__textarea--mono",
            value: JSON.stringify(i, null, 2),
            onChange: (a) => {
              try {
                f(e, JSON.parse(a.target.value));
              } catch {
              }
            },
            rows: 5,
            disabled: n
          }
        ),
        _(r.description)
      ] });
    const y = m.has(e), v = r.isSecret && !y && i === z ? z : i;
    return /* @__PURE__ */ o("div", { className: "cedros-admin__field", children: [
      /* @__PURE__ */ o("label", { className: "cedros-admin__field-label", children: [
        r.label,
        r.isSecret && /* @__PURE__ */ t("span", { className: "cedros-admin__field-secret", children: " (secret)" })
      ] }),
      /* @__PURE__ */ o("div", { className: "cedros-admin__input-group", children: [
        /* @__PURE__ */ t(
          "input",
          {
            type: r.isSecret && !y ? "password" : "text",
            className: "cedros-admin__input",
            value: v,
            onChange: (a) => f(e, a.target.value),
            disabled: n,
            placeholder: r.isSecret ? "••••••••" : ""
          }
        ),
        r.isSecret && /* @__PURE__ */ t(
          "button",
          {
            type: "button",
            className: "cedros-admin__button cedros-admin__button--ghost",
            onClick: () => P(e),
            style: { padding: "0.5rem", minWidth: "auto" },
            title: y ? "Hide" : "Show",
            children: y ? T.eyeOff : T.eye
          }
        )
      ] }),
      _(r.description)
    ] });
  }, x = Object.keys(c), C = (e) => {
    const i = J(b, e, d[e] ?? c[e]);
    if (i.hidden || i.showWhen && !c[i.showWhen])
      return !1;
    if (e === "token_decimals") {
      const r = c.token_mint;
      if (r && O[r])
        return !1;
    }
    return !0;
  };
  return /* @__PURE__ */ o("div", { className: "cedros-admin__config-editor", children: [
    /* @__PURE__ */ t("div", { className: "cedros-admin__config-fields", children: x.filter(C).map((e) => /* @__PURE__ */ t("div", { className: "cedros-admin__config-field", children: R(e, c[e]) }, e)) }),
    /* @__PURE__ */ t("div", { className: "cedros-admin__config-actions", children: /* @__PURE__ */ t("div", { className: "cedros-admin__autosave-status", children: /* @__PURE__ */ t(re, { status: w, error: A }) }) })
  ] });
}
function fe({
  serverUrl: b,
  apiKey: s,
  authManager: d,
  category: n,
  title: S,
  description: c,
  enabledField: l = "enabled",
  showEnabledToggle: m = !1
}) {
  const h = H(
    () => new ne(b, void 0, d),
    [b, d]
  ), [p, g] = k(null), [w, A] = k([]), [f, P] = k(!1), [_, R] = k(!0), [x, C] = k(null), [e, i] = k(null), [r, y] = k(!1), v = L[n] || { label: n, icon: "⚙️" }, a = S || v.label, N = c || v.description, M = I(async () => {
    R(!0), C(null);
    try {
      const u = await h.getConfig(n, !0);
      g(u);
    } catch {
      g(null), C("Failed to load settings");
    } finally {
      R(!1);
    }
  }, [h, n]);
  V(() => {
    M();
  }, [M]);
  const j = I(async () => {
    try {
      const u = await h.getHistory(n, 20);
      A(u.history);
    } catch {
      A([]);
    }
  }, [h, n]);
  V(() => {
    f && j();
  }, [f, j]);
  const Y = I(async (u) => {
    await h.updateConfig(n, u, "Updated via admin dashboard"), await M();
  }, [h, n, M]), F = I(async (u) => h.validateConfig(n, u), [h, n]), [W, K] = k(!1), X = I(async () => {
    if (!p || W) return;
    const u = !!p.config[l], D = !u, $ = { ...p.config, [l]: D };
    K(!0), g({ ...p, config: $ });
    try {
      await h.updateConfig(n, $, `${D ? "Enabled" : "Disabled"} via admin dashboard`);
    } catch (q) {
      g({ ...p, config: { ...p.config, [l]: u } }), C(q instanceof Error ? q.message : "Failed to save enabled state");
    } finally {
      K(!1);
    }
  }, [p, h, n, l, W]), E = !!p?.config[l];
  return _ && !p ? /* @__PURE__ */ t("div", { className: "cedros-admin__section", children: /* @__PURE__ */ o("div", { className: "cedros-admin__loading", children: [
    T.loading,
    " Loading ",
    a,
    " settings..."
  ] }) }) : /* @__PURE__ */ o("div", { className: "cedros-admin__section", children: [
    /* @__PURE__ */ t(Q, { message: x, onRetry: M }),
    /* @__PURE__ */ o("div", { className: "cedros-admin__section-header", children: [
      /* @__PURE__ */ o("div", { children: [
        /* @__PURE__ */ o("h3", { className: "cedros-admin__section-title", children: [
          /* @__PURE__ */ t("span", { style: { marginRight: "0.5rem" }, children: v.icon }),
          a
        ] }),
        N && /* @__PURE__ */ t("p", { className: "cedros-admin__text-muted", style: { marginTop: "0.25rem" }, children: N })
      ] }),
      m && p && /* @__PURE__ */ o("div", { style: { display: "flex", alignItems: "center", gap: "0.75rem" }, children: [
        /* @__PURE__ */ t("span", { style: { fontSize: "0.875rem", color: E ? "var(--cedros-admin-text, #171717)" : "var(--cedros-admin-muted, #737373)" }, children: E ? "Enabled" : "Disabled" }),
        /* @__PURE__ */ t(
          "button",
          {
            type: "button",
            role: "switch",
            "aria-checked": E,
            onClick: X,
            disabled: W,
            style: {
              width: 44,
              height: 24,
              borderRadius: 12,
              border: "none",
              backgroundColor: E ? "var(--cedros-admin-primary, #171717)" : "var(--cedros-admin-border, #d4d4d4)",
              cursor: W ? "wait" : "pointer",
              position: "relative",
              transition: "background-color 0.2s",
              flexShrink: 0,
              opacity: W ? 0.6 : 1
            },
            children: /* @__PURE__ */ t(
              "span",
              {
                style: {
                  position: "absolute",
                  top: 2,
                  left: E ? 22 : 2,
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  backgroundColor: "#fff",
                  transition: "left 0.2s",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
                }
              }
            )
          }
        )
      ] })
    ] }),
    p && /* @__PURE__ */ o(
      "div",
      {
        className: "cedros-admin__settings-editor",
        style: {
          marginTop: "1rem",
          opacity: m && !E ? 0.6 : 1,
          pointerEvents: m && !E ? "none" : "auto"
        },
        children: [
          m && !E && /* @__PURE__ */ t(
            "div",
            {
              style: {
                padding: "0.75rem 1rem",
                marginBottom: "1rem",
                backgroundColor: "var(--cedros-admin-warning-bg, #fef3c7)",
                border: "1px solid var(--cedros-admin-warning-border, #f59e0b)",
                borderRadius: "0.375rem",
                fontSize: "0.875rem",
                color: "var(--cedros-admin-warning-text, #92400e)",
                pointerEvents: "auto"
              },
              children: "This payment method is disabled. Enable it using the toggle above to accept payments."
            }
          ),
          /* @__PURE__ */ t(
            ae,
            {
              category: p.category,
              config: p.config,
              originalConfig: p.config,
              onSave: Y,
              onValidate: F
            }
          )
        ]
      }
    ),
    f && /* @__PURE__ */ o("div", { className: "cedros-admin__settings-history", style: { marginTop: "1.5rem" }, children: [
      /* @__PURE__ */ t("h4", { style: { marginBottom: "0.75rem", fontWeight: 600 }, children: "Change History" }),
      w.length === 0 ? /* @__PURE__ */ t("p", { className: "cedros-admin__text-muted", children: "No history entries found." }) : /* @__PURE__ */ t("div", { className: "cedros-admin__settings-timeline", children: w.map((u) => /* @__PURE__ */ o("div", { className: "cedros-admin__settings-timeline-item", children: [
        /* @__PURE__ */ t("div", { className: "cedros-admin__settings-timeline-dot" }),
        /* @__PURE__ */ o("div", { className: "cedros-admin__settings-timeline-content", children: [
          /* @__PURE__ */ o("div", { className: "cedros-admin__settings-timeline-header", children: [
            /* @__PURE__ */ t("code", { children: u.configKey }),
            /* @__PURE__ */ t("span", { className: `cedros-admin__badge cedros-admin__badge--${u.action.toLowerCase()}`, children: u.action })
          ] }),
          /* @__PURE__ */ o("div", { className: "cedros-admin__settings-timeline-meta", children: [
            ee(u.changedAt),
            " by ",
            u.changedBy
          ] })
        ] })
      ] }, u.id)) })
    ] }),
    e && /* @__PURE__ */ t(
      "div",
      {
        style: {
          marginTop: "1rem",
          padding: "0.75rem 1rem",
          borderRadius: "0.375rem",
          backgroundColor: e.valid ? "var(--cedros-admin-success-bg, #dcfce7)" : "var(--cedros-admin-error-bg, #fef2f2)",
          border: `1px solid ${e.valid ? "var(--cedros-admin-success-border, #86efac)" : "var(--cedros-admin-error-border, #fecaca)"}`
        },
        children: /* @__PURE__ */ o("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" }, children: [
          /* @__PURE__ */ o("div", { style: { flex: 1 }, children: [
            /* @__PURE__ */ t("div", { style: {
              fontWeight: 600,
              color: e.valid ? "var(--cedros-admin-success, #16a34a)" : "var(--cedros-admin-error, #dc2626)",
              marginBottom: e.errors.length > 0 || e.warnings.length > 0 ? "0.5rem" : 0
            }, children: e.valid ? "✓ Configuration is valid" : "✗ Validation failed" }),
            e.errors.length > 0 && /* @__PURE__ */ t("ul", { style: { margin: 0, paddingLeft: "1.25rem", color: "var(--cedros-admin-error, #dc2626)", fontSize: "0.875rem" }, children: e.errors.map((u, D) => /* @__PURE__ */ t("li", { children: u }, D)) }),
            e.warnings.length > 0 && /* @__PURE__ */ t("ul", { style: { margin: e.errors.length > 0 ? "0.5rem 0 0" : 0, paddingLeft: "1.25rem", color: "var(--cedros-admin-warning, #ca8a04)", fontSize: "0.875rem" }, children: e.warnings.map((u, D) => /* @__PURE__ */ t("li", { children: u }, D)) })
          ] }),
          /* @__PURE__ */ t(
            "button",
            {
              type: "button",
              onClick: () => i(null),
              style: {
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "0.25rem",
                color: "var(--cedros-admin-text-muted, #64748b)",
                fontSize: "1.25rem",
                lineHeight: 1
              },
              title: "Dismiss",
              children: "×"
            }
          )
        ] })
      }
    ),
    /* @__PURE__ */ o("div", { style: { marginTop: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
      /* @__PURE__ */ t(
        "button",
        {
          type: "button",
          className: "cedros-admin__button cedros-admin__button--ghost cedros-admin__button--sm",
          onClick: () => P(!f),
          children: f ? "Hide History" : "History"
        }
      ),
      /* @__PURE__ */ t(
        "button",
        {
          type: "button",
          className: "cedros-admin__button cedros-admin__button--ghost cedros-admin__button--sm",
          disabled: r || !p,
          onClick: async () => {
            if (p) {
              y(!0), i(null);
              try {
                const u = await F(p.config);
                i(u);
              } catch (u) {
                i({
                  valid: !1,
                  errors: [u instanceof Error ? u.message : "Validation failed"],
                  warnings: []
                });
              } finally {
                y(!1);
              }
            }
          },
          children: r ? "Validating..." : "Validate"
        }
      )
    ] })
  ] });
}
export {
  fe as S
};
