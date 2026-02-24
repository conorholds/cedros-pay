import { loadStripe, Stripe } from '@stripe/stripe-js';
import { generateUUID } from '../utils/uuid';
import type { StripeSessionRequest, StripeSessionResponse, PaymentResult } from '../types';
import { RouteDiscoveryManager } from './RouteDiscoveryManager';
import { getLogger } from '../utils/logger';
import { formatError, parseErrorResponse } from '../utils/errorHandling';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';
import type { NormalizedCartItem } from '../utils/cartHelpers';
import { createRateLimiter, RATE_LIMITER_PRESETS } from '../utils/rateLimiter';
import { createCircuitBreaker, CircuitBreakerOpenError } from '../utils/circuitBreaker';
import { retryWithBackoff, RETRY_PRESETS } from '../utils/exponentialBackoff';

/**
 * Options for processing a cart checkout
 *
 * All fields beyond `items` are optional and forwarded as-is to the backend
 * cart checkout endpoint. The backend may ignore fields it does not support.
 */
export interface ProcessCartCheckoutOptions {
  items: NormalizedCartItem[];
  successUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, string>;
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  /** Serialized shipping address forwarded to the backend */
  shippingAddress?: Record<string, string>;
  /** Serialized billing address forwarded to the backend */
  billingAddress?: Record<string, string>;
  couponCode?: string;
  tipAmount?: number;
  shippingMethodId?: string;
  paymentMethodId?: string;
}

/**
 * Public interface for Stripe payment management.
 *
 * Use this interface for type annotations instead of the concrete StripeManager class.
 * This allows internal implementation changes without breaking your code.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { stripeManager } = useCedrosContext();
 *   // stripeManager is typed as IStripeManager
 *   await stripeManager.createSession({ resource: 'item-1' });
 * }
 * ```
 */
export interface IStripeManager {
  /**
   * Initialize Stripe.js library
   */
  initialize(): Promise<void>;

  /**
   * Create a Stripe checkout session for a single item
   */
  createSession(request: StripeSessionRequest): Promise<StripeSessionResponse>;

  /**
   * Redirect to Stripe checkout page
   */
  redirectToCheckout(sessionId: string): Promise<PaymentResult>;

  /**
   * Complete payment flow: create session and redirect
   */
  processPayment(request: StripeSessionRequest): Promise<PaymentResult>;

  /**
   * Create a Stripe cart checkout session for multiple items
   */
  processCartCheckout(
    options: ProcessCartCheckoutOptions
  ): Promise<PaymentResult>;
}

/**
 * Internal implementation of Stripe payment management.
 *
 * @internal
 * **DO NOT USE THIS CLASS DIRECTLY**
 *
 * This concrete class is not part of the stable API and may change without notice.
 * Constructor signatures, method signatures, and internal implementation details
 * are subject to change in any release (including patch releases).
 *
 * **Correct Usage:**
 * ```typescript
 * import { useCedrosContext } from '@cedros/pay-react';
 *
 * function MyComponent() {
 *   const { stripeManager } = useCedrosContext();
 *   // stripeManager is typed as IStripeManager (stable interface)
 *   await stripeManager.processPayment({ ... });
 * }
 * ```
 *
 * **Incorrect Usage (WILL BREAK):**
 * ```typescript
 * import { StripeManager } from '@cedros/pay-react'; // ❌ Not exported
 * const manager = new StripeManager(...); // ❌ Unsupported
 * ```
 *
 * @see {@link IStripeManager} for the stable interface
 * @see API_STABILITY.md for our API stability policy
 */
export class StripeManager implements IStripeManager {
  private stripe: Stripe | null = null;
  private initPromise: Promise<void> | null = null;
  private readonly publicKey: string;
  private readonly routeDiscovery: RouteDiscoveryManager;
  private readonly rateLimiter = createRateLimiter(RATE_LIMITER_PRESETS.PAYMENT);
  private readonly circuitBreaker = createCircuitBreaker({
    failureThreshold: 5,
    timeout: 10000, // 10 seconds for faster recovery in payment flows
    name: 'stripe-manager',
  });

  constructor(publicKey: string, routeDiscovery: RouteDiscoveryManager) {
    this.publicKey = publicKey;
    this.routeDiscovery = routeDiscovery;
  }

  /**
   * Initialize Stripe.js library
   *
   * Concurrent callers share a single loadStripe() call via a cached promise.
   */
  async initialize(): Promise<void> {
    if (this.stripe) return;
    if (!this.initPromise) {
      this.initPromise = (async () => {
        try {
          this.stripe = await loadStripe(this.publicKey);
          if (!this.stripe) throw new Error('Failed to initialize Stripe');
        } catch (error) {
          this.initPromise = null; // Allow retry on next call
          throw error;
        }
      })();
    }
    await this.initPromise;
  }

  /**
   * Create a Stripe checkout session
   */
  async createSession(request: StripeSessionRequest): Promise<StripeSessionResponse> {
    // Rate limiting check
    if (!this.rateLimiter.tryConsume()) {
      throw new Error('Rate limit exceeded for Stripe session creation. Please try again later.');
    }

    // Circuit breaker + retry logic
    const idempotencyKey = generateUUID();
    try {
      return await this.circuitBreaker.execute(async () => {
        return await retryWithBackoff(
          async () => {
            const url = await this.routeDiscovery.buildUrl('/paywall/v1/stripe-session');
            getLogger().debug('[StripeManager] Creating session', {
              resource: request.resource,
              hasCouponCode: Boolean(request.couponCode),
              hasMetadata: Boolean(request.metadata && Object.keys(request.metadata).length),
              metadataKeyCount: request.metadata ? Object.keys(request.metadata).length : 0,
            });
            const response = await fetchWithTimeout(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Idempotency-Key': idempotencyKey,
              },
              body: JSON.stringify(request),
            });

            if (!response.ok) {
              const errorMessage = await parseErrorResponse(response, 'Failed to create Stripe session');
              throw new Error(errorMessage);
            }

            return await response.json();
          },
          { ...RETRY_PRESETS.STANDARD, name: 'stripe-create-session' }
        );
      });
    } catch (error) {
      if (error instanceof CircuitBreakerOpenError) {
        getLogger().error('[StripeManager] Circuit breaker is OPEN - Stripe service unavailable');
        throw new Error('Stripe payment service is temporarily unavailable. Please try again in a few moments.');
      }
      throw error;
    }
  }

  /**
   * Redirect to Stripe checkout
   */
  async redirectToCheckout(sessionId: string): Promise<PaymentResult> {
    if (!this.stripe) {
      await this.initialize();
    }

    if (!this.stripe) {
      return {
        success: false,
        error: 'Stripe not initialized',
      };
    }

    const result = await this.stripe.redirectToCheckout({ sessionId });

    if (result.error) {
      return {
        success: false,
        error: result.error.message,
      };
    }

    // This code won't execute if redirect succeeds
    return { success: true };
  }

  /**
   * Handle complete payment flow: create session and redirect
   */
  async processPayment(request: StripeSessionRequest): Promise<PaymentResult> {
    try {
      const session = await this.createSession(request);
      return await this.redirectToCheckout(session.sessionId);
    } catch (error) {
      return {
        success: false,
        error: formatError(error, 'Unknown error'),
      };
    }
  }

  /**
   * Create a Stripe cart checkout session for multiple items
   */
  async processCartCheckout(
    options: ProcessCartCheckoutOptions
  ): Promise<PaymentResult> {
    const {
      items,
      successUrl,
      cancelUrl,
      metadata,
      customerEmail,
      customerName,
      customerPhone,
      shippingAddress,
      billingAddress,
      couponCode,
      tipAmount,
      shippingMethodId,
      paymentMethodId,
    } = options;

    // Rate limiting check
    if (!this.rateLimiter.tryConsume()) {
      return {
        success: false,
        error: 'Rate limit exceeded for cart checkout. Please try again later.',
      };
    }

    const cartIdempotencyKey = generateUUID();
    try {
      const session = await this.circuitBreaker.execute(async () => {
        return await retryWithBackoff(
          async () => {
            const url = await this.routeDiscovery.buildUrl('/paywall/v1/cart/checkout');

            // Rust server uses 'coupon', Go server used 'couponCode'
            // Send both for backwards compatibility during migration
            const cartRequest = {
              items,
              successUrl,
              cancelUrl,
              metadata,
              customerEmail,
              customerName,
              customerPhone,
              shippingAddress,
              billingAddress,
              coupon: couponCode,      // New Rust server field
              couponCode,              // Legacy Go server field (backwards compat)
              tipAmount,
              shippingMethodId,
              paymentMethodId,
            };

            const response = await fetchWithTimeout(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Idempotency-Key': cartIdempotencyKey,
              },
              body: JSON.stringify(cartRequest),
            });

            if (!response.ok) {
              const errorMessage = await parseErrorResponse(response, 'Failed to create cart checkout session');
              throw new Error(errorMessage);
            }

            return await response.json() as StripeSessionResponse;
          },
          { ...RETRY_PRESETS.STANDARD, name: 'stripe-cart-checkout' }
        );
      });

      return await this.redirectToCheckout(session.sessionId);
    } catch (error) {
      if (error instanceof CircuitBreakerOpenError) {
        return {
          success: false,
          error: 'Stripe payment service is temporarily unavailable. Please try again in a few moments.',
        };
      }
      return {
        success: false,
        error: formatError(error, 'Cart checkout failed'),
      };
    }
  }
}
