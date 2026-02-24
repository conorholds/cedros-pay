/**
 * Subscription Manager
 *
 * Handles subscription-related operations for both Stripe and x402 crypto subscriptions.
 * Follows the same patterns as StripeManager for consistency.
 */

import {
  initStripe,
  initPaymentSheet,
  presentPaymentSheet,
} from '@stripe/stripe-react-native';
import { generateUUID } from '../utils/uuid';
import type {
  PaymentResult,
  SubscriptionSessionRequest,
  SubscriptionSessionResponse,
  SubscriptionStatusRequest,
  SubscriptionStatusResponse,
  SubscriptionQuote,
  BillingInterval,
  CancelSubscriptionRequest,
  CancelSubscriptionResponse,
  BillingPortalRequest,
  BillingPortalResponse,
  ActivateX402SubscriptionRequest,
  ActivateX402SubscriptionResponse,
} from '../types';
import { RouteDiscoveryManager } from './RouteDiscoveryManager';
import { getLogger } from '../utils/logger';
import { formatError, parseErrorResponse } from '../utils/errorHandling';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';
import { createRateLimiter, RATE_LIMITER_PRESETS } from '../utils/rateLimiter';
import { createCircuitBreaker, CircuitBreakerOpenError } from '../utils/circuitBreaker';
import { retryWithBackoff, RETRY_PRESETS } from '../utils/exponentialBackoff';

/**
 * Options for requesting a subscription quote (x402)
 */
export interface SubscriptionQuoteOptions {
  /** Coupon code for discount */
  couponCode?: string;
  /** Custom interval in days (for 'custom' interval) */
  intervalDays?: number;
}

/**
 * Public interface for subscription management.
 *
 * Use this interface for type annotations instead of the concrete SubscriptionManager class.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { subscriptionManager } = useCedrosContext();
 *   await subscriptionManager.processSubscription({
 *     resource: 'plan-pro',
 *     interval: 'monthly',
 *   });
 * }
 * ```
 */
export interface ISubscriptionManager {
  /**
   * Initialize Stripe.js library (for redirect flow)
   */
  initialize(): Promise<void>;

  /**
   * Create a Stripe subscription checkout session
   */
  createSubscriptionSession(
    request: SubscriptionSessionRequest
  ): Promise<SubscriptionSessionResponse>;

  /**
   * Redirect to Stripe checkout page
   */
  redirectToCheckout(sessionId: string): Promise<PaymentResult>;

  /**
   * Complete subscription flow: create session and redirect (Stripe)
   */
  processSubscription(request: SubscriptionSessionRequest): Promise<PaymentResult>;

  /**
   * Check subscription status (for x402 gating)
   */
  checkSubscriptionStatus(
    request: SubscriptionStatusRequest
  ): Promise<SubscriptionStatusResponse>;

  /**
   * Request a subscription quote for x402 crypto payment
   */
  requestSubscriptionQuote(
    resource: string,
    interval: BillingInterval,
    options?: SubscriptionQuoteOptions
  ): Promise<SubscriptionQuote>;

  /**
   * Cancel a subscription
   */
  cancelSubscription(request: CancelSubscriptionRequest): Promise<CancelSubscriptionResponse>;

  /**
   * Get Stripe billing portal URL for subscription management
   */
  getBillingPortalUrl(request: BillingPortalRequest): Promise<BillingPortalResponse>;

  /**
   * Activate x402 subscription after payment verification
   */
  activateX402Subscription(
    request: ActivateX402SubscriptionRequest
  ): Promise<ActivateX402SubscriptionResponse>;
}

/**
 * Internal implementation of subscription management.
 *
 * @internal
 * **DO NOT USE THIS CLASS DIRECTLY**
 *
 * @see {@link ISubscriptionManager} for the stable interface
 */
export class SubscriptionManager implements ISubscriptionManager {
  private isStripeInitialized = false;
  private readonly publicKey: string;
  private readonly routeDiscovery: RouteDiscoveryManager;

  // Separate rate limiters for different operation types
  private readonly sessionRateLimiter = createRateLimiter(RATE_LIMITER_PRESETS.PAYMENT);
  private readonly statusRateLimiter = createRateLimiter(RATE_LIMITER_PRESETS.QUOTE);

  private readonly circuitBreaker = createCircuitBreaker({
    failureThreshold: 5,
    timeout: 10000, // 10 seconds for faster recovery
    name: 'subscription-manager',
  });

  constructor(publicKey: string, routeDiscovery: RouteDiscoveryManager) {
    this.publicKey = publicKey;
    this.routeDiscovery = routeDiscovery;
  }

  /** Initialize Stripe React Native SDK */
  async initialize(): Promise<void> {
    if (this.isStripeInitialized) return;

    await initStripe({
      publishableKey: this.publicKey,
    });

    this.isStripeInitialized = true;
    getLogger().debug('[SubscriptionManager] Stripe React Native SDK initialized');
  }

  /** Internal helper: execute with rate limiting, circuit breaker, and retry */
  private async executeWithResilience<T>(
    rateLimiter: ReturnType<typeof createRateLimiter>,
    operation: () => Promise<T>,
    retryName: string,
    errorContext: string
  ): Promise<T> {
    if (!rateLimiter.tryConsume()) {
      throw new Error(`Rate limit exceeded. Please try again later.`);
    }
    try {
      return await this.circuitBreaker.execute(() =>
        retryWithBackoff(operation, { ...RETRY_PRESETS.STANDARD, name: retryName })
      );
    } catch (error) {
      if (error instanceof CircuitBreakerOpenError) {
        getLogger().error(`[SubscriptionManager] Circuit breaker OPEN for ${errorContext}`);
        throw new Error('Service temporarily unavailable. Please try again in a few moments.');
      }
      throw error;
    }
  }

  /**
   * Create a Stripe subscription checkout session
   */
  async createSubscriptionSession(
    request: SubscriptionSessionRequest
  ): Promise<SubscriptionSessionResponse> {
    // Rate limiting check
    if (!this.sessionRateLimiter.tryConsume()) {
      throw new Error('Rate limit exceeded for subscription session creation. Please try again later.');
    }

    // Circuit breaker + retry logic
    try {
      return await this.circuitBreaker.execute(async () => {
        return await retryWithBackoff(
          async () => {
            const url = await this.routeDiscovery.buildUrl('/paywall/v1/subscription/stripe-session');

            getLogger().debug('[SubscriptionManager] Creating subscription session:', {
              resource: request.resource,
              interval: request.interval,
              trialDays: request.trialDays,
            });

            const response = await fetchWithTimeout(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Idempotency-Key': generateUUID(),
              },
              body: JSON.stringify(request),
            });

            if (!response.ok) {
              const errorMessage = await parseErrorResponse(
                response,
                'Failed to create subscription session'
              );
              throw new Error(errorMessage);
            }

            return await response.json();
          },
          { ...RETRY_PRESETS.STANDARD, name: 'subscription-create-session' }
        );
      });
    } catch (error) {
      if (error instanceof CircuitBreakerOpenError) {
        getLogger().error('[SubscriptionManager] Circuit breaker is OPEN - service unavailable');
        throw new Error(
          'Subscription service is temporarily unavailable. Please try again in a few moments.'
        );
      }
      throw error;
    }
  }

  /**
   * Redirect to Stripe checkout — not supported on React Native.
   * Use processSubscription() instead, which uses the native Payment Sheet.
   */
  async redirectToCheckout(_sessionId: string): Promise<PaymentResult> {
    getLogger().warn(
      '[SubscriptionManager] redirectToCheckout is not supported on React Native. ' +
      'Use processSubscription() instead.'
    );
    return {
      success: false,
      error: 'redirectToCheckout is not available on React Native. Use processSubscription() instead.',
    };
  }

  /**
   * Initialize and present the native Payment Sheet for a subscription.
   */
  private async presentPayment(options: {
    paymentIntentClientSecret: string;
    customerId?: string;
    customerEphemeralKeySecret?: string;
  }): Promise<PaymentResult> {
    if (!this.isStripeInitialized) {
      await this.initialize();
    }

    try {
      const sheetConfig: Record<string, unknown> = {
        paymentIntentClientSecret: options.paymentIntentClientSecret,
        customerId: options.customerId,
        allowsDelayedPaymentMethods: true,
      };
      if (options.customerEphemeralKeySecret) {
        sheetConfig.customerEphemeralKeySecret = options.customerEphemeralKeySecret;
      }
      const { error: initError } = await initPaymentSheet(sheetConfig as Parameters<typeof initPaymentSheet>[0]);

      if (initError) {
        getLogger().error('[SubscriptionManager] Payment sheet initialization failed:', initError);
        return { success: false, error: initError.message };
      }

      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code === 'Canceled') {
          return { success: false, error: 'Payment canceled by user' };
        }
        getLogger().error('[SubscriptionManager] Payment presentation failed:', presentError);
        return { success: false, error: presentError.message };
      }

      return {
        success: true,
        transactionId: options.paymentIntentClientSecret.split('_secret_')[0],
      };
    } catch (error) {
      getLogger().error('[SubscriptionManager] Payment sheet error:', error);
      return { success: false, error: formatError(error, 'Payment sheet failed') };
    }
  }

  /**
   * Complete subscription flow: create session and present Payment Sheet.
   * Backend must return paymentIntentClientSecret for React Native flows.
   */
  async processSubscription(request: SubscriptionSessionRequest): Promise<PaymentResult> {
    try {
      const session = await this.createSubscriptionSession(request);

      // For React Native, backend should return payment intent details
      const sessionRecord = session as unknown as Record<string, unknown>;
      if (sessionRecord.paymentIntentClientSecret) {
        return await this.presentPayment({
          paymentIntentClientSecret: sessionRecord.paymentIntentClientSecret as string,
          customerId: sessionRecord.customerId as string | undefined,
          customerEphemeralKeySecret: sessionRecord.customerEphemeralKeySecret as string | undefined,
        });
      }

      // Fallback: backend only provides sessionId (web-style)
      getLogger().warn(
        '[SubscriptionManager] Backend returned sessionId but React Native requires ' +
        'PaymentIntent client secret. Please update backend to return ' +
        'paymentIntentClientSecret for mobile subscription flows.'
      );
      return {
        success: false,
        error: 'Mobile subscriptions require PaymentIntent client secret. Please contact support.',
      };
    } catch (error) {
      return {
        success: false,
        error: formatError(error, 'Subscription failed'),
      };
    }
  }

  /**
   * Check subscription status (for x402 gating)
   */
  async checkSubscriptionStatus(
    request: SubscriptionStatusRequest
  ): Promise<SubscriptionStatusResponse> {
    // Rate limiting check
    if (!this.statusRateLimiter.tryConsume()) {
      throw new Error('Rate limit exceeded for subscription status check. Please try again later.');
    }

    try {
      return await this.circuitBreaker.execute(async () => {
        return await retryWithBackoff(
          async () => {
            const params = new URLSearchParams({
              resource: request.resource,
              userId: request.userId,
            });

            const url = await this.routeDiscovery.buildUrl(
              `/paywall/v1/subscription/status?${params.toString()}`
            );

            getLogger().debug('[SubscriptionManager] Checking subscription status:', request);

            const response = await fetchWithTimeout(url, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            });

            if (!response.ok) {
              const errorMessage = await parseErrorResponse(
                response,
                'Failed to check subscription status'
              );
              throw new Error(errorMessage);
            }

            return await response.json();
          },
          { ...RETRY_PRESETS.STANDARD, name: 'subscription-status-check' }
        );
      });
    } catch (error) {
      if (error instanceof CircuitBreakerOpenError) {
        getLogger().error('[SubscriptionManager] Circuit breaker is OPEN for status check');
        throw new Error(
          'Subscription status service is temporarily unavailable. Please try again in a few moments.'
        );
      }
      throw error;
    }
  }

  /**
   * Request a subscription quote for x402 crypto payment
   */
  async requestSubscriptionQuote(
    resource: string,
    interval: BillingInterval,
    options?: SubscriptionQuoteOptions
  ): Promise<SubscriptionQuote> {
    // Rate limiting check (uses quote limiter)
    if (!this.statusRateLimiter.tryConsume()) {
      throw new Error('Rate limit exceeded for subscription quote. Please try again later.');
    }

    try {
      return await this.circuitBreaker.execute(async () => {
        return await retryWithBackoff(
          async () => {
            const url = await this.routeDiscovery.buildUrl('/paywall/v1/subscription/quote');

            const requestBody = {
              resource,
              interval,
              couponCode: options?.couponCode,
              intervalDays: options?.intervalDays,
            };

            getLogger().debug('[SubscriptionManager] Requesting subscription quote:', requestBody);

            const response = await fetchWithTimeout(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(requestBody),
            });

            // x402 quotes return 402 status with the quote in the body
            if (response.status !== 402 && !response.ok) {
              const errorMessage = await parseErrorResponse(
                response,
                'Failed to get subscription quote'
              );
              throw new Error(errorMessage);
            }

            return await response.json();
          },
          { ...RETRY_PRESETS.STANDARD, name: 'subscription-quote' }
        );
      });
    } catch (error) {
      if (error instanceof CircuitBreakerOpenError) {
        getLogger().error('[SubscriptionManager] Circuit breaker is OPEN for quote');
        throw new Error(
          'Subscription quote service is temporarily unavailable. Please try again in a few moments.'
        );
      }
      throw error;
    }
  }

  /** Cancel a subscription */
  async cancelSubscription(request: CancelSubscriptionRequest): Promise<CancelSubscriptionResponse> {
    return this.executeWithResilience(
      this.sessionRateLimiter,
      async () => {
        const url = await this.routeDiscovery.buildUrl('/paywall/v1/subscription/cancel');
        getLogger().debug('[SubscriptionManager] Canceling subscription:', request);
        const response = await fetchWithTimeout(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        });
        if (!response.ok) throw new Error(await parseErrorResponse(response, 'Failed to cancel'));
        return await response.json();
      },
      'subscription-cancel',
      'cancellation'
    );
  }

  /** Get Stripe billing portal URL for subscription management */
  async getBillingPortalUrl(request: BillingPortalRequest): Promise<BillingPortalResponse> {
    return this.executeWithResilience(
      this.statusRateLimiter,
      async () => {
        const url = await this.routeDiscovery.buildUrl('/paywall/v1/subscription/portal');
        getLogger().debug('[SubscriptionManager] Getting billing portal URL:', request);
        const response = await fetchWithTimeout(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        });
        if (!response.ok) throw new Error(await parseErrorResponse(response, 'Failed to get portal'));
        return await response.json();
      },
      'subscription-portal',
      'portal'
    );
  }

  /** Activate x402 subscription after payment verification */
  async activateX402Subscription(
    request: ActivateX402SubscriptionRequest
  ): Promise<ActivateX402SubscriptionResponse> {
    return this.executeWithResilience(
      this.sessionRateLimiter,
      async () => {
        const url = await this.routeDiscovery.buildUrl('/paywall/v1/subscription/x402/activate');
        getLogger().debug('[SubscriptionManager] Activating x402 subscription:', request);
        const response = await fetchWithTimeout(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        });
        if (!response.ok) throw new Error(await parseErrorResponse(response, 'Failed to activate'));
        return await response.json();
      },
      'subscription-activate',
      'activation'
    );
  }
}
