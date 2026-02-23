import { jsx as a, jsxs as i } from "react/jsx-runtime";
import { useState as g, useCallback as F, useEffect as D, useMemo as E } from "react";
import { $ as h, a0 as Z, a1 as K } from "./index-bbSf3B7-.mjs";
const l = {
  enabled: !1,
  plans: [],
  pageTitle: "Choose Your Plan",
  pageSubtitle: "Select the plan that best fits your needs.",
  annualSavingsBadge: "2 months free",
  popularBadgeText: "Best Deal",
  footerNotice: ""
}, ee = {
  title: "New Plan",
  description: "",
  priceMonthlyUsd: 0,
  priceAnnualUsd: 0,
  features: [],
  featureHighlight: "",
  buttonText: "Purchase",
  isPopular: !1,
  isActive: !0,
  sortOrder: 0
};
function ae() {
  return `plan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
function le({ serverUrl: N, apiKey: _, authManager: v }) {
  const [r, b] = g(l), [y, Q] = g(!0), [$, P] = g(null), [u, U] = g("plans"), [S, C] = g("idle"), [J, x] = g(null), [d, m] = g({
    enabled: l.enabled,
    pageTitle: l.pageTitle,
    pageSubtitle: l.pageSubtitle,
    annualSavingsBadge: l.annualSavingsBadge,
    popularBadgeText: l.popularBadgeText,
    footerNotice: l.footerNotice
  }), [f, w] = g(d), [I, k] = g(""), A = F(async () => {
    try {
      x(null);
      let e;
      const n = "/admin/subscriptions/settings";
      if (v?.isAuthenticated())
        e = await v.fetchWithAuth(n);
      else {
        const s = { "Content-Type": "application/json" };
        _ && (s["X-API-Key"] = _);
        const t = await fetch(`${N}${n}`, { headers: s });
        if (!t.ok) throw new Error(`Failed to fetch settings: ${t.status}`);
        e = await t.json();
      }
      b({ ...l, ...e }), m({
        enabled: e.enabled ?? l.enabled,
        pageTitle: e.pageTitle ?? l.pageTitle,
        pageSubtitle: e.pageSubtitle ?? l.pageSubtitle,
        annualSavingsBadge: e.annualSavingsBadge ?? l.annualSavingsBadge,
        popularBadgeText: e.popularBadgeText ?? l.popularBadgeText,
        footerNotice: e.footerNotice ?? l.footerNotice
      }), w({
        enabled: e.enabled ?? l.enabled,
        pageTitle: e.pageTitle ?? l.pageTitle,
        pageSubtitle: e.pageSubtitle ?? l.pageSubtitle,
        annualSavingsBadge: e.annualSavingsBadge ?? l.annualSavingsBadge,
        popularBadgeText: e.popularBadgeText ?? l.popularBadgeText,
        footerNotice: e.footerNotice ?? l.footerNotice
      }), k(JSON.stringify(e.plans ?? []));
    } catch {
      b(l), m({
        enabled: l.enabled,
        pageTitle: l.pageTitle,
        pageSubtitle: l.pageSubtitle,
        annualSavingsBadge: l.annualSavingsBadge,
        popularBadgeText: l.popularBadgeText,
        footerNotice: l.footerNotice
      }), w({
        enabled: l.enabled,
        pageTitle: l.pageTitle,
        pageSubtitle: l.pageSubtitle,
        annualSavingsBadge: l.annualSavingsBadge,
        popularBadgeText: l.popularBadgeText,
        footerNotice: l.footerNotice
      }), k(JSON.stringify([])), x("Failed to load subscription settings");
    } finally {
      Q(!1);
    }
  }, [N, _, v]);
  D(() => {
    A();
  }, [A]);
  const L = F(async (e) => {
    try {
      x(null);
      const n = "/admin/subscriptions/settings", s = JSON.stringify(e);
      if (v?.isAuthenticated())
        await v.fetchWithAuth(n, { method: "PUT", body: s });
      else {
        const t = { "Content-Type": "application/json" };
        _ && (t["X-API-Key"] = _);
        const o = await fetch(`${N}${n}`, { method: "PUT", headers: t, body: s });
        if (!o.ok) throw new Error(`Failed to save settings: ${o.status}`);
      }
      return !0;
    } catch {
      return x("Failed to save subscription settings"), !1;
    }
  }, [v, _, N]), M = E(() => f.enabled !== d.enabled || f.pageTitle !== d.pageTitle || f.pageSubtitle !== d.pageSubtitle || f.annualSavingsBadge !== d.annualSavingsBadge || f.popularBadgeText !== d.popularBadgeText || f.footerNotice !== d.footerNotice, [d, f]), z = E(() => JSON.stringify(r.plans), [r.plans]), R = E(() => I !== z, [z, I]), T = F(async () => {
    const e = {
      ...r,
      enabled: d.enabled,
      pageTitle: d.pageTitle,
      pageSubtitle: d.pageSubtitle,
      annualSavingsBadge: d.annualSavingsBadge,
      popularBadgeText: d.popularBadgeText,
      footerNotice: d.footerNotice
    };
    C("saving");
    const n = await L(e);
    b(e), n && (w({
      enabled: e.enabled,
      pageTitle: e.pageTitle,
      pageSubtitle: e.pageSubtitle,
      annualSavingsBadge: e.annualSavingsBadge,
      popularBadgeText: e.popularBadgeText,
      footerNotice: e.footerNotice
    }), k(JSON.stringify(e.plans))), C(n ? "saved" : "error"), setTimeout(() => C("idle"), 1500);
  }, [d, L, r]);
  D(() => {
    if (u !== "page" || y || !M) return;
    const e = setTimeout(T, 600);
    return () => clearTimeout(e);
  }, [u, M, y, T]), D(() => {
    if (u !== "plans" || y || !R) return;
    const e = setTimeout(T, 800);
    return () => clearTimeout(e);
  }, [u, R, y, T]);
  const W = () => {
    const e = {
      ...ee,
      id: ae(),
      sortOrder: r.plans.length
    };
    b((n) => ({ ...n, plans: [...n.plans, e] })), P(e.id);
  }, c = (e, n) => {
    b((s) => ({
      ...s,
      plans: s.plans.map((t) => t.id === e ? { ...t, ...n } : t)
    }));
  }, X = (e) => {
    confirm("Delete this plan? This cannot be undone.") && (b((n) => ({
      ...n,
      plans: n.plans.filter((s) => s.id !== e)
    })), $ === e && P(null));
  }, H = (e, n) => {
    const s = r.plans.findIndex((p) => p.id === e);
    if (s === -1 || n === "up" && s === 0 || n === "down" && s === r.plans.length - 1) return;
    const t = [...r.plans], o = n === "up" ? s - 1 : s + 1;
    [t[s], t[o]] = [t[o], t[s]], b((p) => ({ ...p, plans: t }));
  }, Y = (e) => {
    c(e, {
      features: [...r.plans.find((n) => n.id === e)?.features || [], ""]
    });
  }, q = (e, n, s) => {
    const t = r.plans.find((p) => p.id === e);
    if (!t) return;
    const o = [...t.features];
    o[n] = s, c(e, { features: o });
  }, G = (e, n) => {
    const s = r.plans.find((o) => o.id === e);
    if (!s) return;
    const t = s.features.filter((o, p) => p !== n);
    c(e, { features: t });
  };
  if (y)
    return /* @__PURE__ */ a("div", { className: "cedros-admin__page", children: /* @__PURE__ */ i("div", { className: "cedros-admin__loading", children: [
      h.loading,
      " Loading subscription settings..."
    ] }) });
  const O = r.plans.filter((e) => e.isActive).length, j = r.plans.reduce((e, n) => e + (n.activeSubscribers ?? 0), 0), B = d.enabled, V = r.plans.filter((e) => e.isActive).map((e) => ({
    label: e.title,
    value: e.activeSubscribers ?? 0,
    description: "subscribers"
  }));
  return /* @__PURE__ */ i("div", { className: "cedros-admin__page", children: [
    /* @__PURE__ */ a(Z, { message: J, onRetry: A }),
    /* @__PURE__ */ a(
      K,
      {
        stats: [
          { label: "Status", value: B ? "Enabled" : "Disabled", variant: B ? "success" : "muted" },
          { label: "Active Plans", value: O, variant: O > 0 ? "success" : "muted" },
          { label: "Total Subscribers", value: j, variant: j > 0 ? "success" : "muted" },
          ...V
        ],
        isLoading: y
      }
    ),
    /* @__PURE__ */ i("div", { className: "cedros-admin__section", children: [
      /* @__PURE__ */ i("div", { className: "cedros-admin__section-header", children: [
        /* @__PURE__ */ a("h3", { className: "cedros-admin__section-title", children: "Subscription Settings" }),
        /* @__PURE__ */ i("div", { style: { display: "flex", alignItems: "center", gap: "0.75rem" }, children: [
          u === "plans" && /* @__PURE__ */ i(
            "button",
            {
              className: "cedros-admin__button cedros-admin__button--primary cedros-admin__button--action",
              onClick: W,
              disabled: !B,
              children: [
                h.plus,
                "Add Plan"
              ]
            }
          ),
          /* @__PURE__ */ i("span", { className: `cedros-admin__autosave-indicator cedros-admin__autosave-indicator--${S}`, children: [
            S === "saving" && "Saving...",
            S === "saved" && "Saved",
            S === "error" && "Error"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ i("div", { className: "cedros-admin__tabs cedros-admin__tabs--line", children: [
        /* @__PURE__ */ a(
          "button",
          {
            type: "button",
            className: `cedros-admin__tab ${u === "plans" ? "cedros-admin__tab--active" : ""}`,
            onClick: () => U("plans"),
            children: "Plans"
          }
        ),
        /* @__PURE__ */ a(
          "button",
          {
            type: "button",
            className: `cedros-admin__tab ${u === "page" ? "cedros-admin__tab--active" : ""}`,
            onClick: () => U("page"),
            children: "Page Settings"
          }
        )
      ] }),
      u === "page" && /* @__PURE__ */ i("div", { children: [
        /* @__PURE__ */ a("div", { className: "cedros-admin__form-row", children: /* @__PURE__ */ i("div", { className: "cedros-admin__field", children: [
          /* @__PURE__ */ a("label", { className: "cedros-admin__field-label", children: "Subscriptions" }),
          /* @__PURE__ */ i("label", { className: "cedros-admin__toggle", children: [
            /* @__PURE__ */ a(
              "input",
              {
                type: "checkbox",
                className: "cedros-admin__toggle-input",
                checked: d.enabled,
                onChange: (e) => m((n) => ({ ...n, enabled: e.target.checked }))
              }
            ),
            /* @__PURE__ */ a("span", { className: "cedros-admin__toggle-track", children: /* @__PURE__ */ a("span", { className: "cedros-admin__toggle-thumb" }) }),
            /* @__PURE__ */ a("span", { className: "cedros-admin__toggle-label", children: "Enable Subscriptions" })
          ] })
        ] }) }),
        /* @__PURE__ */ i("div", { className: "cedros-admin__form-row", children: [
          /* @__PURE__ */ i("div", { className: "cedros-admin__field", children: [
            /* @__PURE__ */ a("label", { className: "cedros-admin__field-label", children: "Page Title" }),
            /* @__PURE__ */ a(
              "input",
              {
                type: "text",
                className: "cedros-admin__input",
                value: d.pageTitle || "",
                onChange: (e) => m((n) => ({ ...n, pageTitle: e.target.value })),
                placeholder: "Choose Your Plan"
              }
            )
          ] }),
          /* @__PURE__ */ i("div", { className: "cedros-admin__field", children: [
            /* @__PURE__ */ a("label", { className: "cedros-admin__field-label", children: "Page Subtitle" }),
            /* @__PURE__ */ a(
              "input",
              {
                type: "text",
                className: "cedros-admin__input",
                value: d.pageSubtitle || "",
                onChange: (e) => m((n) => ({ ...n, pageSubtitle: e.target.value })),
                placeholder: "Select the plan that best fits your needs."
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ i("div", { className: "cedros-admin__form-row", children: [
          /* @__PURE__ */ i("div", { className: "cedros-admin__field", children: [
            /* @__PURE__ */ a("label", { className: "cedros-admin__field-label", children: "Annual Savings Badge" }),
            /* @__PURE__ */ a(
              "input",
              {
                type: "text",
                className: "cedros-admin__input",
                value: d.annualSavingsBadge || "",
                onChange: (e) => m((n) => ({ ...n, annualSavingsBadge: e.target.value })),
                placeholder: "2 months free"
              }
            )
          ] }),
          /* @__PURE__ */ i("div", { className: "cedros-admin__field", children: [
            /* @__PURE__ */ a("label", { className: "cedros-admin__field-label", children: "Popular Plan Badge" }),
            /* @__PURE__ */ a(
              "input",
              {
                type: "text",
                className: "cedros-admin__input",
                value: d.popularBadgeText || "",
                onChange: (e) => m((n) => ({ ...n, popularBadgeText: e.target.value })),
                placeholder: "Best Deal"
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ a("div", { className: "cedros-admin__form-row", children: /* @__PURE__ */ i("div", { className: "cedros-admin__field", style: { flex: 1 }, children: [
          /* @__PURE__ */ a("label", { className: "cedros-admin__field-label", children: "Footer Notice (optional)" }),
          /* @__PURE__ */ a(
            "input",
            {
              type: "text",
              className: "cedros-admin__input",
              value: d.footerNotice || "",
              onChange: (e) => m((n) => ({ ...n, footerNotice: e.target.value })),
              placeholder: "For information regarding invoices, taxes..."
            }
          )
        ] }) })
      ] }),
      u === "plans" && /* @__PURE__ */ i("div", { children: [
        !B && /* @__PURE__ */ a("div", { style: { padding: "1.5rem", textAlign: "center", opacity: 0.6 }, children: "Subscriptions are disabled. Enable them to configure plans." }),
        r.plans.length === 0 ? /* @__PURE__ */ a("div", { style: { padding: "2rem", textAlign: "center", opacity: 0.6, border: "1px dashed currentColor", borderRadius: 8 }, children: 'No plans configured. Click "Add Plan" to create your first subscription tier.' }) : /* @__PURE__ */ a("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem" }, children: r.plans.map((e, n) => {
          const s = $ === e.id;
          return /* @__PURE__ */ i(
            "div",
            {
              style: {
                border: "1px solid var(--cedros-admin-border, #e5e5e5)",
                borderRadius: 8,
                overflow: "hidden",
                background: e.isPopular ? "var(--cedros-admin-bg-accent, #f5f5f5)" : void 0
              },
              children: [
                /* @__PURE__ */ i(
                  "div",
                  {
                    style: {
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                      padding: "0.75rem 1rem",
                      cursor: "pointer"
                    },
                    onClick: () => P(s ? null : e.id),
                    children: [
                      /* @__PURE__ */ a("span", { style: { opacity: 0.5 }, children: s ? h.chevronDown : h.chevronRight }),
                      /* @__PURE__ */ i("div", { style: { flex: 1 }, children: [
                        /* @__PURE__ */ a("span", { style: { fontWeight: 600 }, children: e.title || "Untitled Plan" }),
                        e.isPopular && /* @__PURE__ */ a("span", { style: {
                          marginLeft: "0.5rem",
                          fontSize: 11,
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: "var(--cedros-admin-primary, #171717)",
                          color: "#fff"
                        }, children: "Popular" }),
                        !e.isActive && /* @__PURE__ */ a("span", { style: {
                          marginLeft: "0.5rem",
                          fontSize: 11,
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: "#9ca3af",
                          color: "#fff"
                        }, children: "Inactive" })
                      ] }),
                      /* @__PURE__ */ i("span", { style: { opacity: 0.6, fontSize: 14 }, children: [
                        "$",
                        e.priceMonthlyUsd,
                        "/mo · $",
                        e.priceAnnualUsd,
                        "/yr"
                      ] }),
                      /* @__PURE__ */ i("div", { style: { display: "flex", gap: "0.25rem" }, onClick: (t) => t.stopPropagation(), children: [
                        /* @__PURE__ */ a(
                          "button",
                          {
                            className: "cedros-admin__button cedros-admin__button--ghost",
                            onClick: () => H(e.id, "up"),
                            disabled: n === 0,
                            title: "Move up",
                            style: { padding: "4px 8px" },
                            children: h.chevronUp
                          }
                        ),
                        /* @__PURE__ */ a(
                          "button",
                          {
                            className: "cedros-admin__button cedros-admin__button--ghost",
                            onClick: () => H(e.id, "down"),
                            disabled: n === r.plans.length - 1,
                            title: "Move down",
                            style: { padding: "4px 8px" },
                            children: h.chevronDown
                          }
                        ),
                        /* @__PURE__ */ a(
                          "button",
                          {
                            className: "cedros-admin__button cedros-admin__button--ghost",
                            onClick: () => X(e.id),
                            title: "Delete plan",
                            style: { padding: "4px 8px", color: "#dc2626" },
                            children: h.trash
                          }
                        )
                      ] })
                    ]
                  }
                ),
                s && /* @__PURE__ */ i("div", { style: { padding: "1rem", borderTop: "1px solid var(--cedros-admin-border, #e5e5e5)" }, children: [
                  /* @__PURE__ */ i("div", { className: "cedros-admin__form-row", children: [
                    /* @__PURE__ */ i("div", { className: "cedros-admin__field", children: [
                      /* @__PURE__ */ a("label", { className: "cedros-admin__field-label", children: "Plan Name" }),
                      /* @__PURE__ */ a(
                        "input",
                        {
                          type: "text",
                          className: "cedros-admin__input",
                          value: e.title,
                          onChange: (t) => c(e.id, { title: t.target.value }),
                          placeholder: "e.g., Starter"
                        }
                      )
                    ] }),
                    /* @__PURE__ */ i("div", { className: "cedros-admin__field", children: [
                      /* @__PURE__ */ a("label", { className: "cedros-admin__field-label", children: "Button Text" }),
                      /* @__PURE__ */ a(
                        "input",
                        {
                          type: "text",
                          className: "cedros-admin__input",
                          value: e.buttonText || "",
                          onChange: (t) => c(e.id, { buttonText: t.target.value }),
                          placeholder: "Purchase"
                        }
                      )
                    ] })
                  ] }),
                  /* @__PURE__ */ a("div", { className: "cedros-admin__form-row", children: /* @__PURE__ */ i("div", { className: "cedros-admin__field", style: { flex: 1 }, children: [
                    /* @__PURE__ */ a("label", { className: "cedros-admin__field-label", children: "Description" }),
                    /* @__PURE__ */ a(
                      "input",
                      {
                        type: "text",
                        className: "cedros-admin__input",
                        value: e.description,
                        onChange: (t) => c(e.id, { description: t.target.value }),
                        placeholder: "For entry-level developers managing lightweight workloads"
                      }
                    )
                  ] }) }),
                  /* @__PURE__ */ i("div", { className: "cedros-admin__form-row", children: [
                    /* @__PURE__ */ i("div", { className: "cedros-admin__field", children: [
                      /* @__PURE__ */ a("label", { className: "cedros-admin__field-label", children: "Monthly Price (USD)" }),
                      /* @__PURE__ */ a(
                        "input",
                        {
                          type: "number",
                          className: "cedros-admin__input",
                          value: e.priceMonthlyUsd || "",
                          onChange: (t) => c(e.id, { priceMonthlyUsd: parseFloat(t.target.value) || 0 }),
                          placeholder: "10",
                          min: "0",
                          step: "0.01"
                        }
                      )
                    ] }),
                    /* @__PURE__ */ i("div", { className: "cedros-admin__field", children: [
                      /* @__PURE__ */ a("label", { className: "cedros-admin__field-label", children: "Annual Price (USD)" }),
                      /* @__PURE__ */ a(
                        "input",
                        {
                          type: "number",
                          className: "cedros-admin__input",
                          value: e.priceAnnualUsd || "",
                          onChange: (t) => c(e.id, { priceAnnualUsd: parseFloat(t.target.value) || 0 }),
                          placeholder: "100",
                          min: "0",
                          step: "0.01"
                        }
                      )
                    ] })
                  ] }),
                  /* @__PURE__ */ a("div", { className: "cedros-admin__form-row", children: /* @__PURE__ */ i("div", { className: "cedros-admin__field", children: [
                    /* @__PURE__ */ a("label", { className: "cedros-admin__field-label", children: "Feature Highlight" }),
                    /* @__PURE__ */ a(
                      "input",
                      {
                        type: "text",
                        className: "cedros-admin__input",
                        value: e.featureHighlight || "",
                        onChange: (t) => c(e.id, { featureHighlight: t.target.value }),
                        placeholder: "100 prompts every 5 hours"
                      }
                    ),
                    /* @__PURE__ */ a("div", { style: { marginTop: 4, fontSize: 12, opacity: 0.75 }, children: "Bold text shown above feature list" })
                  ] }) }),
                  /* @__PURE__ */ i("div", { className: "cedros-admin__form-row", children: [
                    /* @__PURE__ */ a("div", { className: "cedros-admin__field", children: /* @__PURE__ */ i("label", { style: { display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }, children: [
                      /* @__PURE__ */ a(
                        "input",
                        {
                          type: "checkbox",
                          checked: e.isPopular || !1,
                          onChange: (t) => c(e.id, { isPopular: t.target.checked })
                        }
                      ),
                      "Mark as Popular (featured styling)"
                    ] }) }),
                    /* @__PURE__ */ a("div", { className: "cedros-admin__field", children: /* @__PURE__ */ i("label", { style: { display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }, children: [
                      /* @__PURE__ */ a(
                        "input",
                        {
                          type: "checkbox",
                          checked: e.isActive,
                          onChange: (t) => c(e.id, { isActive: t.target.checked })
                        }
                      ),
                      "Active (available for purchase)"
                    ] }) })
                  ] }),
                  /* @__PURE__ */ i("div", { className: "cedros-admin__form-row", style: { marginTop: "0.5rem" }, children: [
                    /* @__PURE__ */ a("div", { className: "cedros-admin__field", children: /* @__PURE__ */ i("label", { style: { display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }, children: [
                      /* @__PURE__ */ a(
                        "input",
                        {
                          type: "checkbox",
                          checked: e.inventoryQuantity != null,
                          onChange: (t) => c(e.id, { inventoryQuantity: t.target.checked ? 100 : null })
                        }
                      ),
                      "Limit quantity available"
                    ] }) }),
                    e.inventoryQuantity != null && /* @__PURE__ */ i("div", { className: "cedros-admin__field", children: [
                      /* @__PURE__ */ a("label", { className: "cedros-admin__field-label", children: "Total Available" }),
                      /* @__PURE__ */ a(
                        "input",
                        {
                          type: "number",
                          className: "cedros-admin__input",
                          value: e.inventoryQuantity ?? "",
                          onChange: (t) => c(e.id, { inventoryQuantity: parseInt(t.target.value) || 0 }),
                          min: "0",
                          style: { width: 100 }
                        }
                      ),
                      e.inventorySold != null && e.inventorySold > 0 && /* @__PURE__ */ i("div", { style: { marginTop: 4, fontSize: 12, opacity: 0.75 }, children: [
                        e.inventorySold,
                        " sold · ",
                        Math.max(0, e.inventoryQuantity - e.inventorySold),
                        " remaining"
                      ] })
                    ] })
                  ] }),
                  /* @__PURE__ */ i("div", { style: { marginTop: "1rem" }, children: [
                    /* @__PURE__ */ i("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }, children: [
                      /* @__PURE__ */ i("label", { className: "cedros-admin__field-label", style: { margin: 0 }, children: [
                        "Feature List (",
                        e.features.length,
                        ")"
                      ] }),
                      /* @__PURE__ */ a(
                        "button",
                        {
                          className: "cedros-admin__button cedros-admin__button--ghost",
                          onClick: () => Y(e.id),
                          style: { fontSize: 12, padding: "4px 8px" },
                          children: "+ Add Feature"
                        }
                      )
                    ] }),
                    e.features.length === 0 ? /* @__PURE__ */ a("div", { style: { padding: "1rem", textAlign: "center", opacity: 0.5, fontSize: 13, border: "1px dashed currentColor", borderRadius: 6 }, children: 'No features. Click "Add Feature" to add bullet points.' }) : /* @__PURE__ */ a("div", { style: { display: "flex", flexDirection: "column", gap: "0.5rem" }, children: e.features.map((t, o) => /* @__PURE__ */ i("div", { style: { display: "flex", gap: "0.5rem", alignItems: "center" }, children: [
                      /* @__PURE__ */ i("span", { style: { opacity: 0.4, fontSize: 12 }, children: [
                        o + 1,
                        "."
                      ] }),
                      /* @__PURE__ */ a(
                        "input",
                        {
                          type: "text",
                          className: "cedros-admin__input",
                          value: t,
                          onChange: (p) => q(e.id, o, p.target.value),
                          placeholder: "e.g., Powered by MiniMax M2.1",
                          style: { flex: 1 }
                        }
                      ),
                      /* @__PURE__ */ a(
                        "button",
                        {
                          className: "cedros-admin__button cedros-admin__button--ghost",
                          onClick: () => G(e.id, o),
                          style: { padding: "4px 8px", color: "#dc2626" },
                          title: "Remove feature",
                          children: h.trash
                        }
                      )
                    ] }, o)) })
                  ] })
                ] })
              ]
            },
            e.id
          );
        }) })
      ] })
    ] })
  ] });
}
export {
  le as SubscriptionsSection
};
