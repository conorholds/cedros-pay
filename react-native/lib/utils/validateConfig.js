"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateConfig = validateConfig;
const tokenMintValidator_1 = require("./tokenMintValidator");
const logger_1 = require("./logger");
const REQUIRED_STRING_FIELDS = [
    'stripePublicKey',
];
const ALLOWED_SOLANA_CLUSTERS = new Set(['mainnet-beta', 'devnet', 'testnet']);
const ALLOWED_DISTRIBUTION_CHANNELS = new Set([
    'apple_app_store',
    'google_play_store',
    'solana_dapp_store',
    'android_sideload',
    'web',
    'unknown',
]);
const ALLOWED_STOREFRONT_REGIONS = new Set([
    'us',
    'eea',
    'south_korea',
    'other',
    'unknown',
]);
const ALLOWED_FULFILLMENT_TYPES = new Set([
    'digital_in_app',
    'physical_goods',
    'real_world_service',
    'reader_content',
    'other',
]);
const ALLOWED_STORE_PRODUCT_KINDS = new Set([
    'consumable',
    'non_consumable',
    'auto_renewable_subscription',
]);
const ALLOWED_STOREKIT_MODES = new Set([
    'STOREKIT1_MODE',
    'STOREKIT_HYBRID_MODE',
    'STOREKIT2_MODE',
]);
const ALLOWED_TRANSACTION_HANDLING = new Set(['auto_finish', 'manual']);
function validateOptionalStringField(issues, field, value) {
    if (value !== undefined && typeof value !== 'string') {
        issues.push({
            field,
            message: 'must be a string when provided',
        });
    }
}
function validateProductCatalogEntry(issues, productId, entry) {
    if (typeof entry !== 'object' || entry === null) {
        issues.push({
            field: `paymentPolicy.productCatalog.${productId}`,
            message: 'must be a product definition object',
        });
        return;
    }
    const product = entry;
    if (product.fulfillmentType !== undefined &&
        !ALLOWED_FULFILLMENT_TYPES.has(String(product.fulfillmentType))) {
        issues.push({
            field: `paymentPolicy.productCatalog.${productId}.fulfillmentType`,
            message: `must be one of ${Array.from(ALLOWED_FULFILLMENT_TYPES).join(', ')}`,
        });
    }
    validateOptionalStringField(issues, `paymentPolicy.productCatalog.${productId}.id`, product.id);
    validateOptionalStringField(issues, `paymentPolicy.productCatalog.${productId}.name`, product.name);
    if (product.storeProduct !== undefined) {
        if (typeof product.storeProduct !== 'object' || product.storeProduct === null) {
            issues.push({
                field: `paymentPolicy.productCatalog.${productId}.storeProduct`,
                message: 'must be an object when provided',
            });
            return;
        }
        const storeProduct = product.storeProduct;
        if (storeProduct.kind !== undefined &&
            !ALLOWED_STORE_PRODUCT_KINDS.has(String(storeProduct.kind))) {
            issues.push({
                field: `paymentPolicy.productCatalog.${productId}.storeProduct.kind`,
                message: `must be one of ${Array.from(ALLOWED_STORE_PRODUCT_KINDS).join(', ')}`,
            });
        }
        if (storeProduct.apple !== undefined) {
            if (typeof storeProduct.apple !== 'object' || storeProduct.apple === null) {
                issues.push({
                    field: `paymentPolicy.productCatalog.${productId}.storeProduct.apple`,
                    message: 'must be an object when provided',
                });
            }
            else {
                const apple = storeProduct.apple;
                validateOptionalStringField(issues, `paymentPolicy.productCatalog.${productId}.storeProduct.apple.productId`, apple.productId);
                validateOptionalStringField(issues, `paymentPolicy.productCatalog.${productId}.storeProduct.apple.appAccountToken`, apple.appAccountToken);
                if (apple.quantity !== undefined && typeof apple.quantity !== 'number') {
                    issues.push({
                        field: `paymentPolicy.productCatalog.${productId}.storeProduct.apple.quantity`,
                        message: 'must be a number when provided',
                    });
                }
            }
        }
        if (storeProduct.google !== undefined) {
            if (typeof storeProduct.google !== 'object' || storeProduct.google === null) {
                issues.push({
                    field: `paymentPolicy.productCatalog.${productId}.storeProduct.google`,
                    message: 'must be an object when provided',
                });
            }
            else {
                const google = storeProduct.google;
                [
                    'productId',
                    'packageName',
                    'basePlanId',
                    'offerId',
                    'offerToken',
                    'purchaseTokenAndroid',
                    'obfuscatedAccountIdAndroid',
                    'obfuscatedProfileIdAndroid',
                ].forEach((field) => {
                    validateOptionalStringField(issues, `paymentPolicy.productCatalog.${productId}.storeProduct.google.${field}`, google[field]);
                });
                if (google.replacementModeAndroid !== undefined &&
                    typeof google.replacementModeAndroid !== 'number') {
                    issues.push({
                        field: `paymentPolicy.productCatalog.${productId}.storeProduct.google.replacementModeAndroid`,
                        message: 'must be a number when provided',
                    });
                }
                if (google.isOfferPersonalized !== undefined &&
                    typeof google.isOfferPersonalized !== 'boolean') {
                    issues.push({
                        field: `paymentPolicy.productCatalog.${productId}.storeProduct.google.isOfferPersonalized`,
                        message: 'must be a boolean when provided',
                    });
                }
            }
        }
    }
}
/**
 * Get default server URL - In React Native, serverUrl is always required
 * as there is no browser location to default to.
 */
function getDefaultServerUrl() {
    throw new Error('serverUrl is required. Please provide a serverUrl in your CedrosConfig. ' +
        'Example: { serverUrl: "https://api.example.com" }');
}
/**
 * Validate Cedros configuration before initializing providers/managers.
 *
 * Throws a detailed error listing every issue so developers can
 * correct misconfiguration quickly during integration.
 *
 * Note: serverUrl is always required in React Native (no browser location available)
 */
function validateConfig(config) {
    const issues = [];
    // Validate required string fields
    REQUIRED_STRING_FIELDS.forEach((field) => {
        const value = config[field];
        if (typeof value !== 'string' || value.trim().length === 0) {
            issues.push({
                field,
                message: 'must be a non-empty string',
            });
        }
    });
    // Validate or default serverUrl
    let serverUrl;
    if (config.serverUrl !== undefined) {
        // serverUrl was explicitly provided (even if empty)
        if (typeof config.serverUrl !== 'string' || config.serverUrl.trim().length === 0) {
            issues.push({
                field: 'serverUrl',
                message: 'must be a non-empty string when provided',
            });
            serverUrl = ''; // Will fail validation anyway
        }
        else {
            serverUrl = config.serverUrl;
        }
    }
    else {
        // serverUrl not provided, use default
        try {
            serverUrl = getDefaultServerUrl();
        }
        catch (error) {
            issues.push({
                field: 'serverUrl',
                message: error instanceof Error ? error.message : 'failed to determine default',
            });
            serverUrl = ''; // Will fail validation anyway
        }
    }
    if (config.stripeReturnUrl !== undefined) {
        if (typeof config.stripeReturnUrl !== 'string' ||
            config.stripeReturnUrl.trim().length === 0) {
            issues.push({
                field: 'stripeReturnUrl',
                message: 'must be a non-empty string when provided',
            });
        }
    }
    // Validate Solana cluster
    if (!ALLOWED_SOLANA_CLUSTERS.has(config.solanaCluster)) {
        issues.push({
            field: 'solanaCluster',
            message: `must be one of ${Array.from(ALLOWED_SOLANA_CLUSTERS).join(', ')}`,
        });
    }
    // Validate optional fields
    if (config.solanaEndpoint !== undefined) {
        if (typeof config.solanaEndpoint !== 'string') {
            issues.push({
                field: 'solanaEndpoint',
                message: 'must be a string when provided',
            });
        }
        else if (config.solanaEndpoint.trim().length === 0) {
            issues.push({
                field: 'solanaEndpoint',
                message: 'must be a non-empty string when provided (e.g., "https://api.mainnet-beta.solana.com")',
            });
        }
        else if (!config.solanaEndpoint.startsWith('http://') && !config.solanaEndpoint.startsWith('https://')) {
            issues.push({
                field: 'solanaEndpoint',
                message: 'must start with "http://" or "https://" (e.g., "https://api.mainnet-beta.solana.com")',
            });
        }
    }
    if (config.tokenMint && typeof config.tokenMint !== 'string') {
        issues.push({
            field: 'tokenMint',
            message: 'must be a string when provided',
        });
    }
    if (config.paymentPolicy !== undefined) {
        if (typeof config.paymentPolicy !== 'object' || config.paymentPolicy === null) {
            issues.push({
                field: 'paymentPolicy',
                message: 'must be an object when provided',
            });
        }
        else {
            const { paymentPolicy } = config;
            if (paymentPolicy.distributionChannel !== undefined &&
                !ALLOWED_DISTRIBUTION_CHANNELS.has(paymentPolicy.distributionChannel)) {
                issues.push({
                    field: 'paymentPolicy.distributionChannel',
                    message: `must be one of ${Array.from(ALLOWED_DISTRIBUTION_CHANNELS).join(', ')}`,
                });
            }
            if (paymentPolicy.distributionChannelResolver !== undefined &&
                typeof paymentPolicy.distributionChannelResolver !== 'function') {
                issues.push({
                    field: 'paymentPolicy.distributionChannelResolver',
                    message: 'must be a function when provided',
                });
            }
            if (paymentPolicy.storefrontRegion !== undefined &&
                !ALLOWED_STOREFRONT_REGIONS.has(paymentPolicy.storefrontRegion)) {
                issues.push({
                    field: 'paymentPolicy.storefrontRegion',
                    message: `must be one of ${Array.from(ALLOWED_STOREFRONT_REGIONS).join(', ')}`,
                });
            }
            if (paymentPolicy.storefrontRegionResolver !== undefined &&
                typeof paymentPolicy.storefrontRegionResolver !== 'function') {
                issues.push({
                    field: 'paymentPolicy.storefrontRegionResolver',
                    message: 'must be a function when provided',
                });
            }
            if (paymentPolicy.strictMode !== undefined &&
                typeof paymentPolicy.strictMode !== 'boolean') {
                issues.push({
                    field: 'paymentPolicy.strictMode',
                    message: 'must be a boolean when provided',
                });
            }
            if (paymentPolicy.availableAdapters !== undefined) {
                if (typeof paymentPolicy.availableAdapters !== 'object' ||
                    paymentPolicy.availableAdapters === null) {
                    issues.push({
                        field: 'paymentPolicy.availableAdapters',
                        message: 'must be an object when provided',
                    });
                }
                else {
                    Object.entries(paymentPolicy.availableAdapters).forEach(([key, value]) => {
                        if (typeof value !== 'boolean') {
                            issues.push({
                                field: `paymentPolicy.availableAdapters.${key}`,
                                message: 'must be a boolean',
                            });
                        }
                    });
                }
            }
            if (paymentPolicy.programs !== undefined) {
                if (typeof paymentPolicy.programs !== 'object' ||
                    paymentPolicy.programs === null) {
                    issues.push({
                        field: 'paymentPolicy.programs',
                        message: 'must be an object when provided',
                    });
                }
                else {
                    const programs = paymentPolicy.programs;
                    if (programs.apple !== undefined) {
                        if (typeof programs.apple !== 'object' || programs.apple === null) {
                            issues.push({
                                field: 'paymentPolicy.programs.apple',
                                message: 'must be an object when provided',
                            });
                        }
                        else {
                            const apple = programs.apple;
                            ['usStorefrontExternalPurchaseLink', 'readerExternalLinkAccount'].forEach((field) => {
                                if (apple[field] !== undefined &&
                                    typeof apple[field] !== 'boolean') {
                                    issues.push({
                                        field: `paymentPolicy.programs.apple.${field}`,
                                        message: 'must be a boolean when provided',
                                    });
                                }
                            });
                        }
                    }
                    if (programs.google !== undefined) {
                        if (typeof programs.google !== 'object' || programs.google === null) {
                            issues.push({
                                field: 'paymentPolicy.programs.google',
                                message: 'must be an object when provided',
                            });
                        }
                        else {
                            const google = programs.google;
                            [
                                'userChoiceBilling',
                                'alternativeBillingOnly',
                                'externalOffers',
                            ].forEach((field) => {
                                if (google[field] !== undefined &&
                                    typeof google[field] !== 'boolean') {
                                    issues.push({
                                        field: `paymentPolicy.programs.google.${field}`,
                                        message: 'must be a boolean when provided',
                                    });
                                }
                            });
                        }
                    }
                }
            }
            if (paymentPolicy.productCatalog !== undefined) {
                if (typeof paymentPolicy.productCatalog !== 'object' ||
                    paymentPolicy.productCatalog === null) {
                    issues.push({
                        field: 'paymentPolicy.productCatalog',
                        message: 'must be an object when provided',
                    });
                }
                else {
                    Object.entries(paymentPolicy.productCatalog).forEach(([productId, entry]) => {
                        validateProductCatalogEntry(issues, productId, entry);
                    });
                }
            }
            if (paymentPolicy.productCatalogSync !== undefined) {
                if (typeof paymentPolicy.productCatalogSync !== 'object' ||
                    paymentPolicy.productCatalogSync === null) {
                    issues.push({
                        field: 'paymentPolicy.productCatalogSync',
                        message: 'must be an object when provided',
                    });
                }
                else {
                    const { productCatalogSync } = paymentPolicy;
                    if (productCatalogSync.enabled !== undefined &&
                        typeof productCatalogSync.enabled !== 'boolean') {
                        issues.push({
                            field: 'paymentPolicy.productCatalogSync.enabled',
                            message: 'must be a boolean when provided',
                        });
                    }
                    if (productCatalogSync.limit !== undefined &&
                        (!Number.isFinite(productCatalogSync.limit) ||
                            Number(productCatalogSync.limit) <= 0)) {
                        issues.push({
                            field: 'paymentPolicy.productCatalogSync.limit',
                            message: 'must be a positive number when provided',
                        });
                    }
                }
            }
            if (paymentPolicy.storeBilling !== undefined) {
                if (typeof paymentPolicy.storeBilling !== 'object' ||
                    paymentPolicy.storeBilling === null) {
                    issues.push({
                        field: 'paymentPolicy.storeBilling',
                        message: 'must be an object when provided',
                    });
                }
                else {
                    const { storeBilling } = paymentPolicy;
                    if (storeBilling.enabled !== undefined &&
                        typeof storeBilling.enabled !== 'boolean') {
                        issues.push({
                            field: 'paymentPolicy.storeBilling.enabled',
                            message: 'must be a boolean when provided',
                        });
                    }
                    if (storeBilling.storekitMode !== undefined &&
                        !ALLOWED_STOREKIT_MODES.has(storeBilling.storekitMode)) {
                        issues.push({
                            field: 'paymentPolicy.storeBilling.storekitMode',
                            message: `must be one of ${Array.from(ALLOWED_STOREKIT_MODES).join(', ')}`,
                        });
                    }
                    if (storeBilling.transactionHandling !== undefined &&
                        !ALLOWED_TRANSACTION_HANDLING.has(storeBilling.transactionHandling)) {
                        issues.push({
                            field: 'paymentPolicy.storeBilling.transactionHandling',
                            message: `must be one of ${Array.from(ALLOWED_TRANSACTION_HANDLING).join(', ')}`,
                        });
                    }
                }
            }
            if (paymentPolicy.nativeHandlers !== undefined) {
                if (typeof paymentPolicy.nativeHandlers !== 'object' ||
                    paymentPolicy.nativeHandlers === null) {
                    issues.push({
                        field: 'paymentPolicy.nativeHandlers',
                        message: 'must be an object when provided',
                    });
                }
                else {
                    Object.entries(paymentPolicy.nativeHandlers).forEach(([key, handler]) => {
                        if (handler === undefined) {
                            return;
                        }
                        if (typeof handler !== 'object' || handler === null) {
                            issues.push({
                                field: `paymentPolicy.nativeHandlers.${key}`,
                                message: 'must be an object with a purchase function',
                            });
                            return;
                        }
                        const maybeHandler = handler;
                        if (typeof maybeHandler.purchase !== 'function') {
                            issues.push({
                                field: `paymentPolicy.nativeHandlers.${key}.purchase`,
                                message: 'must be a function',
                            });
                        }
                        if (maybeHandler.restorePurchases !== undefined &&
                            typeof maybeHandler.restorePurchases !== 'function') {
                            issues.push({
                                field: `paymentPolicy.nativeHandlers.${key}.restorePurchases`,
                                message: 'must be a function when provided',
                            });
                        }
                        if (maybeHandler.openManageSubscriptions !== undefined &&
                            typeof maybeHandler.openManageSubscriptions !== 'function') {
                            issues.push({
                                field: `paymentPolicy.nativeHandlers.${key}.openManageSubscriptions`,
                                message: 'must be a function when provided',
                            });
                        }
                    });
                }
            }
        }
    }
    if (issues.length > 0) {
        const details = issues.map((issue) => `- ${issue.field} ${issue.message}`).join('\n');
        throw new Error(`Invalid Cedros configuration:\n${details}`);
    }
    // Validate token mint against known stablecoins (STRICT by default)
    if (config.tokenMint) {
        const allowUnknown = config.dangerouslyAllowUnknownMint === true;
        const mintValidation = (0, tokenMintValidator_1.validateTokenMint)(config.tokenMint, 'CedrosConfig.tokenMint', allowUnknown);
        // STRICT MODE: Fail validation for unknown mints
        if (!mintValidation.isValid && mintValidation.error) {
            throw new Error(mintValidation.error);
        }
        // PERMISSIVE MODE: Warn for unknown mints
        if (mintValidation.warning) {
            (0, logger_1.getLogger)().warn(mintValidation.warning);
        }
    }
    // Return normalized config with serverUrl guaranteed
    return {
        ...config,
        serverUrl,
    };
}
//# sourceMappingURL=validateConfig.js.map