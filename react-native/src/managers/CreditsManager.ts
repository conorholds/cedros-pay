import type {
  CreditsRequirement,
  CreditsPaymentResult,
  CreditsHoldResponse,
  CartCreditsQuote,
  PaymentResult,
} from '../types';
import { RouteDiscoveryManager } from './RouteDiscoveryManager';
import { getLogger } from '../utils/logger';
import { formatError, parseErrorResponse } from '../utils/errorHandling';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';
import { generateUUID } from '../utils/uuid';
import type { NormalizedCartItem } from '../utils/cartHelpers';
import { createRateLimiter, RATE_LIMITER_PRESETS } from '../utils/rateLimiter';
import { createCircuitBreaker, CircuitBreakerOpenError } from '../utils/circuitBreaker';
import { retryWithBackoff, RETRY_PRESETS } from '../utils/exponentialBackoff';

/**
 * Options for creating a credits hold
 */
export interface CreateCreditsHoldOptions {
  resource: string;
  couponCode?: string;
  /** JWT token from cedros-login for user authentication */
  authToken: string;
}

/**
 * Options for processing a credits payment
 */
export interface ProcessCreditsPaymentOptions {
  resource: string;
  holdId: string;
  couponCode?: string;
  /** JWT token from cedros-login for user authentication */
  authToken: string;
  metadata?: Record<string, string>;
}

/**
 * Options for creating a cart credits hold
 */
export interface CreateCartCreditsHoldOptions {
  cartId: string;
  /** JWT token from cedros-login for user authentication */
  authToken: string;
}

/**
 * Options for processing a credits cart payment
 */
export interface ProcessCreditsCartPaymentOptions {
  cartId: string;
  holdId: string;
  /** JWT token from cedros-login for user authentication */
  authToken: string;
  metadata?: Record<string, string>;
}

/**
 * Public interface for Credits payment management.
 *
 * Use this interface for type annotations instead of the concrete CreditsManager class.
 * This allows internal implementation changes without breaking your code.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { creditsManager } = useCedrosContext();
 *   // creditsManager is typed as ICreditsManager
 *   const quote = await creditsManager.requestQuote('item-1');
 * }
 * ```
 */
export interface ICreditsManager {
  /**
   * Request a credits quote for a single resource
   * @param resource - Resource ID to get quote for
   * @param couponCode - Optional coupon code for discount
   * @returns Credits requirement with amount and details
   */
  requestQuote(resource: string, couponCode?: string): Promise<CreditsRequirement | null>;

  /**
   * Request a credits quote for a cart
   * @param items - Cart items to get quote for
   * @param couponCode - Optional coupon code for discount
   * @returns Cart credits quote with total amount
   */
  requestCartQuote(
    items: NormalizedCartItem[],
    couponCode?: string
  ): Promise<{ cartId: string; credits: CartCreditsQuote } | null>;

  /**
   * Create a hold on user's credits
   * Requires user authentication via cedros-login JWT token
   * @param options - Hold creation options including resource and auth token
   */
  createHold(options: CreateCreditsHoldOptions): Promise<CreditsHoldResponse>;

  /**
   * Create a hold on user's credits for a cart
   * Requires user authentication via cedros-login JWT token
   * @param options - Cart hold creation options
   */
  createCartHold(options: CreateCartCreditsHoldOptions): Promise<CreditsHoldResponse>;

  /**
   * Authorize a credits payment using a hold
   * @param options - Payment options including hold ID
   */
  authorizePayment(options: ProcessCreditsPaymentOptions): Promise<CreditsPaymentResult>;

  /**
   * Authorize a credits cart payment using a hold
   * @param options - Cart payment options including hold ID
   */
  authorizeCartPayment(options: ProcessCreditsCartPaymentOptions): Promise<CreditsPaymentResult>;

  /**
   * Complete credits payment flow: create hold and authorize
   * Convenience method that combines createHold + authorizePayment
   * @param resource - Resource being purchased
   * @param authToken - JWT token from cedros-login
   * @param couponCode - Optional coupon code
   * @param metadata - Optional metadata
   */
  processPayment(
    resource: string,
    authToken: string,
    couponCode?: string,
    metadata?: Record<string, string>
  ): Promise<PaymentResult>;
}

/**
 * Internal implementation of Credits payment management.
 *
 * @internal
 * **DO NOT USE THIS CLASS DIRECTLY**
 *
 * This concrete class is not part of the stable API and may change without notice.
 * Use the ICreditsManager interface via useCedrosContext() instead.
 *
 * @see {@link ICreditsManager} for the stable interface
 */
export class CreditsManager implements ICreditsManager {
  private readonly routeDiscovery: RouteDiscoveryManager;
  private readonly rateLimiter = createRateLimiter(RATE_LIMITER_PRESETS.PAYMENT);
  private readonly circuitBreaker = createCircuitBreaker({
    failureThreshold: 5,
    timeout: 10000,
    name: 'credits-manager',
  });

  constructor(routeDiscovery: RouteDiscoveryManager) {
    this.routeDiscovery = routeDiscovery;
  }

  async requestQuote(resource: string, couponCode?: string): Promise<CreditsRequirement | null> {
    if (!this.rateLimiter.tryConsume()) {
      throw new Error('Rate limit exceeded for credits quote. Please try again later.');
    }

    try {
      return await this.circuitBreaker.execute(async () => {
        return await retryWithBackoff(
          async () => {
            const url = await this.routeDiscovery.buildUrl('/paywall/v1/quote');
            getLogger().debug('[CreditsManager] Requesting quote for resource:', resource);

            const response = await fetchWithTimeout(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ resource, couponCode }),
            });

            // 402 is expected - it contains the quote
            if (response.status === 402) {
              const data = await response.json();
              // Return credits requirement if available
              return data.credits || null;
            }

            if (!response.ok) {
              const errorMessage = await parseErrorResponse(response, 'Failed to get credits quote');
              throw new Error(errorMessage);
            }

            // 200 means resource is free or already accessible
            return null;
          },
          { ...RETRY_PRESETS.STANDARD, name: 'credits-quote' }
        );
      });
    } catch (error) {
      if (error instanceof CircuitBreakerOpenError) {
        getLogger().error('[CreditsManager] Circuit breaker is OPEN - credits service unavailable');
        throw new Error('Credits service is temporarily unavailable. Please try again in a few moments.');
      }
      throw error;
    }
  }

  async requestCartQuote(
    items: NormalizedCartItem[],
    couponCode?: string
  ): Promise<{ cartId: string; credits: CartCreditsQuote } | null> {
    if (!this.rateLimiter.tryConsume()) {
      throw new Error('Rate limit exceeded for cart credits quote. Please try again later.');
    }

    try {
      return await this.circuitBreaker.execute(async () => {
        return await retryWithBackoff(
          async () => {
            const url = await this.routeDiscovery.buildUrl('/paywall/v1/cart/quote');
            getLogger().debug('[CreditsManager] Requesting cart quote for items:', items.length);

            const response = await fetchWithTimeout(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ items, couponCode }),
            });

            if (!response.ok) {
              const errorMessage = await parseErrorResponse(response, 'Failed to get cart credits quote');
              throw new Error(errorMessage);
            }

            const data = await response.json();
            if (!data.credits) {
              return null;
            }

            return {
              cartId: data.cartId,
              credits: data.credits,
            };
          },
          { ...RETRY_PRESETS.STANDARD, name: 'credits-cart-quote' }
        );
      });
    } catch (error) {
      if (error instanceof CircuitBreakerOpenError) {
        throw new Error('Credits service is temporarily unavailable. Please try again in a few moments.');
      }
      throw error;
    }
  }

  /**
   * Create a hold on user's credits
   * Requires Authorization header with cedros-login JWT token
   */
  async createHold(options: CreateCreditsHoldOptions): Promise<CreditsHoldResponse> {
    const { resource, couponCode, authToken } = options;

    if (!this.rateLimiter.tryConsume()) {
      throw new Error('Rate limit exceeded for credits hold. Please try again later.');
    }

    try {
      return await this.circuitBreaker.execute(async () => {
        return await retryWithBackoff(
          async () => {
            const url = await this.routeDiscovery.buildUrl('/paywall/v1/credits/hold');
            getLogger().debug('[CreditsManager] Creating hold for resource:', resource);

            const response = await fetchWithTimeout(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
                'Idempotency-Key': generateUUID(),
              },
              body: JSON.stringify({ resource, couponCode }),
            });

            if (!response.ok) {
              const errorMessage = await parseErrorResponse(response, 'Failed to create credits hold');
              throw new Error(errorMessage);
            }

            return await response.json();
          },
          { ...RETRY_PRESETS.STANDARD, name: 'credits-create-hold' }
        );
      });
    } catch (error) {
      if (error instanceof CircuitBreakerOpenError) {
        throw new Error('Credits service is temporarily unavailable. Please try again in a few moments.');
      }
      throw error;
    }
  }

  /**
   * Create a hold on user's credits for a cart
   * Requires Authorization header with cedros-login JWT token
   */
  async createCartHold(options: CreateCartCreditsHoldOptions): Promise<CreditsHoldResponse> {
    const { cartId, authToken } = options;

    if (!this.rateLimiter.tryConsume()) {
      throw new Error('Rate limit exceeded for cart credits hold. Please try again later.');
    }

    try {
      return await this.circuitBreaker.execute(async () => {
        return await retryWithBackoff(
          async () => {
            const url = await this.routeDiscovery.buildUrl(`/paywall/v1/cart/${cartId}/credits/hold`);
            getLogger().debug('[CreditsManager] Creating cart hold for cart:', cartId);

            const response = await fetchWithTimeout(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
                'Idempotency-Key': generateUUID(),
              },
              body: JSON.stringify({}),
            });

            if (!response.ok) {
              const errorMessage = await parseErrorResponse(response, 'Failed to create cart credits hold');
              throw new Error(errorMessage);
            }

            return await response.json();
          },
          { ...RETRY_PRESETS.STANDARD, name: 'credits-create-cart-hold' }
        );
      });
    } catch (error) {
      if (error instanceof CircuitBreakerOpenError) {
        throw new Error('Credits service is temporarily unavailable. Please try again in a few moments.');
      }
      throw error;
    }
  }

  async authorizePayment(options: ProcessCreditsPaymentOptions): Promise<CreditsPaymentResult> {
    const { resource, holdId, couponCode, authToken, metadata } = options;

    if (!this.rateLimiter.tryConsume()) {
      return {
        success: false,
        error: 'Rate limit exceeded for credits authorization. Please try again later.',
        errorCode: 'rate_limit_exceeded',
      };
    }

    try {
      return await this.circuitBreaker.execute(async () => {
        return await retryWithBackoff(
          async () => {
            // Dedicated credits authorize endpoint
            const url = await this.routeDiscovery.buildUrl('/paywall/v1/credits/authorize');
            getLogger().debug('[CreditsManager] Authorizing payment for resource:', resource);

            const response = await fetchWithTimeout(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
                'Idempotency-Key': generateUUID(),
              },
              body: JSON.stringify({
                resource,
                holdId,
                couponCode,
                ...metadata && { metadata },
              }),
            });

            if (!response.ok) {
              const data = await response.json().catch(() => ({}));
              return {
                success: false,
                error: data.error?.message || 'Credits authorization failed',
                errorCode: data.error?.code || 'authorization_failed',
              };
            }

            const data = await response.json();
            return {
              success: true,
              transactionId: data.transactionId,
            };
          },
          { ...RETRY_PRESETS.STANDARD, name: 'credits-authorize' }
        );
      });
    } catch (error) {
      if (error instanceof CircuitBreakerOpenError) {
        return {
          success: false,
          error: 'Credits service is temporarily unavailable. Please try again in a few moments.',
          errorCode: 'service_unavailable',
        };
      }
      return {
        success: false,
        error: formatError(error, 'Credits authorization failed'),
        errorCode: 'authorization_failed',
      };
    }
  }

  async authorizeCartPayment(options: ProcessCreditsCartPaymentOptions): Promise<CreditsPaymentResult> {
    const { cartId, holdId, authToken, metadata } = options;

    if (!this.rateLimiter.tryConsume()) {
      return {
        success: false,
        error: 'Rate limit exceeded for cart credits authorization. Please try again later.',
        errorCode: 'rate_limit_exceeded',
      };
    }

    try {
      return await this.circuitBreaker.execute(async () => {
        return await retryWithBackoff(
          async () => {
            // Dedicated cart credits authorize endpoint
            const url = await this.routeDiscovery.buildUrl(`/paywall/v1/cart/${cartId}/credits/authorize`);
            getLogger().debug('[CreditsManager] Authorizing cart payment for cart:', cartId);

            const response = await fetchWithTimeout(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
                'Idempotency-Key': generateUUID(),
              },
              body: JSON.stringify({
                holdId,
                ...metadata && { metadata },
              }),
            });

            if (!response.ok) {
              const data = await response.json().catch((parseError) => {
                getLogger().error('[CreditsManager] Failed to parse error response JSON:', parseError, {
                  cartId,
                  status: response.status,
                  statusText: response.statusText,
                });
                return {};
              });
              return {
                success: false,
                error: data.error?.message || 'Cart credits authorization failed',
                errorCode: data.error?.code || 'authorization_failed',
              };
            }

            const data = await response.json();
            return {
              success: true,
              transactionId: data.transactionId,
            };
          },
          { ...RETRY_PRESETS.STANDARD, name: 'credits-cart-authorize' }
        );
      });
    } catch (error) {
      if (error instanceof CircuitBreakerOpenError) {
        return {
          success: false,
          error: 'Credits service is temporarily unavailable. Please try again in a few moments.',
          errorCode: 'service_unavailable',
        };
      }
      return {
        success: false,
        error: formatError(error, 'Cart credits authorization failed'),
        errorCode: 'authorization_failed',
      };
    }
  }

  /**
   * Process a complete credits payment (convenience method)
   * Combines createHold + authorizePayment in one call
   *
   * @param resource - Resource being purchased
   * @param authToken - JWT token from cedros-login
   * @param couponCode - Optional coupon code
   * @param metadata - Optional metadata
   */
  async processPayment(
    resource: string,
    authToken: string,
    couponCode?: string,
    metadata?: Record<string, string>
  ): Promise<PaymentResult> {
    try {
      // Step 1: Create hold
      const hold = await this.createHold({ resource, couponCode, authToken });

      // Step 2: Authorize payment
      const result = await this.authorizePayment({
        resource,
        holdId: hold.holdId,
        couponCode,
        authToken,
        metadata,
      });

      return {
        success: result.success,
        transactionId: result.transactionId,
        error: result.error,
      };
    } catch (error) {
      return {
        success: false,
        error: formatError(error, 'Credits payment failed'),
      };
    }
  }
}
