/**
 * Future-Proof Component Options
 *
 * Extensible options pattern to prevent breaking changes when adding:
 * - Subscriptions (billingInterval, trialDays, etc.)
 * - Multi-currency (currency, preferredCurrency)
 * - New payment methods (ACH, SEPA, etc.)
 * - Address collection (shipping, billing)
 * - Custom fields and validation
 *
 * Design: Grouped options by responsibility (checkout, display, callbacks, advanced)
 * Benefit: Future features add fields to existing groups without breaking API
 */

import type { CartItem } from './index';

/**
 * Structural type matching @solana/wallet-adapter-base WalletAdapter.
 * Using a local interface avoids a runtime import of @solana/wallet-adapter-base
 * which Metro may resolve even for type-only imports.
 */
export interface WalletAdapterLike {
  name: string;
  connected: boolean;
  publicKey: { toBase58(): string } | null;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

/**
 * Payment method types (extensible)
 */
export type PaymentMethod = 'stripe' | 'crypto' | 'credits';

/**
 * Future payment methods (for type-safe extensibility)
 */
export type FuturePaymentMethod = PaymentMethod | 'credits' | 'ach' | 'sepa' | 'bank-transfer';

/**
 * Payment success result (extensible for future data)
 */
export interface PaymentSuccessResult {
  transactionId: string;
  method: PaymentMethod;
  timestamp?: number;
  // FUTURE: settlement details, receipt URL, etc.
}

/**
 * Payment error (extensible for future error details)
 */
export interface PaymentErrorDetail {
  message: string;
  code?: string;
  method?: PaymentMethod;
  // FUTURE: retry suggestions, support links, etc.
}

/**
 * Checkout-related options
 * Handles customer info, coupons, redirects, and FUTURE: subscriptions, currency
 */
export interface CheckoutOptions {
  /** Customer email for receipts and Stripe checkout */
  customerEmail?: string;

  /** Coupon code for discounts (works with both Stripe and x402) */
  couponCode?: string;

  /** Stripe redirect URL on successful payment */
  successUrl?: string;

  /** Stripe redirect URL on cancelled payment */
  cancelUrl?: string;

  /** Metadata for tracking (e.g., userId, sessionId, orderId) */
  metadata?: Record<string, string>;

  /** JWT token from cedros-login for credits payment authentication */
  authToken?: string;

  // FUTURE: Subscription support (no breaking changes)
  // billing?: {
  //   interval?: 'monthly' | 'yearly' | 'weekly';
  //   trialDays?: number;
  //   cancelAtPeriodEnd?: boolean;
  // };

  // FUTURE: Multi-currency support (no breaking changes)
  // currency?: Currency;
  // preferredCurrency?: Currency;

  // FUTURE: Address collection (no breaking changes)
  // collectShipping?: boolean;
  // collectBilling?: boolean;
  // collectPhone?: boolean;
}

/**
 * Display/UI-related options
 * Handles labels, visibility, layout, and FUTURE: payment method selection
 */
export interface DisplayOptions {
  /** Label for card payment button */
  cardLabel?: string;

  /** Label for crypto payment button */
  cryptoLabel?: string;

  /** Label for unified purchase button */
  purchaseLabel?: string;

  /** Show card payment option */
  showCard?: boolean;

  /** Show crypto payment option */
  showCrypto?: boolean;

  /** Label for credits payment button */
  creditsLabel?: string;

  /** Show credits payment option (requires credits to be enabled on backend) */
  showCredits?: boolean;

  /** Show unified purchase button instead of separate buttons */
  showPurchaseButton?: boolean;

  /** Layout direction for dual payment buttons */
  layout?: 'vertical' | 'horizontal';

  /** Hide inline success/error messages */
  hideMessages?: boolean;

  /** Custom CSS class name */
  className?: string;

  /**
   * Custom modal renderer for purchase button
   * Note: Uses simplified callback signatures (string-based) for internal consistency with PurchaseButton
   */
  renderModal?: (props: {
    isOpen: boolean;
    onClose: () => void;
    resource?: string;
    items?: CartItem[];
    cardLabel?: string;
    cryptoLabel?: string;
    creditsLabel?: string;
    showCard?: boolean;
    showCrypto?: boolean;
    showCredits?: boolean;
    onPaymentAttempt?: (method: PaymentMethod | 'credits') => void;
    onPaymentSuccess?: (txId: string) => void;
    onPaymentError?: (error: string) => void;
    customerEmail?: string;
    successUrl?: string;
    cancelUrl?: string;
    metadata?: Record<string, string>;
    couponCode?: string;
    testPageUrl?: string;
    hideMessages?: boolean;
  }) => React.ReactNode;

  // FUTURE: Payment method selection (no breaking changes)
  // allowedMethods?: FuturePaymentMethod[];

  // FUTURE: Custom branding (no breaking changes)
  // logo?: string;
  // brandColor?: string;
}

/**
 * Props passed to custom modal renderer
 */
export interface ModalRenderProps {
  isOpen: boolean;
  onClose: () => void;
  resource?: string;
  items?: CartItem[];
  cardLabel?: string;
  cryptoLabel?: string;
  creditsLabel?: string;
  showCard?: boolean;
  showCrypto?: boolean;
  showCredits?: boolean;
  onPaymentAttempt?: (method: PaymentMethod | 'credits') => void;
  onPaymentSuccess?: (result: PaymentSuccessResult) => void;
  onPaymentError?: (error: PaymentErrorDetail) => void;
  customerEmail?: string;
  successUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, string>;
  couponCode?: string;
  testPageUrl?: string;
  hideMessages?: boolean;
}

/**
 * Callback/event handler options
 * Handles payment lifecycle events, and FUTURE: checkout lifecycle hooks
 */
export interface CallbackOptions {
  /** Called when user initiates payment (for analytics) */
  onPaymentAttempt?: (method: PaymentMethod) => void;

  /** Called on successful payment */
  onPaymentSuccess?: (result: PaymentSuccessResult) => void;

  /** Called on payment error */
  onPaymentError?: (error: PaymentErrorDetail) => void;
}

/**
 * Advanced/power-user options
 * Handles wallet config, testing, and FUTURE: custom validation, fee calculation
 */
export interface AdvancedOptions {
  /** Custom wallet adapters (overrides default pool) */
  wallets?: WalletAdapterLike[];

  /** Auto-detect wallets and skip modal if none found */
  autoDetectWallets?: boolean;

  /** URL to open for crypto testing (e.g., Storybook test page) */
  testPageUrl?: string;

  // FUTURE: Custom validation (no breaking changes)
  // validateBeforeSubmit?: (data: unknown) => Promise<boolean>;

  // FUTURE: Custom fee calculation (no breaking changes)
  // calculateFees?: (amount: number) => number;

  // FUTURE: Custom RPC endpoint per-component (no breaking changes)
  // solanaEndpoint?: string;
}
