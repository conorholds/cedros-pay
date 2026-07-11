"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ManageSubscriptionsButton = ManageSubscriptionsButton;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_native_1 = require("react-native");
const context_1 = require("../context");
const nativeStoreSupport_1 = require("../policy/nativeStoreSupport");
const requestDeduplication_1 = require("../utils/requestDeduplication");
function getDefaultManageLabel() {
    return 'Manage Subscription';
}
function ManageSubscriptionsButton({ product, distributionChannel, label, disabled = false, onOpen, onError, style, textStyle, loadingColor = '#111827', }) {
    const { config, storeBillingManager } = (0, context_1.useCedrosContext)();
    const theme = (0, context_1.useCedrosTheme)();
    const [error, setError] = (0, react_1.useState)(null);
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const method = (0, nativeStoreSupport_1.resolveNativeStoreMethod)(distributionChannel);
    const handler = method
        ? config.paymentPolicy?.nativeHandlers?.[method]
        : undefined;
    const buttonLabel = label || getDefaultManageLabel();
    const executeOpen = (0, react_1.useMemo)(() => async () => {
        if (!method) {
            const unsupportedError = 'Subscription management is only available for Apple App Store and Google Play Store products.';
            setError(unsupportedError);
            onError?.(unsupportedError);
            return;
        }
        if (!handler?.openManageSubscriptions &&
            config.paymentPolicy?.storeBilling?.enabled === false) {
            const missingHandlerError = method === 'apple_iap'
                ? 'Apple subscription management is disabled for this build and no override management handler is configured.'
                : 'Google Play subscription management is disabled for this build and no override management handler is configured.';
            setError(missingHandlerError);
            onError?.(missingHandlerError);
            return;
        }
        if (product && !(0, nativeStoreSupport_1.isManageableStoreSubscription)(product)) {
            const invalidProductError = 'Subscription management is only available for store-managed subscription products.';
            setError(invalidProductError);
            onError?.(invalidProductError);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            if (handler?.openManageSubscriptions) {
                await handler.openManageSubscriptions({
                    product,
                    distributionChannel,
                });
            }
            else {
                await storeBillingManager.openManageSubscriptions({
                    product,
                    distributionChannel,
                });
            }
            onOpen?.();
        }
        catch (openError) {
            const message = openError instanceof Error
                ? openError.message
                : 'Unable to open subscription management';
            setError(message);
            onError?.(message);
        }
        finally {
            setIsLoading(false);
        }
    }, [
        config.paymentPolicy?.storeBilling?.enabled,
        distributionChannel,
        handler,
        method,
        onError,
        onOpen,
        product,
        storeBillingManager,
    ]);
    const dedupeKey = (0, react_1.useMemo)(() => `manage-${distributionChannel}-${product?.id ?? 'default'}`, [distributionChannel, product?.id]);
    const handlePress = (0, react_1.useMemo)(() => (0, requestDeduplication_1.createDedupedClickHandler)(dedupeKey, executeOpen), [dedupeKey, executeOpen]);
    return ((0, jsx_runtime_1.jsxs)(react_native_1.View, { style: [styles.container, style], children: [(0, jsx_runtime_1.jsx)(react_native_1.TouchableOpacity, { onPress: handlePress, disabled: disabled || isLoading, style: [
                    styles.button,
                    {
                        backgroundColor: theme.tokens?.modalBackground || '#ffffff',
                        borderColor: theme.tokens?.surfaceBorder || '#d1d5db',
                    },
                    (disabled || isLoading) && styles.disabled,
                ], activeOpacity: 0.8, children: isLoading ? ((0, jsx_runtime_1.jsx)(react_native_1.ActivityIndicator, { color: loadingColor, size: "small" })) : ((0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [
                        styles.buttonText,
                        { color: theme.tokens?.surfaceText || '#111827' },
                        textStyle,
                    ], children: buttonLabel })) }), error ? ((0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [
                    styles.errorText,
                    { color: theme.tokens?.errorText || '#ef4444' },
                ], children: error })) : null] }));
}
const styles = react_native_1.StyleSheet.create({
    container: {
        width: '100%',
    },
    button: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 48,
        borderWidth: 1,
    },
    buttonText: {
        fontSize: 15,
        fontWeight: '600',
    },
    disabled: {
        opacity: 0.6,
    },
    errorText: {
        marginTop: 8,
        fontSize: 14,
        textAlign: 'center',
    },
});
//# sourceMappingURL=ManageSubscriptionsButton.js.map