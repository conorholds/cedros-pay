/**
 * @cedros/pay-react/stripe-only
 *
 * Stripe-only entry point — no Solana dependencies.
 * Excludes admin components (which require @solana/wallet-adapter-react)
 * and ecommerce namespace (admin-adjacent).
 *
 * @example
 * ```typescript
 * import { CedrosProvider, StripeButton } from '@cedros/pay-react/stripe-only';
 * ```
 */

// Components (Stripe-safe only — no admin dashboard)
export { CedrosPay } from './components/CedrosPay';
export { StripeButton } from './components/StripeButton';
export { CreditsButton } from './components/CreditsButton';
export { PurchaseButton } from './components/PurchaseButton';
export type { PurchaseButtonProps } from './components/PurchaseButton';
export { PaymentModal } from './components/PaymentModal';
export type { PaymentModalProps } from './components/PaymentModal';
export { ProductPrice, PaymentMethodBadge } from './components/ProductPrice';
export type { PaymentMethod } from './components/ProductPrice';
export { SubscribeButton } from './components/SubscribeButton';
export { CreditsSubscribeButton } from './components/CreditsSubscribeButton';
export { SubscriptionManagementPanel } from './components/SubscriptionManagementPanel';
export type {
  SubscriptionManagementPanelProps,
  AvailablePlan,
} from './components/SubscriptionManagementPanel';

// Context
export { CedrosProvider, useCedrosContext, useCedrosTheme, type CedrosContextValue } from './context';

// Hooks
export { useStripeCheckout } from './hooks/useStripeCheckout';
export { useCreditsPayment } from './hooks/useCreditsPayment';
export { usePaymentMode } from './hooks/usePaymentMode';
export { useSubscription } from './hooks/useSubscription';
export { useCreditsSubscription } from './hooks/useCreditsSubscription';
export { useSubscriptionManagement } from './hooks/useSubscriptionManagement';
export type {
  SubscriptionManagementState,
  ChangeOptions,
} from './hooks/useSubscriptionManagement';

// Types
export type {
  CedrosConfig,
  SolanaCluster,
  PaymentStatus,
  Currency,
  X402Requirement,
  X402Response,
  PaymentPayload,
  SettlementResponse,
  StripeSessionRequest,
  StripeSessionResponse,
  PaymentResult,
  PaymentMetadata,
  PaymentState,
  CedrosThemeMode,
  CedrosThemeTokens,
  Product,
  CartItem,
  PaymentErrorCode,
  PaymentError,
  ErrorResponse,
  CreditsRequirement,
  CartCreditsQuote,
  QuoteWithCredits,
  DiscoveryResponse,
  CreditsHoldRequest,
  CreditsHoldResponse,
  CreditsAuthorizeRequest,
  CreditsPaymentResult,
  FuturePaymentMethod,
  PaymentSuccessResult,
  PaymentErrorDetail as PaymentErrorInfo,
  CheckoutOptions,
  DisplayOptions,
  ModalRenderProps,
  CallbackOptions,
  AdvancedOptions,
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
} from './types';

// Error code categories
export { ERROR_CATEGORIES } from './types/errors';

// Manager Interfaces
export type { IStripeManager } from './managers/StripeManager';
export type { IX402Manager } from './managers/X402Manager';
export type { ISubscriptionManager, SubscriptionQuoteOptions } from './managers/SubscriptionManager';
export type { ISubscriptionChangeManager } from './managers/SubscriptionChangeManager';
export type { ICreditsManager } from './managers/CreditsManager';
export type { IRouteDiscoveryManager } from './managers/RouteDiscoveryManager';

// Utils
export {
  validateConfig,
  parseCouponCodes,
  formatCouponCodes,
  calculateDiscountPercentage,
  stackCheckoutCoupons,
  type Coupon,
  createRateLimiter,
  RATE_LIMITER_PRESETS,
  type RateLimiter,
  type RateLimiterConfig,
  createCircuitBreaker,
  CircuitState,
  CircuitBreakerOpenError,
  CIRCUIT_BREAKER_PRESETS,
  type CircuitBreaker,
  type CircuitBreakerConfig,
  type CircuitBreakerStats,
  retryWithBackoff,
  RETRY_PRESETS,
  type RetryConfig,
  type RetryStats,
  generateCSP,
  generateCSPDirectives,
  formatCSP,
  RPC_PROVIDERS,
  CSP_PRESETS,
  type CSPConfig,
  type CSPDirectives,
  type CSPFormat,
} from './utils';

// Logging
export {
  LogLevel,
  Logger,
  getLogger,
  createLogger,
  type LoggerConfig,
} from './utils/logger';

// Event System
export {
  CEDROS_EVENTS,
  emitPaymentStart,
  emitWalletConnect,
  emitWalletConnected,
  emitWalletError,
  emitPaymentProcessing,
  emitPaymentSuccess,
  emitPaymentError,
  type PaymentStartDetail,
  type WalletConnectDetail,
  type WalletErrorDetail,
  type PaymentProcessingDetail,
  type PaymentSuccessDetail,
  type PaymentErrorDetail,
  type WalletProvider,
} from './utils';

// Error Handling
export {
  isRetryableError,
  getUserErrorMessage,
} from './utils';

// Security Validation
export {
  validateSecurity,
  logSecurityReport,
  SECURITY_RECOMMENDATIONS,
  type SecurityCheckResult,
  type SecurityReport,
} from './utils/securityValidation';

// Internationalization (i18n)
export {
  detectLocale,
  loadLocale,
  getAvailableLocales,
  createTranslator,
  getLocalizedError,
  type Translations,
  type Locale,
  type TranslateFn,
} from './i18n';
export {
  useTranslation,
  useLocalizedError,
  type UseTranslationResult,
} from './i18n/useTranslation';

// Styles
import './styles.css';
