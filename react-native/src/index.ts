/**
 * @cedros/pay-react-native - Unified Stripe and Solana payments for React Native
 *
 * Main library exports - NO ADMIN functionality
 */

// Components
export {
  StripeButton,
  CryptoButton,
  CreditsButton,
  PurchaseButton,
  SubscribeButton,
  CryptoSubscribeButton,
  CreditsSubscribeButton,
  SubscriptionManagementPanel,
  PaymentModal,
  ProductPrice,
  CedrosPay,
} from './components';

export type {
  PurchaseButtonProps,
  PaymentModalProps,
  ProductPriceProps,
  PaymentMethodBadgeProps,
  SubscriptionManagementPanelProps,
  AvailablePlan,
  CedrosPayProps,
} from './components';

// Context
export {
  CedrosProvider,
  useCedrosContext,
  useCedrosTheme,
  type CedrosContextValue,
} from './context';

// Hooks
export { useStripeCheckout } from './hooks/useStripeCheckout';
export { useX402Payment } from './hooks/useX402Payment';
export { useCreditsPayment } from './hooks/useCreditsPayment';
export { useRefundVerification } from './hooks/useRefundVerification';
export { usePaymentMode } from './hooks/usePaymentMode';
export { useSubscription } from './hooks/useSubscription';
export { useCryptoSubscription } from './hooks/useCryptoSubscription';
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
  CheckoutOptions,
  DisplayOptions,
  ModalRenderProps,
  CallbackOptions,
  AdvancedOptions,
  PaymentMethod,
  SubscriptionStatus,
  BillingInterval,
  SubscriptionSessionRequest,
  SubscriptionSessionResponse,
  SubscriptionStatusRequest,
  SubscriptionStatusResponse,
  SubscriptionQuote,
  SubscriptionState,
  SubscriptionPaymentResult,
  ProrationBehavior,
  BillingPortalRequest,
  BillingPortalResponse,
  SubscriptionDetails,
  CancelSubscriptionRequest,
  CancelSubscriptionResponse,
  ActivateX402SubscriptionRequest,
  ActivateX402SubscriptionResponse,
  ChangeSubscriptionRequest,
  ChangeSubscriptionResponse,
  ChangePreviewRequest,
  ChangePreviewResponse,
  PaymentErrorDetail as PaymentErrorInfo,
} from './types';

// Error code categories (for bulk error handling)
export { ERROR_CATEGORIES } from './types/errors';

// Managers (for advanced usage)
export { CreditsManager, type ICreditsManager } from './managers/CreditsManager';
export { StripeManager, type IStripeManager } from './managers/StripeManager';
export { X402Manager, type IX402Manager } from './managers/X402Manager';
export { WalletManager, type IWalletManager } from './managers/WalletManager';
export {
  SubscriptionManager,
  type ISubscriptionManager,
  type SubscriptionQuoteOptions,
} from './managers/SubscriptionManager';
export {
  SubscriptionChangeManager,
  type ISubscriptionChangeManager,
} from './managers/SubscriptionChangeManager';
export {
  RouteDiscoveryManager,
  type IRouteDiscoveryManager,
} from './managers/RouteDiscoveryManager';

// Utilities
export {
  LogLevel,
  Logger,
  getLogger,
  createLogger,
  type LoggerConfig,
} from './utils/logger';
export { validateConfig } from './utils/validateConfig';
export {
  formatError,
  parseErrorResponse,
} from './utils/errorHandling';
export {
  ERROR_MESSAGES,
  getUserFriendlyError,
  formatUserError,
  type ErrorMessage,
} from './utils/errorMessages';
export {
  deduplicateRequest,
  createDedupedClickHandler,
  isButtonInCooldown,
  setButtonCooldown,
  isDuplicateRequest,
  markRequestProcessed,
  getInFlightRequest,
  trackInFlightRequest,
  clearDeduplicationCache,
  getDeduplicationStats,
  DEFAULT_COOLDOWN_MS,
  DEFAULT_DEDUP_WINDOW_MS,
} from './utils/requestDeduplication';
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
  type PaymentErrorDetail as PaymentErrorEventDetail,
} from './utils/eventEmitter';
export {
  isRetryableError,
  getUserErrorMessage,
} from './utils/errorParser';
export {
  createRateLimiter,
  RATE_LIMITER_PRESETS,
  type RateLimiter,
  type RateLimiterConfig,
} from './utils/rateLimiter';
export {
  createCircuitBreaker,
  CircuitState,
  CircuitBreakerOpenError,
  CIRCUIT_BREAKER_PRESETS,
  type CircuitBreaker,
  type CircuitBreakerConfig,
} from './utils/circuitBreaker';
export {
  retryWithBackoff,
  RETRY_PRESETS,
  type RetryConfig,
} from './utils/exponentialBackoff';
export {
  fetchWithTimeout,
  DEFAULT_FETCH_TIMEOUT_MS,
} from './utils/fetchWithTimeout';
export {
  validateSecurity,
  logSecurityReport,
  SECURITY_RECOMMENDATIONS,
  type SecurityCheckResult,
  type SecurityReport,
} from './utils/securityValidation';
export {
  validateTokenMint,
  KNOWN_STABLECOINS,
  type TokenMintValidationResult,
} from './utils/tokenMintValidator';
export {
  parseCouponCodes,
  formatCouponCodes,
  calculateDiscountPercentage,
  stackCheckoutCoupons,
  type Coupon,
} from './utils/couponHelpers';
export {
  isCartCheckout,
  normalizeCartItems,
  getCartItemCount,
  type NormalizedCartItem,
} from './utils/cartHelpers';
export {
  formatDate,
  formatDateTime,
} from './utils/dateHelpers';
export {
  createWalletPool,
  WalletPool,
} from './utils';
export {
  generateCSP,
  generateCSPDirectives,
  formatCSP,
  RPC_PROVIDERS,
  CSP_PRESETS,
  type CSPConfig,
  type CSPDirectives,
  type CSPFormat,
} from './utils';
export {
  type CircuitBreakerStats,
  type RetryStats,
} from './utils';

// ============================================
// EVENT SYSTEM EXPORTS
// ============================================
export {
  type WalletProvider,
} from './utils';

// ============================================
// INTERNATIONALIZATION (i18n)
// ============================================
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

// ============================================
// E-COMMERCE EXPORTS
// ============================================

// E-commerce Config & Context
export {
  CedrosShopProvider,
  useCedrosShop,
  useOptionalCedrosShop,
  type CedrosShopContextValue,
} from './ecommerce/config/context';
export type { CedrosShopConfig } from './ecommerce/config/types';

// E-commerce Types
export type {
  Product as EcommerceProduct,
  Category,
  CartItem as EcommerceCartItem,
  CartSnapshot,
  Order,
  OrderStatus,
  CheckoutMode,
  CustomerInfo,
  Address,
  ShippingMethod,
} from './ecommerce/types';

// E-commerce Adapters
export type {
  CommerceAdapter,
  ProductListParams,
  CheckoutSessionPayload,
  CheckoutSessionResult,
  CheckoutReturnResult,
  SubscriptionTier,
  SubscriptionStatus as EcommerceSubscriptionStatus,
  CartItemInventoryStatus,
  CartInventoryStatus,
  StorefrontConfig,
  PaymentMethodsConfig,
  AIRelatedProductsParams,
  AIRelatedProductsResult,
} from './ecommerce/adapters/CommerceAdapter';
export { createMockCommerceAdapter } from './ecommerce/adapters/mock/mockAdapter';
export { createPaywallCommerceAdapter } from './ecommerce/adapters/paywall/paywallAdapter';

// E-commerce State (Cart & Checkout)
export {
  CartProvider,
  useCart,
  type CartContextValue,
} from './ecommerce/state/cart/CartProvider';
export {
  cartReducer,
  type CartState,
  type CartAction,
} from './ecommerce/state/cart/cartReducer';
export {
  CheckoutProvider,
  useCheckout,
  useStandaloneCheckout,
  type CheckoutContextValue,
  type CheckoutStatus,
} from './ecommerce/state/checkout/useCheckout';
export {
  buildCheckoutSchema,
  type CheckoutFormValues,
} from './ecommerce/state/checkout/checkoutSchema';

// E-commerce Hooks
export { useCategories } from './ecommerce/hooks/useCategories';
export { useProducts } from './ecommerce/hooks/useProducts';
export { useProduct } from './ecommerce/hooks/useProduct';
export { useOrders } from './ecommerce/hooks/useOrders';
export { useSubscriptionData } from './ecommerce/hooks/useSubscriptionData';
export { useShippingMethods } from './ecommerce/hooks/useShippingMethods';
export {
  useCheckoutResultFromUrl,
  type CheckoutResult,
  type UseCheckoutResultFromUrlOptions,
} from './ecommerce/hooks/useCheckoutResultFromUrl';
export { parseCheckoutReturn } from './ecommerce/hooks/checkoutReturn';
export {
  readCatalogUrlState,
  useCatalogUrlSync,
  buildCatalogUrl,
  type CatalogUrlState,
  type ReadCatalogUrlStateOptions,
  type BuildCatalogUrlOptions,
  type UseCatalogUrlSyncOptions,
} from './ecommerce/hooks/useCatalogUrlState';
export {
  useCartInventory,
  type CartItemInventory,
  type UseCartInventoryOptions,
  type UseCartInventoryResult,
} from './ecommerce/hooks/useCartInventory';
export {
  useInventoryVerification,
  type InventoryIssue,
  type VerificationResult,
  type UseInventoryVerificationOptions,
  type UseInventoryVerificationResult,
} from './ecommerce/hooks/useInventoryVerification';
export {
  useHoldExpiry,
  type HoldExpiryEvent,
  type UseHoldExpiryOptions,
  type UseHoldExpiryResult,
} from './ecommerce/hooks/useHoldExpiry';
export {
  useStorefrontSettings,
  type StorefrontSettings,
} from './ecommerce/hooks/useStorefrontSettings';
export { usePaymentMethodsConfig } from './ecommerce/hooks/usePaymentMethodsConfig';
export {
  useAIRelatedProducts,
  type UseAIRelatedProductsOptions,
  type UseAIRelatedProductsResult,
} from './ecommerce/hooks/useAIRelatedProducts';

// E-commerce UI Primitives
export { Button } from './ecommerce/components/ui/button';
export { Badge } from './ecommerce/components/ui/badge';
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './ecommerce/components/ui/card';
export { Input } from './ecommerce/components/ui/input';
export { Label } from './ecommerce/components/ui/label';
export { Separator } from './ecommerce/components/ui/separator';
export { Skeleton } from './ecommerce/components/ui/skeleton';
export { Textarea } from './ecommerce/components/ui/textarea';
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from './ecommerce/components/ui/select';
export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './ecommerce/components/ui/dialog';
export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from './ecommerce/components/ui/sheet';
export { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './ecommerce/components/ui/accordion';
export { Tabs, TabsList, TabsTrigger, TabsContent } from './ecommerce/components/ui/tabs';

// E-commerce Catalog Components
export { Price } from './ecommerce/components/catalog/Price';
export { ProductCard } from './ecommerce/components/catalog/ProductCard';
export { ProductGrid } from './ecommerce/components/catalog/ProductGrid';
export { ProductGallery } from './ecommerce/components/catalog/ProductGallery';
export { ProductList } from './ecommerce/components/catalog/ProductList';
export { VariantSelector } from './ecommerce/components/catalog/VariantSelector';
export { QuantitySelector } from './ecommerce/components/catalog/QuantitySelector';
export { QuickViewDialog } from './ecommerce/components/catalog/QuickViewDialog';
export { CategoryNav } from './ecommerce/components/catalog/CategoryNav';
export { Breadcrumbs, type BreadcrumbItem } from './ecommerce/components/catalog/Breadcrumbs';
export { SearchInput } from './ecommerce/components/catalog/SearchInput';
export { SortDropdown } from './ecommerce/components/catalog/SortDropdown';
export { FilterPanel, type CatalogFilters, type CatalogFacets } from './ecommerce/components/catalog/FilterPanel';
export { FilterSidebar } from './ecommerce/components/catalog/FilterSidebar';
export { Pagination } from './ecommerce/components/catalog/Pagination';

// E-commerce Cart Components
export { CartSidebar } from './ecommerce/components/cart/CartSidebar';
export { CartPanel } from './ecommerce/components/cart/CartPanel';
export { CartPageContent } from './ecommerce/components/cart/CartPageContent';
export { CartLineItem } from './ecommerce/components/cart/CartLineItem';
export { CartSummary } from './ecommerce/components/cart/CartSummary';
export { CartDrawer } from './ecommerce/components/cart/CartDrawer';
export { CartEmpty } from './ecommerce/components/cart/CartEmpty';
export { CartError } from './ecommerce/components/cart/CartError';
export { CartLoading } from './ecommerce/components/cart/CartLoading';
export { CartCountBadge } from './ecommerce/components/cart/CartCountBadge';
export { PromoCodeInput } from './ecommerce/components/cart/PromoCodeInput';

// E-commerce Checkout Components
export { CheckoutLayout } from './ecommerce/components/checkout/CheckoutLayout';
export { CheckoutForm } from './ecommerce/components/checkout/CheckoutForm';
export { AddressForm } from './ecommerce/components/checkout/AddressForm';
export { ContactForm } from './ecommerce/components/checkout/ContactForm';
export { ShippingMethodSelector } from './ecommerce/components/checkout/ShippingMethodSelector';
export { PaymentStep } from './ecommerce/components/checkout/PaymentStep';
export { OrderReview } from './ecommerce/components/checkout/OrderReview';
export { OrderSummary } from './ecommerce/components/checkout/OrderSummary';
export { CheckoutSteps } from './ecommerce/components/checkout/CheckoutSteps';
export { CheckoutSuccess } from './ecommerce/components/checkout/CheckoutSuccess';
export { CheckoutError } from './ecommerce/components/checkout/CheckoutError';
export { CheckoutLoading } from './ecommerce/components/checkout/CheckoutLoading';
export { CheckoutReceipt } from './ecommerce/components/checkout/CheckoutReceipt';
export { CheckoutSuccessPage, type CheckoutSuccessPageProps } from './ecommerce/components/checkout/CheckoutSuccessPage';
export { CheckoutCancelPage, type CheckoutCancelPageProps } from './ecommerce/components/checkout/CheckoutCancelPage';
export { InventoryVerificationDialog } from './ecommerce/components/checkout/InventoryVerificationDialog';

// E-commerce Orders Components
export { OrderList } from './ecommerce/components/orders/OrderList';
export { OrderCard } from './ecommerce/components/orders/OrderCard';
export { OrderDetails } from './ecommerce/components/orders/OrderDetails';
export { OrderStatus as OrderStatusBadge } from './ecommerce/components/orders/OrderStatus';
export { OrderTimeline } from './ecommerce/components/orders/OrderTimeline';
export { PurchaseHistory } from './ecommerce/components/orders/PurchaseHistory';
export { ReceiptView } from './ecommerce/components/orders/ReceiptView';

// E-commerce General Components
export { EmptyState } from './ecommerce/components/general/EmptyState';
export { ErrorState } from './ecommerce/components/general/ErrorState';
export { ErrorBoundary } from './ecommerce/components/general/ErrorBoundary';
export { CTAButton } from './ecommerce/components/general/CTAButton';
export { PromoBanner } from './ecommerce/components/general/PromoBanner';
export { TrustBadges } from './ecommerce/components/general/TrustBadges';
export { Testimonials } from './ecommerce/components/general/Testimonials';
export { FAQAccordion } from './ecommerce/components/general/FAQAccordion';
export { ToastProvider, useToast, useOptionalToast, type ToastData } from './ecommerce/components/general/toast';

// E-commerce FAQ Components
export { FAQItem, FAQList } from './ecommerce/components/faq';
export type { FAQItemData, FAQItemProps, FAQListProps } from './ecommerce/components/faq';

// E-commerce Chat Components
export { ChatWidget } from './ecommerce/components/chat/ChatWidget';
export { ChatPanel } from './ecommerce/components/chat/ChatPanel';
export { ChatMessage } from './ecommerce/components/chat/ChatMessage';
export { ChatInput } from './ecommerce/components/chat/ChatInput';
export { ShopChatPanel } from './ecommerce/components/chat/ShopChatPanel';

// E-commerce Templates
export { ShopTemplate, type ShopTemplateProps } from './ecommerce/templates/ShopTemplate';
export { CategoryTemplate } from './ecommerce/templates/CategoryTemplate';
export { ProductTemplate } from './ecommerce/templates/ProductTemplate';
export { CartTemplate } from './ecommerce/templates/CartTemplate';
export { CheckoutTemplate } from './ecommerce/templates/CheckoutTemplate';
export { PurchaseHistoryTemplate } from './ecommerce/templates/PurchaseHistoryTemplate';
export { ReceiptTemplate, type ReceiptTemplateProps } from './ecommerce/templates/ReceiptTemplate';
export { SubscriptionTemplate } from './ecommerce/templates/SubscriptionTemplate';

// E-commerce Testing Utilities
export {
  validateCommerceAdapterContract,
  type AdapterContractOptions,
} from './ecommerce/testing/adapterContract';

// E-commerce Integrations
export { useCedrosPayCheckoutAdapter } from './ecommerce/integrations/cedros-pay/useCedrosPayCheckoutAdapter';

// E-commerce Utilities
export {
  getSafeStorage,
  readJson,
  writeJson,
  type StorageLike,
} from './ecommerce/utils/storage';
export { cn } from './ecommerce/utils/cn';
export {
  formatMoney,
  type Money,
} from './ecommerce/utils/money';
export {
  getCartCheckoutRequirements,
  type CheckoutRequirements,
} from './ecommerce/utils/cartCheckoutRequirements';
export {
  buildCartItemMetadataFromProduct,
} from './ecommerce/utils/cartItemMetadata';

// Internationalization
export { useTranslation, useLocalizedError, type UseTranslationResult } from './i18n/useTranslation';

// E-commerce namespace export
export * as ecommerce from './ecommerce';
