import { jsxs as i, jsx as e } from "react/jsx-runtime";
import { useState as m, useCallback as w, useEffect as W } from "react";
import { $ as z, a0 as $ } from "./index-C1hbnxn0.mjs";
import { T as N } from "./Toggle-DAxIdpY4.mjs";
import { u as M } from "./useAutosave-YwMqRzqy.mjs";
import { A as F } from "./AutosaveIndicator-B3T328jH.mjs";
const g = {
  email_enabled: !1,
  smtp_host: "",
  smtp_port: 587,
  smtp_username: "",
  smtp_password: "",
  from_email: "",
  from_name: "",
  webhook_enabled: !1,
  webhook_url: "",
  webhook_secret: "",
  webhook_timeout: 30
};
function U({ serverUrl: _, apiKey: n, authManager: r }) {
  const [l, p] = m("messages"), [s, b] = m(g), [k, S] = m(!0), [x, C] = m(!0), [E, f] = m(null), [h, T] = m(/* @__PURE__ */ new Set()), u = w(async () => {
    try {
      f(null);
      let a;
      const d = "/admin/config/messaging";
      if (r?.isAuthenticated())
        a = await r.fetchWithAuth(d);
      else {
        const t = { "Content-Type": "application/json" };
        n && (t["X-API-Key"] = n);
        const c = await fetch(`${_}${d}`, { headers: t });
        if (!c.ok) throw new Error(`Failed to fetch: ${c.status}`);
        a = await c.json();
      }
      b({ ...g, ...a.config });
    } catch {
      b(g), f("Could not load saved settings. Showing defaults.");
    } finally {
      S(!1), setTimeout(() => C(!1), 100);
    }
  }, [_, n, r]);
  W(() => {
    u();
  }, [u]);
  const A = w(async (a) => {
    const d = "/admin/config/messaging", t = { ...a };
    h.has("smtp_password") || delete t.smtp_password, h.has("webhook_secret") || delete t.webhook_secret;
    const c = JSON.stringify({ config: t });
    try {
      if (r?.isAuthenticated())
        await r.fetchWithAuth(d, { method: "PUT", body: c });
      else {
        const v = { "Content-Type": "application/json" };
        n && (v["X-API-Key"] = n);
        const y = await fetch(`${_}${d}`, { method: "PUT", headers: v, body: c });
        if (!y.ok) throw new Error(`Failed to save: ${y.status}`);
      }
    } catch {
      throw f("Failed to save messaging settings"), new Error("Save failed");
    }
  }, [_, n, r, h]), { status: I, error: P } = M({
    data: s,
    onSave: A,
    debounceMs: 1500,
    enabled: !x
  }), o = (a, d) => {
    (a === "smtp_password" || a === "webhook_secret") && T((t) => new Set(t).add(a)), b((t) => ({ ...t, [a]: d }));
  };
  return k ? /* @__PURE__ */ i("div", { className: "cedros-admin__messaging-settings", children: [
    /* @__PURE__ */ i("div", { className: "cedros-admin__page-header", children: [
      /* @__PURE__ */ e("h2", { className: "cedros-admin__page-title", children: "Store Messages" }),
      /* @__PURE__ */ e("p", { className: "cedros-admin__page-description", children: "Configure email delivery and webhook notifications." })
    ] }),
    /* @__PURE__ */ i("div", { className: "cedros-admin__loading", style: { marginTop: "1rem" }, children: [
      z.loading,
      " Loading message settings..."
    ] })
  ] }) : /* @__PURE__ */ i("div", { className: "cedros-admin__messaging-settings", children: [
    /* @__PURE__ */ i("div", { className: "cedros-admin__page-header", children: [
      /* @__PURE__ */ e("h2", { className: "cedros-admin__page-title", children: "Store Messages" }),
      /* @__PURE__ */ e("p", { className: "cedros-admin__page-description", children: "Configure email delivery and webhook notifications." })
    ] }),
    /* @__PURE__ */ i("div", { className: "cedros-admin__tabs cedros-admin__tabs--line", children: [
      /* @__PURE__ */ e(
        "button",
        {
          type: "button",
          className: `cedros-admin__tab ${l === "messages" ? "cedros-admin__tab--active" : ""}`,
          onClick: () => p("messages"),
          children: "Messages"
        }
      ),
      /* @__PURE__ */ e(
        "button",
        {
          type: "button",
          className: `cedros-admin__tab ${l === "email" ? "cedros-admin__tab--active" : ""}`,
          onClick: () => p("email"),
          children: "Email"
        }
      ),
      /* @__PURE__ */ e(
        "button",
        {
          type: "button",
          className: `cedros-admin__tab ${l === "webhooks" ? "cedros-admin__tab--active" : ""}`,
          onClick: () => p("webhooks"),
          children: "Webhooks"
        }
      ),
      /* @__PURE__ */ e("div", { style: { flex: 1 } }),
      /* @__PURE__ */ e(F, { status: I, error: P })
    ] }),
    /* @__PURE__ */ e($, { message: E, onRetry: u }),
    /* @__PURE__ */ i("div", { className: "cedros-admin__tab-content", style: { marginTop: "1rem" }, children: [
      l === "messages" && /* @__PURE__ */ i("div", { className: "cedros-admin__section", children: [
        /* @__PURE__ */ e("p", { style: { marginBottom: "1.5rem", fontSize: "0.875rem", opacity: 0.7 }, children: "Enable or disable notification types. Configure the delivery settings in the Email or Webhooks tab." }),
        /* @__PURE__ */ i("div", { style: { display: "flex", flexDirection: "column", gap: "1rem" }, children: [
          /* @__PURE__ */ i(
            "div",
            {
              style: {
                display: "flex",
                alignItems: "flex-start",
                gap: "1rem",
                padding: "1rem",
                border: "1px solid var(--cedros-admin-border, #e5e5e5)",
                borderRadius: "0.5rem"
              },
              children: [
                /* @__PURE__ */ e(
                  N,
                  {
                    checked: s.email_enabled,
                    onChange: (a) => o("email_enabled", a)
                  }
                ),
                /* @__PURE__ */ i("div", { style: { flex: 1 }, children: [
                  /* @__PURE__ */ e("div", { style: { fontWeight: 500 }, children: "Email Confirmation" }),
                  /* @__PURE__ */ e("p", { style: { margin: "0.25rem 0 0", fontSize: "0.8125rem", opacity: 0.6 }, children: "Send order confirmation emails to customers after successful purchase." }),
                  /* @__PURE__ */ e("p", { style: { margin: "0.5rem 0 0", fontSize: "0.75rem", opacity: 0.5 }, children: "Requires Email configuration" })
                ] })
              ]
            }
          ),
          /* @__PURE__ */ i(
            "div",
            {
              style: {
                display: "flex",
                alignItems: "flex-start",
                gap: "1rem",
                padding: "1rem",
                border: "1px solid var(--cedros-admin-border, #e5e5e5)",
                borderRadius: "0.5rem"
              },
              children: [
                /* @__PURE__ */ e(
                  N,
                  {
                    checked: s.webhook_enabled,
                    onChange: (a) => o("webhook_enabled", a)
                  }
                ),
                /* @__PURE__ */ i("div", { style: { flex: 1 }, children: [
                  /* @__PURE__ */ e("div", { style: { fontWeight: 500 }, children: "Admin Purchase Notification" }),
                  /* @__PURE__ */ e("p", { style: { margin: "0.25rem 0 0", fontSize: "0.8125rem", opacity: 0.6 }, children: "Send webhook notifications to your server when a purchase is completed." }),
                  /* @__PURE__ */ e("p", { style: { margin: "0.5rem 0 0", fontSize: "0.75rem", opacity: 0.5 }, children: "Requires Webhook configuration" })
                ] })
              ]
            }
          )
        ] })
      ] }),
      l === "email" && /* @__PURE__ */ i("div", { className: "cedros-admin__section", children: [
        /* @__PURE__ */ e("p", { style: { marginBottom: "1.5rem", fontSize: "0.875rem", opacity: 0.7 }, children: "Configure your email provider for sending customer notifications." }),
        !s.email_enabled && /* @__PURE__ */ e(
          "div",
          {
            style: {
              padding: "1rem",
              marginBottom: "1.5rem",
              background: "var(--cedros-admin-bg-accent, #fef3c7)",
              borderRadius: "0.5rem",
              border: "1px solid var(--cedros-admin-warning, #f59e0b)",
              fontSize: "0.875rem"
            },
            children: "Email notifications are disabled. Enable them in the Messages tab."
          }
        ),
        /* @__PURE__ */ i("div", { style: { display: "flex", flexDirection: "column", gap: "1rem", opacity: s.email_enabled ? 1 : 0.5 }, children: [
          /* @__PURE__ */ i("div", { className: "cedros-admin__field", children: [
            /* @__PURE__ */ e("label", { className: "cedros-admin__field-label", children: "SMTP Host" }),
            /* @__PURE__ */ e(
              "input",
              {
                type: "text",
                className: "cedros-admin__input",
                value: s.smtp_host,
                onChange: (a) => o("smtp_host", a.target.value),
                placeholder: "smtp.example.com",
                disabled: !s.email_enabled
              }
            )
          ] }),
          /* @__PURE__ */ i("div", { className: "cedros-admin__field", children: [
            /* @__PURE__ */ e("label", { className: "cedros-admin__field-label", children: "SMTP Port" }),
            /* @__PURE__ */ e(
              "input",
              {
                type: "number",
                className: "cedros-admin__input",
                value: s.smtp_port,
                onChange: (a) => o("smtp_port", parseInt(a.target.value) || 587),
                placeholder: "587",
                disabled: !s.email_enabled,
                style: { maxWidth: 120 }
              }
            )
          ] }),
          /* @__PURE__ */ i("div", { className: "cedros-admin__field", children: [
            /* @__PURE__ */ e("label", { className: "cedros-admin__field-label", children: "SMTP Username" }),
            /* @__PURE__ */ e(
              "input",
              {
                type: "text",
                className: "cedros-admin__input",
                value: s.smtp_username,
                onChange: (a) => o("smtp_username", a.target.value),
                placeholder: "username or API key",
                disabled: !s.email_enabled
              }
            )
          ] }),
          /* @__PURE__ */ i("div", { className: "cedros-admin__field", children: [
            /* @__PURE__ */ e("label", { className: "cedros-admin__field-label", children: "SMTP Password" }),
            /* @__PURE__ */ e(
              "input",
              {
                type: "password",
                className: "cedros-admin__input",
                value: h.has("smtp_password") ? s.smtp_password : "",
                onChange: (a) => o("smtp_password", a.target.value),
                placeholder: s.smtp_password ? "••••••••" : "Enter password",
                disabled: !s.email_enabled
              }
            )
          ] }),
          /* @__PURE__ */ i("div", { className: "cedros-admin__field", children: [
            /* @__PURE__ */ e("label", { className: "cedros-admin__field-label", children: "From Email" }),
            /* @__PURE__ */ e(
              "input",
              {
                type: "email",
                className: "cedros-admin__input",
                value: s.from_email,
                onChange: (a) => o("from_email", a.target.value),
                placeholder: "orders@yourstore.com",
                disabled: !s.email_enabled
              }
            )
          ] }),
          /* @__PURE__ */ i("div", { className: "cedros-admin__field", children: [
            /* @__PURE__ */ e("label", { className: "cedros-admin__field-label", children: "From Name" }),
            /* @__PURE__ */ e(
              "input",
              {
                type: "text",
                className: "cedros-admin__input",
                value: s.from_name,
                onChange: (a) => o("from_name", a.target.value),
                placeholder: "Your Store",
                disabled: !s.email_enabled
              }
            )
          ] })
        ] })
      ] }),
      l === "webhooks" && /* @__PURE__ */ i("div", { className: "cedros-admin__section", children: [
        /* @__PURE__ */ e("p", { style: { marginBottom: "1.5rem", fontSize: "0.875rem", opacity: 0.7 }, children: "Configure webhook endpoint for receiving purchase notifications." }),
        !s.webhook_enabled && /* @__PURE__ */ e(
          "div",
          {
            style: {
              padding: "1rem",
              marginBottom: "1.5rem",
              background: "var(--cedros-admin-bg-accent, #fef3c7)",
              borderRadius: "0.5rem",
              border: "1px solid var(--cedros-admin-warning, #f59e0b)",
              fontSize: "0.875rem"
            },
            children: "Webhook notifications are disabled. Enable them in the Messages tab."
          }
        ),
        /* @__PURE__ */ i("div", { style: { display: "flex", flexDirection: "column", gap: "1rem", opacity: s.webhook_enabled ? 1 : 0.5 }, children: [
          /* @__PURE__ */ i("div", { className: "cedros-admin__field", children: [
            /* @__PURE__ */ e("label", { className: "cedros-admin__field-label", children: "Webhook URL" }),
            /* @__PURE__ */ e(
              "input",
              {
                type: "url",
                className: "cedros-admin__input",
                value: s.webhook_url,
                onChange: (a) => o("webhook_url", a.target.value),
                placeholder: "https://api.yoursite.com/webhooks/orders",
                disabled: !s.webhook_enabled
              }
            )
          ] }),
          /* @__PURE__ */ i("div", { className: "cedros-admin__field", children: [
            /* @__PURE__ */ e("label", { className: "cedros-admin__field-label", children: "Webhook Secret" }),
            /* @__PURE__ */ e(
              "input",
              {
                type: "password",
                className: "cedros-admin__input",
                value: h.has("webhook_secret") ? s.webhook_secret : "",
                onChange: (a) => o("webhook_secret", a.target.value),
                placeholder: s.webhook_secret ? "••••••••" : "Enter secret for HMAC-SHA256",
                disabled: !s.webhook_enabled
              }
            ),
            /* @__PURE__ */ e("p", { style: { margin: "0.25rem 0 0", fontSize: "0.75rem", opacity: 0.6 }, children: "Used for HMAC-SHA256 signature verification" })
          ] }),
          /* @__PURE__ */ i("div", { className: "cedros-admin__field", children: [
            /* @__PURE__ */ e("label", { className: "cedros-admin__field-label", children: "Timeout (seconds)" }),
            /* @__PURE__ */ e(
              "input",
              {
                type: "number",
                className: "cedros-admin__input",
                value: s.webhook_timeout,
                onChange: (a) => o("webhook_timeout", parseInt(a.target.value) || 30),
                placeholder: "30",
                disabled: !s.webhook_enabled,
                style: { maxWidth: 120 }
              }
            )
          ] })
        ] })
      ] })
    ] })
  ] });
}
export {
  U as MessagingSection
};
