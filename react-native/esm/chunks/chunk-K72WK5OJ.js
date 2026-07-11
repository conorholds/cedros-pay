// src/canonicalCheckout/contract.ts
var CHECKOUT_PROTOCOL = "cedros-pay-checkout";
var CHECKOUT_QUOTE_SCOPE = "cedros-pay-checkout:quote";
var CHECKOUT_CREATE_SCOPE = "cedros-pay-checkout:checkout";

// src/canonicalCheckout/inputValidation.ts
var IDENTIFIER = /^[A-Za-z0-9_.:-]+$/u;
var OPERATION_ID = /^payop_[0-9a-f]{64}$/u;
var RETURN_ARTIFACT = /^cs_[A-Za-z0-9_-]+$/u;
var PAYMENT_METHODS = /* @__PURE__ */ new Set(["stripe", "x402", "credits"]);
function validateQuoteRequest(request) {
  exact(request, [
    "schemaVersion",
    "idempotencyKey",
    "attemptId",
    "clientMaterialSha256",
    "source",
    "promotionCode",
    "customerContext",
    "tip",
    "requestedPaymentMethods"
  ]);
  schema(request.schemaVersion);
  identity(request.idempotencyKey, request.attemptId);
  sha256(request.clientMaterialSha256);
  source(request.source);
  optionalText(request.promotionCode, 256, "promotionCode");
  customer(request.customerContext);
  if (request.tip !== void 0) tip(request.tip);
  methods(request.requestedPaymentMethods);
}
function validateCreateRequest(request) {
  exact(request, [
    "schemaVersion",
    "idempotencyKey",
    "attemptId",
    "clientMaterialSha256",
    "quoteOperationId",
    "paymentMethod",
    "customerContext",
    "railProof"
  ]);
  schema(request.schemaVersion);
  identity(request.idempotencyKey, request.attemptId);
  sha256(request.clientMaterialSha256);
  operationId(request.quoteOperationId, "quoteOperationId");
  if (!PAYMENT_METHODS.has(request.paymentMethod)) throw new TypeError("paymentMethod is invalid");
  customer(request.customerContext);
  if (request.railProof !== void 0) railProof(request.railProof);
  if (request.paymentMethod === "x402" && request.railProof?.kind !== "x402" || request.railProof !== void 0 && request.railProof.kind !== request.paymentMethod) {
    throw new TypeError("railProof does not match paymentMethod");
  }
}
function validateOperationRequest(request) {
  exact(request, ["schemaVersion", "operationId", "expectedAttemptId", "returnArtifact"]);
  schema(request.schemaVersion);
  operationId(request.operationId, "operationId");
  attempt(request.expectedAttemptId);
  if (typeof request.returnArtifact !== "string" || request.returnArtifact.length > 255 || !RETURN_ARTIFACT.test(request.returnArtifact)) throw new TypeError("returnArtifact is invalid");
}
var validateProviderRequest = validateOperationRequest;
function validateIdempotencyKey(value) {
  if (typeof value !== "string" || value.length < 1 || value.length > 67 || ![...value].every((character) => character.charCodeAt(0) >= 33 && character.charCodeAt(0) <= 126)) {
    throw new TypeError("idempotencyKey must be 1 to 67 visible ASCII characters");
  }
}
function source(value) {
  if (!record(value)) throw new TypeError("source is invalid");
  if (value.kind === "items") {
    exact(value, ["kind", "items"]);
    items(value.items);
  } else if (value.kind === "versioned_cart") {
    exact(value, ["kind", "lane", "generation", "version"]);
    identifier(value.lane, "lane");
    text(value.generation, 256, "generation");
    integer(value.version, 0, 1e5, "version");
  } else throw new TypeError("source kind is invalid");
}
function items(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 100) {
    throw new TypeError("items must contain 1 to 100 entries");
  }
  for (const item of value) {
    exact(item, ["resource", "variantId", "qty"]);
    identifier(item.resource, "resource");
    if (item.variantId !== void 0) identifier(item.variantId, "variantId");
    integer(item.qty, 1, 999, "qty");
  }
}
function customer(value) {
  if (!record(value)) throw new TypeError("customerContext is invalid");
  exact(value, ["fulfillment", "contact", "returnUrls"]);
  const fulfillment = value.fulfillment;
  if (!record(fulfillment)) throw new TypeError("fulfillment is invalid");
  if (fulfillment.kind === "digital") exact(fulfillment, ["kind"]);
  else if (fulfillment.kind === "shipping") {
    exact(fulfillment, ["kind", "address", "shipping"]);
    address(fulfillment.address);
    exact(fulfillment.shipping, ["optionId"]);
    text(fulfillment.shipping.optionId, 128, "shipping.optionId");
  } else throw new TypeError("fulfillment kind is invalid");
  if (value.contact !== void 0) contact(value.contact);
  if (!record(value.returnUrls)) throw new TypeError("returnUrls is invalid");
  exact(value.returnUrls, ["success", "cancel"]);
  redirect(value.returnUrls.success, "returnUrls.success");
  redirect(value.returnUrls.cancel, "returnUrls.cancel");
}
function address(value) {
  if (!record(value)) throw new TypeError("address is invalid");
  exact(value, ["line1", "line2", "city", "region", "postalCode", "country"]);
  text(value.line1, 200, "address.line1");
  optionalText(value.line2, 200, "address.line2");
  text(value.city, 100, "address.city");
  optionalText(value.region, 100, "address.region");
  text(value.postalCode, 32, "address.postalCode");
  if (typeof value.country !== "string" || !/^[A-Za-z]{2}$/u.test(value.country)) {
    throw new TypeError("address.country is invalid");
  }
}
function contact(value) {
  exact(value, ["email", "phone", "displayName"]);
  if (value.email !== void 0 && (value.email.length > 254 || control(value.email) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value.email))) throw new TypeError("contact.email is invalid");
  optionalText(value.phone, 64, "contact.phone");
  optionalText(value.displayName, 200, "contact.displayName");
}
function railProof(value) {
  if (!record(value)) throw new TypeError("railProof is invalid");
  if (value.kind === "x402") {
    exact(value, ["kind", "transaction"]);
    text(value.transaction, 4096, "railProof.transaction");
  } else if (value.kind === "stripe" || value.kind === "credits") exact(value, ["kind"]);
  else throw new TypeError("railProof kind is invalid");
}
function tip(value) {
  if (!record(value)) throw new TypeError("tip is invalid");
  if (value.kind === "fixed") {
    exact(value, ["kind", "amountCents"]);
    integer(value.amountCents, 1, 1e6, "tip.amountCents");
  } else if (value.kind === "percentage") {
    exact(value, ["kind", "basisPoints"]);
    integer(value.basisPoints, 1, 1e4, "tip.basisPoints");
  } else throw new TypeError("tip.kind is invalid");
}
function methods(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 3 || new Set(value).size !== value.length || value.some((method) => !PAYMENT_METHODS.has(method))) {
    throw new TypeError("requestedPaymentMethods is invalid");
  }
}
function identity(key, attemptId) {
  validateIdempotencyKey(key);
  attempt(attemptId);
}
function schema(value) {
  if (value !== 1) throw new TypeError("schemaVersion must be 1");
}
function sha256(value) {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/u.test(value)) {
    throw new TypeError("clientMaterialSha256 must be 64 lowercase hex characters");
  }
}
function attempt(value) {
  if (typeof value !== "string" || !value.trim() || bytes(value) > 256 || control(value)) {
    throw new TypeError("attemptId must be a nonblank opaque value no longer than 256 bytes");
  }
}
function operationId(value, label) {
  if (typeof value !== "string" || !OPERATION_ID.test(value)) throw new TypeError(`${label} is invalid`);
}
function identifier(value, label) {
  if (typeof value !== "string" || value.length > 128 || !IDENTIFIER.test(value)) {
    throw new TypeError(`${label} is invalid`);
  }
}
function text(value, max, label) {
  if (typeof value !== "string" || !value.trim() || value.length > max || control(value)) {
    throw new TypeError(`${label} is invalid`);
  }
}
function optionalText(value, max, label) {
  if (value !== void 0) text(value, max, label);
}
function integer(value, min, max, label) {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new TypeError(`${label} is invalid`);
}
function redirect(value, label) {
  if (typeof value !== "string" || value.length > 2048) throw new TypeError(`${label} is invalid`);
  try {
    const url2 = new URL(value);
    if (url2.protocol !== "https:" || url2.username || url2.password) throw new Error();
  } catch {
    throw new TypeError(`${label} must be an absolute HTTPS URL without user information`);
  }
}
function exact(value, allowed) {
  if (Object.keys(value).some((key) => !allowed.includes(key))) throw new TypeError("request contains an unknown field");
}
function bytes(value) {
  let length = 0;
  for (const character of value) {
    const code2 = character.codePointAt(0) ?? 0;
    length += code2 <= 127 ? 1 : code2 <= 2047 ? 2 : code2 <= 65535 ? 3 : 4;
  }
  return length;
}
function control(value) {
  return [...value].some((character) => character.charCodeAt(0) <= 31 || character.charCodeAt(0) === 127);
}
function record(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// src/canonicalCheckout/responseValidation.ts
var OPERATION_ID2 = /^payop_[0-9a-f]{64}$/u;
var HEX_64 = /^[0-9a-f]{64}$/u;
function checkoutOutcome(value) {
  if (!isCheckoutOutcome(value)) throw invalidResponse();
  return value;
}
function quoteResponse(value) {
  if (!isQuoteResponse(value)) throw invalidResponse();
  return value;
}
function providerOutcome(value) {
  if (!isProviderOutcome(value)) throw invalidResponse();
  return value;
}
function isQuoteResponse(value) {
  return record2(value) && exact2(value, ["schemaVersion", "operationId", "attemptId", "quote", "replayed"]) && value.schemaVersion === 1 && operationId2(value.operationId) && text2(value.attemptId, 256) && typeof value.replayed === "boolean" && quote(value.quote);
}
function isCheckoutOutcome(value) {
  if (!operationBase(value) || typeof value.replayed !== "boolean") return false;
  const common = ["status", "operationId", "attemptId", "paymentMethod", "replayed"];
  if (value.status === "action_required") {
    return exact2(value, [...common, "returnArtifact"]) && returnArtifact(value.returnArtifact);
  }
  if (value.status === "processing" || value.status === "paid") return exact2(value, common);
  return (value.status === "terminal" || value.status === "indeterminate") && exact2(value, [...common, "code"]) && code(value.code);
}
function isProviderOutcome(value) {
  if (!operationBase(value)) return false;
  const common = ["status", "operationId", "attemptId", "paymentMethod"];
  if (value.status === "resolved") return exact2(value, [...common, "checkoutUrl"]) && providerUrl(value.checkoutUrl);
  return (value.status === "mismatch" || value.status === "indeterminate") && exact2(value, common);
}
function quote(value) {
  if (!record2(value) || !exact2(value, [
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
    "promotionCode",
    "shippingRateId",
    "taxRateId",
    "appliedTip",
    "inventoryHold",
    "requestedPaymentMethods",
    "expiresAt"
  ], true) || value.schemaVersion !== 1 || !source2(value.source) || !Array.isArray(value.lines) || value.lines.length < 1 || value.lines.length > 100 || !currency(value.currency) || !nonnegative(value.subtotalCents) || !nonnegative(value.discountCents) || !nonnegative(value.shippingCents) || !nonnegative(value.taxCents) || !nonnegative(value.tipCents) || !positive(value.totalCents) || value.promotionCode !== void 0 && !text2(value.promotionCode, 256) || value.shippingRateId !== void 0 && !text2(value.shippingRateId, 256) || value.taxRateId !== void 0 && !text2(value.taxRateId, 256) || value.appliedTip !== void 0 && !appliedTip(value.appliedTip) || value.inventoryHold !== void 0 && !inventoryHold(value.inventoryHold) || !methods2(value.requestedPaymentMethods) || !dateTime(value.expiresAt)) return false;
  return value.lines.every(line);
}
function source2(value) {
  if (!record2(value)) return false;
  if (value.kind === "items") return exact2(value, ["kind", "intentSha256"]) && hex(value.intentSha256);
  return value.kind === "versioned_cart" && exact2(value, ["kind", "lane", "generation", "version"]) && text2(value.lane, 128) && text2(value.generation, 256) && nonnegative(value.version);
}
function line(value) {
  if (!record2(value) || !exact2(value, [
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
  ], true)) return false;
  return text2(value.resource, 128) && (value.variantId === void 0 || text2(value.variantId, 128)) && positive(value.qty) && nonnegative(value.unitAmountCents) && nonnegative(value.lineTotalCents) && currency(value.currency) && text2(value.title, 512) && (value.image === void 0 || text2(value.image, 2048)) && text2(value.paymentResource, 128) && (value.shippingProfileId === void 0 || text2(value.shippingProfileId, 256));
}
function appliedTip(value) {
  if (!record2(value)) return false;
  if (value.kind === "fixed") return exact2(value, ["kind", "amountCents"]) && positive(value.amountCents);
  return value.kind === "percentage" && exact2(value, ["kind", "basisPoints", "amountCents"]) && positive(value.basisPoints) && Number(value.basisPoints) <= 1e4 && positive(value.amountCents);
}
function inventoryHold(value) {
  return record2(value) && exact2(value, ["holdId", "expiresAt"]) && text2(value.holdId, 256) && dateTime(value.expiresAt);
}
function operationBase(value) {
  return record2(value) && operationId2(value.operationId) && text2(value.attemptId, 256) && paymentMethod(value.paymentMethod);
}
function operationId2(value) {
  return typeof value === "string" && OPERATION_ID2.test(value);
}
function returnArtifact(value) {
  return typeof value === "string" && value.length <= 255 && /^cs_[A-Za-z0-9_-]+$/u.test(value);
}
function providerUrl(value) {
  if (typeof value !== "string" || value.length > 2048) return false;
  try {
    const url2 = new URL(value);
    return url2.protocol === "https:" && url2.hostname === "checkout.stripe.com" && !url2.username && !url2.password;
  } catch {
    return false;
  }
}
function methods2(value) {
  return Array.isArray(value) && value.length >= 1 && value.length <= 3 && new Set(value).size === value.length && value.every(paymentMethod);
}
function paymentMethod(value) {
  return value === "stripe" || value === "x402" || value === "credits";
}
function code(value) {
  return typeof value === "string" && /^[a-z0-9][a-z0-9_-]{0,63}$/u.test(value);
}
function currency(value) {
  return typeof value === "string" && /^[A-Za-z]{3}$/u.test(value);
}
function hex(value) {
  return typeof value === "string" && HEX_64.test(value);
}
function text2(value, max) {
  return typeof value === "string" && Boolean(value.trim()) && value.length <= max && !control2(value);
}
function positive(value) {
  return Number.isSafeInteger(value) && Number(value) > 0;
}
function nonnegative(value) {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}
function dateTime(value) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}
function exact2(value, allowed, optional = false) {
  const keys = Object.keys(value);
  return keys.every((key) => allowed.includes(key)) && (optional || keys.length === allowed.length);
}
function record2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function control2(value) {
  return [...value].some((character) => character.charCodeAt(0) <= 31 || character.charCodeAt(0) === 127);
}
function invalidResponse() {
  return new Error("Invalid checkout response");
}

// src/canonicalCheckout/publicMaterial.ts
import { sha256 as sha2562 } from "@noble/hashes/sha2.js";
import { utf8ToBytes } from "@noble/hashes/utils.js";

// src/canonicalCheckout/canonicalJson.ts
function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value).filter(([, entry]) => entry !== void 0).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0);
    return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

// src/canonicalCheckout/publicMaterial.ts
function publicMaterialDigest(scope, request) {
  const bytes2 = sha2562(utf8ToBytes(canonicalJson({ scope, request })));
  return [...bytes2].map((value) => value.toString(16).padStart(2, "0")).join("");
}

// src/canonicalCheckout/publicMapping.ts
function quoteWireRequest(request) {
  return {
    schemaVersion: 1,
    idempotencyKey: request.idempotencyKey,
    attemptId: request.attemptId,
    clientMaterialSha256: publicMaterialDigest(CHECKOUT_QUOTE_SCOPE, request),
    source: { kind: "items", items: request.lines.map((line2) => ({
      resource: line2.productId,
      variantId: line2.variantId,
      qty: line2.quantity
    })) },
    promotionCode: request.couponCode,
    customerContext: customerContext(request.successUrl, request.cancelUrl, request.customerEmail),
    requestedPaymentMethods: ["stripe"]
  };
}
function createWireRequest(request) {
  return {
    schemaVersion: 1,
    idempotencyKey: request.idempotencyKey,
    attemptId: request.attemptId,
    clientMaterialSha256: publicMaterialDigest(CHECKOUT_CREATE_SCOPE, request),
    quoteOperationId: request.quoteOperationId,
    paymentMethod: "stripe",
    customerContext: customerContext(request.successUrl, request.cancelUrl, request.customerEmail),
    railProof: { kind: "stripe" }
  };
}
function quoteOutcome(response) {
  return {
    status: "resolved",
    operationId: response.operationId,
    attemptId: response.attemptId,
    replayed: response.replayed,
    quote: {
      cartGeneration: response.quote.source.kind === "versioned_cart" ? response.quote.source.version : 0,
      currency: response.quote.currency,
      lines: response.quote.lines.map((line2) => ({
        productId: line2.resource,
        quantity: line2.qty,
        unitAmountCents: line2.unitAmountCents
      })),
      discountCents: response.quote.discountCents,
      taxCents: response.quote.taxCents,
      shippingCents: response.quote.shippingCents,
      totalCents: response.quote.totalCents
    }
  };
}
function checkoutOutcome2(response) {
  if (response.status === "terminal") return { status: "terminal", durable: true, code: response.code, replayed: response.replayed };
  if (response.status === "indeterminate") return indeterminate(response.code);
  return {
    status: "resolved",
    operationId: response.operationId,
    attemptId: response.attemptId,
    ...response.status === "action_required" ? { returnArtifact: response.returnArtifact } : {},
    replayed: response.replayed
  };
}
function providerOutcome2(response) {
  if (response.status === "resolved") return { status: "resolved", checkoutUrl: response.checkoutUrl };
  return { status: response.status };
}
function operationRequest(response) {
  if (response.status !== "action_required") return void 0;
  return {
    schemaVersion: 1,
    operationId: response.operationId,
    expectedAttemptId: response.attemptId,
    returnArtifact: response.returnArtifact
  };
}
function verifyOutcome(value) {
  if (!record3(value) || !exact3(value, ["status", "checkoutAttemptId"])) throw invalidResponse2();
  if (value.status === "verified" && opaque(value.checkoutAttemptId, 256)) return value;
  if ((value.status === "mismatch" || value.status === "indeterminate") && exact3(value, ["status"])) {
    return value;
  }
  throw invalidResponse2();
}
function indeterminate(code2 = "transport-outcome-unknown") {
  return { status: "indeterminate", code: code2 };
}
function customerContext(success, cancel, email) {
  return {
    fulfillment: { kind: "digital" },
    ...email === void 0 ? {} : { contact: { email } },
    returnUrls: { success, cancel }
  };
}
function record3(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function exact3(value, allowed) {
  return Object.keys(value).every((key) => allowed.includes(key)) && Object.keys(value).length === allowed.length;
}
function opaque(value, max) {
  return typeof value === "string" && Boolean(value.trim()) && value.length <= max && !hasControl(value);
}
function hasControl(value) {
  return [...value].some((character) => character.charCodeAt(0) <= 31 || character.charCodeAt(0) === 127);
}
function invalidResponse2() {
  return new Error("Invalid checkout response");
}

// src/canonicalCheckout/publicValidation.ts
var OPERATION_ID3 = /^payop_[0-9a-f]{64}$/u;
function validatePublicQuote(request) {
  exact4(request, [
    "idempotencyKey",
    "attemptId",
    "cartGeneration",
    "lines",
    "couponCode",
    "customerEmail",
    "successUrl",
    "cancelUrl",
    "metadata"
  ]);
  identity2(request.idempotencyKey, request.attemptId);
  if (request.cartGeneration !== void 0) integer2(request.cartGeneration, 0, "cartGeneration");
  if (!Array.isArray(request.lines) || request.lines.length < 1 || request.lines.length > 100) {
    throw new TypeError("lines must contain 1 to 100 entries");
  }
  request.lines.forEach((line2) => {
    exact4(line2, ["productId", "quantity", "variantId"]);
    opaque2(line2.productId, 128, "productId");
    integer2(line2.quantity, 1, "quantity", 999);
    optionalText2(line2.variantId, 128, "variantId");
  });
  optionalText2(request.couponCode, 256, "couponCode");
  optionalEmail(request.customerEmail);
  url(request.successUrl, "successUrl");
  url(request.cancelUrl, "cancelUrl");
  metadata(request.metadata);
}
function validatePublicCreate(request) {
  exact4(request, [
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
  ]);
  identity2(request.idempotencyKey, request.attemptId);
  operation(request.quoteOperationId);
  integer2(request.amountCents, 0, "amountCents");
  if (!/^[A-Za-z]{3}$/u.test(request.currency)) throw new TypeError("currency is invalid");
  opaque2(request.productName, 512, "productName");
  url(request.successUrl, "successUrl");
  url(request.cancelUrl, "cancelUrl");
  optionalEmail(request.customerEmail);
  optionalText2(request.clientReferenceId, 256, "clientReferenceId");
  metadata(request.metadata);
}
function validatePublicStatus(request) {
  exact4(request, ["operationId", "resolveProviderUrl"]);
  operation(request.operationId);
  if (request.resolveProviderUrl !== void 0 && typeof request.resolveProviderUrl !== "boolean") {
    throw new TypeError("resolveProviderUrl is invalid");
  }
}
function validatePublicReturn(request) {
  exact4(request, ["expectedAttemptId", "returnArtifact"]);
  opaque2(request.expectedAttemptId, 256, "expectedAttemptId");
  opaque2(request.returnArtifact, 2048, "returnArtifact");
}
function identity2(key, attemptId) {
  validateIdempotencyKey(key);
  opaque2(attemptId, 256, "attemptId");
}
function operation(value) {
  if (typeof value !== "string" || !OPERATION_ID3.test(value)) throw new TypeError("operationId is invalid");
}
function metadata(value) {
  if (value === void 0) return;
  if (!record4(value) || Object.keys(value).length > 32) throw new TypeError("metadata is invalid");
  Object.entries(value).forEach(([key, item]) => {
    opaque2(key, 64, "metadata key");
    opaque2(item, 256, "metadata value");
  });
}
function optionalEmail(value) {
  if (value !== void 0 && (value.length > 254 || hasControl2(value) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value))) throw new TypeError("customerEmail is invalid");
}
function url(value, label) {
  if (typeof value !== "string" || value.length > 2048) throw new TypeError(`${label} is invalid`);
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) throw new Error();
  } catch {
    throw new TypeError(`${label} must be an absolute HTTPS URL without user information`);
  }
}
function integer2(value, min, label, max = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new TypeError(`${label} is invalid`);
}
function optionalText2(value, max, label) {
  if (value !== void 0) opaque2(value, max, label);
}
function opaque2(value, max, label) {
  if (typeof value !== "string" || !value.trim() || value.length > max || hasControl2(value)) throw new TypeError(`${label} is invalid`);
}
function exact4(value, allowed) {
  if (!record4(value) || Object.keys(value).some((key) => !allowed.includes(key))) throw new TypeError("request contains an unknown field");
}
function hasControl2(value) {
  return [...value].some((character) => character.charCodeAt(0) <= 31 || character.charCodeAt(0) === 127);
}
function record4(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// src/canonicalCheckout/transport.ts
var EXTENSION_PATH = "/extensions/cedros-pay";
var DEFAULT_TIMEOUT_MS = 15e3;
var MAX_RESPONSE_BYTES = 64 * 1024;
var CheckoutRequestError = class extends Error {
  constructor(status, code2, message) {
    super(message);
    this.status = status;
    this.code = code2;
    this.name = "CheckoutRequestError";
  }
};
var CheckoutTransport = class {
  constructor(options) {
    this.baseUrl = baseUrl(options.serverUrl ?? "");
    this.fetcher = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.headers = new Headers(options.headers);
    if (this.headers.has("content-type") || this.headers.has("idempotency-key")) {
      throw new TypeError("Content-Type and Idempotency-Key headers are reserved");
    }
    this.timeoutMs = timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  }
  write(path, body, key, options) {
    const headers = new Headers(this.headers);
    headers.set("Content-Type", "application/json");
    if (key !== void 0) headers.set("Idempotency-Key", key);
    return this.request(path, { method: "POST", headers, body: JSON.stringify(body) }, options);
  }
  read(path, options) {
    return this.request(path, { method: "GET", headers: new Headers(this.headers) }, options);
  }
  async request(path, init, options) {
    const controller = new AbortController();
    const abort = () => controller.abort(new DOMException("Aborted", "AbortError"));
    if (options?.signal?.aborted) abort();
    else options?.signal?.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(() => controller.abort("timeout"), timeout(options?.timeoutMs ?? this.timeoutMs));
    try {
      if (controller.signal.aborted) throw controller.signal.reason;
      const response = await this.fetcher(`${this.baseUrl}${path}`, { ...init, signal: controller.signal });
      const value = await readJson(response);
      if (!response.ok) throw apiError(response.status, value);
      if (!record5(value)) throw invalidResponse3();
      return value;
    } catch (cause) {
      if (controller.signal.reason === "timeout") {
        throw new CheckoutRequestError(408, "request_timeout", "Checkout request timed out");
      }
      throw cause;
    } finally {
      clearTimeout(timer);
      options?.signal?.removeEventListener("abort", abort);
    }
  }
};
async function readJson(response) {
  const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (!contentType || contentType !== "application/json" && !contentType.endsWith("+json")) {
    throw invalidResponse3("Checkout response must be JSON");
  }
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_RESPONSE_BYTES) throw invalidResponse3("Checkout response is too large");
  const body = await response.text();
  if (utf8Bytes(body) > MAX_RESPONSE_BYTES) throw invalidResponse3("Checkout response is too large");
  try {
    return JSON.parse(body);
  } catch {
    throw invalidResponse3();
  }
}
function baseUrl(serverUrl) {
  const origin = serverUrl.replace(/\/$/u, "");
  return origin.endsWith(EXTENSION_PATH) ? origin : `${origin}${EXTENSION_PATH}`;
}
function timeout(value) {
  if (!Number.isSafeInteger(value) || value < 1 || value > 12e4) {
    throw new TypeError("timeoutMs must be an integer from 1 to 120000");
  }
  return value;
}
function apiError(status, value) {
  const error = record5(value) && record5(value.error) ? value.error : void 0;
  const code2 = typeof error?.code === "string" && /^[a-z0-9][a-z0-9_-]{0,63}$/u.test(error.code) ? error.code : "checkout_request_failed";
  const message = typeof error?.message === "string" && error.message.length <= 256 && !control3(error.message) ? error.message : "Checkout request failed";
  return new CheckoutRequestError(status, code2, message);
}
function control3(value) {
  return [...value].some((character) => character.charCodeAt(0) <= 31 || character.charCodeAt(0) === 127);
}
function utf8Bytes(value) {
  let length = 0;
  for (const character of value) {
    const code2 = character.codePointAt(0) ?? 0;
    length += code2 <= 127 ? 1 : code2 <= 2047 ? 2 : code2 <= 65535 ? 3 : 4;
  }
  return length;
}
function record5(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function invalidResponse3(message = "Invalid checkout response") {
  return new CheckoutRequestError(502, "invalid_response", message);
}

// src/canonicalCheckout/client.ts
var CedrosPayCheckout = class {
  constructor(options = {}) {
    this.inFlight = /* @__PURE__ */ new Map();
    this.transport = new CheckoutTransport(options);
  }
  async descriptor(options) {
    return descriptor(await this.transport.read("/checkout/descriptor", options));
  }
  quote(request, options) {
    validatePublicQuote(request);
    const wire = quoteWireRequest(request);
    validateQuoteRequest(wire);
    return this.deduplicate(CHECKOUT_QUOTE_SCOPE, request.idempotencyKey, request, options?.signal, async () => {
      try {
        const response = quoteResponse(await this.transport.write("/checkout/quote", wire, request.idempotencyKey, options));
        if (response.attemptId !== request.attemptId) throw correlationError("quote attempt");
        return quoteOutcome(response);
      } catch (cause) {
        const terminal = idempotencyTerminal(cause);
        if (terminal) return terminal;
        if (uncertain(cause)) return indeterminate();
        throw cause;
      }
    });
  }
  checkout(request, options) {
    validatePublicCreate(request);
    const wire = createWireRequest(request);
    validateCreateRequest(wire);
    return this.deduplicate(CHECKOUT_CREATE_SCOPE, request.idempotencyKey, request, options?.signal, async () => {
      try {
        const response = checkoutOutcome(await this.transport.write("/checkout", wire, request.idempotencyKey, options));
        if (response.attemptId !== request.attemptId) throw correlationError("checkout attempt");
        return checkoutOutcome2(response);
      } catch (cause) {
        const terminal = idempotencyTerminal(cause);
        if (terminal) return terminal;
        if (uncertain(cause)) return indeterminate();
        throw cause;
      }
    });
  }
  async status(request, options) {
    validatePublicStatus(request);
    try {
      const raw = checkoutOutcome(await this.transport.read(`/checkout/${encodeURIComponent(request.operationId)}`, options));
      if (raw.operationId !== request.operationId) throw correlationError("checkout operation");
      const outcome = checkoutOutcome2(raw);
      if (!request.resolveProviderUrl) return { outcome };
      const operation2 = operationRequest(raw);
      if (!operation2) return { outcome, providerUrl: { status: "indeterminate" } };
      validateProviderRequest(operation2);
      const resolved = providerOutcome(await this.transport.write("/checkout/resolve", operation2, void 0, options));
      if (resolved.operationId !== raw.operationId || resolved.attemptId !== raw.attemptId) throw correlationError("provider action");
      return { outcome, providerUrl: providerOutcome2(resolved) };
    } catch (cause) {
      if (uncertain(cause)) return { outcome: indeterminate() };
      throw cause;
    }
  }
  async verifyReturn(request, options) {
    validatePublicReturn(request);
    try {
      const wire = { schemaVersion: 1, ...request };
      const outcome = verifyOutcome(await this.transport.write("/checkout/return/verify", wire, void 0, options));
      if (outcome.status === "verified" && outcome.checkoutAttemptId !== request.expectedAttemptId) return { status: "mismatch" };
      return outcome;
    } catch (cause) {
      if (uncertain(cause)) return { status: "indeterminate" };
      throw cause;
    }
  }
  deduplicate(scope, key, material, signal, create) {
    const identity3 = `${scope}\0${key}\0${publicMaterialDigest(scope, material)}`;
    const existing = this.inFlight.get(identity3);
    if (existing) return existing;
    const promise = create().finally(() => {
      if (this.inFlight.get(identity3) === promise) this.inFlight.delete(identity3);
    });
    this.inFlight.set(identity3, promise);
    signal?.addEventListener("abort", () => {
      if (this.inFlight.get(identity3) === promise) this.inFlight.delete(identity3);
    }, { once: true });
    return promise;
  }
};
function descriptor(value) {
  if (!record6(value) || !exact5(value, [
    "protocol",
    "providerScope",
    "replayTtlMs",
    "acceptsExternalIdempotencyKey",
    "maxIdempotencyKeyLength",
    "idempotencyKeyCharacterSet",
    "operationScopes"
  ]) || value.protocol !== "cedros-pay-checkout" || !opaque3(value.providerScope, 512) || value.replayTtlMs !== 2592e5 || value.acceptsExternalIdempotencyKey !== true || value.maxIdempotencyKeyLength !== 67 || value.idempotencyKeyCharacterSet !== "ascii-visible" || !record6(value.operationScopes) || !exact5(value.operationScopes, ["quote", "checkout"]) || value.operationScopes.quote !== CHECKOUT_QUOTE_SCOPE || value.operationScopes.checkout !== CHECKOUT_CREATE_SCOPE) throw new Error("Invalid checkout descriptor");
  return value;
}
function uncertain(cause) {
  return !(cause instanceof CheckoutRequestError) || cause.status === 408 || cause.status >= 500;
}
function idempotencyTerminal(cause) {
  return cause instanceof CheckoutRequestError && cause.status === 409 && cause.code === "idempotency_mismatch" ? { status: "terminal", durable: true, code: cause.code, replayed: true } : void 0;
}
function correlationError(label) {
  return new CheckoutRequestError(502, "correlation_mismatch", `${label} correlation mismatch`);
}
function record6(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function exact5(value, allowed) {
  return Object.keys(value).every((key) => allowed.includes(key)) && Object.keys(value).length === allowed.length;
}
function opaque3(value, max) {
  return typeof value === "string" && value === value.trim() && Boolean(value) && value.length <= max && !hasControl3(value);
}
function hasControl3(value) {
  return [...value].some((character) => character.charCodeAt(0) <= 31 || character.charCodeAt(0) === 127);
}

// src/canonicalCheckout/useCedrosPayCheckout.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
function useCedrosPayCheckout(clientOverride) {
  const client = useMemo(() => clientOverride ?? new CedrosPayCheckout(), [clientOverride]);
  const [state, setState] = useState("idle");
  const [outcome, setOutcome] = useState(null);
  const [error, setError] = useState(null);
  const sequence = useRef(0);
  const mounted = useRef(true);
  const active = useRef(null);
  useEffect(() => () => {
    mounted.current = false;
    active.current?.abort("unmount");
  }, []);
  const run = useCallback(async (operation2) => {
    active.current?.abort("superseded");
    const controller = new AbortController();
    active.current = controller;
    const current = ++sequence.current;
    setState("loading");
    setError(null);
    try {
      const result = await operation2(controller.signal);
      if (mounted.current && sequence.current === current) {
        setOutcome(result);
        setState(result.status);
      }
      return result;
    } catch (cause) {
      const nextError = cause instanceof Error ? cause : new Error("Checkout request failed");
      if (mounted.current && sequence.current === current && !controller.signal.aborted) {
        setError(nextError);
        setState("error");
      }
      throw nextError;
    } finally {
      if (active.current === controller) active.current = null;
    }
  }, []);
  const quote2 = useCallback((request) => run((signal) => client.quote(request, { signal })), [client, run]);
  const checkout = useCallback((request) => run((signal) => client.checkout(request, { signal })), [client, run]);
  const status = useCallback((request) => client.status(request), [client]);
  const verifyReturn = useCallback((request) => client.verifyReturn(request), [client]);
  const descriptor2 = useCallback(() => client.descriptor(), [client]);
  const reset = useCallback(() => {
    active.current?.abort("reset");
    sequence.current += 1;
    setState("idle");
    setOutcome(null);
    setError(null);
  }, []);
  return { client, state, outcome, error, descriptor: descriptor2, quote: quote2, checkout, status, verifyReturn, reset };
}

export {
  CHECKOUT_PROTOCOL,
  CHECKOUT_QUOTE_SCOPE,
  CHECKOUT_CREATE_SCOPE,
  validateIdempotencyKey,
  CheckoutRequestError,
  CedrosPayCheckout,
  useCedrosPayCheckout
};
//# sourceMappingURL=chunk-K72WK5OJ.js.map
