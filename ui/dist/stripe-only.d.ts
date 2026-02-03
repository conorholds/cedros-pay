/**
 * @cedros/pay-react/stripe-only
 *
 * Stripe-only build (no Solana dependencies)
 * Bundle size: ~75KB (vs ~950KB for full build)
 *
 * Use this entry point if you only need Stripe payments.
 *
 * @example
 * ```typescript
 * // In your package.json or import statement
 * import { CedrosProvider, StripeButton } from '@cedros/pay-react/stripe-only';
 * ```
 */
export { CedrosProvider, useCedrosContext, useCedrosTheme, type CedrosContextValue } from './context';
export { StripeButton } from './components/StripeButton';
export { PaymentModal } from './components/PaymentModal';
export type { PaymentModalProps } from './components/PaymentModal';
export { ProductPrice, PaymentMethodBadge } from './components/ProductPrice';
export type { PaymentMethod } from './components/ProductPrice';
export { useStripeCheckout } from './hooks/useStripeCheckout';
export { usePaymentMode } from './hooks/usePaymentMode';
export type { CedrosConfig, PaymentStatus, Currency, StripeSessionRequest, StripeSessionResponse, PaymentResult, PaymentMetadata, PaymentState, CedrosThemeMode, CedrosThemeTokens, Product, CartItem, PaymentErrorCode, PaymentError, ErrorResponse, } from './types';
export { ERROR_CATEGORIES } from './types/errors';
export type { IStripeManager } from './managers/StripeManager';
export type { IRouteDiscoveryManager } from './managers/RouteDiscoveryManager';
export { validateConfig, parseCouponCodes, formatCouponCodes, calculateDiscountPercentage, createRateLimiter, RATE_LIMITER_PRESETS, type RateLimiter, type RateLimiterConfig, } from './utils';
export { LogLevel, Logger, getLogger, createLogger, type LoggerConfig, } from './utils/logger';
export { CEDROS_EVENTS, emitPaymentStart, emitPaymentProcessing, emitPaymentSuccess, emitPaymentError, type PaymentStartDetail, type PaymentProcessingDetail, type PaymentSuccessDetail, type PaymentErrorDetail, } from './utils';
export { isRetryableError, getUserErrorMessage, } from './utils';
//# sourceMappingURL=stripe-only.d.ts.map