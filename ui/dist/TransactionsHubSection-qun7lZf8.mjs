import { jsxs as a, jsx as e, Fragment as X } from "react/jsx-runtime";
import { useState as r, useCallback as W, useEffect as P, useMemo as ve } from "react";
import { u as J, F as ie, E as j, b as Y, L as Se, d as Ne } from "./plugin-C2z5irXJ.mjs";
import { u as $, f as B, S as Q, a as N, T as Z, b as z, c as ee, d as we, e as Re } from "./TabbedHubSection-BsUoZ0Tr.mjs";
import { f as q } from "./adminModules-BgSESzo7.mjs";
import { f as se, s as le, c as Ce, d as Le } from "./formatting-Dr0N4Iyb.mjs";
const ne = (t) => {
  switch (t) {
    case "won":
      return "success";
    case "lost":
      return "failed";
    case "needs_response":
    case "warning_needs_response":
      return "pending";
    default:
      return "muted";
  }
}, re = (t, n) => `${n.toUpperCase()} ${(t / 100).toFixed(2)}`;
function Ie(t, n) {
  switch (n) {
    case "amount":
      return t.amount;
    case "status":
      return t.status;
    case "reason":
      return t.reason ?? "";
    case "source":
      return t.source;
    case "created":
      return t.createdAt;
    default:
      return null;
  }
}
function Te({ pageSize: t = 20, authManager: n }) {
  const [i, m] = r([]), [o, c] = r(!0), [w, v] = r(null), [g, T] = r(0), [l, A] = r("all"), [K, D] = r(null), [k, R] = r(""), [x, y] = r(!1), { sorted: C, sortKey: S, sortDirection: I, toggleSort: h } = $(
    i,
    Ie,
    { key: "created", direction: "desc" }
  ), _ = W(async (s, U) => q(n, s, U), [n]), L = W(async () => {
    c(!0), v(null);
    try {
      const s = new URLSearchParams();
      s.set("limit", String(t)), s.set("offset", String(g)), l !== "all" && s.set("status", l);
      const U = await _(`/admin/disputes?${s.toString()}`);
      m(U.disputes ?? []);
    } catch {
      v("Failed to load disputes");
    } finally {
      c(!1);
    }
  }, [_, t, g, l]);
  P(() => {
    L();
  }, [L]), J(L);
  const d = async (s) => {
    try {
      const U = await _(`/admin/disputes/${encodeURIComponent(s)}`);
      D(U), R(U.status);
    } catch {
      v("Failed to load dispute details");
    }
  }, b = async () => {
    if (!(!K || !k.trim())) {
      y(!0);
      try {
        const s = await _(
          `/admin/disputes/${encodeURIComponent(K.id)}/status`,
          { method: "POST", body: JSON.stringify({ status: k }) }
        );
        D(s), L();
      } catch {
        v("Failed to update dispute status");
      } finally {
        y(!1);
      }
    }
  };
  if (K) {
    const s = K;
    return /* @__PURE__ */ a("div", { children: [
      /* @__PURE__ */ e(
        "button",
        {
          type: "button",
          className: "cedros-data-btn cedros-admin__button cedros-data-btn--ghost cedros-admin__button--ghost cedros-data-btn--sm cedros-admin__button--sm",
          onClick: () => D(null),
          style: { marginBottom: "1rem" },
          children: "← Back to disputes"
        }
      ),
      /* @__PURE__ */ e("div", { className: "cedros-admin__section-header", children: /* @__PURE__ */ a("h3", { className: "cedros-admin__section-title", children: [
        "Dispute ",
        /* @__PURE__ */ e("code", { style: { fontSize: "0.8rem" }, children: s.id.slice(0, 12) })
      ] }) }),
      /* @__PURE__ */ e("div", { className: "cedros-data-table-wrap cedros-admin__table-container", style: { maxWidth: "500px" }, children: /* @__PURE__ */ e("table", { className: "cedros-data-table cedros-admin__table", children: /* @__PURE__ */ a("tbody", { children: [
        /* @__PURE__ */ a("tr", { children: [
          /* @__PURE__ */ e("td", { style: { fontWeight: 600, width: "35%" }, children: "Status" }),
          /* @__PURE__ */ e("td", { children: /* @__PURE__ */ e("span", { className: `cedros-data-pill cedros-admin__badge cedros-admin__badge--${ne(s.status)}`, children: s.status }) })
        ] }),
        /* @__PURE__ */ a("tr", { children: [
          /* @__PURE__ */ e("td", { style: { fontWeight: 600 }, children: "Amount" }),
          /* @__PURE__ */ e("td", { children: re(s.amount, s.currency) })
        ] }),
        /* @__PURE__ */ a("tr", { children: [
          /* @__PURE__ */ e("td", { style: { fontWeight: 600 }, children: "Source" }),
          /* @__PURE__ */ e("td", { children: s.source })
        ] }),
        s.reason && /* @__PURE__ */ a("tr", { children: [
          /* @__PURE__ */ e("td", { style: { fontWeight: 600 }, children: "Reason" }),
          /* @__PURE__ */ e("td", { children: s.reason })
        ] }),
        s.orderId && /* @__PURE__ */ a("tr", { children: [
          /* @__PURE__ */ e("td", { style: { fontWeight: 600 }, children: "Order ID" }),
          /* @__PURE__ */ e("td", { children: /* @__PURE__ */ e("code", { children: s.orderId }) })
        ] }),
        s.chargeId && /* @__PURE__ */ a("tr", { children: [
          /* @__PURE__ */ e("td", { style: { fontWeight: 600 }, children: "Charge ID" }),
          /* @__PURE__ */ e("td", { children: /* @__PURE__ */ e("code", { children: s.chargeId }) })
        ] }),
        s.paymentIntentId && /* @__PURE__ */ a("tr", { children: [
          /* @__PURE__ */ e("td", { style: { fontWeight: 600 }, children: "Payment intent" }),
          /* @__PURE__ */ e("td", { children: /* @__PURE__ */ e("code", { children: s.paymentIntentId }) })
        ] }),
        /* @__PURE__ */ a("tr", { children: [
          /* @__PURE__ */ e("td", { style: { fontWeight: 600 }, children: "Created" }),
          /* @__PURE__ */ e("td", { children: B(s.createdAt) })
        ] }),
        s.statusUpdatedAt && /* @__PURE__ */ a("tr", { children: [
          /* @__PURE__ */ e("td", { style: { fontWeight: 600 }, children: "Status updated" }),
          /* @__PURE__ */ e("td", { children: B(s.statusUpdatedAt) })
        ] })
      ] }) }) }),
      /* @__PURE__ */ a("div", { style: { marginTop: "1rem", display: "flex", gap: "0.5rem", alignItems: "flex-end", maxWidth: "400px" }, children: [
        /* @__PURE__ */ e(
          ie,
          {
            label: "Update status",
            value: k,
            onChange: R,
            style: { flex: 1 },
            options: [
              { value: "needs_response", label: "Needs response" },
              { value: "under_review", label: "Under review" },
              { value: "won", label: "Won" },
              { value: "lost", label: "Lost" },
              { value: "warning_closed", label: "Warning closed" }
            ]
          }
        ),
        /* @__PURE__ */ e(
          "button",
          {
            type: "button",
            className: "cedros-data-btn cedros-admin__button cedros-data-btn--primary cedros-admin__button--primary",
            onClick: b,
            disabled: x || k === s.status,
            children: x ? "Updating…" : "Update"
          }
        )
      ] })
    ] });
  }
  const f = (...s) => i.filter((U) => s.includes(U.status)).length, u = [
    { label: "Total", value: i.length },
    {
      label: "Needs response",
      value: f("needs_response", "warning_needs_response"),
      variant: f("needs_response", "warning_needs_response") > 0 ? "warning" : "muted"
    },
    { label: "Under review", value: f("under_review") },
    {
      label: "Won",
      value: f("won"),
      variant: f("won") > 0 ? "success" : "muted"
    },
    {
      label: "Lost",
      value: f("lost"),
      variant: f("lost") > 0 ? "warning" : "muted"
    }
  ];
  return /* @__PURE__ */ a("div", { className: "cedros-data-stack cedros-admin__page", children: [
    /* @__PURE__ */ e(j, { message: i.length > 0 ? w : null }),
    /* @__PURE__ */ e(Q, { stats: u, isLoading: o && i.length === 0 }),
    /* @__PURE__ */ e("div", { className: "cedros-data-toolbar cedros-admin__toolbar", children: /* @__PURE__ */ a("div", { className: "cedros-admin__filter", children: [
      /* @__PURE__ */ e("span", { className: "cedros-admin__filter-label", children: "Status" }),
      /* @__PURE__ */ e(
        Y,
        {
          ariaLabel: "Status",
          value: l,
          onChange: (s) => {
            A(s), T(0);
          },
          options: [
            { value: "all", label: "All statuses" },
            { value: "needs_response", label: "Needs response" },
            { value: "under_review", label: "Under review" },
            { value: "won", label: "Won" },
            { value: "lost", label: "Lost" }
          ]
        }
      )
    ] }) }),
    /* @__PURE__ */ a(X, { children: [
      /* @__PURE__ */ e("div", { className: "cedros-data-table-wrap cedros-admin__table-container", children: /* @__PURE__ */ a("table", { className: "cedros-data-table cedros-admin__table", "aria-busy": o, children: [
        /* @__PURE__ */ e("thead", { children: /* @__PURE__ */ a("tr", { children: [
          /* @__PURE__ */ e("th", { children: "ID" }),
          /* @__PURE__ */ e(N, { label: "Amount", sortKey: "amount", activeKey: S, direction: I, onSort: h }),
          /* @__PURE__ */ e(N, { label: "Status", sortKey: "status", activeKey: S, direction: I, onSort: h }),
          /* @__PURE__ */ e(N, { label: "Reason", sortKey: "reason", activeKey: S, direction: I, onSort: h }),
          /* @__PURE__ */ e(N, { label: "Source", sortKey: "source", activeKey: S, direction: I, onSort: h }),
          /* @__PURE__ */ e(N, { label: "Created", sortKey: "created", activeKey: S, direction: I, onSort: h }),
          /* @__PURE__ */ e("th", {})
        ] }) }),
        /* @__PURE__ */ e("tbody", { children: o && C.length === 0 ? /* @__PURE__ */ e(Z, { columns: 7, label: "Loading disputes…" }) : w && C.length === 0 ? /* @__PURE__ */ e(z, { columns: 7, message: w, onRetry: L }) : C.length === 0 ? /* @__PURE__ */ e(
          ee,
          {
            columns: 7,
            filtered: l !== "all",
            title: l !== "all" ? "No disputes match this filter" : "No disputes yet",
            description: l !== "all" ? "Try a different status filter to see more disputes." : "Disputes and chargebacks appear here when a customer or bank contests a payment.",
            action: l !== "all" ? /* @__PURE__ */ e("button", { type: "button", className: "cedros-data-btn cedros-data-btn--ghost cedros-data-btn--sm", onClick: () => A("all"), children: "Clear filters" }) : void 0
          }
        ) : C.map((s) => /* @__PURE__ */ a("tr", { children: [
          /* @__PURE__ */ e("td", { children: /* @__PURE__ */ e("code", { style: { fontSize: "0.75rem" }, children: s.id.slice(0, 12) }) }),
          /* @__PURE__ */ e("td", { children: re(s.amount, s.currency) }),
          /* @__PURE__ */ e("td", { children: /* @__PURE__ */ e("span", { className: `cedros-data-pill cedros-admin__badge cedros-admin__badge--${ne(s.status)}`, children: s.status }) }),
          /* @__PURE__ */ e("td", { children: s.reason ?? "—" }),
          /* @__PURE__ */ e("td", { children: s.source }),
          /* @__PURE__ */ e("td", { children: B(s.createdAt) }),
          /* @__PURE__ */ e("td", { children: /* @__PURE__ */ e(
            "button",
            {
              type: "button",
              className: "cedros-data-btn cedros-admin__button cedros-data-btn--ghost cedros-admin__button--ghost cedros-data-btn--sm cedros-admin__button--sm",
              onClick: () => d(s.id),
              children: "View"
            }
          ) })
        ] }, s.id)) })
      ] }) }),
      i.length > 0 ? /* @__PURE__ */ a("div", { className: "cedros-data-pagination", children: [
        /* @__PURE__ */ e(
          "button",
          {
            type: "button",
            className: "cedros-data-btn cedros-admin__button cedros-data-btn--ghost cedros-admin__button--ghost cedros-data-btn--sm cedros-admin__button--sm",
            disabled: g === 0,
            onClick: () => T(Math.max(0, g - t)),
            children: "Previous"
          }
        ),
        /* @__PURE__ */ a("span", { children: [
          "Showing ",
          i.length,
          " dispute",
          i.length !== 1 ? "s" : ""
        ] }),
        /* @__PURE__ */ e(
          "button",
          {
            type: "button",
            className: "cedros-data-btn cedros-admin__button cedros-data-btn--ghost cedros-admin__button--ghost cedros-data-btn--sm cedros-admin__button--sm",
            disabled: i.length < t,
            onClick: () => T(g + t),
            children: "Next"
          }
        )
      ] }) : null
    ] })
  ] });
}
function H({ message: t }) {
  return /* @__PURE__ */ e("div", { className: "cedros-data-status cedros-data-status--warning cedros-admin__error-banner", role: "status", children: /* @__PURE__ */ e("span", { children: t }) });
}
function de(t) {
  if (t)
    try {
      return new URL(t, "http://localhost").protocol === "javascript:" ? void 0 : t;
    } catch {
      return;
    }
}
function ke(t, n) {
  switch (n) {
    case "status":
      return t.status;
    case "amount":
      return t.amount;
    case "source":
      return t.source;
    case "customer":
      return t.customerEmail || t.customerName || "";
    case "date":
      return t.createdAt;
    default:
      return null;
  }
}
function Ue({ pageSize: t = 20, authManager: n, locale: i }) {
  const [m, o] = r([]), [c, w] = r(null), [v, g] = r(!1), [T, l] = r(!0), [A, K] = r(!0), [D, k] = r(null), [R, x] = r(null), [y, C] = r(null), [S, I] = r(!1), [h, _] = r(""), { sorted: L, sortKey: d, sortDirection: b, toggleSort: f } = $(
    m,
    ke,
    { key: "date", direction: "desc" }
  ), u = W(async (p, O) => q(n, p, O), [n]), s = W(async () => {
    K(!0);
    try {
      k(null);
      const p = new URLSearchParams({ limit: String(t) });
      h && p.set("status", h);
      const O = await u(
        `/admin/orders?${p}`
      );
      o(O.orders || []), g(O.truncated === !0);
    } catch {
      k("Failed to load orders"), g(!1);
    } finally {
      K(!1);
    }
  }, [u, t, h]), U = W(async () => {
    l(!0);
    try {
      const p = await q(n, "/admin/stats");
      w(p);
    } catch {
      w(null);
    } finally {
      l(!1);
    }
  }, [n]);
  P(() => {
    U();
  }, [U]), P(() => {
    s();
  }, [s]), J(() => {
    U(), s();
  });
  const V = W(async (p) => {
    I(!0);
    try {
      const O = await u(`/admin/orders/${encodeURIComponent(p)}`);
      C(O);
    } catch {
      C(null);
    } finally {
      I(!1);
    }
  }, [u]), F = (p) => {
    R === p ? (x(null), C(null)) : (x(p), V(p));
  }, G = (p, O) => O.toUpperCase() === "USD" ? Ce(p, "USD", i) : `${Le(p, i)} ${O.toUpperCase()}`, E = c?.orders, M = [
    // "Total" (not "Orders") so it doesn't read as a different number than the
    // Transactions tab's settled-only "Orders" stat, and to match the Returns/
    // Disputes headline stat.
    { label: "Total", value: E?.total ?? 0 },
    { label: "Paid", value: E?.paid ?? 0 },
    {
      label: "Refunded",
      value: E?.refunded ?? 0,
      variant: E && E.refunded > 0 ? "warning" : "muted"
    },
    {
      label: "Pending",
      value: E?.pending ?? 0,
      variant: E && E.pending > 0 ? "warning" : "muted"
    },
    {
      label: "Revenue",
      value: se(E?.revenue ?? 0, "USD", i),
      variant: "success"
    }
  ];
  return /* @__PURE__ */ a("div", { className: "cedros-data-stack cedros-admin__page", children: [
    /* @__PURE__ */ e(j, { message: m.length > 0 ? D : null }),
    c?.truncated ? /* @__PURE__ */ e(H, { message: "Order stats may be partial because the ledger scan hit the admin row limit." }) : null,
    v ? /* @__PURE__ */ e(H, { message: "Order list may be partial because the ledger scan hit the admin row limit." }) : null,
    /* @__PURE__ */ e(Q, { stats: M, isLoading: T && !c }),
    /* @__PURE__ */ e("div", { className: "cedros-data-toolbar cedros-admin__toolbar", children: /* @__PURE__ */ a("div", { className: "cedros-admin__filter", children: [
      /* @__PURE__ */ e("span", { className: "cedros-admin__filter-label", children: "Status" }),
      /* @__PURE__ */ e(
        Y,
        {
          ariaLabel: "Status",
          value: h,
          onChange: _,
          options: [
            { value: "", label: "All statuses" },
            { value: "paid", label: "Paid" },
            { value: "processing", label: "Processing" },
            { value: "fulfilled", label: "Fulfilled" },
            { value: "shipped", label: "Shipped" },
            { value: "delivered", label: "Delivered" },
            { value: "cancelled", label: "Cancelled" },
            { value: "refunded", label: "Refunded" }
          ]
        }
      )
    ] }) }),
    /* @__PURE__ */ a(X, { children: [
      m.length > 0 ? /* @__PURE__ */ a("div", { className: "cedros-admin__table-info", children: [
        "Showing ",
        m.length,
        " of ",
        E?.total ?? m.length,
        " ",
        le(E?.total ?? m.length, { one: "order", other: "orders" }, i)
      ] }) : null,
      /* @__PURE__ */ e("div", { className: "cedros-data-table-wrap cedros-admin__table-container", children: /* @__PURE__ */ a("table", { className: "cedros-data-table cedros-admin__table", "aria-busy": A, children: [
        /* @__PURE__ */ e("thead", { children: /* @__PURE__ */ a("tr", { children: [
          /* @__PURE__ */ e("th", { children: "Order" }),
          /* @__PURE__ */ e(N, { label: "Status", sortKey: "status", activeKey: d, direction: b, onSort: f }),
          /* @__PURE__ */ e(N, { label: "Amount", sortKey: "amount", activeKey: d, direction: b, onSort: f }),
          /* @__PURE__ */ e(N, { label: "Source", sortKey: "source", activeKey: d, direction: b, onSort: f }),
          /* @__PURE__ */ e(N, { label: "Customer", sortKey: "customer", activeKey: d, direction: b, onSort: f }),
          /* @__PURE__ */ e(N, { label: "Date", sortKey: "date", activeKey: d, direction: b, onSort: f })
        ] }) }),
        /* @__PURE__ */ e("tbody", { children: A && L.length === 0 ? /* @__PURE__ */ e(Z, { columns: 6, label: "Loading orders…" }) : D && L.length === 0 ? /* @__PURE__ */ e(z, { columns: 6, message: D, onRetry: s }) : L.length === 0 ? /* @__PURE__ */ e(
          ee,
          {
            columns: 6,
            filtered: !!h,
            title: h ? "No orders match this filter" : "No orders yet",
            description: h ? "Try a different status filter to see more orders." : "Orders appear here once customers complete a purchase.",
            action: h ? /* @__PURE__ */ e("button", { type: "button", className: "cedros-data-btn cedros-data-btn--ghost cedros-data-btn--sm", onClick: () => _(""), children: "Clear filters" }) : void 0
          }
        ) : L.map((p) => /* @__PURE__ */ e(
          Ae,
          {
            order: p,
            expanded: R === p.id,
            detail: R === p.id ? y : null,
            detailLoading: R === p.id && S,
            onToggle: () => F(p.id),
            formatAmount: G,
            locale: i
          },
          p.id
        )) })
      ] }) })
    ] })
  ] });
}
function Ae({
  order: t,
  expanded: n,
  detail: i,
  detailLoading: m,
  onToggle: o,
  formatAmount: c,
  locale: w
}) {
  return /* @__PURE__ */ a(X, { children: [
    /* @__PURE__ */ a(
      "tr",
      {
        className: `cedros-data-table__row--clickable ${n ? "cedros-admin__table-row--active" : ""}`,
        children: [
          /* @__PURE__ */ e("td", { children: /* @__PURE__ */ a(
            "button",
            {
              type: "button",
              className: "cedros-data-table__row-activate cedros-admin__table-row-activate cedros-admin__mono",
              onClick: o,
              "aria-expanded": n,
              "aria-label": `${n ? "Collapse" : "Expand"} order ${t.id}`,
              children: [
                t.id.slice(0, 12),
                "…"
              ]
            }
          ) }),
          /* @__PURE__ */ e("td", { children: /* @__PURE__ */ e("span", { className: `cedros-data-pill cedros-admin__badge cedros-admin__badge--${oe(t.status)}`, children: t.status }) }),
          /* @__PURE__ */ e("td", { children: c(t.amount, t.amountAsset) }),
          /* @__PURE__ */ e("td", { children: t.source }),
          /* @__PURE__ */ e("td", { children: t.customerEmail || t.customerName || "—" }),
          /* @__PURE__ */ e("td", { children: B(t.createdAt, w) })
        ]
      }
    ),
    n ? /* @__PURE__ */ e("tr", { children: /* @__PURE__ */ e("td", { colSpan: 6, style: { padding: 0 }, children: /* @__PURE__ */ e(
      Ke,
      {
        detail: i,
        loading: m,
        metadata: t.metadata,
        locale: w
      }
    ) }) }) : null
  ] });
}
function Ke({
  detail: t,
  loading: n,
  metadata: i,
  locale: m
}) {
  return n ? /* @__PURE__ */ e(Se, { label: "Loading order details…", lines: 2 }) : /* @__PURE__ */ a("div", { style: { padding: "1rem", background: "var(--pay-admin-muted-bg)" }, children: [
    Object.keys(i).length > 0 ? /* @__PURE__ */ a("div", { style: { marginBottom: "1rem" }, children: [
      /* @__PURE__ */ e("div", { className: "cedros-admin__label", children: "Order metadata" }),
      /* @__PURE__ */ e("div", { style: { display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.25rem 1rem", fontSize: "0.8125rem" }, children: Object.entries(i).map(([o, c]) => /* @__PURE__ */ a("div", { style: { display: "contents" }, children: [
        /* @__PURE__ */ e("span", { style: { fontWeight: 500, color: "var(--pay-admin-muted)" }, children: o }),
        /* @__PURE__ */ e("span", { children: c })
      ] }, o)) })
    ] }) : null,
    t?.fulfillments && t.fulfillments.length > 0 ? /* @__PURE__ */ a("div", { style: { marginBottom: "1rem" }, children: [
      /* @__PURE__ */ e("div", { className: "cedros-admin__label", children: "Fulfillments" }),
      t.fulfillments.map((o) => /* @__PURE__ */ a("div", { style: { fontSize: "0.8125rem", marginBottom: "0.25rem" }, children: [
        /* @__PURE__ */ e("span", { className: `cedros-data-pill cedros-admin__badge cedros-admin__badge--${oe(o.status)}`, children: o.status }),
        o.carrier ? /* @__PURE__ */ e("span", { style: { marginLeft: "0.5rem" }, children: o.carrier }) : null,
        o.trackingNumber ? de(o.trackingUrl) ? /* @__PURE__ */ e("a", { href: de(o.trackingUrl), target: "_blank", rel: "noreferrer", style: { marginLeft: "0.5rem" }, children: o.trackingNumber }) : /* @__PURE__ */ e("span", { style: { marginLeft: "0.5rem" }, children: o.trackingNumber }) : null
      ] }, o.id))
    ] }) : null,
    t?.history && t.history.length > 0 ? /* @__PURE__ */ a("div", { children: [
      /* @__PURE__ */ e("div", { className: "cedros-admin__label", children: "Status history" }),
      t.history.map((o) => /* @__PURE__ */ a("div", { style: { fontSize: "0.8125rem", marginBottom: "0.25rem" }, children: [
        /* @__PURE__ */ e("span", { style: { color: "var(--pay-admin-muted)" }, children: B(o.createdAt, m) }),
        " ",
        o.fromStatus,
        " → ",
        o.toStatus,
        o.note ? /* @__PURE__ */ e("span", { style: { marginLeft: "0.5rem", fontStyle: "italic" }, children: o.note }) : null
      ] }, o.id))
    ] }) : null
  ] });
}
function oe(t) {
  switch (t) {
    case "paid":
    case "fulfilled":
    case "delivered":
    case "success":
      return "success";
    case "processing":
    case "shipped":
    case "pending":
      return "warning";
    case "cancelled":
    case "refunded":
    case "failed":
      return "error";
    default:
      return "default";
  }
}
const ce = ["requested", "approved", "rejected", "received", "refunded"], ue = (t) => {
  switch (t) {
    case "approved":
      return "success";
    case "refunded":
      return "success";
    case "rejected":
      return "failed";
    case "received":
      return "muted";
    case "requested":
      return "pending";
    default:
      return "muted";
  }
}, me = (t) => t.charAt(0).toUpperCase() + t.slice(1);
function De(t, n) {
  switch (n) {
    case "orderId":
      return t.orderId;
    case "items":
      return t.items.length;
    case "status":
      return t.status;
    case "created":
      return t.createdAt;
    default:
      return null;
  }
}
function xe({ returnRequest: t, onBack: n, onStatusUpdated: i, onError: m, fetchWithAuth: o }) {
  const [c, w] = r(t.status), [v, g] = r(!1), T = async () => {
    if (!(!c || c === t.status)) {
      g(!0);
      try {
        const l = await o(
          `/admin/returns/${encodeURIComponent(t.id)}/status`,
          { method: "POST", body: JSON.stringify({ status: c }) }
        );
        i(l);
      } catch {
        m("Failed to update return status");
      } finally {
        g(!1);
      }
    }
  };
  return /* @__PURE__ */ a("div", { children: [
    /* @__PURE__ */ e(
      "button",
      {
        type: "button",
        className: "cedros-data-btn cedros-admin__button cedros-data-btn--ghost cedros-admin__button--ghost cedros-data-btn--sm cedros-admin__button--sm",
        onClick: n,
        style: { marginBottom: "1rem" },
        children: "← Back to returns"
      }
    ),
    /* @__PURE__ */ e("div", { className: "cedros-admin__section-header", children: /* @__PURE__ */ a("h3", { className: "cedros-admin__section-title", children: [
      "Return ",
      /* @__PURE__ */ e("code", { style: { fontSize: "0.8rem" }, children: t.id.slice(0, 12) }),
      /* @__PURE__ */ e(
        "span",
        {
          className: `cedros-data-pill cedros-admin__badge cedros-admin__badge--${ue(t.status)}`,
          style: { marginLeft: "0.5rem" },
          children: t.status
        }
      )
    ] }) }),
    /* @__PURE__ */ e("div", { className: "cedros-data-table-wrap cedros-admin__table-container", style: { maxWidth: "500px", marginBottom: "1rem" }, children: /* @__PURE__ */ e("table", { className: "cedros-data-table cedros-admin__table", children: /* @__PURE__ */ a("tbody", { children: [
      /* @__PURE__ */ a("tr", { children: [
        /* @__PURE__ */ e("td", { style: { fontWeight: 600, width: "35%" }, children: "Order ID" }),
        /* @__PURE__ */ e("td", { children: /* @__PURE__ */ e("code", { children: t.orderId }) })
      ] }),
      t.reason && /* @__PURE__ */ a("tr", { children: [
        /* @__PURE__ */ e("td", { style: { fontWeight: 600 }, children: "Reason" }),
        /* @__PURE__ */ e("td", { children: t.reason })
      ] }),
      /* @__PURE__ */ a("tr", { children: [
        /* @__PURE__ */ e("td", { style: { fontWeight: 600 }, children: "Created" }),
        /* @__PURE__ */ e("td", { children: B(t.createdAt) })
      ] }),
      t.statusUpdatedAt && /* @__PURE__ */ a("tr", { children: [
        /* @__PURE__ */ e("td", { style: { fontWeight: 600 }, children: "Status updated" }),
        /* @__PURE__ */ e("td", { children: B(t.statusUpdatedAt) })
      ] }),
      t.updatedAt && /* @__PURE__ */ a("tr", { children: [
        /* @__PURE__ */ e("td", { style: { fontWeight: 600 }, children: "Last updated" }),
        /* @__PURE__ */ e("td", { children: B(t.updatedAt) })
      ] })
    ] }) }) }),
    /* @__PURE__ */ a("h4", { style: { fontSize: "0.85rem", fontWeight: 600, margin: "0 0 0.5rem" }, children: [
      "Items (",
      t.items.length,
      ")"
    ] }),
    /* @__PURE__ */ e("div", { className: "cedros-data-table-wrap cedros-admin__table-container", style: { maxWidth: "500px", marginBottom: "1.25rem" }, children: /* @__PURE__ */ a("table", { className: "cedros-data-table cedros-admin__table", children: [
      /* @__PURE__ */ e("thead", { children: /* @__PURE__ */ a("tr", { children: [
        /* @__PURE__ */ e("th", { children: "Product ID" }),
        /* @__PURE__ */ e("th", { children: "Variant ID" }),
        /* @__PURE__ */ e("th", { children: "Qty" })
      ] }) }),
      /* @__PURE__ */ e("tbody", { children: t.items.map((l, A) => /* @__PURE__ */ a("tr", { children: [
        /* @__PURE__ */ e("td", { children: /* @__PURE__ */ e("code", { style: { fontSize: "0.75rem" }, children: l.productId }) }),
        /* @__PURE__ */ e("td", { children: l.variantId ? /* @__PURE__ */ e("code", { style: { fontSize: "0.75rem" }, children: l.variantId }) : /* @__PURE__ */ e("span", { className: "cedros-admin__text-muted", children: "—" }) }),
        /* @__PURE__ */ e("td", { children: l.quantity })
      ] }, A)) })
    ] }) }),
    Object.keys(t.metadata).length > 0 && /* @__PURE__ */ a(X, { children: [
      /* @__PURE__ */ e("h4", { style: { fontSize: "0.85rem", fontWeight: 600, margin: "0 0 0.5rem" }, children: "Metadata" }),
      /* @__PURE__ */ e("div", { className: "cedros-data-table-wrap cedros-admin__table-container", style: { maxWidth: "500px", marginBottom: "1.25rem" }, children: /* @__PURE__ */ e("table", { className: "cedros-data-table cedros-admin__table", children: /* @__PURE__ */ e("tbody", { children: Object.entries(t.metadata).map(([l, A]) => /* @__PURE__ */ a("tr", { children: [
        /* @__PURE__ */ e("td", { style: { fontWeight: 600, width: "40%" }, children: l }),
        /* @__PURE__ */ e("td", { children: A })
      ] }, l)) }) }) })
    ] }),
    /* @__PURE__ */ a("div", { style: { display: "flex", gap: "0.5rem", alignItems: "flex-end", maxWidth: "400px" }, children: [
      /* @__PURE__ */ e(
        ie,
        {
          label: "Update status",
          value: c,
          onChange: (l) => w(l),
          options: ce.map((l) => ({ value: l, label: me(l) })),
          style: { flex: 1 }
        }
      ),
      /* @__PURE__ */ e(
        "button",
        {
          type: "button",
          className: "cedros-data-btn cedros-admin__button cedros-data-btn--primary cedros-admin__button--primary",
          onClick: T,
          disabled: v || c === t.status,
          children: v ? "Updating…" : "Update"
        }
      )
    ] })
  ] });
}
function Ee({ pageSize: t = 20, authManager: n }) {
  const [i, m] = r([]), [o, c] = r(!0), [w, v] = r(null), [g, T] = r(0), [l, A] = r("all"), [K, D] = r(null), { sorted: k, sortKey: R, sortDirection: x, toggleSort: y } = $(
    i,
    De,
    { key: "created", direction: "desc" }
  ), C = W(async (d, b) => q(n, d, b), [n]), S = W(async () => {
    c(!0), v(null);
    try {
      const d = new URLSearchParams();
      d.set("limit", String(t)), d.set("offset", String(g)), l !== "all" && d.set("status", l);
      const b = await C(`/admin/returns?${d.toString()}`);
      m(b.returns ?? []);
    } catch {
      v("Failed to load returns");
    } finally {
      c(!1);
    }
  }, [C, t, g, l]);
  P(() => {
    S();
  }, [S]), J(S);
  const I = async (d) => {
    v(null);
    try {
      const b = await C(`/admin/returns/${encodeURIComponent(d)}`);
      D(b);
    } catch {
      v("Failed to load return details");
    }
  }, h = (d) => {
    D(d), m((b) => b.map((f) => f.id === d.id ? d : f));
  };
  if (K)
    return /* @__PURE__ */ e(
      xe,
      {
        returnRequest: K,
        onBack: () => D(null),
        onStatusUpdated: h,
        onError: v,
        fetchWithAuth: C
      }
    );
  const _ = (d) => i.filter((b) => b.status === d).length, L = [
    { label: "Total", value: i.length },
    {
      label: "Requested",
      value: _("requested"),
      variant: _("requested") > 0 ? "warning" : "muted"
    },
    { label: "Approved", value: _("approved") },
    { label: "Refunded", value: _("refunded"), variant: "success" }
  ];
  return /* @__PURE__ */ a("div", { className: "cedros-data-stack cedros-admin__page", children: [
    /* @__PURE__ */ e(j, { message: i.length > 0 ? w : null }),
    /* @__PURE__ */ e(Q, { stats: L, isLoading: o && i.length === 0 }),
    /* @__PURE__ */ e("div", { className: "cedros-data-toolbar cedros-admin__toolbar", children: /* @__PURE__ */ a("div", { className: "cedros-admin__filter", children: [
      /* @__PURE__ */ e("span", { className: "cedros-admin__filter-label", children: "Status" }),
      /* @__PURE__ */ e(
        Y,
        {
          ariaLabel: "Status",
          value: l,
          onChange: (d) => {
            A(d), T(0);
          },
          options: [
            { value: "all", label: "All statuses" },
            ...ce.map((d) => ({ value: d, label: me(d) }))
          ]
        }
      )
    ] }) }),
    /* @__PURE__ */ a(X, { children: [
      /* @__PURE__ */ e("div", { className: "cedros-data-table-wrap cedros-admin__table-container", children: /* @__PURE__ */ a("table", { className: "cedros-data-table cedros-admin__table", "aria-busy": o, children: [
        /* @__PURE__ */ e("thead", { children: /* @__PURE__ */ a("tr", { children: [
          /* @__PURE__ */ e(N, { label: "Order ID", sortKey: "orderId", activeKey: R, direction: x, onSort: y }),
          /* @__PURE__ */ e(N, { label: "Items", sortKey: "items", activeKey: R, direction: x, onSort: y }),
          /* @__PURE__ */ e(N, { label: "Status", sortKey: "status", activeKey: R, direction: x, onSort: y }),
          /* @__PURE__ */ e("th", { children: "Reason" }),
          /* @__PURE__ */ e(N, { label: "Created", sortKey: "created", activeKey: R, direction: x, onSort: y }),
          /* @__PURE__ */ e("th", {})
        ] }) }),
        /* @__PURE__ */ e("tbody", { children: o && k.length === 0 ? /* @__PURE__ */ e(Z, { columns: 6, label: "Loading returns…" }) : w && k.length === 0 ? /* @__PURE__ */ e(z, { columns: 6, message: w, onRetry: S }) : k.length === 0 ? /* @__PURE__ */ e(
          ee,
          {
            columns: 6,
            filtered: l !== "all",
            title: l !== "all" ? "No returns match this filter" : "No returns yet",
            description: l !== "all" ? "Try a different status filter to see more returns." : "Return requests appear here once customers submit them.",
            action: l !== "all" ? /* @__PURE__ */ e("button", { type: "button", className: "cedros-data-btn cedros-data-btn--ghost cedros-data-btn--sm", onClick: () => A("all"), children: "Clear filters" }) : void 0
          }
        ) : k.map((d) => /* @__PURE__ */ a("tr", { children: [
          /* @__PURE__ */ e("td", { children: /* @__PURE__ */ e("code", { style: { fontSize: "0.75rem" }, children: d.orderId }) }),
          /* @__PURE__ */ e("td", { children: d.items.length }),
          /* @__PURE__ */ e("td", { children: /* @__PURE__ */ e("span", { className: `cedros-data-pill cedros-admin__badge cedros-admin__badge--${ue(d.status)}`, children: d.status }) }),
          /* @__PURE__ */ e("td", { style: { maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: d.reason ?? /* @__PURE__ */ e("span", { className: "cedros-admin__text-muted", children: "—" }) }),
          /* @__PURE__ */ e("td", { children: B(d.createdAt) }),
          /* @__PURE__ */ e("td", { children: /* @__PURE__ */ e(
            "button",
            {
              type: "button",
              className: "cedros-data-btn cedros-admin__button cedros-data-btn--ghost cedros-admin__button--ghost cedros-data-btn--sm cedros-admin__button--sm",
              onClick: () => I(d.id),
              children: "View"
            }
          ) })
        ] }, d.id)) })
      ] }) }),
      i.length > 0 ? /* @__PURE__ */ a("div", { className: "cedros-data-pagination", children: [
        /* @__PURE__ */ e(
          "button",
          {
            type: "button",
            className: "cedros-data-btn cedros-admin__button cedros-data-btn--ghost cedros-admin__button--ghost cedros-data-btn--sm cedros-admin__button--sm",
            disabled: g === 0,
            onClick: () => T(Math.max(0, g - t)),
            children: "Previous"
          }
        ),
        /* @__PURE__ */ a("span", { children: [
          "Showing ",
          i.length,
          " return",
          i.length !== 1 ? "s" : ""
        ] }),
        /* @__PURE__ */ e(
          "button",
          {
            type: "button",
            className: "cedros-data-btn cedros-admin__button cedros-data-btn--ghost cedros-admin__button--ghost cedros-data-btn--sm cedros-admin__button--sm",
            disabled: i.length < t,
            onClick: () => T(g + t),
            children: "Next"
          }
        )
      ] }) : null
    ] })
  ] });
}
function Oe(t, n) {
  switch (n) {
    case "resource":
      return t.resourceId;
    case "method":
      return t.method;
    case "amount":
      return t.amount;
    case "status":
      return t.status;
    case "date":
      return t.paidAt;
    case "id":
      return t.id;
    default:
      return null;
  }
}
function We({ pageSize: t = 20, authManager: n, locale: i }) {
  const [m, o] = r([]), [c, w] = r(null), [v, g] = r(!1), [T, l] = r(!0), [A, K] = r(!0), [D, k] = r(null), [R, x] = r(null), [y, C] = r(""), { sorted: S, sortKey: I, sortDirection: h, toggleSort: _ } = $(
    m,
    Oe,
    { key: "date", direction: "desc" }
  ), L = W(async () => {
    K(!0);
    try {
      k(null);
      const u = await q(n, "/admin/stats");
      w(u);
    } catch {
      k("Failed to load payment stats");
    } finally {
      K(!1);
    }
  }, [n]);
  P(() => {
    L();
  }, [L]);
  const d = W(async () => {
    l(!0);
    try {
      x(null);
      const u = new URLSearchParams({ limit: t.toString() });
      y && u.set("method", y);
      const s = `/admin/transactions?${u}`, U = await q(n, s);
      o(U.transactions || []), g(U.truncated === !0);
    } catch {
      x("Failed to load transactions");
    } finally {
      l(!1);
    }
  }, [t, y, n]);
  P(() => {
    d();
  }, [d]), J(() => {
    L(), d();
  });
  const b = (u, s = "USD") => se(u, s, i), f = (u) => `${u} ${le(u, { one: "order", other: "orders" }, i)}`;
  return /* @__PURE__ */ a("div", { className: "cedros-data-stack cedros-admin__page", children: [
    /* @__PURE__ */ e(j, { message: D }),
    /* @__PURE__ */ e(j, { message: m.length > 0 ? R : null }),
    c?.truncated ? /* @__PURE__ */ e(H, { message: "Payment stats may be partial because the ledger scan hit the admin row limit." }) : null,
    v ? /* @__PURE__ */ e(H, { message: "Transaction list may be partial because the ledger scan hit the admin row limit." }) : null,
    /* @__PURE__ */ e(
      Q,
      {
        stats: [
          { label: "Revenue", value: b(c?.totalRevenue ?? 0) },
          { label: "Orders", value: c?.totalTransactions ?? 0 },
          { label: "Card", value: b(c?.revenueByMethod.stripe ?? 0), description: f(c?.transactionsByMethod.stripe ?? 0) },
          { label: "Crypto", value: b(c?.revenueByMethod.x402 ?? 0), description: f(c?.transactionsByMethod.x402 ?? 0) },
          { label: "Credits", value: b(c?.revenueByMethod.credits ?? 0), description: f(c?.transactionsByMethod.credits ?? 0) }
        ],
        isLoading: A && !c
      }
    ),
    /* @__PURE__ */ e("div", { className: "cedros-data-toolbar cedros-admin__toolbar", children: /* @__PURE__ */ a("div", { className: "cedros-admin__filter", children: [
      /* @__PURE__ */ e("span", { className: "cedros-admin__filter-label", children: "Method" }),
      /* @__PURE__ */ e(
        Y,
        {
          ariaLabel: "Method",
          value: y,
          onChange: C,
          options: [
            { value: "", label: "All" },
            { value: "stripe", label: "Card" },
            { value: "x402", label: "Crypto" },
            { value: "credits", label: "Credits" }
          ]
        }
      )
    ] }) }),
    /* @__PURE__ */ e("div", { className: "cedros-data-table-wrap cedros-admin__table-container", children: /* @__PURE__ */ a("table", { className: "cedros-data-table cedros-admin__table", "aria-busy": T, children: [
      /* @__PURE__ */ e("thead", { children: /* @__PURE__ */ a("tr", { children: [
        /* @__PURE__ */ e("th", { children: "ID" }),
        /* @__PURE__ */ e(N, { label: "Resource", sortKey: "resource", activeKey: I, direction: h, onSort: _ }),
        /* @__PURE__ */ e(N, { label: "Method", sortKey: "method", activeKey: I, direction: h, onSort: _ }),
        /* @__PURE__ */ e(N, { label: "Amount", sortKey: "amount", activeKey: I, direction: h, onSort: _ }),
        /* @__PURE__ */ e(N, { label: "Status", sortKey: "status", activeKey: I, direction: h, onSort: _ }),
        /* @__PURE__ */ e(N, { label: "Date", sortKey: "date", activeKey: I, direction: h, onSort: _ })
      ] }) }),
      /* @__PURE__ */ e("tbody", { children: T && S.length === 0 ? /* @__PURE__ */ e(Z, { columns: 6, label: "Loading transactions…" }) : R && S.length === 0 ? /* @__PURE__ */ e(z, { columns: 6, message: R, onRetry: d }) : S.length === 0 ? /* @__PURE__ */ e(
        ee,
        {
          columns: 6,
          filtered: !!y,
          title: y ? "No transactions match this filter" : "No transactions yet",
          description: y ? "Try selecting a different payment method." : "Completed payments will appear here as customers check out.",
          action: y ? /* @__PURE__ */ e("button", { type: "button", className: "cedros-data-btn cedros-data-btn--ghost cedros-data-btn--sm", onClick: () => C(""), children: "Clear filters" }) : void 0
        }
      ) : S.map((u) => /* @__PURE__ */ a("tr", { children: [
        /* @__PURE__ */ e("td", { children: /* @__PURE__ */ e("code", { children: u.id }) }),
        /* @__PURE__ */ e("td", { children: u.resourceId }),
        /* @__PURE__ */ e("td", { children: /* @__PURE__ */ e("span", { className: `cedros-data-pill cedros-admin__badge cedros-admin__badge--${u.method}`, children: u.method }) }),
        /* @__PURE__ */ e("td", { children: b(u.amount, u.currency) }),
        /* @__PURE__ */ e("td", { children: /* @__PURE__ */ e("span", { className: `cedros-data-pill cedros-admin__badge cedros-admin__badge--${u.status}`, children: u.status }) }),
        /* @__PURE__ */ e("td", { children: B(u.paidAt, i) })
      ] }, u.id)) })
    ] }) })
  ] });
}
function Be(t, n) {
  return {
    availability: { stripe: !1, credits: !1, x402: !1 },
    isLoading: !1,
    error: null
  };
}
function Pe(t, n) {
  switch (n) {
    case "stripe":
      return t.stripeRefundId ?? "";
    case "charge":
      return t.chargeId ?? "";
    case "amount":
      return t.amount ?? 0;
    case "reason":
      return t.reason ?? "";
    case "status":
      return t.status ?? "";
    case "date":
      return t.createdAt;
    case "id":
      return t.id;
    default:
      return null;
  }
}
function Fe(t, n) {
  switch (n) {
    case "original":
      return t.originalTransactionId ?? "";
    case "user":
      return t.userId ?? "";
    case "amount":
      return t.amountLamports ?? 0;
    case "reason":
      return t.reason ?? "";
    case "status":
      return t.status ?? "";
    case "date":
      return t.createdAt;
    case "id":
      return t.id;
    default:
      return null;
  }
}
function $e(t, n) {
  switch (n) {
    case "transaction":
      return t.transactionId ?? "";
    case "amount":
      return t.amount ?? 0;
    case "reason":
      return t.reason ?? "";
    case "status":
      return t.status ?? "";
    case "date":
      return t.createdAt;
    case "id":
      return t.id;
    default:
      return null;
  }
}
function Ve({ serverUrl: t, pageSize: n = 20, authManager: i, locale: m }) {
  const [o, c] = r([]), [w, v] = r(!0), [g, T] = r(null), [l, A] = r(!1), [K, D] = r([]), [k, R] = r(!0), [x, y] = r(null), [C, S] = r([]), [I, h] = r(!0), [_, L] = r(null), [d, b] = r(!1), [f, u] = r(null), [s, U] = r(null), {
    availability: V
  } = Be(), F = V !== null, G = V?.stripe === !0, E = V?.credits === !0, M = V?.x402 === !0, p = M;
  $(C, Pe, { key: "date", direction: "desc" }), $(K, Fe, { key: "date", direction: "desc" }), $(o, $e, { key: "date", direction: "desc" });
  const O = W(async () => {
    {
      c([]), T(null), v(!1);
      return;
    }
  }, [t, n, i, M]);
  P(() => {
    F && O();
  }, [F, O]);
  const te = W(async () => {
    {
      D([]), y(null), R(!1);
      return;
    }
  }, [t, n, i, E]);
  P(() => {
    F && te();
  }, [F, te]);
  const ae = W(async () => {
    {
      S([]), L(null), h(!1);
      return;
    }
  }, [t, n, i, G]);
  P(() => {
    F && ae();
  }, [F, ae]);
  const he = 0 + 0 + 0, be = 0 / 100 + 0 / 1e6 + 0, pe = (_e) => se(_e, "USD", m), ge = M, fe = s, ye = [
    { label: "Pending", value: he, variant: "muted" },
    { label: "Total refunded", value: pe(be), variant: "success" }
  ];
  return J(
    () => {
      O(), te(), ae();
    },
    {
      enabled: !!(_ || x || g) && p,
      intervalMs: 2e4
    }
  ), /* @__PURE__ */ a("div", { className: "cedros-data-stack cedros-admin__page", children: [
    /* @__PURE__ */ e(j, { message: fe }),
    l || d ? /* @__PURE__ */ e(H, { message: "Refund list may be partial because the ledger scan hit the admin row limit." }) : null,
    /* @__PURE__ */ e(
      Q,
      {
        stats: ye,
        isLoading: ge
      }
    ),
    /* @__PURE__ */ e(
      we,
      {
        title: "Refund processing unavailable",
        description: "Stripe, credits, and x402 refund mutations remain unavailable until the host supports conditional database transactions and Pay adopts atomic refund claims. Existing configuration and ledger history remain readable.",
        action: /* @__PURE__ */ e("a", { className: "cedros-data-btn cedros-data-btn--primary cedros-data-btn--sm", href: "/admin/cedros-pay:admin:cedros-pay:settings-hub/overview", children: "Open Pay hub" })
      }
    ),
    G,
    E,
    M
  ] });
}
const Me = [
  {
    id: "transactions",
    label: "Transactions",
    title: "Transactions",
    description: "Review completed payments across card, crypto, and credits.",
    Component: We
  },
  {
    id: "orders",
    label: "Orders",
    title: "Orders",
    description: "Track purchase lifecycle, fulfillment status, and order revenue.",
    Component: Ue
  },
  {
    id: "refunds",
    label: "Refunds",
    title: "Refunds",
    description: "Review refund requests and outcomes across enabled payment methods.",
    Component: Ve
  },
  {
    id: "returns",
    label: "Returns",
    title: "Returns",
    description: "Manage return requests and their review status.",
    Component: Ee
  },
  {
    id: "disputes",
    label: "Disputes",
    title: "Disputes",
    description: "Review chargebacks and customer payment disputes.",
    Component: Te
  }
];
function at(t) {
  const { flags: n } = Ne(t.serverUrl, t.authManager), i = ve(
    () => Me.filter((m) => m.id === "refunds" ? n.refunds : m.id === "returns" ? n.returns : !0),
    [n]
  );
  return /* @__PURE__ */ e(
    Re,
    {
      ...t,
      tabs: i,
      routeSectionId: "transactions"
    }
  );
}
export {
  at as TransactionsHubSection
};
