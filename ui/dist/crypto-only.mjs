import { O as Te, B as ve, D as fe, y as Be, A as me, w as Ie, x as ye, z as Y, V as We, W as qe } from "./styles--eKKnfdj.mjs";
import { v as Ue, t as Ve, C as Ye, a as He, f as Je, d as Xe, b as Ze, c as et, P as tt, R as rt, I as nt, S as at, e as st, g as ot, n as it, M as ct, J as lt, r as ut, m as dt, o as pt, q as ft, L as mt, N as yt, F as gt, E as bt, K as wt, H as St, p as ht, s as Ct, h as xt, k as Pt, Q as Et, i as Rt, u as kt, j as Tt, l as vt, G as Bt } from "./styles--eKKnfdj.mjs";
import { u as H, m as K, a as _e, i as y } from "./CedrosContext-BE6P5PQ0.mjs";
import { f as Wt, C as qt, e as _t, d as Mt, E as Lt, K as At, L as Nt, h as Dt, R as zt, g as Kt, b as Ot, j as Qt, c as $t, r as Ft, v as Gt, n as jt } from "./CedrosContext-BE6P5PQ0.mjs";
import { C as Vt, c as Yt, i as Ht } from "./index-75RhiLDq.mjs";
import { C as Xt, u as Zt } from "./CryptoButton-CksMkZjL.mjs";
import { jsxs as O, jsx as x } from "react/jsx-runtime";
import { useState as B, useRef as z, useCallback as h, useMemo as G, useEffect as Q } from "react";
import { useWallet as J } from "@solana/wallet-adapter-react";
import { WalletReadyState as ge } from "@solana/wallet-adapter-base";
import { WalletIcon as Me } from "@solana/wallet-adapter-react-ui";
import { WalletPool as tr, createWalletPool as rr } from "./walletPool-DShNjCQ6.mjs";
function Le() {
  const { subscriptionManager: r, x402Manager: c, walletManager: f } = H(), { publicKey: i, signTransaction: R } = J(), [w, p] = B({
    status: "idle",
    error: null,
    sessionId: null,
    subscriptionStatus: null,
    expiresAt: null
  }), [k, P] = B(null), E = z(!1), C = h(() => {
    if (!i) {
      const s = "Wallet not connected";
      return p((t) => ({ ...t, status: "error", error: s })), { valid: !1, error: s };
    }
    if (!R) {
      const s = "Wallet does not support signing";
      return p((t) => ({ ...t, status: "error", error: s })), { valid: !1, error: s };
    }
    return { valid: !0 };
  }, [i, R]), T = h(
    async (s) => {
      if (!i)
        return p((t) => ({
          ...t,
          status: "error",
          error: "Wallet not connected"
        })), null;
      p((t) => ({
        ...t,
        status: "checking",
        error: null
      }));
      try {
        const t = await r.checkSubscriptionStatus({
          resource: s,
          userId: i.toString()
        });
        return p((n) => ({
          ...n,
          status: t.active ? "success" : "idle",
          subscriptionStatus: t.status,
          expiresAt: t.expiresAt || t.currentPeriodEnd || null
        })), t;
      } catch (t) {
        const n = K(t, "Failed to check subscription status");
        return p((l) => ({
          ...l,
          status: "error",
          error: n
        })), null;
      }
    },
    [i, r]
  ), q = h(
    async (s, t, n) => {
      p((l) => ({
        ...l,
        status: "loading",
        error: null
      }));
      try {
        const l = await r.requestSubscriptionQuote(
          s,
          t,
          n
        );
        return P(l), p((a) => ({
          ...a,
          status: "idle"
        })), l;
      } catch (l) {
        const a = K(l, "Failed to get subscription quote");
        return p((o) => ({
          ...o,
          status: "error",
          error: a
        })), null;
      }
    },
    [r]
  ), g = h(
    async (s, t, n) => {
      if (E.current)
        return { success: !1, error: "Payment already in progress" };
      const l = C();
      if (!l.valid)
        return { success: !1, error: l.error };
      E.current = !0, p((a) => ({
        ...a,
        status: "loading",
        error: null
      }));
      try {
        const a = await r.requestSubscriptionQuote(
          s,
          t,
          n
        );
        P(a);
        const o = a.requirement;
        if (!c.validateRequirement(o))
          throw new Error("Invalid subscription quote received from server");
        const b = !!o.extra?.feePayer;
        let m;
        if (b) {
          const { transaction: S, blockhash: _ } = await c.buildGaslessTransaction({
            resourceId: s,
            userWallet: i.toString(),
            feePayer: o.extra.feePayer,
            couponCode: n?.couponCode
          }), M = f.deserializeTransaction(S), L = await f.partiallySignTransaction({
            transaction: M,
            signTransaction: R,
            blockhash: _
          });
          m = await c.submitGaslessTransaction({
            resource: s,
            partialTx: L,
            couponCode: n?.couponCode,
            resourceType: "regular",
            requirement: o
          });
        } else {
          const S = await f.buildTransaction({
            requirement: o,
            payerPublicKey: i
          }), _ = await f.signTransaction({
            transaction: S,
            signTransaction: R
          }), M = f.buildPaymentPayload({
            requirement: o,
            signedTx: _,
            payerPublicKey: i
          });
          m = await c.submitPayment({
            resource: s,
            payload: M,
            couponCode: n?.couponCode,
            resourceType: "regular"
          });
        }
        if (m.success) {
          const S = await r.checkSubscriptionStatus({
            resource: s,
            userId: i.toString()
          });
          p({
            status: "success",
            error: null,
            sessionId: m.transactionId || null,
            subscriptionStatus: S.status,
            expiresAt: S.expiresAt || S.currentPeriodEnd || null
          });
        } else
          p((S) => ({
            ...S,
            status: "error",
            error: m.error || "Subscription payment failed"
          }));
        return m;
      } catch (a) {
        const o = K(a, "Subscription payment failed");
        return p((b) => ({
          ...b,
          status: "error",
          error: o
        })), { success: !1, error: o };
      } finally {
        E.current = !1;
      }
    },
    [
      C,
      r,
      c,
      f,
      i,
      R
    ]
  ), I = h(() => {
    p({
      status: "idle",
      error: null,
      sessionId: null,
      subscriptionStatus: null,
      expiresAt: null
    }), P(null);
  }, []);
  return {
    ...w,
    quote: k,
    checkStatus: T,
    requestQuote: q,
    processPayment: g,
    reset: I
  };
}
function $e({
  resource: r,
  interval: c,
  intervalDays: f,
  couponCode: i,
  label: R,
  disabled: w = !1,
  onAttempt: p,
  onSuccess: k,
  onError: P,
  className: E = "",
  testPageUrl: C,
  hideMessages: T = !1,
  autoCheckStatus: q = !0
}) {
  const {
    connected: g,
    connecting: I,
    connect: s,
    disconnect: t,
    select: n,
    wallets: l,
    wallet: a,
    publicKey: o
  } = J(), {
    status: b,
    error: m,
    subscriptionStatus: S,
    expiresAt: _,
    checkStatus: M,
    processPayment: L
  } = Le(), u = _e(), { solanaError: W } = H(), { t: v, translations: X } = Te(), be = R || v("ui.subscribe_with_crypto"), Z = z(k), ee = z(P), te = z(L), re = z(M);
  Z.current = k, ee.current = P, te.current = L, re.current = M;
  const we = m && typeof m != "string" ? m?.code ?? null : null, Se = W && typeof W != "string" ? W?.code ?? null : null, ne = (e) => {
    if (!e || !X) return "";
    const d = X.errors[e];
    return d ? d.action ? `${d.message} ${d.action}` : d.message : "";
  }, ae = m ? typeof m == "string" ? m : ne(we) : null, se = W ? typeof W == "string" ? W : ne(Se) : null, he = G(
    () => l.map((e) => `${e.adapter.name}-${e.readyState}`).join(","),
    [l]
  ), j = G(
    () => l.filter(
      ({ readyState: e }) => e === ge.Installed || e === ge.Loadable
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [he]
  );
  Q(() => {
    q && g && o && (y().debug("[CryptoSubscribeButton] Auto-checking subscription status"), re.current(r));
  }, [q, g, o, r]), Q(() => {
    b === "success" && S === "active" && (ve("crypto", "subscription-active", r), Z.current?.("subscription-active"));
  }, [b, S, r]), Q(() => {
    b === "error" && m && (fe("crypto", m, r), ee.current?.(m));
  }, [b, m, r]);
  const oe = typeof window < "u" && window.top !== window.self, [ie, A] = B(!1), [ce, U] = B(!1), [le, N] = B(!1), D = W;
  Q(() => {
    let e = !1;
    return e || (async () => {
      if (ce && a && !g && !I) {
        y().debug(
          "[CryptoSubscribeButton] Wallet detected, attempting auto-connect:",
          a.adapter.name
        ), U(!1), ye(a.adapter.name);
        try {
          await s(), e || y().debug("[CryptoSubscribeButton] Auto-connect successful");
        } catch (V) {
          if (!e) {
            y().error("[CryptoSubscribeButton] Auto-connect failed:", V);
            const ke = V instanceof Error ? V.message : "Failed to connect wallet";
            Y(ke, a.adapter.name), N(!1);
          }
        }
      }
    })(), () => {
      e = !0;
    };
  }, [a, ce, g, I, s]), Q(() => {
    g && le && o && a && (Be(a.adapter.name, o.toString()), y().debug("[CryptoSubscribeButton] Processing pending subscription payment"), N(!1), A(!1), me("crypto", r), te.current(r, c, { couponCode: i, intervalDays: f }));
  }, [g, le, o, a, r, c, i, f]);
  const ue = h(async () => {
    if (y().debug("[CryptoSubscribeButton] executeSubscriptionFlow called", {
      connected: g,
      wallet: a?.adapter.name,
      resource: r,
      interval: c
    }), Ie("crypto", r), p && p("crypto"), D) {
      y().error("[CryptoSubscribeButton] Solana dependencies missing:", D), fe("crypto", D, r), P && P(D);
      return;
    }
    if (oe) {
      const e = C || window.location.href;
      try {
        if (new URL(e, window.location.origin).origin !== window.location.origin)
          throw y().error("[CryptoSubscribeButton] Blocked attempt to open external URL:", e), new Error("Cannot open external URLs from embedded context");
        window.open(e, "_blank", "noopener,noreferrer");
      } catch (d) {
        throw y().error("[CryptoSubscribeButton] URL validation failed:", d), d;
      }
      return;
    }
    if (g)
      me("crypto", r), await L(r, c, { couponCode: i, intervalDays: f });
    else {
      N(!0);
      try {
        if (a)
          y().debug(
            "[CryptoSubscribeButton] Wallet already selected, connecting:",
            a.adapter.name
          ), ye(a.adapter.name), await s();
        else {
          if (y().debug("[CryptoSubscribeButton] No wallet selected, showing selector"), j.length === 0) {
            N(!1);
            const e = "No wallets available";
            throw Y(e), new Error(e);
          }
          A(!0);
        }
      } catch (e) {
        N(!1);
        const d = e instanceof Error ? e.message : "Failed to connect wallet";
        y().error("[CryptoSubscribeButton] Connection error:", d), Y(d, a?.adapter.name);
      }
    }
  }, [
    g,
    a,
    r,
    c,
    i,
    f,
    oe,
    C,
    j,
    s,
    L,
    D,
    p,
    P
  ]), de = G(() => `crypto-subscribe-${r}-${c}`, [r, c]), Ce = G(
    () => We(de, ue, {
      cooldownMs: 200,
      deduplicationWindowMs: 0
    }),
    [de, ue]
  ), pe = b === "loading" || b === "checking", $ = S === "active" || S === "trialing", xe = w || pe || I || !!D || $;
  let F = be;
  if (pe)
    F = v("ui.processing");
  else if ($ && _) {
    const e = new Date(_).toLocaleDateString();
    F = `${v("ui.subscribed_until")} ${e}`;
  } else $ && (F = v("ui.subscribed"));
  const Pe = h(async () => {
    try {
      U(!1), g && await t(), n(null), A(!0);
    } catch (e) {
      y().error("Failed to change wallet:", e);
    }
  }, [g, t, n]), Ee = h(
    (e) => {
      y().debug("[CryptoSubscribeButton] Wallet clicked:", e), A(!1), n(e), U(!0);
    },
    [n]
  ), Re = h(async () => {
    try {
      if (await t(), N(!1), typeof window < "u" && window.localStorage)
        try {
          window.localStorage.removeItem("walletName");
        } catch (e) {
          e instanceof Error && e.name === "QuotaExceededError" ? y().warn("localStorage quota exceeded when removing wallet preference") : y().error("Failed to clear wallet preference from localStorage:", e);
        }
    } catch (e) {
      y().error("Failed to disconnect wallet:", e);
    }
  }, [t]);
  return /* @__PURE__ */ O(
    "div",
    {
      className: u.unstyled ? E : `${u.className} cedros-theme__crypto-button ${E || ""}`,
      style: u.unstyled ? {} : u.style,
      children: [
        /* @__PURE__ */ x(
          "button",
          {
            onClick: Ce,
            disabled: xe,
            className: u.unstyled ? E : "cedros-theme__button cedros-theme__crypto",
            type: "button",
            children: F
          }
        ),
        ie && !T && /* @__PURE__ */ x(
          "div",
          {
            className: "cedros-modal-overlay",
            style: {
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: u.tokens.modalOverlay,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              padding: "1rem"
            },
            onClick: () => A(!1),
            children: /* @__PURE__ */ O(
              "div",
              {
                className: "cedros-modal-content",
                style: {
                  backgroundColor: u.tokens.modalBackground,
                  borderRadius: "12px",
                  padding: "2rem",
                  maxWidth: "400px",
                  width: "100%",
                  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                  border: `1px solid ${u.tokens.modalBorder}`
                },
                onClick: (e) => e.stopPropagation(),
                children: [
                  /* @__PURE__ */ O(
                    "div",
                    {
                      style: {
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "1.5rem"
                      },
                      children: [
                        /* @__PURE__ */ x(
                          "h3",
                          {
                            style: {
                              margin: 0,
                              fontSize: "1.25rem",
                              fontWeight: 600,
                              color: u.tokens.surfaceText
                            },
                            children: v("wallet.select_wallet")
                          }
                        ),
                        /* @__PURE__ */ x(
                          "button",
                          {
                            onClick: () => A(!1),
                            style: qe(u.tokens.surfaceText),
                            "aria-label": "Close modal",
                            type: "button",
                            children: "×"
                          }
                        )
                      ]
                    }
                  ),
                  /* @__PURE__ */ x("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem" }, children: j.map((e) => /* @__PURE__ */ O(
                    "button",
                    {
                      onClick: () => Ee(e.adapter.name),
                      style: {
                        width: "100%",
                        padding: "1rem",
                        backgroundColor: u.tokens.surfaceBackground,
                        border: `1px solid ${u.tokens.surfaceBorder}`,
                        borderRadius: "0.5rem",
                        cursor: "pointer",
                        fontSize: "1rem",
                        textAlign: "left",
                        color: u.tokens.surfaceText,
                        display: "flex",
                        alignItems: "center",
                        gap: "1rem",
                        transition: "all 0.2s ease"
                      },
                      onMouseEnter: (d) => {
                        d.currentTarget.style.backgroundColor = u.tokens.modalBackground, d.currentTarget.style.borderColor = u.tokens.surfaceText, d.currentTarget.style.transform = "translateY(-2px)";
                      },
                      onMouseLeave: (d) => {
                        d.currentTarget.style.backgroundColor = u.tokens.surfaceBackground, d.currentTarget.style.borderColor = u.tokens.surfaceBorder, d.currentTarget.style.transform = "translateY(0)";
                      },
                      type: "button",
                      children: [
                        /* @__PURE__ */ x(Me, { wallet: e, style: { width: "24px", height: "24px" } }),
                        /* @__PURE__ */ x("span", { style: { fontWeight: 500 }, children: e.adapter.name })
                      ]
                    },
                    e.adapter.name
                  )) })
                ]
              }
            )
          }
        ),
        g && !T && !ie && /* @__PURE__ */ O(
          "div",
          {
            style: {
              display: "flex",
              justifyContent: "space-between",
              marginTop: "0.5rem",
              fontSize: "0.75rem",
              color: u.tokens.surfaceText,
              opacity: 0.7
            },
            children: [
              /* @__PURE__ */ x(
                "button",
                {
                  onClick: Pe,
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
                  children: v("wallet.change")
                }
              ),
              /* @__PURE__ */ x(
                "button",
                {
                  onClick: Re,
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
                  children: v("ui.disconnect")
                }
              )
            ]
          }
        ),
        !T && se && /* @__PURE__ */ x("div", { className: u.unstyled ? "" : "cedros-theme__error", children: se }),
        !T && ae && /* @__PURE__ */ x("div", { className: u.unstyled ? "" : "cedros-theme__error", children: ae }),
        !T && $ && /* @__PURE__ */ x("div", { className: u.unstyled ? "" : "cedros-theme__success", children: v("ui.subscription_active") })
      ]
    }
  );
}
function Fe() {
  const { x402Manager: r, walletManager: c } = H(), { publicKey: f, signTransaction: i } = J(), [R, w] = B({
    status: "idle",
    error: null,
    transactionId: null
  }), [p, k] = B(null), [P, E] = B(null), C = z(!1), T = h(
    async (s) => {
      try {
        w((n) => ({ ...n, status: "loading" }));
        const t = await r.requestQuote({ resource: s });
        if (!r.validateRequirement(t))
          throw new Error("Invalid refund requirement received from server");
        return k(t), w((n) => ({ ...n, status: "idle" })), t;
      } catch (t) {
        const n = K(t, "Failed to fetch refund requirement");
        throw w({
          status: "error",
          error: n,
          transactionId: null
        }), t;
      }
    },
    [r]
  ), q = h(
    async (s, t) => {
      if (C.current)
        throw new Error("Refund already in progress");
      if (!f || !i)
        throw new Error("Wallet not connected");
      C.current = !0;
      try {
        w({
          status: "loading",
          error: null,
          transactionId: null
        });
        const n = await r.requestQuote({ resource: s, couponCode: t });
        if (!r.validateRequirement(n))
          throw new Error("Invalid refund requirement received");
        k(n);
        const l = await c.buildTransaction({
          requirement: n,
          payerPublicKey: f
        }), a = await c.signTransaction({
          transaction: l,
          signTransaction: i
        }), o = c.buildPaymentPayload({
          requirement: n,
          signedTx: a,
          payerPublicKey: f
        }), b = await r.submitPayment({
          resource: s,
          payload: o,
          couponCode: t,
          metadata: void 0,
          // no metadata for refunds
          resourceType: "refund"
        });
        return b.settlement && E(b.settlement), w({
          status: "success",
          error: null,
          transactionId: b.transactionId || a.signature
        }), b;
      } catch (n) {
        const l = K(n, "Refund payment failed");
        throw w({
          status: "error",
          error: l,
          transactionId: null
        }), n;
      } finally {
        C.current = !1;
      }
    },
    [f, i, r, c]
  ), g = h(
    async (s) => {
      if (C.current)
        throw new Error("Refund already in progress");
      if (!f || !i)
        throw new Error("Wallet not connected");
      C.current = !0;
      try {
        w({
          status: "loading",
          error: null,
          transactionId: null
        });
        const t = await r.requestQuote({ resource: s });
        if (!r.validateRequirement(t))
          throw new Error("Invalid refund requirement received");
        k(t);
        const { transaction: n } = await r.buildGaslessTransaction({
          resourceId: s,
          userWallet: f.toString(),
          feePayer: t.extra.feePayer
        }), l = c.deserializeTransaction(n), a = await c.partiallySignTransaction({
          transaction: l,
          signTransaction: i
        }), o = await r.submitGaslessTransaction({
          resource: s,
          partialTx: a,
          couponCode: void 0,
          // no couponCode
          metadata: void 0,
          // no metadata
          resourceType: "refund",
          requirement: t
        });
        return o.settlement && E(o.settlement), w({
          status: "success",
          error: null,
          transactionId: o.transactionId || "gasless-refund-tx"
        }), o;
      } catch (t) {
        const n = K(t, "Gasless refund payment failed");
        throw w({
          status: "error",
          error: n,
          transactionId: null
        }), t;
      } finally {
        C.current = !1;
      }
    },
    [f, i, r, c]
  ), I = h(() => {
    w({
      status: "idle",
      error: null,
      transactionId: null
    }), k(null), E(null);
  }, []);
  return {
    state: R,
    requirement: p,
    settlement: P,
    fetchRefundQuote: T,
    processRefund: q,
    processGaslessRefund: g,
    reset: I
  };
}
export {
  Ue as CEDROS_EVENTS,
  Wt as CIRCUIT_BREAKER_PRESETS,
  Ve as CSP_PRESETS,
  Ye as CedrosPay,
  Vt as CedrosPayAdminDashboard,
  qt as CedrosProvider,
  _t as CircuitBreakerOpenError,
  Mt as CircuitState,
  He as CreditsButton,
  Je as CreditsSubscribeButton,
  Xt as CryptoButton,
  $e as CryptoSubscribeButton,
  Lt as ERROR_CATEGORIES,
  At as KNOWN_STABLECOINS,
  Nt as LogLevel,
  Dt as Logger,
  Xe as PaymentMethodBadge,
  Ze as PaymentModal,
  et as ProductPrice,
  tt as PurchaseButton,
  zt as RATE_LIMITER_PRESETS,
  Kt as RETRY_PRESETS,
  rt as RPC_PROVIDERS,
  nt as SECURITY_RECOMMENDATIONS,
  at as StripeButton,
  st as SubscribeButton,
  ot as SubscriptionManagementPanel,
  tr as WalletPool,
  it as calculateDiscountPercentage,
  Yt as cedrosPayPlugin,
  Ot as createCircuitBreaker,
  Qt as createLogger,
  $t as createRateLimiter,
  ct as createTranslator,
  rr as createWalletPool,
  lt as detectLocale,
  Ht as ecommerce,
  fe as emitPaymentError,
  me as emitPaymentProcessing,
  Ie as emitPaymentStart,
  ve as emitPaymentSuccess,
  ye as emitWalletConnect,
  Be as emitWalletConnected,
  Y as emitWalletError,
  ut as formatCSP,
  dt as formatCouponCodes,
  pt as generateCSP,
  ft as generateCSPDirectives,
  mt as getAvailableLocales,
  yt as getLocalizedError,
  y as getLogger,
  gt as getUserErrorMessage,
  bt as isRetryableError,
  wt as loadLocale,
  St as logSecurityReport,
  ht as parseCouponCodes,
  Ft as retryWithBackoff,
  Ct as stackCheckoutCoupons,
  H as useCedrosContext,
  _e as useCedrosTheme,
  xt as useCreditsPayment,
  Pt as useCreditsSubscription,
  Le as useCryptoSubscription,
  Et as useLocalizedError,
  Rt as usePaymentMode,
  Fe as useRefundVerification,
  kt as useStripeCheckout,
  Tt as useSubscription,
  vt as useSubscriptionManagement,
  Te as useTranslation,
  Zt as useX402Payment,
  Gt as validateConfig,
  Bt as validateSecurity,
  jt as validateTokenMint
};
