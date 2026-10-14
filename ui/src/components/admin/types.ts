/**
 * Admin Dashboard Types
 */

import type { IAdminAuthManager } from './AdminAuthManager';
import type { ProductImage, ProductVariant } from '../../types/productVariations';

/** Props for section components */
export interface SectionProps {
  serverUrl: string;
  locale?: string;
  refreshInterval?: number;
  pageSize?: number;
  /** Admin auth manager for authenticated requests */
  authManager?: IAdminAuthManager;
  /** Opaque host-derived site/org/user scope for browser-local recovery data. */
  persistenceScope?: string;
  /**
   * Optional tab hint supplied by the host when this section is a tabbed
   * umbrella. Hosts can derive it from URL routing or setup context and pass it
   * through `pluginContext.pluginData.defaultTabId`.
   */
  defaultTabId?: string;
  /** Internal hub callback used to suppress collection chrome for nested detail views. */
  onDetailViewChange?: (isDetailView: boolean) => void;
  dependencies?: {
    cedrosBalanceInstalled?: boolean;
  };
}

/** Settled payment methods tracked by web admin analytics and transactions. */
export type SettledPaymentMethod = 'stripe' | 'x402' | 'credits';

/** Per-method numeric breakdown (e.g. revenue totals or transaction counts). */
export interface PaymentMethodAmounts {
  stripe: number;
  x402: number;
  credits: number;
}

/** Order lifecycle breakdown derived from the payment ledger (see `/admin/stats`). */
export interface OrderStats {
  total: number;
  paid: number;
  refunded: number;
  pending: number;
  failed: number;
  /** Settled (paid) gross revenue in dollars. */
  revenue: number;
}

/** Stats response from backend */
export interface PaymentStats {
  /** Legacy revenue aggregates cannot be displayed as USD when true. */
  revenueIncludesNonUsd?: boolean;
  totalRevenue: number;
  totalTransactions: number;
  activeProducts: number;
  /** Active products with a positive price that checkout can quote. */
  sellableProducts?: number;
  pendingRefunds: number;
  revenueByMethod: PaymentMethodAmounts;
  transactionsByMethod: PaymentMethodAmounts;
  /** True when the backend stopped scanning before all ledger rows were included. */
  truncated?: boolean;
  /** Order lifecycle breakdown, powering the Orders tab stats bar. Optional so an
   * older backend (without this field) degrades to zeroed order stats. */
  orders?: OrderStats;
}

/** Common pagination/scan metadata returned by admin list endpoints. */
export interface AdminPagedResponse {
  count?: number;
  total?: number;
  hasMore?: boolean;
  truncated?: boolean;
}

/** Product resource from backend */
export type StoreManagedProductKind =
  | 'consumable'
  | 'non_consumable'
  | 'auto_renewable_subscription';

export type StorePolicyFulfillmentType =
  | 'digital_in_app'
  | 'physical_goods'
  | 'real_world_service'
  | 'reader_content'
  | 'other';

export interface AppleStoreBillingConfig {
  productId?: string;
}

export interface GoogleStoreBillingConfig {
  productId?: string;
  packageName?: string;
  basePlanId?: string;
  offerId?: string;
}

export interface StoreBillingConfig {
  kind?: StoreManagedProductKind;
  apple?: AppleStoreBillingConfig;
  google?: GoogleStoreBillingConfig;
}

export interface SolanaSubscriptionPlanConfig {
  enabled?: boolean;
  planId: number;
  monthlyPlanId?: number;
  annualPlanId?: number;
  merchantAddress: string;
  tokenMint: string;
  tokenProgramAddress?: string;
  receiverTokenAccount?: string;
  collectorAddress?: string;
  planAddress?: string;
  monthlyPlanAddress?: string;
  annualPlanAddress?: string;
  programAddress?: string;
  monthlyAmountAtomic?: number;
  annualAmountAtomic?: number;
  monthlyPeriodHours?: number;
  annualPeriodHours?: number;
  expectedCreatedAt?: number;
  monthlyExpectedCreatedAt?: number;
  annualExpectedCreatedAt?: number;
  expectedSubscriptionAuthorityInitId?: number;
  metadataUri?: string;
  endTs?: number;
  monthlyEndTs?: number;
  annualEndTs?: number;
  destinations?: string[];
  pullers?: string[];
  status?: 'active' | 'sunset';
  monthlyStatus?: 'active' | 'sunset';
  annualStatus?: 'active' | 'sunset';
}

export interface CheckoutRequirements {
  email?: 'none' | 'optional' | 'required';
  name?: 'none' | 'optional' | 'required';
  phone?: 'none' | 'optional' | 'required';
  shippingAddress?: boolean;
  billingAddress?: boolean;
}

export interface FulfillmentInfo {
  type: 'digital_download' | 'shipping' | 'service';
  notes?: string;
}

export type ProductVariantSummary = Pick<ProductVariant, 'id' | 'sku'>;

export interface Product {
  id: string;
  title?: string;
  shortDescription?: string;
  slug?: string;
  seoTitle?: string;
  seoDescription?: string;
  imageUrl?: string;
  images?: ProductImage[];
  description: string;
  fiatAmountCents?: number | null;
  fiatCurrency?: string | null;
  compareAtFiatAmountCents?: number | null;
  compareAtFiatCurrency?: string | null;
  stripePriceId?: string;
  stripeProductId?: string;
  cryptoAtomicAmount?: number | null;
  cryptoToken?: string | null;
  tags?: string[];
  categoryIds?: string[];
  shippingProfile?: 'physical' | 'digital' | null;
  checkoutRequirements?: CheckoutRequirements;
  fulfillment?: FulfillmentInfo;
  storeBilling?: StoreBillingConfig | null;
  inventoryQuantity?: number | null;
  inventoryStatus?: string | null;
  inventoryPolicy?: string | null;
  metadata?: Record<string, string>;
  active?: boolean;
  /** Product variations (SKUs) - each variation is a separate SKU */
  variations?: ProductVariantSummary[];
}

/** Transaction from backend */
export interface Transaction {
  id: string;
  resourceId: string;
  method: SettledPaymentMethod;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  amountMinor?: number;
  refundedAmountMinor?: number;
  providerReference?: string | null;
  refundProgress?: {
    status: 'unresolved' | 'completed' | 'reversed';
    refundId?: string | null;
    requestedAmountMinor: number;
  } | null;
  paidAt: string;
  metadata?: Record<string, string>;
}

export interface TransactionsResponse extends AdminPagedResponse {
  transactions: Transaction[];
  /**
   * The search term the backend actually applied, echoed verbatim. A runtime
   * that predates server-side search omits it, which is how the client tells
   * "filtered for you" from "ignored your parameter".
   */
  search?: string | null;
}

/** Coupon scope - which products the coupon applies to */
export type CouponScope = 'all_products' | 'specific_products' | 'specific_categories';

/** Payment method restriction for coupons */
export type CouponPaymentMethod = 'any' | SettledPaymentMethod;

/** When the coupon discount is applied */
export type CouponAppliesAt = 'cart' | 'checkout' | 'both';

/** How a coupon discount is calculated */
export type DiscountType = 'percentage' | 'fixed';

/** Coupon from backend */
export interface Coupon {
  code: string;
  discountType: DiscountType;
  discountValue: number;
  currency?: string;
  active: boolean;
  usageLimit?: number;
  usageCount: number;
  expiresAt?: string;
  // Scope and targeting
  /** Which products the coupon applies to (default: all_products) */
  scope?: CouponScope;
  /** Product IDs when scope is 'specific_products' */
  productIds?: string[];
  /** Category IDs when scope is 'specific_categories' */
  categoryIds?: string[];
  // Payment and application settings
  /** Restrict to specific payment method (default: any) */
  paymentMethod?: CouponPaymentMethod;
  /** Automatically apply coupon when conditions are met */
  autoApply?: boolean;
  /** When the discount is applied (default: both) */
  appliesAt?: CouponAppliesAt;
  /** Start date for the coupon (ISO datetime) */
  startsAt?: string;
  // Advanced coupon features
  minimumAmountCents?: number;
  usageLimitPerCustomer?: number;
  firstPurchaseOnly?: boolean;
}

/** x402 Refund from backend */
export interface Refund {
  id: string;
  /** On-chain refund signature, null until the payout is broadcast. */
  transactionId: string | null;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  reason?: string;
  /** Buyer wallet that receives the refunded tokens (x402 only). */
  recipientWallet?: string | null;
  /** The original x402 purchase signature this refunds (x402 only). */
  originalPurchaseId?: string | null;
  /** Core signing was started; this request may be retried but cannot be denied. */
  signingStarted?: boolean;
  /** Exact token settlement returned by the x402 refund. */
  paymentMint?: string | null;
  refundAmountMicrounits?: number | null;
  tokenDecimals?: number | null;
  providerStatus?: 'submitted' | 'indeterminate' | 'failed' | null;
  providerErrorCode?: string | null;
  providerRetryable?: boolean | null;
  operationId?: string | null;
  /** Original credits payment reference (credits refunds only). */
  originalTransactionId?: string | null;
  createdAt: string;
}

/** Stripe Refund from backend */
export interface StripeRefund {
  id: string;
  /** Stripe refund id, null/undefined until processed */
  stripeRefundId?: string | null;
  /** Stripe charge id (nullable per Stripe refund object) */
  chargeId?: string | null;
  paymentIntentId?: string | null;
  amount: number;
  currency: string;
  status: 'pending' | 'requires_action' | 'succeeded' | 'failed' | 'canceled';
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer' | string;
  createdAt: string;
  metadata?: Record<string, string>;
}

/** Credits Refund Request from cedros-login backend */
export interface CreditsRefundRequest {
  id: string;
  /** Original credit transaction id */
  originalTransactionId: string;
  userId?: string;
  /** Smallest unit (lamports for SOL, micros for USD) */
  amountLamports: number;
  currency?: string;
  status: 'pending' | 'processed' | 'rejected' | string;
  reason?: string;
  createdAt: string;
  processedAt?: string | null;
  rejectedAt?: string | null;
  rejectedReason?: string | null;
}

/** Subscription plan configuration */
export interface SubscriptionPlan {
  id: string;
  title: string;
  description: string;
  /** Monthly price in USD (e.g., 10 for $10/month) */
  priceMonthlyUsd: number;
  /** Annual price in USD (e.g., 100 for $100/year) */
  priceAnnualUsd: number;
  /** Feature bullet points */
  features: string[];
  /** Bold highlight text shown above feature list (first feature) */
  featureHighlight?: string;
  /** Custom button text (default: "Purchase") */
  buttonText?: string;
  /** Mark as featured/popular plan */
  isPopular?: boolean;
  /** Plan is available for purchase */
  isActive: boolean;
  /** Plan is visible in public plan-selection flows (defaults to true). */
  public?: boolean;
  /** Sort order (lower = first) */
  sortOrder?: number;
  /** Stripe price ID for monthly billing (auto-populated by backend) */
  stripePriceIdMonthly?: string;
  /** Stripe price ID for annual billing (auto-populated by backend) */
  stripePriceIdAnnual?: string;
  /** Stripe product ID (auto-populated by backend) */
  stripeProductId?: string;
  /** Inventory quantity - null/undefined means unlimited */
  inventoryQuantity?: number | null;
  /** Number of subscriptions sold (read-only, populated by backend) */
  inventorySold?: number;
  /** Number of active subscribers on this plan (read-only, populated by backend) */
  activeSubscribers?: number;
  /** Optional Solana program-managed subscription mapping */
  solanaSubscription?: SolanaSubscriptionPlanConfig | null;
}

/** Subscription settings for the page */
export interface SubscriptionSettings {
  /** Subscriptions feature is enabled */
  enabled: boolean;
  /** All subscription plans */
  plans: SubscriptionPlan[];
  /** Page title (default: "Choose Your Plan") */
  pageTitle?: string;
  /** Page subtitle */
  pageSubtitle?: string;
  /** Annual savings badge text (default: "2 months free") */
  annualSavingsBadge?: string;
  /** Popular plan badge text (default: "Best Deal") */
  popularBadgeText?: string;
  /** Footer notice text */
  footerNotice?: string;
  /** Server revision for optimistic concurrency */
  revision?: number;
  /** Strong ETag for autosave If-Match */
  etag?: string;
}

/** Inventory management settings */
export interface InventorySettings {
  /** Enable pre-checkout inventory verification */
  preCheckoutVerification: boolean;
  /** Enable inventory holds when items are added to cart */
  holdsEnabled: boolean;
  /** Hold duration in minutes (5-60) */
  holdDurationMinutes: number;
}

/** FAQ item for knowledge base */
export interface FAQ {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
  active: boolean;
  /** Whether AI chat assistant should use this FAQ (default: true) */
  useInChat: boolean;
  /** Whether to display on public FAQ page (default: true) */
  displayOnPage: boolean;
  createdAt?: string;
  updatedAt?: string;
}
