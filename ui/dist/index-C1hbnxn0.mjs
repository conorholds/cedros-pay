import { i as Se, P as pl, u as sr, o as Js, a as bn, p as Xs, q as xp, m as fo, r as _p } from "./CedrosContext-BnJ2Cf7R.mjs";
import { jsxs as p, jsx as s, Fragment as Ct } from "react/jsx-runtime";
import * as m from "react";
import L, { useState as K, useRef as Jt, useCallback as ae, useMemo as Ne, useEffect as Te, lazy as ln, Suspense as mn, createElement as Fi, useLayoutEffect as kp } from "react";
import { useWallet as Sp } from "@solana/wallet-adapter-react";
import "@solana/web3.js";
import { b as ji } from "./index-BFt38o8Q.mjs";
import { useCedrosLogin as Cp } from "@cedros/login-react";
import * as zo from "react-dom";
import ml from "react-dom";
function vN(e) {
  return !e || !e.coupon_codes ? [] : e.coupon_codes.split(",").map((t) => t.trim()).filter((t) => t.length > 0);
}
function bN(e, t = ", ") {
  return e.join(t);
}
function wN(e, t) {
  return e <= 0 ? 0 : (e - t) / e * 100;
}
function xN(e, t) {
  if (!t || t.length === 0)
    return e;
  let n = e, r = 0;
  for (const o of t)
    if (o.discountType === "percentage") {
      const a = 1 - o.discountValue / 100;
      n = n * a;
    } else o.discountType === "fixed" && (r += o.discountValue);
  return n = n - r, n < 0 && (n = 0), Math.ceil(n * 100) / 100;
}
function hl(e) {
  const t = Number(e);
  if (!Number.isFinite(t) || t <= 0)
    return 1;
  const n = Math.floor(t);
  return n > 0 ? n : 1;
}
function ea(e) {
  return e.map((t) => ({
    resource: t.resource,
    quantity: hl(t.quantity),
    variantId: t.variantId,
    metadata: t.metadata
  }));
}
function Fo(e) {
  return e.reduce((t, n) => t + hl(n.quantity), 0);
}
function Np(e) {
  return !!(e && e.length > 0 && (e.length > 1 || e.length === 1 && (e[0].quantity ?? 1) > 1));
}
const Kn = /* @__PURE__ */ new Map(), ta = /* @__PURE__ */ new Map(), Pn = /* @__PURE__ */ new Map(), wo = 1e3, gl = 200, Ca = 2e3;
function Ep(e) {
  const t = Pn.get(e);
  return t ? Date.now() < t ? !0 : (Pn.delete(e), !1) : !1;
}
function Ap(e, t = gl) {
  const n = Date.now() + t;
  if (Pn.set(e, n), Pn.size > wo) {
    const r = Array.from(Pn.keys()).slice(0, Pn.size - wo);
    for (const o of r)
      Pn.delete(o);
  }
}
function Pp(e, t = Ca) {
  const n = Kn.get(e);
  if (!n)
    return !1;
  const o = Date.now() - n;
  return o < t ? (Se().debug(`[Deduplication] Duplicate request blocked: ${e} (${o}ms ago)`), !0) : !1;
}
function Ip(e) {
  if (Kn.set(e, Date.now()), Kn.size > wo) {
    const t = Array.from(Kn.keys()).slice(0, Kn.size - wo);
    for (const n of t)
      Kn.delete(n);
  }
}
function Tp(e) {
  return ta.get(e) || null;
}
function Rp(e, t) {
  ta.set(e, t);
  const n = () => {
    ta.delete(e), Ip(e);
  };
  return t.then(n, n), t;
}
async function Op(e, t, n = {}) {
  const { windowMs: r = Ca, throwOnDuplicate: o = !0 } = n, a = Tp(e);
  if (a)
    return Se().debug(`[Deduplication] Reusing in-flight request: ${e}`), a;
  if (Pp(e, r)) {
    if (o)
      throw new Error(`Duplicate request blocked: ${e}`);
    Se().warn(`[Deduplication] Duplicate request blocked but not throwing: ${e}`);
    return;
  }
  const i = t();
  return Rp(e, i);
}
function Br(e, t, n = {}) {
  const { cooldownMs: r = gl, deduplicationWindowMs: o = Ca } = n;
  return async () => {
    if (Ep(e)) {
      Se().debug(`[Deduplication] Button in cooldown: ${e}`);
      return;
    }
    Ap(e, r);
    try {
      await Op(
        e,
        async () => {
          const a = t();
          a instanceof Promise && await a;
        },
        { windowMs: o, throwOnDuplicate: !1 }
      );
    } catch (a) {
      if (a instanceof Error && a.message.includes("Duplicate request"))
        return;
      throw a;
    }
  };
}
function Mp(e) {
  return {
    background: "none",
    border: "none",
    fontSize: "1.5rem",
    cursor: "pointer",
    color: e,
    opacity: 0.6,
    padding: "0.25rem",
    lineHeight: 1
  };
}
const zn = {
  PAYMENT_START: "cedros:payment:start",
  WALLET_CONNECT: "cedros:wallet:connect",
  WALLET_CONNECTED: "cedros:wallet:connected",
  WALLET_ERROR: "cedros:wallet:error",
  PAYMENT_PROCESSING: "cedros:payment:processing",
  PAYMENT_SUCCESS: "cedros:payment:success",
  PAYMENT_ERROR: "cedros:payment:error"
};
function Fn(e, t) {
  if (typeof window > "u")
    return;
  const n = new CustomEvent(e, {
    detail: t,
    bubbles: !0,
    cancelable: !1
  });
  window.dispatchEvent(n);
}
function Ur(e, t, n) {
  Fn(zn.PAYMENT_START, {
    timestamp: Date.now(),
    method: e,
    resource: t,
    itemCount: n
  });
}
function _N(e) {
  Fn(zn.WALLET_CONNECT, {
    timestamp: Date.now(),
    wallet: e
  });
}
function kN(e, t) {
  Fn(zn.WALLET_CONNECTED, {
    timestamp: Date.now(),
    wallet: e,
    publicKey: t
  });
}
function SN(e, t) {
  Fn(zn.WALLET_ERROR, {
    timestamp: Date.now(),
    wallet: t,
    error: e
  });
}
function Vr(e, t, n) {
  Fn(zn.PAYMENT_PROCESSING, {
    timestamp: Date.now(),
    method: e,
    resource: t,
    itemCount: n
  });
}
function Wr(e, t, n, r) {
  Fn(zn.PAYMENT_SUCCESS, {
    timestamp: Date.now(),
    method: e,
    transactionId: t,
    resource: n,
    itemCount: r
  });
}
function sn(e, t, n, r) {
  Fn(zn.PAYMENT_ERROR, {
    timestamp: Date.now(),
    method: e,
    error: t,
    resource: n,
    itemCount: r
  });
}
function CN(e) {
  return e instanceof pl && e.canRetry();
}
function NN(e) {
  return e instanceof pl ? e.getUserMessage() : e instanceof Error ? e.message : String(e);
}
function Lp(e) {
  switch (e) {
    case "mainnet-beta":
      return "https://api.mainnet-beta.solana.com";
    case "devnet":
      return "https://api.devnet.solana.com";
    case "testnet":
      return "https://api.testnet.solana.com";
    default:
      return "https://api.mainnet-beta.solana.com";
  }
}
function Dp(e) {
  try {
    const t = new URL(e);
    return `${t.protocol}//${t.host}`;
  } catch {
    return e;
  }
}
function $p(e = {}) {
  const {
    solanaCluster: t = "mainnet-beta",
    solanaEndpoint: n,
    customRpcProviders: r = [],
    allowUnsafeScripts: o = !1,
    additionalScriptSrc: a = [],
    additionalConnectSrc: i = [],
    additionalFrameSrc: c = [],
    includeStripe: l = !0,
    includeSolana: d = !0
  } = e;
  o && console.warn(
    "[CedrosPay] SECURITY WARNING: allowUnsafeScripts is enabled. This adds 'unsafe-inline' and 'unsafe-eval' to script-src, which significantly weakens CSP protection against XSS attacks. Only use this in development or if absolutely required by your framework."
  );
  const f = ["'self'"];
  o && f.push("'unsafe-inline'", "'unsafe-eval'"), l && f.push("https://js.stripe.com"), f.push(...a);
  const u = ["'self'"];
  if (l && u.push("https://api.stripe.com", "https://*.stripe.com"), d) {
    const g = Lp(t);
    if (u.push(g), n) {
      const b = Dp(n);
      u.includes(b) || u.push(b);
    }
    r.forEach((b) => {
      u.includes(b) || u.push(b);
    });
  }
  u.push(...i);
  const h = ["'self'"];
  return l && h.push("https://js.stripe.com", "https://checkout.stripe.com"), h.push(...c), {
    scriptSrc: f,
    connectSrc: u,
    frameSrc: h
  };
}
function zp(e, t = "header") {
  const { scriptSrc: n, connectSrc: r, frameSrc: o } = e;
  switch (t) {
    case "header":
    case "meta":
    case "nextjs":
    case "nginx": {
      const a = [];
      return n.length > 0 && a.push(`script-src ${n.join(" ")}`), r.length > 0 && a.push(`connect-src ${r.join(" ")}`), o.length > 0 && a.push(`frame-src ${o.join(" ")}`), a.join("; ");
    }
    case "helmet": {
      const a = {};
      return n.length > 0 && (a.scriptSrc = n), r.length > 0 && (a.connectSrc = r), o.length > 0 && (a.frameSrc = o), a;
    }
    case "directives":
      return { scriptSrc: n, connectSrc: r, frameSrc: o };
    default:
      throw new Error(`Unknown CSP format: ${t}`);
  }
}
function EN(e = {}, t = "header") {
  const n = $p(e);
  return zp(n, t);
}
const AN = {
  HELIUS: "https://*.helius-rpc.com",
  QUICKNODE: "https://*.quicknode.pro",
  ALCHEMY: "https://*.alchemy.com",
  ANKR: "https://rpc.ankr.com",
  TRITON: "https://*.rpcpool.com"
}, PN = {
  /**
   * Mainnet production with custom RPC (recommended)
   */
  MAINNET_CUSTOM_RPC: (e) => ({
    solanaCluster: "mainnet-beta",
    solanaEndpoint: e,
    allowUnsafeScripts: !1
  }),
  /**
   * Mainnet with Next.js (may require unsafe-inline/eval for some setups)
   * Note: Modern Next.js supports strict CSP without unsafe directives.
   * Only enable allowUnsafeScripts if necessary and understand the security implications.
   */
  MAINNET_NEXTJS: (e) => ({
    solanaCluster: "mainnet-beta",
    solanaEndpoint: e,
    allowUnsafeScripts: !1
  }),
  /**
   * Devnet for testing
   */
  DEVNET: () => ({
    solanaCluster: "devnet",
    allowUnsafeScripts: !1
  }),
  /**
   * Crypto-only payments (no Stripe)
   */
  CRYPTO_ONLY: (e) => ({
    solanaCluster: "mainnet-beta",
    solanaEndpoint: e,
    includeStripe: !1
  }),
  /**
   * Stripe-only payments (no Solana)
   */
  STRIPE_ONLY: () => ({
    includeStripe: !0,
    includeSolana: !1
  })
};
function po(e) {
  return new Date(e).toLocaleString();
}
function Na() {
  const { stripeManager: e } = sr(), [t, n] = K({
    status: "idle",
    error: null,
    transactionId: null
  }), r = Jt(!1), o = ae(
    async (c, l, d, f, u, h) => {
      if (r.current)
        return { success: !1, error: "Payment already in progress" };
      r.current = !0, n({
        status: "loading",
        error: null,
        transactionId: null
      });
      const g = {
        resource: c,
        successUrl: l,
        cancelUrl: d,
        metadata: f,
        customerEmail: u,
        couponCode: h
      };
      try {
        const b = await e.processPayment(g);
        return n({
          status: b.success ? "success" : "error",
          error: b.success ? null : b.error || "Payment failed",
          transactionId: b.success && b.transactionId || null
        }), b;
      } catch (b) {
        const v = b instanceof Error ? b.message : "Payment failed";
        return n({
          status: "error",
          error: v,
          transactionId: null
        }), { success: !1, error: v };
      } finally {
        r.current = !1;
      }
    },
    [e]
  ), a = ae(
    async (c, l, d, f, u, h, g, b, v, y, w, k, _) => {
      if (r.current)
        return { success: !1, error: "Payment already in progress" };
      r.current = !0, n({
        status: "loading",
        error: null,
        transactionId: null
      });
      const x = ea(c);
      try {
        const S = await e.processCartCheckout({
          items: x,
          successUrl: l,
          cancelUrl: d,
          metadata: f,
          customerEmail: u,
          customerName: g,
          customerPhone: b,
          shippingAddress: v,
          billingAddress: y,
          couponCode: h,
          tipAmount: w,
          shippingMethodId: k,
          paymentMethodId: _
        });
        return n({
          status: S.success ? "success" : "error",
          error: S.success ? null : S.error || "Cart checkout failed",
          transactionId: S.success && S.transactionId || null
        }), S;
      } catch (S) {
        const I = S instanceof Error ? S.message : "Cart checkout failed";
        return n({
          status: "error",
          error: I,
          transactionId: null
        }), { success: !1, error: I };
      } finally {
        r.current = !1;
      }
    },
    [e]
  ), i = ae(() => {
    n({
      status: "idle",
      error: null,
      transactionId: null
    }), r.current = !1;
  }, []);
  return {
    ...t,
    processPayment: o,
    processCartCheckout: a,
    reset: i
  };
}
function jo(e, t) {
  return Ne(() => {
    const n = Np(t), r = e || (t?.length === 1 ? t[0].resource : "");
    return {
      isCartMode: n,
      effectiveResource: r
    };
  }, [e, t]);
}
const Fp = (e, t, n) => {
  const r = e[t];
  return r ? typeof r == "function" ? r() : Promise.resolve(r) : new Promise((o, a) => {
    (typeof queueMicrotask == "function" ? queueMicrotask : setTimeout)(a.bind(null, /* @__PURE__ */ new Error("Unknown variable dynamic import: " + t + (t.split("/").length !== n ? ". Note that variables only represent file names one level deep." : ""))));
  });
}, Es = /* @__PURE__ */ new Map();
let Yr = null;
async function Bi(e) {
  if (Es.has(e))
    return Es.get(e);
  try {
    const t = await Fp(/* @__PURE__ */ Object.assign({ "./translations/ar.json": () => import("./ar-w27mU-4x.mjs"), "./translations/bn.json": () => import("./bn-Ba_k3Kex.mjs"), "./translations/de.json": () => import("./de-CoZiPFN7.mjs"), "./translations/en.json": () => import("./en-BXheDBal.mjs"), "./translations/es.json": () => import("./es-BWGIBp2f.mjs"), "./translations/fil.json": () => import("./fil-Czo27xmj.mjs"), "./translations/fr.json": () => import("./fr-DQ-2ThBv.mjs"), "./translations/he.json": () => import("./he-DpV1WnBQ.mjs"), "./translations/id.json": () => import("./id-BJMqsu19.mjs"), "./translations/in.json": () => import("./in-BxgxKLQH.mjs"), "./translations/it.json": () => import("./it-DZFFPALf.mjs"), "./translations/jp.json": () => import("./jp-ZExTrlHK.mjs"), "./translations/kr.json": () => import("./kr-DHX3i4Ht.mjs"), "./translations/ms.json": () => import("./ms-Cv1fdIi2.mjs"), "./translations/nl.json": () => import("./nl-BmGonsKb.mjs"), "./translations/pa.json": () => import("./pa-BfwcJIar.mjs"), "./translations/pl.json": () => import("./pl-DE5IB9xv.mjs"), "./translations/pt.json": () => import("./pt-CLzkqDzf.mjs"), "./translations/ru.json": () => import("./ru-DM6-oUR0.mjs"), "./translations/ta.json": () => import("./ta-A5HnrGb5.mjs"), "./translations/th.json": () => import("./th-3fbB3Ytp.mjs"), "./translations/tr.json": () => import("./tr-BrgfFFdq.mjs"), "./translations/uk.json": () => import("./uk-0hFun_g_.mjs"), "./translations/ur.json": () => import("./ur-CaOjJXai.mjs"), "./translations/vn.json": () => import("./vn-0nlIZFLP.mjs"), "./translations/zh.json": () => import("./zh-B4Endr1F.mjs") }), `./translations/${e}.json`, 3), n = t.default || t;
    return Es.set(e, n), n;
  } catch {
    return null;
  }
}
async function IN() {
  if (Yr)
    return Yr;
  const e = /* @__PURE__ */ Object.assign({ "./translations/ar.json": () => import("./ar-w27mU-4x.mjs"), "./translations/bn.json": () => import("./bn-Ba_k3Kex.mjs"), "./translations/de.json": () => import("./de-CoZiPFN7.mjs"), "./translations/en.json": () => import("./en-BXheDBal.mjs"), "./translations/es.json": () => import("./es-BWGIBp2f.mjs"), "./translations/fil.json": () => import("./fil-Czo27xmj.mjs"), "./translations/fr.json": () => import("./fr-DQ-2ThBv.mjs"), "./translations/he.json": () => import("./he-DpV1WnBQ.mjs"), "./translations/id.json": () => import("./id-BJMqsu19.mjs"), "./translations/in.json": () => import("./in-BxgxKLQH.mjs"), "./translations/it.json": () => import("./it-DZFFPALf.mjs"), "./translations/jp.json": () => import("./jp-ZExTrlHK.mjs"), "./translations/kr.json": () => import("./kr-DHX3i4Ht.mjs"), "./translations/ms.json": () => import("./ms-Cv1fdIi2.mjs"), "./translations/nl.json": () => import("./nl-BmGonsKb.mjs"), "./translations/pa.json": () => import("./pa-BfwcJIar.mjs"), "./translations/pl.json": () => import("./pl-DE5IB9xv.mjs"), "./translations/pt.json": () => import("./pt-CLzkqDzf.mjs"), "./translations/ru.json": () => import("./ru-DM6-oUR0.mjs"), "./translations/ta.json": () => import("./ta-A5HnrGb5.mjs"), "./translations/th.json": () => import("./th-3fbB3Ytp.mjs"), "./translations/tr.json": () => import("./tr-BrgfFFdq.mjs"), "./translations/uk.json": () => import("./uk-0hFun_g_.mjs"), "./translations/ur.json": () => import("./ur-CaOjJXai.mjs"), "./translations/vn.json": () => import("./vn-0nlIZFLP.mjs"), "./translations/zh.json": () => import("./zh-B4Endr1F.mjs") }), t = [];
  for (const n in e) {
    const r = n.match(/\.\/translations\/([a-z]{2,3}(?:-[A-Z]{2})?)\.json$/);
    r && t.push(r[1]);
  }
  return Yr = t.length > 0 ? t : ["en"], Yr;
}
function jp() {
  return typeof navigator > "u" ? "en" : (navigator.language || navigator.userLanguage || "en").split("-")[0].toLowerCase();
}
async function Bp(e) {
  let t = await Bi(e);
  if (t || (t = await Bi("en"), t))
    return t;
  throw new Error("Critical: No translation files found, not even en.json");
}
function Up(e) {
  return (t, n) => {
    const r = t.split(".");
    let o = e;
    for (const a of r)
      if (o && typeof o == "object" && a in o)
        o = o[a];
      else
        return t;
    return typeof o != "string" ? t : n ? Object.entries(n).reduce(
      (a, [i, c]) => a.replace(new RegExp(`\\{${i}\\}`, "g"), c),
      o
    ) : o;
  };
}
function TN(e, t, n = !0) {
  const r = t.errors[e];
  if (!r) {
    const o = Js(e);
    return n && o.action ? `${o.message} ${o.action}` : o.message;
  }
  return n && r.action ? `${r.message} ${r.action}` : r.message;
}
function ar(e) {
  const [t, n] = K(null), [r, o] = K(!0), a = Ne(() => e || jp(), [e]);
  return Te(() => {
    let c = !1;
    return (async () => {
      o(!0);
      try {
        const d = await Bp(a);
        c || (n(d), o(!1));
      } catch (d) {
        console.error("[CedrosPay] Failed to load translations:", d), c || o(!1);
      }
    })(), () => {
      c = !0;
    };
  }, [a]), {
    t: Ne(() => t ? Up(t) : (c) => ({
      "ui.purchase": "Purchase",
      "ui.pay_with_card": "Pay with Card",
      "ui.pay_with_crypto": "Pay with USDC",
      "ui.pay_with_usdc": "Pay with USDC",
      "ui.card": "Card",
      "ui.usdc_solana": "USDC (Solana)",
      "ui.crypto": "Crypto",
      "ui.processing": "Processing...",
      "ui.loading": "Loading...",
      "ui.connect_wallet": "Connect Wallet",
      "ui.connecting": "Connecting..."
    })[c] || c, [t]),
    locale: a,
    isLoading: r,
    translations: t
  };
}
function RN(e, t = !0) {
  const { translations: n } = ar();
  if (!n) {
    const o = Js(e);
    return t && o.action ? `${o.message} ${o.action}` : o.message;
  }
  const r = n.errors[e];
  if (!r) {
    const o = Js(e);
    return t && o.action ? `${o.message} ${o.action}` : o.message;
  }
  return t && r.action ? `${r.message} ${r.action}` : r.message;
}
function yl({
  resource: e,
  items: t,
  successUrl: n,
  cancelUrl: r,
  metadata: o,
  customerEmail: a,
  couponCode: i,
  label: c,
  disabled: l = !1,
  onAttempt: d,
  onSuccess: f,
  onError: u,
  className: h = ""
}) {
  const { status: g, error: b, transactionId: v, processPayment: y, processCartCheckout: w } = Na(), k = bn(), { isCartMode: _, effectiveResource: x } = jo(e, t), { t: S, translations: I } = ar(), R = c || S("ui.pay_with_card"), E = k.unstyled ? h : `${k.className} cedros-theme__stripe-button ${h}`.trim(), P = b && typeof b != "string" ? b?.code ?? null : null, T = b ? typeof b == "string" ? b : ((C) => {
    if (!C || !I) return "";
    const N = I.errors[C];
    return N ? N.action ? `${N.message} ${N.action}` : N.message : "";
  })(P) : null, D = ae(async () => {
    Se().debug("[StripeButton] executePayment with couponCode:", i);
    const C = _ && t ? Fo(t) : void 0;
    if (Ur("stripe", x, C), d && d("stripe"), !_ && !x) {
      const H = "Invalid payment configuration: missing resource or items";
      Se().error("[StripeButton]", H), sn("stripe", H, x, C), u && u(H);
      return;
    }
    let N;
    Vr("stripe", x, C), _ && t ? (Se().debug("[StripeButton] Processing cart checkout with coupon:", i), N = await w(
      t,
      n,
      r,
      o,
      a,
      i
    )) : x && (Se().debug("[StripeButton] Processing single payment with coupon:", i), N = await y(
      x,
      n,
      r,
      o,
      a,
      i
    )), N && N.success && N.transactionId ? (Wr("stripe", N.transactionId, x, C), f && f(N.transactionId)) : N && !N.success && N.error && (sn("stripe", N.error, x, C), u && u(N.error));
  }, [i, _, x, t, n, r, o, a, w, y, d, f, u]), j = Ne(() => _ && t ? `stripe-cart-${t.map((C) => C.resource).join("-")}` : `stripe-${x || "unknown"}`, [_, t, x]), z = Ne(
    () => Br(j, D),
    [j, D]
  ), W = g === "loading", $ = l || W;
  return /* @__PURE__ */ p("div", { className: E, style: k.unstyled ? {} : k.style, children: [
    /* @__PURE__ */ s(
      "button",
      {
        onClick: z,
        disabled: $,
        className: k.unstyled ? h : "cedros-theme__button cedros-theme__stripe",
        type: "button",
        children: W ? S("ui.processing") : R
      }
    ),
    T && /* @__PURE__ */ s("div", { className: k.unstyled ? "" : "cedros-theme__error", children: T }),
    v && /* @__PURE__ */ s("div", { className: k.unstyled ? "" : "cedros-theme__success", children: S("ui.payment_successful") })
  ] });
}
function Vp() {
  const { creditsManager: e } = sr(), [t, n] = K({
    status: "idle",
    error: null,
    transactionId: null,
    requirement: null,
    holdId: null
  }), r = Jt(!1), o = ae(
    async (d, f) => {
      n((u) => ({
        ...u,
        status: "loading",
        error: null
      }));
      try {
        const u = await e.requestQuote(d, f);
        return n((h) => ({
          ...h,
          status: "idle",
          requirement: u
        })), u;
      } catch (u) {
        const h = u instanceof Error ? u.message : "Failed to fetch credits quote";
        return n((g) => ({
          ...g,
          status: "error",
          error: h
        })), null;
      }
    },
    [e]
  ), a = ae(
    async (d, f) => {
      n((u) => ({
        ...u,
        status: "loading",
        error: null
      }));
      try {
        const u = ea(d), h = await e.requestCartQuote(u, f);
        return n((g) => ({
          ...g,
          status: "idle"
        })), h;
      } catch (u) {
        const h = u instanceof Error ? u.message : "Failed to fetch cart credits quote";
        return n((g) => ({
          ...g,
          status: "error",
          error: h
        })), null;
      }
    },
    [e]
  ), i = ae(
    async (d, f, u, h) => {
      if (r.current)
        return { success: !1, error: "Payment already in progress" };
      r.current = !0, n({
        status: "loading",
        error: null,
        transactionId: null,
        requirement: null,
        holdId: null
      });
      try {
        const g = await e.processPayment(d, f, u, h);
        return n({
          status: g.success ? "success" : "error",
          error: g.success ? null : g.error || "Credits payment failed",
          transactionId: g.success && g.transactionId || null,
          requirement: null,
          holdId: null
        }), g;
      } catch (g) {
        const b = g instanceof Error ? g.message : "Credits payment failed";
        return n({
          status: "error",
          error: b,
          transactionId: null,
          requirement: null,
          holdId: null
        }), { success: !1, error: b };
      } finally {
        r.current = !1;
      }
    },
    [e]
  ), c = ae(
    async (d, f, u, h) => {
      if (r.current)
        return { success: !1, error: "Payment already in progress" };
      r.current = !0, n({
        status: "loading",
        error: null,
        transactionId: null,
        requirement: null,
        holdId: null
      });
      let g = null;
      try {
        const b = ea(d), v = await e.requestCartQuote(b, u);
        if (!v)
          return n({
            status: "error",
            error: "Credits payment not available for this cart",
            transactionId: null,
            requirement: null,
            holdId: null
          }), { success: !1, error: "Credits payment not available" };
        g = (await e.createCartHold({
          cartId: v.cartId,
          authToken: f
        })).holdId, n((k) => ({
          ...k,
          holdId: g
        }));
        const w = await e.authorizeCartPayment({
          cartId: v.cartId,
          holdId: g,
          authToken: f,
          metadata: h
        });
        if (!w.success && g)
          try {
            await e.releaseHold(g, f);
          } catch (k) {
            Se().warn("[useCreditsPayment] Hold release failed, will expire server-side", {
              holdId: g,
              error: k instanceof Error ? k.message : String(k)
            });
          }
        return n({
          status: w.success ? "success" : "error",
          error: w.success ? null : w.error || "Cart credits payment failed",
          transactionId: w.success && w.transactionId || null,
          requirement: null,
          holdId: null
        }), {
          success: w.success,
          transactionId: w.transactionId,
          error: w.error
        };
      } catch (b) {
        const v = b instanceof Error ? b.message : "Cart credits payment failed";
        if (g)
          try {
            await e.releaseHold(g, f);
          } catch (y) {
            Se().warn("[useCreditsPayment] Hold release failed, will expire server-side", {
              holdId: g,
              error: y instanceof Error ? y.message : String(y)
            });
          }
        return n({
          status: "error",
          error: v,
          transactionId: null,
          requirement: null,
          holdId: null
        }), { success: !1, error: v };
      } finally {
        r.current = !1;
      }
    },
    [e]
  ), l = ae(() => {
    n({
      status: "idle",
      error: null,
      transactionId: null,
      requirement: null,
      holdId: null
    }), r.current = !1;
  }, []);
  return {
    ...t,
    fetchQuote: o,
    fetchCartQuote: a,
    processPayment: i,
    processCartPayment: c,
    reset: l
  };
}
function vl({
  resource: e,
  items: t,
  authToken: n,
  metadata: r,
  couponCode: o,
  label: a,
  disabled: i = !1,
  onAttempt: c,
  onSuccess: l,
  onError: d,
  className: f = ""
}) {
  const { status: u, error: h, transactionId: g, processPayment: b, processCartPayment: v } = Vp(), y = bn(), { isCartMode: w, effectiveResource: k } = jo(e, t), { t: _, translations: x } = ar(), S = a || _("ui.pay_with_credits") || "Pay with Credits", I = y.unstyled ? f : `${y.className} cedros-theme__credits-button ${f}`.trim(), R = h && typeof h != "string" ? h?.code ?? null : null, P = h ? typeof h == "string" ? h : ((W) => {
    if (!W || !x) return "";
    const $ = x.errors[W];
    return $ ? $.action ? `${$.message} ${$.action}` : $.message : "";
  })(R) : null, O = ae(async () => {
    Se().debug("[CreditsButton] executePayment");
    const W = w && t ? Fo(t) : void 0;
    if (Ur("credits", k, W), c && c("credits"), !n) {
      const C = "Authentication required: please log in to pay with credits";
      Se().error("[CreditsButton]", C), sn("credits", C, k, W), d && d(C);
      return;
    }
    if (!w && !k) {
      const C = "Invalid payment configuration: missing resource";
      Se().error("[CreditsButton]", C), sn("credits", C, k, W), d && d(C);
      return;
    }
    let $;
    Vr("credits", k, W), w && t ? (Se().debug("[CreditsButton] Processing cart checkout"), $ = await v(t, n, o, r)) : k && (Se().debug("[CreditsButton] Processing single payment"), $ = await b(k, n, o, r)), $ && $.success && $.transactionId ? (Wr("credits", $.transactionId, k, W), l && l($.transactionId)) : $ && !$.success && $.error && (sn("credits", $.error, k, W), d && d($.error));
  }, [
    n,
    w,
    k,
    t,
    o,
    r,
    b,
    v,
    c,
    l,
    d
  ]), T = Ne(() => w && t ? `credits-cart-${t.map((W) => W.resource).join("-")}` : `credits-${k || "unknown"}`, [w, t, k]), D = Ne(
    () => Br(T, O),
    [T, O]
  ), j = u === "loading", z = i || j;
  return /* @__PURE__ */ p("div", { className: I, style: y.unstyled ? {} : y.style, children: [
    /* @__PURE__ */ s(
      "button",
      {
        onClick: D,
        disabled: z,
        className: y.unstyled ? f : "cedros-theme__button cedros-theme__credits",
        type: "button",
        children: j ? _("ui.processing") : S
      }
    ),
    P && /* @__PURE__ */ s("div", { className: y.unstyled ? "" : "cedros-theme__error", children: P }),
    g && /* @__PURE__ */ s("div", { className: y.unstyled ? "" : "cedros-theme__success", children: _("ui.payment_successful") })
  ] });
}
const Wp = L.lazy(
  () => import("./CryptoButton-Dhxnk9d7.mjs").then((e) => e.a).then((e) => ({ default: e.CryptoButton }))
), Hp = ({
  isOpen: e,
  onClose: t,
  resource: n,
  items: r,
  cardLabel: o = "Card",
  cryptoLabel: a = "USDC (Solana)",
  creditsLabel: i = "Pay with Credits",
  showCard: c = !0,
  showCrypto: l = !0,
  showCredits: d = !1,
  onPaymentAttempt: f,
  onPaymentSuccess: u,
  onPaymentError: h,
  onStripeSuccess: g,
  onCryptoSuccess: b,
  onCreditsSuccess: v,
  onStripeError: y,
  onCryptoError: w,
  onCreditsError: k,
  customerEmail: _,
  successUrl: x,
  cancelUrl: S,
  metadata: I,
  couponCode: R,
  authToken: E,
  testPageUrl: P,
  hideMessages: O = !1
}) => {
  const { tokens: T } = bn();
  return Te(() => {
    const D = (j) => {
      j.key === "Escape" && e && t();
    };
    return window.addEventListener("keydown", D), () => window.removeEventListener("keydown", D);
  }, [e, t]), Te(() => {
    if (e) {
      const D = window.scrollY;
      return document.body.style.position = "fixed", document.body.style.top = `-${D}px`, document.body.style.width = "100%", document.body.style.overflowY = "scroll", () => {
        const j = document.body.style.top ? Math.abs(parseInt(document.body.style.top.replace("px", ""), 10)) : 0;
        document.body.style.position = "", document.body.style.top = "", document.body.style.width = "", document.body.style.overflowY = "", window.scrollTo(0, j);
      };
    }
  }, [e]), e ? /* @__PURE__ */ s(
    "div",
    {
      className: "cedros-modal-overlay",
      style: {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: T.modalOverlay,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "1rem"
      },
      onClick: t,
      children: /* @__PURE__ */ p(
        "div",
        {
          className: "cedros-modal-content",
          style: {
            backgroundColor: T.modalBackground,
            borderRadius: "12px",
            padding: "2rem",
            maxWidth: "400px",
            width: "100%",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            border: `1px solid ${T.modalBorder}`
          },
          onClick: (D) => D.stopPropagation(),
          children: [
            /* @__PURE__ */ p(
              "div",
              {
                style: {
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1.5rem"
                },
                children: [
                  /* @__PURE__ */ s(
                    "h3",
                    {
                      style: {
                        margin: 0,
                        fontSize: "1.25rem",
                        fontWeight: 600,
                        color: T.surfaceText
                      },
                      children: "Choose Payment Method"
                    }
                  ),
                  /* @__PURE__ */ s(
                    "button",
                    {
                      type: "button",
                      onClick: t,
                      style: Mp(T.surfaceText),
                      "aria-label": "Close modal",
                      children: "×"
                    }
                  )
                ]
              }
            ),
            /* @__PURE__ */ p("div", { style: { display: "flex", flexDirection: "column", gap: "1rem" }, children: [
              c && /* @__PURE__ */ s(
                yl,
                {
                  resource: n,
                  items: r,
                  label: o,
                  onAttempt: f,
                  onSuccess: g || u,
                  onError: y || h,
                  customerEmail: _,
                  successUrl: x,
                  cancelUrl: S,
                  metadata: I,
                  couponCode: R
                }
              ),
              l && /* @__PURE__ */ s(L.Suspense, { fallback: null, children: /* @__PURE__ */ s(
                Wp,
                {
                  resource: n,
                  items: r,
                  label: a,
                  onAttempt: f,
                  onSuccess: b || u,
                  onError: w || h,
                  testPageUrl: P,
                  hideMessages: O,
                  metadata: I,
                  couponCode: R
                }
              ) }),
              d && /* @__PURE__ */ s(
                vl,
                {
                  resource: n,
                  items: r,
                  label: i,
                  authToken: E,
                  onAttempt: f ? () => f("credits") : void 0,
                  onSuccess: v || u,
                  onError: k || h,
                  metadata: I,
                  couponCode: R
                }
              )
            ] })
          ]
        }
      )
    }
  ) : null;
}, Zp = ({
  resource: e,
  items: t,
  label: n,
  cardLabel: r,
  cryptoLabel: o,
  creditsLabel: a,
  showCard: i = !0,
  showCrypto: c = !0,
  showCredits: l = !1,
  onPaymentAttempt: d,
  onPaymentSuccess: f,
  onPaymentError: u,
  onStripeSuccess: h,
  onCryptoSuccess: g,
  onCreditsSuccess: b,
  onStripeError: v,
  onCryptoError: y,
  onCreditsError: w,
  customerEmail: k,
  successUrl: _,
  cancelUrl: x,
  metadata: S,
  couponCode: I,
  authToken: R,
  autoDetectWallets: E = !0,
  testPageUrl: P,
  hideMessages: O = !1,
  renderModal: T
}) => {
  const D = bn(), [j, z] = K(!1), { status: W, processPayment: $, processCartCheckout: C } = Na(), { isCartMode: N, effectiveResource: H } = jo(e, t), { t: G } = ar(), J = n || G("ui.purchase"), fe = r || G("ui.card"), Z = o || G("ui.usdc_solana"), X = a || G("ui.pay_with_credits") || "Pay with Credits", Q = ae(async () => {
    if (E && i) {
      const { detectSolanaWallets: V } = await import("./walletDetection-JZR3UCOa.mjs");
      if (!V()) {
        const ie = N ? void 0 : H, ue = N && t ? Fo(t) : void 0;
        Ur("stripe", ie, ue), d && d("stripe"), Vr("stripe", ie, ue);
        let pe;
        N && t ? pe = await C(
          t,
          _,
          x,
          S,
          k,
          I
        ) : H && (pe = await $(
          H,
          _,
          x,
          S,
          k,
          I
        )), pe && pe.success && pe.transactionId ? (Wr("stripe", pe.transactionId, ie, ue), h ? h(pe.transactionId) : f && f(pe.transactionId)) : pe && !pe.success && pe.error && (sn("stripe", pe.error, ie, ue), v ? v(pe.error) : u && u(pe.error));
        return;
      }
    }
    z(!0);
  }, [E, i, N, t, H, C, $, _, x, S, k, I, f, u, h, v, d]), ge = Ne(() => N && t ? `purchase-cart-${t.map((V) => V.resource).join("-")}` : `purchase-${H || "unknown"}`, [N, t, H]), F = Ne(
    () => Br(ge, Q),
    [ge, Q]
  ), Y = W === "loading", he = {
    isOpen: j,
    onClose: () => z(!1),
    resource: N ? void 0 : H,
    items: N ? t : void 0,
    cardLabel: fe,
    cryptoLabel: Z,
    creditsLabel: X,
    showCard: i,
    showCrypto: c,
    showCredits: l,
    onPaymentAttempt: d,
    onPaymentSuccess: (V) => {
      z(!1), f?.(V);
    },
    onPaymentError: (V) => {
      z(!1), u?.(V);
    },
    onStripeSuccess: (V) => {
      z(!1), h?.(V);
    },
    onCryptoSuccess: (V) => {
      z(!1), g?.(V);
    },
    onCreditsSuccess: (V) => {
      z(!1), b?.(V);
    },
    onStripeError: (V) => {
      z(!1), v?.(V);
    },
    onCryptoError: (V) => {
      z(!1), y?.(V);
    },
    onCreditsError: (V) => {
      z(!1), w?.(V);
    },
    customerEmail: k,
    successUrl: _,
    cancelUrl: x,
    metadata: S,
    couponCode: I,
    authToken: R,
    testPageUrl: P,
    hideMessages: O
  };
  return /* @__PURE__ */ p("div", { className: D.unstyled ? "" : D.className, style: D.unstyled ? {} : D.style, children: [
    /* @__PURE__ */ s(
      "button",
      {
        onClick: F,
        disabled: Y,
        className: D.unstyled ? "" : "cedros-theme__button cedros-theme__stripe",
        style: {
          width: "100%",
          cursor: Y ? "not-allowed" : "pointer",
          opacity: Y ? 0.6 : 1
        },
        type: "button",
        children: Y ? G("ui.processing") : J
      }
    ),
    T ? T(he) : /* @__PURE__ */ s(Hp, { ...he })
  ] });
}, qp = {
  "mainnet-beta": "https://api.mainnet-beta.solana.com",
  devnet: "https://api.devnet.solana.com",
  testnet: "https://api.testnet.solana.com"
};
function Gp() {
  const [e, t] = L.useState(null);
  return L.useEffect(() => {
    let n = !1;
    return import("@solana/wallet-adapter-react").then((r) => {
      n || t(r);
    }), () => {
      n = !0;
    };
  }, []), e;
}
function Yp({
  endpoint: e,
  wallets: t,
  children: n
}) {
  const r = Gp();
  if (!r) return /* @__PURE__ */ s(Ct, { children: n });
  const { ConnectionProvider: o, WalletProvider: a } = r;
  return /* @__PURE__ */ s(o, { endpoint: e, children: /* @__PURE__ */ s(a, { wallets: t, autoConnect: !1, children: n }) });
}
const Qp = L.lazy(
  () => import("./CryptoButton-Dhxnk9d7.mjs").then((e) => e.a).then((e) => ({ default: e.CryptoButton }))
);
function ON(e) {
  const { resource: t, items: n, checkout: r = {}, display: o = {}, callbacks: a = {}, advanced: i = {} } = e, { config: c, walletPool: l } = sr(), d = bn(), { isCartMode: f } = jo(t, n), u = o.showCrypto ?? !0, h = L.useMemo(() => ({
    marginTop: "0.5rem",
    fontSize: "0.875rem",
    color: d.tokens.surfaceText,
    opacity: 0.7,
    textAlign: "center"
  }), [d.tokens.surfaceText]), g = L.useMemo(
    () => u ? i.wallets && i.wallets.length > 0 ? i.wallets : l.getAdapters() : [],
    [i.wallets, l, u]
  ), b = L.useMemo(
    () => n ? Fo(n) : 0,
    [n]
  ), { onPaymentSuccess: v, onPaymentError: y, onPaymentAttempt: w } = a, k = L.useCallback(
    (C) => v?.({ transactionId: C, method: "stripe" }),
    [v]
  ), _ = L.useCallback(
    (C) => v?.({ transactionId: C, method: "crypto" }),
    [v]
  ), x = L.useCallback(
    (C) => y?.({ message: C, method: "stripe" }),
    [y]
  ), S = L.useCallback(
    (C) => y?.({ message: C, method: "crypto" }),
    [y]
  ), I = L.useCallback(
    (C) => v?.({ transactionId: C, method: "credits" }),
    [v]
  ), R = L.useCallback(
    (C) => y?.({ message: C, method: "credits" }),
    [y]
  ), E = L.useCallback(
    () => w?.("credits"),
    [w]
  ), P = u ? c.solanaEndpoint ?? qp[c.solanaCluster] : "";
  if (!t && (!n || n.length === 0))
    return Se().error('CedrosPay: Must provide either "resource" or "items" prop'), /* @__PURE__ */ s("div", { className: o.className, style: { color: d.tokens.errorText }, children: "Configuration error: No resource or items provided" });
  const O = o.showCard ?? !0, T = o.showCredits ?? !1, D = o.showPurchaseButton ?? !1, j = o.layout ?? "vertical", z = o.hideMessages ?? !1, W = i.autoDetectWallets ?? !0, $ = /* @__PURE__ */ s("div", { className: d.unstyled ? o.className : `cedros-theme__pay ${o.className || ""}`, children: /* @__PURE__ */ p("div", { className: d.unstyled ? "" : `cedros-theme__pay-content cedros-theme__pay-content--${j}`, children: [
    D ? /* @__PURE__ */ s(
      Zp,
      {
        resource: f ? void 0 : t || n?.[0]?.resource,
        items: f ? n : void 0,
        label: o.purchaseLabel,
        cardLabel: o.cardLabel,
        cryptoLabel: o.cryptoLabel,
        showCard: O,
        showCrypto: u,
        onPaymentAttempt: a.onPaymentAttempt,
        onPaymentSuccess: k,
        onPaymentError: x,
        onStripeSuccess: k,
        onCryptoSuccess: _,
        onStripeError: x,
        onCryptoError: S,
        customerEmail: r.customerEmail,
        successUrl: r.successUrl,
        cancelUrl: r.cancelUrl,
        metadata: r.metadata,
        couponCode: r.couponCode,
        autoDetectWallets: W,
        testPageUrl: i.testPageUrl,
        hideMessages: z,
        renderModal: o.renderModal
      }
    ) : /* @__PURE__ */ p(Ct, { children: [
      O && /* @__PURE__ */ s(
        yl,
        {
          resource: f ? void 0 : t || n?.[0]?.resource,
          items: f ? n : void 0,
          customerEmail: r.customerEmail,
          successUrl: r.successUrl,
          cancelUrl: r.cancelUrl,
          metadata: r.metadata,
          couponCode: r.couponCode,
          label: o.cardLabel,
          onAttempt: a.onPaymentAttempt,
          onSuccess: k,
          onError: x
        }
      ),
      u && /* @__PURE__ */ s(L.Suspense, { fallback: null, children: /* @__PURE__ */ s(
        Qp,
        {
          resource: f ? void 0 : t || n?.[0]?.resource,
          items: f ? n : void 0,
          metadata: r.metadata,
          couponCode: r.couponCode,
          label: o.cryptoLabel,
          onAttempt: a.onPaymentAttempt,
          onSuccess: _,
          onError: S,
          testPageUrl: i.testPageUrl,
          hideMessages: z
        }
      ) }),
      T && /* @__PURE__ */ s(
        vl,
        {
          resource: f ? void 0 : t || n?.[0]?.resource,
          items: f ? n : void 0,
          authToken: r.authToken,
          metadata: r.metadata,
          couponCode: r.couponCode,
          label: o.creditsLabel,
          onAttempt: E,
          onSuccess: I,
          onError: R
        }
      )
    ] }),
    f && n && n.length > 1 && !z && /* @__PURE__ */ p("div", { style: h, children: [
      "Checking out ",
      b,
      " items"
    ] })
  ] }) });
  return /* @__PURE__ */ s("div", { className: d.unstyled ? o.className : d.className, style: d.unstyled ? {} : d.style, children: /* @__PURE__ */ s(Yp, { endpoint: P || "https://api.devnet.solana.com", wallets: g, children: $ }) });
}
const ee = {
  products: /* @__PURE__ */ p("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ s("path", { d: "M20 7.5v9l-4 2.25M4 7.5v9l4 2.25" }),
    /* @__PURE__ */ s("path", { d: "m20 7.5-8-4.5-8 4.5" }),
    /* @__PURE__ */ s("path", { d: "m12 12 8-4.5M12 12v9.5M12 12 4 7.5" })
  ] }),
  transactions: /* @__PURE__ */ s("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ s("path", { d: "M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" }) }),
  coupons: /* @__PURE__ */ p("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ s("path", { d: "M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" }),
    /* @__PURE__ */ s("path", { d: "M13 5v2M13 17v2M13 11v2" })
  ] }),
  refunds: /* @__PURE__ */ p("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ s("path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" }),
    /* @__PURE__ */ s("path", { d: "M3 3v5h5" }),
    /* @__PURE__ */ s("path", { d: "M12 7v5l4 2" })
  ] }),
  settings: /* @__PURE__ */ p("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ s("path", { d: "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" }),
    /* @__PURE__ */ s("circle", { cx: "12", cy: "12", r: "3" })
  ] }),
  wallet: /* @__PURE__ */ p("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ s("path", { d: "M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" }),
    /* @__PURE__ */ s("path", { d: "M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" })
  ] }),
  chevronRight: /* @__PURE__ */ s("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ s("path", { d: "m9 18 6-6-6-6" }) }),
  loading: /* @__PURE__ */ s("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "cedros-admin__spinner", children: /* @__PURE__ */ s("path", { d: "M21 12a9 9 0 1 1-6.219-8.56" }) }),
  refresh: /* @__PURE__ */ p("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ s("path", { d: "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" }),
    /* @__PURE__ */ s("path", { d: "M21 3v5h-5" }),
    /* @__PURE__ */ s("path", { d: "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" }),
    /* @__PURE__ */ s("path", { d: "M8 16H3v5" })
  ] }),
  check: /* @__PURE__ */ s("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ s("path", { d: "M20 6 9 17l-5-5" }) }),
  subscriptions: /* @__PURE__ */ p("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ s("path", { d: "M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" }),
    /* @__PURE__ */ s("circle", { cx: "12", cy: "12", r: "3" }),
    /* @__PURE__ */ s("path", { d: "M12 2v2M12 20v2M2 12H4M20 12h2" })
  ] }),
  trash: /* @__PURE__ */ s("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ s("path", { d: "M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" }) }),
  plus: /* @__PURE__ */ s("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ s("path", { d: "M12 5v14M5 12h14" }) }),
  chevronDown: /* @__PURE__ */ s("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ s("path", { d: "m6 9 6 6 6-6" }) }),
  chevronUp: /* @__PURE__ */ s("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ s("path", { d: "m18 15-6-6-6 6" }) }),
  storefront: /* @__PURE__ */ p("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ s("path", { d: "M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" }),
    /* @__PURE__ */ s("path", { d: "m3 9 2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9" }),
    /* @__PURE__ */ s("path", { d: "M12 3v6" })
  ] }),
  arrowUp: /* @__PURE__ */ p("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ s("path", { d: "m5 12 7-7 7 7" }),
    /* @__PURE__ */ s("path", { d: "M12 19V5" })
  ] }),
  arrowDown: /* @__PURE__ */ p("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ s("path", { d: "m5 12 7 7 7-7" }),
    /* @__PURE__ */ s("path", { d: "M12 5v14" })
  ] }),
  delete: /* @__PURE__ */ p("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ s("path", { d: "M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" }),
    /* @__PURE__ */ s("path", { d: "M10 11v6M14 11v6" })
  ] }),
  close: /* @__PURE__ */ s("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ s("path", { d: "M18 6 6 18M6 6l12 12" }) }),
  edit: /* @__PURE__ */ p("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ s("path", { d: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" }),
    /* @__PURE__ */ s("path", { d: "M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" })
  ] }),
  faq: /* @__PURE__ */ p("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ s("circle", { cx: "12", cy: "12", r: "10" }),
    /* @__PURE__ */ s("path", { d: "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" }),
    /* @__PURE__ */ s("path", { d: "M12 17h.01" })
  ] }),
  chat: /* @__PURE__ */ s("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ s("path", { d: "m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z" }) }),
  globe: /* @__PURE__ */ p("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ s("circle", { cx: "12", cy: "12", r: "10" }),
    /* @__PURE__ */ s("path", { d: "M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" }),
    /* @__PURE__ */ s("path", { d: "M2 12h20" })
  ] }),
  ai: /* @__PURE__ */ p("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ s("path", { d: "M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4Z" }),
    /* @__PURE__ */ s("path", { d: "M10 10v.5" }),
    /* @__PURE__ */ s("path", { d: "M14 10v.5" }),
    /* @__PURE__ */ s("path", { d: "M12 14v2" }),
    /* @__PURE__ */ s("path", { d: "M8 18h8" }),
    /* @__PURE__ */ s("path", { d: "M6 18a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2" }),
    /* @__PURE__ */ s("path", { d: "M6 12v6" }),
    /* @__PURE__ */ s("path", { d: "M18 12v6" })
  ] }),
  notifications: /* @__PURE__ */ p("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ s("path", { d: "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" }),
    /* @__PURE__ */ s("path", { d: "M10.3 21a1.94 1.94 0 0 0 3.4 0" })
  ] }),
  eye: /* @__PURE__ */ p("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ s("path", { d: "M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" }),
    /* @__PURE__ */ s("circle", { cx: "12", cy: "12", r: "3" })
  ] }),
  eyeOff: /* @__PURE__ */ p("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ s("path", { d: "M9.88 9.88a3 3 0 1 0 4.24 4.24" }),
    /* @__PURE__ */ s("path", { d: "M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" }),
    /* @__PURE__ */ s("path", { d: "M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" }),
    /* @__PURE__ */ s("line", { x1: "2", x2: "22", y1: "2", y2: "22" })
  ] }),
  creditCard: /* @__PURE__ */ p("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ s("rect", { width: "20", height: "14", x: "2", y: "5", rx: "2" }),
    /* @__PURE__ */ s("line", { x1: "2", x2: "22", y1: "10", y2: "10" })
  ] }),
  mail: /* @__PURE__ */ p("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ s("rect", { width: "20", height: "16", x: "2", y: "4", rx: "2" }),
    /* @__PURE__ */ s("path", { d: "m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" })
  ] }),
  server: /* @__PURE__ */ p("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ s("rect", { width: "20", height: "8", x: "2", y: "2", rx: "2", ry: "2" }),
    /* @__PURE__ */ s("rect", { width: "20", height: "8", x: "2", y: "14", rx: "2", ry: "2" }),
    /* @__PURE__ */ s("line", { x1: "6", x2: "6.01", y1: "6", y2: "6" }),
    /* @__PURE__ */ s("line", { x1: "6", x2: "6.01", y1: "18", y2: "18" })
  ] }),
  calendarRepeat: /* @__PURE__ */ p("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ s("rect", { width: "18", height: "18", x: "3", y: "4", rx: "2", ry: "2" }),
    /* @__PURE__ */ s("line", { x1: "16", x2: "16", y1: "2", y2: "6" }),
    /* @__PURE__ */ s("line", { x1: "8", x2: "8", y1: "2", y2: "6" }),
    /* @__PURE__ */ s("line", { x1: "3", x2: "21", y1: "10", y2: "10" }),
    /* @__PURE__ */ s("path", { d: "M11 14h1.5a1.5 1.5 0 0 1 0 3H11v2" }),
    /* @__PURE__ */ s("path", { d: "M16 14v3a1 1 0 0 0 1 1h1" })
  ] }),
  brain: /* @__PURE__ */ p("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ s("path", { d: "M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" }),
    /* @__PURE__ */ s("path", { d: "M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" }),
    /* @__PURE__ */ s("path", { d: "M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" }),
    /* @__PURE__ */ s("path", { d: "M17.599 6.5a3 3 0 0 0 .399-1.375" }),
    /* @__PURE__ */ s("path", { d: "M6.003 5.125A3 3 0 0 0 6.401 6.5" }),
    /* @__PURE__ */ s("path", { d: "M3.477 10.896a4 4 0 0 1 .585-.396" }),
    /* @__PURE__ */ s("path", { d: "M19.938 10.5a4 4 0 0 1 .585.396" }),
    /* @__PURE__ */ s("path", { d: "M6 18a4 4 0 0 1-1.967-.516" }),
    /* @__PURE__ */ s("path", { d: "M19.967 17.484A4 4 0 0 1 18 18" })
  ] })
};
function Bo({ message: e, onRetry: t }) {
  return e ? /* @__PURE__ */ p("div", { className: "cedros-admin__error-banner", children: [
    /* @__PURE__ */ s("span", { children: e }),
    t && /* @__PURE__ */ p(
      "button",
      {
        type: "button",
        className: "cedros-admin__error-banner-retry",
        onClick: t,
        children: [
          ee.refresh,
          " Retry"
        ]
      }
    )
  ] }) : null;
}
function Uo({ stats: e, isLoading: t = !1, onRefresh: n }) {
  return /* @__PURE__ */ p("div", { className: "cedros-admin__stats-bar", children: [
    /* @__PURE__ */ s("div", { className: "cedros-admin__stats-bar-grid", children: e.map((r, o) => /* @__PURE__ */ p("div", { className: "cedros-admin__stats-bar-item", children: [
      /* @__PURE__ */ s("span", { className: "cedros-admin__stats-bar-label", children: r.label }),
      /* @__PURE__ */ s("span", { className: `cedros-admin__stats-bar-value ${r.variant ? `cedros-admin__stats-bar-value--${r.variant}` : ""}`, children: t ? /* @__PURE__ */ s("span", { className: "cedros-admin__skeleton cedros-admin__skeleton--value" }) : r.value }),
      r.description && /* @__PURE__ */ s("span", { className: "cedros-admin__stats-bar-desc", children: r.description })
    ] }, o)) }),
    n && /* @__PURE__ */ s(
      "button",
      {
        type: "button",
        className: "cedros-admin__stats-bar-refresh",
        onClick: n,
        disabled: t,
        title: "Refresh stats",
        children: t ? ee.loading : ee.refresh
      }
    )
  ] });
}
function Kp({
  serverUrl: e,
  productId: t,
  apiKey: n,
  authManager: r
}) {
  const [o, a] = K(null), [i, c] = K(!1), [l, d] = K(!1), [f, u] = K(null), h = ae(async () => {
    if (t) {
      c(!0), u(null);
      try {
        let v;
        if (r?.isAuthenticated())
          v = await r.fetchWithAuth(
            `/admin/products/${t}/variations`
          );
        else {
          const y = { "Content-Type": "application/json" };
          n && (y["X-API-Key"] = n);
          const w = await fetch(`${e}/admin/products/${t}/variations`, {
            headers: y
          });
          if (!w.ok)
            throw new Error(`Failed to fetch variations: ${w.status}`);
          v = await w.json();
        }
        v.variationConfig || (v.variationConfig = { variationTypes: [] }), v.variants || (v.variants = []), a(v);
      } catch (v) {
        const y = v instanceof Error ? v.message : "Failed to fetch variations";
        u(y), a({
          productId: t,
          variationConfig: { variationTypes: [] },
          variants: []
        });
      } finally {
        c(!1);
      }
    }
  }, [e, t, n, r]), g = ae(
    async (v) => {
      if (!t) return null;
      d(!0), u(null);
      try {
        let y;
        if (r?.isAuthenticated())
          y = await r.fetchWithAuth(
            `/admin/products/${t}/variations`,
            {
              method: "PUT",
              body: JSON.stringify(v)
            }
          );
        else {
          const w = { "Content-Type": "application/json" };
          n && (w["X-API-Key"] = n);
          const k = await fetch(`${e}/admin/products/${t}/variations`, {
            method: "PUT",
            headers: w,
            body: JSON.stringify(v)
          });
          if (!k.ok)
            throw new Error(`Failed to save variations: ${k.status}`);
          y = await k.json();
        }
        return a({
          productId: t,
          variationConfig: y.variationConfig,
          variants: y.variants
        }), { variantsCreated: y.variantsCreated };
      } catch (y) {
        const w = y instanceof Error ? y.message : "Failed to save variations";
        return u(w), null;
      } finally {
        d(!1);
      }
    },
    [e, t, n, r]
  ), b = ae(
    async (v) => {
      if (!t || v.length === 0) return !1;
      d(!0), u(null);
      try {
        if (r?.isAuthenticated())
          await r.fetchWithAuth(
            `/admin/products/${t}/variants/inventory`,
            {
              method: "PUT",
              body: JSON.stringify({ updates: v })
            }
          );
        else {
          const y = { "Content-Type": "application/json" };
          n && (y["X-API-Key"] = n);
          const w = await fetch(`${e}/admin/products/${t}/variants/inventory`, {
            method: "PUT",
            headers: y,
            body: JSON.stringify({ updates: v })
          });
          if (!w.ok)
            throw new Error(`Failed to update inventory: ${w.status}`);
        }
        if (o) {
          const y = new Map(v.map((w) => [w.variantId, w]));
          a({
            ...o,
            variants: o.variants.map((w) => {
              const k = y.get(w.id);
              return k ? {
                ...w,
                inventoryQuantity: k.inventoryQuantity,
                inventoryStatus: k.inventoryStatus ?? w.inventoryStatus
              } : w;
            })
          });
        }
        return !0;
      } catch (y) {
        const w = y instanceof Error ? y.message : "Failed to update inventory";
        return u(w), !1;
      } finally {
        d(!1);
      }
    },
    [e, t, n, r, o]
  );
  return {
    data: o,
    isLoading: i,
    error: f,
    fetch: h,
    save: g,
    bulkUpdateInventory: b,
    isSaving: l
  };
}
function Ui() {
  return `var_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
function Jp({
  value: e,
  onChange: t,
  maxTypes: n = 5,
  maxValuesPerType: r = 20,
  disabled: o = !1
}) {
  const [a, i] = K(null), [c, l] = K(""), [d, f] = K({}), u = e.variationTypes, h = ae(() => {
    if (!c.trim() || u.length >= n) return;
    const _ = {
      id: Ui(),
      name: c.trim(),
      displayOrder: u.length,
      values: []
    };
    t({
      variationTypes: [...u, _]
    }), l(""), i(_.id);
  }, [c, u, n, t]), g = ae(
    (_) => {
      t({
        variationTypes: u.filter((x) => x.id !== _).map((x, S) => ({ ...x, displayOrder: S }))
      }), a === _ && i(null);
    },
    [u, t, a]
  ), b = ae(
    (_, x) => {
      t({
        variationTypes: u.map(
          (S) => S.id === _ ? { ...S, name: x } : S
        )
      });
    },
    [u, t]
  ), v = ae(
    (_, x) => {
      const S = u.findIndex((E) => E.id === _);
      if (S === -1 || x === "up" && S === 0 || x === "down" && S === u.length - 1) return;
      const I = [...u], R = x === "up" ? S - 1 : S + 1;
      [I[S], I[R]] = [I[R], I[S]], t({
        variationTypes: I.map((E, P) => ({ ...E, displayOrder: P }))
      });
    },
    [u, t]
  ), y = ae(
    (_) => {
      const x = (d[_] || "").trim();
      if (!x) return;
      const S = u.find((R) => R.id === _);
      if (!S || S.values.length >= r) return;
      const I = {
        id: Ui(),
        label: x
      };
      t({
        variationTypes: u.map(
          (R) => R.id === _ ? { ...R, values: [...R.values, I] } : R
        )
      }), f((R) => ({ ...R, [_]: "" }));
    },
    [u, d, r, t]
  ), w = ae(
    (_, x) => {
      t({
        variationTypes: u.map(
          (S) => S.id === _ ? { ...S, values: S.values.filter((I) => I.id !== x) } : S
        )
      });
    },
    [u, t]
  ), k = ae(
    (_, x, S) => {
      t({
        variationTypes: u.map(
          (I) => I.id === _ ? {
            ...I,
            values: I.values.map(
              (R) => R.id === x ? { ...R, label: S } : R
            )
          } : I
        )
      });
    },
    [u, t]
  );
  return /* @__PURE__ */ p("div", { className: "cedros-admin__variation-editor", children: [
    /* @__PURE__ */ p("div", { className: "cedros-admin__variation-editor-header", children: [
      /* @__PURE__ */ s("h4", { className: "cedros-admin__field-label", style: { marginBottom: 0 }, children: "Variation Types" }),
      /* @__PURE__ */ p("span", { style: { fontSize: 12, opacity: 0.7 }, children: [
        u.length,
        "/",
        n,
        " types"
      ] })
    ] }),
    u.length === 0 ? /* @__PURE__ */ s("div", { className: "cedros-admin__variation-empty", children: 'No variation types defined. Add types like "Size" or "Color" to create product variants.' }) : /* @__PURE__ */ s("div", { className: "cedros-admin__variation-type-list", children: u.map((_, x) => /* @__PURE__ */ p("div", { className: "cedros-admin__variation-type-item", children: [
      /* @__PURE__ */ p("div", { className: "cedros-admin__variation-type-header", children: [
        /* @__PURE__ */ p("div", { className: "cedros-admin__variation-type-controls", children: [
          /* @__PURE__ */ s(
            "button",
            {
              type: "button",
              className: "cedros-admin__button cedros-admin__button--ghost cedros-admin__button--icon",
              onClick: () => v(_.id, "up"),
              disabled: o || x === 0,
              title: "Move up",
              children: ee.arrowUp
            }
          ),
          /* @__PURE__ */ s(
            "button",
            {
              type: "button",
              className: "cedros-admin__button cedros-admin__button--ghost cedros-admin__button--icon",
              onClick: () => v(_.id, "down"),
              disabled: o || x === u.length - 1,
              title: "Move down",
              children: ee.arrowDown
            }
          )
        ] }),
        /* @__PURE__ */ s(
          "input",
          {
            type: "text",
            className: "cedros-admin__input cedros-admin__variation-type-name",
            value: _.name,
            onChange: (S) => b(_.id, S.target.value),
            disabled: o,
            placeholder: "Type name"
          }
        ),
        /* @__PURE__ */ p("span", { className: "cedros-admin__variation-value-count", children: [
          _.values.length,
          " values"
        ] }),
        /* @__PURE__ */ s(
          "button",
          {
            type: "button",
            className: "cedros-admin__button cedros-admin__button--ghost",
            onClick: () => i(
              a === _.id ? null : _.id
            ),
            children: a === _.id ? "Collapse" : "Edit values"
          }
        ),
        /* @__PURE__ */ s(
          "button",
          {
            type: "button",
            className: "cedros-admin__button cedros-admin__button--ghost cedros-admin__button--danger",
            onClick: () => g(_.id),
            disabled: o,
            title: "Remove type",
            children: ee.delete
          }
        )
      ] }),
      a === _.id && /* @__PURE__ */ p("div", { className: "cedros-admin__variation-values", children: [
        /* @__PURE__ */ p("div", { className: "cedros-admin__variation-values-header", children: [
          /* @__PURE__ */ p("span", { style: { fontSize: 12, fontWeight: 600 }, children: [
            'Values for "',
            _.name,
            '"'
          ] }),
          /* @__PURE__ */ p("span", { style: { fontSize: 11, opacity: 0.7 }, children: [
            _.values.length,
            "/",
            r
          ] })
        ] }),
        _.values.length === 0 ? /* @__PURE__ */ s("div", { className: "cedros-admin__variation-empty", style: { padding: "8px 0" }, children: 'No values yet. Add values like "Small", "Medium", "Large".' }) : /* @__PURE__ */ s("div", { className: "cedros-admin__variation-value-list", children: _.values.map((S) => /* @__PURE__ */ p("div", { className: "cedros-admin__variation-value-item", children: [
          /* @__PURE__ */ s(
            "input",
            {
              type: "text",
              className: "cedros-admin__input cedros-admin__input--sm",
              value: S.label,
              onChange: (I) => k(_.id, S.id, I.target.value),
              disabled: o
            }
          ),
          /* @__PURE__ */ s(
            "button",
            {
              type: "button",
              className: "cedros-admin__button cedros-admin__button--ghost cedros-admin__button--icon cedros-admin__button--danger",
              onClick: () => w(_.id, S.id),
              disabled: o,
              title: "Remove value",
              children: ee.close
            }
          )
        ] }, S.id)) }),
        _.values.length < r && /* @__PURE__ */ p("div", { className: "cedros-admin__variation-add-value", children: [
          /* @__PURE__ */ s(
            "input",
            {
              type: "text",
              className: "cedros-admin__input cedros-admin__input--sm",
              value: d[_.id] || "",
              onChange: (S) => f((I) => ({
                ...I,
                [_.id]: S.target.value
              })),
              placeholder: "Add value...",
              disabled: o,
              onKeyDown: (S) => {
                S.key === "Enter" && (S.preventDefault(), y(_.id));
              }
            }
          ),
          /* @__PURE__ */ s(
            "button",
            {
              type: "button",
              className: "cedros-admin__button cedros-admin__button--secondary cedros-admin__button--sm",
              onClick: () => y(_.id),
              disabled: o || !d[_.id]?.trim(),
              children: "Add"
            }
          )
        ] })
      ] })
    ] }, _.id)) }),
    u.length < n && /* @__PURE__ */ p("div", { className: "cedros-admin__variation-add-type", children: [
      /* @__PURE__ */ s(
        "input",
        {
          type: "text",
          className: "cedros-admin__input",
          value: c,
          onChange: (_) => l(_.target.value),
          placeholder: "New variation type (e.g., Size, Color)",
          disabled: o,
          onKeyDown: (_) => {
            _.key === "Enter" && (_.preventDefault(), h());
          }
        }
      ),
      /* @__PURE__ */ s(
        "button",
        {
          type: "button",
          className: "cedros-admin__button cedros-admin__button--secondary",
          onClick: h,
          disabled: o || !c.trim(),
          children: "Add Type"
        }
      )
    ] })
  ] });
}
function bl({ value: e, onChange: t, options: n, placeholder: r = "Filter", disabled: o }) {
  const [a, i] = K(!1), c = Jt(null), d = n.find((f) => f.value === e)?.label || r;
  return Te(() => {
    const f = (u) => {
      c.current && !c.current.contains(u.target) && i(!1);
    };
    if (a)
      return document.addEventListener("mousedown", f), () => document.removeEventListener("mousedown", f);
  }, [a]), Te(() => {
    const f = (u) => {
      u.key === "Escape" && i(!1);
    };
    if (a)
      return document.addEventListener("keydown", f), () => document.removeEventListener("keydown", f);
  }, [a]), /* @__PURE__ */ p("div", { className: "cedros-admin__dropdown", ref: c, children: [
    /* @__PURE__ */ p(
      "button",
      {
        type: "button",
        className: "cedros-admin__dropdown-trigger",
        onClick: () => !o && i(!a),
        "aria-expanded": a,
        "aria-haspopup": "listbox",
        disabled: o,
        children: [
          /* @__PURE__ */ s("span", { children: d }),
          /* @__PURE__ */ s("span", { className: `cedros-admin__dropdown-chevron ${a ? "cedros-admin__dropdown-chevron--open" : ""}`, children: ee.chevronDown })
        ]
      }
    ),
    a && /* @__PURE__ */ s("div", { className: "cedros-admin__dropdown-menu", role: "listbox", children: n.map((f) => /* @__PURE__ */ p(
      "button",
      {
        type: "button",
        className: `cedros-admin__dropdown-item ${f.value === e ? "cedros-admin__dropdown-item--selected" : ""}`,
        onClick: () => {
          f.disabled || (t(f.value), i(!1));
        },
        role: "option",
        "aria-selected": f.value === e,
        disabled: f.disabled,
        children: [
          f.label,
          f.value === e && /* @__PURE__ */ s("span", { className: "cedros-admin__dropdown-check", children: ee.check })
        ]
      },
      f.value
    )) })
  ] });
}
function Wt({ value: e, onChange: t, options: n, label: r, description: o, disabled: a, className: i, style: c }) {
  const [l, d] = K(!1), f = Jt(null), h = n.find((g) => g.value === e)?.label || "Select...";
  return Te(() => {
    const g = (b) => {
      f.current && !f.current.contains(b.target) && d(!1);
    };
    if (l)
      return document.addEventListener("mousedown", g), () => document.removeEventListener("mousedown", g);
  }, [l]), Te(() => {
    const g = (b) => {
      b.key === "Escape" && d(!1);
    };
    if (l)
      return document.addEventListener("keydown", g), () => document.removeEventListener("keydown", g);
  }, [l]), /* @__PURE__ */ p("div", { className: `cedros-admin__field ${i || ""}`, style: c, children: [
    /* @__PURE__ */ s("label", { className: "cedros-admin__field-label", children: r }),
    /* @__PURE__ */ p("div", { className: "cedros-admin__dropdown cedros-admin__dropdown--form", ref: f, children: [
      /* @__PURE__ */ p(
        "button",
        {
          type: "button",
          className: "cedros-admin__dropdown-trigger cedros-admin__dropdown-trigger--form",
          onClick: () => !a && d(!l),
          "aria-expanded": l,
          "aria-haspopup": "listbox",
          disabled: a,
          children: [
            /* @__PURE__ */ s("span", { children: h }),
            /* @__PURE__ */ s("span", { className: `cedros-admin__dropdown-chevron ${l ? "cedros-admin__dropdown-chevron--open" : ""}`, children: ee.chevronDown })
          ]
        }
      ),
      l && /* @__PURE__ */ s("div", { className: "cedros-admin__dropdown-menu cedros-admin__dropdown-menu--form", role: "listbox", children: n.map((g) => /* @__PURE__ */ p(
        "button",
        {
          type: "button",
          className: `cedros-admin__dropdown-item ${g.value === e ? "cedros-admin__dropdown-item--selected" : ""}`,
          onClick: () => {
            g.disabled || (t(g.value), d(!1));
          },
          role: "option",
          "aria-selected": g.value === e,
          disabled: g.disabled,
          children: [
            g.label,
            g.value === e && /* @__PURE__ */ s("span", { className: "cedros-admin__dropdown-check", children: ee.check })
          ]
        },
        g.value
      )) })
    ] }),
    o && /* @__PURE__ */ s("p", { className: "cedros-admin__field-description", children: o })
  ] });
}
function Vi() {
  return `variant_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
function Xp(e) {
  if (e.length === 0) return [];
  const t = [...e].sort((r, o) => r.displayOrder - o.displayOrder), n = (r, o) => {
    if (r >= t.length) {
      const c = o.valueIds.sort().join("|"), l = Object.values(o.options).join(" / ");
      return [
        {
          key: c,
          title: l,
          optionValueIds: [...o.valueIds],
          options: { ...o.options }
        }
      ];
    }
    const a = t[r], i = [];
    for (const c of a.values)
      i.push(
        ...n(r + 1, {
          valueIds: [...o.valueIds, c.id],
          options: { ...o.options, [a.name]: c.label }
        })
      );
    return i;
  };
  return n(0, { valueIds: [], options: {} });
}
function em(e) {
  return e.optionValueIds?.length ? [...e.optionValueIds].sort().join("|") : Object.entries(e.options).sort(([t], [n]) => t.localeCompare(n)).map(([t, n]) => `${t}:${n}`).join("|");
}
function tm({
  variationConfig: e,
  variants: t,
  onChange: n,
  defaultPrice: r = 0,
  currencySymbol: o = "$",
  maxVariants: a = 100,
  disabled: i = !1
}) {
  const c = Ne(
    () => Xp(e.variationTypes),
    [e.variationTypes]
  ), l = Ne(() => {
    const v = /* @__PURE__ */ new Map();
    for (const y of t)
      v.set(em(y), y);
    return v;
  }, [t]), { existingRows: d, possibleRows: f } = Ne(() => {
    const v = [], y = [];
    for (const w of c) {
      const k = l.get(w.key);
      k ? v.push({ combo: w, variant: k }) : y.push(w);
    }
    return { existingRows: v, possibleRows: y };
  }, [c, l]), u = ae(
    (v, y) => {
      n(
        t.map((w) => w.id === v ? { ...w, ...y } : w)
      );
    },
    [t, n]
  ), h = ae(
    (v) => {
      n(t.filter((y) => y.id !== v));
    },
    [t, n]
  ), g = ae(
    (v) => {
      if (t.length >= a) return;
      const y = {
        id: Vi(),
        title: v.title,
        options: v.options,
        optionValueIds: v.optionValueIds,
        price: r,
        inventoryQuantity: 0,
        inventoryStatus: "in_stock",
        autoGenerated: !1
      };
      n([...t, y]);
    },
    [t, n, a, r]
  ), b = ae(() => {
    const v = a - t.length, w = f.slice(0, v).map((k) => ({
      id: Vi(),
      title: k.title,
      options: k.options,
      optionValueIds: k.optionValueIds,
      price: r,
      inventoryQuantity: 0,
      inventoryStatus: "in_stock",
      autoGenerated: !0
    }));
    n([...t, ...w]);
  }, [t, n, f, a, r]);
  return e.variationTypes.length === 0 ? /* @__PURE__ */ s("div", { className: "cedros-admin__variant-grid-empty", children: "Add variation types above to create product variants." }) : c.length === 0 ? /* @__PURE__ */ s("div", { className: "cedros-admin__variant-grid-empty", children: "Add values to your variation types to create product variants." }) : /* @__PURE__ */ p("div", { className: "cedros-admin__variant-grid", children: [
    /* @__PURE__ */ p("div", { className: "cedros-admin__variant-grid-header", children: [
      /* @__PURE__ */ s("h4", { className: "cedros-admin__field-label", style: { marginBottom: 0 }, children: "Variants" }),
      /* @__PURE__ */ p("span", { style: { fontSize: 12, opacity: 0.7 }, children: [
        t.length,
        "/",
        a,
        " variants (",
        c.length,
        " ",
        "possible)"
      ] })
    ] }),
    f.length > 0 && t.length < a && /* @__PURE__ */ p("div", { className: "cedros-admin__variant-grid-actions", children: [
      /* @__PURE__ */ p(
        "button",
        {
          type: "button",
          className: "cedros-admin__button cedros-admin__button--secondary",
          onClick: b,
          disabled: i,
          children: [
            "Generate All (",
            Math.min(f.length, a - t.length),
            ")"
          ]
        }
      ),
      /* @__PURE__ */ s("span", { style: { fontSize: 11, opacity: 0.7 }, children: "Creates variants with default price and 0 inventory" })
    ] }),
    /* @__PURE__ */ s("div", { className: "cedros-admin__table-container", children: /* @__PURE__ */ p("table", { className: "cedros-admin__table cedros-admin__variant-table", children: [
      /* @__PURE__ */ s("thead", { children: /* @__PURE__ */ p("tr", { children: [
        /* @__PURE__ */ s("th", { children: "Variant" }),
        /* @__PURE__ */ s("th", { style: { width: 100 }, children: "Price" }),
        /* @__PURE__ */ s("th", { style: { width: 80 }, children: "Qty" }),
        /* @__PURE__ */ s("th", { style: { width: 100 }, children: "SKU" }),
        /* @__PURE__ */ s("th", { style: { width: 100 }, children: "Status" }),
        /* @__PURE__ */ s("th", { style: { width: 80 }, children: "Actions" })
      ] }) }),
      /* @__PURE__ */ p("tbody", { children: [
        d.map(({ combo: v, variant: y }) => /* @__PURE__ */ p("tr", { children: [
          /* @__PURE__ */ s("td", { children: /* @__PURE__ */ p("div", { style: { display: "flex", flexDirection: "column" }, children: [
            /* @__PURE__ */ s("span", { style: { fontWeight: 600 }, children: v.title }),
            /* @__PURE__ */ s("span", { style: { fontSize: 11, opacity: 0.6 }, children: Object.entries(v.options).map(([w, k]) => `${w}: ${k}`).join(", ") })
          ] }) }),
          /* @__PURE__ */ s("td", { children: /* @__PURE__ */ p("div", { style: { display: "flex", alignItems: "center", gap: 4 }, children: [
            /* @__PURE__ */ s("span", { children: o }),
            /* @__PURE__ */ s(
              "input",
              {
                type: "number",
                className: "cedros-admin__input cedros-admin__input--sm",
                value: y.price ?? "",
                onChange: (w) => u(y.id, {
                  price: w.target.value === "" ? void 0 : parseFloat(w.target.value) || 0
                }),
                disabled: i,
                min: "0",
                step: "0.01",
                style: { width: 70 }
              }
            )
          ] }) }),
          /* @__PURE__ */ s("td", { children: /* @__PURE__ */ s(
            "input",
            {
              type: "number",
              className: "cedros-admin__input cedros-admin__input--sm",
              value: y.inventoryQuantity ?? "",
              onChange: (w) => u(y.id, {
                inventoryQuantity: w.target.value === "" ? void 0 : parseInt(w.target.value) || 0
              }),
              disabled: i,
              min: "0",
              style: { width: 60 }
            }
          ) }),
          /* @__PURE__ */ s("td", { children: /* @__PURE__ */ s(
            "input",
            {
              type: "text",
              className: "cedros-admin__input cedros-admin__input--sm",
              value: y.sku ?? "",
              onChange: (w) => u(y.id, {
                sku: w.target.value || void 0
              }),
              disabled: i,
              placeholder: "SKU",
              style: { width: 80 }
            }
          ) }),
          /* @__PURE__ */ s("td", { children: /* @__PURE__ */ s(
            bl,
            {
              value: y.inventoryStatus ?? "in_stock",
              onChange: (w) => u(y.id, {
                inventoryStatus: w
              }),
              options: [
                { value: "in_stock", label: "In stock" },
                { value: "low", label: "Low" },
                { value: "out_of_stock", label: "Out of stock" },
                { value: "backorder", label: "Backorder" }
              ],
              disabled: i
            }
          ) }),
          /* @__PURE__ */ s("td", { children: /* @__PURE__ */ s(
            "button",
            {
              type: "button",
              className: "cedros-admin__button cedros-admin__button--ghost cedros-admin__button--icon cedros-admin__button--danger",
              onClick: () => h(y.id),
              disabled: i,
              title: "Remove variant",
              children: ee.trash
            }
          ) })
        ] }, y.id)),
        f.length > 0 && t.length < a && /* @__PURE__ */ p(Ct, { children: [
          /* @__PURE__ */ s("tr", { className: "cedros-admin__variant-separator", children: /* @__PURE__ */ s("td", { colSpan: 6, children: /* @__PURE__ */ p("span", { style: { fontSize: 11, opacity: 0.6 }, children: [
            "Uncreated combinations (",
            f.length,
            ")"
          ] }) }) }),
          f.slice(0, 10).map((v) => /* @__PURE__ */ p("tr", { className: "cedros-admin__variant-possible", children: [
            /* @__PURE__ */ s("td", { children: /* @__PURE__ */ s("span", { style: { opacity: 0.6 }, children: v.title }) }),
            /* @__PURE__ */ s("td", { colSpan: 4, style: { opacity: 0.5 }, children: "Not created" }),
            /* @__PURE__ */ s("td", { children: /* @__PURE__ */ s(
              "button",
              {
                type: "button",
                className: "cedros-admin__button cedros-admin__button--ghost cedros-admin__button--icon",
                onClick: () => g(v),
                disabled: i,
                title: "Create variant",
                children: ee.plus
              }
            ) })
          ] }, v.key)),
          f.length > 10 && /* @__PURE__ */ s("tr", { className: "cedros-admin__variant-more", children: /* @__PURE__ */ p("td", { colSpan: 6, style: { textAlign: "center", opacity: 0.6 }, children: [
            "+",
            f.length - 10,
            " more combinations"
          ] }) })
        ] })
      ] })
    ] }) })
  ] });
}
function nm({
  serverUrl: e,
  productId: t,
  productTitle: n,
  defaultPrice: r = 0,
  currencySymbol: o = "$",
  apiKey: a,
  authManager: i,
  onClose: c
}) {
  const {
    data: l,
    isLoading: d,
    error: f,
    fetch: u,
    save: h,
    isSaving: g
  } = Kp({ serverUrl: e, productId: t, apiKey: a, authManager: i }), [b, v] = K({ variationTypes: [] }), [y, w] = K([]), [k, _] = K(!1), [x, S] = K(!1);
  Te(() => {
    u();
  }, [u]), Te(() => {
    l && (v(l.variationConfig), w(l.variants), _(!1));
  }, [l]);
  const I = ae((P) => {
    v(P), _(!0), S(!1);
  }, []), R = ae((P) => {
    w(P), _(!0), S(!1);
  }, []), E = ae(async () => {
    const P = new Set((l?.variants ?? []).map((z) => z.id)), O = y.filter((z) => !P.has(z.id)), T = y.filter((z) => P.has(z.id)), D = (l?.variants ?? []).filter((z) => !y.some((W) => W.id === z.id)).map((z) => z.id);
    await h({
      variationConfig: b,
      createVariants: O.map((z) => ({
        optionValueIds: z.optionValueIds ?? [],
        inventoryQuantity: z.inventoryQuantity,
        sku: z.sku,
        price: z.price
      })),
      updateVariants: T.map((z) => ({
        id: z.id,
        inventoryQuantity: z.inventoryQuantity,
        sku: z.sku,
        price: z.price,
        inventoryStatus: z.inventoryStatus
      })),
      deleteVariantIds: D.length > 0 ? D : void 0
    }) && (_(!1), S(!0), setTimeout(() => S(!1), 3e3));
  }, [b, y, l?.variants, h]);
  return d ? /* @__PURE__ */ p("div", { className: "cedros-admin__variations-editor", children: [
    /* @__PURE__ */ p("div", { className: "cedros-admin__variations-editor-header", children: [
      /* @__PURE__ */ s("h3", { className: "cedros-admin__section-title", children: n ? `Variations: ${n}` : "Product Variations" }),
      c && /* @__PURE__ */ s(
        "button",
        {
          type: "button",
          className: "cedros-admin__button cedros-admin__button--ghost",
          onClick: c,
          children: ee.close
        }
      )
    ] }),
    /* @__PURE__ */ p("div", { className: "cedros-admin__loading", children: [
      ee.loading,
      " Loading variations..."
    ] })
  ] }) : /* @__PURE__ */ p("div", { className: "cedros-admin__variations-editor", children: [
    /* @__PURE__ */ p("div", { className: "cedros-admin__variations-editor-header", children: [
      /* @__PURE__ */ s("h3", { className: "cedros-admin__section-title", children: n ? `Variations: ${n}` : "Product Variations" }),
      /* @__PURE__ */ p("div", { className: "cedros-admin__variations-editor-actions", children: [
        x && /* @__PURE__ */ p("span", { className: "cedros-admin__success-text", children: [
          ee.check,
          " Saved"
        ] }),
        k && /* @__PURE__ */ s("span", { className: "cedros-admin__unsaved-text", children: "Unsaved changes" }),
        /* @__PURE__ */ s(
          "button",
          {
            type: "button",
            className: "cedros-admin__button cedros-admin__button--primary",
            onClick: E,
            disabled: g || !k,
            children: g ? "Saving..." : "Save Changes"
          }
        ),
        c && /* @__PURE__ */ s(
          "button",
          {
            type: "button",
            className: "cedros-admin__button cedros-admin__button--ghost",
            onClick: c,
            children: ee.close
          }
        )
      ] })
    ] }),
    f && /* @__PURE__ */ s("div", { className: "cedros-admin__error-banner", children: f }),
    /* @__PURE__ */ p("div", { className: "cedros-admin__variations-editor-content", children: [
      /* @__PURE__ */ s("div", { className: "cedros-admin__variations-editor-section", children: /* @__PURE__ */ s(
        Jp,
        {
          value: b,
          onChange: I,
          disabled: g
        }
      ) }),
      b.variationTypes.length > 0 && /* @__PURE__ */ s("div", { className: "cedros-admin__variations-editor-section", children: /* @__PURE__ */ s(
        tm,
        {
          variationConfig: b,
          variants: y,
          onChange: R,
          defaultPrice: r,
          currencySymbol: o,
          disabled: g
        }
      ) })
    ] })
  ] });
}
function rm({ serverUrl: e, apiKey: t, pageSize: n = 20, authManager: r }) {
  const [o, a] = K([]), [i, c] = K(!0), [l, d] = K(!1), [f, u] = K(!1), [h, g] = K(null), [b, v] = K(null), [y, w] = K(null), [k, _] = K(null), [x, S] = K({
    id: "",
    title: "",
    slug: "",
    imageUrl: "",
    description: "",
    productType: "one_time",
    priceUsd: "",
    fiatCurrency: "usd",
    cryptoToken: "USDC",
    inventoryStatus: "in_stock",
    compareAtUsd: "",
    tagsCsv: "",
    categoryIdsCsv: "",
    checkoutEmail: "required",
    checkoutName: "optional",
    checkoutPhone: "none",
    checkoutShippingAddress: !1,
    checkoutBillingAddress: !1,
    fulfillmentType: "shipping",
    fulfillmentNotes: "",
    shippingCountriesCsv: "",
    inventoryQuantity: ""
  }), I = (C) => {
    const N = C.tagsCsv.split(",").map((Q) => Q.trim()).filter(Boolean), H = C.categoryIdsCsv.split(",").map((Q) => Q.trim()).filter(Boolean), G = {
      email: C.checkoutEmail,
      name: C.checkoutName,
      phone: C.checkoutPhone,
      shippingAddress: C.checkoutShippingAddress,
      billingAddress: C.checkoutBillingAddress
    }, J = C.fulfillmentType === "shipping" ? "physical" : "digital", fe = {
      title: C.title,
      slug: C.slug || C.id,
      shipping_profile: J,
      inventory_status: C.inventoryStatus,
      checkout_requirements: JSON.stringify(G),
      fulfillment_type: C.fulfillmentType
    };
    C.imageUrl && (fe.image_url = C.imageUrl);
    const Z = C.compareAtUsd ? Math.round(Number(C.compareAtUsd) * 100) : 0;
    Z && (fe.compare_at_amount_cents = String(Z)), N.length && (fe.tags = JSON.stringify(N)), H.length && (fe.category_ids = JSON.stringify(H)), C.fulfillmentNotes && (fe.fulfillment_notes = C.fulfillmentNotes);
    const X = C.shippingCountriesCsv.split(",").map((Q) => Q.trim().toUpperCase()).filter(Boolean);
    return X.length && (fe.shippingCountries = X.join(","), fe.shipping_countries = X.join(",")), fe;
  }, R = (C) => C.metadata?.title || C.description || C.id, E = (C) => C.metadata?.image_url, P = ae(async () => {
    try {
      _(null);
      let C;
      if (r?.isAuthenticated())
        C = await r.fetchWithAuth(`/admin/products?limit=${n}`);
      else {
        const N = { "Content-Type": "application/json" };
        t && (N["X-API-Key"] = t);
        const H = await fetch(`${e}/admin/products?limit=${n}`, { headers: N });
        if (!H.ok) throw new Error(`Failed to fetch products: ${H.status}`);
        C = await H.json();
      }
      a(C.products || []);
    } catch {
      a([]), _("Failed to load products");
    } finally {
      c(!1);
    }
  }, [e, t, n, r]);
  Te(() => {
    P();
  }, [P]);
  const O = async (C) => {
    if (C.preventDefault(), !(!x.id || !x.description)) {
      if (g(null), x.fulfillmentType === "shipping" && x.checkoutShippingAddress && !x.shippingCountriesCsv.split(",").map((H) => H.trim()).filter(Boolean).length) {
        g("Shipping countries are required when collecting shipping address. Example: US,CA");
        return;
      }
      u(!0);
      try {
        const { productType: N } = x, H = x.inventoryQuantity === "" ? void 0 : Number.isFinite(Number(x.inventoryQuantity)) ? Number(x.inventoryQuantity) : void 0, G = Number(x.priceUsd) || 0, J = Math.round(G * 100), fe = Math.round(G * 1e6), Z = {
          id: x.id,
          description: x.description,
          fiatAmountCents: J,
          fiatCurrency: x.fiatCurrency,
          cryptoAtomicAmount: fe,
          cryptoToken: x.cryptoToken,
          ...H !== void 0 ? { inventoryQuantity: H } : {},
          metadata: {
            ...N ? { product_type: N } : {},
            ...I(x)
          }
        };
        if (r?.isAuthenticated())
          await r.fetchWithAuth("/admin/products", {
            method: "POST",
            body: JSON.stringify(Z)
          });
        else {
          const X = { "Content-Type": "application/json" };
          t && (X["X-API-Key"] = t);
          const Q = await fetch(`${e}/admin/products`, {
            method: "POST",
            headers: X,
            body: JSON.stringify(Z)
          });
          if (!Q.ok) throw new Error(`Failed to create product: ${Q.status}`);
        }
        S({
          id: "",
          title: "",
          slug: "",
          imageUrl: "",
          description: "",
          productType: "one_time",
          priceUsd: "",
          fiatCurrency: "usd",
          cryptoToken: "USDC",
          inventoryStatus: "in_stock",
          compareAtUsd: "",
          tagsCsv: "",
          categoryIdsCsv: "",
          checkoutEmail: "required",
          checkoutName: "optional",
          checkoutPhone: "none",
          checkoutShippingAddress: !1,
          checkoutBillingAddress: !1,
          fulfillmentType: "shipping",
          fulfillmentNotes: "",
          shippingCountriesCsv: "",
          inventoryQuantity: ""
        }), d(!1), P();
      } catch (N) {
        g(N instanceof Error ? N.message : "Failed to create product");
      } finally {
        u(!1);
      }
    }
  }, T = (C) => `$${(C / 100).toFixed(2)}`, D = (C) => {
    switch (C) {
      case "subscription":
        return "Subscription";
      case "pay_per_access":
        return "Pay per access";
      case "one_time":
        return "One-time purchase";
      default:
        return "One-time purchase";
    }
  }, j = Ne(() => {
    const C = o.filter((H) => H.active).length, N = o.reduce((H, G) => {
      const J = G.variations?.length ?? 0;
      return H + (J > 0 ? J : 1);
    }, 0);
    return { activeCount: C, totalSkus: N };
  }, [o]), z = (C) => {
    w((N) => !N || N.key !== C ? { key: C, direction: "asc" } : { key: C, direction: N.direction === "asc" ? "desc" : "asc" });
  }, W = (C) => !y || y.key !== C ? /* @__PURE__ */ s("span", { className: "cedros-admin__sort-icon cedros-admin__sort-icon--idle", children: ee.chevronUp }) : /* @__PURE__ */ s("span", { className: "cedros-admin__sort-icon", children: y.direction === "asc" ? ee.chevronUp : ee.chevronDown }), $ = Ne(() => {
    if (!y) return o;
    const C = y.direction === "asc" ? 1 : -1, N = (H) => {
      switch (y.key) {
        case "product":
          return R(H);
        case "type":
          return D(H.metadata?.product_type);
        case "price":
          return H.fiatAmountCents ?? 0;
        case "status":
          return H.active ? 1 : 0;
        case "id":
        default:
          return H.id;
      }
    };
    return [...o].sort((H, G) => {
      const J = N(H), fe = N(G);
      return typeof J == "number" && typeof fe == "number" ? (J - fe) * C : String(J).localeCompare(String(fe), void 0, { sensitivity: "base" }) * C;
    });
  }, [o, y]);
  return /* @__PURE__ */ p("div", { className: "cedros-admin__page", children: [
    /* @__PURE__ */ s(Bo, { message: k, onRetry: P }),
    /* @__PURE__ */ s(
      Uo,
      {
        stats: [
          { label: "Total Products", value: o.length },
          { label: "Active", value: j.activeCount, variant: j.activeCount > 0 ? "success" : "muted" },
          { label: "Total SKUs", value: j.totalSkus }
        ],
        isLoading: i
      }
    ),
    /* @__PURE__ */ p("div", { className: "cedros-admin__section-header", children: [
      /* @__PURE__ */ s("h3", { className: "cedros-admin__section-title", children: "Paywall Products" }),
      /* @__PURE__ */ p(
        "button",
        {
          className: "cedros-admin__button cedros-admin__button--primary cedros-admin__button--action",
          onClick: () => {
            g(null), d(!l);
          },
          children: [
            l ? ee.close : ee.plus,
            l ? "Cancel" : "Add Product"
          ]
        }
      )
    ] }),
    l && /* @__PURE__ */ p("form", { onSubmit: O, className: "cedros-admin__add-form", children: [
      h && /* @__PURE__ */ s("div", { style: { marginBottom: "0.75rem", color: "#B42318", fontWeight: 600 }, children: h }),
      /* @__PURE__ */ p("div", { className: "cedros-admin__form-row", children: [
        /* @__PURE__ */ p("div", { className: "cedros-admin__field", children: [
          /* @__PURE__ */ s("label", { className: "cedros-admin__field-label", children: "Product ID" }),
          /* @__PURE__ */ s(
            "input",
            {
              type: "text",
              className: "cedros-admin__input",
              value: x.id,
              onChange: (C) => S((N) => ({ ...N, id: C.target.value })),
              placeholder: "e.g., premium-article",
              required: !0
            }
          )
        ] }),
        /* @__PURE__ */ p("div", { className: "cedros-admin__field", children: [
          /* @__PURE__ */ s("label", { className: "cedros-admin__field-label", children: "Product name" }),
          /* @__PURE__ */ s(
            "input",
            {
              type: "text",
              className: "cedros-admin__input",
              value: x.title,
              onChange: (C) => S((N) => ({ ...N, title: C.target.value })),
              placeholder: "e.g., Cedros Hoodie"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ p("div", { className: "cedros-admin__form-row", children: [
        /* @__PURE__ */ p("div", { className: "cedros-admin__field", children: [
          /* @__PURE__ */ s("label", { className: "cedros-admin__field-label", children: "Slug" }),
          /* @__PURE__ */ s(
            "input",
            {
              type: "text",
              className: "cedros-admin__input",
              value: x.slug,
              onChange: (C) => S((N) => ({ ...N, slug: C.target.value })),
              placeholder: "e.g., cedros-hoodie (defaults to ID)"
            }
          )
        ] }),
        /* @__PURE__ */ p("div", { className: "cedros-admin__field", children: [
          /* @__PURE__ */ s("label", { className: "cedros-admin__field-label", children: "Primary image URL" }),
          /* @__PURE__ */ s(
            "input",
            {
              type: "url",
              className: "cedros-admin__input",
              value: x.imageUrl,
              onChange: (C) => S((N) => ({ ...N, imageUrl: C.target.value })),
              placeholder: "https://..."
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ s("div", { className: "cedros-admin__form-row", children: /* @__PURE__ */ p("div", { className: "cedros-admin__field", children: [
        /* @__PURE__ */ s("label", { className: "cedros-admin__field-label", children: "Short description" }),
        /* @__PURE__ */ s(
          "input",
          {
            type: "text",
            className: "cedros-admin__input",
            value: x.description,
            onChange: (C) => S((N) => ({ ...N, description: C.target.value })),
            placeholder: "e.g., Midweight fleece with relaxed fit",
            required: !0
          }
        )
      ] }) }),
      /* @__PURE__ */ p("div", { className: "cedros-admin__form-row", children: [
        /* @__PURE__ */ s(
          Wt,
          {
            value: x.productType,
            onChange: (C) => S((N) => ({ ...N, productType: C })),
            options: [
              { value: "one_time", label: "One-time purchase" },
              { value: "pay_per_access", label: "Pay per access" },
              { value: "subscription", label: "Subscription" }
            ],
            label: "Product Type"
          }
        ),
        /* @__PURE__ */ s(
          Wt,
          {
            value: x.fulfillmentType,
            onChange: (C) => {
              const N = C;
              S((H) => ({
                ...H,
                fulfillmentType: N,
                checkoutShippingAddress: N === "shipping" ? H.checkoutShippingAddress : !1
              }));
            },
            options: [
              { value: "shipping", label: "Physical (shipped)" },
              { value: "digital_download", label: "Digital download" },
              { value: "service", label: "Service" }
            ],
            label: "Fulfillment"
          }
        )
      ] }),
      x.fulfillmentType === "shipping" && /* @__PURE__ */ p("div", { className: "cedros-admin__form-row", children: [
        /* @__PURE__ */ s(
          Wt,
          {
            value: x.inventoryStatus,
            onChange: (C) => S((N) => ({
              ...N,
              inventoryStatus: C
            })),
            options: [
              { value: "in_stock", label: "In stock" },
              { value: "low", label: "Low" },
              { value: "out_of_stock", label: "Out of stock" },
              { value: "backorder", label: "Backorder" }
            ],
            label: "Inventory status"
          }
        ),
        /* @__PURE__ */ p("div", { className: "cedros-admin__field", children: [
          /* @__PURE__ */ s("label", { className: "cedros-admin__field-label", children: "Inventory quantity (tracked)" }),
          /* @__PURE__ */ s(
            "input",
            {
              type: "number",
              className: "cedros-admin__input",
              value: x.inventoryQuantity,
              onChange: (C) => S((N) => ({
                ...N,
                inventoryQuantity: C.target.value === "" ? "" : parseInt(C.target.value) || 0
              })),
              placeholder: "Leave blank for untracked",
              min: "0"
            }
          )
        ] }),
        /* @__PURE__ */ p("div", { className: "cedros-admin__field", children: [
          /* @__PURE__ */ s("label", { className: "cedros-admin__field-label", children: "Compare-at price (USD)" }),
          /* @__PURE__ */ s(
            "input",
            {
              type: "number",
              className: "cedros-admin__input",
              value: x.compareAtUsd === "" ? "" : x.compareAtUsd,
              onChange: (C) => S((N) => ({ ...N, compareAtUsd: C.target.value === "" ? "" : parseFloat(C.target.value) || 0 })),
              placeholder: "e.g., 78.00",
              min: "0",
              step: "0.01"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ s("div", { className: "cedros-admin__form-row", children: /* @__PURE__ */ p("div", { className: "cedros-admin__field", children: [
        /* @__PURE__ */ s("label", { className: "cedros-admin__field-label", children: "Price (USD)" }),
        /* @__PURE__ */ s(
          "input",
          {
            type: "number",
            className: "cedros-admin__input",
            value: x.priceUsd === "" ? "" : x.priceUsd,
            onChange: (C) => S((N) => ({ ...N, priceUsd: C.target.value === "" ? "" : parseFloat(C.target.value) || 0 })),
            placeholder: "e.g., 5.00",
            min: "0",
            step: "0.01",
            required: !0
          }
        )
      ] }) }),
      /* @__PURE__ */ p("div", { className: "cedros-admin__form-row", children: [
        /* @__PURE__ */ p("div", { className: "cedros-admin__field", children: [
          /* @__PURE__ */ s("label", { className: "cedros-admin__field-label", children: "Tags (comma-separated)" }),
          /* @__PURE__ */ s(
            "input",
            {
              type: "text",
              className: "cedros-admin__input",
              value: x.tagsCsv,
              onChange: (C) => S((N) => ({ ...N, tagsCsv: C.target.value })),
              placeholder: "e.g., core, new, gift"
            }
          )
        ] }),
        /* @__PURE__ */ p("div", { className: "cedros-admin__field", children: [
          /* @__PURE__ */ s("label", { className: "cedros-admin__field-label", children: "Category IDs (comma-separated)" }),
          /* @__PURE__ */ s(
            "input",
            {
              type: "text",
              className: "cedros-admin__input",
              value: x.categoryIdsCsv,
              onChange: (C) => S((N) => ({ ...N, categoryIdsCsv: C.target.value })),
              placeholder: "e.g., cat_apparel, cat_accessories"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ p("div", { className: "cedros-admin__form-row", children: [
        /* @__PURE__ */ s(
          Wt,
          {
            value: x.checkoutEmail,
            onChange: (C) => S((N) => ({ ...N, checkoutEmail: C })),
            options: [
              { value: "none", label: "None" },
              { value: "optional", label: "Optional" },
              { value: "required", label: "Required" }
            ],
            label: "Checkout: Email"
          }
        ),
        /* @__PURE__ */ s(
          Wt,
          {
            value: x.checkoutName,
            onChange: (C) => S((N) => ({ ...N, checkoutName: C })),
            options: [
              { value: "none", label: "None" },
              { value: "optional", label: "Optional" },
              { value: "required", label: "Required" }
            ],
            label: "Checkout: Name"
          }
        ),
        /* @__PURE__ */ s(
          Wt,
          {
            value: x.checkoutPhone,
            onChange: (C) => S((N) => ({ ...N, checkoutPhone: C })),
            options: [
              { value: "none", label: "None" },
              { value: "optional", label: "Optional" },
              { value: "required", label: "Required" }
            ],
            label: "Checkout: Phone"
          }
        )
      ] }),
      /* @__PURE__ */ p("div", { className: "cedros-admin__form-row", children: [
        x.fulfillmentType === "shipping" && /* @__PURE__ */ p("div", { className: "cedros-admin__field", children: [
          /* @__PURE__ */ s("label", { className: "cedros-admin__field-label", children: "Checkout: Shipping address" }),
          /* @__PURE__ */ p("label", { style: { display: "flex", alignItems: "center", gap: "0.5rem" }, children: [
            /* @__PURE__ */ s(
              "input",
              {
                type: "checkbox",
                checked: x.checkoutShippingAddress,
                onChange: (C) => S((N) => ({ ...N, checkoutShippingAddress: C.target.checked }))
              }
            ),
            "Collect shipping address"
          ] })
        ] }),
        /* @__PURE__ */ p("div", { className: "cedros-admin__field", children: [
          /* @__PURE__ */ s("label", { className: "cedros-admin__field-label", children: "Checkout: Billing address" }),
          /* @__PURE__ */ p("label", { style: { display: "flex", alignItems: "center", gap: "0.5rem" }, children: [
            /* @__PURE__ */ s(
              "input",
              {
                type: "checkbox",
                checked: x.checkoutBillingAddress,
                onChange: (C) => S((N) => ({ ...N, checkoutBillingAddress: C.target.checked }))
              }
            ),
            "Collect billing address"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ s("div", { className: "cedros-admin__form-row", children: /* @__PURE__ */ p("div", { className: "cedros-admin__field", children: [
        /* @__PURE__ */ s("label", { className: "cedros-admin__field-label", children: "Fulfillment notes" }),
        /* @__PURE__ */ s(
          "input",
          {
            type: "text",
            className: "cedros-admin__input",
            value: x.fulfillmentNotes,
            onChange: (C) => S((N) => ({ ...N, fulfillmentNotes: C.target.value })),
            placeholder: x.fulfillmentType === "shipping" ? "e.g., Ships within 3-5 business days" : "e.g., Downloadable from your account after purchase"
          }
        )
      ] }) }),
      x.fulfillmentType === "shipping" && x.checkoutShippingAddress && /* @__PURE__ */ s("div", { className: "cedros-admin__form-row", children: /* @__PURE__ */ p("div", { className: "cedros-admin__field", children: [
        /* @__PURE__ */ s("label", { className: "cedros-admin__field-label", children: "Shipping countries" }),
        /* @__PURE__ */ s(
          "input",
          {
            type: "text",
            className: "cedros-admin__input",
            value: x.shippingCountriesCsv,
            onChange: (C) => S((N) => ({ ...N, shippingCountriesCsv: C.target.value })),
            placeholder: "e.g., US,CA"
          }
        ),
        /* @__PURE__ */ s("div", { style: { marginTop: 4, fontSize: 12, opacity: 0.75 }, children: "ISO 2-letter country codes, comma-separated. Required for shipping address collection." })
      ] }) }),
      /* @__PURE__ */ s("div", { className: "cedros-admin__form-actions", children: /* @__PURE__ */ s("button", { type: "submit", className: "cedros-admin__button cedros-admin__button--primary", disabled: f, children: f ? "Creating..." : "Create Product" }) })
    ] }),
    i ? /* @__PURE__ */ p("div", { className: "cedros-admin__loading", children: [
      ee.loading,
      " Loading products..."
    ] }) : /* @__PURE__ */ s("div", { className: "cedros-admin__table-container", children: /* @__PURE__ */ p("table", { className: "cedros-admin__table", children: [
      /* @__PURE__ */ s("thead", { children: /* @__PURE__ */ p("tr", { children: [
        /* @__PURE__ */ s("th", { "aria-sort": y?.key === "id" ? y?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ p("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => z("id"), children: [
          "ID",
          W("id")
        ] }) }),
        /* @__PURE__ */ s("th", { "aria-sort": y?.key === "product" ? y?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ p("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => z("product"), children: [
          "Product",
          W("product")
        ] }) }),
        /* @__PURE__ */ s("th", { "aria-sort": y?.key === "type" ? y?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ p("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => z("type"), children: [
          "Type",
          W("type")
        ] }) }),
        /* @__PURE__ */ s("th", { "aria-sort": y?.key === "price" ? y?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ p("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => z("price"), children: [
          "Price",
          W("price")
        ] }) }),
        /* @__PURE__ */ s("th", { "aria-sort": y?.key === "status" ? y?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ p("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => z("status"), children: [
          "Status",
          W("status")
        ] }) }),
        /* @__PURE__ */ s("th", { children: "Actions" })
      ] }) }),
      /* @__PURE__ */ s("tbody", { children: $.map((C) => /* @__PURE__ */ p("tr", { children: [
        /* @__PURE__ */ s("td", { children: /* @__PURE__ */ s("code", { children: C.id }) }),
        /* @__PURE__ */ s("td", { children: /* @__PURE__ */ p("div", { style: { display: "flex", alignItems: "center", gap: "0.5rem" }, children: [
          E(C) ? /* @__PURE__ */ s(
            "img",
            {
              src: E(C),
              alt: "",
              style: { width: 28, height: 28, borderRadius: 6, objectFit: "cover" }
            }
          ) : /* @__PURE__ */ s("div", { style: { width: 28, height: 28, borderRadius: 6, background: "rgba(0,0,0,0.06)" } }),
          /* @__PURE__ */ p("div", { style: { display: "flex", flexDirection: "column" }, children: [
            /* @__PURE__ */ s("span", { style: { fontWeight: 600 }, children: R(C) }),
            /* @__PURE__ */ s("span", { style: { opacity: 0.8 }, children: C.description })
          ] })
        ] }) }),
        /* @__PURE__ */ s("td", { children: D(C.metadata?.product_type) }),
        /* @__PURE__ */ s("td", { children: T(C.fiatAmountCents) }),
        /* @__PURE__ */ s("td", { children: /* @__PURE__ */ s("span", { className: `cedros-admin__badge ${C.active ? "cedros-admin__badge--success" : "cedros-admin__badge--muted"}`, children: C.active ? "Active" : "Inactive" }) }),
        /* @__PURE__ */ s("td", { children: /* @__PURE__ */ s("div", { style: { display: "flex", gap: "0.25rem" }, children: /* @__PURE__ */ s(
          "button",
          {
            className: "cedros-admin__button cedros-admin__button--ghost",
            onClick: () => v(C),
            children: "Variations"
          }
        ) }) })
      ] }, C.id)) })
    ] }) }),
    b && /* @__PURE__ */ s("div", { className: "cedros-admin__modal-overlay", onClick: () => v(null), children: /* @__PURE__ */ s(
      "div",
      {
        className: "cedros-admin__modal cedros-admin__modal--lg",
        onClick: (C) => C.stopPropagation(),
        children: /* @__PURE__ */ s(
          nm,
          {
            serverUrl: e,
            productId: b.id,
            productTitle: R(b),
            defaultPrice: b.fiatAmountCents / 100,
            apiKey: t,
            authManager: r,
            onClose: () => v(null)
          }
        )
      }
    ) })
  ] });
}
function om({ serverUrl: e, apiKey: t, pageSize: n = 20, authManager: r }) {
  const [o, a] = K([]), [i, c] = K(null), [l, d] = K(!0), [f, u] = K(!0), [h, g] = K(null), [b, v] = K(""), [y, w] = K(null), k = ae(async () => {
    u(!0);
    try {
      g(null);
      let E;
      if (r?.isAuthenticated())
        E = await r.fetchWithAuth("/admin/stats");
      else {
        const P = { "Content-Type": "application/json" };
        t && (P["X-API-Key"] = t);
        const O = await fetch(`${e}/admin/stats`, { headers: P });
        if (!O.ok) throw new Error(`Failed to fetch stats: ${O.status}`);
        E = await O.json();
      }
      c(E);
    } catch {
      c(null), g("Failed to load payment stats");
    } finally {
      u(!1);
    }
  }, [e, t, r]);
  Te(() => {
    k();
  }, [k]);
  const _ = ae(async () => {
    try {
      g(null);
      let E;
      const P = new URLSearchParams({ limit: n.toString() });
      b && P.set("method", b);
      const O = `/admin/transactions?${P}`;
      if (r?.isAuthenticated())
        E = await r.fetchWithAuth(O);
      else {
        const T = { "Content-Type": "application/json" };
        t && (T["X-API-Key"] = t);
        const D = await fetch(`${e}${O}`, { headers: T });
        if (!D.ok) throw new Error(`Failed to fetch transactions: ${D.status}`);
        E = await D.json();
      }
      a(E.transactions || []);
    } catch {
      a([]), g("Failed to load transactions");
    } finally {
      d(!1);
    }
  }, [e, t, n, b, r]);
  Te(() => {
    _();
  }, [_]);
  const x = (E, P = "USD") => new Intl.NumberFormat("en-US", { style: "currency", currency: P }).format(E), S = (E) => {
    w((P) => !P || P.key !== E ? { key: E, direction: "asc" } : { key: E, direction: P.direction === "asc" ? "desc" : "asc" });
  }, I = (E) => !y || y.key !== E ? /* @__PURE__ */ s("span", { className: "cedros-admin__sort-icon cedros-admin__sort-icon--idle", children: ee.chevronUp }) : /* @__PURE__ */ s("span", { className: "cedros-admin__sort-icon", children: y.direction === "asc" ? ee.chevronUp : ee.chevronDown }), R = Ne(() => {
    if (!y) return o;
    const E = y.direction === "asc" ? 1 : -1, P = (O) => {
      switch (y.key) {
        case "resource":
          return O.resourceId;
        case "method":
          return O.method;
        case "amount":
          return O.amount;
        case "status":
          return O.status;
        case "date":
          return new Date(O.paidAt).getTime();
        case "id":
        default:
          return O.id;
      }
    };
    return [...o].sort((O, T) => {
      const D = P(O), j = P(T);
      return typeof D == "number" && typeof j == "number" ? (D - j) * E : String(D).localeCompare(String(j), void 0, { sensitivity: "base" }) * E;
    });
  }, [o, y]);
  return /* @__PURE__ */ p("div", { className: "cedros-admin__page", children: [
    /* @__PURE__ */ s(Bo, { message: h, onRetry: () => {
      k(), _();
    } }),
    /* @__PURE__ */ s(
      Uo,
      {
        stats: [
          { label: "Revenue", value: x(i?.totalRevenue ?? 0) },
          { label: "Orders", value: i?.totalTransactions ?? 0 },
          { label: "Card", value: x(i?.revenueByMethod.stripe ?? 0), description: `${i?.transactionsByMethod.stripe ?? 0} orders` },
          { label: "Crypto", value: x(i?.revenueByMethod.x402 ?? 0), description: `${i?.transactionsByMethod.x402 ?? 0} orders` },
          { label: "Credits", value: x(i?.revenueByMethod.credits ?? 0), description: `${i?.transactionsByMethod.credits ?? 0} orders` }
        ],
        isLoading: f,
        onRefresh: k
      }
    ),
    /* @__PURE__ */ p("div", { className: "cedros-admin__section-header", children: [
      /* @__PURE__ */ s("h3", { className: "cedros-admin__section-title", children: "Transaction History" }),
      /* @__PURE__ */ s(
        bl,
        {
          value: b,
          onChange: v,
          options: [
            { value: "", label: "All" },
            { value: "stripe", label: "Card" },
            { value: "x402", label: "Crypto" },
            { value: "credits", label: "Credits" }
          ]
        }
      )
    ] }),
    l ? /* @__PURE__ */ p("div", { className: "cedros-admin__loading", children: [
      ee.loading,
      " Loading transactions..."
    ] }) : /* @__PURE__ */ s("div", { className: "cedros-admin__table-container", children: /* @__PURE__ */ p("table", { className: "cedros-admin__table", children: [
      /* @__PURE__ */ s("thead", { children: /* @__PURE__ */ p("tr", { children: [
        /* @__PURE__ */ s("th", { "aria-sort": y?.key === "id" ? y?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ p("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => S("id"), children: [
          "ID",
          I("id")
        ] }) }),
        /* @__PURE__ */ s("th", { "aria-sort": y?.key === "resource" ? y?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ p("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => S("resource"), children: [
          "Resource",
          I("resource")
        ] }) }),
        /* @__PURE__ */ s("th", { "aria-sort": y?.key === "method" ? y?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ p("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => S("method"), children: [
          "Method",
          I("method")
        ] }) }),
        /* @__PURE__ */ s("th", { "aria-sort": y?.key === "amount" ? y?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ p("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => S("amount"), children: [
          "Amount",
          I("amount")
        ] }) }),
        /* @__PURE__ */ s("th", { "aria-sort": y?.key === "status" ? y?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ p("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => S("status"), children: [
          "Status",
          I("status")
        ] }) }),
        /* @__PURE__ */ s("th", { "aria-sort": y?.key === "date" ? y?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ p("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => S("date"), children: [
          "Date",
          I("date")
        ] }) })
      ] }) }),
      /* @__PURE__ */ s("tbody", { children: R.map((E) => /* @__PURE__ */ p("tr", { children: [
        /* @__PURE__ */ s("td", { children: /* @__PURE__ */ s("code", { children: E.id }) }),
        /* @__PURE__ */ s("td", { children: E.resourceId }),
        /* @__PURE__ */ s("td", { children: /* @__PURE__ */ s("span", { className: `cedros-admin__badge cedros-admin__badge--${E.method}`, children: E.method }) }),
        /* @__PURE__ */ p("td", { children: [
          "$",
          E.amount.toFixed(2),
          " ",
          E.currency.toUpperCase()
        ] }),
        /* @__PURE__ */ s("td", { children: /* @__PURE__ */ s("span", { className: `cedros-admin__badge cedros-admin__badge--${E.status}`, children: E.status }) }),
        /* @__PURE__ */ s("td", { children: po(E.paidAt) })
      ] }, E.id)) })
    ] }) })
  ] });
}
function sm({ serverUrl: e, apiKey: t, pageSize: n = 20, authManager: r }) {
  const [o, a] = K([]), [i, c] = K(!0), [l, d] = K(!1), [f, u] = K(!1), [h, g] = K(null), [b, v] = K(null), [y, w] = K({
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
  }), k = ae(async () => {
    try {
      v(null);
      let P;
      const O = `/admin/coupons?limit=${n}`;
      if (r?.isAuthenticated())
        P = await r.fetchWithAuth(O);
      else {
        const T = { "Content-Type": "application/json" };
        t && (T["X-API-Key"] = t);
        const D = await fetch(`${e}${O}`, { headers: T });
        if (!D.ok) throw new Error(`Failed to fetch coupons: ${D.status}`);
        P = await D.json();
      }
      a(P.coupons || []);
    } catch (P) {
      Se().error("[CouponsSection] Failed to fetch coupons:", P, {
        serverUrl: e.slice(0, 20) + "...",
        hasApiKey: !!t
      }), a([]), v("Failed to load coupons");
    } finally {
      c(!1);
    }
  }, [e, t, n, r]);
  Te(() => {
    k();
  }, [k]);
  const _ = async (P) => {
    if (P.preventDefault(), !(!y.code || y.discountValue <= 0)) {
      u(!0);
      try {
        const O = y.minimumAmountUsd ? Math.round(Number(y.minimumAmountUsd) * 100) : void 0, T = y.productIdsCsv.split(",").map((z) => z.trim()).filter(Boolean), D = y.categoryIdsCsv.split(",").map((z) => z.trim()).filter(Boolean), j = {
          code: y.code,
          discountType: y.discountType,
          discountValue: y.discountValue,
          usageLimit: y.usageLimit,
          active: !0,
          usageCount: 0,
          // Scope and targeting
          scope: y.scope,
          ...T.length ? { productIds: T } : {},
          ...D.length ? { categoryIds: D } : {},
          // Payment and application
          ...y.paymentMethod !== "any" ? { paymentMethod: y.paymentMethod } : {},
          ...y.autoApply ? { autoApply: !0 } : {},
          ...y.appliesAt !== "both" ? { appliesAt: y.appliesAt } : {},
          ...y.startsAt ? { startsAt: y.startsAt } : {},
          ...y.expiresAt ? { expiresAt: y.expiresAt } : {},
          // Advanced
          ...O ? { minimumAmountCents: O } : {},
          ...y.usageLimitPerCustomer ? { usageLimitPerCustomer: y.usageLimitPerCustomer } : {},
          ...y.firstPurchaseOnly ? { firstPurchaseOnly: !0 } : {}
        };
        if (r?.isAuthenticated())
          await r.fetchWithAuth("/admin/coupons", {
            method: "POST",
            body: JSON.stringify(j)
          });
        else {
          const z = { "Content-Type": "application/json" };
          t && (z["X-API-Key"] = t);
          const W = await fetch(`${e}/admin/coupons`, {
            method: "POST",
            headers: z,
            body: JSON.stringify(j)
          });
          if (!W.ok) throw new Error(`Failed to create coupon: ${W.status}`);
        }
        w({
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
        }), d(!1), k();
      } catch (O) {
        Se().error("[CouponsSection] Failed to add coupon:", O, {
          serverUrl: e.slice(0, 20) + "...",
          hasApiKey: !!t
        }), v("Failed to create coupon");
      } finally {
        u(!1);
      }
    }
  }, x = o.filter((P) => P.active).length, S = o.reduce((P, O) => P + (O.usageCount ?? 0), 0), I = (P) => {
    g((O) => !O || O.key !== P ? { key: P, direction: "asc" } : { key: P, direction: O.direction === "asc" ? "desc" : "asc" });
  }, R = (P) => !h || h.key !== P ? /* @__PURE__ */ s("span", { className: "cedros-admin__sort-icon cedros-admin__sort-icon--idle", children: ee.chevronUp }) : /* @__PURE__ */ s("span", { className: "cedros-admin__sort-icon", children: h.direction === "asc" ? ee.chevronUp : ee.chevronDown }), E = Ne(() => {
    if (!h) return o;
    const P = h.direction === "asc" ? 1 : -1, O = (T) => {
      switch (h.key) {
        case "discount":
          return T.discountValue ?? 0;
        case "usage":
          return T.usageCount ?? 0;
        case "status":
          return T.active ? 1 : 0;
        case "code":
        default:
          return T.code;
      }
    };
    return [...o].sort((T, D) => {
      const j = O(T), z = O(D);
      return typeof j == "number" && typeof z == "number" ? (j - z) * P : String(j).localeCompare(String(z), void 0, { sensitivity: "base" }) * P;
    });
  }, [o, h]);
  return /* @__PURE__ */ p("div", { className: "cedros-admin__page", children: [
    /* @__PURE__ */ s(Bo, { message: b, onRetry: k }),
    /* @__PURE__ */ s(
      Uo,
      {
        stats: [
          { label: "Total Coupons", value: o.length },
          { label: "Active", value: x, variant: x > 0 ? "success" : "muted" },
          { label: "Redemptions", value: S }
        ],
        isLoading: i
      }
    ),
    /* @__PURE__ */ p("div", { className: "cedros-admin__section-header", children: [
      /* @__PURE__ */ s("h3", { className: "cedros-admin__section-title", children: "Discount Coupons" }),
      /* @__PURE__ */ p(
        "button",
        {
          className: "cedros-admin__button cedros-admin__button--primary cedros-admin__button--action",
          onClick: () => d(!l),
          children: [
            l ? ee.close : ee.plus,
            l ? "Cancel" : "Add Coupon"
          ]
        }
      )
    ] }),
    l && /* @__PURE__ */ p("form", { onSubmit: _, className: "cedros-admin__add-form", children: [
      /* @__PURE__ */ p("div", { className: "cedros-admin__form-row", children: [
        /* @__PURE__ */ p("div", { className: "cedros-admin__field", children: [
          /* @__PURE__ */ s("label", { className: "cedros-admin__field-label", children: "Coupon Code" }),
          /* @__PURE__ */ s(
            "input",
            {
              type: "text",
              className: "cedros-admin__input",
              value: y.code,
              onChange: (P) => w((O) => ({ ...O, code: P.target.value.toUpperCase() })),
              placeholder: "e.g., SAVE20",
              required: !0
            }
          )
        ] }),
        /* @__PURE__ */ s(
          Wt,
          {
            value: y.discountType,
            onChange: (P) => w((O) => ({ ...O, discountType: P })),
            options: [
              { value: "percentage", label: "Percentage (%)" },
              { value: "fixed", label: "Fixed Amount ($)" }
            ],
            label: "Discount Type"
          }
        )
      ] }),
      /* @__PURE__ */ p("div", { className: "cedros-admin__form-row", children: [
        /* @__PURE__ */ p("div", { className: "cedros-admin__field", children: [
          /* @__PURE__ */ p("label", { className: "cedros-admin__field-label", children: [
            "Discount Value ",
            y.discountType === "percentage" ? "(%)" : "($)"
          ] }),
          /* @__PURE__ */ s(
            "input",
            {
              type: "number",
              className: "cedros-admin__input",
              value: y.discountValue || "",
              onChange: (P) => w((O) => ({ ...O, discountValue: parseFloat(P.target.value) || 0 })),
              placeholder: y.discountType === "percentage" ? "e.g., 20" : "e.g., 10.00",
              min: "0",
              step: y.discountType === "percentage" ? "1" : "0.01",
              required: !0
            }
          )
        ] }),
        /* @__PURE__ */ p("div", { className: "cedros-admin__field", children: [
          /* @__PURE__ */ s("label", { className: "cedros-admin__field-label", children: "Usage Limit (optional)" }),
          /* @__PURE__ */ s(
            "input",
            {
              type: "number",
              className: "cedros-admin__input",
              value: y.usageLimit || "",
              onChange: (P) => w((O) => ({ ...O, usageLimit: P.target.value ? parseInt(P.target.value) : void 0 })),
              placeholder: "Leave empty for unlimited",
              min: "1"
            }
          )
        ] }),
        /* @__PURE__ */ p("div", { className: "cedros-admin__field", children: [
          /* @__PURE__ */ s("label", { className: "cedros-admin__field-label", children: "Expiration Date (optional)" }),
          /* @__PURE__ */ s(
            "input",
            {
              type: "date",
              className: "cedros-admin__input",
              value: y.expiresAt,
              onChange: (P) => w((O) => ({ ...O, expiresAt: P.target.value }))
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ p("div", { className: "cedros-admin__form-row", children: [
        /* @__PURE__ */ s(
          Wt,
          {
            value: y.scope,
            onChange: (P) => w((O) => ({ ...O, scope: P })),
            options: [
              { value: "all_products", label: "All Products" },
              { value: "specific_products", label: "Specific Products" },
              { value: "specific_categories", label: "Specific Categories" }
            ],
            label: "Scope"
          }
        ),
        /* @__PURE__ */ s(
          Wt,
          {
            value: y.paymentMethod,
            onChange: (P) => w((O) => ({ ...O, paymentMethod: P })),
            options: [
              { value: "any", label: "Any Payment Method" },
              { value: "stripe", label: "Stripe (Card) Only" },
              { value: "x402", label: "Crypto (x402) Only" },
              { value: "credits", label: "Credits Only" }
            ],
            label: "Payment Method"
          }
        ),
        /* @__PURE__ */ s(
          Wt,
          {
            value: y.appliesAt,
            onChange: (P) => w((O) => ({ ...O, appliesAt: P })),
            options: [
              { value: "both", label: "Cart & Checkout" },
              { value: "cart", label: "Cart Only" },
              { value: "checkout", label: "Checkout Only" }
            ],
            label: "Applies At"
          }
        )
      ] }),
      y.scope === "specific_products" && /* @__PURE__ */ s("div", { className: "cedros-admin__form-row", children: /* @__PURE__ */ p("div", { className: "cedros-admin__field", style: { flex: 1 }, children: [
        /* @__PURE__ */ s("label", { className: "cedros-admin__field-label", children: "Product IDs" }),
        /* @__PURE__ */ s(
          "input",
          {
            type: "text",
            className: "cedros-admin__input",
            value: y.productIdsCsv,
            onChange: (P) => w((O) => ({ ...O, productIdsCsv: P.target.value })),
            placeholder: "e.g., prod_123, prod_456"
          }
        ),
        /* @__PURE__ */ s("div", { style: { marginTop: 4, fontSize: 12, opacity: 0.75 }, children: "Comma-separated product IDs this coupon applies to." })
      ] }) }),
      /* @__PURE__ */ p("div", { className: "cedros-admin__form-row", children: [
        /* @__PURE__ */ p("div", { className: "cedros-admin__field", children: [
          /* @__PURE__ */ s("label", { className: "cedros-admin__field-label", children: "Start Date (optional)" }),
          /* @__PURE__ */ s(
            "input",
            {
              type: "date",
              className: "cedros-admin__input",
              value: y.startsAt,
              onChange: (P) => w((O) => ({ ...O, startsAt: P.target.value }))
            }
          )
        ] }),
        /* @__PURE__ */ p("div", { className: "cedros-admin__field", children: [
          /* @__PURE__ */ s("label", { className: "cedros-admin__field-label", children: "Auto Apply" }),
          /* @__PURE__ */ p("label", { style: { display: "flex", alignItems: "center", gap: "0.5rem" }, children: [
            /* @__PURE__ */ s(
              "input",
              {
                type: "checkbox",
                checked: y.autoApply,
                onChange: (P) => w((O) => ({ ...O, autoApply: P.target.checked }))
              }
            ),
            "Automatically apply when conditions met"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ p("div", { className: "cedros-admin__form-row", children: [
        /* @__PURE__ */ p("div", { className: "cedros-admin__field", children: [
          /* @__PURE__ */ s("label", { className: "cedros-admin__field-label", children: "Minimum Purchase (USD)" }),
          /* @__PURE__ */ s(
            "input",
            {
              type: "number",
              className: "cedros-admin__input",
              value: y.minimumAmountUsd === "" ? "" : y.minimumAmountUsd,
              onChange: (P) => w((O) => ({ ...O, minimumAmountUsd: P.target.value === "" ? "" : parseFloat(P.target.value) || 0 })),
              placeholder: "e.g., 50.00",
              min: "0",
              step: "0.01"
            }
          )
        ] }),
        /* @__PURE__ */ p("div", { className: "cedros-admin__field", children: [
          /* @__PURE__ */ s("label", { className: "cedros-admin__field-label", children: "Per-Customer Limit" }),
          /* @__PURE__ */ s(
            "input",
            {
              type: "number",
              className: "cedros-admin__input",
              value: y.usageLimitPerCustomer || "",
              onChange: (P) => w((O) => ({ ...O, usageLimitPerCustomer: P.target.value ? parseInt(P.target.value) : void 0 })),
              placeholder: "Leave empty for unlimited",
              min: "1"
            }
          )
        ] }),
        /* @__PURE__ */ p("div", { className: "cedros-admin__field", children: [
          /* @__PURE__ */ s("label", { className: "cedros-admin__field-label", children: "First Purchase Only" }),
          /* @__PURE__ */ p("label", { style: { display: "flex", alignItems: "center", gap: "0.5rem" }, children: [
            /* @__PURE__ */ s(
              "input",
              {
                type: "checkbox",
                checked: y.firstPurchaseOnly,
                onChange: (P) => w((O) => ({ ...O, firstPurchaseOnly: P.target.checked }))
              }
            ),
            "New customers only"
          ] })
        ] })
      ] }),
      y.scope === "specific_categories" && /* @__PURE__ */ s("div", { className: "cedros-admin__form-row", children: /* @__PURE__ */ p("div", { className: "cedros-admin__field", style: { flex: 1 }, children: [
        /* @__PURE__ */ s("label", { className: "cedros-admin__field-label", children: "Category IDs" }),
        /* @__PURE__ */ s(
          "input",
          {
            type: "text",
            className: "cedros-admin__input",
            value: y.categoryIdsCsv,
            onChange: (P) => w((O) => ({ ...O, categoryIdsCsv: P.target.value })),
            placeholder: "e.g., cat_apparel, cat_accessories"
          }
        ),
        /* @__PURE__ */ s("div", { style: { marginTop: 4, fontSize: 12, opacity: 0.75 }, children: "Comma-separated category IDs this coupon applies to." })
      ] }) }),
      /* @__PURE__ */ s("div", { className: "cedros-admin__form-actions", children: /* @__PURE__ */ s("button", { type: "submit", className: "cedros-admin__button cedros-admin__button--primary", disabled: f, children: f ? "Creating..." : "Create Coupon" }) })
    ] }),
    i ? /* @__PURE__ */ p("div", { className: "cedros-admin__loading", children: [
      ee.loading,
      " Loading coupons..."
    ] }) : /* @__PURE__ */ s("div", { className: "cedros-admin__table-container", children: /* @__PURE__ */ p("table", { className: "cedros-admin__table", children: [
      /* @__PURE__ */ s("thead", { children: /* @__PURE__ */ p("tr", { children: [
        /* @__PURE__ */ s("th", { "aria-sort": h?.key === "code" ? h?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ p("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => I("code"), children: [
          "Code",
          R("code")
        ] }) }),
        /* @__PURE__ */ s("th", { "aria-sort": h?.key === "discount" ? h?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ p("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => I("discount"), children: [
          "Discount",
          R("discount")
        ] }) }),
        /* @__PURE__ */ s("th", { "aria-sort": h?.key === "usage" ? h?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ p("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => I("usage"), children: [
          "Usage",
          R("usage")
        ] }) }),
        /* @__PURE__ */ s("th", { "aria-sort": h?.key === "status" ? h?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ p("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => I("status"), children: [
          "Status",
          R("status")
        ] }) }),
        /* @__PURE__ */ s("th", { children: "Actions" })
      ] }) }),
      /* @__PURE__ */ s("tbody", { children: E.map((P) => /* @__PURE__ */ p("tr", { children: [
        /* @__PURE__ */ s("td", { children: /* @__PURE__ */ s("code", { children: P.code }) }),
        /* @__PURE__ */ s("td", { children: P.discountType === "percentage" ? `${P.discountValue}%` : `$${P.discountValue.toFixed(2)}` }),
        /* @__PURE__ */ p("td", { children: [
          P.usageCount,
          P.usageLimit ? ` / ${P.usageLimit}` : ""
        ] }),
        /* @__PURE__ */ s("td", { children: /* @__PURE__ */ s("span", { className: `cedros-admin__badge ${P.active ? "cedros-admin__badge--success" : "cedros-admin__badge--muted"}`, children: P.active ? "Active" : "Inactive" }) }),
        /* @__PURE__ */ s("td", { children: /* @__PURE__ */ s("button", { className: "cedros-admin__button cedros-admin__button--ghost", children: "Edit" }) })
      ] }, P.code)) })
    ] }) })
  ] });
}
function am({ serverUrl: e, apiKey: t, pageSize: n = 20, authManager: r }) {
  const [o, a] = K([]), [i, c] = K(!0), [l, d] = K(null), [f, u] = K([]), [h, g] = K(!0), [b, v] = K(null), [y, w] = K(null), [k, _] = K([]), [x, S] = K(!0), [I, R] = K(null), [E, P] = K(null), [O, T] = K(null), [D, j] = K(""), [z, W] = K(null), $ = ae(async () => {
    try {
      let M;
      const te = `/admin/refunds?limit=${n}`;
      if (r?.isAuthenticated())
        M = await r.fetchWithAuth(te);
      else {
        const ce = { "Content-Type": "application/json" };
        t && (ce["X-API-Key"] = t);
        const _e = await fetch(`${e}${te}`, { headers: ce });
        if (!_e.ok) throw new Error(`Failed to fetch x402 refunds: ${_e.status}`);
        M = await _e.json();
      }
      a(M.refunds || []);
    } catch (M) {
      Se().error("[RefundsSection] Failed to fetch x402 refunds:", M, {
        serverUrl: e.slice(0, 20) + "...",
        hasApiKey: !!t
      }), a([]), W("Failed to load x402 refunds");
    } finally {
      c(!1);
    }
  }, [e, t, n, r]);
  Te(() => {
    $();
  }, [$]);
  const C = ae(async () => {
    try {
      let M;
      const te = `/admin/credits/refund-requests?status=pending&limit=${n}&offset=0`;
      if (r?.isAuthenticated())
        M = await r.fetchWithAuth(te);
      else {
        const _e = { "Content-Type": "application/json" };
        t && (_e["X-API-Key"] = t);
        const ke = await fetch(`${e}${te}`, { headers: _e });
        if (!ke.ok) throw new Error(`Failed to fetch credits refund requests: ${ke.status}`);
        M = await ke.json();
      }
      const ce = Array.isArray(M) ? M : "refundRequests" in M ? M.refundRequests : M.requests || [];
      u(ce);
    } catch (M) {
      Se().error("[RefundsSection] Failed to fetch credits refunds:", M, {
        serverUrl: e.slice(0, 20) + "...",
        hasApiKey: !!t
      }), u([]), W("Failed to load credits refunds");
    } finally {
      g(!1);
    }
  }, [e, t, n, r]);
  Te(() => {
    C();
  }, [C]);
  const N = async (M) => {
    v(M.id);
    try {
      const te = `/admin/credits/refund-requests/${M.id}/process`, ce = JSON.stringify({ amountLamports: M.amountLamports, reason: M.reason });
      if (r?.isAuthenticated())
        await r.fetchWithAuth(te, { method: "POST", body: ce });
      else {
        const _e = { "Content-Type": "application/json" };
        t && (_e["X-API-Key"] = t);
        const ke = await fetch(`${e}${te}`, { method: "POST", headers: _e, body: ce });
        if (!ke.ok) throw new Error(`Failed to process credits refund: ${ke.status}`);
      }
      await C();
    } catch (te) {
      Se().error("[RefundsSection] Failed to process credits refund:", te, {
        serverUrl: e.slice(0, 20) + "...",
        hasApiKey: !!t,
        requestId: M.id
      }), W("Failed to process credits refund");
    } finally {
      v(null);
    }
  }, H = (M) => {
    j(M.reason ?? ""), T(M);
  }, G = () => {
    T(null), j("");
  }, J = async () => {
    if (!O) return;
    const M = O, te = D;
    G(), v(M.id);
    try {
      const ce = `/admin/credits/refund-requests/${M.id}/reject`, _e = JSON.stringify({ reason: te });
      if (r?.isAuthenticated())
        await r.fetchWithAuth(ce, { method: "POST", body: _e });
      else {
        const ke = { "Content-Type": "application/json" };
        t && (ke["X-API-Key"] = t);
        const ze = await fetch(`${e}${ce}`, { method: "POST", headers: ke, body: _e });
        if (!ze.ok) throw new Error(`Failed to reject credits refund: ${ze.status}`);
      }
      await C();
    } catch (ce) {
      Se().error("[RefundsSection] Failed to reject credits refund:", ce, {
        serverUrl: e.slice(0, 20) + "...",
        hasApiKey: !!t,
        requestId: M.id
      }), W("Failed to reject credits refund");
    } finally {
      v(null);
    }
  }, fe = ae(async () => {
    try {
      let M;
      const te = `/admin/stripe/refunds?limit=${n}`;
      if (r?.isAuthenticated())
        M = await r.fetchWithAuth(te);
      else {
        const ce = { "Content-Type": "application/json" };
        t && (ce["X-API-Key"] = t);
        const _e = await fetch(`${e}${te}`, { headers: ce });
        if (!_e.ok) throw new Error(`Failed to fetch Stripe refunds: ${_e.status}`);
        M = await _e.json();
      }
      _(M.refunds || []);
    } catch (M) {
      Se().error("[RefundsSection] Failed to fetch Stripe refunds:", M, {
        serverUrl: e.slice(0, 20) + "...",
        hasApiKey: !!t
      }), _([]), W("Failed to load Stripe refunds");
    } finally {
      S(!1);
    }
  }, [e, t, n, r]);
  Te(() => {
    fe();
  }, [fe]);
  const Z = async (M) => {
    R(M);
    try {
      const te = `/admin/stripe/refunds/${M}/process`;
      if (r?.isAuthenticated())
        await r.fetchWithAuth(te, { method: "POST" });
      else {
        const ce = { "Content-Type": "application/json" };
        t && (ce["X-API-Key"] = t);
        const _e = await fetch(`${e}${te}`, { method: "POST", headers: ce });
        if (!_e.ok) throw new Error(`Failed to process refund: ${_e.status}`);
      }
      await fe();
    } catch (te) {
      Se().error("[RefundsSection] Failed to process Stripe refund:", te, {
        serverUrl: e.slice(0, 20) + "...",
        hasApiKey: !!t,
        refundId: M
      }), W("Failed to process Stripe refund");
    } finally {
      R(null);
    }
  }, X = (M, te) => new Intl.NumberFormat("en-US", { style: "currency", currency: te }).format(M / 100), Q = (M) => M ? M.replace(/_/g, " ").replace(/\b\w/g, (te) => te.toUpperCase()) : "—", ge = (M) => {
    switch (M) {
      case "processed":
        return "success";
      case "pending":
        return "pending";
      case "rejected":
      default:
        return "muted";
    }
  }, F = (M, te) => te ? te.toLowerCase() === "usd" ? `${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(M / 1e6)} (USD credits)` : `${M.toLocaleString()} ${te.toUpperCase()} (atomic)` : `${M.toLocaleString()} (atomic)`, Y = (M) => {
    switch (M) {
      case "succeeded":
        return "success";
      case "failed":
        return "failed";
      case "pending":
      case "requires_action":
        return "pending";
      case "canceled":
      default:
        return "muted";
    }
  }, he = (M) => M.stripeRefundId ?? "—", V = (M) => M.chargeId ?? "—", ie = k.filter((M) => M.status === "pending" || M.status === "requires_action").length, ue = f.filter((M) => M.status === "pending").length, pe = o.filter((M) => M.status === "pending").length, $e = ie + ue + pe, Ye = k.filter((M) => M.status === "succeeded").reduce((M, te) => M + te.amount, 0), et = f.filter((M) => M.status === "processed").reduce((M, te) => M + te.amountLamports, 0), Qe = o.filter((M) => M.status === "completed").reduce((M, te) => M + te.amount, 0), At = Ye / 100 + et / 1e6 + Qe, tt = (M) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(M), dn = x || h || i, _t = (M) => {
    P((te) => !te || te.key !== M ? { key: M, direction: "asc" } : { key: M, direction: te.direction === "asc" ? "desc" : "asc" });
  }, Pe = (M) => {
    w((te) => !te || te.key !== M ? { key: M, direction: "asc" } : { key: M, direction: te.direction === "asc" ? "desc" : "asc" });
  }, ot = (M) => {
    d((te) => !te || te.key !== M ? { key: M, direction: "asc" } : { key: M, direction: te.direction === "asc" ? "desc" : "asc" });
  }, Ee = (M, te) => !M || !te ? /* @__PURE__ */ s("span", { className: "cedros-admin__sort-icon cedros-admin__sort-icon--idle", children: ee.chevronUp }) : /* @__PURE__ */ s("span", { className: "cedros-admin__sort-icon", children: te === "asc" ? ee.chevronUp : ee.chevronDown }), en = Ne(() => {
    if (!E) return k;
    const M = E.direction === "asc" ? 1 : -1, te = (ce) => {
      switch (E.key) {
        case "stripe":
          return ce.stripeRefundId ?? "";
        case "charge":
          return ce.chargeId ?? "";
        case "amount":
          return ce.amount ?? 0;
        case "reason":
          return ce.reason ?? "";
        case "status":
          return ce.status ?? "";
        case "date":
          return new Date(ce.createdAt).getTime();
        case "id":
        default:
          return ce.id;
      }
    };
    return [...k].sort((ce, _e) => {
      const ke = te(ce), ze = te(_e);
      return typeof ke == "number" && typeof ze == "number" ? (ke - ze) * M : String(ke).localeCompare(String(ze), void 0, { sensitivity: "base" }) * M;
    });
  }, [k, E]), yt = Ne(() => {
    if (!y) return f;
    const M = y.direction === "asc" ? 1 : -1, te = (ce) => {
      switch (y.key) {
        case "original":
          return ce.originalTransactionId ?? "";
        case "user":
          return ce.userId ?? "";
        case "amount":
          return ce.amountLamports ?? 0;
        case "reason":
          return ce.reason ?? "";
        case "status":
          return ce.status ?? "";
        case "date":
          return new Date(ce.createdAt).getTime();
        case "id":
        default:
          return ce.id;
      }
    };
    return [...f].sort((ce, _e) => {
      const ke = te(ce), ze = te(_e);
      return typeof ke == "number" && typeof ze == "number" ? (ke - ze) * M : String(ke).localeCompare(String(ze), void 0, { sensitivity: "base" }) * M;
    });
  }, [f, y]), ft = Ne(() => {
    if (!l) return o;
    const M = l.direction === "asc" ? 1 : -1, te = (ce) => {
      switch (l.key) {
        case "transaction":
          return ce.transactionId ?? "";
        case "amount":
          return ce.amount ?? 0;
        case "reason":
          return ce.reason ?? "";
        case "status":
          return ce.status ?? "";
        case "date":
          return new Date(ce.createdAt).getTime();
        case "id":
        default:
          return ce.id;
      }
    };
    return [...o].sort((ce, _e) => {
      const ke = te(ce), ze = te(_e);
      return typeof ke == "number" && typeof ze == "number" ? (ke - ze) * M : String(ke).localeCompare(String(ze), void 0, { sensitivity: "base" }) * M;
    });
  }, [o, l]);
  return /* @__PURE__ */ p("div", { className: "cedros-admin__page", children: [
    /* @__PURE__ */ s(Bo, { message: z, onRetry: () => {
      $(), C(), fe();
    } }),
    /* @__PURE__ */ s(
      Uo,
      {
        stats: [
          { label: "Pending", value: $e, variant: $e > 0 ? "warning" : "muted" },
          { label: "Card Pending", value: ie, description: "Stripe" },
          { label: "Credits Pending", value: ue },
          { label: "Crypto Pending", value: pe, description: "x402" },
          { label: "Total Refunded", value: tt(At), variant: "success" }
        ],
        isLoading: dn
      }
    ),
    /* @__PURE__ */ s("div", { className: "cedros-admin__section-header", children: /* @__PURE__ */ s("h3", { className: "cedros-admin__section-title", children: "Stripe Refund Requests" }) }),
    x ? /* @__PURE__ */ p("div", { className: "cedros-admin__loading", children: [
      ee.loading,
      " Loading Stripe refunds..."
    ] }) : k.length === 0 ? /* @__PURE__ */ s("div", { className: "cedros-admin__empty", children: "No Stripe refund requests found." }) : /* @__PURE__ */ s("div", { className: "cedros-admin__table-container", children: /* @__PURE__ */ p("table", { className: "cedros-admin__table", children: [
      /* @__PURE__ */ s("thead", { children: /* @__PURE__ */ p("tr", { children: [
        /* @__PURE__ */ s("th", { "aria-sort": E?.key === "id" ? E?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ p("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => _t("id"), children: [
          "Request ID",
          Ee(E?.key === "id", E?.direction)
        ] }) }),
        /* @__PURE__ */ s("th", { "aria-sort": E?.key === "stripe" ? E?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ p("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => _t("stripe"), children: [
          "Stripe Refund ID",
          Ee(E?.key === "stripe", E?.direction)
        ] }) }),
        /* @__PURE__ */ s("th", { "aria-sort": E?.key === "charge" ? E?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ p("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => _t("charge"), children: [
          "Charge",
          Ee(E?.key === "charge", E?.direction)
        ] }) }),
        /* @__PURE__ */ s("th", { "aria-sort": E?.key === "amount" ? E?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ p("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => _t("amount"), children: [
          "Amount",
          Ee(E?.key === "amount", E?.direction)
        ] }) }),
        /* @__PURE__ */ s("th", { "aria-sort": E?.key === "reason" ? E?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ p("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => _t("reason"), children: [
          "Reason",
          Ee(E?.key === "reason", E?.direction)
        ] }) }),
        /* @__PURE__ */ s("th", { "aria-sort": E?.key === "status" ? E?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ p("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => _t("status"), children: [
          "Status",
          Ee(E?.key === "status", E?.direction)
        ] }) }),
        /* @__PURE__ */ s("th", { "aria-sort": E?.key === "date" ? E?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ p("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => _t("date"), children: [
          "Date",
          Ee(E?.key === "date", E?.direction)
        ] }) }),
        /* @__PURE__ */ s("th", { children: "Actions" })
      ] }) }),
      /* @__PURE__ */ s("tbody", { children: en.map((M) => /* @__PURE__ */ p("tr", { children: [
        /* @__PURE__ */ s("td", { children: /* @__PURE__ */ s("code", { children: M.id }) }),
        /* @__PURE__ */ s("td", { children: /* @__PURE__ */ s("code", { children: he(M) }) }),
        /* @__PURE__ */ s("td", { children: /* @__PURE__ */ s("code", { children: V(M) }) }),
        /* @__PURE__ */ s("td", { children: X(M.amount, M.currency) }),
        /* @__PURE__ */ s("td", { children: Q(M.reason) }),
        /* @__PURE__ */ s("td", { children: /* @__PURE__ */ s("span", { className: `cedros-admin__badge cedros-admin__badge--${Y(M.status)}`, children: M.status }) }),
        /* @__PURE__ */ s("td", { children: po(M.createdAt) }),
        /* @__PURE__ */ s("td", { children: (M.status === "pending" || M.status === "requires_action") && /* @__PURE__ */ s(
          "button",
          {
            className: "cedros-admin__button cedros-admin__button--primary cedros-admin__button--sm",
            onClick: () => Z(M.id),
            disabled: I === M.id,
            children: I === M.id ? "Processing..." : "Process"
          }
        ) })
      ] }, M.id)) })
    ] }) }),
    /* @__PURE__ */ s("div", { className: "cedros-admin__section-header", style: { marginTop: "2rem" }, children: /* @__PURE__ */ s("h3", { className: "cedros-admin__section-title", children: "Credits Refund Requests" }) }),
    h ? /* @__PURE__ */ p("div", { className: "cedros-admin__loading", children: [
      ee.loading,
      " Loading credits refunds..."
    ] }) : f.length === 0 ? /* @__PURE__ */ s("div", { className: "cedros-admin__empty", children: "No credits refund requests found." }) : /* @__PURE__ */ s("div", { className: "cedros-admin__table-container", children: /* @__PURE__ */ p("table", { className: "cedros-admin__table", children: [
      /* @__PURE__ */ s("thead", { children: /* @__PURE__ */ p("tr", { children: [
        /* @__PURE__ */ s("th", { "aria-sort": y?.key === "id" ? y?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ p("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => Pe("id"), children: [
          "Request ID",
          Ee(y?.key === "id", y?.direction)
        ] }) }),
        /* @__PURE__ */ s("th", { "aria-sort": y?.key === "original" ? y?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ p("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => Pe("original"), children: [
          "Original Tx",
          Ee(y?.key === "original", y?.direction)
        ] }) }),
        /* @__PURE__ */ s("th", { "aria-sort": y?.key === "user" ? y?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ p("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => Pe("user"), children: [
          "User",
          Ee(y?.key === "user", y?.direction)
        ] }) }),
        /* @__PURE__ */ s("th", { "aria-sort": y?.key === "amount" ? y?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ p("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => Pe("amount"), children: [
          "Amount",
          Ee(y?.key === "amount", y?.direction)
        ] }) }),
        /* @__PURE__ */ s("th", { "aria-sort": y?.key === "reason" ? y?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ p("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => Pe("reason"), children: [
          "Reason",
          Ee(y?.key === "reason", y?.direction)
        ] }) }),
        /* @__PURE__ */ s("th", { "aria-sort": y?.key === "status" ? y?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ p("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => Pe("status"), children: [
          "Status",
          Ee(y?.key === "status", y?.direction)
        ] }) }),
        /* @__PURE__ */ s("th", { "aria-sort": y?.key === "date" ? y?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ p("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => Pe("date"), children: [
          "Date",
          Ee(y?.key === "date", y?.direction)
        ] }) }),
        /* @__PURE__ */ s("th", { children: "Actions" })
      ] }) }),
      /* @__PURE__ */ s("tbody", { children: yt.map((M) => /* @__PURE__ */ p("tr", { children: [
        /* @__PURE__ */ s("td", { children: /* @__PURE__ */ s("code", { children: M.id }) }),
        /* @__PURE__ */ s("td", { children: /* @__PURE__ */ s("code", { children: M.originalTransactionId }) }),
        /* @__PURE__ */ s("td", { children: /* @__PURE__ */ s("code", { children: M.userId ?? "—" }) }),
        /* @__PURE__ */ s("td", { children: F(M.amountLamports, M.currency) }),
        /* @__PURE__ */ s("td", { children: M.reason ?? "—" }),
        /* @__PURE__ */ s("td", { children: /* @__PURE__ */ s("span", { className: `cedros-admin__badge cedros-admin__badge--${ge(M.status)}`, children: M.status }) }),
        /* @__PURE__ */ s("td", { children: po(M.createdAt) }),
        /* @__PURE__ */ s("td", { children: M.status === "pending" ? /* @__PURE__ */ p("div", { style: { display: "flex", gap: "0.5rem" }, children: [
          /* @__PURE__ */ s(
            "button",
            {
              className: "cedros-admin__button cedros-admin__button--primary cedros-admin__button--sm",
              onClick: () => N(M),
              disabled: b === M.id,
              children: b === M.id ? "Processing..." : "Process"
            }
          ),
          /* @__PURE__ */ s(
            "button",
            {
              className: "cedros-admin__button cedros-admin__button--outline cedros-admin__button--danger cedros-admin__button--sm",
              onClick: () => H(M),
              disabled: b === M.id,
              children: "Reject"
            }
          )
        ] }) : null })
      ] }, M.id)) })
    ] }) }),
    /* @__PURE__ */ s("div", { className: "cedros-admin__section-header", style: { marginTop: "2rem" }, children: /* @__PURE__ */ s("h3", { className: "cedros-admin__section-title", children: "x402 Refund Requests" }) }),
    i ? /* @__PURE__ */ p("div", { className: "cedros-admin__loading", children: [
      ee.loading,
      " Loading x402 refunds..."
    ] }) : o.length === 0 ? /* @__PURE__ */ s("div", { className: "cedros-admin__empty", children: "No x402 refund requests found." }) : /* @__PURE__ */ s("div", { className: "cedros-admin__table-container", children: /* @__PURE__ */ p("table", { className: "cedros-admin__table", children: [
      /* @__PURE__ */ s("thead", { children: /* @__PURE__ */ p("tr", { children: [
        /* @__PURE__ */ s("th", { "aria-sort": l?.key === "id" ? l?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ p("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => ot("id"), children: [
          "ID",
          Ee(l?.key === "id", l?.direction)
        ] }) }),
        /* @__PURE__ */ s("th", { "aria-sort": l?.key === "transaction" ? l?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ p("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => ot("transaction"), children: [
          "Transaction",
          Ee(l?.key === "transaction", l?.direction)
        ] }) }),
        /* @__PURE__ */ s("th", { "aria-sort": l?.key === "amount" ? l?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ p("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => ot("amount"), children: [
          "Amount",
          Ee(l?.key === "amount", l?.direction)
        ] }) }),
        /* @__PURE__ */ s("th", { "aria-sort": l?.key === "reason" ? l?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ p("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => ot("reason"), children: [
          "Reason",
          Ee(l?.key === "reason", l?.direction)
        ] }) }),
        /* @__PURE__ */ s("th", { "aria-sort": l?.key === "status" ? l?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ p("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => ot("status"), children: [
          "Status",
          Ee(l?.key === "status", l?.direction)
        ] }) }),
        /* @__PURE__ */ s("th", { "aria-sort": l?.key === "date" ? l?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ p("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => ot("date"), children: [
          "Date",
          Ee(l?.key === "date", l?.direction)
        ] }) }),
        /* @__PURE__ */ s("th", { children: "Actions" })
      ] }) }),
      /* @__PURE__ */ s("tbody", { children: ft.map((M) => /* @__PURE__ */ p("tr", { children: [
        /* @__PURE__ */ s("td", { children: /* @__PURE__ */ s("code", { children: M.id }) }),
        /* @__PURE__ */ s("td", { children: /* @__PURE__ */ s("code", { children: M.transactionId }) }),
        /* @__PURE__ */ p("td", { children: [
          "$",
          M.amount.toFixed(2)
        ] }),
        /* @__PURE__ */ s("td", { children: M.reason || "—" }),
        /* @__PURE__ */ s("td", { children: /* @__PURE__ */ s("span", { className: `cedros-admin__badge cedros-admin__badge--${M.status}`, children: M.status }) }),
        /* @__PURE__ */ s("td", { children: po(M.createdAt) }),
        /* @__PURE__ */ s("td", {})
      ] }, M.id)) })
    ] }) }),
    O && /* @__PURE__ */ s("div", { className: "cedros-admin__modal-overlay", onClick: G, children: /* @__PURE__ */ p(
      "div",
      {
        className: "cedros-admin__modal",
        onClick: (M) => M.stopPropagation(),
        children: [
          /* @__PURE__ */ p("div", { className: "cedros-admin__modal-header", children: [
            /* @__PURE__ */ s("h3", { className: "cedros-admin__modal-title", children: "Reject Refund Request" }),
            /* @__PURE__ */ s(
              "button",
              {
                type: "button",
                className: "cedros-admin__modal-close",
                onClick: G,
                "aria-label": "Close",
                children: ee.close
              }
            )
          ] }),
          /* @__PURE__ */ p("div", { className: "cedros-admin__modal-body", children: [
            /* @__PURE__ */ p("p", { style: { marginBottom: "1rem", color: "var(--admin-muted)" }, children: [
              "Rejecting refund request ",
              /* @__PURE__ */ s("code", { children: O.id }),
              " for ",
              F(O.amountLamports, O.currency),
              "."
            ] }),
            /* @__PURE__ */ p("label", { className: "cedros-admin__form-field", children: [
              /* @__PURE__ */ s("span", { className: "cedros-admin__form-label", children: "Reason (optional)" }),
              /* @__PURE__ */ s(
                "textarea",
                {
                  className: "cedros-admin__input",
                  value: D,
                  onChange: (M) => j(M.target.value),
                  placeholder: "Enter rejection reason...",
                  rows: 3,
                  style: { resize: "vertical" }
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ p("div", { className: "cedros-admin__modal-footer", children: [
            /* @__PURE__ */ s(
              "button",
              {
                type: "button",
                className: "cedros-admin__button cedros-admin__button--outline",
                onClick: G,
                children: "Cancel"
              }
            ),
            /* @__PURE__ */ s(
              "button",
              {
                type: "button",
                className: "cedros-admin__button cedros-admin__button--primary cedros-admin__button--danger",
                onClick: J,
                children: "Reject Refund"
              }
            )
          ] })
        ]
      }
    ) })
  ] });
}
const im = ln(
  () => import("./SettingsSection-htem-WL3.mjs").then((e) => ({ default: e.SettingsSection }))
);
function cm(e) {
  return /* @__PURE__ */ s(mn, { fallback: null, children: /* @__PURE__ */ s(im, { ...e }) });
}
class wl {
  serverUrl;
  walletSigner = null;
  jwtToken = null;
  isAdminUser = !1;
  constructor(t) {
    this.serverUrl = t;
  }
  getAuthMethod() {
    return this.walletSigner?.publicKey && this.walletSigner.signMessage ? "wallet" : this.jwtToken && this.isAdminUser ? "cedros-login" : "none";
  }
  isAuthenticated() {
    return this.getAuthMethod() !== "none";
  }
  setWalletSigner(t) {
    this.walletSigner = t, Se().debug("[AdminAuthManager] Wallet signer updated:", !!t?.publicKey);
  }
  setCedrosLoginAuth(t, n) {
    this.jwtToken = t, this.isAdminUser = n ?? !1, Se().debug("[AdminAuthManager] Cedros-login auth updated:", { hasToken: !!t, isAdmin: this.isAdminUser });
  }
  async createAuthHeaders(t) {
    const n = this.getAuthMethod();
    if (n === "wallet")
      return this.createWalletAuthHeaders(t);
    if (n === "cedros-login")
      return this.createJwtAuthHeaders();
    throw new Error("No admin authentication configured. Connect a wallet or sign in as admin.");
  }
  async createWalletAuthHeaders(t) {
    if (!this.walletSigner?.publicKey || !this.walletSigner.signMessage)
      throw new Error("Wallet not connected or does not support message signing");
    const n = await this.fetchNonce(t), r = new TextEncoder().encode(n.nonce_id), o = await this.walletSigner.signMessage(r), a = ji.encode(this.walletSigner.publicKey.toBytes()), i = ji.encode(o);
    return {
      "X-Signer": a,
      "X-Message": n.nonce_id,
      "X-Signature": i
    };
  }
  createJwtAuthHeaders() {
    if (!this.jwtToken)
      throw new Error("No JWT token available");
    return {
      Authorization: `Bearer ${this.jwtToken}`
    };
  }
  async fetchNonce(t) {
    const n = `${this.serverUrl}/paywall/v1/nonce`;
    Se().debug("[AdminAuthManager] Fetching nonce for purpose:", t);
    const r = await Xs(n, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purpose: t })
    });
    if (!r.ok) {
      const o = await r.text();
      throw new Error(`Failed to fetch nonce: ${r.status} ${o}`);
    }
    return await r.json();
  }
  async fetchWithAuth(t, n = {}) {
    if (this.getAuthMethod() === "none")
      throw new Error("No admin authentication configured");
    const o = this.getPurposeFromPath(t, n.method || "GET"), a = await this.createAuthHeaders(o), i = (n.method || "GET").toUpperCase(), c = {
      // Only set Content-Type for methods that typically carry a body
      ...i !== "GET" && i !== "HEAD" ? { "Content-Type": "application/json" } : {},
      ...n.headers || {},
      ...a
    }, l = await Xs(`${this.serverUrl}${t}`, {
      ...n,
      headers: c
    });
    if (!l.ok) {
      let d = `Admin API error ${l.status}`;
      try {
        const f = await l.json();
        f && typeof f.error == "string" ? d = f.error : f && typeof f.message == "string" && (d = f.message);
      } catch {
      }
      throw new Error(d);
    }
    return await l.json();
  }
  getPurposeFromPath(t, n) {
    const o = {
      "/admin/stats": { GET: "admin_stats" },
      "/admin/products": {
        GET: "admin_products_list",
        POST: "admin_products_create"
      },
      "/admin/transactions": { GET: "admin_transactions_list" },
      "/admin/coupons": {
        GET: "admin_coupons_list",
        POST: "admin_coupons_create"
      },
      "/admin/refunds": { GET: "admin_refunds_list" },
      "/admin/config": { GET: "admin_config_list" }
    }[t];
    if (o?.[n])
      return o[n];
    if (t.startsWith("/admin/products/")) {
      if (n === "PUT") return "admin_products_update";
      if (n === "DELETE") return "admin_products_delete";
    }
    if (t.startsWith("/admin/coupons/")) {
      if (n === "PUT") return "admin_coupons_update";
      if (n === "DELETE") return "admin_coupons_delete";
    }
    if (t.startsWith("/admin/refunds/") && t.includes("/process"))
      return "admin_refunds_process";
    if (t.startsWith("/admin/config/")) {
      if (n === "GET") return "admin_config_get";
      if (n === "PUT") return "admin_config_update";
      if (n === "PATCH") return "admin_config_patch";
    }
    return `admin_${n.toLowerCase()}`;
  }
}
function lm({
  serverUrl: e,
  cedrosLoginToken: t,
  isAdmin: n = !1
}) {
  const r = Sp(), o = Ne(() => {
    const u = new wl(e);
    return u.setCedrosLoginAuth(t ?? null, n), u;
  }, [e, t, n]);
  Te(() => {
    r.publicKey && r.signMessage ? o.setWalletSigner({
      publicKey: r.publicKey,
      signMessage: r.signMessage
    }) : o.setWalletSigner(null);
  }, [o, r.publicKey, r.signMessage]);
  const a = o.getAuthMethod(), i = o.isAuthenticated(), c = !!(r.publicKey && r.signMessage), l = !!t, d = Ne(() => {
    if (!r.publicKey) return null;
    const u = r.publicKey.toBase58();
    return `${u.slice(0, 4)}...${u.slice(-4)}`;
  }, [r.publicKey]), f = ae(
    (u, h) => o.fetchWithAuth(u, h),
    [o]
  );
  return {
    authMethod: a,
    isAuthenticated: i,
    walletConnected: c,
    walletAddress: d,
    cedrosLoginAvailable: l,
    authManager: o,
    fetchWithAuth: f
  };
}
const dm = ln(
  () => import("./SubscriptionsSection-CONwHhT4.mjs").then((e) => ({ default: e.SubscriptionsSection }))
), um = ln(
  () => import("./StorefrontSection-CKTQt255.mjs").then((e) => ({ default: e.StorefrontSection }))
), fm = ln(
  () => import("./AISettingsSection--jn-BNmd.mjs").then((e) => ({ default: e.AISettingsSection }))
), pm = ln(
  () => import("./PaymentSettingsSection-c13RAUxn.mjs").then((e) => ({ default: e.PaymentSettingsSection }))
), mm = ln(
  () => import("./MessagingSection-BG9O62ko.mjs").then((e) => ({ default: e.MessagingSection }))
), hm = ln(
  () => import("./FAQSection-BB1wJRsR.mjs").then((e) => ({ default: e.FAQSection }))
), xl = [
  {
    label: "Menu",
    sections: [
      { id: "transactions", label: "Transactions", icon: ee.transactions },
      { id: "products", label: "Products", icon: ee.products },
      { id: "subscriptions", label: "Subscriptions", icon: ee.calendarRepeat },
      { id: "coupons", label: "Coupons", icon: ee.coupons },
      { id: "refunds", label: "Refunds", icon: ee.refunds }
    ]
  },
  {
    label: "Configuration",
    collapsible: !0,
    sections: [
      { id: "storefront", label: "Storefront", icon: ee.storefront },
      { id: "ai-settings", label: "Store AI", icon: ee.brain },
      { id: "faqs", label: "Knowledge Base", icon: ee.faq },
      { id: "payment-settings", label: "Payment Options", icon: ee.creditCard },
      { id: "messaging", label: "Store Messages", icon: ee.mail },
      { id: "settings", label: "Store Server", icon: ee.server }
    ]
  }
], gm = xl.flatMap((e) => e.sections);
function ym() {
  const [e, t] = K(() => typeof window > "u" ? "light" : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  return Te(() => {
    const n = window.matchMedia("(prefers-color-scheme: dark)"), r = (o) => t(o.matches ? "dark" : "light");
    return n.addEventListener("change", r), () => n.removeEventListener("change", r);
  }, []), e;
}
function vm(e, t, n) {
  return e !== "system" ? e : t || n;
}
function MN({
  serverUrl: e,
  apiKey: t,
  title: n = "Cedros Pay",
  sections: r = ["transactions", "products", "subscriptions", "coupons", "refunds", "storefront", "ai-settings", "faqs", "payment-settings", "messaging", "settings"],
  defaultSection: o = "transactions",
  refreshInterval: a = 3e4,
  pageSize: i = 20,
  onSectionChange: c,
  className: l = "",
  cedrosLoginToken: d,
  isAdmin: f = !1,
  theme: u = "system"
}) {
  const [h, g] = K(o), [b] = K(!1), [v, y] = K(/* @__PURE__ */ new Set()), w = ae((T) => {
    y((D) => {
      const j = new Set(D);
      return j.has(T) ? j.delete(T) : j.add(T), j;
    });
  }, []), k = xp(), _ = ym(), S = vm(u, k?.mode ?? null, _) === "dark" ? "cedros-admin--dark" : "", { authManager: I, isAuthenticated: R } = lm({
    serverUrl: e,
    cedrosLoginToken: d,
    isAdmin: f
  }), E = ae(
    (T) => {
      g(T), c?.(T);
    },
    [c]
  ), O = gm.filter((T) => r.includes(T.id)).find((T) => T.id === h);
  return b ? /* @__PURE__ */ p("div", { className: `cedros-admin cedros-admin--loading ${S} ${l}`, children: [
    ee.loading,
    /* @__PURE__ */ s("span", { className: "cedros-admin__loading-text", children: "Loading dashboard..." })
  ] }) : R ? /* @__PURE__ */ p("div", { className: `cedros-admin ${S} ${l}`, children: [
    /* @__PURE__ */ p("aside", { className: "cedros-admin__sidebar", children: [
      /* @__PURE__ */ s("div", { className: "cedros-admin__sidebar-header", children: /* @__PURE__ */ p("div", { className: "cedros-admin__logo", children: [
        ee.wallet,
        /* @__PURE__ */ s("span", { className: "cedros-admin__logo-text", children: n })
      ] }) }),
      /* @__PURE__ */ s("nav", { className: "cedros-admin__nav", children: xl.map((T) => {
        const D = T.sections.filter((z) => r.includes(z.id));
        if (D.length === 0) return null;
        const j = T.collapsible && v.has(T.label);
        return /* @__PURE__ */ p("div", { className: "cedros-admin__nav-group", children: [
          T.collapsible ? /* @__PURE__ */ p(
            "button",
            {
              type: "button",
              className: "cedros-admin__nav-label cedros-admin__nav-label--collapsible",
              onClick: () => w(T.label),
              "aria-expanded": !j,
              children: [
                T.label,
                /* @__PURE__ */ s("span", { className: `cedros-admin__nav-label-icon ${j ? "" : "cedros-admin__nav-label-icon--expanded"}`, children: ee.chevronRight })
              ]
            }
          ) : /* @__PURE__ */ s("span", { className: "cedros-admin__nav-label", children: T.label }),
          !j && D.map((z) => /* @__PURE__ */ p(
            "button",
            {
              type: "button",
              className: `cedros-admin__nav-item ${h === z.id ? "cedros-admin__nav-item--active" : ""}`,
              onClick: () => E(z.id),
              "aria-current": h === z.id ? "page" : void 0,
              children: [
                /* @__PURE__ */ s("span", { className: "cedros-admin__nav-icon", children: z.icon }),
                /* @__PURE__ */ s("span", { className: "cedros-admin__nav-text", children: z.label })
              ]
            },
            z.id
          ))
        ] }, T.label);
      }) })
    ] }),
    /* @__PURE__ */ p("main", { className: "cedros-admin__main", children: [
      /* @__PURE__ */ s("header", { className: "cedros-admin__header", children: /* @__PURE__ */ p("div", { className: "cedros-admin__breadcrumb", children: [
        /* @__PURE__ */ s("span", { className: "cedros-admin__breadcrumb-root", children: n }),
        /* @__PURE__ */ s("span", { className: "cedros-admin__breadcrumb-sep", children: ee.chevronRight }),
        /* @__PURE__ */ s("span", { className: "cedros-admin__breadcrumb-current", children: O?.label })
      ] }) }),
      /* @__PURE__ */ p("div", { className: "cedros-admin__content", children: [
        h === "products" && /* @__PURE__ */ s(
          rm,
          {
            serverUrl: e,
            apiKey: t,
            pageSize: i,
            authManager: I
          }
        ),
        h === "subscriptions" && /* @__PURE__ */ s(mn, { fallback: /* @__PURE__ */ s("div", { className: "cedros-admin__loading-text", children: "Loading section..." }), children: /* @__PURE__ */ s(
          dm,
          {
            serverUrl: e,
            apiKey: t,
            authManager: I
          }
        ) }),
        h === "transactions" && /* @__PURE__ */ s(
          om,
          {
            serverUrl: e,
            apiKey: t,
            pageSize: i,
            authManager: I
          }
        ),
        h === "coupons" && /* @__PURE__ */ s(
          sm,
          {
            serverUrl: e,
            apiKey: t,
            pageSize: i,
            authManager: I
          }
        ),
        h === "refunds" && /* @__PURE__ */ s(
          am,
          {
            serverUrl: e,
            apiKey: t,
            pageSize: i,
            authManager: I
          }
        ),
        h === "storefront" && /* @__PURE__ */ s(mn, { fallback: /* @__PURE__ */ s("div", { className: "cedros-admin__loading-text", children: "Loading section..." }), children: /* @__PURE__ */ s(
          um,
          {
            serverUrl: e,
            apiKey: t,
            authManager: I
          }
        ) }),
        h === "ai-settings" && /* @__PURE__ */ s(mn, { fallback: /* @__PURE__ */ s("div", { className: "cedros-admin__loading-text", children: "Loading section..." }), children: /* @__PURE__ */ s(
          fm,
          {
            serverUrl: e,
            apiKey: t,
            authManager: I
          }
        ) }),
        h === "faqs" && /* @__PURE__ */ s(mn, { fallback: /* @__PURE__ */ s("div", { className: "cedros-admin__loading-text", children: "Loading section..." }), children: /* @__PURE__ */ s(
          hm,
          {
            serverUrl: e,
            apiKey: t,
            pageSize: i,
            authManager: I
          }
        ) }),
        h === "payment-settings" && /* @__PURE__ */ s(mn, { fallback: /* @__PURE__ */ s("div", { className: "cedros-admin__loading-text", children: "Loading section..." }), children: /* @__PURE__ */ s(
          pm,
          {
            serverUrl: e,
            apiKey: t,
            authManager: I
          }
        ) }),
        h === "messaging" && /* @__PURE__ */ s(mn, { fallback: /* @__PURE__ */ s("div", { className: "cedros-admin__loading-text", children: "Loading section..." }), children: /* @__PURE__ */ s(
          mm,
          {
            serverUrl: e,
            apiKey: t,
            authManager: I
          }
        ) }),
        h === "settings" && /* @__PURE__ */ s(
          cm,
          {
            serverUrl: e,
            apiKey: t,
            authManager: I
          }
        )
      ] })
    ] })
  ] }) : /* @__PURE__ */ s("div", { className: `cedros-admin cedros-admin--unauthenticated ${S} ${l}`, children: /* @__PURE__ */ s("p", { className: "cedros-admin__auth-prompt", children: "Please connect a wallet or sign in as admin to access the dashboard." }) });
}
function Vo(e) {
  const t = ln(e), n = (r) => Fi(
    mn,
    { fallback: null },
    Fi(t, r)
  );
  return n.displayName = "LazyAdminSection", n;
}
Vo(
  () => import("./SettingsSection-htem-WL3.mjs").then((e) => ({ default: e.SettingsSection }))
);
Vo(
  () => import("./SubscriptionsSection-CONwHhT4.mjs").then((e) => ({ default: e.SubscriptionsSection }))
);
Vo(
  () => import("./StorefrontSection-CKTQt255.mjs").then((e) => ({ default: e.StorefrontSection }))
);
Vo(
  () => import("./FAQSection-BB1wJRsR.mjs").then((e) => ({ default: e.FAQSection }))
);
const Pt = (e) => ln(async () => {
  const r = (await e()).default;
  return { default: ({ pluginContext: a }) => {
    const c = Cp()?._internal?.getAccessToken() ?? a.getAccessToken(), l = Ne(() => {
      const f = new wl(a.serverUrl);
      return f.setCedrosLoginAuth(c ?? null), f;
    }, [a.serverUrl, c]), d = {
      serverUrl: a.serverUrl,
      authManager: l
    };
    return /* @__PURE__ */ s(r, { ...d });
  } };
}), LN = {
  id: "cedros-pay",
  name: "Cedros Pay",
  version: "1.0.0",
  sections: [
    // Store group (main cedros-pay sections)
    { id: "transactions", label: "Transactions", icon: ee.transactions, group: "Store", order: 0 },
    { id: "products", label: "Products", icon: ee.products, group: "Store", order: 1 },
    { id: "subscriptions", label: "Subscriptions", icon: ee.subscriptions, group: "Store", order: 2 },
    { id: "coupons", label: "Coupons", icon: ee.coupons, group: "Store", order: 3 },
    { id: "refunds", label: "Refunds", icon: ee.refunds, group: "Store", order: 4 },
    // Configuration group
    { id: "storefront", label: "Storefront", icon: ee.storefront, group: "Configuration", order: 10 },
    { id: "ai-settings", label: "Store AI", icon: ee.ai, group: "Configuration", order: 11 },
    { id: "faqs", label: "Knowledge Base", icon: ee.faq, group: "Configuration", order: 12 },
    { id: "payment-settings", label: "Payment Options", icon: ee.wallet, group: "Configuration", order: 13 },
    { id: "messaging", label: "Store Messages", icon: ee.notifications, group: "Configuration", order: 14 },
    { id: "settings", label: "Store Server", icon: ee.settings, group: "Configuration", order: 15 }
  ],
  groups: [
    { id: "Store", label: "Store", order: 1 },
    { id: "Configuration", label: "Configuration", order: 2, defaultCollapsed: !0 }
  ],
  components: {
    products: Pt(() => import("./sections-DICaHGhz.mjs").then((e) => ({ default: e.ProductsSection }))),
    subscriptions: Pt(() => import("./SubscriptionsSection-CONwHhT4.mjs").then((e) => ({ default: e.SubscriptionsSection }))),
    transactions: Pt(() => import("./sections-DICaHGhz.mjs").then((e) => ({ default: e.TransactionsSection }))),
    coupons: Pt(() => import("./sections-DICaHGhz.mjs").then((e) => ({ default: e.CouponsSection }))),
    refunds: Pt(() => import("./sections-DICaHGhz.mjs").then((e) => ({ default: e.RefundsSection }))),
    storefront: Pt(() => import("./StorefrontSection-CKTQt255.mjs").then((e) => ({ default: e.StorefrontSection }))),
    "ai-settings": Pt(() => import("./AISettingsSection--jn-BNmd.mjs").then((e) => ({ default: e.AISettingsSection }))),
    faqs: Pt(() => import("./FAQSection-BB1wJRsR.mjs").then((e) => ({ default: e.FAQSection }))),
    "payment-settings": Pt(() => import("./PaymentSettingsSection-c13RAUxn.mjs").then((e) => ({ default: e.PaymentSettingsSection }))),
    messaging: Pt(() => import("./MessagingSection-BG9O62ko.mjs").then((e) => ({ default: e.MessagingSection }))),
    settings: Pt(() => import("./SettingsSection-htem-WL3.mjs").then((e) => ({ default: e.SettingsSection })))
  },
  createPluginContext(e) {
    const t = e.cedrosPay, n = e.cedrosLogin;
    return {
      serverUrl: t?.serverUrl || n?.serverUrl || "",
      userId: n?.user?.id,
      getAccessToken: () => n?.getAccessToken?.() || t?.jwtToken || null,
      hasPermission: (o) => this.checkPermission(o, e),
      orgId: e.org?.orgId,
      pluginData: {
        walletAddress: t?.walletAddress
      }
    };
  },
  checkPermission(e, t) {
    return t.org?.permissions ? t.org.permissions.includes(e) : !!(t.cedrosLogin?.user || t.cedrosPay?.jwtToken || t.cedrosPay?.walletAddress);
  },
  cssNamespace: "cedros-dashboard"
};
function DN({
  product: e,
  paymentMethod: t,
  showOriginalPrice: n = !1,
  className: r = "",
  style: o = {}
}) {
  const a = t === "stripe", i = a ? e.fiatAmount : e.cryptoAmount, c = a ? e.effectiveFiatAmount : e.effectiveCryptoAmount, l = a ? e.fiatCurrency.toUpperCase() : e.cryptoToken, d = a ? e.hasStripeCoupon : e.hasCryptoCoupon, f = a ? e.stripeDiscountPercent : e.cryptoDiscountPercent;
  return /* @__PURE__ */ p("div", { className: r, style: o, children: [
    n && d && /* @__PURE__ */ p(
      "span",
      {
        style: {
          textDecoration: "line-through",
          opacity: 0.6,
          marginRight: "0.5rem",
          fontSize: "0.875em"
        },
        children: [
          i.toFixed(2),
          " ",
          l
        ]
      }
    ),
    /* @__PURE__ */ p("span", { style: { fontWeight: 600 }, children: [
      c.toFixed(2),
      " ",
      l
    ] }),
    d && f > 0 && /* @__PURE__ */ p(
      "span",
      {
        style: {
          marginLeft: "0.5rem",
          padding: "0.125rem 0.375rem",
          backgroundColor: "#10b981",
          color: "white",
          borderRadius: "0.25rem",
          fontSize: "0.75em",
          fontWeight: 600
        },
        children: [
          f,
          "% OFF"
        ]
      }
    )
  ] });
}
function $N({
  product: e,
  paymentMethod: t,
  className: n = "",
  style: r = {}
}) {
  const o = t === "stripe", a = o ? e.hasStripeCoupon : e.hasCryptoCoupon, i = o ? e.stripeDiscountPercent : e.cryptoDiscountPercent, c = o ? e.stripeCouponCode : e.cryptoCouponCode;
  if (!a || i === 0)
    return null;
  const l = o ? `${i}% off with card!` : `${i}% off with crypto!`;
  return /* @__PURE__ */ p(
    "div",
    {
      className: n,
      style: {
        display: "inline-flex",
        alignItems: "center",
        padding: "0.5rem 0.75rem",
        backgroundColor: o ? "#6366f1" : "#10b981",
        color: "white",
        borderRadius: "0.375rem",
        fontSize: "0.875rem",
        fontWeight: 600,
        ...r
      },
      children: [
        l,
        c && /* @__PURE__ */ p(
          "span",
          {
            style: {
              marginLeft: "0.5rem",
              opacity: 0.8,
              fontSize: "0.75em",
              fontWeight: 400
            },
            children: [
              "(",
              c,
              ")"
            ]
          }
        )
      ]
    }
  );
}
function bm() {
  const { subscriptionManager: e } = sr(), [t, n] = K({
    status: "idle",
    error: null,
    sessionId: null,
    subscriptionStatus: null,
    expiresAt: null
  }), r = Jt(!1), o = ae(
    async (l) => {
      if (r.current)
        return { success: !1, error: "Payment already in progress" };
      r.current = !0, n((d) => ({
        ...d,
        status: "loading",
        error: null
      }));
      try {
        const d = await e.processSubscription(l);
        return n((f) => ({
          ...f,
          status: d.success ? "success" : "error",
          error: d.success ? null : d.error || "Subscription failed",
          sessionId: d.success && d.transactionId || null
        })), d;
      } catch (d) {
        const f = fo(d, "Subscription failed");
        return n((u) => ({
          ...u,
          status: "error",
          error: f
        })), { success: !1, error: f };
      } finally {
        r.current = !1;
      }
    },
    [e]
  ), a = ae(
    async (l) => {
      n((d) => ({
        ...d,
        status: "checking",
        error: null
      }));
      try {
        const d = await e.checkSubscriptionStatus(l);
        return n((f) => ({
          ...f,
          status: d.active ? "success" : "idle",
          subscriptionStatus: d.status,
          expiresAt: d.expiresAt || d.currentPeriodEnd || null
        })), d;
      } catch (d) {
        const f = d instanceof Error ? d.message : "Failed to check subscription status";
        throw n((u) => ({
          ...u,
          status: "error",
          error: f
        })), d;
      }
    },
    [e]
  ), i = ae(
    async (l, d, f) => {
      n((u) => ({
        ...u,
        status: "loading",
        error: null
      }));
      try {
        const u = await e.requestSubscriptionQuote(
          l,
          d,
          f
        );
        return n((h) => ({
          ...h,
          status: "idle"
        })), u;
      } catch (u) {
        const h = u instanceof Error ? u.message : "Failed to get subscription quote";
        throw n((g) => ({
          ...g,
          status: "error",
          error: h
        })), u;
      }
    },
    [e]
  ), c = ae(() => {
    n({
      status: "idle",
      error: null,
      sessionId: null,
      subscriptionStatus: null,
      expiresAt: null
    });
  }, []);
  return {
    ...t,
    processSubscription: o,
    checkStatus: a,
    requestQuote: i,
    reset: c
  };
}
function zN({
  resource: e,
  interval: t,
  intervalDays: n,
  trialDays: r,
  successUrl: o,
  cancelUrl: a,
  metadata: i,
  customerEmail: c,
  couponCode: l,
  label: d,
  disabled: f = !1,
  onAttempt: u,
  onSuccess: h,
  onError: g,
  className: b = ""
}) {
  const { status: v, error: y, sessionId: w, processSubscription: k } = bm(), _ = bn(), { t: x, translations: S } = ar(), I = d || x("ui.subscribe"), R = _.unstyled ? b : `${_.className} cedros-theme__stripe-button ${b}`.trim(), E = y && typeof y != "string" ? y?.code ?? null : null, O = y ? typeof y == "string" ? y : (($) => {
    if (!$ || !S) return "";
    const C = S.errors[$];
    return C ? C.action ? `${C.message} ${C.action}` : C.message : "";
  })(E) : null, T = ae(async () => {
    Se().debug("[SubscribeButton] executeSubscription:", {
      resource: e,
      interval: t,
      intervalDays: n,
      trialDays: r,
      couponCode: l
    }), Ur("stripe", e), u && u("stripe"), Vr("stripe", e);
    const $ = await k({
      resource: e,
      interval: t,
      intervalDays: n,
      trialDays: r,
      customerEmail: c,
      metadata: i,
      couponCode: l,
      successUrl: o,
      cancelUrl: a
    });
    $.success && $.transactionId ? (Wr("stripe", $.transactionId, e), h && h($.transactionId)) : !$.success && $.error && (sn("stripe", $.error, e), g && g($.error));
  }, [
    e,
    t,
    n,
    r,
    c,
    i,
    l,
    o,
    a,
    k,
    u,
    h,
    g
  ]), D = Ne(() => `subscribe-${e}-${t}`, [e, t]), j = Ne(
    () => Br(D, T),
    [D, T]
  ), z = v === "loading", W = f || z;
  return /* @__PURE__ */ p("div", { className: R, style: _.unstyled ? {} : _.style, children: [
    /* @__PURE__ */ s(
      "button",
      {
        onClick: j,
        disabled: W,
        className: _.unstyled ? b : "cedros-theme__button cedros-theme__stripe",
        type: "button",
        children: z ? x("ui.processing") : I
      }
    ),
    O && /* @__PURE__ */ s("div", { className: _.unstyled ? "" : "cedros-theme__error", children: O }),
    w && /* @__PURE__ */ s("div", { className: _.unstyled ? "" : "cedros-theme__success", children: x("ui.redirecting_to_checkout") })
  ] });
}
function wm() {
  const { subscriptionManager: e, creditsManager: t } = sr(), [n, r] = K({
    status: "idle",
    error: null,
    sessionId: null,
    subscriptionStatus: null,
    expiresAt: null,
    creditsRequirement: null
  }), o = Jt(!1), a = ae(
    async (d, f) => {
      r((u) => ({
        ...u,
        status: "checking",
        error: null
      }));
      try {
        const u = await e.checkSubscriptionStatus({
          resource: d,
          userId: f
        });
        return r((h) => ({
          ...h,
          status: u.active ? "success" : "idle",
          subscriptionStatus: u.status,
          expiresAt: u.expiresAt || u.currentPeriodEnd || null
        })), u;
      } catch (u) {
        const h = fo(u, "Failed to check subscription status");
        return r((g) => ({
          ...g,
          status: "error",
          error: h
        })), null;
      }
    },
    [e]
  ), i = ae(
    async (d, f, u) => {
      r((h) => ({
        ...h,
        status: "loading",
        error: null
      }));
      try {
        const h = await t.requestQuote(
          d,
          u?.couponCode
        );
        return r((g) => ({
          ...g,
          status: "idle",
          creditsRequirement: h
        })), h;
      } catch (h) {
        const g = fo(h, "Failed to get subscription quote");
        return r((b) => ({
          ...b,
          status: "error",
          error: g
        })), null;
      }
    },
    [t]
  ), c = ae(
    async (d, f, u, h) => {
      if (o.current)
        return { success: !1, error: "Payment already in progress" };
      if (!u) {
        const g = "Authentication required for credits payment";
        return r((b) => ({ ...b, status: "error", error: g })), { success: !1, error: g };
      }
      o.current = !0, r((g) => ({
        ...g,
        status: "loading",
        error: null
      }));
      try {
        const g = await t.processPayment(
          d,
          u,
          h?.couponCode,
          {
            interval: f,
            ...h?.intervalDays && { intervalDays: String(h.intervalDays) }
          }
        );
        return g.success ? r({
          status: "success",
          error: null,
          sessionId: g.transactionId || null,
          subscriptionStatus: "active",
          expiresAt: null,
          // Will be updated on next status check
          creditsRequirement: null
        }) : r((b) => ({
          ...b,
          status: "error",
          error: g.error || "Credits subscription payment failed"
        })), g;
      } catch (g) {
        const b = fo(g, "Credits subscription payment failed");
        return r((v) => ({
          ...v,
          status: "error",
          error: b
        })), { success: !1, error: b };
      } finally {
        o.current = !1;
      }
    },
    [t]
  ), l = ae(() => {
    r({
      status: "idle",
      error: null,
      sessionId: null,
      subscriptionStatus: null,
      expiresAt: null,
      creditsRequirement: null
    });
  }, []);
  return {
    ...n,
    checkStatus: a,
    requestQuote: i,
    processPayment: c,
    reset: l
  };
}
function FN({
  resource: e,
  interval: t,
  intervalDays: n,
  authToken: r,
  userId: o,
  couponCode: a,
  label: i,
  disabled: c = !1,
  onAttempt: l,
  onSuccess: d,
  onError: f,
  className: u = "",
  hideMessages: h = !1,
  autoCheckStatus: g = !1
}) {
  const {
    status: b,
    error: v,
    subscriptionStatus: y,
    expiresAt: w,
    checkStatus: k,
    processPayment: _
  } = wm(), x = bn(), { t: S, translations: I } = ar(), R = Jt(k);
  Te(() => {
    R.current = k;
  }, [k]), Te(() => {
    g && o && (Se().debug("[CreditsSubscribeButton] Auto-checking subscription status", { resource: e, userId: o }), R.current(e, o));
  }, [g, o, e]);
  const E = i || S("ui.subscribe_with_credits") || "Subscribe with Credits", P = v && typeof v != "string" ? v?.code ?? null : null, T = v ? typeof v == "string" ? v : ((G) => {
    if (!G || !I) return "";
    const J = I.errors[G];
    return J ? J.action ? `${J.message} ${J.action}` : J.message : "";
  })(P) : null, D = ae(async () => {
    if (Se().debug("[CreditsSubscribeButton] executeSubscriptionFlow", {
      resource: e,
      interval: t,
      intervalDays: n,
      hasAuthToken: !!r
    }), Ur("credits", e), l && l("credits"), !r) {
      const J = "Authentication required: please log in to subscribe with credits";
      Se().error("[CreditsSubscribeButton]", J), sn("credits", J, e), f && f(J);
      return;
    }
    Vr("credits", e);
    const G = await _(e, t, r, {
      couponCode: a,
      intervalDays: n
    });
    G.success && G.transactionId ? (Wr("credits", G.transactionId, e), d && d(G.transactionId)) : !G.success && G.error && (sn("credits", G.error, e), f && f(G.error));
  }, [
    e,
    t,
    n,
    r,
    a,
    _,
    l,
    d,
    f
  ]), j = Ne(() => `credits-subscribe-${e}-${t}`, [e, t]), z = Ne(
    () => Br(j, D, {
      cooldownMs: 200,
      deduplicationWindowMs: 0
    }),
    [j, D]
  ), W = b === "loading" || b === "checking", $ = y === "active" || y === "trialing", C = c || W || $;
  let N = E;
  if (W)
    N = S("ui.processing");
  else if ($ && w) {
    const G = new Date(w).toLocaleDateString();
    N = `${S("ui.subscribed_until")} ${G}`;
  } else $ && (N = S("ui.subscribed"));
  const H = x.unstyled ? u : `${x.className} cedros-theme__credits-button ${u}`.trim();
  return /* @__PURE__ */ p("div", { className: H, style: x.unstyled ? {} : x.style, children: [
    /* @__PURE__ */ s(
      "button",
      {
        onClick: z,
        disabled: C,
        className: x.unstyled ? u : "cedros-theme__button cedros-theme__credits",
        type: "button",
        children: N
      }
    ),
    !h && T && /* @__PURE__ */ s("div", { className: x.unstyled ? "" : "cedros-theme__error", children: T }),
    !h && $ && /* @__PURE__ */ s("div", { className: x.unstyled ? "" : "cedros-theme__success", children: S("ui.subscription_active") })
  ] });
}
function xm() {
  const { subscriptionChangeManager: e } = sr(), [t, n] = K({
    status: "idle",
    error: null,
    subscription: null,
    changePreview: null,
    userId: null
  }), r = Jt(t);
  r.current = t;
  const o = ae(
    async (u, h) => {
      n((g) => ({ ...g, status: "loading", error: null }));
      try {
        const g = await e.getDetails(u, h);
        return n((b) => ({
          ...b,
          status: "success",
          subscription: g,
          userId: h
        })), g;
      } catch (g) {
        const b = g instanceof Error ? g.message : "Failed to load subscription";
        return n((v) => ({ ...v, status: "error", error: b })), null;
      }
    },
    [e]
  ), a = ae(
    async (u, h, g, b) => {
      n((v) => ({ ...v, status: "loading", error: null }));
      try {
        const v = {
          currentResource: u,
          newResource: h,
          userId: g,
          newInterval: b
        }, y = await e.previewChange(v);
        return n((w) => ({
          ...w,
          status: "idle",
          changePreview: y
        })), y;
      } catch (v) {
        const y = v instanceof Error ? v.message : "Failed to preview change";
        return n((w) => ({ ...w, status: "error", error: y })), null;
      }
    },
    [e]
  ), i = ae(
    async (u) => {
      const { subscription: h, userId: g } = r.current;
      if (!h || !g)
        return n((b) => ({ ...b, status: "error", error: "No subscription loaded" })), null;
      n((b) => ({ ...b, status: "loading", error: null }));
      try {
        const b = {
          currentResource: h.resource,
          newResource: u.newResource,
          userId: g,
          newInterval: u.newInterval,
          prorationBehavior: u.prorationBehavior,
          immediate: u.immediate
        }, v = await e.changeSubscription(b);
        return v.success ? n((y) => ({
          ...y,
          status: "success",
          subscription: y.subscription ? {
            ...y.subscription,
            resource: v.newResource,
            interval: v.newInterval,
            status: v.status
          } : null,
          changePreview: null
        })) : n((y) => ({
          ...y,
          status: "error",
          error: v.error || "Failed to change subscription"
        })), v;
      } catch (b) {
        const v = b instanceof Error ? b.message : "Failed to change subscription";
        return n((y) => ({ ...y, status: "error", error: v })), null;
      }
    },
    [e]
  ), c = ae(
    async (u) => {
      const { subscription: h, userId: g } = r.current;
      if (!h || !g)
        return n((b) => ({ ...b, status: "error", error: "No subscription loaded" })), null;
      n((b) => ({ ...b, status: "loading", error: null }));
      try {
        const b = {
          resource: h.resource,
          userId: g,
          immediate: u
        }, v = await e.cancel(b);
        if (v.success) {
          const y = u ? "canceled" : h.status;
          n((w) => ({
            ...w,
            status: "success",
            subscription: w.subscription ? {
              ...w.subscription,
              status: y,
              cancelAtPeriodEnd: !u
            } : null
          }));
        } else
          n((y) => ({
            ...y,
            status: "error",
            error: v.error || "Failed to cancel subscription"
          }));
        return v;
      } catch (b) {
        const v = b instanceof Error ? b.message : "Failed to cancel subscription";
        return n((y) => ({ ...y, status: "error", error: v })), null;
      }
    },
    [e]
  ), l = ae(
    async (u, h) => {
      n((g) => ({ ...g, status: "loading", error: null }));
      try {
        const g = await e.getBillingPortalUrl({
          userId: u,
          returnUrl: h
        });
        try {
          if (new URL(g.url).protocol !== "https:")
            throw new Error("Billing portal URL must use HTTPS");
        } catch {
          throw new Error("Invalid billing portal URL");
        }
        return window.location.href = g.url, g;
      } catch (g) {
        const b = g instanceof Error ? g.message : "Failed to open billing portal";
        return n((v) => ({ ...v, status: "error", error: b })), null;
      }
    },
    [e]
  ), d = ae(() => {
    n((u) => ({ ...u, changePreview: null }));
  }, []), f = ae(() => {
    n({
      status: "idle",
      error: null,
      subscription: null,
      changePreview: null,
      userId: null
    });
  }, []);
  return {
    ...t,
    loadSubscription: o,
    previewChange: a,
    changeSubscription: i,
    cancelSubscription: c,
    openBillingPortal: l,
    clearPreview: d,
    reset: f
  };
}
const _m = {
  bg: "#fff",
  bgMuted: "#f9fafb",
  bgHighlight: "#eff6ff",
  text: "#111827",
  textMuted: "#6b7280",
  textFaint: "#9ca3af",
  border: "#e5e7eb",
  borderLight: "#f3f4f6",
  primary: "#3b82f6",
  error: "#ef4444",
  errorBg: "#fef2f2",
  errorBorder: "#fecaca",
  warningBg: "#fef3c7",
  warningBorder: "#fcd34d",
  warningText: "#92400e",
  buttonBg: "#f3f4f6",
  buttonBorder: "#d1d5db",
  buttonText: "#374151"
}, km = {
  bg: "#1e293b",
  bgMuted: "#334155",
  bgHighlight: "rgba(59, 130, 246, 0.15)",
  text: "#f1f5f9",
  textMuted: "#94a3b8",
  textFaint: "#64748b",
  border: "#475569",
  borderLight: "#334155",
  primary: "#3b82f6",
  error: "#ef4444",
  errorBg: "rgba(239, 68, 68, 0.15)",
  errorBorder: "rgba(239, 68, 68, 0.3)",
  warningBg: "rgba(245, 158, 11, 0.15)",
  warningBorder: "rgba(245, 158, 11, 0.3)",
  warningText: "#fbbf24",
  buttonBg: "#334155",
  buttonBorder: "#475569",
  buttonText: "#e2e8f0"
};
function Sm(e) {
  const t = e ? km : _m;
  return {
    container: {
      padding: "24px",
      backgroundColor: t.bg,
      borderRadius: "8px",
      border: `1px solid ${t.border}`,
      fontFamily: "system-ui, -apple-system, sans-serif",
      color: t.text
    },
    error: {
      padding: "12px 16px",
      backgroundColor: t.errorBg,
      border: `1px solid ${t.errorBorder}`,
      borderRadius: "6px",
      color: t.error,
      marginBottom: "16px"
    },
    loading: {
      padding: "24px",
      textAlign: "center",
      color: t.textMuted
    },
    details: {
      marginBottom: "24px"
    },
    title: {
      margin: "0 0 16px 0",
      fontSize: "18px",
      fontWeight: 600,
      color: t.text
    },
    detailRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "8px 0",
      borderBottom: `1px solid ${t.borderLight}`
    },
    label: {
      color: t.textMuted,
      fontSize: "14px"
    },
    value: {
      color: t.text,
      fontSize: "14px",
      fontWeight: 500
    },
    statusBadge: {
      padding: "4px 8px",
      borderRadius: "4px",
      color: "#fff",
      fontSize: "12px",
      fontWeight: 500,
      textTransform: "capitalize"
    },
    cancelNotice: {
      marginTop: "12px",
      padding: "8px 12px",
      backgroundColor: t.warningBg,
      border: `1px solid ${t.warningBorder}`,
      borderRadius: "6px",
      color: t.warningText,
      fontSize: "13px"
    },
    prorationPreview: {
      padding: "16px",
      backgroundColor: t.bgMuted,
      borderRadius: "8px",
      marginBottom: "24px"
    },
    previewTitle: {
      margin: "0 0 12px 0",
      fontSize: "16px",
      fontWeight: 600,
      color: t.text
    },
    previewDetails: {
      marginBottom: "16px"
    },
    previewRow: {
      display: "flex",
      justifyContent: "space-between",
      padding: "6px 0",
      fontSize: "14px",
      color: t.textMuted
    },
    previewTotal: {
      borderTop: `1px solid ${t.border}`,
      marginTop: "8px",
      paddingTop: "12px",
      fontWeight: 600,
      color: t.text
    },
    previewActions: {
      display: "flex",
      gap: "12px",
      justifyContent: "flex-end"
    },
    cancelButton: {
      padding: "8px 16px",
      backgroundColor: t.bg,
      border: `1px solid ${t.buttonBorder}`,
      borderRadius: "6px",
      color: t.buttonText,
      cursor: "pointer",
      fontSize: "14px"
    },
    confirmButton: {
      padding: "8px 16px",
      backgroundColor: t.primary,
      border: "none",
      borderRadius: "6px",
      color: "#fff",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: 500
    },
    plansSection: {
      marginBottom: "24px"
    },
    plansTitle: {
      margin: "0 0 12px 0",
      fontSize: "16px",
      fontWeight: 600,
      color: t.text
    },
    plansList: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
      gap: "16px"
    },
    planCard: {
      padding: "16px",
      backgroundColor: t.bg,
      border: `1px solid ${t.border}`,
      borderRadius: "8px",
      textAlign: "center"
    },
    currentPlan: {
      borderColor: t.primary,
      backgroundColor: t.bgHighlight
    },
    planName: {
      fontSize: "16px",
      fontWeight: 600,
      color: t.text,
      marginBottom: "4px"
    },
    planPrice: {
      fontSize: "14px",
      color: t.textMuted,
      marginBottom: "8px"
    },
    planDescription: {
      fontSize: "12px",
      color: t.textFaint,
      marginBottom: "12px"
    },
    currentBadge: {
      display: "inline-block",
      padding: "4px 8px",
      backgroundColor: t.primary,
      color: "#fff",
      borderRadius: "4px",
      fontSize: "12px",
      fontWeight: 500
    },
    changePlanButton: {
      padding: "8px 16px",
      backgroundColor: t.buttonBg,
      border: `1px solid ${t.buttonBorder}`,
      borderRadius: "6px",
      color: t.buttonText,
      cursor: "pointer",
      fontSize: "14px",
      width: "100%"
    },
    actions: {
      display: "flex",
      gap: "12px",
      justifyContent: "flex-end",
      paddingTop: "16px",
      borderTop: `1px solid ${t.border}`
    },
    portalButton: {
      padding: "10px 20px",
      backgroundColor: t.primary,
      border: "none",
      borderRadius: "6px",
      color: "#fff",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: 500
    },
    cancelSubscriptionButton: {
      padding: "10px 20px",
      backgroundColor: t.bg,
      border: `1px solid ${t.error}`,
      borderRadius: "6px",
      color: t.error,
      cursor: "pointer",
      fontSize: "14px"
    }
  };
}
function In(e, t) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: t.toUpperCase()
  }).format(e / 100);
}
function _l(e) {
  return new Date(e).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}
function Cm(e) {
  switch (e) {
    case "active":
      return "#22c55e";
    case "trialing":
      return "#3b82f6";
    case "past_due":
      return "#f59e0b";
    case "canceled":
    case "expired":
      return "#ef4444";
    default:
      return "#6b7280";
  }
}
function Nm({
  preview: e,
  onConfirm: t,
  onCancel: n,
  isLoading: r,
  styles: o
}) {
  const a = e.immediateAmount < 0;
  return /* @__PURE__ */ p("div", { className: "cedros-proration-preview", style: o.prorationPreview, children: [
    /* @__PURE__ */ s("h4", { style: o.previewTitle, children: "Change Preview" }),
    /* @__PURE__ */ p("div", { style: o.previewDetails, children: [
      /* @__PURE__ */ p("div", { style: o.previewRow, children: [
        /* @__PURE__ */ s("span", { children: "Current plan:" }),
        /* @__PURE__ */ p("span", { children: [
          In(e.currentPlanPrice, e.currency),
          "/period"
        ] })
      ] }),
      /* @__PURE__ */ p("div", { style: o.previewRow, children: [
        /* @__PURE__ */ s("span", { children: "New plan:" }),
        /* @__PURE__ */ p("span", { children: [
          In(e.newPlanPrice, e.currency),
          "/period"
        ] })
      ] }),
      /* @__PURE__ */ p("div", { style: o.previewRow, children: [
        /* @__PURE__ */ s("span", { children: "Days remaining:" }),
        /* @__PURE__ */ p("span", { children: [
          e.daysRemaining,
          " days"
        ] })
      ] }),
      e.prorationDetails && /* @__PURE__ */ p(Ct, { children: [
        /* @__PURE__ */ p("div", { style: o.previewRow, children: [
          /* @__PURE__ */ s("span", { children: "Unused credit:" }),
          /* @__PURE__ */ p("span", { children: [
            "-",
            In(e.prorationDetails.unusedCredit, e.currency)
          ] })
        ] }),
        /* @__PURE__ */ p("div", { style: o.previewRow, children: [
          /* @__PURE__ */ s("span", { children: "New plan cost:" }),
          /* @__PURE__ */ s("span", { children: In(e.prorationDetails.newPlanCost, e.currency) })
        ] })
      ] }),
      /* @__PURE__ */ p("div", { style: { ...o.previewRow, ...o.previewTotal }, children: [
        /* @__PURE__ */ s("span", { children: a ? "Credit to account:" : "Amount due now:" }),
        /* @__PURE__ */ s("span", { style: { color: a ? "#22c55e" : "#ef4444" }, children: In(Math.abs(e.immediateAmount), e.currency) })
      ] }),
      /* @__PURE__ */ p("div", { style: o.previewRow, children: [
        /* @__PURE__ */ s("span", { children: "Effective date:" }),
        /* @__PURE__ */ s("span", { children: _l(e.effectiveDate) })
      ] })
    ] }),
    /* @__PURE__ */ p("div", { style: o.previewActions, children: [
      /* @__PURE__ */ s("button", { onClick: n, style: o.cancelButton, disabled: r, children: "Cancel" }),
      /* @__PURE__ */ s("button", { onClick: t, style: o.confirmButton, disabled: r, children: r ? "Processing..." : "Confirm Change" })
    ] })
  ] });
}
function jN({
  resource: e,
  userId: t,
  availablePlans: n = [],
  onSubscriptionChanged: r,
  onSubscriptionCanceled: o,
  billingPortalReturnUrl: a,
  showBillingPortal: i = !1,
  className: c,
  style: l
}) {
  const { mode: d } = bn(), f = Ne(() => Sm(d === "dark"), [d]), {
    subscription: u,
    changePreview: h,
    status: g,
    error: b,
    loadSubscription: v,
    previewChange: y,
    changeSubscription: w,
    cancelSubscription: k,
    openBillingPortal: _,
    clearPreview: x
  } = xm();
  Te(() => {
    v(e, t);
  }, [e, t, v]);
  const S = Jt(null), I = ae(
    async (T, D) => {
      S.current = { resource: T, interval: D }, await y(e, T, t, D);
    },
    [e, t, y]
  ), R = ae(async () => {
    if (!h) return;
    const T = S.current;
    (await w({
      newResource: T?.resource || e,
      newInterval: T?.interval,
      immediate: !0
    }))?.success && T && T.interval && (r?.(T.resource, T.interval), S.current = null);
  }, [h, e, w, r]), E = ae(
    async (T) => {
      (await k(T))?.success && o?.();
    },
    [k, o]
  ), P = ae(() => {
    _(t, a);
  }, [t, a, _]), O = g === "loading";
  return /* @__PURE__ */ p("div", { className: `cedros-subscription-panel ${c || ""}`, style: { ...f.container, ...l }, children: [
    b && /* @__PURE__ */ s("div", { className: "cedros-subscription-error", style: f.error, children: b }),
    O && !u && /* @__PURE__ */ s("div", { className: "cedros-subscription-loading", style: f.loading, children: "Loading subscription..." }),
    u && /* @__PURE__ */ p(Ct, { children: [
      /* @__PURE__ */ p("div", { className: "cedros-subscription-details", style: f.details, children: [
        /* @__PURE__ */ s("h3", { style: f.title, children: "Current Subscription" }),
        /* @__PURE__ */ p("div", { style: f.detailRow, children: [
          /* @__PURE__ */ s("span", { style: f.label, children: "Plan:" }),
          /* @__PURE__ */ s("span", { style: f.value, children: u.resource })
        ] }),
        /* @__PURE__ */ p("div", { style: f.detailRow, children: [
          /* @__PURE__ */ s("span", { style: f.label, children: "Status:" }),
          /* @__PURE__ */ s(
            "span",
            {
              style: {
                ...f.statusBadge,
                backgroundColor: Cm(u.status)
              },
              children: u.status
            }
          )
        ] }),
        /* @__PURE__ */ p("div", { style: f.detailRow, children: [
          /* @__PURE__ */ s("span", { style: f.label, children: "Price:" }),
          /* @__PURE__ */ p("span", { style: f.value, children: [
            In(u.pricePerPeriod, u.currency),
            "/",
            u.interval
          ] })
        ] }),
        /* @__PURE__ */ p("div", { style: f.detailRow, children: [
          /* @__PURE__ */ s("span", { style: f.label, children: "Current period ends:" }),
          /* @__PURE__ */ s("span", { style: f.value, children: _l(u.currentPeriodEnd) })
        ] }),
        u.cancelAtPeriodEnd && /* @__PURE__ */ s("div", { style: f.cancelNotice, children: "Subscription will cancel at end of current period" })
      ] }),
      h && /* @__PURE__ */ s(
        Nm,
        {
          preview: h,
          onConfirm: R,
          onCancel: x,
          isLoading: O,
          styles: f
        }
      ),
      n.length > 0 && !h && /* @__PURE__ */ p("div", { className: "cedros-available-plans", style: f.plansSection, children: [
        /* @__PURE__ */ s("h4", { style: f.plansTitle, children: "Available Plans" }),
        /* @__PURE__ */ s("div", { style: f.plansList, children: n.map((T) => {
          const D = T.resource === u.resource;
          return /* @__PURE__ */ p(
            "div",
            {
              style: {
                ...f.planCard,
                ...D ? f.currentPlan : {}
              },
              children: [
                /* @__PURE__ */ s("div", { style: f.planName, children: T.name }),
                /* @__PURE__ */ p("div", { style: f.planPrice, children: [
                  In(T.price, T.currency),
                  "/",
                  T.interval
                ] }),
                T.description && /* @__PURE__ */ s("div", { style: f.planDescription, children: T.description }),
                D ? /* @__PURE__ */ s("span", { style: f.currentBadge, children: "Current Plan" }) : /* @__PURE__ */ s(
                  "button",
                  {
                    onClick: () => I(T.resource, T.interval),
                    style: f.changePlanButton,
                    disabled: O,
                    children: T.price > u.pricePerPeriod ? "Upgrade" : "Downgrade"
                  }
                )
              ]
            },
            T.resource
          );
        }) })
      ] }),
      /* @__PURE__ */ p("div", { className: "cedros-subscription-actions", style: f.actions, children: [
        i && u.paymentMethod === "stripe" && /* @__PURE__ */ s("button", { onClick: P, style: f.portalButton, disabled: O, children: "Manage Billing" }),
        u.status === "active" && !u.cancelAtPeriodEnd && /* @__PURE__ */ s(
          "button",
          {
            onClick: () => E(!1),
            style: f.cancelSubscriptionButton,
            disabled: O,
            children: "Cancel Subscription"
          }
        )
      ] })
    ] })
  ] });
}
function Em() {
  if (typeof window > "u")
    return {
      passed: !0,
      severity: "info",
      message: "HTTPS check skipped (SSR environment)"
    };
  const e = window.location.protocol === "https:", t = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  return e || t ? {
    passed: !0,
    severity: "info",
    message: "HTTPS enforced"
  } : {
    passed: !1,
    severity: "error",
    message: "Page not served over HTTPS",
    recommendation: "Enable HTTPS for all payment pages. Stripe.js requires HTTPS in production."
  };
}
function Am() {
  return typeof document > "u" ? {
    passed: !0,
    severity: "info",
    message: "CSP check skipped (SSR environment)"
  } : document.querySelector('meta[http-equiv="Content-Security-Policy"]') ? {
    passed: !0,
    severity: "info",
    message: "Content Security Policy detected"
  } : {
    passed: !1,
    severity: "warning",
    message: "No Content Security Policy detected",
    recommendation: "Configure CSP headers to protect against XSS and CDN compromise. Use generateCSP() helper from @cedros/pay-react."
  };
}
function Pm() {
  return process.env.NODE_ENV === "development" || typeof window < "u" && window.location.hostname === "localhost" ? {
    passed: !0,
    severity: "info",
    message: "Running in development mode (some security checks relaxed)"
  } : {
    passed: !0,
    severity: "info",
    message: "Running in production mode"
  };
}
function Im() {
  return {
    passed: !0,
    severity: "info",
    message: "Stripe.js loaded via @stripe/stripe-js package (CSP recommended, not SRI)",
    recommendation: "Ensure CSP script-src includes https://js.stripe.com"
  };
}
function Tm() {
  return typeof window > "u" ? {
    passed: !0,
    severity: "info",
    message: "Mixed content check skipped (SSR environment)"
  } : window.location.protocol === "https:" ? {
    passed: !0,
    severity: "info",
    message: "Mixed content protection active (HTTPS page)"
  } : {
    passed: !0,
    severity: "info",
    message: "Mixed content check skipped (HTTP page)"
  };
}
function BN() {
  const e = [
    Em(),
    Am(),
    Pm(),
    Im(),
    Tm()
  ], t = e.some((a) => a.severity === "error" && !a.passed), n = e.some((a) => a.severity === "warning" && !a.passed);
  let r, o;
  return t ? (r = "vulnerable", o = "Security issues detected. Review errors and apply recommendations.") : n ? (r = "warnings", o = "Minor security warnings detected. Consider applying recommendations.") : (r = "secure", o = "All security checks passed."), {
    checks: e,
    overallStatus: r,
    summary: o
  };
}
function UN(e) {
  process.env.NODE_ENV !== "production" && (console.group("🔒 Cedros Pay Security Report"), console.log(`Status: ${e.overallStatus.toUpperCase()}`), console.log(`Summary: ${e.summary}`), console.log(""), e.checks.forEach((t) => {
    const n = t.passed ? "✅" : t.severity === "error" ? "❌" : "⚠️";
    console.log(`${n} ${t.message}`), t.recommendation && console.log(`   → ${t.recommendation}`);
  }), console.groupEnd());
}
const VN = {
  CSP: "Use generateCSP() from @cedros/pay-react to generate Content Security Policy headers",
  HTTPS: "Always serve payment pages over HTTPS in production",
  PACKAGE_UPDATES: "Keep @stripe/stripe-js and @cedros/pay-react updated for security patches",
  AUDIT: "Run npm audit regularly to check for known vulnerabilities",
  MONITORING: "Monitor Stripe security advisories and apply updates promptly",
  NO_SRI: "Do NOT use SRI hashes for Stripe.js - use CSP instead"
}, Ea = L.createContext(null);
function Le() {
  const e = L.useContext(Ea);
  if (!e)
    throw new Error("useCedrosShop must be used within CedrosShopProvider");
  return e;
}
function Aa() {
  return L.useContext(Ea);
}
function Rm({
  config: e,
  children: t
}) {
  const n = L.useMemo(() => ({ config: e }), [e]);
  return /* @__PURE__ */ s(Ea.Provider, { value: n, children: t });
}
function It(e) {
  return new Promise((t) => setTimeout(t, e));
}
const kl = [
  {
    id: "cat_all",
    slug: "all",
    name: "All Products",
    description: "Everything in the catalog."
  },
  {
    id: "cat_apparel",
    slug: "apparel",
    name: "Apparel",
    description: "Soft goods and daily wear."
  },
  {
    id: "cat_accessories",
    slug: "accessories",
    name: "Accessories",
    description: "Carry, attach, decorate."
  }
], xo = [
  {
    id: "p_tee",
    slug: "cedros-tee",
    title: "Cedros Tee",
    description: "A heavyweight tee with a clean silhouette.",
    images: [
      { url: "https://picsum.photos/seed/cedros-tee/900/900", alt: "Cedros Tee" },
      { url: "https://picsum.photos/seed/cedros-tee-2/900/900", alt: "Cedros Tee detail" }
    ],
    price: 38,
    currency: "USD",
    tags: ["new", "cotton"],
    categoryIds: ["cat_apparel"],
    compareAtPrice: 48,
    inventoryStatus: "in_stock",
    variants: [
      { id: "v_tee_s", title: "Small / Black", options: { Size: "S", Color: "Black" } },
      { id: "v_tee_m", title: "Medium / Black", options: { Size: "M", Color: "Black" } },
      { id: "v_tee_l", title: "Large / Black", options: { Size: "L", Color: "Black" } }
    ],
    shippingProfile: "physical"
  },
  {
    id: "p_crewneck",
    slug: "cedros-crewneck",
    title: "Cedros Crewneck",
    description: "Midweight fleece with a relaxed fit and embroidered mark.",
    images: [{ url: "https://picsum.photos/seed/cedros-crewneck/900/900", alt: "Cedros Crewneck" }],
    price: 64,
    currency: "USD",
    tags: ["fleece", "core"],
    categoryIds: ["cat_apparel"],
    inventoryStatus: "in_stock",
    compareAtPrice: 78,
    variants: [
      { id: "v_crew_s", title: "Small / Heather", options: { Size: "S", Color: "Heather" } },
      { id: "v_crew_m", title: "Medium / Heather", options: { Size: "M", Color: "Heather" } },
      { id: "v_crew_l", title: "Large / Heather", options: { Size: "L", Color: "Heather" } }
    ],
    shippingProfile: "physical"
  },
  {
    id: "p_hoodie",
    slug: "cedros-hoodie",
    title: "Cedros Hoodie",
    description: "Pullover hoodie with soft interior and structured hood.",
    images: [
      { url: "https://picsum.photos/seed/cedros-hoodie/900/900", alt: "Cedros Hoodie" },
      { url: "https://picsum.photos/seed/cedros-hoodie-2/900/900", alt: "Cedros Hoodie detail" }
    ],
    price: 74,
    currency: "USD",
    tags: ["fleece", "new"],
    categoryIds: ["cat_apparel"],
    inventoryStatus: "low",
    variants: [
      { id: "v_hoodie_s", title: "Small / Black", options: { Size: "S", Color: "Black" } },
      { id: "v_hoodie_m", title: "Medium / Black", options: { Size: "M", Color: "Black" } },
      { id: "v_hoodie_l", title: "Large / Black", options: { Size: "L", Color: "Black" } }
    ],
    shippingProfile: "physical"
  },
  {
    id: "p_cap",
    slug: "cedros-cap",
    title: "Cedros Cap",
    description: "Unstructured cap with adjustable strap and curved brim.",
    images: [{ url: "https://picsum.photos/seed/cedros-cap/900/900", alt: "Cedros Cap" }],
    price: 28,
    currency: "USD",
    tags: ["core"],
    categoryIds: ["cat_apparel"],
    inventoryStatus: "in_stock",
    shippingProfile: "physical"
  },
  {
    id: "p_socks",
    slug: "cedros-socks",
    title: "Cedros Socks",
    description: "Rib-knit socks designed for everyday comfort.",
    images: [{ url: "https://picsum.photos/seed/cedros-socks/900/900", alt: "Cedros Socks" }],
    price: 14,
    currency: "USD",
    tags: ["cotton"],
    categoryIds: ["cat_apparel"],
    inventoryStatus: "in_stock",
    shippingProfile: "physical"
  },
  {
    id: "p_tote",
    slug: "cedros-tote",
    title: "Cedros Tote",
    description: "Heavy canvas tote with reinforced handles.",
    images: [{ url: "https://picsum.photos/seed/cedros-tote/900/900", alt: "Cedros Tote" }],
    price: 32,
    currency: "USD",
    tags: ["gift", "canvas"],
    categoryIds: ["cat_accessories"],
    inventoryStatus: "in_stock",
    shippingProfile: "physical"
  },
  {
    id: "p_stickers",
    slug: "cedros-sticker-pack",
    title: "Sticker Pack",
    description: "Five durable vinyl stickers for laptops and water bottles.",
    images: [{ url: "https://picsum.photos/seed/cedros-stickers/900/900", alt: "Sticker Pack" }],
    price: 8,
    currency: "USD",
    tags: ["gift"],
    categoryIds: ["cat_accessories"],
    inventoryStatus: "in_stock",
    shippingProfile: "physical"
  },
  {
    id: "p_keychain",
    slug: "cedros-keychain",
    title: "Enamel Keychain",
    description: "Polished enamel keychain with a subtle mark.",
    images: [{ url: "https://picsum.photos/seed/cedros-keychain/900/900", alt: "Enamel Keychain" }],
    price: 12,
    currency: "USD",
    tags: ["gift"],
    categoryIds: ["cat_accessories"],
    inventoryStatus: "low",
    shippingProfile: "physical"
  },
  {
    id: "p_lanyard",
    slug: "cedros-lanyard",
    title: "Woven Lanyard",
    description: "Soft woven lanyard with swivel clasp.",
    images: [{ url: "https://picsum.photos/seed/cedros-lanyard/900/900", alt: "Woven Lanyard" }],
    price: 10,
    currency: "USD",
    tags: ["core"],
    categoryIds: ["cat_accessories"],
    inventoryStatus: "in_stock",
    shippingProfile: "physical"
  },
  {
    id: "p_notebook",
    slug: "cedros-notebook",
    title: "Dot Grid Notebook",
    description: "Lay-flat notebook for sketches, notes, and plans.",
    images: [{ url: "https://picsum.photos/seed/cedros-notebook/900/900", alt: "Dot Grid Notebook" }],
    price: 18,
    currency: "USD",
    tags: ["gift"],
    categoryIds: ["cat_accessories"],
    inventoryStatus: "in_stock",
    shippingProfile: "physical"
  },
  {
    id: "p_waterbottle",
    slug: "cedros-water-bottle",
    title: "Insulated Bottle",
    description: "Vacuum-insulated bottle that keeps drinks cold for hours.",
    images: [{ url: "https://picsum.photos/seed/cedros-bottle/900/900", alt: "Insulated Bottle" }],
    price: 36,
    currency: "USD",
    tags: ["gift", "new"],
    categoryIds: ["cat_accessories"],
    inventoryStatus: "backorder",
    shippingProfile: "physical"
  },
  {
    id: "p_posters",
    slug: "cedros-poster-set",
    title: "Poster Set",
    description: "Two prints on thick matte stock.",
    images: [{ url: "https://picsum.photos/seed/cedros-posters/900/900", alt: "Poster Set" }],
    price: 24,
    currency: "USD",
    tags: ["gift", "limited"],
    categoryIds: ["cat_accessories"],
    inventoryStatus: "out_of_stock",
    shippingProfile: "physical"
  },
  {
    id: "p_pins",
    slug: "cedros-pin-set",
    title: "Pin Set",
    description: "Two enamel pins with rubber backings.",
    images: [{ url: "https://picsum.photos/seed/cedros-pins/900/900", alt: "Pin Set" }],
    price: 16,
    currency: "USD",
    tags: ["gift"],
    categoryIds: ["cat_accessories"],
    inventoryStatus: "in_stock",
    shippingProfile: "physical"
  },
  {
    id: "p_brandbook",
    slug: "cedros-brand-book",
    title: "Brand Book (PDF)",
    description: "A compact brand book: typography, color, layout, and voice.",
    images: [{ url: "https://picsum.photos/seed/cedros-brandbook/900/900", alt: "Brand Book cover" }],
    price: 19,
    currency: "USD",
    tags: ["digital"],
    categoryIds: ["cat_accessories"],
    inventoryStatus: "in_stock",
    shippingProfile: "digital",
    checkoutRequirements: { email: "optional", name: "none", phone: "none", shippingAddress: !1, billingAddress: !1 },
    fulfillment: {
      type: "digital_download",
      notes: "This is a digital product and will be downloadable from your account after purchase."
    }
  },
  {
    id: "p_wallpaper",
    slug: "cedros-wallpaper-pack",
    title: "Wallpaper Pack",
    description: "A set of desktop + mobile wallpapers in multiple colorways.",
    images: [{ url: "https://picsum.photos/seed/cedros-wallpaper/900/900", alt: "Wallpaper Pack" }],
    price: 6,
    currency: "USD",
    tags: ["digital", "new"],
    categoryIds: ["cat_accessories"],
    inventoryStatus: "in_stock",
    shippingProfile: "digital"
  },
  {
    id: "p_longsleeve",
    slug: "cedros-long-sleeve",
    title: "Long Sleeve Tee",
    description: "Soft long sleeve tee with rib cuff and relaxed drape.",
    images: [{ url: "https://picsum.photos/seed/cedros-longsleeve/900/900", alt: "Long Sleeve Tee" }],
    price: 44,
    currency: "USD",
    tags: ["cotton"],
    categoryIds: ["cat_apparel"],
    inventoryStatus: "in_stock",
    shippingProfile: "physical"
  },
  {
    id: "p_shorts",
    slug: "cedros-shorts",
    title: "Everyday Shorts",
    description: "Lightweight shorts with a comfortable waistband.",
    images: [{ url: "https://picsum.photos/seed/cedros-shorts/900/900", alt: "Everyday Shorts" }],
    price: 40,
    currency: "USD",
    tags: ["new"],
    categoryIds: ["cat_apparel"],
    inventoryStatus: "in_stock",
    shippingProfile: "physical"
  },
  {
    id: "p_beanie",
    slug: "cedros-beanie",
    title: "Rib Beanie",
    description: "Warm rib beanie with a clean folded cuff.",
    images: [{ url: "https://picsum.photos/seed/cedros-beanie/900/900", alt: "Rib Beanie" }],
    price: 20,
    currency: "USD",
    tags: ["core"],
    categoryIds: ["cat_apparel"],
    inventoryStatus: "low",
    shippingProfile: "physical"
  },
  {
    id: "p_jacket",
    slug: "cedros-coach-jacket",
    title: "Coach Jacket",
    description: "Lightweight jacket with snap front and subtle sheen.",
    images: [{ url: "https://picsum.photos/seed/cedros-jacket/900/900", alt: "Coach Jacket" }],
    price: 96,
    currency: "USD",
    tags: ["limited"],
    categoryIds: ["cat_apparel"],
    inventoryStatus: "backorder",
    shippingProfile: "physical"
  },
  {
    id: "p_mug",
    slug: "cedros-mug",
    title: "Cedros Mug",
    description: "Stoneware mug with a satin glaze.",
    images: [{ url: "https://picsum.photos/seed/cedros-mug/900/900", alt: "Cedros Mug" }],
    price: 22,
    currency: "USD",
    tags: ["gift"],
    categoryIds: ["cat_accessories"],
    inventoryStatus: "low",
    shippingProfile: "physical"
  },
  {
    id: "p_guide",
    slug: "cedros-field-guide",
    title: "Field Guide (Digital)",
    description: "A short digital guide to shipping delightful checkout flows.",
    images: [{ url: "https://picsum.photos/seed/cedros-guide/900/900", alt: "Field Guide cover" }],
    price: 12,
    currency: "USD",
    tags: ["digital"],
    categoryIds: ["cat_accessories"],
    inventoryStatus: "in_stock",
    shippingProfile: "digital"
  }
];
function Om(e, t) {
  let n = e;
  if (t.category && t.category !== "all") {
    const l = kl.find((d) => d.slug === t.category || d.id === t.category);
    l && (n = n.filter((d) => d.categoryIds.includes(l.id)));
  }
  if (t.search) {
    const l = t.search.toLowerCase();
    n = n.filter((d) => d.title.toLowerCase().includes(l) || d.description.toLowerCase().includes(l));
  }
  const r = t.filters ?? {}, o = r.tags;
  if (Array.isArray(o) && o.length > 0) {
    const l = new Set(o.map(String));
    n = n.filter((d) => d.tags?.some((f) => l.has(f)));
  }
  const a = typeof r.priceMin == "number" ? r.priceMin : void 0, i = typeof r.priceMax == "number" ? r.priceMax : void 0;
  return typeof a == "number" && (n = n.filter((l) => l.price >= a)), typeof i == "number" && (n = n.filter((l) => l.price <= i)), (typeof r.inStock == "boolean" ? r.inStock : void 0) === !0 && (n = n.filter((l) => l.inventoryStatus !== "out_of_stock")), n;
}
function Mm(e, t) {
  if (!t || t === "featured") return e;
  const n = [...e];
  return t === "price_asc" && n.sort((r, o) => r.price - o.price), t === "price_desc" && n.sort((r, o) => o.price - r.price), n;
}
function Lm(e, t, n) {
  const r = (t - 1) * n;
  return {
    items: e.slice(r, r + n),
    page: t,
    pageSize: n,
    total: e.length,
    hasNextPage: r + n < e.length
  };
}
function Dm(e) {
  const t = (/* @__PURE__ */ new Date()).toISOString(), n = e.cart.map((o) => {
    const a = xo.find((i) => i.id === o.resource || i.slug === o.resource) ?? xo[0];
    return {
      title: a.title,
      qty: o.quantity,
      unitPrice: a.price,
      currency: e.options.currency,
      imageUrl: a.images[0]?.url
    };
  }), r = n.reduce((o, a) => o + a.qty * a.unitPrice, 0);
  return {
    id: `ord_${Math.random().toString(16).slice(2)}`,
    createdAt: t,
    status: "paid",
    total: r,
    currency: e.options.currency,
    items: n,
    receiptUrl: e.options.successUrl
  };
}
function $m() {
  let e = [];
  const t = {};
  return {
    async listProducts(n) {
      await It(150);
      const r = n.page ?? 1, o = n.pageSize ?? 24, a = Om(xo, n), i = Mm(a, n.sort);
      return Lm(i, r, o);
    },
    async getProductBySlug(n) {
      return await It(100), xo.find((r) => r.slug === n) ?? null;
    },
    async listCategories() {
      return await It(80), kl;
    },
    async getOrderHistory() {
      return await It(120), e;
    },
    async getCart({ customerId: n }) {
      return await It(80), t[n] ?? { items: [] };
    },
    async mergeCart({ customerId: n, cart: r }) {
      await It(120);
      const o = t[n] ?? { items: [] }, a = /* @__PURE__ */ new Map(), i = (l) => {
        const d = `${l.productId}::${l.variantId ?? ""}`, f = a.get(d);
        f ? a.set(d, { ...f, qty: f.qty + l.qty }) : a.set(d, l);
      };
      for (const l of o.items) i(l);
      for (const l of r.items) i(l);
      const c = {
        items: Array.from(a.values()),
        promoCode: r.promoCode ?? o.promoCode
      };
      return t[n] = c, c;
    },
    async updateCart({ customerId: n, cart: r }) {
      await It(60), t[n] = r;
    },
    async createCheckoutSession(n) {
      await It(250);
      const r = Dm(n);
      if (e = [r, ...e].slice(0, 25), n.options.successUrl) {
        const o = new URL(n.options.successUrl, "http://localhost");
        return o.searchParams.set("demoOrderId", r.id), { kind: "redirect", url: o.toString().replace("http://localhost", "") };
      }
      return { kind: "custom", data: { orderId: r.id } };
    },
    async listSubscriptionTiers() {
      return await It(80), [
        {
          id: "tier_starter",
          title: "Starter",
          description: "For small shops getting started.",
          priceMonthly: 19,
          priceAnnual: 190,
          currency: "USD",
          features: ["Basic analytics", "Email support", "1 storefront"]
        },
        {
          id: "tier_growth",
          title: "Growth",
          description: "For teams iterating fast.",
          priceMonthly: 49,
          priceAnnual: 490,
          currency: "USD",
          features: ["Advanced analytics", "Priority support", "3 storefronts"],
          isPopular: !0
        },
        {
          id: "tier_enterprise",
          title: "Enterprise",
          description: "For high volume and custom needs.",
          priceMonthly: 199,
          priceAnnual: 1990,
          currency: "USD",
          features: ["SLA", "Dedicated success", "Unlimited storefronts"]
        }
      ];
    },
    async getSubscriptionStatus() {
      return await It(80), { isActive: !1 };
    },
    async createSubscriptionCheckoutSession(n) {
      return await It(200), n.successUrl ? { kind: "redirect", url: n.successUrl } : { kind: "custom", data: n };
    }
  };
}
const Wi = 50, zm = 4, Fm = 5, jm = 1e4, Bm = {
  maxRetries: 2,
  initialDelayMs: 100,
  backoffFactor: 2,
  maxDelayMs: 500,
  jitter: !1
};
function Sl(e) {
  return e.replace(/[_-]+/g, " ").trim().replace(/\b\w/g, (t) => t.toUpperCase());
}
function Um(e) {
  return e ? e.toUpperCase() : "USD";
}
function Vm(e) {
  if (e && (e === "in_stock" || e === "low" || e === "out_of_stock" || e === "backorder"))
    return e;
}
function Wm(e) {
  if (e && (e === "physical" || e === "digital"))
    return e;
}
function Hm(e) {
  const t = [];
  if (Array.isArray(e))
    for (const n of e)
      typeof n == "string" && t.push(n);
  else if (typeof e == "string") {
    const n = e.trim();
    if (n.startsWith("["))
      try {
        const r = JSON.parse(n);
        if (Array.isArray(r))
          for (const o of r)
            typeof o == "string" && t.push(o);
        else
          t.push(e);
      } catch {
        t.push(e);
      }
    else
      t.push(e);
  }
  return t.flatMap((n) => n.split(",")).map((n) => n.trim().toUpperCase()).filter(Boolean);
}
function Zn(e) {
  const t = Um(e.fiatCurrency), n = e.images && e.images.length ? e.images : e.imageUrl ? [{ url: e.imageUrl, alt: e.title }] : [], r = e.effectiveFiatAmountCents ?? e.fiatAmountCents ?? 0, o = e.compareAtAmountCents, a = e.metadata?.shippingCountries ?? e.metadata?.shipping_countries, i = Hm(a);
  return {
    id: e.id,
    slug: e.slug ?? e.id,
    title: e.title ?? Sl(e.id),
    description: e.description ?? "",
    images: n,
    price: r / 100,
    currency: t,
    tags: e.tags ?? [],
    categoryIds: e.categoryIds ?? [],
    inventoryStatus: Vm(e.inventoryStatus),
    inventoryQuantity: typeof e.inventoryQuantity == "number" ? e.inventoryQuantity : void 0,
    compareAtPrice: typeof o == "number" ? o / 100 : void 0,
    shippingProfile: Wm(e.shippingProfile),
    checkoutRequirements: e.checkoutRequirements,
    fulfillment: e.fulfillment,
    attributes: i.length ? {
      shippingCountries: i.join(",")
    } : void 0
  };
}
function mo(e) {
  if (Array.isArray(e)) return { products: e };
  const t = e.products ?? e.items ?? [], n = e.total ?? e.count;
  return { products: t, total: n };
}
async function Rt(e, t, n, r = {}) {
  const {
    body: o,
    headers: a,
    method: i = "GET",
    retryableRead: c = !1,
    timeoutMs: l = jm
  } = r, d = {};
  n && (d["X-API-Key"] = n), a && Object.assign(d, a);
  const f = async () => {
    const u = await Xs(
      `${e}${t}`,
      {
        body: o,
        headers: d,
        method: i
      },
      l
    );
    if (!u.ok) {
      const h = await u.text().catch(() => ""), g = new Error(`Request failed (${u.status}): ${h}`);
      throw g.status = u.status, g;
    }
    return u.json();
  };
  return c ? _p(f, {
    ...Bm,
    name: `paywall-read-${i.toLowerCase()}`
  }) : f();
}
async function Zm(e, t, n, r) {
  const o = await Rt(
    e,
    `/paywall/v1/products?limit=${n}&offset=${r}`,
    t,
    { retryableRead: !0 }
  );
  return mo(o);
}
async function Hi(e, t, n, r) {
  const { maxPages: o, pageSize: a } = n;
  for (let i = 0; i < o; i += 1) {
    const c = i * a, { products: l, total: d } = await Zm(e, t, a, c);
    if (l.length === 0 || r(l)) return;
    const f = typeof d == "number" && c + l.length >= d, u = l.length < a;
    if (f || u) return;
  }
}
function qm(e) {
  const t = async (d) => {
    const f = d.page ?? 1, u = d.pageSize ?? 24, h = u, g = (f - 1) * u, b = new URLSearchParams();
    b.set("limit", String(h)), b.set("offset", String(g)), d.search && b.set("search", d.search), d.category && b.set("category", d.category), d.sort && b.set("sort", d.sort), d.filters?.inStock && b.set("in_stock", "true"), d.filters?.minPrice != null && b.set("min_price", String(d.filters.minPrice)), d.filters?.maxPrice != null && b.set("max_price", String(d.filters.maxPrice));
    const v = d.filters?.tags, y = Array.isArray(v) ? v : typeof v == "string" ? [v] : [];
    y.length && b.set("tags", y.join(","));
    const w = await Rt(
      e.serverUrl,
      `/paywall/v1/products?${b.toString()}`,
      e.apiKey,
      { retryableRead: !0 }
    ), { products: k, total: _ } = mo(w);
    return {
      items: k.map(Zn),
      page: f,
      pageSize: u,
      total: _,
      hasNextPage: typeof _ == "number" ? g + h < _ : k.length === h
    };
  }, n = async (d) => {
    try {
      const f = await Rt(
        e.serverUrl,
        `/paywall/v1/products/by-slug/${encodeURIComponent(d)}`,
        e.apiKey,
        { retryableRead: !0 }
      );
      return Zn(f);
    } catch (f) {
      const u = f?.status;
      if (u !== 404 && u !== 405) throw f;
      try {
        const h = await Rt(
          e.serverUrl,
          `/paywall/v1/products/${encodeURIComponent(d)}`,
          e.apiKey,
          { retryableRead: !0 }
        );
        return Zn(h);
      } catch (h) {
        const g = h?.status;
        if (g !== 404 && g !== 405) throw h;
        let b;
        return await Hi(
          e.serverUrl,
          e.apiKey,
          {
            maxPages: zm,
            pageSize: Wi
          },
          (v) => (b = v.find((y) => y.slug === d || y.id === d), !!b)
        ), b ? Zn(b) : null;
      }
    }
  };
  return {
    listProducts: t,
    getProductBySlug: n,
    getProductsByIds: async (d) => {
      const f = Array.from(new Set(d.filter(Boolean)));
      if (f.length === 0) return /* @__PURE__ */ new Map();
      const u = /* @__PURE__ */ new Map();
      try {
        const b = new URLSearchParams();
        b.set("ids", f.join(",")), b.set("limit", String(f.length)), b.set("offset", "0");
        const v = await Rt(
          e.serverUrl,
          `/paywall/v1/products?${b.toString()}`,
          e.apiKey,
          { retryableRead: !0 }
        ), { products: y } = mo(v);
        for (const w of y) {
          const k = Zn(w);
          u.set(k.id, k), k.slug && k.slug !== k.id && u.set(k.slug, k);
        }
      } catch {
      }
      const h = f.filter((b) => !u.has(b));
      if (h.length === 0)
        return u;
      let g = h;
      try {
        const b = new Set(g);
        if (await Hi(
          e.serverUrl,
          e.apiKey,
          {
            maxPages: Fm,
            pageSize: Wi
          },
          (v) => {
            for (const y of v) {
              const w = Zn(y);
              !b.has(w.id) && !(w.slug && b.has(w.slug)) || (u.set(w.id, w), w.slug && w.slug !== w.id && u.set(w.slug, w), b.delete(w.id), w.slug && b.delete(w.slug));
            }
            return b.size === 0;
          }
        ), g = Array.from(b), g.length === 0)
          return u;
      } catch {
      }
      for (const b of g)
        try {
          const v = await n(b);
          v && (u.set(v.id, v), v.slug && v.slug !== v.id && u.set(v.slug, v));
        } catch {
        }
      return u;
    },
    listCategories: async () => {
      const d = await Rt(
        e.serverUrl,
        "/paywall/v1/products?limit=500&offset=0",
        e.apiKey,
        { retryableRead: !0 }
      ), { products: f } = mo(d), u = /* @__PURE__ */ new Set();
      for (const h of f)
        for (const g of h.categoryIds ?? []) u.add(g);
      return Array.from(u).map((h) => ({ id: h, slug: h, name: Sl(h) }));
    },
    getOrderHistory: async () => [],
    createCheckoutSession: async (d) => {
      throw new Error("createCheckoutSession is not implemented for paywall adapter");
    },
    getStorefrontSettings: async () => {
      try {
        return (await Rt(
          e.serverUrl,
          "/admin/config/shop",
          e.apiKey,
          { retryableRead: !0 }
        )).config ?? null;
      } catch {
        return null;
      }
    },
    getPaymentMethodsConfig: async () => {
      try {
        const [d, f, u] = await Promise.allSettled([
          Rt(e.serverUrl, "/admin/config/stripe", e.apiKey, { retryableRead: !0 }),
          Rt(e.serverUrl, "/admin/config/x402", e.apiKey, { retryableRead: !0 }),
          Rt(e.serverUrl, "/admin/config/cedros_login", e.apiKey, { retryableRead: !0 })
        ]), h = d.status === "fulfilled" ? !!d.value?.config?.enabled : !1, g = f.status === "fulfilled" ? !!f.value?.config?.enabled : !1, b = u.status === "fulfilled" ? !!u.value?.config?.enabled : !1;
        return {
          card: h,
          crypto: g,
          credits: b
        };
      } catch {
        return null;
      }
    },
    getAIRelatedProducts: async (d) => Rt(
      e.serverUrl,
      "/admin/ai/related-products",
      e.apiKey,
      {
        method: "POST",
        body: JSON.stringify(d),
        headers: { "Content-Type": "application/json" },
        retryableRead: !1
      }
    )
  };
}
function Gm(e) {
  throw new Error(`Unhandled cart action: ${JSON.stringify(e)}`);
}
function En(e) {
  return `${e.productId}::${e.variantId ?? ""}`;
}
const Ym = { items: [] };
function Qm(e, t) {
  switch (t.type) {
    case "cart/hydrate":
      return t.state;
    case "cart/add": {
      const n = Math.max(1, Math.floor(t.qty ?? 1)), r = En(t.item);
      return e.items.find((a) => En(a) === r) ? {
        ...e,
        items: e.items.map((a) => En(a) === r ? { ...a, qty: a.qty + n } : a)
      } : {
        ...e,
        items: [...e.items, { ...t.item, qty: n }]
      };
    }
    case "cart/remove": {
      const n = `${t.productId}::${t.variantId ?? ""}`;
      return {
        ...e,
        items: e.items.filter((r) => En(r) !== n)
      };
    }
    case "cart/setQty": {
      const n = Math.max(0, Math.floor(t.qty)), r = `${t.productId}::${t.variantId ?? ""}`;
      return n === 0 ? {
        ...e,
        items: e.items.filter((o) => En(o) !== r)
      } : {
        ...e,
        items: e.items.map((o) => En(o) === r ? { ...o, qty: n } : o)
      };
    }
    case "cart/clear":
      return { items: [], promoCode: void 0 };
    case "cart/setPromoCode":
      return { ...e, promoCode: t.promoCode || void 0 };
    case "cart/updateHold": {
      const n = `${t.productId}::${t.variantId ?? ""}`;
      return {
        ...e,
        items: e.items.map(
          (r) => En(r) === n ? { ...r, holdId: t.holdId, holdExpiresAt: t.holdExpiresAt } : r
        )
      };
    }
    default:
      return Gm(t);
  }
}
function Km(e) {
  return e.reduce((t, n) => t + n.qty, 0);
}
function Jm(e) {
  return e.reduce((t, n) => t + n.qty * n.unitPrice, 0);
}
function Zi() {
  try {
    return typeof window > "u" ? null : window.localStorage;
  } catch {
    return null;
  }
}
function Xm(e, t) {
  try {
    const n = e.getItem(t);
    return n ? JSON.parse(n) : null;
  } catch {
    return null;
  }
}
function eh(e, t, n) {
  try {
    return e.setItem(t, JSON.stringify(n)), !0;
  } catch (r) {
    return console.warn(`[cedros] Failed to write "${t}" to storage`, r), !1;
  }
}
const Cl = L.createContext(null);
function zt() {
  const e = L.useContext(Cl);
  if (!e) throw new Error("useCart must be used within CartProvider");
  return e;
}
function qi(e) {
  return !!e && typeof e == "object" && typeof e.productId == "string" && e.productId.length > 0 && typeof e.qty == "number" && e.qty > 0 && typeof e.unitPrice == "number" && typeof e.currency == "string" && typeof e.titleSnapshot == "string";
}
function th({ children: e }) {
  const { config: t } = Le(), n = t.cart?.storageKey ?? "cedros_shop_cart_v1", r = t.customer?.id, o = t.customer?.isSignedIn ?? !!r, a = t.cart?.syncDebounceMs ?? 800, i = !!t.adapter.getCartInventoryStatus, [c, l] = L.useReducer(Qm, Ym), d = L.useRef(c);
  d.current = c;
  const [f, u] = L.useState(!1), h = L.useRef(!1), g = L.useRef(null), b = L.useRef(null);
  L.useEffect(() => {
    const k = Zi();
    if (!k) return;
    const _ = Xm(k, n);
    if (_ && Array.isArray(_.items)) {
      const x = _.items.filter(qi);
      l({
        type: "cart/hydrate",
        state: {
          items: x,
          promoCode: typeof _.promoCode == "string" ? _.promoCode : void 0
        }
      });
    }
    u(!0);
  }, [n]), L.useEffect(() => {
    if (!f) return;
    const k = Zi();
    k && eh(k, n, c);
  }, [c, n, f]), L.useEffect(() => {
    if (!f || !o || !r || !t.adapter.mergeCart && !t.adapter.getCart || (b.current !== r && (h.current = !1, g.current = null, b.current = r), h.current)) return;
    let k = !1;
    return (async () => {
      try {
        const _ = t.adapter.mergeCart ? await t.adapter.mergeCart({ customerId: r, cart: d.current }) : await t.adapter.getCart({ customerId: r });
        if (k) return;
        if (_ && Array.isArray(_.items)) {
          h.current = !0;
          const x = { ..._, items: _.items.filter(qi) };
          l({ type: "cart/hydrate", state: x }), g.current = JSON.stringify(x);
        }
      } catch {
        k || (h.current = !1);
      }
    })(), () => {
      k = !0;
    };
  }, [t.adapter, r, f, o]), L.useEffect(() => {
    if (!f || !o || !r || !t.adapter.updateCart || !h.current || typeof window > "u") return;
    const k = JSON.stringify(c);
    if (g.current === k) return;
    const _ = window.setTimeout(() => {
      t.adapter.updateCart({ customerId: r, cart: c }).then(() => {
        g.current = k;
      }).catch((x) => {
        console.warn("[CedrosPay] Cart server sync failed:", x instanceof Error ? x.message : x);
      });
    }, a);
    return () => window.clearTimeout(_);
  }, [t.adapter, r, f, o, c, a]);
  const v = L.useCallback(
    (k, _) => {
      const x = c.items.find(
        (S) => S.productId === k && S.variantId === _
      );
      if (x)
        return { holdId: x.holdId, expiresAt: x.holdExpiresAt };
    },
    [c.items]
  ), y = L.useCallback(
    (k, _, x) => {
      l({
        type: "cart/updateHold",
        productId: k,
        variantId: _,
        holdExpiresAt: x
      });
    },
    []
  ), w = L.useMemo(() => {
    const k = Km(c.items), _ = Jm(c.items);
    return {
      items: c.items,
      promoCode: c.promoCode,
      count: k,
      subtotal: _,
      addItem: (x, S) => l({ type: "cart/add", item: x, qty: S }),
      removeItem: (x, S) => l({ type: "cart/remove", productId: x, variantId: S }),
      setQty: (x, S, I) => l({ type: "cart/setQty", productId: x, variantId: S, qty: I }),
      clear: () => l({ type: "cart/clear" }),
      setPromoCode: (x) => l({ type: "cart/setPromoCode", promoCode: x }),
      holdsSupported: i,
      getItemHold: v,
      updateItemHold: y
    };
  }, [c.items, c.promoCode, i, v, y]);
  return /* @__PURE__ */ s(Cl.Provider, { value: w, children: e });
}
function U(e, t, n) {
  function r(c, l) {
    if (c._zod || Object.defineProperty(c, "_zod", {
      value: {
        def: l,
        constr: i,
        traits: /* @__PURE__ */ new Set()
      },
      enumerable: !1
    }), c._zod.traits.has(e))
      return;
    c._zod.traits.add(e), t(c, l);
    const d = i.prototype, f = Object.keys(d);
    for (let u = 0; u < f.length; u++) {
      const h = f[u];
      h in c || (c[h] = d[h].bind(c));
    }
  }
  const o = n?.Parent ?? Object;
  class a extends o {
  }
  Object.defineProperty(a, "name", { value: e });
  function i(c) {
    var l;
    const d = n?.Parent ? new a() : this;
    r(d, c), (l = d._zod).deferred ?? (l.deferred = []);
    for (const f of d._zod.deferred)
      f();
    return d;
  }
  return Object.defineProperty(i, "init", { value: r }), Object.defineProperty(i, Symbol.hasInstance, {
    value: (c) => n?.Parent && c instanceof n.Parent ? !0 : c?._zod?.traits?.has(e)
  }), Object.defineProperty(i, "name", { value: e }), i;
}
class Xn extends Error {
  constructor() {
    super("Encountered Promise during synchronous parse. Use .parseAsync() instead.");
  }
}
class Nl extends Error {
  constructor(t) {
    super(`Encountered unidirectional transform during encode: ${t}`), this.name = "ZodEncodeError";
  }
}
const El = {};
function Rn(e) {
  return El;
}
function Al(e) {
  const t = Object.values(e).filter((r) => typeof r == "number");
  return Object.entries(e).filter(([r, o]) => t.indexOf(+r) === -1).map(([r, o]) => o);
}
function na(e, t) {
  return typeof t == "bigint" ? t.toString() : t;
}
function Pa(e) {
  return {
    get value() {
      {
        const t = e();
        return Object.defineProperty(this, "value", { value: t }), t;
      }
    }
  };
}
function Ia(e) {
  return e == null;
}
function Ta(e) {
  const t = e.startsWith("^") ? 1 : 0, n = e.endsWith("$") ? e.length - 1 : e.length;
  return e.slice(t, n);
}
function nh(e, t) {
  const n = (e.toString().split(".")[1] || "").length, r = t.toString();
  let o = (r.split(".")[1] || "").length;
  if (o === 0 && /\d?e-\d?/.test(r)) {
    const l = r.match(/\d?e-(\d?)/);
    l?.[1] && (o = Number.parseInt(l[1]));
  }
  const a = n > o ? n : o, i = Number.parseInt(e.toFixed(a).replace(".", "")), c = Number.parseInt(t.toFixed(a).replace(".", ""));
  return i % c / 10 ** a;
}
const Gi = Symbol("evaluating");
function Ce(e, t, n) {
  let r;
  Object.defineProperty(e, t, {
    get() {
      if (r !== Gi)
        return r === void 0 && (r = Gi, r = n()), r;
    },
    set(o) {
      Object.defineProperty(e, t, {
        value: o
        // configurable: true,
      });
    },
    configurable: !0
  });
}
function jn(e, t, n) {
  Object.defineProperty(e, t, {
    value: n,
    writable: !0,
    enumerable: !0,
    configurable: !0
  });
}
function wn(...e) {
  const t = {};
  for (const n of e) {
    const r = Object.getOwnPropertyDescriptors(n);
    Object.assign(t, r);
  }
  return Object.defineProperties({}, t);
}
function Yi(e) {
  return JSON.stringify(e);
}
function rh(e) {
  return e.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
}
const Pl = "captureStackTrace" in Error ? Error.captureStackTrace : (...e) => {
};
function _o(e) {
  return typeof e == "object" && e !== null && !Array.isArray(e);
}
const oh = Pa(() => {
  if (typeof navigator < "u" && navigator?.userAgent?.includes("Cloudflare"))
    return !1;
  try {
    const e = Function;
    return new e(""), !0;
  } catch {
    return !1;
  }
});
function Ir(e) {
  if (_o(e) === !1)
    return !1;
  const t = e.constructor;
  if (t === void 0 || typeof t != "function")
    return !0;
  const n = t.prototype;
  return !(_o(n) === !1 || Object.prototype.hasOwnProperty.call(n, "isPrototypeOf") === !1);
}
function Il(e) {
  return Ir(e) ? { ...e } : Array.isArray(e) ? [...e] : e;
}
const sh = /* @__PURE__ */ new Set(["string", "number", "symbol"]);
function nr(e) {
  return e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function xn(e, t, n) {
  const r = new e._zod.constr(t ?? e._zod.def);
  return (!t || n?.parent) && (r._zod.parent = e), r;
}
function de(e) {
  const t = e;
  if (!t)
    return {};
  if (typeof t == "string")
    return { error: () => t };
  if (t?.message !== void 0) {
    if (t?.error !== void 0)
      throw new Error("Cannot specify both `message` and `error` params");
    t.error = t.message;
  }
  return delete t.message, typeof t.error == "string" ? { ...t, error: () => t.error } : t;
}
function ah(e) {
  return Object.keys(e).filter((t) => e[t]._zod.optin === "optional" && e[t]._zod.optout === "optional");
}
const ih = {
  safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
  int32: [-2147483648, 2147483647],
  uint32: [0, 4294967295],
  float32: [-34028234663852886e22, 34028234663852886e22],
  float64: [-Number.MAX_VALUE, Number.MAX_VALUE]
};
function ch(e, t) {
  const n = e._zod.def, r = n.checks;
  if (r && r.length > 0)
    throw new Error(".pick() cannot be used on object schemas containing refinements");
  const a = wn(e._zod.def, {
    get shape() {
      const i = {};
      for (const c in t) {
        if (!(c in n.shape))
          throw new Error(`Unrecognized key: "${c}"`);
        t[c] && (i[c] = n.shape[c]);
      }
      return jn(this, "shape", i), i;
    },
    checks: []
  });
  return xn(e, a);
}
function lh(e, t) {
  const n = e._zod.def, r = n.checks;
  if (r && r.length > 0)
    throw new Error(".omit() cannot be used on object schemas containing refinements");
  const a = wn(e._zod.def, {
    get shape() {
      const i = { ...e._zod.def.shape };
      for (const c in t) {
        if (!(c in n.shape))
          throw new Error(`Unrecognized key: "${c}"`);
        t[c] && delete i[c];
      }
      return jn(this, "shape", i), i;
    },
    checks: []
  });
  return xn(e, a);
}
function dh(e, t) {
  if (!Ir(t))
    throw new Error("Invalid input to extend: expected a plain object");
  const n = e._zod.def.checks;
  if (n && n.length > 0) {
    const a = e._zod.def.shape;
    for (const i in t)
      if (Object.getOwnPropertyDescriptor(a, i) !== void 0)
        throw new Error("Cannot overwrite keys on object schemas containing refinements. Use `.safeExtend()` instead.");
  }
  const o = wn(e._zod.def, {
    get shape() {
      const a = { ...e._zod.def.shape, ...t };
      return jn(this, "shape", a), a;
    }
  });
  return xn(e, o);
}
function uh(e, t) {
  if (!Ir(t))
    throw new Error("Invalid input to safeExtend: expected a plain object");
  const n = wn(e._zod.def, {
    get shape() {
      const r = { ...e._zod.def.shape, ...t };
      return jn(this, "shape", r), r;
    }
  });
  return xn(e, n);
}
function fh(e, t) {
  const n = wn(e._zod.def, {
    get shape() {
      const r = { ...e._zod.def.shape, ...t._zod.def.shape };
      return jn(this, "shape", r), r;
    },
    get catchall() {
      return t._zod.def.catchall;
    },
    checks: []
    // delete existing checks
  });
  return xn(e, n);
}
function ph(e, t, n) {
  const o = t._zod.def.checks;
  if (o && o.length > 0)
    throw new Error(".partial() cannot be used on object schemas containing refinements");
  const i = wn(t._zod.def, {
    get shape() {
      const c = t._zod.def.shape, l = { ...c };
      if (n)
        for (const d in n) {
          if (!(d in c))
            throw new Error(`Unrecognized key: "${d}"`);
          n[d] && (l[d] = e ? new e({
            type: "optional",
            innerType: c[d]
          }) : c[d]);
        }
      else
        for (const d in c)
          l[d] = e ? new e({
            type: "optional",
            innerType: c[d]
          }) : c[d];
      return jn(this, "shape", l), l;
    },
    checks: []
  });
  return xn(t, i);
}
function mh(e, t, n) {
  const r = wn(t._zod.def, {
    get shape() {
      const o = t._zod.def.shape, a = { ...o };
      if (n)
        for (const i in n) {
          if (!(i in a))
            throw new Error(`Unrecognized key: "${i}"`);
          n[i] && (a[i] = new e({
            type: "nonoptional",
            innerType: o[i]
          }));
        }
      else
        for (const i in o)
          a[i] = new e({
            type: "nonoptional",
            innerType: o[i]
          });
      return jn(this, "shape", a), a;
    }
  });
  return xn(t, r);
}
function Jn(e, t = 0) {
  if (e.aborted === !0)
    return !0;
  for (let n = t; n < e.issues.length; n++)
    if (e.issues[n]?.continue !== !0)
      return !0;
  return !1;
}
function Tl(e, t) {
  return t.map((n) => {
    var r;
    return (r = n).path ?? (r.path = []), n.path.unshift(e), n;
  });
}
function Qr(e) {
  return typeof e == "string" ? e : e?.message;
}
function On(e, t, n) {
  const r = { ...e, path: e.path ?? [] };
  if (!e.message) {
    const o = Qr(e.inst?._zod.def?.error?.(e)) ?? Qr(t?.error?.(e)) ?? Qr(n.customError?.(e)) ?? Qr(n.localeError?.(e)) ?? "Invalid input";
    r.message = o;
  }
  return delete r.inst, delete r.continue, t?.reportInput || delete r.input, r;
}
function Ra(e) {
  return Array.isArray(e) ? "array" : typeof e == "string" ? "string" : "unknown";
}
function Tr(...e) {
  const [t, n, r] = e;
  return typeof t == "string" ? {
    message: t,
    code: "custom",
    input: n,
    inst: r
  } : { ...t };
}
const Rl = (e, t) => {
  e.name = "$ZodError", Object.defineProperty(e, "_zod", {
    value: e._zod,
    enumerable: !1
  }), Object.defineProperty(e, "issues", {
    value: t,
    enumerable: !1
  }), e.message = JSON.stringify(t, na, 2), Object.defineProperty(e, "toString", {
    value: () => e.message,
    enumerable: !1
  });
}, Ol = U("$ZodError", Rl), Ml = U("$ZodError", Rl, { Parent: Error });
function hh(e, t = (n) => n.message) {
  const n = {}, r = [];
  for (const o of e.issues)
    o.path.length > 0 ? (n[o.path[0]] = n[o.path[0]] || [], n[o.path[0]].push(t(o))) : r.push(t(o));
  return { formErrors: r, fieldErrors: n };
}
function gh(e, t = (n) => n.message) {
  const n = { _errors: [] }, r = (o) => {
    for (const a of o.issues)
      if (a.code === "invalid_union" && a.errors.length)
        a.errors.map((i) => r({ issues: i }));
      else if (a.code === "invalid_key")
        r({ issues: a.issues });
      else if (a.code === "invalid_element")
        r({ issues: a.issues });
      else if (a.path.length === 0)
        n._errors.push(t(a));
      else {
        let i = n, c = 0;
        for (; c < a.path.length; ) {
          const l = a.path[c];
          c === a.path.length - 1 ? (i[l] = i[l] || { _errors: [] }, i[l]._errors.push(t(a))) : i[l] = i[l] || { _errors: [] }, i = i[l], c++;
        }
      }
  };
  return r(e), n;
}
const Oa = (e) => (t, n, r, o) => {
  const a = r ? Object.assign(r, { async: !1 }) : { async: !1 }, i = t._zod.run({ value: n, issues: [] }, a);
  if (i instanceof Promise)
    throw new Xn();
  if (i.issues.length) {
    const c = new (o?.Err ?? e)(i.issues.map((l) => On(l, a, Rn())));
    throw Pl(c, o?.callee), c;
  }
  return i.value;
}, Ma = (e) => async (t, n, r, o) => {
  const a = r ? Object.assign(r, { async: !0 }) : { async: !0 };
  let i = t._zod.run({ value: n, issues: [] }, a);
  if (i instanceof Promise && (i = await i), i.issues.length) {
    const c = new (o?.Err ?? e)(i.issues.map((l) => On(l, a, Rn())));
    throw Pl(c, o?.callee), c;
  }
  return i.value;
}, Wo = (e) => (t, n, r) => {
  const o = r ? { ...r, async: !1 } : { async: !1 }, a = t._zod.run({ value: n, issues: [] }, o);
  if (a instanceof Promise)
    throw new Xn();
  return a.issues.length ? {
    success: !1,
    error: new (e ?? Ol)(a.issues.map((i) => On(i, o, Rn())))
  } : { success: !0, data: a.value };
}, yh = /* @__PURE__ */ Wo(Ml), Ho = (e) => async (t, n, r) => {
  const o = r ? Object.assign(r, { async: !0 }) : { async: !0 };
  let a = t._zod.run({ value: n, issues: [] }, o);
  return a instanceof Promise && (a = await a), a.issues.length ? {
    success: !1,
    error: new e(a.issues.map((i) => On(i, o, Rn())))
  } : { success: !0, data: a.value };
}, vh = /* @__PURE__ */ Ho(Ml), bh = (e) => (t, n, r) => {
  const o = r ? Object.assign(r, { direction: "backward" }) : { direction: "backward" };
  return Oa(e)(t, n, o);
}, wh = (e) => (t, n, r) => Oa(e)(t, n, r), xh = (e) => async (t, n, r) => {
  const o = r ? Object.assign(r, { direction: "backward" }) : { direction: "backward" };
  return Ma(e)(t, n, o);
}, _h = (e) => async (t, n, r) => Ma(e)(t, n, r), kh = (e) => (t, n, r) => {
  const o = r ? Object.assign(r, { direction: "backward" }) : { direction: "backward" };
  return Wo(e)(t, n, o);
}, Sh = (e) => (t, n, r) => Wo(e)(t, n, r), Ch = (e) => async (t, n, r) => {
  const o = r ? Object.assign(r, { direction: "backward" }) : { direction: "backward" };
  return Ho(e)(t, n, o);
}, Nh = (e) => async (t, n, r) => Ho(e)(t, n, r), Eh = /^[cC][^\s-]{8,}$/, Ah = /^[0-9a-z]+$/, Ph = /^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$/, Ih = /^[0-9a-vA-V]{20}$/, Th = /^[A-Za-z0-9]{27}$/, Rh = /^[a-zA-Z0-9_-]{21}$/, Oh = /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/, Mh = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/, Qi = (e) => e ? new RegExp(`^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${e}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`) : /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/, Lh = /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/, Dh = "^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$";
function $h() {
  return new RegExp(Dh, "u");
}
const zh = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/, Fh = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/, jh = /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/, Bh = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:?){0,6})\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/, Uh = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/, Ll = /^[A-Za-z0-9_-]*$/, Vh = /^\+[1-9]\d{6,14}$/, Dl = "(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))", Wh = /* @__PURE__ */ new RegExp(`^${Dl}$`);
function $l(e) {
  const t = "(?:[01]\\d|2[0-3]):[0-5]\\d";
  return typeof e.precision == "number" ? e.precision === -1 ? `${t}` : e.precision === 0 ? `${t}:[0-5]\\d` : `${t}:[0-5]\\d\\.\\d{${e.precision}}` : `${t}(?::[0-5]\\d(?:\\.\\d+)?)?`;
}
function Hh(e) {
  return new RegExp(`^${$l(e)}$`);
}
function Zh(e) {
  const t = $l({ precision: e.precision }), n = ["Z"];
  e.local && n.push(""), e.offset && n.push("([+-](?:[01]\\d|2[0-3]):[0-5]\\d)");
  const r = `${t}(?:${n.join("|")})`;
  return new RegExp(`^${Dl}T(?:${r})$`);
}
const qh = (e) => {
  const t = e ? `[\\s\\S]{${e?.minimum ?? 0},${e?.maximum ?? ""}}` : "[\\s\\S]*";
  return new RegExp(`^${t}$`);
}, Gh = /^-?\d+$/, Yh = /^-?\d+(?:\.\d+)?$/, Qh = /^[^A-Z]*$/, Kh = /^[^a-z]*$/, gt = /* @__PURE__ */ U("$ZodCheck", (e, t) => {
  var n;
  e._zod ?? (e._zod = {}), e._zod.def = t, (n = e._zod).onattach ?? (n.onattach = []);
}), zl = {
  number: "number",
  bigint: "bigint",
  object: "date"
}, Fl = /* @__PURE__ */ U("$ZodCheckLessThan", (e, t) => {
  gt.init(e, t);
  const n = zl[typeof t.value];
  e._zod.onattach.push((r) => {
    const o = r._zod.bag, a = (t.inclusive ? o.maximum : o.exclusiveMaximum) ?? Number.POSITIVE_INFINITY;
    t.value < a && (t.inclusive ? o.maximum = t.value : o.exclusiveMaximum = t.value);
  }), e._zod.check = (r) => {
    (t.inclusive ? r.value <= t.value : r.value < t.value) || r.issues.push({
      origin: n,
      code: "too_big",
      maximum: typeof t.value == "object" ? t.value.getTime() : t.value,
      input: r.value,
      inclusive: t.inclusive,
      inst: e,
      continue: !t.abort
    });
  };
}), jl = /* @__PURE__ */ U("$ZodCheckGreaterThan", (e, t) => {
  gt.init(e, t);
  const n = zl[typeof t.value];
  e._zod.onattach.push((r) => {
    const o = r._zod.bag, a = (t.inclusive ? o.minimum : o.exclusiveMinimum) ?? Number.NEGATIVE_INFINITY;
    t.value > a && (t.inclusive ? o.minimum = t.value : o.exclusiveMinimum = t.value);
  }), e._zod.check = (r) => {
    (t.inclusive ? r.value >= t.value : r.value > t.value) || r.issues.push({
      origin: n,
      code: "too_small",
      minimum: typeof t.value == "object" ? t.value.getTime() : t.value,
      input: r.value,
      inclusive: t.inclusive,
      inst: e,
      continue: !t.abort
    });
  };
}), Jh = /* @__PURE__ */ U("$ZodCheckMultipleOf", (e, t) => {
  gt.init(e, t), e._zod.onattach.push((n) => {
    var r;
    (r = n._zod.bag).multipleOf ?? (r.multipleOf = t.value);
  }), e._zod.check = (n) => {
    if (typeof n.value != typeof t.value)
      throw new Error("Cannot mix number and bigint in multiple_of check.");
    (typeof n.value == "bigint" ? n.value % t.value === BigInt(0) : nh(n.value, t.value) === 0) || n.issues.push({
      origin: typeof n.value,
      code: "not_multiple_of",
      divisor: t.value,
      input: n.value,
      inst: e,
      continue: !t.abort
    });
  };
}), Xh = /* @__PURE__ */ U("$ZodCheckNumberFormat", (e, t) => {
  gt.init(e, t), t.format = t.format || "float64";
  const n = t.format?.includes("int"), r = n ? "int" : "number", [o, a] = ih[t.format];
  e._zod.onattach.push((i) => {
    const c = i._zod.bag;
    c.format = t.format, c.minimum = o, c.maximum = a, n && (c.pattern = Gh);
  }), e._zod.check = (i) => {
    const c = i.value;
    if (n) {
      if (!Number.isInteger(c)) {
        i.issues.push({
          expected: r,
          format: t.format,
          code: "invalid_type",
          continue: !1,
          input: c,
          inst: e
        });
        return;
      }
      if (!Number.isSafeInteger(c)) {
        c > 0 ? i.issues.push({
          input: c,
          code: "too_big",
          maximum: Number.MAX_SAFE_INTEGER,
          note: "Integers must be within the safe integer range.",
          inst: e,
          origin: r,
          inclusive: !0,
          continue: !t.abort
        }) : i.issues.push({
          input: c,
          code: "too_small",
          minimum: Number.MIN_SAFE_INTEGER,
          note: "Integers must be within the safe integer range.",
          inst: e,
          origin: r,
          inclusive: !0,
          continue: !t.abort
        });
        return;
      }
    }
    c < o && i.issues.push({
      origin: "number",
      input: c,
      code: "too_small",
      minimum: o,
      inclusive: !0,
      inst: e,
      continue: !t.abort
    }), c > a && i.issues.push({
      origin: "number",
      input: c,
      code: "too_big",
      maximum: a,
      inclusive: !0,
      inst: e,
      continue: !t.abort
    });
  };
}), eg = /* @__PURE__ */ U("$ZodCheckMaxLength", (e, t) => {
  var n;
  gt.init(e, t), (n = e._zod.def).when ?? (n.when = (r) => {
    const o = r.value;
    return !Ia(o) && o.length !== void 0;
  }), e._zod.onattach.push((r) => {
    const o = r._zod.bag.maximum ?? Number.POSITIVE_INFINITY;
    t.maximum < o && (r._zod.bag.maximum = t.maximum);
  }), e._zod.check = (r) => {
    const o = r.value;
    if (o.length <= t.maximum)
      return;
    const i = Ra(o);
    r.issues.push({
      origin: i,
      code: "too_big",
      maximum: t.maximum,
      inclusive: !0,
      input: o,
      inst: e,
      continue: !t.abort
    });
  };
}), tg = /* @__PURE__ */ U("$ZodCheckMinLength", (e, t) => {
  var n;
  gt.init(e, t), (n = e._zod.def).when ?? (n.when = (r) => {
    const o = r.value;
    return !Ia(o) && o.length !== void 0;
  }), e._zod.onattach.push((r) => {
    const o = r._zod.bag.minimum ?? Number.NEGATIVE_INFINITY;
    t.minimum > o && (r._zod.bag.minimum = t.minimum);
  }), e._zod.check = (r) => {
    const o = r.value;
    if (o.length >= t.minimum)
      return;
    const i = Ra(o);
    r.issues.push({
      origin: i,
      code: "too_small",
      minimum: t.minimum,
      inclusive: !0,
      input: o,
      inst: e,
      continue: !t.abort
    });
  };
}), ng = /* @__PURE__ */ U("$ZodCheckLengthEquals", (e, t) => {
  var n;
  gt.init(e, t), (n = e._zod.def).when ?? (n.when = (r) => {
    const o = r.value;
    return !Ia(o) && o.length !== void 0;
  }), e._zod.onattach.push((r) => {
    const o = r._zod.bag;
    o.minimum = t.length, o.maximum = t.length, o.length = t.length;
  }), e._zod.check = (r) => {
    const o = r.value, a = o.length;
    if (a === t.length)
      return;
    const i = Ra(o), c = a > t.length;
    r.issues.push({
      origin: i,
      ...c ? { code: "too_big", maximum: t.length } : { code: "too_small", minimum: t.length },
      inclusive: !0,
      exact: !0,
      input: r.value,
      inst: e,
      continue: !t.abort
    });
  };
}), Zo = /* @__PURE__ */ U("$ZodCheckStringFormat", (e, t) => {
  var n, r;
  gt.init(e, t), e._zod.onattach.push((o) => {
    const a = o._zod.bag;
    a.format = t.format, t.pattern && (a.patterns ?? (a.patterns = /* @__PURE__ */ new Set()), a.patterns.add(t.pattern));
  }), t.pattern ? (n = e._zod).check ?? (n.check = (o) => {
    t.pattern.lastIndex = 0, !t.pattern.test(o.value) && o.issues.push({
      origin: "string",
      code: "invalid_format",
      format: t.format,
      input: o.value,
      ...t.pattern ? { pattern: t.pattern.toString() } : {},
      inst: e,
      continue: !t.abort
    });
  }) : (r = e._zod).check ?? (r.check = () => {
  });
}), rg = /* @__PURE__ */ U("$ZodCheckRegex", (e, t) => {
  Zo.init(e, t), e._zod.check = (n) => {
    t.pattern.lastIndex = 0, !t.pattern.test(n.value) && n.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "regex",
      input: n.value,
      pattern: t.pattern.toString(),
      inst: e,
      continue: !t.abort
    });
  };
}), og = /* @__PURE__ */ U("$ZodCheckLowerCase", (e, t) => {
  t.pattern ?? (t.pattern = Qh), Zo.init(e, t);
}), sg = /* @__PURE__ */ U("$ZodCheckUpperCase", (e, t) => {
  t.pattern ?? (t.pattern = Kh), Zo.init(e, t);
}), ag = /* @__PURE__ */ U("$ZodCheckIncludes", (e, t) => {
  gt.init(e, t);
  const n = nr(t.includes), r = new RegExp(typeof t.position == "number" ? `^.{${t.position}}${n}` : n);
  t.pattern = r, e._zod.onattach.push((o) => {
    const a = o._zod.bag;
    a.patterns ?? (a.patterns = /* @__PURE__ */ new Set()), a.patterns.add(r);
  }), e._zod.check = (o) => {
    o.value.includes(t.includes, t.position) || o.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "includes",
      includes: t.includes,
      input: o.value,
      inst: e,
      continue: !t.abort
    });
  };
}), ig = /* @__PURE__ */ U("$ZodCheckStartsWith", (e, t) => {
  gt.init(e, t);
  const n = new RegExp(`^${nr(t.prefix)}.*`);
  t.pattern ?? (t.pattern = n), e._zod.onattach.push((r) => {
    const o = r._zod.bag;
    o.patterns ?? (o.patterns = /* @__PURE__ */ new Set()), o.patterns.add(n);
  }), e._zod.check = (r) => {
    r.value.startsWith(t.prefix) || r.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "starts_with",
      prefix: t.prefix,
      input: r.value,
      inst: e,
      continue: !t.abort
    });
  };
}), cg = /* @__PURE__ */ U("$ZodCheckEndsWith", (e, t) => {
  gt.init(e, t);
  const n = new RegExp(`.*${nr(t.suffix)}$`);
  t.pattern ?? (t.pattern = n), e._zod.onattach.push((r) => {
    const o = r._zod.bag;
    o.patterns ?? (o.patterns = /* @__PURE__ */ new Set()), o.patterns.add(n);
  }), e._zod.check = (r) => {
    r.value.endsWith(t.suffix) || r.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "ends_with",
      suffix: t.suffix,
      input: r.value,
      inst: e,
      continue: !t.abort
    });
  };
}), lg = /* @__PURE__ */ U("$ZodCheckOverwrite", (e, t) => {
  gt.init(e, t), e._zod.check = (n) => {
    n.value = t.tx(n.value);
  };
});
class dg {
  constructor(t = []) {
    this.content = [], this.indent = 0, this && (this.args = t);
  }
  indented(t) {
    this.indent += 1, t(this), this.indent -= 1;
  }
  write(t) {
    if (typeof t == "function") {
      t(this, { execution: "sync" }), t(this, { execution: "async" });
      return;
    }
    const r = t.split(`
`).filter((i) => i), o = Math.min(...r.map((i) => i.length - i.trimStart().length)), a = r.map((i) => i.slice(o)).map((i) => " ".repeat(this.indent * 2) + i);
    for (const i of a)
      this.content.push(i);
  }
  compile() {
    const t = Function, n = this?.args, o = [...(this?.content ?? [""]).map((a) => `  ${a}`)];
    return new t(...n, o.join(`
`));
  }
}
const ug = {
  major: 4,
  minor: 3,
  patch: 6
}, je = /* @__PURE__ */ U("$ZodType", (e, t) => {
  var n;
  e ?? (e = {}), e._zod.def = t, e._zod.bag = e._zod.bag || {}, e._zod.version = ug;
  const r = [...e._zod.def.checks ?? []];
  e._zod.traits.has("$ZodCheck") && r.unshift(e);
  for (const o of r)
    for (const a of o._zod.onattach)
      a(e);
  if (r.length === 0)
    (n = e._zod).deferred ?? (n.deferred = []), e._zod.deferred?.push(() => {
      e._zod.run = e._zod.parse;
    });
  else {
    const o = (i, c, l) => {
      let d = Jn(i), f;
      for (const u of c) {
        if (u._zod.def.when) {
          if (!u._zod.def.when(i))
            continue;
        } else if (d)
          continue;
        const h = i.issues.length, g = u._zod.check(i);
        if (g instanceof Promise && l?.async === !1)
          throw new Xn();
        if (f || g instanceof Promise)
          f = (f ?? Promise.resolve()).then(async () => {
            await g, i.issues.length !== h && (d || (d = Jn(i, h)));
          });
        else {
          if (i.issues.length === h)
            continue;
          d || (d = Jn(i, h));
        }
      }
      return f ? f.then(() => i) : i;
    }, a = (i, c, l) => {
      if (Jn(i))
        return i.aborted = !0, i;
      const d = o(c, r, l);
      if (d instanceof Promise) {
        if (l.async === !1)
          throw new Xn();
        return d.then((f) => e._zod.parse(f, l));
      }
      return e._zod.parse(d, l);
    };
    e._zod.run = (i, c) => {
      if (c.skipChecks)
        return e._zod.parse(i, c);
      if (c.direction === "backward") {
        const d = e._zod.parse({ value: i.value, issues: [] }, { ...c, skipChecks: !0 });
        return d instanceof Promise ? d.then((f) => a(f, i, c)) : a(d, i, c);
      }
      const l = e._zod.parse(i, c);
      if (l instanceof Promise) {
        if (c.async === !1)
          throw new Xn();
        return l.then((d) => o(d, r, c));
      }
      return o(l, r, c);
    };
  }
  Ce(e, "~standard", () => ({
    validate: (o) => {
      try {
        const a = yh(e, o);
        return a.success ? { value: a.data } : { issues: a.error?.issues };
      } catch {
        return vh(e, o).then((i) => i.success ? { value: i.data } : { issues: i.error?.issues });
      }
    },
    vendor: "zod",
    version: 1
  }));
}), La = /* @__PURE__ */ U("$ZodString", (e, t) => {
  je.init(e, t), e._zod.pattern = [...e?._zod.bag?.patterns ?? []].pop() ?? qh(e._zod.bag), e._zod.parse = (n, r) => {
    if (t.coerce)
      try {
        n.value = String(n.value);
      } catch {
      }
    return typeof n.value == "string" || n.issues.push({
      expected: "string",
      code: "invalid_type",
      input: n.value,
      inst: e
    }), n;
  };
}), Oe = /* @__PURE__ */ U("$ZodStringFormat", (e, t) => {
  Zo.init(e, t), La.init(e, t);
}), fg = /* @__PURE__ */ U("$ZodGUID", (e, t) => {
  t.pattern ?? (t.pattern = Mh), Oe.init(e, t);
}), pg = /* @__PURE__ */ U("$ZodUUID", (e, t) => {
  if (t.version) {
    const r = {
      v1: 1,
      v2: 2,
      v3: 3,
      v4: 4,
      v5: 5,
      v6: 6,
      v7: 7,
      v8: 8
    }[t.version];
    if (r === void 0)
      throw new Error(`Invalid UUID version: "${t.version}"`);
    t.pattern ?? (t.pattern = Qi(r));
  } else
    t.pattern ?? (t.pattern = Qi());
  Oe.init(e, t);
}), mg = /* @__PURE__ */ U("$ZodEmail", (e, t) => {
  t.pattern ?? (t.pattern = Lh), Oe.init(e, t);
}), hg = /* @__PURE__ */ U("$ZodURL", (e, t) => {
  Oe.init(e, t), e._zod.check = (n) => {
    try {
      const r = n.value.trim(), o = new URL(r);
      t.hostname && (t.hostname.lastIndex = 0, t.hostname.test(o.hostname) || n.issues.push({
        code: "invalid_format",
        format: "url",
        note: "Invalid hostname",
        pattern: t.hostname.source,
        input: n.value,
        inst: e,
        continue: !t.abort
      })), t.protocol && (t.protocol.lastIndex = 0, t.protocol.test(o.protocol.endsWith(":") ? o.protocol.slice(0, -1) : o.protocol) || n.issues.push({
        code: "invalid_format",
        format: "url",
        note: "Invalid protocol",
        pattern: t.protocol.source,
        input: n.value,
        inst: e,
        continue: !t.abort
      })), t.normalize ? n.value = o.href : n.value = r;
      return;
    } catch {
      n.issues.push({
        code: "invalid_format",
        format: "url",
        input: n.value,
        inst: e,
        continue: !t.abort
      });
    }
  };
}), gg = /* @__PURE__ */ U("$ZodEmoji", (e, t) => {
  t.pattern ?? (t.pattern = $h()), Oe.init(e, t);
}), yg = /* @__PURE__ */ U("$ZodNanoID", (e, t) => {
  t.pattern ?? (t.pattern = Rh), Oe.init(e, t);
}), vg = /* @__PURE__ */ U("$ZodCUID", (e, t) => {
  t.pattern ?? (t.pattern = Eh), Oe.init(e, t);
}), bg = /* @__PURE__ */ U("$ZodCUID2", (e, t) => {
  t.pattern ?? (t.pattern = Ah), Oe.init(e, t);
}), wg = /* @__PURE__ */ U("$ZodULID", (e, t) => {
  t.pattern ?? (t.pattern = Ph), Oe.init(e, t);
}), xg = /* @__PURE__ */ U("$ZodXID", (e, t) => {
  t.pattern ?? (t.pattern = Ih), Oe.init(e, t);
}), _g = /* @__PURE__ */ U("$ZodKSUID", (e, t) => {
  t.pattern ?? (t.pattern = Th), Oe.init(e, t);
}), kg = /* @__PURE__ */ U("$ZodISODateTime", (e, t) => {
  t.pattern ?? (t.pattern = Zh(t)), Oe.init(e, t);
}), Sg = /* @__PURE__ */ U("$ZodISODate", (e, t) => {
  t.pattern ?? (t.pattern = Wh), Oe.init(e, t);
}), Cg = /* @__PURE__ */ U("$ZodISOTime", (e, t) => {
  t.pattern ?? (t.pattern = Hh(t)), Oe.init(e, t);
}), Ng = /* @__PURE__ */ U("$ZodISODuration", (e, t) => {
  t.pattern ?? (t.pattern = Oh), Oe.init(e, t);
}), Eg = /* @__PURE__ */ U("$ZodIPv4", (e, t) => {
  t.pattern ?? (t.pattern = zh), Oe.init(e, t), e._zod.bag.format = "ipv4";
}), Ag = /* @__PURE__ */ U("$ZodIPv6", (e, t) => {
  t.pattern ?? (t.pattern = Fh), Oe.init(e, t), e._zod.bag.format = "ipv6", e._zod.check = (n) => {
    try {
      new URL(`http://[${n.value}]`);
    } catch {
      n.issues.push({
        code: "invalid_format",
        format: "ipv6",
        input: n.value,
        inst: e,
        continue: !t.abort
      });
    }
  };
}), Pg = /* @__PURE__ */ U("$ZodCIDRv4", (e, t) => {
  t.pattern ?? (t.pattern = jh), Oe.init(e, t);
}), Ig = /* @__PURE__ */ U("$ZodCIDRv6", (e, t) => {
  t.pattern ?? (t.pattern = Bh), Oe.init(e, t), e._zod.check = (n) => {
    const r = n.value.split("/");
    try {
      if (r.length !== 2)
        throw new Error();
      const [o, a] = r;
      if (!a)
        throw new Error();
      const i = Number(a);
      if (`${i}` !== a)
        throw new Error();
      if (i < 0 || i > 128)
        throw new Error();
      new URL(`http://[${o}]`);
    } catch {
      n.issues.push({
        code: "invalid_format",
        format: "cidrv6",
        input: n.value,
        inst: e,
        continue: !t.abort
      });
    }
  };
});
function Bl(e) {
  if (e === "")
    return !0;
  if (e.length % 4 !== 0)
    return !1;
  try {
    return atob(e), !0;
  } catch {
    return !1;
  }
}
const Tg = /* @__PURE__ */ U("$ZodBase64", (e, t) => {
  t.pattern ?? (t.pattern = Uh), Oe.init(e, t), e._zod.bag.contentEncoding = "base64", e._zod.check = (n) => {
    Bl(n.value) || n.issues.push({
      code: "invalid_format",
      format: "base64",
      input: n.value,
      inst: e,
      continue: !t.abort
    });
  };
});
function Rg(e) {
  if (!Ll.test(e))
    return !1;
  const t = e.replace(/[-_]/g, (r) => r === "-" ? "+" : "/"), n = t.padEnd(Math.ceil(t.length / 4) * 4, "=");
  return Bl(n);
}
const Og = /* @__PURE__ */ U("$ZodBase64URL", (e, t) => {
  t.pattern ?? (t.pattern = Ll), Oe.init(e, t), e._zod.bag.contentEncoding = "base64url", e._zod.check = (n) => {
    Rg(n.value) || n.issues.push({
      code: "invalid_format",
      format: "base64url",
      input: n.value,
      inst: e,
      continue: !t.abort
    });
  };
}), Mg = /* @__PURE__ */ U("$ZodE164", (e, t) => {
  t.pattern ?? (t.pattern = Vh), Oe.init(e, t);
});
function Lg(e, t = null) {
  try {
    const n = e.split(".");
    if (n.length !== 3)
      return !1;
    const [r] = n;
    if (!r)
      return !1;
    const o = JSON.parse(atob(r));
    return !("typ" in o && o?.typ !== "JWT" || !o.alg || t && (!("alg" in o) || o.alg !== t));
  } catch {
    return !1;
  }
}
const Dg = /* @__PURE__ */ U("$ZodJWT", (e, t) => {
  Oe.init(e, t), e._zod.check = (n) => {
    Lg(n.value, t.alg) || n.issues.push({
      code: "invalid_format",
      format: "jwt",
      input: n.value,
      inst: e,
      continue: !t.abort
    });
  };
}), Ul = /* @__PURE__ */ U("$ZodNumber", (e, t) => {
  je.init(e, t), e._zod.pattern = e._zod.bag.pattern ?? Yh, e._zod.parse = (n, r) => {
    if (t.coerce)
      try {
        n.value = Number(n.value);
      } catch {
      }
    const o = n.value;
    if (typeof o == "number" && !Number.isNaN(o) && Number.isFinite(o))
      return n;
    const a = typeof o == "number" ? Number.isNaN(o) ? "NaN" : Number.isFinite(o) ? void 0 : "Infinity" : void 0;
    return n.issues.push({
      expected: "number",
      code: "invalid_type",
      input: o,
      inst: e,
      ...a ? { received: a } : {}
    }), n;
  };
}), $g = /* @__PURE__ */ U("$ZodNumberFormat", (e, t) => {
  Xh.init(e, t), Ul.init(e, t);
}), zg = /* @__PURE__ */ U("$ZodUnknown", (e, t) => {
  je.init(e, t), e._zod.parse = (n) => n;
}), Fg = /* @__PURE__ */ U("$ZodNever", (e, t) => {
  je.init(e, t), e._zod.parse = (n, r) => (n.issues.push({
    expected: "never",
    code: "invalid_type",
    input: n.value,
    inst: e
  }), n);
});
function Ki(e, t, n) {
  e.issues.length && t.issues.push(...Tl(n, e.issues)), t.value[n] = e.value;
}
const jg = /* @__PURE__ */ U("$ZodArray", (e, t) => {
  je.init(e, t), e._zod.parse = (n, r) => {
    const o = n.value;
    if (!Array.isArray(o))
      return n.issues.push({
        expected: "array",
        code: "invalid_type",
        input: o,
        inst: e
      }), n;
    n.value = Array(o.length);
    const a = [];
    for (let i = 0; i < o.length; i++) {
      const c = o[i], l = t.element._zod.run({
        value: c,
        issues: []
      }, r);
      l instanceof Promise ? a.push(l.then((d) => Ki(d, n, i))) : Ki(l, n, i);
    }
    return a.length ? Promise.all(a).then(() => n) : n;
  };
});
function ko(e, t, n, r, o) {
  if (e.issues.length) {
    if (o && !(n in r))
      return;
    t.issues.push(...Tl(n, e.issues));
  }
  e.value === void 0 ? n in r && (t.value[n] = void 0) : t.value[n] = e.value;
}
function Vl(e) {
  const t = Object.keys(e.shape);
  for (const r of t)
    if (!e.shape?.[r]?._zod?.traits?.has("$ZodType"))
      throw new Error(`Invalid element at key "${r}": expected a Zod schema`);
  const n = ah(e.shape);
  return {
    ...e,
    keys: t,
    keySet: new Set(t),
    numKeys: t.length,
    optionalKeys: new Set(n)
  };
}
function Wl(e, t, n, r, o, a) {
  const i = [], c = o.keySet, l = o.catchall._zod, d = l.def.type, f = l.optout === "optional";
  for (const u in t) {
    if (c.has(u))
      continue;
    if (d === "never") {
      i.push(u);
      continue;
    }
    const h = l.run({ value: t[u], issues: [] }, r);
    h instanceof Promise ? e.push(h.then((g) => ko(g, n, u, t, f))) : ko(h, n, u, t, f);
  }
  return i.length && n.issues.push({
    code: "unrecognized_keys",
    keys: i,
    input: t,
    inst: a
  }), e.length ? Promise.all(e).then(() => n) : n;
}
const Bg = /* @__PURE__ */ U("$ZodObject", (e, t) => {
  if (je.init(e, t), !Object.getOwnPropertyDescriptor(t, "shape")?.get) {
    const c = t.shape;
    Object.defineProperty(t, "shape", {
      get: () => {
        const l = { ...c };
        return Object.defineProperty(t, "shape", {
          value: l
        }), l;
      }
    });
  }
  const r = Pa(() => Vl(t));
  Ce(e._zod, "propValues", () => {
    const c = t.shape, l = {};
    for (const d in c) {
      const f = c[d]._zod;
      if (f.values) {
        l[d] ?? (l[d] = /* @__PURE__ */ new Set());
        for (const u of f.values)
          l[d].add(u);
      }
    }
    return l;
  });
  const o = _o, a = t.catchall;
  let i;
  e._zod.parse = (c, l) => {
    i ?? (i = r.value);
    const d = c.value;
    if (!o(d))
      return c.issues.push({
        expected: "object",
        code: "invalid_type",
        input: d,
        inst: e
      }), c;
    c.value = {};
    const f = [], u = i.shape;
    for (const h of i.keys) {
      const g = u[h], b = g._zod.optout === "optional", v = g._zod.run({ value: d[h], issues: [] }, l);
      v instanceof Promise ? f.push(v.then((y) => ko(y, c, h, d, b))) : ko(v, c, h, d, b);
    }
    return a ? Wl(f, d, c, l, r.value, e) : f.length ? Promise.all(f).then(() => c) : c;
  };
}), Ug = /* @__PURE__ */ U("$ZodObjectJIT", (e, t) => {
  Bg.init(e, t);
  const n = e._zod.parse, r = Pa(() => Vl(t)), o = (h) => {
    const g = new dg(["shape", "payload", "ctx"]), b = r.value, v = (_) => {
      const x = Yi(_);
      return `shape[${x}]._zod.run({ value: input[${x}], issues: [] }, ctx)`;
    };
    g.write("const input = payload.value;");
    const y = /* @__PURE__ */ Object.create(null);
    let w = 0;
    for (const _ of b.keys)
      y[_] = `key_${w++}`;
    g.write("const newResult = {};");
    for (const _ of b.keys) {
      const x = y[_], S = Yi(_), R = h[_]?._zod?.optout === "optional";
      g.write(`const ${x} = ${v(_)};`), R ? g.write(`
        if (${x}.issues.length) {
          if (${S} in input) {
            payload.issues = payload.issues.concat(${x}.issues.map(iss => ({
              ...iss,
              path: iss.path ? [${S}, ...iss.path] : [${S}]
            })));
          }
        }
        
        if (${x}.value === undefined) {
          if (${S} in input) {
            newResult[${S}] = undefined;
          }
        } else {
          newResult[${S}] = ${x}.value;
        }
        
      `) : g.write(`
        if (${x}.issues.length) {
          payload.issues = payload.issues.concat(${x}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${S}, ...iss.path] : [${S}]
          })));
        }
        
        if (${x}.value === undefined) {
          if (${S} in input) {
            newResult[${S}] = undefined;
          }
        } else {
          newResult[${S}] = ${x}.value;
        }
        
      `);
    }
    g.write("payload.value = newResult;"), g.write("return payload;");
    const k = g.compile();
    return (_, x) => k(h, _, x);
  };
  let a;
  const i = _o, c = !El.jitless, d = c && oh.value, f = t.catchall;
  let u;
  e._zod.parse = (h, g) => {
    u ?? (u = r.value);
    const b = h.value;
    return i(b) ? c && d && g?.async === !1 && g.jitless !== !0 ? (a || (a = o(t.shape)), h = a(h, g), f ? Wl([], b, h, g, u, e) : h) : n(h, g) : (h.issues.push({
      expected: "object",
      code: "invalid_type",
      input: b,
      inst: e
    }), h);
  };
});
function Ji(e, t, n, r) {
  for (const a of e)
    if (a.issues.length === 0)
      return t.value = a.value, t;
  const o = e.filter((a) => !Jn(a));
  return o.length === 1 ? (t.value = o[0].value, o[0]) : (t.issues.push({
    code: "invalid_union",
    input: t.value,
    inst: n,
    errors: e.map((a) => a.issues.map((i) => On(i, r, Rn())))
  }), t);
}
const Vg = /* @__PURE__ */ U("$ZodUnion", (e, t) => {
  je.init(e, t), Ce(e._zod, "optin", () => t.options.some((o) => o._zod.optin === "optional") ? "optional" : void 0), Ce(e._zod, "optout", () => t.options.some((o) => o._zod.optout === "optional") ? "optional" : void 0), Ce(e._zod, "values", () => {
    if (t.options.every((o) => o._zod.values))
      return new Set(t.options.flatMap((o) => Array.from(o._zod.values)));
  }), Ce(e._zod, "pattern", () => {
    if (t.options.every((o) => o._zod.pattern)) {
      const o = t.options.map((a) => a._zod.pattern);
      return new RegExp(`^(${o.map((a) => Ta(a.source)).join("|")})$`);
    }
  });
  const n = t.options.length === 1, r = t.options[0]._zod.run;
  e._zod.parse = (o, a) => {
    if (n)
      return r(o, a);
    let i = !1;
    const c = [];
    for (const l of t.options) {
      const d = l._zod.run({
        value: o.value,
        issues: []
      }, a);
      if (d instanceof Promise)
        c.push(d), i = !0;
      else {
        if (d.issues.length === 0)
          return d;
        c.push(d);
      }
    }
    return i ? Promise.all(c).then((l) => Ji(l, o, e, a)) : Ji(c, o, e, a);
  };
}), Wg = /* @__PURE__ */ U("$ZodIntersection", (e, t) => {
  je.init(e, t), e._zod.parse = (n, r) => {
    const o = n.value, a = t.left._zod.run({ value: o, issues: [] }, r), i = t.right._zod.run({ value: o, issues: [] }, r);
    return a instanceof Promise || i instanceof Promise ? Promise.all([a, i]).then(([l, d]) => Xi(n, l, d)) : Xi(n, a, i);
  };
});
function ra(e, t) {
  if (e === t)
    return { valid: !0, data: e };
  if (e instanceof Date && t instanceof Date && +e == +t)
    return { valid: !0, data: e };
  if (Ir(e) && Ir(t)) {
    const n = Object.keys(t), r = Object.keys(e).filter((a) => n.indexOf(a) !== -1), o = { ...e, ...t };
    for (const a of r) {
      const i = ra(e[a], t[a]);
      if (!i.valid)
        return {
          valid: !1,
          mergeErrorPath: [a, ...i.mergeErrorPath]
        };
      o[a] = i.data;
    }
    return { valid: !0, data: o };
  }
  if (Array.isArray(e) && Array.isArray(t)) {
    if (e.length !== t.length)
      return { valid: !1, mergeErrorPath: [] };
    const n = [];
    for (let r = 0; r < e.length; r++) {
      const o = e[r], a = t[r], i = ra(o, a);
      if (!i.valid)
        return {
          valid: !1,
          mergeErrorPath: [r, ...i.mergeErrorPath]
        };
      n.push(i.data);
    }
    return { valid: !0, data: n };
  }
  return { valid: !1, mergeErrorPath: [] };
}
function Xi(e, t, n) {
  const r = /* @__PURE__ */ new Map();
  let o;
  for (const c of t.issues)
    if (c.code === "unrecognized_keys") {
      o ?? (o = c);
      for (const l of c.keys)
        r.has(l) || r.set(l, {}), r.get(l).l = !0;
    } else
      e.issues.push(c);
  for (const c of n.issues)
    if (c.code === "unrecognized_keys")
      for (const l of c.keys)
        r.has(l) || r.set(l, {}), r.get(l).r = !0;
    else
      e.issues.push(c);
  const a = [...r].filter(([, c]) => c.l && c.r).map(([c]) => c);
  if (a.length && o && e.issues.push({ ...o, keys: a }), Jn(e))
    return e;
  const i = ra(t.value, n.value);
  if (!i.valid)
    throw new Error(`Unmergable intersection. Error path: ${JSON.stringify(i.mergeErrorPath)}`);
  return e.value = i.data, e;
}
const Hg = /* @__PURE__ */ U("$ZodEnum", (e, t) => {
  je.init(e, t);
  const n = Al(t.entries), r = new Set(n);
  e._zod.values = r, e._zod.pattern = new RegExp(`^(${n.filter((o) => sh.has(typeof o)).map((o) => typeof o == "string" ? nr(o) : o.toString()).join("|")})$`), e._zod.parse = (o, a) => {
    const i = o.value;
    return r.has(i) || o.issues.push({
      code: "invalid_value",
      values: n,
      input: i,
      inst: e
    }), o;
  };
}), Zg = /* @__PURE__ */ U("$ZodLiteral", (e, t) => {
  if (je.init(e, t), t.values.length === 0)
    throw new Error("Cannot create literal schema with no valid values");
  const n = new Set(t.values);
  e._zod.values = n, e._zod.pattern = new RegExp(`^(${t.values.map((r) => typeof r == "string" ? nr(r) : r ? nr(r.toString()) : String(r)).join("|")})$`), e._zod.parse = (r, o) => {
    const a = r.value;
    return n.has(a) || r.issues.push({
      code: "invalid_value",
      values: t.values,
      input: a,
      inst: e
    }), r;
  };
}), qg = /* @__PURE__ */ U("$ZodTransform", (e, t) => {
  je.init(e, t), e._zod.parse = (n, r) => {
    if (r.direction === "backward")
      throw new Nl(e.constructor.name);
    const o = t.transform(n.value, n);
    if (r.async)
      return (o instanceof Promise ? o : Promise.resolve(o)).then((i) => (n.value = i, n));
    if (o instanceof Promise)
      throw new Xn();
    return n.value = o, n;
  };
});
function ec(e, t) {
  return e.issues.length && t === void 0 ? { issues: [], value: void 0 } : e;
}
const Hl = /* @__PURE__ */ U("$ZodOptional", (e, t) => {
  je.init(e, t), e._zod.optin = "optional", e._zod.optout = "optional", Ce(e._zod, "values", () => t.innerType._zod.values ? /* @__PURE__ */ new Set([...t.innerType._zod.values, void 0]) : void 0), Ce(e._zod, "pattern", () => {
    const n = t.innerType._zod.pattern;
    return n ? new RegExp(`^(${Ta(n.source)})?$`) : void 0;
  }), e._zod.parse = (n, r) => {
    if (t.innerType._zod.optin === "optional") {
      const o = t.innerType._zod.run(n, r);
      return o instanceof Promise ? o.then((a) => ec(a, n.value)) : ec(o, n.value);
    }
    return n.value === void 0 ? n : t.innerType._zod.run(n, r);
  };
}), Gg = /* @__PURE__ */ U("$ZodExactOptional", (e, t) => {
  Hl.init(e, t), Ce(e._zod, "values", () => t.innerType._zod.values), Ce(e._zod, "pattern", () => t.innerType._zod.pattern), e._zod.parse = (n, r) => t.innerType._zod.run(n, r);
}), Yg = /* @__PURE__ */ U("$ZodNullable", (e, t) => {
  je.init(e, t), Ce(e._zod, "optin", () => t.innerType._zod.optin), Ce(e._zod, "optout", () => t.innerType._zod.optout), Ce(e._zod, "pattern", () => {
    const n = t.innerType._zod.pattern;
    return n ? new RegExp(`^(${Ta(n.source)}|null)$`) : void 0;
  }), Ce(e._zod, "values", () => t.innerType._zod.values ? /* @__PURE__ */ new Set([...t.innerType._zod.values, null]) : void 0), e._zod.parse = (n, r) => n.value === null ? n : t.innerType._zod.run(n, r);
}), Qg = /* @__PURE__ */ U("$ZodDefault", (e, t) => {
  je.init(e, t), e._zod.optin = "optional", Ce(e._zod, "values", () => t.innerType._zod.values), e._zod.parse = (n, r) => {
    if (r.direction === "backward")
      return t.innerType._zod.run(n, r);
    if (n.value === void 0)
      return n.value = t.defaultValue, n;
    const o = t.innerType._zod.run(n, r);
    return o instanceof Promise ? o.then((a) => tc(a, t)) : tc(o, t);
  };
});
function tc(e, t) {
  return e.value === void 0 && (e.value = t.defaultValue), e;
}
const Kg = /* @__PURE__ */ U("$ZodPrefault", (e, t) => {
  je.init(e, t), e._zod.optin = "optional", Ce(e._zod, "values", () => t.innerType._zod.values), e._zod.parse = (n, r) => (r.direction === "backward" || n.value === void 0 && (n.value = t.defaultValue), t.innerType._zod.run(n, r));
}), Jg = /* @__PURE__ */ U("$ZodNonOptional", (e, t) => {
  je.init(e, t), Ce(e._zod, "values", () => {
    const n = t.innerType._zod.values;
    return n ? new Set([...n].filter((r) => r !== void 0)) : void 0;
  }), e._zod.parse = (n, r) => {
    const o = t.innerType._zod.run(n, r);
    return o instanceof Promise ? o.then((a) => nc(a, e)) : nc(o, e);
  };
});
function nc(e, t) {
  return !e.issues.length && e.value === void 0 && e.issues.push({
    code: "invalid_type",
    expected: "nonoptional",
    input: e.value,
    inst: t
  }), e;
}
const Xg = /* @__PURE__ */ U("$ZodCatch", (e, t) => {
  je.init(e, t), Ce(e._zod, "optin", () => t.innerType._zod.optin), Ce(e._zod, "optout", () => t.innerType._zod.optout), Ce(e._zod, "values", () => t.innerType._zod.values), e._zod.parse = (n, r) => {
    if (r.direction === "backward")
      return t.innerType._zod.run(n, r);
    const o = t.innerType._zod.run(n, r);
    return o instanceof Promise ? o.then((a) => (n.value = a.value, a.issues.length && (n.value = t.catchValue({
      ...n,
      error: {
        issues: a.issues.map((i) => On(i, r, Rn()))
      },
      input: n.value
    }), n.issues = []), n)) : (n.value = o.value, o.issues.length && (n.value = t.catchValue({
      ...n,
      error: {
        issues: o.issues.map((a) => On(a, r, Rn()))
      },
      input: n.value
    }), n.issues = []), n);
  };
}), ey = /* @__PURE__ */ U("$ZodPipe", (e, t) => {
  je.init(e, t), Ce(e._zod, "values", () => t.in._zod.values), Ce(e._zod, "optin", () => t.in._zod.optin), Ce(e._zod, "optout", () => t.out._zod.optout), Ce(e._zod, "propValues", () => t.in._zod.propValues), e._zod.parse = (n, r) => {
    if (r.direction === "backward") {
      const a = t.out._zod.run(n, r);
      return a instanceof Promise ? a.then((i) => Kr(i, t.in, r)) : Kr(a, t.in, r);
    }
    const o = t.in._zod.run(n, r);
    return o instanceof Promise ? o.then((a) => Kr(a, t.out, r)) : Kr(o, t.out, r);
  };
});
function Kr(e, t, n) {
  return e.issues.length ? (e.aborted = !0, e) : t._zod.run({ value: e.value, issues: e.issues }, n);
}
const ty = /* @__PURE__ */ U("$ZodReadonly", (e, t) => {
  je.init(e, t), Ce(e._zod, "propValues", () => t.innerType._zod.propValues), Ce(e._zod, "values", () => t.innerType._zod.values), Ce(e._zod, "optin", () => t.innerType?._zod?.optin), Ce(e._zod, "optout", () => t.innerType?._zod?.optout), e._zod.parse = (n, r) => {
    if (r.direction === "backward")
      return t.innerType._zod.run(n, r);
    const o = t.innerType._zod.run(n, r);
    return o instanceof Promise ? o.then(rc) : rc(o);
  };
});
function rc(e) {
  return e.value = Object.freeze(e.value), e;
}
const ny = /* @__PURE__ */ U("$ZodCustom", (e, t) => {
  gt.init(e, t), je.init(e, t), e._zod.parse = (n, r) => n, e._zod.check = (n) => {
    const r = n.value, o = t.fn(r);
    if (o instanceof Promise)
      return o.then((a) => oc(a, n, r, e));
    oc(o, n, r, e);
  };
});
function oc(e, t, n, r) {
  if (!e) {
    const o = {
      code: "custom",
      input: n,
      inst: r,
      // incorporates params.error into issue reporting
      path: [...r._zod.def.path ?? []],
      // incorporates params.error into issue reporting
      continue: !r._zod.def.abort
      // params: inst._zod.def.params,
    };
    r._zod.def.params && (o.params = r._zod.def.params), t.issues.push(Tr(o));
  }
}
var sc;
class ry {
  constructor() {
    this._map = /* @__PURE__ */ new WeakMap(), this._idmap = /* @__PURE__ */ new Map();
  }
  add(t, ...n) {
    const r = n[0];
    return this._map.set(t, r), r && typeof r == "object" && "id" in r && this._idmap.set(r.id, t), this;
  }
  clear() {
    return this._map = /* @__PURE__ */ new WeakMap(), this._idmap = /* @__PURE__ */ new Map(), this;
  }
  remove(t) {
    const n = this._map.get(t);
    return n && typeof n == "object" && "id" in n && this._idmap.delete(n.id), this._map.delete(t), this;
  }
  get(t) {
    const n = t._zod.parent;
    if (n) {
      const r = { ...this.get(n) ?? {} };
      delete r.id;
      const o = { ...r, ...this._map.get(t) };
      return Object.keys(o).length ? o : void 0;
    }
    return this._map.get(t);
  }
  has(t) {
    return this._map.has(t);
  }
}
function oy() {
  return new ry();
}
(sc = globalThis).__zod_globalRegistry ?? (sc.__zod_globalRegistry = oy());
const Cr = globalThis.__zod_globalRegistry;
// @__NO_SIDE_EFFECTS__
function sy(e, t) {
  return new e({
    type: "string",
    ...de(t)
  });
}
// @__NO_SIDE_EFFECTS__
function ay(e, t) {
  return new e({
    type: "string",
    format: "email",
    check: "string_format",
    abort: !1,
    ...de(t)
  });
}
// @__NO_SIDE_EFFECTS__
function ac(e, t) {
  return new e({
    type: "string",
    format: "guid",
    check: "string_format",
    abort: !1,
    ...de(t)
  });
}
// @__NO_SIDE_EFFECTS__
function iy(e, t) {
  return new e({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: !1,
    ...de(t)
  });
}
// @__NO_SIDE_EFFECTS__
function cy(e, t) {
  return new e({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: !1,
    version: "v4",
    ...de(t)
  });
}
// @__NO_SIDE_EFFECTS__
function ly(e, t) {
  return new e({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: !1,
    version: "v6",
    ...de(t)
  });
}
// @__NO_SIDE_EFFECTS__
function dy(e, t) {
  return new e({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: !1,
    version: "v7",
    ...de(t)
  });
}
// @__NO_SIDE_EFFECTS__
function uy(e, t) {
  return new e({
    type: "string",
    format: "url",
    check: "string_format",
    abort: !1,
    ...de(t)
  });
}
// @__NO_SIDE_EFFECTS__
function fy(e, t) {
  return new e({
    type: "string",
    format: "emoji",
    check: "string_format",
    abort: !1,
    ...de(t)
  });
}
// @__NO_SIDE_EFFECTS__
function py(e, t) {
  return new e({
    type: "string",
    format: "nanoid",
    check: "string_format",
    abort: !1,
    ...de(t)
  });
}
// @__NO_SIDE_EFFECTS__
function my(e, t) {
  return new e({
    type: "string",
    format: "cuid",
    check: "string_format",
    abort: !1,
    ...de(t)
  });
}
// @__NO_SIDE_EFFECTS__
function hy(e, t) {
  return new e({
    type: "string",
    format: "cuid2",
    check: "string_format",
    abort: !1,
    ...de(t)
  });
}
// @__NO_SIDE_EFFECTS__
function gy(e, t) {
  return new e({
    type: "string",
    format: "ulid",
    check: "string_format",
    abort: !1,
    ...de(t)
  });
}
// @__NO_SIDE_EFFECTS__
function yy(e, t) {
  return new e({
    type: "string",
    format: "xid",
    check: "string_format",
    abort: !1,
    ...de(t)
  });
}
// @__NO_SIDE_EFFECTS__
function vy(e, t) {
  return new e({
    type: "string",
    format: "ksuid",
    check: "string_format",
    abort: !1,
    ...de(t)
  });
}
// @__NO_SIDE_EFFECTS__
function by(e, t) {
  return new e({
    type: "string",
    format: "ipv4",
    check: "string_format",
    abort: !1,
    ...de(t)
  });
}
// @__NO_SIDE_EFFECTS__
function wy(e, t) {
  return new e({
    type: "string",
    format: "ipv6",
    check: "string_format",
    abort: !1,
    ...de(t)
  });
}
// @__NO_SIDE_EFFECTS__
function xy(e, t) {
  return new e({
    type: "string",
    format: "cidrv4",
    check: "string_format",
    abort: !1,
    ...de(t)
  });
}
// @__NO_SIDE_EFFECTS__
function _y(e, t) {
  return new e({
    type: "string",
    format: "cidrv6",
    check: "string_format",
    abort: !1,
    ...de(t)
  });
}
// @__NO_SIDE_EFFECTS__
function ky(e, t) {
  return new e({
    type: "string",
    format: "base64",
    check: "string_format",
    abort: !1,
    ...de(t)
  });
}
// @__NO_SIDE_EFFECTS__
function Sy(e, t) {
  return new e({
    type: "string",
    format: "base64url",
    check: "string_format",
    abort: !1,
    ...de(t)
  });
}
// @__NO_SIDE_EFFECTS__
function Cy(e, t) {
  return new e({
    type: "string",
    format: "e164",
    check: "string_format",
    abort: !1,
    ...de(t)
  });
}
// @__NO_SIDE_EFFECTS__
function Ny(e, t) {
  return new e({
    type: "string",
    format: "jwt",
    check: "string_format",
    abort: !1,
    ...de(t)
  });
}
// @__NO_SIDE_EFFECTS__
function Ey(e, t) {
  return new e({
    type: "string",
    format: "datetime",
    check: "string_format",
    offset: !1,
    local: !1,
    precision: null,
    ...de(t)
  });
}
// @__NO_SIDE_EFFECTS__
function Ay(e, t) {
  return new e({
    type: "string",
    format: "date",
    check: "string_format",
    ...de(t)
  });
}
// @__NO_SIDE_EFFECTS__
function Py(e, t) {
  return new e({
    type: "string",
    format: "time",
    check: "string_format",
    precision: null,
    ...de(t)
  });
}
// @__NO_SIDE_EFFECTS__
function Iy(e, t) {
  return new e({
    type: "string",
    format: "duration",
    check: "string_format",
    ...de(t)
  });
}
// @__NO_SIDE_EFFECTS__
function Ty(e, t) {
  return new e({
    type: "number",
    checks: [],
    ...de(t)
  });
}
// @__NO_SIDE_EFFECTS__
function Ry(e, t) {
  return new e({
    type: "number",
    check: "number_format",
    abort: !1,
    format: "safeint",
    ...de(t)
  });
}
// @__NO_SIDE_EFFECTS__
function Oy(e) {
  return new e({
    type: "unknown"
  });
}
// @__NO_SIDE_EFFECTS__
function My(e, t) {
  return new e({
    type: "never",
    ...de(t)
  });
}
// @__NO_SIDE_EFFECTS__
function ic(e, t) {
  return new Fl({
    check: "less_than",
    ...de(t),
    value: e,
    inclusive: !1
  });
}
// @__NO_SIDE_EFFECTS__
function As(e, t) {
  return new Fl({
    check: "less_than",
    ...de(t),
    value: e,
    inclusive: !0
  });
}
// @__NO_SIDE_EFFECTS__
function cc(e, t) {
  return new jl({
    check: "greater_than",
    ...de(t),
    value: e,
    inclusive: !1
  });
}
// @__NO_SIDE_EFFECTS__
function Ps(e, t) {
  return new jl({
    check: "greater_than",
    ...de(t),
    value: e,
    inclusive: !0
  });
}
// @__NO_SIDE_EFFECTS__
function lc(e, t) {
  return new Jh({
    check: "multiple_of",
    ...de(t),
    value: e
  });
}
// @__NO_SIDE_EFFECTS__
function Zl(e, t) {
  return new eg({
    check: "max_length",
    ...de(t),
    maximum: e
  });
}
// @__NO_SIDE_EFFECTS__
function So(e, t) {
  return new tg({
    check: "min_length",
    ...de(t),
    minimum: e
  });
}
// @__NO_SIDE_EFFECTS__
function ql(e, t) {
  return new ng({
    check: "length_equals",
    ...de(t),
    length: e
  });
}
// @__NO_SIDE_EFFECTS__
function Ly(e, t) {
  return new rg({
    check: "string_format",
    format: "regex",
    ...de(t),
    pattern: e
  });
}
// @__NO_SIDE_EFFECTS__
function Dy(e) {
  return new og({
    check: "string_format",
    format: "lowercase",
    ...de(e)
  });
}
// @__NO_SIDE_EFFECTS__
function $y(e) {
  return new sg({
    check: "string_format",
    format: "uppercase",
    ...de(e)
  });
}
// @__NO_SIDE_EFFECTS__
function zy(e, t) {
  return new ag({
    check: "string_format",
    format: "includes",
    ...de(t),
    includes: e
  });
}
// @__NO_SIDE_EFFECTS__
function Fy(e, t) {
  return new ig({
    check: "string_format",
    format: "starts_with",
    ...de(t),
    prefix: e
  });
}
// @__NO_SIDE_EFFECTS__
function jy(e, t) {
  return new cg({
    check: "string_format",
    format: "ends_with",
    ...de(t),
    suffix: e
  });
}
// @__NO_SIDE_EFFECTS__
function ir(e) {
  return new lg({
    check: "overwrite",
    tx: e
  });
}
// @__NO_SIDE_EFFECTS__
function By(e) {
  return /* @__PURE__ */ ir((t) => t.normalize(e));
}
// @__NO_SIDE_EFFECTS__
function Uy() {
  return /* @__PURE__ */ ir((e) => e.trim());
}
// @__NO_SIDE_EFFECTS__
function Vy() {
  return /* @__PURE__ */ ir((e) => e.toLowerCase());
}
// @__NO_SIDE_EFFECTS__
function Wy() {
  return /* @__PURE__ */ ir((e) => e.toUpperCase());
}
// @__NO_SIDE_EFFECTS__
function Hy() {
  return /* @__PURE__ */ ir((e) => rh(e));
}
// @__NO_SIDE_EFFECTS__
function Zy(e, t, n) {
  return new e({
    type: "array",
    element: t,
    // get element() {
    //   return element;
    // },
    ...de(n)
  });
}
// @__NO_SIDE_EFFECTS__
function qy(e, t, n) {
  return new e({
    type: "custom",
    check: "custom",
    fn: t,
    ...de(n)
  });
}
// @__NO_SIDE_EFFECTS__
function Gy(e) {
  const t = /* @__PURE__ */ Yy((n) => (n.addIssue = (r) => {
    if (typeof r == "string")
      n.issues.push(Tr(r, n.value, t._zod.def));
    else {
      const o = r;
      o.fatal && (o.continue = !1), o.code ?? (o.code = "custom"), o.input ?? (o.input = n.value), o.inst ?? (o.inst = t), o.continue ?? (o.continue = !t._zod.def.abort), n.issues.push(Tr(o));
    }
  }, e(n.value, n)));
  return t;
}
// @__NO_SIDE_EFFECTS__
function Yy(e, t) {
  const n = new gt({
    check: "custom",
    ...de(t)
  });
  return n._zod.check = e, n;
}
function Gl(e) {
  let t = e?.target ?? "draft-2020-12";
  return t === "draft-4" && (t = "draft-04"), t === "draft-7" && (t = "draft-07"), {
    processors: e.processors ?? {},
    metadataRegistry: e?.metadata ?? Cr,
    target: t,
    unrepresentable: e?.unrepresentable ?? "throw",
    override: e?.override ?? (() => {
    }),
    io: e?.io ?? "output",
    counter: 0,
    seen: /* @__PURE__ */ new Map(),
    cycles: e?.cycles ?? "ref",
    reused: e?.reused ?? "inline",
    external: e?.external ?? void 0
  };
}
function Je(e, t, n = { path: [], schemaPath: [] }) {
  var r;
  const o = e._zod.def, a = t.seen.get(e);
  if (a)
    return a.count++, n.schemaPath.includes(e) && (a.cycle = n.path), a.schema;
  const i = { schema: {}, count: 1, cycle: void 0, path: n.path };
  t.seen.set(e, i);
  const c = e._zod.toJSONSchema?.();
  if (c)
    i.schema = c;
  else {
    const f = {
      ...n,
      schemaPath: [...n.schemaPath, e],
      path: n.path
    };
    if (e._zod.processJSONSchema)
      e._zod.processJSONSchema(t, i.schema, f);
    else {
      const h = i.schema, g = t.processors[o.type];
      if (!g)
        throw new Error(`[toJSONSchema]: Non-representable type encountered: ${o.type}`);
      g(e, t, h, f);
    }
    const u = e._zod.parent;
    u && (i.ref || (i.ref = u), Je(u, t, f), t.seen.get(u).isParent = !0);
  }
  const l = t.metadataRegistry.get(e);
  return l && Object.assign(i.schema, l), t.io === "input" && it(e) && (delete i.schema.examples, delete i.schema.default), t.io === "input" && i.schema._prefault && ((r = i.schema).default ?? (r.default = i.schema._prefault)), delete i.schema._prefault, t.seen.get(e).schema;
}
function Yl(e, t) {
  const n = e.seen.get(t);
  if (!n)
    throw new Error("Unprocessed schema. This is a bug in Zod.");
  const r = /* @__PURE__ */ new Map();
  for (const i of e.seen.entries()) {
    const c = e.metadataRegistry.get(i[0])?.id;
    if (c) {
      const l = r.get(c);
      if (l && l !== i[0])
        throw new Error(`Duplicate schema id "${c}" detected during JSON Schema conversion. Two different schemas cannot share the same id when converted together.`);
      r.set(c, i[0]);
    }
  }
  const o = (i) => {
    const c = e.target === "draft-2020-12" ? "$defs" : "definitions";
    if (e.external) {
      const u = e.external.registry.get(i[0])?.id, h = e.external.uri ?? ((b) => b);
      if (u)
        return { ref: h(u) };
      const g = i[1].defId ?? i[1].schema.id ?? `schema${e.counter++}`;
      return i[1].defId = g, { defId: g, ref: `${h("__shared")}#/${c}/${g}` };
    }
    if (i[1] === n)
      return { ref: "#" };
    const d = `#/${c}/`, f = i[1].schema.id ?? `__schema${e.counter++}`;
    return { defId: f, ref: d + f };
  }, a = (i) => {
    if (i[1].schema.$ref)
      return;
    const c = i[1], { ref: l, defId: d } = o(i);
    c.def = { ...c.schema }, d && (c.defId = d);
    const f = c.schema;
    for (const u in f)
      delete f[u];
    f.$ref = l;
  };
  if (e.cycles === "throw")
    for (const i of e.seen.entries()) {
      const c = i[1];
      if (c.cycle)
        throw new Error(`Cycle detected: #/${c.cycle?.join("/")}/<root>

Set the \`cycles\` parameter to \`"ref"\` to resolve cyclical schemas with defs.`);
    }
  for (const i of e.seen.entries()) {
    const c = i[1];
    if (t === i[0]) {
      a(i);
      continue;
    }
    if (e.external) {
      const d = e.external.registry.get(i[0])?.id;
      if (t !== i[0] && d) {
        a(i);
        continue;
      }
    }
    if (e.metadataRegistry.get(i[0])?.id) {
      a(i);
      continue;
    }
    if (c.cycle) {
      a(i);
      continue;
    }
    if (c.count > 1 && e.reused === "ref") {
      a(i);
      continue;
    }
  }
}
function Ql(e, t) {
  const n = e.seen.get(t);
  if (!n)
    throw new Error("Unprocessed schema. This is a bug in Zod.");
  const r = (i) => {
    const c = e.seen.get(i);
    if (c.ref === null)
      return;
    const l = c.def ?? c.schema, d = { ...l }, f = c.ref;
    if (c.ref = null, f) {
      r(f);
      const h = e.seen.get(f), g = h.schema;
      if (g.$ref && (e.target === "draft-07" || e.target === "draft-04" || e.target === "openapi-3.0") ? (l.allOf = l.allOf ?? [], l.allOf.push(g)) : Object.assign(l, g), Object.assign(l, d), i._zod.parent === f)
        for (const v in l)
          v === "$ref" || v === "allOf" || v in d || delete l[v];
      if (g.$ref && h.def)
        for (const v in l)
          v === "$ref" || v === "allOf" || v in h.def && JSON.stringify(l[v]) === JSON.stringify(h.def[v]) && delete l[v];
    }
    const u = i._zod.parent;
    if (u && u !== f) {
      r(u);
      const h = e.seen.get(u);
      if (h?.schema.$ref && (l.$ref = h.schema.$ref, h.def))
        for (const g in l)
          g === "$ref" || g === "allOf" || g in h.def && JSON.stringify(l[g]) === JSON.stringify(h.def[g]) && delete l[g];
    }
    e.override({
      zodSchema: i,
      jsonSchema: l,
      path: c.path ?? []
    });
  };
  for (const i of [...e.seen.entries()].reverse())
    r(i[0]);
  const o = {};
  if (e.target === "draft-2020-12" ? o.$schema = "https://json-schema.org/draft/2020-12/schema" : e.target === "draft-07" ? o.$schema = "http://json-schema.org/draft-07/schema#" : e.target === "draft-04" ? o.$schema = "http://json-schema.org/draft-04/schema#" : e.target, e.external?.uri) {
    const i = e.external.registry.get(t)?.id;
    if (!i)
      throw new Error("Schema is missing an `id` property");
    o.$id = e.external.uri(i);
  }
  Object.assign(o, n.def ?? n.schema);
  const a = e.external?.defs ?? {};
  for (const i of e.seen.entries()) {
    const c = i[1];
    c.def && c.defId && (a[c.defId] = c.def);
  }
  e.external || Object.keys(a).length > 0 && (e.target === "draft-2020-12" ? o.$defs = a : o.definitions = a);
  try {
    const i = JSON.parse(JSON.stringify(o));
    return Object.defineProperty(i, "~standard", {
      value: {
        ...t["~standard"],
        jsonSchema: {
          input: Co(t, "input", e.processors),
          output: Co(t, "output", e.processors)
        }
      },
      enumerable: !1,
      writable: !1
    }), i;
  } catch {
    throw new Error("Error converting schema to JSON.");
  }
}
function it(e, t) {
  const n = t ?? { seen: /* @__PURE__ */ new Set() };
  if (n.seen.has(e))
    return !1;
  n.seen.add(e);
  const r = e._zod.def;
  if (r.type === "transform")
    return !0;
  if (r.type === "array")
    return it(r.element, n);
  if (r.type === "set")
    return it(r.valueType, n);
  if (r.type === "lazy")
    return it(r.getter(), n);
  if (r.type === "promise" || r.type === "optional" || r.type === "nonoptional" || r.type === "nullable" || r.type === "readonly" || r.type === "default" || r.type === "prefault")
    return it(r.innerType, n);
  if (r.type === "intersection")
    return it(r.left, n) || it(r.right, n);
  if (r.type === "record" || r.type === "map")
    return it(r.keyType, n) || it(r.valueType, n);
  if (r.type === "pipe")
    return it(r.in, n) || it(r.out, n);
  if (r.type === "object") {
    for (const o in r.shape)
      if (it(r.shape[o], n))
        return !0;
    return !1;
  }
  if (r.type === "union") {
    for (const o of r.options)
      if (it(o, n))
        return !0;
    return !1;
  }
  if (r.type === "tuple") {
    for (const o of r.items)
      if (it(o, n))
        return !0;
    return !!(r.rest && it(r.rest, n));
  }
  return !1;
}
const Qy = (e, t = {}) => (n) => {
  const r = Gl({ ...n, processors: t });
  return Je(e, r), Yl(r, e), Ql(r, e);
}, Co = (e, t, n = {}) => (r) => {
  const { libraryOptions: o, target: a } = r ?? {}, i = Gl({ ...o ?? {}, target: a, io: t, processors: n });
  return Je(e, i), Yl(i, e), Ql(i, e);
}, Ky = {
  guid: "uuid",
  url: "uri",
  datetime: "date-time",
  json_string: "json-string",
  regex: ""
  // do not set
}, Jy = (e, t, n, r) => {
  const o = n;
  o.type = "string";
  const { minimum: a, maximum: i, format: c, patterns: l, contentEncoding: d } = e._zod.bag;
  if (typeof a == "number" && (o.minLength = a), typeof i == "number" && (o.maxLength = i), c && (o.format = Ky[c] ?? c, o.format === "" && delete o.format, c === "time" && delete o.format), d && (o.contentEncoding = d), l && l.size > 0) {
    const f = [...l];
    f.length === 1 ? o.pattern = f[0].source : f.length > 1 && (o.allOf = [
      ...f.map((u) => ({
        ...t.target === "draft-07" || t.target === "draft-04" || t.target === "openapi-3.0" ? { type: "string" } : {},
        pattern: u.source
      }))
    ]);
  }
}, Xy = (e, t, n, r) => {
  const o = n, { minimum: a, maximum: i, format: c, multipleOf: l, exclusiveMaximum: d, exclusiveMinimum: f } = e._zod.bag;
  typeof c == "string" && c.includes("int") ? o.type = "integer" : o.type = "number", typeof f == "number" && (t.target === "draft-04" || t.target === "openapi-3.0" ? (o.minimum = f, o.exclusiveMinimum = !0) : o.exclusiveMinimum = f), typeof a == "number" && (o.minimum = a, typeof f == "number" && t.target !== "draft-04" && (f >= a ? delete o.minimum : delete o.exclusiveMinimum)), typeof d == "number" && (t.target === "draft-04" || t.target === "openapi-3.0" ? (o.maximum = d, o.exclusiveMaximum = !0) : o.exclusiveMaximum = d), typeof i == "number" && (o.maximum = i, typeof d == "number" && t.target !== "draft-04" && (d <= i ? delete o.maximum : delete o.exclusiveMaximum)), typeof l == "number" && (o.multipleOf = l);
}, ev = (e, t, n, r) => {
  n.not = {};
}, tv = (e, t, n, r) => {
}, nv = (e, t, n, r) => {
  const o = e._zod.def, a = Al(o.entries);
  a.every((i) => typeof i == "number") && (n.type = "number"), a.every((i) => typeof i == "string") && (n.type = "string"), n.enum = a;
}, rv = (e, t, n, r) => {
  const o = e._zod.def, a = [];
  for (const i of o.values)
    if (i === void 0) {
      if (t.unrepresentable === "throw")
        throw new Error("Literal `undefined` cannot be represented in JSON Schema");
    } else if (typeof i == "bigint") {
      if (t.unrepresentable === "throw")
        throw new Error("BigInt literals cannot be represented in JSON Schema");
      a.push(Number(i));
    } else
      a.push(i);
  if (a.length !== 0) if (a.length === 1) {
    const i = a[0];
    n.type = i === null ? "null" : typeof i, t.target === "draft-04" || t.target === "openapi-3.0" ? n.enum = [i] : n.const = i;
  } else
    a.every((i) => typeof i == "number") && (n.type = "number"), a.every((i) => typeof i == "string") && (n.type = "string"), a.every((i) => typeof i == "boolean") && (n.type = "boolean"), a.every((i) => i === null) && (n.type = "null"), n.enum = a;
}, ov = (e, t, n, r) => {
  if (t.unrepresentable === "throw")
    throw new Error("Custom types cannot be represented in JSON Schema");
}, sv = (e, t, n, r) => {
  if (t.unrepresentable === "throw")
    throw new Error("Transforms cannot be represented in JSON Schema");
}, av = (e, t, n, r) => {
  const o = n, a = e._zod.def, { minimum: i, maximum: c } = e._zod.bag;
  typeof i == "number" && (o.minItems = i), typeof c == "number" && (o.maxItems = c), o.type = "array", o.items = Je(a.element, t, { ...r, path: [...r.path, "items"] });
}, iv = (e, t, n, r) => {
  const o = n, a = e._zod.def;
  o.type = "object", o.properties = {};
  const i = a.shape;
  for (const d in i)
    o.properties[d] = Je(i[d], t, {
      ...r,
      path: [...r.path, "properties", d]
    });
  const c = new Set(Object.keys(i)), l = new Set([...c].filter((d) => {
    const f = a.shape[d]._zod;
    return t.io === "input" ? f.optin === void 0 : f.optout === void 0;
  }));
  l.size > 0 && (o.required = Array.from(l)), a.catchall?._zod.def.type === "never" ? o.additionalProperties = !1 : a.catchall ? a.catchall && (o.additionalProperties = Je(a.catchall, t, {
    ...r,
    path: [...r.path, "additionalProperties"]
  })) : t.io === "output" && (o.additionalProperties = !1);
}, cv = (e, t, n, r) => {
  const o = e._zod.def, a = o.inclusive === !1, i = o.options.map((c, l) => Je(c, t, {
    ...r,
    path: [...r.path, a ? "oneOf" : "anyOf", l]
  }));
  a ? n.oneOf = i : n.anyOf = i;
}, lv = (e, t, n, r) => {
  const o = e._zod.def, a = Je(o.left, t, {
    ...r,
    path: [...r.path, "allOf", 0]
  }), i = Je(o.right, t, {
    ...r,
    path: [...r.path, "allOf", 1]
  }), c = (d) => "allOf" in d && Object.keys(d).length === 1, l = [
    ...c(a) ? a.allOf : [a],
    ...c(i) ? i.allOf : [i]
  ];
  n.allOf = l;
}, dv = (e, t, n, r) => {
  const o = e._zod.def, a = Je(o.innerType, t, r), i = t.seen.get(e);
  t.target === "openapi-3.0" ? (i.ref = o.innerType, n.nullable = !0) : n.anyOf = [a, { type: "null" }];
}, uv = (e, t, n, r) => {
  const o = e._zod.def;
  Je(o.innerType, t, r);
  const a = t.seen.get(e);
  a.ref = o.innerType;
}, fv = (e, t, n, r) => {
  const o = e._zod.def;
  Je(o.innerType, t, r);
  const a = t.seen.get(e);
  a.ref = o.innerType, n.default = JSON.parse(JSON.stringify(o.defaultValue));
}, pv = (e, t, n, r) => {
  const o = e._zod.def;
  Je(o.innerType, t, r);
  const a = t.seen.get(e);
  a.ref = o.innerType, t.io === "input" && (n._prefault = JSON.parse(JSON.stringify(o.defaultValue)));
}, mv = (e, t, n, r) => {
  const o = e._zod.def;
  Je(o.innerType, t, r);
  const a = t.seen.get(e);
  a.ref = o.innerType;
  let i;
  try {
    i = o.catchValue(void 0);
  } catch {
    throw new Error("Dynamic catch values are not supported in JSON Schema");
  }
  n.default = i;
}, hv = (e, t, n, r) => {
  const o = e._zod.def, a = t.io === "input" ? o.in._zod.def.type === "transform" ? o.out : o.in : o.out;
  Je(a, t, r);
  const i = t.seen.get(e);
  i.ref = a;
}, gv = (e, t, n, r) => {
  const o = e._zod.def;
  Je(o.innerType, t, r);
  const a = t.seen.get(e);
  a.ref = o.innerType, n.readOnly = !0;
}, Kl = (e, t, n, r) => {
  const o = e._zod.def;
  Je(o.innerType, t, r);
  const a = t.seen.get(e);
  a.ref = o.innerType;
}, yv = /* @__PURE__ */ U("ZodISODateTime", (e, t) => {
  kg.init(e, t), De.init(e, t);
});
function vv(e) {
  return /* @__PURE__ */ Ey(yv, e);
}
const bv = /* @__PURE__ */ U("ZodISODate", (e, t) => {
  Sg.init(e, t), De.init(e, t);
});
function wv(e) {
  return /* @__PURE__ */ Ay(bv, e);
}
const xv = /* @__PURE__ */ U("ZodISOTime", (e, t) => {
  Cg.init(e, t), De.init(e, t);
});
function _v(e) {
  return /* @__PURE__ */ Py(xv, e);
}
const kv = /* @__PURE__ */ U("ZodISODuration", (e, t) => {
  Ng.init(e, t), De.init(e, t);
});
function Sv(e) {
  return /* @__PURE__ */ Iy(kv, e);
}
const Cv = (e, t) => {
  Ol.init(e, t), e.name = "ZodError", Object.defineProperties(e, {
    format: {
      value: (n) => gh(e, n)
      // enumerable: false,
    },
    flatten: {
      value: (n) => hh(e, n)
      // enumerable: false,
    },
    addIssue: {
      value: (n) => {
        e.issues.push(n), e.message = JSON.stringify(e.issues, na, 2);
      }
      // enumerable: false,
    },
    addIssues: {
      value: (n) => {
        e.issues.push(...n), e.message = JSON.stringify(e.issues, na, 2);
      }
      // enumerable: false,
    },
    isEmpty: {
      get() {
        return e.issues.length === 0;
      }
      // enumerable: false,
    }
  });
}, Et = U("ZodError", Cv, {
  Parent: Error
}), Nv = /* @__PURE__ */ Oa(Et), Ev = /* @__PURE__ */ Ma(Et), Av = /* @__PURE__ */ Wo(Et), Pv = /* @__PURE__ */ Ho(Et), Iv = /* @__PURE__ */ bh(Et), Tv = /* @__PURE__ */ wh(Et), Rv = /* @__PURE__ */ xh(Et), Ov = /* @__PURE__ */ _h(Et), Mv = /* @__PURE__ */ kh(Et), Lv = /* @__PURE__ */ Sh(Et), Dv = /* @__PURE__ */ Ch(Et), $v = /* @__PURE__ */ Nh(Et), Be = /* @__PURE__ */ U("ZodType", (e, t) => (je.init(e, t), Object.assign(e["~standard"], {
  jsonSchema: {
    input: Co(e, "input"),
    output: Co(e, "output")
  }
}), e.toJSONSchema = Qy(e, {}), e.def = t, e.type = t.type, Object.defineProperty(e, "_def", { value: t }), e.check = (...n) => e.clone(wn(t, {
  checks: [
    ...t.checks ?? [],
    ...n.map((r) => typeof r == "function" ? { _zod: { check: r, def: { check: "custom" }, onattach: [] } } : r)
  ]
}), {
  parent: !0
}), e.with = e.check, e.clone = (n, r) => xn(e, n, r), e.brand = () => e, e.register = ((n, r) => (n.add(e, r), e)), e.parse = (n, r) => Nv(e, n, r, { callee: e.parse }), e.safeParse = (n, r) => Av(e, n, r), e.parseAsync = async (n, r) => Ev(e, n, r, { callee: e.parseAsync }), e.safeParseAsync = async (n, r) => Pv(e, n, r), e.spa = e.safeParseAsync, e.encode = (n, r) => Iv(e, n, r), e.decode = (n, r) => Tv(e, n, r), e.encodeAsync = async (n, r) => Rv(e, n, r), e.decodeAsync = async (n, r) => Ov(e, n, r), e.safeEncode = (n, r) => Mv(e, n, r), e.safeDecode = (n, r) => Lv(e, n, r), e.safeEncodeAsync = async (n, r) => Dv(e, n, r), e.safeDecodeAsync = async (n, r) => $v(e, n, r), e.refine = (n, r) => e.check(Ob(n, r)), e.superRefine = (n) => e.check(Mb(n)), e.overwrite = (n) => e.check(/* @__PURE__ */ ir(n)), e.optional = () => pc(e), e.exactOptional = () => wb(e), e.nullable = () => mc(e), e.nullish = () => pc(mc(e)), e.nonoptional = (n) => Nb(e, n), e.array = () => cb(e), e.or = (n) => ub([e, n]), e.and = (n) => pb(e, n), e.transform = (n) => hc(e, vb(n)), e.default = (n) => kb(e, n), e.prefault = (n) => Cb(e, n), e.catch = (n) => Ab(e, n), e.pipe = (n) => hc(e, n), e.readonly = () => Tb(e), e.describe = (n) => {
  const r = e.clone();
  return Cr.add(r, { description: n }), r;
}, Object.defineProperty(e, "description", {
  get() {
    return Cr.get(e)?.description;
  },
  configurable: !0
}), e.meta = (...n) => {
  if (n.length === 0)
    return Cr.get(e);
  const r = e.clone();
  return Cr.add(r, n[0]), r;
}, e.isOptional = () => e.safeParse(void 0).success, e.isNullable = () => e.safeParse(null).success, e.apply = (n) => n(e), e)), Jl = /* @__PURE__ */ U("_ZodString", (e, t) => {
  La.init(e, t), Be.init(e, t), e._zod.processJSONSchema = (r, o, a) => Jy(e, r, o);
  const n = e._zod.bag;
  e.format = n.format ?? null, e.minLength = n.minimum ?? null, e.maxLength = n.maximum ?? null, e.regex = (...r) => e.check(/* @__PURE__ */ Ly(...r)), e.includes = (...r) => e.check(/* @__PURE__ */ zy(...r)), e.startsWith = (...r) => e.check(/* @__PURE__ */ Fy(...r)), e.endsWith = (...r) => e.check(/* @__PURE__ */ jy(...r)), e.min = (...r) => e.check(/* @__PURE__ */ So(...r)), e.max = (...r) => e.check(/* @__PURE__ */ Zl(...r)), e.length = (...r) => e.check(/* @__PURE__ */ ql(...r)), e.nonempty = (...r) => e.check(/* @__PURE__ */ So(1, ...r)), e.lowercase = (r) => e.check(/* @__PURE__ */ Dy(r)), e.uppercase = (r) => e.check(/* @__PURE__ */ $y(r)), e.trim = () => e.check(/* @__PURE__ */ Uy()), e.normalize = (...r) => e.check(/* @__PURE__ */ By(...r)), e.toLowerCase = () => e.check(/* @__PURE__ */ Vy()), e.toUpperCase = () => e.check(/* @__PURE__ */ Wy()), e.slugify = () => e.check(/* @__PURE__ */ Hy());
}), zv = /* @__PURE__ */ U("ZodString", (e, t) => {
  La.init(e, t), Jl.init(e, t), e.email = (n) => e.check(/* @__PURE__ */ ay(Fv, n)), e.url = (n) => e.check(/* @__PURE__ */ uy(jv, n)), e.jwt = (n) => e.check(/* @__PURE__ */ Ny(tb, n)), e.emoji = (n) => e.check(/* @__PURE__ */ fy(Bv, n)), e.guid = (n) => e.check(/* @__PURE__ */ ac(dc, n)), e.uuid = (n) => e.check(/* @__PURE__ */ iy(Jr, n)), e.uuidv4 = (n) => e.check(/* @__PURE__ */ cy(Jr, n)), e.uuidv6 = (n) => e.check(/* @__PURE__ */ ly(Jr, n)), e.uuidv7 = (n) => e.check(/* @__PURE__ */ dy(Jr, n)), e.nanoid = (n) => e.check(/* @__PURE__ */ py(Uv, n)), e.guid = (n) => e.check(/* @__PURE__ */ ac(dc, n)), e.cuid = (n) => e.check(/* @__PURE__ */ my(Vv, n)), e.cuid2 = (n) => e.check(/* @__PURE__ */ hy(Wv, n)), e.ulid = (n) => e.check(/* @__PURE__ */ gy(Hv, n)), e.base64 = (n) => e.check(/* @__PURE__ */ ky(Jv, n)), e.base64url = (n) => e.check(/* @__PURE__ */ Sy(Xv, n)), e.xid = (n) => e.check(/* @__PURE__ */ yy(Zv, n)), e.ksuid = (n) => e.check(/* @__PURE__ */ vy(qv, n)), e.ipv4 = (n) => e.check(/* @__PURE__ */ by(Gv, n)), e.ipv6 = (n) => e.check(/* @__PURE__ */ wy(Yv, n)), e.cidrv4 = (n) => e.check(/* @__PURE__ */ xy(Qv, n)), e.cidrv6 = (n) => e.check(/* @__PURE__ */ _y(Kv, n)), e.e164 = (n) => e.check(/* @__PURE__ */ Cy(eb, n)), e.datetime = (n) => e.check(vv(n)), e.date = (n) => e.check(wv(n)), e.time = (n) => e.check(_v(n)), e.duration = (n) => e.check(Sv(n));
});
function ct(e) {
  return /* @__PURE__ */ sy(zv, e);
}
const De = /* @__PURE__ */ U("ZodStringFormat", (e, t) => {
  Oe.init(e, t), Jl.init(e, t);
}), Fv = /* @__PURE__ */ U("ZodEmail", (e, t) => {
  mg.init(e, t), De.init(e, t);
}), dc = /* @__PURE__ */ U("ZodGUID", (e, t) => {
  fg.init(e, t), De.init(e, t);
}), Jr = /* @__PURE__ */ U("ZodUUID", (e, t) => {
  pg.init(e, t), De.init(e, t);
}), jv = /* @__PURE__ */ U("ZodURL", (e, t) => {
  hg.init(e, t), De.init(e, t);
}), Bv = /* @__PURE__ */ U("ZodEmoji", (e, t) => {
  gg.init(e, t), De.init(e, t);
}), Uv = /* @__PURE__ */ U("ZodNanoID", (e, t) => {
  yg.init(e, t), De.init(e, t);
}), Vv = /* @__PURE__ */ U("ZodCUID", (e, t) => {
  vg.init(e, t), De.init(e, t);
}), Wv = /* @__PURE__ */ U("ZodCUID2", (e, t) => {
  bg.init(e, t), De.init(e, t);
}), Hv = /* @__PURE__ */ U("ZodULID", (e, t) => {
  wg.init(e, t), De.init(e, t);
}), Zv = /* @__PURE__ */ U("ZodXID", (e, t) => {
  xg.init(e, t), De.init(e, t);
}), qv = /* @__PURE__ */ U("ZodKSUID", (e, t) => {
  _g.init(e, t), De.init(e, t);
}), Gv = /* @__PURE__ */ U("ZodIPv4", (e, t) => {
  Eg.init(e, t), De.init(e, t);
}), Yv = /* @__PURE__ */ U("ZodIPv6", (e, t) => {
  Ag.init(e, t), De.init(e, t);
}), Qv = /* @__PURE__ */ U("ZodCIDRv4", (e, t) => {
  Pg.init(e, t), De.init(e, t);
}), Kv = /* @__PURE__ */ U("ZodCIDRv6", (e, t) => {
  Ig.init(e, t), De.init(e, t);
}), Jv = /* @__PURE__ */ U("ZodBase64", (e, t) => {
  Tg.init(e, t), De.init(e, t);
}), Xv = /* @__PURE__ */ U("ZodBase64URL", (e, t) => {
  Og.init(e, t), De.init(e, t);
}), eb = /* @__PURE__ */ U("ZodE164", (e, t) => {
  Mg.init(e, t), De.init(e, t);
}), tb = /* @__PURE__ */ U("ZodJWT", (e, t) => {
  Dg.init(e, t), De.init(e, t);
}), Xl = /* @__PURE__ */ U("ZodNumber", (e, t) => {
  Ul.init(e, t), Be.init(e, t), e._zod.processJSONSchema = (r, o, a) => Xy(e, r, o), e.gt = (r, o) => e.check(/* @__PURE__ */ cc(r, o)), e.gte = (r, o) => e.check(/* @__PURE__ */ Ps(r, o)), e.min = (r, o) => e.check(/* @__PURE__ */ Ps(r, o)), e.lt = (r, o) => e.check(/* @__PURE__ */ ic(r, o)), e.lte = (r, o) => e.check(/* @__PURE__ */ As(r, o)), e.max = (r, o) => e.check(/* @__PURE__ */ As(r, o)), e.int = (r) => e.check(uc(r)), e.safe = (r) => e.check(uc(r)), e.positive = (r) => e.check(/* @__PURE__ */ cc(0, r)), e.nonnegative = (r) => e.check(/* @__PURE__ */ Ps(0, r)), e.negative = (r) => e.check(/* @__PURE__ */ ic(0, r)), e.nonpositive = (r) => e.check(/* @__PURE__ */ As(0, r)), e.multipleOf = (r, o) => e.check(/* @__PURE__ */ lc(r, o)), e.step = (r, o) => e.check(/* @__PURE__ */ lc(r, o)), e.finite = () => e;
  const n = e._zod.bag;
  e.minValue = Math.max(n.minimum ?? Number.NEGATIVE_INFINITY, n.exclusiveMinimum ?? Number.NEGATIVE_INFINITY) ?? null, e.maxValue = Math.min(n.maximum ?? Number.POSITIVE_INFINITY, n.exclusiveMaximum ?? Number.POSITIVE_INFINITY) ?? null, e.isInt = (n.format ?? "").includes("int") || Number.isSafeInteger(n.multipleOf ?? 0.5), e.isFinite = !0, e.format = n.format ?? null;
});
function nb(e) {
  return /* @__PURE__ */ Ty(Xl, e);
}
const rb = /* @__PURE__ */ U("ZodNumberFormat", (e, t) => {
  $g.init(e, t), Xl.init(e, t);
});
function uc(e) {
  return /* @__PURE__ */ Ry(rb, e);
}
const ob = /* @__PURE__ */ U("ZodUnknown", (e, t) => {
  zg.init(e, t), Be.init(e, t), e._zod.processJSONSchema = (n, r, o) => tv();
});
function fc() {
  return /* @__PURE__ */ Oy(ob);
}
const sb = /* @__PURE__ */ U("ZodNever", (e, t) => {
  Fg.init(e, t), Be.init(e, t), e._zod.processJSONSchema = (n, r, o) => ev(e, n, r);
});
function ab(e) {
  return /* @__PURE__ */ My(sb, e);
}
const ib = /* @__PURE__ */ U("ZodArray", (e, t) => {
  jg.init(e, t), Be.init(e, t), e._zod.processJSONSchema = (n, r, o) => av(e, n, r, o), e.element = t.element, e.min = (n, r) => e.check(/* @__PURE__ */ So(n, r)), e.nonempty = (n) => e.check(/* @__PURE__ */ So(1, n)), e.max = (n, r) => e.check(/* @__PURE__ */ Zl(n, r)), e.length = (n, r) => e.check(/* @__PURE__ */ ql(n, r)), e.unwrap = () => e.element;
});
function cb(e, t) {
  return /* @__PURE__ */ Zy(ib, e, t);
}
const lb = /* @__PURE__ */ U("ZodObject", (e, t) => {
  Ug.init(e, t), Be.init(e, t), e._zod.processJSONSchema = (n, r, o) => iv(e, n, r, o), Ce(e, "shape", () => t.shape), e.keyof = () => mb(Object.keys(e._zod.def.shape)), e.catchall = (n) => e.clone({ ...e._zod.def, catchall: n }), e.passthrough = () => e.clone({ ...e._zod.def, catchall: fc() }), e.loose = () => e.clone({ ...e._zod.def, catchall: fc() }), e.strict = () => e.clone({ ...e._zod.def, catchall: ab() }), e.strip = () => e.clone({ ...e._zod.def, catchall: void 0 }), e.extend = (n) => dh(e, n), e.safeExtend = (n) => uh(e, n), e.merge = (n) => fh(e, n), e.pick = (n) => ch(e, n), e.omit = (n) => lh(e, n), e.partial = (...n) => ph(td, e, n[0]), e.required = (...n) => mh(nd, e, n[0]);
});
function ed(e, t) {
  const n = {
    type: "object",
    shape: e ?? {},
    ...de(t)
  };
  return new lb(n);
}
const db = /* @__PURE__ */ U("ZodUnion", (e, t) => {
  Vg.init(e, t), Be.init(e, t), e._zod.processJSONSchema = (n, r, o) => cv(e, n, r, o), e.options = t.options;
});
function ub(e, t) {
  return new db({
    type: "union",
    options: e,
    ...de(t)
  });
}
const fb = /* @__PURE__ */ U("ZodIntersection", (e, t) => {
  Wg.init(e, t), Be.init(e, t), e._zod.processJSONSchema = (n, r, o) => lv(e, n, r, o);
});
function pb(e, t) {
  return new fb({
    type: "intersection",
    left: e,
    right: t
  });
}
const oa = /* @__PURE__ */ U("ZodEnum", (e, t) => {
  Hg.init(e, t), Be.init(e, t), e._zod.processJSONSchema = (r, o, a) => nv(e, r, o), e.enum = t.entries, e.options = Object.values(t.entries);
  const n = new Set(Object.keys(t.entries));
  e.extract = (r, o) => {
    const a = {};
    for (const i of r)
      if (n.has(i))
        a[i] = t.entries[i];
      else
        throw new Error(`Key ${i} not found in enum`);
    return new oa({
      ...t,
      checks: [],
      ...de(o),
      entries: a
    });
  }, e.exclude = (r, o) => {
    const a = { ...t.entries };
    for (const i of r)
      if (n.has(i))
        delete a[i];
      else
        throw new Error(`Key ${i} not found in enum`);
    return new oa({
      ...t,
      checks: [],
      ...de(o),
      entries: a
    });
  };
});
function mb(e, t) {
  const n = Array.isArray(e) ? Object.fromEntries(e.map((r) => [r, r])) : e;
  return new oa({
    type: "enum",
    entries: n,
    ...de(t)
  });
}
const hb = /* @__PURE__ */ U("ZodLiteral", (e, t) => {
  Zg.init(e, t), Be.init(e, t), e._zod.processJSONSchema = (n, r, o) => rv(e, n, r), e.values = new Set(t.values), Object.defineProperty(e, "value", {
    get() {
      if (t.values.length > 1)
        throw new Error("This schema contains multiple valid literal values. Use `.values` instead.");
      return t.values[0];
    }
  });
});
function gb(e, t) {
  return new hb({
    type: "literal",
    values: Array.isArray(e) ? e : [e],
    ...de(t)
  });
}
const yb = /* @__PURE__ */ U("ZodTransform", (e, t) => {
  qg.init(e, t), Be.init(e, t), e._zod.processJSONSchema = (n, r, o) => sv(e, n), e._zod.parse = (n, r) => {
    if (r.direction === "backward")
      throw new Nl(e.constructor.name);
    n.addIssue = (a) => {
      if (typeof a == "string")
        n.issues.push(Tr(a, n.value, t));
      else {
        const i = a;
        i.fatal && (i.continue = !1), i.code ?? (i.code = "custom"), i.input ?? (i.input = n.value), i.inst ?? (i.inst = e), n.issues.push(Tr(i));
      }
    };
    const o = t.transform(n.value, n);
    return o instanceof Promise ? o.then((a) => (n.value = a, n)) : (n.value = o, n);
  };
});
function vb(e) {
  return new yb({
    type: "transform",
    transform: e
  });
}
const td = /* @__PURE__ */ U("ZodOptional", (e, t) => {
  Hl.init(e, t), Be.init(e, t), e._zod.processJSONSchema = (n, r, o) => Kl(e, n, r, o), e.unwrap = () => e._zod.def.innerType;
});
function pc(e) {
  return new td({
    type: "optional",
    innerType: e
  });
}
const bb = /* @__PURE__ */ U("ZodExactOptional", (e, t) => {
  Gg.init(e, t), Be.init(e, t), e._zod.processJSONSchema = (n, r, o) => Kl(e, n, r, o), e.unwrap = () => e._zod.def.innerType;
});
function wb(e) {
  return new bb({
    type: "optional",
    innerType: e
  });
}
const xb = /* @__PURE__ */ U("ZodNullable", (e, t) => {
  Yg.init(e, t), Be.init(e, t), e._zod.processJSONSchema = (n, r, o) => dv(e, n, r, o), e.unwrap = () => e._zod.def.innerType;
});
function mc(e) {
  return new xb({
    type: "nullable",
    innerType: e
  });
}
const _b = /* @__PURE__ */ U("ZodDefault", (e, t) => {
  Qg.init(e, t), Be.init(e, t), e._zod.processJSONSchema = (n, r, o) => fv(e, n, r, o), e.unwrap = () => e._zod.def.innerType, e.removeDefault = e.unwrap;
});
function kb(e, t) {
  return new _b({
    type: "default",
    innerType: e,
    get defaultValue() {
      return typeof t == "function" ? t() : Il(t);
    }
  });
}
const Sb = /* @__PURE__ */ U("ZodPrefault", (e, t) => {
  Kg.init(e, t), Be.init(e, t), e._zod.processJSONSchema = (n, r, o) => pv(e, n, r, o), e.unwrap = () => e._zod.def.innerType;
});
function Cb(e, t) {
  return new Sb({
    type: "prefault",
    innerType: e,
    get defaultValue() {
      return typeof t == "function" ? t() : Il(t);
    }
  });
}
const nd = /* @__PURE__ */ U("ZodNonOptional", (e, t) => {
  Jg.init(e, t), Be.init(e, t), e._zod.processJSONSchema = (n, r, o) => uv(e, n, r, o), e.unwrap = () => e._zod.def.innerType;
});
function Nb(e, t) {
  return new nd({
    type: "nonoptional",
    innerType: e,
    ...de(t)
  });
}
const Eb = /* @__PURE__ */ U("ZodCatch", (e, t) => {
  Xg.init(e, t), Be.init(e, t), e._zod.processJSONSchema = (n, r, o) => mv(e, n, r, o), e.unwrap = () => e._zod.def.innerType, e.removeCatch = e.unwrap;
});
function Ab(e, t) {
  return new Eb({
    type: "catch",
    innerType: e,
    catchValue: typeof t == "function" ? t : () => t
  });
}
const Pb = /* @__PURE__ */ U("ZodPipe", (e, t) => {
  ey.init(e, t), Be.init(e, t), e._zod.processJSONSchema = (n, r, o) => hv(e, n, r, o), e.in = t.in, e.out = t.out;
});
function hc(e, t) {
  return new Pb({
    type: "pipe",
    in: e,
    out: t
    // ...util.normalizeParams(params),
  });
}
const Ib = /* @__PURE__ */ U("ZodReadonly", (e, t) => {
  ty.init(e, t), Be.init(e, t), e._zod.processJSONSchema = (n, r, o) => gv(e, n, r, o), e.unwrap = () => e._zod.def.innerType;
});
function Tb(e) {
  return new Ib({
    type: "readonly",
    innerType: e
  });
}
const Rb = /* @__PURE__ */ U("ZodCustom", (e, t) => {
  ny.init(e, t), Be.init(e, t), e._zod.processJSONSchema = (n, r, o) => ov(e, n);
});
function Ob(e, t = {}) {
  return /* @__PURE__ */ qy(Rb, e, t);
}
function Mb(e) {
  return /* @__PURE__ */ Gy(e);
}
const Xr = ed({
  line1: ct().min(1, "Address line 1 is required"),
  line2: ct().optional(),
  city: ct().min(1, "City is required"),
  state: ct().optional(),
  postalCode: ct().min(1, "Postal code is required"),
  country: ct().min(2, "Country is required")
});
function Lb(e) {
  return ed({
    email: e.requireEmail ? ct().email("Valid email required") : ct().email("Valid email required").or(gb("")).optional(),
    name: e.requireName ? ct().min(1, "Name is required") : ct().optional(),
    phone: e.requirePhone ? ct().min(6, "Phone is required") : ct().optional(),
    notes: ct().max(500).optional(),
    shippingAddress: e.requireShippingAddress ? Xr : Xr.optional(),
    billingAddress: e.requireBillingAddress ? Xr : Xr.optional(),
    discountCode: ct().optional(),
    tipAmount: nb().min(0).optional(),
    shippingMethodId: ct().optional()
  });
}
const gc = { none: 0, optional: 1, required: 2 };
function Is(e, t) {
  return gc[e] >= gc[t] ? e : t;
}
function Db(e) {
  if (!e) return null;
  try {
    const t = JSON.parse(e);
    return !t || typeof t != "object" ? null : t;
  } catch {
    return null;
  }
}
function ho(e, t) {
  let n = !1, r = !1;
  const o = /* @__PURE__ */ new Set();
  let a = t.requireEmail ? "required" : "none", i = t.defaultMode === "none" ? "none" : "optional", c = t.defaultMode === "full" ? "optional" : "none", l = t.allowShipping && (t.defaultMode === "shipping" || t.defaultMode === "full"), d = t.defaultMode === "full";
  for (const u of e) {
    u.metadata?.shippingProfile === "digital" ? n = !0 : r = !0;
    const g = Db(u.metadata?.checkoutRequirements);
    g && (g.email && (a = Is(a, g.email)), g.name && (i = Is(i, g.name)), g.phone && (c = Is(c, g.phone)), typeof g.shippingAddress == "boolean" && (l = l || g.shippingAddress), typeof g.billingAddress == "boolean" && (d = d || g.billingAddress));
    const b = u.metadata?.fulfillmentNotes;
    b && o.add(b);
  }
  const f = n && !r;
  return f && (l = !1), {
    email: a,
    name: i,
    phone: c,
    shippingAddress: l,
    billingAddress: d,
    fulfillmentNotes: Array.from(o).join(" "),
    isDigitalOnly: f,
    hasPhysical: r
  };
}
const rd = L.createContext(null);
function od() {
  const { config: e } = Le(), t = zt(), n = L.useMemo(
    () => ({
      line1: "",
      line2: "",
      city: "",
      state: "",
      postalCode: "",
      country: "US"
    }),
    []
  ), r = L.useMemo(
    () => {
      const _ = ho(t.items, {
        requireEmail: e.checkout.requireEmail ?? !0,
        defaultMode: e.checkout.mode,
        allowShipping: e.checkout.allowShipping ?? !1
      });
      return Lb({
        requireEmail: _.email === "required",
        requireName: _.name === "required",
        requirePhone: _.phone === "required",
        requireShippingAddress: _.shippingAddress,
        requireBillingAddress: _.billingAddress
      });
    },
    [t.items, e.checkout.allowShipping, e.checkout.mode, e.checkout.requireEmail]
  ), [o, a] = L.useState(() => ({
    email: e.checkout.requireEmail ?? !0 ? "" : void 0,
    name: "",
    phone: "",
    notes: "",
    shippingAddress: e.checkout.mode === "shipping" || e.checkout.mode === "full" ? n : void 0,
    billingAddress: e.checkout.mode === "full" ? n : void 0,
    discountCode: "",
    tipAmount: 0,
    shippingMethodId: ""
  }));
  L.useEffect(() => {
    const _ = ho(t.items, {
      requireEmail: e.checkout.requireEmail ?? !0,
      defaultMode: e.checkout.mode,
      allowShipping: e.checkout.allowShipping ?? !1
    });
    a((x) => {
      const S = { ...x };
      return _.email === "required" && !S.email && (S.email = ""), _.shippingAddress && !S.shippingAddress && (S.shippingAddress = n), _.billingAddress && !S.billingAddress && (S.billingAddress = n), _.shippingAddress || (S.shippingAddress = void 0), _.billingAddress || (S.billingAddress = void 0), S;
    });
  }, [t.items, e.checkout.allowShipping, e.checkout.mode, e.checkout.requireEmail, n]);
  const i = L.useRef(!1), [c, l] = L.useState({}), [d, f] = L.useState("idle"), [u, h] = L.useState(null), [g, b] = L.useState(null), v = L.useCallback(() => {
    l({}), f("idle"), h(null), b(null);
  }, []), y = L.useCallback((_, x) => {
    a((S) => ({ ...S, [_]: x }));
  }, []), w = L.useCallback(() => {
    f("validating"), h(null);
    const _ = r.safeParse(o);
    if (_.success)
      return l({}), f("idle"), { ok: !0, values: _.data };
    const x = {};
    for (const S of _.error.issues)
      x[S.path.join(".")] = S.message;
    return l(x), f("error"), h("Please fix the highlighted fields."), { ok: !1 };
  }, [r, o]), k = L.useCallback(
    async (_) => {
      if (i.current) return { ok: !1 };
      const x = w();
      if (!x.ok) return { ok: !1 };
      i.current = !0, f("creating_session"), h(null), b(null);
      const S = t.items.map((P) => ({
        resource: P.paymentResource ?? P.productId,
        quantity: P.qty,
        variantId: P.variantId
      })), I = ho(t.items, {
        requireEmail: e.checkout.requireEmail ?? !0,
        defaultMode: e.checkout.mode,
        allowShipping: e.checkout.allowShipping ?? !1
      }), R = /* @__PURE__ */ new Set();
      if (I.shippingAddress)
        for (const P of t.items) {
          const O = P.metadata?.shippingCountries;
          if (O)
            for (const T of O.split(",")) {
              const D = T.trim().toUpperCase();
              D && R.add(D);
            }
        }
      const E = {
        ...R.size ? {
          shippingCountries: Array.from(R).join(","),
          shipping_countries: Array.from(R).join(",")
        } : {}
      };
      try {
        const P = await e.adapter.createCheckoutSession({
          cart: S,
          customer: {
            email: x.values.email || void 0,
            name: x.values.name || void 0,
            phone: x.values.phone || void 0,
            notes: x.values.notes || void 0,
            shippingAddress: x.values.shippingAddress,
            billingAddress: x.values.billingAddress
          },
          options: {
            currency: e.currency,
            successUrl: e.checkout.successUrl,
            cancelUrl: e.checkout.cancelUrl,
            allowPromoCodes: e.checkout.allowPromoCodes,
            metadata: Object.keys(E).length ? E : void 0,
            discountCode: (e.checkout.allowPromoCodes ? x.values.discountCode || t.promoCode : void 0) || void 0,
            tipAmount: e.checkout.allowTipping && x.values.tipAmount || void 0,
            shippingMethodId: e.checkout.allowShipping && x.values.shippingMethodId || void 0,
            paymentMethodId: _?.paymentMethodId
          }
        });
        return P.kind === "redirect" ? (b(P), f("redirecting"), typeof window < "u" && window.location.assign(P.url), { ok: !0, session: P }) : (b(P), f("success"), { ok: !0, session: P });
      } catch (P) {
        return f("error"), h(P instanceof Error ? P.message : "Checkout failed"), { ok: !1 };
      } finally {
        i.current = !1;
      }
    },
    [t.items, t.promoCode, e.adapter, e.checkout, e.currency, w]
  );
  return {
    values: o,
    setValues: a,
    setField: y,
    fieldErrors: c,
    status: d,
    error: u,
    session: g,
    reset: v,
    validate: w,
    createCheckoutSession: k
  };
}
function sd({ children: e }) {
  const t = od();
  return /* @__PURE__ */ s(rd.Provider, { value: t, children: e });
}
function qo() {
  const e = L.useContext(rd);
  if (!e)
    throw new Error("useCheckout must be used within CheckoutProvider");
  return e;
}
function $b() {
  return od();
}
function Da() {
  const { config: e } = Le(), [t, n] = m.useState([]), [r, o] = m.useState(!0), [a, i] = m.useState(null);
  return m.useEffect(() => {
    let c = !1;
    return o(!0), i(null), e.adapter.listCategories().then((l) => {
      c || n(l);
    }).catch((l) => {
      c || i(l instanceof Error ? l.message : "Failed to load categories");
    }).finally(() => {
      c || o(!1);
    }), () => {
      c = !0;
    };
  }, [e.adapter]), { categories: t, isLoading: r, error: a };
}
function Go(e) {
  const { config: t } = Le(), [n, r] = m.useState(null), [o, a] = m.useState(!0), [i, c] = m.useState(null), l = m.useMemo(() => JSON.stringify(e.filters ?? {}), [e.filters]);
  return m.useEffect(() => {
    let d = !1;
    return a(!0), c(null), t.adapter.listProducts(e).then((f) => {
      d || r(f);
    }).catch((f) => {
      d || c(f instanceof Error ? f.message : "Failed to load products");
    }).finally(() => {
      d || a(!1);
    }), () => {
      d = !0;
    };
  }, [t.adapter, e.category, e.search, e.sort, e.page, e.pageSize, l]), { data: n, isLoading: o, error: i };
}
function ad(e) {
  const { config: t } = Le(), [n, r] = m.useState(null), [o, a] = m.useState(!0), [i, c] = m.useState(null);
  return m.useEffect(() => {
    let l = !1;
    return a(!0), c(null), t.adapter.getProductBySlug(e).then((d) => {
      l || r(d);
    }).catch((d) => {
      l || c(d instanceof Error ? d.message : "Failed to load product");
    }).finally(() => {
      l || a(!1);
    }), () => {
      l = !0;
    };
  }, [t.adapter, e]), { product: n, isLoading: o, error: i };
}
function id() {
  const { config: e } = Le(), [t, n] = m.useState([]), [r, o] = m.useState(!0), [a, i] = m.useState(null);
  return m.useEffect(() => {
    let c = !1;
    return o(!0), i(null), e.adapter.getOrderHistory().then((l) => {
      c || n(l);
    }).catch((l) => {
      c || i(l instanceof Error ? l.message : "Failed to load orders");
    }).finally(() => {
      c || o(!1);
    }), () => {
      c = !0;
    };
  }, [e.adapter]), { orders: t, isLoading: r, error: a };
}
function cd() {
  const { config: e } = Le(), [t, n] = m.useState([]), [r, o] = m.useState(null), [a, i] = m.useState(!0), [c, l] = m.useState(null);
  return m.useEffect(() => {
    let d = !1;
    async function f() {
      i(!0), l(null);
      try {
        const [u, h] = await Promise.all([
          e.adapter.listSubscriptionTiers?.() ?? Promise.resolve([]),
          e.adapter.getSubscriptionStatus?.() ?? Promise.resolve(null)
        ]);
        if (d) return;
        n(u), o(h);
      } catch (u) {
        if (d) return;
        l(u instanceof Error ? u.message : "Failed to load subscriptions");
      } finally {
        d || i(!1);
      }
    }
    return f(), () => {
      d = !0;
    };
  }, [e.adapter]), { tiers: t, status: r, isLoading: a, error: c };
}
function ld({
  enabled: e,
  customer: t
}) {
  const { config: n } = Le(), [r, o] = m.useState([]), [a, i] = m.useState(!1), [c, l] = m.useState(null), d = JSON.stringify(t.shippingAddress ?? {});
  return m.useEffect(() => {
    let f = !1;
    if (!e || !n.adapter.getShippingMethods) {
      o([]);
      return;
    }
    return i(!0), l(null), n.adapter.getShippingMethods({ currency: n.currency, customer: t }).then((u) => {
      f || o(u);
    }).catch((u) => {
      f || l(u instanceof Error ? u.message : "Failed to load shipping methods");
    }).finally(() => {
      f || i(!1);
    }), () => {
      f = !0;
    };
  }, [n.adapter, n.currency, e, t.email, t.name, d]), { methods: r, isLoading: a, error: c };
}
function yr(e, ...t) {
  for (const n of t) {
    const r = e[n];
    if (r) return r;
  }
}
function $a(e) {
  const t = yr(e, "error", "error_message", "message");
  if (t) return { kind: "error", message: t };
  const n = yr(e, "canceled", "cancelled", "cancel", "canceled_at");
  if (n && n !== "0" && n !== "false") return { kind: "cancel" };
  const r = yr(e, "orderId", "order_id", "demoOrderId"), o = yr(e, "session_id", "checkout_session_id");
  if (r || o) return { kind: "success", orderId: r ?? o };
  const a = (yr(e, "status", "checkout") ?? "").toLowerCase();
  return a === "success" ? { kind: "success", orderId: r } : a === "cancel" || a === "canceled" ? { kind: "cancel" } : a === "error" ? { kind: "error" } : { kind: "idle" };
}
function zb(e) {
  const t = {};
  return e.forEach((n, r) => {
    t[r] = n;
  }), t;
}
function za() {
  const { config: e } = Le(), [t, n] = m.useState({ kind: "idle" });
  return m.useEffect(() => {
    if (typeof window > "u") return;
    const r = new URLSearchParams(window.location.search), o = zb(r);
    (async () => {
      try {
        const a = e.adapter.resolveCheckoutReturn ? await e.adapter.resolveCheckoutReturn({ query: o }) : $a(o);
        if (a.kind === "success" && a.orderId && e.adapter.getOrderById) {
          const i = await e.adapter.getOrderById(a.orderId);
          if (i) {
            n({ kind: "success", orderId: a.orderId, order: i });
            return;
          }
        }
        n(a);
      } catch (a) {
        n({ kind: "error", message: a instanceof Error ? a.message : "Failed to resolve checkout" });
      }
    })();
  }, [e.adapter]), t;
}
function sa(e) {
  if (!e) return;
  const t = Number(e);
  return Number.isFinite(t) ? t : void 0;
}
function Fb(e) {
  const t = e.get("tags"), n = t ? t.split(",").map((c) => c.trim()).filter(Boolean) : void 0, r = sa(e.get("min")), o = sa(e.get("max")), a = e.get("inStock"), i = a === "1" ? !0 : a === "0" ? !1 : void 0;
  return {
    tags: n && n.length ? n : void 0,
    priceMin: r,
    priceMax: o,
    inStock: i
  };
}
function jb(e, t) {
  t.tags?.length ? e.set("tags", t.tags.join(",")) : e.delete("tags"), typeof t.priceMin == "number" ? e.set("min", String(t.priceMin)) : e.delete("min"), typeof t.priceMax == "number" ? e.set("max", String(t.priceMax)) : e.delete("max"), typeof t.inStock == "boolean" ? e.set("inStock", t.inStock ? "1" : "0") : e.delete("inStock");
}
function Fa({ includeCategory: e }) {
  if (typeof window > "u") return null;
  const t = new URLSearchParams(window.location.search), n = t.get("q") ?? "", r = t.get("sort") ?? "featured", o = sa(t.get("page")) ?? 1, a = Fb(t), i = e ? t.get("cat") ?? void 0 : void 0;
  return {
    search: n,
    sort: r,
    page: Math.max(1, Math.floor(o)),
    category: i,
    filters: a
  };
}
function ja(e, { includeCategory: t }) {
  const n = e.filters.tags?.join(",") ?? "";
  m.useEffect(() => {
    if (typeof window > "u") return;
    const r = window.setTimeout(() => {
      const o = new URL(window.location.href), a = o.searchParams;
      e.search.trim() ? a.set("q", e.search.trim()) : a.delete("q"), e.sort && e.sort !== "featured" ? a.set("sort", e.sort) : a.delete("sort"), e.page && e.page !== 1 ? a.set("page", String(e.page)) : a.delete("page"), t && (e.category ? a.set("cat", e.category) : a.delete("cat")), jb(a, e.filters);
      const i = `${o.pathname}?${a.toString()}${o.hash}`, c = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      i !== c && window.history.replaceState({}, "", i);
    }, 250);
    return () => window.clearTimeout(r);
  }, [
    t,
    e.category,
    e.page,
    e.search,
    e.sort,
    n,
    e.filters.priceMin,
    e.filters.priceMax,
    e.filters.inStock
  ]);
}
function yc(e, t) {
  return `${e}::${t ?? ""}`;
}
function Bb(e, t) {
  if (t && e.variants?.length) {
    const n = e.variants.find((r) => r.id === t);
    if (n)
      return {
        qty: n.inventoryQuantity,
        status: n.inventoryStatus
      };
  }
  return {
    qty: e.inventoryQuantity,
    status: e.inventoryStatus
  };
}
function Ub(e, t) {
  const n = {
    productId: e.productId,
    variantId: e.variantId,
    isOutOfStock: !1,
    exceedsAvailable: !1,
    isLowStock: !1
  };
  if (!t)
    return {
      ...n,
      isOutOfStock: !0,
      message: "This product is no longer available"
    };
  const { qty: r, status: o } = Bb(t, e.variantId);
  return n.availableQty = r, n.status = o, o === "out_of_stock" || typeof r == "number" && r <= 0 ? {
    ...n,
    isOutOfStock: !0,
    message: "Out of stock"
  } : typeof r == "number" && e.qty > r ? {
    ...n,
    exceedsAvailable: !0,
    message: r === 0 ? "Out of stock" : `Only ${r} available (you have ${e.qty} in cart)`
  } : o === "low" || typeof r == "number" && r > 0 && r <= 5 ? {
    ...n,
    isLowStock: !0,
    message: typeof r == "number" ? `Only ${r} left` : "Low stock"
  } : n;
}
function Ba({
  items: e,
  refreshInterval: t = 3e4,
  skip: n = !1
}) {
  const { config: r } = Le(), [o, a] = m.useState(/* @__PURE__ */ new Map()), [i, c] = m.useState(!1), [l, d] = m.useState(null), f = m.useRef(e);
  f.current = e;
  const u = m.useMemo(() => {
    const w = /* @__PURE__ */ new Set();
    for (const k of e)
      w.add(k.productId);
    return w;
  }, [e]), h = m.useMemo(
    () => Array.from(u).sort().join(","),
    [u]
  ), g = m.useMemo(
    () => Array.from(u),
    [u]
  ), b = m.useCallback(async () => {
    if (n || g.length === 0) {
      a(/* @__PURE__ */ new Map());
      return;
    }
    c(!0), d(null);
    try {
      let w = /* @__PURE__ */ new Map();
      if (r.adapter.getProductsByIds)
        w = await r.adapter.getProductsByIds(g);
      else {
        const _ = await Promise.all(
          g.map(async (x) => {
            try {
              return await r.adapter.getProductBySlug(x);
            } catch {
              return null;
            }
          })
        );
        w = /* @__PURE__ */ new Map();
        for (const x of _)
          x && (w.set(x.id, x), x.slug && x.slug !== x.id && w.set(x.slug, x));
      }
      const k = /* @__PURE__ */ new Map();
      for (const _ of f.current) {
        const x = yc(_.productId, _.variantId), S = w.get(_.productId) ?? null;
        k.set(x, Ub(_, S));
      }
      a(k);
    } catch (w) {
      d(w instanceof Error ? w.message : "Failed to check inventory");
    } finally {
      c(!1);
    }
  }, [r.adapter, h, n]);
  m.useEffect(() => {
    b();
  }, [b]), m.useEffect(() => {
    if (n || t <= 0 || g.length === 0) return;
    const w = setInterval(b, t);
    return () => clearInterval(w);
  }, [b, g.length, t, n]);
  const v = m.useCallback(
    (w, k) => o.get(yc(w, k)),
    [o]
  ), y = m.useMemo(() => {
    for (const w of o.values())
      if (w.isOutOfStock || w.exceedsAvailable)
        return !0;
    return !1;
  }, [o]);
  return {
    inventory: o,
    isLoading: i,
    error: l,
    refresh: b,
    getItemInventory: v,
    hasIssues: y
  };
}
function Vb(e, t) {
  if (t && e.variants?.length) {
    const n = e.variants.find((r) => r.id === t);
    if (n)
      return {
        qty: n.inventoryQuantity,
        status: n.inventoryStatus
      };
  }
  return {
    qty: e.inventoryQuantity,
    status: e.inventoryStatus
  };
}
function Wb(e, t, n) {
  if (!t) return e.titleSnapshot ?? "Unknown Product";
  const r = t.title ?? e.titleSnapshot ?? "Product";
  if (n && t.variants?.length) {
    const o = t.variants.find((a) => a.id === n);
    if (o?.title)
      return `${r} - ${o.title}`;
  }
  return r;
}
function Hb(e, t) {
  const n = Wb(e, t, e.variantId);
  if (!t)
    return {
      productId: e.productId,
      variantId: e.variantId,
      title: n,
      requestedQty: e.qty,
      availableQty: 0,
      type: "product_unavailable",
      message: "This product is no longer available"
    };
  const { qty: r, status: o } = Vb(t, e.variantId);
  return o === "out_of_stock" || typeof r == "number" && r <= 0 ? {
    productId: e.productId,
    variantId: e.variantId,
    title: n,
    requestedQty: e.qty,
    availableQty: 0,
    type: "out_of_stock",
    message: "This item is out of stock"
  } : typeof r == "number" && e.qty > r ? {
    productId: e.productId,
    variantId: e.variantId,
    title: n,
    requestedQty: e.qty,
    availableQty: r,
    type: "insufficient_stock",
    message: r === 0 ? "This item is out of stock" : `Only ${r} available`
  } : null;
}
function dd({
  items: e
}) {
  const { config: t } = Le(), [n, r] = m.useState(null), [o, a] = m.useState(!1), [i, c] = m.useState(null), l = m.useMemo(() => {
    const u = /* @__PURE__ */ new Set();
    for (const h of e)
      u.add(h.productId);
    return Array.from(u);
  }, [e]), d = m.useCallback(async () => {
    if (e.length === 0) {
      const u = {
        ok: !0,
        issues: [],
        verifiedAt: /* @__PURE__ */ new Date()
      };
      return r(u), u;
    }
    a(!0), c(null);
    try {
      let u = /* @__PURE__ */ new Map();
      if (t.adapter.getProductsByIds)
        u = await t.adapter.getProductsByIds(l);
      else {
        const b = await Promise.all(
          l.map(async (v) => {
            try {
              return await t.adapter.getProductBySlug(v);
            } catch {
              return null;
            }
          })
        );
        u = /* @__PURE__ */ new Map();
        for (const v of b)
          v && (u.set(v.id, v), v.slug && v.slug !== v.id && u.set(v.slug, v));
      }
      const h = [];
      for (const b of e) {
        const v = u.get(b.productId) ?? null, y = Hb(b, v);
        y && h.push(y);
      }
      const g = {
        ok: h.length === 0,
        issues: h,
        verifiedAt: /* @__PURE__ */ new Date()
      };
      return r(g), a(!1), g;
    } catch (u) {
      const h = u instanceof Error ? u.message : "Failed to verify inventory";
      c(h), a(!1);
      const g = {
        ok: !1,
        issues: [],
        verifiedAt: /* @__PURE__ */ new Date()
      };
      return r(g), g;
    }
  }, [t.adapter, e, l]), f = m.useCallback(() => {
    r(null), c(null);
  }, []);
  return {
    result: n,
    isVerifying: o,
    error: i,
    verify: d,
    reset: f
  };
}
function Zb({
  items: e,
  onExpiry: t,
  enabled: n = !0
}) {
  const [r, o] = m.useState([]), [a, i] = m.useState([]), c = m.useRef(/* @__PURE__ */ new Set()), l = m.useRef(t);
  l.current = t;
  const d = m.useMemo(() => n ? e.filter((f) => f.holdId && f.holdExpiresAt) : [], [e, n]);
  return m.useEffect(() => {
    if (!n || d.length === 0) {
      o([]), i([]);
      return;
    }
    const f = () => {
      const h = Date.now(), g = 120 * 1e3, b = [], v = [];
      for (const y of d) {
        if (!y.holdExpiresAt) continue;
        const w = new Date(y.holdExpiresAt), k = w.getTime() - h, _ = `${y.productId}::${y.variantId ?? ""}`;
        k <= 0 ? (b.push({ productId: y.productId, variantId: y.variantId }), c.current.has(_) || (c.current.add(_), l.current?.({
          productId: y.productId,
          variantId: y.variantId,
          title: y.titleSnapshot,
          expiredAt: w
        }))) : k <= g && v.push({
          productId: y.productId,
          variantId: y.variantId,
          expiresAt: w,
          remainingMs: k
        });
      }
      o(b), i(v);
    };
    f();
    const u = setInterval(f, 1e4);
    return () => clearInterval(u);
  }, [n, d]), m.useEffect(() => {
    const f = new Set(
      d.map((u) => `${u.productId}::${u.variantId ?? ""}`)
    );
    for (const u of c.current)
      f.has(u) || c.current.delete(u);
  }, [d]), { expiringItems: a, expiredItems: r };
}
const Ae = {
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
};
function qb(e) {
  return {
    relatedProducts: {
      mode: e.relatedProducts?.mode || Ae.relatedProducts.mode,
      maxItems: e.relatedProducts?.maxItems || Ae.relatedProducts.maxItems,
      layout: {
        layout: e.relatedProducts?.layout?.layout ?? Ae.relatedProducts.layout.layout,
        imageCrop: e.relatedProducts?.layout?.imageCrop ?? Ae.relatedProducts.layout.imageCrop
      }
    },
    catalog: {
      filters: {
        tags: e.catalog?.filters?.tags ?? Ae.catalog.filters.tags,
        priceRange: e.catalog?.filters?.priceRange ?? Ae.catalog.filters.priceRange,
        inStock: e.catalog?.filters?.inStock ?? Ae.catalog.filters.inStock
      },
      sort: {
        featured: e.catalog?.sort?.featured ?? Ae.catalog.sort.featured,
        priceAsc: e.catalog?.sort?.priceAsc ?? Ae.catalog.sort.priceAsc,
        priceDesc: e.catalog?.sort?.priceDesc ?? Ae.catalog.sort.priceDesc
      }
    },
    checkout: {
      promoCodes: e.checkout?.promoCodes ?? Ae.checkout.promoCodes
    },
    shopLayout: {
      layout: e.shopLayout?.layout ?? Ae.shopLayout.layout,
      imageCrop: e.shopLayout?.imageCrop ?? Ae.shopLayout.imageCrop
    },
    categoryLayout: {
      layout: e.categoryLayout?.layout ?? Ae.categoryLayout.layout,
      imageCrop: e.categoryLayout?.imageCrop ?? Ae.categoryLayout.imageCrop
    },
    sections: {
      showDescription: e.sections?.showDescription ?? Ae.sections.showDescription,
      showSpecs: e.sections?.showSpecs ?? Ae.sections.showSpecs,
      showShipping: e.sections?.showShipping ?? Ae.sections.showShipping,
      showRelatedProducts: e.sections?.showRelatedProducts ?? Ae.sections.showRelatedProducts
    },
    inventory: {
      preCheckoutVerification: e.inventory?.preCheckoutVerification ?? Ae.inventory.preCheckoutVerification,
      holdsEnabled: e.inventory?.holdsEnabled ?? Ae.inventory.holdsEnabled,
      holdDurationMinutes: e.inventory?.holdDurationMinutes ?? Ae.inventory.holdDurationMinutes
    },
    shopPage: {
      title: e.shopPage?.title ?? Ae.shopPage.title,
      description: e.shopPage?.description ?? Ae.shopPage.description
    }
  };
}
function cr(e = {}) {
  const n = Aa()?.config?.adapter, [r, o] = K(Ae), [a, i] = K(!!n?.getStorefrontSettings);
  return Te(() => {
    if (!n?.getStorefrontSettings) {
      i(!1);
      return;
    }
    let c = !1;
    async function l() {
      try {
        const d = await n.getStorefrontSettings();
        !c && d && o(qb(d));
      } catch {
      } finally {
        c || i(!1);
      }
    }
    return l(), () => {
      c = !0;
    };
  }, [n]), { settings: r, isLoading: a };
}
const Gb = {
  card: !0,
  crypto: !0,
  credits: !1
  // Credits require explicit backend setup
};
function ud() {
  const t = Aa()?.config?.adapter, [n, r] = K(Gb), [o, a] = K(!!t?.getPaymentMethodsConfig);
  return Te(() => {
    if (!t?.getPaymentMethodsConfig) {
      a(!1);
      return;
    }
    let i = !1;
    async function c() {
      try {
        const l = await t.getPaymentMethodsConfig();
        !i && l && r(l);
      } catch {
      } finally {
        i || a(!1);
      }
    }
    return c(), () => {
      i = !0;
    };
  }, [t]), { config: n, isLoading: o };
}
const Yb = 50, vr = /* @__PURE__ */ new Map();
function Qb(e) {
  return e.productId ? `id:${e.productId}` : e.name ? `name:${e.name}` : "";
}
function fd(e = {}) {
  const { productId: t, product: n, enabled: r = !0 } = e, a = Aa()?.config?.adapter, [i, c] = K(null), [l, d] = K(null), [f, u] = K(!1), [h, g] = K(null), b = Jt(0), v = ae(async () => {
    const y = t ? { productId: t } : n ? {
      name: n.name,
      description: n.description,
      tags: n.tags,
      categoryIds: n.categoryIds
    } : {};
    if (!y.productId && !y.name)
      return;
    if (!a?.getAIRelatedProducts) {
      g("AI recommendations not available");
      return;
    }
    const w = Qb(y), k = vr.get(w);
    if (k) {
      c(k.relatedProductIds), d(k.reasoning), g(null);
      return;
    }
    const _ = ++b.current;
    u(!0), g(null);
    try {
      const x = await a.getAIRelatedProducts(y);
      if (_ === b.current && (c(x.relatedProductIds), d(x.reasoning), g(null), w)) {
        if (vr.size >= Yb) {
          const S = vr.keys().next().value;
          S !== void 0 && vr.delete(S);
        }
        vr.set(w, x);
      }
    } catch (x) {
      if (_ === b.current) {
        const S = x instanceof Error ? x.message : "Failed to get AI recommendations";
        g(S), c(null), d(null);
      }
    } finally {
      _ === b.current && u(!1);
    }
  }, [a, t, n]);
  return Te(() => {
    r && (!t && !n?.name || v());
  }, [r, t, n?.name, v]), {
    relatedProductIds: i,
    reasoning: l,
    isLoading: f,
    error: h,
    refetch: v
  };
}
function Me(e, t) {
  if (!e) throw new Error(t);
}
function Tt(e) {
  return typeof e == "string" && e.trim().length > 0;
}
async function Kb(e, t = {}) {
  const n = t.pageSize ?? 10, r = await e.listCategories();
  Me(Array.isArray(r), "listCategories() must return an array");
  for (const i of r)
    Me(Tt(i.id), "Category.id is required"), Me(Tt(i.slug), "Category.slug is required"), Me(Tt(i.name), "Category.name is required");
  const o = await e.listProducts({ page: 1, pageSize: n });
  if (Me(o && Array.isArray(o.items), "listProducts() must return { items: Product[] }"), Me(typeof o.page == "number", "listProducts().page must be a number"), Me(typeof o.pageSize == "number", "listProducts().pageSize must be a number"), o.items.length > 0) {
    const i = o.items[0];
    Me(Tt(i.id), "Product.id is required"), Me(Tt(i.slug), "Product.slug is required"), Me(Tt(i.title), "Product.title is required"), Me(typeof i.description == "string", "Product.description must be a string"), Me(Array.isArray(i.images), "Product.images must be an array"), Me(typeof i.price == "number", "Product.price must be a number"), Me(Tt(i.currency), "Product.currency is required"), Me(Array.isArray(i.tags), "Product.tags must be an array"), Me(Array.isArray(i.categoryIds), "Product.categoryIds must be an array");
    const c = await e.getProductBySlug(i.slug);
    Me(c === null || Tt(c.id), "getProductBySlug() must return Product or null");
  }
  const a = await e.getOrderHistory();
  Me(Array.isArray(a), "getOrderHistory() must return an array");
  for (const i of a)
    Me(Tt(i.id), "Order.id is required"), Me(Tt(i.createdAt), "Order.createdAt is required"), Me(typeof i.total == "number", "Order.total must be a number"), Me(Tt(i.currency), "Order.currency is required"), Me(Array.isArray(i.items), "Order.items must be an array");
}
function vc(e, t) {
  if (typeof e == "function")
    return e(t);
  e != null && (e.current = t);
}
function lr(...e) {
  return (t) => {
    let n = !1;
    const r = e.map((o) => {
      const a = vc(o, t);
      return !n && typeof a == "function" && (n = !0), a;
    });
    if (n)
      return () => {
        for (let o = 0; o < r.length; o++) {
          const a = r[o];
          typeof a == "function" ? a() : vc(e[o], null);
        }
      };
  };
}
function Re(...e) {
  return m.useCallback(lr(...e), e);
}
var Jb = Symbol.for("react.lazy"), No = m[" use ".trim().toString()];
function Xb(e) {
  return typeof e == "object" && e !== null && "then" in e;
}
function pd(e) {
  return e != null && typeof e == "object" && "$$typeof" in e && e.$$typeof === Jb && "_payload" in e && Xb(e._payload);
}
// @__NO_SIDE_EFFECTS__
function md(e) {
  const t = /* @__PURE__ */ t0(e), n = m.forwardRef((r, o) => {
    let { children: a, ...i } = r;
    pd(a) && typeof No == "function" && (a = No(a._payload));
    const c = m.Children.toArray(a), l = c.find(r0);
    if (l) {
      const d = l.props.children, f = c.map((u) => u === l ? m.Children.count(d) > 1 ? m.Children.only(null) : m.isValidElement(d) ? d.props.children : null : u);
      return /* @__PURE__ */ s(t, { ...i, ref: o, children: m.isValidElement(d) ? m.cloneElement(d, void 0, f) : null });
    }
    return /* @__PURE__ */ s(t, { ...i, ref: o, children: a });
  });
  return n.displayName = `${e}.Slot`, n;
}
var e0 = /* @__PURE__ */ md("Slot");
// @__NO_SIDE_EFFECTS__
function t0(e) {
  const t = m.forwardRef((n, r) => {
    let { children: o, ...a } = n;
    if (pd(o) && typeof No == "function" && (o = No(o._payload)), m.isValidElement(o)) {
      const i = s0(o), c = o0(a, o.props);
      return o.type !== m.Fragment && (c.ref = r ? lr(r, i) : i), m.cloneElement(o, c);
    }
    return m.Children.count(o) > 1 ? m.Children.only(null) : null;
  });
  return t.displayName = `${e}.SlotClone`, t;
}
var n0 = Symbol("radix.slottable");
function r0(e) {
  return m.isValidElement(e) && typeof e.type == "function" && "__radixId" in e.type && e.type.__radixId === n0;
}
function o0(e, t) {
  const n = { ...t };
  for (const r in t) {
    const o = e[r], a = t[r];
    /^on[A-Z]/.test(r) ? o && a ? n[r] = (...c) => {
      const l = a(...c);
      return o(...c), l;
    } : o && (n[r] = o) : r === "style" ? n[r] = { ...o, ...a } : r === "className" && (n[r] = [o, a].filter(Boolean).join(" "));
  }
  return { ...e, ...n };
}
function s0(e) {
  let t = Object.getOwnPropertyDescriptor(e.props, "ref")?.get, n = t && "isReactWarning" in t && t.isReactWarning;
  return n ? e.ref : (t = Object.getOwnPropertyDescriptor(e, "ref")?.get, n = t && "isReactWarning" in t && t.isReactWarning, n ? e.props.ref : e.props.ref || e.ref);
}
function hd(e) {
  var t, n, r = "";
  if (typeof e == "string" || typeof e == "number") r += e;
  else if (typeof e == "object") if (Array.isArray(e)) {
    var o = e.length;
    for (t = 0; t < o; t++) e[t] && (n = hd(e[t])) && (r && (r += " "), r += n);
  } else for (n in e) e[n] && (r && (r += " "), r += n);
  return r;
}
function gd() {
  for (var e, t, n = 0, r = "", o = arguments.length; n < o; n++) (e = arguments[n]) && (t = hd(e)) && (r && (r += " "), r += t);
  return r;
}
const bc = (e) => typeof e == "boolean" ? `${e}` : e === 0 ? "0" : e, wc = gd, Ua = (e, t) => (n) => {
  var r;
  if (t?.variants == null) return wc(e, n?.class, n?.className);
  const { variants: o, defaultVariants: a } = t, i = Object.keys(o).map((d) => {
    const f = n?.[d], u = a?.[d];
    if (f === null) return null;
    const h = bc(f) || bc(u);
    return o[d][h];
  }), c = n && Object.entries(n).reduce((d, f) => {
    let [u, h] = f;
    return h === void 0 || (d[u] = h), d;
  }, {}), l = t == null || (r = t.compoundVariants) === null || r === void 0 ? void 0 : r.reduce((d, f) => {
    let { class: u, className: h, ...g } = f;
    return Object.entries(g).every((b) => {
      let [v, y] = b;
      return Array.isArray(y) ? y.includes({
        ...a,
        ...c
      }[v]) : {
        ...a,
        ...c
      }[v] === y;
    }) ? [
      ...d,
      u,
      h
    ] : d;
  }, []);
  return wc(e, i, l, n?.class, n?.className);
}, a0 = (e, t) => {
  const n = new Array(e.length + t.length);
  for (let r = 0; r < e.length; r++)
    n[r] = e[r];
  for (let r = 0; r < t.length; r++)
    n[e.length + r] = t[r];
  return n;
}, i0 = (e, t) => ({
  classGroupId: e,
  validator: t
}), yd = (e = /* @__PURE__ */ new Map(), t = null, n) => ({
  nextPart: e,
  validators: t,
  classGroupId: n
}), Eo = "-", xc = [], c0 = "arbitrary..", l0 = (e) => {
  const t = u0(e), {
    conflictingClassGroups: n,
    conflictingClassGroupModifiers: r
  } = e;
  return {
    getClassGroupId: (i) => {
      if (i.startsWith("[") && i.endsWith("]"))
        return d0(i);
      const c = i.split(Eo), l = c[0] === "" && c.length > 1 ? 1 : 0;
      return vd(c, l, t);
    },
    getConflictingClassGroupIds: (i, c) => {
      if (c) {
        const l = r[i], d = n[i];
        return l ? d ? a0(d, l) : l : d || xc;
      }
      return n[i] || xc;
    }
  };
}, vd = (e, t, n) => {
  if (e.length - t === 0)
    return n.classGroupId;
  const o = e[t], a = n.nextPart.get(o);
  if (a) {
    const d = vd(e, t + 1, a);
    if (d) return d;
  }
  const i = n.validators;
  if (i === null)
    return;
  const c = t === 0 ? e.join(Eo) : e.slice(t).join(Eo), l = i.length;
  for (let d = 0; d < l; d++) {
    const f = i[d];
    if (f.validator(c))
      return f.classGroupId;
  }
}, d0 = (e) => e.slice(1, -1).indexOf(":") === -1 ? void 0 : (() => {
  const t = e.slice(1, -1), n = t.indexOf(":"), r = t.slice(0, n);
  return r ? c0 + r : void 0;
})(), u0 = (e) => {
  const {
    theme: t,
    classGroups: n
  } = e;
  return f0(n, t);
}, f0 = (e, t) => {
  const n = yd();
  for (const r in e) {
    const o = e[r];
    Va(o, n, r, t);
  }
  return n;
}, Va = (e, t, n, r) => {
  const o = e.length;
  for (let a = 0; a < o; a++) {
    const i = e[a];
    p0(i, t, n, r);
  }
}, p0 = (e, t, n, r) => {
  if (typeof e == "string") {
    m0(e, t, n);
    return;
  }
  if (typeof e == "function") {
    h0(e, t, n, r);
    return;
  }
  g0(e, t, n, r);
}, m0 = (e, t, n) => {
  const r = e === "" ? t : bd(t, e);
  r.classGroupId = n;
}, h0 = (e, t, n, r) => {
  if (y0(e)) {
    Va(e(r), t, n, r);
    return;
  }
  t.validators === null && (t.validators = []), t.validators.push(i0(n, e));
}, g0 = (e, t, n, r) => {
  const o = Object.entries(e), a = o.length;
  for (let i = 0; i < a; i++) {
    const [c, l] = o[i];
    Va(l, bd(t, c), n, r);
  }
}, bd = (e, t) => {
  let n = e;
  const r = t.split(Eo), o = r.length;
  for (let a = 0; a < o; a++) {
    const i = r[a];
    let c = n.nextPart.get(i);
    c || (c = yd(), n.nextPart.set(i, c)), n = c;
  }
  return n;
}, y0 = (e) => "isThemeGetter" in e && e.isThemeGetter === !0, v0 = (e) => {
  if (e < 1)
    return {
      get: () => {
      },
      set: () => {
      }
    };
  let t = 0, n = /* @__PURE__ */ Object.create(null), r = /* @__PURE__ */ Object.create(null);
  const o = (a, i) => {
    n[a] = i, t++, t > e && (t = 0, r = n, n = /* @__PURE__ */ Object.create(null));
  };
  return {
    get(a) {
      let i = n[a];
      if (i !== void 0)
        return i;
      if ((i = r[a]) !== void 0)
        return o(a, i), i;
    },
    set(a, i) {
      a in n ? n[a] = i : o(a, i);
    }
  };
}, aa = "!", _c = ":", b0 = [], kc = (e, t, n, r, o) => ({
  modifiers: e,
  hasImportantModifier: t,
  baseClassName: n,
  maybePostfixModifierPosition: r,
  isExternal: o
}), w0 = (e) => {
  const {
    prefix: t,
    experimentalParseClassName: n
  } = e;
  let r = (o) => {
    const a = [];
    let i = 0, c = 0, l = 0, d;
    const f = o.length;
    for (let v = 0; v < f; v++) {
      const y = o[v];
      if (i === 0 && c === 0) {
        if (y === _c) {
          a.push(o.slice(l, v)), l = v + 1;
          continue;
        }
        if (y === "/") {
          d = v;
          continue;
        }
      }
      y === "[" ? i++ : y === "]" ? i-- : y === "(" ? c++ : y === ")" && c--;
    }
    const u = a.length === 0 ? o : o.slice(l);
    let h = u, g = !1;
    u.endsWith(aa) ? (h = u.slice(0, -1), g = !0) : (
      /**
       * In Tailwind CSS v3 the important modifier was at the start of the base class name. This is still supported for legacy reasons.
       * @see https://github.com/dcastil/tailwind-merge/issues/513#issuecomment-2614029864
       */
      u.startsWith(aa) && (h = u.slice(1), g = !0)
    );
    const b = d && d > l ? d - l : void 0;
    return kc(a, g, h, b);
  };
  if (t) {
    const o = t + _c, a = r;
    r = (i) => i.startsWith(o) ? a(i.slice(o.length)) : kc(b0, !1, i, void 0, !0);
  }
  if (n) {
    const o = r;
    r = (a) => n({
      className: a,
      parseClassName: o
    });
  }
  return r;
}, x0 = (e) => {
  const t = /* @__PURE__ */ new Map();
  return e.orderSensitiveModifiers.forEach((n, r) => {
    t.set(n, 1e6 + r);
  }), (n) => {
    const r = [];
    let o = [];
    for (let a = 0; a < n.length; a++) {
      const i = n[a], c = i[0] === "[", l = t.has(i);
      c || l ? (o.length > 0 && (o.sort(), r.push(...o), o = []), r.push(i)) : o.push(i);
    }
    return o.length > 0 && (o.sort(), r.push(...o)), r;
  };
}, _0 = (e) => ({
  cache: v0(e.cacheSize),
  parseClassName: w0(e),
  sortModifiers: x0(e),
  ...l0(e)
}), k0 = /\s+/, S0 = (e, t) => {
  const {
    parseClassName: n,
    getClassGroupId: r,
    getConflictingClassGroupIds: o,
    sortModifiers: a
  } = t, i = [], c = e.trim().split(k0);
  let l = "";
  for (let d = c.length - 1; d >= 0; d -= 1) {
    const f = c[d], {
      isExternal: u,
      modifiers: h,
      hasImportantModifier: g,
      baseClassName: b,
      maybePostfixModifierPosition: v
    } = n(f);
    if (u) {
      l = f + (l.length > 0 ? " " + l : l);
      continue;
    }
    let y = !!v, w = r(y ? b.substring(0, v) : b);
    if (!w) {
      if (!y) {
        l = f + (l.length > 0 ? " " + l : l);
        continue;
      }
      if (w = r(b), !w) {
        l = f + (l.length > 0 ? " " + l : l);
        continue;
      }
      y = !1;
    }
    const k = h.length === 0 ? "" : h.length === 1 ? h[0] : a(h).join(":"), _ = g ? k + aa : k, x = _ + w;
    if (i.indexOf(x) > -1)
      continue;
    i.push(x);
    const S = o(w, y);
    for (let I = 0; I < S.length; ++I) {
      const R = S[I];
      i.push(_ + R);
    }
    l = f + (l.length > 0 ? " " + l : l);
  }
  return l;
}, C0 = (...e) => {
  let t = 0, n, r, o = "";
  for (; t < e.length; )
    (n = e[t++]) && (r = wd(n)) && (o && (o += " "), o += r);
  return o;
}, wd = (e) => {
  if (typeof e == "string")
    return e;
  let t, n = "";
  for (let r = 0; r < e.length; r++)
    e[r] && (t = wd(e[r])) && (n && (n += " "), n += t);
  return n;
}, N0 = (e, ...t) => {
  let n, r, o, a;
  const i = (l) => {
    const d = t.reduce((f, u) => u(f), e());
    return n = _0(d), r = n.cache.get, o = n.cache.set, a = c, c(l);
  }, c = (l) => {
    const d = r(l);
    if (d)
      return d;
    const f = S0(l, n);
    return o(l, f), f;
  };
  return a = i, (...l) => a(C0(...l));
}, E0 = [], qe = (e) => {
  const t = (n) => n[e] || E0;
  return t.isThemeGetter = !0, t;
}, xd = /^\[(?:(\w[\w-]*):)?(.+)\]$/i, _d = /^\((?:(\w[\w-]*):)?(.+)\)$/i, A0 = /^\d+\/\d+$/, P0 = /^(\d+(\.\d+)?)?(xs|sm|md|lg|xl)$/, I0 = /\d+(%|px|r?em|[sdl]?v([hwib]|min|max)|pt|pc|in|cm|mm|cap|ch|ex|r?lh|cq(w|h|i|b|min|max))|\b(calc|min|max|clamp)\(.+\)|^0$/, T0 = /^(rgba?|hsla?|hwb|(ok)?(lab|lch)|color-mix)\(.+\)$/, R0 = /^(inset_)?-?((\d+)?\.?(\d+)[a-z]+|0)_-?((\d+)?\.?(\d+)[a-z]+|0)/, O0 = /^(url|image|image-set|cross-fade|element|(repeating-)?(linear|radial|conic)-gradient)\(.+\)$/, qn = (e) => A0.test(e), ye = (e) => !!e && !Number.isNaN(Number(e)), fn = (e) => !!e && Number.isInteger(Number(e)), Ts = (e) => e.endsWith("%") && ye(e.slice(0, -1)), on = (e) => P0.test(e), M0 = () => !0, L0 = (e) => (
  // `colorFunctionRegex` check is necessary because color functions can have percentages in them which which would be incorrectly classified as lengths.
  // For example, `hsl(0 0% 0%)` would be classified as a length without this check.
  // I could also use lookbehind assertion in `lengthUnitRegex` but that isn't supported widely enough.
  I0.test(e) && !T0.test(e)
), kd = () => !1, D0 = (e) => R0.test(e), $0 = (e) => O0.test(e), z0 = (e) => !ne(e) && !re(e), F0 = (e) => dr(e, Nd, kd), ne = (e) => xd.test(e), An = (e) => dr(e, Ed, L0), Rs = (e) => dr(e, W0, ye), Sc = (e) => dr(e, Sd, kd), j0 = (e) => dr(e, Cd, $0), eo = (e) => dr(e, Ad, D0), re = (e) => _d.test(e), br = (e) => ur(e, Ed), B0 = (e) => ur(e, H0), Cc = (e) => ur(e, Sd), U0 = (e) => ur(e, Nd), V0 = (e) => ur(e, Cd), to = (e) => ur(e, Ad, !0), dr = (e, t, n) => {
  const r = xd.exec(e);
  return r ? r[1] ? t(r[1]) : n(r[2]) : !1;
}, ur = (e, t, n = !1) => {
  const r = _d.exec(e);
  return r ? r[1] ? t(r[1]) : n : !1;
}, Sd = (e) => e === "position" || e === "percentage", Cd = (e) => e === "image" || e === "url", Nd = (e) => e === "length" || e === "size" || e === "bg-size", Ed = (e) => e === "length", W0 = (e) => e === "number", H0 = (e) => e === "family-name", Ad = (e) => e === "shadow", Z0 = () => {
  const e = qe("color"), t = qe("font"), n = qe("text"), r = qe("font-weight"), o = qe("tracking"), a = qe("leading"), i = qe("breakpoint"), c = qe("container"), l = qe("spacing"), d = qe("radius"), f = qe("shadow"), u = qe("inset-shadow"), h = qe("text-shadow"), g = qe("drop-shadow"), b = qe("blur"), v = qe("perspective"), y = qe("aspect"), w = qe("ease"), k = qe("animate"), _ = () => ["auto", "avoid", "all", "avoid-page", "page", "left", "right", "column"], x = () => [
    "center",
    "top",
    "bottom",
    "left",
    "right",
    "top-left",
    // Deprecated since Tailwind CSS v4.1.0, see https://github.com/tailwindlabs/tailwindcss/pull/17378
    "left-top",
    "top-right",
    // Deprecated since Tailwind CSS v4.1.0, see https://github.com/tailwindlabs/tailwindcss/pull/17378
    "right-top",
    "bottom-right",
    // Deprecated since Tailwind CSS v4.1.0, see https://github.com/tailwindlabs/tailwindcss/pull/17378
    "right-bottom",
    "bottom-left",
    // Deprecated since Tailwind CSS v4.1.0, see https://github.com/tailwindlabs/tailwindcss/pull/17378
    "left-bottom"
  ], S = () => [...x(), re, ne], I = () => ["auto", "hidden", "clip", "visible", "scroll"], R = () => ["auto", "contain", "none"], E = () => [re, ne, l], P = () => [qn, "full", "auto", ...E()], O = () => [fn, "none", "subgrid", re, ne], T = () => ["auto", {
    span: ["full", fn, re, ne]
  }, fn, re, ne], D = () => [fn, "auto", re, ne], j = () => ["auto", "min", "max", "fr", re, ne], z = () => ["start", "end", "center", "between", "around", "evenly", "stretch", "baseline", "center-safe", "end-safe"], W = () => ["start", "end", "center", "stretch", "center-safe", "end-safe"], $ = () => ["auto", ...E()], C = () => [qn, "auto", "full", "dvw", "dvh", "lvw", "lvh", "svw", "svh", "min", "max", "fit", ...E()], N = () => [e, re, ne], H = () => [...x(), Cc, Sc, {
    position: [re, ne]
  }], G = () => ["no-repeat", {
    repeat: ["", "x", "y", "space", "round"]
  }], J = () => ["auto", "cover", "contain", U0, F0, {
    size: [re, ne]
  }], fe = () => [Ts, br, An], Z = () => [
    // Deprecated since Tailwind CSS v4.0.0
    "",
    "none",
    "full",
    d,
    re,
    ne
  ], X = () => ["", ye, br, An], Q = () => ["solid", "dashed", "dotted", "double"], ge = () => ["normal", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion", "hue", "saturation", "color", "luminosity"], F = () => [ye, Ts, Cc, Sc], Y = () => [
    // Deprecated since Tailwind CSS v4.0.0
    "",
    "none",
    b,
    re,
    ne
  ], he = () => ["none", ye, re, ne], V = () => ["none", ye, re, ne], ie = () => [ye, re, ne], ue = () => [qn, "full", ...E()];
  return {
    cacheSize: 500,
    theme: {
      animate: ["spin", "ping", "pulse", "bounce"],
      aspect: ["video"],
      blur: [on],
      breakpoint: [on],
      color: [M0],
      container: [on],
      "drop-shadow": [on],
      ease: ["in", "out", "in-out"],
      font: [z0],
      "font-weight": ["thin", "extralight", "light", "normal", "medium", "semibold", "bold", "extrabold", "black"],
      "inset-shadow": [on],
      leading: ["none", "tight", "snug", "normal", "relaxed", "loose"],
      perspective: ["dramatic", "near", "normal", "midrange", "distant", "none"],
      radius: [on],
      shadow: [on],
      spacing: ["px", ye],
      text: [on],
      "text-shadow": [on],
      tracking: ["tighter", "tight", "normal", "wide", "wider", "widest"]
    },
    classGroups: {
      // --------------
      // --- Layout ---
      // --------------
      /**
       * Aspect Ratio
       * @see https://tailwindcss.com/docs/aspect-ratio
       */
      aspect: [{
        aspect: ["auto", "square", qn, ne, re, y]
      }],
      /**
       * Container
       * @see https://tailwindcss.com/docs/container
       * @deprecated since Tailwind CSS v4.0.0
       */
      container: ["container"],
      /**
       * Columns
       * @see https://tailwindcss.com/docs/columns
       */
      columns: [{
        columns: [ye, ne, re, c]
      }],
      /**
       * Break After
       * @see https://tailwindcss.com/docs/break-after
       */
      "break-after": [{
        "break-after": _()
      }],
      /**
       * Break Before
       * @see https://tailwindcss.com/docs/break-before
       */
      "break-before": [{
        "break-before": _()
      }],
      /**
       * Break Inside
       * @see https://tailwindcss.com/docs/break-inside
       */
      "break-inside": [{
        "break-inside": ["auto", "avoid", "avoid-page", "avoid-column"]
      }],
      /**
       * Box Decoration Break
       * @see https://tailwindcss.com/docs/box-decoration-break
       */
      "box-decoration": [{
        "box-decoration": ["slice", "clone"]
      }],
      /**
       * Box Sizing
       * @see https://tailwindcss.com/docs/box-sizing
       */
      box: [{
        box: ["border", "content"]
      }],
      /**
       * Display
       * @see https://tailwindcss.com/docs/display
       */
      display: ["block", "inline-block", "inline", "flex", "inline-flex", "table", "inline-table", "table-caption", "table-cell", "table-column", "table-column-group", "table-footer-group", "table-header-group", "table-row-group", "table-row", "flow-root", "grid", "inline-grid", "contents", "list-item", "hidden"],
      /**
       * Screen Reader Only
       * @see https://tailwindcss.com/docs/display#screen-reader-only
       */
      sr: ["sr-only", "not-sr-only"],
      /**
       * Floats
       * @see https://tailwindcss.com/docs/float
       */
      float: [{
        float: ["right", "left", "none", "start", "end"]
      }],
      /**
       * Clear
       * @see https://tailwindcss.com/docs/clear
       */
      clear: [{
        clear: ["left", "right", "both", "none", "start", "end"]
      }],
      /**
       * Isolation
       * @see https://tailwindcss.com/docs/isolation
       */
      isolation: ["isolate", "isolation-auto"],
      /**
       * Object Fit
       * @see https://tailwindcss.com/docs/object-fit
       */
      "object-fit": [{
        object: ["contain", "cover", "fill", "none", "scale-down"]
      }],
      /**
       * Object Position
       * @see https://tailwindcss.com/docs/object-position
       */
      "object-position": [{
        object: S()
      }],
      /**
       * Overflow
       * @see https://tailwindcss.com/docs/overflow
       */
      overflow: [{
        overflow: I()
      }],
      /**
       * Overflow X
       * @see https://tailwindcss.com/docs/overflow
       */
      "overflow-x": [{
        "overflow-x": I()
      }],
      /**
       * Overflow Y
       * @see https://tailwindcss.com/docs/overflow
       */
      "overflow-y": [{
        "overflow-y": I()
      }],
      /**
       * Overscroll Behavior
       * @see https://tailwindcss.com/docs/overscroll-behavior
       */
      overscroll: [{
        overscroll: R()
      }],
      /**
       * Overscroll Behavior X
       * @see https://tailwindcss.com/docs/overscroll-behavior
       */
      "overscroll-x": [{
        "overscroll-x": R()
      }],
      /**
       * Overscroll Behavior Y
       * @see https://tailwindcss.com/docs/overscroll-behavior
       */
      "overscroll-y": [{
        "overscroll-y": R()
      }],
      /**
       * Position
       * @see https://tailwindcss.com/docs/position
       */
      position: ["static", "fixed", "absolute", "relative", "sticky"],
      /**
       * Top / Right / Bottom / Left
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      inset: [{
        inset: P()
      }],
      /**
       * Right / Left
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      "inset-x": [{
        "inset-x": P()
      }],
      /**
       * Top / Bottom
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      "inset-y": [{
        "inset-y": P()
      }],
      /**
       * Start
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      start: [{
        start: P()
      }],
      /**
       * End
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      end: [{
        end: P()
      }],
      /**
       * Top
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      top: [{
        top: P()
      }],
      /**
       * Right
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      right: [{
        right: P()
      }],
      /**
       * Bottom
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      bottom: [{
        bottom: P()
      }],
      /**
       * Left
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      left: [{
        left: P()
      }],
      /**
       * Visibility
       * @see https://tailwindcss.com/docs/visibility
       */
      visibility: ["visible", "invisible", "collapse"],
      /**
       * Z-Index
       * @see https://tailwindcss.com/docs/z-index
       */
      z: [{
        z: [fn, "auto", re, ne]
      }],
      // ------------------------
      // --- Flexbox and Grid ---
      // ------------------------
      /**
       * Flex Basis
       * @see https://tailwindcss.com/docs/flex-basis
       */
      basis: [{
        basis: [qn, "full", "auto", c, ...E()]
      }],
      /**
       * Flex Direction
       * @see https://tailwindcss.com/docs/flex-direction
       */
      "flex-direction": [{
        flex: ["row", "row-reverse", "col", "col-reverse"]
      }],
      /**
       * Flex Wrap
       * @see https://tailwindcss.com/docs/flex-wrap
       */
      "flex-wrap": [{
        flex: ["nowrap", "wrap", "wrap-reverse"]
      }],
      /**
       * Flex
       * @see https://tailwindcss.com/docs/flex
       */
      flex: [{
        flex: [ye, qn, "auto", "initial", "none", ne]
      }],
      /**
       * Flex Grow
       * @see https://tailwindcss.com/docs/flex-grow
       */
      grow: [{
        grow: ["", ye, re, ne]
      }],
      /**
       * Flex Shrink
       * @see https://tailwindcss.com/docs/flex-shrink
       */
      shrink: [{
        shrink: ["", ye, re, ne]
      }],
      /**
       * Order
       * @see https://tailwindcss.com/docs/order
       */
      order: [{
        order: [fn, "first", "last", "none", re, ne]
      }],
      /**
       * Grid Template Columns
       * @see https://tailwindcss.com/docs/grid-template-columns
       */
      "grid-cols": [{
        "grid-cols": O()
      }],
      /**
       * Grid Column Start / End
       * @see https://tailwindcss.com/docs/grid-column
       */
      "col-start-end": [{
        col: T()
      }],
      /**
       * Grid Column Start
       * @see https://tailwindcss.com/docs/grid-column
       */
      "col-start": [{
        "col-start": D()
      }],
      /**
       * Grid Column End
       * @see https://tailwindcss.com/docs/grid-column
       */
      "col-end": [{
        "col-end": D()
      }],
      /**
       * Grid Template Rows
       * @see https://tailwindcss.com/docs/grid-template-rows
       */
      "grid-rows": [{
        "grid-rows": O()
      }],
      /**
       * Grid Row Start / End
       * @see https://tailwindcss.com/docs/grid-row
       */
      "row-start-end": [{
        row: T()
      }],
      /**
       * Grid Row Start
       * @see https://tailwindcss.com/docs/grid-row
       */
      "row-start": [{
        "row-start": D()
      }],
      /**
       * Grid Row End
       * @see https://tailwindcss.com/docs/grid-row
       */
      "row-end": [{
        "row-end": D()
      }],
      /**
       * Grid Auto Flow
       * @see https://tailwindcss.com/docs/grid-auto-flow
       */
      "grid-flow": [{
        "grid-flow": ["row", "col", "dense", "row-dense", "col-dense"]
      }],
      /**
       * Grid Auto Columns
       * @see https://tailwindcss.com/docs/grid-auto-columns
       */
      "auto-cols": [{
        "auto-cols": j()
      }],
      /**
       * Grid Auto Rows
       * @see https://tailwindcss.com/docs/grid-auto-rows
       */
      "auto-rows": [{
        "auto-rows": j()
      }],
      /**
       * Gap
       * @see https://tailwindcss.com/docs/gap
       */
      gap: [{
        gap: E()
      }],
      /**
       * Gap X
       * @see https://tailwindcss.com/docs/gap
       */
      "gap-x": [{
        "gap-x": E()
      }],
      /**
       * Gap Y
       * @see https://tailwindcss.com/docs/gap
       */
      "gap-y": [{
        "gap-y": E()
      }],
      /**
       * Justify Content
       * @see https://tailwindcss.com/docs/justify-content
       */
      "justify-content": [{
        justify: [...z(), "normal"]
      }],
      /**
       * Justify Items
       * @see https://tailwindcss.com/docs/justify-items
       */
      "justify-items": [{
        "justify-items": [...W(), "normal"]
      }],
      /**
       * Justify Self
       * @see https://tailwindcss.com/docs/justify-self
       */
      "justify-self": [{
        "justify-self": ["auto", ...W()]
      }],
      /**
       * Align Content
       * @see https://tailwindcss.com/docs/align-content
       */
      "align-content": [{
        content: ["normal", ...z()]
      }],
      /**
       * Align Items
       * @see https://tailwindcss.com/docs/align-items
       */
      "align-items": [{
        items: [...W(), {
          baseline: ["", "last"]
        }]
      }],
      /**
       * Align Self
       * @see https://tailwindcss.com/docs/align-self
       */
      "align-self": [{
        self: ["auto", ...W(), {
          baseline: ["", "last"]
        }]
      }],
      /**
       * Place Content
       * @see https://tailwindcss.com/docs/place-content
       */
      "place-content": [{
        "place-content": z()
      }],
      /**
       * Place Items
       * @see https://tailwindcss.com/docs/place-items
       */
      "place-items": [{
        "place-items": [...W(), "baseline"]
      }],
      /**
       * Place Self
       * @see https://tailwindcss.com/docs/place-self
       */
      "place-self": [{
        "place-self": ["auto", ...W()]
      }],
      // Spacing
      /**
       * Padding
       * @see https://tailwindcss.com/docs/padding
       */
      p: [{
        p: E()
      }],
      /**
       * Padding X
       * @see https://tailwindcss.com/docs/padding
       */
      px: [{
        px: E()
      }],
      /**
       * Padding Y
       * @see https://tailwindcss.com/docs/padding
       */
      py: [{
        py: E()
      }],
      /**
       * Padding Start
       * @see https://tailwindcss.com/docs/padding
       */
      ps: [{
        ps: E()
      }],
      /**
       * Padding End
       * @see https://tailwindcss.com/docs/padding
       */
      pe: [{
        pe: E()
      }],
      /**
       * Padding Top
       * @see https://tailwindcss.com/docs/padding
       */
      pt: [{
        pt: E()
      }],
      /**
       * Padding Right
       * @see https://tailwindcss.com/docs/padding
       */
      pr: [{
        pr: E()
      }],
      /**
       * Padding Bottom
       * @see https://tailwindcss.com/docs/padding
       */
      pb: [{
        pb: E()
      }],
      /**
       * Padding Left
       * @see https://tailwindcss.com/docs/padding
       */
      pl: [{
        pl: E()
      }],
      /**
       * Margin
       * @see https://tailwindcss.com/docs/margin
       */
      m: [{
        m: $()
      }],
      /**
       * Margin X
       * @see https://tailwindcss.com/docs/margin
       */
      mx: [{
        mx: $()
      }],
      /**
       * Margin Y
       * @see https://tailwindcss.com/docs/margin
       */
      my: [{
        my: $()
      }],
      /**
       * Margin Start
       * @see https://tailwindcss.com/docs/margin
       */
      ms: [{
        ms: $()
      }],
      /**
       * Margin End
       * @see https://tailwindcss.com/docs/margin
       */
      me: [{
        me: $()
      }],
      /**
       * Margin Top
       * @see https://tailwindcss.com/docs/margin
       */
      mt: [{
        mt: $()
      }],
      /**
       * Margin Right
       * @see https://tailwindcss.com/docs/margin
       */
      mr: [{
        mr: $()
      }],
      /**
       * Margin Bottom
       * @see https://tailwindcss.com/docs/margin
       */
      mb: [{
        mb: $()
      }],
      /**
       * Margin Left
       * @see https://tailwindcss.com/docs/margin
       */
      ml: [{
        ml: $()
      }],
      /**
       * Space Between X
       * @see https://tailwindcss.com/docs/margin#adding-space-between-children
       */
      "space-x": [{
        "space-x": E()
      }],
      /**
       * Space Between X Reverse
       * @see https://tailwindcss.com/docs/margin#adding-space-between-children
       */
      "space-x-reverse": ["space-x-reverse"],
      /**
       * Space Between Y
       * @see https://tailwindcss.com/docs/margin#adding-space-between-children
       */
      "space-y": [{
        "space-y": E()
      }],
      /**
       * Space Between Y Reverse
       * @see https://tailwindcss.com/docs/margin#adding-space-between-children
       */
      "space-y-reverse": ["space-y-reverse"],
      // --------------
      // --- Sizing ---
      // --------------
      /**
       * Size
       * @see https://tailwindcss.com/docs/width#setting-both-width-and-height
       */
      size: [{
        size: C()
      }],
      /**
       * Width
       * @see https://tailwindcss.com/docs/width
       */
      w: [{
        w: [c, "screen", ...C()]
      }],
      /**
       * Min-Width
       * @see https://tailwindcss.com/docs/min-width
       */
      "min-w": [{
        "min-w": [
          c,
          "screen",
          /** Deprecated. @see https://github.com/tailwindlabs/tailwindcss.com/issues/2027#issuecomment-2620152757 */
          "none",
          ...C()
        ]
      }],
      /**
       * Max-Width
       * @see https://tailwindcss.com/docs/max-width
       */
      "max-w": [{
        "max-w": [
          c,
          "screen",
          "none",
          /** Deprecated since Tailwind CSS v4.0.0. @see https://github.com/tailwindlabs/tailwindcss.com/issues/2027#issuecomment-2620152757 */
          "prose",
          /** Deprecated since Tailwind CSS v4.0.0. @see https://github.com/tailwindlabs/tailwindcss.com/issues/2027#issuecomment-2620152757 */
          {
            screen: [i]
          },
          ...C()
        ]
      }],
      /**
       * Height
       * @see https://tailwindcss.com/docs/height
       */
      h: [{
        h: ["screen", "lh", ...C()]
      }],
      /**
       * Min-Height
       * @see https://tailwindcss.com/docs/min-height
       */
      "min-h": [{
        "min-h": ["screen", "lh", "none", ...C()]
      }],
      /**
       * Max-Height
       * @see https://tailwindcss.com/docs/max-height
       */
      "max-h": [{
        "max-h": ["screen", "lh", ...C()]
      }],
      // ------------------
      // --- Typography ---
      // ------------------
      /**
       * Font Size
       * @see https://tailwindcss.com/docs/font-size
       */
      "font-size": [{
        text: ["base", n, br, An]
      }],
      /**
       * Font Smoothing
       * @see https://tailwindcss.com/docs/font-smoothing
       */
      "font-smoothing": ["antialiased", "subpixel-antialiased"],
      /**
       * Font Style
       * @see https://tailwindcss.com/docs/font-style
       */
      "font-style": ["italic", "not-italic"],
      /**
       * Font Weight
       * @see https://tailwindcss.com/docs/font-weight
       */
      "font-weight": [{
        font: [r, re, Rs]
      }],
      /**
       * Font Stretch
       * @see https://tailwindcss.com/docs/font-stretch
       */
      "font-stretch": [{
        "font-stretch": ["ultra-condensed", "extra-condensed", "condensed", "semi-condensed", "normal", "semi-expanded", "expanded", "extra-expanded", "ultra-expanded", Ts, ne]
      }],
      /**
       * Font Family
       * @see https://tailwindcss.com/docs/font-family
       */
      "font-family": [{
        font: [B0, ne, t]
      }],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-normal": ["normal-nums"],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-ordinal": ["ordinal"],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-slashed-zero": ["slashed-zero"],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-figure": ["lining-nums", "oldstyle-nums"],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-spacing": ["proportional-nums", "tabular-nums"],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-fraction": ["diagonal-fractions", "stacked-fractions"],
      /**
       * Letter Spacing
       * @see https://tailwindcss.com/docs/letter-spacing
       */
      tracking: [{
        tracking: [o, re, ne]
      }],
      /**
       * Line Clamp
       * @see https://tailwindcss.com/docs/line-clamp
       */
      "line-clamp": [{
        "line-clamp": [ye, "none", re, Rs]
      }],
      /**
       * Line Height
       * @see https://tailwindcss.com/docs/line-height
       */
      leading: [{
        leading: [
          /** Deprecated since Tailwind CSS v4.0.0. @see https://github.com/tailwindlabs/tailwindcss.com/issues/2027#issuecomment-2620152757 */
          a,
          ...E()
        ]
      }],
      /**
       * List Style Image
       * @see https://tailwindcss.com/docs/list-style-image
       */
      "list-image": [{
        "list-image": ["none", re, ne]
      }],
      /**
       * List Style Position
       * @see https://tailwindcss.com/docs/list-style-position
       */
      "list-style-position": [{
        list: ["inside", "outside"]
      }],
      /**
       * List Style Type
       * @see https://tailwindcss.com/docs/list-style-type
       */
      "list-style-type": [{
        list: ["disc", "decimal", "none", re, ne]
      }],
      /**
       * Text Alignment
       * @see https://tailwindcss.com/docs/text-align
       */
      "text-alignment": [{
        text: ["left", "center", "right", "justify", "start", "end"]
      }],
      /**
       * Placeholder Color
       * @deprecated since Tailwind CSS v3.0.0
       * @see https://v3.tailwindcss.com/docs/placeholder-color
       */
      "placeholder-color": [{
        placeholder: N()
      }],
      /**
       * Text Color
       * @see https://tailwindcss.com/docs/text-color
       */
      "text-color": [{
        text: N()
      }],
      /**
       * Text Decoration
       * @see https://tailwindcss.com/docs/text-decoration
       */
      "text-decoration": ["underline", "overline", "line-through", "no-underline"],
      /**
       * Text Decoration Style
       * @see https://tailwindcss.com/docs/text-decoration-style
       */
      "text-decoration-style": [{
        decoration: [...Q(), "wavy"]
      }],
      /**
       * Text Decoration Thickness
       * @see https://tailwindcss.com/docs/text-decoration-thickness
       */
      "text-decoration-thickness": [{
        decoration: [ye, "from-font", "auto", re, An]
      }],
      /**
       * Text Decoration Color
       * @see https://tailwindcss.com/docs/text-decoration-color
       */
      "text-decoration-color": [{
        decoration: N()
      }],
      /**
       * Text Underline Offset
       * @see https://tailwindcss.com/docs/text-underline-offset
       */
      "underline-offset": [{
        "underline-offset": [ye, "auto", re, ne]
      }],
      /**
       * Text Transform
       * @see https://tailwindcss.com/docs/text-transform
       */
      "text-transform": ["uppercase", "lowercase", "capitalize", "normal-case"],
      /**
       * Text Overflow
       * @see https://tailwindcss.com/docs/text-overflow
       */
      "text-overflow": ["truncate", "text-ellipsis", "text-clip"],
      /**
       * Text Wrap
       * @see https://tailwindcss.com/docs/text-wrap
       */
      "text-wrap": [{
        text: ["wrap", "nowrap", "balance", "pretty"]
      }],
      /**
       * Text Indent
       * @see https://tailwindcss.com/docs/text-indent
       */
      indent: [{
        indent: E()
      }],
      /**
       * Vertical Alignment
       * @see https://tailwindcss.com/docs/vertical-align
       */
      "vertical-align": [{
        align: ["baseline", "top", "middle", "bottom", "text-top", "text-bottom", "sub", "super", re, ne]
      }],
      /**
       * Whitespace
       * @see https://tailwindcss.com/docs/whitespace
       */
      whitespace: [{
        whitespace: ["normal", "nowrap", "pre", "pre-line", "pre-wrap", "break-spaces"]
      }],
      /**
       * Word Break
       * @see https://tailwindcss.com/docs/word-break
       */
      break: [{
        break: ["normal", "words", "all", "keep"]
      }],
      /**
       * Overflow Wrap
       * @see https://tailwindcss.com/docs/overflow-wrap
       */
      wrap: [{
        wrap: ["break-word", "anywhere", "normal"]
      }],
      /**
       * Hyphens
       * @see https://tailwindcss.com/docs/hyphens
       */
      hyphens: [{
        hyphens: ["none", "manual", "auto"]
      }],
      /**
       * Content
       * @see https://tailwindcss.com/docs/content
       */
      content: [{
        content: ["none", re, ne]
      }],
      // -------------------
      // --- Backgrounds ---
      // -------------------
      /**
       * Background Attachment
       * @see https://tailwindcss.com/docs/background-attachment
       */
      "bg-attachment": [{
        bg: ["fixed", "local", "scroll"]
      }],
      /**
       * Background Clip
       * @see https://tailwindcss.com/docs/background-clip
       */
      "bg-clip": [{
        "bg-clip": ["border", "padding", "content", "text"]
      }],
      /**
       * Background Origin
       * @see https://tailwindcss.com/docs/background-origin
       */
      "bg-origin": [{
        "bg-origin": ["border", "padding", "content"]
      }],
      /**
       * Background Position
       * @see https://tailwindcss.com/docs/background-position
       */
      "bg-position": [{
        bg: H()
      }],
      /**
       * Background Repeat
       * @see https://tailwindcss.com/docs/background-repeat
       */
      "bg-repeat": [{
        bg: G()
      }],
      /**
       * Background Size
       * @see https://tailwindcss.com/docs/background-size
       */
      "bg-size": [{
        bg: J()
      }],
      /**
       * Background Image
       * @see https://tailwindcss.com/docs/background-image
       */
      "bg-image": [{
        bg: ["none", {
          linear: [{
            to: ["t", "tr", "r", "br", "b", "bl", "l", "tl"]
          }, fn, re, ne],
          radial: ["", re, ne],
          conic: [fn, re, ne]
        }, V0, j0]
      }],
      /**
       * Background Color
       * @see https://tailwindcss.com/docs/background-color
       */
      "bg-color": [{
        bg: N()
      }],
      /**
       * Gradient Color Stops From Position
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-from-pos": [{
        from: fe()
      }],
      /**
       * Gradient Color Stops Via Position
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-via-pos": [{
        via: fe()
      }],
      /**
       * Gradient Color Stops To Position
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-to-pos": [{
        to: fe()
      }],
      /**
       * Gradient Color Stops From
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-from": [{
        from: N()
      }],
      /**
       * Gradient Color Stops Via
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-via": [{
        via: N()
      }],
      /**
       * Gradient Color Stops To
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-to": [{
        to: N()
      }],
      // ---------------
      // --- Borders ---
      // ---------------
      /**
       * Border Radius
       * @see https://tailwindcss.com/docs/border-radius
       */
      rounded: [{
        rounded: Z()
      }],
      /**
       * Border Radius Start
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-s": [{
        "rounded-s": Z()
      }],
      /**
       * Border Radius End
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-e": [{
        "rounded-e": Z()
      }],
      /**
       * Border Radius Top
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-t": [{
        "rounded-t": Z()
      }],
      /**
       * Border Radius Right
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-r": [{
        "rounded-r": Z()
      }],
      /**
       * Border Radius Bottom
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-b": [{
        "rounded-b": Z()
      }],
      /**
       * Border Radius Left
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-l": [{
        "rounded-l": Z()
      }],
      /**
       * Border Radius Start Start
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-ss": [{
        "rounded-ss": Z()
      }],
      /**
       * Border Radius Start End
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-se": [{
        "rounded-se": Z()
      }],
      /**
       * Border Radius End End
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-ee": [{
        "rounded-ee": Z()
      }],
      /**
       * Border Radius End Start
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-es": [{
        "rounded-es": Z()
      }],
      /**
       * Border Radius Top Left
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-tl": [{
        "rounded-tl": Z()
      }],
      /**
       * Border Radius Top Right
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-tr": [{
        "rounded-tr": Z()
      }],
      /**
       * Border Radius Bottom Right
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-br": [{
        "rounded-br": Z()
      }],
      /**
       * Border Radius Bottom Left
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-bl": [{
        "rounded-bl": Z()
      }],
      /**
       * Border Width
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w": [{
        border: X()
      }],
      /**
       * Border Width X
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-x": [{
        "border-x": X()
      }],
      /**
       * Border Width Y
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-y": [{
        "border-y": X()
      }],
      /**
       * Border Width Start
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-s": [{
        "border-s": X()
      }],
      /**
       * Border Width End
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-e": [{
        "border-e": X()
      }],
      /**
       * Border Width Top
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-t": [{
        "border-t": X()
      }],
      /**
       * Border Width Right
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-r": [{
        "border-r": X()
      }],
      /**
       * Border Width Bottom
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-b": [{
        "border-b": X()
      }],
      /**
       * Border Width Left
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-l": [{
        "border-l": X()
      }],
      /**
       * Divide Width X
       * @see https://tailwindcss.com/docs/border-width#between-children
       */
      "divide-x": [{
        "divide-x": X()
      }],
      /**
       * Divide Width X Reverse
       * @see https://tailwindcss.com/docs/border-width#between-children
       */
      "divide-x-reverse": ["divide-x-reverse"],
      /**
       * Divide Width Y
       * @see https://tailwindcss.com/docs/border-width#between-children
       */
      "divide-y": [{
        "divide-y": X()
      }],
      /**
       * Divide Width Y Reverse
       * @see https://tailwindcss.com/docs/border-width#between-children
       */
      "divide-y-reverse": ["divide-y-reverse"],
      /**
       * Border Style
       * @see https://tailwindcss.com/docs/border-style
       */
      "border-style": [{
        border: [...Q(), "hidden", "none"]
      }],
      /**
       * Divide Style
       * @see https://tailwindcss.com/docs/border-style#setting-the-divider-style
       */
      "divide-style": [{
        divide: [...Q(), "hidden", "none"]
      }],
      /**
       * Border Color
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color": [{
        border: N()
      }],
      /**
       * Border Color X
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-x": [{
        "border-x": N()
      }],
      /**
       * Border Color Y
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-y": [{
        "border-y": N()
      }],
      /**
       * Border Color S
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-s": [{
        "border-s": N()
      }],
      /**
       * Border Color E
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-e": [{
        "border-e": N()
      }],
      /**
       * Border Color Top
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-t": [{
        "border-t": N()
      }],
      /**
       * Border Color Right
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-r": [{
        "border-r": N()
      }],
      /**
       * Border Color Bottom
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-b": [{
        "border-b": N()
      }],
      /**
       * Border Color Left
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-l": [{
        "border-l": N()
      }],
      /**
       * Divide Color
       * @see https://tailwindcss.com/docs/divide-color
       */
      "divide-color": [{
        divide: N()
      }],
      /**
       * Outline Style
       * @see https://tailwindcss.com/docs/outline-style
       */
      "outline-style": [{
        outline: [...Q(), "none", "hidden"]
      }],
      /**
       * Outline Offset
       * @see https://tailwindcss.com/docs/outline-offset
       */
      "outline-offset": [{
        "outline-offset": [ye, re, ne]
      }],
      /**
       * Outline Width
       * @see https://tailwindcss.com/docs/outline-width
       */
      "outline-w": [{
        outline: ["", ye, br, An]
      }],
      /**
       * Outline Color
       * @see https://tailwindcss.com/docs/outline-color
       */
      "outline-color": [{
        outline: N()
      }],
      // ---------------
      // --- Effects ---
      // ---------------
      /**
       * Box Shadow
       * @see https://tailwindcss.com/docs/box-shadow
       */
      shadow: [{
        shadow: [
          // Deprecated since Tailwind CSS v4.0.0
          "",
          "none",
          f,
          to,
          eo
        ]
      }],
      /**
       * Box Shadow Color
       * @see https://tailwindcss.com/docs/box-shadow#setting-the-shadow-color
       */
      "shadow-color": [{
        shadow: N()
      }],
      /**
       * Inset Box Shadow
       * @see https://tailwindcss.com/docs/box-shadow#adding-an-inset-shadow
       */
      "inset-shadow": [{
        "inset-shadow": ["none", u, to, eo]
      }],
      /**
       * Inset Box Shadow Color
       * @see https://tailwindcss.com/docs/box-shadow#setting-the-inset-shadow-color
       */
      "inset-shadow-color": [{
        "inset-shadow": N()
      }],
      /**
       * Ring Width
       * @see https://tailwindcss.com/docs/box-shadow#adding-a-ring
       */
      "ring-w": [{
        ring: X()
      }],
      /**
       * Ring Width Inset
       * @see https://v3.tailwindcss.com/docs/ring-width#inset-rings
       * @deprecated since Tailwind CSS v4.0.0
       * @see https://github.com/tailwindlabs/tailwindcss/blob/v4.0.0/packages/tailwindcss/src/utilities.ts#L4158
       */
      "ring-w-inset": ["ring-inset"],
      /**
       * Ring Color
       * @see https://tailwindcss.com/docs/box-shadow#setting-the-ring-color
       */
      "ring-color": [{
        ring: N()
      }],
      /**
       * Ring Offset Width
       * @see https://v3.tailwindcss.com/docs/ring-offset-width
       * @deprecated since Tailwind CSS v4.0.0
       * @see https://github.com/tailwindlabs/tailwindcss/blob/v4.0.0/packages/tailwindcss/src/utilities.ts#L4158
       */
      "ring-offset-w": [{
        "ring-offset": [ye, An]
      }],
      /**
       * Ring Offset Color
       * @see https://v3.tailwindcss.com/docs/ring-offset-color
       * @deprecated since Tailwind CSS v4.0.0
       * @see https://github.com/tailwindlabs/tailwindcss/blob/v4.0.0/packages/tailwindcss/src/utilities.ts#L4158
       */
      "ring-offset-color": [{
        "ring-offset": N()
      }],
      /**
       * Inset Ring Width
       * @see https://tailwindcss.com/docs/box-shadow#adding-an-inset-ring
       */
      "inset-ring-w": [{
        "inset-ring": X()
      }],
      /**
       * Inset Ring Color
       * @see https://tailwindcss.com/docs/box-shadow#setting-the-inset-ring-color
       */
      "inset-ring-color": [{
        "inset-ring": N()
      }],
      /**
       * Text Shadow
       * @see https://tailwindcss.com/docs/text-shadow
       */
      "text-shadow": [{
        "text-shadow": ["none", h, to, eo]
      }],
      /**
       * Text Shadow Color
       * @see https://tailwindcss.com/docs/text-shadow#setting-the-shadow-color
       */
      "text-shadow-color": [{
        "text-shadow": N()
      }],
      /**
       * Opacity
       * @see https://tailwindcss.com/docs/opacity
       */
      opacity: [{
        opacity: [ye, re, ne]
      }],
      /**
       * Mix Blend Mode
       * @see https://tailwindcss.com/docs/mix-blend-mode
       */
      "mix-blend": [{
        "mix-blend": [...ge(), "plus-darker", "plus-lighter"]
      }],
      /**
       * Background Blend Mode
       * @see https://tailwindcss.com/docs/background-blend-mode
       */
      "bg-blend": [{
        "bg-blend": ge()
      }],
      /**
       * Mask Clip
       * @see https://tailwindcss.com/docs/mask-clip
       */
      "mask-clip": [{
        "mask-clip": ["border", "padding", "content", "fill", "stroke", "view"]
      }, "mask-no-clip"],
      /**
       * Mask Composite
       * @see https://tailwindcss.com/docs/mask-composite
       */
      "mask-composite": [{
        mask: ["add", "subtract", "intersect", "exclude"]
      }],
      /**
       * Mask Image
       * @see https://tailwindcss.com/docs/mask-image
       */
      "mask-image-linear-pos": [{
        "mask-linear": [ye]
      }],
      "mask-image-linear-from-pos": [{
        "mask-linear-from": F()
      }],
      "mask-image-linear-to-pos": [{
        "mask-linear-to": F()
      }],
      "mask-image-linear-from-color": [{
        "mask-linear-from": N()
      }],
      "mask-image-linear-to-color": [{
        "mask-linear-to": N()
      }],
      "mask-image-t-from-pos": [{
        "mask-t-from": F()
      }],
      "mask-image-t-to-pos": [{
        "mask-t-to": F()
      }],
      "mask-image-t-from-color": [{
        "mask-t-from": N()
      }],
      "mask-image-t-to-color": [{
        "mask-t-to": N()
      }],
      "mask-image-r-from-pos": [{
        "mask-r-from": F()
      }],
      "mask-image-r-to-pos": [{
        "mask-r-to": F()
      }],
      "mask-image-r-from-color": [{
        "mask-r-from": N()
      }],
      "mask-image-r-to-color": [{
        "mask-r-to": N()
      }],
      "mask-image-b-from-pos": [{
        "mask-b-from": F()
      }],
      "mask-image-b-to-pos": [{
        "mask-b-to": F()
      }],
      "mask-image-b-from-color": [{
        "mask-b-from": N()
      }],
      "mask-image-b-to-color": [{
        "mask-b-to": N()
      }],
      "mask-image-l-from-pos": [{
        "mask-l-from": F()
      }],
      "mask-image-l-to-pos": [{
        "mask-l-to": F()
      }],
      "mask-image-l-from-color": [{
        "mask-l-from": N()
      }],
      "mask-image-l-to-color": [{
        "mask-l-to": N()
      }],
      "mask-image-x-from-pos": [{
        "mask-x-from": F()
      }],
      "mask-image-x-to-pos": [{
        "mask-x-to": F()
      }],
      "mask-image-x-from-color": [{
        "mask-x-from": N()
      }],
      "mask-image-x-to-color": [{
        "mask-x-to": N()
      }],
      "mask-image-y-from-pos": [{
        "mask-y-from": F()
      }],
      "mask-image-y-to-pos": [{
        "mask-y-to": F()
      }],
      "mask-image-y-from-color": [{
        "mask-y-from": N()
      }],
      "mask-image-y-to-color": [{
        "mask-y-to": N()
      }],
      "mask-image-radial": [{
        "mask-radial": [re, ne]
      }],
      "mask-image-radial-from-pos": [{
        "mask-radial-from": F()
      }],
      "mask-image-radial-to-pos": [{
        "mask-radial-to": F()
      }],
      "mask-image-radial-from-color": [{
        "mask-radial-from": N()
      }],
      "mask-image-radial-to-color": [{
        "mask-radial-to": N()
      }],
      "mask-image-radial-shape": [{
        "mask-radial": ["circle", "ellipse"]
      }],
      "mask-image-radial-size": [{
        "mask-radial": [{
          closest: ["side", "corner"],
          farthest: ["side", "corner"]
        }]
      }],
      "mask-image-radial-pos": [{
        "mask-radial-at": x()
      }],
      "mask-image-conic-pos": [{
        "mask-conic": [ye]
      }],
      "mask-image-conic-from-pos": [{
        "mask-conic-from": F()
      }],
      "mask-image-conic-to-pos": [{
        "mask-conic-to": F()
      }],
      "mask-image-conic-from-color": [{
        "mask-conic-from": N()
      }],
      "mask-image-conic-to-color": [{
        "mask-conic-to": N()
      }],
      /**
       * Mask Mode
       * @see https://tailwindcss.com/docs/mask-mode
       */
      "mask-mode": [{
        mask: ["alpha", "luminance", "match"]
      }],
      /**
       * Mask Origin
       * @see https://tailwindcss.com/docs/mask-origin
       */
      "mask-origin": [{
        "mask-origin": ["border", "padding", "content", "fill", "stroke", "view"]
      }],
      /**
       * Mask Position
       * @see https://tailwindcss.com/docs/mask-position
       */
      "mask-position": [{
        mask: H()
      }],
      /**
       * Mask Repeat
       * @see https://tailwindcss.com/docs/mask-repeat
       */
      "mask-repeat": [{
        mask: G()
      }],
      /**
       * Mask Size
       * @see https://tailwindcss.com/docs/mask-size
       */
      "mask-size": [{
        mask: J()
      }],
      /**
       * Mask Type
       * @see https://tailwindcss.com/docs/mask-type
       */
      "mask-type": [{
        "mask-type": ["alpha", "luminance"]
      }],
      /**
       * Mask Image
       * @see https://tailwindcss.com/docs/mask-image
       */
      "mask-image": [{
        mask: ["none", re, ne]
      }],
      // ---------------
      // --- Filters ---
      // ---------------
      /**
       * Filter
       * @see https://tailwindcss.com/docs/filter
       */
      filter: [{
        filter: [
          // Deprecated since Tailwind CSS v3.0.0
          "",
          "none",
          re,
          ne
        ]
      }],
      /**
       * Blur
       * @see https://tailwindcss.com/docs/blur
       */
      blur: [{
        blur: Y()
      }],
      /**
       * Brightness
       * @see https://tailwindcss.com/docs/brightness
       */
      brightness: [{
        brightness: [ye, re, ne]
      }],
      /**
       * Contrast
       * @see https://tailwindcss.com/docs/contrast
       */
      contrast: [{
        contrast: [ye, re, ne]
      }],
      /**
       * Drop Shadow
       * @see https://tailwindcss.com/docs/drop-shadow
       */
      "drop-shadow": [{
        "drop-shadow": [
          // Deprecated since Tailwind CSS v4.0.0
          "",
          "none",
          g,
          to,
          eo
        ]
      }],
      /**
       * Drop Shadow Color
       * @see https://tailwindcss.com/docs/filter-drop-shadow#setting-the-shadow-color
       */
      "drop-shadow-color": [{
        "drop-shadow": N()
      }],
      /**
       * Grayscale
       * @see https://tailwindcss.com/docs/grayscale
       */
      grayscale: [{
        grayscale: ["", ye, re, ne]
      }],
      /**
       * Hue Rotate
       * @see https://tailwindcss.com/docs/hue-rotate
       */
      "hue-rotate": [{
        "hue-rotate": [ye, re, ne]
      }],
      /**
       * Invert
       * @see https://tailwindcss.com/docs/invert
       */
      invert: [{
        invert: ["", ye, re, ne]
      }],
      /**
       * Saturate
       * @see https://tailwindcss.com/docs/saturate
       */
      saturate: [{
        saturate: [ye, re, ne]
      }],
      /**
       * Sepia
       * @see https://tailwindcss.com/docs/sepia
       */
      sepia: [{
        sepia: ["", ye, re, ne]
      }],
      /**
       * Backdrop Filter
       * @see https://tailwindcss.com/docs/backdrop-filter
       */
      "backdrop-filter": [{
        "backdrop-filter": [
          // Deprecated since Tailwind CSS v3.0.0
          "",
          "none",
          re,
          ne
        ]
      }],
      /**
       * Backdrop Blur
       * @see https://tailwindcss.com/docs/backdrop-blur
       */
      "backdrop-blur": [{
        "backdrop-blur": Y()
      }],
      /**
       * Backdrop Brightness
       * @see https://tailwindcss.com/docs/backdrop-brightness
       */
      "backdrop-brightness": [{
        "backdrop-brightness": [ye, re, ne]
      }],
      /**
       * Backdrop Contrast
       * @see https://tailwindcss.com/docs/backdrop-contrast
       */
      "backdrop-contrast": [{
        "backdrop-contrast": [ye, re, ne]
      }],
      /**
       * Backdrop Grayscale
       * @see https://tailwindcss.com/docs/backdrop-grayscale
       */
      "backdrop-grayscale": [{
        "backdrop-grayscale": ["", ye, re, ne]
      }],
      /**
       * Backdrop Hue Rotate
       * @see https://tailwindcss.com/docs/backdrop-hue-rotate
       */
      "backdrop-hue-rotate": [{
        "backdrop-hue-rotate": [ye, re, ne]
      }],
      /**
       * Backdrop Invert
       * @see https://tailwindcss.com/docs/backdrop-invert
       */
      "backdrop-invert": [{
        "backdrop-invert": ["", ye, re, ne]
      }],
      /**
       * Backdrop Opacity
       * @see https://tailwindcss.com/docs/backdrop-opacity
       */
      "backdrop-opacity": [{
        "backdrop-opacity": [ye, re, ne]
      }],
      /**
       * Backdrop Saturate
       * @see https://tailwindcss.com/docs/backdrop-saturate
       */
      "backdrop-saturate": [{
        "backdrop-saturate": [ye, re, ne]
      }],
      /**
       * Backdrop Sepia
       * @see https://tailwindcss.com/docs/backdrop-sepia
       */
      "backdrop-sepia": [{
        "backdrop-sepia": ["", ye, re, ne]
      }],
      // --------------
      // --- Tables ---
      // --------------
      /**
       * Border Collapse
       * @see https://tailwindcss.com/docs/border-collapse
       */
      "border-collapse": [{
        border: ["collapse", "separate"]
      }],
      /**
       * Border Spacing
       * @see https://tailwindcss.com/docs/border-spacing
       */
      "border-spacing": [{
        "border-spacing": E()
      }],
      /**
       * Border Spacing X
       * @see https://tailwindcss.com/docs/border-spacing
       */
      "border-spacing-x": [{
        "border-spacing-x": E()
      }],
      /**
       * Border Spacing Y
       * @see https://tailwindcss.com/docs/border-spacing
       */
      "border-spacing-y": [{
        "border-spacing-y": E()
      }],
      /**
       * Table Layout
       * @see https://tailwindcss.com/docs/table-layout
       */
      "table-layout": [{
        table: ["auto", "fixed"]
      }],
      /**
       * Caption Side
       * @see https://tailwindcss.com/docs/caption-side
       */
      caption: [{
        caption: ["top", "bottom"]
      }],
      // ---------------------------------
      // --- Transitions and Animation ---
      // ---------------------------------
      /**
       * Transition Property
       * @see https://tailwindcss.com/docs/transition-property
       */
      transition: [{
        transition: ["", "all", "colors", "opacity", "shadow", "transform", "none", re, ne]
      }],
      /**
       * Transition Behavior
       * @see https://tailwindcss.com/docs/transition-behavior
       */
      "transition-behavior": [{
        transition: ["normal", "discrete"]
      }],
      /**
       * Transition Duration
       * @see https://tailwindcss.com/docs/transition-duration
       */
      duration: [{
        duration: [ye, "initial", re, ne]
      }],
      /**
       * Transition Timing Function
       * @see https://tailwindcss.com/docs/transition-timing-function
       */
      ease: [{
        ease: ["linear", "initial", w, re, ne]
      }],
      /**
       * Transition Delay
       * @see https://tailwindcss.com/docs/transition-delay
       */
      delay: [{
        delay: [ye, re, ne]
      }],
      /**
       * Animation
       * @see https://tailwindcss.com/docs/animation
       */
      animate: [{
        animate: ["none", k, re, ne]
      }],
      // ------------------
      // --- Transforms ---
      // ------------------
      /**
       * Backface Visibility
       * @see https://tailwindcss.com/docs/backface-visibility
       */
      backface: [{
        backface: ["hidden", "visible"]
      }],
      /**
       * Perspective
       * @see https://tailwindcss.com/docs/perspective
       */
      perspective: [{
        perspective: [v, re, ne]
      }],
      /**
       * Perspective Origin
       * @see https://tailwindcss.com/docs/perspective-origin
       */
      "perspective-origin": [{
        "perspective-origin": S()
      }],
      /**
       * Rotate
       * @see https://tailwindcss.com/docs/rotate
       */
      rotate: [{
        rotate: he()
      }],
      /**
       * Rotate X
       * @see https://tailwindcss.com/docs/rotate
       */
      "rotate-x": [{
        "rotate-x": he()
      }],
      /**
       * Rotate Y
       * @see https://tailwindcss.com/docs/rotate
       */
      "rotate-y": [{
        "rotate-y": he()
      }],
      /**
       * Rotate Z
       * @see https://tailwindcss.com/docs/rotate
       */
      "rotate-z": [{
        "rotate-z": he()
      }],
      /**
       * Scale
       * @see https://tailwindcss.com/docs/scale
       */
      scale: [{
        scale: V()
      }],
      /**
       * Scale X
       * @see https://tailwindcss.com/docs/scale
       */
      "scale-x": [{
        "scale-x": V()
      }],
      /**
       * Scale Y
       * @see https://tailwindcss.com/docs/scale
       */
      "scale-y": [{
        "scale-y": V()
      }],
      /**
       * Scale Z
       * @see https://tailwindcss.com/docs/scale
       */
      "scale-z": [{
        "scale-z": V()
      }],
      /**
       * Scale 3D
       * @see https://tailwindcss.com/docs/scale
       */
      "scale-3d": ["scale-3d"],
      /**
       * Skew
       * @see https://tailwindcss.com/docs/skew
       */
      skew: [{
        skew: ie()
      }],
      /**
       * Skew X
       * @see https://tailwindcss.com/docs/skew
       */
      "skew-x": [{
        "skew-x": ie()
      }],
      /**
       * Skew Y
       * @see https://tailwindcss.com/docs/skew
       */
      "skew-y": [{
        "skew-y": ie()
      }],
      /**
       * Transform
       * @see https://tailwindcss.com/docs/transform
       */
      transform: [{
        transform: [re, ne, "", "none", "gpu", "cpu"]
      }],
      /**
       * Transform Origin
       * @see https://tailwindcss.com/docs/transform-origin
       */
      "transform-origin": [{
        origin: S()
      }],
      /**
       * Transform Style
       * @see https://tailwindcss.com/docs/transform-style
       */
      "transform-style": [{
        transform: ["3d", "flat"]
      }],
      /**
       * Translate
       * @see https://tailwindcss.com/docs/translate
       */
      translate: [{
        translate: ue()
      }],
      /**
       * Translate X
       * @see https://tailwindcss.com/docs/translate
       */
      "translate-x": [{
        "translate-x": ue()
      }],
      /**
       * Translate Y
       * @see https://tailwindcss.com/docs/translate
       */
      "translate-y": [{
        "translate-y": ue()
      }],
      /**
       * Translate Z
       * @see https://tailwindcss.com/docs/translate
       */
      "translate-z": [{
        "translate-z": ue()
      }],
      /**
       * Translate None
       * @see https://tailwindcss.com/docs/translate
       */
      "translate-none": ["translate-none"],
      // ---------------------
      // --- Interactivity ---
      // ---------------------
      /**
       * Accent Color
       * @see https://tailwindcss.com/docs/accent-color
       */
      accent: [{
        accent: N()
      }],
      /**
       * Appearance
       * @see https://tailwindcss.com/docs/appearance
       */
      appearance: [{
        appearance: ["none", "auto"]
      }],
      /**
       * Caret Color
       * @see https://tailwindcss.com/docs/just-in-time-mode#caret-color-utilities
       */
      "caret-color": [{
        caret: N()
      }],
      /**
       * Color Scheme
       * @see https://tailwindcss.com/docs/color-scheme
       */
      "color-scheme": [{
        scheme: ["normal", "dark", "light", "light-dark", "only-dark", "only-light"]
      }],
      /**
       * Cursor
       * @see https://tailwindcss.com/docs/cursor
       */
      cursor: [{
        cursor: ["auto", "default", "pointer", "wait", "text", "move", "help", "not-allowed", "none", "context-menu", "progress", "cell", "crosshair", "vertical-text", "alias", "copy", "no-drop", "grab", "grabbing", "all-scroll", "col-resize", "row-resize", "n-resize", "e-resize", "s-resize", "w-resize", "ne-resize", "nw-resize", "se-resize", "sw-resize", "ew-resize", "ns-resize", "nesw-resize", "nwse-resize", "zoom-in", "zoom-out", re, ne]
      }],
      /**
       * Field Sizing
       * @see https://tailwindcss.com/docs/field-sizing
       */
      "field-sizing": [{
        "field-sizing": ["fixed", "content"]
      }],
      /**
       * Pointer Events
       * @see https://tailwindcss.com/docs/pointer-events
       */
      "pointer-events": [{
        "pointer-events": ["auto", "none"]
      }],
      /**
       * Resize
       * @see https://tailwindcss.com/docs/resize
       */
      resize: [{
        resize: ["none", "", "y", "x"]
      }],
      /**
       * Scroll Behavior
       * @see https://tailwindcss.com/docs/scroll-behavior
       */
      "scroll-behavior": [{
        scroll: ["auto", "smooth"]
      }],
      /**
       * Scroll Margin
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-m": [{
        "scroll-m": E()
      }],
      /**
       * Scroll Margin X
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mx": [{
        "scroll-mx": E()
      }],
      /**
       * Scroll Margin Y
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-my": [{
        "scroll-my": E()
      }],
      /**
       * Scroll Margin Start
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-ms": [{
        "scroll-ms": E()
      }],
      /**
       * Scroll Margin End
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-me": [{
        "scroll-me": E()
      }],
      /**
       * Scroll Margin Top
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mt": [{
        "scroll-mt": E()
      }],
      /**
       * Scroll Margin Right
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mr": [{
        "scroll-mr": E()
      }],
      /**
       * Scroll Margin Bottom
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mb": [{
        "scroll-mb": E()
      }],
      /**
       * Scroll Margin Left
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-ml": [{
        "scroll-ml": E()
      }],
      /**
       * Scroll Padding
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-p": [{
        "scroll-p": E()
      }],
      /**
       * Scroll Padding X
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-px": [{
        "scroll-px": E()
      }],
      /**
       * Scroll Padding Y
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-py": [{
        "scroll-py": E()
      }],
      /**
       * Scroll Padding Start
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-ps": [{
        "scroll-ps": E()
      }],
      /**
       * Scroll Padding End
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pe": [{
        "scroll-pe": E()
      }],
      /**
       * Scroll Padding Top
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pt": [{
        "scroll-pt": E()
      }],
      /**
       * Scroll Padding Right
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pr": [{
        "scroll-pr": E()
      }],
      /**
       * Scroll Padding Bottom
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pb": [{
        "scroll-pb": E()
      }],
      /**
       * Scroll Padding Left
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pl": [{
        "scroll-pl": E()
      }],
      /**
       * Scroll Snap Align
       * @see https://tailwindcss.com/docs/scroll-snap-align
       */
      "snap-align": [{
        snap: ["start", "end", "center", "align-none"]
      }],
      /**
       * Scroll Snap Stop
       * @see https://tailwindcss.com/docs/scroll-snap-stop
       */
      "snap-stop": [{
        snap: ["normal", "always"]
      }],
      /**
       * Scroll Snap Type
       * @see https://tailwindcss.com/docs/scroll-snap-type
       */
      "snap-type": [{
        snap: ["none", "x", "y", "both"]
      }],
      /**
       * Scroll Snap Type Strictness
       * @see https://tailwindcss.com/docs/scroll-snap-type
       */
      "snap-strictness": [{
        snap: ["mandatory", "proximity"]
      }],
      /**
       * Touch Action
       * @see https://tailwindcss.com/docs/touch-action
       */
      touch: [{
        touch: ["auto", "none", "manipulation"]
      }],
      /**
       * Touch Action X
       * @see https://tailwindcss.com/docs/touch-action
       */
      "touch-x": [{
        "touch-pan": ["x", "left", "right"]
      }],
      /**
       * Touch Action Y
       * @see https://tailwindcss.com/docs/touch-action
       */
      "touch-y": [{
        "touch-pan": ["y", "up", "down"]
      }],
      /**
       * Touch Action Pinch Zoom
       * @see https://tailwindcss.com/docs/touch-action
       */
      "touch-pz": ["touch-pinch-zoom"],
      /**
       * User Select
       * @see https://tailwindcss.com/docs/user-select
       */
      select: [{
        select: ["none", "text", "all", "auto"]
      }],
      /**
       * Will Change
       * @see https://tailwindcss.com/docs/will-change
       */
      "will-change": [{
        "will-change": ["auto", "scroll", "contents", "transform", re, ne]
      }],
      // -----------
      // --- SVG ---
      // -----------
      /**
       * Fill
       * @see https://tailwindcss.com/docs/fill
       */
      fill: [{
        fill: ["none", ...N()]
      }],
      /**
       * Stroke Width
       * @see https://tailwindcss.com/docs/stroke-width
       */
      "stroke-w": [{
        stroke: [ye, br, An, Rs]
      }],
      /**
       * Stroke
       * @see https://tailwindcss.com/docs/stroke
       */
      stroke: [{
        stroke: ["none", ...N()]
      }],
      // ---------------------
      // --- Accessibility ---
      // ---------------------
      /**
       * Forced Color Adjust
       * @see https://tailwindcss.com/docs/forced-color-adjust
       */
      "forced-color-adjust": [{
        "forced-color-adjust": ["auto", "none"]
      }]
    },
    conflictingClassGroups: {
      overflow: ["overflow-x", "overflow-y"],
      overscroll: ["overscroll-x", "overscroll-y"],
      inset: ["inset-x", "inset-y", "start", "end", "top", "right", "bottom", "left"],
      "inset-x": ["right", "left"],
      "inset-y": ["top", "bottom"],
      flex: ["basis", "grow", "shrink"],
      gap: ["gap-x", "gap-y"],
      p: ["px", "py", "ps", "pe", "pt", "pr", "pb", "pl"],
      px: ["pr", "pl"],
      py: ["pt", "pb"],
      m: ["mx", "my", "ms", "me", "mt", "mr", "mb", "ml"],
      mx: ["mr", "ml"],
      my: ["mt", "mb"],
      size: ["w", "h"],
      "font-size": ["leading"],
      "fvn-normal": ["fvn-ordinal", "fvn-slashed-zero", "fvn-figure", "fvn-spacing", "fvn-fraction"],
      "fvn-ordinal": ["fvn-normal"],
      "fvn-slashed-zero": ["fvn-normal"],
      "fvn-figure": ["fvn-normal"],
      "fvn-spacing": ["fvn-normal"],
      "fvn-fraction": ["fvn-normal"],
      "line-clamp": ["display", "overflow"],
      rounded: ["rounded-s", "rounded-e", "rounded-t", "rounded-r", "rounded-b", "rounded-l", "rounded-ss", "rounded-se", "rounded-ee", "rounded-es", "rounded-tl", "rounded-tr", "rounded-br", "rounded-bl"],
      "rounded-s": ["rounded-ss", "rounded-es"],
      "rounded-e": ["rounded-se", "rounded-ee"],
      "rounded-t": ["rounded-tl", "rounded-tr"],
      "rounded-r": ["rounded-tr", "rounded-br"],
      "rounded-b": ["rounded-br", "rounded-bl"],
      "rounded-l": ["rounded-tl", "rounded-bl"],
      "border-spacing": ["border-spacing-x", "border-spacing-y"],
      "border-w": ["border-w-x", "border-w-y", "border-w-s", "border-w-e", "border-w-t", "border-w-r", "border-w-b", "border-w-l"],
      "border-w-x": ["border-w-r", "border-w-l"],
      "border-w-y": ["border-w-t", "border-w-b"],
      "border-color": ["border-color-x", "border-color-y", "border-color-s", "border-color-e", "border-color-t", "border-color-r", "border-color-b", "border-color-l"],
      "border-color-x": ["border-color-r", "border-color-l"],
      "border-color-y": ["border-color-t", "border-color-b"],
      translate: ["translate-x", "translate-y", "translate-none"],
      "translate-none": ["translate", "translate-x", "translate-y", "translate-z"],
      "scroll-m": ["scroll-mx", "scroll-my", "scroll-ms", "scroll-me", "scroll-mt", "scroll-mr", "scroll-mb", "scroll-ml"],
      "scroll-mx": ["scroll-mr", "scroll-ml"],
      "scroll-my": ["scroll-mt", "scroll-mb"],
      "scroll-p": ["scroll-px", "scroll-py", "scroll-ps", "scroll-pe", "scroll-pt", "scroll-pr", "scroll-pb", "scroll-pl"],
      "scroll-px": ["scroll-pr", "scroll-pl"],
      "scroll-py": ["scroll-pt", "scroll-pb"],
      touch: ["touch-x", "touch-y", "touch-pz"],
      "touch-x": ["touch"],
      "touch-y": ["touch"],
      "touch-pz": ["touch"]
    },
    conflictingClassGroupModifiers: {
      "font-size": ["leading"]
    },
    orderSensitiveModifiers: ["*", "**", "after", "backdrop", "before", "details-content", "file", "first-letter", "first-line", "marker", "placeholder", "selection"]
  };
}, q0 = /* @__PURE__ */ N0(Z0);
function B(...e) {
  return q0(gd(e));
}
const G0 = Ua(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/20 disabled:pointer-events-none disabled:opacity-50 dark:focus-visible:ring-neutral-50/20",
  {
    variants: {
      variant: {
        default: "bg-neutral-900 text-neutral-50 hover:bg-neutral-900/90 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-50/90",
        secondary: "bg-neutral-100 text-neutral-900 hover:bg-neutral-100/80 dark:bg-neutral-800 dark:text-neutral-50 dark:hover:bg-neutral-800/80",
        outline: "border border-neutral-200 bg-transparent text-neutral-900 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-50 dark:hover:bg-neutral-800",
        ghost: "bg-transparent text-neutral-900 hover:bg-neutral-100 dark:text-neutral-50 dark:hover:bg-neutral-800",
        destructive: "bg-red-600 text-neutral-50 hover:bg-red-600/90 dark:bg-red-500 dark:hover:bg-red-500/90",
        link: "bg-transparent text-neutral-900 underline-offset-4 hover:underline dark:text-neutral-50"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-6",
        icon: "h-10 w-10"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
), se = m.forwardRef(
  ({ className: e, variant: t, size: n, asChild: r, ...o }, a) => /* @__PURE__ */ s(
    r ? e0 : "button",
    {
      className: B(G0({ variant: t, size: n }), e),
      ref: a,
      ...o
    }
  )
);
se.displayName = "Button";
const Y0 = Ua(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-neutral-900 text-neutral-50 dark:bg-neutral-50 dark:text-neutral-900",
        secondary: "border-transparent bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-50",
        outline: "border-neutral-200 text-neutral-900 dark:border-neutral-800 dark:text-neutral-50"
      }
    },
    defaultVariants: {
      variant: "secondary"
    }
  }
);
function Tn({ className: e, variant: t, ...n }) {
  return /* @__PURE__ */ s("div", { className: B(Y0({ variant: t }), e), ...n });
}
const Lt = m.forwardRef(
  ({ className: e, ...t }, n) => /* @__PURE__ */ s(
    "div",
    {
      ref: n,
      className: B(
        "rounded-xl border border-neutral-200 bg-white text-neutral-950 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50",
        e
      ),
      ...t
    }
  )
);
Lt.displayName = "Card";
const Rr = m.forwardRef(
  ({ className: e, ...t }, n) => /* @__PURE__ */ s("div", { ref: n, className: B("flex flex-col space-y-1.5 p-6", e), ...t })
);
Rr.displayName = "CardHeader";
const Or = m.forwardRef(
  ({ className: e, ...t }, n) => /* @__PURE__ */ s(
    "h3",
    {
      ref: n,
      className: B("text-lg font-semibold leading-none tracking-tight", e),
      ...t
    }
  )
);
Or.displayName = "CardTitle";
const Pd = m.forwardRef(({ className: e, ...t }, n) => /* @__PURE__ */ s(
  "p",
  {
    ref: n,
    className: B("text-sm text-neutral-500 dark:text-neutral-400", e),
    ...t
  }
));
Pd.displayName = "CardDescription";
const Qt = m.forwardRef(
  ({ className: e, ...t }, n) => /* @__PURE__ */ s("div", { ref: n, className: B("p-6 pt-0", e), ...t })
);
Qt.displayName = "CardContent";
const Id = m.forwardRef(
  ({ className: e, ...t }, n) => /* @__PURE__ */ s("div", { ref: n, className: B("flex items-center p-6 pt-0", e), ...t })
);
Id.displayName = "CardFooter";
const Ze = m.forwardRef(({ className: e, ...t }, n) => /* @__PURE__ */ s(
  "input",
  {
    ref: n,
    className: B(
      "flex h-10 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50 dark:placeholder:text-neutral-400 dark:focus-visible:ring-neutral-50/20",
      e
    ),
    ...t
  }
));
Ze.displayName = "Input";
const lt = m.forwardRef(
  ({ className: e, ...t }, n) => /* @__PURE__ */ s(
    "label",
    {
      ref: n,
      className: B("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", e),
      ...t
    }
  )
);
lt.displayName = "Label";
var Q0 = [
  "a",
  "button",
  "div",
  "form",
  "h2",
  "h3",
  "img",
  "input",
  "label",
  "li",
  "nav",
  "ol",
  "p",
  "select",
  "span",
  "svg",
  "ul"
], K0 = Q0.reduce((e, t) => {
  const n = /* @__PURE__ */ md(`Primitive.${t}`), r = m.forwardRef((o, a) => {
    const { asChild: i, ...c } = o, l = i ? n : t;
    return typeof window < "u" && (window[Symbol.for("radix-ui")] = !0), /* @__PURE__ */ s(l, { ...c, ref: a });
  });
  return r.displayName = `Primitive.${t}`, { ...e, [t]: r };
}, {}), J0 = "Separator", Nc = "horizontal", X0 = ["horizontal", "vertical"], Td = m.forwardRef((e, t) => {
  const { decorative: n, orientation: r = Nc, ...o } = e, a = ew(r) ? r : Nc, c = n ? { role: "none" } : { "aria-orientation": a === "vertical" ? a : void 0, role: "separator" };
  return /* @__PURE__ */ s(
    K0.div,
    {
      "data-orientation": a,
      ...c,
      ...o,
      ref: t
    }
  );
});
Td.displayName = J0;
function ew(e) {
  return X0.includes(e);
}
var Rd = Td;
const St = m.forwardRef(({ className: e, orientation: t = "horizontal", decorative: n = !0, ...r }, o) => /* @__PURE__ */ s(
  Rd,
  {
    ref: o,
    decorative: n,
    orientation: t,
    className: B(
      "shrink-0 bg-neutral-200 dark:bg-neutral-800",
      t === "horizontal" ? "h-px w-full" : "h-full w-px",
      e
    ),
    ...r
  }
));
St.displayName = Rd.displayName;
function Fe({ className: e, ...t }) {
  return /* @__PURE__ */ s(
    "div",
    {
      className: B("animate-pulse rounded-md bg-neutral-100 dark:bg-neutral-800", e),
      ...t
    }
  );
}
function Ec(e, [t, n]) {
  return Math.min(n, Math.max(t, e));
}
function xe(e, t, { checkForDefaultPrevented: n = !0 } = {}) {
  return function(o) {
    if (e?.(o), n === !1 || !o.defaultPrevented)
      return t?.(o);
  };
}
function tw(e, t) {
  const n = m.createContext(t), r = (a) => {
    const { children: i, ...c } = a, l = m.useMemo(() => c, Object.values(c));
    return /* @__PURE__ */ s(n.Provider, { value: l, children: i });
  };
  r.displayName = e + "Provider";
  function o(a) {
    const i = m.useContext(n);
    if (i) return i;
    if (t !== void 0) return t;
    throw new Error(`\`${a}\` must be used within \`${e}\``);
  }
  return [r, o];
}
function _n(e, t = []) {
  let n = [];
  function r(a, i) {
    const c = m.createContext(i), l = n.length;
    n = [...n, i];
    const d = (u) => {
      const { scope: h, children: g, ...b } = u, v = h?.[e]?.[l] || c, y = m.useMemo(() => b, Object.values(b));
      return /* @__PURE__ */ s(v.Provider, { value: y, children: g });
    };
    d.displayName = a + "Provider";
    function f(u, h) {
      const g = h?.[e]?.[l] || c, b = m.useContext(g);
      if (b) return b;
      if (i !== void 0) return i;
      throw new Error(`\`${u}\` must be used within \`${a}\``);
    }
    return [d, f];
  }
  const o = () => {
    const a = n.map((i) => m.createContext(i));
    return function(c) {
      const l = c?.[e] || a;
      return m.useMemo(
        () => ({ [`__scope${e}`]: { ...c, [e]: l } }),
        [c, l]
      );
    };
  };
  return o.scopeName = e, [r, nw(o, ...t)];
}
function nw(...e) {
  const t = e[0];
  if (e.length === 1) return t;
  const n = () => {
    const r = e.map((o) => ({
      useScope: o(),
      scopeName: o.scopeName
    }));
    return function(a) {
      const i = r.reduce((c, { useScope: l, scopeName: d }) => {
        const u = l(a)[`__scope${d}`];
        return { ...c, ...u };
      }, {});
      return m.useMemo(() => ({ [`__scope${t.scopeName}`]: i }), [i]);
    };
  };
  return n.scopeName = t.scopeName, n;
}
// @__NO_SIDE_EFFECTS__
function Ac(e) {
  const t = /* @__PURE__ */ rw(e), n = m.forwardRef((r, o) => {
    const { children: a, ...i } = r, c = m.Children.toArray(a), l = c.find(sw);
    if (l) {
      const d = l.props.children, f = c.map((u) => u === l ? m.Children.count(d) > 1 ? m.Children.only(null) : m.isValidElement(d) ? d.props.children : null : u);
      return /* @__PURE__ */ s(t, { ...i, ref: o, children: m.isValidElement(d) ? m.cloneElement(d, void 0, f) : null });
    }
    return /* @__PURE__ */ s(t, { ...i, ref: o, children: a });
  });
  return n.displayName = `${e}.Slot`, n;
}
// @__NO_SIDE_EFFECTS__
function rw(e) {
  const t = m.forwardRef((n, r) => {
    const { children: o, ...a } = n;
    if (m.isValidElement(o)) {
      const i = iw(o), c = aw(a, o.props);
      return o.type !== m.Fragment && (c.ref = r ? lr(r, i) : i), m.cloneElement(o, c);
    }
    return m.Children.count(o) > 1 ? m.Children.only(null) : null;
  });
  return t.displayName = `${e}.SlotClone`, t;
}
var ow = Symbol("radix.slottable");
function sw(e) {
  return m.isValidElement(e) && typeof e.type == "function" && "__radixId" in e.type && e.type.__radixId === ow;
}
function aw(e, t) {
  const n = { ...t };
  for (const r in t) {
    const o = e[r], a = t[r];
    /^on[A-Z]/.test(r) ? o && a ? n[r] = (...c) => {
      const l = a(...c);
      return o(...c), l;
    } : o && (n[r] = o) : r === "style" ? n[r] = { ...o, ...a } : r === "className" && (n[r] = [o, a].filter(Boolean).join(" "));
  }
  return { ...e, ...n };
}
function iw(e) {
  let t = Object.getOwnPropertyDescriptor(e.props, "ref")?.get, n = t && "isReactWarning" in t && t.isReactWarning;
  return n ? e.ref : (t = Object.getOwnPropertyDescriptor(e, "ref")?.get, n = t && "isReactWarning" in t && t.isReactWarning, n ? e.props.ref : e.props.ref || e.ref);
}
function Wa(e) {
  const t = e + "CollectionProvider", [n, r] = _n(t), [o, a] = n(
    t,
    { collectionRef: { current: null }, itemMap: /* @__PURE__ */ new Map() }
  ), i = (v) => {
    const { scope: y, children: w } = v, k = L.useRef(null), _ = L.useRef(/* @__PURE__ */ new Map()).current;
    return /* @__PURE__ */ s(o, { scope: y, itemMap: _, collectionRef: k, children: w });
  };
  i.displayName = t;
  const c = e + "CollectionSlot", l = /* @__PURE__ */ Ac(c), d = L.forwardRef(
    (v, y) => {
      const { scope: w, children: k } = v, _ = a(c, w), x = Re(y, _.collectionRef);
      return /* @__PURE__ */ s(l, { ref: x, children: k });
    }
  );
  d.displayName = c;
  const f = e + "CollectionItemSlot", u = "data-radix-collection-item", h = /* @__PURE__ */ Ac(f), g = L.forwardRef(
    (v, y) => {
      const { scope: w, children: k, ..._ } = v, x = L.useRef(null), S = Re(y, x), I = a(f, w);
      return L.useEffect(() => (I.itemMap.set(x, { ref: x, ..._ }), () => void I.itemMap.delete(x))), /* @__PURE__ */ s(h, { [u]: "", ref: S, children: k });
    }
  );
  g.displayName = f;
  function b(v) {
    const y = a(e + "CollectionConsumer", v);
    return L.useCallback(() => {
      const k = y.collectionRef.current;
      if (!k) return [];
      const _ = Array.from(k.querySelectorAll(`[${u}]`));
      return Array.from(y.itemMap.values()).sort(
        (I, R) => _.indexOf(I.ref.current) - _.indexOf(R.ref.current)
      );
    }, [y.collectionRef, y.itemMap]);
  }
  return [
    { Provider: i, Slot: d, ItemSlot: g },
    b,
    r
  ];
}
var cw = m.createContext(void 0);
function Yo(e) {
  const t = m.useContext(cw);
  return e || t || "ltr";
}
// @__NO_SIDE_EFFECTS__
function lw(e) {
  const t = /* @__PURE__ */ dw(e), n = m.forwardRef((r, o) => {
    const { children: a, ...i } = r, c = m.Children.toArray(a), l = c.find(fw);
    if (l) {
      const d = l.props.children, f = c.map((u) => u === l ? m.Children.count(d) > 1 ? m.Children.only(null) : m.isValidElement(d) ? d.props.children : null : u);
      return /* @__PURE__ */ s(t, { ...i, ref: o, children: m.isValidElement(d) ? m.cloneElement(d, void 0, f) : null });
    }
    return /* @__PURE__ */ s(t, { ...i, ref: o, children: a });
  });
  return n.displayName = `${e}.Slot`, n;
}
// @__NO_SIDE_EFFECTS__
function dw(e) {
  const t = m.forwardRef((n, r) => {
    const { children: o, ...a } = n;
    if (m.isValidElement(o)) {
      const i = mw(o), c = pw(a, o.props);
      return o.type !== m.Fragment && (c.ref = r ? lr(r, i) : i), m.cloneElement(o, c);
    }
    return m.Children.count(o) > 1 ? m.Children.only(null) : null;
  });
  return t.displayName = `${e}.SlotClone`, t;
}
var uw = Symbol("radix.slottable");
function fw(e) {
  return m.isValidElement(e) && typeof e.type == "function" && "__radixId" in e.type && e.type.__radixId === uw;
}
function pw(e, t) {
  const n = { ...t };
  for (const r in t) {
    const o = e[r], a = t[r];
    /^on[A-Z]/.test(r) ? o && a ? n[r] = (...c) => {
      const l = a(...c);
      return o(...c), l;
    } : o && (n[r] = o) : r === "style" ? n[r] = { ...o, ...a } : r === "className" && (n[r] = [o, a].filter(Boolean).join(" "));
  }
  return { ...e, ...n };
}
function mw(e) {
  let t = Object.getOwnPropertyDescriptor(e.props, "ref")?.get, n = t && "isReactWarning" in t && t.isReactWarning;
  return n ? e.ref : (t = Object.getOwnPropertyDescriptor(e, "ref")?.get, n = t && "isReactWarning" in t && t.isReactWarning, n ? e.props.ref : e.props.ref || e.ref);
}
var hw = [
  "a",
  "button",
  "div",
  "form",
  "h2",
  "h3",
  "img",
  "input",
  "label",
  "li",
  "nav",
  "ol",
  "p",
  "select",
  "span",
  "svg",
  "ul"
], be = hw.reduce((e, t) => {
  const n = /* @__PURE__ */ lw(`Primitive.${t}`), r = m.forwardRef((o, a) => {
    const { asChild: i, ...c } = o, l = i ? n : t;
    return typeof window < "u" && (window[Symbol.for("radix-ui")] = !0), /* @__PURE__ */ s(l, { ...c, ref: a });
  });
  return r.displayName = `Primitive.${t}`, { ...e, [t]: r };
}, {});
function gw(e, t) {
  e && zo.flushSync(() => e.dispatchEvent(t));
}
function hn(e) {
  const t = m.useRef(e);
  return m.useEffect(() => {
    t.current = e;
  }), m.useMemo(() => (...n) => t.current?.(...n), []);
}
function yw(e, t = globalThis?.document) {
  const n = hn(e);
  m.useEffect(() => {
    const r = (o) => {
      o.key === "Escape" && n(o);
    };
    return t.addEventListener("keydown", r, { capture: !0 }), () => t.removeEventListener("keydown", r, { capture: !0 });
  }, [n, t]);
}
var vw = "DismissableLayer", ia = "dismissableLayer.update", bw = "dismissableLayer.pointerDownOutside", ww = "dismissableLayer.focusOutside", Pc, Od = m.createContext({
  layers: /* @__PURE__ */ new Set(),
  layersWithOutsidePointerEventsDisabled: /* @__PURE__ */ new Set(),
  branches: /* @__PURE__ */ new Set()
}), Ha = m.forwardRef(
  (e, t) => {
    const {
      disableOutsidePointerEvents: n = !1,
      onEscapeKeyDown: r,
      onPointerDownOutside: o,
      onFocusOutside: a,
      onInteractOutside: i,
      onDismiss: c,
      ...l
    } = e, d = m.useContext(Od), [f, u] = m.useState(null), h = f?.ownerDocument ?? globalThis?.document, [, g] = m.useState({}), b = Re(t, (R) => u(R)), v = Array.from(d.layers), [y] = [...d.layersWithOutsidePointerEventsDisabled].slice(-1), w = v.indexOf(y), k = f ? v.indexOf(f) : -1, _ = d.layersWithOutsidePointerEventsDisabled.size > 0, x = k >= w, S = kw((R) => {
      const E = R.target, P = [...d.branches].some((O) => O.contains(E));
      !x || P || (o?.(R), i?.(R), R.defaultPrevented || c?.());
    }, h), I = Sw((R) => {
      const E = R.target;
      [...d.branches].some((O) => O.contains(E)) || (a?.(R), i?.(R), R.defaultPrevented || c?.());
    }, h);
    return yw((R) => {
      k === d.layers.size - 1 && (r?.(R), !R.defaultPrevented && c && (R.preventDefault(), c()));
    }, h), m.useEffect(() => {
      if (f)
        return n && (d.layersWithOutsidePointerEventsDisabled.size === 0 && (Pc = h.body.style.pointerEvents, h.body.style.pointerEvents = "none"), d.layersWithOutsidePointerEventsDisabled.add(f)), d.layers.add(f), Ic(), () => {
          n && d.layersWithOutsidePointerEventsDisabled.size === 1 && (h.body.style.pointerEvents = Pc);
        };
    }, [f, h, n, d]), m.useEffect(() => () => {
      f && (d.layers.delete(f), d.layersWithOutsidePointerEventsDisabled.delete(f), Ic());
    }, [f, d]), m.useEffect(() => {
      const R = () => g({});
      return document.addEventListener(ia, R), () => document.removeEventListener(ia, R);
    }, []), /* @__PURE__ */ s(
      be.div,
      {
        ...l,
        ref: b,
        style: {
          pointerEvents: _ ? x ? "auto" : "none" : void 0,
          ...e.style
        },
        onFocusCapture: xe(e.onFocusCapture, I.onFocusCapture),
        onBlurCapture: xe(e.onBlurCapture, I.onBlurCapture),
        onPointerDownCapture: xe(
          e.onPointerDownCapture,
          S.onPointerDownCapture
        )
      }
    );
  }
);
Ha.displayName = vw;
var xw = "DismissableLayerBranch", _w = m.forwardRef((e, t) => {
  const n = m.useContext(Od), r = m.useRef(null), o = Re(t, r);
  return m.useEffect(() => {
    const a = r.current;
    if (a)
      return n.branches.add(a), () => {
        n.branches.delete(a);
      };
  }, [n.branches]), /* @__PURE__ */ s(be.div, { ...e, ref: o });
});
_w.displayName = xw;
function kw(e, t = globalThis?.document) {
  const n = hn(e), r = m.useRef(!1), o = m.useRef(() => {
  });
  return m.useEffect(() => {
    const a = (c) => {
      if (c.target && !r.current) {
        let l = function() {
          Md(
            bw,
            n,
            d,
            { discrete: !0 }
          );
        };
        const d = { originalEvent: c };
        c.pointerType === "touch" ? (t.removeEventListener("click", o.current), o.current = l, t.addEventListener("click", o.current, { once: !0 })) : l();
      } else
        t.removeEventListener("click", o.current);
      r.current = !1;
    }, i = window.setTimeout(() => {
      t.addEventListener("pointerdown", a);
    }, 0);
    return () => {
      window.clearTimeout(i), t.removeEventListener("pointerdown", a), t.removeEventListener("click", o.current);
    };
  }, [t, n]), {
    // ensures we check React component tree (not just DOM tree)
    onPointerDownCapture: () => r.current = !0
  };
}
function Sw(e, t = globalThis?.document) {
  const n = hn(e), r = m.useRef(!1);
  return m.useEffect(() => {
    const o = (a) => {
      a.target && !r.current && Md(ww, n, { originalEvent: a }, {
        discrete: !1
      });
    };
    return t.addEventListener("focusin", o), () => t.removeEventListener("focusin", o);
  }, [t, n]), {
    onFocusCapture: () => r.current = !0,
    onBlurCapture: () => r.current = !1
  };
}
function Ic() {
  const e = new CustomEvent(ia);
  document.dispatchEvent(e);
}
function Md(e, t, n, { discrete: r }) {
  const o = n.originalEvent.target, a = new CustomEvent(e, { bubbles: !1, cancelable: !0, detail: n });
  t && o.addEventListener(e, t, { once: !0 }), r ? gw(o, a) : o.dispatchEvent(a);
}
var Os = 0;
function Ld() {
  m.useEffect(() => {
    const e = document.querySelectorAll("[data-radix-focus-guard]");
    return document.body.insertAdjacentElement("afterbegin", e[0] ?? Tc()), document.body.insertAdjacentElement("beforeend", e[1] ?? Tc()), Os++, () => {
      Os === 1 && document.querySelectorAll("[data-radix-focus-guard]").forEach((t) => t.remove()), Os--;
    };
  }, []);
}
function Tc() {
  const e = document.createElement("span");
  return e.setAttribute("data-radix-focus-guard", ""), e.tabIndex = 0, e.style.outline = "none", e.style.opacity = "0", e.style.position = "fixed", e.style.pointerEvents = "none", e;
}
var Ms = "focusScope.autoFocusOnMount", Ls = "focusScope.autoFocusOnUnmount", Rc = { bubbles: !1, cancelable: !0 }, Cw = "FocusScope", Za = m.forwardRef((e, t) => {
  const {
    loop: n = !1,
    trapped: r = !1,
    onMountAutoFocus: o,
    onUnmountAutoFocus: a,
    ...i
  } = e, [c, l] = m.useState(null), d = hn(o), f = hn(a), u = m.useRef(null), h = Re(t, (v) => l(v)), g = m.useRef({
    paused: !1,
    pause() {
      this.paused = !0;
    },
    resume() {
      this.paused = !1;
    }
  }).current;
  m.useEffect(() => {
    if (r) {
      let v = function(_) {
        if (g.paused || !c) return;
        const x = _.target;
        c.contains(x) ? u.current = x : pn(u.current, { select: !0 });
      }, y = function(_) {
        if (g.paused || !c) return;
        const x = _.relatedTarget;
        x !== null && (c.contains(x) || pn(u.current, { select: !0 }));
      }, w = function(_) {
        if (document.activeElement === document.body)
          for (const S of _)
            S.removedNodes.length > 0 && pn(c);
      };
      document.addEventListener("focusin", v), document.addEventListener("focusout", y);
      const k = new MutationObserver(w);
      return c && k.observe(c, { childList: !0, subtree: !0 }), () => {
        document.removeEventListener("focusin", v), document.removeEventListener("focusout", y), k.disconnect();
      };
    }
  }, [r, c, g.paused]), m.useEffect(() => {
    if (c) {
      Mc.add(g);
      const v = document.activeElement;
      if (!c.contains(v)) {
        const w = new CustomEvent(Ms, Rc);
        c.addEventListener(Ms, d), c.dispatchEvent(w), w.defaultPrevented || (Nw(Tw(Dd(c)), { select: !0 }), document.activeElement === v && pn(c));
      }
      return () => {
        c.removeEventListener(Ms, d), setTimeout(() => {
          const w = new CustomEvent(Ls, Rc);
          c.addEventListener(Ls, f), c.dispatchEvent(w), w.defaultPrevented || pn(v ?? document.body, { select: !0 }), c.removeEventListener(Ls, f), Mc.remove(g);
        }, 0);
      };
    }
  }, [c, d, f, g]);
  const b = m.useCallback(
    (v) => {
      if (!n && !r || g.paused) return;
      const y = v.key === "Tab" && !v.altKey && !v.ctrlKey && !v.metaKey, w = document.activeElement;
      if (y && w) {
        const k = v.currentTarget, [_, x] = Ew(k);
        _ && x ? !v.shiftKey && w === x ? (v.preventDefault(), n && pn(_, { select: !0 })) : v.shiftKey && w === _ && (v.preventDefault(), n && pn(x, { select: !0 })) : w === k && v.preventDefault();
      }
    },
    [n, r, g.paused]
  );
  return /* @__PURE__ */ s(be.div, { tabIndex: -1, ...i, ref: h, onKeyDown: b });
});
Za.displayName = Cw;
function Nw(e, { select: t = !1 } = {}) {
  const n = document.activeElement;
  for (const r of e)
    if (pn(r, { select: t }), document.activeElement !== n) return;
}
function Ew(e) {
  const t = Dd(e), n = Oc(t, e), r = Oc(t.reverse(), e);
  return [n, r];
}
function Dd(e) {
  const t = [], n = document.createTreeWalker(e, NodeFilter.SHOW_ELEMENT, {
    acceptNode: (r) => {
      const o = r.tagName === "INPUT" && r.type === "hidden";
      return r.disabled || r.hidden || o ? NodeFilter.FILTER_SKIP : r.tabIndex >= 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    }
  });
  for (; n.nextNode(); ) t.push(n.currentNode);
  return t;
}
function Oc(e, t) {
  for (const n of e)
    if (!Aw(n, { upTo: t })) return n;
}
function Aw(e, { upTo: t }) {
  if (getComputedStyle(e).visibility === "hidden") return !0;
  for (; e; ) {
    if (t !== void 0 && e === t) return !1;
    if (getComputedStyle(e).display === "none") return !0;
    e = e.parentElement;
  }
  return !1;
}
function Pw(e) {
  return e instanceof HTMLInputElement && "select" in e;
}
function pn(e, { select: t = !1 } = {}) {
  if (e && e.focus) {
    const n = document.activeElement;
    e.focus({ preventScroll: !0 }), e !== n && Pw(e) && t && e.select();
  }
}
var Mc = Iw();
function Iw() {
  let e = [];
  return {
    add(t) {
      const n = e[0];
      t !== n && n?.pause(), e = Lc(e, t), e.unshift(t);
    },
    remove(t) {
      e = Lc(e, t), e[0]?.resume();
    }
  };
}
function Lc(e, t) {
  const n = [...e], r = n.indexOf(t);
  return r !== -1 && n.splice(r, 1), n;
}
function Tw(e) {
  return e.filter((t) => t.tagName !== "A");
}
var Xe = globalThis?.document ? m.useLayoutEffect : () => {
}, Rw = m[" useId ".trim().toString()] || (() => {
}), Ow = 0;
function qt(e) {
  const [t, n] = m.useState(Rw());
  return Xe(() => {
    n((r) => r ?? String(Ow++));
  }, [e]), t ? `radix-${t}` : "";
}
const Mw = ["top", "right", "bottom", "left"], gn = Math.min, wt = Math.max, Ao = Math.round, no = Math.floor, Gt = (e) => ({
  x: e,
  y: e
}), Lw = {
  left: "right",
  right: "left",
  bottom: "top",
  top: "bottom"
}, Dw = {
  start: "end",
  end: "start"
};
function ca(e, t, n) {
  return wt(e, gn(t, n));
}
function an(e, t) {
  return typeof e == "function" ? e(t) : e;
}
function cn(e) {
  return e.split("-")[0];
}
function fr(e) {
  return e.split("-")[1];
}
function qa(e) {
  return e === "x" ? "y" : "x";
}
function Ga(e) {
  return e === "y" ? "height" : "width";
}
const $w = /* @__PURE__ */ new Set(["top", "bottom"]);
function Zt(e) {
  return $w.has(cn(e)) ? "y" : "x";
}
function Ya(e) {
  return qa(Zt(e));
}
function zw(e, t, n) {
  n === void 0 && (n = !1);
  const r = fr(e), o = Ya(e), a = Ga(o);
  let i = o === "x" ? r === (n ? "end" : "start") ? "right" : "left" : r === "start" ? "bottom" : "top";
  return t.reference[a] > t.floating[a] && (i = Po(i)), [i, Po(i)];
}
function Fw(e) {
  const t = Po(e);
  return [la(e), t, la(t)];
}
function la(e) {
  return e.replace(/start|end/g, (t) => Dw[t]);
}
const Dc = ["left", "right"], $c = ["right", "left"], jw = ["top", "bottom"], Bw = ["bottom", "top"];
function Uw(e, t, n) {
  switch (e) {
    case "top":
    case "bottom":
      return n ? t ? $c : Dc : t ? Dc : $c;
    case "left":
    case "right":
      return t ? jw : Bw;
    default:
      return [];
  }
}
function Vw(e, t, n, r) {
  const o = fr(e);
  let a = Uw(cn(e), n === "start", r);
  return o && (a = a.map((i) => i + "-" + o), t && (a = a.concat(a.map(la)))), a;
}
function Po(e) {
  return e.replace(/left|right|bottom|top/g, (t) => Lw[t]);
}
function Ww(e) {
  return {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    ...e
  };
}
function $d(e) {
  return typeof e != "number" ? Ww(e) : {
    top: e,
    right: e,
    bottom: e,
    left: e
  };
}
function Io(e) {
  const {
    x: t,
    y: n,
    width: r,
    height: o
  } = e;
  return {
    width: r,
    height: o,
    top: n,
    left: t,
    right: t + r,
    bottom: n + o,
    x: t,
    y: n
  };
}
function zc(e, t, n) {
  let {
    reference: r,
    floating: o
  } = e;
  const a = Zt(t), i = Ya(t), c = Ga(i), l = cn(t), d = a === "y", f = r.x + r.width / 2 - o.width / 2, u = r.y + r.height / 2 - o.height / 2, h = r[c] / 2 - o[c] / 2;
  let g;
  switch (l) {
    case "top":
      g = {
        x: f,
        y: r.y - o.height
      };
      break;
    case "bottom":
      g = {
        x: f,
        y: r.y + r.height
      };
      break;
    case "right":
      g = {
        x: r.x + r.width,
        y: u
      };
      break;
    case "left":
      g = {
        x: r.x - o.width,
        y: u
      };
      break;
    default:
      g = {
        x: r.x,
        y: r.y
      };
  }
  switch (fr(t)) {
    case "start":
      g[i] -= h * (n && d ? -1 : 1);
      break;
    case "end":
      g[i] += h * (n && d ? -1 : 1);
      break;
  }
  return g;
}
const Hw = async (e, t, n) => {
  const {
    placement: r = "bottom",
    strategy: o = "absolute",
    middleware: a = [],
    platform: i
  } = n, c = a.filter(Boolean), l = await (i.isRTL == null ? void 0 : i.isRTL(t));
  let d = await i.getElementRects({
    reference: e,
    floating: t,
    strategy: o
  }), {
    x: f,
    y: u
  } = zc(d, r, l), h = r, g = {}, b = 0;
  for (let v = 0; v < c.length; v++) {
    const {
      name: y,
      fn: w
    } = c[v], {
      x: k,
      y: _,
      data: x,
      reset: S
    } = await w({
      x: f,
      y: u,
      initialPlacement: r,
      placement: h,
      strategy: o,
      middlewareData: g,
      rects: d,
      platform: i,
      elements: {
        reference: e,
        floating: t
      }
    });
    f = k ?? f, u = _ ?? u, g = {
      ...g,
      [y]: {
        ...g[y],
        ...x
      }
    }, S && b <= 50 && (b++, typeof S == "object" && (S.placement && (h = S.placement), S.rects && (d = S.rects === !0 ? await i.getElementRects({
      reference: e,
      floating: t,
      strategy: o
    }) : S.rects), {
      x: f,
      y: u
    } = zc(d, h, l)), v = -1);
  }
  return {
    x: f,
    y: u,
    placement: h,
    strategy: o,
    middlewareData: g
  };
};
async function Mr(e, t) {
  var n;
  t === void 0 && (t = {});
  const {
    x: r,
    y: o,
    platform: a,
    rects: i,
    elements: c,
    strategy: l
  } = e, {
    boundary: d = "clippingAncestors",
    rootBoundary: f = "viewport",
    elementContext: u = "floating",
    altBoundary: h = !1,
    padding: g = 0
  } = an(t, e), b = $d(g), y = c[h ? u === "floating" ? "reference" : "floating" : u], w = Io(await a.getClippingRect({
    element: (n = await (a.isElement == null ? void 0 : a.isElement(y))) == null || n ? y : y.contextElement || await (a.getDocumentElement == null ? void 0 : a.getDocumentElement(c.floating)),
    boundary: d,
    rootBoundary: f,
    strategy: l
  })), k = u === "floating" ? {
    x: r,
    y: o,
    width: i.floating.width,
    height: i.floating.height
  } : i.reference, _ = await (a.getOffsetParent == null ? void 0 : a.getOffsetParent(c.floating)), x = await (a.isElement == null ? void 0 : a.isElement(_)) ? await (a.getScale == null ? void 0 : a.getScale(_)) || {
    x: 1,
    y: 1
  } : {
    x: 1,
    y: 1
  }, S = Io(a.convertOffsetParentRelativeRectToViewportRelativeRect ? await a.convertOffsetParentRelativeRectToViewportRelativeRect({
    elements: c,
    rect: k,
    offsetParent: _,
    strategy: l
  }) : k);
  return {
    top: (w.top - S.top + b.top) / x.y,
    bottom: (S.bottom - w.bottom + b.bottom) / x.y,
    left: (w.left - S.left + b.left) / x.x,
    right: (S.right - w.right + b.right) / x.x
  };
}
const Zw = (e) => ({
  name: "arrow",
  options: e,
  async fn(t) {
    const {
      x: n,
      y: r,
      placement: o,
      rects: a,
      platform: i,
      elements: c,
      middlewareData: l
    } = t, {
      element: d,
      padding: f = 0
    } = an(e, t) || {};
    if (d == null)
      return {};
    const u = $d(f), h = {
      x: n,
      y: r
    }, g = Ya(o), b = Ga(g), v = await i.getDimensions(d), y = g === "y", w = y ? "top" : "left", k = y ? "bottom" : "right", _ = y ? "clientHeight" : "clientWidth", x = a.reference[b] + a.reference[g] - h[g] - a.floating[b], S = h[g] - a.reference[g], I = await (i.getOffsetParent == null ? void 0 : i.getOffsetParent(d));
    let R = I ? I[_] : 0;
    (!R || !await (i.isElement == null ? void 0 : i.isElement(I))) && (R = c.floating[_] || a.floating[b]);
    const E = x / 2 - S / 2, P = R / 2 - v[b] / 2 - 1, O = gn(u[w], P), T = gn(u[k], P), D = O, j = R - v[b] - T, z = R / 2 - v[b] / 2 + E, W = ca(D, z, j), $ = !l.arrow && fr(o) != null && z !== W && a.reference[b] / 2 - (z < D ? O : T) - v[b] / 2 < 0, C = $ ? z < D ? z - D : z - j : 0;
    return {
      [g]: h[g] + C,
      data: {
        [g]: W,
        centerOffset: z - W - C,
        ...$ && {
          alignmentOffset: C
        }
      },
      reset: $
    };
  }
}), qw = function(e) {
  return e === void 0 && (e = {}), {
    name: "flip",
    options: e,
    async fn(t) {
      var n, r;
      const {
        placement: o,
        middlewareData: a,
        rects: i,
        initialPlacement: c,
        platform: l,
        elements: d
      } = t, {
        mainAxis: f = !0,
        crossAxis: u = !0,
        fallbackPlacements: h,
        fallbackStrategy: g = "bestFit",
        fallbackAxisSideDirection: b = "none",
        flipAlignment: v = !0,
        ...y
      } = an(e, t);
      if ((n = a.arrow) != null && n.alignmentOffset)
        return {};
      const w = cn(o), k = Zt(c), _ = cn(c) === c, x = await (l.isRTL == null ? void 0 : l.isRTL(d.floating)), S = h || (_ || !v ? [Po(c)] : Fw(c)), I = b !== "none";
      !h && I && S.push(...Vw(c, v, b, x));
      const R = [c, ...S], E = await Mr(t, y), P = [];
      let O = ((r = a.flip) == null ? void 0 : r.overflows) || [];
      if (f && P.push(E[w]), u) {
        const z = zw(o, i, x);
        P.push(E[z[0]], E[z[1]]);
      }
      if (O = [...O, {
        placement: o,
        overflows: P
      }], !P.every((z) => z <= 0)) {
        var T, D;
        const z = (((T = a.flip) == null ? void 0 : T.index) || 0) + 1, W = R[z];
        if (W && (!(u === "alignment" ? k !== Zt(W) : !1) || // We leave the current main axis only if every placement on that axis
        // overflows the main axis.
        O.every((N) => Zt(N.placement) === k ? N.overflows[0] > 0 : !0)))
          return {
            data: {
              index: z,
              overflows: O
            },
            reset: {
              placement: W
            }
          };
        let $ = (D = O.filter((C) => C.overflows[0] <= 0).sort((C, N) => C.overflows[1] - N.overflows[1])[0]) == null ? void 0 : D.placement;
        if (!$)
          switch (g) {
            case "bestFit": {
              var j;
              const C = (j = O.filter((N) => {
                if (I) {
                  const H = Zt(N.placement);
                  return H === k || // Create a bias to the `y` side axis due to horizontal
                  // reading directions favoring greater width.
                  H === "y";
                }
                return !0;
              }).map((N) => [N.placement, N.overflows.filter((H) => H > 0).reduce((H, G) => H + G, 0)]).sort((N, H) => N[1] - H[1])[0]) == null ? void 0 : j[0];
              C && ($ = C);
              break;
            }
            case "initialPlacement":
              $ = c;
              break;
          }
        if (o !== $)
          return {
            reset: {
              placement: $
            }
          };
      }
      return {};
    }
  };
};
function Fc(e, t) {
  return {
    top: e.top - t.height,
    right: e.right - t.width,
    bottom: e.bottom - t.height,
    left: e.left - t.width
  };
}
function jc(e) {
  return Mw.some((t) => e[t] >= 0);
}
const Gw = function(e) {
  return e === void 0 && (e = {}), {
    name: "hide",
    options: e,
    async fn(t) {
      const {
        rects: n
      } = t, {
        strategy: r = "referenceHidden",
        ...o
      } = an(e, t);
      switch (r) {
        case "referenceHidden": {
          const a = await Mr(t, {
            ...o,
            elementContext: "reference"
          }), i = Fc(a, n.reference);
          return {
            data: {
              referenceHiddenOffsets: i,
              referenceHidden: jc(i)
            }
          };
        }
        case "escaped": {
          const a = await Mr(t, {
            ...o,
            altBoundary: !0
          }), i = Fc(a, n.floating);
          return {
            data: {
              escapedOffsets: i,
              escaped: jc(i)
            }
          };
        }
        default:
          return {};
      }
    }
  };
}, zd = /* @__PURE__ */ new Set(["left", "top"]);
async function Yw(e, t) {
  const {
    placement: n,
    platform: r,
    elements: o
  } = e, a = await (r.isRTL == null ? void 0 : r.isRTL(o.floating)), i = cn(n), c = fr(n), l = Zt(n) === "y", d = zd.has(i) ? -1 : 1, f = a && l ? -1 : 1, u = an(t, e);
  let {
    mainAxis: h,
    crossAxis: g,
    alignmentAxis: b
  } = typeof u == "number" ? {
    mainAxis: u,
    crossAxis: 0,
    alignmentAxis: null
  } : {
    mainAxis: u.mainAxis || 0,
    crossAxis: u.crossAxis || 0,
    alignmentAxis: u.alignmentAxis
  };
  return c && typeof b == "number" && (g = c === "end" ? b * -1 : b), l ? {
    x: g * f,
    y: h * d
  } : {
    x: h * d,
    y: g * f
  };
}
const Qw = function(e) {
  return e === void 0 && (e = 0), {
    name: "offset",
    options: e,
    async fn(t) {
      var n, r;
      const {
        x: o,
        y: a,
        placement: i,
        middlewareData: c
      } = t, l = await Yw(t, e);
      return i === ((n = c.offset) == null ? void 0 : n.placement) && (r = c.arrow) != null && r.alignmentOffset ? {} : {
        x: o + l.x,
        y: a + l.y,
        data: {
          ...l,
          placement: i
        }
      };
    }
  };
}, Kw = function(e) {
  return e === void 0 && (e = {}), {
    name: "shift",
    options: e,
    async fn(t) {
      const {
        x: n,
        y: r,
        placement: o
      } = t, {
        mainAxis: a = !0,
        crossAxis: i = !1,
        limiter: c = {
          fn: (y) => {
            let {
              x: w,
              y: k
            } = y;
            return {
              x: w,
              y: k
            };
          }
        },
        ...l
      } = an(e, t), d = {
        x: n,
        y: r
      }, f = await Mr(t, l), u = Zt(cn(o)), h = qa(u);
      let g = d[h], b = d[u];
      if (a) {
        const y = h === "y" ? "top" : "left", w = h === "y" ? "bottom" : "right", k = g + f[y], _ = g - f[w];
        g = ca(k, g, _);
      }
      if (i) {
        const y = u === "y" ? "top" : "left", w = u === "y" ? "bottom" : "right", k = b + f[y], _ = b - f[w];
        b = ca(k, b, _);
      }
      const v = c.fn({
        ...t,
        [h]: g,
        [u]: b
      });
      return {
        ...v,
        data: {
          x: v.x - n,
          y: v.y - r,
          enabled: {
            [h]: a,
            [u]: i
          }
        }
      };
    }
  };
}, Jw = function(e) {
  return e === void 0 && (e = {}), {
    options: e,
    fn(t) {
      const {
        x: n,
        y: r,
        placement: o,
        rects: a,
        middlewareData: i
      } = t, {
        offset: c = 0,
        mainAxis: l = !0,
        crossAxis: d = !0
      } = an(e, t), f = {
        x: n,
        y: r
      }, u = Zt(o), h = qa(u);
      let g = f[h], b = f[u];
      const v = an(c, t), y = typeof v == "number" ? {
        mainAxis: v,
        crossAxis: 0
      } : {
        mainAxis: 0,
        crossAxis: 0,
        ...v
      };
      if (l) {
        const _ = h === "y" ? "height" : "width", x = a.reference[h] - a.floating[_] + y.mainAxis, S = a.reference[h] + a.reference[_] - y.mainAxis;
        g < x ? g = x : g > S && (g = S);
      }
      if (d) {
        var w, k;
        const _ = h === "y" ? "width" : "height", x = zd.has(cn(o)), S = a.reference[u] - a.floating[_] + (x && ((w = i.offset) == null ? void 0 : w[u]) || 0) + (x ? 0 : y.crossAxis), I = a.reference[u] + a.reference[_] + (x ? 0 : ((k = i.offset) == null ? void 0 : k[u]) || 0) - (x ? y.crossAxis : 0);
        b < S ? b = S : b > I && (b = I);
      }
      return {
        [h]: g,
        [u]: b
      };
    }
  };
}, Xw = function(e) {
  return e === void 0 && (e = {}), {
    name: "size",
    options: e,
    async fn(t) {
      var n, r;
      const {
        placement: o,
        rects: a,
        platform: i,
        elements: c
      } = t, {
        apply: l = () => {
        },
        ...d
      } = an(e, t), f = await Mr(t, d), u = cn(o), h = fr(o), g = Zt(o) === "y", {
        width: b,
        height: v
      } = a.floating;
      let y, w;
      u === "top" || u === "bottom" ? (y = u, w = h === (await (i.isRTL == null ? void 0 : i.isRTL(c.floating)) ? "start" : "end") ? "left" : "right") : (w = u, y = h === "end" ? "top" : "bottom");
      const k = v - f.top - f.bottom, _ = b - f.left - f.right, x = gn(v - f[y], k), S = gn(b - f[w], _), I = !t.middlewareData.shift;
      let R = x, E = S;
      if ((n = t.middlewareData.shift) != null && n.enabled.x && (E = _), (r = t.middlewareData.shift) != null && r.enabled.y && (R = k), I && !h) {
        const O = wt(f.left, 0), T = wt(f.right, 0), D = wt(f.top, 0), j = wt(f.bottom, 0);
        g ? E = b - 2 * (O !== 0 || T !== 0 ? O + T : wt(f.left, f.right)) : R = v - 2 * (D !== 0 || j !== 0 ? D + j : wt(f.top, f.bottom));
      }
      await l({
        ...t,
        availableWidth: E,
        availableHeight: R
      });
      const P = await i.getDimensions(c.floating);
      return b !== P.width || v !== P.height ? {
        reset: {
          rects: !0
        }
      } : {};
    }
  };
};
function Qo() {
  return typeof window < "u";
}
function pr(e) {
  return Fd(e) ? (e.nodeName || "").toLowerCase() : "#document";
}
function xt(e) {
  var t;
  return (e == null || (t = e.ownerDocument) == null ? void 0 : t.defaultView) || window;
}
function Xt(e) {
  var t;
  return (t = (Fd(e) ? e.ownerDocument : e.document) || window.document) == null ? void 0 : t.documentElement;
}
function Fd(e) {
  return Qo() ? e instanceof Node || e instanceof xt(e).Node : !1;
}
function Dt(e) {
  return Qo() ? e instanceof Element || e instanceof xt(e).Element : !1;
}
function Kt(e) {
  return Qo() ? e instanceof HTMLElement || e instanceof xt(e).HTMLElement : !1;
}
function Bc(e) {
  return !Qo() || typeof ShadowRoot > "u" ? !1 : e instanceof ShadowRoot || e instanceof xt(e).ShadowRoot;
}
const ex = /* @__PURE__ */ new Set(["inline", "contents"]);
function Hr(e) {
  const {
    overflow: t,
    overflowX: n,
    overflowY: r,
    display: o
  } = $t(e);
  return /auto|scroll|overlay|hidden|clip/.test(t + r + n) && !ex.has(o);
}
const tx = /* @__PURE__ */ new Set(["table", "td", "th"]);
function nx(e) {
  return tx.has(pr(e));
}
const rx = [":popover-open", ":modal"];
function Ko(e) {
  return rx.some((t) => {
    try {
      return e.matches(t);
    } catch {
      return !1;
    }
  });
}
const ox = ["transform", "translate", "scale", "rotate", "perspective"], sx = ["transform", "translate", "scale", "rotate", "perspective", "filter"], ax = ["paint", "layout", "strict", "content"];
function Qa(e) {
  const t = Ka(), n = Dt(e) ? $t(e) : e;
  return ox.some((r) => n[r] ? n[r] !== "none" : !1) || (n.containerType ? n.containerType !== "normal" : !1) || !t && (n.backdropFilter ? n.backdropFilter !== "none" : !1) || !t && (n.filter ? n.filter !== "none" : !1) || sx.some((r) => (n.willChange || "").includes(r)) || ax.some((r) => (n.contain || "").includes(r));
}
function ix(e) {
  let t = yn(e);
  for (; Kt(t) && !rr(t); ) {
    if (Qa(t))
      return t;
    if (Ko(t))
      return null;
    t = yn(t);
  }
  return null;
}
function Ka() {
  return typeof CSS > "u" || !CSS.supports ? !1 : CSS.supports("-webkit-backdrop-filter", "none");
}
const cx = /* @__PURE__ */ new Set(["html", "body", "#document"]);
function rr(e) {
  return cx.has(pr(e));
}
function $t(e) {
  return xt(e).getComputedStyle(e);
}
function Jo(e) {
  return Dt(e) ? {
    scrollLeft: e.scrollLeft,
    scrollTop: e.scrollTop
  } : {
    scrollLeft: e.scrollX,
    scrollTop: e.scrollY
  };
}
function yn(e) {
  if (pr(e) === "html")
    return e;
  const t = (
    // Step into the shadow DOM of the parent of a slotted node.
    e.assignedSlot || // DOM Element detected.
    e.parentNode || // ShadowRoot detected.
    Bc(e) && e.host || // Fallback.
    Xt(e)
  );
  return Bc(t) ? t.host : t;
}
function jd(e) {
  const t = yn(e);
  return rr(t) ? e.ownerDocument ? e.ownerDocument.body : e.body : Kt(t) && Hr(t) ? t : jd(t);
}
function Lr(e, t, n) {
  var r;
  t === void 0 && (t = []), n === void 0 && (n = !0);
  const o = jd(e), a = o === ((r = e.ownerDocument) == null ? void 0 : r.body), i = xt(o);
  if (a) {
    const c = da(i);
    return t.concat(i, i.visualViewport || [], Hr(o) ? o : [], c && n ? Lr(c) : []);
  }
  return t.concat(o, Lr(o, [], n));
}
function da(e) {
  return e.parent && Object.getPrototypeOf(e.parent) ? e.frameElement : null;
}
function Bd(e) {
  const t = $t(e);
  let n = parseFloat(t.width) || 0, r = parseFloat(t.height) || 0;
  const o = Kt(e), a = o ? e.offsetWidth : n, i = o ? e.offsetHeight : r, c = Ao(n) !== a || Ao(r) !== i;
  return c && (n = a, r = i), {
    width: n,
    height: r,
    $: c
  };
}
function Ja(e) {
  return Dt(e) ? e : e.contextElement;
}
function er(e) {
  const t = Ja(e);
  if (!Kt(t))
    return Gt(1);
  const n = t.getBoundingClientRect(), {
    width: r,
    height: o,
    $: a
  } = Bd(t);
  let i = (a ? Ao(n.width) : n.width) / r, c = (a ? Ao(n.height) : n.height) / o;
  return (!i || !Number.isFinite(i)) && (i = 1), (!c || !Number.isFinite(c)) && (c = 1), {
    x: i,
    y: c
  };
}
const lx = /* @__PURE__ */ Gt(0);
function Ud(e) {
  const t = xt(e);
  return !Ka() || !t.visualViewport ? lx : {
    x: t.visualViewport.offsetLeft,
    y: t.visualViewport.offsetTop
  };
}
function dx(e, t, n) {
  return t === void 0 && (t = !1), !n || t && n !== xt(e) ? !1 : t;
}
function Mn(e, t, n, r) {
  t === void 0 && (t = !1), n === void 0 && (n = !1);
  const o = e.getBoundingClientRect(), a = Ja(e);
  let i = Gt(1);
  t && (r ? Dt(r) && (i = er(r)) : i = er(e));
  const c = dx(a, n, r) ? Ud(a) : Gt(0);
  let l = (o.left + c.x) / i.x, d = (o.top + c.y) / i.y, f = o.width / i.x, u = o.height / i.y;
  if (a) {
    const h = xt(a), g = r && Dt(r) ? xt(r) : r;
    let b = h, v = da(b);
    for (; v && r && g !== b; ) {
      const y = er(v), w = v.getBoundingClientRect(), k = $t(v), _ = w.left + (v.clientLeft + parseFloat(k.paddingLeft)) * y.x, x = w.top + (v.clientTop + parseFloat(k.paddingTop)) * y.y;
      l *= y.x, d *= y.y, f *= y.x, u *= y.y, l += _, d += x, b = xt(v), v = da(b);
    }
  }
  return Io({
    width: f,
    height: u,
    x: l,
    y: d
  });
}
function Xo(e, t) {
  const n = Jo(e).scrollLeft;
  return t ? t.left + n : Mn(Xt(e)).left + n;
}
function Vd(e, t) {
  const n = e.getBoundingClientRect(), r = n.left + t.scrollLeft - Xo(e, n), o = n.top + t.scrollTop;
  return {
    x: r,
    y: o
  };
}
function ux(e) {
  let {
    elements: t,
    rect: n,
    offsetParent: r,
    strategy: o
  } = e;
  const a = o === "fixed", i = Xt(r), c = t ? Ko(t.floating) : !1;
  if (r === i || c && a)
    return n;
  let l = {
    scrollLeft: 0,
    scrollTop: 0
  }, d = Gt(1);
  const f = Gt(0), u = Kt(r);
  if ((u || !u && !a) && ((pr(r) !== "body" || Hr(i)) && (l = Jo(r)), Kt(r))) {
    const g = Mn(r);
    d = er(r), f.x = g.x + r.clientLeft, f.y = g.y + r.clientTop;
  }
  const h = i && !u && !a ? Vd(i, l) : Gt(0);
  return {
    width: n.width * d.x,
    height: n.height * d.y,
    x: n.x * d.x - l.scrollLeft * d.x + f.x + h.x,
    y: n.y * d.y - l.scrollTop * d.y + f.y + h.y
  };
}
function fx(e) {
  return Array.from(e.getClientRects());
}
function px(e) {
  const t = Xt(e), n = Jo(e), r = e.ownerDocument.body, o = wt(t.scrollWidth, t.clientWidth, r.scrollWidth, r.clientWidth), a = wt(t.scrollHeight, t.clientHeight, r.scrollHeight, r.clientHeight);
  let i = -n.scrollLeft + Xo(e);
  const c = -n.scrollTop;
  return $t(r).direction === "rtl" && (i += wt(t.clientWidth, r.clientWidth) - o), {
    width: o,
    height: a,
    x: i,
    y: c
  };
}
const Uc = 25;
function mx(e, t) {
  const n = xt(e), r = Xt(e), o = n.visualViewport;
  let a = r.clientWidth, i = r.clientHeight, c = 0, l = 0;
  if (o) {
    a = o.width, i = o.height;
    const f = Ka();
    (!f || f && t === "fixed") && (c = o.offsetLeft, l = o.offsetTop);
  }
  const d = Xo(r);
  if (d <= 0) {
    const f = r.ownerDocument, u = f.body, h = getComputedStyle(u), g = f.compatMode === "CSS1Compat" && parseFloat(h.marginLeft) + parseFloat(h.marginRight) || 0, b = Math.abs(r.clientWidth - u.clientWidth - g);
    b <= Uc && (a -= b);
  } else d <= Uc && (a += d);
  return {
    width: a,
    height: i,
    x: c,
    y: l
  };
}
const hx = /* @__PURE__ */ new Set(["absolute", "fixed"]);
function gx(e, t) {
  const n = Mn(e, !0, t === "fixed"), r = n.top + e.clientTop, o = n.left + e.clientLeft, a = Kt(e) ? er(e) : Gt(1), i = e.clientWidth * a.x, c = e.clientHeight * a.y, l = o * a.x, d = r * a.y;
  return {
    width: i,
    height: c,
    x: l,
    y: d
  };
}
function Vc(e, t, n) {
  let r;
  if (t === "viewport")
    r = mx(e, n);
  else if (t === "document")
    r = px(Xt(e));
  else if (Dt(t))
    r = gx(t, n);
  else {
    const o = Ud(e);
    r = {
      x: t.x - o.x,
      y: t.y - o.y,
      width: t.width,
      height: t.height
    };
  }
  return Io(r);
}
function Wd(e, t) {
  const n = yn(e);
  return n === t || !Dt(n) || rr(n) ? !1 : $t(n).position === "fixed" || Wd(n, t);
}
function yx(e, t) {
  const n = t.get(e);
  if (n)
    return n;
  let r = Lr(e, [], !1).filter((c) => Dt(c) && pr(c) !== "body"), o = null;
  const a = $t(e).position === "fixed";
  let i = a ? yn(e) : e;
  for (; Dt(i) && !rr(i); ) {
    const c = $t(i), l = Qa(i);
    !l && c.position === "fixed" && (o = null), (a ? !l && !o : !l && c.position === "static" && !!o && hx.has(o.position) || Hr(i) && !l && Wd(e, i)) ? r = r.filter((f) => f !== i) : o = c, i = yn(i);
  }
  return t.set(e, r), r;
}
function vx(e) {
  let {
    element: t,
    boundary: n,
    rootBoundary: r,
    strategy: o
  } = e;
  const i = [...n === "clippingAncestors" ? Ko(t) ? [] : yx(t, this._c) : [].concat(n), r], c = i[0], l = i.reduce((d, f) => {
    const u = Vc(t, f, o);
    return d.top = wt(u.top, d.top), d.right = gn(u.right, d.right), d.bottom = gn(u.bottom, d.bottom), d.left = wt(u.left, d.left), d;
  }, Vc(t, c, o));
  return {
    width: l.right - l.left,
    height: l.bottom - l.top,
    x: l.left,
    y: l.top
  };
}
function bx(e) {
  const {
    width: t,
    height: n
  } = Bd(e);
  return {
    width: t,
    height: n
  };
}
function wx(e, t, n) {
  const r = Kt(t), o = Xt(t), a = n === "fixed", i = Mn(e, !0, a, t);
  let c = {
    scrollLeft: 0,
    scrollTop: 0
  };
  const l = Gt(0);
  function d() {
    l.x = Xo(o);
  }
  if (r || !r && !a)
    if ((pr(t) !== "body" || Hr(o)) && (c = Jo(t)), r) {
      const g = Mn(t, !0, a, t);
      l.x = g.x + t.clientLeft, l.y = g.y + t.clientTop;
    } else o && d();
  a && !r && o && d();
  const f = o && !r && !a ? Vd(o, c) : Gt(0), u = i.left + c.scrollLeft - l.x - f.x, h = i.top + c.scrollTop - l.y - f.y;
  return {
    x: u,
    y: h,
    width: i.width,
    height: i.height
  };
}
function Ds(e) {
  return $t(e).position === "static";
}
function Wc(e, t) {
  if (!Kt(e) || $t(e).position === "fixed")
    return null;
  if (t)
    return t(e);
  let n = e.offsetParent;
  return Xt(e) === n && (n = n.ownerDocument.body), n;
}
function Hd(e, t) {
  const n = xt(e);
  if (Ko(e))
    return n;
  if (!Kt(e)) {
    let o = yn(e);
    for (; o && !rr(o); ) {
      if (Dt(o) && !Ds(o))
        return o;
      o = yn(o);
    }
    return n;
  }
  let r = Wc(e, t);
  for (; r && nx(r) && Ds(r); )
    r = Wc(r, t);
  return r && rr(r) && Ds(r) && !Qa(r) ? n : r || ix(e) || n;
}
const xx = async function(e) {
  const t = this.getOffsetParent || Hd, n = this.getDimensions, r = await n(e.floating);
  return {
    reference: wx(e.reference, await t(e.floating), e.strategy),
    floating: {
      x: 0,
      y: 0,
      width: r.width,
      height: r.height
    }
  };
};
function _x(e) {
  return $t(e).direction === "rtl";
}
const kx = {
  convertOffsetParentRelativeRectToViewportRelativeRect: ux,
  getDocumentElement: Xt,
  getClippingRect: vx,
  getOffsetParent: Hd,
  getElementRects: xx,
  getClientRects: fx,
  getDimensions: bx,
  getScale: er,
  isElement: Dt,
  isRTL: _x
};
function Zd(e, t) {
  return e.x === t.x && e.y === t.y && e.width === t.width && e.height === t.height;
}
function Sx(e, t) {
  let n = null, r;
  const o = Xt(e);
  function a() {
    var c;
    clearTimeout(r), (c = n) == null || c.disconnect(), n = null;
  }
  function i(c, l) {
    c === void 0 && (c = !1), l === void 0 && (l = 1), a();
    const d = e.getBoundingClientRect(), {
      left: f,
      top: u,
      width: h,
      height: g
    } = d;
    if (c || t(), !h || !g)
      return;
    const b = no(u), v = no(o.clientWidth - (f + h)), y = no(o.clientHeight - (u + g)), w = no(f), _ = {
      rootMargin: -b + "px " + -v + "px " + -y + "px " + -w + "px",
      threshold: wt(0, gn(1, l)) || 1
    };
    let x = !0;
    function S(I) {
      const R = I[0].intersectionRatio;
      if (R !== l) {
        if (!x)
          return i();
        R ? i(!1, R) : r = setTimeout(() => {
          i(!1, 1e-7);
        }, 1e3);
      }
      R === 1 && !Zd(d, e.getBoundingClientRect()) && i(), x = !1;
    }
    try {
      n = new IntersectionObserver(S, {
        ..._,
        // Handle <iframe>s
        root: o.ownerDocument
      });
    } catch {
      n = new IntersectionObserver(S, _);
    }
    n.observe(e);
  }
  return i(!0), a;
}
function Cx(e, t, n, r) {
  r === void 0 && (r = {});
  const {
    ancestorScroll: o = !0,
    ancestorResize: a = !0,
    elementResize: i = typeof ResizeObserver == "function",
    layoutShift: c = typeof IntersectionObserver == "function",
    animationFrame: l = !1
  } = r, d = Ja(e), f = o || a ? [...d ? Lr(d) : [], ...Lr(t)] : [];
  f.forEach((w) => {
    o && w.addEventListener("scroll", n, {
      passive: !0
    }), a && w.addEventListener("resize", n);
  });
  const u = d && c ? Sx(d, n) : null;
  let h = -1, g = null;
  i && (g = new ResizeObserver((w) => {
    let [k] = w;
    k && k.target === d && g && (g.unobserve(t), cancelAnimationFrame(h), h = requestAnimationFrame(() => {
      var _;
      (_ = g) == null || _.observe(t);
    })), n();
  }), d && !l && g.observe(d), g.observe(t));
  let b, v = l ? Mn(e) : null;
  l && y();
  function y() {
    const w = Mn(e);
    v && !Zd(v, w) && n(), v = w, b = requestAnimationFrame(y);
  }
  return n(), () => {
    var w;
    f.forEach((k) => {
      o && k.removeEventListener("scroll", n), a && k.removeEventListener("resize", n);
    }), u?.(), (w = g) == null || w.disconnect(), g = null, l && cancelAnimationFrame(b);
  };
}
const Nx = Qw, Ex = Kw, Ax = qw, Px = Xw, Ix = Gw, Hc = Zw, Tx = Jw, Rx = (e, t, n) => {
  const r = /* @__PURE__ */ new Map(), o = {
    platform: kx,
    ...n
  }, a = {
    ...o.platform,
    _c: r
  };
  return Hw(e, t, {
    ...o,
    platform: a
  });
};
var Ox = typeof document < "u", Mx = function() {
}, go = Ox ? kp : Mx;
function To(e, t) {
  if (e === t)
    return !0;
  if (typeof e != typeof t)
    return !1;
  if (typeof e == "function" && e.toString() === t.toString())
    return !0;
  let n, r, o;
  if (e && t && typeof e == "object") {
    if (Array.isArray(e)) {
      if (n = e.length, n !== t.length) return !1;
      for (r = n; r-- !== 0; )
        if (!To(e[r], t[r]))
          return !1;
      return !0;
    }
    if (o = Object.keys(e), n = o.length, n !== Object.keys(t).length)
      return !1;
    for (r = n; r-- !== 0; )
      if (!{}.hasOwnProperty.call(t, o[r]))
        return !1;
    for (r = n; r-- !== 0; ) {
      const a = o[r];
      if (!(a === "_owner" && e.$$typeof) && !To(e[a], t[a]))
        return !1;
    }
    return !0;
  }
  return e !== e && t !== t;
}
function qd(e) {
  return typeof window > "u" ? 1 : (e.ownerDocument.defaultView || window).devicePixelRatio || 1;
}
function Zc(e, t) {
  const n = qd(e);
  return Math.round(t * n) / n;
}
function $s(e) {
  const t = m.useRef(e);
  return go(() => {
    t.current = e;
  }), t;
}
function Lx(e) {
  e === void 0 && (e = {});
  const {
    placement: t = "bottom",
    strategy: n = "absolute",
    middleware: r = [],
    platform: o,
    elements: {
      reference: a,
      floating: i
    } = {},
    transform: c = !0,
    whileElementsMounted: l,
    open: d
  } = e, [f, u] = m.useState({
    x: 0,
    y: 0,
    strategy: n,
    placement: t,
    middlewareData: {},
    isPositioned: !1
  }), [h, g] = m.useState(r);
  To(h, r) || g(r);
  const [b, v] = m.useState(null), [y, w] = m.useState(null), k = m.useCallback((N) => {
    N !== I.current && (I.current = N, v(N));
  }, []), _ = m.useCallback((N) => {
    N !== R.current && (R.current = N, w(N));
  }, []), x = a || b, S = i || y, I = m.useRef(null), R = m.useRef(null), E = m.useRef(f), P = l != null, O = $s(l), T = $s(o), D = $s(d), j = m.useCallback(() => {
    if (!I.current || !R.current)
      return;
    const N = {
      placement: t,
      strategy: n,
      middleware: h
    };
    T.current && (N.platform = T.current), Rx(I.current, R.current, N).then((H) => {
      const G = {
        ...H,
        // The floating element's position may be recomputed while it's closed
        // but still mounted (such as when transitioning out). To ensure
        // `isPositioned` will be `false` initially on the next open, avoid
        // setting it to `true` when `open === false` (must be specified).
        isPositioned: D.current !== !1
      };
      z.current && !To(E.current, G) && (E.current = G, zo.flushSync(() => {
        u(G);
      }));
    });
  }, [h, t, n, T, D]);
  go(() => {
    d === !1 && E.current.isPositioned && (E.current.isPositioned = !1, u((N) => ({
      ...N,
      isPositioned: !1
    })));
  }, [d]);
  const z = m.useRef(!1);
  go(() => (z.current = !0, () => {
    z.current = !1;
  }), []), go(() => {
    if (x && (I.current = x), S && (R.current = S), x && S) {
      if (O.current)
        return O.current(x, S, j);
      j();
    }
  }, [x, S, j, O, P]);
  const W = m.useMemo(() => ({
    reference: I,
    floating: R,
    setReference: k,
    setFloating: _
  }), [k, _]), $ = m.useMemo(() => ({
    reference: x,
    floating: S
  }), [x, S]), C = m.useMemo(() => {
    const N = {
      position: n,
      left: 0,
      top: 0
    };
    if (!$.floating)
      return N;
    const H = Zc($.floating, f.x), G = Zc($.floating, f.y);
    return c ? {
      ...N,
      transform: "translate(" + H + "px, " + G + "px)",
      ...qd($.floating) >= 1.5 && {
        willChange: "transform"
      }
    } : {
      position: n,
      left: H,
      top: G
    };
  }, [n, c, $.floating, f.x, f.y]);
  return m.useMemo(() => ({
    ...f,
    update: j,
    refs: W,
    elements: $,
    floatingStyles: C
  }), [f, j, W, $, C]);
}
const Dx = (e) => {
  function t(n) {
    return {}.hasOwnProperty.call(n, "current");
  }
  return {
    name: "arrow",
    options: e,
    fn(n) {
      const {
        element: r,
        padding: o
      } = typeof e == "function" ? e(n) : e;
      return r && t(r) ? r.current != null ? Hc({
        element: r.current,
        padding: o
      }).fn(n) : {} : r ? Hc({
        element: r,
        padding: o
      }).fn(n) : {};
    }
  };
}, $x = (e, t) => ({
  ...Nx(e),
  options: [e, t]
}), zx = (e, t) => ({
  ...Ex(e),
  options: [e, t]
}), Fx = (e, t) => ({
  ...Tx(e),
  options: [e, t]
}), jx = (e, t) => ({
  ...Ax(e),
  options: [e, t]
}), Bx = (e, t) => ({
  ...Px(e),
  options: [e, t]
}), Ux = (e, t) => ({
  ...Ix(e),
  options: [e, t]
}), Vx = (e, t) => ({
  ...Dx(e),
  options: [e, t]
});
var Wx = "Arrow", Gd = m.forwardRef((e, t) => {
  const { children: n, width: r = 10, height: o = 5, ...a } = e;
  return /* @__PURE__ */ s(
    be.svg,
    {
      ...a,
      ref: t,
      width: r,
      height: o,
      viewBox: "0 0 30 10",
      preserveAspectRatio: "none",
      children: e.asChild ? n : /* @__PURE__ */ s("polygon", { points: "0,0 30,0 15,10" })
    }
  );
});
Gd.displayName = Wx;
var Hx = Gd;
function Zx(e) {
  const [t, n] = m.useState(void 0);
  return Xe(() => {
    if (e) {
      n({ width: e.offsetWidth, height: e.offsetHeight });
      const r = new ResizeObserver((o) => {
        if (!Array.isArray(o) || !o.length)
          return;
        const a = o[0];
        let i, c;
        if ("borderBoxSize" in a) {
          const l = a.borderBoxSize, d = Array.isArray(l) ? l[0] : l;
          i = d.inlineSize, c = d.blockSize;
        } else
          i = e.offsetWidth, c = e.offsetHeight;
        n({ width: i, height: c });
      });
      return r.observe(e, { box: "border-box" }), () => r.unobserve(e);
    } else
      n(void 0);
  }, [e]), t;
}
var Xa = "Popper", [Yd, Qd] = _n(Xa), [qx, Kd] = Yd(Xa), Jd = (e) => {
  const { __scopePopper: t, children: n } = e, [r, o] = m.useState(null);
  return /* @__PURE__ */ s(qx, { scope: t, anchor: r, onAnchorChange: o, children: n });
};
Jd.displayName = Xa;
var Xd = "PopperAnchor", eu = m.forwardRef(
  (e, t) => {
    const { __scopePopper: n, virtualRef: r, ...o } = e, a = Kd(Xd, n), i = m.useRef(null), c = Re(t, i), l = m.useRef(null);
    return m.useEffect(() => {
      const d = l.current;
      l.current = r?.current || i.current, d !== l.current && a.onAnchorChange(l.current);
    }), r ? null : /* @__PURE__ */ s(be.div, { ...o, ref: c });
  }
);
eu.displayName = Xd;
var ei = "PopperContent", [Gx, Yx] = Yd(ei), tu = m.forwardRef(
  (e, t) => {
    const {
      __scopePopper: n,
      side: r = "bottom",
      sideOffset: o = 0,
      align: a = "center",
      alignOffset: i = 0,
      arrowPadding: c = 0,
      avoidCollisions: l = !0,
      collisionBoundary: d = [],
      collisionPadding: f = 0,
      sticky: u = "partial",
      hideWhenDetached: h = !1,
      updatePositionStrategy: g = "optimized",
      onPlaced: b,
      ...v
    } = e, y = Kd(ei, n), [w, k] = m.useState(null), _ = Re(t, (F) => k(F)), [x, S] = m.useState(null), I = Zx(x), R = I?.width ?? 0, E = I?.height ?? 0, P = r + (a !== "center" ? "-" + a : ""), O = typeof f == "number" ? f : { top: 0, right: 0, bottom: 0, left: 0, ...f }, T = Array.isArray(d) ? d : [d], D = T.length > 0, j = {
      padding: O,
      boundary: T.filter(Kx),
      // with `strategy: 'fixed'`, this is the only way to get it to respect boundaries
      altBoundary: D
    }, { refs: z, floatingStyles: W, placement: $, isPositioned: C, middlewareData: N } = Lx({
      // default to `fixed` strategy so users don't have to pick and we also avoid focus scroll issues
      strategy: "fixed",
      placement: P,
      whileElementsMounted: (...F) => Cx(...F, {
        animationFrame: g === "always"
      }),
      elements: {
        reference: y.anchor
      },
      middleware: [
        $x({ mainAxis: o + E, alignmentAxis: i }),
        l && zx({
          mainAxis: !0,
          crossAxis: !1,
          limiter: u === "partial" ? Fx() : void 0,
          ...j
        }),
        l && jx({ ...j }),
        Bx({
          ...j,
          apply: ({ elements: F, rects: Y, availableWidth: he, availableHeight: V }) => {
            const { width: ie, height: ue } = Y.reference, pe = F.floating.style;
            pe.setProperty("--radix-popper-available-width", `${he}px`), pe.setProperty("--radix-popper-available-height", `${V}px`), pe.setProperty("--radix-popper-anchor-width", `${ie}px`), pe.setProperty("--radix-popper-anchor-height", `${ue}px`);
          }
        }),
        x && Vx({ element: x, padding: c }),
        Jx({ arrowWidth: R, arrowHeight: E }),
        h && Ux({ strategy: "referenceHidden", ...j })
      ]
    }), [H, G] = ou($), J = hn(b);
    Xe(() => {
      C && J?.();
    }, [C, J]);
    const fe = N.arrow?.x, Z = N.arrow?.y, X = N.arrow?.centerOffset !== 0, [Q, ge] = m.useState();
    return Xe(() => {
      w && ge(window.getComputedStyle(w).zIndex);
    }, [w]), /* @__PURE__ */ s(
      "div",
      {
        ref: z.setFloating,
        "data-radix-popper-content-wrapper": "",
        style: {
          ...W,
          transform: C ? W.transform : "translate(0, -200%)",
          // keep off the page when measuring
          minWidth: "max-content",
          zIndex: Q,
          "--radix-popper-transform-origin": [
            N.transformOrigin?.x,
            N.transformOrigin?.y
          ].join(" "),
          // hide the content if using the hide middleware and should be hidden
          // set visibility to hidden and disable pointer events so the UI behaves
          // as if the PopperContent isn't there at all
          ...N.hide?.referenceHidden && {
            visibility: "hidden",
            pointerEvents: "none"
          }
        },
        dir: e.dir,
        children: /* @__PURE__ */ s(
          Gx,
          {
            scope: n,
            placedSide: H,
            onArrowChange: S,
            arrowX: fe,
            arrowY: Z,
            shouldHideArrow: X,
            children: /* @__PURE__ */ s(
              be.div,
              {
                "data-side": H,
                "data-align": G,
                ...v,
                ref: _,
                style: {
                  ...v.style,
                  // if the PopperContent hasn't been placed yet (not all measurements done)
                  // we prevent animations so that users's animation don't kick in too early referring wrong sides
                  animation: C ? void 0 : "none"
                }
              }
            )
          }
        )
      }
    );
  }
);
tu.displayName = ei;
var nu = "PopperArrow", Qx = {
  top: "bottom",
  right: "left",
  bottom: "top",
  left: "right"
}, ru = m.forwardRef(function(t, n) {
  const { __scopePopper: r, ...o } = t, a = Yx(nu, r), i = Qx[a.placedSide];
  return (
    // we have to use an extra wrapper because `ResizeObserver` (used by `useSize`)
    // doesn't report size as we'd expect on SVG elements.
    // it reports their bounding box which is effectively the largest path inside the SVG.
    /* @__PURE__ */ s(
      "span",
      {
        ref: a.onArrowChange,
        style: {
          position: "absolute",
          left: a.arrowX,
          top: a.arrowY,
          [i]: 0,
          transformOrigin: {
            top: "",
            right: "0 0",
            bottom: "center 0",
            left: "100% 0"
          }[a.placedSide],
          transform: {
            top: "translateY(100%)",
            right: "translateY(50%) rotate(90deg) translateX(-50%)",
            bottom: "rotate(180deg)",
            left: "translateY(50%) rotate(-90deg) translateX(50%)"
          }[a.placedSide],
          visibility: a.shouldHideArrow ? "hidden" : void 0
        },
        children: /* @__PURE__ */ s(
          Hx,
          {
            ...o,
            ref: n,
            style: {
              ...o.style,
              // ensures the element can be measured correctly (mostly for if SVG)
              display: "block"
            }
          }
        )
      }
    )
  );
});
ru.displayName = nu;
function Kx(e) {
  return e !== null;
}
var Jx = (e) => ({
  name: "transformOrigin",
  options: e,
  fn(t) {
    const { placement: n, rects: r, middlewareData: o } = t, i = o.arrow?.centerOffset !== 0, c = i ? 0 : e.arrowWidth, l = i ? 0 : e.arrowHeight, [d, f] = ou(n), u = { start: "0%", center: "50%", end: "100%" }[f], h = (o.arrow?.x ?? 0) + c / 2, g = (o.arrow?.y ?? 0) + l / 2;
    let b = "", v = "";
    return d === "bottom" ? (b = i ? u : `${h}px`, v = `${-l}px`) : d === "top" ? (b = i ? u : `${h}px`, v = `${r.floating.height + l}px`) : d === "right" ? (b = `${-l}px`, v = i ? u : `${g}px`) : d === "left" && (b = `${r.floating.width + l}px`, v = i ? u : `${g}px`), { data: { x: b, y: v } };
  }
});
function ou(e) {
  const [t, n = "center"] = e.split("-");
  return [t, n];
}
var Xx = Jd, e_ = eu, t_ = tu, n_ = ru, r_ = "Portal", ti = m.forwardRef((e, t) => {
  const { container: n, ...r } = e, [o, a] = m.useState(!1);
  Xe(() => a(!0), []);
  const i = n || o && globalThis?.document?.body;
  return i ? ml.createPortal(/* @__PURE__ */ s(be.div, { ...r, ref: t }), i) : null;
});
ti.displayName = r_;
// @__NO_SIDE_EFFECTS__
function o_(e) {
  const t = /* @__PURE__ */ s_(e), n = m.forwardRef((r, o) => {
    const { children: a, ...i } = r, c = m.Children.toArray(a), l = c.find(i_);
    if (l) {
      const d = l.props.children, f = c.map((u) => u === l ? m.Children.count(d) > 1 ? m.Children.only(null) : m.isValidElement(d) ? d.props.children : null : u);
      return /* @__PURE__ */ s(t, { ...i, ref: o, children: m.isValidElement(d) ? m.cloneElement(d, void 0, f) : null });
    }
    return /* @__PURE__ */ s(t, { ...i, ref: o, children: a });
  });
  return n.displayName = `${e}.Slot`, n;
}
// @__NO_SIDE_EFFECTS__
function s_(e) {
  const t = m.forwardRef((n, r) => {
    const { children: o, ...a } = n;
    if (m.isValidElement(o)) {
      const i = l_(o), c = c_(a, o.props);
      return o.type !== m.Fragment && (c.ref = r ? lr(r, i) : i), m.cloneElement(o, c);
    }
    return m.Children.count(o) > 1 ? m.Children.only(null) : null;
  });
  return t.displayName = `${e}.SlotClone`, t;
}
var a_ = Symbol("radix.slottable");
function i_(e) {
  return m.isValidElement(e) && typeof e.type == "function" && "__radixId" in e.type && e.type.__radixId === a_;
}
function c_(e, t) {
  const n = { ...t };
  for (const r in t) {
    const o = e[r], a = t[r];
    /^on[A-Z]/.test(r) ? o && a ? n[r] = (...c) => {
      const l = a(...c);
      return o(...c), l;
    } : o && (n[r] = o) : r === "style" ? n[r] = { ...o, ...a } : r === "className" && (n[r] = [o, a].filter(Boolean).join(" "));
  }
  return { ...e, ...n };
}
function l_(e) {
  let t = Object.getOwnPropertyDescriptor(e.props, "ref")?.get, n = t && "isReactWarning" in t && t.isReactWarning;
  return n ? e.ref : (t = Object.getOwnPropertyDescriptor(e, "ref")?.get, n = t && "isReactWarning" in t && t.isReactWarning, n ? e.props.ref : e.props.ref || e.ref);
}
var d_ = m[" useInsertionEffect ".trim().toString()] || Xe;
function vn({
  prop: e,
  defaultProp: t,
  onChange: n = () => {
  },
  caller: r
}) {
  const [o, a, i] = u_({
    defaultProp: t,
    onChange: n
  }), c = e !== void 0, l = c ? e : o;
  {
    const f = m.useRef(e !== void 0);
    m.useEffect(() => {
      const u = f.current;
      u !== c && console.warn(
        `${r} is changing from ${u ? "controlled" : "uncontrolled"} to ${c ? "controlled" : "uncontrolled"}. Components should not switch from controlled to uncontrolled (or vice versa). Decide between using a controlled or uncontrolled value for the lifetime of the component.`
      ), f.current = c;
    }, [c, r]);
  }
  const d = m.useCallback(
    (f) => {
      if (c) {
        const u = f_(f) ? f(e) : f;
        u !== e && i.current?.(u);
      } else
        a(f);
    },
    [c, e, a, i]
  );
  return [l, d];
}
function u_({
  defaultProp: e,
  onChange: t
}) {
  const [n, r] = m.useState(e), o = m.useRef(n), a = m.useRef(t);
  return d_(() => {
    a.current = t;
  }, [t]), m.useEffect(() => {
    o.current !== n && (a.current?.(n), o.current = n);
  }, [n, o]), [n, r, a];
}
function f_(e) {
  return typeof e == "function";
}
function p_(e) {
  const t = m.useRef({ value: e, previous: e });
  return m.useMemo(() => (t.current.value !== e && (t.current.previous = t.current.value, t.current.value = e), t.current.previous), [e]);
}
var su = Object.freeze({
  // See: https://github.com/twbs/bootstrap/blob/main/scss/mixins/_visually-hidden.scss
  position: "absolute",
  border: 0,
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  wordWrap: "normal"
}), m_ = "VisuallyHidden", h_ = m.forwardRef(
  (e, t) => /* @__PURE__ */ s(
    be.span,
    {
      ...e,
      ref: t,
      style: { ...su, ...e.style }
    }
  )
);
h_.displayName = m_;
var g_ = function(e) {
  if (typeof document > "u")
    return null;
  var t = Array.isArray(e) ? e[0] : e;
  return t.ownerDocument.body;
}, Gn = /* @__PURE__ */ new WeakMap(), ro = /* @__PURE__ */ new WeakMap(), oo = {}, zs = 0, au = function(e) {
  return e && (e.host || au(e.parentNode));
}, y_ = function(e, t) {
  return t.map(function(n) {
    if (e.contains(n))
      return n;
    var r = au(n);
    return r && e.contains(r) ? r : (console.error("aria-hidden", n, "in not contained inside", e, ". Doing nothing"), null);
  }).filter(function(n) {
    return !!n;
  });
}, v_ = function(e, t, n, r) {
  var o = y_(t, Array.isArray(e) ? e : [e]);
  oo[n] || (oo[n] = /* @__PURE__ */ new WeakMap());
  var a = oo[n], i = [], c = /* @__PURE__ */ new Set(), l = new Set(o), d = function(u) {
    !u || c.has(u) || (c.add(u), d(u.parentNode));
  };
  o.forEach(d);
  var f = function(u) {
    !u || l.has(u) || Array.prototype.forEach.call(u.children, function(h) {
      if (c.has(h))
        f(h);
      else
        try {
          var g = h.getAttribute(r), b = g !== null && g !== "false", v = (Gn.get(h) || 0) + 1, y = (a.get(h) || 0) + 1;
          Gn.set(h, v), a.set(h, y), i.push(h), v === 1 && b && ro.set(h, !0), y === 1 && h.setAttribute(n, "true"), b || h.setAttribute(r, "true");
        } catch (w) {
          console.error("aria-hidden: cannot operate on ", h, w);
        }
    });
  };
  return f(t), c.clear(), zs++, function() {
    i.forEach(function(u) {
      var h = Gn.get(u) - 1, g = a.get(u) - 1;
      Gn.set(u, h), a.set(u, g), h || (ro.has(u) || u.removeAttribute(r), ro.delete(u)), g || u.removeAttribute(n);
    }), zs--, zs || (Gn = /* @__PURE__ */ new WeakMap(), Gn = /* @__PURE__ */ new WeakMap(), ro = /* @__PURE__ */ new WeakMap(), oo = {});
  };
}, iu = function(e, t, n) {
  n === void 0 && (n = "data-aria-hidden");
  var r = Array.from(Array.isArray(e) ? e : [e]), o = g_(e);
  return o ? (r.push.apply(r, Array.from(o.querySelectorAll("[aria-live], script"))), v_(r, o, n, "aria-hidden")) : function() {
    return null;
  };
}, Ht = function() {
  return Ht = Object.assign || function(t) {
    for (var n, r = 1, o = arguments.length; r < o; r++) {
      n = arguments[r];
      for (var a in n) Object.prototype.hasOwnProperty.call(n, a) && (t[a] = n[a]);
    }
    return t;
  }, Ht.apply(this, arguments);
};
function cu(e, t) {
  var n = {};
  for (var r in e) Object.prototype.hasOwnProperty.call(e, r) && t.indexOf(r) < 0 && (n[r] = e[r]);
  if (e != null && typeof Object.getOwnPropertySymbols == "function")
    for (var o = 0, r = Object.getOwnPropertySymbols(e); o < r.length; o++)
      t.indexOf(r[o]) < 0 && Object.prototype.propertyIsEnumerable.call(e, r[o]) && (n[r[o]] = e[r[o]]);
  return n;
}
function b_(e, t, n) {
  if (n || arguments.length === 2) for (var r = 0, o = t.length, a; r < o; r++)
    (a || !(r in t)) && (a || (a = Array.prototype.slice.call(t, 0, r)), a[r] = t[r]);
  return e.concat(a || Array.prototype.slice.call(t));
}
var yo = "right-scroll-bar-position", vo = "width-before-scroll-bar", w_ = "with-scroll-bars-hidden", x_ = "--removed-body-scroll-bar-size";
function Fs(e, t) {
  return typeof e == "function" ? e(t) : e && (e.current = t), e;
}
function __(e, t) {
  var n = K(function() {
    return {
      // value
      value: e,
      // last callback
      callback: t,
      // "memoized" public interface
      facade: {
        get current() {
          return n.value;
        },
        set current(r) {
          var o = n.value;
          o !== r && (n.value = r, n.callback(r, o));
        }
      }
    };
  })[0];
  return n.callback = t, n.facade;
}
var k_ = typeof window < "u" ? m.useLayoutEffect : m.useEffect, qc = /* @__PURE__ */ new WeakMap();
function S_(e, t) {
  var n = __(null, function(r) {
    return e.forEach(function(o) {
      return Fs(o, r);
    });
  });
  return k_(function() {
    var r = qc.get(n);
    if (r) {
      var o = new Set(r), a = new Set(e), i = n.current;
      o.forEach(function(c) {
        a.has(c) || Fs(c, null);
      }), a.forEach(function(c) {
        o.has(c) || Fs(c, i);
      });
    }
    qc.set(n, e);
  }, [e]), n;
}
function C_(e) {
  return e;
}
function N_(e, t) {
  t === void 0 && (t = C_);
  var n = [], r = !1, o = {
    read: function() {
      if (r)
        throw new Error("Sidecar: could not `read` from an `assigned` medium. `read` could be used only with `useMedium`.");
      return n.length ? n[n.length - 1] : e;
    },
    useMedium: function(a) {
      var i = t(a, r);
      return n.push(i), function() {
        n = n.filter(function(c) {
          return c !== i;
        });
      };
    },
    assignSyncMedium: function(a) {
      for (r = !0; n.length; ) {
        var i = n;
        n = [], i.forEach(a);
      }
      n = {
        push: function(c) {
          return a(c);
        },
        filter: function() {
          return n;
        }
      };
    },
    assignMedium: function(a) {
      r = !0;
      var i = [];
      if (n.length) {
        var c = n;
        n = [], c.forEach(a), i = n;
      }
      var l = function() {
        var f = i;
        i = [], f.forEach(a);
      }, d = function() {
        return Promise.resolve().then(l);
      };
      d(), n = {
        push: function(f) {
          i.push(f), d();
        },
        filter: function(f) {
          return i = i.filter(f), n;
        }
      };
    }
  };
  return o;
}
function E_(e) {
  e === void 0 && (e = {});
  var t = N_(null);
  return t.options = Ht({ async: !0, ssr: !1 }, e), t;
}
var lu = function(e) {
  var t = e.sideCar, n = cu(e, ["sideCar"]);
  if (!t)
    throw new Error("Sidecar: please provide `sideCar` property to import the right car");
  var r = t.read();
  if (!r)
    throw new Error("Sidecar medium not found");
  return m.createElement(r, Ht({}, n));
};
lu.isSideCarExport = !0;
function A_(e, t) {
  return e.useMedium(t), lu;
}
var du = E_(), js = function() {
}, es = m.forwardRef(function(e, t) {
  var n = m.useRef(null), r = m.useState({
    onScrollCapture: js,
    onWheelCapture: js,
    onTouchMoveCapture: js
  }), o = r[0], a = r[1], i = e.forwardProps, c = e.children, l = e.className, d = e.removeScrollBar, f = e.enabled, u = e.shards, h = e.sideCar, g = e.noRelative, b = e.noIsolation, v = e.inert, y = e.allowPinchZoom, w = e.as, k = w === void 0 ? "div" : w, _ = e.gapMode, x = cu(e, ["forwardProps", "children", "className", "removeScrollBar", "enabled", "shards", "sideCar", "noRelative", "noIsolation", "inert", "allowPinchZoom", "as", "gapMode"]), S = h, I = S_([n, t]), R = Ht(Ht({}, x), o);
  return m.createElement(
    m.Fragment,
    null,
    f && m.createElement(S, { sideCar: du, removeScrollBar: d, shards: u, noRelative: g, noIsolation: b, inert: v, setCallbacks: a, allowPinchZoom: !!y, lockRef: n, gapMode: _ }),
    i ? m.cloneElement(m.Children.only(c), Ht(Ht({}, R), { ref: I })) : m.createElement(k, Ht({}, R, { className: l, ref: I }), c)
  );
});
es.defaultProps = {
  enabled: !0,
  removeScrollBar: !0,
  inert: !1
};
es.classNames = {
  fullWidth: vo,
  zeroRight: yo
};
var P_ = function() {
  if (typeof __webpack_nonce__ < "u")
    return __webpack_nonce__;
};
function I_() {
  if (!document)
    return null;
  var e = document.createElement("style");
  e.type = "text/css";
  var t = P_();
  return t && e.setAttribute("nonce", t), e;
}
function T_(e, t) {
  e.styleSheet ? e.styleSheet.cssText = t : e.appendChild(document.createTextNode(t));
}
function R_(e) {
  var t = document.head || document.getElementsByTagName("head")[0];
  t.appendChild(e);
}
var O_ = function() {
  var e = 0, t = null;
  return {
    add: function(n) {
      e == 0 && (t = I_()) && (T_(t, n), R_(t)), e++;
    },
    remove: function() {
      e--, !e && t && (t.parentNode && t.parentNode.removeChild(t), t = null);
    }
  };
}, M_ = function() {
  var e = O_();
  return function(t, n) {
    m.useEffect(function() {
      return e.add(t), function() {
        e.remove();
      };
    }, [t && n]);
  };
}, uu = function() {
  var e = M_(), t = function(n) {
    var r = n.styles, o = n.dynamic;
    return e(r, o), null;
  };
  return t;
}, L_ = {
  left: 0,
  top: 0,
  right: 0,
  gap: 0
}, Bs = function(e) {
  return parseInt(e || "", 10) || 0;
}, D_ = function(e) {
  var t = window.getComputedStyle(document.body), n = t[e === "padding" ? "paddingLeft" : "marginLeft"], r = t[e === "padding" ? "paddingTop" : "marginTop"], o = t[e === "padding" ? "paddingRight" : "marginRight"];
  return [Bs(n), Bs(r), Bs(o)];
}, $_ = function(e) {
  if (e === void 0 && (e = "margin"), typeof window > "u")
    return L_;
  var t = D_(e), n = document.documentElement.clientWidth, r = window.innerWidth;
  return {
    left: t[0],
    top: t[1],
    right: t[2],
    gap: Math.max(0, r - n + t[2] - t[0])
  };
}, z_ = uu(), tr = "data-scroll-locked", F_ = function(e, t, n, r) {
  var o = e.left, a = e.top, i = e.right, c = e.gap;
  return n === void 0 && (n = "margin"), `
  .`.concat(w_, ` {
   overflow: hidden `).concat(r, `;
   padding-right: `).concat(c, "px ").concat(r, `;
  }
  body[`).concat(tr, `] {
    overflow: hidden `).concat(r, `;
    overscroll-behavior: contain;
    `).concat([
    t && "position: relative ".concat(r, ";"),
    n === "margin" && `
    padding-left: `.concat(o, `px;
    padding-top: `).concat(a, `px;
    padding-right: `).concat(i, `px;
    margin-left:0;
    margin-top:0;
    margin-right: `).concat(c, "px ").concat(r, `;
    `),
    n === "padding" && "padding-right: ".concat(c, "px ").concat(r, ";")
  ].filter(Boolean).join(""), `
  }
  
  .`).concat(yo, ` {
    right: `).concat(c, "px ").concat(r, `;
  }
  
  .`).concat(vo, ` {
    margin-right: `).concat(c, "px ").concat(r, `;
  }
  
  .`).concat(yo, " .").concat(yo, ` {
    right: 0 `).concat(r, `;
  }
  
  .`).concat(vo, " .").concat(vo, ` {
    margin-right: 0 `).concat(r, `;
  }
  
  body[`).concat(tr, `] {
    `).concat(x_, ": ").concat(c, `px;
  }
`);
}, Gc = function() {
  var e = parseInt(document.body.getAttribute(tr) || "0", 10);
  return isFinite(e) ? e : 0;
}, j_ = function() {
  m.useEffect(function() {
    return document.body.setAttribute(tr, (Gc() + 1).toString()), function() {
      var e = Gc() - 1;
      e <= 0 ? document.body.removeAttribute(tr) : document.body.setAttribute(tr, e.toString());
    };
  }, []);
}, B_ = function(e) {
  var t = e.noRelative, n = e.noImportant, r = e.gapMode, o = r === void 0 ? "margin" : r;
  j_();
  var a = m.useMemo(function() {
    return $_(o);
  }, [o]);
  return m.createElement(z_, { styles: F_(a, !t, o, n ? "" : "!important") });
}, ua = !1;
if (typeof window < "u")
  try {
    var so = Object.defineProperty({}, "passive", {
      get: function() {
        return ua = !0, !0;
      }
    });
    window.addEventListener("test", so, so), window.removeEventListener("test", so, so);
  } catch {
    ua = !1;
  }
var Yn = ua ? { passive: !1 } : !1, U_ = function(e) {
  return e.tagName === "TEXTAREA";
}, fu = function(e, t) {
  if (!(e instanceof Element))
    return !1;
  var n = window.getComputedStyle(e);
  return (
    // not-not-scrollable
    n[t] !== "hidden" && // contains scroll inside self
    !(n.overflowY === n.overflowX && !U_(e) && n[t] === "visible")
  );
}, V_ = function(e) {
  return fu(e, "overflowY");
}, W_ = function(e) {
  return fu(e, "overflowX");
}, Yc = function(e, t) {
  var n = t.ownerDocument, r = t;
  do {
    typeof ShadowRoot < "u" && r instanceof ShadowRoot && (r = r.host);
    var o = pu(e, r);
    if (o) {
      var a = mu(e, r), i = a[1], c = a[2];
      if (i > c)
        return !0;
    }
    r = r.parentNode;
  } while (r && r !== n.body);
  return !1;
}, H_ = function(e) {
  var t = e.scrollTop, n = e.scrollHeight, r = e.clientHeight;
  return [
    t,
    n,
    r
  ];
}, Z_ = function(e) {
  var t = e.scrollLeft, n = e.scrollWidth, r = e.clientWidth;
  return [
    t,
    n,
    r
  ];
}, pu = function(e, t) {
  return e === "v" ? V_(t) : W_(t);
}, mu = function(e, t) {
  return e === "v" ? H_(t) : Z_(t);
}, q_ = function(e, t) {
  return e === "h" && t === "rtl" ? -1 : 1;
}, G_ = function(e, t, n, r, o) {
  var a = q_(e, window.getComputedStyle(t).direction), i = a * r, c = n.target, l = t.contains(c), d = !1, f = i > 0, u = 0, h = 0;
  do {
    if (!c)
      break;
    var g = mu(e, c), b = g[0], v = g[1], y = g[2], w = v - y - a * b;
    (b || w) && pu(e, c) && (u += w, h += b);
    var k = c.parentNode;
    c = k && k.nodeType === Node.DOCUMENT_FRAGMENT_NODE ? k.host : k;
  } while (
    // portaled content
    !l && c !== document.body || // self content
    l && (t.contains(c) || t === c)
  );
  return (f && Math.abs(u) < 1 || !f && Math.abs(h) < 1) && (d = !0), d;
}, ao = function(e) {
  return "changedTouches" in e ? [e.changedTouches[0].clientX, e.changedTouches[0].clientY] : [0, 0];
}, Qc = function(e) {
  return [e.deltaX, e.deltaY];
}, Kc = function(e) {
  return e && "current" in e ? e.current : e;
}, Y_ = function(e, t) {
  return e[0] === t[0] && e[1] === t[1];
}, Q_ = function(e) {
  return `
  .block-interactivity-`.concat(e, ` {pointer-events: none;}
  .allow-interactivity-`).concat(e, ` {pointer-events: all;}
`);
}, K_ = 0, Qn = [];
function J_(e) {
  var t = m.useRef([]), n = m.useRef([0, 0]), r = m.useRef(), o = m.useState(K_++)[0], a = m.useState(uu)[0], i = m.useRef(e);
  m.useEffect(function() {
    i.current = e;
  }, [e]), m.useEffect(function() {
    if (e.inert) {
      document.body.classList.add("block-interactivity-".concat(o));
      var v = b_([e.lockRef.current], (e.shards || []).map(Kc), !0).filter(Boolean);
      return v.forEach(function(y) {
        return y.classList.add("allow-interactivity-".concat(o));
      }), function() {
        document.body.classList.remove("block-interactivity-".concat(o)), v.forEach(function(y) {
          return y.classList.remove("allow-interactivity-".concat(o));
        });
      };
    }
  }, [e.inert, e.lockRef.current, e.shards]);
  var c = m.useCallback(function(v, y) {
    if ("touches" in v && v.touches.length === 2 || v.type === "wheel" && v.ctrlKey)
      return !i.current.allowPinchZoom;
    var w = ao(v), k = n.current, _ = "deltaX" in v ? v.deltaX : k[0] - w[0], x = "deltaY" in v ? v.deltaY : k[1] - w[1], S, I = v.target, R = Math.abs(_) > Math.abs(x) ? "h" : "v";
    if ("touches" in v && R === "h" && I.type === "range")
      return !1;
    var E = window.getSelection(), P = E && E.anchorNode, O = P ? P === I || P.contains(I) : !1;
    if (O)
      return !1;
    var T = Yc(R, I);
    if (!T)
      return !0;
    if (T ? S = R : (S = R === "v" ? "h" : "v", T = Yc(R, I)), !T)
      return !1;
    if (!r.current && "changedTouches" in v && (_ || x) && (r.current = S), !S)
      return !0;
    var D = r.current || S;
    return G_(D, y, v, D === "h" ? _ : x);
  }, []), l = m.useCallback(function(v) {
    var y = v;
    if (!(!Qn.length || Qn[Qn.length - 1] !== a)) {
      var w = "deltaY" in y ? Qc(y) : ao(y), k = t.current.filter(function(S) {
        return S.name === y.type && (S.target === y.target || y.target === S.shadowParent) && Y_(S.delta, w);
      })[0];
      if (k && k.should) {
        y.cancelable && y.preventDefault();
        return;
      }
      if (!k) {
        var _ = (i.current.shards || []).map(Kc).filter(Boolean).filter(function(S) {
          return S.contains(y.target);
        }), x = _.length > 0 ? c(y, _[0]) : !i.current.noIsolation;
        x && y.cancelable && y.preventDefault();
      }
    }
  }, []), d = m.useCallback(function(v, y, w, k) {
    var _ = { name: v, delta: y, target: w, should: k, shadowParent: X_(w) };
    t.current.push(_), setTimeout(function() {
      t.current = t.current.filter(function(x) {
        return x !== _;
      });
    }, 1);
  }, []), f = m.useCallback(function(v) {
    n.current = ao(v), r.current = void 0;
  }, []), u = m.useCallback(function(v) {
    d(v.type, Qc(v), v.target, c(v, e.lockRef.current));
  }, []), h = m.useCallback(function(v) {
    d(v.type, ao(v), v.target, c(v, e.lockRef.current));
  }, []);
  m.useEffect(function() {
    return Qn.push(a), e.setCallbacks({
      onScrollCapture: u,
      onWheelCapture: u,
      onTouchMoveCapture: h
    }), document.addEventListener("wheel", l, Yn), document.addEventListener("touchmove", l, Yn), document.addEventListener("touchstart", f, Yn), function() {
      Qn = Qn.filter(function(v) {
        return v !== a;
      }), document.removeEventListener("wheel", l, Yn), document.removeEventListener("touchmove", l, Yn), document.removeEventListener("touchstart", f, Yn);
    };
  }, []);
  var g = e.removeScrollBar, b = e.inert;
  return m.createElement(
    m.Fragment,
    null,
    b ? m.createElement(a, { styles: Q_(o) }) : null,
    g ? m.createElement(B_, { noRelative: e.noRelative, gapMode: e.gapMode }) : null
  );
}
function X_(e) {
  for (var t = null; e !== null; )
    e instanceof ShadowRoot && (t = e.host, e = e.host), e = e.parentNode;
  return t;
}
const ek = A_(du, J_);
var ni = m.forwardRef(function(e, t) {
  return m.createElement(es, Ht({}, e, { ref: t, sideCar: ek }));
});
ni.classNames = es.classNames;
var tk = [" ", "Enter", "ArrowUp", "ArrowDown"], nk = [" ", "Enter"], Ln = "Select", [ts, ns, rk] = Wa(Ln), [mr] = _n(Ln, [
  rk,
  Qd
]), rs = Qd(), [ok, kn] = mr(Ln), [sk, ak] = mr(Ln), hu = (e) => {
  const {
    __scopeSelect: t,
    children: n,
    open: r,
    defaultOpen: o,
    onOpenChange: a,
    value: i,
    defaultValue: c,
    onValueChange: l,
    dir: d,
    name: f,
    autoComplete: u,
    disabled: h,
    required: g,
    form: b
  } = e, v = rs(t), [y, w] = m.useState(null), [k, _] = m.useState(null), [x, S] = m.useState(!1), I = Yo(d), [R, E] = vn({
    prop: r,
    defaultProp: o ?? !1,
    onChange: a,
    caller: Ln
  }), [P, O] = vn({
    prop: i,
    defaultProp: c,
    onChange: l,
    caller: Ln
  }), T = m.useRef(null), D = y ? b || !!y.closest("form") : !0, [j, z] = m.useState(/* @__PURE__ */ new Set()), W = Array.from(j).map(($) => $.props.value).join(";");
  return /* @__PURE__ */ s(Xx, { ...v, children: /* @__PURE__ */ p(
    ok,
    {
      required: g,
      scope: t,
      trigger: y,
      onTriggerChange: w,
      valueNode: k,
      onValueNodeChange: _,
      valueNodeHasChildren: x,
      onValueNodeHasChildrenChange: S,
      contentId: qt(),
      value: P,
      onValueChange: O,
      open: R,
      onOpenChange: E,
      dir: I,
      triggerPointerDownPosRef: T,
      disabled: h,
      children: [
        /* @__PURE__ */ s(ts.Provider, { scope: t, children: /* @__PURE__ */ s(
          sk,
          {
            scope: e.__scopeSelect,
            onNativeOptionAdd: m.useCallback(($) => {
              z((C) => new Set(C).add($));
            }, []),
            onNativeOptionRemove: m.useCallback(($) => {
              z((C) => {
                const N = new Set(C);
                return N.delete($), N;
              });
            }, []),
            children: n
          }
        ) }),
        D ? /* @__PURE__ */ p(
          Lu,
          {
            "aria-hidden": !0,
            required: g,
            tabIndex: -1,
            name: f,
            autoComplete: u,
            value: P,
            onChange: ($) => O($.target.value),
            disabled: h,
            form: b,
            children: [
              P === void 0 ? /* @__PURE__ */ s("option", { value: "" }) : null,
              Array.from(j)
            ]
          },
          W
        ) : null
      ]
    }
  ) });
};
hu.displayName = Ln;
var gu = "SelectTrigger", yu = m.forwardRef(
  (e, t) => {
    const { __scopeSelect: n, disabled: r = !1, ...o } = e, a = rs(n), i = kn(gu, n), c = i.disabled || r, l = Re(t, i.onTriggerChange), d = ns(n), f = m.useRef("touch"), [u, h, g] = $u((v) => {
      const y = d().filter((_) => !_.disabled), w = y.find((_) => _.value === i.value), k = zu(y, v, w);
      k !== void 0 && i.onValueChange(k.value);
    }), b = (v) => {
      c || (i.onOpenChange(!0), g()), v && (i.triggerPointerDownPosRef.current = {
        x: Math.round(v.pageX),
        y: Math.round(v.pageY)
      });
    };
    return /* @__PURE__ */ s(e_, { asChild: !0, ...a, children: /* @__PURE__ */ s(
      be.button,
      {
        type: "button",
        role: "combobox",
        "aria-controls": i.contentId,
        "aria-expanded": i.open,
        "aria-required": i.required,
        "aria-autocomplete": "none",
        dir: i.dir,
        "data-state": i.open ? "open" : "closed",
        disabled: c,
        "data-disabled": c ? "" : void 0,
        "data-placeholder": Du(i.value) ? "" : void 0,
        ...o,
        ref: l,
        onClick: xe(o.onClick, (v) => {
          v.currentTarget.focus(), f.current !== "mouse" && b(v);
        }),
        onPointerDown: xe(o.onPointerDown, (v) => {
          f.current = v.pointerType;
          const y = v.target;
          y.hasPointerCapture(v.pointerId) && y.releasePointerCapture(v.pointerId), v.button === 0 && v.ctrlKey === !1 && v.pointerType === "mouse" && (b(v), v.preventDefault());
        }),
        onKeyDown: xe(o.onKeyDown, (v) => {
          const y = u.current !== "";
          !(v.ctrlKey || v.altKey || v.metaKey) && v.key.length === 1 && h(v.key), !(y && v.key === " ") && tk.includes(v.key) && (b(), v.preventDefault());
        })
      }
    ) });
  }
);
yu.displayName = gu;
var vu = "SelectValue", bu = m.forwardRef(
  (e, t) => {
    const { __scopeSelect: n, className: r, style: o, children: a, placeholder: i = "", ...c } = e, l = kn(vu, n), { onValueNodeHasChildrenChange: d } = l, f = a !== void 0, u = Re(t, l.onValueNodeChange);
    return Xe(() => {
      d(f);
    }, [d, f]), /* @__PURE__ */ s(
      be.span,
      {
        ...c,
        ref: u,
        style: { pointerEvents: "none" },
        children: Du(l.value) ? /* @__PURE__ */ s(Ct, { children: i }) : a
      }
    );
  }
);
bu.displayName = vu;
var ik = "SelectIcon", wu = m.forwardRef(
  (e, t) => {
    const { __scopeSelect: n, children: r, ...o } = e;
    return /* @__PURE__ */ s(be.span, { "aria-hidden": !0, ...o, ref: t, children: r || "▼" });
  }
);
wu.displayName = ik;
var ck = "SelectPortal", xu = (e) => /* @__PURE__ */ s(ti, { asChild: !0, ...e });
xu.displayName = ck;
var Dn = "SelectContent", _u = m.forwardRef(
  (e, t) => {
    const n = kn(Dn, e.__scopeSelect), [r, o] = m.useState();
    if (Xe(() => {
      o(new DocumentFragment());
    }, []), !n.open) {
      const a = r;
      return a ? zo.createPortal(
        /* @__PURE__ */ s(ku, { scope: e.__scopeSelect, children: /* @__PURE__ */ s(ts.Slot, { scope: e.__scopeSelect, children: /* @__PURE__ */ s("div", { children: e.children }) }) }),
        a
      ) : null;
    }
    return /* @__PURE__ */ s(Su, { ...e, ref: t });
  }
);
_u.displayName = Dn;
var Ot = 10, [ku, Sn] = mr(Dn), lk = "SelectContentImpl", dk = /* @__PURE__ */ o_("SelectContent.RemoveScroll"), Su = m.forwardRef(
  (e, t) => {
    const {
      __scopeSelect: n,
      position: r = "item-aligned",
      onCloseAutoFocus: o,
      onEscapeKeyDown: a,
      onPointerDownOutside: i,
      //
      // PopperContent props
      side: c,
      sideOffset: l,
      align: d,
      alignOffset: f,
      arrowPadding: u,
      collisionBoundary: h,
      collisionPadding: g,
      sticky: b,
      hideWhenDetached: v,
      avoidCollisions: y,
      //
      ...w
    } = e, k = kn(Dn, n), [_, x] = m.useState(null), [S, I] = m.useState(null), R = Re(t, (F) => x(F)), [E, P] = m.useState(null), [O, T] = m.useState(
      null
    ), D = ns(n), [j, z] = m.useState(!1), W = m.useRef(!1);
    m.useEffect(() => {
      if (_) return iu(_);
    }, [_]), Ld();
    const $ = m.useCallback(
      (F) => {
        const [Y, ...he] = D().map((ue) => ue.ref.current), [V] = he.slice(-1), ie = document.activeElement;
        for (const ue of F)
          if (ue === ie || (ue?.scrollIntoView({ block: "nearest" }), ue === Y && S && (S.scrollTop = 0), ue === V && S && (S.scrollTop = S.scrollHeight), ue?.focus(), document.activeElement !== ie)) return;
      },
      [D, S]
    ), C = m.useCallback(
      () => $([E, _]),
      [$, E, _]
    );
    m.useEffect(() => {
      j && C();
    }, [j, C]);
    const { onOpenChange: N, triggerPointerDownPosRef: H } = k;
    m.useEffect(() => {
      if (_) {
        let F = { x: 0, y: 0 };
        const Y = (V) => {
          F = {
            x: Math.abs(Math.round(V.pageX) - (H.current?.x ?? 0)),
            y: Math.abs(Math.round(V.pageY) - (H.current?.y ?? 0))
          };
        }, he = (V) => {
          F.x <= 10 && F.y <= 10 ? V.preventDefault() : _.contains(V.target) || N(!1), document.removeEventListener("pointermove", Y), H.current = null;
        };
        return H.current !== null && (document.addEventListener("pointermove", Y), document.addEventListener("pointerup", he, { capture: !0, once: !0 })), () => {
          document.removeEventListener("pointermove", Y), document.removeEventListener("pointerup", he, { capture: !0 });
        };
      }
    }, [_, N, H]), m.useEffect(() => {
      const F = () => N(!1);
      return window.addEventListener("blur", F), window.addEventListener("resize", F), () => {
        window.removeEventListener("blur", F), window.removeEventListener("resize", F);
      };
    }, [N]);
    const [G, J] = $u((F) => {
      const Y = D().filter((ie) => !ie.disabled), he = Y.find((ie) => ie.ref.current === document.activeElement), V = zu(Y, F, he);
      V && setTimeout(() => V.ref.current.focus());
    }), fe = m.useCallback(
      (F, Y, he) => {
        const V = !W.current && !he;
        (k.value !== void 0 && k.value === Y || V) && (P(F), V && (W.current = !0));
      },
      [k.value]
    ), Z = m.useCallback(() => _?.focus(), [_]), X = m.useCallback(
      (F, Y, he) => {
        const V = !W.current && !he;
        (k.value !== void 0 && k.value === Y || V) && T(F);
      },
      [k.value]
    ), Q = r === "popper" ? fa : Cu, ge = Q === fa ? {
      side: c,
      sideOffset: l,
      align: d,
      alignOffset: f,
      arrowPadding: u,
      collisionBoundary: h,
      collisionPadding: g,
      sticky: b,
      hideWhenDetached: v,
      avoidCollisions: y
    } : {};
    return /* @__PURE__ */ s(
      ku,
      {
        scope: n,
        content: _,
        viewport: S,
        onViewportChange: I,
        itemRefCallback: fe,
        selectedItem: E,
        onItemLeave: Z,
        itemTextRefCallback: X,
        focusSelectedItem: C,
        selectedItemText: O,
        position: r,
        isPositioned: j,
        searchRef: G,
        children: /* @__PURE__ */ s(ni, { as: dk, allowPinchZoom: !0, children: /* @__PURE__ */ s(
          Za,
          {
            asChild: !0,
            trapped: k.open,
            onMountAutoFocus: (F) => {
              F.preventDefault();
            },
            onUnmountAutoFocus: xe(o, (F) => {
              k.trigger?.focus({ preventScroll: !0 }), F.preventDefault();
            }),
            children: /* @__PURE__ */ s(
              Ha,
              {
                asChild: !0,
                disableOutsidePointerEvents: !0,
                onEscapeKeyDown: a,
                onPointerDownOutside: i,
                onFocusOutside: (F) => F.preventDefault(),
                onDismiss: () => k.onOpenChange(!1),
                children: /* @__PURE__ */ s(
                  Q,
                  {
                    role: "listbox",
                    id: k.contentId,
                    "data-state": k.open ? "open" : "closed",
                    dir: k.dir,
                    onContextMenu: (F) => F.preventDefault(),
                    ...w,
                    ...ge,
                    onPlaced: () => z(!0),
                    ref: R,
                    style: {
                      // flex layout so we can place the scroll buttons properly
                      display: "flex",
                      flexDirection: "column",
                      // reset the outline by default as the content MAY get focused
                      outline: "none",
                      ...w.style
                    },
                    onKeyDown: xe(w.onKeyDown, (F) => {
                      const Y = F.ctrlKey || F.altKey || F.metaKey;
                      if (F.key === "Tab" && F.preventDefault(), !Y && F.key.length === 1 && J(F.key), ["ArrowUp", "ArrowDown", "Home", "End"].includes(F.key)) {
                        let V = D().filter((ie) => !ie.disabled).map((ie) => ie.ref.current);
                        if (["ArrowUp", "End"].includes(F.key) && (V = V.slice().reverse()), ["ArrowUp", "ArrowDown"].includes(F.key)) {
                          const ie = F.target, ue = V.indexOf(ie);
                          V = V.slice(ue + 1);
                        }
                        setTimeout(() => $(V)), F.preventDefault();
                      }
                    })
                  }
                )
              }
            )
          }
        ) })
      }
    );
  }
);
Su.displayName = lk;
var uk = "SelectItemAlignedPosition", Cu = m.forwardRef((e, t) => {
  const { __scopeSelect: n, onPlaced: r, ...o } = e, a = kn(Dn, n), i = Sn(Dn, n), [c, l] = m.useState(null), [d, f] = m.useState(null), u = Re(t, (R) => f(R)), h = ns(n), g = m.useRef(!1), b = m.useRef(!0), { viewport: v, selectedItem: y, selectedItemText: w, focusSelectedItem: k } = i, _ = m.useCallback(() => {
    if (a.trigger && a.valueNode && c && d && v && y && w) {
      const R = a.trigger.getBoundingClientRect(), E = d.getBoundingClientRect(), P = a.valueNode.getBoundingClientRect(), O = w.getBoundingClientRect();
      if (a.dir !== "rtl") {
        const ie = O.left - E.left, ue = P.left - ie, pe = R.left - ue, $e = R.width + pe, Ye = Math.max($e, E.width), et = window.innerWidth - Ot, Qe = Ec(ue, [
          Ot,
          // Prevents the content from going off the starting edge of the
          // viewport. It may still go off the ending edge, but this can be
          // controlled by the user since they may want to manage overflow in a
          // specific way.
          // https://github.com/radix-ui/primitives/issues/2049
          Math.max(Ot, et - Ye)
        ]);
        c.style.minWidth = $e + "px", c.style.left = Qe + "px";
      } else {
        const ie = E.right - O.right, ue = window.innerWidth - P.right - ie, pe = window.innerWidth - R.right - ue, $e = R.width + pe, Ye = Math.max($e, E.width), et = window.innerWidth - Ot, Qe = Ec(ue, [
          Ot,
          Math.max(Ot, et - Ye)
        ]);
        c.style.minWidth = $e + "px", c.style.right = Qe + "px";
      }
      const T = h(), D = window.innerHeight - Ot * 2, j = v.scrollHeight, z = window.getComputedStyle(d), W = parseInt(z.borderTopWidth, 10), $ = parseInt(z.paddingTop, 10), C = parseInt(z.borderBottomWidth, 10), N = parseInt(z.paddingBottom, 10), H = W + $ + j + N + C, G = Math.min(y.offsetHeight * 5, H), J = window.getComputedStyle(v), fe = parseInt(J.paddingTop, 10), Z = parseInt(J.paddingBottom, 10), X = R.top + R.height / 2 - Ot, Q = D - X, ge = y.offsetHeight / 2, F = y.offsetTop + ge, Y = W + $ + F, he = H - Y;
      if (Y <= X) {
        const ie = T.length > 0 && y === T[T.length - 1].ref.current;
        c.style.bottom = "0px";
        const ue = d.clientHeight - v.offsetTop - v.offsetHeight, pe = Math.max(
          Q,
          ge + // viewport might have padding bottom, include it to avoid a scrollable viewport
          (ie ? Z : 0) + ue + C
        ), $e = Y + pe;
        c.style.height = $e + "px";
      } else {
        const ie = T.length > 0 && y === T[0].ref.current;
        c.style.top = "0px";
        const pe = Math.max(
          X,
          W + v.offsetTop + // viewport might have padding top, include it to avoid a scrollable viewport
          (ie ? fe : 0) + ge
        ) + he;
        c.style.height = pe + "px", v.scrollTop = Y - X + v.offsetTop;
      }
      c.style.margin = `${Ot}px 0`, c.style.minHeight = G + "px", c.style.maxHeight = D + "px", r?.(), requestAnimationFrame(() => g.current = !0);
    }
  }, [
    h,
    a.trigger,
    a.valueNode,
    c,
    d,
    v,
    y,
    w,
    a.dir,
    r
  ]);
  Xe(() => _(), [_]);
  const [x, S] = m.useState();
  Xe(() => {
    d && S(window.getComputedStyle(d).zIndex);
  }, [d]);
  const I = m.useCallback(
    (R) => {
      R && b.current === !0 && (_(), k?.(), b.current = !1);
    },
    [_, k]
  );
  return /* @__PURE__ */ s(
    pk,
    {
      scope: n,
      contentWrapper: c,
      shouldExpandOnScrollRef: g,
      onScrollButtonChange: I,
      children: /* @__PURE__ */ s(
        "div",
        {
          ref: l,
          style: {
            display: "flex",
            flexDirection: "column",
            position: "fixed",
            zIndex: x
          },
          children: /* @__PURE__ */ s(
            be.div,
            {
              ...o,
              ref: u,
              style: {
                // When we get the height of the content, it includes borders. If we were to set
                // the height without having `boxSizing: 'border-box'` it would be too big.
                boxSizing: "border-box",
                // We need to ensure the content doesn't get taller than the wrapper
                maxHeight: "100%",
                ...o.style
              }
            }
          )
        }
      )
    }
  );
});
Cu.displayName = uk;
var fk = "SelectPopperPosition", fa = m.forwardRef((e, t) => {
  const {
    __scopeSelect: n,
    align: r = "start",
    collisionPadding: o = Ot,
    ...a
  } = e, i = rs(n);
  return /* @__PURE__ */ s(
    t_,
    {
      ...i,
      ...a,
      ref: t,
      align: r,
      collisionPadding: o,
      style: {
        // Ensure border-box for floating-ui calculations
        boxSizing: "border-box",
        ...a.style,
        "--radix-select-content-transform-origin": "var(--radix-popper-transform-origin)",
        "--radix-select-content-available-width": "var(--radix-popper-available-width)",
        "--radix-select-content-available-height": "var(--radix-popper-available-height)",
        "--radix-select-trigger-width": "var(--radix-popper-anchor-width)",
        "--radix-select-trigger-height": "var(--radix-popper-anchor-height)"
      }
    }
  );
});
fa.displayName = fk;
var [pk, ri] = mr(Dn, {}), pa = "SelectViewport", Nu = m.forwardRef(
  (e, t) => {
    const { __scopeSelect: n, nonce: r, ...o } = e, a = Sn(pa, n), i = ri(pa, n), c = Re(t, a.onViewportChange), l = m.useRef(0);
    return /* @__PURE__ */ p(Ct, { children: [
      /* @__PURE__ */ s(
        "style",
        {
          dangerouslySetInnerHTML: {
            __html: "[data-radix-select-viewport]{scrollbar-width:none;-ms-overflow-style:none;-webkit-overflow-scrolling:touch;}[data-radix-select-viewport]::-webkit-scrollbar{display:none}"
          },
          nonce: r
        }
      ),
      /* @__PURE__ */ s(ts.Slot, { scope: n, children: /* @__PURE__ */ s(
        be.div,
        {
          "data-radix-select-viewport": "",
          role: "presentation",
          ...o,
          ref: c,
          style: {
            // we use position: 'relative' here on the `viewport` so that when we call
            // `selectedItem.offsetTop` in calculations, the offset is relative to the viewport
            // (independent of the scrollUpButton).
            position: "relative",
            flex: 1,
            // Viewport should only be scrollable in the vertical direction.
            // This won't work in vertical writing modes, so we'll need to
            // revisit this if/when that is supported
            // https://developer.chrome.com/blog/vertical-form-controls
            overflow: "hidden auto",
            ...o.style
          },
          onScroll: xe(o.onScroll, (d) => {
            const f = d.currentTarget, { contentWrapper: u, shouldExpandOnScrollRef: h } = i;
            if (h?.current && u) {
              const g = Math.abs(l.current - f.scrollTop);
              if (g > 0) {
                const b = window.innerHeight - Ot * 2, v = parseFloat(u.style.minHeight), y = parseFloat(u.style.height), w = Math.max(v, y);
                if (w < b) {
                  const k = w + g, _ = Math.min(b, k), x = k - _;
                  u.style.height = _ + "px", u.style.bottom === "0px" && (f.scrollTop = x > 0 ? x : 0, u.style.justifyContent = "flex-end");
                }
              }
            }
            l.current = f.scrollTop;
          })
        }
      ) })
    ] });
  }
);
Nu.displayName = pa;
var Eu = "SelectGroup", [mk, hk] = mr(Eu), Au = m.forwardRef(
  (e, t) => {
    const { __scopeSelect: n, ...r } = e, o = qt();
    return /* @__PURE__ */ s(mk, { scope: n, id: o, children: /* @__PURE__ */ s(be.div, { role: "group", "aria-labelledby": o, ...r, ref: t }) });
  }
);
Au.displayName = Eu;
var Pu = "SelectLabel", gk = m.forwardRef(
  (e, t) => {
    const { __scopeSelect: n, ...r } = e, o = hk(Pu, n);
    return /* @__PURE__ */ s(be.div, { id: o.id, ...r, ref: t });
  }
);
gk.displayName = Pu;
var Ro = "SelectItem", [yk, Iu] = mr(Ro), Tu = m.forwardRef(
  (e, t) => {
    const {
      __scopeSelect: n,
      value: r,
      disabled: o = !1,
      textValue: a,
      ...i
    } = e, c = kn(Ro, n), l = Sn(Ro, n), d = c.value === r, [f, u] = m.useState(a ?? ""), [h, g] = m.useState(!1), b = Re(
      t,
      (k) => l.itemRefCallback?.(k, r, o)
    ), v = qt(), y = m.useRef("touch"), w = () => {
      o || (c.onValueChange(r), c.onOpenChange(!1));
    };
    if (r === "")
      throw new Error(
        "A <Select.Item /> must have a value prop that is not an empty string. This is because the Select value can be set to an empty string to clear the selection and show the placeholder."
      );
    return /* @__PURE__ */ s(
      yk,
      {
        scope: n,
        value: r,
        disabled: o,
        textId: v,
        isSelected: d,
        onItemTextChange: m.useCallback((k) => {
          u((_) => _ || (k?.textContent ?? "").trim());
        }, []),
        children: /* @__PURE__ */ s(
          ts.ItemSlot,
          {
            scope: n,
            value: r,
            disabled: o,
            textValue: f,
            children: /* @__PURE__ */ s(
              be.div,
              {
                role: "option",
                "aria-labelledby": v,
                "data-highlighted": h ? "" : void 0,
                "aria-selected": d && h,
                "data-state": d ? "checked" : "unchecked",
                "aria-disabled": o || void 0,
                "data-disabled": o ? "" : void 0,
                tabIndex: o ? void 0 : -1,
                ...i,
                ref: b,
                onFocus: xe(i.onFocus, () => g(!0)),
                onBlur: xe(i.onBlur, () => g(!1)),
                onClick: xe(i.onClick, () => {
                  y.current !== "mouse" && w();
                }),
                onPointerUp: xe(i.onPointerUp, () => {
                  y.current === "mouse" && w();
                }),
                onPointerDown: xe(i.onPointerDown, (k) => {
                  y.current = k.pointerType;
                }),
                onPointerMove: xe(i.onPointerMove, (k) => {
                  y.current = k.pointerType, o ? l.onItemLeave?.() : y.current === "mouse" && k.currentTarget.focus({ preventScroll: !0 });
                }),
                onPointerLeave: xe(i.onPointerLeave, (k) => {
                  k.currentTarget === document.activeElement && l.onItemLeave?.();
                }),
                onKeyDown: xe(i.onKeyDown, (k) => {
                  l.searchRef?.current !== "" && k.key === " " || (nk.includes(k.key) && w(), k.key === " " && k.preventDefault());
                })
              }
            )
          }
        )
      }
    );
  }
);
Tu.displayName = Ro;
var Nr = "SelectItemText", Ru = m.forwardRef(
  (e, t) => {
    const { __scopeSelect: n, className: r, style: o, ...a } = e, i = kn(Nr, n), c = Sn(Nr, n), l = Iu(Nr, n), d = ak(Nr, n), [f, u] = m.useState(null), h = Re(
      t,
      (w) => u(w),
      l.onItemTextChange,
      (w) => c.itemTextRefCallback?.(w, l.value, l.disabled)
    ), g = f?.textContent, b = m.useMemo(
      () => /* @__PURE__ */ s("option", { value: l.value, disabled: l.disabled, children: g }, l.value),
      [l.disabled, l.value, g]
    ), { onNativeOptionAdd: v, onNativeOptionRemove: y } = d;
    return Xe(() => (v(b), () => y(b)), [v, y, b]), /* @__PURE__ */ p(Ct, { children: [
      /* @__PURE__ */ s(be.span, { id: l.textId, ...a, ref: h }),
      l.isSelected && i.valueNode && !i.valueNodeHasChildren ? zo.createPortal(a.children, i.valueNode) : null
    ] });
  }
);
Ru.displayName = Nr;
var Ou = "SelectItemIndicator", vk = m.forwardRef(
  (e, t) => {
    const { __scopeSelect: n, ...r } = e;
    return Iu(Ou, n).isSelected ? /* @__PURE__ */ s(be.span, { "aria-hidden": !0, ...r, ref: t }) : null;
  }
);
vk.displayName = Ou;
var ma = "SelectScrollUpButton", bk = m.forwardRef((e, t) => {
  const n = Sn(ma, e.__scopeSelect), r = ri(ma, e.__scopeSelect), [o, a] = m.useState(!1), i = Re(t, r.onScrollButtonChange);
  return Xe(() => {
    if (n.viewport && n.isPositioned) {
      let c = function() {
        const d = l.scrollTop > 0;
        a(d);
      };
      const l = n.viewport;
      return c(), l.addEventListener("scroll", c), () => l.removeEventListener("scroll", c);
    }
  }, [n.viewport, n.isPositioned]), o ? /* @__PURE__ */ s(
    Mu,
    {
      ...e,
      ref: i,
      onAutoScroll: () => {
        const { viewport: c, selectedItem: l } = n;
        c && l && (c.scrollTop = c.scrollTop - l.offsetHeight);
      }
    }
  ) : null;
});
bk.displayName = ma;
var ha = "SelectScrollDownButton", wk = m.forwardRef((e, t) => {
  const n = Sn(ha, e.__scopeSelect), r = ri(ha, e.__scopeSelect), [o, a] = m.useState(!1), i = Re(t, r.onScrollButtonChange);
  return Xe(() => {
    if (n.viewport && n.isPositioned) {
      let c = function() {
        const d = l.scrollHeight - l.clientHeight, f = Math.ceil(l.scrollTop) < d;
        a(f);
      };
      const l = n.viewport;
      return c(), l.addEventListener("scroll", c), () => l.removeEventListener("scroll", c);
    }
  }, [n.viewport, n.isPositioned]), o ? /* @__PURE__ */ s(
    Mu,
    {
      ...e,
      ref: i,
      onAutoScroll: () => {
        const { viewport: c, selectedItem: l } = n;
        c && l && (c.scrollTop = c.scrollTop + l.offsetHeight);
      }
    }
  ) : null;
});
wk.displayName = ha;
var Mu = m.forwardRef((e, t) => {
  const { __scopeSelect: n, onAutoScroll: r, ...o } = e, a = Sn("SelectScrollButton", n), i = m.useRef(null), c = ns(n), l = m.useCallback(() => {
    i.current !== null && (window.clearInterval(i.current), i.current = null);
  }, []);
  return m.useEffect(() => () => l(), [l]), Xe(() => {
    c().find((f) => f.ref.current === document.activeElement)?.ref.current?.scrollIntoView({ block: "nearest" });
  }, [c]), /* @__PURE__ */ s(
    be.div,
    {
      "aria-hidden": !0,
      ...o,
      ref: t,
      style: { flexShrink: 0, ...o.style },
      onPointerDown: xe(o.onPointerDown, () => {
        i.current === null && (i.current = window.setInterval(r, 50));
      }),
      onPointerMove: xe(o.onPointerMove, () => {
        a.onItemLeave?.(), i.current === null && (i.current = window.setInterval(r, 50));
      }),
      onPointerLeave: xe(o.onPointerLeave, () => {
        l();
      })
    }
  );
}), xk = "SelectSeparator", _k = m.forwardRef(
  (e, t) => {
    const { __scopeSelect: n, ...r } = e;
    return /* @__PURE__ */ s(be.div, { "aria-hidden": !0, ...r, ref: t });
  }
);
_k.displayName = xk;
var ga = "SelectArrow", kk = m.forwardRef(
  (e, t) => {
    const { __scopeSelect: n, ...r } = e, o = rs(n), a = kn(ga, n), i = Sn(ga, n);
    return a.open && i.position === "popper" ? /* @__PURE__ */ s(n_, { ...o, ...r, ref: t }) : null;
  }
);
kk.displayName = ga;
var Sk = "SelectBubbleInput", Lu = m.forwardRef(
  ({ __scopeSelect: e, value: t, ...n }, r) => {
    const o = m.useRef(null), a = Re(r, o), i = p_(t);
    return m.useEffect(() => {
      const c = o.current;
      if (!c) return;
      const l = window.HTMLSelectElement.prototype, f = Object.getOwnPropertyDescriptor(
        l,
        "value"
      ).set;
      if (i !== t && f) {
        const u = new Event("change", { bubbles: !0 });
        f.call(c, t), c.dispatchEvent(u);
      }
    }, [i, t]), /* @__PURE__ */ s(
      be.select,
      {
        ...n,
        style: { ...su, ...n.style },
        ref: a,
        defaultValue: t
      }
    );
  }
);
Lu.displayName = Sk;
function Du(e) {
  return e === "" || e === void 0;
}
function $u(e) {
  const t = hn(e), n = m.useRef(""), r = m.useRef(0), o = m.useCallback(
    (i) => {
      const c = n.current + i;
      t(c), (function l(d) {
        n.current = d, window.clearTimeout(r.current), d !== "" && (r.current = window.setTimeout(() => l(""), 1e3));
      })(c);
    },
    [t]
  ), a = m.useCallback(() => {
    n.current = "", window.clearTimeout(r.current);
  }, []);
  return m.useEffect(() => () => window.clearTimeout(r.current), []), [n, o, a];
}
function zu(e, t, n) {
  const o = t.length > 1 && Array.from(t).every((d) => d === t[0]) ? t[0] : t, a = n ? e.indexOf(n) : -1;
  let i = Ck(e, Math.max(a, 0));
  o.length === 1 && (i = i.filter((d) => d !== n));
  const l = i.find(
    (d) => d.textValue.toLowerCase().startsWith(o.toLowerCase())
  );
  return l !== n ? l : void 0;
}
function Ck(e, t) {
  return e.map((n, r) => e[(t + r) % e.length]);
}
var Nk = hu, Fu = yu, Ek = bu, Ak = wu, Pk = xu, ju = _u, Ik = Nu, Tk = Au, Bu = Tu, Rk = Ru;
const Oo = Nk, Ok = Tk, Mo = Ek, Dr = m.forwardRef(({ className: e, children: t, ...n }, r) => /* @__PURE__ */ p(
  Fu,
  {
    ref: r,
    className: B(
      "flex h-10 w-full items-center justify-between rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50 dark:focus-visible:ring-neutral-50/20",
      e
    ),
    ...n,
    children: [
      t,
      /* @__PURE__ */ s(Ak, { className: "ml-2 text-neutral-500 dark:text-neutral-400", children: "▾" })
    ]
  }
));
Dr.displayName = Fu.displayName;
const $r = m.forwardRef(({ className: e, children: t, position: n = "popper", ...r }, o) => /* @__PURE__ */ s(Pk, { children: /* @__PURE__ */ s(
  ju,
  {
    ref: o,
    position: n,
    className: B(
      "z-50 min-w-[8rem] overflow-hidden rounded-md border border-neutral-200 bg-white text-neutral-950 shadow-md dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50",
      e
    ),
    ...r,
    children: /* @__PURE__ */ s(Ik, { className: B("p-1", n === "popper" ? "w-full" : void 0), children: t })
  }
) }));
$r.displayName = ju.displayName;
const zr = m.forwardRef(({ className: e, children: t, ...n }, r) => /* @__PURE__ */ s(
  Bu,
  {
    ref: r,
    className: B(
      "relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-neutral-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 dark:focus:bg-neutral-800",
      e
    ),
    ...n,
    children: /* @__PURE__ */ s(Rk, { children: t })
  }
));
zr.displayName = Bu.displayName;
function Mk(e, t) {
  return m.useReducer((n, r) => t[n][r] ?? n, e);
}
var hr = (e) => {
  const { present: t, children: n } = e, r = Lk(t), o = typeof n == "function" ? n({ present: r.isPresent }) : m.Children.only(n), a = Re(r.ref, Dk(o));
  return typeof n == "function" || r.isPresent ? m.cloneElement(o, { ref: a }) : null;
};
hr.displayName = "Presence";
function Lk(e) {
  const [t, n] = m.useState(), r = m.useRef(null), o = m.useRef(e), a = m.useRef("none"), i = e ? "mounted" : "unmounted", [c, l] = Mk(i, {
    mounted: {
      UNMOUNT: "unmounted",
      ANIMATION_OUT: "unmountSuspended"
    },
    unmountSuspended: {
      MOUNT: "mounted",
      ANIMATION_END: "unmounted"
    },
    unmounted: {
      MOUNT: "mounted"
    }
  });
  return m.useEffect(() => {
    const d = io(r.current);
    a.current = c === "mounted" ? d : "none";
  }, [c]), Xe(() => {
    const d = r.current, f = o.current;
    if (f !== e) {
      const h = a.current, g = io(d);
      e ? l("MOUNT") : g === "none" || d?.display === "none" ? l("UNMOUNT") : l(f && h !== g ? "ANIMATION_OUT" : "UNMOUNT"), o.current = e;
    }
  }, [e, l]), Xe(() => {
    if (t) {
      let d;
      const f = t.ownerDocument.defaultView ?? window, u = (g) => {
        const v = io(r.current).includes(CSS.escape(g.animationName));
        if (g.target === t && v && (l("ANIMATION_END"), !o.current)) {
          const y = t.style.animationFillMode;
          t.style.animationFillMode = "forwards", d = f.setTimeout(() => {
            t.style.animationFillMode === "forwards" && (t.style.animationFillMode = y);
          });
        }
      }, h = (g) => {
        g.target === t && (a.current = io(r.current));
      };
      return t.addEventListener("animationstart", h), t.addEventListener("animationcancel", u), t.addEventListener("animationend", u), () => {
        f.clearTimeout(d), t.removeEventListener("animationstart", h), t.removeEventListener("animationcancel", u), t.removeEventListener("animationend", u);
      };
    } else
      l("ANIMATION_END");
  }, [t, l]), {
    isPresent: ["mounted", "unmountSuspended"].includes(c),
    ref: m.useCallback((d) => {
      r.current = d ? getComputedStyle(d) : null, n(d);
    }, [])
  };
}
function io(e) {
  return e?.animationName || "none";
}
function Dk(e) {
  let t = Object.getOwnPropertyDescriptor(e.props, "ref")?.get, n = t && "isReactWarning" in t && t.isReactWarning;
  return n ? e.ref : (t = Object.getOwnPropertyDescriptor(e, "ref")?.get, n = t && "isReactWarning" in t && t.isReactWarning, n ? e.props.ref : e.props.ref || e.ref);
}
// @__NO_SIDE_EFFECTS__
function $k(e) {
  const t = /* @__PURE__ */ zk(e), n = m.forwardRef((r, o) => {
    const { children: a, ...i } = r, c = m.Children.toArray(a), l = c.find(jk);
    if (l) {
      const d = l.props.children, f = c.map((u) => u === l ? m.Children.count(d) > 1 ? m.Children.only(null) : m.isValidElement(d) ? d.props.children : null : u);
      return /* @__PURE__ */ s(t, { ...i, ref: o, children: m.isValidElement(d) ? m.cloneElement(d, void 0, f) : null });
    }
    return /* @__PURE__ */ s(t, { ...i, ref: o, children: a });
  });
  return n.displayName = `${e}.Slot`, n;
}
// @__NO_SIDE_EFFECTS__
function zk(e) {
  const t = m.forwardRef((n, r) => {
    const { children: o, ...a } = n;
    if (m.isValidElement(o)) {
      const i = Uk(o), c = Bk(a, o.props);
      return o.type !== m.Fragment && (c.ref = r ? lr(r, i) : i), m.cloneElement(o, c);
    }
    return m.Children.count(o) > 1 ? m.Children.only(null) : null;
  });
  return t.displayName = `${e}.SlotClone`, t;
}
var Fk = Symbol("radix.slottable");
function jk(e) {
  return m.isValidElement(e) && typeof e.type == "function" && "__radixId" in e.type && e.type.__radixId === Fk;
}
function Bk(e, t) {
  const n = { ...t };
  for (const r in t) {
    const o = e[r], a = t[r];
    /^on[A-Z]/.test(r) ? o && a ? n[r] = (...c) => {
      const l = a(...c);
      return o(...c), l;
    } : o && (n[r] = o) : r === "style" ? n[r] = { ...o, ...a } : r === "className" && (n[r] = [o, a].filter(Boolean).join(" "));
  }
  return { ...e, ...n };
}
function Uk(e) {
  let t = Object.getOwnPropertyDescriptor(e.props, "ref")?.get, n = t && "isReactWarning" in t && t.isReactWarning;
  return n ? e.ref : (t = Object.getOwnPropertyDescriptor(e, "ref")?.get, n = t && "isReactWarning" in t && t.isReactWarning, n ? e.props.ref : e.props.ref || e.ref);
}
var os = "Dialog", [Uu] = _n(os), [Vk, Ft] = Uu(os), Vu = (e) => {
  const {
    __scopeDialog: t,
    children: n,
    open: r,
    defaultOpen: o,
    onOpenChange: a,
    modal: i = !0
  } = e, c = m.useRef(null), l = m.useRef(null), [d, f] = vn({
    prop: r,
    defaultProp: o ?? !1,
    onChange: a,
    caller: os
  });
  return /* @__PURE__ */ s(
    Vk,
    {
      scope: t,
      triggerRef: c,
      contentRef: l,
      contentId: qt(),
      titleId: qt(),
      descriptionId: qt(),
      open: d,
      onOpenChange: f,
      onOpenToggle: m.useCallback(() => f((u) => !u), [f]),
      modal: i,
      children: n
    }
  );
};
Vu.displayName = os;
var Wu = "DialogTrigger", Hu = m.forwardRef(
  (e, t) => {
    const { __scopeDialog: n, ...r } = e, o = Ft(Wu, n), a = Re(t, o.triggerRef);
    return /* @__PURE__ */ s(
      be.button,
      {
        type: "button",
        "aria-haspopup": "dialog",
        "aria-expanded": o.open,
        "aria-controls": o.contentId,
        "data-state": ai(o.open),
        ...r,
        ref: a,
        onClick: xe(e.onClick, o.onOpenToggle)
      }
    );
  }
);
Hu.displayName = Wu;
var oi = "DialogPortal", [Wk, Zu] = Uu(oi, {
  forceMount: void 0
}), qu = (e) => {
  const { __scopeDialog: t, forceMount: n, children: r, container: o } = e, a = Ft(oi, t);
  return /* @__PURE__ */ s(Wk, { scope: t, forceMount: n, children: m.Children.map(r, (i) => /* @__PURE__ */ s(hr, { present: n || a.open, children: /* @__PURE__ */ s(ti, { asChild: !0, container: o, children: i }) })) });
};
qu.displayName = oi;
var Lo = "DialogOverlay", Gu = m.forwardRef(
  (e, t) => {
    const n = Zu(Lo, e.__scopeDialog), { forceMount: r = n.forceMount, ...o } = e, a = Ft(Lo, e.__scopeDialog);
    return a.modal ? /* @__PURE__ */ s(hr, { present: r || a.open, children: /* @__PURE__ */ s(Zk, { ...o, ref: t }) }) : null;
  }
);
Gu.displayName = Lo;
var Hk = /* @__PURE__ */ $k("DialogOverlay.RemoveScroll"), Zk = m.forwardRef(
  (e, t) => {
    const { __scopeDialog: n, ...r } = e, o = Ft(Lo, n);
    return (
      // Make sure `Content` is scrollable even when it doesn't live inside `RemoveScroll`
      // ie. when `Overlay` and `Content` are siblings
      /* @__PURE__ */ s(ni, { as: Hk, allowPinchZoom: !0, shards: [o.contentRef], children: /* @__PURE__ */ s(
        be.div,
        {
          "data-state": ai(o.open),
          ...r,
          ref: t,
          style: { pointerEvents: "auto", ...r.style }
        }
      ) })
    );
  }
), $n = "DialogContent", Yu = m.forwardRef(
  (e, t) => {
    const n = Zu($n, e.__scopeDialog), { forceMount: r = n.forceMount, ...o } = e, a = Ft($n, e.__scopeDialog);
    return /* @__PURE__ */ s(hr, { present: r || a.open, children: a.modal ? /* @__PURE__ */ s(qk, { ...o, ref: t }) : /* @__PURE__ */ s(Gk, { ...o, ref: t }) });
  }
);
Yu.displayName = $n;
var qk = m.forwardRef(
  (e, t) => {
    const n = Ft($n, e.__scopeDialog), r = m.useRef(null), o = Re(t, n.contentRef, r);
    return m.useEffect(() => {
      const a = r.current;
      if (a) return iu(a);
    }, []), /* @__PURE__ */ s(
      Qu,
      {
        ...e,
        ref: o,
        trapFocus: n.open,
        disableOutsidePointerEvents: !0,
        onCloseAutoFocus: xe(e.onCloseAutoFocus, (a) => {
          a.preventDefault(), n.triggerRef.current?.focus();
        }),
        onPointerDownOutside: xe(e.onPointerDownOutside, (a) => {
          const i = a.detail.originalEvent, c = i.button === 0 && i.ctrlKey === !0;
          (i.button === 2 || c) && a.preventDefault();
        }),
        onFocusOutside: xe(
          e.onFocusOutside,
          (a) => a.preventDefault()
        )
      }
    );
  }
), Gk = m.forwardRef(
  (e, t) => {
    const n = Ft($n, e.__scopeDialog), r = m.useRef(!1), o = m.useRef(!1);
    return /* @__PURE__ */ s(
      Qu,
      {
        ...e,
        ref: t,
        trapFocus: !1,
        disableOutsidePointerEvents: !1,
        onCloseAutoFocus: (a) => {
          e.onCloseAutoFocus?.(a), a.defaultPrevented || (r.current || n.triggerRef.current?.focus(), a.preventDefault()), r.current = !1, o.current = !1;
        },
        onInteractOutside: (a) => {
          e.onInteractOutside?.(a), a.defaultPrevented || (r.current = !0, a.detail.originalEvent.type === "pointerdown" && (o.current = !0));
          const i = a.target;
          n.triggerRef.current?.contains(i) && a.preventDefault(), a.detail.originalEvent.type === "focusin" && o.current && a.preventDefault();
        }
      }
    );
  }
), Qu = m.forwardRef(
  (e, t) => {
    const { __scopeDialog: n, trapFocus: r, onOpenAutoFocus: o, onCloseAutoFocus: a, ...i } = e, c = Ft($n, n), l = m.useRef(null), d = Re(t, l);
    return Ld(), /* @__PURE__ */ p(Ct, { children: [
      /* @__PURE__ */ s(
        Za,
        {
          asChild: !0,
          loop: !0,
          trapped: r,
          onMountAutoFocus: o,
          onUnmountAutoFocus: a,
          children: /* @__PURE__ */ s(
            Ha,
            {
              role: "dialog",
              id: c.contentId,
              "aria-describedby": c.descriptionId,
              "aria-labelledby": c.titleId,
              "data-state": ai(c.open),
              ...i,
              ref: d,
              onDismiss: () => c.onOpenChange(!1)
            }
          )
        }
      ),
      /* @__PURE__ */ p(Ct, { children: [
        /* @__PURE__ */ s(Yk, { titleId: c.titleId }),
        /* @__PURE__ */ s(Kk, { contentRef: l, descriptionId: c.descriptionId })
      ] })
    ] });
  }
), si = "DialogTitle", Ku = m.forwardRef(
  (e, t) => {
    const { __scopeDialog: n, ...r } = e, o = Ft(si, n);
    return /* @__PURE__ */ s(be.h2, { id: o.titleId, ...r, ref: t });
  }
);
Ku.displayName = si;
var Ju = "DialogDescription", Xu = m.forwardRef(
  (e, t) => {
    const { __scopeDialog: n, ...r } = e, o = Ft(Ju, n);
    return /* @__PURE__ */ s(be.p, { id: o.descriptionId, ...r, ref: t });
  }
);
Xu.displayName = Ju;
var ef = "DialogClose", tf = m.forwardRef(
  (e, t) => {
    const { __scopeDialog: n, ...r } = e, o = Ft(ef, n);
    return /* @__PURE__ */ s(
      be.button,
      {
        type: "button",
        ...r,
        ref: t,
        onClick: xe(e.onClick, () => o.onOpenChange(!1))
      }
    );
  }
);
tf.displayName = ef;
function ai(e) {
  return e ? "open" : "closed";
}
var nf = "DialogTitleWarning", [WN, rf] = tw(nf, {
  contentName: $n,
  titleName: si,
  docsSlug: "dialog"
}), Yk = ({ titleId: e }) => {
  const t = rf(nf), n = `\`${t.contentName}\` requires a \`${t.titleName}\` for the component to be accessible for screen reader users.

If you want to hide the \`${t.titleName}\`, you can wrap it with our VisuallyHidden component.

For more information, see https://radix-ui.com/primitives/docs/components/${t.docsSlug}`;
  return m.useEffect(() => {
    e && (document.getElementById(e) || console.error(n));
  }, [n, e]), null;
}, Qk = "DialogDescriptionWarning", Kk = ({ contentRef: e, descriptionId: t }) => {
  const r = `Warning: Missing \`Description\` or \`aria-describedby={undefined}\` for {${rf(Qk).contentName}}.`;
  return m.useEffect(() => {
    const o = e.current?.getAttribute("aria-describedby");
    t && o && (document.getElementById(t) || console.warn(r));
  }, [r, e, t]), null;
}, of = Vu, sf = Hu, af = qu, ss = Gu, as = Yu, is = Ku, cs = Xu, cf = tf;
const ii = of, Jk = sf, lf = af, Xk = cf, ci = m.forwardRef(({ className: e, ...t }, n) => /* @__PURE__ */ s(
  ss,
  {
    ref: n,
    className: B(
      "fixed inset-0 z-50 bg-neutral-950/40 backdrop-blur-sm transition-opacity data-[state=closed]:opacity-0 data-[state=open]:opacity-100",
      e
    ),
    ...t
  }
));
ci.displayName = ss.displayName;
const ls = m.forwardRef(({ className: e, children: t, ...n }, r) => /* @__PURE__ */ p(lf, { children: [
  /* @__PURE__ */ s(ci, {}),
  /* @__PURE__ */ s(
    as,
    {
      ref: r,
      className: B(
        "fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 border border-neutral-200 bg-white p-6 shadow-lg outline-none transition data-[state=closed]:opacity-0 data-[state=closed]:scale-95 data-[state=open]:opacity-100 data-[state=open]:scale-100 dark:border-neutral-800 dark:bg-neutral-950",
        "rounded-2xl",
        e
      ),
      ...n,
      children: t
    }
  )
] }));
ls.displayName = as.displayName;
const li = ({ className: e, ...t }) => /* @__PURE__ */ s("div", { className: B("flex flex-col space-y-2 text-center sm:text-left", e), ...t }), df = ({ className: e, ...t }) => /* @__PURE__ */ s(
  "div",
  {
    className: B("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", e),
    ...t
  }
), ds = m.forwardRef(({ className: e, ...t }, n) => /* @__PURE__ */ s(
  is,
  {
    ref: n,
    className: B("text-lg font-semibold leading-none tracking-tight", e),
    ...t
  }
));
ds.displayName = is.displayName;
const di = m.forwardRef(({ className: e, ...t }, n) => /* @__PURE__ */ s(
  cs,
  {
    ref: n,
    className: B("text-sm text-neutral-500 dark:text-neutral-400", e),
    ...t
  }
));
di.displayName = cs.displayName;
const us = of, fs = sf, uf = cf, ff = af, ui = m.forwardRef(({ className: e, ...t }, n) => /* @__PURE__ */ s(
  ss,
  {
    ref: n,
    className: B(
      "fixed inset-0 z-50 bg-neutral-950/40 backdrop-blur-sm transition-opacity data-[state=closed]:opacity-0 data-[state=open]:opacity-100",
      e
    ),
    ...t
  }
));
ui.displayName = ss.displayName;
const eS = Ua(
  "fixed z-50 gap-4 bg-white p-6 shadow-lg outline-none transition duration-200 ease-out dark:bg-neutral-950",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b border-neutral-200 data-[state=closed]:-translate-y-full data-[state=open]:translate-y-0 dark:border-neutral-800",
        bottom: "inset-x-0 bottom-0 border-t border-neutral-200 data-[state=closed]:translate-y-full data-[state=open]:translate-y-0 dark:border-neutral-800",
        left: "inset-y-0 left-0 h-full w-3/4 border-r border-neutral-200 data-[state=closed]:-translate-x-full data-[state=open]:translate-x-0 sm:max-w-sm dark:border-neutral-800",
        right: "inset-y-0 right-0 h-full w-3/4 border-l border-neutral-200 data-[state=closed]:translate-x-full data-[state=open]:translate-x-0 sm:max-w-sm dark:border-neutral-800",
        popup: "bottom-4 right-4 w-[420px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] overflow-hidden rounded-2xl border border-neutral-200 p-4 data-[state=closed]:translate-y-2 data-[state=open]:translate-y-0 data-[state=closed]:opacity-0 data-[state=open]:opacity-100 data-[state=closed]:scale-95 data-[state=open]:scale-100 dark:border-neutral-800"
      }
    },
    defaultVariants: {
      side: "right"
    }
  }
), Zr = m.forwardRef(({ side: e = "right", className: t, children: n, overlayClassName: r, ...o }, a) => /* @__PURE__ */ p(ff, { children: [
  /* @__PURE__ */ s(ui, { className: r }),
  /* @__PURE__ */ s(
    as,
    {
      ref: a,
      className: B(eS({ side: e }), t),
      ...o,
      children: n
    }
  )
] }));
Zr.displayName = as.displayName;
const ps = ({ className: e, ...t }) => /* @__PURE__ */ s("div", { className: B("flex flex-col space-y-2 text-left", e), ...t }), ms = m.forwardRef(({ className: e, ...t }, n) => /* @__PURE__ */ s(
  is,
  {
    ref: n,
    className: B("text-lg font-semibold leading-none tracking-tight", e),
    ...t
  }
));
ms.displayName = is.displayName;
const pf = m.forwardRef(({ className: e, ...t }, n) => /* @__PURE__ */ s(
  cs,
  {
    ref: n,
    className: B("text-sm text-neutral-500 dark:text-neutral-400", e),
    ...t
  }
));
pf.displayName = cs.displayName;
var hs = "Collapsible", [tS, mf] = _n(hs), [nS, fi] = tS(hs), hf = m.forwardRef(
  (e, t) => {
    const {
      __scopeCollapsible: n,
      open: r,
      defaultOpen: o,
      disabled: a,
      onOpenChange: i,
      ...c
    } = e, [l, d] = vn({
      prop: r,
      defaultProp: o ?? !1,
      onChange: i,
      caller: hs
    });
    return /* @__PURE__ */ s(
      nS,
      {
        scope: n,
        disabled: a,
        contentId: qt(),
        open: l,
        onOpenToggle: m.useCallback(() => d((f) => !f), [d]),
        children: /* @__PURE__ */ s(
          be.div,
          {
            "data-state": mi(l),
            "data-disabled": a ? "" : void 0,
            ...c,
            ref: t
          }
        )
      }
    );
  }
);
hf.displayName = hs;
var gf = "CollapsibleTrigger", yf = m.forwardRef(
  (e, t) => {
    const { __scopeCollapsible: n, ...r } = e, o = fi(gf, n);
    return /* @__PURE__ */ s(
      be.button,
      {
        type: "button",
        "aria-controls": o.contentId,
        "aria-expanded": o.open || !1,
        "data-state": mi(o.open),
        "data-disabled": o.disabled ? "" : void 0,
        disabled: o.disabled,
        ...r,
        ref: t,
        onClick: xe(e.onClick, o.onOpenToggle)
      }
    );
  }
);
yf.displayName = gf;
var pi = "CollapsibleContent", vf = m.forwardRef(
  (e, t) => {
    const { forceMount: n, ...r } = e, o = fi(pi, e.__scopeCollapsible);
    return /* @__PURE__ */ s(hr, { present: n || o.open, children: ({ present: a }) => /* @__PURE__ */ s(rS, { ...r, ref: t, present: a }) });
  }
);
vf.displayName = pi;
var rS = m.forwardRef((e, t) => {
  const { __scopeCollapsible: n, present: r, children: o, ...a } = e, i = fi(pi, n), [c, l] = m.useState(r), d = m.useRef(null), f = Re(t, d), u = m.useRef(0), h = u.current, g = m.useRef(0), b = g.current, v = i.open || c, y = m.useRef(v), w = m.useRef(void 0);
  return m.useEffect(() => {
    const k = requestAnimationFrame(() => y.current = !1);
    return () => cancelAnimationFrame(k);
  }, []), Xe(() => {
    const k = d.current;
    if (k) {
      w.current = w.current || {
        transitionDuration: k.style.transitionDuration,
        animationName: k.style.animationName
      }, k.style.transitionDuration = "0s", k.style.animationName = "none";
      const _ = k.getBoundingClientRect();
      u.current = _.height, g.current = _.width, y.current || (k.style.transitionDuration = w.current.transitionDuration, k.style.animationName = w.current.animationName), l(r);
    }
  }, [i.open, r]), /* @__PURE__ */ s(
    be.div,
    {
      "data-state": mi(i.open),
      "data-disabled": i.disabled ? "" : void 0,
      id: i.contentId,
      hidden: !v,
      ...a,
      ref: f,
      style: {
        "--radix-collapsible-content-height": h ? `${h}px` : void 0,
        "--radix-collapsible-content-width": b ? `${b}px` : void 0,
        ...e.style
      },
      children: v && o
    }
  );
});
function mi(e) {
  return e ? "open" : "closed";
}
var oS = hf, sS = yf, aS = vf, jt = "Accordion", iS = ["Home", "End", "ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight"], [hi, cS, lS] = Wa(jt), [gs] = _n(jt, [
  lS,
  mf
]), gi = mf(), bf = L.forwardRef(
  (e, t) => {
    const { type: n, ...r } = e, o = r, a = r;
    return /* @__PURE__ */ s(hi.Provider, { scope: e.__scopeAccordion, children: n === "multiple" ? /* @__PURE__ */ s(pS, { ...a, ref: t }) : /* @__PURE__ */ s(fS, { ...o, ref: t }) });
  }
);
bf.displayName = jt;
var [wf, dS] = gs(jt), [xf, uS] = gs(
  jt,
  { collapsible: !1 }
), fS = L.forwardRef(
  (e, t) => {
    const {
      value: n,
      defaultValue: r,
      onValueChange: o = () => {
      },
      collapsible: a = !1,
      ...i
    } = e, [c, l] = vn({
      prop: n,
      defaultProp: r ?? "",
      onChange: o,
      caller: jt
    });
    return /* @__PURE__ */ s(
      wf,
      {
        scope: e.__scopeAccordion,
        value: L.useMemo(() => c ? [c] : [], [c]),
        onItemOpen: l,
        onItemClose: L.useCallback(() => a && l(""), [a, l]),
        children: /* @__PURE__ */ s(xf, { scope: e.__scopeAccordion, collapsible: a, children: /* @__PURE__ */ s(_f, { ...i, ref: t }) })
      }
    );
  }
), pS = L.forwardRef((e, t) => {
  const {
    value: n,
    defaultValue: r,
    onValueChange: o = () => {
    },
    ...a
  } = e, [i, c] = vn({
    prop: n,
    defaultProp: r ?? [],
    onChange: o,
    caller: jt
  }), l = L.useCallback(
    (f) => c((u = []) => [...u, f]),
    [c]
  ), d = L.useCallback(
    (f) => c((u = []) => u.filter((h) => h !== f)),
    [c]
  );
  return /* @__PURE__ */ s(
    wf,
    {
      scope: e.__scopeAccordion,
      value: i,
      onItemOpen: l,
      onItemClose: d,
      children: /* @__PURE__ */ s(xf, { scope: e.__scopeAccordion, collapsible: !0, children: /* @__PURE__ */ s(_f, { ...a, ref: t }) })
    }
  );
}), [mS, ys] = gs(jt), _f = L.forwardRef(
  (e, t) => {
    const { __scopeAccordion: n, disabled: r, dir: o, orientation: a = "vertical", ...i } = e, c = L.useRef(null), l = Re(c, t), d = cS(n), u = Yo(o) === "ltr", h = xe(e.onKeyDown, (g) => {
      if (!iS.includes(g.key)) return;
      const b = g.target, v = d().filter((E) => !E.ref.current?.disabled), y = v.findIndex((E) => E.ref.current === b), w = v.length;
      if (y === -1) return;
      g.preventDefault();
      let k = y;
      const _ = 0, x = w - 1, S = () => {
        k = y + 1, k > x && (k = _);
      }, I = () => {
        k = y - 1, k < _ && (k = x);
      };
      switch (g.key) {
        case "Home":
          k = _;
          break;
        case "End":
          k = x;
          break;
        case "ArrowRight":
          a === "horizontal" && (u ? S() : I());
          break;
        case "ArrowDown":
          a === "vertical" && S();
          break;
        case "ArrowLeft":
          a === "horizontal" && (u ? I() : S());
          break;
        case "ArrowUp":
          a === "vertical" && I();
          break;
      }
      const R = k % w;
      v[R].ref.current?.focus();
    });
    return /* @__PURE__ */ s(
      mS,
      {
        scope: n,
        disabled: r,
        direction: o,
        orientation: a,
        children: /* @__PURE__ */ s(hi.Slot, { scope: n, children: /* @__PURE__ */ s(
          be.div,
          {
            ...i,
            "data-orientation": a,
            ref: l,
            onKeyDown: r ? void 0 : h
          }
        ) })
      }
    );
  }
), Do = "AccordionItem", [hS, yi] = gs(Do), kf = L.forwardRef(
  (e, t) => {
    const { __scopeAccordion: n, value: r, ...o } = e, a = ys(Do, n), i = dS(Do, n), c = gi(n), l = qt(), d = r && i.value.includes(r) || !1, f = a.disabled || e.disabled;
    return /* @__PURE__ */ s(
      hS,
      {
        scope: n,
        open: d,
        disabled: f,
        triggerId: l,
        children: /* @__PURE__ */ s(
          oS,
          {
            "data-orientation": a.orientation,
            "data-state": Pf(d),
            ...c,
            ...o,
            ref: t,
            disabled: f,
            open: d,
            onOpenChange: (u) => {
              u ? i.onItemOpen(r) : i.onItemClose(r);
            }
          }
        )
      }
    );
  }
);
kf.displayName = Do;
var Sf = "AccordionHeader", Cf = L.forwardRef(
  (e, t) => {
    const { __scopeAccordion: n, ...r } = e, o = ys(jt, n), a = yi(Sf, n);
    return /* @__PURE__ */ s(
      be.h3,
      {
        "data-orientation": o.orientation,
        "data-state": Pf(a.open),
        "data-disabled": a.disabled ? "" : void 0,
        ...r,
        ref: t
      }
    );
  }
);
Cf.displayName = Sf;
var ya = "AccordionTrigger", Nf = L.forwardRef(
  (e, t) => {
    const { __scopeAccordion: n, ...r } = e, o = ys(jt, n), a = yi(ya, n), i = uS(ya, n), c = gi(n);
    return /* @__PURE__ */ s(hi.ItemSlot, { scope: n, children: /* @__PURE__ */ s(
      sS,
      {
        "aria-disabled": a.open && !i.collapsible || void 0,
        "data-orientation": o.orientation,
        id: a.triggerId,
        ...c,
        ...r,
        ref: t
      }
    ) });
  }
);
Nf.displayName = ya;
var Ef = "AccordionContent", Af = L.forwardRef(
  (e, t) => {
    const { __scopeAccordion: n, ...r } = e, o = ys(jt, n), a = yi(Ef, n), i = gi(n);
    return /* @__PURE__ */ s(
      aS,
      {
        role: "region",
        "aria-labelledby": a.triggerId,
        "data-orientation": o.orientation,
        ...i,
        ...r,
        ref: t,
        style: {
          "--radix-accordion-content-height": "var(--radix-collapsible-content-height)",
          "--radix-accordion-content-width": "var(--radix-collapsible-content-width)",
          ...e.style
        }
      }
    );
  }
);
Af.displayName = Ef;
function Pf(e) {
  return e ? "open" : "closed";
}
var gS = bf, If = kf, yS = Cf, Tf = Nf, Rf = Af;
const Of = gS, Er = m.forwardRef(({ className: e, ...t }, n) => /* @__PURE__ */ s(
  If,
  {
    ref: n,
    className: B("border-b border-neutral-200 dark:border-neutral-800", e),
    ...t
  }
));
Er.displayName = If.displayName;
const Ar = m.forwardRef(({ className: e, children: t, ...n }, r) => /* @__PURE__ */ s(yS, { className: "flex", children: /* @__PURE__ */ p(
  Tf,
  {
    ref: r,
    className: B(
      "flex flex-1 items-center justify-between py-4 text-sm font-medium transition-all hover:underline",
      e
    ),
    ...n,
    children: [
      t,
      /* @__PURE__ */ s("span", { className: "ml-3 text-neutral-500 dark:text-neutral-400", "aria-hidden": !0, children: "▾" })
    ]
  }
) }));
Ar.displayName = Tf.displayName;
const Pr = m.forwardRef(({ className: e, children: t, ...n }, r) => /* @__PURE__ */ s(
  Rf,
  {
    ref: r,
    className: B(
      "overflow-hidden text-sm",
      e
    ),
    ...n,
    children: /* @__PURE__ */ s("div", { className: "pb-4 pt-0", children: t })
  }
));
Pr.displayName = Rf.displayName;
var Us = "rovingFocusGroup.onEntryFocus", vS = { bubbles: !1, cancelable: !0 }, qr = "RovingFocusGroup", [va, Mf, bS] = Wa(qr), [wS, Lf] = _n(
  qr,
  [bS]
), [xS, _S] = wS(qr), Df = m.forwardRef(
  (e, t) => /* @__PURE__ */ s(va.Provider, { scope: e.__scopeRovingFocusGroup, children: /* @__PURE__ */ s(va.Slot, { scope: e.__scopeRovingFocusGroup, children: /* @__PURE__ */ s(kS, { ...e, ref: t }) }) })
);
Df.displayName = qr;
var kS = m.forwardRef((e, t) => {
  const {
    __scopeRovingFocusGroup: n,
    orientation: r,
    loop: o = !1,
    dir: a,
    currentTabStopId: i,
    defaultCurrentTabStopId: c,
    onCurrentTabStopIdChange: l,
    onEntryFocus: d,
    preventScrollOnEntryFocus: f = !1,
    ...u
  } = e, h = m.useRef(null), g = Re(t, h), b = Yo(a), [v, y] = vn({
    prop: i,
    defaultProp: c ?? null,
    onChange: l,
    caller: qr
  }), [w, k] = m.useState(!1), _ = hn(d), x = Mf(n), S = m.useRef(!1), [I, R] = m.useState(0);
  return m.useEffect(() => {
    const E = h.current;
    if (E)
      return E.addEventListener(Us, _), () => E.removeEventListener(Us, _);
  }, [_]), /* @__PURE__ */ s(
    xS,
    {
      scope: n,
      orientation: r,
      dir: b,
      loop: o,
      currentTabStopId: v,
      onItemFocus: m.useCallback(
        (E) => y(E),
        [y]
      ),
      onItemShiftTab: m.useCallback(() => k(!0), []),
      onFocusableItemAdd: m.useCallback(
        () => R((E) => E + 1),
        []
      ),
      onFocusableItemRemove: m.useCallback(
        () => R((E) => E - 1),
        []
      ),
      children: /* @__PURE__ */ s(
        be.div,
        {
          tabIndex: w || I === 0 ? -1 : 0,
          "data-orientation": r,
          ...u,
          ref: g,
          style: { outline: "none", ...e.style },
          onMouseDown: xe(e.onMouseDown, () => {
            S.current = !0;
          }),
          onFocus: xe(e.onFocus, (E) => {
            const P = !S.current;
            if (E.target === E.currentTarget && P && !w) {
              const O = new CustomEvent(Us, vS);
              if (E.currentTarget.dispatchEvent(O), !O.defaultPrevented) {
                const T = x().filter(($) => $.focusable), D = T.find(($) => $.active), j = T.find(($) => $.id === v), W = [D, j, ...T].filter(
                  Boolean
                ).map(($) => $.ref.current);
                Ff(W, f);
              }
            }
            S.current = !1;
          }),
          onBlur: xe(e.onBlur, () => k(!1))
        }
      )
    }
  );
}), $f = "RovingFocusGroupItem", zf = m.forwardRef(
  (e, t) => {
    const {
      __scopeRovingFocusGroup: n,
      focusable: r = !0,
      active: o = !1,
      tabStopId: a,
      children: i,
      ...c
    } = e, l = qt(), d = a || l, f = _S($f, n), u = f.currentTabStopId === d, h = Mf(n), { onFocusableItemAdd: g, onFocusableItemRemove: b, currentTabStopId: v } = f;
    return m.useEffect(() => {
      if (r)
        return g(), () => b();
    }, [r, g, b]), /* @__PURE__ */ s(
      va.ItemSlot,
      {
        scope: n,
        id: d,
        focusable: r,
        active: o,
        children: /* @__PURE__ */ s(
          be.span,
          {
            tabIndex: u ? 0 : -1,
            "data-orientation": f.orientation,
            ...c,
            ref: t,
            onMouseDown: xe(e.onMouseDown, (y) => {
              r ? f.onItemFocus(d) : y.preventDefault();
            }),
            onFocus: xe(e.onFocus, () => f.onItemFocus(d)),
            onKeyDown: xe(e.onKeyDown, (y) => {
              if (y.key === "Tab" && y.shiftKey) {
                f.onItemShiftTab();
                return;
              }
              if (y.target !== y.currentTarget) return;
              const w = NS(y, f.orientation, f.dir);
              if (w !== void 0) {
                if (y.metaKey || y.ctrlKey || y.altKey || y.shiftKey) return;
                y.preventDefault();
                let _ = h().filter((x) => x.focusable).map((x) => x.ref.current);
                if (w === "last") _.reverse();
                else if (w === "prev" || w === "next") {
                  w === "prev" && _.reverse();
                  const x = _.indexOf(y.currentTarget);
                  _ = f.loop ? ES(_, x + 1) : _.slice(x + 1);
                }
                setTimeout(() => Ff(_));
              }
            }),
            children: typeof i == "function" ? i({ isCurrentTabStop: u, hasTabStop: v != null }) : i
          }
        )
      }
    );
  }
);
zf.displayName = $f;
var SS = {
  ArrowLeft: "prev",
  ArrowUp: "prev",
  ArrowRight: "next",
  ArrowDown: "next",
  PageUp: "first",
  Home: "first",
  PageDown: "last",
  End: "last"
};
function CS(e, t) {
  return t !== "rtl" ? e : e === "ArrowLeft" ? "ArrowRight" : e === "ArrowRight" ? "ArrowLeft" : e;
}
function NS(e, t, n) {
  const r = CS(e.key, n);
  if (!(t === "vertical" && ["ArrowLeft", "ArrowRight"].includes(r)) && !(t === "horizontal" && ["ArrowUp", "ArrowDown"].includes(r)))
    return SS[r];
}
function Ff(e, t = !1) {
  const n = document.activeElement;
  for (const r of e)
    if (r === n || (r.focus({ preventScroll: t }), document.activeElement !== n)) return;
}
function ES(e, t) {
  return e.map((n, r) => e[(t + r) % e.length]);
}
var AS = Df, PS = zf, vs = "Tabs", [IS] = _n(vs, [
  Lf
]), jf = Lf(), [TS, vi] = IS(vs), Bf = m.forwardRef(
  (e, t) => {
    const {
      __scopeTabs: n,
      value: r,
      onValueChange: o,
      defaultValue: a,
      orientation: i = "horizontal",
      dir: c,
      activationMode: l = "automatic",
      ...d
    } = e, f = Yo(c), [u, h] = vn({
      prop: r,
      onChange: o,
      defaultProp: a ?? "",
      caller: vs
    });
    return /* @__PURE__ */ s(
      TS,
      {
        scope: n,
        baseId: qt(),
        value: u,
        onValueChange: h,
        orientation: i,
        dir: f,
        activationMode: l,
        children: /* @__PURE__ */ s(
          be.div,
          {
            dir: f,
            "data-orientation": i,
            ...d,
            ref: t
          }
        )
      }
    );
  }
);
Bf.displayName = vs;
var Uf = "TabsList", Vf = m.forwardRef(
  (e, t) => {
    const { __scopeTabs: n, loop: r = !0, ...o } = e, a = vi(Uf, n), i = jf(n);
    return /* @__PURE__ */ s(
      AS,
      {
        asChild: !0,
        ...i,
        orientation: a.orientation,
        dir: a.dir,
        loop: r,
        children: /* @__PURE__ */ s(
          be.div,
          {
            role: "tablist",
            "aria-orientation": a.orientation,
            ...o,
            ref: t
          }
        )
      }
    );
  }
);
Vf.displayName = Uf;
var Wf = "TabsTrigger", Hf = m.forwardRef(
  (e, t) => {
    const { __scopeTabs: n, value: r, disabled: o = !1, ...a } = e, i = vi(Wf, n), c = jf(n), l = Gf(i.baseId, r), d = Yf(i.baseId, r), f = r === i.value;
    return /* @__PURE__ */ s(
      PS,
      {
        asChild: !0,
        ...c,
        focusable: !o,
        active: f,
        children: /* @__PURE__ */ s(
          be.button,
          {
            type: "button",
            role: "tab",
            "aria-selected": f,
            "aria-controls": d,
            "data-state": f ? "active" : "inactive",
            "data-disabled": o ? "" : void 0,
            disabled: o,
            id: l,
            ...a,
            ref: t,
            onMouseDown: xe(e.onMouseDown, (u) => {
              !o && u.button === 0 && u.ctrlKey === !1 ? i.onValueChange(r) : u.preventDefault();
            }),
            onKeyDown: xe(e.onKeyDown, (u) => {
              [" ", "Enter"].includes(u.key) && i.onValueChange(r);
            }),
            onFocus: xe(e.onFocus, () => {
              const u = i.activationMode !== "manual";
              !f && !o && u && i.onValueChange(r);
            })
          }
        )
      }
    );
  }
);
Hf.displayName = Wf;
var Zf = "TabsContent", qf = m.forwardRef(
  (e, t) => {
    const { __scopeTabs: n, value: r, forceMount: o, children: a, ...i } = e, c = vi(Zf, n), l = Gf(c.baseId, r), d = Yf(c.baseId, r), f = r === c.value, u = m.useRef(f);
    return m.useEffect(() => {
      const h = requestAnimationFrame(() => u.current = !1);
      return () => cancelAnimationFrame(h);
    }, []), /* @__PURE__ */ s(hr, { present: o || f, children: ({ present: h }) => /* @__PURE__ */ s(
      be.div,
      {
        "data-state": f ? "active" : "inactive",
        "data-orientation": c.orientation,
        role: "tabpanel",
        "aria-labelledby": l,
        hidden: !h,
        id: d,
        tabIndex: 0,
        ...i,
        ref: t,
        style: {
          ...e.style,
          animationDuration: u.current ? "0s" : void 0
        },
        children: h && a
      }
    ) });
  }
);
qf.displayName = Zf;
function Gf(e, t) {
  return `${e}-trigger-${t}`;
}
function Yf(e, t) {
  return `${e}-content-${t}`;
}
var RS = Bf, Qf = Vf, Kf = Hf, Jf = qf;
const bi = RS, bs = m.forwardRef(({ className: e, ...t }, n) => /* @__PURE__ */ s(
  Qf,
  {
    ref: n,
    className: B(
      "inline-flex h-10 items-center justify-center rounded-md bg-neutral-100 p-1 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
      e
    ),
    ...t
  }
));
bs.displayName = Qf.displayName;
const Fr = m.forwardRef(({ className: e, ...t }, n) => /* @__PURE__ */ s(
  Kf,
  {
    ref: n,
    className: B(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/20 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-neutral-950 data-[state=active]:shadow-sm dark:ring-offset-neutral-950 dark:focus-visible:ring-neutral-50/20 dark:data-[state=active]:bg-neutral-950 dark:data-[state=active]:text-neutral-50",
      e
    ),
    ...t
  }
));
Fr.displayName = Kf.displayName;
const Xf = m.forwardRef(({ className: e, ...t }, n) => /* @__PURE__ */ s(
  Jf,
  {
    ref: n,
    className: B(
      "mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/20 dark:ring-offset-neutral-950 dark:focus-visible:ring-neutral-50/20",
      e
    ),
    ...t
  }
));
Xf.displayName = Jf.displayName;
function or({
  title: e,
  description: t,
  actionLabel: n,
  onAction: r,
  className: o
}) {
  return /* @__PURE__ */ s(
    "div",
    {
      className: B(
        "flex flex-col items-center justify-center rounded-xl border border-neutral-200 bg-white p-10 text-center dark:border-neutral-800 dark:bg-neutral-950",
        o
      ),
      children: /* @__PURE__ */ p("div", { className: "max-w-sm", children: [
        /* @__PURE__ */ s("h3", { className: "text-base font-semibold text-neutral-950 dark:text-neutral-50", children: e }),
        t ? /* @__PURE__ */ s("p", { className: "mt-2 text-sm text-neutral-600 dark:text-neutral-400", children: t }) : null,
        n && r ? /* @__PURE__ */ s("div", { className: "mt-5", children: /* @__PURE__ */ s(se, { type: "button", onClick: r, variant: "secondary", children: n }) }) : null
      ] })
    }
  );
}
function Yt({
  title: e,
  description: t,
  onRetry: n,
  className: r
}) {
  return /* @__PURE__ */ p(
    "div",
    {
      className: B(
        "rounded-xl border border-neutral-200 bg-white p-6 text-neutral-950 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50",
        r
      ),
      children: [
        /* @__PURE__ */ s("h3", { className: "text-sm font-semibold", children: e ?? "Something went wrong" }),
        /* @__PURE__ */ s("p", { className: "mt-2 text-sm text-neutral-600 dark:text-neutral-400", children: t }),
        n ? /* @__PURE__ */ s("div", { className: "mt-4", children: /* @__PURE__ */ s(se, { type: "button", variant: "outline", onClick: n, children: "Try again" }) }) : null
      ]
    }
  );
}
class OS extends m.Component {
  state = { error: null };
  static getDerivedStateFromError(t) {
    return { error: t };
  }
  render() {
    return this.state.error ? this.props.fallback ? this.props.fallback(this.state.error) : /* @__PURE__ */ s(Yt, { description: this.state.error.message }) : this.props.children;
  }
}
function MS(e) {
  if (typeof document > "u") return;
  let t = document.head || document.getElementsByTagName("head")[0], n = document.createElement("style");
  n.type = "text/css", t.appendChild(n), n.styleSheet ? n.styleSheet.cssText = e : n.appendChild(document.createTextNode(e));
}
const LS = (e) => {
  switch (e) {
    case "success":
      return zS;
    case "info":
      return jS;
    case "warning":
      return FS;
    case "error":
      return BS;
    default:
      return null;
  }
}, DS = Array(12).fill(0), $S = ({ visible: e, className: t }) => /* @__PURE__ */ L.createElement("div", {
  className: [
    "sonner-loading-wrapper",
    t
  ].filter(Boolean).join(" "),
  "data-visible": e
}, /* @__PURE__ */ L.createElement("div", {
  className: "sonner-spinner"
}, DS.map((n, r) => /* @__PURE__ */ L.createElement("div", {
  className: "sonner-loading-bar",
  key: `spinner-bar-${r}`
})))), zS = /* @__PURE__ */ L.createElement("svg", {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 20 20",
  fill: "currentColor",
  height: "20",
  width: "20"
}, /* @__PURE__ */ L.createElement("path", {
  fillRule: "evenodd",
  d: "M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z",
  clipRule: "evenodd"
})), FS = /* @__PURE__ */ L.createElement("svg", {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "currentColor",
  height: "20",
  width: "20"
}, /* @__PURE__ */ L.createElement("path", {
  fillRule: "evenodd",
  d: "M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z",
  clipRule: "evenodd"
})), jS = /* @__PURE__ */ L.createElement("svg", {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 20 20",
  fill: "currentColor",
  height: "20",
  width: "20"
}, /* @__PURE__ */ L.createElement("path", {
  fillRule: "evenodd",
  d: "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z",
  clipRule: "evenodd"
})), BS = /* @__PURE__ */ L.createElement("svg", {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 20 20",
  fill: "currentColor",
  height: "20",
  width: "20"
}, /* @__PURE__ */ L.createElement("path", {
  fillRule: "evenodd",
  d: "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z",
  clipRule: "evenodd"
})), US = /* @__PURE__ */ L.createElement("svg", {
  xmlns: "http://www.w3.org/2000/svg",
  width: "12",
  height: "12",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "1.5",
  strokeLinecap: "round",
  strokeLinejoin: "round"
}, /* @__PURE__ */ L.createElement("line", {
  x1: "18",
  y1: "6",
  x2: "6",
  y2: "18"
}), /* @__PURE__ */ L.createElement("line", {
  x1: "6",
  y1: "6",
  x2: "18",
  y2: "18"
})), VS = () => {
  const [e, t] = L.useState(document.hidden);
  return L.useEffect(() => {
    const n = () => {
      t(document.hidden);
    };
    return document.addEventListener("visibilitychange", n), () => window.removeEventListener("visibilitychange", n);
  }, []), e;
};
let ba = 1;
class WS {
  constructor() {
    this.subscribe = (t) => (this.subscribers.push(t), () => {
      const n = this.subscribers.indexOf(t);
      this.subscribers.splice(n, 1);
    }), this.publish = (t) => {
      this.subscribers.forEach((n) => n(t));
    }, this.addToast = (t) => {
      this.publish(t), this.toasts = [
        ...this.toasts,
        t
      ];
    }, this.create = (t) => {
      var n;
      const { message: r, ...o } = t, a = typeof t?.id == "number" || ((n = t.id) == null ? void 0 : n.length) > 0 ? t.id : ba++, i = this.toasts.find((l) => l.id === a), c = t.dismissible === void 0 ? !0 : t.dismissible;
      return this.dismissedToasts.has(a) && this.dismissedToasts.delete(a), i ? this.toasts = this.toasts.map((l) => l.id === a ? (this.publish({
        ...l,
        ...t,
        id: a,
        title: r
      }), {
        ...l,
        ...t,
        id: a,
        dismissible: c,
        title: r
      }) : l) : this.addToast({
        title: r,
        ...o,
        dismissible: c,
        id: a
      }), a;
    }, this.dismiss = (t) => (t ? (this.dismissedToasts.add(t), requestAnimationFrame(() => this.subscribers.forEach((n) => n({
      id: t,
      dismiss: !0
    })))) : this.toasts.forEach((n) => {
      this.subscribers.forEach((r) => r({
        id: n.id,
        dismiss: !0
      }));
    }), t), this.message = (t, n) => this.create({
      ...n,
      message: t
    }), this.error = (t, n) => this.create({
      ...n,
      message: t,
      type: "error"
    }), this.success = (t, n) => this.create({
      ...n,
      type: "success",
      message: t
    }), this.info = (t, n) => this.create({
      ...n,
      type: "info",
      message: t
    }), this.warning = (t, n) => this.create({
      ...n,
      type: "warning",
      message: t
    }), this.loading = (t, n) => this.create({
      ...n,
      type: "loading",
      message: t
    }), this.promise = (t, n) => {
      if (!n)
        return;
      let r;
      n.loading !== void 0 && (r = this.create({
        ...n,
        promise: t,
        type: "loading",
        message: n.loading,
        description: typeof n.description != "function" ? n.description : void 0
      }));
      const o = Promise.resolve(t instanceof Function ? t() : t);
      let a = r !== void 0, i;
      const c = o.then(async (d) => {
        if (i = [
          "resolve",
          d
        ], L.isValidElement(d))
          a = !1, this.create({
            id: r,
            type: "default",
            message: d
          });
        else if (ZS(d) && !d.ok) {
          a = !1;
          const u = typeof n.error == "function" ? await n.error(`HTTP error! status: ${d.status}`) : n.error, h = typeof n.description == "function" ? await n.description(`HTTP error! status: ${d.status}`) : n.description, b = typeof u == "object" && !L.isValidElement(u) ? u : {
            message: u
          };
          this.create({
            id: r,
            type: "error",
            description: h,
            ...b
          });
        } else if (d instanceof Error) {
          a = !1;
          const u = typeof n.error == "function" ? await n.error(d) : n.error, h = typeof n.description == "function" ? await n.description(d) : n.description, b = typeof u == "object" && !L.isValidElement(u) ? u : {
            message: u
          };
          this.create({
            id: r,
            type: "error",
            description: h,
            ...b
          });
        } else if (n.success !== void 0) {
          a = !1;
          const u = typeof n.success == "function" ? await n.success(d) : n.success, h = typeof n.description == "function" ? await n.description(d) : n.description, b = typeof u == "object" && !L.isValidElement(u) ? u : {
            message: u
          };
          this.create({
            id: r,
            type: "success",
            description: h,
            ...b
          });
        }
      }).catch(async (d) => {
        if (i = [
          "reject",
          d
        ], n.error !== void 0) {
          a = !1;
          const f = typeof n.error == "function" ? await n.error(d) : n.error, u = typeof n.description == "function" ? await n.description(d) : n.description, g = typeof f == "object" && !L.isValidElement(f) ? f : {
            message: f
          };
          this.create({
            id: r,
            type: "error",
            description: u,
            ...g
          });
        }
      }).finally(() => {
        a && (this.dismiss(r), r = void 0), n.finally == null || n.finally.call(n);
      }), l = () => new Promise((d, f) => c.then(() => i[0] === "reject" ? f(i[1]) : d(i[1])).catch(f));
      return typeof r != "string" && typeof r != "number" ? {
        unwrap: l
      } : Object.assign(r, {
        unwrap: l
      });
    }, this.custom = (t, n) => {
      const r = n?.id || ba++;
      return this.create({
        jsx: t(r),
        id: r,
        ...n
      }), r;
    }, this.getActiveToasts = () => this.toasts.filter((t) => !this.dismissedToasts.has(t.id)), this.subscribers = [], this.toasts = [], this.dismissedToasts = /* @__PURE__ */ new Set();
  }
}
const ht = new WS(), HS = (e, t) => {
  const n = t?.id || ba++;
  return ht.addToast({
    title: e,
    ...t,
    id: n
  }), n;
}, ZS = (e) => e && typeof e == "object" && "ok" in e && typeof e.ok == "boolean" && "status" in e && typeof e.status == "number", qS = HS, GS = () => ht.toasts, YS = () => ht.getActiveToasts(), QS = Object.assign(qS, {
  success: ht.success,
  info: ht.info,
  warning: ht.warning,
  error: ht.error,
  custom: ht.custom,
  message: ht.message,
  promise: ht.promise,
  dismiss: ht.dismiss,
  loading: ht.loading
}, {
  getHistory: GS,
  getToasts: YS
});
MS("[data-sonner-toaster][dir=ltr],html[dir=ltr]{--toast-icon-margin-start:-3px;--toast-icon-margin-end:4px;--toast-svg-margin-start:-1px;--toast-svg-margin-end:0px;--toast-button-margin-start:auto;--toast-button-margin-end:0;--toast-close-button-start:0;--toast-close-button-end:unset;--toast-close-button-transform:translate(-35%, -35%)}[data-sonner-toaster][dir=rtl],html[dir=rtl]{--toast-icon-margin-start:4px;--toast-icon-margin-end:-3px;--toast-svg-margin-start:0px;--toast-svg-margin-end:-1px;--toast-button-margin-start:0;--toast-button-margin-end:auto;--toast-close-button-start:unset;--toast-close-button-end:0;--toast-close-button-transform:translate(35%, -35%)}[data-sonner-toaster]{position:fixed;width:var(--width);font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,Noto Sans,sans-serif,Apple Color Emoji,Segoe UI Emoji,Segoe UI Symbol,Noto Color Emoji;--gray1:hsl(0, 0%, 99%);--gray2:hsl(0, 0%, 97.3%);--gray3:hsl(0, 0%, 95.1%);--gray4:hsl(0, 0%, 93%);--gray5:hsl(0, 0%, 90.9%);--gray6:hsl(0, 0%, 88.7%);--gray7:hsl(0, 0%, 85.8%);--gray8:hsl(0, 0%, 78%);--gray9:hsl(0, 0%, 56.1%);--gray10:hsl(0, 0%, 52.3%);--gray11:hsl(0, 0%, 43.5%);--gray12:hsl(0, 0%, 9%);--border-radius:8px;box-sizing:border-box;padding:0;margin:0;list-style:none;outline:0;z-index:999999999;transition:transform .4s ease}@media (hover:none) and (pointer:coarse){[data-sonner-toaster][data-lifted=true]{transform:none}}[data-sonner-toaster][data-x-position=right]{right:var(--offset-right)}[data-sonner-toaster][data-x-position=left]{left:var(--offset-left)}[data-sonner-toaster][data-x-position=center]{left:50%;transform:translateX(-50%)}[data-sonner-toaster][data-y-position=top]{top:var(--offset-top)}[data-sonner-toaster][data-y-position=bottom]{bottom:var(--offset-bottom)}[data-sonner-toast]{--y:translateY(100%);--lift-amount:calc(var(--lift) * var(--gap));z-index:var(--z-index);position:absolute;opacity:0;transform:var(--y);touch-action:none;transition:transform .4s,opacity .4s,height .4s,box-shadow .2s;box-sizing:border-box;outline:0;overflow-wrap:anywhere}[data-sonner-toast][data-styled=true]{padding:16px;background:var(--normal-bg);border:1px solid var(--normal-border);color:var(--normal-text);border-radius:var(--border-radius);box-shadow:0 4px 12px rgba(0,0,0,.1);width:var(--width);font-size:13px;display:flex;align-items:center;gap:6px}[data-sonner-toast]:focus-visible{box-shadow:0 4px 12px rgba(0,0,0,.1),0 0 0 2px rgba(0,0,0,.2)}[data-sonner-toast][data-y-position=top]{top:0;--y:translateY(-100%);--lift:1;--lift-amount:calc(1 * var(--gap))}[data-sonner-toast][data-y-position=bottom]{bottom:0;--y:translateY(100%);--lift:-1;--lift-amount:calc(var(--lift) * var(--gap))}[data-sonner-toast][data-styled=true] [data-description]{font-weight:400;line-height:1.4;color:#3f3f3f}[data-rich-colors=true][data-sonner-toast][data-styled=true] [data-description]{color:inherit}[data-sonner-toaster][data-sonner-theme=dark] [data-description]{color:#e8e8e8}[data-sonner-toast][data-styled=true] [data-title]{font-weight:500;line-height:1.5;color:inherit}[data-sonner-toast][data-styled=true] [data-icon]{display:flex;height:16px;width:16px;position:relative;justify-content:flex-start;align-items:center;flex-shrink:0;margin-left:var(--toast-icon-margin-start);margin-right:var(--toast-icon-margin-end)}[data-sonner-toast][data-promise=true] [data-icon]>svg{opacity:0;transform:scale(.8);transform-origin:center;animation:sonner-fade-in .3s ease forwards}[data-sonner-toast][data-styled=true] [data-icon]>*{flex-shrink:0}[data-sonner-toast][data-styled=true] [data-icon] svg{margin-left:var(--toast-svg-margin-start);margin-right:var(--toast-svg-margin-end)}[data-sonner-toast][data-styled=true] [data-content]{display:flex;flex-direction:column;gap:2px}[data-sonner-toast][data-styled=true] [data-button]{border-radius:4px;padding-left:8px;padding-right:8px;height:24px;font-size:12px;color:var(--normal-bg);background:var(--normal-text);margin-left:var(--toast-button-margin-start);margin-right:var(--toast-button-margin-end);border:none;font-weight:500;cursor:pointer;outline:0;display:flex;align-items:center;flex-shrink:0;transition:opacity .4s,box-shadow .2s}[data-sonner-toast][data-styled=true] [data-button]:focus-visible{box-shadow:0 0 0 2px rgba(0,0,0,.4)}[data-sonner-toast][data-styled=true] [data-button]:first-of-type{margin-left:var(--toast-button-margin-start);margin-right:var(--toast-button-margin-end)}[data-sonner-toast][data-styled=true] [data-cancel]{color:var(--normal-text);background:rgba(0,0,0,.08)}[data-sonner-toaster][data-sonner-theme=dark] [data-sonner-toast][data-styled=true] [data-cancel]{background:rgba(255,255,255,.3)}[data-sonner-toast][data-styled=true] [data-close-button]{position:absolute;left:var(--toast-close-button-start);right:var(--toast-close-button-end);top:0;height:20px;width:20px;display:flex;justify-content:center;align-items:center;padding:0;color:var(--gray12);background:var(--normal-bg);border:1px solid var(--gray4);transform:var(--toast-close-button-transform);border-radius:50%;cursor:pointer;z-index:1;transition:opacity .1s,background .2s,border-color .2s}[data-sonner-toast][data-styled=true] [data-close-button]:focus-visible{box-shadow:0 4px 12px rgba(0,0,0,.1),0 0 0 2px rgba(0,0,0,.2)}[data-sonner-toast][data-styled=true] [data-disabled=true]{cursor:not-allowed}[data-sonner-toast][data-styled=true]:hover [data-close-button]:hover{background:var(--gray2);border-color:var(--gray5)}[data-sonner-toast][data-swiping=true]::before{content:'';position:absolute;left:-100%;right:-100%;height:100%;z-index:-1}[data-sonner-toast][data-y-position=top][data-swiping=true]::before{bottom:50%;transform:scaleY(3) translateY(50%)}[data-sonner-toast][data-y-position=bottom][data-swiping=true]::before{top:50%;transform:scaleY(3) translateY(-50%)}[data-sonner-toast][data-swiping=false][data-removed=true]::before{content:'';position:absolute;inset:0;transform:scaleY(2)}[data-sonner-toast][data-expanded=true]::after{content:'';position:absolute;left:0;height:calc(var(--gap) + 1px);bottom:100%;width:100%}[data-sonner-toast][data-mounted=true]{--y:translateY(0);opacity:1}[data-sonner-toast][data-expanded=false][data-front=false]{--scale:var(--toasts-before) * 0.05 + 1;--y:translateY(calc(var(--lift-amount) * var(--toasts-before))) scale(calc(-1 * var(--scale)));height:var(--front-toast-height)}[data-sonner-toast]>*{transition:opacity .4s}[data-sonner-toast][data-x-position=right]{right:0}[data-sonner-toast][data-x-position=left]{left:0}[data-sonner-toast][data-expanded=false][data-front=false][data-styled=true]>*{opacity:0}[data-sonner-toast][data-visible=false]{opacity:0;pointer-events:none}[data-sonner-toast][data-mounted=true][data-expanded=true]{--y:translateY(calc(var(--lift) * var(--offset)));height:var(--initial-height)}[data-sonner-toast][data-removed=true][data-front=true][data-swipe-out=false]{--y:translateY(calc(var(--lift) * -100%));opacity:0}[data-sonner-toast][data-removed=true][data-front=false][data-swipe-out=false][data-expanded=true]{--y:translateY(calc(var(--lift) * var(--offset) + var(--lift) * -100%));opacity:0}[data-sonner-toast][data-removed=true][data-front=false][data-swipe-out=false][data-expanded=false]{--y:translateY(40%);opacity:0;transition:transform .5s,opacity .2s}[data-sonner-toast][data-removed=true][data-front=false]::before{height:calc(var(--initial-height) + 20%)}[data-sonner-toast][data-swiping=true]{transform:var(--y) translateY(var(--swipe-amount-y,0)) translateX(var(--swipe-amount-x,0));transition:none}[data-sonner-toast][data-swiped=true]{user-select:none}[data-sonner-toast][data-swipe-out=true][data-y-position=bottom],[data-sonner-toast][data-swipe-out=true][data-y-position=top]{animation-duration:.2s;animation-timing-function:ease-out;animation-fill-mode:forwards}[data-sonner-toast][data-swipe-out=true][data-swipe-direction=left]{animation-name:swipe-out-left}[data-sonner-toast][data-swipe-out=true][data-swipe-direction=right]{animation-name:swipe-out-right}[data-sonner-toast][data-swipe-out=true][data-swipe-direction=up]{animation-name:swipe-out-up}[data-sonner-toast][data-swipe-out=true][data-swipe-direction=down]{animation-name:swipe-out-down}@keyframes swipe-out-left{from{transform:var(--y) translateX(var(--swipe-amount-x));opacity:1}to{transform:var(--y) translateX(calc(var(--swipe-amount-x) - 100%));opacity:0}}@keyframes swipe-out-right{from{transform:var(--y) translateX(var(--swipe-amount-x));opacity:1}to{transform:var(--y) translateX(calc(var(--swipe-amount-x) + 100%));opacity:0}}@keyframes swipe-out-up{from{transform:var(--y) translateY(var(--swipe-amount-y));opacity:1}to{transform:var(--y) translateY(calc(var(--swipe-amount-y) - 100%));opacity:0}}@keyframes swipe-out-down{from{transform:var(--y) translateY(var(--swipe-amount-y));opacity:1}to{transform:var(--y) translateY(calc(var(--swipe-amount-y) + 100%));opacity:0}}@media (max-width:600px){[data-sonner-toaster]{position:fixed;right:var(--mobile-offset-right);left:var(--mobile-offset-left);width:100%}[data-sonner-toaster][dir=rtl]{left:calc(var(--mobile-offset-left) * -1)}[data-sonner-toaster] [data-sonner-toast]{left:0;right:0;width:calc(100% - var(--mobile-offset-left) * 2)}[data-sonner-toaster][data-x-position=left]{left:var(--mobile-offset-left)}[data-sonner-toaster][data-y-position=bottom]{bottom:var(--mobile-offset-bottom)}[data-sonner-toaster][data-y-position=top]{top:var(--mobile-offset-top)}[data-sonner-toaster][data-x-position=center]{left:var(--mobile-offset-left);right:var(--mobile-offset-right);transform:none}}[data-sonner-toaster][data-sonner-theme=light]{--normal-bg:#fff;--normal-border:var(--gray4);--normal-text:var(--gray12);--success-bg:hsl(143, 85%, 96%);--success-border:hsl(145, 92%, 87%);--success-text:hsl(140, 100%, 27%);--info-bg:hsl(208, 100%, 97%);--info-border:hsl(221, 91%, 93%);--info-text:hsl(210, 92%, 45%);--warning-bg:hsl(49, 100%, 97%);--warning-border:hsl(49, 91%, 84%);--warning-text:hsl(31, 92%, 45%);--error-bg:hsl(359, 100%, 97%);--error-border:hsl(359, 100%, 94%);--error-text:hsl(360, 100%, 45%)}[data-sonner-toaster][data-sonner-theme=light] [data-sonner-toast][data-invert=true]{--normal-bg:#000;--normal-border:hsl(0, 0%, 20%);--normal-text:var(--gray1)}[data-sonner-toaster][data-sonner-theme=dark] [data-sonner-toast][data-invert=true]{--normal-bg:#fff;--normal-border:var(--gray3);--normal-text:var(--gray12)}[data-sonner-toaster][data-sonner-theme=dark]{--normal-bg:#000;--normal-bg-hover:hsl(0, 0%, 12%);--normal-border:hsl(0, 0%, 20%);--normal-border-hover:hsl(0, 0%, 25%);--normal-text:var(--gray1);--success-bg:hsl(150, 100%, 6%);--success-border:hsl(147, 100%, 12%);--success-text:hsl(150, 86%, 65%);--info-bg:hsl(215, 100%, 6%);--info-border:hsl(223, 43%, 17%);--info-text:hsl(216, 87%, 65%);--warning-bg:hsl(64, 100%, 6%);--warning-border:hsl(60, 100%, 9%);--warning-text:hsl(46, 87%, 65%);--error-bg:hsl(358, 76%, 10%);--error-border:hsl(357, 89%, 16%);--error-text:hsl(358, 100%, 81%)}[data-sonner-toaster][data-sonner-theme=dark] [data-sonner-toast] [data-close-button]{background:var(--normal-bg);border-color:var(--normal-border);color:var(--normal-text)}[data-sonner-toaster][data-sonner-theme=dark] [data-sonner-toast] [data-close-button]:hover{background:var(--normal-bg-hover);border-color:var(--normal-border-hover)}[data-rich-colors=true][data-sonner-toast][data-type=success]{background:var(--success-bg);border-color:var(--success-border);color:var(--success-text)}[data-rich-colors=true][data-sonner-toast][data-type=success] [data-close-button]{background:var(--success-bg);border-color:var(--success-border);color:var(--success-text)}[data-rich-colors=true][data-sonner-toast][data-type=info]{background:var(--info-bg);border-color:var(--info-border);color:var(--info-text)}[data-rich-colors=true][data-sonner-toast][data-type=info] [data-close-button]{background:var(--info-bg);border-color:var(--info-border);color:var(--info-text)}[data-rich-colors=true][data-sonner-toast][data-type=warning]{background:var(--warning-bg);border-color:var(--warning-border);color:var(--warning-text)}[data-rich-colors=true][data-sonner-toast][data-type=warning] [data-close-button]{background:var(--warning-bg);border-color:var(--warning-border);color:var(--warning-text)}[data-rich-colors=true][data-sonner-toast][data-type=error]{background:var(--error-bg);border-color:var(--error-border);color:var(--error-text)}[data-rich-colors=true][data-sonner-toast][data-type=error] [data-close-button]{background:var(--error-bg);border-color:var(--error-border);color:var(--error-text)}.sonner-loading-wrapper{--size:16px;height:var(--size);width:var(--size);position:absolute;inset:0;z-index:10}.sonner-loading-wrapper[data-visible=false]{transform-origin:center;animation:sonner-fade-out .2s ease forwards}.sonner-spinner{position:relative;top:50%;left:50%;height:var(--size);width:var(--size)}.sonner-loading-bar{animation:sonner-spin 1.2s linear infinite;background:var(--gray11);border-radius:6px;height:8%;left:-10%;position:absolute;top:-3.9%;width:24%}.sonner-loading-bar:first-child{animation-delay:-1.2s;transform:rotate(.0001deg) translate(146%)}.sonner-loading-bar:nth-child(2){animation-delay:-1.1s;transform:rotate(30deg) translate(146%)}.sonner-loading-bar:nth-child(3){animation-delay:-1s;transform:rotate(60deg) translate(146%)}.sonner-loading-bar:nth-child(4){animation-delay:-.9s;transform:rotate(90deg) translate(146%)}.sonner-loading-bar:nth-child(5){animation-delay:-.8s;transform:rotate(120deg) translate(146%)}.sonner-loading-bar:nth-child(6){animation-delay:-.7s;transform:rotate(150deg) translate(146%)}.sonner-loading-bar:nth-child(7){animation-delay:-.6s;transform:rotate(180deg) translate(146%)}.sonner-loading-bar:nth-child(8){animation-delay:-.5s;transform:rotate(210deg) translate(146%)}.sonner-loading-bar:nth-child(9){animation-delay:-.4s;transform:rotate(240deg) translate(146%)}.sonner-loading-bar:nth-child(10){animation-delay:-.3s;transform:rotate(270deg) translate(146%)}.sonner-loading-bar:nth-child(11){animation-delay:-.2s;transform:rotate(300deg) translate(146%)}.sonner-loading-bar:nth-child(12){animation-delay:-.1s;transform:rotate(330deg) translate(146%)}@keyframes sonner-fade-in{0%{opacity:0;transform:scale(.8)}100%{opacity:1;transform:scale(1)}}@keyframes sonner-fade-out{0%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(.8)}}@keyframes sonner-spin{0%{opacity:1}100%{opacity:.15}}@media (prefers-reduced-motion){.sonner-loading-bar,[data-sonner-toast],[data-sonner-toast]>*{transition:none!important;animation:none!important}}.sonner-loader{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);transform-origin:center;transition:opacity .2s,transform .2s}.sonner-loader[data-visible=false]{opacity:0;transform:scale(.8) translate(-50%,-50%)}");
function co(e) {
  return e.label !== void 0;
}
const KS = 3, JS = "24px", XS = "16px", Jc = 4e3, eC = 356, tC = 14, nC = 45, rC = 200;
function Ut(...e) {
  return e.filter(Boolean).join(" ");
}
function oC(e) {
  const [t, n] = e.split("-"), r = [];
  return t && r.push(t), n && r.push(n), r;
}
const sC = (e) => {
  var t, n, r, o, a, i, c, l, d;
  const { invert: f, toast: u, unstyled: h, interacting: g, setHeights: b, visibleToasts: v, heights: y, index: w, toasts: k, expanded: _, removeToast: x, defaultRichColors: S, closeButton: I, style: R, cancelButtonStyle: E, actionButtonStyle: P, className: O = "", descriptionClassName: T = "", duration: D, position: j, gap: z, expandByDefault: W, classNames: $, icons: C, closeButtonAriaLabel: N = "Close toast" } = e, [H, G] = L.useState(null), [J, fe] = L.useState(null), [Z, X] = L.useState(!1), [Q, ge] = L.useState(!1), [F, Y] = L.useState(!1), [he, V] = L.useState(!1), [ie, ue] = L.useState(!1), [pe, $e] = L.useState(0), [Ye, et] = L.useState(0), Qe = L.useRef(u.duration || D || Jc), At = L.useRef(null), tt = L.useRef(null), dn = w === 0, _t = w + 1 <= v, Pe = u.type, ot = u.dismissible !== !1, Ee = u.className || "", en = u.descriptionClassName || "", yt = L.useMemo(() => y.findIndex((me) => me.toastId === u.id) || 0, [
    y,
    u.id
  ]), ft = L.useMemo(() => {
    var me;
    return (me = u.closeButton) != null ? me : I;
  }, [
    u.closeButton,
    I
  ]), M = L.useMemo(() => u.duration || D || Jc, [
    u.duration,
    D
  ]), te = L.useRef(0), ce = L.useRef(0), _e = L.useRef(0), ke = L.useRef(null), [ze, Bn] = j.split("-"), kt = L.useMemo(() => y.reduce((me, Ue, we) => we >= yt ? me : me + Ue.height, 0), [
    y,
    yt
  ]), tn = VS(), gr = u.invert || f, Cn = Pe === "loading";
  ce.current = L.useMemo(() => yt * z + kt, [
    yt,
    kt
  ]), L.useEffect(() => {
    Qe.current = M;
  }, [
    M
  ]), L.useEffect(() => {
    X(!0);
  }, []), L.useEffect(() => {
    const me = tt.current;
    if (me) {
      const Ue = me.getBoundingClientRect().height;
      return et(Ue), b((we) => [
        {
          toastId: u.id,
          height: Ue,
          position: u.position
        },
        ...we
      ]), () => b((we) => we.filter((Ve) => Ve.toastId !== u.id));
    }
  }, [
    b,
    u.id
  ]), L.useLayoutEffect(() => {
    if (!Z) return;
    const me = tt.current, Ue = me.style.height;
    me.style.height = "auto";
    const we = me.getBoundingClientRect().height;
    me.style.height = Ue, et(we), b((Ve) => Ve.find((We) => We.toastId === u.id) ? Ve.map((We) => We.toastId === u.id ? {
      ...We,
      height: we
    } : We) : [
      {
        toastId: u.id,
        height: we,
        position: u.position
      },
      ...Ve
    ]);
  }, [
    Z,
    u.title,
    u.description,
    b,
    u.id,
    u.jsx,
    u.action,
    u.cancel
  ]);
  const Bt = L.useCallback(() => {
    ge(!0), $e(ce.current), b((me) => me.filter((Ue) => Ue.toastId !== u.id)), setTimeout(() => {
      x(u);
    }, rC);
  }, [
    u,
    x,
    b,
    ce
  ]);
  L.useEffect(() => {
    if (u.promise && Pe === "loading" || u.duration === 1 / 0 || u.type === "loading") return;
    let me;
    return _ || g || tn ? (() => {
      if (_e.current < te.current) {
        const Ve = (/* @__PURE__ */ new Date()).getTime() - te.current;
        Qe.current = Qe.current - Ve;
      }
      _e.current = (/* @__PURE__ */ new Date()).getTime();
    })() : (() => {
      Qe.current !== 1 / 0 && (te.current = (/* @__PURE__ */ new Date()).getTime(), me = setTimeout(() => {
        u.onAutoClose == null || u.onAutoClose.call(u, u), Bt();
      }, Qe.current));
    })(), () => clearTimeout(me);
  }, [
    _,
    g,
    u,
    Pe,
    tn,
    Bt
  ]), L.useEffect(() => {
    u.delete && (Bt(), u.onDismiss == null || u.onDismiss.call(u, u));
  }, [
    Bt,
    u.delete
  ]);
  function Un() {
    var me;
    if (C?.loading) {
      var Ue;
      return /* @__PURE__ */ L.createElement("div", {
        className: Ut($?.loader, u == null || (Ue = u.classNames) == null ? void 0 : Ue.loader, "sonner-loader"),
        "data-visible": Pe === "loading"
      }, C.loading);
    }
    return /* @__PURE__ */ L.createElement($S, {
      className: Ut($?.loader, u == null || (me = u.classNames) == null ? void 0 : me.loader),
      visible: Pe === "loading"
    });
  }
  const Vn = u.icon || C?.[Pe] || LS(Pe);
  var Gr, un;
  return /* @__PURE__ */ L.createElement("li", {
    tabIndex: 0,
    ref: tt,
    className: Ut(O, Ee, $?.toast, u == null || (t = u.classNames) == null ? void 0 : t.toast, $?.default, $?.[Pe], u == null || (n = u.classNames) == null ? void 0 : n[Pe]),
    "data-sonner-toast": "",
    "data-rich-colors": (Gr = u.richColors) != null ? Gr : S,
    "data-styled": !(u.jsx || u.unstyled || h),
    "data-mounted": Z,
    "data-promise": !!u.promise,
    "data-swiped": ie,
    "data-removed": Q,
    "data-visible": _t,
    "data-y-position": ze,
    "data-x-position": Bn,
    "data-index": w,
    "data-front": dn,
    "data-swiping": F,
    "data-dismissible": ot,
    "data-type": Pe,
    "data-invert": gr,
    "data-swipe-out": he,
    "data-swipe-direction": J,
    "data-expanded": !!(_ || W && Z),
    "data-testid": u.testId,
    style: {
      "--index": w,
      "--toasts-before": w,
      "--z-index": k.length - w,
      "--offset": `${Q ? pe : ce.current}px`,
      "--initial-height": W ? "auto" : `${Ye}px`,
      ...R,
      ...u.style
    },
    onDragEnd: () => {
      Y(!1), G(null), ke.current = null;
    },
    onPointerDown: (me) => {
      me.button !== 2 && (Cn || !ot || (At.current = /* @__PURE__ */ new Date(), $e(ce.current), me.target.setPointerCapture(me.pointerId), me.target.tagName !== "BUTTON" && (Y(!0), ke.current = {
        x: me.clientX,
        y: me.clientY
      })));
    },
    onPointerUp: () => {
      var me, Ue, we;
      if (he || !ot) return;
      ke.current = null;
      const Ve = Number(((me = tt.current) == null ? void 0 : me.style.getPropertyValue("--swipe-amount-x").replace("px", "")) || 0), Wn = Number(((Ue = tt.current) == null ? void 0 : Ue.style.getPropertyValue("--swipe-amount-y").replace("px", "")) || 0), We = (/* @__PURE__ */ new Date()).getTime() - ((we = At.current) == null ? void 0 : we.getTime()), nt = H === "x" ? Ve : Wn, Nn = Math.abs(nt) / We;
      if (Math.abs(nt) >= nC || Nn > 0.11) {
        $e(ce.current), u.onDismiss == null || u.onDismiss.call(u, u), fe(H === "x" ? Ve > 0 ? "right" : "left" : Wn > 0 ? "down" : "up"), Bt(), V(!0);
        return;
      } else {
        var pt, vt;
        (pt = tt.current) == null || pt.style.setProperty("--swipe-amount-x", "0px"), (vt = tt.current) == null || vt.style.setProperty("--swipe-amount-y", "0px");
      }
      ue(!1), Y(!1), G(null);
    },
    onPointerMove: (me) => {
      var Ue, we, Ve;
      if (!ke.current || !ot || ((Ue = window.getSelection()) == null ? void 0 : Ue.toString().length) > 0) return;
      const We = me.clientY - ke.current.y, nt = me.clientX - ke.current.x;
      var Nn;
      const pt = (Nn = e.swipeDirections) != null ? Nn : oC(j);
      !H && (Math.abs(nt) > 1 || Math.abs(We) > 1) && G(Math.abs(nt) > Math.abs(We) ? "x" : "y");
      let vt = {
        x: 0,
        y: 0
      };
      const bt = (st) => 1 / (1.5 + Math.abs(st) / 20);
      if (H === "y") {
        if (pt.includes("top") || pt.includes("bottom"))
          if (pt.includes("top") && We < 0 || pt.includes("bottom") && We > 0)
            vt.y = We;
          else {
            const st = We * bt(We);
            vt.y = Math.abs(st) < Math.abs(We) ? st : We;
          }
      } else if (H === "x" && (pt.includes("left") || pt.includes("right")))
        if (pt.includes("left") && nt < 0 || pt.includes("right") && nt > 0)
          vt.x = nt;
        else {
          const st = nt * bt(nt);
          vt.x = Math.abs(st) < Math.abs(nt) ? st : nt;
        }
      (Math.abs(vt.x) > 0 || Math.abs(vt.y) > 0) && ue(!0), (we = tt.current) == null || we.style.setProperty("--swipe-amount-x", `${vt.x}px`), (Ve = tt.current) == null || Ve.style.setProperty("--swipe-amount-y", `${vt.y}px`);
    }
  }, ft && !u.jsx && Pe !== "loading" ? /* @__PURE__ */ L.createElement("button", {
    "aria-label": N,
    "data-disabled": Cn,
    "data-close-button": !0,
    onClick: Cn || !ot ? () => {
    } : () => {
      Bt(), u.onDismiss == null || u.onDismiss.call(u, u);
    },
    className: Ut($?.closeButton, u == null || (r = u.classNames) == null ? void 0 : r.closeButton)
  }, (un = C?.close) != null ? un : US) : null, (Pe || u.icon || u.promise) && u.icon !== null && (C?.[Pe] !== null || u.icon) ? /* @__PURE__ */ L.createElement("div", {
    "data-icon": "",
    className: Ut($?.icon, u == null || (o = u.classNames) == null ? void 0 : o.icon)
  }, u.promise || u.type === "loading" && !u.icon ? u.icon || Un() : null, u.type !== "loading" ? Vn : null) : null, /* @__PURE__ */ L.createElement("div", {
    "data-content": "",
    className: Ut($?.content, u == null || (a = u.classNames) == null ? void 0 : a.content)
  }, /* @__PURE__ */ L.createElement("div", {
    "data-title": "",
    className: Ut($?.title, u == null || (i = u.classNames) == null ? void 0 : i.title)
  }, u.jsx ? u.jsx : typeof u.title == "function" ? u.title() : u.title), u.description ? /* @__PURE__ */ L.createElement("div", {
    "data-description": "",
    className: Ut(T, en, $?.description, u == null || (c = u.classNames) == null ? void 0 : c.description)
  }, typeof u.description == "function" ? u.description() : u.description) : null), /* @__PURE__ */ L.isValidElement(u.cancel) ? u.cancel : u.cancel && co(u.cancel) ? /* @__PURE__ */ L.createElement("button", {
    "data-button": !0,
    "data-cancel": !0,
    style: u.cancelButtonStyle || E,
    onClick: (me) => {
      co(u.cancel) && ot && (u.cancel.onClick == null || u.cancel.onClick.call(u.cancel, me), Bt());
    },
    className: Ut($?.cancelButton, u == null || (l = u.classNames) == null ? void 0 : l.cancelButton)
  }, u.cancel.label) : null, /* @__PURE__ */ L.isValidElement(u.action) ? u.action : u.action && co(u.action) ? /* @__PURE__ */ L.createElement("button", {
    "data-button": !0,
    "data-action": !0,
    style: u.actionButtonStyle || P,
    onClick: (me) => {
      co(u.action) && (u.action.onClick == null || u.action.onClick.call(u.action, me), !me.defaultPrevented && Bt());
    },
    className: Ut($?.actionButton, u == null || (d = u.classNames) == null ? void 0 : d.actionButton)
  }, u.action.label) : null);
};
function Xc() {
  if (typeof window > "u" || typeof document > "u") return "ltr";
  const e = document.documentElement.getAttribute("dir");
  return e === "auto" || !e ? window.getComputedStyle(document.documentElement).direction : e;
}
function aC(e, t) {
  const n = {};
  return [
    e,
    t
  ].forEach((r, o) => {
    const a = o === 1, i = a ? "--mobile-offset" : "--offset", c = a ? XS : JS;
    function l(d) {
      [
        "top",
        "right",
        "bottom",
        "left"
      ].forEach((f) => {
        n[`${i}-${f}`] = typeof d == "number" ? `${d}px` : d;
      });
    }
    typeof r == "number" || typeof r == "string" ? l(r) : typeof r == "object" ? [
      "top",
      "right",
      "bottom",
      "left"
    ].forEach((d) => {
      r[d] === void 0 ? n[`${i}-${d}`] = c : n[`${i}-${d}`] = typeof r[d] == "number" ? `${r[d]}px` : r[d];
    }) : l(c);
  }), n;
}
const iC = /* @__PURE__ */ L.forwardRef(function(t, n) {
  const { id: r, invert: o, position: a = "bottom-right", hotkey: i = [
    "altKey",
    "KeyT"
  ], expand: c, closeButton: l, className: d, offset: f, mobileOffset: u, theme: h = "light", richColors: g, duration: b, style: v, visibleToasts: y = KS, toastOptions: w, dir: k = Xc(), gap: _ = tC, icons: x, containerAriaLabel: S = "Notifications" } = t, [I, R] = L.useState([]), E = L.useMemo(() => r ? I.filter((Z) => Z.toasterId === r) : I.filter((Z) => !Z.toasterId), [
    I,
    r
  ]), P = L.useMemo(() => Array.from(new Set([
    a
  ].concat(E.filter((Z) => Z.position).map((Z) => Z.position)))), [
    E,
    a
  ]), [O, T] = L.useState([]), [D, j] = L.useState(!1), [z, W] = L.useState(!1), [$, C] = L.useState(h !== "system" ? h : typeof window < "u" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"), N = L.useRef(null), H = i.join("+").replace(/Key/g, "").replace(/Digit/g, ""), G = L.useRef(null), J = L.useRef(!1), fe = L.useCallback((Z) => {
    R((X) => {
      var Q;
      return (Q = X.find((ge) => ge.id === Z.id)) != null && Q.delete || ht.dismiss(Z.id), X.filter(({ id: ge }) => ge !== Z.id);
    });
  }, []);
  return L.useEffect(() => ht.subscribe((Z) => {
    if (Z.dismiss) {
      requestAnimationFrame(() => {
        R((X) => X.map((Q) => Q.id === Z.id ? {
          ...Q,
          delete: !0
        } : Q));
      });
      return;
    }
    setTimeout(() => {
      ml.flushSync(() => {
        R((X) => {
          const Q = X.findIndex((ge) => ge.id === Z.id);
          return Q !== -1 ? [
            ...X.slice(0, Q),
            {
              ...X[Q],
              ...Z
            },
            ...X.slice(Q + 1)
          ] : [
            Z,
            ...X
          ];
        });
      });
    });
  }), [
    I
  ]), L.useEffect(() => {
    if (h !== "system") {
      C(h);
      return;
    }
    if (h === "system" && (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? C("dark") : C("light")), typeof window > "u") return;
    const Z = window.matchMedia("(prefers-color-scheme: dark)");
    try {
      Z.addEventListener("change", ({ matches: X }) => {
        C(X ? "dark" : "light");
      });
    } catch {
      Z.addListener(({ matches: Q }) => {
        try {
          C(Q ? "dark" : "light");
        } catch (ge) {
          console.error(ge);
        }
      });
    }
  }, [
    h
  ]), L.useEffect(() => {
    I.length <= 1 && j(!1);
  }, [
    I
  ]), L.useEffect(() => {
    const Z = (X) => {
      var Q;
      if (i.every((Y) => X[Y] || X.code === Y)) {
        var F;
        j(!0), (F = N.current) == null || F.focus();
      }
      X.code === "Escape" && (document.activeElement === N.current || (Q = N.current) != null && Q.contains(document.activeElement)) && j(!1);
    };
    return document.addEventListener("keydown", Z), () => document.removeEventListener("keydown", Z);
  }, [
    i
  ]), L.useEffect(() => {
    if (N.current)
      return () => {
        G.current && (G.current.focus({
          preventScroll: !0
        }), G.current = null, J.current = !1);
      };
  }, [
    N.current
  ]), // Remove item from normal navigation flow, only available via hotkey
  /* @__PURE__ */ L.createElement("section", {
    ref: n,
    "aria-label": `${S} ${H}`,
    tabIndex: -1,
    "aria-live": "polite",
    "aria-relevant": "additions text",
    "aria-atomic": "false",
    suppressHydrationWarning: !0
  }, P.map((Z, X) => {
    var Q;
    const [ge, F] = Z.split("-");
    return E.length ? /* @__PURE__ */ L.createElement("ol", {
      key: Z,
      dir: k === "auto" ? Xc() : k,
      tabIndex: -1,
      ref: N,
      className: d,
      "data-sonner-toaster": !0,
      "data-sonner-theme": $,
      "data-y-position": ge,
      "data-x-position": F,
      style: {
        "--front-toast-height": `${((Q = O[0]) == null ? void 0 : Q.height) || 0}px`,
        "--width": `${eC}px`,
        "--gap": `${_}px`,
        ...v,
        ...aC(f, u)
      },
      onBlur: (Y) => {
        J.current && !Y.currentTarget.contains(Y.relatedTarget) && (J.current = !1, G.current && (G.current.focus({
          preventScroll: !0
        }), G.current = null));
      },
      onFocus: (Y) => {
        Y.target instanceof HTMLElement && Y.target.dataset.dismissible === "false" || J.current || (J.current = !0, G.current = Y.relatedTarget);
      },
      onMouseEnter: () => j(!0),
      onMouseMove: () => j(!0),
      onMouseLeave: () => {
        z || j(!1);
      },
      onDragEnd: () => j(!1),
      onPointerDown: (Y) => {
        Y.target instanceof HTMLElement && Y.target.dataset.dismissible === "false" || W(!0);
      },
      onPointerUp: () => W(!1)
    }, E.filter((Y) => !Y.position && X === 0 || Y.position === Z).map((Y, he) => {
      var V, ie;
      return /* @__PURE__ */ L.createElement(sC, {
        key: Y.id,
        icons: x,
        index: he,
        toast: Y,
        defaultRichColors: g,
        duration: (V = w?.duration) != null ? V : b,
        className: w?.className,
        descriptionClassName: w?.descriptionClassName,
        invert: o,
        visibleToasts: y,
        closeButton: (ie = w?.closeButton) != null ? ie : l,
        interacting: z,
        position: Z,
        style: w?.style,
        unstyled: w?.unstyled,
        classNames: w?.classNames,
        cancelButtonStyle: w?.cancelButtonStyle,
        actionButtonStyle: w?.actionButtonStyle,
        closeButtonAriaLabel: w?.closeButtonAriaLabel,
        removeToast: fe,
        toasts: E.filter((ue) => ue.position == Y.position),
        heights: O.filter((ue) => ue.position == Y.position),
        setHeights: T,
        expandByDefault: c,
        gap: _,
        expanded: D,
        swipeDirections: t.swipeDirections
      });
    })) : null;
  }));
}), wi = m.createContext(null);
function cC() {
  const e = m.useContext(wi);
  if (!e) throw new Error("useToast must be used within ToastProvider");
  return e;
}
function ws() {
  return m.useContext(wi);
}
function lC({ children: e }) {
  const t = m.useCallback((n) => {
    const r = n.title ?? "", o = n.description;
    QS(r || o || "Notification", {
      description: r ? o : void 0,
      duration: n.durationMs ?? 5e3,
      action: n.actionLabel && n.onAction ? {
        label: n.actionLabel,
        onClick: () => n.onAction?.()
      } : void 0
    });
  }, []);
  return /* @__PURE__ */ p(wi.Provider, { value: { toast: t }, children: [
    e,
    /* @__PURE__ */ s(
      iC,
      {
        position: "top-center",
        closeButton: !0,
        expand: !0,
        className: "toaster group",
        toastOptions: {
          classNames: {
            toast: "group toast group-[.toaster]:pointer-events-auto group-[.toaster]:w-full group-[.toaster]:rounded-xl group-[.toaster]:border group-[.toaster]:border-neutral-200 group-[.toaster]:bg-white group-[.toaster]:p-4 group-[.toaster]:shadow-lg dark:group-[.toaster]:border-neutral-800 dark:group-[.toaster]:bg-neutral-950",
            title: "text-sm font-semibold text-neutral-950 dark:text-neutral-50",
            description: "text-sm text-neutral-600 dark:text-neutral-400",
            actionButton: "h-8 rounded-md border border-neutral-200 bg-white px-3 text-xs font-medium text-neutral-900 shadow-sm hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50 dark:hover:bg-neutral-900",
            cancelButton: "h-8 rounded-md bg-neutral-100 px-3 text-xs font-medium text-neutral-900 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-50 dark:hover:bg-neutral-700",
            closeButton: "rounded-md text-neutral-600 opacity-0 transition-opacity hover:bg-neutral-100 hover:text-neutral-900 group-hover:opacity-100 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-50"
          }
        }
      }
    )
  ] });
}
const {
  entries: ep,
  setPrototypeOf: el,
  isFrozen: dC,
  getPrototypeOf: uC,
  getOwnPropertyDescriptor: fC
} = Object;
let {
  freeze: dt,
  seal: Nt,
  create: wa
} = Object, {
  apply: xa,
  construct: _a
} = typeof Reflect < "u" && Reflect;
dt || (dt = function(t) {
  return t;
});
Nt || (Nt = function(t) {
  return t;
});
xa || (xa = function(t, n) {
  for (var r = arguments.length, o = new Array(r > 2 ? r - 2 : 0), a = 2; a < r; a++)
    o[a - 2] = arguments[a];
  return t.apply(n, o);
});
_a || (_a = function(t) {
  for (var n = arguments.length, r = new Array(n > 1 ? n - 1 : 0), o = 1; o < n; o++)
    r[o - 1] = arguments[o];
  return new t(...r);
});
const lo = ut(Array.prototype.forEach), pC = ut(Array.prototype.lastIndexOf), tl = ut(Array.prototype.pop), wr = ut(Array.prototype.push), mC = ut(Array.prototype.splice), bo = ut(String.prototype.toLowerCase), Vs = ut(String.prototype.toString), Ws = ut(String.prototype.match), xr = ut(String.prototype.replace), hC = ut(String.prototype.indexOf), gC = ut(String.prototype.trim), Mt = ut(Object.prototype.hasOwnProperty), at = ut(RegExp.prototype.test), _r = yC(TypeError);
function ut(e) {
  return function(t) {
    t instanceof RegExp && (t.lastIndex = 0);
    for (var n = arguments.length, r = new Array(n > 1 ? n - 1 : 0), o = 1; o < n; o++)
      r[o - 1] = arguments[o];
    return xa(e, t, r);
  };
}
function yC(e) {
  return function() {
    for (var t = arguments.length, n = new Array(t), r = 0; r < t; r++)
      n[r] = arguments[r];
    return _a(e, n);
  };
}
function ve(e, t) {
  let n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : bo;
  el && el(e, null);
  let r = t.length;
  for (; r--; ) {
    let o = t[r];
    if (typeof o == "string") {
      const a = n(o);
      a !== o && (dC(t) || (t[r] = a), o = a);
    }
    e[o] = !0;
  }
  return e;
}
function vC(e) {
  for (let t = 0; t < e.length; t++)
    Mt(e, t) || (e[t] = null);
  return e;
}
function Vt(e) {
  const t = wa(null);
  for (const [n, r] of ep(e))
    Mt(e, n) && (Array.isArray(r) ? t[n] = vC(r) : r && typeof r == "object" && r.constructor === Object ? t[n] = Vt(r) : t[n] = r);
  return t;
}
function kr(e, t) {
  for (; e !== null; ) {
    const r = fC(e, t);
    if (r) {
      if (r.get)
        return ut(r.get);
      if (typeof r.value == "function")
        return ut(r.value);
    }
    e = uC(e);
  }
  function n() {
    return null;
  }
  return n;
}
const nl = dt(["a", "abbr", "acronym", "address", "area", "article", "aside", "audio", "b", "bdi", "bdo", "big", "blink", "blockquote", "body", "br", "button", "canvas", "caption", "center", "cite", "code", "col", "colgroup", "content", "data", "datalist", "dd", "decorator", "del", "details", "dfn", "dialog", "dir", "div", "dl", "dt", "element", "em", "fieldset", "figcaption", "figure", "font", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "head", "header", "hgroup", "hr", "html", "i", "img", "input", "ins", "kbd", "label", "legend", "li", "main", "map", "mark", "marquee", "menu", "menuitem", "meter", "nav", "nobr", "ol", "optgroup", "option", "output", "p", "picture", "pre", "progress", "q", "rp", "rt", "ruby", "s", "samp", "search", "section", "select", "shadow", "slot", "small", "source", "spacer", "span", "strike", "strong", "style", "sub", "summary", "sup", "table", "tbody", "td", "template", "textarea", "tfoot", "th", "thead", "time", "tr", "track", "tt", "u", "ul", "var", "video", "wbr"]), Hs = dt(["svg", "a", "altglyph", "altglyphdef", "altglyphitem", "animatecolor", "animatemotion", "animatetransform", "circle", "clippath", "defs", "desc", "ellipse", "enterkeyhint", "exportparts", "filter", "font", "g", "glyph", "glyphref", "hkern", "image", "inputmode", "line", "lineargradient", "marker", "mask", "metadata", "mpath", "part", "path", "pattern", "polygon", "polyline", "radialgradient", "rect", "stop", "style", "switch", "symbol", "text", "textpath", "title", "tref", "tspan", "view", "vkern"]), Zs = dt(["feBlend", "feColorMatrix", "feComponentTransfer", "feComposite", "feConvolveMatrix", "feDiffuseLighting", "feDisplacementMap", "feDistantLight", "feDropShadow", "feFlood", "feFuncA", "feFuncB", "feFuncG", "feFuncR", "feGaussianBlur", "feImage", "feMerge", "feMergeNode", "feMorphology", "feOffset", "fePointLight", "feSpecularLighting", "feSpotLight", "feTile", "feTurbulence"]), bC = dt(["animate", "color-profile", "cursor", "discard", "font-face", "font-face-format", "font-face-name", "font-face-src", "font-face-uri", "foreignobject", "hatch", "hatchpath", "mesh", "meshgradient", "meshpatch", "meshrow", "missing-glyph", "script", "set", "solidcolor", "unknown", "use"]), qs = dt(["math", "menclose", "merror", "mfenced", "mfrac", "mglyph", "mi", "mlabeledtr", "mmultiscripts", "mn", "mo", "mover", "mpadded", "mphantom", "mroot", "mrow", "ms", "mspace", "msqrt", "mstyle", "msub", "msup", "msubsup", "mtable", "mtd", "mtext", "mtr", "munder", "munderover", "mprescripts"]), wC = dt(["maction", "maligngroup", "malignmark", "mlongdiv", "mscarries", "mscarry", "msgroup", "mstack", "msline", "msrow", "semantics", "annotation", "annotation-xml", "mprescripts", "none"]), rl = dt(["#text"]), ol = dt(["accept", "action", "align", "alt", "autocapitalize", "autocomplete", "autopictureinpicture", "autoplay", "background", "bgcolor", "border", "capture", "cellpadding", "cellspacing", "checked", "cite", "class", "clear", "color", "cols", "colspan", "controls", "controlslist", "coords", "crossorigin", "datetime", "decoding", "default", "dir", "disabled", "disablepictureinpicture", "disableremoteplayback", "download", "draggable", "enctype", "enterkeyhint", "exportparts", "face", "for", "headers", "height", "hidden", "high", "href", "hreflang", "id", "inert", "inputmode", "integrity", "ismap", "kind", "label", "lang", "list", "loading", "loop", "low", "max", "maxlength", "media", "method", "min", "minlength", "multiple", "muted", "name", "nonce", "noshade", "novalidate", "nowrap", "open", "optimum", "part", "pattern", "placeholder", "playsinline", "popover", "popovertarget", "popovertargetaction", "poster", "preload", "pubdate", "radiogroup", "readonly", "rel", "required", "rev", "reversed", "role", "rows", "rowspan", "spellcheck", "scope", "selected", "shape", "size", "sizes", "slot", "span", "srclang", "start", "src", "srcset", "step", "style", "summary", "tabindex", "title", "translate", "type", "usemap", "valign", "value", "width", "wrap", "xmlns", "slot"]), Gs = dt(["accent-height", "accumulate", "additive", "alignment-baseline", "amplitude", "ascent", "attributename", "attributetype", "azimuth", "basefrequency", "baseline-shift", "begin", "bias", "by", "class", "clip", "clippathunits", "clip-path", "clip-rule", "color", "color-interpolation", "color-interpolation-filters", "color-profile", "color-rendering", "cx", "cy", "d", "dx", "dy", "diffuseconstant", "direction", "display", "divisor", "dur", "edgemode", "elevation", "end", "exponent", "fill", "fill-opacity", "fill-rule", "filter", "filterunits", "flood-color", "flood-opacity", "font-family", "font-size", "font-size-adjust", "font-stretch", "font-style", "font-variant", "font-weight", "fx", "fy", "g1", "g2", "glyph-name", "glyphref", "gradientunits", "gradienttransform", "height", "href", "id", "image-rendering", "in", "in2", "intercept", "k", "k1", "k2", "k3", "k4", "kerning", "keypoints", "keysplines", "keytimes", "lang", "lengthadjust", "letter-spacing", "kernelmatrix", "kernelunitlength", "lighting-color", "local", "marker-end", "marker-mid", "marker-start", "markerheight", "markerunits", "markerwidth", "maskcontentunits", "maskunits", "max", "mask", "mask-type", "media", "method", "mode", "min", "name", "numoctaves", "offset", "operator", "opacity", "order", "orient", "orientation", "origin", "overflow", "paint-order", "path", "pathlength", "patterncontentunits", "patterntransform", "patternunits", "points", "preservealpha", "preserveaspectratio", "primitiveunits", "r", "rx", "ry", "radius", "refx", "refy", "repeatcount", "repeatdur", "restart", "result", "rotate", "scale", "seed", "shape-rendering", "slope", "specularconstant", "specularexponent", "spreadmethod", "startoffset", "stddeviation", "stitchtiles", "stop-color", "stop-opacity", "stroke-dasharray", "stroke-dashoffset", "stroke-linecap", "stroke-linejoin", "stroke-miterlimit", "stroke-opacity", "stroke", "stroke-width", "style", "surfacescale", "systemlanguage", "tabindex", "tablevalues", "targetx", "targety", "transform", "transform-origin", "text-anchor", "text-decoration", "text-rendering", "textlength", "type", "u1", "u2", "unicode", "values", "viewbox", "visibility", "version", "vert-adv-y", "vert-origin-x", "vert-origin-y", "width", "word-spacing", "wrap", "writing-mode", "xchannelselector", "ychannelselector", "x", "x1", "x2", "xmlns", "y", "y1", "y2", "z", "zoomandpan"]), sl = dt(["accent", "accentunder", "align", "bevelled", "close", "columnsalign", "columnlines", "columnspan", "denomalign", "depth", "dir", "display", "displaystyle", "encoding", "fence", "frame", "height", "href", "id", "largeop", "length", "linethickness", "lspace", "lquote", "mathbackground", "mathcolor", "mathsize", "mathvariant", "maxsize", "minsize", "movablelimits", "notation", "numalign", "open", "rowalign", "rowlines", "rowspacing", "rowspan", "rspace", "rquote", "scriptlevel", "scriptminsize", "scriptsizemultiplier", "selection", "separator", "separators", "stretchy", "subscriptshift", "supscriptshift", "symmetric", "voffset", "width", "xmlns"]), uo = dt(["xlink:href", "xml:id", "xlink:title", "xml:space", "xmlns:xlink"]), xC = Nt(/\{\{[\w\W]*|[\w\W]*\}\}/gm), _C = Nt(/<%[\w\W]*|[\w\W]*%>/gm), kC = Nt(/\$\{[\w\W]*/gm), SC = Nt(/^data-[\-\w.\u00B7-\uFFFF]+$/), CC = Nt(/^aria-[\-\w]+$/), tp = Nt(
  /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|matrix):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
  // eslint-disable-line no-useless-escape
), NC = Nt(/^(?:\w+script|data):/i), EC = Nt(
  /[\u0000-\u0020\u00A0\u1680\u180E\u2000-\u2029\u205F\u3000]/g
  // eslint-disable-line no-control-regex
), np = Nt(/^html$/i), AC = Nt(/^[a-z][.\w]*(-[.\w]+)+$/i);
var al = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  ARIA_ATTR: CC,
  ATTR_WHITESPACE: EC,
  CUSTOM_ELEMENT: AC,
  DATA_ATTR: SC,
  DOCTYPE_NAME: np,
  ERB_EXPR: _C,
  IS_ALLOWED_URI: tp,
  IS_SCRIPT_OR_DATA: NC,
  MUSTACHE_EXPR: xC,
  TMPLIT_EXPR: kC
});
const Sr = {
  element: 1,
  text: 3,
  // Deprecated
  progressingInstruction: 7,
  comment: 8,
  document: 9
}, PC = function() {
  return typeof window > "u" ? null : window;
}, IC = function(t, n) {
  if (typeof t != "object" || typeof t.createPolicy != "function")
    return null;
  let r = null;
  const o = "data-tt-policy-suffix";
  n && n.hasAttribute(o) && (r = n.getAttribute(o));
  const a = "dompurify" + (r ? "#" + r : "");
  try {
    return t.createPolicy(a, {
      createHTML(i) {
        return i;
      },
      createScriptURL(i) {
        return i;
      }
    });
  } catch {
    return console.warn("TrustedTypes policy " + a + " could not be created."), null;
  }
}, il = function() {
  return {
    afterSanitizeAttributes: [],
    afterSanitizeElements: [],
    afterSanitizeShadowDOM: [],
    beforeSanitizeAttributes: [],
    beforeSanitizeElements: [],
    beforeSanitizeShadowDOM: [],
    uponSanitizeAttribute: [],
    uponSanitizeElement: [],
    uponSanitizeShadowNode: []
  };
};
function rp() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : PC();
  const t = (le) => rp(le);
  if (t.version = "3.3.1", t.removed = [], !e || !e.document || e.document.nodeType !== Sr.document || !e.Element)
    return t.isSupported = !1, t;
  let {
    document: n
  } = e;
  const r = n, o = r.currentScript, {
    DocumentFragment: a,
    HTMLTemplateElement: i,
    Node: c,
    Element: l,
    NodeFilter: d,
    NamedNodeMap: f = e.NamedNodeMap || e.MozNamedAttrMap,
    HTMLFormElement: u,
    DOMParser: h,
    trustedTypes: g
  } = e, b = l.prototype, v = kr(b, "cloneNode"), y = kr(b, "remove"), w = kr(b, "nextSibling"), k = kr(b, "childNodes"), _ = kr(b, "parentNode");
  if (typeof i == "function") {
    const le = n.createElement("template");
    le.content && le.content.ownerDocument && (n = le.content.ownerDocument);
  }
  let x, S = "";
  const {
    implementation: I,
    createNodeIterator: R,
    createDocumentFragment: E,
    getElementsByTagName: P
  } = n, {
    importNode: O
  } = r;
  let T = il();
  t.isSupported = typeof ep == "function" && typeof _ == "function" && I && I.createHTMLDocument !== void 0;
  const {
    MUSTACHE_EXPR: D,
    ERB_EXPR: j,
    TMPLIT_EXPR: z,
    DATA_ATTR: W,
    ARIA_ATTR: $,
    IS_SCRIPT_OR_DATA: C,
    ATTR_WHITESPACE: N,
    CUSTOM_ELEMENT: H
  } = al;
  let {
    IS_ALLOWED_URI: G
  } = al, J = null;
  const fe = ve({}, [...nl, ...Hs, ...Zs, ...qs, ...rl]);
  let Z = null;
  const X = ve({}, [...ol, ...Gs, ...sl, ...uo]);
  let Q = Object.seal(wa(null, {
    tagNameCheck: {
      writable: !0,
      configurable: !1,
      enumerable: !0,
      value: null
    },
    attributeNameCheck: {
      writable: !0,
      configurable: !1,
      enumerable: !0,
      value: null
    },
    allowCustomizedBuiltInElements: {
      writable: !0,
      configurable: !1,
      enumerable: !0,
      value: !1
    }
  })), ge = null, F = null;
  const Y = Object.seal(wa(null, {
    tagCheck: {
      writable: !0,
      configurable: !1,
      enumerable: !0,
      value: null
    },
    attributeCheck: {
      writable: !0,
      configurable: !1,
      enumerable: !0,
      value: null
    }
  }));
  let he = !0, V = !0, ie = !1, ue = !0, pe = !1, $e = !0, Ye = !1, et = !1, Qe = !1, At = !1, tt = !1, dn = !1, _t = !0, Pe = !1;
  const ot = "user-content-";
  let Ee = !0, en = !1, yt = {}, ft = null;
  const M = ve({}, ["annotation-xml", "audio", "colgroup", "desc", "foreignobject", "head", "iframe", "math", "mi", "mn", "mo", "ms", "mtext", "noembed", "noframes", "noscript", "plaintext", "script", "style", "svg", "template", "thead", "title", "video", "xmp"]);
  let te = null;
  const ce = ve({}, ["audio", "video", "img", "source", "image", "track"]);
  let _e = null;
  const ke = ve({}, ["alt", "class", "for", "id", "label", "name", "pattern", "placeholder", "role", "summary", "title", "value", "style", "xmlns"]), ze = "http://www.w3.org/1998/Math/MathML", Bn = "http://www.w3.org/2000/svg", kt = "http://www.w3.org/1999/xhtml";
  let tn = kt, gr = !1, Cn = null;
  const Bt = ve({}, [ze, Bn, kt], Vs);
  let Un = ve({}, ["mi", "mo", "mn", "ms", "mtext"]), Vn = ve({}, ["annotation-xml"]);
  const Gr = ve({}, ["title", "style", "font", "a", "script"]);
  let un = null;
  const me = ["application/xhtml+xml", "text/html"], Ue = "text/html";
  let we = null, Ve = null;
  const Wn = n.createElement("form"), We = function(A) {
    return A instanceof RegExp || A instanceof Function;
  }, nt = function() {
    let A = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    if (!(Ve && Ve === A)) {
      if ((!A || typeof A != "object") && (A = {}), A = Vt(A), un = // eslint-disable-next-line unicorn/prefer-includes
      me.indexOf(A.PARSER_MEDIA_TYPE) === -1 ? Ue : A.PARSER_MEDIA_TYPE, we = un === "application/xhtml+xml" ? Vs : bo, J = Mt(A, "ALLOWED_TAGS") ? ve({}, A.ALLOWED_TAGS, we) : fe, Z = Mt(A, "ALLOWED_ATTR") ? ve({}, A.ALLOWED_ATTR, we) : X, Cn = Mt(A, "ALLOWED_NAMESPACES") ? ve({}, A.ALLOWED_NAMESPACES, Vs) : Bt, _e = Mt(A, "ADD_URI_SAFE_ATTR") ? ve(Vt(ke), A.ADD_URI_SAFE_ATTR, we) : ke, te = Mt(A, "ADD_DATA_URI_TAGS") ? ve(Vt(ce), A.ADD_DATA_URI_TAGS, we) : ce, ft = Mt(A, "FORBID_CONTENTS") ? ve({}, A.FORBID_CONTENTS, we) : M, ge = Mt(A, "FORBID_TAGS") ? ve({}, A.FORBID_TAGS, we) : Vt({}), F = Mt(A, "FORBID_ATTR") ? ve({}, A.FORBID_ATTR, we) : Vt({}), yt = Mt(A, "USE_PROFILES") ? A.USE_PROFILES : !1, he = A.ALLOW_ARIA_ATTR !== !1, V = A.ALLOW_DATA_ATTR !== !1, ie = A.ALLOW_UNKNOWN_PROTOCOLS || !1, ue = A.ALLOW_SELF_CLOSE_IN_ATTR !== !1, pe = A.SAFE_FOR_TEMPLATES || !1, $e = A.SAFE_FOR_XML !== !1, Ye = A.WHOLE_DOCUMENT || !1, At = A.RETURN_DOM || !1, tt = A.RETURN_DOM_FRAGMENT || !1, dn = A.RETURN_TRUSTED_TYPE || !1, Qe = A.FORCE_BODY || !1, _t = A.SANITIZE_DOM !== !1, Pe = A.SANITIZE_NAMED_PROPS || !1, Ee = A.KEEP_CONTENT !== !1, en = A.IN_PLACE || !1, G = A.ALLOWED_URI_REGEXP || tp, tn = A.NAMESPACE || kt, Un = A.MATHML_TEXT_INTEGRATION_POINTS || Un, Vn = A.HTML_INTEGRATION_POINTS || Vn, Q = A.CUSTOM_ELEMENT_HANDLING || {}, A.CUSTOM_ELEMENT_HANDLING && We(A.CUSTOM_ELEMENT_HANDLING.tagNameCheck) && (Q.tagNameCheck = A.CUSTOM_ELEMENT_HANDLING.tagNameCheck), A.CUSTOM_ELEMENT_HANDLING && We(A.CUSTOM_ELEMENT_HANDLING.attributeNameCheck) && (Q.attributeNameCheck = A.CUSTOM_ELEMENT_HANDLING.attributeNameCheck), A.CUSTOM_ELEMENT_HANDLING && typeof A.CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements == "boolean" && (Q.allowCustomizedBuiltInElements = A.CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements), pe && (V = !1), tt && (At = !0), yt && (J = ve({}, rl), Z = [], yt.html === !0 && (ve(J, nl), ve(Z, ol)), yt.svg === !0 && (ve(J, Hs), ve(Z, Gs), ve(Z, uo)), yt.svgFilters === !0 && (ve(J, Zs), ve(Z, Gs), ve(Z, uo)), yt.mathMl === !0 && (ve(J, qs), ve(Z, sl), ve(Z, uo))), A.ADD_TAGS && (typeof A.ADD_TAGS == "function" ? Y.tagCheck = A.ADD_TAGS : (J === fe && (J = Vt(J)), ve(J, A.ADD_TAGS, we))), A.ADD_ATTR && (typeof A.ADD_ATTR == "function" ? Y.attributeCheck = A.ADD_ATTR : (Z === X && (Z = Vt(Z)), ve(Z, A.ADD_ATTR, we))), A.ADD_URI_SAFE_ATTR && ve(_e, A.ADD_URI_SAFE_ATTR, we), A.FORBID_CONTENTS && (ft === M && (ft = Vt(ft)), ve(ft, A.FORBID_CONTENTS, we)), A.ADD_FORBID_CONTENTS && (ft === M && (ft = Vt(ft)), ve(ft, A.ADD_FORBID_CONTENTS, we)), Ee && (J["#text"] = !0), Ye && ve(J, ["html", "head", "body"]), J.table && (ve(J, ["tbody"]), delete ge.tbody), A.TRUSTED_TYPES_POLICY) {
        if (typeof A.TRUSTED_TYPES_POLICY.createHTML != "function")
          throw _r('TRUSTED_TYPES_POLICY configuration option must provide a "createHTML" hook.');
        if (typeof A.TRUSTED_TYPES_POLICY.createScriptURL != "function")
          throw _r('TRUSTED_TYPES_POLICY configuration option must provide a "createScriptURL" hook.');
        x = A.TRUSTED_TYPES_POLICY, S = x.createHTML("");
      } else
        x === void 0 && (x = IC(g, o)), x !== null && typeof S == "string" && (S = x.createHTML(""));
      dt && dt(A), Ve = A;
    }
  }, Nn = ve({}, [...Hs, ...Zs, ...bC]), pt = ve({}, [...qs, ...wC]), vt = function(A) {
    let q = _(A);
    (!q || !q.tagName) && (q = {
      namespaceURI: tn,
      tagName: "template"
    });
    const oe = bo(A.tagName), Ie = bo(q.tagName);
    return Cn[A.namespaceURI] ? A.namespaceURI === Bn ? q.namespaceURI === kt ? oe === "svg" : q.namespaceURI === ze ? oe === "svg" && (Ie === "annotation-xml" || Un[Ie]) : !!Nn[oe] : A.namespaceURI === ze ? q.namespaceURI === kt ? oe === "math" : q.namespaceURI === Bn ? oe === "math" && Vn[Ie] : !!pt[oe] : A.namespaceURI === kt ? q.namespaceURI === Bn && !Vn[Ie] || q.namespaceURI === ze && !Un[Ie] ? !1 : !pt[oe] && (Gr[oe] || !Nn[oe]) : !!(un === "application/xhtml+xml" && Cn[A.namespaceURI]) : !1;
  }, bt = function(A) {
    wr(t.removed, {
      element: A
    });
    try {
      _(A).removeChild(A);
    } catch {
      y(A);
    }
  }, st = function(A, q) {
    try {
      wr(t.removed, {
        attribute: q.getAttributeNode(A),
        from: q
      });
    } catch {
      wr(t.removed, {
        attribute: null,
        from: q
      });
    }
    if (q.removeAttribute(A), A === "is")
      if (At || tt)
        try {
          bt(q);
        } catch {
        }
      else
        try {
          q.setAttribute(A, "");
        } catch {
        }
  }, Ss = function(A) {
    let q = null, oe = null;
    if (Qe)
      A = "<remove></remove>" + A;
    else {
      const He = Ws(A, /^[\r\n\t ]+/);
      oe = He && He[0];
    }
    un === "application/xhtml+xml" && tn === kt && (A = '<html xmlns="http://www.w3.org/1999/xhtml"><head></head><body>' + A + "</body></html>");
    const Ie = x ? x.createHTML(A) : A;
    if (tn === kt)
      try {
        q = new h().parseFromString(Ie, un);
      } catch {
      }
    if (!q || !q.documentElement) {
      q = I.createDocument(tn, "template", null);
      try {
        q.documentElement.innerHTML = gr ? S : Ie;
      } catch {
      }
    }
    const rt = q.body || q.documentElement;
    return A && oe && rt.insertBefore(n.createTextNode(oe), rt.childNodes[0] || null), tn === kt ? P.call(q, Ye ? "html" : "body")[0] : Ye ? q.documentElement : rt;
  }, Ti = function(A) {
    return R.call(
      A.ownerDocument || A,
      A,
      // eslint-disable-next-line no-bitwise
      d.SHOW_ELEMENT | d.SHOW_COMMENT | d.SHOW_TEXT | d.SHOW_PROCESSING_INSTRUCTION | d.SHOW_CDATA_SECTION,
      null
    );
  }, Cs = function(A) {
    return A instanceof u && (typeof A.nodeName != "string" || typeof A.textContent != "string" || typeof A.removeChild != "function" || !(A.attributes instanceof f) || typeof A.removeAttribute != "function" || typeof A.setAttribute != "function" || typeof A.namespaceURI != "string" || typeof A.insertBefore != "function" || typeof A.hasChildNodes != "function");
  }, Ri = function(A) {
    return typeof c == "function" && A instanceof c;
  };
  function nn(le, A, q) {
    lo(le, (oe) => {
      oe.call(t, A, q, Ve);
    });
  }
  const Oi = function(A) {
    let q = null;
    if (nn(T.beforeSanitizeElements, A, null), Cs(A))
      return bt(A), !0;
    const oe = we(A.nodeName);
    if (nn(T.uponSanitizeElement, A, {
      tagName: oe,
      allowedTags: J
    }), $e && A.hasChildNodes() && !Ri(A.firstElementChild) && at(/<[/\w!]/g, A.innerHTML) && at(/<[/\w!]/g, A.textContent) || A.nodeType === Sr.progressingInstruction || $e && A.nodeType === Sr.comment && at(/<[/\w]/g, A.data))
      return bt(A), !0;
    if (!(Y.tagCheck instanceof Function && Y.tagCheck(oe)) && (!J[oe] || ge[oe])) {
      if (!ge[oe] && Li(oe) && (Q.tagNameCheck instanceof RegExp && at(Q.tagNameCheck, oe) || Q.tagNameCheck instanceof Function && Q.tagNameCheck(oe)))
        return !1;
      if (Ee && !ft[oe]) {
        const Ie = _(A) || A.parentNode, rt = k(A) || A.childNodes;
        if (rt && Ie) {
          const He = rt.length;
          for (let mt = He - 1; mt >= 0; --mt) {
            const rn = v(rt[mt], !0);
            rn.__removalCount = (A.__removalCount || 0) + 1, Ie.insertBefore(rn, w(A));
          }
        }
      }
      return bt(A), !0;
    }
    return A instanceof l && !vt(A) || (oe === "noscript" || oe === "noembed" || oe === "noframes") && at(/<\/no(script|embed|frames)/i, A.innerHTML) ? (bt(A), !0) : (pe && A.nodeType === Sr.text && (q = A.textContent, lo([D, j, z], (Ie) => {
      q = xr(q, Ie, " ");
    }), A.textContent !== q && (wr(t.removed, {
      element: A.cloneNode()
    }), A.textContent = q)), nn(T.afterSanitizeElements, A, null), !1);
  }, Mi = function(A, q, oe) {
    if (_t && (q === "id" || q === "name") && (oe in n || oe in Wn))
      return !1;
    if (!(V && !F[q] && at(W, q))) {
      if (!(he && at($, q))) {
        if (!(Y.attributeCheck instanceof Function && Y.attributeCheck(q, A))) {
          if (!Z[q] || F[q]) {
            if (
              // First condition does a very basic check if a) it's basically a valid custom element tagname AND
              // b) if the tagName passes whatever the user has configured for CUSTOM_ELEMENT_HANDLING.tagNameCheck
              // and c) if the attribute name passes whatever the user has configured for CUSTOM_ELEMENT_HANDLING.attributeNameCheck
              !(Li(A) && (Q.tagNameCheck instanceof RegExp && at(Q.tagNameCheck, A) || Q.tagNameCheck instanceof Function && Q.tagNameCheck(A)) && (Q.attributeNameCheck instanceof RegExp && at(Q.attributeNameCheck, q) || Q.attributeNameCheck instanceof Function && Q.attributeNameCheck(q, A)) || // Alternative, second condition checks if it's an `is`-attribute, AND
              // the value passes whatever the user has configured for CUSTOM_ELEMENT_HANDLING.tagNameCheck
              q === "is" && Q.allowCustomizedBuiltInElements && (Q.tagNameCheck instanceof RegExp && at(Q.tagNameCheck, oe) || Q.tagNameCheck instanceof Function && Q.tagNameCheck(oe)))
            ) return !1;
          } else if (!_e[q]) {
            if (!at(G, xr(oe, N, ""))) {
              if (!((q === "src" || q === "xlink:href" || q === "href") && A !== "script" && hC(oe, "data:") === 0 && te[A])) {
                if (!(ie && !at(C, xr(oe, N, "")))) {
                  if (oe)
                    return !1;
                }
              }
            }
          }
        }
      }
    }
    return !0;
  }, Li = function(A) {
    return A !== "annotation-xml" && Ws(A, H);
  }, Di = function(A) {
    nn(T.beforeSanitizeAttributes, A, null);
    const {
      attributes: q
    } = A;
    if (!q || Cs(A))
      return;
    const oe = {
      attrName: "",
      attrValue: "",
      keepAttr: !0,
      allowedAttributes: Z,
      forceKeepAttr: void 0
    };
    let Ie = q.length;
    for (; Ie--; ) {
      const rt = q[Ie], {
        name: He,
        namespaceURI: mt,
        value: rn
      } = rt, Hn = we(He), Ns = rn;
      let Ke = He === "value" ? Ns : gC(Ns);
      if (oe.attrName = Hn, oe.attrValue = Ke, oe.keepAttr = !0, oe.forceKeepAttr = void 0, nn(T.uponSanitizeAttribute, A, oe), Ke = oe.attrValue, Pe && (Hn === "id" || Hn === "name") && (st(He, A), Ke = ot + Ke), $e && at(/((--!?|])>)|<\/(style|title|textarea)/i, Ke)) {
        st(He, A);
        continue;
      }
      if (Hn === "attributename" && Ws(Ke, "href")) {
        st(He, A);
        continue;
      }
      if (oe.forceKeepAttr)
        continue;
      if (!oe.keepAttr) {
        st(He, A);
        continue;
      }
      if (!ue && at(/\/>/i, Ke)) {
        st(He, A);
        continue;
      }
      pe && lo([D, j, z], (zi) => {
        Ke = xr(Ke, zi, " ");
      });
      const $i = we(A.nodeName);
      if (!Mi($i, Hn, Ke)) {
        st(He, A);
        continue;
      }
      if (x && typeof g == "object" && typeof g.getAttributeType == "function" && !mt)
        switch (g.getAttributeType($i, Hn)) {
          case "TrustedHTML": {
            Ke = x.createHTML(Ke);
            break;
          }
          case "TrustedScriptURL": {
            Ke = x.createScriptURL(Ke);
            break;
          }
        }
      if (Ke !== Ns)
        try {
          mt ? A.setAttributeNS(mt, He, Ke) : A.setAttribute(He, Ke), Cs(A) ? bt(A) : tl(t.removed);
        } catch {
          st(He, A);
        }
    }
    nn(T.afterSanitizeAttributes, A, null);
  }, wp = function le(A) {
    let q = null;
    const oe = Ti(A);
    for (nn(T.beforeSanitizeShadowDOM, A, null); q = oe.nextNode(); )
      nn(T.uponSanitizeShadowNode, q, null), Oi(q), Di(q), q.content instanceof a && le(q.content);
    nn(T.afterSanitizeShadowDOM, A, null);
  };
  return t.sanitize = function(le) {
    let A = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {}, q = null, oe = null, Ie = null, rt = null;
    if (gr = !le, gr && (le = "<!-->"), typeof le != "string" && !Ri(le))
      if (typeof le.toString == "function") {
        if (le = le.toString(), typeof le != "string")
          throw _r("dirty is not a string, aborting");
      } else
        throw _r("toString is not a function");
    if (!t.isSupported)
      return le;
    if (et || nt(A), t.removed = [], typeof le == "string" && (en = !1), en) {
      if (le.nodeName) {
        const rn = we(le.nodeName);
        if (!J[rn] || ge[rn])
          throw _r("root node is forbidden and cannot be sanitized in-place");
      }
    } else if (le instanceof c)
      q = Ss("<!---->"), oe = q.ownerDocument.importNode(le, !0), oe.nodeType === Sr.element && oe.nodeName === "BODY" || oe.nodeName === "HTML" ? q = oe : q.appendChild(oe);
    else {
      if (!At && !pe && !Ye && // eslint-disable-next-line unicorn/prefer-includes
      le.indexOf("<") === -1)
        return x && dn ? x.createHTML(le) : le;
      if (q = Ss(le), !q)
        return At ? null : dn ? S : "";
    }
    q && Qe && bt(q.firstChild);
    const He = Ti(en ? le : q);
    for (; Ie = He.nextNode(); )
      Oi(Ie), Di(Ie), Ie.content instanceof a && wp(Ie.content);
    if (en)
      return le;
    if (At) {
      if (tt)
        for (rt = E.call(q.ownerDocument); q.firstChild; )
          rt.appendChild(q.firstChild);
      else
        rt = q;
      return (Z.shadowroot || Z.shadowrootmode) && (rt = O.call(r, rt, !0)), rt;
    }
    let mt = Ye ? q.outerHTML : q.innerHTML;
    return Ye && J["!doctype"] && q.ownerDocument && q.ownerDocument.doctype && q.ownerDocument.doctype.name && at(np, q.ownerDocument.doctype.name) && (mt = "<!DOCTYPE " + q.ownerDocument.doctype.name + `>
` + mt), pe && lo([D, j, z], (rn) => {
      mt = xr(mt, rn, " ");
    }), x && dn ? x.createHTML(mt) : mt;
  }, t.setConfig = function() {
    let le = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    nt(le), et = !0;
  }, t.clearConfig = function() {
    Ve = null, et = !1;
  }, t.isValidAttribute = function(le, A, q) {
    Ve || nt({});
    const oe = we(le), Ie = we(A);
    return Mi(oe, Ie, q);
  }, t.addHook = function(le, A) {
    typeof A == "function" && wr(T[le], A);
  }, t.removeHook = function(le, A) {
    if (A !== void 0) {
      const q = pC(T[le], A);
      return q === -1 ? void 0 : mC(T[le], q, 1)[0];
    }
    return tl(T[le]);
  }, t.removeHooks = function(le) {
    T[le] = [];
  }, t.removeAllHooks = function() {
    T = il();
  }, t;
}
var Ys = rp();
function op({
  faq: e,
  className: t,
  expanded: n,
  defaultExpanded: r = !1,
  onExpandedChange: o,
  showKeywords: a = !1,
  dangerouslySetAnswerHTML: i = !1
}) {
  const [c, l] = m.useState(r), d = n !== void 0, f = d ? n : c, u = () => {
    const h = !f;
    d || l(h), o?.(h);
  };
  return /* @__PURE__ */ p(
    "div",
    {
      className: B(
        "border border-neutral-200 rounded-lg overflow-hidden dark:border-neutral-800",
        t
      ),
      children: [
        /* @__PURE__ */ p(
          "button",
          {
            type: "button",
            onClick: u,
            className: B(
              "w-full flex items-center justify-between px-4 py-3 text-left",
              "bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-900 dark:hover:bg-neutral-800",
              "transition-colors duration-150"
            ),
            "aria-expanded": f,
            children: [
              /* @__PURE__ */ s("span", { className: "font-medium text-neutral-900 dark:text-neutral-100 pr-4", children: e.question }),
              /* @__PURE__ */ s(
                "svg",
                {
                  className: B(
                    "w-5 h-5 text-neutral-500 transition-transform duration-200 flex-shrink-0",
                    f && "rotate-180"
                  ),
                  fill: "none",
                  viewBox: "0 0 24 24",
                  stroke: "currentColor",
                  children: /* @__PURE__ */ s("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M19 9l-7 7-7-7" })
                }
              )
            ]
          }
        ),
        f && /* @__PURE__ */ p("div", { className: "px-4 py-3 bg-white dark:bg-neutral-950", children: [
          i ? /* @__PURE__ */ s(
            "div",
            {
              className: "text-sm text-neutral-600 dark:text-neutral-400 prose prose-sm dark:prose-invert max-w-none",
              dangerouslySetInnerHTML: {
                __html: (() => {
                  Ys.addHook("afterSanitizeAttributes", (g) => {
                    g.tagName === "A" && g.setAttribute("rel", "noopener noreferrer");
                  });
                  const h = Ys.sanitize(e.answer, {
                    ALLOWED_TAGS: ["b", "i", "em", "strong", "a", "p", "br", "ul", "ol", "li"],
                    ALLOWED_ATTR: ["href", "target", "rel"]
                  });
                  return Ys.removeAllHooks(), h;
                })()
              }
            }
          ) : /* @__PURE__ */ s("p", { className: "text-sm text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap", children: e.answer }),
          a && e.keywords && e.keywords.length > 0 && /* @__PURE__ */ s("div", { className: "mt-3 flex flex-wrap gap-1", children: e.keywords.map((h) => /* @__PURE__ */ s(
            "span",
            {
              className: "px-2 py-0.5 text-xs bg-neutral-100 text-neutral-600 rounded dark:bg-neutral-800 dark:text-neutral-400",
              children: h
            },
            h
          )) })
        ] })
      ]
    }
  );
}
function TC({
  faqs: e,
  className: t,
  accordion: n = !1,
  showKeywords: r = !1,
  dangerouslySetAnswerHTML: o = !1,
  emptyMessage: a = "No FAQs available."
}) {
  const [i, c] = m.useState(null), l = e.filter((d) => d.active !== !1);
  return l.length === 0 ? /* @__PURE__ */ s("div", { className: B("text-center py-8 text-neutral-500 dark:text-neutral-400", t), children: a }) : /* @__PURE__ */ s("div", { className: B("space-y-2", t), children: l.map((d) => /* @__PURE__ */ s(
    op,
    {
      faq: d,
      showKeywords: r,
      dangerouslySetAnswerHTML: o,
      expanded: n ? i === d.id : void 0,
      onExpandedChange: n ? (f) => c(f ? d.id : null) : void 0
    },
    d.id
  )) });
}
function Ge({ amount: e, currency: t }) {
  return new Intl.NumberFormat(void 0, {
    style: "currency",
    currency: t
  }).format(e);
}
function xs({
  amount: e,
  currency: t,
  compareAt: n,
  className: r,
  size: o = "default"
}) {
  const a = typeof n == "number" && n > e;
  return /* @__PURE__ */ p("div", { className: B("flex items-baseline gap-2 tabular-nums", r), children: [
    /* @__PURE__ */ s("span", { className: B("font-semibold", o === "sm" ? "text-sm" : "text-base"), children: Ge({ amount: e, currency: t }) }),
    a ? /* @__PURE__ */ s("span", { className: B(
      "text-neutral-500 line-through dark:text-neutral-400",
      o === "sm" ? "text-xs" : "text-sm"
    ), children: Ge({ amount: n, currency: t }) }) : null
  ] });
}
const cl = {
  large: "aspect-[4/5]",
  square: "aspect-square",
  compact: "aspect-[3/4]"
}, ll = {
  center: "object-center",
  top: "object-top",
  bottom: "object-bottom",
  left: "object-left",
  right: "object-right"
};
function sp({
  product: e,
  href: t,
  onAddToCart: n,
  onQuickView: r,
  className: o,
  layout: a = "large",
  imageCrop: i = "center"
}) {
  const c = e.inventoryStatus === "out_of_stock" || typeof e.inventoryQuantity == "number" && e.inventoryQuantity <= 0, l = typeof e.inventoryQuantity == "number" ? e.inventoryQuantity : null;
  return /* @__PURE__ */ p(Lt, { className: B("group flex h-full flex-col overflow-hidden rounded-2xl", o), children: [
    /* @__PURE__ */ p("div", { className: "relative", children: [
      t ? /* @__PURE__ */ s("a", { href: t, className: "block", "aria-label": `View ${e.title}`, children: /* @__PURE__ */ s("div", { className: B("overflow-hidden bg-neutral-100 dark:bg-neutral-900", cl[a]), children: /* @__PURE__ */ s(
        "img",
        {
          src: e.images[0]?.url,
          alt: e.images[0]?.alt ?? e.title,
          className: B(
            "h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]",
            ll[i]
          ),
          loading: "lazy"
        }
      ) }) }) : /* @__PURE__ */ s("div", { className: B("overflow-hidden bg-neutral-100 dark:bg-neutral-900", cl[a]), children: /* @__PURE__ */ s(
        "img",
        {
          src: e.images[0]?.url,
          alt: e.images[0]?.alt ?? e.title,
          className: B(
            "h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]",
            ll[i]
          ),
          loading: "lazy"
        }
      ) }),
      a !== "compact" && e.tags?.length ? /* @__PURE__ */ s("div", { className: "pointer-events-none absolute inset-x-0 bottom-0 flex gap-1 p-3", children: e.tags.slice(0, 2).map((d) => /* @__PURE__ */ s(Tn, { className: "pointer-events-none bg-white/90 text-neutral-900 backdrop-blur dark:bg-neutral-950/80 dark:text-neutral-50", children: d }, d)) }) : null,
      c ? /* @__PURE__ */ s("div", { className: "pointer-events-none absolute left-3 top-3", children: /* @__PURE__ */ s(Tn, { variant: "secondary", className: "bg-white/90 text-neutral-900 backdrop-blur dark:bg-neutral-950/80 dark:text-neutral-50", children: "Out of stock" }) }) : l != null && l > 0 && l <= 5 ? /* @__PURE__ */ s("div", { className: "pointer-events-none absolute left-3 top-3", children: /* @__PURE__ */ p(Tn, { variant: "secondary", className: "bg-white/90 text-neutral-900 backdrop-blur dark:bg-neutral-950/80 dark:text-neutral-50", children: [
        "Only ",
        l,
        " left"
      ] }) }) : null,
      r ? /* @__PURE__ */ s("div", { className: "absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100", children: /* @__PURE__ */ s(
        se,
        {
          type: "button",
          size: "sm",
          variant: "secondary",
          className: "h-9",
          onClick: () => r(e),
          children: "Quick view"
        }
      ) }) : null
    ] }),
    /* @__PURE__ */ p("div", { className: B("flex flex-1 flex-col", a === "compact" ? "p-3" : "p-4"), children: [
      /* @__PURE__ */ s("div", { className: "flex items-start justify-between gap-3", children: /* @__PURE__ */ p("div", { className: "min-w-0", children: [
        /* @__PURE__ */ s("div", { className: B(
          "line-clamp-1 font-medium text-neutral-950 dark:text-neutral-50",
          a === "compact" ? "text-xs" : "text-sm"
        ), children: e.title }),
        /* @__PURE__ */ s("div", { className: "mt-1", children: /* @__PURE__ */ s(
          xs,
          {
            amount: e.price,
            currency: e.currency,
            compareAt: e.compareAtPrice,
            size: a === "compact" ? "sm" : "default"
          }
        ) })
      ] }) }),
      a === "large" && /* @__PURE__ */ s("p", { className: "mt-2 line-clamp-2 min-h-8 text-xs leading-4 text-neutral-600 dark:text-neutral-400", children: e.description }),
      /* @__PURE__ */ s("div", { className: B("mt-auto", a === "compact" ? "pt-3" : "pt-4"), children: /* @__PURE__ */ s(
        se,
        {
          type: "button",
          className: "w-full",
          size: a === "compact" ? "sm" : "default",
          onClick: () => n?.(e, null),
          disabled: c,
          children: c ? "Out of stock" : "Add to cart"
        }
      ) })
    ] })
  ] });
}
function _s({
  products: e,
  columns: t,
  onAddToCart: n,
  onQuickView: r,
  getProductHref: o,
  className: a,
  layout: i,
  imageCrop: c
}) {
  const l = t?.base ?? 2, d = t?.md ?? 3, f = t?.lg ?? 3, u = { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4" }, h = { 1: "md:grid-cols-1", 2: "md:grid-cols-2", 3: "md:grid-cols-3", 4: "md:grid-cols-4" }, g = { 1: "lg:grid-cols-1", 2: "lg:grid-cols-2", 3: "lg:grid-cols-3", 4: "lg:grid-cols-4" }, b = B(
    "grid gap-4",
    u[Math.min(4, Math.max(1, l))],
    h[Math.min(4, Math.max(1, d))],
    g[Math.min(4, Math.max(1, f))]
  );
  return /* @__PURE__ */ s("div", { className: B(b, a), children: e.map((v) => /* @__PURE__ */ s(
    sp,
    {
      product: v,
      href: o ? o(v) : void 0,
      onAddToCart: n,
      onQuickView: r,
      layout: i,
      imageCrop: c
    },
    v.id
  )) });
}
function xi({
  images: e,
  className: t
}) {
  const [n, r] = m.useState(0), o = e[n];
  return e.length === 0 ? /* @__PURE__ */ s(
    "div",
    {
      className: B(
        "aspect-square w-full rounded-xl border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900",
        t
      )
    }
  ) : /* @__PURE__ */ p("div", { className: B("space-y-3", t), children: [
    /* @__PURE__ */ s("div", { className: "aspect-square overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900", children: /* @__PURE__ */ s(
      "img",
      {
        src: o?.url,
        alt: o?.alt ?? "",
        className: "h-full w-full object-cover",
        loading: "eager"
      }
    ) }),
    e.length > 1 ? /* @__PURE__ */ s("div", { className: "flex gap-2 overflow-x-auto pb-1", children: e.map((a, i) => /* @__PURE__ */ s(
      "button",
      {
        type: "button",
        className: B(
          "h-16 w-16 shrink-0 overflow-hidden rounded-lg border",
          i === n ? "border-neutral-900 dark:border-neutral-50" : "border-neutral-200 dark:border-neutral-800"
        ),
        onClick: () => r(i),
        "aria-label": `View image ${i + 1}`,
        children: /* @__PURE__ */ s("img", { src: a.url, alt: a.alt ?? "", className: "h-full w-full object-cover", loading: "lazy" })
      },
      a.url
    )) }) : null
  ] });
}
function RC(e) {
  const t = /* @__PURE__ */ new Set();
  for (const n of e)
    for (const r of Object.keys(n.options)) t.add(r);
  return Array.from(t);
}
function OC(e, t) {
  const n = /* @__PURE__ */ new Set();
  for (const r of e) {
    const o = r.options[t];
    o && n.add(o);
  }
  return Array.from(n);
}
function dl(e, t) {
  return e.find(
    (n) => Object.entries(t).every(([r, o]) => n.options[r] === o)
  ) ?? null;
}
function ap(e) {
  return e.inventoryStatus === "out_of_stock" || typeof e.inventoryQuantity == "number" && e.inventoryQuantity <= 0;
}
function MC(e) {
  return e.inventoryStatus === "low" || typeof e.inventoryQuantity == "number" && e.inventoryQuantity > 0 && e.inventoryQuantity <= 5;
}
function LC(e) {
  const t = ap(e), n = !t && MC(e), r = typeof e.inventoryQuantity == "number" ? e.inventoryQuantity : void 0;
  return { isOutOfStock: t, isLow: n, quantity: r };
}
function DC(e, t, n, r) {
  const o = { ...t, [n]: r }, a = e.filter(
    (i) => Object.entries(o).every(([c, l]) => i.options[c] === l)
  );
  return a.length === 0 ? !1 : a.some((i) => !ap(i));
}
function _i({
  product: e,
  value: t,
  onChange: n,
  className: r,
  showInventory: o = !0,
  disableOutOfStock: a = !1
}) {
  const i = m.useMemo(() => e.variants ?? [], [e.variants]), c = m.useMemo(() => RC(i), [i]), l = m.useMemo(
    () => dl(i, t.selectedOptions),
    [i, t.selectedOptions]
  ), d = m.useMemo(
    () => l ? LC(l) : null,
    [l]
  );
  return i.length === 0 || c.length === 0 ? null : /* @__PURE__ */ p("div", { className: B("space-y-4", r), children: [
    c.map((f) => {
      const u = OC(i, f), h = t.selectedOptions[f];
      return /* @__PURE__ */ p("div", { className: "space-y-2", children: [
        /* @__PURE__ */ p("div", { className: "flex items-baseline justify-between", children: [
          /* @__PURE__ */ s("div", { className: "text-sm font-medium text-neutral-950 dark:text-neutral-50", children: f }),
          /* @__PURE__ */ s("div", { className: "text-xs text-neutral-500 dark:text-neutral-400", children: h || "Select" })
        ] }),
        /* @__PURE__ */ s("div", { className: "flex flex-wrap gap-2", children: u.map((g) => {
          const b = g === h, v = DC(
            i,
            t.selectedOptions,
            f,
            g
          ), y = a && !v;
          return /* @__PURE__ */ p(
            se,
            {
              type: "button",
              size: "sm",
              variant: b ? "default" : "outline",
              onClick: () => {
                const w = { ...t.selectedOptions, [f]: g }, k = dl(i, w);
                n({ selectedOptions: w, variant: k });
              },
              "aria-pressed": b,
              disabled: y,
              className: B(
                !v && !y && "opacity-50 line-through"
              ),
              children: [
                g,
                !v && !y && /* @__PURE__ */ s("span", { className: "ml-1 text-[10px] opacity-70", children: "(Out)" })
              ]
            },
            g
          );
        }) })
      ] }, f);
    }),
    o && l && d && /* @__PURE__ */ s("div", { className: "pt-2", children: d.isOutOfStock ? /* @__PURE__ */ s("div", { className: "text-sm font-medium text-red-600 dark:text-red-400", children: "Out of stock" }) : d.isLow && d.quantity !== void 0 ? /* @__PURE__ */ p("div", { className: "text-sm text-amber-600 dark:text-amber-400", children: [
      "Only ",
      /* @__PURE__ */ s("span", { className: "font-semibold", children: d.quantity }),
      " left"
    ] }) : null })
  ] });
}
function ki({
  qty: e,
  onChange: t,
  min: n = 1,
  max: r,
  className: o
}) {
  const a = Number.isFinite(e) ? Math.max(n, Math.floor(e)) : n, i = a > n, c = typeof r == "number" ? a < r : !0;
  return /* @__PURE__ */ p("div", { className: B("flex items-center gap-2", o), children: [
    /* @__PURE__ */ s(
      se,
      {
        type: "button",
        size: "icon",
        variant: "outline",
        onClick: () => t(Math.max(n, a - 1)),
        disabled: !i,
        "aria-label": "Decrease quantity",
        children: "-"
      }
    ),
    /* @__PURE__ */ s(
      Ze,
      {
        inputMode: "numeric",
        pattern: "[0-9]*",
        value: String(a),
        onChange: (l) => {
          const d = Math.floor(Number(l.target.value));
          if (!Number.isFinite(d)) return;
          const f = Math.max(n, typeof r == "number" ? Math.min(r, d) : d);
          t(f);
        },
        className: "h-10 w-16 text-center",
        "aria-label": "Quantity"
      }
    ),
    /* @__PURE__ */ s(
      se,
      {
        type: "button",
        size: "icon",
        variant: "outline",
        onClick: () => t(a + 1),
        disabled: !c,
        "aria-label": "Increase quantity",
        children: "+"
      }
    )
  ] });
}
function Si({
  product: e,
  open: t,
  onOpenChange: n,
  productHref: r,
  onAddToCart: o,
  className: a
}) {
  const [i, c] = m.useState(1), [l, d] = m.useState({
    selectedOptions: {},
    variant: null
  });
  if (m.useEffect(() => {
    if (e)
      if (c(1), e.variants?.length) {
        const v = e.variants[0];
        d({ selectedOptions: { ...v.options }, variant: v });
      } else
        d({ selectedOptions: {}, variant: null });
  }, [e?.id]), !e) return null;
  const f = l.variant?.price ?? e.price, u = l.variant?.compareAtPrice ?? e.compareAtPrice, h = l.variant?.inventoryStatus === "out_of_stock" || typeof l.variant?.inventoryQuantity == "number" && l.variant.inventoryQuantity <= 0, g = e.inventoryStatus === "out_of_stock" || typeof e.inventoryQuantity == "number" && e.inventoryQuantity <= 0, b = l.variant ? h : g;
  return /* @__PURE__ */ s(ii, { open: t, onOpenChange: n, children: /* @__PURE__ */ p(ls, { className: B("max-w-3xl", a), children: [
    /* @__PURE__ */ s(li, { children: /* @__PURE__ */ p(ds, { className: "flex items-center justify-between gap-3", children: [
      /* @__PURE__ */ s("span", { className: "truncate", children: e.title }),
      r ? /* @__PURE__ */ s(
        "a",
        {
          href: r(e.slug),
          className: "text-sm font-normal text-neutral-700 hover:underline dark:text-neutral-300",
          children: "View details"
        }
      ) : null
    ] }) }),
    /* @__PURE__ */ p("div", { className: "grid gap-8 md:grid-cols-2", children: [
      /* @__PURE__ */ s(xi, { images: e.images }),
      /* @__PURE__ */ p("div", { className: "space-y-5", children: [
        /* @__PURE__ */ p("div", { children: [
          /* @__PURE__ */ s(xs, { amount: f, currency: e.currency, compareAt: u }),
          /* @__PURE__ */ s("p", { className: "mt-3 text-sm text-neutral-600 dark:text-neutral-400", children: e.description })
        ] }),
        /* @__PURE__ */ s(
          _i,
          {
            product: e,
            value: { selectedOptions: l.selectedOptions, variantId: l.variant?.id },
            onChange: (v) => d(v)
          }
        ),
        /* @__PURE__ */ p("div", { className: "flex flex-wrap items-center gap-3", children: [
          /* @__PURE__ */ s(ki, { qty: i, onChange: c }),
          /* @__PURE__ */ s(
            se,
            {
              type: "button",
              className: "flex-1",
              disabled: b,
              onClick: () => {
                o(e, l.variant, i), n(!1);
              },
              children: b ? "Out of stock" : "Add to cart"
            }
          )
        ] }),
        /* @__PURE__ */ s("div", { className: "text-xs text-neutral-500 dark:text-neutral-400", children: b ? "Out of stock" : "In stock" })
      ] })
    ] })
  ] }) });
}
function ka({
  categories: e,
  activeSlug: t,
  onSelect: n,
  className: r
}) {
  return /* @__PURE__ */ s("nav", { className: B("space-y-1", r), "aria-label": "Categories", children: e.map((o) => {
    const a = t === o.slug;
    return /* @__PURE__ */ p(
      "button",
      {
        type: "button",
        className: B(
          "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
          a ? "bg-neutral-900 text-neutral-50 dark:bg-neutral-50 dark:text-neutral-900" : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
        ),
        onClick: () => n?.(o),
        "aria-current": a ? "page" : void 0,
        children: [
          /* @__PURE__ */ s("span", { className: "truncate", children: o.name }),
          /* @__PURE__ */ s("span", { className: "text-xs opacity-70", children: "›" })
        ]
      },
      o.id
    );
  }) });
}
function Ci({ items: e, className: t }) {
  return /* @__PURE__ */ s("nav", { className: B("flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400", t), "aria-label": "Breadcrumb", children: e.map((n, r) => /* @__PURE__ */ p("span", { className: "flex items-center gap-2", children: [
    n.href ? /* @__PURE__ */ s("a", { href: n.href, className: "hover:underline", children: n.label }) : /* @__PURE__ */ s("span", { className: "text-neutral-900 dark:text-neutral-50", children: n.label }),
    r < e.length - 1 ? /* @__PURE__ */ s("span", { "aria-hidden": !0, children: "·" }) : null
  ] }, `${n.label}-${r}`)) });
}
function Ni({
  value: e,
  onChange: t,
  placeholder: n = "Search products…",
  className: r
}) {
  return /* @__PURE__ */ p("div", { className: B("relative", r), children: [
    /* @__PURE__ */ s(
      "div",
      {
        className: "pointer-events-none absolute inset-y-0 left-3 flex items-center text-neutral-500 dark:text-neutral-400",
        "aria-hidden": !0,
        children: "⌕"
      }
    ),
    /* @__PURE__ */ s(
      Ze,
      {
        value: e,
        onChange: (o) => t(o.target.value),
        placeholder: n,
        className: "pl-9",
        "aria-label": "Search"
      }
    )
  ] });
}
function $o({
  facets: e,
  value: t,
  onChange: n,
  onClear: r,
  className: o,
  enabledFilters: a
}) {
  const i = e.tags ?? [], c = new Set(t.tags ?? []), l = a?.tags ?? !0, d = a?.priceRange ?? !0, f = a?.inStock ?? !0;
  return l || d || f ? /* @__PURE__ */ p("div", { className: B("space-y-4", o), children: [
    /* @__PURE__ */ p("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ s("div", { className: "text-sm font-semibold text-neutral-950 dark:text-neutral-50", children: "Filters" }),
      /* @__PURE__ */ s(se, { type: "button", variant: "ghost", className: "h-8 px-2 text-xs", onClick: r, children: "Clear" })
    ] }),
    /* @__PURE__ */ s(St, {}),
    l && i.length ? /* @__PURE__ */ p("div", { className: "space-y-2", children: [
      /* @__PURE__ */ s("div", { className: "text-sm font-medium", children: "Tags" }),
      /* @__PURE__ */ s("div", { className: "space-y-2", children: i.map((h) => /* @__PURE__ */ p("label", { className: "flex cursor-pointer items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300", children: [
        /* @__PURE__ */ s(
          "input",
          {
            type: "checkbox",
            checked: c.has(h),
            onChange: (g) => {
              const b = new Set(c);
              g.target.checked ? b.add(h) : b.delete(h), n({ ...t, tags: Array.from(b) });
            }
          }
        ),
        h
      ] }, h)) })
    ] }) : null,
    d && e.price ? /* @__PURE__ */ p("div", { className: "space-y-2", children: [
      /* @__PURE__ */ s("div", { className: "text-sm font-medium", children: "Price" }),
      /* @__PURE__ */ p("div", { className: "grid gap-2 sm:grid-cols-2", children: [
        /* @__PURE__ */ p("div", { className: "grid gap-1", children: [
          /* @__PURE__ */ s(lt, { className: "text-xs", htmlFor: "price-min", children: "Min" }),
          /* @__PURE__ */ s(
            Ze,
            {
              id: "price-min",
              inputMode: "decimal",
              placeholder: String(e.price.min),
              value: t.priceMin ?? "",
              onChange: (h) => {
                const g = Number(h.target.value);
                n({ ...t, priceMin: Number.isFinite(g) && h.target.value !== "" ? g : void 0 });
              }
            }
          )
        ] }),
        /* @__PURE__ */ p("div", { className: "grid gap-1", children: [
          /* @__PURE__ */ s(lt, { className: "text-xs", htmlFor: "price-max", children: "Max" }),
          /* @__PURE__ */ s(
            Ze,
            {
              id: "price-max",
              inputMode: "decimal",
              placeholder: String(e.price.max),
              value: t.priceMax ?? "",
              onChange: (h) => {
                const g = Number(h.target.value);
                n({ ...t, priceMax: Number.isFinite(g) && h.target.value !== "" ? g : void 0 });
              }
            }
          )
        ] })
      ] })
    ] }) : null,
    f ? /* @__PURE__ */ p("div", { className: "space-y-2", children: [
      /* @__PURE__ */ s("div", { className: "text-sm font-medium", children: "Availability" }),
      /* @__PURE__ */ p("label", { className: "flex cursor-pointer items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300", children: [
        /* @__PURE__ */ s(
          "input",
          {
            type: "checkbox",
            checked: t.inStock ?? !1,
            onChange: (h) => n({ ...t, inStock: h.target.checked })
          }
        ),
        "In stock"
      ] })
    ] }) : null
  ] }) : null;
}
function ul(e) {
  return /* @__PURE__ */ p("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", ...e, children: [
    /* @__PURE__ */ s("circle", { cx: "12", cy: "12", r: "10" }),
    /* @__PURE__ */ s("line", { x1: "12", y1: "8", x2: "12", y2: "12" }),
    /* @__PURE__ */ s("line", { x1: "12", y1: "16", x2: "12.01", y2: "16" })
  ] });
}
function $C(e) {
  return /* @__PURE__ */ p("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", ...e, children: [
    /* @__PURE__ */ s("path", { d: "M3 6h18" }),
    /* @__PURE__ */ s("path", { d: "M8 6V4h8v2" }),
    /* @__PURE__ */ s("path", { d: "M6 6l1 16h10l1-16" }),
    /* @__PURE__ */ s("path", { d: "M10 11v6" }),
    /* @__PURE__ */ s("path", { d: "M14 11v6" })
  ] });
}
function Ei({
  item: e,
  onRemove: t,
  onSetQty: n,
  variant: r = "table",
  className: o,
  inventory: a
}) {
  const i = e.unitPrice * e.qty, [c, l] = m.useState(!1), d = m.useMemo(() => {
    if (a?.availableQty)
      return a.availableQty;
  }, [a?.availableQty]), f = !a?.isOutOfStock && (d === void 0 || e.qty < d), u = m.useMemo(() => a ? a.isOutOfStock ? { type: "error", message: a.message || "Out of stock" } : a.exceedsAvailable ? { type: "warning", message: a.message || "Quantity exceeds available stock" } : a.isLowStock ? { type: "info", message: a.message || "Low stock" } : null : null, [a]);
  return m.useEffect(() => {
    c && e.qty !== 1 && l(!1);
  }, [c, e.qty]), r === "compact" ? /* @__PURE__ */ p("div", { className: B("flex items-start gap-3", o), children: [
    /* @__PURE__ */ s("div", { className: "h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900", children: e.imageSnapshot ? /* @__PURE__ */ s("img", { src: e.imageSnapshot, alt: e.titleSnapshot, className: "h-full w-full object-cover" }) : null }),
    /* @__PURE__ */ s("div", { className: "min-w-0 flex-1", children: /* @__PURE__ */ p("div", { className: "flex items-center gap-3", children: [
      /* @__PURE__ */ p("div", { className: "min-w-0 flex-1", children: [
        /* @__PURE__ */ s("div", { className: "truncate text-sm font-medium text-neutral-950 dark:text-neutral-50", children: e.titleSnapshot }),
        /* @__PURE__ */ s("div", { className: "mt-0.5 text-xs tabular-nums text-neutral-600 dark:text-neutral-400", children: Ge({ amount: i, currency: e.currency }) }),
        u && /* @__PURE__ */ p(
          "div",
          {
            className: B(
              "mt-1 flex items-center gap-1 text-[11px]",
              u.type === "error" && "text-red-600 dark:text-red-400",
              u.type === "warning" && "text-amber-600 dark:text-amber-400",
              u.type === "info" && "text-blue-600 dark:text-blue-400"
            ),
            children: [
              /* @__PURE__ */ s(ul, { className: "h-3 w-3 shrink-0" }),
              /* @__PURE__ */ s("span", { children: u.message })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ s("div", { className: "flex h-12 w-[140px] shrink-0 items-center justify-end", children: c ? /* @__PURE__ */ p("div", { className: "flex w-full flex-col items-center justify-center gap-2", children: [
        /* @__PURE__ */ s("div", { className: "text-center text-[11px] font-medium leading-none text-neutral-600 dark:text-neutral-400", children: "Remove item?" }),
        /* @__PURE__ */ p("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ s(
            se,
            {
              type: "button",
              variant: "outline",
              className: "h-7 w-[62px] px-0 text-[11px] leading-none",
              onClick: () => l(!1),
              children: "Cancel"
            }
          ),
          /* @__PURE__ */ s(
            se,
            {
              type: "button",
              variant: "destructive",
              className: "h-7 w-[62px] px-0 text-[11px] leading-none",
              onClick: t,
              children: "Confirm"
            }
          )
        ] })
      ] }) : /* @__PURE__ */ p("div", { className: "flex items-center justify-end gap-1.5 whitespace-nowrap", children: [
        /* @__PURE__ */ s(
          se,
          {
            type: "button",
            size: "icon",
            variant: "outline",
            className: "h-8 w-8",
            "aria-label": e.qty === 1 ? "Remove item" : "Decrease quantity",
            onClick: () => {
              if (e.qty === 1) {
                l(!0);
                return;
              }
              n(e.qty - 1);
            },
            children: e.qty === 1 ? /* @__PURE__ */ s($C, { className: "h-4 w-4" }) : "-"
          }
        ),
        /* @__PURE__ */ s(
          Ze,
          {
            inputMode: "numeric",
            pattern: "[0-9]*",
            value: String(e.qty),
            onChange: (h) => {
              const g = Math.floor(Number(h.target.value));
              if (!Number.isFinite(g)) return;
              const b = Math.max(1, d ? Math.min(d, g) : g);
              n(b);
            },
            className: "h-8 w-11 px-2 text-center",
            "aria-label": "Quantity"
          }
        ),
        /* @__PURE__ */ s(
          se,
          {
            type: "button",
            size: "icon",
            variant: "outline",
            className: "h-8 w-8",
            "aria-label": "Increase quantity",
            onClick: () => n(d ? Math.min(d, e.qty + 1) : e.qty + 1),
            disabled: !f,
            children: "+"
          }
        )
      ] }) })
    ] }) })
  ] }) : /* @__PURE__ */ p(
    "div",
    {
      className: B(
        "grid grid-cols-[64px_1fr] items-start gap-x-4 gap-y-3 sm:grid-cols-[64px_1fr_176px_120px]",
        o
      ),
      children: [
        /* @__PURE__ */ s("div", { className: "h-16 w-16 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900", children: e.imageSnapshot ? /* @__PURE__ */ s("img", { src: e.imageSnapshot, alt: e.titleSnapshot, className: "h-full w-full object-cover" }) : null }),
        /* @__PURE__ */ p("div", { className: "col-start-2 row-start-1 min-w-0", children: [
          /* @__PURE__ */ p("div", { className: "flex items-start justify-between gap-3", children: [
            /* @__PURE__ */ s("div", { className: "truncate text-sm font-medium text-neutral-950 dark:text-neutral-50", children: e.titleSnapshot }),
            /* @__PURE__ */ s("div", { className: "text-sm font-semibold text-neutral-950 dark:text-neutral-50 sm:hidden", children: Ge({ amount: i, currency: e.currency }) })
          ] }),
          /* @__PURE__ */ p("div", { className: "mt-1 text-xs text-neutral-600 dark:text-neutral-400", children: [
            Ge({ amount: e.unitPrice, currency: e.currency }),
            " each"
          ] }),
          u && /* @__PURE__ */ p(
            "div",
            {
              className: B(
                "mt-1.5 flex items-center gap-1 text-xs",
                u.type === "error" && "text-red-600 dark:text-red-400",
                u.type === "warning" && "text-amber-600 dark:text-amber-400",
                u.type === "info" && "text-blue-600 dark:text-blue-400"
              ),
              children: [
                /* @__PURE__ */ s(ul, { className: "h-3.5 w-3.5 shrink-0" }),
                /* @__PURE__ */ s("span", { children: u.message })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ p("div", { className: "col-span-2 col-start-1 row-start-2 flex items-center justify-between gap-3 sm:col-span-1 sm:col-start-3 sm:row-start-1 sm:justify-center", children: [
          /* @__PURE__ */ p("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ s(
              se,
              {
                type: "button",
                size: "icon",
                variant: "outline",
                className: "h-9 w-9",
                "aria-label": "Decrease quantity",
                onClick: () => n(Math.max(1, e.qty - 1)),
                children: "-"
              }
            ),
            /* @__PURE__ */ s(
              Ze,
              {
                inputMode: "numeric",
                pattern: "[0-9]*",
                value: String(e.qty),
                onChange: (h) => {
                  const g = Math.floor(Number(h.target.value));
                  if (!Number.isFinite(g)) return;
                  const b = Math.max(1, d ? Math.min(d, g) : g);
                  n(b);
                },
                className: "h-9 w-14 text-center",
                "aria-label": "Quantity"
              }
            ),
            /* @__PURE__ */ s(
              se,
              {
                type: "button",
                size: "icon",
                variant: "outline",
                className: "h-9 w-9",
                "aria-label": "Increase quantity",
                onClick: () => n(d ? Math.min(d, e.qty + 1) : e.qty + 1),
                disabled: !f,
                children: "+"
              }
            )
          ] }),
          /* @__PURE__ */ s(
            se,
            {
              type: "button",
              variant: "ghost",
              className: "h-9 px-2 text-xs text-red-600 dark:text-red-400 sm:hidden",
              onClick: t,
              children: "Remove"
            }
          )
        ] }),
        /* @__PURE__ */ p("div", { className: "hidden sm:col-start-4 sm:row-start-1 sm:flex sm:flex-col sm:items-center sm:text-center", children: [
          /* @__PURE__ */ s("div", { className: "text-sm font-semibold tabular-nums text-neutral-950 dark:text-neutral-50", children: Ge({ amount: i, currency: e.currency }) }),
          /* @__PURE__ */ s(
            se,
            {
              type: "button",
              variant: "ghost",
              className: "mt-1 h-8 px-2 text-xs text-red-600 dark:text-red-400",
              onClick: t,
              children: "Remove"
            }
          )
        ] })
      ]
    }
  );
}
function Ai({
  currency: e,
  subtotal: t,
  itemCount: n,
  onCheckout: r,
  isCheckoutDisabled: o,
  checkoutDisabledReason: a,
  onRemoveUnavailable: i,
  className: c
}) {
  return /* @__PURE__ */ p("div", { className: B("space-y-4", c), children: [
    /* @__PURE__ */ s(St, {}),
    /* @__PURE__ */ p("div", { className: "flex items-center justify-between text-sm", children: [
      /* @__PURE__ */ p("div", { className: "flex items-center gap-2 text-neutral-600 dark:text-neutral-400", children: [
        /* @__PURE__ */ s("span", { children: "Subtotal" }),
        typeof n == "number" ? /* @__PURE__ */ p(Ct, { children: [
          /* @__PURE__ */ s("span", { className: "text-neutral-300 dark:text-neutral-700", children: "·" }),
          /* @__PURE__ */ p("span", { className: "tabular-nums", children: [
            n,
            " item",
            n === 1 ? "" : "s"
          ] })
        ] }) : null
      ] }),
      /* @__PURE__ */ s("span", { className: "font-semibold text-neutral-950 dark:text-neutral-50", children: Ge({ amount: t, currency: e }) })
    ] }),
    /* @__PURE__ */ s(se, { type: "button", onClick: r, disabled: o, className: "w-full", children: "Checkout" }),
    o && a && /* @__PURE__ */ p("div", { className: "space-y-2", children: [
      /* @__PURE__ */ s("p", { className: "text-center text-xs text-amber-600 dark:text-amber-400", children: a }),
      i && /* @__PURE__ */ s(
        "button",
        {
          type: "button",
          onClick: i,
          className: "mx-auto block text-xs text-neutral-500 underline underline-offset-2 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300",
          children: "Remove unavailable items"
        }
      )
    ] })
  ] });
}
function ip({
  onCheckout: e,
  className: t
}) {
  const { config: n } = Le(), r = zt(), { getItemInventory: o, hasIssues: a } = Ba({
    items: r.items,
    refreshInterval: 3e4,
    skip: r.items.length === 0
  }), i = () => {
    for (const c of r.items) {
      const l = o(c.productId, c.variantId);
      (l?.isOutOfStock || l?.exceedsAvailable) && r.removeItem(c.productId, c.variantId);
    }
  };
  return r.items.length === 0 ? /* @__PURE__ */ s(
    or,
    {
      title: "Cart is empty",
      description: "Add items from the catalog to check out.",
      className: t
    }
  ) : /* @__PURE__ */ p(
    "div",
    {
      className: B(
        "flex h-full flex-col rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950",
        t
      ),
      children: [
        /* @__PURE__ */ s("div", { className: "-mr-4 min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-4", children: /* @__PURE__ */ s("div", { className: "divide-y divide-neutral-200 dark:divide-neutral-800", children: r.items.map((c) => /* @__PURE__ */ s("div", { className: "py-3", children: /* @__PURE__ */ s(
          Ei,
          {
            variant: "compact",
            item: c,
            onRemove: () => r.removeItem(c.productId, c.variantId),
            onSetQty: (l) => r.setQty(c.productId, c.variantId, l),
            inventory: o(c.productId, c.variantId)
          }
        ) }, `${c.productId}::${c.variantId ?? ""}`)) }) }),
        /* @__PURE__ */ s("div", { className: "mt-4 space-y-4", children: /* @__PURE__ */ s(
          Ai,
          {
            currency: n.currency,
            subtotal: r.subtotal,
            itemCount: r.count,
            onCheckout: e,
            isCheckoutDisabled: r.items.length === 0 || a,
            checkoutDisabledReason: a ? "Some items have inventory issues" : void 0,
            onRemoveUnavailable: a ? i : void 0
          }
        ) })
      ]
    }
  );
}
const cp = m.forwardRef(
  ({ className: e, ...t }, n) => /* @__PURE__ */ s(
    "textarea",
    {
      ref: n,
      className: B(
        "flex min-h-10 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm transition-colors placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50 dark:placeholder:text-neutral-400 dark:focus-visible:ring-neutral-50/20",
        e
      ),
      ...t
    }
  )
);
cp.displayName = "Textarea";
function zC() {
  const [e, t] = m.useState(!1);
  return m.useEffect(() => {
    const n = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!n) return;
    const r = () => t(n.matches);
    return r(), n.addEventListener?.("change", r), () => n.removeEventListener?.("change", r);
  }, []), e;
}
function fl({
  children: e,
  className: t
}) {
  const n = m.useRef(null), r = zC();
  return m.useEffect(() => {
    const o = n.current;
    !o || r || o.animate(
      [
        { opacity: 0, transform: "translateY(6px)" },
        { opacity: 1, transform: "translateY(0px)" }
      ],
      { duration: 180, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)", fill: "both" }
    );
  }, [r]), /* @__PURE__ */ s("div", { ref: n, className: t, children: e });
}
function Qs() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
function lp({ className: e }) {
  m.useEffect(() => {
    console.warn(
      "[ShopChatPanel] This component is experimental and has no backend configured. Messages are handled locally and will not be sent to any server."
    );
  }, []);
  const [t, n] = m.useState(""), [r, o] = m.useState(!1), [a, i] = m.useState(() => [
    {
      id: Qs(),
      role: "agent",
      text: "Hi! How can we help today? We can recommend products or answer support questions.",
      createdAt: Date.now()
    }
  ]), [c, l] = m.useState("…");
  m.useEffect(() => {
    if (!r) return;
    const g = [".", "..", "..."];
    let b = 0;
    const v = window.setInterval(() => {
      b = (b + 1) % g.length, l(g[b]);
    }, 450);
    return () => window.clearInterval(v);
  }, [r]);
  const d = m.useRef(null), f = m.useRef(null);
  m.useEffect(() => {
    const g = d.current;
    g && (g.scrollTop = g.scrollHeight);
  }, [a.length]);
  const u = m.useCallback(() => {
    const g = f.current;
    if (!g) return;
    const b = 120;
    g.style.height = "0px";
    const v = Math.min(b, Math.max(40, g.scrollHeight));
    g.style.height = `${v}px`, g.style.overflowY = g.scrollHeight > b ? "auto" : "hidden";
  }, []);
  m.useEffect(() => {
    u();
  }, [t, u]);
  const h = m.useCallback(() => {
    const g = t.trim();
    g && (i((b) => [
      ...b,
      {
        id: Qs(),
        role: "user",
        text: g,
        createdAt: Date.now()
      }
    ]), n(""), o(!0), window.setTimeout(() => {
      i((b) => [
        ...b,
        {
          id: Qs(),
          role: "agent",
          text: "Got it. Want recommendations, sizing help, or help with an order?",
          createdAt: Date.now()
        }
      ]), o(!1);
    }, 450));
  }, [t]);
  return /* @__PURE__ */ p("div", { className: B("flex h-full min-h-0 flex-col", e), children: [
    /* @__PURE__ */ p(
      "div",
      {
        ref: d,
        className: "min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950",
        children: [
          a.map((g) => /* @__PURE__ */ s(
            fl,
            {
              className: B(
                "flex",
                g.role === "user" ? "justify-end" : "justify-start"
              ),
              children: /* @__PURE__ */ s(
                "div",
                {
                  className: B(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-5",
                    g.role === "user" ? "bg-neutral-900 text-neutral-50 dark:bg-neutral-50 dark:text-neutral-900" : "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-50"
                  ),
                  children: /* @__PURE__ */ s("span", { className: "whitespace-pre-wrap break-words", children: g.text })
                }
              )
            },
            g.id
          )),
          r ? /* @__PURE__ */ s(fl, { className: "flex justify-start", children: /* @__PURE__ */ s("div", { className: "max-w-[85%] rounded-2xl bg-neutral-100 px-3 py-2 text-sm leading-5 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-50", children: c }) }) : null
        ]
      }
    ),
    /* @__PURE__ */ p("div", { className: "mt-3 flex shrink-0 items-end gap-2", children: [
      /* @__PURE__ */ s(
        cp,
        {
          ref: f,
          rows: 1,
          value: t,
          onChange: (g) => n(g.target.value),
          placeholder: "Type a message…",
          className: "max-h-[120px] resize-none",
          onKeyDown: (g) => {
            g.key === "Enter" && (g.shiftKey || (g.preventDefault(), h()));
          }
        }
      ),
      /* @__PURE__ */ s(se, { type: "button", onClick: h, disabled: !t.trim(), className: "h-10 shrink-0", children: "Send" })
    ] })
  ] });
}
function jr({
  trigger: e,
  side: t = "right",
  open: n,
  onOpenChange: r,
  onCheckout: o,
  preferredTab: a,
  className: i
}) {
  const [c, l] = m.useState(a ?? "cart");
  return m.useEffect(() => {
    n && l(a ?? "cart");
  }, [n, a]), /* @__PURE__ */ p(us, { modal: !1, open: n, onOpenChange: r, children: [
    e ? /* @__PURE__ */ s(fs, { asChild: !0, children: e }) : null,
    /* @__PURE__ */ p(
      Zr,
      {
        side: t,
        overlayClassName: t === "popup" ? "pointer-events-none bg-transparent backdrop-blur-none" : "pointer-events-none bg-neutral-950/40 backdrop-blur-none",
        className: B(
          t === "bottom" ? "h-[85vh] rounded-t-2xl" : void 0,
          t === "popup" ? "shadow-xl" : "w-full sm:max-w-md",
          t === "popup" ? "h-[min(640px,calc(100vh-2rem))]" : void 0,
          t === "popup" ? void 0 : "p-4",
          "flex flex-col overflow-hidden",
          i
        ),
        children: [
          /* @__PURE__ */ s(ps, { className: "space-y-0", children: /* @__PURE__ */ p("div", { className: "flex items-center justify-between gap-3", children: [
            /* @__PURE__ */ s(bi, { value: c, onValueChange: (d) => l(d), children: /* @__PURE__ */ p(bs, { className: "h-9", children: [
              /* @__PURE__ */ s(Fr, { value: "cart", className: "text-sm", children: "Cart" }),
              /* @__PURE__ */ s(Fr, { value: "chat", className: "text-sm", children: "Chat" })
            ] }) }),
            /* @__PURE__ */ s(uf, { asChild: !0, children: /* @__PURE__ */ s(
              se,
              {
                type: "button",
                size: "icon",
                variant: "ghost",
                className: "h-9 w-9 rounded-full text-lg leading-none",
                "aria-label": "Close cart",
                children: "X"
              }
            ) })
          ] }) }),
          /* @__PURE__ */ s("div", { className: "mt-3 min-h-0 flex-1 overflow-hidden", children: c === "chat" ? /* @__PURE__ */ p("div", { className: "flex h-full flex-col", children: [
            /* @__PURE__ */ s("div", { className: "text-sm text-neutral-600 dark:text-neutral-400", children: "Get help finding a product or ask us any questions. We’re both your shopping assistant and support chat." }),
            /* @__PURE__ */ s("div", { className: "mt-3 min-h-0 flex-1", children: /* @__PURE__ */ s(lp, { className: "h-full" }) })
          ] }) : /* @__PURE__ */ s(
            ip,
            {
              onCheckout: () => {
                o(), r?.(!1);
              },
              className: "h-full border-0 bg-transparent p-0 shadow-none"
            }
          ) })
        ]
      }
    )
  ] });
}
function Pi({
  value: e,
  onApply: t,
  className: n
}) {
  const [r, o] = m.useState(e ?? "");
  return m.useEffect(() => {
    o(e ?? "");
  }, [e]), /* @__PURE__ */ p("div", { className: B("space-y-2", n), children: [
    /* @__PURE__ */ s("div", { className: "text-sm font-medium text-neutral-950 dark:text-neutral-50", children: "Promo code" }),
    /* @__PURE__ */ p("div", { className: "flex gap-2", children: [
      /* @__PURE__ */ s(
        Ze,
        {
          value: r,
          onChange: (a) => o(a.target.value),
          placeholder: "SAVE10",
          "aria-label": "Promo code"
        }
      ),
      /* @__PURE__ */ s(se, { type: "button", variant: "outline", onClick: () => t(r.trim() || void 0), children: "Apply" })
    ] })
  ] });
}
function dp({
  onCheckout: e,
  showPromoCode: t,
  className: n
}) {
  const { config: r } = Le(), o = zt(), { getItemInventory: a, hasIssues: i } = Ba({
    items: o.items,
    refreshInterval: 3e4,
    skip: o.items.length === 0
  }), c = () => {
    for (const l of o.items) {
      const d = a(l.productId, l.variantId);
      (d?.isOutOfStock || d?.exceedsAvailable) && o.removeItem(l.productId, l.variantId);
    }
  };
  return o.items.length === 0 ? /* @__PURE__ */ s(
    or,
    {
      title: "Your cart is empty",
      description: "Add a few products and come back here when you're ready to check out.",
      className: n
    }
  ) : /* @__PURE__ */ p("div", { className: B("grid items-start gap-6 lg:grid-cols-[1fr_360px]", n), children: [
    /* @__PURE__ */ p("div", { className: "self-start rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950", children: [
      /* @__PURE__ */ p("div", { className: "hidden grid-cols-[64px_1fr_176px_120px] gap-x-4 px-5 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 sm:grid", children: [
        /* @__PURE__ */ s("div", {}),
        /* @__PURE__ */ s("div", { children: "Item" }),
        /* @__PURE__ */ s("div", { className: "text-center", children: "Qty" }),
        /* @__PURE__ */ s("div", { className: "text-center", children: "Total" })
      ] }),
      /* @__PURE__ */ s("div", { className: "divide-y divide-neutral-200 dark:divide-neutral-800", children: o.items.map((l) => /* @__PURE__ */ s("div", { className: "px-4 py-4 sm:px-5", children: /* @__PURE__ */ s(
        Ei,
        {
          item: l,
          onRemove: () => o.removeItem(l.productId, l.variantId),
          onSetQty: (d) => o.setQty(l.productId, l.variantId, d),
          inventory: a(l.productId, l.variantId)
        }
      ) }, `${l.productId}::${l.variantId ?? ""}`)) })
    ] }),
    /* @__PURE__ */ s("div", { className: "lg:sticky lg:top-24 self-start", children: /* @__PURE__ */ p("div", { className: "rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950", children: [
      /* @__PURE__ */ s("div", { className: "text-sm font-semibold text-neutral-950 dark:text-neutral-50", children: "Summary" }),
      /* @__PURE__ */ s(St, { className: "my-4" }),
      /* @__PURE__ */ p("div", { className: "space-y-4", children: [
        t ? /* @__PURE__ */ s(Pi, { value: o.promoCode, onApply: o.setPromoCode }) : null,
        /* @__PURE__ */ s(
          Ai,
          {
            currency: r.currency,
            subtotal: o.subtotal,
            onCheckout: e,
            isCheckoutDisabled: o.items.length === 0 || i,
            checkoutDisabledReason: i ? "Some items have inventory issues" : void 0,
            onRemoveUnavailable: i ? c : void 0
          }
        )
      ] })
    ] }) })
  ] });
}
function up({
  left: e,
  right: t,
  className: n
}) {
  return /* @__PURE__ */ p("div", { className: B("grid items-start gap-8 lg:grid-cols-[1fr_420px]", n), children: [
    /* @__PURE__ */ s("div", { children: e }),
    /* @__PURE__ */ s("div", { children: t })
  ] });
}
function Sa({
  title: e,
  value: t,
  onChange: n,
  errors: r,
  className: o
}) {
  return /* @__PURE__ */ p(
    "section",
    {
      className: B(
        "space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950",
        o
      ),
      children: [
        /* @__PURE__ */ s("div", { className: "text-sm font-semibold text-neutral-950 dark:text-neutral-50", children: e }),
        /* @__PURE__ */ p("div", { className: "grid gap-3", children: [
          /* @__PURE__ */ p("div", { className: "grid gap-2", children: [
            /* @__PURE__ */ s(lt, { htmlFor: `${e}-line1`, children: "Address line 1" }),
            /* @__PURE__ */ s(
              Ze,
              {
                id: `${e}-line1`,
                value: t.line1,
                onChange: (a) => n({ ...t, line1: a.target.value }),
                "aria-invalid": !!r?.line1
              }
            ),
            r?.line1 ? /* @__PURE__ */ s("div", { className: "text-xs text-red-600", children: r.line1 }) : null
          ] }),
          /* @__PURE__ */ p("div", { className: "grid gap-2", children: [
            /* @__PURE__ */ s(lt, { htmlFor: `${e}-line2`, children: "Address line 2" }),
            /* @__PURE__ */ s(
              Ze,
              {
                id: `${e}-line2`,
                value: t.line2 ?? "",
                onChange: (a) => n({ ...t, line2: a.target.value })
              }
            )
          ] }),
          /* @__PURE__ */ p("div", { className: "grid gap-3 sm:grid-cols-2", children: [
            /* @__PURE__ */ p("div", { className: "grid gap-2", children: [
              /* @__PURE__ */ s(lt, { htmlFor: `${e}-city`, children: "City" }),
              /* @__PURE__ */ s(
                Ze,
                {
                  id: `${e}-city`,
                  value: t.city,
                  onChange: (a) => n({ ...t, city: a.target.value }),
                  "aria-invalid": !!r?.city
                }
              ),
              r?.city ? /* @__PURE__ */ s("div", { className: "text-xs text-red-600", children: r.city }) : null
            ] }),
            /* @__PURE__ */ p("div", { className: "grid gap-2", children: [
              /* @__PURE__ */ s(lt, { htmlFor: `${e}-state`, children: "State" }),
              /* @__PURE__ */ s(
                Ze,
                {
                  id: `${e}-state`,
                  value: t.state ?? "",
                  onChange: (a) => n({ ...t, state: a.target.value })
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ p("div", { className: "grid gap-3 sm:grid-cols-2", children: [
            /* @__PURE__ */ p("div", { className: "grid gap-2", children: [
              /* @__PURE__ */ s(lt, { htmlFor: `${e}-postal`, children: "Postal code" }),
              /* @__PURE__ */ s(
                Ze,
                {
                  id: `${e}-postal`,
                  value: t.postalCode,
                  onChange: (a) => n({ ...t, postalCode: a.target.value }),
                  "aria-invalid": !!r?.postalCode
                }
              ),
              r?.postalCode ? /* @__PURE__ */ s("div", { className: "text-xs text-red-600", children: r.postalCode }) : null
            ] }),
            /* @__PURE__ */ p("div", { className: "grid gap-2", children: [
              /* @__PURE__ */ s(lt, { htmlFor: `${e}-country`, children: "Country" }),
              /* @__PURE__ */ s(
                Ze,
                {
                  id: `${e}-country`,
                  value: t.country,
                  onChange: (a) => n({ ...t, country: a.target.value }),
                  "aria-invalid": !!r?.country
                }
              ),
              r?.country ? /* @__PURE__ */ s("div", { className: "text-xs text-red-600", children: r.country }) : null
            ] })
          ] })
        ] })
      ]
    }
  );
}
function fp({
  methods: e,
  value: t,
  onChange: n,
  currency: r,
  className: o
}) {
  return e.length === 0 ? null : /* @__PURE__ */ p(
    "section",
    {
      className: B(
        "space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950",
        o
      ),
      children: [
        /* @__PURE__ */ s("div", { className: "text-sm font-semibold text-neutral-950 dark:text-neutral-50", children: "Shipping method" }),
        /* @__PURE__ */ s("div", { className: "space-y-2", children: e.map((a) => {
          const i = a.id === t;
          return /* @__PURE__ */ p(
            se,
            {
              type: "button",
              variant: i ? "default" : "outline",
              className: "h-auto w-full justify-between px-4 py-3",
              onClick: () => n(a.id),
              "aria-pressed": i,
              children: [
                /* @__PURE__ */ p("div", { className: "text-left", children: [
                  /* @__PURE__ */ s("div", { className: "text-sm font-medium", children: a.label }),
                  a.detail ? /* @__PURE__ */ s("div", { className: "text-xs opacity-80", children: a.detail }) : null
                ] }),
                /* @__PURE__ */ s("div", { className: "text-sm font-semibold", children: Ge({ amount: a.price, currency: a.currency || r }) })
              ]
            },
            a.id
          );
        }) })
      ]
    }
  );
}
function Ks({ message: e }) {
  return e ? /* @__PURE__ */ s("div", { className: "text-xs text-red-600", children: e }) : null;
}
function pp({ className: e }) {
  const { config: t } = Le(), n = qo(), r = zt(), o = t.checkout.mode, a = m.useMemo(
    () => ho(r.items, {
      requireEmail: t.checkout.requireEmail ?? !0,
      defaultMode: o,
      allowShipping: t.checkout.allowShipping ?? !1
    }),
    [r.items, t.checkout.allowShipping, t.checkout.requireEmail, o]
  ), i = (t.checkout.allowShipping ?? !1) && a.shippingAddress && (o === "shipping" || o === "full"), c = a.email !== "none" || a.name !== "none" || a.phone !== "none", l = {
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "US"
  }, d = n.values.shippingAddress ?? l, f = n.values.billingAddress ?? l, u = ld({
    enabled: !!t.adapter.getShippingMethods && i,
    customer: {
      email: n.values.email || void 0,
      name: n.values.name || void 0,
      shippingAddress: d
    }
  });
  return /* @__PURE__ */ p("form", { className: B("space-y-6", e), onSubmit: (h) => h.preventDefault(), children: [
    a.isDigitalOnly ? /* @__PURE__ */ s(Lt, { className: "rounded-2xl", children: /* @__PURE__ */ p(Qt, { className: "p-5", children: [
      /* @__PURE__ */ s("div", { className: "text-sm font-semibold text-neutral-950 dark:text-neutral-50", children: "Digital delivery" }),
      /* @__PURE__ */ s("div", { className: "mt-1 text-sm text-neutral-600 dark:text-neutral-400", children: a.fulfillmentNotes || "This is a digital product and will be available from your account after purchase." })
    ] }) }) : null,
    a.hasPhysical && !(t.checkout.allowShipping ?? !1) ? /* @__PURE__ */ s(Lt, { className: "rounded-2xl border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/30", children: /* @__PURE__ */ p(Qt, { className: "p-5", children: [
      /* @__PURE__ */ s("div", { className: "text-sm font-semibold text-red-900 dark:text-red-200", children: "Shipping required" }),
      /* @__PURE__ */ s("div", { className: "mt-1 text-sm text-red-800/90 dark:text-red-200/80", children: "Your cart contains shippable items, but shipping is disabled for this checkout." })
    ] }) }) : null,
    c ? /* @__PURE__ */ p("section", { className: "space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950", children: [
      /* @__PURE__ */ p("div", { className: "flex items-baseline justify-between gap-3", children: [
        /* @__PURE__ */ s("div", { className: "text-sm font-semibold text-neutral-950 dark:text-neutral-50", children: "Contact" }),
        /* @__PURE__ */ s("div", { className: "text-xs text-neutral-500 dark:text-neutral-400", children: a.email === "required" || a.name === "required" || a.phone === "required" ? "Required" : "Optional" })
      ] }),
      /* @__PURE__ */ p("div", { className: "grid gap-3", children: [
        a.email !== "none" ? /* @__PURE__ */ p("div", { className: "grid gap-2", children: [
          /* @__PURE__ */ s(lt, { htmlFor: "checkout-email", children: "Email" }),
          /* @__PURE__ */ s(
            Ze,
            {
              id: "checkout-email",
              value: n.values.email ?? "",
              onChange: (h) => n.setField("email", h.target.value),
              placeholder: "you@company.com",
              "aria-invalid": !!n.fieldErrors.email,
              required: a.email === "required"
            }
          ),
          /* @__PURE__ */ s(Ks, { message: n.fieldErrors.email })
        ] }) : null,
        a.name !== "none" ? /* @__PURE__ */ p("div", { className: "grid gap-2", children: [
          /* @__PURE__ */ s(lt, { htmlFor: "checkout-name", children: "Name" }),
          /* @__PURE__ */ s(
            Ze,
            {
              id: "checkout-name",
              value: n.values.name ?? "",
              onChange: (h) => n.setField("name", h.target.value),
              placeholder: "Full name",
              "aria-invalid": !!n.fieldErrors.name,
              required: a.name === "required"
            }
          ),
          /* @__PURE__ */ s(Ks, { message: n.fieldErrors.name })
        ] }) : null,
        a.phone !== "none" ? /* @__PURE__ */ p("div", { className: "grid gap-2", children: [
          /* @__PURE__ */ s(lt, { htmlFor: "checkout-phone", children: "Phone" }),
          /* @__PURE__ */ s(
            Ze,
            {
              id: "checkout-phone",
              value: n.values.phone ?? "",
              onChange: (h) => n.setField("phone", h.target.value),
              placeholder: "Phone number",
              "aria-invalid": !!n.fieldErrors.phone,
              required: a.phone === "required"
            }
          ),
          /* @__PURE__ */ s(Ks, { message: n.fieldErrors.phone })
        ] }) : null
      ] })
    ] }) : null,
    i ? /* @__PURE__ */ s(
      Sa,
      {
        title: "Shipping address",
        value: d,
        onChange: (h) => n.setField("shippingAddress", h),
        errors: {
          line1: n.fieldErrors["shippingAddress.line1"],
          city: n.fieldErrors["shippingAddress.city"],
          postalCode: n.fieldErrors["shippingAddress.postalCode"],
          country: n.fieldErrors["shippingAddress.country"]
        }
      }
    ) : null,
    i && u.methods.length ? /* @__PURE__ */ s(
      fp,
      {
        methods: u.methods,
        value: n.values.shippingMethodId,
        onChange: (h) => n.setField("shippingMethodId", h),
        currency: t.currency
      }
    ) : null,
    o === "full" ? /* @__PURE__ */ s(
      Sa,
      {
        title: "Billing address",
        value: f,
        onChange: (h) => n.setField("billingAddress", h)
      }
    ) : null,
    t.checkout.allowTipping ? /* @__PURE__ */ p("section", { className: "space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950", children: [
      /* @__PURE__ */ s("div", { className: "text-sm font-semibold text-neutral-950 dark:text-neutral-50", children: "Tip" }),
      /* @__PURE__ */ p("div", { className: "grid gap-2", children: [
        /* @__PURE__ */ p(lt, { htmlFor: "checkout-tip", children: [
          "Tip amount (",
          t.currency,
          ")"
        ] }),
        /* @__PURE__ */ s(
          Ze,
          {
            id: "checkout-tip",
            inputMode: "decimal",
            value: String(n.values.tipAmount ?? 0),
            onChange: (h) => n.setField("tipAmount", Number(h.target.value) || 0)
          }
        )
      ] })
    ] }) : null,
    o === "full" ? /* @__PURE__ */ p("section", { className: "space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950", children: [
      /* @__PURE__ */ s("div", { className: "text-sm font-semibold text-neutral-950 dark:text-neutral-50", children: "Notes" }),
      /* @__PURE__ */ p("div", { className: "grid gap-2", children: [
        /* @__PURE__ */ s(lt, { htmlFor: "checkout-notes", children: "Order notes (optional)" }),
        /* @__PURE__ */ s(
          Ze,
          {
            id: "checkout-notes",
            value: n.values.notes ?? "",
            onChange: (h) => n.setField("notes", h.target.value),
            placeholder: "Delivery instructions, gift note…"
          }
        )
      ] })
    ] }) : null
  ] });
}
function FC(e) {
  return /* @__PURE__ */ p("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", ...e, children: [
    /* @__PURE__ */ s("circle", { cx: "12", cy: "12", r: "10" }),
    /* @__PURE__ */ s("line", { x1: "12", y1: "8", x2: "12", y2: "12" }),
    /* @__PURE__ */ s("line", { x1: "12", y1: "16", x2: "12.01", y2: "16" })
  ] });
}
function jC(e) {
  return /* @__PURE__ */ p("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", ...e, children: [
    /* @__PURE__ */ s("path", { d: "M3 6h18" }),
    /* @__PURE__ */ s("path", { d: "M8 6V4h8v2" }),
    /* @__PURE__ */ s("path", { d: "M6 6l1 16h10l1-16" })
  ] });
}
function mp({
  open: e,
  onOpenChange: t,
  issues: n,
  onRemoveItem: r,
  onUpdateQuantity: o,
  onGoToCart: a,
  className: i
}) {
  const c = n.some(
    (l) => l.type === "out_of_stock" || l.type === "product_unavailable"
  );
  return /* @__PURE__ */ s(ii, { open: e, onOpenChange: t, children: /* @__PURE__ */ p(ls, { className: B("sm:max-w-lg", i), children: [
    /* @__PURE__ */ p(li, { children: [
      /* @__PURE__ */ p(ds, { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ s(FC, { className: "h-5 w-5 text-amber-500" }),
        "Inventory Update"
      ] }),
      /* @__PURE__ */ s(di, { children: c ? "Some items in your cart are no longer available." : "Some items in your cart have limited availability." })
    ] }),
    /* @__PURE__ */ s("div", { className: "my-4 divide-y divide-neutral-200 dark:divide-neutral-800", children: n.map((l) => /* @__PURE__ */ s(
      BC,
      {
        issue: l,
        onRemove: () => r(l.productId, l.variantId),
        onUpdateQty: (d) => o(l.productId, l.variantId, d)
      },
      `${l.productId}::${l.variantId ?? ""}`
    )) }),
    /* @__PURE__ */ p(df, { className: "flex-col gap-2 sm:flex-row", children: [
      a ? /* @__PURE__ */ s(
        se,
        {
          type: "button",
          variant: "outline",
          onClick: () => {
            t(!1), a();
          },
          children: "Go to Cart"
        }
      ) : null,
      /* @__PURE__ */ s(
        se,
        {
          type: "button",
          onClick: () => t(!1),
          children: "Continue"
        }
      )
    ] })
  ] }) });
}
function BC({
  issue: e,
  onRemove: t,
  onUpdateQty: n
}) {
  const r = e.type === "out_of_stock" || e.type === "product_unavailable";
  return /* @__PURE__ */ p("div", { className: "flex items-start gap-3 py-3", children: [
    /* @__PURE__ */ p("div", { className: "min-w-0 flex-1", children: [
      /* @__PURE__ */ s("div", { className: "text-sm font-medium text-neutral-900 dark:text-neutral-100", children: e.title }),
      /* @__PURE__ */ s(
        "div",
        {
          className: B(
            "mt-0.5 text-sm",
            r ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"
          ),
          children: e.message
        }
      ),
      e.type === "insufficient_stock" && e.availableQty > 0 ? /* @__PURE__ */ p("div", { className: "mt-1 text-xs text-neutral-500 dark:text-neutral-400", children: [
        "You requested ",
        e.requestedQty,
        ", but only ",
        e.availableQty,
        " available"
      ] }) : null
    ] }),
    /* @__PURE__ */ p("div", { className: "flex shrink-0 items-center gap-2", children: [
      e.type === "insufficient_stock" && e.availableQty > 0 ? /* @__PURE__ */ p(
        se,
        {
          type: "button",
          size: "sm",
          variant: "outline",
          onClick: () => n(e.availableQty),
          children: [
            "Update to ",
            e.availableQty
          ]
        }
      ) : null,
      /* @__PURE__ */ p(
        se,
        {
          type: "button",
          size: "sm",
          variant: "ghost",
          className: "text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/30 dark:hover:text-red-300",
          onClick: t,
          children: [
            /* @__PURE__ */ s(jC, { className: "h-4 w-4" }),
            /* @__PURE__ */ s("span", { className: "sr-only", children: "Remove" })
          ]
        }
      )
    ] })
  ] });
}
function hp({
  className: e,
  ctaLabel: t,
  renderEmbedded: n,
  embeddedFallback: r,
  renderCustom: o,
  customFallback: a
}) {
  const { config: i } = Le(), c = zt(), l = qo(), { config: d, isLoading: f } = ud(), [u, h] = m.useState(!1);
  m.useEffect(() => {
    let D = !0;
    return import("./walletDetection-JZR3UCOa.mjs").then((j) => {
      D && h(j.detectSolanaWallets());
    }), () => {
      D = !1;
    };
  }, []);
  const g = dd({ items: c.items }), [b, v] = m.useState(!1), y = m.useMemo(
    () => i.checkout.paymentMethods && i.checkout.paymentMethods.length ? i.checkout.paymentMethods : [{ id: "card", label: "Card", ctaLabel: "Pay now" }],
    [i.checkout.paymentMethods]
  ), w = m.useMemo(() => y.filter((j) => !(j.id === "card" && !d.card || j.id === "crypto" && !d.crypto || j.id === "credits" && !d.credits || j.id === "crypto" && !u)), [u, y, d]), [k, _] = m.useState((w[0] ?? y[0])?.id ?? "card");
  m.useEffect(() => {
    w.length && (w.some((D) => D.id === k) || _(w[0].id));
  }, [k, w]), m.useEffect(() => {
    l.reset();
  }, [k]);
  const x = w.find((D) => D.id === k) ?? y.find((D) => D.id === k) ?? y[0] ?? { ctaLabel: "Pay now" }, S = x.description ?? (k === "crypto" ? "Pay using a connected wallet." : void 0), I = k === "crypto" && !u, R = f || l.status === "validating" || l.status === "creating_session" || l.status === "redirecting" || g.isVerifying, E = t ?? x.ctaLabel ?? (i.checkout.mode === "none" ? "Continue to payment" : "Pay now"), P = m.useCallback(
    async (D) => {
      const j = await g.verify();
      if (!j.ok && j.issues.length > 0) {
        v(!0);
        return;
      }
      l.createCheckoutSession({ paymentMethodId: D });
    },
    [l, g]
  ), O = l.session?.kind === "embedded" ? l.session : null, T = l.session?.kind === "custom" ? l.session : null;
  return /* @__PURE__ */ p("div", { className: B("space-y-3", e), children: [
    w.length > 1 ? /* @__PURE__ */ p("div", { className: "space-y-2", children: [
      /* @__PURE__ */ s("div", { className: "text-xs font-medium text-neutral-600 dark:text-neutral-400", children: "Payment method" }),
      /* @__PURE__ */ s(bi, { value: k, onValueChange: _, children: /* @__PURE__ */ s(bs, { className: "w-full", children: w.map((D) => /* @__PURE__ */ s(Fr, { value: D.id, className: "flex-1", disabled: R, children: D.label }, D.id)) }) })
    ] }) : null,
    l.error ? /* @__PURE__ */ s("div", { className: "rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200", children: l.error }) : null,
    T ? /* @__PURE__ */ s("div", { className: "space-y-3", children: o ? o(T) : a ?? /* @__PURE__ */ s("div", { className: "rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900/40 dark:text-neutral-300", children: "Checkout session created. Provide `renderCustom` to render a custom payment UI." }) }) : O ? /* @__PURE__ */ s("div", { className: "space-y-3", children: n ? n(O) : r ?? /* @__PURE__ */ s("div", { className: "rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900/40 dark:text-neutral-300", children: "Embedded checkout session created. Provide `renderEmbedded` to render your payment UI." }) }) : /* @__PURE__ */ s(
      se,
      {
        type: "button",
        className: "w-full",
        disabled: c.items.length === 0 || R || I,
        onClick: () => {
          P(k);
        },
        children: g.isVerifying ? "Checking availability…" : R ? "Processing…" : E
      }
    ),
    !O && !T ? /* @__PURE__ */ s("p", { className: "text-xs text-neutral-500 dark:text-neutral-400", children: I ? "Install a browser wallet to enable crypto payments." : S ?? "You will be redirected to complete your payment." }) : null,
    /* @__PURE__ */ s(
      mp,
      {
        open: b,
        onOpenChange: (D) => {
          v(D), D || g.reset();
        },
        issues: g.result?.issues ?? [],
        onRemoveItem: (D, j) => {
          c.removeItem(D, j);
        },
        onUpdateQuantity: (D, j, z) => {
          c.setQty(D, j, z);
        }
      }
    )
  ] });
}
function gp({ className: e }) {
  const { config: t } = Le(), n = zt(), r = qo(), { settings: o } = cr(), a = (t.checkout.allowPromoCodes ?? !1) && o.checkout.promoCodes;
  return /* @__PURE__ */ p(
    "div",
    {
      className: B(
        "rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950",
        e
      ),
      children: [
        /* @__PURE__ */ s("div", { className: "text-sm font-semibold text-neutral-950 dark:text-neutral-50", children: "Order review" }),
        /* @__PURE__ */ s(St, { className: "my-3" }),
        /* @__PURE__ */ s("div", { className: "space-y-3", children: n.items.map((i) => /* @__PURE__ */ p("div", { className: "flex items-center justify-between gap-3", children: [
          /* @__PURE__ */ p("div", { className: "flex min-w-0 items-center gap-3", children: [
            /* @__PURE__ */ s("div", { className: "h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900", children: i.imageSnapshot ? /* @__PURE__ */ s("img", { src: i.imageSnapshot, alt: i.titleSnapshot, className: "h-full w-full object-cover" }) : null }),
            /* @__PURE__ */ p("div", { className: "min-w-0", children: [
              /* @__PURE__ */ s("div", { className: "line-clamp-1 text-sm text-neutral-950 dark:text-neutral-50", children: i.titleSnapshot }),
              /* @__PURE__ */ p("div", { className: "text-xs text-neutral-600 dark:text-neutral-400", children: [
                "Qty ",
                i.qty
              ] })
            ] })
          ] }),
          /* @__PURE__ */ s("div", { className: "text-sm font-semibold tabular-nums text-neutral-950 dark:text-neutral-50", children: Ge({ amount: i.unitPrice * i.qty, currency: i.currency }) })
        ] }, `${i.productId}::${i.variantId ?? ""}`)) }),
        /* @__PURE__ */ s(St, { className: "my-3" }),
        a ? /* @__PURE__ */ s(
          Pi,
          {
            value: r.values.discountCode ?? n.promoCode,
            onApply: (i) => {
              r.setField("discountCode", i ?? ""), n.setPromoCode(i);
            }
          }
        ) : null,
        a ? /* @__PURE__ */ s(St, { className: "my-3" }) : null,
        /* @__PURE__ */ p("div", { className: "flex items-center justify-between text-sm", children: [
          /* @__PURE__ */ s("span", { className: "text-neutral-600 dark:text-neutral-400", children: "Subtotal" }),
          /* @__PURE__ */ s("span", { className: "font-semibold text-neutral-950 dark:text-neutral-50", children: Ge({ amount: n.subtotal, currency: t.currency }) })
        ] })
      ]
    }
  );
}
function ks({
  result: e,
  onContinueShopping: t,
  onViewOrders: n,
  className: r
}) {
  return e.kind === "idle" ? null : e.kind === "success" ? /* @__PURE__ */ p(
    "div",
    {
      className: B(
        "rounded-2xl border border-neutral-200 bg-white p-8 text-neutral-950 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50",
        r
      ),
      children: [
        /* @__PURE__ */ s("div", { className: "text-sm font-semibold text-neutral-600 dark:text-neutral-400", children: "Receipt" }),
        /* @__PURE__ */ s("h2", { className: "mt-2 text-2xl font-semibold", children: "Payment successful" }),
        /* @__PURE__ */ s("p", { className: "mt-2 text-sm text-neutral-600 dark:text-neutral-400", children: "Thanks for your purchase. You’ll receive a confirmation email shortly." }),
        e.order ? /* @__PURE__ */ p("div", { className: "mt-5 rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/40", children: [
          /* @__PURE__ */ p("div", { className: "flex items-start justify-between gap-3", children: [
            /* @__PURE__ */ p("div", { children: [
              /* @__PURE__ */ p("div", { className: "text-sm font-semibold text-neutral-950 dark:text-neutral-50", children: [
                "Order ",
                e.order.id
              ] }),
              /* @__PURE__ */ p("div", { className: "mt-1 text-xs text-neutral-600 dark:text-neutral-400", children: [
                new Date(e.order.createdAt).toLocaleString(),
                " · ",
                e.order.status
              ] })
            ] }),
            /* @__PURE__ */ s("div", { className: "text-sm font-semibold", children: Ge({ amount: e.order.total, currency: e.order.currency }) })
          ] }),
          /* @__PURE__ */ p("div", { className: "mt-3 space-y-2", children: [
            e.order.items.slice(0, 4).map((o, a) => /* @__PURE__ */ p("div", { className: "flex items-center justify-between gap-3 text-sm", children: [
              /* @__PURE__ */ s("div", { className: "min-w-0 truncate", children: o.title }),
              /* @__PURE__ */ p("div", { className: "shrink-0 text-neutral-600 dark:text-neutral-400", children: [
                "Qty ",
                o.qty
              ] })
            ] }, `${o.title}-${a}`)),
            e.order.items.length > 4 ? /* @__PURE__ */ p("div", { className: "text-xs text-neutral-600 dark:text-neutral-400", children: [
              "+",
              e.order.items.length - 4,
              " more item(s)"
            ] }) : null
          ] }),
          /* @__PURE__ */ p("div", { className: "mt-3 flex gap-3 text-sm", children: [
            e.order.receiptUrl ? /* @__PURE__ */ s("a", { href: e.order.receiptUrl, className: "hover:underline", children: "Receipt" }) : null,
            e.order.invoiceUrl ? /* @__PURE__ */ s("a", { href: e.order.invoiceUrl, className: "hover:underline", children: "Invoice" }) : null
          ] })
        ] }) : e.orderId ? /* @__PURE__ */ p("p", { className: "mt-4 text-xs text-neutral-500 dark:text-neutral-400", children: [
          "Session/Order ID: ",
          /* @__PURE__ */ s("span", { className: "font-mono", children: e.orderId })
        ] }) : null,
        /* @__PURE__ */ p("div", { className: "mt-6 flex flex-col gap-2 sm:flex-row", children: [
          t ? /* @__PURE__ */ s(se, { type: "button", onClick: t, children: "Continue shopping" }) : null,
          n ? /* @__PURE__ */ s(se, { type: "button", variant: "outline", onClick: n, children: "View orders" }) : null
        ] })
      ]
    }
  ) : e.kind === "cancel" ? /* @__PURE__ */ p(
    "div",
    {
      className: B(
        "rounded-2xl border border-neutral-200 bg-white p-8 text-neutral-950 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50",
        r
      ),
      children: [
        /* @__PURE__ */ s("h2", { className: "text-2xl font-semibold", children: "Checkout cancelled" }),
        /* @__PURE__ */ s("p", { className: "mt-2 text-sm text-neutral-600 dark:text-neutral-400", children: "No charges were made. You can continue shopping and try again." }),
        t ? /* @__PURE__ */ s("div", { className: "mt-6", children: /* @__PURE__ */ s(se, { type: "button", onClick: t, children: "Back to shop" }) }) : null
      ]
    }
  ) : /* @__PURE__ */ p(
    "div",
    {
      className: B(
        "rounded-2xl border border-neutral-200 bg-white p-8 text-neutral-950 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50",
        r
      ),
      children: [
        /* @__PURE__ */ s("h2", { className: "text-2xl font-semibold", children: "Payment failed" }),
        /* @__PURE__ */ s("p", { className: "mt-2 text-sm text-neutral-600 dark:text-neutral-400", children: e.message ?? "Something went wrong while processing your payment." }),
        t ? /* @__PURE__ */ s("div", { className: "mt-6", children: /* @__PURE__ */ s(se, { type: "button", onClick: t, children: "Back to shop" }) }) : null
      ]
    }
  );
}
function UC({
  onContinueShopping: e,
  onViewOrders: t,
  className: n,
  receiptClassName: r
}) {
  const o = za();
  return o.kind === "idle" ? /* @__PURE__ */ s(
    "div",
    {
      className: B(
        "flex min-h-[50vh] items-center justify-center p-4",
        n
      ),
      children: /* @__PURE__ */ s("div", { className: "text-center text-neutral-600 dark:text-neutral-400", children: "Loading order details..." })
    }
  ) : /* @__PURE__ */ s(
    "div",
    {
      className: B(
        "flex min-h-[50vh] items-center justify-center p-4",
        n
      ),
      children: /* @__PURE__ */ s(
        ks,
        {
          result: o,
          onContinueShopping: e,
          onViewOrders: t,
          className: B("w-full max-w-lg", r)
        }
      )
    }
  );
}
function VC({
  onContinueShopping: e,
  className: t,
  receiptClassName: n
}) {
  const r = { kind: "cancel" };
  return /* @__PURE__ */ s(
    "div",
    {
      className: B(
        "flex min-h-[50vh] items-center justify-center p-4",
        t
      ),
      children: /* @__PURE__ */ s(
        ks,
        {
          result: r,
          onContinueShopping: e,
          className: B("w-full max-w-lg", n)
        }
      )
    }
  );
}
function WC(e) {
  switch (e) {
    case "created":
      return "secondary";
    case "paid":
      return "default";
    case "processing":
      return "secondary";
    case "fulfilled":
      return "outline";
    case "shipped":
      return "default";
    case "delivered":
      return "outline";
    case "cancelled":
      return "outline";
    case "refunded":
      return "outline";
    default:
      return "secondary";
  }
}
function yp({
  order: e,
  onView: t,
  className: n
}) {
  const r = `${e.items.length} item${e.items.length === 1 ? "" : "s"}`, o = new Date(e.createdAt).toLocaleString(void 0, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }), a = e.status.charAt(0).toUpperCase() + e.status.slice(1);
  return /* @__PURE__ */ s(
    Lt,
    {
      className: B(
        "group overflow-hidden rounded-2xl border-neutral-200/70 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-neutral-800 dark:bg-neutral-950",
        n
      ),
      children: /* @__PURE__ */ s(Qt, { className: "p-5", children: /* @__PURE__ */ p("div", { className: "grid grid-cols-[1fr_auto] gap-x-4 gap-y-2", children: [
        /* @__PURE__ */ p("div", { className: "min-w-0", children: [
          /* @__PURE__ */ p("div", { className: "flex flex-wrap items-center gap-x-2 gap-y-1", children: [
            /* @__PURE__ */ s("span", { className: "text-sm font-semibold text-neutral-950 dark:text-neutral-50", children: "Order" }),
            /* @__PURE__ */ s("span", { className: "truncate font-mono text-sm font-semibold text-neutral-950/80 dark:text-neutral-50/80", children: e.id })
          ] }),
          /* @__PURE__ */ s("div", { className: "mt-0.5 text-xs text-neutral-600 dark:text-neutral-400", children: o })
        ] }),
        /* @__PURE__ */ s("div", { className: "flex items-start justify-end", children: /* @__PURE__ */ s(Tn, { variant: WC(e.status), className: "capitalize", children: a }) }),
        /* @__PURE__ */ s("div", { className: "text-sm text-neutral-600 dark:text-neutral-400", children: r }),
        /* @__PURE__ */ s("div", { className: "text-right text-sm font-semibold text-neutral-950 dark:text-neutral-50", children: Ge({ amount: e.total, currency: e.currency }) }),
        /* @__PURE__ */ p("div", { className: "col-span-2 mt-3 flex items-center justify-between gap-3 border-t border-neutral-200/70 pt-3 dark:border-neutral-800", children: [
          /* @__PURE__ */ p("div", { className: "flex items-center gap-1", children: [
            e.receiptUrl ? /* @__PURE__ */ s(se, { asChild: !0, type: "button", variant: "ghost", size: "sm", className: "h-8 px-2", children: /* @__PURE__ */ s("a", { href: e.receiptUrl, target: "_blank", rel: "noreferrer", children: "Receipt" }) }) : null,
            e.invoiceUrl ? /* @__PURE__ */ s(se, { asChild: !0, type: "button", variant: "ghost", size: "sm", className: "h-8 px-2", children: /* @__PURE__ */ s("a", { href: e.invoiceUrl, target: "_blank", rel: "noreferrer", children: "Invoice" }) }) : null
          ] }),
          t ? /* @__PURE__ */ s(
            se,
            {
              type: "button",
              variant: "outline",
              size: "sm",
              className: "h-8",
              onClick: () => t(e),
              children: "Details"
            }
          ) : null
        ] })
      ] }) })
    }
  );
}
function vp({
  orders: e,
  onView: t,
  className: n
}) {
  return /* @__PURE__ */ s("div", { className: B("grid gap-4", n), children: e.map((r) => /* @__PURE__ */ s(yp, { order: r, onView: t }, r.id)) });
}
function HC(e) {
  switch (e) {
    case "paid":
      return "default";
    case "processing":
      return "secondary";
    case "fulfilled":
      return "outline";
    case "cancelled":
      return "outline";
    case "refunded":
      return "outline";
    default:
      return "secondary";
  }
}
function bp({
  order: e,
  onBack: t,
  className: n
}) {
  const r = new Date(e.createdAt).toLocaleString(void 0, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }), o = e.status.charAt(0).toUpperCase() + e.status.slice(1);
  return /* @__PURE__ */ s(
    Lt,
    {
      className: B(
        "overflow-hidden rounded-2xl border-neutral-200/70 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950",
        n
      ),
      children: /* @__PURE__ */ p(Qt, { className: "p-6", children: [
        /* @__PURE__ */ p("div", { className: "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between", children: [
          /* @__PURE__ */ p("div", { className: "min-w-0", children: [
            /* @__PURE__ */ p("div", { className: "flex flex-wrap items-center gap-x-2 gap-y-1", children: [
              /* @__PURE__ */ s("span", { className: "text-sm font-semibold text-neutral-950 dark:text-neutral-50", children: "Order" }),
              /* @__PURE__ */ s("span", { className: "truncate font-mono text-sm font-semibold text-neutral-950/80 dark:text-neutral-50/80", children: e.id })
            ] }),
            /* @__PURE__ */ p("div", { className: "mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-600 dark:text-neutral-400", children: [
              /* @__PURE__ */ s("span", { children: r }),
              /* @__PURE__ */ s("span", { className: "text-neutral-300 dark:text-neutral-700", children: "·" }),
              /* @__PURE__ */ s("span", { children: o })
            ] })
          ] }),
          /* @__PURE__ */ p("div", { className: "flex items-center gap-2 sm:justify-end", children: [
            /* @__PURE__ */ s(Tn, { variant: HC(e.status), className: "capitalize", children: o }),
            t ? /* @__PURE__ */ s(se, { type: "button", variant: "outline", size: "sm", className: "h-8", onClick: t, children: "Back" }) : null
          ] })
        ] }),
        /* @__PURE__ */ s(St, { className: "my-5" }),
        /* @__PURE__ */ s("div", { className: "space-y-3", children: e.items.map((a, i) => /* @__PURE__ */ p("div", { className: "flex items-start justify-between gap-4", children: [
          /* @__PURE__ */ p("div", { className: "min-w-0", children: [
            /* @__PURE__ */ s("div", { className: "truncate text-sm text-neutral-950 dark:text-neutral-50", children: a.title }),
            /* @__PURE__ */ p("div", { className: "mt-0.5 text-xs text-neutral-600 dark:text-neutral-400", children: [
              "Qty ",
              a.qty
            ] })
          ] }),
          /* @__PURE__ */ s("div", { className: "text-right text-sm font-semibold text-neutral-950 dark:text-neutral-50", children: Ge({ amount: a.unitPrice * a.qty, currency: a.currency }) })
        ] }, `${a.title}-${i}`)) }),
        /* @__PURE__ */ s(St, { className: "my-5" }),
        /* @__PURE__ */ p("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ s("span", { className: "text-sm text-neutral-600 dark:text-neutral-400", children: "Total" }),
          /* @__PURE__ */ s("span", { className: "text-sm font-semibold text-neutral-950 dark:text-neutral-50", children: Ge({ amount: e.total, currency: e.currency }) })
        ] }),
        e.receiptUrl || e.invoiceUrl ? /* @__PURE__ */ p("div", { className: "mt-5 flex flex-wrap items-center gap-2", children: [
          e.receiptUrl ? /* @__PURE__ */ s(se, { asChild: !0, type: "button", variant: "ghost", size: "sm", className: "h-8 px-2", children: /* @__PURE__ */ s("a", { href: e.receiptUrl, target: "_blank", rel: "noreferrer", children: "Receipt" }) }) : null,
          e.invoiceUrl ? /* @__PURE__ */ s(se, { asChild: !0, type: "button", variant: "ghost", size: "sm", className: "h-8 px-2", children: /* @__PURE__ */ s("a", { href: e.invoiceUrl, target: "_blank", rel: "noreferrer", children: "Invoice" }) }) : null
        ] }) : null
      ] })
    }
  );
}
function Ii(e) {
  const t = {};
  e.shippingProfile && (t.shippingProfile = e.shippingProfile), e.checkoutRequirements && (t.checkoutRequirements = JSON.stringify(e.checkoutRequirements)), e.fulfillment?.type && (t.fulfillmentType = e.fulfillment.type), e.fulfillment?.notes && (t.fulfillmentNotes = e.fulfillment.notes);
  const n = e.attributes?.shippingCountries;
  return typeof n == "string" && n.trim() && (t.shippingCountries = n), Object.keys(t).length ? t : void 0;
}
function ZC(e) {
  return /* @__PURE__ */ s("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", ...e, children: /* @__PURE__ */ s("path", { d: "M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" }) });
}
const qC = {
  shop: "/shop",
  category: (e) => `/shop/${e}`,
  product: (e) => `/product/${e}`,
  cart: "/cart",
  checkout: "/checkout",
  orders: "/account/orders",
  subscribe: "/subscribe"
};
function GC(e) {
  const t = /* @__PURE__ */ new Set();
  let n = Number.POSITIVE_INFINITY, r = 0;
  for (const i of e) {
    for (const c of i.tags ?? []) t.add(c);
    n = Math.min(n, i.price), r = Math.max(r, i.price);
  }
  const o = Array.from(t).slice(0, 12), a = Number.isFinite(n) ? { min: n, max: r } : void 0;
  return { tags: o, price: a };
}
function YC({
  className: e,
  routes: t,
  initialCategorySlug: n
}) {
  const { config: r } = Le(), o = zt(), a = ws(), i = { ...qC, ...t }, [c, l] = m.useState("cart"), [d, f] = m.useState(() => typeof window > "u" ? !1 : window.matchMedia?.("(min-width: 1024px)")?.matches ?? !1);
  m.useEffect(() => {
    if (typeof window > "u") return;
    const F = window.matchMedia?.("(min-width: 1024px)");
    if (!F) return;
    const Y = () => f(F.matches);
    return Y(), F.addEventListener?.("change", Y), () => F.removeEventListener?.("change", Y);
  }, []);
  const { categories: u, isLoading: h, error: g } = Da(), b = m.useMemo(() => Fa({ includeCategory: !0 }), []), [v, y] = m.useState(b?.search ?? ""), [w, k] = m.useState(
    n ?? b?.category
  ), [_, x] = m.useState(b?.page ?? 1), [S, I] = m.useState(b?.sort ?? "featured"), [R, E] = m.useState(b?.filters ?? {}), { data: P, isLoading: O, error: T } = Go({
    category: w,
    search: v.trim() || void 0,
    filters: R,
    sort: S,
    page: _,
    pageSize: 24
  }), D = m.useMemo(() => GC(P?.items ?? []), [P?.items]), { settings: j } = cr(), z = j.catalog.filters, W = j.catalog.sort, $ = m.useMemo(() => {
    const F = [];
    return W.featured && F.push({ value: "featured", label: "Featured" }), W.priceAsc && F.push({ value: "price_asc", label: "Price: Low to High" }), W.priceDesc && F.push({ value: "price_desc", label: "Price: High to Low" }), F.length === 0 && F.push({ value: "featured", label: "Featured" }), F;
  }, [W]);
  m.useEffect(() => {
    $.some((F) => F.value === S) || I($[0].value);
  }, [$, S]), ja(
    {
      search: v,
      sort: S,
      page: _,
      category: w,
      filters: R
    },
    { includeCategory: !0 }
  );
  const [C, N] = m.useState(!1), [H, G] = m.useState(!1), [J, fe] = m.useState(null), [Z, X] = m.useState(!1), Q = (F) => {
    k(F.slug), x(1), N(!1);
  }, ge = m.useCallback(
    (F, Y, he) => {
      o.addItem(
        {
          productId: F.id,
          variantId: Y?.id,
          unitPrice: F.price,
          currency: F.currency,
          titleSnapshot: Y ? `${F.title} — ${Y.title}` : F.title,
          imageSnapshot: F.images[0]?.url,
          paymentResource: F.id,
          metadata: Ii(F)
        },
        he
      ), a?.toast({
        title: "Added to cart",
        description: F.title,
        actionLabel: "View cart",
        onAction: () => {
          typeof window < "u" && (window.matchMedia?.("(min-width: 1024px)").matches ? window.location.assign(i.cart) : (l("cart"), G(!0)));
        }
      });
    },
    [o, i.cart, a]
  );
  return /* @__PURE__ */ p("div", { className: B("min-h-screen bg-neutral-50 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50", e), children: [
    /* @__PURE__ */ s("header", { className: "sticky top-0 z-40 border-b border-neutral-200 bg-neutral-50/80 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/70", children: /* @__PURE__ */ p("div", { className: "mx-auto flex max-w-7xl items-center gap-3 px-4 py-3", children: [
      /* @__PURE__ */ s("a", { href: i.shop, className: "text-sm font-semibold tracking-tight", children: r.brand?.name ?? "Shop" }),
      /* @__PURE__ */ s("div", { className: "flex-1", children: /* @__PURE__ */ s(Ni, { value: v, onChange: y }) }),
      /* @__PURE__ */ p("div", { className: "flex items-center gap-2 lg:hidden", children: [
        /* @__PURE__ */ p(us, { open: C, onOpenChange: N, children: [
          /* @__PURE__ */ s(fs, { asChild: !0, children: /* @__PURE__ */ s(se, { type: "button", variant: "outline", children: "Filters" }) }),
          /* @__PURE__ */ p(Zr, { side: "left", children: [
            /* @__PURE__ */ s(ps, { children: /* @__PURE__ */ s(ms, { children: "Browse" }) }),
            /* @__PURE__ */ p("div", { className: "mt-4", children: [
              g ? /* @__PURE__ */ s(Yt, { description: g }) : null,
              h ? /* @__PURE__ */ p("div", { className: "space-y-2", children: [
                /* @__PURE__ */ s(Fe, { className: "h-9" }),
                /* @__PURE__ */ s(Fe, { className: "h-9" }),
                /* @__PURE__ */ s(Fe, { className: "h-9" })
              ] }) : /* @__PURE__ */ p("div", { className: "space-y-6", children: [
                /* @__PURE__ */ s(ka, { categories: u, activeSlug: w, onSelect: Q }),
                /* @__PURE__ */ s(
                  $o,
                  {
                    facets: D,
                    value: R,
                    onChange: (F) => {
                      E(F), x(1);
                    },
                    onClear: () => {
                      E({}), x(1);
                    },
                    enabledFilters: z
                  }
                ),
                $.length > 1 && /* @__PURE__ */ p("div", { className: "space-y-2", children: [
                  /* @__PURE__ */ s("div", { className: "text-sm font-semibold", children: "Sort" }),
                  /* @__PURE__ */ p(
                    Oo,
                    {
                      value: S,
                      onValueChange: (F) => {
                        I(F), x(1);
                      },
                      children: [
                        /* @__PURE__ */ s(Dr, { "aria-label": "Sort", children: /* @__PURE__ */ s(Mo, { placeholder: "Sort" }) }),
                        /* @__PURE__ */ s($r, { children: $.map((F) => /* @__PURE__ */ s(zr, { value: F.value, children: F.label }, F.value)) })
                      ]
                    }
                  )
                ] })
              ] })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ s(
          jr,
          {
            open: !d && H,
            onOpenChange: G,
            side: "bottom",
            preferredTab: c,
            onCheckout: () => {
              typeof window < "u" && window.location.assign(i.checkout);
            },
            trigger: /* @__PURE__ */ p(
              se,
              {
                type: "button",
                variant: "default",
                onClick: () => l("cart"),
                children: [
                  "Cart (",
                  o.count,
                  ")"
                ]
              }
            )
          }
        )
      ] }),
      /* @__PURE__ */ p("div", { className: "hidden lg:flex items-center gap-2", children: [
        /* @__PURE__ */ s(
          jr,
          {
            open: d && H,
            onOpenChange: G,
            side: "popup",
            preferredTab: c,
            onCheckout: () => {
              typeof window < "u" && window.location.assign(i.checkout);
            },
            trigger: /* @__PURE__ */ p(
              se,
              {
                type: "button",
                variant: "outline",
                onClick: () => l("cart"),
                children: [
                  "Cart (",
                  o.count,
                  ")"
                ]
              }
            )
          }
        ),
        /* @__PURE__ */ s(
          se,
          {
            type: "button",
            variant: "default",
            onClick: () => {
              typeof window < "u" && window.location.assign(i.checkout);
            },
            children: "Checkout"
          }
        )
      ] })
    ] }) }),
    /* @__PURE__ */ p(
      se,
      {
        type: "button",
        variant: "ghost",
        className: B(
          "fixed bottom-4 right-4 z-30 hidden items-center gap-2 rounded-full border border-neutral-200 bg-white/90 px-3 py-2 text-xs font-medium text-neutral-900 shadow-sm backdrop-blur hover:bg-white dark:border-neutral-800 dark:bg-neutral-950/80 dark:text-neutral-50 dark:hover:bg-neutral-950 lg:flex",
          H ? "lg:hidden" : void 0
        ),
        onClick: () => {
          l("chat"), G(!0);
        },
        "aria-label": "Open chat",
        children: [
          /* @__PURE__ */ s(ZC, { className: "h-4 w-4" }),
          "Chat"
        ]
      }
    ),
    /* @__PURE__ */ p("main", { className: "mx-auto grid max-w-7xl items-start gap-6 px-4 py-6 lg:grid-cols-[280px_1fr]", children: [
      /* @__PURE__ */ s("aside", { className: "hidden lg:block", children: /* @__PURE__ */ s("div", { className: "sticky top-24", children: /* @__PURE__ */ p(Lt, { className: "flex max-h-[calc(100vh-6rem)] flex-col rounded-2xl", children: [
        /* @__PURE__ */ s(Rr, { className: "pb-4", children: /* @__PURE__ */ s(Or, { className: "text-base", children: "Browse" }) }),
        /* @__PURE__ */ p(Qt, { className: "flex-1 space-y-6 overflow-y-auto pr-2", children: [
          /* @__PURE__ */ p("div", { children: [
            /* @__PURE__ */ s("div", { className: "text-sm font-semibold", children: "Categories" }),
            g ? /* @__PURE__ */ s(Yt, { className: "mt-3", description: g }) : null,
            h ? /* @__PURE__ */ p("div", { className: "mt-3 space-y-2", children: [
              /* @__PURE__ */ s(Fe, { className: "h-9" }),
              /* @__PURE__ */ s(Fe, { className: "h-9" }),
              /* @__PURE__ */ s(Fe, { className: "h-9" })
            ] }) : /* @__PURE__ */ s("div", { className: "mt-3", children: /* @__PURE__ */ s(ka, { categories: u, activeSlug: w, onSelect: Q }) })
          ] }),
          $.length > 1 && /* @__PURE__ */ p("div", { children: [
            /* @__PURE__ */ s("div", { className: "text-sm font-semibold", children: "Sort" }),
            /* @__PURE__ */ s("div", { className: "mt-2", children: /* @__PURE__ */ p(
              Oo,
              {
                value: S,
                onValueChange: (F) => {
                  I(F), x(1);
                },
                children: [
                  /* @__PURE__ */ s(Dr, { "aria-label": "Sort", children: /* @__PURE__ */ s(Mo, { placeholder: "Sort" }) }),
                  /* @__PURE__ */ s($r, { children: $.map((F) => /* @__PURE__ */ s(zr, { value: F.value, children: F.label }, F.value)) })
                ]
              }
            ) })
          ] }),
          /* @__PURE__ */ s(
            $o,
            {
              facets: D,
              value: R,
              onChange: (F) => {
                E(F), x(1);
              },
              onClear: () => {
                E({}), x(1);
              },
              enabledFilters: z
            }
          )
        ] })
      ] }) }) }),
      /* @__PURE__ */ p("section", { children: [
        /* @__PURE__ */ s("div", { className: "flex items-end justify-between gap-3", children: /* @__PURE__ */ p("div", { children: [
          /* @__PURE__ */ s("h1", { className: "text-2xl font-semibold tracking-tight", children: j.shopPage.title || "Shop" }),
          j.shopPage.description && /* @__PURE__ */ s("p", { className: "mt-1 text-sm text-neutral-600 dark:text-neutral-400", children: j.shopPage.description })
        ] }) }),
        T ? /* @__PURE__ */ s(Yt, { className: "mt-6", description: T }) : null,
        O ? /* @__PURE__ */ s("div", { className: "mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4", children: Array.from({ length: 8 }).map((F, Y) => /* @__PURE__ */ s(Fe, { className: "aspect-[4/5] rounded-2xl" }, Y)) }) : /* @__PURE__ */ p("div", { className: "mt-6", children: [
          /* @__PURE__ */ s(
            _s,
            {
              products: P?.items ?? [],
              columns: r.ui?.productGrid?.columns,
              getProductHref: (F) => i.product(F.slug),
              onAddToCart: (F) => ge(F, null, 1),
              onQuickView: (F) => {
                fe(F), X(!0);
              },
              layout: j.shopLayout.layout,
              imageCrop: j.shopLayout.imageCrop
            }
          ),
          /* @__PURE__ */ p("div", { className: "mt-8 flex items-center justify-between", children: [
            /* @__PURE__ */ s(
              se,
              {
                type: "button",
                variant: "outline",
                disabled: _ <= 1,
                onClick: () => x((F) => Math.max(1, F - 1)),
                children: "Previous"
              }
            ),
            /* @__PURE__ */ p("div", { className: "text-xs text-neutral-600 dark:text-neutral-400", children: [
              "Page ",
              _
            ] }),
            /* @__PURE__ */ s(
              se,
              {
                type: "button",
                variant: "outline",
                disabled: !P?.hasNextPage,
                onClick: () => x((F) => F + 1),
                children: "Next"
              }
            )
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ s(
      Si,
      {
        product: J,
        open: Z,
        onOpenChange: X,
        productHref: (F) => i.product(F),
        onAddToCart: (F, Y, he) => ge(F, Y, he)
      }
    )
  ] });
}
function QC(e) {
  return /* @__PURE__ */ s("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", ...e, children: /* @__PURE__ */ s("path", { d: "M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" }) });
}
function KC({
  categorySlug: e,
  className: t,
  routes: n
}) {
  const { config: r } = Le(), o = zt(), a = ws(), { categories: i } = Da(), [c, l] = m.useState(() => typeof window > "u" ? !1 : window.matchMedia?.("(min-width: 1024px)")?.matches ?? !1);
  m.useEffect(() => {
    if (typeof window > "u") return;
    const V = window.matchMedia?.("(min-width: 1024px)");
    if (!V) return;
    const ie = () => l(V.matches);
    return ie(), V.addEventListener?.("change", ie), () => V.removeEventListener?.("change", ie);
  }, []);
  const [d, f] = m.useState(!1), [u, h] = m.useState(!1), [g, b] = m.useState("cart"), v = m.useMemo(() => Fa({ includeCategory: !1 }), []), [y, w] = m.useState(v?.search ?? ""), [k, _] = m.useState(v?.page ?? 1), [x, S] = m.useState(v?.sort ?? "featured"), [I, R] = m.useState(v?.filters ?? {}), [E, P] = m.useState(null), [O, T] = m.useState(!1), D = i.find((V) => V.slug === e) ?? null, { data: j, isLoading: z, error: W } = Go({
    category: e,
    search: y.trim() || void 0,
    filters: I,
    sort: x,
    page: k,
    pageSize: 24
  }), $ = n?.product ?? ((V) => `/product/${V}`), C = n?.shop ?? "/shop", N = n?.cart ?? "/cart", H = n?.checkout ?? "/checkout", G = m.useMemo(() => {
    const V = j?.items ?? [], ie = /* @__PURE__ */ new Set();
    let ue = Number.POSITIVE_INFINITY, pe = 0;
    for (const et of V) {
      for (const Qe of et.tags ?? []) ie.add(Qe);
      ue = Math.min(ue, et.price), pe = Math.max(pe, et.price);
    }
    const $e = Array.from(ie).slice(0, 12), Ye = Number.isFinite(ue) ? { min: ue, max: pe } : void 0;
    return { tags: $e, price: Ye };
  }, [j?.items]), { settings: J } = cr(), fe = J.catalog.filters, Z = J.catalog.sort, X = m.useMemo(() => {
    const V = [];
    return Z.featured && V.push({ value: "featured", label: "Featured" }), Z.priceAsc && V.push({ value: "price_asc", label: "Price: Low to High" }), Z.priceDesc && V.push({ value: "price_desc", label: "Price: High to Low" }), V.length === 0 && V.push({ value: "featured", label: "Featured" }), V;
  }, [Z]);
  m.useEffect(() => {
    X.some((V) => V.value === x) || S(X[0].value);
  }, [X, x]), ja(
    {
      search: y,
      sort: x,
      page: k,
      filters: I
    },
    { includeCategory: !1 }
  );
  const Q = m.useCallback(
    (V, ie, ue) => {
      o.addItem(
        {
          productId: V.id,
          variantId: ie?.id,
          unitPrice: V.price,
          currency: V.currency,
          titleSnapshot: ie ? `${V.title} — ${ie.title}` : V.title,
          imageSnapshot: V.images[0]?.url,
          paymentResource: V.id,
          metadata: Ii(V)
        },
        ue
      ), a?.toast({
        title: "Added to cart",
        description: V.title,
        actionLabel: "View cart",
        onAction: () => {
          typeof window < "u" && (window.matchMedia?.("(min-width: 1024px)").matches ? window.location.assign(N) : (b("cart"), h(!0)));
        }
      });
    },
    [o, N, a]
  ), ge = (V) => {
    R(V), _(1);
  }, F = () => {
    R({}), _(1);
  }, Y = (V) => {
    S(V), _(1);
  }, he = /* @__PURE__ */ s(Lt, { className: "flex max-h-[calc(100vh-6rem)] flex-col rounded-2xl", children: /* @__PURE__ */ p(Qt, { className: "flex-1 space-y-5 overflow-y-auto pr-2 pt-6", children: [
    /* @__PURE__ */ p("div", { className: "space-y-1", children: [
      /* @__PURE__ */ p("div", { className: "flex items-center justify-between gap-2", children: [
        /* @__PURE__ */ s("div", { className: "text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400", children: "Category" }),
        /* @__PURE__ */ s(se, { asChild: !0, type: "button", variant: "ghost", size: "sm", className: "h-8 px-2 text-xs", children: /* @__PURE__ */ s("a", { href: C, children: "All categories" }) })
      ] }),
      /* @__PURE__ */ s("div", { className: "text-base font-semibold text-neutral-950 dark:text-neutral-50", children: D?.name ?? e }),
      /* @__PURE__ */ s("div", { className: "text-sm text-neutral-600 dark:text-neutral-400", children: D?.description ?? "Browse products in this category." })
    ] }),
    X.length > 1 && /* @__PURE__ */ p("div", { className: "space-y-2", children: [
      /* @__PURE__ */ s("div", { className: "text-sm font-semibold", children: "Sort" }),
      /* @__PURE__ */ p(Oo, { value: x, onValueChange: Y, children: [
        /* @__PURE__ */ s(Dr, { "aria-label": "Sort", children: /* @__PURE__ */ s(Mo, { placeholder: "Sort" }) }),
        /* @__PURE__ */ s($r, { children: X.map((V) => /* @__PURE__ */ s(zr, { value: V.value, children: V.label }, V.value)) })
      ] })
    ] }),
    /* @__PURE__ */ s(St, {}),
    /* @__PURE__ */ s($o, { facets: G, value: I, onChange: ge, onClear: F, enabledFilters: fe })
  ] }) });
  return /* @__PURE__ */ p("div", { className: B("min-h-screen bg-neutral-50 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50", t), children: [
    /* @__PURE__ */ s("header", { className: "sticky top-0 z-40 border-b border-neutral-200 bg-neutral-50/80 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/70", children: /* @__PURE__ */ p("div", { className: "mx-auto flex max-w-7xl items-center gap-3 px-4 py-3", children: [
      /* @__PURE__ */ s("a", { href: C, className: "text-sm font-semibold tracking-tight", children: r.brand?.name ?? "Shop" }),
      /* @__PURE__ */ s("div", { className: "flex-1", children: /* @__PURE__ */ s(Ni, { value: y, onChange: w }) }),
      /* @__PURE__ */ p("div", { className: "flex items-center gap-2 lg:hidden", children: [
        /* @__PURE__ */ p(us, { open: d, onOpenChange: f, children: [
          /* @__PURE__ */ s(fs, { asChild: !0, children: /* @__PURE__ */ s(se, { type: "button", variant: "outline", children: "Filters" }) }),
          /* @__PURE__ */ p(Zr, { side: "left", children: [
            /* @__PURE__ */ s(ps, { children: /* @__PURE__ */ s(ms, { children: "Filters" }) }),
            /* @__PURE__ */ s("div", { className: "mt-4", children: he })
          ] })
        ] }),
        /* @__PURE__ */ s(
          jr,
          {
            open: !c && u,
            onOpenChange: h,
            side: "bottom",
            preferredTab: g,
            onCheckout: () => {
              typeof window < "u" && window.location.assign(H);
            },
            trigger: /* @__PURE__ */ p(se, { type: "button", variant: "default", onClick: () => b("cart"), children: [
              "Cart (",
              o.count,
              ")"
            ] })
          }
        )
      ] }),
      /* @__PURE__ */ p("div", { className: "hidden lg:flex items-center gap-2", children: [
        /* @__PURE__ */ s(
          jr,
          {
            open: c && u,
            onOpenChange: h,
            side: "popup",
            preferredTab: g,
            onCheckout: () => {
              typeof window < "u" && window.location.assign(H);
            },
            trigger: /* @__PURE__ */ p(se, { type: "button", variant: "outline", onClick: () => b("cart"), children: [
              "Cart (",
              o.count,
              ")"
            ] })
          }
        ),
        /* @__PURE__ */ s(
          se,
          {
            type: "button",
            variant: "default",
            onClick: () => {
              typeof window < "u" && window.location.assign(H);
            },
            children: "Checkout"
          }
        )
      ] })
    ] }) }),
    /* @__PURE__ */ p(
      se,
      {
        type: "button",
        variant: "ghost",
        className: B(
          "fixed bottom-4 right-4 z-30 hidden items-center gap-2 rounded-full border border-neutral-200 bg-white/90 px-3 py-2 text-xs font-medium text-neutral-900 shadow-sm backdrop-blur hover:bg-white dark:border-neutral-800 dark:bg-neutral-950/80 dark:text-neutral-50 dark:hover:bg-neutral-950 lg:flex",
          u ? "lg:hidden" : void 0
        ),
        onClick: () => {
          b("chat"), h(!0);
        },
        "aria-label": "Open chat",
        children: [
          /* @__PURE__ */ s(QC, { className: "h-4 w-4" }),
          "Chat"
        ]
      }
    ),
    /* @__PURE__ */ p("main", { className: "mx-auto max-w-7xl px-4 py-8", children: [
      /* @__PURE__ */ s(Ci, { items: [{ label: "Shop", href: C }, { label: D?.name ?? e }] }),
      /* @__PURE__ */ p("div", { className: "mt-6", children: [
        /* @__PURE__ */ s("h1", { className: "text-2xl font-semibold tracking-tight", children: D?.name ?? "Category" }),
        /* @__PURE__ */ s("p", { className: "mt-1 text-sm text-neutral-600 dark:text-neutral-400", children: D?.description ?? "Browse products in this category." })
      ] }),
      W ? /* @__PURE__ */ s(Yt, { className: "mt-6", description: W }) : null,
      /* @__PURE__ */ p("div", { className: "mt-6 grid gap-6 lg:grid-cols-[280px_1fr]", children: [
        /* @__PURE__ */ s("aside", { className: "hidden lg:block", children: /* @__PURE__ */ s("div", { className: "sticky top-24", children: he }) }),
        /* @__PURE__ */ s("div", { children: z ? /* @__PURE__ */ s("div", { className: "mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4", children: Array.from({ length: 8 }).map((V, ie) => /* @__PURE__ */ s(Fe, { className: "aspect-[4/5] rounded-2xl" }, ie)) }) : /* @__PURE__ */ p("div", { className: "mt-6", children: [
          /* @__PURE__ */ s(
            _s,
            {
              products: j?.items ?? [],
              columns: r.ui?.productGrid?.columns,
              getProductHref: (V) => $(V.slug),
              onAddToCart: (V) => Q(V, null, 1),
              onQuickView: (V) => {
                P(V), T(!0);
              },
              layout: J.categoryLayout.layout,
              imageCrop: J.categoryLayout.imageCrop
            }
          ),
          /* @__PURE__ */ p("div", { className: "mt-8 flex items-center justify-between", children: [
            /* @__PURE__ */ s(
              se,
              {
                type: "button",
                variant: "outline",
                disabled: k <= 1,
                onClick: () => _((V) => Math.max(1, V - 1)),
                children: "Previous"
              }
            ),
            /* @__PURE__ */ p("div", { className: "text-xs text-neutral-600 dark:text-neutral-400", children: [
              "Page ",
              k
            ] }),
            /* @__PURE__ */ s(
              se,
              {
                type: "button",
                variant: "outline",
                disabled: !j?.hasNextPage,
                onClick: () => _((V) => V + 1),
                children: "Next"
              }
            )
          ] })
        ] }) })
      ] }),
      /* @__PURE__ */ s(
        Si,
        {
          product: E,
          open: O,
          onOpenChange: T,
          productHref: (V) => $(V),
          onAddToCart: (V, ie, ue) => Q(V, ie, ue)
        }
      )
    ] })
  ] });
}
function JC(e) {
  return !e || typeof e != "string" ? [] : e.split(",").map((t) => t.trim()).filter(Boolean);
}
function XC({
  slug: e,
  className: t,
  routes: n
}) {
  const r = zt(), o = ws(), { product: a, isLoading: i, error: c } = ad(e), [l, d] = m.useState(1), [f, u] = m.useState({
    selectedOptions: {},
    variant: null
  });
  m.useEffect(() => {
    if (!a || !a.variants?.length) return;
    const z = a.variants[0];
    u({ selectedOptions: { ...z.options }, variant: z });
  }, [a?.id]);
  const { settings: h } = cr(), { mode: g, maxItems: b } = h.relatedProducts, v = fd({
    productId: a?.id,
    enabled: g === "ai" && !!a?.id
  }), y = m.useMemo(() => g === "by_category" && a?.categoryIds?.length ? { category: a.categoryIds[0], page: 1, pageSize: b + 1 } : { page: 1, pageSize: b + 4 }, [g, b, a?.categoryIds]), w = Go(y), k = m.useMemo(() => {
    const W = (w.data?.items ?? []).filter(($) => $.slug !== e);
    if (g === "manual" && a) {
      const $ = a.attributes?.relatedProductIds || a.attributes?.related_product_ids;
      if ($) {
        const C = JC(String($));
        if (C.length > 0) {
          const N = new Map(W.map((G) => [G.id, G]));
          return C.map((G) => N.get(G)).filter((G) => !!G).slice(0, b);
        }
      }
    }
    if (g === "ai" && v.relatedProductIds && v.relatedProductIds.length > 0) {
      const $ = new Map(W.map((N) => [N.id, N])), C = v.relatedProductIds.map((N) => $.get(N)).filter((N) => !!N);
      if (C.length > 0)
        return C.slice(0, b);
    }
    return W.slice(0, b);
  }, [w.data?.items, e, g, b, a, v.relatedProductIds]), _ = n?.shop ?? "/shop", x = n?.checkout ?? "/checkout", S = n?.cart ?? "/cart", I = n?.product ?? ((z) => `/product/${z}`);
  if (i)
    return /* @__PURE__ */ s("div", { className: B("min-h-screen bg-neutral-50 p-6 dark:bg-neutral-950", t), children: /* @__PURE__ */ p("div", { className: "mx-auto max-w-6xl", children: [
      /* @__PURE__ */ s(Fe, { className: "h-5 w-40" }),
      /* @__PURE__ */ p("div", { className: "mt-6 grid gap-8 lg:grid-cols-2", children: [
        /* @__PURE__ */ s(Fe, { className: "aspect-square rounded-2xl" }),
        /* @__PURE__ */ p("div", { className: "space-y-4", children: [
          /* @__PURE__ */ s(Fe, { className: "h-8 w-2/3" }),
          /* @__PURE__ */ s(Fe, { className: "h-6 w-32" }),
          /* @__PURE__ */ s(Fe, { className: "h-20" }),
          /* @__PURE__ */ s(Fe, { className: "h-11" })
        ] })
      ] })
    ] }) });
  if (c)
    return /* @__PURE__ */ s("div", { className: B("min-h-screen bg-neutral-50 p-6 dark:bg-neutral-950", t), children: /* @__PURE__ */ s("div", { className: "mx-auto max-w-6xl", children: /* @__PURE__ */ s(Yt, { description: c }) }) });
  if (!a)
    return /* @__PURE__ */ s("div", { className: B("min-h-screen bg-neutral-50 p-6 dark:bg-neutral-950", t), children: /* @__PURE__ */ s("div", { className: "mx-auto max-w-6xl", children: /* @__PURE__ */ s(Yt, { description: "Product not found." }) }) });
  const R = f.variant?.price ?? a.price, E = f.variant?.compareAtPrice ?? a.compareAtPrice, P = f.variant?.inventoryStatus === "out_of_stock" || typeof f.variant?.inventoryQuantity == "number" && f.variant.inventoryQuantity <= 0, O = a.inventoryStatus === "out_of_stock" || typeof a.inventoryQuantity == "number" && a.inventoryQuantity <= 0, T = f.variant ? P : O, D = () => {
    T || (r.addItem(
      {
        productId: a.id,
        variantId: f.variant?.id,
        unitPrice: R,
        currency: a.currency,
        titleSnapshot: f.variant ? `${a.title} — ${f.variant.title}` : a.title,
        imageSnapshot: a.images[0]?.url,
        paymentResource: a.id,
        metadata: Ii(a)
      },
      l
    ), o?.toast({
      title: "Added to cart",
      description: a.title,
      actionLabel: "View cart",
      onAction: () => {
        typeof window < "u" && window.location.assign(S);
      }
    }));
  }, j = () => {
    T || (D(), typeof window < "u" && window.location.assign(x));
  };
  return /* @__PURE__ */ s("div", { className: B("min-h-screen bg-neutral-50 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50", t), children: /* @__PURE__ */ p("main", { className: "mx-auto max-w-6xl px-4 py-8", children: [
    /* @__PURE__ */ s(Ci, { items: [{ label: "Shop", href: _ }, { label: a.title }] }),
    /* @__PURE__ */ p("div", { className: "mt-6 grid gap-10 lg:grid-cols-2", children: [
      /* @__PURE__ */ s(xi, { images: a.images }),
      /* @__PURE__ */ p("div", { className: "space-y-6", children: [
        /* @__PURE__ */ p("div", { children: [
          /* @__PURE__ */ s("h1", { className: "text-3xl font-semibold tracking-tight", children: a.title }),
          /* @__PURE__ */ s("div", { className: "mt-3", children: /* @__PURE__ */ s(xs, { amount: R, currency: a.currency, compareAt: E }) }),
          T ? /* @__PURE__ */ s("div", { className: "mt-2 text-sm font-medium text-red-700 dark:text-red-300", children: "Out of stock" }) : typeof a.inventoryQuantity == "number" && a.inventoryQuantity > 0 && a.inventoryQuantity <= 5 ? /* @__PURE__ */ p("div", { className: "mt-2 text-sm text-neutral-600 dark:text-neutral-400", children: [
            "Only ",
            /* @__PURE__ */ s("span", { className: "font-semibold text-neutral-950 dark:text-neutral-50", children: a.inventoryQuantity }),
            " left"
          ] }) : null,
          /* @__PURE__ */ s("p", { className: "mt-4 text-sm text-neutral-600 dark:text-neutral-400", children: a.description })
        ] }),
        /* @__PURE__ */ s(
          _i,
          {
            product: a,
            value: { selectedOptions: f.selectedOptions, variantId: f.variant?.id },
            onChange: (z) => u(z)
          }
        ),
        /* @__PURE__ */ p("div", { className: "flex flex-wrap items-center gap-3", children: [
          /* @__PURE__ */ s(ki, { qty: l, onChange: d }),
          /* @__PURE__ */ s(se, { type: "button", onClick: D, className: "flex-1", disabled: T, children: T ? "Out of stock" : "Add to cart" }),
          /* @__PURE__ */ s(se, { type: "button", variant: "outline", onClick: j, disabled: T, children: "Buy now" })
        ] }),
        (h.sections.showDescription || h.sections.showSpecs || h.sections.showShipping) && /* @__PURE__ */ p(Of, { type: "single", collapsible: !0, defaultValue: h.sections.showDescription ? "desc" : void 0, children: [
          h.sections.showDescription && /* @__PURE__ */ p(Er, { value: "desc", children: [
            /* @__PURE__ */ s(Ar, { children: "Description" }),
            /* @__PURE__ */ s(Pr, { children: /* @__PURE__ */ s("div", { className: "text-sm text-neutral-600 dark:text-neutral-400", children: a.description }) })
          ] }),
          h.sections.showSpecs && /* @__PURE__ */ p(Er, { value: "specs", children: [
            /* @__PURE__ */ s(Ar, { children: "Specs" }),
            /* @__PURE__ */ s(Pr, { children: /* @__PURE__ */ s("div", { className: "text-sm text-neutral-600 dark:text-neutral-400", children: a.attributes ? /* @__PURE__ */ s("div", { className: "space-y-1", children: Object.entries(a.attributes).map(([z, W]) => /* @__PURE__ */ p("div", { children: [
              /* @__PURE__ */ p("span", { className: "font-medium text-neutral-950 dark:text-neutral-50", children: [
                z,
                ":"
              ] }),
              " ",
              String(W)
            ] }, z)) }) : "No specs provided." }) })
          ] }),
          h.sections.showShipping && /* @__PURE__ */ p(Er, { value: "ship", children: [
            /* @__PURE__ */ s(Ar, { children: "Shipping & returns" }),
            /* @__PURE__ */ s(Pr, { children: /* @__PURE__ */ s("div", { className: "text-sm text-neutral-600 dark:text-neutral-400", children: "Ships in 2–3 business days. Easy returns within 30 days." }) })
          ] })
        ] })
      ] })
    ] }),
    h.sections.showRelatedProducts && k.length ? /* @__PURE__ */ p("section", { className: "mt-12", children: [
      /* @__PURE__ */ s("h2", { className: "text-lg font-semibold", children: "Related products" }),
      /* @__PURE__ */ s("div", { className: "mt-4", children: /* @__PURE__ */ s(
        _s,
        {
          products: k,
          columns: { base: 2, md: 4, lg: 4 },
          layout: h.relatedProducts.layout.layout,
          imageCrop: h.relatedProducts.layout.imageCrop,
          getProductHref: (z) => I(z.slug),
          onAddToCart: (z) => r.addItem(
            {
              productId: z.id,
              unitPrice: z.price,
              currency: z.currency,
              titleSnapshot: z.title,
              imageSnapshot: z.images[0]?.url,
              paymentResource: z.id
            },
            1
          )
        }
      ) })
    ] }) : null
  ] }) });
}
function eN({
  className: e,
  checkoutHref: t
}) {
  const { config: n } = Le(), { settings: r } = cr(), o = t ?? "/checkout", a = n.checkout.allowPromoCodes && r.checkout.promoCodes;
  return /* @__PURE__ */ s("div", { className: B("min-h-screen bg-neutral-50 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50", e), children: /* @__PURE__ */ p("main", { className: "mx-auto max-w-6xl px-4 py-10", children: [
    /* @__PURE__ */ s("h1", { className: "text-3xl font-semibold tracking-tight", children: "Cart" }),
    /* @__PURE__ */ s("p", { className: "mt-2 text-sm text-neutral-600 dark:text-neutral-400", children: "Review items, adjust quantities, then check out." }),
    /* @__PURE__ */ s("div", { className: "mt-8", children: /* @__PURE__ */ s(
      dp,
      {
        onCheckout: () => {
          typeof window < "u" && window.location.assign(o);
        },
        showPromoCode: a
      }
    ) })
  ] }) });
}
function tN({
  className: e,
  routes: t
}) {
  const { config: n } = Le(), r = zt(), o = za(), a = n.customer?.isSignedIn ?? !!n.customer?.id, c = !(n.checkout.requireAccount ? !1 : n.checkout.guestCheckout ?? !0) && !a;
  m.useEffect(() => {
    o.kind === "success" && r.clear();
  }, [o.kind]);
  const l = t?.shop ?? "/shop", d = t?.orders ?? "/account/orders", f = t?.login;
  return /* @__PURE__ */ s("div", { className: B("min-h-screen bg-neutral-50 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50", e), children: /* @__PURE__ */ p("main", { className: "mx-auto max-w-6xl px-4 py-10", children: [
    /* @__PURE__ */ s(
      ks,
      {
        result: o,
        onContinueShopping: () => {
          typeof window < "u" && window.location.assign(l);
        },
        onViewOrders: () => {
          typeof window < "u" && window.location.assign(d);
        }
      }
    ),
    o.kind === "idle" ? /* @__PURE__ */ p(Ct, { children: [
      /* @__PURE__ */ p("div", { children: [
        /* @__PURE__ */ s("h1", { className: "text-3xl font-semibold tracking-tight", children: "Checkout" }),
        /* @__PURE__ */ s("p", { className: "mt-2 text-sm text-neutral-600 dark:text-neutral-400", children: n.checkout.mode === "none" ? "Confirm and pay." : "Enter details, then complete payment." })
      ] }),
      /* @__PURE__ */ s("div", { className: "mt-8", children: /* @__PURE__ */ s(sd, { children: c ? /* @__PURE__ */ p(Lt, { className: "rounded-2xl", children: [
        /* @__PURE__ */ s(Rr, { className: "pb-4", children: /* @__PURE__ */ s(Or, { className: "text-base", children: "Sign in required" }) }),
        /* @__PURE__ */ p(Qt, { children: [
          /* @__PURE__ */ s("div", { className: "text-sm text-neutral-600 dark:text-neutral-400", children: "This store requires an account to complete checkout." }),
          f ? /* @__PURE__ */ s("div", { className: "mt-4", children: /* @__PURE__ */ s(
            se,
            {
              type: "button",
              onClick: () => {
                typeof window < "u" && window.location.assign(f);
              },
              children: "Sign in"
            }
          ) }) : null
        ] })
      ] }) : /* @__PURE__ */ s(
        up,
        {
          left: /* @__PURE__ */ p("div", { className: "space-y-6", children: [
            /* @__PURE__ */ s(pp, {}),
            /* @__PURE__ */ p(Lt, { className: "rounded-2xl", children: [
              /* @__PURE__ */ s(Rr, { className: "pb-4", children: /* @__PURE__ */ s(Or, { className: "text-base", children: "Payment" }) }),
              /* @__PURE__ */ p(Qt, { children: [
                /* @__PURE__ */ s(St, { className: "mb-4" }),
                /* @__PURE__ */ s(hp, {})
              ] })
            ] })
          ] }),
          right: /* @__PURE__ */ s("div", { className: "lg:sticky lg:top-24", children: /* @__PURE__ */ s(gp, {}) })
        }
      ) }) })
    ] }) : null
  ] }) });
}
function nN({
  className: e,
  isSignedIn: t = !0,
  onLogin: n
}) {
  const { orders: r, isLoading: o, error: a } = id(), [i, c] = m.useState(null);
  return t ? /* @__PURE__ */ s("div", { className: B("min-h-screen bg-neutral-50 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50", e), children: /* @__PURE__ */ p("main", { className: "mx-auto max-w-5xl px-4 py-10 sm:py-12", children: [
    /* @__PURE__ */ p("header", { className: "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", children: [
      /* @__PURE__ */ p("div", { children: [
        /* @__PURE__ */ s("h1", { className: "text-3xl font-semibold tracking-tight", children: "Orders" }),
        /* @__PURE__ */ s("p", { className: "mt-2 text-sm text-neutral-600 dark:text-neutral-400", children: "View past purchases and receipts." })
      ] }),
      !o && !a && !i && r.length > 0 ? /* @__PURE__ */ p("div", { className: "text-sm text-neutral-600 dark:text-neutral-400", children: [
        r.length,
        " order",
        r.length === 1 ? "" : "s"
      ] }) : null
    ] }),
    a ? /* @__PURE__ */ s(Yt, { className: "mt-8", description: a }) : null,
    o ? /* @__PURE__ */ p("div", { className: "mt-8 grid gap-4", children: [
      /* @__PURE__ */ s(Fe, { className: "h-32 rounded-2xl" }),
      /* @__PURE__ */ s(Fe, { className: "h-32 rounded-2xl" }),
      /* @__PURE__ */ s(Fe, { className: "h-32 rounded-2xl" })
    ] }) : r.length === 0 ? /* @__PURE__ */ s("div", { className: "mt-8", children: /* @__PURE__ */ s(or, { title: "No orders yet", description: "When you purchase something, it will show up here." }) }) : i ? /* @__PURE__ */ s("div", { className: "mt-8", children: /* @__PURE__ */ s(bp, { order: i, onBack: () => c(null) }) }) : /* @__PURE__ */ s("div", { className: "mt-8", children: /* @__PURE__ */ s(vp, { orders: r, onView: c }) })
  ] }) }) : /* @__PURE__ */ s("div", { className: B("min-h-screen bg-neutral-50 p-10 dark:bg-neutral-950", e), children: /* @__PURE__ */ s("div", { className: "mx-auto max-w-4xl", children: /* @__PURE__ */ s(
    or,
    {
      title: "Sign in to view your orders",
      description: "Your purchase history will appear here once you're logged in.",
      actionLabel: n ? "Sign in" : void 0,
      onAction: n
    }
  ) }) });
}
function rN({ className: e }) {
  return /* @__PURE__ */ p("svg", { className: e, width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ s("polyline", { points: "6 9 6 2 18 2 18 9" }),
    /* @__PURE__ */ s("path", { d: "M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" }),
    /* @__PURE__ */ s("rect", { x: "6", y: "14", width: "12", height: "8" })
  ] });
}
function oN({ className: e }) {
  return /* @__PURE__ */ s("svg", { className: e, width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ s("path", { d: "m15 18-6-6 6-6" }) });
}
function sN(e) {
  switch (e) {
    case "x402":
      return "Crypto (x402)";
    case "credits":
      return "Credits";
    case "stripe":
      return "Card";
    default:
      return "Payment";
  }
}
function aN({
  order: e,
  source: t,
  purchaseId: n,
  customerEmail: r,
  customerName: o,
  className: a,
  onBack: i
}) {
  const { config: c } = Le(), l = t ?? e.source, d = n ?? e.purchaseId, f = r ?? e.customerEmail, u = o ?? e.customerName, h = c.brand?.name ?? "Store", g = c.brand?.logoUrl, b = () => {
    typeof window < "u" && window.print();
  }, v = new Date(e.createdAt).toLocaleDateString(void 0, {
    year: "numeric",
    month: "long",
    day: "numeric"
  }), y = new Date(e.createdAt).toLocaleTimeString(void 0, {
    hour: "numeric",
    minute: "2-digit"
  });
  return /* @__PURE__ */ p("div", { className: B("min-h-screen bg-neutral-100 dark:bg-neutral-900 print:bg-white print:dark:bg-white", a), children: [
    /* @__PURE__ */ s("div", { className: "border-b border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-950 print:hidden", children: /* @__PURE__ */ p("div", { className: "mx-auto flex max-w-2xl items-center justify-between", children: [
      i ? /* @__PURE__ */ p(se, { type: "button", variant: "ghost", size: "sm", onClick: i, children: [
        /* @__PURE__ */ s(oN, { className: "mr-1" }),
        " Back"
      ] }) : /* @__PURE__ */ s("div", {}),
      /* @__PURE__ */ p(se, { type: "button", variant: "outline", size: "sm", onClick: b, children: [
        /* @__PURE__ */ s(rN, { className: "mr-2" }),
        " Print Receipt"
      ] })
    ] }) }),
    /* @__PURE__ */ s("div", { className: "mx-auto max-w-2xl px-4 py-8 print:max-w-none print:px-0 print:py-0", children: /* @__PURE__ */ p("div", { className: "rounded-xl border border-neutral-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 print:border-0 print:shadow-none print:dark:bg-white print:dark:text-neutral-950", children: [
      /* @__PURE__ */ p("div", { className: "flex items-center justify-between border-b border-neutral-200 pb-6 dark:border-neutral-800 print:dark:border-neutral-200", children: [
        /* @__PURE__ */ p("div", { className: "flex items-center gap-3", children: [
          g ? /* @__PURE__ */ s("img", { src: g, alt: h, className: "h-10 w-10 rounded-lg object-contain" }) : null,
          /* @__PURE__ */ s("div", { className: "text-xl font-semibold", children: h })
        ] }),
        /* @__PURE__ */ p("div", { className: "text-right", children: [
          /* @__PURE__ */ s("div", { className: "text-sm font-medium text-neutral-600 dark:text-neutral-400 print:dark:text-neutral-600", children: "Receipt" }),
          /* @__PURE__ */ s("div", { className: "mt-1 font-mono text-sm", children: e.id })
        ] })
      ] }),
      /* @__PURE__ */ p("div", { className: "mt-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3", children: [
        /* @__PURE__ */ p("div", { children: [
          /* @__PURE__ */ s("div", { className: "text-neutral-600 dark:text-neutral-400 print:dark:text-neutral-600", children: "Date" }),
          /* @__PURE__ */ s("div", { className: "mt-1 font-medium", children: v }),
          /* @__PURE__ */ s("div", { className: "text-neutral-600 dark:text-neutral-400 print:dark:text-neutral-600", children: y })
        ] }),
        /* @__PURE__ */ p("div", { children: [
          /* @__PURE__ */ s("div", { className: "text-neutral-600 dark:text-neutral-400 print:dark:text-neutral-600", children: "Payment Method" }),
          /* @__PURE__ */ s("div", { className: "mt-1 font-medium", children: sN(l) })
        ] }),
        /* @__PURE__ */ p("div", { children: [
          /* @__PURE__ */ s("div", { className: "text-neutral-600 dark:text-neutral-400 print:dark:text-neutral-600", children: "Status" }),
          /* @__PURE__ */ s("div", { className: "mt-1", children: /* @__PURE__ */ s(Tn, { variant: "outline", className: "capitalize print:border-neutral-300", children: e.status }) })
        ] })
      ] }),
      (u || f) && /* @__PURE__ */ p("div", { className: "mt-6 border-t border-neutral-200 pt-6 dark:border-neutral-800 print:dark:border-neutral-200", children: [
        /* @__PURE__ */ s("div", { className: "text-sm text-neutral-600 dark:text-neutral-400 print:dark:text-neutral-600", children: "Customer" }),
        u && /* @__PURE__ */ s("div", { className: "mt-1 font-medium", children: u }),
        f && /* @__PURE__ */ s("div", { className: "text-sm text-neutral-600 dark:text-neutral-400 print:dark:text-neutral-600", children: f })
      ] }),
      /* @__PURE__ */ s("div", { className: "mt-6 border-t border-neutral-200 pt-6 dark:border-neutral-800 print:dark:border-neutral-200", children: /* @__PURE__ */ p("table", { className: "w-full text-sm", children: [
        /* @__PURE__ */ s("thead", { children: /* @__PURE__ */ p("tr", { className: "border-b border-neutral-200 dark:border-neutral-800 print:dark:border-neutral-200", children: [
          /* @__PURE__ */ s("th", { className: "pb-3 text-left font-medium text-neutral-600 dark:text-neutral-400 print:dark:text-neutral-600", children: "Item" }),
          /* @__PURE__ */ s("th", { className: "pb-3 text-center font-medium text-neutral-600 dark:text-neutral-400 print:dark:text-neutral-600", children: "Qty" }),
          /* @__PURE__ */ s("th", { className: "pb-3 text-right font-medium text-neutral-600 dark:text-neutral-400 print:dark:text-neutral-600", children: "Price" })
        ] }) }),
        /* @__PURE__ */ s("tbody", { children: e.items.map((w, k) => /* @__PURE__ */ p("tr", { className: "border-b border-neutral-100 dark:border-neutral-800/50 print:dark:border-neutral-100", children: [
          /* @__PURE__ */ s("td", { className: "py-3", children: /* @__PURE__ */ s("div", { className: "font-medium", children: w.title }) }),
          /* @__PURE__ */ s("td", { className: "py-3 text-center text-neutral-600 dark:text-neutral-400 print:dark:text-neutral-600", children: w.qty }),
          /* @__PURE__ */ s("td", { className: "py-3 text-right", children: Ge({ amount: w.unitPrice * w.qty, currency: w.currency }) })
        ] }, `${w.title}-${k}`)) })
      ] }) }),
      /* @__PURE__ */ p("div", { className: "mt-4 flex flex-col items-end gap-2 text-sm", children: [
        /* @__PURE__ */ p("div", { className: "flex w-48 justify-between", children: [
          /* @__PURE__ */ s("span", { className: "text-neutral-600 dark:text-neutral-400 print:dark:text-neutral-600", children: "Subtotal" }),
          /* @__PURE__ */ s("span", { children: Ge({ amount: e.total, currency: e.currency }) })
        ] }),
        /* @__PURE__ */ p("div", { className: "flex w-48 justify-between border-t border-neutral-200 pt-2 text-base font-semibold dark:border-neutral-800 print:dark:border-neutral-200", children: [
          /* @__PURE__ */ s("span", { children: "Total" }),
          /* @__PURE__ */ s("span", { children: Ge({ amount: e.total, currency: e.currency }) })
        ] })
      ] }),
      d && /* @__PURE__ */ p("div", { className: "mt-6 border-t border-neutral-200 pt-6 dark:border-neutral-800 print:dark:border-neutral-200", children: [
        /* @__PURE__ */ s("div", { className: "text-sm text-neutral-600 dark:text-neutral-400 print:dark:text-neutral-600", children: "Transaction ID" }),
        /* @__PURE__ */ s("div", { className: "mt-1 break-all font-mono text-xs", children: d })
      ] }),
      /* @__PURE__ */ p("div", { className: "mt-8 border-t border-neutral-200 pt-6 text-center text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400 print:dark:border-neutral-200 print:dark:text-neutral-500", children: [
        /* @__PURE__ */ s("p", { children: "Thank you for your purchase!" }),
        /* @__PURE__ */ s("p", { className: "mt-1", children: "If you have any questions, please contact support." })
      ] })
    ] }) })
  ] });
}
function iN({ className: e }) {
  return /* @__PURE__ */ s(
    "svg",
    {
      className: B("h-4 w-4 flex-shrink-0", e),
      viewBox: "0 0 20 20",
      fill: "currentColor",
      children: /* @__PURE__ */ s(
        "path",
        {
          fillRule: "evenodd",
          d: "M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z",
          clipRule: "evenodd"
        }
      )
    }
  );
}
function cN({
  className: e,
  title: t = "Choose Your Plan",
  subtitle: n = "Select the plan that best fits your needs.",
  annualSavingsBadge: r = "2 months free",
  popularBadgeText: o = "Best Deal",
  footerNotice: a
}) {
  const { config: i } = Le(), { tiers: c, status: l, isLoading: d, error: f } = cd(), [u, h] = m.useState("monthly"), g = !!i.adapter.createSubscriptionCheckoutSession, b = async (v) => {
    if (!i.adapter.createSubscriptionCheckoutSession) return;
    const y = await i.adapter.createSubscriptionCheckoutSession({
      tierId: v,
      interval: u,
      successUrl: i.checkout.successUrl,
      cancelUrl: i.checkout.cancelUrl
    });
    y.kind === "redirect" && typeof window < "u" && window.location.assign(y.url);
  };
  return /* @__PURE__ */ s("div", { className: B("min-h-screen bg-neutral-50 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50", e), children: /* @__PURE__ */ p("main", { className: "mx-auto max-w-6xl px-4 py-16", children: [
    /* @__PURE__ */ p("div", { className: "text-center", children: [
      /* @__PURE__ */ s("h1", { className: "text-5xl font-bold tracking-tight", children: t }),
      /* @__PURE__ */ s("p", { className: "mt-4 text-base text-neutral-600 dark:text-neutral-400", children: n })
    ] }),
    /* @__PURE__ */ s("div", { className: "mt-10 flex justify-center", children: /* @__PURE__ */ p("div", { className: "inline-flex items-center rounded-full bg-neutral-200/60 p-1 dark:bg-neutral-800/60", children: [
      /* @__PURE__ */ p(
        "button",
        {
          type: "button",
          onClick: () => h("annual"),
          className: B(
            "relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all",
            u === "annual" ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
          ),
          children: [
            "Yearly",
            r && /* @__PURE__ */ s("span", { className: B(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              u === "annual" ? "bg-white/20 text-white dark:bg-neutral-900/20 dark:text-neutral-900" : "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
            ), children: r })
          ]
        }
      ),
      /* @__PURE__ */ s(
        "button",
        {
          type: "button",
          onClick: () => h("monthly"),
          className: B(
            "rounded-full px-4 py-2 text-sm font-medium transition-all",
            u === "monthly" ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
          ),
          children: "Monthly"
        }
      )
    ] }) }),
    f ? /* @__PURE__ */ s(Yt, { className: "mt-10", description: f }) : null,
    d ? /* @__PURE__ */ p("div", { className: "mt-12 grid gap-6 md:grid-cols-3", children: [
      /* @__PURE__ */ s(Fe, { className: "h-[480px] rounded-2xl" }),
      /* @__PURE__ */ s(Fe, { className: "h-[480px] rounded-2xl" }),
      /* @__PURE__ */ s(Fe, { className: "h-[480px] rounded-2xl" })
    ] }) : c.length === 0 ? /* @__PURE__ */ s("div", { className: "mt-12", children: /* @__PURE__ */ s(or, { title: "No plans available", description: "Subscription plans will appear here once configured." }) }) : (
      /* Pricing Cards */
      /* @__PURE__ */ s("div", { className: "mt-12 grid gap-6 md:grid-cols-3 items-start", children: c.map((v) => {
        const y = l?.isActive && l.currentTierId === v.id, w = u === "annual" && v.priceAnnual ? v.priceAnnual : v.priceMonthly, k = v.isPopular, _ = v.inventoryQuantity != null, x = _ ? Math.max(0, (v.inventoryQuantity ?? 0) - (v.inventorySold ?? 0)) : null, S = _ && x === 0, I = _ && x != null && x > 0 && x <= 5, [R, ...E] = v.features;
        return /* @__PURE__ */ p(
          "div",
          {
            className: B(
              "relative flex flex-col rounded-2xl border p-6 transition-shadow",
              k ? "border-neutral-900 bg-neutral-900 text-white shadow-xl dark:border-white dark:bg-white dark:text-neutral-900" : "border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
            ),
            children: [
              k && o && /* @__PURE__ */ s("div", { className: "absolute -top-3 right-4", children: /* @__PURE__ */ s("span", { className: "rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-white", children: o }) }),
              /* @__PURE__ */ p("div", { className: "mb-6", children: [
                /* @__PURE__ */ s("h3", { className: "text-xl font-bold", children: v.title }),
                v.description && /* @__PURE__ */ s("p", { className: B(
                  "mt-2 text-sm leading-relaxed",
                  k ? "text-neutral-300 dark:text-neutral-600" : "text-neutral-600 dark:text-neutral-400"
                ), children: v.description })
              ] }),
              /* @__PURE__ */ p("div", { className: "mb-6", children: [
                /* @__PURE__ */ s("div", { className: "text-5xl font-bold tracking-tight", children: Ge({ amount: w, currency: v.currency || i.currency }) }),
                /* @__PURE__ */ p("div", { className: B(
                  "mt-2 text-sm",
                  k ? "text-neutral-400 dark:text-neutral-500" : "text-neutral-500 dark:text-neutral-400"
                ), children: [
                  "Per ",
                  u === "annual" ? "year" : "month",
                  ", billed ",
                  u === "annual" ? "annually" : "monthly"
                ] })
              ] }),
              _ && /* @__PURE__ */ s("div", { className: B(
                "mb-3 text-xs font-medium",
                S ? "text-red-600 dark:text-red-400" : I ? k ? "text-amber-300 dark:text-amber-600" : "text-amber-600 dark:text-amber-400" : k ? "text-neutral-400 dark:text-neutral-500" : "text-neutral-500 dark:text-neutral-400"
              ), children: S ? "Sold out" : `${x} remaining` }),
              /* @__PURE__ */ s(
                se,
                {
                  type: "button",
                  className: B(
                    "mb-6 w-full rounded-full py-3 font-medium",
                    k ? "bg-white text-neutral-900 hover:bg-neutral-100 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800" : ""
                  ),
                  variant: k ? "default" : "outline",
                  disabled: y || !g || S,
                  onClick: () => void b(v.id),
                  children: S ? "Sold Out" : y ? "Current Plan" : "Purchase"
                }
              ),
              R && /* @__PURE__ */ s("div", { className: B(
                "mb-4 text-sm font-semibold",
                k ? "" : "text-neutral-900 dark:text-white"
              ), children: R }),
              E.length > 0 && /* @__PURE__ */ s("ul", { className: "space-y-3", children: E.map((P, O) => /* @__PURE__ */ p("li", { className: "flex items-start gap-3", children: [
                /* @__PURE__ */ s(iN, { className: B(
                  "mt-0.5",
                  k ? "text-neutral-400 dark:text-neutral-500" : "text-neutral-500 dark:text-neutral-400"
                ) }),
                /* @__PURE__ */ s("span", { className: B(
                  "text-sm leading-relaxed",
                  k ? "text-neutral-300 dark:text-neutral-600" : "text-neutral-600 dark:text-neutral-400"
                ), children: P })
              ] }, O)) })
            ]
          },
          v.id
        );
      }) })
    ),
    a && /* @__PURE__ */ s("div", { className: "mt-12 text-center", children: /* @__PURE__ */ s("p", { className: "text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed max-w-2xl mx-auto", children: a }) })
  ] }) });
}
function lN(e) {
  const { processCartCheckout: t } = Na();
  return m.useMemo(() => ({
    ...e,
    async createCheckoutSession(n) {
      const { customer: r, options: o } = n, a = r.shippingAddress ? r.shippingAddress : void 0, i = r.billingAddress ? r.billingAddress : void 0, c = await t(
        n.cart,
        o.successUrl,
        o.cancelUrl,
        o.metadata,
        r.email,
        o.discountCode,
        r.name,
        r.phone,
        a,
        i,
        o.tipAmount,
        o.shippingMethodId,
        o.paymentMethodId
      );
      if (!c.success)
        throw new Error(c.error || "Checkout failed");
      return { kind: "redirect", url: n.options.successUrl ?? "/" };
    },
    async resolveCheckoutReturn({ query: n }) {
      return $a(n);
    }
  }), [e, t]);
}
const HN = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  Accordion: Of,
  AccordionContent: Pr,
  AccordionItem: Er,
  AccordionTrigger: Ar,
  AddressForm: Sa,
  Badge: Tn,
  Breadcrumbs: Ci,
  Button: se,
  Card: Lt,
  CardContent: Qt,
  CardDescription: Pd,
  CardFooter: Id,
  CardHeader: Rr,
  CardTitle: Or,
  CartLineItem: Ei,
  CartPageContent: dp,
  CartPanel: ip,
  CartProvider: th,
  CartSidebar: jr,
  CartSummary: Ai,
  CartTemplate: eN,
  CategoryNav: ka,
  CategoryTemplate: KC,
  CedrosShopProvider: Rm,
  CheckoutCancelPage: VC,
  CheckoutForm: pp,
  CheckoutLayout: up,
  CheckoutProvider: sd,
  CheckoutReceipt: ks,
  CheckoutSuccessPage: UC,
  CheckoutTemplate: tN,
  Dialog: ii,
  DialogClose: Xk,
  DialogContent: ls,
  DialogDescription: di,
  DialogFooter: df,
  DialogHeader: li,
  DialogOverlay: ci,
  DialogPortal: lf,
  DialogTitle: ds,
  DialogTrigger: Jk,
  EmptyState: or,
  ErrorBoundary: OS,
  ErrorState: Yt,
  FAQItem: op,
  FAQList: TC,
  FilterPanel: $o,
  Input: Ze,
  InventoryVerificationDialog: mp,
  Label: lt,
  OrderCard: yp,
  OrderDetails: bp,
  OrderList: vp,
  OrderReview: gp,
  PaymentStep: hp,
  Price: xs,
  ProductCard: sp,
  ProductGallery: xi,
  ProductGrid: _s,
  ProductTemplate: XC,
  PromoCodeInput: Pi,
  PurchaseHistoryTemplate: nN,
  QuantitySelector: ki,
  QuickViewDialog: Si,
  ReceiptTemplate: aN,
  SearchInput: Ni,
  Select: Oo,
  SelectContent: $r,
  SelectGroup: Ok,
  SelectItem: zr,
  SelectTrigger: Dr,
  SelectValue: Mo,
  Separator: St,
  Sheet: us,
  SheetClose: uf,
  SheetContent: Zr,
  SheetDescription: pf,
  SheetHeader: ps,
  SheetOverlay: ui,
  SheetPortal: ff,
  SheetTitle: ms,
  SheetTrigger: fs,
  ShippingMethodSelector: fp,
  ShopChatPanel: lp,
  ShopTemplate: YC,
  Skeleton: Fe,
  SubscriptionTemplate: cN,
  Tabs: bi,
  TabsContent: Xf,
  TabsList: bs,
  TabsTrigger: Fr,
  ToastProvider: lC,
  VariantSelector: _i,
  createMockCommerceAdapter: $m,
  createPaywallCommerceAdapter: qm,
  parseCheckoutReturn: $a,
  readCatalogUrlState: Fa,
  useAIRelatedProducts: fd,
  useCart: zt,
  useCartInventory: Ba,
  useCatalogUrlSync: ja,
  useCategories: Da,
  useCedrosPayCheckoutAdapter: lN,
  useCedrosShop: Le,
  useCheckout: qo,
  useCheckoutResultFromUrl: za,
  useHoldExpiry: Zb,
  useInventoryVerification: dd,
  useOptionalToast: ws,
  useOrders: id,
  usePaymentMethodsConfig: ud,
  useProduct: ad,
  useProducts: Go,
  useShippingMethods: ld,
  useStandaloneCheckout: $b,
  useStorefrontSettings: cr,
  useSubscriptionData: cd,
  useToast: cC,
  validateCommerceAdapterContract: Kb
}, Symbol.toStringTag, { value: "Module" }));
export {
  ee as $,
  kN as A,
  SN as B,
  ON as C,
  Vr as D,
  Wr as E,
  sn as F,
  CN as G,
  NN as H,
  BN as I,
  UN as J,
  VN as K,
  jp as L,
  Bp as M,
  IN as N,
  Up as O,
  Zp as P,
  TN as Q,
  AN as R,
  yl as S,
  ar as T,
  RN as U,
  HN as V,
  rm as W,
  om as X,
  sm as Y,
  am as Z,
  cm as _,
  MN as a,
  Bo as a0,
  Uo as a1,
  Wt as a2,
  ea as a3,
  Fo as a4,
  Br as a5,
  Mp as a6,
  po as a7,
  vl as b,
  LN as c,
  Hp as d,
  DN as e,
  $N as f,
  zN as g,
  FN as h,
  jN as i,
  Vp as j,
  jo as k,
  bm as l,
  wm as m,
  xm as n,
  bN as o,
  vN as p,
  wN as q,
  EN as r,
  xN as s,
  $p as t,
  Na as u,
  zp as v,
  PN as w,
  zn as x,
  Ur as y,
  _N as z
};
