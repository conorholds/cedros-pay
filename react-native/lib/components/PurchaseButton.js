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
exports.PurchaseButton = void 0;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const context_1 = require("../context");
const usePaymentMode_1 = require("../hooks/usePaymentMode");
const useStripeCheckout_1 = require("../hooks/useStripeCheckout");
const PaymentModal_1 = require("./PaymentModal");
const resolveStoreProductConfiguration_1 = require("../policy/resolveStoreProductConfiguration");
const requestDeduplication_1 = require("../utils/requestDeduplication");
const eventEmitter_1 = require("../utils/eventEmitter");
const cartHelpers_1 = require("../utils/cartHelpers");
const useTranslation_1 = require("../i18n/useTranslation");
const PurchaseButton = ({ resource, items, product, distributionChannel, label, appleIapLabel, googlePlayBillingLabel, restorePurchasesLabel, manageSubscriptionsLabel, cardLabel, cryptoLabel, creditsLabel, showAppleIap = false, showGooglePlayBilling = false, showRestorePurchases, showManageSubscriptions, showCard = true, showCrypto = true, showCredits = false, onPaymentAttempt, onPaymentSuccess, onPaymentError, onAppleIapSuccess, onGooglePlayBillingSuccess, onStripeSuccess, onCryptoSuccess, onCreditsSuccess, onRestorePurchasesSuccess, onManageSubscriptionsOpen, onAppleIapError, onGooglePlayBillingError, onStripeError, onCryptoError, onCreditsError, onRestorePurchasesError, onManageSubscriptionsError, customerEmail, successUrl, cancelUrl, metadata, couponCode, authToken, autoDetectWallets = true, hideMessages = false, style, textStyle, loadingColor = '#ffffff', renderModal, }) => {
    const { config } = (0, context_1.useCedrosContext)();
    const theme = (0, context_1.useCedrosTheme)();
    const [isModalOpen, setIsModalOpen] = (0, react_1.useState)(false);
    const { status, processPayment, processCartCheckout } = (0, useStripeCheckout_1.useStripeCheckout)();
    const { isCartMode, effectiveResource } = (0, usePaymentMode_1.usePaymentMode)(resource, items);
    const { t } = (0, useTranslation_1.useTranslation)();
    const resolvedResource = product?.id ?? effectiveResource;
    const resolvedProduct = (0, react_1.useMemo)(() => (0, resolveStoreProductConfiguration_1.mergeCedrosProductDefinition)({
        fallbackId: resolvedResource,
        catalogProduct: resolvedResource
            ? config.paymentPolicy?.productCatalog?.[resolvedResource]
            : undefined,
        explicitProduct: product,
    }), [config.paymentPolicy?.productCatalog, product, resolvedResource]);
    // Use translated default labels if not provided
    const buttonLabel = label || t('ui.purchase');
    const buttonAppleIapLabel = appleIapLabel || 'Buy with Apple';
    const buttonGooglePlayBillingLabel = googlePlayBillingLabel || 'Buy with Google Play';
    const buttonCardLabel = cardLabel || t('ui.card');
    const buttonCryptoLabel = cryptoLabel || t('ui.usdc_solana');
    const buttonCreditsLabel = creditsLabel || t('ui.pay_with_credits') || 'Pay with Credits';
    // Core click logic (without deduplication)
    const executeClick = (0, react_1.useCallback)(async () => {
        // SECURITY FIX: Only auto-fallback to Stripe if BOTH conditions are met:
        // 1. No wallet detected AND
        // 2. Card payments are actually enabled (showCard={true})
        if (autoDetectWallets && showCard && !showAppleIap && !showGooglePlayBilling) {
            // Lazy-load wallet detection to improve tree-shaking
            const { detectSolanaWallets } = await Promise.resolve().then(() => __importStar(require('../utils/walletDetection')));
            if (!detectSolanaWallets()) {
                // AUTO-STRIPE FALLBACK PATH - Add full telemetry
                const resourceId = isCartMode ? undefined : resolvedResource;
                const itemCount = isCartMode && items ? (0, cartHelpers_1.getCartItemCount)(items) : undefined;
                (0, eventEmitter_1.emitPaymentStart)('stripe', resourceId, itemCount);
                if (onPaymentAttempt) {
                    onPaymentAttempt('stripe');
                }
                (0, eventEmitter_1.emitPaymentProcessing)('stripe', resourceId, itemCount);
                let result;
                if (isCartMode && items) {
                    result = await processCartCheckout(items, successUrl, cancelUrl, metadata, customerEmail, couponCode);
                }
                else if (resolvedResource) {
                    result = await processPayment(resolvedResource, successUrl, cancelUrl, metadata, customerEmail, couponCode);
                }
                if (result && result.success && result.transactionId) {
                    (0, eventEmitter_1.emitPaymentSuccess)('stripe', result.transactionId, resourceId, itemCount);
                    if (onStripeSuccess) {
                        onStripeSuccess(result.transactionId);
                    }
                    else if (onPaymentSuccess) {
                        onPaymentSuccess(result.transactionId);
                    }
                }
                else if (result && !result.success && result.error) {
                    (0, eventEmitter_1.emitPaymentError)('stripe', result.error, resourceId, itemCount);
                    if (onStripeError) {
                        onStripeError(result.error);
                    }
                    else if (onPaymentError) {
                        onPaymentError(result.error);
                    }
                }
                return;
            }
        }
        // Otherwise, show the modal
        setIsModalOpen(true);
    }, [
        autoDetectWallets,
        showCard,
        showAppleIap,
        showGooglePlayBilling,
        isCartMode,
        items,
        resolvedResource,
        processCartCheckout,
        processPayment,
        successUrl,
        cancelUrl,
        metadata,
        customerEmail,
        couponCode,
        onPaymentSuccess,
        onPaymentError,
        onStripeSuccess,
        onStripeError,
        onPaymentAttempt,
    ]);
    // Create unique button ID for deduplication
    const buttonId = (0, react_1.useMemo)(() => {
        if (isCartMode && items) {
            return `purchase-cart-${items.map((i) => i.resource).join('-')}`;
        }
        return `purchase-${resolvedResource || 'unknown'}`;
    }, [isCartMode, items, resolvedResource]);
    // Wrap with deduplication + cooldown
    const handlePress = (0, react_1.useMemo)(() => (0, requestDeduplication_1.createDedupedClickHandler)(buttonId, executeClick), [buttonId, executeClick]);
    const isLoading = status === 'loading';
    const modalProps = {
        isOpen: isModalOpen,
        onClose: () => setIsModalOpen(false),
        resource: isCartMode ? undefined : resolvedResource,
        items: isCartMode ? items : undefined,
        product: resolvedProduct,
        distributionChannel,
        appleIapLabel: buttonAppleIapLabel,
        googlePlayBillingLabel: buttonGooglePlayBillingLabel,
        restorePurchasesLabel,
        manageSubscriptionsLabel,
        cardLabel: buttonCardLabel,
        cryptoLabel: buttonCryptoLabel,
        creditsLabel: buttonCreditsLabel,
        showAppleIap,
        showGooglePlayBilling,
        showRestorePurchases,
        showManageSubscriptions,
        showCard,
        showCrypto,
        showCredits,
        onPaymentAttempt,
        onPaymentSuccess: (txId) => {
            setIsModalOpen(false);
            onPaymentSuccess?.(txId);
        },
        onPaymentError: (error) => {
            setIsModalOpen(false);
            onPaymentError?.(error);
        },
        onAppleIapSuccess: (txId) => {
            setIsModalOpen(false);
            onAppleIapSuccess?.(txId);
        },
        onGooglePlayBillingSuccess: (txId) => {
            setIsModalOpen(false);
            onGooglePlayBillingSuccess?.(txId);
        },
        onStripeSuccess: (txId) => {
            setIsModalOpen(false);
            onStripeSuccess?.(txId);
        },
        onCryptoSuccess: (txId) => {
            setIsModalOpen(false);
            onCryptoSuccess?.(txId);
        },
        onCreditsSuccess: (txId) => {
            setIsModalOpen(false);
            onCreditsSuccess?.(txId);
        },
        onRestorePurchasesSuccess: (results) => {
            setIsModalOpen(false);
            onRestorePurchasesSuccess?.(results);
        },
        onManageSubscriptionsOpen: () => {
            setIsModalOpen(false);
            onManageSubscriptionsOpen?.();
        },
        onAppleIapError: (error) => {
            setIsModalOpen(false);
            onAppleIapError?.(error);
        },
        onGooglePlayBillingError: (error) => {
            setIsModalOpen(false);
            onGooglePlayBillingError?.(error);
        },
        onStripeError: (error) => {
            setIsModalOpen(false);
            onStripeError?.(error);
        },
        onCryptoError: (error) => {
            setIsModalOpen(false);
            onCryptoError?.(error);
        },
        onCreditsError: (error) => {
            setIsModalOpen(false);
            onCreditsError?.(error);
        },
        onRestorePurchasesError,
        onManageSubscriptionsError,
        customerEmail,
        successUrl,
        cancelUrl,
        metadata,
        couponCode,
        authToken,
        hideMessages,
    };
    return (<react_native_1.View style={styles.container}>
      <react_native_1.TouchableOpacity onPress={handlePress} disabled={isLoading} style={[
            styles.button,
            theme.unstyled
                ? null
                : { backgroundColor: theme.tokens?.stripeBackground || '#635BFF' },
            isLoading && styles.disabled,
            style,
        ]} activeOpacity={0.8} accessible={true} accessibilityRole="button" accessibilityLabel={buttonLabel} accessibilityState={{ disabled: isLoading, busy: isLoading }}>
        {isLoading ? (<react_native_1.ActivityIndicator color={loadingColor} size="small"/>) : (<react_native_1.Text style={[styles.buttonText, textStyle]}>{buttonLabel}</react_native_1.Text>)}
      </react_native_1.TouchableOpacity>

      {renderModal ? renderModal(modalProps) : <PaymentModal_1.PaymentModal {...modalProps}/>}
    </react_native_1.View>);
};
exports.PurchaseButton = PurchaseButton;
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
});
//# sourceMappingURL=PurchaseButton.js.map