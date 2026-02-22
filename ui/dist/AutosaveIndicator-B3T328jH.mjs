import { jsxs as n, jsx as r, Fragment as i } from "react/jsx-runtime";
import { $ as d } from "./index-C1hbnxn0.mjs";
function l({ status: e, error: a }) {
  return e === "idle" ? null : /* @__PURE__ */ n(
    "span",
    {
      className: `cedros-admin__autosave-indicator cedros-admin__autosave-indicator--${e}`,
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: "0.375rem",
        fontSize: "0.8125rem",
        color: e === "error" ? "var(--cedros-admin-error, #ef4444)" : "var(--cedros-admin-text-muted, #64748b)"
      },
      children: [
        e === "pending" && /* @__PURE__ */ r("span", { style: { opacity: 0.7 }, children: "Unsaved changes" }),
        e === "saving" && /* @__PURE__ */ n(i, { children: [
          d.loading,
          /* @__PURE__ */ r("span", { children: "Saving..." })
        ] }),
        e === "saved" && /* @__PURE__ */ n(i, { children: [
          d.check,
          /* @__PURE__ */ r("span", { style: { color: "var(--cedros-admin-success, #22c55e)" }, children: "Saved" })
        ] }),
        e === "error" && /* @__PURE__ */ n("span", { children: [
          "Save failed",
          a ? `: ${a}` : ""
        ] })
      ]
    }
  );
}
export {
  l as A
};
