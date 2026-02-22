import { jsx as W } from "react/jsx-runtime";
import { createContext as Ae, useContext as ne, useState as N, useRef as ge, useEffect as I, useMemo as ee } from "react";
import { g as S } from "./uuid-_z3jSatJ.mjs";
var we = "https://js.stripe.com/v3", qe = /^https:\/\/js\.stripe\.com\/v3\/?(\?.*)?$/;
var je = function() {
  for (var e = document.querySelectorAll('script[src^="'.concat(we, '"]')), r = 0; r < e.length; r++) {
    var a = e[r];
    if (qe.test(a.src))
      return a;
  }
  return null;
}, ce = function(e) {
  var r = "", a = document.createElement("script");
  a.src = "".concat(we).concat(r);
  var n = document.head || document.body;
  if (!n)
    throw new Error("Expected document.body not to be null. Stripe.js requires a <body> element.");
  return n.appendChild(a), a;
}, ze = function(e, r) {
  !e || !e._registerWrapper || e._registerWrapper({
    name: "stripe-js",
    version: "4.6.0",
    startTime: r
  });
}, H = null, z = null, Q = null, Qe = function(e) {
  return function() {
    e(new Error("Failed to load Stripe.js"));
  };
}, Ke = function(e, r) {
  return function() {
    window.Stripe ? e(window.Stripe) : r(new Error("Stripe.js not available"));
  };
}, We = function(e) {
  return H !== null ? H : (H = new Promise(function(r, a) {
    if (typeof window > "u" || typeof document > "u") {
      r(null);
      return;
    }
    if (window.Stripe) {
      r(window.Stripe);
      return;
    }
    try {
      var n = je();
      if (!(n && e)) {
        if (!n)
          n = ce(e);
        else if (n && Q !== null && z !== null) {
          var i;
          n.removeEventListener("load", Q), n.removeEventListener("error", z), (i = n.parentNode) === null || i === void 0 || i.removeChild(n), n = ce(e);
        }
      }
      Q = Ke(r, a), z = Qe(a), n.addEventListener("load", Q), n.addEventListener("error", z);
    } catch (o) {
      a(o);
      return;
    }
  }), H.catch(function(r) {
    return H = null, Promise.reject(r);
  }));
}, Ve = function(e, r, a) {
  if (e === null)
    return null;
  var n = e.apply(void 0, r);
  return ze(n, a), n;
}, L, be = !1, ve = function() {
  return L || (L = We(null).catch(function(e) {
    return L = null, Promise.reject(e);
  }), L);
};
Promise.resolve().then(function() {
  return ve();
}).catch(function(t) {
  be || console.warn(t);
});
var Ce = function() {
  for (var e = arguments.length, r = new Array(e), a = 0; a < e; a++)
    r[a] = arguments[a];
  be = !0;
  var n = Date.now();
  return ve().then(function(i) {
    return Ve(i, r, n);
  });
}, Ge = /* @__PURE__ */ ((t) => (t[t.DEBUG = 0] = "DEBUG", t[t.INFO = 1] = "INFO", t[t.WARN = 2] = "WARN", t[t.ERROR = 3] = "ERROR", t[t.SILENT = 4] = "SILENT", t))(Ge || {});
class Ee {
  config;
  constructor(e) {
    this.config = e;
  }
  /**
   * Update the log level dynamically
   */
  setLevel(e) {
    this.config.level = e;
  }
  /**
   * Get the current log level
   */
  getLevel() {
    return this.config.level;
  }
  /**
   * Debug-level logging (most verbose)
   * Use for detailed debugging information
   */
  debug(...e) {
    this.config.level <= 0 && this.log("DEBUG", console.log, e);
  }
  /**
   * Info-level logging
   * Use for general informational messages
   */
  info(...e) {
    this.config.level <= 1 && this.log("INFO", console.info, e);
  }
  /**
   * Warning-level logging
   * Use for potentially problematic situations
   */
  warn(...e) {
    this.config.level <= 2 && this.log("WARN", console.warn, e);
  }
  /**
   * Error-level logging
   * Use for error conditions
   */
  error(...e) {
    this.config.level <= 3 && this.log("ERROR", console.error, e);
  }
  /**
   * Internal log method with formatting
   */
  log(e, r, a) {
    const n = this.config.prefix ? `${this.config.prefix} ` : "", i = (/* @__PURE__ */ new Date()).toISOString();
    r(`[${i}] ${n}[${e}]`, ...a);
  }
}
const Je = () => typeof process < "u" && process.env.NODE_ENV === "development" ? 0 : 2;
let V = null;
function c() {
  return V || (V = new Ee({
    level: Je(),
    prefix: "[CedrosPay]"
  })), V;
}
function Ye(t) {
  V = t;
}
function Xe(t) {
  return new Ee(t);
}
function T(t, e) {
  return t instanceof Error ? t.message : typeof t == "string" ? t : e;
}
const Ze = {
  service_unavailable: "Service temporarily unavailable. Please try again later or contact support.",
  server_insufficient_funds: "Service temporarily unavailable. Please try again later or contact support.",
  insufficient_funds_token: "Insufficient token balance in your wallet. Please add more tokens and try again.",
  insufficient_funds_sol: "Insufficient SOL for transaction fees. Please add some SOL to your wallet and try again.",
  insufficient_amount: "Payment amount is insufficient. Please check the required amount.",
  invalid_signature: "Transaction signature is invalid. Please try again.",
  send_failed: "Failed to send transaction. Please try again or contact support.",
  timeout: "Transaction timed out. Please check the blockchain explorer or try again."
};
async function g(t, e, r = !1) {
  const a = typeof t.clone == "function", n = a ? t.clone() : void 0;
  try {
    const i = await t.json();
    if (r && i.verificationError) {
      c().debug(`Payment verification failed: ${i.verificationError.code}`);
      const o = i.verificationError.code;
      return Ze[o] || i.verificationError.message || e;
    }
    return typeof i.error == "string" ? i.error : i.error && typeof i.error == "object" && "message" in i.error ? i.error.message : e;
  } catch {
    if (n)
      try {
        const i = await n.text();
        if (i) return i;
      } catch {
      }
    if (!a && typeof t.text == "function")
      try {
        const i = await t.text();
        if (i) return i;
      } catch {
      }
    return e;
  }
}
const $e = 15e3;
async function p(t, e = {}, r = $e) {
  const a = new AbortController(), n = e.signal;
  if (n?.aborted)
    throw a.abort(), new DOMException("The operation was aborted", "AbortError");
  const i = setTimeout(() => a.abort(), r);
  let o = null;
  n && (o = () => a.abort(), n.addEventListener("abort", o));
  try {
    return await fetch(t, {
      ...e,
      signal: a.signal
    });
  } catch (s) {
    throw s instanceof Error && s.name === "AbortError" ? n?.aborted ? s : new Error(`Request timeout after ${r}ms`) : s;
  } finally {
    clearTimeout(i), n && o && n.removeEventListener("abort", o);
  }
}
function R(t) {
  const { maxRequests: e, windowMs: r } = t;
  let a = e, n = Date.now();
  const i = e / r;
  function o() {
    const u = Date.now(), y = u - n;
    if (y > 0) {
      const f = y * i;
      a = Math.min(e, a + f), n = u;
    }
  }
  function s() {
    return o(), a >= 1 ? (a -= 1, !0) : !1;
  }
  function l() {
    return o(), Math.floor(a);
  }
  function d() {
    if (o(), a >= 1)
      return 0;
    const y = (1 - a) / i;
    return Math.ceil(y);
  }
  function m() {
    a = e, n = Date.now();
  }
  return {
    tryConsume: s,
    getAvailableTokens: l,
    getTimeUntilRefill: d,
    reset: m
  };
}
const M = {
  /** 10 requests per minute - recommended for payment requests */
  PAYMENT: { maxRequests: 10, windowMs: 6e4 },
  /** 30 requests per minute - for quote fetching */
  QUOTE: { maxRequests: 30, windowMs: 6e4 },
  /** 5 requests per minute - strict limit for sensitive operations */
  STRICT: { maxRequests: 5, windowMs: 6e4 },
  /** 100 requests per minute - permissive for UI interactions */
  PERMISSIVE: { maxRequests: 100, windowMs: 6e4 }
};
var et = /* @__PURE__ */ ((t) => (t.CLOSED = "CLOSED", t.OPEN = "OPEN", t.HALF_OPEN = "HALF_OPEN", t))(et || {});
class A extends Error {
  constructor(e) {
    super(e), this.name = "CircuitBreakerOpenError";
  }
}
function j(t) {
  const { failureThreshold: e, timeout: r, failureWindow: a = r * 2, name: n = "circuit-breaker" } = t;
  let i = "CLOSED", o = [], s = 0, l = 0, d = null, m = null, u = null, y = !1;
  function f() {
    const _ = Date.now() - a;
    o = o.filter((P) => P > _);
  }
  function h() {
    i === "OPEN" && u !== null && Date.now() >= u && (c().debug(`[CircuitBreaker:${n}] Transitioning OPEN → HALF_OPEN (timeout expired)`), i = "HALF_OPEN", u = null);
  }
  function w() {
    m = Date.now(), s++, i === "HALF_OPEN" ? (c().debug(`[CircuitBreaker:${n}] Success in HALF_OPEN → CLOSED`), i = "CLOSED", o = []) : i === "CLOSED" && (o = []);
  }
  function C(_) {
    const P = Date.now();
    d = P, o.push(P), f();
    const Y = o.length;
    c().warn(`[CircuitBreaker:${n}] Failure recorded (${Y}/${e}):`, _.message), i === "HALF_OPEN" ? (c().warn(`[CircuitBreaker:${n}] Failed in HALF_OPEN → OPEN`), i = "OPEN", u = P + r) : i === "CLOSED" && Y >= e && (c().error(`[CircuitBreaker:${n}] Failure threshold reached (${Y}) → OPEN`), i = "OPEN", u = P + r);
  }
  async function x(_) {
    if (h(), i === "OPEN") {
      l++;
      const P = u ? Math.ceil((u - Date.now()) / 1e3) : 0;
      throw new A(
        `Circuit breaker is OPEN. Service is unavailable. Retry in ${P}s.`
      );
    }
    if (i === "HALF_OPEN" && y)
      throw l++, new A(
        "Circuit breaker is HALF_OPEN. A probe request is already in progress."
      );
    i === "HALF_OPEN" && (y = !0);
    try {
      const P = await _();
      return w(), P;
    } catch (P) {
      throw C(P instanceof Error ? P : new Error(String(P))), P;
    } finally {
      y && (y = !1);
    }
  }
  function B() {
    return h(), i;
  }
  function k() {
    return h(), f(), {
      state: i,
      failures: o.length,
      successes: s,
      rejections: l,
      lastFailureTime: d,
      lastSuccessTime: m
    };
  }
  function D() {
    c().debug(`[CircuitBreaker:${n}] Manual reset → CLOSED`), i = "CLOSED", o = [], s = 0, l = 0, d = null, m = null, u = null;
  }
  function Le() {
    c().warn(`[CircuitBreaker:${n}] Manual trip → OPEN`), i = "OPEN", u = Date.now() + r;
  }
  return {
    execute: x,
    getState: B,
    getStats: k,
    reset: D,
    trip: Le
  };
}
const zt = {
  /** Strict: Opens quickly (3 failures), long timeout (60s) */
  STRICT: { failureThreshold: 3, timeout: 6e4 },
  /** Standard: Balanced settings (5 failures, 30s timeout) */
  STANDARD: { failureThreshold: 5, timeout: 3e4 },
  /** Lenient: Tolerates more failures (10 failures, 15s timeout) */
  LENIENT: { failureThreshold: 10, timeout: 15e3 }
}, tt = {
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
function rt(t) {
  return tt[t] || {
    message: "An unexpected error occurred",
    action: "Please try again or contact support if this continues.",
    technicalHint: `Unknown error code: ${t}`
  };
}
class O extends Error {
  /** Machine-readable error code enum */
  code;
  /** Whether this error can be safely retried */
  retryable;
  /** Additional error context */
  details;
  /** HTTP status code (if from API response) */
  httpStatus;
  constructor(e, r, a = !1, n, i) {
    super(r), this.name = "PaymentError", this.code = e, this.retryable = a, this.details = n, this.httpStatus = i, Object.setPrototypeOf(this, O.prototype);
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
    return rt(this.code);
  }
  /**
   * Create PaymentError from API error response
   *
   * If `retryable` field is not present (Rust server), infers retryability
   * from error codes using ERROR_CATEGORIES.RETRYABLE.
   */
  static fromErrorResponse(e, r) {
    const a = e.error.retryable ?? at.RETRYABLE.includes(e.error.code);
    return new O(
      e.error.code,
      e.error.message,
      a,
      e.error.details,
      r
    );
  }
  /**
   * Create PaymentError from unknown error
   * Useful for catch blocks where error type is unknown
   */
  static fromUnknown(e) {
    return e instanceof O ? e : e instanceof Error ? new O(
      "internal_error",
      e.message,
      !1
    ) : new O(
      "internal_error",
      String(e),
      !1
    );
  }
}
const at = {
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
function nt(t, e) {
  if (t instanceof O && t.httpStatus != null) {
    const a = t.httpStatus;
    return a === 429 || a >= 500 && a < 600;
  }
  const r = t.message.toLowerCase();
  return !!(r.includes("network") || r.includes("timeout") || r.includes("fetch failed") || r.includes("econnrefused"));
}
function it(t, e, r, a, n) {
  const i = e * Math.pow(r, t), o = Math.min(i, a);
  return Math.floor(n ? o * 0.5 + Math.random() * o * 0.5 : o);
}
function ot(t) {
  return new Promise((e) => setTimeout(e, t));
}
async function b(t, e = {}) {
  const {
    maxRetries: r = 3,
    initialDelayMs: a = 1e3,
    backoffFactor: n = 2,
    maxDelayMs: i = 3e4,
    jitter: o = !0,
    shouldRetry: s = nt,
    name: l = "retry"
  } = e;
  let d = null, m = 0;
  for (let u = 0; u <= r; u++)
    try {
      const y = await t();
      return u > 0 && c().debug(
        `[Retry:${l}] Succeeded on attempt ${u + 1}/${r + 1} after ${m}ms`
      ), y;
    } catch (y) {
      d = y instanceof Error ? y : new Error(String(y));
      const f = u === r, h = s(d, u);
      if (f || !h)
        throw c().warn(
          `[Retry:${l}] Failed on attempt ${u + 1}/${r + 1}. ${f ? "No more retries." : "Error not retryable."}`
        ), d;
      const w = it(u, a, n, i, o);
      m += w, c().warn(
        `[Retry:${l}] Attempt ${u + 1}/${r + 1} failed: ${d.message}. Retrying in ${w}ms...`
      ), await ot(w);
    }
  throw d || new Error("Retry failed with no error");
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
  }
};
class st {
  stripe = null;
  initPromise = null;
  publicKey;
  routeDiscovery;
  rateLimiter = R(M.PAYMENT);
  circuitBreaker = j({
    failureThreshold: 5,
    timeout: 1e4,
    // 10 seconds for faster recovery in payment flows
    name: "stripe-manager"
  });
  constructor(e, r) {
    this.publicKey = e, this.routeDiscovery = r;
  }
  /**
   * Initialize Stripe.js library
   *
   * Concurrent callers share a single loadStripe() call via a cached promise.
   */
  async initialize() {
    this.stripe || (this.initPromise || (this.initPromise = (async () => {
      try {
        if (this.stripe = await Ce(this.publicKey), !this.stripe) throw new Error("Failed to initialize Stripe");
      } catch (e) {
        throw this.initPromise = null, e;
      }
    })()), await this.initPromise);
  }
  /**
   * Create a Stripe checkout session
   */
  async createSession(e) {
    if (!this.rateLimiter.tryConsume())
      throw new Error("Rate limit exceeded for Stripe session creation. Please try again later.");
    const r = S();
    try {
      return await this.circuitBreaker.execute(async () => await b(
        async () => {
          const a = await this.routeDiscovery.buildUrl("/paywall/v1/stripe-session");
          c().debug("[StripeManager] Creating session", {
            resource: e.resource,
            hasCouponCode: !!e.couponCode,
            hasMetadata: !!(e.metadata && Object.keys(e.metadata).length),
            metadataKeyCount: e.metadata ? Object.keys(e.metadata).length : 0
          });
          const n = await p(a, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Idempotency-Key": r
            },
            body: JSON.stringify(e)
          });
          if (!n.ok) {
            const i = await g(n, "Failed to create Stripe session");
            throw new Error(i);
          }
          return await n.json();
        },
        { ...E.STANDARD, name: "stripe-create-session" }
      ));
    } catch (a) {
      throw a instanceof A ? (c().error("[StripeManager] Circuit breaker is OPEN - Stripe service unavailable"), new Error("Stripe payment service is temporarily unavailable. Please try again in a few moments.")) : a;
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
    } : { success: !0 };
  }
  /**
   * Handle complete payment flow: create session and redirect
   */
  async processPayment(e) {
    try {
      const r = await this.createSession(e);
      return await this.redirectToCheckout(r.sessionId);
    } catch (r) {
      return {
        success: !1,
        error: T(r, "Unknown error")
      };
    }
  }
  /**
   * Create a Stripe cart checkout session for multiple items
   */
  async processCartCheckout(e) {
    const {
      items: r,
      successUrl: a,
      cancelUrl: n,
      metadata: i,
      customerEmail: o,
      customerName: s,
      customerPhone: l,
      shippingAddress: d,
      billingAddress: m,
      couponCode: u,
      tipAmount: y,
      shippingMethodId: f,
      paymentMethodId: h
    } = e;
    if (!this.rateLimiter.tryConsume())
      return {
        success: !1,
        error: "Rate limit exceeded for cart checkout. Please try again later."
      };
    const w = S();
    try {
      const C = await this.circuitBreaker.execute(async () => await b(
        async () => {
          const x = await this.routeDiscovery.buildUrl("/paywall/v1/cart/checkout"), k = await p(x, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Idempotency-Key": w
            },
            body: JSON.stringify({
              items: r,
              successUrl: a,
              cancelUrl: n,
              metadata: i,
              customerEmail: o,
              customerName: s,
              customerPhone: l,
              shippingAddress: d,
              billingAddress: m,
              coupon: u,
              // New Rust server field
              couponCode: u,
              // Legacy Go server field (backwards compat)
              tipAmount: y,
              shippingMethodId: f,
              paymentMethodId: h
            })
          });
          if (!k.ok) {
            const D = await g(k, "Failed to create cart checkout session");
            throw new Error(D);
          }
          return await k.json();
        },
        { ...E.STANDARD, name: "stripe-cart-checkout" }
      ));
      return await this.redirectToCheckout(C.sessionId);
    } catch (C) {
      return C instanceof A ? {
        success: !1,
        error: "Stripe payment service is temporarily unavailable. Please try again in a few moments."
      } : {
        success: !1,
        error: T(C, "Cart checkout failed")
      };
    }
  }
}
const Pe = "3.7.8", ct = Pe, F = typeof Buffer == "function", le = typeof TextDecoder == "function" ? new TextDecoder() : void 0, ue = typeof TextEncoder == "function" ? new TextEncoder() : void 0, lt = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=", q = Array.prototype.slice.call(lt), K = ((t) => {
  let e = {};
  return t.forEach((r, a) => e[r] = a), e;
})(q), ut = /^(?:[A-Za-z\d+\/]{4})*?(?:[A-Za-z\d+\/]{2}(?:==)?|[A-Za-z\d+\/]{3}=?)?$/, v = String.fromCharCode.bind(String), de = typeof Uint8Array.from == "function" ? Uint8Array.from.bind(Uint8Array) : (t) => new Uint8Array(Array.prototype.slice.call(t, 0)), Se = (t) => t.replace(/=/g, "").replace(/[+\/]/g, (e) => e == "+" ? "-" : "_"), xe = (t) => t.replace(/[^A-Za-z0-9\+\/]/g, ""), ke = (t) => {
  let e, r, a, n, i = "";
  const o = t.length % 3;
  for (let s = 0; s < t.length; ) {
    if ((r = t.charCodeAt(s++)) > 255 || (a = t.charCodeAt(s++)) > 255 || (n = t.charCodeAt(s++)) > 255)
      throw new TypeError("invalid character found");
    e = r << 16 | a << 8 | n, i += q[e >> 18 & 63] + q[e >> 12 & 63] + q[e >> 6 & 63] + q[e & 63];
  }
  return o ? i.slice(0, o - 3) + "===".substring(o) : i;
}, ie = typeof btoa == "function" ? (t) => btoa(t) : F ? (t) => Buffer.from(t, "binary").toString("base64") : ke, te = F ? (t) => Buffer.from(t).toString("base64") : (t) => {
  let r = [];
  for (let a = 0, n = t.length; a < n; a += 4096)
    r.push(v.apply(null, t.subarray(a, a + 4096)));
  return ie(r.join(""));
}, G = (t, e = !1) => e ? Se(te(t)) : te(t), dt = (t) => {
  if (t.length < 2) {
    var e = t.charCodeAt(0);
    return e < 128 ? t : e < 2048 ? v(192 | e >>> 6) + v(128 | e & 63) : v(224 | e >>> 12 & 15) + v(128 | e >>> 6 & 63) + v(128 | e & 63);
  } else {
    var e = 65536 + (t.charCodeAt(0) - 55296) * 1024 + (t.charCodeAt(1) - 56320);
    return v(240 | e >>> 18 & 7) + v(128 | e >>> 12 & 63) + v(128 | e >>> 6 & 63) + v(128 | e & 63);
  }
}, ft = /[\uD800-\uDBFF][\uDC00-\uDFFFF]|[^\x00-\x7F]/g, Te = (t) => t.replace(ft, dt), fe = F ? (t) => Buffer.from(t, "utf8").toString("base64") : ue ? (t) => te(ue.encode(t)) : (t) => ie(Te(t)), U = (t, e = !1) => e ? Se(fe(t)) : fe(t), he = (t) => U(t, !0), ht = /[\xC0-\xDF][\x80-\xBF]|[\xE0-\xEF][\x80-\xBF]{2}|[\xF0-\xF7][\x80-\xBF]{3}/g, mt = (t) => {
  switch (t.length) {
    case 4:
      var e = (7 & t.charCodeAt(0)) << 18 | (63 & t.charCodeAt(1)) << 12 | (63 & t.charCodeAt(2)) << 6 | 63 & t.charCodeAt(3), r = e - 65536;
      return v((r >>> 10) + 55296) + v((r & 1023) + 56320);
    case 3:
      return v((15 & t.charCodeAt(0)) << 12 | (63 & t.charCodeAt(1)) << 6 | 63 & t.charCodeAt(2));
    default:
      return v((31 & t.charCodeAt(0)) << 6 | 63 & t.charCodeAt(1));
  }
}, Re = (t) => t.replace(ht, mt), Me = (t) => {
  if (t = t.replace(/\s+/g, ""), !ut.test(t))
    throw new TypeError("malformed base64.");
  t += "==".slice(2 - (t.length & 3));
  let e, r, a, n = [];
  for (let i = 0; i < t.length; )
    e = K[t.charAt(i++)] << 18 | K[t.charAt(i++)] << 12 | (r = K[t.charAt(i++)]) << 6 | (a = K[t.charAt(i++)]), r === 64 ? n.push(v(e >> 16 & 255)) : a === 64 ? n.push(v(e >> 16 & 255, e >> 8 & 255)) : n.push(v(e >> 16 & 255, e >> 8 & 255, e & 255));
  return n.join("");
}, oe = typeof atob == "function" ? (t) => atob(xe(t)) : F ? (t) => Buffer.from(t, "base64").toString("binary") : Me, De = F ? (t) => de(Buffer.from(t, "base64")) : (t) => de(oe(t).split("").map((e) => e.charCodeAt(0))), Oe = (t) => De(Be(t)), yt = F ? (t) => Buffer.from(t, "base64").toString("utf8") : le ? (t) => le.decode(De(t)) : (t) => Re(oe(t)), Be = (t) => xe(t.replace(/[-_]/g, (e) => e == "-" ? "+" : "/")), re = (t) => yt(Be(t)), pt = (t) => {
  if (typeof t != "string")
    return !1;
  const e = t.replace(/\s+/g, "").replace(/={0,2}$/, "");
  return !/[^\s0-9a-zA-Z\+/]/.test(e) || !/[^\s0-9a-zA-Z\-_]/.test(e);
}, _e = (t) => ({
  value: t,
  enumerable: !1,
  writable: !0,
  configurable: !0
}), Ie = function() {
  const t = (e, r) => Object.defineProperty(String.prototype, e, _e(r));
  t("fromBase64", function() {
    return re(this);
  }), t("toBase64", function(e) {
    return U(this, e);
  }), t("toBase64URI", function() {
    return U(this, !0);
  }), t("toBase64URL", function() {
    return U(this, !0);
  }), t("toUint8Array", function() {
    return Oe(this);
  });
}, Ne = function() {
  const t = (e, r) => Object.defineProperty(Uint8Array.prototype, e, _e(r));
  t("toBase64", function(e) {
    return G(this, e);
  }), t("toBase64URI", function() {
    return G(this, !0);
  }), t("toBase64URL", function() {
    return G(this, !0);
  });
}, At = () => {
  Ie(), Ne();
}, me = {
  version: Pe,
  VERSION: ct,
  atob: oe,
  atobPolyfill: Me,
  btoa: ie,
  btoaPolyfill: ke,
  fromBase64: re,
  toBase64: U,
  encode: U,
  encodeURI: he,
  encodeURL: he,
  utob: Te,
  btou: Re,
  decode: re,
  isValid: pt,
  fromUint8Array: G,
  toUint8Array: Oe,
  extendString: Ie,
  extendUint8Array: Ne,
  extendBuiltins: At
};
class gt {
  routeDiscovery;
  quoteRateLimiter = R(M.QUOTE);
  verifyRateLimiter = R(M.PAYMENT);
  circuitBreaker = j({
    failureThreshold: 5,
    timeout: 1e4,
    // 10 seconds for faster recovery in payment flows
    name: "x402-manager"
  });
  constructor(e) {
    this.routeDiscovery = e;
  }
  /**
   * Request a protected resource and get x402 requirement
   * SECURITY: Resource ID and coupon codes sent in request body to prevent leakage
   * Prevents exposure of product IDs, SKUs, and business-sensitive identifiers in logs
   */
  async requestQuote(e) {
    const { resource: r, couponCode: a } = e;
    if (!this.quoteRateLimiter.tryConsume())
      throw new Error("Rate limit exceeded for quote requests. Please try again later.");
    try {
      return await this.circuitBreaker.execute(async () => await b(
        async () => {
          const n = "/paywall/v1/quote";
          c().debug(
            "[X402Manager] Requesting quote",
            a ? "with coupon" : "without coupon"
          );
          const i = await this.routeDiscovery.buildUrl(n), o = await p(i, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              resource: r,
              couponCode: a || null
            })
          });
          if (o.status !== 402)
            throw new Error(`Expected 402 status, got ${o.status}`);
          const s = await o.json();
          if (s.crypto) {
            const l = s.crypto;
            if (!this.validateRequirement(l))
              throw new Error("Invalid x402 requirement received from server: missing required fields");
            return l;
          } else if (s.accepts && s.accepts.length > 0) {
            const l = s.accepts[0];
            if (!this.validateRequirement(l))
              throw new Error("Invalid x402 requirement received from server: missing required fields");
            return l;
          } else
            throw new Error("Invalid x402 response: missing crypto or accepts field");
        },
        { ...E.QUICK, name: "x402-quote" }
      ));
    } catch (n) {
      throw n instanceof A ? (c().error("[X402Manager] Circuit breaker is OPEN - x402 service unavailable"), new Error("Payment service is temporarily unavailable. Please try again in a few moments.")) : n;
    }
  }
  /**
   * Request a cart quote for multiple items
   */
  async requestCartQuote(e) {
    const { items: r, metadata: a, couponCode: n } = e;
    if (!this.quoteRateLimiter.tryConsume())
      throw new Error("Rate limit exceeded for cart quote requests. Please try again later.");
    const i = S();
    try {
      return await this.circuitBreaker.execute(async () => await b(
        async () => {
          const o = await this.routeDiscovery.buildUrl("/paywall/v1/cart/quote"), l = await p(o, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Idempotency-Key": i
            },
            body: JSON.stringify({
              items: r,
              metadata: a,
              coupon: n,
              // New Rust server field
              couponCode: n
              // Legacy Go server field (backwards compat)
            })
          });
          if (l.status !== 402 && !l.ok) {
            const m = await g(l, "Failed to get cart quote");
            throw new Error(m);
          }
          const d = await l.json();
          if (!d.cartId || !d.quote)
            throw new Error("Invalid cart quote response: missing cartId or quote");
          if (d.quote.crypto && !this.validateRequirement(d.quote.crypto))
            throw new Error("Invalid x402 cart quote: missing required fields in crypto quote");
          return d;
        },
        { ...E.QUICK, name: "x402-cart-quote" }
      ));
    } catch (o) {
      throw o instanceof A ? (c().error("[X402Manager] Circuit breaker is OPEN - cart quote service unavailable"), new Error("Payment service is temporarily unavailable. Please try again in a few moments.")) : o;
    }
  }
  /**
   * Build X-PAYMENT header from payment payload (base64 encoded)
   */
  buildPaymentHeader(e) {
    const r = JSON.stringify(e);
    return me.encode(r);
  }
  /**
   * Parse X-PAYMENT-RESPONSE header (base64 encoded settlement response)
   */
  parseSettlementResponse(e) {
    const r = e.headers.get("X-PAYMENT-RESPONSE");
    if (!r)
      return null;
    try {
      const a = me.decode(r), n = JSON.parse(a);
      return typeof n.success != "boolean" ? (c().error("Invalid settlement response: missing success field"), null) : n;
    } catch (a) {
      return c().error("Failed to parse settlement response:", a), null;
    }
  }
  /**
   * Retry request with payment proof
   * SECURITY: Coupon and metadata sent in X-PAYMENT header payload, NOT query strings
   */
  async submitPayment(e) {
    const {
      resource: r,
      payload: a,
      couponCode: n,
      metadata: i,
      resourceType: o = "regular"
    } = e;
    if (!this.verifyRateLimiter.tryConsume())
      return {
        success: !1,
        error: "Rate limit exceeded for payment verification. Please try again later."
      };
    const s = S();
    try {
      return await this.circuitBreaker.execute(async () => await b(
        async () => {
          const d = {
            ...a,
            payload: {
              ...a.payload,
              resource: r,
              resourceType: o,
              metadata: {
                ...a.payload.metadata || {},
                // Preserve existing metadata
                ...i || {},
                // Layer in new metadata
                ...n ? { couponCode: n } : {}
                // Add coupon if present
              }
            }
          }, m = this.buildPaymentHeader(d), u = "/paywall/v1/verify";
          c().debug("[X402Manager] Submitting payment", {
            resourceType: o,
            hasCoupon: !!n,
            hasMetadata: !!i
          });
          const y = await this.routeDiscovery.buildUrl(u), f = await p(y, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-PAYMENT": m,
              "Idempotency-Key": s
            }
          });
          if (f.ok) {
            const { settlement: w, transactionId: C } = await this.handlePaymentVerification(
              f,
              a.payload.signature
            );
            return {
              success: !0,
              transactionId: C,
              settlement: w || void 0
            };
          }
          return {
            success: !1,
            error: await g(f, "Payment verification failed", !0)
          };
        },
        { maxRetries: 0, initialDelayMs: 0, backoffFactor: 1, maxDelayMs: 0, name: "x402-verify" }
      ));
    } catch (l) {
      return l instanceof A ? {
        success: !1,
        error: "Payment verification service is temporarily unavailable. Please try again in a few moments."
      } : {
        success: !1,
        error: T(l, "Unknown error")
      };
    }
  }
  /**
   * Build a complete gasless transaction on the backend
   * Returns an unsigned transaction with all instructions (compute budget, transfer, memo)
   */
  async buildGaslessTransaction(e) {
    const { resourceId: r, userWallet: a, feePayer: n, couponCode: i } = e;
    if (!this.quoteRateLimiter.tryConsume())
      throw new Error("Rate limit exceeded for gasless transaction requests. Please try again later.");
    try {
      return await this.circuitBreaker.execute(async () => await b(
        async () => {
          const o = await this.routeDiscovery.buildUrl(
            "/paywall/v1/gasless-transaction"
          ), s = await p(o, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              resourceId: r,
              userWallet: a,
              feePayer: n,
              couponCode: i
            })
          });
          if (!s.ok) {
            const l = await g(s, "Failed to build gasless transaction");
            throw new Error(l);
          }
          return await s.json();
        },
        { ...E.QUICK, name: "x402-gasless-build" }
      ));
    } catch (o) {
      throw o instanceof A ? (c().error("[X402Manager] Circuit breaker is OPEN - gasless transaction service unavailable"), new Error("Gasless transaction service is temporarily unavailable. Please try again in a few moments.")) : o;
    }
  }
  /**
   * Submit gasless partial transaction for co-signing
   * Sends the partially-signed transaction in X-Payment header for backend co-signing
   * SECURITY: Coupon and metadata sent in X-PAYMENT header payload, NOT query strings
   */
  async submitGaslessTransaction(e) {
    const {
      resource: r,
      partialTx: a,
      couponCode: n,
      metadata: i,
      resourceType: o = "regular",
      requirement: s
    } = e;
    if (!this.verifyRateLimiter.tryConsume())
      return {
        success: !1,
        error: "Rate limit exceeded for gasless transaction verification. Please try again later."
      };
    const l = S();
    try {
      return await this.circuitBreaker.execute(async () => await b(
        async () => {
          const m = {
            x402Version: 0,
            scheme: s?.scheme || "solana-spl-transfer",
            network: s?.network || "mainnet-beta",
            payload: {
              signature: "",
              // Placeholder - backend will finalize after co-signing
              transaction: a,
              feePayer: s?.extra?.feePayer || "",
              resource: r,
              resourceType: o,
              metadata: {
                ...i || {},
                ...n ? { couponCode: n } : {}
              }
            }
          }, u = this.buildPaymentHeader(m), f = await this.routeDiscovery.buildUrl("/paywall/v1/verify"), h = await p(f, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-PAYMENT": u,
              "Idempotency-Key": l
            }
          });
          if (h.ok) {
            const { settlement: C, transactionId: x } = await this.handlePaymentVerification(
              h,
              "gasless-tx"
            );
            return {
              success: !0,
              transactionId: x,
              settlement: C || void 0
            };
          }
          return {
            success: !1,
            error: await g(h, "Gasless transaction failed", !0)
          };
        },
        { maxRetries: 0, initialDelayMs: 0, backoffFactor: 1, maxDelayMs: 0, name: "x402-gasless-verify" }
      ));
    } catch (d) {
      return d instanceof A ? {
        success: !1,
        error: "Gasless transaction verification service is temporarily unavailable. Please try again in a few moments."
      } : {
        success: !1,
        error: T(d, "Unknown error")
      };
    }
  }
  /**
   * Handle payment verification response (shared logic for both submitPayment and submitGaslessTransaction)
   * Parses settlement header and extracts transaction ID from response body
   * @param response - HTTP response from payment verification endpoint
   * @param defaultTxId - Fallback transaction ID if JSON parsing fails
   * @returns Settlement data and transaction ID
   */
  async handlePaymentVerification(e, r) {
    const a = this.parseSettlementResponse(e), n = e.headers.get("Content-Type") || "";
    let i = r;
    if (n.includes("application/json"))
      try {
        i = (await e.json()).signature || r;
      } catch (o) {
        c().warn("Failed to parse JSON response body:", o);
      }
    return { settlement: a, transactionId: i };
  }
  /**
   * Validate x402 requirement structure
   */
  validateRequirement(e) {
    return !!(e.scheme && e.network && e.maxAmountRequired && e.resource && e.payTo && e.asset && e.maxTimeoutSeconds > 0);
  }
}
class wt {
  stripe = null;
  initPromise = null;
  publicKey;
  routeDiscovery;
  // Separate rate limiters for different operation types
  sessionRateLimiter = R(M.PAYMENT);
  statusRateLimiter = R(M.QUOTE);
  circuitBreaker = j({
    failureThreshold: 5,
    timeout: 1e4,
    // 10 seconds for faster recovery
    name: "subscription-manager"
  });
  constructor(e, r) {
    this.publicKey = e, this.routeDiscovery = r;
  }
  /**
   * Initialize Stripe.js library
   *
   * Concurrent callers share a single loadStripe() call via a cached promise.
   */
  async initialize() {
    this.stripe || (this.initPromise || (this.initPromise = (async () => {
      if (this.stripe = await Ce(this.publicKey), !this.stripe) throw new Error("Failed to initialize Stripe");
    })()), await this.initPromise);
  }
  /** Internal helper: execute with rate limiting, circuit breaker, and retry */
  async executeWithResilience(e, r, a, n) {
    if (!e.tryConsume())
      throw new Error("Rate limit exceeded. Please try again later.");
    try {
      return await this.circuitBreaker.execute(
        () => b(r, { ...E.STANDARD, name: a })
      );
    } catch (i) {
      throw i instanceof A ? (c().error(`[SubscriptionManager] Circuit breaker OPEN for ${n}`), new Error("Service temporarily unavailable. Please try again in a few moments.")) : i;
    }
  }
  /**
   * Create a Stripe subscription checkout session
   */
  async createSubscriptionSession(e) {
    if (!this.sessionRateLimiter.tryConsume())
      throw new Error("Rate limit exceeded for subscription session creation. Please try again later.");
    const r = S();
    try {
      return await this.circuitBreaker.execute(async () => await b(
        async () => {
          const a = await this.routeDiscovery.buildUrl("/paywall/v1/subscription/stripe-session");
          c().debug("[SubscriptionManager] Creating subscription session:", {
            resource: e.resource,
            interval: e.interval,
            trialDays: e.trialDays
          });
          const n = await p(a, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Idempotency-Key": r
            },
            body: JSON.stringify(e)
          });
          if (!n.ok) {
            const i = await g(
              n,
              "Failed to create subscription session"
            );
            throw new Error(i);
          }
          return await n.json();
        },
        { ...E.STANDARD, name: "subscription-create-session" }
      ));
    } catch (a) {
      throw a instanceof A ? (c().error("[SubscriptionManager] Circuit breaker is OPEN - service unavailable"), new Error(
        "Subscription service is temporarily unavailable. Please try again in a few moments."
      )) : a;
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
      const r = await this.createSubscriptionSession(e);
      return await this.redirectToCheckout(r.sessionId);
    } catch (r) {
      return {
        success: !1,
        error: T(r, "Subscription failed")
      };
    }
  }
  /**
   * Check subscription status (for x402 gating)
   */
  async checkSubscriptionStatus(e) {
    if (!this.statusRateLimiter.tryConsume())
      throw new Error("Rate limit exceeded for subscription status check. Please try again later.");
    try {
      return await this.circuitBreaker.execute(async () => await b(
        async () => {
          const r = new URLSearchParams({
            resource: e.resource,
            userId: e.userId
          }), a = await this.routeDiscovery.buildUrl(
            `/paywall/v1/subscription/status?${r.toString()}`
          );
          c().debug("[SubscriptionManager] Checking subscription status:", e);
          const n = await p(a, {
            method: "GET",
            headers: {
              "Content-Type": "application/json"
            }
          });
          if (!n.ok) {
            const i = await g(
              n,
              "Failed to check subscription status"
            );
            throw new Error(i);
          }
          return await n.json();
        },
        { ...E.STANDARD, name: "subscription-status-check" }
      ));
    } catch (r) {
      throw r instanceof A ? (c().error("[SubscriptionManager] Circuit breaker is OPEN for status check"), new Error(
        "Subscription status service is temporarily unavailable. Please try again in a few moments."
      )) : r;
    }
  }
  /**
   * Request a subscription quote for x402 crypto payment
   */
  async requestSubscriptionQuote(e, r, a) {
    if (!this.statusRateLimiter.tryConsume())
      throw new Error("Rate limit exceeded for subscription quote. Please try again later.");
    try {
      return await this.circuitBreaker.execute(async () => await b(
        async () => {
          const n = await this.routeDiscovery.buildUrl("/paywall/v1/subscription/quote"), i = {
            resource: e,
            interval: r,
            couponCode: a?.couponCode,
            intervalDays: a?.intervalDays
          };
          c().debug("[SubscriptionManager] Requesting subscription quote:", i);
          const o = await p(n, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(i)
          });
          if (o.status !== 402 && !o.ok) {
            const s = await g(
              o,
              "Failed to get subscription quote"
            );
            throw new Error(s);
          }
          return await o.json();
        },
        { ...E.STANDARD, name: "subscription-quote" }
      ));
    } catch (n) {
      throw n instanceof A ? (c().error("[SubscriptionManager] Circuit breaker is OPEN for quote"), new Error(
        "Subscription quote service is temporarily unavailable. Please try again in a few moments."
      )) : n;
    }
  }
  /** Activate x402 subscription after payment verification */
  async activateX402Subscription(e) {
    return this.executeWithResilience(
      this.sessionRateLimiter,
      async () => {
        const r = await this.routeDiscovery.buildUrl("/paywall/v1/subscription/x402/activate");
        c().debug("[SubscriptionManager] Activating x402 subscription:", e);
        const a = await p(r, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(e)
        });
        if (!a.ok) throw new Error(await g(a, "Failed to activate"));
        return await a.json();
      },
      "subscription-activate",
      "activation"
    );
  }
}
class bt {
  routeDiscovery;
  rateLimiter = R(M.PAYMENT);
  queryRateLimiter = R(M.QUOTE);
  circuitBreaker = j({
    failureThreshold: 5,
    timeout: 1e4,
    name: "subscription-change-manager"
  });
  constructor(e) {
    this.routeDiscovery = e;
  }
  /** Internal helper: execute with rate limiting, circuit breaker, and retry */
  async executeWithResilience(e, r, a, n) {
    if (!e.tryConsume())
      throw new Error("Rate limit exceeded. Please try again later.");
    try {
      return await this.circuitBreaker.execute(
        () => b(r, { ...E.STANDARD, name: a })
      );
    } catch (i) {
      throw i instanceof A ? (c().error(`[SubscriptionChangeManager] Circuit breaker OPEN for ${n}`), new Error("Service temporarily unavailable. Please try again in a few moments.")) : i;
    }
  }
  /** Change subscription plan (upgrade or downgrade) */
  async changeSubscription(e) {
    const r = S();
    return this.executeWithResilience(
      this.rateLimiter,
      async () => {
        const a = await this.routeDiscovery.buildUrl("/paywall/v1/subscription/change");
        c().debug("[SubscriptionChangeManager] Changing subscription:", e);
        const n = await p(a, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Idempotency-Key": r },
          body: JSON.stringify(e)
        });
        if (!n.ok)
          throw new Error(await g(n, "Failed to change subscription"));
        return await n.json();
      },
      "subscription-change",
      "plan change"
    );
  }
  /** Preview subscription change (get proration details) */
  async previewChange(e) {
    return this.executeWithResilience(
      this.queryRateLimiter,
      async () => {
        const r = await this.routeDiscovery.buildUrl("/paywall/v1/subscription/change/preview");
        c().debug("[SubscriptionChangeManager] Previewing subscription change:", e);
        const a = await p(r, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(e)
        });
        if (!a.ok)
          throw new Error(await g(a, "Failed to preview change"));
        return await a.json();
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
        const a = new URLSearchParams({ resource: e, userId: r }), n = await this.routeDiscovery.buildUrl(`/paywall/v1/subscription/details?${a}`);
        c().debug("[SubscriptionChangeManager] Getting subscription details:", { resource: e, userId: r });
        const i = await p(n, {
          method: "GET",
          headers: { "Content-Type": "application/json" }
        });
        if (!i.ok)
          throw new Error(await g(i, "Failed to get subscription details"));
        return await i.json();
      },
      "subscription-details",
      "details"
    );
  }
  /** Cancel a subscription */
  async cancel(e) {
    return this.executeWithResilience(
      this.rateLimiter,
      async () => {
        const r = await this.routeDiscovery.buildUrl("/paywall/v1/subscription/cancel");
        c().debug("[SubscriptionChangeManager] Canceling subscription:", e);
        const a = await p(r, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(e)
        });
        if (!a.ok)
          throw new Error(await g(a, "Failed to cancel subscription"));
        return await a.json();
      },
      "subscription-cancel",
      "cancellation"
    );
  }
  /** Get Stripe billing portal URL */
  async getBillingPortalUrl(e) {
    return this.executeWithResilience(
      this.queryRateLimiter,
      async () => {
        const r = await this.routeDiscovery.buildUrl("/paywall/v1/subscription/portal");
        c().debug("[SubscriptionChangeManager] Getting billing portal URL:", e);
        const a = await p(r, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(e)
        });
        if (!a.ok)
          throw new Error(await g(a, "Failed to get billing portal URL"));
        return await a.json();
      },
      "subscription-portal",
      "portal"
    );
  }
}
class vt {
  routeDiscovery;
  rateLimiter = R(M.PAYMENT);
  circuitBreaker = j({
    failureThreshold: 5,
    timeout: 1e4,
    name: "credits-manager"
  });
  constructor(e) {
    this.routeDiscovery = e;
  }
  async requestQuote(e, r) {
    if (!this.rateLimiter.tryConsume())
      throw new Error("Rate limit exceeded for credits quote. Please try again later.");
    try {
      return await this.circuitBreaker.execute(async () => await b(
        async () => {
          const a = await this.routeDiscovery.buildUrl("/paywall/v1/quote");
          c().debug("[CreditsManager] Requesting quote");
          const n = await p(a, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ resource: e, couponCode: r })
          });
          if (n.status === 402)
            return (await n.json()).credits || null;
          if (!n.ok) {
            const i = await g(n, "Failed to get credits quote");
            throw new Error(i);
          }
          return null;
        },
        { ...E.STANDARD, name: "credits-quote" }
      ));
    } catch (a) {
      throw a instanceof A ? (c().error("[CreditsManager] Circuit breaker is OPEN - credits service unavailable"), new Error("Credits service is temporarily unavailable. Please try again in a few moments.")) : a;
    }
  }
  async requestCartQuote(e, r) {
    if (!this.rateLimiter.tryConsume())
      throw new Error("Rate limit exceeded for cart credits quote. Please try again later.");
    try {
      return await this.circuitBreaker.execute(async () => await b(
        async () => {
          const a = await this.routeDiscovery.buildUrl("/paywall/v1/cart/quote");
          c().debug("[CreditsManager] Requesting cart quote for items:", e.length);
          const n = await p(a, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items: e, couponCode: r })
          });
          if (n.status === 402 || n.ok) {
            const o = await n.json();
            return o.credits ? {
              cartId: o.cartId,
              credits: o.credits
            } : null;
          }
          const i = await g(n, "Failed to get cart credits quote");
          throw new Error(i);
        },
        { ...E.STANDARD, name: "credits-cart-quote" }
      ));
    } catch (a) {
      throw a instanceof A ? new Error("Credits service is temporarily unavailable. Please try again in a few moments.") : a;
    }
  }
  /**
   * Create a hold on user's credits
   * Requires Authorization header with cedros-login JWT token
   */
  async createHold(e) {
    const { resource: r, couponCode: a, authToken: n } = e;
    if (!this.rateLimiter.tryConsume())
      throw new Error("Rate limit exceeded for credits hold. Please try again later.");
    const i = S();
    try {
      return await this.circuitBreaker.execute(async () => await b(
        async () => {
          const o = await this.routeDiscovery.buildUrl("/paywall/v1/credits/hold");
          c().debug("[CreditsManager] Creating hold");
          const s = await p(o, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${n}`,
              "Idempotency-Key": i
            },
            body: JSON.stringify({ resource: r, couponCode: a })
          });
          if (!s.ok) {
            const l = await g(s, "Failed to create credits hold");
            throw new Error(l);
          }
          return await s.json();
        },
        { ...E.STANDARD, name: "credits-create-hold" }
      ));
    } catch (o) {
      throw o instanceof A ? new Error("Credits service is temporarily unavailable. Please try again in a few moments.") : o;
    }
  }
  /**
   * Create a hold on user's credits for a cart
   * Requires Authorization header with cedros-login JWT token
   */
  async createCartHold(e) {
    const { cartId: r, authToken: a } = e;
    if (!this.rateLimiter.tryConsume())
      throw new Error("Rate limit exceeded for cart credits hold. Please try again later.");
    const n = S();
    try {
      return await this.circuitBreaker.execute(async () => await b(
        async () => {
          const i = await this.routeDiscovery.buildUrl(`/paywall/v1/cart/${encodeURIComponent(r)}/credits/hold`);
          c().debug("[CreditsManager] Creating cart hold for cart:", r);
          const o = await p(i, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${a}`,
              "Idempotency-Key": n
            },
            body: JSON.stringify({})
          });
          if (!o.ok) {
            const s = await g(o, "Failed to create cart credits hold");
            throw new Error(s);
          }
          return await o.json();
        },
        { ...E.STANDARD, name: "credits-create-cart-hold" }
      ));
    } catch (i) {
      throw i instanceof A ? new Error("Credits service is temporarily unavailable. Please try again in a few moments.") : i;
    }
  }
  async authorizePayment(e) {
    const { resource: r, holdId: a, couponCode: n, authToken: i, metadata: o } = e;
    if (!this.rateLimiter.tryConsume())
      return {
        success: !1,
        error: "Rate limit exceeded for credits authorization. Please try again later.",
        errorCode: "rate_limit_exceeded"
      };
    const s = S();
    try {
      return await this.circuitBreaker.execute(async () => await b(
        async () => {
          const l = await this.routeDiscovery.buildUrl("/paywall/v1/credits/authorize");
          c().debug("[CreditsManager] Authorizing payment");
          const d = await p(l, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${i}`,
              "Idempotency-Key": s
            },
            body: JSON.stringify({
              resource: r,
              holdId: a,
              couponCode: n,
              ...o && { metadata: o }
            })
          });
          if (!d.ok) {
            const u = await d.json().catch(() => ({}));
            return {
              success: !1,
              error: u.error?.message || "Credits authorization failed",
              errorCode: u.error?.code || "authorization_failed"
            };
          }
          return {
            success: !0,
            transactionId: (await d.json()).transactionId
          };
        },
        { ...E.STANDARD, name: "credits-authorize" }
      ));
    } catch (l) {
      return l instanceof A ? {
        success: !1,
        error: "Credits service is temporarily unavailable. Please try again in a few moments.",
        errorCode: "service_unavailable"
      } : {
        success: !1,
        error: T(l, "Credits authorization failed"),
        errorCode: "authorization_failed"
      };
    }
  }
  async authorizeCartPayment(e) {
    const { cartId: r, holdId: a, authToken: n, metadata: i } = e;
    if (!this.rateLimiter.tryConsume())
      return {
        success: !1,
        error: "Rate limit exceeded for cart credits authorization. Please try again later.",
        errorCode: "rate_limit_exceeded"
      };
    const o = S();
    try {
      return await this.circuitBreaker.execute(async () => await b(
        async () => {
          const s = await this.routeDiscovery.buildUrl(`/paywall/v1/cart/${encodeURIComponent(r)}/credits/authorize`);
          c().debug("[CreditsManager] Authorizing cart payment for cart:", r);
          const l = await p(s, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${n}`,
              "Idempotency-Key": o
            },
            body: JSON.stringify({
              holdId: a,
              ...i && { metadata: i }
            })
          });
          if (!l.ok) {
            const m = await l.json().catch((u) => (c().error("[CreditsManager] Failed to parse error response JSON:", u, {
              cartId: r,
              status: l.status,
              statusText: l.statusText
            }), {}));
            return {
              success: !1,
              error: m.error?.message || "Cart credits authorization failed",
              errorCode: m.error?.code || "authorization_failed"
            };
          }
          return {
            success: !0,
            transactionId: (await l.json()).transactionId
          };
        },
        { ...E.STANDARD, name: "credits-cart-authorize" }
      ));
    } catch (s) {
      return s instanceof A ? {
        success: !1,
        error: "Credits service is temporarily unavailable. Please try again in a few moments.",
        errorCode: "service_unavailable"
      } : {
        success: !1,
        error: T(s, "Cart credits authorization failed"),
        errorCode: "authorization_failed"
      };
    }
  }
  async releaseHold(e, r) {
    if (e)
      try {
        await this.circuitBreaker.execute(async () => {
          const a = await this.routeDiscovery.buildUrl(`/paywall/v1/credits/hold/${encodeURIComponent(e)}/release`), n = await p(a, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${r}`,
              "Idempotency-Key": S()
            }
          });
          if (!n.ok) {
            const i = await g(n, "Failed to release credits hold");
            throw new Error(i);
          }
        });
      } catch (a) {
        throw a instanceof A ? new Error("Credits service is temporarily unavailable. Please try again in a few moments.") : a;
      }
  }
  /**
   * Process a complete credits payment (convenience method)
   * Combines createHold + authorizePayment in one call
   *
   * @param resource - Resource being purchased
   * @param authToken - JWT token from cedros-login
   * @param couponCode - Optional coupon code
   * @param metadata - Optional metadata
   */
  async processPayment(e, r, a, n) {
    let i = null;
    try {
      i = (await this.createHold({ resource: e, couponCode: a, authToken: r })).holdId;
      const s = await this.authorizePayment({
        resource: e,
        holdId: i,
        couponCode: a,
        authToken: r,
        metadata: n
      });
      if (!s.success && i)
        try {
          await this.releaseHold(i, r);
        } catch (l) {
          c().warn("[CreditsManager] Failed to release hold after auth failure:", l);
        }
      return {
        success: s.success,
        transactionId: s.transactionId,
        error: s.error
      };
    } catch (o) {
      if (i)
        try {
          await this.releaseHold(i, r);
        } catch (s) {
          c().warn("[CreditsManager] Failed to release hold after payment failure:", s);
        }
      return {
        success: !1,
        error: T(o, "Credits payment failed")
      };
    }
  }
}
class Ct {
  serverUrl;
  routePrefix = null;
  discoveryPromise = null;
  failedDiscoveryAt = null;
  maxRetries = 2;
  baseDelayMs = 1e3;
  discoveryTimeoutMs = 2e3;
  failedDiscoveryTtlMs = 3e4;
  constructor(e) {
    this.serverUrl = e.replace(/\/+$/, "");
  }
  /**
   * Discover route prefix from backend health endpoint
   *
   * DEDUPLICATION: Multiple concurrent calls share the same in-flight request
   * SECURITY FIX: Only cache on success, retry on failures with exponential backoff
   * This prevents permanent bricking of payments due to transient failures
   */
  async discoverPrefix() {
    if (this.routePrefix !== null)
      return this.routePrefix;
    if (this.discoveryPromise)
      return this.discoveryPromise;
    if (this.failedDiscoveryAt !== null && Date.now() - this.failedDiscoveryAt < this.failedDiscoveryTtlMs)
      return c().warn("[RouteDiscoveryManager] Returning empty prefix from negative cache (previous discovery failed)"), "";
    const e = (async () => {
      let r = 0;
      for (; r < this.maxRetries; )
        try {
          const a = await p(
            `${this.serverUrl}/cedros-health`,
            {},
            this.discoveryTimeoutMs
          );
          if (!a.ok) {
            if (a.status >= 400 && a.status < 500)
              return c().warn(`Route discovery received ${a.status} - not retrying client error`), this.failedDiscoveryAt = Date.now(), "";
            throw new Error(`Health check returned ${a.status}`);
          }
          const i = (await a.json()).routePrefix || "";
          return this.routePrefix = i, this.failedDiscoveryAt = null, c().debug("Route discovery successful, prefix:", i || "(empty)"), i;
        } catch (a) {
          if (r++, r >= this.maxRetries)
            return c().warn(
              `Route discovery failed after ${r} attempts, using empty prefix for this request:`,
              a
            ), this.failedDiscoveryAt = Date.now(), "";
          const n = this.baseDelayMs * Math.pow(2, r - 1);
          c().warn(
            `Route discovery failed (attempt ${r}/${this.maxRetries}), retrying in ${n}ms:`,
            a
          ), await new Promise((i) => setTimeout(i, n));
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
  /**
   * Build API URL with discovered prefix
   */
  async buildUrl(e) {
    const r = await this.discoverPrefix(), a = e.startsWith("/") ? e : `/${e}`;
    return `${this.serverUrl}${r}${a}`;
  }
  /**
   * Reset cached prefix (useful for testing or reconnecting)
   */
  reset() {
    this.routePrefix = null, this.discoveryPromise = null, this.failedDiscoveryAt = null;
  }
}
let X = null;
async function Et() {
  return X || (X = (await import("./WalletManager-HXXyARQ7.mjs")).WalletManager), X;
}
const J = /* @__PURE__ */ new Map(), Z = /* @__PURE__ */ new Map();
function Ue(t, e, r, a, n) {
  return JSON.stringify({
    stripePublicKey: t,
    serverUrl: e,
    solanaCluster: r,
    solanaEndpoint: a || "",
    dangerouslyAllowUnknownMint: n || !1
  });
}
async function Pt(t, e, r, a, n) {
  const i = Ue(
    t,
    e,
    r,
    a,
    n
  );
  let o = J.get(i);
  if (o)
    return o.refCount++, c().debug(
      `[ManagerCache] Reusing cached managers (refCount: ${o.refCount}):`,
      { stripePublicKey: t.slice(0, 10) + "...", serverUrl: e }
    ), o;
  const s = Z.get(i);
  if (s)
    return o = await s, o.refCount++, c().debug(
      `[ManagerCache] Reusing in-flight managers (refCount: ${o.refCount}):`,
      { stripePublicKey: t.slice(0, 10) + "...", serverUrl: e }
    ), o;
  c().debug(
    "[ManagerCache] Creating new manager instances:",
    { stripePublicKey: t.slice(0, 10) + "...", serverUrl: e }
  );
  const l = (async () => {
    const d = new Ct(e), m = new st(t, d), u = new gt(d), y = await Et(), f = new y(
      r,
      a,
      n ?? !1
    ), h = new wt(t, d), w = new bt(d), C = new vt(d);
    return {
      stripeManager: m,
      x402Manager: u,
      walletManager: f,
      subscriptionManager: h,
      subscriptionChangeManager: w,
      creditsManager: C,
      routeDiscovery: d,
      refCount: 1
    };
  })();
  Z.set(i, l);
  try {
    return o = await l, J.set(i, o), o;
  } finally {
    Z.delete(i);
  }
}
function ye(t, e, r, a, n) {
  const i = Ue(
    t,
    e,
    r,
    a,
    n
  ), o = J.get(i);
  if (!o) {
    c().warn("[ManagerCache] Attempted to release non-existent managers:", { cacheKey: i });
    return;
  }
  o.refCount--, c().debug(
    `[ManagerCache] Released manager reference (refCount: ${o.refCount}):`,
    { stripePublicKey: t.slice(0, 10) + "...", serverUrl: e }
  ), o.refCount <= 0 && (J.delete(i), c().debug("[ManagerCache] Removed managers from cache (refCount reached 0)"));
}
const St = "data:image/webp;base64,UklGRnIIAABXRUJQVlA4WAoAAAAYAAAAOwAAOwAAQUxQSK4BAAABkHPbtrE9+z73/RTbqWw7Lf+BbbNKbTudbZe2qy+VbVv3PmeHj05G6ohg4LaRounNMtN1voB42ABA5R7TNlx5+O7du9e3Tiwb0b4EgFyAOCQM1Z16+DWFUZC7m3uVB2zKQGBhe+77RGHonJffCL1zQuHDxQ1hrEmTatDjHIXOC2MgzpNf1tVJkWgsGhyihI7JIE74aUYp2ITFAoz9QO+ZAs7zanvkEilKbIkMJS5ANwoJmrCodYVOmBqh5zIEJjZc9xods4A4rrPGxGitrJSU71yNyH4Myl7JTEl+5zzYSH9nlkrxHBzxWUzLVEnhh+YI/gq3+UphpvA8m/s7/wg9M4bjFNg/0vplrxQ+rQEDg/xihmT23jxYJZ8UPq8OA5z77Wt405FDR4poSMjiAJhPRxUIu8D+UVonOhfNPEVHPM9juFacwo+1V6kJQ3Y9Sa8ljhPuUvRk4UdNWU9ST3b9n0W3iG5DumdS9y7o3kHVu6/75ii/dbpvrO7brvtPUf2X6f5DVf/dmpxBmauociRVbqbKCXW5qCoHVuXempxf1dZQtXFUbat/yKZTtSUBVlA4INwFAABwGgCdASo8ADwAPm0qj0WkIqEZ+zYAQAbEtgBOmZoZF+E8zGoP3X8VbcdLvma8t+jH0E+YB+ofSA8wH7VdQv0AP75/iOsG9ADy3/Y5/b/91fgI/Y7MOesb0e/q+TUR1vt7VO6mwG0imO70GM5/0P7BX6qelv7EP209lz9oDRea09ZR+SjhX7sBu/ZS7tG917rPgI3Q7XsB7luy2hAg/95C2Z1L362OH1oFziDY/K5gWoSytSAtiKvA/jW1MehBzdLzJfszPPBvGa15IYwIVRTjO2Hz5ZS9HjLMehwAAP64SgjD3qeg6NRe/Ok+iFhrG3pgglCfbam3yBaDUH36sUiQx0PB1ZZyOHq0ky+f97h6tJMvo0p9LkfXecWOFJ8J5G7yRPuL4tzGLT09QulTJw42xp2hd+lMgIa51XoHx/iftn8B2D3k92H5jOQr+uIXFHHK5FpcTG+qGEF+np0LiQa+vdW7/+ZzOLVRf7jR5X3ANPt93Ng92DW7NflVr6kMr88O/v2ZNb0vtgao2Am/R3CDKiNq89f86CT6r2L2g1oTui7H3E1yhSPQpEOz01I3fhfiMMv4weqKuoedxn/xLg5uzHa6Gte4C/dQYkG3ZFSy4CXQtRjftBrjX/Oj+HpSUPDsv0wPW+ml5NbBKDCj2f3SD8TVMf2ZfHrOkR602RVk2UmKC+H0Y9iK6k98vsgPINtz0II8X7Mj2nJkTC6IMLuQ8dNTUq9VXOnhXrdhNZoaH94ePo6baBl3hTGFAnD3/b+gR/vtbqV7wktuX6fpnjeTBe/Drp6z3neeANj/aX4CsU9w67nwYOjZhueCjxaDKUnNjLPjI1e0BoTbcOzOQ0wHJHZJ+Pt608StBu4HiJ8NjH46fnvXL3yiMoSvkAuwCE1AakA+eU1u3unyjl1/MnZQmbp8fzfsfrFesehLPcIkYdCiZ+52QbmINNTjEsvjuBuZRubBE+Laihppsxoo4efGIo0xkw0etu1+yzvkqp88w3pBq0mRl13gnnc+2zl6SmhwgmNFbz+F8qAqmdfJL8iaNSGEWlPlpczDDe62GBZMlBhQmq/XCn/1b+VazHvJXkoIFDF+wktMg+rKfLyfTlXdK0cs+Kn8h+rjMakkf3WLo1TftMLn+O+x/Gat+BGstJrM1xvCSSnHQY+NV4B4gRqyZ55gRNnqN/0lWrATOcHUaGXpkTIM/yxFjxcePcSFo+t2aJ5lShtVukETzRxaIXgRkpROeWQHWpTHOaexmXOzF0b833qJSoXMk2zB/uMrgDzKd7d3ohUz8Ra08WYKlAuMQD08bF4+jUepEspqPLoYLQ73TfmL+1LwKxyTV3gEu6WnxBPWPLnYIGYN9U47ZNlB+NgHgYtKTyii6060RAG+wN32WUVFxCZw0HMHnHFgwxD34L/anlpS7mOrjKgyuGYhFC7iHqTQHuoAO1ekBHV+rndnbETKfa1F7LxNLYq+dmJyytmQrJUCGjelorI1m/TMQNiFVrY4FCI1Gl2W1JsZsw9zA+Bh3JmjkC0H5/0JV6JotNMatJIZ4v5PqwJe3r8xd+FNS3ynccdu+xtVdc27qwVdoomciZD5oXYey9KAFSAKO594sBKZNWUJTLXnt0BJbdF8FkQYvg3DQajYY2p+ixd5Ag7o92gw0pVVDDOP+WQxiEmKqgWJyTBsnsBk2Bxi2Unsv8S/4PmE8Hy/vy+Mij+aTAKZvg716IHfHX0/JMeFfmAnsZ39Q0qkfdPtq6+CxbGZ7wKDsK/8l/MVGuyd6faJFt5wyoOXuNrr3JC9EoBmjcOzkVw/6RNP49poZ1xzsX3q7B4HGfI/XSfRQq3HeZ2j12d0E3gCAube4oExaT1sx/v8F+f61QOsGdSaqM2im6qOGkSRkrRQ7L8hvS8vEYJeVkAbFvX5ov7e/egYYNToMHj651c5/rCVYtB9Ned6GvGN8R0x3t7+lsf8+ofhHRzpyvwxd6c5pREZVOKnXzplhJ61mki4JmAAAABFWElGugAAAEV4aWYAAElJKgAIAAAABgASAQMAAQAAAAEAAAAaAQUAAQAAAFYAAAAbAQUAAQAAAF4AAAAoAQMAAQAAAAIAAAATAgMAAQAAAAEAAABphwQAAQAAAGYAAAAAAAAASAAAAAEAAABIAAAAAQAAAAYAAJAHAAQAAAAwMjEwAZEHAAQAAAABAgMAAKAHAAQAAAAwMTAwAaADAAEAAAD//wAAAqAEAAEAAAA8AAAAA6AEAAEAAAA8AAAAAAAAAA==", xt = "data:image/svg+xml,%3csvg%20width='868'%20height='868'%20viewBox='0%200%20868%20868'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3e%3ccircle%20cx='434'%20cy='434'%20r='434'%20fill='%231B262D'/%3e%3cpath%20fill-rule='evenodd'%20clip-rule='evenodd'%20d='M234.563%20184H640.697C650.387%20184%20659.339%20189.164%20664.172%20197.542L782.495%20402.657C788.631%20413.294%20786.808%20426.72%20778.056%20435.346L452.368%20756.327C441.818%20766.724%20424.846%20766.724%20414.296%20756.327L89.0484%20435.78C80.0927%20426.954%2078.4157%20413.136%2085.0013%20402.433L211.48%20196.884C216.405%20188.879%20225.146%20184%20234.563%20184ZM588.257%20275.577V333.129H472.567V373.032C553.82%20377.296%20614.782%20394.81%20615.234%20415.802L615.231%20459.563C614.779%20480.556%20553.82%20498.069%20472.567%20502.333V600.259H395.746V502.333C314.492%20498.069%20253.531%20480.555%20253.078%20459.563L253.081%20415.802C253.533%20394.81%20314.492%20377.296%20395.746%20373.032V333.129H280.055V275.577H588.257ZM434.156%20472.268C520.868%20472.268%20593.345%20457.459%20611.082%20437.683C596.041%20420.912%20541.636%20407.713%20472.567%20404.089V445.867C460.187%20446.516%20447.336%20446.858%20434.156%20446.858C420.976%20446.858%20408.125%20446.516%20395.746%20445.867V404.089C326.676%20407.713%20272.271%20420.912%20257.23%20437.683C274.968%20457.459%20347.444%20472.268%20434.156%20472.268Z'%20fill='%23009393'/%3e%3c/svg%3e", kt = "data:image/webp;base64,UklGRqwEAABXRUJQVlA4WAoAAAAYAAAAOwAAOwAAQUxQSL8BAAABkGvbtmlLc5997yvbmW19gBnbDm2kjF5UmW3bthXZVZFdZ+81r+87Z1XlEaHIbSNlMstwos4XUBSTLAFQo/u01Zdf/yLDDze3zB/YwADJEoOoJAKg7oTdH4SF+XxiZlMgSESzwAJdVn2iUJzzOUMiLhQKf+/va2FtBLMBuu1zpHcsincUXhtoTKLsCTVX/KF3wrLhPLm/OWzZtjQWfZ7RhYyAC/lxMowpSzJYJAyFkZDQc21FBMUT7BqGjpHxf3m+XlEPUHE/f3vGgPzmw4awRUaTexkyJhwfNShctVgZXyJDXq4CUyjNy6Y4fVOBIkAPR2GcOE7Jm2NQ/RE9YzXht3a5VYvlOX0xF0fy+tp/ozBuQg6DzZYb6Bi7ed4rB5Mp/1Co4cNhLUo1StLxDIDqrynUoRswiF6nFnIxsDpnZ5WBW0GFZ1qZ8HfLDk5txHHsGDpSa6B0cXZEa+DsTr1M+P4qPdXwjynU4+1/a7oN3Sm6G+meSd27oHsHde++7puj+tYpv7G6b7vun6L7l6n+oZp/t7JmUNUqqhpJV5upakJVLaqqgVW1t6rmV401NGMc1djqH4rpIseSfyPFkgAAVlA4IAQCAABQDACdASo8ADwAPm0yk0akIyGhJgzogA2JaQAThroHvLxu+aPf5G2BYxv+B6XHzx6GPon/o+qz/tOAA/TM82gR0vnExWoiQRM36jlg2UIvwCSqySErzuguz9EP2x/7hsNazr91aIworWI7AAD+/TZ+6Ipl444OdT+2wU0Ov+T8oJuVP/vUbT/w1Jsv6Awnl6rvF/xetfOPt3gTQZZi0Y/AOx563J7CJkqTR/fc/n34zyeKzR80fhfv4ef+Hjhz/CX5aQo+58zg/FdE+7bLoophGfG0szI513EH+q+Gc73H1PFdJYf7CF8v5dhr3tMwEVX5Ji2ZxejK8xrf/E6nVXqlA4DrYNRP09InHc+fEqO/fH8xr+rMf4y1F9TOnwVffZblLoTP6lot0m/sh7sTiDQr0mIA8TiHoOffGDG6KzV+B3239udfhzD740gkRi/m53abX0Ku3vAgadgFFqL0vk8M/4aI+cI+0fbLW17mWGeMu21wSRRQiv5iNgGKR3vEGXAItcLDft1uUzWAfbe1X3zK/ymT7bA/76PB6UUknm+Y5MM4osurUXU/k7P38pN/3slnGfpFzjl4c3USY4mH9ZCJYUuC/kGEnq/yRPalPdODNFvW6s8MiQeQejYNRY0LsJ0WXkK8vXiDmihCivYAOPoSovesL7on+WAArDNM/BcQSQvCYABFWElGugAAAEV4aWYAAElJKgAIAAAABgASAQMAAQAAAAEAAAAaAQUAAQAAAFYAAAAbAQUAAQAAAF4AAAAoAQMAAQAAAAIAAAATAgMAAQAAAAEAAABphwQAAQAAAGYAAAAAAAAASAAAAAEAAABIAAAAAQAAAAYAAJAHAAQAAAAwMjEwAZEHAAQAAAABAgMAAKAHAAQAAAAwMTAwAaADAAEAAAD//wAAAqAEAAEAAAA8AAAAA6AEAAEAAAA8AAAAAAAAAA==", Tt = "data:image/webp;base64,UklGRtgCAABXRUJQVlA4WAoAAAAIAAAAOwAAOwAAVlA4IPgBAABQCwCdASo8ADwAPm0wk0ekIqGhKBQMqIANiWkADPF3uV2D8VcQGk1mg+P36i9SLnZvYAQxszEWYzEwX1RVkqG/4BGbJgMSHqhKDFsjWsGfPPrvfef11goNmCDDlBJHVVD+8gAA/vu4q03kl+E7FpjtZ2gc8pQ619Hjv9NywoRZ6az43C1wcrRr/lWzJlJhLWMHN0MkVl1ueAf6Hn8StVzeUfMBXOKkgfe2msx7QWR5PnHW/5c6/35yrtWnrURc2q6UYlGin+v8C2dQqexkW6rX2EEijTI9eEQ46PWH3/59fM2AlMvvR2abaRk5XX7V1triQncRxvMfz5YmYDN+PY/ikcZUNaiFucKoUq5riv0eKCezuFNHecE11ojwJqWRSTWpalkz5autXp6vFS+FT1tWUsB/fs1CCOZxaA1vR1grOEaiuKe1RYm7e05psWtqbXLVmm1bA8Ly9PFkVdCbc6hR3UuBBsFGnVeGOUeMn2onnfvYhBMcM9YPxGdQkwZLXOk1VuQSTk01Shf3fZrFyRlFauftFdPYhKXwqrr+meav1P+KLKBVosqmHnFFfgExsQ/rOf3TSd+mOqQfJA+cF+HojNU7nmM3uDkoCBi+//Gqp+gPNNW8M4LFrol8rxE+7WsjqMgfwv1f+Nr25RtG1Wa/KkniRCAAAABFWElGugAAAEV4aWYAAElJKgAIAAAABgASAQMAAQAAAAEAAAAaAQUAAQAAAFYAAAAbAQUAAQAAAF4AAAAoAQMAAQAAAAIAAAATAgMAAQAAAAEAAABphwQAAQAAAGYAAAAAAAAASAAAAAEAAABIAAAAAQAAAAYAAJAHAAQAAAAwMjEwAZEHAAQAAAABAgMAAKAHAAQAAAAwMTAwAaADAAEAAAD//wAAAqAEAAEAAAA8AAAAA6AEAAEAAAA8AAAAAAAAAA==", Rt = {
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: {
    symbol: "USDC",
    decimals: 6,
    icon: St
  },
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: {
    symbol: "USDT",
    decimals: 6,
    icon: xt
  },
  "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo": {
    symbol: "PYUSD",
    decimals: 6,
    icon: kt
  },
  CASHx9KJUStyftLFWGvEVf59SGeG9sh5FfcnZMVPCASH: {
    symbol: "CASH",
    decimals: 6,
    icon: Tt
  }
}, ae = Object.fromEntries(
  Object.entries(Rt).map(([t, e]) => [t, e.symbol])
);
function Mt(t) {
  return t in ae;
}
function Fe(t, e = "token mint", r = !1) {
  if (!t || t.trim().length === 0)
    return {
      isValid: !0,
      isKnownStablecoin: !1
    };
  const a = t.trim();
  if (Mt(a))
    return {
      isValid: !0,
      isKnownStablecoin: !0,
      symbol: ae[a]
    };
  const n = Object.entries(ae).map(([i, o]) => `  ${o}: ${i}`).join(`
`);
  return r ? {
    isValid: !0,
    // Allow but warn
    isKnownStablecoin: !1,
    warning: [
      `Warning: Unrecognized token mint address in ${e}`,
      `  Provided: ${a}`,
      "",
      "This token mint does not match any known stablecoin addresses.",
      "You have set dangerouslyAllowUnknownMint=true, so this will proceed.",
      "If this is a typo, payments will be sent to the wrong token and funds will be PERMANENTLY LOST.",
      "",
      "Known stablecoin mints (mainnet-beta):",
      n,
      "",
      "Double-check your token mint address before deploying to production."
    ].join(`
`)
  } : {
    isValid: !1,
    isKnownStablecoin: !1,
    error: [
      `SAFETY ERROR: Unrecognized token mint address in ${e}`,
      `  Provided: ${a}`,
      "",
      "This token mint does not match any known stablecoin addresses.",
      "Using an unknown token mint can result in PERMANENT LOSS OF FUNDS if it's a typo.",
      "",
      "Known stablecoin mints (mainnet-beta):",
      n,
      "",
      "If you are CERTAIN this is the correct mint address (custom token, testnet, or new stablecoin),",
      "set dangerouslyAllowUnknownMint={true} in your CedrosProvider config:",
      "",
      "  <CedrosProvider",
      "    config={{",
      "      ...",
      '      tokenMint: "' + a + '",',
      "      dangerouslyAllowUnknownMint: true, // ⚠️ I have verified this mint address",
      "    }}",
      "  />",
      "",
      "⚠️ WARNING: Only enable dangerouslyAllowUnknownMint if you have TRIPLE-CHECKED the mint address."
    ].join(`
`)
  };
}
function Qt(t, e = "unknown", r = !1) {
  return Fe(t, `X402Requirement (resource: ${e})`, r);
}
const pe = /* @__PURE__ */ new Set(["mainnet-beta", "devnet", "testnet"]);
function Dt() {
  if (typeof window < "u" && window.location)
    return window.location.origin;
  throw new Error(
    "serverUrl is required in SSR/Node environments. In browser environments, it defaults to window.location.origin"
  );
}
function Ot(t) {
  const e = [];
  if (t.showCard !== !1) {
    const n = t.stripePublicKey;
    (typeof n != "string" || n.trim().length === 0) && e.push({
      field: "stripePublicKey",
      message: "must be a non-empty string when card payments are enabled (showCard is not false)"
    });
  }
  let a;
  if (t.serverUrl !== void 0)
    typeof t.serverUrl != "string" || t.serverUrl.trim().length === 0 ? (e.push({
      field: "serverUrl",
      message: "must be a non-empty string when provided"
    }), a = "") : (!t.serverUrl.startsWith("http://") && !t.serverUrl.startsWith("https://") && e.push({
      field: "serverUrl",
      message: 'must start with "http://" or "https://"'
    }), a = t.serverUrl);
  else
    try {
      a = Dt();
    } catch (n) {
      e.push({
        field: "serverUrl",
        message: n instanceof Error ? n.message : "failed to determine default"
      }), a = "";
    }
  if (pe.has(t.solanaCluster) || e.push({
    field: "solanaCluster",
    message: `must be one of ${Array.from(pe).join(", ")}`
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
  }), e.length > 0) {
    const n = e.map((i) => `- ${i.field} ${i.message}`).join(`
`);
    throw new Error(`Invalid Cedros configuration:
${n}`);
  }
  if (t.tokenMint) {
    const n = t.dangerouslyAllowUnknownMint === !0, i = Fe(t.tokenMint, "CedrosConfig.tokenMint", n);
    if (!i.isValid && i.error)
      throw new Error(i.error);
    i.warning && c().warn(i.warning);
  }
  return {
    ...t,
    serverUrl: a
  };
}
const Bt = Object.freeze({
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
}), _t = Object.freeze({
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
}, se = Ae(null);
function Nt(t, e) {
  return {
    ...t === "dark" ? _t : Bt,
    ...e
  };
}
function Ut(t) {
  const e = Object.entries(t).map(([r, a]) => [
    It[r],
    a
  ]);
  return Object.fromEntries(e);
}
function Ft({
  initialMode: t = "light",
  overrides: e,
  unstyled: r = !1,
  children: a
}) {
  const [n, i] = N(t), [o, s] = N(e), l = ge(e);
  I(() => {
    if (e === l.current)
      return;
    (!e || !l.current ? e !== l.current : Object.keys({ ...e, ...l.current }).some(
      (u) => e[u] !== l.current?.[u]
    )) && (l.current = e, s(e));
  }, [e]);
  const d = ee(() => {
    const m = Nt(n, o), u = r ? {} : Ut(m), y = r ? "" : `cedros-theme-root cedros-theme cedros-theme--${n}`;
    return {
      mode: n,
      setMode: i,
      tokens: m,
      className: y,
      style: u,
      unstyled: r
    };
  }, [n, o, r]);
  return /* @__PURE__ */ W(se.Provider, { value: d, children: a });
}
function Kt() {
  const t = ne(se);
  if (!t)
    throw new Error("useCedrosTheme must be used within CedrosProvider");
  return t;
}
function Wt() {
  return ne(se);
}
const $ = {
  getAdapters: () => [],
  cleanup: async () => {
  },
  isInitialized: () => !1,
  getId: () => "stub"
};
function Ht() {
  return typeof process < "u" && process.env.NODE_ENV === "development" ? 0 : 2;
}
const He = Ae(null);
function Vt({ config: t, children: e }) {
  const r = ee(() => Ot(t), [t]), [a, n] = N(null), [i, o] = N($), s = ge($);
  I(() => {
    let f = !1;
    return import("./walletPool-BV_z1lEA.mjs").then(({ createWalletPool: h }) => {
      if (f) return;
      const w = h();
      s.current = w, o(w);
    }).catch((h) => {
      f || (c().error("[CedrosProvider] Wallet pool initialization failed:", h), n("Failed to initialize Cedros provider"));
    }), () => {
      f = !0;
    };
  }, []);
  const [l, d] = N(null);
  I(() => {
    let f = !1;
    return import("./solanaCheck-IlYsbXDd.mjs").then(
      ({ checkSolanaAvailability: h }) => h()
    ).then((h) => {
      f || (h.available ? d(void 0) : d(h.error || "Solana dependencies not available"));
    }).catch((h) => {
      f || (c().warn("[CedrosProvider] Solana availability check failed:", h), d("Unable to verify Solana availability"));
    }), () => {
      f = !0;
    };
  }, []), I(() => {
    const f = r.logLevel ?? Ht(), h = Xe({
      level: f,
      prefix: "[CedrosPay]"
    });
    Ye(h);
  }, [r.logLevel]), I(() => () => {
    const f = s.current;
    f && f !== $ && f.cleanup().catch((h) => {
      c().warn("[CedrosProvider] Wallet pool cleanup failed:", h);
    });
  }, []);
  const [m, u] = N(null);
  I(() => {
    let f = !1, h = !1;
    const w = r.stripePublicKey ?? "", C = r.serverUrl ?? "", x = r.solanaCluster, B = r.solanaEndpoint, k = r.dangerouslyAllowUnknownMint;
    return Pt(w, C, x, B, k).then((D) => {
      if (f) {
        ye(w, C, x, B, k);
        return;
      }
      h = !0, u(D);
    }).catch((D) => {
      f || (c().error("[CedrosProvider] Manager initialization failed:", D), n("Failed to initialize Cedros provider"));
    }), () => {
      f = !0, h && ye(w, C, x, B, k);
    };
  }, [
    r.stripePublicKey,
    r.serverUrl,
    r.solanaCluster,
    r.solanaEndpoint,
    r.dangerouslyAllowUnknownMint
  ]);
  const y = ee(() => m ? {
    config: r,
    ...m,
    walletPool: i,
    solanaError: l
  } : null, [r, m, i, l]);
  return a ? /* @__PURE__ */ W("div", { role: "alert", children: a }) : /* @__PURE__ */ W(
    Ft,
    {
      initialMode: r.theme ?? "light",
      overrides: r.themeOverrides,
      unstyled: r.unstyled ?? !1,
      children: y ? /* @__PURE__ */ W(He.Provider, { value: y, children: e }) : null
    }
  );
}
function Gt() {
  const t = ne(He);
  if (!t)
    throw new Error("useCedrosContext must be used within CedrosProvider");
  return t;
}
export {
  Vt as C,
  at as E,
  ae as K,
  Ge as L,
  O as P,
  M as R,
  Rt as S,
  Kt as a,
  j as b,
  R as c,
  et as d,
  A as e,
  zt as f,
  E as g,
  Ee as h,
  c as i,
  Xe as j,
  Qt as k,
  me as l,
  T as m,
  Fe as n,
  rt as o,
  p,
  Wt as q,
  b as r,
  Gt as u,
  Ot as v
};
