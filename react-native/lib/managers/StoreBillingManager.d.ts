import type { CedrosProductDefinition, CedrosStoreBillingConfig, DistributionChannel, NativeStoreMethod, NativeStoreCheckoutContext, NativeStorePurchaseRequest, NativeStorePurchaseResult } from '../types/storePolicy';
import type { IRouteDiscoveryManager } from './RouteDiscoveryManager';
export interface StoreBillingPurchaseOptions extends NativeStorePurchaseRequest {
    method: NativeStoreMethod;
}
export interface StoreBillingRestoreOptions {
    product?: CedrosProductDefinition;
    products?: CedrosProductDefinition[];
    distributionChannel?: DistributionChannel;
    checkout?: NativeStoreCheckoutContext;
}
export interface StoreSubscriptionManagementOptions {
    product?: CedrosProductDefinition;
    distributionChannel?: DistributionChannel;
}
export interface IStoreBillingManager {
    initialize(): Promise<void>;
    isInitialized(): boolean;
    purchase(request: StoreBillingPurchaseOptions): Promise<NativeStorePurchaseResult>;
    restorePurchases(options?: CedrosProductDefinition | StoreBillingRestoreOptions): Promise<NativeStorePurchaseResult[]>;
    openManageSubscriptions(options?: StoreSubscriptionManagementOptions): Promise<void>;
    destroy(): Promise<void>;
}
/**
 * Built-in native store billing manager.
 *
 * This owns StoreKit / Google Play Billing integration for turnkey Cedros
 * React Native usage. Host apps can still override execution with
 * `paymentPolicy.nativeHandlers`, but they no longer have to wire billing
 * themselves for normal Apple / Google store flows.
 */
export declare class StoreBillingManager implements IStoreBillingManager {
    private initialized;
    private readonly productCache;
    private readonly subscriptionCache;
    private readonly config;
    private readonly routeDiscovery;
    constructor(routeDiscovery: IRouteDiscoveryManager, config?: CedrosStoreBillingConfig);
    initialize(): Promise<void>;
    isInitialized(): boolean;
    purchase(request: StoreBillingPurchaseOptions): Promise<NativeStorePurchaseResult>;
    restorePurchases(value?: CedrosProductDefinition | StoreBillingRestoreOptions): Promise<NativeStorePurchaseResult[]>;
    openManageSubscriptions(options?: StoreSubscriptionManagementOptions): Promise<void>;
    destroy(): Promise<void>;
    private assertPlatform;
    private resolveKind;
    private lookupProduct;
    private lookupSubscription;
    private requestApplePurchase;
    private requestGooglePlayPurchase;
    private verifyWithCedrosServer;
}
//# sourceMappingURL=StoreBillingManager.d.ts.map