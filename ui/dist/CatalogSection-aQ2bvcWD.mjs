import { jsx as a, jsxs as i, Fragment as Y } from "react/jsx-runtime";
import { useRef as ee, useLayoutEffect as ca, useEffect as W, useState as N, useId as X, useMemo as z, useCallback as B } from "react";
import { I as F, T as ce, S as ua, e as q, A as Qe, D as Se, f as ze, M as Me, N as ma, g as pa, E as j, L as ue, h as Ae, b as Ce, i as ha, j as ga, k as ya, d as we, u as me, F as se, l as ge } from "./plugin-C2z5irXJ.mjs";
import { c as pe, T as Ie, b as Pe, S as ke, u as je, a as Q, g as ba, E as Te, f as _a, d as fa, e as va } from "./TabbedHubSection-BsUoZ0Tr.mjs";
import { g as le } from "./fetchWithTimeout-D-qpKB_T.mjs";
import { r as H, f as re } from "./adminModules-BgSESzo7.mjs";
import { b as Ee } from "./useCedrosAutosave-BZATV2s-.mjs";
const Na = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])'
].join(",");
function Le(e) {
  return Array.from(e.querySelectorAll(Na)).filter(
    (t) => t.getAttribute("aria-hidden") !== "true"
  );
}
function Ca(e, t) {
  W(() => {
    const n = document.activeElement instanceof HTMLElement ? document.activeElement : null, o = e.current;
    if (!o) return;
    queueMicrotask(() => (Le(o)[0] ?? o).focus());
    const r = (d) => {
      if (d.key === "Escape") {
        d.preventDefault(), t.current();
        return;
      }
      if (d.key !== "Tab") return;
      const s = Le(o);
      if (s.length === 0) return;
      const c = s.indexOf(document.activeElement), m = d.shiftKey ? c <= 0 ? s.length - 1 : c - 1 : c === s.length - 1 ? 0 : c + 1;
      (c === -1 || m !== c + (d.shiftKey ? -1 : 1)) && (d.preventDefault(), s[m]?.focus());
    };
    return document.addEventListener("keydown", r), () => {
      document.removeEventListener("keydown", r), queueMicrotask(() => n?.focus());
    };
  }, [t, e]);
}
function he({
  children: e,
  describedBy: t,
  labelledBy: n,
  onClose: o,
  size: r = "default"
}) {
  const d = ee(null), s = ee(o);
  return ca(() => {
    s.current = o;
  }, [o]), Ca(d, s), /* @__PURE__ */ a(
    "div",
    {
      className: "cedros-data-dialog__overlay cedros-admin__modal-overlay",
      onMouseDown: (c) => {
        c.target === c.currentTarget && o();
      },
      children: /* @__PURE__ */ a(
        "div",
        {
          ref: d,
          className: `cedros-data-dialog cedros-admin__modal ${r === "large" ? "cedros-admin__modal--lg" : ""}`,
          role: "dialog",
          "aria-modal": "true",
          "aria-labelledby": n,
          "aria-describedby": t,
          tabIndex: -1,
          children: e
        }
      )
    }
  );
}
function Sa({
  authManager: e,
  onImported: t,
  onError: n
}) {
  const [o, r] = N(!1), [d, s] = N(!1), [c, m] = N(!1), [S, y] = N(null), [p, C] = N(/* @__PURE__ */ new Set()), [P, A] = N(null), _ = e?.isAuthenticated() === !0, l = async ({ preserveSummary: u = !1 } = {}) => {
    s(!0), u || A(null), n(null);
    try {
      const h = await H(e).fetchWithAuth(
        "/admin/products/stripe-import-preview?limit=100"
      );
      y(h), C(new Set(h.products.filter((g) => g.importable).map((g) => g.stripeProductId))), r(!0);
    } catch (h) {
      n(h instanceof Error ? h.message : "Failed to load Stripe import preview");
    } finally {
      s(!1);
    }
  }, b = async () => {
    m(!0), A(null), n(null);
    try {
      const u = await H(e).fetchWithAuth(
        "/admin/products/import-stripe",
        {
          method: "POST",
          body: JSON.stringify({ stripeProductIds: Array.from(p) })
        }
      );
      A(`Imported ${u.imported}; skipped ${u.skipped}.`), await t(u), await l({ preserveSummary: !0 });
    } catch (u) {
      n(u instanceof Error ? u.message : "Failed to import Stripe products");
    } finally {
      m(!1);
    }
  }, D = (u) => {
    C((h) => {
      const g = new Set(h);
      return g.has(u) ? g.delete(u) : g.add(u), g;
    });
  };
  return /* @__PURE__ */ i(Y, { children: [
    /* @__PURE__ */ i(
      "button",
      {
        type: "button",
        className: "cedros-data-btn cedros-admin__button cedros-data-btn--secondary cedros-admin__button--secondary cedros-admin__button--action",
        onClick: () => l(),
        disabled: !_ || d,
        children: [
          d ? F.loading : F.refresh,
          d ? "Loading…" : "Import from Stripe"
        ]
      }
    ),
    o && S && /* @__PURE__ */ i(
      he,
      {
        labelledBy: "cedros-pay-stripe-import-title",
        onClose: () => r(!1),
        size: "large",
        children: [
          /* @__PURE__ */ i("div", { className: "cedros-data-dialog__heading cedros-admin__section-header", children: [
            /* @__PURE__ */ a("h3", { id: "cedros-pay-stripe-import-title", className: "cedros-data-dialog__title cedros-admin__section-title", children: "Stripe import preview" }),
            /* @__PURE__ */ a(
              "button",
              {
                type: "button",
                className: "cedros-data-btn cedros-admin__button cedros-data-btn--ghost cedros-admin__button--ghost cedros-data-dialog__close",
                onClick: () => r(!1),
                "aria-label": "Close Stripe import preview",
                title: "Close",
                children: F.close
              }
            )
          ] }),
          /* @__PURE__ */ i("div", { style: { display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }, children: [
            /* @__PURE__ */ i("span", { className: "cedros-data-pill cedros-data-pill--success cedros-admin__badge cedros-admin__badge--success", children: [
              S.importable,
              " new"
            ] }),
            /* @__PURE__ */ i("span", { className: "cedros-data-pill cedros-admin__badge cedros-admin__badge--muted", children: [
              S.linked,
              " linked"
            ] }),
            /* @__PURE__ */ i("span", { className: "cedros-data-pill cedros-data-pill--warning cedros-admin__badge cedros-admin__badge--warning", children: [
              S.conflicts,
              " conflicts"
            ] }),
            /* @__PURE__ */ i("span", { className: "cedros-data-pill cedros-admin__badge cedros-admin__badge--muted", children: [
              S.warnings,
              " warnings"
            ] })
          ] }),
          P && /* @__PURE__ */ a("div", { style: { marginBottom: "0.75rem", fontWeight: 600 }, children: P }),
          /* @__PURE__ */ a("div", { className: "cedros-data-table-wrap cedros-admin__table-container", style: { maxHeight: 420, overflow: "auto" }, children: /* @__PURE__ */ i("table", { className: "cedros-data-table cedros-admin__table", "aria-busy": d, children: [
            /* @__PURE__ */ a("thead", { children: /* @__PURE__ */ i("tr", { children: [
              /* @__PURE__ */ a("th", { children: "Select" }),
              /* @__PURE__ */ a("th", { children: "Stripe product" }),
              /* @__PURE__ */ a("th", { children: "Local ID" }),
              /* @__PURE__ */ a("th", { children: "Price" }),
              /* @__PURE__ */ a("th", { children: "Status" })
            ] }) }),
            /* @__PURE__ */ a("tbody", { children: S.products.length === 0 ? /* @__PURE__ */ a(
              pe,
              {
                columns: 5,
                title: "No Stripe products found",
                description: "There are no Stripe products available to import."
              }
            ) : S.products.map((u) => /* @__PURE__ */ i("tr", { children: [
              /* @__PURE__ */ a("td", { children: /* @__PURE__ */ a(
                "input",
                {
                  type: "checkbox",
                  checked: p.has(u.stripeProductId),
                  disabled: !u.importable,
                  onChange: () => D(u.stripeProductId),
                  "aria-label": `Select ${u.title}`
                }
              ) }),
              /* @__PURE__ */ a("td", { children: /* @__PURE__ */ i("div", { style: { display: "flex", flexDirection: "column" }, children: [
                /* @__PURE__ */ a("span", { style: { fontWeight: 600 }, children: u.title }),
                /* @__PURE__ */ a("span", { style: { opacity: 0.75 }, children: u.description }),
                /* @__PURE__ */ a("code", { children: u.stripeProductId })
              ] }) }),
              /* @__PURE__ */ i("td", { children: [
                /* @__PURE__ */ a("code", { children: u.proposedProductId }),
                u.existingProductId && /* @__PURE__ */ i("div", { style: { opacity: 0.75 }, children: [
                  "Existing: ",
                  u.existingProductId
                ] })
              ] }),
              /* @__PURE__ */ a("td", { children: Ia(u) }),
              /* @__PURE__ */ a("td", { children: /* @__PURE__ */ a(Aa, { item: u }) })
            ] }, u.stripeProductId)) })
          ] }) }),
          /* @__PURE__ */ i("div", { className: "cedros-data-actions cedros-admin__form-actions", children: [
            /* @__PURE__ */ i(
              "button",
              {
                type: "button",
                className: "cedros-data-btn cedros-admin__button cedros-data-btn--secondary cedros-admin__button--secondary",
                onClick: () => l(),
                disabled: d || c,
                children: [
                  d ? F.loading : F.refresh,
                  "Refresh"
                ]
              }
            ),
            /* @__PURE__ */ i(
              "button",
              {
                type: "button",
                className: "cedros-data-btn cedros-admin__button cedros-data-btn--primary cedros-admin__button--primary",
                onClick: b,
                disabled: p.size === 0 || c,
                children: [
                  c ? F.loading : F.plus,
                  c ? "Importing…" : `Import ${p.size}`
                ]
              }
            )
          ] })
        ]
      }
    )
  ] });
}
function Aa({ item: e }) {
  const t = e.status === "new" ? "cedros-admin__badge--success" : e.status === "conflict" ? "cedros-admin__badge--warning" : "cedros-admin__badge--muted";
  return /* @__PURE__ */ i("div", { style: { display: "flex", flexDirection: "column", gap: 4 }, children: [
    /* @__PURE__ */ a("span", { className: `cedros-data-pill cedros-admin__badge ${t}`, children: wa(e.status) }),
    e.reason && /* @__PURE__ */ a("span", { style: { opacity: 0.75 }, children: e.reason }),
    e.warnings.map((n) => /* @__PURE__ */ a("span", { className: "cedros-admin__stripe-import-warning", children: n }, n))
  ] });
}
function wa(e) {
  switch (e) {
    case "new":
      return "New";
    case "linked":
      return "Linked";
    case "conflict":
      return "Conflict";
  }
}
function Ia(e) {
  return typeof e.amountCents != "number" || !e.currency ? "No default price" : `${e.currency.toUpperCase()} ${(e.amountCents / 100).toFixed(2)}`;
}
const De = [
  { code: "AF", name: "Afghanistan" },
  { code: "AX", name: "Åland Islands" },
  { code: "AL", name: "Albania" },
  { code: "DZ", name: "Algeria" },
  { code: "AS", name: "American Samoa" },
  { code: "AD", name: "Andorra" },
  { code: "AO", name: "Angola" },
  { code: "AI", name: "Anguilla" },
  { code: "AQ", name: "Antarctica" },
  { code: "AG", name: "Antigua and Barbuda" },
  { code: "AR", name: "Argentina" },
  { code: "AM", name: "Armenia" },
  { code: "AW", name: "Aruba" },
  { code: "AU", name: "Australia" },
  { code: "AT", name: "Austria" },
  { code: "AZ", name: "Azerbaijan" },
  { code: "BS", name: "Bahamas" },
  { code: "BH", name: "Bahrain" },
  { code: "BD", name: "Bangladesh" },
  { code: "BB", name: "Barbados" },
  { code: "BY", name: "Belarus" },
  { code: "BE", name: "Belgium" },
  { code: "BZ", name: "Belize" },
  { code: "BJ", name: "Benin" },
  { code: "BM", name: "Bermuda" },
  { code: "BT", name: "Bhutan" },
  { code: "BO", name: "Bolivia" },
  { code: "BQ", name: "Bonaire, Sint Eustatius and Saba" },
  { code: "BA", name: "Bosnia and Herzegovina" },
  { code: "BW", name: "Botswana" },
  { code: "BV", name: "Bouvet Island" },
  { code: "BR", name: "Brazil" },
  { code: "IO", name: "British Indian Ocean Territory" },
  { code: "BN", name: "Brunei Darussalam" },
  { code: "BG", name: "Bulgaria" },
  { code: "BF", name: "Burkina Faso" },
  { code: "BI", name: "Burundi" },
  { code: "CV", name: "Cabo Verde" },
  { code: "KH", name: "Cambodia" },
  { code: "CM", name: "Cameroon" },
  { code: "CA", name: "Canada" },
  { code: "KY", name: "Cayman Islands" },
  { code: "CF", name: "Central African Republic" },
  { code: "TD", name: "Chad" },
  { code: "CL", name: "Chile" },
  { code: "CN", name: "China" },
  { code: "CX", name: "Christmas Island" },
  { code: "CC", name: "Cocos (Keeling) Islands" },
  { code: "CO", name: "Colombia" },
  { code: "KM", name: "Comoros" },
  { code: "CG", name: "Congo" },
  { code: "CD", name: "Congo (Democratic Republic)" },
  { code: "CK", name: "Cook Islands" },
  { code: "CR", name: "Costa Rica" },
  { code: "CI", name: "Côte d’Ivoire" },
  { code: "HR", name: "Croatia" },
  { code: "CU", name: "Cuba" },
  { code: "CW", name: "Curaçao" },
  { code: "CY", name: "Cyprus" },
  { code: "CZ", name: "Czechia" },
  { code: "DK", name: "Denmark" },
  { code: "DJ", name: "Djibouti" },
  { code: "DM", name: "Dominica" },
  { code: "DO", name: "Dominican Republic" },
  { code: "EC", name: "Ecuador" },
  { code: "EG", name: "Egypt" },
  { code: "SV", name: "El Salvador" },
  { code: "GQ", name: "Equatorial Guinea" },
  { code: "ER", name: "Eritrea" },
  { code: "EE", name: "Estonia" },
  { code: "SZ", name: "Eswatini" },
  { code: "ET", name: "Ethiopia" },
  { code: "FK", name: "Falkland Islands" },
  { code: "FO", name: "Faroe Islands" },
  { code: "FJ", name: "Fiji" },
  { code: "FI", name: "Finland" },
  { code: "FR", name: "France" },
  { code: "GF", name: "French Guiana" },
  { code: "PF", name: "French Polynesia" },
  { code: "TF", name: "French Southern Territories" },
  { code: "GA", name: "Gabon" },
  { code: "GM", name: "Gambia" },
  { code: "GE", name: "Georgia" },
  { code: "DE", name: "Germany" },
  { code: "GH", name: "Ghana" },
  { code: "GI", name: "Gibraltar" },
  { code: "GR", name: "Greece" },
  { code: "GL", name: "Greenland" },
  { code: "GD", name: "Grenada" },
  { code: "GP", name: "Guadeloupe" },
  { code: "GU", name: "Guam" },
  { code: "GT", name: "Guatemala" },
  { code: "GG", name: "Guernsey" },
  { code: "GN", name: "Guinea" },
  { code: "GW", name: "Guinea-Bissau" },
  { code: "GY", name: "Guyana" },
  { code: "HT", name: "Haiti" },
  { code: "HM", name: "Heard Island and McDonald Islands" },
  { code: "VA", name: "Holy See" },
  { code: "HN", name: "Honduras" },
  { code: "HK", name: "Hong Kong" },
  { code: "HU", name: "Hungary" },
  { code: "IS", name: "Iceland" },
  { code: "IN", name: "India" },
  { code: "ID", name: "Indonesia" },
  { code: "IR", name: "Iran" },
  { code: "IQ", name: "Iraq" },
  { code: "IE", name: "Ireland" },
  { code: "IM", name: "Isle of Man" },
  { code: "IL", name: "Israel" },
  { code: "IT", name: "Italy" },
  { code: "JM", name: "Jamaica" },
  { code: "JP", name: "Japan" },
  { code: "JE", name: "Jersey" },
  { code: "JO", name: "Jordan" },
  { code: "KZ", name: "Kazakhstan" },
  { code: "KE", name: "Kenya" },
  { code: "KI", name: "Kiribati" },
  { code: "KP", name: "Korea (North)" },
  { code: "KR", name: "Korea (South)" },
  { code: "KW", name: "Kuwait" },
  { code: "KG", name: "Kyrgyzstan" },
  { code: "LA", name: "Laos" },
  { code: "LV", name: "Latvia" },
  { code: "LB", name: "Lebanon" },
  { code: "LS", name: "Lesotho" },
  { code: "LR", name: "Liberia" },
  { code: "LY", name: "Libya" },
  { code: "LI", name: "Liechtenstein" },
  { code: "LT", name: "Lithuania" },
  { code: "LU", name: "Luxembourg" },
  { code: "MO", name: "Macao" },
  { code: "MG", name: "Madagascar" },
  { code: "MW", name: "Malawi" },
  { code: "MY", name: "Malaysia" },
  { code: "MV", name: "Maldives" },
  { code: "ML", name: "Mali" },
  { code: "MT", name: "Malta" },
  { code: "MH", name: "Marshall Islands" },
  { code: "MQ", name: "Martinique" },
  { code: "MR", name: "Mauritania" },
  { code: "MU", name: "Mauritius" },
  { code: "YT", name: "Mayotte" },
  { code: "MX", name: "Mexico" },
  { code: "FM", name: "Micronesia" },
  { code: "MD", name: "Moldova" },
  { code: "MC", name: "Monaco" },
  { code: "MN", name: "Mongolia" },
  { code: "ME", name: "Montenegro" },
  { code: "MS", name: "Montserrat" },
  { code: "MA", name: "Morocco" },
  { code: "MZ", name: "Mozambique" },
  { code: "MM", name: "Myanmar" },
  { code: "NA", name: "Namibia" },
  { code: "NR", name: "Nauru" },
  { code: "NP", name: "Nepal" },
  { code: "NL", name: "Netherlands" },
  { code: "NC", name: "New Caledonia" },
  { code: "NZ", name: "New Zealand" },
  { code: "NI", name: "Nicaragua" },
  { code: "NE", name: "Niger" },
  { code: "NG", name: "Nigeria" },
  { code: "NU", name: "Niue" },
  { code: "NF", name: "Norfolk Island" },
  { code: "MK", name: "North Macedonia" },
  { code: "MP", name: "Northern Mariana Islands" },
  { code: "NO", name: "Norway" },
  { code: "OM", name: "Oman" },
  { code: "PK", name: "Pakistan" },
  { code: "PW", name: "Palau" },
  { code: "PS", name: "Palestine" },
  { code: "PA", name: "Panama" },
  { code: "PG", name: "Papua New Guinea" },
  { code: "PY", name: "Paraguay" },
  { code: "PE", name: "Peru" },
  { code: "PH", name: "Philippines" },
  { code: "PN", name: "Pitcairn" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "PR", name: "Puerto Rico" },
  { code: "QA", name: "Qatar" },
  { code: "RE", name: "Réunion" },
  { code: "RO", name: "Romania" },
  { code: "RU", name: "Russia" },
  { code: "RW", name: "Rwanda" },
  { code: "BL", name: "Saint Barthélemy" },
  { code: "SH", name: "Saint Helena, Ascension and Tristan da Cunha" },
  { code: "KN", name: "Saint Kitts and Nevis" },
  { code: "LC", name: "Saint Lucia" },
  { code: "MF", name: "Saint Martin (French part)" },
  { code: "PM", name: "Saint Pierre and Miquelon" },
  { code: "VC", name: "Saint Vincent and the Grenadines" },
  { code: "WS", name: "Samoa" },
  { code: "SM", name: "San Marino" },
  { code: "ST", name: "Sao Tome and Principe" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "SN", name: "Senegal" },
  { code: "RS", name: "Serbia" },
  { code: "SC", name: "Seychelles" },
  { code: "SL", name: "Sierra Leone" },
  { code: "SG", name: "Singapore" },
  { code: "SX", name: "Sint Maarten (Dutch part)" },
  { code: "SK", name: "Slovakia" },
  { code: "SI", name: "Slovenia" },
  { code: "SB", name: "Solomon Islands" },
  { code: "SO", name: "Somalia" },
  { code: "ZA", name: "South Africa" },
  { code: "GS", name: "South Georgia and the South Sandwich Islands" },
  { code: "SS", name: "South Sudan" },
  { code: "ES", name: "Spain" },
  { code: "LK", name: "Sri Lanka" },
  { code: "SD", name: "Sudan" },
  { code: "SR", name: "Suriname" },
  { code: "SJ", name: "Svalbard and Jan Mayen" },
  { code: "SE", name: "Sweden" },
  { code: "CH", name: "Switzerland" },
  { code: "SY", name: "Syria" },
  { code: "TW", name: "Taiwan" },
  { code: "TJ", name: "Tajikistan" },
  { code: "TZ", name: "Tanzania" },
  { code: "TH", name: "Thailand" },
  { code: "TL", name: "Timor-Leste" },
  { code: "TG", name: "Togo" },
  { code: "TK", name: "Tokelau" },
  { code: "TO", name: "Tonga" },
  { code: "TT", name: "Trinidad and Tobago" },
  { code: "TN", name: "Tunisia" },
  { code: "TR", name: "Türkiye" },
  { code: "TM", name: "Turkmenistan" },
  { code: "TC", name: "Turks and Caicos Islands" },
  { code: "TV", name: "Tuvalu" },
  { code: "UG", name: "Uganda" },
  { code: "UA", name: "Ukraine" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "GB", name: "United Kingdom" },
  { code: "US", name: "United States" },
  { code: "UM", name: "United States Minor Outlying Islands" },
  { code: "UY", name: "Uruguay" },
  { code: "UZ", name: "Uzbekistan" },
  { code: "VU", name: "Vanuatu" },
  { code: "VE", name: "Venezuela" },
  { code: "VN", name: "Vietnam" },
  { code: "VG", name: "Virgin Islands (British)" },
  { code: "VI", name: "Virgin Islands (U.S.)" },
  { code: "WF", name: "Wallis and Futuna" },
  { code: "EH", name: "Western Sahara" },
  { code: "YE", name: "Yemen" },
  { code: "ZM", name: "Zambia" },
  { code: "ZW", name: "Zimbabwe" }
], Je = new Map(De.map((e) => [e.code, e.name])), Pa = new Map(De.map((e) => [e.name.toLowerCase(), e.code]));
function ye(e) {
  return Je.get(e.toUpperCase()) ?? e;
}
function ka(e) {
  const t = e.trim();
  if (!t) return null;
  const n = t.toUpperCase();
  return Je.has(n) ? n : Pa.get(t.toLowerCase()) ?? null;
}
function te({
  title: e,
  description: t,
  children: n
}) {
  return /* @__PURE__ */ i("section", { className: "cedros-data-card cedros-admin__field-group", children: [
    /* @__PURE__ */ a("div", { className: "cedros-data-card__header cedros-admin__field-group-header", children: /* @__PURE__ */ i("div", { className: "cedros-admin__field-group-heading", children: [
      /* @__PURE__ */ a("h3", { className: "cedros-data-card__title cedros-admin__field-group-title", children: e }),
      t && /* @__PURE__ */ a("p", { className: "cedros-admin__field-group-description", children: t })
    ] }) }),
    /* @__PURE__ */ a("div", { className: "cedros-admin__field-group-body", children: n })
  ] });
}
function ae({
  label: e,
  value: t,
  onChange: n,
  options: o,
  description: r
}) {
  return /* @__PURE__ */ i("div", { className: "cedros-data-field cedros-admin__field", children: [
    /* @__PURE__ */ a("span", { className: "cedros-data-label cedros-admin__field-label", children: e }),
    /* @__PURE__ */ a(
      "div",
      {
        className: "cedros-admin__segmented cedros-admin__segmented--wrap",
        role: "group",
        "aria-label": e,
        children: o.map((d) => /* @__PURE__ */ a(
          "button",
          {
            type: "button",
            "aria-pressed": t === d.value,
            className: `cedros-admin__segmented-option ${t === d.value ? "cedros-admin__segmented-option--active" : ""}`,
            onClick: () => n(d.value),
            children: d.label
          },
          d.value
        ))
      }
    ),
    r && /* @__PURE__ */ a("div", { className: "cedros-admin__field-description", children: r })
  ] });
}
function Re({
  label: e,
  value: t,
  onChange: n,
  description: o,
  placeholder: r
}) {
  const [d, s] = N(""), c = X(), m = () => {
    const y = d.trim();
    if (!y || t.includes(y)) {
      s("");
      return;
    }
    n([...t, y]), s("");
  }, S = (y) => {
    (y.key === "Enter" || y.key === ",") && (y.preventDefault(), m());
  };
  return /* @__PURE__ */ i("div", { className: "cedros-data-field cedros-admin__field", children: [
    /* @__PURE__ */ a("label", { className: "cedros-data-label cedros-admin__field-label", htmlFor: c, children: e }),
    t.length > 0 && /* @__PURE__ */ a("div", { className: "cedros-admin__chips", role: "list", children: t.map((y) => /* @__PURE__ */ i("span", { className: "cedros-admin__chip", role: "listitem", children: [
      y,
      /* @__PURE__ */ a(
        "button",
        {
          type: "button",
          className: "cedros-admin__chip-remove",
          "aria-label": `Remove ${y}`,
          title: `Remove ${y}`,
          onClick: () => n(t.filter((p) => p !== y)),
          children: F.close
        }
      )
    ] }, y)) }),
    /* @__PURE__ */ i("div", { className: "cedros-admin__chip-add", children: [
      /* @__PURE__ */ a(
        "input",
        {
          id: c,
          className: "cedros-data-input cedros-admin__input",
          value: d,
          placeholder: r,
          onChange: (y) => s(y.target.value),
          onKeyDown: S
        }
      ),
      /* @__PURE__ */ i(
        "button",
        {
          type: "button",
          className: "cedros-data-btn cedros-admin__button cedros-data-btn--secondary cedros-admin__button--outline cedros-data-btn--sm cedros-admin__button--sm",
          onClick: m,
          disabled: !d.trim(),
          children: [
            F.plus,
            "Add"
          ]
        }
      )
    ] }),
    o && /* @__PURE__ */ a("div", { className: "cedros-admin__field-description", children: o })
  ] });
}
function Ta({
  label: e,
  value: t,
  onChange: n,
  description: o
}) {
  const [r, d] = N(""), [s, c] = N(null), m = X(), S = X(), y = () => {
    const C = ka(r);
    if (!C) {
      c("Pick a country from the list.");
      return;
    }
    t.includes(C) || n([...t, C]), d(""), c(null);
  }, p = (C) => {
    C.key === "Enter" && (C.preventDefault(), y());
  };
  return /* @__PURE__ */ i("div", { className: "cedros-data-field cedros-admin__field", children: [
    /* @__PURE__ */ a("label", { className: "cedros-data-label cedros-admin__field-label", htmlFor: m, children: e }),
    t.length > 0 && /* @__PURE__ */ a("div", { className: "cedros-admin__chips", role: "list", children: t.map((C) => /* @__PURE__ */ i("span", { className: "cedros-admin__chip", role: "listitem", children: [
      ye(C),
      /* @__PURE__ */ a(
        "button",
        {
          type: "button",
          className: "cedros-admin__chip-remove",
          "aria-label": `Remove ${ye(C)}`,
          title: `Remove ${ye(C)}`,
          onClick: () => n(t.filter((P) => P !== C)),
          children: F.close
        }
      )
    ] }, C)) }),
    /* @__PURE__ */ i("div", { className: "cedros-admin__chip-add", children: [
      /* @__PURE__ */ a(
        "input",
        {
          id: m,
          className: "cedros-data-input cedros-admin__input",
          list: S,
          value: r,
          placeholder: "Filter countries…",
          onChange: (C) => {
            d(C.target.value), s && c(null);
          },
          onKeyDown: p
        }
      ),
      /* @__PURE__ */ a("datalist", { id: S, children: De.map((C) => /* @__PURE__ */ a("option", { value: C.name }, C.code)) }),
      /* @__PURE__ */ i(
        "button",
        {
          type: "button",
          className: "cedros-data-btn cedros-admin__button cedros-data-btn--secondary cedros-admin__button--outline cedros-data-btn--sm cedros-admin__button--sm",
          onClick: y,
          disabled: !r.trim(),
          children: [
            F.plus,
            "Add"
          ]
        }
      )
    ] }),
    s ? /* @__PURE__ */ a("div", { className: "cedros-admin__field-error", children: s }) : o && /* @__PURE__ */ a("div", { className: "cedros-admin__field-description", children: o })
  ] });
}
function Ea({
  value: e,
  onChange: t,
  onBrowse: n,
  canBrowse: o
}) {
  const r = X();
  return /* @__PURE__ */ i("div", { className: "cedros-data-field cedros-admin__field", children: [
    /* @__PURE__ */ a("span", { className: "cedros-data-label cedros-admin__field-label", children: "Image" }),
    /* @__PURE__ */ i("div", { className: "cedros-admin__image-field", children: [
      e ? /* @__PURE__ */ a("img", { className: "cedros-admin__image-preview", src: e, alt: "" }) : /* @__PURE__ */ i(
        "button",
        {
          type: "button",
          className: "cedros-admin__image-empty",
          onClick: n,
          disabled: !o,
          children: [
            F.plus,
            "Choose image"
          ]
        }
      ),
      /* @__PURE__ */ i("div", { className: "cedros-admin__image-side", children: [
        e && /* @__PURE__ */ i("div", { className: "cedros-admin__image-actions", children: [
          /* @__PURE__ */ a(
            "button",
            {
              type: "button",
              className: "cedros-data-btn cedros-admin__button cedros-data-btn--secondary cedros-admin__button--secondary cedros-data-btn--sm cedros-admin__button--sm",
              onClick: n,
              disabled: !o,
              children: "Replace"
            }
          ),
          /* @__PURE__ */ i(
            "button",
            {
              type: "button",
              className: "cedros-data-btn cedros-admin__button cedros-data-btn--ghost cedros-admin__button--ghost cedros-data-btn--sm cedros-admin__button--sm",
              onClick: () => t(""),
              children: [
                F.trash,
                "Remove"
              ]
            }
          )
        ] }),
        /* @__PURE__ */ a(
          "input",
          {
            id: r,
            className: "cedros-data-input cedros-admin__input",
            type: "url",
            "aria-label": "Image URL",
            value: e,
            placeholder: "…or paste an image URL",
            onChange: (d) => t(d.target.value)
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ a("div", { className: "cedros-admin__field-description", children: "Shown on the product page and at checkout. A square image around 1000×1000 works best." })
  ] });
}
const Da = [
  { value: "non_consumable", label: "Unlock once" },
  { value: "consumable", label: "Used up (e.g. coins or credits)" },
  { value: "auto_renewable_subscription", label: "Renews automatically" }
], Fa = [
  { value: "digital_in_app", label: "Digital content" },
  { value: "reader_content", label: "Books, news, or media" },
  { value: "other", label: "Something else" }
];
function Ma({
  subscriptionsEnabled: e = !0,
  product: t,
  update: n,
  onSellInAppChange: o
}) {
  const r = Da.filter(
    (d) => e || d.value !== "auto_renewable_subscription"
  );
  return /* @__PURE__ */ i(
    te,
    {
      title: "In-app purchases",
      description: "Apple and Google require digital goods sold inside iOS and Android apps to use their in-app purchase systems. Turn this on and link your store products if you sell in those apps. Web checkout keeps working either way.",
      children: [
        /* @__PURE__ */ a(
          ce,
          {
            label: "Sell this through the App Store and Google Play",
            checked: t.sellInApp,
            onChange: o
          }
        ),
        t.sellInApp && /* @__PURE__ */ i(Y, { children: [
          /* @__PURE__ */ a(
            ae,
            {
              label: "What the customer gets",
              value: t.storeManagedKind === "none" ? "non_consumable" : t.storeManagedKind,
              onChange: (d) => n("storeManagedKind", d),
              options: r,
              description: "An unlock stays unlocked forever, a used-up item is spent on purchase, and a renewing item bills again each period."
            }
          ),
          /* @__PURE__ */ a(
            ua,
            {
              label: "What kind of content is this?",
              value: t.storePolicyFulfillment,
              onChange: (d) => n("storePolicyFulfillment", d),
              options: Fa,
              description: "Apple and Google use this to review your in-app product."
            }
          ),
          /* @__PURE__ */ i("div", { className: "cedros-admin__form-row", children: [
            /* @__PURE__ */ a(
              q,
              {
                label: "App Store product ID",
                value: t.appleProductId,
                onChange: (d) => n("appleProductId", d),
                placeholder: "com.yourapp.pro.monthly",
                description: "Create the matching product in App Store Connect, then paste its ID."
              }
            ),
            /* @__PURE__ */ a(
              q,
              {
                label: "Google Play product ID",
                value: t.googleProductId,
                onChange: (d) => n("googleProductId", d),
                placeholder: "pro_monthly",
                description: "Create the matching product or subscription in Google Play Console."
              }
            )
          ] }),
          /* @__PURE__ */ a(Qe, { children: /* @__PURE__ */ i("div", { className: "cedros-admin__form-row", children: [
            /* @__PURE__ */ a(
              q,
              {
                label: "Google package name",
                value: t.googlePackageName,
                onChange: (d) => n("googlePackageName", d),
                placeholder: "com.yourapp",
                description: "Your app’s package name in Google Play Console."
              }
            ),
            /* @__PURE__ */ a(
              q,
              {
                label: "Google base plan ID",
                value: t.googleBasePlanId,
                onChange: (d) => n("googleBasePlanId", d),
                placeholder: "basemonthly",
                description: "Required for subscriptions. Found under your subscription’s base plans."
              }
            ),
            /* @__PURE__ */ a(
              q,
              {
                label: "Google offer ID",
                value: t.googleOfferId,
                onChange: (d) => n("googleOfferId", d),
                placeholder: "Optional",
                description: "Links a specific intro or promotional offer, if you have one."
              }
            )
          ] }) })
        ] })
      ]
    }
  );
}
const La = [
  { value: "one_time", label: "One-time purchase" },
  { value: "subscription", label: "Subscription" },
  { value: "pay_per_access", label: "Pay per access" }
], Ra = [
  { value: "digital_download", label: "Digital" },
  { value: "shipping", label: "Physical" },
  { value: "service", label: "Service" }
], be = [
  { value: "none", label: "Don’t ask" },
  { value: "optional", label: "Optional" },
  { value: "required", label: "Required" }
];
function xa(e) {
  const { product: t, features: n = Se } = e, o = t.fulfillmentType === "shipping", r = t.fulfillmentType === "digital_download";
  return /* @__PURE__ */ i(Y, { children: [
    /* @__PURE__ */ a(Ba, { ...e }),
    /* @__PURE__ */ a(Ua, { ...e }),
    /* @__PURE__ */ a(Oa, { ...e }),
    o && /* @__PURE__ */ a(Ka, { ...e, inventoryEnabled: n.inventory }),
    /* @__PURE__ */ a($a, { ...e }),
    r && /* @__PURE__ */ a(
      Ma,
      {
        product: t,
        update: e.update,
        onSellInAppChange: e.onSellInAppChange,
        subscriptionsEnabled: n.subscriptions
      }
    ),
    /* @__PURE__ */ a(Va, { ...e })
  ] });
}
function Ba({ product: e, update: t, onTitleChange: n, onBrowseMedia: o, canBrowseMedia: r }) {
  return /* @__PURE__ */ i(te, { title: "Details", description: "What you’re selling and how it shows up to customers.", children: [
    /* @__PURE__ */ a(
      q,
      {
        label: "Name",
        value: e.title,
        onChange: n,
        placeholder: "e.g. Midweight Fleece Hoodie"
      }
    ),
    /* @__PURE__ */ a(
      ze,
      {
        label: "Description",
        value: e.description,
        onChange: (d) => t("description", d),
        rows: 3,
        placeholder: "A short, plain-language summary customers see on the product and at checkout."
      }
    ),
    /* @__PURE__ */ a(
      Ea,
      {
        value: e.imageUrl,
        onChange: (d) => t("imageUrl", d),
        onBrowse: o,
        canBrowse: r
      }
    ),
    /* @__PURE__ */ a(
      ce,
      {
        label: "Available for sale",
        checked: e.active,
        onChange: (d) => t("active", d),
        description: "Turn off to save as a draft customers can’t buy yet."
      }
    )
  ] });
}
function Ua({ product: e, update: t }) {
  return /* @__PURE__ */ a(te, { title: "Pricing", description: "What customers pay. They can check out with card, crypto, or credits.", children: /* @__PURE__ */ i("div", { className: "cedros-admin__form-row", children: [
    /* @__PURE__ */ a(
      Me,
      {
        label: "Price",
        amountCents: e.priceCents,
        currency: "USD",
        onChange: (n) => t("priceCents", n),
        placeholder: "0.00"
      }
    ),
    /* @__PURE__ */ a(
      Me,
      {
        label: "Original price",
        amountCents: e.compareAtCents,
        currency: "USD",
        onChange: (n) => t("compareAtCents", n),
        placeholder: "Optional",
        description: "Shown struck through next to your price to highlight a discount."
      }
    )
  ] }) });
}
function Oa({
  product: e,
  features: t = Se,
  onProductTypeChange: n,
  onFulfillmentChange: o
}) {
  const r = La.filter(
    (c) => t.subscriptions || c.value !== "subscription"
  ), d = Ra.filter(
    (c) => t.shipping || c.value !== "shipping" || e.fulfillmentType === "shipping"
  );
  let s = "Digital can be sold in mobile apps; services are booked or delivered in person.";
  return t.shipping && (s = t.inventory ? "Physical adds shipping and inventory; digital can be sold in mobile apps; services are booked or delivered in person and skip shipping." : "Physical adds shipping; digital can be sold in mobile apps; services are booked or delivered in person and skip shipping."), /* @__PURE__ */ i(te, { title: "How you sell it", description: "How customers receive what they bought and how they pay for it.", children: [
    /* @__PURE__ */ a(
      ae,
      {
        label: "Delivery",
        value: e.fulfillmentType,
        onChange: o,
        options: d,
        description: s
      }
    ),
    /* @__PURE__ */ a(
      ae,
      {
        label: "Sales type",
        value: e.productType,
        onChange: n,
        options: r,
        description: "Pricing details for subscriptions and pay-per-access are set up after you create this product."
      }
    )
  ] });
}
function Ka({
  inventoryEnabled: e,
  product: t,
  update: n
}) {
  return /* @__PURE__ */ i(
    te,
    {
      title: e ? "Shipping and inventory" : "Shipping",
      description: e ? "Stock levels and where you ship." : "Where you ship.",
      children: [
        e && /* @__PURE__ */ i(Y, { children: [
          /* @__PURE__ */ a(
            ce,
            {
              label: "Track inventory",
              checked: t.trackInventory,
              onChange: (o) => n("trackInventory", o),
              description: "Count down available stock as orders come in. Manage ongoing levels on the Inventory tab."
            }
          ),
          t.trackInventory && /* @__PURE__ */ a(
            ma,
            {
              label: "Quantity in stock",
              value: t.inventoryQuantity,
              onChange: (o) => n("inventoryQuantity", o),
              nullable: !0,
              min: 0,
              placeholder: "0"
            }
          )
        ] }),
        /* @__PURE__ */ a(
          Ta,
          {
            label: "Ships to",
            value: t.shippingCountries,
            onChange: (o) => n("shippingCountries", o),
            description: "Add each country you ship to. A shipping address is collected at checkout."
          }
        )
      ]
    }
  );
}
function $a({ product: e, update: t }) {
  return /* @__PURE__ */ i(
    te,
    {
      title: "Customer information",
      description: "What to ask buyers for at checkout. Keep it to what you’ll actually use.",
      children: [
        /* @__PURE__ */ a(
          ae,
          {
            label: "Email address",
            value: e.checkoutEmail,
            onChange: (n) => t("checkoutEmail", n),
            options: be,
            description: "Needed to send receipts and order updates."
          }
        ),
        /* @__PURE__ */ a(
          ae,
          {
            label: "Full name",
            value: e.checkoutName,
            onChange: (n) => t("checkoutName", n),
            options: be,
            description: "Useful for receipts and support. Recommended for anything you ship."
          }
        ),
        /* @__PURE__ */ a(
          ae,
          {
            label: "Phone number",
            value: e.checkoutPhone,
            onChange: (n) => t("checkoutPhone", n),
            options: be,
            description: "Only ask if you’ll use it for delivery or support."
          }
        )
      ]
    }
  );
}
function Va({
  product: e,
  update: t,
  onIdChange: n,
  idEditable: o,
  features: r = Se
}) {
  const d = r.coupons ? "Category IDs this product belongs to. Used for storefront grouping and category-wide coupons." : "Category IDs this product belongs to. Used for storefront grouping.";
  return /* @__PURE__ */ i(Qe, { children: [
    o ? /* @__PURE__ */ a(
      q,
      {
        label: "Product ID",
        value: e.id,
        onChange: n,
        placeholder: "e.g. midweight-fleece-hoodie",
        description: "Used in URLs and reports. Generated from the name — change it only if you need a specific value."
      }
    ) : /* @__PURE__ */ a(pa, { label: "Product ID", children: e.id }),
    /* @__PURE__ */ a(
      Re,
      {
        label: "Tags",
        value: e.tags,
        onChange: (s) => t("tags", s),
        placeholder: "Add a tag, e.g. apparel",
        description: "Optional labels for grouping and filtering products."
      }
    ),
    /* @__PURE__ */ a(
      Re,
      {
        label: "Categories",
        value: e.categoryIds,
        onChange: (s) => t("categoryIds", s),
        placeholder: "Add a category ID, e.g. cat_apparel",
        description: d
      }
    ),
    /* @__PURE__ */ a(
      q,
      {
        label: "SEO title",
        value: e.seoTitle,
        onChange: (s) => t("seoTitle", s),
        placeholder: "Defaults to the product name",
        description: "The title search engines and link previews show."
      }
    ),
    /* @__PURE__ */ a(
      ze,
      {
        label: "SEO description",
        value: e.seoDescription,
        onChange: (s) => t("seoDescription", s),
        rows: 2,
        placeholder: "Defaults to the description"
      }
    ),
    /* @__PURE__ */ a(
      q,
      {
        label: "Fulfillment note",
        value: e.fulfillmentNotes,
        onChange: (s) => t("fulfillmentNotes", s),
        placeholder: Ga(e.fulfillmentType),
        description: "A short delivery note shown to the customer after they buy."
      }
    ),
    /* @__PURE__ */ a(
      ce,
      {
        label: "Collect a billing address",
        checked: e.checkoutBillingAddress,
        onChange: (s) => t("checkoutBillingAddress", s),
        description: "Card payments already collect one. Turn this on if you also accept crypto or credits and need a billing address."
      }
    )
  ] });
}
function Ga(e) {
  switch (e) {
    case "shipping":
      return "e.g. Ships within 3–5 business days";
    case "service":
      return "e.g. We’ll reach out to schedule within 1 business day";
    default:
      return "e.g. Access is granted instantly after purchase";
  }
}
async function Wa(e, t, n = {}) {
  const o = new URLSearchParams(), r = n.query?.trim();
  return r && o.set("query", r), o.set("limit", String(n.limit ?? 48)), o.set("offset", "0"), (await H(e).fetchWithAuth(
    `/admin/media/assets?${o.toString()}`,
    { signal: n.signal }
  )).filter((s) => Ye(s, t) !== null);
}
function Ye(e, t) {
  if (!Ha(e)) return null;
  const n = e.variants ?? [], r = n.find(
    (d) => xe(d) && d.kind === "thumbnail"
  ) ?? n.find((d) => xe(d));
  return r?.url ? Be(t, r.url) : e.storage?.status === "stored" && e.storage.originalUrl?.trim() ? Be(t, e.storage.originalUrl) : null;
}
function Ha(e) {
  return e.assetClass === "image" || Ze(e.contentType);
}
function xe(e) {
  return e.storageStatus === "stored" && e.processingStatus === "ready" && !!e.url?.trim() && Ze(e.contentType);
}
function Ze(e) {
  return typeof e == "string" && e.toLowerCase().startsWith("image/");
}
function Be(e, t) {
  const n = t.trim();
  if (!n || /^[a-z][a-z0-9+.-]*:/iu.test(n) || !n.startsWith("/")) return n;
  try {
    return new URL(n, e).toString();
  } catch {
    return n;
  }
}
const qa = 48;
function Qa({
  open: e,
  serverUrl: t,
  authManager: n,
  onClose: o,
  onSelect: r
}) {
  const [d, s] = N(""), [c, m] = N([]), [S, y] = N(!1), [p, C] = N(null), [P, A] = N(0);
  W(() => {
    if (!e) return;
    const l = new AbortController();
    return y(!0), C(null), Wa(n, t, {
      query: d,
      limit: qa,
      signal: l.signal
    }).then(m).catch((b) => {
      l.signal.aborted || (m([]), C(b instanceof Error ? b.message : "Failed to load media library."));
    }).finally(() => {
      l.signal.aborted || y(!1);
    }), () => l.abort();
  }, [n, e, d, P, t]);
  const _ = z(
    () => c.map((l) => ({
      asset: l,
      url: Ye(l, t),
      label: l.filename || l.id
    })).filter(
      (l) => l.url !== null
    ),
    [c, t]
  );
  return e ? /* @__PURE__ */ i(he, { labelledBy: "cedros-pay-product-image-title", onClose: o, size: "large", children: [
    /* @__PURE__ */ i("div", { className: "cedros-data-dialog__heading cedros-admin__modal-header", children: [
      /* @__PURE__ */ a("h3", { id: "cedros-pay-product-image-title", className: "cedros-data-dialog__title cedros-admin__modal-title", children: "Product image" }),
      /* @__PURE__ */ a(
        "button",
        {
          type: "button",
          className: "cedros-data-btn cedros-admin__button cedros-data-btn--ghost cedros-admin__button--ghost cedros-data-btn--sm cedros-data-dialog__close",
          onClick: o,
          "aria-label": "Close product image picker",
          title: "Close",
          children: F.close
        }
      )
    ] }),
    /* @__PURE__ */ a(j, { message: p, onRetry: () => A((l) => l + 1) }),
    /* @__PURE__ */ i("div", { className: "cedros-data-field cedros-admin__field", style: { marginBottom: "1rem" }, children: [
      /* @__PURE__ */ a("label", { className: "cedros-data-label cedros-admin__field-label", htmlFor: "cedros-pay-media-search", children: "Search media library" }),
      /* @__PURE__ */ a(
        "input",
        {
          id: "cedros-pay-media-search",
          type: "search",
          className: "cedros-data-input cedros-admin__input",
          value: d,
          onChange: (l) => s(l.target.value),
          placeholder: "Filter by filename…"
        }
      )
    ] }),
    /* @__PURE__ */ a(
      "div",
      {
        className: "cedros-admin__grid cedros-admin__grid--media",
        role: "listbox",
        "aria-busy": S,
        style: {
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
          gap: "0.75rem",
          maxHeight: 420,
          overflow: "auto"
        },
        children: S && _.length === 0 ? /* @__PURE__ */ a(ue, { label: "Loading media library…" }) : p && _.length === 0 ? null : _.length === 0 ? /* @__PURE__ */ a("div", { className: "cedros-data-empty cedros-admin__empty", children: "No images found." }) : _.map(({ asset: l, label: b, url: D }) => /* @__PURE__ */ i(
          "button",
          {
            type: "button",
            role: "option",
            "aria-selected": !1,
            className: "cedros-admin__media-tile",
            onClick: () => {
              r(D), o();
            },
            children: [
              /* @__PURE__ */ a("span", { className: "cedros-admin__media-tile-frame", children: /* @__PURE__ */ a(
                "img",
                {
                  src: D,
                  alt: "",
                  loading: "lazy",
                  style: { width: "100%", height: "100%", objectFit: "cover", display: "block" }
                }
              ) }),
              /* @__PURE__ */ a("span", { className: "cedros-admin__media-tile-label", children: b })
            ]
          },
          l.id
        ))
      }
    )
  ] }) : null;
}
const za = 1e4, ja = /* @__PURE__ */ new Set([
  "digital_in_app",
  "reader_content",
  "other"
]);
function Xe() {
  return {
    id: "",
    title: "",
    imageUrl: "",
    description: "",
    seoTitle: "",
    seoDescription: "",
    productType: "one_time",
    priceCents: null,
    compareAtCents: null,
    fiatCurrency: "usd",
    cryptoToken: "USDC",
    trackInventory: !1,
    inventoryQuantity: null,
    tags: [],
    categoryIds: [],
    checkoutEmail: "required",
    checkoutName: "optional",
    checkoutPhone: "none",
    checkoutShippingAddress: !1,
    checkoutBillingAddress: !1,
    shippingCountries: [],
    fulfillmentType: "digital_download",
    storePolicyFulfillment: "digital_in_app",
    sellInApp: !1,
    storeManagedKind: "none",
    appleProductId: "",
    googleProductId: "",
    googlePackageName: "",
    googleBasePlanId: "",
    googleOfferId: "",
    fulfillmentNotes: "",
    active: !0
  };
}
function Ja(e) {
  return e.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function Ya(e, t, n) {
  return { ...e, title: t, id: n ? e.id : Ja(t) };
}
function Za(e, t) {
  const n = t === "digital_download", o = t === "shipping";
  return {
    ...e,
    fulfillmentType: t,
    storePolicyFulfillment: o ? "physical_goods" : t === "service" ? "real_world_service" : ja.has(e.storePolicyFulfillment) ? e.storePolicyFulfillment : "digital_in_app",
    sellInApp: n ? e.sellInApp : !1,
    storeManagedKind: n ? e.storeManagedKind : "none",
    trackInventory: o ? e.trackInventory : !1,
    // Physical goods need an address to ship to, so default it on (toggle off
    // for pickup); anything else never collects one.
    checkoutShippingAddress: o
  };
}
function Xa(e, t) {
  return e.sellInApp ? {
    ...e,
    productType: t,
    storeManagedKind: t === "subscription" ? "auto_renewable_subscription" : e.storeManagedKind === "auto_renewable_subscription" ? "non_consumable" : e.storeManagedKind
  } : { ...e, productType: t };
}
function et(e, t) {
  return {
    ...e,
    sellInApp: t,
    storeManagedKind: t ? e.productType === "subscription" ? "auto_renewable_subscription" : e.storeManagedKind === "none" ? "non_consumable" : e.storeManagedKind : "none"
  };
}
function at(e) {
  return e.title.trim() ? e.id.trim() ? e.description.trim() ? e.priceCents == null ? "Set a price." : e.fulfillmentType === "shipping" && e.shippingCountries.length === 0 ? "Add at least one country you ship to." : e.sellInApp && !e.appleProductId.trim() && !e.googleProductId.trim() ? "Add an App Store or Google Play product ID, or turn off in-app purchases." : e.googleBasePlanId.trim() && !e.googleProductId.trim() ? "A Google base plan ID needs a Google Play product ID." : e.sellInApp && e.storeManagedKind === "auto_renewable_subscription" && e.googleProductId.trim() && !e.googleBasePlanId.trim() ? "Google Play subscriptions need a base plan ID." : null : "Add a short description." : "Add a product ID under Advanced — the name had no usable characters." : "Add a product name.";
}
function ea(e) {
  const t = e.priceCents ?? 0, n = e.fulfillmentType === "shipping", o = aa(e);
  return {
    id: e.id.trim(),
    title: e.title.trim() || void 0,
    seoTitle: e.seoTitle.trim() || void 0,
    seoDescription: e.seoDescription.trim() || void 0,
    description: e.description.trim(),
    tags: e.tags,
    categoryIds: e.categoryIds,
    images: e.imageUrl ? [{ url: e.imageUrl, alt: e.title.trim() || e.id }] : [],
    shippingProfile: n ? "physical" : "digital",
    checkoutRequirements: {
      email: e.checkoutEmail,
      name: e.checkoutName,
      phone: e.checkoutPhone,
      shippingAddress: e.checkoutShippingAddress,
      billingAddress: e.checkoutBillingAddress
    },
    fulfillment: { type: e.fulfillmentType, notes: e.fulfillmentNotes.trim() || void 0 },
    fiatAmountCents: t,
    fiatCurrency: e.fiatCurrency,
    compareAtFiatAmountCents: e.compareAtCents ?? void 0,
    compareAtFiatCurrency: e.compareAtCents != null ? e.fiatCurrency : void 0,
    cryptoAtomicAmount: t * za,
    cryptoToken: e.cryptoToken,
    // Track inventory only sends a count when one was entered; a blank count
    // leaves the product untracked (unlimited) rather than silently set to 0.
    // Status follows the count so we never report "in stock" with 0 on hand.
    ...n && e.trackInventory && e.inventoryQuantity != null ? {
      inventoryStatus: e.inventoryQuantity > 0 ? "in_stock" : "out_of_stock",
      inventoryQuantity: e.inventoryQuantity
    } : {},
    ...o ? { storeBilling: o } : {},
    active: e.active,
    metadata: tt(e)
  };
}
function tt(e) {
  const t = {
    product_type: e.productType,
    store_policy_fulfillment_type: e.storePolicyFulfillment
  };
  return e.fulfillmentType === "shipping" && e.shippingCountries.length && (t.shippingCountries = e.shippingCountries.map((n) => n.toUpperCase()).join(",")), t;
}
function aa(e) {
  if (!e.sellInApp || e.storeManagedKind === "none") return;
  const t = e.appleProductId.trim(), n = e.googleProductId.trim();
  if (!(!t && !n))
    return {
      kind: e.storeManagedKind,
      apple: t ? { productId: t } : void 0,
      google: n ? {
        productId: n,
        packageName: e.googlePackageName.trim() || void 0,
        basePlanId: e.googleBasePlanId.trim() || void 0,
        offerId: e.googleOfferId.trim() || void 0
      } : void 0
    };
}
function nt(e) {
  return e === "failed" ? "error" : e;
}
function ta({
  title: e,
  subtitle: t,
  submitLabel: n,
  submittingLabel: o,
  initialForm: r,
  idEditable: d,
  features: s,
  authManager: c,
  serverUrl: m,
  onBack: S,
  onSubmit: y,
  autosave: p
}) {
  const [C, P] = N(() => r), [A, _] = N(!1), [l, b] = N(null), [D, u] = N(!1), h = ee(!d), g = (M, v) => P((O) => ({ ...O, [M]: v })), w = (M) => P((v) => Ya(v, M, h.current)), k = (M) => {
    h.current = !0, P((v) => ({ ...v, id: M }));
  }, L = async () => {
    const M = at(C);
    if (M)
      throw b(M), new Error(M);
    b(null), _(!0);
    try {
      return await y(C), { canonicalDraftKey: JSON.stringify(C) };
    } catch (v) {
      const O = v instanceof Error ? v.message : "Something went wrong. Try again.";
      throw b(O), new Error(O);
    } finally {
      _(!1);
    }
  }, T = Ae(JSON.stringify(C), L, {
    ready: p?.enabled === !0,
    delayMs: 600,
    resourceType: p?.resourceType ?? "product",
    resourceId: p?.resourceId ?? C.id,
    extensionId: "cedros-pay"
  }), f = p?.enabled === !0;
  return /* @__PURE__ */ i("div", { className: "cedros-data-stack cedros-admin__page", children: [
    /* @__PURE__ */ i(
      "button",
      {
        type: "button",
        className: "cedros-data-btn cedros-admin__button cedros-data-btn--ghost cedros-admin__button--ghost cedros-data-btn--sm cedros-admin__button--sm cedros-back-breadcrumb cedros-admin__page-back",
        onClick: S,
        children: [
          /* @__PURE__ */ a("span", { "aria-hidden": "true", children: "←" }),
          "Back to Products"
        ]
      }
    ),
    /* @__PURE__ */ a("div", { className: "cedros-data__header cedros-admin__page-header", children: /* @__PURE__ */ i("div", { className: "cedros-data__header-text", children: [
      /* @__PURE__ */ a("h2", { className: "cedros-data__title cedros-admin__page-title", children: e }),
      /* @__PURE__ */ a("p", { className: "cedros-data__subtitle cedros-admin__page-description", children: t })
    ] }) }),
    /* @__PURE__ */ a(j, { message: l }),
    /* @__PURE__ */ i("form", { className: "cedros-admin__product-form", onSubmit: async (M) => {
      M.preventDefault(), !f && await L().catch(() => {
      });
    }, children: [
      /* @__PURE__ */ a(
        xa,
        {
          product: C,
          update: g,
          idEditable: d,
          features: s,
          onTitleChange: w,
          onIdChange: k,
          onFulfillmentChange: (M) => P((v) => Za(v, M)),
          onProductTypeChange: (M) => P((v) => Xa(v, M)),
          onSellInAppChange: (M) => P((v) => et(v, M)),
          onBrowseMedia: () => u(!0),
          canBrowseMedia: !!c?.isAuthenticated()
        }
      ),
      /* @__PURE__ */ i("div", { className: "cedros-data-actions cedros-admin__product-form-footer", children: [
        /* @__PURE__ */ a(
          "button",
          {
            type: "button",
            className: "cedros-data-btn cedros-admin__button cedros-data-btn--secondary cedros-admin__button--secondary",
            onClick: S,
            disabled: A,
            children: "Cancel"
          }
        ),
        f ? /* @__PURE__ */ a(
          Ee,
          {
            status: T,
            className: `cedros-admin__autosave-indicator cedros-admin__autosave-indicator--${nt(T)}`
          }
        ) : /* @__PURE__ */ a(
          "button",
          {
            type: "submit",
            className: "cedros-data-btn cedros-admin__button cedros-data-btn--primary cedros-admin__button--primary",
            disabled: A,
            children: A ? o : n
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ a(
      Qa,
      {
        open: D,
        serverUrl: m,
        authManager: c,
        onClose: () => u(!1),
        onSelect: (M) => g("imageUrl", M)
      }
    )
  ] });
}
function it({
  authManager: e,
  serverUrl: t,
  features: n,
  onBack: o,
  onCreated: r
}) {
  return /* @__PURE__ */ a(
    ta,
    {
      title: "Add product",
      subtitle: "Create something to sell through your storefront and paywall. You can refine everything later.",
      submitLabel: "Create product",
      submittingLabel: "Creating…",
      initialForm: Xe(),
      idEditable: !0,
      authManager: e,
      serverUrl: t,
      features: n,
      onBack: o,
      onSubmit: async (d) => {
        await H(e).fetchWithAuth("/admin/products", {
          method: "POST",
          body: JSON.stringify(ea(d))
        }), r();
      }
    }
  );
}
function ne(e) {
  return e.title || e.description || e.id;
}
function na(e) {
  return e.imageUrl || e.images?.[0]?.url || e.metadata?.image_url;
}
function ot(e) {
  return typeof e == "number" ? `$${(e / 100).toFixed(2)}` : "No fiat price";
}
function Fe(e) {
  switch (e) {
    case "subscription":
      return "Subscription";
    case "pay_per_access":
      return "Pay per access";
    case "one_time":
      return "One-time purchase";
    default:
      return "One-time purchase";
  }
}
function st(e) {
  const t = e.metadata?.store_policy_fulfillment_type;
  if (t === "digital_in_app" || t === "physical_goods" || t === "real_world_service" || t === "reader_content" || t === "other")
    return t;
  switch (e.fulfillment?.type) {
    case "shipping":
      return "physical_goods";
    case "service":
      return "real_world_service";
    case "digital_download":
      return "digital_in_app";
    default:
      return;
  }
}
function rt(e) {
  switch (e) {
    case "digital_in_app":
      return "Digital in-app";
    case "physical_goods":
      return "Physical goods";
    case "real_world_service":
      return "Real-world service";
    case "reader_content":
      return "Reader content";
    case "other":
      return "Other";
    default:
      return "Not set";
  }
}
function dt(e) {
  switch (e) {
    case "consumable":
      return "Consumable";
    case "non_consumable":
      return "Non-consumable";
    case "auto_renewable_subscription":
      return "Auto-renewing subscription";
    default:
      return "External billing only";
  }
}
function lt(e) {
  const t = [], n = st(e);
  return n && t.push(rt(n)), e.storeBilling?.kind && t.push(dt(e.storeBilling.kind)), e.storeBilling?.apple?.productId && t.push(`Apple ${e.storeBilling.apple.productId}`), e.storeBilling?.google?.productId && t.push(`Google ${e.storeBilling.google.productId}`), t.join(" - ");
}
function ct(e, t, n, o) {
  return n === "active" && !e.active || n === "inactive" && e.active || o !== "all" && (e.metadata?.product_type ?? "one_time") !== o ? !1 : t ? [
    e.id,
    ne(e),
    e.description,
    Fe(e.metadata?.product_type)
  ].filter(Boolean).join(" ").toLowerCase().includes(t) : !0;
}
const ut = /* @__PURE__ */ new Set([
  "digital_in_app",
  "physical_goods",
  "real_world_service",
  "reader_content",
  "other"
]), mt = ["price", "fiatPrice", "cryptoPrice", "compareAtFiatPrice", "compareAtPrice", "imageUrls", "displayName"];
function _e(e, t) {
  return e === "none" || e === "optional" || e === "required" ? e : t;
}
function fe(e) {
  if (e && typeof e == "object" && "amountCents" in e) {
    const t = e.amountCents;
    if (typeof t == "number") return t;
  }
  return null;
}
function pt(e) {
  const t = e.imageUrls;
  if (Array.isArray(t)) {
    const n = t.find((o) => typeof o == "string" && o);
    if (typeof n == "string") return n;
  }
  return null;
}
function ht(e) {
  const t = Xe(), n = e, o = (e.fulfillment?.type ?? (e.shippingProfile === "physical" ? "shipping" : "digital_download")) === "shipping", r = o ? "shipping" : e.fulfillment?.type === "service" ? "service" : "digital_download", d = e.metadata?.store_policy_fulfillment_type, s = e.storeBilling ?? void 0, c = (e.metadata?.shippingCountries ?? "").split(",").map((m) => m.trim().toUpperCase()).filter(Boolean);
  return {
    ...t,
    id: e.id,
    title: e.title ?? "",
    imageUrl: na(e) ?? pt(n) ?? "",
    description: e.description ?? "",
    seoTitle: e.seoTitle ?? "",
    seoDescription: e.seoDescription ?? "",
    productType: e.metadata?.product_type ?? "one_time",
    priceCents: e.fiatAmountCents ?? fe(n.price) ?? fe(n.fiatPrice) ?? null,
    compareAtCents: e.compareAtFiatAmountCents ?? fe(n.compareAtFiatPrice) ?? null,
    fiatCurrency: e.fiatCurrency ?? t.fiatCurrency,
    cryptoToken: e.cryptoToken ?? t.cryptoToken,
    // Inventory is a physical-only concern; don't surface it for other delivery types.
    trackInventory: o && e.inventoryQuantity != null,
    inventoryQuantity: o ? e.inventoryQuantity ?? null : null,
    tags: e.tags ?? [],
    categoryIds: e.categoryIds ?? [],
    checkoutEmail: _e(e.checkoutRequirements?.email, t.checkoutEmail),
    checkoutName: _e(e.checkoutRequirements?.name, t.checkoutName),
    checkoutPhone: _e(e.checkoutRequirements?.phone, t.checkoutPhone),
    checkoutShippingAddress: o ? !0 : e.checkoutRequirements?.shippingAddress ?? !1,
    checkoutBillingAddress: e.checkoutRequirements?.billingAddress ?? !1,
    shippingCountries: c,
    fulfillmentType: r,
    storePolicyFulfillment: (d && ut.has(d) ? d : void 0) ?? (r === "shipping" ? "physical_goods" : r === "service" ? "real_world_service" : "digital_in_app"),
    sellInApp: !!s?.kind,
    storeManagedKind: s?.kind ?? "none",
    appleProductId: s?.apple?.productId ?? "",
    googleProductId: s?.google?.productId ?? "",
    googlePackageName: s?.google?.packageName ?? "",
    googleBasePlanId: s?.google?.basePlanId ?? "",
    googleOfferId: s?.google?.offerId ?? "",
    fulfillmentNotes: e.fulfillment?.notes ?? "",
    active: e.active ?? !0
  };
}
function gt(e, t) {
  const n = ea(e), o = e.fulfillmentType === "shipping", r = o && e.trackInventory && e.inventoryQuantity != null, d = aa(e), s = {
    ...t,
    ...n,
    id: t.id,
    title: e.title.trim() || null,
    seoTitle: e.seoTitle.trim() || null,
    seoDescription: e.seoDescription.trim() || null,
    compareAtFiatAmountCents: e.compareAtCents ?? null,
    compareAtFiatCurrency: e.compareAtCents != null ? e.fiatCurrency : null,
    storeBilling: d ?? null,
    images: yt(t, e.imageUrl, e.title.trim() || t.id),
    active: e.active,
    metadata: bt(t.metadata, e),
    // Inventory is physical-only: clear it for a shipped-but-untracked item;
    // leave it untouched (via the existing spread) for non-physical products.
    ...o && !r ? { inventoryStatus: null, inventoryQuantity: null } : {}
  };
  for (const c of mt) delete s[c];
  return s;
}
function yt(e, t, n) {
  const o = e, r = (e.images ?? []).map((c) => ({ url: c.url, alt: c.alt })), d = Array.isArray(o.imageUrls) ? o.imageUrls.filter((c) => typeof c == "string").map((c) => ({ url: c })) : [], s = (r.length ? r : d).slice(1);
  return t ? [{ url: t, alt: n }, ...s] : s;
}
function bt(e, t) {
  const n = {
    ...e ?? {},
    product_type: t.productType,
    store_policy_fulfillment_type: t.storePolicyFulfillment
  };
  return delete n.image_url, t.fulfillmentType === "shipping" && t.shippingCountries.length ? n.shippingCountries = t.shippingCountries.map((o) => o.toUpperCase()).join(",") : delete n.shippingCountries, n;
}
function _t({
  product: e,
  authManager: t,
  serverUrl: n,
  features: o,
  onBack: r,
  onSaved: d
}) {
  return /* @__PURE__ */ a(
    ta,
    {
      title: "Edit product",
      subtitle: `Update “${ne(e)}”. Changes are stored as you edit.`,
      submitLabel: "Update product",
      submittingLabel: "Updating…",
      initialForm: ht(e),
      idEditable: !1,
      authManager: t,
      serverUrl: n,
      features: o,
      onBack: r,
      autosave: {
        enabled: !0,
        resourceType: "product",
        resourceId: e.id
      },
      onSubmit: async (s) => {
        await H(t).fetchWithAuth(
          `/admin/products/${encodeURIComponent(e.id)}`,
          { method: "PUT", body: JSON.stringify(gt(s, e)) }
        ), d();
      }
    }
  );
}
function ft({
  productId: e,
  authManager: t
}) {
  const [n, o] = N(null), [r, d] = N(!1), [s, c] = N(!1), [m, S] = N(null), y = B(async () => {
    if (e) {
      d(!0), S(null);
      try {
        const P = await re(
          t,
          `/admin/products/${e}/variations`
        );
        P.variationConfig || (P.variationConfig = { variationTypes: [] }), P.variants || (P.variants = []), o(P);
      } catch (P) {
        const A = P instanceof Error ? P.message : "Failed to fetch variations";
        S(A), o({
          productId: e,
          variationConfig: { variationTypes: [] },
          variants: []
        });
      } finally {
        d(!1);
      }
    }
  }, [e, t]), p = B(
    async (P) => {
      if (!e) return null;
      c(!0), S(null);
      try {
        const A = await H(t).fetchWithAuth(
          `/admin/products/${e}/variations`,
          {
            method: "PUT",
            body: JSON.stringify(P)
          }
        ), _ = {
          variationConfig: A.variationConfig,
          variants: A.variants,
          variantsCreated: A.variantsCreated
        };
        return o({
          productId: e,
          variationConfig: _.variationConfig,
          variants: _.variants
        }), _;
      } catch (A) {
        const _ = A instanceof Error ? A.message : "Failed to save variations";
        return S(_), null;
      } finally {
        c(!1);
      }
    },
    [e, t]
  ), C = B(
    async (P) => {
      if (!e || P.length === 0) return !1;
      c(!0), S(null);
      try {
        if (await H(t).fetchWithAuth(
          `/admin/products/${e}/variants/inventory`,
          {
            method: "PUT",
            body: JSON.stringify({ updates: P })
          }
        ), n) {
          const A = new Map(P.map((_) => [_.variantId, _]));
          o({
            ...n,
            variants: n.variants.map((_) => {
              const l = A.get(_.id);
              return l ? {
                ..._,
                inventoryQuantity: l.inventoryQuantity,
                inventoryStatus: l.inventoryStatus ?? _.inventoryStatus
              } : _;
            })
          });
        }
        return !0;
      } catch (A) {
        const _ = A instanceof Error ? A.message : "Failed to update inventory";
        return S(_), !1;
      } finally {
        c(!1);
      }
    },
    [e, t, n]
  );
  return {
    data: n,
    isLoading: r,
    error: m,
    fetch: y,
    save: p,
    bulkUpdateInventory: C,
    isSaving: s
  };
}
function Ue() {
  return `var_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
function vt({
  value: e,
  onChange: t,
  maxTypes: n = 5,
  maxValuesPerType: o = 20,
  disabled: r = !1
}) {
  const [d, s] = N(null), [c, m] = N(""), [S, y] = N({}), p = e.variationTypes, C = B(() => {
    if (!c.trim() || p.length >= n) return;
    const u = {
      id: Ue(),
      name: c.trim(),
      displayOrder: p.length,
      values: []
    };
    t({
      variationTypes: [...p, u]
    }), m(""), s(u.id);
  }, [c, p, n, t]), P = B(
    (u) => {
      t({
        variationTypes: p.filter((h) => h.id !== u).map((h, g) => ({ ...h, displayOrder: g }))
      }), d === u && s(null);
    },
    [p, t, d]
  ), A = B(
    (u, h) => {
      t({
        variationTypes: p.map(
          (g) => g.id === u ? { ...g, name: h } : g
        )
      });
    },
    [p, t]
  ), _ = B(
    (u, h) => {
      const g = p.findIndex((L) => L.id === u);
      if (g === -1 || h === "up" && g === 0 || h === "down" && g === p.length - 1) return;
      const w = [...p], k = h === "up" ? g - 1 : g + 1;
      [w[g], w[k]] = [w[k], w[g]], t({
        variationTypes: w.map((L, T) => ({ ...L, displayOrder: T }))
      });
    },
    [p, t]
  ), l = B(
    (u) => {
      const h = (S[u] || "").trim();
      if (!h) return;
      const g = p.find((k) => k.id === u);
      if (!g || g.values.length >= o) return;
      const w = {
        id: Ue(),
        label: h
      };
      t({
        variationTypes: p.map(
          (k) => k.id === u ? { ...k, values: [...k.values, w] } : k
        )
      }), y((k) => ({ ...k, [u]: "" }));
    },
    [p, S, o, t]
  ), b = B(
    (u, h) => {
      t({
        variationTypes: p.map(
          (g) => g.id === u ? { ...g, values: g.values.filter((w) => w.id !== h) } : g
        )
      });
    },
    [p, t]
  ), D = B(
    (u, h, g) => {
      t({
        variationTypes: p.map(
          (w) => w.id === u ? {
            ...w,
            values: w.values.map(
              (k) => k.id === h ? { ...k, label: g } : k
            )
          } : w
        )
      });
    },
    [p, t]
  );
  return /* @__PURE__ */ i("div", { className: "cedros-admin__variation-editor", children: [
    /* @__PURE__ */ i("div", { className: "cedros-admin__variation-editor-header", children: [
      /* @__PURE__ */ a("h4", { className: "cedros-data-label cedros-admin__field-label", style: { marginBottom: 0 }, children: "Variation types" }),
      /* @__PURE__ */ i("span", { style: { fontSize: 12, opacity: 0.7 }, children: [
        p.length,
        "/",
        n,
        " types"
      ] })
    ] }),
    p.length === 0 ? /* @__PURE__ */ a("div", { className: "cedros-admin__variation-empty", children: 'No variation types defined. Add types like "Size" or "Color" to create product variants.' }) : /* @__PURE__ */ a("div", { className: "cedros-admin__variation-type-list", children: p.map((u, h) => /* @__PURE__ */ i("div", { className: "cedros-admin__variation-type-item", children: [
      /* @__PURE__ */ i("div", { className: "cedros-admin__variation-type-header", children: [
        /* @__PURE__ */ i("div", { className: "cedros-admin__variation-type-controls", children: [
          /* @__PURE__ */ a(
            "button",
            {
              type: "button",
              className: "cedros-data-btn cedros-admin__button cedros-data-btn--ghost cedros-admin__button--ghost cedros-admin__button--icon",
              onClick: () => _(u.id, "up"),
              disabled: r || h === 0,
              title: "Move up",
              "aria-label": `Move ${u.name || "variation type"} up`,
              children: F.arrowUp
            }
          ),
          /* @__PURE__ */ a(
            "button",
            {
              type: "button",
              className: "cedros-data-btn cedros-admin__button cedros-data-btn--ghost cedros-admin__button--ghost cedros-admin__button--icon",
              onClick: () => _(u.id, "down"),
              disabled: r || h === p.length - 1,
              title: "Move down",
              "aria-label": `Move ${u.name || "variation type"} down`,
              children: F.arrowDown
            }
          )
        ] }),
        /* @__PURE__ */ a(
          "input",
          {
            type: "text",
            className: "cedros-data-input cedros-admin__input cedros-admin__variation-type-name",
            value: u.name,
            onChange: (g) => A(u.id, g.target.value),
            disabled: r,
            placeholder: "Type name"
          }
        ),
        /* @__PURE__ */ i("span", { className: "cedros-admin__variation-value-count", children: [
          u.values.length,
          " values"
        ] }),
        /* @__PURE__ */ a(
          "button",
          {
            type: "button",
            className: "cedros-data-btn cedros-admin__button cedros-data-btn--ghost cedros-admin__button--ghost",
            onClick: () => s(
              d === u.id ? null : u.id
            ),
            children: d === u.id ? "Collapse" : "Edit values"
          }
        ),
        /* @__PURE__ */ a(
          "button",
          {
            type: "button",
            className: "cedros-data-btn cedros-admin__button cedros-data-btn--ghost cedros-admin__button--ghost cedros-data-btn--danger cedros-admin__button--danger",
            onClick: () => P(u.id),
            disabled: r,
            title: "Remove type",
            "aria-label": `Remove ${u.name || "variation type"}`,
            children: F.delete
          }
        )
      ] }),
      d === u.id && /* @__PURE__ */ i("div", { className: "cedros-admin__variation-values", children: [
        /* @__PURE__ */ i("div", { className: "cedros-admin__variation-values-header", children: [
          /* @__PURE__ */ i("span", { style: { fontSize: 12, fontWeight: 600 }, children: [
            'Values for "',
            u.name,
            '"'
          ] }),
          /* @__PURE__ */ i("span", { style: { fontSize: 11, opacity: 0.7 }, children: [
            u.values.length,
            "/",
            o
          ] })
        ] }),
        u.values.length === 0 ? /* @__PURE__ */ a("div", { className: "cedros-admin__variation-empty", style: { padding: "8px 0" }, children: 'No values yet. Add values like "Small", "Medium", "Large".' }) : /* @__PURE__ */ a("div", { className: "cedros-admin__variation-value-list", children: u.values.map((g) => /* @__PURE__ */ i("div", { className: "cedros-admin__variation-value-item", children: [
          /* @__PURE__ */ a(
            "input",
            {
              type: "text",
              className: "cedros-data-input cedros-admin__input cedros-admin__input--sm",
              value: g.label,
              onChange: (w) => D(u.id, g.id, w.target.value),
              disabled: r
            }
          ),
          /* @__PURE__ */ a(
            "button",
            {
              type: "button",
              className: "cedros-data-btn cedros-admin__button cedros-data-btn--ghost cedros-admin__button--ghost cedros-admin__button--icon cedros-data-btn--danger cedros-admin__button--danger",
              onClick: () => b(u.id, g.id),
              disabled: r,
              title: "Remove value",
              "aria-label": `Remove ${g.label || "variation value"}`,
              children: F.close
            }
          )
        ] }, g.id)) }),
        u.values.length < o && /* @__PURE__ */ i("div", { className: "cedros-admin__variation-add-value", children: [
          /* @__PURE__ */ a(
            "input",
            {
              type: "text",
              className: "cedros-data-input cedros-admin__input cedros-admin__input--sm",
              value: S[u.id] || "",
              onChange: (g) => y((w) => ({
                ...w,
                [u.id]: g.target.value
              })),
              placeholder: "Add value…",
              disabled: r,
              onKeyDown: (g) => {
                g.key === "Enter" && (g.preventDefault(), l(u.id));
              }
            }
          ),
          /* @__PURE__ */ a(
            "button",
            {
              type: "button",
              className: "cedros-data-btn cedros-admin__button cedros-data-btn--secondary cedros-admin__button--secondary cedros-data-btn--sm cedros-admin__button--sm",
              onClick: () => l(u.id),
              disabled: r || !S[u.id]?.trim(),
              children: "Add"
            }
          )
        ] })
      ] })
    ] }, u.id)) }),
    p.length < n && /* @__PURE__ */ i("div", { className: "cedros-admin__variation-add-type", children: [
      /* @__PURE__ */ a(
        "input",
        {
          type: "text",
          className: "cedros-data-input cedros-admin__input",
          value: c,
          onChange: (u) => m(u.target.value),
          placeholder: "New variation type (e.g., Size, Color)",
          disabled: r,
          onKeyDown: (u) => {
            u.key === "Enter" && (u.preventDefault(), C());
          }
        }
      ),
      /* @__PURE__ */ a(
        "button",
        {
          type: "button",
          className: "cedros-data-btn cedros-admin__button cedros-data-btn--secondary cedros-admin__button--secondary",
          onClick: C,
          disabled: r || !c.trim(),
          children: "Add type"
        }
      )
    ] })
  ] });
}
function Oe() {
  return `variant_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
function Nt(e) {
  if (e.length === 0) return [];
  const t = [...e].sort((o, r) => o.displayOrder - r.displayOrder), n = (o, r) => {
    if (o >= t.length) {
      const c = r.valueIds.sort().join("|"), m = Object.values(r.options).join(" / ");
      return [
        {
          key: c,
          title: m,
          optionValueIds: [...r.valueIds],
          options: { ...r.options }
        }
      ];
    }
    const d = t[o], s = [];
    for (const c of d.values)
      s.push(
        ...n(o + 1, {
          valueIds: [...r.valueIds, c.id],
          options: { ...r.options, [d.name]: c.label }
        })
      );
    return s;
  };
  return n(0, { valueIds: [], options: {} });
}
function Ct(e) {
  return [...e.optionValueIds].sort().join("|");
}
function St({
  variationConfig: e,
  variants: t,
  onChange: n,
  defaultPrice: o = 0,
  currencySymbol: r = "$",
  maxVariants: d = 100,
  disabled: s = !1
}) {
  const c = z(
    () => Nt(e.variationTypes),
    [e.variationTypes]
  ), m = z(() => {
    const _ = /* @__PURE__ */ new Map();
    for (const l of t)
      _.set(Ct(l), l);
    return _;
  }, [t]), { existingRows: S, possibleRows: y } = z(() => {
    const _ = [], l = [];
    for (const b of c) {
      const D = m.get(b.key);
      D ? _.push({ combo: b, variant: D }) : l.push(b);
    }
    return { existingRows: _, possibleRows: l };
  }, [c, m]), p = B(
    (_, l) => {
      n(
        t.map((b) => b.id === _ ? { ...b, ...l } : b)
      );
    },
    [t, n]
  ), C = B(
    (_) => {
      n(t.filter((l) => l.id !== _));
    },
    [t, n]
  ), P = B(
    (_) => {
      if (t.length >= d) return;
      const l = {
        id: Oe(),
        title: _.title,
        optionValueIds: _.optionValueIds,
        price: o,
        inventoryQuantity: 0,
        inventoryStatus: "in_stock",
        autoGenerated: !1
      };
      n([...t, l]);
    },
    [t, n, d, o]
  ), A = B(() => {
    const _ = d - t.length, b = y.slice(0, _).map((D) => ({
      id: Oe(),
      title: D.title,
      optionValueIds: D.optionValueIds,
      price: o,
      inventoryQuantity: 0,
      inventoryStatus: "in_stock",
      autoGenerated: !0
    }));
    n([...t, ...b]);
  }, [t, n, y, d, o]);
  return e.variationTypes.length === 0 ? /* @__PURE__ */ a("div", { className: "cedros-admin__variant-grid-empty", children: "Add variation types above to create product variants." }) : c.length === 0 ? /* @__PURE__ */ a("div", { className: "cedros-admin__variant-grid-empty", children: "Add values to your variation types to create product variants." }) : /* @__PURE__ */ i("div", { className: "cedros-admin__variant-grid", children: [
    /* @__PURE__ */ i("div", { className: "cedros-admin__variant-grid-header", children: [
      /* @__PURE__ */ a("h4", { className: "cedros-data-label cedros-admin__field-label", style: { marginBottom: 0 }, children: "Variants" }),
      /* @__PURE__ */ i("span", { style: { fontSize: 12, opacity: 0.7 }, children: [
        t.length,
        "/",
        d,
        " variants (",
        c.length,
        " ",
        "possible)"
      ] })
    ] }),
    y.length > 0 && t.length < d && /* @__PURE__ */ i("div", { className: "cedros-admin__variant-grid-actions", children: [
      /* @__PURE__ */ i(
        "button",
        {
          type: "button",
          className: "cedros-data-btn cedros-admin__button cedros-data-btn--secondary cedros-admin__button--secondary",
          onClick: A,
          disabled: s,
          children: [
            "Generate all (",
            Math.min(y.length, d - t.length),
            ")"
          ]
        }
      ),
      /* @__PURE__ */ a("span", { style: { fontSize: 11, opacity: 0.7 }, children: "Creates variants with default price and 0 inventory" })
    ] }),
    /* @__PURE__ */ a("div", { className: "cedros-data-table-wrap cedros-admin__table-container", children: /* @__PURE__ */ i("table", { className: "cedros-data-table cedros-admin__table cedros-admin__variant-table", children: [
      /* @__PURE__ */ a("thead", { children: /* @__PURE__ */ i("tr", { children: [
        /* @__PURE__ */ a("th", { children: "Variant" }),
        /* @__PURE__ */ a("th", { style: { width: 100 }, children: "Price" }),
        /* @__PURE__ */ a("th", { style: { width: 80 }, children: "Qty" }),
        /* @__PURE__ */ a("th", { style: { width: 100 }, children: "SKU" }),
        /* @__PURE__ */ a("th", { style: { width: 100 }, children: "Status" }),
        /* @__PURE__ */ a("th", { style: { width: 80 }, children: "Actions" })
      ] }) }),
      /* @__PURE__ */ i("tbody", { children: [
        S.map(({ combo: _, variant: l }) => /* @__PURE__ */ i("tr", { children: [
          /* @__PURE__ */ a("td", { children: /* @__PURE__ */ i("div", { style: { display: "flex", flexDirection: "column" }, children: [
            /* @__PURE__ */ a("span", { style: { fontWeight: 600 }, children: _.title }),
            /* @__PURE__ */ a("span", { style: { fontSize: 11, opacity: 0.6 }, children: Object.entries(_.options).map(([b, D]) => `${b}: ${D}`).join(", ") })
          ] }) }),
          /* @__PURE__ */ a("td", { children: /* @__PURE__ */ i("div", { style: { display: "flex", alignItems: "center", gap: 4 }, children: [
            /* @__PURE__ */ a("span", { children: r }),
            /* @__PURE__ */ a(
              "input",
              {
                type: "number",
                className: "cedros-data-input cedros-admin__input cedros-admin__input--sm",
                value: l.price ?? "",
                onChange: (b) => p(l.id, {
                  price: b.target.value === "" ? void 0 : parseFloat(b.target.value) || 0
                }),
                disabled: s,
                min: "0",
                step: "0.01",
                style: { width: 70 }
              }
            )
          ] }) }),
          /* @__PURE__ */ a("td", { children: /* @__PURE__ */ a(
            "input",
            {
              type: "number",
              className: "cedros-data-input cedros-admin__input cedros-admin__input--sm",
              value: l.inventoryQuantity ?? "",
              onChange: (b) => p(l.id, {
                inventoryQuantity: b.target.value === "" ? void 0 : parseInt(b.target.value) || 0
              }),
              disabled: s,
              min: "0",
              style: { width: 60 }
            }
          ) }),
          /* @__PURE__ */ a("td", { children: /* @__PURE__ */ a(
            "input",
            {
              type: "text",
              className: "cedros-data-input cedros-admin__input cedros-admin__input--sm",
              value: l.sku ?? "",
              onChange: (b) => p(l.id, {
                sku: b.target.value || void 0
              }),
              disabled: s,
              placeholder: "SKU",
              style: { width: 80 }
            }
          ) }),
          /* @__PURE__ */ a("td", { children: /* @__PURE__ */ a(
            Ce,
            {
              value: l.inventoryStatus ?? "in_stock",
              onChange: (b) => p(l.id, {
                inventoryStatus: b
              }),
              options: [
                { value: "in_stock", label: "In stock" },
                { value: "low", label: "Low" },
                { value: "out_of_stock", label: "Out of stock" },
                { value: "backorder", label: "Backorder" }
              ],
              disabled: s
            }
          ) }),
          /* @__PURE__ */ a("td", { children: /* @__PURE__ */ a(
            "button",
            {
              type: "button",
              className: "cedros-data-btn cedros-admin__button cedros-data-btn--ghost cedros-admin__button--ghost cedros-admin__button--icon cedros-data-btn--danger cedros-admin__button--danger",
              onClick: () => C(l.id),
              disabled: s,
              title: "Remove variant",
              "aria-label": `Remove variant ${_.title}`,
              children: F.trash
            }
          ) })
        ] }, l.id)),
        y.length > 0 && t.length < d && /* @__PURE__ */ i(Y, { children: [
          /* @__PURE__ */ a("tr", { className: "cedros-admin__variant-separator", children: /* @__PURE__ */ a("td", { colSpan: 6, children: /* @__PURE__ */ i("span", { style: { fontSize: 11, opacity: 0.6 }, children: [
            "Uncreated combinations (",
            y.length,
            ")"
          ] }) }) }),
          y.slice(0, 10).map((_) => /* @__PURE__ */ i("tr", { className: "cedros-admin__variant-possible", children: [
            /* @__PURE__ */ a("td", { children: /* @__PURE__ */ a("span", { style: { opacity: 0.6 }, children: _.title }) }),
            /* @__PURE__ */ a("td", { colSpan: 4, style: { opacity: 0.5 }, children: "Not created" }),
            /* @__PURE__ */ a("td", { children: /* @__PURE__ */ a(
              "button",
              {
                type: "button",
                className: "cedros-data-btn cedros-admin__button cedros-data-btn--ghost cedros-admin__button--ghost cedros-admin__button--icon",
                onClick: () => P(_),
                disabled: s,
                title: "Create variant",
                "aria-label": `Create variant ${_.title}`,
                children: F.plus
              }
            ) })
          ] }, _.key)),
          y.length > 10 && /* @__PURE__ */ a("tr", { className: "cedros-admin__variant-more", children: /* @__PURE__ */ i("td", { colSpan: 6, style: { textAlign: "center", opacity: 0.6 }, children: [
            "+",
            y.length - 10,
            " more combinations"
          ] }) })
        ] })
      ] })
    ] }) })
  ] });
}
function At(e) {
  return e === "failed" ? "error" : e;
}
function wt({
  productId: e,
  productTitle: t,
  defaultPrice: n = 0,
  currencySymbol: o = "$",
  authManager: r,
  onClose: d
}) {
  const {
    data: s,
    isLoading: c,
    error: m,
    fetch: S,
    save: y,
    isSaving: p
  } = ft({ productId: e, authManager: r }), [C, P] = N({ variationTypes: [] }), [A, _] = N([]);
  W(() => {
    S();
  }, [S]), W(() => {
    s && (P(s.variationConfig), _(s.variants));
  }, [s]);
  const l = B((h) => {
    P(h);
  }, []), b = B((h) => {
    _(h);
  }, []), D = B(async () => {
    const h = new Set((s?.variants ?? []).map((T) => T.id)), g = A.filter((T) => !h.has(T.id)), w = A.filter((T) => h.has(T.id)), k = (s?.variants ?? []).filter((T) => !A.some((f) => f.id === T.id)).map((T) => T.id), L = await y({
      variationConfig: C,
      createVariants: g.map((T) => ({
        optionValueIds: T.optionValueIds,
        inventoryQuantity: T.inventoryQuantity,
        sku: T.sku,
        price: T.price
      })),
      updateVariants: w.map((T) => ({
        id: T.id,
        inventoryQuantity: T.inventoryQuantity,
        sku: T.sku,
        price: T.price,
        inventoryStatus: T.inventoryStatus
      })),
      deleteVariantIds: k.length > 0 ? k : void 0
    });
    if (L)
      return {
        canonicalDraftKey: JSON.stringify({
          localConfig: L.variationConfig,
          localVariants: L.variants
        })
      };
    throw new Error("Failed to save variations");
  }, [C, A, s?.variants, y]), u = Ae(
    JSON.stringify({ localConfig: C, localVariants: A }),
    D,
    {
      ready: !c && !!s,
      delayMs: 600,
      resourceType: "product-variations",
      resourceId: e,
      extensionId: "cedros-pay"
    }
  );
  return c ? /* @__PURE__ */ i("div", { className: "cedros-admin__variations-editor", children: [
    /* @__PURE__ */ i("div", { className: "cedros-admin__variations-editor-header", children: [
      /* @__PURE__ */ a("h3", { id: "cedros-pay-product-variations-title", className: "cedros-admin__section-title", children: t ? `Variations: ${t}` : "Product variations" }),
      d && /* @__PURE__ */ a(
        "button",
        {
          type: "button",
          className: "cedros-data-btn cedros-admin__button cedros-data-btn--ghost cedros-admin__button--ghost",
          onClick: d,
          "aria-label": "Close product variations",
          title: "Close",
          children: F.close
        }
      )
    ] }),
    /* @__PURE__ */ a(ue, { label: "Loading variations…" })
  ] }) : /* @__PURE__ */ i("div", { className: "cedros-admin__variations-editor", children: [
    /* @__PURE__ */ i("div", { className: "cedros-admin__variations-editor-header", children: [
      /* @__PURE__ */ a("h3", { id: "cedros-pay-product-variations-title", className: "cedros-admin__section-title", children: t ? `Variations: ${t}` : "Product variations" }),
      /* @__PURE__ */ i("div", { className: "cedros-admin__variations-editor-actions", children: [
        /* @__PURE__ */ a(
          Ee,
          {
            status: u,
            className: `cedros-admin__autosave-indicator cedros-admin__autosave-indicator--${At(u)}`
          }
        ),
        d && /* @__PURE__ */ a(
          "button",
          {
            type: "button",
            className: "cedros-data-btn cedros-admin__button cedros-data-btn--ghost cedros-admin__button--ghost",
            onClick: d,
            "aria-label": "Close product variations",
            title: "Close",
            children: F.close
          }
        )
      ] })
    ] }),
    m && /* @__PURE__ */ a("div", { className: "cedros-admin__error-banner", children: m }),
    /* @__PURE__ */ i("div", { className: "cedros-admin__variations-editor-content", children: [
      /* @__PURE__ */ a("div", { className: "cedros-admin__variations-editor-section", children: /* @__PURE__ */ a(
        vt,
        {
          value: C,
          onChange: l,
          disabled: p
        }
      ) }),
      C.variationTypes.length > 0 && /* @__PURE__ */ a("div", { className: "cedros-admin__variations-editor-section", children: /* @__PURE__ */ a(
        St,
        {
          variationConfig: C,
          variants: A,
          onChange: b,
          defaultPrice: n,
          currencySymbol: o,
          disabled: p
        }
      ) })
    ] })
  ] });
}
function It(e, t, n) {
  if (t.length === 0) return null;
  if (e.key === "Home") return 0;
  if (e.key === "End") return t.length - 1;
  if (e.key === "ArrowDown") return (n + 1) % t.length;
  if (e.key === "ArrowUp") return (n - 1 + t.length) % t.length;
  if (e.key.length !== 1 || e.metaKey || e.ctrlKey || e.altKey) return null;
  const o = e.key.toLocaleLowerCase();
  for (let r = 1; r <= t.length; r += 1) {
    const d = (n + r) % t.length;
    if (t[d]?.label.toLocaleLowerCase().startsWith(o)) return d;
  }
  return null;
}
function Pt(e, t, n) {
  const o = document.createElement("button");
  return o.type = "button", o.className = "cedros-dropdown-menu__item cedros-admin__dropdown-item", o.setAttribute("role", "menuitem"), o.setAttribute("aria-disabled", String(e.disabled === !0)), e.disabledReason && (o.title = e.disabledReason), o.textContent = e.label, o.addEventListener("click", () => {
    const r = n.itemsRef.current[t];
    !r || r.disabled || (n.closeAndRestoreFocus(), r.onSelect());
  }), o.addEventListener("keydown", (r) => {
    if (r.key === "Escape") {
      r.preventDefault(), n.closeAndRestoreFocus();
      return;
    }
    const d = It(r, n.itemsRef.current, t);
    d !== null && (r.preventDefault(), n.itemRefs.current[d]?.focus());
  }), n.itemRefs.current[t] = o, o;
}
function kt(e, t) {
  W(() => {
    if (!t || typeof document > "u") return;
    const n = document.createElement("div");
    n.className = "cedros-pay-admin cedros-data cedros-pay-admin__portaled-dropdown", n.dataset.extensionId = "cedros-pay";
    const o = document.createElement("div");
    o.id = e.menuId, o.className = "cedros-dropdown-menu__content cedros-admin__dropdown-menu", o.setAttribute("role", "menu"), o.setAttribute("aria-label", e.label), e.items.forEach((d, s) => o.append(Pt(d, s, e))), e.menuRef.current = o, n.append(o), document.body.append(n), ya(o, e.triggerRef.current), queueMicrotask(() => e.itemRefs.current[0]?.focus());
    const r = (d) => {
      const s = d.target;
      !e.triggerRef.current?.contains(s) && !o.contains(s) && e.setIsOpen(!1);
    };
    return document.addEventListener("mousedown", r), () => {
      document.removeEventListener("mousedown", r), n.remove(), e.menuRef.current = null, e.itemRefs.current = [];
    };
  }, [t, e]);
}
function Tt({ items: e, label: t }) {
  const [n, o] = N(!1), r = X(), d = ee(null), s = ee(null), c = ee([]), m = ha(e), S = B(() => {
    o(!1), queueMicrotask(() => d.current?.focus());
  }, []), y = {
    closeAndRestoreFocus: S,
    itemRefs: c,
    items: e,
    itemsRef: m,
    label: t,
    menuId: r,
    menuRef: s,
    setIsOpen: o,
    triggerRef: d
  };
  return ga(n, d, s), kt(y, n), /* @__PURE__ */ a("div", { className: "cedros-dropdown-menu", children: /* @__PURE__ */ a(
    "button",
    {
      ref: d,
      type: "button",
      className: "cedros-data-btn cedros-data-btn--ghost cedros-data-btn--sm cedros-row-actions__trigger",
      "aria-controls": n ? r : void 0,
      "aria-expanded": n,
      "aria-haspopup": "menu",
      "aria-label": t,
      title: t,
      onClick: () => o((p) => !p),
      onKeyDown: (p) => {
        p.key === "ArrowDown" || p.key === "ArrowUp" ? (p.preventDefault(), o(!0)) : p.key === "Escape" && n && (p.preventDefault(), S());
      },
      children: /* @__PURE__ */ a("span", { "aria-hidden": "true", children: "⋯" })
    }
  ) });
}
const Et = "cedros_stripe_sync_status", Dt = "cedros_stripe_synced_at", Ft = "cedros_stripe_sync_error";
function Mt({ product: e }) {
  const t = e.metadata?.[Et], n = e.metadata?.[Dt], o = e.metadata?.[Ft];
  if (!e.stripeProductId)
    return /* @__PURE__ */ a("span", { className: "cedros-admin__product-sync cedros-admin__product-sync--muted", children: "Stripe: not linked" });
  if (t === "error")
    return /* @__PURE__ */ i("span", { className: "cedros-admin__product-sync cedros-admin__product-sync--error", children: [
      "Stripe: sync error",
      o ? ` - ${o}` : ""
    ] });
  const r = ["Stripe: linked"];
  return e.stripePriceId && r.push(e.stripePriceId), n && r.push(`synced ${Lt(n)}`), /* @__PURE__ */ a("span", { className: "cedros-admin__product-sync cedros-admin__product-sync--muted", children: r.join(" • ") });
}
function Lt(e) {
  const t = new Date(e);
  return Number.isNaN(t.getTime()) ? e : t.toLocaleString(void 0, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}
function Rt({
  productId: e,
  authManager: t,
  onSynced: n,
  onError: o
}) {
  const [r, d] = N(!1);
  return { isAuthenticated: t?.isAuthenticated() === !0, isSyncing: r, syncProduct: async () => {
    d(!0), o(null);
    try {
      await H(t).fetchWithAuth(`/admin/products/${encodeURIComponent(e)}/sync-stripe`, {
        method: "POST"
      }), await n();
    } catch (m) {
      o(m instanceof Error ? m.message : "Failed to sync product to Stripe");
    } finally {
      d(!1);
    }
  } };
}
function xt({
  products: e,
  authManager: t,
  inventoryEnabled: n = !0,
  isLoading: o = !1,
  error: r,
  emptyAction: d,
  emptyDescription: s,
  emptyFiltered: c = !1,
  emptyTitle: m,
  onEdit: S,
  onEditVariations: y,
  onSynced: p,
  onError: C,
  onRetry: P
}) {
  const [A, _] = N(null), l = z(() => {
    if (!A) return e;
    const h = A.direction === "asc" ? 1 : -1;
    return [...e].sort((g, w) => {
      const k = Ke(g, A.key), L = Ke(w, A.key);
      return typeof k == "number" && typeof L == "number" ? (k - L) * h : String(k).localeCompare(String(L), void 0, { sensitivity: "base" }) * h;
    });
  }, [e, A]), b = (h) => {
    _((g) => !g || g.key !== h ? { key: h, direction: "asc" } : { key: h, direction: g.direction === "asc" ? "desc" : "asc" });
  }, D = (h) => !A || A.key !== h ? /* @__PURE__ */ a("span", { className: "cedros-admin__sort-icon cedros-admin__sort-icon--idle", children: F.chevronUp }) : /* @__PURE__ */ a("span", { className: "cedros-admin__sort-icon", children: A.direction === "asc" ? F.chevronUp : F.chevronDown }), u = (h) => A?.key === h ? A.direction === "asc" ? "ascending" : "descending" : "none";
  return /* @__PURE__ */ a("div", { className: "cedros-data-table-wrap cedros-admin__table-container", children: /* @__PURE__ */ i("table", { className: "cedros-data-table cedros-admin__table", "aria-busy": o, children: [
    /* @__PURE__ */ a("thead", { children: /* @__PURE__ */ i("tr", { children: [
      /* @__PURE__ */ a(ie, { label: "ID", sortKey: "id", ariaSort: u("id"), onSort: b, children: D("id") }),
      /* @__PURE__ */ a(
        ie,
        {
          label: "Product",
          sortKey: "product",
          ariaSort: u("product"),
          onSort: b,
          children: D("product")
        }
      ),
      /* @__PURE__ */ a(ie, { label: "Type", sortKey: "type", ariaSort: u("type"), onSort: b, children: D("type") }),
      /* @__PURE__ */ a(ie, { label: "Price", sortKey: "price", ariaSort: u("price"), onSort: b, children: D("price") }),
      /* @__PURE__ */ a(
        ie,
        {
          label: "Status",
          sortKey: "status",
          ariaSort: u("status"),
          onSort: b,
          children: D("status")
        }
      ),
      /* @__PURE__ */ a("th", { children: "Actions" })
    ] }) }),
    /* @__PURE__ */ a("tbody", { children: o && l.length === 0 ? /* @__PURE__ */ a(Ie, { columns: 6, label: "Loading products…" }) : r && l.length === 0 ? /* @__PURE__ */ a(Pe, { columns: 6, message: r, onRetry: P }) : l.length === 0 ? /* @__PURE__ */ a(
      pe,
      {
        action: d,
        columns: 6,
        description: s,
        filtered: c,
        title: m
      }
    ) : l.map((h) => {
      const g = na(h), w = lt(h);
      return /* @__PURE__ */ i("tr", { children: [
        /* @__PURE__ */ a("td", { children: /* @__PURE__ */ a("code", { children: h.id }) }),
        /* @__PURE__ */ a("td", { children: /* @__PURE__ */ i("div", { className: "cedros-data-table-summary cedros-admin__product-summary", children: [
          g ? /* @__PURE__ */ a(
            "img",
            {
              src: g,
              alt: "",
              className: "cedros-admin__product-summary-image"
            }
          ) : /* @__PURE__ */ a("div", { className: "cedros-admin__product-summary-placeholder" }),
          /* @__PURE__ */ i("div", { className: "cedros-admin__product-summary-copy", children: [
            /* @__PURE__ */ a("span", { className: "cedros-admin__product-summary-title", children: ne(h) }),
            /* @__PURE__ */ a("span", { className: "cedros-data-table-summary__preview", children: h.description }),
            w ? /* @__PURE__ */ a("span", { className: "cedros-data-table-summary__preview cedros-admin__product-summary-meta", children: w }) : null,
            /* @__PURE__ */ a(Mt, { product: h })
          ] })
        ] }) }),
        /* @__PURE__ */ a("td", { children: Fe(h.metadata?.product_type) }),
        /* @__PURE__ */ a("td", { children: ot(h.fiatAmountCents) }),
        /* @__PURE__ */ a("td", { children: /* @__PURE__ */ a("span", { className: `cedros-data-pill cedros-admin__badge ${h.active ? "cedros-data-pill--success cedros-admin__badge--success" : "cedros-admin__badge--muted"}`, children: h.active ? "Active" : "Inactive" }) }),
        /* @__PURE__ */ a("td", { children: /* @__PURE__ */ a("div", { className: "cedros-data-row-actions cedros-admin__product-row-actions", children: /* @__PURE__ */ a(
          Bt,
          {
            product: h,
            authManager: t,
            inventoryEnabled: n,
            onEdit: S,
            onEditVariations: y,
            onSynced: p,
            onError: C
          }
        ) }) })
      ] }, h.id);
    }) })
  ] }) });
}
function Bt({
  product: e,
  authManager: t,
  inventoryEnabled: n,
  onEdit: o,
  onEditVariations: r,
  onSynced: d,
  onError: s
}) {
  const c = ne(e), { isAuthenticated: m, isSyncing: S, syncProduct: y } = Rt({
    productId: e.id,
    authManager: t,
    onSynced: d,
    onError: s
  }), p = z(() => [
    ...n ? [{ label: "Edit variations", onSelect: () => r(e) }] : [],
    {
      label: S ? "Syncing…" : "Sync Stripe",
      onSelect: y,
      disabled: !m || S,
      disabledReason: m ? void 0 : "Admin authentication is required to sync Stripe."
    }
  ], [n, m, S, r, e, y]);
  return /* @__PURE__ */ i(Y, { children: [
    /* @__PURE__ */ a(
      "button",
      {
        type: "button",
        className: "cedros-data-btn cedros-data-btn--ghost cedros-data-btn--sm cedros-data-row-actions__icon",
        "aria-label": `Edit ${c}`,
        title: `Edit ${c}`,
        onClick: () => o(e),
        children: F.edit
      }
    ),
    /* @__PURE__ */ a(Tt, { items: p, label: `${c} actions` }),
    S ? /* @__PURE__ */ i("span", { className: "cedros-admin__visually-hidden", role: "status", children: [
      "Syncing ",
      c,
      "…"
    ] }) : null
  ] });
}
function Ke(e, t) {
  switch (t) {
    case "product":
      return ne(e);
    case "type":
      return Fe(e.metadata?.product_type);
    case "price":
      return e.fiatAmountCents ?? 0;
    case "status":
      return e.active ? 1 : 0;
    default:
      return e.id;
  }
}
function ie({
  label: e,
  sortKey: t,
  ariaSort: n,
  children: o,
  onSort: r
}) {
  return /* @__PURE__ */ a("th", { "aria-sort": n, children: /* @__PURE__ */ i(
    "button",
    {
      type: "button",
      className: "cedros-data-table__sort cedros-admin__table-sort",
      onClick: () => r(t),
      children: [
        e,
        o
      ]
    }
  ) });
}
function Ut({ pageSize: e = 20, authManager: t, serverUrl: n }) {
  const [o, r] = N([]), [d, s] = N(!0), [c, m] = N("list"), [S, y] = N(null), [p, C] = N(null), [P, A] = N(null), [_, l] = N(""), [b, D] = N("all"), [u, h] = N("all"), { flags: g } = we(n, t), w = B(async () => {
    s(!0);
    try {
      A(null);
      const I = await re(
        t,
        `/admin/products?limit=${e}`
      );
      r(I.products || []);
    } catch {
      A("Failed to load products");
    } finally {
      s(!1);
    }
  }, [e, t]);
  W(() => {
    w();
  }, [w]), W(() => {
    !g.subscriptions && u === "subscription" && h("all");
  }, [g.subscriptions, u]), me(w);
  const k = z(() => {
    const I = o.filter((v) => v.active).length, M = o.reduce((v, O) => {
      const K = O.variations?.length ?? 0;
      return v + (K > 0 ? K : 1);
    }, 0);
    return { activeCount: I, totalSkus: M };
  }, [o]), L = z(() => {
    const I = _.trim().toLowerCase();
    return o.filter(
      (M) => ct(M, I, b, u)
    );
  }, [o, _, b, u]), T = _.trim() !== "" || b !== "all" || u !== "all", f = () => {
    m("list"), y(null);
  };
  return c === "create" ? /* @__PURE__ */ a(
    it,
    {
      authManager: t,
      serverUrl: n,
      features: g,
      onBack: f,
      onCreated: () => {
        f(), w();
      }
    },
    "create"
  ) : c === "edit" && S ? /* @__PURE__ */ a(
    _t,
    {
      product: S,
      authManager: t,
      serverUrl: n,
      features: g,
      onBack: f,
      onSaved: () => {
        w();
      }
    },
    S.id
  ) : /* @__PURE__ */ i("div", { className: "cedros-data-stack cedros-admin__page", children: [
    /* @__PURE__ */ a(j, { message: o.length > 0 ? P : null }),
    /* @__PURE__ */ a(
      ke,
      {
        stats: [
          { label: "Total products", value: o.length },
          {
            label: "Active",
            value: k.activeCount,
            variant: k.activeCount > 0 ? "success" : "muted"
          },
          { label: "Total SKUs", value: k.totalSkus }
        ],
        isLoading: d
      }
    ),
    /* @__PURE__ */ a("div", { className: "cedros-data-toolbar", children: /* @__PURE__ */ i("div", { className: "cedros-data-toolbar__right", children: [
      /* @__PURE__ */ a(
        Sa,
        {
          authManager: t,
          onImported: w,
          onError: A
        }
      ),
      /* @__PURE__ */ i(
        "button",
        {
          type: "button",
          className: "cedros-data-btn cedros-admin__button cedros-data-btn--primary cedros-admin__button--primary cedros-admin__button--action",
          onClick: () => m("create"),
          children: [
            F.plus,
            "Add product"
          ]
        }
      )
    ] }) }),
    /* @__PURE__ */ a(
      Ot,
      {
        search: _,
        statusFilter: b,
        typeFilter: u,
        onSearchChange: l,
        onStatusFilterChange: D,
        onTypeFilterChange: h,
        subscriptionsEnabled: g.subscriptions
      }
    ),
    /* @__PURE__ */ a(
      xt,
      {
        products: L,
        authManager: t,
        inventoryEnabled: g.inventory,
        isLoading: d,
        error: P,
        onRetry: w,
        emptyTitle: T ? "No matching products" : "No products yet",
        emptyDescription: T ? "Try adjusting your search or filters." : "Add your first product to start selling through the paywall.",
        emptyFiltered: T,
        emptyAction: T ? /* @__PURE__ */ a(
          "button",
          {
            type: "button",
            className: "cedros-data-btn cedros-data-btn--ghost cedros-data-btn--sm",
            onClick: () => {
              l(""), D("all"), h("all");
            },
            children: "Clear filters"
          }
        ) : void 0,
        onEdit: (I) => {
          y(I), m("edit");
        },
        onEditVariations: C,
        onSynced: w,
        onError: A
      }
    ),
    p && /* @__PURE__ */ a(
      he,
      {
        labelledBy: "cedros-pay-product-variations-title",
        onClose: () => C(null),
        size: "large",
        children: /* @__PURE__ */ a(
          wt,
          {
            productId: p.id,
            productTitle: ne(p),
            defaultPrice: (p.fiatAmountCents ?? 0) / 100,
            authManager: t,
            onClose: () => C(null)
          }
        )
      }
    )
  ] });
}
function Ot({
  search: e,
  statusFilter: t,
  typeFilter: n,
  onSearchChange: o,
  onStatusFilterChange: r,
  onTypeFilterChange: d,
  subscriptionsEnabled: s
}) {
  const c = [
    { value: "all", label: "All types" },
    { value: "one_time", label: "One-time purchase" },
    { value: "pay_per_access", label: "Pay per access" },
    ...s ? [{ value: "subscription", label: "Subscription" }] : []
  ];
  return /* @__PURE__ */ i("div", { className: "cedros-data-toolbar cedros-admin__toolbar", children: [
    /* @__PURE__ */ i("div", { className: "cedros-admin__filter cedros-admin__toolbar-search", children: [
      /* @__PURE__ */ a("label", { className: "cedros-admin__filter-label", htmlFor: "cedros-pay-product-filter", children: "Search" }),
      /* @__PURE__ */ i("div", { className: "cedros-admin__search-field", children: [
        /* @__PURE__ */ a(
          "input",
          {
            id: "cedros-pay-product-filter",
            type: "search",
            className: "cedros-data-input cedros-admin__input",
            value: e,
            onChange: (m) => o(m.target.value),
            placeholder: "Filter products…"
          }
        ),
        e ? /* @__PURE__ */ a(
          "button",
          {
            type: "button",
            className: "cedros-admin__search-clear",
            "aria-label": "Clear search",
            title: "Clear search",
            onClick: () => o(""),
            children: F.close
          }
        ) : null
      ] })
    ] }),
    /* @__PURE__ */ i("div", { className: "cedros-admin__filter", children: [
      /* @__PURE__ */ a("span", { className: "cedros-admin__filter-label", children: "Status" }),
      /* @__PURE__ */ a(
        Ce,
        {
          ariaLabel: "Status",
          value: t,
          onChange: (m) => r(m),
          options: [
            { value: "all", label: "All statuses" },
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" }
          ]
        }
      )
    ] }),
    /* @__PURE__ */ i("div", { className: "cedros-admin__filter", children: [
      /* @__PURE__ */ a("span", { className: "cedros-admin__filter-label", children: "Type" }),
      /* @__PURE__ */ a(
        Ce,
        {
          ariaLabel: "Type",
          value: n,
          onChange: (m) => d(m),
          options: c
        }
      )
    ] })
  ] });
}
function Kt(e, t) {
  switch (t) {
    case "discount":
      return e.discountValue ?? 0;
    case "usage":
      return e.usageCount ?? 0;
    case "status":
      return e.active ? 1 : 0;
    case "expires":
      return e.expiresAt ?? null;
    case "code":
      return e.code;
    default:
      return null;
  }
}
function $t({ serverUrl: e, pageSize: t = 20, authManager: n, locale: o }) {
  const [r, d] = N([]), [s, c] = N(!0), [m, S] = N(!1), [y, p] = N(!1), [C, P] = N(null), [A, _] = N(null), [l, b] = N({
    code: "",
    discountType: "percentage",
    discountValue: 0,
    usageLimit: void 0,
    expiresAt: "",
    // Scope and targeting
    scope: "all_products",
    productIdsCsv: "",
    categoryIdsCsv: "",
    // Payment and application
    paymentMethod: "any",
    autoApply: !1,
    appliesAt: "both",
    startsAt: "",
    // Advanced fields
    minimumAmountUsd: "",
    usageLimitPerCustomer: void 0,
    firstPurchaseOnly: !1
  }), D = B(async () => {
    c(!0);
    try {
      _(null);
      const f = `/admin/coupons?limit=${t}`, I = await re(n, f);
      d(I.coupons || []);
    } catch (f) {
      le().error("[CouponsSection] Failed to fetch coupons:", f, {
        serverUrl: e.slice(0, 20) + "..."
      }), _("Failed to load coupons");
    } finally {
      c(!1);
    }
  }, [e, t, n]);
  W(() => {
    D();
  }, [D]), me(D);
  const u = async (f) => {
    if (f.preventDefault(), !(!l.code || l.discountValue <= 0)) {
      p(!0);
      try {
        const I = l.minimumAmountUsd ? Math.round(Number(l.minimumAmountUsd) * 100) : void 0, M = l.productIdsCsv.split(",").map((K) => K.trim()).filter(Boolean), v = l.categoryIdsCsv.split(",").map((K) => K.trim()).filter(Boolean), O = {
          code: l.code,
          discountType: l.discountType,
          discountValue: l.discountValue,
          usageLimit: l.usageLimit,
          active: !0,
          usageCount: 0,
          // Scope and targeting
          scope: l.scope,
          ...M.length ? { productIds: M } : {},
          ...v.length ? { categoryIds: v } : {},
          // Payment and application
          ...l.paymentMethod !== "any" ? { paymentMethod: l.paymentMethod } : {},
          ...l.autoApply ? { autoApply: !0 } : {},
          ...l.appliesAt !== "both" ? { appliesAt: l.appliesAt } : {},
          ...l.startsAt ? { startsAt: l.startsAt } : {},
          ...l.expiresAt ? { expiresAt: l.expiresAt } : {},
          // Advanced
          ...I ? { minimumAmountCents: I } : {},
          ...l.usageLimitPerCustomer ? { usageLimitPerCustomer: l.usageLimitPerCustomer } : {},
          ...l.firstPurchaseOnly ? { firstPurchaseOnly: !0 } : {}
        };
        await H(n).fetchWithAuth("/admin/coupons", {
          method: "POST",
          body: JSON.stringify(O)
        }), b({
          code: "",
          discountType: "percentage",
          discountValue: 0,
          usageLimit: void 0,
          expiresAt: "",
          scope: "all_products",
          productIdsCsv: "",
          categoryIdsCsv: "",
          paymentMethod: "any",
          autoApply: !1,
          appliesAt: "both",
          startsAt: "",
          minimumAmountUsd: "",
          usageLimitPerCustomer: void 0,
          firstPurchaseOnly: !1
        }), S(!1), D();
      } catch (I) {
        le().error("[CouponsSection] Failed to add coupon:", I, {
          serverUrl: e.slice(0, 20) + "..."
        }), P("Failed to create coupon");
      } finally {
        p(!1);
      }
    }
  }, h = r.filter((f) => f.active).length, g = r.reduce((f, I) => f + (I.usageCount ?? 0), 0), { sorted: w, sortKey: k, sortDirection: L, toggleSort: T } = je(
    r,
    Kt,
    { key: "expires", direction: "desc" }
  );
  return /* @__PURE__ */ i("div", { className: "cedros-data-stack cedros-admin__page", children: [
    /* @__PURE__ */ a(j, { message: C ?? (r.length > 0 ? A : null) }),
    /* @__PURE__ */ a(
      ke,
      {
        stats: [
          { label: "Total coupons", value: r.length },
          { label: "Active", value: h, variant: h > 0 ? "success" : "muted" },
          { label: "Redemptions", value: g }
        ],
        isLoading: s
      }
    ),
    /* @__PURE__ */ i("div", { className: "cedros-admin__section-header", children: [
      /* @__PURE__ */ a("h3", { className: "cedros-admin__section-title", children: "Discount coupons" }),
      /* @__PURE__ */ i(
        "button",
        {
          type: "button",
          className: "cedros-data-btn cedros-admin__button cedros-data-btn--primary cedros-admin__button--primary cedros-admin__button--action",
          onClick: () => S(!m),
          children: [
            m ? F.close : F.plus,
            m ? "Cancel" : "Add coupon"
          ]
        }
      )
    ] }),
    m && /* @__PURE__ */ i("form", { onSubmit: u, className: "cedros-admin__add-form", children: [
      /* @__PURE__ */ i("div", { className: "cedros-admin__form-row", children: [
        /* @__PURE__ */ i("div", { className: "cedros-data-field cedros-admin__field", children: [
          /* @__PURE__ */ a("label", { className: "cedros-data-label cedros-admin__field-label", children: "Coupon code" }),
          /* @__PURE__ */ a(
            "input",
            {
              type: "text",
              className: "cedros-data-input cedros-admin__input",
              value: l.code,
              onChange: (f) => b((I) => ({ ...I, code: f.target.value.toUpperCase() })),
              placeholder: "e.g., SAVE20",
              required: !0
            }
          )
        ] }),
        /* @__PURE__ */ a(
          se,
          {
            value: l.discountType,
            onChange: (f) => b((I) => ({ ...I, discountType: f })),
            options: [
              { value: "percentage", label: "Percentage (%)" },
              { value: "fixed", label: "Fixed amount ($)" }
            ],
            label: "Discount type"
          }
        )
      ] }),
      /* @__PURE__ */ i("div", { className: "cedros-admin__form-row", children: [
        /* @__PURE__ */ i("div", { className: "cedros-data-field cedros-admin__field", children: [
          /* @__PURE__ */ i("label", { className: "cedros-data-label cedros-admin__field-label", children: [
            "Discount value ",
            l.discountType === "percentage" ? "(%)" : "($)"
          ] }),
          /* @__PURE__ */ a(
            "input",
            {
              type: "number",
              className: "cedros-data-input cedros-admin__input",
              value: l.discountValue || "",
              onChange: (f) => b((I) => ({ ...I, discountValue: parseFloat(f.target.value) || 0 })),
              placeholder: l.discountType === "percentage" ? "e.g., 20" : "e.g., 10.00",
              min: "0",
              step: l.discountType === "percentage" ? "1" : "0.01",
              required: !0
            }
          )
        ] }),
        /* @__PURE__ */ i("div", { className: "cedros-data-field cedros-admin__field", children: [
          /* @__PURE__ */ a("label", { className: "cedros-data-label cedros-admin__field-label", children: "Usage limit (optional)" }),
          /* @__PURE__ */ a(
            "input",
            {
              type: "number",
              className: "cedros-data-input cedros-admin__input",
              value: l.usageLimit || "",
              onChange: (f) => b((I) => ({ ...I, usageLimit: f.target.value ? parseInt(f.target.value) : void 0 })),
              placeholder: "Leave empty for unlimited",
              min: "1"
            }
          )
        ] }),
        /* @__PURE__ */ i("div", { className: "cedros-data-field cedros-admin__field", children: [
          /* @__PURE__ */ a("label", { className: "cedros-data-label cedros-admin__field-label", children: "Expiration date (optional)" }),
          /* @__PURE__ */ a(
            "input",
            {
              type: "date",
              className: "cedros-data-input cedros-admin__input",
              value: l.expiresAt,
              onChange: (f) => b((I) => ({ ...I, expiresAt: f.target.value }))
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ i("div", { className: "cedros-admin__form-row", children: [
        /* @__PURE__ */ a(
          se,
          {
            value: l.scope,
            onChange: (f) => b((I) => ({ ...I, scope: f })),
            options: [
              { value: "all_products", label: "All products" },
              { value: "specific_products", label: "Specific products" },
              { value: "specific_categories", label: "Specific categories" }
            ],
            label: "Scope"
          }
        ),
        /* @__PURE__ */ a(
          se,
          {
            value: l.paymentMethod,
            onChange: (f) => b((I) => ({ ...I, paymentMethod: f })),
            options: [
              { value: "any", label: "Any payment method" },
              { value: "stripe", label: "Stripe only" },
              { value: "x402", label: "Crypto (x402) only" },
              { value: "credits", label: "Credits only" }
            ],
            label: "Payment method"
          }
        ),
        /* @__PURE__ */ a(
          se,
          {
            value: l.appliesAt,
            onChange: (f) => b((I) => ({ ...I, appliesAt: f })),
            options: [
              { value: "both", label: "Cart and checkout" },
              { value: "cart", label: "Cart only" },
              { value: "checkout", label: "Checkout only" }
            ],
            label: "Applies at"
          }
        )
      ] }),
      l.scope === "specific_products" && /* @__PURE__ */ a("div", { className: "cedros-admin__form-row", children: /* @__PURE__ */ i("div", { className: "cedros-data-field cedros-admin__field", style: { flex: 1 }, children: [
        /* @__PURE__ */ a("label", { className: "cedros-data-label cedros-admin__field-label", children: "Product IDs" }),
        /* @__PURE__ */ a(
          "input",
          {
            type: "text",
            className: "cedros-data-input cedros-admin__input",
            value: l.productIdsCsv,
            onChange: (f) => b((I) => ({ ...I, productIdsCsv: f.target.value })),
            placeholder: "e.g., prod_123, prod_456"
          }
        ),
        /* @__PURE__ */ a("div", { style: { marginTop: 4, fontSize: 12, opacity: 0.75 }, children: "Comma-separated product IDs this coupon applies to." })
      ] }) }),
      /* @__PURE__ */ i("div", { className: "cedros-admin__form-row", children: [
        /* @__PURE__ */ i("div", { className: "cedros-data-field cedros-admin__field", children: [
          /* @__PURE__ */ a("label", { className: "cedros-data-label cedros-admin__field-label", children: "Start date (optional)" }),
          /* @__PURE__ */ a(
            "input",
            {
              type: "date",
              className: "cedros-data-input cedros-admin__input",
              value: l.startsAt,
              onChange: (f) => b((I) => ({ ...I, startsAt: f.target.value }))
            }
          )
        ] }),
        /* @__PURE__ */ i("div", { className: "cedros-data-field cedros-admin__field", children: [
          /* @__PURE__ */ a("label", { className: "cedros-data-label cedros-admin__field-label", children: "Auto apply" }),
          /* @__PURE__ */ i("label", { style: { display: "flex", alignItems: "center", gap: "0.5rem" }, children: [
            /* @__PURE__ */ a(
              "input",
              {
                type: "checkbox",
                checked: l.autoApply,
                onChange: (f) => b((I) => ({ ...I, autoApply: f.target.checked }))
              }
            ),
            "Automatically apply when conditions met"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ i("div", { className: "cedros-admin__form-row", children: [
        /* @__PURE__ */ i("div", { className: "cedros-data-field cedros-admin__field", children: [
          /* @__PURE__ */ a("label", { className: "cedros-data-label cedros-admin__field-label", children: "Minimum purchase (USD)" }),
          /* @__PURE__ */ a(
            "input",
            {
              type: "number",
              className: "cedros-data-input cedros-admin__input",
              value: l.minimumAmountUsd === "" ? "" : l.minimumAmountUsd,
              onChange: (f) => b((I) => ({ ...I, minimumAmountUsd: f.target.value === "" ? "" : parseFloat(f.target.value) || 0 })),
              placeholder: "e.g., 50.00",
              min: "0",
              step: "0.01"
            }
          )
        ] }),
        /* @__PURE__ */ i("div", { className: "cedros-data-field cedros-admin__field", children: [
          /* @__PURE__ */ a("label", { className: "cedros-data-label cedros-admin__field-label", children: "Per-customer limit" }),
          /* @__PURE__ */ a(
            "input",
            {
              type: "number",
              className: "cedros-data-input cedros-admin__input",
              value: l.usageLimitPerCustomer || "",
              onChange: (f) => b((I) => ({ ...I, usageLimitPerCustomer: f.target.value ? parseInt(f.target.value) : void 0 })),
              placeholder: "Leave empty for unlimited",
              min: "1"
            }
          )
        ] }),
        /* @__PURE__ */ i("div", { className: "cedros-data-field cedros-admin__field", children: [
          /* @__PURE__ */ a("label", { className: "cedros-data-label cedros-admin__field-label", children: "First purchase only" }),
          /* @__PURE__ */ i("label", { style: { display: "flex", alignItems: "center", gap: "0.5rem" }, children: [
            /* @__PURE__ */ a(
              "input",
              {
                type: "checkbox",
                checked: l.firstPurchaseOnly,
                onChange: (f) => b((I) => ({ ...I, firstPurchaseOnly: f.target.checked }))
              }
            ),
            "New customers only"
          ] })
        ] })
      ] }),
      l.scope === "specific_categories" && /* @__PURE__ */ a("div", { className: "cedros-admin__form-row", children: /* @__PURE__ */ i("div", { className: "cedros-data-field cedros-admin__field", style: { flex: 1 }, children: [
        /* @__PURE__ */ a("label", { className: "cedros-data-label cedros-admin__field-label", children: "Category IDs" }),
        /* @__PURE__ */ a(
          "input",
          {
            type: "text",
            className: "cedros-data-input cedros-admin__input",
            value: l.categoryIdsCsv,
            onChange: (f) => b((I) => ({ ...I, categoryIdsCsv: f.target.value })),
            placeholder: "e.g., cat_apparel, cat_accessories"
          }
        ),
        /* @__PURE__ */ a("div", { style: { marginTop: 4, fontSize: 12, opacity: 0.75 }, children: "Comma-separated category IDs this coupon applies to." })
      ] }) }),
      /* @__PURE__ */ a(Gt, { options: Vt(l) }),
      /* @__PURE__ */ a("div", { className: "cedros-data-actions cedros-admin__form-actions", children: /* @__PURE__ */ a("button", { type: "submit", className: "cedros-data-btn cedros-admin__button cedros-data-btn--primary cedros-admin__button--primary", disabled: y, children: y ? "Creating…" : "Create coupon" }) })
    ] }),
    /* @__PURE__ */ a("div", { className: "cedros-data-table-wrap cedros-admin__table-container", children: /* @__PURE__ */ i("table", { className: "cedros-data-table cedros-admin__table", "aria-busy": s, children: [
      /* @__PURE__ */ a("thead", { children: /* @__PURE__ */ i("tr", { children: [
        /* @__PURE__ */ a(Q, { label: "Code", sortKey: "code", activeKey: k, direction: L, onSort: T }),
        /* @__PURE__ */ a(Q, { label: "Discount", sortKey: "discount", activeKey: k, direction: L, onSort: T }),
        /* @__PURE__ */ a(Q, { label: "Usage", sortKey: "usage", activeKey: k, direction: L, onSort: T }),
        /* @__PURE__ */ a(Q, { label: "Status", sortKey: "status", activeKey: k, direction: L, onSort: T }),
        /* @__PURE__ */ a(Q, { label: "Expires", sortKey: "expires", activeKey: k, direction: L, onSort: T })
      ] }) }),
      /* @__PURE__ */ a("tbody", { children: s && w.length === 0 ? /* @__PURE__ */ a(Ie, { columns: 5, label: "Loading coupons…" }) : A && w.length === 0 ? /* @__PURE__ */ a(Pe, { columns: 5, message: A, onRetry: D }) : w.length === 0 ? /* @__PURE__ */ a(
        pe,
        {
          columns: 5,
          description: "Create a discount coupon to run promotions and reward customers at checkout.",
          title: "No coupons yet"
        }
      ) : w.map((f) => /* @__PURE__ */ i("tr", { children: [
        /* @__PURE__ */ a("td", { children: /* @__PURE__ */ a("code", { children: f.code }) }),
        /* @__PURE__ */ a("td", { children: f.discountType === "percentage" ? `${f.discountValue}%` : `$${f.discountValue.toFixed(2)}` }),
        /* @__PURE__ */ i("td", { children: [
          f.usageCount,
          f.usageLimit ? ` / ${f.usageLimit}` : ""
        ] }),
        /* @__PURE__ */ a("td", { children: /* @__PURE__ */ a("span", { className: `cedros-admin__badge ${f.active ? "cedros-admin__badge--success" : "cedros-admin__badge--muted"}`, children: f.active ? "Active" : "Inactive" }) }),
        /* @__PURE__ */ a("td", { children: f.expiresAt ? ba(f.expiresAt, o) : "—" })
      ] }, f.code)) })
    ] }) })
  ] });
}
function Vt(e) {
  const t = [];
  return e.usageLimit && t.push("usage limits"), e.usageLimitPerCustomer && t.push("per-customer limits"), e.firstPurchaseOnly && t.push("first-purchase-only"), e.scope !== "all_products" && t.push("product/category restrictions"), t;
}
function Gt({ options: e }) {
  return e.length === 0 ? null : /* @__PURE__ */ a("div", { className: "cedros-data-status cedros-data-status--warning cedros-admin__error-banner", role: "status", children: /* @__PURE__ */ i("span", { children: [
    "Not yet applied at checkout: ",
    e.join(", "),
    ". Codes using these options are rejected at checkout with a clear error until support ships."
  ] }) });
}
const oe = 50;
function Wt(e, t) {
  switch (t) {
    case "delta":
      return e.delta;
    case "before":
      return e.quantityBefore;
    case "after":
      return e.quantityAfter;
    case "date":
      return e.createdAt;
    default:
      return null;
  }
}
function Ht({ serverUrl: e, authManager: t }) {
  const [n, o] = N([]), [r, d] = N(!0), [s, c] = N(null), [m, S] = N(""), [y, p] = N([]), [C, P] = N(!1), [A, _] = N(null), [l, b] = N(0), { sorted: D, sortKey: u, sortDirection: h, toggleSort: g } = je(
    y,
    Wt,
    { key: "date", direction: "desc" }
  ), w = B(async (v) => re(t, v), [t]), k = B(async (v = () => !1) => {
    d(!0), c(null);
    try {
      const O = await w("/admin/products?limit=100&offset=0");
      if (v()) return;
      const K = Array.isArray(O) ? O : O.products ?? [];
      o(K);
    } catch (O) {
      if (v()) return;
      le().error("[InventorySection] Failed to load products:", O, {
        serverUrl: e.slice(0, 20) + "..."
      }), c("Failed to load products");
    } finally {
      v() || d(!1);
    }
  }, [w, e]);
  W(() => {
    let v = !1;
    return k(() => v), () => {
      v = !0;
    };
  }, [k]);
  const L = B(async (v, O) => {
    if (v) {
      P(!0), _(null);
      try {
        const K = `/admin/products/${encodeURIComponent(v)}/inventory/adjustments?limit=${oe}&offset=${O}`, de = await w(K);
        p(de.adjustments ?? []);
      } catch (K) {
        le().error("[InventorySection] Failed to load adjustments:", K, {
          productId: v,
          serverUrl: e.slice(0, 20) + "..."
        }), _("Failed to load inventory adjustments");
      } finally {
        P(!1);
      }
    }
  }, [w, e]);
  W(() => {
    m && L(m, l);
  }, [L, m, l]), me(
    () => L(m, l),
    { enabled: !!m }
  );
  const T = (v) => {
    S(v), b(0), p([]), _(null);
  }, f = () => b((v) => Math.max(0, v - oe)), I = () => b((v) => v + oe), M = n.find((v) => v.id === m);
  return /* @__PURE__ */ i("div", { className: "cedros-data-stack cedros-admin__page", children: [
    n.length > 0 ? /* @__PURE__ */ a(j, { message: s, onRetry: k }) : null,
    /* @__PURE__ */ a("div", { className: "cedros-admin__section-header", children: /* @__PURE__ */ a("h3", { className: "cedros-admin__section-title", children: "Inventory adjustments" }) }),
    /* @__PURE__ */ a("div", { className: "cedros-admin__add-form", style: { marginBottom: "1rem" }, children: /* @__PURE__ */ a("div", { className: "cedros-admin__form-row", children: s && n.length === 0 ? /* @__PURE__ */ i("div", { className: "cedros-data-field cedros-admin__field", style: { flex: 1 }, children: [
      /* @__PURE__ */ a("label", { className: "cedros-data-label cedros-admin__field-label", children: "Select product" }),
      /* @__PURE__ */ a(j, { message: s, onRetry: k })
    ] }) : r && n.length === 0 ? /* @__PURE__ */ i("div", { className: "cedros-data-field cedros-admin__field", style: { flex: 1 }, children: [
      /* @__PURE__ */ a("label", { className: "cedros-data-label cedros-admin__field-label", children: "Select product" }),
      /* @__PURE__ */ a(ue, { label: "Loading products…", lines: 2 })
    ] }) : /* @__PURE__ */ a(
      se,
      {
        label: "Select product",
        value: m,
        onChange: T,
        options: [
          { value: "", label: "Choose a product…" },
          ...n.map((v) => ({
            value: v.id,
            label: v.title ?? v.description ?? v.id
          }))
        ],
        style: { flex: 1 }
      }
    ) }) }),
    m ? /* @__PURE__ */ i(Y, { children: [
      M && /* @__PURE__ */ i("p", { style: { marginBottom: "0.75rem", fontSize: "0.9rem", opacity: 0.7 }, children: [
        "Showing adjustments for: ",
        /* @__PURE__ */ a("strong", { children: M.title ?? M.description ?? M.id })
      ] }),
      y.length > 0 ? /* @__PURE__ */ a(j, { message: A, onRetry: () => L(m, l) }) : null,
      /* @__PURE__ */ a("div", { className: "cedros-data-table-wrap cedros-admin__table-container", children: /* @__PURE__ */ i("table", { className: "cedros-data-table cedros-admin__table", "aria-busy": C, children: [
        /* @__PURE__ */ a("thead", { children: /* @__PURE__ */ i("tr", { children: [
          /* @__PURE__ */ a(Q, { label: "Date", sortKey: "date", activeKey: u, direction: h, onSort: g }),
          /* @__PURE__ */ a(Q, { label: "Delta", sortKey: "delta", activeKey: u, direction: h, onSort: g }),
          /* @__PURE__ */ a(Q, { label: "Before", sortKey: "before", activeKey: u, direction: h, onSort: g }),
          /* @__PURE__ */ a(Q, { label: "After", sortKey: "after", activeKey: u, direction: h, onSort: g }),
          /* @__PURE__ */ a("th", { children: "Reason" }),
          /* @__PURE__ */ a("th", { children: "Actor" })
        ] }) }),
        /* @__PURE__ */ a("tbody", { children: A && y.length === 0 ? /* @__PURE__ */ a(
          Pe,
          {
            columns: 6,
            message: A,
            onRetry: () => L(m, l)
          }
        ) : C && y.length === 0 ? /* @__PURE__ */ a(Ie, { columns: 6, label: "Loading adjustments…" }) : y.length === 0 ? /* @__PURE__ */ a(
          pe,
          {
            columns: 6,
            title: "No inventory adjustments",
            description: "Adjustments appear here once stock for this product changes."
          }
        ) : D.map((v) => /* @__PURE__ */ i("tr", { children: [
          /* @__PURE__ */ a("td", { style: { whiteSpace: "nowrap" }, children: _a(v.createdAt) }),
          /* @__PURE__ */ a("td", { children: /* @__PURE__ */ a(
            "span",
            {
              style: {
                fontWeight: 600,
                color: v.delta > 0 ? "var(--pay-admin-success)" : v.delta < 0 ? "var(--pay-admin-error)" : void 0
              },
              "aria-label": `Delta: ${v.delta > 0 ? "plus" : ""}${v.delta}`,
              children: v.delta > 0 ? `+${v.delta}` : v.delta
            }
          ) }),
          /* @__PURE__ */ a("td", { children: v.quantityBefore }),
          /* @__PURE__ */ a("td", { children: v.quantityAfter }),
          /* @__PURE__ */ a("td", { children: v.reason ?? /* @__PURE__ */ a("span", { style: { opacity: 0.45 }, children: "—" }) }),
          /* @__PURE__ */ a("td", { children: v.actor ?? /* @__PURE__ */ a("span", { style: { opacity: 0.45 }, children: "—" }) })
        ] }, v.id)) })
      ] }) }),
      y.length > 0 ? /* @__PURE__ */ i("div", { className: "cedros-data-pagination", children: [
        /* @__PURE__ */ a(
          "button",
          {
            type: "button",
            className: "cedros-data-btn cedros-admin__button cedros-data-btn--ghost cedros-admin__button--ghost cedros-data-btn--sm cedros-admin__button--sm",
            disabled: l === 0,
            onClick: f,
            children: "Previous"
          }
        ),
        /* @__PURE__ */ i("span", { children: [
          "Page ",
          Math.floor(l / oe) + 1,
          " · ",
          y.length,
          " record",
          y.length !== 1 ? "s" : ""
        ] }),
        /* @__PURE__ */ a(
          "button",
          {
            type: "button",
            className: "cedros-data-btn cedros-admin__button cedros-data-btn--ghost cedros-admin__button--ghost cedros-data-btn--sm cedros-admin__button--sm",
            disabled: y.length < oe,
            onClick: I,
            children: "Next"
          }
        )
      ] }) : null
    ] }) : /* @__PURE__ */ a(
      Te,
      {
        title: "Select a product",
        description: "Choose a product above to view its inventory adjustment history."
      }
    )
  ] });
}
function qt({ config: e, onChange: t }) {
  const [n, o] = N(null), [r, d] = N(null), s = async (c, m) => {
    const S = `${c}:${m}`;
    o(S), d(null);
    try {
      const { sendSolanaSubscriptionPlanTransaction: y } = await import("./solanaSubscriptionPlans-BFozR2XX.mjs"), p = await y({
        action: m,
        config: e,
        interval: c
      });
      t(Qt(e, c, m, p)), d({
        kind: "success",
        text: jt(c, m, p.signature)
      });
    } catch (y) {
      d({
        kind: "error",
        text: y instanceof Error ? y.message : "Solana plan transaction failed."
      });
    } finally {
      o(null);
    }
  };
  return /* @__PURE__ */ i("div", { style: { marginTop: "1rem" }, children: [
    /* @__PURE__ */ a("div", { className: "cedros-data-label cedros-admin__field-label", style: { marginBottom: "0.5rem" }, children: "On-chain plan management" }),
    /* @__PURE__ */ i("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem" }, children: [
      /* @__PURE__ */ a(
        $e,
        {
          interval: "monthly",
          config: e,
          pending: n,
          onRun: s
        }
      ),
      /* @__PURE__ */ a(
        $e,
        {
          interval: "annual",
          config: e,
          pending: n,
          onRun: s
        }
      )
    ] }),
    r && /* @__PURE__ */ a(
      "div",
      {
        role: "status",
        style: {
          marginTop: "0.75rem",
          color: r.kind === "error" ? "var(--pay-admin-error)" : "var(--pay-admin-success)",
          fontSize: 12
        },
        children: r.text
      }
    )
  ] });
}
function $e({
  interval: e,
  config: t,
  pending: n,
  onRun: o
}) {
  const r = zt(t, e), d = e === "annual" ? t.annualPlanAddress : t.monthlyPlanAddress, s = e === "annual" ? t.annualExpectedCreatedAt : t.monthlyExpectedCreatedAt;
  return /* @__PURE__ */ a("div", { style: { border: "1px solid var(--pay-admin-border)", borderRadius: 8, padding: "0.75rem" }, children: /* @__PURE__ */ i("div", { style: { display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }, children: [
    /* @__PURE__ */ i("div", { children: [
      /* @__PURE__ */ i("div", { style: { fontWeight: 600, textTransform: "capitalize" }, children: [
        e,
        " plan"
      ] }),
      /* @__PURE__ */ i("div", { style: { marginTop: 4, fontSize: 12, opacity: 0.75 }, children: [
        d ? `PDA ${oa(d)}` : "No PDA saved",
        s ? ` · created ${s}` : ""
      ] })
    ] }),
    /* @__PURE__ */ a("div", { style: { display: "flex", gap: "0.5rem", flexWrap: "wrap" }, children: ["create", "update", "delete"].map((c) => /* @__PURE__ */ a(
      "button",
      {
        type: "button",
        className: `cedros-admin__button ${c === "create" ? "cedros-data-btn--primary cedros-admin__button--primary" : "cedros-data-btn--ghost cedros-admin__button--ghost"}`,
        disabled: !!n || !!r,
        title: r,
        onClick: () => o(e, c),
        children: n === `${e}:${c}` ? "Signing…" : ia(c)
      },
      c
    )) })
  ] }) });
}
function Qt(e, t, n, o) {
  return n === "delete" ? {
    ...Ve(e, t, void 0, void 0),
    ...t === "annual" ? { annualStatus: "sunset" } : { monthlyStatus: "sunset" }
  } : Ve(e, t, o.planAddress, o.createdAt);
}
function Ve(e, t, n, o) {
  const d = (t === "annual" ? e.annualPlanId ?? e.planId : e.monthlyPlanId ?? e.planId) === e.planId ? { planAddress: n, expectedCreatedAt: o } : {};
  return t === "annual" ? {
    ...d,
    annualPlanAddress: n,
    annualExpectedCreatedAt: o
  } : {
    ...d,
    monthlyPlanAddress: n,
    monthlyExpectedCreatedAt: o
  };
}
function zt(e, t) {
  if (!e.merchantAddress || !e.tokenMint)
    return "Merchant address and token mint are required.";
  const n = t === "annual" ? e.annualAmountAtomic : e.monthlyAmountAtomic, o = t === "annual" ? e.annualPeriodHours : e.monthlyPeriodHours;
  if (!n || !o) return `${sa(t)} amount and period are required.`;
}
function jt(e, t, n) {
  return `${sa(e)} plan ${ia(t).toLowerCase()} confirmed: ${oa(n)}`;
}
function ia(e) {
  return e === "create" ? "Create" : e === "update" ? "Update" : "Delete";
}
function oa(e) {
  return e.length > 12 ? `${e.slice(0, 4)}…${e.slice(-4)}` : e;
}
function sa(e) {
  return e.charAt(0).toUpperCase() + e.slice(1);
}
const ra = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", da = "De1egAFMkMWZSN5rYXRj9CAdheBamobVNubTsi9avR44";
function Jt({ plan: e, onChange: t }) {
  const n = e.solanaSubscription ?? null, o = n?.enabled ?? !1, r = (s) => {
    t({
      solanaSubscription: {
        ...Yt(),
        ...n ?? {},
        ...s
      }
    });
  }, d = () => {
    t({ solanaSubscription: null });
  };
  return /* @__PURE__ */ i("div", { style: { marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--pay-admin-border)" }, children: [
    /* @__PURE__ */ a("div", { className: "cedros-admin__form-row", children: /* @__PURE__ */ a("div", { className: "cedros-data-field cedros-admin__field", children: /* @__PURE__ */ i("label", { style: { display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }, children: [
      /* @__PURE__ */ a(
        "input",
        {
          type: "checkbox",
          checked: o,
          onChange: (s) => {
            s.target.checked ? r({ enabled: !0 }) : d();
          }
        }
      ),
      "Enable Solana subscriptions"
    ] }) }) }),
    o && n && /* @__PURE__ */ i(Y, { children: [
      /* @__PURE__ */ i("div", { className: "cedros-admin__form-row", children: [
        /* @__PURE__ */ a(x, { label: "Default plan ID", children: /* @__PURE__ */ a(
          V,
          {
            value: n.planId,
            onChange: (s) => r({ planId: s }),
            min: 0
          }
        ) }),
        /* @__PURE__ */ a(x, { label: "Monthly amount atomic", children: /* @__PURE__ */ a(
          V,
          {
            value: n.monthlyAmountAtomic,
            onChange: (s) => r({ monthlyAmountAtomic: s }),
            min: 1
          }
        ) }),
        /* @__PURE__ */ a(x, { label: "Monthly period hours", children: /* @__PURE__ */ a(
          V,
          {
            value: n.monthlyPeriodHours,
            onChange: (s) => r({ monthlyPeriodHours: s }),
            min: 1,
            max: 8760
          }
        ) })
      ] }),
      /* @__PURE__ */ i("div", { className: "cedros-admin__form-row", children: [
        /* @__PURE__ */ a(x, { label: "Monthly plan ID", children: /* @__PURE__ */ a(
          V,
          {
            value: n.monthlyPlanId,
            onChange: (s) => r({ monthlyPlanId: s }),
            min: 0
          }
        ) }),
        /* @__PURE__ */ a(x, { label: "Annual plan ID", children: /* @__PURE__ */ a(
          V,
          {
            value: n.annualPlanId,
            onChange: (s) => r({ annualPlanId: s }),
            min: 0
          }
        ) })
      ] }),
      /* @__PURE__ */ i("div", { className: "cedros-admin__form-row", children: [
        /* @__PURE__ */ a(x, { label: "Annual amount atomic", children: /* @__PURE__ */ a(
          V,
          {
            value: n.annualAmountAtomic,
            onChange: (s) => r({ annualAmountAtomic: s }),
            min: 1
          }
        ) }),
        /* @__PURE__ */ a(x, { label: "Annual period hours", children: /* @__PURE__ */ a(
          V,
          {
            value: n.annualPeriodHours,
            onChange: (s) => r({ annualPeriodHours: s }),
            min: 1,
            max: 8760
          }
        ) }),
        /* @__PURE__ */ a(x, { label: "Token program", children: /* @__PURE__ */ a(
          G,
          {
            value: n.tokenProgramAddress,
            placeholder: ra,
            onChange: (s) => r({ tokenProgramAddress: s })
          }
        ) })
      ] }),
      /* @__PURE__ */ i("div", { className: "cedros-admin__form-row", children: [
        /* @__PURE__ */ a(x, { label: "Merchant address", children: /* @__PURE__ */ a(
          G,
          {
            value: n.merchantAddress,
            onChange: (s) => r({ merchantAddress: s })
          }
        ) }),
        /* @__PURE__ */ a(x, { label: "Token mint", children: /* @__PURE__ */ a(
          G,
          {
            value: n.tokenMint,
            onChange: (s) => r({ tokenMint: s })
          }
        ) })
      ] }),
      /* @__PURE__ */ i("div", { className: "cedros-admin__form-row", children: [
        /* @__PURE__ */ a(x, { label: "Collector address", children: /* @__PURE__ */ a(
          G,
          {
            value: n.collectorAddress,
            onChange: (s) => r({ collectorAddress: s })
          }
        ) }),
        /* @__PURE__ */ a(x, { label: "Receiver token account", children: /* @__PURE__ */ a(
          G,
          {
            value: n.receiverTokenAccount,
            onChange: (s) => r({ receiverTokenAccount: s })
          }
        ) })
      ] }),
      /* @__PURE__ */ i("div", { className: "cedros-admin__form-row", children: [
        /* @__PURE__ */ a(x, { label: "Program address", children: /* @__PURE__ */ a(
          G,
          {
            value: n.programAddress,
            placeholder: da,
            onChange: (s) => r({ programAddress: s })
          }
        ) }),
        /* @__PURE__ */ a(x, { label: "Plan PDA", children: /* @__PURE__ */ a(
          G,
          {
            value: n.planAddress,
            onChange: (s) => r({ planAddress: s })
          }
        ) }),
        /* @__PURE__ */ a(x, { label: "Monthly plan PDA", children: /* @__PURE__ */ a(
          G,
          {
            value: n.monthlyPlanAddress,
            onChange: (s) => r({ monthlyPlanAddress: s })
          }
        ) })
      ] }),
      /* @__PURE__ */ a("div", { className: "cedros-admin__form-row", children: /* @__PURE__ */ a(x, { label: "Annual plan PDA", children: /* @__PURE__ */ a(
        G,
        {
          value: n.annualPlanAddress,
          onChange: (s) => r({ annualPlanAddress: s })
        }
      ) }) }),
      /* @__PURE__ */ i("div", { className: "cedros-admin__form-row", children: [
        /* @__PURE__ */ a(x, { label: "Expected plan created at", children: /* @__PURE__ */ a(
          V,
          {
            value: n.expectedCreatedAt,
            onChange: (s) => r({ expectedCreatedAt: s })
          }
        ) }),
        /* @__PURE__ */ a(x, { label: "Monthly created at", children: /* @__PURE__ */ a(
          V,
          {
            value: n.monthlyExpectedCreatedAt,
            onChange: (s) => r({ monthlyExpectedCreatedAt: s })
          }
        ) }),
        /* @__PURE__ */ a(x, { label: "Annual created at", children: /* @__PURE__ */ a(
          V,
          {
            value: n.annualExpectedCreatedAt,
            onChange: (s) => r({ annualExpectedCreatedAt: s })
          }
        ) })
      ] }),
      /* @__PURE__ */ a("div", { className: "cedros-admin__form-row", children: /* @__PURE__ */ a(x, { label: "Expected authority init ID", children: /* @__PURE__ */ a(
        V,
        {
          value: n.expectedSubscriptionAuthorityInitId,
          onChange: (s) => r({ expectedSubscriptionAuthorityInitId: s })
        }
      ) }) }),
      /* @__PURE__ */ i("div", { className: "cedros-admin__form-row", children: [
        /* @__PURE__ */ a(x, { label: "Metadata URI", children: /* @__PURE__ */ a(
          G,
          {
            value: n.metadataUri,
            onChange: (s) => r({ metadataUri: s })
          }
        ) }),
        /* @__PURE__ */ a(x, { label: "End timestamp", children: /* @__PURE__ */ a(
          V,
          {
            value: n.endTs,
            onChange: (s) => r({ endTs: s }),
            min: 0
          }
        ) }),
        /* @__PURE__ */ a(x, { label: "Plan status", children: /* @__PURE__ */ i(
          "select",
          {
            className: "cedros-data-input cedros-admin__input",
            value: n.status ?? "active",
            onChange: (s) => r({ status: s.target.value }),
            children: [
              /* @__PURE__ */ a("option", { value: "active", children: "Active" }),
              /* @__PURE__ */ a("option", { value: "sunset", children: "Sunset" })
            ]
          }
        ) })
      ] }),
      /* @__PURE__ */ i("div", { className: "cedros-admin__form-row", children: [
        /* @__PURE__ */ a(x, { label: "Monthly end timestamp", children: /* @__PURE__ */ a(
          V,
          {
            value: n.monthlyEndTs,
            onChange: (s) => r({ monthlyEndTs: s }),
            min: 0
          }
        ) }),
        /* @__PURE__ */ a(x, { label: "Monthly status", children: /* @__PURE__ */ i(
          "select",
          {
            className: "cedros-data-input cedros-admin__input",
            value: n.monthlyStatus ?? n.status ?? "active",
            onChange: (s) => r({ monthlyStatus: s.target.value }),
            children: [
              /* @__PURE__ */ a("option", { value: "active", children: "Active" }),
              /* @__PURE__ */ a("option", { value: "sunset", children: "Sunset" })
            ]
          }
        ) })
      ] }),
      /* @__PURE__ */ i("div", { className: "cedros-admin__form-row", children: [
        /* @__PURE__ */ a(x, { label: "Annual end timestamp", children: /* @__PURE__ */ a(
          V,
          {
            value: n.annualEndTs,
            onChange: (s) => r({ annualEndTs: s }),
            min: 0
          }
        ) }),
        /* @__PURE__ */ a(x, { label: "Annual status", children: /* @__PURE__ */ i(
          "select",
          {
            className: "cedros-data-input cedros-admin__input",
            value: n.annualStatus ?? n.status ?? "active",
            onChange: (s) => r({ annualStatus: s.target.value }),
            children: [
              /* @__PURE__ */ a("option", { value: "active", children: "Active" }),
              /* @__PURE__ */ a("option", { value: "sunset", children: "Sunset" })
            ]
          }
        ) })
      ] }),
      /* @__PURE__ */ i("div", { className: "cedros-admin__form-row", children: [
        /* @__PURE__ */ a(x, { label: "Destination wallets", children: /* @__PURE__ */ a(
          G,
          {
            value: (n.destinations ?? []).join(", "),
            onChange: (s) => r({ destinations: Ge(s) })
          }
        ) }),
        /* @__PURE__ */ a(x, { label: "Puller wallets", children: /* @__PURE__ */ a(
          G,
          {
            value: (n.pullers ?? []).join(", "),
            onChange: (s) => r({ pullers: Ge(s) })
          }
        ) })
      ] }),
      /* @__PURE__ */ a(qt, { config: n, onChange: r })
    ] })
  ] });
}
function x({ label: e, children: t }) {
  return /* @__PURE__ */ i("div", { className: "cedros-data-field cedros-admin__field", children: [
    /* @__PURE__ */ a("label", { className: "cedros-data-label cedros-admin__field-label", children: e }),
    t
  ] });
}
function G({
  value: e,
  onChange: t,
  placeholder: n
}) {
  return /* @__PURE__ */ a(
    "input",
    {
      type: "text",
      className: "cedros-data-input cedros-admin__input",
      value: e ?? "",
      placeholder: n,
      onChange: (o) => t(Zt(o.target.value))
    }
  );
}
function V({
  value: e,
  onChange: t,
  min: n,
  max: o
}) {
  return /* @__PURE__ */ a(
    "input",
    {
      type: "number",
      className: "cedros-data-input cedros-admin__input",
      value: e ?? "",
      min: n,
      max: o,
      onChange: (r) => t(Xt(r.target.value))
    }
  );
}
function Yt() {
  return {
    enabled: !0,
    planId: 0,
    merchantAddress: "",
    tokenMint: "",
    tokenProgramAddress: ra,
    programAddress: da,
    monthlyPeriodHours: 720,
    annualPeriodHours: 8760,
    destinations: [],
    pullers: [],
    status: "active",
    monthlyStatus: "active",
    annualStatus: "active"
  };
}
function Zt(e) {
  const t = e.trim();
  return t.length > 0 ? t : void 0;
}
function Xt(e) {
  if (e.trim() === "") return;
  const t = Number(e);
  return Number.isFinite(t) ? t : void 0;
}
function Ge(e) {
  return (e ?? "").split(",").map((t) => t.trim()).filter(Boolean).slice(0, 4);
}
function ve({
  children: e,
  tone: t
}) {
  const n = {
    primary: {
      background: "var(--pay-admin-primary)",
      color: "var(--pay-admin-primary-fg)"
    },
    muted: {
      background: "var(--pay-admin-muted)",
      color: "var(--pay-admin-primary-fg)"
    },
    success: {
      background: "var(--pay-admin-success-light)",
      color: "var(--pay-admin-success)"
    }
  }[t];
  return /* @__PURE__ */ a(
    "span",
    {
      style: {
        marginLeft: "0.5rem",
        fontSize: 11,
        padding: "2px 6px",
        borderRadius: 4,
        ...n
      },
      children: e
    }
  );
}
function We({
  label: e,
  onChange: t,
  placeholder: n,
  value: o
}) {
  return /* @__PURE__ */ i("div", { className: "cedros-data-field cedros-admin__field", children: [
    /* @__PURE__ */ a("label", { className: "cedros-data-label cedros-admin__field-label", children: e }),
    /* @__PURE__ */ a(
      "input",
      {
        type: "text",
        className: "cedros-data-input cedros-admin__input",
        value: o,
        onChange: (r) => t(r.target.value),
        placeholder: n
      }
    )
  ] });
}
function He(e) {
  if (e.trim() === "") return null;
  const t = Number(e);
  return Number.isFinite(t) ? t : null;
}
function Ne(e) {
  return Number.isFinite(e) ? String(e) : "";
}
function qe({
  label: e,
  onChange: t,
  placeholder: n,
  value: o
}) {
  const [r, d] = N(Ne(o));
  return W(() => {
    d(Ne(o));
  }, [o]), /* @__PURE__ */ i("div", { className: "cedros-data-field cedros-admin__field", children: [
    /* @__PURE__ */ a("label", { className: "cedros-data-label cedros-admin__field-label", children: e }),
    /* @__PURE__ */ a(
      "input",
      {
        type: "number",
        className: "cedros-data-input cedros-admin__input",
        value: r,
        onChange: (s) => {
          const c = s.target.value;
          d(c);
          const m = He(c);
          m !== null && t(m);
        },
        onBlur: () => {
          He(r) === null && d(Ne(o));
        },
        placeholder: n,
        min: "0",
        step: "0.01"
      }
    )
  ] });
}
function en({
  index: e,
  isExpanded: t,
  plan: n,
  planCount: o,
  onDelete: r,
  onMove: d,
  onToggleExpanded: s
}) {
  const c = n.title || "Untitled plan";
  return /* @__PURE__ */ i("div", { className: "cedros-admin__plan-summary", children: [
    /* @__PURE__ */ i(
      "button",
      {
        type: "button",
        className: "cedros-admin__plan-summary-toggle",
        onClick: () => s(n.id),
        "aria-expanded": t,
        "aria-label": `${t ? "Collapse" : "Expand"} ${c} plan`,
        children: [
          /* @__PURE__ */ a("span", { "aria-hidden": "true", children: t ? F.chevronDown : F.chevronRight }),
          /* @__PURE__ */ i("span", { className: "cedros-admin__plan-summary-main", children: [
            /* @__PURE__ */ a("span", { className: "cedros-admin__plan-summary-title", children: c }),
            n.isPopular && /* @__PURE__ */ a(ve, { tone: "primary", children: "Popular" }),
            !n.isActive && /* @__PURE__ */ a(ve, { tone: "muted", children: "Inactive" }),
            n.solanaSubscription?.enabled && /* @__PURE__ */ a(ve, { tone: "success", children: "Solana" })
          ] }),
          /* @__PURE__ */ i("span", { className: "cedros-admin__plan-summary-price", children: [
            "$",
            n.priceMonthlyUsd,
            "/mo · $",
            n.priceAnnualUsd,
            "/yr"
          ] })
        ]
      }
    ),
    /* @__PURE__ */ i("div", { className: "cedros-admin__plan-summary-actions", children: [
      /* @__PURE__ */ a(
        "button",
        {
          type: "button",
          className: "cedros-data-btn cedros-admin__button cedros-data-btn--ghost cedros-admin__button--ghost",
          onClick: () => d(n.id, "up"),
          disabled: e === 0,
          title: "Move up",
          "aria-label": `Move ${c} up`,
          style: { padding: "4px 8px" },
          children: F.chevronUp
        }
      ),
      /* @__PURE__ */ a(
        "button",
        {
          type: "button",
          className: "cedros-data-btn cedros-admin__button cedros-data-btn--ghost cedros-admin__button--ghost",
          onClick: () => d(n.id, "down"),
          disabled: e === o - 1,
          title: "Move down",
          "aria-label": `Move ${c} down`,
          style: { padding: "4px 8px" },
          children: F.chevronDown
        }
      ),
      /* @__PURE__ */ a(
        "button",
        {
          type: "button",
          className: "cedros-data-btn cedros-admin__button cedros-data-btn--ghost cedros-admin__button--ghost",
          onClick: () => r(n.id),
          title: "Delete plan",
          "aria-label": `Delete ${c} plan`,
          style: { padding: "4px 8px", color: "var(--pay-admin-error)" },
          children: F.trash
        }
      )
    ] })
  ] });
}
function an({
  plan: e,
  onUpdate: t
}) {
  return /* @__PURE__ */ a("div", { className: "cedros-admin__form-row", children: /* @__PURE__ */ i("div", { className: "cedros-data-field cedros-admin__field", style: { flex: 1 }, children: [
    /* @__PURE__ */ a("label", { className: "cedros-data-label cedros-admin__field-label", children: "Description" }),
    /* @__PURE__ */ a(
      "input",
      {
        type: "text",
        className: "cedros-data-input cedros-admin__input",
        value: e.description,
        onChange: (n) => t(e.id, { description: n.target.value }),
        placeholder: "For entry-level developers managing lightweight workloads"
      }
    )
  ] }) });
}
function tn({
  plan: e,
  onUpdate: t
}) {
  return /* @__PURE__ */ a("div", { className: "cedros-admin__form-row", children: /* @__PURE__ */ i("div", { className: "cedros-data-field cedros-admin__field", children: [
    /* @__PURE__ */ a("label", { className: "cedros-data-label cedros-admin__field-label", children: "Feature highlight" }),
    /* @__PURE__ */ a(
      "input",
      {
        type: "text",
        className: "cedros-data-input cedros-admin__input",
        value: e.featureHighlight || "",
        onChange: (n) => t(e.id, { featureHighlight: n.target.value }),
        placeholder: "100 prompts every 5 hours"
      }
    ),
    /* @__PURE__ */ a("div", { style: { marginTop: 4, fontSize: 12, opacity: 0.75 }, children: "Bold text shown above feature list" })
  ] }) });
}
function nn({
  plan: e,
  onUpdate: t
}) {
  return /* @__PURE__ */ i("div", { className: "cedros-admin__form-row", children: [
    /* @__PURE__ */ a("div", { className: "cedros-data-field cedros-admin__field", children: /* @__PURE__ */ i("label", { style: { display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }, children: [
      /* @__PURE__ */ a(
        "input",
        {
          type: "checkbox",
          checked: e.isPopular || !1,
          onChange: (n) => t(e.id, { isPopular: n.target.checked })
        }
      ),
      "Mark as Popular (featured styling)"
    ] }) }),
    /* @__PURE__ */ a("div", { className: "cedros-data-field cedros-admin__field", children: /* @__PURE__ */ i("label", { style: { display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }, children: [
      /* @__PURE__ */ a(
        "input",
        {
          type: "checkbox",
          checked: e.isActive,
          onChange: (n) => t(e.id, { isActive: n.target.checked })
        }
      ),
      "Active (available for purchase)"
    ] }) })
  ] });
}
function on({
  plan: e,
  onUpdate: t
}) {
  return /* @__PURE__ */ i("div", { className: "cedros-admin__form-row", style: { marginTop: "0.5rem" }, children: [
    /* @__PURE__ */ a("div", { className: "cedros-data-field cedros-admin__field", children: /* @__PURE__ */ i("label", { style: { display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }, children: [
      /* @__PURE__ */ a(
        "input",
        {
          type: "checkbox",
          checked: e.inventoryQuantity != null,
          onChange: (n) => t(e.id, { inventoryQuantity: n.target.checked ? 100 : null })
        }
      ),
      "Limit quantity available"
    ] }) }),
    e.inventoryQuantity != null && /* @__PURE__ */ i("div", { className: "cedros-data-field cedros-admin__field", children: [
      /* @__PURE__ */ a("label", { className: "cedros-data-label cedros-admin__field-label", children: "Total available" }),
      /* @__PURE__ */ a(
        "input",
        {
          type: "number",
          className: "cedros-data-input cedros-admin__input",
          value: e.inventoryQuantity ?? "",
          onChange: (n) => t(e.id, { inventoryQuantity: parseInt(n.target.value) || 0 }),
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
  ] });
}
function sn({
  plan: e,
  onAddFeature: t,
  onDeleteFeature: n,
  onUpdateFeature: o
}) {
  return /* @__PURE__ */ i("div", { style: { marginTop: "1rem" }, children: [
    /* @__PURE__ */ i("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }, children: [
      /* @__PURE__ */ i("label", { className: "cedros-data-label cedros-admin__field-label", style: { margin: 0 }, children: [
        "Feature list (",
        e.features.length,
        ")"
      ] }),
      /* @__PURE__ */ a(
        "button",
        {
          type: "button",
          className: "cedros-data-btn cedros-admin__button cedros-data-btn--ghost cedros-admin__button--ghost",
          onClick: () => t(e.id),
          style: { fontSize: 12, padding: "4px 8px" },
          children: "+ Add feature"
        }
      )
    ] }),
    e.features.length === 0 ? /* @__PURE__ */ a(
      Te,
      {
        title: "No features yet",
        description: 'Click "Add feature" to add bullet points.'
      }
    ) : /* @__PURE__ */ a("div", { style: { display: "flex", flexDirection: "column", gap: "0.5rem" }, children: e.features.map((r, d) => /* @__PURE__ */ i("div", { style: { display: "flex", gap: "0.5rem", alignItems: "center" }, children: [
      /* @__PURE__ */ i("span", { style: { opacity: 0.4, fontSize: 12 }, children: [
        d + 1,
        "."
      ] }),
      /* @__PURE__ */ a(
        "input",
        {
          type: "text",
          className: "cedros-data-input cedros-admin__input",
          value: r,
          onChange: (s) => o(e.id, d, s.target.value),
          placeholder: "e.g., Powered by MiniMax M2.1",
          style: { flex: 1 }
        }
      ),
      /* @__PURE__ */ a(
        "button",
        {
          type: "button",
          className: "cedros-data-btn cedros-admin__button cedros-data-btn--ghost cedros-admin__button--ghost",
          onClick: () => n(e.id, d),
          style: { padding: "4px 8px", color: "var(--pay-admin-error)" },
          title: "Remove feature",
          "aria-label": `Remove feature ${d + 1} from ${e.title || "Untitled plan"}`,
          children: F.trash
        }
      )
    ] }, d)) })
  ] });
}
function rn({
  plan: e,
  onAddFeature: t,
  onDeleteFeature: n,
  inventoryEnabled: o = !0,
  onUpdate: r,
  onUpdateFeature: d
}) {
  return /* @__PURE__ */ i("div", { style: { padding: "1rem", borderTop: "1px solid var(--pay-admin-border)" }, children: [
    /* @__PURE__ */ i("div", { className: "cedros-admin__form-row", children: [
      /* @__PURE__ */ a(
        We,
        {
          label: "Plan name",
          value: e.title,
          onChange: (s) => r(e.id, { title: s }),
          placeholder: "e.g., Starter"
        }
      ),
      /* @__PURE__ */ a(
        We,
        {
          label: "Button text",
          value: e.buttonText || "",
          onChange: (s) => r(e.id, { buttonText: s }),
          placeholder: "Purchase"
        }
      )
    ] }),
    /* @__PURE__ */ a(an, { plan: e, onUpdate: r }),
    /* @__PURE__ */ i("div", { className: "cedros-admin__form-row", children: [
      /* @__PURE__ */ a(
        qe,
        {
          label: "Monthly price (USD)",
          value: e.priceMonthlyUsd,
          onChange: (s) => r(e.id, { priceMonthlyUsd: s }),
          placeholder: "10"
        }
      ),
      /* @__PURE__ */ a(
        qe,
        {
          label: "Annual price (USD)",
          value: e.priceAnnualUsd,
          onChange: (s) => r(e.id, { priceAnnualUsd: s }),
          placeholder: "100"
        }
      )
    ] }),
    /* @__PURE__ */ a(tn, { plan: e, onUpdate: r }),
    /* @__PURE__ */ a(nn, { plan: e, onUpdate: r }),
    o && /* @__PURE__ */ a(on, { plan: e, onUpdate: r }),
    /* @__PURE__ */ a(
      Jt,
      {
        plan: e,
        onChange: (s) => r(e.id, s)
      }
    ),
    /* @__PURE__ */ a(
      sn,
      {
        plan: e,
        onAddFeature: t,
        onDeleteFeature: n,
        onUpdateFeature: d
      }
    )
  ] });
}
function dn(e) {
  return /* @__PURE__ */ i(
    "div",
    {
      style: {
        border: "1px solid var(--pay-admin-border)",
        borderRadius: 8,
        overflow: "hidden",
        background: e.plan.isPopular ? "var(--pay-admin-accent)" : void 0
      },
      children: [
        /* @__PURE__ */ a(en, { ...e }),
        e.isExpanded && /* @__PURE__ */ a(
          rn,
          {
            plan: e.plan,
            onAddFeature: e.onAddFeature,
            onDeleteFeature: e.onDeleteFeature,
            inventoryEnabled: e.inventoryEnabled,
            onUpdate: e.onUpdate,
            onUpdateFeature: e.onUpdateFeature
          }
        )
      ]
    }
  );
}
function ln({
  confirmLabel: e,
  impact: t,
  onCancel: n,
  onConfirm: o,
  title: r
}) {
  const d = X(), s = X();
  return /* @__PURE__ */ i(he, { labelledBy: d, describedBy: s, onClose: n, children: [
    /* @__PURE__ */ a("div", { className: "cedros-data-dialog__heading cedros-admin__section-header", children: /* @__PURE__ */ a("h3", { id: d, className: "cedros-data-dialog__title cedros-admin__section-title", children: r }) }),
    /* @__PURE__ */ i("div", { id: s, className: "cedros-data-dialog__body cedros-admin__modal-body", children: [
      /* @__PURE__ */ a("p", { children: t }),
      /* @__PURE__ */ a("p", { children: "This action cannot be undone." })
    ] }),
    /* @__PURE__ */ i("div", { className: "cedros-data-actions cedros-admin__modal-footer", children: [
      /* @__PURE__ */ a("button", { type: "button", className: "cedros-data-btn cedros-data-btn--secondary cedros-admin__button", onClick: n, children: "Cancel" }),
      /* @__PURE__ */ a("button", { type: "button", className: "cedros-data-btn cedros-data-btn--danger cedros-admin__button cedros-admin__button--danger", onClick: o, children: e })
    ] })
  ] });
}
const cn = {
  title: "New plan",
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
function un() {
  return `plan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
function mn(e) {
  return e === "failed" ? "error" : e;
}
function pn({ authManager: e, serverUrl: t }) {
  const [n, o] = N(ge), [r, d] = N(!0), [s, c] = N(null), [m, S] = N(null), [y, p] = N(!1), [C, P] = N(null), [A, _] = N(null), { flags: l } = we(t, e), b = B(async () => {
    d(!0);
    try {
      P(null);
      const R = await re(e, "/admin/subscriptions/settings");
      o({ ...ge, ...R }), p(!0);
    } catch {
      P("Failed to load subscription settings");
    } finally {
      d(!1);
    }
  }, [e]);
  W(() => {
    b();
  }, [b]);
  const D = B(async (E) => {
    try {
      _(null);
      const R = "/admin/subscriptions/settings", U = JSON.stringify(E);
      return await H(e).fetchWithAuth(R, {
        method: "PUT",
        body: U
      });
    } catch {
      throw _("Failed to save subscription settings"), new Error("Failed to save subscription settings");
    }
  }, [e]), u = B(async () => {
    try {
      const E = await D(n), R = { ...ge, ...E };
      return o(R), { canonicalDraftKey: JSON.stringify(R) };
    } catch {
      throw new Error("Failed to save subscription settings");
    }
  }, [D, n]), h = B(
    (E) => {
      o((R) => E(R));
    },
    []
  ), g = () => {
    const E = {
      ...cn,
      id: un(),
      sortOrder: n.plans.length
    };
    h((R) => ({ ...R, plans: [...R.plans, E] })), c(E.id);
  }, w = (E, R) => {
    h((U) => ({
      ...U,
      plans: U.plans.map(($) => $.id === E ? { ...$, ...R } : $)
    }));
  }, k = () => {
    m && (h((E) => ({
      ...E,
      plans: E.plans.filter((R) => R.id !== m)
    })), s === m && c(null), S(null));
  }, L = (E, R) => {
    const U = n.plans.findIndex((Z) => Z.id === E);
    if (U === -1 || R === "up" && U === 0 || R === "down" && U === n.plans.length - 1) return;
    const $ = [...n.plans], J = R === "up" ? U - 1 : U + 1;
    [$[U], $[J]] = [$[J], $[U]], h((Z) => ({ ...Z, plans: $ }));
  }, T = (E) => {
    w(E, {
      features: [...n.plans.find((R) => R.id === E)?.features || [], ""]
    });
  }, f = (E, R, U) => {
    const $ = n.plans.find((Z) => Z.id === E);
    if (!$) return;
    const J = [...$.features];
    J[R] = U, w(E, { features: J });
  }, I = (E, R) => {
    const U = n.plans.find((J) => J.id === E);
    if (!U) return;
    const $ = U.features.filter((J, Z) => Z !== R);
    w(E, { features: $ });
  };
  me(b, { enabled: !!C, intervalMs: 15e3 });
  const M = Ae(JSON.stringify(n), u, {
    ready: y && !r,
    delayMs: 600,
    resourceType: "subscription-plans",
    resourceId: "default",
    extensionId: "cedros-pay"
  });
  if (r)
    return /* @__PURE__ */ a("div", { className: "cedros-data-stack cedros-admin__page", children: /* @__PURE__ */ a(ue, { label: "Loading subscription settings…" }) });
  if (!y && C)
    return /* @__PURE__ */ a("div", { className: "cedros-data-stack cedros-admin__page", children: /* @__PURE__ */ a(j, { message: C, onRetry: b }) });
  const v = n.plans.filter((E) => E.isActive).length, O = n.plans.reduce((E, R) => E + (R.activeSubscribers ?? 0), 0), K = n.enabled, de = n.plans.find((E) => E.id === m), la = n.plans.filter((E) => E.isActive).map((E) => ({
    label: E.title,
    value: E.activeSubscribers ?? 0,
    description: "subscribers"
  }));
  return /* @__PURE__ */ i("div", { className: "cedros-data-stack cedros-admin__page", children: [
    /* @__PURE__ */ a(j, { message: C ?? A, onRetry: C ? b : void 0 }),
    /* @__PURE__ */ a(
      ke,
      {
        stats: [
          { label: "Status", value: K ? "Enabled" : "Disabled", variant: K ? "success" : "muted" },
          { label: "Active plans", value: v, variant: v > 0 ? "success" : "muted" },
          { label: "Total subscribers", value: O, variant: O > 0 ? "success" : "muted" },
          ...la
        ],
        isLoading: r
      }
    ),
    /* @__PURE__ */ i("div", { className: "cedros-data-card cedros-admin__section", children: [
      /* @__PURE__ */ i("div", { className: "cedros-admin__section-header", children: [
        /* @__PURE__ */ a("h3", { className: "cedros-admin__section-title", children: "Subscription plans" }),
        /* @__PURE__ */ i("div", { style: { display: "flex", alignItems: "center", gap: "0.75rem" }, children: [
          /* @__PURE__ */ i(
            "button",
            {
              className: "cedros-data-btn cedros-admin__button cedros-data-btn--primary cedros-admin__button--primary cedros-admin__button--action",
              onClick: g,
              disabled: !K,
              type: "button",
              children: [
                F.plus,
                "Add plan"
              ]
            }
          ),
          /* @__PURE__ */ a(
            Ee,
            {
              status: M,
              className: `cedros-admin__autosave-indicator cedros-admin__autosave-indicator--${mn(M)}`
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ a("div", { children: K ? n.plans.length === 0 ? /* @__PURE__ */ a(
        Te,
        {
          title: "No plans yet",
          description: "Add a plan to create your first subscription tier."
        }
      ) : /* @__PURE__ */ a("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem" }, children: n.plans.map((E, R) => /* @__PURE__ */ a(
        dn,
        {
          index: R,
          inventoryEnabled: l.inventory,
          isExpanded: s === E.id,
          plan: E,
          planCount: n.plans.length,
          onAddFeature: T,
          onDelete: S,
          onDeleteFeature: I,
          onMove: L,
          onToggleExpanded: (U) => c(s === U ? null : U),
          onUpdate: w,
          onUpdateFeature: f
        },
        E.id
      )) }) : /* @__PURE__ */ a(
        fa,
        {
          title: "Enable subscriptions",
          description: "Turn on subscriptions in Pay hub to configure plans.",
          action: /* @__PURE__ */ a("a", { className: "cedros-data-btn cedros-data-btn--primary cedros-data-btn--sm", href: "/admin/cedros-pay:admin:cedros-pay:settings-hub/overview", children: "Open Pay hub" })
        }
      ) })
    ] }),
    de && /* @__PURE__ */ a(
      ln,
      {
        title: `Delete “${de.title || "Untitled plan"}”?`,
        impact: "This permanently removes the plan and its configured features from subscription settings.",
        confirmLabel: "Delete plan",
        onCancel: () => S(null),
        onConfirm: k
      }
    )
  ] });
}
const hn = [
  {
    id: "products",
    label: "Products",
    title: "Products",
    description: "Manage products, pricing, availability, and Stripe sync.",
    Component: Ut
  },
  {
    id: "inventory",
    label: "Inventory",
    title: "Inventory",
    description: "Review stock levels and product inventory adjustments.",
    Component: Ht
  },
  {
    id: "subscriptions",
    label: "Subscriptions",
    title: "Subscriptions",
    description: "Configure recurring plans and subscription availability.",
    Component: pn
  },
  {
    id: "coupons",
    label: "Coupons",
    title: "Coupons",
    description: "Create discounts for products, categories, and checkout.",
    Component: $t
  }
];
function Cn(e) {
  const { flags: t } = we(e.serverUrl, e.authManager), n = z(
    () => hn.filter((o) => o.id === "inventory" ? t.inventory : o.id === "subscriptions" ? t.subscriptions : o.id === "coupons" ? t.coupons : !0),
    [t]
  );
  return /* @__PURE__ */ a(
    va,
    {
      ...e,
      tabs: n,
      title: "Catalog",
      description: "Manage products and enabled catalog workflows.",
      routeSectionId: "catalog"
    }
  );
}
export {
  Cn as CatalogSection
};
