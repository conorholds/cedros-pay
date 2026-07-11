import { n as s } from "./locales-BNQRXSb3.mjs";
function m(t) {
  const e = t instanceof Date ? t : new Date(t);
  return Number.isNaN(e.getTime()) ? null : e;
}
function a(t) {
  return t ? s(t) : void 0;
}
function D(t, e, r) {
  const n = m(t);
  return n ? new Intl.DateTimeFormat(a(e), {
    year: "numeric",
    month: "long",
    day: "numeric",
    ...r
  }).format(n) : "";
}
function w(t, e, r) {
  const n = m(t);
  return n ? new Intl.DateTimeFormat(a(e), {
    dateStyle: "medium",
    timeStyle: "short",
    ...r
  }).format(n) : "";
}
function i(t, e, r) {
  return new Intl.NumberFormat(a(e), r).format(t);
}
function f(t, e, r, n) {
  const o = { ...n ?? {} };
  delete o.style, delete o.currency, delete o.currencyDisplay, delete o.currencySign;
  const u = i(t, r, o), c = e.trim().toUpperCase();
  return c ? `${u} ${c}` : u;
}
function l(t) {
  try {
    return new Intl.NumberFormat(void 0, { style: "currency", currency: t }), !0;
  } catch (e) {
    if (e instanceof RangeError)
      return !1;
    throw e;
  }
}
function d(t, e = "USD", r, n) {
  return l(e) ? i(t, r, {
    style: "currency",
    currency: e,
    ...n
  }) : f(t, e, r, n);
}
function b(t, e = "USD", r, n) {
  return d(t / 100, e, r, n);
}
function h(t, e, r) {
  const n = new Intl.PluralRules(a(r)).select(t);
  return e[n] ?? e.other;
}
export {
  D as a,
  w as b,
  b as c,
  i as d,
  d as f,
  h as s
};
