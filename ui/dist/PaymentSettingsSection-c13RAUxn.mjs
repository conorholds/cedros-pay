import { jsxs as i, jsx as e, Fragment as s } from "react/jsx-runtime";
import { useState as h } from "react";
import { S as m } from "./SingleCategorySettings-BIEs6s6Z.mjs";
function r({ href: o, children: a }) {
  return /* @__PURE__ */ e(
    "a",
    {
      href: o,
      target: "_blank",
      rel: "noopener noreferrer",
      style: { color: "inherit", textDecoration: "underline" },
      children: a
    }
  );
}
const c = [
  {
    id: "stripe",
    label: "Stripe",
    category: "stripe",
    description: /* @__PURE__ */ i(s, { children: [
      "Configure your Stripe integration for card payments. Get your API keys from the",
      " ",
      /* @__PURE__ */ e(r, { href: "https://dashboard.stripe.com/apikeys", children: "Stripe Dashboard" }),
      "."
    ] })
  },
  {
    id: "crypto",
    label: "Crypto",
    category: "x402",
    description: /* @__PURE__ */ i(s, { children: [
      "Configure Solana wallet and token settings for crypto payments. Get a fast RPC endpoint from",
      " ",
      /* @__PURE__ */ e(r, { href: "https://www.helius.dev", children: "Helius" }),
      " or",
      " ",
      /* @__PURE__ */ e(r, { href: "https://www.quicknode.com/chains/sol", children: "QuickNode" }),
      ". Set up a payment address using",
      " ",
      /* @__PURE__ */ e(r, { href: "https://phantom.app", children: "Phantom" }),
      " or",
      " ",
      /* @__PURE__ */ e(r, { href: "https://solflare.com", children: "Solflare" }),
      " wallet."
    ] })
  },
  {
    id: "credits",
    label: "Credits",
    category: "cedros_login",
    description: /* @__PURE__ */ i(s, { children: [
      "Configure Cedros Login integration for credits payments. See the",
      " ",
      /* @__PURE__ */ e(r, { href: "https://docs.cedros.dev/credits", children: "Credits API documentation" }),
      "."
    ] })
  }
];
function u({ serverUrl: o, apiKey: a, authManager: l }) {
  const [d, p] = h("stripe"), n = c.find((t) => t.id === d);
  return /* @__PURE__ */ i("div", { className: "cedros-admin__payment-settings", children: [
    /* @__PURE__ */ i("div", { className: "cedros-admin__page-header", children: [
      /* @__PURE__ */ e("h2", { className: "cedros-admin__page-title", children: "Payment Options" }),
      /* @__PURE__ */ e("p", { className: "cedros-admin__page-description", children: "Configure payment methods including Stripe, crypto, and credits." })
    ] }),
    /* @__PURE__ */ e("div", { className: "cedros-admin__tabs cedros-admin__tabs--line", children: c.map((t) => /* @__PURE__ */ e(
      "button",
      {
        type: "button",
        className: `cedros-admin__tab ${d === t.id ? "cedros-admin__tab--active" : ""}`,
        onClick: () => p(t.id),
        children: t.label
      },
      t.id
    )) }),
    /* @__PURE__ */ e("div", { style: { marginTop: "1rem" }, children: /* @__PURE__ */ e(
      m,
      {
        serverUrl: o,
        apiKey: a,
        authManager: l,
        category: n.category,
        title: `${n.label} Settings`,
        description: n.description,
        showEnabledToggle: !0
      },
      n.category
    ) })
  ] });
}
export {
  u as PaymentSettingsSection
};
