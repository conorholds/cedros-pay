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
exports.SubscribeButton = SubscribeButton;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const context_1 = require("../context");
const useSubscription_1 = require("../hooks/useSubscription");
const logger_1 = require("../utils/logger");
const eventEmitter_1 = require("../utils/eventEmitter");
const requestDeduplication_1 = require("../utils/requestDeduplication");
const useTranslation_1 = require("../i18n/useTranslation");
/**
 * Button component for Stripe subscription checkout (React Native)
 *
 * Handles redirect to Stripe-hosted subscription checkout
 */
function SubscribeButton({ resource, interval, intervalDays, trialDays, successUrl, cancelUrl, metadata, customerEmail, couponCode, label, disabled = false, onAttempt, onSuccess, onError, style, textStyle, loadingColor = '#ffffff', }) {
    const { status, error, sessionId, processSubscription } = (0, useSubscription_1.useSubscription)();
    const theme = (0, context_1.useCedrosTheme)();
    const { t, translations } = (0, useTranslation_1.useTranslation)();
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
        const result = await processSubscription({
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
        successUrl,
        cancelUrl,
        processSubscription,
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
    return (<react_native_1.View style={[styles.container, style]}>
      <react_native_1.TouchableOpacity onPress={handlePress} disabled={isDisabled} style={[
            styles.button,
            theme.unstyled ? null : { backgroundColor: theme.tokens?.stripeBackground || '#635BFF' },
            isDisabled && styles.disabled,
        ]} activeOpacity={0.8} accessible={true} accessibilityRole="button" accessibilityLabel={buttonLabel} accessibilityState={{ disabled: isDisabled, busy: isLoading }}>
        {isLoading ? (<react_native_1.ActivityIndicator color={loadingColor} size="small"/>) : (<react_native_1.Text style={[styles.buttonText, textStyle]}>{buttonLabel}</react_native_1.Text>)}
      </react_native_1.TouchableOpacity>
      {localizedError && (<react_native_1.Text style={[styles.errorText, { color: theme.tokens?.errorText || '#ef4444' }]}>
          {localizedError}
        </react_native_1.Text>)}
      {sessionId && (<react_native_1.Text style={[styles.successText, { color: theme.tokens?.successText || '#22c55e' }]}>
          {t('ui.redirecting_to_checkout')}
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
//# sourceMappingURL=SubscribeButton.js.map