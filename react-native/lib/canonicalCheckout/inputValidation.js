"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateProviderRequest = exports.validateReturnRequest = void 0;
exports.validateQuoteRequest = validateQuoteRequest;
exports.validateCreateRequest = validateCreateRequest;
exports.validateStatusRequest = validateStatusRequest;
exports.validateOperationRequest = validateOperationRequest;
exports.validateIdempotencyKey = validateIdempotencyKey;
const IDENTIFIER = /^[A-Za-z0-9_.:-]+$/u;
const OPERATION_ID = /^payop_[0-9a-f]{64}$/u;
const RETURN_ARTIFACT = /^cs_[A-Za-z0-9_-]+$/u;
const PAYMENT_METHODS = new Set(['stripe', 'x402', 'credits']);
function validateQuoteRequest(request) {
    exact(request, ['schemaVersion', 'idempotencyKey', 'attemptId', 'clientMaterialSha256', 'source', 'promotionCode',
        'customerContext', 'tip', 'requestedPaymentMethods']);
    schema(request.schemaVersion);
    identity(request.idempotencyKey, request.attemptId);
    sha256(request.clientMaterialSha256);
    source(request.source);
    optionalText(request.promotionCode, 256, 'promotionCode');
    customer(request.customerContext);
    if (request.tip !== undefined)
        tip(request.tip);
    methods(request.requestedPaymentMethods);
}
function validateCreateRequest(request) {
    exact(request, ['schemaVersion', 'idempotencyKey', 'attemptId', 'clientMaterialSha256', 'quoteOperationId',
        'paymentMethod', 'customerContext', 'railProof']);
    schema(request.schemaVersion);
    identity(request.idempotencyKey, request.attemptId);
    sha256(request.clientMaterialSha256);
    operationId(request.quoteOperationId, 'quoteOperationId');
    if (!PAYMENT_METHODS.has(request.paymentMethod))
        throw new TypeError('paymentMethod is invalid');
    customer(request.customerContext);
    if (request.railProof !== undefined)
        railProof(request.railProof);
    if ((request.paymentMethod === 'x402' && request.railProof?.kind !== 'x402')
        || (request.railProof !== undefined && request.railProof.kind !== request.paymentMethod)) {
        throw new TypeError('railProof does not match paymentMethod');
    }
}
function validateStatusRequest(request) {
    exact(request, ['operationId']);
    operationId(request.operationId, 'operationId');
}
function validateOperationRequest(request) {
    exact(request, ['schemaVersion', 'operationId', 'expectedAttemptId', 'returnArtifact']);
    schema(request.schemaVersion);
    operationId(request.operationId, 'operationId');
    attempt(request.expectedAttemptId);
    if (typeof request.returnArtifact !== 'string' || request.returnArtifact.length > 255
        || !RETURN_ARTIFACT.test(request.returnArtifact))
        throw new TypeError('returnArtifact is invalid');
}
exports.validateReturnRequest = validateOperationRequest;
exports.validateProviderRequest = validateOperationRequest;
function validateIdempotencyKey(value) {
    if (typeof value !== 'string' || value.length < 1 || value.length > 67
        || ![...value].every((character) => character.charCodeAt(0) >= 0x21
            && character.charCodeAt(0) <= 0x7e)) {
        throw new TypeError('idempotencyKey must be 1 to 67 visible ASCII characters');
    }
}
function source(value) {
    if (!record(value))
        throw new TypeError('source is invalid');
    if (value.kind === 'items') {
        exact(value, ['kind', 'items']);
        items(value.items);
    }
    else if (value.kind === 'versioned_cart') {
        exact(value, ['kind', 'lane', 'generation', 'version']);
        identifier(value.lane, 'lane');
        text(value.generation, 256, 'generation');
        integer(value.version, 0, 100000, 'version');
    }
    else
        throw new TypeError('source kind is invalid');
}
function items(value) {
    if (!Array.isArray(value) || value.length < 1 || value.length > 100) {
        throw new TypeError('items must contain 1 to 100 entries');
    }
    for (const item of value) {
        exact(item, ['resource', 'variantId', 'qty']);
        identifier(item.resource, 'resource');
        if (item.variantId !== undefined)
            identifier(item.variantId, 'variantId');
        integer(item.qty, 1, 999, 'qty');
    }
}
function customer(value) {
    if (!record(value))
        throw new TypeError('customerContext is invalid');
    exact(value, ['fulfillment', 'contact', 'returnUrls']);
    const fulfillment = value.fulfillment;
    if (!record(fulfillment))
        throw new TypeError('fulfillment is invalid');
    if (fulfillment.kind === 'digital')
        exact(fulfillment, ['kind']);
    else if (fulfillment.kind === 'shipping') {
        exact(fulfillment, ['kind', 'address', 'shipping']);
        address(fulfillment.address);
        exact(fulfillment.shipping, ['optionId']);
        text(fulfillment.shipping.optionId, 128, 'shipping.optionId');
    }
    else
        throw new TypeError('fulfillment kind is invalid');
    if (value.contact !== undefined)
        contact(value.contact);
    if (!record(value.returnUrls))
        throw new TypeError('returnUrls is invalid');
    exact(value.returnUrls, ['success', 'cancel']);
    redirect(value.returnUrls.success, 'returnUrls.success');
    redirect(value.returnUrls.cancel, 'returnUrls.cancel');
}
function address(value) {
    if (!record(value))
        throw new TypeError('address is invalid');
    exact(value, ['line1', 'line2', 'city', 'region', 'postalCode', 'country']);
    text(value.line1, 200, 'address.line1');
    optionalText(value.line2, 200, 'address.line2');
    text(value.city, 100, 'address.city');
    optionalText(value.region, 100, 'address.region');
    text(value.postalCode, 32, 'address.postalCode');
    if (typeof value.country !== 'string' || !/^[A-Za-z]{2}$/u.test(value.country)) {
        throw new TypeError('address.country is invalid');
    }
}
function contact(value) {
    exact(value, ['email', 'phone', 'displayName']);
    if (value.email !== undefined && (value.email.length > 254 || control(value.email)
        || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value.email)))
        throw new TypeError('contact.email is invalid');
    optionalText(value.phone, 64, 'contact.phone');
    optionalText(value.displayName, 200, 'contact.displayName');
}
function railProof(value) {
    if (!record(value))
        throw new TypeError('railProof is invalid');
    if (value.kind === 'x402') {
        exact(value, ['kind', 'transaction']);
        text(value.transaction, 4096, 'railProof.transaction');
    }
    else if (value.kind === 'stripe' || value.kind === 'credits')
        exact(value, ['kind']);
    else
        throw new TypeError('railProof kind is invalid');
}
function tip(value) {
    if (!record(value))
        throw new TypeError('tip is invalid');
    if (value.kind === 'fixed') {
        exact(value, ['kind', 'amountCents']);
        integer(value.amountCents, 1, 1000000, 'tip.amountCents');
    }
    else if (value.kind === 'percentage') {
        exact(value, ['kind', 'basisPoints']);
        integer(value.basisPoints, 1, 10000, 'tip.basisPoints');
    }
    else
        throw new TypeError('tip.kind is invalid');
}
function methods(value) {
    if (!Array.isArray(value) || value.length < 1 || value.length > 3
        || new Set(value).size !== value.length || value.some((method) => !PAYMENT_METHODS.has(method))) {
        throw new TypeError('requestedPaymentMethods is invalid');
    }
}
function identity(key, attemptId) { validateIdempotencyKey(key); attempt(attemptId); }
function schema(value) { if (value !== 1)
    throw new TypeError('schemaVersion must be 1'); }
function sha256(value) {
    if (typeof value !== 'string' || !/^[0-9a-f]{64}$/u.test(value)) {
        throw new TypeError('clientMaterialSha256 must be 64 lowercase hex characters');
    }
}
function attempt(value) {
    if (typeof value !== 'string' || !value.trim() || bytes(value) > 256 || control(value)) {
        throw new TypeError('attemptId must be a nonblank opaque value no longer than 256 bytes');
    }
}
function operationId(value, label) {
    if (typeof value !== 'string' || !OPERATION_ID.test(value))
        throw new TypeError(`${label} is invalid`);
}
function identifier(value, label) {
    if (typeof value !== 'string' || value.length > 128 || !IDENTIFIER.test(value)) {
        throw new TypeError(`${label} is invalid`);
    }
}
function text(value, max, label) {
    if (typeof value !== 'string' || !value.trim() || value.length > max || control(value)) {
        throw new TypeError(`${label} is invalid`);
    }
}
function optionalText(value, max, label) {
    if (value !== undefined)
        text(value, max, label);
}
function integer(value, min, max, label) {
    if (!Number.isSafeInteger(value) || value < min || value > max)
        throw new TypeError(`${label} is invalid`);
}
function redirect(value, label) {
    if (typeof value !== 'string' || value.length > 2048)
        throw new TypeError(`${label} is invalid`);
    try {
        const url = new URL(value);
        if (url.protocol !== 'https:' || url.username || url.password)
            throw new Error();
    }
    catch {
        throw new TypeError(`${label} must be an absolute HTTPS URL without user information`);
    }
}
function exact(value, allowed) {
    if (Object.keys(value).some((key) => !allowed.includes(key)))
        throw new TypeError('request contains an unknown field');
}
function bytes(value) {
    let length = 0;
    for (const character of value) {
        const code = character.codePointAt(0) ?? 0;
        length += code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4;
    }
    return length;
}
function control(value) {
    return [...value].some((character) => character.charCodeAt(0) <= 0x1f || character.charCodeAt(0) === 0x7f);
}
function record(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
//# sourceMappingURL=inputValidation.js.map