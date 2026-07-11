"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeCedrosProductDefinition = mergeCedrosProductDefinition;
exports.resolveStoreProductConfiguration = resolveStoreProductConfiguration;
exports.selectGooglePlayOffer = selectGooglePlayOffer;
function mergeStoreProduct(catalogStoreProduct, explicitStoreProduct) {
    if (!catalogStoreProduct && !explicitStoreProduct) {
        return undefined;
    }
    return {
        ...catalogStoreProduct,
        ...explicitStoreProduct,
        apple: {
            ...catalogStoreProduct?.apple,
            ...explicitStoreProduct?.apple,
        },
        google: {
            ...catalogStoreProduct?.google,
            ...explicitStoreProduct?.google,
        },
    };
}
function mergeCedrosProductDefinition({ fallbackId, fallbackFulfillmentType, catalogProduct, explicitProduct, }) {
    const id = explicitProduct?.id ?? catalogProduct?.id ?? fallbackId;
    const fulfillmentType = explicitProduct?.fulfillmentType ??
        fallbackFulfillmentType ??
        catalogProduct?.fulfillmentType;
    if (!id || !fulfillmentType) {
        return undefined;
    }
    return {
        ...catalogProduct,
        ...explicitProduct,
        id,
        fulfillmentType,
        name: explicitProduct?.name ?? catalogProduct?.name,
        storeProduct: mergeStoreProduct(catalogProduct?.storeProduct, explicitProduct?.storeProduct),
    };
}
function resolveConfiguredStoreProductId(product, distributionChannel) {
    if (distributionChannel === 'apple_app_store') {
        return product.storeProduct?.apple?.productId ?? product.id;
    }
    if (distributionChannel === 'google_play_store') {
        return product.storeProduct?.google?.productId ?? product.id;
    }
    return product.id;
}
function resolveStoreProductConfiguration(product, distributionChannel) {
    if (distributionChannel !== 'apple_app_store' &&
        distributionChannel !== 'google_play_store') {
        return null;
    }
    const kind = product.storeProduct?.kind ?? 'non_consumable';
    return {
        productId: resolveConfiguredStoreProductId(product, distributionChannel),
        kind,
        usedDefaultKind: product.storeProduct?.kind === undefined,
        storeProduct: product.storeProduct ?? {},
    };
}
function selectGooglePlayOffer(subscription, config) {
    const offers = subscription.subscriptionOfferDetails ?? [];
    if (offers.length === 0) {
        return null;
    }
    if (config?.offerToken) {
        return (offers.find((offer) => offer.offerToken === config.offerToken) ?? null);
    }
    const filteredByBasePlan = config?.basePlanId
        ? offers.filter((offer) => offer.basePlanId === config.basePlanId)
        : offers;
    const filteredByOfferId = config?.offerId
        ? filteredByBasePlan.filter((offer) => offer.offerId === config.offerId)
        : filteredByBasePlan;
    if (filteredByOfferId.length === 1) {
        return filteredByOfferId[0];
    }
    if (filteredByOfferId.length === 0) {
        return null;
    }
    return offers.length === 1 ? offers[0] : null;
}
//# sourceMappingURL=resolveStoreProductConfiguration.js.map