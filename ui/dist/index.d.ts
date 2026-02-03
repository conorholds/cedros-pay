/**
 * @cedros/pay-react - Unified Stripe and Solana payments for React
 *
 * Main library exports
 */
export { CedrosPay } from './components/CedrosPay';
export { CedrosPayAdminDashboard, type CedrosPayAdminDashboardProps, type DashboardSection, } from './components/admin';
export { cedrosPayPlugin, type AdminPlugin, type AdminSectionConfig, type AdminGroupConfig, type AdminSectionProps, type HostContext, type PluginContext, } from './admin';
export { StripeButton } from './components/StripeButton';
export { CryptoButton } from './components/CryptoButton';
export { CreditsButton } from './components/CreditsButton';
export { PurchaseButton } from './components/PurchaseButton';
export type { PurchaseButtonProps } from './components/PurchaseButton';
export { PaymentModal } from './components/PaymentModal';
export type { PaymentModalProps } from './components/PaymentModal';
export { ProductPrice, PaymentMethodBadge } from './components/ProductPrice';
export type { PaymentMethod } from './components/ProductPrice';
export { SubscribeButton } from './components/SubscribeButton';
export { CryptoSubscribeButton } from './components/CryptoSubscribeButton';
export { CreditsSubscribeButton } from './components/CreditsSubscribeButton';
export { SubscriptionManagementPanel } from './components/SubscriptionManagementPanel';
export type { SubscriptionManagementPanelProps, AvailablePlan, } from './components/SubscriptionManagementPanel';
export { CedrosProvider, useCedrosContext, useCedrosTheme, type CedrosContextValue } from './context';
export { useStripeCheckout } from './hooks/useStripeCheckout';
export { useX402Payment } from './hooks/useX402Payment';
export { useCreditsPayment } from './hooks/useCreditsPayment';
export { useRefundVerification } from './hooks/useRefundVerification';
export { usePaymentMode } from './hooks/usePaymentMode';
export { useSubscription } from './hooks/useSubscription';
export { useCryptoSubscription } from './hooks/useCryptoSubscription';
export { useCreditsSubscription } from './hooks/useCreditsSubscription';
export { useSubscriptionManagement } from './hooks/useSubscriptionManagement';
export type { SubscriptionManagementState, ChangeOptions, } from './hooks/useSubscriptionManagement';
export type { CedrosConfig, SolanaCluster, PaymentStatus, Currency, X402Requirement, X402Response, PaymentPayload, SettlementResponse, StripeSessionRequest, StripeSessionResponse, PaymentResult, PaymentMetadata, PaymentState, CedrosThemeMode, CedrosThemeTokens, Product, CartItem, PaymentErrorCode, PaymentError, ErrorResponse, CreditsRequirement, CartCreditsQuote, QuoteWithCredits, DiscoveryResponse, CreditsHoldRequest, CreditsHoldResponse, CreditsAuthorizeRequest, CreditsPaymentResult, FuturePaymentMethod, PaymentSuccessResult, PaymentErrorDetail as PaymentErrorInfo, CheckoutOptions, DisplayOptions, ModalRenderProps, CallbackOptions, AdvancedOptions, BillingInterval, SubscriptionStatus, SubscriptionSessionRequest, SubscriptionSessionResponse, SubscriptionStatusRequest, SubscriptionStatusResponse, SubscriptionQuote, SubscriptionState, SubscriptionPaymentResult, CancelSubscriptionRequest, CancelSubscriptionResponse, BillingPortalRequest, BillingPortalResponse, ActivateX402SubscriptionRequest, ActivateX402SubscriptionResponse, ProrationBehavior, ChangeSubscriptionRequest, ChangeSubscriptionResponse, ChangePreviewRequest, ChangePreviewResponse, SubscriptionDetails, } from './types';
export { ERROR_CATEGORIES } from './types/errors';
export type { IStripeManager } from './managers/StripeManager';
export type { IX402Manager } from './managers/X402Manager';
export type { IWalletManager } from './managers/WalletManager';
export type { ISubscriptionManager, SubscriptionQuoteOptions } from './managers/SubscriptionManager';
export type { ISubscriptionChangeManager } from './managers/SubscriptionChangeManager';
export type { ICreditsManager } from './managers/CreditsManager';
export type { IRouteDiscoveryManager } from './managers/RouteDiscoveryManager';
export { validateConfig, parseCouponCodes, formatCouponCodes, calculateDiscountPercentage, stackCheckoutCoupons, type Coupon, createRateLimiter, RATE_LIMITER_PRESETS, type RateLimiter, type RateLimiterConfig, createCircuitBreaker, CircuitState, CircuitBreakerOpenError, CIRCUIT_BREAKER_PRESETS, type CircuitBreaker, type CircuitBreakerConfig, type CircuitBreakerStats, retryWithBackoff, RETRY_PRESETS, type RetryConfig, type RetryStats, createWalletPool, WalletPool, generateCSP, generateCSPDirectives, formatCSP, RPC_PROVIDERS, CSP_PRESETS, type CSPConfig, type CSPDirectives, type CSPFormat, } from './utils';
export { LogLevel, Logger, getLogger, createLogger, type LoggerConfig, } from './utils/logger';
export { CEDROS_EVENTS, emitPaymentStart, emitWalletConnect, emitWalletConnected, emitWalletError, emitPaymentProcessing, emitPaymentSuccess, emitPaymentError, type PaymentStartDetail, type WalletConnectDetail, type WalletErrorDetail, type PaymentProcessingDetail, type PaymentSuccessDetail, type PaymentErrorDetail, type WalletProvider, } from './utils';
export { isRetryableError, getUserErrorMessage, } from './utils';
export { validateSecurity, logSecurityReport, SECURITY_RECOMMENDATIONS, type SecurityCheckResult, type SecurityReport, } from './utils/securityValidation';
export { detectLocale, loadLocale, getAvailableLocales, createTranslator, getLocalizedError, type Translations, type Locale, type TranslateFn, } from './i18n';
export { useTranslation, useLocalizedError, type UseTranslationResult, } from './i18n/useTranslation';
export * as ecommerce from './ecommerce';
//# sourceMappingURL=index.d.ts.map