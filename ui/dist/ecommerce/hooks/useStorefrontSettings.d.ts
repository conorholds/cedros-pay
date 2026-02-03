import { ProductPageSettings, RelatedProductsMode, CatalogFilterSettings, CatalogSortSettings, CheckoutDisplaySettings, LayoutSettings, ProductCardLayout, ImageCropPosition, ProductPageSectionSettings, InventorySettings } from '../../components/admin/types';
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
export type { ProductPageSettings, RelatedProductsMode, CatalogFilterSettings, CatalogSortSettings, CheckoutDisplaySettings, LayoutSettings, ProductCardLayout, ImageCropPosition, ProductPageSectionSettings, InventorySettings };
//# sourceMappingURL=useStorefrontSettings.d.ts.map