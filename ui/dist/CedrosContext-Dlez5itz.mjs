import { jsx as q } from "react/jsx-runtime";
import { useContext as ue, useState as M, useRef as de, useEffect as O, useMemo as K, createContext as fe } from "react";
import { f as m, g as s, b as pe, s as Ce, c as ke } from "./fetchWithTimeout-D-qpKB_T.mjs";
import { g as B } from "./uuid-CPLkueHj.mjs";
import { a as Re, n as Ie } from "./locales-BNQRXSb3.mjs";
class xe {
  constructor(e) {
    this.routeDiscovery = e;
  }
  routeDiscovery;
  async getBalance(e) {
    Oe(e);
    const r = await this.routeDiscovery.buildUrl("/paywall/v1/credits/balance"), n = await m(r, {
      method: "GET",
      headers: { Authorization: `Bearer ${e}` }
    });
    if (!n.ok) throw new Error("Failed to fetch credits balance");
    const a = await n.json().catch(() => {
    });
    if (!Me(a)) throw new Error("Invalid credits balance response");
    return a;
  }
}
function Oe(t) {
  if (!t || t.length > 8192 || [...t].some((e) => {
    const r = e.charCodeAt(0);
    return r <= 32 || r === 127;
  }))
    throw new TypeError("authToken is invalid");
}
function Me(t) {
  if (typeof t != "object" || t === null || Array.isArray(t)) return !1;
  const e = t;
  return ie(e.available) && ie(e.held) && typeof e.currency == "string" && /^[A-Za-z0-9_-]{1,32}$/u.test(e.currency);
}
function ie(t) {
  return Number.isSafeInteger(t) && Number(t) >= 0;
}
class De {
  constructor(e) {
    this.routes = e;
  }
  routes;
  async requestQuote(e, r) {
    U(e, "resource", 255);
    const n = await this.post("/paywall/v1/quote", { resource: e, couponCode: r });
    if (n.status === 402) {
      const a = await n.json().catch(() => {
      });
      return L(a) && Fe(a.credits) ? a.credits : null;
    }
    if (!n.ok) throw new Error("Failed to get credits subscription quote");
    return null;
  }
  async processSubscription(e, r, n, a, i) {
    U(e, "resource", 255), U(n, "authToken", 8192), U(a, "userId", 512);
    let o;
    try {
      o = await this.createHold(e, n, i?.couponCode);
      const c = await this.authorize(e, o, n, r, i);
      return c.success ? await this.activate(e, o, a, r, i) : (await this.release(o, n), c);
    } catch {
      return o && await this.release(o, n).catch(() => {
      }), { success: !1, error: "Credits subscription failed" };
    }
  }
  async createHold(e, r, n) {
    const a = await this.post("/paywall/v1/credits/hold", { resource: e, couponCode: n }, r), i = await a.json().catch(() => {
    });
    if (!a.ok || !L(i) || !I(i.holdId)) throw new Error("Credits hold failed");
    return i.holdId;
  }
  async authorize(e, r, n, a, i) {
    const o = await this.post("/paywall/v1/credits/authorize", {
      resource: e,
      holdId: r,
      couponCode: i?.couponCode,
      metadata: { subscription: "true", interval: a, intervalDays: String(i?.intervalDays ?? "") }
    }, n), c = await o.json().catch(() => {
    });
    return !o.ok || !L(c) || !I(c.transactionId) ? { success: !1, error: "Credits subscription authorization failed" } : { success: !0, transactionId: c.transactionId };
  }
  async activate(e, r, n, a, i) {
    const o = Ae(a, i?.intervalDays), c = await this.post("/paywall/v1/subscription/credits/activate", {
      wallet: n,
      productId: e,
      holdId: r,
      ...o
    }), u = await c.json().catch(() => {
    });
    return !c.ok || !L(u) || !I(u.subscriptionId) ? { success: !1, error: "Credits subscription activation failed" } : { success: !0, transactionId: u.subscriptionId };
  }
  async release(e, r) {
    const n = `/paywall/v1/credits/hold/${encodeURIComponent(e)}/release`;
    await m(await this.routes.buildUrl(n), {
      method: "POST",
      headers: { Authorization: `Bearer ${r}`, "Idempotency-Key": B() }
    });
  }
  post(e, r, n) {
    return this.routes.buildUrl(e).then((a) => m(a, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": B(),
        ...n ? { Authorization: `Bearer ${n}` } : {}
      },
      body: JSON.stringify(r)
    }));
  }
}
function Ae(t, e) {
  if (t === "custom") {
    if (!Number.isSafeInteger(e) || Number(e) < 1) throw new TypeError("intervalDays is invalid");
    return { billingPeriod: "day", billingInterval: e };
  }
  return { billingPeriod: t.replace("ly", ""), billingInterval: 1 };
}
function Fe(t) {
  return L(t) && Number.isSafeInteger(t.amount) && Number(t.amount) >= 0 && I(t.currency) && I(t.description) && I(t.resource);
}
function U(t, e, r) {
  if (!I(t) || t.length > r || Ne(t)) throw new TypeError(`${e} is invalid`);
}
function L(t) {
  return typeof t == "object" && t !== null && !Array.isArray(t);
}
function I(t) {
  return typeof t == "string" && t.length > 0;
}
function Ne(t) {
  return [...t].some((e) => e.charCodeAt(0) <= 31 || e.charCodeAt(0) === 127);
}
class Le {
  constructor(e) {
    this.routes = e;
  }
  routes;
  async requestRefund(e) {
    if (X(e.originalPurchaseId, "originalPurchaseId"), X(e.recipientWallet, "recipientWallet"), e.reason !== void 0 && (e.reason.length > 500 || he(e.reason)))
      throw new TypeError("reason is invalid");
    const r = await m(await this.routes.buildUrl("/paywall/v1/refunds/request"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(e)
    });
    return ae(r, "Failed to request refund");
  }
  async getRefundStatus(e) {
    X(e, "refundId");
    const r = `/paywall/v1/refunds/${encodeURIComponent(e)}`;
    return ae(await m(await this.routes.buildUrl(r), {
      method: "GET"
    }), "Failed to fetch refund status");
  }
}
async function ae(t, e) {
  if (!t.ok) throw new Error(e);
  const r = await t.json().catch(() => {
  });
  if (!$e(r)) throw new Error("Invalid refund response");
  return r;
}
function $e(t) {
  return Be(t) ? ["pending", "submitted", "succeeded", "denied"].includes(String(t.status)) && typeof t.refundId == "string" && typeof t.originalPurchaseId == "string" && typeof t.recipientWallet == "string" && Number.isSafeInteger(t.amountCents) && Number(t.amountCents) >= 0 && typeof t.currency == "string" && typeof t.createdAt == "string" : !1;
}
function X(t, e) {
  if (!t || t.length > 512 || he(t)) throw new TypeError(`${e} is invalid`);
}
function he(t) {
  return [...t].some((e) => e.charCodeAt(0) <= 31 || e.charCodeAt(0) === 127);
}
function Be(t) {
  return typeof t == "object" && t !== null && !Array.isArray(t);
}
class Ue {
  serverUrl;
  getLogger;
  fetchWithTimeout;
  routePrefix = null;
  discoveryPromise = null;
  failedDiscoveryAt = null;
  maxRetries = 2;
  baseDelayMs = 1e3;
  discoveryTimeoutMs = 2e3;
  failedDiscoveryTtlMs = 3e4;
  constructor(e, r) {
    this.serverUrl = e.replace(/\/+$/, ""), this.getLogger = r.getLogger, this.fetchWithTimeout = r.fetchWithTimeout;
  }
  async discoverPrefix() {
    if (this.routePrefix !== null)
      return this.routePrefix;
    if (this.discoveryPromise)
      return this.discoveryPromise;
    if (this.failedDiscoveryAt !== null && Date.now() - this.failedDiscoveryAt < this.failedDiscoveryTtlMs)
      return "";
    const e = (async () => {
      let r = 0;
      for (; r < this.maxRetries; )
        try {
          const n = await this.fetchWithTimeout(
            `${this.serverUrl}/cedros-health`,
            {},
            this.discoveryTimeoutMs
          );
          if (!n.ok) {
            if (n.status >= 400 && n.status < 500)
              return this.getLogger().warn(
                `Route discovery received ${n.status} - not retrying client error`
              ), this.failedDiscoveryAt = Date.now(), "";
            throw new Error(`Health check returned ${n.status}`);
          }
          const a = await n.json(), i = String(a.routePrefix ?? "");
          return this.routePrefix = i, this.failedDiscoveryAt = null, this.getLogger().debug("Route discovery successful, prefix:", i || "(empty)"), i;
        } catch (n) {
          if (r++, r >= this.maxRetries)
            return this.getLogger().warn(
              `Route discovery failed after ${r} attempts, using empty prefix for this request:`,
              n
            ), this.failedDiscoveryAt = Date.now(), "";
          const a = this.baseDelayMs * Math.pow(2, r - 1);
          this.getLogger().warn(
            `Route discovery failed (attempt ${r}/${this.maxRetries}), retrying in ${a}ms:`,
            n
          ), await new Promise((i) => setTimeout(i, a));
        }
      return "";
    })();
    this.discoveryPromise = e;
    try {
      return await this.discoveryPromise;
    } finally {
      this.discoveryPromise === e && (this.discoveryPromise = null);
    }
  }
  async buildUrl(e) {
    const r = await this.discoverPrefix(), n = e.startsWith("/") ? e : `/${e}`;
    return `${this.serverUrl}${r}${n}`;
  }
  reset() {
    this.routePrefix = null, this.discoveryPromise = null, this.failedDiscoveryAt = null;
  }
}
class je extends Ue {
  constructor(e) {
    super(e, { getLogger: s, fetchWithTimeout: m });
  }
}
function He(t, e) {
  return t instanceof Error ? t.message : typeof t == "string" ? t : e;
}
const We = {
  service_unavailable: "Service temporarily unavailable. Please try again later or contact support.",
  server_insufficient_funds: "Service temporarily unavailable. Please try again later or contact support.",
  insufficient_funds_token: "Insufficient token balance in your wallet. Please add more tokens and try again.",
  insufficient_funds_sol: "Insufficient SOL for transaction fees. Please add some SOL to your wallet and try again.",
  insufficient_amount: "Payment amount is insufficient. Please check the required amount.",
  invalid_signature: "Transaction signature is invalid. Please try again.",
  send_failed: "Failed to send transaction. Please try again or contact support.",
  timeout: "Transaction timed out. Please check the blockchain explorer or try again."
};
async function S(t, e, r = !1) {
  const n = typeof t.clone == "function", a = n ? t.clone() : void 0;
  try {
    const i = await t.json();
    if (r && i.verificationError) {
      s().debug(`Payment verification failed: ${i.verificationError.code}`);
      const o = i.verificationError.code;
      return We[o] || i.verificationError.message || e;
    }
    return typeof i.error == "string" ? i.error : i.error && typeof i.error == "object" && "message" in i.error ? i.error.message : e;
  } catch {
    if (a)
      try {
        const i = await a.text();
        if (i) return i;
      } catch {
      }
    if (!n && typeof t.text == "function")
      try {
        const i = await t.text();
        if (i) return i;
      } catch {
      }
    return e;
  }
}
function G(t) {
  const { maxRequests: e, windowMs: r } = t;
  let n = e, a = Date.now();
  const i = e / r;
  function o() {
    const d = Date.now(), y = d - a;
    if (y > 0) {
      const w = y * i;
      n = Math.min(e, n + w), a = d;
    }
  }
  function c() {
    return o(), n >= 1 ? (n -= 1, !0) : !1;
  }
  function u() {
    return o(), Math.floor(n);
  }
  function h() {
    if (o(), n >= 1)
      return 0;
    const y = (1 - n) / i;
    return Math.ceil(y);
  }
  function p() {
    n = e, a = Date.now();
  }
  return {
    tryConsume: c,
    getAvailableTokens: u,
    getTimeUntilRefill: h,
    reset: p
  };
}
const Y = {
  /** 10 requests per minute - recommended for payment requests */
  PAYMENT: { maxRequests: 10, windowMs: 6e4 },
  /** 30 requests per minute - for quote fetching */
  QUOTE: { maxRequests: 30, windowMs: 6e4 },
  /** 5 requests per minute - strict limit for sensitive operations */
  STRICT: { maxRequests: 5, windowMs: 6e4 },
  /** 100 requests per minute - permissive for UI interactions */
  PERMISSIVE: { maxRequests: 100, windowMs: 6e4 }
};
var ze = /* @__PURE__ */ ((t) => (t.CLOSED = "CLOSED", t.OPEN = "OPEN", t.HALF_OPEN = "HALF_OPEN", t))(ze || {});
class R extends Error {
  constructor(e) {
    super(e), this.name = "CircuitBreakerOpenError";
  }
}
function me(t) {
  const { failureThreshold: e, timeout: r, failureWindow: n = r * 2, name: a = "circuit-breaker" } = t;
  let i = "CLOSED", o = [], c = 0, u = 0, h = null, p = null, d = null, y = !1;
  function w() {
    const P = Date.now() - n;
    o = o.filter((g) => g > P);
  }
  function f() {
    i === "OPEN" && d !== null && Date.now() >= d && (s().debug(`[CircuitBreaker:${a}] Transitioning OPEN → HALF_OPEN (timeout expired)`), i = "HALF_OPEN", d = null);
  }
  function l() {
    p = Date.now(), c++, i === "HALF_OPEN" ? (s().debug(`[CircuitBreaker:${a}] Success in HALF_OPEN → CLOSED`), i = "CLOSED", o = []) : i === "CLOSED" && (o = []);
  }
  function b(P) {
    const g = Date.now();
    h = g, o.push(g), w();
    const V = o.length;
    s().warn(`[CircuitBreaker:${a}] Failure recorded (${V}/${e}):`, P.message), i === "HALF_OPEN" ? (s().warn(`[CircuitBreaker:${a}] Failed in HALF_OPEN → OPEN`), i = "OPEN", d = g + r) : i === "CLOSED" && V >= e && (s().error(`[CircuitBreaker:${a}] Failure threshold reached (${V}) → OPEN`), i = "OPEN", d = g + r);
  }
  async function _(P) {
    if (f(), i === "OPEN") {
      u++;
      const g = d ? Math.ceil((d - Date.now()) / 1e3) : 0;
      throw new R(
        `Circuit breaker is OPEN. Service is unavailable. Retry in ${g}s.`
      );
    }
    if (i === "HALF_OPEN" && y)
      throw u++, new R(
        "Circuit breaker is HALF_OPEN. A probe request is already in progress."
      );
    i === "HALF_OPEN" && (y = !0);
    try {
      const g = await P();
      return l(), g;
    } catch (g) {
      throw b(g instanceof Error ? g : new Error(String(g))), g;
    } finally {
      y && (y = !1);
    }
  }
  function C() {
    return f(), i;
  }
  function x() {
    return f(), w(), {
      state: i,
      failures: o.length,
      successes: c,
      rejections: u,
      lastFailureTime: h,
      lastSuccessTime: p
    };
  }
  function T() {
    s().debug(`[CircuitBreaker:${a}] Manual reset → CLOSED`), i = "CLOSED", o = [], c = 0, u = 0, h = null, p = null, d = null;
  }
  function A() {
    s().warn(`[CircuitBreaker:${a}] Manual trip → OPEN`), i = "OPEN", d = Date.now() + r;
  }
  return {
    execute: _,
    getState: C,
    getStats: x,
    reset: T,
    trip: A
  };
}
const Bt = {
  /** Strict: Opens quickly (3 failures), long timeout (60s) */
  STRICT: { failureThreshold: 3, timeout: 6e4 },
  /** Standard: Balanced settings (5 failures, 30s timeout) */
  STANDARD: { failureThreshold: 5, timeout: 3e4 },
  /** Lenient: Tolerates more failures (10 failures, 15s timeout) */
  LENIENT: { failureThreshold: 10, timeout: 15e3 }
}, qe = {
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
function Ke(t) {
  return qe[t] || {
    message: "An unexpected error occurred",
    action: "Please try again or contact support if this continues.",
    technicalHint: `Unknown error code: ${t}`
  };
}
class k extends Error {
  /** Machine-readable error code enum */
  code;
  /** Whether this error can be safely retried */
  retryable;
  /** Additional error context */
  details;
  /** HTTP status code (if from API response) */
  httpStatus;
  constructor(e, r, n = !1, a, i) {
    super(r), this.name = "PaymentError", this.code = e, this.retryable = n, this.details = a, this.httpStatus = i, Object.setPrototypeOf(this, k.prototype);
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
    return Ke(this.code);
  }
  /**
   * Create PaymentError from API error response
   *
   * Uses backend retryability when present, otherwise infers it from the code.
   */
  static fromErrorResponse(e, r) {
    const n = e.error.retryable ?? Ge.RETRYABLE.includes(e.error.code);
    return new k(
      e.error.code,
      e.error.message,
      n,
      e.error.details,
      r
    );
  }
  /**
   * Create PaymentError from unknown error
   * Useful for catch blocks where error type is unknown
   */
  static fromUnknown(e) {
    return e instanceof k ? e : e instanceof Error ? new k(
      "internal_error",
      e.message,
      !1
    ) : new k(
      "internal_error",
      String(e),
      !1
    );
  }
}
const Ge = {
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
}, oe = 300 * 1e3, j = /* @__PURE__ */ new Map();
function Ye(t) {
  if (!t)
    return;
  const e = Number(t);
  if (Number.isFinite(e) && e >= 0)
    return Math.min(e * 1e3, oe);
  const r = Date.parse(t);
  if (!Number.isNaN(r))
    return Math.min(Math.max(r - Date.now(), 0), oe);
}
class v extends Error {
  httpStatus;
  retryAfterMs;
  constructor(e, r, n) {
    super(e), this.name = "RetryableHttpError", this.httpStatus = r, this.retryAfterMs = n, Object.setPrototypeOf(this, v.prototype);
  }
  static fromResponse(e, r) {
    const n = e.headers && typeof e.headers.get == "function" ? e.headers.get("Retry-After") : null;
    return new v(
      r,
      e.status,
      Ye(n)
    );
  }
}
function Je(t) {
  if (t instanceof k || t instanceof v)
    return t.httpStatus;
}
function Ve(t) {
  if (t instanceof v)
    return t.retryAfterMs;
}
function Xe(t, e) {
  const r = Je(t);
  if (r != null) {
    const a = r;
    return a === 429 || a >= 500 && a < 600;
  }
  const n = t.message.toLowerCase();
  return !!(n.includes("network") || n.includes("timeout") || n.includes("fetch failed") || n.includes("econnrefused"));
}
function Qe(t, e, r, n, a) {
  const i = e * Math.pow(r, t), o = Math.min(i, n);
  return Math.floor(a ? o * 0.5 + Math.random() * o * 0.5 : o);
}
function Ze(t) {
  return new Promise((e) => setTimeout(e, t));
}
async function $(t, e = {}) {
  const {
    maxRetries: r = 3,
    initialDelayMs: n = 1e3,
    backoffFactor: a = 2,
    maxDelayMs: i = 3e4,
    jitter: o = !0,
    shouldRetry: c = Xe,
    name: u = "retry",
    inFlightKey: h
  } = e, p = async () => {
    let w = null, f = 0;
    for (let l = 0; l <= r; l++)
      try {
        const b = await t();
        return l > 0 && s().debug(
          `[Retry:${u}] Succeeded on attempt ${l + 1}/${r + 1} after ${f}ms`
        ), b;
      } catch (b) {
        w = b instanceof Error ? b : new Error(String(b));
        const _ = l === r, C = c(w, l);
        if (_ || !C)
          throw s().warn(
            `[Retry:${u}] Failed on attempt ${l + 1}/${r + 1}. ${_ ? "No more retries." : "Error not retryable."}`
          ), w;
        const T = Ve(w) ?? Qe(
          l,
          n,
          a,
          i,
          o
        );
        f += T, s().warn(
          `[Retry:${u}] Attempt ${l + 1}/${r + 1} failed: ${w.message}. Retrying in ${T}ms...`
        ), await Ze(T);
      }
    throw w || new Error("Retry failed with no error");
  };
  if (!h)
    return p();
  const d = j.get(h);
  if (d)
    return d;
  const y = p().finally(() => {
    j.get(h) === y && j.delete(h);
  });
  return j.set(h, y), y;
}
const E = {
  /** Quick retries for transient errors (3 retries, 1s initial, 2x backoff) */
  QUICK: {
    maxRetries: 3,
    initialDelayMs: 1e3,
    backoffFactor: 2,
    maxDelayMs: 1e4
  },
  /** Standard retries (3 retries, 2s initial, 2x backoff) */
  STANDARD: {
    maxRetries: 3,
    initialDelayMs: 2e3,
    backoffFactor: 2,
    maxDelayMs: 3e4
  },
  /** Aggressive retries for critical operations (5 retries, 500ms initial) */
  AGGRESSIVE: {
    maxRetries: 5,
    initialDelayMs: 500,
    backoffFactor: 1.5,
    maxDelayMs: 15e3
  },
  /** Patient retries for slow backends (5 retries, 5s initial) */
  PATIENT: {
    maxRetries: 5,
    initialDelayMs: 5e3,
    backoffFactor: 2,
    maxDelayMs: 6e4
  },
  /** At most one retry for writes with a real idempotency guarantee */
  IDEMPOTENT_WRITE: {
    maxRetries: 1,
    initialDelayMs: 1e3,
    backoffFactor: 2,
    maxDelayMs: 1e4
  },
  /** Never automatically retry non-idempotent writes */
  WRITE_ONCE: {
    maxRetries: 0,
    initialDelayMs: 1e3,
    backoffFactor: 2,
    maxDelayMs: 1e4
  }
};
class et {
  routeDiscovery;
  rateLimiter = G(Y.PAYMENT);
  queryRateLimiter = G(Y.QUOTE);
  circuitBreaker = me({
    failureThreshold: 5,
    timeout: 1e4,
    name: "subscription-change-manager"
  });
  constructor(e) {
    this.routeDiscovery = e;
  }
  /** Internal helper: execute with rate limiting, circuit breaker, and retry */
  async executeWithResilience(e, r, n, a, i = E.STANDARD) {
    if (!e.tryConsume())
      throw new Error("Rate limit exceeded. Please try again later.");
    try {
      return await this.circuitBreaker.execute(
        () => $(r, { ...i, name: n })
      );
    } catch (o) {
      throw o instanceof R ? (s().error(`[SubscriptionChangeManager] Circuit breaker OPEN for ${a}`), new Error("Service temporarily unavailable. Please try again in a few moments.")) : o;
    }
  }
  /** Change subscription plan (upgrade or downgrade) */
  async changeSubscription(e) {
    const r = B(), n = JSON.stringify(e);
    return this.executeWithResilience(
      this.rateLimiter,
      async () => {
        const a = await this.routeDiscovery.buildUrl("/paywall/v1/subscription/change");
        s().debug("[SubscriptionChangeManager] Changing subscription:", e);
        const i = await m(a, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Idempotency-Key": r },
          body: n
        });
        if (!i.ok)
          throw v.fromResponse(
            i,
            await S(i, "Failed to change subscription")
          );
        return await i.json();
      },
      "subscription-change",
      "plan change",
      {
        ...E.IDEMPOTENT_WRITE,
        inFlightKey: `subscription:change:${n}`
      }
    );
  }
  /** Preview subscription change (get proration details) */
  async previewChange(e) {
    return this.executeWithResilience(
      this.queryRateLimiter,
      async () => {
        const r = await this.routeDiscovery.buildUrl("/paywall/v1/subscription/change/preview");
        s().debug("[SubscriptionChangeManager] Previewing subscription change:", e);
        const n = await m(r, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(e)
        });
        if (!n.ok)
          throw new Error(await S(n, "Failed to preview change"));
        return await n.json();
      },
      "subscription-preview",
      "change preview"
    );
  }
  /** Get full subscription details */
  async getDetails(e, r) {
    return this.executeWithResilience(
      this.queryRateLimiter,
      async () => {
        const n = new URLSearchParams({ resource: e, userId: r }), a = await this.routeDiscovery.buildUrl(`/paywall/v1/subscription/details?${n}`);
        s().debug("[SubscriptionChangeManager] Getting subscription details:", { resource: e, userId: r });
        const i = await m(a, {
          method: "GET",
          headers: { "Content-Type": "application/json" }
        });
        if (!i.ok)
          throw new Error(await S(i, "Failed to get subscription details"));
        return await i.json();
      },
      "subscription-details",
      "details"
    );
  }
  /** Cancel a subscription */
  async cancel(e) {
    const r = JSON.stringify(e);
    return this.executeWithResilience(
      this.rateLimiter,
      async () => {
        const n = await this.routeDiscovery.buildUrl("/paywall/v1/subscription/cancel");
        s().debug("[SubscriptionChangeManager] Canceling subscription:", e);
        const a = await m(n, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: r
        });
        if (!a.ok)
          throw v.fromResponse(
            a,
            await S(a, "Failed to cancel subscription")
          );
        return await a.json();
      },
      "subscription-cancel",
      "cancellation",
      {
        ...E.WRITE_ONCE,
        inFlightKey: `subscription:cancel:${r}`
      }
    );
  }
  /** Get Stripe billing portal URL */
  async getBillingPortalUrl(e) {
    const r = JSON.stringify(e);
    return this.executeWithResilience(
      this.queryRateLimiter,
      async () => {
        const n = await this.routeDiscovery.buildUrl("/paywall/v1/subscription/portal");
        s().debug("[SubscriptionChangeManager] Getting billing portal URL:", e);
        const a = await m(n, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: r
        });
        if (!a.ok)
          throw v.fromResponse(
            a,
            await S(a, "Failed to get billing portal URL")
          );
        return await a.json();
      },
      "subscription-portal",
      "portal",
      {
        ...E.WRITE_ONCE,
        inFlightKey: `subscription:portal:${r}`
      }
    );
  }
  async confirmSolanaLifecycle(e, r) {
    const n = JSON.stringify(r);
    return this.executeWithResilience(
      this.rateLimiter,
      async () => {
        const a = await this.routeDiscovery.buildUrl(tt(e));
        s().debug("[SubscriptionChangeManager] Confirming Solana lifecycle action:", {
          action: e,
          subscriptionId: r.subscriptionId,
          wallet: r.wallet
        });
        const i = await m(a, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: n
        });
        if (!i.ok)
          throw v.fromResponse(
            i,
            await S(i, "Failed to confirm Solana subscription action")
          );
        return await i.json();
      },
      `subscription-solana-${e}`,
      `Solana ${e}`,
      {
        ...E.WRITE_ONCE,
        inFlightKey: `subscription:solana:${e}:${n}`
      }
    );
  }
}
function tt(t) {
  switch (t) {
    case "cancel":
      return "/paywall/v1/subscription/solana-subscription/cancel";
    case "resume":
      return "/paywall/v1/subscription/solana-subscription/resume";
    case "revoke":
      return "/paywall/v1/subscription/solana-subscription/revoke";
    case "revoke_authority":
      return "/paywall/v1/subscription/solana-subscription/authority/revoke";
    case "close_authority":
      return "/paywall/v1/subscription/solana-subscription/authority/close";
  }
}
var ye = "https://js.stripe.com/v3", rt = /^https:\/\/js\.stripe\.com\/v3\/?(\?.*)?$/;
var nt = function() {
  for (var e = document.querySelectorAll('script[src^="'.concat(ye, '"]')), r = 0; r < e.length; r++) {
    var n = e[r];
    if (rt.test(n.src))
      return n;
  }
  return null;
}, se = function(e) {
  var r = "", n = document.createElement("script");
  n.src = "".concat(ye).concat(r);
  var a = document.head || document.body;
  if (!a)
    throw new Error("Expected document.body not to be null. Stripe.js requires a <body> element.");
  return a.appendChild(n), n;
}, it = function(e, r) {
  !e || !e._registerWrapper || e._registerWrapper({
    name: "stripe-js",
    version: "4.6.0",
    startTime: r
  });
}, F = null, H = null, W = null, at = function(e) {
  return function() {
    e(new Error("Failed to load Stripe.js"));
  };
}, ot = function(e, r) {
  return function() {
    window.Stripe ? e(window.Stripe) : r(new Error("Stripe.js not available"));
  };
}, st = function(e) {
  return F !== null ? F : (F = new Promise(function(r, n) {
    if (typeof window > "u" || typeof document > "u") {
      r(null);
      return;
    }
    if (window.Stripe) {
      r(window.Stripe);
      return;
    }
    try {
      var a = nt();
      if (!(a && e)) {
        if (!a)
          a = se(e);
        else if (a && W !== null && H !== null) {
          var i;
          a.removeEventListener("load", W), a.removeEventListener("error", H), (i = a.parentNode) === null || i === void 0 || i.removeChild(a), a = se(e);
        }
      }
      W = ot(r, n), H = at(n), a.addEventListener("load", W), a.addEventListener("error", H);
    } catch (o) {
      n(o);
      return;
    }
  }), F.catch(function(r) {
    return F = null, Promise.reject(r);
  }));
}, ct = function(e, r, n) {
  if (e === null)
    return null;
  var a = e.apply(void 0, r);
  return it(a, n), a;
}, N, ge = !1, we = function() {
  return N || (N = st(null).catch(function(e) {
    return N = null, Promise.reject(e);
  }), N);
};
Promise.resolve().then(function() {
  return we();
}).catch(function(t) {
  ge || console.warn(t);
});
var lt = function() {
  for (var e = arguments.length, r = new Array(e), n = 0; n < e; n++)
    r[n] = arguments[n];
  ge = !0;
  var a = Date.now();
  return we().then(function(i) {
    return ct(i, r, a);
  });
};
function Q(t) {
  return `${t} is temporarily unavailable. Please try again in a few moments.`;
}
function Z(t) {
  return `Rate limit exceeded for ${t}. Please try again later.`;
}
function ut(t, e) {
  switch (t) {
    case "weekly":
      return { billingPeriod: "week", billingInterval: 1 };
    case "yearly":
      return { billingPeriod: "year", billingInterval: 1 };
    case "custom":
      return { billingPeriod: "day", billingInterval: e ?? 0 };
    case "monthly":
    case void 0:
      return { billingPeriod: "month", billingInterval: 1 };
  }
}
function dt(t) {
  const e = t.productId ?? t.resource, r = t.wallet ?? t.walletAddress, n = t.paymentSignature ?? t.transactionSignature;
  if (!e) throw new Error("productId is required to activate an x402 subscription");
  if (!r) throw new Error("wallet is required to activate an x402 subscription");
  if (!n)
    throw new Error("paymentSignature is required to activate an x402 subscription");
  const a = ut(t.interval, t.intervalDays), i = t.billingPeriod ?? a.billingPeriod, o = t.billingInterval ?? a.billingInterval;
  if (o < 1)
    throw new Error("billingInterval must be greater than zero");
  return {
    wallet: r,
    productId: e,
    paymentSignature: n,
    billingPeriod: i,
    billingInterval: o,
    metadata: t.metadata,
    planId: t.planId
  };
}
function ft(t) {
  return {
    ...t,
    success: !0,
    periodStart: t.currentPeriodStart,
    periodEnd: t.currentPeriodEnd
  };
}
class pt {
  stripe = null;
  initPromise = null;
  publicKey;
  routeDiscovery;
  // Separate rate limiters for different operation types
  sessionRateLimiter = G(Y.PAYMENT);
  statusRateLimiter = G(Y.QUOTE);
  circuitBreaker = me({
    failureThreshold: 5,
    timeout: 1e4,
    // 10 seconds for faster recovery
    name: "subscription-manager"
  });
  constructor(e, r) {
    this.publicKey = e, this.routeDiscovery = r;
  }
  resolveSubscriptionSessionFlow(e) {
    const r = e, n = typeof r.flow == "string" ? r.flow : void 0;
    return n === "payment_sheet" || typeof r.paymentIntentClientSecret == "string" || typeof r.setupIntentClientSecret == "string" ? {
      flow: "payment_sheet",
      paymentIntentClientSecret: typeof r.paymentIntentClientSecret == "string" ? r.paymentIntentClientSecret : void 0,
      setupIntentClientSecret: typeof r.setupIntentClientSecret == "string" ? r.setupIntentClientSecret : void 0,
      customerId: typeof r.customerId == "string" ? r.customerId : void 0,
      customerEphemeralKeySecret: typeof r.customerEphemeralKeySecret == "string" ? r.customerEphemeralKeySecret : void 0,
      sessionId: typeof r.sessionId == "string" ? r.sessionId : void 0,
      url: typeof r.url == "string" ? r.url : void 0
    } : (n === void 0 || n === "redirect_checkout") && typeof r.sessionId == "string" && typeof r.url == "string" ? {
      flow: "redirect_checkout",
      sessionId: r.sessionId,
      url: r.url
    } : null;
  }
  /**
   * Initialize Stripe.js library
   *
   * Concurrent callers share a single loadStripe() call via a cached promise.
   */
  async initialize() {
    this.stripe || (this.initPromise || (this.initPromise = (async () => {
      if (this.stripe = await lt(this.publicKey), !this.stripe) throw new Error("Failed to initialize Stripe");
    })()), await this.initPromise);
  }
  /** Internal helper: execute with rate limiting, circuit breaker, and retry */
  async executeWithResilience(e, r, n, a, i = E.STANDARD) {
    if (!e.tryConsume())
      throw new Error("Rate limit exceeded. Please try again later.");
    try {
      return await this.circuitBreaker.execute(
        () => $(r, { ...i, name: n })
      );
    } catch (o) {
      throw o instanceof R ? (s().error(`[SubscriptionManager] Circuit breaker OPEN for ${a}`), new Error("Service temporarily unavailable. Please try again in a few moments.")) : o;
    }
  }
  /**
   * Create a Stripe subscription checkout session
   */
  async createSubscriptionSession(e) {
    if (!this.sessionRateLimiter.tryConsume())
      throw new Error(Z("subscription session creation"));
    const r = B(), n = JSON.stringify(e);
    try {
      return await this.circuitBreaker.execute(async () => await $(
        async () => {
          const a = await this.routeDiscovery.buildUrl("/paywall/v1/subscription/stripe-session");
          s().debug("[SubscriptionManager] Creating subscription session:", {
            resource: e.resource,
            interval: e.interval,
            trialDays: e.trialDays
          });
          const i = await m(a, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Idempotency-Key": r
            },
            body: n
          });
          if (!i.ok) {
            const o = await S(
              i,
              "Failed to create subscription session"
            );
            throw v.fromResponse(i, o);
          }
          return await i.json();
        },
        {
          ...E.IDEMPOTENT_WRITE,
          name: "subscription-create-session",
          inFlightKey: `subscription:create-session:${n}`
        }
      ));
    } catch (a) {
      throw a instanceof R ? (s().error("[SubscriptionManager] Circuit breaker is OPEN - service unavailable"), new Error(Q("Subscription service"))) : a;
    }
  }
  /**
   * Redirect to Stripe checkout
   */
  async redirectToCheckout(e) {
    if (this.stripe || await this.initialize(), !this.stripe)
      return {
        success: !1,
        error: "Stripe not initialized"
      };
    const r = await this.stripe.redirectToCheckout({ sessionId: e });
    return r.error ? {
      success: !1,
      error: r.error.message
    } : { success: !0, transactionId: e };
  }
  /**
   * Complete subscription flow: create session and redirect
   */
  async processSubscription(e) {
    try {
      const r = await this.createSubscriptionSession(e), n = this.resolveSubscriptionSessionFlow(r);
      return n ? n.flow === "payment_sheet" ? {
        success: !1,
        error: "Native payment sheet subscription sessions are not supported on web. Use redirect checkout instead."
      } : await this.redirectToCheckout(n.sessionId) : {
        success: !1,
        error: "Subscription session response was missing required redirect checkout fields."
      };
    } catch (r) {
      return {
        success: !1,
        error: He(r, "Subscription failed")
      };
    }
  }
  /**
   * Check subscription status (for x402 gating)
   */
  async checkSubscriptionStatus(e) {
    if (!this.statusRateLimiter.tryConsume())
      throw new Error(Z("subscription status check"));
    try {
      return await this.circuitBreaker.execute(async () => await $(
        async () => {
          const r = new URLSearchParams({
            resource: e.resource,
            userId: e.userId
          }), n = await this.routeDiscovery.buildUrl(
            `/paywall/v1/subscription/status?${r.toString()}`
          );
          s().debug("[SubscriptionManager] Checking subscription status:", e);
          const a = await m(n, {
            method: "GET",
            headers: {
              "Content-Type": "application/json"
            }
          });
          if (!a.ok) {
            const i = await S(
              a,
              "Failed to check subscription status"
            );
            throw new Error(i);
          }
          return await a.json();
        },
        { ...E.STANDARD, name: "subscription-status-check" }
      ));
    } catch (r) {
      throw r instanceof R ? (s().error("[SubscriptionManager] Circuit breaker is OPEN for status check"), new Error(Q("Subscription status service"))) : r;
    }
  }
  /**
   * Request a subscription quote for x402 crypto payment
   */
  async requestSubscriptionQuote(e, r, n) {
    if (!this.statusRateLimiter.tryConsume())
      throw new Error(Z("subscription quote"));
    try {
      return await this.circuitBreaker.execute(async () => await $(
        async () => {
          const a = await this.routeDiscovery.buildUrl("/paywall/v1/subscription/quote"), i = {
            resource: e,
            interval: r,
            couponCode: n?.couponCode,
            intervalDays: n?.intervalDays
          };
          s().debug("[SubscriptionManager] Requesting subscription quote:", i);
          const o = await m(a, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(i)
          });
          if (o.status !== 402 && !o.ok) {
            const c = await S(
              o,
              "Failed to get subscription quote"
            );
            throw new Error(c);
          }
          return await o.json();
        },
        { ...E.STANDARD, name: "subscription-quote" }
      ));
    } catch (a) {
      throw a instanceof R ? (s().error("[SubscriptionManager] Circuit breaker is OPEN for quote"), new Error(Q("Subscription quote service"))) : a;
    }
  }
  /** Activate x402 subscription after payment verification */
  async activateX402Subscription(e) {
    const r = dt(e), n = JSON.stringify(r);
    return this.executeWithResilience(
      this.sessionRateLimiter,
      async () => {
        const a = await this.routeDiscovery.buildUrl("/paywall/v1/subscription/x402/activate");
        s().debug("[SubscriptionManager] Activating x402 subscription:", {
          productId: r.productId,
          billingPeriod: r.billingPeriod,
          billingInterval: r.billingInterval
        });
        const i = await m(a, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: n
        });
        if (!i.ok)
          throw v.fromResponse(
            i,
            await S(i, "Failed to activate")
          );
        return ft(await i.json());
      },
      "subscription-activate",
      "activation",
      {
        ...E.IDEMPOTENT_WRITE,
        inFlightKey: `subscription:activate:${n}`
      }
    );
  }
  /** Activate Solana subscription after wallet authorization has confirmed. */
  async activateSolanaSubscription(e) {
    const { authToken: r, ...n } = e, a = JSON.stringify(n);
    return this.executeWithResilience(
      this.sessionRateLimiter,
      async () => {
        const i = await this.routeDiscovery.buildUrl(
          "/paywall/v1/subscription/solana-subscription/activate"
        );
        s().debug("[SubscriptionManager] Activating Solana subscription:", {
          planId: e.planId,
          interval: e.interval,
          subscriptionAddress: e.subscriptionAddress
        });
        const o = await m(i, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${r}`
          },
          body: a
        });
        if (!o.ok)
          throw v.fromResponse(
            o,
            await S(o, "Failed to activate Solana subscription")
          );
        return await o.json();
      },
      "solana-subscription-activate",
      "Solana subscription activation",
      {
        ...E.IDEMPOTENT_WRITE,
        inFlightKey: `subscription:solana-activate:${a}`
      }
    );
  }
}
class ht {
  constructor(e) {
    this.routes = e;
  }
  routes;
  validateRequirement(e) {
    return !!(e.scheme && e.network && e.maxAmountRequired && e.resource && e.payTo && e.asset && Number.isFinite(e.maxTimeoutSeconds) && e.maxTimeoutSeconds > 0);
  }
  async submitPayment(e) {
    const r = mt(e.payload, e);
    return this.verify(r, e.payload.payload.signature);
  }
  async buildGaslessTransaction(e) {
    const r = await m(await this.routes.buildUrl("/paywall/v1/gasless-transaction"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(e)
    });
    if (!r.ok) throw new Error("Failed to build subscription transaction");
    const n = await r.json().catch(() => {
    });
    if (!ne(n) || !z(n.transaction) || !z(n.blockhash) || !z(n.feePayer))
      throw new Error("Invalid subscription transaction response");
    return { transaction: n.transaction, blockhash: n.blockhash, feePayer: n.feePayer };
  }
  async submitGaslessTransaction(e) {
    const r = e.requirement;
    if (!r || !this.validateRequirement(r))
      return { success: !1, error: "Invalid subscription requirement" };
    const n = {
      x402Version: 0,
      scheme: r.scheme,
      network: r.network,
      payload: {
        signature: "",
        transaction: e.partialTx,
        feePayer: r.extra?.feePayer ?? "",
        resource: e.resource,
        resourceType: "subscription",
        metadata: be(e.couponCode, e.metadata)
      }
    };
    return this.verify(n, "gasless-subscription");
  }
  async verify(e, r) {
    try {
      const n = await m(await this.routes.buildUrl("/paywall/v1/verify"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": B(),
          "X-PAYMENT": pe.encode(JSON.stringify(e))
        }
      });
      if (!n.ok) return { success: !1, error: "Subscription payment verification failed" };
      const a = yt(n.headers.get("X-PAYMENT-RESPONSE")), i = await n.json().catch(() => {
      });
      return { success: !0, transactionId: ne(i) && z(i.signature) ? i.signature : r, ...a ? { settlement: a } : {} };
    } catch {
      return { success: !1, error: "Subscription payment verification failed" };
    }
  }
}
function mt(t, e) {
  return {
    ...t,
    payload: {
      ...t.payload,
      resource: e.resource,
      resourceType: "subscription",
      metadata: be(e.couponCode, {
        ...t.payload.metadata,
        ...e.metadata
      })
    }
  };
}
function be(t, e) {
  return { ...e, subscription: "true", ...t ? { couponCode: t } : {} };
}
function yt(t) {
  if (t)
    try {
      const e = JSON.parse(pe.decode(t));
      return ne(e) && typeof e.success == "boolean" ? e : void 0;
    } catch {
      return;
    }
}
function ne(t) {
  return typeof t == "object" && t !== null && !Array.isArray(t);
}
function z(t) {
  return typeof t == "string" && t.length > 0;
}
const J = /* @__PURE__ */ new Map(), ee = /* @__PURE__ */ new Map();
let te;
async function gt() {
  return te || (te = (await import("./WalletManager-CcZ17lLm.mjs")).WalletManager), te;
}
function ve(t, e, r, n, a, i) {
  return JSON.stringify({
    stripePublicKey: t,
    serverUrl: e,
    solanaCluster: r,
    solanaEndpoint: n ?? "",
    dangerouslyAllowUnknownMint: a ?? !1,
    complianceCheck: i ?? !1
  });
}
async function wt(t, e, r, n, a, i) {
  const o = ve(
    t,
    e,
    r,
    n,
    a,
    i
  ), c = J.get(o);
  if (c)
    return c.refCount += 1, c;
  const u = ee.get(o);
  if (u) {
    const p = await u;
    return p.refCount += 1, p;
  }
  const h = bt(
    t,
    e,
    r,
    n,
    a
  );
  ee.set(o, h);
  try {
    const p = await h;
    return J.set(o, p), p;
  } finally {
    ee.delete(o);
  }
}
async function bt(t, e, r, n, a) {
  const i = new je(e), o = await gt();
  return {
    subscriptionManager: new pt(t, i),
    subscriptionChangeManager: new et(i),
    creditsBalanceManager: new xe(i),
    creditsSubscriptionManager: new De(i),
    subscriptionX402Manager: new ht(i),
    walletManager: new o(r, n, a ?? !1),
    refundManager: new Le(i),
    routeDiscovery: i,
    refCount: 1
  };
}
function ce(t, e, r, n, a, i) {
  const o = ve(
    t,
    e,
    r,
    n,
    a,
    i
  ), c = J.get(o);
  c && (c.refCount -= 1, c.refCount <= 0 && J.delete(o));
}
function vt(t) {
  return `CEDROS_FEATURE_${t.replace(/([a-z0-9])([A-Z])/g, "$1_$2").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").toUpperCase()}`;
}
function St(t) {
  const e = Object.entries(t).map(([r, n]) => [
    r,
    {
      name: r,
      description: n.description,
      default: n.default,
      stage: n.stage ?? "experimental",
      envVar: vt(r)
    }
  ]);
  return Object.freeze(Object.fromEntries(e));
}
const D = St({
  complianceCheck: {
    description: "Enable pre-flight compliance checks before Stripe checkout.",
    default: !1,
    stage: "stable"
  }
}), Se = Object.freeze(
  Object.keys(D)
);
function Et() {
  return typeof process < "u" && process.env ? process.env : {};
}
function Ee(t, e) {
  if (t)
    for (const [r, n] of Object.entries(t)) {
      if (!(r in D))
        throw new Error(`Unknown feature flag "${r}" in ${e}`);
      if (typeof n != "boolean")
        throw new Error(`Feature flag "${r}" in ${e} must be a boolean`);
    }
}
function Pt(t) {
  if (t == null) return;
  const e = t.trim().toLowerCase();
  if (e) {
    if (e === "1" || e === "true" || e === "yes" || e === "on")
      return !0;
    if (e === "0" || e === "false" || e === "no" || e === "off")
      return !1;
  }
}
function Ut(t) {
  return D[t];
}
function jt() {
  return Se.map((t) => D[t]);
}
function Pe(t = {}) {
  const e = t.env ?? Et();
  Ee(
    t.featureFlags,
    "featureFlags"
  );
  const r = {};
  for (const n of Se) {
    const a = t.featureFlags?.[n], i = Pt(e[D[n].envVar]);
    r[n] = a ?? i ?? D[n].default;
  }
  return r;
}
function Ht(t, e = {}) {
  return Pe(e)[t];
}
function Tt(t, e = "featureFlags") {
  Ee(t, e);
}
const le = /* @__PURE__ */ new Set(["mainnet-beta", "devnet", "testnet"]);
function _t() {
  if (typeof window < "u" && window.location)
    return window.location.origin;
  throw new Error(
    "serverUrl is required in SSR/Node environments. In browser environments, it defaults to window.location.origin"
  );
}
function Ct(t) {
  const e = [];
  if (t.showCard !== !1) {
    const i = t.stripePublicKey;
    (typeof i != "string" || i.trim().length === 0) && e.push({
      field: "stripePublicKey",
      message: "must be a non-empty string when card payments are enabled (showCard is not false)"
    });
  }
  let n;
  if (t.serverUrl !== void 0)
    typeof t.serverUrl != "string" || t.serverUrl.trim().length === 0 ? (e.push({
      field: "serverUrl",
      message: "must be a non-empty string when provided"
    }), n = "") : (!t.serverUrl.startsWith("http://") && !t.serverUrl.startsWith("https://") && e.push({
      field: "serverUrl",
      message: 'must start with "http://" or "https://"'
    }), n = t.serverUrl);
  else
    try {
      n = _t();
    } catch (i) {
      e.push({
        field: "serverUrl",
        message: i instanceof Error ? i.message : "failed to determine default"
      }), n = "";
    }
  le.has(t.solanaCluster) || e.push({
    field: "solanaCluster",
    message: `must be one of ${Array.from(le).join(", ")}`
  }), t.solanaEndpoint !== void 0 && (typeof t.solanaEndpoint != "string" ? e.push({
    field: "solanaEndpoint",
    message: "must be a string when provided"
  }) : t.solanaEndpoint.trim().length === 0 ? e.push({
    field: "solanaEndpoint",
    message: 'must be a non-empty string when provided (e.g., "https://api.mainnet-beta.solana.com")'
  }) : !t.solanaEndpoint.startsWith("http://") && !t.solanaEndpoint.startsWith("https://") && e.push({
    field: "solanaEndpoint",
    message: 'must start with "http://" or "https://" (e.g., "https://api.mainnet-beta.solana.com")'
  })), t.tokenMint && typeof t.tokenMint != "string" && e.push({
    field: "tokenMint",
    message: "must be a string when provided"
  }), t.locale !== void 0 && typeof t.locale != "string" && e.push({
    field: "locale",
    message: "must be a string when provided"
  });
  try {
    Tt(
      t.featureFlags,
      "config.featureFlags"
    );
  } catch (i) {
    e.push({
      field: "featureFlags",
      message: i instanceof Error ? i.message : "contains invalid values"
    });
  }
  if (e.length > 0) {
    const i = e.map((o) => `- ${o.field} ${o.message}`).join(`
`);
    throw new Error(`Invalid Cedros configuration:
${i}`);
  }
  if (t.tokenMint) {
    const i = t.dangerouslyAllowUnknownMint === !0, o = Re(t.tokenMint, "CedrosConfig.tokenMint", i);
    if (!o.isValid && o.error)
      throw new Error(o.error);
    o.warning && s().warn(o.warning);
  }
  const a = {
    ...t,
    serverUrl: n
  };
  return t.locale && (a.locale = Ie(t.locale)), a;
}
const kt = Object.freeze({
  surfaceBackground: "rgba(255, 255, 255, 0)",
  surfaceText: "#111827",
  surfaceBorder: "rgba(15, 23, 42, 0.08)",
  stripeBackground: "linear-gradient(135deg, #635bff 0%, #4f46e5 100%)",
  stripeText: "#ffffff",
  stripeShadow: "rgba(79, 70, 229, 0.25)",
  cryptoBackground: "linear-gradient(135deg, #14f195 0%, #9945ff 100%)",
  cryptoText: "#ffffff",
  cryptoShadow: "rgba(99, 102, 241, 0.25)",
  errorBackground: "#fee2e2",
  errorBorder: "#fca5a5",
  errorText: "#b91c1c",
  successBackground: "#dcfce7",
  successBorder: "#86efac",
  successText: "#166534",
  modalOverlay: "rgba(0, 0, 0, 0.5)",
  modalBackground: "#ffffff",
  modalBorder: "rgba(15, 23, 42, 0.08)",
  buttonBorderRadius: "8px",
  buttonPadding: "0.75rem 1.5rem",
  buttonFontSize: "1rem",
  buttonFontWeight: "600"
}), Rt = Object.freeze({
  surfaceBackground: "rgba(17, 24, 39, 0.6)",
  surfaceText: "#f9fafb",
  surfaceBorder: "rgba(148, 163, 184, 0.25)",
  stripeBackground: "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)",
  stripeText: "#f5f3ff",
  stripeShadow: "rgba(99, 102, 241, 0.35)",
  cryptoBackground: "linear-gradient(135deg, #1dd4a6 0%, #6d28d9 100%)",
  cryptoText: "#ecfeff",
  cryptoShadow: "rgba(75, 85, 99, 0.35)",
  errorBackground: "#7f1d1d",
  errorBorder: "#fca5a5",
  errorText: "#fecaca",
  successBackground: "#14532d",
  successBorder: "#4ade80",
  successText: "#bbf7d0",
  modalOverlay: "rgba(0, 0, 0, 0.75)",
  modalBackground: "#1f2937",
  modalBorder: "rgba(148, 163, 184, 0.25)",
  buttonBorderRadius: "8px",
  buttonPadding: "0.75rem 1.5rem",
  buttonFontSize: "1rem",
  buttonFontWeight: "600"
}), It = {
  surfaceBackground: "--cedros-surface-bg",
  surfaceText: "--cedros-surface-text",
  surfaceBorder: "--cedros-surface-border",
  stripeBackground: "--cedros-stripe-bg",
  stripeText: "--cedros-stripe-text",
  stripeShadow: "--cedros-stripe-shadow",
  cryptoBackground: "--cedros-crypto-bg",
  cryptoText: "--cedros-crypto-text",
  cryptoShadow: "--cedros-crypto-shadow",
  errorBackground: "--cedros-error-bg",
  errorBorder: "--cedros-error-border",
  errorText: "--cedros-error-text",
  successBackground: "--cedros-success-bg",
  successBorder: "--cedros-success-border",
  successText: "--cedros-success-text",
  modalOverlay: "--cedros-modal-overlay",
  modalBackground: "--cedros-modal-bg",
  modalBorder: "--cedros-modal-border",
  buttonBorderRadius: "--cedros-button-radius",
  buttonPadding: "--cedros-button-padding",
  buttonFontSize: "--cedros-button-font-size",
  buttonFontWeight: "--cedros-button-font-weight"
}, Te = fe(null);
function xt(t, e) {
  return {
    ...t === "dark" ? Rt : kt,
    ...e
  };
}
function Ot(t) {
  const e = Object.entries(t).map(([r, n]) => [
    It[r],
    n
  ]);
  return Object.fromEntries(e);
}
function Mt({
  initialMode: t = "light",
  overrides: e,
  unstyled: r = !1,
  children: n
}) {
  const [a, i] = M(t), [o, c] = M(e), u = de(e);
  O(() => {
    if (e === u.current)
      return;
    (!e || !u.current ? e !== u.current : Object.keys({ ...e, ...u.current }).some(
      (d) => e[d] !== u.current?.[d]
    )) && (u.current = e, c(e));
  }, [e]);
  const h = K(() => {
    const p = xt(a, o), d = r ? {} : Ot(p), y = r ? "" : `cedros-theme-root cedros-theme cedros-theme--${a}`;
    return {
      mode: a,
      setMode: i,
      tokens: p,
      className: y,
      style: d,
      unstyled: r
    };
  }, [a, o, r]);
  return /* @__PURE__ */ q(Te.Provider, { value: h, children: n });
}
function Wt() {
  const t = ue(Te);
  if (!t)
    throw new Error("useCedrosTheme must be used within CedrosProvider");
  return t;
}
const re = {
  getAdapters: () => [],
  cleanup: async () => {
  },
  isInitialized: () => !1,
  getId: () => "stub"
};
function Dt() {
  return typeof process < "u" && process.env.NODE_ENV === "development" ? 0 : 2;
}
const _e = fe(null);
function zt({ config: t, children: e }) {
  const r = K(() => Ct(t), [t]), n = K(
    () => Pe({
      featureFlags: r.featureFlags
    }),
    [r.featureFlags]
  ), [a, i] = M(null), [o, c] = M(re), u = de(re);
  O(() => {
    let f = !1;
    return import("./walletPool-DnhxYrUy.mjs").then(({ createWalletPool: l }) => {
      if (f) return;
      const b = l();
      u.current = b, c(b);
    }).catch((l) => {
      f || (s().error("[CedrosProvider] Wallet pool initialization failed:", l), i("Failed to initialize Cedros provider"));
    }), () => {
      f = !0;
    };
  }, []);
  const [h, p] = M(null);
  O(() => {
    let f = !1;
    return import("./solanaCheck-CB9oEUJN.mjs").then(
      ({ checkSolanaAvailability: l }) => l()
    ).then((l) => {
      f || (l.available ? p(void 0) : p(l.error || "Solana dependencies not available"));
    }).catch((l) => {
      f || (s().warn("[CedrosProvider] Solana availability check failed:", l), p("Unable to verify Solana availability"));
    }), () => {
      f = !0;
    };
  }, []), O(() => {
    const f = r.logLevel ?? Dt(), l = ke({
      level: f,
      prefix: "[CedrosPay]"
    });
    Ce(l);
  }, [r.logLevel]), O(() => () => {
    const f = u.current;
    f && f !== re && f.cleanup().catch((l) => {
      s().warn("[CedrosProvider] Wallet pool cleanup failed:", l);
    });
  }, []);
  const [d, y] = M(null);
  O(() => {
    let f = !1, l = !1;
    const b = r.stripePublicKey ?? "", _ = r.serverUrl ?? "", C = r.solanaCluster, x = r.solanaEndpoint, T = r.dangerouslyAllowUnknownMint, A = n.complianceCheck;
    return wt(b, _, C, x, T, A).then((P) => {
      if (f) {
        ce(b, _, C, x, T, A);
        return;
      }
      l = !0, y(P);
    }).catch((P) => {
      f || (s().error("[CedrosProvider] Manager initialization failed:", P), i("Failed to initialize Cedros provider"));
    }), () => {
      f = !0, l && ce(b, _, C, x, T, A);
    };
  }, [
    r.stripePublicKey,
    r.serverUrl,
    r.solanaCluster,
    r.solanaEndpoint,
    r.dangerouslyAllowUnknownMint,
    n.complianceCheck
  ]);
  const w = K(() => d ? {
    config: r,
    featureFlags: n,
    ...d,
    walletPool: o,
    solanaError: h
  } : null, [r, n, d, o, h]);
  return a ? /* @__PURE__ */ q("div", { role: "alert", children: a }) : /* @__PURE__ */ q(
    Mt,
    {
      initialMode: r.theme ?? "light",
      overrides: r.themeOverrides,
      unstyled: r.unstyled ?? !1,
      children: w ? /* @__PURE__ */ q(_e.Provider, { value: w, children: e }) : null
    }
  );
}
function qt() {
  const t = ue(_e);
  if (!t)
    throw new Error("useCedrosContext must be used within CedrosProvider");
  return t;
}
export {
  Bt as C,
  Ge as E,
  Se as F,
  k as P,
  Y as R,
  zt as a,
  R as b,
  ze as c,
  D as d,
  E as e,
  me as f,
  G as g,
  Ut as h,
  jt as i,
  Ht as j,
  $ as k,
  Wt as l,
  He as m,
  S as n,
  Ke as o,
  Pt as p,
  Pe as r,
  Q as s,
  qt as u,
  Ct as v
};
