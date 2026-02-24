/**
 * Subscription Change Manager
 *
 * Handles subscription upgrade, downgrade, and plan change operations.
 * Separated from SubscriptionManager to keep files under 500 lines.
 */

import { generateUUID } from '../utils/uuid';
import type {
  ChangeSubscriptionRequest,
  ChangeSubscriptionResponse,
  ChangePreviewRequest,
  ChangePreviewResponse,
  SubscriptionDetails,
  CancelSubscriptionRequest,
  CancelSubscriptionResponse,
  BillingPortalRequest,
  BillingPortalResponse,
} from '../types';
import { RouteDiscoveryManager } from './RouteDiscoveryManager';
import { getLogger } from '../utils/logger';
import { parseErrorResponse } from '../utils/errorHandling';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';
import { createRateLimiter, RATE_LIMITER_PRESETS } from '../utils/rateLimiter';
import { createCircuitBreaker, CircuitBreakerOpenError } from '../utils/circuitBreaker';
import { retryWithBackoff, RETRY_PRESETS } from '../utils/exponentialBackoff';

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
export class SubscriptionChangeManager implements ISubscriptionChangeManager {
  private readonly routeDiscovery: RouteDiscoveryManager;
  private readonly rateLimiter = createRateLimiter(RATE_LIMITER_PRESETS.PAYMENT);
  private readonly queryRateLimiter = createRateLimiter(RATE_LIMITER_PRESETS.QUOTE);

  private readonly circuitBreaker = createCircuitBreaker({
    failureThreshold: 5,
    timeout: 10000,
    name: 'subscription-change-manager',
  });

  constructor(routeDiscovery: RouteDiscoveryManager) {
    this.routeDiscovery = routeDiscovery;
  }

  /** Internal helper: execute with rate limiting, circuit breaker, and retry */
  private async executeWithResilience<T>(
    rateLimiter: ReturnType<typeof createRateLimiter>,
    operation: () => Promise<T>,
    retryName: string,
    errorContext: string
  ): Promise<T> {
    if (!rateLimiter.tryConsume()) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    try {
      return await this.circuitBreaker.execute(() =>
        retryWithBackoff(operation, { ...RETRY_PRESETS.STANDARD, name: retryName })
      );
    } catch (error) {
      if (error instanceof CircuitBreakerOpenError) {
        getLogger().error(`[SubscriptionChangeManager] Circuit breaker OPEN for ${errorContext}`);
        throw new Error('Service temporarily unavailable. Please try again in a few moments.');
      }
      throw error;
    }
  }

  /** Change subscription plan (upgrade or downgrade) */
  async changeSubscription(request: ChangeSubscriptionRequest): Promise<ChangeSubscriptionResponse> {
    const idempotencyKey = generateUUID();
    return this.executeWithResilience(
      this.rateLimiter,
      async () => {
        const url = await this.routeDiscovery.buildUrl('/paywall/v1/subscription/change');
        getLogger().debug('[SubscriptionChangeManager] Changing subscription:', request);
        const response = await fetchWithTimeout(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
          body: JSON.stringify(request),
        });
        if (!response.ok) {
          throw new Error(await parseErrorResponse(response, 'Failed to change subscription'));
        }
        return await response.json();
      },
      'subscription-change',
      'plan change'
    );
  }

  /** Preview subscription change (get proration details) */
  async previewChange(request: ChangePreviewRequest): Promise<ChangePreviewResponse> {
    return this.executeWithResilience(
      this.queryRateLimiter,
      async () => {
        const url = await this.routeDiscovery.buildUrl('/paywall/v1/subscription/change/preview');
        getLogger().debug('[SubscriptionChangeManager] Previewing subscription change:', request);
        const response = await fetchWithTimeout(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        });
        if (!response.ok) {
          throw new Error(await parseErrorResponse(response, 'Failed to preview change'));
        }
        return await response.json();
      },
      'subscription-preview',
      'change preview'
    );
  }

  /** Get full subscription details */
  async getDetails(resource: string, userId: string): Promise<SubscriptionDetails> {
    return this.executeWithResilience(
      this.queryRateLimiter,
      async () => {
        const params = new URLSearchParams({ resource, userId });
        const url = await this.routeDiscovery.buildUrl(`/paywall/v1/subscription/details?${params}`);
        getLogger().debug('[SubscriptionChangeManager] Getting subscription details:', { resource, userId });
        const response = await fetchWithTimeout(url, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) {
          throw new Error(await parseErrorResponse(response, 'Failed to get subscription details'));
        }
        return await response.json();
      },
      'subscription-details',
      'details'
    );
  }

  /** Cancel a subscription */
  async cancel(request: CancelSubscriptionRequest): Promise<CancelSubscriptionResponse> {
    return this.executeWithResilience(
      this.rateLimiter,
      async () => {
        const url = await this.routeDiscovery.buildUrl('/paywall/v1/subscription/cancel');
        getLogger().debug('[SubscriptionChangeManager] Canceling subscription:', request);
        const response = await fetchWithTimeout(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        });
        if (!response.ok) {
          throw new Error(await parseErrorResponse(response, 'Failed to cancel subscription'));
        }
        return await response.json();
      },
      'subscription-cancel',
      'cancellation'
    );
  }

  /** Get Stripe billing portal URL */
  async getBillingPortalUrl(request: BillingPortalRequest): Promise<BillingPortalResponse> {
    return this.executeWithResilience(
      this.queryRateLimiter,
      async () => {
        const url = await this.routeDiscovery.buildUrl('/paywall/v1/subscription/portal');
        getLogger().debug('[SubscriptionChangeManager] Getting billing portal URL:', request);
        const response = await fetchWithTimeout(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        });
        if (!response.ok) {
          throw new Error(await parseErrorResponse(response, 'Failed to get billing portal URL'));
        }
        return await response.json();
      },
      'subscription-portal',
      'portal'
    );
  }
}
