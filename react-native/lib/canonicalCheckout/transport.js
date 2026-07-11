"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckoutTransport = exports.CheckoutRequestError = void 0;
const EXTENSION_PATH = '/extensions/cedros-pay';
const DEFAULT_TIMEOUT_MS = 15000;
const MAX_RESPONSE_BYTES = 64 * 1024;
class CheckoutRequestError extends Error {
    constructor(status, code, message) {
        super(message);
        this.status = status;
        this.code = code;
        this.name = 'CheckoutRequestError';
    }
}
exports.CheckoutRequestError = CheckoutRequestError;
class CheckoutTransport {
    constructor(options) {
        this.baseUrl = baseUrl(options.serverUrl ?? '');
        this.fetcher = options.fetch ?? globalThis.fetch.bind(globalThis);
        this.headers = new Headers(options.headers);
        if (this.headers.has('content-type') || this.headers.has('idempotency-key')) {
            throw new TypeError('Content-Type and Idempotency-Key headers are reserved');
        }
        this.timeoutMs = timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    }
    write(path, body, key, options) {
        const headers = new Headers(this.headers);
        headers.set('Content-Type', 'application/json');
        if (key !== undefined)
            headers.set('Idempotency-Key', key);
        return this.request(path, { method: 'POST', headers, body: JSON.stringify(body) }, options);
    }
    read(path, options) {
        return this.request(path, { method: 'GET', headers: new Headers(this.headers) }, options);
    }
    async request(path, init, options) {
        const controller = new AbortController();
        const abort = () => controller.abort(new DOMException('Aborted', 'AbortError'));
        if (options?.signal?.aborted)
            abort();
        else
            options?.signal?.addEventListener('abort', abort, { once: true });
        const timer = setTimeout(() => controller.abort('timeout'), timeout(options?.timeoutMs ?? this.timeoutMs));
        try {
            if (controller.signal.aborted)
                throw controller.signal.reason;
            const response = await this.fetcher(`${this.baseUrl}${path}`, { ...init, signal: controller.signal });
            const value = await readJson(response);
            if (!response.ok)
                throw apiError(response.status, value);
            if (!record(value))
                throw invalidResponse();
            return value;
        }
        catch (cause) {
            if (controller.signal.reason === 'timeout') {
                throw new CheckoutRequestError(408, 'request_timeout', 'Checkout request timed out');
            }
            throw cause;
        }
        finally {
            clearTimeout(timer);
            options?.signal?.removeEventListener('abort', abort);
        }
    }
}
exports.CheckoutTransport = CheckoutTransport;
async function readJson(response) {
    const contentType = response.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase();
    if (!contentType || (contentType !== 'application/json' && !contentType.endsWith('+json'))) {
        throw invalidResponse('Checkout response must be JSON');
    }
    const declared = Number(response.headers.get('content-length'));
    if (Number.isFinite(declared) && declared > MAX_RESPONSE_BYTES)
        throw invalidResponse('Checkout response is too large');
    const body = await response.text();
    if (utf8Bytes(body) > MAX_RESPONSE_BYTES)
        throw invalidResponse('Checkout response is too large');
    try {
        return JSON.parse(body);
    }
    catch {
        throw invalidResponse();
    }
}
function baseUrl(serverUrl) {
    const origin = serverUrl.replace(/\/$/u, '');
    return origin.endsWith(EXTENSION_PATH) ? origin : `${origin}${EXTENSION_PATH}`;
}
function timeout(value) {
    if (!Number.isSafeInteger(value) || value < 1 || value > 120000) {
        throw new TypeError('timeoutMs must be an integer from 1 to 120000');
    }
    return value;
}
function apiError(status, value) {
    const error = record(value) && record(value.error) ? value.error : undefined;
    const code = typeof error?.code === 'string' && /^[a-z0-9][a-z0-9_-]{0,63}$/u.test(error.code)
        ? error.code : 'checkout_request_failed';
    const message = typeof error?.message === 'string' && error.message.length <= 256 && !control(error.message)
        ? error.message : 'Checkout request failed';
    return new CheckoutRequestError(status, code, message);
}
function control(value) {
    return [...value].some((character) => character.charCodeAt(0) <= 0x1f || character.charCodeAt(0) === 0x7f);
}
function utf8Bytes(value) {
    let length = 0;
    for (const character of value) {
        const code = character.codePointAt(0) ?? 0;
        length += code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4;
    }
    return length;
}
function record(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function invalidResponse(message = 'Invalid checkout response') {
    return new CheckoutRequestError(502, 'invalid_response', message);
}
//# sourceMappingURL=transport.js.map