/**
 * Core types for Cedros Pay
 *
 * VERSIONING POLICY:
 * - Types are exported in versioned namespaces (v1, v2, etc.)
 * - Current version is always re-exported at top level for convenience
 * - Breaking changes require a new namespace version
 * - Older versions remain available for backward compatibility
 *
 * Example:
 *   import { X402Requirement } from '@cedros/pay-react'; // Current version (v1)
 *   import { v1 } from '@cedros/pay-react'; // Explicit v1
 *   import { v2 } from '@cedros/pay-react'; // Future version
 */

/**
 * Version 1 Types (Current)
 * Stable API - changes here require bumping to v2
 */
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace v1 {
  export type SolanaCluster = 'mainnet-beta' | 'devnet' | 'testnet';

  export type PaymentStatus = 'idle' | 'loading' | 'success' | 'error';

  export type Currency = 'USD' | 'EUR' | 'GBP';

  /**
   * Cart item for multi-item purchases
   * Used across multiple components for cart and checkout flows
   */
  export interface CartItem {
    resource: string;
    quantity?: number;
    metadata?: Record<string, string>;
  }

  /**
   * Configuration for the Cedros Pay provider
   */
  export interface CedrosConfig {
    stripePublicKey: string;
    serverUrl: string; // Required: your API server URL (e.g., "https://api.example.com")
    solanaCluster: SolanaCluster;
    tokenMint?: string; // Default: USDC
    solanaEndpoint?: string; // Optional custom RPC endpoint
    theme?: CedrosThemeMode;
    themeOverrides?: Partial<CedrosThemeTokens>;
    unstyled?: boolean; // Disable all default styles (for custom design systems)
    logLevel?: number; // Log level (LogLevel enum) - defaults to WARN in production, DEBUG in development
    /**
     * SAFETY: Allow unknown token mints (NOT RECOMMENDED)
     *
     * By default, CedrosPay validates token mints against known stablecoins (USDC, USDT, PYUSD, CASH).
     * Using an unrecognized token mint will throw an error to prevent sending funds to the wrong token.
     *
     * Set this to `true` ONLY if you are intentionally using a custom token, testnet token, or new stablecoin.
     *
     * ⚠️ WARNING: Typos in token mint addresses cause PERMANENT loss of funds.
     *
     * @default false
     */
    dangerouslyAllowUnknownMint?: boolean;
  }

  /**
   * x402 payment requirement (official spec)
   * From the accepts array in 402 response
   */
  export interface X402Requirement {
    scheme: string;                    // e.g., "solana-spl-transfer"
    network: string;                   // e.g., "mainnet-beta"
    maxAmountRequired: string;         // Atomic units as string (e.g., "1000000")
    resource: string;                  // Resource identifier
    description: string;               // Human-readable description
    mimeType: string;                  // Response content type
    payTo: string;                     // Recipient address (SPL token account)
    maxTimeoutSeconds: number;         // Quote expiration time
    asset: string;                     // Token mint address
    extra?: {                          // Solana-specific metadata
      recipientTokenAccount?: string;
      decimals?: number;
      tokenSymbol?: string;
      memo?: string;
      feePayer?: string;               // Server wallet public key (gasless mode only)
    };
  }

  export type CedrosThemeMode = 'light' | 'dark';

  export interface CedrosThemeTokens {
    // Surface/Container
    surfaceBackground: string;
    surfaceText: string;
    surfaceBorder: string;

    // Stripe Button
    stripeBackground: string;
    stripeText: string;
    stripeShadow: string;

    // Crypto Button
    cryptoBackground: string;
    cryptoText: string;
    cryptoShadow: string;

    // Status Colors
    errorBackground: string;
    errorBorder: string;
    errorText: string;
    successBackground: string;
    successBorder: string;
    successText: string;

    // Modal
    modalOverlay: string;
    modalBackground: string;
    modalBorder: string;

    // Button Styling
    buttonBorderRadius: string;
    buttonPadding: string;
    buttonFontSize: string;
    buttonFontWeight: string;
  }

  /**
   * Verification error details
   */
  export interface VerificationError {
    code: string;                      // Error code (e.g., "server_insufficient_funds", "insufficient_funds_token")
    message: string;                   // User-friendly error message
  }

  /**
   * x402 HTTP 402 response structure (official spec)
   */
  export interface X402Response {
    x402Version: number;               // Protocol version (always 0)
    error: string;                     // Error message (e.g., "payment required")
    accepts: X402Requirement[];        // Array of payment requirements
    verificationError?: VerificationError; // Present when payment verification fails
  }

  /**
   * x402 payment payload (official spec)
   * Sent in X-Payment header
   */
  export interface PaymentPayload {
    x402Version: number;               // Protocol version (always 0)
    scheme: string;                    // From requirement.scheme
    network: string;                   // From requirement.network
    payload: {                         // Scheme-specific data
      signature: string;               // Transaction signature
      transaction: string;             // Base64-encoded transaction
      payer?: string;                  // Wallet public key (optional)
      memo?: string;                   // Transaction memo (optional)
      recipientTokenAccount?: string;  // SPL token account (optional)
      metadata?: Record<string, unknown>; // Additional metadata (optional)
    };
  }

  /**
   * x402 settlement response (official spec)
   * Received in X-PAYMENT-RESPONSE header
   */
  export interface SettlementResponse {
    success: boolean;                  // Whether payment was successful
    error: string | null;              // Error message (null on success)
    txHash: string | null;             // Transaction signature (null on error)
    networkId: string | null;          // Network ID (null on error)
    metadata?: {                       // Optional metadata
      coupon_codes?: string;           // Comma-separated list of applied coupons (e.g., "SITE10,CRYPTO5AUTO,SAVE20")
      original_amount?: string;        // Original price before discounts
      discounted_amount?: string;      // Final price after all discounts
      [key: string]: string | undefined; // Additional metadata fields
    };
  }

  /**
   * Stripe session creation request
   * Matches backend createSessionRequest struct JSON tags (server.go:130-136)
   * Note: Backend uses camelCase JSON tags for HTTP API layer
   * The resource corresponds to a resource in the backend paywall config which
   * contains both Stripe (price_id, fiat_amount) and x402 (crypto_amount, token) info
   */
  export interface StripeSessionRequest {
    resource: string;             // Resource ID from paywall config
    customerEmail?: string;       // Customer email
    metadata?: Record<string, string>; // Additional metadata
    successUrl?: string;          // Success redirect URL
    cancelUrl?: string;           // Cancel redirect URL
    couponCode?: string;          // Optional coupon code
  }

  /**
   * Stripe session response from backend
   */
  export interface StripeSessionResponse {
    sessionId: string;
    url: string;
  }

  /**
   * Payment result for both flows
   */
  export interface PaymentResult {
    success: boolean;
    transactionId?: string;
    error?: string;
    settlement?: SettlementResponse;  // Only present for x402 crypto payments
  }

  /**
   * Payment metadata
   */
  export interface PaymentMetadata {
    resource: string;
    amount: number;
    currency?: Currency;
    metadata?: Record<string, unknown>;
  }

  /**
   * Payment state
   */
  export interface PaymentState {
    status: PaymentStatus;
    error: string | null;
    transactionId: string | null;
  }

  /**
   * Product from /paywall/v1/products endpoint
   * Includes payment-method-specific pricing and coupons
   */
  export interface Product {
    id: string;
    description: string;
    fiatAmount: number;
    fiatCurrency: string;
    cryptoAmount: number;
    cryptoToken: string;

    // Payment-method-specific pricing
    effectiveFiatAmount: number;      // Price after Stripe coupons
    effectiveCryptoAmount: number;    // Price after x402 coupons

    // Payment-method-specific coupons
    hasStripeCoupon: boolean;
    hasCryptoCoupon: boolean;
    stripeCouponCode: string;
    cryptoCouponCode: string;
    stripeDiscountPercent: number;
    cryptoDiscountPercent: number;

    // Credits pricing (when credits payment method is enabled)
    creditsAmount?: number;
    effectiveCreditsAmount?: number;
    hasCreditsDiscount?: boolean;
    creditsDiscountPercent?: number;
  }

  /**
   * Credits payment requirement
   * Returned in quote response when credits payment is available
   */
  export interface CreditsRequirement {
    /** Credits amount required (in cents/smallest currency unit) */
    amount: number;
    /** Currency for display (e.g., "USD") */
    currency: string;
    /** Human-readable description */
    description: string;
    /** Resource being purchased */
    resource: string;
  }

  /**
   * Credits payment payload for cart quotes
   */
  export interface CartCreditsQuote {
    /** Total credits amount for cart */
    amount: number;
    /** Currency for display */
    currency: string;
    /** Description of cart purchase */
    description: string;
  }

  /**
   * Extended quote response that includes credits option
   * Used by discovery endpoint and quote responses
   */
  export interface QuoteWithCredits {
    /** Resource identifier */
    resource: string;
    /** Quote expiration time (ISO 8601) */
    expiresAt: string;
    /** Stripe payment option (if available) */
    stripe?: {
      priceId: string;
      amountCents: number;
      currency: string;
    };
    /** x402 crypto payment option (if available) */
    crypto?: X402Requirement;
    /** Credits payment option (if available) */
    credits?: CreditsRequirement;
  }

  /**
   * Discovery response with available payment methods
   */
  export interface DiscoveryResponse {
    /** Available payment methods for this tenant */
    methods: Array<'stripe' | 'x402-solana-spl-transfer' | 'credits'>;
  }

  /**
   * Credits hold creation request
   * Used to create a hold on user's credits before authorization
   */
  export interface CreditsHoldRequest {
    /** Resource being purchased */
    resource: string;
    /** Amount to hold (in cents) */
    amount: number;
    /** Optional metadata */
    metadata?: Record<string, string>;
  }

  /**
   * Credits hold response
   */
  export interface CreditsHoldResponse {
    /** Unique hold ID for authorization */
    holdId: string;
    /** Whether this is a new hold (false if reusing existing) */
    isNew: boolean;
    /** Amount held in lamports (smallest currency unit) */
    amountLamports: number;
    /** Expiration time of the hold (ISO 8601) */
    expiresAt: string;
    /** Currency of the hold (e.g., "USD") */
    currency: string;
  }

  /**
   * Credits authorization request
   */
  export interface CreditsAuthorizeRequest {
    /** Hold ID from credits hold creation */
    creditsHoldId: string;
    /** Resource being purchased */
    resource: string;
    /** Optional metadata */
    metadata?: Record<string, string>;
  }

  /**
   * Credits payment result
   */
  export interface CreditsPaymentResult {
    /** Whether payment was successful */
    success: boolean;
    /** Transaction/authorization ID on success */
    transactionId?: string;
    /** Error message on failure */
    error?: string;
    /** Error code for programmatic handling */
    errorCode?: string;
  }
}

/**
 * Current stable version (v1)
 * Re-exported at top level for convenience
 */
export type SolanaCluster = v1.SolanaCluster;
export type PaymentStatus = v1.PaymentStatus;
export type Currency = v1.Currency;
export type CedrosThemeMode = v1.CedrosThemeMode;

export type CartItem = v1.CartItem;
export type CedrosConfig = v1.CedrosConfig;
export type X402Requirement = v1.X402Requirement;
export type CedrosThemeTokens = v1.CedrosThemeTokens;
export type VerificationError = v1.VerificationError;
export type X402Response = v1.X402Response;
export type PaymentPayload = v1.PaymentPayload;
export type SettlementResponse = v1.SettlementResponse;
export type StripeSessionRequest = v1.StripeSessionRequest;
export type StripeSessionResponse = v1.StripeSessionResponse;
export type PaymentResult = v1.PaymentResult;
export type PaymentMetadata = v1.PaymentMetadata;
export type PaymentState = v1.PaymentState;
export type Product = v1.Product;
export type CreditsRequirement = v1.CreditsRequirement;
export type CartCreditsQuote = v1.CartCreditsQuote;
export type QuoteWithCredits = v1.QuoteWithCredits;
export type DiscoveryResponse = v1.DiscoveryResponse;
export type CreditsHoldRequest = v1.CreditsHoldRequest;
export type CreditsHoldResponse = v1.CreditsHoldResponse;
export type CreditsAuthorizeRequest = v1.CreditsAuthorizeRequest;
export type CreditsPaymentResult = v1.CreditsPaymentResult;

// Error handling types
export { PaymentErrorCode, PaymentError, ERROR_CATEGORIES, type ErrorResponse } from './errors';

// Component options types (future-proof extensible pattern)
export type {
  PaymentMethod,
  FuturePaymentMethod,
  PaymentSuccessResult,
  PaymentErrorDetail,
  CheckoutOptions,
  DisplayOptions,
  ModalRenderProps,
  CallbackOptions,
  AdvancedOptions,
} from './componentOptions';

// Subscription types
export type {
  BillingInterval,
  SubscriptionStatus,
  SubscriptionSessionRequest,
  SubscriptionSessionResponse,
  SubscriptionStatusRequest,
  SubscriptionStatusResponse,
  SubscriptionQuote,
  SubscriptionState,
  SubscriptionPaymentResult,
  CancelSubscriptionRequest,
  CancelSubscriptionResponse,
  BillingPortalRequest,
  BillingPortalResponse,
  ActivateX402SubscriptionRequest,
  ActivateX402SubscriptionResponse,
  ProrationBehavior,
  ChangeSubscriptionRequest,
  ChangeSubscriptionResponse,
  ChangePreviewRequest,
  ChangePreviewResponse,
  SubscriptionDetails,
} from './subscription';
