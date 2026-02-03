import { jsxs as H, jsx as S } from "react/jsx-runtime";
import { useState as O, useRef as te, useCallback as M, useMemo as A, useEffect as z } from "react";
import { g as p, u as ce, a as le, f as fe } from "./CedrosContext-DUT3cLZg.mjs";
import { useWallet as Me } from "@solana/wallet-adapter-react";
import { WalletReadyState as je } from "@solana/wallet-adapter-base";
import { WalletIcon as Ue } from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-wallets";
function Ct(t) {
  return !t || !t.coupon_codes ? [] : t.coupon_codes.split(",").map((e) => e.trim()).filter((e) => e.length > 0);
}
function Pt(t, e = ", ") {
  return t.join(e);
}
function vt(t, e) {
  return t <= 0 ? 0 : (t - e) / t * 100;
}
function kt(t, e) {
  if (!e || e.length === 0)
    return t;
  let n = t, r = 0;
  for (const o of e)
    if (o.discountType === "percentage") {
      const a = 1 - o.discountValue / 100;
      n = n * a;
    } else o.discountType === "fixed" && (r += o.discountValue);
  return n = n - r, n < 0 && (n = 0), Math.ceil(n * 100) / 100;
}
function Ne(t) {
  const e = Number(t);
  if (!Number.isFinite(e) || e <= 0)
    return 1;
  const n = Math.floor(e);
  return n > 0 ? n : 1;
}
function ae(t) {
  return t.map((e) => ({
    resource: e.resource,
    quantity: Ne(e.quantity),
    variantId: e.variantId,
    metadata: e.metadata
  }));
}
function ee(t) {
  return t.reduce((e, n) => e + Ne(n.quantity), 0);
}
function Qe(t) {
  return !!(t && t.length > 0 && (t.length > 1 || t.length === 1 && (t[0].quantity ?? 1) > 1));
}
const Ge = {
  // ===== PAYMENT VERIFICATION ERRORS (402) =====
  invalid_payment_proof: {
    message: "Payment verification failed",
    action: "Please try your payment again. If this continues, contact support.",
    technicalHint: "Invalid payment proof format"
  },
  invalid_signature: {
    message: "Transaction signature is invalid",
    action: "Please approve the transaction in your wallet and try again.",
    technicalHint: "Transaction signature verification failed"
  },
  invalid_transaction: {
    message: "Transaction format is invalid",
    action: "Please try your payment again. If this continues, try updating your wallet app.",
    technicalHint: "Malformed transaction structure"
  },
  transaction_not_found: {
    message: "Transaction not found on the blockchain",
    action: "Your transaction may still be processing. Please wait a moment and check your wallet, or try again.",
    technicalHint: "Transaction signature not found on-chain"
  },
  transaction_not_confirmed: {
    message: "Transaction is still processing",
    action: "Please wait a moment for the blockchain to confirm your transaction, then try again.",
    technicalHint: "Transaction not yet confirmed"
  },
  transaction_failed: {
    message: "Transaction failed on the blockchain",
    action: "Check your wallet for details. You may need to adjust your transaction settings or add more SOL for fees.",
    technicalHint: "On-chain transaction failure"
  },
  transaction_expired: {
    message: "Transaction took too long to process",
    action: "Please try your payment again. Consider increasing transaction priority if your wallet supports it.",
    technicalHint: "Transaction blockhash expired"
  },
  invalid_recipient: {
    message: "Payment was sent to the wrong address",
    action: "Please try again and ensure you approve the correct transaction in your wallet.",
    technicalHint: "Recipient address mismatch"
  },
  invalid_sender: {
    message: "Payment sender wallet is invalid",
    action: "Please reconnect your wallet and try again.",
    technicalHint: "Sender address validation failed"
  },
  unauthorized_refund_issuer: {
    message: "You are not authorized to issue refunds",
    action: "Only authorized accounts can process refunds. Please contact support if you believe this is an error.",
    technicalHint: "Refund issuer not in authorized list"
  },
  amount_below_minimum: {
    message: "Payment amount is too low",
    action: "Please check the required amount and try again.",
    technicalHint: "Amount below minimum threshold"
  },
  amount_mismatch: {
    message: "Payment amount does not match the quote",
    action: "The price may have changed. Please refresh and try your payment again.",
    technicalHint: "Amount does not match quote"
  },
  insufficient_funds_sol: {
    message: "Not enough SOL for transaction fees",
    action: "Add at least 0.001 SOL to your wallet to cover network fees, then try again.",
    technicalHint: "Insufficient SOL balance for fees"
  },
  insufficient_funds_token: {
    message: "Insufficient balance in your wallet",
    action: "Add more funds to your wallet and try again.",
    technicalHint: "Insufficient token balance"
  },
  invalid_token_mint: {
    message: "Incorrect payment token",
    action: "Please pay with the correct token as shown in the payment details.",
    technicalHint: "Token mint address mismatch"
  },
  not_spl_transfer: {
    message: "Transaction is not a valid token transfer",
    action: "Please ensure you are sending the correct token type from your wallet.",
    technicalHint: "Transaction is not an SPL token transfer"
  },
  missing_token_account: {
    message: "Token account not found",
    action: "Your wallet may need to create a token account first. Try again or use a different wallet.",
    technicalHint: "Associated token account does not exist"
  },
  invalid_token_program: {
    message: "Invalid token program",
    action: "Please try your payment again. If this continues, try using a different wallet.",
    technicalHint: "Token program ID mismatch"
  },
  missing_memo: {
    message: "Payment memo is required but was not included",
    action: "Please try your payment again and ensure transaction details are approved in your wallet.",
    technicalHint: "Required memo instruction missing"
  },
  invalid_memo: {
    message: "Payment memo format is invalid",
    action: "Please try your payment again.",
    technicalHint: "Memo does not match expected format"
  },
  payment_already_used: {
    message: "This payment has already been processed",
    action: "Check your transaction history. If you need to make another payment, please start a new transaction.",
    technicalHint: "Payment signature already recorded"
  },
  signature_reused: {
    message: "Transaction signature has already been used",
    action: "Please create a new payment transaction.",
    technicalHint: "Duplicate signature detected"
  },
  quote_expired: {
    message: "Payment quote has expired",
    action: "Prices are updated frequently. Please refresh and try your payment again.",
    technicalHint: "Quote timestamp expired"
  },
  // ===== VALIDATION ERRORS (400) =====
  missing_field: {
    message: "Required information is missing",
    action: "Please check all required fields and try again.",
    technicalHint: "Required field not provided"
  },
  invalid_field: {
    message: "Some information is invalid",
    action: "Please check your input and try again.",
    technicalHint: "Field validation failed"
  },
  invalid_amount: {
    message: "Payment amount is invalid",
    action: "Please check the amount and try again.",
    technicalHint: "Amount validation failed"
  },
  invalid_wallet: {
    message: "Wallet address is invalid",
    action: "Please reconnect your wallet and try again.",
    technicalHint: "Wallet address validation failed"
  },
  invalid_resource: {
    message: "Invalid item selection",
    action: "Please refresh the page and try again.",
    technicalHint: "Resource ID validation failed"
  },
  invalid_coupon: {
    message: "Invalid coupon code",
    action: "Please check the coupon code and try again.",
    technicalHint: "Coupon code format invalid"
  },
  invalid_cart_item: {
    message: "One or more cart items are invalid",
    action: "Please review your cart and try again.",
    technicalHint: "Cart item validation failed"
  },
  empty_cart: {
    message: "Your cart is empty",
    action: "Please add items to your cart before checking out.",
    technicalHint: "Cart contains no items"
  },
  // ===== RESOURCE/STATE ERRORS (404) =====
  resource_not_found: {
    message: "Item not found",
    action: "This item may no longer be available. Please refresh and try again.",
    technicalHint: "Resource not found in database"
  },
  cart_not_found: {
    message: "Shopping cart not found",
    action: "Your cart may have expired. Please start a new order.",
    technicalHint: "Cart ID not found"
  },
  refund_not_found: {
    message: "Refund not found",
    action: "Please check your refund reference number or contact support.",
    technicalHint: "Refund ID not found"
  },
  product_not_found: {
    message: "Product not available",
    action: "This product may no longer be available. Please browse our current selection.",
    technicalHint: "Product ID not found"
  },
  coupon_not_found: {
    message: "Coupon code not found",
    action: "Please check the coupon code or remove it to continue.",
    technicalHint: "Coupon code not in database"
  },
  session_not_found: {
    message: "Payment session expired",
    action: "Please start a new payment.",
    technicalHint: "Session ID not found or expired"
  },
  cart_already_paid: {
    message: "This order has already been paid",
    action: "Check your order history. If you need to make another purchase, please start a new order.",
    technicalHint: "Cart marked as paid"
  },
  refund_already_processed: {
    message: "This refund has already been processed",
    action: "Check your transaction history or contact support for details.",
    technicalHint: "Refund already completed"
  },
  // ===== COUPON-SPECIFIC ERRORS (409) =====
  coupon_expired: {
    message: "Coupon has expired",
    action: "Please remove the coupon code or use a different code.",
    technicalHint: "Coupon expiration date passed"
  },
  coupon_usage_limit_reached: {
    message: "Coupon usage limit reached",
    action: "This coupon has been fully redeemed. Please try a different code.",
    technicalHint: "Coupon max uses exceeded"
  },
  coupon_not_applicable: {
    message: "Coupon cannot be applied to this purchase",
    action: "Please check the coupon terms or remove it to continue.",
    technicalHint: "Coupon conditions not met"
  },
  coupon_wrong_payment_method: {
    message: "Coupon not valid for this payment method",
    action: "Try a different payment method or remove the coupon code.",
    technicalHint: "Coupon restricted to specific payment methods"
  },
  // ===== EXTERNAL SERVICE ERRORS (502) =====
  stripe_error: {
    message: "Card payment service temporarily unavailable",
    action: "Please try again in a moment, or use cryptocurrency payment instead.",
    technicalHint: "Stripe API error"
  },
  rpc_error: {
    message: "Blockchain network temporarily unavailable",
    action: "Please try again in a moment, or use card payment instead.",
    technicalHint: "Solana RPC error"
  },
  network_error: {
    message: "Network connection issue",
    action: "Please check your internet connection and try again.",
    technicalHint: "Network request failed"
  },
  // ===== INTERNAL/SYSTEM ERRORS (500) =====
  internal_error: {
    message: "Something went wrong on our end",
    action: "Please try again. If this continues, contact support.",
    technicalHint: "Internal server error"
  },
  database_error: {
    message: "Service temporarily unavailable",
    action: "Please try again in a moment.",
    technicalHint: "Database operation failed"
  },
  config_error: {
    message: "Service configuration error",
    action: "Please contact support for assistance.",
    technicalHint: "Server misconfiguration"
  }
};
function se(t) {
  return Ge[t] || {
    message: "An unexpected error occurred",
    action: "Please try again or contact support if this continues.",
    technicalHint: `Unknown error code: ${t}`
  };
}
const Be = /* @__PURE__ */ new Map(), ye = /* @__PURE__ */ new Map(), ge = /* @__PURE__ */ new Map(), Le = 200, he = 2e3;
function Xe(t) {
  const e = ge.get(t);
  return e ? Date.now() < e ? !0 : (ge.delete(t), !1) : !1;
}
function Ke(t, e = Le) {
  const n = Date.now() + e;
  ge.set(t, n);
}
function Ve(t, e = he) {
  const n = Be.get(t);
  if (!n)
    return !1;
  const o = Date.now() - n;
  return o < e ? (p().debug(`[Deduplication] Duplicate request blocked: ${t} (${o}ms ago)`), !0) : !1;
}
function Ze(t) {
  Be.set(t, Date.now());
}
function Je(t) {
  return ye.get(t) || null;
}
function et(t, e) {
  ye.set(t, e);
  const n = () => {
    ye.delete(t), Ze(t);
  };
  return e.then(n, n), e;
}
async function tt(t, e, n = {}) {
  const { windowMs: r = he, throwOnDuplicate: o = !0 } = n, a = Je(t);
  if (a)
    return p().debug(`[Deduplication] Reusing in-flight request: ${t}`), a;
  if (Ve(t, r)) {
    if (o)
      throw new Error(`Duplicate request blocked: ${t}`);
    return p().warn(`[Deduplication] Duplicate request blocked but not throwing: ${t}`), Promise.reject(new Error("Duplicate request"));
  }
  const w = e();
  return et(t, w);
}
function we(t, e, n = {}) {
  const { cooldownMs: r = Le, deduplicationWindowMs: o = he } = n;
  return async () => {
    if (Xe(t)) {
      p().debug(`[Deduplication] Button in cooldown: ${t}`);
      return;
    }
    Ke(t, r);
    try {
      await tt(
        t,
        async () => {
          const a = e();
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
function He(t) {
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
const Q = {
  PAYMENT_START: "cedros:payment:start",
  WALLET_CONNECT: "cedros:wallet:connect",
  WALLET_CONNECTED: "cedros:wallet:connected",
  WALLET_ERROR: "cedros:wallet:error",
  PAYMENT_PROCESSING: "cedros:payment:processing",
  PAYMENT_SUCCESS: "cedros:payment:success",
  PAYMENT_ERROR: "cedros:payment:error"
};
function G(t, e) {
  if (typeof window > "u")
    return;
  const n = new CustomEvent(t, {
    detail: e,
    bubbles: !0,
    cancelable: !1
  });
  window.dispatchEvent(n);
}
function be(t, e, n) {
  G(Q.PAYMENT_START, {
    timestamp: Date.now(),
    method: t,
    resource: e,
    itemCount: n
  });
}
function De(t) {
  G(Q.WALLET_CONNECT, {
    timestamp: Date.now(),
    wallet: t
  });
}
function nt(t, e) {
  G(Q.WALLET_CONNECTED, {
    timestamp: Date.now(),
    wallet: t,
    publicKey: e
  });
}
function me(t, e) {
  G(Q.WALLET_ERROR, {
    timestamp: Date.now(),
    wallet: e,
    error: t
  });
}
function ie(t, e, n) {
  G(Q.PAYMENT_PROCESSING, {
    timestamp: Date.now(),
    method: t,
    resource: e,
    itemCount: n
  });
}
function _e(t, e, n, r) {
  G(Q.PAYMENT_SUCCESS, {
    timestamp: Date.now(),
    method: t,
    transactionId: e,
    resource: n,
    itemCount: r
  });
}
function U(t, e, n, r) {
  G(Q.PAYMENT_ERROR, {
    timestamp: Date.now(),
    method: t,
    error: e,
    resource: n,
    itemCount: r
  });
}
class F extends Error {
  /** Machine-readable error code enum */
  code;
  /** Whether this error can be safely retried */
  retryable;
  /** Additional error context */
  details;
  /** HTTP status code (if from API response) */
  httpStatus;
  constructor(e, n, r = !1, o, a) {
    super(n), this.name = "PaymentError", this.code = e, this.retryable = r, this.details = o, this.httpStatus = a, Object.setPrototypeOf(this, F.prototype);
  }
  /**
   * Check if this error is retryable
   */
  canRetry() {
    return this.retryable;
  }
  /**
   * Check if this is a specific error code
   */
  is(e) {
    return this.code === e;
  }
  /**
   * Check if this error is in a specific category
   */
  isInCategory(e) {
    return e.includes(this.code);
  }
  /**
   * Get a user-friendly error message
   * Uses structured error messages with actionable guidance
   */
  getUserMessage() {
    const e = this.getErrorInfo();
    return e.action ? `${e.message} ${e.action}` : e.message;
  }
  /**
   * Get short error message without action guidance
   */
  getShortMessage() {
    return this.getErrorInfo().message;
  }
  /**
   * Get actionable guidance for this error
   */
  getAction() {
    return this.getErrorInfo().action;
  }
  /**
   * Get error info from error messages map
   * @private
   */
  getErrorInfo() {
    return se(this.code);
  }
  /**
   * Create PaymentError from API error response
   *
   * If `retryable` field is not present (Rust server), infers retryability
   * from error codes using ERROR_CATEGORIES.RETRYABLE.
   */
  static fromErrorResponse(e, n) {
    const r = e.error.retryable ?? rt.RETRYABLE.includes(e.error.code);
    return new F(
      e.error.code,
      e.error.message,
      r,
      e.error.details,
      n
    );
  }
  /**
   * Create PaymentError from unknown error
   * Useful for catch blocks where error type is unknown
   */
  static fromUnknown(e) {
    return e instanceof F ? e : e instanceof Error ? new F(
      "internal_error",
      e.message,
      !1
    ) : new F(
      "internal_error",
      String(e),
      !1
    );
  }
}
const rt = {
  /** Insufficient funds errors requiring user to add funds */
  INSUFFICIENT_FUNDS: [
    "insufficient_funds_sol",
    "insufficient_funds_token"
    /* INSUFFICIENT_FUNDS_TOKEN */
  ],
  /** Transaction state errors that may resolve with time */
  TRANSACTION_PENDING: [
    "transaction_not_confirmed",
    "transaction_not_found"
    /* TRANSACTION_NOT_FOUND */
  ],
  /** Validation errors requiring input correction */
  VALIDATION: [
    "missing_field",
    "invalid_field",
    "invalid_amount",
    "invalid_wallet",
    "invalid_resource",
    "invalid_cart_item",
    "empty_cart"
    /* EMPTY_CART */
  ],
  /** Coupon-related errors */
  COUPON: [
    "invalid_coupon",
    "coupon_not_found",
    "coupon_expired",
    "coupon_usage_limit_reached",
    "coupon_not_applicable",
    "coupon_wrong_payment_method"
    /* COUPON_WRONG_PAYMENT_METHOD */
  ],
  /** Retryable errors (temporary failures) */
  RETRYABLE: [
    "transaction_not_confirmed",
    "rpc_error",
    "network_error",
    "stripe_error"
    /* STRIPE_ERROR */
  ],
  /** Resource not found errors */
  NOT_FOUND: [
    "resource_not_found",
    "cart_not_found",
    "refund_not_found",
    "product_not_found",
    "coupon_not_found",
    "session_not_found",
    "credits_hold_not_found"
    /* CREDITS_HOLD_NOT_FOUND */
  ],
  /** Credits-related errors */
  CREDITS: [
    "insufficient_credits",
    "credits_hold_expired",
    "credits_hold_not_found"
    /* CREDITS_HOLD_NOT_FOUND */
  ],
  /** Security/rate limit errors */
  SECURITY: [
    "invalid_redirect_url",
    "rate_limit_exceeded",
    "nonce_already_used"
    /* NONCE_ALREADY_USED */
  ]
};
function It(t) {
  return t instanceof F && t.canRetry();
}
function xt(t) {
  return t instanceof F ? t.getUserMessage() : t instanceof Error ? t.message : String(t);
}
function ot() {
  const { stripeManager: t } = ce(), [e, n] = O({
    status: "idle",
    error: null,
    transactionId: null
  }), r = te(!1), o = M(
    async (g, I, f, m, c, u) => {
      if (r.current)
        return { success: !1, error: "Payment already in progress" };
      r.current = !0, n({
        status: "loading",
        error: null,
        transactionId: null
      });
      const h = {
        resource: g,
        successUrl: I,
        cancelUrl: f,
        metadata: m,
        customerEmail: c,
        couponCode: u
      };
      try {
        const l = await t.processPayment(h);
        return n({
          status: l.success ? "success" : "error",
          error: l.success ? null : l.error || "Payment failed",
          transactionId: l.success && l.transactionId || null
        }), l;
      } catch (l) {
        const j = l instanceof Error ? l.message : "Payment failed";
        return n({
          status: "error",
          error: j,
          transactionId: null
        }), { success: !1, error: j };
      } finally {
        r.current = !1;
      }
    },
    [t]
  ), a = M(
    async (g, I, f, m, c, u) => {
      if (r.current)
        return { success: !1, error: "Payment already in progress" };
      r.current = !0, n({
        status: "loading",
        error: null,
        transactionId: null
      });
      const h = ae(g);
      try {
        const l = await t.processCartCheckout({
          items: h,
          successUrl: I,
          cancelUrl: f,
          metadata: m,
          customerEmail: c,
          couponCode: u
        });
        return n({
          status: l.success ? "success" : "error",
          error: l.success ? null : l.error || "Cart checkout failed",
          transactionId: l.success && l.transactionId || null
        }), l;
      } catch (l) {
        const j = l instanceof Error ? l.message : "Cart checkout failed";
        return n({
          status: "error",
          error: j,
          transactionId: null
        }), { success: !1, error: j };
      } finally {
        r.current = !1;
      }
    },
    [t]
  ), w = M(() => {
    n({
      status: "idle",
      error: null,
      transactionId: null
    }), r.current = !1;
  }, []);
  return {
    ...e,
    processPayment: o,
    processCartCheckout: a,
    reset: w
  };
}
function Ce(t, e) {
  return A(() => {
    const n = Qe(e), r = t || (e?.length === 1 ? e[0].resource : "");
    return {
      isCartMode: n,
      effectiveResource: r
    };
  }, [t, e]);
}
const at = (t, e, n) => {
  const r = t[e];
  return r ? typeof r == "function" ? r() : Promise.resolve(r) : new Promise((o, a) => {
    (typeof queueMicrotask == "function" ? queueMicrotask : setTimeout)(a.bind(null, /* @__PURE__ */ new Error("Unknown variable dynamic import: " + e + (e.split("/").length !== n ? ". Note that variables only represent file names one level deep." : ""))));
  });
}, pe = /* @__PURE__ */ new Map();
let oe = null;
async function qe(t) {
  if (pe.has(t))
    return pe.get(t);
  try {
    const e = await at(/* @__PURE__ */ Object.assign({ "./translations/ar.json": () => import("./ar-w27mU-4x.mjs"), "./translations/bn.json": () => import("./bn-Ba_k3Kex.mjs"), "./translations/de.json": () => import("./de-CoZiPFN7.mjs"), "./translations/en.json": () => import("./en-BXheDBal.mjs"), "./translations/es.json": () => import("./es-BWGIBp2f.mjs"), "./translations/fil.json": () => import("./fil-Czo27xmj.mjs"), "./translations/fr.json": () => import("./fr-DQ-2ThBv.mjs"), "./translations/he.json": () => import("./he-DpV1WnBQ.mjs"), "./translations/id.json": () => import("./id-BJMqsu19.mjs"), "./translations/in.json": () => import("./in-BxgxKLQH.mjs"), "./translations/it.json": () => import("./it-DZFFPALf.mjs"), "./translations/jp.json": () => import("./jp-ZExTrlHK.mjs"), "./translations/kr.json": () => import("./kr-DHX3i4Ht.mjs"), "./translations/ms.json": () => import("./ms-Cv1fdIi2.mjs"), "./translations/nl.json": () => import("./nl-BmGonsKb.mjs"), "./translations/pa.json": () => import("./pa-BfwcJIar.mjs"), "./translations/pl.json": () => import("./pl-DE5IB9xv.mjs"), "./translations/pt.json": () => import("./pt-CLzkqDzf.mjs"), "./translations/ru.json": () => import("./ru-DM6-oUR0.mjs"), "./translations/ta.json": () => import("./ta-A5HnrGb5.mjs"), "./translations/th.json": () => import("./th-3fbB3Ytp.mjs"), "./translations/tr.json": () => import("./tr-BrgfFFdq.mjs"), "./translations/uk.json": () => import("./uk-0hFun_g_.mjs"), "./translations/ur.json": () => import("./ur-CaOjJXai.mjs"), "./translations/vn.json": () => import("./vn-0nlIZFLP.mjs"), "./translations/zh.json": () => import("./zh-B4Endr1F.mjs") }), `./translations/${t}.json`, 3), n = e.default || e;
    return pe.set(t, n), n;
  } catch {
    return null;
  }
}
async function St() {
  if (oe)
    return oe;
  const t = /* @__PURE__ */ Object.assign({ "./translations/ar.json": () => import("./ar-w27mU-4x.mjs"), "./translations/bn.json": () => import("./bn-Ba_k3Kex.mjs"), "./translations/de.json": () => import("./de-CoZiPFN7.mjs"), "./translations/en.json": () => import("./en-BXheDBal.mjs"), "./translations/es.json": () => import("./es-BWGIBp2f.mjs"), "./translations/fil.json": () => import("./fil-Czo27xmj.mjs"), "./translations/fr.json": () => import("./fr-DQ-2ThBv.mjs"), "./translations/he.json": () => import("./he-DpV1WnBQ.mjs"), "./translations/id.json": () => import("./id-BJMqsu19.mjs"), "./translations/in.json": () => import("./in-BxgxKLQH.mjs"), "./translations/it.json": () => import("./it-DZFFPALf.mjs"), "./translations/jp.json": () => import("./jp-ZExTrlHK.mjs"), "./translations/kr.json": () => import("./kr-DHX3i4Ht.mjs"), "./translations/ms.json": () => import("./ms-Cv1fdIi2.mjs"), "./translations/nl.json": () => import("./nl-BmGonsKb.mjs"), "./translations/pa.json": () => import("./pa-BfwcJIar.mjs"), "./translations/pl.json": () => import("./pl-DE5IB9xv.mjs"), "./translations/pt.json": () => import("./pt-CLzkqDzf.mjs"), "./translations/ru.json": () => import("./ru-DM6-oUR0.mjs"), "./translations/ta.json": () => import("./ta-A5HnrGb5.mjs"), "./translations/th.json": () => import("./th-3fbB3Ytp.mjs"), "./translations/tr.json": () => import("./tr-BrgfFFdq.mjs"), "./translations/uk.json": () => import("./uk-0hFun_g_.mjs"), "./translations/ur.json": () => import("./ur-CaOjJXai.mjs"), "./translations/vn.json": () => import("./vn-0nlIZFLP.mjs"), "./translations/zh.json": () => import("./zh-B4Endr1F.mjs") }), e = [];
  for (const n in t) {
    const r = n.match(/\.\/translations\/([a-z]{2,3}(?:-[A-Z]{2})?)\.json$/);
    r && e.push(r[1]);
  }
  return oe = e.length > 0 ? e : ["en"], oe;
}
function st() {
  return typeof navigator > "u" ? "en" : (navigator.language || navigator.userLanguage || "en").split("-")[0].toLowerCase();
}
async function it(t) {
  let e = await qe(t);
  if (e || (e = await qe("en"), e))
    return e;
  throw new Error("Critical: No translation files found, not even en.json");
}
function ct(t) {
  return (e, n) => {
    const r = e.split(".");
    let o = t;
    for (const a of r)
      if (o && typeof o == "object" && a in o)
        o = o[a];
      else
        return e;
    return typeof o != "string" ? e : n ? Object.entries(n).reduce(
      (a, [w, g]) => a.replace(new RegExp(`\\{${w}\\}`, "g"), g),
      o
    ) : o;
  };
}
function Et(t, e, n = !0) {
  const r = e.errors[t];
  if (!r) {
    const o = se(t);
    return n && o.action ? `${o.message} ${o.action}` : o.message;
  }
  return n && r.action ? `${r.message} ${r.action}` : r.message;
}
function ue(t) {
  const [e, n] = O(null), [r, o] = O(!0), a = A(() => t || st(), [t]);
  return z(() => {
    let g = !1;
    return (async () => {
      o(!0);
      try {
        const f = await it(a);
        g || (n(f), o(!1));
      } catch (f) {
        console.error("[CedrosPay] Failed to load translations:", f), g || o(!1);
      }
    })(), () => {
      g = !0;
    };
  }, [a]), {
    t: A(() => e ? ct(e) : (g) => ({
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
    })[g] || g, [e]),
    locale: a,
    isLoading: r,
    translations: e
  };
}
function Tt(t, e = !0) {
  const { translations: n } = ue();
  if (!n) {
    const o = se(t);
    return e && o.action ? `${o.message} ${o.action}` : o.message;
  }
  const r = n.errors[t];
  if (!r) {
    const o = se(t);
    return e && o.action ? `${o.message} ${o.action}` : o.message;
  }
  return e && r.action ? `${r.message} ${r.action}` : r.message;
}
function lt({
  resource: t,
  items: e,
  successUrl: n,
  cancelUrl: r,
  metadata: o,
  customerEmail: a,
  couponCode: w,
  label: g,
  disabled: I = !1,
  onAttempt: f,
  onSuccess: m,
  onError: c,
  className: u = ""
}) {
  const { status: h, error: l, transactionId: j, processPayment: E, processCartCheckout: d } = ot(), s = le(), { isCartMode: b, effectiveResource: C } = Ce(t, e), { t: _, translations: P } = ue(), N = g || _("ui.pay_with_card"), B = s.unstyled ? u : `${s.className} cedros-theme__stripe-button ${u}`.trim(), y = l && typeof l != "string" ? l?.code ?? null : null, v = l ? typeof l == "string" ? l : ((q) => {
    if (!q || !P) return "";
    const R = P.errors[q];
    return R ? R.action ? `${R.message} ${R.action}` : R.message : "";
  })(y) : null, k = M(async () => {
    p().debug("[StripeButton] executePayment with couponCode:", w);
    const q = b && e ? ee(e) : void 0;
    if (be("stripe", C, q), f && f("stripe"), !b && !C) {
      const K = "Invalid payment configuration: missing resource or items";
      p().error("[StripeButton]", K), U("stripe", K, C, q), c && c(K);
      return;
    }
    let R;
    ie("stripe", C, q), b && e ? (p().debug("[StripeButton] Processing cart checkout with coupon:", w), R = await d(
      e,
      n,
      r,
      o,
      a,
      w
    )) : C && (p().debug("[StripeButton] Processing single payment with coupon:", w), R = await E(
      C,
      n,
      r,
      o,
      a,
      w
    )), R && R.success && R.transactionId ? (_e("stripe", R.transactionId, C, q), m && m(R.transactionId)) : R && !R.success && R.error && (U("stripe", R.error, C, q), c && c(R.error));
  }, [w, b, C, e, n, r, o, a, d, E, f, m, c]), $ = A(() => b && e ? `stripe-cart-${e.map((q) => q.resource).join("-")}` : `stripe-${C || "unknown"}`, [b, e, C]), X = A(
    () => we($, k),
    [$, k]
  ), L = h === "loading", T = I || L;
  return /* @__PURE__ */ H("div", { className: B, style: s.unstyled ? {} : s.style, children: [
    /* @__PURE__ */ S(
      "button",
      {
        onClick: X,
        disabled: T,
        className: s.unstyled ? u : "cedros-theme__button cedros-theme__stripe",
        type: "button",
        children: L ? _("ui.processing") : N
      }
    ),
    v && /* @__PURE__ */ S("div", { className: s.unstyled ? "" : "cedros-theme__error", children: v }),
    j && /* @__PURE__ */ S("div", { className: s.unstyled ? "" : "cedros-theme__success", children: _("ui.payment_successful") })
  ] });
}
function ut() {
  const { x402Manager: t, walletManager: e } = ce(), { publicKey: n, signTransaction: r } = Me(), [o, a] = O({
    status: "idle",
    error: null,
    transactionId: null
  }), [w, g] = O(null), [I, f] = O(null), m = te(!1), c = M(() => {
    if (!n) {
      const d = "Wallet not connected";
      return a({ status: "error", error: d, transactionId: null }), { valid: !1, error: d };
    }
    if (!r) {
      const d = "Wallet does not support signing";
      return a({ status: "error", error: d, transactionId: null }), { valid: !1, error: d };
    }
    return { valid: !0 };
  }, [n, r]), u = M(
    async (d) => {
      try {
        a((b) => ({ ...b, status: "loading" }));
        const s = await t.requestQuote({ resource: d });
        if (!t.validateRequirement(s))
          throw new Error("Invalid requirement received from server");
        return g(s), a((b) => ({ ...b, status: "idle" })), s;
      } catch (s) {
        const b = fe(s, "Failed to fetch requirement");
        throw a({
          status: "error",
          error: b,
          transactionId: null
        }), s;
      }
    },
    [t]
  ), h = M(
    async (d, s, b, C, _ = "regular") => {
      if (!!d.extra?.feePayer) {
        console.log("⚡ [useX402Payment] GASLESS FLOW - Backend pays fees"), console.log("🔨 [useX402Payment] Requesting backend to build gasless transaction");
        const { transaction: N, blockhash: B } = await t.buildGaslessTransaction({
          resourceId: s,
          userWallet: n.toString(),
          feePayer: d.extra.feePayer,
          couponCode: b
        });
        console.log("📦 [useX402Payment] Deserializing transaction from backend");
        const y = e.deserializeTransaction(N);
        console.log("✍️ [useX402Payment] Requesting wallet to partially sign (transfer authority only)");
        const D = await e.partiallySignTransaction({
          transaction: y,
          signTransaction: r,
          blockhash: B
        });
        console.log("📤 [useX402Payment] Submitting partially-signed transaction to backend");
        const v = await t.submitGaslessTransaction({
          resource: s,
          partialTx: D,
          couponCode: b,
          metadata: C,
          resourceType: _,
          requirement: d
        });
        return v.success && v.settlement && f(v.settlement), v;
      } else {
        const N = await e.buildTransaction({
          requirement: d,
          payerPublicKey: n
        }), B = await e.signTransaction({
          transaction: N,
          signTransaction: r
        }), y = e.buildPaymentPayload({
          requirement: d,
          signedTx: B,
          payerPublicKey: n
        }), D = await t.submitPayment({
          resource: s,
          payload: y,
          couponCode: b,
          metadata: C,
          resourceType: _
        });
        return D.success && D.settlement && f(D.settlement), D;
      }
    },
    [n, r, t, e]
  ), l = M(
    async (d, s, b) => {
      if (m.current)
        return { success: !1, error: "Payment already in progress" };
      const C = c();
      if (!C.valid)
        return { success: !1, error: C.error };
      m.current = !0, a({
        status: "loading",
        error: null,
        transactionId: null
      });
      try {
        console.log("🔍 [useX402Payment] Fetching fresh quote for resource:", d);
        const _ = await t.requestQuote({ resource: d, couponCode: s });
        console.log("✅ [useX402Payment] Got quote:", { payTo: _.payTo, amount: _.maxAmountRequired }), g(_), console.log("⚙️ [useX402Payment] Executing payment flow with fresh requirement");
        const P = await h(_, d, s, b, "regular");
        return P.success ? a({
          status: "success",
          error: null,
          transactionId: P.transactionId || "payment-success"
        }) : a({
          status: "error",
          error: P.error || "Payment failed",
          transactionId: null
        }), P;
      } catch (_) {
        const P = fe(_, "Payment failed");
        return a({
          status: "error",
          error: P,
          transactionId: null
        }), { success: !1, error: P };
      } finally {
        m.current = !1;
      }
    },
    [c, t, h]
  ), j = M(
    async (d, s, b) => {
      if (m.current)
        return { success: !1, error: "Payment already in progress" };
      const C = c();
      if (!C.valid)
        return { success: !1, error: C.error };
      m.current = !0, a({
        status: "loading",
        error: null,
        transactionId: null
      });
      try {
        const _ = ae(d), P = await t.requestCartQuote({
          items: _,
          metadata: s,
          couponCode: b
        }), N = P.cartId, B = P.quote;
        if (!t.validateRequirement(B))
          throw new Error("Invalid cart quote received from server");
        g(B);
        const y = await h(B, N, b, s, "cart");
        return y.success ? a({
          status: "success",
          error: null,
          transactionId: y.transactionId || "cart-payment-success"
        }) : a({
          status: "error",
          error: y.error || "Cart payment failed",
          transactionId: null
        }), y;
      } catch (_) {
        const P = fe(_, "Cart payment failed");
        return a({
          status: "error",
          error: P,
          transactionId: null
        }), { success: !1, error: P };
      } finally {
        m.current = !1;
      }
    },
    [c, t, h]
  ), E = M(() => {
    a({
      status: "idle",
      error: null,
      transactionId: null
    }), g(null), f(null), m.current = !1;
  }, []);
  return {
    ...o,
    requirement: w,
    settlement: I,
    fetchQuote: u,
    processPayment: l,
    processCartPayment: j,
    reset: E
  };
}
function dt({
  resource: t,
  items: e,
  label: n,
  disabled: r = !1,
  onAttempt: o,
  onSuccess: a,
  onError: w,
  className: g = "",
  testPageUrl: I,
  hideMessages: f = !1,
  metadata: m,
  couponCode: c
}) {
  const { connected: u, connecting: h, connect: l, disconnect: j, select: E, wallets: d, wallet: s, publicKey: b } = Me(), { status: C, error: _, transactionId: P, processPayment: N, processCartPayment: B } = ut(), y = le(), { solanaError: D } = ce(), { isCartMode: v, effectiveResource: k } = Ce(t, e), { t: $, translations: X } = ue(), L = n || $("ui.pay_with_crypto"), T = _ && typeof _ != "string" ? _?.code ?? null : null, q = D && typeof D != "string" ? D?.code ?? null : null, R = (i) => {
    if (!i || !X) return "";
    const x = X.errors[i];
    return x ? x.action ? `${x.message} ${x.action}` : x.message : "";
  }, K = _ ? typeof _ == "string" ? _ : R(T) : null, Pe = D ? typeof D == "string" ? D : R(q) : null, ve = te(N), ke = te(B);
  z(() => {
    ve.current = N, ke.current = B;
  }, [N, B]);
  const $e = A(
    () => d.map((i) => `${i.adapter.name}-${i.readyState}`).join(","),
    [d]
  ), ne = A(
    () => d.filter(
      ({ readyState: i }) => i === je.Installed || i === je.Loadable
    ),
    // walletStateKey is derived from availableWallets, so we only need availableWallets as dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [$e]
  );
  z(() => {
    if (C === "success" && P) {
      const i = v && e ? ee(e) : void 0;
      _e("crypto", P, k, i), a && a(P);
    }
  }, [C, P, a, v, e, k]), z(() => {
    if (C === "error" && _) {
      const i = v && e ? ee(e) : void 0;
      U("crypto", _, k, i), w && w(_);
    }
  }, [C, _, w, v, e, k]);
  const Ie = typeof window < "u" && window.top !== window.self, [xe, V] = O(!1), [Se, de] = O(!1), [Z, Y] = O(null), J = D;
  z(() => {
    let i = !1;
    return i || (async () => {
      if (Se && s && !u && !h) {
        p().debug("[CryptoButton] Wallet detected, attempting auto-connect:", s.adapter.name), de(!1), De(s.adapter.name);
        try {
          await l(), i || p().debug("[CryptoButton] Auto-connect successful");
        } catch (W) {
          if (!i) {
            p().error("[CryptoButton] Auto-connect failed:", W);
            const re = W instanceof Error ? W.message : "Failed to connect wallet";
            me(re, s.adapter.name), Y(null);
          }
        }
      }
    })(), () => {
      i = !0;
    };
  }, [s, Se, u, h, l]), z(() => {
    if (p().debug("[CryptoButton] Payment useEffect triggered", {
      connected: u,
      hasPendingPayment: !!Z,
      hasPublicKey: !!b,
      pendingPaymentType: Z?.type
    }), u && Z && b && s) {
      nt(s.adapter.name, b.toString()), p().debug("[CryptoButton] All conditions met! Processing pending payment:", Z);
      const i = Z;
      Y(null), V(!1);
      const x = i.type === "cart" && i.items ? ee(i.items) : void 0;
      ie("crypto", i.resource, x), i.type === "cart" && i.items ? (p().debug("[CryptoButton] Auto-processing cart payment"), ke.current(i.items, i.metadata, i.couponCode)) : i.type === "single" && i.resource && (p().debug("[CryptoButton] Auto-processing single payment"), ve.current(i.resource, i.couponCode, i.metadata));
    }
  }, [u, Z, b, s]);
  const Ee = M(async () => {
    p().debug("[CryptoButton] executePaymentFlow called", {
      connected: u,
      wallet: s?.adapter.name,
      couponCode: c,
      isCartMode: v,
      hasItems: !!e,
      effectiveResource: k
    });
    const i = v && e ? ee(e) : void 0;
    if (be("crypto", k, i), o && o("crypto"), J) {
      p().error("[CryptoButton] Solana dependencies missing:", J), U("crypto", J, k, i), w && w(J);
      return;
    }
    if (Ie) {
      const x = I || window.location.href;
      try {
        if (new URL(x, window.location.origin).origin !== window.location.origin)
          throw p().error("[CryptoButton] Blocked attempt to open external URL:", x), new Error("Cannot open external URLs from embedded context");
        window.open(x, "_blank", "noopener,noreferrer");
      } catch (W) {
        throw p().error("[CryptoButton] URL validation failed:", W), W;
      }
      return;
    }
    if (u)
      ie("crypto", k, i), v && e ? (p().debug("[CryptoButton] Processing cart payment with coupon:", c), await B(e, m, c)) : k && (p().debug("[CryptoButton] Processing single payment with coupon:", c), await N(k, c, m));
    else {
      let x = !1;
      if (v && e ? (p().debug("[CryptoButton] Setting pending cart payment with coupon:", c), Y({ type: "cart", items: e, metadata: m, couponCode: c }), x = !0) : k && (p().debug("[CryptoButton] Setting pending single payment with coupon:", c), Y({ type: "single", resource: k, metadata: m, couponCode: c }), x = !0), !x) {
        p().error("[CryptoButton] No valid payment to process");
        return;
      }
      try {
        if (s)
          p().debug("[CryptoButton] Wallet already selected, connecting:", s.adapter.name), De(s.adapter.name), await l();
        else {
          if (p().debug(
            "[CryptoButton] No wallet selected, showing selector. Available wallets:",
            ne.map((W) => W.adapter.name)
          ), ne.length === 0) {
            Y(null);
            const W = "No wallets available";
            throw me(W), new Error(W);
          }
          V(!0);
        }
      } catch (W) {
        Y(null);
        const re = W instanceof Error ? W.message : "Failed to connect wallet";
        p().error("[CryptoButton] Connection error:", re), me(re, s?.adapter.name);
      }
    }
  }, [u, s, c, v, e, k, Ie, I, ne, l, m, B, N, J, o, w]), Te = A(() => v && e ? `crypto-cart-${e.map((i) => i.resource).join("-")}` : `crypto-${k || "unknown"}`, [v, e, k]), We = A(
    () => we(Te, Ee, {
      cooldownMs: 200,
      deduplicationWindowMs: 0
      // MUST be 0 for crypto - each payment needs fresh transaction
    }),
    [Te, Ee]
  ), Re = C === "loading", Ae = r || Re || h || !!J, Oe = Re ? $("ui.processing") : L, ze = M(async () => {
    try {
      de(!1), u && await j(), E(null), V(!0);
    } catch (i) {
      p().error("Failed to change wallet:", i);
    }
  }, [u, j, E]), Fe = M((i) => {
    p().debug("[CryptoButton] Wallet clicked:", i), V(!1), E(i), de(!0), p().debug("[CryptoButton] Wallet selected, useEffect will auto-connect");
  }, [E]), Ye = M(async () => {
    try {
      if (await j(), Y(null), typeof window < "u" && window.localStorage)
        try {
          window.localStorage.removeItem("walletName");
        } catch (i) {
          i instanceof Error && i.name === "QuotaExceededError" ? p().warn("localStorage quota exceeded when removing wallet preference") : p().error("Failed to clear wallet preference from localStorage:", i);
        }
    } catch (i) {
      p().error("Failed to disconnect wallet:", i);
    }
  }, [j]);
  return /* @__PURE__ */ H("div", { className: y.unstyled ? g : `${y.className} cedros-theme__crypto-button ${g || ""}`, style: y.unstyled ? {} : y.style, children: [
    /* @__PURE__ */ S(
      "button",
      {
        onClick: We,
        disabled: Ae,
        className: y.unstyled ? g : "cedros-theme__button cedros-theme__crypto",
        type: "button",
        children: Oe
      }
    ),
    xe && !f && /* @__PURE__ */ S(
      "div",
      {
        className: "cedros-modal-overlay",
        style: {
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: y.tokens.modalOverlay,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "1rem"
        },
        onClick: () => V(!1),
        children: /* @__PURE__ */ H(
          "div",
          {
            className: "cedros-modal-content",
            style: {
              backgroundColor: y.tokens.modalBackground,
              borderRadius: "12px",
              padding: "2rem",
              maxWidth: "400px",
              width: "100%",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              border: `1px solid ${y.tokens.modalBorder}`
            },
            onClick: (i) => i.stopPropagation(),
            children: [
              /* @__PURE__ */ H(
                "div",
                {
                  style: {
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "1.5rem"
                  },
                  children: [
                    /* @__PURE__ */ S(
                      "h3",
                      {
                        style: {
                          margin: 0,
                          fontSize: "1.25rem",
                          fontWeight: 600,
                          color: y.tokens.surfaceText
                        },
                        children: $("wallet.select_wallet")
                      }
                    ),
                    /* @__PURE__ */ S(
                      "button",
                      {
                        onClick: () => V(!1),
                        style: He(y.tokens.surfaceText),
                        "aria-label": "Close modal",
                        type: "button",
                        children: "×"
                      }
                    )
                  ]
                }
              ),
              /* @__PURE__ */ S("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem" }, children: ne.map((i) => /* @__PURE__ */ H(
                "button",
                {
                  onClick: () => Fe(i.adapter.name),
                  style: {
                    width: "100%",
                    padding: "1rem",
                    backgroundColor: y.tokens.surfaceBackground,
                    border: `1px solid ${y.tokens.surfaceBorder}`,
                    borderRadius: "0.5rem",
                    cursor: "pointer",
                    fontSize: "1rem",
                    textAlign: "left",
                    color: y.tokens.surfaceText,
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    transition: "all 0.2s ease"
                  },
                  onMouseEnter: (x) => {
                    x.currentTarget.style.backgroundColor = y.tokens.modalBackground, x.currentTarget.style.borderColor = y.tokens.surfaceText, x.currentTarget.style.transform = "translateY(-2px)";
                  },
                  onMouseLeave: (x) => {
                    x.currentTarget.style.backgroundColor = y.tokens.surfaceBackground, x.currentTarget.style.borderColor = y.tokens.surfaceBorder, x.currentTarget.style.transform = "translateY(0)";
                  },
                  type: "button",
                  children: [
                    /* @__PURE__ */ S(Ue, { wallet: i, style: { width: "24px", height: "24px" } }),
                    /* @__PURE__ */ S("span", { style: { fontWeight: 500 }, children: i.adapter.name })
                  ]
                },
                i.adapter.name
              )) })
            ]
          }
        )
      }
    ),
    u && !f && !xe && /* @__PURE__ */ H("div", { style: {
      display: "flex",
      justifyContent: "space-between",
      marginTop: "0.5rem",
      fontSize: "0.75rem",
      color: y.tokens.surfaceText,
      opacity: 0.7
    }, children: [
      /* @__PURE__ */ S(
        "button",
        {
          onClick: ze,
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
          children: "Change Wallet"
        }
      ),
      /* @__PURE__ */ S(
        "button",
        {
          onClick: Ye,
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
          children: $("ui.disconnect")
        }
      )
    ] }),
    !f && Pe && /* @__PURE__ */ S("div", { className: y.unstyled ? "" : "cedros-theme__error", children: Pe }),
    !f && K && /* @__PURE__ */ S("div", { className: y.unstyled ? "" : "cedros-theme__error", children: K }),
    !f && P && /* @__PURE__ */ S("div", { className: y.unstyled ? "" : "cedros-theme__success", children: $("ui.payment_successful") })
  ] });
}
function ft() {
  const { creditsManager: t } = ce(), [e, n] = O({
    status: "idle",
    error: null,
    transactionId: null,
    requirement: null,
    holdId: null
  }), r = te(!1), o = M(
    async (f, m) => {
      n((c) => ({
        ...c,
        status: "loading",
        error: null
      }));
      try {
        const c = await t.requestQuote(f, m);
        return n((u) => ({
          ...u,
          status: "idle",
          requirement: c
        })), c;
      } catch (c) {
        const u = c instanceof Error ? c.message : "Failed to fetch credits quote";
        return n((h) => ({
          ...h,
          status: "error",
          error: u
        })), null;
      }
    },
    [t]
  ), a = M(
    async (f, m) => {
      n((c) => ({
        ...c,
        status: "loading",
        error: null
      }));
      try {
        const c = ae(f), u = await t.requestCartQuote(c, m);
        return n((h) => ({
          ...h,
          status: "idle"
        })), u;
      } catch (c) {
        const u = c instanceof Error ? c.message : "Failed to fetch cart credits quote";
        return n((h) => ({
          ...h,
          status: "error",
          error: u
        })), null;
      }
    },
    [t]
  ), w = M(
    async (f, m, c, u) => {
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
        const h = await t.processPayment(f, m, c, u);
        return n({
          status: h.success ? "success" : "error",
          error: h.success ? null : h.error || "Credits payment failed",
          transactionId: h.success && h.transactionId || null,
          requirement: null,
          holdId: null
        }), h;
      } finally {
        r.current = !1;
      }
    },
    [t]
  ), g = M(
    async (f, m, c, u) => {
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
        const h = ae(f), l = await t.requestCartQuote(h, c);
        if (!l)
          return n({
            status: "error",
            error: "Credits payment not available for this cart",
            transactionId: null,
            requirement: null,
            holdId: null
          }), { success: !1, error: "Credits payment not available" };
        const E = (await t.createCartHold({
          cartId: l.cartId,
          authToken: m
        })).holdId;
        n((s) => ({
          ...s,
          holdId: E
        }));
        const d = await t.authorizeCartPayment({
          cartId: l.cartId,
          holdId: E,
          authToken: m,
          metadata: u
        });
        return n({
          status: d.success ? "success" : "error",
          error: d.success ? null : d.error || "Cart credits payment failed",
          transactionId: d.success && d.transactionId || null,
          requirement: null,
          holdId: null
        }), {
          success: d.success,
          transactionId: d.transactionId,
          error: d.error
        };
      } catch (h) {
        const l = h instanceof Error ? h.message : "Cart credits payment failed";
        return n({
          status: "error",
          error: l,
          transactionId: null,
          requirement: null,
          holdId: null
        }), { success: !1, error: l };
      } finally {
        r.current = !1;
      }
    },
    [t]
  ), I = M(() => {
    n({
      status: "idle",
      error: null,
      transactionId: null,
      requirement: null,
      holdId: null
    }), r.current = !1;
  }, []);
  return {
    ...e,
    fetchQuote: o,
    fetchCartQuote: a,
    processPayment: w,
    processCartPayment: g,
    reset: I
  };
}
function mt({
  resource: t,
  items: e,
  authToken: n,
  metadata: r,
  couponCode: o,
  label: a,
  disabled: w = !1,
  onAttempt: g,
  onSuccess: I,
  onError: f,
  className: m = ""
}) {
  const { status: c, error: u, transactionId: h, processPayment: l, processCartPayment: j } = ft(), E = le(), { isCartMode: d, effectiveResource: s } = Ce(t, e), { t: b, translations: C } = ue(), _ = a || b("ui.pay_with_credits") || "Pay with Credits", P = E.unstyled ? m : `${E.className} cedros-theme__credits-button ${m}`.trim(), N = u && typeof u != "string" ? u?.code ?? null : null, y = u ? typeof u == "string" ? u : ((L) => {
    if (!L || !C) return "";
    const T = C.errors[L];
    return T ? T.action ? `${T.message} ${T.action}` : T.message : "";
  })(N) : null, D = M(async () => {
    p().debug("[CreditsButton] executePayment");
    const L = d && e ? ee(e) : void 0;
    if (be("credits", s, L), g && g("credits"), !n) {
      const q = "Authentication required: please log in to pay with credits";
      p().error("[CreditsButton]", q), U("credits", q, s, L), f && f(q);
      return;
    }
    if (!d && !s) {
      const q = "Invalid payment configuration: missing resource";
      p().error("[CreditsButton]", q), U("credits", q, s, L), f && f(q);
      return;
    }
    let T;
    ie("credits", s, L), d && e ? (p().debug("[CreditsButton] Processing cart checkout"), T = await j(e, n, o, r)) : s && (p().debug("[CreditsButton] Processing single payment"), T = await l(s, n, o, r)), T && T.success && T.transactionId ? (_e("credits", T.transactionId, s, L), I && I(T.transactionId)) : T && !T.success && T.error && (U("credits", T.error, s, L), f && f(T.error));
  }, [
    n,
    d,
    s,
    e,
    o,
    r,
    l,
    j,
    g,
    I,
    f
  ]), v = A(() => d && e ? `credits-cart-${e.map((L) => L.resource).join("-")}` : `credits-${s || "unknown"}`, [d, e, s]), k = A(
    () => we(v, D),
    [v, D]
  ), $ = c === "loading", X = w || $;
  return /* @__PURE__ */ H("div", { className: P, style: E.unstyled ? {} : E.style, children: [
    /* @__PURE__ */ S(
      "button",
      {
        onClick: k,
        disabled: X,
        className: E.unstyled ? m : "cedros-theme__button cedros-theme__credits",
        type: "button",
        children: $ ? b("ui.processing") : _
      }
    ),
    y && /* @__PURE__ */ S("div", { className: E.unstyled ? "" : "cedros-theme__error", children: y }),
    h && /* @__PURE__ */ S("div", { className: E.unstyled ? "" : "cedros-theme__success", children: b("ui.payment_successful") })
  ] });
}
const Rt = ({
  isOpen: t,
  onClose: e,
  resource: n,
  items: r,
  cardLabel: o = "Card",
  cryptoLabel: a = "USDC (Solana)",
  creditsLabel: w = "Pay with Credits",
  showCard: g = !0,
  showCrypto: I = !0,
  showCredits: f = !1,
  onPaymentAttempt: m,
  onPaymentSuccess: c,
  onPaymentError: u,
  onStripeSuccess: h,
  onCryptoSuccess: l,
  onCreditsSuccess: j,
  onStripeError: E,
  onCryptoError: d,
  onCreditsError: s,
  customerEmail: b,
  successUrl: C,
  cancelUrl: _,
  metadata: P,
  couponCode: N,
  authToken: B,
  testPageUrl: y,
  hideMessages: D = !1
}) => {
  const { tokens: v } = le();
  return z(() => {
    const k = ($) => {
      $.key === "Escape" && t && e();
    };
    return window.addEventListener("keydown", k), () => window.removeEventListener("keydown", k);
  }, [t, e]), z(() => {
    if (t) {
      const k = window.scrollY;
      return document.body.style.position = "fixed", document.body.style.top = `-${k}px`, document.body.style.width = "100%", document.body.style.overflowY = "scroll", () => {
        const $ = document.body.style.top ? Math.abs(parseInt(document.body.style.top.replace("px", ""), 10)) : 0;
        document.body.style.position = "", document.body.style.top = "", document.body.style.width = "", document.body.style.overflowY = "", window.scrollTo(0, $);
      };
    }
  }, [t]), t ? /* @__PURE__ */ S(
    "div",
    {
      className: "cedros-modal-overlay",
      style: {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: v.modalOverlay,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "1rem"
      },
      onClick: e,
      children: /* @__PURE__ */ H(
        "div",
        {
          className: "cedros-modal-content",
          style: {
            backgroundColor: v.modalBackground,
            borderRadius: "12px",
            padding: "2rem",
            maxWidth: "400px",
            width: "100%",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            border: `1px solid ${v.modalBorder}`
          },
          onClick: (k) => k.stopPropagation(),
          children: [
            /* @__PURE__ */ H(
              "div",
              {
                style: {
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1.5rem"
                },
                children: [
                  /* @__PURE__ */ S(
                    "h3",
                    {
                      style: {
                        margin: 0,
                        fontSize: "1.25rem",
                        fontWeight: 600,
                        color: v.surfaceText
                      },
                      children: "Choose Payment Method"
                    }
                  ),
                  /* @__PURE__ */ S(
                    "button",
                    {
                      onClick: e,
                      style: He(v.surfaceText),
                      "aria-label": "Close modal",
                      children: "×"
                    }
                  )
                ]
              }
            ),
            /* @__PURE__ */ H("div", { style: { display: "flex", flexDirection: "column", gap: "1rem" }, children: [
              g && /* @__PURE__ */ S(
                lt,
                {
                  resource: n,
                  items: r,
                  label: o,
                  onAttempt: m,
                  onSuccess: h || c,
                  onError: E || u,
                  customerEmail: b,
                  successUrl: C,
                  cancelUrl: _,
                  metadata: P,
                  couponCode: N
                }
              ),
              I && /* @__PURE__ */ S(
                dt,
                {
                  resource: n,
                  items: r,
                  label: a,
                  onAttempt: m,
                  onSuccess: l || c,
                  onError: d || u,
                  testPageUrl: y,
                  hideMessages: D,
                  metadata: P,
                  couponCode: N
                }
              ),
              f && /* @__PURE__ */ S(
                mt,
                {
                  resource: n,
                  items: r,
                  label: w,
                  authToken: B,
                  onAttempt: m ? () => m("credits") : void 0,
                  onSuccess: j || c,
                  onError: s || u,
                  metadata: P,
                  couponCode: N
                }
              )
            ] })
          ]
        }
      )
    }
  ) : null;
};
function jt({
  product: t,
  paymentMethod: e,
  showOriginalPrice: n = !1,
  className: r = "",
  style: o = {}
}) {
  const a = e === "stripe", w = a ? t.fiatAmount : t.cryptoAmount, g = a ? t.effectiveFiatAmount : t.effectiveCryptoAmount, I = a ? t.fiatCurrency.toUpperCase() : t.cryptoToken, f = a ? t.hasStripeCoupon : t.hasCryptoCoupon, m = a ? t.stripeDiscountPercent : t.cryptoDiscountPercent;
  return /* @__PURE__ */ H("div", { className: r, style: o, children: [
    n && f && /* @__PURE__ */ H(
      "span",
      {
        style: {
          textDecoration: "line-through",
          opacity: 0.6,
          marginRight: "0.5rem",
          fontSize: "0.875em"
        },
        children: [
          w.toFixed(2),
          " ",
          I
        ]
      }
    ),
    /* @__PURE__ */ H("span", { style: { fontWeight: 600 }, children: [
      g.toFixed(2),
      " ",
      I
    ] }),
    f && m > 0 && /* @__PURE__ */ H(
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
          m,
          "% OFF"
        ]
      }
    )
  ] });
}
function Dt({
  product: t,
  paymentMethod: e,
  className: n = "",
  style: r = {}
}) {
  const o = e === "stripe", a = o ? t.hasStripeCoupon : t.hasCryptoCoupon, w = o ? t.stripeDiscountPercent : t.cryptoDiscountPercent, g = o ? t.stripeCouponCode : t.cryptoCouponCode;
  if (!a || w === 0)
    return null;
  const I = o ? `${w}% off with card!` : `${w}% off with crypto!`;
  return /* @__PURE__ */ H(
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
        I,
        g && /* @__PURE__ */ H(
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
export {
  it as A,
  St as B,
  Q as C,
  ct as D,
  rt as E,
  Et as F,
  Tt as G,
  Rt as P,
  lt as S,
  jt as a,
  Dt as b,
  Ce as c,
  vt as d,
  be as e,
  Pt as f,
  ie as g,
  _e as h,
  U as i,
  It as j,
  xt as k,
  dt as l,
  ut as m,
  ue as n,
  ee as o,
  Ct as p,
  we as q,
  mt as r,
  nt as s,
  De as t,
  ot as u,
  me as v,
  He as w,
  ft as x,
  kt as y,
  st as z
};
