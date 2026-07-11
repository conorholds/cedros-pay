"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StoreBillingManager = void 0;
const react_native_1 = require("react-native");
const react_native_iap_1 = require("react-native-iap");
const logger_1 = require("../utils/logger");
const fetchWithTimeout_1 = require("../utils/fetchWithTimeout");
const errorHandling_1 = require("../utils/errorHandling");
const uuid_1 = require("../utils/uuid");
const resolveStoreProductConfiguration_1 = require("../policy/resolveStoreProductConfiguration");
function normalizePurchaseResult(purchase) {
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
function extractTransactionId(purchase) {
    return (purchase.transactionId ??
        purchase.purchaseToken ??
        purchase.originalTransactionIdentifierIOS ??
        purchase.productId);
}
function getCandidateRestoreProductIds(product) {
    return new Set([
        product.id,
        product.storeProduct?.apple?.productId,
        product.storeProduct?.google?.productId,
    ].filter((value) => typeof value === 'string' && value.length > 0));
}
function getPlatformMismatchError(method) {
    return method === 'apple_iap'
        ? 'Apple In-App Purchase can only run on iOS builds.'
        : 'Google Play Billing can only run on Android builds.';
}
function isRestoreOptions(value) {
    if (!value || typeof value !== 'object') {
        return false;
    }
    return ('product' in value ||
        'products' in value ||
        'distributionChannel' in value ||
        'checkout' in value);
}
function normalizeRestoreOptions(value) {
    if (!value) {
        return {};
    }
    return isRestoreOptions(value) ? value : { product: value };
}
function normalizeRestoreProducts(options) {
    const combined = [
        ...(options.products ?? []),
        ...(options.product ? [options.product] : []),
    ];
    const seen = new Set();
    return combined.filter((product) => {
        if (!product?.id || seen.has(product.id)) {
            return false;
        }
        seen.add(product.id);
        return true;
    });
}
function inferCurrentStoreChannel() {
    if (react_native_1.Platform.OS === 'ios') {
        return 'apple_app_store';
    }
    if (react_native_1.Platform.OS === 'android') {
        return 'google_play_store';
    }
    return 'unknown';
}
function resolveMethodForChannel(distributionChannel) {
    if (distributionChannel === 'apple_app_store') {
        return 'apple_iap';
    }
    if (distributionChannel === 'google_play_store') {
        return 'google_play_billing';
    }
    return null;
}
function isRestorableKind(kind) {
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
class StoreBillingManager {
    constructor(routeDiscovery, config) {
        this.initialized = false;
        this.productCache = new Map();
        this.subscriptionCache = new Map();
        this.routeDiscovery = routeDiscovery;
        this.config = config ?? {};
    }
    async initialize() {
        if (this.initialized) {
            return;
        }
        if (this.config.enabled === false) {
            throw new Error('Built-in store billing is disabled for this CedrosProvider.');
        }
        const storekitMode = (this.config.storekitMode ?? 'STOREKIT_HYBRID_MODE');
        (0, react_native_iap_1.setup)({ storekitMode });
        const connected = await (0, react_native_iap_1.initConnection)();
        if (!connected) {
            throw new Error('Failed to initialize native store billing.');
        }
        if (react_native_1.Platform.OS === 'android') {
            try {
                await (0, react_native_iap_1.flushFailedPurchasesCachedAsPendingAndroid)();
            }
            catch (error) {
                (0, logger_1.getLogger)().warn('[StoreBillingManager] Failed to flush pending Android purchases:', error);
            }
        }
        this.initialized = true;
    }
    isInitialized() {
        return this.initialized;
    }
    async purchase(request) {
        await this.initialize();
        this.assertPlatform(request.method);
        const resolvedProduct = (0, resolveStoreProductConfiguration_1.resolveStoreProductConfiguration)(request.product, request.distributionChannel);
        if (!resolvedProduct) {
            throw new Error('Native store billing is only available for Apple App Store and Google Play Store channels.');
        }
        const kind = await this.resolveKind(request.product, resolvedProduct.productId);
        let purchase;
        if (request.method === 'apple_iap') {
            purchase = await this.requestApplePurchase(resolvedProduct.productId, kind, request);
        }
        else {
            purchase = await this.requestGooglePlayPurchase(resolvedProduct.productId, kind, request);
        }
        const serverVerification = await this.verifyWithCedrosServer(request, resolvedProduct.productId, purchase);
        if (this.config.transactionHandling !== 'manual') {
            await (0, react_native_iap_1.finishTransaction)({
                purchase,
                isConsumable: kind === 'consumable',
            });
        }
        const transactionId = serverVerification.transactionId || extractTransactionId(purchase);
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
    async restorePurchases(value) {
        await this.initialize();
        const options = normalizeRestoreOptions(value);
        const restored = await (0, react_native_iap_1.getAvailablePurchases)();
        const products = normalizeRestoreProducts(options);
        if (products.length === 0) {
            return restored.map((purchase) => ({
                transactionId: extractTransactionId(purchase),
                rawResult: purchase,
            }));
        }
        const distributionChannel = options.distributionChannel ?? inferCurrentStoreChannel();
        const method = resolveMethodForChannel(distributionChannel);
        if (!method) {
            throw new Error('Native store restore requires an Apple App Store or Google Play Store distribution channel.');
        }
        this.assertPlatform(method);
        const productsByStoreId = new Map();
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
            .filter((entry) => Boolean(entry.product));
        const verifiedResults = [];
        for (const entry of matchedPurchases) {
            const kind = await this.resolveKind(entry.product, entry.purchase.productId);
            if (!isRestorableKind(kind)) {
                continue;
            }
            const request = {
                method,
                product: entry.product,
                distributionChannel,
                fulfillmentType: entry.product.fulfillmentType,
                checkout: options.checkout,
            };
            const serverVerification = await this.verifyWithCedrosServer(request, entry.purchase.productId, entry.purchase);
            verifiedResults.push({
                transactionId: serverVerification.transactionId || extractTransactionId(entry.purchase),
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
    async openManageSubscriptions(options = {}) {
        await this.initialize();
        const distributionChannel = options.distributionChannel ?? inferCurrentStoreChannel();
        const method = resolveMethodForChannel(distributionChannel);
        if (!method) {
            throw new Error('Native subscription management is only available for Apple App Store and Google Play Store channels.');
        }
        this.assertPlatform(method);
        if (method === 'apple_iap') {
            if (options.product) {
                const resolvedProduct = (0, resolveStoreProductConfiguration_1.resolveStoreProductConfiguration)(options.product, distributionChannel);
                if (resolvedProduct) {
                    const kind = await this.resolveKind(options.product, resolvedProduct.productId);
                    if (kind !== 'auto_renewable_subscription') {
                        throw new Error('Subscription management is only available for store-managed subscription products.');
                    }
                }
            }
            await (0, react_native_iap_1.deepLinkToSubscriptions)({});
            return;
        }
        if (!options.product) {
            throw new Error('Google Play subscription management requires a subscription product so Cedros can open the correct Play Store page.');
        }
        const resolvedProduct = (0, resolveStoreProductConfiguration_1.resolveStoreProductConfiguration)(options.product, distributionChannel);
        if (!resolvedProduct) {
            throw new Error('Google Play subscription management requires a store-managed Google Play product.');
        }
        const kind = await this.resolveKind(options.product, resolvedProduct.productId);
        if (kind !== 'auto_renewable_subscription') {
            throw new Error('Subscription management is only available for store-managed subscription products.');
        }
        await (0, react_native_iap_1.deepLinkToSubscriptions)({ sku: resolvedProduct.productId });
    }
    async destroy() {
        if (!this.initialized) {
            return;
        }
        await (0, react_native_iap_1.endConnection)();
        this.initialized = false;
        this.productCache.clear();
        this.subscriptionCache.clear();
    }
    assertPlatform(method) {
        if (method === 'apple_iap' && react_native_1.Platform.OS !== 'ios') {
            throw new Error(getPlatformMismatchError(method));
        }
        if (method === 'google_play_billing' && react_native_1.Platform.OS !== 'android') {
            throw new Error(getPlatformMismatchError(method));
        }
    }
    async resolveKind(product, productId) {
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
        throw new Error(`No App Store / Play Store product was found for "${productId}". Add a store product id or publish the matching store product first.`);
    }
    async lookupProduct(productId) {
        const cached = this.productCache.get(productId);
        if (cached) {
            return cached;
        }
        const products = await (0, react_native_iap_1.getProducts)({ skus: [productId] });
        const product = products.find((entry) => entry.productId === productId) ?? null;
        if (product) {
            this.productCache.set(productId, product);
        }
        return product;
    }
    async lookupSubscription(productId) {
        const cached = this.subscriptionCache.get(productId);
        if (cached) {
            return cached;
        }
        const subscriptions = await (0, react_native_iap_1.getSubscriptions)({ skus: [productId] });
        const subscription = subscriptions.find((entry) => entry.productId === productId) ?? null;
        if (subscription) {
            this.subscriptionCache.set(productId, subscription);
        }
        return subscription;
    }
    async requestApplePurchase(productId, kind, request) {
        const appleConfig = request.product.storeProduct?.apple;
        if (kind === 'auto_renewable_subscription') {
            return normalizePurchaseResult(await (0, react_native_iap_1.requestSubscription)({
                sku: productId,
                appAccountToken: appleConfig?.appAccountToken,
                andDangerouslyFinishTransactionAutomaticallyIOS: false,
            }));
        }
        return normalizePurchaseResult(await (0, react_native_iap_1.requestPurchase)({
            sku: productId,
            quantity: appleConfig?.quantity,
            appAccountToken: appleConfig?.appAccountToken,
            andDangerouslyFinishTransactionAutomaticallyIOS: false,
        }));
    }
    async requestGooglePlayPurchase(productId, kind, request) {
        const googleConfig = request.product.storeProduct?.google;
        if (kind === 'auto_renewable_subscription') {
            const subscription = await this.lookupSubscription(productId);
            if (!subscription) {
                throw new Error(`Google Play subscription "${productId}" was not found in the current build.`);
            }
            const offer = (0, resolveStoreProductConfiguration_1.selectGooglePlayOffer)(subscription, googleConfig);
            if (!offer) {
                throw new Error(`Google Play subscription "${productId}" has multiple offers or no matching offer token. Add basePlanId / offerId / offerToken to the Cedros product configuration.`);
            }
            return normalizePurchaseResult(await (0, react_native_iap_1.requestSubscription)({
                subscriptionOffers: [{ sku: productId, offerToken: offer.offerToken }],
                purchaseTokenAndroid: googleConfig?.purchaseTokenAndroid,
                replacementModeAndroid: googleConfig?.replacementModeAndroid,
                obfuscatedAccountIdAndroid: googleConfig?.obfuscatedAccountIdAndroid,
                obfuscatedProfileIdAndroid: googleConfig?.obfuscatedProfileIdAndroid,
                isOfferPersonalized: googleConfig?.isOfferPersonalized,
            }));
        }
        return normalizePurchaseResult(await (0, react_native_iap_1.requestPurchase)({
            skus: [productId],
            obfuscatedAccountIdAndroid: googleConfig?.obfuscatedAccountIdAndroid,
            obfuscatedProfileIdAndroid: googleConfig?.obfuscatedProfileIdAndroid,
            isOfferPersonalized: googleConfig?.isOfferPersonalized,
        }));
    }
    async verifyWithCedrosServer(request, storeProductId, purchase) {
        const url = await this.routeDiscovery.buildUrl('/paywall/v1/native-store/verify');
        const response = await (0, fetchWithTimeout_1.fetchWithTimeout)(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Idempotency-Key': (0, uuid_1.generateUUID)(),
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
                packageName: purchase.packageNameAndroid ??
                    request.product.storeProduct?.google?.packageName,
                metadata: request.checkout?.metadata ?? {},
            }),
        });
        if (!response.ok) {
            const errorMessage = await (0, errorHandling_1.parseErrorResponse)(response, 'Native store purchase verification failed');
            throw new Error(errorMessage);
        }
        return (await response.json());
    }
}
exports.StoreBillingManager = StoreBillingManager;
//# sourceMappingURL=StoreBillingManager.js.map