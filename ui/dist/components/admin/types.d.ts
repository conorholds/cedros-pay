import { IAdminAuthManager } from './AdminAuthManager';
/** Props for section components */
export interface SectionProps {
    serverUrl: string;
    /** @deprecated Use authManager instead */
    apiKey?: string;
    refreshInterval?: number;
    pageSize?: number;
    /** Admin auth manager for authenticated requests */
    authManager?: IAdminAuthManager;
}
/** Stats response from backend */
export interface PaymentStats {
    totalRevenue: number;
    totalTransactions: number;
    activeProducts: number;
    pendingRefunds: number;
    revenueByMethod: {
        stripe: number;
        x402: number;
        credits: number;
    };
    transactionsByMethod: {
        stripe: number;
        x402: number;
        credits: number;
    };
}
/** Product resource from backend */
export interface Product {
    id: string;
    title?: string;
    slug?: string;
    imageUrl?: string;
    description: string;
    fiatAmountCents: number;
    fiatCurrency: string;
    stripePriceId?: string;
    cryptoAtomicAmount: number;
    cryptoToken: string;
    inventoryQuantity?: number | null;
    metadata?: Record<string, string>;
    active?: boolean;
    /** Product variations (SKUs) - each variation is a separate SKU */
    variations?: Array<{
        id: string;
        sku?: string;
    }>;
}
/** Transaction from backend */
export interface Transaction {
    id: string;
    resourceId: string;
    method: 'stripe' | 'x402' | 'credits';
    amount: number;
    currency: string;
    status: 'pending' | 'completed' | 'failed' | 'refunded';
    paidAt: string;
    metadata?: Record<string, string>;
}
/** Coupon scope - which products the coupon applies to */
export type CouponScope = 'all_products' | 'specific_products' | 'specific_categories';
/** Payment method restriction for coupons */
export type CouponPaymentMethod = 'any' | 'stripe' | 'x402' | 'credits';
/** When the coupon discount is applied */
export type CouponAppliesAt = 'cart' | 'checkout' | 'both';
/** Coupon from backend */
export interface Coupon {
    code: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    currency?: string;
    active: boolean;
    usageLimit?: number;
    usageCount: number;
    expiresAt?: string;
    /** Which products the coupon applies to (default: all_products) */
    scope?: CouponScope;
    /** Product IDs when scope is 'specific_products' */
    productIds?: string[];
    /** Category IDs when scope is 'specific_categories' */
    categoryIds?: string[];
    /** Restrict to specific payment method (default: any) */
    paymentMethod?: CouponPaymentMethod;
    /** Automatically apply coupon when conditions are met */
    autoApply?: boolean;
    /** When the discount is applied (default: both) */
    appliesAt?: CouponAppliesAt;
    /** Start date for the coupon (ISO datetime) */
    startsAt?: string;
    minimumAmountCents?: number;
    usageLimitPerCustomer?: number;
    firstPurchaseOnly?: boolean;
}
/** x402 Refund from backend */
export interface Refund {
    id: string;
    transactionId: string;
    amount: number;
    currency: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    reason?: string;
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
}
/** Related products display mode */
export type RelatedProductsMode = 'most_recent' | 'by_category' | 'manual' | 'ai';
/** Catalog filter visibility settings */
export interface CatalogFilterSettings {
    /** Show tags filter */
    tags: boolean;
    /** Show price range filter */
    priceRange: boolean;
    /** Show in-stock filter */
    inStock: boolean;
}
/** Catalog sort option visibility settings */
export interface CatalogSortSettings {
    /** Show "Featured" sort option */
    featured: boolean;
    /** Show "Price: Low to High" sort option */
    priceAsc: boolean;
    /** Show "Price: High to Low" sort option */
    priceDesc: boolean;
}
/** Checkout settings */
export interface CheckoutDisplaySettings {
    /** Show promo/coupon code input on cart and checkout pages */
    promoCodes: boolean;
}
/** Product card layout style */
export type ProductCardLayout = 'large' | 'square' | 'compact';
/** Image crop position for product cards */
export type ImageCropPosition = 'center' | 'top' | 'bottom' | 'left' | 'right';
/** Layout settings for a page */
export interface LayoutSettings {
    /** Card layout style */
    layout: ProductCardLayout;
    /** Image crop/focus position */
    imageCrop: ImageCropPosition;
}
/** Product detail page section visibility settings */
export interface ProductPageSectionSettings {
    /** Show description accordion */
    showDescription: boolean;
    /** Show specs/attributes accordion */
    showSpecs: boolean;
    /** Show shipping & returns accordion */
    showShipping: boolean;
    /** Show related products section */
    showRelatedProducts: boolean;
}
/** Product page and catalog settings */
export interface ProductPageSettings {
    relatedProducts: {
        /** How to select related products */
        mode: RelatedProductsMode;
        /** Maximum number of related products to show (default: 4) */
        maxItems: number;
        /** Layout settings for related products grid */
        layout: LayoutSettings;
    };
    catalog: {
        /** Which filters to show in shop/category sidebars */
        filters: CatalogFilterSettings;
        /** Which sort options to show */
        sort: CatalogSortSettings;
    };
    checkout: CheckoutDisplaySettings;
    /** Layout settings for the shop page */
    shopLayout: LayoutSettings;
    /** Layout settings for category pages */
    categoryLayout: LayoutSettings;
    /** Product detail page section visibility */
    sections: ProductPageSectionSettings;
}
/** AI provider types */
export type AIProvider = 'gemini' | 'openai';
/** Available AI models */
export type AIModel = 'not_set' | 'gemini-2.5-flash' | 'gemini-2.5-pro' | 'openai-4o' | 'openai-5.1' | 'openai-5.2';
/** AI model display info */
export interface AIModelInfo {
    id: AIModel;
    label: string;
    provider: AIProvider | null;
}
/** AI task types that can be assigned models */
export type AITask = 'related_product_finder' | 'product_detail_assistant' | 'site_chat' | 'product_searcher';
/** AI task configuration */
export interface AITaskConfig {
    task: AITask;
    label: string;
    description: string;
    assignedModel: AIModel;
    /** System/default prompt for this task */
    systemPrompt?: string;
}
/** API key configuration (stored securely, only shows masked version) */
export interface APIKeyConfig {
    provider: AIProvider;
    /** Whether a key is configured (don't expose actual key) */
    isConfigured: boolean;
    /** Masked version for display (e.g., "sk-...abc123") */
    maskedKey?: string;
    /** Last updated timestamp */
    updatedAt?: string;
}
/** AI settings for the admin dashboard */
export interface AISettings {
    apiKeys: APIKeyConfig[];
    taskAssignments: AITaskConfig[];
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
/** Shop page content settings */
export interface ShopPageSettings {
    /** Shop page title (default: "Shop") */
    title: string;
    /** Shop page description/subtitle */
    description: string;
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
//# sourceMappingURL=types.d.ts.map