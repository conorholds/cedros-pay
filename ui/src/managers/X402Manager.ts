import { Base64 } from "js-base64";
import { generateUUID } from "../utils/uuid";
import type {
  X402Requirement,
  PaymentResult,
  PaymentPayload,
  SettlementResponse,
} from "../types";
import { RouteDiscoveryManager } from "./RouteDiscoveryManager";
import { getLogger } from "../utils/logger";
import { formatError, parseErrorResponse } from "../utils/errorHandling";
import { fetchWithTimeout } from "../utils/fetchWithTimeout";
import type { NormalizedCartItem } from "../utils/cartHelpers";
import { createRateLimiter, RATE_LIMITER_PRESETS } from "../utils/rateLimiter";
import { createCircuitBreaker, CircuitBreakerOpenError } from "../utils/circuitBreaker";
import { retryWithBackoff, RETRY_PRESETS } from "../utils/exponentialBackoff";

/**
 * Options for requesting a payment quote
 */
export interface RequestQuoteOptions {
  resource: string;
  couponCode?: string;
}

/**
 * Options for requesting a cart quote
 */
export interface RequestCartQuoteOptions {
  items: NormalizedCartItem[];
  metadata?: Record<string, string>;
  couponCode?: string;
}

/**
 * Options for submitting a payment
 */
export interface SubmitPaymentOptions {
  resource: string;
  payload: PaymentPayload;
  couponCode?: string;
  metadata?: Record<string, string>;
  resourceType?: "regular" | "cart" | "refund";
}

/**
 * Options for building a gasless transaction
 */
export interface BuildGaslessTransactionOptions {
  resourceId: string;
  userWallet: string;
  feePayer?: string;
  couponCode?: string;
}

/**
 * Options for submitting a gasless transaction
 */
export interface SubmitGaslessTransactionOptions {
  resource: string;
  partialTx: string;
  couponCode?: string;
  metadata?: Record<string, string>;
  resourceType?: "regular" | "cart" | "refund";
  requirement?: X402Requirement;
}

/**
 * Public interface for x402 payment protocol management.
 *
 * Use this interface for type annotations instead of the concrete X402Manager class.
 */
export interface IX402Manager {
  /**
   * Request a payment quote for a single resource
   */
  requestQuote(options: RequestQuoteOptions): Promise<X402Requirement>;

  /**
   * Request a cart quote for multiple items
   */
  requestCartQuote(
    options: RequestCartQuoteOptions
  ): Promise<{ cartId: string; quote: X402Requirement }>;

  /**
   * Build X-PAYMENT header from payment payload
   */
  buildPaymentHeader(payload: PaymentPayload): string;

  /**
   * Parse X-PAYMENT-RESPONSE header
   */
  parseSettlementResponse(response: Response): SettlementResponse | null;

  /**
   * Submit payment with signed transaction
   */
  submitPayment(options: SubmitPaymentOptions): Promise<PaymentResult>;

  /**
   * Build a gasless transaction (server pays fees)
   */
  buildGaslessTransaction(
    options: BuildGaslessTransactionOptions
  ): Promise<{ transaction: string; blockhash: string; feePayer: string }>;

  /**
   * Submit gasless partial transaction for co-signing
   */
  submitGaslessTransaction(
    options: SubmitGaslessTransactionOptions
  ): Promise<PaymentResult>;

  /**
   * Validate x402 requirement structure
   */
  validateRequirement(req: X402Requirement): boolean;
}

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
export class X402Manager implements IX402Manager {
  private readonly routeDiscovery: RouteDiscoveryManager;
  private readonly quoteRateLimiter = createRateLimiter(RATE_LIMITER_PRESETS.QUOTE);
  private readonly verifyRateLimiter = createRateLimiter(RATE_LIMITER_PRESETS.PAYMENT);
  private readonly circuitBreaker = createCircuitBreaker({
    failureThreshold: 5,
    timeout: 10000, // 10 seconds for faster recovery in payment flows
    name: 'x402-manager',
  });

  constructor(routeDiscovery: RouteDiscoveryManager) {
    this.routeDiscovery = routeDiscovery;
  }

  /**
   * Request a protected resource and get x402 requirement
   * SECURITY: Resource ID and coupon codes sent in request body to prevent leakage
   * Prevents exposure of product IDs, SKUs, and business-sensitive identifiers in logs
   */
  async requestQuote(
    options: RequestQuoteOptions
  ): Promise<X402Requirement> {
    const { resource, couponCode } = options;

    // Rate limiting check
    if (!this.quoteRateLimiter.tryConsume()) {
      throw new Error('Rate limit exceeded for quote requests. Please try again later.');
    }

    // Circuit breaker + retry logic
    try {
      return await this.circuitBreaker.execute(async () => {
        return await retryWithBackoff(
          async () => {
            const urlPath = `/paywall/v1/quote`;
            getLogger().debug(
              "[X402Manager] Requesting quote",
              couponCode ? "with coupon" : "without coupon"
            );

            const url = await this.routeDiscovery.buildUrl(urlPath);

            // SECURITY: Use generic endpoint with resource in body
            // Prevents resource IDs from leaking in URL logs, Referer headers, and browser history
            const response = await fetchWithTimeout(url, {
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

            // Support both Rust (new) and Go (legacy) response formats
            // Rust format: { crypto: X402Requirement, stripe?: {...}, credits?: {...} }
            // Go format: { accepts: X402Requirement[] }
            if (data.crypto) {
              // New Rust server format
              const requirement = data.crypto as X402Requirement;
              if (!this.validateRequirement(requirement)) {
                throw new Error('Invalid x402 requirement received from server: missing required fields');
              }
              return requirement;
            } else if (data.accepts && data.accepts.length > 0) {
              // Legacy Go server format (backwards compatibility)
              const requirement = data.accepts[0] as X402Requirement;
              if (!this.validateRequirement(requirement)) {
                throw new Error('Invalid x402 requirement received from server: missing required fields');
              }
              return requirement;
            } else {
              throw new Error("Invalid x402 response: missing crypto or accepts field");
            }
          },
          { ...RETRY_PRESETS.QUICK, name: 'x402-quote' }
        );
      });
    } catch (error) {
      if (error instanceof CircuitBreakerOpenError) {
        getLogger().error('[X402Manager] Circuit breaker is OPEN - x402 service unavailable');
        throw new Error('Payment service is temporarily unavailable. Please try again in a few moments.');
      }
      throw error;
    }
  }

  /**
   * Request a cart quote for multiple items
   */
  async requestCartQuote(
    options: RequestCartQuoteOptions
  ): Promise<{ cartId: string; quote: X402Requirement }> {
    const { items, metadata, couponCode } = options;

    // Rate limiting check
    if (!this.quoteRateLimiter.tryConsume()) {
      throw new Error('Rate limit exceeded for cart quote requests. Please try again later.');
    }

    // Circuit breaker + retry logic
    const idempotencyKey = generateUUID();
    try {
      return await this.circuitBreaker.execute(async () => {
        return await retryWithBackoff(
          async () => {
            const url = await this.routeDiscovery.buildUrl("/paywall/v1/cart/quote");
            // Rust server uses 'coupon', Go server used 'couponCode'
            // Send both for backwards compatibility during migration
            const cartRequest = {
              items,
              metadata,
              coupon: couponCode,      // New Rust server field
              couponCode,              // Legacy Go server field (backwards compat)
            };

            const response = await fetchWithTimeout(url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Idempotency-Key": idempotencyKey,
              },
              body: JSON.stringify(cartRequest),
            });

            // 402 is the SUCCESS response for x402 protocol (contains payment quote)
            if (response.status !== 402 && !response.ok) {
              const errorMessage = await parseErrorResponse(response, "Failed to get cart quote");
              throw new Error(errorMessage);
            }

            const data = await response.json();
            if (!data.cartId || !data.quote) {
              throw new Error('Invalid cart quote response: missing cartId or quote');
            }
            if (data.quote.crypto && !this.validateRequirement(data.quote.crypto)) {
              throw new Error('Invalid x402 cart quote: missing required fields in crypto quote');
            }
            return data;
          },
          { ...RETRY_PRESETS.QUICK, name: 'x402-cart-quote' }
        );
      });
    } catch (error) {
      if (error instanceof CircuitBreakerOpenError) {
        getLogger().error('[X402Manager] Circuit breaker is OPEN - cart quote service unavailable');
        throw new Error('Payment service is temporarily unavailable. Please try again in a few moments.');
      }
      throw error;
    }
  }

  /**
   * Build X-PAYMENT header from payment payload (base64 encoded)
   */
  buildPaymentHeader(payload: PaymentPayload): string {
    const jsonString = JSON.stringify(payload);
    return Base64.encode(jsonString);
  }

  /**
   * Parse X-PAYMENT-RESPONSE header (base64 encoded settlement response)
   */
  parseSettlementResponse(response: Response): SettlementResponse | null {
    const settlementHeader = response.headers.get("X-PAYMENT-RESPONSE");

    if (!settlementHeader) {
      return null; // No settlement (e.g., Stripe payment)
    }

    try {
      const settlementJson = Base64.decode(settlementHeader);
      const settlement: SettlementResponse = JSON.parse(settlementJson);

      // Validate settlement structure
      if (typeof settlement.success !== "boolean") {
        getLogger().error("Invalid settlement response: missing success field");
        return null;
      }

      return settlement;
    } catch (error) {
      getLogger().error("Failed to parse settlement response:", error);
      return null;
    }
  }

  /**
   * Retry request with payment proof
   * SECURITY: Coupon and metadata sent in X-PAYMENT header payload, NOT query strings
   */
  async submitPayment(
    options: SubmitPaymentOptions
  ): Promise<PaymentResult> {
    const {
      resource,
      payload,
      couponCode,
      metadata,
      resourceType = "regular",
    } = options;

    // Rate limiting check
    if (!this.verifyRateLimiter.tryConsume()) {
      return {
        success: false,
        error: 'Rate limit exceeded for payment verification. Please try again later.',
      };
    }

    const submitIdempotencyKey = generateUUID();
    try {
      const result = await this.circuitBreaker.execute(async () => {
        return await retryWithBackoff(
          async () => {
            // SECURITY FIX: Include coupon, metadata, and resource in the payment payload
            // This prevents leakage through URL query strings in logs, Referer headers, etc.
            // BACKWARD COMPATIBILITY: Preserve any existing metadata from the payload
            const enhancedPayloadWithResource = {
              ...payload,
              payload: {
                ...payload.payload,
                resource,
                resourceType,
                metadata: {
                  ...(payload.payload.metadata || {}),  // Preserve existing metadata
                  ...(metadata || {}),                   // Layer in new metadata
                  ...(couponCode ? { couponCode } : {}), // Add coupon if present
                },
              },
            };

            const paymentHeader = this.buildPaymentHeader(enhancedPayloadWithResource);

            // SECURITY: Use generic endpoint - resource ID now in X-PAYMENT header
            const urlPath = `/paywall/v1/verify`;

            getLogger().debug("[X402Manager] Submitting payment", {
              resourceType,
              hasCoupon: !!couponCode,
              hasMetadata: !!metadata,
            });

            const url = await this.routeDiscovery.buildUrl(urlPath);
            const response = await fetchWithTimeout(url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-PAYMENT": paymentHeader,
                "Idempotency-Key": submitIdempotencyKey,
              },
            });

            if (response.ok) {
              // Payment verified, resource unlocked
              const { settlement, transactionId } = await this.handlePaymentVerification(
                response,
                payload.payload.signature
              );

              return {
                success: true,
                transactionId,
                settlement: settlement || undefined,
              };
            }

            // Backend returns JSON with user-friendly error messages
            const errorMessage = await parseErrorResponse(response, "Payment verification failed", true);

            return {
              success: false,
              error: errorMessage,
            };
          },
          { maxRetries: 0, initialDelayMs: 0, backoffFactor: 1, maxDelayMs: 0, name: 'x402-verify' }
        );
      });

      return result;
    } catch (error) {
      if (error instanceof CircuitBreakerOpenError) {
        return {
          success: false,
          error: 'Payment verification service is temporarily unavailable. Please try again in a few moments.',
        };
      }
      return {
        success: false,
        error: formatError(error, "Unknown error"),
      };
    }
  }

  /**
   * Build a complete gasless transaction on the backend
   * Returns an unsigned transaction with all instructions (compute budget, transfer, memo)
   */
  async buildGaslessTransaction(
    options: BuildGaslessTransactionOptions
  ): Promise<{ transaction: string; blockhash: string; feePayer: string }> {
    const { resourceId, userWallet, feePayer, couponCode } = options;

    // Rate limiting check
    if (!this.quoteRateLimiter.tryConsume()) {
      throw new Error('Rate limit exceeded for gasless transaction requests. Please try again later.');
    }

    // Circuit breaker + retry logic
    try {
      return await this.circuitBreaker.execute(async () => {
        return await retryWithBackoff(
          async () => {
            const url = await this.routeDiscovery.buildUrl(
              "/paywall/v1/gasless-transaction"
            );
            const response = await fetchWithTimeout(url, {
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
              const errorMessage = await parseErrorResponse(response, "Failed to build gasless transaction");
              throw new Error(errorMessage);
            }

            return await response.json();
          },
          { ...RETRY_PRESETS.QUICK, name: 'x402-gasless-build' }
        );
      });
    } catch (error) {
      if (error instanceof CircuitBreakerOpenError) {
        getLogger().error('[X402Manager] Circuit breaker is OPEN - gasless transaction service unavailable');
        throw new Error('Gasless transaction service is temporarily unavailable. Please try again in a few moments.');
      }
      throw error;
    }
  }

  /**
   * Submit gasless partial transaction for co-signing
   * Sends the partially-signed transaction in X-Payment header for backend co-signing
   * SECURITY: Coupon and metadata sent in X-PAYMENT header payload, NOT query strings
   */
  async submitGaslessTransaction(
    options: SubmitGaslessTransactionOptions
  ): Promise<PaymentResult> {
    const {
      resource,
      partialTx,
      couponCode,
      metadata,
      resourceType = "regular",
      requirement,
    } = options;

    // Rate limiting check
    if (!this.verifyRateLimiter.tryConsume()) {
      return {
        success: false,
        error: 'Rate limit exceeded for gasless transaction verification. Please try again later.',
      };
    }

    const gaslessIdempotencyKey = generateUUID();
    try {
      const result = await this.circuitBreaker.execute(async () => {
        return await retryWithBackoff(
          async () => {
            // Build proper x402 payment payload structure
            // For gasless transactions, signature field is placeholder since backend co-signs
            // SECURITY FIX: Include coupon, metadata, resource, and resourceType in payload
            const paymentPayload = {
              x402Version: 0,
              scheme: requirement?.scheme || "solana-spl-transfer",
              network: requirement?.network || "mainnet-beta",
              payload: {
                signature: "", // Placeholder - backend will finalize after co-signing
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

            // SECURITY: Use generic endpoint - resource ID now in X-PAYMENT header
            const urlPath = `/paywall/v1/verify`;
            const url = await this.routeDiscovery.buildUrl(urlPath);
            const response = await fetchWithTimeout(url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-PAYMENT": paymentHeader,
                "Idempotency-Key": gaslessIdempotencyKey,
              },
            });

            if (response.ok) {
              // Payment verified, resource unlocked
              const { settlement, transactionId } = await this.handlePaymentVerification(
                response,
                "gasless-tx"
              );

              return {
                success: true,
                transactionId,
                settlement: settlement || undefined,
              };
            }

            // Backend returns JSON with user-friendly error messages
            const errorMessage = await parseErrorResponse(response, "Gasless transaction failed", true);

            return {
              success: false,
              error: errorMessage,
            };
          },
          { maxRetries: 0, initialDelayMs: 0, backoffFactor: 1, maxDelayMs: 0, name: 'x402-gasless-verify' }
        );
      });

      return result;
    } catch (error) {
      if (error instanceof CircuitBreakerOpenError) {
        return {
          success: false,
          error: 'Gasless transaction verification service is temporarily unavailable. Please try again in a few moments.',
        };
      }
      return {
        success: false,
        error: formatError(error, "Unknown error"),
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
  private async handlePaymentVerification(
    response: Response,
    defaultTxId: string
  ): Promise<{ settlement: SettlementResponse | null; transactionId: string }> {
    // CRITICAL: Parse settlement header FIRST before touching the body
    // The x402 spec allows ANY content type (HTML, binary, etc.), not just JSON
    const settlement = this.parseSettlementResponse(response);

    // Only attempt to parse body as JSON if Content-Type indicates JSON
    const contentType = response.headers.get("Content-Type") || "";
    let transactionId = defaultTxId;

    if (contentType.includes("application/json")) {
      try {
        const data = await response.json();
        transactionId = data.signature || defaultTxId;
      } catch (error) {
        // Log but don't fail - settlement header is what matters for payment success
        getLogger().warn("Failed to parse JSON response body:", error);
      }
    }
    // For non-JSON responses, we simply don't read the body
    // The settlement header already confirms the payment succeeded

    return { settlement, transactionId };
  }

  /**
   * Validate x402 requirement structure
   */
  validateRequirement(req: X402Requirement): boolean {
    return !!(
      req.scheme &&
      req.network &&
      req.maxAmountRequired &&
      req.resource &&
      req.payTo &&
      req.asset &&
      req.maxTimeoutSeconds > 0
    );
  }
}
