import { jsxs as G, jsx as h } from "react/jsx-runtime";
import { useState as L, useRef as R, useCallback as P, useMemo as Y, useEffect as H } from "react";
import { useWallet as be } from "@solana/wallet-adapter-react";
import { WalletReadyState as pe } from "@solana/wallet-adapter-base";
import { WalletIcon as Te } from "@solana/wallet-adapter-react-ui";
import { u as he, m as Z, i as n, a as Ie } from "./CedrosContext-BnJ2Cf7R.mjs";
import { a3 as Ee, k as We, T as Re, a4 as J, E as _e, F as fe, A as qe, D as ge, y as ze, z as we, B as ee, a5 as Me, a6 as De } from "./index-bbSf3B7-.mjs";
function Fe() {
  const { x402Manager: g, walletManager: s } = he(), { publicKey: _, signTransaction: q } = be(), [X, d] = L({
    status: "idle",
    error: null,
    transactionId: null
  }), [I, k] = L(null), [O, x] = L(null), C = R(_);
  C.current = _;
  const w = R(q);
  w.current = q;
  const u = R(0), K = 6e4, E = () => {
    const o = u.current;
    return o > 0 && Date.now() - o < K;
  }, v = P(() => {
    if (!_) {
      const o = "Wallet not connected";
      return d({ status: "error", error: o, transactionId: null }), { valid: !1, error: o };
    }
    if (!q) {
      const o = "Wallet does not support signing";
      return d({ status: "error", error: o, transactionId: null }), { valid: !1, error: o };
    }
    return { valid: !0 };
  }, [_, q]), z = P(
    async (o) => {
      try {
        d((i) => ({ ...i, status: "loading" }));
        const l = await g.requestQuote({ resource: o });
        if (!g.validateRequirement(l))
          throw new Error("Invalid requirement received from server");
        return k(l), d((i) => ({ ...i, status: "idle" })), l;
      } catch (l) {
        const i = Z(l, "Failed to fetch requirement");
        throw d({
          status: "error",
          error: i,
          transactionId: null
        }), l;
      }
    },
    [g]
  ), B = P(
    async (o, l, i, b, r = "regular") => {
      const a = C.current, y = w.current;
      if (!a || !y)
        throw new Error("Wallet disconnected during payment flow");
      if (!!o.extra?.feePayer) {
        n().debug("[useX402Payment] Gasless flow enabled"), n().debug("[useX402Payment] Building gasless transaction");
        const { transaction: f, blockhash: D } = await g.buildGaslessTransaction({
          resourceId: l,
          userWallet: a.toString(),
          feePayer: o.extra.feePayer,
          couponCode: i
        });
        n().debug("[useX402Payment] Deserializing backend transaction");
        const A = s.deserializeTransaction(f);
        if (C.current?.toString() !== a.toString())
          throw new Error("Wallet changed during payment flow");
        n().debug("[useX402Payment] Requesting partial signature");
        const T = await s.partiallySignTransaction({
          transaction: A,
          signTransaction: y,
          blockhash: D
        });
        n().debug("[useX402Payment] Submitting partial transaction");
        const F = await g.submitGaslessTransaction({
          resource: l,
          partialTx: T,
          couponCode: i,
          metadata: b,
          resourceType: r,
          requirement: o
        });
        return F.success && F.settlement && x(F.settlement), F;
      } else {
        const f = await s.buildTransaction({
          requirement: o,
          payerPublicKey: a
        });
        if (C.current?.toString() !== a.toString())
          throw new Error("Wallet changed during payment flow");
        const D = await s.signTransaction({
          transaction: f,
          signTransaction: y
        }), A = s.buildPaymentPayload({
          requirement: o,
          signedTx: D,
          payerPublicKey: a
        }), T = await g.submitPayment({
          resource: l,
          payload: A,
          couponCode: i,
          metadata: b,
          resourceType: r
        });
        return T.success && T.settlement && x(T.settlement), T;
      }
    },
    [g, s]
  ), p = P(
    async (o, l, i) => {
      if (E())
        return { success: !1, error: "Payment already in progress" };
      const b = v();
      if (!b.valid)
        return { success: !1, error: b.error };
      u.current = Date.now(), d({
        status: "loading",
        error: null,
        transactionId: null
      });
      try {
        n().debug("[useX402Payment] Fetching fresh quote");
        const r = await g.requestQuote({ resource: o, couponCode: l });
        n().debug("[useX402Payment] Received quote", {
          amount: r.maxAmountRequired
        }), k(r), n().debug("[useX402Payment] Executing payment flow");
        const a = await B(r, o, l, i, "regular");
        return a.success ? d({
          status: "success",
          error: null,
          transactionId: a.transactionId || "payment-success"
        }) : d({
          status: "error",
          error: a.error || "Payment failed",
          transactionId: null
        }), a;
      } catch (r) {
        const a = Z(r, "Payment failed");
        return d({
          status: "error",
          error: a,
          transactionId: null
        }), { success: !1, error: a };
      } finally {
        u.current = 0;
      }
    },
    [v, g, B]
  ), M = P(
    async (o, l, i) => {
      if (E())
        return { success: !1, error: "Payment already in progress" };
      const b = v();
      if (!b.valid)
        return { success: !1, error: b.error };
      u.current = Date.now(), d({
        status: "loading",
        error: null,
        transactionId: null
      });
      try {
        const r = Ee(o), a = await g.requestCartQuote({
          items: r,
          metadata: l,
          couponCode: i
        }), y = a.cartId, c = a.quote;
        if (!g.validateRequirement(c))
          throw new Error("Invalid cart quote received from server");
        k(c);
        const f = await B(c, y, i, l, "cart");
        return f.success ? d({
          status: "success",
          error: null,
          transactionId: f.transactionId || "cart-payment-success"
        }) : d({
          status: "error",
          error: f.error || "Cart payment failed",
          transactionId: null
        }), f;
      } catch (r) {
        const a = Z(r, "Cart payment failed");
        return d({
          status: "error",
          error: a,
          transactionId: null
        }), { success: !1, error: a };
      } finally {
        u.current = 0;
      }
    },
    [v, g, B]
  ), W = P(() => {
    d({
      status: "idle",
      error: null,
      transactionId: null
    }), k(null), x(null), u.current = 0;
  }, []);
  return {
    ...X,
    requirement: I,
    settlement: O,
    fetchQuote: z,
    processPayment: p,
    processCartPayment: M,
    reset: W
  };
}
function $e({
  resource: g,
  items: s,
  label: _,
  disabled: q = !1,
  onAttempt: X,
  onSuccess: d,
  onError: I,
  className: k = "",
  testPageUrl: O,
  hideMessages: x = !1,
  metadata: C,
  couponCode: w
}) {
  const { connected: u, connecting: K, connect: E, disconnect: v, select: z, wallets: B, wallet: p, publicKey: M } = be(), { status: W, error: o, transactionId: l, processPayment: i, processCartPayment: b } = Fe(), r = Ie(), { solanaError: a } = he(), { isCartMode: y, effectiveResource: c } = We(g, s), { t: f, translations: D } = Re(), A = _ || f("ui.pay_with_crypto"), T = o && typeof o != "string" ? o?.code ?? null : null, F = a && typeof a != "string" ? a?.code ?? null : null, te = (e) => {
    if (!e || !D) return "";
    const t = D.errors[e];
    return t ? t.action ? `${t.message} ${t.action}` : t.message : "";
  }, re = o ? typeof o == "string" ? o : te(T) : null, ne = a ? typeof a == "string" ? a : te(F) : null, oe = R(d), ae = R(I), se = R(i), le = R(b);
  oe.current = d, ae.current = I, se.current = i, le.current = b;
  const Ce = Y(
    () => B.map((e) => `${e.adapter.name}-${e.readyState}`).join(","),
    [B]
  ), Q = Y(
    () => B.filter(
      ({ readyState: e }) => e === pe.Installed || e === pe.Loadable
    ),
    // walletStateKey is derived from availableWallets, so we only need availableWallets as dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [Ce]
  );
  H(() => {
    if (W === "success" && l) {
      const e = y && s ? J(s) : void 0;
      _e("crypto", l, c, e), oe.current?.(l);
    }
  }, [W, l, y, s, c]), H(() => {
    if (W === "error" && o) {
      const e = y && s ? J(s) : void 0;
      fe("crypto", o, c, e), ae.current?.(o);
    }
  }, [W, o, y, s, c]);
  const ce = typeof window < "u" && window.top !== window.self, [ie, $] = L(!1), [ue, V] = L(!1), [N, S] = L(null), j = a;
  H(() => {
    let e = !1;
    return e || (async () => {
      if (ue && p && !u && !K) {
        n().debug("[CryptoButton] Wallet detected, attempting auto-connect:", p.adapter.name), V(!1), we(p.adapter.name);
        try {
          await E(), e || n().debug("[CryptoButton] Auto-connect successful");
        } catch (m) {
          if (!e) {
            n().error("[CryptoButton] Auto-connect failed:", m);
            const U = m instanceof Error ? m.message : "Failed to connect wallet";
            ee(U, p.adapter.name), S(null);
          }
        }
      }
    })(), () => {
      e = !0;
    };
  }, [p, ue, u, K, E]), H(() => {
    let e = !0;
    if (n().debug("[CryptoButton] Payment useEffect triggered", {
      connected: u,
      hasPendingPayment: !!N,
      hasPublicKey: !!M,
      pendingPaymentType: N?.type
    }), u && N && M && p && e) {
      qe(p.adapter.name, M.toString()), n().debug("[CryptoButton] All conditions met! Processing pending payment:", N);
      const t = N;
      S(null), $(!1);
      const m = t.type === "cart" && t.items ? J(t.items) : void 0;
      ge("crypto", t.resource, m), t.type === "cart" && t.items ? (n().debug("[CryptoButton] Auto-processing cart payment"), le.current(t.items, t.metadata, t.couponCode)) : t.type === "single" && t.resource && (n().debug("[CryptoButton] Auto-processing single payment"), se.current(t.resource, t.couponCode, t.metadata));
    }
    return () => {
      e = !1;
    };
  }, [u, N, M, p]);
  const de = P(async () => {
    n().debug("[CryptoButton] executePaymentFlow called", {
      connected: u,
      wallet: p?.adapter.name,
      couponCode: w,
      isCartMode: y,
      hasItems: !!s,
      effectiveResource: c
    });
    const e = y && s ? J(s) : void 0;
    if (ze("crypto", c, e), X && X("crypto"), j) {
      n().error("[CryptoButton] Solana dependencies missing:", j), fe("crypto", j, c, e), I && I(j);
      return;
    }
    if (ce) {
      const t = O || window.location.href;
      try {
        if (new URL(t, window.location.origin).origin !== window.location.origin)
          throw n().error("[CryptoButton] Blocked attempt to open external URL:", t), new Error("Cannot open external URLs from embedded context");
        window.open(t, "_blank", "noopener,noreferrer");
      } catch (m) {
        throw n().error("[CryptoButton] URL validation failed:", m), m;
      }
      return;
    }
    if (u)
      ge("crypto", c, e), y && s ? (n().debug("[CryptoButton] Processing cart payment with coupon:", w), await b(s, C, w)) : c && (n().debug("[CryptoButton] Processing single payment with coupon:", w), await i(c, w, C));
    else {
      let t = !1;
      if (y && s ? (n().debug("[CryptoButton] Setting pending cart payment with coupon:", w), S({ type: "cart", items: s, metadata: C, couponCode: w }), t = !0) : c && (n().debug("[CryptoButton] Setting pending single payment with coupon:", w), S({ type: "single", resource: c, metadata: C, couponCode: w }), t = !0), !t) {
        n().error("[CryptoButton] No valid payment to process");
        return;
      }
      try {
        if (p)
          n().debug("[CryptoButton] Wallet already selected, connecting:", p.adapter.name), we(p.adapter.name), await E();
        else {
          if (n().debug(
            "[CryptoButton] No wallet selected, showing selector. Available wallets:",
            Q.map((m) => m.adapter.name)
          ), Q.length === 0) {
            S(null);
            const m = "No wallets available";
            throw ee(m), new Error(m);
          }
          $(!0);
        }
      } catch (m) {
        S(null);
        const U = m instanceof Error ? m.message : "Failed to connect wallet";
        n().error("[CryptoButton] Connection error:", U), ee(U, p?.adapter.name);
      }
    }
  }, [u, p, w, y, s, c, ce, O, Q, E, C, b, i, j, X, I]), ye = Y(() => y && s ? `crypto-cart-${s.map((e) => e.resource).join("-")}` : `crypto-${c || "unknown"}`, [y, s, c]), Pe = Y(
    () => Me(ye, de, {
      cooldownMs: 200,
      deduplicationWindowMs: 0
      // MUST be 0 for crypto - each payment needs fresh transaction
    }),
    [ye, de]
  ), me = W === "loading", xe = q || me || K || !!j, ve = me ? f("ui.processing") : A, Se = P(async () => {
    try {
      V(!1), u && await v(), z(null), $(!0);
    } catch (e) {
      n().error("Failed to change wallet:", e);
    }
  }, [u, v, z]), ke = P((e) => {
    n().debug("[CryptoButton] Wallet clicked:", e), $(!1), z(e), V(!0), n().debug("[CryptoButton] Wallet selected, useEffect will auto-connect");
  }, [z]), Be = P(async () => {
    try {
      if (await v(), S(null), typeof window < "u" && window.localStorage)
        try {
          window.localStorage.removeItem("walletName");
        } catch (e) {
          e instanceof Error && e.name === "QuotaExceededError" ? n().warn("localStorage quota exceeded when removing wallet preference") : n().error("Failed to clear wallet preference from localStorage:", e);
        }
    } catch (e) {
      n().error("Failed to disconnect wallet:", e);
    }
  }, [v]);
  return /* @__PURE__ */ G("div", { className: r.unstyled ? k : `${r.className} cedros-theme__crypto-button ${k || ""}`, style: r.unstyled ? {} : r.style, children: [
    /* @__PURE__ */ h(
      "button",
      {
        onClick: Pe,
        disabled: xe,
        className: r.unstyled ? k : "cedros-theme__button cedros-theme__crypto",
        type: "button",
        children: ve
      }
    ),
    ie && !x && /* @__PURE__ */ h(
      "div",
      {
        className: "cedros-modal-overlay",
        style: {
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: r.tokens.modalOverlay,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "1rem"
        },
        onClick: () => {
          $(!1), S(null);
        },
        children: /* @__PURE__ */ G(
          "div",
          {
            className: "cedros-modal-content",
            style: {
              backgroundColor: r.tokens.modalBackground,
              borderRadius: "12px",
              padding: "2rem",
              maxWidth: "400px",
              width: "100%",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              border: `1px solid ${r.tokens.modalBorder}`
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
                    /* @__PURE__ */ h(
                      "h3",
                      {
                        style: {
                          margin: 0,
                          fontSize: "1.25rem",
                          fontWeight: 600,
                          color: r.tokens.surfaceText
                        },
                        children: f("wallet.select_wallet")
                      }
                    ),
                    /* @__PURE__ */ h(
                      "button",
                      {
                        onClick: () => {
                          $(!1), S(null);
                        },
                        style: De(r.tokens.surfaceText),
                        "aria-label": "Close modal",
                        type: "button",
                        children: "×"
                      }
                    )
                  ]
                }
              ),
              /* @__PURE__ */ h("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem" }, children: Q.map((e) => /* @__PURE__ */ G(
                "button",
                {
                  onClick: () => ke(e.adapter.name),
                  style: {
                    width: "100%",
                    padding: "1rem",
                    backgroundColor: r.tokens.surfaceBackground,
                    border: `1px solid ${r.tokens.surfaceBorder}`,
                    borderRadius: "0.5rem",
                    cursor: "pointer",
                    fontSize: "1rem",
                    textAlign: "left",
                    color: r.tokens.surfaceText,
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    transition: "all 0.2s ease"
                  },
                  onMouseEnter: (t) => {
                    t.currentTarget.style.backgroundColor = r.tokens.modalBackground, t.currentTarget.style.borderColor = r.tokens.surfaceText, t.currentTarget.style.transform = "translateY(-2px)";
                  },
                  onMouseLeave: (t) => {
                    t.currentTarget.style.backgroundColor = r.tokens.surfaceBackground, t.currentTarget.style.borderColor = r.tokens.surfaceBorder, t.currentTarget.style.transform = "translateY(0)";
                  },
                  type: "button",
                  children: [
                    /* @__PURE__ */ h(Te, { wallet: e, style: { width: "24px", height: "24px" } }),
                    /* @__PURE__ */ h("span", { style: { fontWeight: 500 }, children: e.adapter.name })
                  ]
                },
                e.adapter.name
              )) })
            ]
          }
        )
      }
    ),
    u && !x && !ie && /* @__PURE__ */ G("div", { style: {
      display: "flex",
      justifyContent: "space-between",
      marginTop: "0.5rem",
      fontSize: "0.75rem",
      color: r.tokens.surfaceText,
      opacity: 0.7
    }, children: [
      /* @__PURE__ */ h(
        "button",
        {
          onClick: Se,
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
          children: f("wallet.change")
        }
      ),
      /* @__PURE__ */ h(
        "button",
        {
          onClick: Be,
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
          children: f("ui.disconnect")
        }
      )
    ] }),
    !x && ne && /* @__PURE__ */ h("div", { className: r.unstyled ? "" : "cedros-theme__error", children: ne }),
    !x && re && /* @__PURE__ */ h("div", { className: r.unstyled ? "" : "cedros-theme__error", children: re }),
    !x && l && /* @__PURE__ */ h("div", { className: r.unstyled ? "" : "cedros-theme__success", children: f("ui.payment_successful") })
  ] });
}
const Oe = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  CryptoButton: $e
}, Symbol.toStringTag, { value: "Module" }));
export {
  $e as C,
  Oe as a,
  Fe as u
};
