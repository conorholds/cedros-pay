"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveNativeStoreMethod = resolveNativeStoreMethod;
exports.isRestorableStoreProduct = isRestorableStoreProduct;
exports.isManageableStoreSubscription = isManageableStoreSubscription;
function resolveNativeStoreMethod(distributionChannel) {
    if (distributionChannel === 'apple_app_store') {
        return 'apple_iap';
    }
    if (distributionChannel === 'google_play_store') {
        return 'google_play_billing';
    }
    return null;
}
function isRestorableStoreProduct(product) {
    if (!product) {
        return false;
    }
    return product.storeProduct?.kind !== 'consumable';
}
function isManageableStoreSubscription(product) {
    return product?.storeProduct?.kind === 'auto_renewable_subscription';
}
//# sourceMappingURL=nativeStoreSupport.js.map