import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, } from 'react-native';
import { StripeButton } from './StripeButton';
import { CryptoButton } from './CryptoButton';
import { CreditsButton } from './CreditsButton';
import { useTranslation } from '../i18n/useTranslation';
export const PaymentModal = ({ isOpen, onClose, resource, items, cardLabel = 'Card', cryptoLabel = 'USDC (Solana)', creditsLabel = 'Pay with Credits', showCard = true, showCrypto = true, showCredits = false, onPaymentAttempt, onPaymentSuccess, onPaymentError, onStripeSuccess, onCryptoSuccess, onCreditsSuccess, onStripeError, onCryptoError, onCreditsError, customerEmail, successUrl, cancelUrl, metadata, couponCode, authToken, hideMessages = false, contentStyle, }) => {
    const { t } = useTranslation();
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
            {showCard && (<View style={styles.buttonWrapper}>
                <StripeButton resource={resource} items={items} label={cardLabel} onAttempt={onPaymentAttempt} onSuccess={onStripeSuccess || onPaymentSuccess} onError={onStripeError || onPaymentError} customerEmail={customerEmail} successUrl={successUrl} cancelUrl={cancelUrl} metadata={metadata} couponCode={couponCode}/>
              </View>)}
            {showCrypto && (<View style={styles.buttonWrapper}>
                <CryptoButton resource={resource} items={items} label={cryptoLabel} onAttempt={onPaymentAttempt} onSuccess={onCryptoSuccess || onPaymentSuccess} onError={onCryptoError || onPaymentError} hideMessages={hideMessages} metadata={metadata} couponCode={couponCode}/>
              </View>)}
            {showCredits && (<View style={styles.buttonWrapper}>
                <CreditsButton resource={resource} items={items} label={creditsLabel} authToken={authToken} onAttempt={onPaymentAttempt ? () => onPaymentAttempt('credits') : undefined} onSuccess={onCreditsSuccess || onPaymentSuccess} onError={onCreditsError || onPaymentError} metadata={metadata} couponCode={couponCode}/>
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
});
//# sourceMappingURL=PaymentModal.js.map