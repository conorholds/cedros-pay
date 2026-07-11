import { p as xt, q as _t, r as Q, G as Lt, o as Mt, l as $, n as Dt, m as Ot, T as Kt } from "./styles-Bb8kmr-Y.mjs";
import { C as Ne, a as Ue, b as qe, c as ze, d as $e, P as He, e as je, R as Ge, S as Ve, f as Ye, g as Qe, h as Je, i as Xe, j as Ze, k as tr, s as er, t as rr, u as nr, v as ar, w as or, x as sr, y as ir, z as cr, A as lr, B as ur, D as dr, E as fr, F as pr, H as br, I as yr, J as mr, K as gr, L as wr, M as hr, N as Sr, O as Ar, Q as Cr } from "./styles-Bb8kmr-Y.mjs";
import { u as J, m as H, l as Ft } from "./CedrosContext-Dlez5itz.mjs";
import { C as Pr, a as Er, b as Tr, c as kr, E as Br, F as Rr, d as Wr, R as vr, e as xr, f as _r, g as Lr, h as Mr, i as Dr, j as Or, p as Kr, r as Fr, k as Nr, v as Ur } from "./CedrosContext-Dlez5itz.mjs";
import { buildSolanaSubscriptionPlanTransaction as zr, sendSolanaSubscriptionPlanTransaction as $r } from "./solanaSubscriptionPlans-BFozR2XX.mjs";
import { g as R } from "./fetchWithTimeout-D-qpKB_T.mjs";
import { L as jr, a as Gr, c as Vr } from "./fetchWithTimeout-D-qpKB_T.mjs";
import { K as Qr, g as Jr, n as Xr, a as Zr } from "./locales-BNQRXSb3.mjs";
import { f as en, a as rn, b as nn, c as an, d as on, s as sn } from "./formatting-Dr0N4Iyb.mjs";
import { jsxs as K, jsx as T } from "react/jsx-runtime";
import { useState as F, useRef as _, useCallback as S, useEffect as bt, useMemo as V } from "react";
import { useWallet as yt } from "@solana/wallet-adapter-react";
import { WalletReadyState as ut } from "@solana/wallet-adapter-base";
import { WalletIcon as Nt } from "@solana/wallet-adapter-react-ui";
import { WalletPool as ln, createWalletPool as un } from "./walletPool-DnhxYrUy.mjs";
import { Transaction as mt, TransactionInstruction as gt, SystemProgram as wt, Connection as Ut, PublicKey as m, clusterApiUrl as qt } from "@solana/web3.js";
import { getAssociatedTokenAddressSync as zt, ASSOCIATED_TOKEN_PROGRAM_ID as ht, createAssociatedTokenAccountInstruction as $t } from "@solana/spl-token";
function Ht(t) {
  return {
    background: "none",
    border: "none",
    fontSize: "1.5rem",
    cursor: "pointer",
    color: t,
    opacity: 0.6,
    padding: "0.25rem",
    lineHeight: 1
  };
}
function jt() {
  const { subscriptionManager: t, subscriptionX402Manager: e, walletManager: r } = J(), { publicKey: a, signTransaction: n } = yt(), [i, o] = F({
    status: "idle",
    error: null,
    sessionId: null,
    subscriptionStatus: null,
    expiresAt: null
  }), [C, w] = F(null), h = _(!1), c = _(a);
  c.current = a;
  const b = _(n);
  b.current = n;
  const I = S(() => {
    const A = c.current, f = b.current;
    if (!A) {
      const d = "Wallet not connected";
      return o((s) => ({ ...s, status: "error", error: d })), { valid: !1, error: d };
    }
    if (!f) {
      const d = "Wallet does not support signing";
      return o((s) => ({ ...s, status: "error", error: d })), { valid: !1, error: d };
    }
    return { valid: !0 };
  }, []), P = S(
    async (A) => {
      if (!a)
        return o((f) => ({
          ...f,
          status: "error",
          error: "Wallet not connected"
        })), null;
      o((f) => ({
        ...f,
        status: "checking",
        error: null
      }));
      try {
        const f = await t.checkSubscriptionStatus({
          resource: A,
          userId: a.toString()
        });
        return o((d) => ({
          ...d,
          status: f.active ? "success" : "idle",
          subscriptionStatus: f.status,
          expiresAt: f.expiresAt || f.currentPeriodEnd || null
        })), f;
      } catch (f) {
        const d = H(f, "Failed to check subscription status");
        return o((s) => ({
          ...s,
          status: "error",
          error: d
        })), null;
      }
    },
    [a, t]
  ), v = S(
    async (A, f, d) => {
      o((s) => ({
        ...s,
        status: "loading",
        error: null
      }));
      try {
        const s = await t.requestSubscriptionQuote(
          A,
          f,
          d
        );
        return w(s), o((l) => ({
          ...l,
          status: "idle"
        })), s;
      } catch (s) {
        const l = H(s, "Failed to get subscription quote");
        return o((u) => ({
          ...u,
          status: "error",
          error: l
        })), null;
      }
    },
    [t]
  ), M = S(
    async (A, f, d) => {
      if (h.current)
        return { success: !1, error: "Payment already in progress" };
      const s = I();
      if (!s.valid)
        return { success: !1, error: s.error };
      h.current = !0, o((l) => ({
        ...l,
        status: "loading",
        error: null
      }));
      try {
        const l = await t.requestSubscriptionQuote(
          A,
          f,
          d
        );
        w(l);
        const u = l.requirement;
        if (!e.validateRequirement(u))
          throw new Error("Invalid subscription quote received from server");
        const k = c.current, x = b.current;
        if (!k || !x)
          throw new Error("Wallet disconnected during payment flow");
        const N = !!u.extra?.feePayer;
        let W;
        if (N) {
          const { transaction: y, blockhash: E } = await e.buildGaslessTransaction({
            resourceId: A,
            userWallet: k.toString(),
            feePayer: u.extra.feePayer,
            couponCode: d?.couponCode
          }), B = r.deserializeTransaction(y), U = await r.partiallySignTransaction({
            transaction: B,
            signTransaction: x,
            blockhash: E
          });
          W = await e.submitGaslessTransaction({
            resource: A,
            partialTx: U,
            couponCode: d?.couponCode,
            resourceType: "regular",
            requirement: u
          });
        } else {
          const y = await r.buildTransaction({
            requirement: u,
            payerPublicKey: k
          }), E = await r.signTransaction({
            transaction: y,
            signTransaction: x
          }), B = r.buildPaymentPayload({
            requirement: u,
            signedTx: E,
            payerPublicKey: k
          });
          W = await e.submitPayment({
            resource: A,
            payload: B,
            couponCode: d?.couponCode,
            resourceType: "regular"
          });
        }
        if (W.success) {
          const y = W.transactionId || W.settlement?.txHash || void 0;
          if (!y)
            throw new Error("Subscription payment succeeded without a transaction signature");
          const E = await t.activateX402Subscription({
            productId: A,
            wallet: k.toString(),
            paymentSignature: y,
            interval: f,
            intervalDays: d?.intervalDays
          });
          o({
            status: "success",
            error: null,
            sessionId: y,
            subscriptionStatus: E.status,
            expiresAt: E.currentPeriodEnd
          });
        } else
          o((y) => ({
            ...y,
            status: "error",
            error: W.error || "Subscription payment failed"
          }));
        return W;
      } catch (l) {
        const u = H(l, "Subscription payment failed");
        return o((k) => ({
          ...k,
          status: "error",
          error: u
        })), { success: !1, error: u };
      } finally {
        h.current = !1;
      }
    },
    [
      I,
      t,
      e,
      r
    ]
  ), D = S(() => {
    o({
      status: "idle",
      error: null,
      sessionId: null,
      subscriptionStatus: null,
      expiresAt: null
    }), w(null);
  }, []);
  return {
    ...i,
    quote: C,
    checkStatus: P,
    requestQuote: v,
    processPayment: M,
    reset: D
  };
}
function Gt({
  theme: t,
  changeLabel: e,
  disconnectLabel: r,
  onChangeWallet: a,
  onDisconnect: n
}) {
  const i = {
    background: "none",
    border: "none",
    padding: 0,
    color: "inherit",
    textDecoration: "none",
    cursor: "pointer",
    fontSize: "inherit"
  };
  return /* @__PURE__ */ K(
    "div",
    {
      style: {
        display: "flex",
        justifyContent: "space-between",
        marginTop: "0.5rem",
        fontSize: "0.75rem",
        color: t.tokens.surfaceText,
        opacity: 0.7
      },
      children: [
        /* @__PURE__ */ T("button", { onClick: a, style: i, type: "button", children: e }),
        /* @__PURE__ */ T("button", { onClick: n, style: i, type: "button", children: r })
      ]
    }
  );
}
function Vt({
  wallets: t,
  theme: e,
  title: r,
  onSelectWallet: a,
  onClose: n
}) {
  return /* @__PURE__ */ T(
    "div",
    {
      className: "cedros-modal-overlay",
      style: {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: e.tokens.modalOverlay,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "1rem"
      },
      onClick: n,
      children: /* @__PURE__ */ K(
        "div",
        {
          className: "cedros-modal-content",
          style: {
            backgroundColor: e.tokens.modalBackground,
            borderRadius: "12px",
            padding: "2rem",
            maxWidth: "400px",
            width: "100%",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            border: `1px solid ${e.tokens.modalBorder}`
          },
          onClick: (i) => i.stopPropagation(),
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
                  /* @__PURE__ */ T(
                    "h3",
                    {
                      style: {
                        margin: 0,
                        fontSize: "1.25rem",
                        fontWeight: 600,
                        color: e.tokens.surfaceText
                      },
                      children: r
                    }
                  ),
                  /* @__PURE__ */ T(
                    "button",
                    {
                      onClick: n,
                      style: Ht(e.tokens.surfaceText),
                      "aria-label": "Close modal",
                      type: "button",
                      children: "x"
                    }
                  )
                ]
              }
            ),
            /* @__PURE__ */ T("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem" }, children: t.map((i) => /* @__PURE__ */ K(
              "button",
              {
                onClick: () => a(i.adapter.name),
                style: {
                  width: "100%",
                  padding: "1rem",
                  backgroundColor: e.tokens.surfaceBackground,
                  border: `1px solid ${e.tokens.surfaceBorder}`,
                  borderRadius: "0.5rem",
                  cursor: "pointer",
                  fontSize: "1rem",
                  textAlign: "left",
                  color: e.tokens.surfaceText,
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  transition: "all 0.2s ease"
                },
                onMouseEnter: (o) => {
                  o.currentTarget.style.backgroundColor = e.tokens.modalBackground, o.currentTarget.style.borderColor = e.tokens.surfaceText, o.currentTarget.style.transform = "translateY(-2px)";
                },
                onMouseLeave: (o) => {
                  o.currentTarget.style.backgroundColor = e.tokens.surfaceBackground, o.currentTarget.style.borderColor = e.tokens.surfaceBorder, o.currentTarget.style.transform = "translateY(0)";
                },
                type: "button",
                children: [
                  /* @__PURE__ */ T(Nt, { wallet: i, style: { width: "24px", height: "24px" } }),
                  /* @__PURE__ */ T("span", { style: { fontWeight: 500 }, children: i.adapter.name })
                ]
              },
              i.adapter.name
            )) })
          ]
        }
      )
    }
  );
}
const Yt = 15e3, Qt = 25;
function Jt(t) {
  return new Promise((e) => setTimeout(e, t));
}
function Xt({
  connected: t,
  wallet: e,
  publicKey: r,
  connect: a,
  disconnect: n,
  select: i,
  logPrefix: o,
  walletSelectionTimeoutMs: C = Yt
}) {
  const [w, h] = F(!1), c = _({ connected: t, wallet: e, publicKey: r, connect: a, disconnect: n, select: i }), b = _(null);
  c.current = { connected: t, wallet: e, publicKey: r, connect: a, disconnect: n, select: i }, bt(() => () => {
    b.current?.reject(new Error("Wallet selection cancelled")), b.current = null;
  }, []);
  const I = S(async (s, l) => {
    const u = Date.now();
    for (; !s(c.current); ) {
      if (Date.now() - u > C)
        throw new Error(l);
      await Jt(Qt);
    }
    return c.current;
  }, [C]), P = S(() => new Promise((s, l) => {
    b.current?.reject(new Error("Wallet selection replaced")), b.current = { resolve: s, reject: l }, h(!0);
  }), []), v = S(async () => {
    const s = c.current;
    if (s.connected && s.wallet && s.publicKey)
      return { wallet: s.wallet, publicKey: s.publicKey };
    if (!s.wallet)
      throw new Error("No wallet selected");
    xt(s.wallet.adapter.name), await s.connect();
    const l = await I(
      (u) => !!(u.connected && u.wallet && u.publicKey),
      "Timed out waiting for wallet connection"
    );
    if (!l.wallet || !l.publicKey)
      throw new Error("Wallet did not finish connecting");
    return _t(l.wallet.adapter.name, l.publicKey.toString()), R().debug(`[${o}] Wallet connected`, l.wallet.adapter.name), { wallet: l.wallet, publicKey: l.publicKey };
  }, [o, I]), M = S((s) => {
    R().debug(`[${o}] Wallet selected`, s), h(!1), c.current.select(s);
    const l = b.current;
    if (l) {
      b.current = null, l.resolve(s);
      return;
    }
    I(
      (u) => u.wallet?.adapter.name === s,
      "Timed out waiting for wallet selection"
    ).then(() => v()).catch((u) => {
      const k = u instanceof Error ? u.message : "Failed to connect wallet";
      Q(k, s), R().error(`[${o}] Wallet selection failed:`, u);
    });
  }, [v, o, I]), D = S(() => {
    h(!1), b.current?.reject(new Error("Wallet selection cancelled")), b.current = null;
  }, []), A = S(async () => {
    if (c.current.connected && c.current.wallet && c.current.publicKey)
      return {
        wallet: c.current.wallet,
        publicKey: c.current.publicKey
      };
    if (!c.current.wallet) {
      const s = await P();
      await I(
        (l) => l.wallet?.adapter.name === s,
        "Timed out waiting for wallet selection"
      );
    }
    return v();
  }, [v, I, P]), f = S(async () => {
    try {
      c.current.connected && await c.current.disconnect(), c.current.select(null), h(!0);
    } catch (s) {
      R().error(`[${o}] Failed to change wallet:`, s);
    }
  }, [o]), d = S(async () => {
    try {
      await c.current.disconnect();
      try {
        typeof window < "u" && window.localStorage && window.localStorage.removeItem("walletName");
      } catch (s) {
        R().warn(`[${o}] Failed to clear stored wallet name:`, s);
      }
    } catch (s) {
      R().error(`[${o}] Failed to disconnect wallet:`, s);
    }
  }, [o]);
  return {
    showWalletSelector: w,
    ensureConnectedWallet: A,
    selectWalletByName: M,
    cancelWalletSelection: D,
    changeWallet: f,
    disconnectWallet: d
  };
}
function Me({
  resource: t,
  interval: e,
  intervalDays: r,
  couponCode: a,
  label: n,
  disabled: i = !1,
  onAttempt: o,
  onSuccess: C,
  onError: w,
  className: h = "",
  testPageUrl: c,
  hideMessages: b = !1,
  autoCheckStatus: I = !0
}) {
  const {
    connected: P,
    connecting: v,
    connect: M,
    disconnect: D,
    select: A,
    wallets: f,
    wallet: d,
    publicKey: s
  } = yt(), {
    status: l,
    error: u,
    subscriptionStatus: k,
    expiresAt: x,
    checkStatus: N,
    processPayment: W
  } = jt(), y = Ft(), { solanaError: E } = J(), { t: B, translations: U } = Lt(), It = n || B("ui.subscribe_with_crypto"), Pt = u && typeof u != "string" ? u?.code ?? null : null, Et = E && typeof E != "string" ? E?.code ?? null : null, Z = (p) => {
    if (!p || !U) return "";
    const g = U.errors[p];
    return g ? g.action ? `${g.message} ${g.action}` : g.message : "";
  }, tt = u ? typeof u == "string" ? u : Z(Pt) : null, et = E ? typeof E == "string" ? E : Z(Et) : null, G = V(
    () => f.filter(
      ({ readyState: p }) => p === ut.Installed || p === ut.Loadable
    ),
    [f]
  );
  bt(() => {
    I && P && s && (R().debug("[CryptoSubscribeButton] Auto-checking subscription status"), N(t));
  }, [I, N, P, s, t]);
  const rt = typeof window < "u" && window.top !== window.self, O = E, {
    showWalletSelector: nt,
    ensureConnectedWallet: at,
    selectWalletByName: Tt,
    cancelWalletSelection: kt,
    changeWallet: Bt,
    disconnectWallet: Rt
  } = Xt({
    connected: P,
    wallet: d,
    publicKey: s,
    connect: M,
    disconnect: D,
    select: (p) => A(p),
    logPrefix: "CryptoSubscribeButton"
  }), ot = S((p) => {
    if (p.success) {
      const lt = p.transactionId || "subscription-active";
      Mt("crypto", lt, t), C?.(lt);
      return;
    }
    const g = p.error || "Subscription payment failed";
    $("crypto", g, t), w?.(g);
  }, [w, C, t]), st = S(async () => {
    if (R().debug("[CryptoSubscribeButton] executeSubscriptionFlow called", {
      connected: P,
      wallet: d?.adapter.name,
      resource: t,
      interval: e
    }), Dt("crypto", t), o && o("crypto"), O) {
      R().error("[CryptoSubscribeButton] Solana dependencies unavailable"), $("crypto", O, t), w && w(O);
      return;
    }
    if (rt) {
      const p = c || window.location.href;
      try {
        if (new URL(p, window.location.origin).origin !== window.location.origin)
          throw R().error("[CryptoSubscribeButton] Blocked external URL"), new Error("Cannot open external URLs from embedded context");
        window.open(p, "_blank", "noopener,noreferrer");
      } catch (g) {
        throw R().error("[CryptoSubscribeButton] URL validation failed"), g;
      }
      return;
    }
    try {
      if (!P) {
        if (!d && G.length === 0) {
          const g = "No wallets available";
          Q(g), $("crypto", g, t), w?.(g);
          return;
        }
        await at();
      }
      Ot("crypto", t);
      const p = await W(t, e, { couponCode: a, intervalDays: r });
      ot(p);
    } catch (p) {
      const g = p instanceof Error ? p.message : "Failed to connect wallet";
      R().error("[CryptoSubscribeButton] Wallet connection failed"), Q(g, d?.adapter.name), $("crypto", g, t), w?.(g);
    }
  }, [
    P,
    d,
    t,
    e,
    a,
    r,
    rt,
    c,
    G,
    at,
    W,
    ot,
    O,
    o,
    w
  ]), it = V(() => `crypto-subscribe-${t}-${e}`, [t, e]), Wt = V(
    () => Kt(it, st, {
      cooldownMs: 200,
      deduplicationWindowMs: 0
    }),
    [it, st]
  ), ct = l === "loading" || l === "checking", q = k === "active" || k === "trialing", vt = i || ct || v || !!O || q;
  let z = It;
  if (ct)
    z = B("ui.processing");
  else if (q && x) {
    const p = new Date(x).toLocaleDateString();
    z = `${B("ui.subscribed_until")} ${p}`;
  } else q && (z = B("ui.subscribed"));
  return /* @__PURE__ */ K(
    "div",
    {
      className: y.unstyled ? h : `${y.className} cedros-theme__crypto-button ${h || ""}`,
      style: y.unstyled ? {} : y.style,
      children: [
        /* @__PURE__ */ T(
          "button",
          {
            onClick: Wt,
            disabled: vt,
            className: y.unstyled ? h : "cedros-theme__button cedros-theme__crypto",
            type: "button",
            children: z
          }
        ),
        nt && !b && /* @__PURE__ */ T(
          Vt,
          {
            wallets: G,
            theme: y,
            title: B("wallet.select_wallet"),
            onSelectWallet: Tt,
            onClose: kt
          }
        ),
        P && !b && !nt && /* @__PURE__ */ T(
          Gt,
          {
            theme: y,
            changeLabel: B("wallet.change"),
            disconnectLabel: B("ui.disconnect"),
            onChangeWallet: () => {
              Bt();
            },
            onDisconnect: () => {
              Rt();
            }
          }
        ),
        !b && et && /* @__PURE__ */ T("div", { className: y.unstyled ? "" : "cedros-theme__error", children: et }),
        !b && tt && /* @__PURE__ */ T("div", { className: y.unstyled ? "" : "cedros-theme__error", children: tt }),
        !b && q && /* @__PURE__ */ T("div", { className: y.unstyled ? "" : "cedros-theme__success", children: B("ui.subscription_active") })
      ]
    }
  );
}
function De() {
  const { refundManager: t } = J(), [e, r] = F({
    status: "idle",
    error: null,
    transactionId: null
  }), [a, n] = F(null), i = _(!1), o = S(
    async (h) => {
      if (i.current)
        throw new Error("Refund request already in progress");
      i.current = !0, r({ status: "loading", error: null, transactionId: null });
      try {
        const c = await t.requestRefund(h);
        return n(c), r({ status: "success", error: null, transactionId: c.signature ?? null }), c;
      } catch (c) {
        throw r({
          status: "error",
          error: H(c, "Failed to request refund"),
          transactionId: null
        }), c;
      } finally {
        i.current = !1;
      }
    },
    [t]
  ), C = S(
    async (h) => {
      const c = await t.getRefundStatus(h);
      return n(c), c;
    },
    [t]
  ), w = S(() => {
    r({ status: "idle", error: null, transactionId: null }), n(null);
  }, []);
  return { state: e, refund: a, requestRefund: o, refreshStatus: C, reset: w };
}
const Zt = 11, te = 0, ee = "plan", re = "SubscriptionAuthority", ne = "subscription", ae = "event_authority";
function oe(t) {
  const e = t.prepared, r = St(e, t.subscriberPublicKey), a = t.expectedCreatedAt ?? e.expectedCreatedAt, n = t.expectedSubscriptionAuthorityInitId ?? e.expectedSubscriptionAuthorityInitId;
  if (a === void 0 || n === void 0)
    throw new Error("Solana subscription authorization is missing live on-chain terms.");
  const i = new mt().add(
    new gt({
      programId: r.programId,
      keys: [
        { pubkey: r.subscriber, isSigner: !0, isWritable: !0 },
        { pubkey: r.merchant, isSigner: !1, isWritable: !1 },
        { pubkey: r.planPda, isSigner: !1, isWritable: !1 },
        { pubkey: r.subscriptionPda, isSigner: !1, isWritable: !0 },
        { pubkey: r.subscriptionAuthorityPda, isSigner: !1, isWritable: !1 },
        { pubkey: wt.programId, isSigner: !1, isWritable: !1 },
        { pubkey: r.eventAuthorityPda, isSigner: !1, isWritable: !1 },
        { pubkey: r.programId, isSigner: !1, isWritable: !1 }
      ],
      data: Buffer.from(pe(e, r.planBump, a, n))
    })
  );
  return i.feePayer = r.subscriber, {
    transaction: i,
    planAddress: r.planPda.toBase58(),
    subscriptionAddress: r.subscriptionPda.toBase58(),
    subscriptionAuthorityAddress: r.subscriptionAuthorityPda.toBase58()
  };
}
async function Oe(t) {
  const e = t.provider ?? we(), r = await he(e), a = await ft(
    t.prepareEndpoint,
    t.authToken,
    {
      planId: t.planId,
      interval: t.interval,
      wallet: r.toBase58(),
      numberOfPayments: t.numberOfPayments
    }
  ), n = new Ut(
    Ae(a.network, t.rpcEndpoint),
    "confirmed"
  ), i = await se(n, a, r, e), o = oe({
    prepared: a,
    subscriberPublicKey: r,
    expectedCreatedAt: i.createdAt,
    expectedSubscriptionAuthorityInitId: i.initId
  }), C = await At(
    n,
    e,
    o.transaction
  );
  return ft(
    t.activateEndpoint,
    t.authToken,
    {
      planId: a.planId,
      interval: t.interval,
      wallet: a.wallet,
      authorizationSignature: C,
      subscriptionAddress: o.subscriptionAddress,
      subscriptionAuthorityAddress: o.subscriptionAuthorityAddress,
      planAddress: o.planAddress,
      numberOfPayments: a.numberOfPayments
    }
  );
}
async function se(t, e, r, a) {
  const n = St(e, r), i = await be(t, n.planPda, n.programId);
  me(i, e, n);
  const o = await ie(t, a, n);
  return ye(o, n), { createdAt: i.createdAt, initId: o.initId };
}
async function ie(t, e, r) {
  const a = await t.getAccountInfo(r.subscriptionAuthorityPda, "confirmed");
  if (a) {
    if (!a.owner.equals(r.programId))
      throw new Error("Subscription authority account is not owned by the subscriptions program.");
    return dt(a.data);
  }
  const n = !await t.getAccountInfo(r.subscriberAta, "confirmed"), i = ce(r, n);
  await At(t, e, i);
  const o = await t.getAccountInfo(r.subscriptionAuthorityPda, "confirmed");
  if (!o) throw new Error("Subscription authority was not created on-chain.");
  if (!o.owner.equals(r.programId))
    throw new Error("Subscription authority account is not owned by the subscriptions program.");
  return dt(o.data);
}
function ce(t, e) {
  const r = new mt();
  return e && r.add(
    $t(
      t.subscriber,
      t.subscriberAta,
      t.subscriber,
      t.tokenMint,
      t.tokenProgram,
      ht
    )
  ), r.add(
    new gt({
      programId: t.programId,
      keys: [
        { pubkey: t.subscriber, isSigner: !0, isWritable: !0 },
        { pubkey: t.subscriptionAuthorityPda, isSigner: !1, isWritable: !0 },
        { pubkey: t.tokenMint, isSigner: !1, isWritable: !1 },
        { pubkey: t.subscriberAta, isSigner: !1, isWritable: !0 },
        { pubkey: wt.programId, isSigner: !1, isWritable: !1 },
        { pubkey: t.tokenProgram, isSigner: !1, isWritable: !1 }
      ],
      data: Buffer.from([te])
    })
  ), r.feePayer = t.subscriber, r;
}
function St(t, e) {
  const r = new m(t.programAddress), a = Ce(e), n = new m(t.merchantAddress), i = new m(t.tokenMint), o = new m(t.tokenProgramAddress), C = t.planAddress && t.planBump !== void 0 ? [new m(t.planAddress), t.planBump] : le(r, n, t.solanaPlanId), w = C[0], h = C[1], c = t.subscriptionAuthorityAddress ? new m(t.subscriptionAuthorityAddress) : ue(r, a, i), b = t.subscriptionAddress ? new m(t.subscriptionAddress) : de(r, w, a), I = t.eventAuthorityAddress ? new m(t.eventAuthorityAddress) : fe(r), P = t.subscriberTokenAccount ? new m(t.subscriberTokenAccount) : zt(i, a, !1, o, ht);
  return {
    programId: r,
    subscriber: a,
    merchant: n,
    tokenMint: i,
    tokenProgram: o,
    planPda: w,
    planBump: h,
    subscriptionAuthorityPda: c,
    subscriptionPda: b,
    eventAuthorityPda: I,
    subscriberAta: P
  };
}
function le(t, e, r) {
  return m.findProgramAddressSync([j(ee), e.toBuffer(), Pe(r)], t);
}
function ue(t, e, r) {
  return m.findProgramAddressSync([j(re), e.toBuffer(), r.toBuffer()], t)[0];
}
function de(t, e, r) {
  return m.findProgramAddressSync([j(ne), e.toBuffer(), r.toBuffer()], t)[0];
}
function fe(t) {
  return m.findProgramAddressSync([j(ae)], t)[0];
}
function pe(t, e, r, a) {
  const n = new Uint8Array(74), i = X(n);
  return n[0] = Zt, i.setBigUint64(1, L(t.solanaPlanId, "solanaPlanId"), !0), n[9] = e, n.set(new m(t.tokenMint).toBytes(), 10), i.setBigUint64(42, L(t.expectedAmount, "expectedAmount"), !0), i.setBigUint64(50, L(t.expectedPeriodHours, "expectedPeriodHours"), !0), i.setBigInt64(58, pt(r, "expectedCreatedAt"), !0), i.setBigInt64(
    66,
    pt(a, "expectedSubscriptionAuthorityInitId"),
    !0
  ), n;
}
async function be(t, e, r) {
  const a = await t.getAccountInfo(e, "confirmed");
  if (!a) throw new Error("Solana subscription plan was not found on-chain.");
  if (!a.owner.equals(r))
    throw new Error("Solana subscription plan is not owned by the subscriptions program.");
  const n = a.data;
  if (n.length < 99 || n[0] !== 1)
    throw new Error("Solana subscription plan account has invalid data.");
  if (n[34] !== 1) throw new Error("Solana subscription plan is not active on-chain.");
  return {
    bump: n[33],
    planId: Y(n, 35),
    mint: new m(n.subarray(43, 75)),
    amount: Y(n, 75),
    periodHours: Y(n, 83),
    createdAt: Ct(n, 91)
  };
}
function ye(t, e) {
  if (!t.user.equals(e.subscriber) || !t.mint.equals(e.tokenMint))
    throw new Error("Subscription authority account does not match the subscriber and mint.");
}
function me(t, e, r) {
  if (t.bump !== r.planBump || t.planId !== BigInt(e.solanaPlanId))
    throw new Error("Solana subscription plan PDA metadata does not match the prepared plan.");
  if (!t.mint.equals(r.tokenMint))
    throw new Error("Solana subscription plan mint does not match the prepared plan.");
  if (t.amount !== L(e.amountAtomic, "amountAtomic") || t.periodHours !== L(e.periodHours, "periodHours"))
    throw new Error("Solana subscription plan terms changed before authorization.");
}
function dt(t) {
  if (t.length < 106 || t[0] !== 0)
    throw new Error("Subscription authority account has invalid data.");
  return {
    user: new m(t.subarray(1, 33)),
    mint: new m(t.subarray(33, 65)),
    initId: Ct(t, 98)
  };
}
async function At(t, e, r) {
  const a = await t.getLatestBlockhash("confirmed");
  r.recentBlockhash = a.blockhash;
  const n = await ge(t, e, r);
  if ((await t.confirmTransaction(
    { signature: n, blockhash: a.blockhash, lastValidBlockHeight: a.lastValidBlockHeight },
    "confirmed"
  )).value.err) throw new Error("Solana subscription transaction failed.");
  return n;
}
async function ge(t, e, r) {
  if (e.signAndSendTransaction) {
    const n = await e.signAndSendTransaction(r, {
      skipPreflight: !1,
      preflightCommitment: "confirmed"
    }), i = typeof n == "string" ? n : n.signature;
    if (!i) throw new Error("Wallet did not return a Solana transaction signature.");
    return i;
  }
  if (!e.signTransaction)
    throw new Error("Connected Solana wallet cannot sign transactions.");
  const a = await e.signTransaction(r);
  return t.sendRawTransaction(a.serialize(), {
    skipPreflight: !1,
    preflightCommitment: "confirmed"
  });
}
function we() {
  const t = globalThis, e = t.solana ?? t.phantom?.solana;
  if (!e) throw new Error("Please install a Solana wallet like Phantom, Solflare, or Backpack.");
  return e;
}
async function he(t) {
  const e = await t.connect?.(), r = Ie(e?.publicKey ?? t.publicKey);
  if (!r) throw new Error("Solana wallet did not return a public key.");
  return new m(r);
}
async function ft(t, e, r) {
  const a = await fetch(t, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${e}` },
    body: JSON.stringify(r)
  });
  if (!a.ok) throw new Error(await Se(a));
  return await a.json();
}
async function Se(t) {
  try {
    const e = await t.json();
    if (typeof e.error == "string") return e.error;
    if (e.error?.message) return e.error.message;
  } catch {
    return "Cedros Pay Solana subscription request failed.";
  }
  return "Cedros Pay Solana subscription request failed.";
}
function Ae(t, e) {
  if (e) return e;
  if (t === "mainnet-beta" || t === "devnet" || t === "testnet")
    return qt(t);
  if (/^https:\/\//u.test(t)) return t;
  throw new Error("Solana RPC endpoint is required for subscription authorization.");
}
function Ce(t) {
  return t instanceof m ? t : new m(t);
}
function Ie(t) {
  return typeof t == "string" ? t : t && typeof t.toString == "function" ? t.toString() : null;
}
function j(t) {
  return Buffer.from(t, "utf8");
}
function Pe(t) {
  const e = Buffer.alloc(8);
  return e.writeBigUInt64LE(L(t, "seed")), e;
}
function Y(t, e) {
  return X(t).getBigUint64(e, !0);
}
function Ct(t, e) {
  return X(t).getBigInt64(e, !0);
}
function L(t, e) {
  const r = BigInt(t);
  if (r < 0n || r > 18446744073709551615n)
    throw new Error(`${e} must fit in a u64.`);
  return r;
}
function pt(t, e) {
  const r = BigInt(t);
  if (r < -9223372036854775808n || r > 9223372036854775807n)
    throw new Error(`${e} must fit in an i64.`);
  return r;
}
function X(t) {
  return new DataView(t.buffer, t.byteOffset, t.byteLength);
}
export {
  Ne as CEDROS_EVENTS,
  Pr as CIRCUIT_BREAKER_PRESETS,
  Ue as CSP_PRESETS,
  Er as CedrosProvider,
  Tr as CircuitBreakerOpenError,
  kr as CircuitState,
  qe as ComplianceGatePage,
  ze as CreditsBalance,
  $e as CreditsSubscribeButton,
  Me as CryptoSubscribeButton,
  Br as ERROR_CATEGORIES,
  Rr as FEATURE_FLAG_NAMES,
  Wr as FEATURE_FLAG_REGISTRY,
  Qr as KNOWN_STABLECOINS,
  jr as LogLevel,
  Gr as Logger,
  He as PaymentMethodBadge,
  je as ProductPrice,
  vr as RATE_LIMITER_PRESETS,
  xr as RETRY_PRESETS,
  Ge as RPC_PROVIDERS,
  Ve as SECURITY_RECOMMENDATIONS,
  Ye as SubscribeButton,
  Qe as SubscriptionManagementPanel,
  ln as WalletPool,
  oe as buildSolanaSubscriptionAuthorizationTransaction,
  Je as buildSolanaSubscriptionLifecycleTransaction,
  zr as buildSolanaSubscriptionPlanTransaction,
  Xe as calculateDiscountPercentage,
  _r as createCircuitBreaker,
  Vr as createLogger,
  Lr as createRateLimiter,
  Ze as createTranslator,
  un as createWalletPool,
  tr as detectLocale,
  $ as emitPaymentError,
  Ot as emitPaymentProcessing,
  Dt as emitPaymentStart,
  Mt as emitPaymentSuccess,
  xt as emitWalletConnect,
  _t as emitWalletConnected,
  Q as emitWalletError,
  er as formatCSP,
  rr as formatCouponCodes,
  en as formatCurrencyAmount,
  rn as formatDateOnly,
  nn as formatDateTimeValue,
  an as formatMinorCurrencyAmount,
  on as formatNumberValue,
  nr as generateCSP,
  ar as generateCSPDirectives,
  or as getAvailableLocales,
  Mr as getFeatureFlagDefinition,
  Dr as getFeatureFlagDefinitions,
  Jr as getLocaleDirection,
  sr as getLocalizedError,
  R as getLogger,
  ir as getUserErrorMessage,
  Or as isFeatureEnabled,
  cr as isRetryableError,
  lr as loadLocale,
  ur as logSecurityReport,
  Xr as normalizeLocale,
  dr as parseCouponCodes,
  Kr as parseFeatureFlagBoolean,
  Fr as resolveFeatureFlags,
  Nr as retryWithBackoff,
  sn as selectPlural,
  fr as sendSolanaSubscriptionLifecycleTransaction,
  $r as sendSolanaSubscriptionPlanTransaction,
  pr as stackCheckoutCoupons,
  Oe as startSolanaSubscriptionCheckout,
  J as useCedrosContext,
  Ft as useCedrosTheme,
  Lt as useCedrosTranslation,
  br as useComplianceCheck,
  yr as useCreditsBalance,
  mr as useCreditsSubscription,
  jt as useCryptoSubscription,
  gr as useLocalizedError,
  wr as usePaymentMode,
  De as useRefundVerification,
  hr as useSubscription,
  Sr as useSubscriptionManagement,
  Ar as useTranslation,
  Ur as validateConfig,
  Cr as validateSecurity,
  Zr as validateTokenMint
};
