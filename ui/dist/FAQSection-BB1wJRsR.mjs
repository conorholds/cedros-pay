import { jsxs as a, jsx as t } from "react/jsx-runtime";
import { useState as r, useCallback as R, useEffect as V, useMemo as G } from "react";
import { a0 as H, a1 as Y, $ as l } from "./index-C1hbnxn0.mjs";
function M({ serverUrl: u, apiKey: d, pageSize: A = 20, authManager: o }) {
  const [_, F] = r([]), [$, C] = r(!0), [S, N] = r(!1), [v, k] = r(null), [Q, I] = r(!1), [y, E] = r(""), [f, x] = r("all"), [q, w] = r(null), [T, b] = r(null), [n, m] = r({
    question: "",
    answer: "",
    keywordsCsv: "",
    active: !0,
    useInChat: !0,
    displayOnPage: !0
  }), p = R(async () => {
    C(!0);
    try {
      b(null);
      let e;
      const s = `/admin/faqs?limit=${A}`;
      if (o?.isAuthenticated())
        e = await o.fetchWithAuth(s);
      else {
        const c = { "Content-Type": "application/json" };
        d && (c["X-API-Key"] = d);
        const i = await fetch(`${u}${s}`, { headers: c });
        if (!i.ok) throw new Error(`Failed to fetch FAQs: ${i.status}`);
        e = await i.json();
      }
      F(e.faqs || []);
    } catch {
      F([]), b("Failed to load FAQs");
    } finally {
      C(!1);
    }
  }, [u, d, A, o]);
  V(() => {
    p();
  }, [p]);
  const D = async (e) => {
    if (e.preventDefault(), !(!n.question.trim() || !n.answer.trim())) {
      I(!0);
      try {
        const s = n.keywordsCsv.split(",").map((i) => i.trim().toLowerCase()).filter(Boolean), c = {
          question: n.question.trim(),
          answer: n.answer.trim(),
          keywords: s,
          active: n.active,
          useInChat: n.useInChat,
          displayOnPage: n.displayOnPage
        };
        if (v) {
          const i = `/admin/faqs/${v.id}`;
          if (o?.isAuthenticated())
            await o.fetchWithAuth(i, { method: "PUT", body: JSON.stringify(c) });
          else {
            const h = { "Content-Type": "application/json" };
            d && (h["X-API-Key"] = d);
            const O = await fetch(`${u}${i}`, { method: "PUT", headers: h, body: JSON.stringify(c) });
            if (!O.ok) throw new Error(`Failed to update FAQ: ${O.status}`);
          }
        } else if (o?.isAuthenticated())
          await o.fetchWithAuth("/admin/faqs", { method: "POST", body: JSON.stringify(c) });
        else {
          const i = { "Content-Type": "application/json" };
          d && (i["X-API-Key"] = d);
          const h = await fetch(`${u}/admin/faqs`, { method: "POST", headers: i, body: JSON.stringify(c) });
          if (!h.ok) throw new Error(`Failed to create FAQ: ${h.status}`);
        }
        g(), p();
      } catch {
        b(v ? "Failed to update FAQ" : "Failed to create FAQ");
      } finally {
        I(!1);
      }
    }
  }, j = async (e) => {
    try {
      const s = `/admin/faqs/${e}`;
      if (o?.isAuthenticated())
        await o.fetchWithAuth(s, { method: "DELETE" });
      else {
        const c = { "Content-Type": "application/json" };
        d && (c["X-API-Key"] = d);
        const i = await fetch(`${u}${s}`, { method: "DELETE", headers: c });
        if (!i.ok) throw new Error(`Failed to delete FAQ: ${i.status}`);
      }
      p();
    } catch {
      b("Failed to delete FAQ");
    }
    w(null);
  }, L = async (e) => {
    try {
      const s = `/admin/faqs/${e.id}`, c = { ...e, active: !e.active };
      if (o?.isAuthenticated())
        await o.fetchWithAuth(s, { method: "PUT", body: JSON.stringify(c) });
      else {
        const i = { "Content-Type": "application/json" };
        d && (i["X-API-Key"] = d);
        const h = await fetch(`${u}${s}`, { method: "PUT", headers: i, body: JSON.stringify(c) });
        if (!h.ok) throw new Error(`Failed to update FAQ: ${h.status}`);
      }
      p();
    } catch {
      b("Failed to update FAQ status");
    }
  }, g = () => {
    m({ question: "", answer: "", keywordsCsv: "", active: !0, useInChat: !0, displayOnPage: !0 }), k(null), N(!1);
  }, W = (e) => {
    m({
      question: e.question,
      answer: e.answer,
      keywordsCsv: e.keywords.join(", "),
      active: e.active,
      useInChat: e.useInChat ?? !0,
      displayOnPage: e.displayOnPage ?? !0
    }), k(e), N(!0);
  }, B = _.length, J = _.filter((e) => e.active).length, X = _.filter((e) => e.active && e.useInChat).length, U = _.filter((e) => e.active && e.displayOnPage).length, P = G(() => _.filter((e) => {
    if (f === "active" && !e.active || f === "inactive" && e.active) return !1;
    if (y) {
      const s = y.toLowerCase();
      return e.question.toLowerCase().includes(s) || e.answer.toLowerCase().includes(s) || e.keywords.some((c) => c.includes(s));
    }
    return !0;
  }), [_, f, y]);
  return /* @__PURE__ */ a("div", { className: "cedros-admin__faqs", children: [
    /* @__PURE__ */ t(H, { message: T, onRetry: p }),
    /* @__PURE__ */ t(
      Y,
      {
        stats: [
          { label: "Total FAQs", value: B },
          { label: "Active", value: J, variant: "success" },
          { label: "In Chat", value: X },
          { label: "On Page", value: U }
        ]
      }
    ),
    /* @__PURE__ */ a("div", { className: "cedros-admin__section", children: [
      /* @__PURE__ */ a("div", { className: "cedros-admin__section-header", children: [
        /* @__PURE__ */ a("div", { className: "cedros-admin__section-header-left", children: [
          /* @__PURE__ */ t("h3", { className: "cedros-admin__section-title", children: "Knowledge Base" }),
          /* @__PURE__ */ t("p", { className: "cedros-admin__section-subtitle", children: "Manage FAQs for the AI chat assistant and public FAQ page." })
        ] }),
        /* @__PURE__ */ t("div", { className: "cedros-admin__section-header-right", children: /* @__PURE__ */ a(
          "button",
          {
            className: "cedros-admin__button cedros-admin__button--primary",
            onClick: () => {
              g(), N(!0);
            },
            children: [
              l.plus,
              " Add FAQ"
            ]
          }
        ) })
      ] }),
      /* @__PURE__ */ a("div", { className: "cedros-admin__filters", style: { display: "flex", gap: "1rem", marginBottom: "1rem" }, children: [
        /* @__PURE__ */ t(
          "input",
          {
            type: "text",
            placeholder: "Search FAQs...",
            value: y,
            onChange: (e) => E(e.target.value),
            className: "cedros-admin__input",
            style: { flex: 1, maxWidth: 300 }
          }
        ),
        /* @__PURE__ */ a(
          "select",
          {
            value: f,
            onChange: (e) => x(e.target.value),
            className: "cedros-admin__select",
            children: [
              /* @__PURE__ */ t("option", { value: "all", children: "All Status" }),
              /* @__PURE__ */ t("option", { value: "active", children: "Active Only" }),
              /* @__PURE__ */ t("option", { value: "inactive", children: "Inactive Only" })
            ]
          }
        )
      ] }),
      S && /* @__PURE__ */ t("div", { className: "cedros-admin__form-container", style: { marginBottom: "1.5rem" }, children: /* @__PURE__ */ a("form", { onSubmit: D, className: "cedros-admin__form", children: [
        /* @__PURE__ */ a("div", { className: "cedros-admin__form-header", children: [
          /* @__PURE__ */ t("h4", { children: v ? "Edit FAQ" : "Add New FAQ" }),
          /* @__PURE__ */ t("button", { type: "button", className: "cedros-admin__button--icon", onClick: g, children: l.close })
        ] }),
        /* @__PURE__ */ a("div", { className: "cedros-admin__form-group", children: [
          /* @__PURE__ */ t("label", { className: "cedros-admin__label", children: "Question *" }),
          /* @__PURE__ */ t(
            "input",
            {
              type: "text",
              value: n.question,
              onChange: (e) => m((s) => ({ ...s, question: e.target.value })),
              className: "cedros-admin__input",
              placeholder: "What is your return policy?",
              required: !0
            }
          )
        ] }),
        /* @__PURE__ */ a("div", { className: "cedros-admin__form-group", children: [
          /* @__PURE__ */ t("label", { className: "cedros-admin__label", children: "Answer *" }),
          /* @__PURE__ */ t(
            "textarea",
            {
              value: n.answer,
              onChange: (e) => m((s) => ({ ...s, answer: e.target.value })),
              className: "cedros-admin__textarea",
              placeholder: "We accept returns within 30 days...",
              rows: 4,
              required: !0
            }
          ),
          /* @__PURE__ */ t("span", { className: "cedros-admin__hint", children: "Supports markdown formatting." })
        ] }),
        /* @__PURE__ */ a("div", { className: "cedros-admin__form-group", children: [
          /* @__PURE__ */ t("label", { className: "cedros-admin__label", children: "Keywords" }),
          /* @__PURE__ */ t(
            "input",
            {
              type: "text",
              value: n.keywordsCsv,
              onChange: (e) => m((s) => ({ ...s, keywordsCsv: e.target.value })),
              className: "cedros-admin__input",
              placeholder: "returns, refund, policy"
            }
          ),
          /* @__PURE__ */ t("span", { className: "cedros-admin__hint", children: "Comma-separated keywords to help AI find this FAQ." })
        ] }),
        /* @__PURE__ */ a("div", { className: "cedros-admin__form-group", children: [
          /* @__PURE__ */ a("label", { className: "cedros-admin__checkbox-label", children: [
            /* @__PURE__ */ t(
              "input",
              {
                type: "checkbox",
                checked: n.active,
                onChange: (e) => m((s) => ({ ...s, active: e.target.checked }))
              }
            ),
            /* @__PURE__ */ t("span", { children: "Active" })
          ] }),
          /* @__PURE__ */ t("span", { className: "cedros-admin__hint", children: "Inactive FAQs won't appear anywhere." })
        ] }),
        /* @__PURE__ */ a("div", { className: "cedros-admin__form-group", children: [
          /* @__PURE__ */ t("label", { className: "cedros-admin__label", children: "Visibility" }),
          /* @__PURE__ */ a("div", { className: "cedros-admin__checkbox-group", children: [
            /* @__PURE__ */ a("label", { className: "cedros-admin__checkbox-label", children: [
              /* @__PURE__ */ t(
                "input",
                {
                  type: "checkbox",
                  checked: n.useInChat,
                  onChange: (e) => m((s) => ({ ...s, useInChat: e.target.checked }))
                }
              ),
              /* @__PURE__ */ t("span", { children: "Use in AI Chat" })
            ] }),
            /* @__PURE__ */ a("label", { className: "cedros-admin__checkbox-label", children: [
              /* @__PURE__ */ t(
                "input",
                {
                  type: "checkbox",
                  checked: n.displayOnPage,
                  onChange: (e) => m((s) => ({ ...s, displayOnPage: e.target.checked }))
                }
              ),
              /* @__PURE__ */ t("span", { children: "Display on FAQ Page" })
            ] })
          ] }),
          /* @__PURE__ */ t("span", { className: "cedros-admin__hint", children: "Choose where this FAQ should appear." })
        ] }),
        /* @__PURE__ */ a("div", { className: "cedros-admin__form-actions", children: [
          /* @__PURE__ */ t("button", { type: "button", className: "cedros-admin__button", onClick: g, children: "Cancel" }),
          /* @__PURE__ */ t(
            "button",
            {
              type: "submit",
              className: "cedros-admin__button cedros-admin__button--primary",
              disabled: Q || !n.question.trim() || !n.answer.trim(),
              children: Q ? l.loading : v ? "Update FAQ" : "Create FAQ"
            }
          )
        ] })
      ] }) }),
      $ ? /* @__PURE__ */ a("div", { className: "cedros-admin__loading", children: [
        l.loading,
        /* @__PURE__ */ t("span", { children: "Loading FAQs..." })
      ] }) : P.length === 0 ? /* @__PURE__ */ t("div", { className: "cedros-admin__empty", children: /* @__PURE__ */ t("p", { children: y || f !== "all" ? "No FAQs match your filters." : "No FAQs yet. Add one to get started." }) }) : /* @__PURE__ */ t("div", { className: "cedros-admin__faq-list", children: P.map((e) => /* @__PURE__ */ a(
        "div",
        {
          className: `cedros-admin__faq-item ${e.active ? "" : "cedros-admin__faq-item--inactive"}`,
          children: [
            /* @__PURE__ */ a("div", { className: "cedros-admin__faq-content", children: [
              /* @__PURE__ */ a("div", { className: "cedros-admin__faq-question", children: [
                /* @__PURE__ */ t("span", { className: `cedros-admin__status-dot ${e.active ? "cedros-admin__status-dot--active" : "cedros-admin__status-dot--inactive"}` }),
                e.question
              ] }),
              /* @__PURE__ */ t("div", { className: "cedros-admin__faq-answer", children: e.answer }),
              /* @__PURE__ */ a("div", { className: "cedros-admin__faq-meta", children: [
                e.keywords.length > 0 && /* @__PURE__ */ t("div", { className: "cedros-admin__faq-keywords", children: e.keywords.map((s) => /* @__PURE__ */ t("span", { className: "cedros-admin__tag", children: s }, s)) }),
                /* @__PURE__ */ a("div", { className: "cedros-admin__faq-visibility", children: [
                  e.useInChat && /* @__PURE__ */ a("span", { className: "cedros-admin__badge cedros-admin__badge--chat", title: "Used in AI Chat", children: [
                    l.chat,
                    " Chat"
                  ] }),
                  e.displayOnPage && /* @__PURE__ */ a("span", { className: "cedros-admin__badge cedros-admin__badge--page", title: "Displayed on FAQ Page", children: [
                    l.globe,
                    " Page"
                  ] })
                ] })
              ] })
            ] }),
            /* @__PURE__ */ a("div", { className: "cedros-admin__faq-actions", children: [
              /* @__PURE__ */ t(
                "button",
                {
                  className: "cedros-admin__button--icon",
                  onClick: () => L(e),
                  title: e.active ? "Deactivate" : "Activate",
                  children: e.active ? l.eyeOff : l.eye
                }
              ),
              /* @__PURE__ */ t(
                "button",
                {
                  className: "cedros-admin__button--icon",
                  onClick: () => W(e),
                  title: "Edit",
                  children: l.edit
                }
              ),
              /* @__PURE__ */ t(
                "button",
                {
                  className: "cedros-admin__button--icon cedros-admin__btn--danger",
                  onClick: () => w(e.id),
                  title: "Delete",
                  children: l.trash
                }
              )
            ] }),
            q === e.id && /* @__PURE__ */ t("div", { className: "cedros-admin__confirm-overlay", children: /* @__PURE__ */ a("div", { className: "cedros-admin__confirm-dialog", children: [
              /* @__PURE__ */ t("p", { children: "Delete this FAQ?" }),
              /* @__PURE__ */ a("div", { className: "cedros-admin__confirm-actions", children: [
                /* @__PURE__ */ t("button", { className: "cedros-admin__button", onClick: () => w(null), children: "Cancel" }),
                /* @__PURE__ */ t(
                  "button",
                  {
                    className: "cedros-admin__button cedros-admin__button--danger",
                    onClick: () => j(e.id),
                    children: "Delete"
                  }
                )
              ] })
            ] }) })
          ]
        },
        e.id
      )) })
    ] })
  ] });
}
export {
  M as FAQSection
};
