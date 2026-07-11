import { useMemo as Dt, useState as V, useRef as D, useEffect as Ft, useCallback as E } from "react";
const zt = "cedros-pay-checkout", X = "cedros-pay-checkout:quote", Y = "cedros-pay-checkout:checkout";
function Gt(t) {
  return t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array";
}
function q(t, ...e) {
  if (!Gt(t))
    throw new Error("Uint8Array expected");
  if (e.length > 0 && !e.includes(t.length))
    throw new Error("Uint8Array expected of length " + e + ", got length=" + t.length);
}
function st(t, e = !0) {
  if (t.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (e && t.finished)
    throw new Error("Hash#digest() has already been called");
}
function Jt(t, e) {
  q(t);
  const n = e.outputLen;
  if (t.length < n)
    throw new Error("digestInto() expects output buffer of length at least " + n);
}
function z(...t) {
  for (let e = 0; e < t.length; e++)
    t[e].fill(0);
}
function F(t) {
  return new DataView(t.buffer, t.byteOffset, t.byteLength);
}
function y(t, e) {
  return t << 32 - e | t >>> e;
}
function gt(t) {
  if (typeof t != "string")
    throw new Error("string expected");
  return new Uint8Array(new TextEncoder().encode(t));
}
function bt(t) {
  return typeof t == "string" && (t = gt(t)), q(t), t;
}
class Wt {
}
function Zt(t) {
  const e = (r) => t().update(bt(r)).digest(), n = t();
  return e.outputLen = n.outputLen, e.blockLen = n.blockLen, e.create = () => t(), e;
}
function Qt(t, e, n, r) {
  if (typeof t.setBigUint64 == "function")
    return t.setBigUint64(e, n, r);
  const i = BigInt(32), o = BigInt(4294967295), s = Number(n >> i & o), c = Number(n & o), a = r ? 4 : 0, f = r ? 0 : 4;
  t.setUint32(e + a, s, r), t.setUint32(e + f, c, r);
}
function Xt(t, e, n) {
  return t & e ^ ~t & n;
}
function Yt(t, e, n) {
  return t & e ^ t & n ^ e & n;
}
class qt extends Wt {
  constructor(e, n, r, i) {
    super(), this.finished = !1, this.length = 0, this.pos = 0, this.destroyed = !1, this.blockLen = e, this.outputLen = n, this.padOffset = r, this.isLE = i, this.buffer = new Uint8Array(e), this.view = F(this.buffer);
  }
  update(e) {
    st(this), e = bt(e), q(e);
    const { view: n, buffer: r, blockLen: i } = this, o = e.length;
    for (let s = 0; s < o; ) {
      const c = Math.min(i - this.pos, o - s);
      if (c === i) {
        const a = F(e);
        for (; i <= o - s; s += i)
          this.process(a, s);
        continue;
      }
      r.set(e.subarray(s, s + c), this.pos), this.pos += c, s += c, this.pos === i && (this.process(n, 0), this.pos = 0);
    }
    return this.length += e.length, this.roundClean(), this;
  }
  digestInto(e) {
    st(this), Jt(e, this), this.finished = !0;
    const { buffer: n, view: r, blockLen: i, isLE: o } = this;
    let { pos: s } = this;
    n[s++] = 128, z(this.buffer.subarray(s)), this.padOffset > i - s && (this.process(r, 0), s = 0);
    for (let d = s; d < i; d++)
      n[d] = 0;
    Qt(r, i - 8, BigInt(this.length * 8), o), this.process(r, 0);
    const c = F(e), a = this.outputLen;
    if (a % 4)
      throw new Error("_sha2: outputLen should be aligned to 32bit");
    const f = a / 4, h = this.get();
    if (f > h.length)
      throw new Error("_sha2: outputLen bigger than state");
    for (let d = 0; d < f; d++)
      c.setUint32(4 * d, h[d], o);
  }
  digest() {
    const { buffer: e, outputLen: n } = this;
    this.digestInto(e);
    const r = e.slice(0, n);
    return this.destroy(), r;
  }
  _cloneInto(e) {
    e || (e = new this.constructor()), e.set(...this.get());
    const { blockLen: n, buffer: r, length: i, finished: o, destroyed: s, pos: c } = this;
    return e.destroyed = s, e.finished = o, e.length = i, e.pos = c, i % n && e.buffer.set(r), e;
  }
  clone() {
    return this._cloneInto();
  }
}
const b = /* @__PURE__ */ Uint32Array.from([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]), vt = /* @__PURE__ */ Uint32Array.from([
  1116352408,
  1899447441,
  3049323471,
  3921009573,
  961987163,
  1508970993,
  2453635748,
  2870763221,
  3624381080,
  310598401,
  607225278,
  1426881987,
  1925078388,
  2162078206,
  2614888103,
  3248222580,
  3835390401,
  4022224774,
  264347078,
  604807628,
  770255983,
  1249150122,
  1555081692,
  1996064986,
  2554220882,
  2821834349,
  2952996808,
  3210313671,
  3336571891,
  3584528711,
  113926993,
  338241895,
  666307205,
  773529912,
  1294757372,
  1396182291,
  1695183700,
  1986661051,
  2177026350,
  2456956037,
  2730485921,
  2820302411,
  3259730800,
  3345764771,
  3516065817,
  3600352804,
  4094571909,
  275423344,
  430227734,
  506948616,
  659060556,
  883997877,
  958139571,
  1322822218,
  1537002063,
  1747873779,
  1955562222,
  2024104815,
  2227730452,
  2361852424,
  2428436474,
  2756734187,
  3204031479,
  3329325298
]), I = /* @__PURE__ */ new Uint32Array(64);
class te extends qt {
  constructor(e = 32) {
    super(64, e, 8, !1), this.A = b[0] | 0, this.B = b[1] | 0, this.C = b[2] | 0, this.D = b[3] | 0, this.E = b[4] | 0, this.F = b[5] | 0, this.G = b[6] | 0, this.H = b[7] | 0;
  }
  get() {
    const { A: e, B: n, C: r, D: i, E: o, F: s, G: c, H: a } = this;
    return [e, n, r, i, o, s, c, a];
  }
  // prettier-ignore
  set(e, n, r, i, o, s, c, a) {
    this.A = e | 0, this.B = n | 0, this.C = r | 0, this.D = i | 0, this.E = o | 0, this.F = s | 0, this.G = c | 0, this.H = a | 0;
  }
  process(e, n) {
    for (let d = 0; d < 16; d++, n += 4)
      I[d] = e.getUint32(n, !1);
    for (let d = 16; d < 64; d++) {
      const C = I[d - 15], w = I[d - 2], N = y(C, 7) ^ y(C, 18) ^ C >>> 3, O = y(w, 17) ^ y(w, 19) ^ w >>> 10;
      I[d] = O + I[d - 7] + N + I[d - 16] | 0;
    }
    let { A: r, B: i, C: o, D: s, E: c, F: a, G: f, H: h } = this;
    for (let d = 0; d < 64; d++) {
      const C = y(c, 6) ^ y(c, 11) ^ y(c, 25), w = h + C + Xt(c, a, f) + vt[d] + I[d] | 0, O = (y(r, 2) ^ y(r, 13) ^ y(r, 22)) + Yt(r, i, o) | 0;
      h = f, f = a, a = c, c = s + w | 0, s = o, o = i, i = r, r = w + O | 0;
    }
    r = r + this.A | 0, i = i + this.B | 0, o = o + this.C | 0, s = s + this.D | 0, c = c + this.E | 0, a = a + this.F | 0, f = f + this.G | 0, h = h + this.H | 0, this.set(r, i, o, s, c, a, f, h);
  }
  roundClean() {
    z(I);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0), z(this.buffer);
  }
}
const ee = /* @__PURE__ */ Zt(() => new te());
function G(t) {
  return Array.isArray(t) ? `[${t.map(G).join(",")}]` : t && typeof t == "object" ? `{${Object.entries(t).filter(([, n]) => n !== void 0).sort(([n], [r]) => n < r ? -1 : n > r ? 1 : 0).map(([n, r]) => `${JSON.stringify(n)}:${G(r)}`).join(",")}}` : JSON.stringify(t) ?? "null";
}
function v(t, e) {
  return [...ee(gt(G({ scope: t, request: e })))].map((r) => r.toString(16).padStart(2, "0")).join("");
}
const ne = 4320 * 60 * 1e3;
function re(t) {
  if (!at(t) || !ct(t, [
    "protocol",
    "providerScope",
    "replayTtlMs",
    "acceptsExternalIdempotencyKey",
    "maxIdempotencyKeyLength",
    "idempotencyKeyCharacterSet",
    "operationScopes"
  ]) || t.protocol !== zt || !ie(t.providerScope) || t.replayTtlMs !== ne || t.acceptsExternalIdempotencyKey !== !0 || t.maxIdempotencyKeyLength !== 67 || t.idempotencyKeyCharacterSet !== "ascii-visible" || !at(t.operationScopes) || !ct(t.operationScopes, ["quote", "checkout"]) || t.operationScopes.quote !== X || t.operationScopes.checkout !== Y)
    throw new Error("Invalid checkout descriptor");
  return t;
}
function ie(t) {
  return typeof t == "string" && t === t.trim() && !!t && t.length <= 512 && !oe(t);
}
function oe(t) {
  return [...t].some((e) => e.charCodeAt(0) <= 31 || e.charCodeAt(0) === 127);
}
function ct(t, e) {
  return Object.keys(t).every((n) => e.includes(n)) && Object.keys(t).length === e.length;
}
function at(t) {
  return typeof t == "object" && t !== null && !Array.isArray(t);
}
const se = /^[A-Za-z0-9_.:-]+$/u, ce = /^payop_[0-9a-f]{64}$/u, ae = /^cs_[A-Za-z0-9_-]+$/u, It = /* @__PURE__ */ new Set(["stripe", "x402", "credits"]);
function de(t) {
  u(t, [
    "schemaVersion",
    "idempotencyKey",
    "attemptId",
    "clientMaterialSha256",
    "source",
    "promotionCode",
    "customerContext",
    "tip",
    "requestedPaymentMethods"
  ]), tt(t.schemaVersion), Et(t.idempotencyKey, t.attemptId), At(t.clientMaterialSha256), pe(t.source), R(t.promotionCode, 256, "promotionCode"), Ct(t.customerContext), t.tip !== void 0 && ge(t.tip), be(t.requestedPaymentMethods);
}
function fe(t) {
  if (u(t, [
    "schemaVersion",
    "idempotencyKey",
    "attemptId",
    "clientMaterialSha256",
    "quoteOperationId",
    "paymentMethod",
    "customerContext",
    "railProof"
  ]), tt(t.schemaVersion), Et(t.idempotencyKey, t.attemptId), At(t.clientMaterialSha256), Tt(t.quoteOperationId, "quoteOperationId"), !It.has(t.paymentMethod)) throw new TypeError("paymentMethod is invalid");
  if (Ct(t.customerContext), t.railProof !== void 0 && we(t.railProof), t.paymentMethod === "x402" && t.railProof?.kind !== "x402" || t.railProof !== void 0 && t.railProof.kind !== t.paymentMethod)
    throw new TypeError("railProof does not match paymentMethod");
}
function ue(t) {
  if (u(t, ["schemaVersion", "operationId", "expectedAttemptId", "returnArtifact"]), tt(t.schemaVersion), Tt(t.operationId, "operationId"), kt(t.expectedAttemptId), typeof t.returnArtifact != "string" || t.returnArtifact.length > 255 || !ae.test(t.returnArtifact))
    throw new TypeError("returnArtifact is invalid");
}
const he = ue;
function xt(t) {
  if (typeof t != "string" || t.length < 1 || t.length > 67 || ![...t].every((e) => e.charCodeAt(0) >= 33 && e.charCodeAt(0) <= 126))
    throw new TypeError("idempotencyKey must be 1 to 67 visible ASCII characters");
}
function pe(t) {
  if (!k(t)) throw new TypeError("source is invalid");
  if (t.kind === "items") {
    u(t, ["kind", "items"]), me(t.items);
    return;
  }
  if (t.kind === "versioned_cart") {
    u(t, ["kind", "lane", "generation", "version"]), J(t.lane, "lane"), A(t.generation, 256, "generation"), j(t.version, 0, 1e5, "version");
    return;
  }
  throw new TypeError("source kind is invalid");
}
function me(t) {
  if (!Array.isArray(t) || t.length < 1 || t.length > 100)
    throw new TypeError("items must contain 1 to 100 entries");
  for (const e of t)
    u(e, ["resource", "variantId", "qty"]), J(e.resource, "resource"), e.variantId !== void 0 && J(e.variantId, "variantId"), j(e.qty, 1, 999, "qty");
}
function Ct(t) {
  if (!k(t)) throw new TypeError("customerContext is invalid");
  u(t, ["fulfillment", "contact", "returnUrls"]);
  const e = t.fulfillment;
  if (!k(e)) throw new TypeError("fulfillment is invalid");
  if (e.kind === "digital") u(e, ["kind"]);
  else if (e.kind === "shipping")
    u(e, ["kind", "address", "shipping"]), ye(e.address), u(e.shipping, ["optionId"]), A(e.shipping.optionId, 128, "shipping.optionId");
  else throw new TypeError("fulfillment kind is invalid");
  if (t.contact !== void 0 && le(t.contact), !k(t.returnUrls)) throw new TypeError("returnUrls is invalid");
  u(t.returnUrls, ["success", "cancel"]), dt(t.returnUrls.success, "returnUrls.success"), dt(t.returnUrls.cancel, "returnUrls.cancel");
}
function ye(t) {
  if (!k(t)) throw new TypeError("address is invalid");
  if (u(t, ["line1", "line2", "city", "region", "postalCode", "country"]), A(t.line1, 200, "address.line1"), R(t.line2, 200, "address.line2"), A(t.city, 100, "address.city"), R(t.region, 100, "address.region"), A(t.postalCode, 32, "address.postalCode"), typeof t.country != "string" || !/^[A-Za-z]{2}$/u.test(t.country))
    throw new TypeError("address.country is invalid");
}
function le(t) {
  if (u(t, ["email", "phone", "displayName"]), t.email !== void 0 && (t.email.length > 254 || et(t.email) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(t.email))) throw new TypeError("contact.email is invalid");
  R(t.phone, 64, "contact.phone"), R(t.displayName, 200, "contact.displayName");
}
function we(t) {
  if (!k(t)) throw new TypeError("railProof is invalid");
  if (t.kind === "x402")
    u(t, ["kind", "transaction"]), A(t.transaction, 4096, "railProof.transaction");
  else if (t.kind === "stripe" || t.kind === "credits") u(t, ["kind"]);
  else throw new TypeError("railProof kind is invalid");
}
function ge(t) {
  if (!k(t)) throw new TypeError("tip is invalid");
  if (t.kind === "fixed")
    u(t, ["kind", "amountCents"]), j(t.amountCents, 1, 1e6, "tip.amountCents");
  else if (t.kind === "percentage")
    u(t, ["kind", "basisPoints"]), j(t.basisPoints, 1, 1e4, "tip.basisPoints");
  else
    throw new TypeError("tip.kind is invalid");
}
function be(t) {
  if (!Array.isArray(t) || t.length < 1 || t.length > 3 || new Set(t).size !== t.length || t.some((e) => !It.has(e)))
    throw new TypeError("requestedPaymentMethods is invalid");
}
function Et(t, e) {
  xt(t), kt(e);
}
function tt(t) {
  if (t !== 1) throw new TypeError("schemaVersion must be 1");
}
function At(t) {
  if (typeof t != "string" || !/^[0-9a-f]{64}$/u.test(t))
    throw new TypeError("clientMaterialSha256 must be 64 lowercase hex characters");
}
function kt(t) {
  if (typeof t != "string" || !t.trim() || Ie(t) > 256 || et(t))
    throw new TypeError("attemptId must be a nonblank opaque value no longer than 256 bytes");
}
function Tt(t, e) {
  if (typeof t != "string" || !ce.test(t)) throw new TypeError(`${e} is invalid`);
}
function J(t, e) {
  if (typeof t != "string" || t.length > 128 || !se.test(t))
    throw new TypeError(`${e} is invalid`);
}
function A(t, e, n) {
  if (typeof t != "string" || !t.trim() || t.length > e || et(t))
    throw new TypeError(`${n} is invalid`);
}
function R(t, e, n) {
  t !== void 0 && A(t, e, n);
}
function j(t, e, n, r) {
  if (!Number.isSafeInteger(t) || t < e || t > n) throw new TypeError(`${r} is invalid`);
}
function dt(t, e) {
  if (typeof t != "string" || t.length > 2048) throw new TypeError(`${e} is invalid`);
  try {
    const n = new URL(t);
    if (n.protocol !== "https:" || n.username || n.password) throw new Error();
  } catch {
    throw new TypeError(`${e} must be an absolute HTTPS URL without user information`);
  }
}
function u(t, e) {
  if (Object.keys(t).some((n) => !e.includes(n))) throw new TypeError("request contains an unknown field");
}
function Ie(t) {
  return new TextEncoder().encode(t).length;
}
function et(t) {
  return [...t].some((e) => e.charCodeAt(0) <= 31 || e.charCodeAt(0) === 127);
}
function k(t) {
  return typeof t == "object" && t !== null && !Array.isArray(t);
}
const xe = /^payop_[0-9a-f]{64}$/u, Ce = /^[0-9a-f]{64}$/u;
function ft(t) {
  if (!Te(t)) throw nt();
  return t;
}
function Ee(t) {
  if (!ke(t)) throw nt();
  return t;
}
function Ae(t) {
  if (!Ue(t)) throw nt();
  return t;
}
function ke(t) {
  return T(t) && m(t, ["schemaVersion", "operationId", "attemptId", "quote", "replayed"]) && t.schemaVersion === 1 && $t(t.operationId) && St(t.attemptId) && typeof t.replayed == "boolean" && $e(t.quote);
}
function Te(t) {
  if (!Ut(t) || typeof t.replayed != "boolean") return !1;
  const e = ["status", "operationId", "attemptId", "paymentMethod", "replayed"];
  return t.status === "action_required" ? m(t, [...e, "returnArtifact"]) && Re(t.returnArtifact) : t.status === "processing" || t.status === "paid" ? m(t, e) : (t.status === "terminal" || t.status === "indeterminate") && m(t, [...e, "code"]) && He(t.code);
}
function Ue(t) {
  if (!Ut(t)) return !1;
  const e = ["status", "operationId", "attemptId", "paymentMethod"];
  return t.status === "resolved" ? m(t, [...e, "checkoutUrl"]) && Me(t.checkoutUrl) : (t.status === "mismatch" || t.status === "indeterminate") && m(t, e);
}
function $e(t) {
  return !T(t) || !m(t, [
    "schemaVersion",
    "source",
    "lines",
    "currency",
    "subtotalCents",
    "discountCents",
    "shippingCents",
    "taxCents",
    "tipCents",
    "totalCents",
    "shippingRateId",
    "taxRateId",
    "appliedTip",
    "inventoryHold",
    "promotionCode",
    "requestedPaymentMethods",
    "expiresAt"
  ], !0) || t.schemaVersion !== 1 || !Se(t.source) || !Array.isArray(t.lines) || t.lines.length < 1 || t.lines.length > 100 || !Pt(t.currency) || !x(t.subtotalCents) || !x(t.discountCents) || !x(t.shippingCents) || !x(t.taxCents) || !x(t.tipCents) || !_(t.totalCents) || t.shippingRateId !== void 0 && !p(t.shippingRateId, 256) || t.taxRateId !== void 0 && !p(t.taxRateId, 256) || t.appliedTip !== void 0 && !Pe(t.appliedTip) || t.inventoryHold !== void 0 && !_e(t.inventoryHold) || t.promotionCode !== void 0 && !p(t.promotionCode, 256) || !Ne(t.requestedPaymentMethods) || !_t(t.expiresAt) ? !1 : t.lines.every(Oe);
}
function Se(t) {
  return T(t) ? t.kind === "items" ? m(t, ["kind", "intentSha256"]) && Ke(t.intentSha256) : t.kind === "versioned_cart" && m(t, ["kind", "lane", "generation", "version"]) && p(t.lane, 128) && p(t.generation, 256) && x(t.version) : !1;
}
function Oe(t) {
  return !T(t) || !m(t, [
    "resource",
    "variantId",
    "qty",
    "unitAmountCents",
    "lineTotalCents",
    "currency",
    "title",
    "image",
    "paymentResource",
    "shippingProfileId"
  ], !0) ? !1 : p(t.resource, 128) && (t.variantId === void 0 || p(t.variantId, 128)) && _(t.qty) && x(t.unitAmountCents) && x(t.lineTotalCents) && Pt(t.currency) && p(t.title, 512) && (t.image === void 0 || p(t.image, 2048)) && p(t.paymentResource, 128) && (t.shippingProfileId === void 0 || p(t.shippingProfileId, 256));
}
function Pe(t) {
  return T(t) ? t.kind === "fixed" ? m(t, ["kind", "amountCents"]) && _(t.amountCents) : t.kind === "percentage" && m(t, ["kind", "basisPoints", "amountCents"]) && _(t.basisPoints) && Number(t.basisPoints) <= 1e4 && _(t.amountCents) : !1;
}
function _e(t) {
  return T(t) && m(t, ["holdId", "expiresAt"]) && p(t.holdId, 256) && _t(t.expiresAt);
}
function Ut(t) {
  return T(t) && $t(t.operationId) && St(t.attemptId) && Ot(t.paymentMethod);
}
function $t(t) {
  return typeof t == "string" && xe.test(t);
}
function St(t) {
  return p(t, 256);
}
function Re(t) {
  return typeof t == "string" && t.length <= 255 && /^cs_[A-Za-z0-9_-]+$/u.test(t);
}
function Me(t) {
  if (typeof t != "string" || t.length > 2048) return !1;
  try {
    const e = new URL(t);
    return e.protocol === "https:" && e.hostname === "checkout.stripe.com" && !e.username && !e.password;
  } catch {
    return !1;
  }
}
function Ne(t) {
  return Array.isArray(t) && t.length >= 1 && t.length <= 3 && new Set(t).size === t.length && t.every(Ot);
}
function Ot(t) {
  return t === "stripe" || t === "x402" || t === "credits";
}
function He(t) {
  return typeof t == "string" && /^[a-z0-9][a-z0-9_-]{0,63}$/u.test(t);
}
function Pt(t) {
  return typeof t == "string" && /^[A-Za-z]{3}$/u.test(t);
}
function Ke(t) {
  return typeof t == "string" && Ce.test(t);
}
function p(t, e) {
  return typeof t == "string" && !!t.trim() && t.length <= e && !Le(t);
}
function _(t) {
  return Number.isSafeInteger(t) && Number(t) > 0;
}
function x(t) {
  return Number.isSafeInteger(t) && Number(t) >= 0;
}
function _t(t) {
  return typeof t == "string" && !Number.isNaN(Date.parse(t));
}
function m(t, e, n = !1) {
  const r = Object.keys(t);
  return r.every((i) => e.includes(i)) && (n || r.length === e.length);
}
function T(t) {
  return typeof t == "object" && t !== null && !Array.isArray(t);
}
function Le(t) {
  return [...t].some((e) => e.charCodeAt(0) <= 31 || e.charCodeAt(0) === 127);
}
function nt() {
  return new Error("Invalid checkout response");
}
function je(t) {
  return {
    schemaVersion: 1,
    idempotencyKey: t.idempotencyKey,
    attemptId: t.attemptId,
    clientMaterialSha256: v(X, t),
    source: { kind: "items", items: t.lines.map((e) => ({
      resource: e.productId,
      variantId: e.variantId,
      qty: e.quantity
    })) },
    promotionCode: t.couponCode,
    customerContext: Rt(t.successUrl, t.cancelUrl, t.customerEmail),
    requestedPaymentMethods: ["stripe"]
  };
}
function Be(t) {
  return {
    schemaVersion: 1,
    idempotencyKey: t.idempotencyKey,
    attemptId: t.attemptId,
    clientMaterialSha256: v(Y, t),
    quoteOperationId: t.quoteOperationId,
    paymentMethod: "stripe",
    customerContext: Rt(t.successUrl, t.cancelUrl, t.customerEmail),
    railProof: { kind: "stripe" }
  };
}
function Ve(t) {
  return {
    status: "resolved",
    operationId: t.operationId,
    attemptId: t.attemptId,
    replayed: t.replayed,
    quote: {
      cartGeneration: t.quote.source.kind === "versioned_cart" ? t.quote.source.version : 0,
      currency: t.quote.currency,
      lines: t.quote.lines.map((e) => ({
        productId: e.resource,
        quantity: e.qty,
        unitAmountCents: e.unitAmountCents
      })),
      discountCents: t.quote.discountCents,
      taxCents: t.quote.taxCents,
      shippingCents: t.quote.shippingCents,
      totalCents: t.quote.totalCents
    }
  };
}
function ut(t) {
  return t.status === "terminal" ? { status: "terminal", durable: !0, code: t.code, replayed: t.replayed } : t.status === "indeterminate" ? L(t.code) : {
    status: "resolved",
    operationId: t.operationId,
    attemptId: t.attemptId,
    ...t.status === "action_required" ? { returnArtifact: t.returnArtifact } : {},
    replayed: t.replayed
  };
}
function De(t) {
  return t.status === "resolved" ? { status: "resolved", checkoutUrl: t.checkoutUrl } : { status: t.status };
}
function Fe(t) {
  if (t.status === "action_required")
    return {
      schemaVersion: 1,
      operationId: t.operationId,
      expectedAttemptId: t.attemptId,
      returnArtifact: t.returnArtifact
    };
}
function ze(t) {
  if (!Ge(t) || !ht(t, ["status", "checkoutAttemptId"])) throw pt();
  if (t.status === "verified" && Je(t.checkoutAttemptId, 256) || (t.status === "mismatch" || t.status === "indeterminate") && ht(t, ["status"])) return t;
  throw pt();
}
function L(t = "transport-outcome-unknown") {
  return { status: "indeterminate", code: t };
}
function Rt(t, e, n) {
  return {
    fulfillment: { kind: "digital" },
    ...n === void 0 ? {} : { contact: { email: n } },
    returnUrls: { success: t, cancel: e }
  };
}
function Ge(t) {
  return typeof t == "object" && t !== null && !Array.isArray(t);
}
function ht(t, e) {
  return Object.keys(t).every((n) => e.includes(n)) && Object.keys(t).length === e.length;
}
function Je(t, e) {
  return typeof t == "string" && !!t.trim() && t.length <= e && !We(t);
}
function We(t) {
  return [...t].some((e) => e.charCodeAt(0) <= 31 || e.charCodeAt(0) === 127);
}
function pt() {
  return new Error("Invalid checkout response");
}
const Ze = /^payop_[0-9a-f]{64}$/u;
function Qe(t) {
  if (M(t, [
    "idempotencyKey",
    "attemptId",
    "cartGeneration",
    "lines",
    "couponCode",
    "customerEmail",
    "successUrl",
    "cancelUrl",
    "metadata"
  ]), Mt(t.idempotencyKey, t.attemptId), t.cartGeneration !== void 0 && W(t.cartGeneration, 0, "cartGeneration"), !Array.isArray(t.lines) || t.lines.length < 1 || t.lines.length > 100)
    throw new TypeError("lines must contain 1 to 100 entries");
  t.lines.forEach((e) => {
    M(e, ["productId", "quantity", "variantId"]), rt(e.productId, 128, "productId"), W(e.quantity, 1, "quantity", 999), Z(e.variantId, 128, "variantId");
  }), Z(t.couponCode, 256, "couponCode"), Kt(t.customerEmail), B(t.successUrl, "successUrl"), B(t.cancelUrl, "cancelUrl"), Ht(t.metadata);
}
function Xe(t) {
  if (M(t, [
    "idempotencyKey",
    "attemptId",
    "quoteOperationId",
    "amountCents",
    "currency",
    "productName",
    "successUrl",
    "cancelUrl",
    "customerEmail",
    "clientReferenceId",
    "metadata"
  ]), Mt(t.idempotencyKey, t.attemptId), Nt(t.quoteOperationId), W(t.amountCents, 0, "amountCents"), !/^[A-Za-z]{3}$/u.test(t.currency)) throw new TypeError("currency is invalid");
  rt(t.productName, 512, "productName"), B(t.successUrl, "successUrl"), B(t.cancelUrl, "cancelUrl"), Kt(t.customerEmail), Z(t.clientReferenceId, 256, "clientReferenceId"), Ht(t.metadata);
}
function Ye(t) {
  if (M(t, ["operationId", "resolveProviderUrl"]), Nt(t.operationId), t.resolveProviderUrl !== void 0 && typeof t.resolveProviderUrl != "boolean")
    throw new TypeError("resolveProviderUrl is invalid");
}
function qe(t) {
  M(t, ["expectedAttemptId", "returnArtifact"]), $(t.expectedAttemptId, 256, "expectedAttemptId"), $(t.returnArtifact, 2048, "returnArtifact");
}
function Mt(t, e) {
  xt(t), $(e, 256, "attemptId");
}
function Nt(t) {
  if (typeof t != "string" || !Ze.test(t)) throw new TypeError("operationId is invalid");
}
function Ht(t) {
  if (t !== void 0) {
    if (!jt(t) || Object.keys(t).length > 32) throw new TypeError("metadata is invalid");
    Object.entries(t).forEach(([e, n]) => {
      $(e, 64, "metadata key"), $(n, 256, "metadata value");
    });
  }
}
function Kt(t) {
  if (t !== void 0 && (t.length > 254 || Lt(t) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(t))) throw new TypeError("customerEmail is invalid");
}
function B(t, e) {
  if (typeof t != "string" || t.length > 2048) throw new TypeError(`${e} is invalid`);
  try {
    const n = new URL(t);
    if (n.protocol !== "https:" || n.username || n.password) throw new Error();
  } catch {
    throw new TypeError(`${e} must be an absolute HTTPS URL without user information`);
  }
}
function W(t, e, n, r = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(t) || t < e || t > r) throw new TypeError(`${n} is invalid`);
}
function Z(t, e, n) {
  t !== void 0 && rt(t, e, n);
}
function rt(t, e, n) {
  $(t, e, n);
}
function $(t, e, n) {
  if (typeof t != "string" || !t.trim() || t.length > e || Lt(t))
    throw new TypeError(`${n} is invalid`);
}
function M(t, e) {
  if (!jt(t) || Object.keys(t).some((n) => !e.includes(n)))
    throw new TypeError("request contains an unknown field");
}
function Lt(t) {
  return [...t].some((e) => e.charCodeAt(0) <= 31 || e.charCodeAt(0) === 127);
}
function jt(t) {
  return typeof t == "object" && t !== null && !Array.isArray(t);
}
const mt = "/extensions/cedros-pay", ve = 15e3, yt = 64 * 1024;
class S extends Error {
  constructor(e, n, r) {
    super(r), this.status = e, this.code = n, this.name = "CheckoutRequestError";
  }
  status;
  code;
}
class tn {
  baseUrl;
  fetcher;
  headers;
  timeoutMs;
  constructor(e) {
    this.baseUrl = nn(e.serverUrl ?? ""), this.fetcher = e.fetch ?? globalThis.fetch.bind(globalThis), this.headers = new Headers(e.headers), rn(this.headers), this.timeoutMs = lt(e.timeoutMs ?? ve);
  }
  write(e, n, r, i) {
    const o = new Headers(this.headers);
    return o.set("Content-Type", "application/json"), r !== void 0 && o.set("Idempotency-Key", r), this.request(e, { method: "POST", headers: o, body: JSON.stringify(n) }, i);
  }
  read(e, n) {
    return this.request(e, { method: "GET", headers: new Headers(this.headers) }, n);
  }
  async request(e, n, r) {
    const i = lt(r?.timeoutMs ?? this.timeoutMs), o = new AbortController(), s = () => o.abort(new DOMException("Aborted", "AbortError"));
    r?.signal?.aborted ? s() : r?.signal?.addEventListener("abort", s, { once: !0 });
    const c = setTimeout(() => o.abort("timeout"), i);
    try {
      if (o.signal.aborted) throw o.signal.reason;
      const a = await this.fetcher(`${this.baseUrl}${e}`, { ...n, signal: o.signal }), f = await en(a);
      if (!a.ok) throw on(a.status, f);
      if (!Q(f)) throw P();
      return f;
    } catch (a) {
      throw o.signal.reason === "timeout" ? new S(408, "request_timeout", "Checkout request timed out") : a;
    } finally {
      clearTimeout(c), r?.signal?.removeEventListener("abort", s);
    }
  }
}
async function en(t) {
  const e = t.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (!e || e !== "application/json" && !e.endsWith("+json"))
    throw P("Checkout response must be JSON");
  const n = Number(t.headers.get("content-length"));
  if (Number.isFinite(n) && n > yt)
    throw P("Checkout response is too large");
  const r = await t.text();
  if (new TextEncoder().encode(r).length > yt)
    throw P("Checkout response is too large");
  try {
    return JSON.parse(r);
  } catch {
    throw P();
  }
}
function nn(t) {
  const e = t.replace(/\/$/u, "");
  return e.endsWith(mt) ? e : `${e}${mt}`;
}
function rn(t) {
  if (t.has("content-type") || t.has("idempotency-key"))
    throw new TypeError("Content-Type and Idempotency-Key headers are reserved");
}
function lt(t) {
  if (!Number.isSafeInteger(t) || t < 1 || t > 12e4)
    throw new TypeError("timeoutMs must be an integer from 1 to 120000");
  return t;
}
function on(t, e) {
  const n = Q(e) && Q(e.error) ? e.error : void 0, r = typeof n?.code == "string" && /^[a-z0-9][a-z0-9_-]{0,63}$/u.test(n.code) ? n.code : "checkout_request_failed", i = typeof n?.message == "string" && n.message.length <= 256 && !sn(n.message) ? n.message : "Checkout request failed";
  return new S(t, r, i);
}
function Q(t) {
  return typeof t == "object" && t !== null && !Array.isArray(t);
}
function sn(t) {
  return [...t].some((e) => {
    const n = e.charCodeAt(0);
    return n <= 31 || n === 127;
  });
}
function P(t = "Invalid checkout response") {
  return new S(502, "invalid_response", t);
}
class cn {
  transport;
  inFlight = /* @__PURE__ */ new Map();
  constructor(e = {}) {
    this.transport = new tn(e);
  }
  /** Reads the authenticated, host-derived capability descriptor. */
  async descriptor(e) {
    return re(await this.transport.read("/checkout/descriptor", e));
  }
  quote(e, n) {
    Qe(e);
    const r = je(e);
    return de(r), this.deduplicate(X, e.idempotencyKey, e, n?.signal, async () => {
      try {
        const i = Ee(await this.transport.write("/checkout/quote", r, e.idempotencyKey, n));
        if (i.attemptId !== e.attemptId) throw K("quote attempt");
        return Ve(i);
      } catch (i) {
        const o = wt(i);
        if (o) return o;
        if (H(i)) return L();
        throw i;
      }
    });
  }
  checkout(e, n) {
    Xe(e);
    const r = Be(e);
    return fe(r), this.deduplicate(Y, e.idempotencyKey, e, n?.signal, async () => {
      try {
        const i = ft(await this.transport.write("/checkout", r, e.idempotencyKey, n));
        if (i.attemptId !== e.attemptId) throw K("checkout attempt");
        return ut(i);
      } catch (i) {
        const o = wt(i);
        if (o) return o;
        if (H(i)) return L();
        throw i;
      }
    });
  }
  async status(e, n) {
    Ye(e);
    try {
      const r = ft(await this.transport.read(
        `/checkout/${encodeURIComponent(e.operationId)}`,
        n
      ));
      if (r.operationId !== e.operationId) throw K("checkout operation");
      const i = ut(r);
      if (!e.resolveProviderUrl) return { outcome: i };
      const o = Fe(r);
      if (!o) return { outcome: i, providerUrl: { status: "indeterminate" } };
      he(o);
      const s = Ae(await this.transport.write("/checkout/resolve", o, void 0, n));
      if (s.operationId !== r.operationId || s.attemptId !== r.attemptId)
        throw K("provider action");
      return { outcome: i, providerUrl: De(s) };
    } catch (r) {
      if (H(r)) return { outcome: L() };
      throw r;
    }
  }
  async verifyReturn(e, n) {
    qe(e);
    try {
      const r = { schemaVersion: 1, ...e }, i = ze(await this.transport.write("/checkout/return/verify", r, void 0, n));
      return i.status === "verified" && i.checkoutAttemptId !== e.expectedAttemptId ? { status: "mismatch" } : i;
    } catch (r) {
      if (H(r)) return { status: "indeterminate" };
      throw r;
    }
  }
  deduplicate(e, n, r, i, o) {
    const s = `${e}\0${n}\0${v(e, r)}`, c = this.inFlight.get(s);
    if (c) return c;
    const a = o().finally(() => {
      this.inFlight.get(s) === a && this.inFlight.delete(s);
    });
    return this.inFlight.set(s, a), i?.addEventListener("abort", () => {
      this.inFlight.get(s) === a && this.inFlight.delete(s);
    }, { once: !0 }), a;
  }
}
function H(t) {
  return !(t instanceof S) || t.status === 408 || t.status >= 500;
}
function wt(t) {
  return t instanceof S && t.status === 409 && t.code === "idempotency_mismatch" ? { status: "terminal", durable: !0, code: t.code, replayed: !0 } : void 0;
}
function K(t) {
  return new S(502, "correlation_mismatch", `${t} correlation mismatch`);
}
function dn(t) {
  const e = Dt(() => t ?? new cn(), [t]), [n, r] = V("idle"), [i, o] = V(null), [s, c] = V(null), a = D(0), f = D(!0), h = D(null);
  Ft(() => () => {
    f.current = !1, h.current?.abort("unmount");
  }, []);
  const d = E(async (l) => {
    h.current?.abort("superseded");
    const g = new AbortController();
    h.current = g;
    const it = ++a.current;
    r("loading"), c(null);
    try {
      const U = await l(g.signal);
      return f.current && a.current === it && (o(U), r(U.status)), U;
    } catch (U) {
      const ot = U instanceof Error ? U : new Error("Checkout request failed");
      throw f.current && a.current === it && !g.signal.aborted && (c(ot), r("error")), ot;
    } finally {
      h.current === g && (h.current = null);
    }
  }, []), C = E((l) => d((g) => e.quote(l, { signal: g })), [e, d]), w = E((l) => d((g) => e.checkout(l, { signal: g })), [e, d]), N = E((l) => e.status(l), [e]), O = E((l) => e.verifyReturn(l), [e]), Bt = E(() => e.descriptor(), [e]), Vt = E(() => {
    h.current?.abort("reset"), a.current += 1, r("idle"), o(null), c(null);
  }, []);
  return { client: e, state: n, outcome: i, error: s, descriptor: Bt, quote: C, checkout: w, status: N, verifyReturn: O, reset: Vt };
}
export {
  Y as CHECKOUT_CREATE_SCOPE,
  zt as CHECKOUT_PROTOCOL,
  X as CHECKOUT_QUOTE_SCOPE,
  cn as CedrosPayCheckout,
  S as CheckoutRequestError,
  dn as useCedrosPayCheckout,
  xt as validateIdempotencyKey
};
