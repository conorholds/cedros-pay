/**
 * Hook to fetch storefront settings for product pages.
 *
 * Automatically uses the adapter from CedrosShopProvider context if available.
 * Falls back to defaults if config API is not available.
 */
export type RelatedProductsMode = 'most_recent' | 'by_category' | 'manual' | 'ai';
export type ProductCardLayout = 'large' | 'square' | 'compact';
export type ImageCropPosition = 'center' | 'top' | 'bottom' | 'left' | 'right';
export interface CatalogFilterSettings {
    tags: boolean;
    priceRange: boolean;
    inStock: boolean;
}
export interface CatalogSortSettings {
    featured: boolean;
    priceAsc: boolean;
    priceDesc: boolean;
}
export interface CheckoutDisplaySettings {
    promoCodes: boolean;
}
export interface LayoutSettings {
    layout: ProductCardLayout;
    imageCrop: ImageCropPosition;
}
export interface ProductPageSectionSettings {
    showDescription: boolean;
    showSpecs: boolean;
    showShipping: boolean;
    showRelatedProducts: boolean;
}
export interface InventorySettings {
    preCheckoutVerification: boolean;
    holdsEnabled: boolean;
    holdDurationMinutes: number;
}
export interface ProductPageSettings {
    sections: ProductPageSectionSettings;
    relatedProducts: {
        mode: RelatedProductsMode;
        maxItems: number;
        layout: LayoutSettings;
    };
}
export interface ShopPageSettings {
    title: string;
    description: string;
}
export interface StorefrontSettings {
    relatedProducts: {
        mode: RelatedProductsMode;
        maxItems: number;
        layout: LayoutSettings;
    };
    catalog: {
        filters: CatalogFilterSettings;
        sort: CatalogSortSettings;
    };
    checkout: CheckoutDisplaySettings;
    shopLayout: LayoutSettings;
    categoryLayout: LayoutSettings;
    sections: ProductPageSectionSettings;
    inventory: InventorySettings;
    shopPage: ShopPageSettings;
}
export interface UseStorefrontSettingsOptions {
    /** @deprecated Server URL - now automatically uses adapter from context */
    serverUrl?: string;
}
export declare function useStorefrontSettings(_options?: UseStorefrontSettingsOptions): {
    settings: StorefrontSettings;
    isLoading: boolean;
};
//# sourceMappingURL=useStorefrontSettings.d.ts.map