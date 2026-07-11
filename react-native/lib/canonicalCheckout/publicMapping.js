"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.quoteWireRequest = quoteWireRequest;
exports.createWireRequest = createWireRequest;
exports.quoteOutcome = quoteOutcome;
exports.checkoutOutcome = checkoutOutcome;
exports.providerOutcome = providerOutcome;
exports.operationRequest = operationRequest;
exports.verifyOutcome = verifyOutcome;
exports.indeterminate = indeterminate;
const contract_1 = require("./contract");
const publicMaterial_1 = require("./publicMaterial");
function quoteWireRequest(request) {
    return { schemaVersion: 1, idempotencyKey: request.idempotencyKey, attemptId: request.attemptId,
        clientMaterialSha256: (0, publicMaterial_1.publicMaterialDigest)(contract_1.CHECKOUT_QUOTE_SCOPE, request),
        source: { kind: 'items', items: request.lines.map((line) => ({ resource: line.productId,
                variantId: line.variantId, qty: line.quantity })) }, promotionCode: request.couponCode,
        customerContext: customerContext(request.successUrl, request.cancelUrl, request.customerEmail),
        requestedPaymentMethods: ['stripe'] };
}
function createWireRequest(request) {
    return { schemaVersion: 1, idempotencyKey: request.idempotencyKey, attemptId: request.attemptId,
        clientMaterialSha256: (0, publicMaterial_1.publicMaterialDigest)(contract_1.CHECKOUT_CREATE_SCOPE, request),
        quoteOperationId: request.quoteOperationId, paymentMethod: 'stripe',
        customerContext: customerContext(request.successUrl, request.cancelUrl, request.customerEmail),
        railProof: { kind: 'stripe' } };
}
function quoteOutcome(response) {
    return { status: 'resolved', operationId: response.operationId, attemptId: response.attemptId,
        replayed: response.replayed, quote: {
            cartGeneration: response.quote.source.kind === 'versioned_cart' ? response.quote.source.version : 0,
            currency: response.quote.currency, lines: response.quote.lines.map((line) => ({
                productId: line.resource, quantity: line.qty, unitAmountCents: line.unitAmountCents
            })),
            discountCents: response.quote.discountCents, taxCents: response.quote.taxCents,
            shippingCents: response.quote.shippingCents, totalCents: response.quote.totalCents
        } };
}
function checkoutOutcome(response) {
    if (response.status === 'terminal')
        return { status: 'terminal', durable: true, code: response.code, replayed: response.replayed };
    if (response.status === 'indeterminate')
        return indeterminate(response.code);
    return { status: 'resolved', operationId: response.operationId, attemptId: response.attemptId,
        ...(response.status === 'action_required' ? { returnArtifact: response.returnArtifact } : {}), replayed: response.replayed };
}
function providerOutcome(response) {
    if (response.status === 'resolved')
        return { status: 'resolved', checkoutUrl: response.checkoutUrl };
    return { status: response.status };
}
function operationRequest(response) {
    if (response.status !== 'action_required')
        return undefined;
    return { schemaVersion: 1, operationId: response.operationId, expectedAttemptId: response.attemptId,
        returnArtifact: response.returnArtifact };
}
function verifyOutcome(value) {
    if (!record(value) || !exact(value, ['status', 'checkoutAttemptId']))
        throw invalidResponse();
    if (value.status === 'verified' && opaque(value.checkoutAttemptId, 256))
        return value;
    if ((value.status === 'mismatch' || value.status === 'indeterminate') && exact(value, ['status'])) {
        return value;
    }
    throw invalidResponse();
}
function indeterminate(code = 'transport-outcome-unknown') {
    return { status: 'indeterminate', code };
}
function customerContext(success, cancel, email) {
    return { fulfillment: { kind: 'digital' }, ...(email === undefined ? {} : { contact: { email } }),
        returnUrls: { success, cancel } };
}
function record(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function exact(value, allowed) {
    return Object.keys(value).every((key) => allowed.includes(key)) && Object.keys(value).length === allowed.length;
}
function opaque(value, max) {
    return typeof value === 'string' && Boolean(value.trim()) && value.length <= max && !hasControl(value);
}
function hasControl(value) {
    return [...value].some((character) => character.charCodeAt(0) <= 0x1f || character.charCodeAt(0) === 0x7f);
}
function invalidResponse() { return new Error('Invalid checkout response'); }
//# sourceMappingURL=publicMapping.js.map