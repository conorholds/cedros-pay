import { Platform } from 'react-native';
import {
  deepLinkToSubscriptions,
  endConnection,
  finishTransaction,
  flushFailedPurchasesCachedAsPendingAndroid,
  getAvailablePurchases,
  getProducts,
  getSubscriptions,
  initConnection,
  requestPurchase,
  requestSubscription,
  setup,
  type Product,
  type Purchase,
  type STOREKIT_OPTIONS,
  type Subscription,
} from 'react-native-iap';
import { getLogger } from '../utils/logger';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';
import { parseErrorResponse } from '../utils/errorHandling';
import { generateUUID } from '../utils/uuid';
import {
  resolveStoreProductConfiguration,
  selectGooglePlayOffer,
} from '../policy/resolveStoreProductConfiguration';
import type {
  CedrosProductDefinition,
  CedrosStoreBillingConfig,
  DistributionChannel,
  NativeStoreMethod,
  NativeStoreCheckoutContext,
  NativeStorePurchaseRequest,
  NativeStorePurchaseResult,
  StoreManagedProductKind,
} from '../types/storePolicy';
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
  purchase(
    request: StoreBillingPurchaseOptions
  ): Promise<NativeStorePurchaseResult>;
  restorePurchases(
    options?: CedrosProductDefinition | StoreBillingRestoreOptions
  ): Promise<NativeStorePurchaseResult[]>;
  openManageSubscriptions(
    options?: StoreSubscriptionManagementOptions
  ): Promise<void>;
  destroy(): Promise<void>;
}

interface NativeStoreServerVerificationResponse {
  success: boolean;
  transactionId: string;
  method: string;
  subscriptionId?: string;
  subscriptionStatus?: string;
  currentPeriodEnd?: string;
}

function normalizePurchaseResult(
  purchase: Purchase | Purchase[] | null | void
): Purchase {
  if (Array.isArray(purchase)) {
    if (purchase.length === 0) {
      throw new Error('Native store purchase completed without a transaction.');
    }

    return purchase[0];
  }

  if (!purchase) {
    throw new Error('Native store purchase completed without a transaction.');
  }

  return purchase;
}

function extractTransactionId(purchase: Purchase): string {
  return (
    purchase.transactionId ??
    purchase.purchaseToken ??
    purchase.originalTransactionIdentifierIOS ??
    purchase.productId
  );
}

function getCandidateRestoreProductIds(product: CedrosProductDefinition): Set<string> {
  return new Set(
    [
      product.id,
      product.storeProduct?.apple?.productId,
      product.storeProduct?.google?.productId,
    ].filter((value): value is string => typeof value === 'string' && value.length > 0)
  );
}

function getPlatformMismatchError(method: NativeStoreMethod): string {
  return method === 'apple_iap'
    ? 'Apple In-App Purchase can only run on iOS builds.'
    : 'Google Play Billing can only run on Android builds.';
}

function isRestoreOptions(
  value: CedrosProductDefinition | StoreBillingRestoreOptions | undefined
): value is StoreBillingRestoreOptions {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return (
    'product' in value ||
    'products' in value ||
    'distributionChannel' in value ||
    'checkout' in value
  );
}

function normalizeRestoreOptions(
  value?: CedrosProductDefinition | StoreBillingRestoreOptions
): StoreBillingRestoreOptions {
  if (!value) {
    return {};
  }

  return isRestoreOptions(value) ? value : { product: value };
}

function normalizeRestoreProducts(
  options: StoreBillingRestoreOptions
): CedrosProductDefinition[] {
  const combined = [
    ...(options.products ?? []),
    ...(options.product ? [options.product] : []),
  ];

  const seen = new Set<string>();

  return combined.filter((product) => {
    if (!product?.id || seen.has(product.id)) {
      return false;
    }

    seen.add(product.id);
    return true;
  });
}

function inferCurrentStoreChannel(): DistributionChannel {
  if (Platform.OS === 'ios') {
    return 'apple_app_store';
  }

  if (Platform.OS === 'android') {
    return 'google_play_store';
  }

  return 'unknown';
}

function resolveMethodForChannel(
  distributionChannel: DistributionChannel
): NativeStoreMethod | null {
  if (distributionChannel === 'apple_app_store') {
    return 'apple_iap';
  }

  if (distributionChannel === 'google_play_store') {
    return 'google_play_billing';
  }

  return null;
}

function isRestorableKind(kind: StoreManagedProductKind): boolean {
  return kind !== 'consumable';
}

/**
 * Built-in native store billing manager.
 *
 * This owns StoreKit / Google Play Billing integration for turnkey Cedros
 * React Native usage. Host apps can still override execution with
 * `paymentPolicy.nativeHandlers`, but they no longer have to wire billing
 * themselves for normal Apple / Google store flows.
 */
export class StoreBillingManager implements IStoreBillingManager {
  private initialized = false;
  private readonly productCache = new Map<string, Product>();
  private readonly subscriptionCache = new Map<string, Subscription>();
  private readonly config: CedrosStoreBillingConfig;
  private readonly routeDiscovery: IRouteDiscoveryManager;

  constructor(routeDiscovery: IRouteDiscoveryManager, config?: CedrosStoreBillingConfig) {
    this.routeDiscovery = routeDiscovery;
    this.config = config ?? {};
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (this.config.enabled === false) {
      throw new Error('Built-in store billing is disabled for this CedrosProvider.');
    }

    const storekitMode =
      (this.config.storekitMode ?? 'STOREKIT_HYBRID_MODE') as STOREKIT_OPTIONS;

    setup({ storekitMode });

    const connected = await initConnection();
    if (!connected) {
      throw new Error('Failed to initialize native store billing.');
    }

    if (Platform.OS === 'android') {
      try {
        await flushFailedPurchasesCachedAsPendingAndroid();
      } catch (error) {
        getLogger().warn(
          '[StoreBillingManager] Failed to flush pending Android purchases:',
          error
        );
      }
    }

    this.initialized = true;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  async purchase(
    request: StoreBillingPurchaseOptions
  ): Promise<NativeStorePurchaseResult> {
    await this.initialize();
    this.assertPlatform(request.method);

    const resolvedProduct = resolveStoreProductConfiguration(
      request.product,
      request.distributionChannel
    );

    if (!resolvedProduct) {
      throw new Error(
        'Native store billing is only available for Apple App Store and Google Play Store channels.'
      );
    }

    const kind = await this.resolveKind(request.product, resolvedProduct.productId);

    let purchase: Purchase;

    if (request.method === 'apple_iap') {
      purchase = await this.requestApplePurchase(
        resolvedProduct.productId,
        kind,
        request
      );
    } else {
      purchase = await this.requestGooglePlayPurchase(
        resolvedProduct.productId,
        kind,
        request
      );
    }

    const serverVerification = await this.verifyWithCedrosServer(
      request,
      resolvedProduct.productId,
      purchase
    );

    if (this.config.transactionHandling !== 'manual') {
      await finishTransaction({
        purchase,
        isConsumable: kind === 'consumable',
      });
    }

    const transactionId =
      serverVerification.transactionId || extractTransactionId(purchase);
    return {
      transactionId,
      rawResult: {
        purchase,
        kind,
        storeProductId: resolvedProduct.productId,
        serverVerification,
      },
    };
  }

  async restorePurchases(
    value?: CedrosProductDefinition | StoreBillingRestoreOptions
  ): Promise<NativeStorePurchaseResult[]> {
    await this.initialize();

    const options = normalizeRestoreOptions(value);
    const restored = await getAvailablePurchases();
    const products = normalizeRestoreProducts(options);

    if (products.length === 0) {
      return restored.map((purchase) => ({
        transactionId: extractTransactionId(purchase),
        rawResult: purchase,
      }));
    }

    const distributionChannel =
      options.distributionChannel ?? inferCurrentStoreChannel();
    const method = resolveMethodForChannel(distributionChannel);

    if (!method) {
      throw new Error(
        'Native store restore requires an Apple App Store or Google Play Store distribution channel.'
      );
    }

    this.assertPlatform(method);

    const productsByStoreId = new Map<string, CedrosProductDefinition>();
    products.forEach((product) => {
      getCandidateRestoreProductIds(product).forEach((candidateId) => {
        if (!productsByStoreId.has(candidateId)) {
          productsByStoreId.set(candidateId, product);
        }
      });
    });

    const matchedPurchases = restored
      .map((purchase) => ({
        purchase,
        product: productsByStoreId.get(purchase.productId),
      }))
      .filter(
        (
          entry
        ): entry is { purchase: Purchase; product: CedrosProductDefinition } =>
          Boolean(entry.product)
      );

    const verifiedResults: NativeStorePurchaseResult[] = [];

    for (const entry of matchedPurchases) {
      const kind = await this.resolveKind(entry.product, entry.purchase.productId);
      if (!isRestorableKind(kind)) {
        continue;
      }

      const request: StoreBillingPurchaseOptions = {
        method,
        product: entry.product,
        distributionChannel,
        fulfillmentType: entry.product.fulfillmentType,
        checkout: options.checkout,
      };
      const serverVerification = await this.verifyWithCedrosServer(
        request,
        entry.purchase.productId,
        entry.purchase
      );

      verifiedResults.push({
        transactionId:
          serverVerification.transactionId || extractTransactionId(entry.purchase),
        rawResult: {
          purchase: entry.purchase,
          kind,
          storeProductId: entry.purchase.productId,
          serverVerification,
          restored: true,
        },
      });
    }

    return verifiedResults;
  }

  async openManageSubscriptions(
    options: StoreSubscriptionManagementOptions = {}
  ): Promise<void> {
    await this.initialize();

    const distributionChannel =
      options.distributionChannel ?? inferCurrentStoreChannel();
    const method = resolveMethodForChannel(distributionChannel);

    if (!method) {
      throw new Error(
        'Native subscription management is only available for Apple App Store and Google Play Store channels.'
      );
    }

    this.assertPlatform(method);

    if (method === 'apple_iap') {
      if (options.product) {
        const resolvedProduct = resolveStoreProductConfiguration(
          options.product,
          distributionChannel
        );
        if (resolvedProduct) {
          const kind = await this.resolveKind(
            options.product,
            resolvedProduct.productId
          );
          if (kind !== 'auto_renewable_subscription') {
            throw new Error(
              'Subscription management is only available for store-managed subscription products.'
            );
          }
        }
      }

      await deepLinkToSubscriptions({});
      return;
    }

    if (!options.product) {
      throw new Error(
        'Google Play subscription management requires a subscription product so Cedros can open the correct Play Store page.'
      );
    }

    const resolvedProduct = resolveStoreProductConfiguration(
      options.product,
      distributionChannel
    );

    if (!resolvedProduct) {
      throw new Error(
        'Google Play subscription management requires a store-managed Google Play product.'
      );
    }

    const kind = await this.resolveKind(options.product, resolvedProduct.productId);
    if (kind !== 'auto_renewable_subscription') {
      throw new Error(
        'Subscription management is only available for store-managed subscription products.'
      );
    }

    await deepLinkToSubscriptions({ sku: resolvedProduct.productId });
  }

  async destroy(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    await endConnection();
    this.initialized = false;
    this.productCache.clear();
    this.subscriptionCache.clear();
  }

  private assertPlatform(method: NativeStoreMethod) {
    if (method === 'apple_iap' && Platform.OS !== 'ios') {
      throw new Error(getPlatformMismatchError(method));
    }

    if (method === 'google_play_billing' && Platform.OS !== 'android') {
      throw new Error(getPlatformMismatchError(method));
    }
  }

  private async resolveKind(
    product: CedrosProductDefinition,
    productId: string
  ): Promise<StoreManagedProductKind> {
    if (product.storeProduct?.kind) {
      return product.storeProduct.kind;
    }

    const subscription = await this.lookupSubscription(productId).catch(() => null);
    if (subscription) {
      return 'auto_renewable_subscription';
    }

    const inAppProduct = await this.lookupProduct(productId).catch(() => null);
    if (inAppProduct) {
      return 'non_consumable';
    }

    throw new Error(
      `No App Store / Play Store product was found for "${productId}". Add a store product id or publish the matching store product first.`
    );
  }

  private async lookupProduct(productId: string): Promise<Product | null> {
    const cached = this.productCache.get(productId);
    if (cached) {
      return cached;
    }

    const products = await getProducts({ skus: [productId] });
    const product = products.find((entry) => entry.productId === productId) ?? null;

    if (product) {
      this.productCache.set(productId, product);
    }

    return product;
  }

  private async lookupSubscription(productId: string): Promise<Subscription | null> {
    const cached = this.subscriptionCache.get(productId);
    if (cached) {
      return cached;
    }

    const subscriptions = await getSubscriptions({ skus: [productId] });
    const subscription =
      subscriptions.find((entry) => entry.productId === productId) ?? null;

    if (subscription) {
      this.subscriptionCache.set(productId, subscription);
    }

    return subscription;
  }

  private async requestApplePurchase(
    productId: string,
    kind: StoreManagedProductKind,
    request: NativeStorePurchaseRequest
  ): Promise<Purchase> {
    const appleConfig = request.product.storeProduct?.apple;

    if (kind === 'auto_renewable_subscription') {
      return normalizePurchaseResult(
        await requestSubscription({
          sku: productId,
          appAccountToken: appleConfig?.appAccountToken,
          andDangerouslyFinishTransactionAutomaticallyIOS: false,
        })
      );
    }

    return normalizePurchaseResult(
      await requestPurchase({
        sku: productId,
        quantity: appleConfig?.quantity,
        appAccountToken: appleConfig?.appAccountToken,
        andDangerouslyFinishTransactionAutomaticallyIOS: false,
      })
    );
  }

  private async requestGooglePlayPurchase(
    productId: string,
    kind: StoreManagedProductKind,
    request: NativeStorePurchaseRequest
  ): Promise<Purchase> {
    const googleConfig = request.product.storeProduct?.google;

    if (kind === 'auto_renewable_subscription') {
      const subscription = await this.lookupSubscription(productId);
      if (!subscription) {
        throw new Error(
          `Google Play subscription "${productId}" was not found in the current build.`
        );
      }

      const offer = selectGooglePlayOffer(subscription, googleConfig);
      if (!offer) {
        throw new Error(
          `Google Play subscription "${productId}" has multiple offers or no matching offer token. Add basePlanId / offerId / offerToken to the Cedros product configuration.`
        );
      }

      return normalizePurchaseResult(
        await requestSubscription({
          subscriptionOffers: [{ sku: productId, offerToken: offer.offerToken }],
          purchaseTokenAndroid: googleConfig?.purchaseTokenAndroid,
          replacementModeAndroid: googleConfig?.replacementModeAndroid,
          obfuscatedAccountIdAndroid: googleConfig?.obfuscatedAccountIdAndroid,
          obfuscatedProfileIdAndroid: googleConfig?.obfuscatedProfileIdAndroid,
          isOfferPersonalized: googleConfig?.isOfferPersonalized,
        })
      );
    }

    return normalizePurchaseResult(
      await requestPurchase({
        skus: [productId],
        obfuscatedAccountIdAndroid: googleConfig?.obfuscatedAccountIdAndroid,
        obfuscatedProfileIdAndroid: googleConfig?.obfuscatedProfileIdAndroid,
        isOfferPersonalized: googleConfig?.isOfferPersonalized,
      })
    );
  }

  private async verifyWithCedrosServer(
    request: StoreBillingPurchaseOptions,
    storeProductId: string,
    purchase: Purchase
  ): Promise<NativeStoreServerVerificationResponse> {
    const url = await this.routeDiscovery.buildUrl('/paywall/v1/native-store/verify');

    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': generateUUID(),
        ...(request.checkout?.authToken
          ? { Authorization: `Bearer ${request.checkout.authToken}` }
          : {}),
      },
      body: JSON.stringify({
        productId: request.product.id,
        method: request.method,
        storeProductId,
        transactionId: purchase.transactionId,
        originalTransactionId: purchase.originalTransactionIdentifierIOS,
        purchaseToken: purchase.purchaseToken,
        packageName:
          purchase.packageNameAndroid ??
          request.product.storeProduct?.google?.packageName,
        metadata: request.checkout?.metadata ?? {},
      }),
    });

    if (!response.ok) {
      const errorMessage = await parseErrorResponse(
        response,
        'Native store purchase verification failed'
      );
      throw new Error(errorMessage);
    }

    return (await response.json()) as NativeStoreServerVerificationResponse;
  }
}
