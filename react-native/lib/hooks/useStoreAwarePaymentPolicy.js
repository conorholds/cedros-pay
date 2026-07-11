"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useStoreAwarePaymentPolicy = useStoreAwarePaymentPolicy;
const react_1 = require("react");
const context_1 = require("../context");
const policy_1 = require("../policy");
function resolveDistributionChannel(explicitChannel, configChannel, resolver) {
    if (explicitChannel) {
        return explicitChannel;
    }
    if (configChannel) {
        return configChannel;
    }
    try {
        const resolved = resolver?.();
        return resolved === undefined ? (0, policy_1.detectDistributionChannel)() : resolved;
    }
    catch {
        return (0, policy_1.detectDistributionChannel)();
    }
}
function resolveStorefrontRegion(explicitRegion, configRegion, resolver) {
    if (explicitRegion) {
        return explicitRegion;
    }
    if (configRegion) {
        return configRegion;
    }
    try {
        return resolver?.() ?? 'unknown';
    }
    catch {
        return 'unknown';
    }
}
function resolveAvailableAdapters(configAdapters, overrideAdapters, hasBuiltInStoreBilling, hasAppleHandler, hasGoogleHandler) {
    const merged = {
        stripe: true,
        x402: true,
        crypto: false,
        credits: false,
        apple_iap: hasBuiltInStoreBilling,
        google_play_billing: hasBuiltInStoreBilling,
        ...configAdapters,
        ...overrideAdapters,
    };
    return {
        ...merged,
        apple_iap: (hasBuiltInStoreBilling || hasAppleHandler) && merged.apple_iap !== false,
        google_play_billing: (hasBuiltInStoreBilling || hasGoogleHandler) &&
            merged.google_play_billing !== false,
    };
}
function useStoreAwarePaymentPolicy({ product, policy, purchaseMode = 'single', }) {
    const { config } = (0, context_1.useCedrosContext)();
    return (0, react_1.useMemo)(() => {
        const paymentPolicyConfig = config.paymentPolicy;
        const builtInStoreBillingEnabled = paymentPolicyConfig?.storeBilling?.enabled !== false;
        const availableAdapters = resolveAvailableAdapters(paymentPolicyConfig?.availableAdapters, policy?.availableAdapters, builtInStoreBillingEnabled, Boolean(paymentPolicyConfig?.nativeHandlers?.apple_iap), Boolean(paymentPolicyConfig?.nativeHandlers?.google_play_billing));
        if (!product) {
            return {
                usesOrchestration: false,
                resolution: null,
                availableAdapters,
                renderableMethods: [],
            };
        }
        const distributionChannel = resolveDistributionChannel(policy?.distributionChannel, paymentPolicyConfig?.distributionChannel, paymentPolicyConfig?.distributionChannelResolver);
        const storefrontRegion = resolveStorefrontRegion(policy?.storefrontRegion, paymentPolicyConfig?.storefrontRegion, paymentPolicyConfig?.storefrontRegionResolver);
        const strictMode = policy?.strictMode ?? paymentPolicyConfig?.strictMode ?? true;
        const resolution = (0, policy_1.resolvePaymentPolicy)({
            product,
            distributionChannel,
            storefrontRegion,
            programs: policy?.programs ?? paymentPolicyConfig?.programs,
            availableAdapters,
            strictMode,
            purchaseMode,
        });
        return {
            usesOrchestration: true,
            resolution,
            availableAdapters,
            renderableMethods: (0, policy_1.collapseRenderablePaymentMethods)(resolution.allowedPaymentMethods),
        };
    }, [
        config.paymentPolicy,
        policy?.availableAdapters,
        policy?.distributionChannel,
        policy?.programs,
        policy?.storefrontRegion,
        policy?.strictMode,
        product,
        purchaseMode,
    ]);
}
//# sourceMappingURL=useStoreAwarePaymentPolicy.js.map