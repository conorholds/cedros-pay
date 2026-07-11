"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscribeButton = SubscribeButton;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_native_1 = require("react-native");
const context_1 = require("../context");
const useSubscription_1 = require("../hooks/useSubscription");
const logger_1 = require("../utils/logger");
const eventEmitter_1 = require("../utils/eventEmitter");
const requestDeduplication_1 = require("../utils/requestDeduplication");
const useCedrosTranslation_1 = require("../i18n/useCedrosTranslation");
/**
 * Button component for Stripe subscription checkout (React Native)
 *
 * Supports both hosted redirect checkout and native PaymentSheet subscriptions.
 */
function SubscribeButton({ resource, flow = 'redirect_checkout', interval, intervalDays, trialDays, successUrl, cancelUrl, metadata, customerEmail, couponCode, label, disabled = false, onAttempt, onSuccess, onError, style, textStyle, loadingColor = '#ffffff', }) {
    const { status, error, sessionId, processSubscription, processMobileSubscription } = (0, useSubscription_1.useSubscription)();
    const theme = (0, context_1.useCedrosTheme)();
    const { t, translations } = (0, useCedrosTranslation_1.useCedrosTranslation)();
    // Use translated default label if not provided
    const buttonLabel = label || t('ui.subscribe');
    // Extract error code
    const errorCode = error && typeof error !== 'string' ? error?.code ?? null : null;
    // Localize error message
    const getErrorMessage = (code) => {
        if (!code || !translations)
            return '';
        const errorData = translations.errors[code];
        if (!errorData)
            return '';
        return errorData.action ? `${errorData.message} ${errorData.action}` : errorData.message;
    };
    const localizedError = error
        ? typeof error === 'string'
            ? error
            : getErrorMessage(errorCode)
        : null;
    // Core subscription logic
    const executeSubscription = (0, react_1.useCallback)(async () => {
        (0, logger_1.getLogger)().debug('[SubscribeButton] executeSubscription:', {
            resource,
            interval,
            intervalDays,
            trialDays,
            couponCode,
        });
        // Emit payment start event
        (0, eventEmitter_1.emitPaymentStart)('stripe', resource);
        // Track subscription attempt for analytics
        if (onAttempt) {
            onAttempt('stripe');
        }
        // Emit processing event
        (0, eventEmitter_1.emitPaymentProcessing)('stripe', resource);
        const result = flow === 'payment_sheet'
            ? await processMobileSubscription({
                resource,
                interval,
                intervalDays,
                trialDays,
                customerEmail,
                metadata,
                couponCode,
            })
            : await processSubscription({
                resource,
                interval,
                intervalDays,
                trialDays,
                customerEmail,
                metadata,
                couponCode,
                successUrl,
                cancelUrl,
            });
        if (result.success && result.transactionId) {
            (0, eventEmitter_1.emitPaymentSuccess)('stripe', result.transactionId, resource);
            if (onSuccess) {
                onSuccess(result.transactionId);
            }
        }
        else if (!result.success && result.error) {
            (0, eventEmitter_1.emitPaymentError)('stripe', result.error, resource);
            if (onError) {
                onError(result.error);
            }
        }
    }, [
        resource,
        interval,
        intervalDays,
        trialDays,
        customerEmail,
        metadata,
        couponCode,
        flow,
        successUrl,
        cancelUrl,
        processSubscription,
        processMobileSubscription,
        onAttempt,
        onSuccess,
        onError,
    ]);
    // Create unique button ID for deduplication
    const buttonId = (0, react_1.useMemo)(() => {
        return `subscribe-${resource}-${interval}`;
    }, [resource, interval]);
    // Wrap with deduplication + cooldown
    const handlePress = (0, react_1.useMemo)(() => (0, requestDeduplication_1.createDedupedClickHandler)(buttonId, executeSubscription), [buttonId, executeSubscription]);
    const isLoading = status === 'loading';
    const isDisabled = disabled || isLoading;
    return ((0, jsx_runtime_1.jsxs)(react_native_1.View, { style: [styles.container, style], children: [(0, jsx_runtime_1.jsx)(react_native_1.TouchableOpacity, { onPress: handlePress, disabled: isDisabled, style: [
                    styles.button,
                    theme.unstyled ? null : { backgroundColor: theme.tokens?.stripeBackground || '#635BFF' },
                    isDisabled && styles.disabled,
                ], activeOpacity: 0.8, accessible: true, accessibilityRole: "button", accessibilityLabel: buttonLabel, accessibilityState: { disabled: isDisabled, busy: isLoading }, children: isLoading ? ((0, jsx_runtime_1.jsx)(react_native_1.ActivityIndicator, { color: loadingColor, size: "small" })) : ((0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [styles.buttonText, textStyle], children: buttonLabel })) }), localizedError && ((0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [styles.errorText, { color: theme.tokens?.errorText || '#ef4444' }], children: localizedError })), flow === 'redirect_checkout' && sessionId && ((0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [styles.successText, { color: theme.tokens?.successText || '#22c55e' }], children: t('ui.redirecting_to_checkout') }))] }));
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
//# sourceMappingURL=SubscribeButton.js.map