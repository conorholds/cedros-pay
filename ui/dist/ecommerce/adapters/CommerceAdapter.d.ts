import { Category, CartSnapshot, CustomerInfo, ListResult, Order, Product, ShippingMethod } from '../types';
export type ProductListParams = {
    category?: string;
    search?: string;
    filters?: Record<string, string | string[] | number | boolean>;
    sort?: string;
    page?: number;
    pageSize?: number;
};
export type CheckoutSessionPayload = {
    cart: Array<{
        resource: string;
        quantity: number;
        variantId?: string;
    }>;
    customer: CustomerInfo;
    options: {
        currency: string;
        successUrl?: string;
        cancelUrl?: string;
        allowPromoCodes?: boolean;
        metadata?: Record<string, string>;
        discountCode?: string;
        tipAmount?: number;
        shippingMethodId?: string;
        paymentMethodId?: string;
    };
};
export type CheckoutSessionResult = {
    kind: 'redirect';
    url: string;
} | {
    kind: 'embedded';
    clientSecret?: string;
    sessionId?: string;
} | {
    kind: 'custom';
    data: unknown;
};
export type CheckoutReturnResult = {
    kind: 'idle';
} | {
    kind: 'success';
    orderId?: string;
    order?: Order;
} | {
    kind: 'cancel';
} | {
    kind: 'error';
    message?: string;
};
export type SubscriptionTier = {
    id: string;
    title: string;
    description?: string;
    priceMonthly: number;
    priceAnnual?: number;
    currency: string;
    features: string[];
    isPopular?: boolean;
    /** Inventory quantity - null/undefined means unlimited */
    inventoryQuantity?: number | null;
    /** Number of subscriptions sold (for availability display) */
    inventorySold?: number;
};
export type SubscriptionStatus = {
    currentTierId?: string;
    isActive: boolean;
    renewsAt?: string;
};
/** Item inventory status from cart */
export type CartItemInventoryStatus = {
    resourceId: string;
    variantId?: string | null;
    inStock: boolean;
    availableQuantity: number;
    reservedByOthers: number;
    holdExpiresAt?: string;
    canBackorder: boolean;
};
/** Cart inventory status response */
export type CartInventoryStatus = {
    cartId: string;
    allAvailable: boolean;
    holdsEnabled: boolean;
    items: CartItemInventoryStatus[];
};
export interface CommerceAdapter {
    listProducts(params: ProductListParams): Promise<ListResult<Product>>;
    getProductBySlug(slug: string): Promise<Product | null>;
    /**
     * Optional batched product lookup used by inventory/cart verification hooks
     * to avoid N per-item network calls.
     */
    getProductsByIds?(ids: string[]): Promise<Map<string, Product>>;
    listCategories(): Promise<Category[]>;
    getOrderHistory(): Promise<Order[]>;
    getOrderById?(orderId: string): Promise<Order | null>;
    getShippingMethods?(payload: {
        currency: string;
        customer: CustomerInfo;
    }): Promise<ShippingMethod[]>;
    /**
     * Single integration boundary.
     * Implementations may delegate to cedros-pay payment primitives.
     */
    createCheckoutSession(payload: CheckoutSessionPayload): Promise<CheckoutSessionResult>;
    /**
     * Optional: resolve a checkout return (success/cancel/error) from URL query params.
     * This lets apps wire real provider callbacks (e.g. Stripe `session_id`) without
     * relying on a custom `status=success` convention.
     */
    resolveCheckoutReturn?(payload: {
        query: Record<string, string | undefined>;
    }): Promise<CheckoutReturnResult>;
    /**
     * Optional: server cart sync / merge for signed-in users.
     */
    getCart?(payload: {
        customerId: string;
    }): Promise<CartSnapshot>;
    mergeCart?(payload: {
        customerId: string;
        cart: CartSnapshot;
    }): Promise<CartSnapshot>;
    updateCart?(payload: {
        customerId: string;
        cart: CartSnapshot;
    }): Promise<void>;
    listSubscriptionTiers?(): Promise<SubscriptionTier[]>;
    getSubscriptionStatus?(): Promise<SubscriptionStatus>;
    createSubscriptionCheckoutSession?(payload: {
        tierId: string;
        interval: 'monthly' | 'annual';
        successUrl?: string;
        cancelUrl?: string;
    }): Promise<CheckoutSessionResult>;
    /**
     * Optional: get inventory status for a cart.
     * Returns availability info for all items, including hold expiry times.
     * Backend automatically creates holds when cart quotes are generated.
     */
    getCartInventoryStatus?(payload: {
        cartId: string;
    }): Promise<CartInventoryStatus>;
    /**
     * Optional: get storefront display settings configured by admin.
     * Returns settings for layouts, filters, related products, etc.
     */
    getStorefrontSettings?(): Promise<StorefrontConfig | null>;
    /**
     * Optional: get enabled payment methods from admin configuration.
     * Returns which payment methods (card, crypto, credits) are enabled.
     */
    getPaymentMethodsConfig?(): Promise<PaymentMethodsConfig | null>;
    /**
     * Optional: get AI-powered related product recommendations.
     * Requires AI to be configured in admin settings (OpenAI or Gemini).
     */
    getAIRelatedProducts?(params: AIRelatedProductsParams): Promise<AIRelatedProductsResult>;
}
/** Payment methods enabled configuration from admin */
export type PaymentMethodsConfig = {
    /** Stripe card payments enabled */
    card: boolean;
    /** Solana/x402 crypto payments enabled */
    crypto: boolean;
    /** Cedros Login credits payments enabled */
    credits: boolean;
};
/** Storefront configuration from admin settings */
export type StorefrontConfig = {
    relatedProducts: {
        mode: 'most_recent' | 'by_category' | 'manual' | 'ai';
        maxItems: number;
        layout: {
            layout: 'large' | 'square' | 'compact';
            imageCrop: 'center' | 'top' | 'bottom' | 'left' | 'right';
        };
    };
    catalog: {
        filters: {
            tags: boolean;
            priceRange: boolean;
            inStock: boolean;
        };
        sort: {
            featured: boolean;
            priceAsc: boolean;
            priceDesc: boolean;
        };
    };
    checkout: {
        promoCodes: boolean;
    };
    shopLayout: {
        layout: 'large' | 'square' | 'compact';
        imageCrop: 'center' | 'top' | 'bottom' | 'left' | 'right';
    };
    categoryLayout: {
        layout: 'large' | 'square' | 'compact';
        imageCrop: 'center' | 'top' | 'bottom' | 'left' | 'right';
    };
    sections: {
        showDescription: boolean;
        showSpecs: boolean;
        showShipping: boolean;
        showRelatedProducts: boolean;
    };
    inventory: {
        preCheckoutVerification: boolean;
        holdsEnabled: boolean;
        holdDurationMinutes: number;
    };
    shopPage?: {
        title: string;
        description: string;
    };
};
/** Parameters for AI-powered related products request */
export type AIRelatedProductsParams = {
    /** Product ID to get related products for */
    productId?: string;
    /** Product name (alternative to productId) */
    name?: string;
    /** Product description for context */
    description?: string;
    /** Product tags for matching */
    tags?: string[];
    /** Product category IDs for matching */
    categoryIds?: string[];
};
/** Result from AI-powered related products endpoint */
export type AIRelatedProductsResult = {
    /** IDs of recommended related products */
    relatedProductIds: string[];
    /** AI's reasoning for the recommendations */
    reasoning: string;
};
//# sourceMappingURL=CommerceAdapter.d.ts.map