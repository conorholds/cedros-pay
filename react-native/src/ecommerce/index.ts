export type { CedrosShopConfig } from './config/types';
export { CedrosShopProvider, useCedrosShop } from './config/context';

export type {
  Product,
  Category,
  CartItem,
  CartSnapshot,
  Order,
  OrderStatus,
  CheckoutMode,
  CustomerInfo,
  Address,
  ShippingMethod,
} from './types';

export type {
  CommerceAdapter,
  ProductListParams,
  CheckoutSessionPayload,
  CheckoutSessionResult,
  CheckoutReturnResult,
  SubscriptionTier,
  SubscriptionStatus,
  CartItemInventoryStatus,
  CartInventoryStatus,
  StorefrontConfig,
  PaymentMethodsConfig,
  AIRelatedProductsParams,
  AIRelatedProductsResult,
} from './adapters/CommerceAdapter';

export { createMockCommerceAdapter } from './adapters/mock/mockAdapter';
export { createPaywallCommerceAdapter } from './adapters/paywall/paywallAdapter';

export { CartProvider, useCart } from './state/cart/CartProvider';
export { CheckoutProvider, useCheckout, useStandaloneCheckout } from './state/checkout/useCheckout';

// Hooks
export { useCategories } from './hooks/useCategories';
export { useProducts } from './hooks/useProducts';
export { useProduct } from './hooks/useProduct';
export { useOrders } from './hooks/useOrders';
export { useSubscriptionData } from './hooks/useSubscriptionData';
export { useShippingMethods } from './hooks/useShippingMethods';
export { useCheckoutResultFromUrl } from './hooks/useCheckoutResultFromUrl';
export type { CheckoutResult } from './hooks/useCheckoutResultFromUrl';
export { parseCheckoutReturn } from './hooks/checkoutReturn';
export { readCatalogUrlState, useCatalogUrlSync, buildCatalogUrl } from './hooks/useCatalogUrlState';
export type { CatalogUrlState, ReadCatalogUrlStateOptions, BuildCatalogUrlOptions, UseCatalogUrlSyncOptions } from './hooks/useCatalogUrlState';
export { useCartInventory } from './hooks/useCartInventory';
export type { CartItemInventory, UseCartInventoryOptions, UseCartInventoryResult } from './hooks/useCartInventory';
export { useInventoryVerification } from './hooks/useInventoryVerification';
export type {
  InventoryIssue,
  VerificationResult,
  UseInventoryVerificationOptions,
  UseInventoryVerificationResult,
} from './hooks/useInventoryVerification';
export { useHoldExpiry } from './hooks/useHoldExpiry';
export type { HoldExpiryEvent, UseHoldExpiryOptions, UseHoldExpiryResult } from './hooks/useHoldExpiry';
export { useStorefrontSettings } from './hooks/useStorefrontSettings';
export type { StorefrontSettings } from './hooks/useStorefrontSettings';
export { usePaymentMethodsConfig } from './hooks/usePaymentMethodsConfig';
export { useAIRelatedProducts } from './hooks/useAIRelatedProducts';
export type { UseAIRelatedProductsOptions, UseAIRelatedProductsResult } from './hooks/useAIRelatedProducts';

// Testing
export { validateCommerceAdapterContract } from './testing/adapterContract';
export type { AdapterContractOptions } from './testing/adapterContract';

// UI primitives
export { Button } from './components/ui/button';
export { Badge } from './components/ui/badge';
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './components/ui/card';
export { Input } from './components/ui/input';
export { Label } from './components/ui/label';
export { Separator } from './components/ui/separator';
export { Skeleton } from './components/ui/skeleton';
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from './components/ui/select';
export {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogClose,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './components/ui/dialog';
export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetPortal,
  SheetOverlay,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from './components/ui/sheet';
export { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './components/ui/accordion';
export { Tabs, TabsList, TabsTrigger, TabsContent } from './components/ui/tabs';

// General
export { EmptyState } from './components/general/EmptyState';
export { ErrorState } from './components/general/ErrorState';
export { ErrorBoundary } from './components/general/ErrorBoundary';
export { ToastProvider, useToast } from './components/general/toast';
export { useOptionalToast } from './components/general/toast';

// FAQ components
export { FAQItem, FAQList } from './components/faq';
export type { FAQItemData, FAQItemProps, FAQListProps } from './components/faq';

// Catalog components
export { Price } from './components/catalog/Price';
export { ProductCard } from './components/catalog/ProductCard';
export { ProductGrid } from './components/catalog/ProductGrid';
export { ProductGallery } from './components/catalog/ProductGallery';
export { VariantSelector } from './components/catalog/VariantSelector';
export { QuantitySelector } from './components/catalog/QuantitySelector';
export { QuickViewDialog } from './components/catalog/QuickViewDialog';
export { CategoryNav } from './components/catalog/CategoryNav';
export { Breadcrumbs } from './components/catalog/Breadcrumbs';
export type { BreadcrumbItem } from './components/catalog/Breadcrumbs';
export { SearchInput } from './components/catalog/SearchInput';
export { FilterPanel } from './components/catalog/FilterPanel';
export type { CatalogFilters, CatalogFacets } from './components/catalog/FilterPanel';

// Cart components
export { CartSidebar } from './components/cart/CartSidebar';
export { CartPanel } from './components/cart/CartPanel';
export { CartPageContent } from './components/cart/CartPageContent';
export { CartLineItem } from './components/cart/CartLineItem';
export { CartSummary } from './components/cart/CartSummary';
export { PromoCodeInput } from './components/cart/PromoCodeInput';

// Checkout components
export { CheckoutLayout } from './components/checkout/CheckoutLayout';
export { CheckoutForm } from './components/checkout/CheckoutForm';
export { AddressForm } from './components/checkout/AddressForm';
export { ShippingMethodSelector } from './components/checkout/ShippingMethodSelector';
export { PaymentStep } from './components/checkout/PaymentStep';
export { OrderReview } from './components/checkout/OrderReview';
export { CheckoutReceipt } from './components/checkout/CheckoutReceipt';
export { CheckoutSuccessPage } from './components/checkout/CheckoutSuccessPage';
export type { CheckoutSuccessPageProps } from './components/checkout/CheckoutSuccessPage';
export { CheckoutCancelPage } from './components/checkout/CheckoutCancelPage';
export type { CheckoutCancelPageProps } from './components/checkout/CheckoutCancelPage';
export { InventoryVerificationDialog } from './components/checkout/InventoryVerificationDialog';
export type { InventoryVerificationDialogProps } from './components/checkout/InventoryVerificationDialog';

// Orders components
export { OrderList } from './components/orders/OrderList';
export { OrderCard } from './components/orders/OrderCard';
export { OrderDetails } from './components/orders/OrderDetails';

// Templates
export { ShopTemplate } from './templates/ShopTemplate';
export type { CedrosShopRoutes } from './templates/ShopTemplate';
export { CategoryTemplate } from './templates/CategoryTemplate';
export { ProductTemplate } from './templates/ProductTemplate';
export { CartTemplate } from './templates/CartTemplate';
export { CheckoutTemplate } from './templates/CheckoutTemplate';
export { PurchaseHistoryTemplate } from './templates/PurchaseHistoryTemplate';
export { ReceiptTemplate } from './templates/ReceiptTemplate';
export type { ReceiptTemplateProps } from './templates/ReceiptTemplate';
export { SubscriptionTemplate } from './templates/SubscriptionTemplate';

// Integrations
export { useCedrosPayCheckoutAdapter } from './integrations/cedros-pay/useCedrosPayCheckoutAdapter';
