import type { CedrosProductDefinition, CedrosStoreProductConfig, DistributionChannel, GooglePlayStoreProductConfig, StoreManagedProductKind } from '../types/storePolicy';
export interface MergeCedrosProductDefinitionArgs {
    fallbackId?: string;
    fallbackFulfillmentType?: CedrosProductDefinition['fulfillmentType'];
    catalogProduct?: CedrosProductDefinition;
    explicitProduct?: CedrosProductDefinition;
}
export interface ResolvedStoreProductConfiguration {
    productId: string;
    kind: StoreManagedProductKind;
    usedDefaultKind: boolean;
    storeProduct: CedrosStoreProductConfig;
}
export interface GooglePlaySubscriptionOfferLike {
    basePlanId: string;
    offerId: string | null;
    offerToken: string;
}
export interface GooglePlaySubscriptionLike {
    productId: string;
    subscriptionOfferDetails?: GooglePlaySubscriptionOfferLike[];
}
export declare function mergeCedrosProductDefinition({ fallbackId, fallbackFulfillmentType, catalogProduct, explicitProduct, }: MergeCedrosProductDefinitionArgs): CedrosProductDefinition | undefined;
export declare function resolveStoreProductConfiguration(product: CedrosProductDefinition, distributionChannel: DistributionChannel): ResolvedStoreProductConfiguration | null;
export declare function selectGooglePlayOffer(subscription: GooglePlaySubscriptionLike, config?: GooglePlayStoreProductConfig): GooglePlaySubscriptionOfferLike | null;
//# sourceMappingURL=resolveStoreProductConfiguration.d.ts.map