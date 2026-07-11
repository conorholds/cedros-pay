"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateIdempotencyKey = exports.CheckoutRequestError = exports.CedrosPayCheckout = void 0;
const contract_1 = require("./contract");
const inputValidation_1 = require("./inputValidation");
const responseValidation_1 = require("./responseValidation");
const publicMapping_1 = require("./publicMapping");
const publicMaterial_1 = require("./publicMaterial");
const publicValidation_1 = require("./publicValidation");
const transport_1 = require("./transport");
class CedrosPayCheckout {
    constructor(options = {}) {
        this.inFlight = new Map();
        this.transport = new transport_1.CheckoutTransport(options);
    }
    async descriptor(options) {
        return descriptor(await this.transport.read('/checkout/descriptor', options));
    }
    quote(request, options) {
        (0, publicValidation_1.validatePublicQuote)(request);
        const wire = (0, publicMapping_1.quoteWireRequest)(request);
        (0, inputValidation_1.validateQuoteRequest)(wire);
        return this.deduplicate(contract_1.CHECKOUT_QUOTE_SCOPE, request.idempotencyKey, request, options?.signal, async () => {
            try {
                const response = (0, responseValidation_1.quoteResponse)(await this.transport.write('/checkout/quote', wire, request.idempotencyKey, options));
                if (response.attemptId !== request.attemptId)
                    throw correlationError('quote attempt');
                return (0, publicMapping_1.quoteOutcome)(response);
            }
            catch (cause) {
                const terminal = idempotencyTerminal(cause);
                if (terminal)
                    return terminal;
                if (uncertain(cause))
                    return (0, publicMapping_1.indeterminate)();
                throw cause;
            }
        });
    }
    checkout(request, options) {
        (0, publicValidation_1.validatePublicCreate)(request);
        const wire = (0, publicMapping_1.createWireRequest)(request);
        (0, inputValidation_1.validateCreateRequest)(wire);
        return this.deduplicate(contract_1.CHECKOUT_CREATE_SCOPE, request.idempotencyKey, request, options?.signal, async () => {
            try {
                const response = (0, responseValidation_1.checkoutOutcome)(await this.transport.write('/checkout', wire, request.idempotencyKey, options));
                if (response.attemptId !== request.attemptId)
                    throw correlationError('checkout attempt');
                return (0, publicMapping_1.checkoutOutcome)(response);
            }
            catch (cause) {
                const terminal = idempotencyTerminal(cause);
                if (terminal)
                    return terminal;
                if (uncertain(cause))
                    return (0, publicMapping_1.indeterminate)();
                throw cause;
            }
        });
    }
    async status(request, options) {
        (0, publicValidation_1.validatePublicStatus)(request);
        try {
            const raw = (0, responseValidation_1.checkoutOutcome)(await this.transport.read(`/checkout/${encodeURIComponent(request.operationId)}`, options));
            if (raw.operationId !== request.operationId)
                throw correlationError('checkout operation');
            const outcome = (0, publicMapping_1.checkoutOutcome)(raw);
            if (!request.resolveProviderUrl)
                return { outcome };
            const operation = (0, publicMapping_1.operationRequest)(raw);
            if (!operation)
                return { outcome, providerUrl: { status: 'indeterminate' } };
            (0, inputValidation_1.validateProviderRequest)(operation);
            const resolved = (0, responseValidation_1.providerOutcome)(await this.transport.write('/checkout/resolve', operation, undefined, options));
            if (resolved.operationId !== raw.operationId || resolved.attemptId !== raw.attemptId)
                throw correlationError('provider action');
            return { outcome, providerUrl: (0, publicMapping_1.providerOutcome)(resolved) };
        }
        catch (cause) {
            if (uncertain(cause))
                return { outcome: (0, publicMapping_1.indeterminate)() };
            throw cause;
        }
    }
    async verifyReturn(request, options) {
        (0, publicValidation_1.validatePublicReturn)(request);
        try {
            const wire = { schemaVersion: 1, ...request };
            const outcome = (0, publicMapping_1.verifyOutcome)(await this.transport.write('/checkout/return/verify', wire, undefined, options));
            if (outcome.status === 'verified' && outcome.checkoutAttemptId !== request.expectedAttemptId)
                return { status: 'mismatch' };
            return outcome;
        }
        catch (cause) {
            if (uncertain(cause))
                return { status: 'indeterminate' };
            throw cause;
        }
    }
    deduplicate(scope, key, material, signal, create) {
        const identity = `${scope}\0${key}\0${(0, publicMaterial_1.publicMaterialDigest)(scope, material)}`;
        const existing = this.inFlight.get(identity);
        if (existing)
            return existing;
        const promise = create().finally(() => { if (this.inFlight.get(identity) === promise)
            this.inFlight.delete(identity); });
        this.inFlight.set(identity, promise);
        signal?.addEventListener('abort', () => { if (this.inFlight.get(identity) === promise)
            this.inFlight.delete(identity); }, { once: true });
        return promise;
    }
}
exports.CedrosPayCheckout = CedrosPayCheckout;
function descriptor(value) {
    if (!record(value) || !exact(value, ['protocol', 'providerScope', 'replayTtlMs',
        'acceptsExternalIdempotencyKey', 'maxIdempotencyKeyLength', 'idempotencyKeyCharacterSet', 'operationScopes'])
        || value.protocol !== 'cedros-pay-checkout' || !opaque(value.providerScope, 512)
        || value.replayTtlMs !== 259200000
        || value.acceptsExternalIdempotencyKey !== true || value.maxIdempotencyKeyLength !== 67
        || value.idempotencyKeyCharacterSet !== 'ascii-visible' || !record(value.operationScopes)
        || !exact(value.operationScopes, ['quote', 'checkout'])
        || value.operationScopes.quote !== contract_1.CHECKOUT_QUOTE_SCOPE
        || value.operationScopes.checkout !== contract_1.CHECKOUT_CREATE_SCOPE)
        throw new Error('Invalid checkout descriptor');
    return value;
}
function uncertain(cause) {
    return !(cause instanceof transport_1.CheckoutRequestError) || cause.status === 408 || cause.status >= 500;
}
function idempotencyTerminal(cause) {
    return cause instanceof transport_1.CheckoutRequestError && cause.status === 409
        && cause.code === 'idempotency_mismatch'
        ? { status: 'terminal', durable: true, code: cause.code, replayed: true }
        : undefined;
}
function correlationError(label) {
    return new transport_1.CheckoutRequestError(502, 'correlation_mismatch', `${label} correlation mismatch`);
}
function record(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function exact(value, allowed) {
    return Object.keys(value).every((key) => allowed.includes(key)) && Object.keys(value).length === allowed.length;
}
function opaque(value, max) {
    return typeof value === 'string' && value === value.trim() && Boolean(value)
        && value.length <= max && !hasControl(value);
}
function hasControl(value) {
    return [...value].some((character) => character.charCodeAt(0) <= 0x1f || character.charCodeAt(0) === 0x7f);
}
var transport_2 = require("./transport");
Object.defineProperty(exports, "CheckoutRequestError", { enumerable: true, get: function () { return transport_2.CheckoutRequestError; } });
var inputValidation_2 = require("./inputValidation");
Object.defineProperty(exports, "validateIdempotencyKey", { enumerable: true, get: function () { return inputValidation_2.validateIdempotencyKey; } });
//# sourceMappingURL=client.js.map