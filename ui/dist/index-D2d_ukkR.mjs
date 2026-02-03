import { jsxs as d, jsx as o, Fragment as Oe } from "react/jsx-runtime";
import * as y from "react";
import U, { useState as H, useCallback as J, useMemo as Te, useRef as gt, useEffect as ge, lazy as Cp, useLayoutEffect as Np } from "react";
import { ConnectionProvider as Ap, WalletProvider as Tp, useWallet as Eo } from "@solana/wallet-adapter-react";
import { u as ml, c as pl, n as Io, o as fl, e as Ro, g as Ar, h as Oo, i as Xn, q as Mo, P as Pp, S as Ep, l as Ip, r as Rp, s as Op, t as Ls, v as wa, w as Mp } from "./styles-QcAsIVWl.mjs";
import { a as nr, u as Dn, g as Ne, S as io, h as $s, i as zs, j as Dp, f as cn } from "./CedrosContext-DUT3cLZg.mjs";
import { clusterApiUrl as Lp, PublicKey as $p } from "@solana/web3.js";
import { WalletReadyState as Fs } from "@solana/wallet-adapter-base";
import { WalletIcon as zp } from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-wallets";
import * as Do from "react-dom";
import hl from "react-dom";
function Fp(e) {
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
function Bp(e) {
  try {
    const t = new URL(e);
    return `${t.protocol}//${t.host}`;
  } catch {
    return e;
  }
}
function jp(e = {}) {
  const {
    solanaCluster: t = "mainnet-beta",
    solanaEndpoint: n,
    customRpcProviders: r = [],
    allowUnsafeScripts: a = !1,
    additionalScriptSrc: i = [],
    additionalConnectSrc: s = [],
    additionalFrameSrc: c = [],
    includeStripe: l = !0
  } = e;
  a && console.warn(
    "[CedrosPay] SECURITY WARNING: allowUnsafeScripts is enabled. This adds 'unsafe-inline' and 'unsafe-eval' to script-src, which significantly weakens CSP protection against XSS attacks. Only use this in development or if absolutely required by your framework."
  );
  const u = ["'self'"];
  a && u.push("'unsafe-inline'", "'unsafe-eval'"), l && u.push("https://js.stripe.com"), u.push(...i);
  const p = ["'self'"];
  l && p.push("https://api.stripe.com", "https://*.stripe.com");
  const m = Fp(t);
  if (p.push(m), n) {
    const g = Bp(n);
    p.includes(g) || p.push(g);
  }
  r.forEach((g) => {
    p.includes(g) || p.push(g);
  }), p.push(...s);
  const h = ["'self'"];
  return l && h.push("https://js.stripe.com", "https://checkout.stripe.com"), h.push(...c), {
    scriptSrc: u,
    connectSrc: p,
    frameSrc: h
  };
}
function Up(e, t = "header") {
  const { scriptSrc: n, connectSrc: r, frameSrc: a } = e;
  switch (t) {
    case "header":
    case "meta":
    case "nextjs":
    case "nginx": {
      const i = [];
      return n.length > 0 && i.push(`script-src ${n.join(" ")}`), r.length > 0 && i.push(`connect-src ${r.join(" ")}`), a.length > 0 && i.push(`frame-src ${a.join(" ")}`), i.join("; ");
    }
    case "helmet": {
      const i = {};
      return n.length > 0 && (i.scriptSrc = n), r.length > 0 && (i.connectSrc = r), a.length > 0 && (i.frameSrc = a), i;
    }
    case "directives":
      return { scriptSrc: n, connectSrc: r, frameSrc: a };
    default:
      throw new Error(`Unknown CSP format: ${t}`);
  }
}
function CN(e = {}, t = "header") {
  const n = jp(e);
  return Up(n, t);
}
const NN = {
  HELIUS: "https://*.helius-rpc.com",
  QUICKNODE: "https://*.quicknode.pro",
  ALCHEMY: "https://*.alchemy.com",
  ANKR: "https://rpc.ankr.com",
  TRITON: "https://*.rpcpool.com"
}, AN = {
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
    solanaCluster: "mainnet-beta",
    includeStripe: !0,
    // Don't include Solana RPC endpoints
    customRpcProviders: []
  })
};
function kr(e) {
  return new Date(e).toLocaleString();
}
const Wp = ({
  resource: e,
  items: t,
  label: n,
  cardLabel: r,
  cryptoLabel: a,
  creditsLabel: i,
  showCard: s = !0,
  showCrypto: c = !0,
  showCredits: l = !1,
  onPaymentAttempt: u,
  onPaymentSuccess: p,
  onPaymentError: m,
  onStripeSuccess: h,
  onCryptoSuccess: g,
  onCreditsSuccess: v,
  onStripeError: f,
  onCryptoError: b,
  onCreditsError: k,
  customerEmail: w,
  successUrl: _,
  cancelUrl: x,
  metadata: N,
  couponCode: I,
  authToken: S,
  autoDetectWallets: A = !0,
  testPageUrl: W,
  hideMessages: C = !1,
  renderModal: T
}) => {
  const P = nr(), [L, F] = H(!1), { status: $, processPayment: M, processCartCheckout: D } = ml(), { isCartMode: O, effectiveResource: V } = pl(e, t), { t: E } = Io(), q = n || E("ui.purchase"), re = r || E("ui.card"), j = a || E("ui.usdc_solana"), X = i || E("ui.pay_with_credits") || "Pay with Credits", te = J(async () => {
    if (A && s) {
      const { detectSolanaWallets: G } = await Promise.resolve().then(() => VC);
      if (!G()) {
        const oe = O ? void 0 : V, de = O && t ? fl(t) : void 0;
        Ro("stripe", oe, de), u && u("stripe"), Ar("stripe", oe, de);
        let he;
        O && t ? he = await D(
          t,
          _,
          x,
          N,
          w,
          I
        ) : V && (he = await M(
          V,
          _,
          x,
          N,
          w,
          I
        )), he && he.success && he.transactionId ? (Oo("stripe", he.transactionId, oe, de), h ? h(he.transactionId) : p && p(he.transactionId)) : he && !he.success && he.error && (Xn("stripe", he.error, oe, de), f ? f(he.error) : m && m(he.error));
        return;
      }
    }
    F(!0);
  }, [A, s, O, t, V, D, M, _, x, N, w, I, p, m, h, f, u]), ve = Te(() => O && t ? `purchase-cart-${t.map((G) => G.resource).join("-")}` : `purchase-${V || "unknown"}`, [O, t, V]), B = Te(
    () => Mo(ve, te),
    [ve, te]
  ), ee = $ === "loading", fe = {
    isOpen: L,
    onClose: () => F(!1),
    resource: O ? void 0 : V,
    items: O ? t : void 0,
    cardLabel: re,
    cryptoLabel: j,
    creditsLabel: X,
    showCard: s,
    showCrypto: c,
    showCredits: l,
    onPaymentAttempt: u,
    onPaymentSuccess: (G) => {
      F(!1), p?.(G);
    },
    onPaymentError: (G) => {
      F(!1), m?.(G);
    },
    onStripeSuccess: (G) => {
      F(!1), h?.(G);
    },
    onCryptoSuccess: (G) => {
      F(!1), g?.(G);
    },
    onCreditsSuccess: (G) => {
      F(!1), v?.(G);
    },
    onStripeError: (G) => {
      F(!1), f?.(G);
    },
    onCryptoError: (G) => {
      F(!1), b?.(G);
    },
    onCreditsError: (G) => {
      F(!1), k?.(G);
    },
    customerEmail: w,
    successUrl: _,
    cancelUrl: x,
    metadata: N,
    couponCode: I,
    authToken: S,
    testPageUrl: W,
    hideMessages: C
  };
  return /* @__PURE__ */ d("div", { className: P.unstyled ? "" : P.className, style: P.unstyled ? {} : P.style, children: [
    /* @__PURE__ */ o(
      "button",
      {
        onClick: B,
        disabled: ee,
        className: P.unstyled ? "" : "cedros-theme__button cedros-theme__stripe",
        style: {
          width: "100%",
          cursor: ee ? "not-allowed" : "pointer",
          opacity: ee ? 0.6 : 1
        },
        type: "button",
        children: ee ? E("ui.processing") : q
      }
    ),
    T ? T(fe) : /* @__PURE__ */ o(Pp, { ...fe })
  ] });
};
function TN(e) {
  const { resource: t, items: n, checkout: r = {}, display: a = {}, callbacks: i = {}, advanced: s = {} } = e, { config: c, walletPool: l } = Dn(), u = nr(), { isCartMode: p } = pl(t, n), m = U.useMemo(() => ({
    marginTop: "0.5rem",
    fontSize: "0.875rem",
    color: u.tokens.surfaceText,
    opacity: 0.7,
    textAlign: "center"
  }), [u.tokens.surfaceText]), h = U.useMemo(
    () => s.wallets && s.wallets.length > 0 ? s.wallets : l.getAdapters(),
    [s.wallets, l]
  ), g = U.useMemo(
    () => n ? fl(n) : 0,
    [n]
  ), v = U.useMemo(
    () => i.onPaymentSuccess ? (L) => i.onPaymentSuccess({ transactionId: L, method: "stripe" }) : void 0,
    [i.onPaymentSuccess]
  ), f = U.useMemo(
    () => i.onPaymentSuccess ? (L) => i.onPaymentSuccess({ transactionId: L, method: "crypto" }) : void 0,
    [i.onPaymentSuccess]
  ), b = U.useMemo(
    () => i.onPaymentError ? (L) => i.onPaymentError({ message: L, method: "stripe" }) : void 0,
    [i.onPaymentError]
  ), k = U.useMemo(
    () => i.onPaymentError ? (L) => i.onPaymentError({ message: L, method: "crypto" }) : void 0,
    [i.onPaymentError]
  ), w = U.useMemo(
    () => i.onPaymentSuccess ? (L) => i.onPaymentSuccess({ transactionId: L, method: "credits" }) : void 0,
    [i.onPaymentSuccess]
  ), _ = U.useMemo(
    () => i.onPaymentError ? (L) => i.onPaymentError({ message: L, method: "credits" }) : void 0,
    [i.onPaymentError]
  ), x = U.useMemo(
    () => i.onPaymentAttempt ? () => i.onPaymentAttempt("credits") : void 0,
    [i.onPaymentAttempt]
  ), N = c.solanaEndpoint ?? Lp(c.solanaCluster);
  if (!t && (!n || n.length === 0))
    return Ne().error('CedrosPay: Must provide either "resource" or "items" prop'), /* @__PURE__ */ o("div", { className: a.className, style: { color: u.tokens.errorText }, children: "Configuration error: No resource or items provided" });
  const I = a.showCard ?? !0, S = a.showCrypto ?? !0, A = a.showCredits ?? !1, W = a.showPurchaseButton ?? !1, C = a.layout ?? "vertical", T = a.hideMessages ?? !1, P = s.autoDetectWallets ?? !0;
  return /* @__PURE__ */ o("div", { className: u.unstyled ? a.className : u.className, style: u.unstyled ? {} : u.style, children: /* @__PURE__ */ o(Ap, { endpoint: N, children: /* @__PURE__ */ o(Tp, { wallets: h, autoConnect: !1, children: /* @__PURE__ */ o("div", { className: u.unstyled ? a.className : `cedros-theme__pay ${a.className || ""}`, children: /* @__PURE__ */ d("div", { className: u.unstyled ? "" : `cedros-theme__pay-content cedros-theme__pay-content--${C}`, children: [
    W ? /* @__PURE__ */ o(
      Wp,
      {
        resource: p ? void 0 : t || n?.[0]?.resource,
        items: p ? n : void 0,
        label: a.purchaseLabel,
        cardLabel: a.cardLabel,
        cryptoLabel: a.cryptoLabel,
        showCard: I,
        showCrypto: S,
        onPaymentAttempt: i.onPaymentAttempt,
        onPaymentSuccess: v,
        onPaymentError: b,
        onStripeSuccess: v,
        onCryptoSuccess: f,
        onStripeError: b,
        onCryptoError: k,
        customerEmail: r.customerEmail,
        successUrl: r.successUrl,
        cancelUrl: r.cancelUrl,
        metadata: r.metadata,
        couponCode: r.couponCode,
        autoDetectWallets: P,
        testPageUrl: s.testPageUrl,
        hideMessages: T,
        renderModal: a.renderModal
      }
    ) : /* @__PURE__ */ d(Oe, { children: [
      I && /* @__PURE__ */ o(
        Ep,
        {
          resource: p ? void 0 : t || n?.[0]?.resource,
          items: p ? n : void 0,
          customerEmail: r.customerEmail,
          successUrl: r.successUrl,
          cancelUrl: r.cancelUrl,
          metadata: r.metadata,
          couponCode: r.couponCode,
          label: a.cardLabel,
          onAttempt: i.onPaymentAttempt,
          onSuccess: v,
          onError: b
        }
      ),
      S && /* @__PURE__ */ o(
        Ip,
        {
          resource: p ? void 0 : t || n?.[0]?.resource,
          items: p ? n : void 0,
          metadata: r.metadata,
          couponCode: r.couponCode,
          label: a.cryptoLabel,
          onAttempt: i.onPaymentAttempt,
          onSuccess: f,
          onError: k,
          testPageUrl: s.testPageUrl,
          hideMessages: T
        }
      ),
      A && /* @__PURE__ */ o(
        Rp,
        {
          resource: p ? void 0 : t || n?.[0]?.resource,
          items: p ? n : void 0,
          authToken: r.authToken,
          metadata: r.metadata,
          couponCode: r.couponCode,
          label: a.creditsLabel,
          onAttempt: x,
          onSuccess: w,
          onError: _
        }
      )
    ] }),
    p && n && n.length > 1 && !T && /* @__PURE__ */ d("div", { style: m, children: [
      "Checking out ",
      g,
      " items"
    ] })
  ] }) }) }) }) });
}
const Y = {
  products: /* @__PURE__ */ d("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ o("path", { d: "M20 7.5v9l-4 2.25M4 7.5v9l4 2.25" }),
    /* @__PURE__ */ o("path", { d: "m20 7.5-8-4.5-8 4.5" }),
    /* @__PURE__ */ o("path", { d: "m12 12 8-4.5M12 12v9.5M12 12 4 7.5" })
  ] }),
  transactions: /* @__PURE__ */ o("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ o("path", { d: "M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" }) }),
  coupons: /* @__PURE__ */ d("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ o("path", { d: "M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" }),
    /* @__PURE__ */ o("path", { d: "M13 5v2M13 17v2M13 11v2" })
  ] }),
  refunds: /* @__PURE__ */ d("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ o("path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" }),
    /* @__PURE__ */ o("path", { d: "M3 3v5h5" }),
    /* @__PURE__ */ o("path", { d: "M12 7v5l4 2" })
  ] }),
  settings: /* @__PURE__ */ d("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ o("path", { d: "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" }),
    /* @__PURE__ */ o("circle", { cx: "12", cy: "12", r: "3" })
  ] }),
  wallet: /* @__PURE__ */ d("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ o("path", { d: "M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" }),
    /* @__PURE__ */ o("path", { d: "M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" })
  ] }),
  chevronRight: /* @__PURE__ */ o("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ o("path", { d: "m9 18 6-6-6-6" }) }),
  loading: /* @__PURE__ */ o("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "cedros-admin__spinner", children: /* @__PURE__ */ o("path", { d: "M21 12a9 9 0 1 1-6.219-8.56" }) }),
  refresh: /* @__PURE__ */ d("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ o("path", { d: "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" }),
    /* @__PURE__ */ o("path", { d: "M21 3v5h-5" }),
    /* @__PURE__ */ o("path", { d: "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" }),
    /* @__PURE__ */ o("path", { d: "M8 16H3v5" })
  ] }),
  check: /* @__PURE__ */ o("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ o("path", { d: "M20 6 9 17l-5-5" }) }),
  subscriptions: /* @__PURE__ */ d("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ o("path", { d: "M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" }),
    /* @__PURE__ */ o("circle", { cx: "12", cy: "12", r: "3" }),
    /* @__PURE__ */ o("path", { d: "M12 2v2M12 20v2M2 12H4M20 12h2" })
  ] }),
  trash: /* @__PURE__ */ o("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ o("path", { d: "M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" }) }),
  plus: /* @__PURE__ */ o("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ o("path", { d: "M12 5v14M5 12h14" }) }),
  chevronDown: /* @__PURE__ */ o("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ o("path", { d: "m6 9 6 6 6-6" }) }),
  chevronUp: /* @__PURE__ */ o("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ o("path", { d: "m18 15-6-6-6 6" }) }),
  storefront: /* @__PURE__ */ d("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ o("path", { d: "M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" }),
    /* @__PURE__ */ o("path", { d: "m3 9 2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9" }),
    /* @__PURE__ */ o("path", { d: "M12 3v6" })
  ] }),
  arrowUp: /* @__PURE__ */ d("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ o("path", { d: "m5 12 7-7 7 7" }),
    /* @__PURE__ */ o("path", { d: "M12 19V5" })
  ] }),
  arrowDown: /* @__PURE__ */ d("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ o("path", { d: "m5 12 7 7 7-7" }),
    /* @__PURE__ */ o("path", { d: "M12 5v14" })
  ] }),
  delete: /* @__PURE__ */ d("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ o("path", { d: "M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" }),
    /* @__PURE__ */ o("path", { d: "M10 11v6M14 11v6" })
  ] }),
  close: /* @__PURE__ */ o("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ o("path", { d: "M18 6 6 18M6 6l12 12" }) }),
  edit: /* @__PURE__ */ d("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ o("path", { d: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" }),
    /* @__PURE__ */ o("path", { d: "M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" })
  ] }),
  faq: /* @__PURE__ */ d("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ o("circle", { cx: "12", cy: "12", r: "10" }),
    /* @__PURE__ */ o("path", { d: "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" }),
    /* @__PURE__ */ o("path", { d: "M12 17h.01" })
  ] }),
  chat: /* @__PURE__ */ o("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ o("path", { d: "m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z" }) }),
  globe: /* @__PURE__ */ d("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ o("circle", { cx: "12", cy: "12", r: "10" }),
    /* @__PURE__ */ o("path", { d: "M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" }),
    /* @__PURE__ */ o("path", { d: "M2 12h20" })
  ] }),
  ai: /* @__PURE__ */ d("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ o("path", { d: "M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4Z" }),
    /* @__PURE__ */ o("path", { d: "M10 10v.5" }),
    /* @__PURE__ */ o("path", { d: "M14 10v.5" }),
    /* @__PURE__ */ o("path", { d: "M12 14v2" }),
    /* @__PURE__ */ o("path", { d: "M8 18h8" }),
    /* @__PURE__ */ o("path", { d: "M6 18a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2" }),
    /* @__PURE__ */ o("path", { d: "M6 12v6" }),
    /* @__PURE__ */ o("path", { d: "M18 12v6" })
  ] }),
  notifications: /* @__PURE__ */ d("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ o("path", { d: "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" }),
    /* @__PURE__ */ o("path", { d: "M10.3 21a1.94 1.94 0 0 0 3.4 0" })
  ] }),
  eye: /* @__PURE__ */ d("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ o("path", { d: "M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" }),
    /* @__PURE__ */ o("circle", { cx: "12", cy: "12", r: "3" })
  ] }),
  eyeOff: /* @__PURE__ */ d("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ o("path", { d: "M9.88 9.88a3 3 0 1 0 4.24 4.24" }),
    /* @__PURE__ */ o("path", { d: "M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" }),
    /* @__PURE__ */ o("path", { d: "M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" }),
    /* @__PURE__ */ o("line", { x1: "2", x2: "22", y1: "2", y2: "22" })
  ] }),
  creditCard: /* @__PURE__ */ d("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ o("rect", { width: "20", height: "14", x: "2", y: "5", rx: "2" }),
    /* @__PURE__ */ o("line", { x1: "2", x2: "22", y1: "10", y2: "10" })
  ] }),
  mail: /* @__PURE__ */ d("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ o("rect", { width: "20", height: "16", x: "2", y: "4", rx: "2" }),
    /* @__PURE__ */ o("path", { d: "m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" })
  ] }),
  server: /* @__PURE__ */ d("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ o("rect", { width: "20", height: "8", x: "2", y: "2", rx: "2", ry: "2" }),
    /* @__PURE__ */ o("rect", { width: "20", height: "8", x: "2", y: "14", rx: "2", ry: "2" }),
    /* @__PURE__ */ o("line", { x1: "6", x2: "6.01", y1: "6", y2: "6" }),
    /* @__PURE__ */ o("line", { x1: "6", x2: "6.01", y1: "18", y2: "18" })
  ] }),
  calendarRepeat: /* @__PURE__ */ d("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ o("rect", { width: "18", height: "18", x: "3", y: "4", rx: "2", ry: "2" }),
    /* @__PURE__ */ o("line", { x1: "16", x2: "16", y1: "2", y2: "6" }),
    /* @__PURE__ */ o("line", { x1: "8", x2: "8", y1: "2", y2: "6" }),
    /* @__PURE__ */ o("line", { x1: "3", x2: "21", y1: "10", y2: "10" }),
    /* @__PURE__ */ o("path", { d: "M11 14h1.5a1.5 1.5 0 0 1 0 3H11v2" }),
    /* @__PURE__ */ o("path", { d: "M16 14v3a1 1 0 0 0 1 1h1" })
  ] }),
  brain: /* @__PURE__ */ d("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ o("path", { d: "M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" }),
    /* @__PURE__ */ o("path", { d: "M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" }),
    /* @__PURE__ */ o("path", { d: "M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" }),
    /* @__PURE__ */ o("path", { d: "M17.599 6.5a3 3 0 0 0 .399-1.375" }),
    /* @__PURE__ */ o("path", { d: "M6.003 5.125A3 3 0 0 0 6.401 6.5" }),
    /* @__PURE__ */ o("path", { d: "M3.477 10.896a4 4 0 0 1 .585-.396" }),
    /* @__PURE__ */ o("path", { d: "M19.938 10.5a4 4 0 0 1 .585.396" }),
    /* @__PURE__ */ o("path", { d: "M6 18a4 4 0 0 1-1.967-.516" }),
    /* @__PURE__ */ o("path", { d: "M19.967 17.484A4 4 0 0 1 18 18" })
  ] })
};
function rr({ stats: e, isLoading: t = !1, onRefresh: n }) {
  return /* @__PURE__ */ d("div", { className: "cedros-admin__stats-bar", children: [
    /* @__PURE__ */ o("div", { className: "cedros-admin__stats-bar-grid", children: e.map((r, a) => /* @__PURE__ */ d("div", { className: "cedros-admin__stats-bar-item", children: [
      /* @__PURE__ */ o("span", { className: "cedros-admin__stats-bar-label", children: r.label }),
      /* @__PURE__ */ o("span", { className: `cedros-admin__stats-bar-value ${r.variant ? `cedros-admin__stats-bar-value--${r.variant}` : ""}`, children: t ? /* @__PURE__ */ o("span", { className: "cedros-admin__skeleton cedros-admin__skeleton--value" }) : r.value }),
      r.description && /* @__PURE__ */ o("span", { className: "cedros-admin__stats-bar-desc", children: r.description })
    ] }, a)) }),
    n && /* @__PURE__ */ o(
      "button",
      {
        type: "button",
        className: "cedros-admin__stats-bar-refresh",
        onClick: n,
        disabled: t,
        title: "Refresh stats",
        children: t ? Y.loading : Y.refresh
      }
    )
  ] });
}
function Vp({
  serverUrl: e,
  productId: t,
  apiKey: n,
  authManager: r
}) {
  const [a, i] = H(null), [s, c] = H(!1), [l, u] = H(!1), [p, m] = H(null), h = J(async () => {
    if (t) {
      c(!0), m(null);
      try {
        let f;
        if (r?.isAuthenticated())
          f = await r.fetchWithAuth(
            `/admin/products/${t}/variations`
          );
        else {
          const b = { "Content-Type": "application/json" };
          n && (b["X-API-Key"] = n);
          const k = await fetch(`${e}/admin/products/${t}/variations`, {
            headers: b
          });
          if (!k.ok)
            throw new Error(`Failed to fetch variations: ${k.status}`);
          f = await k.json();
        }
        f.variationConfig || (f.variationConfig = { variationTypes: [] }), f.variants || (f.variants = []), i(f);
      } catch (f) {
        const b = f instanceof Error ? f.message : "Failed to fetch variations";
        m(b), i({
          productId: t,
          variationConfig: { variationTypes: [] },
          variants: []
        });
      } finally {
        c(!1);
      }
    }
  }, [e, t, n, r]), g = J(
    async (f) => {
      if (!t) return null;
      u(!0), m(null);
      try {
        let b;
        if (r?.isAuthenticated())
          b = await r.fetchWithAuth(
            `/admin/products/${t}/variations`,
            {
              method: "PUT",
              body: JSON.stringify(f)
            }
          );
        else {
          const k = { "Content-Type": "application/json" };
          n && (k["X-API-Key"] = n);
          const w = await fetch(`${e}/admin/products/${t}/variations`, {
            method: "PUT",
            headers: k,
            body: JSON.stringify(f)
          });
          if (!w.ok)
            throw new Error(`Failed to save variations: ${w.status}`);
          b = await w.json();
        }
        return i({
          productId: t,
          variationConfig: b.variationConfig,
          variants: b.variants
        }), { variantsCreated: b.variantsCreated };
      } catch (b) {
        const k = b instanceof Error ? b.message : "Failed to save variations";
        return m(k), null;
      } finally {
        u(!1);
      }
    },
    [e, t, n, r]
  ), v = J(
    async (f) => {
      if (!t || f.length === 0) return !1;
      u(!0), m(null);
      try {
        if (r?.isAuthenticated())
          await r.fetchWithAuth(
            `/admin/products/${t}/variants/inventory`,
            {
              method: "PUT",
              body: JSON.stringify({ updates: f })
            }
          );
        else {
          const b = { "Content-Type": "application/json" };
          n && (b["X-API-Key"] = n);
          const k = await fetch(`${e}/admin/products/${t}/variants/inventory`, {
            method: "PUT",
            headers: b,
            body: JSON.stringify({ updates: f })
          });
          if (!k.ok)
            throw new Error(`Failed to update inventory: ${k.status}`);
        }
        if (a) {
          const b = new Map(f.map((k) => [k.variantId, k]));
          i({
            ...a,
            variants: a.variants.map((k) => {
              const w = b.get(k.id);
              return w ? {
                ...k,
                inventoryQuantity: w.inventoryQuantity,
                inventoryStatus: w.inventoryStatus ?? k.inventoryStatus
              } : k;
            })
          });
        }
        return !0;
      } catch (b) {
        const k = b instanceof Error ? b.message : "Failed to update inventory";
        return m(k), !1;
      } finally {
        u(!1);
      }
    },
    [e, t, n, r, a]
  );
  return {
    data: a,
    isLoading: s,
    error: p,
    fetch: h,
    save: g,
    bulkUpdateInventory: v,
    isSaving: l
  };
}
function Bs() {
  return `var_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
function Hp({
  value: e,
  onChange: t,
  maxTypes: n = 5,
  maxValuesPerType: r = 20,
  disabled: a = !1
}) {
  const [i, s] = H(null), [c, l] = H(""), [u, p] = H({}), m = e.variationTypes, h = J(() => {
    if (!c.trim() || m.length >= n) return;
    const _ = {
      id: Bs(),
      name: c.trim(),
      displayOrder: m.length,
      values: []
    };
    t({
      variationTypes: [...m, _]
    }), l(""), s(_.id);
  }, [c, m, n, t]), g = J(
    (_) => {
      t({
        variationTypes: m.filter((x) => x.id !== _).map((x, N) => ({ ...x, displayOrder: N }))
      }), i === _ && s(null);
    },
    [m, t, i]
  ), v = J(
    (_, x) => {
      t({
        variationTypes: m.map(
          (N) => N.id === _ ? { ...N, name: x } : N
        )
      });
    },
    [m, t]
  ), f = J(
    (_, x) => {
      const N = m.findIndex((A) => A.id === _);
      if (N === -1 || x === "up" && N === 0 || x === "down" && N === m.length - 1) return;
      const I = [...m], S = x === "up" ? N - 1 : N + 1;
      [I[N], I[S]] = [I[S], I[N]], t({
        variationTypes: I.map((A, W) => ({ ...A, displayOrder: W }))
      });
    },
    [m, t]
  ), b = J(
    (_) => {
      const x = (u[_] || "").trim();
      if (!x) return;
      const N = m.find((S) => S.id === _);
      if (!N || N.values.length >= r) return;
      const I = {
        id: Bs(),
        label: x
      };
      t({
        variationTypes: m.map(
          (S) => S.id === _ ? { ...S, values: [...S.values, I] } : S
        )
      }), p((S) => ({ ...S, [_]: "" }));
    },
    [m, u, r, t]
  ), k = J(
    (_, x) => {
      t({
        variationTypes: m.map(
          (N) => N.id === _ ? { ...N, values: N.values.filter((I) => I.id !== x) } : N
        )
      });
    },
    [m, t]
  ), w = J(
    (_, x, N) => {
      t({
        variationTypes: m.map(
          (I) => I.id === _ ? {
            ...I,
            values: I.values.map(
              (S) => S.id === x ? { ...S, label: N } : S
            )
          } : I
        )
      });
    },
    [m, t]
  );
  return /* @__PURE__ */ d("div", { className: "cedros-admin__variation-editor", children: [
    /* @__PURE__ */ d("div", { className: "cedros-admin__variation-editor-header", children: [
      /* @__PURE__ */ o("h4", { className: "cedros-admin__field-label", style: { marginBottom: 0 }, children: "Variation Types" }),
      /* @__PURE__ */ d("span", { style: { fontSize: 12, opacity: 0.7 }, children: [
        m.length,
        "/",
        n,
        " types"
      ] })
    ] }),
    m.length === 0 ? /* @__PURE__ */ o("div", { className: "cedros-admin__variation-empty", children: 'No variation types defined. Add types like "Size" or "Color" to create product variants.' }) : /* @__PURE__ */ o("div", { className: "cedros-admin__variation-type-list", children: m.map((_, x) => /* @__PURE__ */ d("div", { className: "cedros-admin__variation-type-item", children: [
      /* @__PURE__ */ d("div", { className: "cedros-admin__variation-type-header", children: [
        /* @__PURE__ */ d("div", { className: "cedros-admin__variation-type-controls", children: [
          /* @__PURE__ */ o(
            "button",
            {
              type: "button",
              className: "cedros-admin__button cedros-admin__button--ghost cedros-admin__button--icon",
              onClick: () => f(_.id, "up"),
              disabled: a || x === 0,
              title: "Move up",
              children: Y.arrowUp
            }
          ),
          /* @__PURE__ */ o(
            "button",
            {
              type: "button",
              className: "cedros-admin__button cedros-admin__button--ghost cedros-admin__button--icon",
              onClick: () => f(_.id, "down"),
              disabled: a || x === m.length - 1,
              title: "Move down",
              children: Y.arrowDown
            }
          )
        ] }),
        /* @__PURE__ */ o(
          "input",
          {
            type: "text",
            className: "cedros-admin__input cedros-admin__variation-type-name",
            value: _.name,
            onChange: (N) => v(_.id, N.target.value),
            disabled: a,
            placeholder: "Type name"
          }
        ),
        /* @__PURE__ */ d("span", { className: "cedros-admin__variation-value-count", children: [
          _.values.length,
          " values"
        ] }),
        /* @__PURE__ */ o(
          "button",
          {
            type: "button",
            className: "cedros-admin__button cedros-admin__button--ghost",
            onClick: () => s(
              i === _.id ? null : _.id
            ),
            children: i === _.id ? "Collapse" : "Edit values"
          }
        ),
        /* @__PURE__ */ o(
          "button",
          {
            type: "button",
            className: "cedros-admin__button cedros-admin__button--ghost cedros-admin__button--danger",
            onClick: () => g(_.id),
            disabled: a,
            title: "Remove type",
            children: Y.delete
          }
        )
      ] }),
      i === _.id && /* @__PURE__ */ d("div", { className: "cedros-admin__variation-values", children: [
        /* @__PURE__ */ d("div", { className: "cedros-admin__variation-values-header", children: [
          /* @__PURE__ */ d("span", { style: { fontSize: 12, fontWeight: 600 }, children: [
            'Values for "',
            _.name,
            '"'
          ] }),
          /* @__PURE__ */ d("span", { style: { fontSize: 11, opacity: 0.7 }, children: [
            _.values.length,
            "/",
            r
          ] })
        ] }),
        _.values.length === 0 ? /* @__PURE__ */ o("div", { className: "cedros-admin__variation-empty", style: { padding: "8px 0" }, children: 'No values yet. Add values like "Small", "Medium", "Large".' }) : /* @__PURE__ */ o("div", { className: "cedros-admin__variation-value-list", children: _.values.map((N) => /* @__PURE__ */ d("div", { className: "cedros-admin__variation-value-item", children: [
          /* @__PURE__ */ o(
            "input",
            {
              type: "text",
              className: "cedros-admin__input cedros-admin__input--sm",
              value: N.label,
              onChange: (I) => w(_.id, N.id, I.target.value),
              disabled: a
            }
          ),
          /* @__PURE__ */ o(
            "button",
            {
              type: "button",
              className: "cedros-admin__button cedros-admin__button--ghost cedros-admin__button--icon cedros-admin__button--danger",
              onClick: () => k(_.id, N.id),
              disabled: a,
              title: "Remove value",
              children: Y.close
            }
          )
        ] }, N.id)) }),
        _.values.length < r && /* @__PURE__ */ d("div", { className: "cedros-admin__variation-add-value", children: [
          /* @__PURE__ */ o(
            "input",
            {
              type: "text",
              className: "cedros-admin__input cedros-admin__input--sm",
              value: u[_.id] || "",
              onChange: (N) => p((I) => ({
                ...I,
                [_.id]: N.target.value
              })),
              placeholder: "Add value...",
              disabled: a,
              onKeyDown: (N) => {
                N.key === "Enter" && (N.preventDefault(), b(_.id));
              }
            }
          ),
          /* @__PURE__ */ o(
            "button",
            {
              type: "button",
              className: "cedros-admin__button cedros-admin__button--secondary cedros-admin__button--sm",
              onClick: () => b(_.id),
              disabled: a || !u[_.id]?.trim(),
              children: "Add"
            }
          )
        ] })
      ] })
    ] }, _.id)) }),
    m.length < n && /* @__PURE__ */ d("div", { className: "cedros-admin__variation-add-type", children: [
      /* @__PURE__ */ o(
        "input",
        {
          type: "text",
          className: "cedros-admin__input",
          value: c,
          onChange: (_) => l(_.target.value),
          placeholder: "New variation type (e.g., Size, Color)",
          disabled: a,
          onKeyDown: (_) => {
            _.key === "Enter" && (_.preventDefault(), h());
          }
        }
      ),
      /* @__PURE__ */ o(
        "button",
        {
          type: "button",
          className: "cedros-admin__button cedros-admin__button--secondary",
          onClick: h,
          disabled: a || !c.trim(),
          children: "Add Type"
        }
      )
    ] })
  ] });
}
function gl({ value: e, onChange: t, options: n, placeholder: r = "Filter", disabled: a }) {
  const [i, s] = H(!1), c = gt(null), u = n.find((p) => p.value === e)?.label || r;
  return ge(() => {
    const p = (m) => {
      c.current && !c.current.contains(m.target) && s(!1);
    };
    if (i)
      return document.addEventListener("mousedown", p), () => document.removeEventListener("mousedown", p);
  }, [i]), ge(() => {
    const p = (m) => {
      m.key === "Escape" && s(!1);
    };
    if (i)
      return document.addEventListener("keydown", p), () => document.removeEventListener("keydown", p);
  }, [i]), /* @__PURE__ */ d("div", { className: "cedros-admin__dropdown", ref: c, children: [
    /* @__PURE__ */ d(
      "button",
      {
        type: "button",
        className: "cedros-admin__dropdown-trigger",
        onClick: () => !a && s(!i),
        "aria-expanded": i,
        "aria-haspopup": "listbox",
        disabled: a,
        children: [
          /* @__PURE__ */ o("span", { children: u }),
          /* @__PURE__ */ o("span", { className: `cedros-admin__dropdown-chevron ${i ? "cedros-admin__dropdown-chevron--open" : ""}`, children: Y.chevronDown })
        ]
      }
    ),
    i && /* @__PURE__ */ o("div", { className: "cedros-admin__dropdown-menu", role: "listbox", children: n.map((p) => /* @__PURE__ */ d(
      "button",
      {
        type: "button",
        className: `cedros-admin__dropdown-item ${p.value === e ? "cedros-admin__dropdown-item--selected" : ""}`,
        onClick: () => {
          p.disabled || (t(p.value), s(!1));
        },
        role: "option",
        "aria-selected": p.value === e,
        disabled: p.disabled,
        children: [
          p.label,
          p.value === e && /* @__PURE__ */ o("span", { className: "cedros-admin__dropdown-check", children: Y.check })
        ]
      },
      p.value
    )) })
  ] });
}
function ft({ value: e, onChange: t, options: n, label: r, description: a, disabled: i, className: s, style: c }) {
  const [l, u] = H(!1), p = gt(null), h = n.find((g) => g.value === e)?.label || "Select...";
  return ge(() => {
    const g = (v) => {
      p.current && !p.current.contains(v.target) && u(!1);
    };
    if (l)
      return document.addEventListener("mousedown", g), () => document.removeEventListener("mousedown", g);
  }, [l]), ge(() => {
    const g = (v) => {
      v.key === "Escape" && u(!1);
    };
    if (l)
      return document.addEventListener("keydown", g), () => document.removeEventListener("keydown", g);
  }, [l]), /* @__PURE__ */ d("div", { className: `cedros-admin__field ${s || ""}`, style: c, children: [
    /* @__PURE__ */ o("label", { className: "cedros-admin__field-label", children: r }),
    /* @__PURE__ */ d("div", { className: "cedros-admin__dropdown cedros-admin__dropdown--form", ref: p, children: [
      /* @__PURE__ */ d(
        "button",
        {
          type: "button",
          className: "cedros-admin__dropdown-trigger cedros-admin__dropdown-trigger--form",
          onClick: () => !i && u(!l),
          "aria-expanded": l,
          "aria-haspopup": "listbox",
          disabled: i,
          children: [
            /* @__PURE__ */ o("span", { children: h }),
            /* @__PURE__ */ o("span", { className: `cedros-admin__dropdown-chevron ${l ? "cedros-admin__dropdown-chevron--open" : ""}`, children: Y.chevronDown })
          ]
        }
      ),
      l && /* @__PURE__ */ o("div", { className: "cedros-admin__dropdown-menu cedros-admin__dropdown-menu--form", role: "listbox", children: n.map((g) => /* @__PURE__ */ d(
        "button",
        {
          type: "button",
          className: `cedros-admin__dropdown-item ${g.value === e ? "cedros-admin__dropdown-item--selected" : ""}`,
          onClick: () => {
            g.disabled || (t(g.value), u(!1));
          },
          role: "option",
          "aria-selected": g.value === e,
          disabled: g.disabled,
          children: [
            g.label,
            g.value === e && /* @__PURE__ */ o("span", { className: "cedros-admin__dropdown-check", children: Y.check })
          ]
        },
        g.value
      )) })
    ] }),
    a && /* @__PURE__ */ o("p", { className: "cedros-admin__field-description", children: a })
  ] });
}
function js() {
  return `variant_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
function qp(e) {
  if (e.length === 0) return [];
  const t = [...e].sort((r, a) => r.displayOrder - a.displayOrder), n = (r, a) => {
    if (r >= t.length) {
      const c = a.valueIds.sort().join("|"), l = Object.values(a.options).join(" / ");
      return [
        {
          key: c,
          title: l,
          optionValueIds: [...a.valueIds],
          options: { ...a.options }
        }
      ];
    }
    const i = t[r], s = [];
    for (const c of i.values)
      s.push(
        ...n(r + 1, {
          valueIds: [...a.valueIds, c.id],
          options: { ...a.options, [i.name]: c.label }
        })
      );
    return s;
  };
  return n(0, { valueIds: [], options: {} });
}
function Zp(e) {
  return e.optionValueIds?.length ? [...e.optionValueIds].sort().join("|") : Object.entries(e.options).sort(([t], [n]) => t.localeCompare(n)).map(([t, n]) => `${t}:${n}`).join("|");
}
function Gp({
  variationConfig: e,
  variants: t,
  onChange: n,
  defaultPrice: r = 0,
  currencySymbol: a = "$",
  maxVariants: i = 100,
  disabled: s = !1
}) {
  const c = Te(
    () => qp(e.variationTypes),
    [e.variationTypes]
  ), l = Te(() => {
    const f = /* @__PURE__ */ new Map();
    for (const b of t)
      f.set(Zp(b), b);
    return f;
  }, [t]), { existingRows: u, possibleRows: p } = Te(() => {
    const f = [], b = [];
    for (const k of c) {
      const w = l.get(k.key);
      w ? f.push({ combo: k, variant: w }) : b.push(k);
    }
    return { existingRows: f, possibleRows: b };
  }, [c, l]), m = J(
    (f, b) => {
      n(
        t.map((k) => k.id === f ? { ...k, ...b } : k)
      );
    },
    [t, n]
  ), h = J(
    (f) => {
      n(t.filter((b) => b.id !== f));
    },
    [t, n]
  ), g = J(
    (f) => {
      if (t.length >= i) return;
      const b = {
        id: js(),
        title: f.title,
        options: f.options,
        optionValueIds: f.optionValueIds,
        price: r,
        inventoryQuantity: 0,
        inventoryStatus: "in_stock",
        autoGenerated: !1
      };
      n([...t, b]);
    },
    [t, n, i, r]
  ), v = J(() => {
    const f = i - t.length, k = p.slice(0, f).map((w) => ({
      id: js(),
      title: w.title,
      options: w.options,
      optionValueIds: w.optionValueIds,
      price: r,
      inventoryQuantity: 0,
      inventoryStatus: "in_stock",
      autoGenerated: !0
    }));
    n([...t, ...k]);
  }, [t, n, p, i, r]);
  return e.variationTypes.length === 0 ? /* @__PURE__ */ o("div", { className: "cedros-admin__variant-grid-empty", children: "Add variation types above to create product variants." }) : c.length === 0 ? /* @__PURE__ */ o("div", { className: "cedros-admin__variant-grid-empty", children: "Add values to your variation types to create product variants." }) : /* @__PURE__ */ d("div", { className: "cedros-admin__variant-grid", children: [
    /* @__PURE__ */ d("div", { className: "cedros-admin__variant-grid-header", children: [
      /* @__PURE__ */ o("h4", { className: "cedros-admin__field-label", style: { marginBottom: 0 }, children: "Variants" }),
      /* @__PURE__ */ d("span", { style: { fontSize: 12, opacity: 0.7 }, children: [
        t.length,
        "/",
        i,
        " variants (",
        c.length,
        " ",
        "possible)"
      ] })
    ] }),
    p.length > 0 && t.length < i && /* @__PURE__ */ d("div", { className: "cedros-admin__variant-grid-actions", children: [
      /* @__PURE__ */ d(
        "button",
        {
          type: "button",
          className: "cedros-admin__button cedros-admin__button--secondary",
          onClick: v,
          disabled: s,
          children: [
            "Generate All (",
            Math.min(p.length, i - t.length),
            ")"
          ]
        }
      ),
      /* @__PURE__ */ o("span", { style: { fontSize: 11, opacity: 0.7 }, children: "Creates variants with default price and 0 inventory" })
    ] }),
    /* @__PURE__ */ o("div", { className: "cedros-admin__table-container", children: /* @__PURE__ */ d("table", { className: "cedros-admin__table cedros-admin__variant-table", children: [
      /* @__PURE__ */ o("thead", { children: /* @__PURE__ */ d("tr", { children: [
        /* @__PURE__ */ o("th", { children: "Variant" }),
        /* @__PURE__ */ o("th", { style: { width: 100 }, children: "Price" }),
        /* @__PURE__ */ o("th", { style: { width: 80 }, children: "Qty" }),
        /* @__PURE__ */ o("th", { style: { width: 100 }, children: "SKU" }),
        /* @__PURE__ */ o("th", { style: { width: 100 }, children: "Status" }),
        /* @__PURE__ */ o("th", { style: { width: 80 }, children: "Actions" })
      ] }) }),
      /* @__PURE__ */ d("tbody", { children: [
        u.map(({ combo: f, variant: b }) => /* @__PURE__ */ d("tr", { children: [
          /* @__PURE__ */ o("td", { children: /* @__PURE__ */ d("div", { style: { display: "flex", flexDirection: "column" }, children: [
            /* @__PURE__ */ o("span", { style: { fontWeight: 600 }, children: f.title }),
            /* @__PURE__ */ o("span", { style: { fontSize: 11, opacity: 0.6 }, children: Object.entries(f.options).map(([k, w]) => `${k}: ${w}`).join(", ") })
          ] }) }),
          /* @__PURE__ */ o("td", { children: /* @__PURE__ */ d("div", { style: { display: "flex", alignItems: "center", gap: 4 }, children: [
            /* @__PURE__ */ o("span", { children: a }),
            /* @__PURE__ */ o(
              "input",
              {
                type: "number",
                className: "cedros-admin__input cedros-admin__input--sm",
                value: b.price ?? "",
                onChange: (k) => m(b.id, {
                  price: k.target.value === "" ? void 0 : parseFloat(k.target.value) || 0
                }),
                disabled: s,
                min: "0",
                step: "0.01",
                style: { width: 70 }
              }
            )
          ] }) }),
          /* @__PURE__ */ o("td", { children: /* @__PURE__ */ o(
            "input",
            {
              type: "number",
              className: "cedros-admin__input cedros-admin__input--sm",
              value: b.inventoryQuantity ?? "",
              onChange: (k) => m(b.id, {
                inventoryQuantity: k.target.value === "" ? void 0 : parseInt(k.target.value) || 0
              }),
              disabled: s,
              min: "0",
              style: { width: 60 }
            }
          ) }),
          /* @__PURE__ */ o("td", { children: /* @__PURE__ */ o(
            "input",
            {
              type: "text",
              className: "cedros-admin__input cedros-admin__input--sm",
              value: b.sku ?? "",
              onChange: (k) => m(b.id, {
                sku: k.target.value || void 0
              }),
              disabled: s,
              placeholder: "SKU",
              style: { width: 80 }
            }
          ) }),
          /* @__PURE__ */ o("td", { children: /* @__PURE__ */ o(
            gl,
            {
              value: b.inventoryStatus ?? "in_stock",
              onChange: (k) => m(b.id, {
                inventoryStatus: k
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
          /* @__PURE__ */ o("td", { children: /* @__PURE__ */ o(
            "button",
            {
              type: "button",
              className: "cedros-admin__button cedros-admin__button--ghost cedros-admin__button--icon cedros-admin__button--danger",
              onClick: () => h(b.id),
              disabled: s,
              title: "Remove variant",
              children: Y.trash
            }
          ) })
        ] }, b.id)),
        p.length > 0 && t.length < i && /* @__PURE__ */ d(Oe, { children: [
          /* @__PURE__ */ o("tr", { className: "cedros-admin__variant-separator", children: /* @__PURE__ */ o("td", { colSpan: 6, children: /* @__PURE__ */ d("span", { style: { fontSize: 11, opacity: 0.6 }, children: [
            "Uncreated combinations (",
            p.length,
            ")"
          ] }) }) }),
          p.slice(0, 10).map((f) => /* @__PURE__ */ d("tr", { className: "cedros-admin__variant-possible", children: [
            /* @__PURE__ */ o("td", { children: /* @__PURE__ */ o("span", { style: { opacity: 0.6 }, children: f.title }) }),
            /* @__PURE__ */ o("td", { colSpan: 4, style: { opacity: 0.5 }, children: "Not created" }),
            /* @__PURE__ */ o("td", { children: /* @__PURE__ */ o(
              "button",
              {
                type: "button",
                className: "cedros-admin__button cedros-admin__button--ghost cedros-admin__button--icon",
                onClick: () => g(f),
                disabled: s,
                title: "Create variant",
                children: Y.plus
              }
            ) })
          ] }, f.key)),
          p.length > 10 && /* @__PURE__ */ o("tr", { className: "cedros-admin__variant-more", children: /* @__PURE__ */ d("td", { colSpan: 6, style: { textAlign: "center", opacity: 0.6 }, children: [
            "+",
            p.length - 10,
            " more combinations"
          ] }) })
        ] })
      ] })
    ] }) })
  ] });
}
function Qp({
  serverUrl: e,
  productId: t,
  productTitle: n,
  defaultPrice: r = 0,
  currencySymbol: a = "$",
  apiKey: i,
  authManager: s,
  onClose: c
}) {
  const {
    data: l,
    isLoading: u,
    error: p,
    fetch: m,
    save: h,
    isSaving: g
  } = Vp({ serverUrl: e, productId: t, apiKey: i, authManager: s }), [v, f] = H({ variationTypes: [] }), [b, k] = H([]), [w, _] = H(!1), [x, N] = H(!1);
  ge(() => {
    m();
  }, [m]), ge(() => {
    l && (f(l.variationConfig), k(l.variants), _(!1));
  }, [l]);
  const I = J((W) => {
    f(W), _(!0), N(!1);
  }, []), S = J((W) => {
    k(W), _(!0), N(!1);
  }, []), A = J(async () => {
    const W = new Set((l?.variants ?? []).map((F) => F.id)), C = b.filter((F) => !W.has(F.id)), T = b.filter((F) => W.has(F.id)), P = (l?.variants ?? []).filter((F) => !b.some(($) => $.id === F.id)).map((F) => F.id);
    await h({
      variationConfig: v,
      createVariants: C.map((F) => ({
        optionValueIds: F.optionValueIds ?? [],
        inventoryQuantity: F.inventoryQuantity,
        sku: F.sku,
        price: F.price
      })),
      updateVariants: T.map((F) => ({
        id: F.id,
        inventoryQuantity: F.inventoryQuantity,
        sku: F.sku,
        price: F.price,
        inventoryStatus: F.inventoryStatus
      })),
      deleteVariantIds: P.length > 0 ? P : void 0
    }) && (_(!1), N(!0), setTimeout(() => N(!1), 3e3));
  }, [v, b, l?.variants, h]);
  return u ? /* @__PURE__ */ d("div", { className: "cedros-admin__variations-editor", children: [
    /* @__PURE__ */ d("div", { className: "cedros-admin__variations-editor-header", children: [
      /* @__PURE__ */ o("h3", { className: "cedros-admin__section-title", children: n ? `Variations: ${n}` : "Product Variations" }),
      c && /* @__PURE__ */ o(
        "button",
        {
          type: "button",
          className: "cedros-admin__button cedros-admin__button--ghost",
          onClick: c,
          children: Y.close
        }
      )
    ] }),
    /* @__PURE__ */ d("div", { className: "cedros-admin__loading", children: [
      Y.loading,
      " Loading variations..."
    ] })
  ] }) : /* @__PURE__ */ d("div", { className: "cedros-admin__variations-editor", children: [
    /* @__PURE__ */ d("div", { className: "cedros-admin__variations-editor-header", children: [
      /* @__PURE__ */ o("h3", { className: "cedros-admin__section-title", children: n ? `Variations: ${n}` : "Product Variations" }),
      /* @__PURE__ */ d("div", { className: "cedros-admin__variations-editor-actions", children: [
        x && /* @__PURE__ */ d("span", { className: "cedros-admin__success-text", children: [
          Y.check,
          " Saved"
        ] }),
        w && /* @__PURE__ */ o("span", { className: "cedros-admin__unsaved-text", children: "Unsaved changes" }),
        /* @__PURE__ */ o(
          "button",
          {
            type: "button",
            className: "cedros-admin__button cedros-admin__button--primary",
            onClick: A,
            disabled: g || !w,
            children: g ? "Saving..." : "Save Changes"
          }
        ),
        c && /* @__PURE__ */ o(
          "button",
          {
            type: "button",
            className: "cedros-admin__button cedros-admin__button--ghost",
            onClick: c,
            children: Y.close
          }
        )
      ] })
    ] }),
    p && /* @__PURE__ */ o("div", { className: "cedros-admin__error-banner", children: p }),
    /* @__PURE__ */ d("div", { className: "cedros-admin__variations-editor-content", children: [
      /* @__PURE__ */ o("div", { className: "cedros-admin__variations-editor-section", children: /* @__PURE__ */ o(
        Hp,
        {
          value: v,
          onChange: I,
          disabled: g
        }
      ) }),
      v.variationTypes.length > 0 && /* @__PURE__ */ o("div", { className: "cedros-admin__variations-editor-section", children: /* @__PURE__ */ o(
        Gp,
        {
          variationConfig: v,
          variants: b,
          onChange: S,
          defaultPrice: r,
          currencySymbol: a,
          disabled: g
        }
      ) })
    ] })
  ] });
}
function Yp({ serverUrl: e, apiKey: t, pageSize: n = 20, authManager: r }) {
  const [a, i] = H([]), [s, c] = H(!0), [l, u] = H(!1), [p, m] = H(!1), [h, g] = H(null), [v, f] = H(null), [b, k] = H(null), [w, _] = H({
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
  }), x = ($) => {
    const M = $.tagsCsv.split(",").map((j) => j.trim()).filter(Boolean), D = $.categoryIdsCsv.split(",").map((j) => j.trim()).filter(Boolean), O = {
      email: $.checkoutEmail,
      name: $.checkoutName,
      phone: $.checkoutPhone,
      shippingAddress: $.checkoutShippingAddress,
      billingAddress: $.checkoutBillingAddress
    }, V = $.fulfillmentType === "shipping" ? "physical" : "digital", E = {
      title: $.title,
      slug: $.slug || $.id,
      shipping_profile: V,
      inventory_status: $.inventoryStatus,
      checkout_requirements: JSON.stringify(O),
      fulfillment_type: $.fulfillmentType
    };
    $.imageUrl && (E.image_url = $.imageUrl);
    const q = $.compareAtUsd ? Math.round(Number($.compareAtUsd) * 100) : 0;
    q && (E.compare_at_amount_cents = String(q)), M.length && (E.tags = JSON.stringify(M)), D.length && (E.category_ids = JSON.stringify(D)), $.fulfillmentNotes && (E.fulfillment_notes = $.fulfillmentNotes);
    const re = $.shippingCountriesCsv.split(",").map((j) => j.trim().toUpperCase()).filter(Boolean);
    return re.length && (E.shippingCountries = re.join(","), E.shipping_countries = re.join(",")), E;
  }, N = ($) => $.metadata?.title || $.description || $.id, I = ($) => $.metadata?.image_url, S = J(async () => {
    try {
      let $;
      if (r?.isAuthenticated())
        $ = await r.fetchWithAuth(`/admin/products?limit=${n}`);
      else {
        const M = { "Content-Type": "application/json" };
        t && (M["X-API-Key"] = t);
        const D = await fetch(`${e}/admin/products?limit=${n}`, { headers: M });
        if (!D.ok) throw new Error(`Failed to fetch products: ${D.status}`);
        $ = await D.json();
      }
      i($.products || []);
    } catch {
      i([
        { id: "premium-article", description: "Premium Article Access", fiatAmountCents: 500, fiatCurrency: "usd", cryptoAtomicAmount: 5e6, cryptoToken: "USDC", active: !0 },
        { id: "video-course", description: "Video Course Bundle", fiatAmountCents: 2999, fiatCurrency: "usd", cryptoAtomicAmount: 2999e4, cryptoToken: "USDC", active: !0 },
        { id: "api-credits", description: "API Credits Pack", fiatAmountCents: 1e3, fiatCurrency: "usd", cryptoAtomicAmount: 1e7, cryptoToken: "USDC", active: !0 }
      ]);
    } finally {
      c(!1);
    }
  }, [e, t, n, r]);
  ge(() => {
    S();
  }, [S]);
  const A = async ($) => {
    if ($.preventDefault(), !(!w.id || !w.description)) {
      if (g(null), w.fulfillmentType === "shipping" && w.checkoutShippingAddress && !w.shippingCountriesCsv.split(",").map((D) => D.trim()).filter(Boolean).length) {
        g("Shipping countries are required when collecting shipping address. Example: US,CA");
        return;
      }
      m(!0);
      try {
        const { productType: M } = w, D = w.inventoryQuantity === "" ? void 0 : Number.isFinite(Number(w.inventoryQuantity)) ? Number(w.inventoryQuantity) : void 0, O = Number(w.priceUsd) || 0, V = Math.round(O * 100), E = Math.round(O * 1e6), q = {
          id: w.id,
          description: w.description,
          fiatAmountCents: V,
          fiatCurrency: w.fiatCurrency,
          cryptoAtomicAmount: E,
          cryptoToken: w.cryptoToken,
          ...D !== void 0 ? { inventoryQuantity: D } : {},
          metadata: {
            ...M ? { product_type: M } : {},
            ...x(w)
          }
        };
        if (r?.isAuthenticated())
          await r.fetchWithAuth("/admin/products", {
            method: "POST",
            body: JSON.stringify(q)
          });
        else {
          const re = { "Content-Type": "application/json" };
          t && (re["X-API-Key"] = t);
          const j = await fetch(`${e}/admin/products`, {
            method: "POST",
            headers: re,
            body: JSON.stringify(q)
          });
          if (!j.ok) throw new Error(`Failed to create product: ${j.status}`);
        }
        _({
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
        }), u(!1), S();
      } catch {
        const D = Number(w.priceUsd) || 0;
        i((O) => [
          ...O,
          {
            id: w.id,
            title: w.title || void 0,
            slug: w.slug || void 0,
            imageUrl: w.imageUrl || void 0,
            description: w.description,
            fiatAmountCents: Math.round(D * 100),
            fiatCurrency: w.fiatCurrency,
            cryptoAtomicAmount: Math.round(D * 1e6),
            cryptoToken: w.cryptoToken,
            inventoryQuantity: w.inventoryQuantity === "" ? void 0 : Number.isFinite(Number(w.inventoryQuantity)) ? Number(w.inventoryQuantity) : void 0,
            active: !0,
            metadata: {
              ...w.productType ? { product_type: w.productType } : {},
              ...x(w)
            }
          }
        ]), _({
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
        }), u(!1);
      } finally {
        m(!1);
      }
    }
  }, W = ($) => `$${($ / 100).toFixed(2)}`, C = ($) => {
    switch ($) {
      case "subscription":
        return "Subscription";
      case "pay_per_access":
        return "Pay per access";
      case "one_time":
        return "One-time purchase";
      default:
        return "One-time purchase";
    }
  }, T = Te(() => {
    const $ = a.filter((D) => D.active).length, M = a.reduce((D, O) => {
      const V = O.variations?.length ?? 0;
      return D + (V > 0 ? V : 1);
    }, 0);
    return { activeCount: $, totalSkus: M };
  }, [a]), P = ($) => {
    k((M) => !M || M.key !== $ ? { key: $, direction: "asc" } : { key: $, direction: M.direction === "asc" ? "desc" : "asc" });
  }, L = ($) => !b || b.key !== $ ? /* @__PURE__ */ o("span", { className: "cedros-admin__sort-icon cedros-admin__sort-icon--idle", children: Y.chevronUp }) : /* @__PURE__ */ o("span", { className: "cedros-admin__sort-icon", children: b.direction === "asc" ? Y.chevronUp : Y.chevronDown }), F = Te(() => {
    if (!b) return a;
    const $ = b.direction === "asc" ? 1 : -1, M = (D) => {
      switch (b.key) {
        case "product":
          return N(D);
        case "type":
          return C(D.metadata?.product_type);
        case "price":
          return D.fiatAmountCents ?? 0;
        case "status":
          return D.active ? 1 : 0;
        case "id":
        default:
          return D.id;
      }
    };
    return [...a].sort((D, O) => {
      const V = M(D), E = M(O);
      return typeof V == "number" && typeof E == "number" ? (V - E) * $ : String(V).localeCompare(String(E), void 0, { sensitivity: "base" }) * $;
    });
  }, [a, b]);
  return /* @__PURE__ */ d("div", { className: "cedros-admin__page", children: [
    /* @__PURE__ */ o(
      rr,
      {
        stats: [
          { label: "Total Products", value: a.length },
          { label: "Active", value: T.activeCount, variant: T.activeCount > 0 ? "success" : "muted" },
          { label: "Total SKUs", value: T.totalSkus }
        ],
        isLoading: s
      }
    ),
    /* @__PURE__ */ d("div", { className: "cedros-admin__section-header", children: [
      /* @__PURE__ */ o("h3", { className: "cedros-admin__section-title", children: "Paywall Products" }),
      /* @__PURE__ */ d(
        "button",
        {
          className: "cedros-admin__button cedros-admin__button--primary cedros-admin__button--action",
          onClick: () => {
            g(null), u(!l);
          },
          children: [
            l ? Y.close : Y.plus,
            l ? "Cancel" : "Add Product"
          ]
        }
      )
    ] }),
    l && /* @__PURE__ */ d("form", { onSubmit: A, className: "cedros-admin__add-form", children: [
      h && /* @__PURE__ */ o("div", { style: { marginBottom: "0.75rem", color: "#B42318", fontWeight: 600 }, children: h }),
      /* @__PURE__ */ d("div", { className: "cedros-admin__form-row", children: [
        /* @__PURE__ */ d("div", { className: "cedros-admin__field", children: [
          /* @__PURE__ */ o("label", { className: "cedros-admin__field-label", children: "Product ID" }),
          /* @__PURE__ */ o(
            "input",
            {
              type: "text",
              className: "cedros-admin__input",
              value: w.id,
              onChange: ($) => _((M) => ({ ...M, id: $.target.value })),
              placeholder: "e.g., premium-article",
              required: !0
            }
          )
        ] }),
        /* @__PURE__ */ d("div", { className: "cedros-admin__field", children: [
          /* @__PURE__ */ o("label", { className: "cedros-admin__field-label", children: "Product name" }),
          /* @__PURE__ */ o(
            "input",
            {
              type: "text",
              className: "cedros-admin__input",
              value: w.title,
              onChange: ($) => _((M) => ({ ...M, title: $.target.value })),
              placeholder: "e.g., Cedros Hoodie"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ d("div", { className: "cedros-admin__form-row", children: [
        /* @__PURE__ */ d("div", { className: "cedros-admin__field", children: [
          /* @__PURE__ */ o("label", { className: "cedros-admin__field-label", children: "Slug" }),
          /* @__PURE__ */ o(
            "input",
            {
              type: "text",
              className: "cedros-admin__input",
              value: w.slug,
              onChange: ($) => _((M) => ({ ...M, slug: $.target.value })),
              placeholder: "e.g., cedros-hoodie (defaults to ID)"
            }
          )
        ] }),
        /* @__PURE__ */ d("div", { className: "cedros-admin__field", children: [
          /* @__PURE__ */ o("label", { className: "cedros-admin__field-label", children: "Primary image URL" }),
          /* @__PURE__ */ o(
            "input",
            {
              type: "url",
              className: "cedros-admin__input",
              value: w.imageUrl,
              onChange: ($) => _((M) => ({ ...M, imageUrl: $.target.value })),
              placeholder: "https://..."
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ o("div", { className: "cedros-admin__form-row", children: /* @__PURE__ */ d("div", { className: "cedros-admin__field", children: [
        /* @__PURE__ */ o("label", { className: "cedros-admin__field-label", children: "Short description" }),
        /* @__PURE__ */ o(
          "input",
          {
            type: "text",
            className: "cedros-admin__input",
            value: w.description,
            onChange: ($) => _((M) => ({ ...M, description: $.target.value })),
            placeholder: "e.g., Midweight fleece with relaxed fit",
            required: !0
          }
        )
      ] }) }),
      /* @__PURE__ */ d("div", { className: "cedros-admin__form-row", children: [
        /* @__PURE__ */ o(
          ft,
          {
            value: w.productType,
            onChange: ($) => _((M) => ({ ...M, productType: $ })),
            options: [
              { value: "one_time", label: "One-time purchase" },
              { value: "pay_per_access", label: "Pay per access" },
              { value: "subscription", label: "Subscription" }
            ],
            label: "Product Type"
          }
        ),
        /* @__PURE__ */ o(
          ft,
          {
            value: w.fulfillmentType,
            onChange: ($) => {
              const M = $;
              _((D) => ({
                ...D,
                fulfillmentType: M,
                checkoutShippingAddress: M === "shipping" ? D.checkoutShippingAddress : !1
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
      w.fulfillmentType === "shipping" && /* @__PURE__ */ d("div", { className: "cedros-admin__form-row", children: [
        /* @__PURE__ */ o(
          ft,
          {
            value: w.inventoryStatus,
            onChange: ($) => _((M) => ({
              ...M,
              inventoryStatus: $
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
        /* @__PURE__ */ d("div", { className: "cedros-admin__field", children: [
          /* @__PURE__ */ o("label", { className: "cedros-admin__field-label", children: "Inventory quantity (tracked)" }),
          /* @__PURE__ */ o(
            "input",
            {
              type: "number",
              className: "cedros-admin__input",
              value: w.inventoryQuantity,
              onChange: ($) => _((M) => ({
                ...M,
                inventoryQuantity: $.target.value === "" ? "" : parseInt($.target.value) || 0
              })),
              placeholder: "Leave blank for untracked",
              min: "0"
            }
          )
        ] }),
        /* @__PURE__ */ d("div", { className: "cedros-admin__field", children: [
          /* @__PURE__ */ o("label", { className: "cedros-admin__field-label", children: "Compare-at price (USD)" }),
          /* @__PURE__ */ o(
            "input",
            {
              type: "number",
              className: "cedros-admin__input",
              value: w.compareAtUsd === "" ? "" : w.compareAtUsd,
              onChange: ($) => _((M) => ({ ...M, compareAtUsd: $.target.value === "" ? "" : parseFloat($.target.value) || 0 })),
              placeholder: "e.g., 78.00",
              min: "0",
              step: "0.01"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ o("div", { className: "cedros-admin__form-row", children: /* @__PURE__ */ d("div", { className: "cedros-admin__field", children: [
        /* @__PURE__ */ o("label", { className: "cedros-admin__field-label", children: "Price (USD)" }),
        /* @__PURE__ */ o(
          "input",
          {
            type: "number",
            className: "cedros-admin__input",
            value: w.priceUsd === "" ? "" : w.priceUsd,
            onChange: ($) => _((M) => ({ ...M, priceUsd: $.target.value === "" ? "" : parseFloat($.target.value) || 0 })),
            placeholder: "e.g., 5.00",
            min: "0",
            step: "0.01",
            required: !0
          }
        )
      ] }) }),
      /* @__PURE__ */ d("div", { className: "cedros-admin__form-row", children: [
        /* @__PURE__ */ d("div", { className: "cedros-admin__field", children: [
          /* @__PURE__ */ o("label", { className: "cedros-admin__field-label", children: "Tags (comma-separated)" }),
          /* @__PURE__ */ o(
            "input",
            {
              type: "text",
              className: "cedros-admin__input",
              value: w.tagsCsv,
              onChange: ($) => _((M) => ({ ...M, tagsCsv: $.target.value })),
              placeholder: "e.g., core, new, gift"
            }
          )
        ] }),
        /* @__PURE__ */ d("div", { className: "cedros-admin__field", children: [
          /* @__PURE__ */ o("label", { className: "cedros-admin__field-label", children: "Category IDs (comma-separated)" }),
          /* @__PURE__ */ o(
            "input",
            {
              type: "text",
              className: "cedros-admin__input",
              value: w.categoryIdsCsv,
              onChange: ($) => _((M) => ({ ...M, categoryIdsCsv: $.target.value })),
              placeholder: "e.g., cat_apparel, cat_accessories"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ d("div", { className: "cedros-admin__form-row", children: [
        /* @__PURE__ */ o(
          ft,
          {
            value: w.checkoutEmail,
            onChange: ($) => _((M) => ({ ...M, checkoutEmail: $ })),
            options: [
              { value: "none", label: "None" },
              { value: "optional", label: "Optional" },
              { value: "required", label: "Required" }
            ],
            label: "Checkout: Email"
          }
        ),
        /* @__PURE__ */ o(
          ft,
          {
            value: w.checkoutName,
            onChange: ($) => _((M) => ({ ...M, checkoutName: $ })),
            options: [
              { value: "none", label: "None" },
              { value: "optional", label: "Optional" },
              { value: "required", label: "Required" }
            ],
            label: "Checkout: Name"
          }
        ),
        /* @__PURE__ */ o(
          ft,
          {
            value: w.checkoutPhone,
            onChange: ($) => _((M) => ({ ...M, checkoutPhone: $ })),
            options: [
              { value: "none", label: "None" },
              { value: "optional", label: "Optional" },
              { value: "required", label: "Required" }
            ],
            label: "Checkout: Phone"
          }
        )
      ] }),
      /* @__PURE__ */ d("div", { className: "cedros-admin__form-row", children: [
        w.fulfillmentType === "shipping" && /* @__PURE__ */ d("div", { className: "cedros-admin__field", children: [
          /* @__PURE__ */ o("label", { className: "cedros-admin__field-label", children: "Checkout: Shipping address" }),
          /* @__PURE__ */ d("label", { style: { display: "flex", alignItems: "center", gap: "0.5rem" }, children: [
            /* @__PURE__ */ o(
              "input",
              {
                type: "checkbox",
                checked: w.checkoutShippingAddress,
                onChange: ($) => _((M) => ({ ...M, checkoutShippingAddress: $.target.checked }))
              }
            ),
            "Collect shipping address"
          ] })
        ] }),
        /* @__PURE__ */ d("div", { className: "cedros-admin__field", children: [
          /* @__PURE__ */ o("label", { className: "cedros-admin__field-label", children: "Checkout: Billing address" }),
          /* @__PURE__ */ d("label", { style: { display: "flex", alignItems: "center", gap: "0.5rem" }, children: [
            /* @__PURE__ */ o(
              "input",
              {
                type: "checkbox",
                checked: w.checkoutBillingAddress,
                onChange: ($) => _((M) => ({ ...M, checkoutBillingAddress: $.target.checked }))
              }
            ),
            "Collect billing address"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ o("div", { className: "cedros-admin__form-row", children: /* @__PURE__ */ d("div", { className: "cedros-admin__field", children: [
        /* @__PURE__ */ o("label", { className: "cedros-admin__field-label", children: "Fulfillment notes" }),
        /* @__PURE__ */ o(
          "input",
          {
            type: "text",
            className: "cedros-admin__input",
            value: w.fulfillmentNotes,
            onChange: ($) => _((M) => ({ ...M, fulfillmentNotes: $.target.value })),
            placeholder: w.fulfillmentType === "shipping" ? "e.g., Ships within 3-5 business days" : "e.g., Downloadable from your account after purchase"
          }
        )
      ] }) }),
      w.fulfillmentType === "shipping" && w.checkoutShippingAddress && /* @__PURE__ */ o("div", { className: "cedros-admin__form-row", children: /* @__PURE__ */ d("div", { className: "cedros-admin__field", children: [
        /* @__PURE__ */ o("label", { className: "cedros-admin__field-label", children: "Shipping countries" }),
        /* @__PURE__ */ o(
          "input",
          {
            type: "text",
            className: "cedros-admin__input",
            value: w.shippingCountriesCsv,
            onChange: ($) => _((M) => ({ ...M, shippingCountriesCsv: $.target.value })),
            placeholder: "e.g., US,CA"
          }
        ),
        /* @__PURE__ */ o("div", { style: { marginTop: 4, fontSize: 12, opacity: 0.75 }, children: "ISO 2-letter country codes, comma-separated. Required for shipping address collection." })
      ] }) }),
      /* @__PURE__ */ o("div", { className: "cedros-admin__form-actions", children: /* @__PURE__ */ o("button", { type: "submit", className: "cedros-admin__button cedros-admin__button--primary", disabled: p, children: p ? "Creating..." : "Create Product" }) })
    ] }),
    s ? /* @__PURE__ */ d("div", { className: "cedros-admin__loading", children: [
      Y.loading,
      " Loading products..."
    ] }) : /* @__PURE__ */ o("div", { className: "cedros-admin__table-container", children: /* @__PURE__ */ d("table", { className: "cedros-admin__table", children: [
      /* @__PURE__ */ o("thead", { children: /* @__PURE__ */ d("tr", { children: [
        /* @__PURE__ */ o("th", { "aria-sort": b?.key === "id" ? b?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ d("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => P("id"), children: [
          "ID",
          L("id")
        ] }) }),
        /* @__PURE__ */ o("th", { "aria-sort": b?.key === "product" ? b?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ d("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => P("product"), children: [
          "Product",
          L("product")
        ] }) }),
        /* @__PURE__ */ o("th", { "aria-sort": b?.key === "type" ? b?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ d("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => P("type"), children: [
          "Type",
          L("type")
        ] }) }),
        /* @__PURE__ */ o("th", { "aria-sort": b?.key === "price" ? b?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ d("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => P("price"), children: [
          "Price",
          L("price")
        ] }) }),
        /* @__PURE__ */ o("th", { "aria-sort": b?.key === "status" ? b?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ d("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => P("status"), children: [
          "Status",
          L("status")
        ] }) }),
        /* @__PURE__ */ o("th", { children: "Actions" })
      ] }) }),
      /* @__PURE__ */ o("tbody", { children: F.map(($) => /* @__PURE__ */ d("tr", { children: [
        /* @__PURE__ */ o("td", { children: /* @__PURE__ */ o("code", { children: $.id }) }),
        /* @__PURE__ */ o("td", { children: /* @__PURE__ */ d("div", { style: { display: "flex", alignItems: "center", gap: "0.5rem" }, children: [
          I($) ? /* @__PURE__ */ o(
            "img",
            {
              src: I($),
              alt: "",
              style: { width: 28, height: 28, borderRadius: 6, objectFit: "cover" }
            }
          ) : /* @__PURE__ */ o("div", { style: { width: 28, height: 28, borderRadius: 6, background: "rgba(0,0,0,0.06)" } }),
          /* @__PURE__ */ d("div", { style: { display: "flex", flexDirection: "column" }, children: [
            /* @__PURE__ */ o("span", { style: { fontWeight: 600 }, children: N($) }),
            /* @__PURE__ */ o("span", { style: { opacity: 0.8 }, children: $.description })
          ] })
        ] }) }),
        /* @__PURE__ */ o("td", { children: C($.metadata?.product_type) }),
        /* @__PURE__ */ o("td", { children: W($.fiatAmountCents) }),
        /* @__PURE__ */ o("td", { children: /* @__PURE__ */ o("span", { className: `cedros-admin__badge ${$.active ? "cedros-admin__badge--success" : "cedros-admin__badge--muted"}`, children: $.active ? "Active" : "Inactive" }) }),
        /* @__PURE__ */ o("td", { children: /* @__PURE__ */ d("div", { style: { display: "flex", gap: "0.25rem" }, children: [
          /* @__PURE__ */ o("button", { className: "cedros-admin__button cedros-admin__button--ghost", children: "Edit" }),
          /* @__PURE__ */ o(
            "button",
            {
              className: "cedros-admin__button cedros-admin__button--ghost",
              onClick: () => f($),
              children: "Variations"
            }
          )
        ] }) })
      ] }, $.id)) })
    ] }) }),
    v && /* @__PURE__ */ o("div", { className: "cedros-admin__modal-overlay", onClick: () => f(null), children: /* @__PURE__ */ o(
      "div",
      {
        className: "cedros-admin__modal cedros-admin__modal--lg",
        onClick: ($) => $.stopPropagation(),
        children: /* @__PURE__ */ o(
          Qp,
          {
            serverUrl: e,
            productId: v.id,
            productTitle: N(v),
            defaultPrice: v.fiatAmountCents / 100,
            apiKey: t,
            authManager: r,
            onClose: () => f(null)
          }
        )
      }
    ) })
  ] });
}
function Kp({ serverUrl: e, apiKey: t, pageSize: n = 20, authManager: r }) {
  const [a, i] = H([]), [s, c] = H(null), [l, u] = H(!0), [p, m] = H(!0), [h, g] = H(""), [v, f] = H(null), b = J(async () => {
    m(!0);
    try {
      let N;
      if (r?.isAuthenticated())
        N = await r.fetchWithAuth("/admin/stats");
      else {
        const I = { "Content-Type": "application/json" };
        t && (I["X-API-Key"] = t);
        const S = await fetch(`${e}/admin/stats`, { headers: I });
        if (!S.ok) throw new Error(`Failed to fetch stats: ${S.status}`);
        N = await S.json();
      }
      c(N);
    } catch {
      c({
        totalRevenue: 12450,
        totalTransactions: 342,
        activeProducts: 8,
        pendingRefunds: 3,
        revenueByMethod: { stripe: 8200, x402: 3150, credits: 1100 },
        transactionsByMethod: { stripe: 210, x402: 98, credits: 34 }
      });
    } finally {
      m(!1);
    }
  }, [e, t, r]);
  ge(() => {
    b();
  }, [b]), ge(() => {
    (async () => {
      try {
        let I;
        const S = new URLSearchParams({ limit: n.toString() });
        h && S.set("method", h);
        const A = `/admin/transactions?${S}`;
        if (r?.isAuthenticated())
          I = await r.fetchWithAuth(A);
        else {
          const W = { "Content-Type": "application/json" };
          t && (W["X-API-Key"] = t);
          const C = await fetch(`${e}${A}`, { headers: W });
          if (!C.ok) throw new Error(`Failed to fetch transactions: ${C.status}`);
          I = await C.json();
        }
        i(I.transactions || []);
      } catch {
        i([
          { id: "txn_1", resourceId: "premium-article", method: "stripe", amount: 5, currency: "usd", status: "completed", paidAt: (/* @__PURE__ */ new Date()).toISOString() },
          { id: "txn_2", resourceId: "video-course", method: "x402", amount: 29.99, currency: "usdc", status: "completed", paidAt: new Date(Date.now() - 36e5).toISOString() },
          { id: "txn_3", resourceId: "api-credits", method: "credits", amount: 10, currency: "credits", status: "completed", paidAt: new Date(Date.now() - 72e5).toISOString() }
        ]);
      } finally {
        u(!1);
      }
    })();
  }, [e, t, n, h, r]);
  const k = (N) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(N), w = (N) => {
    f((I) => !I || I.key !== N ? { key: N, direction: "asc" } : { key: N, direction: I.direction === "asc" ? "desc" : "asc" });
  }, _ = (N) => !v || v.key !== N ? /* @__PURE__ */ o("span", { className: "cedros-admin__sort-icon cedros-admin__sort-icon--idle", children: Y.chevronUp }) : /* @__PURE__ */ o("span", { className: "cedros-admin__sort-icon", children: v.direction === "asc" ? Y.chevronUp : Y.chevronDown }), x = Te(() => {
    if (!v) return a;
    const N = v.direction === "asc" ? 1 : -1, I = (S) => {
      switch (v.key) {
        case "resource":
          return S.resourceId;
        case "method":
          return S.method;
        case "amount":
          return S.amount;
        case "status":
          return S.status;
        case "date":
          return new Date(S.paidAt).getTime();
        case "id":
        default:
          return S.id;
      }
    };
    return [...a].sort((S, A) => {
      const W = I(S), C = I(A);
      return typeof W == "number" && typeof C == "number" ? (W - C) * N : String(W).localeCompare(String(C), void 0, { sensitivity: "base" }) * N;
    });
  }, [a, v]);
  return /* @__PURE__ */ d("div", { className: "cedros-admin__page", children: [
    /* @__PURE__ */ o(
      rr,
      {
        stats: [
          { label: "Revenue", value: k(s?.totalRevenue ?? 0) },
          { label: "Orders", value: s?.totalTransactions ?? 0 },
          { label: "Card", value: k(s?.revenueByMethod.stripe ?? 0), description: `${s?.transactionsByMethod.stripe ?? 0} orders` },
          { label: "Crypto", value: k(s?.revenueByMethod.x402 ?? 0), description: `${s?.transactionsByMethod.x402 ?? 0} orders` },
          { label: "Credits", value: k(s?.revenueByMethod.credits ?? 0), description: `${s?.transactionsByMethod.credits ?? 0} orders` }
        ],
        isLoading: p,
        onRefresh: b
      }
    ),
    /* @__PURE__ */ d("div", { className: "cedros-admin__section-header", children: [
      /* @__PURE__ */ o("h3", { className: "cedros-admin__section-title", children: "Transaction History" }),
      /* @__PURE__ */ o(
        gl,
        {
          value: h,
          onChange: g,
          options: [
            { value: "", label: "All" },
            { value: "stripe", label: "Card" },
            { value: "x402", label: "Crypto" },
            { value: "credits", label: "Credits" }
          ]
        }
      )
    ] }),
    l ? /* @__PURE__ */ d("div", { className: "cedros-admin__loading", children: [
      Y.loading,
      " Loading transactions..."
    ] }) : /* @__PURE__ */ o("div", { className: "cedros-admin__table-container", children: /* @__PURE__ */ d("table", { className: "cedros-admin__table", children: [
      /* @__PURE__ */ o("thead", { children: /* @__PURE__ */ d("tr", { children: [
        /* @__PURE__ */ o("th", { "aria-sort": v?.key === "id" ? v?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ d("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => w("id"), children: [
          "ID",
          _("id")
        ] }) }),
        /* @__PURE__ */ o("th", { "aria-sort": v?.key === "resource" ? v?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ d("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => w("resource"), children: [
          "Resource",
          _("resource")
        ] }) }),
        /* @__PURE__ */ o("th", { "aria-sort": v?.key === "method" ? v?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ d("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => w("method"), children: [
          "Method",
          _("method")
        ] }) }),
        /* @__PURE__ */ o("th", { "aria-sort": v?.key === "amount" ? v?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ d("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => w("amount"), children: [
          "Amount",
          _("amount")
        ] }) }),
        /* @__PURE__ */ o("th", { "aria-sort": v?.key === "status" ? v?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ d("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => w("status"), children: [
          "Status",
          _("status")
        ] }) }),
        /* @__PURE__ */ o("th", { "aria-sort": v?.key === "date" ? v?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ d("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => w("date"), children: [
          "Date",
          _("date")
        ] }) })
      ] }) }),
      /* @__PURE__ */ o("tbody", { children: x.map((N) => /* @__PURE__ */ d("tr", { children: [
        /* @__PURE__ */ o("td", { children: /* @__PURE__ */ o("code", { children: N.id }) }),
        /* @__PURE__ */ o("td", { children: N.resourceId }),
        /* @__PURE__ */ o("td", { children: /* @__PURE__ */ o("span", { className: `cedros-admin__badge cedros-admin__badge--${N.method}`, children: N.method }) }),
        /* @__PURE__ */ d("td", { children: [
          "$",
          N.amount.toFixed(2),
          " ",
          N.currency.toUpperCase()
        ] }),
        /* @__PURE__ */ o("td", { children: /* @__PURE__ */ o("span", { className: `cedros-admin__badge cedros-admin__badge--${N.status}`, children: N.status }) }),
        /* @__PURE__ */ o("td", { children: kr(N.paidAt) })
      ] }, N.id)) })
    ] }) })
  ] });
}
function Jp({ serverUrl: e, apiKey: t, pageSize: n = 20, authManager: r }) {
  const [a, i] = H([]), [s, c] = H(!0), [l, u] = H(!1), [p, m] = H(!1), [h, g] = H(null), [v, f] = H({
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
  }), b = J(async () => {
    try {
      let S;
      const A = `/admin/coupons?limit=${n}`;
      if (r?.isAuthenticated())
        S = await r.fetchWithAuth(A);
      else {
        const W = { "Content-Type": "application/json" };
        t && (W["X-API-Key"] = t);
        const C = await fetch(`${e}${A}`, { headers: W });
        if (!C.ok) throw new Error(`Failed to fetch coupons: ${C.status}`);
        S = await C.json();
      }
      i(S.coupons || []);
    } catch (S) {
      Ne().error("[CouponsSection] Failed to fetch coupons:", S, {
        serverUrl: e.slice(0, 20) + "...",
        hasApiKey: !!t
      }), i([
        { code: "SAVE20", discountType: "percentage", discountValue: 20, active: !0, usageLimit: 100, usageCount: 42 },
        { code: "LAUNCH10", discountType: "fixed", discountValue: 10, currency: "usd", active: !0, usageCount: 15 },
        { code: "EXPIRED50", discountType: "percentage", discountValue: 50, active: !1, usageCount: 100, expiresAt: "2024-12-31" }
      ]);
    } finally {
      c(!1);
    }
  }, [e, t, n, r]);
  ge(() => {
    b();
  }, [b]);
  const k = async (S) => {
    if (S.preventDefault(), !(!v.code || v.discountValue <= 0)) {
      m(!0);
      try {
        const A = v.minimumAmountUsd ? Math.round(Number(v.minimumAmountUsd) * 100) : void 0, W = v.productIdsCsv.split(",").map((P) => P.trim()).filter(Boolean), C = v.categoryIdsCsv.split(",").map((P) => P.trim()).filter(Boolean), T = {
          code: v.code,
          discountType: v.discountType,
          discountValue: v.discountValue,
          usageLimit: v.usageLimit,
          active: !0,
          usageCount: 0,
          // Scope and targeting
          scope: v.scope,
          ...W.length ? { productIds: W } : {},
          ...C.length ? { categoryIds: C } : {},
          // Payment and application
          ...v.paymentMethod !== "any" ? { paymentMethod: v.paymentMethod } : {},
          ...v.autoApply ? { autoApply: !0 } : {},
          ...v.appliesAt !== "both" ? { appliesAt: v.appliesAt } : {},
          ...v.startsAt ? { startsAt: v.startsAt } : {},
          ...v.expiresAt ? { expiresAt: v.expiresAt } : {},
          // Advanced
          ...A ? { minimumAmountCents: A } : {},
          ...v.usageLimitPerCustomer ? { usageLimitPerCustomer: v.usageLimitPerCustomer } : {},
          ...v.firstPurchaseOnly ? { firstPurchaseOnly: !0 } : {}
        };
        if (r?.isAuthenticated())
          await r.fetchWithAuth("/admin/coupons", {
            method: "POST",
            body: JSON.stringify(T)
          });
        else {
          const P = { "Content-Type": "application/json" };
          t && (P["X-API-Key"] = t);
          const L = await fetch(`${e}/admin/coupons`, {
            method: "POST",
            headers: P,
            body: JSON.stringify(T)
          });
          if (!L.ok) throw new Error(`Failed to create coupon: ${L.status}`);
        }
        f({
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
        }), u(!1), b();
      } catch (A) {
        Ne().error("[CouponsSection] Failed to add coupon:", A, {
          serverUrl: e.slice(0, 20) + "...",
          hasApiKey: !!t
        });
        const W = v.minimumAmountUsd ? Math.round(Number(v.minimumAmountUsd) * 100) : void 0, C = v.productIdsCsv.split(",").map((P) => P.trim()).filter(Boolean), T = v.categoryIdsCsv.split(",").map((P) => P.trim()).filter(Boolean);
        i((P) => [...P, {
          code: v.code,
          discountType: v.discountType,
          discountValue: v.discountValue,
          usageLimit: v.usageLimit,
          active: !0,
          usageCount: 0,
          scope: v.scope,
          productIds: C.length ? C : void 0,
          categoryIds: T.length ? T : void 0,
          paymentMethod: v.paymentMethod !== "any" ? v.paymentMethod : void 0,
          autoApply: v.autoApply || void 0,
          appliesAt: v.appliesAt !== "both" ? v.appliesAt : void 0,
          startsAt: v.startsAt || void 0,
          expiresAt: v.expiresAt || void 0,
          minimumAmountCents: W,
          usageLimitPerCustomer: v.usageLimitPerCustomer,
          firstPurchaseOnly: v.firstPurchaseOnly || void 0
        }]), f({
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
        }), u(!1);
      } finally {
        m(!1);
      }
    }
  }, w = a.filter((S) => S.active).length, _ = a.reduce((S, A) => S + (A.usageCount ?? 0), 0), x = (S) => {
    g((A) => !A || A.key !== S ? { key: S, direction: "asc" } : { key: S, direction: A.direction === "asc" ? "desc" : "asc" });
  }, N = (S) => !h || h.key !== S ? /* @__PURE__ */ o("span", { className: "cedros-admin__sort-icon cedros-admin__sort-icon--idle", children: Y.chevronUp }) : /* @__PURE__ */ o("span", { className: "cedros-admin__sort-icon", children: h.direction === "asc" ? Y.chevronUp : Y.chevronDown }), I = Te(() => {
    if (!h) return a;
    const S = h.direction === "asc" ? 1 : -1, A = (W) => {
      switch (h.key) {
        case "discount":
          return W.discountValue ?? 0;
        case "usage":
          return W.usageCount ?? 0;
        case "status":
          return W.active ? 1 : 0;
        case "code":
        default:
          return W.code;
      }
    };
    return [...a].sort((W, C) => {
      const T = A(W), P = A(C);
      return typeof T == "number" && typeof P == "number" ? (T - P) * S : String(T).localeCompare(String(P), void 0, { sensitivity: "base" }) * S;
    });
  }, [a, h]);
  return /* @__PURE__ */ d("div", { className: "cedros-admin__page", children: [
    /* @__PURE__ */ o(
      rr,
      {
        stats: [
          { label: "Total Coupons", value: a.length },
          { label: "Active", value: w, variant: w > 0 ? "success" : "muted" },
          { label: "Redemptions", value: _ }
        ],
        isLoading: s
      }
    ),
    /* @__PURE__ */ d("div", { className: "cedros-admin__section-header", children: [
      /* @__PURE__ */ o("h3", { className: "cedros-admin__section-title", children: "Discount Coupons" }),
      /* @__PURE__ */ d(
        "button",
        {
          className: "cedros-admin__button cedros-admin__button--primary cedros-admin__button--action",
          onClick: () => u(!l),
          children: [
            l ? Y.close : Y.plus,
            l ? "Cancel" : "Add Coupon"
          ]
        }
      )
    ] }),
    l && /* @__PURE__ */ d("form", { onSubmit: k, className: "cedros-admin__add-form", children: [
      /* @__PURE__ */ d("div", { className: "cedros-admin__form-row", children: [
        /* @__PURE__ */ d("div", { className: "cedros-admin__field", children: [
          /* @__PURE__ */ o("label", { className: "cedros-admin__field-label", children: "Coupon Code" }),
          /* @__PURE__ */ o(
            "input",
            {
              type: "text",
              className: "cedros-admin__input",
              value: v.code,
              onChange: (S) => f((A) => ({ ...A, code: S.target.value.toUpperCase() })),
              placeholder: "e.g., SAVE20",
              required: !0
            }
          )
        ] }),
        /* @__PURE__ */ o(
          ft,
          {
            value: v.discountType,
            onChange: (S) => f((A) => ({ ...A, discountType: S })),
            options: [
              { value: "percentage", label: "Percentage (%)" },
              { value: "fixed", label: "Fixed Amount ($)" }
            ],
            label: "Discount Type"
          }
        )
      ] }),
      /* @__PURE__ */ d("div", { className: "cedros-admin__form-row", children: [
        /* @__PURE__ */ d("div", { className: "cedros-admin__field", children: [
          /* @__PURE__ */ d("label", { className: "cedros-admin__field-label", children: [
            "Discount Value ",
            v.discountType === "percentage" ? "(%)" : "($)"
          ] }),
          /* @__PURE__ */ o(
            "input",
            {
              type: "number",
              className: "cedros-admin__input",
              value: v.discountValue || "",
              onChange: (S) => f((A) => ({ ...A, discountValue: parseFloat(S.target.value) || 0 })),
              placeholder: v.discountType === "percentage" ? "e.g., 20" : "e.g., 10.00",
              min: "0",
              step: v.discountType === "percentage" ? "1" : "0.01",
              required: !0
            }
          )
        ] }),
        /* @__PURE__ */ d("div", { className: "cedros-admin__field", children: [
          /* @__PURE__ */ o("label", { className: "cedros-admin__field-label", children: "Usage Limit (optional)" }),
          /* @__PURE__ */ o(
            "input",
            {
              type: "number",
              className: "cedros-admin__input",
              value: v.usageLimit || "",
              onChange: (S) => f((A) => ({ ...A, usageLimit: S.target.value ? parseInt(S.target.value) : void 0 })),
              placeholder: "Leave empty for unlimited",
              min: "1"
            }
          )
        ] }),
        /* @__PURE__ */ d("div", { className: "cedros-admin__field", children: [
          /* @__PURE__ */ o("label", { className: "cedros-admin__field-label", children: "Expiration Date (optional)" }),
          /* @__PURE__ */ o(
            "input",
            {
              type: "date",
              className: "cedros-admin__input",
              value: v.expiresAt,
              onChange: (S) => f((A) => ({ ...A, expiresAt: S.target.value }))
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ d("div", { className: "cedros-admin__form-row", children: [
        /* @__PURE__ */ o(
          ft,
          {
            value: v.scope,
            onChange: (S) => f((A) => ({ ...A, scope: S })),
            options: [
              { value: "all_products", label: "All Products" },
              { value: "specific_products", label: "Specific Products" },
              { value: "specific_categories", label: "Specific Categories" }
            ],
            label: "Scope"
          }
        ),
        /* @__PURE__ */ o(
          ft,
          {
            value: v.paymentMethod,
            onChange: (S) => f((A) => ({ ...A, paymentMethod: S })),
            options: [
              { value: "any", label: "Any Payment Method" },
              { value: "stripe", label: "Stripe (Card) Only" },
              { value: "x402", label: "Crypto (x402) Only" },
              { value: "credits", label: "Credits Only" }
            ],
            label: "Payment Method"
          }
        ),
        /* @__PURE__ */ o(
          ft,
          {
            value: v.appliesAt,
            onChange: (S) => f((A) => ({ ...A, appliesAt: S })),
            options: [
              { value: "both", label: "Cart & Checkout" },
              { value: "cart", label: "Cart Only" },
              { value: "checkout", label: "Checkout Only" }
            ],
            label: "Applies At"
          }
        )
      ] }),
      v.scope === "specific_products" && /* @__PURE__ */ o("div", { className: "cedros-admin__form-row", children: /* @__PURE__ */ d("div", { className: "cedros-admin__field", style: { flex: 1 }, children: [
        /* @__PURE__ */ o("label", { className: "cedros-admin__field-label", children: "Product IDs" }),
        /* @__PURE__ */ o(
          "input",
          {
            type: "text",
            className: "cedros-admin__input",
            value: v.productIdsCsv,
            onChange: (S) => f((A) => ({ ...A, productIdsCsv: S.target.value })),
            placeholder: "e.g., prod_123, prod_456"
          }
        ),
        /* @__PURE__ */ o("div", { style: { marginTop: 4, fontSize: 12, opacity: 0.75 }, children: "Comma-separated product IDs this coupon applies to." })
      ] }) }),
      /* @__PURE__ */ d("div", { className: "cedros-admin__form-row", children: [
        /* @__PURE__ */ d("div", { className: "cedros-admin__field", children: [
          /* @__PURE__ */ o("label", { className: "cedros-admin__field-label", children: "Start Date (optional)" }),
          /* @__PURE__ */ o(
            "input",
            {
              type: "date",
              className: "cedros-admin__input",
              value: v.startsAt,
              onChange: (S) => f((A) => ({ ...A, startsAt: S.target.value }))
            }
          )
        ] }),
        /* @__PURE__ */ d("div", { className: "cedros-admin__field", children: [
          /* @__PURE__ */ o("label", { className: "cedros-admin__field-label", children: "Auto Apply" }),
          /* @__PURE__ */ d("label", { style: { display: "flex", alignItems: "center", gap: "0.5rem" }, children: [
            /* @__PURE__ */ o(
              "input",
              {
                type: "checkbox",
                checked: v.autoApply,
                onChange: (S) => f((A) => ({ ...A, autoApply: S.target.checked }))
              }
            ),
            "Automatically apply when conditions met"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ d("div", { className: "cedros-admin__form-row", children: [
        /* @__PURE__ */ d("div", { className: "cedros-admin__field", children: [
          /* @__PURE__ */ o("label", { className: "cedros-admin__field-label", children: "Minimum Purchase (USD)" }),
          /* @__PURE__ */ o(
            "input",
            {
              type: "number",
              className: "cedros-admin__input",
              value: v.minimumAmountUsd === "" ? "" : v.minimumAmountUsd,
              onChange: (S) => f((A) => ({ ...A, minimumAmountUsd: S.target.value === "" ? "" : parseFloat(S.target.value) || 0 })),
              placeholder: "e.g., 50.00",
              min: "0",
              step: "0.01"
            }
          )
        ] }),
        /* @__PURE__ */ d("div", { className: "cedros-admin__field", children: [
          /* @__PURE__ */ o("label", { className: "cedros-admin__field-label", children: "Per-Customer Limit" }),
          /* @__PURE__ */ o(
            "input",
            {
              type: "number",
              className: "cedros-admin__input",
              value: v.usageLimitPerCustomer || "",
              onChange: (S) => f((A) => ({ ...A, usageLimitPerCustomer: S.target.value ? parseInt(S.target.value) : void 0 })),
              placeholder: "Leave empty for unlimited",
              min: "1"
            }
          )
        ] }),
        /* @__PURE__ */ d("div", { className: "cedros-admin__field", children: [
          /* @__PURE__ */ o("label", { className: "cedros-admin__field-label", children: "First Purchase Only" }),
          /* @__PURE__ */ d("label", { style: { display: "flex", alignItems: "center", gap: "0.5rem" }, children: [
            /* @__PURE__ */ o(
              "input",
              {
                type: "checkbox",
                checked: v.firstPurchaseOnly,
                onChange: (S) => f((A) => ({ ...A, firstPurchaseOnly: S.target.checked }))
              }
            ),
            "New customers only"
          ] })
        ] })
      ] }),
      v.scope === "specific_categories" && /* @__PURE__ */ o("div", { className: "cedros-admin__form-row", children: /* @__PURE__ */ d("div", { className: "cedros-admin__field", style: { flex: 1 }, children: [
        /* @__PURE__ */ o("label", { className: "cedros-admin__field-label", children: "Category IDs" }),
        /* @__PURE__ */ o(
          "input",
          {
            type: "text",
            className: "cedros-admin__input",
            value: v.categoryIdsCsv,
            onChange: (S) => f((A) => ({ ...A, categoryIdsCsv: S.target.value })),
            placeholder: "e.g., cat_apparel, cat_accessories"
          }
        ),
        /* @__PURE__ */ o("div", { style: { marginTop: 4, fontSize: 12, opacity: 0.75 }, children: "Comma-separated category IDs this coupon applies to." })
      ] }) }),
      /* @__PURE__ */ o("div", { className: "cedros-admin__form-actions", children: /* @__PURE__ */ o("button", { type: "submit", className: "cedros-admin__button cedros-admin__button--primary", disabled: p, children: p ? "Creating..." : "Create Coupon" }) })
    ] }),
    s ? /* @__PURE__ */ d("div", { className: "cedros-admin__loading", children: [
      Y.loading,
      " Loading coupons..."
    ] }) : /* @__PURE__ */ o("div", { className: "cedros-admin__table-container", children: /* @__PURE__ */ d("table", { className: "cedros-admin__table", children: [
      /* @__PURE__ */ o("thead", { children: /* @__PURE__ */ d("tr", { children: [
        /* @__PURE__ */ o("th", { "aria-sort": h?.key === "code" ? h?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ d("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => x("code"), children: [
          "Code",
          N("code")
        ] }) }),
        /* @__PURE__ */ o("th", { "aria-sort": h?.key === "discount" ? h?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ d("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => x("discount"), children: [
          "Discount",
          N("discount")
        ] }) }),
        /* @__PURE__ */ o("th", { "aria-sort": h?.key === "usage" ? h?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ d("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => x("usage"), children: [
          "Usage",
          N("usage")
        ] }) }),
        /* @__PURE__ */ o("th", { "aria-sort": h?.key === "status" ? h?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ d("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => x("status"), children: [
          "Status",
          N("status")
        ] }) }),
        /* @__PURE__ */ o("th", { children: "Actions" })
      ] }) }),
      /* @__PURE__ */ o("tbody", { children: I.map((S) => /* @__PURE__ */ d("tr", { children: [
        /* @__PURE__ */ o("td", { children: /* @__PURE__ */ o("code", { children: S.code }) }),
        /* @__PURE__ */ o("td", { children: S.discountType === "percentage" ? `${S.discountValue}%` : `$${S.discountValue.toFixed(2)}` }),
        /* @__PURE__ */ d("td", { children: [
          S.usageCount,
          S.usageLimit ? ` / ${S.usageLimit}` : ""
        ] }),
        /* @__PURE__ */ o("td", { children: /* @__PURE__ */ o("span", { className: `cedros-admin__badge ${S.active ? "cedros-admin__badge--success" : "cedros-admin__badge--muted"}`, children: S.active ? "Active" : "Inactive" }) }),
        /* @__PURE__ */ o("td", { children: /* @__PURE__ */ o("button", { className: "cedros-admin__button cedros-admin__button--ghost", children: "Edit" }) })
      ] }, S.code)) })
    ] }) })
  ] });
}
function Xp({ serverUrl: e, apiKey: t, pageSize: n = 20, authManager: r }) {
  const [a, i] = H([]), [s, c] = H(!0), [l, u] = H(null), [p, m] = H([]), [h, g] = H(!0), [v, f] = H(null), [b, k] = H(null), [w, _] = H([]), [x, N] = H(!0), [I, S] = H(null), [A, W] = H(null), [C, T] = H(null), [P, L] = H("");
  ge(() => {
    (async () => {
      try {
        let ne;
        const ae = `/admin/refunds?limit=${n}`;
        if (r?.isAuthenticated())
          ne = await r.fetchWithAuth(ae);
        else {
          const be = { "Content-Type": "application/json" };
          t && (be["X-API-Key"] = t);
          const ke = await fetch(`${e}${ae}`, { headers: be });
          if (!ke.ok) throw new Error(`Failed to fetch x402 refunds: ${ke.status}`);
          ne = await ke.json();
        }
        i(ne.refunds || []);
      } catch (ne) {
        Ne().error("[RefundsSection] Failed to fetch x402 refunds:", ne, {
          serverUrl: e.slice(0, 20) + "...",
          hasApiKey: !!t
        }), i([
          { id: "ref_1", transactionId: "txn_42", amount: 29.99, currency: "usd", status: "pending", reason: "Customer request", createdAt: (/* @__PURE__ */ new Date()).toISOString() },
          { id: "ref_2", transactionId: "txn_38", amount: 5, currency: "usd", status: "completed", createdAt: new Date(Date.now() - 864e5).toISOString() }
        ]);
      } finally {
        c(!1);
      }
    })();
  }, [e, t, n, r]);
  const F = J(async () => {
    try {
      let z;
      const ne = `/admin/credits/refund-requests?status=pending&limit=${n}&offset=0`;
      if (r?.isAuthenticated())
        z = await r.fetchWithAuth(ne);
      else {
        const be = { "Content-Type": "application/json" };
        t && (be["X-API-Key"] = t);
        const ke = await fetch(`${e}${ne}`, { headers: be });
        if (!ke.ok) throw new Error(`Failed to fetch credits refund requests: ${ke.status}`);
        z = await ke.json();
      }
      const ae = Array.isArray(z) ? z : "refundRequests" in z ? z.refundRequests : z.requests || [];
      m(ae);
    } catch (z) {
      Ne().error("[RefundsSection] Failed to fetch credits refunds:", z, {
        serverUrl: e.slice(0, 20) + "...",
        hasApiKey: !!t
      }), m([
        {
          id: "crr_demo1",
          originalTransactionId: "ctx_demo1",
          userId: "user_demo1",
          amountLamports: 25e5,
          currency: "USD",
          status: "pending",
          reason: "Requested by customer",
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        }
      ]);
    } finally {
      g(!1);
    }
  }, [e, t, n, r]);
  ge(() => {
    F();
  }, [F]);
  const $ = async (z) => {
    f(z.id);
    try {
      const ne = `/admin/credits/refund-requests/${z.id}/process`, ae = JSON.stringify({ amountLamports: z.amountLamports, reason: z.reason });
      if (r?.isAuthenticated())
        await r.fetchWithAuth(ne, { method: "POST", body: ae });
      else {
        const be = { "Content-Type": "application/json" };
        t && (be["X-API-Key"] = t);
        const ke = await fetch(`${e}${ne}`, { method: "POST", headers: be, body: ae });
        if (!ke.ok) throw new Error(`Failed to process credits refund: ${ke.status}`);
      }
      await F();
    } catch (ne) {
      Ne().error("[RefundsSection] Failed to process credits refund:", ne, {
        serverUrl: e.slice(0, 20) + "...",
        hasApiKey: !!t,
        requestId: z.id
      }), m((ae) => ae.map((be) => be.id === z.id ? { ...be, status: "processed" } : be));
    } finally {
      f(null);
    }
  }, M = (z) => {
    L(z.reason ?? ""), T(z);
  }, D = () => {
    T(null), L("");
  }, O = async () => {
    if (!C) return;
    const z = C, ne = P;
    D(), f(z.id);
    try {
      const ae = `/admin/credits/refund-requests/${z.id}/reject`, be = JSON.stringify({ reason: ne });
      if (r?.isAuthenticated())
        await r.fetchWithAuth(ae, { method: "POST", body: be });
      else {
        const ke = { "Content-Type": "application/json" };
        t && (ke["X-API-Key"] = t);
        const De = await fetch(`${e}${ae}`, { method: "POST", headers: ke, body: be });
        if (!De.ok) throw new Error(`Failed to reject credits refund: ${De.status}`);
      }
      await F();
    } catch (ae) {
      Ne().error("[RefundsSection] Failed to reject credits refund:", ae, {
        serverUrl: e.slice(0, 20) + "...",
        hasApiKey: !!t,
        requestId: z.id
      }), m(
        (be) => be.map(
          (ke) => ke.id === z.id ? { ...ke, status: "rejected", rejectedAt: (/* @__PURE__ */ new Date()).toISOString(), rejectedReason: ne || null } : ke
        )
      );
    } finally {
      f(null);
    }
  }, V = J(async () => {
    try {
      let z;
      const ne = `/admin/stripe/refunds?limit=${n}`;
      if (r?.isAuthenticated())
        z = await r.fetchWithAuth(ne);
      else {
        const ae = { "Content-Type": "application/json" };
        t && (ae["X-API-Key"] = t);
        const be = await fetch(`${e}${ne}`, { headers: ae });
        if (!be.ok) throw new Error(`Failed to fetch Stripe refunds: ${be.status}`);
        z = await be.json();
      }
      _(z.refunds || []);
    } catch (z) {
      Ne().error("[RefundsSection] Failed to fetch Stripe refunds:", z, {
        serverUrl: e.slice(0, 20) + "...",
        hasApiKey: !!t
      }), _([
        {
          id: "rr_demo1",
          stripeRefundId: "re_demo1",
          chargeId: "ch_demo1",
          paymentIntentId: "pi_demo1",
          amount: 4999,
          currency: "usd",
          status: "succeeded",
          reason: "requested_by_customer",
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        },
        {
          id: "rr_demo2",
          stripeRefundId: null,
          chargeId: null,
          paymentIntentId: "pi_demo2",
          amount: 1500,
          currency: "usd",
          status: "pending",
          reason: "duplicate",
          createdAt: new Date(Date.now() - 36e5).toISOString()
        }
      ]);
    } finally {
      N(!1);
    }
  }, [e, t, n, r]);
  ge(() => {
    V();
  }, [V]);
  const E = async (z) => {
    S(z);
    try {
      const ne = `/admin/stripe/refunds/${z}/process`;
      if (r?.isAuthenticated())
        await r.fetchWithAuth(ne, { method: "POST" });
      else {
        const ae = { "Content-Type": "application/json" };
        t && (ae["X-API-Key"] = t);
        const be = await fetch(`${e}${ne}`, { method: "POST", headers: ae });
        if (!be.ok) throw new Error(`Failed to process refund: ${be.status}`);
      }
      await V();
    } catch (ne) {
      Ne().error("[RefundsSection] Failed to process Stripe refund:", ne, {
        serverUrl: e.slice(0, 20) + "...",
        hasApiKey: !!t,
        refundId: z
      }), _((ae) => ae.map(
        (be) => be.id === z ? { ...be, stripeRefundId: be.stripeRefundId ?? "re_demo_processed", status: "succeeded" } : be
      ));
    } finally {
      S(null);
    }
  }, q = (z, ne) => new Intl.NumberFormat("en-US", { style: "currency", currency: ne }).format(z / 100), re = (z) => z ? z.replace(/_/g, " ").replace(/\b\w/g, (ne) => ne.toUpperCase()) : "—", j = (z) => {
    switch (z) {
      case "processed":
        return "success";
      case "pending":
        return "pending";
      case "rejected":
      default:
        return "muted";
    }
  }, X = (z, ne) => ne ? ne.toLowerCase() === "usd" ? `${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(z / 1e6)} (USD credits)` : `${z.toLocaleString()} ${ne.toUpperCase()} (atomic)` : `${z.toLocaleString()} (atomic)`, te = (z) => {
    switch (z) {
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
  }, ve = (z) => z.stripeRefundId ?? "—", B = (z) => z.chargeId ?? "—", ee = w.filter((z) => z.status === "pending" || z.status === "requires_action").length, fe = p.filter((z) => z.status === "pending").length, G = a.filter((z) => z.status === "pending").length, oe = ee + fe + G, de = w.filter((z) => z.status === "succeeded").reduce((z, ne) => z + ne.amount, 0), he = p.filter((z) => z.status === "processed").reduce((z, ne) => z + ne.amountLamports, 0), Fe = a.filter((z) => z.status === "completed").reduce((z, ne) => z + ne.amount, 0), Xe = de / 100 + he / 1e6 + Fe, et = (z) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(z), We = x || h || s, tt = (z) => {
    W((ne) => !ne || ne.key !== z ? { key: z, direction: "asc" } : { key: z, direction: ne.direction === "asc" ? "desc" : "asc" });
  }, Ie = (z) => {
    k((ne) => !ne || ne.key !== z ? { key: z, direction: "asc" } : { key: z, direction: ne.direction === "asc" ? "desc" : "asc" });
  }, lt = (z) => {
    u((ne) => !ne || ne.key !== z ? { key: z, direction: "asc" } : { key: z, direction: ne.direction === "asc" ? "desc" : "asc" });
  }, Re = (z, ne) => !z || !ne ? /* @__PURE__ */ o("span", { className: "cedros-admin__sort-icon cedros-admin__sort-icon--idle", children: Y.chevronUp }) : /* @__PURE__ */ o("span", { className: "cedros-admin__sort-icon", children: ne === "asc" ? Y.chevronUp : Y.chevronDown }), He = Te(() => {
    if (!A) return w;
    const z = A.direction === "asc" ? 1 : -1, ne = (ae) => {
      switch (A.key) {
        case "stripe":
          return ae.stripeRefundId ?? "";
        case "charge":
          return ae.chargeId ?? "";
        case "amount":
          return ae.amount ?? 0;
        case "reason":
          return ae.reason ?? "";
        case "status":
          return ae.status ?? "";
        case "date":
          return new Date(ae.createdAt).getTime();
        case "id":
        default:
          return ae.id;
      }
    };
    return [...w].sort((ae, be) => {
      const ke = ne(ae), De = ne(be);
      return typeof ke == "number" && typeof De == "number" ? (ke - De) * z : String(ke).localeCompare(String(De), void 0, { sensitivity: "base" }) * z;
    });
  }, [w, A]), me = Te(() => {
    if (!b) return p;
    const z = b.direction === "asc" ? 1 : -1, ne = (ae) => {
      switch (b.key) {
        case "original":
          return ae.originalTransactionId ?? "";
        case "user":
          return ae.userId ?? "";
        case "amount":
          return ae.amountLamports ?? 0;
        case "reason":
          return ae.reason ?? "";
        case "status":
          return ae.status ?? "";
        case "date":
          return new Date(ae.createdAt).getTime();
        case "id":
        default:
          return ae.id;
      }
    };
    return [...p].sort((ae, be) => {
      const ke = ne(ae), De = ne(be);
      return typeof ke == "number" && typeof De == "number" ? (ke - De) * z : String(ke).localeCompare(String(De), void 0, { sensitivity: "base" }) * z;
    });
  }, [p, b]), Pe = Te(() => {
    if (!l) return a;
    const z = l.direction === "asc" ? 1 : -1, ne = (ae) => {
      switch (l.key) {
        case "transaction":
          return ae.transactionId ?? "";
        case "amount":
          return ae.amount ?? 0;
        case "reason":
          return ae.reason ?? "";
        case "status":
          return ae.status ?? "";
        case "date":
          return new Date(ae.createdAt).getTime();
        case "id":
        default:
          return ae.id;
      }
    };
    return [...a].sort((ae, be) => {
      const ke = ne(ae), De = ne(be);
      return typeof ke == "number" && typeof De == "number" ? (ke - De) * z : String(ke).localeCompare(String(De), void 0, { sensitivity: "base" }) * z;
    });
  }, [a, l]);
  return /* @__PURE__ */ d("div", { className: "cedros-admin__page", children: [
    /* @__PURE__ */ o(
      rr,
      {
        stats: [
          { label: "Pending", value: oe, variant: oe > 0 ? "warning" : "muted" },
          { label: "Card Pending", value: ee, description: "Stripe" },
          { label: "Credits Pending", value: fe },
          { label: "Crypto Pending", value: G, description: "x402" },
          { label: "Total Refunded", value: et(Xe), variant: "success" }
        ],
        isLoading: We
      }
    ),
    /* @__PURE__ */ o("div", { className: "cedros-admin__section-header", children: /* @__PURE__ */ o("h3", { className: "cedros-admin__section-title", children: "Stripe Refund Requests" }) }),
    x ? /* @__PURE__ */ d("div", { className: "cedros-admin__loading", children: [
      Y.loading,
      " Loading Stripe refunds..."
    ] }) : w.length === 0 ? /* @__PURE__ */ o("div", { className: "cedros-admin__empty", children: "No Stripe refund requests found." }) : /* @__PURE__ */ o("div", { className: "cedros-admin__table-container", children: /* @__PURE__ */ d("table", { className: "cedros-admin__table", children: [
      /* @__PURE__ */ o("thead", { children: /* @__PURE__ */ d("tr", { children: [
        /* @__PURE__ */ o("th", { "aria-sort": A?.key === "id" ? A?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ d("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => tt("id"), children: [
          "Request ID",
          Re(A?.key === "id", A?.direction)
        ] }) }),
        /* @__PURE__ */ o("th", { "aria-sort": A?.key === "stripe" ? A?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ d("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => tt("stripe"), children: [
          "Stripe Refund ID",
          Re(A?.key === "stripe", A?.direction)
        ] }) }),
        /* @__PURE__ */ o("th", { "aria-sort": A?.key === "charge" ? A?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ d("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => tt("charge"), children: [
          "Charge",
          Re(A?.key === "charge", A?.direction)
        ] }) }),
        /* @__PURE__ */ o("th", { "aria-sort": A?.key === "amount" ? A?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ d("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => tt("amount"), children: [
          "Amount",
          Re(A?.key === "amount", A?.direction)
        ] }) }),
        /* @__PURE__ */ o("th", { "aria-sort": A?.key === "reason" ? A?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ d("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => tt("reason"), children: [
          "Reason",
          Re(A?.key === "reason", A?.direction)
        ] }) }),
        /* @__PURE__ */ o("th", { "aria-sort": A?.key === "status" ? A?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ d("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => tt("status"), children: [
          "Status",
          Re(A?.key === "status", A?.direction)
        ] }) }),
        /* @__PURE__ */ o("th", { "aria-sort": A?.key === "date" ? A?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ d("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => tt("date"), children: [
          "Date",
          Re(A?.key === "date", A?.direction)
        ] }) }),
        /* @__PURE__ */ o("th", { children: "Actions" })
      ] }) }),
      /* @__PURE__ */ o("tbody", { children: He.map((z) => /* @__PURE__ */ d("tr", { children: [
        /* @__PURE__ */ o("td", { children: /* @__PURE__ */ o("code", { children: z.id }) }),
        /* @__PURE__ */ o("td", { children: /* @__PURE__ */ o("code", { children: ve(z) }) }),
        /* @__PURE__ */ o("td", { children: /* @__PURE__ */ o("code", { children: B(z) }) }),
        /* @__PURE__ */ o("td", { children: q(z.amount, z.currency) }),
        /* @__PURE__ */ o("td", { children: re(z.reason) }),
        /* @__PURE__ */ o("td", { children: /* @__PURE__ */ o("span", { className: `cedros-admin__badge cedros-admin__badge--${te(z.status)}`, children: z.status }) }),
        /* @__PURE__ */ o("td", { children: kr(z.createdAt) }),
        /* @__PURE__ */ o("td", { children: (z.status === "pending" || z.status === "requires_action") && /* @__PURE__ */ o(
          "button",
          {
            className: "cedros-admin__button cedros-admin__button--primary cedros-admin__button--sm",
            onClick: () => E(z.id),
            disabled: I === z.id,
            children: I === z.id ? "Processing..." : "Process"
          }
        ) })
      ] }, z.id)) })
    ] }) }),
    /* @__PURE__ */ o("div", { className: "cedros-admin__section-header", style: { marginTop: "2rem" }, children: /* @__PURE__ */ o("h3", { className: "cedros-admin__section-title", children: "Credits Refund Requests" }) }),
    h ? /* @__PURE__ */ d("div", { className: "cedros-admin__loading", children: [
      Y.loading,
      " Loading credits refunds..."
    ] }) : p.length === 0 ? /* @__PURE__ */ o("div", { className: "cedros-admin__empty", children: "No credits refund requests found." }) : /* @__PURE__ */ o("div", { className: "cedros-admin__table-container", children: /* @__PURE__ */ d("table", { className: "cedros-admin__table", children: [
      /* @__PURE__ */ o("thead", { children: /* @__PURE__ */ d("tr", { children: [
        /* @__PURE__ */ o("th", { "aria-sort": b?.key === "id" ? b?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ d("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => Ie("id"), children: [
          "Request ID",
          Re(b?.key === "id", b?.direction)
        ] }) }),
        /* @__PURE__ */ o("th", { "aria-sort": b?.key === "original" ? b?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ d("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => Ie("original"), children: [
          "Original Tx",
          Re(b?.key === "original", b?.direction)
        ] }) }),
        /* @__PURE__ */ o("th", { "aria-sort": b?.key === "user" ? b?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ d("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => Ie("user"), children: [
          "User",
          Re(b?.key === "user", b?.direction)
        ] }) }),
        /* @__PURE__ */ o("th", { "aria-sort": b?.key === "amount" ? b?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ d("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => Ie("amount"), children: [
          "Amount",
          Re(b?.key === "amount", b?.direction)
        ] }) }),
        /* @__PURE__ */ o("th", { "aria-sort": b?.key === "reason" ? b?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ d("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => Ie("reason"), children: [
          "Reason",
          Re(b?.key === "reason", b?.direction)
        ] }) }),
        /* @__PURE__ */ o("th", { "aria-sort": b?.key === "status" ? b?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ d("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => Ie("status"), children: [
          "Status",
          Re(b?.key === "status", b?.direction)
        ] }) }),
        /* @__PURE__ */ o("th", { "aria-sort": b?.key === "date" ? b?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ d("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => Ie("date"), children: [
          "Date",
          Re(b?.key === "date", b?.direction)
        ] }) }),
        /* @__PURE__ */ o("th", { children: "Actions" })
      ] }) }),
      /* @__PURE__ */ o("tbody", { children: me.map((z) => /* @__PURE__ */ d("tr", { children: [
        /* @__PURE__ */ o("td", { children: /* @__PURE__ */ o("code", { children: z.id }) }),
        /* @__PURE__ */ o("td", { children: /* @__PURE__ */ o("code", { children: z.originalTransactionId }) }),
        /* @__PURE__ */ o("td", { children: /* @__PURE__ */ o("code", { children: z.userId ?? "—" }) }),
        /* @__PURE__ */ o("td", { children: X(z.amountLamports, z.currency) }),
        /* @__PURE__ */ o("td", { children: z.reason ?? "—" }),
        /* @__PURE__ */ o("td", { children: /* @__PURE__ */ o("span", { className: `cedros-admin__badge cedros-admin__badge--${j(z.status)}`, children: z.status }) }),
        /* @__PURE__ */ o("td", { children: kr(z.createdAt) }),
        /* @__PURE__ */ o("td", { children: z.status === "pending" ? /* @__PURE__ */ d("div", { style: { display: "flex", gap: "0.5rem" }, children: [
          /* @__PURE__ */ o(
            "button",
            {
              className: "cedros-admin__button cedros-admin__button--primary cedros-admin__button--sm",
              onClick: () => $(z),
              disabled: v === z.id,
              children: v === z.id ? "Processing..." : "Process"
            }
          ),
          /* @__PURE__ */ o(
            "button",
            {
              className: "cedros-admin__button cedros-admin__button--outline cedros-admin__button--danger cedros-admin__button--sm",
              onClick: () => M(z),
              disabled: v === z.id,
              children: "Reject"
            }
          )
        ] }) : null })
      ] }, z.id)) })
    ] }) }),
    /* @__PURE__ */ o("div", { className: "cedros-admin__section-header", style: { marginTop: "2rem" }, children: /* @__PURE__ */ o("h3", { className: "cedros-admin__section-title", children: "x402 Refund Requests" }) }),
    s ? /* @__PURE__ */ d("div", { className: "cedros-admin__loading", children: [
      Y.loading,
      " Loading x402 refunds..."
    ] }) : a.length === 0 ? /* @__PURE__ */ o("div", { className: "cedros-admin__empty", children: "No x402 refund requests found." }) : /* @__PURE__ */ o("div", { className: "cedros-admin__table-container", children: /* @__PURE__ */ d("table", { className: "cedros-admin__table", children: [
      /* @__PURE__ */ o("thead", { children: /* @__PURE__ */ d("tr", { children: [
        /* @__PURE__ */ o("th", { "aria-sort": l?.key === "id" ? l?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ d("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => lt("id"), children: [
          "ID",
          Re(l?.key === "id", l?.direction)
        ] }) }),
        /* @__PURE__ */ o("th", { "aria-sort": l?.key === "transaction" ? l?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ d("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => lt("transaction"), children: [
          "Transaction",
          Re(l?.key === "transaction", l?.direction)
        ] }) }),
        /* @__PURE__ */ o("th", { "aria-sort": l?.key === "amount" ? l?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ d("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => lt("amount"), children: [
          "Amount",
          Re(l?.key === "amount", l?.direction)
        ] }) }),
        /* @__PURE__ */ o("th", { "aria-sort": l?.key === "reason" ? l?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ d("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => lt("reason"), children: [
          "Reason",
          Re(l?.key === "reason", l?.direction)
        ] }) }),
        /* @__PURE__ */ o("th", { "aria-sort": l?.key === "status" ? l?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ d("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => lt("status"), children: [
          "Status",
          Re(l?.key === "status", l?.direction)
        ] }) }),
        /* @__PURE__ */ o("th", { "aria-sort": l?.key === "date" ? l?.direction === "asc" ? "ascending" : "descending" : "none", children: /* @__PURE__ */ d("button", { type: "button", className: "cedros-admin__table-sort", onClick: () => lt("date"), children: [
          "Date",
          Re(l?.key === "date", l?.direction)
        ] }) }),
        /* @__PURE__ */ o("th", { children: "Actions" })
      ] }) }),
      /* @__PURE__ */ o("tbody", { children: Pe.map((z) => /* @__PURE__ */ d("tr", { children: [
        /* @__PURE__ */ o("td", { children: /* @__PURE__ */ o("code", { children: z.id }) }),
        /* @__PURE__ */ o("td", { children: /* @__PURE__ */ o("code", { children: z.transactionId }) }),
        /* @__PURE__ */ d("td", { children: [
          "$",
          z.amount.toFixed(2)
        ] }),
        /* @__PURE__ */ o("td", { children: z.reason || "—" }),
        /* @__PURE__ */ o("td", { children: /* @__PURE__ */ o("span", { className: `cedros-admin__badge cedros-admin__badge--${z.status}`, children: z.status }) }),
        /* @__PURE__ */ o("td", { children: kr(z.createdAt) }),
        /* @__PURE__ */ o("td", { children: z.status === "pending" && /* @__PURE__ */ o("button", { className: "cedros-admin__button cedros-admin__button--primary cedros-admin__button--sm", children: "Process" }) })
      ] }, z.id)) })
    ] }) }),
    C && /* @__PURE__ */ o("div", { className: "cedros-admin__modal-overlay", onClick: D, children: /* @__PURE__ */ d(
      "div",
      {
        className: "cedros-admin__modal",
        onClick: (z) => z.stopPropagation(),
        children: [
          /* @__PURE__ */ d("div", { className: "cedros-admin__modal-header", children: [
            /* @__PURE__ */ o("h3", { className: "cedros-admin__modal-title", children: "Reject Refund Request" }),
            /* @__PURE__ */ o(
              "button",
              {
                type: "button",
                className: "cedros-admin__modal-close",
                onClick: D,
                "aria-label": "Close",
                children: Y.close
              }
            )
          ] }),
          /* @__PURE__ */ d("div", { className: "cedros-admin__modal-body", children: [
            /* @__PURE__ */ d("p", { style: { marginBottom: "1rem", color: "var(--admin-muted)" }, children: [
              "Rejecting refund request ",
              /* @__PURE__ */ o("code", { children: C.id }),
              " for ",
              X(C.amountLamports, C.currency),
              "."
            ] }),
            /* @__PURE__ */ d("label", { className: "cedros-admin__form-field", children: [
              /* @__PURE__ */ o("span", { className: "cedros-admin__form-label", children: "Reason (optional)" }),
              /* @__PURE__ */ o(
                "textarea",
                {
                  className: "cedros-admin__input",
                  value: P,
                  onChange: (z) => L(z.target.value),
                  placeholder: "Enter rejection reason...",
                  rows: 3,
                  style: { resize: "vertical" }
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ d("div", { className: "cedros-admin__modal-footer", children: [
            /* @__PURE__ */ o(
              "button",
              {
                type: "button",
                className: "cedros-admin__button cedros-admin__button--outline",
                onClick: D,
                children: "Cancel"
              }
            ),
            /* @__PURE__ */ o(
              "button",
              {
                type: "button",
                className: "cedros-admin__button cedros-admin__button--primary cedros-admin__button--danger",
                onClick: O,
                children: "Reject Refund"
              }
            )
          ] })
        ]
      }
    ) })
  ] });
}
async function ef(e) {
  const t = `${Date.now()}-${Math.random().toString(36).slice(2)}`, n = await e.sign(t);
  return {
    "X-Signer": e.signerPublicKey,
    "X-Message": t,
    "X-Signature": n,
    "Content-Type": "application/json"
  };
}
class tf {
  constructor(t, n, r) {
    this.serverUrl = t, this.auth = n, this.authManager = r;
  }
  async fetch(t, n = {}) {
    if (this.authManager?.isAuthenticated())
      return this.authManager.fetchWithAuth(t, n);
    const r = {
      "Content-Type": "application/json",
      ...n.headers || {}
    };
    if (this.auth) {
      const i = await ef(this.auth);
      Object.assign(r, i);
    }
    const a = await fetch(`${this.serverUrl}${t}`, {
      ...n,
      headers: r
    });
    if (!a.ok) {
      const i = await a.text();
      throw new Error(`API error ${a.status}: ${i}`);
    }
    return a.json();
  }
  /** List all config categories */
  async listCategories(t = 100) {
    return this.fetch(`/admin/config?limit=${t}`);
  }
  /** Get config for a category */
  async getConfig(t, n = !0) {
    return this.fetch(`/admin/config/${t}?redact_secrets=${n}`);
  }
  /** Full update - replace entire category config */
  async updateConfig(t, n, r) {
    await this.fetch(`/admin/config/${t}`, {
      method: "PUT",
      body: JSON.stringify({ config: n, description: r })
    });
  }
  /** Partial update - update specific keys */
  async patchConfig(t, n, r) {
    await this.fetch(`/admin/config/${t}`, {
      method: "PATCH",
      body: JSON.stringify({ updates: n, description: r })
    });
  }
  /** Batch update multiple categories */
  async batchUpdate(t) {
    await this.fetch("/admin/config/batch", {
      method: "POST",
      body: JSON.stringify({ updates: t })
    });
  }
  /** Validate config before saving */
  async validateConfig(t, n) {
    return this.fetch("/admin/config/validate", {
      method: "POST",
      body: JSON.stringify({ category: t, config: n })
    });
  }
  /** Get config change history */
  async getHistory(t, n = 50) {
    const r = new URLSearchParams({ limit: n.toString() });
    return t && r.set("category", t), this.fetch(`/admin/config/history?${r}`);
  }
}
const xi = {
  server: {
    label: "Server",
    secrets: [],
    icon: "🖥️",
    fields: {
      admin_metrics_api_key: { hidden: !0 },
      // Moved to metrics tab
      cors_allowed_origins: { hidden: !0 }
      // Moved to security tab
    }
  },
  security: {
    label: "Security",
    description: "Configure CORS, rate limiting, and other security settings",
    secrets: [],
    icon: "🔒",
    fields: {
      cors_allowed_origins: {
        description: 'List of allowed origins for CORS requests. Use ["*"] to allow all origins (not recommended for production).'
      }
    }
  },
  metrics: {
    label: "Metrics",
    description: "Configure metrics collection and API access",
    secrets: ["admin_metrics_api_key"],
    icon: "📊",
    fields: {
      admin_metrics_api_key: {
        description: "API key for accessing the admin metrics endpoint. Keep this secret."
      }
    }
  },
  logging: {
    label: "Logging",
    secrets: [],
    icon: "📝",
    fields: {
      level: { type: "dropdown", options: ["trace", "debug", "info", "warn", "error"] },
      format: { hidden: !0 },
      // Developer setting
      environment: { hidden: !0 }
      // Developer setting
    }
  },
  stripe: {
    label: "Stripe",
    secrets: ["secret_key", "webhook_secret"],
    icon: "💳",
    fields: {
      enabled: { hidden: !0 },
      // Shown in header toggle
      mode: { type: "dropdown", options: ["test", "live"] },
      success_url: { hidden: !0 },
      // Library provides default pages
      cancel_url: { hidden: !0 }
      // Library provides default pages
    }
  },
  x402: {
    label: "X402 (Crypto)",
    secrets: ["server_wallets"],
    icon: "⚡",
    fields: {
      enabled: { hidden: !0 },
      // Shown in header toggle
      payment_address: {
        type: "solana_address",
        description: "The Solana wallet address where payments are received. This is where customer funds are sent."
      },
      token_mint: {
        type: "token_mint",
        description: "The SPL token used for payments. Most commonly USDC."
      },
      token_decimals: {
        type: "number",
        description: "Number of decimal places for the token (e.g., USDC has 6 decimals).",
        hidden: !0
        // Managed by token_mint selector
      },
      custom_token_symbol: {
        description: 'Display symbol for your custom token (e.g., "MYTOKEN").',
        hidden: !0
        // Managed by token_mint selector
      },
      custom_token_icon: {
        description: "URL to your token's icon image.",
        hidden: !0
        // Managed by token_mint selector
      },
      rpc_url: {
        description: "Custom Solana RPC endpoint. Leave empty to use the default public RPC."
      },
      gasless_enabled: {
        type: "toggle",
        description: "When enabled, your server pays transaction fees so customers don't need SOL."
      },
      server_wallets: {
        type: "secret_array",
        description: "Server keypair(s) used to sign and pay for transactions. Required for gasless payments.",
        showWhen: "gasless_enabled"
      },
      network: { hidden: !0 }
    }
  },
  paywall: {
    label: "Paywall",
    secrets: [],
    icon: "🚪",
    fields: {
      product_cache_ttl: { type: "number", unit: "seconds" }
    }
  },
  coupons: {
    label: "Coupons",
    secrets: [],
    icon: "🎟️",
    fields: {
      cache_ttl: { type: "number", unit: "seconds" }
    }
  },
  subscriptions: {
    label: "Subscriptions",
    secrets: [],
    icon: "🔄",
    fields: {
      grace_period_hours: { type: "number", unit: "hours" }
    }
  },
  callbacks: {
    label: "Callbacks",
    secrets: ["hmac_secret"],
    icon: "🔔"
  },
  email: {
    label: "Email",
    description: "Email receipts for customers after purchase",
    secrets: ["smtp_password"],
    icon: "📧",
    fields: {
      enabled: { hidden: !0 },
      // Shown in header toggle
      provider: {
        type: "dropdown",
        options: ["sendgrid", "mailgun", "postmark", "ses", "resend", "custom"],
        description: "Email service provider."
      },
      smtp_host: {
        description: "SMTP server hostname.",
        showWhen: "provider"
      },
      smtp_port: {
        type: "number",
        description: "SMTP server port (typically 587 for TLS).",
        showWhen: "provider"
      },
      smtp_user: {
        description: "SMTP authentication username or API key name.",
        showWhen: "provider"
      },
      smtp_password: {
        description: "SMTP password or API key.",
        showWhen: "provider"
      },
      from_address: {
        description: "Sender email address (e.g., orders@yourstore.com)."
      },
      from_name: {
        description: 'Sender display name (e.g., "Your Store").'
      }
    }
  },
  webhook: {
    label: "Webhook",
    description: "HTTP notifications when purchases occur",
    secrets: ["secret"],
    icon: "🔔",
    fields: {
      enabled: { hidden: !0 },
      // Shown in header toggle
      url: {
        description: "URL to receive POST notifications (e.g., https://api.yoursite.com/webhooks/orders)."
      },
      secret: {
        description: "Shared secret for HMAC-SHA256 signature verification."
      },
      retry_attempts: {
        type: "number",
        description: "Number of retry attempts on failure (default: 3)."
      }
    }
  },
  messaging: {
    label: "Messaging",
    description: "Email and webhook notifications for purchases",
    secrets: ["smtp_password", "webhook_secret"],
    icon: "📬",
    fields: {
      // Email settings
      email_enabled: {
        type: "boolean",
        description: "Send order confirmation emails to customers."
      },
      smtp_host: {
        description: "SMTP server hostname.",
        showWhen: "email_enabled"
      },
      smtp_port: {
        type: "number",
        description: "SMTP server port (typically 587 for TLS).",
        showWhen: "email_enabled"
      },
      smtp_username: {
        description: "SMTP authentication username or API key.",
        showWhen: "email_enabled"
      },
      smtp_password: {
        description: "SMTP password or API key.",
        showWhen: "email_enabled"
      },
      from_email: {
        description: "Sender email address (e.g., orders@yourstore.com).",
        showWhen: "email_enabled"
      },
      from_name: {
        description: 'Sender display name (e.g., "Your Store").',
        showWhen: "email_enabled"
      },
      // Webhook settings
      webhook_enabled: {
        type: "boolean",
        description: "Send webhook notifications when purchases complete."
      },
      webhook_url: {
        description: "URL to receive POST notifications.",
        showWhen: "webhook_enabled"
      },
      webhook_secret: {
        description: "Shared secret for HMAC-SHA256 signature verification.",
        showWhen: "webhook_enabled"
      },
      webhook_timeout: {
        type: "number",
        description: "Request timeout in seconds (default: 30).",
        showWhen: "webhook_enabled"
      }
    }
  },
  monitoring: {
    label: "Monitoring",
    secrets: [],
    icon: "📊",
    fields: {
      check_interval: { type: "number", unit: "seconds" },
      low_balance_threshold: { type: "number", unit: "SOL" }
    }
  },
  rate_limit: {
    label: "Rate Limiting",
    secrets: [],
    icon: "⏱️"
  },
  circuit_breaker: {
    label: "Circuit Breaker",
    secrets: [],
    icon: "🔌"
  },
  admin: {
    label: "Admin Keys",
    secrets: [],
    icon: "👤"
  },
  api_keys: {
    label: "API Keys",
    secrets: [],
    icon: "🔐"
  },
  cedros_login: {
    label: "Cedros Login",
    secrets: ["api_key"],
    icon: "🔑",
    fields: {
      enabled: { hidden: !0 },
      // Shown in header toggle
      credits_enabled: { hidden: !0 },
      // Shown in header toggle when relevant
      base_url: { hidden: !0 },
      // Deployment setting
      timeout: { hidden: !0 }
      // Developer setting
    }
  },
  storefront: {
    label: "Storefront",
    description: "Product pages & display settings",
    secrets: [],
    icon: "🏪",
    fields: {
      "relatedProducts.mode": {
        type: "dropdown",
        options: ["most_recent", "by_category", "manual", "ai"]
      },
      "relatedProducts.maxItems": { type: "number" }
    }
  }
};
function yl(e, t) {
  return xi[e]?.secrets.includes(t) ?? !1;
}
const Nt = "[REDACTED]";
function ki({
  data: e,
  onSave: t,
  debounceMs: n = 1500,
  savedDurationMs: r = 2e3,
  enabled: a = !0,
  skipInitial: i = !0
}) {
  const [s, c] = H("idle"), [l, u] = H(null), p = gt(!0), m = gt(null), h = gt(null), g = gt(e);
  g.current = e;
  const v = J(async () => {
    c("saving"), u(null);
    try {
      await t(g.current), c("saved"), h.current = setTimeout(() => {
        c("idle");
      }, r);
    } catch (k) {
      c("error"), u(k instanceof Error ? k.message : "Save failed");
    }
  }, [t, r]), f = J(async () => {
    m.current && (clearTimeout(m.current), m.current = null), await v();
  }, [v]), b = J(() => {
    c("idle"), u(null);
  }, []);
  return ge(() => {
    if (a) {
      if (i && p.current) {
        p.current = !1;
        return;
      }
      return m.current && clearTimeout(m.current), h.current && clearTimeout(h.current), c("pending"), m.current = setTimeout(() => {
        v();
      }, n), () => {
        m.current && clearTimeout(m.current);
      };
    }
  }, [e, a, i, n, v]), ge(() => () => {
    m.current && clearTimeout(m.current), h.current && clearTimeout(h.current);
  }, []), { status: s, error: l, saveNow: f, reset: b };
}
function nf(e) {
  if (!e || e.trim() === "")
    return { valid: !0 };
  try {
    return new $p(e.trim()), { valid: !0 };
  } catch {
    return { valid: !1, error: "Invalid Solana address" };
  }
}
function Us(e, t, n) {
  const r = yl(e, t), a = t.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()), s = xi[e]?.fields?.[t], c = {
    isSecret: r,
    label: a,
    description: s?.description,
    hidden: s?.hidden,
    showWhen: s?.showWhen
  };
  return s?.type === "dropdown" && s.options ? { ...c, type: "dropdown", options: s.options } : s?.type === "token_mint" ? { ...c, type: "token_mint" } : s?.type === "toggle" ? { ...c, type: "toggle" } : s?.type === "secret_array" ? { ...c, type: "secret_array", isSecret: !0 } : s?.type === "solana_address" ? { ...c, type: "solana_address" } : s?.type === "number" ? { ...c, type: "number", unit: s.unit } : typeof n == "boolean" ? { ...c, type: "boolean" } : typeof n == "number" ? { ...c, type: "number", unit: s?.unit } : Array.isArray(n) ? { ...c, type: "array" } : typeof n == "object" && n !== null ? { ...c, type: "object" } : { ...c, type: "string" };
}
function rf({
  category: e,
  config: t,
  originalConfig: n,
  isLoading: r = !1,
  onSave: a
}) {
  const [i, s] = H(t), [c, l] = H(/* @__PURE__ */ new Set());
  ge(() => {
    s(t);
  }, [t]);
  const u = Te(() => {
    const w = { ...i };
    for (const _ of Object.keys(w))
      if (yl(e, _)) {
        const x = n[_], N = w[_];
        (N === Nt || N === x) && (w[_] = Nt);
      }
    return w;
  }, [i, n, e]), { status: p, error: m } = ki({
    data: u,
    onSave: a,
    debounceMs: 1500
  }), h = J((w, _) => {
    s((x) => ({ ...x, [w]: _ }));
  }, []), g = J((w) => {
    l((_) => {
      const x = new Set(_);
      return x.has(w) ? x.delete(w) : x.add(w), x;
    });
  }, []), v = (w) => w ? /* @__PURE__ */ o("div", { style: {
    fontSize: "0.75rem",
    color: "var(--cedros-admin-text-muted, #64748b)",
    marginTop: "0.25rem"
  }, children: w }) : null, f = (w, _) => {
    const x = Us(e, w, n[w] ?? _);
    if (x.type === "dropdown" && x.options)
      return /* @__PURE__ */ o(
        ft,
        {
          value: _,
          onChange: (S) => h(w, S),
          options: x.options.map((S) => ({ value: S, label: S })),
          label: x.label,
          description: x.description,
          disabled: r
        }
      );
    if (x.type === "token_mint")
      return /* @__PURE__ */ o(
        of,
        {
          label: x.label,
          value: _,
          onChange: (S) => h(w, S),
          decimals: i.token_decimals ?? 6,
          onDecimalsChange: (S) => h("token_decimals", S),
          disabled: r,
          description: x.description,
          customSymbol: i.custom_token_symbol || "",
          customIcon: i.custom_token_icon || "",
          onCustomSymbolChange: (S) => h("custom_token_symbol", S),
          onCustomIconChange: (S) => h("custom_token_icon", S)
        }
      );
    if (x.type === "toggle")
      return /* @__PURE__ */ d("div", { className: "cedros-admin__field", children: [
        /* @__PURE__ */ d("div", { style: { display: "flex", alignItems: "center", gap: "0.75rem" }, children: [
          /* @__PURE__ */ o(
            "button",
            {
              type: "button",
              role: "switch",
              "aria-checked": _,
              onClick: () => h(w, !_),
              disabled: r,
              style: {
                width: 44,
                height: 24,
                borderRadius: 12,
                border: "none",
                backgroundColor: _ ? "var(--cedros-admin-primary, #171717)" : "var(--cedros-admin-border, #d4d4d4)",
                cursor: r ? "not-allowed" : "pointer",
                position: "relative",
                transition: "background-color 0.2s",
                opacity: r ? 0.5 : 1,
                flexShrink: 0
              },
              children: /* @__PURE__ */ o(
                "span",
                {
                  style: {
                    position: "absolute",
                    top: 2,
                    left: _ ? 22 : 2,
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    backgroundColor: "#fff",
                    transition: "left 0.2s",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
                  }
                }
              )
            }
          ),
          /* @__PURE__ */ o("span", { className: "cedros-admin__field-label", style: { marginBottom: 0 }, children: x.label })
        ] }),
        v(x.description)
      ] });
    if (x.type === "solana_address") {
      const S = _ || "", A = nf(S);
      return /* @__PURE__ */ d("div", { className: "cedros-admin__field", children: [
        /* @__PURE__ */ o("label", { className: "cedros-admin__field-label", children: x.label }),
        /* @__PURE__ */ d("div", { style: { position: "relative" }, children: [
          /* @__PURE__ */ o(
            "input",
            {
              type: "text",
              className: `cedros-admin__input ${A.valid ? "" : "cedros-admin__input--error"}`,
              value: S,
              onChange: (W) => h(w, W.target.value),
              disabled: r,
              placeholder: "e.g. 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
              style: {
                width: "100%",
                fontFamily: "monospace",
                fontSize: "0.875rem",
                borderColor: A.valid ? void 0 : "var(--cedros-admin-error, #dc2626)",
                paddingRight: S && A.valid ? "2rem" : void 0
              }
            }
          ),
          S && A.valid && /* @__PURE__ */ o(
            "span",
            {
              style: {
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--cedros-admin-success, #16a34a)",
                fontSize: "1rem"
              },
              title: "Valid Solana address",
              children: "✓"
            }
          )
        ] }),
        !A.valid && /* @__PURE__ */ o("span", { style: { color: "var(--cedros-admin-error, #dc2626)", fontSize: "0.75rem", marginTop: "0.25rem", display: "block" }, children: A.error }),
        v(x.description)
      ] });
    }
    if (x.type === "boolean")
      return /* @__PURE__ */ d("div", { className: "cedros-admin__field", children: [
        /* @__PURE__ */ d("label", { className: "cedros-admin__checkbox", children: [
          /* @__PURE__ */ o(
            "input",
            {
              type: "checkbox",
              checked: _,
              onChange: (S) => h(w, S.target.checked),
              disabled: r
            }
          ),
          x.label
        ] }),
        v(x.description)
      ] });
    if (x.type === "number")
      return /* @__PURE__ */ d("div", { className: "cedros-admin__field", children: [
        /* @__PURE__ */ d("label", { className: "cedros-admin__field-label", children: [
          x.label,
          x.unit && /* @__PURE__ */ d("span", { className: "cedros-admin__field-unit", children: [
            " (",
            x.unit,
            ")"
          ] })
        ] }),
        /* @__PURE__ */ o(
          "input",
          {
            type: "number",
            className: "cedros-admin__input",
            value: _,
            onChange: (S) => h(w, parseFloat(S.target.value) || 0),
            disabled: r
          }
        ),
        v(x.description)
      ] });
    if (x.type === "secret_array")
      return /* @__PURE__ */ o(
        af,
        {
          label: x.label,
          value: _,
          onChange: (S) => h(w, S),
          disabled: r,
          description: x.description
        }
      );
    if (x.type === "array") {
      const S = _;
      return /* @__PURE__ */ d("div", { className: "cedros-admin__field", children: [
        /* @__PURE__ */ o("label", { className: "cedros-admin__field-label", children: x.label }),
        /* @__PURE__ */ o(
          "textarea",
          {
            className: "cedros-admin__textarea",
            value: S.join(`
`),
            onChange: (A) => h(w, A.target.value.split(`
`).filter(Boolean)),
            placeholder: "One item per line",
            rows: 3,
            disabled: r
          }
        ),
        v(x.description)
      ] });
    }
    if (x.type === "object")
      return /* @__PURE__ */ d("div", { className: "cedros-admin__field", children: [
        /* @__PURE__ */ o("label", { className: "cedros-admin__field-label", children: x.label }),
        /* @__PURE__ */ o(
          "textarea",
          {
            className: "cedros-admin__textarea cedros-admin__textarea--mono",
            value: JSON.stringify(_, null, 2),
            onChange: (S) => {
              try {
                h(w, JSON.parse(S.target.value));
              } catch {
              }
            },
            rows: 5,
            disabled: r
          }
        ),
        v(x.description)
      ] });
    const N = c.has(w), I = x.isSecret && !N && _ === Nt ? Nt : _;
    return /* @__PURE__ */ d("div", { className: "cedros-admin__field", children: [
      /* @__PURE__ */ d("label", { className: "cedros-admin__field-label", children: [
        x.label,
        x.isSecret && /* @__PURE__ */ o("span", { className: "cedros-admin__field-secret", children: " (secret)" })
      ] }),
      /* @__PURE__ */ d("div", { className: "cedros-admin__input-group", children: [
        /* @__PURE__ */ o(
          "input",
          {
            type: x.isSecret && !N ? "password" : "text",
            className: "cedros-admin__input",
            value: I,
            onChange: (S) => h(w, S.target.value),
            disabled: r,
            placeholder: x.isSecret ? "••••••••" : ""
          }
        ),
        x.isSecret && /* @__PURE__ */ o(
          "button",
          {
            type: "button",
            className: "cedros-admin__button cedros-admin__button--ghost",
            onClick: () => g(w),
            style: { padding: "0.5rem", minWidth: "auto" },
            title: N ? "Hide" : "Show",
            children: N ? Y.eyeOff : Y.eye
          }
        )
      ] }),
      v(x.description)
    ] });
  }, b = Object.keys(i), k = (w) => {
    const _ = Us(e, w, n[w] ?? i[w]);
    if (_.hidden || _.showWhen && !i[_.showWhen])
      return !1;
    if (w === "token_decimals") {
      const x = i.token_mint;
      if (x && io[x])
        return !1;
    }
    return !0;
  };
  return /* @__PURE__ */ d("div", { className: "cedros-admin__config-editor", children: [
    /* @__PURE__ */ o("div", { className: "cedros-admin__config-fields", children: b.filter(k).map((w) => /* @__PURE__ */ o("div", { className: "cedros-admin__config-field", children: f(w, i[w]) }, w)) }),
    /* @__PURE__ */ o("div", { className: "cedros-admin__config-actions", children: /* @__PURE__ */ o("div", { className: "cedros-admin__autosave-status", children: /* @__PURE__ */ o(sf, { status: p, error: m }) }) })
  ] });
}
function of({
  label: e,
  value: t,
  onChange: n,
  decimals: r,
  onDecimalsChange: a,
  disabled: i = !1,
  description: s,
  customSymbol: c = "",
  customIcon: l = "",
  onCustomSymbolChange: u,
  onCustomIconChange: p
}) {
  const [m, h] = H(!1), g = Object.entries(io), f = !!io[t], k = m || !!t && !f, w = (_) => {
    if (_ === "custom")
      h(!0), f && n("");
    else {
      h(!1), n(_);
      const x = io[_];
      x && a && a(x.decimals), u && u(""), p && p("");
    }
  };
  return /* @__PURE__ */ d("div", { className: "cedros-admin__field", children: [
    /* @__PURE__ */ o("label", { className: "cedros-admin__field-label", children: e }),
    /* @__PURE__ */ d("div", { style: { display: "flex", flexDirection: "column", gap: "0.5rem" }, children: [
      /* @__PURE__ */ d("div", { style: { display: "flex", flexWrap: "wrap", gap: "0.5rem" }, children: [
        g.map(([_, x]) => /* @__PURE__ */ d(
          "button",
          {
            type: "button",
            onClick: () => w(_),
            disabled: i,
            style: {
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 0.75rem",
              border: t === _ ? "2px solid var(--cedros-admin-primary, #171717)" : "1px solid var(--cedros-admin-border, #d4d4d4)",
              borderRadius: "0.5rem",
              background: t === _ ? "var(--cedros-admin-primary-bg, #f5f5f5)" : "var(--cedros-admin-bg, #fff)",
              cursor: i ? "not-allowed" : "pointer",
              opacity: i ? 0.5 : 1,
              fontWeight: t === _ ? 600 : 400
            },
            children: [
              /* @__PURE__ */ o(
                "img",
                {
                  src: x.icon,
                  alt: x.symbol,
                  style: { width: 20, height: 20, borderRadius: "50%" },
                  onError: (N) => {
                    N.target.style.display = "none";
                  }
                }
              ),
              /* @__PURE__ */ o("span", { children: x.symbol })
            ]
          },
          _
        )),
        /* @__PURE__ */ d(
          "button",
          {
            type: "button",
            onClick: () => w("custom"),
            disabled: i,
            style: {
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 0.75rem",
              border: k ? "2px solid var(--cedros-admin-primary, #171717)" : "1px solid var(--cedros-admin-border, #d4d4d4)",
              borderRadius: "0.5rem",
              background: k ? "var(--cedros-admin-primary-bg, #f5f5f5)" : "var(--cedros-admin-bg, #fff)",
              cursor: i ? "not-allowed" : "pointer",
              opacity: i ? 0.5 : 1,
              fontWeight: k ? 600 : 400
            },
            children: [
              /* @__PURE__ */ o("span", { style: { fontSize: "1rem" }, children: "+" }),
              /* @__PURE__ */ o("span", { children: "Custom" })
            ]
          }
        )
      ] }),
      k && /* @__PURE__ */ d("div", { style: {
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        padding: "1rem",
        background: "var(--cedros-admin-bg-muted, #f9fafb)",
        borderRadius: "0.5rem",
        border: "1px solid var(--cedros-admin-border, #e5e7eb)"
      }, children: [
        /* @__PURE__ */ d("div", { children: [
          /* @__PURE__ */ o("label", { style: {
            display: "block",
            fontSize: "0.75rem",
            fontWeight: 500,
            marginBottom: "0.25rem",
            color: "var(--cedros-admin-text-muted, #64748b)"
          }, children: "Token Mint Address" }),
          /* @__PURE__ */ o(
            "input",
            {
              type: "text",
              className: "cedros-admin__input",
              value: t,
              onChange: (_) => n(_.target.value),
              placeholder: "e.g., EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
              disabled: i,
              style: { fontFamily: "monospace", fontSize: "0.875rem" }
            }
          )
        ] }),
        /* @__PURE__ */ d("div", { children: [
          /* @__PURE__ */ o("label", { style: {
            display: "block",
            fontSize: "0.75rem",
            fontWeight: 500,
            marginBottom: "0.25rem",
            color: "var(--cedros-admin-text-muted, #64748b)"
          }, children: "Token Symbol" }),
          /* @__PURE__ */ o(
            "input",
            {
              type: "text",
              className: "cedros-admin__input",
              value: c,
              onChange: (_) => u?.(_.target.value),
              placeholder: "e.g., MYTOKEN",
              disabled: i,
              style: { textTransform: "uppercase" }
            }
          )
        ] }),
        /* @__PURE__ */ d("div", { children: [
          /* @__PURE__ */ o("label", { style: {
            display: "block",
            fontSize: "0.75rem",
            fontWeight: 500,
            marginBottom: "0.25rem",
            color: "var(--cedros-admin-text-muted, #64748b)"
          }, children: "Token Icon URL" }),
          /* @__PURE__ */ d("div", { style: { display: "flex", gap: "0.5rem", alignItems: "center" }, children: [
            /* @__PURE__ */ o(
              "input",
              {
                type: "text",
                className: "cedros-admin__input",
                value: l,
                onChange: (_) => p?.(_.target.value),
                placeholder: "https://example.com/token-logo.png",
                disabled: i,
                style: { flex: 1 }
              }
            ),
            l && /* @__PURE__ */ o(
              "img",
              {
                src: l,
                alt: "Token icon preview",
                style: {
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  border: "1px solid var(--cedros-admin-border, #e5e7eb)",
                  objectFit: "cover"
                },
                onError: (_) => {
                  _.target.style.display = "none";
                }
              }
            )
          ] }),
          /* @__PURE__ */ o("div", { style: {
            fontSize: "0.7rem",
            color: "var(--cedros-admin-text-muted, #94a3b8)",
            marginTop: "0.25rem"
          }, children: "Shown to customers during checkout" })
        ] }),
        /* @__PURE__ */ d("div", { children: [
          /* @__PURE__ */ o("label", { style: {
            display: "block",
            fontSize: "0.75rem",
            fontWeight: 500,
            marginBottom: "0.25rem",
            color: "var(--cedros-admin-text-muted, #64748b)"
          }, children: "Token Decimals" }),
          /* @__PURE__ */ o(
            "input",
            {
              type: "number",
              className: "cedros-admin__input",
              value: r ?? 6,
              onChange: (_) => a?.(parseInt(_.target.value, 10) || 0),
              min: 0,
              max: 18,
              disabled: i,
              style: { width: "100px" }
            }
          ),
          /* @__PURE__ */ o("div", { style: {
            fontSize: "0.7rem",
            color: "var(--cedros-admin-text-muted, #94a3b8)",
            marginTop: "0.25rem"
          }, children: "Most SPL tokens use 6 decimals (like USDC)" })
        ] })
      ] }),
      t && f && /* @__PURE__ */ o("div", { style: {
        fontSize: "0.75rem",
        color: "var(--cedros-admin-text-muted, #64748b)",
        fontFamily: "monospace",
        wordBreak: "break-all"
      }, children: t }),
      s && /* @__PURE__ */ o("div", { style: {
        fontSize: "0.75rem",
        color: "var(--cedros-admin-text-muted, #64748b)",
        marginTop: "0.25rem"
      }, children: s })
    ] })
  ] });
}
function af({
  label: e,
  value: t,
  onChange: n,
  disabled: r = !1,
  description: a
}) {
  const [i, s] = H(/* @__PURE__ */ new Set()), [c, l] = H(null), [u, p] = H(""), m = Array.isArray(t) ? t : [], h = (_) => {
    s((x) => {
      const N = new Set(x);
      return N.has(_) ? N.delete(_) : N.add(_), N;
    });
  }, g = () => {
    n([...m, ""]), l(m.length), p("");
  }, v = (_, x) => {
    const N = [...m];
    N[_] = x, n(N);
  }, f = (_) => {
    const x = m.filter((N, I) => I !== _);
    n(x), s((N) => {
      const I = /* @__PURE__ */ new Set();
      return N.forEach((S) => {
        S < _ ? I.add(S) : S > _ && I.add(S - 1);
      }), I;
    });
  }, b = (_) => {
    l(_), p(m[_] || "");
  }, k = () => {
    c !== null && (v(c, u), l(null), p(""));
  }, w = () => {
    c !== null && m[c] === "" && f(c), l(null), p("");
  };
  return /* @__PURE__ */ d("div", { className: "cedros-admin__field", children: [
    /* @__PURE__ */ d("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }, children: [
      /* @__PURE__ */ o("label", { className: "cedros-admin__field-label", style: { marginBottom: 0 }, children: e }),
      /* @__PURE__ */ d(
        "button",
        {
          type: "button",
          onClick: g,
          disabled: r,
          style: {
            display: "flex",
            alignItems: "center",
            gap: "0.25rem",
            padding: "0.25rem 0.5rem",
            fontSize: "0.75rem",
            border: "1px solid var(--cedros-admin-border, #d4d4d4)",
            borderRadius: "0.375rem",
            background: "var(--cedros-admin-bg, #fff)",
            cursor: r ? "not-allowed" : "pointer",
            opacity: r ? 0.5 : 1
          },
          children: [
            Y.plus,
            "Add"
          ]
        }
      )
    ] }),
    /* @__PURE__ */ d("div", { style: { display: "flex", flexDirection: "column", gap: "0.5rem" }, children: [
      m.length === 0 && /* @__PURE__ */ o("div", { style: {
        padding: "1rem",
        textAlign: "center",
        color: "var(--cedros-admin-text-muted, #64748b)",
        fontSize: "0.875rem",
        border: "1px dashed var(--cedros-admin-border, #d4d4d4)",
        borderRadius: "0.5rem"
      }, children: 'No items. Click "Add" to create one.' }),
      m.map((_, x) => {
        const N = i.has(x), I = c === x, S = _ === Nt;
        return /* @__PURE__ */ o(
          "div",
          {
            style: {
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem",
              background: "var(--cedros-admin-bg-muted, #f9fafb)",
              borderRadius: "0.375rem",
              border: "1px solid var(--cedros-admin-border, #e5e7eb)"
            },
            children: I ? /* @__PURE__ */ d(Oe, { children: [
              /* @__PURE__ */ o(
                "input",
                {
                  type: "text",
                  className: "cedros-admin__input",
                  value: u,
                  onChange: (A) => p(A.target.value),
                  placeholder: "Enter wallet keypair...",
                  autoFocus: !0,
                  style: { flex: 1, fontFamily: "monospace", fontSize: "0.75rem" },
                  onKeyDown: (A) => {
                    A.key === "Enter" && k(), A.key === "Escape" && w();
                  }
                }
              ),
              /* @__PURE__ */ o(
                "button",
                {
                  type: "button",
                  onClick: k,
                  style: {
                    padding: "0.375rem",
                    border: "none",
                    background: "var(--cedros-admin-success, #22c55e)",
                    color: "#fff",
                    borderRadius: "0.25rem",
                    cursor: "pointer"
                  },
                  title: "Save",
                  children: Y.check
                }
              ),
              /* @__PURE__ */ o(
                "button",
                {
                  type: "button",
                  onClick: w,
                  style: {
                    padding: "0.375rem",
                    border: "none",
                    background: "var(--cedros-admin-text-muted, #64748b)",
                    color: "#fff",
                    borderRadius: "0.25rem",
                    cursor: "pointer"
                  },
                  title: "Cancel",
                  children: Y.close
                }
              )
            ] }) : /* @__PURE__ */ d(Oe, { children: [
              /* @__PURE__ */ o("div", { style: {
                flex: 1,
                fontFamily: "monospace",
                fontSize: "0.75rem",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              }, children: N && !S ? _ : S ? "[REDACTED]" : "••••••••••••••••••••" }),
              /* @__PURE__ */ o(
                "button",
                {
                  type: "button",
                  onClick: () => h(x),
                  disabled: r || S,
                  style: {
                    padding: "0.375rem",
                    border: "none",
                    background: "transparent",
                    cursor: r || S ? "not-allowed" : "pointer",
                    opacity: r || S ? 0.5 : 1,
                    color: "var(--cedros-admin-text-muted, #64748b)"
                  },
                  title: N ? "Hide" : "Show",
                  children: N ? Y.eyeOff : Y.eye
                }
              ),
              /* @__PURE__ */ o(
                "button",
                {
                  type: "button",
                  onClick: () => b(x),
                  disabled: r,
                  style: {
                    padding: "0.375rem",
                    border: "none",
                    background: "transparent",
                    cursor: r ? "not-allowed" : "pointer",
                    opacity: r ? 0.5 : 1,
                    color: "var(--cedros-admin-text-muted, #64748b)"
                  },
                  title: "Edit",
                  children: Y.settings
                }
              ),
              /* @__PURE__ */ o(
                "button",
                {
                  type: "button",
                  onClick: () => f(x),
                  disabled: r,
                  style: {
                    padding: "0.375rem",
                    border: "none",
                    background: "transparent",
                    cursor: r ? "not-allowed" : "pointer",
                    opacity: r ? 0.5 : 1,
                    color: "var(--cedros-admin-error, #ef4444)"
                  },
                  title: "Delete",
                  children: Y.trash
                }
              )
            ] })
          },
          x
        );
      })
    ] }),
    a && /* @__PURE__ */ o("div", { style: {
      fontSize: "0.75rem",
      color: "var(--cedros-admin-text-muted, #64748b)",
      marginTop: "0.5rem"
    }, children: a })
  ] });
}
function sf({ status: e, error: t }) {
  return e === "idle" ? null : /* @__PURE__ */ d(
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
        e === "pending" && /* @__PURE__ */ o(Oe, { children: /* @__PURE__ */ o("span", { style: { opacity: 0.7 }, children: "Unsaved changes" }) }),
        e === "saving" && /* @__PURE__ */ d(Oe, { children: [
          Y.loading,
          /* @__PURE__ */ o("span", { children: "Saving..." })
        ] }),
        e === "saved" && /* @__PURE__ */ d(Oe, { children: [
          Y.check,
          /* @__PURE__ */ o("span", { style: { color: "var(--cedros-admin-success, #22c55e)" }, children: "Saved" })
        ] }),
        e === "error" && /* @__PURE__ */ o(Oe, { children: /* @__PURE__ */ d("span", { children: [
          "Save failed",
          t ? `: ${t}` : ""
        ] }) })
      ]
    }
  );
}
function vl({
  serverUrl: e,
  apiKey: t,
  authManager: n,
  category: r,
  title: a,
  description: i,
  enabledField: s = "enabled",
  showEnabledToggle: c = !1
}) {
  const l = Te(
    () => new tf(e, void 0, n),
    [e, n]
  ), [u, p] = H(null), [m, h] = H([]), [g, v] = H(!1), [f, b] = H(!0), [k, w] = H(null), [_, x] = H(null), [N, I] = H(!1), S = xi[r] || { label: r, icon: "⚙️" }, A = a || S.label, W = i || S.description, C = J(() => ({
    stripe: {
      secret_key: Nt,
      webhook_secret: Nt,
      publishable_key: "pk_test_xxx",
      success_url: "https://example.com/success",
      cancel_url: "https://example.com/cancel",
      mode: "test",
      enabled: !0
    },
    x402: {
      enabled: !1,
      payment_address: "",
      token_mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      token_decimals: 6,
      network: "mainnet-beta",
      rpc_url: "",
      gasless_enabled: !1,
      server_wallets: Nt
    },
    server: {
      address: ":8080",
      read_timeout: "15s",
      write_timeout: "15s",
      cors_allowed_origins: ["http://localhost:3000"],
      admin_metrics_api_key: Nt
    },
    logging: {
      level: "info",
      format: "json",
      environment: "production"
    },
    metrics: {
      admin_metrics_api_key: Nt
    },
    security: {
      cors_allowed_origins: ["http://localhost:3000"]
    },
    cedros_login: {
      enabled: !1,
      credits_enabled: !1,
      base_url: "",
      api_key: Nt,
      timeout: 30
    },
    email: {
      enabled: !1,
      provider: "",
      smtp_host: "",
      smtp_port: 587,
      smtp_user: "",
      smtp_password: Nt,
      from_address: "",
      from_name: ""
    },
    webhook: {
      enabled: !1,
      url: "",
      secret: Nt,
      retry_attempts: 3
    }
  })[r] || {}, [r]), T = J(async () => {
    b(!0), w(null);
    try {
      const V = await l.getConfig(r, !0);
      p(V);
    } catch {
      p({
        category: r,
        config: C(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        secretsRedacted: !0
      });
    } finally {
      b(!1);
    }
  }, [l, r, C]);
  ge(() => {
    T();
  }, [T]);
  const P = J(async () => {
    try {
      const V = await l.getHistory(r, 20);
      h(V.history);
    } catch {
      h([
        { id: "1", configKey: `${r}.updated`, action: "UPDATE", changedAt: (/* @__PURE__ */ new Date()).toISOString(), changedBy: "admin" }
      ]);
    }
  }, [l, r]);
  ge(() => {
    g && P();
  }, [g, P]);
  const L = J(async (V) => {
    await l.updateConfig(r, V, "Updated via admin dashboard"), await T();
  }, [l, r, T]), F = J(async (V) => l.validateConfig(r, V), [l, r]), [$, M] = H(!1), D = J(async () => {
    if (!u || $) return;
    const E = !!!u.config[s], q = { ...u.config, [s]: E };
    M(!0), p({ ...u, config: q });
    try {
      await l.updateConfig(r, q, `${E ? "Enabled" : "Disabled"} via admin dashboard`);
    } catch (re) {
      console.warn("Failed to save enabled state to server (demo mode?):", re);
    } finally {
      M(!1);
    }
  }, [u, l, r, s, $]), O = !!u?.config[s];
  return f && !u ? /* @__PURE__ */ o("div", { className: "cedros-admin__section", children: /* @__PURE__ */ d("div", { className: "cedros-admin__loading", children: [
    Y.loading,
    " Loading ",
    A,
    " settings..."
  ] }) }) : k ? /* @__PURE__ */ o("div", { className: "cedros-admin__section", children: /* @__PURE__ */ d("div", { className: "cedros-admin__error", children: [
    "Failed to load settings: ",
    k
  ] }) }) : /* @__PURE__ */ d("div", { className: "cedros-admin__section", children: [
    /* @__PURE__ */ d("div", { className: "cedros-admin__section-header", children: [
      /* @__PURE__ */ d("div", { children: [
        /* @__PURE__ */ d("h3", { className: "cedros-admin__section-title", children: [
          /* @__PURE__ */ o("span", { style: { marginRight: "0.5rem" }, children: S.icon }),
          A
        ] }),
        W && /* @__PURE__ */ o("p", { className: "cedros-admin__text-muted", style: { marginTop: "0.25rem" }, children: W })
      ] }),
      c && u && s in u.config && /* @__PURE__ */ d("div", { style: { display: "flex", alignItems: "center", gap: "0.75rem" }, children: [
        /* @__PURE__ */ o("span", { style: { fontSize: "0.875rem", color: O ? "var(--cedros-admin-text, #171717)" : "var(--cedros-admin-muted, #737373)" }, children: O ? "Enabled" : "Disabled" }),
        /* @__PURE__ */ o(
          "button",
          {
            type: "button",
            role: "switch",
            "aria-checked": O,
            onClick: D,
            disabled: $,
            style: {
              width: 44,
              height: 24,
              borderRadius: 12,
              border: "none",
              backgroundColor: O ? "var(--cedros-admin-primary, #171717)" : "var(--cedros-admin-border, #d4d4d4)",
              cursor: $ ? "wait" : "pointer",
              position: "relative",
              transition: "background-color 0.2s",
              flexShrink: 0,
              opacity: $ ? 0.6 : 1
            },
            children: /* @__PURE__ */ o(
              "span",
              {
                style: {
                  position: "absolute",
                  top: 2,
                  left: O ? 22 : 2,
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  backgroundColor: "#fff",
                  transition: "left 0.2s",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
                }
              }
            )
          }
        )
      ] })
    ] }),
    u && /* @__PURE__ */ d(
      "div",
      {
        className: "cedros-admin__settings-editor",
        style: {
          marginTop: "1rem",
          opacity: c && !O ? 0.6 : 1,
          pointerEvents: c && !O ? "none" : "auto"
        },
        children: [
          c && !O && /* @__PURE__ */ o(
            "div",
            {
              style: {
                padding: "0.75rem 1rem",
                marginBottom: "1rem",
                backgroundColor: "var(--cedros-admin-warning-bg, #fef3c7)",
                border: "1px solid var(--cedros-admin-warning-border, #f59e0b)",
                borderRadius: "0.375rem",
                fontSize: "0.875rem",
                color: "var(--cedros-admin-warning-text, #92400e)",
                pointerEvents: "auto"
              },
              children: "This payment method is disabled. Enable it using the toggle above to accept payments."
            }
          ),
          /* @__PURE__ */ o(
            rf,
            {
              category: u.category,
              config: u.config,
              originalConfig: u.config,
              onSave: L,
              onValidate: F,
              onCancel: () => T()
            }
          )
        ]
      }
    ),
    g && /* @__PURE__ */ d("div", { className: "cedros-admin__settings-history", style: { marginTop: "1.5rem" }, children: [
      /* @__PURE__ */ o("h4", { style: { marginBottom: "0.75rem", fontWeight: 600 }, children: "Change History" }),
      m.length === 0 ? /* @__PURE__ */ o("p", { className: "cedros-admin__text-muted", children: "No history entries found." }) : /* @__PURE__ */ o("div", { className: "cedros-admin__settings-timeline", children: m.map((V) => /* @__PURE__ */ d("div", { className: "cedros-admin__settings-timeline-item", children: [
        /* @__PURE__ */ o("div", { className: "cedros-admin__settings-timeline-dot" }),
        /* @__PURE__ */ d("div", { className: "cedros-admin__settings-timeline-content", children: [
          /* @__PURE__ */ d("div", { className: "cedros-admin__settings-timeline-header", children: [
            /* @__PURE__ */ o("code", { children: V.configKey }),
            /* @__PURE__ */ o("span", { className: `cedros-admin__badge cedros-admin__badge--${V.action.toLowerCase()}`, children: V.action })
          ] }),
          /* @__PURE__ */ d("div", { className: "cedros-admin__settings-timeline-meta", children: [
            kr(V.changedAt),
            " by ",
            V.changedBy
          ] })
        ] })
      ] }, V.id)) })
    ] }),
    _ && /* @__PURE__ */ o(
      "div",
      {
        style: {
          marginTop: "1rem",
          padding: "0.75rem 1rem",
          borderRadius: "0.375rem",
          backgroundColor: _.valid ? "var(--cedros-admin-success-bg, #dcfce7)" : "var(--cedros-admin-error-bg, #fef2f2)",
          border: `1px solid ${_.valid ? "var(--cedros-admin-success-border, #86efac)" : "var(--cedros-admin-error-border, #fecaca)"}`
        },
        children: /* @__PURE__ */ d("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" }, children: [
          /* @__PURE__ */ d("div", { style: { flex: 1 }, children: [
            /* @__PURE__ */ o("div", { style: {
              fontWeight: 600,
              color: _.valid ? "var(--cedros-admin-success, #16a34a)" : "var(--cedros-admin-error, #dc2626)",
              marginBottom: _.errors.length > 0 || _.warnings.length > 0 ? "0.5rem" : 0
            }, children: _.valid ? "✓ Configuration is valid" : "✗ Validation failed" }),
            _.errors.length > 0 && /* @__PURE__ */ o("ul", { style: { margin: 0, paddingLeft: "1.25rem", color: "var(--cedros-admin-error, #dc2626)", fontSize: "0.875rem" }, children: _.errors.map((V, E) => /* @__PURE__ */ o("li", { children: V }, E)) }),
            _.warnings.length > 0 && /* @__PURE__ */ o("ul", { style: { margin: _.errors.length > 0 ? "0.5rem 0 0" : 0, paddingLeft: "1.25rem", color: "var(--cedros-admin-warning, #ca8a04)", fontSize: "0.875rem" }, children: _.warnings.map((V, E) => /* @__PURE__ */ o("li", { children: V }, E)) })
          ] }),
          /* @__PURE__ */ o(
            "button",
            {
              type: "button",
              onClick: () => x(null),
              style: {
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "0.25rem",
                color: "var(--cedros-admin-text-muted, #64748b)",
                fontSize: "1.25rem",
                lineHeight: 1
              },
              title: "Dismiss",
              children: "×"
            }
          )
        ] })
      }
    ),
    /* @__PURE__ */ d("div", { style: { marginTop: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
      /* @__PURE__ */ o(
        "button",
        {
          type: "button",
          className: "cedros-admin__button cedros-admin__button--ghost cedros-admin__button--sm",
          onClick: () => v(!g),
          children: g ? "Hide History" : "History"
        }
      ),
      /* @__PURE__ */ o(
        "button",
        {
          type: "button",
          className: "cedros-admin__button cedros-admin__button--ghost cedros-admin__button--sm",
          disabled: N || !u,
          onClick: async () => {
            if (u) {
              I(!0), x(null);
              try {
                const V = await F(u.config);
                x(V);
              } catch (V) {
                x({
                  valid: !1,
                  errors: [V instanceof Error ? V.message : "Validation failed"],
                  warnings: []
                });
              } finally {
                I(!1);
              }
            }
          },
          children: N ? "Validating..." : "Validate"
        }
      )
    ] })
  ] });
}
const Ws = [
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
function bl({ serverUrl: e, apiKey: t, authManager: n }) {
  const [r, a] = H("logging"), i = Ws.find((s) => s.id === r);
  return /* @__PURE__ */ d("div", { className: "cedros-admin__server-settings", children: [
    /* @__PURE__ */ d("div", { className: "cedros-admin__page-header", children: [
      /* @__PURE__ */ o("h2", { className: "cedros-admin__page-title", children: "Store Server" }),
      /* @__PURE__ */ o("p", { className: "cedros-admin__page-description", children: "Configure logging, metrics, and security settings." })
    ] }),
    /* @__PURE__ */ o("div", { className: "cedros-admin__tabs cedros-admin__tabs--line", children: Ws.map((s) => /* @__PURE__ */ o(
      "button",
      {
        type: "button",
        className: `cedros-admin__tab ${r === s.id ? "cedros-admin__tab--active" : ""}`,
        onClick: () => a(s.id),
        children: s.label
      },
      s.id
    )) }),
    /* @__PURE__ */ o("div", { style: { marginTop: "1rem" }, children: /* @__PURE__ */ o(
      vl,
      {
        serverUrl: e,
        apiKey: t,
        authManager: n,
        category: i.category,
        title: `${i.label} Settings`,
        description: i.description
      },
      i.category
    ) })
  ] });
}
const cf = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  SettingsSection: bl
}, Symbol.toStringTag, { value: "Module" })), Ae = {
  enabled: !1,
  plans: [],
  pageTitle: "Choose Your Plan",
  pageSubtitle: "Select the plan that best fits your needs.",
  annualSavingsBadge: "2 months free",
  popularBadgeText: "Best Deal",
  footerNotice: ""
}, lf = {
  title: "New Plan",
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
function df() {
  return `plan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
function wl({ serverUrl: e, apiKey: t, authManager: n }) {
  const [r, a] = H(Ae), [i, s] = H(!0), [c, l] = H(null), [u, p] = H("plans"), [m, h] = H("idle"), [g, v] = H({
    enabled: Ae.enabled,
    pageTitle: Ae.pageTitle,
    pageSubtitle: Ae.pageSubtitle,
    annualSavingsBadge: Ae.annualSavingsBadge,
    popularBadgeText: Ae.popularBadgeText,
    footerNotice: Ae.footerNotice
  }), [f, b] = H(g), [k, w] = H(""), _ = J(async () => {
    try {
      let E;
      const q = "/admin/subscriptions/settings";
      if (n?.isAuthenticated())
        E = await n.fetchWithAuth(q);
      else {
        const re = { "Content-Type": "application/json" };
        t && (re["X-API-Key"] = t);
        const j = await fetch(`${e}${q}`, { headers: re });
        if (!j.ok) throw new Error(`Failed to fetch settings: ${j.status}`);
        E = await j.json();
      }
      a({ ...Ae, ...E }), v({
        enabled: E.enabled ?? Ae.enabled,
        pageTitle: E.pageTitle ?? Ae.pageTitle,
        pageSubtitle: E.pageSubtitle ?? Ae.pageSubtitle,
        annualSavingsBadge: E.annualSavingsBadge ?? Ae.annualSavingsBadge,
        popularBadgeText: E.popularBadgeText ?? Ae.popularBadgeText,
        footerNotice: E.footerNotice ?? Ae.footerNotice
      }), b({
        enabled: E.enabled ?? Ae.enabled,
        pageTitle: E.pageTitle ?? Ae.pageTitle,
        pageSubtitle: E.pageSubtitle ?? Ae.pageSubtitle,
        annualSavingsBadge: E.annualSavingsBadge ?? Ae.annualSavingsBadge,
        popularBadgeText: E.popularBadgeText ?? Ae.popularBadgeText,
        footerNotice: E.footerNotice ?? Ae.footerNotice
      }), w(JSON.stringify(E.plans ?? []));
    } catch {
      const E = {
        ...Ae,
        enabled: !0,
        plans: [
          { id: "plan_starter", title: "Starter", description: "For individuals", priceMonthlyUsd: 9, priceAnnualUsd: 90, features: ["100 requests/month", "Email support"], isActive: !0, sortOrder: 0, activeSubscribers: 142 },
          { id: "plan_pro", title: "Pro", description: "For professionals", priceMonthlyUsd: 29, priceAnnualUsd: 290, features: ["Unlimited requests", "Priority support", "API access"], isPopular: !0, isActive: !0, sortOrder: 1, activeSubscribers: 89 },
          { id: "plan_enterprise", title: "Enterprise", description: "For teams", priceMonthlyUsd: 99, priceAnnualUsd: 990, features: ["Everything in Pro", "SSO", "Dedicated support"], isActive: !0, sortOrder: 2, activeSubscribers: 23 }
        ]
      };
      a(E), v({
        enabled: E.enabled,
        pageTitle: E.pageTitle ?? Ae.pageTitle,
        pageSubtitle: E.pageSubtitle ?? Ae.pageSubtitle,
        annualSavingsBadge: E.annualSavingsBadge ?? Ae.annualSavingsBadge,
        popularBadgeText: E.popularBadgeText ?? Ae.popularBadgeText,
        footerNotice: E.footerNotice ?? Ae.footerNotice
      }), b({
        enabled: E.enabled,
        pageTitle: E.pageTitle ?? Ae.pageTitle,
        pageSubtitle: E.pageSubtitle ?? Ae.pageSubtitle,
        annualSavingsBadge: E.annualSavingsBadge ?? Ae.annualSavingsBadge,
        popularBadgeText: E.popularBadgeText ?? Ae.popularBadgeText,
        footerNotice: E.footerNotice ?? Ae.footerNotice
      }), w(JSON.stringify(E.plans));
    } finally {
      s(!1);
    }
  }, [e, t, n]);
  ge(() => {
    _();
  }, [_]);
  const x = J(async (E) => {
    try {
      const q = "/admin/subscriptions/settings", re = JSON.stringify(E);
      if (n?.isAuthenticated())
        await n.fetchWithAuth(q, { method: "PUT", body: re });
      else {
        const j = { "Content-Type": "application/json" };
        t && (j["X-API-Key"] = t);
        const X = await fetch(`${e}${q}`, { method: "PUT", headers: j, body: re });
        if (!X.ok) throw new Error(`Failed to save settings: ${X.status}`);
      }
      return !0;
    } catch {
      return !0;
    }
  }, [n, t, e]), N = Te(() => f.enabled !== g.enabled || f.pageTitle !== g.pageTitle || f.pageSubtitle !== g.pageSubtitle || f.annualSavingsBadge !== g.annualSavingsBadge || f.popularBadgeText !== g.popularBadgeText || f.footerNotice !== g.footerNotice, [g, f]), I = Te(() => JSON.stringify(r.plans), [r.plans]), S = Te(() => k !== I, [I, k]), A = J(async () => {
    const E = {
      ...r,
      enabled: g.enabled,
      pageTitle: g.pageTitle,
      pageSubtitle: g.pageSubtitle,
      annualSavingsBadge: g.annualSavingsBadge,
      popularBadgeText: g.popularBadgeText,
      footerNotice: g.footerNotice
    };
    h("saving");
    const q = await x(E);
    a(E), q && (b({
      enabled: E.enabled,
      pageTitle: E.pageTitle,
      pageSubtitle: E.pageSubtitle,
      annualSavingsBadge: E.annualSavingsBadge,
      popularBadgeText: E.popularBadgeText,
      footerNotice: E.footerNotice
    }), w(JSON.stringify(E.plans))), h(q ? "saved" : "error"), setTimeout(() => h("idle"), 1500);
  }, [g, x, r]);
  ge(() => {
    if (u !== "page" || i || !N) return;
    const E = setTimeout(A, 600);
    return () => clearTimeout(E);
  }, [u, N, i, A]), ge(() => {
    if (u !== "plans" || i || !S) return;
    const E = setTimeout(A, 800);
    return () => clearTimeout(E);
  }, [u, S, i, A]);
  const W = () => {
    const E = {
      ...lf,
      id: df(),
      sortOrder: r.plans.length
    };
    a((q) => ({ ...q, plans: [...q.plans, E] })), l(E.id);
  }, C = (E, q) => {
    a((re) => ({
      ...re,
      plans: re.plans.map((j) => j.id === E ? { ...j, ...q } : j)
    }));
  }, T = (E) => {
    confirm("Delete this plan? This cannot be undone.") && (a((q) => ({
      ...q,
      plans: q.plans.filter((re) => re.id !== E)
    })), c === E && l(null));
  }, P = (E, q) => {
    const re = r.plans.findIndex((te) => te.id === E);
    if (re === -1 || q === "up" && re === 0 || q === "down" && re === r.plans.length - 1) return;
    const j = [...r.plans], X = q === "up" ? re - 1 : re + 1;
    [j[re], j[X]] = [j[X], j[re]], a((te) => ({ ...te, plans: j }));
  }, L = (E) => {
    C(E, {
      features: [...r.plans.find((q) => q.id === E)?.features || [], ""]
    });
  }, F = (E, q, re) => {
    const j = r.plans.find((te) => te.id === E);
    if (!j) return;
    const X = [...j.features];
    X[q] = re, C(E, { features: X });
  }, $ = (E, q) => {
    const re = r.plans.find((X) => X.id === E);
    if (!re) return;
    const j = re.features.filter((X, te) => te !== q);
    C(E, { features: j });
  };
  if (i)
    return /* @__PURE__ */ o("div", { className: "cedros-admin__page", children: /* @__PURE__ */ d("div", { className: "cedros-admin__loading", children: [
      Y.loading,
      " Loading subscription settings..."
    ] }) });
  const M = r.plans.filter((E) => E.isActive).length, D = r.plans.reduce((E, q) => E + (q.activeSubscribers ?? 0), 0), O = g.enabled, V = r.plans.filter((E) => E.isActive).map((E) => ({
    label: E.title,
    value: E.activeSubscribers ?? 0,
    description: "subscribers"
  }));
  return /* @__PURE__ */ d("div", { className: "cedros-admin__page", children: [
    /* @__PURE__ */ o(
      rr,
      {
        stats: [
          { label: "Status", value: O ? "Enabled" : "Disabled", variant: O ? "success" : "muted" },
          { label: "Active Plans", value: M, variant: M > 0 ? "success" : "muted" },
          { label: "Total Subscribers", value: D, variant: D > 0 ? "success" : "muted" },
          ...V
        ],
        isLoading: i
      }
    ),
    /* @__PURE__ */ d("div", { className: "cedros-admin__section", children: [
      /* @__PURE__ */ d("div", { className: "cedros-admin__section-header", children: [
        /* @__PURE__ */ o("h3", { className: "cedros-admin__section-title", children: "Subscription Settings" }),
        /* @__PURE__ */ d("div", { style: { display: "flex", alignItems: "center", gap: "0.75rem" }, children: [
          u === "plans" && /* @__PURE__ */ d(
            "button",
            {
              className: "cedros-admin__button cedros-admin__button--primary cedros-admin__button--action",
              onClick: W,
              disabled: !O,
              children: [
                Y.plus,
                "Add Plan"
              ]
            }
          ),
          /* @__PURE__ */ d("span", { className: `cedros-admin__autosave-indicator cedros-admin__autosave-indicator--${m}`, children: [
            m === "saving" && "Saving...",
            m === "saved" && "Saved",
            m === "error" && "Error"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ d("div", { className: "cedros-admin__tabs cedros-admin__tabs--line", children: [
        /* @__PURE__ */ o(
          "button",
          {
            type: "button",
            className: `cedros-admin__tab ${u === "plans" ? "cedros-admin__tab--active" : ""}`,
            onClick: () => p("plans"),
            children: "Plans"
          }
        ),
        /* @__PURE__ */ o(
          "button",
          {
            type: "button",
            className: `cedros-admin__tab ${u === "page" ? "cedros-admin__tab--active" : ""}`,
            onClick: () => p("page"),
            children: "Page Settings"
          }
        )
      ] }),
      u === "page" && /* @__PURE__ */ d("div", { children: [
        /* @__PURE__ */ o("div", { className: "cedros-admin__form-row", children: /* @__PURE__ */ d("div", { className: "cedros-admin__field", children: [
          /* @__PURE__ */ o("label", { className: "cedros-admin__field-label", children: "Subscriptions" }),
          /* @__PURE__ */ d("label", { className: "cedros-admin__toggle", children: [
            /* @__PURE__ */ o(
              "input",
              {
                type: "checkbox",
                className: "cedros-admin__toggle-input",
                checked: g.enabled,
                onChange: (E) => v((q) => ({ ...q, enabled: E.target.checked }))
              }
            ),
            /* @__PURE__ */ o("span", { className: "cedros-admin__toggle-track", children: /* @__PURE__ */ o("span", { className: "cedros-admin__toggle-thumb" }) }),
            /* @__PURE__ */ o("span", { className: "cedros-admin__toggle-label", children: "Enable Subscriptions" })
          ] })
        ] }) }),
        /* @__PURE__ */ d("div", { className: "cedros-admin__form-row", children: [
          /* @__PURE__ */ d("div", { className: "cedros-admin__field", children: [
            /* @__PURE__ */ o("label", { className: "cedros-admin__field-label", children: "Page Title" }),
            /* @__PURE__ */ o(
              "input",
              {
                type: "text",
                className: "cedros-admin__input",
                value: g.pageTitle || "",
                onChange: (E) => v((q) => ({ ...q, pageTitle: E.target.value })),
                placeholder: "Choose Your Plan"
              }
            )
          ] }),
          /* @__PURE__ */ d("div", { className: "cedros-admin__field", children: [
            /* @__PURE__ */ o("label", { className: "cedros-admin__field-label", children: "Page Subtitle" }),
            /* @__PURE__ */ o(
              "input",
              {
                type: "text",
                className: "cedros-admin__input",
                value: g.pageSubtitle || "",
                onChange: (E) => v((q) => ({ ...q, pageSubtitle: E.target.value })),
                placeholder: "Select the plan that best fits your needs."
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ d("div", { className: "cedros-admin__form-row", children: [
          /* @__PURE__ */ d("div", { className: "cedros-admin__field", children: [
            /* @__PURE__ */ o("label", { className: "cedros-admin__field-label", children: "Annual Savings Badge" }),
            /* @__PURE__ */ o(
              "input",
              {
                type: "text",
                className: "cedros-admin__input",
                value: g.annualSavingsBadge || "",
                onChange: (E) => v((q) => ({ ...q, annualSavingsBadge: E.target.value })),
                placeholder: "2 months free"
              }
            )
          ] }),
          /* @__PURE__ */ d("div", { className: "cedros-admin__field", children: [
            /* @__PURE__ */ o("label", { className: "cedros-admin__field-label", children: "Popular Plan Badge" }),
            /* @__PURE__ */ o(
              "input",
              {
                type: "text",
                className: "cedros-admin__input",
                value: g.popularBadgeText || "",
                onChange: (E) => v((q) => ({ ...q, popularBadgeText: E.target.value })),
                placeholder: "Best Deal"
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ o("div", { className: "cedros-admin__form-row", children: /* @__PURE__ */ d("div", { className: "cedros-admin__field", style: { flex: 1 }, children: [
          /* @__PURE__ */ o("label", { className: "cedros-admin__field-label", children: "Footer Notice (optional)" }),
          /* @__PURE__ */ o(
            "input",
            {
              type: "text",
              className: "cedros-admin__input",
              value: g.footerNotice || "",
              onChange: (E) => v((q) => ({ ...q, footerNotice: E.target.value })),
              placeholder: "For information regarding invoices, taxes..."
            }
          )
        ] }) })
      ] }),
      u === "plans" && /* @__PURE__ */ d("div", { children: [
        !O && /* @__PURE__ */ o("div", { style: { padding: "1.5rem", textAlign: "center", opacity: 0.6 }, children: "Subscriptions are disabled. Enable them to configure plans." }),
        r.plans.length === 0 ? /* @__PURE__ */ o("div", { style: { padding: "2rem", textAlign: "center", opacity: 0.6, border: "1px dashed currentColor", borderRadius: 8 }, children: 'No plans configured. Click "Add Plan" to create your first subscription tier.' }) : /* @__PURE__ */ o("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem" }, children: r.plans.map((E, q) => {
          const re = c === E.id;
          return /* @__PURE__ */ d(
            "div",
            {
              style: {
                border: "1px solid var(--cedros-admin-border, #e5e5e5)",
                borderRadius: 8,
                overflow: "hidden",
                background: E.isPopular ? "var(--cedros-admin-bg-accent, #f5f5f5)" : void 0
              },
              children: [
                /* @__PURE__ */ d(
                  "div",
                  {
                    style: {
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                      padding: "0.75rem 1rem",
                      cursor: "pointer"
                    },
                    onClick: () => l(re ? null : E.id),
                    children: [
                      /* @__PURE__ */ o("span", { style: { opacity: 0.5 }, children: re ? Y.chevronDown : Y.chevronRight }),
                      /* @__PURE__ */ d("div", { style: { flex: 1 }, children: [
                        /* @__PURE__ */ o("span", { style: { fontWeight: 600 }, children: E.title || "Untitled Plan" }),
                        E.isPopular && /* @__PURE__ */ o("span", { style: {
                          marginLeft: "0.5rem",
                          fontSize: 11,
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: "var(--cedros-admin-primary, #171717)",
                          color: "#fff"
                        }, children: "Popular" }),
                        !E.isActive && /* @__PURE__ */ o("span", { style: {
                          marginLeft: "0.5rem",
                          fontSize: 11,
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: "#9ca3af",
                          color: "#fff"
                        }, children: "Inactive" })
                      ] }),
                      /* @__PURE__ */ d("span", { style: { opacity: 0.6, fontSize: 14 }, children: [
                        "$",
                        E.priceMonthlyUsd,
                        "/mo · $",
                        E.priceAnnualUsd,
                        "/yr"
                      ] }),
                      /* @__PURE__ */ d("div", { style: { display: "flex", gap: "0.25rem" }, onClick: (j) => j.stopPropagation(), children: [
                        /* @__PURE__ */ o(
                          "button",
                          {
                            className: "cedros-admin__button cedros-admin__button--ghost",
                            onClick: () => P(E.id, "up"),
                            disabled: q === 0,
                            title: "Move up",
                            style: { padding: "4px 8px" },
                            children: Y.chevronUp
                          }
                        ),
                        /* @__PURE__ */ o(
                          "button",
                          {
                            className: "cedros-admin__button cedros-admin__button--ghost",
                            onClick: () => P(E.id, "down"),
                            disabled: q === r.plans.length - 1,
                            title: "Move down",
                            style: { padding: "4px 8px" },
                            children: Y.chevronDown
                          }
                        ),
                        /* @__PURE__ */ o(
                          "button",
                          {
                            className: "cedros-admin__button cedros-admin__button--ghost",
                            onClick: () => T(E.id),
                            title: "Delete plan",
                            style: { padding: "4px 8px", color: "#dc2626" },
                            children: Y.trash
                          }
                        )
                      ] })
                    ]
                  }
                ),
                re && /* @__PURE__ */ d("div", { style: { padding: "1rem", borderTop: "1px solid var(--cedros-admin-border, #e5e5e5)" }, children: [
                  /* @__PURE__ */ d("div", { className: "cedros-admin__form-row", children: [
                    /* @__PURE__ */ d("div", { className: "cedros-admin__field", children: [
                      /* @__PURE__ */ o("label", { className: "cedros-admin__field-label", children: "Plan Name" }),
                      /* @__PURE__ */ o(
                        "input",
                        {
                          type: "text",
                          className: "cedros-admin__input",
                          value: E.title,
                          onChange: (j) => C(E.id, { title: j.target.value }),
                          placeholder: "e.g., Starter"
                        }
                      )
                    ] }),
                    /* @__PURE__ */ d("div", { className: "cedros-admin__field", children: [
                      /* @__PURE__ */ o("label", { className: "cedros-admin__field-label", children: "Button Text" }),
                      /* @__PURE__ */ o(
                        "input",
                        {
                          type: "text",
                          className: "cedros-admin__input",
                          value: E.buttonText || "",
                          onChange: (j) => C(E.id, { buttonText: j.target.value }),
                          placeholder: "Purchase"
                        }
                      )
                    ] })
                  ] }),
                  /* @__PURE__ */ o("div", { className: "cedros-admin__form-row", children: /* @__PURE__ */ d("div", { className: "cedros-admin__field", style: { flex: 1 }, children: [
                    /* @__PURE__ */ o("label", { className: "cedros-admin__field-label", children: "Description" }),
                    /* @__PURE__ */ o(
                      "input",
                      {
                        type: "text",
                        className: "cedros-admin__input",
                        value: E.description,
                        onChange: (j) => C(E.id, { description: j.target.value }),
                        placeholder: "For entry-level developers managing lightweight workloads"
                      }
                    )
                  ] }) }),
                  /* @__PURE__ */ d("div", { className: "cedros-admin__form-row", children: [
                    /* @__PURE__ */ d("div", { className: "cedros-admin__field", children: [
                      /* @__PURE__ */ o("label", { className: "cedros-admin__field-label", children: "Monthly Price (USD)" }),
                      /* @__PURE__ */ o(
                        "input",
                        {
                          type: "number",
                          className: "cedros-admin__input",
                          value: E.priceMonthlyUsd || "",
                          onChange: (j) => C(E.id, { priceMonthlyUsd: parseFloat(j.target.value) || 0 }),
                          placeholder: "10",
                          min: "0",
                          step: "0.01"
                        }
                      )
                    ] }),
                    /* @__PURE__ */ d("div", { className: "cedros-admin__field", children: [
                      /* @__PURE__ */ o("label", { className: "cedros-admin__field-label", children: "Annual Price (USD)" }),
                      /* @__PURE__ */ o(
                        "input",
                        {
                          type: "number",
                          className: "cedros-admin__input",
                          value: E.priceAnnualUsd || "",
                          onChange: (j) => C(E.id, { priceAnnualUsd: parseFloat(j.target.value) || 0 }),
                          placeholder: "100",
                          min: "0",
                          step: "0.01"
                        }
                      )
                    ] })
                  ] }),
                  /* @__PURE__ */ o("div", { className: "cedros-admin__form-row", children: /* @__PURE__ */ d("div", { className: "cedros-admin__field", children: [
                    /* @__PURE__ */ o("label", { className: "cedros-admin__field-label", children: "Feature Highlight" }),
                    /* @__PURE__ */ o(
                      "input",
                      {
                        type: "text",
                        className: "cedros-admin__input",
                        value: E.featureHighlight || "",
                        onChange: (j) => C(E.id, { featureHighlight: j.target.value }),
                        placeholder: "100 prompts every 5 hours"
                      }
                    ),
                    /* @__PURE__ */ o("div", { style: { marginTop: 4, fontSize: 12, opacity: 0.75 }, children: "Bold text shown above feature list" })
                  ] }) }),
                  /* @__PURE__ */ d("div", { className: "cedros-admin__form-row", children: [
                    /* @__PURE__ */ o("div", { className: "cedros-admin__field", children: /* @__PURE__ */ d("label", { style: { display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }, children: [
                      /* @__PURE__ */ o(
                        "input",
                        {
                          type: "checkbox",
                          checked: E.isPopular || !1,
                          onChange: (j) => C(E.id, { isPopular: j.target.checked })
                        }
                      ),
                      "Mark as Popular (featured styling)"
                    ] }) }),
                    /* @__PURE__ */ o("div", { className: "cedros-admin__field", children: /* @__PURE__ */ d("label", { style: { display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }, children: [
                      /* @__PURE__ */ o(
                        "input",
                        {
                          type: "checkbox",
                          checked: E.isActive,
                          onChange: (j) => C(E.id, { isActive: j.target.checked })
                        }
                      ),
                      "Active (available for purchase)"
                    ] }) })
                  ] }),
                  /* @__PURE__ */ d("div", { className: "cedros-admin__form-row", style: { marginTop: "0.5rem" }, children: [
                    /* @__PURE__ */ o("div", { className: "cedros-admin__field", children: /* @__PURE__ */ d("label", { style: { display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }, children: [
                      /* @__PURE__ */ o(
                        "input",
                        {
                          type: "checkbox",
                          checked: E.inventoryQuantity != null,
                          onChange: (j) => C(E.id, { inventoryQuantity: j.target.checked ? 100 : null })
                        }
                      ),
                      "Limit quantity available"
                    ] }) }),
                    E.inventoryQuantity != null && /* @__PURE__ */ d("div", { className: "cedros-admin__field", children: [
                      /* @__PURE__ */ o("label", { className: "cedros-admin__field-label", children: "Total Available" }),
                      /* @__PURE__ */ o(
                        "input",
                        {
                          type: "number",
                          className: "cedros-admin__input",
                          value: E.inventoryQuantity ?? "",
                          onChange: (j) => C(E.id, { inventoryQuantity: parseInt(j.target.value) || 0 }),
                          min: "0",
                          style: { width: 100 }
                        }
                      ),
                      E.inventorySold != null && E.inventorySold > 0 && /* @__PURE__ */ d("div", { style: { marginTop: 4, fontSize: 12, opacity: 0.75 }, children: [
                        E.inventorySold,
                        " sold · ",
                        Math.max(0, E.inventoryQuantity - E.inventorySold),
                        " remaining"
                      ] })
                    ] })
                  ] }),
                  /* @__PURE__ */ d("div", { style: { marginTop: "1rem" }, children: [
                    /* @__PURE__ */ d("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }, children: [
                      /* @__PURE__ */ d("label", { className: "cedros-admin__field-label", style: { margin: 0 }, children: [
                        "Feature List (",
                        E.features.length,
                        ")"
                      ] }),
                      /* @__PURE__ */ o(
                        "button",
                        {
                          className: "cedros-admin__button cedros-admin__button--ghost",
                          onClick: () => L(E.id),
                          style: { fontSize: 12, padding: "4px 8px" },
                          children: "+ Add Feature"
                        }
                      )
                    ] }),
                    E.features.length === 0 ? /* @__PURE__ */ o("div", { style: { padding: "1rem", textAlign: "center", opacity: 0.5, fontSize: 13, border: "1px dashed currentColor", borderRadius: 6 }, children: 'No features. Click "Add Feature" to add bullet points.' }) : /* @__PURE__ */ o("div", { style: { display: "flex", flexDirection: "column", gap: "0.5rem" }, children: E.features.map((j, X) => /* @__PURE__ */ d("div", { style: { display: "flex", gap: "0.5rem", alignItems: "center" }, children: [
                      /* @__PURE__ */ d("span", { style: { opacity: 0.4, fontSize: 12 }, children: [
                        X + 1,
                        "."
                      ] }),
                      /* @__PURE__ */ o(
                        "input",
                        {
                          type: "text",
                          className: "cedros-admin__input",
                          value: j,
                          onChange: (te) => F(E.id, X, te.target.value),
                          placeholder: "e.g., Powered by MiniMax M2.1",
                          style: { flex: 1 }
                        }
                      ),
                      /* @__PURE__ */ o(
                        "button",
                        {
                          className: "cedros-admin__button cedros-admin__button--ghost",
                          onClick: () => $(E.id, X),
                          style: { padding: "4px 8px", color: "#dc2626" },
                          title: "Remove feature",
                          children: Y.trash
                        }
                      )
                    ] }, X)) })
                  ] })
                ] })
              ]
            },
            E.id
          );
        }) })
      ] })
    ] })
  ] });
}
const uf = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  SubscriptionsSection: wl
}, Symbol.toStringTag, { value: "Module" })), _a = {
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
}, mf = [
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
], xa = [
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
], ka = [
  { value: "center", label: "Center" },
  { value: "top", label: "Top" },
  { value: "bottom", label: "Bottom" },
  { value: "left", label: "Left" },
  { value: "right", label: "Right" }
], pf = [
  { id: "shop-page", label: "Shop Page" },
  { id: "catalog", label: "Catalog" },
  { id: "layouts", label: "Layouts" },
  { id: "product-pages", label: "Product Pages" },
  { id: "checkout", label: "Checkout" }
];
function _l({ serverUrl: e, apiKey: t, authManager: n }) {
  const [r, a] = H("shop-page"), [i, s] = H(_a), [c, l] = H(!0), [u, p] = H(!0), m = J(async () => {
    try {
      let C;
      const T = "/admin/config/storefront";
      if (n?.isAuthenticated())
        C = await n.fetchWithAuth(T);
      else {
        const P = { "Content-Type": "application/json" };
        t && (P["X-API-Key"] = t);
        const L = await fetch(`${e}${T}`, { headers: P });
        if (!L.ok) throw new Error(`Failed to fetch settings: ${L.status}`);
        C = await L.json();
      }
      s({ ..._a, ...C.config });
    } catch {
      s(_a);
    } finally {
      l(!1), setTimeout(() => p(!1), 100);
    }
  }, [e, t, n]);
  ge(() => {
    m();
  }, [m]);
  const h = J(async (C) => {
    const T = "/admin/config/storefront", P = JSON.stringify({ config: C });
    try {
      if (n?.isAuthenticated())
        await n.fetchWithAuth(T, { method: "PUT", body: P });
      else {
        const L = { "Content-Type": "application/json" };
        t && (L["X-API-Key"] = t);
        const F = await fetch(`${e}${T}`, { method: "PUT", headers: L, body: P });
        if (!F.ok) throw new Error(`Failed to save settings: ${F.status}`);
      }
    } catch {
    }
  }, [e, t, n]), { status: g, error: v } = ki({
    data: i,
    onSave: h,
    debounceMs: 1500,
    enabled: !u
  }), f = (C) => {
    s((T) => ({
      ...T,
      relatedProducts: { ...T.relatedProducts, mode: C }
    }));
  }, b = (C) => {
    s((T) => ({
      ...T,
      relatedProducts: { ...T.relatedProducts, maxItems: C }
    }));
  }, k = (C, T) => {
    s((P) => ({
      ...P,
      relatedProducts: {
        ...P.relatedProducts,
        layout: { ...P.relatedProducts.layout, [C]: T }
      }
    }));
  }, w = (C, T) => {
    s((P) => ({
      ...P,
      catalog: {
        ...P.catalog,
        filters: { ...P.catalog.filters, [C]: T }
      }
    }));
  }, _ = (C, T) => {
    const P = i.catalog.sort, L = Object.values(P).filter(Boolean).length;
    !T && L <= 1 || s((F) => ({
      ...F,
      catalog: {
        ...F.catalog,
        sort: { ...F.catalog.sort, [C]: T }
      }
    }));
  }, x = (C, T) => {
    s((P) => ({
      ...P,
      checkout: { ...P.checkout, [C]: T }
    }));
  }, N = (C, T) => {
    s((P) => ({
      ...P,
      shopLayout: { ...P.shopLayout, [C]: T }
    }));
  }, I = (C, T) => {
    s((P) => ({
      ...P,
      categoryLayout: { ...P.categoryLayout, [C]: T }
    }));
  }, S = (C, T) => {
    s((P) => ({
      ...P,
      sections: { ...P.sections, [C]: T }
    }));
  }, A = (C, T) => {
    s((P) => ({
      ...P,
      inventory: { ...P.inventory, [C]: T }
    }));
  }, W = (C, T) => {
    s((P) => ({
      ...P,
      shopPage: { ...P.shopPage, [C]: T }
    }));
  };
  return c ? /* @__PURE__ */ o("div", { className: "cedros-admin__section", children: /* @__PURE__ */ d("div", { className: "cedros-admin__loading", children: [
    Y.loading,
    " Loading storefront settings..."
  ] }) }) : /* @__PURE__ */ d("div", { className: "cedros-admin__storefront-settings", children: [
    /* @__PURE__ */ d("div", { className: "cedros-admin__page-header", children: [
      /* @__PURE__ */ o("h2", { className: "cedros-admin__page-title", children: "Storefront" }),
      /* @__PURE__ */ o("p", { className: "cedros-admin__page-description", children: "Configure catalog filters, product layouts, and checkout settings." })
    ] }),
    /* @__PURE__ */ d("div", { className: "cedros-admin__tabs cedros-admin__tabs--line", children: [
      pf.map((C) => /* @__PURE__ */ o(
        "button",
        {
          type: "button",
          className: `cedros-admin__tab ${r === C.id ? "cedros-admin__tab--active" : ""}`,
          onClick: () => a(C.id),
          children: C.label
        },
        C.id
      )),
      /* @__PURE__ */ o("div", { style: { flex: 1 } }),
      /* @__PURE__ */ o(ff, { status: g, error: v })
    ] }),
    r === "shop-page" && /* @__PURE__ */ d("div", { className: "cedros-admin__section", style: { marginTop: "1rem" }, children: [
      /* @__PURE__ */ o("h4", { style: { marginBottom: "0.5rem", fontWeight: 600 }, children: "Shop Page Content" }),
      /* @__PURE__ */ o("p", { style: { marginBottom: "1.5rem", fontSize: 14, opacity: 0.7 }, children: "Customize the title and description shown on your shop page." }),
      /* @__PURE__ */ d("div", { className: "cedros-admin__field", style: { marginBottom: "1.5rem" }, children: [
        /* @__PURE__ */ o("label", { className: "cedros-admin__field-label", children: "Page Title" }),
        /* @__PURE__ */ o(
          "input",
          {
            type: "text",
            className: "cedros-admin__input",
            value: i.shopPage.title,
            onChange: (C) => W("title", C.target.value),
            placeholder: "Shop"
          }
        ),
        /* @__PURE__ */ o("p", { style: { margin: "0.25rem 0 0", fontSize: 12, opacity: 0.6 }, children: "The main heading displayed on your shop page." })
      ] }),
      /* @__PURE__ */ d("div", { className: "cedros-admin__field", children: [
        /* @__PURE__ */ o("label", { className: "cedros-admin__field-label", children: "Page Description" }),
        /* @__PURE__ */ o(
          "textarea",
          {
            className: "cedros-admin__textarea",
            value: i.shopPage.description,
            onChange: (C) => W("description", C.target.value),
            placeholder: "Browse our collection of products...",
            rows: 3,
            style: { resize: "vertical" }
          }
        ),
        /* @__PURE__ */ o("p", { style: { margin: "0.25rem 0 0", fontSize: 12, opacity: 0.6 }, children: "A short description or subtitle shown below the title. Leave empty to hide." })
      ] })
    ] }),
    r === "catalog" && /* @__PURE__ */ d("div", { className: "cedros-admin__section", style: { marginTop: "1rem" }, children: [
      /* @__PURE__ */ d("div", { children: [
        /* @__PURE__ */ o("h4", { style: { marginBottom: "0.5rem", fontWeight: 600 }, children: "Catalog Filters" }),
        /* @__PURE__ */ o("p", { style: { marginBottom: "1rem", fontSize: 14, opacity: 0.7 }, children: "Choose which filters appear in the shop and category page sidebars." }),
        /* @__PURE__ */ d("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem" }, children: [
          /* @__PURE__ */ d("div", { style: { display: "flex", alignItems: "center", gap: "0.75rem" }, children: [
            /* @__PURE__ */ o(
              Ct,
              {
                checked: i.catalog.filters.tags,
                onChange: (C) => w("tags", C)
              }
            ),
            /* @__PURE__ */ d("div", { children: [
              /* @__PURE__ */ o("span", { style: { fontWeight: 500 }, children: "Tags" }),
              /* @__PURE__ */ o("p", { style: { margin: "0.125rem 0 0", fontSize: 13, opacity: 0.6 }, children: "Filter products by tags (multi-select checkboxes)" })
            ] })
          ] }),
          /* @__PURE__ */ d("div", { style: { display: "flex", alignItems: "center", gap: "0.75rem" }, children: [
            /* @__PURE__ */ o(
              Ct,
              {
                checked: i.catalog.filters.priceRange,
                onChange: (C) => w("priceRange", C)
              }
            ),
            /* @__PURE__ */ d("div", { children: [
              /* @__PURE__ */ o("span", { style: { fontWeight: 500 }, children: "Price Range" }),
              /* @__PURE__ */ o("p", { style: { margin: "0.125rem 0 0", fontSize: 13, opacity: 0.6 }, children: "Filter by minimum and maximum price" })
            ] })
          ] }),
          /* @__PURE__ */ d("div", { style: { display: "flex", alignItems: "center", gap: "0.75rem" }, children: [
            /* @__PURE__ */ o(
              Ct,
              {
                checked: i.catalog.filters.inStock,
                onChange: (C) => w("inStock", C)
              }
            ),
            /* @__PURE__ */ d("div", { children: [
              /* @__PURE__ */ o("span", { style: { fontWeight: 500 }, children: "In Stock" }),
              /* @__PURE__ */ o("p", { style: { margin: "0.125rem 0 0", fontSize: 13, opacity: 0.6 }, children: "Show only products that are in stock" })
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ d("div", { style: { marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1px solid var(--cedros-admin-border, #e5e5e5)" }, children: [
        /* @__PURE__ */ o("h4", { style: { marginBottom: "0.5rem", fontWeight: 600 }, children: "Sort Options" }),
        /* @__PURE__ */ o("p", { style: { marginBottom: "1rem", fontSize: 14, opacity: 0.7 }, children: "Choose which sort options appear in the shop and category pages. At least one must be enabled." }),
        /* @__PURE__ */ d("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem" }, children: [
          /* @__PURE__ */ d("div", { style: { display: "flex", alignItems: "center", gap: "0.75rem" }, children: [
            /* @__PURE__ */ o(
              Ct,
              {
                checked: i.catalog.sort.featured,
                onChange: (C) => _("featured", C)
              }
            ),
            /* @__PURE__ */ d("div", { children: [
              /* @__PURE__ */ o("span", { style: { fontWeight: 500 }, children: "Featured" }),
              /* @__PURE__ */ o("p", { style: { margin: "0.125rem 0 0", fontSize: 13, opacity: 0.6 }, children: "Default sort order (as returned by backend)" })
            ] })
          ] }),
          /* @__PURE__ */ d("div", { style: { display: "flex", alignItems: "center", gap: "0.75rem" }, children: [
            /* @__PURE__ */ o(
              Ct,
              {
                checked: i.catalog.sort.priceAsc,
                onChange: (C) => _("priceAsc", C)
              }
            ),
            /* @__PURE__ */ d("div", { children: [
              /* @__PURE__ */ o("span", { style: { fontWeight: 500 }, children: "Price: Low to High" }),
              /* @__PURE__ */ o("p", { style: { margin: "0.125rem 0 0", fontSize: 13, opacity: 0.6 }, children: "Sort products by price ascending" })
            ] })
          ] }),
          /* @__PURE__ */ d("div", { style: { display: "flex", alignItems: "center", gap: "0.75rem" }, children: [
            /* @__PURE__ */ o(
              Ct,
              {
                checked: i.catalog.sort.priceDesc,
                onChange: (C) => _("priceDesc", C)
              }
            ),
            /* @__PURE__ */ d("div", { children: [
              /* @__PURE__ */ o("span", { style: { fontWeight: 500 }, children: "Price: High to Low" }),
              /* @__PURE__ */ o("p", { style: { margin: "0.125rem 0 0", fontSize: 13, opacity: 0.6 }, children: "Sort products by price descending" })
            ] })
          ] })
        ] })
      ] })
    ] }),
    r === "layouts" && /* @__PURE__ */ d("div", { className: "cedros-admin__section", style: { marginTop: "1rem" }, children: [
      /* @__PURE__ */ o("h4", { style: { marginBottom: "0.5rem", fontWeight: 600 }, children: "Product Layouts" }),
      /* @__PURE__ */ o("p", { style: { marginBottom: "1.5rem", fontSize: 14, opacity: 0.7 }, children: "Configure product card layouts for shop and category pages." }),
      /* @__PURE__ */ d("div", { style: { marginBottom: "2rem" }, children: [
        /* @__PURE__ */ o("div", { style: { fontWeight: 500, marginBottom: "0.75rem" }, children: "Shop Page" }),
        /* @__PURE__ */ o("div", { style: { display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }, children: xa.map((C) => {
          const T = i.shopLayout.layout === C.value;
          return /* @__PURE__ */ d(
            "label",
            {
              style: {
                display: "flex",
                alignItems: "flex-start",
                gap: "0.75rem",
                padding: "0.75rem",
                border: `2px solid ${T ? "var(--cedros-admin-primary, #171717)" : "var(--cedros-admin-border, #e5e5e5)"}`,
                borderRadius: 6,
                cursor: "pointer",
                background: T ? "var(--cedros-admin-bg-accent, #f5f5f5)" : void 0,
                transition: "border-color 0.15s, background 0.15s"
              },
              children: [
                /* @__PURE__ */ o(
                  "input",
                  {
                    type: "radio",
                    name: "shopLayout",
                    value: C.value,
                    checked: T,
                    onChange: () => N("layout", C.value),
                    style: { marginTop: 2 }
                  }
                ),
                /* @__PURE__ */ d("div", { children: [
                  /* @__PURE__ */ o("span", { style: { fontWeight: 500 }, children: C.label }),
                  /* @__PURE__ */ o("p", { style: { margin: "0.125rem 0 0", fontSize: 12, opacity: 0.6 }, children: C.description })
                ] })
              ]
            },
            C.value
          );
        }) }),
        /* @__PURE__ */ o(
          ft,
          {
            value: i.shopLayout.imageCrop,
            onChange: (C) => N("imageCrop", C),
            options: ka,
            label: "Image Crop",
            style: { maxWidth: 180 }
          }
        )
      ] }),
      /* @__PURE__ */ d("div", { style: { paddingTop: "1.5rem", borderTop: "1px solid var(--cedros-admin-border, #e5e5e5)" }, children: [
        /* @__PURE__ */ o("div", { style: { fontWeight: 500, marginBottom: "0.75rem" }, children: "Category Pages" }),
        /* @__PURE__ */ o("div", { style: { display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }, children: xa.map((C) => {
          const T = i.categoryLayout.layout === C.value;
          return /* @__PURE__ */ d(
            "label",
            {
              style: {
                display: "flex",
                alignItems: "flex-start",
                gap: "0.75rem",
                padding: "0.75rem",
                border: `2px solid ${T ? "var(--cedros-admin-primary, #171717)" : "var(--cedros-admin-border, #e5e5e5)"}`,
                borderRadius: 6,
                cursor: "pointer",
                background: T ? "var(--cedros-admin-bg-accent, #f5f5f5)" : void 0,
                transition: "border-color 0.15s, background 0.15s"
              },
              children: [
                /* @__PURE__ */ o(
                  "input",
                  {
                    type: "radio",
                    name: "categoryLayout",
                    value: C.value,
                    checked: T,
                    onChange: () => I("layout", C.value),
                    style: { marginTop: 2 }
                  }
                ),
                /* @__PURE__ */ d("div", { children: [
                  /* @__PURE__ */ o("span", { style: { fontWeight: 500 }, children: C.label }),
                  /* @__PURE__ */ o("p", { style: { margin: "0.125rem 0 0", fontSize: 12, opacity: 0.6 }, children: C.description })
                ] })
              ]
            },
            C.value
          );
        }) }),
        /* @__PURE__ */ o(
          ft,
          {
            value: i.categoryLayout.imageCrop,
            onChange: (C) => I("imageCrop", C),
            options: ka,
            label: "Image Crop",
            style: { maxWidth: 180 }
          }
        )
      ] })
    ] }),
    r === "product-pages" && /* @__PURE__ */ d("div", { className: "cedros-admin__section", style: { marginTop: "1rem" }, children: [
      /* @__PURE__ */ d("div", { children: [
        /* @__PURE__ */ o("h4", { style: { marginBottom: "0.5rem", fontWeight: 600 }, children: "Related Products" }),
        /* @__PURE__ */ o("p", { style: { marginBottom: "1rem", fontSize: 14, opacity: 0.7 }, children: "Configure how related products are displayed on product detail pages." }),
        /* @__PURE__ */ o("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }, children: mf.map((C) => {
          const T = i.relatedProducts.mode === C.value, P = C.badge === "Coming Soon";
          return /* @__PURE__ */ d(
            "label",
            {
              style: {
                display: "flex",
                alignItems: "flex-start",
                gap: "0.75rem",
                padding: "1rem",
                border: `2px solid ${T ? "var(--cedros-admin-primary, #171717)" : "var(--cedros-admin-border, #e5e5e5)"}`,
                borderRadius: 8,
                cursor: P ? "not-allowed" : "pointer",
                opacity: P ? 0.6 : 1,
                background: T ? "var(--cedros-admin-bg-accent, #f5f5f5)" : void 0,
                transition: "border-color 0.15s, background 0.15s"
              },
              children: [
                /* @__PURE__ */ o(
                  "input",
                  {
                    type: "radio",
                    name: "relatedProductsMode",
                    value: C.value,
                    checked: T,
                    onChange: () => !P && f(C.value),
                    disabled: P,
                    style: { marginTop: 2 }
                  }
                ),
                /* @__PURE__ */ d("div", { style: { flex: 1 }, children: [
                  /* @__PURE__ */ d("div", { style: { display: "flex", alignItems: "center", gap: "0.5rem" }, children: [
                    /* @__PURE__ */ o("span", { style: { fontWeight: 600 }, children: C.label }),
                    C.badge && /* @__PURE__ */ o(
                      "span",
                      {
                        style: {
                          fontSize: 11,
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: "#6366f1",
                          color: "#fff"
                        },
                        children: C.badge
                      }
                    )
                  ] }),
                  /* @__PURE__ */ o("p", { style: { margin: "0.25rem 0 0", fontSize: 13, opacity: 0.75 }, children: C.description })
                ] })
              ]
            },
            C.value
          );
        }) }),
        i.relatedProducts.mode === "manual" && /* @__PURE__ */ d(
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
              /* @__PURE__ */ o("strong", { style: { fontSize: 14 }, children: "How to set related products:" }),
              /* @__PURE__ */ d("p", { style: { margin: "0.5rem 0 0", fontSize: 13, opacity: 0.8 }, children: [
                "When editing a product, add a ",
                /* @__PURE__ */ o("code", { style: { background: "rgba(0,0,0,0.1)", padding: "2px 4px", borderRadius: 3 }, children: "relatedProductIds" }),
                " field to its metadata containing a comma-separated list of product IDs."
              ] }),
              /* @__PURE__ */ d("p", { style: { margin: "0.5rem 0 0", fontSize: 13, opacity: 0.6 }, children: [
                "Example: ",
                /* @__PURE__ */ o("code", { style: { background: "rgba(0,0,0,0.1)", padding: "2px 4px", borderRadius: 3 }, children: "prod_123,prod_456,prod_789" })
              ] })
            ]
          }
        ),
        /* @__PURE__ */ d("div", { className: "cedros-admin__field", style: { maxWidth: 200 }, children: [
          /* @__PURE__ */ o("label", { className: "cedros-admin__field-label", children: "Max Related Products" }),
          /* @__PURE__ */ o(
            "input",
            {
              type: "number",
              className: "cedros-admin__input",
              value: i.relatedProducts.maxItems,
              onChange: (C) => b(Math.max(1, Math.min(12, parseInt(C.target.value) || 4))),
              min: 1,
              max: 12
            }
          ),
          /* @__PURE__ */ o("p", { style: { margin: "0.25rem 0 0", fontSize: 12, opacity: 0.6 }, children: "How many related products to show (1-12)" })
        ] }),
        /* @__PURE__ */ d("div", { style: { marginTop: "1.5rem" }, children: [
          /* @__PURE__ */ o("div", { style: { fontWeight: 500, marginBottom: "0.75rem" }, children: "Display Layout" }),
          /* @__PURE__ */ o("div", { style: { display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }, children: xa.map((C) => {
            const T = i.relatedProducts.layout.layout === C.value;
            return /* @__PURE__ */ d(
              "label",
              {
                style: {
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.75rem",
                  padding: "0.75rem",
                  border: `2px solid ${T ? "var(--cedros-admin-primary, #171717)" : "var(--cedros-admin-border, #e5e5e5)"}`,
                  borderRadius: 6,
                  cursor: "pointer",
                  background: T ? "var(--cedros-admin-bg-accent, #f5f5f5)" : void 0,
                  transition: "border-color 0.15s, background 0.15s"
                },
                children: [
                  /* @__PURE__ */ o(
                    "input",
                    {
                      type: "radio",
                      name: "relatedLayout",
                      value: C.value,
                      checked: T,
                      onChange: () => k("layout", C.value),
                      style: { marginTop: 2 }
                    }
                  ),
                  /* @__PURE__ */ d("div", { children: [
                    /* @__PURE__ */ o("span", { style: { fontWeight: 500 }, children: C.label }),
                    /* @__PURE__ */ o("p", { style: { margin: "0.125rem 0 0", fontSize: 12, opacity: 0.6 }, children: C.description })
                  ] })
                ]
              },
              C.value
            );
          }) }),
          /* @__PURE__ */ o(
            ft,
            {
              value: i.relatedProducts.layout.imageCrop,
              onChange: (C) => k("imageCrop", C),
              options: ka,
              label: "Image Crop",
              style: { maxWidth: 180 }
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ d("div", { style: { marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1px solid var(--cedros-admin-border, #e5e5e5)" }, children: [
        /* @__PURE__ */ o("h4", { style: { marginBottom: "0.5rem", fontWeight: 600 }, children: "Page Sections" }),
        /* @__PURE__ */ o("p", { style: { marginBottom: "1rem", fontSize: 14, opacity: 0.7 }, children: "Choose which sections appear on product detail pages." }),
        /* @__PURE__ */ d("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem" }, children: [
          /* @__PURE__ */ d("div", { style: { display: "flex", alignItems: "center", gap: "0.75rem" }, children: [
            /* @__PURE__ */ o(
              Ct,
              {
                checked: i.sections.showDescription,
                onChange: (C) => S("showDescription", C)
              }
            ),
            /* @__PURE__ */ d("div", { children: [
              /* @__PURE__ */ o("span", { style: { fontWeight: 500 }, children: "Description" }),
              /* @__PURE__ */ o("p", { style: { margin: "0.125rem 0 0", fontSize: 13, opacity: 0.6 }, children: "Expandable description accordion" })
            ] })
          ] }),
          /* @__PURE__ */ d("div", { style: { display: "flex", alignItems: "center", gap: "0.75rem" }, children: [
            /* @__PURE__ */ o(
              Ct,
              {
                checked: i.sections.showSpecs,
                onChange: (C) => S("showSpecs", C)
              }
            ),
            /* @__PURE__ */ d("div", { children: [
              /* @__PURE__ */ o("span", { style: { fontWeight: 500 }, children: "Specifications" }),
              /* @__PURE__ */ o("p", { style: { margin: "0.125rem 0 0", fontSize: 13, opacity: 0.6 }, children: "Product attributes and details" })
            ] })
          ] }),
          /* @__PURE__ */ d("div", { style: { display: "flex", alignItems: "center", gap: "0.75rem" }, children: [
            /* @__PURE__ */ o(
              Ct,
              {
                checked: i.sections.showShipping,
                onChange: (C) => S("showShipping", C)
              }
            ),
            /* @__PURE__ */ d("div", { children: [
              /* @__PURE__ */ o("span", { style: { fontWeight: 500 }, children: "Shipping & Returns" }),
              /* @__PURE__ */ o("p", { style: { margin: "0.125rem 0 0", fontSize: 13, opacity: 0.6 }, children: "Shipping and return policy information" })
            ] })
          ] }),
          /* @__PURE__ */ d("div", { style: { display: "flex", alignItems: "center", gap: "0.75rem" }, children: [
            /* @__PURE__ */ o(
              Ct,
              {
                checked: i.sections.showRelatedProducts,
                onChange: (C) => S("showRelatedProducts", C)
              }
            ),
            /* @__PURE__ */ d("div", { children: [
              /* @__PURE__ */ o("span", { style: { fontWeight: 500 }, children: "Related Products" }),
              /* @__PURE__ */ o("p", { style: { margin: "0.125rem 0 0", fontSize: 13, opacity: 0.6 }, children: "Product recommendations section" })
            ] })
          ] })
        ] })
      ] })
    ] }),
    r === "checkout" && /* @__PURE__ */ d("div", { className: "cedros-admin__section", style: { marginTop: "1rem" }, children: [
      /* @__PURE__ */ d("div", { children: [
        /* @__PURE__ */ o("h4", { style: { marginBottom: "0.5rem", fontWeight: 600 }, children: "Checkout Settings" }),
        /* @__PURE__ */ o("p", { style: { marginBottom: "1rem", fontSize: 14, opacity: 0.7 }, children: "Configure checkout and cart page features." }),
        /* @__PURE__ */ o("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem" }, children: /* @__PURE__ */ d("div", { style: { display: "flex", alignItems: "center", gap: "0.75rem" }, children: [
          /* @__PURE__ */ o(
            Ct,
            {
              checked: i.checkout.promoCodes,
              onChange: (C) => x("promoCodes", C)
            }
          ),
          /* @__PURE__ */ d("div", { children: [
            /* @__PURE__ */ o("span", { style: { fontWeight: 500 }, children: "Promo Codes" }),
            /* @__PURE__ */ o("p", { style: { margin: "0.125rem 0 0", fontSize: 13, opacity: 0.6 }, children: "Show promo/coupon code input on cart and checkout pages" })
          ] })
        ] }) })
      ] }),
      /* @__PURE__ */ d("div", { style: { marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1px solid var(--cedros-admin-border, #e5e5e5)" }, children: [
        /* @__PURE__ */ o("h4", { style: { marginBottom: "0.5rem", fontWeight: 600 }, children: "Inventory Settings" }),
        /* @__PURE__ */ o("p", { style: { marginBottom: "1rem", fontSize: 14, opacity: 0.7 }, children: "Configure inventory verification and reservation behavior." }),
        /* @__PURE__ */ d("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem" }, children: [
          /* @__PURE__ */ d("div", { style: { display: "flex", alignItems: "center", gap: "0.75rem" }, children: [
            /* @__PURE__ */ o(
              Ct,
              {
                checked: i.inventory.preCheckoutVerification,
                onChange: (C) => A("preCheckoutVerification", C)
              }
            ),
            /* @__PURE__ */ d("div", { children: [
              /* @__PURE__ */ o("span", { style: { fontWeight: 500 }, children: "Pre-Checkout Verification" }),
              /* @__PURE__ */ o("p", { style: { margin: "0.125rem 0 0", fontSize: 13, opacity: 0.6 }, children: "Verify inventory availability before processing payment" })
            ] })
          ] }),
          /* @__PURE__ */ d("div", { style: { display: "flex", alignItems: "center", gap: "0.75rem" }, children: [
            /* @__PURE__ */ o(
              Ct,
              {
                checked: i.inventory.holdsEnabled,
                onChange: (C) => A("holdsEnabled", C)
              }
            ),
            /* @__PURE__ */ d("div", { children: [
              /* @__PURE__ */ o("span", { style: { fontWeight: 500 }, children: "Inventory Holds" }),
              /* @__PURE__ */ o("p", { style: { margin: "0.125rem 0 0", fontSize: 13, opacity: 0.6 }, children: "Reserve inventory when items are added to cart" })
            ] })
          ] })
        ] }),
        i.inventory.holdsEnabled && /* @__PURE__ */ d("div", { className: "cedros-admin__field", style: { maxWidth: 200, marginTop: "1rem" }, children: [
          /* @__PURE__ */ o("label", { className: "cedros-admin__field-label", children: "Hold Duration (minutes)" }),
          /* @__PURE__ */ o(
            "input",
            {
              type: "number",
              className: "cedros-admin__input",
              value: i.inventory.holdDurationMinutes,
              onChange: (C) => A("holdDurationMinutes", Math.max(5, Math.min(60, parseInt(C.target.value) || 15))),
              min: 5,
              max: 60
            }
          ),
          /* @__PURE__ */ o("p", { style: { margin: "0.25rem 0 0", fontSize: 12, opacity: 0.6 }, children: "How long to reserve inventory in carts (5-60 minutes)" })
        ] })
      ] })
    ] })
  ] });
}
function ff({ status: e, error: t }) {
  return e === "idle" ? null : /* @__PURE__ */ d(
    "span",
    {
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: "0.375rem",
        fontSize: "0.8125rem",
        color: e === "error" ? "var(--cedros-admin-error, #ef4444)" : "var(--cedros-admin-text-muted, #64748b)"
      },
      children: [
        e === "pending" && /* @__PURE__ */ o("span", { style: { opacity: 0.7 }, children: "Unsaved changes" }),
        e === "saving" && /* @__PURE__ */ d(Oe, { children: [
          Y.loading,
          /* @__PURE__ */ o("span", { children: "Saving..." })
        ] }),
        e === "saved" && /* @__PURE__ */ d(Oe, { children: [
          Y.check,
          /* @__PURE__ */ o("span", { style: { color: "var(--cedros-admin-success, #22c55e)" }, children: "Saved" })
        ] }),
        e === "error" && /* @__PURE__ */ d("span", { children: [
          "Save failed",
          t ? `: ${t}` : ""
        ] })
      ]
    }
  );
}
function Ct({
  checked: e,
  onChange: t,
  disabled: n = !1
}) {
  return /* @__PURE__ */ o(
    "button",
    {
      type: "button",
      role: "switch",
      "aria-checked": e,
      disabled: n,
      onClick: () => t(!e),
      style: {
        position: "relative",
        width: 44,
        height: 24,
        borderRadius: 12,
        border: "none",
        backgroundColor: e ? "var(--cedros-admin-primary, #171717)" : "var(--cedros-admin-border, #d4d4d4)",
        cursor: n ? "not-allowed" : "pointer",
        transition: "background-color 0.2s",
        flexShrink: 0,
        opacity: n ? 0.5 : 1
      },
      children: /* @__PURE__ */ o(
        "span",
        {
          style: {
            position: "absolute",
            top: 2,
            left: e ? 22 : 2,
            width: 20,
            height: 20,
            borderRadius: "50%",
            backgroundColor: "white",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            transition: "left 0.2s"
          }
        }
      )
    }
  );
}
const hf = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  StorefrontSection: _l
}, Symbol.toStringTag, { value: "Module" })), Sa = [
  { id: "not_set", label: "Not Set", provider: null },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", provider: "gemini" },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", provider: "gemini" },
  { id: "openai-4o", label: "OpenAI 4o", provider: "openai" },
  { id: "openai-5.1", label: "OpenAI 5.1", provider: "openai" },
  { id: "openai-5.2", label: "OpenAI 5.2", provider: "openai" }
], Ka = [
  {
    task: "site_chat",
    label: "Site Chat",
    description: "The conversational model that crafts responses to customer messages",
    defaultPrompt: `You are a friendly and helpful shopping assistant for our store. Your role is to:

- Help customers find products that match their needs
- Answer questions about products, shipping, returns, and store policies
- Provide personalized recommendations based on customer preferences
- Use the Product Searcher tool when customers are looking for specific items

Guidelines:
- Be warm, conversational, and concise
- Stay focused on helping with shopping-related questions
- If you don't know something specific about a product, say so honestly
- Never make up product details, prices, or availability
- For complex issues (order problems, refunds), direct customers to contact support`
  },
  {
    task: "product_searcher",
    label: "Product Searcher",
    description: "Tool used by Site Chat to find products based on customer queries",
    defaultPrompt: `You are a product search assistant. Given a customer's query, extract relevant search parameters to find matching products.

Extract the following when present:
- Keywords: Main search terms
- Category: Product category or type
- Price range: Min/max price if mentioned
- Attributes: Color, size, material, brand, or other specifications
- Sort preference: Price, popularity, newest, etc.

Return structured search parameters. Be liberal in interpretation - if a customer says "something for my mom's birthday under $50" extract: keywords=gift, price_max=50, occasion=birthday.

Do not make assumptions about specific products. Focus only on extracting search intent.`
  },
  {
    task: "related_product_finder",
    label: "Related Product Finder",
    description: "AI-powered recommendations for related products on product pages",
    defaultPrompt: `You are a product recommendation engine. Given a product, suggest related items that customers might also be interested in.

Consider these recommendation types:
- Complementary items: Products that go well together (e.g., phone case for a phone)
- Similar alternatives: Products in the same category with different features or price points
- Frequently bought together: Items commonly purchased as a set
- Upsells: Premium versions or upgrades

Guidelines:
- Prioritize relevance over variety
- Consider the product's category, price range, and use case
- Return product IDs or search criteria for related items
- Aim for 4-8 recommendations with a mix of types`
  },
  {
    task: "product_detail_assistant",
    label: "Product Detail Assistant",
    description: "Admin tool to generate product descriptions, suggest tags, and fill out product details",
    defaultPrompt: `You are a product copywriting assistant helping store administrators create compelling product listings.

You can help with:
- Writing engaging product descriptions that highlight key features and benefits
- Suggesting relevant tags and categories for better discoverability
- Creating SEO-friendly titles and meta descriptions
- Generating bullet points for key features
- Writing size guides or care instructions when applicable

Guidelines:
- Match the store's brand voice (ask if unclear)
- Focus on benefits, not just features
- Use sensory language when appropriate
- Keep descriptions scannable with short paragraphs
- Avoid superlatives and unverifiable claims
- Include relevant keywords naturally for SEO`
  }
], gf = [
  { id: "gemini", label: "Google Gemini API", placeholder: "AIza..." },
  { id: "openai", label: "OpenAI API", placeholder: "sk-..." }
], Vs = {
  apiKeys: [
    { provider: "gemini", isConfigured: !1 },
    { provider: "openai", isConfigured: !1 }
  ],
  taskAssignments: Ka.map((e) => ({
    task: e.task,
    label: e.label,
    description: e.description,
    assignedModel: "not_set",
    systemPrompt: e.defaultPrompt
  }))
};
function xl({ serverUrl: e, apiKey: t, authManager: n }) {
  const [r, a] = H("api-keys"), [i, s] = H(Vs), [c, l] = H(!0), [u, p] = H(!1), [m, h] = H(null), [g, v] = H(!1), f = gt(null), [b, k] = H({
    gemini: "",
    openai: ""
  }), [w, _] = H({
    gemini: !1,
    openai: !1
  });
  ge(() => {
    async function C() {
      try {
        let T;
        if (n?.isAuthenticated())
          T = await n.fetchWithAuth("/admin/config/ai");
        else {
          const P = { "Content-Type": "application/json" };
          t && (P["X-API-Key"] = t);
          const L = await fetch(`${e}/admin/config/ai`, { headers: P });
          if (!L.ok) throw new Error(`Failed to fetch: ${L.status}`);
          T = await L.json();
        }
        T.settings && s(T.settings);
      } catch {
        s(Vs);
      } finally {
        l(!1);
      }
    }
    C();
  }, [e, t, n]);
  const x = J(
    async (C) => {
      const T = b[C];
      if (T.trim()) {
        p(!0), h(null);
        try {
          const P = { provider: C, apiKey: T };
          if (n?.isAuthenticated())
            await n.fetchWithAuth("/admin/config/ai/api-key", {
              method: "PUT",
              body: JSON.stringify(P)
            });
          else {
            const L = { "Content-Type": "application/json" };
            t && (L["X-API-Key"] = t);
            const F = await fetch(`${e}/admin/config/ai/api-key`, {
              method: "PUT",
              headers: L,
              body: JSON.stringify(P)
            });
            if (!F.ok) throw new Error(`Failed to save: ${F.status}`);
          }
          s((L) => ({
            ...L,
            apiKeys: L.apiKeys.map(
              (F) => F.provider === C ? {
                ...F,
                isConfigured: !0,
                maskedKey: `${T.slice(0, 4)}...${T.slice(-4)}`,
                updatedAt: (/* @__PURE__ */ new Date()).toISOString()
              } : F
            )
          })), k((L) => ({ ...L, [C]: "" })), v(!0), f.current && clearTimeout(f.current), f.current = setTimeout(() => v(!1), 3e3);
        } catch (P) {
          h(P instanceof Error ? P.message : "Failed to save API key");
        } finally {
          p(!1);
        }
      }
    },
    [b, e, t, n]
  ), N = J(
    async (C) => {
      if (confirm(`Are you sure you want to delete the ${C === "gemini" ? "Google Gemini" : "OpenAI"} API key?`)) {
        p(!0), h(null);
        try {
          if (n?.isAuthenticated())
            await n.fetchWithAuth(`/admin/config/ai/api-key/${C}`, {
              method: "DELETE"
            });
          else {
            const T = { "Content-Type": "application/json" };
            t && (T["X-API-Key"] = t);
            const P = await fetch(`${e}/admin/config/ai/api-key/${C}`, {
              method: "DELETE",
              headers: T
            });
            if (!P.ok) throw new Error(`Failed to delete: ${P.status}`);
          }
          s((T) => ({
            ...T,
            apiKeys: T.apiKeys.map(
              (P) => P.provider === C ? { provider: C, isConfigured: !1 } : P
            )
          }));
        } catch (T) {
          h(T instanceof Error ? T.message : "Failed to delete API key");
        } finally {
          p(!1);
        }
      }
    },
    [e, t, n]
  ), I = J(
    async (C, T) => {
      p(!0), h(null);
      try {
        const P = { task: C, model: T };
        if (n?.isAuthenticated())
          await n.fetchWithAuth("/admin/config/ai/assignment", {
            method: "PUT",
            body: JSON.stringify(P)
          });
        else {
          const L = { "Content-Type": "application/json" };
          t && (L["X-API-Key"] = t);
          const F = await fetch(`${e}/admin/config/ai/assignment`, {
            method: "PUT",
            headers: L,
            body: JSON.stringify(P)
          });
          if (!F.ok) throw new Error(`Failed to save: ${F.status}`);
        }
        s((L) => ({
          ...L,
          taskAssignments: L.taskAssignments.map(
            (F) => F.task === C ? { ...F, assignedModel: T } : F
          )
        })), v(!0), f.current && clearTimeout(f.current), f.current = setTimeout(() => v(!1), 3e3);
      } catch (P) {
        h(P instanceof Error ? P.message : "Failed to save assignment");
      } finally {
        p(!1);
      }
    },
    [e, t, n]
  ), S = J(
    (C) => {
      if (C === "not_set") return !0;
      const T = Sa.find((L) => L.id === C);
      return T?.provider ? i.apiKeys.find((L) => L.provider === T.provider)?.isConfigured ?? !1 : !0;
    },
    [i.apiKeys]
  ), A = Te(() => Sa.map((C) => {
    const T = S(C.id);
    return {
      value: C.id,
      label: T ? C.label : `${C.label} (API key required)`,
      disabled: !T
    };
  }), [S]), W = J(
    async (C, T) => {
      p(!0), h(null);
      try {
        const P = { task: C, systemPrompt: T };
        if (n?.isAuthenticated())
          await n.fetchWithAuth("/admin/config/ai/prompt", {
            method: "PUT",
            body: JSON.stringify(P)
          });
        else {
          const L = { "Content-Type": "application/json" };
          t && (L["X-API-Key"] = t);
          const F = await fetch(`${e}/admin/config/ai/prompt`, {
            method: "PUT",
            headers: L,
            body: JSON.stringify(P)
          });
          if (!F.ok) throw new Error(`Failed to save: ${F.status}`);
        }
        s((L) => ({
          ...L,
          taskAssignments: L.taskAssignments.map(
            (F) => F.task === C ? { ...F, systemPrompt: T } : F
          )
        })), v(!0), f.current && clearTimeout(f.current), f.current = setTimeout(() => v(!1), 3e3);
      } catch (P) {
        h(P instanceof Error ? P.message : "Failed to save prompt");
      } finally {
        p(!1);
      }
    },
    [e, t, n]
  );
  return ge(() => () => {
    f.current && clearTimeout(f.current);
  }, []), c ? /* @__PURE__ */ o("div", { className: "cedros-admin__section", children: /* @__PURE__ */ d("div", { className: "cedros-admin__loading", children: [
    Y.loading,
    " Loading AI settings..."
  ] }) }) : /* @__PURE__ */ d("div", { className: "cedros-admin__ai-settings", children: [
    /* @__PURE__ */ d("div", { className: "cedros-admin__page-header", children: [
      /* @__PURE__ */ o("h2", { className: "cedros-admin__page-title", children: "Store AI" }),
      /* @__PURE__ */ o("p", { className: "cedros-admin__page-description", children: "Configure AI providers, model assignments, and system prompts." })
    ] }),
    /* @__PURE__ */ d("div", { className: "cedros-admin__tabs cedros-admin__tabs--line", children: [
      /* @__PURE__ */ o(
        "button",
        {
          type: "button",
          className: `cedros-admin__tab ${r === "api-keys" ? "cedros-admin__tab--active" : ""}`,
          onClick: () => a("api-keys"),
          children: "API Keys"
        }
      ),
      /* @__PURE__ */ o(
        "button",
        {
          type: "button",
          className: `cedros-admin__tab ${r === "assignments" ? "cedros-admin__tab--active" : ""}`,
          onClick: () => a("assignments"),
          children: "Model Assignments"
        }
      ),
      /* @__PURE__ */ o(
        "button",
        {
          type: "button",
          className: `cedros-admin__tab ${r === "prompts" ? "cedros-admin__tab--active" : ""}`,
          onClick: () => a("prompts"),
          children: "Prompts"
        }
      )
    ] }),
    m && /* @__PURE__ */ o("div", { className: "cedros-admin__error-banner", style: { marginTop: "1rem" }, children: m }),
    g && /* @__PURE__ */ d("div", { className: "cedros-admin__success-banner", style: { marginTop: "1rem" }, children: [
      Y.check,
      " Settings saved successfully"
    ] }),
    r === "api-keys" && /* @__PURE__ */ d("div", { className: "cedros-admin__section", style: { marginTop: "1rem" }, children: [
      /* @__PURE__ */ o("div", { className: "cedros-admin__section-header", children: /* @__PURE__ */ o("h3", { className: "cedros-admin__section-title", children: "API Keys" }) }),
      /* @__PURE__ */ o("p", { style: { marginBottom: "1.5rem", opacity: 0.7, fontSize: 14 }, children: "Configure API keys for AI providers. Keys are stored securely and never exposed." }),
      /* @__PURE__ */ o("div", { style: { display: "flex", flexDirection: "column", gap: "1.5rem" }, children: gf.map((C) => {
        const T = i.apiKeys.find((L) => L.provider === C.id), P = T?.isConfigured ?? !1;
        return /* @__PURE__ */ d(
          "div",
          {
            className: "cedros-admin__api-key-card",
            style: {
              padding: "1rem",
              border: "1px solid var(--cedros-admin-border)",
              borderRadius: 8
            },
            children: [
              /* @__PURE__ */ d("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }, children: [
                /* @__PURE__ */ d("div", { children: [
                  /* @__PURE__ */ o("div", { style: { fontWeight: 600 }, children: C.label }),
                  P && T?.maskedKey && /* @__PURE__ */ d("div", { style: { fontSize: 12, opacity: 0.6, marginTop: 2 }, children: [
                    "Current key: ",
                    T.maskedKey,
                    T.updatedAt && /* @__PURE__ */ d("span", { children: [
                      " (updated ",
                      new Date(T.updatedAt).toLocaleDateString(),
                      ")"
                    ] })
                  ] })
                ] }),
                /* @__PURE__ */ o(
                  "span",
                  {
                    className: `cedros-admin__badge ${P ? "cedros-admin__badge--success" : "cedros-admin__badge--muted"}`,
                    children: P ? "Configured" : "Not Set"
                  }
                )
              ] }),
              /* @__PURE__ */ o("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem" }, children: /* @__PURE__ */ d("div", { style: { display: "flex", gap: "0.5rem", alignItems: "center" }, children: [
                /* @__PURE__ */ o(
                  "input",
                  {
                    type: w[C.id] ? "text" : "password",
                    className: "cedros-admin__input",
                    placeholder: P ? "Enter new key to replace" : C.placeholder,
                    value: b[C.id],
                    onChange: (L) => k((F) => ({ ...F, [C.id]: L.target.value })),
                    onBlur: () => {
                      b[C.id].trim() && x(C.id);
                    },
                    style: { flex: 1 }
                  }
                ),
                /* @__PURE__ */ o(
                  "button",
                  {
                    type: "button",
                    className: "cedros-admin__button cedros-admin__button--ghost",
                    onClick: () => _((L) => ({ ...L, [C.id]: !L[C.id] })),
                    title: w[C.id] ? "Hide key" : "Show key",
                    style: { padding: "0.5rem" },
                    children: w[C.id] ? Y.eyeOff : Y.eye
                  }
                ),
                P && /* @__PURE__ */ o(
                  "button",
                  {
                    type: "button",
                    className: "cedros-admin__button cedros-admin__button--ghost cedros-admin__button--danger",
                    onClick: () => N(C.id),
                    disabled: u,
                    title: "Remove API key",
                    style: { padding: "0.5rem" },
                    children: Y.trash
                  }
                )
              ] }) })
            ]
          },
          C.id
        );
      }) })
    ] }),
    r === "assignments" && /* @__PURE__ */ d("div", { className: "cedros-admin__section", style: { marginTop: "1rem" }, children: [
      /* @__PURE__ */ o("div", { className: "cedros-admin__section-header", children: /* @__PURE__ */ o("h3", { className: "cedros-admin__section-title", children: "Model Assignments" }) }),
      /* @__PURE__ */ o("p", { style: { marginBottom: "1.5rem", opacity: 0.7, fontSize: 14 }, children: "Assign AI models to specific tasks. Models require their provider's API key to be configured." }),
      /* @__PURE__ */ o("div", { style: { display: "flex", flexDirection: "column", gap: "1rem" }, children: i.taskAssignments.map((C) => {
        const T = Ka.find((L) => L.task === C.task), P = Sa.find((L) => L.id === C.assignedModel);
        return /* @__PURE__ */ d(
          "div",
          {
            style: {
              padding: "1rem",
              border: "1px solid var(--cedros-admin-border)",
              borderRadius: 8
            },
            children: [
              /* @__PURE__ */ d("div", { style: { marginBottom: "0.75rem" }, children: [
                /* @__PURE__ */ o("div", { style: { fontWeight: 600 }, children: T?.label ?? C.task }),
                /* @__PURE__ */ o("div", { style: { fontSize: 13, opacity: 0.7, marginTop: 2 }, children: T?.description })
              ] }),
              /* @__PURE__ */ d("div", { style: { display: "flex", alignItems: "center", gap: "0.75rem" }, children: [
                /* @__PURE__ */ o(
                  ft,
                  {
                    value: C.assignedModel,
                    onChange: (L) => I(C.task, L),
                    options: A,
                    label: "",
                    disabled: u,
                    style: { flex: 1, maxWidth: 280 }
                  }
                ),
                P && P.provider && /* @__PURE__ */ o(
                  "span",
                  {
                    className: `cedros-admin__badge ${S(P.id) ? "cedros-admin__badge--success" : "cedros-admin__badge--warning"}`,
                    children: S(P.id) ? "Ready" : "Missing API Key"
                  }
                )
              ] })
            ]
          },
          C.task
        );
      }) })
    ] }),
    r === "prompts" && /* @__PURE__ */ d("div", { className: "cedros-admin__section", style: { marginTop: "1rem" }, children: [
      /* @__PURE__ */ o("div", { className: "cedros-admin__section-header", children: /* @__PURE__ */ o("h3", { className: "cedros-admin__section-title", children: "System Prompts" }) }),
      /* @__PURE__ */ o("p", { style: { marginBottom: "1.5rem", opacity: 0.7, fontSize: 14 }, children: "Configure the default system prompts for each AI task. These prompts guide the AI's behavior and responses." }),
      /* @__PURE__ */ o("div", { style: { display: "flex", flexDirection: "column", gap: "1.5rem" }, children: i.taskAssignments.map((C) => {
        const T = Ka.find((P) => P.task === C.task);
        return /* @__PURE__ */ o(
          yf,
          {
            task: C.task,
            label: T?.label ?? C.task,
            description: T?.description ?? "",
            initialPrompt: C.systemPrompt ?? "",
            onSave: W
          },
          C.task
        );
      }) })
    ] })
  ] });
}
function yf({
  task: e,
  label: t,
  description: n,
  initialPrompt: r,
  onSave: a
}) {
  const [i, s] = H(r), [c, l] = H("idle"), u = gt(null), p = gt(null), m = gt(!0);
  return ge(() => {
    if (m.current) {
      m.current = !1;
      return;
    }
    return u.current && clearTimeout(u.current), p.current && clearTimeout(p.current), l("pending"), u.current = setTimeout(async () => {
      l("saving");
      try {
        await a(e, i), l("saved"), p.current = setTimeout(() => l("idle"), 2e3);
      } catch {
        l("error");
      }
    }, 1500), () => {
      u.current && clearTimeout(u.current);
    };
  }, [i, e, a]), ge(() => () => {
    u.current && clearTimeout(u.current), p.current && clearTimeout(p.current);
  }, []), /* @__PURE__ */ d(
    "div",
    {
      style: {
        padding: "1rem",
        border: "1px solid var(--cedros-admin-border)",
        borderRadius: 8
      },
      children: [
        /* @__PURE__ */ d("div", { style: { marginBottom: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }, children: [
          /* @__PURE__ */ d("div", { children: [
            /* @__PURE__ */ o("div", { style: { fontWeight: 600 }, children: t }),
            /* @__PURE__ */ o("div", { style: { fontSize: 13, opacity: 0.7, marginTop: 2 }, children: n })
          ] }),
          /* @__PURE__ */ o(vf, { status: c })
        ] }),
        /* @__PURE__ */ o(
          "textarea",
          {
            className: "cedros-admin__input",
            value: i,
            onChange: (h) => s(h.target.value),
            placeholder: "Enter system prompt...",
            rows: 4,
            style: {
              width: "100%",
              resize: "vertical",
              fontFamily: "inherit",
              minHeight: 100
            }
          }
        )
      ]
    }
  );
}
function vf({ status: e }) {
  return e === "idle" ? null : /* @__PURE__ */ d(
    "span",
    {
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: "0.375rem",
        fontSize: "0.75rem",
        color: e === "error" ? "var(--cedros-admin-error, #ef4444)" : "var(--cedros-admin-text-muted, #64748b)"
      },
      children: [
        e === "pending" && /* @__PURE__ */ o("span", { style: { opacity: 0.7 }, children: "Unsaved" }),
        e === "saving" && /* @__PURE__ */ d(Oe, { children: [
          Y.loading,
          /* @__PURE__ */ o("span", { children: "Saving..." })
        ] }),
        e === "saved" && /* @__PURE__ */ d(Oe, { children: [
          Y.check,
          /* @__PURE__ */ o("span", { style: { color: "var(--cedros-admin-success, #22c55e)" }, children: "Saved" })
        ] }),
        e === "error" && /* @__PURE__ */ o("span", { children: "Failed" })
      ]
    }
  );
}
const bf = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  AISettingsSection: xl
}, Symbol.toStringTag, { value: "Module" }));
function Vn({ href: e, children: t }) {
  return /* @__PURE__ */ o(
    "a",
    {
      href: e,
      target: "_blank",
      rel: "noopener noreferrer",
      style: { color: "inherit", textDecoration: "underline" },
      children: t
    }
  );
}
const Hs = [
  {
    id: "stripe",
    label: "Stripe",
    category: "stripe",
    description: /* @__PURE__ */ d(Oe, { children: [
      "Configure your Stripe integration for card payments. Get your API keys from the",
      " ",
      /* @__PURE__ */ o(Vn, { href: "https://dashboard.stripe.com/apikeys", children: "Stripe Dashboard" }),
      "."
    ] })
  },
  {
    id: "crypto",
    label: "Crypto",
    category: "x402",
    description: /* @__PURE__ */ d(Oe, { children: [
      "Configure Solana wallet and token settings for crypto payments. Get a fast RPC endpoint from",
      " ",
      /* @__PURE__ */ o(Vn, { href: "https://www.helius.dev", children: "Helius" }),
      " or",
      " ",
      /* @__PURE__ */ o(Vn, { href: "https://www.quicknode.com/chains/sol", children: "QuickNode" }),
      ". Set up a payment address using",
      " ",
      /* @__PURE__ */ o(Vn, { href: "https://phantom.app", children: "Phantom" }),
      " or",
      " ",
      /* @__PURE__ */ o(Vn, { href: "https://solflare.com", children: "Solflare" }),
      " wallet."
    ] })
  },
  {
    id: "credits",
    label: "Credits",
    category: "cedros_login",
    description: /* @__PURE__ */ d(Oe, { children: [
      "Configure Cedros Login integration for credits payments. See the",
      " ",
      /* @__PURE__ */ o(Vn, { href: "https://docs.cedros.dev/credits", children: "Credits API documentation" }),
      "."
    ] })
  }
];
function kl({ serverUrl: e, apiKey: t, authManager: n }) {
  const [r, a] = H("stripe"), i = Hs.find((s) => s.id === r);
  return /* @__PURE__ */ d("div", { className: "cedros-admin__payment-settings", children: [
    /* @__PURE__ */ d("div", { className: "cedros-admin__page-header", children: [
      /* @__PURE__ */ o("h2", { className: "cedros-admin__page-title", children: "Payment Options" }),
      /* @__PURE__ */ o("p", { className: "cedros-admin__page-description", children: "Configure payment methods including Stripe, crypto, and credits." })
    ] }),
    /* @__PURE__ */ o("div", { className: "cedros-admin__tabs cedros-admin__tabs--line", children: Hs.map((s) => /* @__PURE__ */ o(
      "button",
      {
        type: "button",
        className: `cedros-admin__tab ${r === s.id ? "cedros-admin__tab--active" : ""}`,
        onClick: () => a(s.id),
        children: s.label
      },
      s.id
    )) }),
    /* @__PURE__ */ o("div", { style: { marginTop: "1rem" }, children: /* @__PURE__ */ o(
      vl,
      {
        serverUrl: e,
        apiKey: t,
        authManager: n,
        category: i.category,
        title: `${i.label} Settings`,
        description: i.description,
        showEnabledToggle: !0
      },
      i.category
    ) })
  ] });
}
const wf = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  PaymentSettingsSection: kl
}, Symbol.toStringTag, { value: "Module" })), Ca = {
  email_enabled: !1,
  smtp_host: "",
  smtp_port: 587,
  smtp_username: "",
  smtp_password: "",
  from_email: "",
  from_name: "",
  webhook_enabled: !1,
  webhook_url: "",
  webhook_secret: "",
  webhook_timeout: 30
};
function Sl({ serverUrl: e, apiKey: t, authManager: n }) {
  const [r, a] = H("messages"), [i, s] = H(Ca), [c, l] = H(!0), [u, p] = H(!0), [m, h] = H(/* @__PURE__ */ new Set()), g = J(async () => {
    try {
      let w;
      const _ = "/admin/config/messaging";
      if (n?.isAuthenticated())
        w = await n.fetchWithAuth(_);
      else {
        const x = { "Content-Type": "application/json" };
        t && (x["X-API-Key"] = t);
        const N = await fetch(`${e}${_}`, { headers: x });
        if (!N.ok) throw new Error(`Failed to fetch: ${N.status}`);
        w = await N.json();
      }
      s({ ...Ca, ...w.config });
    } catch {
      s(Ca);
    } finally {
      l(!1), setTimeout(() => p(!1), 100);
    }
  }, [e, t, n]);
  ge(() => {
    g();
  }, [g]);
  const v = J(async (w) => {
    const _ = "/admin/config/messaging", x = { ...w };
    m.has("smtp_password") || delete x.smtp_password, m.has("webhook_secret") || delete x.webhook_secret;
    const N = JSON.stringify({ config: x });
    try {
      if (n?.isAuthenticated())
        await n.fetchWithAuth(_, { method: "PUT", body: N });
      else {
        const I = { "Content-Type": "application/json" };
        t && (I["X-API-Key"] = t);
        const S = await fetch(`${e}${_}`, { method: "PUT", headers: I, body: N });
        if (!S.ok) throw new Error(`Failed to save: ${S.status}`);
      }
    } catch {
    }
  }, [e, t, n, m]), { status: f, error: b } = ki({
    data: i,
    onSave: v,
    debounceMs: 1500,
    enabled: !u
  }), k = (w, _) => {
    (w === "smtp_password" || w === "webhook_secret") && h((x) => new Set(x).add(w)), s((x) => ({ ...x, [w]: _ }));
  };
  return c ? /* @__PURE__ */ d("div", { className: "cedros-admin__messaging-settings", children: [
    /* @__PURE__ */ d("div", { className: "cedros-admin__page-header", children: [
      /* @__PURE__ */ o("h2", { className: "cedros-admin__page-title", children: "Store Messages" }),
      /* @__PURE__ */ o("p", { className: "cedros-admin__page-description", children: "Configure email delivery and webhook notifications." })
    ] }),
    /* @__PURE__ */ d("div", { className: "cedros-admin__loading", style: { marginTop: "1rem" }, children: [
      Y.loading,
      " Loading message settings..."
    ] })
  ] }) : /* @__PURE__ */ d("div", { className: "cedros-admin__messaging-settings", children: [
    /* @__PURE__ */ d("div", { className: "cedros-admin__page-header", children: [
      /* @__PURE__ */ o("h2", { className: "cedros-admin__page-title", children: "Store Messages" }),
      /* @__PURE__ */ o("p", { className: "cedros-admin__page-description", children: "Configure email delivery and webhook notifications." })
    ] }),
    /* @__PURE__ */ d("div", { className: "cedros-admin__tabs cedros-admin__tabs--line", children: [
      /* @__PURE__ */ o(
        "button",
        {
          type: "button",
          className: `cedros-admin__tab ${r === "messages" ? "cedros-admin__tab--active" : ""}`,
          onClick: () => a("messages"),
          children: "Messages"
        }
      ),
      /* @__PURE__ */ o(
        "button",
        {
          type: "button",
          className: `cedros-admin__tab ${r === "email" ? "cedros-admin__tab--active" : ""}`,
          onClick: () => a("email"),
          children: "Email"
        }
      ),
      /* @__PURE__ */ o(
        "button",
        {
          type: "button",
          className: `cedros-admin__tab ${r === "webhooks" ? "cedros-admin__tab--active" : ""}`,
          onClick: () => a("webhooks"),
          children: "Webhooks"
        }
      ),
      /* @__PURE__ */ o("div", { style: { flex: 1 } }),
      /* @__PURE__ */ o(_f, { status: f, error: b })
    ] }),
    /* @__PURE__ */ d("div", { className: "cedros-admin__tab-content", style: { marginTop: "1rem" }, children: [
      r === "messages" && /* @__PURE__ */ d("div", { className: "cedros-admin__section", children: [
        /* @__PURE__ */ o("p", { style: { marginBottom: "1.5rem", fontSize: "0.875rem", opacity: 0.7 }, children: "Enable or disable notification types. Configure the delivery settings in the Email or Webhooks tab." }),
        /* @__PURE__ */ d("div", { style: { display: "flex", flexDirection: "column", gap: "1rem" }, children: [
          /* @__PURE__ */ d(
            "div",
            {
              style: {
                display: "flex",
                alignItems: "flex-start",
                gap: "1rem",
                padding: "1rem",
                border: "1px solid var(--cedros-admin-border, #e5e5e5)",
                borderRadius: "0.5rem"
              },
              children: [
                /* @__PURE__ */ o(
                  qs,
                  {
                    checked: i.email_enabled,
                    onChange: () => k("email_enabled", !i.email_enabled)
                  }
                ),
                /* @__PURE__ */ d("div", { style: { flex: 1 }, children: [
                  /* @__PURE__ */ o("div", { style: { fontWeight: 500 }, children: "Email Confirmation" }),
                  /* @__PURE__ */ o("p", { style: { margin: "0.25rem 0 0", fontSize: "0.8125rem", opacity: 0.6 }, children: "Send order confirmation emails to customers after successful purchase." }),
                  /* @__PURE__ */ o("p", { style: { margin: "0.5rem 0 0", fontSize: "0.75rem", opacity: 0.5 }, children: "Requires Email configuration" })
                ] })
              ]
            }
          ),
          /* @__PURE__ */ d(
            "div",
            {
              style: {
                display: "flex",
                alignItems: "flex-start",
                gap: "1rem",
                padding: "1rem",
                border: "1px solid var(--cedros-admin-border, #e5e5e5)",
                borderRadius: "0.5rem"
              },
              children: [
                /* @__PURE__ */ o(
                  qs,
                  {
                    checked: i.webhook_enabled,
                    onChange: () => k("webhook_enabled", !i.webhook_enabled)
                  }
                ),
                /* @__PURE__ */ d("div", { style: { flex: 1 }, children: [
                  /* @__PURE__ */ o("div", { style: { fontWeight: 500 }, children: "Admin Purchase Notification" }),
                  /* @__PURE__ */ o("p", { style: { margin: "0.25rem 0 0", fontSize: "0.8125rem", opacity: 0.6 }, children: "Send webhook notifications to your server when a purchase is completed." }),
                  /* @__PURE__ */ o("p", { style: { margin: "0.5rem 0 0", fontSize: "0.75rem", opacity: 0.5 }, children: "Requires Webhook configuration" })
                ] })
              ]
            }
          )
        ] })
      ] }),
      r === "email" && /* @__PURE__ */ d("div", { className: "cedros-admin__section", children: [
        /* @__PURE__ */ o("p", { style: { marginBottom: "1.5rem", fontSize: "0.875rem", opacity: 0.7 }, children: "Configure your email provider for sending customer notifications." }),
        !i.email_enabled && /* @__PURE__ */ o(
          "div",
          {
            style: {
              padding: "1rem",
              marginBottom: "1.5rem",
              background: "var(--cedros-admin-bg-accent, #fef3c7)",
              borderRadius: "0.5rem",
              border: "1px solid var(--cedros-admin-warning, #f59e0b)",
              fontSize: "0.875rem"
            },
            children: "Email notifications are disabled. Enable them in the Messages tab."
          }
        ),
        /* @__PURE__ */ d("div", { style: { display: "flex", flexDirection: "column", gap: "1rem", opacity: i.email_enabled ? 1 : 0.5 }, children: [
          /* @__PURE__ */ d("div", { className: "cedros-admin__field", children: [
            /* @__PURE__ */ o("label", { className: "cedros-admin__field-label", children: "SMTP Host" }),
            /* @__PURE__ */ o(
              "input",
              {
                type: "text",
                className: "cedros-admin__input",
                value: i.smtp_host,
                onChange: (w) => k("smtp_host", w.target.value),
                placeholder: "smtp.example.com",
                disabled: !i.email_enabled
              }
            )
          ] }),
          /* @__PURE__ */ d("div", { className: "cedros-admin__field", children: [
            /* @__PURE__ */ o("label", { className: "cedros-admin__field-label", children: "SMTP Port" }),
            /* @__PURE__ */ o(
              "input",
              {
                type: "number",
                className: "cedros-admin__input",
                value: i.smtp_port,
                onChange: (w) => k("smtp_port", parseInt(w.target.value) || 587),
                placeholder: "587",
                disabled: !i.email_enabled,
                style: { maxWidth: 120 }
              }
            )
          ] }),
          /* @__PURE__ */ d("div", { className: "cedros-admin__field", children: [
            /* @__PURE__ */ o("label", { className: "cedros-admin__field-label", children: "SMTP Username" }),
            /* @__PURE__ */ o(
              "input",
              {
                type: "text",
                className: "cedros-admin__input",
                value: i.smtp_username,
                onChange: (w) => k("smtp_username", w.target.value),
                placeholder: "username or API key",
                disabled: !i.email_enabled
              }
            )
          ] }),
          /* @__PURE__ */ d("div", { className: "cedros-admin__field", children: [
            /* @__PURE__ */ o("label", { className: "cedros-admin__field-label", children: "SMTP Password" }),
            /* @__PURE__ */ o(
              "input",
              {
                type: "password",
                className: "cedros-admin__input",
                value: m.has("smtp_password") ? i.smtp_password : "",
                onChange: (w) => k("smtp_password", w.target.value),
                placeholder: i.smtp_password ? "••••••••" : "Enter password",
                disabled: !i.email_enabled
              }
            )
          ] }),
          /* @__PURE__ */ d("div", { className: "cedros-admin__field", children: [
            /* @__PURE__ */ o("label", { className: "cedros-admin__field-label", children: "From Email" }),
            /* @__PURE__ */ o(
              "input",
              {
                type: "email",
                className: "cedros-admin__input",
                value: i.from_email,
                onChange: (w) => k("from_email", w.target.value),
                placeholder: "orders@yourstore.com",
                disabled: !i.email_enabled
              }
            )
          ] }),
          /* @__PURE__ */ d("div", { className: "cedros-admin__field", children: [
            /* @__PURE__ */ o("label", { className: "cedros-admin__field-label", children: "From Name" }),
            /* @__PURE__ */ o(
              "input",
              {
                type: "text",
                className: "cedros-admin__input",
                value: i.from_name,
                onChange: (w) => k("from_name", w.target.value),
                placeholder: "Your Store",
                disabled: !i.email_enabled
              }
            )
          ] })
        ] })
      ] }),
      r === "webhooks" && /* @__PURE__ */ d("div", { className: "cedros-admin__section", children: [
        /* @__PURE__ */ o("p", { style: { marginBottom: "1.5rem", fontSize: "0.875rem", opacity: 0.7 }, children: "Configure webhook endpoint for receiving purchase notifications." }),
        !i.webhook_enabled && /* @__PURE__ */ o(
          "div",
          {
            style: {
              padding: "1rem",
              marginBottom: "1.5rem",
              background: "var(--cedros-admin-bg-accent, #fef3c7)",
              borderRadius: "0.5rem",
              border: "1px solid var(--cedros-admin-warning, #f59e0b)",
              fontSize: "0.875rem"
            },
            children: "Webhook notifications are disabled. Enable them in the Messages tab."
          }
        ),
        /* @__PURE__ */ d("div", { style: { display: "flex", flexDirection: "column", gap: "1rem", opacity: i.webhook_enabled ? 1 : 0.5 }, children: [
          /* @__PURE__ */ d("div", { className: "cedros-admin__field", children: [
            /* @__PURE__ */ o("label", { className: "cedros-admin__field-label", children: "Webhook URL" }),
            /* @__PURE__ */ o(
              "input",
              {
                type: "url",
                className: "cedros-admin__input",
                value: i.webhook_url,
                onChange: (w) => k("webhook_url", w.target.value),
                placeholder: "https://api.yoursite.com/webhooks/orders",
                disabled: !i.webhook_enabled
              }
            )
          ] }),
          /* @__PURE__ */ d("div", { className: "cedros-admin__field", children: [
            /* @__PURE__ */ o("label", { className: "cedros-admin__field-label", children: "Webhook Secret" }),
            /* @__PURE__ */ o(
              "input",
              {
                type: "password",
                className: "cedros-admin__input",
                value: m.has("webhook_secret") ? i.webhook_secret : "",
                onChange: (w) => k("webhook_secret", w.target.value),
                placeholder: i.webhook_secret ? "••••••••" : "Enter secret for HMAC-SHA256",
                disabled: !i.webhook_enabled
              }
            ),
            /* @__PURE__ */ o("p", { style: { margin: "0.25rem 0 0", fontSize: "0.75rem", opacity: 0.6 }, children: "Used for HMAC-SHA256 signature verification" })
          ] }),
          /* @__PURE__ */ d("div", { className: "cedros-admin__field", children: [
            /* @__PURE__ */ o("label", { className: "cedros-admin__field-label", children: "Timeout (seconds)" }),
            /* @__PURE__ */ o(
              "input",
              {
                type: "number",
                className: "cedros-admin__input",
                value: i.webhook_timeout,
                onChange: (w) => k("webhook_timeout", parseInt(w.target.value) || 30),
                placeholder: "30",
                disabled: !i.webhook_enabled,
                style: { maxWidth: 120 }
              }
            )
          ] })
        ] })
      ] })
    ] })
  ] });
}
function _f({ status: e, error: t }) {
  return e === "idle" ? null : /* @__PURE__ */ d(
    "span",
    {
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: "0.375rem",
        fontSize: "0.8125rem",
        color: e === "error" ? "var(--cedros-admin-error, #ef4444)" : "var(--cedros-admin-text-muted, #64748b)"
      },
      children: [
        e === "pending" && /* @__PURE__ */ o("span", { style: { opacity: 0.7 }, children: "Unsaved changes" }),
        e === "saving" && /* @__PURE__ */ d(Oe, { children: [
          Y.loading,
          /* @__PURE__ */ o("span", { children: "Saving..." })
        ] }),
        e === "saved" && /* @__PURE__ */ d(Oe, { children: [
          Y.check,
          /* @__PURE__ */ o("span", { style: { color: "var(--cedros-admin-success, #22c55e)" }, children: "Saved" })
        ] }),
        e === "error" && /* @__PURE__ */ d("span", { children: [
          "Save failed",
          t ? `: ${t}` : ""
        ] })
      ]
    }
  );
}
function qs({
  checked: e,
  onChange: t,
  disabled: n = !1
}) {
  return /* @__PURE__ */ o(
    "button",
    {
      type: "button",
      role: "switch",
      "aria-checked": e,
      disabled: n,
      onClick: t,
      style: {
        position: "relative",
        width: 44,
        height: 24,
        borderRadius: 12,
        border: "none",
        backgroundColor: e ? "var(--cedros-admin-primary, #171717)" : "var(--cedros-admin-border, #d4d4d4)",
        cursor: n ? "not-allowed" : "pointer",
        transition: "background-color 0.2s",
        flexShrink: 0,
        opacity: n ? 0.5 : 1
      },
      children: /* @__PURE__ */ o(
        "span",
        {
          style: {
            position: "absolute",
            top: 2,
            left: e ? 22 : 2,
            width: 20,
            height: 20,
            borderRadius: "50%",
            backgroundColor: "white",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            transition: "left 0.2s"
          }
        }
      )
    }
  );
}
const xf = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  MessagingSection: Sl
}, Symbol.toStringTag, { value: "Module" }));
function Ja(e) {
  return !e || typeof e != "string" ? [] : e.split(",").map((t) => t.trim()).filter(Boolean);
}
function Cl({ serverUrl: e, apiKey: t, pageSize: n = 20, authManager: r }) {
  const [a, i] = H([]), [s, c] = H(!0), [l, u] = H(!1), [p, m] = H(null), [h, g] = H(!1), [v, f] = H(""), [b, k] = H("all"), [w, _] = H(null), [x, N] = H({
    question: "",
    answer: "",
    keywordsCsv: "",
    active: !0,
    useInChat: !0,
    displayOnPage: !0
  }), I = J(async () => {
    c(!0);
    try {
      let D;
      const O = `/admin/faqs?limit=${n}`;
      if (r?.isAuthenticated())
        D = await r.fetchWithAuth(O);
      else {
        const V = { "Content-Type": "application/json" };
        t && (V["X-API-Key"] = t);
        const E = await fetch(`${e}${O}`, { headers: V });
        if (!E.ok) throw new Error(`Failed to fetch FAQs: ${E.status}`);
        D = await E.json();
      }
      i(D.faqs || []);
    } catch {
      i([
        {
          id: "faq_1",
          question: "What is your return policy?",
          answer: "We accept returns within 30 days of purchase. Items must be unused and in original packaging.",
          keywords: ["returns", "refund", "policy"],
          active: !0,
          useInChat: !0,
          displayOnPage: !0,
          createdAt: "2026-01-15T10:00:00Z"
        },
        {
          id: "faq_2",
          question: "How long does shipping take?",
          answer: "Standard shipping takes 5-7 business days. Express shipping is available for 2-3 day delivery.",
          keywords: ["shipping", "delivery", "time"],
          active: !0,
          useInChat: !0,
          displayOnPage: !0,
          createdAt: "2026-01-16T10:00:00Z"
        },
        {
          id: "faq_3",
          question: "Do you ship internationally?",
          answer: "Yes, we ship to most countries. International shipping typically takes 10-14 business days.",
          keywords: ["international", "shipping", "global"],
          active: !1,
          useInChat: !0,
          displayOnPage: !1,
          createdAt: "2026-01-17T10:00:00Z"
        }
      ]);
    } finally {
      c(!1);
    }
  }, [e, t, n, r]);
  ge(() => {
    I();
  }, [I]);
  const S = async (D) => {
    if (D.preventDefault(), !(!x.question.trim() || !x.answer.trim())) {
      g(!0);
      try {
        const O = x.keywordsCsv.split(",").map((E) => E.trim().toLowerCase()).filter(Boolean), V = {
          question: x.question.trim(),
          answer: x.answer.trim(),
          keywords: O,
          active: x.active,
          useInChat: x.useInChat,
          displayOnPage: x.displayOnPage
        };
        if (p) {
          const E = `/admin/faqs/${p.id}`;
          if (r?.isAuthenticated())
            await r.fetchWithAuth(E, { method: "PUT", body: JSON.stringify(V) });
          else {
            const q = { "Content-Type": "application/json" };
            t && (q["X-API-Key"] = t);
            const re = await fetch(`${e}${E}`, { method: "PUT", headers: q, body: JSON.stringify(V) });
            if (!re.ok) throw new Error(`Failed to update FAQ: ${re.status}`);
          }
        } else if (r?.isAuthenticated())
          await r.fetchWithAuth("/admin/faqs", { method: "POST", body: JSON.stringify(V) });
        else {
          const E = { "Content-Type": "application/json" };
          t && (E["X-API-Key"] = t);
          const q = await fetch(`${e}/admin/faqs`, { method: "POST", headers: E, body: JSON.stringify(V) });
          if (!q.ok) throw new Error(`Failed to create FAQ: ${q.status}`);
        }
        C(), I();
      } catch {
        i(
          p ? (O) => O.map(
            (V) => V.id === p.id ? {
              ...V,
              question: x.question.trim(),
              answer: x.answer.trim(),
              keywords: Ja(x.keywordsCsv).map((E) => E.toLowerCase()),
              active: x.active,
              useInChat: x.useInChat,
              displayOnPage: x.displayOnPage,
              updatedAt: (/* @__PURE__ */ new Date()).toISOString()
            } : V
          ) : (O) => [
            ...O,
            {
              id: `faq_${Date.now()}`,
              question: x.question.trim(),
              answer: x.answer.trim(),
              keywords: Ja(x.keywordsCsv).map((V) => V.toLowerCase()),
              active: x.active,
              useInChat: x.useInChat,
              displayOnPage: x.displayOnPage,
              createdAt: (/* @__PURE__ */ new Date()).toISOString()
            }
          ]
        ), C();
      } finally {
        g(!1);
      }
    }
  }, A = async (D) => {
    try {
      const O = `/admin/faqs/${D}`;
      if (r?.isAuthenticated())
        await r.fetchWithAuth(O, { method: "DELETE" });
      else {
        const V = { "Content-Type": "application/json" };
        t && (V["X-API-Key"] = t);
        const E = await fetch(`${e}${O}`, { method: "DELETE", headers: V });
        if (!E.ok) throw new Error(`Failed to delete FAQ: ${E.status}`);
      }
      I();
    } catch {
      i((O) => O.filter((V) => V.id !== D));
    }
    _(null);
  }, W = async (D) => {
    try {
      const O = `/admin/faqs/${D.id}`, V = { ...D, active: !D.active };
      if (r?.isAuthenticated())
        await r.fetchWithAuth(O, { method: "PUT", body: JSON.stringify(V) });
      else {
        const E = { "Content-Type": "application/json" };
        t && (E["X-API-Key"] = t);
        const q = await fetch(`${e}${O}`, { method: "PUT", headers: E, body: JSON.stringify(V) });
        if (!q.ok) throw new Error(`Failed to update FAQ: ${q.status}`);
      }
      I();
    } catch {
      i((O) => O.map((V) => V.id === D.id ? { ...V, active: !V.active } : V));
    }
  }, C = () => {
    N({ question: "", answer: "", keywordsCsv: "", active: !0, useInChat: !0, displayOnPage: !0 }), m(null), u(!1);
  }, T = (D) => {
    N({
      question: D.question,
      answer: D.answer,
      keywordsCsv: D.keywords.join(", "),
      active: D.active,
      useInChat: D.useInChat ?? !0,
      displayOnPage: D.displayOnPage ?? !0
    }), m(D), u(!0);
  }, P = a.length, L = a.filter((D) => D.active).length, F = a.filter((D) => D.active && D.useInChat).length, $ = a.filter((D) => D.active && D.displayOnPage).length, M = Te(() => a.filter((D) => {
    if (b === "active" && !D.active || b === "inactive" && D.active) return !1;
    if (v) {
      const O = v.toLowerCase();
      return D.question.toLowerCase().includes(O) || D.answer.toLowerCase().includes(O) || D.keywords.some((V) => V.includes(O));
    }
    return !0;
  }), [a, b, v]);
  return /* @__PURE__ */ d("div", { className: "cedros-admin__faqs", children: [
    /* @__PURE__ */ o(
      rr,
      {
        stats: [
          { label: "Total FAQs", value: P },
          { label: "Active", value: L, variant: "success" },
          { label: "In Chat", value: F },
          { label: "On Page", value: $ }
        ]
      }
    ),
    /* @__PURE__ */ d("div", { className: "cedros-admin__section", children: [
      /* @__PURE__ */ d("div", { className: "cedros-admin__section-header", children: [
        /* @__PURE__ */ d("div", { className: "cedros-admin__section-header-left", children: [
          /* @__PURE__ */ o("h3", { className: "cedros-admin__section-title", children: "Knowledge Base" }),
          /* @__PURE__ */ o("p", { className: "cedros-admin__section-subtitle", children: "Manage FAQs for the AI chat assistant and public FAQ page." })
        ] }),
        /* @__PURE__ */ o("div", { className: "cedros-admin__section-header-right", children: /* @__PURE__ */ d(
          "button",
          {
            className: "cedros-admin__btn cedros-admin__btn--primary",
            onClick: () => {
              C(), u(!0);
            },
            children: [
              Y.plus,
              " Add FAQ"
            ]
          }
        ) })
      ] }),
      /* @__PURE__ */ d("div", { className: "cedros-admin__filters", style: { display: "flex", gap: "1rem", marginBottom: "1rem" }, children: [
        /* @__PURE__ */ o(
          "input",
          {
            type: "text",
            placeholder: "Search FAQs...",
            value: v,
            onChange: (D) => f(D.target.value),
            className: "cedros-admin__input",
            style: { flex: 1, maxWidth: 300 }
          }
        ),
        /* @__PURE__ */ d(
          "select",
          {
            value: b,
            onChange: (D) => k(D.target.value),
            className: "cedros-admin__select",
            children: [
              /* @__PURE__ */ o("option", { value: "all", children: "All Status" }),
              /* @__PURE__ */ o("option", { value: "active", children: "Active Only" }),
              /* @__PURE__ */ o("option", { value: "inactive", children: "Inactive Only" })
            ]
          }
        )
      ] }),
      l && /* @__PURE__ */ o("div", { className: "cedros-admin__form-container", style: { marginBottom: "1.5rem" }, children: /* @__PURE__ */ d("form", { onSubmit: S, className: "cedros-admin__form", children: [
        /* @__PURE__ */ d("div", { className: "cedros-admin__form-header", children: [
          /* @__PURE__ */ o("h4", { children: p ? "Edit FAQ" : "Add New FAQ" }),
          /* @__PURE__ */ o("button", { type: "button", className: "cedros-admin__btn--icon", onClick: C, children: Y.close })
        ] }),
        /* @__PURE__ */ d("div", { className: "cedros-admin__form-group", children: [
          /* @__PURE__ */ o("label", { className: "cedros-admin__label", children: "Question *" }),
          /* @__PURE__ */ o(
            "input",
            {
              type: "text",
              value: x.question,
              onChange: (D) => N((O) => ({ ...O, question: D.target.value })),
              className: "cedros-admin__input",
              placeholder: "What is your return policy?",
              required: !0
            }
          )
        ] }),
        /* @__PURE__ */ d("div", { className: "cedros-admin__form-group", children: [
          /* @__PURE__ */ o("label", { className: "cedros-admin__label", children: "Answer *" }),
          /* @__PURE__ */ o(
            "textarea",
            {
              value: x.answer,
              onChange: (D) => N((O) => ({ ...O, answer: D.target.value })),
              className: "cedros-admin__textarea",
              placeholder: "We accept returns within 30 days...",
              rows: 4,
              required: !0
            }
          ),
          /* @__PURE__ */ o("span", { className: "cedros-admin__hint", children: "Supports markdown formatting." })
        ] }),
        /* @__PURE__ */ d("div", { className: "cedros-admin__form-group", children: [
          /* @__PURE__ */ o("label", { className: "cedros-admin__label", children: "Keywords" }),
          /* @__PURE__ */ o(
            "input",
            {
              type: "text",
              value: x.keywordsCsv,
              onChange: (D) => N((O) => ({ ...O, keywordsCsv: D.target.value })),
              className: "cedros-admin__input",
              placeholder: "returns, refund, policy"
            }
          ),
          /* @__PURE__ */ o("span", { className: "cedros-admin__hint", children: "Comma-separated keywords to help AI find this FAQ." })
        ] }),
        /* @__PURE__ */ d("div", { className: "cedros-admin__form-group", children: [
          /* @__PURE__ */ d("label", { className: "cedros-admin__checkbox-label", children: [
            /* @__PURE__ */ o(
              "input",
              {
                type: "checkbox",
                checked: x.active,
                onChange: (D) => N((O) => ({ ...O, active: D.target.checked }))
              }
            ),
            /* @__PURE__ */ o("span", { children: "Active" })
          ] }),
          /* @__PURE__ */ o("span", { className: "cedros-admin__hint", children: "Inactive FAQs won't appear anywhere." })
        ] }),
        /* @__PURE__ */ d("div", { className: "cedros-admin__form-group", children: [
          /* @__PURE__ */ o("label", { className: "cedros-admin__label", children: "Visibility" }),
          /* @__PURE__ */ d("div", { className: "cedros-admin__checkbox-group", children: [
            /* @__PURE__ */ d("label", { className: "cedros-admin__checkbox-label", children: [
              /* @__PURE__ */ o(
                "input",
                {
                  type: "checkbox",
                  checked: x.useInChat,
                  onChange: (D) => N((O) => ({ ...O, useInChat: D.target.checked }))
                }
              ),
              /* @__PURE__ */ o("span", { children: "Use in AI Chat" })
            ] }),
            /* @__PURE__ */ d("label", { className: "cedros-admin__checkbox-label", children: [
              /* @__PURE__ */ o(
                "input",
                {
                  type: "checkbox",
                  checked: x.displayOnPage,
                  onChange: (D) => N((O) => ({ ...O, displayOnPage: D.target.checked }))
                }
              ),
              /* @__PURE__ */ o("span", { children: "Display on FAQ Page" })
            ] })
          ] }),
          /* @__PURE__ */ o("span", { className: "cedros-admin__hint", children: "Choose where this FAQ should appear." })
        ] }),
        /* @__PURE__ */ d("div", { className: "cedros-admin__form-actions", children: [
          /* @__PURE__ */ o("button", { type: "button", className: "cedros-admin__btn", onClick: C, children: "Cancel" }),
          /* @__PURE__ */ o(
            "button",
            {
              type: "submit",
              className: "cedros-admin__btn cedros-admin__btn--primary",
              disabled: h || !x.question.trim() || !x.answer.trim(),
              children: h ? Y.loading : p ? "Update FAQ" : "Create FAQ"
            }
          )
        ] })
      ] }) }),
      s ? /* @__PURE__ */ d("div", { className: "cedros-admin__loading", children: [
        Y.loading,
        /* @__PURE__ */ o("span", { children: "Loading FAQs..." })
      ] }) : M.length === 0 ? /* @__PURE__ */ o("div", { className: "cedros-admin__empty", children: /* @__PURE__ */ o("p", { children: v || b !== "all" ? "No FAQs match your filters." : "No FAQs yet. Add one to get started." }) }) : /* @__PURE__ */ o("div", { className: "cedros-admin__faq-list", children: M.map((D) => /* @__PURE__ */ d(
        "div",
        {
          className: `cedros-admin__faq-item ${D.active ? "" : "cedros-admin__faq-item--inactive"}`,
          children: [
            /* @__PURE__ */ d("div", { className: "cedros-admin__faq-content", children: [
              /* @__PURE__ */ d("div", { className: "cedros-admin__faq-question", children: [
                /* @__PURE__ */ o("span", { className: `cedros-admin__status-dot ${D.active ? "cedros-admin__status-dot--active" : "cedros-admin__status-dot--inactive"}` }),
                D.question
              ] }),
              /* @__PURE__ */ o("div", { className: "cedros-admin__faq-answer", children: D.answer }),
              /* @__PURE__ */ d("div", { className: "cedros-admin__faq-meta", children: [
                D.keywords.length > 0 && /* @__PURE__ */ o("div", { className: "cedros-admin__faq-keywords", children: D.keywords.map((O) => /* @__PURE__ */ o("span", { className: "cedros-admin__tag", children: O }, O)) }),
                /* @__PURE__ */ d("div", { className: "cedros-admin__faq-visibility", children: [
                  D.useInChat && /* @__PURE__ */ d("span", { className: "cedros-admin__badge cedros-admin__badge--chat", title: "Used in AI Chat", children: [
                    Y.chat,
                    " Chat"
                  ] }),
                  D.displayOnPage && /* @__PURE__ */ d("span", { className: "cedros-admin__badge cedros-admin__badge--page", title: "Displayed on FAQ Page", children: [
                    Y.globe,
                    " Page"
                  ] })
                ] })
              ] })
            ] }),
            /* @__PURE__ */ d("div", { className: "cedros-admin__faq-actions", children: [
              /* @__PURE__ */ o(
                "button",
                {
                  className: "cedros-admin__btn--icon",
                  onClick: () => W(D),
                  title: D.active ? "Deactivate" : "Activate",
                  children: D.active ? Y.eyeOff : Y.eye
                }
              ),
              /* @__PURE__ */ o(
                "button",
                {
                  className: "cedros-admin__btn--icon",
                  onClick: () => T(D),
                  title: "Edit",
                  children: Y.edit
                }
              ),
              /* @__PURE__ */ o(
                "button",
                {
                  className: "cedros-admin__btn--icon cedros-admin__btn--danger",
                  onClick: () => _(D.id),
                  title: "Delete",
                  children: Y.trash
                }
              )
            ] }),
            w === D.id && /* @__PURE__ */ o("div", { className: "cedros-admin__confirm-overlay", children: /* @__PURE__ */ d("div", { className: "cedros-admin__confirm-dialog", children: [
              /* @__PURE__ */ o("p", { children: "Delete this FAQ?" }),
              /* @__PURE__ */ d("div", { className: "cedros-admin__confirm-actions", children: [
                /* @__PURE__ */ o("button", { className: "cedros-admin__btn", onClick: () => _(null), children: "Cancel" }),
                /* @__PURE__ */ o(
                  "button",
                  {
                    className: "cedros-admin__btn cedros-admin__btn--danger",
                    onClick: () => A(D.id),
                    children: "Delete"
                  }
                )
              ] })
            ] }) })
          ]
        },
        D.id
      )) })
    ] })
  ] });
}
const kf = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  FAQSection: Cl
}, Symbol.toStringTag, { value: "Module" }));
class Sf {
  serverUrl;
  walletSigner = null;
  jwtToken = null;
  isAdmin = !1;
  constructor(t) {
    this.serverUrl = t;
  }
  getAuthMethod() {
    return this.walletSigner?.publicKey && this.walletSigner.signMessage ? "wallet" : this.jwtToken && this.isAdmin ? "cedros-login" : "none";
  }
  isAuthenticated() {
    return this.getAuthMethod() !== "none";
  }
  setWalletSigner(t) {
    this.walletSigner = t, Ne().debug("[AdminAuthManager] Wallet signer updated:", !!t?.publicKey);
  }
  setCedrosLoginAuth(t, n) {
    this.jwtToken = t, this.isAdmin = n, Ne().debug("[AdminAuthManager] Cedros-login auth updated:", { hasToken: !!t, isAdmin: n });
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
    const n = await this.fetchNonce(t), r = new TextEncoder().encode(n.nonce_id), a = await this.walletSigner.signMessage(r), i = $s.encode(this.walletSigner.publicKey.toBytes()), s = $s.encode(a);
    return {
      "X-Signer": i,
      "X-Message": n.nonce_id,
      "X-Signature": s
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
    Ne().debug("[AdminAuthManager] Fetching nonce for purpose:", t);
    const r = await zs(n, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purpose: t })
    });
    if (!r.ok) {
      const a = await r.text();
      throw new Error(`Failed to fetch nonce: ${r.status} ${a}`);
    }
    return await r.json();
  }
  async fetchWithAuth(t, n = {}) {
    if (this.getAuthMethod() === "none")
      throw new Error("No admin authentication configured");
    const a = this.getPurposeFromPath(t, n.method || "GET"), i = await this.createAuthHeaders(a), s = {
      "Content-Type": "application/json",
      ...n.headers || {},
      ...i
    }, c = await zs(`${this.serverUrl}${t}`, {
      ...n,
      headers: s
    });
    if (!c.ok) {
      const l = await c.text();
      throw new Error(`Admin API error ${c.status}: ${l}`);
    }
    return await c.json();
  }
  getPurposeFromPath(t, n) {
    const a = {
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
    if (a?.[n])
      return a[n];
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
function Cf({
  serverUrl: e,
  cedrosLoginToken: t,
  isAdmin: n = !1
}) {
  const r = Eo(), a = Te(
    () => new Sf(e),
    [e]
  );
  ge(() => {
    r.publicKey && r.signMessage ? a.setWalletSigner({
      publicKey: r.publicKey,
      signMessage: r.signMessage
    }) : a.setWalletSigner(null);
  }, [a, r.publicKey, r.signMessage]), ge(() => {
    a.setCedrosLoginAuth(t ?? null, n);
  }, [a, t, n]);
  const i = a.getAuthMethod(), s = a.isAuthenticated(), c = !!(r.publicKey && r.signMessage), l = !!(t && n), u = Te(() => {
    if (!r.publicKey) return null;
    const m = r.publicKey.toBase58();
    return `${m.slice(0, 4)}...${m.slice(-4)}`;
  }, [r.publicKey]), p = J(
    (m, h) => a.fetchWithAuth(m, h),
    [a]
  );
  return {
    authMethod: i,
    isAuthenticated: s,
    walletConnected: c,
    walletAddress: u,
    cedrosLoginAvailable: l,
    authManager: a,
    fetchWithAuth: p
  };
}
const Nl = [
  {
    label: "Menu",
    sections: [
      { id: "transactions", label: "Transactions", icon: Y.transactions },
      { id: "products", label: "Products", icon: Y.products },
      { id: "subscriptions", label: "Subscriptions", icon: Y.calendarRepeat },
      { id: "coupons", label: "Coupons", icon: Y.coupons },
      { id: "refunds", label: "Refunds", icon: Y.refunds }
    ]
  },
  {
    label: "Configuration",
    collapsible: !0,
    sections: [
      { id: "storefront", label: "Storefront", icon: Y.storefront },
      { id: "ai-settings", label: "Store AI", icon: Y.brain },
      { id: "faqs", label: "Knowledge Base", icon: Y.faq },
      { id: "payment-settings", label: "Payment Options", icon: Y.creditCard },
      { id: "messaging", label: "Store Messages", icon: Y.mail },
      { id: "settings", label: "Store Server", icon: Y.server }
    ]
  }
], Nf = Nl.flatMap((e) => e.sections);
function Af() {
  const [e, t] = H(() => typeof window > "u" ? "light" : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  return ge(() => {
    const n = window.matchMedia("(prefers-color-scheme: dark)"), r = (a) => t(a.matches ? "dark" : "light");
    return n.addEventListener("change", r), () => n.removeEventListener("change", r);
  }, []), e;
}
function Tf(e, t, n) {
  return e !== "system" ? e : t || n;
}
function PN({
  serverUrl: e,
  apiKey: t,
  title: n = "Cedros Pay",
  sections: r = ["transactions", "products", "subscriptions", "coupons", "refunds", "storefront", "ai-settings", "faqs", "payment-settings", "messaging", "settings"],
  defaultSection: a = "transactions",
  refreshInterval: i = 3e4,
  pageSize: s = 20,
  onSectionChange: c,
  className: l = "",
  cedrosLoginToken: u,
  isAdmin: p = !1,
  theme: m = "system"
}) {
  const [h, g] = H(a), [v, f] = H(!0), [b, k] = H(/* @__PURE__ */ new Set()), w = J((T) => {
    k((P) => {
      const L = new Set(P);
      return L.has(T) ? L.delete(T) : L.add(T), L;
    });
  }, []), _ = Dp(), x = Af(), I = Tf(m, _?.mode ?? null, x) === "dark" ? "cedros-admin--dark" : "", { authManager: S } = Cf({
    serverUrl: e,
    cedrosLoginToken: u,
    isAdmin: p
  }), A = J(
    (T) => {
      g(T), c?.(T);
    },
    [c]
  ), C = Nf.filter((T) => r.includes(T.id)).find((T) => T.id === h);
  return ge(() => {
    const T = setTimeout(() => f(!1), 500);
    return () => clearTimeout(T);
  }, []), v ? /* @__PURE__ */ d("div", { className: `cedros-admin cedros-admin--loading ${I} ${l}`, children: [
    Y.loading,
    /* @__PURE__ */ o("span", { className: "cedros-admin__loading-text", children: "Loading dashboard..." })
  ] }) : /* @__PURE__ */ d("div", { className: `cedros-admin ${I} ${l}`, children: [
    /* @__PURE__ */ d("aside", { className: "cedros-admin__sidebar", children: [
      /* @__PURE__ */ o("div", { className: "cedros-admin__sidebar-header", children: /* @__PURE__ */ d("div", { className: "cedros-admin__logo", children: [
        Y.wallet,
        /* @__PURE__ */ o("span", { className: "cedros-admin__logo-text", children: n })
      ] }) }),
      /* @__PURE__ */ o("nav", { className: "cedros-admin__nav", children: Nl.map((T) => {
        const P = T.sections.filter((F) => r.includes(F.id));
        if (P.length === 0) return null;
        const L = T.collapsible && b.has(T.label);
        return /* @__PURE__ */ d("div", { className: "cedros-admin__nav-group", children: [
          T.collapsible ? /* @__PURE__ */ d(
            "button",
            {
              type: "button",
              className: "cedros-admin__nav-label cedros-admin__nav-label--collapsible",
              onClick: () => w(T.label),
              "aria-expanded": !L,
              children: [
                T.label,
                /* @__PURE__ */ o("span", { className: `cedros-admin__nav-label-icon ${L ? "" : "cedros-admin__nav-label-icon--expanded"}`, children: Y.chevronRight })
              ]
            }
          ) : /* @__PURE__ */ o("span", { className: "cedros-admin__nav-label", children: T.label }),
          !L && P.map((F) => /* @__PURE__ */ d(
            "button",
            {
              type: "button",
              className: `cedros-admin__nav-item ${h === F.id ? "cedros-admin__nav-item--active" : ""}`,
              onClick: () => A(F.id),
              "aria-current": h === F.id ? "page" : void 0,
              children: [
                /* @__PURE__ */ o("span", { className: "cedros-admin__nav-icon", children: F.icon }),
                /* @__PURE__ */ o("span", { className: "cedros-admin__nav-text", children: F.label })
              ]
            },
            F.id
          ))
        ] }, T.label);
      }) })
    ] }),
    /* @__PURE__ */ d("main", { className: "cedros-admin__main", children: [
      /* @__PURE__ */ o("header", { className: "cedros-admin__header", children: /* @__PURE__ */ d("div", { className: "cedros-admin__breadcrumb", children: [
        /* @__PURE__ */ o("span", { className: "cedros-admin__breadcrumb-root", children: n }),
        /* @__PURE__ */ o("span", { className: "cedros-admin__breadcrumb-sep", children: Y.chevronRight }),
        /* @__PURE__ */ o("span", { className: "cedros-admin__breadcrumb-current", children: C?.label })
      ] }) }),
      /* @__PURE__ */ d("div", { className: "cedros-admin__content", children: [
        h === "products" && /* @__PURE__ */ o(
          Yp,
          {
            serverUrl: e,
            apiKey: t,
            pageSize: s,
            authManager: S
          }
        ),
        h === "subscriptions" && /* @__PURE__ */ o(
          wl,
          {
            serverUrl: e,
            apiKey: t,
            authManager: S
          }
        ),
        h === "transactions" && /* @__PURE__ */ o(
          Kp,
          {
            serverUrl: e,
            apiKey: t,
            pageSize: s,
            authManager: S
          }
        ),
        h === "coupons" && /* @__PURE__ */ o(
          Jp,
          {
            serverUrl: e,
            apiKey: t,
            pageSize: s,
            authManager: S
          }
        ),
        h === "refunds" && /* @__PURE__ */ o(
          Xp,
          {
            serverUrl: e,
            apiKey: t,
            pageSize: s,
            authManager: S
          }
        ),
        h === "storefront" && /* @__PURE__ */ o(
          _l,
          {
            serverUrl: e,
            apiKey: t,
            authManager: S
          }
        ),
        h === "ai-settings" && /* @__PURE__ */ o(
          xl,
          {
            serverUrl: e,
            apiKey: t,
            authManager: S
          }
        ),
        h === "faqs" && /* @__PURE__ */ o(
          Cl,
          {
            serverUrl: e,
            apiKey: t,
            pageSize: s,
            authManager: S
          }
        ),
        h === "payment-settings" && /* @__PURE__ */ o(
          kl,
          {
            serverUrl: e,
            apiKey: t,
            authManager: S
          }
        ),
        h === "messaging" && /* @__PURE__ */ o(
          Sl,
          {
            serverUrl: e,
            apiKey: t,
            authManager: S
          }
        ),
        h === "settings" && /* @__PURE__ */ o(
          bl,
          {
            serverUrl: e,
            apiKey: t,
            authManager: S
          }
        )
      ] })
    ] })
  ] });
}
const Ot = (e) => Cp(async () => {
  const r = (await e()).default;
  return { default: ({ context: i }) => {
    const s = {
      serverUrl: i.serverUrl
      // authManager will be created by the shell from context
    };
    return /* @__PURE__ */ o(r, { ...s });
  } };
}), EN = {
  id: "cedros-pay",
  name: "Cedros Pay",
  version: "1.0.0",
  sections: [
    // Store group (main cedros-pay sections)
    { id: "transactions", label: "Transactions", icon: Y.transactions, group: "Store", order: 0 },
    { id: "products", label: "Products", icon: Y.products, group: "Store", order: 1 },
    { id: "subscriptions", label: "Subscriptions", icon: Y.subscriptions, group: "Store", order: 2 },
    { id: "coupons", label: "Coupons", icon: Y.coupons, group: "Store", order: 3 },
    { id: "refunds", label: "Refunds", icon: Y.refunds, group: "Store", order: 4 },
    // Configuration group
    { id: "storefront", label: "Storefront", icon: Y.storefront, group: "Configuration", order: 10 },
    { id: "ai-settings", label: "Store AI", icon: Y.ai, group: "Configuration", order: 11 },
    { id: "faqs", label: "Knowledge Base", icon: Y.faq, group: "Configuration", order: 12 },
    { id: "payment-settings", label: "Payment Options", icon: Y.wallet, group: "Configuration", order: 13 },
    { id: "messaging", label: "Store Messages", icon: Y.notifications, group: "Configuration", order: 14 },
    { id: "settings", label: "Store Server", icon: Y.settings, group: "Configuration", order: 15 }
  ],
  groups: [
    { id: "Store", label: "Store", order: 1 },
    { id: "Configuration", label: "Configuration", order: 2, collapsible: !0 }
  ],
  components: {
    products: Ot(() => import("./sections-a0Dz-MMz.mjs").then((e) => ({ default: e.ProductsSection }))),
    subscriptions: Ot(() => Promise.resolve().then(() => uf).then((e) => ({ default: e.SubscriptionsSection }))),
    transactions: Ot(() => import("./sections-a0Dz-MMz.mjs").then((e) => ({ default: e.TransactionsSection }))),
    coupons: Ot(() => import("./sections-a0Dz-MMz.mjs").then((e) => ({ default: e.CouponsSection }))),
    refunds: Ot(() => import("./sections-a0Dz-MMz.mjs").then((e) => ({ default: e.RefundsSection }))),
    storefront: Ot(() => Promise.resolve().then(() => hf).then((e) => ({ default: e.StorefrontSection }))),
    "ai-settings": Ot(() => Promise.resolve().then(() => bf).then((e) => ({ default: e.AISettingsSection }))),
    faqs: Ot(() => Promise.resolve().then(() => kf).then((e) => ({ default: e.FAQSection }))),
    "payment-settings": Ot(() => Promise.resolve().then(() => wf).then((e) => ({ default: e.PaymentSettingsSection }))),
    messaging: Ot(() => Promise.resolve().then(() => xf).then((e) => ({ default: e.MessagingSection }))),
    settings: Ot(() => Promise.resolve().then(() => cf).then((e) => ({ default: e.SettingsSection })))
  },
  createPluginContext(e) {
    const t = e.cedrosPay, n = e.cedrosLogin;
    return {
      serverUrl: t?.serverUrl || n?.serverUrl || "",
      userId: n?.user?.id,
      getAccessToken: () => n?.getAccessToken?.() || t?.jwtToken || null,
      hasPermission: (a) => this.checkPermission(a, e),
      orgId: e.org?.orgId,
      pluginData: {
        walletAddress: t?.walletAddress
      }
    };
  },
  checkPermission(e, t) {
    return t.org?.permissions ? t.org.permissions.includes(e) : !!(t.cedrosLogin?.user || t.cedrosPay?.jwtToken || t.cedrosPay?.walletAddress);
  },
  cssNamespace: "cedros-admin"
};
function Pf() {
  const { subscriptionManager: e } = Dn(), [t, n] = H({
    status: "idle",
    error: null,
    sessionId: null,
    subscriptionStatus: null,
    expiresAt: null
  }), r = J(
    async (c) => {
      n((u) => ({
        ...u,
        status: "loading",
        error: null
      }));
      const l = await e.processSubscription(c);
      return n((u) => ({
        ...u,
        status: l.success ? "success" : "error",
        error: l.success ? null : l.error || "Subscription failed",
        sessionId: l.success && l.transactionId || null
      })), l;
    },
    [e]
  ), a = J(
    async (c) => {
      n((l) => ({
        ...l,
        status: "checking",
        error: null
      }));
      try {
        const l = await e.checkSubscriptionStatus(c);
        return n((u) => ({
          ...u,
          status: l.active ? "success" : "idle",
          subscriptionStatus: l.status,
          expiresAt: l.expiresAt || l.currentPeriodEnd || null
        })), l;
      } catch (l) {
        const u = l instanceof Error ? l.message : "Failed to check subscription status";
        throw n((p) => ({
          ...p,
          status: "error",
          error: u
        })), l;
      }
    },
    [e]
  ), i = J(
    async (c, l, u) => {
      n((p) => ({
        ...p,
        status: "loading",
        error: null
      }));
      try {
        const p = await e.requestSubscriptionQuote(
          c,
          l,
          u
        );
        return n((m) => ({
          ...m,
          status: "idle"
        })), p;
      } catch (p) {
        const m = p instanceof Error ? p.message : "Failed to get subscription quote";
        throw n((h) => ({
          ...h,
          status: "error",
          error: m
        })), p;
      }
    },
    [e]
  ), s = J(() => {
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
    processSubscription: r,
    checkStatus: a,
    requestQuote: i,
    reset: s
  };
}
function IN({
  resource: e,
  interval: t,
  intervalDays: n,
  trialDays: r,
  successUrl: a,
  cancelUrl: i,
  metadata: s,
  customerEmail: c,
  couponCode: l,
  label: u,
  disabled: p = !1,
  onAttempt: m,
  onSuccess: h,
  onError: g,
  className: v = ""
}) {
  const { status: f, error: b, sessionId: k, processSubscription: w } = Pf(), _ = nr(), { t: x, translations: N } = Io(), I = u || x("ui.subscribe"), S = _.unstyled ? v : `${_.className} cedros-theme__stripe-button ${v}`.trim(), A = b && typeof b != "string" ? b?.code ?? null : null, C = b ? typeof b == "string" ? b : ((M) => {
    if (!M || !N) return "";
    const D = N.errors[M];
    return D ? D.action ? `${D.message} ${D.action}` : D.message : "";
  })(A) : null, T = J(async () => {
    Ne().debug("[SubscribeButton] executeSubscription:", {
      resource: e,
      interval: t,
      intervalDays: n,
      trialDays: r,
      couponCode: l
    }), Ro("stripe", e), m && m("stripe"), Ar("stripe", e);
    const M = await w({
      resource: e,
      interval: t,
      intervalDays: n,
      trialDays: r,
      customerEmail: c,
      metadata: s,
      couponCode: l,
      successUrl: a,
      cancelUrl: i
    });
    M.success && M.transactionId ? (Oo("stripe", M.transactionId, e), h && h(M.transactionId)) : !M.success && M.error && (Xn("stripe", M.error, e), g && g(M.error));
  }, [
    e,
    t,
    n,
    r,
    c,
    s,
    l,
    a,
    i,
    w,
    m,
    h,
    g
  ]), P = Te(() => `subscribe-${e}-${t}`, [e, t]), L = Te(
    () => Mo(P, T),
    [P, T]
  ), F = f === "loading", $ = p || F;
  return /* @__PURE__ */ d("div", { className: S, style: _.unstyled ? {} : _.style, children: [
    /* @__PURE__ */ o(
      "button",
      {
        onClick: L,
        disabled: $,
        className: _.unstyled ? v : "cedros-theme__button cedros-theme__stripe",
        type: "button",
        children: F ? x("ui.processing") : I
      }
    ),
    C && /* @__PURE__ */ o("div", { className: _.unstyled ? "" : "cedros-theme__error", children: C }),
    k && /* @__PURE__ */ o("div", { className: _.unstyled ? "" : "cedros-theme__success", children: x("ui.redirecting_to_checkout") })
  ] });
}
function Ef() {
  const { subscriptionManager: e, x402Manager: t, walletManager: n } = Dn(), { publicKey: r, signTransaction: a } = Eo(), [i, s] = H({
    status: "idle",
    error: null,
    sessionId: null,
    subscriptionStatus: null,
    expiresAt: null
  }), [c, l] = H(null), u = J(() => {
    if (!r) {
      const v = "Wallet not connected";
      return s((f) => ({ ...f, status: "error", error: v })), { valid: !1, error: v };
    }
    if (!a) {
      const v = "Wallet does not support signing";
      return s((f) => ({ ...f, status: "error", error: v })), { valid: !1, error: v };
    }
    return { valid: !0 };
  }, [r, a]), p = J(
    async (v) => {
      if (!r)
        return s((f) => ({
          ...f,
          status: "error",
          error: "Wallet not connected"
        })), null;
      s((f) => ({
        ...f,
        status: "checking",
        error: null
      }));
      try {
        const f = await e.checkSubscriptionStatus({
          resource: v,
          userId: r.toString()
        });
        return s((b) => ({
          ...b,
          status: f.active ? "success" : "idle",
          subscriptionStatus: f.status,
          expiresAt: f.expiresAt || f.currentPeriodEnd || null
        })), f;
      } catch (f) {
        const b = cn(f, "Failed to check subscription status");
        return s((k) => ({
          ...k,
          status: "error",
          error: b
        })), null;
      }
    },
    [r, e]
  ), m = J(
    async (v, f, b) => {
      s((k) => ({
        ...k,
        status: "loading",
        error: null
      }));
      try {
        const k = await e.requestSubscriptionQuote(
          v,
          f,
          b
        );
        return l(k), s((w) => ({
          ...w,
          status: "idle"
        })), k;
      } catch (k) {
        const w = cn(k, "Failed to get subscription quote");
        return s((_) => ({
          ..._,
          status: "error",
          error: w
        })), null;
      }
    },
    [e]
  ), h = J(
    async (v, f, b) => {
      const k = u();
      if (!k.valid)
        return { success: !1, error: k.error };
      s((w) => ({
        ...w,
        status: "loading",
        error: null
      }));
      try {
        const w = await e.requestSubscriptionQuote(
          v,
          f,
          b
        );
        l(w);
        const _ = w.requirement;
        if (!t.validateRequirement(_))
          throw new Error("Invalid subscription quote received from server");
        const x = !!_.extra?.feePayer;
        let N;
        if (x) {
          const { transaction: I, blockhash: S } = await t.buildGaslessTransaction({
            resourceId: v,
            userWallet: r.toString(),
            feePayer: _.extra.feePayer,
            couponCode: b?.couponCode
          }), A = n.deserializeTransaction(I), W = await n.partiallySignTransaction({
            transaction: A,
            signTransaction: a,
            blockhash: S
          });
          N = await t.submitGaslessTransaction({
            resource: v,
            partialTx: W,
            couponCode: b?.couponCode,
            resourceType: "regular",
            requirement: _
          });
        } else {
          const I = await n.buildTransaction({
            requirement: _,
            payerPublicKey: r
          }), S = await n.signTransaction({
            transaction: I,
            signTransaction: a
          }), A = n.buildPaymentPayload({
            requirement: _,
            signedTx: S,
            payerPublicKey: r
          });
          N = await t.submitPayment({
            resource: v,
            payload: A,
            couponCode: b?.couponCode,
            resourceType: "regular"
          });
        }
        if (N.success) {
          const I = await e.checkSubscriptionStatus({
            resource: v,
            userId: r.toString()
          });
          s({
            status: "success",
            error: null,
            sessionId: N.transactionId || null,
            subscriptionStatus: I.status,
            expiresAt: I.expiresAt || I.currentPeriodEnd || null
          });
        } else
          s((I) => ({
            ...I,
            status: "error",
            error: N.error || "Subscription payment failed"
          }));
        return N;
      } catch (w) {
        const _ = cn(w, "Subscription payment failed");
        return s((x) => ({
          ...x,
          status: "error",
          error: _
        })), { success: !1, error: _ };
      }
    },
    [
      u,
      e,
      t,
      n,
      r,
      a
    ]
  ), g = J(() => {
    s({
      status: "idle",
      error: null,
      sessionId: null,
      subscriptionStatus: null,
      expiresAt: null
    }), l(null);
  }, []);
  return {
    ...i,
    quote: c,
    checkStatus: p,
    requestQuote: m,
    processPayment: h,
    reset: g
  };
}
function RN({
  resource: e,
  interval: t,
  intervalDays: n,
  couponCode: r,
  label: a,
  disabled: i = !1,
  onAttempt: s,
  onSuccess: c,
  onError: l,
  className: u = "",
  testPageUrl: p,
  hideMessages: m = !1,
  autoCheckStatus: h = !0
}) {
  const {
    connected: g,
    connecting: v,
    connect: f,
    disconnect: b,
    select: k,
    wallets: w,
    wallet: _,
    publicKey: x
  } = Eo(), {
    status: N,
    error: I,
    subscriptionStatus: S,
    expiresAt: A,
    checkStatus: W,
    processPayment: C
  } = Ef(), T = nr(), { solanaError: P } = Dn(), { t: L, translations: F } = Io(), $ = a || L("ui.subscribe_with_crypto"), M = gt(C), D = gt(W);
  ge(() => {
    M.current = C, D.current = W;
  }, [C, W]);
  const O = I && typeof I != "string" ? I?.code ?? null : null, V = P && typeof P != "string" ? P?.code ?? null : null, E = (me) => {
    if (!me || !F) return "";
    const Pe = F.errors[me];
    return Pe ? Pe.action ? `${Pe.message} ${Pe.action}` : Pe.message : "";
  }, q = I ? typeof I == "string" ? I : E(O) : null, re = P ? typeof P == "string" ? P : E(V) : null, j = Te(
    () => w.map((me) => `${me.adapter.name}-${me.readyState}`).join(","),
    [w]
  ), X = Te(
    () => w.filter(
      ({ readyState: me }) => me === Fs.Installed || me === Fs.Loadable
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [j]
  );
  ge(() => {
    h && g && x && (Ne().debug("[CryptoSubscribeButton] Auto-checking subscription status"), D.current(e));
  }, [h, g, x, e]), ge(() => {
    N === "success" && S === "active" && (Oo("crypto", "subscription-active", e), c && c("subscription-active"));
  }, [N, S, e, c]), ge(() => {
    N === "error" && I && (Xn("crypto", I, e), l && l(I));
  }, [N, I, e, l]);
  const te = typeof window < "u" && window.top !== window.self, [ve, B] = H(!1), [ee, fe] = H(!1), [G, oe] = H(!1), de = P;
  ge(() => {
    let me = !1;
    return me || (async () => {
      if (ee && _ && !g && !v) {
        Ne().debug(
          "[CryptoSubscribeButton] Wallet detected, attempting auto-connect:",
          _.adapter.name
        ), fe(!1), Ls(_.adapter.name);
        try {
          await f(), me || Ne().debug("[CryptoSubscribeButton] Auto-connect successful");
        } catch (z) {
          if (!me) {
            Ne().error("[CryptoSubscribeButton] Auto-connect failed:", z);
            const ne = z instanceof Error ? z.message : "Failed to connect wallet";
            wa(ne, _.adapter.name), oe(!1);
          }
        }
      }
    })(), () => {
      me = !0;
    };
  }, [_, ee, g, v, f]), ge(() => {
    g && G && x && _ && (Op(_.adapter.name, x.toString()), Ne().debug("[CryptoSubscribeButton] Processing pending subscription payment"), oe(!1), B(!1), Ar("crypto", e), M.current(e, t, { couponCode: r, intervalDays: n }));
  }, [g, G, x, _, e, t, r, n]);
  const he = J(async () => {
    if (Ne().debug("[CryptoSubscribeButton] executeSubscriptionFlow called", {
      connected: g,
      wallet: _?.adapter.name,
      resource: e,
      interval: t
    }), Ro("crypto", e), s && s("crypto"), de) {
      Ne().error("[CryptoSubscribeButton] Solana dependencies missing:", de), Xn("crypto", de, e), l && l(de);
      return;
    }
    if (te) {
      const me = p || window.location.href;
      try {
        if (new URL(me, window.location.origin).origin !== window.location.origin)
          throw Ne().error("[CryptoSubscribeButton] Blocked attempt to open external URL:", me), new Error("Cannot open external URLs from embedded context");
        window.open(me, "_blank", "noopener,noreferrer");
      } catch (Pe) {
        throw Ne().error("[CryptoSubscribeButton] URL validation failed:", Pe), Pe;
      }
      return;
    }
    if (g)
      Ar("crypto", e), await C(e, t, { couponCode: r, intervalDays: n });
    else {
      oe(!0);
      try {
        if (_)
          Ne().debug(
            "[CryptoSubscribeButton] Wallet already selected, connecting:",
            _.adapter.name
          ), Ls(_.adapter.name), await f();
        else {
          if (Ne().debug("[CryptoSubscribeButton] No wallet selected, showing selector"), X.length === 0) {
            oe(!1);
            const me = "No wallets available";
            throw wa(me), new Error(me);
          }
          B(!0);
        }
      } catch (me) {
        oe(!1);
        const Pe = me instanceof Error ? me.message : "Failed to connect wallet";
        Ne().error("[CryptoSubscribeButton] Connection error:", Pe), wa(Pe, _?.adapter.name);
      }
    }
  }, [
    g,
    _,
    e,
    t,
    r,
    n,
    te,
    p,
    X,
    f,
    C,
    de,
    s,
    l
  ]), Fe = Te(() => `crypto-subscribe-${e}-${t}`, [e, t]), Xe = Te(
    () => Mo(Fe, he, {
      cooldownMs: 200,
      deduplicationWindowMs: 0
    }),
    [Fe, he]
  ), et = N === "loading" || N === "checking", We = S === "active" || S === "trialing", tt = i || et || v || !!de || We;
  let Ie = $;
  if (et)
    Ie = L("ui.processing");
  else if (We && A) {
    const me = new Date(A).toLocaleDateString();
    Ie = `${L("ui.subscribed_until")} ${me}`;
  } else We && (Ie = L("ui.subscribed"));
  const lt = J(async () => {
    try {
      fe(!1), g && await b(), k(null), B(!0);
    } catch (me) {
      Ne().error("Failed to change wallet:", me);
    }
  }, [g, b, k]), Re = J(
    (me) => {
      Ne().debug("[CryptoSubscribeButton] Wallet clicked:", me), B(!1), k(me), fe(!0);
    },
    [k]
  ), He = J(async () => {
    try {
      if (await b(), oe(!1), typeof window < "u" && window.localStorage)
        try {
          window.localStorage.removeItem("walletName");
        } catch (me) {
          me instanceof Error && me.name === "QuotaExceededError" ? Ne().warn("localStorage quota exceeded when removing wallet preference") : Ne().error("Failed to clear wallet preference from localStorage:", me);
        }
    } catch (me) {
      Ne().error("Failed to disconnect wallet:", me);
    }
  }, [b]);
  return /* @__PURE__ */ d(
    "div",
    {
      className: T.unstyled ? u : `${T.className} cedros-theme__crypto-button ${u || ""}`,
      style: T.unstyled ? {} : T.style,
      children: [
        /* @__PURE__ */ o(
          "button",
          {
            onClick: Xe,
            disabled: tt,
            className: T.unstyled ? u : "cedros-theme__button cedros-theme__crypto",
            type: "button",
            children: Ie
          }
        ),
        ve && !m && /* @__PURE__ */ o(
          "div",
          {
            className: "cedros-modal-overlay",
            style: {
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: T.tokens.modalOverlay,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              padding: "1rem"
            },
            onClick: () => B(!1),
            children: /* @__PURE__ */ d(
              "div",
              {
                className: "cedros-modal-content",
                style: {
                  backgroundColor: T.tokens.modalBackground,
                  borderRadius: "12px",
                  padding: "2rem",
                  maxWidth: "400px",
                  width: "100%",
                  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                  border: `1px solid ${T.tokens.modalBorder}`
                },
                onClick: (me) => me.stopPropagation(),
                children: [
                  /* @__PURE__ */ d(
                    "div",
                    {
                      style: {
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "1.5rem"
                      },
                      children: [
                        /* @__PURE__ */ o(
                          "h3",
                          {
                            style: {
                              margin: 0,
                              fontSize: "1.25rem",
                              fontWeight: 600,
                              color: T.tokens.surfaceText
                            },
                            children: L("wallet.select_wallet")
                          }
                        ),
                        /* @__PURE__ */ o(
                          "button",
                          {
                            onClick: () => B(!1),
                            style: Mp(T.tokens.surfaceText),
                            "aria-label": "Close modal",
                            type: "button",
                            children: "×"
                          }
                        )
                      ]
                    }
                  ),
                  /* @__PURE__ */ o("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem" }, children: X.map((me) => /* @__PURE__ */ d(
                    "button",
                    {
                      onClick: () => Re(me.adapter.name),
                      style: {
                        width: "100%",
                        padding: "1rem",
                        backgroundColor: T.tokens.surfaceBackground,
                        border: `1px solid ${T.tokens.surfaceBorder}`,
                        borderRadius: "0.5rem",
                        cursor: "pointer",
                        fontSize: "1rem",
                        textAlign: "left",
                        color: T.tokens.surfaceText,
                        display: "flex",
                        alignItems: "center",
                        gap: "1rem",
                        transition: "all 0.2s ease"
                      },
                      onMouseEnter: (Pe) => {
                        Pe.currentTarget.style.backgroundColor = T.tokens.modalBackground, Pe.currentTarget.style.borderColor = T.tokens.surfaceText, Pe.currentTarget.style.transform = "translateY(-2px)";
                      },
                      onMouseLeave: (Pe) => {
                        Pe.currentTarget.style.backgroundColor = T.tokens.surfaceBackground, Pe.currentTarget.style.borderColor = T.tokens.surfaceBorder, Pe.currentTarget.style.transform = "translateY(0)";
                      },
                      type: "button",
                      children: [
                        /* @__PURE__ */ o(zp, { wallet: me, style: { width: "24px", height: "24px" } }),
                        /* @__PURE__ */ o("span", { style: { fontWeight: 500 }, children: me.adapter.name })
                      ]
                    },
                    me.adapter.name
                  )) })
                ]
              }
            )
          }
        ),
        g && !m && !ve && /* @__PURE__ */ d(
          "div",
          {
            style: {
              display: "flex",
              justifyContent: "space-between",
              marginTop: "0.5rem",
              fontSize: "0.75rem",
              color: T.tokens.surfaceText,
              opacity: 0.7
            },
            children: [
              /* @__PURE__ */ o(
                "button",
                {
                  onClick: lt,
                  style: {
                    background: "none",
                    border: "none",
                    padding: 0,
                    color: "inherit",
                    textDecoration: "none",
                    cursor: "pointer",
                    fontSize: "inherit"
                  },
                  type: "button",
                  children: L("wallet.change")
                }
              ),
              /* @__PURE__ */ o(
                "button",
                {
                  onClick: He,
                  style: {
                    background: "none",
                    border: "none",
                    padding: 0,
                    color: "inherit",
                    textDecoration: "none",
                    cursor: "pointer",
                    fontSize: "inherit"
                  },
                  type: "button",
                  children: L("ui.disconnect")
                }
              )
            ]
          }
        ),
        !m && re && /* @__PURE__ */ o("div", { className: T.unstyled ? "" : "cedros-theme__error", children: re }),
        !m && q && /* @__PURE__ */ o("div", { className: T.unstyled ? "" : "cedros-theme__error", children: q }),
        !m && We && /* @__PURE__ */ o("div", { className: T.unstyled ? "" : "cedros-theme__success", children: L("ui.subscription_active") })
      ]
    }
  );
}
function If() {
  const { subscriptionManager: e, creditsManager: t } = Dn(), [n, r] = H({
    status: "idle",
    error: null,
    sessionId: null,
    subscriptionStatus: null,
    expiresAt: null,
    creditsRequirement: null
  }), a = J(
    async (l, u) => {
      r((p) => ({
        ...p,
        status: "checking",
        error: null
      }));
      try {
        const p = await e.checkSubscriptionStatus({
          resource: l,
          userId: u
        });
        return r((m) => ({
          ...m,
          status: p.active ? "success" : "idle",
          subscriptionStatus: p.status,
          expiresAt: p.expiresAt || p.currentPeriodEnd || null
        })), p;
      } catch (p) {
        const m = cn(p, "Failed to check subscription status");
        return r((h) => ({
          ...h,
          status: "error",
          error: m
        })), null;
      }
    },
    [e]
  ), i = J(
    async (l, u, p) => {
      r((m) => ({
        ...m,
        status: "loading",
        error: null
      }));
      try {
        const m = await t.requestQuote(
          l,
          p?.couponCode
        );
        return r((h) => ({
          ...h,
          status: "idle",
          creditsRequirement: m
        })), m;
      } catch (m) {
        const h = cn(m, "Failed to get subscription quote");
        return r((g) => ({
          ...g,
          status: "error",
          error: h
        })), null;
      }
    },
    [t]
  ), s = J(
    async (l, u, p, m) => {
      if (!p) {
        const h = "Authentication required for credits payment";
        return r((g) => ({ ...g, status: "error", error: h })), { success: !1, error: h };
      }
      r((h) => ({
        ...h,
        status: "loading",
        error: null
      }));
      try {
        const h = await t.processPayment(
          l,
          p,
          m?.couponCode,
          {
            interval: u,
            ...m?.intervalDays && { intervalDays: String(m.intervalDays) }
          }
        );
        return h.success ? r({
          status: "success",
          error: null,
          sessionId: h.transactionId || null,
          subscriptionStatus: "active",
          expiresAt: null,
          // Will be updated on next status check
          creditsRequirement: null
        }) : r((g) => ({
          ...g,
          status: "error",
          error: h.error || "Credits subscription payment failed"
        })), h;
      } catch (h) {
        const g = cn(h, "Credits subscription payment failed");
        return r((v) => ({
          ...v,
          status: "error",
          error: g
        })), { success: !1, error: g };
      }
    },
    [t]
  ), c = J(() => {
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
    processPayment: s,
    reset: c
  };
}
function ON({
  resource: e,
  interval: t,
  intervalDays: n,
  authToken: r,
  userId: a,
  couponCode: i,
  label: s,
  disabled: c = !1,
  onAttempt: l,
  onSuccess: u,
  onError: p,
  className: m = "",
  hideMessages: h = !1,
  autoCheckStatus: g = !1
}) {
  const {
    status: v,
    error: f,
    subscriptionStatus: b,
    expiresAt: k,
    checkStatus: w,
    processPayment: _
  } = If(), x = nr(), { t: N, translations: I } = Io(), S = gt(w);
  ge(() => {
    S.current = w;
  }, [w]), ge(() => {
    g && a && (Ne().debug("[CreditsSubscribeButton] Auto-checking subscription status", { resource: e, userId: a }), S.current(e, a));
  }, [g, a, e]);
  const A = s || N("ui.subscribe_with_credits") || "Subscribe with Credits", W = f && typeof f != "string" ? f?.code ?? null : null, T = f ? typeof f == "string" ? f : ((E) => {
    if (!E || !I) return "";
    const q = I.errors[E];
    return q ? q.action ? `${q.message} ${q.action}` : q.message : "";
  })(W) : null, P = J(async () => {
    if (Ne().debug("[CreditsSubscribeButton] executeSubscriptionFlow", {
      resource: e,
      interval: t,
      intervalDays: n,
      hasAuthToken: !!r
    }), Ro("credits", e), l && l("credits"), !r) {
      const q = "Authentication required: please log in to subscribe with credits";
      Ne().error("[CreditsSubscribeButton]", q), Xn("credits", q, e), p && p(q);
      return;
    }
    Ar("credits", e);
    const E = await _(e, t, r, {
      couponCode: i,
      intervalDays: n
    });
    E.success && E.transactionId ? (Oo("credits", E.transactionId, e), u && u(E.transactionId)) : !E.success && E.error && (Xn("credits", E.error, e), p && p(E.error));
  }, [
    e,
    t,
    n,
    r,
    i,
    _,
    l,
    u,
    p
  ]), L = Te(() => `credits-subscribe-${e}-${t}`, [e, t]), F = Te(
    () => Mo(L, P, {
      cooldownMs: 200,
      deduplicationWindowMs: 0
    }),
    [L, P]
  ), $ = v === "loading" || v === "checking", M = b === "active" || b === "trialing", D = c || $ || M;
  let O = A;
  if ($)
    O = N("ui.processing");
  else if (M && k) {
    const E = new Date(k).toLocaleDateString();
    O = `${N("ui.subscribed_until")} ${E}`;
  } else M && (O = N("ui.subscribed"));
  const V = x.unstyled ? m : `${x.className} cedros-theme__credits-button ${m}`.trim();
  return /* @__PURE__ */ d("div", { className: V, style: x.unstyled ? {} : x.style, children: [
    /* @__PURE__ */ o(
      "button",
      {
        onClick: F,
        disabled: D,
        className: x.unstyled ? m : "cedros-theme__button cedros-theme__credits",
        type: "button",
        children: O
      }
    ),
    !h && T && /* @__PURE__ */ o("div", { className: x.unstyled ? "" : "cedros-theme__error", children: T }),
    !h && M && /* @__PURE__ */ o("div", { className: x.unstyled ? "" : "cedros-theme__success", children: N("ui.subscription_active") })
  ] });
}
function Rf() {
  const { subscriptionChangeManager: e } = Dn(), [t, n] = H({
    status: "idle",
    error: null,
    subscription: null,
    changePreview: null,
    userId: null
  }), r = gt(t);
  r.current = t;
  const a = J(
    async (m, h) => {
      n((g) => ({ ...g, status: "loading", error: null }));
      try {
        const g = await e.getDetails(m, h);
        return n((v) => ({
          ...v,
          status: "success",
          subscription: g,
          userId: h
        })), g;
      } catch (g) {
        const v = g instanceof Error ? g.message : "Failed to load subscription";
        return n((f) => ({ ...f, status: "error", error: v })), null;
      }
    },
    [e]
  ), i = J(
    async (m, h, g, v) => {
      n((f) => ({ ...f, status: "loading", error: null }));
      try {
        const f = {
          currentResource: m,
          newResource: h,
          userId: g,
          newInterval: v
        }, b = await e.previewChange(f);
        return n((k) => ({
          ...k,
          status: "idle",
          changePreview: b
        })), b;
      } catch (f) {
        const b = f instanceof Error ? f.message : "Failed to preview change";
        return n((k) => ({ ...k, status: "error", error: b })), null;
      }
    },
    [e]
  ), s = J(
    async (m) => {
      const { subscription: h, userId: g } = r.current;
      if (!h || !g)
        return n((v) => ({ ...v, status: "error", error: "No subscription loaded" })), null;
      n((v) => ({ ...v, status: "loading", error: null }));
      try {
        const v = {
          currentResource: h.resource,
          newResource: m.newResource,
          userId: g,
          newInterval: m.newInterval,
          prorationBehavior: m.prorationBehavior,
          immediate: m.immediate
        }, f = await e.changeSubscription(v);
        return f.success ? n((b) => ({
          ...b,
          status: "success",
          subscription: b.subscription ? {
            ...b.subscription,
            resource: f.newResource,
            interval: f.newInterval,
            status: f.status
          } : null,
          changePreview: null
        })) : n((b) => ({
          ...b,
          status: "error",
          error: f.error || "Failed to change subscription"
        })), f;
      } catch (v) {
        const f = v instanceof Error ? v.message : "Failed to change subscription";
        return n((b) => ({ ...b, status: "error", error: f })), null;
      }
    },
    [e]
  ), c = J(
    async (m) => {
      const { subscription: h, userId: g } = r.current;
      if (!h || !g)
        return n((v) => ({ ...v, status: "error", error: "No subscription loaded" })), null;
      n((v) => ({ ...v, status: "loading", error: null }));
      try {
        const v = {
          resource: h.resource,
          userId: g,
          immediate: m
        }, f = await e.cancel(v);
        if (f.success) {
          const b = m ? "canceled" : h.status;
          n((k) => ({
            ...k,
            status: "success",
            subscription: k.subscription ? {
              ...k.subscription,
              status: b,
              cancelAtPeriodEnd: !m
            } : null
          }));
        } else
          n((b) => ({
            ...b,
            status: "error",
            error: f.error || "Failed to cancel subscription"
          }));
        return f;
      } catch (v) {
        const f = v instanceof Error ? v.message : "Failed to cancel subscription";
        return n((b) => ({ ...b, status: "error", error: f })), null;
      }
    },
    [e]
  ), l = J(
    async (m, h) => {
      n((g) => ({ ...g, status: "loading", error: null }));
      try {
        const g = await e.getBillingPortalUrl({
          userId: m,
          returnUrl: h
        });
        return window.location.href = g.url, g;
      } catch (g) {
        const v = g instanceof Error ? g.message : "Failed to open billing portal";
        return n((f) => ({ ...f, status: "error", error: v })), null;
      }
    },
    [e]
  ), u = J(() => {
    n((m) => ({ ...m, changePreview: null }));
  }, []), p = J(() => {
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
    loadSubscription: a,
    previewChange: i,
    changeSubscription: s,
    cancelSubscription: c,
    openBillingPortal: l,
    clearPreview: u,
    reset: p
  };
}
const Of = {
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
}, Mf = {
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
function Df(e) {
  const t = e ? Mf : Of;
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
function An(e, t) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: t.toUpperCase()
  }).format(e / 100);
}
function Al(e) {
  return new Date(e).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}
function Lf(e) {
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
function $f({
  preview: e,
  onConfirm: t,
  onCancel: n,
  isLoading: r,
  styles: a
}) {
  const i = e.immediateAmount < 0;
  return /* @__PURE__ */ d("div", { className: "cedros-proration-preview", style: a.prorationPreview, children: [
    /* @__PURE__ */ o("h4", { style: a.previewTitle, children: "Change Preview" }),
    /* @__PURE__ */ d("div", { style: a.previewDetails, children: [
      /* @__PURE__ */ d("div", { style: a.previewRow, children: [
        /* @__PURE__ */ o("span", { children: "Current plan:" }),
        /* @__PURE__ */ d("span", { children: [
          An(e.currentPlanPrice, e.currency),
          "/period"
        ] })
      ] }),
      /* @__PURE__ */ d("div", { style: a.previewRow, children: [
        /* @__PURE__ */ o("span", { children: "New plan:" }),
        /* @__PURE__ */ d("span", { children: [
          An(e.newPlanPrice, e.currency),
          "/period"
        ] })
      ] }),
      /* @__PURE__ */ d("div", { style: a.previewRow, children: [
        /* @__PURE__ */ o("span", { children: "Days remaining:" }),
        /* @__PURE__ */ d("span", { children: [
          e.daysRemaining,
          " days"
        ] })
      ] }),
      e.prorationDetails && /* @__PURE__ */ d(Oe, { children: [
        /* @__PURE__ */ d("div", { style: a.previewRow, children: [
          /* @__PURE__ */ o("span", { children: "Unused credit:" }),
          /* @__PURE__ */ d("span", { children: [
            "-",
            An(e.prorationDetails.unusedCredit, e.currency)
          ] })
        ] }),
        /* @__PURE__ */ d("div", { style: a.previewRow, children: [
          /* @__PURE__ */ o("span", { children: "New plan cost:" }),
          /* @__PURE__ */ o("span", { children: An(e.prorationDetails.newPlanCost, e.currency) })
        ] })
      ] }),
      /* @__PURE__ */ d("div", { style: { ...a.previewRow, ...a.previewTotal }, children: [
        /* @__PURE__ */ o("span", { children: i ? "Credit to account:" : "Amount due now:" }),
        /* @__PURE__ */ o("span", { style: { color: i ? "#22c55e" : "#ef4444" }, children: An(Math.abs(e.immediateAmount), e.currency) })
      ] }),
      /* @__PURE__ */ d("div", { style: a.previewRow, children: [
        /* @__PURE__ */ o("span", { children: "Effective date:" }),
        /* @__PURE__ */ o("span", { children: Al(e.effectiveDate) })
      ] })
    ] }),
    /* @__PURE__ */ d("div", { style: a.previewActions, children: [
      /* @__PURE__ */ o("button", { onClick: n, style: a.cancelButton, disabled: r, children: "Cancel" }),
      /* @__PURE__ */ o("button", { onClick: t, style: a.confirmButton, disabled: r, children: r ? "Processing..." : "Confirm Change" })
    ] })
  ] });
}
function MN({
  resource: e,
  userId: t,
  availablePlans: n = [],
  onSubscriptionChanged: r,
  onSubscriptionCanceled: a,
  billingPortalReturnUrl: i,
  showBillingPortal: s = !1,
  className: c,
  style: l
}) {
  const { mode: u } = nr(), p = Te(() => Df(u === "dark"), [u]), {
    subscription: m,
    changePreview: h,
    status: g,
    error: v,
    loadSubscription: f,
    previewChange: b,
    changeSubscription: k,
    cancelSubscription: w,
    openBillingPortal: _,
    clearPreview: x
  } = Rf();
  ge(() => {
    f(e, t);
  }, [e, t, f]);
  const N = J(
    async (C, T) => {
      await b(e, C, t, T);
    },
    [e, t, b]
  ), I = J(async () => {
    if (!h) return;
    const C = n.find(
      (P) => P.price === h.newPlanPrice && P.currency === h.currency
    );
    (await k({
      newResource: C?.resource || e,
      newInterval: C?.interval,
      immediate: !0
    }))?.success && C && r?.(C.resource, C.interval);
  }, [h, n, e, k, r]), S = J(
    async (C) => {
      (await w(C))?.success && a?.();
    },
    [w, a]
  ), A = J(() => {
    _(t, i);
  }, [t, i, _]), W = g === "loading";
  return /* @__PURE__ */ d("div", { className: `cedros-subscription-panel ${c || ""}`, style: { ...p.container, ...l }, children: [
    v && /* @__PURE__ */ o("div", { className: "cedros-subscription-error", style: p.error, children: v }),
    W && !m && /* @__PURE__ */ o("div", { className: "cedros-subscription-loading", style: p.loading, children: "Loading subscription..." }),
    m && /* @__PURE__ */ d(Oe, { children: [
      /* @__PURE__ */ d("div", { className: "cedros-subscription-details", style: p.details, children: [
        /* @__PURE__ */ o("h3", { style: p.title, children: "Current Subscription" }),
        /* @__PURE__ */ d("div", { style: p.detailRow, children: [
          /* @__PURE__ */ o("span", { style: p.label, children: "Plan:" }),
          /* @__PURE__ */ o("span", { style: p.value, children: m.resource })
        ] }),
        /* @__PURE__ */ d("div", { style: p.detailRow, children: [
          /* @__PURE__ */ o("span", { style: p.label, children: "Status:" }),
          /* @__PURE__ */ o(
            "span",
            {
              style: {
                ...p.statusBadge,
                backgroundColor: Lf(m.status)
              },
              children: m.status
            }
          )
        ] }),
        /* @__PURE__ */ d("div", { style: p.detailRow, children: [
          /* @__PURE__ */ o("span", { style: p.label, children: "Price:" }),
          /* @__PURE__ */ d("span", { style: p.value, children: [
            An(m.pricePerPeriod, m.currency),
            "/",
            m.interval
          ] })
        ] }),
        /* @__PURE__ */ d("div", { style: p.detailRow, children: [
          /* @__PURE__ */ o("span", { style: p.label, children: "Current period ends:" }),
          /* @__PURE__ */ o("span", { style: p.value, children: Al(m.currentPeriodEnd) })
        ] }),
        m.cancelAtPeriodEnd && /* @__PURE__ */ o("div", { style: p.cancelNotice, children: "Subscription will cancel at end of current period" })
      ] }),
      h && /* @__PURE__ */ o(
        $f,
        {
          preview: h,
          onConfirm: I,
          onCancel: x,
          isLoading: W,
          styles: p
        }
      ),
      n.length > 0 && !h && /* @__PURE__ */ d("div", { className: "cedros-available-plans", style: p.plansSection, children: [
        /* @__PURE__ */ o("h4", { style: p.plansTitle, children: "Available Plans" }),
        /* @__PURE__ */ o("div", { style: p.plansList, children: n.map((C) => {
          const T = C.resource === m.resource;
          return /* @__PURE__ */ d(
            "div",
            {
              style: {
                ...p.planCard,
                ...T ? p.currentPlan : {}
              },
              children: [
                /* @__PURE__ */ o("div", { style: p.planName, children: C.name }),
                /* @__PURE__ */ d("div", { style: p.planPrice, children: [
                  An(C.price, C.currency),
                  "/",
                  C.interval
                ] }),
                C.description && /* @__PURE__ */ o("div", { style: p.planDescription, children: C.description }),
                T ? /* @__PURE__ */ o("span", { style: p.currentBadge, children: "Current Plan" }) : /* @__PURE__ */ o(
                  "button",
                  {
                    onClick: () => N(C.resource, C.interval),
                    style: p.changePlanButton,
                    disabled: W,
                    children: C.price > m.pricePerPeriod ? "Upgrade" : "Downgrade"
                  }
                )
              ]
            },
            C.resource
          );
        }) })
      ] }),
      /* @__PURE__ */ d("div", { className: "cedros-subscription-actions", style: p.actions, children: [
        s && m.paymentMethod === "stripe" && /* @__PURE__ */ o("button", { onClick: A, style: p.portalButton, disabled: W, children: "Manage Billing" }),
        m.status === "active" && !m.cancelAtPeriodEnd && /* @__PURE__ */ o(
          "button",
          {
            onClick: () => S(!1),
            style: p.cancelSubscriptionButton,
            disabled: W,
            children: "Cancel Subscription"
          }
        )
      ] })
    ] })
  ] });
}
function DN() {
  const { x402Manager: e, walletManager: t } = Dn(), { publicKey: n, signTransaction: r } = Eo(), [a, i] = H({
    status: "idle",
    error: null,
    transactionId: null
  }), [s, c] = H(null), [l, u] = H(null), p = J(
    async (v) => {
      try {
        i((b) => ({ ...b, status: "loading" }));
        const f = await e.requestQuote({ resource: v });
        if (!e.validateRequirement(f))
          throw new Error("Invalid refund requirement received from server");
        return c(f), i((b) => ({ ...b, status: "idle" })), f;
      } catch (f) {
        const b = cn(f, "Failed to fetch refund requirement");
        throw i({
          status: "error",
          error: b,
          transactionId: null
        }), f;
      }
    },
    [e]
  ), m = J(
    async (v, f) => {
      if (!n || !r)
        throw new Error("Wallet not connected");
      try {
        i({
          status: "loading",
          error: null,
          transactionId: null
        });
        const b = await e.requestQuote({ resource: v, couponCode: f });
        if (!e.validateRequirement(b))
          throw new Error("Invalid refund requirement received");
        c(b);
        const k = await t.buildTransaction({
          requirement: b,
          payerPublicKey: n
        }), w = await t.signTransaction({
          transaction: k,
          signTransaction: r
        }), _ = t.buildPaymentPayload({
          requirement: b,
          signedTx: w,
          payerPublicKey: n
        }), x = await e.submitPayment({
          resource: v,
          payload: _,
          couponCode: f,
          metadata: void 0,
          // no metadata for refunds
          resourceType: "refund"
        });
        return x.settlement && u(x.settlement), i({
          status: "success",
          error: null,
          transactionId: x.transactionId || w.signature
        }), x;
      } catch (b) {
        const k = cn(b, "Refund payment failed");
        throw i({
          status: "error",
          error: k,
          transactionId: null
        }), b;
      }
    },
    [n, r, e, t]
  ), h = J(
    async (v) => {
      if (!n || !r)
        throw new Error("Wallet not connected");
      try {
        i({
          status: "loading",
          error: null,
          transactionId: null
        });
        const f = await e.requestQuote({ resource: v });
        if (!e.validateRequirement(f))
          throw new Error("Invalid refund requirement received");
        c(f);
        const { transaction: b } = await e.buildGaslessTransaction({
          resourceId: v,
          userWallet: n.toString(),
          feePayer: f.extra.feePayer
        }), k = t.deserializeTransaction(b), w = await t.partiallySignTransaction({
          transaction: k,
          signTransaction: r
        }), _ = await e.submitGaslessTransaction({
          resource: v,
          partialTx: w,
          couponCode: void 0,
          // no couponCode
          metadata: void 0,
          // no metadata
          resourceType: "refund",
          requirement: f
        });
        return _.settlement && u(_.settlement), i({
          status: "success",
          error: null,
          transactionId: _.transactionId || "gasless-refund-tx"
        }), _;
      } catch (f) {
        const b = cn(f, "Gasless refund payment failed");
        throw i({
          status: "error",
          error: b,
          transactionId: null
        }), f;
      }
    },
    [n, r, e, t]
  ), g = J(() => {
    i({
      status: "idle",
      error: null,
      transactionId: null
    }), c(null), u(null);
  }, []);
  return {
    state: a,
    requirement: s,
    settlement: l,
    fetchRefundQuote: p,
    processRefund: m,
    processGaslessRefund: h,
    reset: g
  };
}
function zf() {
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
function Ff() {
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
function Bf() {
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
function jf() {
  return {
    passed: !0,
    severity: "info",
    message: "Stripe.js loaded via @stripe/stripe-js package (CSP recommended, not SRI)",
    recommendation: "Ensure CSP script-src includes https://js.stripe.com"
  };
}
function Uf() {
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
function LN() {
  const e = [
    zf(),
    Ff(),
    Bf(),
    jf(),
    Uf()
  ], t = e.some((i) => i.severity === "error" && !i.passed), n = e.some((i) => i.severity === "warning" && !i.passed);
  let r, a;
  return t ? (r = "vulnerable", a = "Security issues detected. Review errors and apply recommendations.") : n ? (r = "warnings", a = "Minor security warnings detected. Consider applying recommendations.") : (r = "secure", a = "All security checks passed."), {
    checks: e,
    overallStatus: r,
    summary: a
  };
}
function $N(e) {
  process.env.NODE_ENV !== "production" && (console.group("🔒 Cedros Pay Security Report"), console.log(`Status: ${e.overallStatus.toUpperCase()}`), console.log(`Summary: ${e.summary}`), console.log(""), e.checks.forEach((t) => {
    const n = t.passed ? "✅" : t.severity === "error" ? "❌" : "⚠️";
    console.log(`${n} ${t.message}`), t.recommendation && console.log(`   → ${t.recommendation}`);
  }), console.groupEnd());
}
const zN = {
  CSP: "Use generateCSP() from @cedros/pay-react to generate Content Security Policy headers",
  HTTPS: "Always serve payment pages over HTTPS in production",
  PACKAGE_UPDATES: "Keep @stripe/stripe-js and @cedros/pay-react updated for security patches",
  AUDIT: "Run npm audit regularly to check for known vulnerabilities",
  MONITORING: "Monitor Stripe security advisories and apply updates promptly",
  NO_SRI: "Do NOT use SRI hashes for Stripe.js - use CSP instead"
}, Si = U.createContext(null);
function je() {
  const e = U.useContext(Si);
  if (!e)
    throw new Error("useCedrosShop must be used within CedrosShopProvider");
  return e;
}
function Ci() {
  return U.useContext(Si);
}
function Wf({
  config: e,
  children: t
}) {
  return /* @__PURE__ */ o(Si.Provider, { value: { config: e }, children: t });
}
function Mt(e) {
  return new Promise((t) => setTimeout(t, e));
}
const Tl = [
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
], po = [
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
let Na = [];
const Wr = {};
function Vf(e, t) {
  let n = e;
  if (t.category && t.category !== "all") {
    const l = Tl.find((u) => u.slug === t.category || u.id === t.category);
    l && (n = n.filter((u) => u.categoryIds.includes(l.id)));
  }
  if (t.search) {
    const l = t.search.toLowerCase();
    n = n.filter((u) => u.title.toLowerCase().includes(l) || u.description.toLowerCase().includes(l));
  }
  const r = t.filters ?? {}, a = r.tags;
  if (Array.isArray(a) && a.length > 0) {
    const l = new Set(a.map(String));
    n = n.filter((u) => u.tags?.some((p) => l.has(p)));
  }
  const i = typeof r.priceMin == "number" ? r.priceMin : void 0, s = typeof r.priceMax == "number" ? r.priceMax : void 0;
  return typeof i == "number" && (n = n.filter((l) => l.price >= i)), typeof s == "number" && (n = n.filter((l) => l.price <= s)), (typeof r.inStock == "boolean" ? r.inStock : void 0) === !0 && (n = n.filter((l) => l.inventoryStatus !== "out_of_stock")), n;
}
function Hf(e, t) {
  if (!t || t === "featured") return e;
  const n = [...e];
  return t === "price_asc" && n.sort((r, a) => r.price - a.price), t === "price_desc" && n.sort((r, a) => a.price - r.price), n;
}
function qf(e, t, n) {
  const r = (t - 1) * n;
  return {
    items: e.slice(r, r + n),
    page: t,
    pageSize: n,
    total: e.length,
    hasNextPage: r + n < e.length
  };
}
function Zf(e) {
  const t = (/* @__PURE__ */ new Date()).toISOString(), n = e.cart.map((a) => {
    const i = po.find((s) => s.id === a.resource || s.slug === a.resource) ?? po[0];
    return {
      title: i.title,
      qty: a.quantity,
      unitPrice: i.price,
      currency: e.options.currency,
      imageUrl: i.images[0]?.url
    };
  }), r = n.reduce((a, i) => a + i.qty * i.unitPrice, 0);
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
function Gf() {
  return {
    async listProducts(e) {
      await Mt(150);
      const t = e.page ?? 1, n = e.pageSize ?? 24, r = Vf(po, e), a = Hf(r, e.sort);
      return qf(a, t, n);
    },
    async getProductBySlug(e) {
      return await Mt(100), po.find((t) => t.slug === e) ?? null;
    },
    async listCategories() {
      return await Mt(80), Tl;
    },
    async getOrderHistory() {
      return await Mt(120), Na;
    },
    async getCart({ customerId: e }) {
      return await Mt(80), Wr[e] ?? { items: [] };
    },
    async mergeCart({ customerId: e, cart: t }) {
      await Mt(120);
      const n = Wr[e] ?? { items: [] }, r = /* @__PURE__ */ new Map(), a = (s) => {
        const c = `${s.productId}::${s.variantId ?? ""}`, l = r.get(c);
        l ? r.set(c, { ...l, qty: l.qty + s.qty }) : r.set(c, s);
      };
      for (const s of n.items) a(s);
      for (const s of t.items) a(s);
      const i = {
        items: Array.from(r.values()),
        promoCode: t.promoCode ?? n.promoCode
      };
      return Wr[e] = i, i;
    },
    async updateCart({ customerId: e, cart: t }) {
      await Mt(60), Wr[e] = t;
    },
    async createCheckoutSession(e) {
      await Mt(250);
      const t = Zf(e);
      if (Na = [t, ...Na].slice(0, 25), e.options.successUrl) {
        const n = new URL(e.options.successUrl, "http://localhost");
        return n.searchParams.set("demoOrderId", t.id), { kind: "redirect", url: n.toString().replace("http://localhost", "") };
      }
      return { kind: "custom", data: { orderId: t.id } };
    },
    async listSubscriptionTiers() {
      return await Mt(80), [
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
      return await Mt(80), { isActive: !1 };
    },
    async createSubscriptionCheckoutSession(e) {
      return await Mt(200), e.successUrl ? { kind: "redirect", url: e.successUrl } : { kind: "custom", data: e };
    }
  };
}
function Pl(e) {
  return e.replace(/[_-]+/g, " ").trim().replace(/\b\w/g, (t) => t.toUpperCase());
}
function Qf(e) {
  return e ? e.toUpperCase() : "USD";
}
function Yf(e) {
  if (e && (e === "in_stock" || e === "low" || e === "out_of_stock" || e === "backorder"))
    return e;
}
function Kf(e) {
  if (e && (e === "physical" || e === "digital"))
    return e;
}
function Jf(e) {
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
          for (const a of r)
            typeof a == "string" && t.push(a);
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
function Vr(e) {
  const t = Qf(e.fiatCurrency), n = e.images && e.images.length ? e.images : e.imageUrl ? [{ url: e.imageUrl, alt: e.title }] : [], r = e.effectiveFiatAmountCents ?? e.fiatAmountCents ?? 0, a = e.compareAtAmountCents, i = e.metadata?.shippingCountries ?? e.metadata?.shipping_countries, s = Jf(i);
  return {
    id: e.id,
    slug: e.slug ?? e.id,
    title: e.title ?? Pl(e.id),
    description: e.description ?? "",
    images: n,
    price: r / 100,
    currency: t,
    tags: e.tags ?? [],
    categoryIds: e.categoryIds ?? [],
    inventoryStatus: Yf(e.inventoryStatus),
    inventoryQuantity: typeof e.inventoryQuantity == "number" ? e.inventoryQuantity : void 0,
    compareAtPrice: typeof a == "number" ? a / 100 : void 0,
    shippingProfile: Kf(e.shippingProfile),
    checkoutRequirements: e.checkoutRequirements,
    fulfillment: e.fulfillment,
    attributes: s.length ? {
      shippingCountries: s.join(",")
    } : void 0
  };
}
function Aa(e) {
  if (Array.isArray(e)) return { products: e };
  const t = e.products ?? e.items ?? [], n = e.total ?? e.count;
  return { products: t, total: n };
}
async function an(e, t, n) {
  const r = {};
  n && (r["X-API-Key"] = n);
  const a = await fetch(`${e}${t}`, { headers: r });
  if (!a.ok) {
    const i = await a.text().catch(() => ""), s = new Error(`Request failed (${a.status}): ${i}`);
    throw s.status = a.status, s;
  }
  return a.json();
}
function Xf(e) {
  return {
    listProducts: async (l) => {
      const u = l.page ?? 1, p = l.pageSize ?? 24, m = p, h = (u - 1) * p, g = new URLSearchParams();
      g.set("limit", String(m)), g.set("offset", String(h)), l.search && g.set("search", l.search), l.category && g.set("category", l.category), l.sort && g.set("sort", l.sort), l.filters?.inStock && g.set("in_stock", "true"), l.filters?.minPrice != null && g.set("min_price", String(l.filters.minPrice)), l.filters?.maxPrice != null && g.set("max_price", String(l.filters.maxPrice));
      const v = l.filters?.tags, f = Array.isArray(v) ? v : typeof v == "string" ? [v] : [];
      f.length && g.set("tags", f.join(","));
      const b = await an(e.serverUrl, `/paywall/v1/products?${g.toString()}`, e.apiKey), { products: k, total: w } = Aa(b);
      return {
        items: k.map(Vr),
        page: u,
        pageSize: p,
        total: w,
        hasNextPage: typeof w == "number" ? h + m < w : k.length === m
      };
    },
    getProductBySlug: async (l) => {
      try {
        const u = await an(
          e.serverUrl,
          `/paywall/v1/products/by-slug/${encodeURIComponent(l)}`,
          e.apiKey
        );
        return Vr(u);
      } catch (u) {
        const p = u?.status;
        if (p !== 404 && p !== 405) throw u;
        try {
          const m = await an(
            e.serverUrl,
            `/paywall/v1/products/${encodeURIComponent(l)}`,
            e.apiKey
          );
          return Vr(m);
        } catch (m) {
          const h = m?.status;
          if (h !== 404 && h !== 405) throw m;
          const g = await an(e.serverUrl, "/paywall/v1/products?limit=200&offset=0", e.apiKey), { products: v } = Aa(g), f = v.find((b) => b.slug === l || b.id === l);
          return f ? Vr(f) : null;
        }
      }
    },
    listCategories: async () => {
      const l = await an(e.serverUrl, "/paywall/v1/products?limit=500&offset=0", e.apiKey), { products: u } = Aa(l), p = /* @__PURE__ */ new Set();
      for (const m of u)
        for (const h of m.categoryIds ?? []) p.add(h);
      return Array.from(p).map((m) => ({ id: m, slug: m, name: Pl(m) }));
    },
    getOrderHistory: async () => [],
    createCheckoutSession: async (l) => {
      throw new Error("createCheckoutSession is not implemented for paywall adapter");
    },
    getStorefrontSettings: async () => {
      try {
        return (await an(e.serverUrl, "/admin/config/storefront", e.apiKey)).config ?? null;
      } catch {
        return null;
      }
    },
    getPaymentMethodsConfig: async () => {
      try {
        const [l, u, p] = await Promise.allSettled([
          an(e.serverUrl, "/admin/config/stripe", e.apiKey),
          an(e.serverUrl, "/admin/config/x402", e.apiKey),
          an(e.serverUrl, "/admin/config/cedros_login", e.apiKey)
        ]), m = l.status === "fulfilled" ? !!l.value?.config?.enabled : !1, h = u.status === "fulfilled" ? !!u.value?.config?.enabled : !1, g = p.status === "fulfilled" ? !!p.value?.config?.enabled : !1;
        return {
          card: m,
          crypto: h,
          credits: g
        };
      } catch {
        return null;
      }
    },
    getAIRelatedProducts: async (l) => {
      const u = { "Content-Type": "application/json" };
      e.apiKey && (u["X-API-Key"] = e.apiKey);
      const p = await fetch(`${e.serverUrl}/admin/ai/related-products`, {
        method: "POST",
        headers: u,
        body: JSON.stringify(l)
      });
      if (!p.ok) {
        const m = await p.text().catch(() => "");
        throw new Error(`AI related products request failed (${p.status}): ${m}`);
      }
      return p.json();
    }
  };
}
function eh(e) {
  throw new Error(`Unhandled cart action: ${JSON.stringify(e)}`);
}
function Cn(e) {
  return `${e.productId}::${e.variantId ?? ""}`;
}
const th = { items: [] };
function nh(e, t) {
  switch (t.type) {
    case "cart/hydrate":
      return t.state;
    case "cart/add": {
      const n = Math.max(1, Math.floor(t.qty ?? 1)), r = Cn(t.item);
      return e.items.find((i) => Cn(i) === r) ? {
        ...e,
        items: e.items.map((i) => Cn(i) === r ? { ...i, qty: i.qty + n } : i)
      } : {
        ...e,
        items: [...e.items, { ...t.item, qty: n }]
      };
    }
    case "cart/remove": {
      const n = `${t.productId}::${t.variantId ?? ""}`;
      return {
        ...e,
        items: e.items.filter((r) => Cn(r) !== n)
      };
    }
    case "cart/setQty": {
      const n = Math.max(0, Math.floor(t.qty)), r = `${t.productId}::${t.variantId ?? ""}`;
      return n === 0 ? {
        ...e,
        items: e.items.filter((a) => Cn(a) !== r)
      } : {
        ...e,
        items: e.items.map((a) => Cn(a) === r ? { ...a, qty: n } : a)
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
          (r) => Cn(r) === n ? { ...r, holdId: t.holdId, holdExpiresAt: t.holdExpiresAt } : r
        )
      };
    }
    default:
      return eh(t);
  }
}
function rh(e) {
  return e.reduce((t, n) => t + n.qty, 0);
}
function oh(e) {
  return e.reduce((t, n) => t + n.qty * n.unitPrice, 0);
}
function Zs() {
  try {
    return typeof window > "u" ? null : window.localStorage;
  } catch {
    return null;
  }
}
function ah(e, t) {
  try {
    const n = e.getItem(t);
    return n ? JSON.parse(n) : null;
  } catch {
    return null;
  }
}
function ih(e, t, n) {
  try {
    e.setItem(t, JSON.stringify(n));
  } catch {
  }
}
const El = U.createContext(null);
function jt() {
  const e = U.useContext(El);
  if (!e) throw new Error("useCart must be used within CartProvider");
  return e;
}
function sh({ children: e }) {
  const { config: t } = je(), n = t.cart?.storageKey ?? "cedros_shop_cart_v1", r = t.customer?.id, a = t.customer?.isSignedIn ?? !!r, i = t.cart?.syncDebounceMs ?? 800, s = !!t.adapter.getCartInventoryStatus, [c, l] = U.useReducer(nh, th), [u, p] = U.useState(!1), m = U.useRef(!1), h = U.useRef(null);
  U.useEffect(() => {
    const b = Zs();
    if (!b) return;
    const k = ah(b, n);
    k && Array.isArray(k.items) && l({ type: "cart/hydrate", state: k }), p(!0);
  }, [n]), U.useEffect(() => {
    const b = Zs();
    b && ih(b, n, c);
  }, [c, n]), U.useEffect(() => {
    u && (!a || !r || !t.adapter.mergeCart && !t.adapter.getCart || m.current || (m.current = !0, (async () => {
      try {
        const b = t.adapter.mergeCart ? await t.adapter.mergeCart({ customerId: r, cart: c }) : await t.adapter.getCart({ customerId: r });
        b && Array.isArray(b.items) && (l({ type: "cart/hydrate", state: b }), h.current = JSON.stringify(b));
      } catch {
      }
    })()));
  }, [t.adapter, r, u, a, c]), U.useEffect(() => {
    if (!u || !a || !r || !t.adapter.updateCart || !m.current || typeof window > "u") return;
    const b = JSON.stringify(c);
    if (h.current === b) return;
    const k = window.setTimeout(() => {
      t.adapter.updateCart({ customerId: r, cart: c }).then(() => {
        h.current = b;
      }).catch(() => {
      });
    }, i);
    return () => window.clearTimeout(k);
  }, [t.adapter, r, u, a, c, i]);
  const g = U.useCallback(
    (b, k) => {
      const w = c.items.find(
        (_) => _.productId === b && _.variantId === k
      );
      if (w)
        return { holdId: w.holdId, expiresAt: w.holdExpiresAt };
    },
    [c.items]
  ), v = U.useCallback(
    (b, k, w) => {
      l({
        type: "cart/updateHold",
        productId: b,
        variantId: k,
        holdExpiresAt: w
      });
    },
    []
  ), f = U.useMemo(() => {
    const b = rh(c.items), k = oh(c.items);
    return {
      items: c.items,
      promoCode: c.promoCode,
      count: b,
      subtotal: k,
      addItem: (w, _) => l({ type: "cart/add", item: w, qty: _ }),
      removeItem: (w, _) => l({ type: "cart/remove", productId: w, variantId: _ }),
      setQty: (w, _, x) => l({ type: "cart/setQty", productId: w, variantId: _, qty: x }),
      clear: () => l({ type: "cart/clear" }),
      setPromoCode: (w) => l({ type: "cart/setPromoCode", promoCode: w }),
      holdsSupported: s,
      getItemHold: g,
      updateItemHold: v
    };
  }, [c.items, c.promoCode, s, g, v]);
  return /* @__PURE__ */ o(El.Provider, { value: f, children: e });
}
function Q(e, t, n) {
  function r(c, l) {
    if (c._zod || Object.defineProperty(c, "_zod", {
      value: {
        def: l,
        constr: s,
        traits: /* @__PURE__ */ new Set()
      },
      enumerable: !1
    }), c._zod.traits.has(e))
      return;
    c._zod.traits.add(e), t(c, l);
    const u = s.prototype, p = Object.keys(u);
    for (let m = 0; m < p.length; m++) {
      const h = p[m];
      h in c || (c[h] = u[h].bind(c));
    }
  }
  const a = n?.Parent ?? Object;
  class i extends a {
  }
  Object.defineProperty(i, "name", { value: e });
  function s(c) {
    var l;
    const u = n?.Parent ? new i() : this;
    r(u, c), (l = u._zod).deferred ?? (l.deferred = []);
    for (const p of u._zod.deferred)
      p();
    return u;
  }
  return Object.defineProperty(s, "init", { value: r }), Object.defineProperty(s, Symbol.hasInstance, {
    value: (c) => n?.Parent && c instanceof n.Parent ? !0 : c?._zod?.traits?.has(e)
  }), Object.defineProperty(s, "name", { value: e }), s;
}
class Yn extends Error {
  constructor() {
    super("Encountered Promise during synchronous parse. Use .parseAsync() instead.");
  }
}
class Il extends Error {
  constructor(t) {
    super(`Encountered unidirectional transform during encode: ${t}`), this.name = "ZodEncodeError";
  }
}
const Rl = {};
function Pn(e) {
  return Rl;
}
function Ol(e) {
  const t = Object.values(e).filter((r) => typeof r == "number");
  return Object.entries(e).filter(([r, a]) => t.indexOf(+r) === -1).map(([r, a]) => a);
}
function Xa(e, t) {
  return typeof t == "bigint" ? t.toString() : t;
}
function Ni(e) {
  return {
    get value() {
      {
        const t = e();
        return Object.defineProperty(this, "value", { value: t }), t;
      }
    }
  };
}
function Ai(e) {
  return e == null;
}
function Ti(e) {
  const t = e.startsWith("^") ? 1 : 0, n = e.endsWith("$") ? e.length - 1 : e.length;
  return e.slice(t, n);
}
function ch(e, t) {
  const n = (e.toString().split(".")[1] || "").length, r = t.toString();
  let a = (r.split(".")[1] || "").length;
  if (a === 0 && /\d?e-\d?/.test(r)) {
    const l = r.match(/\d?e-(\d?)/);
    l?.[1] && (a = Number.parseInt(l[1]));
  }
  const i = n > a ? n : a, s = Number.parseInt(e.toFixed(i).replace(".", "")), c = Number.parseInt(t.toFixed(i).replace(".", ""));
  return s % c / 10 ** i;
}
const Gs = Symbol("evaluating");
function Ee(e, t, n) {
  let r;
  Object.defineProperty(e, t, {
    get() {
      if (r !== Gs)
        return r === void 0 && (r = Gs, r = n()), r;
    },
    set(a) {
      Object.defineProperty(e, t, {
        value: a
        // configurable: true,
      });
    },
    configurable: !0
  });
}
function Ln(e, t, n) {
  Object.defineProperty(e, t, {
    value: n,
    writable: !0,
    enumerable: !0,
    configurable: !0
  });
}
function vn(...e) {
  const t = {};
  for (const n of e) {
    const r = Object.getOwnPropertyDescriptors(n);
    Object.assign(t, r);
  }
  return Object.defineProperties({}, t);
}
function Qs(e) {
  return JSON.stringify(e);
}
function lh(e) {
  return e.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
}
const Ml = "captureStackTrace" in Error ? Error.captureStackTrace : (...e) => {
};
function fo(e) {
  return typeof e == "object" && e !== null && !Array.isArray(e);
}
const dh = Ni(() => {
  if (typeof navigator < "u" && navigator?.userAgent?.includes("Cloudflare"))
    return !1;
  try {
    const e = Function;
    return new e(""), !0;
  } catch {
    return !1;
  }
});
function Tr(e) {
  if (fo(e) === !1)
    return !1;
  const t = e.constructor;
  if (t === void 0 || typeof t != "function")
    return !0;
  const n = t.prototype;
  return !(fo(n) === !1 || Object.prototype.hasOwnProperty.call(n, "isPrototypeOf") === !1);
}
function Dl(e) {
  return Tr(e) ? { ...e } : Array.isArray(e) ? [...e] : e;
}
const uh = /* @__PURE__ */ new Set(["string", "number", "symbol"]);
function Lo(e) {
  return e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function bn(e, t, n) {
  const r = new e._zod.constr(t ?? e._zod.def);
  return (!t || n?.parent) && (r._zod.parent = e), r;
}
function pe(e) {
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
function mh(e) {
  return Object.keys(e).filter((t) => e[t]._zod.optin === "optional" && e[t]._zod.optout === "optional");
}
const ph = {
  safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
  int32: [-2147483648, 2147483647],
  uint32: [0, 4294967295],
  float32: [-34028234663852886e22, 34028234663852886e22],
  float64: [-Number.MAX_VALUE, Number.MAX_VALUE]
};
function fh(e, t) {
  const n = e._zod.def, r = n.checks;
  if (r && r.length > 0)
    throw new Error(".pick() cannot be used on object schemas containing refinements");
  const i = vn(e._zod.def, {
    get shape() {
      const s = {};
      for (const c in t) {
        if (!(c in n.shape))
          throw new Error(`Unrecognized key: "${c}"`);
        t[c] && (s[c] = n.shape[c]);
      }
      return Ln(this, "shape", s), s;
    },
    checks: []
  });
  return bn(e, i);
}
function hh(e, t) {
  const n = e._zod.def, r = n.checks;
  if (r && r.length > 0)
    throw new Error(".omit() cannot be used on object schemas containing refinements");
  const i = vn(e._zod.def, {
    get shape() {
      const s = { ...e._zod.def.shape };
      for (const c in t) {
        if (!(c in n.shape))
          throw new Error(`Unrecognized key: "${c}"`);
        t[c] && delete s[c];
      }
      return Ln(this, "shape", s), s;
    },
    checks: []
  });
  return bn(e, i);
}
function gh(e, t) {
  if (!Tr(t))
    throw new Error("Invalid input to extend: expected a plain object");
  const n = e._zod.def.checks;
  if (n && n.length > 0) {
    const i = e._zod.def.shape;
    for (const s in t)
      if (Object.getOwnPropertyDescriptor(i, s) !== void 0)
        throw new Error("Cannot overwrite keys on object schemas containing refinements. Use `.safeExtend()` instead.");
  }
  const a = vn(e._zod.def, {
    get shape() {
      const i = { ...e._zod.def.shape, ...t };
      return Ln(this, "shape", i), i;
    }
  });
  return bn(e, a);
}
function yh(e, t) {
  if (!Tr(t))
    throw new Error("Invalid input to safeExtend: expected a plain object");
  const n = vn(e._zod.def, {
    get shape() {
      const r = { ...e._zod.def.shape, ...t };
      return Ln(this, "shape", r), r;
    }
  });
  return bn(e, n);
}
function vh(e, t) {
  const n = vn(e._zod.def, {
    get shape() {
      const r = { ...e._zod.def.shape, ...t._zod.def.shape };
      return Ln(this, "shape", r), r;
    },
    get catchall() {
      return t._zod.def.catchall;
    },
    checks: []
    // delete existing checks
  });
  return bn(e, n);
}
function bh(e, t, n) {
  const a = t._zod.def.checks;
  if (a && a.length > 0)
    throw new Error(".partial() cannot be used on object schemas containing refinements");
  const s = vn(t._zod.def, {
    get shape() {
      const c = t._zod.def.shape, l = { ...c };
      if (n)
        for (const u in n) {
          if (!(u in c))
            throw new Error(`Unrecognized key: "${u}"`);
          n[u] && (l[u] = e ? new e({
            type: "optional",
            innerType: c[u]
          }) : c[u]);
        }
      else
        for (const u in c)
          l[u] = e ? new e({
            type: "optional",
            innerType: c[u]
          }) : c[u];
      return Ln(this, "shape", l), l;
    },
    checks: []
  });
  return bn(t, s);
}
function wh(e, t, n) {
  const r = vn(t._zod.def, {
    get shape() {
      const a = t._zod.def.shape, i = { ...a };
      if (n)
        for (const s in n) {
          if (!(s in i))
            throw new Error(`Unrecognized key: "${s}"`);
          n[s] && (i[s] = new e({
            type: "nonoptional",
            innerType: a[s]
          }));
        }
      else
        for (const s in a)
          i[s] = new e({
            type: "nonoptional",
            innerType: a[s]
          });
      return Ln(this, "shape", i), i;
    }
  });
  return bn(t, r);
}
function Qn(e, t = 0) {
  if (e.aborted === !0)
    return !0;
  for (let n = t; n < e.issues.length; n++)
    if (e.issues[n]?.continue !== !0)
      return !0;
  return !1;
}
function Ll(e, t) {
  return t.map((n) => {
    var r;
    return (r = n).path ?? (r.path = []), n.path.unshift(e), n;
  });
}
function Hr(e) {
  return typeof e == "string" ? e : e?.message;
}
function En(e, t, n) {
  const r = { ...e, path: e.path ?? [] };
  if (!e.message) {
    const a = Hr(e.inst?._zod.def?.error?.(e)) ?? Hr(t?.error?.(e)) ?? Hr(n.customError?.(e)) ?? Hr(n.localeError?.(e)) ?? "Invalid input";
    r.message = a;
  }
  return delete r.inst, delete r.continue, t?.reportInput || delete r.input, r;
}
function Pi(e) {
  return Array.isArray(e) ? "array" : typeof e == "string" ? "string" : "unknown";
}
function Pr(...e) {
  const [t, n, r] = e;
  return typeof t == "string" ? {
    message: t,
    code: "custom",
    input: n,
    inst: r
  } : { ...t };
}
const $l = (e, t) => {
  e.name = "$ZodError", Object.defineProperty(e, "_zod", {
    value: e._zod,
    enumerable: !1
  }), Object.defineProperty(e, "issues", {
    value: t,
    enumerable: !1
  }), e.message = JSON.stringify(t, Xa, 2), Object.defineProperty(e, "toString", {
    value: () => e.message,
    enumerable: !1
  });
}, zl = Q("$ZodError", $l), Fl = Q("$ZodError", $l, { Parent: Error });
function _h(e, t = (n) => n.message) {
  const n = {}, r = [];
  for (const a of e.issues)
    a.path.length > 0 ? (n[a.path[0]] = n[a.path[0]] || [], n[a.path[0]].push(t(a))) : r.push(t(a));
  return { formErrors: r, fieldErrors: n };
}
function xh(e, t = (n) => n.message) {
  const n = { _errors: [] }, r = (a) => {
    for (const i of a.issues)
      if (i.code === "invalid_union" && i.errors.length)
        i.errors.map((s) => r({ issues: s }));
      else if (i.code === "invalid_key")
        r({ issues: i.issues });
      else if (i.code === "invalid_element")
        r({ issues: i.issues });
      else if (i.path.length === 0)
        n._errors.push(t(i));
      else {
        let s = n, c = 0;
        for (; c < i.path.length; ) {
          const l = i.path[c];
          c === i.path.length - 1 ? (s[l] = s[l] || { _errors: [] }, s[l]._errors.push(t(i))) : s[l] = s[l] || { _errors: [] }, s = s[l], c++;
        }
      }
  };
  return r(e), n;
}
const Ei = (e) => (t, n, r, a) => {
  const i = r ? Object.assign(r, { async: !1 }) : { async: !1 }, s = t._zod.run({ value: n, issues: [] }, i);
  if (s instanceof Promise)
    throw new Yn();
  if (s.issues.length) {
    const c = new (a?.Err ?? e)(s.issues.map((l) => En(l, i, Pn())));
    throw Ml(c, a?.callee), c;
  }
  return s.value;
}, Ii = (e) => async (t, n, r, a) => {
  const i = r ? Object.assign(r, { async: !0 }) : { async: !0 };
  let s = t._zod.run({ value: n, issues: [] }, i);
  if (s instanceof Promise && (s = await s), s.issues.length) {
    const c = new (a?.Err ?? e)(s.issues.map((l) => En(l, i, Pn())));
    throw Ml(c, a?.callee), c;
  }
  return s.value;
}, $o = (e) => (t, n, r) => {
  const a = r ? { ...r, async: !1 } : { async: !1 }, i = t._zod.run({ value: n, issues: [] }, a);
  if (i instanceof Promise)
    throw new Yn();
  return i.issues.length ? {
    success: !1,
    error: new (e ?? zl)(i.issues.map((s) => En(s, a, Pn())))
  } : { success: !0, data: i.value };
}, kh = /* @__PURE__ */ $o(Fl), zo = (e) => async (t, n, r) => {
  const a = r ? Object.assign(r, { async: !0 }) : { async: !0 };
  let i = t._zod.run({ value: n, issues: [] }, a);
  return i instanceof Promise && (i = await i), i.issues.length ? {
    success: !1,
    error: new e(i.issues.map((s) => En(s, a, Pn())))
  } : { success: !0, data: i.value };
}, Sh = /* @__PURE__ */ zo(Fl), Ch = (e) => (t, n, r) => {
  const a = r ? Object.assign(r, { direction: "backward" }) : { direction: "backward" };
  return Ei(e)(t, n, a);
}, Nh = (e) => (t, n, r) => Ei(e)(t, n, r), Ah = (e) => async (t, n, r) => {
  const a = r ? Object.assign(r, { direction: "backward" }) : { direction: "backward" };
  return Ii(e)(t, n, a);
}, Th = (e) => async (t, n, r) => Ii(e)(t, n, r), Ph = (e) => (t, n, r) => {
  const a = r ? Object.assign(r, { direction: "backward" }) : { direction: "backward" };
  return $o(e)(t, n, a);
}, Eh = (e) => (t, n, r) => $o(e)(t, n, r), Ih = (e) => async (t, n, r) => {
  const a = r ? Object.assign(r, { direction: "backward" }) : { direction: "backward" };
  return zo(e)(t, n, a);
}, Rh = (e) => async (t, n, r) => zo(e)(t, n, r), Oh = /^[cC][^\s-]{8,}$/, Mh = /^[0-9a-z]+$/, Dh = /^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$/, Lh = /^[0-9a-vA-V]{20}$/, $h = /^[A-Za-z0-9]{27}$/, zh = /^[a-zA-Z0-9_-]{21}$/, Fh = /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/, Bh = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/, Ys = (e) => e ? new RegExp(`^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${e}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`) : /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/, jh = /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/, Uh = "^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$";
function Wh() {
  return new RegExp(Uh, "u");
}
const Vh = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/, Hh = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/, qh = /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/, Zh = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:?){0,6})\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/, Gh = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/, Bl = /^[A-Za-z0-9_-]*$/, Qh = /^\+[1-9]\d{6,14}$/, jl = "(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))", Yh = /* @__PURE__ */ new RegExp(`^${jl}$`);
function Ul(e) {
  const t = "(?:[01]\\d|2[0-3]):[0-5]\\d";
  return typeof e.precision == "number" ? e.precision === -1 ? `${t}` : e.precision === 0 ? `${t}:[0-5]\\d` : `${t}:[0-5]\\d\\.\\d{${e.precision}}` : `${t}(?::[0-5]\\d(?:\\.\\d+)?)?`;
}
function Kh(e) {
  return new RegExp(`^${Ul(e)}$`);
}
function Jh(e) {
  const t = Ul({ precision: e.precision }), n = ["Z"];
  e.local && n.push(""), e.offset && n.push("([+-](?:[01]\\d|2[0-3]):[0-5]\\d)");
  const r = `${t}(?:${n.join("|")})`;
  return new RegExp(`^${jl}T(?:${r})$`);
}
const Xh = (e) => {
  const t = e ? `[\\s\\S]{${e?.minimum ?? 0},${e?.maximum ?? ""}}` : "[\\s\\S]*";
  return new RegExp(`^${t}$`);
}, eg = /^-?\d+$/, tg = /^-?\d+(?:\.\d+)?$/, ng = /^[^A-Z]*$/, rg = /^[^a-z]*$/, xt = /* @__PURE__ */ Q("$ZodCheck", (e, t) => {
  var n;
  e._zod ?? (e._zod = {}), e._zod.def = t, (n = e._zod).onattach ?? (n.onattach = []);
}), Wl = {
  number: "number",
  bigint: "bigint",
  object: "date"
}, Vl = /* @__PURE__ */ Q("$ZodCheckLessThan", (e, t) => {
  xt.init(e, t);
  const n = Wl[typeof t.value];
  e._zod.onattach.push((r) => {
    const a = r._zod.bag, i = (t.inclusive ? a.maximum : a.exclusiveMaximum) ?? Number.POSITIVE_INFINITY;
    t.value < i && (t.inclusive ? a.maximum = t.value : a.exclusiveMaximum = t.value);
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
}), Hl = /* @__PURE__ */ Q("$ZodCheckGreaterThan", (e, t) => {
  xt.init(e, t);
  const n = Wl[typeof t.value];
  e._zod.onattach.push((r) => {
    const a = r._zod.bag, i = (t.inclusive ? a.minimum : a.exclusiveMinimum) ?? Number.NEGATIVE_INFINITY;
    t.value > i && (t.inclusive ? a.minimum = t.value : a.exclusiveMinimum = t.value);
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
}), og = /* @__PURE__ */ Q("$ZodCheckMultipleOf", (e, t) => {
  xt.init(e, t), e._zod.onattach.push((n) => {
    var r;
    (r = n._zod.bag).multipleOf ?? (r.multipleOf = t.value);
  }), e._zod.check = (n) => {
    if (typeof n.value != typeof t.value)
      throw new Error("Cannot mix number and bigint in multiple_of check.");
    (typeof n.value == "bigint" ? n.value % t.value === BigInt(0) : ch(n.value, t.value) === 0) || n.issues.push({
      origin: typeof n.value,
      code: "not_multiple_of",
      divisor: t.value,
      input: n.value,
      inst: e,
      continue: !t.abort
    });
  };
}), ag = /* @__PURE__ */ Q("$ZodCheckNumberFormat", (e, t) => {
  xt.init(e, t), t.format = t.format || "float64";
  const n = t.format?.includes("int"), r = n ? "int" : "number", [a, i] = ph[t.format];
  e._zod.onattach.push((s) => {
    const c = s._zod.bag;
    c.format = t.format, c.minimum = a, c.maximum = i, n && (c.pattern = eg);
  }), e._zod.check = (s) => {
    const c = s.value;
    if (n) {
      if (!Number.isInteger(c)) {
        s.issues.push({
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
        c > 0 ? s.issues.push({
          input: c,
          code: "too_big",
          maximum: Number.MAX_SAFE_INTEGER,
          note: "Integers must be within the safe integer range.",
          inst: e,
          origin: r,
          inclusive: !0,
          continue: !t.abort
        }) : s.issues.push({
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
    c < a && s.issues.push({
      origin: "number",
      input: c,
      code: "too_small",
      minimum: a,
      inclusive: !0,
      inst: e,
      continue: !t.abort
    }), c > i && s.issues.push({
      origin: "number",
      input: c,
      code: "too_big",
      maximum: i,
      inclusive: !0,
      inst: e,
      continue: !t.abort
    });
  };
}), ig = /* @__PURE__ */ Q("$ZodCheckMaxLength", (e, t) => {
  var n;
  xt.init(e, t), (n = e._zod.def).when ?? (n.when = (r) => {
    const a = r.value;
    return !Ai(a) && a.length !== void 0;
  }), e._zod.onattach.push((r) => {
    const a = r._zod.bag.maximum ?? Number.POSITIVE_INFINITY;
    t.maximum < a && (r._zod.bag.maximum = t.maximum);
  }), e._zod.check = (r) => {
    const a = r.value;
    if (a.length <= t.maximum)
      return;
    const s = Pi(a);
    r.issues.push({
      origin: s,
      code: "too_big",
      maximum: t.maximum,
      inclusive: !0,
      input: a,
      inst: e,
      continue: !t.abort
    });
  };
}), sg = /* @__PURE__ */ Q("$ZodCheckMinLength", (e, t) => {
  var n;
  xt.init(e, t), (n = e._zod.def).when ?? (n.when = (r) => {
    const a = r.value;
    return !Ai(a) && a.length !== void 0;
  }), e._zod.onattach.push((r) => {
    const a = r._zod.bag.minimum ?? Number.NEGATIVE_INFINITY;
    t.minimum > a && (r._zod.bag.minimum = t.minimum);
  }), e._zod.check = (r) => {
    const a = r.value;
    if (a.length >= t.minimum)
      return;
    const s = Pi(a);
    r.issues.push({
      origin: s,
      code: "too_small",
      minimum: t.minimum,
      inclusive: !0,
      input: a,
      inst: e,
      continue: !t.abort
    });
  };
}), cg = /* @__PURE__ */ Q("$ZodCheckLengthEquals", (e, t) => {
  var n;
  xt.init(e, t), (n = e._zod.def).when ?? (n.when = (r) => {
    const a = r.value;
    return !Ai(a) && a.length !== void 0;
  }), e._zod.onattach.push((r) => {
    const a = r._zod.bag;
    a.minimum = t.length, a.maximum = t.length, a.length = t.length;
  }), e._zod.check = (r) => {
    const a = r.value, i = a.length;
    if (i === t.length)
      return;
    const s = Pi(a), c = i > t.length;
    r.issues.push({
      origin: s,
      ...c ? { code: "too_big", maximum: t.length } : { code: "too_small", minimum: t.length },
      inclusive: !0,
      exact: !0,
      input: r.value,
      inst: e,
      continue: !t.abort
    });
  };
}), Fo = /* @__PURE__ */ Q("$ZodCheckStringFormat", (e, t) => {
  var n, r;
  xt.init(e, t), e._zod.onattach.push((a) => {
    const i = a._zod.bag;
    i.format = t.format, t.pattern && (i.patterns ?? (i.patterns = /* @__PURE__ */ new Set()), i.patterns.add(t.pattern));
  }), t.pattern ? (n = e._zod).check ?? (n.check = (a) => {
    t.pattern.lastIndex = 0, !t.pattern.test(a.value) && a.issues.push({
      origin: "string",
      code: "invalid_format",
      format: t.format,
      input: a.value,
      ...t.pattern ? { pattern: t.pattern.toString() } : {},
      inst: e,
      continue: !t.abort
    });
  }) : (r = e._zod).check ?? (r.check = () => {
  });
}), lg = /* @__PURE__ */ Q("$ZodCheckRegex", (e, t) => {
  Fo.init(e, t), e._zod.check = (n) => {
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
}), dg = /* @__PURE__ */ Q("$ZodCheckLowerCase", (e, t) => {
  t.pattern ?? (t.pattern = ng), Fo.init(e, t);
}), ug = /* @__PURE__ */ Q("$ZodCheckUpperCase", (e, t) => {
  t.pattern ?? (t.pattern = rg), Fo.init(e, t);
}), mg = /* @__PURE__ */ Q("$ZodCheckIncludes", (e, t) => {
  xt.init(e, t);
  const n = Lo(t.includes), r = new RegExp(typeof t.position == "number" ? `^.{${t.position}}${n}` : n);
  t.pattern = r, e._zod.onattach.push((a) => {
    const i = a._zod.bag;
    i.patterns ?? (i.patterns = /* @__PURE__ */ new Set()), i.patterns.add(r);
  }), e._zod.check = (a) => {
    a.value.includes(t.includes, t.position) || a.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "includes",
      includes: t.includes,
      input: a.value,
      inst: e,
      continue: !t.abort
    });
  };
}), pg = /* @__PURE__ */ Q("$ZodCheckStartsWith", (e, t) => {
  xt.init(e, t);
  const n = new RegExp(`^${Lo(t.prefix)}.*`);
  t.pattern ?? (t.pattern = n), e._zod.onattach.push((r) => {
    const a = r._zod.bag;
    a.patterns ?? (a.patterns = /* @__PURE__ */ new Set()), a.patterns.add(n);
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
}), fg = /* @__PURE__ */ Q("$ZodCheckEndsWith", (e, t) => {
  xt.init(e, t);
  const n = new RegExp(`.*${Lo(t.suffix)}$`);
  t.pattern ?? (t.pattern = n), e._zod.onattach.push((r) => {
    const a = r._zod.bag;
    a.patterns ?? (a.patterns = /* @__PURE__ */ new Set()), a.patterns.add(n);
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
}), hg = /* @__PURE__ */ Q("$ZodCheckOverwrite", (e, t) => {
  xt.init(e, t), e._zod.check = (n) => {
    n.value = t.tx(n.value);
  };
});
class gg {
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
`).filter((s) => s), a = Math.min(...r.map((s) => s.length - s.trimStart().length)), i = r.map((s) => s.slice(a)).map((s) => " ".repeat(this.indent * 2) + s);
    for (const s of i)
      this.content.push(s);
  }
  compile() {
    const t = Function, n = this?.args, a = [...(this?.content ?? [""]).map((i) => `  ${i}`)];
    return new t(...n, a.join(`
`));
  }
}
const yg = {
  major: 4,
  minor: 3,
  patch: 6
}, Ke = /* @__PURE__ */ Q("$ZodType", (e, t) => {
  var n;
  e ?? (e = {}), e._zod.def = t, e._zod.bag = e._zod.bag || {}, e._zod.version = yg;
  const r = [...e._zod.def.checks ?? []];
  e._zod.traits.has("$ZodCheck") && r.unshift(e);
  for (const a of r)
    for (const i of a._zod.onattach)
      i(e);
  if (r.length === 0)
    (n = e._zod).deferred ?? (n.deferred = []), e._zod.deferred?.push(() => {
      e._zod.run = e._zod.parse;
    });
  else {
    const a = (s, c, l) => {
      let u = Qn(s), p;
      for (const m of c) {
        if (m._zod.def.when) {
          if (!m._zod.def.when(s))
            continue;
        } else if (u)
          continue;
        const h = s.issues.length, g = m._zod.check(s);
        if (g instanceof Promise && l?.async === !1)
          throw new Yn();
        if (p || g instanceof Promise)
          p = (p ?? Promise.resolve()).then(async () => {
            await g, s.issues.length !== h && (u || (u = Qn(s, h)));
          });
        else {
          if (s.issues.length === h)
            continue;
          u || (u = Qn(s, h));
        }
      }
      return p ? p.then(() => s) : s;
    }, i = (s, c, l) => {
      if (Qn(s))
        return s.aborted = !0, s;
      const u = a(c, r, l);
      if (u instanceof Promise) {
        if (l.async === !1)
          throw new Yn();
        return u.then((p) => e._zod.parse(p, l));
      }
      return e._zod.parse(u, l);
    };
    e._zod.run = (s, c) => {
      if (c.skipChecks)
        return e._zod.parse(s, c);
      if (c.direction === "backward") {
        const u = e._zod.parse({ value: s.value, issues: [] }, { ...c, skipChecks: !0 });
        return u instanceof Promise ? u.then((p) => i(p, s, c)) : i(u, s, c);
      }
      const l = e._zod.parse(s, c);
      if (l instanceof Promise) {
        if (c.async === !1)
          throw new Yn();
        return l.then((u) => a(u, r, c));
      }
      return a(l, r, c);
    };
  }
  Ee(e, "~standard", () => ({
    validate: (a) => {
      try {
        const i = kh(e, a);
        return i.success ? { value: i.data } : { issues: i.error?.issues };
      } catch {
        return Sh(e, a).then((s) => s.success ? { value: s.data } : { issues: s.error?.issues });
      }
    },
    vendor: "zod",
    version: 1
  }));
}), Ri = /* @__PURE__ */ Q("$ZodString", (e, t) => {
  Ke.init(e, t), e._zod.pattern = [...e?._zod.bag?.patterns ?? []].pop() ?? Xh(e._zod.bag), e._zod.parse = (n, r) => {
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
}), ze = /* @__PURE__ */ Q("$ZodStringFormat", (e, t) => {
  Fo.init(e, t), Ri.init(e, t);
}), vg = /* @__PURE__ */ Q("$ZodGUID", (e, t) => {
  t.pattern ?? (t.pattern = Bh), ze.init(e, t);
}), bg = /* @__PURE__ */ Q("$ZodUUID", (e, t) => {
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
    t.pattern ?? (t.pattern = Ys(r));
  } else
    t.pattern ?? (t.pattern = Ys());
  ze.init(e, t);
}), wg = /* @__PURE__ */ Q("$ZodEmail", (e, t) => {
  t.pattern ?? (t.pattern = jh), ze.init(e, t);
}), _g = /* @__PURE__ */ Q("$ZodURL", (e, t) => {
  ze.init(e, t), e._zod.check = (n) => {
    try {
      const r = n.value.trim(), a = new URL(r);
      t.hostname && (t.hostname.lastIndex = 0, t.hostname.test(a.hostname) || n.issues.push({
        code: "invalid_format",
        format: "url",
        note: "Invalid hostname",
        pattern: t.hostname.source,
        input: n.value,
        inst: e,
        continue: !t.abort
      })), t.protocol && (t.protocol.lastIndex = 0, t.protocol.test(a.protocol.endsWith(":") ? a.protocol.slice(0, -1) : a.protocol) || n.issues.push({
        code: "invalid_format",
        format: "url",
        note: "Invalid protocol",
        pattern: t.protocol.source,
        input: n.value,
        inst: e,
        continue: !t.abort
      })), t.normalize ? n.value = a.href : n.value = r;
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
}), xg = /* @__PURE__ */ Q("$ZodEmoji", (e, t) => {
  t.pattern ?? (t.pattern = Wh()), ze.init(e, t);
}), kg = /* @__PURE__ */ Q("$ZodNanoID", (e, t) => {
  t.pattern ?? (t.pattern = zh), ze.init(e, t);
}), Sg = /* @__PURE__ */ Q("$ZodCUID", (e, t) => {
  t.pattern ?? (t.pattern = Oh), ze.init(e, t);
}), Cg = /* @__PURE__ */ Q("$ZodCUID2", (e, t) => {
  t.pattern ?? (t.pattern = Mh), ze.init(e, t);
}), Ng = /* @__PURE__ */ Q("$ZodULID", (e, t) => {
  t.pattern ?? (t.pattern = Dh), ze.init(e, t);
}), Ag = /* @__PURE__ */ Q("$ZodXID", (e, t) => {
  t.pattern ?? (t.pattern = Lh), ze.init(e, t);
}), Tg = /* @__PURE__ */ Q("$ZodKSUID", (e, t) => {
  t.pattern ?? (t.pattern = $h), ze.init(e, t);
}), Pg = /* @__PURE__ */ Q("$ZodISODateTime", (e, t) => {
  t.pattern ?? (t.pattern = Jh(t)), ze.init(e, t);
}), Eg = /* @__PURE__ */ Q("$ZodISODate", (e, t) => {
  t.pattern ?? (t.pattern = Yh), ze.init(e, t);
}), Ig = /* @__PURE__ */ Q("$ZodISOTime", (e, t) => {
  t.pattern ?? (t.pattern = Kh(t)), ze.init(e, t);
}), Rg = /* @__PURE__ */ Q("$ZodISODuration", (e, t) => {
  t.pattern ?? (t.pattern = Fh), ze.init(e, t);
}), Og = /* @__PURE__ */ Q("$ZodIPv4", (e, t) => {
  t.pattern ?? (t.pattern = Vh), ze.init(e, t), e._zod.bag.format = "ipv4";
}), Mg = /* @__PURE__ */ Q("$ZodIPv6", (e, t) => {
  t.pattern ?? (t.pattern = Hh), ze.init(e, t), e._zod.bag.format = "ipv6", e._zod.check = (n) => {
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
}), Dg = /* @__PURE__ */ Q("$ZodCIDRv4", (e, t) => {
  t.pattern ?? (t.pattern = qh), ze.init(e, t);
}), Lg = /* @__PURE__ */ Q("$ZodCIDRv6", (e, t) => {
  t.pattern ?? (t.pattern = Zh), ze.init(e, t), e._zod.check = (n) => {
    const r = n.value.split("/");
    try {
      if (r.length !== 2)
        throw new Error();
      const [a, i] = r;
      if (!i)
        throw new Error();
      const s = Number(i);
      if (`${s}` !== i)
        throw new Error();
      if (s < 0 || s > 128)
        throw new Error();
      new URL(`http://[${a}]`);
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
function ql(e) {
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
const $g = /* @__PURE__ */ Q("$ZodBase64", (e, t) => {
  t.pattern ?? (t.pattern = Gh), ze.init(e, t), e._zod.bag.contentEncoding = "base64", e._zod.check = (n) => {
    ql(n.value) || n.issues.push({
      code: "invalid_format",
      format: "base64",
      input: n.value,
      inst: e,
      continue: !t.abort
    });
  };
});
function zg(e) {
  if (!Bl.test(e))
    return !1;
  const t = e.replace(/[-_]/g, (r) => r === "-" ? "+" : "/"), n = t.padEnd(Math.ceil(t.length / 4) * 4, "=");
  return ql(n);
}
const Fg = /* @__PURE__ */ Q("$ZodBase64URL", (e, t) => {
  t.pattern ?? (t.pattern = Bl), ze.init(e, t), e._zod.bag.contentEncoding = "base64url", e._zod.check = (n) => {
    zg(n.value) || n.issues.push({
      code: "invalid_format",
      format: "base64url",
      input: n.value,
      inst: e,
      continue: !t.abort
    });
  };
}), Bg = /* @__PURE__ */ Q("$ZodE164", (e, t) => {
  t.pattern ?? (t.pattern = Qh), ze.init(e, t);
});
function jg(e, t = null) {
  try {
    const n = e.split(".");
    if (n.length !== 3)
      return !1;
    const [r] = n;
    if (!r)
      return !1;
    const a = JSON.parse(atob(r));
    return !("typ" in a && a?.typ !== "JWT" || !a.alg || t && (!("alg" in a) || a.alg !== t));
  } catch {
    return !1;
  }
}
const Ug = /* @__PURE__ */ Q("$ZodJWT", (e, t) => {
  ze.init(e, t), e._zod.check = (n) => {
    jg(n.value, t.alg) || n.issues.push({
      code: "invalid_format",
      format: "jwt",
      input: n.value,
      inst: e,
      continue: !t.abort
    });
  };
}), Zl = /* @__PURE__ */ Q("$ZodNumber", (e, t) => {
  Ke.init(e, t), e._zod.pattern = e._zod.bag.pattern ?? tg, e._zod.parse = (n, r) => {
    if (t.coerce)
      try {
        n.value = Number(n.value);
      } catch {
      }
    const a = n.value;
    if (typeof a == "number" && !Number.isNaN(a) && Number.isFinite(a))
      return n;
    const i = typeof a == "number" ? Number.isNaN(a) ? "NaN" : Number.isFinite(a) ? void 0 : "Infinity" : void 0;
    return n.issues.push({
      expected: "number",
      code: "invalid_type",
      input: a,
      inst: e,
      ...i ? { received: i } : {}
    }), n;
  };
}), Wg = /* @__PURE__ */ Q("$ZodNumberFormat", (e, t) => {
  ag.init(e, t), Zl.init(e, t);
}), Vg = /* @__PURE__ */ Q("$ZodUnknown", (e, t) => {
  Ke.init(e, t), e._zod.parse = (n) => n;
}), Hg = /* @__PURE__ */ Q("$ZodNever", (e, t) => {
  Ke.init(e, t), e._zod.parse = (n, r) => (n.issues.push({
    expected: "never",
    code: "invalid_type",
    input: n.value,
    inst: e
  }), n);
});
function Ks(e, t, n) {
  e.issues.length && t.issues.push(...Ll(n, e.issues)), t.value[n] = e.value;
}
const qg = /* @__PURE__ */ Q("$ZodArray", (e, t) => {
  Ke.init(e, t), e._zod.parse = (n, r) => {
    const a = n.value;
    if (!Array.isArray(a))
      return n.issues.push({
        expected: "array",
        code: "invalid_type",
        input: a,
        inst: e
      }), n;
    n.value = Array(a.length);
    const i = [];
    for (let s = 0; s < a.length; s++) {
      const c = a[s], l = t.element._zod.run({
        value: c,
        issues: []
      }, r);
      l instanceof Promise ? i.push(l.then((u) => Ks(u, n, s))) : Ks(l, n, s);
    }
    return i.length ? Promise.all(i).then(() => n) : n;
  };
});
function ho(e, t, n, r, a) {
  if (e.issues.length) {
    if (a && !(n in r))
      return;
    t.issues.push(...Ll(n, e.issues));
  }
  e.value === void 0 ? n in r && (t.value[n] = void 0) : t.value[n] = e.value;
}
function Gl(e) {
  const t = Object.keys(e.shape);
  for (const r of t)
    if (!e.shape?.[r]?._zod?.traits?.has("$ZodType"))
      throw new Error(`Invalid element at key "${r}": expected a Zod schema`);
  const n = mh(e.shape);
  return {
    ...e,
    keys: t,
    keySet: new Set(t),
    numKeys: t.length,
    optionalKeys: new Set(n)
  };
}
function Ql(e, t, n, r, a, i) {
  const s = [], c = a.keySet, l = a.catchall._zod, u = l.def.type, p = l.optout === "optional";
  for (const m in t) {
    if (c.has(m))
      continue;
    if (u === "never") {
      s.push(m);
      continue;
    }
    const h = l.run({ value: t[m], issues: [] }, r);
    h instanceof Promise ? e.push(h.then((g) => ho(g, n, m, t, p))) : ho(h, n, m, t, p);
  }
  return s.length && n.issues.push({
    code: "unrecognized_keys",
    keys: s,
    input: t,
    inst: i
  }), e.length ? Promise.all(e).then(() => n) : n;
}
const Zg = /* @__PURE__ */ Q("$ZodObject", (e, t) => {
  if (Ke.init(e, t), !Object.getOwnPropertyDescriptor(t, "shape")?.get) {
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
  const r = Ni(() => Gl(t));
  Ee(e._zod, "propValues", () => {
    const c = t.shape, l = {};
    for (const u in c) {
      const p = c[u]._zod;
      if (p.values) {
        l[u] ?? (l[u] = /* @__PURE__ */ new Set());
        for (const m of p.values)
          l[u].add(m);
      }
    }
    return l;
  });
  const a = fo, i = t.catchall;
  let s;
  e._zod.parse = (c, l) => {
    s ?? (s = r.value);
    const u = c.value;
    if (!a(u))
      return c.issues.push({
        expected: "object",
        code: "invalid_type",
        input: u,
        inst: e
      }), c;
    c.value = {};
    const p = [], m = s.shape;
    for (const h of s.keys) {
      const g = m[h], v = g._zod.optout === "optional", f = g._zod.run({ value: u[h], issues: [] }, l);
      f instanceof Promise ? p.push(f.then((b) => ho(b, c, h, u, v))) : ho(f, c, h, u, v);
    }
    return i ? Ql(p, u, c, l, r.value, e) : p.length ? Promise.all(p).then(() => c) : c;
  };
}), Gg = /* @__PURE__ */ Q("$ZodObjectJIT", (e, t) => {
  Zg.init(e, t);
  const n = e._zod.parse, r = Ni(() => Gl(t)), a = (h) => {
    const g = new gg(["shape", "payload", "ctx"]), v = r.value, f = (_) => {
      const x = Qs(_);
      return `shape[${x}]._zod.run({ value: input[${x}], issues: [] }, ctx)`;
    };
    g.write("const input = payload.value;");
    const b = /* @__PURE__ */ Object.create(null);
    let k = 0;
    for (const _ of v.keys)
      b[_] = `key_${k++}`;
    g.write("const newResult = {};");
    for (const _ of v.keys) {
      const x = b[_], N = Qs(_), S = h[_]?._zod?.optout === "optional";
      g.write(`const ${x} = ${f(_)};`), S ? g.write(`
        if (${x}.issues.length) {
          if (${N} in input) {
            payload.issues = payload.issues.concat(${x}.issues.map(iss => ({
              ...iss,
              path: iss.path ? [${N}, ...iss.path] : [${N}]
            })));
          }
        }
        
        if (${x}.value === undefined) {
          if (${N} in input) {
            newResult[${N}] = undefined;
          }
        } else {
          newResult[${N}] = ${x}.value;
        }
        
      `) : g.write(`
        if (${x}.issues.length) {
          payload.issues = payload.issues.concat(${x}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${N}, ...iss.path] : [${N}]
          })));
        }
        
        if (${x}.value === undefined) {
          if (${N} in input) {
            newResult[${N}] = undefined;
          }
        } else {
          newResult[${N}] = ${x}.value;
        }
        
      `);
    }
    g.write("payload.value = newResult;"), g.write("return payload;");
    const w = g.compile();
    return (_, x) => w(h, _, x);
  };
  let i;
  const s = fo, c = !Rl.jitless, u = c && dh.value, p = t.catchall;
  let m;
  e._zod.parse = (h, g) => {
    m ?? (m = r.value);
    const v = h.value;
    return s(v) ? c && u && g?.async === !1 && g.jitless !== !0 ? (i || (i = a(t.shape)), h = i(h, g), p ? Ql([], v, h, g, m, e) : h) : n(h, g) : (h.issues.push({
      expected: "object",
      code: "invalid_type",
      input: v,
      inst: e
    }), h);
  };
});
function Js(e, t, n, r) {
  for (const i of e)
    if (i.issues.length === 0)
      return t.value = i.value, t;
  const a = e.filter((i) => !Qn(i));
  return a.length === 1 ? (t.value = a[0].value, a[0]) : (t.issues.push({
    code: "invalid_union",
    input: t.value,
    inst: n,
    errors: e.map((i) => i.issues.map((s) => En(s, r, Pn())))
  }), t);
}
const Qg = /* @__PURE__ */ Q("$ZodUnion", (e, t) => {
  Ke.init(e, t), Ee(e._zod, "optin", () => t.options.some((a) => a._zod.optin === "optional") ? "optional" : void 0), Ee(e._zod, "optout", () => t.options.some((a) => a._zod.optout === "optional") ? "optional" : void 0), Ee(e._zod, "values", () => {
    if (t.options.every((a) => a._zod.values))
      return new Set(t.options.flatMap((a) => Array.from(a._zod.values)));
  }), Ee(e._zod, "pattern", () => {
    if (t.options.every((a) => a._zod.pattern)) {
      const a = t.options.map((i) => i._zod.pattern);
      return new RegExp(`^(${a.map((i) => Ti(i.source)).join("|")})$`);
    }
  });
  const n = t.options.length === 1, r = t.options[0]._zod.run;
  e._zod.parse = (a, i) => {
    if (n)
      return r(a, i);
    let s = !1;
    const c = [];
    for (const l of t.options) {
      const u = l._zod.run({
        value: a.value,
        issues: []
      }, i);
      if (u instanceof Promise)
        c.push(u), s = !0;
      else {
        if (u.issues.length === 0)
          return u;
        c.push(u);
      }
    }
    return s ? Promise.all(c).then((l) => Js(l, a, e, i)) : Js(c, a, e, i);
  };
}), Yg = /* @__PURE__ */ Q("$ZodIntersection", (e, t) => {
  Ke.init(e, t), e._zod.parse = (n, r) => {
    const a = n.value, i = t.left._zod.run({ value: a, issues: [] }, r), s = t.right._zod.run({ value: a, issues: [] }, r);
    return i instanceof Promise || s instanceof Promise ? Promise.all([i, s]).then(([l, u]) => Xs(n, l, u)) : Xs(n, i, s);
  };
});
function ei(e, t) {
  if (e === t)
    return { valid: !0, data: e };
  if (e instanceof Date && t instanceof Date && +e == +t)
    return { valid: !0, data: e };
  if (Tr(e) && Tr(t)) {
    const n = Object.keys(t), r = Object.keys(e).filter((i) => n.indexOf(i) !== -1), a = { ...e, ...t };
    for (const i of r) {
      const s = ei(e[i], t[i]);
      if (!s.valid)
        return {
          valid: !1,
          mergeErrorPath: [i, ...s.mergeErrorPath]
        };
      a[i] = s.data;
    }
    return { valid: !0, data: a };
  }
  if (Array.isArray(e) && Array.isArray(t)) {
    if (e.length !== t.length)
      return { valid: !1, mergeErrorPath: [] };
    const n = [];
    for (let r = 0; r < e.length; r++) {
      const a = e[r], i = t[r], s = ei(a, i);
      if (!s.valid)
        return {
          valid: !1,
          mergeErrorPath: [r, ...s.mergeErrorPath]
        };
      n.push(s.data);
    }
    return { valid: !0, data: n };
  }
  return { valid: !1, mergeErrorPath: [] };
}
function Xs(e, t, n) {
  const r = /* @__PURE__ */ new Map();
  let a;
  for (const c of t.issues)
    if (c.code === "unrecognized_keys") {
      a ?? (a = c);
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
  const i = [...r].filter(([, c]) => c.l && c.r).map(([c]) => c);
  if (i.length && a && e.issues.push({ ...a, keys: i }), Qn(e))
    return e;
  const s = ei(t.value, n.value);
  if (!s.valid)
    throw new Error(`Unmergable intersection. Error path: ${JSON.stringify(s.mergeErrorPath)}`);
  return e.value = s.data, e;
}
const Kg = /* @__PURE__ */ Q("$ZodEnum", (e, t) => {
  Ke.init(e, t);
  const n = Ol(t.entries), r = new Set(n);
  e._zod.values = r, e._zod.pattern = new RegExp(`^(${n.filter((a) => uh.has(typeof a)).map((a) => typeof a == "string" ? Lo(a) : a.toString()).join("|")})$`), e._zod.parse = (a, i) => {
    const s = a.value;
    return r.has(s) || a.issues.push({
      code: "invalid_value",
      values: n,
      input: s,
      inst: e
    }), a;
  };
}), Jg = /* @__PURE__ */ Q("$ZodTransform", (e, t) => {
  Ke.init(e, t), e._zod.parse = (n, r) => {
    if (r.direction === "backward")
      throw new Il(e.constructor.name);
    const a = t.transform(n.value, n);
    if (r.async)
      return (a instanceof Promise ? a : Promise.resolve(a)).then((s) => (n.value = s, n));
    if (a instanceof Promise)
      throw new Yn();
    return n.value = a, n;
  };
});
function ec(e, t) {
  return e.issues.length && t === void 0 ? { issues: [], value: void 0 } : e;
}
const Yl = /* @__PURE__ */ Q("$ZodOptional", (e, t) => {
  Ke.init(e, t), e._zod.optin = "optional", e._zod.optout = "optional", Ee(e._zod, "values", () => t.innerType._zod.values ? /* @__PURE__ */ new Set([...t.innerType._zod.values, void 0]) : void 0), Ee(e._zod, "pattern", () => {
    const n = t.innerType._zod.pattern;
    return n ? new RegExp(`^(${Ti(n.source)})?$`) : void 0;
  }), e._zod.parse = (n, r) => {
    if (t.innerType._zod.optin === "optional") {
      const a = t.innerType._zod.run(n, r);
      return a instanceof Promise ? a.then((i) => ec(i, n.value)) : ec(a, n.value);
    }
    return n.value === void 0 ? n : t.innerType._zod.run(n, r);
  };
}), Xg = /* @__PURE__ */ Q("$ZodExactOptional", (e, t) => {
  Yl.init(e, t), Ee(e._zod, "values", () => t.innerType._zod.values), Ee(e._zod, "pattern", () => t.innerType._zod.pattern), e._zod.parse = (n, r) => t.innerType._zod.run(n, r);
}), ey = /* @__PURE__ */ Q("$ZodNullable", (e, t) => {
  Ke.init(e, t), Ee(e._zod, "optin", () => t.innerType._zod.optin), Ee(e._zod, "optout", () => t.innerType._zod.optout), Ee(e._zod, "pattern", () => {
    const n = t.innerType._zod.pattern;
    return n ? new RegExp(`^(${Ti(n.source)}|null)$`) : void 0;
  }), Ee(e._zod, "values", () => t.innerType._zod.values ? /* @__PURE__ */ new Set([...t.innerType._zod.values, null]) : void 0), e._zod.parse = (n, r) => n.value === null ? n : t.innerType._zod.run(n, r);
}), ty = /* @__PURE__ */ Q("$ZodDefault", (e, t) => {
  Ke.init(e, t), e._zod.optin = "optional", Ee(e._zod, "values", () => t.innerType._zod.values), e._zod.parse = (n, r) => {
    if (r.direction === "backward")
      return t.innerType._zod.run(n, r);
    if (n.value === void 0)
      return n.value = t.defaultValue, n;
    const a = t.innerType._zod.run(n, r);
    return a instanceof Promise ? a.then((i) => tc(i, t)) : tc(a, t);
  };
});
function tc(e, t) {
  return e.value === void 0 && (e.value = t.defaultValue), e;
}
const ny = /* @__PURE__ */ Q("$ZodPrefault", (e, t) => {
  Ke.init(e, t), e._zod.optin = "optional", Ee(e._zod, "values", () => t.innerType._zod.values), e._zod.parse = (n, r) => (r.direction === "backward" || n.value === void 0 && (n.value = t.defaultValue), t.innerType._zod.run(n, r));
}), ry = /* @__PURE__ */ Q("$ZodNonOptional", (e, t) => {
  Ke.init(e, t), Ee(e._zod, "values", () => {
    const n = t.innerType._zod.values;
    return n ? new Set([...n].filter((r) => r !== void 0)) : void 0;
  }), e._zod.parse = (n, r) => {
    const a = t.innerType._zod.run(n, r);
    return a instanceof Promise ? a.then((i) => nc(i, e)) : nc(a, e);
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
const oy = /* @__PURE__ */ Q("$ZodCatch", (e, t) => {
  Ke.init(e, t), Ee(e._zod, "optin", () => t.innerType._zod.optin), Ee(e._zod, "optout", () => t.innerType._zod.optout), Ee(e._zod, "values", () => t.innerType._zod.values), e._zod.parse = (n, r) => {
    if (r.direction === "backward")
      return t.innerType._zod.run(n, r);
    const a = t.innerType._zod.run(n, r);
    return a instanceof Promise ? a.then((i) => (n.value = i.value, i.issues.length && (n.value = t.catchValue({
      ...n,
      error: {
        issues: i.issues.map((s) => En(s, r, Pn()))
      },
      input: n.value
    }), n.issues = []), n)) : (n.value = a.value, a.issues.length && (n.value = t.catchValue({
      ...n,
      error: {
        issues: a.issues.map((i) => En(i, r, Pn()))
      },
      input: n.value
    }), n.issues = []), n);
  };
}), ay = /* @__PURE__ */ Q("$ZodPipe", (e, t) => {
  Ke.init(e, t), Ee(e._zod, "values", () => t.in._zod.values), Ee(e._zod, "optin", () => t.in._zod.optin), Ee(e._zod, "optout", () => t.out._zod.optout), Ee(e._zod, "propValues", () => t.in._zod.propValues), e._zod.parse = (n, r) => {
    if (r.direction === "backward") {
      const i = t.out._zod.run(n, r);
      return i instanceof Promise ? i.then((s) => qr(s, t.in, r)) : qr(i, t.in, r);
    }
    const a = t.in._zod.run(n, r);
    return a instanceof Promise ? a.then((i) => qr(i, t.out, r)) : qr(a, t.out, r);
  };
});
function qr(e, t, n) {
  return e.issues.length ? (e.aborted = !0, e) : t._zod.run({ value: e.value, issues: e.issues }, n);
}
const iy = /* @__PURE__ */ Q("$ZodReadonly", (e, t) => {
  Ke.init(e, t), Ee(e._zod, "propValues", () => t.innerType._zod.propValues), Ee(e._zod, "values", () => t.innerType._zod.values), Ee(e._zod, "optin", () => t.innerType?._zod?.optin), Ee(e._zod, "optout", () => t.innerType?._zod?.optout), e._zod.parse = (n, r) => {
    if (r.direction === "backward")
      return t.innerType._zod.run(n, r);
    const a = t.innerType._zod.run(n, r);
    return a instanceof Promise ? a.then(rc) : rc(a);
  };
});
function rc(e) {
  return e.value = Object.freeze(e.value), e;
}
const sy = /* @__PURE__ */ Q("$ZodCustom", (e, t) => {
  xt.init(e, t), Ke.init(e, t), e._zod.parse = (n, r) => n, e._zod.check = (n) => {
    const r = n.value, a = t.fn(r);
    if (a instanceof Promise)
      return a.then((i) => oc(i, n, r, e));
    oc(a, n, r, e);
  };
});
function oc(e, t, n, r) {
  if (!e) {
    const a = {
      code: "custom",
      input: n,
      inst: r,
      // incorporates params.error into issue reporting
      path: [...r._zod.def.path ?? []],
      // incorporates params.error into issue reporting
      continue: !r._zod.def.abort
      // params: inst._zod.def.params,
    };
    r._zod.def.params && (a.params = r._zod.def.params), t.issues.push(Pr(a));
  }
}
var ac;
class cy {
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
      const a = { ...r, ...this._map.get(t) };
      return Object.keys(a).length ? a : void 0;
    }
    return this._map.get(t);
  }
  has(t) {
    return this._map.has(t);
  }
}
function ly() {
  return new cy();
}
(ac = globalThis).__zod_globalRegistry ?? (ac.__zod_globalRegistry = ly());
const _r = globalThis.__zod_globalRegistry;
// @__NO_SIDE_EFFECTS__
function dy(e, t) {
  return new e({
    type: "string",
    ...pe(t)
  });
}
// @__NO_SIDE_EFFECTS__
function uy(e, t) {
  return new e({
    type: "string",
    format: "email",
    check: "string_format",
    abort: !1,
    ...pe(t)
  });
}
// @__NO_SIDE_EFFECTS__
function ic(e, t) {
  return new e({
    type: "string",
    format: "guid",
    check: "string_format",
    abort: !1,
    ...pe(t)
  });
}
// @__NO_SIDE_EFFECTS__
function my(e, t) {
  return new e({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: !1,
    ...pe(t)
  });
}
// @__NO_SIDE_EFFECTS__
function py(e, t) {
  return new e({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: !1,
    version: "v4",
    ...pe(t)
  });
}
// @__NO_SIDE_EFFECTS__
function fy(e, t) {
  return new e({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: !1,
    version: "v6",
    ...pe(t)
  });
}
// @__NO_SIDE_EFFECTS__
function hy(e, t) {
  return new e({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: !1,
    version: "v7",
    ...pe(t)
  });
}
// @__NO_SIDE_EFFECTS__
function gy(e, t) {
  return new e({
    type: "string",
    format: "url",
    check: "string_format",
    abort: !1,
    ...pe(t)
  });
}
// @__NO_SIDE_EFFECTS__
function yy(e, t) {
  return new e({
    type: "string",
    format: "emoji",
    check: "string_format",
    abort: !1,
    ...pe(t)
  });
}
// @__NO_SIDE_EFFECTS__
function vy(e, t) {
  return new e({
    type: "string",
    format: "nanoid",
    check: "string_format",
    abort: !1,
    ...pe(t)
  });
}
// @__NO_SIDE_EFFECTS__
function by(e, t) {
  return new e({
    type: "string",
    format: "cuid",
    check: "string_format",
    abort: !1,
    ...pe(t)
  });
}
// @__NO_SIDE_EFFECTS__
function wy(e, t) {
  return new e({
    type: "string",
    format: "cuid2",
    check: "string_format",
    abort: !1,
    ...pe(t)
  });
}
// @__NO_SIDE_EFFECTS__
function _y(e, t) {
  return new e({
    type: "string",
    format: "ulid",
    check: "string_format",
    abort: !1,
    ...pe(t)
  });
}
// @__NO_SIDE_EFFECTS__
function xy(e, t) {
  return new e({
    type: "string",
    format: "xid",
    check: "string_format",
    abort: !1,
    ...pe(t)
  });
}
// @__NO_SIDE_EFFECTS__
function ky(e, t) {
  return new e({
    type: "string",
    format: "ksuid",
    check: "string_format",
    abort: !1,
    ...pe(t)
  });
}
// @__NO_SIDE_EFFECTS__
function Sy(e, t) {
  return new e({
    type: "string",
    format: "ipv4",
    check: "string_format",
    abort: !1,
    ...pe(t)
  });
}
// @__NO_SIDE_EFFECTS__
function Cy(e, t) {
  return new e({
    type: "string",
    format: "ipv6",
    check: "string_format",
    abort: !1,
    ...pe(t)
  });
}
// @__NO_SIDE_EFFECTS__
function Ny(e, t) {
  return new e({
    type: "string",
    format: "cidrv4",
    check: "string_format",
    abort: !1,
    ...pe(t)
  });
}
// @__NO_SIDE_EFFECTS__
function Ay(e, t) {
  return new e({
    type: "string",
    format: "cidrv6",
    check: "string_format",
    abort: !1,
    ...pe(t)
  });
}
// @__NO_SIDE_EFFECTS__
function Ty(e, t) {
  return new e({
    type: "string",
    format: "base64",
    check: "string_format",
    abort: !1,
    ...pe(t)
  });
}
// @__NO_SIDE_EFFECTS__
function Py(e, t) {
  return new e({
    type: "string",
    format: "base64url",
    check: "string_format",
    abort: !1,
    ...pe(t)
  });
}
// @__NO_SIDE_EFFECTS__
function Ey(e, t) {
  return new e({
    type: "string",
    format: "e164",
    check: "string_format",
    abort: !1,
    ...pe(t)
  });
}
// @__NO_SIDE_EFFECTS__
function Iy(e, t) {
  return new e({
    type: "string",
    format: "jwt",
    check: "string_format",
    abort: !1,
    ...pe(t)
  });
}
// @__NO_SIDE_EFFECTS__
function Ry(e, t) {
  return new e({
    type: "string",
    format: "datetime",
    check: "string_format",
    offset: !1,
    local: !1,
    precision: null,
    ...pe(t)
  });
}
// @__NO_SIDE_EFFECTS__
function Oy(e, t) {
  return new e({
    type: "string",
    format: "date",
    check: "string_format",
    ...pe(t)
  });
}
// @__NO_SIDE_EFFECTS__
function My(e, t) {
  return new e({
    type: "string",
    format: "time",
    check: "string_format",
    precision: null,
    ...pe(t)
  });
}
// @__NO_SIDE_EFFECTS__
function Dy(e, t) {
  return new e({
    type: "string",
    format: "duration",
    check: "string_format",
    ...pe(t)
  });
}
// @__NO_SIDE_EFFECTS__
function Ly(e, t) {
  return new e({
    type: "number",
    checks: [],
    ...pe(t)
  });
}
// @__NO_SIDE_EFFECTS__
function $y(e, t) {
  return new e({
    type: "number",
    check: "number_format",
    abort: !1,
    format: "safeint",
    ...pe(t)
  });
}
// @__NO_SIDE_EFFECTS__
function zy(e) {
  return new e({
    type: "unknown"
  });
}
// @__NO_SIDE_EFFECTS__
function Fy(e, t) {
  return new e({
    type: "never",
    ...pe(t)
  });
}
// @__NO_SIDE_EFFECTS__
function sc(e, t) {
  return new Vl({
    check: "less_than",
    ...pe(t),
    value: e,
    inclusive: !1
  });
}
// @__NO_SIDE_EFFECTS__
function Ta(e, t) {
  return new Vl({
    check: "less_than",
    ...pe(t),
    value: e,
    inclusive: !0
  });
}
// @__NO_SIDE_EFFECTS__
function cc(e, t) {
  return new Hl({
    check: "greater_than",
    ...pe(t),
    value: e,
    inclusive: !1
  });
}
// @__NO_SIDE_EFFECTS__
function Pa(e, t) {
  return new Hl({
    check: "greater_than",
    ...pe(t),
    value: e,
    inclusive: !0
  });
}
// @__NO_SIDE_EFFECTS__
function lc(e, t) {
  return new og({
    check: "multiple_of",
    ...pe(t),
    value: e
  });
}
// @__NO_SIDE_EFFECTS__
function Kl(e, t) {
  return new ig({
    check: "max_length",
    ...pe(t),
    maximum: e
  });
}
// @__NO_SIDE_EFFECTS__
function go(e, t) {
  return new sg({
    check: "min_length",
    ...pe(t),
    minimum: e
  });
}
// @__NO_SIDE_EFFECTS__
function Jl(e, t) {
  return new cg({
    check: "length_equals",
    ...pe(t),
    length: e
  });
}
// @__NO_SIDE_EFFECTS__
function By(e, t) {
  return new lg({
    check: "string_format",
    format: "regex",
    ...pe(t),
    pattern: e
  });
}
// @__NO_SIDE_EFFECTS__
function jy(e) {
  return new dg({
    check: "string_format",
    format: "lowercase",
    ...pe(e)
  });
}
// @__NO_SIDE_EFFECTS__
function Uy(e) {
  return new ug({
    check: "string_format",
    format: "uppercase",
    ...pe(e)
  });
}
// @__NO_SIDE_EFFECTS__
function Wy(e, t) {
  return new mg({
    check: "string_format",
    format: "includes",
    ...pe(t),
    includes: e
  });
}
// @__NO_SIDE_EFFECTS__
function Vy(e, t) {
  return new pg({
    check: "string_format",
    format: "starts_with",
    ...pe(t),
    prefix: e
  });
}
// @__NO_SIDE_EFFECTS__
function Hy(e, t) {
  return new fg({
    check: "string_format",
    format: "ends_with",
    ...pe(t),
    suffix: e
  });
}
// @__NO_SIDE_EFFECTS__
function or(e) {
  return new hg({
    check: "overwrite",
    tx: e
  });
}
// @__NO_SIDE_EFFECTS__
function qy(e) {
  return /* @__PURE__ */ or((t) => t.normalize(e));
}
// @__NO_SIDE_EFFECTS__
function Zy() {
  return /* @__PURE__ */ or((e) => e.trim());
}
// @__NO_SIDE_EFFECTS__
function Gy() {
  return /* @__PURE__ */ or((e) => e.toLowerCase());
}
// @__NO_SIDE_EFFECTS__
function Qy() {
  return /* @__PURE__ */ or((e) => e.toUpperCase());
}
// @__NO_SIDE_EFFECTS__
function Yy() {
  return /* @__PURE__ */ or((e) => lh(e));
}
// @__NO_SIDE_EFFECTS__
function Ky(e, t, n) {
  return new e({
    type: "array",
    element: t,
    // get element() {
    //   return element;
    // },
    ...pe(n)
  });
}
// @__NO_SIDE_EFFECTS__
function Jy(e, t, n) {
  return new e({
    type: "custom",
    check: "custom",
    fn: t,
    ...pe(n)
  });
}
// @__NO_SIDE_EFFECTS__
function Xy(e) {
  const t = /* @__PURE__ */ ev((n) => (n.addIssue = (r) => {
    if (typeof r == "string")
      n.issues.push(Pr(r, n.value, t._zod.def));
    else {
      const a = r;
      a.fatal && (a.continue = !1), a.code ?? (a.code = "custom"), a.input ?? (a.input = n.value), a.inst ?? (a.inst = t), a.continue ?? (a.continue = !t._zod.def.abort), n.issues.push(Pr(a));
    }
  }, e(n.value, n)));
  return t;
}
// @__NO_SIDE_EFFECTS__
function ev(e, t) {
  const n = new xt({
    check: "custom",
    ...pe(t)
  });
  return n._zod.check = e, n;
}
function Xl(e) {
  let t = e?.target ?? "draft-2020-12";
  return t === "draft-4" && (t = "draft-04"), t === "draft-7" && (t = "draft-07"), {
    processors: e.processors ?? {},
    metadataRegistry: e?.metadata ?? _r,
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
function at(e, t, n = { path: [], schemaPath: [] }) {
  var r;
  const a = e._zod.def, i = t.seen.get(e);
  if (i)
    return i.count++, n.schemaPath.includes(e) && (i.cycle = n.path), i.schema;
  const s = { schema: {}, count: 1, cycle: void 0, path: n.path };
  t.seen.set(e, s);
  const c = e._zod.toJSONSchema?.();
  if (c)
    s.schema = c;
  else {
    const p = {
      ...n,
      schemaPath: [...n.schemaPath, e],
      path: n.path
    };
    if (e._zod.processJSONSchema)
      e._zod.processJSONSchema(t, s.schema, p);
    else {
      const h = s.schema, g = t.processors[a.type];
      if (!g)
        throw new Error(`[toJSONSchema]: Non-representable type encountered: ${a.type}`);
      g(e, t, h, p);
    }
    const m = e._zod.parent;
    m && (s.ref || (s.ref = m), at(m, t, p), t.seen.get(m).isParent = !0);
  }
  const l = t.metadataRegistry.get(e);
  return l && Object.assign(s.schema, l), t.io === "input" && mt(e) && (delete s.schema.examples, delete s.schema.default), t.io === "input" && s.schema._prefault && ((r = s.schema).default ?? (r.default = s.schema._prefault)), delete s.schema._prefault, t.seen.get(e).schema;
}
function ed(e, t) {
  const n = e.seen.get(t);
  if (!n)
    throw new Error("Unprocessed schema. This is a bug in Zod.");
  const r = /* @__PURE__ */ new Map();
  for (const s of e.seen.entries()) {
    const c = e.metadataRegistry.get(s[0])?.id;
    if (c) {
      const l = r.get(c);
      if (l && l !== s[0])
        throw new Error(`Duplicate schema id "${c}" detected during JSON Schema conversion. Two different schemas cannot share the same id when converted together.`);
      r.set(c, s[0]);
    }
  }
  const a = (s) => {
    const c = e.target === "draft-2020-12" ? "$defs" : "definitions";
    if (e.external) {
      const m = e.external.registry.get(s[0])?.id, h = e.external.uri ?? ((v) => v);
      if (m)
        return { ref: h(m) };
      const g = s[1].defId ?? s[1].schema.id ?? `schema${e.counter++}`;
      return s[1].defId = g, { defId: g, ref: `${h("__shared")}#/${c}/${g}` };
    }
    if (s[1] === n)
      return { ref: "#" };
    const u = `#/${c}/`, p = s[1].schema.id ?? `__schema${e.counter++}`;
    return { defId: p, ref: u + p };
  }, i = (s) => {
    if (s[1].schema.$ref)
      return;
    const c = s[1], { ref: l, defId: u } = a(s);
    c.def = { ...c.schema }, u && (c.defId = u);
    const p = c.schema;
    for (const m in p)
      delete p[m];
    p.$ref = l;
  };
  if (e.cycles === "throw")
    for (const s of e.seen.entries()) {
      const c = s[1];
      if (c.cycle)
        throw new Error(`Cycle detected: #/${c.cycle?.join("/")}/<root>

Set the \`cycles\` parameter to \`"ref"\` to resolve cyclical schemas with defs.`);
    }
  for (const s of e.seen.entries()) {
    const c = s[1];
    if (t === s[0]) {
      i(s);
      continue;
    }
    if (e.external) {
      const u = e.external.registry.get(s[0])?.id;
      if (t !== s[0] && u) {
        i(s);
        continue;
      }
    }
    if (e.metadataRegistry.get(s[0])?.id) {
      i(s);
      continue;
    }
    if (c.cycle) {
      i(s);
      continue;
    }
    if (c.count > 1 && e.reused === "ref") {
      i(s);
      continue;
    }
  }
}
function td(e, t) {
  const n = e.seen.get(t);
  if (!n)
    throw new Error("Unprocessed schema. This is a bug in Zod.");
  const r = (s) => {
    const c = e.seen.get(s);
    if (c.ref === null)
      return;
    const l = c.def ?? c.schema, u = { ...l }, p = c.ref;
    if (c.ref = null, p) {
      r(p);
      const h = e.seen.get(p), g = h.schema;
      if (g.$ref && (e.target === "draft-07" || e.target === "draft-04" || e.target === "openapi-3.0") ? (l.allOf = l.allOf ?? [], l.allOf.push(g)) : Object.assign(l, g), Object.assign(l, u), s._zod.parent === p)
        for (const f in l)
          f === "$ref" || f === "allOf" || f in u || delete l[f];
      if (g.$ref && h.def)
        for (const f in l)
          f === "$ref" || f === "allOf" || f in h.def && JSON.stringify(l[f]) === JSON.stringify(h.def[f]) && delete l[f];
    }
    const m = s._zod.parent;
    if (m && m !== p) {
      r(m);
      const h = e.seen.get(m);
      if (h?.schema.$ref && (l.$ref = h.schema.$ref, h.def))
        for (const g in l)
          g === "$ref" || g === "allOf" || g in h.def && JSON.stringify(l[g]) === JSON.stringify(h.def[g]) && delete l[g];
    }
    e.override({
      zodSchema: s,
      jsonSchema: l,
      path: c.path ?? []
    });
  };
  for (const s of [...e.seen.entries()].reverse())
    r(s[0]);
  const a = {};
  if (e.target === "draft-2020-12" ? a.$schema = "https://json-schema.org/draft/2020-12/schema" : e.target === "draft-07" ? a.$schema = "http://json-schema.org/draft-07/schema#" : e.target === "draft-04" ? a.$schema = "http://json-schema.org/draft-04/schema#" : e.target, e.external?.uri) {
    const s = e.external.registry.get(t)?.id;
    if (!s)
      throw new Error("Schema is missing an `id` property");
    a.$id = e.external.uri(s);
  }
  Object.assign(a, n.def ?? n.schema);
  const i = e.external?.defs ?? {};
  for (const s of e.seen.entries()) {
    const c = s[1];
    c.def && c.defId && (i[c.defId] = c.def);
  }
  e.external || Object.keys(i).length > 0 && (e.target === "draft-2020-12" ? a.$defs = i : a.definitions = i);
  try {
    const s = JSON.parse(JSON.stringify(a));
    return Object.defineProperty(s, "~standard", {
      value: {
        ...t["~standard"],
        jsonSchema: {
          input: yo(t, "input", e.processors),
          output: yo(t, "output", e.processors)
        }
      },
      enumerable: !1,
      writable: !1
    }), s;
  } catch {
    throw new Error("Error converting schema to JSON.");
  }
}
function mt(e, t) {
  const n = t ?? { seen: /* @__PURE__ */ new Set() };
  if (n.seen.has(e))
    return !1;
  n.seen.add(e);
  const r = e._zod.def;
  if (r.type === "transform")
    return !0;
  if (r.type === "array")
    return mt(r.element, n);
  if (r.type === "set")
    return mt(r.valueType, n);
  if (r.type === "lazy")
    return mt(r.getter(), n);
  if (r.type === "promise" || r.type === "optional" || r.type === "nonoptional" || r.type === "nullable" || r.type === "readonly" || r.type === "default" || r.type === "prefault")
    return mt(r.innerType, n);
  if (r.type === "intersection")
    return mt(r.left, n) || mt(r.right, n);
  if (r.type === "record" || r.type === "map")
    return mt(r.keyType, n) || mt(r.valueType, n);
  if (r.type === "pipe")
    return mt(r.in, n) || mt(r.out, n);
  if (r.type === "object") {
    for (const a in r.shape)
      if (mt(r.shape[a], n))
        return !0;
    return !1;
  }
  if (r.type === "union") {
    for (const a of r.options)
      if (mt(a, n))
        return !0;
    return !1;
  }
  if (r.type === "tuple") {
    for (const a of r.items)
      if (mt(a, n))
        return !0;
    return !!(r.rest && mt(r.rest, n));
  }
  return !1;
}
const tv = (e, t = {}) => (n) => {
  const r = Xl({ ...n, processors: t });
  return at(e, r), ed(r, e), td(r, e);
}, yo = (e, t, n = {}) => (r) => {
  const { libraryOptions: a, target: i } = r ?? {}, s = Xl({ ...a ?? {}, target: i, io: t, processors: n });
  return at(e, s), ed(s, e), td(s, e);
}, nv = {
  guid: "uuid",
  url: "uri",
  datetime: "date-time",
  json_string: "json-string",
  regex: ""
  // do not set
}, rv = (e, t, n, r) => {
  const a = n;
  a.type = "string";
  const { minimum: i, maximum: s, format: c, patterns: l, contentEncoding: u } = e._zod.bag;
  if (typeof i == "number" && (a.minLength = i), typeof s == "number" && (a.maxLength = s), c && (a.format = nv[c] ?? c, a.format === "" && delete a.format, c === "time" && delete a.format), u && (a.contentEncoding = u), l && l.size > 0) {
    const p = [...l];
    p.length === 1 ? a.pattern = p[0].source : p.length > 1 && (a.allOf = [
      ...p.map((m) => ({
        ...t.target === "draft-07" || t.target === "draft-04" || t.target === "openapi-3.0" ? { type: "string" } : {},
        pattern: m.source
      }))
    ]);
  }
}, ov = (e, t, n, r) => {
  const a = n, { minimum: i, maximum: s, format: c, multipleOf: l, exclusiveMaximum: u, exclusiveMinimum: p } = e._zod.bag;
  typeof c == "string" && c.includes("int") ? a.type = "integer" : a.type = "number", typeof p == "number" && (t.target === "draft-04" || t.target === "openapi-3.0" ? (a.minimum = p, a.exclusiveMinimum = !0) : a.exclusiveMinimum = p), typeof i == "number" && (a.minimum = i, typeof p == "number" && t.target !== "draft-04" && (p >= i ? delete a.minimum : delete a.exclusiveMinimum)), typeof u == "number" && (t.target === "draft-04" || t.target === "openapi-3.0" ? (a.maximum = u, a.exclusiveMaximum = !0) : a.exclusiveMaximum = u), typeof s == "number" && (a.maximum = s, typeof u == "number" && t.target !== "draft-04" && (u <= s ? delete a.maximum : delete a.exclusiveMaximum)), typeof l == "number" && (a.multipleOf = l);
}, av = (e, t, n, r) => {
  n.not = {};
}, iv = (e, t, n, r) => {
}, sv = (e, t, n, r) => {
  const a = e._zod.def, i = Ol(a.entries);
  i.every((s) => typeof s == "number") && (n.type = "number"), i.every((s) => typeof s == "string") && (n.type = "string"), n.enum = i;
}, cv = (e, t, n, r) => {
  if (t.unrepresentable === "throw")
    throw new Error("Custom types cannot be represented in JSON Schema");
}, lv = (e, t, n, r) => {
  if (t.unrepresentable === "throw")
    throw new Error("Transforms cannot be represented in JSON Schema");
}, dv = (e, t, n, r) => {
  const a = n, i = e._zod.def, { minimum: s, maximum: c } = e._zod.bag;
  typeof s == "number" && (a.minItems = s), typeof c == "number" && (a.maxItems = c), a.type = "array", a.items = at(i.element, t, { ...r, path: [...r.path, "items"] });
}, uv = (e, t, n, r) => {
  const a = n, i = e._zod.def;
  a.type = "object", a.properties = {};
  const s = i.shape;
  for (const u in s)
    a.properties[u] = at(s[u], t, {
      ...r,
      path: [...r.path, "properties", u]
    });
  const c = new Set(Object.keys(s)), l = new Set([...c].filter((u) => {
    const p = i.shape[u]._zod;
    return t.io === "input" ? p.optin === void 0 : p.optout === void 0;
  }));
  l.size > 0 && (a.required = Array.from(l)), i.catchall?._zod.def.type === "never" ? a.additionalProperties = !1 : i.catchall ? i.catchall && (a.additionalProperties = at(i.catchall, t, {
    ...r,
    path: [...r.path, "additionalProperties"]
  })) : t.io === "output" && (a.additionalProperties = !1);
}, mv = (e, t, n, r) => {
  const a = e._zod.def, i = a.inclusive === !1, s = a.options.map((c, l) => at(c, t, {
    ...r,
    path: [...r.path, i ? "oneOf" : "anyOf", l]
  }));
  i ? n.oneOf = s : n.anyOf = s;
}, pv = (e, t, n, r) => {
  const a = e._zod.def, i = at(a.left, t, {
    ...r,
    path: [...r.path, "allOf", 0]
  }), s = at(a.right, t, {
    ...r,
    path: [...r.path, "allOf", 1]
  }), c = (u) => "allOf" in u && Object.keys(u).length === 1, l = [
    ...c(i) ? i.allOf : [i],
    ...c(s) ? s.allOf : [s]
  ];
  n.allOf = l;
}, fv = (e, t, n, r) => {
  const a = e._zod.def, i = at(a.innerType, t, r), s = t.seen.get(e);
  t.target === "openapi-3.0" ? (s.ref = a.innerType, n.nullable = !0) : n.anyOf = [i, { type: "null" }];
}, hv = (e, t, n, r) => {
  const a = e._zod.def;
  at(a.innerType, t, r);
  const i = t.seen.get(e);
  i.ref = a.innerType;
}, gv = (e, t, n, r) => {
  const a = e._zod.def;
  at(a.innerType, t, r);
  const i = t.seen.get(e);
  i.ref = a.innerType, n.default = JSON.parse(JSON.stringify(a.defaultValue));
}, yv = (e, t, n, r) => {
  const a = e._zod.def;
  at(a.innerType, t, r);
  const i = t.seen.get(e);
  i.ref = a.innerType, t.io === "input" && (n._prefault = JSON.parse(JSON.stringify(a.defaultValue)));
}, vv = (e, t, n, r) => {
  const a = e._zod.def;
  at(a.innerType, t, r);
  const i = t.seen.get(e);
  i.ref = a.innerType;
  let s;
  try {
    s = a.catchValue(void 0);
  } catch {
    throw new Error("Dynamic catch values are not supported in JSON Schema");
  }
  n.default = s;
}, bv = (e, t, n, r) => {
  const a = e._zod.def, i = t.io === "input" ? a.in._zod.def.type === "transform" ? a.out : a.in : a.out;
  at(i, t, r);
  const s = t.seen.get(e);
  s.ref = i;
}, wv = (e, t, n, r) => {
  const a = e._zod.def;
  at(a.innerType, t, r);
  const i = t.seen.get(e);
  i.ref = a.innerType, n.readOnly = !0;
}, nd = (e, t, n, r) => {
  const a = e._zod.def;
  at(a.innerType, t, r);
  const i = t.seen.get(e);
  i.ref = a.innerType;
}, _v = /* @__PURE__ */ Q("ZodISODateTime", (e, t) => {
  Pg.init(e, t), Ue.init(e, t);
});
function xv(e) {
  return /* @__PURE__ */ Ry(_v, e);
}
const kv = /* @__PURE__ */ Q("ZodISODate", (e, t) => {
  Eg.init(e, t), Ue.init(e, t);
});
function Sv(e) {
  return /* @__PURE__ */ Oy(kv, e);
}
const Cv = /* @__PURE__ */ Q("ZodISOTime", (e, t) => {
  Ig.init(e, t), Ue.init(e, t);
});
function Nv(e) {
  return /* @__PURE__ */ My(Cv, e);
}
const Av = /* @__PURE__ */ Q("ZodISODuration", (e, t) => {
  Rg.init(e, t), Ue.init(e, t);
});
function Tv(e) {
  return /* @__PURE__ */ Dy(Av, e);
}
const Pv = (e, t) => {
  zl.init(e, t), e.name = "ZodError", Object.defineProperties(e, {
    format: {
      value: (n) => xh(e, n)
      // enumerable: false,
    },
    flatten: {
      value: (n) => _h(e, n)
      // enumerable: false,
    },
    addIssue: {
      value: (n) => {
        e.issues.push(n), e.message = JSON.stringify(e.issues, Xa, 2);
      }
      // enumerable: false,
    },
    addIssues: {
      value: (n) => {
        e.issues.push(...n), e.message = JSON.stringify(e.issues, Xa, 2);
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
}, Rt = Q("ZodError", Pv, {
  Parent: Error
}), Ev = /* @__PURE__ */ Ei(Rt), Iv = /* @__PURE__ */ Ii(Rt), Rv = /* @__PURE__ */ $o(Rt), Ov = /* @__PURE__ */ zo(Rt), Mv = /* @__PURE__ */ Ch(Rt), Dv = /* @__PURE__ */ Nh(Rt), Lv = /* @__PURE__ */ Ah(Rt), $v = /* @__PURE__ */ Th(Rt), zv = /* @__PURE__ */ Ph(Rt), Fv = /* @__PURE__ */ Eh(Rt), Bv = /* @__PURE__ */ Ih(Rt), jv = /* @__PURE__ */ Rh(Rt), Je = /* @__PURE__ */ Q("ZodType", (e, t) => (Ke.init(e, t), Object.assign(e["~standard"], {
  jsonSchema: {
    input: yo(e, "input"),
    output: yo(e, "output")
  }
}), e.toJSONSchema = tv(e, {}), e.def = t, e.type = t.type, Object.defineProperty(e, "_def", { value: t }), e.check = (...n) => e.clone(vn(t, {
  checks: [
    ...t.checks ?? [],
    ...n.map((r) => typeof r == "function" ? { _zod: { check: r, def: { check: "custom" }, onattach: [] } } : r)
  ]
}), {
  parent: !0
}), e.with = e.check, e.clone = (n, r) => bn(e, n, r), e.brand = () => e, e.register = ((n, r) => (n.add(e, r), e)), e.parse = (n, r) => Ev(e, n, r, { callee: e.parse }), e.safeParse = (n, r) => Rv(e, n, r), e.parseAsync = async (n, r) => Iv(e, n, r, { callee: e.parseAsync }), e.safeParseAsync = async (n, r) => Ov(e, n, r), e.spa = e.safeParseAsync, e.encode = (n, r) => Mv(e, n, r), e.decode = (n, r) => Dv(e, n, r), e.encodeAsync = async (n, r) => Lv(e, n, r), e.decodeAsync = async (n, r) => $v(e, n, r), e.safeEncode = (n, r) => zv(e, n, r), e.safeDecode = (n, r) => Fv(e, n, r), e.safeEncodeAsync = async (n, r) => Bv(e, n, r), e.safeDecodeAsync = async (n, r) => jv(e, n, r), e.refine = (n, r) => e.check(Db(n, r)), e.superRefine = (n) => e.check(Lb(n)), e.overwrite = (n) => e.check(/* @__PURE__ */ or(n)), e.optional = () => pc(e), e.exactOptional = () => xb(e), e.nullable = () => fc(e), e.nullish = () => pc(fc(e)), e.nonoptional = (n) => Tb(e, n), e.array = () => mb(e), e.or = (n) => hb([e, n]), e.and = (n) => yb(e, n), e.transform = (n) => hc(e, wb(n)), e.default = (n) => Cb(e, n), e.prefault = (n) => Ab(e, n), e.catch = (n) => Eb(e, n), e.pipe = (n) => hc(e, n), e.readonly = () => Ob(e), e.describe = (n) => {
  const r = e.clone();
  return _r.add(r, { description: n }), r;
}, Object.defineProperty(e, "description", {
  get() {
    return _r.get(e)?.description;
  },
  configurable: !0
}), e.meta = (...n) => {
  if (n.length === 0)
    return _r.get(e);
  const r = e.clone();
  return _r.add(r, n[0]), r;
}, e.isOptional = () => e.safeParse(void 0).success, e.isNullable = () => e.safeParse(null).success, e.apply = (n) => n(e), e)), rd = /* @__PURE__ */ Q("_ZodString", (e, t) => {
  Ri.init(e, t), Je.init(e, t), e._zod.processJSONSchema = (r, a, i) => rv(e, r, a);
  const n = e._zod.bag;
  e.format = n.format ?? null, e.minLength = n.minimum ?? null, e.maxLength = n.maximum ?? null, e.regex = (...r) => e.check(/* @__PURE__ */ By(...r)), e.includes = (...r) => e.check(/* @__PURE__ */ Wy(...r)), e.startsWith = (...r) => e.check(/* @__PURE__ */ Vy(...r)), e.endsWith = (...r) => e.check(/* @__PURE__ */ Hy(...r)), e.min = (...r) => e.check(/* @__PURE__ */ go(...r)), e.max = (...r) => e.check(/* @__PURE__ */ Kl(...r)), e.length = (...r) => e.check(/* @__PURE__ */ Jl(...r)), e.nonempty = (...r) => e.check(/* @__PURE__ */ go(1, ...r)), e.lowercase = (r) => e.check(/* @__PURE__ */ jy(r)), e.uppercase = (r) => e.check(/* @__PURE__ */ Uy(r)), e.trim = () => e.check(/* @__PURE__ */ Zy()), e.normalize = (...r) => e.check(/* @__PURE__ */ qy(...r)), e.toLowerCase = () => e.check(/* @__PURE__ */ Gy()), e.toUpperCase = () => e.check(/* @__PURE__ */ Qy()), e.slugify = () => e.check(/* @__PURE__ */ Yy());
}), Uv = /* @__PURE__ */ Q("ZodString", (e, t) => {
  Ri.init(e, t), rd.init(e, t), e.email = (n) => e.check(/* @__PURE__ */ uy(Wv, n)), e.url = (n) => e.check(/* @__PURE__ */ gy(Vv, n)), e.jwt = (n) => e.check(/* @__PURE__ */ Iy(ab, n)), e.emoji = (n) => e.check(/* @__PURE__ */ yy(Hv, n)), e.guid = (n) => e.check(/* @__PURE__ */ ic(dc, n)), e.uuid = (n) => e.check(/* @__PURE__ */ my(Zr, n)), e.uuidv4 = (n) => e.check(/* @__PURE__ */ py(Zr, n)), e.uuidv6 = (n) => e.check(/* @__PURE__ */ fy(Zr, n)), e.uuidv7 = (n) => e.check(/* @__PURE__ */ hy(Zr, n)), e.nanoid = (n) => e.check(/* @__PURE__ */ vy(qv, n)), e.guid = (n) => e.check(/* @__PURE__ */ ic(dc, n)), e.cuid = (n) => e.check(/* @__PURE__ */ by(Zv, n)), e.cuid2 = (n) => e.check(/* @__PURE__ */ wy(Gv, n)), e.ulid = (n) => e.check(/* @__PURE__ */ _y(Qv, n)), e.base64 = (n) => e.check(/* @__PURE__ */ Ty(nb, n)), e.base64url = (n) => e.check(/* @__PURE__ */ Py(rb, n)), e.xid = (n) => e.check(/* @__PURE__ */ xy(Yv, n)), e.ksuid = (n) => e.check(/* @__PURE__ */ ky(Kv, n)), e.ipv4 = (n) => e.check(/* @__PURE__ */ Sy(Jv, n)), e.ipv6 = (n) => e.check(/* @__PURE__ */ Cy(Xv, n)), e.cidrv4 = (n) => e.check(/* @__PURE__ */ Ny(eb, n)), e.cidrv6 = (n) => e.check(/* @__PURE__ */ Ay(tb, n)), e.e164 = (n) => e.check(/* @__PURE__ */ Ey(ob, n)), e.datetime = (n) => e.check(xv(n)), e.date = (n) => e.check(Sv(n)), e.time = (n) => e.check(Nv(n)), e.duration = (n) => e.check(Tv(n));
});
function pt(e) {
  return /* @__PURE__ */ dy(Uv, e);
}
const Ue = /* @__PURE__ */ Q("ZodStringFormat", (e, t) => {
  ze.init(e, t), rd.init(e, t);
}), Wv = /* @__PURE__ */ Q("ZodEmail", (e, t) => {
  wg.init(e, t), Ue.init(e, t);
}), dc = /* @__PURE__ */ Q("ZodGUID", (e, t) => {
  vg.init(e, t), Ue.init(e, t);
}), Zr = /* @__PURE__ */ Q("ZodUUID", (e, t) => {
  bg.init(e, t), Ue.init(e, t);
}), Vv = /* @__PURE__ */ Q("ZodURL", (e, t) => {
  _g.init(e, t), Ue.init(e, t);
}), Hv = /* @__PURE__ */ Q("ZodEmoji", (e, t) => {
  xg.init(e, t), Ue.init(e, t);
}), qv = /* @__PURE__ */ Q("ZodNanoID", (e, t) => {
  kg.init(e, t), Ue.init(e, t);
}), Zv = /* @__PURE__ */ Q("ZodCUID", (e, t) => {
  Sg.init(e, t), Ue.init(e, t);
}), Gv = /* @__PURE__ */ Q("ZodCUID2", (e, t) => {
  Cg.init(e, t), Ue.init(e, t);
}), Qv = /* @__PURE__ */ Q("ZodULID", (e, t) => {
  Ng.init(e, t), Ue.init(e, t);
}), Yv = /* @__PURE__ */ Q("ZodXID", (e, t) => {
  Ag.init(e, t), Ue.init(e, t);
}), Kv = /* @__PURE__ */ Q("ZodKSUID", (e, t) => {
  Tg.init(e, t), Ue.init(e, t);
}), Jv = /* @__PURE__ */ Q("ZodIPv4", (e, t) => {
  Og.init(e, t), Ue.init(e, t);
}), Xv = /* @__PURE__ */ Q("ZodIPv6", (e, t) => {
  Mg.init(e, t), Ue.init(e, t);
}), eb = /* @__PURE__ */ Q("ZodCIDRv4", (e, t) => {
  Dg.init(e, t), Ue.init(e, t);
}), tb = /* @__PURE__ */ Q("ZodCIDRv6", (e, t) => {
  Lg.init(e, t), Ue.init(e, t);
}), nb = /* @__PURE__ */ Q("ZodBase64", (e, t) => {
  $g.init(e, t), Ue.init(e, t);
}), rb = /* @__PURE__ */ Q("ZodBase64URL", (e, t) => {
  Fg.init(e, t), Ue.init(e, t);
}), ob = /* @__PURE__ */ Q("ZodE164", (e, t) => {
  Bg.init(e, t), Ue.init(e, t);
}), ab = /* @__PURE__ */ Q("ZodJWT", (e, t) => {
  Ug.init(e, t), Ue.init(e, t);
}), od = /* @__PURE__ */ Q("ZodNumber", (e, t) => {
  Zl.init(e, t), Je.init(e, t), e._zod.processJSONSchema = (r, a, i) => ov(e, r, a), e.gt = (r, a) => e.check(/* @__PURE__ */ cc(r, a)), e.gte = (r, a) => e.check(/* @__PURE__ */ Pa(r, a)), e.min = (r, a) => e.check(/* @__PURE__ */ Pa(r, a)), e.lt = (r, a) => e.check(/* @__PURE__ */ sc(r, a)), e.lte = (r, a) => e.check(/* @__PURE__ */ Ta(r, a)), e.max = (r, a) => e.check(/* @__PURE__ */ Ta(r, a)), e.int = (r) => e.check(uc(r)), e.safe = (r) => e.check(uc(r)), e.positive = (r) => e.check(/* @__PURE__ */ cc(0, r)), e.nonnegative = (r) => e.check(/* @__PURE__ */ Pa(0, r)), e.negative = (r) => e.check(/* @__PURE__ */ sc(0, r)), e.nonpositive = (r) => e.check(/* @__PURE__ */ Ta(0, r)), e.multipleOf = (r, a) => e.check(/* @__PURE__ */ lc(r, a)), e.step = (r, a) => e.check(/* @__PURE__ */ lc(r, a)), e.finite = () => e;
  const n = e._zod.bag;
  e.minValue = Math.max(n.minimum ?? Number.NEGATIVE_INFINITY, n.exclusiveMinimum ?? Number.NEGATIVE_INFINITY) ?? null, e.maxValue = Math.min(n.maximum ?? Number.POSITIVE_INFINITY, n.exclusiveMaximum ?? Number.POSITIVE_INFINITY) ?? null, e.isInt = (n.format ?? "").includes("int") || Number.isSafeInteger(n.multipleOf ?? 0.5), e.isFinite = !0, e.format = n.format ?? null;
});
function ib(e) {
  return /* @__PURE__ */ Ly(od, e);
}
const sb = /* @__PURE__ */ Q("ZodNumberFormat", (e, t) => {
  Wg.init(e, t), od.init(e, t);
});
function uc(e) {
  return /* @__PURE__ */ $y(sb, e);
}
const cb = /* @__PURE__ */ Q("ZodUnknown", (e, t) => {
  Vg.init(e, t), Je.init(e, t), e._zod.processJSONSchema = (n, r, a) => iv();
});
function mc() {
  return /* @__PURE__ */ zy(cb);
}
const lb = /* @__PURE__ */ Q("ZodNever", (e, t) => {
  Hg.init(e, t), Je.init(e, t), e._zod.processJSONSchema = (n, r, a) => av(e, n, r);
});
function db(e) {
  return /* @__PURE__ */ Fy(lb, e);
}
const ub = /* @__PURE__ */ Q("ZodArray", (e, t) => {
  qg.init(e, t), Je.init(e, t), e._zod.processJSONSchema = (n, r, a) => dv(e, n, r, a), e.element = t.element, e.min = (n, r) => e.check(/* @__PURE__ */ go(n, r)), e.nonempty = (n) => e.check(/* @__PURE__ */ go(1, n)), e.max = (n, r) => e.check(/* @__PURE__ */ Kl(n, r)), e.length = (n, r) => e.check(/* @__PURE__ */ Jl(n, r)), e.unwrap = () => e.element;
});
function mb(e, t) {
  return /* @__PURE__ */ Ky(ub, e, t);
}
const pb = /* @__PURE__ */ Q("ZodObject", (e, t) => {
  Gg.init(e, t), Je.init(e, t), e._zod.processJSONSchema = (n, r, a) => uv(e, n, r, a), Ee(e, "shape", () => t.shape), e.keyof = () => vb(Object.keys(e._zod.def.shape)), e.catchall = (n) => e.clone({ ...e._zod.def, catchall: n }), e.passthrough = () => e.clone({ ...e._zod.def, catchall: mc() }), e.loose = () => e.clone({ ...e._zod.def, catchall: mc() }), e.strict = () => e.clone({ ...e._zod.def, catchall: db() }), e.strip = () => e.clone({ ...e._zod.def, catchall: void 0 }), e.extend = (n) => gh(e, n), e.safeExtend = (n) => yh(e, n), e.merge = (n) => vh(e, n), e.pick = (n) => fh(e, n), e.omit = (n) => hh(e, n), e.partial = (...n) => bh(id, e, n[0]), e.required = (...n) => wh(sd, e, n[0]);
});
function ad(e, t) {
  const n = {
    type: "object",
    shape: e ?? {},
    ...pe(t)
  };
  return new pb(n);
}
const fb = /* @__PURE__ */ Q("ZodUnion", (e, t) => {
  Qg.init(e, t), Je.init(e, t), e._zod.processJSONSchema = (n, r, a) => mv(e, n, r, a), e.options = t.options;
});
function hb(e, t) {
  return new fb({
    type: "union",
    options: e,
    ...pe(t)
  });
}
const gb = /* @__PURE__ */ Q("ZodIntersection", (e, t) => {
  Yg.init(e, t), Je.init(e, t), e._zod.processJSONSchema = (n, r, a) => pv(e, n, r, a);
});
function yb(e, t) {
  return new gb({
    type: "intersection",
    left: e,
    right: t
  });
}
const ti = /* @__PURE__ */ Q("ZodEnum", (e, t) => {
  Kg.init(e, t), Je.init(e, t), e._zod.processJSONSchema = (r, a, i) => sv(e, r, a), e.enum = t.entries, e.options = Object.values(t.entries);
  const n = new Set(Object.keys(t.entries));
  e.extract = (r, a) => {
    const i = {};
    for (const s of r)
      if (n.has(s))
        i[s] = t.entries[s];
      else
        throw new Error(`Key ${s} not found in enum`);
    return new ti({
      ...t,
      checks: [],
      ...pe(a),
      entries: i
    });
  }, e.exclude = (r, a) => {
    const i = { ...t.entries };
    for (const s of r)
      if (n.has(s))
        delete i[s];
      else
        throw new Error(`Key ${s} not found in enum`);
    return new ti({
      ...t,
      checks: [],
      ...pe(a),
      entries: i
    });
  };
});
function vb(e, t) {
  const n = Array.isArray(e) ? Object.fromEntries(e.map((r) => [r, r])) : e;
  return new ti({
    type: "enum",
    entries: n,
    ...pe(t)
  });
}
const bb = /* @__PURE__ */ Q("ZodTransform", (e, t) => {
  Jg.init(e, t), Je.init(e, t), e._zod.processJSONSchema = (n, r, a) => lv(e, n), e._zod.parse = (n, r) => {
    if (r.direction === "backward")
      throw new Il(e.constructor.name);
    n.addIssue = (i) => {
      if (typeof i == "string")
        n.issues.push(Pr(i, n.value, t));
      else {
        const s = i;
        s.fatal && (s.continue = !1), s.code ?? (s.code = "custom"), s.input ?? (s.input = n.value), s.inst ?? (s.inst = e), n.issues.push(Pr(s));
      }
    };
    const a = t.transform(n.value, n);
    return a instanceof Promise ? a.then((i) => (n.value = i, n)) : (n.value = a, n);
  };
});
function wb(e) {
  return new bb({
    type: "transform",
    transform: e
  });
}
const id = /* @__PURE__ */ Q("ZodOptional", (e, t) => {
  Yl.init(e, t), Je.init(e, t), e._zod.processJSONSchema = (n, r, a) => nd(e, n, r, a), e.unwrap = () => e._zod.def.innerType;
});
function pc(e) {
  return new id({
    type: "optional",
    innerType: e
  });
}
const _b = /* @__PURE__ */ Q("ZodExactOptional", (e, t) => {
  Xg.init(e, t), Je.init(e, t), e._zod.processJSONSchema = (n, r, a) => nd(e, n, r, a), e.unwrap = () => e._zod.def.innerType;
});
function xb(e) {
  return new _b({
    type: "optional",
    innerType: e
  });
}
const kb = /* @__PURE__ */ Q("ZodNullable", (e, t) => {
  ey.init(e, t), Je.init(e, t), e._zod.processJSONSchema = (n, r, a) => fv(e, n, r, a), e.unwrap = () => e._zod.def.innerType;
});
function fc(e) {
  return new kb({
    type: "nullable",
    innerType: e
  });
}
const Sb = /* @__PURE__ */ Q("ZodDefault", (e, t) => {
  ty.init(e, t), Je.init(e, t), e._zod.processJSONSchema = (n, r, a) => gv(e, n, r, a), e.unwrap = () => e._zod.def.innerType, e.removeDefault = e.unwrap;
});
function Cb(e, t) {
  return new Sb({
    type: "default",
    innerType: e,
    get defaultValue() {
      return typeof t == "function" ? t() : Dl(t);
    }
  });
}
const Nb = /* @__PURE__ */ Q("ZodPrefault", (e, t) => {
  ny.init(e, t), Je.init(e, t), e._zod.processJSONSchema = (n, r, a) => yv(e, n, r, a), e.unwrap = () => e._zod.def.innerType;
});
function Ab(e, t) {
  return new Nb({
    type: "prefault",
    innerType: e,
    get defaultValue() {
      return typeof t == "function" ? t() : Dl(t);
    }
  });
}
const sd = /* @__PURE__ */ Q("ZodNonOptional", (e, t) => {
  ry.init(e, t), Je.init(e, t), e._zod.processJSONSchema = (n, r, a) => hv(e, n, r, a), e.unwrap = () => e._zod.def.innerType;
});
function Tb(e, t) {
  return new sd({
    type: "nonoptional",
    innerType: e,
    ...pe(t)
  });
}
const Pb = /* @__PURE__ */ Q("ZodCatch", (e, t) => {
  oy.init(e, t), Je.init(e, t), e._zod.processJSONSchema = (n, r, a) => vv(e, n, r, a), e.unwrap = () => e._zod.def.innerType, e.removeCatch = e.unwrap;
});
function Eb(e, t) {
  return new Pb({
    type: "catch",
    innerType: e,
    catchValue: typeof t == "function" ? t : () => t
  });
}
const Ib = /* @__PURE__ */ Q("ZodPipe", (e, t) => {
  ay.init(e, t), Je.init(e, t), e._zod.processJSONSchema = (n, r, a) => bv(e, n, r, a), e.in = t.in, e.out = t.out;
});
function hc(e, t) {
  return new Ib({
    type: "pipe",
    in: e,
    out: t
    // ...util.normalizeParams(params),
  });
}
const Rb = /* @__PURE__ */ Q("ZodReadonly", (e, t) => {
  iy.init(e, t), Je.init(e, t), e._zod.processJSONSchema = (n, r, a) => wv(e, n, r, a), e.unwrap = () => e._zod.def.innerType;
});
function Ob(e) {
  return new Rb({
    type: "readonly",
    innerType: e
  });
}
const Mb = /* @__PURE__ */ Q("ZodCustom", (e, t) => {
  sy.init(e, t), Je.init(e, t), e._zod.processJSONSchema = (n, r, a) => cv(e, n);
});
function Db(e, t = {}) {
  return /* @__PURE__ */ Jy(Mb, e, t);
}
function Lb(e) {
  return /* @__PURE__ */ Xy(e);
}
const Gr = ad({
  line1: pt().min(1, "Address line 1 is required"),
  line2: pt().optional(),
  city: pt().min(1, "City is required"),
  state: pt().optional(),
  postalCode: pt().min(1, "Postal code is required"),
  country: pt().min(2, "Country is required")
});
function $b(e) {
  return ad({
    email: e.requireEmail ? pt().email("Valid email required") : pt().email("Valid email required").optional(),
    name: e.requireName ? pt().min(1, "Name is required") : pt().optional(),
    phone: e.requirePhone ? pt().min(6, "Phone is required") : pt().optional(),
    notes: pt().max(500).optional(),
    shippingAddress: e.requireShippingAddress ? Gr : Gr.optional(),
    billingAddress: e.requireBillingAddress ? Gr : Gr.optional(),
    discountCode: pt().optional(),
    tipAmount: ib().min(0).optional(),
    shippingMethodId: pt().optional()
  });
}
const gc = { none: 0, optional: 1, required: 2 };
function Ea(e, t) {
  return gc[e] >= gc[t] ? e : t;
}
function zb(e) {
  if (!e) return null;
  try {
    const t = JSON.parse(e);
    return !t || typeof t != "object" ? null : t;
  } catch {
    return null;
  }
}
function so(e, t) {
  let n = !1, r = !1;
  const a = /* @__PURE__ */ new Set();
  let i = t.requireEmail ? "required" : "none", s = t.defaultMode === "none" ? "none" : "optional", c = t.defaultMode === "full" ? "optional" : "none", l = t.allowShipping && (t.defaultMode === "shipping" || t.defaultMode === "full"), u = t.defaultMode === "full";
  for (const m of e) {
    m.metadata?.shippingProfile === "digital" ? n = !0 : r = !0;
    const g = zb(m.metadata?.checkoutRequirements);
    g && (g.email && (i = Ea(i, g.email)), g.name && (s = Ea(s, g.name)), g.phone && (c = Ea(c, g.phone)), typeof g.shippingAddress == "boolean" && (l = l || g.shippingAddress), typeof g.billingAddress == "boolean" && (u = u || g.billingAddress));
    const v = m.metadata?.fulfillmentNotes;
    v && a.add(v);
  }
  const p = n && !r;
  return p && (l = !1), {
    email: i,
    name: s,
    phone: c,
    shippingAddress: l,
    billingAddress: u,
    fulfillmentNotes: Array.from(a).join(" "),
    isDigitalOnly: p,
    hasPhysical: r
  };
}
const cd = U.createContext(null);
function ld() {
  const { config: e } = je(), t = jt(), n = U.useMemo(
    () => ({
      line1: "",
      line2: "",
      city: "",
      state: "",
      postalCode: "",
      country: "US"
    }),
    []
  ), r = U.useMemo(
    () => {
      const w = so(t.items, {
        requireEmail: e.checkout.requireEmail ?? !0,
        defaultMode: e.checkout.mode,
        allowShipping: e.checkout.allowShipping ?? !1
      });
      return $b({
        requireEmail: w.email === "required",
        requireName: w.name === "required",
        requirePhone: w.phone === "required",
        requireShippingAddress: w.shippingAddress,
        requireBillingAddress: w.billingAddress
      });
    },
    [t.items, e.checkout.allowShipping, e.checkout.mode, e.checkout.requireEmail]
  ), [a, i] = U.useState(() => ({
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
  U.useEffect(() => {
    const w = so(t.items, {
      requireEmail: e.checkout.requireEmail ?? !0,
      defaultMode: e.checkout.mode,
      allowShipping: e.checkout.allowShipping ?? !1
    });
    i((_) => {
      const x = { ..._ };
      return w.email === "required" && !x.email && (x.email = ""), w.shippingAddress && !x.shippingAddress && (x.shippingAddress = n), w.billingAddress && !x.billingAddress && (x.billingAddress = n), w.shippingAddress || (x.shippingAddress = void 0), w.billingAddress || (x.billingAddress = void 0), x;
    });
  }, [t.items, e.checkout.allowShipping, e.checkout.mode, e.checkout.requireEmail, n]);
  const [s, c] = U.useState({}), [l, u] = U.useState("idle"), [p, m] = U.useState(null), [h, g] = U.useState(null), v = U.useCallback(() => {
    c({}), u("idle"), m(null), g(null);
  }, []), f = U.useCallback((w, _) => {
    i((x) => ({ ...x, [w]: _ }));
  }, []), b = U.useCallback(() => {
    u("validating"), m(null);
    const w = r.safeParse(a);
    if (w.success)
      return c({}), u("idle"), { ok: !0, values: w.data };
    const _ = {};
    for (const x of w.error.issues)
      _[x.path.join(".")] = x.message;
    return c(_), u("error"), m("Please fix the highlighted fields."), { ok: !1 };
  }, [r, a]), k = U.useCallback(
    async (w) => {
      const _ = b();
      if (!_.ok) return { ok: !1 };
      u("creating_session"), m(null), g(null);
      const x = t.items.map((A) => ({
        resource: A.paymentResource ?? A.productId,
        quantity: A.qty,
        variantId: A.variantId
      })), N = so(t.items, {
        requireEmail: e.checkout.requireEmail ?? !0,
        defaultMode: e.checkout.mode,
        allowShipping: e.checkout.allowShipping ?? !1
      }), I = /* @__PURE__ */ new Set();
      if (N.shippingAddress)
        for (const A of t.items) {
          const W = A.metadata?.shippingCountries;
          if (W)
            for (const C of W.split(",")) {
              const T = C.trim().toUpperCase();
              T && I.add(T);
            }
        }
      const S = {
        ...I.size ? {
          shippingCountries: Array.from(I).join(","),
          shipping_countries: Array.from(I).join(",")
        } : {}
      };
      try {
        const A = await e.adapter.createCheckoutSession({
          cart: x,
          customer: {
            email: _.values.email || void 0,
            name: _.values.name || void 0,
            phone: _.values.phone || void 0,
            notes: _.values.notes || void 0,
            shippingAddress: _.values.shippingAddress,
            billingAddress: _.values.billingAddress
          },
          options: {
            currency: e.currency,
            successUrl: e.checkout.successUrl,
            cancelUrl: e.checkout.cancelUrl,
            allowPromoCodes: e.checkout.allowPromoCodes,
            metadata: Object.keys(S).length ? S : void 0,
            discountCode: (e.checkout.allowPromoCodes ? _.values.discountCode || t.promoCode : void 0) || void 0,
            tipAmount: e.checkout.allowTipping && _.values.tipAmount || void 0,
            shippingMethodId: e.checkout.allowShipping && _.values.shippingMethodId || void 0,
            paymentMethodId: w?.paymentMethodId
          }
        });
        return A.kind === "redirect" ? (g(A), u("redirecting"), typeof window < "u" && window.location.assign(A.url), { ok: !0, session: A }) : (g(A), u("success"), { ok: !0, session: A });
      } catch (A) {
        return u("error"), m(A instanceof Error ? A.message : "Checkout failed"), { ok: !1 };
      }
    },
    [t.items, t.promoCode, e.adapter, e.checkout, e.currency, b]
  );
  return {
    values: a,
    setValues: i,
    setField: f,
    fieldErrors: s,
    status: l,
    error: p,
    session: h,
    reset: v,
    validate: b,
    createCheckoutSession: k
  };
}
function dd({ children: e }) {
  const t = ld();
  return /* @__PURE__ */ o(cd.Provider, { value: t, children: e });
}
function Bo() {
  const e = U.useContext(cd);
  if (!e)
    throw new Error("useCheckout must be used within CheckoutProvider");
  return e;
}
function Fb() {
  return ld();
}
function Oi() {
  const { config: e } = je(), [t, n] = y.useState([]), [r, a] = y.useState(!0), [i, s] = y.useState(null);
  return y.useEffect(() => {
    let c = !1;
    return a(!0), s(null), e.adapter.listCategories().then((l) => {
      c || n(l);
    }).catch((l) => {
      c || s(l instanceof Error ? l.message : "Failed to load categories");
    }).finally(() => {
      c || a(!1);
    }), () => {
      c = !0;
    };
  }, [e.adapter]), { categories: t, isLoading: r, error: i };
}
function jo(e) {
  const { config: t } = je(), [n, r] = y.useState(null), [a, i] = y.useState(!0), [s, c] = y.useState(null), l = JSON.stringify(e.filters ?? {});
  return y.useEffect(() => {
    let u = !1;
    return i(!0), c(null), t.adapter.listProducts(e).then((p) => {
      u || r(p);
    }).catch((p) => {
      u || c(p instanceof Error ? p.message : "Failed to load products");
    }).finally(() => {
      u || i(!1);
    }), () => {
      u = !0;
    };
  }, [t.adapter, e.category, e.search, e.sort, e.page, e.pageSize, l]), { data: n, isLoading: a, error: s };
}
function ud(e) {
  const { config: t } = je(), [n, r] = y.useState(null), [a, i] = y.useState(!0), [s, c] = y.useState(null);
  return y.useEffect(() => {
    let l = !1;
    return i(!0), c(null), t.adapter.getProductBySlug(e).then((u) => {
      l || r(u);
    }).catch((u) => {
      l || c(u instanceof Error ? u.message : "Failed to load product");
    }).finally(() => {
      l || i(!1);
    }), () => {
      l = !0;
    };
  }, [t.adapter, e]), { product: n, isLoading: a, error: s };
}
function md() {
  const { config: e } = je(), [t, n] = y.useState([]), [r, a] = y.useState(!0), [i, s] = y.useState(null);
  return y.useEffect(() => {
    let c = !1;
    return a(!0), s(null), e.adapter.getOrderHistory().then((l) => {
      c || n(l);
    }).catch((l) => {
      c || s(l instanceof Error ? l.message : "Failed to load orders");
    }).finally(() => {
      c || a(!1);
    }), () => {
      c = !0;
    };
  }, [e.adapter]), { orders: t, isLoading: r, error: i };
}
function pd() {
  const { config: e } = je(), [t, n] = y.useState([]), [r, a] = y.useState(null), [i, s] = y.useState(!0), [c, l] = y.useState(null);
  return y.useEffect(() => {
    let u = !1;
    async function p() {
      s(!0), l(null);
      try {
        const [m, h] = await Promise.all([
          e.adapter.listSubscriptionTiers?.() ?? Promise.resolve([]),
          e.adapter.getSubscriptionStatus?.() ?? Promise.resolve(null)
        ]);
        if (u) return;
        n(m), a(h);
      } catch (m) {
        if (u) return;
        l(m instanceof Error ? m.message : "Failed to load subscriptions");
      } finally {
        u || s(!1);
      }
    }
    return p(), () => {
      u = !0;
    };
  }, [e.adapter]), { tiers: t, status: r, isLoading: i, error: c };
}
function fd({
  enabled: e,
  customer: t
}) {
  const { config: n } = je(), [r, a] = y.useState([]), [i, s] = y.useState(!1), [c, l] = y.useState(null), u = JSON.stringify(t.shippingAddress ?? {});
  return y.useEffect(() => {
    let p = !1;
    if (!e || !n.adapter.getShippingMethods) {
      a([]);
      return;
    }
    return s(!0), l(null), n.adapter.getShippingMethods({ currency: n.currency, customer: t }).then((m) => {
      p || a(m);
    }).catch((m) => {
      p || l(m instanceof Error ? m.message : "Failed to load shipping methods");
    }).finally(() => {
      p || s(!1);
    }), () => {
      p = !0;
    };
  }, [n.adapter, n.currency, e, t.email, t.name, u]), { methods: r, isLoading: i, error: c };
}
function fr(e, ...t) {
  for (const n of t) {
    const r = e[n];
    if (r) return r;
  }
}
function Mi(e) {
  const t = fr(e, "error", "error_message", "message");
  if (t) return { kind: "error", message: t };
  const n = fr(e, "canceled", "cancelled", "cancel", "canceled_at");
  if (n && n !== "0" && n !== "false") return { kind: "cancel" };
  const r = fr(e, "orderId", "order_id", "demoOrderId"), a = fr(e, "session_id", "checkout_session_id");
  if (r || a) return { kind: "success", orderId: r ?? a };
  const i = (fr(e, "status", "checkout") ?? "").toLowerCase();
  return i === "success" ? { kind: "success", orderId: r } : i === "cancel" || i === "canceled" ? { kind: "cancel" } : i === "error" ? { kind: "error" } : { kind: "idle" };
}
function Bb(e) {
  const t = {};
  return e.forEach((n, r) => {
    t[r] = n;
  }), t;
}
function Di() {
  const { config: e } = je(), [t, n] = y.useState({ kind: "idle" });
  return y.useEffect(() => {
    if (typeof window > "u") return;
    const r = new URLSearchParams(window.location.search), a = Bb(r);
    (async () => {
      try {
        const i = e.adapter.resolveCheckoutReturn ? await e.adapter.resolveCheckoutReturn({ query: a }) : Mi(a);
        if (i.kind === "success" && i.orderId && e.adapter.getOrderById) {
          const s = await e.adapter.getOrderById(i.orderId);
          if (s) {
            n({ kind: "success", orderId: i.orderId, order: s });
            return;
          }
        }
        n(i);
      } catch (i) {
        n({ kind: "error", message: i instanceof Error ? i.message : "Failed to resolve checkout" });
      }
    })();
  }, [e.adapter]), t;
}
function ni(e) {
  if (!e) return;
  const t = Number(e);
  return Number.isFinite(t) ? t : void 0;
}
function jb(e) {
  const t = e.get("tags"), n = t ? t.split(",").map((c) => c.trim()).filter(Boolean) : void 0, r = ni(e.get("min")), a = ni(e.get("max")), i = e.get("inStock"), s = i === "1" ? !0 : i === "0" ? !1 : void 0;
  return {
    tags: n && n.length ? n : void 0,
    priceMin: r,
    priceMax: a,
    inStock: s
  };
}
function Ub(e, t) {
  t.tags?.length ? e.set("tags", t.tags.join(",")) : e.delete("tags"), typeof t.priceMin == "number" ? e.set("min", String(t.priceMin)) : e.delete("min"), typeof t.priceMax == "number" ? e.set("max", String(t.priceMax)) : e.delete("max"), typeof t.inStock == "boolean" ? e.set("inStock", t.inStock ? "1" : "0") : e.delete("inStock");
}
function Li({ includeCategory: e }) {
  if (typeof window > "u") return null;
  const t = new URLSearchParams(window.location.search), n = t.get("q") ?? "", r = t.get("sort") ?? "featured", a = ni(t.get("page")) ?? 1, i = jb(t), s = e ? t.get("cat") ?? void 0 : void 0;
  return {
    search: n,
    sort: r,
    page: Math.max(1, Math.floor(a)),
    category: s,
    filters: i
  };
}
function $i(e, { includeCategory: t }) {
  const n = JSON.stringify(e.filters.tags ?? []);
  y.useEffect(() => {
    if (typeof window > "u") return;
    const r = window.setTimeout(() => {
      const a = new URL(window.location.href), i = a.searchParams;
      e.search.trim() ? i.set("q", e.search.trim()) : i.delete("q"), e.sort && e.sort !== "featured" ? i.set("sort", e.sort) : i.delete("sort"), e.page && e.page !== 1 ? i.set("page", String(e.page)) : i.delete("page"), t && (e.category ? i.set("cat", e.category) : i.delete("cat")), Ub(i, e.filters);
      const s = `${a.pathname}?${i.toString()}${a.hash}`, c = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      s !== c && window.history.replaceState({}, "", s);
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
function Wb(e, t) {
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
function Vb(e, t) {
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
  const { qty: r, status: a } = Wb(t, e.variantId);
  return n.availableQty = r, n.status = a, a === "out_of_stock" || typeof r == "number" && r <= 0 ? {
    ...n,
    isOutOfStock: !0,
    message: "Out of stock"
  } : typeof r == "number" && e.qty > r ? {
    ...n,
    exceedsAvailable: !0,
    message: r === 0 ? "Out of stock" : `Only ${r} available (you have ${e.qty} in cart)`
  } : a === "low" || typeof r == "number" && r > 0 && r <= 5 ? {
    ...n,
    isLowStock: !0,
    message: typeof r == "number" ? `Only ${r} left` : "Low stock"
  } : n;
}
function zi({
  items: e,
  refreshInterval: t = 3e4,
  skip: n = !1
}) {
  const { config: r } = je(), [a, i] = y.useState(/* @__PURE__ */ new Map()), [s, c] = y.useState(!1), [l, u] = y.useState(null), p = y.useMemo(() => {
    const v = /* @__PURE__ */ new Set();
    for (const f of e)
      v.add(f.productId);
    return Array.from(v);
  }, [e]), m = y.useCallback(async () => {
    if (n || p.length === 0) {
      i(/* @__PURE__ */ new Map());
      return;
    }
    c(!0), u(null);
    try {
      const v = await Promise.all(
        p.map(async (k) => {
          try {
            return await r.adapter.getProductBySlug(k);
          } catch {
            return null;
          }
        })
      ), f = /* @__PURE__ */ new Map();
      for (const k of v)
        k && (f.set(k.id, k), k.slug && k.slug !== k.id && f.set(k.slug, k));
      const b = /* @__PURE__ */ new Map();
      for (const k of e) {
        const w = yc(k.productId, k.variantId), _ = f.get(k.productId) ?? null;
        b.set(w, Vb(k, _));
      }
      i(b);
    } catch (v) {
      u(v instanceof Error ? v.message : "Failed to check inventory");
    } finally {
      c(!1);
    }
  }, [r.adapter, e, p, n]);
  y.useEffect(() => {
    m();
  }, [m]), y.useEffect(() => {
    if (n || t <= 0 || p.length === 0) return;
    const v = setInterval(m, t);
    return () => clearInterval(v);
  }, [m, p.length, t, n]);
  const h = y.useCallback(
    (v, f) => a.get(yc(v, f)),
    [a]
  ), g = y.useMemo(() => {
    for (const v of a.values())
      if (v.isOutOfStock || v.exceedsAvailable)
        return !0;
    return !1;
  }, [a]);
  return {
    inventory: a,
    isLoading: s,
    error: l,
    refresh: m,
    getItemInventory: h,
    hasIssues: g
  };
}
function Hb(e, t) {
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
function qb(e, t, n) {
  if (!t) return e.titleSnapshot ?? "Unknown Product";
  const r = t.title ?? e.titleSnapshot ?? "Product";
  if (n && t.variants?.length) {
    const a = t.variants.find((i) => i.id === n);
    if (a?.title)
      return `${r} - ${a.title}`;
  }
  return r;
}
function Zb(e, t) {
  const n = qb(e, t, e.variantId);
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
  const { qty: r, status: a } = Hb(t, e.variantId);
  return a === "out_of_stock" || typeof r == "number" && r <= 0 ? {
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
function hd({
  items: e
}) {
  const { config: t } = je(), [n, r] = y.useState(null), [a, i] = y.useState(!1), [s, c] = y.useState(null), l = y.useMemo(() => {
    const m = /* @__PURE__ */ new Set();
    for (const h of e)
      m.add(h.productId);
    return Array.from(m);
  }, [e]), u = y.useCallback(async () => {
    if (e.length === 0) {
      const m = {
        ok: !0,
        issues: [],
        verifiedAt: /* @__PURE__ */ new Date()
      };
      return r(m), m;
    }
    i(!0), c(null);
    try {
      const m = await Promise.all(
        l.map(async (f) => {
          try {
            return await t.adapter.getProductBySlug(f);
          } catch {
            return null;
          }
        })
      ), h = /* @__PURE__ */ new Map();
      for (const f of m)
        f && (h.set(f.id, f), f.slug && f.slug !== f.id && h.set(f.slug, f));
      const g = [];
      for (const f of e) {
        const b = h.get(f.productId) ?? null, k = Zb(f, b);
        k && g.push(k);
      }
      const v = {
        ok: g.length === 0,
        issues: g,
        verifiedAt: /* @__PURE__ */ new Date()
      };
      return r(v), i(!1), v;
    } catch (m) {
      const h = m instanceof Error ? m.message : "Failed to verify inventory";
      c(h), i(!1);
      const g = {
        ok: !1,
        issues: [],
        verifiedAt: /* @__PURE__ */ new Date()
      };
      return r(g), g;
    }
  }, [t.adapter, e, l]), p = y.useCallback(() => {
    r(null), c(null);
  }, []);
  return {
    result: n,
    isVerifying: a,
    error: s,
    verify: u,
    reset: p
  };
}
function Gb({
  items: e,
  onExpiry: t,
  enabled: n = !0
}) {
  const [r, a] = y.useState([]), [i, s] = y.useState([]), c = y.useRef(/* @__PURE__ */ new Set()), l = y.useMemo(() => n ? e.filter((u) => u.holdId && u.holdExpiresAt) : [], [e, n]);
  return y.useEffect(() => {
    if (!n || l.length === 0) {
      a([]), s([]);
      return;
    }
    const u = () => {
      const m = Date.now(), h = 120 * 1e3, g = [], v = [];
      for (const f of l) {
        if (!f.holdExpiresAt) continue;
        const b = new Date(f.holdExpiresAt), k = b.getTime() - m, w = `${f.productId}::${f.variantId ?? ""}`;
        k <= 0 ? (g.push({ productId: f.productId, variantId: f.variantId }), c.current.has(w) || (c.current.add(w), t?.({
          productId: f.productId,
          variantId: f.variantId,
          title: f.titleSnapshot,
          expiredAt: b
        }))) : k <= h && v.push({
          productId: f.productId,
          variantId: f.variantId,
          expiresAt: b,
          remainingMs: k
        });
      }
      a(g), s(v);
    };
    u();
    const p = setInterval(u, 1e4);
    return () => clearInterval(p);
  }, [n, l, t]), y.useEffect(() => {
    const u = new Set(
      l.map((p) => `${p.productId}::${p.variantId ?? ""}`)
    );
    for (const p of c.current)
      u.has(p) || c.current.delete(p);
  }, [l]), { expiringItems: i, expiredItems: r };
}
const Me = {
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
function Qb(e) {
  return {
    relatedProducts: {
      mode: e.relatedProducts?.mode || Me.relatedProducts.mode,
      maxItems: e.relatedProducts?.maxItems || Me.relatedProducts.maxItems,
      layout: {
        layout: e.relatedProducts?.layout?.layout ?? Me.relatedProducts.layout.layout,
        imageCrop: e.relatedProducts?.layout?.imageCrop ?? Me.relatedProducts.layout.imageCrop
      }
    },
    catalog: {
      filters: {
        tags: e.catalog?.filters?.tags ?? Me.catalog.filters.tags,
        priceRange: e.catalog?.filters?.priceRange ?? Me.catalog.filters.priceRange,
        inStock: e.catalog?.filters?.inStock ?? Me.catalog.filters.inStock
      },
      sort: {
        featured: e.catalog?.sort?.featured ?? Me.catalog.sort.featured,
        priceAsc: e.catalog?.sort?.priceAsc ?? Me.catalog.sort.priceAsc,
        priceDesc: e.catalog?.sort?.priceDesc ?? Me.catalog.sort.priceDesc
      }
    },
    checkout: {
      promoCodes: e.checkout?.promoCodes ?? Me.checkout.promoCodes
    },
    shopLayout: {
      layout: e.shopLayout?.layout ?? Me.shopLayout.layout,
      imageCrop: e.shopLayout?.imageCrop ?? Me.shopLayout.imageCrop
    },
    categoryLayout: {
      layout: e.categoryLayout?.layout ?? Me.categoryLayout.layout,
      imageCrop: e.categoryLayout?.imageCrop ?? Me.categoryLayout.imageCrop
    },
    sections: {
      showDescription: e.sections?.showDescription ?? Me.sections.showDescription,
      showSpecs: e.sections?.showSpecs ?? Me.sections.showSpecs,
      showShipping: e.sections?.showShipping ?? Me.sections.showShipping,
      showRelatedProducts: e.sections?.showRelatedProducts ?? Me.sections.showRelatedProducts
    },
    inventory: {
      preCheckoutVerification: e.inventory?.preCheckoutVerification ?? Me.inventory.preCheckoutVerification,
      holdsEnabled: e.inventory?.holdsEnabled ?? Me.inventory.holdsEnabled,
      holdDurationMinutes: e.inventory?.holdDurationMinutes ?? Me.inventory.holdDurationMinutes
    },
    shopPage: {
      title: e.shopPage?.title ?? Me.shopPage.title,
      description: e.shopPage?.description ?? Me.shopPage.description
    }
  };
}
function ar(e = {}) {
  const n = Ci()?.config?.adapter, [r, a] = H(Me), [i, s] = H(!!n?.getStorefrontSettings);
  return ge(() => {
    if (!n?.getStorefrontSettings) {
      s(!1);
      return;
    }
    let c = !1;
    async function l() {
      try {
        const u = await n.getStorefrontSettings();
        !c && u && a(Qb(u));
      } catch {
      } finally {
        c || s(!1);
      }
    }
    return l(), () => {
      c = !0;
    };
  }, [n]), { settings: r, isLoading: i };
}
const Yb = {
  card: !0,
  crypto: !0,
  credits: !1
  // Credits require explicit backend setup
};
function gd() {
  const t = Ci()?.config?.adapter, [n, r] = H(Yb), [a, i] = H(!!t?.getPaymentMethodsConfig);
  return ge(() => {
    if (!t?.getPaymentMethodsConfig) {
      i(!1);
      return;
    }
    let s = !1;
    async function c() {
      try {
        const l = await t.getPaymentMethodsConfig();
        !s && l && r(l);
      } catch {
      } finally {
        s || i(!1);
      }
    }
    return c(), () => {
      s = !0;
    };
  }, [t]), { config: n, isLoading: a };
}
const vc = /* @__PURE__ */ new Map();
function Kb(e) {
  return e.productId ? `id:${e.productId}` : e.name ? `name:${e.name}` : "";
}
function yd(e = {}) {
  const { productId: t, product: n, enabled: r = !0 } = e, i = Ci()?.config?.adapter, [s, c] = H(null), [l, u] = H(null), [p, m] = H(!1), [h, g] = H(null), v = gt(0), f = J(async () => {
    const b = t ? { productId: t } : n ? {
      name: n.name,
      description: n.description,
      tags: n.tags,
      categoryIds: n.categoryIds
    } : {};
    if (!b.productId && !b.name)
      return;
    if (!i?.getAIRelatedProducts) {
      g("AI recommendations not available");
      return;
    }
    const k = Kb(b), w = vc.get(k);
    if (w) {
      c(w.relatedProductIds), u(w.reasoning), g(null);
      return;
    }
    const _ = ++v.current;
    m(!0), g(null);
    try {
      const x = await i.getAIRelatedProducts(b);
      _ === v.current && (c(x.relatedProductIds), u(x.reasoning), g(null), k && vc.set(k, x));
    } catch (x) {
      if (_ === v.current) {
        const N = x instanceof Error ? x.message : "Failed to get AI recommendations";
        g(N), c(null), u(null);
      }
    } finally {
      _ === v.current && m(!1);
    }
  }, [i, t, n]);
  return ge(() => {
    r && (!t && !n?.name || f());
  }, [r, t, n?.name, f]), {
    relatedProductIds: s,
    reasoning: l,
    isLoading: p,
    error: h,
    refetch: f
  };
}
function Be(e, t) {
  if (!e) throw new Error(t);
}
function Dt(e) {
  return typeof e == "string" && e.trim().length > 0;
}
async function Jb(e, t = {}) {
  const n = t.pageSize ?? 10, r = await e.listCategories();
  Be(Array.isArray(r), "listCategories() must return an array");
  for (const s of r)
    Be(Dt(s.id), "Category.id is required"), Be(Dt(s.slug), "Category.slug is required"), Be(Dt(s.name), "Category.name is required");
  const a = await e.listProducts({ page: 1, pageSize: n });
  if (Be(a && Array.isArray(a.items), "listProducts() must return { items: Product[] }"), Be(typeof a.page == "number", "listProducts().page must be a number"), Be(typeof a.pageSize == "number", "listProducts().pageSize must be a number"), a.items.length > 0) {
    const s = a.items[0];
    Be(Dt(s.id), "Product.id is required"), Be(Dt(s.slug), "Product.slug is required"), Be(Dt(s.title), "Product.title is required"), Be(typeof s.description == "string", "Product.description must be a string"), Be(Array.isArray(s.images), "Product.images must be an array"), Be(typeof s.price == "number", "Product.price must be a number"), Be(Dt(s.currency), "Product.currency is required"), Be(Array.isArray(s.tags), "Product.tags must be an array"), Be(Array.isArray(s.categoryIds), "Product.categoryIds must be an array");
    const c = await e.getProductBySlug(s.slug);
    Be(c === null || Dt(c.id), "getProductBySlug() must return Product or null");
  }
  const i = await e.getOrderHistory();
  Be(Array.isArray(i), "getOrderHistory() must return an array");
  for (const s of i)
    Be(Dt(s.id), "Order.id is required"), Be(Dt(s.createdAt), "Order.createdAt is required"), Be(typeof s.total == "number", "Order.total must be a number"), Be(Dt(s.currency), "Order.currency is required"), Be(Array.isArray(s.items), "Order.items must be an array");
}
function bc(e, t) {
  if (typeof e == "function")
    return e(t);
  e != null && (e.current = t);
}
function ir(...e) {
  return (t) => {
    let n = !1;
    const r = e.map((a) => {
      const i = bc(a, t);
      return !n && typeof i == "function" && (n = !0), i;
    });
    if (n)
      return () => {
        for (let a = 0; a < r.length; a++) {
          const i = r[a];
          typeof i == "function" ? i() : bc(e[a], null);
        }
      };
  };
}
function $e(...e) {
  return y.useCallback(ir(...e), e);
}
var Xb = Symbol.for("react.lazy"), vo = y[" use ".trim().toString()];
function e0(e) {
  return typeof e == "object" && e !== null && "then" in e;
}
function vd(e) {
  return e != null && typeof e == "object" && "$$typeof" in e && e.$$typeof === Xb && "_payload" in e && e0(e._payload);
}
// @__NO_SIDE_EFFECTS__
function bd(e) {
  const t = /* @__PURE__ */ n0(e), n = y.forwardRef((r, a) => {
    let { children: i, ...s } = r;
    vd(i) && typeof vo == "function" && (i = vo(i._payload));
    const c = y.Children.toArray(i), l = c.find(o0);
    if (l) {
      const u = l.props.children, p = c.map((m) => m === l ? y.Children.count(u) > 1 ? y.Children.only(null) : y.isValidElement(u) ? u.props.children : null : m);
      return /* @__PURE__ */ o(t, { ...s, ref: a, children: y.isValidElement(u) ? y.cloneElement(u, void 0, p) : null });
    }
    return /* @__PURE__ */ o(t, { ...s, ref: a, children: i });
  });
  return n.displayName = `${e}.Slot`, n;
}
var t0 = /* @__PURE__ */ bd("Slot");
// @__NO_SIDE_EFFECTS__
function n0(e) {
  const t = y.forwardRef((n, r) => {
    let { children: a, ...i } = n;
    if (vd(a) && typeof vo == "function" && (a = vo(a._payload)), y.isValidElement(a)) {
      const s = i0(a), c = a0(i, a.props);
      return a.type !== y.Fragment && (c.ref = r ? ir(r, s) : s), y.cloneElement(a, c);
    }
    return y.Children.count(a) > 1 ? y.Children.only(null) : null;
  });
  return t.displayName = `${e}.SlotClone`, t;
}
var r0 = Symbol("radix.slottable");
function o0(e) {
  return y.isValidElement(e) && typeof e.type == "function" && "__radixId" in e.type && e.type.__radixId === r0;
}
function a0(e, t) {
  const n = { ...t };
  for (const r in t) {
    const a = e[r], i = t[r];
    /^on[A-Z]/.test(r) ? a && i ? n[r] = (...c) => {
      const l = i(...c);
      return a(...c), l;
    } : a && (n[r] = a) : r === "style" ? n[r] = { ...a, ...i } : r === "className" && (n[r] = [a, i].filter(Boolean).join(" "));
  }
  return { ...e, ...n };
}
function i0(e) {
  let t = Object.getOwnPropertyDescriptor(e.props, "ref")?.get, n = t && "isReactWarning" in t && t.isReactWarning;
  return n ? e.ref : (t = Object.getOwnPropertyDescriptor(e, "ref")?.get, n = t && "isReactWarning" in t && t.isReactWarning, n ? e.props.ref : e.props.ref || e.ref);
}
function wd(e) {
  var t, n, r = "";
  if (typeof e == "string" || typeof e == "number") r += e;
  else if (typeof e == "object") if (Array.isArray(e)) {
    var a = e.length;
    for (t = 0; t < a; t++) e[t] && (n = wd(e[t])) && (r && (r += " "), r += n);
  } else for (n in e) e[n] && (r && (r += " "), r += n);
  return r;
}
function _d() {
  for (var e, t, n = 0, r = "", a = arguments.length; n < a; n++) (e = arguments[n]) && (t = wd(e)) && (r && (r += " "), r += t);
  return r;
}
const wc = (e) => typeof e == "boolean" ? `${e}` : e === 0 ? "0" : e, _c = _d, Fi = (e, t) => (n) => {
  var r;
  if (t?.variants == null) return _c(e, n?.class, n?.className);
  const { variants: a, defaultVariants: i } = t, s = Object.keys(a).map((u) => {
    const p = n?.[u], m = i?.[u];
    if (p === null) return null;
    const h = wc(p) || wc(m);
    return a[u][h];
  }), c = n && Object.entries(n).reduce((u, p) => {
    let [m, h] = p;
    return h === void 0 || (u[m] = h), u;
  }, {}), l = t == null || (r = t.compoundVariants) === null || r === void 0 ? void 0 : r.reduce((u, p) => {
    let { class: m, className: h, ...g } = p;
    return Object.entries(g).every((v) => {
      let [f, b] = v;
      return Array.isArray(b) ? b.includes({
        ...i,
        ...c
      }[f]) : {
        ...i,
        ...c
      }[f] === b;
    }) ? [
      ...u,
      m,
      h
    ] : u;
  }, []);
  return _c(e, s, l, n?.class, n?.className);
}, s0 = (e, t) => {
  const n = new Array(e.length + t.length);
  for (let r = 0; r < e.length; r++)
    n[r] = e[r];
  for (let r = 0; r < t.length; r++)
    n[e.length + r] = t[r];
  return n;
}, c0 = (e, t) => ({
  classGroupId: e,
  validator: t
}), xd = (e = /* @__PURE__ */ new Map(), t = null, n) => ({
  nextPart: e,
  validators: t,
  classGroupId: n
}), bo = "-", xc = [], l0 = "arbitrary..", d0 = (e) => {
  const t = m0(e), {
    conflictingClassGroups: n,
    conflictingClassGroupModifiers: r
  } = e;
  return {
    getClassGroupId: (s) => {
      if (s.startsWith("[") && s.endsWith("]"))
        return u0(s);
      const c = s.split(bo), l = c[0] === "" && c.length > 1 ? 1 : 0;
      return kd(c, l, t);
    },
    getConflictingClassGroupIds: (s, c) => {
      if (c) {
        const l = r[s], u = n[s];
        return l ? u ? s0(u, l) : l : u || xc;
      }
      return n[s] || xc;
    }
  };
}, kd = (e, t, n) => {
  if (e.length - t === 0)
    return n.classGroupId;
  const a = e[t], i = n.nextPart.get(a);
  if (i) {
    const u = kd(e, t + 1, i);
    if (u) return u;
  }
  const s = n.validators;
  if (s === null)
    return;
  const c = t === 0 ? e.join(bo) : e.slice(t).join(bo), l = s.length;
  for (let u = 0; u < l; u++) {
    const p = s[u];
    if (p.validator(c))
      return p.classGroupId;
  }
}, u0 = (e) => e.slice(1, -1).indexOf(":") === -1 ? void 0 : (() => {
  const t = e.slice(1, -1), n = t.indexOf(":"), r = t.slice(0, n);
  return r ? l0 + r : void 0;
})(), m0 = (e) => {
  const {
    theme: t,
    classGroups: n
  } = e;
  return p0(n, t);
}, p0 = (e, t) => {
  const n = xd();
  for (const r in e) {
    const a = e[r];
    Bi(a, n, r, t);
  }
  return n;
}, Bi = (e, t, n, r) => {
  const a = e.length;
  for (let i = 0; i < a; i++) {
    const s = e[i];
    f0(s, t, n, r);
  }
}, f0 = (e, t, n, r) => {
  if (typeof e == "string") {
    h0(e, t, n);
    return;
  }
  if (typeof e == "function") {
    g0(e, t, n, r);
    return;
  }
  y0(e, t, n, r);
}, h0 = (e, t, n) => {
  const r = e === "" ? t : Sd(t, e);
  r.classGroupId = n;
}, g0 = (e, t, n, r) => {
  if (v0(e)) {
    Bi(e(r), t, n, r);
    return;
  }
  t.validators === null && (t.validators = []), t.validators.push(c0(n, e));
}, y0 = (e, t, n, r) => {
  const a = Object.entries(e), i = a.length;
  for (let s = 0; s < i; s++) {
    const [c, l] = a[s];
    Bi(l, Sd(t, c), n, r);
  }
}, Sd = (e, t) => {
  let n = e;
  const r = t.split(bo), a = r.length;
  for (let i = 0; i < a; i++) {
    const s = r[i];
    let c = n.nextPart.get(s);
    c || (c = xd(), n.nextPart.set(s, c)), n = c;
  }
  return n;
}, v0 = (e) => "isThemeGetter" in e && e.isThemeGetter === !0, b0 = (e) => {
  if (e < 1)
    return {
      get: () => {
      },
      set: () => {
      }
    };
  let t = 0, n = /* @__PURE__ */ Object.create(null), r = /* @__PURE__ */ Object.create(null);
  const a = (i, s) => {
    n[i] = s, t++, t > e && (t = 0, r = n, n = /* @__PURE__ */ Object.create(null));
  };
  return {
    get(i) {
      let s = n[i];
      if (s !== void 0)
        return s;
      if ((s = r[i]) !== void 0)
        return a(i, s), s;
    },
    set(i, s) {
      i in n ? n[i] = s : a(i, s);
    }
  };
}, ri = "!", kc = ":", w0 = [], Sc = (e, t, n, r, a) => ({
  modifiers: e,
  hasImportantModifier: t,
  baseClassName: n,
  maybePostfixModifierPosition: r,
  isExternal: a
}), _0 = (e) => {
  const {
    prefix: t,
    experimentalParseClassName: n
  } = e;
  let r = (a) => {
    const i = [];
    let s = 0, c = 0, l = 0, u;
    const p = a.length;
    for (let f = 0; f < p; f++) {
      const b = a[f];
      if (s === 0 && c === 0) {
        if (b === kc) {
          i.push(a.slice(l, f)), l = f + 1;
          continue;
        }
        if (b === "/") {
          u = f;
          continue;
        }
      }
      b === "[" ? s++ : b === "]" ? s-- : b === "(" ? c++ : b === ")" && c--;
    }
    const m = i.length === 0 ? a : a.slice(l);
    let h = m, g = !1;
    m.endsWith(ri) ? (h = m.slice(0, -1), g = !0) : (
      /**
       * In Tailwind CSS v3 the important modifier was at the start of the base class name. This is still supported for legacy reasons.
       * @see https://github.com/dcastil/tailwind-merge/issues/513#issuecomment-2614029864
       */
      m.startsWith(ri) && (h = m.slice(1), g = !0)
    );
    const v = u && u > l ? u - l : void 0;
    return Sc(i, g, h, v);
  };
  if (t) {
    const a = t + kc, i = r;
    r = (s) => s.startsWith(a) ? i(s.slice(a.length)) : Sc(w0, !1, s, void 0, !0);
  }
  if (n) {
    const a = r;
    r = (i) => n({
      className: i,
      parseClassName: a
    });
  }
  return r;
}, x0 = (e) => {
  const t = /* @__PURE__ */ new Map();
  return e.orderSensitiveModifiers.forEach((n, r) => {
    t.set(n, 1e6 + r);
  }), (n) => {
    const r = [];
    let a = [];
    for (let i = 0; i < n.length; i++) {
      const s = n[i], c = s[0] === "[", l = t.has(s);
      c || l ? (a.length > 0 && (a.sort(), r.push(...a), a = []), r.push(s)) : a.push(s);
    }
    return a.length > 0 && (a.sort(), r.push(...a)), r;
  };
}, k0 = (e) => ({
  cache: b0(e.cacheSize),
  parseClassName: _0(e),
  sortModifiers: x0(e),
  ...d0(e)
}), S0 = /\s+/, C0 = (e, t) => {
  const {
    parseClassName: n,
    getClassGroupId: r,
    getConflictingClassGroupIds: a,
    sortModifiers: i
  } = t, s = [], c = e.trim().split(S0);
  let l = "";
  for (let u = c.length - 1; u >= 0; u -= 1) {
    const p = c[u], {
      isExternal: m,
      modifiers: h,
      hasImportantModifier: g,
      baseClassName: v,
      maybePostfixModifierPosition: f
    } = n(p);
    if (m) {
      l = p + (l.length > 0 ? " " + l : l);
      continue;
    }
    let b = !!f, k = r(b ? v.substring(0, f) : v);
    if (!k) {
      if (!b) {
        l = p + (l.length > 0 ? " " + l : l);
        continue;
      }
      if (k = r(v), !k) {
        l = p + (l.length > 0 ? " " + l : l);
        continue;
      }
      b = !1;
    }
    const w = h.length === 0 ? "" : h.length === 1 ? h[0] : i(h).join(":"), _ = g ? w + ri : w, x = _ + k;
    if (s.indexOf(x) > -1)
      continue;
    s.push(x);
    const N = a(k, b);
    for (let I = 0; I < N.length; ++I) {
      const S = N[I];
      s.push(_ + S);
    }
    l = p + (l.length > 0 ? " " + l : l);
  }
  return l;
}, N0 = (...e) => {
  let t = 0, n, r, a = "";
  for (; t < e.length; )
    (n = e[t++]) && (r = Cd(n)) && (a && (a += " "), a += r);
  return a;
}, Cd = (e) => {
  if (typeof e == "string")
    return e;
  let t, n = "";
  for (let r = 0; r < e.length; r++)
    e[r] && (t = Cd(e[r])) && (n && (n += " "), n += t);
  return n;
}, A0 = (e, ...t) => {
  let n, r, a, i;
  const s = (l) => {
    const u = t.reduce((p, m) => m(p), e());
    return n = k0(u), r = n.cache.get, a = n.cache.set, i = c, c(l);
  }, c = (l) => {
    const u = r(l);
    if (u)
      return u;
    const p = C0(l, n);
    return a(l, p), p;
  };
  return i = s, (...l) => i(N0(...l));
}, T0 = [], nt = (e) => {
  const t = (n) => n[e] || T0;
  return t.isThemeGetter = !0, t;
}, Nd = /^\[(?:(\w[\w-]*):)?(.+)\]$/i, Ad = /^\((?:(\w[\w-]*):)?(.+)\)$/i, P0 = /^\d+\/\d+$/, E0 = /^(\d+(\.\d+)?)?(xs|sm|md|lg|xl)$/, I0 = /\d+(%|px|r?em|[sdl]?v([hwib]|min|max)|pt|pc|in|cm|mm|cap|ch|ex|r?lh|cq(w|h|i|b|min|max))|\b(calc|min|max|clamp)\(.+\)|^0$/, R0 = /^(rgba?|hsla?|hwb|(ok)?(lab|lch)|color-mix)\(.+\)$/, O0 = /^(inset_)?-?((\d+)?\.?(\d+)[a-z]+|0)_-?((\d+)?\.?(\d+)[a-z]+|0)/, M0 = /^(url|image|image-set|cross-fade|element|(repeating-)?(linear|radial|conic)-gradient)\(.+\)$/, Hn = (e) => P0.test(e), we = (e) => !!e && !Number.isNaN(Number(e)), mn = (e) => !!e && Number.isInteger(Number(e)), Ia = (e) => e.endsWith("%") && we(e.slice(0, -1)), sn = (e) => E0.test(e), D0 = () => !0, L0 = (e) => (
  // `colorFunctionRegex` check is necessary because color functions can have percentages in them which which would be incorrectly classified as lengths.
  // For example, `hsl(0 0% 0%)` would be classified as a length without this check.
  // I could also use lookbehind assertion in `lengthUnitRegex` but that isn't supported widely enough.
  I0.test(e) && !R0.test(e)
), Td = () => !1, $0 = (e) => O0.test(e), z0 = (e) => M0.test(e), F0 = (e) => !ie(e) && !se(e), B0 = (e) => sr(e, Id, Td), ie = (e) => Nd.test(e), Nn = (e) => sr(e, Rd, L0), Ra = (e) => sr(e, H0, we), Cc = (e) => sr(e, Pd, Td), j0 = (e) => sr(e, Ed, z0), Qr = (e) => sr(e, Od, $0), se = (e) => Ad.test(e), hr = (e) => cr(e, Rd), U0 = (e) => cr(e, q0), Nc = (e) => cr(e, Pd), W0 = (e) => cr(e, Id), V0 = (e) => cr(e, Ed), Yr = (e) => cr(e, Od, !0), sr = (e, t, n) => {
  const r = Nd.exec(e);
  return r ? r[1] ? t(r[1]) : n(r[2]) : !1;
}, cr = (e, t, n = !1) => {
  const r = Ad.exec(e);
  return r ? r[1] ? t(r[1]) : n : !1;
}, Pd = (e) => e === "position" || e === "percentage", Ed = (e) => e === "image" || e === "url", Id = (e) => e === "length" || e === "size" || e === "bg-size", Rd = (e) => e === "length", H0 = (e) => e === "number", q0 = (e) => e === "family-name", Od = (e) => e === "shadow", Z0 = () => {
  const e = nt("color"), t = nt("font"), n = nt("text"), r = nt("font-weight"), a = nt("tracking"), i = nt("leading"), s = nt("breakpoint"), c = nt("container"), l = nt("spacing"), u = nt("radius"), p = nt("shadow"), m = nt("inset-shadow"), h = nt("text-shadow"), g = nt("drop-shadow"), v = nt("blur"), f = nt("perspective"), b = nt("aspect"), k = nt("ease"), w = nt("animate"), _ = () => ["auto", "avoid", "all", "avoid-page", "page", "left", "right", "column"], x = () => [
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
  ], N = () => [...x(), se, ie], I = () => ["auto", "hidden", "clip", "visible", "scroll"], S = () => ["auto", "contain", "none"], A = () => [se, ie, l], W = () => [Hn, "full", "auto", ...A()], C = () => [mn, "none", "subgrid", se, ie], T = () => ["auto", {
    span: ["full", mn, se, ie]
  }, mn, se, ie], P = () => [mn, "auto", se, ie], L = () => ["auto", "min", "max", "fr", se, ie], F = () => ["start", "end", "center", "between", "around", "evenly", "stretch", "baseline", "center-safe", "end-safe"], $ = () => ["start", "end", "center", "stretch", "center-safe", "end-safe"], M = () => ["auto", ...A()], D = () => [Hn, "auto", "full", "dvw", "dvh", "lvw", "lvh", "svw", "svh", "min", "max", "fit", ...A()], O = () => [e, se, ie], V = () => [...x(), Nc, Cc, {
    position: [se, ie]
  }], E = () => ["no-repeat", {
    repeat: ["", "x", "y", "space", "round"]
  }], q = () => ["auto", "cover", "contain", W0, B0, {
    size: [se, ie]
  }], re = () => [Ia, hr, Nn], j = () => [
    // Deprecated since Tailwind CSS v4.0.0
    "",
    "none",
    "full",
    u,
    se,
    ie
  ], X = () => ["", we, hr, Nn], te = () => ["solid", "dashed", "dotted", "double"], ve = () => ["normal", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion", "hue", "saturation", "color", "luminosity"], B = () => [we, Ia, Nc, Cc], ee = () => [
    // Deprecated since Tailwind CSS v4.0.0
    "",
    "none",
    v,
    se,
    ie
  ], fe = () => ["none", we, se, ie], G = () => ["none", we, se, ie], oe = () => [we, se, ie], de = () => [Hn, "full", ...A()];
  return {
    cacheSize: 500,
    theme: {
      animate: ["spin", "ping", "pulse", "bounce"],
      aspect: ["video"],
      blur: [sn],
      breakpoint: [sn],
      color: [D0],
      container: [sn],
      "drop-shadow": [sn],
      ease: ["in", "out", "in-out"],
      font: [F0],
      "font-weight": ["thin", "extralight", "light", "normal", "medium", "semibold", "bold", "extrabold", "black"],
      "inset-shadow": [sn],
      leading: ["none", "tight", "snug", "normal", "relaxed", "loose"],
      perspective: ["dramatic", "near", "normal", "midrange", "distant", "none"],
      radius: [sn],
      shadow: [sn],
      spacing: ["px", we],
      text: [sn],
      "text-shadow": [sn],
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
        aspect: ["auto", "square", Hn, ie, se, b]
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
        columns: [we, ie, se, c]
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
        object: N()
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
        overscroll: S()
      }],
      /**
       * Overscroll Behavior X
       * @see https://tailwindcss.com/docs/overscroll-behavior
       */
      "overscroll-x": [{
        "overscroll-x": S()
      }],
      /**
       * Overscroll Behavior Y
       * @see https://tailwindcss.com/docs/overscroll-behavior
       */
      "overscroll-y": [{
        "overscroll-y": S()
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
        inset: W()
      }],
      /**
       * Right / Left
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      "inset-x": [{
        "inset-x": W()
      }],
      /**
       * Top / Bottom
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      "inset-y": [{
        "inset-y": W()
      }],
      /**
       * Start
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      start: [{
        start: W()
      }],
      /**
       * End
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      end: [{
        end: W()
      }],
      /**
       * Top
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      top: [{
        top: W()
      }],
      /**
       * Right
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      right: [{
        right: W()
      }],
      /**
       * Bottom
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      bottom: [{
        bottom: W()
      }],
      /**
       * Left
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      left: [{
        left: W()
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
        z: [mn, "auto", se, ie]
      }],
      // ------------------------
      // --- Flexbox and Grid ---
      // ------------------------
      /**
       * Flex Basis
       * @see https://tailwindcss.com/docs/flex-basis
       */
      basis: [{
        basis: [Hn, "full", "auto", c, ...A()]
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
        flex: [we, Hn, "auto", "initial", "none", ie]
      }],
      /**
       * Flex Grow
       * @see https://tailwindcss.com/docs/flex-grow
       */
      grow: [{
        grow: ["", we, se, ie]
      }],
      /**
       * Flex Shrink
       * @see https://tailwindcss.com/docs/flex-shrink
       */
      shrink: [{
        shrink: ["", we, se, ie]
      }],
      /**
       * Order
       * @see https://tailwindcss.com/docs/order
       */
      order: [{
        order: [mn, "first", "last", "none", se, ie]
      }],
      /**
       * Grid Template Columns
       * @see https://tailwindcss.com/docs/grid-template-columns
       */
      "grid-cols": [{
        "grid-cols": C()
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
        "col-start": P()
      }],
      /**
       * Grid Column End
       * @see https://tailwindcss.com/docs/grid-column
       */
      "col-end": [{
        "col-end": P()
      }],
      /**
       * Grid Template Rows
       * @see https://tailwindcss.com/docs/grid-template-rows
       */
      "grid-rows": [{
        "grid-rows": C()
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
        "row-start": P()
      }],
      /**
       * Grid Row End
       * @see https://tailwindcss.com/docs/grid-row
       */
      "row-end": [{
        "row-end": P()
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
        "auto-cols": L()
      }],
      /**
       * Grid Auto Rows
       * @see https://tailwindcss.com/docs/grid-auto-rows
       */
      "auto-rows": [{
        "auto-rows": L()
      }],
      /**
       * Gap
       * @see https://tailwindcss.com/docs/gap
       */
      gap: [{
        gap: A()
      }],
      /**
       * Gap X
       * @see https://tailwindcss.com/docs/gap
       */
      "gap-x": [{
        "gap-x": A()
      }],
      /**
       * Gap Y
       * @see https://tailwindcss.com/docs/gap
       */
      "gap-y": [{
        "gap-y": A()
      }],
      /**
       * Justify Content
       * @see https://tailwindcss.com/docs/justify-content
       */
      "justify-content": [{
        justify: [...F(), "normal"]
      }],
      /**
       * Justify Items
       * @see https://tailwindcss.com/docs/justify-items
       */
      "justify-items": [{
        "justify-items": [...$(), "normal"]
      }],
      /**
       * Justify Self
       * @see https://tailwindcss.com/docs/justify-self
       */
      "justify-self": [{
        "justify-self": ["auto", ...$()]
      }],
      /**
       * Align Content
       * @see https://tailwindcss.com/docs/align-content
       */
      "align-content": [{
        content: ["normal", ...F()]
      }],
      /**
       * Align Items
       * @see https://tailwindcss.com/docs/align-items
       */
      "align-items": [{
        items: [...$(), {
          baseline: ["", "last"]
        }]
      }],
      /**
       * Align Self
       * @see https://tailwindcss.com/docs/align-self
       */
      "align-self": [{
        self: ["auto", ...$(), {
          baseline: ["", "last"]
        }]
      }],
      /**
       * Place Content
       * @see https://tailwindcss.com/docs/place-content
       */
      "place-content": [{
        "place-content": F()
      }],
      /**
       * Place Items
       * @see https://tailwindcss.com/docs/place-items
       */
      "place-items": [{
        "place-items": [...$(), "baseline"]
      }],
      /**
       * Place Self
       * @see https://tailwindcss.com/docs/place-self
       */
      "place-self": [{
        "place-self": ["auto", ...$()]
      }],
      // Spacing
      /**
       * Padding
       * @see https://tailwindcss.com/docs/padding
       */
      p: [{
        p: A()
      }],
      /**
       * Padding X
       * @see https://tailwindcss.com/docs/padding
       */
      px: [{
        px: A()
      }],
      /**
       * Padding Y
       * @see https://tailwindcss.com/docs/padding
       */
      py: [{
        py: A()
      }],
      /**
       * Padding Start
       * @see https://tailwindcss.com/docs/padding
       */
      ps: [{
        ps: A()
      }],
      /**
       * Padding End
       * @see https://tailwindcss.com/docs/padding
       */
      pe: [{
        pe: A()
      }],
      /**
       * Padding Top
       * @see https://tailwindcss.com/docs/padding
       */
      pt: [{
        pt: A()
      }],
      /**
       * Padding Right
       * @see https://tailwindcss.com/docs/padding
       */
      pr: [{
        pr: A()
      }],
      /**
       * Padding Bottom
       * @see https://tailwindcss.com/docs/padding
       */
      pb: [{
        pb: A()
      }],
      /**
       * Padding Left
       * @see https://tailwindcss.com/docs/padding
       */
      pl: [{
        pl: A()
      }],
      /**
       * Margin
       * @see https://tailwindcss.com/docs/margin
       */
      m: [{
        m: M()
      }],
      /**
       * Margin X
       * @see https://tailwindcss.com/docs/margin
       */
      mx: [{
        mx: M()
      }],
      /**
       * Margin Y
       * @see https://tailwindcss.com/docs/margin
       */
      my: [{
        my: M()
      }],
      /**
       * Margin Start
       * @see https://tailwindcss.com/docs/margin
       */
      ms: [{
        ms: M()
      }],
      /**
       * Margin End
       * @see https://tailwindcss.com/docs/margin
       */
      me: [{
        me: M()
      }],
      /**
       * Margin Top
       * @see https://tailwindcss.com/docs/margin
       */
      mt: [{
        mt: M()
      }],
      /**
       * Margin Right
       * @see https://tailwindcss.com/docs/margin
       */
      mr: [{
        mr: M()
      }],
      /**
       * Margin Bottom
       * @see https://tailwindcss.com/docs/margin
       */
      mb: [{
        mb: M()
      }],
      /**
       * Margin Left
       * @see https://tailwindcss.com/docs/margin
       */
      ml: [{
        ml: M()
      }],
      /**
       * Space Between X
       * @see https://tailwindcss.com/docs/margin#adding-space-between-children
       */
      "space-x": [{
        "space-x": A()
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
        "space-y": A()
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
        size: D()
      }],
      /**
       * Width
       * @see https://tailwindcss.com/docs/width
       */
      w: [{
        w: [c, "screen", ...D()]
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
          ...D()
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
            screen: [s]
          },
          ...D()
        ]
      }],
      /**
       * Height
       * @see https://tailwindcss.com/docs/height
       */
      h: [{
        h: ["screen", "lh", ...D()]
      }],
      /**
       * Min-Height
       * @see https://tailwindcss.com/docs/min-height
       */
      "min-h": [{
        "min-h": ["screen", "lh", "none", ...D()]
      }],
      /**
       * Max-Height
       * @see https://tailwindcss.com/docs/max-height
       */
      "max-h": [{
        "max-h": ["screen", "lh", ...D()]
      }],
      // ------------------
      // --- Typography ---
      // ------------------
      /**
       * Font Size
       * @see https://tailwindcss.com/docs/font-size
       */
      "font-size": [{
        text: ["base", n, hr, Nn]
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
        font: [r, se, Ra]
      }],
      /**
       * Font Stretch
       * @see https://tailwindcss.com/docs/font-stretch
       */
      "font-stretch": [{
        "font-stretch": ["ultra-condensed", "extra-condensed", "condensed", "semi-condensed", "normal", "semi-expanded", "expanded", "extra-expanded", "ultra-expanded", Ia, ie]
      }],
      /**
       * Font Family
       * @see https://tailwindcss.com/docs/font-family
       */
      "font-family": [{
        font: [U0, ie, t]
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
        tracking: [a, se, ie]
      }],
      /**
       * Line Clamp
       * @see https://tailwindcss.com/docs/line-clamp
       */
      "line-clamp": [{
        "line-clamp": [we, "none", se, Ra]
      }],
      /**
       * Line Height
       * @see https://tailwindcss.com/docs/line-height
       */
      leading: [{
        leading: [
          /** Deprecated since Tailwind CSS v4.0.0. @see https://github.com/tailwindlabs/tailwindcss.com/issues/2027#issuecomment-2620152757 */
          i,
          ...A()
        ]
      }],
      /**
       * List Style Image
       * @see https://tailwindcss.com/docs/list-style-image
       */
      "list-image": [{
        "list-image": ["none", se, ie]
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
        list: ["disc", "decimal", "none", se, ie]
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
        placeholder: O()
      }],
      /**
       * Text Color
       * @see https://tailwindcss.com/docs/text-color
       */
      "text-color": [{
        text: O()
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
        decoration: [...te(), "wavy"]
      }],
      /**
       * Text Decoration Thickness
       * @see https://tailwindcss.com/docs/text-decoration-thickness
       */
      "text-decoration-thickness": [{
        decoration: [we, "from-font", "auto", se, Nn]
      }],
      /**
       * Text Decoration Color
       * @see https://tailwindcss.com/docs/text-decoration-color
       */
      "text-decoration-color": [{
        decoration: O()
      }],
      /**
       * Text Underline Offset
       * @see https://tailwindcss.com/docs/text-underline-offset
       */
      "underline-offset": [{
        "underline-offset": [we, "auto", se, ie]
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
        indent: A()
      }],
      /**
       * Vertical Alignment
       * @see https://tailwindcss.com/docs/vertical-align
       */
      "vertical-align": [{
        align: ["baseline", "top", "middle", "bottom", "text-top", "text-bottom", "sub", "super", se, ie]
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
        content: ["none", se, ie]
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
        bg: V()
      }],
      /**
       * Background Repeat
       * @see https://tailwindcss.com/docs/background-repeat
       */
      "bg-repeat": [{
        bg: E()
      }],
      /**
       * Background Size
       * @see https://tailwindcss.com/docs/background-size
       */
      "bg-size": [{
        bg: q()
      }],
      /**
       * Background Image
       * @see https://tailwindcss.com/docs/background-image
       */
      "bg-image": [{
        bg: ["none", {
          linear: [{
            to: ["t", "tr", "r", "br", "b", "bl", "l", "tl"]
          }, mn, se, ie],
          radial: ["", se, ie],
          conic: [mn, se, ie]
        }, V0, j0]
      }],
      /**
       * Background Color
       * @see https://tailwindcss.com/docs/background-color
       */
      "bg-color": [{
        bg: O()
      }],
      /**
       * Gradient Color Stops From Position
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-from-pos": [{
        from: re()
      }],
      /**
       * Gradient Color Stops Via Position
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-via-pos": [{
        via: re()
      }],
      /**
       * Gradient Color Stops To Position
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-to-pos": [{
        to: re()
      }],
      /**
       * Gradient Color Stops From
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-from": [{
        from: O()
      }],
      /**
       * Gradient Color Stops Via
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-via": [{
        via: O()
      }],
      /**
       * Gradient Color Stops To
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-to": [{
        to: O()
      }],
      // ---------------
      // --- Borders ---
      // ---------------
      /**
       * Border Radius
       * @see https://tailwindcss.com/docs/border-radius
       */
      rounded: [{
        rounded: j()
      }],
      /**
       * Border Radius Start
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-s": [{
        "rounded-s": j()
      }],
      /**
       * Border Radius End
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-e": [{
        "rounded-e": j()
      }],
      /**
       * Border Radius Top
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-t": [{
        "rounded-t": j()
      }],
      /**
       * Border Radius Right
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-r": [{
        "rounded-r": j()
      }],
      /**
       * Border Radius Bottom
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-b": [{
        "rounded-b": j()
      }],
      /**
       * Border Radius Left
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-l": [{
        "rounded-l": j()
      }],
      /**
       * Border Radius Start Start
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-ss": [{
        "rounded-ss": j()
      }],
      /**
       * Border Radius Start End
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-se": [{
        "rounded-se": j()
      }],
      /**
       * Border Radius End End
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-ee": [{
        "rounded-ee": j()
      }],
      /**
       * Border Radius End Start
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-es": [{
        "rounded-es": j()
      }],
      /**
       * Border Radius Top Left
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-tl": [{
        "rounded-tl": j()
      }],
      /**
       * Border Radius Top Right
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-tr": [{
        "rounded-tr": j()
      }],
      /**
       * Border Radius Bottom Right
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-br": [{
        "rounded-br": j()
      }],
      /**
       * Border Radius Bottom Left
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-bl": [{
        "rounded-bl": j()
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
        border: [...te(), "hidden", "none"]
      }],
      /**
       * Divide Style
       * @see https://tailwindcss.com/docs/border-style#setting-the-divider-style
       */
      "divide-style": [{
        divide: [...te(), "hidden", "none"]
      }],
      /**
       * Border Color
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color": [{
        border: O()
      }],
      /**
       * Border Color X
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-x": [{
        "border-x": O()
      }],
      /**
       * Border Color Y
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-y": [{
        "border-y": O()
      }],
      /**
       * Border Color S
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-s": [{
        "border-s": O()
      }],
      /**
       * Border Color E
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-e": [{
        "border-e": O()
      }],
      /**
       * Border Color Top
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-t": [{
        "border-t": O()
      }],
      /**
       * Border Color Right
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-r": [{
        "border-r": O()
      }],
      /**
       * Border Color Bottom
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-b": [{
        "border-b": O()
      }],
      /**
       * Border Color Left
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-l": [{
        "border-l": O()
      }],
      /**
       * Divide Color
       * @see https://tailwindcss.com/docs/divide-color
       */
      "divide-color": [{
        divide: O()
      }],
      /**
       * Outline Style
       * @see https://tailwindcss.com/docs/outline-style
       */
      "outline-style": [{
        outline: [...te(), "none", "hidden"]
      }],
      /**
       * Outline Offset
       * @see https://tailwindcss.com/docs/outline-offset
       */
      "outline-offset": [{
        "outline-offset": [we, se, ie]
      }],
      /**
       * Outline Width
       * @see https://tailwindcss.com/docs/outline-width
       */
      "outline-w": [{
        outline: ["", we, hr, Nn]
      }],
      /**
       * Outline Color
       * @see https://tailwindcss.com/docs/outline-color
       */
      "outline-color": [{
        outline: O()
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
          p,
          Yr,
          Qr
        ]
      }],
      /**
       * Box Shadow Color
       * @see https://tailwindcss.com/docs/box-shadow#setting-the-shadow-color
       */
      "shadow-color": [{
        shadow: O()
      }],
      /**
       * Inset Box Shadow
       * @see https://tailwindcss.com/docs/box-shadow#adding-an-inset-shadow
       */
      "inset-shadow": [{
        "inset-shadow": ["none", m, Yr, Qr]
      }],
      /**
       * Inset Box Shadow Color
       * @see https://tailwindcss.com/docs/box-shadow#setting-the-inset-shadow-color
       */
      "inset-shadow-color": [{
        "inset-shadow": O()
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
        ring: O()
      }],
      /**
       * Ring Offset Width
       * @see https://v3.tailwindcss.com/docs/ring-offset-width
       * @deprecated since Tailwind CSS v4.0.0
       * @see https://github.com/tailwindlabs/tailwindcss/blob/v4.0.0/packages/tailwindcss/src/utilities.ts#L4158
       */
      "ring-offset-w": [{
        "ring-offset": [we, Nn]
      }],
      /**
       * Ring Offset Color
       * @see https://v3.tailwindcss.com/docs/ring-offset-color
       * @deprecated since Tailwind CSS v4.0.0
       * @see https://github.com/tailwindlabs/tailwindcss/blob/v4.0.0/packages/tailwindcss/src/utilities.ts#L4158
       */
      "ring-offset-color": [{
        "ring-offset": O()
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
        "inset-ring": O()
      }],
      /**
       * Text Shadow
       * @see https://tailwindcss.com/docs/text-shadow
       */
      "text-shadow": [{
        "text-shadow": ["none", h, Yr, Qr]
      }],
      /**
       * Text Shadow Color
       * @see https://tailwindcss.com/docs/text-shadow#setting-the-shadow-color
       */
      "text-shadow-color": [{
        "text-shadow": O()
      }],
      /**
       * Opacity
       * @see https://tailwindcss.com/docs/opacity
       */
      opacity: [{
        opacity: [we, se, ie]
      }],
      /**
       * Mix Blend Mode
       * @see https://tailwindcss.com/docs/mix-blend-mode
       */
      "mix-blend": [{
        "mix-blend": [...ve(), "plus-darker", "plus-lighter"]
      }],
      /**
       * Background Blend Mode
       * @see https://tailwindcss.com/docs/background-blend-mode
       */
      "bg-blend": [{
        "bg-blend": ve()
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
        "mask-linear": [we]
      }],
      "mask-image-linear-from-pos": [{
        "mask-linear-from": B()
      }],
      "mask-image-linear-to-pos": [{
        "mask-linear-to": B()
      }],
      "mask-image-linear-from-color": [{
        "mask-linear-from": O()
      }],
      "mask-image-linear-to-color": [{
        "mask-linear-to": O()
      }],
      "mask-image-t-from-pos": [{
        "mask-t-from": B()
      }],
      "mask-image-t-to-pos": [{
        "mask-t-to": B()
      }],
      "mask-image-t-from-color": [{
        "mask-t-from": O()
      }],
      "mask-image-t-to-color": [{
        "mask-t-to": O()
      }],
      "mask-image-r-from-pos": [{
        "mask-r-from": B()
      }],
      "mask-image-r-to-pos": [{
        "mask-r-to": B()
      }],
      "mask-image-r-from-color": [{
        "mask-r-from": O()
      }],
      "mask-image-r-to-color": [{
        "mask-r-to": O()
      }],
      "mask-image-b-from-pos": [{
        "mask-b-from": B()
      }],
      "mask-image-b-to-pos": [{
        "mask-b-to": B()
      }],
      "mask-image-b-from-color": [{
        "mask-b-from": O()
      }],
      "mask-image-b-to-color": [{
        "mask-b-to": O()
      }],
      "mask-image-l-from-pos": [{
        "mask-l-from": B()
      }],
      "mask-image-l-to-pos": [{
        "mask-l-to": B()
      }],
      "mask-image-l-from-color": [{
        "mask-l-from": O()
      }],
      "mask-image-l-to-color": [{
        "mask-l-to": O()
      }],
      "mask-image-x-from-pos": [{
        "mask-x-from": B()
      }],
      "mask-image-x-to-pos": [{
        "mask-x-to": B()
      }],
      "mask-image-x-from-color": [{
        "mask-x-from": O()
      }],
      "mask-image-x-to-color": [{
        "mask-x-to": O()
      }],
      "mask-image-y-from-pos": [{
        "mask-y-from": B()
      }],
      "mask-image-y-to-pos": [{
        "mask-y-to": B()
      }],
      "mask-image-y-from-color": [{
        "mask-y-from": O()
      }],
      "mask-image-y-to-color": [{
        "mask-y-to": O()
      }],
      "mask-image-radial": [{
        "mask-radial": [se, ie]
      }],
      "mask-image-radial-from-pos": [{
        "mask-radial-from": B()
      }],
      "mask-image-radial-to-pos": [{
        "mask-radial-to": B()
      }],
      "mask-image-radial-from-color": [{
        "mask-radial-from": O()
      }],
      "mask-image-radial-to-color": [{
        "mask-radial-to": O()
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
        "mask-conic": [we]
      }],
      "mask-image-conic-from-pos": [{
        "mask-conic-from": B()
      }],
      "mask-image-conic-to-pos": [{
        "mask-conic-to": B()
      }],
      "mask-image-conic-from-color": [{
        "mask-conic-from": O()
      }],
      "mask-image-conic-to-color": [{
        "mask-conic-to": O()
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
        mask: V()
      }],
      /**
       * Mask Repeat
       * @see https://tailwindcss.com/docs/mask-repeat
       */
      "mask-repeat": [{
        mask: E()
      }],
      /**
       * Mask Size
       * @see https://tailwindcss.com/docs/mask-size
       */
      "mask-size": [{
        mask: q()
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
        mask: ["none", se, ie]
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
          se,
          ie
        ]
      }],
      /**
       * Blur
       * @see https://tailwindcss.com/docs/blur
       */
      blur: [{
        blur: ee()
      }],
      /**
       * Brightness
       * @see https://tailwindcss.com/docs/brightness
       */
      brightness: [{
        brightness: [we, se, ie]
      }],
      /**
       * Contrast
       * @see https://tailwindcss.com/docs/contrast
       */
      contrast: [{
        contrast: [we, se, ie]
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
          Yr,
          Qr
        ]
      }],
      /**
       * Drop Shadow Color
       * @see https://tailwindcss.com/docs/filter-drop-shadow#setting-the-shadow-color
       */
      "drop-shadow-color": [{
        "drop-shadow": O()
      }],
      /**
       * Grayscale
       * @see https://tailwindcss.com/docs/grayscale
       */
      grayscale: [{
        grayscale: ["", we, se, ie]
      }],
      /**
       * Hue Rotate
       * @see https://tailwindcss.com/docs/hue-rotate
       */
      "hue-rotate": [{
        "hue-rotate": [we, se, ie]
      }],
      /**
       * Invert
       * @see https://tailwindcss.com/docs/invert
       */
      invert: [{
        invert: ["", we, se, ie]
      }],
      /**
       * Saturate
       * @see https://tailwindcss.com/docs/saturate
       */
      saturate: [{
        saturate: [we, se, ie]
      }],
      /**
       * Sepia
       * @see https://tailwindcss.com/docs/sepia
       */
      sepia: [{
        sepia: ["", we, se, ie]
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
          se,
          ie
        ]
      }],
      /**
       * Backdrop Blur
       * @see https://tailwindcss.com/docs/backdrop-blur
       */
      "backdrop-blur": [{
        "backdrop-blur": ee()
      }],
      /**
       * Backdrop Brightness
       * @see https://tailwindcss.com/docs/backdrop-brightness
       */
      "backdrop-brightness": [{
        "backdrop-brightness": [we, se, ie]
      }],
      /**
       * Backdrop Contrast
       * @see https://tailwindcss.com/docs/backdrop-contrast
       */
      "backdrop-contrast": [{
        "backdrop-contrast": [we, se, ie]
      }],
      /**
       * Backdrop Grayscale
       * @see https://tailwindcss.com/docs/backdrop-grayscale
       */
      "backdrop-grayscale": [{
        "backdrop-grayscale": ["", we, se, ie]
      }],
      /**
       * Backdrop Hue Rotate
       * @see https://tailwindcss.com/docs/backdrop-hue-rotate
       */
      "backdrop-hue-rotate": [{
        "backdrop-hue-rotate": [we, se, ie]
      }],
      /**
       * Backdrop Invert
       * @see https://tailwindcss.com/docs/backdrop-invert
       */
      "backdrop-invert": [{
        "backdrop-invert": ["", we, se, ie]
      }],
      /**
       * Backdrop Opacity
       * @see https://tailwindcss.com/docs/backdrop-opacity
       */
      "backdrop-opacity": [{
        "backdrop-opacity": [we, se, ie]
      }],
      /**
       * Backdrop Saturate
       * @see https://tailwindcss.com/docs/backdrop-saturate
       */
      "backdrop-saturate": [{
        "backdrop-saturate": [we, se, ie]
      }],
      /**
       * Backdrop Sepia
       * @see https://tailwindcss.com/docs/backdrop-sepia
       */
      "backdrop-sepia": [{
        "backdrop-sepia": ["", we, se, ie]
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
        "border-spacing": A()
      }],
      /**
       * Border Spacing X
       * @see https://tailwindcss.com/docs/border-spacing
       */
      "border-spacing-x": [{
        "border-spacing-x": A()
      }],
      /**
       * Border Spacing Y
       * @see https://tailwindcss.com/docs/border-spacing
       */
      "border-spacing-y": [{
        "border-spacing-y": A()
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
        transition: ["", "all", "colors", "opacity", "shadow", "transform", "none", se, ie]
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
        duration: [we, "initial", se, ie]
      }],
      /**
       * Transition Timing Function
       * @see https://tailwindcss.com/docs/transition-timing-function
       */
      ease: [{
        ease: ["linear", "initial", k, se, ie]
      }],
      /**
       * Transition Delay
       * @see https://tailwindcss.com/docs/transition-delay
       */
      delay: [{
        delay: [we, se, ie]
      }],
      /**
       * Animation
       * @see https://tailwindcss.com/docs/animation
       */
      animate: [{
        animate: ["none", w, se, ie]
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
        perspective: [f, se, ie]
      }],
      /**
       * Perspective Origin
       * @see https://tailwindcss.com/docs/perspective-origin
       */
      "perspective-origin": [{
        "perspective-origin": N()
      }],
      /**
       * Rotate
       * @see https://tailwindcss.com/docs/rotate
       */
      rotate: [{
        rotate: fe()
      }],
      /**
       * Rotate X
       * @see https://tailwindcss.com/docs/rotate
       */
      "rotate-x": [{
        "rotate-x": fe()
      }],
      /**
       * Rotate Y
       * @see https://tailwindcss.com/docs/rotate
       */
      "rotate-y": [{
        "rotate-y": fe()
      }],
      /**
       * Rotate Z
       * @see https://tailwindcss.com/docs/rotate
       */
      "rotate-z": [{
        "rotate-z": fe()
      }],
      /**
       * Scale
       * @see https://tailwindcss.com/docs/scale
       */
      scale: [{
        scale: G()
      }],
      /**
       * Scale X
       * @see https://tailwindcss.com/docs/scale
       */
      "scale-x": [{
        "scale-x": G()
      }],
      /**
       * Scale Y
       * @see https://tailwindcss.com/docs/scale
       */
      "scale-y": [{
        "scale-y": G()
      }],
      /**
       * Scale Z
       * @see https://tailwindcss.com/docs/scale
       */
      "scale-z": [{
        "scale-z": G()
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
        skew: oe()
      }],
      /**
       * Skew X
       * @see https://tailwindcss.com/docs/skew
       */
      "skew-x": [{
        "skew-x": oe()
      }],
      /**
       * Skew Y
       * @see https://tailwindcss.com/docs/skew
       */
      "skew-y": [{
        "skew-y": oe()
      }],
      /**
       * Transform
       * @see https://tailwindcss.com/docs/transform
       */
      transform: [{
        transform: [se, ie, "", "none", "gpu", "cpu"]
      }],
      /**
       * Transform Origin
       * @see https://tailwindcss.com/docs/transform-origin
       */
      "transform-origin": [{
        origin: N()
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
        translate: de()
      }],
      /**
       * Translate X
       * @see https://tailwindcss.com/docs/translate
       */
      "translate-x": [{
        "translate-x": de()
      }],
      /**
       * Translate Y
       * @see https://tailwindcss.com/docs/translate
       */
      "translate-y": [{
        "translate-y": de()
      }],
      /**
       * Translate Z
       * @see https://tailwindcss.com/docs/translate
       */
      "translate-z": [{
        "translate-z": de()
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
        accent: O()
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
        caret: O()
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
        cursor: ["auto", "default", "pointer", "wait", "text", "move", "help", "not-allowed", "none", "context-menu", "progress", "cell", "crosshair", "vertical-text", "alias", "copy", "no-drop", "grab", "grabbing", "all-scroll", "col-resize", "row-resize", "n-resize", "e-resize", "s-resize", "w-resize", "ne-resize", "nw-resize", "se-resize", "sw-resize", "ew-resize", "ns-resize", "nesw-resize", "nwse-resize", "zoom-in", "zoom-out", se, ie]
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
        "scroll-m": A()
      }],
      /**
       * Scroll Margin X
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mx": [{
        "scroll-mx": A()
      }],
      /**
       * Scroll Margin Y
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-my": [{
        "scroll-my": A()
      }],
      /**
       * Scroll Margin Start
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-ms": [{
        "scroll-ms": A()
      }],
      /**
       * Scroll Margin End
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-me": [{
        "scroll-me": A()
      }],
      /**
       * Scroll Margin Top
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mt": [{
        "scroll-mt": A()
      }],
      /**
       * Scroll Margin Right
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mr": [{
        "scroll-mr": A()
      }],
      /**
       * Scroll Margin Bottom
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mb": [{
        "scroll-mb": A()
      }],
      /**
       * Scroll Margin Left
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-ml": [{
        "scroll-ml": A()
      }],
      /**
       * Scroll Padding
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-p": [{
        "scroll-p": A()
      }],
      /**
       * Scroll Padding X
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-px": [{
        "scroll-px": A()
      }],
      /**
       * Scroll Padding Y
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-py": [{
        "scroll-py": A()
      }],
      /**
       * Scroll Padding Start
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-ps": [{
        "scroll-ps": A()
      }],
      /**
       * Scroll Padding End
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pe": [{
        "scroll-pe": A()
      }],
      /**
       * Scroll Padding Top
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pt": [{
        "scroll-pt": A()
      }],
      /**
       * Scroll Padding Right
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pr": [{
        "scroll-pr": A()
      }],
      /**
       * Scroll Padding Bottom
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pb": [{
        "scroll-pb": A()
      }],
      /**
       * Scroll Padding Left
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pl": [{
        "scroll-pl": A()
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
        "will-change": ["auto", "scroll", "contents", "transform", se, ie]
      }],
      // -----------
      // --- SVG ---
      // -----------
      /**
       * Fill
       * @see https://tailwindcss.com/docs/fill
       */
      fill: [{
        fill: ["none", ...O()]
      }],
      /**
       * Stroke Width
       * @see https://tailwindcss.com/docs/stroke-width
       */
      "stroke-w": [{
        stroke: [we, hr, Nn, Ra]
      }],
      /**
       * Stroke
       * @see https://tailwindcss.com/docs/stroke
       */
      stroke: [{
        stroke: ["none", ...O()]
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
}, G0 = /* @__PURE__ */ A0(Z0);
function Z(...e) {
  return G0(_d(e));
}
const Q0 = Fi(
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
), le = y.forwardRef(
  ({ className: e, variant: t, size: n, asChild: r, ...a }, i) => /* @__PURE__ */ o(
    r ? t0 : "button",
    {
      className: Z(Q0({ variant: t, size: n }), e),
      ref: i,
      ...a
    }
  )
);
le.displayName = "Button";
const Y0 = Fi(
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
  return /* @__PURE__ */ o("div", { className: Z(Y0({ variant: t }), e), ...n });
}
const zt = y.forwardRef(
  ({ className: e, ...t }, n) => /* @__PURE__ */ o(
    "div",
    {
      ref: n,
      className: Z(
        "rounded-xl border border-neutral-200 bg-white text-neutral-950 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50",
        e
      ),
      ...t
    }
  )
);
zt.displayName = "Card";
const Er = y.forwardRef(
  ({ className: e, ...t }, n) => /* @__PURE__ */ o("div", { ref: n, className: Z("flex flex-col space-y-1.5 p-6", e), ...t })
);
Er.displayName = "CardHeader";
const Ir = y.forwardRef(
  ({ className: e, ...t }, n) => /* @__PURE__ */ o(
    "h3",
    {
      ref: n,
      className: Z("text-lg font-semibold leading-none tracking-tight", e),
      ...t
    }
  )
);
Ir.displayName = "CardTitle";
const Md = y.forwardRef(({ className: e, ...t }, n) => /* @__PURE__ */ o(
  "p",
  {
    ref: n,
    className: Z("text-sm text-neutral-500 dark:text-neutral-400", e),
    ...t
  }
));
Md.displayName = "CardDescription";
const Jt = y.forwardRef(
  ({ className: e, ...t }, n) => /* @__PURE__ */ o("div", { ref: n, className: Z("p-6 pt-0", e), ...t })
);
Jt.displayName = "CardContent";
const Dd = y.forwardRef(
  ({ className: e, ...t }, n) => /* @__PURE__ */ o("div", { ref: n, className: Z("flex items-center p-6 pt-0", e), ...t })
);
Dd.displayName = "CardFooter";
const Ye = y.forwardRef(({ className: e, ...t }, n) => /* @__PURE__ */ o(
  "input",
  {
    ref: n,
    className: Z(
      "flex h-10 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50 dark:placeholder:text-neutral-400 dark:focus-visible:ring-neutral-50/20",
      e
    ),
    ...t
  }
));
Ye.displayName = "Input";
const ht = y.forwardRef(
  ({ className: e, ...t }, n) => /* @__PURE__ */ o(
    "label",
    {
      ref: n,
      className: Z("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", e),
      ...t
    }
  )
);
ht.displayName = "Label";
var K0 = [
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
], J0 = K0.reduce((e, t) => {
  const n = /* @__PURE__ */ bd(`Primitive.${t}`), r = y.forwardRef((a, i) => {
    const { asChild: s, ...c } = a, l = s ? n : t;
    return typeof window < "u" && (window[Symbol.for("radix-ui")] = !0), /* @__PURE__ */ o(l, { ...c, ref: i });
  });
  return r.displayName = `Primitive.${t}`, { ...e, [t]: r };
}, {}), X0 = "Separator", Ac = "horizontal", ew = ["horizontal", "vertical"], Ld = y.forwardRef((e, t) => {
  const { decorative: n, orientation: r = Ac, ...a } = e, i = tw(r) ? r : Ac, c = n ? { role: "none" } : { "aria-orientation": i === "vertical" ? i : void 0, role: "separator" };
  return /* @__PURE__ */ o(
    J0.div,
    {
      "data-orientation": i,
      ...c,
      ...a,
      ref: t
    }
  );
});
Ld.displayName = X0;
function tw(e) {
  return ew.includes(e);
}
var $d = Ld;
const Et = y.forwardRef(({ className: e, orientation: t = "horizontal", decorative: n = !0, ...r }, a) => /* @__PURE__ */ o(
  $d,
  {
    ref: a,
    decorative: n,
    orientation: t,
    className: Z(
      "shrink-0 bg-neutral-200 dark:bg-neutral-800",
      t === "horizontal" ? "h-px w-full" : "h-full w-px",
      e
    ),
    ...r
  }
));
Et.displayName = $d.displayName;
function Ve({ className: e, ...t }) {
  return /* @__PURE__ */ o(
    "div",
    {
      className: Z("animate-pulse rounded-md bg-neutral-100 dark:bg-neutral-800", e),
      ...t
    }
  );
}
function Tc(e, [t, n]) {
  return Math.min(n, Math.max(t, e));
}
function Ce(e, t, { checkForDefaultPrevented: n = !0 } = {}) {
  return function(a) {
    if (e?.(a), n === !1 || !a.defaultPrevented)
      return t?.(a);
  };
}
function nw(e, t) {
  const n = y.createContext(t), r = (i) => {
    const { children: s, ...c } = i, l = y.useMemo(() => c, Object.values(c));
    return /* @__PURE__ */ o(n.Provider, { value: l, children: s });
  };
  r.displayName = e + "Provider";
  function a(i) {
    const s = y.useContext(n);
    if (s) return s;
    if (t !== void 0) return t;
    throw new Error(`\`${i}\` must be used within \`${e}\``);
  }
  return [r, a];
}
function wn(e, t = []) {
  let n = [];
  function r(i, s) {
    const c = y.createContext(s), l = n.length;
    n = [...n, s];
    const u = (m) => {
      const { scope: h, children: g, ...v } = m, f = h?.[e]?.[l] || c, b = y.useMemo(() => v, Object.values(v));
      return /* @__PURE__ */ o(f.Provider, { value: b, children: g });
    };
    u.displayName = i + "Provider";
    function p(m, h) {
      const g = h?.[e]?.[l] || c, v = y.useContext(g);
      if (v) return v;
      if (s !== void 0) return s;
      throw new Error(`\`${m}\` must be used within \`${i}\``);
    }
    return [u, p];
  }
  const a = () => {
    const i = n.map((s) => y.createContext(s));
    return function(c) {
      const l = c?.[e] || i;
      return y.useMemo(
        () => ({ [`__scope${e}`]: { ...c, [e]: l } }),
        [c, l]
      );
    };
  };
  return a.scopeName = e, [r, rw(a, ...t)];
}
function rw(...e) {
  const t = e[0];
  if (e.length === 1) return t;
  const n = () => {
    const r = e.map((a) => ({
      useScope: a(),
      scopeName: a.scopeName
    }));
    return function(i) {
      const s = r.reduce((c, { useScope: l, scopeName: u }) => {
        const m = l(i)[`__scope${u}`];
        return { ...c, ...m };
      }, {});
      return y.useMemo(() => ({ [`__scope${t.scopeName}`]: s }), [s]);
    };
  };
  return n.scopeName = t.scopeName, n;
}
// @__NO_SIDE_EFFECTS__
function Pc(e) {
  const t = /* @__PURE__ */ ow(e), n = y.forwardRef((r, a) => {
    const { children: i, ...s } = r, c = y.Children.toArray(i), l = c.find(iw);
    if (l) {
      const u = l.props.children, p = c.map((m) => m === l ? y.Children.count(u) > 1 ? y.Children.only(null) : y.isValidElement(u) ? u.props.children : null : m);
      return /* @__PURE__ */ o(t, { ...s, ref: a, children: y.isValidElement(u) ? y.cloneElement(u, void 0, p) : null });
    }
    return /* @__PURE__ */ o(t, { ...s, ref: a, children: i });
  });
  return n.displayName = `${e}.Slot`, n;
}
// @__NO_SIDE_EFFECTS__
function ow(e) {
  const t = y.forwardRef((n, r) => {
    const { children: a, ...i } = n;
    if (y.isValidElement(a)) {
      const s = cw(a), c = sw(i, a.props);
      return a.type !== y.Fragment && (c.ref = r ? ir(r, s) : s), y.cloneElement(a, c);
    }
    return y.Children.count(a) > 1 ? y.Children.only(null) : null;
  });
  return t.displayName = `${e}.SlotClone`, t;
}
var aw = Symbol("radix.slottable");
function iw(e) {
  return y.isValidElement(e) && typeof e.type == "function" && "__radixId" in e.type && e.type.__radixId === aw;
}
function sw(e, t) {
  const n = { ...t };
  for (const r in t) {
    const a = e[r], i = t[r];
    /^on[A-Z]/.test(r) ? a && i ? n[r] = (...c) => {
      const l = i(...c);
      return a(...c), l;
    } : a && (n[r] = a) : r === "style" ? n[r] = { ...a, ...i } : r === "className" && (n[r] = [a, i].filter(Boolean).join(" "));
  }
  return { ...e, ...n };
}
function cw(e) {
  let t = Object.getOwnPropertyDescriptor(e.props, "ref")?.get, n = t && "isReactWarning" in t && t.isReactWarning;
  return n ? e.ref : (t = Object.getOwnPropertyDescriptor(e, "ref")?.get, n = t && "isReactWarning" in t && t.isReactWarning, n ? e.props.ref : e.props.ref || e.ref);
}
function ji(e) {
  const t = e + "CollectionProvider", [n, r] = wn(t), [a, i] = n(
    t,
    { collectionRef: { current: null }, itemMap: /* @__PURE__ */ new Map() }
  ), s = (f) => {
    const { scope: b, children: k } = f, w = U.useRef(null), _ = U.useRef(/* @__PURE__ */ new Map()).current;
    return /* @__PURE__ */ o(a, { scope: b, itemMap: _, collectionRef: w, children: k });
  };
  s.displayName = t;
  const c = e + "CollectionSlot", l = /* @__PURE__ */ Pc(c), u = U.forwardRef(
    (f, b) => {
      const { scope: k, children: w } = f, _ = i(c, k), x = $e(b, _.collectionRef);
      return /* @__PURE__ */ o(l, { ref: x, children: w });
    }
  );
  u.displayName = c;
  const p = e + "CollectionItemSlot", m = "data-radix-collection-item", h = /* @__PURE__ */ Pc(p), g = U.forwardRef(
    (f, b) => {
      const { scope: k, children: w, ..._ } = f, x = U.useRef(null), N = $e(b, x), I = i(p, k);
      return U.useEffect(() => (I.itemMap.set(x, { ref: x, ..._ }), () => void I.itemMap.delete(x))), /* @__PURE__ */ o(h, { [m]: "", ref: N, children: w });
    }
  );
  g.displayName = p;
  function v(f) {
    const b = i(e + "CollectionConsumer", f);
    return U.useCallback(() => {
      const w = b.collectionRef.current;
      if (!w) return [];
      const _ = Array.from(w.querySelectorAll(`[${m}]`));
      return Array.from(b.itemMap.values()).sort(
        (I, S) => _.indexOf(I.ref.current) - _.indexOf(S.ref.current)
      );
    }, [b.collectionRef, b.itemMap]);
  }
  return [
    { Provider: s, Slot: u, ItemSlot: g },
    v,
    r
  ];
}
var lw = y.createContext(void 0);
function Uo(e) {
  const t = y.useContext(lw);
  return e || t || "ltr";
}
// @__NO_SIDE_EFFECTS__
function dw(e) {
  const t = /* @__PURE__ */ uw(e), n = y.forwardRef((r, a) => {
    const { children: i, ...s } = r, c = y.Children.toArray(i), l = c.find(pw);
    if (l) {
      const u = l.props.children, p = c.map((m) => m === l ? y.Children.count(u) > 1 ? y.Children.only(null) : y.isValidElement(u) ? u.props.children : null : m);
      return /* @__PURE__ */ o(t, { ...s, ref: a, children: y.isValidElement(u) ? y.cloneElement(u, void 0, p) : null });
    }
    return /* @__PURE__ */ o(t, { ...s, ref: a, children: i });
  });
  return n.displayName = `${e}.Slot`, n;
}
// @__NO_SIDE_EFFECTS__
function uw(e) {
  const t = y.forwardRef((n, r) => {
    const { children: a, ...i } = n;
    if (y.isValidElement(a)) {
      const s = hw(a), c = fw(i, a.props);
      return a.type !== y.Fragment && (c.ref = r ? ir(r, s) : s), y.cloneElement(a, c);
    }
    return y.Children.count(a) > 1 ? y.Children.only(null) : null;
  });
  return t.displayName = `${e}.SlotClone`, t;
}
var mw = Symbol("radix.slottable");
function pw(e) {
  return y.isValidElement(e) && typeof e.type == "function" && "__radixId" in e.type && e.type.__radixId === mw;
}
function fw(e, t) {
  const n = { ...t };
  for (const r in t) {
    const a = e[r], i = t[r];
    /^on[A-Z]/.test(r) ? a && i ? n[r] = (...c) => {
      const l = i(...c);
      return a(...c), l;
    } : a && (n[r] = a) : r === "style" ? n[r] = { ...a, ...i } : r === "className" && (n[r] = [a, i].filter(Boolean).join(" "));
  }
  return { ...e, ...n };
}
function hw(e) {
  let t = Object.getOwnPropertyDescriptor(e.props, "ref")?.get, n = t && "isReactWarning" in t && t.isReactWarning;
  return n ? e.ref : (t = Object.getOwnPropertyDescriptor(e, "ref")?.get, n = t && "isReactWarning" in t && t.isReactWarning, n ? e.props.ref : e.props.ref || e.ref);
}
var gw = [
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
], xe = gw.reduce((e, t) => {
  const n = /* @__PURE__ */ dw(`Primitive.${t}`), r = y.forwardRef((a, i) => {
    const { asChild: s, ...c } = a, l = s ? n : t;
    return typeof window < "u" && (window[Symbol.for("radix-ui")] = !0), /* @__PURE__ */ o(l, { ...c, ref: i });
  });
  return r.displayName = `Primitive.${t}`, { ...e, [t]: r };
}, {});
function yw(e, t) {
  e && Do.flushSync(() => e.dispatchEvent(t));
}
function fn(e) {
  const t = y.useRef(e);
  return y.useEffect(() => {
    t.current = e;
  }), y.useMemo(() => (...n) => t.current?.(...n), []);
}
function vw(e, t = globalThis?.document) {
  const n = fn(e);
  y.useEffect(() => {
    const r = (a) => {
      a.key === "Escape" && n(a);
    };
    return t.addEventListener("keydown", r, { capture: !0 }), () => t.removeEventListener("keydown", r, { capture: !0 });
  }, [n, t]);
}
var bw = "DismissableLayer", oi = "dismissableLayer.update", ww = "dismissableLayer.pointerDownOutside", _w = "dismissableLayer.focusOutside", Ec, zd = y.createContext({
  layers: /* @__PURE__ */ new Set(),
  layersWithOutsidePointerEventsDisabled: /* @__PURE__ */ new Set(),
  branches: /* @__PURE__ */ new Set()
}), Ui = y.forwardRef(
  (e, t) => {
    const {
      disableOutsidePointerEvents: n = !1,
      onEscapeKeyDown: r,
      onPointerDownOutside: a,
      onFocusOutside: i,
      onInteractOutside: s,
      onDismiss: c,
      ...l
    } = e, u = y.useContext(zd), [p, m] = y.useState(null), h = p?.ownerDocument ?? globalThis?.document, [, g] = y.useState({}), v = $e(t, (S) => m(S)), f = Array.from(u.layers), [b] = [...u.layersWithOutsidePointerEventsDisabled].slice(-1), k = f.indexOf(b), w = p ? f.indexOf(p) : -1, _ = u.layersWithOutsidePointerEventsDisabled.size > 0, x = w >= k, N = Sw((S) => {
      const A = S.target, W = [...u.branches].some((C) => C.contains(A));
      !x || W || (a?.(S), s?.(S), S.defaultPrevented || c?.());
    }, h), I = Cw((S) => {
      const A = S.target;
      [...u.branches].some((C) => C.contains(A)) || (i?.(S), s?.(S), S.defaultPrevented || c?.());
    }, h);
    return vw((S) => {
      w === u.layers.size - 1 && (r?.(S), !S.defaultPrevented && c && (S.preventDefault(), c()));
    }, h), y.useEffect(() => {
      if (p)
        return n && (u.layersWithOutsidePointerEventsDisabled.size === 0 && (Ec = h.body.style.pointerEvents, h.body.style.pointerEvents = "none"), u.layersWithOutsidePointerEventsDisabled.add(p)), u.layers.add(p), Ic(), () => {
          n && u.layersWithOutsidePointerEventsDisabled.size === 1 && (h.body.style.pointerEvents = Ec);
        };
    }, [p, h, n, u]), y.useEffect(() => () => {
      p && (u.layers.delete(p), u.layersWithOutsidePointerEventsDisabled.delete(p), Ic());
    }, [p, u]), y.useEffect(() => {
      const S = () => g({});
      return document.addEventListener(oi, S), () => document.removeEventListener(oi, S);
    }, []), /* @__PURE__ */ o(
      xe.div,
      {
        ...l,
        ref: v,
        style: {
          pointerEvents: _ ? x ? "auto" : "none" : void 0,
          ...e.style
        },
        onFocusCapture: Ce(e.onFocusCapture, I.onFocusCapture),
        onBlurCapture: Ce(e.onBlurCapture, I.onBlurCapture),
        onPointerDownCapture: Ce(
          e.onPointerDownCapture,
          N.onPointerDownCapture
        )
      }
    );
  }
);
Ui.displayName = bw;
var xw = "DismissableLayerBranch", kw = y.forwardRef((e, t) => {
  const n = y.useContext(zd), r = y.useRef(null), a = $e(t, r);
  return y.useEffect(() => {
    const i = r.current;
    if (i)
      return n.branches.add(i), () => {
        n.branches.delete(i);
      };
  }, [n.branches]), /* @__PURE__ */ o(xe.div, { ...e, ref: a });
});
kw.displayName = xw;
function Sw(e, t = globalThis?.document) {
  const n = fn(e), r = y.useRef(!1), a = y.useRef(() => {
  });
  return y.useEffect(() => {
    const i = (c) => {
      if (c.target && !r.current) {
        let l = function() {
          Fd(
            ww,
            n,
            u,
            { discrete: !0 }
          );
        };
        const u = { originalEvent: c };
        c.pointerType === "touch" ? (t.removeEventListener("click", a.current), a.current = l, t.addEventListener("click", a.current, { once: !0 })) : l();
      } else
        t.removeEventListener("click", a.current);
      r.current = !1;
    }, s = window.setTimeout(() => {
      t.addEventListener("pointerdown", i);
    }, 0);
    return () => {
      window.clearTimeout(s), t.removeEventListener("pointerdown", i), t.removeEventListener("click", a.current);
    };
  }, [t, n]), {
    // ensures we check React component tree (not just DOM tree)
    onPointerDownCapture: () => r.current = !0
  };
}
function Cw(e, t = globalThis?.document) {
  const n = fn(e), r = y.useRef(!1);
  return y.useEffect(() => {
    const a = (i) => {
      i.target && !r.current && Fd(_w, n, { originalEvent: i }, {
        discrete: !1
      });
    };
    return t.addEventListener("focusin", a), () => t.removeEventListener("focusin", a);
  }, [t, n]), {
    onFocusCapture: () => r.current = !0,
    onBlurCapture: () => r.current = !1
  };
}
function Ic() {
  const e = new CustomEvent(oi);
  document.dispatchEvent(e);
}
function Fd(e, t, n, { discrete: r }) {
  const a = n.originalEvent.target, i = new CustomEvent(e, { bubbles: !1, cancelable: !0, detail: n });
  t && a.addEventListener(e, t, { once: !0 }), r ? yw(a, i) : a.dispatchEvent(i);
}
var Oa = 0;
function Bd() {
  y.useEffect(() => {
    const e = document.querySelectorAll("[data-radix-focus-guard]");
    return document.body.insertAdjacentElement("afterbegin", e[0] ?? Rc()), document.body.insertAdjacentElement("beforeend", e[1] ?? Rc()), Oa++, () => {
      Oa === 1 && document.querySelectorAll("[data-radix-focus-guard]").forEach((t) => t.remove()), Oa--;
    };
  }, []);
}
function Rc() {
  const e = document.createElement("span");
  return e.setAttribute("data-radix-focus-guard", ""), e.tabIndex = 0, e.style.outline = "none", e.style.opacity = "0", e.style.position = "fixed", e.style.pointerEvents = "none", e;
}
var Ma = "focusScope.autoFocusOnMount", Da = "focusScope.autoFocusOnUnmount", Oc = { bubbles: !1, cancelable: !0 }, Nw = "FocusScope", Wi = y.forwardRef((e, t) => {
  const {
    loop: n = !1,
    trapped: r = !1,
    onMountAutoFocus: a,
    onUnmountAutoFocus: i,
    ...s
  } = e, [c, l] = y.useState(null), u = fn(a), p = fn(i), m = y.useRef(null), h = $e(t, (f) => l(f)), g = y.useRef({
    paused: !1,
    pause() {
      this.paused = !0;
    },
    resume() {
      this.paused = !1;
    }
  }).current;
  y.useEffect(() => {
    if (r) {
      let f = function(_) {
        if (g.paused || !c) return;
        const x = _.target;
        c.contains(x) ? m.current = x : pn(m.current, { select: !0 });
      }, b = function(_) {
        if (g.paused || !c) return;
        const x = _.relatedTarget;
        x !== null && (c.contains(x) || pn(m.current, { select: !0 }));
      }, k = function(_) {
        if (document.activeElement === document.body)
          for (const N of _)
            N.removedNodes.length > 0 && pn(c);
      };
      document.addEventListener("focusin", f), document.addEventListener("focusout", b);
      const w = new MutationObserver(k);
      return c && w.observe(c, { childList: !0, subtree: !0 }), () => {
        document.removeEventListener("focusin", f), document.removeEventListener("focusout", b), w.disconnect();
      };
    }
  }, [r, c, g.paused]), y.useEffect(() => {
    if (c) {
      Dc.add(g);
      const f = document.activeElement;
      if (!c.contains(f)) {
        const k = new CustomEvent(Ma, Oc);
        c.addEventListener(Ma, u), c.dispatchEvent(k), k.defaultPrevented || (Aw(Rw(jd(c)), { select: !0 }), document.activeElement === f && pn(c));
      }
      return () => {
        c.removeEventListener(Ma, u), setTimeout(() => {
          const k = new CustomEvent(Da, Oc);
          c.addEventListener(Da, p), c.dispatchEvent(k), k.defaultPrevented || pn(f ?? document.body, { select: !0 }), c.removeEventListener(Da, p), Dc.remove(g);
        }, 0);
      };
    }
  }, [c, u, p, g]);
  const v = y.useCallback(
    (f) => {
      if (!n && !r || g.paused) return;
      const b = f.key === "Tab" && !f.altKey && !f.ctrlKey && !f.metaKey, k = document.activeElement;
      if (b && k) {
        const w = f.currentTarget, [_, x] = Tw(w);
        _ && x ? !f.shiftKey && k === x ? (f.preventDefault(), n && pn(_, { select: !0 })) : f.shiftKey && k === _ && (f.preventDefault(), n && pn(x, { select: !0 })) : k === w && f.preventDefault();
      }
    },
    [n, r, g.paused]
  );
  return /* @__PURE__ */ o(xe.div, { tabIndex: -1, ...s, ref: h, onKeyDown: v });
});
Wi.displayName = Nw;
function Aw(e, { select: t = !1 } = {}) {
  const n = document.activeElement;
  for (const r of e)
    if (pn(r, { select: t }), document.activeElement !== n) return;
}
function Tw(e) {
  const t = jd(e), n = Mc(t, e), r = Mc(t.reverse(), e);
  return [n, r];
}
function jd(e) {
  const t = [], n = document.createTreeWalker(e, NodeFilter.SHOW_ELEMENT, {
    acceptNode: (r) => {
      const a = r.tagName === "INPUT" && r.type === "hidden";
      return r.disabled || r.hidden || a ? NodeFilter.FILTER_SKIP : r.tabIndex >= 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    }
  });
  for (; n.nextNode(); ) t.push(n.currentNode);
  return t;
}
function Mc(e, t) {
  for (const n of e)
    if (!Pw(n, { upTo: t })) return n;
}
function Pw(e, { upTo: t }) {
  if (getComputedStyle(e).visibility === "hidden") return !0;
  for (; e; ) {
    if (t !== void 0 && e === t) return !1;
    if (getComputedStyle(e).display === "none") return !0;
    e = e.parentElement;
  }
  return !1;
}
function Ew(e) {
  return e instanceof HTMLInputElement && "select" in e;
}
function pn(e, { select: t = !1 } = {}) {
  if (e && e.focus) {
    const n = document.activeElement;
    e.focus({ preventScroll: !0 }), e !== n && Ew(e) && t && e.select();
  }
}
var Dc = Iw();
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
function Rw(e) {
  return e.filter((t) => t.tagName !== "A");
}
var it = globalThis?.document ? y.useLayoutEffect : () => {
}, Ow = y[" useId ".trim().toString()] || (() => {
}), Mw = 0;
function Qt(e) {
  const [t, n] = y.useState(Ow());
  return it(() => {
    n((r) => r ?? String(Mw++));
  }, [e]), t ? `radix-${t}` : "";
}
const Dw = ["top", "right", "bottom", "left"], hn = Math.min, At = Math.max, wo = Math.round, Kr = Math.floor, Yt = (e) => ({
  x: e,
  y: e
}), Lw = {
  left: "right",
  right: "left",
  bottom: "top",
  top: "bottom"
}, $w = {
  start: "end",
  end: "start"
};
function ai(e, t, n) {
  return At(e, hn(t, n));
}
function ln(e, t) {
  return typeof e == "function" ? e(t) : e;
}
function dn(e) {
  return e.split("-")[0];
}
function lr(e) {
  return e.split("-")[1];
}
function Vi(e) {
  return e === "x" ? "y" : "x";
}
function Hi(e) {
  return e === "y" ? "height" : "width";
}
const zw = /* @__PURE__ */ new Set(["top", "bottom"]);
function Gt(e) {
  return zw.has(dn(e)) ? "y" : "x";
}
function qi(e) {
  return Vi(Gt(e));
}
function Fw(e, t, n) {
  n === void 0 && (n = !1);
  const r = lr(e), a = qi(e), i = Hi(a);
  let s = a === "x" ? r === (n ? "end" : "start") ? "right" : "left" : r === "start" ? "bottom" : "top";
  return t.reference[i] > t.floating[i] && (s = _o(s)), [s, _o(s)];
}
function Bw(e) {
  const t = _o(e);
  return [ii(e), t, ii(t)];
}
function ii(e) {
  return e.replace(/start|end/g, (t) => $w[t]);
}
const $c = ["left", "right"], zc = ["right", "left"], jw = ["top", "bottom"], Uw = ["bottom", "top"];
function Ww(e, t, n) {
  switch (e) {
    case "top":
    case "bottom":
      return n ? t ? zc : $c : t ? $c : zc;
    case "left":
    case "right":
      return t ? jw : Uw;
    default:
      return [];
  }
}
function Vw(e, t, n, r) {
  const a = lr(e);
  let i = Ww(dn(e), n === "start", r);
  return a && (i = i.map((s) => s + "-" + a), t && (i = i.concat(i.map(ii)))), i;
}
function _o(e) {
  return e.replace(/left|right|bottom|top/g, (t) => Lw[t]);
}
function Hw(e) {
  return {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    ...e
  };
}
function Ud(e) {
  return typeof e != "number" ? Hw(e) : {
    top: e,
    right: e,
    bottom: e,
    left: e
  };
}
function xo(e) {
  const {
    x: t,
    y: n,
    width: r,
    height: a
  } = e;
  return {
    width: r,
    height: a,
    top: n,
    left: t,
    right: t + r,
    bottom: n + a,
    x: t,
    y: n
  };
}
function Fc(e, t, n) {
  let {
    reference: r,
    floating: a
  } = e;
  const i = Gt(t), s = qi(t), c = Hi(s), l = dn(t), u = i === "y", p = r.x + r.width / 2 - a.width / 2, m = r.y + r.height / 2 - a.height / 2, h = r[c] / 2 - a[c] / 2;
  let g;
  switch (l) {
    case "top":
      g = {
        x: p,
        y: r.y - a.height
      };
      break;
    case "bottom":
      g = {
        x: p,
        y: r.y + r.height
      };
      break;
    case "right":
      g = {
        x: r.x + r.width,
        y: m
      };
      break;
    case "left":
      g = {
        x: r.x - a.width,
        y: m
      };
      break;
    default:
      g = {
        x: r.x,
        y: r.y
      };
  }
  switch (lr(t)) {
    case "start":
      g[s] -= h * (n && u ? -1 : 1);
      break;
    case "end":
      g[s] += h * (n && u ? -1 : 1);
      break;
  }
  return g;
}
const qw = async (e, t, n) => {
  const {
    placement: r = "bottom",
    strategy: a = "absolute",
    middleware: i = [],
    platform: s
  } = n, c = i.filter(Boolean), l = await (s.isRTL == null ? void 0 : s.isRTL(t));
  let u = await s.getElementRects({
    reference: e,
    floating: t,
    strategy: a
  }), {
    x: p,
    y: m
  } = Fc(u, r, l), h = r, g = {}, v = 0;
  for (let f = 0; f < c.length; f++) {
    const {
      name: b,
      fn: k
    } = c[f], {
      x: w,
      y: _,
      data: x,
      reset: N
    } = await k({
      x: p,
      y: m,
      initialPlacement: r,
      placement: h,
      strategy: a,
      middlewareData: g,
      rects: u,
      platform: s,
      elements: {
        reference: e,
        floating: t
      }
    });
    p = w ?? p, m = _ ?? m, g = {
      ...g,
      [b]: {
        ...g[b],
        ...x
      }
    }, N && v <= 50 && (v++, typeof N == "object" && (N.placement && (h = N.placement), N.rects && (u = N.rects === !0 ? await s.getElementRects({
      reference: e,
      floating: t,
      strategy: a
    }) : N.rects), {
      x: p,
      y: m
    } = Fc(u, h, l)), f = -1);
  }
  return {
    x: p,
    y: m,
    placement: h,
    strategy: a,
    middlewareData: g
  };
};
async function Rr(e, t) {
  var n;
  t === void 0 && (t = {});
  const {
    x: r,
    y: a,
    platform: i,
    rects: s,
    elements: c,
    strategy: l
  } = e, {
    boundary: u = "clippingAncestors",
    rootBoundary: p = "viewport",
    elementContext: m = "floating",
    altBoundary: h = !1,
    padding: g = 0
  } = ln(t, e), v = Ud(g), b = c[h ? m === "floating" ? "reference" : "floating" : m], k = xo(await i.getClippingRect({
    element: (n = await (i.isElement == null ? void 0 : i.isElement(b))) == null || n ? b : b.contextElement || await (i.getDocumentElement == null ? void 0 : i.getDocumentElement(c.floating)),
    boundary: u,
    rootBoundary: p,
    strategy: l
  })), w = m === "floating" ? {
    x: r,
    y: a,
    width: s.floating.width,
    height: s.floating.height
  } : s.reference, _ = await (i.getOffsetParent == null ? void 0 : i.getOffsetParent(c.floating)), x = await (i.isElement == null ? void 0 : i.isElement(_)) ? await (i.getScale == null ? void 0 : i.getScale(_)) || {
    x: 1,
    y: 1
  } : {
    x: 1,
    y: 1
  }, N = xo(i.convertOffsetParentRelativeRectToViewportRelativeRect ? await i.convertOffsetParentRelativeRectToViewportRelativeRect({
    elements: c,
    rect: w,
    offsetParent: _,
    strategy: l
  }) : w);
  return {
    top: (k.top - N.top + v.top) / x.y,
    bottom: (N.bottom - k.bottom + v.bottom) / x.y,
    left: (k.left - N.left + v.left) / x.x,
    right: (N.right - k.right + v.right) / x.x
  };
}
const Zw = (e) => ({
  name: "arrow",
  options: e,
  async fn(t) {
    const {
      x: n,
      y: r,
      placement: a,
      rects: i,
      platform: s,
      elements: c,
      middlewareData: l
    } = t, {
      element: u,
      padding: p = 0
    } = ln(e, t) || {};
    if (u == null)
      return {};
    const m = Ud(p), h = {
      x: n,
      y: r
    }, g = qi(a), v = Hi(g), f = await s.getDimensions(u), b = g === "y", k = b ? "top" : "left", w = b ? "bottom" : "right", _ = b ? "clientHeight" : "clientWidth", x = i.reference[v] + i.reference[g] - h[g] - i.floating[v], N = h[g] - i.reference[g], I = await (s.getOffsetParent == null ? void 0 : s.getOffsetParent(u));
    let S = I ? I[_] : 0;
    (!S || !await (s.isElement == null ? void 0 : s.isElement(I))) && (S = c.floating[_] || i.floating[v]);
    const A = x / 2 - N / 2, W = S / 2 - f[v] / 2 - 1, C = hn(m[k], W), T = hn(m[w], W), P = C, L = S - f[v] - T, F = S / 2 - f[v] / 2 + A, $ = ai(P, F, L), M = !l.arrow && lr(a) != null && F !== $ && i.reference[v] / 2 - (F < P ? C : T) - f[v] / 2 < 0, D = M ? F < P ? F - P : F - L : 0;
    return {
      [g]: h[g] + D,
      data: {
        [g]: $,
        centerOffset: F - $ - D,
        ...M && {
          alignmentOffset: D
        }
      },
      reset: M
    };
  }
}), Gw = function(e) {
  return e === void 0 && (e = {}), {
    name: "flip",
    options: e,
    async fn(t) {
      var n, r;
      const {
        placement: a,
        middlewareData: i,
        rects: s,
        initialPlacement: c,
        platform: l,
        elements: u
      } = t, {
        mainAxis: p = !0,
        crossAxis: m = !0,
        fallbackPlacements: h,
        fallbackStrategy: g = "bestFit",
        fallbackAxisSideDirection: v = "none",
        flipAlignment: f = !0,
        ...b
      } = ln(e, t);
      if ((n = i.arrow) != null && n.alignmentOffset)
        return {};
      const k = dn(a), w = Gt(c), _ = dn(c) === c, x = await (l.isRTL == null ? void 0 : l.isRTL(u.floating)), N = h || (_ || !f ? [_o(c)] : Bw(c)), I = v !== "none";
      !h && I && N.push(...Vw(c, f, v, x));
      const S = [c, ...N], A = await Rr(t, b), W = [];
      let C = ((r = i.flip) == null ? void 0 : r.overflows) || [];
      if (p && W.push(A[k]), m) {
        const F = Fw(a, s, x);
        W.push(A[F[0]], A[F[1]]);
      }
      if (C = [...C, {
        placement: a,
        overflows: W
      }], !W.every((F) => F <= 0)) {
        var T, P;
        const F = (((T = i.flip) == null ? void 0 : T.index) || 0) + 1, $ = S[F];
        if ($ && (!(m === "alignment" ? w !== Gt($) : !1) || // We leave the current main axis only if every placement on that axis
        // overflows the main axis.
        C.every((O) => Gt(O.placement) === w ? O.overflows[0] > 0 : !0)))
          return {
            data: {
              index: F,
              overflows: C
            },
            reset: {
              placement: $
            }
          };
        let M = (P = C.filter((D) => D.overflows[0] <= 0).sort((D, O) => D.overflows[1] - O.overflows[1])[0]) == null ? void 0 : P.placement;
        if (!M)
          switch (g) {
            case "bestFit": {
              var L;
              const D = (L = C.filter((O) => {
                if (I) {
                  const V = Gt(O.placement);
                  return V === w || // Create a bias to the `y` side axis due to horizontal
                  // reading directions favoring greater width.
                  V === "y";
                }
                return !0;
              }).map((O) => [O.placement, O.overflows.filter((V) => V > 0).reduce((V, E) => V + E, 0)]).sort((O, V) => O[1] - V[1])[0]) == null ? void 0 : L[0];
              D && (M = D);
              break;
            }
            case "initialPlacement":
              M = c;
              break;
          }
        if (a !== M)
          return {
            reset: {
              placement: M
            }
          };
      }
      return {};
    }
  };
};
function Bc(e, t) {
  return {
    top: e.top - t.height,
    right: e.right - t.width,
    bottom: e.bottom - t.height,
    left: e.left - t.width
  };
}
function jc(e) {
  return Dw.some((t) => e[t] >= 0);
}
const Qw = function(e) {
  return e === void 0 && (e = {}), {
    name: "hide",
    options: e,
    async fn(t) {
      const {
        rects: n
      } = t, {
        strategy: r = "referenceHidden",
        ...a
      } = ln(e, t);
      switch (r) {
        case "referenceHidden": {
          const i = await Rr(t, {
            ...a,
            elementContext: "reference"
          }), s = Bc(i, n.reference);
          return {
            data: {
              referenceHiddenOffsets: s,
              referenceHidden: jc(s)
            }
          };
        }
        case "escaped": {
          const i = await Rr(t, {
            ...a,
            altBoundary: !0
          }), s = Bc(i, n.floating);
          return {
            data: {
              escapedOffsets: s,
              escaped: jc(s)
            }
          };
        }
        default:
          return {};
      }
    }
  };
}, Wd = /* @__PURE__ */ new Set(["left", "top"]);
async function Yw(e, t) {
  const {
    placement: n,
    platform: r,
    elements: a
  } = e, i = await (r.isRTL == null ? void 0 : r.isRTL(a.floating)), s = dn(n), c = lr(n), l = Gt(n) === "y", u = Wd.has(s) ? -1 : 1, p = i && l ? -1 : 1, m = ln(t, e);
  let {
    mainAxis: h,
    crossAxis: g,
    alignmentAxis: v
  } = typeof m == "number" ? {
    mainAxis: m,
    crossAxis: 0,
    alignmentAxis: null
  } : {
    mainAxis: m.mainAxis || 0,
    crossAxis: m.crossAxis || 0,
    alignmentAxis: m.alignmentAxis
  };
  return c && typeof v == "number" && (g = c === "end" ? v * -1 : v), l ? {
    x: g * p,
    y: h * u
  } : {
    x: h * u,
    y: g * p
  };
}
const Kw = function(e) {
  return e === void 0 && (e = 0), {
    name: "offset",
    options: e,
    async fn(t) {
      var n, r;
      const {
        x: a,
        y: i,
        placement: s,
        middlewareData: c
      } = t, l = await Yw(t, e);
      return s === ((n = c.offset) == null ? void 0 : n.placement) && (r = c.arrow) != null && r.alignmentOffset ? {} : {
        x: a + l.x,
        y: i + l.y,
        data: {
          ...l,
          placement: s
        }
      };
    }
  };
}, Jw = function(e) {
  return e === void 0 && (e = {}), {
    name: "shift",
    options: e,
    async fn(t) {
      const {
        x: n,
        y: r,
        placement: a
      } = t, {
        mainAxis: i = !0,
        crossAxis: s = !1,
        limiter: c = {
          fn: (b) => {
            let {
              x: k,
              y: w
            } = b;
            return {
              x: k,
              y: w
            };
          }
        },
        ...l
      } = ln(e, t), u = {
        x: n,
        y: r
      }, p = await Rr(t, l), m = Gt(dn(a)), h = Vi(m);
      let g = u[h], v = u[m];
      if (i) {
        const b = h === "y" ? "top" : "left", k = h === "y" ? "bottom" : "right", w = g + p[b], _ = g - p[k];
        g = ai(w, g, _);
      }
      if (s) {
        const b = m === "y" ? "top" : "left", k = m === "y" ? "bottom" : "right", w = v + p[b], _ = v - p[k];
        v = ai(w, v, _);
      }
      const f = c.fn({
        ...t,
        [h]: g,
        [m]: v
      });
      return {
        ...f,
        data: {
          x: f.x - n,
          y: f.y - r,
          enabled: {
            [h]: i,
            [m]: s
          }
        }
      };
    }
  };
}, Xw = function(e) {
  return e === void 0 && (e = {}), {
    options: e,
    fn(t) {
      const {
        x: n,
        y: r,
        placement: a,
        rects: i,
        middlewareData: s
      } = t, {
        offset: c = 0,
        mainAxis: l = !0,
        crossAxis: u = !0
      } = ln(e, t), p = {
        x: n,
        y: r
      }, m = Gt(a), h = Vi(m);
      let g = p[h], v = p[m];
      const f = ln(c, t), b = typeof f == "number" ? {
        mainAxis: f,
        crossAxis: 0
      } : {
        mainAxis: 0,
        crossAxis: 0,
        ...f
      };
      if (l) {
        const _ = h === "y" ? "height" : "width", x = i.reference[h] - i.floating[_] + b.mainAxis, N = i.reference[h] + i.reference[_] - b.mainAxis;
        g < x ? g = x : g > N && (g = N);
      }
      if (u) {
        var k, w;
        const _ = h === "y" ? "width" : "height", x = Wd.has(dn(a)), N = i.reference[m] - i.floating[_] + (x && ((k = s.offset) == null ? void 0 : k[m]) || 0) + (x ? 0 : b.crossAxis), I = i.reference[m] + i.reference[_] + (x ? 0 : ((w = s.offset) == null ? void 0 : w[m]) || 0) - (x ? b.crossAxis : 0);
        v < N ? v = N : v > I && (v = I);
      }
      return {
        [h]: g,
        [m]: v
      };
    }
  };
}, e_ = function(e) {
  return e === void 0 && (e = {}), {
    name: "size",
    options: e,
    async fn(t) {
      var n, r;
      const {
        placement: a,
        rects: i,
        platform: s,
        elements: c
      } = t, {
        apply: l = () => {
        },
        ...u
      } = ln(e, t), p = await Rr(t, u), m = dn(a), h = lr(a), g = Gt(a) === "y", {
        width: v,
        height: f
      } = i.floating;
      let b, k;
      m === "top" || m === "bottom" ? (b = m, k = h === (await (s.isRTL == null ? void 0 : s.isRTL(c.floating)) ? "start" : "end") ? "left" : "right") : (k = m, b = h === "end" ? "top" : "bottom");
      const w = f - p.top - p.bottom, _ = v - p.left - p.right, x = hn(f - p[b], w), N = hn(v - p[k], _), I = !t.middlewareData.shift;
      let S = x, A = N;
      if ((n = t.middlewareData.shift) != null && n.enabled.x && (A = _), (r = t.middlewareData.shift) != null && r.enabled.y && (S = w), I && !h) {
        const C = At(p.left, 0), T = At(p.right, 0), P = At(p.top, 0), L = At(p.bottom, 0);
        g ? A = v - 2 * (C !== 0 || T !== 0 ? C + T : At(p.left, p.right)) : S = f - 2 * (P !== 0 || L !== 0 ? P + L : At(p.top, p.bottom));
      }
      await l({
        ...t,
        availableWidth: A,
        availableHeight: S
      });
      const W = await s.getDimensions(c.floating);
      return v !== W.width || f !== W.height ? {
        reset: {
          rects: !0
        }
      } : {};
    }
  };
};
function Wo() {
  return typeof window < "u";
}
function dr(e) {
  return Vd(e) ? (e.nodeName || "").toLowerCase() : "#document";
}
function Tt(e) {
  var t;
  return (e == null || (t = e.ownerDocument) == null ? void 0 : t.defaultView) || window;
}
function en(e) {
  var t;
  return (t = (Vd(e) ? e.ownerDocument : e.document) || window.document) == null ? void 0 : t.documentElement;
}
function Vd(e) {
  return Wo() ? e instanceof Node || e instanceof Tt(e).Node : !1;
}
function Ft(e) {
  return Wo() ? e instanceof Element || e instanceof Tt(e).Element : !1;
}
function Xt(e) {
  return Wo() ? e instanceof HTMLElement || e instanceof Tt(e).HTMLElement : !1;
}
function Uc(e) {
  return !Wo() || typeof ShadowRoot > "u" ? !1 : e instanceof ShadowRoot || e instanceof Tt(e).ShadowRoot;
}
const t_ = /* @__PURE__ */ new Set(["inline", "contents"]);
function Fr(e) {
  const {
    overflow: t,
    overflowX: n,
    overflowY: r,
    display: a
  } = Bt(e);
  return /auto|scroll|overlay|hidden|clip/.test(t + r + n) && !t_.has(a);
}
const n_ = /* @__PURE__ */ new Set(["table", "td", "th"]);
function r_(e) {
  return n_.has(dr(e));
}
const o_ = [":popover-open", ":modal"];
function Vo(e) {
  return o_.some((t) => {
    try {
      return e.matches(t);
    } catch {
      return !1;
    }
  });
}
const a_ = ["transform", "translate", "scale", "rotate", "perspective"], i_ = ["transform", "translate", "scale", "rotate", "perspective", "filter"], s_ = ["paint", "layout", "strict", "content"];
function Zi(e) {
  const t = Gi(), n = Ft(e) ? Bt(e) : e;
  return a_.some((r) => n[r] ? n[r] !== "none" : !1) || (n.containerType ? n.containerType !== "normal" : !1) || !t && (n.backdropFilter ? n.backdropFilter !== "none" : !1) || !t && (n.filter ? n.filter !== "none" : !1) || i_.some((r) => (n.willChange || "").includes(r)) || s_.some((r) => (n.contain || "").includes(r));
}
function c_(e) {
  let t = gn(e);
  for (; Xt(t) && !er(t); ) {
    if (Zi(t))
      return t;
    if (Vo(t))
      return null;
    t = gn(t);
  }
  return null;
}
function Gi() {
  return typeof CSS > "u" || !CSS.supports ? !1 : CSS.supports("-webkit-backdrop-filter", "none");
}
const l_ = /* @__PURE__ */ new Set(["html", "body", "#document"]);
function er(e) {
  return l_.has(dr(e));
}
function Bt(e) {
  return Tt(e).getComputedStyle(e);
}
function Ho(e) {
  return Ft(e) ? {
    scrollLeft: e.scrollLeft,
    scrollTop: e.scrollTop
  } : {
    scrollLeft: e.scrollX,
    scrollTop: e.scrollY
  };
}
function gn(e) {
  if (dr(e) === "html")
    return e;
  const t = (
    // Step into the shadow DOM of the parent of a slotted node.
    e.assignedSlot || // DOM Element detected.
    e.parentNode || // ShadowRoot detected.
    Uc(e) && e.host || // Fallback.
    en(e)
  );
  return Uc(t) ? t.host : t;
}
function Hd(e) {
  const t = gn(e);
  return er(t) ? e.ownerDocument ? e.ownerDocument.body : e.body : Xt(t) && Fr(t) ? t : Hd(t);
}
function Or(e, t, n) {
  var r;
  t === void 0 && (t = []), n === void 0 && (n = !0);
  const a = Hd(e), i = a === ((r = e.ownerDocument) == null ? void 0 : r.body), s = Tt(a);
  if (i) {
    const c = si(s);
    return t.concat(s, s.visualViewport || [], Fr(a) ? a : [], c && n ? Or(c) : []);
  }
  return t.concat(a, Or(a, [], n));
}
function si(e) {
  return e.parent && Object.getPrototypeOf(e.parent) ? e.frameElement : null;
}
function qd(e) {
  const t = Bt(e);
  let n = parseFloat(t.width) || 0, r = parseFloat(t.height) || 0;
  const a = Xt(e), i = a ? e.offsetWidth : n, s = a ? e.offsetHeight : r, c = wo(n) !== i || wo(r) !== s;
  return c && (n = i, r = s), {
    width: n,
    height: r,
    $: c
  };
}
function Qi(e) {
  return Ft(e) ? e : e.contextElement;
}
function Kn(e) {
  const t = Qi(e);
  if (!Xt(t))
    return Yt(1);
  const n = t.getBoundingClientRect(), {
    width: r,
    height: a,
    $: i
  } = qd(t);
  let s = (i ? wo(n.width) : n.width) / r, c = (i ? wo(n.height) : n.height) / a;
  return (!s || !Number.isFinite(s)) && (s = 1), (!c || !Number.isFinite(c)) && (c = 1), {
    x: s,
    y: c
  };
}
const d_ = /* @__PURE__ */ Yt(0);
function Zd(e) {
  const t = Tt(e);
  return !Gi() || !t.visualViewport ? d_ : {
    x: t.visualViewport.offsetLeft,
    y: t.visualViewport.offsetTop
  };
}
function u_(e, t, n) {
  return t === void 0 && (t = !1), !n || t && n !== Tt(e) ? !1 : t;
}
function In(e, t, n, r) {
  t === void 0 && (t = !1), n === void 0 && (n = !1);
  const a = e.getBoundingClientRect(), i = Qi(e);
  let s = Yt(1);
  t && (r ? Ft(r) && (s = Kn(r)) : s = Kn(e));
  const c = u_(i, n, r) ? Zd(i) : Yt(0);
  let l = (a.left + c.x) / s.x, u = (a.top + c.y) / s.y, p = a.width / s.x, m = a.height / s.y;
  if (i) {
    const h = Tt(i), g = r && Ft(r) ? Tt(r) : r;
    let v = h, f = si(v);
    for (; f && r && g !== v; ) {
      const b = Kn(f), k = f.getBoundingClientRect(), w = Bt(f), _ = k.left + (f.clientLeft + parseFloat(w.paddingLeft)) * b.x, x = k.top + (f.clientTop + parseFloat(w.paddingTop)) * b.y;
      l *= b.x, u *= b.y, p *= b.x, m *= b.y, l += _, u += x, v = Tt(f), f = si(v);
    }
  }
  return xo({
    width: p,
    height: m,
    x: l,
    y: u
  });
}
function qo(e, t) {
  const n = Ho(e).scrollLeft;
  return t ? t.left + n : In(en(e)).left + n;
}
function Gd(e, t) {
  const n = e.getBoundingClientRect(), r = n.left + t.scrollLeft - qo(e, n), a = n.top + t.scrollTop;
  return {
    x: r,
    y: a
  };
}
function m_(e) {
  let {
    elements: t,
    rect: n,
    offsetParent: r,
    strategy: a
  } = e;
  const i = a === "fixed", s = en(r), c = t ? Vo(t.floating) : !1;
  if (r === s || c && i)
    return n;
  let l = {
    scrollLeft: 0,
    scrollTop: 0
  }, u = Yt(1);
  const p = Yt(0), m = Xt(r);
  if ((m || !m && !i) && ((dr(r) !== "body" || Fr(s)) && (l = Ho(r)), Xt(r))) {
    const g = In(r);
    u = Kn(r), p.x = g.x + r.clientLeft, p.y = g.y + r.clientTop;
  }
  const h = s && !m && !i ? Gd(s, l) : Yt(0);
  return {
    width: n.width * u.x,
    height: n.height * u.y,
    x: n.x * u.x - l.scrollLeft * u.x + p.x + h.x,
    y: n.y * u.y - l.scrollTop * u.y + p.y + h.y
  };
}
function p_(e) {
  return Array.from(e.getClientRects());
}
function f_(e) {
  const t = en(e), n = Ho(e), r = e.ownerDocument.body, a = At(t.scrollWidth, t.clientWidth, r.scrollWidth, r.clientWidth), i = At(t.scrollHeight, t.clientHeight, r.scrollHeight, r.clientHeight);
  let s = -n.scrollLeft + qo(e);
  const c = -n.scrollTop;
  return Bt(r).direction === "rtl" && (s += At(t.clientWidth, r.clientWidth) - a), {
    width: a,
    height: i,
    x: s,
    y: c
  };
}
const Wc = 25;
function h_(e, t) {
  const n = Tt(e), r = en(e), a = n.visualViewport;
  let i = r.clientWidth, s = r.clientHeight, c = 0, l = 0;
  if (a) {
    i = a.width, s = a.height;
    const p = Gi();
    (!p || p && t === "fixed") && (c = a.offsetLeft, l = a.offsetTop);
  }
  const u = qo(r);
  if (u <= 0) {
    const p = r.ownerDocument, m = p.body, h = getComputedStyle(m), g = p.compatMode === "CSS1Compat" && parseFloat(h.marginLeft) + parseFloat(h.marginRight) || 0, v = Math.abs(r.clientWidth - m.clientWidth - g);
    v <= Wc && (i -= v);
  } else u <= Wc && (i += u);
  return {
    width: i,
    height: s,
    x: c,
    y: l
  };
}
const g_ = /* @__PURE__ */ new Set(["absolute", "fixed"]);
function y_(e, t) {
  const n = In(e, !0, t === "fixed"), r = n.top + e.clientTop, a = n.left + e.clientLeft, i = Xt(e) ? Kn(e) : Yt(1), s = e.clientWidth * i.x, c = e.clientHeight * i.y, l = a * i.x, u = r * i.y;
  return {
    width: s,
    height: c,
    x: l,
    y: u
  };
}
function Vc(e, t, n) {
  let r;
  if (t === "viewport")
    r = h_(e, n);
  else if (t === "document")
    r = f_(en(e));
  else if (Ft(t))
    r = y_(t, n);
  else {
    const a = Zd(e);
    r = {
      x: t.x - a.x,
      y: t.y - a.y,
      width: t.width,
      height: t.height
    };
  }
  return xo(r);
}
function Qd(e, t) {
  const n = gn(e);
  return n === t || !Ft(n) || er(n) ? !1 : Bt(n).position === "fixed" || Qd(n, t);
}
function v_(e, t) {
  const n = t.get(e);
  if (n)
    return n;
  let r = Or(e, [], !1).filter((c) => Ft(c) && dr(c) !== "body"), a = null;
  const i = Bt(e).position === "fixed";
  let s = i ? gn(e) : e;
  for (; Ft(s) && !er(s); ) {
    const c = Bt(s), l = Zi(s);
    !l && c.position === "fixed" && (a = null), (i ? !l && !a : !l && c.position === "static" && !!a && g_.has(a.position) || Fr(s) && !l && Qd(e, s)) ? r = r.filter((p) => p !== s) : a = c, s = gn(s);
  }
  return t.set(e, r), r;
}
function b_(e) {
  let {
    element: t,
    boundary: n,
    rootBoundary: r,
    strategy: a
  } = e;
  const s = [...n === "clippingAncestors" ? Vo(t) ? [] : v_(t, this._c) : [].concat(n), r], c = s[0], l = s.reduce((u, p) => {
    const m = Vc(t, p, a);
    return u.top = At(m.top, u.top), u.right = hn(m.right, u.right), u.bottom = hn(m.bottom, u.bottom), u.left = At(m.left, u.left), u;
  }, Vc(t, c, a));
  return {
    width: l.right - l.left,
    height: l.bottom - l.top,
    x: l.left,
    y: l.top
  };
}
function w_(e) {
  const {
    width: t,
    height: n
  } = qd(e);
  return {
    width: t,
    height: n
  };
}
function __(e, t, n) {
  const r = Xt(t), a = en(t), i = n === "fixed", s = In(e, !0, i, t);
  let c = {
    scrollLeft: 0,
    scrollTop: 0
  };
  const l = Yt(0);
  function u() {
    l.x = qo(a);
  }
  if (r || !r && !i)
    if ((dr(t) !== "body" || Fr(a)) && (c = Ho(t)), r) {
      const g = In(t, !0, i, t);
      l.x = g.x + t.clientLeft, l.y = g.y + t.clientTop;
    } else a && u();
  i && !r && a && u();
  const p = a && !r && !i ? Gd(a, c) : Yt(0), m = s.left + c.scrollLeft - l.x - p.x, h = s.top + c.scrollTop - l.y - p.y;
  return {
    x: m,
    y: h,
    width: s.width,
    height: s.height
  };
}
function La(e) {
  return Bt(e).position === "static";
}
function Hc(e, t) {
  if (!Xt(e) || Bt(e).position === "fixed")
    return null;
  if (t)
    return t(e);
  let n = e.offsetParent;
  return en(e) === n && (n = n.ownerDocument.body), n;
}
function Yd(e, t) {
  const n = Tt(e);
  if (Vo(e))
    return n;
  if (!Xt(e)) {
    let a = gn(e);
    for (; a && !er(a); ) {
      if (Ft(a) && !La(a))
        return a;
      a = gn(a);
    }
    return n;
  }
  let r = Hc(e, t);
  for (; r && r_(r) && La(r); )
    r = Hc(r, t);
  return r && er(r) && La(r) && !Zi(r) ? n : r || c_(e) || n;
}
const x_ = async function(e) {
  const t = this.getOffsetParent || Yd, n = this.getDimensions, r = await n(e.floating);
  return {
    reference: __(e.reference, await t(e.floating), e.strategy),
    floating: {
      x: 0,
      y: 0,
      width: r.width,
      height: r.height
    }
  };
};
function k_(e) {
  return Bt(e).direction === "rtl";
}
const S_ = {
  convertOffsetParentRelativeRectToViewportRelativeRect: m_,
  getDocumentElement: en,
  getClippingRect: b_,
  getOffsetParent: Yd,
  getElementRects: x_,
  getClientRects: p_,
  getDimensions: w_,
  getScale: Kn,
  isElement: Ft,
  isRTL: k_
};
function Kd(e, t) {
  return e.x === t.x && e.y === t.y && e.width === t.width && e.height === t.height;
}
function C_(e, t) {
  let n = null, r;
  const a = en(e);
  function i() {
    var c;
    clearTimeout(r), (c = n) == null || c.disconnect(), n = null;
  }
  function s(c, l) {
    c === void 0 && (c = !1), l === void 0 && (l = 1), i();
    const u = e.getBoundingClientRect(), {
      left: p,
      top: m,
      width: h,
      height: g
    } = u;
    if (c || t(), !h || !g)
      return;
    const v = Kr(m), f = Kr(a.clientWidth - (p + h)), b = Kr(a.clientHeight - (m + g)), k = Kr(p), _ = {
      rootMargin: -v + "px " + -f + "px " + -b + "px " + -k + "px",
      threshold: At(0, hn(1, l)) || 1
    };
    let x = !0;
    function N(I) {
      const S = I[0].intersectionRatio;
      if (S !== l) {
        if (!x)
          return s();
        S ? s(!1, S) : r = setTimeout(() => {
          s(!1, 1e-7);
        }, 1e3);
      }
      S === 1 && !Kd(u, e.getBoundingClientRect()) && s(), x = !1;
    }
    try {
      n = new IntersectionObserver(N, {
        ..._,
        // Handle <iframe>s
        root: a.ownerDocument
      });
    } catch {
      n = new IntersectionObserver(N, _);
    }
    n.observe(e);
  }
  return s(!0), i;
}
function N_(e, t, n, r) {
  r === void 0 && (r = {});
  const {
    ancestorScroll: a = !0,
    ancestorResize: i = !0,
    elementResize: s = typeof ResizeObserver == "function",
    layoutShift: c = typeof IntersectionObserver == "function",
    animationFrame: l = !1
  } = r, u = Qi(e), p = a || i ? [...u ? Or(u) : [], ...Or(t)] : [];
  p.forEach((k) => {
    a && k.addEventListener("scroll", n, {
      passive: !0
    }), i && k.addEventListener("resize", n);
  });
  const m = u && c ? C_(u, n) : null;
  let h = -1, g = null;
  s && (g = new ResizeObserver((k) => {
    let [w] = k;
    w && w.target === u && g && (g.unobserve(t), cancelAnimationFrame(h), h = requestAnimationFrame(() => {
      var _;
      (_ = g) == null || _.observe(t);
    })), n();
  }), u && !l && g.observe(u), g.observe(t));
  let v, f = l ? In(e) : null;
  l && b();
  function b() {
    const k = In(e);
    f && !Kd(f, k) && n(), f = k, v = requestAnimationFrame(b);
  }
  return n(), () => {
    var k;
    p.forEach((w) => {
      a && w.removeEventListener("scroll", n), i && w.removeEventListener("resize", n);
    }), m?.(), (k = g) == null || k.disconnect(), g = null, l && cancelAnimationFrame(v);
  };
}
const A_ = Kw, T_ = Jw, P_ = Gw, E_ = e_, I_ = Qw, qc = Zw, R_ = Xw, O_ = (e, t, n) => {
  const r = /* @__PURE__ */ new Map(), a = {
    platform: S_,
    ...n
  }, i = {
    ...a.platform,
    _c: r
  };
  return qw(e, t, {
    ...a,
    platform: i
  });
};
var M_ = typeof document < "u", D_ = function() {
}, co = M_ ? Np : D_;
function ko(e, t) {
  if (e === t)
    return !0;
  if (typeof e != typeof t)
    return !1;
  if (typeof e == "function" && e.toString() === t.toString())
    return !0;
  let n, r, a;
  if (e && t && typeof e == "object") {
    if (Array.isArray(e)) {
      if (n = e.length, n !== t.length) return !1;
      for (r = n; r-- !== 0; )
        if (!ko(e[r], t[r]))
          return !1;
      return !0;
    }
    if (a = Object.keys(e), n = a.length, n !== Object.keys(t).length)
      return !1;
    for (r = n; r-- !== 0; )
      if (!{}.hasOwnProperty.call(t, a[r]))
        return !1;
    for (r = n; r-- !== 0; ) {
      const i = a[r];
      if (!(i === "_owner" && e.$$typeof) && !ko(e[i], t[i]))
        return !1;
    }
    return !0;
  }
  return e !== e && t !== t;
}
function Jd(e) {
  return typeof window > "u" ? 1 : (e.ownerDocument.defaultView || window).devicePixelRatio || 1;
}
function Zc(e, t) {
  const n = Jd(e);
  return Math.round(t * n) / n;
}
function $a(e) {
  const t = y.useRef(e);
  return co(() => {
    t.current = e;
  }), t;
}
function L_(e) {
  e === void 0 && (e = {});
  const {
    placement: t = "bottom",
    strategy: n = "absolute",
    middleware: r = [],
    platform: a,
    elements: {
      reference: i,
      floating: s
    } = {},
    transform: c = !0,
    whileElementsMounted: l,
    open: u
  } = e, [p, m] = y.useState({
    x: 0,
    y: 0,
    strategy: n,
    placement: t,
    middlewareData: {},
    isPositioned: !1
  }), [h, g] = y.useState(r);
  ko(h, r) || g(r);
  const [v, f] = y.useState(null), [b, k] = y.useState(null), w = y.useCallback((O) => {
    O !== I.current && (I.current = O, f(O));
  }, []), _ = y.useCallback((O) => {
    O !== S.current && (S.current = O, k(O));
  }, []), x = i || v, N = s || b, I = y.useRef(null), S = y.useRef(null), A = y.useRef(p), W = l != null, C = $a(l), T = $a(a), P = $a(u), L = y.useCallback(() => {
    if (!I.current || !S.current)
      return;
    const O = {
      placement: t,
      strategy: n,
      middleware: h
    };
    T.current && (O.platform = T.current), O_(I.current, S.current, O).then((V) => {
      const E = {
        ...V,
        // The floating element's position may be recomputed while it's closed
        // but still mounted (such as when transitioning out). To ensure
        // `isPositioned` will be `false` initially on the next open, avoid
        // setting it to `true` when `open === false` (must be specified).
        isPositioned: P.current !== !1
      };
      F.current && !ko(A.current, E) && (A.current = E, Do.flushSync(() => {
        m(E);
      }));
    });
  }, [h, t, n, T, P]);
  co(() => {
    u === !1 && A.current.isPositioned && (A.current.isPositioned = !1, m((O) => ({
      ...O,
      isPositioned: !1
    })));
  }, [u]);
  const F = y.useRef(!1);
  co(() => (F.current = !0, () => {
    F.current = !1;
  }), []), co(() => {
    if (x && (I.current = x), N && (S.current = N), x && N) {
      if (C.current)
        return C.current(x, N, L);
      L();
    }
  }, [x, N, L, C, W]);
  const $ = y.useMemo(() => ({
    reference: I,
    floating: S,
    setReference: w,
    setFloating: _
  }), [w, _]), M = y.useMemo(() => ({
    reference: x,
    floating: N
  }), [x, N]), D = y.useMemo(() => {
    const O = {
      position: n,
      left: 0,
      top: 0
    };
    if (!M.floating)
      return O;
    const V = Zc(M.floating, p.x), E = Zc(M.floating, p.y);
    return c ? {
      ...O,
      transform: "translate(" + V + "px, " + E + "px)",
      ...Jd(M.floating) >= 1.5 && {
        willChange: "transform"
      }
    } : {
      position: n,
      left: V,
      top: E
    };
  }, [n, c, M.floating, p.x, p.y]);
  return y.useMemo(() => ({
    ...p,
    update: L,
    refs: $,
    elements: M,
    floatingStyles: D
  }), [p, L, $, M, D]);
}
const $_ = (e) => {
  function t(n) {
    return {}.hasOwnProperty.call(n, "current");
  }
  return {
    name: "arrow",
    options: e,
    fn(n) {
      const {
        element: r,
        padding: a
      } = typeof e == "function" ? e(n) : e;
      return r && t(r) ? r.current != null ? qc({
        element: r.current,
        padding: a
      }).fn(n) : {} : r ? qc({
        element: r,
        padding: a
      }).fn(n) : {};
    }
  };
}, z_ = (e, t) => ({
  ...A_(e),
  options: [e, t]
}), F_ = (e, t) => ({
  ...T_(e),
  options: [e, t]
}), B_ = (e, t) => ({
  ...R_(e),
  options: [e, t]
}), j_ = (e, t) => ({
  ...P_(e),
  options: [e, t]
}), U_ = (e, t) => ({
  ...E_(e),
  options: [e, t]
}), W_ = (e, t) => ({
  ...I_(e),
  options: [e, t]
}), V_ = (e, t) => ({
  ...$_(e),
  options: [e, t]
});
var H_ = "Arrow", Xd = y.forwardRef((e, t) => {
  const { children: n, width: r = 10, height: a = 5, ...i } = e;
  return /* @__PURE__ */ o(
    xe.svg,
    {
      ...i,
      ref: t,
      width: r,
      height: a,
      viewBox: "0 0 30 10",
      preserveAspectRatio: "none",
      children: e.asChild ? n : /* @__PURE__ */ o("polygon", { points: "0,0 30,0 15,10" })
    }
  );
});
Xd.displayName = H_;
var q_ = Xd;
function Z_(e) {
  const [t, n] = y.useState(void 0);
  return it(() => {
    if (e) {
      n({ width: e.offsetWidth, height: e.offsetHeight });
      const r = new ResizeObserver((a) => {
        if (!Array.isArray(a) || !a.length)
          return;
        const i = a[0];
        let s, c;
        if ("borderBoxSize" in i) {
          const l = i.borderBoxSize, u = Array.isArray(l) ? l[0] : l;
          s = u.inlineSize, c = u.blockSize;
        } else
          s = e.offsetWidth, c = e.offsetHeight;
        n({ width: s, height: c });
      });
      return r.observe(e, { box: "border-box" }), () => r.unobserve(e);
    } else
      n(void 0);
  }, [e]), t;
}
var Yi = "Popper", [eu, tu] = wn(Yi), [G_, nu] = eu(Yi), ru = (e) => {
  const { __scopePopper: t, children: n } = e, [r, a] = y.useState(null);
  return /* @__PURE__ */ o(G_, { scope: t, anchor: r, onAnchorChange: a, children: n });
};
ru.displayName = Yi;
var ou = "PopperAnchor", au = y.forwardRef(
  (e, t) => {
    const { __scopePopper: n, virtualRef: r, ...a } = e, i = nu(ou, n), s = y.useRef(null), c = $e(t, s), l = y.useRef(null);
    return y.useEffect(() => {
      const u = l.current;
      l.current = r?.current || s.current, u !== l.current && i.onAnchorChange(l.current);
    }), r ? null : /* @__PURE__ */ o(xe.div, { ...a, ref: c });
  }
);
au.displayName = ou;
var Ki = "PopperContent", [Q_, Y_] = eu(Ki), iu = y.forwardRef(
  (e, t) => {
    const {
      __scopePopper: n,
      side: r = "bottom",
      sideOffset: a = 0,
      align: i = "center",
      alignOffset: s = 0,
      arrowPadding: c = 0,
      avoidCollisions: l = !0,
      collisionBoundary: u = [],
      collisionPadding: p = 0,
      sticky: m = "partial",
      hideWhenDetached: h = !1,
      updatePositionStrategy: g = "optimized",
      onPlaced: v,
      ...f
    } = e, b = nu(Ki, n), [k, w] = y.useState(null), _ = $e(t, (B) => w(B)), [x, N] = y.useState(null), I = Z_(x), S = I?.width ?? 0, A = I?.height ?? 0, W = r + (i !== "center" ? "-" + i : ""), C = typeof p == "number" ? p : { top: 0, right: 0, bottom: 0, left: 0, ...p }, T = Array.isArray(u) ? u : [u], P = T.length > 0, L = {
      padding: C,
      boundary: T.filter(J_),
      // with `strategy: 'fixed'`, this is the only way to get it to respect boundaries
      altBoundary: P
    }, { refs: F, floatingStyles: $, placement: M, isPositioned: D, middlewareData: O } = L_({
      // default to `fixed` strategy so users don't have to pick and we also avoid focus scroll issues
      strategy: "fixed",
      placement: W,
      whileElementsMounted: (...B) => N_(...B, {
        animationFrame: g === "always"
      }),
      elements: {
        reference: b.anchor
      },
      middleware: [
        z_({ mainAxis: a + A, alignmentAxis: s }),
        l && F_({
          mainAxis: !0,
          crossAxis: !1,
          limiter: m === "partial" ? B_() : void 0,
          ...L
        }),
        l && j_({ ...L }),
        U_({
          ...L,
          apply: ({ elements: B, rects: ee, availableWidth: fe, availableHeight: G }) => {
            const { width: oe, height: de } = ee.reference, he = B.floating.style;
            he.setProperty("--radix-popper-available-width", `${fe}px`), he.setProperty("--radix-popper-available-height", `${G}px`), he.setProperty("--radix-popper-anchor-width", `${oe}px`), he.setProperty("--radix-popper-anchor-height", `${de}px`);
          }
        }),
        x && V_({ element: x, padding: c }),
        X_({ arrowWidth: S, arrowHeight: A }),
        h && W_({ strategy: "referenceHidden", ...L })
      ]
    }), [V, E] = lu(M), q = fn(v);
    it(() => {
      D && q?.();
    }, [D, q]);
    const re = O.arrow?.x, j = O.arrow?.y, X = O.arrow?.centerOffset !== 0, [te, ve] = y.useState();
    return it(() => {
      k && ve(window.getComputedStyle(k).zIndex);
    }, [k]), /* @__PURE__ */ o(
      "div",
      {
        ref: F.setFloating,
        "data-radix-popper-content-wrapper": "",
        style: {
          ...$,
          transform: D ? $.transform : "translate(0, -200%)",
          // keep off the page when measuring
          minWidth: "max-content",
          zIndex: te,
          "--radix-popper-transform-origin": [
            O.transformOrigin?.x,
            O.transformOrigin?.y
          ].join(" "),
          // hide the content if using the hide middleware and should be hidden
          // set visibility to hidden and disable pointer events so the UI behaves
          // as if the PopperContent isn't there at all
          ...O.hide?.referenceHidden && {
            visibility: "hidden",
            pointerEvents: "none"
          }
        },
        dir: e.dir,
        children: /* @__PURE__ */ o(
          Q_,
          {
            scope: n,
            placedSide: V,
            onArrowChange: N,
            arrowX: re,
            arrowY: j,
            shouldHideArrow: X,
            children: /* @__PURE__ */ o(
              xe.div,
              {
                "data-side": V,
                "data-align": E,
                ...f,
                ref: _,
                style: {
                  ...f.style,
                  // if the PopperContent hasn't been placed yet (not all measurements done)
                  // we prevent animations so that users's animation don't kick in too early referring wrong sides
                  animation: D ? void 0 : "none"
                }
              }
            )
          }
        )
      }
    );
  }
);
iu.displayName = Ki;
var su = "PopperArrow", K_ = {
  top: "bottom",
  right: "left",
  bottom: "top",
  left: "right"
}, cu = y.forwardRef(function(t, n) {
  const { __scopePopper: r, ...a } = t, i = Y_(su, r), s = K_[i.placedSide];
  return (
    // we have to use an extra wrapper because `ResizeObserver` (used by `useSize`)
    // doesn't report size as we'd expect on SVG elements.
    // it reports their bounding box which is effectively the largest path inside the SVG.
    /* @__PURE__ */ o(
      "span",
      {
        ref: i.onArrowChange,
        style: {
          position: "absolute",
          left: i.arrowX,
          top: i.arrowY,
          [s]: 0,
          transformOrigin: {
            top: "",
            right: "0 0",
            bottom: "center 0",
            left: "100% 0"
          }[i.placedSide],
          transform: {
            top: "translateY(100%)",
            right: "translateY(50%) rotate(90deg) translateX(-50%)",
            bottom: "rotate(180deg)",
            left: "translateY(50%) rotate(-90deg) translateX(50%)"
          }[i.placedSide],
          visibility: i.shouldHideArrow ? "hidden" : void 0
        },
        children: /* @__PURE__ */ o(
          q_,
          {
            ...a,
            ref: n,
            style: {
              ...a.style,
              // ensures the element can be measured correctly (mostly for if SVG)
              display: "block"
            }
          }
        )
      }
    )
  );
});
cu.displayName = su;
function J_(e) {
  return e !== null;
}
var X_ = (e) => ({
  name: "transformOrigin",
  options: e,
  fn(t) {
    const { placement: n, rects: r, middlewareData: a } = t, s = a.arrow?.centerOffset !== 0, c = s ? 0 : e.arrowWidth, l = s ? 0 : e.arrowHeight, [u, p] = lu(n), m = { start: "0%", center: "50%", end: "100%" }[p], h = (a.arrow?.x ?? 0) + c / 2, g = (a.arrow?.y ?? 0) + l / 2;
    let v = "", f = "";
    return u === "bottom" ? (v = s ? m : `${h}px`, f = `${-l}px`) : u === "top" ? (v = s ? m : `${h}px`, f = `${r.floating.height + l}px`) : u === "right" ? (v = `${-l}px`, f = s ? m : `${g}px`) : u === "left" && (v = `${r.floating.width + l}px`, f = s ? m : `${g}px`), { data: { x: v, y: f } };
  }
});
function lu(e) {
  const [t, n = "center"] = e.split("-");
  return [t, n];
}
var ex = ru, tx = au, nx = iu, rx = cu, ox = "Portal", Ji = y.forwardRef((e, t) => {
  const { container: n, ...r } = e, [a, i] = y.useState(!1);
  it(() => i(!0), []);
  const s = n || a && globalThis?.document?.body;
  return s ? hl.createPortal(/* @__PURE__ */ o(xe.div, { ...r, ref: t }), s) : null;
});
Ji.displayName = ox;
// @__NO_SIDE_EFFECTS__
function ax(e) {
  const t = /* @__PURE__ */ ix(e), n = y.forwardRef((r, a) => {
    const { children: i, ...s } = r, c = y.Children.toArray(i), l = c.find(cx);
    if (l) {
      const u = l.props.children, p = c.map((m) => m === l ? y.Children.count(u) > 1 ? y.Children.only(null) : y.isValidElement(u) ? u.props.children : null : m);
      return /* @__PURE__ */ o(t, { ...s, ref: a, children: y.isValidElement(u) ? y.cloneElement(u, void 0, p) : null });
    }
    return /* @__PURE__ */ o(t, { ...s, ref: a, children: i });
  });
  return n.displayName = `${e}.Slot`, n;
}
// @__NO_SIDE_EFFECTS__
function ix(e) {
  const t = y.forwardRef((n, r) => {
    const { children: a, ...i } = n;
    if (y.isValidElement(a)) {
      const s = dx(a), c = lx(i, a.props);
      return a.type !== y.Fragment && (c.ref = r ? ir(r, s) : s), y.cloneElement(a, c);
    }
    return y.Children.count(a) > 1 ? y.Children.only(null) : null;
  });
  return t.displayName = `${e}.SlotClone`, t;
}
var sx = Symbol("radix.slottable");
function cx(e) {
  return y.isValidElement(e) && typeof e.type == "function" && "__radixId" in e.type && e.type.__radixId === sx;
}
function lx(e, t) {
  const n = { ...t };
  for (const r in t) {
    const a = e[r], i = t[r];
    /^on[A-Z]/.test(r) ? a && i ? n[r] = (...c) => {
      const l = i(...c);
      return a(...c), l;
    } : a && (n[r] = a) : r === "style" ? n[r] = { ...a, ...i } : r === "className" && (n[r] = [a, i].filter(Boolean).join(" "));
  }
  return { ...e, ...n };
}
function dx(e) {
  let t = Object.getOwnPropertyDescriptor(e.props, "ref")?.get, n = t && "isReactWarning" in t && t.isReactWarning;
  return n ? e.ref : (t = Object.getOwnPropertyDescriptor(e, "ref")?.get, n = t && "isReactWarning" in t && t.isReactWarning, n ? e.props.ref : e.props.ref || e.ref);
}
var ux = y[" useInsertionEffect ".trim().toString()] || it;
function yn({
  prop: e,
  defaultProp: t,
  onChange: n = () => {
  },
  caller: r
}) {
  const [a, i, s] = mx({
    defaultProp: t,
    onChange: n
  }), c = e !== void 0, l = c ? e : a;
  {
    const p = y.useRef(e !== void 0);
    y.useEffect(() => {
      const m = p.current;
      m !== c && console.warn(
        `${r} is changing from ${m ? "controlled" : "uncontrolled"} to ${c ? "controlled" : "uncontrolled"}. Components should not switch from controlled to uncontrolled (or vice versa). Decide between using a controlled or uncontrolled value for the lifetime of the component.`
      ), p.current = c;
    }, [c, r]);
  }
  const u = y.useCallback(
    (p) => {
      if (c) {
        const m = px(p) ? p(e) : p;
        m !== e && s.current?.(m);
      } else
        i(p);
    },
    [c, e, i, s]
  );
  return [l, u];
}
function mx({
  defaultProp: e,
  onChange: t
}) {
  const [n, r] = y.useState(e), a = y.useRef(n), i = y.useRef(t);
  return ux(() => {
    i.current = t;
  }, [t]), y.useEffect(() => {
    a.current !== n && (i.current?.(n), a.current = n);
  }, [n, a]), [n, r, i];
}
function px(e) {
  return typeof e == "function";
}
function fx(e) {
  const t = y.useRef({ value: e, previous: e });
  return y.useMemo(() => (t.current.value !== e && (t.current.previous = t.current.value, t.current.value = e), t.current.previous), [e]);
}
var du = Object.freeze({
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
}), hx = "VisuallyHidden", gx = y.forwardRef(
  (e, t) => /* @__PURE__ */ o(
    xe.span,
    {
      ...e,
      ref: t,
      style: { ...du, ...e.style }
    }
  )
);
gx.displayName = hx;
var yx = function(e) {
  if (typeof document > "u")
    return null;
  var t = Array.isArray(e) ? e[0] : e;
  return t.ownerDocument.body;
}, qn = /* @__PURE__ */ new WeakMap(), Jr = /* @__PURE__ */ new WeakMap(), Xr = {}, za = 0, uu = function(e) {
  return e && (e.host || uu(e.parentNode));
}, vx = function(e, t) {
  return t.map(function(n) {
    if (e.contains(n))
      return n;
    var r = uu(n);
    return r && e.contains(r) ? r : (console.error("aria-hidden", n, "in not contained inside", e, ". Doing nothing"), null);
  }).filter(function(n) {
    return !!n;
  });
}, bx = function(e, t, n, r) {
  var a = vx(t, Array.isArray(e) ? e : [e]);
  Xr[n] || (Xr[n] = /* @__PURE__ */ new WeakMap());
  var i = Xr[n], s = [], c = /* @__PURE__ */ new Set(), l = new Set(a), u = function(m) {
    !m || c.has(m) || (c.add(m), u(m.parentNode));
  };
  a.forEach(u);
  var p = function(m) {
    !m || l.has(m) || Array.prototype.forEach.call(m.children, function(h) {
      if (c.has(h))
        p(h);
      else
        try {
          var g = h.getAttribute(r), v = g !== null && g !== "false", f = (qn.get(h) || 0) + 1, b = (i.get(h) || 0) + 1;
          qn.set(h, f), i.set(h, b), s.push(h), f === 1 && v && Jr.set(h, !0), b === 1 && h.setAttribute(n, "true"), v || h.setAttribute(r, "true");
        } catch (k) {
          console.error("aria-hidden: cannot operate on ", h, k);
        }
    });
  };
  return p(t), c.clear(), za++, function() {
    s.forEach(function(m) {
      var h = qn.get(m) - 1, g = i.get(m) - 1;
      qn.set(m, h), i.set(m, g), h || (Jr.has(m) || m.removeAttribute(r), Jr.delete(m)), g || m.removeAttribute(n);
    }), za--, za || (qn = /* @__PURE__ */ new WeakMap(), qn = /* @__PURE__ */ new WeakMap(), Jr = /* @__PURE__ */ new WeakMap(), Xr = {});
  };
}, mu = function(e, t, n) {
  n === void 0 && (n = "data-aria-hidden");
  var r = Array.from(Array.isArray(e) ? e : [e]), a = yx(e);
  return a ? (r.push.apply(r, Array.from(a.querySelectorAll("[aria-live], script"))), bx(r, a, n, "aria-hidden")) : function() {
    return null;
  };
}, Zt = function() {
  return Zt = Object.assign || function(t) {
    for (var n, r = 1, a = arguments.length; r < a; r++) {
      n = arguments[r];
      for (var i in n) Object.prototype.hasOwnProperty.call(n, i) && (t[i] = n[i]);
    }
    return t;
  }, Zt.apply(this, arguments);
};
function pu(e, t) {
  var n = {};
  for (var r in e) Object.prototype.hasOwnProperty.call(e, r) && t.indexOf(r) < 0 && (n[r] = e[r]);
  if (e != null && typeof Object.getOwnPropertySymbols == "function")
    for (var a = 0, r = Object.getOwnPropertySymbols(e); a < r.length; a++)
      t.indexOf(r[a]) < 0 && Object.prototype.propertyIsEnumerable.call(e, r[a]) && (n[r[a]] = e[r[a]]);
  return n;
}
function wx(e, t, n) {
  if (n || arguments.length === 2) for (var r = 0, a = t.length, i; r < a; r++)
    (i || !(r in t)) && (i || (i = Array.prototype.slice.call(t, 0, r)), i[r] = t[r]);
  return e.concat(i || Array.prototype.slice.call(t));
}
var lo = "right-scroll-bar-position", uo = "width-before-scroll-bar", _x = "with-scroll-bars-hidden", xx = "--removed-body-scroll-bar-size";
function Fa(e, t) {
  return typeof e == "function" ? e(t) : e && (e.current = t), e;
}
function kx(e, t) {
  var n = H(function() {
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
          var a = n.value;
          a !== r && (n.value = r, n.callback(r, a));
        }
      }
    };
  })[0];
  return n.callback = t, n.facade;
}
var Sx = typeof window < "u" ? y.useLayoutEffect : y.useEffect, Gc = /* @__PURE__ */ new WeakMap();
function Cx(e, t) {
  var n = kx(null, function(r) {
    return e.forEach(function(a) {
      return Fa(a, r);
    });
  });
  return Sx(function() {
    var r = Gc.get(n);
    if (r) {
      var a = new Set(r), i = new Set(e), s = n.current;
      a.forEach(function(c) {
        i.has(c) || Fa(c, null);
      }), i.forEach(function(c) {
        a.has(c) || Fa(c, s);
      });
    }
    Gc.set(n, e);
  }, [e]), n;
}
function Nx(e) {
  return e;
}
function Ax(e, t) {
  t === void 0 && (t = Nx);
  var n = [], r = !1, a = {
    read: function() {
      if (r)
        throw new Error("Sidecar: could not `read` from an `assigned` medium. `read` could be used only with `useMedium`.");
      return n.length ? n[n.length - 1] : e;
    },
    useMedium: function(i) {
      var s = t(i, r);
      return n.push(s), function() {
        n = n.filter(function(c) {
          return c !== s;
        });
      };
    },
    assignSyncMedium: function(i) {
      for (r = !0; n.length; ) {
        var s = n;
        n = [], s.forEach(i);
      }
      n = {
        push: function(c) {
          return i(c);
        },
        filter: function() {
          return n;
        }
      };
    },
    assignMedium: function(i) {
      r = !0;
      var s = [];
      if (n.length) {
        var c = n;
        n = [], c.forEach(i), s = n;
      }
      var l = function() {
        var p = s;
        s = [], p.forEach(i);
      }, u = function() {
        return Promise.resolve().then(l);
      };
      u(), n = {
        push: function(p) {
          s.push(p), u();
        },
        filter: function(p) {
          return s = s.filter(p), n;
        }
      };
    }
  };
  return a;
}
function Tx(e) {
  e === void 0 && (e = {});
  var t = Ax(null);
  return t.options = Zt({ async: !0, ssr: !1 }, e), t;
}
var fu = function(e) {
  var t = e.sideCar, n = pu(e, ["sideCar"]);
  if (!t)
    throw new Error("Sidecar: please provide `sideCar` property to import the right car");
  var r = t.read();
  if (!r)
    throw new Error("Sidecar medium not found");
  return y.createElement(r, Zt({}, n));
};
fu.isSideCarExport = !0;
function Px(e, t) {
  return e.useMedium(t), fu;
}
var hu = Tx(), Ba = function() {
}, Zo = y.forwardRef(function(e, t) {
  var n = y.useRef(null), r = y.useState({
    onScrollCapture: Ba,
    onWheelCapture: Ba,
    onTouchMoveCapture: Ba
  }), a = r[0], i = r[1], s = e.forwardProps, c = e.children, l = e.className, u = e.removeScrollBar, p = e.enabled, m = e.shards, h = e.sideCar, g = e.noRelative, v = e.noIsolation, f = e.inert, b = e.allowPinchZoom, k = e.as, w = k === void 0 ? "div" : k, _ = e.gapMode, x = pu(e, ["forwardProps", "children", "className", "removeScrollBar", "enabled", "shards", "sideCar", "noRelative", "noIsolation", "inert", "allowPinchZoom", "as", "gapMode"]), N = h, I = Cx([n, t]), S = Zt(Zt({}, x), a);
  return y.createElement(
    y.Fragment,
    null,
    p && y.createElement(N, { sideCar: hu, removeScrollBar: u, shards: m, noRelative: g, noIsolation: v, inert: f, setCallbacks: i, allowPinchZoom: !!b, lockRef: n, gapMode: _ }),
    s ? y.cloneElement(y.Children.only(c), Zt(Zt({}, S), { ref: I })) : y.createElement(w, Zt({}, S, { className: l, ref: I }), c)
  );
});
Zo.defaultProps = {
  enabled: !0,
  removeScrollBar: !0,
  inert: !1
};
Zo.classNames = {
  fullWidth: uo,
  zeroRight: lo
};
var Ex = function() {
  if (typeof __webpack_nonce__ < "u")
    return __webpack_nonce__;
};
function Ix() {
  if (!document)
    return null;
  var e = document.createElement("style");
  e.type = "text/css";
  var t = Ex();
  return t && e.setAttribute("nonce", t), e;
}
function Rx(e, t) {
  e.styleSheet ? e.styleSheet.cssText = t : e.appendChild(document.createTextNode(t));
}
function Ox(e) {
  var t = document.head || document.getElementsByTagName("head")[0];
  t.appendChild(e);
}
var Mx = function() {
  var e = 0, t = null;
  return {
    add: function(n) {
      e == 0 && (t = Ix()) && (Rx(t, n), Ox(t)), e++;
    },
    remove: function() {
      e--, !e && t && (t.parentNode && t.parentNode.removeChild(t), t = null);
    }
  };
}, Dx = function() {
  var e = Mx();
  return function(t, n) {
    y.useEffect(function() {
      return e.add(t), function() {
        e.remove();
      };
    }, [t && n]);
  };
}, gu = function() {
  var e = Dx(), t = function(n) {
    var r = n.styles, a = n.dynamic;
    return e(r, a), null;
  };
  return t;
}, Lx = {
  left: 0,
  top: 0,
  right: 0,
  gap: 0
}, ja = function(e) {
  return parseInt(e || "", 10) || 0;
}, $x = function(e) {
  var t = window.getComputedStyle(document.body), n = t[e === "padding" ? "paddingLeft" : "marginLeft"], r = t[e === "padding" ? "paddingTop" : "marginTop"], a = t[e === "padding" ? "paddingRight" : "marginRight"];
  return [ja(n), ja(r), ja(a)];
}, zx = function(e) {
  if (e === void 0 && (e = "margin"), typeof window > "u")
    return Lx;
  var t = $x(e), n = document.documentElement.clientWidth, r = window.innerWidth;
  return {
    left: t[0],
    top: t[1],
    right: t[2],
    gap: Math.max(0, r - n + t[2] - t[0])
  };
}, Fx = gu(), Jn = "data-scroll-locked", Bx = function(e, t, n, r) {
  var a = e.left, i = e.top, s = e.right, c = e.gap;
  return n === void 0 && (n = "margin"), `
  .`.concat(_x, ` {
   overflow: hidden `).concat(r, `;
   padding-right: `).concat(c, "px ").concat(r, `;
  }
  body[`).concat(Jn, `] {
    overflow: hidden `).concat(r, `;
    overscroll-behavior: contain;
    `).concat([
    t && "position: relative ".concat(r, ";"),
    n === "margin" && `
    padding-left: `.concat(a, `px;
    padding-top: `).concat(i, `px;
    padding-right: `).concat(s, `px;
    margin-left:0;
    margin-top:0;
    margin-right: `).concat(c, "px ").concat(r, `;
    `),
    n === "padding" && "padding-right: ".concat(c, "px ").concat(r, ";")
  ].filter(Boolean).join(""), `
  }
  
  .`).concat(lo, ` {
    right: `).concat(c, "px ").concat(r, `;
  }
  
  .`).concat(uo, ` {
    margin-right: `).concat(c, "px ").concat(r, `;
  }
  
  .`).concat(lo, " .").concat(lo, ` {
    right: 0 `).concat(r, `;
  }
  
  .`).concat(uo, " .").concat(uo, ` {
    margin-right: 0 `).concat(r, `;
  }
  
  body[`).concat(Jn, `] {
    `).concat(xx, ": ").concat(c, `px;
  }
`);
}, Qc = function() {
  var e = parseInt(document.body.getAttribute(Jn) || "0", 10);
  return isFinite(e) ? e : 0;
}, jx = function() {
  y.useEffect(function() {
    return document.body.setAttribute(Jn, (Qc() + 1).toString()), function() {
      var e = Qc() - 1;
      e <= 0 ? document.body.removeAttribute(Jn) : document.body.setAttribute(Jn, e.toString());
    };
  }, []);
}, Ux = function(e) {
  var t = e.noRelative, n = e.noImportant, r = e.gapMode, a = r === void 0 ? "margin" : r;
  jx();
  var i = y.useMemo(function() {
    return zx(a);
  }, [a]);
  return y.createElement(Fx, { styles: Bx(i, !t, a, n ? "" : "!important") });
}, ci = !1;
if (typeof window < "u")
  try {
    var eo = Object.defineProperty({}, "passive", {
      get: function() {
        return ci = !0, !0;
      }
    });
    window.addEventListener("test", eo, eo), window.removeEventListener("test", eo, eo);
  } catch {
    ci = !1;
  }
var Zn = ci ? { passive: !1 } : !1, Wx = function(e) {
  return e.tagName === "TEXTAREA";
}, yu = function(e, t) {
  if (!(e instanceof Element))
    return !1;
  var n = window.getComputedStyle(e);
  return (
    // not-not-scrollable
    n[t] !== "hidden" && // contains scroll inside self
    !(n.overflowY === n.overflowX && !Wx(e) && n[t] === "visible")
  );
}, Vx = function(e) {
  return yu(e, "overflowY");
}, Hx = function(e) {
  return yu(e, "overflowX");
}, Yc = function(e, t) {
  var n = t.ownerDocument, r = t;
  do {
    typeof ShadowRoot < "u" && r instanceof ShadowRoot && (r = r.host);
    var a = vu(e, r);
    if (a) {
      var i = bu(e, r), s = i[1], c = i[2];
      if (s > c)
        return !0;
    }
    r = r.parentNode;
  } while (r && r !== n.body);
  return !1;
}, qx = function(e) {
  var t = e.scrollTop, n = e.scrollHeight, r = e.clientHeight;
  return [
    t,
    n,
    r
  ];
}, Zx = function(e) {
  var t = e.scrollLeft, n = e.scrollWidth, r = e.clientWidth;
  return [
    t,
    n,
    r
  ];
}, vu = function(e, t) {
  return e === "v" ? Vx(t) : Hx(t);
}, bu = function(e, t) {
  return e === "v" ? qx(t) : Zx(t);
}, Gx = function(e, t) {
  return e === "h" && t === "rtl" ? -1 : 1;
}, Qx = function(e, t, n, r, a) {
  var i = Gx(e, window.getComputedStyle(t).direction), s = i * r, c = n.target, l = t.contains(c), u = !1, p = s > 0, m = 0, h = 0;
  do {
    if (!c)
      break;
    var g = bu(e, c), v = g[0], f = g[1], b = g[2], k = f - b - i * v;
    (v || k) && vu(e, c) && (m += k, h += v);
    var w = c.parentNode;
    c = w && w.nodeType === Node.DOCUMENT_FRAGMENT_NODE ? w.host : w;
  } while (
    // portaled content
    !l && c !== document.body || // self content
    l && (t.contains(c) || t === c)
  );
  return (p && Math.abs(m) < 1 || !p && Math.abs(h) < 1) && (u = !0), u;
}, to = function(e) {
  return "changedTouches" in e ? [e.changedTouches[0].clientX, e.changedTouches[0].clientY] : [0, 0];
}, Kc = function(e) {
  return [e.deltaX, e.deltaY];
}, Jc = function(e) {
  return e && "current" in e ? e.current : e;
}, Yx = function(e, t) {
  return e[0] === t[0] && e[1] === t[1];
}, Kx = function(e) {
  return `
  .block-interactivity-`.concat(e, ` {pointer-events: none;}
  .allow-interactivity-`).concat(e, ` {pointer-events: all;}
`);
}, Jx = 0, Gn = [];
function Xx(e) {
  var t = y.useRef([]), n = y.useRef([0, 0]), r = y.useRef(), a = y.useState(Jx++)[0], i = y.useState(gu)[0], s = y.useRef(e);
  y.useEffect(function() {
    s.current = e;
  }, [e]), y.useEffect(function() {
    if (e.inert) {
      document.body.classList.add("block-interactivity-".concat(a));
      var f = wx([e.lockRef.current], (e.shards || []).map(Jc), !0).filter(Boolean);
      return f.forEach(function(b) {
        return b.classList.add("allow-interactivity-".concat(a));
      }), function() {
        document.body.classList.remove("block-interactivity-".concat(a)), f.forEach(function(b) {
          return b.classList.remove("allow-interactivity-".concat(a));
        });
      };
    }
  }, [e.inert, e.lockRef.current, e.shards]);
  var c = y.useCallback(function(f, b) {
    if ("touches" in f && f.touches.length === 2 || f.type === "wheel" && f.ctrlKey)
      return !s.current.allowPinchZoom;
    var k = to(f), w = n.current, _ = "deltaX" in f ? f.deltaX : w[0] - k[0], x = "deltaY" in f ? f.deltaY : w[1] - k[1], N, I = f.target, S = Math.abs(_) > Math.abs(x) ? "h" : "v";
    if ("touches" in f && S === "h" && I.type === "range")
      return !1;
    var A = window.getSelection(), W = A && A.anchorNode, C = W ? W === I || W.contains(I) : !1;
    if (C)
      return !1;
    var T = Yc(S, I);
    if (!T)
      return !0;
    if (T ? N = S : (N = S === "v" ? "h" : "v", T = Yc(S, I)), !T)
      return !1;
    if (!r.current && "changedTouches" in f && (_ || x) && (r.current = N), !N)
      return !0;
    var P = r.current || N;
    return Qx(P, b, f, P === "h" ? _ : x);
  }, []), l = y.useCallback(function(f) {
    var b = f;
    if (!(!Gn.length || Gn[Gn.length - 1] !== i)) {
      var k = "deltaY" in b ? Kc(b) : to(b), w = t.current.filter(function(N) {
        return N.name === b.type && (N.target === b.target || b.target === N.shadowParent) && Yx(N.delta, k);
      })[0];
      if (w && w.should) {
        b.cancelable && b.preventDefault();
        return;
      }
      if (!w) {
        var _ = (s.current.shards || []).map(Jc).filter(Boolean).filter(function(N) {
          return N.contains(b.target);
        }), x = _.length > 0 ? c(b, _[0]) : !s.current.noIsolation;
        x && b.cancelable && b.preventDefault();
      }
    }
  }, []), u = y.useCallback(function(f, b, k, w) {
    var _ = { name: f, delta: b, target: k, should: w, shadowParent: ek(k) };
    t.current.push(_), setTimeout(function() {
      t.current = t.current.filter(function(x) {
        return x !== _;
      });
    }, 1);
  }, []), p = y.useCallback(function(f) {
    n.current = to(f), r.current = void 0;
  }, []), m = y.useCallback(function(f) {
    u(f.type, Kc(f), f.target, c(f, e.lockRef.current));
  }, []), h = y.useCallback(function(f) {
    u(f.type, to(f), f.target, c(f, e.lockRef.current));
  }, []);
  y.useEffect(function() {
    return Gn.push(i), e.setCallbacks({
      onScrollCapture: m,
      onWheelCapture: m,
      onTouchMoveCapture: h
    }), document.addEventListener("wheel", l, Zn), document.addEventListener("touchmove", l, Zn), document.addEventListener("touchstart", p, Zn), function() {
      Gn = Gn.filter(function(f) {
        return f !== i;
      }), document.removeEventListener("wheel", l, Zn), document.removeEventListener("touchmove", l, Zn), document.removeEventListener("touchstart", p, Zn);
    };
  }, []);
  var g = e.removeScrollBar, v = e.inert;
  return y.createElement(
    y.Fragment,
    null,
    v ? y.createElement(i, { styles: Kx(a) }) : null,
    g ? y.createElement(Ux, { noRelative: e.noRelative, gapMode: e.gapMode }) : null
  );
}
function ek(e) {
  for (var t = null; e !== null; )
    e instanceof ShadowRoot && (t = e.host, e = e.host), e = e.parentNode;
  return t;
}
const tk = Px(hu, Xx);
var Xi = y.forwardRef(function(e, t) {
  return y.createElement(Zo, Zt({}, e, { ref: t, sideCar: tk }));
});
Xi.classNames = Zo.classNames;
var nk = [" ", "Enter", "ArrowUp", "ArrowDown"], rk = [" ", "Enter"], Rn = "Select", [Go, Qo, ok] = ji(Rn), [ur] = wn(Rn, [
  ok,
  tu
]), Yo = tu(), [ak, _n] = ur(Rn), [ik, sk] = ur(Rn), wu = (e) => {
  const {
    __scopeSelect: t,
    children: n,
    open: r,
    defaultOpen: a,
    onOpenChange: i,
    value: s,
    defaultValue: c,
    onValueChange: l,
    dir: u,
    name: p,
    autoComplete: m,
    disabled: h,
    required: g,
    form: v
  } = e, f = Yo(t), [b, k] = y.useState(null), [w, _] = y.useState(null), [x, N] = y.useState(!1), I = Uo(u), [S, A] = yn({
    prop: r,
    defaultProp: a ?? !1,
    onChange: i,
    caller: Rn
  }), [W, C] = yn({
    prop: s,
    defaultProp: c,
    onChange: l,
    caller: Rn
  }), T = y.useRef(null), P = b ? v || !!b.closest("form") : !0, [L, F] = y.useState(/* @__PURE__ */ new Set()), $ = Array.from(L).map((M) => M.props.value).join(";");
  return /* @__PURE__ */ o(ex, { ...f, children: /* @__PURE__ */ d(
    ak,
    {
      required: g,
      scope: t,
      trigger: b,
      onTriggerChange: k,
      valueNode: w,
      onValueNodeChange: _,
      valueNodeHasChildren: x,
      onValueNodeHasChildrenChange: N,
      contentId: Qt(),
      value: W,
      onValueChange: C,
      open: S,
      onOpenChange: A,
      dir: I,
      triggerPointerDownPosRef: T,
      disabled: h,
      children: [
        /* @__PURE__ */ o(Go.Provider, { scope: t, children: /* @__PURE__ */ o(
          ik,
          {
            scope: e.__scopeSelect,
            onNativeOptionAdd: y.useCallback((M) => {
              F((D) => new Set(D).add(M));
            }, []),
            onNativeOptionRemove: y.useCallback((M) => {
              F((D) => {
                const O = new Set(D);
                return O.delete(M), O;
              });
            }, []),
            children: n
          }
        ) }),
        P ? /* @__PURE__ */ d(
          Bu,
          {
            "aria-hidden": !0,
            required: g,
            tabIndex: -1,
            name: p,
            autoComplete: m,
            value: W,
            onChange: (M) => C(M.target.value),
            disabled: h,
            form: v,
            children: [
              W === void 0 ? /* @__PURE__ */ o("option", { value: "" }) : null,
              Array.from(L)
            ]
          },
          $
        ) : null
      ]
    }
  ) });
};
wu.displayName = Rn;
var _u = "SelectTrigger", xu = y.forwardRef(
  (e, t) => {
    const { __scopeSelect: n, disabled: r = !1, ...a } = e, i = Yo(n), s = _n(_u, n), c = s.disabled || r, l = $e(t, s.onTriggerChange), u = Qo(n), p = y.useRef("touch"), [m, h, g] = Uu((f) => {
      const b = u().filter((_) => !_.disabled), k = b.find((_) => _.value === s.value), w = Wu(b, f, k);
      w !== void 0 && s.onValueChange(w.value);
    }), v = (f) => {
      c || (s.onOpenChange(!0), g()), f && (s.triggerPointerDownPosRef.current = {
        x: Math.round(f.pageX),
        y: Math.round(f.pageY)
      });
    };
    return /* @__PURE__ */ o(tx, { asChild: !0, ...i, children: /* @__PURE__ */ o(
      xe.button,
      {
        type: "button",
        role: "combobox",
        "aria-controls": s.contentId,
        "aria-expanded": s.open,
        "aria-required": s.required,
        "aria-autocomplete": "none",
        dir: s.dir,
        "data-state": s.open ? "open" : "closed",
        disabled: c,
        "data-disabled": c ? "" : void 0,
        "data-placeholder": ju(s.value) ? "" : void 0,
        ...a,
        ref: l,
        onClick: Ce(a.onClick, (f) => {
          f.currentTarget.focus(), p.current !== "mouse" && v(f);
        }),
        onPointerDown: Ce(a.onPointerDown, (f) => {
          p.current = f.pointerType;
          const b = f.target;
          b.hasPointerCapture(f.pointerId) && b.releasePointerCapture(f.pointerId), f.button === 0 && f.ctrlKey === !1 && f.pointerType === "mouse" && (v(f), f.preventDefault());
        }),
        onKeyDown: Ce(a.onKeyDown, (f) => {
          const b = m.current !== "";
          !(f.ctrlKey || f.altKey || f.metaKey) && f.key.length === 1 && h(f.key), !(b && f.key === " ") && nk.includes(f.key) && (v(), f.preventDefault());
        })
      }
    ) });
  }
);
xu.displayName = _u;
var ku = "SelectValue", Su = y.forwardRef(
  (e, t) => {
    const { __scopeSelect: n, className: r, style: a, children: i, placeholder: s = "", ...c } = e, l = _n(ku, n), { onValueNodeHasChildrenChange: u } = l, p = i !== void 0, m = $e(t, l.onValueNodeChange);
    return it(() => {
      u(p);
    }, [u, p]), /* @__PURE__ */ o(
      xe.span,
      {
        ...c,
        ref: m,
        style: { pointerEvents: "none" },
        children: ju(l.value) ? /* @__PURE__ */ o(Oe, { children: s }) : i
      }
    );
  }
);
Su.displayName = ku;
var ck = "SelectIcon", Cu = y.forwardRef(
  (e, t) => {
    const { __scopeSelect: n, children: r, ...a } = e;
    return /* @__PURE__ */ o(xe.span, { "aria-hidden": !0, ...a, ref: t, children: r || "▼" });
  }
);
Cu.displayName = ck;
var lk = "SelectPortal", Nu = (e) => /* @__PURE__ */ o(Ji, { asChild: !0, ...e });
Nu.displayName = lk;
var On = "SelectContent", Au = y.forwardRef(
  (e, t) => {
    const n = _n(On, e.__scopeSelect), [r, a] = y.useState();
    if (it(() => {
      a(new DocumentFragment());
    }, []), !n.open) {
      const i = r;
      return i ? Do.createPortal(
        /* @__PURE__ */ o(Tu, { scope: e.__scopeSelect, children: /* @__PURE__ */ o(Go.Slot, { scope: e.__scopeSelect, children: /* @__PURE__ */ o("div", { children: e.children }) }) }),
        i
      ) : null;
    }
    return /* @__PURE__ */ o(Pu, { ...e, ref: t });
  }
);
Au.displayName = On;
var Lt = 10, [Tu, xn] = ur(On), dk = "SelectContentImpl", uk = /* @__PURE__ */ ax("SelectContent.RemoveScroll"), Pu = y.forwardRef(
  (e, t) => {
    const {
      __scopeSelect: n,
      position: r = "item-aligned",
      onCloseAutoFocus: a,
      onEscapeKeyDown: i,
      onPointerDownOutside: s,
      //
      // PopperContent props
      side: c,
      sideOffset: l,
      align: u,
      alignOffset: p,
      arrowPadding: m,
      collisionBoundary: h,
      collisionPadding: g,
      sticky: v,
      hideWhenDetached: f,
      avoidCollisions: b,
      //
      ...k
    } = e, w = _n(On, n), [_, x] = y.useState(null), [N, I] = y.useState(null), S = $e(t, (B) => x(B)), [A, W] = y.useState(null), [C, T] = y.useState(
      null
    ), P = Qo(n), [L, F] = y.useState(!1), $ = y.useRef(!1);
    y.useEffect(() => {
      if (_) return mu(_);
    }, [_]), Bd();
    const M = y.useCallback(
      (B) => {
        const [ee, ...fe] = P().map((de) => de.ref.current), [G] = fe.slice(-1), oe = document.activeElement;
        for (const de of B)
          if (de === oe || (de?.scrollIntoView({ block: "nearest" }), de === ee && N && (N.scrollTop = 0), de === G && N && (N.scrollTop = N.scrollHeight), de?.focus(), document.activeElement !== oe)) return;
      },
      [P, N]
    ), D = y.useCallback(
      () => M([A, _]),
      [M, A, _]
    );
    y.useEffect(() => {
      L && D();
    }, [L, D]);
    const { onOpenChange: O, triggerPointerDownPosRef: V } = w;
    y.useEffect(() => {
      if (_) {
        let B = { x: 0, y: 0 };
        const ee = (G) => {
          B = {
            x: Math.abs(Math.round(G.pageX) - (V.current?.x ?? 0)),
            y: Math.abs(Math.round(G.pageY) - (V.current?.y ?? 0))
          };
        }, fe = (G) => {
          B.x <= 10 && B.y <= 10 ? G.preventDefault() : _.contains(G.target) || O(!1), document.removeEventListener("pointermove", ee), V.current = null;
        };
        return V.current !== null && (document.addEventListener("pointermove", ee), document.addEventListener("pointerup", fe, { capture: !0, once: !0 })), () => {
          document.removeEventListener("pointermove", ee), document.removeEventListener("pointerup", fe, { capture: !0 });
        };
      }
    }, [_, O, V]), y.useEffect(() => {
      const B = () => O(!1);
      return window.addEventListener("blur", B), window.addEventListener("resize", B), () => {
        window.removeEventListener("blur", B), window.removeEventListener("resize", B);
      };
    }, [O]);
    const [E, q] = Uu((B) => {
      const ee = P().filter((oe) => !oe.disabled), fe = ee.find((oe) => oe.ref.current === document.activeElement), G = Wu(ee, B, fe);
      G && setTimeout(() => G.ref.current.focus());
    }), re = y.useCallback(
      (B, ee, fe) => {
        const G = !$.current && !fe;
        (w.value !== void 0 && w.value === ee || G) && (W(B), G && ($.current = !0));
      },
      [w.value]
    ), j = y.useCallback(() => _?.focus(), [_]), X = y.useCallback(
      (B, ee, fe) => {
        const G = !$.current && !fe;
        (w.value !== void 0 && w.value === ee || G) && T(B);
      },
      [w.value]
    ), te = r === "popper" ? li : Eu, ve = te === li ? {
      side: c,
      sideOffset: l,
      align: u,
      alignOffset: p,
      arrowPadding: m,
      collisionBoundary: h,
      collisionPadding: g,
      sticky: v,
      hideWhenDetached: f,
      avoidCollisions: b
    } : {};
    return /* @__PURE__ */ o(
      Tu,
      {
        scope: n,
        content: _,
        viewport: N,
        onViewportChange: I,
        itemRefCallback: re,
        selectedItem: A,
        onItemLeave: j,
        itemTextRefCallback: X,
        focusSelectedItem: D,
        selectedItemText: C,
        position: r,
        isPositioned: L,
        searchRef: E,
        children: /* @__PURE__ */ o(Xi, { as: uk, allowPinchZoom: !0, children: /* @__PURE__ */ o(
          Wi,
          {
            asChild: !0,
            trapped: w.open,
            onMountAutoFocus: (B) => {
              B.preventDefault();
            },
            onUnmountAutoFocus: Ce(a, (B) => {
              w.trigger?.focus({ preventScroll: !0 }), B.preventDefault();
            }),
            children: /* @__PURE__ */ o(
              Ui,
              {
                asChild: !0,
                disableOutsidePointerEvents: !0,
                onEscapeKeyDown: i,
                onPointerDownOutside: s,
                onFocusOutside: (B) => B.preventDefault(),
                onDismiss: () => w.onOpenChange(!1),
                children: /* @__PURE__ */ o(
                  te,
                  {
                    role: "listbox",
                    id: w.contentId,
                    "data-state": w.open ? "open" : "closed",
                    dir: w.dir,
                    onContextMenu: (B) => B.preventDefault(),
                    ...k,
                    ...ve,
                    onPlaced: () => F(!0),
                    ref: S,
                    style: {
                      // flex layout so we can place the scroll buttons properly
                      display: "flex",
                      flexDirection: "column",
                      // reset the outline by default as the content MAY get focused
                      outline: "none",
                      ...k.style
                    },
                    onKeyDown: Ce(k.onKeyDown, (B) => {
                      const ee = B.ctrlKey || B.altKey || B.metaKey;
                      if (B.key === "Tab" && B.preventDefault(), !ee && B.key.length === 1 && q(B.key), ["ArrowUp", "ArrowDown", "Home", "End"].includes(B.key)) {
                        let G = P().filter((oe) => !oe.disabled).map((oe) => oe.ref.current);
                        if (["ArrowUp", "End"].includes(B.key) && (G = G.slice().reverse()), ["ArrowUp", "ArrowDown"].includes(B.key)) {
                          const oe = B.target, de = G.indexOf(oe);
                          G = G.slice(de + 1);
                        }
                        setTimeout(() => M(G)), B.preventDefault();
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
Pu.displayName = dk;
var mk = "SelectItemAlignedPosition", Eu = y.forwardRef((e, t) => {
  const { __scopeSelect: n, onPlaced: r, ...a } = e, i = _n(On, n), s = xn(On, n), [c, l] = y.useState(null), [u, p] = y.useState(null), m = $e(t, (S) => p(S)), h = Qo(n), g = y.useRef(!1), v = y.useRef(!0), { viewport: f, selectedItem: b, selectedItemText: k, focusSelectedItem: w } = s, _ = y.useCallback(() => {
    if (i.trigger && i.valueNode && c && u && f && b && k) {
      const S = i.trigger.getBoundingClientRect(), A = u.getBoundingClientRect(), W = i.valueNode.getBoundingClientRect(), C = k.getBoundingClientRect();
      if (i.dir !== "rtl") {
        const oe = C.left - A.left, de = W.left - oe, he = S.left - de, Fe = S.width + he, Xe = Math.max(Fe, A.width), et = window.innerWidth - Lt, We = Tc(de, [
          Lt,
          // Prevents the content from going off the starting edge of the
          // viewport. It may still go off the ending edge, but this can be
          // controlled by the user since they may want to manage overflow in a
          // specific way.
          // https://github.com/radix-ui/primitives/issues/2049
          Math.max(Lt, et - Xe)
        ]);
        c.style.minWidth = Fe + "px", c.style.left = We + "px";
      } else {
        const oe = A.right - C.right, de = window.innerWidth - W.right - oe, he = window.innerWidth - S.right - de, Fe = S.width + he, Xe = Math.max(Fe, A.width), et = window.innerWidth - Lt, We = Tc(de, [
          Lt,
          Math.max(Lt, et - Xe)
        ]);
        c.style.minWidth = Fe + "px", c.style.right = We + "px";
      }
      const T = h(), P = window.innerHeight - Lt * 2, L = f.scrollHeight, F = window.getComputedStyle(u), $ = parseInt(F.borderTopWidth, 10), M = parseInt(F.paddingTop, 10), D = parseInt(F.borderBottomWidth, 10), O = parseInt(F.paddingBottom, 10), V = $ + M + L + O + D, E = Math.min(b.offsetHeight * 5, V), q = window.getComputedStyle(f), re = parseInt(q.paddingTop, 10), j = parseInt(q.paddingBottom, 10), X = S.top + S.height / 2 - Lt, te = P - X, ve = b.offsetHeight / 2, B = b.offsetTop + ve, ee = $ + M + B, fe = V - ee;
      if (ee <= X) {
        const oe = T.length > 0 && b === T[T.length - 1].ref.current;
        c.style.bottom = "0px";
        const de = u.clientHeight - f.offsetTop - f.offsetHeight, he = Math.max(
          te,
          ve + // viewport might have padding bottom, include it to avoid a scrollable viewport
          (oe ? j : 0) + de + D
        ), Fe = ee + he;
        c.style.height = Fe + "px";
      } else {
        const oe = T.length > 0 && b === T[0].ref.current;
        c.style.top = "0px";
        const he = Math.max(
          X,
          $ + f.offsetTop + // viewport might have padding top, include it to avoid a scrollable viewport
          (oe ? re : 0) + ve
        ) + fe;
        c.style.height = he + "px", f.scrollTop = ee - X + f.offsetTop;
      }
      c.style.margin = `${Lt}px 0`, c.style.minHeight = E + "px", c.style.maxHeight = P + "px", r?.(), requestAnimationFrame(() => g.current = !0);
    }
  }, [
    h,
    i.trigger,
    i.valueNode,
    c,
    u,
    f,
    b,
    k,
    i.dir,
    r
  ]);
  it(() => _(), [_]);
  const [x, N] = y.useState();
  it(() => {
    u && N(window.getComputedStyle(u).zIndex);
  }, [u]);
  const I = y.useCallback(
    (S) => {
      S && v.current === !0 && (_(), w?.(), v.current = !1);
    },
    [_, w]
  );
  return /* @__PURE__ */ o(
    fk,
    {
      scope: n,
      contentWrapper: c,
      shouldExpandOnScrollRef: g,
      onScrollButtonChange: I,
      children: /* @__PURE__ */ o(
        "div",
        {
          ref: l,
          style: {
            display: "flex",
            flexDirection: "column",
            position: "fixed",
            zIndex: x
          },
          children: /* @__PURE__ */ o(
            xe.div,
            {
              ...a,
              ref: m,
              style: {
                // When we get the height of the content, it includes borders. If we were to set
                // the height without having `boxSizing: 'border-box'` it would be too big.
                boxSizing: "border-box",
                // We need to ensure the content doesn't get taller than the wrapper
                maxHeight: "100%",
                ...a.style
              }
            }
          )
        }
      )
    }
  );
});
Eu.displayName = mk;
var pk = "SelectPopperPosition", li = y.forwardRef((e, t) => {
  const {
    __scopeSelect: n,
    align: r = "start",
    collisionPadding: a = Lt,
    ...i
  } = e, s = Yo(n);
  return /* @__PURE__ */ o(
    nx,
    {
      ...s,
      ...i,
      ref: t,
      align: r,
      collisionPadding: a,
      style: {
        // Ensure border-box for floating-ui calculations
        boxSizing: "border-box",
        ...i.style,
        "--radix-select-content-transform-origin": "var(--radix-popper-transform-origin)",
        "--radix-select-content-available-width": "var(--radix-popper-available-width)",
        "--radix-select-content-available-height": "var(--radix-popper-available-height)",
        "--radix-select-trigger-width": "var(--radix-popper-anchor-width)",
        "--radix-select-trigger-height": "var(--radix-popper-anchor-height)"
      }
    }
  );
});
li.displayName = pk;
var [fk, es] = ur(On, {}), di = "SelectViewport", Iu = y.forwardRef(
  (e, t) => {
    const { __scopeSelect: n, nonce: r, ...a } = e, i = xn(di, n), s = es(di, n), c = $e(t, i.onViewportChange), l = y.useRef(0);
    return /* @__PURE__ */ d(Oe, { children: [
      /* @__PURE__ */ o(
        "style",
        {
          dangerouslySetInnerHTML: {
            __html: "[data-radix-select-viewport]{scrollbar-width:none;-ms-overflow-style:none;-webkit-overflow-scrolling:touch;}[data-radix-select-viewport]::-webkit-scrollbar{display:none}"
          },
          nonce: r
        }
      ),
      /* @__PURE__ */ o(Go.Slot, { scope: n, children: /* @__PURE__ */ o(
        xe.div,
        {
          "data-radix-select-viewport": "",
          role: "presentation",
          ...a,
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
            ...a.style
          },
          onScroll: Ce(a.onScroll, (u) => {
            const p = u.currentTarget, { contentWrapper: m, shouldExpandOnScrollRef: h } = s;
            if (h?.current && m) {
              const g = Math.abs(l.current - p.scrollTop);
              if (g > 0) {
                const v = window.innerHeight - Lt * 2, f = parseFloat(m.style.minHeight), b = parseFloat(m.style.height), k = Math.max(f, b);
                if (k < v) {
                  const w = k + g, _ = Math.min(v, w), x = w - _;
                  m.style.height = _ + "px", m.style.bottom === "0px" && (p.scrollTop = x > 0 ? x : 0, m.style.justifyContent = "flex-end");
                }
              }
            }
            l.current = p.scrollTop;
          })
        }
      ) })
    ] });
  }
);
Iu.displayName = di;
var Ru = "SelectGroup", [hk, gk] = ur(Ru), Ou = y.forwardRef(
  (e, t) => {
    const { __scopeSelect: n, ...r } = e, a = Qt();
    return /* @__PURE__ */ o(hk, { scope: n, id: a, children: /* @__PURE__ */ o(xe.div, { role: "group", "aria-labelledby": a, ...r, ref: t }) });
  }
);
Ou.displayName = Ru;
var Mu = "SelectLabel", yk = y.forwardRef(
  (e, t) => {
    const { __scopeSelect: n, ...r } = e, a = gk(Mu, n);
    return /* @__PURE__ */ o(xe.div, { id: a.id, ...r, ref: t });
  }
);
yk.displayName = Mu;
var So = "SelectItem", [vk, Du] = ur(So), Lu = y.forwardRef(
  (e, t) => {
    const {
      __scopeSelect: n,
      value: r,
      disabled: a = !1,
      textValue: i,
      ...s
    } = e, c = _n(So, n), l = xn(So, n), u = c.value === r, [p, m] = y.useState(i ?? ""), [h, g] = y.useState(!1), v = $e(
      t,
      (w) => l.itemRefCallback?.(w, r, a)
    ), f = Qt(), b = y.useRef("touch"), k = () => {
      a || (c.onValueChange(r), c.onOpenChange(!1));
    };
    if (r === "")
      throw new Error(
        "A <Select.Item /> must have a value prop that is not an empty string. This is because the Select value can be set to an empty string to clear the selection and show the placeholder."
      );
    return /* @__PURE__ */ o(
      vk,
      {
        scope: n,
        value: r,
        disabled: a,
        textId: f,
        isSelected: u,
        onItemTextChange: y.useCallback((w) => {
          m((_) => _ || (w?.textContent ?? "").trim());
        }, []),
        children: /* @__PURE__ */ o(
          Go.ItemSlot,
          {
            scope: n,
            value: r,
            disabled: a,
            textValue: p,
            children: /* @__PURE__ */ o(
              xe.div,
              {
                role: "option",
                "aria-labelledby": f,
                "data-highlighted": h ? "" : void 0,
                "aria-selected": u && h,
                "data-state": u ? "checked" : "unchecked",
                "aria-disabled": a || void 0,
                "data-disabled": a ? "" : void 0,
                tabIndex: a ? void 0 : -1,
                ...s,
                ref: v,
                onFocus: Ce(s.onFocus, () => g(!0)),
                onBlur: Ce(s.onBlur, () => g(!1)),
                onClick: Ce(s.onClick, () => {
                  b.current !== "mouse" && k();
                }),
                onPointerUp: Ce(s.onPointerUp, () => {
                  b.current === "mouse" && k();
                }),
                onPointerDown: Ce(s.onPointerDown, (w) => {
                  b.current = w.pointerType;
                }),
                onPointerMove: Ce(s.onPointerMove, (w) => {
                  b.current = w.pointerType, a ? l.onItemLeave?.() : b.current === "mouse" && w.currentTarget.focus({ preventScroll: !0 });
                }),
                onPointerLeave: Ce(s.onPointerLeave, (w) => {
                  w.currentTarget === document.activeElement && l.onItemLeave?.();
                }),
                onKeyDown: Ce(s.onKeyDown, (w) => {
                  l.searchRef?.current !== "" && w.key === " " || (rk.includes(w.key) && k(), w.key === " " && w.preventDefault());
                })
              }
            )
          }
        )
      }
    );
  }
);
Lu.displayName = So;
var xr = "SelectItemText", $u = y.forwardRef(
  (e, t) => {
    const { __scopeSelect: n, className: r, style: a, ...i } = e, s = _n(xr, n), c = xn(xr, n), l = Du(xr, n), u = sk(xr, n), [p, m] = y.useState(null), h = $e(
      t,
      (k) => m(k),
      l.onItemTextChange,
      (k) => c.itemTextRefCallback?.(k, l.value, l.disabled)
    ), g = p?.textContent, v = y.useMemo(
      () => /* @__PURE__ */ o("option", { value: l.value, disabled: l.disabled, children: g }, l.value),
      [l.disabled, l.value, g]
    ), { onNativeOptionAdd: f, onNativeOptionRemove: b } = u;
    return it(() => (f(v), () => b(v)), [f, b, v]), /* @__PURE__ */ d(Oe, { children: [
      /* @__PURE__ */ o(xe.span, { id: l.textId, ...i, ref: h }),
      l.isSelected && s.valueNode && !s.valueNodeHasChildren ? Do.createPortal(i.children, s.valueNode) : null
    ] });
  }
);
$u.displayName = xr;
var zu = "SelectItemIndicator", bk = y.forwardRef(
  (e, t) => {
    const { __scopeSelect: n, ...r } = e;
    return Du(zu, n).isSelected ? /* @__PURE__ */ o(xe.span, { "aria-hidden": !0, ...r, ref: t }) : null;
  }
);
bk.displayName = zu;
var ui = "SelectScrollUpButton", wk = y.forwardRef((e, t) => {
  const n = xn(ui, e.__scopeSelect), r = es(ui, e.__scopeSelect), [a, i] = y.useState(!1), s = $e(t, r.onScrollButtonChange);
  return it(() => {
    if (n.viewport && n.isPositioned) {
      let c = function() {
        const u = l.scrollTop > 0;
        i(u);
      };
      const l = n.viewport;
      return c(), l.addEventListener("scroll", c), () => l.removeEventListener("scroll", c);
    }
  }, [n.viewport, n.isPositioned]), a ? /* @__PURE__ */ o(
    Fu,
    {
      ...e,
      ref: s,
      onAutoScroll: () => {
        const { viewport: c, selectedItem: l } = n;
        c && l && (c.scrollTop = c.scrollTop - l.offsetHeight);
      }
    }
  ) : null;
});
wk.displayName = ui;
var mi = "SelectScrollDownButton", _k = y.forwardRef((e, t) => {
  const n = xn(mi, e.__scopeSelect), r = es(mi, e.__scopeSelect), [a, i] = y.useState(!1), s = $e(t, r.onScrollButtonChange);
  return it(() => {
    if (n.viewport && n.isPositioned) {
      let c = function() {
        const u = l.scrollHeight - l.clientHeight, p = Math.ceil(l.scrollTop) < u;
        i(p);
      };
      const l = n.viewport;
      return c(), l.addEventListener("scroll", c), () => l.removeEventListener("scroll", c);
    }
  }, [n.viewport, n.isPositioned]), a ? /* @__PURE__ */ o(
    Fu,
    {
      ...e,
      ref: s,
      onAutoScroll: () => {
        const { viewport: c, selectedItem: l } = n;
        c && l && (c.scrollTop = c.scrollTop + l.offsetHeight);
      }
    }
  ) : null;
});
_k.displayName = mi;
var Fu = y.forwardRef((e, t) => {
  const { __scopeSelect: n, onAutoScroll: r, ...a } = e, i = xn("SelectScrollButton", n), s = y.useRef(null), c = Qo(n), l = y.useCallback(() => {
    s.current !== null && (window.clearInterval(s.current), s.current = null);
  }, []);
  return y.useEffect(() => () => l(), [l]), it(() => {
    c().find((p) => p.ref.current === document.activeElement)?.ref.current?.scrollIntoView({ block: "nearest" });
  }, [c]), /* @__PURE__ */ o(
    xe.div,
    {
      "aria-hidden": !0,
      ...a,
      ref: t,
      style: { flexShrink: 0, ...a.style },
      onPointerDown: Ce(a.onPointerDown, () => {
        s.current === null && (s.current = window.setInterval(r, 50));
      }),
      onPointerMove: Ce(a.onPointerMove, () => {
        i.onItemLeave?.(), s.current === null && (s.current = window.setInterval(r, 50));
      }),
      onPointerLeave: Ce(a.onPointerLeave, () => {
        l();
      })
    }
  );
}), xk = "SelectSeparator", kk = y.forwardRef(
  (e, t) => {
    const { __scopeSelect: n, ...r } = e;
    return /* @__PURE__ */ o(xe.div, { "aria-hidden": !0, ...r, ref: t });
  }
);
kk.displayName = xk;
var pi = "SelectArrow", Sk = y.forwardRef(
  (e, t) => {
    const { __scopeSelect: n, ...r } = e, a = Yo(n), i = _n(pi, n), s = xn(pi, n);
    return i.open && s.position === "popper" ? /* @__PURE__ */ o(rx, { ...a, ...r, ref: t }) : null;
  }
);
Sk.displayName = pi;
var Ck = "SelectBubbleInput", Bu = y.forwardRef(
  ({ __scopeSelect: e, value: t, ...n }, r) => {
    const a = y.useRef(null), i = $e(r, a), s = fx(t);
    return y.useEffect(() => {
      const c = a.current;
      if (!c) return;
      const l = window.HTMLSelectElement.prototype, p = Object.getOwnPropertyDescriptor(
        l,
        "value"
      ).set;
      if (s !== t && p) {
        const m = new Event("change", { bubbles: !0 });
        p.call(c, t), c.dispatchEvent(m);
      }
    }, [s, t]), /* @__PURE__ */ o(
      xe.select,
      {
        ...n,
        style: { ...du, ...n.style },
        ref: i,
        defaultValue: t
      }
    );
  }
);
Bu.displayName = Ck;
function ju(e) {
  return e === "" || e === void 0;
}
function Uu(e) {
  const t = fn(e), n = y.useRef(""), r = y.useRef(0), a = y.useCallback(
    (s) => {
      const c = n.current + s;
      t(c), (function l(u) {
        n.current = u, window.clearTimeout(r.current), u !== "" && (r.current = window.setTimeout(() => l(""), 1e3));
      })(c);
    },
    [t]
  ), i = y.useCallback(() => {
    n.current = "", window.clearTimeout(r.current);
  }, []);
  return y.useEffect(() => () => window.clearTimeout(r.current), []), [n, a, i];
}
function Wu(e, t, n) {
  const a = t.length > 1 && Array.from(t).every((u) => u === t[0]) ? t[0] : t, i = n ? e.indexOf(n) : -1;
  let s = Nk(e, Math.max(i, 0));
  a.length === 1 && (s = s.filter((u) => u !== n));
  const l = s.find(
    (u) => u.textValue.toLowerCase().startsWith(a.toLowerCase())
  );
  return l !== n ? l : void 0;
}
function Nk(e, t) {
  return e.map((n, r) => e[(t + r) % e.length]);
}
var Ak = wu, Vu = xu, Tk = Su, Pk = Cu, Ek = Nu, Hu = Au, Ik = Iu, Rk = Ou, qu = Lu, Ok = $u;
const Co = Ak, Mk = Rk, No = Tk, Mr = y.forwardRef(({ className: e, children: t, ...n }, r) => /* @__PURE__ */ d(
  Vu,
  {
    ref: r,
    className: Z(
      "flex h-10 w-full items-center justify-between rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50 dark:focus-visible:ring-neutral-50/20",
      e
    ),
    ...n,
    children: [
      t,
      /* @__PURE__ */ o(Pk, { className: "ml-2 text-neutral-500 dark:text-neutral-400", children: "▾" })
    ]
  }
));
Mr.displayName = Vu.displayName;
const Dr = y.forwardRef(({ className: e, children: t, position: n = "popper", ...r }, a) => /* @__PURE__ */ o(Ek, { children: /* @__PURE__ */ o(
  Hu,
  {
    ref: a,
    position: n,
    className: Z(
      "z-50 min-w-[8rem] overflow-hidden rounded-md border border-neutral-200 bg-white text-neutral-950 shadow-md dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50",
      e
    ),
    ...r,
    children: /* @__PURE__ */ o(Ik, { className: Z("p-1", n === "popper" ? "w-full" : void 0), children: t })
  }
) }));
Dr.displayName = Hu.displayName;
const Lr = y.forwardRef(({ className: e, children: t, ...n }, r) => /* @__PURE__ */ o(
  qu,
  {
    ref: r,
    className: Z(
      "relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-neutral-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 dark:focus:bg-neutral-800",
      e
    ),
    ...n,
    children: /* @__PURE__ */ o(Ok, { children: t })
  }
));
Lr.displayName = qu.displayName;
function Dk(e, t) {
  return y.useReducer((n, r) => t[n][r] ?? n, e);
}
var mr = (e) => {
  const { present: t, children: n } = e, r = Lk(t), a = typeof n == "function" ? n({ present: r.isPresent }) : y.Children.only(n), i = $e(r.ref, $k(a));
  return typeof n == "function" || r.isPresent ? y.cloneElement(a, { ref: i }) : null;
};
mr.displayName = "Presence";
function Lk(e) {
  const [t, n] = y.useState(), r = y.useRef(null), a = y.useRef(e), i = y.useRef("none"), s = e ? "mounted" : "unmounted", [c, l] = Dk(s, {
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
  return y.useEffect(() => {
    const u = no(r.current);
    i.current = c === "mounted" ? u : "none";
  }, [c]), it(() => {
    const u = r.current, p = a.current;
    if (p !== e) {
      const h = i.current, g = no(u);
      e ? l("MOUNT") : g === "none" || u?.display === "none" ? l("UNMOUNT") : l(p && h !== g ? "ANIMATION_OUT" : "UNMOUNT"), a.current = e;
    }
  }, [e, l]), it(() => {
    if (t) {
      let u;
      const p = t.ownerDocument.defaultView ?? window, m = (g) => {
        const f = no(r.current).includes(CSS.escape(g.animationName));
        if (g.target === t && f && (l("ANIMATION_END"), !a.current)) {
          const b = t.style.animationFillMode;
          t.style.animationFillMode = "forwards", u = p.setTimeout(() => {
            t.style.animationFillMode === "forwards" && (t.style.animationFillMode = b);
          });
        }
      }, h = (g) => {
        g.target === t && (i.current = no(r.current));
      };
      return t.addEventListener("animationstart", h), t.addEventListener("animationcancel", m), t.addEventListener("animationend", m), () => {
        p.clearTimeout(u), t.removeEventListener("animationstart", h), t.removeEventListener("animationcancel", m), t.removeEventListener("animationend", m);
      };
    } else
      l("ANIMATION_END");
  }, [t, l]), {
    isPresent: ["mounted", "unmountSuspended"].includes(c),
    ref: y.useCallback((u) => {
      r.current = u ? getComputedStyle(u) : null, n(u);
    }, [])
  };
}
function no(e) {
  return e?.animationName || "none";
}
function $k(e) {
  let t = Object.getOwnPropertyDescriptor(e.props, "ref")?.get, n = t && "isReactWarning" in t && t.isReactWarning;
  return n ? e.ref : (t = Object.getOwnPropertyDescriptor(e, "ref")?.get, n = t && "isReactWarning" in t && t.isReactWarning, n ? e.props.ref : e.props.ref || e.ref);
}
// @__NO_SIDE_EFFECTS__
function zk(e) {
  const t = /* @__PURE__ */ Fk(e), n = y.forwardRef((r, a) => {
    const { children: i, ...s } = r, c = y.Children.toArray(i), l = c.find(jk);
    if (l) {
      const u = l.props.children, p = c.map((m) => m === l ? y.Children.count(u) > 1 ? y.Children.only(null) : y.isValidElement(u) ? u.props.children : null : m);
      return /* @__PURE__ */ o(t, { ...s, ref: a, children: y.isValidElement(u) ? y.cloneElement(u, void 0, p) : null });
    }
    return /* @__PURE__ */ o(t, { ...s, ref: a, children: i });
  });
  return n.displayName = `${e}.Slot`, n;
}
// @__NO_SIDE_EFFECTS__
function Fk(e) {
  const t = y.forwardRef((n, r) => {
    const { children: a, ...i } = n;
    if (y.isValidElement(a)) {
      const s = Wk(a), c = Uk(i, a.props);
      return a.type !== y.Fragment && (c.ref = r ? ir(r, s) : s), y.cloneElement(a, c);
    }
    return y.Children.count(a) > 1 ? y.Children.only(null) : null;
  });
  return t.displayName = `${e}.SlotClone`, t;
}
var Bk = Symbol("radix.slottable");
function jk(e) {
  return y.isValidElement(e) && typeof e.type == "function" && "__radixId" in e.type && e.type.__radixId === Bk;
}
function Uk(e, t) {
  const n = { ...t };
  for (const r in t) {
    const a = e[r], i = t[r];
    /^on[A-Z]/.test(r) ? a && i ? n[r] = (...c) => {
      const l = i(...c);
      return a(...c), l;
    } : a && (n[r] = a) : r === "style" ? n[r] = { ...a, ...i } : r === "className" && (n[r] = [a, i].filter(Boolean).join(" "));
  }
  return { ...e, ...n };
}
function Wk(e) {
  let t = Object.getOwnPropertyDescriptor(e.props, "ref")?.get, n = t && "isReactWarning" in t && t.isReactWarning;
  return n ? e.ref : (t = Object.getOwnPropertyDescriptor(e, "ref")?.get, n = t && "isReactWarning" in t && t.isReactWarning, n ? e.props.ref : e.props.ref || e.ref);
}
var Ko = "Dialog", [Zu] = wn(Ko), [Vk, Ut] = Zu(Ko), Gu = (e) => {
  const {
    __scopeDialog: t,
    children: n,
    open: r,
    defaultOpen: a,
    onOpenChange: i,
    modal: s = !0
  } = e, c = y.useRef(null), l = y.useRef(null), [u, p] = yn({
    prop: r,
    defaultProp: a ?? !1,
    onChange: i,
    caller: Ko
  });
  return /* @__PURE__ */ o(
    Vk,
    {
      scope: t,
      triggerRef: c,
      contentRef: l,
      contentId: Qt(),
      titleId: Qt(),
      descriptionId: Qt(),
      open: u,
      onOpenChange: p,
      onOpenToggle: y.useCallback(() => p((m) => !m), [p]),
      modal: s,
      children: n
    }
  );
};
Gu.displayName = Ko;
var Qu = "DialogTrigger", Yu = y.forwardRef(
  (e, t) => {
    const { __scopeDialog: n, ...r } = e, a = Ut(Qu, n), i = $e(t, a.triggerRef);
    return /* @__PURE__ */ o(
      xe.button,
      {
        type: "button",
        "aria-haspopup": "dialog",
        "aria-expanded": a.open,
        "aria-controls": a.contentId,
        "data-state": rs(a.open),
        ...r,
        ref: i,
        onClick: Ce(e.onClick, a.onOpenToggle)
      }
    );
  }
);
Yu.displayName = Qu;
var ts = "DialogPortal", [Hk, Ku] = Zu(ts, {
  forceMount: void 0
}), Ju = (e) => {
  const { __scopeDialog: t, forceMount: n, children: r, container: a } = e, i = Ut(ts, t);
  return /* @__PURE__ */ o(Hk, { scope: t, forceMount: n, children: y.Children.map(r, (s) => /* @__PURE__ */ o(mr, { present: n || i.open, children: /* @__PURE__ */ o(Ji, { asChild: !0, container: a, children: s }) })) });
};
Ju.displayName = ts;
var Ao = "DialogOverlay", Xu = y.forwardRef(
  (e, t) => {
    const n = Ku(Ao, e.__scopeDialog), { forceMount: r = n.forceMount, ...a } = e, i = Ut(Ao, e.__scopeDialog);
    return i.modal ? /* @__PURE__ */ o(mr, { present: r || i.open, children: /* @__PURE__ */ o(Zk, { ...a, ref: t }) }) : null;
  }
);
Xu.displayName = Ao;
var qk = /* @__PURE__ */ zk("DialogOverlay.RemoveScroll"), Zk = y.forwardRef(
  (e, t) => {
    const { __scopeDialog: n, ...r } = e, a = Ut(Ao, n);
    return (
      // Make sure `Content` is scrollable even when it doesn't live inside `RemoveScroll`
      // ie. when `Overlay` and `Content` are siblings
      /* @__PURE__ */ o(Xi, { as: qk, allowPinchZoom: !0, shards: [a.contentRef], children: /* @__PURE__ */ o(
        xe.div,
        {
          "data-state": rs(a.open),
          ...r,
          ref: t,
          style: { pointerEvents: "auto", ...r.style }
        }
      ) })
    );
  }
), Mn = "DialogContent", em = y.forwardRef(
  (e, t) => {
    const n = Ku(Mn, e.__scopeDialog), { forceMount: r = n.forceMount, ...a } = e, i = Ut(Mn, e.__scopeDialog);
    return /* @__PURE__ */ o(mr, { present: r || i.open, children: i.modal ? /* @__PURE__ */ o(Gk, { ...a, ref: t }) : /* @__PURE__ */ o(Qk, { ...a, ref: t }) });
  }
);
em.displayName = Mn;
var Gk = y.forwardRef(
  (e, t) => {
    const n = Ut(Mn, e.__scopeDialog), r = y.useRef(null), a = $e(t, n.contentRef, r);
    return y.useEffect(() => {
      const i = r.current;
      if (i) return mu(i);
    }, []), /* @__PURE__ */ o(
      tm,
      {
        ...e,
        ref: a,
        trapFocus: n.open,
        disableOutsidePointerEvents: !0,
        onCloseAutoFocus: Ce(e.onCloseAutoFocus, (i) => {
          i.preventDefault(), n.triggerRef.current?.focus();
        }),
        onPointerDownOutside: Ce(e.onPointerDownOutside, (i) => {
          const s = i.detail.originalEvent, c = s.button === 0 && s.ctrlKey === !0;
          (s.button === 2 || c) && i.preventDefault();
        }),
        onFocusOutside: Ce(
          e.onFocusOutside,
          (i) => i.preventDefault()
        )
      }
    );
  }
), Qk = y.forwardRef(
  (e, t) => {
    const n = Ut(Mn, e.__scopeDialog), r = y.useRef(!1), a = y.useRef(!1);
    return /* @__PURE__ */ o(
      tm,
      {
        ...e,
        ref: t,
        trapFocus: !1,
        disableOutsidePointerEvents: !1,
        onCloseAutoFocus: (i) => {
          e.onCloseAutoFocus?.(i), i.defaultPrevented || (r.current || n.triggerRef.current?.focus(), i.preventDefault()), r.current = !1, a.current = !1;
        },
        onInteractOutside: (i) => {
          e.onInteractOutside?.(i), i.defaultPrevented || (r.current = !0, i.detail.originalEvent.type === "pointerdown" && (a.current = !0));
          const s = i.target;
          n.triggerRef.current?.contains(s) && i.preventDefault(), i.detail.originalEvent.type === "focusin" && a.current && i.preventDefault();
        }
      }
    );
  }
), tm = y.forwardRef(
  (e, t) => {
    const { __scopeDialog: n, trapFocus: r, onOpenAutoFocus: a, onCloseAutoFocus: i, ...s } = e, c = Ut(Mn, n), l = y.useRef(null), u = $e(t, l);
    return Bd(), /* @__PURE__ */ d(Oe, { children: [
      /* @__PURE__ */ o(
        Wi,
        {
          asChild: !0,
          loop: !0,
          trapped: r,
          onMountAutoFocus: a,
          onUnmountAutoFocus: i,
          children: /* @__PURE__ */ o(
            Ui,
            {
              role: "dialog",
              id: c.contentId,
              "aria-describedby": c.descriptionId,
              "aria-labelledby": c.titleId,
              "data-state": rs(c.open),
              ...s,
              ref: u,
              onDismiss: () => c.onOpenChange(!1)
            }
          )
        }
      ),
      /* @__PURE__ */ d(Oe, { children: [
        /* @__PURE__ */ o(Yk, { titleId: c.titleId }),
        /* @__PURE__ */ o(Jk, { contentRef: l, descriptionId: c.descriptionId })
      ] })
    ] });
  }
), ns = "DialogTitle", nm = y.forwardRef(
  (e, t) => {
    const { __scopeDialog: n, ...r } = e, a = Ut(ns, n);
    return /* @__PURE__ */ o(xe.h2, { id: a.titleId, ...r, ref: t });
  }
);
nm.displayName = ns;
var rm = "DialogDescription", om = y.forwardRef(
  (e, t) => {
    const { __scopeDialog: n, ...r } = e, a = Ut(rm, n);
    return /* @__PURE__ */ o(xe.p, { id: a.descriptionId, ...r, ref: t });
  }
);
om.displayName = rm;
var am = "DialogClose", im = y.forwardRef(
  (e, t) => {
    const { __scopeDialog: n, ...r } = e, a = Ut(am, n);
    return /* @__PURE__ */ o(
      xe.button,
      {
        type: "button",
        ...r,
        ref: t,
        onClick: Ce(e.onClick, () => a.onOpenChange(!1))
      }
    );
  }
);
im.displayName = am;
function rs(e) {
  return e ? "open" : "closed";
}
var sm = "DialogTitleWarning", [FN, cm] = nw(sm, {
  contentName: Mn,
  titleName: ns,
  docsSlug: "dialog"
}), Yk = ({ titleId: e }) => {
  const t = cm(sm), n = `\`${t.contentName}\` requires a \`${t.titleName}\` for the component to be accessible for screen reader users.

If you want to hide the \`${t.titleName}\`, you can wrap it with our VisuallyHidden component.

For more information, see https://radix-ui.com/primitives/docs/components/${t.docsSlug}`;
  return y.useEffect(() => {
    e && (document.getElementById(e) || console.error(n));
  }, [n, e]), null;
}, Kk = "DialogDescriptionWarning", Jk = ({ contentRef: e, descriptionId: t }) => {
  const r = `Warning: Missing \`Description\` or \`aria-describedby={undefined}\` for {${cm(Kk).contentName}}.`;
  return y.useEffect(() => {
    const a = e.current?.getAttribute("aria-describedby");
    t && a && (document.getElementById(t) || console.warn(r));
  }, [r, e, t]), null;
}, lm = Gu, dm = Yu, um = Ju, Jo = Xu, Xo = em, ea = nm, ta = om, mm = im;
const os = lm, Xk = dm, pm = um, eS = mm, as = y.forwardRef(({ className: e, ...t }, n) => /* @__PURE__ */ o(
  Jo,
  {
    ref: n,
    className: Z(
      "fixed inset-0 z-50 bg-neutral-950/40 backdrop-blur-sm transition-opacity data-[state=closed]:opacity-0 data-[state=open]:opacity-100",
      e
    ),
    ...t
  }
));
as.displayName = Jo.displayName;
const na = y.forwardRef(({ className: e, children: t, ...n }, r) => /* @__PURE__ */ d(pm, { children: [
  /* @__PURE__ */ o(as, {}),
  /* @__PURE__ */ o(
    Xo,
    {
      ref: r,
      className: Z(
        "fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 border border-neutral-200 bg-white p-6 shadow-lg outline-none transition data-[state=closed]:opacity-0 data-[state=closed]:scale-95 data-[state=open]:opacity-100 data-[state=open]:scale-100 dark:border-neutral-800 dark:bg-neutral-950",
        "rounded-2xl",
        e
      ),
      ...n,
      children: t
    }
  )
] }));
na.displayName = Xo.displayName;
const is = ({ className: e, ...t }) => /* @__PURE__ */ o("div", { className: Z("flex flex-col space-y-2 text-center sm:text-left", e), ...t }), fm = ({ className: e, ...t }) => /* @__PURE__ */ o(
  "div",
  {
    className: Z("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", e),
    ...t
  }
), ra = y.forwardRef(({ className: e, ...t }, n) => /* @__PURE__ */ o(
  ea,
  {
    ref: n,
    className: Z("text-lg font-semibold leading-none tracking-tight", e),
    ...t
  }
));
ra.displayName = ea.displayName;
const ss = y.forwardRef(({ className: e, ...t }, n) => /* @__PURE__ */ o(
  ta,
  {
    ref: n,
    className: Z("text-sm text-neutral-500 dark:text-neutral-400", e),
    ...t
  }
));
ss.displayName = ta.displayName;
const oa = lm, aa = dm, hm = mm, gm = um, cs = y.forwardRef(({ className: e, ...t }, n) => /* @__PURE__ */ o(
  Jo,
  {
    ref: n,
    className: Z(
      "fixed inset-0 z-50 bg-neutral-950/40 backdrop-blur-sm transition-opacity data-[state=closed]:opacity-0 data-[state=open]:opacity-100",
      e
    ),
    ...t
  }
));
cs.displayName = Jo.displayName;
const tS = Fi(
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
), Br = y.forwardRef(({ side: e = "right", className: t, children: n, overlayClassName: r, ...a }, i) => /* @__PURE__ */ d(gm, { children: [
  /* @__PURE__ */ o(cs, { className: r }),
  /* @__PURE__ */ o(
    Xo,
    {
      ref: i,
      className: Z(tS({ side: e }), t),
      ...a,
      children: n
    }
  )
] }));
Br.displayName = Xo.displayName;
const ia = ({ className: e, ...t }) => /* @__PURE__ */ o("div", { className: Z("flex flex-col space-y-2 text-left", e), ...t }), sa = y.forwardRef(({ className: e, ...t }, n) => /* @__PURE__ */ o(
  ea,
  {
    ref: n,
    className: Z("text-lg font-semibold leading-none tracking-tight", e),
    ...t
  }
));
sa.displayName = ea.displayName;
const ym = y.forwardRef(({ className: e, ...t }, n) => /* @__PURE__ */ o(
  ta,
  {
    ref: n,
    className: Z("text-sm text-neutral-500 dark:text-neutral-400", e),
    ...t
  }
));
ym.displayName = ta.displayName;
var ca = "Collapsible", [nS, vm] = wn(ca), [rS, ls] = nS(ca), bm = y.forwardRef(
  (e, t) => {
    const {
      __scopeCollapsible: n,
      open: r,
      defaultOpen: a,
      disabled: i,
      onOpenChange: s,
      ...c
    } = e, [l, u] = yn({
      prop: r,
      defaultProp: a ?? !1,
      onChange: s,
      caller: ca
    });
    return /* @__PURE__ */ o(
      rS,
      {
        scope: n,
        disabled: i,
        contentId: Qt(),
        open: l,
        onOpenToggle: y.useCallback(() => u((p) => !p), [u]),
        children: /* @__PURE__ */ o(
          xe.div,
          {
            "data-state": us(l),
            "data-disabled": i ? "" : void 0,
            ...c,
            ref: t
          }
        )
      }
    );
  }
);
bm.displayName = ca;
var wm = "CollapsibleTrigger", _m = y.forwardRef(
  (e, t) => {
    const { __scopeCollapsible: n, ...r } = e, a = ls(wm, n);
    return /* @__PURE__ */ o(
      xe.button,
      {
        type: "button",
        "aria-controls": a.contentId,
        "aria-expanded": a.open || !1,
        "data-state": us(a.open),
        "data-disabled": a.disabled ? "" : void 0,
        disabled: a.disabled,
        ...r,
        ref: t,
        onClick: Ce(e.onClick, a.onOpenToggle)
      }
    );
  }
);
_m.displayName = wm;
var ds = "CollapsibleContent", xm = y.forwardRef(
  (e, t) => {
    const { forceMount: n, ...r } = e, a = ls(ds, e.__scopeCollapsible);
    return /* @__PURE__ */ o(mr, { present: n || a.open, children: ({ present: i }) => /* @__PURE__ */ o(oS, { ...r, ref: t, present: i }) });
  }
);
xm.displayName = ds;
var oS = y.forwardRef((e, t) => {
  const { __scopeCollapsible: n, present: r, children: a, ...i } = e, s = ls(ds, n), [c, l] = y.useState(r), u = y.useRef(null), p = $e(t, u), m = y.useRef(0), h = m.current, g = y.useRef(0), v = g.current, f = s.open || c, b = y.useRef(f), k = y.useRef(void 0);
  return y.useEffect(() => {
    const w = requestAnimationFrame(() => b.current = !1);
    return () => cancelAnimationFrame(w);
  }, []), it(() => {
    const w = u.current;
    if (w) {
      k.current = k.current || {
        transitionDuration: w.style.transitionDuration,
        animationName: w.style.animationName
      }, w.style.transitionDuration = "0s", w.style.animationName = "none";
      const _ = w.getBoundingClientRect();
      m.current = _.height, g.current = _.width, b.current || (w.style.transitionDuration = k.current.transitionDuration, w.style.animationName = k.current.animationName), l(r);
    }
  }, [s.open, r]), /* @__PURE__ */ o(
    xe.div,
    {
      "data-state": us(s.open),
      "data-disabled": s.disabled ? "" : void 0,
      id: s.contentId,
      hidden: !f,
      ...i,
      ref: p,
      style: {
        "--radix-collapsible-content-height": h ? `${h}px` : void 0,
        "--radix-collapsible-content-width": v ? `${v}px` : void 0,
        ...e.style
      },
      children: f && a
    }
  );
});
function us(e) {
  return e ? "open" : "closed";
}
var aS = bm, iS = _m, sS = xm, Wt = "Accordion", cS = ["Home", "End", "ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight"], [ms, lS, dS] = ji(Wt), [la] = wn(Wt, [
  dS,
  vm
]), ps = vm(), km = U.forwardRef(
  (e, t) => {
    const { type: n, ...r } = e, a = r, i = r;
    return /* @__PURE__ */ o(ms.Provider, { scope: e.__scopeAccordion, children: n === "multiple" ? /* @__PURE__ */ o(fS, { ...i, ref: t }) : /* @__PURE__ */ o(pS, { ...a, ref: t }) });
  }
);
km.displayName = Wt;
var [Sm, uS] = la(Wt), [Cm, mS] = la(
  Wt,
  { collapsible: !1 }
), pS = U.forwardRef(
  (e, t) => {
    const {
      value: n,
      defaultValue: r,
      onValueChange: a = () => {
      },
      collapsible: i = !1,
      ...s
    } = e, [c, l] = yn({
      prop: n,
      defaultProp: r ?? "",
      onChange: a,
      caller: Wt
    });
    return /* @__PURE__ */ o(
      Sm,
      {
        scope: e.__scopeAccordion,
        value: U.useMemo(() => c ? [c] : [], [c]),
        onItemOpen: l,
        onItemClose: U.useCallback(() => i && l(""), [i, l]),
        children: /* @__PURE__ */ o(Cm, { scope: e.__scopeAccordion, collapsible: i, children: /* @__PURE__ */ o(Nm, { ...s, ref: t }) })
      }
    );
  }
), fS = U.forwardRef((e, t) => {
  const {
    value: n,
    defaultValue: r,
    onValueChange: a = () => {
    },
    ...i
  } = e, [s, c] = yn({
    prop: n,
    defaultProp: r ?? [],
    onChange: a,
    caller: Wt
  }), l = U.useCallback(
    (p) => c((m = []) => [...m, p]),
    [c]
  ), u = U.useCallback(
    (p) => c((m = []) => m.filter((h) => h !== p)),
    [c]
  );
  return /* @__PURE__ */ o(
    Sm,
    {
      scope: e.__scopeAccordion,
      value: s,
      onItemOpen: l,
      onItemClose: u,
      children: /* @__PURE__ */ o(Cm, { scope: e.__scopeAccordion, collapsible: !0, children: /* @__PURE__ */ o(Nm, { ...i, ref: t }) })
    }
  );
}), [hS, da] = la(Wt), Nm = U.forwardRef(
  (e, t) => {
    const { __scopeAccordion: n, disabled: r, dir: a, orientation: i = "vertical", ...s } = e, c = U.useRef(null), l = $e(c, t), u = lS(n), m = Uo(a) === "ltr", h = Ce(e.onKeyDown, (g) => {
      if (!cS.includes(g.key)) return;
      const v = g.target, f = u().filter((A) => !A.ref.current?.disabled), b = f.findIndex((A) => A.ref.current === v), k = f.length;
      if (b === -1) return;
      g.preventDefault();
      let w = b;
      const _ = 0, x = k - 1, N = () => {
        w = b + 1, w > x && (w = _);
      }, I = () => {
        w = b - 1, w < _ && (w = x);
      };
      switch (g.key) {
        case "Home":
          w = _;
          break;
        case "End":
          w = x;
          break;
        case "ArrowRight":
          i === "horizontal" && (m ? N() : I());
          break;
        case "ArrowDown":
          i === "vertical" && N();
          break;
        case "ArrowLeft":
          i === "horizontal" && (m ? I() : N());
          break;
        case "ArrowUp":
          i === "vertical" && I();
          break;
      }
      const S = w % k;
      f[S].ref.current?.focus();
    });
    return /* @__PURE__ */ o(
      hS,
      {
        scope: n,
        disabled: r,
        direction: a,
        orientation: i,
        children: /* @__PURE__ */ o(ms.Slot, { scope: n, children: /* @__PURE__ */ o(
          xe.div,
          {
            ...s,
            "data-orientation": i,
            ref: l,
            onKeyDown: r ? void 0 : h
          }
        ) })
      }
    );
  }
), To = "AccordionItem", [gS, fs] = la(To), Am = U.forwardRef(
  (e, t) => {
    const { __scopeAccordion: n, value: r, ...a } = e, i = da(To, n), s = uS(To, n), c = ps(n), l = Qt(), u = r && s.value.includes(r) || !1, p = i.disabled || e.disabled;
    return /* @__PURE__ */ o(
      gS,
      {
        scope: n,
        open: u,
        disabled: p,
        triggerId: l,
        children: /* @__PURE__ */ o(
          aS,
          {
            "data-orientation": i.orientation,
            "data-state": Om(u),
            ...c,
            ...a,
            ref: t,
            disabled: p,
            open: u,
            onOpenChange: (m) => {
              m ? s.onItemOpen(r) : s.onItemClose(r);
            }
          }
        )
      }
    );
  }
);
Am.displayName = To;
var Tm = "AccordionHeader", Pm = U.forwardRef(
  (e, t) => {
    const { __scopeAccordion: n, ...r } = e, a = da(Wt, n), i = fs(Tm, n);
    return /* @__PURE__ */ o(
      xe.h3,
      {
        "data-orientation": a.orientation,
        "data-state": Om(i.open),
        "data-disabled": i.disabled ? "" : void 0,
        ...r,
        ref: t
      }
    );
  }
);
Pm.displayName = Tm;
var fi = "AccordionTrigger", Em = U.forwardRef(
  (e, t) => {
    const { __scopeAccordion: n, ...r } = e, a = da(Wt, n), i = fs(fi, n), s = mS(fi, n), c = ps(n);
    return /* @__PURE__ */ o(ms.ItemSlot, { scope: n, children: /* @__PURE__ */ o(
      iS,
      {
        "aria-disabled": i.open && !s.collapsible || void 0,
        "data-orientation": a.orientation,
        id: i.triggerId,
        ...c,
        ...r,
        ref: t
      }
    ) });
  }
);
Em.displayName = fi;
var Im = "AccordionContent", Rm = U.forwardRef(
  (e, t) => {
    const { __scopeAccordion: n, ...r } = e, a = da(Wt, n), i = fs(Im, n), s = ps(n);
    return /* @__PURE__ */ o(
      sS,
      {
        role: "region",
        "aria-labelledby": i.triggerId,
        "data-orientation": a.orientation,
        ...s,
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
Rm.displayName = Im;
function Om(e) {
  return e ? "open" : "closed";
}
var yS = km, Mm = Am, vS = Pm, Dm = Em, Lm = Rm;
const $m = yS, Sr = y.forwardRef(({ className: e, ...t }, n) => /* @__PURE__ */ o(
  Mm,
  {
    ref: n,
    className: Z("border-b border-neutral-200 dark:border-neutral-800", e),
    ...t
  }
));
Sr.displayName = Mm.displayName;
const Cr = y.forwardRef(({ className: e, children: t, ...n }, r) => /* @__PURE__ */ o(vS, { className: "flex", children: /* @__PURE__ */ d(
  Dm,
  {
    ref: r,
    className: Z(
      "flex flex-1 items-center justify-between py-4 text-sm font-medium transition-all hover:underline",
      e
    ),
    ...n,
    children: [
      t,
      /* @__PURE__ */ o("span", { className: "ml-3 text-neutral-500 dark:text-neutral-400", "aria-hidden": !0, children: "▾" })
    ]
  }
) }));
Cr.displayName = Dm.displayName;
const Nr = y.forwardRef(({ className: e, children: t, ...n }, r) => /* @__PURE__ */ o(
  Lm,
  {
    ref: r,
    className: Z(
      "overflow-hidden text-sm",
      e
    ),
    ...n,
    children: /* @__PURE__ */ o("div", { className: "pb-4 pt-0", children: t })
  }
));
Nr.displayName = Lm.displayName;
var Ua = "rovingFocusGroup.onEntryFocus", bS = { bubbles: !1, cancelable: !0 }, jr = "RovingFocusGroup", [hi, zm, wS] = ji(jr), [_S, Fm] = wn(
  jr,
  [wS]
), [xS, kS] = _S(jr), Bm = y.forwardRef(
  (e, t) => /* @__PURE__ */ o(hi.Provider, { scope: e.__scopeRovingFocusGroup, children: /* @__PURE__ */ o(hi.Slot, { scope: e.__scopeRovingFocusGroup, children: /* @__PURE__ */ o(SS, { ...e, ref: t }) }) })
);
Bm.displayName = jr;
var SS = y.forwardRef((e, t) => {
  const {
    __scopeRovingFocusGroup: n,
    orientation: r,
    loop: a = !1,
    dir: i,
    currentTabStopId: s,
    defaultCurrentTabStopId: c,
    onCurrentTabStopIdChange: l,
    onEntryFocus: u,
    preventScrollOnEntryFocus: p = !1,
    ...m
  } = e, h = y.useRef(null), g = $e(t, h), v = Uo(i), [f, b] = yn({
    prop: s,
    defaultProp: c ?? null,
    onChange: l,
    caller: jr
  }), [k, w] = y.useState(!1), _ = fn(u), x = zm(n), N = y.useRef(!1), [I, S] = y.useState(0);
  return y.useEffect(() => {
    const A = h.current;
    if (A)
      return A.addEventListener(Ua, _), () => A.removeEventListener(Ua, _);
  }, [_]), /* @__PURE__ */ o(
    xS,
    {
      scope: n,
      orientation: r,
      dir: v,
      loop: a,
      currentTabStopId: f,
      onItemFocus: y.useCallback(
        (A) => b(A),
        [b]
      ),
      onItemShiftTab: y.useCallback(() => w(!0), []),
      onFocusableItemAdd: y.useCallback(
        () => S((A) => A + 1),
        []
      ),
      onFocusableItemRemove: y.useCallback(
        () => S((A) => A - 1),
        []
      ),
      children: /* @__PURE__ */ o(
        xe.div,
        {
          tabIndex: k || I === 0 ? -1 : 0,
          "data-orientation": r,
          ...m,
          ref: g,
          style: { outline: "none", ...e.style },
          onMouseDown: Ce(e.onMouseDown, () => {
            N.current = !0;
          }),
          onFocus: Ce(e.onFocus, (A) => {
            const W = !N.current;
            if (A.target === A.currentTarget && W && !k) {
              const C = new CustomEvent(Ua, bS);
              if (A.currentTarget.dispatchEvent(C), !C.defaultPrevented) {
                const T = x().filter((M) => M.focusable), P = T.find((M) => M.active), L = T.find((M) => M.id === f), $ = [P, L, ...T].filter(
                  Boolean
                ).map((M) => M.ref.current);
                Wm($, p);
              }
            }
            N.current = !1;
          }),
          onBlur: Ce(e.onBlur, () => w(!1))
        }
      )
    }
  );
}), jm = "RovingFocusGroupItem", Um = y.forwardRef(
  (e, t) => {
    const {
      __scopeRovingFocusGroup: n,
      focusable: r = !0,
      active: a = !1,
      tabStopId: i,
      children: s,
      ...c
    } = e, l = Qt(), u = i || l, p = kS(jm, n), m = p.currentTabStopId === u, h = zm(n), { onFocusableItemAdd: g, onFocusableItemRemove: v, currentTabStopId: f } = p;
    return y.useEffect(() => {
      if (r)
        return g(), () => v();
    }, [r, g, v]), /* @__PURE__ */ o(
      hi.ItemSlot,
      {
        scope: n,
        id: u,
        focusable: r,
        active: a,
        children: /* @__PURE__ */ o(
          xe.span,
          {
            tabIndex: m ? 0 : -1,
            "data-orientation": p.orientation,
            ...c,
            ref: t,
            onMouseDown: Ce(e.onMouseDown, (b) => {
              r ? p.onItemFocus(u) : b.preventDefault();
            }),
            onFocus: Ce(e.onFocus, () => p.onItemFocus(u)),
            onKeyDown: Ce(e.onKeyDown, (b) => {
              if (b.key === "Tab" && b.shiftKey) {
                p.onItemShiftTab();
                return;
              }
              if (b.target !== b.currentTarget) return;
              const k = AS(b, p.orientation, p.dir);
              if (k !== void 0) {
                if (b.metaKey || b.ctrlKey || b.altKey || b.shiftKey) return;
                b.preventDefault();
                let _ = h().filter((x) => x.focusable).map((x) => x.ref.current);
                if (k === "last") _.reverse();
                else if (k === "prev" || k === "next") {
                  k === "prev" && _.reverse();
                  const x = _.indexOf(b.currentTarget);
                  _ = p.loop ? TS(_, x + 1) : _.slice(x + 1);
                }
                setTimeout(() => Wm(_));
              }
            }),
            children: typeof s == "function" ? s({ isCurrentTabStop: m, hasTabStop: f != null }) : s
          }
        )
      }
    );
  }
);
Um.displayName = jm;
var CS = {
  ArrowLeft: "prev",
  ArrowUp: "prev",
  ArrowRight: "next",
  ArrowDown: "next",
  PageUp: "first",
  Home: "first",
  PageDown: "last",
  End: "last"
};
function NS(e, t) {
  return t !== "rtl" ? e : e === "ArrowLeft" ? "ArrowRight" : e === "ArrowRight" ? "ArrowLeft" : e;
}
function AS(e, t, n) {
  const r = NS(e.key, n);
  if (!(t === "vertical" && ["ArrowLeft", "ArrowRight"].includes(r)) && !(t === "horizontal" && ["ArrowUp", "ArrowDown"].includes(r)))
    return CS[r];
}
function Wm(e, t = !1) {
  const n = document.activeElement;
  for (const r of e)
    if (r === n || (r.focus({ preventScroll: t }), document.activeElement !== n)) return;
}
function TS(e, t) {
  return e.map((n, r) => e[(t + r) % e.length]);
}
var PS = Bm, ES = Um, ua = "Tabs", [IS] = wn(ua, [
  Fm
]), Vm = Fm(), [RS, hs] = IS(ua), Hm = y.forwardRef(
  (e, t) => {
    const {
      __scopeTabs: n,
      value: r,
      onValueChange: a,
      defaultValue: i,
      orientation: s = "horizontal",
      dir: c,
      activationMode: l = "automatic",
      ...u
    } = e, p = Uo(c), [m, h] = yn({
      prop: r,
      onChange: a,
      defaultProp: i ?? "",
      caller: ua
    });
    return /* @__PURE__ */ o(
      RS,
      {
        scope: n,
        baseId: Qt(),
        value: m,
        onValueChange: h,
        orientation: s,
        dir: p,
        activationMode: l,
        children: /* @__PURE__ */ o(
          xe.div,
          {
            dir: p,
            "data-orientation": s,
            ...u,
            ref: t
          }
        )
      }
    );
  }
);
Hm.displayName = ua;
var qm = "TabsList", Zm = y.forwardRef(
  (e, t) => {
    const { __scopeTabs: n, loop: r = !0, ...a } = e, i = hs(qm, n), s = Vm(n);
    return /* @__PURE__ */ o(
      PS,
      {
        asChild: !0,
        ...s,
        orientation: i.orientation,
        dir: i.dir,
        loop: r,
        children: /* @__PURE__ */ o(
          xe.div,
          {
            role: "tablist",
            "aria-orientation": i.orientation,
            ...a,
            ref: t
          }
        )
      }
    );
  }
);
Zm.displayName = qm;
var Gm = "TabsTrigger", Qm = y.forwardRef(
  (e, t) => {
    const { __scopeTabs: n, value: r, disabled: a = !1, ...i } = e, s = hs(Gm, n), c = Vm(n), l = Jm(s.baseId, r), u = Xm(s.baseId, r), p = r === s.value;
    return /* @__PURE__ */ o(
      ES,
      {
        asChild: !0,
        ...c,
        focusable: !a,
        active: p,
        children: /* @__PURE__ */ o(
          xe.button,
          {
            type: "button",
            role: "tab",
            "aria-selected": p,
            "aria-controls": u,
            "data-state": p ? "active" : "inactive",
            "data-disabled": a ? "" : void 0,
            disabled: a,
            id: l,
            ...i,
            ref: t,
            onMouseDown: Ce(e.onMouseDown, (m) => {
              !a && m.button === 0 && m.ctrlKey === !1 ? s.onValueChange(r) : m.preventDefault();
            }),
            onKeyDown: Ce(e.onKeyDown, (m) => {
              [" ", "Enter"].includes(m.key) && s.onValueChange(r);
            }),
            onFocus: Ce(e.onFocus, () => {
              const m = s.activationMode !== "manual";
              !p && !a && m && s.onValueChange(r);
            })
          }
        )
      }
    );
  }
);
Qm.displayName = Gm;
var Ym = "TabsContent", Km = y.forwardRef(
  (e, t) => {
    const { __scopeTabs: n, value: r, forceMount: a, children: i, ...s } = e, c = hs(Ym, n), l = Jm(c.baseId, r), u = Xm(c.baseId, r), p = r === c.value, m = y.useRef(p);
    return y.useEffect(() => {
      const h = requestAnimationFrame(() => m.current = !1);
      return () => cancelAnimationFrame(h);
    }, []), /* @__PURE__ */ o(mr, { present: a || p, children: ({ present: h }) => /* @__PURE__ */ o(
      xe.div,
      {
        "data-state": p ? "active" : "inactive",
        "data-orientation": c.orientation,
        role: "tabpanel",
        "aria-labelledby": l,
        hidden: !h,
        id: u,
        tabIndex: 0,
        ...s,
        ref: t,
        style: {
          ...e.style,
          animationDuration: m.current ? "0s" : void 0
        },
        children: h && i
      }
    ) });
  }
);
Km.displayName = Ym;
function Jm(e, t) {
  return `${e}-trigger-${t}`;
}
function Xm(e, t) {
  return `${e}-content-${t}`;
}
var OS = Hm, ep = Zm, tp = Qm, np = Km;
const gs = OS, ma = y.forwardRef(({ className: e, ...t }, n) => /* @__PURE__ */ o(
  ep,
  {
    ref: n,
    className: Z(
      "inline-flex h-10 items-center justify-center rounded-md bg-neutral-100 p-1 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
      e
    ),
    ...t
  }
));
ma.displayName = ep.displayName;
const $r = y.forwardRef(({ className: e, ...t }, n) => /* @__PURE__ */ o(
  tp,
  {
    ref: n,
    className: Z(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/20 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-neutral-950 data-[state=active]:shadow-sm dark:ring-offset-neutral-950 dark:focus-visible:ring-neutral-50/20 dark:data-[state=active]:bg-neutral-950 dark:data-[state=active]:text-neutral-50",
      e
    ),
    ...t
  }
));
$r.displayName = tp.displayName;
const rp = y.forwardRef(({ className: e, ...t }, n) => /* @__PURE__ */ o(
  np,
  {
    ref: n,
    className: Z(
      "mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/20 dark:ring-offset-neutral-950 dark:focus-visible:ring-neutral-50/20",
      e
    ),
    ...t
  }
));
rp.displayName = np.displayName;
function tr({
  title: e,
  description: t,
  actionLabel: n,
  onAction: r,
  className: a
}) {
  return /* @__PURE__ */ o(
    "div",
    {
      className: Z(
        "flex flex-col items-center justify-center rounded-xl border border-neutral-200 bg-white p-10 text-center dark:border-neutral-800 dark:bg-neutral-950",
        a
      ),
      children: /* @__PURE__ */ d("div", { className: "max-w-sm", children: [
        /* @__PURE__ */ o("h3", { className: "text-base font-semibold text-neutral-950 dark:text-neutral-50", children: e }),
        t ? /* @__PURE__ */ o("p", { className: "mt-2 text-sm text-neutral-600 dark:text-neutral-400", children: t }) : null,
        n && r ? /* @__PURE__ */ o("div", { className: "mt-5", children: /* @__PURE__ */ o(le, { type: "button", onClick: r, variant: "secondary", children: n }) }) : null
      ] })
    }
  );
}
function Kt({
  title: e,
  description: t,
  onRetry: n,
  className: r
}) {
  return /* @__PURE__ */ d(
    "div",
    {
      className: Z(
        "rounded-xl border border-neutral-200 bg-white p-6 text-neutral-950 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50",
        r
      ),
      children: [
        /* @__PURE__ */ o("h3", { className: "text-sm font-semibold", children: e ?? "Something went wrong" }),
        /* @__PURE__ */ o("p", { className: "mt-2 text-sm text-neutral-600 dark:text-neutral-400", children: t }),
        n ? /* @__PURE__ */ o("div", { className: "mt-4", children: /* @__PURE__ */ o(le, { type: "button", variant: "outline", onClick: n, children: "Try again" }) }) : null
      ]
    }
  );
}
class MS extends y.Component {
  state = { error: null };
  static getDerivedStateFromError(t) {
    return { error: t };
  }
  render() {
    return this.state.error ? this.props.fallback ? this.props.fallback(this.state.error) : /* @__PURE__ */ o(Kt, { description: this.state.error.message }) : this.props.children;
  }
}
function DS(e) {
  if (typeof document > "u") return;
  let t = document.head || document.getElementsByTagName("head")[0], n = document.createElement("style");
  n.type = "text/css", t.appendChild(n), n.styleSheet ? n.styleSheet.cssText = e : n.appendChild(document.createTextNode(e));
}
const LS = (e) => {
  switch (e) {
    case "success":
      return FS;
    case "info":
      return jS;
    case "warning":
      return BS;
    case "error":
      return US;
    default:
      return null;
  }
}, $S = Array(12).fill(0), zS = ({ visible: e, className: t }) => /* @__PURE__ */ U.createElement("div", {
  className: [
    "sonner-loading-wrapper",
    t
  ].filter(Boolean).join(" "),
  "data-visible": e
}, /* @__PURE__ */ U.createElement("div", {
  className: "sonner-spinner"
}, $S.map((n, r) => /* @__PURE__ */ U.createElement("div", {
  className: "sonner-loading-bar",
  key: `spinner-bar-${r}`
})))), FS = /* @__PURE__ */ U.createElement("svg", {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 20 20",
  fill: "currentColor",
  height: "20",
  width: "20"
}, /* @__PURE__ */ U.createElement("path", {
  fillRule: "evenodd",
  d: "M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z",
  clipRule: "evenodd"
})), BS = /* @__PURE__ */ U.createElement("svg", {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "currentColor",
  height: "20",
  width: "20"
}, /* @__PURE__ */ U.createElement("path", {
  fillRule: "evenodd",
  d: "M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z",
  clipRule: "evenodd"
})), jS = /* @__PURE__ */ U.createElement("svg", {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 20 20",
  fill: "currentColor",
  height: "20",
  width: "20"
}, /* @__PURE__ */ U.createElement("path", {
  fillRule: "evenodd",
  d: "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z",
  clipRule: "evenodd"
})), US = /* @__PURE__ */ U.createElement("svg", {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 20 20",
  fill: "currentColor",
  height: "20",
  width: "20"
}, /* @__PURE__ */ U.createElement("path", {
  fillRule: "evenodd",
  d: "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z",
  clipRule: "evenodd"
})), WS = /* @__PURE__ */ U.createElement("svg", {
  xmlns: "http://www.w3.org/2000/svg",
  width: "12",
  height: "12",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "1.5",
  strokeLinecap: "round",
  strokeLinejoin: "round"
}, /* @__PURE__ */ U.createElement("line", {
  x1: "18",
  y1: "6",
  x2: "6",
  y2: "18"
}), /* @__PURE__ */ U.createElement("line", {
  x1: "6",
  y1: "6",
  x2: "18",
  y2: "18"
})), VS = () => {
  const [e, t] = U.useState(document.hidden);
  return U.useEffect(() => {
    const n = () => {
      t(document.hidden);
    };
    return document.addEventListener("visibilitychange", n), () => window.removeEventListener("visibilitychange", n);
  }, []), e;
};
let gi = 1;
class HS {
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
      const { message: r, ...a } = t, i = typeof t?.id == "number" || ((n = t.id) == null ? void 0 : n.length) > 0 ? t.id : gi++, s = this.toasts.find((l) => l.id === i), c = t.dismissible === void 0 ? !0 : t.dismissible;
      return this.dismissedToasts.has(i) && this.dismissedToasts.delete(i), s ? this.toasts = this.toasts.map((l) => l.id === i ? (this.publish({
        ...l,
        ...t,
        id: i,
        title: r
      }), {
        ...l,
        ...t,
        id: i,
        dismissible: c,
        title: r
      }) : l) : this.addToast({
        title: r,
        ...a,
        dismissible: c,
        id: i
      }), i;
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
      const a = Promise.resolve(t instanceof Function ? t() : t);
      let i = r !== void 0, s;
      const c = a.then(async (u) => {
        if (s = [
          "resolve",
          u
        ], U.isValidElement(u))
          i = !1, this.create({
            id: r,
            type: "default",
            message: u
          });
        else if (ZS(u) && !u.ok) {
          i = !1;
          const m = typeof n.error == "function" ? await n.error(`HTTP error! status: ${u.status}`) : n.error, h = typeof n.description == "function" ? await n.description(`HTTP error! status: ${u.status}`) : n.description, v = typeof m == "object" && !U.isValidElement(m) ? m : {
            message: m
          };
          this.create({
            id: r,
            type: "error",
            description: h,
            ...v
          });
        } else if (u instanceof Error) {
          i = !1;
          const m = typeof n.error == "function" ? await n.error(u) : n.error, h = typeof n.description == "function" ? await n.description(u) : n.description, v = typeof m == "object" && !U.isValidElement(m) ? m : {
            message: m
          };
          this.create({
            id: r,
            type: "error",
            description: h,
            ...v
          });
        } else if (n.success !== void 0) {
          i = !1;
          const m = typeof n.success == "function" ? await n.success(u) : n.success, h = typeof n.description == "function" ? await n.description(u) : n.description, v = typeof m == "object" && !U.isValidElement(m) ? m : {
            message: m
          };
          this.create({
            id: r,
            type: "success",
            description: h,
            ...v
          });
        }
      }).catch(async (u) => {
        if (s = [
          "reject",
          u
        ], n.error !== void 0) {
          i = !1;
          const p = typeof n.error == "function" ? await n.error(u) : n.error, m = typeof n.description == "function" ? await n.description(u) : n.description, g = typeof p == "object" && !U.isValidElement(p) ? p : {
            message: p
          };
          this.create({
            id: r,
            type: "error",
            description: m,
            ...g
          });
        }
      }).finally(() => {
        i && (this.dismiss(r), r = void 0), n.finally == null || n.finally.call(n);
      }), l = () => new Promise((u, p) => c.then(() => s[0] === "reject" ? p(s[1]) : u(s[1])).catch(p));
      return typeof r != "string" && typeof r != "number" ? {
        unwrap: l
      } : Object.assign(r, {
        unwrap: l
      });
    }, this.custom = (t, n) => {
      const r = n?.id || gi++;
      return this.create({
        jsx: t(r),
        id: r,
        ...n
      }), r;
    }, this.getActiveToasts = () => this.toasts.filter((t) => !this.dismissedToasts.has(t.id)), this.subscribers = [], this.toasts = [], this.dismissedToasts = /* @__PURE__ */ new Set();
  }
}
const _t = new HS(), qS = (e, t) => {
  const n = t?.id || gi++;
  return _t.addToast({
    title: e,
    ...t,
    id: n
  }), n;
}, ZS = (e) => e && typeof e == "object" && "ok" in e && typeof e.ok == "boolean" && "status" in e && typeof e.status == "number", GS = qS, QS = () => _t.toasts, YS = () => _t.getActiveToasts(), KS = Object.assign(GS, {
  success: _t.success,
  info: _t.info,
  warning: _t.warning,
  error: _t.error,
  custom: _t.custom,
  message: _t.message,
  promise: _t.promise,
  dismiss: _t.dismiss,
  loading: _t.loading
}, {
  getHistory: QS,
  getToasts: YS
});
DS("[data-sonner-toaster][dir=ltr],html[dir=ltr]{--toast-icon-margin-start:-3px;--toast-icon-margin-end:4px;--toast-svg-margin-start:-1px;--toast-svg-margin-end:0px;--toast-button-margin-start:auto;--toast-button-margin-end:0;--toast-close-button-start:0;--toast-close-button-end:unset;--toast-close-button-transform:translate(-35%, -35%)}[data-sonner-toaster][dir=rtl],html[dir=rtl]{--toast-icon-margin-start:4px;--toast-icon-margin-end:-3px;--toast-svg-margin-start:0px;--toast-svg-margin-end:-1px;--toast-button-margin-start:0;--toast-button-margin-end:auto;--toast-close-button-start:unset;--toast-close-button-end:0;--toast-close-button-transform:translate(35%, -35%)}[data-sonner-toaster]{position:fixed;width:var(--width);font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,Noto Sans,sans-serif,Apple Color Emoji,Segoe UI Emoji,Segoe UI Symbol,Noto Color Emoji;--gray1:hsl(0, 0%, 99%);--gray2:hsl(0, 0%, 97.3%);--gray3:hsl(0, 0%, 95.1%);--gray4:hsl(0, 0%, 93%);--gray5:hsl(0, 0%, 90.9%);--gray6:hsl(0, 0%, 88.7%);--gray7:hsl(0, 0%, 85.8%);--gray8:hsl(0, 0%, 78%);--gray9:hsl(0, 0%, 56.1%);--gray10:hsl(0, 0%, 52.3%);--gray11:hsl(0, 0%, 43.5%);--gray12:hsl(0, 0%, 9%);--border-radius:8px;box-sizing:border-box;padding:0;margin:0;list-style:none;outline:0;z-index:999999999;transition:transform .4s ease}@media (hover:none) and (pointer:coarse){[data-sonner-toaster][data-lifted=true]{transform:none}}[data-sonner-toaster][data-x-position=right]{right:var(--offset-right)}[data-sonner-toaster][data-x-position=left]{left:var(--offset-left)}[data-sonner-toaster][data-x-position=center]{left:50%;transform:translateX(-50%)}[data-sonner-toaster][data-y-position=top]{top:var(--offset-top)}[data-sonner-toaster][data-y-position=bottom]{bottom:var(--offset-bottom)}[data-sonner-toast]{--y:translateY(100%);--lift-amount:calc(var(--lift) * var(--gap));z-index:var(--z-index);position:absolute;opacity:0;transform:var(--y);touch-action:none;transition:transform .4s,opacity .4s,height .4s,box-shadow .2s;box-sizing:border-box;outline:0;overflow-wrap:anywhere}[data-sonner-toast][data-styled=true]{padding:16px;background:var(--normal-bg);border:1px solid var(--normal-border);color:var(--normal-text);border-radius:var(--border-radius);box-shadow:0 4px 12px rgba(0,0,0,.1);width:var(--width);font-size:13px;display:flex;align-items:center;gap:6px}[data-sonner-toast]:focus-visible{box-shadow:0 4px 12px rgba(0,0,0,.1),0 0 0 2px rgba(0,0,0,.2)}[data-sonner-toast][data-y-position=top]{top:0;--y:translateY(-100%);--lift:1;--lift-amount:calc(1 * var(--gap))}[data-sonner-toast][data-y-position=bottom]{bottom:0;--y:translateY(100%);--lift:-1;--lift-amount:calc(var(--lift) * var(--gap))}[data-sonner-toast][data-styled=true] [data-description]{font-weight:400;line-height:1.4;color:#3f3f3f}[data-rich-colors=true][data-sonner-toast][data-styled=true] [data-description]{color:inherit}[data-sonner-toaster][data-sonner-theme=dark] [data-description]{color:#e8e8e8}[data-sonner-toast][data-styled=true] [data-title]{font-weight:500;line-height:1.5;color:inherit}[data-sonner-toast][data-styled=true] [data-icon]{display:flex;height:16px;width:16px;position:relative;justify-content:flex-start;align-items:center;flex-shrink:0;margin-left:var(--toast-icon-margin-start);margin-right:var(--toast-icon-margin-end)}[data-sonner-toast][data-promise=true] [data-icon]>svg{opacity:0;transform:scale(.8);transform-origin:center;animation:sonner-fade-in .3s ease forwards}[data-sonner-toast][data-styled=true] [data-icon]>*{flex-shrink:0}[data-sonner-toast][data-styled=true] [data-icon] svg{margin-left:var(--toast-svg-margin-start);margin-right:var(--toast-svg-margin-end)}[data-sonner-toast][data-styled=true] [data-content]{display:flex;flex-direction:column;gap:2px}[data-sonner-toast][data-styled=true] [data-button]{border-radius:4px;padding-left:8px;padding-right:8px;height:24px;font-size:12px;color:var(--normal-bg);background:var(--normal-text);margin-left:var(--toast-button-margin-start);margin-right:var(--toast-button-margin-end);border:none;font-weight:500;cursor:pointer;outline:0;display:flex;align-items:center;flex-shrink:0;transition:opacity .4s,box-shadow .2s}[data-sonner-toast][data-styled=true] [data-button]:focus-visible{box-shadow:0 0 0 2px rgba(0,0,0,.4)}[data-sonner-toast][data-styled=true] [data-button]:first-of-type{margin-left:var(--toast-button-margin-start);margin-right:var(--toast-button-margin-end)}[data-sonner-toast][data-styled=true] [data-cancel]{color:var(--normal-text);background:rgba(0,0,0,.08)}[data-sonner-toaster][data-sonner-theme=dark] [data-sonner-toast][data-styled=true] [data-cancel]{background:rgba(255,255,255,.3)}[data-sonner-toast][data-styled=true] [data-close-button]{position:absolute;left:var(--toast-close-button-start);right:var(--toast-close-button-end);top:0;height:20px;width:20px;display:flex;justify-content:center;align-items:center;padding:0;color:var(--gray12);background:var(--normal-bg);border:1px solid var(--gray4);transform:var(--toast-close-button-transform);border-radius:50%;cursor:pointer;z-index:1;transition:opacity .1s,background .2s,border-color .2s}[data-sonner-toast][data-styled=true] [data-close-button]:focus-visible{box-shadow:0 4px 12px rgba(0,0,0,.1),0 0 0 2px rgba(0,0,0,.2)}[data-sonner-toast][data-styled=true] [data-disabled=true]{cursor:not-allowed}[data-sonner-toast][data-styled=true]:hover [data-close-button]:hover{background:var(--gray2);border-color:var(--gray5)}[data-sonner-toast][data-swiping=true]::before{content:'';position:absolute;left:-100%;right:-100%;height:100%;z-index:-1}[data-sonner-toast][data-y-position=top][data-swiping=true]::before{bottom:50%;transform:scaleY(3) translateY(50%)}[data-sonner-toast][data-y-position=bottom][data-swiping=true]::before{top:50%;transform:scaleY(3) translateY(-50%)}[data-sonner-toast][data-swiping=false][data-removed=true]::before{content:'';position:absolute;inset:0;transform:scaleY(2)}[data-sonner-toast][data-expanded=true]::after{content:'';position:absolute;left:0;height:calc(var(--gap) + 1px);bottom:100%;width:100%}[data-sonner-toast][data-mounted=true]{--y:translateY(0);opacity:1}[data-sonner-toast][data-expanded=false][data-front=false]{--scale:var(--toasts-before) * 0.05 + 1;--y:translateY(calc(var(--lift-amount) * var(--toasts-before))) scale(calc(-1 * var(--scale)));height:var(--front-toast-height)}[data-sonner-toast]>*{transition:opacity .4s}[data-sonner-toast][data-x-position=right]{right:0}[data-sonner-toast][data-x-position=left]{left:0}[data-sonner-toast][data-expanded=false][data-front=false][data-styled=true]>*{opacity:0}[data-sonner-toast][data-visible=false]{opacity:0;pointer-events:none}[data-sonner-toast][data-mounted=true][data-expanded=true]{--y:translateY(calc(var(--lift) * var(--offset)));height:var(--initial-height)}[data-sonner-toast][data-removed=true][data-front=true][data-swipe-out=false]{--y:translateY(calc(var(--lift) * -100%));opacity:0}[data-sonner-toast][data-removed=true][data-front=false][data-swipe-out=false][data-expanded=true]{--y:translateY(calc(var(--lift) * var(--offset) + var(--lift) * -100%));opacity:0}[data-sonner-toast][data-removed=true][data-front=false][data-swipe-out=false][data-expanded=false]{--y:translateY(40%);opacity:0;transition:transform .5s,opacity .2s}[data-sonner-toast][data-removed=true][data-front=false]::before{height:calc(var(--initial-height) + 20%)}[data-sonner-toast][data-swiping=true]{transform:var(--y) translateY(var(--swipe-amount-y,0)) translateX(var(--swipe-amount-x,0));transition:none}[data-sonner-toast][data-swiped=true]{user-select:none}[data-sonner-toast][data-swipe-out=true][data-y-position=bottom],[data-sonner-toast][data-swipe-out=true][data-y-position=top]{animation-duration:.2s;animation-timing-function:ease-out;animation-fill-mode:forwards}[data-sonner-toast][data-swipe-out=true][data-swipe-direction=left]{animation-name:swipe-out-left}[data-sonner-toast][data-swipe-out=true][data-swipe-direction=right]{animation-name:swipe-out-right}[data-sonner-toast][data-swipe-out=true][data-swipe-direction=up]{animation-name:swipe-out-up}[data-sonner-toast][data-swipe-out=true][data-swipe-direction=down]{animation-name:swipe-out-down}@keyframes swipe-out-left{from{transform:var(--y) translateX(var(--swipe-amount-x));opacity:1}to{transform:var(--y) translateX(calc(var(--swipe-amount-x) - 100%));opacity:0}}@keyframes swipe-out-right{from{transform:var(--y) translateX(var(--swipe-amount-x));opacity:1}to{transform:var(--y) translateX(calc(var(--swipe-amount-x) + 100%));opacity:0}}@keyframes swipe-out-up{from{transform:var(--y) translateY(var(--swipe-amount-y));opacity:1}to{transform:var(--y) translateY(calc(var(--swipe-amount-y) - 100%));opacity:0}}@keyframes swipe-out-down{from{transform:var(--y) translateY(var(--swipe-amount-y));opacity:1}to{transform:var(--y) translateY(calc(var(--swipe-amount-y) + 100%));opacity:0}}@media (max-width:600px){[data-sonner-toaster]{position:fixed;right:var(--mobile-offset-right);left:var(--mobile-offset-left);width:100%}[data-sonner-toaster][dir=rtl]{left:calc(var(--mobile-offset-left) * -1)}[data-sonner-toaster] [data-sonner-toast]{left:0;right:0;width:calc(100% - var(--mobile-offset-left) * 2)}[data-sonner-toaster][data-x-position=left]{left:var(--mobile-offset-left)}[data-sonner-toaster][data-y-position=bottom]{bottom:var(--mobile-offset-bottom)}[data-sonner-toaster][data-y-position=top]{top:var(--mobile-offset-top)}[data-sonner-toaster][data-x-position=center]{left:var(--mobile-offset-left);right:var(--mobile-offset-right);transform:none}}[data-sonner-toaster][data-sonner-theme=light]{--normal-bg:#fff;--normal-border:var(--gray4);--normal-text:var(--gray12);--success-bg:hsl(143, 85%, 96%);--success-border:hsl(145, 92%, 87%);--success-text:hsl(140, 100%, 27%);--info-bg:hsl(208, 100%, 97%);--info-border:hsl(221, 91%, 93%);--info-text:hsl(210, 92%, 45%);--warning-bg:hsl(49, 100%, 97%);--warning-border:hsl(49, 91%, 84%);--warning-text:hsl(31, 92%, 45%);--error-bg:hsl(359, 100%, 97%);--error-border:hsl(359, 100%, 94%);--error-text:hsl(360, 100%, 45%)}[data-sonner-toaster][data-sonner-theme=light] [data-sonner-toast][data-invert=true]{--normal-bg:#000;--normal-border:hsl(0, 0%, 20%);--normal-text:var(--gray1)}[data-sonner-toaster][data-sonner-theme=dark] [data-sonner-toast][data-invert=true]{--normal-bg:#fff;--normal-border:var(--gray3);--normal-text:var(--gray12)}[data-sonner-toaster][data-sonner-theme=dark]{--normal-bg:#000;--normal-bg-hover:hsl(0, 0%, 12%);--normal-border:hsl(0, 0%, 20%);--normal-border-hover:hsl(0, 0%, 25%);--normal-text:var(--gray1);--success-bg:hsl(150, 100%, 6%);--success-border:hsl(147, 100%, 12%);--success-text:hsl(150, 86%, 65%);--info-bg:hsl(215, 100%, 6%);--info-border:hsl(223, 43%, 17%);--info-text:hsl(216, 87%, 65%);--warning-bg:hsl(64, 100%, 6%);--warning-border:hsl(60, 100%, 9%);--warning-text:hsl(46, 87%, 65%);--error-bg:hsl(358, 76%, 10%);--error-border:hsl(357, 89%, 16%);--error-text:hsl(358, 100%, 81%)}[data-sonner-toaster][data-sonner-theme=dark] [data-sonner-toast] [data-close-button]{background:var(--normal-bg);border-color:var(--normal-border);color:var(--normal-text)}[data-sonner-toaster][data-sonner-theme=dark] [data-sonner-toast] [data-close-button]:hover{background:var(--normal-bg-hover);border-color:var(--normal-border-hover)}[data-rich-colors=true][data-sonner-toast][data-type=success]{background:var(--success-bg);border-color:var(--success-border);color:var(--success-text)}[data-rich-colors=true][data-sonner-toast][data-type=success] [data-close-button]{background:var(--success-bg);border-color:var(--success-border);color:var(--success-text)}[data-rich-colors=true][data-sonner-toast][data-type=info]{background:var(--info-bg);border-color:var(--info-border);color:var(--info-text)}[data-rich-colors=true][data-sonner-toast][data-type=info] [data-close-button]{background:var(--info-bg);border-color:var(--info-border);color:var(--info-text)}[data-rich-colors=true][data-sonner-toast][data-type=warning]{background:var(--warning-bg);border-color:var(--warning-border);color:var(--warning-text)}[data-rich-colors=true][data-sonner-toast][data-type=warning] [data-close-button]{background:var(--warning-bg);border-color:var(--warning-border);color:var(--warning-text)}[data-rich-colors=true][data-sonner-toast][data-type=error]{background:var(--error-bg);border-color:var(--error-border);color:var(--error-text)}[data-rich-colors=true][data-sonner-toast][data-type=error] [data-close-button]{background:var(--error-bg);border-color:var(--error-border);color:var(--error-text)}.sonner-loading-wrapper{--size:16px;height:var(--size);width:var(--size);position:absolute;inset:0;z-index:10}.sonner-loading-wrapper[data-visible=false]{transform-origin:center;animation:sonner-fade-out .2s ease forwards}.sonner-spinner{position:relative;top:50%;left:50%;height:var(--size);width:var(--size)}.sonner-loading-bar{animation:sonner-spin 1.2s linear infinite;background:var(--gray11);border-radius:6px;height:8%;left:-10%;position:absolute;top:-3.9%;width:24%}.sonner-loading-bar:first-child{animation-delay:-1.2s;transform:rotate(.0001deg) translate(146%)}.sonner-loading-bar:nth-child(2){animation-delay:-1.1s;transform:rotate(30deg) translate(146%)}.sonner-loading-bar:nth-child(3){animation-delay:-1s;transform:rotate(60deg) translate(146%)}.sonner-loading-bar:nth-child(4){animation-delay:-.9s;transform:rotate(90deg) translate(146%)}.sonner-loading-bar:nth-child(5){animation-delay:-.8s;transform:rotate(120deg) translate(146%)}.sonner-loading-bar:nth-child(6){animation-delay:-.7s;transform:rotate(150deg) translate(146%)}.sonner-loading-bar:nth-child(7){animation-delay:-.6s;transform:rotate(180deg) translate(146%)}.sonner-loading-bar:nth-child(8){animation-delay:-.5s;transform:rotate(210deg) translate(146%)}.sonner-loading-bar:nth-child(9){animation-delay:-.4s;transform:rotate(240deg) translate(146%)}.sonner-loading-bar:nth-child(10){animation-delay:-.3s;transform:rotate(270deg) translate(146%)}.sonner-loading-bar:nth-child(11){animation-delay:-.2s;transform:rotate(300deg) translate(146%)}.sonner-loading-bar:nth-child(12){animation-delay:-.1s;transform:rotate(330deg) translate(146%)}@keyframes sonner-fade-in{0%{opacity:0;transform:scale(.8)}100%{opacity:1;transform:scale(1)}}@keyframes sonner-fade-out{0%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(.8)}}@keyframes sonner-spin{0%{opacity:1}100%{opacity:.15}}@media (prefers-reduced-motion){.sonner-loading-bar,[data-sonner-toast],[data-sonner-toast]>*{transition:none!important;animation:none!important}}.sonner-loader{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);transform-origin:center;transition:opacity .2s,transform .2s}.sonner-loader[data-visible=false]{opacity:0;transform:scale(.8) translate(-50%,-50%)}");
function ro(e) {
  return e.label !== void 0;
}
const JS = 3, XS = "24px", eC = "16px", Xc = 4e3, tC = 356, nC = 14, rC = 45, oC = 200;
function Ht(...e) {
  return e.filter(Boolean).join(" ");
}
function aC(e) {
  const [t, n] = e.split("-"), r = [];
  return t && r.push(t), n && r.push(n), r;
}
const iC = (e) => {
  var t, n, r, a, i, s, c, l, u;
  const { invert: p, toast: m, unstyled: h, interacting: g, setHeights: v, visibleToasts: f, heights: b, index: k, toasts: w, expanded: _, removeToast: x, defaultRichColors: N, closeButton: I, style: S, cancelButtonStyle: A, actionButtonStyle: W, className: C = "", descriptionClassName: T = "", duration: P, position: L, gap: F, expandByDefault: $, classNames: M, icons: D, closeButtonAriaLabel: O = "Close toast" } = e, [V, E] = U.useState(null), [q, re] = U.useState(null), [j, X] = U.useState(!1), [te, ve] = U.useState(!1), [B, ee] = U.useState(!1), [fe, G] = U.useState(!1), [oe, de] = U.useState(!1), [he, Fe] = U.useState(0), [Xe, et] = U.useState(0), We = U.useRef(m.duration || P || Xc), tt = U.useRef(null), Ie = U.useRef(null), lt = k === 0, Re = k + 1 <= f, He = m.type, me = m.dismissible !== !1, Pe = m.className || "", z = m.descriptionClassName || "", ne = U.useMemo(() => b.findIndex((ye) => ye.toastId === m.id) || 0, [
    b,
    m.id
  ]), ae = U.useMemo(() => {
    var ye;
    return (ye = m.closeButton) != null ? ye : I;
  }, [
    m.closeButton,
    I
  ]), be = U.useMemo(() => m.duration || P || Xc, [
    m.duration,
    P
  ]), ke = U.useRef(0), De = U.useRef(0), $n = U.useRef(0), tn = U.useRef(null), [zn, Fn] = L.split("-"), Pt = U.useMemo(() => b.reduce((ye, qe, Se) => Se >= ne ? ye : ye + qe.height, 0), [
    b,
    ne
  ]), nn = VS(), pr = m.invert || p, kn = He === "loading";
  De.current = U.useMemo(() => ne * F + Pt, [
    ne,
    Pt
  ]), U.useEffect(() => {
    We.current = be;
  }, [
    be
  ]), U.useEffect(() => {
    X(!0);
  }, []), U.useEffect(() => {
    const ye = Ie.current;
    if (ye) {
      const qe = ye.getBoundingClientRect().height;
      return et(qe), v((Se) => [
        {
          toastId: m.id,
          height: qe,
          position: m.position
        },
        ...Se
      ]), () => v((Se) => Se.filter((Ze) => Ze.toastId !== m.id));
    }
  }, [
    v,
    m.id
  ]), U.useLayoutEffect(() => {
    if (!j) return;
    const ye = Ie.current, qe = ye.style.height;
    ye.style.height = "auto";
    const Se = ye.getBoundingClientRect().height;
    ye.style.height = qe, et(Se), v((Ze) => Ze.find((Ge) => Ge.toastId === m.id) ? Ze.map((Ge) => Ge.toastId === m.id ? {
      ...Ge,
      height: Se
    } : Ge) : [
      {
        toastId: m.id,
        height: Se,
        position: m.position
      },
      ...Ze
    ]);
  }, [
    j,
    m.title,
    m.description,
    v,
    m.id,
    m.jsx,
    m.action,
    m.cancel
  ]);
  const Vt = U.useCallback(() => {
    ve(!0), Fe(De.current), v((ye) => ye.filter((qe) => qe.toastId !== m.id)), setTimeout(() => {
      x(m);
    }, oC);
  }, [
    m,
    x,
    v,
    De
  ]);
  U.useEffect(() => {
    if (m.promise && He === "loading" || m.duration === 1 / 0 || m.type === "loading") return;
    let ye;
    return _ || g || nn ? (() => {
      if ($n.current < ke.current) {
        const Ze = (/* @__PURE__ */ new Date()).getTime() - ke.current;
        We.current = We.current - Ze;
      }
      $n.current = (/* @__PURE__ */ new Date()).getTime();
    })() : (() => {
      We.current !== 1 / 0 && (ke.current = (/* @__PURE__ */ new Date()).getTime(), ye = setTimeout(() => {
        m.onAutoClose == null || m.onAutoClose.call(m, m), Vt();
      }, We.current));
    })(), () => clearTimeout(ye);
  }, [
    _,
    g,
    m,
    He,
    nn,
    Vt
  ]), U.useEffect(() => {
    m.delete && (Vt(), m.onDismiss == null || m.onDismiss.call(m, m));
  }, [
    Vt,
    m.delete
  ]);
  function Bn() {
    var ye;
    if (D?.loading) {
      var qe;
      return /* @__PURE__ */ U.createElement("div", {
        className: Ht(M?.loader, m == null || (qe = m.classNames) == null ? void 0 : qe.loader, "sonner-loader"),
        "data-visible": He === "loading"
      }, D.loading);
    }
    return /* @__PURE__ */ U.createElement(zS, {
      className: Ht(M?.loader, m == null || (ye = m.classNames) == null ? void 0 : ye.loader),
      visible: He === "loading"
    });
  }
  const jn = m.icon || D?.[He] || LS(He);
  var Ur, un;
  return /* @__PURE__ */ U.createElement("li", {
    tabIndex: 0,
    ref: Ie,
    className: Ht(C, Pe, M?.toast, m == null || (t = m.classNames) == null ? void 0 : t.toast, M?.default, M?.[He], m == null || (n = m.classNames) == null ? void 0 : n[He]),
    "data-sonner-toast": "",
    "data-rich-colors": (Ur = m.richColors) != null ? Ur : N,
    "data-styled": !(m.jsx || m.unstyled || h),
    "data-mounted": j,
    "data-promise": !!m.promise,
    "data-swiped": oe,
    "data-removed": te,
    "data-visible": Re,
    "data-y-position": zn,
    "data-x-position": Fn,
    "data-index": k,
    "data-front": lt,
    "data-swiping": B,
    "data-dismissible": me,
    "data-type": He,
    "data-invert": pr,
    "data-swipe-out": fe,
    "data-swipe-direction": q,
    "data-expanded": !!(_ || $ && j),
    "data-testid": m.testId,
    style: {
      "--index": k,
      "--toasts-before": k,
      "--z-index": w.length - k,
      "--offset": `${te ? he : De.current}px`,
      "--initial-height": $ ? "auto" : `${Xe}px`,
      ...S,
      ...m.style
    },
    onDragEnd: () => {
      ee(!1), E(null), tn.current = null;
    },
    onPointerDown: (ye) => {
      ye.button !== 2 && (kn || !me || (tt.current = /* @__PURE__ */ new Date(), Fe(De.current), ye.target.setPointerCapture(ye.pointerId), ye.target.tagName !== "BUTTON" && (ee(!0), tn.current = {
        x: ye.clientX,
        y: ye.clientY
      })));
    },
    onPointerUp: () => {
      var ye, qe, Se;
      if (fe || !me) return;
      tn.current = null;
      const Ze = Number(((ye = Ie.current) == null ? void 0 : ye.style.getPropertyValue("--swipe-amount-x").replace("px", "")) || 0), Un = Number(((qe = Ie.current) == null ? void 0 : qe.style.getPropertyValue("--swipe-amount-y").replace("px", "")) || 0), Ge = (/* @__PURE__ */ new Date()).getTime() - ((Se = tt.current) == null ? void 0 : Se.getTime()), st = V === "x" ? Ze : Un, Sn = Math.abs(st) / Ge;
      if (Math.abs(st) >= rC || Sn > 0.11) {
        Fe(De.current), m.onDismiss == null || m.onDismiss.call(m, m), re(V === "x" ? Ze > 0 ? "right" : "left" : Un > 0 ? "down" : "up"), Vt(), G(!0);
        return;
      } else {
        var bt, kt;
        (bt = Ie.current) == null || bt.style.setProperty("--swipe-amount-x", "0px"), (kt = Ie.current) == null || kt.style.setProperty("--swipe-amount-y", "0px");
      }
      de(!1), ee(!1), E(null);
    },
    onPointerMove: (ye) => {
      var qe, Se, Ze;
      if (!tn.current || !me || ((qe = window.getSelection()) == null ? void 0 : qe.toString().length) > 0) return;
      const Ge = ye.clientY - tn.current.y, st = ye.clientX - tn.current.x;
      var Sn;
      const bt = (Sn = e.swipeDirections) != null ? Sn : aC(L);
      !V && (Math.abs(st) > 1 || Math.abs(Ge) > 1) && E(Math.abs(st) > Math.abs(Ge) ? "x" : "y");
      let kt = {
        x: 0,
        y: 0
      };
      const St = (dt) => 1 / (1.5 + Math.abs(dt) / 20);
      if (V === "y") {
        if (bt.includes("top") || bt.includes("bottom"))
          if (bt.includes("top") && Ge < 0 || bt.includes("bottom") && Ge > 0)
            kt.y = Ge;
          else {
            const dt = Ge * St(Ge);
            kt.y = Math.abs(dt) < Math.abs(Ge) ? dt : Ge;
          }
      } else if (V === "x" && (bt.includes("left") || bt.includes("right")))
        if (bt.includes("left") && st < 0 || bt.includes("right") && st > 0)
          kt.x = st;
        else {
          const dt = st * St(st);
          kt.x = Math.abs(dt) < Math.abs(st) ? dt : st;
        }
      (Math.abs(kt.x) > 0 || Math.abs(kt.y) > 0) && de(!0), (Se = Ie.current) == null || Se.style.setProperty("--swipe-amount-x", `${kt.x}px`), (Ze = Ie.current) == null || Ze.style.setProperty("--swipe-amount-y", `${kt.y}px`);
    }
  }, ae && !m.jsx && He !== "loading" ? /* @__PURE__ */ U.createElement("button", {
    "aria-label": O,
    "data-disabled": kn,
    "data-close-button": !0,
    onClick: kn || !me ? () => {
    } : () => {
      Vt(), m.onDismiss == null || m.onDismiss.call(m, m);
    },
    className: Ht(M?.closeButton, m == null || (r = m.classNames) == null ? void 0 : r.closeButton)
  }, (un = D?.close) != null ? un : WS) : null, (He || m.icon || m.promise) && m.icon !== null && (D?.[He] !== null || m.icon) ? /* @__PURE__ */ U.createElement("div", {
    "data-icon": "",
    className: Ht(M?.icon, m == null || (a = m.classNames) == null ? void 0 : a.icon)
  }, m.promise || m.type === "loading" && !m.icon ? m.icon || Bn() : null, m.type !== "loading" ? jn : null) : null, /* @__PURE__ */ U.createElement("div", {
    "data-content": "",
    className: Ht(M?.content, m == null || (i = m.classNames) == null ? void 0 : i.content)
  }, /* @__PURE__ */ U.createElement("div", {
    "data-title": "",
    className: Ht(M?.title, m == null || (s = m.classNames) == null ? void 0 : s.title)
  }, m.jsx ? m.jsx : typeof m.title == "function" ? m.title() : m.title), m.description ? /* @__PURE__ */ U.createElement("div", {
    "data-description": "",
    className: Ht(T, z, M?.description, m == null || (c = m.classNames) == null ? void 0 : c.description)
  }, typeof m.description == "function" ? m.description() : m.description) : null), /* @__PURE__ */ U.isValidElement(m.cancel) ? m.cancel : m.cancel && ro(m.cancel) ? /* @__PURE__ */ U.createElement("button", {
    "data-button": !0,
    "data-cancel": !0,
    style: m.cancelButtonStyle || A,
    onClick: (ye) => {
      ro(m.cancel) && me && (m.cancel.onClick == null || m.cancel.onClick.call(m.cancel, ye), Vt());
    },
    className: Ht(M?.cancelButton, m == null || (l = m.classNames) == null ? void 0 : l.cancelButton)
  }, m.cancel.label) : null, /* @__PURE__ */ U.isValidElement(m.action) ? m.action : m.action && ro(m.action) ? /* @__PURE__ */ U.createElement("button", {
    "data-button": !0,
    "data-action": !0,
    style: m.actionButtonStyle || W,
    onClick: (ye) => {
      ro(m.action) && (m.action.onClick == null || m.action.onClick.call(m.action, ye), !ye.defaultPrevented && Vt());
    },
    className: Ht(M?.actionButton, m == null || (u = m.classNames) == null ? void 0 : u.actionButton)
  }, m.action.label) : null);
};
function el() {
  if (typeof window > "u" || typeof document > "u") return "ltr";
  const e = document.documentElement.getAttribute("dir");
  return e === "auto" || !e ? window.getComputedStyle(document.documentElement).direction : e;
}
function sC(e, t) {
  const n = {};
  return [
    e,
    t
  ].forEach((r, a) => {
    const i = a === 1, s = i ? "--mobile-offset" : "--offset", c = i ? eC : XS;
    function l(u) {
      [
        "top",
        "right",
        "bottom",
        "left"
      ].forEach((p) => {
        n[`${s}-${p}`] = typeof u == "number" ? `${u}px` : u;
      });
    }
    typeof r == "number" || typeof r == "string" ? l(r) : typeof r == "object" ? [
      "top",
      "right",
      "bottom",
      "left"
    ].forEach((u) => {
      r[u] === void 0 ? n[`${s}-${u}`] = c : n[`${s}-${u}`] = typeof r[u] == "number" ? `${r[u]}px` : r[u];
    }) : l(c);
  }), n;
}
const cC = /* @__PURE__ */ U.forwardRef(function(t, n) {
  const { id: r, invert: a, position: i = "bottom-right", hotkey: s = [
    "altKey",
    "KeyT"
  ], expand: c, closeButton: l, className: u, offset: p, mobileOffset: m, theme: h = "light", richColors: g, duration: v, style: f, visibleToasts: b = JS, toastOptions: k, dir: w = el(), gap: _ = nC, icons: x, containerAriaLabel: N = "Notifications" } = t, [I, S] = U.useState([]), A = U.useMemo(() => r ? I.filter((j) => j.toasterId === r) : I.filter((j) => !j.toasterId), [
    I,
    r
  ]), W = U.useMemo(() => Array.from(new Set([
    i
  ].concat(A.filter((j) => j.position).map((j) => j.position)))), [
    A,
    i
  ]), [C, T] = U.useState([]), [P, L] = U.useState(!1), [F, $] = U.useState(!1), [M, D] = U.useState(h !== "system" ? h : typeof window < "u" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"), O = U.useRef(null), V = s.join("+").replace(/Key/g, "").replace(/Digit/g, ""), E = U.useRef(null), q = U.useRef(!1), re = U.useCallback((j) => {
    S((X) => {
      var te;
      return (te = X.find((ve) => ve.id === j.id)) != null && te.delete || _t.dismiss(j.id), X.filter(({ id: ve }) => ve !== j.id);
    });
  }, []);
  return U.useEffect(() => _t.subscribe((j) => {
    if (j.dismiss) {
      requestAnimationFrame(() => {
        S((X) => X.map((te) => te.id === j.id ? {
          ...te,
          delete: !0
        } : te));
      });
      return;
    }
    setTimeout(() => {
      hl.flushSync(() => {
        S((X) => {
          const te = X.findIndex((ve) => ve.id === j.id);
          return te !== -1 ? [
            ...X.slice(0, te),
            {
              ...X[te],
              ...j
            },
            ...X.slice(te + 1)
          ] : [
            j,
            ...X
          ];
        });
      });
    });
  }), [
    I
  ]), U.useEffect(() => {
    if (h !== "system") {
      D(h);
      return;
    }
    if (h === "system" && (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? D("dark") : D("light")), typeof window > "u") return;
    const j = window.matchMedia("(prefers-color-scheme: dark)");
    try {
      j.addEventListener("change", ({ matches: X }) => {
        D(X ? "dark" : "light");
      });
    } catch {
      j.addListener(({ matches: te }) => {
        try {
          D(te ? "dark" : "light");
        } catch (ve) {
          console.error(ve);
        }
      });
    }
  }, [
    h
  ]), U.useEffect(() => {
    I.length <= 1 && L(!1);
  }, [
    I
  ]), U.useEffect(() => {
    const j = (X) => {
      var te;
      if (s.every((ee) => X[ee] || X.code === ee)) {
        var B;
        L(!0), (B = O.current) == null || B.focus();
      }
      X.code === "Escape" && (document.activeElement === O.current || (te = O.current) != null && te.contains(document.activeElement)) && L(!1);
    };
    return document.addEventListener("keydown", j), () => document.removeEventListener("keydown", j);
  }, [
    s
  ]), U.useEffect(() => {
    if (O.current)
      return () => {
        E.current && (E.current.focus({
          preventScroll: !0
        }), E.current = null, q.current = !1);
      };
  }, [
    O.current
  ]), // Remove item from normal navigation flow, only available via hotkey
  /* @__PURE__ */ U.createElement("section", {
    ref: n,
    "aria-label": `${N} ${V}`,
    tabIndex: -1,
    "aria-live": "polite",
    "aria-relevant": "additions text",
    "aria-atomic": "false",
    suppressHydrationWarning: !0
  }, W.map((j, X) => {
    var te;
    const [ve, B] = j.split("-");
    return A.length ? /* @__PURE__ */ U.createElement("ol", {
      key: j,
      dir: w === "auto" ? el() : w,
      tabIndex: -1,
      ref: O,
      className: u,
      "data-sonner-toaster": !0,
      "data-sonner-theme": M,
      "data-y-position": ve,
      "data-x-position": B,
      style: {
        "--front-toast-height": `${((te = C[0]) == null ? void 0 : te.height) || 0}px`,
        "--width": `${tC}px`,
        "--gap": `${_}px`,
        ...f,
        ...sC(p, m)
      },
      onBlur: (ee) => {
        q.current && !ee.currentTarget.contains(ee.relatedTarget) && (q.current = !1, E.current && (E.current.focus({
          preventScroll: !0
        }), E.current = null));
      },
      onFocus: (ee) => {
        ee.target instanceof HTMLElement && ee.target.dataset.dismissible === "false" || q.current || (q.current = !0, E.current = ee.relatedTarget);
      },
      onMouseEnter: () => L(!0),
      onMouseMove: () => L(!0),
      onMouseLeave: () => {
        F || L(!1);
      },
      onDragEnd: () => L(!1),
      onPointerDown: (ee) => {
        ee.target instanceof HTMLElement && ee.target.dataset.dismissible === "false" || $(!0);
      },
      onPointerUp: () => $(!1)
    }, A.filter((ee) => !ee.position && X === 0 || ee.position === j).map((ee, fe) => {
      var G, oe;
      return /* @__PURE__ */ U.createElement(iC, {
        key: ee.id,
        icons: x,
        index: fe,
        toast: ee,
        defaultRichColors: g,
        duration: (G = k?.duration) != null ? G : v,
        className: k?.className,
        descriptionClassName: k?.descriptionClassName,
        invert: a,
        visibleToasts: b,
        closeButton: (oe = k?.closeButton) != null ? oe : l,
        interacting: F,
        position: j,
        style: k?.style,
        unstyled: k?.unstyled,
        classNames: k?.classNames,
        cancelButtonStyle: k?.cancelButtonStyle,
        actionButtonStyle: k?.actionButtonStyle,
        closeButtonAriaLabel: k?.closeButtonAriaLabel,
        removeToast: re,
        toasts: A.filter((de) => de.position == ee.position),
        heights: C.filter((de) => de.position == ee.position),
        setHeights: T,
        expandByDefault: c,
        gap: _,
        expanded: P,
        swipeDirections: t.swipeDirections
      });
    })) : null;
  }));
}), ys = y.createContext(null);
function lC() {
  const e = y.useContext(ys);
  if (!e) throw new Error("useToast must be used within ToastProvider");
  return e;
}
function pa() {
  return y.useContext(ys);
}
function dC({ children: e }) {
  const t = y.useCallback((n) => {
    const r = n.title ?? "", a = n.description;
    KS(r || a || "Notification", {
      description: r ? a : void 0,
      duration: n.durationMs ?? 5e3,
      action: n.actionLabel && n.onAction ? {
        label: n.actionLabel,
        onClick: () => n.onAction?.()
      } : void 0
    });
  }, []);
  return /* @__PURE__ */ d(ys.Provider, { value: { toast: t }, children: [
    e,
    /* @__PURE__ */ o(
      cC,
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
  entries: op,
  setPrototypeOf: tl,
  isFrozen: uC,
  getPrototypeOf: mC,
  getOwnPropertyDescriptor: pC
} = Object;
let {
  freeze: yt,
  seal: It,
  create: yi
} = Object, {
  apply: vi,
  construct: bi
} = typeof Reflect < "u" && Reflect;
yt || (yt = function(t) {
  return t;
});
It || (It = function(t) {
  return t;
});
vi || (vi = function(t, n) {
  for (var r = arguments.length, a = new Array(r > 2 ? r - 2 : 0), i = 2; i < r; i++)
    a[i - 2] = arguments[i];
  return t.apply(n, a);
});
bi || (bi = function(t) {
  for (var n = arguments.length, r = new Array(n > 1 ? n - 1 : 0), a = 1; a < n; a++)
    r[a - 1] = arguments[a];
  return new t(...r);
});
const oo = vt(Array.prototype.forEach), fC = vt(Array.prototype.lastIndexOf), nl = vt(Array.prototype.pop), gr = vt(Array.prototype.push), hC = vt(Array.prototype.splice), mo = vt(String.prototype.toLowerCase), Wa = vt(String.prototype.toString), Va = vt(String.prototype.match), yr = vt(String.prototype.replace), gC = vt(String.prototype.indexOf), yC = vt(String.prototype.trim), $t = vt(Object.prototype.hasOwnProperty), ut = vt(RegExp.prototype.test), vr = vC(TypeError);
function vt(e) {
  return function(t) {
    t instanceof RegExp && (t.lastIndex = 0);
    for (var n = arguments.length, r = new Array(n > 1 ? n - 1 : 0), a = 1; a < n; a++)
      r[a - 1] = arguments[a];
    return vi(e, t, r);
  };
}
function vC(e) {
  return function() {
    for (var t = arguments.length, n = new Array(t), r = 0; r < t; r++)
      n[r] = arguments[r];
    return bi(e, n);
  };
}
function _e(e, t) {
  let n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : mo;
  tl && tl(e, null);
  let r = t.length;
  for (; r--; ) {
    let a = t[r];
    if (typeof a == "string") {
      const i = n(a);
      i !== a && (uC(t) || (t[r] = i), a = i);
    }
    e[a] = !0;
  }
  return e;
}
function bC(e) {
  for (let t = 0; t < e.length; t++)
    $t(e, t) || (e[t] = null);
  return e;
}
function qt(e) {
  const t = yi(null);
  for (const [n, r] of op(e))
    $t(e, n) && (Array.isArray(r) ? t[n] = bC(r) : r && typeof r == "object" && r.constructor === Object ? t[n] = qt(r) : t[n] = r);
  return t;
}
function br(e, t) {
  for (; e !== null; ) {
    const r = pC(e, t);
    if (r) {
      if (r.get)
        return vt(r.get);
      if (typeof r.value == "function")
        return vt(r.value);
    }
    e = mC(e);
  }
  function n() {
    return null;
  }
  return n;
}
const rl = yt(["a", "abbr", "acronym", "address", "area", "article", "aside", "audio", "b", "bdi", "bdo", "big", "blink", "blockquote", "body", "br", "button", "canvas", "caption", "center", "cite", "code", "col", "colgroup", "content", "data", "datalist", "dd", "decorator", "del", "details", "dfn", "dialog", "dir", "div", "dl", "dt", "element", "em", "fieldset", "figcaption", "figure", "font", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "head", "header", "hgroup", "hr", "html", "i", "img", "input", "ins", "kbd", "label", "legend", "li", "main", "map", "mark", "marquee", "menu", "menuitem", "meter", "nav", "nobr", "ol", "optgroup", "option", "output", "p", "picture", "pre", "progress", "q", "rp", "rt", "ruby", "s", "samp", "search", "section", "select", "shadow", "slot", "small", "source", "spacer", "span", "strike", "strong", "style", "sub", "summary", "sup", "table", "tbody", "td", "template", "textarea", "tfoot", "th", "thead", "time", "tr", "track", "tt", "u", "ul", "var", "video", "wbr"]), Ha = yt(["svg", "a", "altglyph", "altglyphdef", "altglyphitem", "animatecolor", "animatemotion", "animatetransform", "circle", "clippath", "defs", "desc", "ellipse", "enterkeyhint", "exportparts", "filter", "font", "g", "glyph", "glyphref", "hkern", "image", "inputmode", "line", "lineargradient", "marker", "mask", "metadata", "mpath", "part", "path", "pattern", "polygon", "polyline", "radialgradient", "rect", "stop", "style", "switch", "symbol", "text", "textpath", "title", "tref", "tspan", "view", "vkern"]), qa = yt(["feBlend", "feColorMatrix", "feComponentTransfer", "feComposite", "feConvolveMatrix", "feDiffuseLighting", "feDisplacementMap", "feDistantLight", "feDropShadow", "feFlood", "feFuncA", "feFuncB", "feFuncG", "feFuncR", "feGaussianBlur", "feImage", "feMerge", "feMergeNode", "feMorphology", "feOffset", "fePointLight", "feSpecularLighting", "feSpotLight", "feTile", "feTurbulence"]), wC = yt(["animate", "color-profile", "cursor", "discard", "font-face", "font-face-format", "font-face-name", "font-face-src", "font-face-uri", "foreignobject", "hatch", "hatchpath", "mesh", "meshgradient", "meshpatch", "meshrow", "missing-glyph", "script", "set", "solidcolor", "unknown", "use"]), Za = yt(["math", "menclose", "merror", "mfenced", "mfrac", "mglyph", "mi", "mlabeledtr", "mmultiscripts", "mn", "mo", "mover", "mpadded", "mphantom", "mroot", "mrow", "ms", "mspace", "msqrt", "mstyle", "msub", "msup", "msubsup", "mtable", "mtd", "mtext", "mtr", "munder", "munderover", "mprescripts"]), _C = yt(["maction", "maligngroup", "malignmark", "mlongdiv", "mscarries", "mscarry", "msgroup", "mstack", "msline", "msrow", "semantics", "annotation", "annotation-xml", "mprescripts", "none"]), ol = yt(["#text"]), al = yt(["accept", "action", "align", "alt", "autocapitalize", "autocomplete", "autopictureinpicture", "autoplay", "background", "bgcolor", "border", "capture", "cellpadding", "cellspacing", "checked", "cite", "class", "clear", "color", "cols", "colspan", "controls", "controlslist", "coords", "crossorigin", "datetime", "decoding", "default", "dir", "disabled", "disablepictureinpicture", "disableremoteplayback", "download", "draggable", "enctype", "enterkeyhint", "exportparts", "face", "for", "headers", "height", "hidden", "high", "href", "hreflang", "id", "inert", "inputmode", "integrity", "ismap", "kind", "label", "lang", "list", "loading", "loop", "low", "max", "maxlength", "media", "method", "min", "minlength", "multiple", "muted", "name", "nonce", "noshade", "novalidate", "nowrap", "open", "optimum", "part", "pattern", "placeholder", "playsinline", "popover", "popovertarget", "popovertargetaction", "poster", "preload", "pubdate", "radiogroup", "readonly", "rel", "required", "rev", "reversed", "role", "rows", "rowspan", "spellcheck", "scope", "selected", "shape", "size", "sizes", "slot", "span", "srclang", "start", "src", "srcset", "step", "style", "summary", "tabindex", "title", "translate", "type", "usemap", "valign", "value", "width", "wrap", "xmlns", "slot"]), Ga = yt(["accent-height", "accumulate", "additive", "alignment-baseline", "amplitude", "ascent", "attributename", "attributetype", "azimuth", "basefrequency", "baseline-shift", "begin", "bias", "by", "class", "clip", "clippathunits", "clip-path", "clip-rule", "color", "color-interpolation", "color-interpolation-filters", "color-profile", "color-rendering", "cx", "cy", "d", "dx", "dy", "diffuseconstant", "direction", "display", "divisor", "dur", "edgemode", "elevation", "end", "exponent", "fill", "fill-opacity", "fill-rule", "filter", "filterunits", "flood-color", "flood-opacity", "font-family", "font-size", "font-size-adjust", "font-stretch", "font-style", "font-variant", "font-weight", "fx", "fy", "g1", "g2", "glyph-name", "glyphref", "gradientunits", "gradienttransform", "height", "href", "id", "image-rendering", "in", "in2", "intercept", "k", "k1", "k2", "k3", "k4", "kerning", "keypoints", "keysplines", "keytimes", "lang", "lengthadjust", "letter-spacing", "kernelmatrix", "kernelunitlength", "lighting-color", "local", "marker-end", "marker-mid", "marker-start", "markerheight", "markerunits", "markerwidth", "maskcontentunits", "maskunits", "max", "mask", "mask-type", "media", "method", "mode", "min", "name", "numoctaves", "offset", "operator", "opacity", "order", "orient", "orientation", "origin", "overflow", "paint-order", "path", "pathlength", "patterncontentunits", "patterntransform", "patternunits", "points", "preservealpha", "preserveaspectratio", "primitiveunits", "r", "rx", "ry", "radius", "refx", "refy", "repeatcount", "repeatdur", "restart", "result", "rotate", "scale", "seed", "shape-rendering", "slope", "specularconstant", "specularexponent", "spreadmethod", "startoffset", "stddeviation", "stitchtiles", "stop-color", "stop-opacity", "stroke-dasharray", "stroke-dashoffset", "stroke-linecap", "stroke-linejoin", "stroke-miterlimit", "stroke-opacity", "stroke", "stroke-width", "style", "surfacescale", "systemlanguage", "tabindex", "tablevalues", "targetx", "targety", "transform", "transform-origin", "text-anchor", "text-decoration", "text-rendering", "textlength", "type", "u1", "u2", "unicode", "values", "viewbox", "visibility", "version", "vert-adv-y", "vert-origin-x", "vert-origin-y", "width", "word-spacing", "wrap", "writing-mode", "xchannelselector", "ychannelselector", "x", "x1", "x2", "xmlns", "y", "y1", "y2", "z", "zoomandpan"]), il = yt(["accent", "accentunder", "align", "bevelled", "close", "columnsalign", "columnlines", "columnspan", "denomalign", "depth", "dir", "display", "displaystyle", "encoding", "fence", "frame", "height", "href", "id", "largeop", "length", "linethickness", "lspace", "lquote", "mathbackground", "mathcolor", "mathsize", "mathvariant", "maxsize", "minsize", "movablelimits", "notation", "numalign", "open", "rowalign", "rowlines", "rowspacing", "rowspan", "rspace", "rquote", "scriptlevel", "scriptminsize", "scriptsizemultiplier", "selection", "separator", "separators", "stretchy", "subscriptshift", "supscriptshift", "symmetric", "voffset", "width", "xmlns"]), ao = yt(["xlink:href", "xml:id", "xlink:title", "xml:space", "xmlns:xlink"]), xC = It(/\{\{[\w\W]*|[\w\W]*\}\}/gm), kC = It(/<%[\w\W]*|[\w\W]*%>/gm), SC = It(/\$\{[\w\W]*/gm), CC = It(/^data-[\-\w.\u00B7-\uFFFF]+$/), NC = It(/^aria-[\-\w]+$/), ap = It(
  /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|matrix):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
  // eslint-disable-line no-useless-escape
), AC = It(/^(?:\w+script|data):/i), TC = It(
  /[\u0000-\u0020\u00A0\u1680\u180E\u2000-\u2029\u205F\u3000]/g
  // eslint-disable-line no-control-regex
), ip = It(/^html$/i), PC = It(/^[a-z][.\w]*(-[.\w]+)+$/i);
var sl = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  ARIA_ATTR: NC,
  ATTR_WHITESPACE: TC,
  CUSTOM_ELEMENT: PC,
  DATA_ATTR: CC,
  DOCTYPE_NAME: ip,
  ERB_EXPR: kC,
  IS_ALLOWED_URI: ap,
  IS_SCRIPT_OR_DATA: AC,
  MUSTACHE_EXPR: xC,
  TMPLIT_EXPR: SC
});
const wr = {
  element: 1,
  text: 3,
  // Deprecated
  progressingInstruction: 7,
  comment: 8,
  document: 9
}, EC = function() {
  return typeof window > "u" ? null : window;
}, IC = function(t, n) {
  if (typeof t != "object" || typeof t.createPolicy != "function")
    return null;
  let r = null;
  const a = "data-tt-policy-suffix";
  n && n.hasAttribute(a) && (r = n.getAttribute(a));
  const i = "dompurify" + (r ? "#" + r : "");
  try {
    return t.createPolicy(i, {
      createHTML(s) {
        return s;
      },
      createScriptURL(s) {
        return s;
      }
    });
  } catch {
    return console.warn("TrustedTypes policy " + i + " could not be created."), null;
  }
}, cl = function() {
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
function sp() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : EC();
  const t = (ue) => sp(ue);
  if (t.version = "3.3.1", t.removed = [], !e || !e.document || e.document.nodeType !== wr.document || !e.Element)
    return t.isSupported = !1, t;
  let {
    document: n
  } = e;
  const r = n, a = r.currentScript, {
    DocumentFragment: i,
    HTMLTemplateElement: s,
    Node: c,
    Element: l,
    NodeFilter: u,
    NamedNodeMap: p = e.NamedNodeMap || e.MozNamedAttrMap,
    HTMLFormElement: m,
    DOMParser: h,
    trustedTypes: g
  } = e, v = l.prototype, f = br(v, "cloneNode"), b = br(v, "remove"), k = br(v, "nextSibling"), w = br(v, "childNodes"), _ = br(v, "parentNode");
  if (typeof s == "function") {
    const ue = n.createElement("template");
    ue.content && ue.content.ownerDocument && (n = ue.content.ownerDocument);
  }
  let x, N = "";
  const {
    implementation: I,
    createNodeIterator: S,
    createDocumentFragment: A,
    getElementsByTagName: W
  } = n, {
    importNode: C
  } = r;
  let T = cl();
  t.isSupported = typeof op == "function" && typeof _ == "function" && I && I.createHTMLDocument !== void 0;
  const {
    MUSTACHE_EXPR: P,
    ERB_EXPR: L,
    TMPLIT_EXPR: F,
    DATA_ATTR: $,
    ARIA_ATTR: M,
    IS_SCRIPT_OR_DATA: D,
    ATTR_WHITESPACE: O,
    CUSTOM_ELEMENT: V
  } = sl;
  let {
    IS_ALLOWED_URI: E
  } = sl, q = null;
  const re = _e({}, [...rl, ...Ha, ...qa, ...Za, ...ol]);
  let j = null;
  const X = _e({}, [...al, ...Ga, ...il, ...ao]);
  let te = Object.seal(yi(null, {
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
  })), ve = null, B = null;
  const ee = Object.seal(yi(null, {
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
  let fe = !0, G = !0, oe = !1, de = !0, he = !1, Fe = !0, Xe = !1, et = !1, We = !1, tt = !1, Ie = !1, lt = !1, Re = !0, He = !1;
  const me = "user-content-";
  let Pe = !0, z = !1, ne = {}, ae = null;
  const be = _e({}, ["annotation-xml", "audio", "colgroup", "desc", "foreignobject", "head", "iframe", "math", "mi", "mn", "mo", "ms", "mtext", "noembed", "noframes", "noscript", "plaintext", "script", "style", "svg", "template", "thead", "title", "video", "xmp"]);
  let ke = null;
  const De = _e({}, ["audio", "video", "img", "source", "image", "track"]);
  let $n = null;
  const tn = _e({}, ["alt", "class", "for", "id", "label", "name", "pattern", "placeholder", "role", "summary", "title", "value", "style", "xmlns"]), zn = "http://www.w3.org/1998/Math/MathML", Fn = "http://www.w3.org/2000/svg", Pt = "http://www.w3.org/1999/xhtml";
  let nn = Pt, pr = !1, kn = null;
  const Vt = _e({}, [zn, Fn, Pt], Wa);
  let Bn = _e({}, ["mi", "mo", "mn", "ms", "mtext"]), jn = _e({}, ["annotation-xml"]);
  const Ur = _e({}, ["title", "style", "font", "a", "script"]);
  let un = null;
  const ye = ["application/xhtml+xml", "text/html"], qe = "text/html";
  let Se = null, Ze = null;
  const Un = n.createElement("form"), Ge = function(R) {
    return R instanceof RegExp || R instanceof Function;
  }, st = function() {
    let R = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    if (!(Ze && Ze === R)) {
      if ((!R || typeof R != "object") && (R = {}), R = qt(R), un = // eslint-disable-next-line unicorn/prefer-includes
      ye.indexOf(R.PARSER_MEDIA_TYPE) === -1 ? qe : R.PARSER_MEDIA_TYPE, Se = un === "application/xhtml+xml" ? Wa : mo, q = $t(R, "ALLOWED_TAGS") ? _e({}, R.ALLOWED_TAGS, Se) : re, j = $t(R, "ALLOWED_ATTR") ? _e({}, R.ALLOWED_ATTR, Se) : X, kn = $t(R, "ALLOWED_NAMESPACES") ? _e({}, R.ALLOWED_NAMESPACES, Wa) : Vt, $n = $t(R, "ADD_URI_SAFE_ATTR") ? _e(qt(tn), R.ADD_URI_SAFE_ATTR, Se) : tn, ke = $t(R, "ADD_DATA_URI_TAGS") ? _e(qt(De), R.ADD_DATA_URI_TAGS, Se) : De, ae = $t(R, "FORBID_CONTENTS") ? _e({}, R.FORBID_CONTENTS, Se) : be, ve = $t(R, "FORBID_TAGS") ? _e({}, R.FORBID_TAGS, Se) : qt({}), B = $t(R, "FORBID_ATTR") ? _e({}, R.FORBID_ATTR, Se) : qt({}), ne = $t(R, "USE_PROFILES") ? R.USE_PROFILES : !1, fe = R.ALLOW_ARIA_ATTR !== !1, G = R.ALLOW_DATA_ATTR !== !1, oe = R.ALLOW_UNKNOWN_PROTOCOLS || !1, de = R.ALLOW_SELF_CLOSE_IN_ATTR !== !1, he = R.SAFE_FOR_TEMPLATES || !1, Fe = R.SAFE_FOR_XML !== !1, Xe = R.WHOLE_DOCUMENT || !1, tt = R.RETURN_DOM || !1, Ie = R.RETURN_DOM_FRAGMENT || !1, lt = R.RETURN_TRUSTED_TYPE || !1, We = R.FORCE_BODY || !1, Re = R.SANITIZE_DOM !== !1, He = R.SANITIZE_NAMED_PROPS || !1, Pe = R.KEEP_CONTENT !== !1, z = R.IN_PLACE || !1, E = R.ALLOWED_URI_REGEXP || ap, nn = R.NAMESPACE || Pt, Bn = R.MATHML_TEXT_INTEGRATION_POINTS || Bn, jn = R.HTML_INTEGRATION_POINTS || jn, te = R.CUSTOM_ELEMENT_HANDLING || {}, R.CUSTOM_ELEMENT_HANDLING && Ge(R.CUSTOM_ELEMENT_HANDLING.tagNameCheck) && (te.tagNameCheck = R.CUSTOM_ELEMENT_HANDLING.tagNameCheck), R.CUSTOM_ELEMENT_HANDLING && Ge(R.CUSTOM_ELEMENT_HANDLING.attributeNameCheck) && (te.attributeNameCheck = R.CUSTOM_ELEMENT_HANDLING.attributeNameCheck), R.CUSTOM_ELEMENT_HANDLING && typeof R.CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements == "boolean" && (te.allowCustomizedBuiltInElements = R.CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements), he && (G = !1), Ie && (tt = !0), ne && (q = _e({}, ol), j = [], ne.html === !0 && (_e(q, rl), _e(j, al)), ne.svg === !0 && (_e(q, Ha), _e(j, Ga), _e(j, ao)), ne.svgFilters === !0 && (_e(q, qa), _e(j, Ga), _e(j, ao)), ne.mathMl === !0 && (_e(q, Za), _e(j, il), _e(j, ao))), R.ADD_TAGS && (typeof R.ADD_TAGS == "function" ? ee.tagCheck = R.ADD_TAGS : (q === re && (q = qt(q)), _e(q, R.ADD_TAGS, Se))), R.ADD_ATTR && (typeof R.ADD_ATTR == "function" ? ee.attributeCheck = R.ADD_ATTR : (j === X && (j = qt(j)), _e(j, R.ADD_ATTR, Se))), R.ADD_URI_SAFE_ATTR && _e($n, R.ADD_URI_SAFE_ATTR, Se), R.FORBID_CONTENTS && (ae === be && (ae = qt(ae)), _e(ae, R.FORBID_CONTENTS, Se)), R.ADD_FORBID_CONTENTS && (ae === be && (ae = qt(ae)), _e(ae, R.ADD_FORBID_CONTENTS, Se)), Pe && (q["#text"] = !0), Xe && _e(q, ["html", "head", "body"]), q.table && (_e(q, ["tbody"]), delete ve.tbody), R.TRUSTED_TYPES_POLICY) {
        if (typeof R.TRUSTED_TYPES_POLICY.createHTML != "function")
          throw vr('TRUSTED_TYPES_POLICY configuration option must provide a "createHTML" hook.');
        if (typeof R.TRUSTED_TYPES_POLICY.createScriptURL != "function")
          throw vr('TRUSTED_TYPES_POLICY configuration option must provide a "createScriptURL" hook.');
        x = R.TRUSTED_TYPES_POLICY, N = x.createHTML("");
      } else
        x === void 0 && (x = IC(g, a)), x !== null && typeof N == "string" && (N = x.createHTML(""));
      yt && yt(R), Ze = R;
    }
  }, Sn = _e({}, [...Ha, ...qa, ...wC]), bt = _e({}, [...Za, ..._C]), kt = function(R) {
    let K = _(R);
    (!K || !K.tagName) && (K = {
      namespaceURI: nn,
      tagName: "template"
    });
    const ce = mo(R.tagName), Le = mo(K.tagName);
    return kn[R.namespaceURI] ? R.namespaceURI === Fn ? K.namespaceURI === Pt ? ce === "svg" : K.namespaceURI === zn ? ce === "svg" && (Le === "annotation-xml" || Bn[Le]) : !!Sn[ce] : R.namespaceURI === zn ? K.namespaceURI === Pt ? ce === "math" : K.namespaceURI === Fn ? ce === "math" && jn[Le] : !!bt[ce] : R.namespaceURI === Pt ? K.namespaceURI === Fn && !jn[Le] || K.namespaceURI === zn && !Bn[Le] ? !1 : !bt[ce] && (Ur[ce] || !Sn[ce]) : !!(un === "application/xhtml+xml" && kn[R.namespaceURI]) : !1;
  }, St = function(R) {
    gr(t.removed, {
      element: R
    });
    try {
      _(R).removeChild(R);
    } catch {
      b(R);
    }
  }, dt = function(R, K) {
    try {
      gr(t.removed, {
        attribute: K.getAttributeNode(R),
        from: K
      });
    } catch {
      gr(t.removed, {
        attribute: null,
        from: K
      });
    }
    if (K.removeAttribute(R), R === "is")
      if (tt || Ie)
        try {
          St(K);
        } catch {
        }
      else
        try {
          K.setAttribute(R, "");
        } catch {
        }
  }, ya = function(R) {
    let K = null, ce = null;
    if (We)
      R = "<remove></remove>" + R;
    else {
      const Qe = Va(R, /^[\r\n\t ]+/);
      ce = Qe && Qe[0];
    }
    un === "application/xhtml+xml" && nn === Pt && (R = '<html xmlns="http://www.w3.org/1999/xhtml"><head></head><body>' + R + "</body></html>");
    const Le = x ? x.createHTML(R) : R;
    if (nn === Pt)
      try {
        K = new h().parseFromString(Le, un);
      } catch {
      }
    if (!K || !K.documentElement) {
      K = I.createDocument(nn, "template", null);
      try {
        K.documentElement.innerHTML = pr ? N : Le;
      } catch {
      }
    }
    const ct = K.body || K.documentElement;
    return R && ce && ct.insertBefore(n.createTextNode(ce), ct.childNodes[0] || null), nn === Pt ? W.call(K, Xe ? "html" : "body")[0] : Xe ? K.documentElement : ct;
  }, Ts = function(R) {
    return S.call(
      R.ownerDocument || R,
      R,
      // eslint-disable-next-line no-bitwise
      u.SHOW_ELEMENT | u.SHOW_COMMENT | u.SHOW_TEXT | u.SHOW_PROCESSING_INSTRUCTION | u.SHOW_CDATA_SECTION,
      null
    );
  }, va = function(R) {
    return R instanceof m && (typeof R.nodeName != "string" || typeof R.textContent != "string" || typeof R.removeChild != "function" || !(R.attributes instanceof p) || typeof R.removeAttribute != "function" || typeof R.setAttribute != "function" || typeof R.namespaceURI != "string" || typeof R.insertBefore != "function" || typeof R.hasChildNodes != "function");
  }, Ps = function(R) {
    return typeof c == "function" && R instanceof c;
  };
  function rn(ue, R, K) {
    oo(ue, (ce) => {
      ce.call(t, R, K, Ze);
    });
  }
  const Es = function(R) {
    let K = null;
    if (rn(T.beforeSanitizeElements, R, null), va(R))
      return St(R), !0;
    const ce = Se(R.nodeName);
    if (rn(T.uponSanitizeElement, R, {
      tagName: ce,
      allowedTags: q
    }), Fe && R.hasChildNodes() && !Ps(R.firstElementChild) && ut(/<[/\w!]/g, R.innerHTML) && ut(/<[/\w!]/g, R.textContent) || R.nodeType === wr.progressingInstruction || Fe && R.nodeType === wr.comment && ut(/<[/\w]/g, R.data))
      return St(R), !0;
    if (!(ee.tagCheck instanceof Function && ee.tagCheck(ce)) && (!q[ce] || ve[ce])) {
      if (!ve[ce] && Rs(ce) && (te.tagNameCheck instanceof RegExp && ut(te.tagNameCheck, ce) || te.tagNameCheck instanceof Function && te.tagNameCheck(ce)))
        return !1;
      if (Pe && !ae[ce]) {
        const Le = _(R) || R.parentNode, ct = w(R) || R.childNodes;
        if (ct && Le) {
          const Qe = ct.length;
          for (let wt = Qe - 1; wt >= 0; --wt) {
            const on = f(ct[wt], !0);
            on.__removalCount = (R.__removalCount || 0) + 1, Le.insertBefore(on, k(R));
          }
        }
      }
      return St(R), !0;
    }
    return R instanceof l && !kt(R) || (ce === "noscript" || ce === "noembed" || ce === "noframes") && ut(/<\/no(script|embed|frames)/i, R.innerHTML) ? (St(R), !0) : (he && R.nodeType === wr.text && (K = R.textContent, oo([P, L, F], (Le) => {
      K = yr(K, Le, " ");
    }), R.textContent !== K && (gr(t.removed, {
      element: R.cloneNode()
    }), R.textContent = K)), rn(T.afterSanitizeElements, R, null), !1);
  }, Is = function(R, K, ce) {
    if (Re && (K === "id" || K === "name") && (ce in n || ce in Un))
      return !1;
    if (!(G && !B[K] && ut($, K))) {
      if (!(fe && ut(M, K))) {
        if (!(ee.attributeCheck instanceof Function && ee.attributeCheck(K, R))) {
          if (!j[K] || B[K]) {
            if (
              // First condition does a very basic check if a) it's basically a valid custom element tagname AND
              // b) if the tagName passes whatever the user has configured for CUSTOM_ELEMENT_HANDLING.tagNameCheck
              // and c) if the attribute name passes whatever the user has configured for CUSTOM_ELEMENT_HANDLING.attributeNameCheck
              !(Rs(R) && (te.tagNameCheck instanceof RegExp && ut(te.tagNameCheck, R) || te.tagNameCheck instanceof Function && te.tagNameCheck(R)) && (te.attributeNameCheck instanceof RegExp && ut(te.attributeNameCheck, K) || te.attributeNameCheck instanceof Function && te.attributeNameCheck(K, R)) || // Alternative, second condition checks if it's an `is`-attribute, AND
              // the value passes whatever the user has configured for CUSTOM_ELEMENT_HANDLING.tagNameCheck
              K === "is" && te.allowCustomizedBuiltInElements && (te.tagNameCheck instanceof RegExp && ut(te.tagNameCheck, ce) || te.tagNameCheck instanceof Function && te.tagNameCheck(ce)))
            ) return !1;
          } else if (!$n[K]) {
            if (!ut(E, yr(ce, O, ""))) {
              if (!((K === "src" || K === "xlink:href" || K === "href") && R !== "script" && gC(ce, "data:") === 0 && ke[R])) {
                if (!(oe && !ut(D, yr(ce, O, "")))) {
                  if (ce)
                    return !1;
                }
              }
            }
          }
        }
      }
    }
    return !0;
  }, Rs = function(R) {
    return R !== "annotation-xml" && Va(R, V);
  }, Os = function(R) {
    rn(T.beforeSanitizeAttributes, R, null);
    const {
      attributes: K
    } = R;
    if (!K || va(R))
      return;
    const ce = {
      attrName: "",
      attrValue: "",
      keepAttr: !0,
      allowedAttributes: j,
      forceKeepAttr: void 0
    };
    let Le = K.length;
    for (; Le--; ) {
      const ct = K[Le], {
        name: Qe,
        namespaceURI: wt,
        value: on
      } = ct, Wn = Se(Qe), ba = on;
      let ot = Qe === "value" ? ba : yC(ba);
      if (ce.attrName = Wn, ce.attrValue = ot, ce.keepAttr = !0, ce.forceKeepAttr = void 0, rn(T.uponSanitizeAttribute, R, ce), ot = ce.attrValue, He && (Wn === "id" || Wn === "name") && (dt(Qe, R), ot = me + ot), Fe && ut(/((--!?|])>)|<\/(style|title|textarea)/i, ot)) {
        dt(Qe, R);
        continue;
      }
      if (Wn === "attributename" && Va(ot, "href")) {
        dt(Qe, R);
        continue;
      }
      if (ce.forceKeepAttr)
        continue;
      if (!ce.keepAttr) {
        dt(Qe, R);
        continue;
      }
      if (!de && ut(/\/>/i, ot)) {
        dt(Qe, R);
        continue;
      }
      he && oo([P, L, F], (Ds) => {
        ot = yr(ot, Ds, " ");
      });
      const Ms = Se(R.nodeName);
      if (!Is(Ms, Wn, ot)) {
        dt(Qe, R);
        continue;
      }
      if (x && typeof g == "object" && typeof g.getAttributeType == "function" && !wt)
        switch (g.getAttributeType(Ms, Wn)) {
          case "TrustedHTML": {
            ot = x.createHTML(ot);
            break;
          }
          case "TrustedScriptURL": {
            ot = x.createScriptURL(ot);
            break;
          }
        }
      if (ot !== ba)
        try {
          wt ? R.setAttributeNS(wt, Qe, ot) : R.setAttribute(Qe, ot), va(R) ? St(R) : nl(t.removed);
        } catch {
          dt(Qe, R);
        }
    }
    rn(T.afterSanitizeAttributes, R, null);
  }, Sp = function ue(R) {
    let K = null;
    const ce = Ts(R);
    for (rn(T.beforeSanitizeShadowDOM, R, null); K = ce.nextNode(); )
      rn(T.uponSanitizeShadowNode, K, null), Es(K), Os(K), K.content instanceof i && ue(K.content);
    rn(T.afterSanitizeShadowDOM, R, null);
  };
  return t.sanitize = function(ue) {
    let R = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {}, K = null, ce = null, Le = null, ct = null;
    if (pr = !ue, pr && (ue = "<!-->"), typeof ue != "string" && !Ps(ue))
      if (typeof ue.toString == "function") {
        if (ue = ue.toString(), typeof ue != "string")
          throw vr("dirty is not a string, aborting");
      } else
        throw vr("toString is not a function");
    if (!t.isSupported)
      return ue;
    if (et || st(R), t.removed = [], typeof ue == "string" && (z = !1), z) {
      if (ue.nodeName) {
        const on = Se(ue.nodeName);
        if (!q[on] || ve[on])
          throw vr("root node is forbidden and cannot be sanitized in-place");
      }
    } else if (ue instanceof c)
      K = ya("<!---->"), ce = K.ownerDocument.importNode(ue, !0), ce.nodeType === wr.element && ce.nodeName === "BODY" || ce.nodeName === "HTML" ? K = ce : K.appendChild(ce);
    else {
      if (!tt && !he && !Xe && // eslint-disable-next-line unicorn/prefer-includes
      ue.indexOf("<") === -1)
        return x && lt ? x.createHTML(ue) : ue;
      if (K = ya(ue), !K)
        return tt ? null : lt ? N : "";
    }
    K && We && St(K.firstChild);
    const Qe = Ts(z ? ue : K);
    for (; Le = Qe.nextNode(); )
      Es(Le), Os(Le), Le.content instanceof i && Sp(Le.content);
    if (z)
      return ue;
    if (tt) {
      if (Ie)
        for (ct = A.call(K.ownerDocument); K.firstChild; )
          ct.appendChild(K.firstChild);
      else
        ct = K;
      return (j.shadowroot || j.shadowrootmode) && (ct = C.call(r, ct, !0)), ct;
    }
    let wt = Xe ? K.outerHTML : K.innerHTML;
    return Xe && q["!doctype"] && K.ownerDocument && K.ownerDocument.doctype && K.ownerDocument.doctype.name && ut(ip, K.ownerDocument.doctype.name) && (wt = "<!DOCTYPE " + K.ownerDocument.doctype.name + `>
` + wt), he && oo([P, L, F], (on) => {
      wt = yr(wt, on, " ");
    }), x && lt ? x.createHTML(wt) : wt;
  }, t.setConfig = function() {
    let ue = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    st(ue), et = !0;
  }, t.clearConfig = function() {
    Ze = null, et = !1;
  }, t.isValidAttribute = function(ue, R, K) {
    Ze || st({});
    const ce = Se(ue), Le = Se(R);
    return Is(ce, Le, K);
  }, t.addHook = function(ue, R) {
    typeof R == "function" && gr(T[ue], R);
  }, t.removeHook = function(ue, R) {
    if (R !== void 0) {
      const K = fC(T[ue], R);
      return K === -1 ? void 0 : hC(T[ue], K, 1)[0];
    }
    return nl(T[ue]);
  }, t.removeHooks = function(ue) {
    T[ue] = [];
  }, t.removeAllHooks = function() {
    T = cl();
  }, t;
}
var RC = sp();
function cp({
  faq: e,
  className: t,
  expanded: n,
  defaultExpanded: r = !1,
  onExpandedChange: a,
  showKeywords: i = !1,
  dangerouslySetAnswerHTML: s = !1
}) {
  const [c, l] = y.useState(r), u = n !== void 0, p = u ? n : c, m = () => {
    const h = !p;
    u || l(h), a?.(h);
  };
  return /* @__PURE__ */ d(
    "div",
    {
      className: Z(
        "border border-neutral-200 rounded-lg overflow-hidden dark:border-neutral-800",
        t
      ),
      children: [
        /* @__PURE__ */ d(
          "button",
          {
            type: "button",
            onClick: m,
            className: Z(
              "w-full flex items-center justify-between px-4 py-3 text-left",
              "bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-900 dark:hover:bg-neutral-800",
              "transition-colors duration-150"
            ),
            "aria-expanded": p,
            children: [
              /* @__PURE__ */ o("span", { className: "font-medium text-neutral-900 dark:text-neutral-100 pr-4", children: e.question }),
              /* @__PURE__ */ o(
                "svg",
                {
                  className: Z(
                    "w-5 h-5 text-neutral-500 transition-transform duration-200 flex-shrink-0",
                    p && "rotate-180"
                  ),
                  fill: "none",
                  viewBox: "0 0 24 24",
                  stroke: "currentColor",
                  children: /* @__PURE__ */ o("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M19 9l-7 7-7-7" })
                }
              )
            ]
          }
        ),
        p && /* @__PURE__ */ d("div", { className: "px-4 py-3 bg-white dark:bg-neutral-950", children: [
          s ? /* @__PURE__ */ o(
            "div",
            {
              className: "text-sm text-neutral-600 dark:text-neutral-400 prose prose-sm dark:prose-invert max-w-none",
              dangerouslySetInnerHTML: {
                __html: RC.sanitize(e.answer, {
                  ALLOWED_TAGS: ["b", "i", "em", "strong", "a", "p", "br", "ul", "ol", "li"],
                  ALLOWED_ATTR: ["href", "target", "rel"]
                })
              }
            }
          ) : /* @__PURE__ */ o("p", { className: "text-sm text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap", children: e.answer }),
          i && e.keywords && e.keywords.length > 0 && /* @__PURE__ */ o("div", { className: "mt-3 flex flex-wrap gap-1", children: e.keywords.map((h) => /* @__PURE__ */ o(
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
function OC({
  faqs: e,
  className: t,
  accordion: n = !1,
  showKeywords: r = !1,
  dangerouslySetAnswerHTML: a = !1,
  emptyMessage: i = "No FAQs available."
}) {
  const [s, c] = y.useState(null), l = e.filter((u) => u.active !== !1);
  return l.length === 0 ? /* @__PURE__ */ o("div", { className: Z("text-center py-8 text-neutral-500 dark:text-neutral-400", t), children: i }) : /* @__PURE__ */ o("div", { className: Z("space-y-2", t), children: l.map((u) => /* @__PURE__ */ o(
    cp,
    {
      faq: u,
      showKeywords: r,
      dangerouslySetAnswerHTML: a,
      expanded: n ? s === u.id : void 0,
      onExpandedChange: n ? (p) => c(p ? u.id : null) : void 0
    },
    u.id
  )) });
}
function rt({ amount: e, currency: t }) {
  return new Intl.NumberFormat(void 0, {
    style: "currency",
    currency: t
  }).format(e);
}
function fa({
  amount: e,
  currency: t,
  compareAt: n,
  className: r,
  size: a = "default"
}) {
  const i = typeof n == "number" && n > e;
  return /* @__PURE__ */ d("div", { className: Z("flex items-baseline gap-2 tabular-nums", r), children: [
    /* @__PURE__ */ o("span", { className: Z("font-semibold", a === "sm" ? "text-sm" : "text-base"), children: rt({ amount: e, currency: t }) }),
    i ? /* @__PURE__ */ o("span", { className: Z(
      "text-neutral-500 line-through dark:text-neutral-400",
      a === "sm" ? "text-xs" : "text-sm"
    ), children: rt({ amount: n, currency: t }) }) : null
  ] });
}
const MC = {
  large: "aspect-[4/5]",
  square: "aspect-square",
  compact: "aspect-[3/4]"
}, DC = {
  center: "object-center",
  top: "object-top",
  bottom: "object-bottom",
  left: "object-left",
  right: "object-right"
};
function lp({
  product: e,
  href: t,
  onAddToCart: n,
  onQuickView: r,
  className: a,
  layout: i = "large",
  imageCrop: s = "center"
}) {
  const c = e.inventoryStatus === "out_of_stock" || typeof e.inventoryQuantity == "number" && e.inventoryQuantity <= 0, l = typeof e.inventoryQuantity == "number" ? e.inventoryQuantity : null;
  return /* @__PURE__ */ d(zt, { className: Z("group flex h-full flex-col overflow-hidden rounded-2xl", a), children: [
    /* @__PURE__ */ d("div", { className: "relative", children: [
      /* @__PURE__ */ o("a", { href: t, className: "block", "aria-label": `View ${e.title}`, children: /* @__PURE__ */ o("div", { className: Z("overflow-hidden bg-neutral-100 dark:bg-neutral-900", MC[i]), children: /* @__PURE__ */ o(
        "img",
        {
          src: e.images[0]?.url,
          alt: e.images[0]?.alt ?? e.title,
          className: Z(
            "h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]",
            DC[s]
          ),
          loading: "lazy"
        }
      ) }) }),
      i !== "compact" && e.tags?.length ? /* @__PURE__ */ o("div", { className: "pointer-events-none absolute inset-x-0 bottom-0 flex gap-1 p-3", children: e.tags.slice(0, 2).map((u) => /* @__PURE__ */ o(Tn, { className: "pointer-events-none bg-white/90 text-neutral-900 backdrop-blur dark:bg-neutral-950/80 dark:text-neutral-50", children: u }, u)) }) : null,
      c ? /* @__PURE__ */ o("div", { className: "pointer-events-none absolute left-3 top-3", children: /* @__PURE__ */ o(Tn, { variant: "secondary", className: "bg-white/90 text-neutral-900 backdrop-blur dark:bg-neutral-950/80 dark:text-neutral-50", children: "Out of stock" }) }) : l != null && l > 0 && l <= 5 ? /* @__PURE__ */ o("div", { className: "pointer-events-none absolute left-3 top-3", children: /* @__PURE__ */ d(Tn, { variant: "secondary", className: "bg-white/90 text-neutral-900 backdrop-blur dark:bg-neutral-950/80 dark:text-neutral-50", children: [
        "Only ",
        l,
        " left"
      ] }) }) : null,
      r ? /* @__PURE__ */ o("div", { className: "absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100", children: /* @__PURE__ */ o(
        le,
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
    /* @__PURE__ */ d("div", { className: Z("flex flex-1 flex-col", i === "compact" ? "p-3" : "p-4"), children: [
      /* @__PURE__ */ o("div", { className: "flex items-start justify-between gap-3", children: /* @__PURE__ */ d("div", { className: "min-w-0", children: [
        /* @__PURE__ */ o("div", { className: Z(
          "line-clamp-1 font-medium text-neutral-950 dark:text-neutral-50",
          i === "compact" ? "text-xs" : "text-sm"
        ), children: e.title }),
        /* @__PURE__ */ o("div", { className: "mt-1", children: /* @__PURE__ */ o(
          fa,
          {
            amount: e.price,
            currency: e.currency,
            compareAt: e.compareAtPrice,
            size: i === "compact" ? "sm" : "default"
          }
        ) })
      ] }) }),
      i === "large" && /* @__PURE__ */ o("p", { className: "mt-2 line-clamp-2 min-h-8 text-xs leading-4 text-neutral-600 dark:text-neutral-400", children: e.description }),
      /* @__PURE__ */ o("div", { className: Z("mt-auto", i === "compact" ? "pt-3" : "pt-4"), children: /* @__PURE__ */ o(
        le,
        {
          type: "button",
          className: "w-full",
          size: i === "compact" ? "sm" : "default",
          onClick: () => n?.(e, null),
          disabled: c,
          children: c ? "Out of stock" : "Add to cart"
        }
      ) })
    ] })
  ] });
}
function ha({
  products: e,
  columns: t,
  onAddToCart: n,
  onQuickView: r,
  getProductHref: a,
  className: i,
  layout: s,
  imageCrop: c
}) {
  const l = t?.base ?? 2, u = t?.md ?? 3, p = t?.lg ?? 3, m = { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4" }, h = { 1: "md:grid-cols-1", 2: "md:grid-cols-2", 3: "md:grid-cols-3", 4: "md:grid-cols-4" }, g = { 1: "lg:grid-cols-1", 2: "lg:grid-cols-2", 3: "lg:grid-cols-3", 4: "lg:grid-cols-4" }, v = Z(
    "grid gap-4",
    m[Math.min(4, Math.max(1, l))],
    h[Math.min(4, Math.max(1, u))],
    g[Math.min(4, Math.max(1, p))]
  );
  return /* @__PURE__ */ o("div", { className: Z(v, i), children: e.map((f) => /* @__PURE__ */ o(
    lp,
    {
      product: f,
      href: a ? a(f) : void 0,
      onAddToCart: n,
      onQuickView: r,
      layout: s,
      imageCrop: c
    },
    f.id
  )) });
}
function vs({
  images: e,
  className: t
}) {
  const [n, r] = y.useState(0), a = e[n];
  return e.length === 0 ? /* @__PURE__ */ o(
    "div",
    {
      className: Z(
        "aspect-square w-full rounded-xl border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900",
        t
      )
    }
  ) : /* @__PURE__ */ d("div", { className: Z("space-y-3", t), children: [
    /* @__PURE__ */ o("div", { className: "aspect-square overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900", children: /* @__PURE__ */ o(
      "img",
      {
        src: a?.url,
        alt: a?.alt ?? "",
        className: "h-full w-full object-cover",
        loading: "eager"
      }
    ) }),
    e.length > 1 ? /* @__PURE__ */ o("div", { className: "flex gap-2 overflow-x-auto pb-1", children: e.map((i, s) => /* @__PURE__ */ o(
      "button",
      {
        type: "button",
        className: Z(
          "h-16 w-16 shrink-0 overflow-hidden rounded-lg border",
          s === n ? "border-neutral-900 dark:border-neutral-50" : "border-neutral-200 dark:border-neutral-800"
        ),
        onClick: () => r(s),
        "aria-label": `View image ${s + 1}`,
        children: /* @__PURE__ */ o("img", { src: i.url, alt: i.alt ?? "", className: "h-full w-full object-cover", loading: "lazy" })
      },
      i.url
    )) }) : null
  ] });
}
function LC(e) {
  const t = /* @__PURE__ */ new Set();
  for (const n of e)
    for (const r of Object.keys(n.options)) t.add(r);
  return Array.from(t);
}
function $C(e, t) {
  const n = /* @__PURE__ */ new Set();
  for (const r of e) {
    const a = r.options[t];
    a && n.add(a);
  }
  return Array.from(n);
}
function ll(e, t) {
  return e.find(
    (n) => Object.entries(t).every(([r, a]) => n.options[r] === a)
  ) ?? null;
}
function dp(e) {
  return e.inventoryStatus === "out_of_stock" || typeof e.inventoryQuantity == "number" && e.inventoryQuantity <= 0;
}
function zC(e) {
  return e.inventoryStatus === "low" || typeof e.inventoryQuantity == "number" && e.inventoryQuantity > 0 && e.inventoryQuantity <= 5;
}
function FC(e) {
  const t = dp(e), n = !t && zC(e), r = typeof e.inventoryQuantity == "number" ? e.inventoryQuantity : void 0;
  return { isOutOfStock: t, isLow: n, quantity: r };
}
function BC(e, t, n, r) {
  const a = { ...t, [n]: r }, i = e.filter(
    (s) => Object.entries(a).every(([c, l]) => s.options[c] === l)
  );
  return i.length === 0 ? !1 : i.some((s) => !dp(s));
}
function bs({
  product: e,
  value: t,
  onChange: n,
  className: r,
  showInventory: a = !0,
  disableOutOfStock: i = !1
}) {
  const s = y.useMemo(() => e.variants ?? [], [e.variants]), c = y.useMemo(() => LC(s), [s]), l = y.useMemo(
    () => ll(s, t.selectedOptions),
    [s, t.selectedOptions]
  ), u = y.useMemo(
    () => l ? FC(l) : null,
    [l]
  );
  return s.length === 0 || c.length === 0 ? null : /* @__PURE__ */ d("div", { className: Z("space-y-4", r), children: [
    c.map((p) => {
      const m = $C(s, p), h = t.selectedOptions[p];
      return /* @__PURE__ */ d("div", { className: "space-y-2", children: [
        /* @__PURE__ */ d("div", { className: "flex items-baseline justify-between", children: [
          /* @__PURE__ */ o("div", { className: "text-sm font-medium text-neutral-950 dark:text-neutral-50", children: p }),
          /* @__PURE__ */ o("div", { className: "text-xs text-neutral-500 dark:text-neutral-400", children: h || "Select" })
        ] }),
        /* @__PURE__ */ o("div", { className: "flex flex-wrap gap-2", children: m.map((g) => {
          const v = g === h, f = BC(
            s,
            t.selectedOptions,
            p,
            g
          ), b = i && !f;
          return /* @__PURE__ */ d(
            le,
            {
              type: "button",
              size: "sm",
              variant: v ? "default" : "outline",
              onClick: () => {
                const k = { ...t.selectedOptions, [p]: g }, w = ll(s, k);
                n({ selectedOptions: k, variant: w });
              },
              "aria-pressed": v,
              disabled: b,
              className: Z(
                !f && !b && "opacity-50 line-through"
              ),
              children: [
                g,
                !f && !b && /* @__PURE__ */ o("span", { className: "ml-1 text-[10px] opacity-70", children: "(Out)" })
              ]
            },
            g
          );
        }) })
      ] }, p);
    }),
    a && l && u && /* @__PURE__ */ o("div", { className: "pt-2", children: u.isOutOfStock ? /* @__PURE__ */ o("div", { className: "text-sm font-medium text-red-600 dark:text-red-400", children: "Out of stock" }) : u.isLow && u.quantity !== void 0 ? /* @__PURE__ */ d("div", { className: "text-sm text-amber-600 dark:text-amber-400", children: [
      "Only ",
      /* @__PURE__ */ o("span", { className: "font-semibold", children: u.quantity }),
      " left"
    ] }) : null })
  ] });
}
function ws({
  qty: e,
  onChange: t,
  min: n = 1,
  max: r,
  className: a
}) {
  const i = Number.isFinite(e) ? Math.max(n, Math.floor(e)) : n, s = i > n, c = typeof r == "number" ? i < r : !0;
  return /* @__PURE__ */ d("div", { className: Z("flex items-center gap-2", a), children: [
    /* @__PURE__ */ o(
      le,
      {
        type: "button",
        size: "icon",
        variant: "outline",
        onClick: () => t(Math.max(n, i - 1)),
        disabled: !s,
        "aria-label": "Decrease quantity",
        children: "-"
      }
    ),
    /* @__PURE__ */ o(
      Ye,
      {
        inputMode: "numeric",
        pattern: "[0-9]*",
        value: String(i),
        onChange: (l) => {
          const u = Math.floor(Number(l.target.value));
          if (!Number.isFinite(u)) return;
          const p = Math.max(n, typeof r == "number" ? Math.min(r, u) : u);
          t(p);
        },
        className: "h-10 w-16 text-center",
        "aria-label": "Quantity"
      }
    ),
    /* @__PURE__ */ o(
      le,
      {
        type: "button",
        size: "icon",
        variant: "outline",
        onClick: () => t(i + 1),
        disabled: !c,
        "aria-label": "Increase quantity",
        children: "+"
      }
    )
  ] });
}
function _s({
  product: e,
  open: t,
  onOpenChange: n,
  productHref: r,
  onAddToCart: a,
  className: i
}) {
  const [s, c] = y.useState(1), [l, u] = y.useState({
    selectedOptions: {},
    variant: null
  });
  if (y.useEffect(() => {
    if (e)
      if (c(1), e.variants?.length) {
        const h = e.variants[0];
        u({ selectedOptions: { ...h.options }, variant: h });
      } else
        u({ selectedOptions: {}, variant: null });
  }, [e?.id]), !e) return null;
  const p = l.variant?.price ?? e.price, m = l.variant?.compareAtPrice ?? e.compareAtPrice;
  return /* @__PURE__ */ o(os, { open: t, onOpenChange: n, children: /* @__PURE__ */ d(na, { className: Z("max-w-3xl", i), children: [
    /* @__PURE__ */ o(is, { children: /* @__PURE__ */ d(ra, { className: "flex items-center justify-between gap-3", children: [
      /* @__PURE__ */ o("span", { className: "truncate", children: e.title }),
      r ? /* @__PURE__ */ o(
        "a",
        {
          href: r(e.slug),
          className: "text-sm font-normal text-neutral-700 hover:underline dark:text-neutral-300",
          children: "View details"
        }
      ) : null
    ] }) }),
    /* @__PURE__ */ d("div", { className: "grid gap-8 md:grid-cols-2", children: [
      /* @__PURE__ */ o(vs, { images: e.images }),
      /* @__PURE__ */ d("div", { className: "space-y-5", children: [
        /* @__PURE__ */ d("div", { children: [
          /* @__PURE__ */ o(fa, { amount: p, currency: e.currency, compareAt: m }),
          /* @__PURE__ */ o("p", { className: "mt-3 text-sm text-neutral-600 dark:text-neutral-400", children: e.description })
        ] }),
        /* @__PURE__ */ o(
          bs,
          {
            product: e,
            value: { selectedOptions: l.selectedOptions, variantId: l.variant?.id },
            onChange: (h) => u(h)
          }
        ),
        /* @__PURE__ */ d("div", { className: "flex flex-wrap items-center gap-3", children: [
          /* @__PURE__ */ o(ws, { qty: s, onChange: c }),
          /* @__PURE__ */ o(
            le,
            {
              type: "button",
              className: "flex-1",
              onClick: () => {
                a(e, l.variant, s), n(!1);
              },
              children: "Add to cart"
            }
          )
        ] }),
        /* @__PURE__ */ o("div", { className: "text-xs text-neutral-500 dark:text-neutral-400", children: e.inventoryStatus === "out_of_stock" ? "Out of stock" : "In stock" })
      ] })
    ] })
  ] }) });
}
function wi({
  categories: e,
  activeSlug: t,
  onSelect: n,
  className: r
}) {
  return /* @__PURE__ */ o("nav", { className: Z("space-y-1", r), "aria-label": "Categories", children: e.map((a) => {
    const i = t === a.slug;
    return /* @__PURE__ */ d(
      "button",
      {
        type: "button",
        className: Z(
          "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
          i ? "bg-neutral-900 text-neutral-50 dark:bg-neutral-50 dark:text-neutral-900" : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
        ),
        onClick: () => n?.(a),
        "aria-current": i ? "page" : void 0,
        children: [
          /* @__PURE__ */ o("span", { className: "truncate", children: a.name }),
          /* @__PURE__ */ o("span", { className: "text-xs opacity-70", children: "›" })
        ]
      },
      a.id
    );
  }) });
}
function xs({ items: e, className: t }) {
  return /* @__PURE__ */ o("nav", { className: Z("flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400", t), "aria-label": "Breadcrumb", children: e.map((n, r) => /* @__PURE__ */ d("span", { className: "flex items-center gap-2", children: [
    n.href ? /* @__PURE__ */ o("a", { href: n.href, className: "hover:underline", children: n.label }) : /* @__PURE__ */ o("span", { className: "text-neutral-900 dark:text-neutral-50", children: n.label }),
    r < e.length - 1 ? /* @__PURE__ */ o("span", { "aria-hidden": !0, children: "·" }) : null
  ] }, `${n.label}-${r}`)) });
}
function ks({
  value: e,
  onChange: t,
  placeholder: n = "Search products…",
  className: r
}) {
  return /* @__PURE__ */ d("div", { className: Z("relative", r), children: [
    /* @__PURE__ */ o(
      "div",
      {
        className: "pointer-events-none absolute inset-y-0 left-3 flex items-center text-neutral-500 dark:text-neutral-400",
        "aria-hidden": !0,
        children: "⌕"
      }
    ),
    /* @__PURE__ */ o(
      Ye,
      {
        value: e,
        onChange: (a) => t(a.target.value),
        placeholder: n,
        className: "pl-9",
        "aria-label": "Search"
      }
    )
  ] });
}
function Po({
  facets: e,
  value: t,
  onChange: n,
  onClear: r,
  className: a,
  enabledFilters: i
}) {
  const s = e.tags ?? [], c = new Set(t.tags ?? []), l = i?.tags ?? !0, u = i?.priceRange ?? !0, p = i?.inStock ?? !0;
  return l || u || p ? /* @__PURE__ */ d("div", { className: Z("space-y-4", a), children: [
    /* @__PURE__ */ d("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ o("div", { className: "text-sm font-semibold text-neutral-950 dark:text-neutral-50", children: "Filters" }),
      /* @__PURE__ */ o(le, { type: "button", variant: "ghost", className: "h-8 px-2 text-xs", onClick: r, children: "Clear" })
    ] }),
    /* @__PURE__ */ o(Et, {}),
    l && s.length ? /* @__PURE__ */ d("div", { className: "space-y-2", children: [
      /* @__PURE__ */ o("div", { className: "text-sm font-medium", children: "Tags" }),
      /* @__PURE__ */ o("div", { className: "space-y-2", children: s.map((h) => /* @__PURE__ */ d("label", { className: "flex cursor-pointer items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300", children: [
        /* @__PURE__ */ o(
          "input",
          {
            type: "checkbox",
            checked: c.has(h),
            onChange: (g) => {
              const v = new Set(c);
              g.target.checked ? v.add(h) : v.delete(h), n({ ...t, tags: Array.from(v) });
            }
          }
        ),
        h
      ] }, h)) })
    ] }) : null,
    u && e.price ? /* @__PURE__ */ d("div", { className: "space-y-2", children: [
      /* @__PURE__ */ o("div", { className: "text-sm font-medium", children: "Price" }),
      /* @__PURE__ */ d("div", { className: "grid gap-2 sm:grid-cols-2", children: [
        /* @__PURE__ */ d("div", { className: "grid gap-1", children: [
          /* @__PURE__ */ o(ht, { className: "text-xs", htmlFor: "price-min", children: "Min" }),
          /* @__PURE__ */ o(
            Ye,
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
        /* @__PURE__ */ d("div", { className: "grid gap-1", children: [
          /* @__PURE__ */ o(ht, { className: "text-xs", htmlFor: "price-max", children: "Max" }),
          /* @__PURE__ */ o(
            Ye,
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
    p ? /* @__PURE__ */ d("div", { className: "space-y-2", children: [
      /* @__PURE__ */ o("div", { className: "text-sm font-medium", children: "Availability" }),
      /* @__PURE__ */ d("label", { className: "flex cursor-pointer items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300", children: [
        /* @__PURE__ */ o(
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
function dl(e) {
  return /* @__PURE__ */ d("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", ...e, children: [
    /* @__PURE__ */ o("circle", { cx: "12", cy: "12", r: "10" }),
    /* @__PURE__ */ o("line", { x1: "12", y1: "8", x2: "12", y2: "12" }),
    /* @__PURE__ */ o("line", { x1: "12", y1: "16", x2: "12.01", y2: "16" })
  ] });
}
function jC(e) {
  return /* @__PURE__ */ d("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", ...e, children: [
    /* @__PURE__ */ o("path", { d: "M3 6h18" }),
    /* @__PURE__ */ o("path", { d: "M8 6V4h8v2" }),
    /* @__PURE__ */ o("path", { d: "M6 6l1 16h10l1-16" }),
    /* @__PURE__ */ o("path", { d: "M10 11v6" }),
    /* @__PURE__ */ o("path", { d: "M14 11v6" })
  ] });
}
function Ss({
  item: e,
  onRemove: t,
  onSetQty: n,
  variant: r = "table",
  className: a,
  inventory: i
}) {
  const s = e.unitPrice * e.qty, [c, l] = y.useState(!1), u = y.useMemo(() => {
    if (i?.availableQty)
      return i.availableQty;
  }, [i?.availableQty]), p = !i?.isOutOfStock && (u === void 0 || e.qty < u), m = y.useMemo(() => i ? i.isOutOfStock ? { type: "error", message: i.message || "Out of stock" } : i.exceedsAvailable ? { type: "warning", message: i.message || "Quantity exceeds available stock" } : i.isLowStock ? { type: "info", message: i.message || "Low stock" } : null : null, [i]);
  return y.useEffect(() => {
    c && e.qty !== 1 && l(!1);
  }, [c, e.qty]), r === "compact" ? /* @__PURE__ */ d("div", { className: Z("flex items-start gap-3", a), children: [
    /* @__PURE__ */ o("div", { className: "h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900", children: e.imageSnapshot ? /* @__PURE__ */ o("img", { src: e.imageSnapshot, alt: e.titleSnapshot, className: "h-full w-full object-cover" }) : null }),
    /* @__PURE__ */ o("div", { className: "min-w-0 flex-1", children: /* @__PURE__ */ d("div", { className: "flex items-center gap-3", children: [
      /* @__PURE__ */ d("div", { className: "min-w-0 flex-1", children: [
        /* @__PURE__ */ o("div", { className: "truncate text-sm font-medium text-neutral-950 dark:text-neutral-50", children: e.titleSnapshot }),
        /* @__PURE__ */ o("div", { className: "mt-0.5 text-xs tabular-nums text-neutral-600 dark:text-neutral-400", children: rt({ amount: s, currency: e.currency }) }),
        m && /* @__PURE__ */ d(
          "div",
          {
            className: Z(
              "mt-1 flex items-center gap-1 text-[11px]",
              m.type === "error" && "text-red-600 dark:text-red-400",
              m.type === "warning" && "text-amber-600 dark:text-amber-400",
              m.type === "info" && "text-blue-600 dark:text-blue-400"
            ),
            children: [
              /* @__PURE__ */ o(dl, { className: "h-3 w-3 shrink-0" }),
              /* @__PURE__ */ o("span", { children: m.message })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ o("div", { className: "flex h-12 w-[140px] shrink-0 items-center justify-end", children: c ? /* @__PURE__ */ d("div", { className: "flex w-full flex-col items-center justify-center gap-2", children: [
        /* @__PURE__ */ o("div", { className: "text-center text-[11px] font-medium leading-none text-neutral-600 dark:text-neutral-400", children: "Remove item?" }),
        /* @__PURE__ */ d("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ o(
            le,
            {
              type: "button",
              variant: "outline",
              className: "h-7 w-[62px] px-0 text-[11px] leading-none",
              onClick: () => l(!1),
              children: "Cancel"
            }
          ),
          /* @__PURE__ */ o(
            le,
            {
              type: "button",
              variant: "destructive",
              className: "h-7 w-[62px] px-0 text-[11px] leading-none",
              onClick: t,
              children: "Confirm"
            }
          )
        ] })
      ] }) : /* @__PURE__ */ d("div", { className: "flex items-center justify-end gap-1.5 whitespace-nowrap", children: [
        /* @__PURE__ */ o(
          le,
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
            children: e.qty === 1 ? /* @__PURE__ */ o(jC, { className: "h-4 w-4" }) : "-"
          }
        ),
        /* @__PURE__ */ o(
          Ye,
          {
            inputMode: "numeric",
            pattern: "[0-9]*",
            value: String(e.qty),
            onChange: (h) => {
              const g = Math.floor(Number(h.target.value));
              if (!Number.isFinite(g)) return;
              const v = Math.max(1, u ? Math.min(u, g) : g);
              n(v);
            },
            className: "h-8 w-11 px-2 text-center",
            "aria-label": "Quantity"
          }
        ),
        /* @__PURE__ */ o(
          le,
          {
            type: "button",
            size: "icon",
            variant: "outline",
            className: "h-8 w-8",
            "aria-label": "Increase quantity",
            onClick: () => n(u ? Math.min(u, e.qty + 1) : e.qty + 1),
            disabled: !p,
            children: "+"
          }
        )
      ] }) })
    ] }) })
  ] }) : /* @__PURE__ */ d(
    "div",
    {
      className: Z(
        "grid grid-cols-[64px_1fr] items-start gap-x-4 gap-y-3 sm:grid-cols-[64px_1fr_176px_120px]",
        a
      ),
      children: [
        /* @__PURE__ */ o("div", { className: "h-16 w-16 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900", children: e.imageSnapshot ? /* @__PURE__ */ o("img", { src: e.imageSnapshot, alt: e.titleSnapshot, className: "h-full w-full object-cover" }) : null }),
        /* @__PURE__ */ d("div", { className: "col-start-2 row-start-1 min-w-0", children: [
          /* @__PURE__ */ d("div", { className: "flex items-start justify-between gap-3", children: [
            /* @__PURE__ */ o("div", { className: "truncate text-sm font-medium text-neutral-950 dark:text-neutral-50", children: e.titleSnapshot }),
            /* @__PURE__ */ o("div", { className: "text-sm font-semibold text-neutral-950 dark:text-neutral-50 sm:hidden", children: rt({ amount: s, currency: e.currency }) })
          ] }),
          /* @__PURE__ */ d("div", { className: "mt-1 text-xs text-neutral-600 dark:text-neutral-400", children: [
            rt({ amount: e.unitPrice, currency: e.currency }),
            " each"
          ] }),
          m && /* @__PURE__ */ d(
            "div",
            {
              className: Z(
                "mt-1.5 flex items-center gap-1 text-xs",
                m.type === "error" && "text-red-600 dark:text-red-400",
                m.type === "warning" && "text-amber-600 dark:text-amber-400",
                m.type === "info" && "text-blue-600 dark:text-blue-400"
              ),
              children: [
                /* @__PURE__ */ o(dl, { className: "h-3.5 w-3.5 shrink-0" }),
                /* @__PURE__ */ o("span", { children: m.message })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ d("div", { className: "col-span-2 col-start-1 row-start-2 flex items-center justify-between gap-3 sm:col-span-1 sm:col-start-3 sm:row-start-1 sm:justify-center", children: [
          /* @__PURE__ */ d("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ o(
              le,
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
            /* @__PURE__ */ o(
              Ye,
              {
                inputMode: "numeric",
                pattern: "[0-9]*",
                value: String(e.qty),
                onChange: (h) => {
                  const g = Math.floor(Number(h.target.value));
                  if (!Number.isFinite(g)) return;
                  const v = Math.max(1, u ? Math.min(u, g) : g);
                  n(v);
                },
                className: "h-9 w-14 text-center",
                "aria-label": "Quantity"
              }
            ),
            /* @__PURE__ */ o(
              le,
              {
                type: "button",
                size: "icon",
                variant: "outline",
                className: "h-9 w-9",
                "aria-label": "Increase quantity",
                onClick: () => n(u ? Math.min(u, e.qty + 1) : e.qty + 1),
                disabled: !p,
                children: "+"
              }
            )
          ] }),
          /* @__PURE__ */ o(
            le,
            {
              type: "button",
              variant: "ghost",
              className: "h-9 px-2 text-xs text-red-600 dark:text-red-400 sm:hidden",
              onClick: t,
              children: "Remove"
            }
          )
        ] }),
        /* @__PURE__ */ d("div", { className: "hidden sm:col-start-4 sm:row-start-1 sm:flex sm:flex-col sm:items-center sm:text-center", children: [
          /* @__PURE__ */ o("div", { className: "text-sm font-semibold tabular-nums text-neutral-950 dark:text-neutral-50", children: rt({ amount: s, currency: e.currency }) }),
          /* @__PURE__ */ o(
            le,
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
function Cs({
  currency: e,
  subtotal: t,
  itemCount: n,
  onCheckout: r,
  isCheckoutDisabled: a,
  checkoutDisabledReason: i,
  onRemoveUnavailable: s,
  className: c
}) {
  return /* @__PURE__ */ d("div", { className: Z("space-y-4", c), children: [
    /* @__PURE__ */ o(Et, {}),
    /* @__PURE__ */ d("div", { className: "flex items-center justify-between text-sm", children: [
      /* @__PURE__ */ d("div", { className: "flex items-center gap-2 text-neutral-600 dark:text-neutral-400", children: [
        /* @__PURE__ */ o("span", { children: "Subtotal" }),
        typeof n == "number" ? /* @__PURE__ */ d(Oe, { children: [
          /* @__PURE__ */ o("span", { className: "text-neutral-300 dark:text-neutral-700", children: "·" }),
          /* @__PURE__ */ d("span", { className: "tabular-nums", children: [
            n,
            " item",
            n === 1 ? "" : "s"
          ] })
        ] }) : null
      ] }),
      /* @__PURE__ */ o("span", { className: "font-semibold text-neutral-950 dark:text-neutral-50", children: rt({ amount: t, currency: e }) })
    ] }),
    /* @__PURE__ */ o(le, { type: "button", onClick: r, disabled: a, className: "w-full", children: "Checkout" }),
    a && i && /* @__PURE__ */ d("div", { className: "space-y-2", children: [
      /* @__PURE__ */ o("p", { className: "text-center text-xs text-amber-600 dark:text-amber-400", children: i }),
      s && /* @__PURE__ */ o(
        "button",
        {
          type: "button",
          onClick: s,
          className: "mx-auto block text-xs text-neutral-500 underline underline-offset-2 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300",
          children: "Remove unavailable items"
        }
      )
    ] })
  ] });
}
function up({
  onCheckout: e,
  className: t
}) {
  const { config: n } = je(), r = jt(), { getItemInventory: a, hasIssues: i } = zi({
    items: r.items,
    refreshInterval: 3e4,
    skip: r.items.length === 0
  }), s = () => {
    for (const c of r.items) {
      const l = a(c.productId, c.variantId);
      (l?.isOutOfStock || l?.exceedsAvailable) && r.removeItem(c.productId, c.variantId);
    }
  };
  return r.items.length === 0 ? /* @__PURE__ */ o(
    tr,
    {
      title: "Cart is empty",
      description: "Add items from the catalog to check out.",
      className: t
    }
  ) : /* @__PURE__ */ d(
    "div",
    {
      className: Z(
        "flex h-full flex-col rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950",
        t
      ),
      children: [
        /* @__PURE__ */ o("div", { className: "-mr-4 min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-4", children: /* @__PURE__ */ o("div", { className: "divide-y divide-neutral-200 dark:divide-neutral-800", children: r.items.map((c) => /* @__PURE__ */ o("div", { className: "py-3", children: /* @__PURE__ */ o(
          Ss,
          {
            variant: "compact",
            item: c,
            onRemove: () => r.removeItem(c.productId, c.variantId),
            onSetQty: (l) => r.setQty(c.productId, c.variantId, l),
            inventory: a(c.productId, c.variantId)
          }
        ) }, `${c.productId}::${c.variantId ?? ""}`)) }) }),
        /* @__PURE__ */ o("div", { className: "mt-4 space-y-4", children: /* @__PURE__ */ o(
          Cs,
          {
            currency: n.currency,
            subtotal: r.subtotal,
            itemCount: r.count,
            onCheckout: e,
            isCheckoutDisabled: r.items.length === 0 || i,
            checkoutDisabledReason: i ? "Some items have inventory issues" : void 0,
            onRemoveUnavailable: i ? s : void 0
          }
        ) })
      ]
    }
  );
}
const mp = y.forwardRef(
  ({ className: e, ...t }, n) => /* @__PURE__ */ o(
    "textarea",
    {
      ref: n,
      className: Z(
        "flex min-h-10 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm transition-colors placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50 dark:placeholder:text-neutral-400 dark:focus-visible:ring-neutral-50/20",
        e
      ),
      ...t
    }
  )
);
mp.displayName = "Textarea";
function UC() {
  const [e, t] = y.useState(!1);
  return y.useEffect(() => {
    const n = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!n) return;
    const r = () => t(n.matches);
    return r(), n.addEventListener?.("change", r), () => n.removeEventListener?.("change", r);
  }, []), e;
}
function ul({
  children: e,
  className: t
}) {
  const n = y.useRef(null), r = UC();
  return y.useEffect(() => {
    const a = n.current;
    !a || r || a.animate(
      [
        { opacity: 0, transform: "translateY(6px)" },
        { opacity: 1, transform: "translateY(0px)" }
      ],
      { duration: 180, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)", fill: "both" }
    );
  }, [r]), /* @__PURE__ */ o("div", { ref: n, className: t, children: e });
}
function Qa() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
function WC({ className: e }) {
  const [t, n] = y.useState(""), [r, a] = y.useState(!1), [i, s] = y.useState(() => [
    {
      id: Qa(),
      role: "agent",
      text: "Hi! How can we help today? We can recommend products or answer support questions.",
      createdAt: Date.now()
    }
  ]), [c, l] = y.useState("…");
  y.useEffect(() => {
    if (!r) return;
    const g = [".", "..", "..."];
    let v = 0;
    const f = window.setInterval(() => {
      v = (v + 1) % g.length, l(g[v]);
    }, 450);
    return () => window.clearInterval(f);
  }, [r]);
  const u = y.useRef(null), p = y.useRef(null);
  y.useEffect(() => {
    const g = u.current;
    g && (g.scrollTop = g.scrollHeight);
  }, [i.length]);
  const m = y.useCallback(() => {
    const g = p.current;
    if (!g) return;
    const v = 120;
    g.style.height = "0px";
    const f = Math.min(v, Math.max(40, g.scrollHeight));
    g.style.height = `${f}px`, g.style.overflowY = g.scrollHeight > v ? "auto" : "hidden";
  }, []);
  y.useEffect(() => {
    m();
  }, [t, m]);
  const h = y.useCallback(() => {
    const g = t.trim();
    g && (s((v) => [
      ...v,
      {
        id: Qa(),
        role: "user",
        text: g,
        createdAt: Date.now()
      }
    ]), n(""), a(!0), window.setTimeout(() => {
      s((v) => [
        ...v,
        {
          id: Qa(),
          role: "agent",
          text: "Got it. Want recommendations, sizing help, or help with an order?",
          createdAt: Date.now()
        }
      ]), a(!1);
    }, 450));
  }, [t]);
  return /* @__PURE__ */ d("div", { className: Z("flex h-full min-h-0 flex-col", e), children: [
    /* @__PURE__ */ d(
      "div",
      {
        ref: u,
        className: "min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950",
        children: [
          i.map((g) => /* @__PURE__ */ o(
            ul,
            {
              className: Z(
                "flex",
                g.role === "user" ? "justify-end" : "justify-start"
              ),
              children: /* @__PURE__ */ o(
                "div",
                {
                  className: Z(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-5",
                    g.role === "user" ? "bg-neutral-900 text-neutral-50 dark:bg-neutral-50 dark:text-neutral-900" : "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-50"
                  ),
                  children: /* @__PURE__ */ o("span", { className: "whitespace-pre-wrap break-words", children: g.text })
                }
              )
            },
            g.id
          )),
          r ? /* @__PURE__ */ o(ul, { className: "flex justify-start", children: /* @__PURE__ */ o("div", { className: "max-w-[85%] rounded-2xl bg-neutral-100 px-3 py-2 text-sm leading-5 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-50", children: c }) }) : null
        ]
      }
    ),
    /* @__PURE__ */ d("div", { className: "mt-3 flex shrink-0 items-end gap-2", children: [
      /* @__PURE__ */ o(
        mp,
        {
          ref: p,
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
      /* @__PURE__ */ o(le, { type: "button", onClick: h, disabled: !t.trim(), className: "h-10 shrink-0", children: "Send" })
    ] })
  ] });
}
function zr({
  trigger: e,
  side: t = "right",
  open: n,
  onOpenChange: r,
  onCheckout: a,
  preferredTab: i,
  className: s
}) {
  const [c, l] = y.useState(i ?? "cart");
  return y.useEffect(() => {
    n && l(i ?? "cart");
  }, [n, i]), /* @__PURE__ */ d(oa, { modal: !1, open: n, onOpenChange: r, children: [
    e ? /* @__PURE__ */ o(aa, { asChild: !0, children: e }) : null,
    /* @__PURE__ */ d(
      Br,
      {
        side: t,
        overlayClassName: t === "popup" ? "pointer-events-none bg-transparent backdrop-blur-none" : "pointer-events-none bg-neutral-950/40 backdrop-blur-none",
        className: Z(
          t === "bottom" ? "h-[85vh] rounded-t-2xl" : void 0,
          t === "popup" ? "shadow-xl" : "w-full sm:max-w-md",
          t === "popup" ? "h-[min(640px,calc(100vh-2rem))]" : void 0,
          t === "popup" ? void 0 : "p-4",
          "flex flex-col overflow-hidden",
          s
        ),
        children: [
          /* @__PURE__ */ o(ia, { className: "space-y-0", children: /* @__PURE__ */ d("div", { className: "flex items-center justify-between gap-3", children: [
            /* @__PURE__ */ o(gs, { value: c, onValueChange: (u) => l(u), children: /* @__PURE__ */ d(ma, { className: "h-9", children: [
              /* @__PURE__ */ o($r, { value: "cart", className: "text-sm", children: "Cart" }),
              /* @__PURE__ */ o($r, { value: "chat", className: "text-sm", children: "Chat" })
            ] }) }),
            /* @__PURE__ */ o(hm, { asChild: !0, children: /* @__PURE__ */ o(
              le,
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
          /* @__PURE__ */ o("div", { className: "mt-3 min-h-0 flex-1 overflow-hidden", children: c === "chat" ? /* @__PURE__ */ d("div", { className: "flex h-full flex-col", children: [
            /* @__PURE__ */ o("div", { className: "text-sm text-neutral-600 dark:text-neutral-400", children: "Get help finding a product or ask us any questions. We’re both your shopping assistant and support chat." }),
            /* @__PURE__ */ o("div", { className: "mt-3 min-h-0 flex-1", children: /* @__PURE__ */ o(WC, { className: "h-full" }) })
          ] }) : /* @__PURE__ */ o(
            up,
            {
              onCheckout: () => {
                a(), r?.(!1);
              },
              className: "h-full border-0 bg-transparent p-0 shadow-none"
            }
          ) })
        ]
      }
    )
  ] });
}
function Ns({
  value: e,
  onApply: t,
  className: n
}) {
  const [r, a] = y.useState(e ?? "");
  return y.useEffect(() => {
    a(e ?? "");
  }, [e]), /* @__PURE__ */ d("div", { className: Z("space-y-2", n), children: [
    /* @__PURE__ */ o("div", { className: "text-sm font-medium text-neutral-950 dark:text-neutral-50", children: "Promo code" }),
    /* @__PURE__ */ d("div", { className: "flex gap-2", children: [
      /* @__PURE__ */ o(
        Ye,
        {
          value: r,
          onChange: (i) => a(i.target.value),
          placeholder: "SAVE10",
          "aria-label": "Promo code"
        }
      ),
      /* @__PURE__ */ o(le, { type: "button", variant: "outline", onClick: () => t(r.trim() || void 0), children: "Apply" })
    ] })
  ] });
}
function pp({
  onCheckout: e,
  showPromoCode: t,
  className: n
}) {
  const { config: r } = je(), a = jt(), { getItemInventory: i, hasIssues: s } = zi({
    items: a.items,
    refreshInterval: 3e4,
    skip: a.items.length === 0
  }), c = () => {
    for (const l of a.items) {
      const u = i(l.productId, l.variantId);
      (u?.isOutOfStock || u?.exceedsAvailable) && a.removeItem(l.productId, l.variantId);
    }
  };
  return a.items.length === 0 ? /* @__PURE__ */ o(
    tr,
    {
      title: "Your cart is empty",
      description: "Add a few products and come back here when you're ready to check out.",
      className: n
    }
  ) : /* @__PURE__ */ d("div", { className: Z("grid items-start gap-6 lg:grid-cols-[1fr_360px]", n), children: [
    /* @__PURE__ */ d("div", { className: "self-start rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950", children: [
      /* @__PURE__ */ d("div", { className: "hidden grid-cols-[64px_1fr_176px_120px] gap-x-4 px-5 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 sm:grid", children: [
        /* @__PURE__ */ o("div", {}),
        /* @__PURE__ */ o("div", { children: "Item" }),
        /* @__PURE__ */ o("div", { className: "text-center", children: "Qty" }),
        /* @__PURE__ */ o("div", { className: "text-center", children: "Total" })
      ] }),
      /* @__PURE__ */ o("div", { className: "divide-y divide-neutral-200 dark:divide-neutral-800", children: a.items.map((l) => /* @__PURE__ */ o("div", { className: "px-4 py-4 sm:px-5", children: /* @__PURE__ */ o(
        Ss,
        {
          item: l,
          onRemove: () => a.removeItem(l.productId, l.variantId),
          onSetQty: (u) => a.setQty(l.productId, l.variantId, u),
          inventory: i(l.productId, l.variantId)
        }
      ) }, `${l.productId}::${l.variantId ?? ""}`)) })
    ] }),
    /* @__PURE__ */ o("div", { className: "lg:sticky lg:top-24 self-start", children: /* @__PURE__ */ d("div", { className: "rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950", children: [
      /* @__PURE__ */ o("div", { className: "text-sm font-semibold text-neutral-950 dark:text-neutral-50", children: "Summary" }),
      /* @__PURE__ */ o(Et, { className: "my-4" }),
      /* @__PURE__ */ d("div", { className: "space-y-4", children: [
        t ? /* @__PURE__ */ o(Ns, { value: a.promoCode, onApply: a.setPromoCode }) : null,
        /* @__PURE__ */ o(
          Cs,
          {
            currency: r.currency,
            subtotal: a.subtotal,
            onCheckout: e,
            isCheckoutDisabled: a.items.length === 0 || s,
            checkoutDisabledReason: s ? "Some items have inventory issues" : void 0,
            onRemoveUnavailable: s ? c : void 0
          }
        )
      ] })
    ] }) })
  ] });
}
function fp({
  left: e,
  right: t,
  className: n
}) {
  return /* @__PURE__ */ d("div", { className: Z("grid items-start gap-8 lg:grid-cols-[1fr_420px]", n), children: [
    /* @__PURE__ */ o("div", { children: e }),
    /* @__PURE__ */ o("div", { children: t })
  ] });
}
function _i({
  title: e,
  value: t,
  onChange: n,
  errors: r,
  className: a
}) {
  return /* @__PURE__ */ d(
    "section",
    {
      className: Z(
        "space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950",
        a
      ),
      children: [
        /* @__PURE__ */ o("div", { className: "text-sm font-semibold text-neutral-950 dark:text-neutral-50", children: e }),
        /* @__PURE__ */ d("div", { className: "grid gap-3", children: [
          /* @__PURE__ */ d("div", { className: "grid gap-2", children: [
            /* @__PURE__ */ o(ht, { htmlFor: `${e}-line1`, children: "Address line 1" }),
            /* @__PURE__ */ o(
              Ye,
              {
                id: `${e}-line1`,
                value: t.line1,
                onChange: (i) => n({ ...t, line1: i.target.value }),
                "aria-invalid": !!r?.line1
              }
            ),
            r?.line1 ? /* @__PURE__ */ o("div", { className: "text-xs text-red-600", children: r.line1 }) : null
          ] }),
          /* @__PURE__ */ d("div", { className: "grid gap-2", children: [
            /* @__PURE__ */ o(ht, { htmlFor: `${e}-line2`, children: "Address line 2" }),
            /* @__PURE__ */ o(
              Ye,
              {
                id: `${e}-line2`,
                value: t.line2 ?? "",
                onChange: (i) => n({ ...t, line2: i.target.value })
              }
            )
          ] }),
          /* @__PURE__ */ d("div", { className: "grid gap-3 sm:grid-cols-2", children: [
            /* @__PURE__ */ d("div", { className: "grid gap-2", children: [
              /* @__PURE__ */ o(ht, { htmlFor: `${e}-city`, children: "City" }),
              /* @__PURE__ */ o(
                Ye,
                {
                  id: `${e}-city`,
                  value: t.city,
                  onChange: (i) => n({ ...t, city: i.target.value }),
                  "aria-invalid": !!r?.city
                }
              ),
              r?.city ? /* @__PURE__ */ o("div", { className: "text-xs text-red-600", children: r.city }) : null
            ] }),
            /* @__PURE__ */ d("div", { className: "grid gap-2", children: [
              /* @__PURE__ */ o(ht, { htmlFor: `${e}-state`, children: "State" }),
              /* @__PURE__ */ o(
                Ye,
                {
                  id: `${e}-state`,
                  value: t.state ?? "",
                  onChange: (i) => n({ ...t, state: i.target.value })
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ d("div", { className: "grid gap-3 sm:grid-cols-2", children: [
            /* @__PURE__ */ d("div", { className: "grid gap-2", children: [
              /* @__PURE__ */ o(ht, { htmlFor: `${e}-postal`, children: "Postal code" }),
              /* @__PURE__ */ o(
                Ye,
                {
                  id: `${e}-postal`,
                  value: t.postalCode,
                  onChange: (i) => n({ ...t, postalCode: i.target.value }),
                  "aria-invalid": !!r?.postalCode
                }
              ),
              r?.postalCode ? /* @__PURE__ */ o("div", { className: "text-xs text-red-600", children: r.postalCode }) : null
            ] }),
            /* @__PURE__ */ d("div", { className: "grid gap-2", children: [
              /* @__PURE__ */ o(ht, { htmlFor: `${e}-country`, children: "Country" }),
              /* @__PURE__ */ o(
                Ye,
                {
                  id: `${e}-country`,
                  value: t.country,
                  onChange: (i) => n({ ...t, country: i.target.value }),
                  "aria-invalid": !!r?.country
                }
              ),
              r?.country ? /* @__PURE__ */ o("div", { className: "text-xs text-red-600", children: r.country }) : null
            ] })
          ] })
        ] })
      ]
    }
  );
}
function hp({
  methods: e,
  value: t,
  onChange: n,
  currency: r,
  className: a
}) {
  return e.length === 0 ? null : /* @__PURE__ */ d(
    "section",
    {
      className: Z(
        "space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950",
        a
      ),
      children: [
        /* @__PURE__ */ o("div", { className: "text-sm font-semibold text-neutral-950 dark:text-neutral-50", children: "Shipping method" }),
        /* @__PURE__ */ o("div", { className: "space-y-2", children: e.map((i) => {
          const s = i.id === t;
          return /* @__PURE__ */ d(
            le,
            {
              type: "button",
              variant: s ? "default" : "outline",
              className: "h-auto w-full justify-between px-4 py-3",
              onClick: () => n(i.id),
              "aria-pressed": s,
              children: [
                /* @__PURE__ */ d("div", { className: "text-left", children: [
                  /* @__PURE__ */ o("div", { className: "text-sm font-medium", children: i.label }),
                  i.detail ? /* @__PURE__ */ o("div", { className: "text-xs opacity-80", children: i.detail }) : null
                ] }),
                /* @__PURE__ */ o("div", { className: "text-sm font-semibold", children: rt({ amount: i.price, currency: i.currency || r }) })
              ]
            },
            i.id
          );
        }) })
      ]
    }
  );
}
function Ya({ message: e }) {
  return e ? /* @__PURE__ */ o("div", { className: "text-xs text-red-600", children: e }) : null;
}
function gp({ className: e }) {
  const { config: t } = je(), n = Bo(), r = jt(), a = t.checkout.mode, i = y.useMemo(
    () => so(r.items, {
      requireEmail: t.checkout.requireEmail ?? !0,
      defaultMode: a,
      allowShipping: t.checkout.allowShipping ?? !1
    }),
    [r.items, t.checkout.allowShipping, t.checkout.requireEmail, a]
  ), s = (t.checkout.allowShipping ?? !1) && i.shippingAddress && (a === "shipping" || a === "full"), c = i.email !== "none" || i.name !== "none" || i.phone !== "none", l = {
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "US"
  }, u = n.values.shippingAddress ?? l, p = n.values.billingAddress ?? l, m = fd({
    enabled: !!t.adapter.getShippingMethods && s,
    customer: {
      email: n.values.email || void 0,
      name: n.values.name || void 0,
      shippingAddress: u
    }
  });
  return /* @__PURE__ */ d("form", { className: Z("space-y-6", e), onSubmit: (h) => h.preventDefault(), children: [
    i.isDigitalOnly ? /* @__PURE__ */ o(zt, { className: "rounded-2xl", children: /* @__PURE__ */ d(Jt, { className: "p-5", children: [
      /* @__PURE__ */ o("div", { className: "text-sm font-semibold text-neutral-950 dark:text-neutral-50", children: "Digital delivery" }),
      /* @__PURE__ */ o("div", { className: "mt-1 text-sm text-neutral-600 dark:text-neutral-400", children: i.fulfillmentNotes || "This is a digital product and will be available from your account after purchase." })
    ] }) }) : null,
    i.hasPhysical && !(t.checkout.allowShipping ?? !1) ? /* @__PURE__ */ o(zt, { className: "rounded-2xl border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/30", children: /* @__PURE__ */ d(Jt, { className: "p-5", children: [
      /* @__PURE__ */ o("div", { className: "text-sm font-semibold text-red-900 dark:text-red-200", children: "Shipping required" }),
      /* @__PURE__ */ o("div", { className: "mt-1 text-sm text-red-800/90 dark:text-red-200/80", children: "Your cart contains shippable items, but shipping is disabled for this checkout." })
    ] }) }) : null,
    c ? /* @__PURE__ */ d("section", { className: "space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950", children: [
      /* @__PURE__ */ d("div", { className: "flex items-baseline justify-between gap-3", children: [
        /* @__PURE__ */ o("div", { className: "text-sm font-semibold text-neutral-950 dark:text-neutral-50", children: "Contact" }),
        /* @__PURE__ */ o("div", { className: "text-xs text-neutral-500 dark:text-neutral-400", children: i.email === "required" || i.name === "required" || i.phone === "required" ? "Required" : "Optional" })
      ] }),
      /* @__PURE__ */ d("div", { className: "grid gap-3", children: [
        i.email !== "none" ? /* @__PURE__ */ d("div", { className: "grid gap-2", children: [
          /* @__PURE__ */ o(ht, { htmlFor: "checkout-email", children: "Email" }),
          /* @__PURE__ */ o(
            Ye,
            {
              id: "checkout-email",
              value: n.values.email ?? "",
              onChange: (h) => n.setField("email", h.target.value),
              placeholder: "you@company.com",
              "aria-invalid": !!n.fieldErrors.email,
              required: i.email === "required"
            }
          ),
          /* @__PURE__ */ o(Ya, { message: n.fieldErrors.email })
        ] }) : null,
        i.name !== "none" ? /* @__PURE__ */ d("div", { className: "grid gap-2", children: [
          /* @__PURE__ */ o(ht, { htmlFor: "checkout-name", children: "Name" }),
          /* @__PURE__ */ o(
            Ye,
            {
              id: "checkout-name",
              value: n.values.name ?? "",
              onChange: (h) => n.setField("name", h.target.value),
              placeholder: "Full name",
              "aria-invalid": !!n.fieldErrors.name,
              required: i.name === "required"
            }
          ),
          /* @__PURE__ */ o(Ya, { message: n.fieldErrors.name })
        ] }) : null,
        i.phone !== "none" ? /* @__PURE__ */ d("div", { className: "grid gap-2", children: [
          /* @__PURE__ */ o(ht, { htmlFor: "checkout-phone", children: "Phone" }),
          /* @__PURE__ */ o(
            Ye,
            {
              id: "checkout-phone",
              value: n.values.phone ?? "",
              onChange: (h) => n.setField("phone", h.target.value),
              placeholder: "Phone number",
              "aria-invalid": !!n.fieldErrors.phone,
              required: i.phone === "required"
            }
          ),
          /* @__PURE__ */ o(Ya, { message: n.fieldErrors.phone })
        ] }) : null
      ] })
    ] }) : null,
    s ? /* @__PURE__ */ o(
      _i,
      {
        title: "Shipping address",
        value: u,
        onChange: (h) => n.setField("shippingAddress", h),
        errors: {
          line1: n.fieldErrors["shippingAddress.line1"],
          city: n.fieldErrors["shippingAddress.city"],
          postalCode: n.fieldErrors["shippingAddress.postalCode"],
          country: n.fieldErrors["shippingAddress.country"]
        }
      }
    ) : null,
    s && m.methods.length ? /* @__PURE__ */ o(
      hp,
      {
        methods: m.methods,
        value: n.values.shippingMethodId,
        onChange: (h) => n.setField("shippingMethodId", h),
        currency: t.currency
      }
    ) : null,
    a === "full" ? /* @__PURE__ */ o(
      _i,
      {
        title: "Billing address",
        value: p,
        onChange: (h) => n.setField("billingAddress", h)
      }
    ) : null,
    t.checkout.allowTipping ? /* @__PURE__ */ d("section", { className: "space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950", children: [
      /* @__PURE__ */ o("div", { className: "text-sm font-semibold text-neutral-950 dark:text-neutral-50", children: "Tip" }),
      /* @__PURE__ */ d("div", { className: "grid gap-2", children: [
        /* @__PURE__ */ d(ht, { htmlFor: "checkout-tip", children: [
          "Tip amount (",
          t.currency,
          ")"
        ] }),
        /* @__PURE__ */ o(
          Ye,
          {
            id: "checkout-tip",
            inputMode: "decimal",
            value: String(n.values.tipAmount ?? 0),
            onChange: (h) => n.setField("tipAmount", Number(h.target.value) || 0)
          }
        )
      ] })
    ] }) : null,
    a === "full" ? /* @__PURE__ */ d("section", { className: "space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950", children: [
      /* @__PURE__ */ o("div", { className: "text-sm font-semibold text-neutral-950 dark:text-neutral-50", children: "Notes" }),
      /* @__PURE__ */ d("div", { className: "grid gap-2", children: [
        /* @__PURE__ */ o(ht, { htmlFor: "checkout-notes", children: "Order notes (optional)" }),
        /* @__PURE__ */ o(
          Ye,
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
function yp() {
  if (typeof window > "u")
    return !1;
  const e = window, t = [
    "phantom",
    "solflare",
    "backpack",
    "glow",
    "slope",
    "sollet",
    "coin98",
    "clover",
    "mathWallet",
    "ledger",
    "torus",
    "walletconnect"
  ];
  for (const n of t) {
    const r = e[n];
    if (r && typeof r == "object" && "solana" in r && r.solana)
      return !0;
  }
  return !!e.solana;
}
const VC = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  detectSolanaWallets: yp
}, Symbol.toStringTag, { value: "Module" }));
function HC(e) {
  return /* @__PURE__ */ d("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", ...e, children: [
    /* @__PURE__ */ o("circle", { cx: "12", cy: "12", r: "10" }),
    /* @__PURE__ */ o("line", { x1: "12", y1: "8", x2: "12", y2: "12" }),
    /* @__PURE__ */ o("line", { x1: "12", y1: "16", x2: "12.01", y2: "16" })
  ] });
}
function qC(e) {
  return /* @__PURE__ */ d("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", ...e, children: [
    /* @__PURE__ */ o("path", { d: "M3 6h18" }),
    /* @__PURE__ */ o("path", { d: "M8 6V4h8v2" }),
    /* @__PURE__ */ o("path", { d: "M6 6l1 16h10l1-16" })
  ] });
}
function vp({
  open: e,
  onOpenChange: t,
  issues: n,
  onRemoveItem: r,
  onUpdateQuantity: a,
  onGoToCart: i,
  className: s
}) {
  const c = n.some(
    (l) => l.type === "out_of_stock" || l.type === "product_unavailable"
  );
  return /* @__PURE__ */ o(os, { open: e, onOpenChange: t, children: /* @__PURE__ */ d(na, { className: Z("sm:max-w-lg", s), children: [
    /* @__PURE__ */ d(is, { children: [
      /* @__PURE__ */ d(ra, { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ o(HC, { className: "h-5 w-5 text-amber-500" }),
        "Inventory Update"
      ] }),
      /* @__PURE__ */ o(ss, { children: c ? "Some items in your cart are no longer available." : "Some items in your cart have limited availability." })
    ] }),
    /* @__PURE__ */ o("div", { className: "my-4 divide-y divide-neutral-200 dark:divide-neutral-800", children: n.map((l) => /* @__PURE__ */ o(
      ZC,
      {
        issue: l,
        onRemove: () => r(l.productId, l.variantId),
        onUpdateQty: (u) => a(l.productId, l.variantId, u)
      },
      `${l.productId}::${l.variantId ?? ""}`
    )) }),
    /* @__PURE__ */ d(fm, { className: "flex-col gap-2 sm:flex-row", children: [
      i ? /* @__PURE__ */ o(
        le,
        {
          type: "button",
          variant: "outline",
          onClick: () => {
            t(!1), i();
          },
          children: "Go to Cart"
        }
      ) : null,
      /* @__PURE__ */ o(
        le,
        {
          type: "button",
          onClick: () => t(!1),
          children: "Continue"
        }
      )
    ] })
  ] }) });
}
function ZC({
  issue: e,
  onRemove: t,
  onUpdateQty: n
}) {
  const r = e.type === "out_of_stock" || e.type === "product_unavailable";
  return /* @__PURE__ */ d("div", { className: "flex items-start gap-3 py-3", children: [
    /* @__PURE__ */ d("div", { className: "min-w-0 flex-1", children: [
      /* @__PURE__ */ o("div", { className: "text-sm font-medium text-neutral-900 dark:text-neutral-100", children: e.title }),
      /* @__PURE__ */ o(
        "div",
        {
          className: Z(
            "mt-0.5 text-sm",
            r ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"
          ),
          children: e.message
        }
      ),
      e.type === "insufficient_stock" && e.availableQty > 0 ? /* @__PURE__ */ d("div", { className: "mt-1 text-xs text-neutral-500 dark:text-neutral-400", children: [
        "You requested ",
        e.requestedQty,
        ", but only ",
        e.availableQty,
        " available"
      ] }) : null
    ] }),
    /* @__PURE__ */ d("div", { className: "flex shrink-0 items-center gap-2", children: [
      e.type === "insufficient_stock" && e.availableQty > 0 ? /* @__PURE__ */ d(
        le,
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
      /* @__PURE__ */ d(
        le,
        {
          type: "button",
          size: "sm",
          variant: "ghost",
          className: "text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/30 dark:hover:text-red-300",
          onClick: t,
          children: [
            /* @__PURE__ */ o(qC, { className: "h-4 w-4" }),
            /* @__PURE__ */ o("span", { className: "sr-only", children: "Remove" })
          ]
        }
      )
    ] })
  ] });
}
function bp({
  className: e,
  ctaLabel: t,
  renderEmbedded: n,
  embeddedFallback: r,
  renderCustom: a,
  customFallback: i
}) {
  const { config: s } = je(), c = jt(), l = Bo(), { config: u, isLoading: p } = gd(), [m, h] = y.useState(!1);
  y.useEffect(() => {
    h(yp());
  }, []);
  const g = hd({ items: c.items }), [v, f] = y.useState(!1), b = y.useMemo(
    () => s.checkout.paymentMethods && s.checkout.paymentMethods.length ? s.checkout.paymentMethods : [{ id: "card", label: "Card", ctaLabel: "Pay now" }],
    [s.checkout.paymentMethods]
  ), k = y.useMemo(() => b.filter((L) => !(L.id === "card" && !u.card || L.id === "crypto" && !u.crypto || L.id === "credits" && !u.credits || L.id === "crypto" && !m)), [m, b, u]), [w, _] = y.useState((k[0] ?? b[0]).id);
  y.useEffect(() => {
    k.length && (k.some((P) => P.id === w) || _(k[0].id));
  }, [w, k]), y.useEffect(() => {
    l.reset();
  }, [w]);
  const x = k.find((P) => P.id === w) ?? b.find((P) => P.id === w) ?? b[0], N = x.description ?? (w === "crypto" ? "Pay using a connected wallet." : void 0), I = w === "crypto" && !m, S = p || l.status === "validating" || l.status === "creating_session" || l.status === "redirecting" || g.isVerifying, A = t ?? x.ctaLabel ?? (s.checkout.mode === "none" ? "Continue to payment" : "Pay now"), W = y.useCallback(
    async (P) => {
      const L = await g.verify();
      if (!L.ok && L.issues.length > 0) {
        f(!0);
        return;
      }
      l.createCheckoutSession({ paymentMethodId: P });
    },
    [l, g]
  ), C = l.session?.kind === "embedded" ? l.session : null, T = l.session?.kind === "custom" ? l.session : null;
  return /* @__PURE__ */ d("div", { className: Z("space-y-3", e), children: [
    k.length > 1 ? /* @__PURE__ */ d("div", { className: "space-y-2", children: [
      /* @__PURE__ */ o("div", { className: "text-xs font-medium text-neutral-600 dark:text-neutral-400", children: "Payment method" }),
      /* @__PURE__ */ o(gs, { value: w, onValueChange: _, children: /* @__PURE__ */ o(ma, { className: "w-full", children: k.map((P) => /* @__PURE__ */ o($r, { value: P.id, className: "flex-1", disabled: S, children: P.label }, P.id)) }) })
    ] }) : null,
    l.error ? /* @__PURE__ */ o("div", { className: "rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200", children: l.error }) : null,
    T ? /* @__PURE__ */ o("div", { className: "space-y-3", children: a ? a(T) : i ?? /* @__PURE__ */ o("div", { className: "rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900/40 dark:text-neutral-300", children: "Checkout session created. Provide `renderCustom` to render a custom payment UI." }) }) : C ? /* @__PURE__ */ o("div", { className: "space-y-3", children: n ? n(C) : r ?? /* @__PURE__ */ o("div", { className: "rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900/40 dark:text-neutral-300", children: "Embedded checkout session created. Provide `renderEmbedded` to render your payment UI." }) }) : /* @__PURE__ */ o(
      le,
      {
        type: "button",
        className: "w-full",
        disabled: c.items.length === 0 || S || I,
        onClick: () => {
          W(w);
        },
        children: g.isVerifying ? "Checking availability…" : S ? "Processing…" : A
      }
    ),
    !C && !T ? /* @__PURE__ */ o("p", { className: "text-xs text-neutral-500 dark:text-neutral-400", children: I ? "Install a browser wallet to enable crypto payments." : N ?? "You will be redirected to complete your payment." }) : null,
    /* @__PURE__ */ o(
      vp,
      {
        open: v,
        onOpenChange: (P) => {
          f(P), P || g.reset();
        },
        issues: g.result?.issues ?? [],
        onRemoveItem: (P, L) => {
          c.removeItem(P, L);
        },
        onUpdateQuantity: (P, L, F) => {
          c.setQty(P, L, F);
        }
      }
    )
  ] });
}
function wp({ className: e }) {
  const { config: t } = je(), n = jt(), r = Bo(), { settings: a } = ar(), i = (t.checkout.allowPromoCodes ?? !1) && a.checkout.promoCodes;
  return /* @__PURE__ */ d(
    "div",
    {
      className: Z(
        "rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950",
        e
      ),
      children: [
        /* @__PURE__ */ o("div", { className: "text-sm font-semibold text-neutral-950 dark:text-neutral-50", children: "Order review" }),
        /* @__PURE__ */ o(Et, { className: "my-3" }),
        /* @__PURE__ */ o("div", { className: "space-y-3", children: n.items.map((s) => /* @__PURE__ */ d("div", { className: "flex items-center justify-between gap-3", children: [
          /* @__PURE__ */ d("div", { className: "flex min-w-0 items-center gap-3", children: [
            /* @__PURE__ */ o("div", { className: "h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900", children: s.imageSnapshot ? /* @__PURE__ */ o("img", { src: s.imageSnapshot, alt: s.titleSnapshot, className: "h-full w-full object-cover" }) : null }),
            /* @__PURE__ */ d("div", { className: "min-w-0", children: [
              /* @__PURE__ */ o("div", { className: "line-clamp-1 text-sm text-neutral-950 dark:text-neutral-50", children: s.titleSnapshot }),
              /* @__PURE__ */ d("div", { className: "text-xs text-neutral-600 dark:text-neutral-400", children: [
                "Qty ",
                s.qty
              ] })
            ] })
          ] }),
          /* @__PURE__ */ o("div", { className: "text-sm font-semibold tabular-nums text-neutral-950 dark:text-neutral-50", children: rt({ amount: s.unitPrice * s.qty, currency: s.currency }) })
        ] }, `${s.productId}::${s.variantId ?? ""}`)) }),
        /* @__PURE__ */ o(Et, { className: "my-3" }),
        i ? /* @__PURE__ */ o(
          Ns,
          {
            value: r.values.discountCode ?? n.promoCode,
            onApply: (s) => {
              r.setField("discountCode", s ?? ""), n.setPromoCode(s);
            }
          }
        ) : null,
        i ? /* @__PURE__ */ o(Et, { className: "my-3" }) : null,
        /* @__PURE__ */ d("div", { className: "flex items-center justify-between text-sm", children: [
          /* @__PURE__ */ o("span", { className: "text-neutral-600 dark:text-neutral-400", children: "Subtotal" }),
          /* @__PURE__ */ o("span", { className: "font-semibold text-neutral-950 dark:text-neutral-50", children: rt({ amount: n.subtotal, currency: t.currency }) })
        ] })
      ]
    }
  );
}
function ga({
  result: e,
  onContinueShopping: t,
  onViewOrders: n,
  className: r
}) {
  return e.kind === "idle" ? null : e.kind === "success" ? /* @__PURE__ */ d(
    "div",
    {
      className: Z(
        "rounded-2xl border border-neutral-200 bg-white p-8 text-neutral-950 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50",
        r
      ),
      children: [
        /* @__PURE__ */ o("div", { className: "text-sm font-semibold text-neutral-600 dark:text-neutral-400", children: "Receipt" }),
        /* @__PURE__ */ o("h2", { className: "mt-2 text-2xl font-semibold", children: "Payment successful" }),
        /* @__PURE__ */ o("p", { className: "mt-2 text-sm text-neutral-600 dark:text-neutral-400", children: "Thanks for your purchase. You’ll receive a confirmation email shortly." }),
        e.order ? /* @__PURE__ */ d("div", { className: "mt-5 rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/40", children: [
          /* @__PURE__ */ d("div", { className: "flex items-start justify-between gap-3", children: [
            /* @__PURE__ */ d("div", { children: [
              /* @__PURE__ */ d("div", { className: "text-sm font-semibold text-neutral-950 dark:text-neutral-50", children: [
                "Order ",
                e.order.id
              ] }),
              /* @__PURE__ */ d("div", { className: "mt-1 text-xs text-neutral-600 dark:text-neutral-400", children: [
                new Date(e.order.createdAt).toLocaleString(),
                " · ",
                e.order.status
              ] })
            ] }),
            /* @__PURE__ */ o("div", { className: "text-sm font-semibold", children: rt({ amount: e.order.total, currency: e.order.currency }) })
          ] }),
          /* @__PURE__ */ d("div", { className: "mt-3 space-y-2", children: [
            e.order.items.slice(0, 4).map((a, i) => /* @__PURE__ */ d("div", { className: "flex items-center justify-between gap-3 text-sm", children: [
              /* @__PURE__ */ o("div", { className: "min-w-0 truncate", children: a.title }),
              /* @__PURE__ */ d("div", { className: "shrink-0 text-neutral-600 dark:text-neutral-400", children: [
                "Qty ",
                a.qty
              ] })
            ] }, `${a.title}-${i}`)),
            e.order.items.length > 4 ? /* @__PURE__ */ d("div", { className: "text-xs text-neutral-600 dark:text-neutral-400", children: [
              "+",
              e.order.items.length - 4,
              " more item(s)"
            ] }) : null
          ] }),
          /* @__PURE__ */ d("div", { className: "mt-3 flex gap-3 text-sm", children: [
            e.order.receiptUrl ? /* @__PURE__ */ o("a", { href: e.order.receiptUrl, className: "hover:underline", children: "Receipt" }) : null,
            e.order.invoiceUrl ? /* @__PURE__ */ o("a", { href: e.order.invoiceUrl, className: "hover:underline", children: "Invoice" }) : null
          ] })
        ] }) : e.orderId ? /* @__PURE__ */ d("p", { className: "mt-4 text-xs text-neutral-500 dark:text-neutral-400", children: [
          "Session/Order ID: ",
          /* @__PURE__ */ o("span", { className: "font-mono", children: e.orderId })
        ] }) : null,
        /* @__PURE__ */ d("div", { className: "mt-6 flex flex-col gap-2 sm:flex-row", children: [
          t ? /* @__PURE__ */ o(le, { type: "button", onClick: t, children: "Continue shopping" }) : null,
          n ? /* @__PURE__ */ o(le, { type: "button", variant: "outline", onClick: n, children: "View orders" }) : null
        ] })
      ]
    }
  ) : e.kind === "cancel" ? /* @__PURE__ */ d(
    "div",
    {
      className: Z(
        "rounded-2xl border border-neutral-200 bg-white p-8 text-neutral-950 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50",
        r
      ),
      children: [
        /* @__PURE__ */ o("h2", { className: "text-2xl font-semibold", children: "Checkout cancelled" }),
        /* @__PURE__ */ o("p", { className: "mt-2 text-sm text-neutral-600 dark:text-neutral-400", children: "No charges were made. You can continue shopping and try again." }),
        t ? /* @__PURE__ */ o("div", { className: "mt-6", children: /* @__PURE__ */ o(le, { type: "button", onClick: t, children: "Back to shop" }) }) : null
      ]
    }
  ) : /* @__PURE__ */ d(
    "div",
    {
      className: Z(
        "rounded-2xl border border-neutral-200 bg-white p-8 text-neutral-950 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50",
        r
      ),
      children: [
        /* @__PURE__ */ o("h2", { className: "text-2xl font-semibold", children: "Payment failed" }),
        /* @__PURE__ */ o("p", { className: "mt-2 text-sm text-neutral-600 dark:text-neutral-400", children: e.message ?? "Something went wrong while processing your payment." }),
        t ? /* @__PURE__ */ o("div", { className: "mt-6", children: /* @__PURE__ */ o(le, { type: "button", onClick: t, children: "Back to shop" }) }) : null
      ]
    }
  );
}
function GC({
  onContinueShopping: e,
  onViewOrders: t,
  className: n,
  receiptClassName: r
}) {
  const a = Di();
  return a.kind === "idle" ? /* @__PURE__ */ o(
    "div",
    {
      className: Z(
        "flex min-h-[50vh] items-center justify-center p-4",
        n
      ),
      children: /* @__PURE__ */ o("div", { className: "text-center text-neutral-600 dark:text-neutral-400", children: "Loading order details..." })
    }
  ) : /* @__PURE__ */ o(
    "div",
    {
      className: Z(
        "flex min-h-[50vh] items-center justify-center p-4",
        n
      ),
      children: /* @__PURE__ */ o(
        ga,
        {
          result: a,
          onContinueShopping: e,
          onViewOrders: t,
          className: Z("w-full max-w-lg", r)
        }
      )
    }
  );
}
function QC({
  onContinueShopping: e,
  className: t,
  receiptClassName: n
}) {
  const r = { kind: "cancel" };
  return /* @__PURE__ */ o(
    "div",
    {
      className: Z(
        "flex min-h-[50vh] items-center justify-center p-4",
        t
      ),
      children: /* @__PURE__ */ o(
        ga,
        {
          result: r,
          onContinueShopping: e,
          className: Z("w-full max-w-lg", n)
        }
      )
    }
  );
}
function YC(e) {
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
function _p({
  order: e,
  onView: t,
  className: n
}) {
  const r = `${e.items.length} item${e.items.length === 1 ? "" : "s"}`, a = new Date(e.createdAt).toLocaleString(void 0, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }), i = e.status.charAt(0).toUpperCase() + e.status.slice(1);
  return /* @__PURE__ */ o(
    zt,
    {
      className: Z(
        "group overflow-hidden rounded-2xl border-neutral-200/70 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-neutral-800 dark:bg-neutral-950",
        n
      ),
      children: /* @__PURE__ */ o(Jt, { className: "p-5", children: /* @__PURE__ */ d("div", { className: "grid grid-cols-[1fr_auto] gap-x-4 gap-y-2", children: [
        /* @__PURE__ */ d("div", { className: "min-w-0", children: [
          /* @__PURE__ */ d("div", { className: "flex flex-wrap items-center gap-x-2 gap-y-1", children: [
            /* @__PURE__ */ o("span", { className: "text-sm font-semibold text-neutral-950 dark:text-neutral-50", children: "Order" }),
            /* @__PURE__ */ o("span", { className: "truncate font-mono text-sm font-semibold text-neutral-950/80 dark:text-neutral-50/80", children: e.id })
          ] }),
          /* @__PURE__ */ o("div", { className: "mt-0.5 text-xs text-neutral-600 dark:text-neutral-400", children: a })
        ] }),
        /* @__PURE__ */ o("div", { className: "flex items-start justify-end", children: /* @__PURE__ */ o(Tn, { variant: YC(e.status), className: "capitalize", children: i }) }),
        /* @__PURE__ */ o("div", { className: "text-sm text-neutral-600 dark:text-neutral-400", children: r }),
        /* @__PURE__ */ o("div", { className: "text-right text-sm font-semibold text-neutral-950 dark:text-neutral-50", children: rt({ amount: e.total, currency: e.currency }) }),
        /* @__PURE__ */ d("div", { className: "col-span-2 mt-3 flex items-center justify-between gap-3 border-t border-neutral-200/70 pt-3 dark:border-neutral-800", children: [
          /* @__PURE__ */ d("div", { className: "flex items-center gap-1", children: [
            e.receiptUrl ? /* @__PURE__ */ o(le, { asChild: !0, type: "button", variant: "ghost", size: "sm", className: "h-8 px-2", children: /* @__PURE__ */ o("a", { href: e.receiptUrl, target: "_blank", rel: "noreferrer", children: "Receipt" }) }) : null,
            e.invoiceUrl ? /* @__PURE__ */ o(le, { asChild: !0, type: "button", variant: "ghost", size: "sm", className: "h-8 px-2", children: /* @__PURE__ */ o("a", { href: e.invoiceUrl, target: "_blank", rel: "noreferrer", children: "Invoice" }) }) : null
          ] }),
          t ? /* @__PURE__ */ o(
            le,
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
function xp({
  orders: e,
  onView: t,
  className: n
}) {
  return /* @__PURE__ */ o("div", { className: Z("grid gap-4", n), children: e.map((r) => /* @__PURE__ */ o(_p, { order: r, onView: t }, r.id)) });
}
function KC(e) {
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
function kp({
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
  }), a = e.status.charAt(0).toUpperCase() + e.status.slice(1);
  return /* @__PURE__ */ o(
    zt,
    {
      className: Z(
        "overflow-hidden rounded-2xl border-neutral-200/70 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950",
        n
      ),
      children: /* @__PURE__ */ d(Jt, { className: "p-6", children: [
        /* @__PURE__ */ d("div", { className: "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between", children: [
          /* @__PURE__ */ d("div", { className: "min-w-0", children: [
            /* @__PURE__ */ d("div", { className: "flex flex-wrap items-center gap-x-2 gap-y-1", children: [
              /* @__PURE__ */ o("span", { className: "text-sm font-semibold text-neutral-950 dark:text-neutral-50", children: "Order" }),
              /* @__PURE__ */ o("span", { className: "truncate font-mono text-sm font-semibold text-neutral-950/80 dark:text-neutral-50/80", children: e.id })
            ] }),
            /* @__PURE__ */ d("div", { className: "mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-600 dark:text-neutral-400", children: [
              /* @__PURE__ */ o("span", { children: r }),
              /* @__PURE__ */ o("span", { className: "text-neutral-300 dark:text-neutral-700", children: "·" }),
              /* @__PURE__ */ o("span", { children: a })
            ] })
          ] }),
          /* @__PURE__ */ d("div", { className: "flex items-center gap-2 sm:justify-end", children: [
            /* @__PURE__ */ o(Tn, { variant: KC(e.status), className: "capitalize", children: a }),
            t ? /* @__PURE__ */ o(le, { type: "button", variant: "outline", size: "sm", className: "h-8", onClick: t, children: "Back" }) : null
          ] })
        ] }),
        /* @__PURE__ */ o(Et, { className: "my-5" }),
        /* @__PURE__ */ o("div", { className: "space-y-3", children: e.items.map((i, s) => /* @__PURE__ */ d("div", { className: "flex items-start justify-between gap-4", children: [
          /* @__PURE__ */ d("div", { className: "min-w-0", children: [
            /* @__PURE__ */ o("div", { className: "truncate text-sm text-neutral-950 dark:text-neutral-50", children: i.title }),
            /* @__PURE__ */ d("div", { className: "mt-0.5 text-xs text-neutral-600 dark:text-neutral-400", children: [
              "Qty ",
              i.qty
            ] })
          ] }),
          /* @__PURE__ */ o("div", { className: "text-right text-sm font-semibold text-neutral-950 dark:text-neutral-50", children: rt({ amount: i.unitPrice * i.qty, currency: i.currency }) })
        ] }, `${i.title}-${s}`)) }),
        /* @__PURE__ */ o(Et, { className: "my-5" }),
        /* @__PURE__ */ d("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ o("span", { className: "text-sm text-neutral-600 dark:text-neutral-400", children: "Total" }),
          /* @__PURE__ */ o("span", { className: "text-sm font-semibold text-neutral-950 dark:text-neutral-50", children: rt({ amount: e.total, currency: e.currency }) })
        ] }),
        e.receiptUrl || e.invoiceUrl ? /* @__PURE__ */ d("div", { className: "mt-5 flex flex-wrap items-center gap-2", children: [
          e.receiptUrl ? /* @__PURE__ */ o(le, { asChild: !0, type: "button", variant: "ghost", size: "sm", className: "h-8 px-2", children: /* @__PURE__ */ o("a", { href: e.receiptUrl, target: "_blank", rel: "noreferrer", children: "Receipt" }) }) : null,
          e.invoiceUrl ? /* @__PURE__ */ o(le, { asChild: !0, type: "button", variant: "ghost", size: "sm", className: "h-8 px-2", children: /* @__PURE__ */ o("a", { href: e.invoiceUrl, target: "_blank", rel: "noreferrer", children: "Invoice" }) }) : null
        ] }) : null
      ] })
    }
  );
}
function As(e) {
  const t = {};
  e.shippingProfile && (t.shippingProfile = e.shippingProfile), e.checkoutRequirements && (t.checkoutRequirements = JSON.stringify(e.checkoutRequirements)), e.fulfillment?.type && (t.fulfillmentType = e.fulfillment.type), e.fulfillment?.notes && (t.fulfillmentNotes = e.fulfillment.notes);
  const n = e.attributes?.shippingCountries;
  return typeof n == "string" && n.trim() && (t.shippingCountries = n), Object.keys(t).length ? t : void 0;
}
function JC(e) {
  return /* @__PURE__ */ o("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", ...e, children: /* @__PURE__ */ o("path", { d: "M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" }) });
}
const XC = {
  shop: "/shop",
  category: (e) => `/shop/${e}`,
  product: (e) => `/product/${e}`,
  cart: "/cart",
  checkout: "/checkout",
  orders: "/account/orders",
  subscribe: "/subscribe"
};
function eN(e) {
  const t = /* @__PURE__ */ new Set();
  let n = Number.POSITIVE_INFINITY, r = 0;
  for (const s of e) {
    for (const c of s.tags ?? []) t.add(c);
    n = Math.min(n, s.price), r = Math.max(r, s.price);
  }
  const a = Array.from(t).slice(0, 12), i = Number.isFinite(n) ? { min: n, max: r } : void 0;
  return { tags: a, price: i };
}
function tN({
  className: e,
  routes: t,
  initialCategorySlug: n
}) {
  const { config: r } = je(), a = jt(), i = pa(), s = { ...XC, ...t }, [c, l] = y.useState("cart"), [u, p] = y.useState(() => typeof window > "u" ? !1 : window.matchMedia?.("(min-width: 1024px)")?.matches ?? !1);
  y.useEffect(() => {
    if (typeof window > "u") return;
    const B = window.matchMedia?.("(min-width: 1024px)");
    if (!B) return;
    const ee = () => p(B.matches);
    return ee(), B.addEventListener?.("change", ee), () => B.removeEventListener?.("change", ee);
  }, []);
  const { categories: m, isLoading: h, error: g } = Oi(), v = y.useMemo(() => Li({ includeCategory: !0 }), []), [f, b] = y.useState(v?.search ?? ""), [k, w] = y.useState(
    n ?? v?.category
  ), [_, x] = y.useState(v?.page ?? 1), [N, I] = y.useState(v?.sort ?? "featured"), [S, A] = y.useState(v?.filters ?? {}), { data: W, isLoading: C, error: T } = jo({
    category: k,
    search: f.trim() || void 0,
    filters: S,
    sort: N,
    page: _,
    pageSize: 24
  }), P = y.useMemo(() => eN(W?.items ?? []), [W?.items]), { settings: L } = ar(), F = L.catalog.filters, $ = L.catalog.sort, M = y.useMemo(() => {
    const B = [];
    return $.featured && B.push({ value: "featured", label: "Featured" }), $.priceAsc && B.push({ value: "price_asc", label: "Price: Low to High" }), $.priceDesc && B.push({ value: "price_desc", label: "Price: High to Low" }), B.length === 0 && B.push({ value: "featured", label: "Featured" }), B;
  }, [$]);
  y.useEffect(() => {
    M.some((B) => B.value === N) || I(M[0].value);
  }, [M, N]), $i(
    {
      search: f,
      sort: N,
      page: _,
      category: k,
      filters: S
    },
    { includeCategory: !0 }
  );
  const [D, O] = y.useState(!1), [V, E] = y.useState(!1), [q, re] = y.useState(null), [j, X] = y.useState(!1), te = (B) => {
    w(B.slug), x(1), O(!1);
  }, ve = y.useCallback(
    (B, ee, fe) => {
      a.addItem(
        {
          productId: B.id,
          variantId: ee?.id,
          unitPrice: B.price,
          currency: B.currency,
          titleSnapshot: ee ? `${B.title} — ${ee.title}` : B.title,
          imageSnapshot: B.images[0]?.url,
          paymentResource: B.id,
          metadata: As(B)
        },
        fe
      ), i?.toast({
        title: "Added to cart",
        description: B.title,
        actionLabel: "View cart",
        onAction: () => {
          typeof window < "u" && (window.matchMedia?.("(min-width: 1024px)").matches ? window.location.assign(s.cart) : (l("cart"), E(!0)));
        }
      });
    },
    [a, s.cart, i]
  );
  return /* @__PURE__ */ d("div", { className: Z("min-h-screen bg-neutral-50 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50", e), children: [
    /* @__PURE__ */ o("header", { className: "sticky top-0 z-40 border-b border-neutral-200 bg-neutral-50/80 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/70", children: /* @__PURE__ */ d("div", { className: "mx-auto flex max-w-7xl items-center gap-3 px-4 py-3", children: [
      /* @__PURE__ */ o("a", { href: s.shop, className: "text-sm font-semibold tracking-tight", children: r.brand?.name ?? "Shop" }),
      /* @__PURE__ */ o("div", { className: "flex-1", children: /* @__PURE__ */ o(ks, { value: f, onChange: b }) }),
      /* @__PURE__ */ d("div", { className: "flex items-center gap-2 lg:hidden", children: [
        /* @__PURE__ */ d(oa, { open: D, onOpenChange: O, children: [
          /* @__PURE__ */ o(aa, { asChild: !0, children: /* @__PURE__ */ o(le, { type: "button", variant: "outline", children: "Filters" }) }),
          /* @__PURE__ */ d(Br, { side: "left", children: [
            /* @__PURE__ */ o(ia, { children: /* @__PURE__ */ o(sa, { children: "Browse" }) }),
            /* @__PURE__ */ d("div", { className: "mt-4", children: [
              g ? /* @__PURE__ */ o(Kt, { description: g }) : null,
              h ? /* @__PURE__ */ d("div", { className: "space-y-2", children: [
                /* @__PURE__ */ o(Ve, { className: "h-9" }),
                /* @__PURE__ */ o(Ve, { className: "h-9" }),
                /* @__PURE__ */ o(Ve, { className: "h-9" })
              ] }) : /* @__PURE__ */ d("div", { className: "space-y-6", children: [
                /* @__PURE__ */ o(wi, { categories: m, activeSlug: k, onSelect: te }),
                /* @__PURE__ */ o(
                  Po,
                  {
                    facets: P,
                    value: S,
                    onChange: (B) => {
                      A(B), x(1);
                    },
                    onClear: () => {
                      A({}), x(1);
                    },
                    enabledFilters: F
                  }
                ),
                M.length > 1 && /* @__PURE__ */ d("div", { className: "space-y-2", children: [
                  /* @__PURE__ */ o("div", { className: "text-sm font-semibold", children: "Sort" }),
                  /* @__PURE__ */ d(
                    Co,
                    {
                      value: N,
                      onValueChange: (B) => {
                        I(B), x(1);
                      },
                      children: [
                        /* @__PURE__ */ o(Mr, { "aria-label": "Sort", children: /* @__PURE__ */ o(No, { placeholder: "Sort" }) }),
                        /* @__PURE__ */ o(Dr, { children: M.map((B) => /* @__PURE__ */ o(Lr, { value: B.value, children: B.label }, B.value)) })
                      ]
                    }
                  )
                ] })
              ] })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ o(
          zr,
          {
            open: !u && V,
            onOpenChange: E,
            side: "bottom",
            preferredTab: c,
            onCheckout: () => {
              typeof window < "u" && window.location.assign(s.checkout);
            },
            trigger: /* @__PURE__ */ d(
              le,
              {
                type: "button",
                variant: "default",
                onClick: () => l("cart"),
                children: [
                  "Cart (",
                  a.count,
                  ")"
                ]
              }
            )
          }
        )
      ] }),
      /* @__PURE__ */ d("div", { className: "hidden lg:flex items-center gap-2", children: [
        /* @__PURE__ */ o(
          zr,
          {
            open: u && V,
            onOpenChange: E,
            side: "popup",
            preferredTab: c,
            onCheckout: () => {
              typeof window < "u" && window.location.assign(s.checkout);
            },
            trigger: /* @__PURE__ */ d(
              le,
              {
                type: "button",
                variant: "outline",
                onClick: () => l("cart"),
                children: [
                  "Cart (",
                  a.count,
                  ")"
                ]
              }
            )
          }
        ),
        /* @__PURE__ */ o(
          le,
          {
            type: "button",
            variant: "default",
            onClick: () => {
              typeof window < "u" && window.location.assign(s.checkout);
            },
            children: "Checkout"
          }
        )
      ] })
    ] }) }),
    /* @__PURE__ */ d(
      le,
      {
        type: "button",
        variant: "ghost",
        className: Z(
          "fixed bottom-4 right-4 z-30 hidden items-center gap-2 rounded-full border border-neutral-200 bg-white/90 px-3 py-2 text-xs font-medium text-neutral-900 shadow-sm backdrop-blur hover:bg-white dark:border-neutral-800 dark:bg-neutral-950/80 dark:text-neutral-50 dark:hover:bg-neutral-950 lg:flex",
          V ? "lg:hidden" : void 0
        ),
        onClick: () => {
          l("chat"), E(!0);
        },
        "aria-label": "Open chat",
        children: [
          /* @__PURE__ */ o(JC, { className: "h-4 w-4" }),
          "Chat"
        ]
      }
    ),
    /* @__PURE__ */ d("main", { className: "mx-auto grid max-w-7xl items-start gap-6 px-4 py-6 lg:grid-cols-[280px_1fr]", children: [
      /* @__PURE__ */ o("aside", { className: "hidden lg:block", children: /* @__PURE__ */ o("div", { className: "sticky top-24", children: /* @__PURE__ */ d(zt, { className: "flex max-h-[calc(100vh-6rem)] flex-col rounded-2xl", children: [
        /* @__PURE__ */ o(Er, { className: "pb-4", children: /* @__PURE__ */ o(Ir, { className: "text-base", children: "Browse" }) }),
        /* @__PURE__ */ d(Jt, { className: "flex-1 space-y-6 overflow-y-auto pr-2", children: [
          /* @__PURE__ */ d("div", { children: [
            /* @__PURE__ */ o("div", { className: "text-sm font-semibold", children: "Categories" }),
            g ? /* @__PURE__ */ o(Kt, { className: "mt-3", description: g }) : null,
            h ? /* @__PURE__ */ d("div", { className: "mt-3 space-y-2", children: [
              /* @__PURE__ */ o(Ve, { className: "h-9" }),
              /* @__PURE__ */ o(Ve, { className: "h-9" }),
              /* @__PURE__ */ o(Ve, { className: "h-9" })
            ] }) : /* @__PURE__ */ o("div", { className: "mt-3", children: /* @__PURE__ */ o(wi, { categories: m, activeSlug: k, onSelect: te }) })
          ] }),
          M.length > 1 && /* @__PURE__ */ d("div", { children: [
            /* @__PURE__ */ o("div", { className: "text-sm font-semibold", children: "Sort" }),
            /* @__PURE__ */ o("div", { className: "mt-2", children: /* @__PURE__ */ d(
              Co,
              {
                value: N,
                onValueChange: (B) => {
                  I(B), x(1);
                },
                children: [
                  /* @__PURE__ */ o(Mr, { "aria-label": "Sort", children: /* @__PURE__ */ o(No, { placeholder: "Sort" }) }),
                  /* @__PURE__ */ o(Dr, { children: M.map((B) => /* @__PURE__ */ o(Lr, { value: B.value, children: B.label }, B.value)) })
                ]
              }
            ) })
          ] }),
          /* @__PURE__ */ o(
            Po,
            {
              facets: P,
              value: S,
              onChange: (B) => {
                A(B), x(1);
              },
              onClear: () => {
                A({}), x(1);
              },
              enabledFilters: F
            }
          )
        ] })
      ] }) }) }),
      /* @__PURE__ */ d("section", { children: [
        /* @__PURE__ */ o("div", { className: "flex items-end justify-between gap-3", children: /* @__PURE__ */ d("div", { children: [
          /* @__PURE__ */ o("h1", { className: "text-2xl font-semibold tracking-tight", children: L.shopPage.title || "Shop" }),
          L.shopPage.description && /* @__PURE__ */ o("p", { className: "mt-1 text-sm text-neutral-600 dark:text-neutral-400", children: L.shopPage.description })
        ] }) }),
        T ? /* @__PURE__ */ o(Kt, { className: "mt-6", description: T }) : null,
        C ? /* @__PURE__ */ o("div", { className: "mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4", children: Array.from({ length: 8 }).map((B, ee) => /* @__PURE__ */ o(Ve, { className: "aspect-[4/5] rounded-2xl" }, ee)) }) : /* @__PURE__ */ d("div", { className: "mt-6", children: [
          /* @__PURE__ */ o(
            ha,
            {
              products: W?.items ?? [],
              columns: r.ui?.productGrid?.columns,
              getProductHref: (B) => s.product(B.slug),
              onAddToCart: (B) => ve(B, null, 1),
              onQuickView: (B) => {
                re(B), X(!0);
              },
              layout: L.shopLayout.layout,
              imageCrop: L.shopLayout.imageCrop
            }
          ),
          /* @__PURE__ */ d("div", { className: "mt-8 flex items-center justify-between", children: [
            /* @__PURE__ */ o(
              le,
              {
                type: "button",
                variant: "outline",
                disabled: _ <= 1,
                onClick: () => x((B) => Math.max(1, B - 1)),
                children: "Previous"
              }
            ),
            /* @__PURE__ */ d("div", { className: "text-xs text-neutral-600 dark:text-neutral-400", children: [
              "Page ",
              _
            ] }),
            /* @__PURE__ */ o(
              le,
              {
                type: "button",
                variant: "outline",
                disabled: !W?.hasNextPage,
                onClick: () => x((B) => B + 1),
                children: "Next"
              }
            )
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ o(
      _s,
      {
        product: q,
        open: j,
        onOpenChange: X,
        productHref: (B) => s.product(B),
        onAddToCart: (B, ee, fe) => ve(B, ee, fe)
      }
    )
  ] });
}
function nN(e) {
  return /* @__PURE__ */ o("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", ...e, children: /* @__PURE__ */ o("path", { d: "M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" }) });
}
function rN({
  categorySlug: e,
  className: t,
  routes: n
}) {
  const { config: r } = je(), a = jt(), i = pa(), { categories: s } = Oi(), [c, l] = y.useState(() => typeof window > "u" ? !1 : window.matchMedia?.("(min-width: 1024px)")?.matches ?? !1);
  y.useEffect(() => {
    if (typeof window > "u") return;
    const G = window.matchMedia?.("(min-width: 1024px)");
    if (!G) return;
    const oe = () => l(G.matches);
    return oe(), G.addEventListener?.("change", oe), () => G.removeEventListener?.("change", oe);
  }, []);
  const [u, p] = y.useState(!1), [m, h] = y.useState(!1), [g, v] = y.useState("cart"), f = y.useMemo(() => Li({ includeCategory: !1 }), []), [b, k] = y.useState(f?.search ?? ""), [w, _] = y.useState(f?.page ?? 1), [x, N] = y.useState(f?.sort ?? "featured"), [I, S] = y.useState(f?.filters ?? {}), [A, W] = y.useState(null), [C, T] = y.useState(!1), P = s.find((G) => G.slug === e) ?? null, { data: L, isLoading: F, error: $ } = jo({
    category: e,
    search: b.trim() || void 0,
    filters: I,
    sort: x,
    page: w,
    pageSize: 24
  }), M = n?.product ?? ((G) => `/product/${G}`), D = n?.shop ?? "/shop", O = n?.cart ?? "/cart", V = n?.checkout ?? "/checkout", E = y.useMemo(() => {
    const G = L?.items ?? [], oe = /* @__PURE__ */ new Set();
    let de = Number.POSITIVE_INFINITY, he = 0;
    for (const et of G) {
      for (const We of et.tags ?? []) oe.add(We);
      de = Math.min(de, et.price), he = Math.max(he, et.price);
    }
    const Fe = Array.from(oe).slice(0, 12), Xe = Number.isFinite(de) ? { min: de, max: he } : void 0;
    return { tags: Fe, price: Xe };
  }, [L?.items]), { settings: q } = ar(), re = q.catalog.filters, j = q.catalog.sort, X = y.useMemo(() => {
    const G = [];
    return j.featured && G.push({ value: "featured", label: "Featured" }), j.priceAsc && G.push({ value: "price_asc", label: "Price: Low to High" }), j.priceDesc && G.push({ value: "price_desc", label: "Price: High to Low" }), G.length === 0 && G.push({ value: "featured", label: "Featured" }), G;
  }, [j]);
  y.useEffect(() => {
    X.some((G) => G.value === x) || N(X[0].value);
  }, [X, x]), $i(
    {
      search: b,
      sort: x,
      page: w,
      filters: I
    },
    { includeCategory: !1 }
  );
  const te = y.useCallback(
    (G, oe, de) => {
      a.addItem(
        {
          productId: G.id,
          variantId: oe?.id,
          unitPrice: G.price,
          currency: G.currency,
          titleSnapshot: oe ? `${G.title} — ${oe.title}` : G.title,
          imageSnapshot: G.images[0]?.url,
          paymentResource: G.id,
          metadata: As(G)
        },
        de
      ), i?.toast({
        title: "Added to cart",
        description: G.title,
        actionLabel: "View cart",
        onAction: () => {
          typeof window < "u" && (window.matchMedia?.("(min-width: 1024px)").matches ? window.location.assign(O) : (v("cart"), h(!0)));
        }
      });
    },
    [a, O, i]
  ), ve = (G) => {
    S(G), _(1);
  }, B = () => {
    S({}), _(1);
  }, ee = (G) => {
    N(G), _(1);
  }, fe = /* @__PURE__ */ o(zt, { className: "flex max-h-[calc(100vh-6rem)] flex-col rounded-2xl", children: /* @__PURE__ */ d(Jt, { className: "flex-1 space-y-5 overflow-y-auto pr-2 pt-6", children: [
    /* @__PURE__ */ d("div", { className: "space-y-1", children: [
      /* @__PURE__ */ d("div", { className: "flex items-center justify-between gap-2", children: [
        /* @__PURE__ */ o("div", { className: "text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400", children: "Category" }),
        /* @__PURE__ */ o(le, { asChild: !0, type: "button", variant: "ghost", size: "sm", className: "h-8 px-2 text-xs", children: /* @__PURE__ */ o("a", { href: D, children: "All categories" }) })
      ] }),
      /* @__PURE__ */ o("div", { className: "text-base font-semibold text-neutral-950 dark:text-neutral-50", children: P?.name ?? e }),
      /* @__PURE__ */ o("div", { className: "text-sm text-neutral-600 dark:text-neutral-400", children: P?.description ?? "Browse products in this category." })
    ] }),
    X.length > 1 && /* @__PURE__ */ d("div", { className: "space-y-2", children: [
      /* @__PURE__ */ o("div", { className: "text-sm font-semibold", children: "Sort" }),
      /* @__PURE__ */ d(Co, { value: x, onValueChange: ee, children: [
        /* @__PURE__ */ o(Mr, { "aria-label": "Sort", children: /* @__PURE__ */ o(No, { placeholder: "Sort" }) }),
        /* @__PURE__ */ o(Dr, { children: X.map((G) => /* @__PURE__ */ o(Lr, { value: G.value, children: G.label }, G.value)) })
      ] })
    ] }),
    /* @__PURE__ */ o(Et, {}),
    /* @__PURE__ */ o(Po, { facets: E, value: I, onChange: ve, onClear: B, enabledFilters: re })
  ] }) });
  return /* @__PURE__ */ d("div", { className: Z("min-h-screen bg-neutral-50 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50", t), children: [
    /* @__PURE__ */ o("header", { className: "sticky top-0 z-40 border-b border-neutral-200 bg-neutral-50/80 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/70", children: /* @__PURE__ */ d("div", { className: "mx-auto flex max-w-7xl items-center gap-3 px-4 py-3", children: [
      /* @__PURE__ */ o("a", { href: D, className: "text-sm font-semibold tracking-tight", children: r.brand?.name ?? "Shop" }),
      /* @__PURE__ */ o("div", { className: "flex-1", children: /* @__PURE__ */ o(ks, { value: b, onChange: k }) }),
      /* @__PURE__ */ d("div", { className: "flex items-center gap-2 lg:hidden", children: [
        /* @__PURE__ */ d(oa, { open: u, onOpenChange: p, children: [
          /* @__PURE__ */ o(aa, { asChild: !0, children: /* @__PURE__ */ o(le, { type: "button", variant: "outline", children: "Filters" }) }),
          /* @__PURE__ */ d(Br, { side: "left", children: [
            /* @__PURE__ */ o(ia, { children: /* @__PURE__ */ o(sa, { children: "Filters" }) }),
            /* @__PURE__ */ o("div", { className: "mt-4", children: fe })
          ] })
        ] }),
        /* @__PURE__ */ o(
          zr,
          {
            open: !c && m,
            onOpenChange: h,
            side: "bottom",
            preferredTab: g,
            onCheckout: () => {
              typeof window < "u" && window.location.assign(V);
            },
            trigger: /* @__PURE__ */ d(le, { type: "button", variant: "default", onClick: () => v("cart"), children: [
              "Cart (",
              a.count,
              ")"
            ] })
          }
        )
      ] }),
      /* @__PURE__ */ d("div", { className: "hidden lg:flex items-center gap-2", children: [
        /* @__PURE__ */ o(
          zr,
          {
            open: c && m,
            onOpenChange: h,
            side: "popup",
            preferredTab: g,
            onCheckout: () => {
              typeof window < "u" && window.location.assign(V);
            },
            trigger: /* @__PURE__ */ d(le, { type: "button", variant: "outline", onClick: () => v("cart"), children: [
              "Cart (",
              a.count,
              ")"
            ] })
          }
        ),
        /* @__PURE__ */ o(
          le,
          {
            type: "button",
            variant: "default",
            onClick: () => {
              typeof window < "u" && window.location.assign(V);
            },
            children: "Checkout"
          }
        )
      ] })
    ] }) }),
    /* @__PURE__ */ d(
      le,
      {
        type: "button",
        variant: "ghost",
        className: Z(
          "fixed bottom-4 right-4 z-30 hidden items-center gap-2 rounded-full border border-neutral-200 bg-white/90 px-3 py-2 text-xs font-medium text-neutral-900 shadow-sm backdrop-blur hover:bg-white dark:border-neutral-800 dark:bg-neutral-950/80 dark:text-neutral-50 dark:hover:bg-neutral-950 lg:flex",
          m ? "lg:hidden" : void 0
        ),
        onClick: () => {
          v("chat"), h(!0);
        },
        "aria-label": "Open chat",
        children: [
          /* @__PURE__ */ o(nN, { className: "h-4 w-4" }),
          "Chat"
        ]
      }
    ),
    /* @__PURE__ */ d("main", { className: "mx-auto max-w-7xl px-4 py-8", children: [
      /* @__PURE__ */ o(xs, { items: [{ label: "Shop", href: D }, { label: P?.name ?? e }] }),
      /* @__PURE__ */ d("div", { className: "mt-6", children: [
        /* @__PURE__ */ o("h1", { className: "text-2xl font-semibold tracking-tight", children: P?.name ?? "Category" }),
        /* @__PURE__ */ o("p", { className: "mt-1 text-sm text-neutral-600 dark:text-neutral-400", children: P?.description ?? "Browse products in this category." })
      ] }),
      $ ? /* @__PURE__ */ o(Kt, { className: "mt-6", description: $ }) : null,
      /* @__PURE__ */ d("div", { className: "mt-6 grid gap-6 lg:grid-cols-[280px_1fr]", children: [
        /* @__PURE__ */ o("aside", { className: "hidden lg:block", children: /* @__PURE__ */ o("div", { className: "sticky top-24", children: fe }) }),
        /* @__PURE__ */ o("div", { children: F ? /* @__PURE__ */ o("div", { className: "mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4", children: Array.from({ length: 8 }).map((G, oe) => /* @__PURE__ */ o(Ve, { className: "aspect-[4/5] rounded-2xl" }, oe)) }) : /* @__PURE__ */ d("div", { className: "mt-6", children: [
          /* @__PURE__ */ o(
            ha,
            {
              products: L?.items ?? [],
              columns: r.ui?.productGrid?.columns,
              getProductHref: (G) => M(G.slug),
              onAddToCart: (G) => te(G, null, 1),
              onQuickView: (G) => {
                W(G), T(!0);
              },
              layout: q.categoryLayout.layout,
              imageCrop: q.categoryLayout.imageCrop
            }
          ),
          /* @__PURE__ */ d("div", { className: "mt-8 flex items-center justify-between", children: [
            /* @__PURE__ */ o(
              le,
              {
                type: "button",
                variant: "outline",
                disabled: w <= 1,
                onClick: () => _((G) => Math.max(1, G - 1)),
                children: "Previous"
              }
            ),
            /* @__PURE__ */ d("div", { className: "text-xs text-neutral-600 dark:text-neutral-400", children: [
              "Page ",
              w
            ] }),
            /* @__PURE__ */ o(
              le,
              {
                type: "button",
                variant: "outline",
                disabled: !L?.hasNextPage,
                onClick: () => _((G) => G + 1),
                children: "Next"
              }
            )
          ] })
        ] }) })
      ] }),
      /* @__PURE__ */ o(
        _s,
        {
          product: A,
          open: C,
          onOpenChange: T,
          productHref: (G) => M(G),
          onAddToCart: (G, oe, de) => te(G, oe, de)
        }
      )
    ] })
  ] });
}
function oN({
  slug: e,
  className: t,
  routes: n
}) {
  const r = jt(), a = pa(), { product: i, isLoading: s, error: c } = ud(e), [l, u] = y.useState(1), [p, m] = y.useState({
    selectedOptions: {},
    variant: null
  });
  y.useEffect(() => {
    if (!i || !i.variants?.length) return;
    const P = i.variants[0];
    m({ selectedOptions: { ...P.options }, variant: P });
  }, [i?.id]);
  const { settings: h } = ar(), { mode: g, maxItems: v } = h.relatedProducts, f = yd({
    productId: i?.id,
    enabled: g === "ai" && !!i?.id
  }), b = y.useMemo(() => g === "by_category" && i?.categoryIds?.length ? { category: i.categoryIds[0], page: 1, pageSize: v + 1 } : { page: 1, pageSize: v + 4 }, [g, v, i?.categoryIds]), k = jo(b), w = y.useMemo(() => {
    const L = (k.data?.items ?? []).filter((F) => F.slug !== e);
    if (g === "manual" && i) {
      const F = i.attributes?.relatedProductIds || i.attributes?.related_product_ids;
      if (F) {
        const $ = Ja(String(F));
        if ($.length > 0) {
          const M = new Map(L.map((O) => [O.id, O]));
          return $.map((O) => M.get(O)).filter((O) => !!O).slice(0, v);
        }
      }
    }
    if (g === "ai" && f.relatedProductIds && f.relatedProductIds.length > 0) {
      const F = new Map(L.map((M) => [M.id, M])), $ = f.relatedProductIds.map((M) => F.get(M)).filter((M) => !!M);
      if ($.length > 0)
        return $.slice(0, v);
    }
    return L.slice(0, v);
  }, [k.data?.items, e, g, v, i, f.relatedProductIds]), _ = n?.shop ?? "/shop", x = n?.checkout ?? "/checkout", N = n?.cart ?? "/cart", I = n?.product ?? ((P) => `/product/${P}`);
  if (s)
    return /* @__PURE__ */ o("div", { className: Z("min-h-screen bg-neutral-50 p-6 dark:bg-neutral-950", t), children: /* @__PURE__ */ d("div", { className: "mx-auto max-w-6xl", children: [
      /* @__PURE__ */ o(Ve, { className: "h-5 w-40" }),
      /* @__PURE__ */ d("div", { className: "mt-6 grid gap-8 lg:grid-cols-2", children: [
        /* @__PURE__ */ o(Ve, { className: "aspect-square rounded-2xl" }),
        /* @__PURE__ */ d("div", { className: "space-y-4", children: [
          /* @__PURE__ */ o(Ve, { className: "h-8 w-2/3" }),
          /* @__PURE__ */ o(Ve, { className: "h-6 w-32" }),
          /* @__PURE__ */ o(Ve, { className: "h-20" }),
          /* @__PURE__ */ o(Ve, { className: "h-11" })
        ] })
      ] })
    ] }) });
  if (c)
    return /* @__PURE__ */ o("div", { className: Z("min-h-screen bg-neutral-50 p-6 dark:bg-neutral-950", t), children: /* @__PURE__ */ o("div", { className: "mx-auto max-w-6xl", children: /* @__PURE__ */ o(Kt, { description: c }) }) });
  if (!i)
    return /* @__PURE__ */ o("div", { className: Z("min-h-screen bg-neutral-50 p-6 dark:bg-neutral-950", t), children: /* @__PURE__ */ o("div", { className: "mx-auto max-w-6xl", children: /* @__PURE__ */ o(Kt, { description: "Product not found." }) }) });
  const S = p.variant?.price ?? i.price, A = p.variant?.compareAtPrice ?? i.compareAtPrice, W = i.inventoryStatus === "out_of_stock" || typeof i.inventoryQuantity == "number" && i.inventoryQuantity <= 0, C = () => {
    W || (r.addItem(
      {
        productId: i.id,
        variantId: p.variant?.id,
        unitPrice: S,
        currency: i.currency,
        titleSnapshot: p.variant ? `${i.title} — ${p.variant.title}` : i.title,
        imageSnapshot: i.images[0]?.url,
        paymentResource: i.id,
        metadata: As(i)
      },
      l
    ), a?.toast({
      title: "Added to cart",
      description: i.title,
      actionLabel: "View cart",
      onAction: () => {
        typeof window < "u" && window.location.assign(N);
      }
    }));
  }, T = () => {
    W || (C(), typeof window < "u" && window.location.assign(x));
  };
  return /* @__PURE__ */ o("div", { className: Z("min-h-screen bg-neutral-50 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50", t), children: /* @__PURE__ */ d("main", { className: "mx-auto max-w-6xl px-4 py-8", children: [
    /* @__PURE__ */ o(xs, { items: [{ label: "Shop", href: _ }, { label: i.title }] }),
    /* @__PURE__ */ d("div", { className: "mt-6 grid gap-10 lg:grid-cols-2", children: [
      /* @__PURE__ */ o(vs, { images: i.images }),
      /* @__PURE__ */ d("div", { className: "space-y-6", children: [
        /* @__PURE__ */ d("div", { children: [
          /* @__PURE__ */ o("h1", { className: "text-3xl font-semibold tracking-tight", children: i.title }),
          /* @__PURE__ */ o("div", { className: "mt-3", children: /* @__PURE__ */ o(fa, { amount: S, currency: i.currency, compareAt: A }) }),
          W ? /* @__PURE__ */ o("div", { className: "mt-2 text-sm font-medium text-red-700 dark:text-red-300", children: "Out of stock" }) : typeof i.inventoryQuantity == "number" && i.inventoryQuantity > 0 && i.inventoryQuantity <= 5 ? /* @__PURE__ */ d("div", { className: "mt-2 text-sm text-neutral-600 dark:text-neutral-400", children: [
            "Only ",
            /* @__PURE__ */ o("span", { className: "font-semibold text-neutral-950 dark:text-neutral-50", children: i.inventoryQuantity }),
            " left"
          ] }) : null,
          /* @__PURE__ */ o("p", { className: "mt-4 text-sm text-neutral-600 dark:text-neutral-400", children: i.description })
        ] }),
        /* @__PURE__ */ o(
          bs,
          {
            product: i,
            value: { selectedOptions: p.selectedOptions, variantId: p.variant?.id },
            onChange: (P) => m(P)
          }
        ),
        /* @__PURE__ */ d("div", { className: "flex flex-wrap items-center gap-3", children: [
          /* @__PURE__ */ o(ws, { qty: l, onChange: u }),
          /* @__PURE__ */ o(le, { type: "button", onClick: C, className: "flex-1", disabled: W, children: W ? "Out of stock" : "Add to cart" }),
          /* @__PURE__ */ o(le, { type: "button", variant: "outline", onClick: T, disabled: W, children: "Buy now" })
        ] }),
        (h.sections.showDescription || h.sections.showSpecs || h.sections.showShipping) && /* @__PURE__ */ d($m, { type: "single", collapsible: !0, defaultValue: h.sections.showDescription ? "desc" : void 0, children: [
          h.sections.showDescription && /* @__PURE__ */ d(Sr, { value: "desc", children: [
            /* @__PURE__ */ o(Cr, { children: "Description" }),
            /* @__PURE__ */ o(Nr, { children: /* @__PURE__ */ o("div", { className: "text-sm text-neutral-600 dark:text-neutral-400", children: i.description }) })
          ] }),
          h.sections.showSpecs && /* @__PURE__ */ d(Sr, { value: "specs", children: [
            /* @__PURE__ */ o(Cr, { children: "Specs" }),
            /* @__PURE__ */ o(Nr, { children: /* @__PURE__ */ o("div", { className: "text-sm text-neutral-600 dark:text-neutral-400", children: i.attributes ? /* @__PURE__ */ o("div", { className: "space-y-1", children: Object.entries(i.attributes).map(([P, L]) => /* @__PURE__ */ d("div", { children: [
              /* @__PURE__ */ d("span", { className: "font-medium text-neutral-950 dark:text-neutral-50", children: [
                P,
                ":"
              ] }),
              " ",
              String(L)
            ] }, P)) }) : "No specs provided." }) })
          ] }),
          h.sections.showShipping && /* @__PURE__ */ d(Sr, { value: "ship", children: [
            /* @__PURE__ */ o(Cr, { children: "Shipping & returns" }),
            /* @__PURE__ */ o(Nr, { children: /* @__PURE__ */ o("div", { className: "text-sm text-neutral-600 dark:text-neutral-400", children: "Ships in 2–3 business days. Easy returns within 30 days." }) })
          ] })
        ] })
      ] })
    ] }),
    h.sections.showRelatedProducts && w.length ? /* @__PURE__ */ d("section", { className: "mt-12", children: [
      /* @__PURE__ */ o("h2", { className: "text-lg font-semibold", children: "Related products" }),
      /* @__PURE__ */ o("div", { className: "mt-4", children: /* @__PURE__ */ o(
        ha,
        {
          products: w,
          columns: { base: 2, md: 4, lg: 4 },
          layout: h.relatedProducts.layout.layout,
          imageCrop: h.relatedProducts.layout.imageCrop,
          getProductHref: (P) => I(P.slug),
          onAddToCart: (P) => r.addItem(
            {
              productId: P.id,
              unitPrice: P.price,
              currency: P.currency,
              titleSnapshot: P.title,
              imageSnapshot: P.images[0]?.url,
              paymentResource: P.id
            },
            1
          )
        }
      ) })
    ] }) : null
  ] }) });
}
function aN({
  className: e,
  checkoutHref: t
}) {
  const { config: n } = je(), { settings: r } = ar(), a = t ?? "/checkout", i = n.checkout.allowPromoCodes && r.checkout.promoCodes;
  return /* @__PURE__ */ o("div", { className: Z("min-h-screen bg-neutral-50 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50", e), children: /* @__PURE__ */ d("main", { className: "mx-auto max-w-6xl px-4 py-10", children: [
    /* @__PURE__ */ o("h1", { className: "text-3xl font-semibold tracking-tight", children: "Cart" }),
    /* @__PURE__ */ o("p", { className: "mt-2 text-sm text-neutral-600 dark:text-neutral-400", children: "Review items, adjust quantities, then check out." }),
    /* @__PURE__ */ o("div", { className: "mt-8", children: /* @__PURE__ */ o(
      pp,
      {
        onCheckout: () => {
          typeof window < "u" && window.location.assign(a);
        },
        showPromoCode: i
      }
    ) })
  ] }) });
}
function iN({
  className: e,
  routes: t
}) {
  const { config: n } = je(), r = jt(), a = Di(), i = n.customer?.isSignedIn ?? !!n.customer?.id, c = !(n.checkout.requireAccount ? !1 : n.checkout.guestCheckout ?? !0) && !i;
  y.useEffect(() => {
    a.kind === "success" && r.clear();
  }, [a.kind]);
  const l = t?.shop ?? "/shop", u = t?.orders ?? "/account/orders", p = t?.login;
  return /* @__PURE__ */ o("div", { className: Z("min-h-screen bg-neutral-50 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50", e), children: /* @__PURE__ */ d("main", { className: "mx-auto max-w-6xl px-4 py-10", children: [
    /* @__PURE__ */ o(
      ga,
      {
        result: a,
        onContinueShopping: () => {
          typeof window < "u" && window.location.assign(l);
        },
        onViewOrders: () => {
          typeof window < "u" && window.location.assign(u);
        }
      }
    ),
    a.kind === "idle" ? /* @__PURE__ */ d(Oe, { children: [
      /* @__PURE__ */ d("div", { children: [
        /* @__PURE__ */ o("h1", { className: "text-3xl font-semibold tracking-tight", children: "Checkout" }),
        /* @__PURE__ */ o("p", { className: "mt-2 text-sm text-neutral-600 dark:text-neutral-400", children: n.checkout.mode === "none" ? "Confirm and pay." : "Enter details, then complete payment." })
      ] }),
      /* @__PURE__ */ o("div", { className: "mt-8", children: /* @__PURE__ */ o(dd, { children: c ? /* @__PURE__ */ d(zt, { className: "rounded-2xl", children: [
        /* @__PURE__ */ o(Er, { className: "pb-4", children: /* @__PURE__ */ o(Ir, { className: "text-base", children: "Sign in required" }) }),
        /* @__PURE__ */ d(Jt, { children: [
          /* @__PURE__ */ o("div", { className: "text-sm text-neutral-600 dark:text-neutral-400", children: "This store requires an account to complete checkout." }),
          p ? /* @__PURE__ */ o("div", { className: "mt-4", children: /* @__PURE__ */ o(
            le,
            {
              type: "button",
              onClick: () => {
                typeof window < "u" && window.location.assign(p);
              },
              children: "Sign in"
            }
          ) }) : null
        ] })
      ] }) : /* @__PURE__ */ o(
        fp,
        {
          left: /* @__PURE__ */ d("div", { className: "space-y-6", children: [
            /* @__PURE__ */ o(gp, {}),
            /* @__PURE__ */ d(zt, { className: "rounded-2xl", children: [
              /* @__PURE__ */ o(Er, { className: "pb-4", children: /* @__PURE__ */ o(Ir, { className: "text-base", children: "Payment" }) }),
              /* @__PURE__ */ d(Jt, { children: [
                /* @__PURE__ */ o(Et, { className: "mb-4" }),
                /* @__PURE__ */ o(bp, {})
              ] })
            ] })
          ] }),
          right: /* @__PURE__ */ o("div", { className: "lg:sticky lg:top-24", children: /* @__PURE__ */ o(wp, {}) })
        }
      ) }) })
    ] }) : null
  ] }) });
}
function sN({
  className: e,
  isSignedIn: t = !0,
  onLogin: n
}) {
  const { orders: r, isLoading: a, error: i } = md(), [s, c] = y.useState(null);
  return t ? /* @__PURE__ */ o("div", { className: Z("min-h-screen bg-neutral-50 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50", e), children: /* @__PURE__ */ d("main", { className: "mx-auto max-w-5xl px-4 py-10 sm:py-12", children: [
    /* @__PURE__ */ d("header", { className: "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", children: [
      /* @__PURE__ */ d("div", { children: [
        /* @__PURE__ */ o("h1", { className: "text-3xl font-semibold tracking-tight", children: "Orders" }),
        /* @__PURE__ */ o("p", { className: "mt-2 text-sm text-neutral-600 dark:text-neutral-400", children: "View past purchases and receipts." })
      ] }),
      !a && !i && !s && r.length > 0 ? /* @__PURE__ */ d("div", { className: "text-sm text-neutral-600 dark:text-neutral-400", children: [
        r.length,
        " order",
        r.length === 1 ? "" : "s"
      ] }) : null
    ] }),
    i ? /* @__PURE__ */ o(Kt, { className: "mt-8", description: i }) : null,
    a ? /* @__PURE__ */ d("div", { className: "mt-8 grid gap-4", children: [
      /* @__PURE__ */ o(Ve, { className: "h-32 rounded-2xl" }),
      /* @__PURE__ */ o(Ve, { className: "h-32 rounded-2xl" }),
      /* @__PURE__ */ o(Ve, { className: "h-32 rounded-2xl" })
    ] }) : r.length === 0 ? /* @__PURE__ */ o("div", { className: "mt-8", children: /* @__PURE__ */ o(tr, { title: "No orders yet", description: "When you purchase something, it will show up here." }) }) : s ? /* @__PURE__ */ o("div", { className: "mt-8", children: /* @__PURE__ */ o(kp, { order: s, onBack: () => c(null) }) }) : /* @__PURE__ */ o("div", { className: "mt-8", children: /* @__PURE__ */ o(xp, { orders: r, onView: c }) })
  ] }) }) : /* @__PURE__ */ o("div", { className: Z("min-h-screen bg-neutral-50 p-10 dark:bg-neutral-950", e), children: /* @__PURE__ */ o("div", { className: "mx-auto max-w-4xl", children: /* @__PURE__ */ o(
    tr,
    {
      title: "Sign in to view your orders",
      description: "Your purchase history will appear here once you're logged in.",
      actionLabel: n ? "Sign in" : void 0,
      onAction: n
    }
  ) }) });
}
function cN({ className: e }) {
  return /* @__PURE__ */ d("svg", { className: e, width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ o("polyline", { points: "6 9 6 2 18 2 18 9" }),
    /* @__PURE__ */ o("path", { d: "M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" }),
    /* @__PURE__ */ o("rect", { x: "6", y: "14", width: "12", height: "8" })
  ] });
}
function lN({ className: e }) {
  return /* @__PURE__ */ o("svg", { className: e, width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ o("path", { d: "m15 18-6-6 6-6" }) });
}
function dN(e) {
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
function uN({
  order: e,
  source: t,
  purchaseId: n,
  customerEmail: r,
  customerName: a,
  className: i,
  onBack: s
}) {
  const { config: c } = je(), l = t ?? e.source, u = n ?? e.purchaseId, p = r ?? e.customerEmail, m = a ?? e.customerName, h = c.brand?.name ?? "Store", g = c.brand?.logoUrl, v = () => {
    typeof window < "u" && window.print();
  }, f = new Date(e.createdAt).toLocaleDateString(void 0, {
    year: "numeric",
    month: "long",
    day: "numeric"
  }), b = new Date(e.createdAt).toLocaleTimeString(void 0, {
    hour: "numeric",
    minute: "2-digit"
  });
  return /* @__PURE__ */ d("div", { className: Z("min-h-screen bg-neutral-100 dark:bg-neutral-900 print:bg-white print:dark:bg-white", i), children: [
    /* @__PURE__ */ o("div", { className: "border-b border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-950 print:hidden", children: /* @__PURE__ */ d("div", { className: "mx-auto flex max-w-2xl items-center justify-between", children: [
      s ? /* @__PURE__ */ d(le, { type: "button", variant: "ghost", size: "sm", onClick: s, children: [
        /* @__PURE__ */ o(lN, { className: "mr-1" }),
        " Back"
      ] }) : /* @__PURE__ */ o("div", {}),
      /* @__PURE__ */ d(le, { type: "button", variant: "outline", size: "sm", onClick: v, children: [
        /* @__PURE__ */ o(cN, { className: "mr-2" }),
        " Print Receipt"
      ] })
    ] }) }),
    /* @__PURE__ */ o("div", { className: "mx-auto max-w-2xl px-4 py-8 print:max-w-none print:px-0 print:py-0", children: /* @__PURE__ */ d("div", { className: "rounded-xl border border-neutral-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 print:border-0 print:shadow-none print:dark:bg-white print:dark:text-neutral-950", children: [
      /* @__PURE__ */ d("div", { className: "flex items-center justify-between border-b border-neutral-200 pb-6 dark:border-neutral-800 print:dark:border-neutral-200", children: [
        /* @__PURE__ */ d("div", { className: "flex items-center gap-3", children: [
          g ? /* @__PURE__ */ o("img", { src: g, alt: h, className: "h-10 w-10 rounded-lg object-contain" }) : null,
          /* @__PURE__ */ o("div", { className: "text-xl font-semibold", children: h })
        ] }),
        /* @__PURE__ */ d("div", { className: "text-right", children: [
          /* @__PURE__ */ o("div", { className: "text-sm font-medium text-neutral-600 dark:text-neutral-400 print:dark:text-neutral-600", children: "Receipt" }),
          /* @__PURE__ */ o("div", { className: "mt-1 font-mono text-sm", children: e.id })
        ] })
      ] }),
      /* @__PURE__ */ d("div", { className: "mt-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3", children: [
        /* @__PURE__ */ d("div", { children: [
          /* @__PURE__ */ o("div", { className: "text-neutral-600 dark:text-neutral-400 print:dark:text-neutral-600", children: "Date" }),
          /* @__PURE__ */ o("div", { className: "mt-1 font-medium", children: f }),
          /* @__PURE__ */ o("div", { className: "text-neutral-600 dark:text-neutral-400 print:dark:text-neutral-600", children: b })
        ] }),
        /* @__PURE__ */ d("div", { children: [
          /* @__PURE__ */ o("div", { className: "text-neutral-600 dark:text-neutral-400 print:dark:text-neutral-600", children: "Payment Method" }),
          /* @__PURE__ */ o("div", { className: "mt-1 font-medium", children: dN(l) })
        ] }),
        /* @__PURE__ */ d("div", { children: [
          /* @__PURE__ */ o("div", { className: "text-neutral-600 dark:text-neutral-400 print:dark:text-neutral-600", children: "Status" }),
          /* @__PURE__ */ o("div", { className: "mt-1", children: /* @__PURE__ */ o(Tn, { variant: "outline", className: "capitalize print:border-neutral-300", children: e.status }) })
        ] })
      ] }),
      (m || p) && /* @__PURE__ */ d("div", { className: "mt-6 border-t border-neutral-200 pt-6 dark:border-neutral-800 print:dark:border-neutral-200", children: [
        /* @__PURE__ */ o("div", { className: "text-sm text-neutral-600 dark:text-neutral-400 print:dark:text-neutral-600", children: "Customer" }),
        m && /* @__PURE__ */ o("div", { className: "mt-1 font-medium", children: m }),
        p && /* @__PURE__ */ o("div", { className: "text-sm text-neutral-600 dark:text-neutral-400 print:dark:text-neutral-600", children: p })
      ] }),
      /* @__PURE__ */ o("div", { className: "mt-6 border-t border-neutral-200 pt-6 dark:border-neutral-800 print:dark:border-neutral-200", children: /* @__PURE__ */ d("table", { className: "w-full text-sm", children: [
        /* @__PURE__ */ o("thead", { children: /* @__PURE__ */ d("tr", { className: "border-b border-neutral-200 dark:border-neutral-800 print:dark:border-neutral-200", children: [
          /* @__PURE__ */ o("th", { className: "pb-3 text-left font-medium text-neutral-600 dark:text-neutral-400 print:dark:text-neutral-600", children: "Item" }),
          /* @__PURE__ */ o("th", { className: "pb-3 text-center font-medium text-neutral-600 dark:text-neutral-400 print:dark:text-neutral-600", children: "Qty" }),
          /* @__PURE__ */ o("th", { className: "pb-3 text-right font-medium text-neutral-600 dark:text-neutral-400 print:dark:text-neutral-600", children: "Price" })
        ] }) }),
        /* @__PURE__ */ o("tbody", { children: e.items.map((k, w) => /* @__PURE__ */ d("tr", { className: "border-b border-neutral-100 dark:border-neutral-800/50 print:dark:border-neutral-100", children: [
          /* @__PURE__ */ o("td", { className: "py-3", children: /* @__PURE__ */ o("div", { className: "font-medium", children: k.title }) }),
          /* @__PURE__ */ o("td", { className: "py-3 text-center text-neutral-600 dark:text-neutral-400 print:dark:text-neutral-600", children: k.qty }),
          /* @__PURE__ */ o("td", { className: "py-3 text-right", children: rt({ amount: k.unitPrice * k.qty, currency: k.currency }) })
        ] }, `${k.title}-${w}`)) })
      ] }) }),
      /* @__PURE__ */ d("div", { className: "mt-4 flex flex-col items-end gap-2 text-sm", children: [
        /* @__PURE__ */ d("div", { className: "flex w-48 justify-between", children: [
          /* @__PURE__ */ o("span", { className: "text-neutral-600 dark:text-neutral-400 print:dark:text-neutral-600", children: "Subtotal" }),
          /* @__PURE__ */ o("span", { children: rt({ amount: e.total, currency: e.currency }) })
        ] }),
        /* @__PURE__ */ d("div", { className: "flex w-48 justify-between border-t border-neutral-200 pt-2 text-base font-semibold dark:border-neutral-800 print:dark:border-neutral-200", children: [
          /* @__PURE__ */ o("span", { children: "Total" }),
          /* @__PURE__ */ o("span", { children: rt({ amount: e.total, currency: e.currency }) })
        ] })
      ] }),
      u && /* @__PURE__ */ d("div", { className: "mt-6 border-t border-neutral-200 pt-6 dark:border-neutral-800 print:dark:border-neutral-200", children: [
        /* @__PURE__ */ o("div", { className: "text-sm text-neutral-600 dark:text-neutral-400 print:dark:text-neutral-600", children: "Transaction ID" }),
        /* @__PURE__ */ o("div", { className: "mt-1 break-all font-mono text-xs", children: u })
      ] }),
      /* @__PURE__ */ d("div", { className: "mt-8 border-t border-neutral-200 pt-6 text-center text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400 print:dark:border-neutral-200 print:dark:text-neutral-500", children: [
        /* @__PURE__ */ o("p", { children: "Thank you for your purchase!" }),
        /* @__PURE__ */ o("p", { className: "mt-1", children: "If you have any questions, please contact support." })
      ] })
    ] }) })
  ] });
}
function mN({ className: e }) {
  return /* @__PURE__ */ o(
    "svg",
    {
      className: Z("h-4 w-4 flex-shrink-0", e),
      viewBox: "0 0 20 20",
      fill: "currentColor",
      children: /* @__PURE__ */ o(
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
function pN({
  className: e,
  title: t = "Choose Your Plan",
  subtitle: n = "Select the plan that best fits your needs.",
  annualSavingsBadge: r = "2 months free",
  popularBadgeText: a = "Best Deal",
  footerNotice: i
}) {
  const { config: s } = je(), { tiers: c, status: l, isLoading: u, error: p } = pd(), [m, h] = y.useState("monthly"), g = !!s.adapter.createSubscriptionCheckoutSession, v = async (f) => {
    if (!s.adapter.createSubscriptionCheckoutSession) return;
    const b = await s.adapter.createSubscriptionCheckoutSession({
      tierId: f,
      interval: m,
      successUrl: s.checkout.successUrl,
      cancelUrl: s.checkout.cancelUrl
    });
    b.kind === "redirect" && typeof window < "u" && window.location.assign(b.url);
  };
  return /* @__PURE__ */ o("div", { className: Z("min-h-screen bg-neutral-50 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50", e), children: /* @__PURE__ */ d("main", { className: "mx-auto max-w-6xl px-4 py-16", children: [
    /* @__PURE__ */ d("div", { className: "text-center", children: [
      /* @__PURE__ */ o("h1", { className: "text-5xl font-bold tracking-tight", children: t }),
      /* @__PURE__ */ o("p", { className: "mt-4 text-base text-neutral-600 dark:text-neutral-400", children: n })
    ] }),
    /* @__PURE__ */ o("div", { className: "mt-10 flex justify-center", children: /* @__PURE__ */ d("div", { className: "inline-flex items-center rounded-full bg-neutral-200/60 p-1 dark:bg-neutral-800/60", children: [
      /* @__PURE__ */ d(
        "button",
        {
          type: "button",
          onClick: () => h("annual"),
          className: Z(
            "relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all",
            m === "annual" ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
          ),
          children: [
            "Yearly",
            r && /* @__PURE__ */ o("span", { className: Z(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              m === "annual" ? "bg-white/20 text-white dark:bg-neutral-900/20 dark:text-neutral-900" : "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
            ), children: r })
          ]
        }
      ),
      /* @__PURE__ */ o(
        "button",
        {
          type: "button",
          onClick: () => h("monthly"),
          className: Z(
            "rounded-full px-4 py-2 text-sm font-medium transition-all",
            m === "monthly" ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
          ),
          children: "Monthly"
        }
      )
    ] }) }),
    p ? /* @__PURE__ */ o(Kt, { className: "mt-10", description: p }) : null,
    u ? /* @__PURE__ */ d("div", { className: "mt-12 grid gap-6 md:grid-cols-3", children: [
      /* @__PURE__ */ o(Ve, { className: "h-[480px] rounded-2xl" }),
      /* @__PURE__ */ o(Ve, { className: "h-[480px] rounded-2xl" }),
      /* @__PURE__ */ o(Ve, { className: "h-[480px] rounded-2xl" })
    ] }) : c.length === 0 ? /* @__PURE__ */ o("div", { className: "mt-12", children: /* @__PURE__ */ o(tr, { title: "No plans available", description: "Subscription plans will appear here once configured." }) }) : (
      /* Pricing Cards */
      /* @__PURE__ */ o("div", { className: "mt-12 grid gap-6 md:grid-cols-3 items-start", children: c.map((f) => {
        const b = l?.isActive && l.currentTierId === f.id, k = m === "annual" && f.priceAnnual ? f.priceAnnual : f.priceMonthly, w = f.isPopular, _ = f.inventoryQuantity != null, x = _ ? Math.max(0, (f.inventoryQuantity ?? 0) - (f.inventorySold ?? 0)) : null, N = _ && x === 0, I = _ && x != null && x > 0 && x <= 5, [S, ...A] = f.features;
        return /* @__PURE__ */ d(
          "div",
          {
            className: Z(
              "relative flex flex-col rounded-2xl border p-6 transition-shadow",
              w ? "border-neutral-900 bg-neutral-900 text-white shadow-xl dark:border-white dark:bg-white dark:text-neutral-900" : "border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
            ),
            children: [
              w && a && /* @__PURE__ */ o("div", { className: "absolute -top-3 right-4", children: /* @__PURE__ */ o("span", { className: "rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-white", children: a }) }),
              /* @__PURE__ */ d("div", { className: "mb-6", children: [
                /* @__PURE__ */ o("h3", { className: "text-xl font-bold", children: f.title }),
                f.description && /* @__PURE__ */ o("p", { className: Z(
                  "mt-2 text-sm leading-relaxed",
                  w ? "text-neutral-300 dark:text-neutral-600" : "text-neutral-600 dark:text-neutral-400"
                ), children: f.description })
              ] }),
              /* @__PURE__ */ d("div", { className: "mb-6", children: [
                /* @__PURE__ */ o("div", { className: "text-5xl font-bold tracking-tight", children: rt({ amount: k, currency: f.currency || s.currency }) }),
                /* @__PURE__ */ d("div", { className: Z(
                  "mt-2 text-sm",
                  w ? "text-neutral-400 dark:text-neutral-500" : "text-neutral-500 dark:text-neutral-400"
                ), children: [
                  "Per ",
                  m === "annual" ? "year" : "month",
                  ", billed ",
                  m === "annual" ? "annually" : "monthly"
                ] })
              ] }),
              _ && /* @__PURE__ */ o("div", { className: Z(
                "mb-3 text-xs font-medium",
                N ? "text-red-600 dark:text-red-400" : I ? w ? "text-amber-300 dark:text-amber-600" : "text-amber-600 dark:text-amber-400" : w ? "text-neutral-400 dark:text-neutral-500" : "text-neutral-500 dark:text-neutral-400"
              ), children: N ? "Sold out" : `${x} remaining` }),
              /* @__PURE__ */ o(
                le,
                {
                  type: "button",
                  className: Z(
                    "mb-6 w-full rounded-full py-3 font-medium",
                    w ? "bg-white text-neutral-900 hover:bg-neutral-100 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800" : ""
                  ),
                  variant: w ? "default" : "outline",
                  disabled: b || !g || N,
                  onClick: () => void v(f.id),
                  children: N ? "Sold Out" : b ? "Current Plan" : "Purchase"
                }
              ),
              S && /* @__PURE__ */ o("div", { className: Z(
                "mb-4 text-sm font-semibold",
                w ? "" : "text-neutral-900 dark:text-white"
              ), children: S }),
              A.length > 0 && /* @__PURE__ */ o("ul", { className: "space-y-3", children: A.map((W, C) => /* @__PURE__ */ d("li", { className: "flex items-start gap-3", children: [
                /* @__PURE__ */ o(mN, { className: Z(
                  "mt-0.5",
                  w ? "text-neutral-400 dark:text-neutral-500" : "text-neutral-500 dark:text-neutral-400"
                ) }),
                /* @__PURE__ */ o("span", { className: Z(
                  "text-sm leading-relaxed",
                  w ? "text-neutral-300 dark:text-neutral-600" : "text-neutral-600 dark:text-neutral-400"
                ), children: W })
              ] }, C)) })
            ]
          },
          f.id
        );
      }) })
    ),
    i && /* @__PURE__ */ o("div", { className: "mt-12 text-center", children: /* @__PURE__ */ o("p", { className: "text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed max-w-2xl mx-auto", children: i }) })
  ] }) });
}
function fN(e) {
  const { processCartCheckout: t } = ml();
  return y.useMemo(() => ({
    ...e,
    async createCheckoutSession(n) {
      const r = await t(
        n.cart,
        n.options.successUrl,
        n.options.cancelUrl,
        n.options.metadata,
        n.customer.email,
        n.options.discountCode
      );
      if (!r.success)
        throw new Error(r.error || "Checkout failed");
      return { kind: "redirect", url: n.options.successUrl ?? "/" };
    },
    async resolveCheckoutReturn({ query: n }) {
      return Mi(n);
    }
  }), [e, t]);
}
const BN = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  Accordion: $m,
  AccordionContent: Nr,
  AccordionItem: Sr,
  AccordionTrigger: Cr,
  AddressForm: _i,
  Badge: Tn,
  Breadcrumbs: xs,
  Button: le,
  Card: zt,
  CardContent: Jt,
  CardDescription: Md,
  CardFooter: Dd,
  CardHeader: Er,
  CardTitle: Ir,
  CartLineItem: Ss,
  CartPageContent: pp,
  CartPanel: up,
  CartProvider: sh,
  CartSidebar: zr,
  CartSummary: Cs,
  CartTemplate: aN,
  CategoryNav: wi,
  CategoryTemplate: rN,
  CedrosShopProvider: Wf,
  CheckoutCancelPage: QC,
  CheckoutForm: gp,
  CheckoutLayout: fp,
  CheckoutProvider: dd,
  CheckoutReceipt: ga,
  CheckoutSuccessPage: GC,
  CheckoutTemplate: iN,
  Dialog: os,
  DialogClose: eS,
  DialogContent: na,
  DialogDescription: ss,
  DialogFooter: fm,
  DialogHeader: is,
  DialogOverlay: as,
  DialogPortal: pm,
  DialogTitle: ra,
  DialogTrigger: Xk,
  EmptyState: tr,
  ErrorBoundary: MS,
  ErrorState: Kt,
  FAQItem: cp,
  FAQList: OC,
  FilterPanel: Po,
  Input: Ye,
  InventoryVerificationDialog: vp,
  Label: ht,
  OrderCard: _p,
  OrderDetails: kp,
  OrderList: xp,
  OrderReview: wp,
  PaymentStep: bp,
  Price: fa,
  ProductCard: lp,
  ProductGallery: vs,
  ProductGrid: ha,
  ProductTemplate: oN,
  PromoCodeInput: Ns,
  PurchaseHistoryTemplate: sN,
  QuantitySelector: ws,
  QuickViewDialog: _s,
  ReceiptTemplate: uN,
  SearchInput: ks,
  Select: Co,
  SelectContent: Dr,
  SelectGroup: Mk,
  SelectItem: Lr,
  SelectTrigger: Mr,
  SelectValue: No,
  Separator: Et,
  Sheet: oa,
  SheetClose: hm,
  SheetContent: Br,
  SheetDescription: ym,
  SheetHeader: ia,
  SheetOverlay: cs,
  SheetPortal: gm,
  SheetTitle: sa,
  SheetTrigger: aa,
  ShippingMethodSelector: hp,
  ShopTemplate: tN,
  Skeleton: Ve,
  SubscriptionTemplate: pN,
  Tabs: gs,
  TabsContent: rp,
  TabsList: ma,
  TabsTrigger: $r,
  ToastProvider: dC,
  VariantSelector: bs,
  createMockCommerceAdapter: Gf,
  createPaywallCommerceAdapter: Xf,
  parseCheckoutReturn: Mi,
  readCatalogUrlState: Li,
  useAIRelatedProducts: yd,
  useCart: jt,
  useCartInventory: zi,
  useCatalogUrlSync: $i,
  useCategories: Oi,
  useCedrosPayCheckoutAdapter: fN,
  useCedrosShop: je,
  useCheckout: Bo,
  useCheckoutResultFromUrl: Di,
  useHoldExpiry: Gb,
  useInventoryVerification: hd,
  useOptionalToast: pa,
  useOrders: md,
  usePaymentMethodsConfig: gd,
  useProduct: ud,
  useProducts: jo,
  useShippingMethods: fd,
  useStandaloneCheckout: Fb,
  useStorefrontSettings: ar,
  useSubscriptionData: pd,
  useToast: lC,
  validateCommerceAdapterContract: Jb
}, Symbol.toStringTag, { value: "Module" }));
export {
  Jp as C,
  Yp as P,
  Xp as R,
  bl as S,
  Kp as T,
  TN as a,
  PN as b,
  EN as c,
  Wp as d,
  IN as e,
  RN as f,
  ON as g,
  MN as h,
  Pf as i,
  Ef as j,
  If as k,
  Rf as l,
  CN as m,
  jp as n,
  Up as o,
  NN as p,
  AN as q,
  $N as r,
  zN as s,
  BN as t,
  DN as u,
  LN as v
};
