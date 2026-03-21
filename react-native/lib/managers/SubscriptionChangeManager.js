"use strict";
/**
 * Subscription Change Manager
 *
 * Handles subscription upgrade, downgrade, and plan change operations.
 * Separated from SubscriptionManager to keep files under 500 lines.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionChangeManager = void 0;
const uuid_1 = require("../utils/uuid");
const logger_1 = require("../utils/logger");
const errorHandling_1 = require("../utils/errorHandling");
const fetchWithTimeout_1 = require("../utils/fetchWithTimeout");
const rateLimiter_1 = require("../utils/rateLimiter");
const circuitBreaker_1 = require("../utils/circuitBreaker");
const exponentialBackoff_1 = require("../utils/exponentialBackoff");
/**
 * Internal implementation of subscription change operations.
 *
 * @internal
 */
class SubscriptionChangeManager {
    constructor(routeDiscovery) {
        this.rateLimiter = (0, rateLimiter_1.createRateLimiter)(rateLimiter_1.RATE_LIMITER_PRESETS.PAYMENT);
        this.queryRateLimiter = (0, rateLimiter_1.createRateLimiter)(rateLimiter_1.RATE_LIMITER_PRESETS.QUOTE);
        this.circuitBreaker = (0, circuitBreaker_1.createCircuitBreaker)({
            failureThreshold: 5,
            timeout: 10000,
            name: 'subscription-change-manager',
        });
        this.routeDiscovery = routeDiscovery;
    }
    /** Internal helper: execute with rate limiting, circuit breaker, and retry */
    async executeWithResilience(rateLimiter, operation, retryName, errorContext) {
        if (!rateLimiter.tryConsume()) {
            throw new Error('Rate limit exceeded. Please try again later.');
        }
        try {
            return await this.circuitBreaker.execute(() => (0, exponentialBackoff_1.retryWithBackoff)(operation, { ...exponentialBackoff_1.RETRY_PRESETS.STANDARD, name: retryName }));
        }
        catch (error) {
            if (error instanceof circuitBreaker_1.CircuitBreakerOpenError) {
                (0, logger_1.getLogger)().error(`[SubscriptionChangeManager] Circuit breaker OPEN for ${errorContext}`);
                throw new Error('Service temporarily unavailable. Please try again in a few moments.');
            }
            throw error;
        }
    }
    /** Change subscription plan (upgrade or downgrade) */
    async changeSubscription(request) {
        return this.executeWithResilience(this.rateLimiter, async () => {
            const url = await this.routeDiscovery.buildUrl('/paywall/v1/subscription/change');
            (0, logger_1.getLogger)().debug('[SubscriptionChangeManager] Changing subscription:', request);
            const response = await (0, fetchWithTimeout_1.fetchWithTimeout)(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Idempotency-Key': (0, uuid_1.generateUUID)() },
                body: JSON.stringify(request),
            });
            if (!response.ok) {
                throw new Error(await (0, errorHandling_1.parseErrorResponse)(response, 'Failed to change subscription'));
            }
            return await response.json();
        }, 'subscription-change', 'plan change');
    }
    /** Preview subscription change (get proration details) */
    async previewChange(request) {
        return this.executeWithResilience(this.queryRateLimiter, async () => {
            const url = await this.routeDiscovery.buildUrl('/paywall/v1/subscription/change/preview');
            (0, logger_1.getLogger)().debug('[SubscriptionChangeManager] Previewing subscription change:', request);
            const response = await (0, fetchWithTimeout_1.fetchWithTimeout)(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(request),
            });
            if (!response.ok) {
                throw new Error(await (0, errorHandling_1.parseErrorResponse)(response, 'Failed to preview change'));
            }
            return await response.json();
        }, 'subscription-preview', 'change preview');
    }
    /** Get full subscription details */
    async getDetails(resource, userId) {
        return this.executeWithResilience(this.queryRateLimiter, async () => {
            const params = new URLSearchParams({ resource, userId });
            const url = await this.routeDiscovery.buildUrl(`/paywall/v1/subscription/details?${params}`);
            (0, logger_1.getLogger)().debug('[SubscriptionChangeManager] Getting subscription details:', { resource, userId });
            const response = await (0, fetchWithTimeout_1.fetchWithTimeout)(url, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });
            if (!response.ok) {
                throw new Error(await (0, errorHandling_1.parseErrorResponse)(response, 'Failed to get subscription details'));
            }
            return await response.json();
        }, 'subscription-details', 'details');
    }
    /** Cancel a subscription */
    async cancel(request) {
        return this.executeWithResilience(this.rateLimiter, async () => {
            const url = await this.routeDiscovery.buildUrl('/paywall/v1/subscription/cancel');
            (0, logger_1.getLogger)().debug('[SubscriptionChangeManager] Canceling subscription:', request);
            const response = await (0, fetchWithTimeout_1.fetchWithTimeout)(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(request),
            });
            if (!response.ok) {
                throw new Error(await (0, errorHandling_1.parseErrorResponse)(response, 'Failed to cancel subscription'));
            }
            return await response.json();
        }, 'subscription-cancel', 'cancellation');
    }
    /** Get Stripe billing portal URL */
    async getBillingPortalUrl(request) {
        return this.executeWithResilience(this.queryRateLimiter, async () => {
            const url = await this.routeDiscovery.buildUrl('/paywall/v1/subscription/portal');
            (0, logger_1.getLogger)().debug('[SubscriptionChangeManager] Getting billing portal URL:', request);
            const response = await (0, fetchWithTimeout_1.fetchWithTimeout)(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(request),
            });
            if (!response.ok) {
                throw new Error(await (0, errorHandling_1.parseErrorResponse)(response, 'Failed to get billing portal URL'));
            }
            return await response.json();
        }, 'subscription-portal', 'portal');
    }
}
exports.SubscriptionChangeManager = SubscriptionChangeManager;
//# sourceMappingURL=SubscriptionChangeManager.js.map