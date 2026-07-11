"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapPaywallProductToCedrosProductDefinition = mapPaywallProductToCedrosProductDefinition;
exports.createCedrosProductCatalogFromPaywallProducts = createCedrosProductCatalogFromPaywallProducts;
exports.fetchCedrosProductCatalog = fetchCedrosProductCatalog;
const VALID_POLICY_FULFILLMENT_TYPES = new Set([
    'digital_in_app',
    'physical_goods',
    'real_world_service',
    'reader_content',
    'other',
]);
function extractProducts(response) {
    if (Array.isArray(response)) {
        return response;
    }
    return response.products ?? response.items ?? [];
}
function getMetadataPolicyFulfillmentType(metadata) {
    const explicit = metadata?.store_policy_fulfillment_type ?? metadata?.storePolicyFulfillmentType;
    if (typeof explicit === 'string' && VALID_POLICY_FULFILLMENT_TYPES.has(explicit)) {
        return explicit;
    }
    return undefined;
}
function derivePolicyFulfillmentType(product) {
    const explicit = getMetadataPolicyFulfillmentType(product.metadata);
    if (explicit) {
        return explicit;
    }
    const fulfillmentType = product.fulfillment?.type ?? product.fulfillmentType;
    if (fulfillmentType === 'shipping' || product.shippingProfile === 'physical') {
        return 'physical_goods';
    }
    if (fulfillmentType === 'service') {
        return 'real_world_service';
    }
    if (fulfillmentType === 'digital_download' || product.shippingProfile === 'digital') {
        // Conservative compliance default: treat unspecified digital catalog items as
        // in-app digital functionality unless the merchant explicitly marks them as
        // reader content or another exception.
        return 'digital_in_app';
    }
    return 'other';
}
function mapPaywallProductToCedrosProductDefinition(product) {
    return {
        id: product.id,
        name: product.title ?? product.description ?? product.id,
        fulfillmentType: derivePolicyFulfillmentType(product),
        storeProduct: product.storeBilling
            ? {
                kind: product.storeBilling.kind,
                apple: product.storeBilling.apple,
                google: product.storeBilling.google,
            }
            : undefined,
    };
}
function createCedrosProductCatalogFromPaywallProducts(products) {
    return products.reduce((catalog, product) => {
        if (!product?.id) {
            return catalog;
        }
        catalog[product.id] = mapPaywallProductToCedrosProductDefinition(product);
        return catalog;
    }, {});
}
async function fetchCedrosProductCatalog(options) {
    const { serverUrl, apiKey, limit = 500, signal } = options;
    const headers = {};
    if (apiKey) {
        headers['X-API-Key'] = apiKey;
    }
    const baseUrl = serverUrl.replace(/\/$/, '');
    const response = await fetch(`${baseUrl}/paywall/v1/products?limit=${encodeURIComponent(String(limit))}&offset=0`, {
        headers,
        signal,
    });
    if (!response.ok) {
        throw new Error(`Failed to load paywall product catalog (${response.status})`);
    }
    const data = (await response.json());
    return createCedrosProductCatalogFromPaywallProducts(extractProducts(data));
}
//# sourceMappingURL=paywallProductCatalog.js.map