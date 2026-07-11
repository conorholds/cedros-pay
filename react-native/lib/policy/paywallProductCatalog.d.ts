import type { CedrosProductCatalog, CedrosProductDefinition, StoreManagedProductKind } from '../types/storePolicy';
export interface PaywallCatalogStoreBillingConfig {
    kind?: StoreManagedProductKind;
    apple?: {
        productId?: string;
    };
    google?: {
        productId?: string;
        packageName?: string;
        basePlanId?: string;
        offerId?: string;
    };
}
export interface PaywallCatalogProduct {
    id: string;
    title?: string;
    description?: string;
    shippingProfile?: string;
    fulfillment?: {
        type?: string;
        notes?: string;
    };
    fulfillmentType?: string;
    storeBilling?: PaywallCatalogStoreBillingConfig;
    metadata?: Record<string, unknown>;
}
export declare function mapPaywallProductToCedrosProductDefinition(product: PaywallCatalogProduct): CedrosProductDefinition;
export declare function createCedrosProductCatalogFromPaywallProducts(products: PaywallCatalogProduct[]): CedrosProductCatalog;
export declare function fetchCedrosProductCatalog(options: {
    serverUrl: string;
    apiKey?: string;
    limit?: number;
    signal?: AbortSignal;
}): Promise<CedrosProductCatalog>;
//# sourceMappingURL=paywallProductCatalog.d.ts.map