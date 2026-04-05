"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentModal = void 0;
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const StripeButton_1 = require("./StripeButton");
const CryptoButton_1 = require("./CryptoButton");
const CreditsButton_1 = require("./CreditsButton");
const NativeStoreButton_1 = require("./NativeStoreButton");
const RestorePurchasesButton_1 = require("./RestorePurchasesButton");
const ManageSubscriptionsButton_1 = require("./ManageSubscriptionsButton");
const context_1 = require("../context");
const useTranslation_1 = require("../i18n/useTranslation");
const resolveStoreProductConfiguration_1 = require("../policy/resolveStoreProductConfiguration");
const nativeStoreSupport_1 = require("../policy/nativeStoreSupport");
const PaymentModal = ({ isOpen, onClose, resource, items, product, distributionChannel, appleIapLabel = 'Buy with Apple', googlePlayBillingLabel = 'Buy with Google Play', restorePurchasesLabel = 'Restore Purchases', manageSubscriptionsLabel = 'Manage Subscription', cardLabel = 'Card', cryptoLabel = 'USDC (Solana)', creditsLabel = 'Pay with Credits', showAppleIap = false, showGooglePlayBilling = false, showRestorePurchases, showManageSubscriptions, showCard = true, showCrypto = true, showCredits = false, onPaymentAttempt, onPaymentSuccess, onPaymentError, onAppleIapSuccess, onGooglePlayBillingSuccess, onStripeSuccess, onCryptoSuccess, onCreditsSuccess, onRestorePurchasesSuccess, onManageSubscriptionsOpen, onAppleIapError, onGooglePlayBillingError, onStripeError, onCryptoError, onCreditsError, onRestorePurchasesError, onManageSubscriptionsError, customerEmail, successUrl, cancelUrl, metadata, couponCode, authToken, hideMessages = false, contentStyle, }) => {
    const { config } = (0, context_1.useCedrosContext)();
    const { t } = (0, useTranslation_1.useTranslation)();
    const resolvedResource = resource ?? product?.id;
    const resolvedProduct = react_1.default.useMemo(() => (0, resolveStoreProductConfiguration_1.mergeCedrosProductDefinition)({
        fallbackId: resolvedResource,
        catalogProduct: resolvedResource
            ? config.paymentPolicy?.productCatalog?.[resolvedResource]
            : undefined,
        explicitProduct: product,
    }), [config.paymentPolicy?.productCatalog, product, resolvedResource]);
    const nativeMethod = (0, nativeStoreSupport_1.resolveNativeStoreMethod)(distributionChannel);
    const nativeHandler = nativeMethod
        ? config.paymentPolicy?.nativeHandlers?.[nativeMethod]
        : undefined;
    const canRestorePurchases = config.paymentPolicy?.storeBilling?.enabled !== false ||
        Boolean(nativeHandler?.restorePurchases);
    const canManageSubscriptions = config.paymentPolicy?.storeBilling?.enabled !== false ||
        Boolean(nativeHandler?.openManageSubscriptions);
    const showNativeStoreLifecycleActions = Boolean(resolvedProduct &&
        distributionChannel &&
        (showAppleIap || showGooglePlayBilling));
    const shouldShowRestorePurchases = showNativeStoreLifecycleActions &&
        canRestorePurchases &&
        (showRestorePurchases ?? (0, nativeStoreSupport_1.isRestorableStoreProduct)(resolvedProduct));
    const shouldShowManageSubscriptions = showNativeStoreLifecycleActions &&
        canManageSubscriptions &&
        (showManageSubscriptions ?? (0, nativeStoreSupport_1.isManageableStoreSubscription)(resolvedProduct));
    if (!isOpen)
        return null;
    return (<react_native_1.Modal visible={isOpen} transparent={true} animationType="fade" onRequestClose={onClose}>
      <react_native_1.View style={styles.modalOverlay}>
        <react_native_1.View style={[styles.modalContent, contentStyle]}>
          <react_native_1.View style={styles.modalHeader}>
            <react_native_1.Text style={styles.modalTitle}>Choose Payment Method</react_native_1.Text>
            <react_native_1.TouchableOpacity onPress={onClose} style={styles.closeButton} accessible={true} accessibilityRole="button" accessibilityLabel={t('ui.close')}>
              <react_native_1.Text style={styles.closeButtonText}>×</react_native_1.Text>
            </react_native_1.TouchableOpacity>
          </react_native_1.View>

          <react_native_1.ScrollView style={styles.buttonsContainer}>
            {showAppleIap && resolvedProduct && distributionChannel && (<react_native_1.View style={styles.buttonWrapper}>
                <NativeStoreButton_1.NativeStoreButton method="apple_iap" product={resolvedProduct} distributionChannel={distributionChannel} checkout={{
                customerEmail,
                successUrl,
                cancelUrl,
                metadata,
                couponCode,
                authToken,
            }} label={appleIapLabel} onAttempt={onPaymentAttempt} onSuccess={onAppleIapSuccess || onPaymentSuccess} onError={onAppleIapError || onPaymentError}/>
              </react_native_1.View>)}
            {showGooglePlayBilling && resolvedProduct && distributionChannel && (<react_native_1.View style={styles.buttonWrapper}>
                <NativeStoreButton_1.NativeStoreButton method="google_play_billing" product={resolvedProduct} distributionChannel={distributionChannel} checkout={{
                customerEmail,
                successUrl,
                cancelUrl,
                metadata,
                couponCode,
                authToken,
            }} label={googlePlayBillingLabel} onAttempt={onPaymentAttempt} onSuccess={onGooglePlayBillingSuccess || onPaymentSuccess} onError={onGooglePlayBillingError || onPaymentError}/>
              </react_native_1.View>)}
            {shouldShowRestorePurchases &&
            resolvedProduct &&
            distributionChannel && (<react_native_1.View style={styles.secondaryButtonWrapper}>
                  <RestorePurchasesButton_1.RestorePurchasesButton product={resolvedProduct} distributionChannel={distributionChannel} checkout={{
                customerEmail,
                successUrl,
                cancelUrl,
                metadata,
                couponCode,
                authToken,
            }} label={restorePurchasesLabel} onSuccess={onRestorePurchasesSuccess} onError={onRestorePurchasesError}/>
                </react_native_1.View>)}
            {shouldShowManageSubscriptions &&
            resolvedProduct &&
            distributionChannel && (<react_native_1.View style={styles.secondaryButtonWrapper}>
                  <ManageSubscriptionsButton_1.ManageSubscriptionsButton product={resolvedProduct} distributionChannel={distributionChannel} label={manageSubscriptionsLabel} onOpen={onManageSubscriptionsOpen} onError={onManageSubscriptionsError}/>
                </react_native_1.View>)}
            {showCard && (<react_native_1.View style={styles.buttonWrapper}>
                <StripeButton_1.StripeButton resource={resolvedResource} items={items} label={cardLabel} onAttempt={onPaymentAttempt} onSuccess={onStripeSuccess || onPaymentSuccess} onError={onStripeError || onPaymentError} customerEmail={customerEmail} successUrl={successUrl} cancelUrl={cancelUrl} metadata={metadata} couponCode={couponCode}/>
              </react_native_1.View>)}
            {showCrypto && (<react_native_1.View style={styles.buttonWrapper}>
                <CryptoButton_1.CryptoButton resource={resolvedResource} items={items} label={cryptoLabel} onAttempt={onPaymentAttempt} onSuccess={onCryptoSuccess || onPaymentSuccess} onError={onCryptoError || onPaymentError} hideMessages={hideMessages} metadata={metadata} couponCode={couponCode}/>
              </react_native_1.View>)}
            {showCredits && (<react_native_1.View style={styles.buttonWrapper}>
                <CreditsButton_1.CreditsButton resource={resolvedResource} items={items} label={creditsLabel} authToken={authToken} onAttempt={onPaymentAttempt ? () => onPaymentAttempt('credits') : undefined} onSuccess={onCreditsSuccess || onPaymentSuccess} onError={onCreditsError || onPaymentError} metadata={metadata} couponCode={couponCode}/>
              </react_native_1.View>)}
          </react_native_1.ScrollView>
        </react_native_1.View>
      </react_native_1.View>
    </react_native_1.Modal>);
};
exports.PaymentModal = PaymentModal;
const styles = react_native_1.StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    modalContent: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
    },
    closeButton: {
        padding: 4,
    },
    closeButtonText: {
        fontSize: 24,
        color: '#6b7280',
        lineHeight: 24,
    },
    buttonsContainer: {
        maxHeight: 400,
    },
    buttonWrapper: {
        marginBottom: 12,
    },
    secondaryButtonWrapper: {
        marginTop: 4,
        marginBottom: 12,
    },
});
//# sourceMappingURL=PaymentModal.js.map