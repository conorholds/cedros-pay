import { jsx as X } from "react/jsx-runtime";
import { createContext as ye, useContext as re, useState as Z, useRef as we, useEffect as L, useMemo as $ } from "react";
import { g as T } from "./uuid-_z3jSatJ.mjs";
import { clusterApiUrl as je, Connection as ze, Transaction as oe, PublicKey as N, LAMPORTS_PER_SOL as qe } from "@solana/web3.js";
import { getAssociatedTokenAddress as Qe, createTransferInstruction as We } from "@solana/spl-token";
import { PhantomWalletAdapter as He, SolflareWalletAdapter as Ve } from "@solana/wallet-adapter-wallets";
var me = "https://js.stripe.com/v3", Ge = /^https:\/\/js\.stripe\.com\/v3\/?(\?.*)?$/;
var Ke = function() {
  for (var e = document.querySelectorAll('script[src^="'.concat(me, '"]')), t = 0; t < e.length; t++) {
    var n = e[t];
    if (Ge.test(n.src))
      return n;
  }
  return null;
}, se = function(e) {
  var t = "", n = document.createElement("script");
  n.src = "".concat(me).concat(t);
  var a = document.head || document.body;
  if (!a)
    throw new Error("Expected document.body not to be null. Stripe.js requires a <body> element.");
  return a.appendChild(n), n;
}, Je = function(e, t) {
  !e || !e._registerWrapper || e._registerWrapper({
    name: "stripe-js",
    version: "4.6.0",
    startTime: t
  });
}, I = null, Q = null, W = null, Ye = function(e) {
  return function() {
    e(new Error("Failed to load Stripe.js"));
  };
}, Xe = function(e, t) {
  return function() {
    window.Stripe ? e(window.Stripe) : t(new Error("Stripe.js not available"));
  };
}, Ze = function(e) {
  return I !== null ? I : (I = new Promise(function(t, n) {
    if (typeof window > "u" || typeof document > "u") {
      t(null);
      return;
    }
    if (window.Stripe) {
      t(window.Stripe);
      return;
    }
    try {
      var a = Ke();
      if (!(a && e)) {
        if (!a)
          a = se(e);
        else if (a && W !== null && Q !== null) {
          var i;
          a.removeEventListener("load", W), a.removeEventListener("error", Q), (i = a.parentNode) === null || i === void 0 || i.removeChild(a), a = se(e);
        }
      }
      W = Xe(t, n), Q = Ye(n), a.addEventListener("load", W), a.addEventListener("error", Q);
    } catch (o) {
      n(o);
      return;
    }
  }), I.catch(function(t) {
    return I = null, Promise.reject(t);
  }));
}, $e = function(e, t, n) {
  if (e === null)
    return null;
  var a = e.apply(void 0, t);
  return Je(a, n), a;
}, F, ge = !1, be = function() {
  return F || (F = Ze(null).catch(function(e) {
    return F = null, Promise.reject(e);
  }), F);
};
Promise.resolve().then(function() {
  return be();
}).catch(function(r) {
  ge || console.warn(r);
});
var ve = function() {
  for (var e = arguments.length, t = new Array(e), n = 0; n < e; n++)
    t[n] = arguments[n];
  ge = !0;
  var a = Date.now();
  return be().then(function(i) {
    return $e(i, t, a);
  });
}, _e = /* @__PURE__ */ ((r) => (r[r.DEBUG = 0] = "DEBUG", r[r.INFO = 1] = "INFO", r[r.WARN = 2] = "WARN", r[r.ERROR = 3] = "ERROR", r[r.SILENT = 4] = "SILENT", r))(_e || {});
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
  log(e, t, n) {
    const a = this.config.prefix ? `${this.config.prefix} ` : "", i = (/* @__PURE__ */ new Date()).toISOString();
    t(`[${i}] ${a}[${e}]`, ...n);
  }
}
const et = () => typeof process < "u" && process.env.NODE_ENV === "development" ? 0 : 2;
let V = null;
function c() {
  return V || (V = new Ee({
    level: et(),
    prefix: "[CedrosPay]"
  })), V;
}
function tt(r) {
  V = r;
}
function rt(r) {
  return new Ee(r);
}
function k(r, e) {
  return r instanceof Error ? r.message : typeof r == "string" ? r : e;
}
const nt = {
  service_unavailable: "Service temporarily unavailable. Please try again later or contact support.",
  server_insufficient_funds: "Service temporarily unavailable. Please try again later or contact support.",
  insufficient_funds_token: "Insufficient token balance in your wallet. Please add more tokens and try again.",
  insufficient_funds_sol: "Insufficient SOL for transaction fees. Please add some SOL to your wallet and try again.",
  insufficient_amount: "Payment amount is insufficient. Please check the required amount.",
  invalid_signature: "Transaction signature is invalid. Please try again.",
  send_failed: "Failed to send transaction. Please try again or contact support.",
  timeout: "Transaction timed out. Please check the blockchain explorer or try again."
};
async function v(r, e, t = !1) {
  try {
    const n = await r.json();
    if (t && n.verificationError) {
      c().debug(`Payment verification failed: ${n.verificationError.code}`);
      const a = n.verificationError.code;
      return nt[a] || n.verificationError.message || e;
    }
    return typeof n.error == "string" ? n.error : n.error && typeof n.error == "object" && "message" in n.error ? n.error.message : e;
  } catch {
    return await r.text() || e;
  }
}
const at = 15e3;
async function y(r, e = {}, t = at) {
  const n = new AbortController(), a = e.signal;
  if (a?.aborted)
    throw n.abort(), new DOMException("The operation was aborted", "AbortError");
  const i = setTimeout(() => n.abort(), t);
  let o = null;
  a && (o = () => n.abort(), a.addEventListener("abort", o));
  try {
    return await fetch(r, {
      ...e,
      signal: n.signal
    });
  } catch (s) {
    throw s instanceof Error && s.name === "AbortError" ? a?.aborted ? s : new Error(`Request timeout after ${t}ms`) : s;
  } finally {
    clearTimeout(i), a && o && a.removeEventListener("abort", o);
  }
}
function R(r) {
  const { maxRequests: e, windowMs: t } = r;
  let n = e, a = Date.now();
  const i = e / t;
  function o() {
    const f = Date.now(), h = f - a;
    if (h > 0) {
      const A = h * i;
      n = Math.min(e, n + A), a = f;
    }
  }
  function s() {
    return o(), n >= 1 ? (n -= 1, !0) : !1;
  }
  function u() {
    return o(), Math.floor(n);
  }
  function l() {
    if (o(), n >= 1)
      return 0;
    const h = (1 - n) / i;
    return Math.ceil(h);
  }
  function d() {
    n = e, a = Date.now();
  }
  return {
    tryConsume: s,
    getAvailableTokens: u,
    getTimeUntilRefill: l,
    reset: d
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
var it = /* @__PURE__ */ ((r) => (r.CLOSED = "CLOSED", r.OPEN = "OPEN", r.HALF_OPEN = "HALF_OPEN", r))(it || {});
class m extends Error {
  constructor(e) {
    super(e), this.name = "CircuitBreakerOpenError";
  }
}
function U(r) {
  const { failureThreshold: e, timeout: t, name: n = "circuit-breaker" } = r;
  let a = "CLOSED", i = 0, o = 0, s = 0, u = null, l = null, d = null;
  function f() {
    a === "OPEN" && d !== null && Date.now() >= d && (c().debug(`[CircuitBreaker:${n}] Transitioning OPEN → HALF_OPEN (timeout expired)`), a = "HALF_OPEN", d = null);
  }
  function h() {
    l = Date.now(), o++, a === "HALF_OPEN" ? (c().debug(`[CircuitBreaker:${n}] Success in HALF_OPEN → CLOSED`), a = "CLOSED", i = 0) : a === "CLOSED" && (i = 0);
  }
  function A(S) {
    u = Date.now(), i++, c().warn(`[CircuitBreaker:${n}] Failure recorded (${i}/${e}):`, S.message), a === "HALF_OPEN" ? (c().warn(`[CircuitBreaker:${n}] Failed in HALF_OPEN → OPEN`), a = "OPEN", d = Date.now() + t) : a === "CLOSED" && i >= e && (c().error(`[CircuitBreaker:${n}] Failure threshold reached (${i}) → OPEN`), a = "OPEN", d = Date.now() + t);
  }
  async function p(S) {
    if (f(), a === "OPEN") {
      s++;
      const E = d ? Math.ceil((d - Date.now()) / 1e3) : 0;
      throw new m(
        `Circuit breaker is OPEN. Service is unavailable. Retry in ${E}s.`
      );
    }
    try {
      const E = await S();
      return h(), E;
    } catch (E) {
      throw A(E instanceof Error ? E : new Error(String(E))), E;
    }
  }
  function w() {
    return f(), a;
  }
  function P() {
    return f(), {
      state: a,
      failures: i,
      successes: o,
      rejections: s,
      lastFailureTime: u,
      lastSuccessTime: l
    };
  }
  function D() {
    c().debug(`[CircuitBreaker:${n}] Manual reset → CLOSED`), a = "CLOSED", i = 0, o = 0, s = 0, u = null, l = null, d = null;
  }
  function x() {
    c().warn(`[CircuitBreaker:${n}] Manual trip → OPEN`), a = "OPEN", d = Date.now() + t;
  }
  return {
    execute: p,
    getState: w,
    getStats: P,
    reset: D,
    trip: x
  };
}
const rr = {
  /** Strict: Opens quickly (3 failures), long timeout (60s) */
  STRICT: { failureThreshold: 3, timeout: 6e4 },
  /** Standard: Balanced settings (5 failures, 30s timeout) */
  STANDARD: { failureThreshold: 5, timeout: 3e4 },
  /** Lenient: Tolerates more failures (10 failures, 15s timeout) */
  LENIENT: { failureThreshold: 10, timeout: 15e3 }
};
function ot(r, e) {
  if (e >= 3)
    return !1;
  const t = r.message.toLowerCase();
  return t.includes("network") || t.includes("timeout") || t.includes("fetch failed") || t.includes("econnrefused") || t.includes("503") || t.includes("502") || t.includes("500") || t.includes("429") ? !0 : (t.includes("400") || t.includes("401") || t.includes("403") || t.includes("404"), !1);
}
function st(r, e, t, n, a) {
  const i = e * Math.pow(t, r), o = Math.min(i, n);
  if (a) {
    const s = Math.random() * o;
    return Math.floor(s);
  }
  return Math.floor(o);
}
function ct(r) {
  return new Promise((e) => setTimeout(e, r));
}
async function g(r, e = {}) {
  const {
    maxRetries: t = 3,
    initialDelayMs: n = 1e3,
    backoffFactor: a = 2,
    maxDelayMs: i = 3e4,
    jitter: o = !0,
    shouldRetry: s = ot,
    name: u = "retry"
  } = e;
  let l = null, d = 0;
  for (let f = 0; f <= t; f++)
    try {
      const h = await r();
      return f > 0 && c().debug(
        `[Retry:${u}] Succeeded on attempt ${f + 1}/${t + 1} after ${d}ms`
      ), h;
    } catch (h) {
      l = h instanceof Error ? h : new Error(String(h));
      const A = f === t, p = s(l, f);
      if (A || !p)
        throw c().warn(
          `[Retry:${u}] Failed on attempt ${f + 1}/${t + 1}. ${A ? "No more retries." : "Error not retryable."}`
        ), l;
      const w = st(f, n, a, i, o);
      d += w, c().warn(
        `[Retry:${u}] Attempt ${f + 1}/${t + 1} failed: ${l.message}. Retrying in ${w}ms...`
      ), await ct(w);
    }
  throw l || new Error("Retry failed with no error");
}
const b = {
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
class lt {
  stripe = null;
  publicKey;
  routeDiscovery;
  rateLimiter = R(M.PAYMENT);
  circuitBreaker = U({
    failureThreshold: 5,
    timeout: 1e4,
    // 10 seconds for faster recovery in payment flows
    name: "stripe-manager"
  });
  constructor(e, t) {
    this.publicKey = e, this.routeDiscovery = t;
  }
  /**
   * Initialize Stripe.js library
   */
  async initialize() {
    if (!this.stripe && (this.stripe = await ve(this.publicKey), !this.stripe))
      throw new Error("Failed to initialize Stripe");
  }
  /**
   * Create a Stripe checkout session
   */
  async createSession(e) {
    if (!this.rateLimiter.tryConsume())
      throw new Error("Rate limit exceeded for Stripe session creation. Please try again later.");
    try {
      return await this.circuitBreaker.execute(async () => await g(
        async () => {
          const t = await this.routeDiscovery.buildUrl("/paywall/v1/stripe-session");
          c().debug("[StripeManager] Creating session with request:", e), e.couponCode ? c().debug("[StripeManager] Coupon code included:", e.couponCode) : c().debug("[StripeManager] No coupon code in request");
          const n = await y(t, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Idempotency-Key": T()
            },
            body: JSON.stringify(e)
          });
          if (!n.ok) {
            const a = await v(n, "Failed to create Stripe session");
            throw new Error(a);
          }
          return await n.json();
        },
        { ...b.STANDARD, name: "stripe-create-session" }
      ));
    } catch (t) {
      throw t instanceof m ? (c().error("[StripeManager] Circuit breaker is OPEN - Stripe service unavailable"), new Error("Stripe payment service is temporarily unavailable. Please try again in a few moments.")) : t;
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
    const t = await this.stripe.redirectToCheckout({ sessionId: e });
    return t.error ? {
      success: !1,
      error: t.error.message
    } : { success: !0 };
  }
  /**
   * Handle complete payment flow: create session and redirect
   */
  async processPayment(e) {
    try {
      const t = await this.createSession(e);
      return await this.redirectToCheckout(t.sessionId);
    } catch (t) {
      return {
        success: !1,
        error: k(t, "Unknown error")
      };
    }
  }
  /**
   * Create a Stripe cart checkout session for multiple items
   */
  async processCartCheckout(e) {
    const { items: t, successUrl: n, cancelUrl: a, metadata: i, customerEmail: o, couponCode: s } = e;
    if (!this.rateLimiter.tryConsume())
      return {
        success: !1,
        error: "Rate limit exceeded for cart checkout. Please try again later."
      };
    try {
      const u = await this.circuitBreaker.execute(async () => await g(
        async () => {
          const l = await this.routeDiscovery.buildUrl("/paywall/v1/cart/checkout"), d = {
            items: t,
            successUrl: n,
            cancelUrl: a,
            metadata: i,
            customerEmail: o,
            coupon: s,
            // New Rust server field
            couponCode: s
            // Legacy Go server field (backwards compat)
          }, f = await y(l, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Idempotency-Key": T()
            },
            body: JSON.stringify(d)
          });
          if (!f.ok) {
            const h = await v(f, "Failed to create cart checkout session");
            throw new Error(h);
          }
          return await f.json();
        },
        { ...b.STANDARD, name: "stripe-cart-checkout" }
      ));
      return await this.redirectToCheckout(u.sessionId);
    } catch (u) {
      return u instanceof m ? {
        success: !1,
        error: "Stripe payment service is temporarily unavailable. Please try again in a few moments."
      } : {
        success: !1,
        error: k(u, "Cart checkout failed")
      };
    }
  }
}
const Ce = "3.7.8", ut = Ce, O = typeof Buffer == "function", ce = typeof TextDecoder == "function" ? new TextDecoder() : void 0, le = typeof TextEncoder == "function" ? new TextEncoder() : void 0, dt = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=", j = Array.prototype.slice.call(dt), H = ((r) => {
  let e = {};
  return r.forEach((t, n) => e[t] = n), e;
})(j), ft = /^(?:[A-Za-z\d+\/]{4})*?(?:[A-Za-z\d+\/]{2}(?:==)?|[A-Za-z\d+\/]{3}=?)?$/, C = String.fromCharCode.bind(String), ue = typeof Uint8Array.from == "function" ? Uint8Array.from.bind(Uint8Array) : (r) => new Uint8Array(Array.prototype.slice.call(r, 0)), Se = (r) => r.replace(/=/g, "").replace(/[+\/]/g, (e) => e == "+" ? "-" : "_"), Pe = (r) => r.replace(/[^A-Za-z0-9\+\/]/g, ""), xe = (r) => {
  let e, t, n, a, i = "";
  const o = r.length % 3;
  for (let s = 0; s < r.length; ) {
    if ((t = r.charCodeAt(s++)) > 255 || (n = r.charCodeAt(s++)) > 255 || (a = r.charCodeAt(s++)) > 255)
      throw new TypeError("invalid character found");
    e = t << 16 | n << 8 | a, i += j[e >> 18 & 63] + j[e >> 12 & 63] + j[e >> 6 & 63] + j[e & 63];
  }
  return o ? i.slice(0, o - 3) + "===".substring(o) : i;
}, ne = typeof btoa == "function" ? (r) => btoa(r) : O ? (r) => Buffer.from(r, "binary").toString("base64") : xe, _ = O ? (r) => Buffer.from(r).toString("base64") : (r) => {
  let t = [];
  for (let n = 0, a = r.length; n < a; n += 4096)
    t.push(C.apply(null, r.subarray(n, n + 4096)));
  return ne(t.join(""));
}, G = (r, e = !1) => e ? Se(_(r)) : _(r), ht = (r) => {
  if (r.length < 2) {
    var e = r.charCodeAt(0);
    return e < 128 ? r : e < 2048 ? C(192 | e >>> 6) + C(128 | e & 63) : C(224 | e >>> 12 & 15) + C(128 | e >>> 6 & 63) + C(128 | e & 63);
  } else {
    var e = 65536 + (r.charCodeAt(0) - 55296) * 1024 + (r.charCodeAt(1) - 56320);
    return C(240 | e >>> 18 & 7) + C(128 | e >>> 12 & 63) + C(128 | e >>> 6 & 63) + C(128 | e & 63);
  }
}, At = /[\uD800-\uDBFF][\uDC00-\uDFFFF]|[^\x00-\x7F]/g, Te = (r) => r.replace(At, ht), de = O ? (r) => Buffer.from(r, "utf8").toString("base64") : le ? (r) => _(le.encode(r)) : (r) => ne(Te(r)), B = (r, e = !1) => e ? Se(de(r)) : de(r), fe = (r) => B(r, !0), pt = /[\xC0-\xDF][\x80-\xBF]|[\xE0-\xEF][\x80-\xBF]{2}|[\xF0-\xF7][\x80-\xBF]{3}/g, yt = (r) => {
  switch (r.length) {
    case 4:
      var e = (7 & r.charCodeAt(0)) << 18 | (63 & r.charCodeAt(1)) << 12 | (63 & r.charCodeAt(2)) << 6 | 63 & r.charCodeAt(3), t = e - 65536;
      return C((t >>> 10) + 55296) + C((t & 1023) + 56320);
    case 3:
      return C((15 & r.charCodeAt(0)) << 12 | (63 & r.charCodeAt(1)) << 6 | 63 & r.charCodeAt(2));
    default:
      return C((31 & r.charCodeAt(0)) << 6 | 63 & r.charCodeAt(1));
  }
}, ke = (r) => r.replace(pt, yt), Re = (r) => {
  if (r = r.replace(/\s+/g, ""), !ft.test(r))
    throw new TypeError("malformed base64.");
  r += "==".slice(2 - (r.length & 3));
  let e, t, n, a = [];
  for (let i = 0; i < r.length; )
    e = H[r.charAt(i++)] << 18 | H[r.charAt(i++)] << 12 | (t = H[r.charAt(i++)]) << 6 | (n = H[r.charAt(i++)]), t === 64 ? a.push(C(e >> 16 & 255)) : n === 64 ? a.push(C(e >> 16 & 255, e >> 8 & 255)) : a.push(C(e >> 16 & 255, e >> 8 & 255, e & 255));
  return a.join("");
}, ae = typeof atob == "function" ? (r) => atob(Pe(r)) : O ? (r) => Buffer.from(r, "base64").toString("binary") : Re, Me = O ? (r) => ue(Buffer.from(r, "base64")) : (r) => ue(ae(r).split("").map((e) => e.charCodeAt(0))), De = (r) => Me(Be(r)), wt = O ? (r) => Buffer.from(r, "base64").toString("utf8") : ce ? (r) => ce.decode(Me(r)) : (r) => ke(ae(r)), Be = (r) => Pe(r.replace(/[-_]/g, (e) => e == "-" ? "+" : "/")), ee = (r) => wt(Be(r)), mt = (r) => {
  if (typeof r != "string")
    return !1;
  const e = r.replace(/\s+/g, "").replace(/={0,2}$/, "");
  return !/[^\s0-9a-zA-Z\+/]/.test(e) || !/[^\s0-9a-zA-Z\-_]/.test(e);
}, Ue = (r) => ({
  value: r,
  enumerable: !1,
  writable: !0,
  configurable: !0
}), Oe = function() {
  const r = (e, t) => Object.defineProperty(String.prototype, e, Ue(t));
  r("fromBase64", function() {
    return ee(this);
  }), r("toBase64", function(e) {
    return B(this, e);
  }), r("toBase64URI", function() {
    return B(this, !0);
  }), r("toBase64URL", function() {
    return B(this, !0);
  }), r("toUint8Array", function() {
    return De(this);
  });
}, Ne = function() {
  const r = (e, t) => Object.defineProperty(Uint8Array.prototype, e, Ue(t));
  r("toBase64", function(e) {
    return G(this, e);
  }), r("toBase64URI", function() {
    return G(this, !0);
  }), r("toBase64URL", function() {
    return G(this, !0);
  });
}, gt = () => {
  Oe(), Ne();
}, z = {
  version: Ce,
  VERSION: ut,
  atob: ae,
  atobPolyfill: Re,
  btoa: ne,
  btoaPolyfill: xe,
  fromBase64: ee,
  toBase64: B,
  encode: B,
  encodeURI: fe,
  encodeURL: fe,
  utob: Te,
  btou: ke,
  decode: ee,
  isValid: mt,
  fromUint8Array: G,
  toUint8Array: De,
  extendString: Oe,
  extendUint8Array: Ne,
  extendBuiltins: gt
};
class bt {
  routeDiscovery;
  quoteRateLimiter = R(M.QUOTE);
  verifyRateLimiter = R(M.PAYMENT);
  circuitBreaker = U({
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
    const { resource: t, couponCode: n } = e;
    if (!this.quoteRateLimiter.tryConsume())
      throw new Error("Rate limit exceeded for quote requests. Please try again later.");
    try {
      return await this.circuitBreaker.execute(async () => await g(
        async () => {
          const a = "/paywall/v1/quote";
          c().debug(
            "[X402Manager] Requesting quote",
            n ? "with coupon" : "without coupon"
          );
          const i = await this.routeDiscovery.buildUrl(a), o = await y(i, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              resource: t,
              couponCode: n || null
            })
          });
          if (o.status !== 402)
            throw new Error(`Expected 402 status, got ${o.status}`);
          const s = await o.json();
          if (s.crypto)
            return s.crypto;
          if (s.accepts && s.accepts.length > 0)
            return s.accepts[0];
          throw new Error("Invalid x402 response: missing crypto or accepts field");
        },
        { ...b.QUICK, name: "x402-quote" }
      ));
    } catch (a) {
      throw a instanceof m ? (c().error("[X402Manager] Circuit breaker is OPEN - x402 service unavailable"), new Error("Payment service is temporarily unavailable. Please try again in a few moments.")) : a;
    }
  }
  /**
   * Request a cart quote for multiple items
   */
  async requestCartQuote(e) {
    const { items: t, metadata: n, couponCode: a } = e;
    if (!this.quoteRateLimiter.tryConsume())
      throw new Error("Rate limit exceeded for cart quote requests. Please try again later.");
    try {
      return await this.circuitBreaker.execute(async () => await g(
        async () => {
          const i = await this.routeDiscovery.buildUrl("/paywall/v1/cart/quote"), o = {
            items: t,
            metadata: n,
            coupon: a,
            // New Rust server field
            couponCode: a
            // Legacy Go server field (backwards compat)
          }, s = await y(i, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Idempotency-Key": T()
            },
            body: JSON.stringify(o)
          });
          if (s.status !== 402 && !s.ok) {
            const u = await v(s, "Failed to get cart quote");
            throw new Error(u);
          }
          return await s.json();
        },
        { ...b.QUICK, name: "x402-cart-quote" }
      ));
    } catch (i) {
      throw i instanceof m ? (c().error("[X402Manager] Circuit breaker is OPEN - cart quote service unavailable"), new Error("Payment service is temporarily unavailable. Please try again in a few moments.")) : i;
    }
  }
  /**
   * Build X-PAYMENT header from payment payload (base64 encoded)
   */
  buildPaymentHeader(e) {
    const t = JSON.stringify(e);
    return z.encode(t);
  }
  /**
   * Parse X-PAYMENT-RESPONSE header (base64 encoded settlement response)
   */
  parseSettlementResponse(e) {
    const t = e.headers.get("X-PAYMENT-RESPONSE");
    if (!t)
      return null;
    try {
      const n = z.decode(t), a = JSON.parse(n);
      return typeof a.success != "boolean" ? (c().error("Invalid settlement response: missing success field"), null) : a;
    } catch (n) {
      return c().error("Failed to parse settlement response:", n), null;
    }
  }
  /**
   * Retry request with payment proof
   * SECURITY: Coupon and metadata sent in X-PAYMENT header payload, NOT query strings
   */
  async submitPayment(e) {
    const {
      resource: t,
      payload: n,
      couponCode: a,
      metadata: i,
      resourceType: o = "regular"
    } = e;
    if (!this.verifyRateLimiter.tryConsume())
      return {
        success: !1,
        error: "Rate limit exceeded for payment verification. Please try again later."
      };
    try {
      return await this.circuitBreaker.execute(async () => await g(
        async () => {
          const u = {
            ...n,
            payload: {
              ...n.payload,
              resource: t,
              resourceType: o,
              metadata: {
                ...n.payload.metadata || {},
                // Preserve existing metadata
                ...i || {},
                // Layer in new metadata
                ...a ? { couponCode: a } : {}
                // Add coupon if present
              }
            }
          }, l = this.buildPaymentHeader(u), d = "/paywall/v1/verify";
          c().debug("[X402Manager] Submitting payment", {
            resourceType: o,
            hasCoupon: !!a,
            hasMetadata: !!i
          });
          const f = await this.routeDiscovery.buildUrl(d), h = await y(f, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-PAYMENT": l,
              "Idempotency-Key": T()
            }
          });
          if (h.ok) {
            const { settlement: p, transactionId: w } = await this.handlePaymentVerification(
              h,
              n.payload.signature
            );
            return {
              success: !0,
              transactionId: w,
              settlement: p || void 0
            };
          }
          return {
            success: !1,
            error: await v(h, "Payment verification failed", !0)
          };
        },
        { ...b.STANDARD, name: "x402-verify" }
      ));
    } catch (s) {
      return s instanceof m ? {
        success: !1,
        error: "Payment verification service is temporarily unavailable. Please try again in a few moments."
      } : {
        success: !1,
        error: k(s, "Unknown error")
      };
    }
  }
  /**
   * Build a complete gasless transaction on the backend
   * Returns an unsigned transaction with all instructions (compute budget, transfer, memo)
   */
  async buildGaslessTransaction(e) {
    const { resourceId: t, userWallet: n, feePayer: a, couponCode: i } = e;
    if (!this.quoteRateLimiter.tryConsume())
      throw new Error("Rate limit exceeded for gasless transaction requests. Please try again later.");
    try {
      return await this.circuitBreaker.execute(async () => await g(
        async () => {
          const o = await this.routeDiscovery.buildUrl(
            "/paywall/v1/gasless-transaction"
          ), s = await y(o, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              resourceId: t,
              userWallet: n,
              feePayer: a,
              couponCode: i
            })
          });
          if (!s.ok) {
            const u = await v(s, "Failed to build gasless transaction");
            throw new Error(u);
          }
          return await s.json();
        },
        { ...b.QUICK, name: "x402-gasless-build" }
      ));
    } catch (o) {
      throw o instanceof m ? (c().error("[X402Manager] Circuit breaker is OPEN - gasless transaction service unavailable"), new Error("Gasless transaction service is temporarily unavailable. Please try again in a few moments.")) : o;
    }
  }
  /**
   * Submit gasless partial transaction for co-signing
   * Sends the partially-signed transaction in X-Payment header for backend co-signing
   * SECURITY: Coupon and metadata sent in X-PAYMENT header payload, NOT query strings
   */
  async submitGaslessTransaction(e) {
    const {
      resource: t,
      partialTx: n,
      couponCode: a,
      metadata: i,
      resourceType: o = "regular",
      requirement: s
    } = e;
    if (!this.verifyRateLimiter.tryConsume())
      return {
        success: !1,
        error: "Rate limit exceeded for gasless transaction verification. Please try again later."
      };
    try {
      return await this.circuitBreaker.execute(async () => await g(
        async () => {
          const l = {
            x402Version: 0,
            scheme: s?.scheme || "solana-spl-transfer",
            network: s?.network || "mainnet-beta",
            payload: {
              signature: "",
              // Placeholder - backend will finalize after co-signing
              transaction: n,
              feePayer: s?.extra?.feePayer || "",
              resource: t,
              resourceType: o,
              metadata: {
                ...i || {},
                ...a ? { couponCode: a } : {}
              }
            }
          }, d = this.buildPaymentHeader(l), h = await this.routeDiscovery.buildUrl("/paywall/v1/verify"), A = await y(h, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-PAYMENT": d,
              "Idempotency-Key": T()
            }
          });
          if (A.ok) {
            const { settlement: w, transactionId: P } = await this.handlePaymentVerification(
              A,
              "gasless-tx"
            );
            return {
              success: !0,
              transactionId: P,
              settlement: w || void 0
            };
          }
          return {
            success: !1,
            error: await v(A, "Gasless transaction failed", !0)
          };
        },
        { ...b.STANDARD, name: "x402-gasless-verify" }
      ));
    } catch (u) {
      return u instanceof m ? {
        success: !1,
        error: "Gasless transaction verification service is temporarily unavailable. Please try again in a few moments."
      } : {
        success: !1,
        error: k(u, "Unknown error")
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
  async handlePaymentVerification(e, t) {
    const n = this.parseSettlementResponse(e), a = e.headers.get("Content-Type") || "";
    let i = t;
    if (a.includes("application/json"))
      try {
        i = (await e.json()).signature || t;
      } catch (o) {
        c().warn("Failed to parse JSON response body:", o);
      }
    return { settlement: n, transactionId: i };
  }
  /**
   * Validate x402 requirement structure
   */
  validateRequirement(e) {
    return !!(e.scheme && e.network && e.maxAmountRequired && e.resource && e.payTo && e.asset && e.maxTimeoutSeconds > 0);
  }
}
function vt(r) {
  if (r.length >= 255)
    throw new TypeError("Alphabet too long");
  const e = new Uint8Array(256);
  for (let l = 0; l < e.length; l++)
    e[l] = 255;
  for (let l = 0; l < r.length; l++) {
    const d = r.charAt(l), f = d.charCodeAt(0);
    if (e[f] !== 255)
      throw new TypeError(d + " is ambiguous");
    e[f] = l;
  }
  const t = r.length, n = r.charAt(0), a = Math.log(t) / Math.log(256), i = Math.log(256) / Math.log(t);
  function o(l) {
    if (l instanceof Uint8Array || (ArrayBuffer.isView(l) ? l = new Uint8Array(l.buffer, l.byteOffset, l.byteLength) : Array.isArray(l) && (l = Uint8Array.from(l))), !(l instanceof Uint8Array))
      throw new TypeError("Expected Uint8Array");
    if (l.length === 0)
      return "";
    let d = 0, f = 0, h = 0;
    const A = l.length;
    for (; h !== A && l[h] === 0; )
      h++, d++;
    const p = (A - h) * i + 1 >>> 0, w = new Uint8Array(p);
    for (; h !== A; ) {
      let x = l[h], S = 0;
      for (let E = p - 1; (x !== 0 || S < f) && E !== -1; E--, S++)
        x += 256 * w[E] >>> 0, w[E] = x % t >>> 0, x = x / t >>> 0;
      if (x !== 0)
        throw new Error("Non-zero carry");
      f = S, h++;
    }
    let P = p - f;
    for (; P !== p && w[P] === 0; )
      P++;
    let D = n.repeat(d);
    for (; P < p; ++P)
      D += r.charAt(w[P]);
    return D;
  }
  function s(l) {
    if (typeof l != "string")
      throw new TypeError("Expected String");
    if (l.length === 0)
      return new Uint8Array();
    let d = 0, f = 0, h = 0;
    for (; l[d] === n; )
      f++, d++;
    const A = (l.length - d) * a + 1 >>> 0, p = new Uint8Array(A);
    for (; d < l.length; ) {
      const x = l.charCodeAt(d);
      if (x > 255)
        return;
      let S = e[x];
      if (S === 255)
        return;
      let E = 0;
      for (let q = A - 1; (S !== 0 || E < h) && q !== -1; q--, E++)
        S += t * p[q] >>> 0, p[q] = S % 256 >>> 0, S = S / 256 >>> 0;
      if (S !== 0)
        throw new Error("Non-zero carry");
      h = E, d++;
    }
    let w = A - h;
    for (; w !== A && p[w] === 0; )
      w++;
    const P = new Uint8Array(f + (A - w));
    let D = f;
    for (; w !== A; )
      P[D++] = p[w++];
    return P;
  }
  function u(l) {
    const d = s(l);
    if (d)
      return d;
    throw new Error("Non-base" + t + " character");
  }
  return {
    encode: o,
    decodeUnsafe: s,
    decode: u
  };
}
var Et = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const he = vt(Et), Ct = "data:image/webp;base64,UklGRnIIAABXRUJQVlA4WAoAAAAYAAAAOwAAOwAAQUxQSK4BAAABkHPbtrE9+z73/RTbqWw7Lf+BbbNKbTudbZe2qy+VbVv3PmeHj05G6ohg4LaRounNMtN1voB42ABA5R7TNlx5+O7du9e3Tiwb0b4EgFyAOCQM1Z16+DWFUZC7m3uVB2zKQGBhe+77RGHonJffCL1zQuHDxQ1hrEmTatDjHIXOC2MgzpNf1tVJkWgsGhyihI7JIE74aUYp2ITFAoz9QO+ZAs7zanvkEilKbIkMJS5ANwoJmrCodYVOmBqh5zIEJjZc9xods4A4rrPGxGitrJSU71yNyH4Myl7JTEl+5zzYSH9nlkrxHBzxWUzLVEnhh+YI/gq3+UphpvA8m/s7/wg9M4bjFNg/0vplrxQ+rQEDg/xihmT23jxYJZ8UPq8OA5z77Wt405FDR4poSMjiAJhPRxUIu8D+UVonOhfNPEVHPM9juFacwo+1V6kJQ3Y9Sa8ljhPuUvRk4UdNWU9ST3b9n0W3iG5DumdS9y7o3kHVu6/75ii/dbpvrO7brvtPUf2X6f5DVf/dmpxBmauociRVbqbKCXW5qCoHVuXempxf1dZQtXFUbat/yKZTtSUBVlA4INwFAABwGgCdASo8ADwAPm0qj0WkIqEZ+zYAQAbEtgBOmZoZF+E8zGoP3X8VbcdLvma8t+jH0E+YB+ofSA8wH7VdQv0AP75/iOsG9ADy3/Y5/b/91fgI/Y7MOesb0e/q+TUR1vt7VO6mwG0imO70GM5/0P7BX6qelv7EP209lz9oDRea09ZR+SjhX7sBu/ZS7tG917rPgI3Q7XsB7luy2hAg/95C2Z1L362OH1oFziDY/K5gWoSytSAtiKvA/jW1MehBzdLzJfszPPBvGa15IYwIVRTjO2Hz5ZS9HjLMehwAAP64SgjD3qeg6NRe/Ok+iFhrG3pgglCfbam3yBaDUH36sUiQx0PB1ZZyOHq0ky+f97h6tJMvo0p9LkfXecWOFJ8J5G7yRPuL4tzGLT09QulTJw42xp2hd+lMgIa51XoHx/iftn8B2D3k92H5jOQr+uIXFHHK5FpcTG+qGEF+np0LiQa+vdW7/+ZzOLVRf7jR5X3ANPt93Ng92DW7NflVr6kMr88O/v2ZNb0vtgao2Am/R3CDKiNq89f86CT6r2L2g1oTui7H3E1yhSPQpEOz01I3fhfiMMv4weqKuoedxn/xLg5uzHa6Gte4C/dQYkG3ZFSy4CXQtRjftBrjX/Oj+HpSUPDsv0wPW+ml5NbBKDCj2f3SD8TVMf2ZfHrOkR602RVk2UmKC+H0Y9iK6k98vsgPINtz0II8X7Mj2nJkTC6IMLuQ8dNTUq9VXOnhXrdhNZoaH94ePo6baBl3hTGFAnD3/b+gR/vtbqV7wktuX6fpnjeTBe/Drp6z3neeANj/aX4CsU9w67nwYOjZhueCjxaDKUnNjLPjI1e0BoTbcOzOQ0wHJHZJ+Pt608StBu4HiJ8NjH46fnvXL3yiMoSvkAuwCE1AakA+eU1u3unyjl1/MnZQmbp8fzfsfrFesehLPcIkYdCiZ+52QbmINNTjEsvjuBuZRubBE+Laihppsxoo4efGIo0xkw0etu1+yzvkqp88w3pBq0mRl13gnnc+2zl6SmhwgmNFbz+F8qAqmdfJL8iaNSGEWlPlpczDDe62GBZMlBhQmq/XCn/1b+VazHvJXkoIFDF+wktMg+rKfLyfTlXdK0cs+Kn8h+rjMakkf3WLo1TftMLn+O+x/Gat+BGstJrM1xvCSSnHQY+NV4B4gRqyZ55gRNnqN/0lWrATOcHUaGXpkTIM/yxFjxcePcSFo+t2aJ5lShtVukETzRxaIXgRkpROeWQHWpTHOaexmXOzF0b833qJSoXMk2zB/uMrgDzKd7d3ohUz8Ra08WYKlAuMQD08bF4+jUepEspqPLoYLQ73TfmL+1LwKxyTV3gEu6WnxBPWPLnYIGYN9U47ZNlB+NgHgYtKTyii6060RAG+wN32WUVFxCZw0HMHnHFgwxD34L/anlpS7mOrjKgyuGYhFC7iHqTQHuoAO1ekBHV+rndnbETKfa1F7LxNLYq+dmJyytmQrJUCGjelorI1m/TMQNiFVrY4FCI1Gl2W1JsZsw9zA+Bh3JmjkC0H5/0JV6JotNMatJIZ4v5PqwJe3r8xd+FNS3ynccdu+xtVdc27qwVdoomciZD5oXYey9KAFSAKO594sBKZNWUJTLXnt0BJbdF8FkQYvg3DQajYY2p+ixd5Ag7o92gw0pVVDDOP+WQxiEmKqgWJyTBsnsBk2Bxi2Unsv8S/4PmE8Hy/vy+Mij+aTAKZvg716IHfHX0/JMeFfmAnsZ39Q0qkfdPtq6+CxbGZ7wKDsK/8l/MVGuyd6faJFt5wyoOXuNrr3JC9EoBmjcOzkVw/6RNP49poZ1xzsX3q7B4HGfI/XSfRQq3HeZ2j12d0E3gCAube4oExaT1sx/v8F+f61QOsGdSaqM2im6qOGkSRkrRQ7L8hvS8vEYJeVkAbFvX5ov7e/egYYNToMHj651c5/rCVYtB9Ned6GvGN8R0x3t7+lsf8+ofhHRzpyvwxd6c5pREZVOKnXzplhJ61mki4JmAAAABFWElGugAAAEV4aWYAAElJKgAIAAAABgASAQMAAQAAAAEAAAAaAQUAAQAAAFYAAAAbAQUAAQAAAF4AAAAoAQMAAQAAAAIAAAATAgMAAQAAAAEAAABphwQAAQAAAGYAAAAAAAAASAAAAAEAAABIAAAAAQAAAAYAAJAHAAQAAAAwMjEwAZEHAAQAAAABAgMAAKAHAAQAAAAwMTAwAaADAAEAAAD//wAAAqAEAAEAAAA8AAAAA6AEAAEAAAA8AAAAAAAAAA==", St = "data:image/svg+xml,%3csvg%20width='868'%20height='868'%20viewBox='0%200%20868%20868'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3e%3ccircle%20cx='434'%20cy='434'%20r='434'%20fill='%231B262D'/%3e%3cpath%20fill-rule='evenodd'%20clip-rule='evenodd'%20d='M234.563%20184H640.697C650.387%20184%20659.339%20189.164%20664.172%20197.542L782.495%20402.657C788.631%20413.294%20786.808%20426.72%20778.056%20435.346L452.368%20756.327C441.818%20766.724%20424.846%20766.724%20414.296%20756.327L89.0484%20435.78C80.0927%20426.954%2078.4157%20413.136%2085.0013%20402.433L211.48%20196.884C216.405%20188.879%20225.146%20184%20234.563%20184ZM588.257%20275.577V333.129H472.567V373.032C553.82%20377.296%20614.782%20394.81%20615.234%20415.802L615.231%20459.563C614.779%20480.556%20553.82%20498.069%20472.567%20502.333V600.259H395.746V502.333C314.492%20498.069%20253.531%20480.555%20253.078%20459.563L253.081%20415.802C253.533%20394.81%20314.492%20377.296%20395.746%20373.032V333.129H280.055V275.577H588.257ZM434.156%20472.268C520.868%20472.268%20593.345%20457.459%20611.082%20437.683C596.041%20420.912%20541.636%20407.713%20472.567%20404.089V445.867C460.187%20446.516%20447.336%20446.858%20434.156%20446.858C420.976%20446.858%20408.125%20446.516%20395.746%20445.867V404.089C326.676%20407.713%20272.271%20420.912%20257.23%20437.683C274.968%20457.459%20347.444%20472.268%20434.156%20472.268Z'%20fill='%23009393'/%3e%3c/svg%3e", Pt = "data:image/webp;base64,UklGRqwEAABXRUJQVlA4WAoAAAAYAAAAOwAAOwAAQUxQSL8BAAABkGvbtmlLc5997yvbmW19gBnbDm2kjF5UmW3bthXZVZFdZ+81r+87Z1XlEaHIbSNlMstwos4XUBSTLAFQo/u01Zdf/yLDDze3zB/YwADJEoOoJAKg7oTdH4SF+XxiZlMgSESzwAJdVn2iUJzzOUMiLhQKf+/va2FtBLMBuu1zpHcsincUXhtoTKLsCTVX/KF3wrLhPLm/OWzZtjQWfZ7RhYyAC/lxMowpSzJYJAyFkZDQc21FBMUT7BqGjpHxf3m+XlEPUHE/f3vGgPzmw4awRUaTexkyJhwfNShctVgZXyJDXq4CUyjNy6Y4fVOBIkAPR2GcOE7Jm2NQ/RE9YzXht3a5VYvlOX0xF0fy+tp/ozBuQg6DzZYb6Bi7ed4rB5Mp/1Co4cNhLUo1StLxDIDqrynUoRswiF6nFnIxsDpnZ5WBW0GFZ1qZ8HfLDk5txHHsGDpSa6B0cXZEa+DsTr1M+P4qPdXwjynU4+1/a7oN3Sm6G+meSd27oHsHde++7puj+tYpv7G6b7vun6L7l6n+oZp/t7JmUNUqqhpJV5upakJVLaqqgVW1t6rmV401NGMc1djqH4rpIseSfyPFkgAAVlA4IAQCAABQDACdASo8ADwAPm0yk0akIyGhJgzogA2JaQAThroHvLxu+aPf5G2BYxv+B6XHzx6GPon/o+qz/tOAA/TM82gR0vnExWoiQRM36jlg2UIvwCSqySErzuguz9EP2x/7hsNazr91aIworWI7AAD+/TZ+6Ipl444OdT+2wU0Ov+T8oJuVP/vUbT/w1Jsv6Awnl6rvF/xetfOPt3gTQZZi0Y/AOx563J7CJkqTR/fc/n34zyeKzR80fhfv4ef+Hjhz/CX5aQo+58zg/FdE+7bLoophGfG0szI513EH+q+Gc73H1PFdJYf7CF8v5dhr3tMwEVX5Ji2ZxejK8xrf/E6nVXqlA4DrYNRP09InHc+fEqO/fH8xr+rMf4y1F9TOnwVffZblLoTP6lot0m/sh7sTiDQr0mIA8TiHoOffGDG6KzV+B3239udfhzD740gkRi/m53abX0Ku3vAgadgFFqL0vk8M/4aI+cI+0fbLW17mWGeMu21wSRRQiv5iNgGKR3vEGXAItcLDft1uUzWAfbe1X3zK/ymT7bA/76PB6UUknm+Y5MM4osurUXU/k7P38pN/3slnGfpFzjl4c3USY4mH9ZCJYUuC/kGEnq/yRPalPdODNFvW6s8MiQeQejYNRY0LsJ0WXkK8vXiDmihCivYAOPoSovesL7on+WAArDNM/BcQSQvCYABFWElGugAAAEV4aWYAAElJKgAIAAAABgASAQMAAQAAAAEAAAAaAQUAAQAAAFYAAAAbAQUAAQAAAF4AAAAoAQMAAQAAAAIAAAATAgMAAQAAAAEAAABphwQAAQAAAGYAAAAAAAAASAAAAAEAAABIAAAAAQAAAAYAAJAHAAQAAAAwMjEwAZEHAAQAAAABAgMAAKAHAAQAAAAwMTAwAaADAAEAAAD//wAAAqAEAAEAAAA8AAAAA6AEAAEAAAA8AAAAAAAAAA==", xt = "data:image/webp;base64,UklGRtgCAABXRUJQVlA4WAoAAAAIAAAAOwAAOwAAVlA4IPgBAABQCwCdASo8ADwAPm0wk0ekIqGhKBQMqIANiWkADPF3uV2D8VcQGk1mg+P36i9SLnZvYAQxszEWYzEwX1RVkqG/4BGbJgMSHqhKDFsjWsGfPPrvfef11goNmCDDlBJHVVD+8gAA/vu4q03kl+E7FpjtZ2gc8pQ619Hjv9NywoRZ6az43C1wcrRr/lWzJlJhLWMHN0MkVl1ueAf6Hn8StVzeUfMBXOKkgfe2msx7QWR5PnHW/5c6/35yrtWnrURc2q6UYlGin+v8C2dQqexkW6rX2EEijTI9eEQ46PWH3/59fM2AlMvvR2abaRk5XX7V1triQncRxvMfz5YmYDN+PY/ikcZUNaiFucKoUq5riv0eKCezuFNHecE11ojwJqWRSTWpalkz5autXp6vFS+FT1tWUsB/fs1CCOZxaA1vR1grOEaiuKe1RYm7e05psWtqbXLVmm1bA8Ly9PFkVdCbc6hR3UuBBsFGnVeGOUeMn2onnfvYhBMcM9YPxGdQkwZLXOk1VuQSTk01Shf3fZrFyRlFauftFdPYhKXwqrr+meav1P+KLKBVosqmHnFFfgExsQ/rOf3TSd+mOqQfJA+cF+HojNU7nmM3uDkoCBi+//Gqp+gPNNW8M4LFrol8rxE+7WsjqMgfwv1f+Nr25RtG1Wa/KkniRCAAAABFWElGugAAAEV4aWYAAElJKgAIAAAABgASAQMAAQAAAAEAAAAaAQUAAQAAAFYAAAAbAQUAAQAAAF4AAAAoAQMAAQAAAAIAAAATAgMAAQAAAAEAAABphwQAAQAAAGYAAAAAAAAASAAAAAEAAABIAAAAAQAAAAYAAJAHAAQAAAAwMjEwAZEHAAQAAAABAgMAAKAHAAQAAAAwMTAwAaADAAEAAAD//wAAAqAEAAEAAAA8AAAAA6AEAAEAAAA8AAAAAAAAAA==", Tt = {
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: {
    symbol: "USDC",
    decimals: 6,
    icon: Ct
  },
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: {
    symbol: "USDT",
    decimals: 6,
    icon: St
  },
  "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo": {
    symbol: "PYUSD",
    decimals: 6,
    icon: Pt
  },
  CASHx9KJUStyftLFWGvEVf59SGeG9sh5FfcnZMVPCASH: {
    symbol: "CASH",
    decimals: 6,
    icon: xt
  }
}, te = Object.fromEntries(
  Object.entries(Tt).map(([r, e]) => [r, e.symbol])
);
function kt(r) {
  return r in te;
}
function Ie(r, e = "token mint", t = !1) {
  if (!r || r.trim().length === 0)
    return {
      isValid: !0,
      isKnownStablecoin: !1
    };
  const n = r.trim();
  if (kt(n))
    return {
      isValid: !0,
      isKnownStablecoin: !0,
      symbol: te[n]
    };
  const a = Object.entries(te).map(([i, o]) => `  ${o}: ${i}`).join(`
`);
  return t ? {
    isValid: !0,
    // Allow but warn
    isKnownStablecoin: !1,
    warning: [
      `Warning: Unrecognized token mint address in ${e}`,
      `  Provided: ${n}`,
      "",
      "This token mint does not match any known stablecoin addresses.",
      "You have set dangerouslyAllowUnknownMint=true, so this will proceed.",
      "If this is a typo, payments will be sent to the wrong token and funds will be PERMANENTLY LOST.",
      "",
      "Known stablecoin mints (mainnet-beta):",
      a,
      "",
      "Double-check your token mint address before deploying to production."
    ].join(`
`)
  } : {
    isValid: !1,
    isKnownStablecoin: !1,
    error: [
      `SAFETY ERROR: Unrecognized token mint address in ${e}`,
      `  Provided: ${n}`,
      "",
      "This token mint does not match any known stablecoin addresses.",
      "Using an unknown token mint can result in PERMANENT LOSS OF FUNDS if it's a typo.",
      "",
      "Known stablecoin mints (mainnet-beta):",
      a,
      "",
      "If you are CERTAIN this is the correct mint address (custom token, testnet, or new stablecoin),",
      "set dangerouslyAllowUnknownMint={true} in your CedrosProvider config:",
      "",
      "  <CedrosProvider",
      "    config={{",
      "      ...",
      '      tokenMint: "' + n + '",',
      "      dangerouslyAllowUnknownMint: true, // ⚠️ I have verified this mint address",
      "    }}",
      "  />",
      "",
      "⚠️ WARNING: Only enable dangerouslyAllowUnknownMint if you have TRIPLE-CHECKED the mint address."
    ].join(`
`)
  };
}
function Rt(r, e = "unknown", t = !1) {
  return Ie(r, `X402Requirement (resource: ${e})`, t);
}
class Mt {
  connection;
  cluster;
  endpoint;
  allowUnknownMint;
  rpcRateLimiter = R({
    maxRequests: 50,
    windowMs: 6e4
    // 50 requests per minute for RPC calls
  });
  rpcCircuitBreaker = U({
    failureThreshold: 5,
    timeout: 1e4,
    // 10 seconds for faster recovery in payment flows
    name: "solana-rpc"
  });
  constructor(e = "mainnet-beta", t, n = !1) {
    this.cluster = e, this.endpoint = t, this.allowUnknownMint = n, this.connection = this.createConnection();
  }
  /**
   * Create Solana RPC connection
   */
  createConnection() {
    const e = this.endpoint ?? je(this.cluster);
    return new ze(e, "confirmed");
  }
  /**
   * Transform RPC errors into user-friendly messages
   */
  transformRpcError(e) {
    const t = e instanceof Error ? e.message : typeof e == "string" ? e : String(e);
    return t.includes("403") || t.includes("Access forbidden") ? new Error(
      "Public Solana RPC access denied. Please configure a custom RPC endpoint (e.g., from Helius, QuickNode, or Alchemy) in your CedrosProvider config using the solanaEndpoint option."
    ) : t.includes("429") || t.includes("Too Many Requests") ? new Error(
      "Solana RPC rate limit exceeded. Please configure a custom RPC endpoint with higher limits in your CedrosProvider config using the solanaEndpoint option."
    ) : e instanceof Error ? e : new Error(t);
  }
  /**
   * Build transaction from x402 requirement
   */
  async buildTransaction(e) {
    const { requirement: t, payerPublicKey: n, blockhash: a } = e;
    if (!t || !t.payTo)
      throw new Error("Invalid requirement: missing payTo");
    c().debug("[WalletManager] Building transaction for resource:", t.resource);
    const i = new oe(), o = this.resolveAmountInMinorUnits(t), s = t.asset;
    if (!s)
      throw new Error("asset is required in x402 requirement");
    const u = Rt(s, t.resource, this.allowUnknownMint);
    if (!u.isValid && u.error)
      throw new Error(u.error);
    u.warning && c().warn(u.warning);
    const l = new N(s), d = await Qe(
      l,
      n
    );
    if (!this.rpcRateLimiter.tryConsume())
      throw new Error("RPC rate limit exceeded. Please try again in a moment.");
    let f;
    try {
      f = await this.rpcCircuitBreaker.execute(async () => await g(
        async () => await this.connection.getAccountInfo(d),
        { ...b.QUICK, name: "rpc-get-account-info" }
      ));
    } catch (p) {
      throw p instanceof m ? new Error("Solana RPC service is temporarily unavailable. Please try again in a few moments.") : this.transformRpcError(p);
    }
    if (!f)
      throw new Error("Payer is missing an associated token account for this mint");
    let h;
    try {
      h = t.extra?.recipientTokenAccount ? new N(t.extra.recipientTokenAccount) : new N(t.payTo);
    } catch {
      throw new Error("We are currently unable to process payment, please try again later");
    }
    if (i.add(
      We(
        d,
        h,
        n,
        o
      )
    ), t.extra?.memo) {
      const { TransactionInstruction: p } = await import("@solana/web3.js"), w = new p({
        keys: [],
        programId: new N("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
        data: Buffer.from(t.extra.memo, "utf8")
      });
      i.add(w);
    }
    let A;
    if (a)
      A = a;
    else {
      if (!this.rpcRateLimiter.tryConsume())
        throw new Error("RPC rate limit exceeded. Please try again in a moment.");
      try {
        A = (await this.rpcCircuitBreaker.execute(async () => await g(
          async () => await this.connection.getLatestBlockhash(),
          { ...b.QUICK, name: "rpc-get-blockhash" }
        ))).blockhash;
      } catch (p) {
        throw p instanceof m ? new Error("Solana RPC service is temporarily unavailable. Please try again in a few moments.") : this.transformRpcError(p);
      }
    }
    return i.recentBlockhash = A, t.extra?.feePayer ? i.feePayer = new N(t.extra.feePayer) : i.feePayer = n, i;
  }
  /**
   * Parse amount from x402 requirement (already in atomic units as string)
   */
  resolveAmountInMinorUnits(e) {
    const t = parseInt(e.maxAmountRequired, 10);
    if (Number.isNaN(t) || t <= 0)
      throw new Error("Invalid maxAmountRequired in requirement");
    return t;
  }
  /**
   * Build payment payload from signed transaction (x402 spec)
   */
  buildPaymentPayload(e) {
    const { requirement: t, signedTx: n, payerPublicKey: a } = e;
    return {
      x402Version: 0,
      scheme: t.scheme,
      network: t.network,
      payload: {
        signature: n.signature,
        transaction: n.serialized,
        payer: a.toString(),
        memo: t.extra?.memo,
        recipientTokenAccount: t.extra?.recipientTokenAccount
      }
    };
  }
  /**
   * Sign transaction using wallet adapter (fully signed for regular mode)
   */
  async signTransaction(e) {
    const { transaction: t, signTransaction: n } = e;
    c().debug("[WalletManager] Requesting wallet to sign transaction");
    const a = await n(t), i = a.serialize(), o = a.signatures[0]?.signature;
    if (!o)
      throw new Error("Signed transaction missing signature");
    const s = he.encode(o);
    return c().debug("[WalletManager] Transaction signed with signature:", s.substring(0, 20) + "..."), {
      serialized: z.fromUint8Array(i),
      signature: s
    };
  }
  /**
   * Deserialize a base64-encoded transaction from the backend
   * Used for gasless flow where backend builds the complete transaction
   */
  deserializeTransaction(e) {
    try {
      const t = z.toUint8Array(e);
      return oe.from(t);
    } catch (t) {
      throw new Error(
        `Failed to deserialize transaction: ${k(t, "Unknown error")}`
      );
    }
  }
  /**
   * Partially sign transaction for gasless mode
   * User signs their authority, server will co-sign as fee payer
   */
  async partiallySignTransaction(e) {
    const { transaction: t, signTransaction: n, blockhash: a } = e;
    a && t.recentBlockhash !== a && (t.recentBlockhash = a);
    const i = await n(t), o = i.signatures[0]?.signature;
    if (o) {
      const u = he.encode(o);
      c().debug("[WalletManager] Partially signed with signature:", u.substring(0, 20) + "...");
    }
    const s = i.serialize({
      requireAllSignatures: !1,
      verifySignatures: !1
    });
    return z.fromUint8Array(s);
  }
  /**
   * Get wallet balance
   */
  async getBalance(e) {
    if (!this.rpcRateLimiter.tryConsume())
      throw new Error("RPC rate limit exceeded. Please try again in a moment.");
    try {
      return await this.rpcCircuitBreaker.execute(async () => await g(
        async () => await this.connection.getBalance(e),
        { ...b.QUICK, name: "rpc-get-balance" }
      )) / qe;
    } catch (t) {
      throw t instanceof m ? new Error("Solana RPC service is temporarily unavailable. Please try again in a few moments.") : this.transformRpcError(t);
    }
  }
  /**
   * Verify transaction on-chain
   */
  async verifyTransaction(e) {
    if (!this.rpcRateLimiter.tryConsume())
      return c().warn("[WalletManager] RPC rate limit exceeded for transaction verification"), !1;
    try {
      return !!(await this.rpcCircuitBreaker.execute(async () => await g(
        async () => await this.connection.getSignatureStatus(e),
        { ...b.QUICK, name: "rpc-verify-tx" }
      ))).value?.confirmationStatus;
    } catch (t) {
      return t instanceof m && c().warn("[WalletManager] Circuit breaker OPEN - cannot verify transaction"), !1;
    }
  }
}
class Dt {
  stripe = null;
  publicKey;
  routeDiscovery;
  // Separate rate limiters for different operation types
  sessionRateLimiter = R(M.PAYMENT);
  statusRateLimiter = R(M.QUOTE);
  circuitBreaker = U({
    failureThreshold: 5,
    timeout: 1e4,
    // 10 seconds for faster recovery
    name: "subscription-manager"
  });
  constructor(e, t) {
    this.publicKey = e, this.routeDiscovery = t;
  }
  /** Initialize Stripe.js library */
  async initialize() {
    if (!this.stripe && (this.stripe = await ve(this.publicKey), !this.stripe))
      throw new Error("Failed to initialize Stripe");
  }
  /** Internal helper: execute with rate limiting, circuit breaker, and retry */
  async executeWithResilience(e, t, n, a) {
    if (!e.tryConsume())
      throw new Error("Rate limit exceeded. Please try again later.");
    try {
      return await this.circuitBreaker.execute(
        () => g(t, { ...b.STANDARD, name: n })
      );
    } catch (i) {
      throw i instanceof m ? (c().error(`[SubscriptionManager] Circuit breaker OPEN for ${a}`), new Error("Service temporarily unavailable. Please try again in a few moments.")) : i;
    }
  }
  /**
   * Create a Stripe subscription checkout session
   */
  async createSubscriptionSession(e) {
    if (!this.sessionRateLimiter.tryConsume())
      throw new Error("Rate limit exceeded for subscription session creation. Please try again later.");
    try {
      return await this.circuitBreaker.execute(async () => await g(
        async () => {
          const t = await this.routeDiscovery.buildUrl("/paywall/v1/subscription/stripe-session");
          c().debug("[SubscriptionManager] Creating subscription session:", {
            resource: e.resource,
            interval: e.interval,
            trialDays: e.trialDays
          });
          const n = await y(t, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Idempotency-Key": T()
            },
            body: JSON.stringify(e)
          });
          if (!n.ok) {
            const a = await v(
              n,
              "Failed to create subscription session"
            );
            throw new Error(a);
          }
          return await n.json();
        },
        { ...b.STANDARD, name: "subscription-create-session" }
      ));
    } catch (t) {
      throw t instanceof m ? (c().error("[SubscriptionManager] Circuit breaker is OPEN - service unavailable"), new Error(
        "Subscription service is temporarily unavailable. Please try again in a few moments."
      )) : t;
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
    const t = await this.stripe.redirectToCheckout({ sessionId: e });
    return t.error ? {
      success: !1,
      error: t.error.message
    } : { success: !0, transactionId: e };
  }
  /**
   * Complete subscription flow: create session and redirect
   */
  async processSubscription(e) {
    try {
      const t = await this.createSubscriptionSession(e);
      return await this.redirectToCheckout(t.sessionId);
    } catch (t) {
      return {
        success: !1,
        error: k(t, "Subscription failed")
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
      return await this.circuitBreaker.execute(async () => await g(
        async () => {
          const t = new URLSearchParams({
            resource: e.resource,
            userId: e.userId
          }), n = await this.routeDiscovery.buildUrl(
            `/paywall/v1/subscription/status?${t.toString()}`
          );
          c().debug("[SubscriptionManager] Checking subscription status:", e);
          const a = await y(n, {
            method: "GET",
            headers: {
              "Content-Type": "application/json"
            }
          });
          if (!a.ok) {
            const i = await v(
              a,
              "Failed to check subscription status"
            );
            throw new Error(i);
          }
          return await a.json();
        },
        { ...b.STANDARD, name: "subscription-status-check" }
      ));
    } catch (t) {
      throw t instanceof m ? (c().error("[SubscriptionManager] Circuit breaker is OPEN for status check"), new Error(
        "Subscription status service is temporarily unavailable. Please try again in a few moments."
      )) : t;
    }
  }
  /**
   * Request a subscription quote for x402 crypto payment
   */
  async requestSubscriptionQuote(e, t, n) {
    if (!this.statusRateLimiter.tryConsume())
      throw new Error("Rate limit exceeded for subscription quote. Please try again later.");
    try {
      return await this.circuitBreaker.execute(async () => await g(
        async () => {
          const a = await this.routeDiscovery.buildUrl("/paywall/v1/subscription/quote"), i = {
            resource: e,
            interval: t,
            couponCode: n?.couponCode,
            intervalDays: n?.intervalDays
          };
          c().debug("[SubscriptionManager] Requesting subscription quote:", i);
          const o = await y(a, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(i)
          });
          if (o.status !== 402 && !o.ok) {
            const s = await v(
              o,
              "Failed to get subscription quote"
            );
            throw new Error(s);
          }
          return await o.json();
        },
        { ...b.STANDARD, name: "subscription-quote" }
      ));
    } catch (a) {
      throw a instanceof m ? (c().error("[SubscriptionManager] Circuit breaker is OPEN for quote"), new Error(
        "Subscription quote service is temporarily unavailable. Please try again in a few moments."
      )) : a;
    }
  }
  /** Cancel a subscription */
  async cancelSubscription(e) {
    return this.executeWithResilience(
      this.sessionRateLimiter,
      async () => {
        const t = await this.routeDiscovery.buildUrl("/paywall/v1/subscription/cancel");
        c().debug("[SubscriptionManager] Canceling subscription:", e);
        const n = await y(t, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(e)
        });
        if (!n.ok) throw new Error(await v(n, "Failed to cancel"));
        return await n.json();
      },
      "subscription-cancel",
      "cancellation"
    );
  }
  /** Get Stripe billing portal URL for subscription management */
  async getBillingPortalUrl(e) {
    return this.executeWithResilience(
      this.statusRateLimiter,
      async () => {
        const t = await this.routeDiscovery.buildUrl("/paywall/v1/subscription/portal");
        c().debug("[SubscriptionManager] Getting billing portal URL:", e);
        const n = await y(t, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(e)
        });
        if (!n.ok) throw new Error(await v(n, "Failed to get portal"));
        return await n.json();
      },
      "subscription-portal",
      "portal"
    );
  }
  /** Activate x402 subscription after payment verification */
  async activateX402Subscription(e) {
    return this.executeWithResilience(
      this.sessionRateLimiter,
      async () => {
        const t = await this.routeDiscovery.buildUrl("/paywall/v1/subscription/x402/activate");
        c().debug("[SubscriptionManager] Activating x402 subscription:", e);
        const n = await y(t, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(e)
        });
        if (!n.ok) throw new Error(await v(n, "Failed to activate"));
        return await n.json();
      },
      "subscription-activate",
      "activation"
    );
  }
}
class Bt {
  routeDiscovery;
  rateLimiter = R(M.PAYMENT);
  queryRateLimiter = R(M.QUOTE);
  circuitBreaker = U({
    failureThreshold: 5,
    timeout: 1e4,
    name: "subscription-change-manager"
  });
  constructor(e) {
    this.routeDiscovery = e;
  }
  /** Internal helper: execute with rate limiting, circuit breaker, and retry */
  async executeWithResilience(e, t, n, a) {
    if (!e.tryConsume())
      throw new Error("Rate limit exceeded. Please try again later.");
    try {
      return await this.circuitBreaker.execute(
        () => g(t, { ...b.STANDARD, name: n })
      );
    } catch (i) {
      throw i instanceof m ? (c().error(`[SubscriptionChangeManager] Circuit breaker OPEN for ${a}`), new Error("Service temporarily unavailable. Please try again in a few moments.")) : i;
    }
  }
  /** Change subscription plan (upgrade or downgrade) */
  async changeSubscription(e) {
    return this.executeWithResilience(
      this.rateLimiter,
      async () => {
        const t = await this.routeDiscovery.buildUrl("/paywall/v1/subscription/change");
        c().debug("[SubscriptionChangeManager] Changing subscription:", e);
        const n = await y(t, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Idempotency-Key": T() },
          body: JSON.stringify(e)
        });
        if (!n.ok)
          throw new Error(await v(n, "Failed to change subscription"));
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
        const t = await this.routeDiscovery.buildUrl("/paywall/v1/subscription/change/preview");
        c().debug("[SubscriptionChangeManager] Previewing subscription change:", e);
        const n = await y(t, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(e)
        });
        if (!n.ok)
          throw new Error(await v(n, "Failed to preview change"));
        return await n.json();
      },
      "subscription-preview",
      "change preview"
    );
  }
  /** Get full subscription details */
  async getDetails(e, t) {
    return this.executeWithResilience(
      this.queryRateLimiter,
      async () => {
        const n = new URLSearchParams({ resource: e, userId: t }), a = await this.routeDiscovery.buildUrl(`/paywall/v1/subscription/details?${n}`);
        c().debug("[SubscriptionChangeManager] Getting subscription details:", { resource: e, userId: t });
        const i = await y(a, {
          method: "GET",
          headers: { "Content-Type": "application/json" }
        });
        if (!i.ok)
          throw new Error(await v(i, "Failed to get subscription details"));
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
        const t = await this.routeDiscovery.buildUrl("/paywall/v1/subscription/cancel");
        c().debug("[SubscriptionChangeManager] Canceling subscription:", e);
        const n = await y(t, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(e)
        });
        if (!n.ok)
          throw new Error(await v(n, "Failed to cancel subscription"));
        return await n.json();
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
        const t = await this.routeDiscovery.buildUrl("/paywall/v1/subscription/portal");
        c().debug("[SubscriptionChangeManager] Getting billing portal URL:", e);
        const n = await y(t, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(e)
        });
        if (!n.ok)
          throw new Error(await v(n, "Failed to get billing portal URL"));
        return await n.json();
      },
      "subscription-portal",
      "portal"
    );
  }
}
class Ut {
  routeDiscovery;
  rateLimiter = R(M.PAYMENT);
  circuitBreaker = U({
    failureThreshold: 5,
    timeout: 1e4,
    name: "credits-manager"
  });
  constructor(e) {
    this.routeDiscovery = e;
  }
  async requestQuote(e, t) {
    if (!this.rateLimiter.tryConsume())
      throw new Error("Rate limit exceeded for credits quote. Please try again later.");
    try {
      return await this.circuitBreaker.execute(async () => await g(
        async () => {
          const n = await this.routeDiscovery.buildUrl("/paywall/v1/quote");
          c().debug("[CreditsManager] Requesting quote for resource:", e);
          const a = await y(n, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ resource: e, couponCode: t })
          });
          if (a.status === 402)
            return (await a.json()).credits || null;
          if (!a.ok) {
            const i = await v(a, "Failed to get credits quote");
            throw new Error(i);
          }
          return null;
        },
        { ...b.STANDARD, name: "credits-quote" }
      ));
    } catch (n) {
      throw n instanceof m ? (c().error("[CreditsManager] Circuit breaker is OPEN - credits service unavailable"), new Error("Credits service is temporarily unavailable. Please try again in a few moments.")) : n;
    }
  }
  async requestCartQuote(e, t) {
    if (!this.rateLimiter.tryConsume())
      throw new Error("Rate limit exceeded for cart credits quote. Please try again later.");
    try {
      return await this.circuitBreaker.execute(async () => await g(
        async () => {
          const n = await this.routeDiscovery.buildUrl("/paywall/v1/cart/quote");
          c().debug("[CreditsManager] Requesting cart quote for items:", e.length);
          const a = await y(n, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items: e, couponCode: t })
          });
          if (!a.ok) {
            const o = await v(a, "Failed to get cart credits quote");
            throw new Error(o);
          }
          const i = await a.json();
          return i.credits ? {
            cartId: i.cartId,
            credits: i.credits
          } : null;
        },
        { ...b.STANDARD, name: "credits-cart-quote" }
      ));
    } catch (n) {
      throw n instanceof m ? new Error("Credits service is temporarily unavailable. Please try again in a few moments.") : n;
    }
  }
  /**
   * Create a hold on user's credits
   * Requires Authorization header with cedros-login JWT token
   */
  async createHold(e) {
    const { resource: t, couponCode: n, authToken: a } = e;
    if (!this.rateLimiter.tryConsume())
      throw new Error("Rate limit exceeded for credits hold. Please try again later.");
    try {
      return await this.circuitBreaker.execute(async () => await g(
        async () => {
          const i = await this.routeDiscovery.buildUrl("/paywall/v1/credits/hold");
          c().debug("[CreditsManager] Creating hold for resource:", t);
          const o = await y(i, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${a}`,
              "Idempotency-Key": T()
            },
            body: JSON.stringify({ resource: t, couponCode: n })
          });
          if (!o.ok) {
            const s = await v(o, "Failed to create credits hold");
            throw new Error(s);
          }
          return await o.json();
        },
        { ...b.STANDARD, name: "credits-create-hold" }
      ));
    } catch (i) {
      throw i instanceof m ? new Error("Credits service is temporarily unavailable. Please try again in a few moments.") : i;
    }
  }
  /**
   * Create a hold on user's credits for a cart
   * Requires Authorization header with cedros-login JWT token
   */
  async createCartHold(e) {
    const { cartId: t, authToken: n } = e;
    if (!this.rateLimiter.tryConsume())
      throw new Error("Rate limit exceeded for cart credits hold. Please try again later.");
    try {
      return await this.circuitBreaker.execute(async () => await g(
        async () => {
          const a = await this.routeDiscovery.buildUrl(`/paywall/v1/cart/${t}/credits/hold`);
          c().debug("[CreditsManager] Creating cart hold for cart:", t);
          const i = await y(a, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${n}`,
              "Idempotency-Key": T()
            },
            body: JSON.stringify({})
          });
          if (!i.ok) {
            const o = await v(i, "Failed to create cart credits hold");
            throw new Error(o);
          }
          return await i.json();
        },
        { ...b.STANDARD, name: "credits-create-cart-hold" }
      ));
    } catch (a) {
      throw a instanceof m ? new Error("Credits service is temporarily unavailable. Please try again in a few moments.") : a;
    }
  }
  async authorizePayment(e) {
    const { resource: t, holdId: n, couponCode: a, authToken: i, metadata: o } = e;
    if (!this.rateLimiter.tryConsume())
      return {
        success: !1,
        error: "Rate limit exceeded for credits authorization. Please try again later.",
        errorCode: "rate_limit_exceeded"
      };
    try {
      return await this.circuitBreaker.execute(async () => await g(
        async () => {
          const s = await this.routeDiscovery.buildUrl("/paywall/v1/credits/authorize");
          c().debug("[CreditsManager] Authorizing payment for resource:", t);
          const u = await y(s, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${i}`,
              "Idempotency-Key": T()
            },
            body: JSON.stringify({
              resource: t,
              holdId: n,
              couponCode: a,
              ...o && { metadata: o }
            })
          });
          if (!u.ok) {
            const d = await u.json().catch(() => ({}));
            return {
              success: !1,
              error: d.error?.message || "Credits authorization failed",
              errorCode: d.error?.code || "authorization_failed"
            };
          }
          return {
            success: !0,
            transactionId: (await u.json()).transactionId
          };
        },
        { ...b.STANDARD, name: "credits-authorize" }
      ));
    } catch (s) {
      return s instanceof m ? {
        success: !1,
        error: "Credits service is temporarily unavailable. Please try again in a few moments.",
        errorCode: "service_unavailable"
      } : {
        success: !1,
        error: k(s, "Credits authorization failed"),
        errorCode: "authorization_failed"
      };
    }
  }
  async authorizeCartPayment(e) {
    const { cartId: t, holdId: n, authToken: a, metadata: i } = e;
    if (!this.rateLimiter.tryConsume())
      return {
        success: !1,
        error: "Rate limit exceeded for cart credits authorization. Please try again later.",
        errorCode: "rate_limit_exceeded"
      };
    try {
      return await this.circuitBreaker.execute(async () => await g(
        async () => {
          const o = await this.routeDiscovery.buildUrl(`/paywall/v1/cart/${t}/credits/authorize`);
          c().debug("[CreditsManager] Authorizing cart payment for cart:", t);
          const s = await y(o, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${a}`,
              "Idempotency-Key": T()
            },
            body: JSON.stringify({
              holdId: n,
              ...i && { metadata: i }
            })
          });
          if (!s.ok) {
            const l = await s.json().catch((d) => (c().error("[CreditsManager] Failed to parse error response JSON:", d, {
              cartId: t,
              status: s.status,
              statusText: s.statusText
            }), {}));
            return {
              success: !1,
              error: l.error?.message || "Cart credits authorization failed",
              errorCode: l.error?.code || "authorization_failed"
            };
          }
          return {
            success: !0,
            transactionId: (await s.json()).transactionId
          };
        },
        { ...b.STANDARD, name: "credits-cart-authorize" }
      ));
    } catch (o) {
      return o instanceof m ? {
        success: !1,
        error: "Credits service is temporarily unavailable. Please try again in a few moments.",
        errorCode: "service_unavailable"
      } : {
        success: !1,
        error: k(o, "Cart credits authorization failed"),
        errorCode: "authorization_failed"
      };
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
  async processPayment(e, t, n, a) {
    try {
      const i = await this.createHold({ resource: e, couponCode: n, authToken: t }), o = await this.authorizePayment({
        resource: e,
        holdId: i.holdId,
        couponCode: n,
        authToken: t,
        metadata: a
      });
      return {
        success: o.success,
        transactionId: o.transactionId,
        error: o.error
      };
    } catch (i) {
      return {
        success: !1,
        error: k(i, "Credits payment failed")
      };
    }
  }
}
class Ot {
  serverUrl;
  routePrefix = null;
  discoveryPromise = null;
  maxRetries = 3;
  baseDelayMs = 1e3;
  constructor(e) {
    this.serverUrl = e;
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
    const e = (async () => {
      let t = 0;
      for (; t < this.maxRetries; )
        try {
          const n = await y(`${this.serverUrl}/cedros-health`);
          if (!n.ok) {
            if (n.status >= 400 && n.status < 500)
              return c().warn(`Route discovery received ${n.status} - not retrying client error`), this.routePrefix = "", "";
            throw new Error(`Health check returned ${n.status}`);
          }
          const i = (await n.json()).routePrefix || "";
          return this.routePrefix = i, c().debug("Route discovery successful, prefix:", i || "(empty)"), i;
        } catch (n) {
          if (t++, t >= this.maxRetries)
            return c().warn(
              `Route discovery failed after ${t} attempts, using empty prefix for this request:`,
              n
            ), "";
          const a = this.baseDelayMs * Math.pow(2, t - 1);
          c().warn(
            `Route discovery failed (attempt ${t}/${this.maxRetries}), retrying in ${a}ms:`,
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
  /**
   * Build API URL with discovered prefix
   */
  async buildUrl(e) {
    const t = await this.discoverPrefix(), n = e.startsWith("/") ? e : `/${e}`;
    return `${this.serverUrl}${t}${n}`;
  }
  /**
   * Reset cached prefix (useful for testing or reconnecting)
   */
  reset() {
    this.routePrefix = null, this.discoveryPromise = null;
  }
}
const K = /* @__PURE__ */ new Map();
function Fe(r, e, t, n, a) {
  return JSON.stringify({
    stripePublicKey: r,
    serverUrl: e,
    solanaCluster: t,
    solanaEndpoint: n || "",
    dangerouslyAllowUnknownMint: a || !1
  });
}
function Nt(r, e, t, n, a) {
  const i = Fe(
    r,
    e,
    t,
    n,
    a
  );
  let o = K.get(i);
  if (o)
    return o.refCount++, c().debug(
      `[ManagerCache] Reusing cached managers (refCount: ${o.refCount}):`,
      { stripePublicKey: r.slice(0, 10) + "...", serverUrl: e }
    ), o;
  c().debug(
    "[ManagerCache] Creating new manager instances:",
    { stripePublicKey: r.slice(0, 10) + "...", serverUrl: e }
  );
  const s = new Ot(e), u = new lt(r, s), l = new bt(s), d = new Mt(
    t,
    n,
    a ?? !1
  ), f = new Dt(r, s), h = new Bt(s), A = new Ut(s);
  return o = {
    stripeManager: u,
    x402Manager: l,
    walletManager: d,
    subscriptionManager: f,
    subscriptionChangeManager: h,
    creditsManager: A,
    routeDiscovery: s,
    refCount: 1
  }, K.set(i, o), o;
}
function It(r, e, t, n, a) {
  const i = Fe(
    r,
    e,
    t,
    n,
    a
  ), o = K.get(i);
  if (!o) {
    c().warn("[ManagerCache] Attempted to release non-existent managers:", { cacheKey: i });
    return;
  }
  o.refCount--, c().debug(
    `[ManagerCache] Released manager reference (refCount: ${o.refCount}):`,
    { stripePublicKey: r.slice(0, 10) + "...", serverUrl: e }
  ), o.refCount <= 0 && (K.delete(i), c().debug("[ManagerCache] Removed managers from cache (refCount reached 0)"));
}
const Ft = [
  "stripePublicKey"
], Ae = /* @__PURE__ */ new Set(["mainnet-beta", "devnet", "testnet"]);
function Lt() {
  if (typeof window < "u" && window.location)
    return window.location.origin;
  throw new Error(
    "serverUrl is required in SSR/Node environments. In browser environments, it defaults to window.location.origin"
  );
}
function jt(r) {
  const e = [];
  Ft.forEach((n) => {
    const a = r[n];
    (typeof a != "string" || a.trim().length === 0) && e.push({
      field: n,
      message: "must be a non-empty string"
    });
  });
  let t;
  if (r.serverUrl !== void 0)
    typeof r.serverUrl != "string" || r.serverUrl.trim().length === 0 ? (e.push({
      field: "serverUrl",
      message: "must be a non-empty string when provided"
    }), t = "") : t = r.serverUrl;
  else
    try {
      t = Lt();
    } catch (n) {
      e.push({
        field: "serverUrl",
        message: n instanceof Error ? n.message : "failed to determine default"
      }), t = "";
    }
  if (Ae.has(r.solanaCluster) || e.push({
    field: "solanaCluster",
    message: `must be one of ${Array.from(Ae).join(", ")}`
  }), r.solanaEndpoint !== void 0 && (typeof r.solanaEndpoint != "string" ? e.push({
    field: "solanaEndpoint",
    message: "must be a string when provided"
  }) : r.solanaEndpoint.trim().length === 0 ? e.push({
    field: "solanaEndpoint",
    message: 'must be a non-empty string when provided (e.g., "https://api.mainnet-beta.solana.com")'
  }) : !r.solanaEndpoint.startsWith("http://") && !r.solanaEndpoint.startsWith("https://") && e.push({
    field: "solanaEndpoint",
    message: 'must start with "http://" or "https://" (e.g., "https://api.mainnet-beta.solana.com")'
  })), r.tokenMint && typeof r.tokenMint != "string" && e.push({
    field: "tokenMint",
    message: "must be a string when provided"
  }), e.length > 0) {
    const n = e.map((a) => `- ${a.field} ${a.message}`).join(`
`);
    throw new Error(`Invalid Cedros configuration:
${n}`);
  }
  if (r.tokenMint) {
    const n = r.dangerouslyAllowUnknownMint === !0, a = Ie(r.tokenMint, "CedrosConfig.tokenMint", n);
    if (!a.isValid && a.error)
      throw new Error(a.error);
    a.warning && c().warn(a.warning);
  }
  return {
    ...r,
    serverUrl: t
  };
}
class zt {
  adapters = null;
  poolId;
  isCleanedUp = !1;
  constructor(e) {
    this.poolId = e ?? `pool_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`, c().debug(`[WalletPool] Created pool: ${this.poolId}`);
  }
  /**
   * Get wallet adapters for this pool
   *
   * Lazy initialization: adapters are created on first access.
   * Returns empty array in SSR environments.
   */
  getAdapters() {
    return typeof window > "u" ? [] : this.isCleanedUp ? (c().warn(`[WalletPool] Attempted to use pool after cleanup: ${this.poolId}`), []) : this.adapters !== null ? this.adapters : (c().debug(`[WalletPool] Initializing adapters for pool: ${this.poolId}`), this.adapters = [
      new He(),
      new Ve()
    ], this.adapters);
  }
  /**
   * Cleanup wallet adapters
   *
   * Disconnects all wallets and clears the adapter cache.
   * Called automatically when CedrosProvider unmounts.
   *
   * IMPORTANT: After cleanup, getAdapters() will return empty array.
   */
  async cleanup() {
    if (this.isCleanedUp) {
      c().debug(`[WalletPool] Pool already cleaned up: ${this.poolId}`);
      return;
    }
    if (c().debug(`[WalletPool] Cleaning up pool: ${this.poolId}`), this.isCleanedUp = !0, this.adapters === null)
      return;
    const e = this.adapters.map(async (t) => {
      try {
        t.connected && (c().debug(`[WalletPool] Disconnecting wallet: ${t.name}`), await t.disconnect());
      } catch (n) {
        c().warn(`[WalletPool] Failed to disconnect wallet ${t.name}:`, n);
      }
    });
    await Promise.allSettled(e), this.adapters = null, c().debug(`[WalletPool] Pool cleanup complete: ${this.poolId}`);
  }
  /**
   * Check if this pool has been initialized
   *
   * Useful for testing or debugging.
   */
  isInitialized() {
    return this.adapters !== null;
  }
  /**
   * Get pool ID (for debugging/logging)
   */
  getId() {
    return this.poolId;
  }
}
function qt(r) {
  return new zt(r);
}
const Qt = Object.freeze({
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
}), Wt = Object.freeze({
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
}), Ht = {
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
}, ie = ye(null);
function Vt(r, e) {
  return {
    ...r === "dark" ? Wt : Qt,
    ...e
  };
}
function Gt(r) {
  const e = Object.entries(r).map(([t, n]) => [
    Ht[t],
    n
  ]);
  return Object.fromEntries(e);
}
function Kt({
  initialMode: r = "light",
  overrides: e,
  unstyled: t = !1,
  children: n
}) {
  const [a, i] = Z(r), [o, s] = Z(e), u = we(e);
  L(() => {
    if (e === u.current)
      return;
    (!e || !u.current ? e !== u.current : Object.keys({ ...e, ...u.current }).some(
      (f) => e[f] !== u.current?.[f]
    )) && (u.current = e, s(e));
  }, [e]);
  const l = $(() => {
    const d = Vt(a, o), f = t ? {} : Gt(d), h = t ? "" : `cedros-theme-root cedros-theme cedros-theme--${a}`;
    return {
      mode: a,
      setMode: i,
      tokens: d,
      className: h,
      style: f,
      unstyled: t
    };
  }, [a, o, t]);
  return /* @__PURE__ */ X(ie.Provider, { value: l, children: n });
}
function nr() {
  const r = re(ie);
  if (!r)
    throw new Error("useCedrosTheme must be used within CedrosProvider");
  return r;
}
function ar() {
  return re(ie);
}
let J = !1, Y = !1;
async function Jt() {
  if (J)
    return Y ? { available: !0 } : {
      available: !1,
      error: pe()
    };
  try {
    return await import("@solana/web3.js"), J = !0, Y = !0, { available: !0 };
  } catch {
    return J = !0, Y = !1, {
      available: !1,
      error: pe()
    };
  }
}
function pe() {
  return `Solana dependencies not installed. To use crypto payments, install them with:

npm install @solana/web3.js @solana/spl-token @solana/wallet-adapter-react @solana/wallet-adapter-react-ui @solana/wallet-adapter-wallets @solana/wallet-adapter-base

Or if you only need Stripe payments, hide the crypto button with:
<CedrosPay showCrypto={false} />`;
}
function Yt() {
  return typeof process < "u" && process.env.NODE_ENV === "development" ? 0 : 2;
}
const Le = ye(null);
function ir({ config: r, children: e }) {
  const t = $(() => jt(r), [r]), n = we(null);
  n.current === null && (n.current = qt());
  const [a, i] = Z(null);
  L(() => {
    let s = !1;
    return Jt().then((u) => {
      s || (u.available ? i(void 0) : i(u.error || "Solana dependencies not available"));
    }), () => {
      s = !0;
    };
  }, []), L(() => {
    const s = t.logLevel ?? Yt(), u = rt({
      level: s,
      prefix: "[CedrosPay]"
    });
    tt(u);
  }, [t.logLevel]), L(() => {
    const s = n.current;
    return () => {
      s && s.cleanup().catch((u) => {
        c().warn("[CedrosProvider] Wallet pool cleanup failed:", u);
      });
    };
  }, []), L(() => {
    const s = t.stripePublicKey, u = t.serverUrl ?? "", l = t.solanaCluster, d = t.solanaEndpoint, f = t.dangerouslyAllowUnknownMint;
    return () => {
      It(s, u, l, d, f);
    };
  }, [
    t.stripePublicKey,
    t.serverUrl,
    t.solanaCluster,
    t.solanaEndpoint,
    t.dangerouslyAllowUnknownMint
  ]);
  const o = $(() => {
    const { stripeManager: s, x402Manager: u, walletManager: l, subscriptionManager: d, subscriptionChangeManager: f, creditsManager: h } = Nt(
      t.stripePublicKey,
      t.serverUrl ?? "",
      t.solanaCluster,
      t.solanaEndpoint,
      t.dangerouslyAllowUnknownMint
    );
    return {
      config: t,
      stripeManager: s,
      x402Manager: u,
      walletManager: l,
      subscriptionManager: d,
      subscriptionChangeManager: f,
      creditsManager: h,
      walletPool: n.current,
      solanaError: a
    };
  }, [t, a]);
  return /* @__PURE__ */ X(Le.Provider, { value: o, children: /* @__PURE__ */ X(
    Kt,
    {
      initialMode: t.theme ?? "light",
      overrides: t.themeOverrides,
      unstyled: t.unstyled ?? !1,
      children: e
    }
  ) });
}
function or() {
  const r = re(Le);
  if (!r)
    throw new Error("useCedrosContext must be used within CedrosProvider");
  return r;
}
export {
  ir as C,
  te as K,
  _e as L,
  M as R,
  Tt as S,
  zt as W,
  nr as a,
  Ee as b,
  R as c,
  rt as d,
  Ie as e,
  k as f,
  c as g,
  he as h,
  y as i,
  ar as j,
  U as k,
  it as l,
  m,
  rr as n,
  b as o,
  qt as p,
  g as r,
  or as u,
  jt as v
};
