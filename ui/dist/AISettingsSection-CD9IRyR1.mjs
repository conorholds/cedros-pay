import { jsx as n, jsxs as r } from "react/jsx-runtime";
import { useState as u, useRef as S, useCallback as A, useEffect as T, useMemo as q } from "react";
import { $ as w, a0 as J, a2 as Y } from "./index-bbSf3B7-.mjs";
import { A as X } from "./AutosaveIndicator-G2CRN8hH.mjs";
const E = [
  { id: "not_set", label: "Disabled", provider: null },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", provider: "gemini" },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", provider: "gemini" },
  { id: "openai-4o", label: "OpenAI 4o", provider: "openai" },
  { id: "openai-5.1", label: "OpenAI 5.1", provider: "openai" },
  { id: "openai-5.2", label: "OpenAI 5.2", provider: "openai" }
], $ = [
  {
    task: "site_chat",
    label: "Site Chat",
    description: "The conversational model that crafts responses to customer messages",
    defaultPrompt: `You are a friendly and helpful shopping assistant for our store. Your role is to:

- Help customers find products that match their needs
- Answer questions about products, shipping, returns, and store policies
- Provide personalized recommendations based on customer preferences
- Use the Product Searcher tool when customers are looking for specific items

Guidelines:
- Be warm, conversational, and concise
- Stay focused on helping with shopping-related questions
- If you don't know something specific about a product, say so honestly
- Never make up product details, prices, or availability
- For complex issues (order problems, refunds), direct customers to contact support`
  },
  {
    task: "product_searcher",
    label: "Product Searcher",
    description: "Tool used by Site Chat to find products based on customer queries",
    defaultPrompt: `You are a product search assistant. Given a customer's query, extract relevant search parameters to find matching products.

Extract the following when present:
- Keywords: Main search terms
- Category: Product category or type
- Price range: Min/max price if mentioned
- Attributes: Color, size, material, brand, or other specifications
- Sort preference: Price, popularity, newest, etc.

Return structured search parameters. Be liberal in interpretation - if a customer says "something for my mom's birthday under $50" extract: keywords=gift, price_max=50, occasion=birthday.

Do not make assumptions about specific products. Focus only on extracting search intent.`
  },
  {
    task: "related_product_finder",
    label: "Related Product Finder",
    description: "AI-powered recommendations for related products on product pages",
    defaultPrompt: `You are a product recommendation engine. Given a product, suggest related items that customers might also be interested in.

Consider these recommendation types:
- Complementary items: Products that go well together (e.g., phone case for a phone)
- Similar alternatives: Products in the same category with different features or price points
- Frequently bought together: Items commonly purchased as a set
- Upsells: Premium versions or upgrades

Guidelines:
- Prioritize relevance over variety
- Consider the product's category, price range, and use case
- Return product IDs or search criteria for related items
- Aim for 4-8 recommendations with a mix of types`
  },
  {
    task: "product_detail_assistant",
    label: "Product Detail Assistant",
    description: "Admin tool to generate product descriptions, suggest tags, and fill out product details",
    defaultPrompt: `You are a product copywriting assistant helping store administrators create compelling product listings.

You can help with:
- Writing engaging product descriptions that highlight key features and benefits
- Suggesting relevant tags and categories for better discoverability
- Creating SEO-friendly titles and meta descriptions
- Generating bullet points for key features
- Writing size guides or care instructions when applicable

Guidelines:
- Match the store's brand voice (ask if unclear)
- Focus on benefits, not just features
- Use sensory language when appropriate
- Keep descriptions scannable with short paragraphs
- Avoid superlatives and unverifiable claims
- Include relevant keywords naturally for SEO`
  }
], H = [
  { id: "gemini", label: "Google Gemini API", placeholder: "AIza..." },
  { id: "openai", label: "OpenAI API", placeholder: "sk-..." }
], D = {
  apiKeys: [
    { provider: "gemini", isConfigured: !1 },
    { provider: "openai", isConfigured: !1 }
  ],
  taskAssignments: $.map((o) => ({
    task: o.task,
    label: o.label,
    description: o.description,
    assignedModel: "not_set",
    systemPrompt: o.defaultPrompt
  }))
};
function ee({ serverUrl: o, apiKey: d, authManager: c }) {
  const [y, _] = u("api-keys"), [h, g] = u(D), [N, b] = u(!0), [p, l] = u(!1), [k, f] = u(null), [O, v] = u(!1), [K, R] = u(null), m = S(null), [I, F] = u({
    gemini: "",
    openai: ""
  }), [x, G] = u({
    gemini: !1,
    openai: !1
  }), C = A(async () => {
    try {
      let e;
      if (c?.isAuthenticated())
        e = await c.fetchWithAuth("/admin/config/ai");
      else {
        const s = { "Content-Type": "application/json" };
        d && (s["X-API-Key"] = d);
        const t = await fetch(`${o}/admin/config/ai`, { headers: s });
        if (!t.ok) throw new Error(`Failed to fetch: ${t.status}`);
        e = await t.json();
      }
      e.settings && g(e.settings);
    } catch {
      g(D), R("Could not load saved AI settings. Showing defaults.");
    } finally {
      b(!1);
    }
  }, [o, d, c]);
  T(() => {
    C();
  }, [C]);
  const z = A(
    async (e) => {
      const s = I[e];
      if (s.trim()) {
        l(!0), f(null);
        try {
          const t = { provider: e, apiKey: s };
          if (c?.isAuthenticated())
            await c.fetchWithAuth("/admin/config/ai/api-key", {
              method: "PUT",
              body: JSON.stringify(t)
            });
          else {
            const i = { "Content-Type": "application/json" };
            d && (i["X-API-Key"] = d);
            const a = await fetch(`${o}/admin/config/ai/api-key`, {
              method: "PUT",
              headers: i,
              body: JSON.stringify(t)
            });
            if (!a.ok) throw new Error(`Failed to save: ${a.status}`);
          }
          g((i) => ({
            ...i,
            apiKeys: i.apiKeys.map(
              (a) => a.provider === e ? {
                ...a,
                isConfigured: !0,
                maskedKey: `${s.slice(0, 4)}...${s.slice(-4)}`,
                updatedAt: (/* @__PURE__ */ new Date()).toISOString()
              } : a
            )
          })), F((i) => ({ ...i, [e]: "" })), v(!0), m.current && clearTimeout(m.current), m.current = setTimeout(() => v(!1), 3e3);
        } catch (t) {
          f(t instanceof Error ? t.message : "Failed to save API key");
        } finally {
          l(!1);
        }
      }
    },
    [I, o, d, c]
  ), j = A(
    async (e) => {
      if (confirm(`Are you sure you want to delete the ${e === "gemini" ? "Google Gemini" : "OpenAI"} API key?`)) {
        l(!0), f(null);
        try {
          if (c?.isAuthenticated())
            await c.fetchWithAuth(`/admin/config/ai/api-key/${e}`, {
              method: "DELETE"
            });
          else {
            const s = { "Content-Type": "application/json" };
            d && (s["X-API-Key"] = d);
            const t = await fetch(`${o}/admin/config/ai/api-key/${e}`, {
              method: "DELETE",
              headers: s
            });
            if (!t.ok) throw new Error(`Failed to delete: ${t.status}`);
          }
          g((s) => ({
            ...s,
            apiKeys: s.apiKeys.map(
              (t) => t.provider === e ? { provider: e, isConfigured: !1 } : t
            )
          }));
        } catch (s) {
          f(s instanceof Error ? s.message : "Failed to delete API key");
        } finally {
          l(!1);
        }
      }
    },
    [o, d, c]
  ), W = A(
    async (e, s) => {
      l(!0), f(null);
      try {
        const t = { task: e, model: s };
        if (c?.isAuthenticated())
          await c.fetchWithAuth("/admin/config/ai/assignment", {
            method: "PUT",
            body: JSON.stringify(t)
          });
        else {
          const i = { "Content-Type": "application/json" };
          d && (i["X-API-Key"] = d);
          const a = await fetch(`${o}/admin/config/ai/assignment`, {
            method: "PUT",
            headers: i,
            body: JSON.stringify(t)
          });
          if (!a.ok) throw new Error(`Failed to save: ${a.status}`);
        }
        g((i) => ({
          ...i,
          taskAssignments: i.taskAssignments.map(
            (a) => a.task === e ? { ...a, assignedModel: s } : a
          )
        })), v(!0), m.current && clearTimeout(m.current), m.current = setTimeout(() => v(!1), 3e3);
      } catch (t) {
        f(t instanceof Error ? t.message : "Failed to save assignment");
      } finally {
        l(!1);
      }
    },
    [o, d, c]
  ), P = A(
    (e) => {
      if (e === "not_set") return !0;
      const s = E.find((i) => i.id === e);
      return s?.provider ? h.apiKeys.find((i) => i.provider === s.provider)?.isConfigured ?? !1 : !0;
    },
    [h.apiKeys]
  ), B = q(() => E.map((e) => {
    const s = P(e.id);
    return {
      value: e.id,
      label: s ? e.label : `${e.label} (API key required)`,
      disabled: !s
    };
  }), [P]), L = A(
    async (e, s) => {
      l(!0), f(null);
      try {
        const t = { task: e, systemPrompt: s };
        if (c?.isAuthenticated())
          await c.fetchWithAuth("/admin/config/ai/prompt", {
            method: "PUT",
            body: JSON.stringify(t)
          });
        else {
          const i = { "Content-Type": "application/json" };
          d && (i["X-API-Key"] = d);
          const a = await fetch(`${o}/admin/config/ai/prompt`, {
            method: "PUT",
            headers: i,
            body: JSON.stringify(t)
          });
          if (!a.ok) throw new Error(`Failed to save: ${a.status}`);
        }
        g((i) => ({
          ...i,
          taskAssignments: i.taskAssignments.map(
            (a) => a.task === e ? { ...a, systemPrompt: s } : a
          )
        })), v(!0), m.current && clearTimeout(m.current), m.current = setTimeout(() => v(!1), 3e3);
      } catch (t) {
        f(t instanceof Error ? t.message : "Failed to save prompt");
      } finally {
        l(!1);
      }
    },
    [o, d, c]
  );
  return T(() => () => {
    m.current && clearTimeout(m.current);
  }, []), N ? /* @__PURE__ */ n("div", { className: "cedros-admin__section", children: /* @__PURE__ */ r("div", { className: "cedros-admin__loading", children: [
    w.loading,
    " Loading AI settings..."
  ] }) }) : /* @__PURE__ */ r("div", { className: "cedros-admin__ai-settings", children: [
    /* @__PURE__ */ r("div", { className: "cedros-admin__page-header", children: [
      /* @__PURE__ */ n("h2", { className: "cedros-admin__page-title", children: "Store AI" }),
      /* @__PURE__ */ n("p", { className: "cedros-admin__page-description", children: "Configure AI providers, model assignments, and system prompts." })
    ] }),
    /* @__PURE__ */ r("div", { className: "cedros-admin__tabs cedros-admin__tabs--line", children: [
      /* @__PURE__ */ n(
        "button",
        {
          type: "button",
          className: `cedros-admin__tab ${y === "api-keys" ? "cedros-admin__tab--active" : ""}`,
          onClick: () => _("api-keys"),
          children: "API Keys"
        }
      ),
      /* @__PURE__ */ n(
        "button",
        {
          type: "button",
          className: `cedros-admin__tab ${y === "assignments" ? "cedros-admin__tab--active" : ""}`,
          onClick: () => _("assignments"),
          children: "Model Assignments"
        }
      ),
      /* @__PURE__ */ n(
        "button",
        {
          type: "button",
          className: `cedros-admin__tab ${y === "prompts" ? "cedros-admin__tab--active" : ""}`,
          onClick: () => _("prompts"),
          children: "Prompts"
        }
      )
    ] }),
    k && /* @__PURE__ */ n("div", { className: "cedros-admin__error-banner", style: { marginTop: "1rem" }, children: k }),
    /* @__PURE__ */ n(J, { message: K, onRetry: C }),
    O && /* @__PURE__ */ r("div", { className: "cedros-admin__success-banner", style: { marginTop: "1rem" }, children: [
      w.check,
      " Settings saved successfully"
    ] }),
    y === "api-keys" && /* @__PURE__ */ r("div", { className: "cedros-admin__section", style: { marginTop: "1rem" }, children: [
      /* @__PURE__ */ n("div", { className: "cedros-admin__section-header", children: /* @__PURE__ */ n("h3", { className: "cedros-admin__section-title", children: "API Keys" }) }),
      /* @__PURE__ */ n("p", { style: { marginBottom: "1.5rem", opacity: 0.7, fontSize: 14 }, children: "Configure API keys for AI providers. Keys are stored securely and never exposed." }),
      /* @__PURE__ */ n("div", { style: { display: "flex", flexDirection: "column", gap: "1.5rem" }, children: H.map((e) => {
        const s = h.apiKeys.find((i) => i.provider === e.id), t = s?.isConfigured ?? !1;
        return /* @__PURE__ */ r(
          "div",
          {
            className: "cedros-admin__api-key-card",
            style: {
              padding: "1rem",
              border: "1px solid var(--cedros-admin-border)",
              borderRadius: 8
            },
            children: [
              /* @__PURE__ */ r("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }, children: [
                /* @__PURE__ */ r("div", { children: [
                  /* @__PURE__ */ n("div", { style: { fontWeight: 600 }, children: e.label }),
                  t && s?.maskedKey && /* @__PURE__ */ r("div", { style: { fontSize: 12, opacity: 0.6, marginTop: 2 }, children: [
                    "Current key: ",
                    s.maskedKey,
                    s.updatedAt && /* @__PURE__ */ r("span", { children: [
                      " (updated ",
                      new Date(s.updatedAt).toLocaleDateString(),
                      ")"
                    ] })
                  ] })
                ] }),
                /* @__PURE__ */ n(
                  "span",
                  {
                    className: `cedros-admin__badge ${t ? "cedros-admin__badge--success" : "cedros-admin__badge--muted"}`,
                    children: t ? "Configured" : "Not Set"
                  }
                )
              ] }),
              /* @__PURE__ */ n("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem" }, children: /* @__PURE__ */ r("div", { style: { display: "flex", gap: "0.5rem", alignItems: "center" }, children: [
                /* @__PURE__ */ n(
                  "input",
                  {
                    type: x[e.id] ? "text" : "password",
                    className: "cedros-admin__input",
                    placeholder: t ? "Enter new key to replace" : e.placeholder,
                    value: I[e.id],
                    onChange: (i) => F((a) => ({ ...a, [e.id]: i.target.value })),
                    onBlur: () => {
                      I[e.id].trim() && z(e.id);
                    },
                    style: { flex: 1 }
                  }
                ),
                /* @__PURE__ */ n(
                  "button",
                  {
                    type: "button",
                    className: "cedros-admin__button cedros-admin__button--ghost",
                    onClick: () => G((i) => ({ ...i, [e.id]: !i[e.id] })),
                    title: x[e.id] ? "Hide key" : "Show key",
                    style: { padding: "0.5rem" },
                    children: x[e.id] ? w.eyeOff : w.eye
                  }
                ),
                t && /* @__PURE__ */ n(
                  "button",
                  {
                    type: "button",
                    className: "cedros-admin__button cedros-admin__button--ghost cedros-admin__button--danger",
                    onClick: () => j(e.id),
                    disabled: p,
                    title: "Remove API key",
                    style: { padding: "0.5rem" },
                    children: w.trash
                  }
                )
              ] }) })
            ]
          },
          e.id
        );
      }) })
    ] }),
    y === "assignments" && /* @__PURE__ */ r("div", { className: "cedros-admin__section", style: { marginTop: "1rem" }, children: [
      /* @__PURE__ */ n("div", { className: "cedros-admin__section-header", children: /* @__PURE__ */ n("h3", { className: "cedros-admin__section-title", children: "Model Assignments" }) }),
      /* @__PURE__ */ n("p", { style: { marginBottom: "1.5rem", opacity: 0.7, fontSize: 14 }, children: "Assign AI models to specific tasks. Models require their provider's API key to be configured." }),
      /* @__PURE__ */ n("div", { style: { display: "flex", flexDirection: "column", gap: "1rem" }, children: h.taskAssignments.map((e) => {
        const s = $.find((i) => i.task === e.task), t = E.find((i) => i.id === e.assignedModel);
        return /* @__PURE__ */ r(
          "div",
          {
            style: {
              padding: "1rem",
              border: "1px solid var(--cedros-admin-border)",
              borderRadius: 8
            },
            children: [
              /* @__PURE__ */ r("div", { style: { marginBottom: "0.75rem" }, children: [
                /* @__PURE__ */ n("div", { style: { fontWeight: 600 }, children: s?.label ?? e.task }),
                /* @__PURE__ */ n("div", { style: { fontSize: 13, opacity: 0.7, marginTop: 2 }, children: s?.description })
              ] }),
              /* @__PURE__ */ r("div", { style: { display: "flex", alignItems: "center", gap: "0.75rem" }, children: [
                /* @__PURE__ */ n(
                  Y,
                  {
                    value: e.assignedModel,
                    onChange: (i) => W(e.task, i),
                    options: B,
                    label: "",
                    disabled: p,
                    style: { flex: 1, maxWidth: 280 }
                  }
                ),
                t && t.provider && /* @__PURE__ */ n(
                  "span",
                  {
                    className: `cedros-admin__badge ${P(t.id) ? "cedros-admin__badge--success" : "cedros-admin__badge--warning"}`,
                    children: P(t.id) ? "Ready" : "Missing API Key"
                  }
                )
              ] })
            ]
          },
          e.task
        );
      }) })
    ] }),
    y === "prompts" && /* @__PURE__ */ r("div", { className: "cedros-admin__section", style: { marginTop: "1rem" }, children: [
      /* @__PURE__ */ n("div", { className: "cedros-admin__section-header", children: /* @__PURE__ */ n("h3", { className: "cedros-admin__section-title", children: "System Prompts" }) }),
      /* @__PURE__ */ n("p", { style: { marginBottom: "1.5rem", opacity: 0.7, fontSize: 14 }, children: "Configure the default system prompts for each AI task. These prompts guide the AI's behavior and responses." }),
      /* @__PURE__ */ n("div", { style: { display: "flex", flexDirection: "column", gap: "1.5rem" }, children: h.taskAssignments.map((e) => {
        const s = $.find((t) => t.task === e.task);
        return /* @__PURE__ */ n(
          M,
          {
            task: e.task,
            label: s?.label ?? e.task,
            description: s?.description ?? "",
            initialPrompt: e.systemPrompt ?? "",
            onSave: L
          },
          e.task
        );
      }) })
    ] })
  ] });
}
function M({
  task: o,
  label: d,
  description: c,
  initialPrompt: y,
  onSave: _
}) {
  const [h, g] = u(y), [N, b] = u("idle"), p = S(null), l = S(null), k = S(!0);
  return T(() => {
    if (k.current) {
      k.current = !1;
      return;
    }
    return p.current && clearTimeout(p.current), l.current && clearTimeout(l.current), b("pending"), p.current = setTimeout(async () => {
      b("saving");
      try {
        await _(o, h), b("saved"), l.current = setTimeout(() => b("idle"), 2e3);
      } catch {
        b("error");
      }
    }, 1500), () => {
      p.current && clearTimeout(p.current);
    };
  }, [h, o, _]), T(() => () => {
    p.current && clearTimeout(p.current), l.current && clearTimeout(l.current);
  }, []), /* @__PURE__ */ r(
    "div",
    {
      style: {
        padding: "1rem",
        border: "1px solid var(--cedros-admin-border)",
        borderRadius: 8
      },
      children: [
        /* @__PURE__ */ r("div", { style: { marginBottom: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }, children: [
          /* @__PURE__ */ r("div", { children: [
            /* @__PURE__ */ n("div", { style: { fontWeight: 600 }, children: d }),
            /* @__PURE__ */ n("div", { style: { fontSize: 13, opacity: 0.7, marginTop: 2 }, children: c })
          ] }),
          /* @__PURE__ */ n(X, { status: N })
        ] }),
        /* @__PURE__ */ n(
          "textarea",
          {
            className: "cedros-admin__input",
            value: h,
            onChange: (f) => g(f.target.value),
            placeholder: "Enter system prompt...",
            rows: 4,
            style: {
              width: "100%",
              resize: "vertical",
              fontFamily: "inherit",
              minHeight: 100
            }
          }
        )
      ]
    }
  );
}
export {
  ee as AISettingsSection
};
