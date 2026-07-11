import { P as Se, u as G, n as De, l as Z, m as ne, o as ce } from "./CedrosContext-Dlez5itz.mjs";
import { jsx as f, jsxs as S, Fragment as le } from "react/jsx-runtime";
import { useState as N, useCallback as P, useRef as I, useEffect as M, useMemo as L } from "react";
import { g as D, f as Be } from "./fetchWithTimeout-D-qpKB_T.mjs";
import { h as Ie, b as Me, d as Le } from "./constants-DA4fMjXZ.mjs";
import { b as Oe, n as J, c as $e } from "./locales-BNQRXSb3.mjs";
import { Transaction as Ue, Connection as je, PublicKey as T, TransactionInstruction as re, clusterApiUrl as me } from "@solana/web3.js";
import { getAssociatedTokenAddressSync as We, ASSOCIATED_TOKEN_PROGRAM_ID as ze } from "@solana/spl-token";
function cn(e) {
  return !e || !e.coupon_codes ? [] : e.coupon_codes.split(",").map((t) => t.trim()).filter((t) => t.length > 0);
}
function ln(e, t = ", ") {
  return e.join(t);
}
function un(e, t) {
  return e <= 0 ? 0 : (e - t) / e * 100;
}
function dn(e, t) {
  if (!t || t.length === 0)
    return e;
  let n = e, s = 0;
  for (const r of t)
    if (r.discountType === "percentage") {
      const a = 1 - r.discountValue / 100;
      n = n * a;
    } else r.discountType === "fixed" && (s += r.discountValue);
  return n = n - s, n < 0 && (n = 0), Math.ceil(n * 100) / 100;
}
function Fe(e) {
  return !!(e && e.length > 0 && (e.length > 1 || e.length === 1 && (e[0].quantity ?? 1) > 1));
}
const V = /* @__PURE__ */ new Map(), ue = /* @__PURE__ */ new Map(), U = /* @__PURE__ */ new Map(), oe = 1e3, Pe = 200, pe = 2e3;
function qe(e) {
  const t = U.get(e);
  return t ? Date.now() < t ? !0 : (U.delete(e), !1) : !1;
}
function He(e, t = Pe) {
  const n = Date.now() + t;
  if (U.set(e, n), U.size > oe) {
    const s = Array.from(U.keys()).slice(0, U.size - oe);
    for (const r of s)
      U.delete(r);
  }
}
function Ye(e, t = pe) {
  const n = V.get(e);
  if (!n)
    return !1;
  const r = Date.now() - n;
  return r < t ? (D().debug(`[Deduplication] Duplicate request blocked: ${e} (${r}ms ago)`), !0) : !1;
}
function Ke(e) {
  if (V.set(e, Date.now()), V.size > oe) {
    const t = Array.from(V.keys()).slice(0, V.size - oe);
    for (const n of t)
      V.delete(n);
  }
}
function Ve(e) {
  return ue.get(e) || null;
}
function Ge(e, t) {
  ue.set(e, t);
  const n = () => {
    ue.delete(e), Ke(e);
  };
  return t.then(n, n), t;
}
async function Qe(e, t, n = {}) {
  const { windowMs: s = pe, throwOnDuplicate: r = !0 } = n, a = Ve(e);
  if (a)
    return D().debug(`[Deduplication] Reusing in-flight request: ${e}`), a;
  if (Ye(e, s)) {
    if (r)
      throw new Error(`Duplicate request blocked: ${e}`);
    D().warn(`[Deduplication] Duplicate request blocked but not throwing: ${e}`);
    return;
  }
  const y = t();
  return Ge(e, y);
}
function Ce(e, t, n = {}) {
  const { cooldownMs: s = Pe, deduplicationWindowMs: r = pe } = n;
  return async () => {
    if (qe(e)) {
      D().debug(`[Deduplication] Button in cooldown: ${e}`);
      return;
    }
    He(e, s), await Qe(
      e,
      async () => {
        const a = t();
        a instanceof Promise && await a;
      },
      { windowMs: r, throwOnDuplicate: !1 }
    );
  };
}
const W = {
  PAYMENT_START: "cedros:payment:start",
  WALLET_CONNECT: "cedros:wallet:connect",
  WALLET_CONNECTED: "cedros:wallet:connected",
  WALLET_ERROR: "cedros:wallet:error",
  PAYMENT_PROCESSING: "cedros:payment:processing",
  PAYMENT_SUCCESS: "cedros:payment:success",
  PAYMENT_ERROR: "cedros:payment:error"
};
function z(e, t) {
  if (typeof window > "u")
    return;
  const n = new CustomEvent(e, {
    detail: t,
    bubbles: !0,
    cancelable: !1
  });
  window.dispatchEvent(n);
}
function _e(e, t) {
  if (typeof window > "u")
    return;
  const n = window.cedrosAnalytics?.trackExtensionEvent;
  if (typeof n == "function")
    try {
      n({ extensionId: Me, eventId: e, metadata: t });
    } catch {
    }
}
function Xe(e) {
  switch (e) {
    case "stripe":
      return "stripe";
    case "crypto":
      return "x402";
    case "credits":
      return "credits";
    default:
      return "unknown";
  }
}
function Je(e) {
  const t = String(e).toLowerCase();
  return t.includes("walletconnect") ? "walletconnect" : t.includes("phantom") || t.includes("solflare") || t.includes("backpack") ? "browser-wallet" : "unknown";
}
function ve(e, t, n) {
  z(W.PAYMENT_START, {
    timestamp: Date.now(),
    method: e,
    resource: t,
    itemCount: n
  }), _e(Le, {
    sourceSurface: "checkout-block",
    paymentRail: Xe(e),
    amountBucket: "unknown"
  });
}
function pn(e) {
  z(W.WALLET_CONNECT, {
    timestamp: Date.now(),
    wallet: e
  });
}
function fn(e, t) {
  z(W.WALLET_CONNECTED, {
    timestamp: Date.now(),
    wallet: e,
    publicKey: t
  }), _e(Ie, {
    sourceSurface: "checkout-block",
    walletProviderKind: Je(e),
    network: "solana"
  });
}
function mn(e, t) {
  z(W.WALLET_ERROR, {
    timestamp: Date.now(),
    wallet: t,
    error: e
  });
}
function ke(e, t, n) {
  z(W.PAYMENT_PROCESSING, {
    timestamp: Date.now(),
    method: e,
    resource: t,
    itemCount: n
  });
}
function Ee(e, t, n, s) {
  z(W.PAYMENT_SUCCESS, {
    timestamp: Date.now(),
    method: e,
    transactionId: t,
    resource: n,
    itemCount: s
  });
}
function de(e, t, n, s) {
  z(W.PAYMENT_ERROR, {
    timestamp: Date.now(),
    method: e,
    error: t,
    resource: n,
    itemCount: s
  });
}
function gn(e) {
  return e instanceof Se && e.canRetry();
}
function hn(e) {
  return e instanceof Se ? e.getUserMessage() : e instanceof Error ? e.message : String(e);
}
function Ze(e) {
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
function et(e) {
  try {
    const t = new URL(e);
    return `${t.protocol}//${t.host}`;
  } catch {
    return e;
  }
}
function tt(e = {}) {
  const {
    solanaCluster: t = "mainnet-beta",
    solanaEndpoint: n,
    customRpcProviders: s = [],
    allowUnsafeScripts: r = !1,
    additionalScriptSrc: a = [],
    additionalConnectSrc: y = [],
    additionalFrameSrc: g = [],
    includeStripe: b = !0,
    includeSolana: u = !0
  } = e;
  r && console.warn(
    "[CedrosPay] SECURITY WARNING: allowUnsafeScripts is enabled. This adds 'unsafe-inline' and 'unsafe-eval' to script-src, which significantly weakens CSP protection against XSS attacks. Only use this in development or if absolutely required by your framework."
  );
  const d = ["'self'"];
  r && d.push("'unsafe-inline'", "'unsafe-eval'"), b && d.push("https://js.stripe.com"), d.push(...a);
  const m = ["'self'"];
  if (b && m.push("https://api.stripe.com", "https://*.stripe.com"), u) {
    const c = Ze(t);
    if (m.push(c), n) {
      const i = et(n);
      m.includes(i) || m.push(i);
    }
    s.forEach((i) => {
      m.includes(i) || m.push(i);
    });
  }
  m.push(...y);
  const o = ["'self'"];
  return b && o.push("https://js.stripe.com", "https://checkout.stripe.com"), o.push(...g), {
    scriptSrc: d,
    connectSrc: m,
    frameSrc: o
  };
}
function nt(e, t = "header") {
  const { scriptSrc: n, connectSrc: s, frameSrc: r } = e;
  switch (t) {
    case "header":
    case "meta":
    case "nextjs":
    case "nginx": {
      const a = [];
      return n.length > 0 && a.push(`script-src ${n.join(" ")}`), s.length > 0 && a.push(`connect-src ${s.join(" ")}`), r.length > 0 && a.push(`frame-src ${r.join(" ")}`), a.join("; ");
    }
    case "helmet": {
      const a = {};
      return n.length > 0 && (a.scriptSrc = n), s.length > 0 && (a.connectSrc = s), r.length > 0 && (a.frameSrc = r), a;
    }
    case "directives":
      return { scriptSrc: n, connectSrc: s, frameSrc: r };
    default:
      throw new Error(`Unknown CSP format: ${t}`);
  }
}
function yn(e = {}, t = "header") {
  const n = tt(e);
  return nt(n, t);
}
const bn = {
  HELIUS: "https://*.helius-rpc.com",
  QUICKNODE: "https://*.quicknode.pro",
  ALCHEMY: "https://*.alchemy.com",
  ANKR: "https://rpc.ankr.com",
  TRITON: "https://*.rpcpool.com"
}, wn = {
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
function rt() {
  const { config: e } = G(), [t, n] = N(!1), [s, r] = N(null), [a, y] = N(null);
  return { checkCompliance: P(
    async (b, u, d) => {
      n(!0), y(null), r(null);
      try {
        const o = `${e.serverUrl || window.location.origin}/paywall/v1/compliance-check`, c = { "Content-Type": "application/json" };
        u && (c.Authorization = `Bearer ${u}`);
        const i = await Be(o, {
          method: "POST",
          headers: c,
          body: JSON.stringify({ resources: b, ...d ? { wallet: d } : {} })
        });
        if (!i.ok) {
          const p = await De(i, "Compliance check failed");
          throw new Error(p);
        }
        const l = await i.json();
        return r(l), l;
      } catch (m) {
        const o = m instanceof Error ? m.message : "Compliance check failed";
        D().error("[useComplianceCheck]", o), y(o);
        const c = { cleared: !1, reasons: [o] };
        return r(c), c;
      } finally {
        n(!1);
      }
    },
    [e.serverUrl]
  ), loading: t, result: s, error: a };
}
function Sn({
  resources: e,
  onCleared: t,
  onBlocked: n,
  onCancel: s,
  authToken: r,
  wallet: a,
  children: y
}) {
  const g = Z(), { checkCompliance: b, loading: u, result: d, error: m } = rt(), o = I(!1);
  M(() => {
    o.current || e.length === 0 || (o.current = !0, b(e, r, a));
  }, [e, r, a, b]), M(() => {
    d && (d.cleared ? t() : d.reasons?.length && n?.(d.reasons));
  }, [d, t, n]);
  const c = g.unstyled ? "" : `${g.className} cedros-theme__compliance-gate`, i = g.unstyled ? {} : g.style;
  return u || !d ? /* @__PURE__ */ f("div", { className: c, style: i, children: y ?? /* @__PURE__ */ f("div", { className: g.unstyled ? "" : "cedros-theme__compliance-checking", children: /* @__PURE__ */ f("p", { children: "Verifying purchase eligibility..." }) }) }) : d.cleared ? null : /* @__PURE__ */ f("div", { className: c, style: i, children: /* @__PURE__ */ S("div", { className: g.unstyled ? "" : "cedros-theme__compliance-blocked", children: [
    /* @__PURE__ */ f("h3", { children: "Purchase Not Available" }),
    /* @__PURE__ */ f("ul", { children: d.reasons?.map((l, p) => /* @__PURE__ */ f("li", { children: l }, p)) }),
    m && /* @__PURE__ */ f("p", { className: g.unstyled ? "" : "cedros-theme__error", children: m }),
    s && /* @__PURE__ */ f(
      "button",
      {
        type: "button",
        onClick: s,
        className: g.unstyled ? "" : "cedros-theme__button",
        children: "Go back"
      }
    )
  ] }) });
}
function st(e) {
  const { creditsBalanceManager: t } = G(), [n, s] = N({
    available: 0,
    held: 0,
    currency: "",
    loading: !1,
    error: null
  }), r = I(!0);
  M(() => (r.current = !0, () => {
    r.current = !1;
  }), []);
  const a = P(async () => {
    if (e) {
      s((y) => ({ ...y, loading: !0, error: null }));
      try {
        const y = await t.getBalance(e);
        if (!r.current) return;
        s({
          available: y.available,
          held: y.held,
          currency: y.currency,
          loading: !1,
          error: null
        });
      } catch (y) {
        if (!r.current) return;
        s((g) => ({
          ...g,
          loading: !1,
          error: y instanceof Error ? y.message : "Failed to fetch balance"
        }));
      }
    }
  }, [e, t]);
  return M(() => {
    a();
  }, [a]), { ...n, refresh: a };
}
function Pn({
  authToken: e,
  className: t = "",
  formatBalance: n,
  showHeld: s = !1
}) {
  const r = Z(), { available: a, held: y, currency: g, loading: b, error: u, refresh: d } = st(e), m = r.unstyled ? t : `${r.className} cedros-theme__credits-balance ${t}`.trim();
  if (!e)
    return null;
  const o = n ? n(a, g) : `${a} ${g}`;
  return /* @__PURE__ */ S("div", { className: m, style: r.unstyled ? {} : r.style, children: [
    /* @__PURE__ */ f("div", { className: r.unstyled ? "" : "cedros-theme__credits-balance-amount", children: b ? "Loading…" : o }),
    s && y > 0 && !b && /* @__PURE__ */ S("div", { className: r.unstyled ? "" : "cedros-theme__credits-balance-held", children: [
      y,
      " ",
      g,
      " held"
    ] }),
    u && /* @__PURE__ */ f("div", { className: r.unstyled ? "" : "cedros-theme__error", children: u }),
    !b && /* @__PURE__ */ f(
      "button",
      {
        type: "button",
        onClick: d,
        className: r.unstyled ? "" : "cedros-theme__credits-balance-refresh",
        "aria-label": "Refresh balance",
        children: "↻"
      }
    )
  ] });
}
function Cn({
  product: e,
  paymentMethod: t,
  showOriginalPrice: n = !1,
  className: s = "",
  style: r = {}
}) {
  const a = t === "stripe", y = a ? e.fiatAmount : e.cryptoAmount, g = a ? e.effectiveFiatAmount : e.effectiveCryptoAmount, b = a ? e.fiatCurrency.toUpperCase() : e.cryptoToken, u = a ? e.hasStripeCoupon : e.hasCryptoCoupon, d = a ? e.stripeDiscountPercent : e.cryptoDiscountPercent;
  return /* @__PURE__ */ S("div", { className: s, style: r, children: [
    n && u && /* @__PURE__ */ S(
      "span",
      {
        style: {
          textDecoration: "line-through",
          opacity: 0.6,
          marginRight: "0.5rem",
          fontSize: "0.875em"
        },
        children: [
          y.toFixed(2),
          " ",
          b
        ]
      }
    ),
    /* @__PURE__ */ S("span", { style: { fontWeight: 600 }, children: [
      g.toFixed(2),
      " ",
      b
    ] }),
    u && d > 0 && /* @__PURE__ */ S(
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
          d,
          "% OFF"
        ]
      }
    )
  ] });
}
function _n({
  product: e,
  paymentMethod: t,
  className: n = "",
  style: s = {}
}) {
  const r = t === "stripe", a = r ? e.hasStripeCoupon : e.hasCryptoCoupon, y = r ? e.stripeDiscountPercent : e.cryptoDiscountPercent, g = r ? e.stripeCouponCode : e.cryptoCouponCode;
  if (!a || y === 0)
    return null;
  const b = r ? `${y}% off with card!` : `${y}% off with crypto!`;
  return /* @__PURE__ */ S(
    "div",
    {
      className: n,
      style: {
        display: "inline-flex",
        alignItems: "center",
        padding: "0.5rem 0.75rem",
        backgroundColor: r ? "#6366f1" : "#10b981",
        color: "white",
        borderRadius: "0.375rem",
        fontSize: "0.875rem",
        fontWeight: 600,
        ...s
      },
      children: [
        b,
        g && /* @__PURE__ */ S(
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
              g,
              ")"
            ]
          }
        )
      ]
    }
  );
}
function ot() {
  const { subscriptionManager: e } = G(), [t, n] = N({
    status: "idle",
    error: null,
    sessionId: null,
    subscriptionStatus: null,
    expiresAt: null
  }), s = I(!1), r = P(
    async (b) => {
      if (s.current)
        return { success: !1, error: "Payment already in progress" };
      s.current = !0, n((u) => ({
        ...u,
        status: "loading",
        error: null
      }));
      try {
        const u = await e.processSubscription(b);
        return n((d) => ({
          ...d,
          status: u.success ? "success" : "error",
          error: u.success ? null : u.error || "Subscription failed",
          sessionId: u.success && u.transactionId || null
        })), u;
      } catch (u) {
        const d = ne(u, "Subscription failed");
        return n((m) => ({
          ...m,
          status: "error",
          error: d
        })), { success: !1, error: d };
      } finally {
        s.current = !1;
      }
    },
    [e]
  ), a = P(
    async (b) => {
      n((u) => ({
        ...u,
        status: "checking",
        error: null
      }));
      try {
        const u = await e.checkSubscriptionStatus(b);
        return n((d) => ({
          ...d,
          status: u.active ? "success" : "idle",
          subscriptionStatus: u.status,
          expiresAt: u.expiresAt || u.currentPeriodEnd || null
        })), u;
      } catch (u) {
        const d = u instanceof Error ? u.message : "Failed to check subscription status";
        throw n((m) => ({
          ...m,
          status: "error",
          error: d
        })), u;
      }
    },
    [e]
  ), y = P(
    async (b, u, d) => {
      n((m) => ({
        ...m,
        status: "loading",
        error: null
      }));
      try {
        const m = await e.requestSubscriptionQuote(
          b,
          u,
          d
        );
        return n((o) => ({
          ...o,
          status: "idle"
        })), m;
      } catch (m) {
        const o = m instanceof Error ? m.message : "Failed to get subscription quote";
        throw n((c) => ({
          ...c,
          status: "error",
          error: o
        })), m;
      }
    },
    [e]
  ), g = P(() => {
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
    requestQuote: y,
    reset: g
  };
}
const at = "CEDROS PAY - Translation Source File (English)", it = "1.0.0", ct = "en", lt = { pay_with_card: "Pay with Card", pay_with_crypto: "Pay with USDC", pay_with_usdc: "Pay with USDC", pay_with_credits: "Pay with Credits", purchase: "Purchase", card: "Card", usdc_solana: "USDC (Solana)", crypto: "Crypto", credits: "Credits", connect_wallet: "Connect Wallet", connecting: "Connecting...", processing: "Processing...", loading: "Loading...", close: "Close", cancel: "Cancel", confirm: "Confirm", retry: "Try Again", go_back: "Go Back", contact_support: "Contact Support", disconnect: "Disconnect", payment_successful: "Payment successful!", subscribe: "Subscribe", subscribe_with_crypto: "Subscribe with USDC", subscribe_with_credits: "Subscribe with Credits", subscribed: "Subscribed", subscribed_until: "Subscribed until", subscription_active: "Your subscription is active!", redirecting_to_checkout: "Redirecting to checkout..." }, ut = { invalid_payment_proof: { message: "Payment verification failed", action: "Please try your payment again. If this continues, contact support." }, invalid_signature: { message: "Transaction signature is invalid", action: "Please approve the transaction in your wallet and try again." }, invalid_transaction: { message: "Transaction format is invalid", action: "Please try your payment again. If this continues, try updating your wallet app." }, transaction_not_found: { message: "Transaction not found on the blockchain", action: "Your transaction may still be processing. Please wait a moment and check your wallet, or try again." }, transaction_not_confirmed: { message: "Transaction is still processing", action: "Please wait a moment for the blockchain to confirm your transaction, then try again." }, transaction_failed: { message: "Transaction failed on the blockchain", action: "Check your wallet for details. You may need to adjust your transaction settings or add more SOL for fees." }, transaction_expired: { message: "Transaction took too long to process", action: "Please try your payment again. Consider increasing transaction priority if your wallet supports it." }, invalid_recipient: { message: "Payment was sent to the wrong address", action: "Please try again and ensure you approve the correct transaction in your wallet." }, invalid_sender: { message: "Payment sender wallet is invalid", action: "Please reconnect your wallet and try again." }, unauthorized_refund_issuer: { message: "You are not authorized to issue refunds", action: "Only authorized accounts can process refunds. Please contact support if you believe this is an error." }, amount_below_minimum: { message: "Payment amount is too low", action: "Please check the required amount and try again." }, amount_mismatch: { message: "Payment amount does not match the quote", action: "The price may have changed. Please refresh and try your payment again." }, insufficient_funds_sol: { message: "Not enough SOL for transaction fees", action: "Add at least 0.001 SOL to your wallet to cover network fees, then try again." }, insufficient_funds_token: { message: "Insufficient balance in your wallet", action: "Add more funds to your wallet and try again." }, invalid_token_mint: { message: "Incorrect payment token", action: "Please pay with the correct token as shown in the payment details." }, not_spl_transfer: { message: "Transaction is not a valid token transfer", action: "Please ensure you are sending the correct token type from your wallet." }, missing_token_account: { message: "Token account not found", action: "Your wallet may need to create a token account first. Try again or use a different wallet." }, invalid_token_program: { message: "Invalid token program", action: "Please try your payment again. If this continues, try using a different wallet." }, missing_memo: { message: "Payment memo is required but was not included", action: "Please try your payment again and ensure transaction details are approved in your wallet." }, invalid_memo: { message: "Payment memo format is invalid", action: "Please try your payment again." }, payment_already_used: { message: "This payment has already been processed", action: "Check your transaction history. If you need to make another payment, please start a new transaction." }, signature_reused: { message: "Transaction signature has already been used", action: "Please create a new payment transaction." }, quote_expired: { message: "Payment quote has expired", action: "Prices are updated frequently. Please refresh and try your payment again." }, missing_field: { message: "Required information is missing", action: "Please check all required fields and try again." }, invalid_field: { message: "Some information is invalid", action: "Please check your input and try again." }, invalid_amount: { message: "Payment amount is invalid", action: "Please check the amount and try again." }, invalid_wallet: { message: "Wallet address is invalid", action: "Please reconnect your wallet and try again." }, invalid_resource: { message: "Invalid item selection", action: "Please refresh the page and try again." }, invalid_coupon: { message: "Invalid coupon code", action: "Please check the coupon code and try again." }, invalid_cart_item: { message: "One or more cart items are invalid", action: "Please review your cart and try again." }, empty_cart: { message: "Your cart is empty", action: "Please add items to your cart before checking out." }, resource_not_found: { message: "Item not found", action: "This item may no longer be available. Please refresh and try again." }, cart_not_found: { message: "Shopping cart not found", action: "Your cart may have expired. Please start a new order." }, refund_not_found: { message: "Refund not found", action: "Please check your refund reference number or contact support." }, product_not_found: { message: "Product not available", action: "This product may no longer be available. Please browse our current selection." }, coupon_not_found: { message: "Coupon code not found", action: "Please check the coupon code or remove it to continue." }, session_not_found: { message: "Payment session expired", action: "Please start a new payment." }, cart_already_paid: { message: "This order has already been paid", action: "Check your order history. If you need to make another purchase, please start a new order." }, refund_already_processed: { message: "This refund has already been processed", action: "Check your transaction history or contact support for details." }, coupon_expired: { message: "Coupon has expired", action: "Please remove the coupon code or use a different code." }, coupon_usage_limit_reached: { message: "Coupon usage limit reached", action: "This coupon has been fully redeemed. Please try a different code." }, coupon_not_applicable: { message: "Coupon cannot be applied to this purchase", action: "Please check the coupon terms or remove it to continue." }, coupon_wrong_payment_method: { message: "Coupon not valid for this payment method", action: "Try a different payment method or remove the coupon code." }, stripe_error: { message: "Card payment service temporarily unavailable", action: "Please try again in a moment, or use cryptocurrency payment instead." }, rpc_error: { message: "Blockchain network temporarily unavailable", action: "Please try again in a moment, or use card payment instead." }, network_error: { message: "Network connection issue", action: "Please check your internet connection and try again." }, internal_error: { message: "Something went wrong on our end", action: "Please try again. If this continues, contact support." }, database_error: { message: "Service temporarily unavailable", action: "Please try again in a moment." }, config_error: { message: "Service configuration error", action: "Please contact support for assistance." }, unknown_error: { message: "An unexpected error occurred", action: "Please try again or contact support if this continues." } }, dt = { unknown_token_mint: "Warning: Unrecognized token mint address. Double-check this is the correct token to avoid loss of funds.", token_typo_warning: "Token address does not match known stablecoins (USDC, USDT, PYUSD, CASH). Verify carefully to prevent permanent loss of funds." }, pt = { no_wallet_detected: "No Solana wallet detected", install_wallet: "Please install a Solana wallet like Phantom, Solflare, or Backpack.", wallet_not_connected: "Wallet not connected", connect_your_wallet: "Please connect your wallet to continue.", wallet_connection_failed: "Failed to connect wallet", try_again: "Please try connecting again.", transaction_rejected: "Transaction was rejected", approve_in_wallet: "Please approve the transaction in your wallet to continue.", select_wallet: "Select Wallet", change: "Change Wallet" }, fe = {
  comment: at,
  version: it,
  locale: ct,
  ui: lt,
  errors: ut,
  validation: dt,
  wallet: pt
}, se = fe, Te = /* @__PURE__ */ Object.assign({
  "./translations/ar.json": () => import("./ar--Fv8PaLT.mjs"),
  "./translations/bn.json": () => import("./bn-DZV97b14.mjs"),
  "./translations/de.json": () => import("./de-CVAXvz_Q.mjs"),
  "./translations/es.json": () => import("./es-BZSbOKMf.mjs"),
  "./translations/fil.json": () => import("./fil-C8JkGpni.mjs"),
  "./translations/fr.json": () => import("./fr-D7oyxgrz.mjs"),
  "./translations/he.json": () => import("./he-Bd5tm0J-.mjs"),
  "./translations/hi.json": () => import("./hi-B3cTZmT2.mjs"),
  "./translations/id.json": () => import("./id-4VKRyHwp.mjs"),
  "./translations/it.json": () => import("./it-BEzF96VR.mjs"),
  "./translations/ja.json": () => import("./ja-BECl7gAT.mjs"),
  "./translations/ko.json": () => import("./ko-CjfFWcsT.mjs"),
  "./translations/ms.json": () => import("./ms-CaM7QQlQ.mjs"),
  "./translations/nl.json": () => import("./nl-D5UUJF6p.mjs"),
  "./translations/pa.json": () => import("./pa-BqA9Ms5v.mjs"),
  "./translations/pl.json": () => import("./pl-W95mHfo_.mjs"),
  "./translations/pt.json": () => import("./pt-BvxJnQY6.mjs"),
  "./translations/ru.json": () => import("./ru-DndULq4N.mjs"),
  "./translations/ta.json": () => import("./ta-Bx0x3E-4.mjs"),
  "./translations/th.json": () => import("./th-BW0aJ0nQ.mjs"),
  "./translations/tr.json": () => import("./tr-QVhc1sut.mjs"),
  "./translations/uk.json": () => import("./uk-DFhZrR_-.mjs"),
  "./translations/ur.json": () => import("./ur-BRScDp0g.mjs"),
  "./translations/vi.json": () => import("./vi-CsMu3r3w.mjs"),
  "./translations/zh.json": () => import("./zh-C9LR9Q1y.mjs")
}), K = /* @__PURE__ */ new Map();
let te = null;
async function xe(e) {
  const t = J(e);
  if (K.has(e))
    return K.get(e);
  if (t === "en")
    return K.set(e, se), K.set("en", se), se;
  try {
    const n = Te[`./translations/${e}.json`];
    if (!n)
      return null;
    const r = (await n()).default;
    return K.set(e, r), K.set(J(r.locale), r), r;
  } catch {
    return null;
  }
}
async function ft(e) {
  for (const t of $e(e)) {
    const n = await xe(t);
    if (n)
      return n;
  }
  return null;
}
function mt(e, t) {
  return {
    ...e,
    ...t,
    ui: { ...e.ui, ...t.ui },
    errors: { ...e.errors, ...t.errors },
    validation: { ...e.validation, ...t.validation },
    wallet: { ...e.wallet, ...t.wallet }
  };
}
async function vn() {
  if (te)
    return te;
  const e = ["en"];
  for (const t in Te) {
    const n = t.match(/\.\/translations\/([a-z]{2,3}(?:-[A-Z]{2})?)\.json$/);
    n && e.push(J(n[1]));
  }
  return te = e.length > 0 ? Array.from(new Set(e)).sort() : ["en"], te;
}
function gt() {
  return Oe();
}
async function ht(e) {
  const t = J(e), n = await xe("en") ?? se, s = await ft(t);
  return s ? mt(n, s) : n;
}
function ge(e, t) {
  const n = t.split(".");
  let s = e;
  for (const r of n)
    if (s && typeof s == "object" && r in s)
      s = s[r];
    else
      return;
  return s;
}
function he(e, t = fe) {
  return (n, s) => {
    const r = ge(e, n) ?? ge(t, n);
    return typeof r != "string" ? n : s ? Object.entries(s).reduce(
      (a, [y, g]) => a.replace(new RegExp(`\\{${y}\\}`, "g"), String(g)),
      r
    ) : r;
  };
}
function kn(e, t, n = !0) {
  const s = t.errors[e];
  if (!s) {
    const r = ce(e);
    return n && r.action ? `${r.message} ${r.action}` : r.message;
  }
  return n && s.action ? `${s.message} ${s.action}` : s.message;
}
const ye = fe;
function Re(e) {
  const [t, n] = N(null), [s, r] = N(!0), a = L(() => J(e || gt()), [e]);
  return M(() => {
    let g = !1;
    return (async () => {
      r(!0);
      try {
        const u = await ht(a);
        g || (n(u), r(!1));
      } catch (u) {
        console.error("[CedrosPay] Failed to load translations:", u), g || r(!1);
      }
    })(), () => {
      g = !0;
    };
  }, [a]), {
    t: L(() => t ? he(t, ye) : he(ye), [t]),
    locale: a,
    isLoading: s,
    translations: t
  };
}
function En(e, t = !0) {
  const { translations: n } = Re();
  if (!n) {
    const r = ce(e);
    return t && r.action ? `${r.message} ${r.action}` : r.message;
  }
  const s = n.errors[e];
  if (!s) {
    const r = ce(e);
    return t && r.action ? `${r.message} ${r.action}` : r.message;
  }
  return t && s.action ? `${s.message} ${s.action}` : s.message;
}
function Ae() {
  const e = G();
  return Re(e.config?.locale);
}
function Tn({
  resource: e,
  interval: t,
  intervalDays: n,
  trialDays: s,
  successUrl: r,
  cancelUrl: a,
  customerEmail: y,
  label: g,
  disabled: b = !1,
  onAttempt: u,
  onSuccess: d,
  onError: m,
  className: o = ""
}) {
  const { status: c, error: i, sessionId: l, processSubscription: p } = ot(), h = Z(), { t: _, translations: v } = Ae(), k = g || _("ui.subscribe"), R = h.unstyled ? o : `${h.className} cedros-theme__stripe-button ${o}`.trim(), O = i && typeof i != "string" ? i?.code ?? null : null, B = i ? typeof i == "string" ? i : ((C) => {
    if (!C || !v) return "";
    const x = v.errors[C];
    return x ? x.action ? `${x.message} ${x.action}` : x.message : "";
  })(O) : null, F = P(async () => {
    D().debug("[SubscribeButton] executeSubscription:", {
      resource: e,
      interval: t,
      intervalDays: n,
      trialDays: s
    }), ve("stripe", e), u && u("stripe"), ke("stripe", e);
    const C = await p({
      resource: e,
      interval: t,
      intervalDays: n,
      trialDays: s,
      customerEmail: y,
      successUrl: r,
      cancelUrl: a
    });
    C.success && C.transactionId ? (Ee("stripe", C.transactionId, e), d && d(C.transactionId)) : !C.success && C.error && (de("stripe", C.error, e), m && m(C.error));
  }, [
    e,
    t,
    n,
    s,
    y,
    r,
    a,
    p,
    u,
    d,
    m
  ]), X = L(() => `subscribe-${e}-${t}`, [e, t]), q = L(
    () => Ce(X, F),
    [X, F]
  ), A = c === "loading", H = b || A;
  return /* @__PURE__ */ S("div", { className: R, style: h.unstyled ? {} : h.style, children: [
    /* @__PURE__ */ f(
      "button",
      {
        onClick: q,
        disabled: H,
        className: h.unstyled ? o : "cedros-theme__button cedros-theme__stripe",
        type: "button",
        children: A ? _("ui.processing") : k
      }
    ),
    B && /* @__PURE__ */ f("div", { className: h.unstyled ? "" : "cedros-theme__error", children: B }),
    l && /* @__PURE__ */ f("div", { className: h.unstyled ? "" : "cedros-theme__success", children: _("ui.redirecting_to_checkout") })
  ] });
}
function yt() {
  const { subscriptionManager: e, creditsSubscriptionManager: t } = G(), [n, s] = N({
    status: "idle",
    error: null,
    sessionId: null,
    subscriptionStatus: null,
    expiresAt: null,
    creditsRequirement: null
  }), r = I(!1), a = I(null), y = P(
    async (d, m) => {
      a.current = m, s((o) => ({
        ...o,
        status: "checking",
        error: null
      }));
      try {
        const o = await e.checkSubscriptionStatus({
          resource: d,
          userId: m
        });
        return s((c) => ({
          ...c,
          status: o.active ? "success" : "idle",
          subscriptionStatus: o.status,
          expiresAt: o.expiresAt || o.currentPeriodEnd || null
        })), o;
      } catch (o) {
        const c = ne(o, "Failed to check subscription status");
        return s((i) => ({
          ...i,
          status: "error",
          error: c
        })), null;
      }
    },
    [e]
  ), g = P(
    async (d, m, o) => {
      s((c) => ({
        ...c,
        status: "loading",
        error: null
      }));
      try {
        const c = await t.requestQuote(
          d,
          o?.couponCode
        );
        return s((i) => ({
          ...i,
          status: "idle",
          creditsRequirement: c
        })), c;
      } catch (c) {
        const i = ne(c, "Failed to get subscription quote");
        return s((l) => ({
          ...l,
          status: "error",
          error: i
        })), null;
      }
    },
    [t]
  ), b = P(
    async (d, m, o, c) => {
      if (r.current)
        return { success: !1, error: "Payment already in progress" };
      if (!o) {
        const i = "Authentication required for credits payment";
        return s((l) => ({ ...l, status: "error", error: i })), { success: !1, error: i };
      }
      r.current = !0, s((i) => ({
        ...i,
        status: "loading",
        error: null
      }));
      try {
        const i = c?.userId ?? a.current;
        if (!i) throw new Error("User identity is required for credits subscriptions");
        const l = await t.processSubscription(
          d,
          m,
          o,
          i,
          c
        );
        return l.success ? s({
          status: "success",
          error: null,
          sessionId: l.transactionId || null,
          subscriptionStatus: "active",
          expiresAt: null,
          // Will be updated on next status check
          creditsRequirement: null
        }) : s((p) => ({
          ...p,
          status: "error",
          error: l.error || "Credits subscription payment failed"
        })), l;
      } catch (i) {
        const l = ne(i, "Credits subscription payment failed");
        return s((p) => ({
          ...p,
          status: "error",
          error: l
        })), { success: !1, error: l };
      } finally {
        r.current = !1;
      }
    },
    [t]
  ), u = P(() => {
    s({
      status: "idle",
      error: null,
      sessionId: null,
      subscriptionStatus: null,
      expiresAt: null,
      creditsRequirement: null
    }), a.current = null;
  }, []);
  return {
    ...n,
    checkStatus: y,
    requestQuote: g,
    processPayment: b,
    reset: u
  };
}
function xn({
  resource: e,
  interval: t,
  intervalDays: n,
  authToken: s,
  userId: r,
  couponCode: a,
  label: y,
  disabled: g = !1,
  onAttempt: b,
  onSuccess: u,
  onError: d,
  className: m = "",
  hideMessages: o = !1,
  autoCheckStatus: c = !1
}) {
  const {
    status: i,
    error: l,
    subscriptionStatus: p,
    expiresAt: h,
    checkStatus: _,
    processPayment: v
  } = yt(), k = Z(), { t: R, translations: O } = Ae(), Q = I(_);
  M(() => {
    Q.current = _;
  }, [_]), M(() => {
    c && r && (D().debug("[CreditsSubscribeButton] Auto-checking subscription status", { resource: e }), Q.current(e, r));
  }, [c, r, e]);
  const B = y || R("ui.subscribe_with_credits") || "Subscribe with Credits", F = l && typeof l != "string" ? l?.code ?? null : null, q = l ? typeof l == "string" ? l : ((w) => {
    if (!w || !O) return "";
    const E = O.errors[w];
    return E ? E.action ? `${E.message} ${E.action}` : E.message : "";
  })(F) : null, A = P(async () => {
    if (D().debug("[CreditsSubscribeButton] executeSubscriptionFlow", {
      resource: e,
      interval: t,
      intervalDays: n,
      hasAuthToken: !!s
    }), ve("credits", e), b && b("credits"), !s) {
      const E = "Authentication required: please log in to subscribe with credits";
      D().error("[CreditsSubscribeButton]", E), de("credits", E, e), d && d(E);
      return;
    }
    if (ke("credits", e), !r) {
      d?.("User identity is required for credits subscriptions");
      return;
    }
    const w = await v(e, t, s, {
      couponCode: a,
      intervalDays: n,
      userId: r
    });
    w.success && w.transactionId ? (Ee("credits", w.transactionId, e), u && u(w.transactionId)) : !w.success && w.error && (de("credits", w.error, e), d && d(w.error));
  }, [
    e,
    t,
    n,
    s,
    r,
    a,
    v,
    b,
    u,
    d
  ]), H = L(() => `credits-subscribe-${e}-${t}`, [e, t]), C = L(
    () => Ce(H, A, {
      cooldownMs: 200,
      deduplicationWindowMs: 0
    }),
    [H, A]
  ), x = i === "loading" || i === "checking", Y = p === "active" || p === "trialing", ee = g || x || Y;
  let $ = B;
  if (x)
    $ = R("ui.processing");
  else if (Y && h) {
    const w = new Date(h).toLocaleDateString();
    $ = `${R("ui.subscribed_until")} ${w}`;
  } else Y && ($ = R("ui.subscribed"));
  const ie = k.unstyled ? m : `${k.className} cedros-theme__credits-button ${m}`.trim();
  return /* @__PURE__ */ S("div", { className: ie, style: k.unstyled ? {} : k.style, children: [
    /* @__PURE__ */ f(
      "button",
      {
        onClick: C,
        disabled: ee,
        className: k.unstyled ? m : "cedros-theme__button cedros-theme__credits",
        type: "button",
        children: $
      }
    ),
    !o && q && /* @__PURE__ */ f("div", { className: k.unstyled ? "" : "cedros-theme__error", children: q }),
    !o && Y && /* @__PURE__ */ f("div", { className: k.unstyled ? "" : "cedros-theme__success", children: R("ui.subscription_active") })
  ] });
}
const bt = 12, wt = 13, St = 3, Pt = 6, Ct = 14, _t = "plan", vt = "subscription", kt = "SubscriptionAuthority", Et = "event_authority";
function Tt(e) {
  const t = Rt(e.solana, e.subscriberPublicKey), n = new Ue();
  return n.add(xt(e.action, t)), n.feePayer = t.subscriber, n;
}
async function be(e) {
  const t = e.provider ?? Lt(), n = await Ot(t);
  if (n.toBase58() !== e.solana.wallet)
    throw new Error("Connected wallet does not match this Solana subscription.");
  const s = Tt({
    action: e.action,
    solana: e.solana,
    subscriberPublicKey: n
  }), r = new je(
    $t(e.solana.network, e.rpcEndpoint),
    "confirmed"
  );
  return It(r, t, s);
}
function xt(e, t) {
  switch (e) {
    case "cancel":
      return we(bt, t);
    case "resume":
      return we(wt, t);
    case "revoke":
      return new re({
        programId: t.programId,
        keys: [
          { pubkey: t.subscriber, isSigner: !0, isWritable: !0 },
          { pubkey: t.subscriptionPda, isSigner: !1, isWritable: !0 },
          { pubkey: t.planPda, isSigner: !1, isWritable: !1 }
        ],
        data: Buffer.from([St])
      });
    case "revoke_authority":
      return new re({
        programId: t.programId,
        keys: [
          { pubkey: t.subscriber, isSigner: !0, isWritable: !1 },
          { pubkey: t.subscriberAta, isSigner: !1, isWritable: !0 },
          { pubkey: t.tokenMint, isSigner: !1, isWritable: !1 },
          { pubkey: t.tokenProgram, isSigner: !1, isWritable: !1 }
        ],
        data: Buffer.from([Ct])
      });
    case "close_authority":
      return new re({
        programId: t.programId,
        keys: [
          { pubkey: t.subscriber, isSigner: !0, isWritable: !0 },
          { pubkey: t.subscriptionAuthorityPda, isSigner: !1, isWritable: !0 }
        ],
        data: Buffer.from([Pt])
      });
  }
}
function we(e, t) {
  return new re({
    programId: t.programId,
    keys: [
      { pubkey: t.subscriber, isSigner: !0, isWritable: !1 },
      { pubkey: t.planPda, isSigner: !1, isWritable: !1 },
      { pubkey: t.subscriptionPda, isSigner: !1, isWritable: !0 },
      { pubkey: t.eventAuthorityPda, isSigner: !1, isWritable: !1 },
      { pubkey: t.programId, isSigner: !1, isWritable: !1 }
    ],
    data: Buffer.from([e])
  });
}
function Rt(e, t) {
  const n = new T(e.programAddress), s = t ? jt(t) : new T(e.wallet), r = new T(e.merchantAddress), a = new T(e.tokenMint), y = new T(e.tokenProgramAddress), g = e.planAddress ? new T(e.planAddress) : At(n, r, e.solanaPlanId), b = e.subscriptionAddress ? new T(e.subscriptionAddress) : Nt(n, g, s), u = e.subscriptionAuthorityAddress ? new T(e.subscriptionAuthorityAddress) : Dt(n, s, a), d = e.subscriberTokenAccount ? new T(e.subscriberTokenAccount) : We(
    a,
    s,
    !1,
    y,
    ze
  );
  return {
    programId: n,
    subscriber: s,
    merchant: r,
    tokenMint: a,
    tokenProgram: y,
    planPda: g,
    subscriptionPda: b,
    subscriptionAuthorityPda: u,
    eventAuthorityPda: e.eventAuthorityAddress ? new T(e.eventAuthorityAddress) : Bt(n),
    subscriberAta: d
  };
}
function At(e, t, n) {
  return T.findProgramAddressSync(
    [ae(_t), t.toBuffer(), Wt(n)],
    e
  )[0];
}
function Nt(e, t, n) {
  return T.findProgramAddressSync(
    [ae(vt), t.toBuffer(), n.toBuffer()],
    e
  )[0];
}
function Dt(e, t, n) {
  return T.findProgramAddressSync(
    [ae(kt), t.toBuffer(), n.toBuffer()],
    e
  )[0];
}
function Bt(e) {
  return T.findProgramAddressSync([ae(Et)], e)[0];
}
async function It(e, t, n) {
  const s = await e.getLatestBlockhash("confirmed");
  n.recentBlockhash = s.blockhash;
  const r = await Mt(e, t, n);
  if ((await e.confirmTransaction(
    { signature: r, blockhash: s.blockhash, lastValidBlockHeight: s.lastValidBlockHeight },
    "confirmed"
  )).value.err) throw new Error("Solana subscription transaction failed.");
  return r;
}
async function Mt(e, t, n) {
  if (t.signAndSendTransaction) {
    const r = await t.signAndSendTransaction(n, {
      skipPreflight: !1,
      preflightCommitment: "confirmed"
    }), a = typeof r == "string" ? r : r.signature;
    if (!a) throw new Error("Wallet did not return a Solana transaction signature.");
    return a;
  }
  if (!t.signTransaction)
    throw new Error("Connected Solana wallet cannot sign transactions.");
  const s = await t.signTransaction(n);
  return e.sendRawTransaction(s.serialize(), {
    skipPreflight: !1,
    preflightCommitment: "confirmed"
  });
}
function Lt() {
  const e = globalThis, t = e.solana ?? e.phantom?.solana;
  if (!t) throw new Error("Please install a Solana wallet like Phantom, Solflare, or Backpack.");
  return t;
}
async function Ot(e) {
  const t = await e.connect?.(), n = Ut(t?.publicKey ?? e.publicKey);
  if (!n) throw new Error("Solana wallet did not return a public key.");
  return new T(n);
}
function $t(e, t) {
  return t || (e === "devnet" || e === "testnet" || e === "mainnet-beta" ? me(e) : me("mainnet-beta"));
}
function Ut(e) {
  return e ? typeof e == "string" ? e : typeof e.toBase58 == "function" ? e.toBase58() : null : null;
}
function jt(e) {
  return typeof e == "string" ? new T(e) : e;
}
function ae(e) {
  return Buffer.from(e, "utf8");
}
function Wt(e) {
  const t = Buffer.alloc(8);
  return t.writeBigUInt64LE(BigInt(e)), t;
}
function zt() {
  const { subscriptionChangeManager: e } = G(), [t, n] = N({
    status: "idle",
    error: null,
    subscription: null,
    changePreview: null,
    userId: null
  }), s = I(t);
  s.current = t;
  const r = P(
    async (o, c) => {
      n((i) => ({ ...i, status: "loading", error: null }));
      try {
        const i = await e.getDetails(o, c);
        return n((l) => ({
          ...l,
          status: "success",
          subscription: i,
          userId: c
        })), i;
      } catch (i) {
        const l = i instanceof Error ? i.message : "Failed to load subscription";
        return n((p) => ({ ...p, status: "error", error: l })), null;
      }
    },
    [e]
  ), a = P(
    async (o, c, i, l) => {
      n((p) => ({ ...p, status: "loading", error: null }));
      try {
        const p = {
          currentResource: o,
          newResource: c,
          userId: i,
          newInterval: l
        }, h = await e.previewChange(p);
        return n((_) => ({
          ..._,
          status: "idle",
          changePreview: h
        })), h;
      } catch (p) {
        const h = p instanceof Error ? p.message : "Failed to preview change";
        return n((_) => ({ ..._, status: "error", error: h })), null;
      }
    },
    [e]
  ), y = P(
    async (o) => {
      const { subscription: c, userId: i } = s.current;
      if (!c || !i)
        return n((l) => ({ ...l, status: "error", error: "No subscription loaded" })), null;
      n((l) => ({ ...l, status: "loading", error: null }));
      try {
        const l = {
          subscriptionId: c.id,
          newResource: o.newResource,
          prorationBehavior: o.prorationBehavior
        }, p = await e.changeSubscription(l);
        return p.success ? n((h) => ({
          ...h,
          status: "success",
          subscription: h.subscription ? {
            ...h.subscription,
            resource: p.newResource,
            interval: h.subscription.interval,
            status: p.status,
            currentPeriodEnd: p.currentPeriodEnd
          } : null,
          changePreview: null
        })) : n((h) => ({
          ...h,
          status: "error",
          error: p.error || "Failed to change subscription"
        })), p;
      } catch (l) {
        const p = l instanceof Error ? l.message : "Failed to change subscription";
        return n((h) => ({ ...h, status: "error", error: p })), null;
      }
    },
    [e]
  ), g = P(
    async (o, c) => {
      const { subscription: i, userId: l } = s.current;
      if (!i || !l)
        return n((p) => ({ ...p, status: "error", error: "No subscription loaded" })), null;
      n((p) => ({ ...p, status: "loading", error: null }));
      try {
        if (i.paymentMethod === "solana_subscription") {
          if (!i.solana)
            throw new Error("Missing Solana subscription state.");
          if (o)
            throw new Error("Solana subscriptions cancel at the end of the current on-chain period.");
          const _ = await be({
            action: "cancel",
            solana: i.solana,
            provider: c?.provider,
            rpcEndpoint: c?.rpcEndpoint
          }), v = await e.confirmSolanaLifecycle("cancel", {
            subscriptionId: i.id,
            wallet: i.solana.wallet,
            signature: _
          });
          return n((k) => ({
            ...k,
            status: "success",
            subscription: k.subscription ? {
              ...k.subscription,
              status: v.status,
              cancelAtPeriodEnd: v.cancelAtPeriodEnd,
              currentPeriodEnd: v.currentPeriodEnd,
              solana: k.subscription.solana ? { ...k.subscription.solana, status: v.solanaStatus } : k.subscription.solana
            } : null
          })), { success: v.success, atPeriodEnd: v.cancelAtPeriodEnd };
        }
        const p = {
          subscriptionId: i.id,
          atPeriodEnd: !o
        }, h = await e.cancel(p);
        if (h.success) {
          const _ = h.atPeriodEnd ? i.status : "canceled";
          n((v) => ({
            ...v,
            status: "success",
            subscription: v.subscription ? {
              ...v.subscription,
              status: _,
              cancelAtPeriodEnd: h.atPeriodEnd
            } : null
          }));
        } else
          n((_) => ({
            ..._,
            status: "error",
            error: h.error || "Failed to cancel subscription"
          }));
        return h;
      } catch (p) {
        const h = p instanceof Error ? p.message : "Failed to cancel subscription";
        return n((_) => ({ ..._, status: "error", error: h })), null;
      }
    },
    [e]
  ), b = P(
    async (o, c) => {
      const { subscription: i } = s.current;
      if (!i?.solana || i.paymentMethod !== "solana_subscription")
        return n((l) => ({ ...l, status: "error", error: "No Solana subscription loaded" })), !1;
      n((l) => ({ ...l, status: "loading", error: null }));
      try {
        const l = await be({
          action: o,
          solana: i.solana,
          provider: c?.provider,
          rpcEndpoint: c?.rpcEndpoint
        }), p = await e.confirmSolanaLifecycle(o, {
          subscriptionId: i.id,
          wallet: i.solana.wallet,
          signature: l
        });
        return n((h) => ({
          ...h,
          status: "success",
          subscription: h.subscription ? {
            ...h.subscription,
            status: p.status,
            cancelAtPeriodEnd: p.cancelAtPeriodEnd,
            currentPeriodEnd: p.currentPeriodEnd,
            solana: h.subscription.solana ? { ...h.subscription.solana, status: p.solanaStatus } : h.subscription.solana
          } : null
        })), p.success;
      } catch (l) {
        const p = l instanceof Error ? l.message : "Failed to confirm Solana action";
        return n((h) => ({ ...h, status: "error", error: p })), !1;
      }
    },
    [e]
  ), u = P(
    async (o, c) => {
      const i = s.current.subscription?.customerId ?? (o.startsWith("cus_") ? o : null);
      if (!i)
        return n((l) => ({
          ...l,
          status: "error",
          error: "No Stripe customer ID available for billing portal"
        })), null;
      n((l) => ({ ...l, status: "loading", error: null }));
      try {
        const l = await e.getBillingPortalUrl({
          customerId: i,
          returnUrl: c
        });
        try {
          if (new URL(l.url).protocol !== "https:")
            throw new Error("Billing portal URL must use HTTPS");
        } catch {
          throw new Error("Invalid billing portal URL");
        }
        return window.location.href = l.url, l;
      } catch (l) {
        const p = l instanceof Error ? l.message : "Failed to open billing portal";
        return n((h) => ({ ...h, status: "error", error: p })), null;
      }
    },
    [e]
  ), d = P(() => {
    n((o) => ({ ...o, changePreview: null }));
  }, []), m = P(() => {
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
    loadSubscription: r,
    previewChange: a,
    changeSubscription: y,
    cancelSubscription: g,
    confirmSolanaLifecycle: b,
    openBillingPortal: u,
    clearPreview: d,
    reset: m
  };
}
const Ft = {
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
}, qt = {
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
function Ht(e) {
  const t = e ? qt : Ft;
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
function j(e, t) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: t.toUpperCase()
  }).format(e / 100);
}
function Ne(e) {
  return new Date(e).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}
function Yt(e) {
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
function Kt({
  preview: e,
  onConfirm: t,
  onCancel: n,
  isLoading: s,
  styles: r
}) {
  const a = e.immediateAmount < 0;
  return /* @__PURE__ */ S("div", { className: "cedros-proration-preview", style: r.prorationPreview, children: [
    /* @__PURE__ */ f("h4", { style: r.previewTitle, children: "Change Preview" }),
    /* @__PURE__ */ S("div", { style: r.previewDetails, children: [
      /* @__PURE__ */ S("div", { style: r.previewRow, children: [
        /* @__PURE__ */ f("span", { children: "Current plan:" }),
        /* @__PURE__ */ S("span", { children: [
          j(e.currentPlanPrice, e.currency),
          "/period"
        ] })
      ] }),
      /* @__PURE__ */ S("div", { style: r.previewRow, children: [
        /* @__PURE__ */ f("span", { children: "New plan:" }),
        /* @__PURE__ */ S("span", { children: [
          j(e.newPlanPrice, e.currency),
          "/period"
        ] })
      ] }),
      /* @__PURE__ */ S("div", { style: r.previewRow, children: [
        /* @__PURE__ */ f("span", { children: "Days remaining:" }),
        /* @__PURE__ */ S("span", { children: [
          e.daysRemaining,
          " days"
        ] })
      ] }),
      e.prorationDetails && /* @__PURE__ */ S(le, { children: [
        /* @__PURE__ */ S("div", { style: r.previewRow, children: [
          /* @__PURE__ */ f("span", { children: "Unused credit:" }),
          /* @__PURE__ */ S("span", { children: [
            "-",
            j(e.prorationDetails.unusedCredit, e.currency)
          ] })
        ] }),
        /* @__PURE__ */ S("div", { style: r.previewRow, children: [
          /* @__PURE__ */ f("span", { children: "New plan cost:" }),
          /* @__PURE__ */ f("span", { children: j(e.prorationDetails.newPlanCost, e.currency) })
        ] })
      ] }),
      /* @__PURE__ */ S("div", { style: { ...r.previewRow, ...r.previewTotal }, children: [
        /* @__PURE__ */ f("span", { children: a ? "Credit to account:" : "Amount due now:" }),
        /* @__PURE__ */ f("span", { style: { color: a ? "#22c55e" : "#ef4444" }, children: j(Math.abs(e.immediateAmount), e.currency) })
      ] }),
      /* @__PURE__ */ S("div", { style: r.previewRow, children: [
        /* @__PURE__ */ f("span", { children: "Effective date:" }),
        /* @__PURE__ */ f("span", { children: Ne(e.effectiveDate) })
      ] })
    ] }),
    /* @__PURE__ */ S("div", { style: r.previewActions, children: [
      /* @__PURE__ */ f("button", { onClick: n, style: r.cancelButton, disabled: s, children: "Cancel" }),
      /* @__PURE__ */ f("button", { onClick: t, style: r.confirmButton, disabled: s, children: s ? "Processing..." : "Confirm Change" })
    ] })
  ] });
}
function Rn({
  resource: e,
  userId: t,
  availablePlans: n = [],
  onSubscriptionChanged: s,
  onSubscriptionCanceled: r,
  billingPortalReturnUrl: a,
  showBillingPortal: y = !1,
  solanaProvider: g,
  solanaRpcEndpoint: b,
  className: u,
  style: d
}) {
  const { mode: m } = Z(), o = L(() => Ht(m === "dark"), [m]), {
    subscription: c,
    changePreview: i,
    status: l,
    error: p,
    loadSubscription: h,
    previewChange: _,
    changeSubscription: v,
    cancelSubscription: k,
    confirmSolanaLifecycle: R,
    openBillingPortal: O,
    clearPreview: Q
  } = zt();
  M(() => {
    h(e, t);
  }, [e, t, h]);
  const B = I(null), F = P(
    async (w, E) => {
      B.current = { resource: w, interval: E }, await _(e, w, t, E);
    },
    [e, t, _]
  ), X = P(async () => {
    if (!i) return;
    const w = B.current;
    (await v({
      newResource: w?.resource || e,
      newInterval: w?.interval,
      immediate: !0
    }))?.success && w && w.interval && (s?.(w.resource, w.interval), B.current = null);
  }, [i, e, v, s]), q = P(
    async (w) => {
      (await k(w, {
        provider: g,
        rpcEndpoint: b
      }))?.success && r?.();
    },
    [k, r, g, b]
  ), A = P(
    async (w) => {
      await R(w, {
        provider: g,
        rpcEndpoint: b
      }) && w === "revoke" && r?.();
    },
    [R, r, g, b]
  ), H = P(() => {
    O(t, a);
  }, [t, a, O]), C = l === "loading", x = c?.paymentMethod === "solana_subscription", Y = c ? new Date(c.currentPeriodEnd).getTime() <= Date.now() : !1, ee = c?.solana?.status, $ = !!(x && c?.cancelAtPeriodEnd && Y), ie = !!(x && (ee === "cancelled" || ee === "exhausted"));
  return /* @__PURE__ */ S("div", { className: `cedros-subscription-panel ${u || ""}`, style: { ...o.container, ...d }, children: [
    p && /* @__PURE__ */ f("div", { className: "cedros-subscription-error", style: o.error, children: p }),
    C && !c && /* @__PURE__ */ f("div", { className: "cedros-subscription-loading", style: o.loading, children: "Loading subscription..." }),
    c && /* @__PURE__ */ S(le, { children: [
      /* @__PURE__ */ S("div", { className: "cedros-subscription-details", style: o.details, children: [
        /* @__PURE__ */ f("h3", { style: o.title, children: "Current Subscription" }),
        /* @__PURE__ */ S("div", { style: o.detailRow, children: [
          /* @__PURE__ */ f("span", { style: o.label, children: "Plan:" }),
          /* @__PURE__ */ f("span", { style: o.value, children: c.resource })
        ] }),
        /* @__PURE__ */ S("div", { style: o.detailRow, children: [
          /* @__PURE__ */ f("span", { style: o.label, children: "Status:" }),
          /* @__PURE__ */ f(
            "span",
            {
              style: {
                ...o.statusBadge,
                backgroundColor: Yt(c.status)
              },
              children: c.status
            }
          )
        ] }),
        /* @__PURE__ */ S("div", { style: o.detailRow, children: [
          /* @__PURE__ */ f("span", { style: o.label, children: "Price:" }),
          /* @__PURE__ */ S("span", { style: o.value, children: [
            j(c.pricePerPeriod, c.currency),
            "/",
            c.interval
          ] })
        ] }),
        /* @__PURE__ */ S("div", { style: o.detailRow, children: [
          /* @__PURE__ */ f("span", { style: o.label, children: "Current period ends:" }),
          /* @__PURE__ */ f("span", { style: o.value, children: Ne(c.currentPeriodEnd) })
        ] }),
        c.cancelAtPeriodEnd && /* @__PURE__ */ f("div", { style: o.cancelNotice, children: "Subscription will cancel at end of current period" })
      ] }),
      i && /* @__PURE__ */ f(
        Kt,
        {
          preview: i,
          onConfirm: X,
          onCancel: Q,
          isLoading: C,
          styles: o
        }
      ),
      n.length > 0 && !i && /* @__PURE__ */ S("div", { className: "cedros-available-plans", style: o.plansSection, children: [
        /* @__PURE__ */ f("h4", { style: o.plansTitle, children: "Available Plans" }),
        /* @__PURE__ */ f("div", { style: o.plansList, children: n.map((w) => {
          const E = w.resource === c.resource;
          return /* @__PURE__ */ S(
            "div",
            {
              style: {
                ...o.planCard,
                ...E ? o.currentPlan : {}
              },
              children: [
                /* @__PURE__ */ f("div", { style: o.planName, children: w.name }),
                /* @__PURE__ */ S("div", { style: o.planPrice, children: [
                  j(w.price, w.currency),
                  "/",
                  w.interval
                ] }),
                w.description && /* @__PURE__ */ f("div", { style: o.planDescription, children: w.description }),
                E ? /* @__PURE__ */ f("span", { style: o.currentBadge, children: "Current Plan" }) : /* @__PURE__ */ f(
                  "button",
                  {
                    onClick: () => F(w.resource, w.interval),
                    style: o.changePlanButton,
                    disabled: C,
                    children: w.price > c.pricePerPeriod ? "Upgrade" : "Downgrade"
                  }
                )
              ]
            },
            w.resource
          );
        }) })
      ] }),
      /* @__PURE__ */ S("div", { className: "cedros-subscription-actions", style: o.actions, children: [
        y && c.paymentMethod === "stripe" && /* @__PURE__ */ f("button", { onClick: H, style: o.portalButton, disabled: C, children: "Manage Billing" }),
        x && c.cancelAtPeriodEnd && /* @__PURE__ */ f(
          "button",
          {
            onClick: () => A("resume"),
            style: o.portalButton,
            disabled: C,
            children: "Resume Subscription"
          }
        ),
        c.status === "active" && !c.cancelAtPeriodEnd && /* @__PURE__ */ f(
          "button",
          {
            onClick: () => q(!1),
            style: o.cancelSubscriptionButton,
            disabled: C,
            children: "Cancel Subscription"
          }
        ),
        x && c.cancelAtPeriodEnd && /* @__PURE__ */ f(
          "button",
          {
            onClick: () => A("revoke"),
            style: o.cancelSubscriptionButton,
            disabled: C || !$,
            title: $ ? void 0 : "Available after the current on-chain period ends",
            children: "Revoke Subscription"
          }
        ),
        ie && /* @__PURE__ */ S(le, { children: [
          /* @__PURE__ */ f(
            "button",
            {
              onClick: () => A("revoke_authority"),
              style: o.portalButton,
              disabled: C,
              children: "Revoke Token Approval"
            }
          ),
          /* @__PURE__ */ f(
            "button",
            {
              onClick: () => A("close_authority"),
              style: o.portalButton,
              disabled: C,
              children: "Close Authority"
            }
          )
        ] })
      ] })
    ] })
  ] });
}
function An(e, t) {
  return L(() => {
    const n = Fe(t), s = e || (t?.length === 1 ? t[0].resource : "");
    return {
      isCartMode: n,
      effectiveResource: s
    };
  }, [e, t]);
}
function Vt() {
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
function Gt() {
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
function Qt() {
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
function Xt() {
  return {
    passed: !0,
    severity: "info",
    message: "Stripe.js loaded via @stripe/stripe-js package (CSP recommended, not SRI)",
    recommendation: "Ensure CSP script-src includes https://js.stripe.com"
  };
}
function Jt() {
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
function Nn() {
  const e = [
    Vt(),
    Gt(),
    Qt(),
    Xt(),
    Jt()
  ], t = e.some((a) => a.severity === "error" && !a.passed), n = e.some((a) => a.severity === "warning" && !a.passed);
  let s, r;
  return t ? (s = "vulnerable", r = "Security issues detected. Review errors and apply recommendations.") : n ? (s = "warnings", r = "Minor security warnings detected. Consider applying recommendations.") : (s = "secure", r = "All security checks passed."), {
    checks: e,
    overallStatus: s,
    summary: r
  };
}
function Dn(e) {
  process.env.NODE_ENV !== "production" && (console.group("🔒 Cedros Pay Security Report"), console.log(`Status: ${e.overallStatus.toUpperCase()}`), console.log(`Summary: ${e.summary}`), console.log(""), e.checks.forEach((t) => {
    const n = t.passed ? "✅" : t.severity === "error" ? "❌" : "⚠️";
    console.log(`${n} ${t.message}`), t.recommendation && console.log(`   → ${t.recommendation}`);
  }), console.groupEnd());
}
const Bn = {
  CSP: "Use generateCSP() from @cedros/pay-react to generate Content Security Policy headers",
  HTTPS: "Always serve payment pages over HTTPS in production",
  PACKAGE_UPDATES: "Keep @stripe/stripe-js and @cedros/pay-react updated for security patches",
  AUDIT: "Run npm audit regularly to check for known vulnerabilities",
  MONITORING: "Monitor Stripe security advisories and apply updates promptly",
  NO_SRI: "Do NOT use SRI hashes for Stripe.js - use CSP instead"
};
export {
  ht as A,
  Dn as B,
  W as C,
  cn as D,
  be as E,
  dn as F,
  Ae as G,
  rt as H,
  st as I,
  yt as J,
  En as K,
  An as L,
  ot as M,
  zt as N,
  Re as O,
  _n as P,
  Nn as Q,
  bn as R,
  Bn as S,
  Ce as T,
  wn as a,
  Sn as b,
  Pn as c,
  xn as d,
  Cn as e,
  Tn as f,
  Rn as g,
  Tt as h,
  un as i,
  he as j,
  gt as k,
  de as l,
  ke as m,
  ve as n,
  Ee as o,
  pn as p,
  fn as q,
  mn as r,
  nt as s,
  ln as t,
  yn as u,
  tt as v,
  vn as w,
  kn as x,
  hn as y,
  gn as z
};
