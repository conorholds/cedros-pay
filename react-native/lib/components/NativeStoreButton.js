"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NativeStoreButton = NativeStoreButton;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_native_1 = require("react-native");
const context_1 = require("../context");
const requestDeduplication_1 = require("../utils/requestDeduplication");
const eventEmitter_1 = require("../utils/eventEmitter");
function getDefaultLabel(method) {
    return method === 'apple_iap' ? 'Buy with Apple' : 'Buy with Google Play';
}
function NativeStoreButton({ method, product, distributionChannel, checkout, label, disabled = false, onAttempt, onSuccess, onError, style, textStyle, loadingColor = '#ffffff', }) {
    const { config, storeBillingManager } = (0, context_1.useCedrosContext)();
    const theme = (0, context_1.useCedrosTheme)();
    const [error, setError] = (0, react_1.useState)(null);
    const [transactionId, setTransactionId] = (0, react_1.useState)(null);
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const handler = config.paymentPolicy?.nativeHandlers?.[method];
    const buttonLabel = label || handler?.label || getDefaultLabel(method);
    const executePurchase = (0, react_1.useMemo)(() => async () => {
        if (!handler && config.paymentPolicy?.storeBilling?.enabled === false) {
            const missingHandlerError = method === 'apple_iap'
                ? 'Apple IAP is disabled for this build and no override handler is configured.'
                : 'Google Play Billing is disabled for this build and no override handler is configured.';
            setError(missingHandlerError);
            (0, eventEmitter_1.emitPaymentError)(method, missingHandlerError, product.id);
            onError?.(missingHandlerError);
            return;
        }
        setIsLoading(true);
        setError(null);
        (0, eventEmitter_1.emitPaymentStart)(method, product.id);
        onAttempt?.(method);
        (0, eventEmitter_1.emitPaymentProcessing)(method, product.id);
        try {
            const result = handler
                ? await handler.purchase({
                    product,
                    distributionChannel,
                    fulfillmentType: product.fulfillmentType,
                    checkout,
                })
                : await storeBillingManager.purchase({
                    method,
                    product,
                    distributionChannel,
                    fulfillmentType: product.fulfillmentType,
                    checkout,
                });
            setTransactionId(result.transactionId);
            (0, eventEmitter_1.emitPaymentSuccess)(method, result.transactionId, product.id);
            onSuccess?.(result.transactionId);
        }
        catch (purchaseError) {
            const message = purchaseError instanceof Error
                ? purchaseError.message
                : 'Native store purchase failed';
            setError(message);
            (0, eventEmitter_1.emitPaymentError)(method, message, product.id);
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
        onAttempt,
        onError,
        onSuccess,
        product,
        storeBillingManager,
    ]);
    const handlePress = (0, react_1.useMemo)(() => (0, requestDeduplication_1.createDedupedClickHandler)(`${method}-${product.id}`, executePurchase), [executePurchase, method, product.id]);
    return ((0, jsx_runtime_1.jsxs)(react_native_1.View, { style: [styles.container, style], children: [(0, jsx_runtime_1.jsx)(react_native_1.TouchableOpacity, { onPress: handlePress, disabled: disabled || isLoading, style: [
                    styles.button,
                    theme.unstyled
                        ? null
                        : {
                            backgroundColor: method === 'apple_iap'
                                ? '#000000'
                                : theme.tokens?.stripeBackground || '#34a853',
                        },
                    (disabled || isLoading) && styles.disabled,
                ], activeOpacity: 0.8, children: isLoading ? ((0, jsx_runtime_1.jsx)(react_native_1.ActivityIndicator, { color: loadingColor, size: "small" })) : ((0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [styles.buttonText, textStyle], children: buttonLabel })) }), error ? ((0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [
                    styles.errorText,
                    { color: theme.tokens?.errorText || '#ef4444' },
                ], children: error })) : null, transactionId ? ((0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [
                    styles.successText,
                    { color: theme.tokens?.successText || '#22c55e' },
                ], children: "Payment successful" })) : null] }));
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
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 16,
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
//# sourceMappingURL=NativeStoreButton.js.map