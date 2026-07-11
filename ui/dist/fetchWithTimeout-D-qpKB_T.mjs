const C = "3.7.8", Z = C, l = typeof Buffer == "function", y = typeof TextDecoder == "function" ? new TextDecoder() : void 0, m = typeof TextEncoder == "function" ? new TextEncoder() : void 0, $ = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=", u = Array.prototype.slice.call($), d = ((t) => {
  let e = {};
  return t.forEach((r, o) => e[r] = o), e;
})(u), j = /^(?:[A-Za-z\d+\/]{4})*?(?:[A-Za-z\d+\/]{2}(?:==)?|[A-Za-z\d+\/]{3}=?)?$/, a = String.fromCharCode.bind(String), E = typeof Uint8Array.from == "function" ? Uint8Array.from.bind(Uint8Array) : (t) => new Uint8Array(Array.prototype.slice.call(t, 0)), _ = (t) => t.replace(/=/g, "").replace(/[+\/]/g, (e) => e == "+" ? "-" : "_"), w = (t) => t.replace(/[^A-Za-z0-9\+\/]/g, ""), R = (t) => {
  let e, r, o, n, s = "";
  const f = t.length % 3;
  for (let i = 0; i < t.length; ) {
    if ((r = t.charCodeAt(i++)) > 255 || (o = t.charCodeAt(i++)) > 255 || (n = t.charCodeAt(i++)) > 255)
      throw new TypeError("invalid character found");
    e = r << 16 | o << 8 | n, s += u[e >> 18 & 63] + u[e >> 12 & 63] + u[e >> 6 & 63] + u[e & 63];
  }
  return f ? s.slice(0, f - 3) + "===".substring(f) : s;
}, A = typeof btoa == "function" ? (t) => btoa(t) : l ? (t) => Buffer.from(t, "binary").toString("base64") : R, g = l ? (t) => Buffer.from(t).toString("base64") : (t) => {
  let r = [];
  for (let o = 0, n = t.length; o < n; o += 4096)
    r.push(a.apply(null, t.subarray(o, o + 4096)));
  return A(r.join(""));
}, x = (t, e = !1) => e ? _(g(t)) : g(t), V = (t) => {
  if (t.length < 2) {
    var e = t.charCodeAt(0);
    return e < 128 ? t : e < 2048 ? a(192 | e >>> 6) + a(128 | e & 63) : a(224 | e >>> 12 & 15) + a(128 | e >>> 6 & 63) + a(128 | e & 63);
  } else {
    var e = 65536 + (t.charCodeAt(0) - 55296) * 1024 + (t.charCodeAt(1) - 56320);
    return a(240 | e >>> 18 & 7) + a(128 | e >>> 12 & 63) + a(128 | e >>> 6 & 63) + a(128 | e & 63);
  }
}, W = /[\uD800-\uDBFF][\uDC00-\uDFFFF]|[^\x00-\x7F]/g, F = (t) => t.replace(W, V), B = l ? (t) => Buffer.from(t, "utf8").toString("base64") : m ? (t) => g(m.encode(t)) : (t) => A(F(t)), c = (t, e = !1) => e ? _(B(t)) : B(t), U = (t) => c(t, !0), G = /[\xC0-\xDF][\x80-\xBF]|[\xE0-\xEF][\x80-\xBF]{2}|[\xF0-\xF7][\x80-\xBF]{3}/g, H = (t) => {
  switch (t.length) {
    case 4:
      var e = (7 & t.charCodeAt(0)) << 18 | (63 & t.charCodeAt(1)) << 12 | (63 & t.charCodeAt(2)) << 6 | 63 & t.charCodeAt(3), r = e - 65536;
      return a((r >>> 10) + 55296) + a((r & 1023) + 56320);
    case 3:
      return a((15 & t.charCodeAt(0)) << 12 | (63 & t.charCodeAt(1)) << 6 | 63 & t.charCodeAt(2));
    default:
      return a((31 & t.charCodeAt(0)) << 6 | 63 & t.charCodeAt(1));
  }
}, D = (t) => t.replace(G, H), S = (t) => {
  if (t = t.replace(/\s+/g, ""), !j.test(t))
    throw new TypeError("malformed base64.");
  t += "==".slice(2 - (t.length & 3));
  let e, r, o, n = [];
  for (let s = 0; s < t.length; )
    e = d[t.charAt(s++)] << 18 | d[t.charAt(s++)] << 12 | (r = d[t.charAt(s++)]) << 6 | (o = d[t.charAt(s++)]), r === 64 ? n.push(a(e >> 16 & 255)) : o === 64 ? n.push(a(e >> 16 & 255, e >> 8 & 255)) : n.push(a(e >> 16 & 255, e >> 8 & 255, e & 255));
  return n.join("");
}, p = typeof atob == "function" ? (t) => atob(w(t)) : l ? (t) => Buffer.from(t, "base64").toString("binary") : S, T = l ? (t) => E(Buffer.from(t, "base64")) : (t) => E(p(t).split("").map((e) => e.charCodeAt(0))), I = (t) => T(v(t)), M = l ? (t) => Buffer.from(t, "base64").toString("utf8") : y ? (t) => y.decode(T(t)) : (t) => D(p(t)), v = (t) => w(t.replace(/[-_]/g, (e) => e == "-" ? "+" : "/")), b = (t) => M(v(t)), k = (t) => {
  if (typeof t != "string")
    return !1;
  const e = t.replace(/\s+/g, "").replace(/={0,2}$/, "");
  return !/[^\s0-9a-zA-Z\+/]/.test(e) || !/[^\s0-9a-zA-Z\-_]/.test(e);
}, O = (t) => ({
  value: t,
  enumerable: !1,
  writable: !0,
  configurable: !0
}), N = function() {
  const t = (e, r) => Object.defineProperty(String.prototype, e, O(r));
  t("fromBase64", function() {
    return b(this);
  }), t("toBase64", function(e) {
    return c(this, e);
  }), t("toBase64URI", function() {
    return c(this, !0);
  }), t("toBase64URL", function() {
    return c(this, !0);
  }), t("toUint8Array", function() {
    return I(this);
  });
}, P = function() {
  const t = (e, r) => Object.defineProperty(Uint8Array.prototype, e, O(r));
  t("toBase64", function(e) {
    return x(this, e);
  }), t("toBase64URI", function() {
    return x(this, !0);
  }), t("toBase64URL", function() {
    return x(this, !0);
  });
}, q = () => {
  N(), P();
}, X = {
  version: C,
  VERSION: Z,
  atob: p,
  atobPolyfill: S,
  btoa: A,
  btoaPolyfill: R,
  fromBase64: b,
  toBase64: c,
  encode: c,
  encodeURI: U,
  encodeURL: U,
  utob: F,
  btou: D,
  decode: b,
  isValid: k,
  fromUint8Array: x,
  toUint8Array: I,
  extendString: N,
  extendUint8Array: P,
  extendBuiltins: q
};
var J = /* @__PURE__ */ ((t) => (t[t.DEBUG = 0] = "DEBUG", t[t.INFO = 1] = "INFO", t[t.WARN = 2] = "WARN", t[t.ERROR = 3] = "ERROR", t[t.SILENT = 4] = "SILENT", t))(J || {});
class z {
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
  log(e, r, o) {
    const n = this.config.prefix ? `${this.config.prefix} ` : "", s = (/* @__PURE__ */ new Date()).toISOString();
    r(`[${s}] ${n}[${e}]`, ...o);
  }
}
const K = () => typeof process < "u" && process.env.NODE_ENV === "development" ? 0 : 2;
let h = null;
function Y() {
  return h || (h = new z({
    level: K(),
    prefix: "[CedrosPay]"
  })), h;
}
function tt(t) {
  h = t;
}
function et(t) {
  return new z(t);
}
const L = 15e3;
function Q(t) {
  return !!(t && typeof t == "object" && "name" in t && t.name === "AbortError");
}
async function rt(t, e = {}, r = L) {
  const o = new AbortController(), n = e.signal;
  if (n?.aborted)
    throw o.abort(), new DOMException("The operation was aborted", "AbortError");
  const s = setTimeout(() => o.abort(), r);
  let f = null;
  n && (f = () => o.abort(), n.addEventListener("abort", f));
  try {
    return await fetch(t, {
      ...e,
      signal: o.signal
    });
  } catch (i) {
    throw Q(i) ? n?.aborted ? i : new Error(`Request timeout after ${r}ms`) : i;
  } finally {
    clearTimeout(s), n && f && n.removeEventListener("abort", f);
  }
}
export {
  J as L,
  z as a,
  X as b,
  et as c,
  rt as f,
  Y as g,
  tt as s
};
