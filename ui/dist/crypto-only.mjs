import { O as Te, q as ve, n as fe, s as Be, o as me, p as Ie, r as ye, t as V, V as _e, W as We } from "./styles-D4SQkuV3.mjs";
import { C as Ue, a as Ye, b as Ve, c as He, d as Je, P as Xe, e as Ze, f as et, g as tt, R as rt, S as nt, h as at, i as st, j as ot, k as it, l as ct, m as lt, u as ut, v as dt, w as pt, x as ft, y as mt, z as yt, A as gt, B as bt, D as St, E as wt, F as Ct, G as ht, H as xt, I as Pt, J as Et, K as Rt, L as kt, M as Tt, N as vt, Q as Bt } from "./styles-D4SQkuV3.mjs";
import { C as _t, a as Wt, b as qt, c as Mt, d as Lt, e as At, f as Dt, i as Ot, u as Nt, g as zt } from "./index-BkDimQDF.mjs";
import { u as H, m as z, j as qe, i as y } from "./CedrosContext-CY6zvjvJ.mjs";
import { C as Qt, a as $t, b as Ft, c as Gt, E as jt, K as Ut, L as Yt, d as Vt, R as Ht, e as Jt, f as Xt, g as Zt, h as er, r as tr, v as rr, n as nr } from "./CedrosContext-CY6zvjvJ.mjs";
import { C as sr, u as or } from "./CryptoButton-BV9owVe2.mjs";
import { jsxs as K, jsx as x } from "react/jsx-runtime";
import { useState as B, useRef as N, useCallback as C, useMemo as G, useEffect as Q } from "react";
import { useWallet as J } from "@solana/wallet-adapter-react";
import { WalletReadyState as ge } from "@solana/wallet-adapter-base";
import { WalletIcon as Me } from "@solana/wallet-adapter-react-ui";
import { WalletPool as cr, createWalletPool as lr } from "./walletPool-DE-t1wSW.mjs";
function Le() {
  const { subscriptionManager: r, x402Manager: c, walletManager: f } = H(), { publicKey: i, signTransaction: R } = J(), [S, p] = B({
    status: "idle",
    error: null,
    sessionId: null,
    subscriptionStatus: null,
    expiresAt: null
  }), [k, P] = B(null), E = N(!1), h = C(() => {
    if (!i) {
      const s = "Wallet not connected";
      return p((t) => ({ ...t, status: "error", error: s })), { valid: !1, error: s };
    }
    if (!R) {
      const s = "Wallet does not support signing";
      return p((t) => ({ ...t, status: "error", error: s })), { valid: !1, error: s };
    }
    return { valid: !0 };
  }, [i, R]), T = C(
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
  ), W = C(
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
  ), g = C(
    async (s, t, n) => {
      if (E.current)
        return { success: !1, error: "Payment already in progress" };
      const l = h();
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
      h,
      r,
      c,
      f,
      i,
      R
    ]
  ), I = C(() => {
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
    quote: k,
    checkStatus: T,
    requestQuote: W,
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
  disabled: S = !1,
  onAttempt: p,
  onSuccess: k,
  onError: P,
  className: E = "",
  testPageUrl: h,
  hideMessages: T = !1,
  autoCheckStatus: W = !0
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
    subscriptionStatus: w,
    expiresAt: q,
    checkStatus: M,
    processPayment: L
  } = Le(), u = qe(), { solanaError: _ } = H(), { t: v, translations: X } = Te(), be = R || v("ui.subscribe_with_crypto"), Z = N(k), ee = N(P), te = N(L), re = N(M);
  Z.current = k, ee.current = P, te.current = L, re.current = M;
  const Se = m && typeof m != "string" ? m?.code ?? null : null, we = _ && typeof _ != "string" ? _?.code ?? null : null, ne = (e) => {
    if (!e || !X) return "";
    const d = X.errors[e];
    return d ? d.action ? `${d.message} ${d.action}` : d.message : "";
  }, ae = m ? typeof m == "string" ? m : ne(Se) : null, se = _ ? typeof _ == "string" ? _ : ne(we) : null, Ce = G(
    () => l.map((e) => `${e.adapter.name}-${e.readyState}`).join(","),
    [l]
  ), j = G(
    () => l.filter(
      ({ readyState: e }) => e === ge.Installed || e === ge.Loadable
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [Ce]
  );
  Q(() => {
    W && g && o && (y().debug("[CryptoSubscribeButton] Auto-checking subscription status"), re.current(r));
  }, [W, g, o, r]), Q(() => {
    b === "success" && w === "active" && (ve("crypto", "subscription-active", r), Z.current?.("subscription-active"));
  }, [b, w, r]), Q(() => {
    b === "error" && m && (fe("crypto", m, r), ee.current?.(m));
  }, [b, m, r]);
  const oe = typeof window < "u" && window.top !== window.self, [ie, A] = B(!1), [ce, U] = B(!1), [le, D] = B(!1), O = _;
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
        } catch (Y) {
          if (!e) {
            y().error("[CryptoSubscribeButton] Auto-connect failed:", Y);
            const ke = Y instanceof Error ? Y.message : "Failed to connect wallet";
            V(ke, a.adapter.name), D(!1);
          }
        }
      }
    })(), () => {
      e = !0;
    };
  }, [a, ce, g, I, s]), Q(() => {
    g && le && o && a && (Be(a.adapter.name, o.toString()), y().debug("[CryptoSubscribeButton] Processing pending subscription payment"), D(!1), A(!1), me("crypto", r), te.current(r, c, { couponCode: i, intervalDays: f }));
  }, [g, le, o, a, r, c, i, f]);
  const ue = C(async () => {
    if (y().debug("[CryptoSubscribeButton] executeSubscriptionFlow called", {
      connected: g,
      wallet: a?.adapter.name,
      resource: r,
      interval: c
    }), Ie("crypto", r), p && p("crypto"), O) {
      y().error("[CryptoSubscribeButton] Solana dependencies missing:", O), fe("crypto", O, r), P && P(O);
      return;
    }
    if (oe) {
      const e = h || window.location.href;
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
    h,
    j,
    s,
    L,
    O,
    p,
    P
  ]), de = G(() => `crypto-subscribe-${r}-${c}`, [r, c]), he = G(
    () => _e(de, ue, {
      cooldownMs: 200,
      deduplicationWindowMs: 0
    }),
    [de, ue]
  ), pe = b === "loading" || b === "checking", $ = w === "active" || w === "trialing", xe = S || pe || I || !!O || $;
  let F = be;
  if (pe)
    F = v("ui.processing");
  else if ($ && q) {
    const e = new Date(q).toLocaleDateString();
    F = `${v("ui.subscribed_until")} ${e}`;
  } else $ && (F = v("ui.subscribed"));
  const Pe = C(async () => {
    try {
      U(!1), g && await t(), n(null), A(!0);
    } catch (e) {
      y().error("Failed to change wallet:", e);
    }
  }, [g, t, n]), Ee = C(
    (e) => {
      y().debug("[CryptoSubscribeButton] Wallet clicked:", e), A(!1), n(e), U(!0);
    },
    [n]
  ), Re = C(async () => {
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
            onClick: he,
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
        g && !T && !ie && /* @__PURE__ */ K(
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
  const { x402Manager: r, walletManager: c } = H(), { publicKey: f, signTransaction: i } = J(), [R, S] = B({
    status: "idle",
    error: null,
    transactionId: null
  }), [p, k] = B(null), [P, E] = B(null), h = N(!1), T = C(
    async (s) => {
      try {
        S((n) => ({ ...n, status: "loading" }));
        const t = await r.requestQuote({ resource: s });
        if (!r.validateRequirement(t))
          throw new Error("Invalid refund requirement received from server");
        return k(t), S((n) => ({ ...n, status: "idle" })), t;
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
  ), W = C(
    async (s, t) => {
      if (h.current)
        throw new Error("Refund already in progress");
      if (!f || !i)
        throw new Error("Wallet not connected");
      h.current = !0;
      try {
        S({
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
        h.current = !1;
      }
    },
    [f, i, r, c]
  ), g = C(
    async (s) => {
      if (h.current)
        throw new Error("Refund already in progress");
      if (!f || !i)
        throw new Error("Wallet not connected");
      h.current = !0;
      try {
        S({
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
        h.current = !1;
      }
    },
    [f, i, r, c]
  ), I = C(() => {
    S({
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
    processRefund: W,
    processGaslessRefund: g,
    reset: I
  };
}
export {
  Ue as CEDROS_EVENTS,
  _t as CEDROS_PAY_GROUPS,
  Wt as CEDROS_PAY_SECTIONS,
  qt as CEDROS_PAY_SECTION_IDS,
  Qt as CIRCUIT_BREAKER_PRESETS,
  Ye as CSP_PRESETS,
  Ve as CedrosPay,
  Mt as CedrosPayAdminDashboard,
  $t as CedrosProvider,
  Ft as CircuitBreakerOpenError,
  Gt as CircuitState,
  Lt as ComplianceGatePage,
  At as CreditsBalance,
  He as CreditsButton,
  Je as CreditsSubscribeButton,
  sr as CryptoButton,
  $e as CryptoSubscribeButton,
  jt as ERROR_CATEGORIES,
  Ut as KNOWN_STABLECOINS,
  Yt as LogLevel,
  Vt as Logger,
  Xe as PaymentMethodBadge,
  Ze as PaymentModal,
  et as ProductPrice,
  tt as PurchaseButton,
  Ht as RATE_LIMITER_PRESETS,
  Jt as RETRY_PRESETS,
  rt as RPC_PROVIDERS,
  nt as SECURITY_RECOMMENDATIONS,
  at as StripeButton,
  st as SubscribeButton,
  ot as SubscriptionManagementPanel,
  cr as WalletPool,
  it as calculateDiscountPercentage,
  Dt as cedrosPayPlugin,
  Xt as createCircuitBreaker,
  Zt as createLogger,
  er as createRateLimiter,
  ct as createTranslator,
  lr as createWalletPool,
  lt as detectLocale,
  Ot as ecommerce,
  fe as emitPaymentError,
  me as emitPaymentProcessing,
  Ie as emitPaymentStart,
  ve as emitPaymentSuccess,
  ye as emitWalletConnect,
  Be as emitWalletConnected,
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
  Ct as parseCouponCodes,
  tr as retryWithBackoff,
  ht as stackCheckoutCoupons,
  H as useCedrosContext,
  qe as useCedrosTheme,
  Nt as useComplianceCheck,
  zt as useCreditsBalance,
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
  or as useX402Payment,
  rr as validateConfig,
  Bt as validateSecurity,
  nr as validateTokenMint
};
