"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkoutOutcome = checkoutOutcome;
exports.quoteResponse = quoteResponse;
exports.providerOutcome = providerOutcome;
exports.returnOutcome = returnOutcome;
const OPERATION_ID = /^payop_[0-9a-f]{64}$/u;
const HEX_64 = /^[0-9a-f]{64}$/u;
function checkoutOutcome(value) {
    if (!isCheckoutOutcome(value))
        throw invalidResponse();
    return value;
}
function quoteResponse(value) {
    if (!isQuoteResponse(value))
        throw invalidResponse();
    return value;
}
function providerOutcome(value) {
    if (!isProviderOutcome(value))
        throw invalidResponse();
    return value;
}
function returnOutcome(value) {
    if (!operationBase(value) || !settlement(value.settlementStatus)
        || !['verified', 'mismatch', 'indeterminate'].includes(String(value.status))
        || !exact(value, ['status', 'operationId', 'attemptId', 'paymentMethod', 'settlementStatus'])) {
        throw invalidResponse();
    }
    return value;
}
function isQuoteResponse(value) {
    return record(value) && exact(value, ['schemaVersion', 'operationId', 'attemptId', 'quote', 'replayed'])
        && value.schemaVersion === 1 && operationId(value.operationId) && text(value.attemptId, 256)
        && typeof value.replayed === 'boolean' && quote(value.quote);
}
function isCheckoutOutcome(value) {
    if (!operationBase(value) || typeof value.replayed !== 'boolean')
        return false;
    const common = ['status', 'operationId', 'attemptId', 'paymentMethod', 'replayed'];
    if (value.status === 'action_required') {
        return exact(value, [...common, 'returnArtifact']) && returnArtifact(value.returnArtifact);
    }
    if (value.status === 'processing' || value.status === 'paid')
        return exact(value, common);
    return (value.status === 'terminal' || value.status === 'indeterminate')
        && exact(value, [...common, 'code']) && code(value.code);
}
function isProviderOutcome(value) {
    if (!operationBase(value))
        return false;
    const common = ['status', 'operationId', 'attemptId', 'paymentMethod'];
    if (value.status === 'resolved')
        return exact(value, [...common, 'checkoutUrl']) && providerUrl(value.checkoutUrl);
    return (value.status === 'mismatch' || value.status === 'indeterminate') && exact(value, common);
}
function quote(value) {
    if (!record(value) || !exact(value, ['schemaVersion', 'source', 'lines', 'currency', 'subtotalCents',
        'discountCents', 'shippingCents', 'taxCents', 'tipCents', 'totalCents', 'promotionCode',
        'shippingRateId', 'taxRateId', 'appliedTip', 'inventoryHold', 'requestedPaymentMethods',
        'expiresAt'], true) || value.schemaVersion !== 1 || !source(value.source)
        || !Array.isArray(value.lines) || value.lines.length < 1 || value.lines.length > 100
        || !currency(value.currency) || !nonnegative(value.subtotalCents) || !nonnegative(value.discountCents)
        || !nonnegative(value.shippingCents) || !nonnegative(value.taxCents) || !nonnegative(value.tipCents)
        || !positive(value.totalCents) || (value.promotionCode !== undefined && !text(value.promotionCode, 256))
        || (value.shippingRateId !== undefined && !text(value.shippingRateId, 256))
        || (value.taxRateId !== undefined && !text(value.taxRateId, 256))
        || (value.appliedTip !== undefined && !appliedTip(value.appliedTip))
        || (value.inventoryHold !== undefined && !inventoryHold(value.inventoryHold))
        || !methods(value.requestedPaymentMethods) || !dateTime(value.expiresAt))
        return false;
    return value.lines.every(line);
}
function source(value) {
    if (!record(value))
        return false;
    if (value.kind === 'items')
        return exact(value, ['kind', 'intentSha256']) && hex(value.intentSha256);
    return value.kind === 'versioned_cart' && exact(value, ['kind', 'lane', 'generation', 'version'])
        && text(value.lane, 128) && text(value.generation, 256) && nonnegative(value.version);
}
function line(value) {
    if (!record(value) || !exact(value, ['resource', 'variantId', 'qty', 'unitAmountCents',
        'lineTotalCents', 'currency', 'title', 'image', 'paymentResource', 'shippingProfileId'], true))
        return false;
    return text(value.resource, 128) && (value.variantId === undefined || text(value.variantId, 128))
        && positive(value.qty) && nonnegative(value.unitAmountCents) && nonnegative(value.lineTotalCents)
        && currency(value.currency) && text(value.title, 512)
        && (value.image === undefined || text(value.image, 2048)) && text(value.paymentResource, 128)
        && (value.shippingProfileId === undefined || text(value.shippingProfileId, 256));
}
function appliedTip(value) {
    if (!record(value))
        return false;
    if (value.kind === 'fixed')
        return exact(value, ['kind', 'amountCents']) && positive(value.amountCents);
    return value.kind === 'percentage' && exact(value, ['kind', 'basisPoints', 'amountCents'])
        && positive(value.basisPoints) && Number(value.basisPoints) <= 10000 && positive(value.amountCents);
}
function inventoryHold(value) {
    return record(value) && exact(value, ['holdId', 'expiresAt'])
        && text(value.holdId, 256) && dateTime(value.expiresAt);
}
function operationBase(value) {
    return record(value) && operationId(value.operationId) && text(value.attemptId, 256)
        && paymentMethod(value.paymentMethod);
}
function operationId(value) { return typeof value === 'string' && OPERATION_ID.test(value); }
function returnArtifact(value) {
    return typeof value === 'string' && value.length <= 255 && /^cs_[A-Za-z0-9_-]+$/u.test(value);
}
function providerUrl(value) {
    if (typeof value !== 'string' || value.length > 2048)
        return false;
    try {
        const url = new URL(value);
        return url.protocol === 'https:' && url.hostname === 'checkout.stripe.com' && !url.username && !url.password;
    }
    catch {
        return false;
    }
}
function methods(value) {
    return Array.isArray(value) && value.length >= 1 && value.length <= 3
        && new Set(value).size === value.length && value.every(paymentMethod);
}
function paymentMethod(value) { return value === 'stripe' || value === 'x402' || value === 'credits'; }
function settlement(value) { return value === 'paid' || value === 'unpaid' || value === 'pending'; }
function code(value) { return typeof value === 'string' && /^[a-z0-9][a-z0-9_-]{0,63}$/u.test(value); }
function currency(value) { return typeof value === 'string' && /^[A-Za-z]{3}$/u.test(value); }
function hex(value) { return typeof value === 'string' && HEX_64.test(value); }
function text(value, max) {
    return typeof value === 'string' && Boolean(value.trim()) && value.length <= max && !control(value);
}
function positive(value) { return Number.isSafeInteger(value) && Number(value) > 0; }
function nonnegative(value) { return Number.isSafeInteger(value) && Number(value) >= 0; }
function dateTime(value) { return typeof value === 'string' && !Number.isNaN(Date.parse(value)); }
function exact(value, allowed, optional = false) {
    const keys = Object.keys(value);
    return keys.every((key) => allowed.includes(key)) && (optional || keys.length === allowed.length);
}
function record(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function control(value) {
    return [...value].some((character) => character.charCodeAt(0) <= 0x1f || character.charCodeAt(0) === 0x7f);
}
function invalidResponse() { return new Error('Invalid checkout response'); }
//# sourceMappingURL=responseValidation.js.map