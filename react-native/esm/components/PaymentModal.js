import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, } from 'react-native';
import { StripeButton } from './StripeButton';
import { CryptoButton } from './CryptoButton';
import { CreditsButton } from './CreditsButton';
import { NativeStoreButton } from './NativeStoreButton';
import { RestorePurchasesButton } from './RestorePurchasesButton';
import { ManageSubscriptionsButton } from './ManageSubscriptionsButton';
import { useCedrosContext } from '../context';
import { useTranslation } from '../i18n/useTranslation';
import { mergeCedrosProductDefinition } from '../policy/resolveStoreProductConfiguration';
import { isManageableStoreSubscription, isRestorableStoreProduct, resolveNativeStoreMethod, } from '../policy/nativeStoreSupport';
export const PaymentModal = ({ isOpen, onClose, resource, items, product, distributionChannel, appleIapLabel = 'Buy with Apple', googlePlayBillingLabel = 'Buy with Google Play', restorePurchasesLabel = 'Restore Purchases', manageSubscriptionsLabel = 'Manage Subscription', cardLabel = 'Card', cryptoLabel = 'USDC (Solana)', creditsLabel = 'Pay with Credits', showAppleIap = false, showGooglePlayBilling = false, showRestorePurchases, showManageSubscriptions, showCard = true, showCrypto = true, showCredits = false, onPaymentAttempt, onPaymentSuccess, onPaymentError, onAppleIapSuccess, onGooglePlayBillingSuccess, onStripeSuccess, onCryptoSuccess, onCreditsSuccess, onRestorePurchasesSuccess, onManageSubscriptionsOpen, onAppleIapError, onGooglePlayBillingError, onStripeError, onCryptoError, onCreditsError, onRestorePurchasesError, onManageSubscriptionsError, customerEmail, successUrl, cancelUrl, metadata, couponCode, authToken, hideMessages = false, contentStyle, }) => {
    const { config } = useCedrosContext();
    const { t } = useTranslation();
    const resolvedResource = resource ?? product?.id;
    const resolvedProduct = React.useMemo(() => mergeCedrosProductDefinition({
        fallbackId: resolvedResource,
        catalogProduct: resolvedResource
            ? config.paymentPolicy?.productCatalog?.[resolvedResource]
            : undefined,
        explicitProduct: product,
    }), [config.paymentPolicy?.productCatalog, product, resolvedResource]);
    const nativeMethod = resolveNativeStoreMethod(distributionChannel);
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
        (showRestorePurchases ?? isRestorableStoreProduct(resolvedProduct));
    const shouldShowManageSubscriptions = showNativeStoreLifecycleActions &&
        canManageSubscriptions &&
        (showManageSubscriptions ?? isManageableStoreSubscription(resolvedProduct));
    if (!isOpen)
        return null;
    return (<Modal visible={isOpen} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, contentStyle]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Choose Payment Method</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} accessible={true} accessibilityRole="button" accessibilityLabel={t('ui.close')}>
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.buttonsContainer}>
            {showAppleIap && resolvedProduct && distributionChannel && (<View style={styles.buttonWrapper}>
                <NativeStoreButton method="apple_iap" product={resolvedProduct} distributionChannel={distributionChannel} checkout={{
                customerEmail,
                successUrl,
                cancelUrl,
                metadata,
                couponCode,
                authToken,
            }} label={appleIapLabel} onAttempt={onPaymentAttempt} onSuccess={onAppleIapSuccess || onPaymentSuccess} onError={onAppleIapError || onPaymentError}/>
              </View>)}
            {showGooglePlayBilling && resolvedProduct && distributionChannel && (<View style={styles.buttonWrapper}>
                <NativeStoreButton method="google_play_billing" product={resolvedProduct} distributionChannel={distributionChannel} checkout={{
                customerEmail,
                successUrl,
                cancelUrl,
                metadata,
                couponCode,
                authToken,
            }} label={googlePlayBillingLabel} onAttempt={onPaymentAttempt} onSuccess={onGooglePlayBillingSuccess || onPaymentSuccess} onError={onGooglePlayBillingError || onPaymentError}/>
              </View>)}
            {shouldShowRestorePurchases &&
            resolvedProduct &&
            distributionChannel && (<View style={styles.secondaryButtonWrapper}>
                  <RestorePurchasesButton product={resolvedProduct} distributionChannel={distributionChannel} checkout={{
                customerEmail,
                successUrl,
                cancelUrl,
                metadata,
                couponCode,
                authToken,
            }} label={restorePurchasesLabel} onSuccess={onRestorePurchasesSuccess} onError={onRestorePurchasesError}/>
                </View>)}
            {shouldShowManageSubscriptions &&
            resolvedProduct &&
            distributionChannel && (<View style={styles.secondaryButtonWrapper}>
                  <ManageSubscriptionsButton product={resolvedProduct} distributionChannel={distributionChannel} label={manageSubscriptionsLabel} onOpen={onManageSubscriptionsOpen} onError={onManageSubscriptionsError}/>
                </View>)}
            {showCard && (<View style={styles.buttonWrapper}>
                <StripeButton resource={resolvedResource} items={items} label={cardLabel} onAttempt={onPaymentAttempt} onSuccess={onStripeSuccess || onPaymentSuccess} onError={onStripeError || onPaymentError} customerEmail={customerEmail} successUrl={successUrl} cancelUrl={cancelUrl} metadata={metadata} couponCode={couponCode}/>
              </View>)}
            {showCrypto && (<View style={styles.buttonWrapper}>
                <CryptoButton resource={resolvedResource} items={items} label={cryptoLabel} onAttempt={onPaymentAttempt} onSuccess={onCryptoSuccess || onPaymentSuccess} onError={onCryptoError || onPaymentError} hideMessages={hideMessages} metadata={metadata} couponCode={couponCode}/>
              </View>)}
            {showCredits && (<View style={styles.buttonWrapper}>
                <CreditsButton resource={resolvedResource} items={items} label={creditsLabel} authToken={authToken} onAttempt={onPaymentAttempt ? () => onPaymentAttempt('credits') : undefined} onSuccess={onCreditsSuccess || onPaymentSuccess} onError={onCreditsError || onPaymentError} metadata={metadata} couponCode={couponCode}/>
              </View>)}
          </ScrollView>
        </View>
      </View>
    </Modal>);
};
const styles = StyleSheet.create({
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