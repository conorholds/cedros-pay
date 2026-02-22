import { jsxs as n, jsx as i } from "react/jsx-runtime";
import { useState as g } from "react";
import { S as l } from "./SingleCategorySettings-BIEs6s6Z.mjs";
const s = [
  {
    id: "logging",
    label: "Logging",
    category: "logging",
    description: "Configure log levels, format, and environment settings."
  },
  {
    id: "metrics",
    label: "Metrics",
    category: "metrics",
    description: "Configure metrics collection and API access for monitoring."
  },
  {
    id: "security",
    label: "Security",
    category: "security",
    description: "Configure CORS, rate limiting, and other security settings."
  }
];
function u({ serverUrl: c, apiKey: o, authManager: a }) {
  const [r, d] = g("logging"), t = s.find((e) => e.id === r);
  return /* @__PURE__ */ n("div", { className: "cedros-admin__server-settings", children: [
    /* @__PURE__ */ n("div", { className: "cedros-admin__page-header", children: [
      /* @__PURE__ */ i("h2", { className: "cedros-admin__page-title", children: "Store Server" }),
      /* @__PURE__ */ i("p", { className: "cedros-admin__page-description", children: "Configure logging, metrics, and security settings." })
    ] }),
    /* @__PURE__ */ i("div", { className: "cedros-admin__tabs cedros-admin__tabs--line", children: s.map((e) => /* @__PURE__ */ i(
      "button",
      {
        type: "button",
        className: `cedros-admin__tab ${r === e.id ? "cedros-admin__tab--active" : ""}`,
        onClick: () => d(e.id),
        children: e.label
      },
      e.id
    )) }),
    /* @__PURE__ */ i("div", { style: { marginTop: "1rem" }, children: /* @__PURE__ */ i(
      l,
      {
        serverUrl: c,
        apiKey: o,
        authManager: a,
        category: t.category,
        title: `${t.label} Settings`,
        description: t.description
      },
      t.category
    ) })
  ] });
}
export {
  u as SettingsSection
};
