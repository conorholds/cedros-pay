import { g as c } from "./uuid-_z3jSatJ.mjs";
var d = /* @__PURE__ */ ((e) => (e.DEBUG = "debug", e.INFO = "info", e.WARNING = "warning", e.ERROR = "error", e.CRITICAL = "critical", e))(d || {});
let n = {
  enabled: !1,
  sanitizePII: !0
};
function I(e) {
  n = {
    ...n,
    ...e
  };
}
function z() {
  return { ...n };
}
function g() {
  const e = Date.now(), t = c().slice(0, 12);
  return `cedros_${e}_${t}`;
}
const b = [
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
  // Solana private keys and transaction signatures (Base58, 86-90 chars)
  // Solana public keys/program IDs are 32-44 chars and are NOT redacted —
  // they are not sensitive and appear frequently in error context.
  /\b[1-9A-HJ-NP-Za-km-z]{86,90}\b/g,
  // Ethereum private keys (0x + 64 hex chars)
  /\b0x[a-fA-F0-9]{64}\b/g,
  // Ethereum addresses (0x + 40 hex chars)
  /\b0x[a-fA-F0-9]{40}\b/g,
  // JWT tokens (header.payload.signature format)
  /\beyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\b/g,
  // API keys (common patterns: sk_, pk_, api_, secret_)
  /\b(sk|pk|api|secret|key)_[a-zA-Z0-9]{16,128}\b/gi,
  // Stripe secret keys
  /\bsk_(test|live)_[a-zA-Z0-9]{24,}\b/g,
  // Base64 encoded data (could be exported keys) — only catch very long
  // sequences (200+ chars) to avoid redacting encoded transaction payloads
  // and stack traces (actual base64-encoded private keys are ~88 chars but
  // those are caught by the Base58 pattern above; 200+ targets bulk exports).
  /\b[A-Za-z0-9+/]{200,}={0,2}\b/g,
  // Hex strings longer than 32 chars (could be keys)
  /\b[a-fA-F0-9]{64,}\b/g
];
function i(e) {
  if (!n.sanitizePII)
    return e;
  let t = e;
  for (const a of b)
    t = t.replace(a, "[REDACTED]");
  return t;
}
function f(e) {
  const t = new Error(i(e.message));
  return t.name = e.name, e.stack && (t.stack = i(e.stack)), t;
}
function u(e, t = {}) {
  const a = typeof e == "string" ? new Error(e) : e, r = n.sanitizePII ? f(a) : a, s = Date.now();
  return {
    correlationId: t.correlationId || g(),
    timestamp: s,
    timestampISO: new Date(s).toISOString(),
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
  } catch (o) {
    console.error("[CedrosPay] Telemetry hook failed:", o);
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
  d as ErrorSeverity,
  I as configureTelemetry,
  A as createErrorReporter,
  u as enrichError,
  g as generateCorrelationId,
  z as getTelemetryConfig,
  l as reportError,
  k as resetTelemetry,
  f as sanitizeError,
  i as sanitizePII
};
