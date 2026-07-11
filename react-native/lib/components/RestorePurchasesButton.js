"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RestorePurchasesButton = RestorePurchasesButton;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_native_1 = require("react-native");
const context_1 = require("../context");
const nativeStoreSupport_1 = require("../policy/nativeStoreSupport");
const requestDeduplication_1 = require("../utils/requestDeduplication");
function getDefaultRestoreLabel() {
    return 'Restore Purchases';
}
function RestorePurchasesButton({ product, products, distributionChannel, checkout, label, disabled = false, onSuccess, onError, style, textStyle, loadingColor = '#111827', }) {
    const { config, storeBillingManager } = (0, context_1.useCedrosContext)();
    const theme = (0, context_1.useCedrosTheme)();
    const [error, setError] = (0, react_1.useState)(null);
    const [restoredCount, setRestoredCount] = (0, react_1.useState)(null);
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const method = (0, nativeStoreSupport_1.resolveNativeStoreMethod)(distributionChannel);
    const handler = method
        ? config.paymentPolicy?.nativeHandlers?.[method]
        : undefined;
    const buttonLabel = label || getDefaultRestoreLabel();
    const restoreProducts = (0, react_1.useMemo)(() => {
        const combined = [
            ...(products ?? []),
            ...(product ? [product] : []),
        ];
        const seen = new Set();
        return combined.filter((entry) => {
            if (!entry?.id || seen.has(entry.id) || !(0, nativeStoreSupport_1.isRestorableStoreProduct)(entry)) {
                return false;
            }
            seen.add(entry.id);
            return true;
        });
    }, [product, products]);
    const executeRestore = (0, react_1.useMemo)(() => async () => {
        if (!method) {
            const unsupportedError = 'Purchase restore is only available for Apple App Store and Google Play Store products.';
            setError(unsupportedError);
            onError?.(unsupportedError);
            return;
        }
        if (restoreProducts.length === 0) {
            const missingProductError = 'Cedros needs at least one restorable store product definition to restore purchases safely.';
            setError(missingProductError);
            onError?.(missingProductError);
            return;
        }
        if (!handler?.restorePurchases &&
            config.paymentPolicy?.storeBilling?.enabled === false) {
            const missingHandlerError = method === 'apple_iap'
                ? 'Apple restore is disabled for this build and no override restore handler is configured.'
                : 'Google Play restore is disabled for this build and no override restore handler is configured.';
            setError(missingHandlerError);
            onError?.(missingHandlerError);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const restored = handler?.restorePurchases
                ? await handler.restorePurchases({
                    products: restoreProducts,
                    distributionChannel,
                    checkout,
                })
                : await storeBillingManager.restorePurchases({
                    products: restoreProducts,
                    distributionChannel,
                    checkout,
                });
            setRestoredCount(restored.length);
            onSuccess?.(restored);
        }
        catch (restoreError) {
            const message = restoreError instanceof Error
                ? restoreError.message
                : 'Purchase restore failed';
            setError(message);
            onError?.(message);
        }
        finally {
            setIsLoading(false);
        }
    }, [
        checkout,
        config.paymentPolicy?.storeBilling?.enabled,
        distributionChannel,
        handler,
        method,
        onError,
        onSuccess,
        restoreProducts,
        storeBillingManager,
    ]);
    const dedupeKey = (0, react_1.useMemo)(() => `restore-${distributionChannel}-${restoreProducts.map((entry) => entry.id).join('-')}`, [distributionChannel, restoreProducts]);
    const handlePress = (0, react_1.useMemo)(() => (0, requestDeduplication_1.createDedupedClickHandler)(dedupeKey, executeRestore), [dedupeKey, executeRestore]);
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
                ], children: error })) : null, restoredCount !== null ? ((0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [
                    styles.successText,
                    { color: theme.tokens?.successText || '#22c55e' },
                ], children: restoredCount > 0
                    ? `Restored ${restoredCount} purchase${restoredCount === 1 ? '' : 's'}`
                    : 'No purchases available to restore' })) : null] }));
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
    successText: {
        marginTop: 8,
        fontSize: 14,
        textAlign: 'center',
    },
});
//# sourceMappingURL=RestorePurchasesButton.js.map