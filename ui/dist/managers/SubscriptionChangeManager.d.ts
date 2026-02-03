import { ChangeSubscriptionRequest, ChangeSubscriptionResponse, ChangePreviewRequest, ChangePreviewResponse, SubscriptionDetails, CancelSubscriptionRequest, CancelSubscriptionResponse, BillingPortalRequest, BillingPortalResponse } from '../types';
import { RouteDiscoveryManager } from './RouteDiscoveryManager';
/**
 * Public interface for subscription change operations.
 */
export interface ISubscriptionChangeManager {
    /** Change subscription plan (upgrade or downgrade) */
    changeSubscription(request: ChangeSubscriptionRequest): Promise<ChangeSubscriptionResponse>;
    /** Preview subscription change (get proration details) */
    previewChange(request: ChangePreviewRequest): Promise<ChangePreviewResponse>;
    /** Get full subscription details */
    getDetails(resource: string, userId: string): Promise<SubscriptionDetails>;
    /** Cancel a subscription */
    cancel(request: CancelSubscriptionRequest): Promise<CancelSubscriptionResponse>;
    /** Get Stripe billing portal URL */
    getBillingPortalUrl(request: BillingPortalRequest): Promise<BillingPortalResponse>;
}
/**
 * Internal implementation of subscription change operations.
 *
 * @internal
 */
export declare class SubscriptionChangeManager implements ISubscriptionChangeManager {
    private readonly routeDiscovery;
    private readonly rateLimiter;
    private readonly queryRateLimiter;
    private readonly circuitBreaker;
    constructor(routeDiscovery: RouteDiscoveryManager);
    /** Internal helper: execute with rate limiting, circuit breaker, and retry */
    private executeWithResilience;
    /** Change subscription plan (upgrade or downgrade) */
    changeSubscription(request: ChangeSubscriptionRequest): Promise<ChangeSubscriptionResponse>;
    /** Preview subscription change (get proration details) */
    previewChange(request: ChangePreviewRequest): Promise<ChangePreviewResponse>;
    /** Get full subscription details */
    getDetails(resource: string, userId: string): Promise<SubscriptionDetails>;
    /** Cancel a subscription */
    cancel(request: CancelSubscriptionRequest): Promise<CancelSubscriptionResponse>;
    /** Get Stripe billing portal URL */
    getBillingPortalUrl(request: BillingPortalRequest): Promise<BillingPortalResponse>;
}
//# sourceMappingURL=SubscriptionChangeManager.d.ts.map