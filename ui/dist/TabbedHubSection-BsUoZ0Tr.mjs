import { b as R, a as M } from "./formatting-Dr0N4Iyb.mjs";
import { jsx as t, jsxs as o } from "react/jsx-runtime";
import { I as x, a as S, p as C, r as E } from "./plugin-C2z5irXJ.mjs";
import { useState as w, useCallback as $, useMemo as L, useId as H, useRef as j, useEffect as T } from "react";
function U(e, a) {
  return M(e, a);
}
function W(e, a) {
  return R(e, a);
}
function G({ stats: e, isLoading: a = !1 }) {
  return /* @__PURE__ */ t("div", { className: "cedros-admin__stats-bar", "aria-busy": a, children: /* @__PURE__ */ t("div", { className: "cedros-data-summary-grid cedros-admin__stats-bar-grid", children: e.map((r, s) => /* @__PURE__ */ o("div", { className: "cedros-data-metric cedros-admin__stats-bar-item", children: [
    /* @__PURE__ */ t("span", { className: "cedros-data-metric__label cedros-admin__stats-bar-label", children: r.label }),
    /* @__PURE__ */ t("span", { className: `cedros-data-metric__value cedros-admin__stats-bar-value ${r.variant ? `cedros-admin__stats-bar-value--${r.variant}` : ""}`, children: a ? /* @__PURE__ */ t("span", { className: "cedros-admin__skeleton cedros-admin__skeleton--value" }) : typeof r.value == "number" ? new Intl.NumberFormat().format(r.value) : r.value }),
    r.description && /* @__PURE__ */ t("span", { className: "cedros-data-metric__hint cedros-admin__stats-bar-desc", children: r.description })
  ] }, s)) }) });
}
function I({
  label: e,
  sortKey: a,
  activeKey: r,
  direction: s,
  onSort: d,
  style: i
}) {
  const m = r === a;
  return /* @__PURE__ */ t("th", { "aria-sort": m ? s === "asc" ? "ascending" : "descending" : "none", style: i, children: /* @__PURE__ */ o("button", { type: "button", className: "cedros-data-table__sort cedros-admin__table-sort", onClick: () => d(a), children: [
    /* @__PURE__ */ t("span", { children: e }),
    /* @__PURE__ */ t(
      "span",
      {
        className: `cedros-admin__sort-icon ${m ? "" : "cedros-admin__sort-icon--idle"}`,
        "aria-hidden": "true",
        children: m && s === "desc" ? x.chevronDown : x.chevronUp
      }
    )
  ] }) });
}
function B({
  title: e,
  description: a,
  action: r,
  inTable: s = !1,
  variant: d = "block"
}) {
  return d !== "block" ? /* @__PURE__ */ o("div", { className: `cedros-data-empty-state cedros-data-empty ${s ? "cedros-data-empty-state--in-table " : ""}cedros-admin__empty cedros-admin__empty--${d}`, role: "status", children: [
    /* @__PURE__ */ t("span", { children: a ?? e }),
    r
  ] }) : /* @__PURE__ */ o("div", { className: `cedros-data-empty-state cedros-data-empty ${s ? "cedros-data-empty-state--in-table " : ""}cedros-admin__empty cedros-admin__empty--block`, children: [
    /* @__PURE__ */ t("span", { className: "cedros-data-empty-state__illustration", "aria-hidden": "true", children: /* @__PURE__ */ o("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
      /* @__PURE__ */ t("path", { d: "M4 4h16v16H4z" }),
      /* @__PURE__ */ t("path", { d: "M8 8h8M8 12h8M8 16h5" })
    ] }) }),
    /* @__PURE__ */ t("span", { className: "cedros-admin__empty-title", children: e }),
    a ? /* @__PURE__ */ t("span", { className: "cedros-data-empty-state__copy cedros-admin__empty-text", children: a }) : null,
    r ? /* @__PURE__ */ t("div", { className: "cedros-data-empty-state__action cedros-admin__empty-action", children: r }) : null
  ] });
}
function J({
  columns: e,
  label: a,
  rows: r = 3
}) {
  return Array.from({ length: r }, (s, d) => /* @__PURE__ */ t("tr", { className: "cedros-admin__table-skeleton-row", children: Array.from({ length: e }, (i, m) => /* @__PURE__ */ o("td", { children: [
    d === 0 && m === 0 ? /* @__PURE__ */ t("span", { className: "cedros-admin__visually-hidden", role: "status", children: a }) : null,
    /* @__PURE__ */ t("span", { className: "cedros-admin__table-skeleton-cell", "aria-hidden": "true" })
  ] }, m)) }, `loading-${d}`));
}
function P({
  action: e,
  columns: a,
  description: r,
  filtered: s = !1,
  title: d
}) {
  return /* @__PURE__ */ t("tr", { className: "cedros-admin__table-state-row", children: /* @__PURE__ */ t("td", { colSpan: a, className: "cedros-admin__table-state-cell", children: /* @__PURE__ */ t(
    B,
    {
      action: e,
      description: r,
      inTable: !0,
      title: d,
      variant: s ? "filtered" : "block"
    }
  ) }) });
}
function Q({
  columns: e,
  message: a,
  onRetry: r
}) {
  return /* @__PURE__ */ t("tr", { className: "cedros-admin__table-state-row", children: /* @__PURE__ */ t("td", { colSpan: e, className: "cedros-admin__table-state-cell", children: /* @__PURE__ */ o("div", { className: "cedros-data-status cedros-data-status--error", role: "alert", children: [
    /* @__PURE__ */ t("span", { children: a }),
    /* @__PURE__ */ t("div", { className: "cedros-data-status__actions", children: /* @__PURE__ */ t("button", { type: "button", className: "cedros-data-btn cedros-data-btn--secondary cedros-data-btn--sm", onClick: r, children: "Retry" }) })
  ] }) }) });
}
function K(e, a) {
  const r = e == null, s = a == null;
  return r && s ? 0 : r ? 1 : s ? -1 : typeof e == "number" && typeof a == "number" ? e - a : String(e).localeCompare(String(a), void 0, { numeric: !0, sensitivity: "base" });
}
function V(e, a, r = null) {
  const [s, d] = w({
    key: r?.key ?? null,
    direction: r?.direction ?? "asc"
  }), i = $((c) => {
    d(
      (u) => u.key === c ? { key: c, direction: u.direction === "asc" ? "desc" : "asc" } : { key: c, direction: "asc" }
    );
  }, []);
  return { sorted: L(() => {
    if (!s.key) return e;
    const c = s.direction === "asc" ? 1 : -1, u = s.key;
    return [...e].sort((p, f) => c * K(a(p, u), a(f, u)));
  }, [e, s, a]), sortKey: s.key, sortDirection: s.direction, toggleSort: i };
}
function X({ title: e, description: a, action: r }) {
  return /* @__PURE__ */ o("section", { className: "cedros-data-setup-notice", children: [
    /* @__PURE__ */ o("div", { className: "cedros-data-setup-notice__body", children: [
      /* @__PURE__ */ t("h3", { children: e }),
      /* @__PURE__ */ t("p", { children: a })
    ] }),
    r ? /* @__PURE__ */ t("div", { className: "cedros-data-actions", children: r }) : null
  ] });
}
function g(e, a, r) {
  const s = e.map((i) => i.id), d = E(r, s);
  return d || (a && e.some((i) => i.id === a) ? a : e[0]?.id ?? "");
}
function Y({
  tabs: e,
  title: a,
  description: r,
  defaultTabId: s,
  routeSectionId: d,
  onTabChange: i,
  ...m
}) {
  const [c, u] = w(
    () => g(e, s, d)
  ), p = H(), f = j(/* @__PURE__ */ new Map());
  T(() => {
    if (!d && !s) return;
    const n = g(e, s, d);
    n && n !== c && u(n);
  }, [s, d, e, c]), T(() => {
    if (d)
      return S(() => {
        const n = g(e, s, d);
        n && u(n);
      });
  }, [s, d, e]);
  const v = $(
    (n, _ = {}) => {
      if (u(n), C(d, n), i?.(n), _.focus) {
        const l = f.current.get(n);
        l && queueMicrotask(() => l.focus());
      }
    },
    [i, d]
  ), A = $(
    (n) => {
      const _ = e.findIndex((y) => y.id === c);
      if (_ < 0) return;
      let l = null;
      switch (n.key) {
        case "ArrowRight":
          l = (_ + 1) % e.length;
          break;
        case "ArrowLeft":
          l = (_ - 1 + e.length) % e.length;
          break;
        case "Home":
          l = 0;
          break;
        case "End":
          l = e.length - 1;
          break;
        default:
          return;
      }
      n.preventDefault();
      const b = e[l];
      b && v(b.id, { focus: !0 });
    },
    [e, c, v]
  );
  if (e.length === 0) return null;
  const h = e.find((n) => n.id === c) ?? e[0];
  if (!h) return null;
  const D = h.Component, N = h.title ?? a, k = h.description ?? r;
  return /* @__PURE__ */ o("div", { className: "cedros-data-stack cedros-admin__hub", children: [
    (N || k) && /* @__PURE__ */ t("div", { className: "cedros-admin__page-header cedros-data__header", children: /* @__PURE__ */ o("div", { className: "cedros-data__header-text", children: [
      N && /* @__PURE__ */ t("h2", { className: "cedros-admin__page-title cedros-data__title", children: N }),
      k && /* @__PURE__ */ t("p", { className: "cedros-admin__page-description cedros-data__subtitle", children: k })
    ] }) }),
    /* @__PURE__ */ t(
      "div",
      {
        className: "cedros-data-tabs cedros-data-tabs__list cedros-admin__tabs cedros-admin__tabs--line",
        role: "tablist",
        id: p,
        onKeyDown: A,
        children: e.map((n) => {
          const _ = n.id === h.id, l = `${p}-tab-${n.id}`, b = `${p}-panel-${n.id}`;
          return /* @__PURE__ */ t(
            "button",
            {
              ref: (y) => {
                y ? f.current.set(n.id, y) : f.current.delete(n.id);
              },
              type: "button",
              role: "tab",
              id: l,
              "aria-selected": _,
              "aria-controls": b,
              tabIndex: _ ? 0 : -1,
              className: `cedros-data-tabs__tab cedros-admin__tab ${_ ? "cedros-admin__tab--active" : ""}`,
              onClick: () => v(n.id),
              children: n.label
            },
            n.id
          );
        })
      }
    ),
    /* @__PURE__ */ t(
      "div",
      {
        className: "cedros-data-tabs__panel cedros-admin__hub-body",
        role: "tabpanel",
        id: `${p}-panel-${h.id}`,
        "aria-labelledby": `${p}-tab-${h.id}`,
        tabIndex: 0,
        children: /* @__PURE__ */ t(D, { ...m }, h.id)
      }
    )
  ] });
}
export {
  B as E,
  G as S,
  J as T,
  I as a,
  Q as b,
  P as c,
  X as d,
  Y as e,
  W as f,
  U as g,
  V as u
};
