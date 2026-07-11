"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.X402Manager = void 0;
const js_base64_1 = require("js-base64");
const uuid_1 = require("../utils/uuid");
const logger_1 = require("../utils/logger");
const errorHandling_1 = require("../utils/errorHandling");
const fetchWithTimeout_1 = require("../utils/fetchWithTimeout");
const rateLimiter_1 = require("../utils/rateLimiter");
const circuitBreaker_1 = require("../utils/circuitBreaker");
const resilience_1 = require("./resilience");
const exponentialBackoff_1 = require("../utils/exponentialBackoff");
/**
 * Internal implementation of x402 payment protocol.
 *
 * @internal
 * **DO NOT USE THIS CLASS DIRECTLY**
 *
 * This concrete class is not part of the stable API and may change without notice.
 *
 * **Correct Usage:**
 * ```typescript
 * import { useCedrosContext } from '@cedros/pay-react';
 *
 * function MyComponent() {
 *   const { x402Manager } = useCedrosContext();
 *   await x402Manager.requestQuote({ resource: 'item-1' });
 * }
 * ```
 *
 * @see {@link IX402Manager} for the stable interface
 * @see API_STABILITY.md for our API stability policy
 */
class X402Manager {
    constructor(routeDiscovery) {
        this.quoteRateLimiter = (0, rateLimiter_1.createRateLimiter)(rateLimiter_1.RATE_LIMITER_PRESETS.QUOTE);
        this.verifyRateLimiter = (0, rateLimiter_1.createRateLimiter)(rateLimiter_1.RATE_LIMITER_PRESETS.PAYMENT);
        this.circuitBreaker = (0, circuitBreaker_1.createCircuitBreaker)({
            failureThreshold: 5,
            timeout: 10000, // 10 seconds for faster recovery in payment flows
            name: 'x402-manager',
        });
        this.routeDiscovery = routeDiscovery;
    }
    /**
     * Request a protected resource and get x402 requirement
     * SECURITY: Resource ID and coupon codes sent in request body to prevent leakage
     * Prevents exposure of product IDs, SKUs, and business-sensitive identifiers in logs
     */
    async requestQuote(options) {
        const { resource, couponCode } = options;
        // Rate limiting check
        if (!this.quoteRateLimiter.tryConsume()) {
            throw new Error((0, resilience_1.rateLimitExceededMessage)('quote requests'));
        }
        // Circuit breaker + retry logic
        try {
            return await this.circuitBreaker.execute(async () => {
                return await (0, exponentialBackoff_1.retryWithBackoff)(async () => {
                    const urlPath = `/paywall/v1/quote`;
                    (0, logger_1.getLogger)().debug("[X402Manager] Requesting quote", couponCode ? "with coupon" : "without coupon");
                    const url = await this.routeDiscovery.buildUrl(urlPath);
                    // SECURITY: Use generic endpoint with resource in body
                    // Prevents resource IDs from leaking in URL logs, Referer headers, and browser history
                    const response = await (0, fetchWithTimeout_1.fetchWithTimeout)(url, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            resource,
                            couponCode: couponCode || null,
                        }),
                    });
                    if (response.status !== 402) {
                        throw new Error(`Expected 402 status, got ${response.status}`);
                    }
                    const data = await response.json();
                    const requirement = data.accepts?.[0];
                    if (!requirement) {
                        throw new Error("Invalid x402 response: missing accepts field");
                    }
                    return requirement;
                }, { ...exponentialBackoff_1.RETRY_PRESETS.QUICK, name: 'x402-quote' });
            });
        }
        catch (error) {
            if (error instanceof circuitBreaker_1.CircuitBreakerOpenError) {
                (0, logger_1.getLogger)().error('[X402Manager] Circuit breaker is OPEN - x402 service unavailable');
                throw new Error((0, resilience_1.serviceUnavailableMessage)('Payment service'));
            }
            throw error;
        }
    }
    /**
     * Request a cart quote for multiple items
     */
    async requestCartQuote(options) {
        const { items, metadata, couponCode } = options;
        // Rate limiting check
        if (!this.quoteRateLimiter.tryConsume()) {
            throw new Error((0, resilience_1.rateLimitExceededMessage)('cart quote requests'));
        }
        // Circuit breaker + retry logic
        try {
            return await this.circuitBreaker.execute(async () => {
                return await (0, exponentialBackoff_1.retryWithBackoff)(async () => {
                    const url = await this.routeDiscovery.buildUrl("/paywall/v1/cart/quote");
                    const cartRequest = {
                        items,
                        metadata,
                        coupon: couponCode,
                    };
                    const response = await (0, fetchWithTimeout_1.fetchWithTimeout)(url, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Idempotency-Key": (0, uuid_1.generateUUID)(),
                        },
                        body: JSON.stringify(cartRequest),
                    });
                    // 402 is the SUCCESS response for x402 protocol (contains payment quote)
                    if (response.status !== 402 && !response.ok) {
                        const errorMessage = await (0, errorHandling_1.parseErrorResponse)(response, "Failed to get cart quote");
                        throw new Error(errorMessage);
                    }
                    return await response.json();
                }, { ...exponentialBackoff_1.RETRY_PRESETS.QUICK, name: 'x402-cart-quote' });
            });
        }
        catch (error) {
            if (error instanceof circuitBreaker_1.CircuitBreakerOpenError) {
                (0, logger_1.getLogger)().error('[X402Manager] Circuit breaker is OPEN - cart quote service unavailable');
                throw new Error((0, resilience_1.serviceUnavailableMessage)('Payment service'));
            }
            throw error;
        }
    }
    /**
     * Build X-PAYMENT header from payment payload (base64 encoded)
     */
    buildPaymentHeader(payload) {
        const jsonString = JSON.stringify(payload);
        return js_base64_1.Base64.encode(jsonString);
    }
    /**
     * Parse X-PAYMENT-RESPONSE header (base64 encoded settlement response)
     */
    parseSettlementResponse(response) {
        const settlementHeader = response.headers.get("X-PAYMENT-RESPONSE");
        if (!settlementHeader) {
            return null; // No settlement (e.g., Stripe payment)
        }
        try {
            const settlementJson = js_base64_1.Base64.decode(settlementHeader);
            const settlement = JSON.parse(settlementJson);
            // Validate settlement structure
            if (typeof settlement.success !== "boolean") {
                (0, logger_1.getLogger)().error("Invalid settlement response: missing success field");
                return null;
            }
            return settlement;
        }
        catch (error) {
            (0, logger_1.getLogger)().error("Failed to parse settlement response:", error);
            return null;
        }
    }
    /**
     * Retry request with payment proof
     * SECURITY: Coupon and metadata sent in X-PAYMENT header payload, NOT query strings
     */
    async submitPayment(options) {
        const { resource, payload, couponCode, metadata, resourceType = "regular", } = options;
        // Rate limiting check
        if (!this.verifyRateLimiter.tryConsume()) {
            return {
                success: false,
                error: (0, resilience_1.rateLimitExceededMessage)('payment verification'),
            };
        }
        try {
            const result = await this.circuitBreaker.execute(async () => {
                return await (0, exponentialBackoff_1.retryWithBackoff)(async () => {
                    // Keep resource, metadata, and coupon data inside the payment header payload.
                    const paymentPayloadWithResource = {
                        ...payload,
                        payload: {
                            ...payload.payload,
                            resource,
                            resourceType,
                            metadata: {
                                ...(payload.payload.metadata || {}),
                                ...(metadata || {}),
                                ...(couponCode ? { couponCode } : {}),
                            },
                        },
                    };
                    const paymentHeader = this.buildPaymentHeader(paymentPayloadWithResource);
                    // Resource identifiers stay in X-PAYMENT, not the URL.
                    const urlPath = `/paywall/v1/verify`;
                    (0, logger_1.getLogger)().debug("[X402Manager] Submitting payment", {
                        resourceType,
                        hasCoupon: !!couponCode,
                        hasMetadata: !!metadata,
                    });
                    const url = await this.routeDiscovery.buildUrl(urlPath);
                    const response = await (0, fetchWithTimeout_1.fetchWithTimeout)(url, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "X-PAYMENT": paymentHeader,
                            "Idempotency-Key": (0, uuid_1.generateUUID)(),
                        },
                    });
                    if (response.ok) {
                        // Payment verified, resource unlocked
                        const { settlement, transactionId } = await this.handlePaymentVerification(response, payload.payload.signature);
                        return {
                            success: true,
                            transactionId,
                            settlement: settlement || undefined,
                        };
                    }
                    // Backend returns JSON with user-friendly error messages
                    const errorMessage = await (0, errorHandling_1.parseErrorResponse)(response, "Payment verification failed", true);
                    return {
                        success: false,
                        error: errorMessage,
                    };
                }, { ...exponentialBackoff_1.RETRY_PRESETS.STANDARD, name: 'x402-verify' });
            });
            return result;
        }
        catch (error) {
            if (error instanceof circuitBreaker_1.CircuitBreakerOpenError) {
                return {
                    success: false,
                    error: (0, resilience_1.serviceUnavailableMessage)('Payment verification service'),
                };
            }
            return {
                success: false,
                error: (0, errorHandling_1.formatError)(error, "Unknown error"),
            };
        }
    }
    /**
     * Build a complete gasless transaction on the backend
     * Returns an unsigned transaction with all instructions (compute budget, transfer, memo)
     */
    async buildGaslessTransaction(options) {
        const { resourceId, userWallet, feePayer, couponCode } = options;
        // Rate limiting check
        if (!this.quoteRateLimiter.tryConsume()) {
            throw new Error((0, resilience_1.rateLimitExceededMessage)('gasless transaction requests'));
        }
        // Circuit breaker + retry logic
        try {
            return await this.circuitBreaker.execute(async () => {
                return await (0, exponentialBackoff_1.retryWithBackoff)(async () => {
                    const url = await this.routeDiscovery.buildUrl("/paywall/v1/gasless-transaction");
                    const response = await (0, fetchWithTimeout_1.fetchWithTimeout)(url, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            resourceId,
                            userWallet,
                            feePayer,
                            couponCode,
                        }),
                    });
                    if (!response.ok) {
                        const errorMessage = await (0, errorHandling_1.parseErrorResponse)(response, "Failed to build gasless transaction");
                        throw new Error(errorMessage);
                    }
                    return await response.json();
                }, { ...exponentialBackoff_1.RETRY_PRESETS.QUICK, name: 'x402-gasless-build' });
            });
        }
        catch (error) {
            if (error instanceof circuitBreaker_1.CircuitBreakerOpenError) {
                (0, logger_1.getLogger)().error('[X402Manager] Circuit breaker is OPEN - gasless transaction service unavailable');
                throw new Error((0, resilience_1.serviceUnavailableMessage)('Gasless transaction service'));
            }
            throw error;
        }
    }
    /**
     * Submit gasless partial transaction for co-signing
     * Sends the partially-signed transaction in X-Payment header for backend co-signing
     * SECURITY: Coupon and metadata sent in X-PAYMENT header payload, NOT query strings
     */
    async submitGaslessTransaction(options) {
        const { resource, partialTx, couponCode, metadata, resourceType = "regular", requirement, } = options;
        // Rate limiting check
        if (!this.verifyRateLimiter.tryConsume()) {
            return {
                success: false,
                error: (0, resilience_1.rateLimitExceededMessage)('gasless transaction verification'),
            };
        }
        try {
            const result = await this.circuitBreaker.execute(async () => {
                return await (0, exponentialBackoff_1.retryWithBackoff)(async () => {
                    // Gasless payments use an unsigned signature slot; the backend finalizes after co-signing.
                    const paymentPayload = {
                        x402Version: 0,
                        scheme: requirement?.scheme || "solana-spl-transfer",
                        network: requirement?.network || "mainnet-beta",
                        payload: {
                            signature: "", // Backend fills this after co-signing.
                            transaction: partialTx,
                            feePayer: requirement?.extra?.feePayer || "",
                            resource,
                            resourceType,
                            metadata: {
                                ...(metadata || {}),
                                ...(couponCode ? { couponCode } : {}),
                            },
                        },
                    };
                    const paymentHeader = this.buildPaymentHeader(paymentPayload);
                    // Resource identifiers stay in X-PAYMENT, not the URL.
                    const urlPath = `/paywall/v1/verify`;
                    const url = await this.routeDiscovery.buildUrl(urlPath);
                    const response = await (0, fetchWithTimeout_1.fetchWithTimeout)(url, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "X-PAYMENT": paymentHeader,
                            "Idempotency-Key": (0, uuid_1.generateUUID)(),
                        },
                    });
                    if (response.ok) {
                        // Payment verified, resource unlocked
                        const { settlement, transactionId } = await this.handlePaymentVerification(response, "gasless-tx");
                        return {
                            success: true,
                            transactionId,
                            settlement: settlement || undefined,
                        };
                    }
                    // Backend returns JSON with user-friendly error messages
                    const errorMessage = await (0, errorHandling_1.parseErrorResponse)(response, "Gasless transaction failed", true);
                    return {
                        success: false,
                        error: errorMessage,
                    };
                }, { ...exponentialBackoff_1.RETRY_PRESETS.STANDARD, name: 'x402-gasless-verify' });
            });
            return result;
        }
        catch (error) {
            if (error instanceof circuitBreaker_1.CircuitBreakerOpenError) {
                return {
                    success: false,
                    error: (0, resilience_1.serviceUnavailableMessage)('Gasless transaction verification service'),
                };
            }
            return {
                success: false,
                error: (0, errorHandling_1.formatError)(error, "Unknown error"),
            };
        }
    }
    /**
     * Handle payment verification response (shared logic for both submitPayment and submitGaslessTransaction)
     * Parses settlement header and extracts transaction ID from response body
     * @param response - HTTP response from payment verification endpoint
     * @param defaultTxId - Fallback transaction ID if JSON parsing fails
     * @returns Settlement data and transaction ID
     */
    async handlePaymentVerification(response, defaultTxId) {
        // Parse the settlement header before the body; x402 responses may be non-JSON.
        const settlement = this.parseSettlementResponse(response);
        // Only attempt to parse body as JSON if Content-Type indicates JSON
        const contentType = response.headers.get("Content-Type") || "";
        let transactionId = defaultTxId;
        if (contentType.includes("application/json")) {
            try {
                const data = await response.json();
                transactionId = data.signature || defaultTxId;
            }
            catch (error) {
                // Log but don't fail - settlement header is what matters for payment success
                (0, logger_1.getLogger)().warn("Failed to parse JSON response body:", error);
            }
        }
        return { settlement, transactionId };
    }
    /**
     * Validate x402 requirement structure
     */
    validateRequirement(req) {
        return !!(req.scheme &&
            req.network &&
            req.maxAmountRequired &&
            req.resource &&
            req.payTo &&
            req.asset &&
            req.maxTimeoutSeconds > 0);
    }
    async requestRefund(input) {
        const { originalPurchaseId, recipientWallet, reason } = input;
        if (!originalPurchaseId || !recipientWallet) {
            throw new Error('originalPurchaseId and recipientWallet are required');
        }
        const url = await this.routeDiscovery.buildUrl('/paywall/v1/refunds/request');
        const response = await (0, fetchWithTimeout_1.fetchWithTimeout)(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ originalPurchaseId, recipientWallet, reason }),
        });
        if (!response.ok) {
            throw new Error(await (0, errorHandling_1.parseErrorResponse)(response, 'Failed to request refund'));
        }
        return (await response.json());
    }
    async getRefundStatus(refundId) {
        if (!refundId) {
            throw new Error('refundId is required');
        }
        // Resource id stays in the path here (the refund id is a non-secret digest, and the
        // backend mounts the route as /paywall/v1/refunds/{refundId}).
        const url = await this.routeDiscovery.buildUrl(`/paywall/v1/refunds/${encodeURIComponent(refundId)}`);
        const response = await (0, fetchWithTimeout_1.fetchWithTimeout)(url, { method: 'GET' });
        if (!response.ok) {
            throw new Error(await (0, errorHandling_1.parseErrorResponse)(response, 'Failed to fetch refund status'));
        }
        return (await response.json());
    }
}
exports.X402Manager = X402Manager;
//# sourceMappingURL=X402Manager.js.map