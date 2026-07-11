"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePublicQuote = validatePublicQuote;
exports.validatePublicCreate = validatePublicCreate;
exports.validatePublicStatus = validatePublicStatus;
exports.validatePublicReturn = validatePublicReturn;
const inputValidation_1 = require("./inputValidation");
const OPERATION_ID = /^payop_[0-9a-f]{64}$/u;
function validatePublicQuote(request) {
    exact(request, ['idempotencyKey', 'attemptId', 'cartGeneration', 'lines', 'couponCode',
        'customerEmail', 'successUrl', 'cancelUrl', 'metadata']);
    identity(request.idempotencyKey, request.attemptId);
    if (request.cartGeneration !== undefined)
        integer(request.cartGeneration, 0, 'cartGeneration');
    if (!Array.isArray(request.lines) || request.lines.length < 1 || request.lines.length > 100) {
        throw new TypeError('lines must contain 1 to 100 entries');
    }
    request.lines.forEach((line) => {
        exact(line, ['productId', 'quantity', 'variantId']);
        opaque(line.productId, 128, 'productId');
        integer(line.quantity, 1, 'quantity', 999);
        optionalText(line.variantId, 128, 'variantId');
    });
    optionalText(request.couponCode, 256, 'couponCode');
    optionalEmail(request.customerEmail);
    url(request.successUrl, 'successUrl');
    url(request.cancelUrl, 'cancelUrl');
    metadata(request.metadata);
}
function validatePublicCreate(request) {
    exact(request, ['idempotencyKey', 'attemptId', 'quoteOperationId', 'amountCents', 'currency',
        'productName', 'successUrl', 'cancelUrl', 'customerEmail', 'clientReferenceId', 'metadata']);
    identity(request.idempotencyKey, request.attemptId);
    operation(request.quoteOperationId);
    integer(request.amountCents, 0, 'amountCents');
    if (!/^[A-Za-z]{3}$/u.test(request.currency))
        throw new TypeError('currency is invalid');
    opaque(request.productName, 512, 'productName');
    url(request.successUrl, 'successUrl');
    url(request.cancelUrl, 'cancelUrl');
    optionalEmail(request.customerEmail);
    optionalText(request.clientReferenceId, 256, 'clientReferenceId');
    metadata(request.metadata);
}
function validatePublicStatus(request) {
    exact(request, ['operationId', 'resolveProviderUrl']);
    operation(request.operationId);
    if (request.resolveProviderUrl !== undefined && typeof request.resolveProviderUrl !== 'boolean') {
        throw new TypeError('resolveProviderUrl is invalid');
    }
}
function validatePublicReturn(request) {
    exact(request, ['expectedAttemptId', 'returnArtifact']);
    opaque(request.expectedAttemptId, 256, 'expectedAttemptId');
    opaque(request.returnArtifact, 2048, 'returnArtifact');
}
function identity(key, attemptId) { (0, inputValidation_1.validateIdempotencyKey)(key); opaque(attemptId, 256, 'attemptId'); }
function operation(value) {
    if (typeof value !== 'string' || !OPERATION_ID.test(value))
        throw new TypeError('operationId is invalid');
}
function metadata(value) {
    if (value === undefined)
        return;
    if (!record(value) || Object.keys(value).length > 32)
        throw new TypeError('metadata is invalid');
    Object.entries(value).forEach(([key, item]) => { opaque(key, 64, 'metadata key'); opaque(item, 256, 'metadata value'); });
}
function optionalEmail(value) {
    if (value !== undefined && (value.length > 254 || hasControl(value)
        || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value)))
        throw new TypeError('customerEmail is invalid');
}
function url(value, label) {
    if (typeof value !== 'string' || value.length > 2048)
        throw new TypeError(`${label} is invalid`);
    try {
        const parsed = new URL(value);
        if (parsed.protocol !== 'https:' || parsed.username || parsed.password)
            throw new Error();
    }
    catch {
        throw new TypeError(`${label} must be an absolute HTTPS URL without user information`);
    }
}
function integer(value, min, label, max = Number.MAX_SAFE_INTEGER) {
    if (!Number.isSafeInteger(value) || value < min || value > max)
        throw new TypeError(`${label} is invalid`);
}
function optionalText(value, max, label) {
    if (value !== undefined)
        opaque(value, max, label);
}
function opaque(value, max, label) {
    if (typeof value !== 'string' || !value.trim() || value.length > max || hasControl(value))
        throw new TypeError(`${label} is invalid`);
}
function exact(value, allowed) {
    if (!record(value) || Object.keys(value).some((key) => !allowed.includes(key)))
        throw new TypeError('request contains an unknown field');
}
function hasControl(value) {
    return [...value].some((character) => character.charCodeAt(0) <= 0x1f || character.charCodeAt(0) === 0x7f);
}
function record(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
//# sourceMappingURL=publicValidation.js.map