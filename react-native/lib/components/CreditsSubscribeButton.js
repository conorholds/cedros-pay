"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreditsSubscribeButton = CreditsSubscribeButton;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_native_1 = require("react-native");
const context_1 = require("../context");
const useCreditsSubscription_1 = require("../hooks/useCreditsSubscription");
const logger_1 = require("../utils/logger");
const eventEmitter_1 = require("../utils/eventEmitter");
const requestDeduplication_1 = require("../utils/requestDeduplication");
const useCedrosTranslation_1 = require("../i18n/useCedrosTranslation");
/**
 * Button component for credits subscription payments (React Native)
 *
 * Handles subscription payments using cedros-login credits balance.
 * Requires user to be authenticated with cedros-login.
 */
function CreditsSubscribeButton({ resource, interval, intervalDays, authToken, userId, couponCode, label, disabled = false, onAttempt, onSuccess, onError, style, textStyle, loadingColor = '#ffffff', hideMessages = false, autoCheckStatus = false, }) {
    const { status, error, subscriptionStatus, expiresAt, checkStatus, processPayment, } = (0, useCreditsSubscription_1.useCreditsSubscription)();
    const theme = (0, context_1.useCedrosTheme)();
    const { t, translations } = (0, useCedrosTranslation_1.useCedrosTranslation)();
    // Store checkStatus in ref to avoid effect dependency issues
    const checkStatusRef = (0, react_1.useRef)(checkStatus);
    (0, react_1.useEffect)(() => {
        checkStatusRef.current = checkStatus;
    }, [checkStatus]);
    // Auto-check subscription status on mount when userId is provided
    (0, react_1.useEffect)(() => {
        if (autoCheckStatus && userId) {
            (0, logger_1.getLogger)().debug('[CreditsSubscribeButton] Auto-checking subscription status', {
                resource,
                userId,
            });
            checkStatusRef.current(resource, userId);
        }
    }, [autoCheckStatus, userId, resource]);
    // Use translated default label if not provided
    const buttonLabel = label || t('ui.subscribe_with_credits') || 'Subscribe with Credits';
    // Error message localization
    const errorCode = error && typeof error !== 'string' ? error?.code ?? null : null;
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
    const executeSubscriptionFlow = (0, react_1.useCallback)(async () => {
        (0, logger_1.getLogger)().debug('[CreditsSubscribeButton] executeSubscriptionFlow', {
            resource,
            interval,
            intervalDays,
            hasAuthToken: !!authToken,
        });
        (0, eventEmitter_1.emitPaymentStart)('credits', resource);
        if (onAttempt) {
            onAttempt('credits');
        }
        // Validate auth token
        if (!authToken) {
            const errorMsg = 'Authentication required: please log in to subscribe with credits';
            (0, logger_1.getLogger)().error('[CreditsSubscribeButton]', errorMsg);
            (0, eventEmitter_1.emitPaymentError)('credits', errorMsg, resource);
            if (onError) {
                onError(errorMsg);
            }
            return;
        }
        (0, eventEmitter_1.emitPaymentProcessing)('credits', resource);
        const result = await processPayment(resource, interval, authToken, {
            couponCode,
            intervalDays,
        });
        if (result.success && result.transactionId) {
            (0, eventEmitter_1.emitPaymentSuccess)('credits', result.transactionId, resource);
            if (onSuccess) {
                onSuccess(result.transactionId);
            }
        }
        else if (!result.success && result.error) {
            (0, eventEmitter_1.emitPaymentError)('credits', result.error, resource);
            if (onError) {
                onError(result.error);
            }
        }
    }, [
        resource,
        interval,
        intervalDays,
        authToken,
        couponCode,
        processPayment,
        onAttempt,
        onSuccess,
        onError,
    ]);
    // Deduplication
    const buttonId = (0, react_1.useMemo)(() => {
        return `credits-subscribe-${resource}-${interval}`;
    }, [resource, interval]);
    const handlePress = (0, react_1.useMemo)(() => (0, requestDeduplication_1.createDedupedClickHandler)(buttonId, executeSubscriptionFlow, {
        cooldownMs: 200,
        deduplicationWindowMs: 0,
    }), [buttonId, executeSubscriptionFlow]);
    const isProcessing = status === 'loading' || status === 'checking';
    const isSubscribed = subscriptionStatus === 'active' || subscriptionStatus === 'trialing';
    const isDisabled = disabled || isProcessing || isSubscribed;
    // Determine button label based on state
    let displayLabel = buttonLabel;
    if (isProcessing) {
        displayLabel = t('ui.processing');
    }
    else if (isSubscribed && expiresAt) {
        const expiryDate = new Date(expiresAt).toLocaleDateString();
        displayLabel = `${t('ui.subscribed_until')} ${expiryDate}`;
    }
    else if (isSubscribed) {
        displayLabel = t('ui.subscribed');
    }
    return ((0, jsx_runtime_1.jsxs)(react_native_1.View, { style: [styles.container, style], children: [(0, jsx_runtime_1.jsx)(react_native_1.TouchableOpacity, { onPress: handlePress, disabled: isDisabled, style: [
                    styles.button,
                    theme.unstyled ? null : { backgroundColor: theme.tokens?.cryptoBackground || '#14b8a6' },
                    isDisabled && styles.disabled,
                ], activeOpacity: 0.8, accessible: true, accessibilityRole: "button", accessibilityLabel: displayLabel, accessibilityState: { disabled: isDisabled, busy: isProcessing }, children: isProcessing ? ((0, jsx_runtime_1.jsx)(react_native_1.ActivityIndicator, { color: loadingColor, size: "small" })) : ((0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [styles.buttonText, textStyle], children: displayLabel })) }), !hideMessages && localizedError && ((0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [styles.errorText, { color: theme.tokens?.errorText || '#ef4444' }], children: localizedError })), !hideMessages && isSubscribed && ((0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [styles.successText, { color: theme.tokens?.successText || '#22c55e' }], children: t('ui.subscription_active') }))] }));
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
//# sourceMappingURL=CreditsSubscribeButton.js.map