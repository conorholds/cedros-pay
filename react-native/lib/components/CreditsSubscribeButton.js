"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreditsSubscribeButton = CreditsSubscribeButton;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const context_1 = require("../context");
const useCreditsSubscription_1 = require("../hooks/useCreditsSubscription");
const logger_1 = require("../utils/logger");
const eventEmitter_1 = require("../utils/eventEmitter");
const requestDeduplication_1 = require("../utils/requestDeduplication");
const useTranslation_1 = require("../i18n/useTranslation");
/**
 * Button component for credits subscription payments (React Native)
 *
 * Handles subscription payments using cedros-login credits balance.
 * Requires user to be authenticated with cedros-login.
 */
function CreditsSubscribeButton({ resource, interval, intervalDays, authToken, userId, couponCode, label, disabled = false, onAttempt, onSuccess, onError, style, textStyle, loadingColor = '#ffffff', hideMessages = false, autoCheckStatus = false, }) {
    const { status, error, subscriptionStatus, expiresAt, checkStatus, processPayment, } = (0, useCreditsSubscription_1.useCreditsSubscription)();
    const theme = (0, context_1.useCedrosTheme)();
    const { t, translations } = (0, useTranslation_1.useTranslation)();
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
    return (<react_native_1.View style={[styles.container, style]}>
      <react_native_1.TouchableOpacity onPress={handlePress} disabled={isDisabled} style={[
            styles.button,
            theme.unstyled ? null : { backgroundColor: theme.tokens?.cryptoBackground || '#14b8a6' },
            isDisabled && styles.disabled,
        ]} activeOpacity={0.8} accessible={true} accessibilityRole="button" accessibilityLabel={displayLabel} accessibilityState={{ disabled: isDisabled, busy: isProcessing }}>
        {isProcessing ? (<react_native_1.ActivityIndicator color={loadingColor} size="small"/>) : (<react_native_1.Text style={[styles.buttonText, textStyle]}>{displayLabel}</react_native_1.Text>)}
      </react_native_1.TouchableOpacity>

      {/* Status messages */}
      {!hideMessages && localizedError && (<react_native_1.Text style={[styles.errorText, { color: theme.tokens?.errorText || '#ef4444' }]}>
          {localizedError}
        </react_native_1.Text>)}
      {!hideMessages && isSubscribed && (<react_native_1.Text style={[styles.successText, { color: theme.tokens?.successText || '#22c55e' }]}>
          {t('ui.subscription_active')}
        </react_native_1.Text>)}
    </react_native_1.View>);
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