import { O as ke, q as ve, n as fe, s as Be, o as me, p as Ie, r as ye, t as V, V as _e, W as We } from "./styles-fihm6qVA.mjs";
import { C as Ye, a as Ve, b as He, c as Je, d as Xe, P as Ze, e as et, f as tt, g as rt, R as at, S as nt, h as st, i as ot, j as it, k as ct, l as lt, m as ut, u as dt, v as pt, w as ft, x as mt, y as yt, z as gt, A as bt, B as St, D as wt, E as Ct, F as ht, G as xt, H as Et, I as Pt, J as Rt, K as Tt, L as kt, M as vt, N as Bt, Q as It } from "./styles-fihm6qVA.mjs";
import { C as Wt, a as qt, i as Mt, u as Lt, b as Ft } from "./index-CU6M10Rs.mjs";
import { u as H, m as O, l as qe } from "./CedrosContext-DQc_k5PG.mjs";
import { C as Dt, a as Nt, b as Ot, c as Gt, E as zt, F as Kt, d as Qt, R as $t, e as Ut, f as jt, g as Yt, h as Vt, i as Ht, j as Jt, p as Xt, r as Zt, k as er, v as tr } from "./CedrosContext-DQc_k5PG.mjs";
import { g as y } from "./fetchWithTimeout-DmMOwL0Q.mjs";
import { L as ar, a as nr, c as sr } from "./fetchWithTimeout-DmMOwL0Q.mjs";
import { C as ir, u as cr } from "./CryptoButton-BuO_RZLj.mjs";
import { jsxs as G, jsx as x } from "react/jsx-runtime";
import { useState as B, useRef as N, useCallback as C, useMemo as $, useEffect as z } from "react";
import { useWallet as J } from "@solana/wallet-adapter-react";
import { WalletReadyState as ge } from "@solana/wallet-adapter-base";
import { WalletIcon as Me } from "@solana/wallet-adapter-react-ui";
import { WalletPool as ur, createWalletPool as dr } from "./walletPool-9MylB2QK.mjs";
import { K as fr, a as mr } from "./tokenMintValidator-DAjQld0r.mjs";
import { C as gr, a as br, b as Sr, c as wr } from "./plugin-BIkt3boU.mjs";
function Le() {
  const { subscriptionManager: r, x402Manager: c, walletManager: f } = H(), { publicKey: i, signTransaction: R } = J(), [S, p] = B({
    status: "idle",
    error: null,
    sessionId: null,
    subscriptionStatus: null,
    expiresAt: null
  }), [T, E] = B(null), P = N(!1), h = C(() => {
    if (!i) {
      const s = "Wallet not connected";
      return p((t) => ({ ...t, status: "error", error: s })), { valid: !1, error: s };
    }
    if (!R) {
      const s = "Wallet does not support signing";
      return p((t) => ({ ...t, status: "error", error: s })), { valid: !1, error: s };
    }
    return { valid: !0 };
  }, [i, R]), k = C(
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
        return p((a) => ({
          ...a,
          status: t.active ? "success" : "idle",
          subscriptionStatus: t.status,
          expiresAt: t.expiresAt || t.currentPeriodEnd || null
        })), t;
      } catch (t) {
        const a = O(t, "Failed to check subscription status");
        return p((l) => ({
          ...l,
          status: "error",
          error: a
        })), null;
      }
    },
    [i, r]
  ), W = C(
    async (s, t, a) => {
      p((l) => ({
        ...l,
        status: "loading",
        error: null
      }));
      try {
        const l = await r.requestSubscriptionQuote(
          s,
          t,
          a
        );
        return E(l), p((n) => ({
          ...n,
          status: "idle"
        })), l;
      } catch (l) {
        const n = O(l, "Failed to get subscription quote");
        return p((o) => ({
          ...o,
          status: "error",
          error: n
        })), null;
      }
    },
    [r]
  ), g = C(
    async (s, t, a) => {
      if (P.current)
        return { success: !1, error: "Payment already in progress" };
      const l = h();
      if (!l.valid)
        return { success: !1, error: l.error };
      P.current = !0, p((n) => ({
        ...n,
        status: "loading",
        error: null
      }));
      try {
        const n = await r.requestSubscriptionQuote(
          s,
          t,
          a
        );
        E(n);
        const o = n.requirement;
        if (!c.validateRequirement(o))
          throw new Error("Invalid subscription quote received from server");
        const b = !!o.extra?.feePayer;
        let m;
        if (b) {
          const { transaction: w, blockhash: q } = await c.buildGaslessTransaction({
            resourceId: s,
            userWallet: i.toString(),
            feePayer: o.extra.feePayer,
            couponCode: a?.couponCode
          }), M = f.deserializeTransaction(w), L = await f.partiallySignTransaction({
            transaction: M,
            signTransaction: R,
            blockhash: q
          });
          m = await c.submitGaslessTransaction({
            resource: s,
            partialTx: L,
            couponCode: a?.couponCode,
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
            couponCode: a?.couponCode,
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
      } catch (n) {
        const o = O(n, "Subscription payment failed");
        return p((b) => ({
          ...b,
          status: "error",
          error: o
        })), { success: !1, error: o };
      } finally {
        P.current = !1;
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
    }), E(null);
  }, []);
  return {
    ...S,
    quote: T,
    checkStatus: k,
    requestQuote: W,
    processPayment: g,
    reset: I
  };
}
function Qe({
  resource: r,
  interval: c,
  intervalDays: f,
  couponCode: i,
  label: R,
  disabled: S = !1,
  onAttempt: p,
  onSuccess: T,
  onError: E,
  className: P = "",
  testPageUrl: h,
  hideMessages: k = !1,
  autoCheckStatus: W = !0
}) {
  const {
    connected: g,
    connecting: I,
    connect: s,
    disconnect: t,
    select: a,
    wallets: l,
    wallet: n,
    publicKey: o
  } = J(), {
    status: b,
    error: m,
    subscriptionStatus: w,
    expiresAt: q,
    checkStatus: M,
    processPayment: L
  } = Le(), u = qe(), { solanaError: _ } = H(), { t: v, translations: X } = ke(), be = R || v("ui.subscribe_with_crypto"), Z = N(T), ee = N(E), te = N(L), re = N(M);
  Z.current = T, ee.current = E, te.current = L, re.current = M;
  const Se = m && typeof m != "string" ? m?.code ?? null : null, we = _ && typeof _ != "string" ? _?.code ?? null : null, ae = (e) => {
    if (!e || !X) return "";
    const d = X.errors[e];
    return d ? d.action ? `${d.message} ${d.action}` : d.message : "";
  }, ne = m ? typeof m == "string" ? m : ae(Se) : null, se = _ ? typeof _ == "string" ? _ : ae(we) : null, Ce = $(
    () => l.map((e) => `${e.adapter.name}-${e.readyState}`).join(","),
    [l]
  ), U = $(
    () => l.filter(
      ({ readyState: e }) => e === ge.Installed || e === ge.Loadable
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [Ce]
  );
  z(() => {
    W && g && o && (y().debug("[CryptoSubscribeButton] Auto-checking subscription status"), re.current(r));
  }, [W, g, o, r]), z(() => {
    b === "success" && w === "active" && (ve("crypto", "subscription-active", r), Z.current?.("subscription-active"));
  }, [b, w, r]), z(() => {
    b === "error" && m && (fe("crypto", m, r), ee.current?.(m));
  }, [b, m, r]);
  const oe = typeof window < "u" && window.top !== window.self, [ie, F] = B(!1), [ce, j] = B(!1), [le, A] = B(!1), D = _;
  z(() => {
    let e = !1;
    return e || (async () => {
      if (ce && n && !g && !I) {
        y().debug(
          "[CryptoSubscribeButton] Wallet detected, attempting auto-connect:",
          n.adapter.name
        ), j(!1), ye(n.adapter.name);
        try {
          await s(), e || y().debug("[CryptoSubscribeButton] Auto-connect successful");
        } catch (Y) {
          if (!e) {
            y().error("[CryptoSubscribeButton] Auto-connect failed:", Y);
            const Te = Y instanceof Error ? Y.message : "Failed to connect wallet";
            V(Te, n.adapter.name), A(!1);
          }
        }
      }
    })(), () => {
      e = !0;
    };
  }, [n, ce, g, I, s]), z(() => {
    g && le && o && n && (Be(n.adapter.name, o.toString()), y().debug("[CryptoSubscribeButton] Processing pending subscription payment"), A(!1), F(!1), me("crypto", r), te.current(r, c, { couponCode: i, intervalDays: f }));
  }, [g, le, o, n, r, c, i, f]);
  const ue = C(async () => {
    if (y().debug("[CryptoSubscribeButton] executeSubscriptionFlow called", {
      connected: g,
      wallet: n?.adapter.name,
      resource: r,
      interval: c
    }), Ie("crypto", r), p && p("crypto"), D) {
      y().error("[CryptoSubscribeButton] Solana dependencies missing:", D), fe("crypto", D, r), E && E(D);
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
      A(!0);
      try {
        if (n)
          y().debug(
            "[CryptoSubscribeButton] Wallet already selected, connecting:",
            n.adapter.name
          ), ye(n.adapter.name), await s();
        else {
          if (y().debug("[CryptoSubscribeButton] No wallet selected, showing selector"), U.length === 0) {
            A(!1);
            const e = "No wallets available";
            throw V(e), new Error(e);
          }
          F(!0);
        }
      } catch (e) {
        A(!1);
        const d = e instanceof Error ? e.message : "Failed to connect wallet";
        y().error("[CryptoSubscribeButton] Connection error:", d), V(d, n?.adapter.name);
      }
    }
  }, [
    g,
    n,
    r,
    c,
    i,
    f,
    oe,
    h,
    U,
    s,
    L,
    D,
    p,
    E
  ]), de = $(() => `crypto-subscribe-${r}-${c}`, [r, c]), he = $(
    () => _e(de, ue, {
      cooldownMs: 200,
      deduplicationWindowMs: 0
    }),
    [de, ue]
  ), pe = b === "loading" || b === "checking", K = w === "active" || w === "trialing", xe = S || pe || I || !!D || K;
  let Q = be;
  if (pe)
    Q = v("ui.processing");
  else if (K && q) {
    const e = new Date(q).toLocaleDateString();
    Q = `${v("ui.subscribed_until")} ${e}`;
  } else K && (Q = v("ui.subscribed"));
  const Ee = C(async () => {
    try {
      j(!1), g && await t(), a(null), F(!0);
    } catch (e) {
      y().error("Failed to change wallet:", e);
    }
  }, [g, t, a]), Pe = C(
    (e) => {
      y().debug("[CryptoSubscribeButton] Wallet clicked:", e), F(!1), a(e), j(!0);
    },
    [a]
  ), Re = C(async () => {
    try {
      if (await t(), A(!1), typeof window < "u" && window.localStorage)
        try {
          window.localStorage.removeItem("walletName");
        } catch (e) {
          e instanceof Error && e.name === "QuotaExceededError" ? y().warn("localStorage quota exceeded when removing wallet preference") : y().error("Failed to clear wallet preference from localStorage:", e);
        }
    } catch (e) {
      y().error("Failed to disconnect wallet:", e);
    }
  }, [t]);
  return /* @__PURE__ */ G(
    "div",
    {
      className: u.unstyled ? P : `${u.className} cedros-theme__crypto-button ${P || ""}`,
      style: u.unstyled ? {} : u.style,
      children: [
        /* @__PURE__ */ x(
          "button",
          {
            onClick: he,
            disabled: xe,
            className: u.unstyled ? P : "cedros-theme__button cedros-theme__crypto",
            type: "button",
            children: Q
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
            onClick: () => F(!1),
            children: /* @__PURE__ */ G(
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
                  /* @__PURE__ */ G(
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
                            onClick: () => F(!1),
                            style: We(u.tokens.surfaceText),
                            "aria-label": "Close modal",
                            type: "button",
                            children: "×"
                          }
                        )
                      ]
                    }
                  ),
                  /* @__PURE__ */ x("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem" }, children: U.map((e) => /* @__PURE__ */ G(
                    "button",
                    {
                      onClick: () => Pe(e.adapter.name),
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
        g && !k && !ie && /* @__PURE__ */ G(
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
                  onClick: Ee,
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
        !k && ne && /* @__PURE__ */ x("div", { className: u.unstyled ? "" : "cedros-theme__error", children: ne }),
        !k && K && /* @__PURE__ */ x("div", { className: u.unstyled ? "" : "cedros-theme__success", children: v("ui.subscription_active") })
      ]
    }
  );
}
function $e() {
  const { x402Manager: r, walletManager: c } = H(), { publicKey: f, signTransaction: i } = J(), [R, S] = B({
    status: "idle",
    error: null,
    transactionId: null
  }), [p, T] = B(null), [E, P] = B(null), h = N(!1), k = C(
    async (s) => {
      try {
        S((a) => ({ ...a, status: "loading" }));
        const t = await r.requestQuote({ resource: s });
        if (!r.validateRequirement(t))
          throw new Error("Invalid refund requirement received from server");
        return T(t), S((a) => ({ ...a, status: "idle" })), t;
      } catch (t) {
        const a = O(t, "Failed to fetch refund requirement");
        throw S({
          status: "error",
          error: a,
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
        const a = await r.requestQuote({ resource: s, couponCode: t });
        if (!r.validateRequirement(a))
          throw new Error("Invalid refund requirement received");
        T(a);
        const l = await c.buildTransaction({
          requirement: a,
          payerPublicKey: f
        }), n = await c.signTransaction({
          transaction: l,
          signTransaction: i
        }), o = c.buildPaymentPayload({
          requirement: a,
          signedTx: n,
          payerPublicKey: f
        }), b = await r.submitPayment({
          resource: s,
          payload: o,
          couponCode: t,
          metadata: void 0,
          // no metadata for refunds
          resourceType: "refund"
        });
        return b.settlement && P(b.settlement), S({
          status: "success",
          error: null,
          transactionId: b.transactionId || n.signature
        }), b;
      } catch (a) {
        const l = O(a, "Refund payment failed");
        throw S({
          status: "error",
          error: l,
          transactionId: null
        }), a;
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
        T(t);
        const { transaction: a } = await r.buildGaslessTransaction({
          resourceId: s,
          userWallet: f.toString(),
          feePayer: t.extra.feePayer
        }), l = c.deserializeTransaction(a), n = await c.partiallySignTransaction({
          transaction: l,
          signTransaction: i
        }), o = await r.submitGaslessTransaction({
          resource: s,
          partialTx: n,
          couponCode: void 0,
          // no couponCode
          metadata: void 0,
          // no metadata
          resourceType: "refund",
          requirement: t
        });
        return o.settlement && P(o.settlement), S({
          status: "success",
          error: null,
          transactionId: o.transactionId || "gasless-refund-tx"
        }), o;
      } catch (t) {
        const a = O(t, "Gasless refund payment failed");
        throw S({
          status: "error",
          error: a,
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
    }), T(null), P(null);
  }, []);
  return {
    state: R,
    requirement: p,
    settlement: E,
    fetchRefundQuote: k,
    processRefund: W,
    processGaslessRefund: g,
    reset: I
  };
}
export {
  Ye as CEDROS_EVENTS,
  gr as CEDROS_PAY_GROUPS,
  br as CEDROS_PAY_SECTIONS,
  Sr as CEDROS_PAY_SECTION_IDS,
  Dt as CIRCUIT_BREAKER_PRESETS,
  Ve as CSP_PRESETS,
  He as CedrosPay,
  Nt as CedrosProvider,
  Ot as CircuitBreakerOpenError,
  Gt as CircuitState,
  Wt as ComplianceGatePage,
  qt as CreditsBalance,
  Je as CreditsButton,
  Xe as CreditsSubscribeButton,
  ir as CryptoButton,
  Qe as CryptoSubscribeButton,
  zt as ERROR_CATEGORIES,
  Kt as FEATURE_FLAG_NAMES,
  Qt as FEATURE_FLAG_REGISTRY,
  fr as KNOWN_STABLECOINS,
  ar as LogLevel,
  nr as Logger,
  Ze as PaymentMethodBadge,
  et as PaymentModal,
  tt as ProductPrice,
  rt as PurchaseButton,
  $t as RATE_LIMITER_PRESETS,
  Ut as RETRY_PRESETS,
  at as RPC_PROVIDERS,
  nt as SECURITY_RECOMMENDATIONS,
  st as StripeButton,
  ot as SubscribeButton,
  it as SubscriptionManagementPanel,
  ur as WalletPool,
  ct as calculateDiscountPercentage,
  wr as cedrosPayPlugin,
  jt as createCircuitBreaker,
  sr as createLogger,
  Yt as createRateLimiter,
  lt as createTranslator,
  dr as createWalletPool,
  ut as detectLocale,
  Mt as ecommerce,
  fe as emitPaymentError,
  me as emitPaymentProcessing,
  Ie as emitPaymentStart,
  ve as emitPaymentSuccess,
  ye as emitWalletConnect,
  Be as emitWalletConnected,
  V as emitWalletError,
  dt as formatCSP,
  pt as formatCouponCodes,
  ft as generateCSP,
  mt as generateCSPDirectives,
  yt as getAvailableLocales,
  Vt as getFeatureFlagDefinition,
  Ht as getFeatureFlagDefinitions,
  gt as getLocalizedError,
  y as getLogger,
  bt as getUserErrorMessage,
  Jt as isFeatureEnabled,
  St as isRetryableError,
  wt as loadLocale,
  Ct as logSecurityReport,
  ht as parseCouponCodes,
  Xt as parseFeatureFlagBoolean,
  Zt as resolveFeatureFlags,
  er as retryWithBackoff,
  xt as stackCheckoutCoupons,
  H as useCedrosContext,
  qe as useCedrosTheme,
  Lt as useComplianceCheck,
  Ft as useCreditsBalance,
  Et as useCreditsPayment,
  Pt as useCreditsSubscription,
  Le as useCryptoSubscription,
  Rt as useLocalizedError,
  Tt as usePaymentMode,
  $e as useRefundVerification,
  kt as useStripeCheckout,
  vt as useSubscription,
  Bt as useSubscriptionManagement,
  ke as useTranslation,
  cr as useX402Payment,
  tr as validateConfig,
  It as validateSecurity,
  mr as validateTokenMint
};
