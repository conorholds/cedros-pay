import { O as ke, B as ve, D as fe, y as Ie, A as me, w as Be, x as ye, z as V, V as _e, W as We } from "./styles--eKKnfdj.mjs";
import { v as Ue, t as Ye, C as Ve, a as He, f as Je, d as Xe, b as Ze, c as et, P as tt, R as rt, I as nt, S as at, e as st, g as ot, n as it, M as ct, J as lt, r as ut, m as dt, o as pt, q as ft, L as mt, N as yt, F as gt, E as bt, K as St, H as wt, p as ht, s as Ct, h as xt, k as Pt, Q as Et, i as Rt, u as Tt, j as kt, l as vt, G as It } from "./styles--eKKnfdj.mjs";
import { u as H, m as z, a as qe, i as y } from "./CedrosContext-BE6P5PQ0.mjs";
import { f as _t, C as Wt, e as qt, d as Mt, E as Lt, K as At, L as Dt, h as Ot, R as Nt, g as zt, b as Kt, j as Qt, c as $t, r as Ft, v as Gt, n as jt } from "./CedrosContext-BE6P5PQ0.mjs";
import { d as Yt, a as Vt, b as Ht, C as Jt, c as Xt, i as Zt } from "./index-bqhsxBTY.mjs";
import { C as tr, u as rr } from "./CryptoButton-CksMkZjL.mjs";
import { jsxs as K, jsx as x } from "react/jsx-runtime";
import { useState as I, useRef as N, useCallback as h, useMemo as G, useEffect as Q } from "react";
import { useWallet as J } from "@solana/wallet-adapter-react";
import { WalletReadyState as ge } from "@solana/wallet-adapter-base";
import { WalletIcon as Me } from "@solana/wallet-adapter-react-ui";
import { WalletPool as ar, createWalletPool as sr } from "./walletPool-DShNjCQ6.mjs";
function Le() {
  const { subscriptionManager: r, x402Manager: c, walletManager: f } = H(), { publicKey: i, signTransaction: R } = J(), [S, p] = I({
    status: "idle",
    error: null,
    sessionId: null,
    subscriptionStatus: null,
    expiresAt: null
  }), [T, P] = I(null), E = N(!1), C = h(() => {
    if (!i) {
      const s = "Wallet not connected";
      return p((t) => ({ ...t, status: "error", error: s })), { valid: !1, error: s };
    }
    if (!R) {
      const s = "Wallet does not support signing";
      return p((t) => ({ ...t, status: "error", error: s })), { valid: !1, error: s };
    }
    return { valid: !0 };
  }, [i, R]), k = h(
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
        const n = z(t, "Failed to check subscription status");
        return p((l) => ({
          ...l,
          status: "error",
          error: n
        })), null;
      }
    },
    [i, r]
  ), W = h(
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
        const a = z(l, "Failed to get subscription quote");
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
          const { transaction: w, blockhash: q } = await c.buildGaslessTransaction({
            resourceId: s,
            userWallet: i.toString(),
            feePayer: o.extra.feePayer,
            couponCode: n?.couponCode
          }), M = f.deserializeTransaction(w), L = await f.partiallySignTransaction({
            transaction: M,
            signTransaction: R,
            blockhash: q
          });
          m = await c.submitGaslessTransaction({
            resource: s,
            partialTx: L,
            couponCode: n?.couponCode,
            resourceType: "regular",
            requirement: o
          });
        } else {
          const w = await f.buildTransaction({
            requirement: o,
            payerPublicKey: i
          }), q = await f.signTransaction({
            transaction: w,
            signTransaction: R
          }), M = f.buildPaymentPayload({
            requirement: o,
            signedTx: q,
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
          const w = await r.checkSubscriptionStatus({
            resource: s,
            userId: i.toString()
          });
          p({
            status: "success",
            error: null,
            sessionId: m.transactionId || null,
            subscriptionStatus: w.status,
            expiresAt: w.expiresAt || w.currentPeriodEnd || null
          });
        } else
          p((w) => ({
            ...w,
            status: "error",
            error: m.error || "Subscription payment failed"
          }));
        return m;
      } catch (a) {
        const o = z(a, "Subscription payment failed");
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
  ), B = h(() => {
    p({
      status: "idle",
      error: null,
      sessionId: null,
      subscriptionStatus: null,
      expiresAt: null
    }), P(null);
  }, []);
  return {
    ...S,
    quote: T,
    checkStatus: k,
    requestQuote: W,
    processPayment: g,
    reset: B
  };
}
function $e({
  resource: r,
  interval: c,
  intervalDays: f,
  couponCode: i,
  label: R,
  disabled: S = !1,
  onAttempt: p,
  onSuccess: T,
  onError: P,
  className: E = "",
  testPageUrl: C,
  hideMessages: k = !1,
  autoCheckStatus: W = !0
}) {
  const {
    connected: g,
    connecting: B,
    connect: s,
    disconnect: t,
    select: n,
    wallets: l,
    wallet: a,
    publicKey: o
  } = J(), {
    status: b,
    error: m,
    subscriptionStatus: w,
    expiresAt: q,
    checkStatus: M,
    processPayment: L
  } = Le(), u = qe(), { solanaError: _ } = H(), { t: v, translations: X } = ke(), be = R || v("ui.subscribe_with_crypto"), Z = N(T), ee = N(P), te = N(L), re = N(M);
  Z.current = T, ee.current = P, te.current = L, re.current = M;
  const Se = m && typeof m != "string" ? m?.code ?? null : null, we = _ && typeof _ != "string" ? _?.code ?? null : null, ne = (e) => {
    if (!e || !X) return "";
    const d = X.errors[e];
    return d ? d.action ? `${d.message} ${d.action}` : d.message : "";
  }, ae = m ? typeof m == "string" ? m : ne(Se) : null, se = _ ? typeof _ == "string" ? _ : ne(we) : null, he = G(
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
    W && g && o && (y().debug("[CryptoSubscribeButton] Auto-checking subscription status"), re.current(r));
  }, [W, g, o, r]), Q(() => {
    b === "success" && w === "active" && (ve("crypto", "subscription-active", r), Z.current?.("subscription-active"));
  }, [b, w, r]), Q(() => {
    b === "error" && m && (fe("crypto", m, r), ee.current?.(m));
  }, [b, m, r]);
  const oe = typeof window < "u" && window.top !== window.self, [ie, A] = I(!1), [ce, U] = I(!1), [le, D] = I(!1), O = _;
  Q(() => {
    let e = !1;
    return e || (async () => {
      if (ce && a && !g && !B) {
        y().debug(
          "[CryptoSubscribeButton] Wallet detected, attempting auto-connect:",
          a.adapter.name
        ), U(!1), ye(a.adapter.name);
        try {
          await s(), e || y().debug("[CryptoSubscribeButton] Auto-connect successful");
        } catch (Y) {
          if (!e) {
            y().error("[CryptoSubscribeButton] Auto-connect failed:", Y);
            const Te = Y instanceof Error ? Y.message : "Failed to connect wallet";
            V(Te, a.adapter.name), D(!1);
          }
        }
      }
    })(), () => {
      e = !0;
    };
  }, [a, ce, g, B, s]), Q(() => {
    g && le && o && a && (Ie(a.adapter.name, o.toString()), y().debug("[CryptoSubscribeButton] Processing pending subscription payment"), D(!1), A(!1), me("crypto", r), te.current(r, c, { couponCode: i, intervalDays: f }));
  }, [g, le, o, a, r, c, i, f]);
  const ue = h(async () => {
    if (y().debug("[CryptoSubscribeButton] executeSubscriptionFlow called", {
      connected: g,
      wallet: a?.adapter.name,
      resource: r,
      interval: c
    }), Be("crypto", r), p && p("crypto"), O) {
      y().error("[CryptoSubscribeButton] Solana dependencies missing:", O), fe("crypto", O, r), P && P(O);
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
      D(!0);
      try {
        if (a)
          y().debug(
            "[CryptoSubscribeButton] Wallet already selected, connecting:",
            a.adapter.name
          ), ye(a.adapter.name), await s();
        else {
          if (y().debug("[CryptoSubscribeButton] No wallet selected, showing selector"), j.length === 0) {
            D(!1);
            const e = "No wallets available";
            throw V(e), new Error(e);
          }
          A(!0);
        }
      } catch (e) {
        D(!1);
        const d = e instanceof Error ? e.message : "Failed to connect wallet";
        y().error("[CryptoSubscribeButton] Connection error:", d), V(d, a?.adapter.name);
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
    O,
    p,
    P
  ]), de = G(() => `crypto-subscribe-${r}-${c}`, [r, c]), Ce = G(
    () => _e(de, ue, {
      cooldownMs: 200,
      deduplicationWindowMs: 0
    }),
    [de, ue]
  ), pe = b === "loading" || b === "checking", $ = w === "active" || w === "trialing", xe = S || pe || B || !!O || $;
  let F = be;
  if (pe)
    F = v("ui.processing");
  else if ($ && q) {
    const e = new Date(q).toLocaleDateString();
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
      if (await t(), D(!1), typeof window < "u" && window.localStorage)
        try {
          window.localStorage.removeItem("walletName");
        } catch (e) {
          e instanceof Error && e.name === "QuotaExceededError" ? y().warn("localStorage quota exceeded when removing wallet preference") : y().error("Failed to clear wallet preference from localStorage:", e);
        }
    } catch (e) {
      y().error("Failed to disconnect wallet:", e);
    }
  }, [t]);
  return /* @__PURE__ */ K(
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
        ie && !k && /* @__PURE__ */ x(
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
            children: /* @__PURE__ */ K(
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
                  /* @__PURE__ */ K(
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
                            style: We(u.tokens.surfaceText),
                            "aria-label": "Close modal",
                            type: "button",
                            children: "×"
                          }
                        )
                      ]
                    }
                  ),
                  /* @__PURE__ */ x("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem" }, children: j.map((e) => /* @__PURE__ */ K(
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
        g && !k && !ie && /* @__PURE__ */ K(
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
        !k && se && /* @__PURE__ */ x("div", { className: u.unstyled ? "" : "cedros-theme__error", children: se }),
        !k && ae && /* @__PURE__ */ x("div", { className: u.unstyled ? "" : "cedros-theme__error", children: ae }),
        !k && $ && /* @__PURE__ */ x("div", { className: u.unstyled ? "" : "cedros-theme__success", children: v("ui.subscription_active") })
      ]
    }
  );
}
function Fe() {
  const { x402Manager: r, walletManager: c } = H(), { publicKey: f, signTransaction: i } = J(), [R, S] = I({
    status: "idle",
    error: null,
    transactionId: null
  }), [p, T] = I(null), [P, E] = I(null), C = N(!1), k = h(
    async (s) => {
      try {
        S((n) => ({ ...n, status: "loading" }));
        const t = await r.requestQuote({ resource: s });
        if (!r.validateRequirement(t))
          throw new Error("Invalid refund requirement received from server");
        return T(t), S((n) => ({ ...n, status: "idle" })), t;
      } catch (t) {
        const n = z(t, "Failed to fetch refund requirement");
        throw S({
          status: "error",
          error: n,
          transactionId: null
        }), t;
      }
    },
    [r]
  ), W = h(
    async (s, t) => {
      if (C.current)
        throw new Error("Refund already in progress");
      if (!f || !i)
        throw new Error("Wallet not connected");
      C.current = !0;
      try {
        S({
          status: "loading",
          error: null,
          transactionId: null
        });
        const n = await r.requestQuote({ resource: s, couponCode: t });
        if (!r.validateRequirement(n))
          throw new Error("Invalid refund requirement received");
        T(n);
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
        return b.settlement && E(b.settlement), S({
          status: "success",
          error: null,
          transactionId: b.transactionId || a.signature
        }), b;
      } catch (n) {
        const l = z(n, "Refund payment failed");
        throw S({
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
        S({
          status: "loading",
          error: null,
          transactionId: null
        });
        const t = await r.requestQuote({ resource: s });
        if (!r.validateRequirement(t))
          throw new Error("Invalid refund requirement received");
        T(t);
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
        return o.settlement && E(o.settlement), S({
          status: "success",
          error: null,
          transactionId: o.transactionId || "gasless-refund-tx"
        }), o;
      } catch (t) {
        const n = z(t, "Gasless refund payment failed");
        throw S({
          status: "error",
          error: n,
          transactionId: null
        }), t;
      } finally {
        C.current = !1;
      }
    },
    [f, i, r, c]
  ), B = h(() => {
    S({
      status: "idle",
      error: null,
      transactionId: null
    }), T(null), E(null);
  }, []);
  return {
    state: R,
    requirement: p,
    settlement: P,
    fetchRefundQuote: k,
    processRefund: W,
    processGaslessRefund: g,
    reset: B
  };
}
export {
  Ue as CEDROS_EVENTS,
  Yt as CEDROS_PAY_GROUPS,
  Vt as CEDROS_PAY_SECTIONS,
  Ht as CEDROS_PAY_SECTION_IDS,
  _t as CIRCUIT_BREAKER_PRESETS,
  Ye as CSP_PRESETS,
  Ve as CedrosPay,
  Jt as CedrosPayAdminDashboard,
  Wt as CedrosProvider,
  qt as CircuitBreakerOpenError,
  Mt as CircuitState,
  He as CreditsButton,
  Je as CreditsSubscribeButton,
  tr as CryptoButton,
  $e as CryptoSubscribeButton,
  Lt as ERROR_CATEGORIES,
  At as KNOWN_STABLECOINS,
  Dt as LogLevel,
  Ot as Logger,
  Xe as PaymentMethodBadge,
  Ze as PaymentModal,
  et as ProductPrice,
  tt as PurchaseButton,
  Nt as RATE_LIMITER_PRESETS,
  zt as RETRY_PRESETS,
  rt as RPC_PROVIDERS,
  nt as SECURITY_RECOMMENDATIONS,
  at as StripeButton,
  st as SubscribeButton,
  ot as SubscriptionManagementPanel,
  ar as WalletPool,
  it as calculateDiscountPercentage,
  Xt as cedrosPayPlugin,
  Kt as createCircuitBreaker,
  Qt as createLogger,
  $t as createRateLimiter,
  ct as createTranslator,
  sr as createWalletPool,
  lt as detectLocale,
  Zt as ecommerce,
  fe as emitPaymentError,
  me as emitPaymentProcessing,
  Be as emitPaymentStart,
  ve as emitPaymentSuccess,
  ye as emitWalletConnect,
  Ie as emitWalletConnected,
  V as emitWalletError,
  ut as formatCSP,
  dt as formatCouponCodes,
  pt as generateCSP,
  ft as generateCSPDirectives,
  mt as getAvailableLocales,
  yt as getLocalizedError,
  y as getLogger,
  gt as getUserErrorMessage,
  bt as isRetryableError,
  St as loadLocale,
  wt as logSecurityReport,
  ht as parseCouponCodes,
  Ft as retryWithBackoff,
  Ct as stackCheckoutCoupons,
  H as useCedrosContext,
  qe as useCedrosTheme,
  xt as useCreditsPayment,
  Pt as useCreditsSubscription,
  Le as useCryptoSubscription,
  Et as useLocalizedError,
  Rt as usePaymentMode,
  Fe as useRefundVerification,
  Tt as useStripeCheckout,
  kt as useSubscription,
  vt as useSubscriptionManagement,
  ke as useTranslation,
  rr as useX402Payment,
  Gt as validateConfig,
  It as validateSecurity,
  jt as validateTokenMint
};
