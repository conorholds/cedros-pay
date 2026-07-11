export type DistributionChannel = 'apple_app_store' | 'google_play_store' | 'solana_dapp_store' | 'android_sideload' | 'web' | 'unknown';
export type StorefrontRegion = 'us' | 'eea' | 'south_korea' | 'other' | 'unknown';
export type FulfillmentType = 'digital_in_app' | 'physical_goods' | 'real_world_service' | 'reader_content' | 'other';
export type NativeStoreMethod = 'apple_iap' | 'google_play_billing';
export type OrchestratedPaymentMethod = NativeStoreMethod | 'stripe' | 'x402' | 'crypto' | 'credits';
export type PaymentAdapter = OrchestratedPaymentMethod;
export type AvailablePaymentAdapters = Partial<Record<PaymentAdapter, boolean>>;
export type StoreManagedProductKind = 'consumable' | 'non_consumable' | 'auto_renewable_subscription';
export type StorekitMode = 'STOREKIT1_MODE' | 'STOREKIT_HYBRID_MODE' | 'STOREKIT2_MODE';
export type StoreTransactionHandling = 'auto_finish' | 'manual';
export interface AppleStoreProductConfig {
    productId?: string;
    appAccountToken?: string;
    quantity?: number;
}
export interface GooglePlayStoreProductConfig {
    productId?: string;
    packageName?: string;
    basePlanId?: string;
    offerId?: string | null;
    offerToken?: string;
    purchaseTokenAndroid?: string;
    obfuscatedAccountIdAndroid?: string;
    obfuscatedProfileIdAndroid?: string;
    replacementModeAndroid?: number;
    isOfferPersonalized?: boolean;
}
export interface CedrosStoreProductConfig {
    kind?: StoreManagedProductKind;
    apple?: AppleStoreProductConfig;
    google?: GooglePlayStoreProductConfig;
}
export interface CedrosProductDefinition {
    id: string;
    name?: string;
    fulfillmentType: FulfillmentType;
    storeProduct?: CedrosStoreProductConfig;
}
export type CedrosProductCatalog = Record<string, CedrosProductDefinition>;
export interface CedrosProductCatalogSyncConfig {
    enabled?: boolean;
    limit?: number;
}
export interface AppleStorePolicyPrograms {
    usStorefrontExternalPurchaseLink?: boolean;
    readerExternalLinkAccount?: boolean;
}
export interface GooglePlayPolicyPrograms {
    userChoiceBilling?: boolean;
    alternativeBillingOnly?: boolean;
    externalOffers?: boolean;
}
export interface PaymentPolicyPrograms {
    apple?: AppleStorePolicyPrograms;
    google?: GooglePlayPolicyPrograms;
}
export type PaymentPolicyFailureCode = 'unsupported_purchase_mode' | 'distribution_channel_required' | 'storefront_region_required' | 'native_adapter_missing' | 'policy_restricted' | 'policy_program_required' | 'no_allowed_payment_methods';
export interface PaymentPolicyFailure {
    code: PaymentPolicyFailureCode;
    message: string;
}
export type PaymentPolicyPurchaseMode = 'single' | 'cart';
export interface PaymentPolicyContext {
    distributionChannel: DistributionChannel;
    storefrontRegion?: StorefrontRegion;
    product: CedrosProductDefinition;
    availableAdapters: AvailablePaymentAdapters;
    programs?: PaymentPolicyPrograms;
    strictMode?: boolean;
    purchaseMode?: PaymentPolicyPurchaseMode;
}
export interface PaymentPolicyResolution {
    product: CedrosProductDefinition;
    distributionChannel: DistributionChannel;
    storefrontRegion: StorefrontRegion;
    strictMode: boolean;
    allowedPaymentMethods: OrchestratedPaymentMethod[];
    failure?: PaymentPolicyFailure;
}
export interface NativeStoreCheckoutContext {
    customerEmail?: string;
    successUrl?: string;
    cancelUrl?: string;
    couponCode?: string;
    authToken?: string;
    metadata?: Record<string, unknown>;
}
export interface NativeStorePurchaseRequest {
    product: CedrosProductDefinition;
    distributionChannel: DistributionChannel;
    fulfillmentType?: FulfillmentType;
    checkout?: NativeStoreCheckoutContext;
}
export interface NativeStoreRestoreRequest {
    products?: CedrosProductDefinition[];
    distributionChannel: DistributionChannel;
    checkout?: NativeStoreCheckoutContext;
}
export interface NativeStoreManageSubscriptionsRequest {
    product?: CedrosProductDefinition;
    distributionChannel: DistributionChannel;
}
export interface NativeStorePurchaseResult {
    transactionId: string;
    rawResult?: unknown;
}
export interface NativeStorePaymentHandler {
    label?: string;
    purchase(request: NativeStorePurchaseRequest): Promise<NativeStorePurchaseResult>;
    restorePurchases?(request: NativeStoreRestoreRequest): Promise<NativeStorePurchaseResult[]>;
    openManageSubscriptions?(request: NativeStoreManageSubscriptionsRequest): Promise<void>;
}
export interface CedrosStoreBillingConfig {
    enabled?: boolean;
    storekitMode?: StorekitMode;
    transactionHandling?: StoreTransactionHandling;
}
export interface CedrosPayPolicyOverrides {
    distributionChannel?: DistributionChannel;
    storefrontRegion?: StorefrontRegion;
    strictMode?: boolean;
    availableAdapters?: AvailablePaymentAdapters;
    programs?: PaymentPolicyPrograms;
}
export interface CedrosPaymentPolicyConfig extends CedrosPayPolicyOverrides {
    distributionChannelResolver?: () => DistributionChannel | undefined;
    storefrontRegionResolver?: () => StorefrontRegion | undefined;
    productCatalog?: CedrosProductCatalog;
    productCatalogSync?: CedrosProductCatalogSyncConfig;
    storeBilling?: CedrosStoreBillingConfig;
    nativeHandlers?: Partial<Record<NativeStoreMethod, NativeStorePaymentHandler>>;
}
//# sourceMappingURL=storePolicy.d.ts.map