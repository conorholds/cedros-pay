import { g as c } from "./uuid-_z3jSatJ.mjs";
var b = /* @__PURE__ */ ((e) => (e.DEBUG = "debug", e.INFO = "info", e.WARNING = "warning", e.ERROR = "error", e.CRITICAL = "critical", e))(b || {});
let n = {
  enabled: !1,
  sanitizePII: !0
};
function z(e) {
  n = {
    ...n,
    ...e
  };
}
function I() {
  return { ...n };
}
function g() {
  const e = Date.now(), t = c().slice(0, 12);
  return `cedros_${e}_${t}`;
}
const d = [
  // Email addresses
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  // Phone numbers (various formats)
  /\b(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  // Credit card numbers (basic pattern)
  /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  // SSN (US)
  /\b\d{3}-\d{2}-\d{4}\b/g,
  // IP addresses (IPv4)
  /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  // ====== CRYPTO-SPECIFIC SENSITIVE DATA ======
  // Solana private keys (Base58 encoded, typically 88 chars)
  /\b[1-9A-HJ-NP-Za-km-z]{87,88}\b/g,
  // Solana wallet addresses (Base58, 32-44 chars)
  /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g,
  // Ethereum private keys (0x + 64 hex chars)
  /\b0x[a-fA-F0-9]{64}\b/g,
  // Ethereum addresses (0x + 40 hex chars)
  /\b0x[a-fA-F0-9]{40}\b/g,
  // BIP39 seed phrases (12, 15, 18, 21, or 24 words)
  // Matches common patterns like "word word word..." (very conservative)
  /\b([a-z]+\s+){11,23}[a-z]+\b/gi,
  // JWT tokens (header.payload.signature format)
  /\beyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\b/g,
  // API keys (common patterns: sk_, pk_, api_, secret_)
  /\b(sk|pk|api|secret|key)_[a-zA-Z0-9]{16,128}\b/gi,
  // Stripe secret keys
  /\bsk_(test|live)_[a-zA-Z0-9]{24,}\b/g,
  // Transaction signatures (Base58, ~88 chars)
  /\b[1-9A-HJ-NP-Za-km-z]{86,90}\b/g,
  // Base64 encoded data (could be keys) - very long strings
  /\b[A-Za-z0-9+/]{100,}={0,2}\b/g,
  // Hex strings longer than 32 chars (could be keys)
  /\b[a-fA-F0-9]{64,}\b/g
];
function i(e) {
  if (!n.enabled || !n.sanitizePII)
    return e;
  let t = e;
  for (const a of d)
    t = t.replace(a, "[REDACTED]");
  return t;
}
function f(e) {
  const t = new Error(i(e.message));
  return t.name = e.name, e.stack && (t.stack = i(e.stack)), t;
}
function u(e, t = {}) {
  const a = typeof e == "string" ? new Error(e) : e, r = n.sanitizePII ? f(a) : a, o = Date.now();
  return {
    correlationId: t.correlationId || g(),
    timestamp: o,
    timestampISO: new Date(o).toISOString(),
    severity: t.severity || "error",
    code: t.code,
    message: r.message,
    error: r,
    stack: r.stack,
    paymentContext: t.paymentContext,
    userAgent: typeof navigator < "u" ? navigator.userAgent : void 0,
    sdkVersion: n.sdkVersion,
    environment: n.environment,
    tags: {
      ...n.globalTags,
      ...t.tags
    }
  };
}
function l(e, t) {
  if (!n.enabled || !n.onError)
    return;
  const a = typeof e == "object" && "correlationId" in e ? e : u(e, t || {});
  try {
    n.onError(a);
  } catch (s) {
    console.error("[CedrosPay] Telemetry hook failed:", s);
  }
}
function A(e) {
  return (t, a = {}) => {
    l(t, {
      ...a,
      tags: {
        ...e,
        ...a.tags
      }
    });
  };
}
function k() {
  n = {
    enabled: !1,
    sanitizePII: !0
  };
}
export {
  b as ErrorSeverity,
  z as configureTelemetry,
  A as createErrorReporter,
  u as enrichError,
  g as generateCorrelationId,
  I as getTelemetryConfig,
  l as reportError,
  k as resetTelemetry,
  f as sanitizeError,
  i as sanitizePII
};
