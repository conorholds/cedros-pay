import { jsx as t, jsxs as a } from "react/jsx-runtime";
import { useState as h, useCallback as z, useEffect as j } from "react";
import { $ as H, a0 as V, a2 as x } from "./index-bbSf3B7-.mjs";
import { T as d } from "./Toggle-DAxIdpY4.mjs";
import { u as q } from "./useAutosave-YwMqRzqy.mjs";
import { A as X } from "./AutosaveIndicator-G2CRN8hH.mjs";
const C = {
  enabled: !0,
  relatedProducts: {
    mode: "most_recent",
    maxItems: 4,
    layout: {
      layout: "large",
      imageCrop: "center"
    }
  },
  catalog: {
    filters: {
      tags: !0,
      priceRange: !0,
      inStock: !0
    },
    sort: {
      featured: !0,
      priceAsc: !0,
      priceDesc: !0
    }
  },
  checkout: {
    promoCodes: !0
  },
  shopLayout: {
    layout: "large",
    imageCrop: "center"
  },
  categoryLayout: {
    layout: "large",
    imageCrop: "center"
  },
  sections: {
    showDescription: !0,
    showSpecs: !0,
    showShipping: !0,
    showRelatedProducts: !0
  },
  inventory: {
    preCheckoutVerification: !0,
    holdsEnabled: !1,
    holdDurationMinutes: 15
  },
  shopPage: {
    title: "Shop",
    description: ""
  }
}, G = [
  {
    value: "most_recent",
    label: "Most Recent",
    description: "Show the most recently added products (excluding current product)."
  },
  {
    value: "by_category",
    label: "By Category",
    description: "Show products from the same category as the current product."
  },
  {
    value: "manual",
    label: "Manual Selection",
    description: "Specify related products per-product using relatedProductIds in metadata."
  },
  {
    value: "ai",
    label: "AI Recommendations",
    description: "Let AI analyze products and suggest the best matches. Requires AI to be configured in AI Settings."
  }
], _ = [
  {
    value: "large",
    label: "Large",
    description: "Portrait cards (4:5) with full product info, description, and tags."
  },
  {
    value: "square",
    label: "Square",
    description: "Square cards (1:1) showing title and price only."
  },
  {
    value: "compact",
    label: "Compact",
    description: "Compact cards (3:4) with smaller text to fit more products."
  }
], k = [
  { value: "center", label: "Center" },
  { value: "top", label: "Top" },
  { value: "bottom", label: "Bottom" },
  { value: "left", label: "Left" },
  { value: "right", label: "Right" }
], J = [
  { id: "shop-page", label: "Shop Page" },
  { id: "catalog", label: "Catalog" },
  { id: "layouts", label: "Layouts" },
  { id: "product-pages", label: "Product Pages" },
  { id: "checkout", label: "Checkout" }
];
function te({ serverUrl: g, apiKey: s, authManager: c }) {
  const [m, W] = h("shop-page"), [o, n] = h(C), [B, L] = h(!0), [N, D] = h(!0), [R, y] = h(null), f = z(async () => {
    try {
      y(null);
      let e;
      const r = "/admin/config/shop";
      if (c?.isAuthenticated())
        e = await c.fetchWithAuth(r);
      else {
        const i = { "Content-Type": "application/json" };
        s && (i["X-API-Key"] = s);
        const l = await fetch(`${g}${r}`, { headers: i });
        if (!l.ok) throw new Error(`Failed to fetch settings: ${l.status}`);
        e = await l.json();
      }
      n({ ...C, ...e.config });
    } catch {
      n(C), y("Could not load saved settings. Showing defaults.");
    } finally {
      L(!1), setTimeout(() => D(!1), 100);
    }
  }, [g, s, c]);
  j(() => {
    f();
  }, [f]);
  const A = z(async (e) => {
    const r = "/admin/config/shop", i = JSON.stringify({ config: e });
    try {
      if (c?.isAuthenticated())
        await c.fetchWithAuth(r, { method: "PUT", body: i });
      else {
        const l = { "Content-Type": "application/json" };
        s && (l["X-API-Key"] = s);
        const p = await fetch(`${g}${r}`, { method: "PUT", headers: l, body: i });
        if (!p.ok) throw new Error(`Failed to save settings: ${p.status}`);
      }
    } catch {
      throw y("Failed to save storefront settings"), new Error("Save failed");
    }
  }, [g, s, c]), { status: E, error: O } = q({
    data: o,
    onSave: A,
    debounceMs: 1500,
    enabled: !N
  }), $ = (e) => {
    n((r) => ({
      ...r,
      relatedProducts: { ...r.relatedProducts, mode: e }
    }));
  }, F = (e) => {
    n((r) => ({
      ...r,
      relatedProducts: { ...r.relatedProducts, maxItems: e }
    }));
  }, P = (e, r) => {
    n((i) => ({
      ...i,
      relatedProducts: {
        ...i.relatedProducts,
        layout: { ...i.relatedProducts.layout, [e]: r }
      }
    }));
  }, v = (e, r) => {
    n((i) => ({
      ...i,
      catalog: {
        ...i.catalog,
        filters: { ...i.catalog.filters, [e]: r }
      }
    }));
  }, b = (e, r) => {
    const i = o.catalog.sort, l = Object.values(i).filter(Boolean).length;
    !r && l <= 1 || n((p) => ({
      ...p,
      catalog: {
        ...p.catalog,
        sort: { ...p.catalog.sort, [e]: r }
      }
    }));
  }, M = (e, r) => {
    n((i) => ({
      ...i,
      checkout: { ...i.checkout, [e]: r }
    }));
  }, w = (e, r) => {
    n((i) => ({
      ...i,
      shopLayout: { ...i.shopLayout, [e]: r }
    }));
  }, I = (e, r) => {
    n((i) => ({
      ...i,
      categoryLayout: { ...i.categoryLayout, [e]: r }
    }));
  }, u = (e, r) => {
    n((i) => ({
      ...i,
      sections: { ...i.sections, [e]: r }
    }));
  }, S = (e, r) => {
    n((i) => ({
      ...i,
      inventory: { ...i.inventory, [e]: r }
    }));
  }, T = (e, r) => {
    n((i) => ({
      ...i,
      shopPage: { ...i.shopPage, [e]: r }
    }));
  };
  return B ? /* @__PURE__ */ t("div", { className: "cedros-admin__section", children: /* @__PURE__ */ a("div", { className: "cedros-admin__loading", children: [
    H.loading,
    " Loading storefront settings..."
  ] }) }) : /* @__PURE__ */ a("div", { className: "cedros-admin__storefront-settings", children: [
    /* @__PURE__ */ a("div", { className: "cedros-admin__page-header", style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" }, children: [
      /* @__PURE__ */ a("div", { children: [
        /* @__PURE__ */ t("h2", { className: "cedros-admin__page-title", children: "Storefront" }),
        /* @__PURE__ */ t("p", { className: "cedros-admin__page-description", children: "Configure catalog filters, product layouts, and checkout settings." })
      ] }),
      /* @__PURE__ */ a("div", { style: { display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }, children: [
        /* @__PURE__ */ t("span", { style: { fontSize: "0.875rem", color: o.enabled ? "var(--cedros-admin-text, #171717)" : "var(--cedros-admin-muted, #737373)" }, children: o.enabled ? "Enabled" : "Disabled" }),
        /* @__PURE__ */ t(d, { checked: o.enabled, onChange: (e) => n((r) => ({ ...r, enabled: e })) })
      ] })
    ] }),
    !o.enabled && /* @__PURE__ */ t(
      "div",
      {
        style: {
          padding: "0.75rem 1rem",
          marginBottom: "1rem",
          backgroundColor: "var(--cedros-admin-warning-bg, #fef3c7)",
          border: "1px solid var(--cedros-admin-warning-border, #f59e0b)",
          borderRadius: "0.375rem",
          fontSize: "0.875rem",
          color: "var(--cedros-admin-warning-text, #92400e)"
        },
        children: "The storefront is disabled. Enable it using the toggle above to activate your store."
      }
    ),
    /* @__PURE__ */ a("div", { className: "cedros-admin__tabs cedros-admin__tabs--line", style: { opacity: o.enabled ? 1 : 0.5, pointerEvents: o.enabled ? "auto" : "none" }, children: [
      J.map((e) => /* @__PURE__ */ t(
        "button",
        {
          type: "button",
          className: `cedros-admin__tab ${m === e.id ? "cedros-admin__tab--active" : ""}`,
          onClick: () => W(e.id),
          children: e.label
        },
        e.id
      )),
      /* @__PURE__ */ t("div", { style: { flex: 1 } }),
      /* @__PURE__ */ t(X, { status: E, error: O })
    ] }),
    /* @__PURE__ */ t(V, { message: R, onRetry: f }),
    m === "shop-page" && /* @__PURE__ */ a("div", { className: "cedros-admin__section", style: { marginTop: "1rem" }, children: [
      /* @__PURE__ */ t("h4", { style: { marginBottom: "0.5rem", fontWeight: 600 }, children: "Shop Page Content" }),
      /* @__PURE__ */ t("p", { style: { marginBottom: "1.5rem", fontSize: 14, opacity: 0.7 }, children: "Customize the title and description shown on your shop page." }),
      /* @__PURE__ */ a("div", { className: "cedros-admin__field", style: { marginBottom: "1.5rem" }, children: [
        /* @__PURE__ */ t("label", { className: "cedros-admin__field-label", children: "Page Title" }),
        /* @__PURE__ */ t(
          "input",
          {
            type: "text",
            className: "cedros-admin__input",
            value: o.shopPage.title,
            onChange: (e) => T("title", e.target.value),
            placeholder: "Shop"
          }
        ),
        /* @__PURE__ */ t("p", { style: { margin: "0.25rem 0 0", fontSize: 12, opacity: 0.6 }, children: "The main heading displayed on your shop page." })
      ] }),
      /* @__PURE__ */ a("div", { className: "cedros-admin__field", children: [
        /* @__PURE__ */ t("label", { className: "cedros-admin__field-label", children: "Page Description" }),
        /* @__PURE__ */ t(
          "textarea",
          {
            className: "cedros-admin__textarea",
            value: o.shopPage.description,
            onChange: (e) => T("description", e.target.value),
            placeholder: "Browse our collection of products...",
            rows: 3,
            style: { resize: "vertical" }
          }
        ),
        /* @__PURE__ */ t("p", { style: { margin: "0.25rem 0 0", fontSize: 12, opacity: 0.6 }, children: "A short description or subtitle shown below the title. Leave empty to hide." })
      ] })
    ] }),
    m === "catalog" && /* @__PURE__ */ a("div", { className: "cedros-admin__section", style: { marginTop: "1rem" }, children: [
      /* @__PURE__ */ a("div", { children: [
        /* @__PURE__ */ t("h4", { style: { marginBottom: "0.5rem", fontWeight: 600 }, children: "Catalog Filters" }),
        /* @__PURE__ */ t("p", { style: { marginBottom: "1rem", fontSize: 14, opacity: 0.7 }, children: "Choose which filters appear in the shop and category page sidebars." }),
        /* @__PURE__ */ a("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem" }, children: [
          /* @__PURE__ */ a("div", { style: { display: "flex", alignItems: "center", gap: "0.75rem" }, children: [
            /* @__PURE__ */ t(
              d,
              {
                checked: o.catalog.filters.tags,
                onChange: (e) => v("tags", e)
              }
            ),
            /* @__PURE__ */ a("div", { children: [
              /* @__PURE__ */ t("span", { style: { fontWeight: 500 }, children: "Tags" }),
              /* @__PURE__ */ t("p", { style: { margin: "0.125rem 0 0", fontSize: 13, opacity: 0.6 }, children: "Filter products by tags (multi-select checkboxes)" })
            ] })
          ] }),
          /* @__PURE__ */ a("div", { style: { display: "flex", alignItems: "center", gap: "0.75rem" }, children: [
            /* @__PURE__ */ t(
              d,
              {
                checked: o.catalog.filters.priceRange,
                onChange: (e) => v("priceRange", e)
              }
            ),
            /* @__PURE__ */ a("div", { children: [
              /* @__PURE__ */ t("span", { style: { fontWeight: 500 }, children: "Price Range" }),
              /* @__PURE__ */ t("p", { style: { margin: "0.125rem 0 0", fontSize: 13, opacity: 0.6 }, children: "Filter by minimum and maximum price" })
            ] })
          ] }),
          /* @__PURE__ */ a("div", { style: { display: "flex", alignItems: "center", gap: "0.75rem" }, children: [
            /* @__PURE__ */ t(
              d,
              {
                checked: o.catalog.filters.inStock,
                onChange: (e) => v("inStock", e)
              }
            ),
            /* @__PURE__ */ a("div", { children: [
              /* @__PURE__ */ t("span", { style: { fontWeight: 500 }, children: "In Stock" }),
              /* @__PURE__ */ t("p", { style: { margin: "0.125rem 0 0", fontSize: 13, opacity: 0.6 }, children: "Show only products that are in stock" })
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ a("div", { style: { marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1px solid var(--cedros-admin-border, #e5e5e5)" }, children: [
        /* @__PURE__ */ t("h4", { style: { marginBottom: "0.5rem", fontWeight: 600 }, children: "Sort Options" }),
        /* @__PURE__ */ t("p", { style: { marginBottom: "1rem", fontSize: 14, opacity: 0.7 }, children: "Choose which sort options appear in the shop and category pages. At least one must be enabled." }),
        /* @__PURE__ */ a("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem" }, children: [
          /* @__PURE__ */ a("div", { style: { display: "flex", alignItems: "center", gap: "0.75rem" }, children: [
            /* @__PURE__ */ t(
              d,
              {
                checked: o.catalog.sort.featured,
                onChange: (e) => b("featured", e)
              }
            ),
            /* @__PURE__ */ a("div", { children: [
              /* @__PURE__ */ t("span", { style: { fontWeight: 500 }, children: "Featured" }),
              /* @__PURE__ */ t("p", { style: { margin: "0.125rem 0 0", fontSize: 13, opacity: 0.6 }, children: "Default sort order (as returned by backend)" })
            ] })
          ] }),
          /* @__PURE__ */ a("div", { style: { display: "flex", alignItems: "center", gap: "0.75rem" }, children: [
            /* @__PURE__ */ t(
              d,
              {
                checked: o.catalog.sort.priceAsc,
                onChange: (e) => b("priceAsc", e)
              }
            ),
            /* @__PURE__ */ a("div", { children: [
              /* @__PURE__ */ t("span", { style: { fontWeight: 500 }, children: "Price: Low to High" }),
              /* @__PURE__ */ t("p", { style: { margin: "0.125rem 0 0", fontSize: 13, opacity: 0.6 }, children: "Sort products by price ascending" })
            ] })
          ] }),
          /* @__PURE__ */ a("div", { style: { display: "flex", alignItems: "center", gap: "0.75rem" }, children: [
            /* @__PURE__ */ t(
              d,
              {
                checked: o.catalog.sort.priceDesc,
                onChange: (e) => b("priceDesc", e)
              }
            ),
            /* @__PURE__ */ a("div", { children: [
              /* @__PURE__ */ t("span", { style: { fontWeight: 500 }, children: "Price: High to Low" }),
              /* @__PURE__ */ t("p", { style: { margin: "0.125rem 0 0", fontSize: 13, opacity: 0.6 }, children: "Sort products by price descending" })
            ] })
          ] })
        ] })
      ] })
    ] }),
    m === "layouts" && /* @__PURE__ */ a("div", { className: "cedros-admin__section", style: { marginTop: "1rem" }, children: [
      /* @__PURE__ */ t("h4", { style: { marginBottom: "0.5rem", fontWeight: 600 }, children: "Product Layouts" }),
      /* @__PURE__ */ t("p", { style: { marginBottom: "1.5rem", fontSize: 14, opacity: 0.7 }, children: "Configure product card layouts for shop and category pages." }),
      /* @__PURE__ */ a("div", { style: { marginBottom: "2rem" }, children: [
        /* @__PURE__ */ t("div", { style: { fontWeight: 500, marginBottom: "0.75rem" }, children: "Shop Page" }),
        /* @__PURE__ */ t("div", { style: { display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }, children: _.map((e) => {
          const r = o.shopLayout.layout === e.value;
          return /* @__PURE__ */ a(
            "label",
            {
              style: {
                display: "flex",
                alignItems: "flex-start",
                gap: "0.75rem",
                padding: "0.75rem",
                border: `2px solid ${r ? "var(--cedros-admin-primary, #171717)" : "var(--cedros-admin-border, #e5e5e5)"}`,
                borderRadius: 6,
                cursor: "pointer",
                background: r ? "var(--cedros-admin-bg-accent, #f5f5f5)" : void 0,
                transition: "border-color 0.15s, background 0.15s"
              },
              children: [
                /* @__PURE__ */ t(
                  "input",
                  {
                    type: "radio",
                    name: "shopLayout",
                    value: e.value,
                    checked: r,
                    onChange: () => w("layout", e.value),
                    style: { marginTop: 2 }
                  }
                ),
                /* @__PURE__ */ a("div", { children: [
                  /* @__PURE__ */ t("span", { style: { fontWeight: 500 }, children: e.label }),
                  /* @__PURE__ */ t("p", { style: { margin: "0.125rem 0 0", fontSize: 12, opacity: 0.6 }, children: e.description })
                ] })
              ]
            },
            e.value
          );
        }) }),
        /* @__PURE__ */ t(
          x,
          {
            value: o.shopLayout.imageCrop,
            onChange: (e) => w("imageCrop", e),
            options: k,
            label: "Image Crop",
            style: { maxWidth: 180 }
          }
        )
      ] }),
      /* @__PURE__ */ a("div", { style: { paddingTop: "1.5rem", borderTop: "1px solid var(--cedros-admin-border, #e5e5e5)" }, children: [
        /* @__PURE__ */ t("div", { style: { fontWeight: 500, marginBottom: "0.75rem" }, children: "Category Pages" }),
        /* @__PURE__ */ t("div", { style: { display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }, children: _.map((e) => {
          const r = o.categoryLayout.layout === e.value;
          return /* @__PURE__ */ a(
            "label",
            {
              style: {
                display: "flex",
                alignItems: "flex-start",
                gap: "0.75rem",
                padding: "0.75rem",
                border: `2px solid ${r ? "var(--cedros-admin-primary, #171717)" : "var(--cedros-admin-border, #e5e5e5)"}`,
                borderRadius: 6,
                cursor: "pointer",
                background: r ? "var(--cedros-admin-bg-accent, #f5f5f5)" : void 0,
                transition: "border-color 0.15s, background 0.15s"
              },
              children: [
                /* @__PURE__ */ t(
                  "input",
                  {
                    type: "radio",
                    name: "categoryLayout",
                    value: e.value,
                    checked: r,
                    onChange: () => I("layout", e.value),
                    style: { marginTop: 2 }
                  }
                ),
                /* @__PURE__ */ a("div", { children: [
                  /* @__PURE__ */ t("span", { style: { fontWeight: 500 }, children: e.label }),
                  /* @__PURE__ */ t("p", { style: { margin: "0.125rem 0 0", fontSize: 12, opacity: 0.6 }, children: e.description })
                ] })
              ]
            },
            e.value
          );
        }) }),
        /* @__PURE__ */ t(
          x,
          {
            value: o.categoryLayout.imageCrop,
            onChange: (e) => I("imageCrop", e),
            options: k,
            label: "Image Crop",
            style: { maxWidth: 180 }
          }
        )
      ] })
    ] }),
    m === "product-pages" && /* @__PURE__ */ a("div", { className: "cedros-admin__section", style: { marginTop: "1rem" }, children: [
      /* @__PURE__ */ a("div", { children: [
        /* @__PURE__ */ t("h4", { style: { marginBottom: "0.5rem", fontWeight: 600 }, children: "Related Products" }),
        /* @__PURE__ */ t("p", { style: { marginBottom: "1rem", fontSize: 14, opacity: 0.7 }, children: "Configure how related products are displayed on product detail pages." }),
        /* @__PURE__ */ t("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }, children: G.map((e) => {
          const r = o.relatedProducts.mode === e.value, i = e.badge === "Coming Soon";
          return /* @__PURE__ */ a(
            "label",
            {
              style: {
                display: "flex",
                alignItems: "flex-start",
                gap: "0.75rem",
                padding: "1rem",
                border: `2px solid ${r ? "var(--cedros-admin-primary, #171717)" : "var(--cedros-admin-border, #e5e5e5)"}`,
                borderRadius: 8,
                cursor: i ? "not-allowed" : "pointer",
                opacity: i ? 0.6 : 1,
                background: r ? "var(--cedros-admin-bg-accent, #f5f5f5)" : void 0,
                transition: "border-color 0.15s, background 0.15s"
              },
              children: [
                /* @__PURE__ */ t(
                  "input",
                  {
                    type: "radio",
                    name: "relatedProductsMode",
                    value: e.value,
                    checked: r,
                    onChange: () => !i && $(e.value),
                    disabled: i,
                    style: { marginTop: 2 }
                  }
                ),
                /* @__PURE__ */ a("div", { style: { flex: 1 }, children: [
                  /* @__PURE__ */ a("div", { style: { display: "flex", alignItems: "center", gap: "0.5rem" }, children: [
                    /* @__PURE__ */ t("span", { style: { fontWeight: 600 }, children: e.label }),
                    e.badge && /* @__PURE__ */ t(
                      "span",
                      {
                        style: {
                          fontSize: 11,
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: "#6366f1",
                          color: "#fff"
                        },
                        children: e.badge
                      }
                    )
                  ] }),
                  /* @__PURE__ */ t("p", { style: { margin: "0.25rem 0 0", fontSize: 13, opacity: 0.75 }, children: e.description })
                ] })
              ]
            },
            e.value
          );
        }) }),
        o.relatedProducts.mode === "manual" && /* @__PURE__ */ a(
          "div",
          {
            style: {
              padding: "1rem",
              marginBottom: "1.5rem",
              background: "var(--cedros-admin-bg-accent, #f5f5f5)",
              borderRadius: 8,
              border: "1px solid var(--cedros-admin-border, #e5e5e5)"
            },
            children: [
              /* @__PURE__ */ t("strong", { style: { fontSize: 14 }, children: "How to set related products:" }),
              /* @__PURE__ */ a("p", { style: { margin: "0.5rem 0 0", fontSize: 13, opacity: 0.8 }, children: [
                "When editing a product, add a ",
                /* @__PURE__ */ t("code", { style: { background: "rgba(0,0,0,0.1)", padding: "2px 4px", borderRadius: 3 }, children: "relatedProductIds" }),
                " field to its metadata containing a comma-separated list of product IDs."
              ] }),
              /* @__PURE__ */ a("p", { style: { margin: "0.5rem 0 0", fontSize: 13, opacity: 0.6 }, children: [
                "Example: ",
                /* @__PURE__ */ t("code", { style: { background: "rgba(0,0,0,0.1)", padding: "2px 4px", borderRadius: 3 }, children: "prod_123,prod_456,prod_789" })
              ] })
            ]
          }
        ),
        /* @__PURE__ */ a("div", { className: "cedros-admin__field", style: { maxWidth: 200 }, children: [
          /* @__PURE__ */ t("label", { className: "cedros-admin__field-label", children: "Max Related Products" }),
          /* @__PURE__ */ t(
            "input",
            {
              type: "number",
              className: "cedros-admin__input",
              value: o.relatedProducts.maxItems,
              onChange: (e) => F(Math.max(1, Math.min(12, parseInt(e.target.value) || 4))),
              min: 1,
              max: 12
            }
          ),
          /* @__PURE__ */ t("p", { style: { margin: "0.25rem 0 0", fontSize: 12, opacity: 0.6 }, children: "How many related products to show (1-12)" })
        ] }),
        /* @__PURE__ */ a("div", { style: { marginTop: "1.5rem" }, children: [
          /* @__PURE__ */ t("div", { style: { fontWeight: 500, marginBottom: "0.75rem" }, children: "Display Layout" }),
          /* @__PURE__ */ t("div", { style: { display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }, children: _.map((e) => {
            const r = o.relatedProducts.layout.layout === e.value;
            return /* @__PURE__ */ a(
              "label",
              {
                style: {
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.75rem",
                  padding: "0.75rem",
                  border: `2px solid ${r ? "var(--cedros-admin-primary, #171717)" : "var(--cedros-admin-border, #e5e5e5)"}`,
                  borderRadius: 6,
                  cursor: "pointer",
                  background: r ? "var(--cedros-admin-bg-accent, #f5f5f5)" : void 0,
                  transition: "border-color 0.15s, background 0.15s"
                },
                children: [
                  /* @__PURE__ */ t(
                    "input",
                    {
                      type: "radio",
                      name: "relatedLayout",
                      value: e.value,
                      checked: r,
                      onChange: () => P("layout", e.value),
                      style: { marginTop: 2 }
                    }
                  ),
                  /* @__PURE__ */ a("div", { children: [
                    /* @__PURE__ */ t("span", { style: { fontWeight: 500 }, children: e.label }),
                    /* @__PURE__ */ t("p", { style: { margin: "0.125rem 0 0", fontSize: 12, opacity: 0.6 }, children: e.description })
                  ] })
                ]
              },
              e.value
            );
          }) }),
          /* @__PURE__ */ t(
            x,
            {
              value: o.relatedProducts.layout.imageCrop,
              onChange: (e) => P("imageCrop", e),
              options: k,
              label: "Image Crop",
              style: { maxWidth: 180 }
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ a("div", { style: { marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1px solid var(--cedros-admin-border, #e5e5e5)" }, children: [
        /* @__PURE__ */ t("h4", { style: { marginBottom: "0.5rem", fontWeight: 600 }, children: "Page Sections" }),
        /* @__PURE__ */ t("p", { style: { marginBottom: "1rem", fontSize: 14, opacity: 0.7 }, children: "Choose which sections appear on product detail pages." }),
        /* @__PURE__ */ a("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem" }, children: [
          /* @__PURE__ */ a("div", { style: { display: "flex", alignItems: "center", gap: "0.75rem" }, children: [
            /* @__PURE__ */ t(
              d,
              {
                checked: o.sections.showDescription,
                onChange: (e) => u("showDescription", e)
              }
            ),
            /* @__PURE__ */ a("div", { children: [
              /* @__PURE__ */ t("span", { style: { fontWeight: 500 }, children: "Description" }),
              /* @__PURE__ */ t("p", { style: { margin: "0.125rem 0 0", fontSize: 13, opacity: 0.6 }, children: "Expandable description accordion" })
            ] })
          ] }),
          /* @__PURE__ */ a("div", { style: { display: "flex", alignItems: "center", gap: "0.75rem" }, children: [
            /* @__PURE__ */ t(
              d,
              {
                checked: o.sections.showSpecs,
                onChange: (e) => u("showSpecs", e)
              }
            ),
            /* @__PURE__ */ a("div", { children: [
              /* @__PURE__ */ t("span", { style: { fontWeight: 500 }, children: "Specifications" }),
              /* @__PURE__ */ t("p", { style: { margin: "0.125rem 0 0", fontSize: 13, opacity: 0.6 }, children: "Product attributes and details" })
            ] })
          ] }),
          /* @__PURE__ */ a("div", { style: { display: "flex", alignItems: "center", gap: "0.75rem" }, children: [
            /* @__PURE__ */ t(
              d,
              {
                checked: o.sections.showShipping,
                onChange: (e) => u("showShipping", e)
              }
            ),
            /* @__PURE__ */ a("div", { children: [
              /* @__PURE__ */ t("span", { style: { fontWeight: 500 }, children: "Shipping & Returns" }),
              /* @__PURE__ */ t("p", { style: { margin: "0.125rem 0 0", fontSize: 13, opacity: 0.6 }, children: "Shipping and return policy information" })
            ] })
          ] }),
          /* @__PURE__ */ a("div", { style: { display: "flex", alignItems: "center", gap: "0.75rem" }, children: [
            /* @__PURE__ */ t(
              d,
              {
                checked: o.sections.showRelatedProducts,
                onChange: (e) => u("showRelatedProducts", e)
              }
            ),
            /* @__PURE__ */ a("div", { children: [
              /* @__PURE__ */ t("span", { style: { fontWeight: 500 }, children: "Related Products" }),
              /* @__PURE__ */ t("p", { style: { margin: "0.125rem 0 0", fontSize: 13, opacity: 0.6 }, children: "Product recommendations section" })
            ] })
          ] })
        ] })
      ] })
    ] }),
    m === "checkout" && /* @__PURE__ */ a("div", { className: "cedros-admin__section", style: { marginTop: "1rem" }, children: [
      /* @__PURE__ */ a("div", { children: [
        /* @__PURE__ */ t("h4", { style: { marginBottom: "0.5rem", fontWeight: 600 }, children: "Checkout Settings" }),
        /* @__PURE__ */ t("p", { style: { marginBottom: "1rem", fontSize: 14, opacity: 0.7 }, children: "Configure checkout and cart page features." }),
        /* @__PURE__ */ t("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem" }, children: /* @__PURE__ */ a("div", { style: { display: "flex", alignItems: "center", gap: "0.75rem" }, children: [
          /* @__PURE__ */ t(
            d,
            {
              checked: o.checkout.promoCodes,
              onChange: (e) => M("promoCodes", e)
            }
          ),
          /* @__PURE__ */ a("div", { children: [
            /* @__PURE__ */ t("span", { style: { fontWeight: 500 }, children: "Promo Codes" }),
            /* @__PURE__ */ t("p", { style: { margin: "0.125rem 0 0", fontSize: 13, opacity: 0.6 }, children: "Show promo/coupon code input on cart and checkout pages" })
          ] })
        ] }) })
      ] }),
      /* @__PURE__ */ a("div", { style: { marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1px solid var(--cedros-admin-border, #e5e5e5)" }, children: [
        /* @__PURE__ */ t("h4", { style: { marginBottom: "0.5rem", fontWeight: 600 }, children: "Inventory Settings" }),
        /* @__PURE__ */ t("p", { style: { marginBottom: "1rem", fontSize: 14, opacity: 0.7 }, children: "Configure inventory verification and reservation behavior." }),
        /* @__PURE__ */ a("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem" }, children: [
          /* @__PURE__ */ a("div", { style: { display: "flex", alignItems: "center", gap: "0.75rem" }, children: [
            /* @__PURE__ */ t(
              d,
              {
                checked: o.inventory.preCheckoutVerification,
                onChange: (e) => S("preCheckoutVerification", e)
              }
            ),
            /* @__PURE__ */ a("div", { children: [
              /* @__PURE__ */ t("span", { style: { fontWeight: 500 }, children: "Pre-Checkout Verification" }),
              /* @__PURE__ */ t("p", { style: { margin: "0.125rem 0 0", fontSize: 13, opacity: 0.6 }, children: "Verify inventory availability before processing payment" })
            ] })
          ] }),
          /* @__PURE__ */ a("div", { style: { display: "flex", alignItems: "center", gap: "0.75rem" }, children: [
            /* @__PURE__ */ t(
              d,
              {
                checked: o.inventory.holdsEnabled,
                onChange: (e) => S("holdsEnabled", e)
              }
            ),
            /* @__PURE__ */ a("div", { children: [
              /* @__PURE__ */ t("span", { style: { fontWeight: 500 }, children: "Inventory Holds" }),
              /* @__PURE__ */ t("p", { style: { margin: "0.125rem 0 0", fontSize: 13, opacity: 0.6 }, children: "Reserve inventory when items are added to cart" })
            ] })
          ] })
        ] }),
        o.inventory.holdsEnabled && /* @__PURE__ */ a("div", { className: "cedros-admin__field", style: { maxWidth: 200, marginTop: "1rem" }, children: [
          /* @__PURE__ */ t("label", { className: "cedros-admin__field-label", children: "Hold Duration (minutes)" }),
          /* @__PURE__ */ t(
            "input",
            {
              type: "number",
              className: "cedros-admin__input",
              value: o.inventory.holdDurationMinutes,
              onChange: (e) => S("holdDurationMinutes", Math.max(5, Math.min(60, parseInt(e.target.value) || 15))),
              min: 5,
              max: 60
            }
          ),
          /* @__PURE__ */ t("p", { style: { margin: "0.25rem 0 0", fontSize: 12, opacity: 0.6 }, children: "How long to reserve inventory in carts (5-60 minutes)" })
        ] })
      ] })
    ] })
  ] });
}
export {
  te as StorefrontSection
};
