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
const useTranslation_1 = require("../i18n/useTranslation");
const PaymentModal = ({ isOpen, onClose, resource, items, cardLabel = 'Card', cryptoLabel = 'USDC (Solana)', creditsLabel = 'Pay with Credits', showCard = true, showCrypto = true, showCredits = false, onPaymentAttempt, onPaymentSuccess, onPaymentError, onStripeSuccess, onCryptoSuccess, onCreditsSuccess, onStripeError, onCryptoError, onCreditsError, customerEmail, successUrl, cancelUrl, metadata, couponCode, authToken, hideMessages = false, contentStyle, }) => {
    const { t } = (0, useTranslation_1.useTranslation)();
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
            {showCard && (<react_native_1.View style={styles.buttonWrapper}>
                <StripeButton_1.StripeButton resource={resource} items={items} label={cardLabel} onAttempt={onPaymentAttempt} onSuccess={onStripeSuccess || onPaymentSuccess} onError={onStripeError || onPaymentError} customerEmail={customerEmail} successUrl={successUrl} cancelUrl={cancelUrl} metadata={metadata} couponCode={couponCode}/>
              </react_native_1.View>)}
            {showCrypto && (<react_native_1.View style={styles.buttonWrapper}>
                <CryptoButton_1.CryptoButton resource={resource} items={items} label={cryptoLabel} onAttempt={onPaymentAttempt} onSuccess={onCryptoSuccess || onPaymentSuccess} onError={onCryptoError || onPaymentError} hideMessages={hideMessages} metadata={metadata} couponCode={couponCode}/>
              </react_native_1.View>)}
            {showCredits && (<react_native_1.View style={styles.buttonWrapper}>
                <CreditsButton_1.CreditsButton resource={resource} items={items} label={creditsLabel} authToken={authToken} onAttempt={onPaymentAttempt ? () => onPaymentAttempt('credits') : undefined} onSuccess={onCreditsSuccess || onPaymentSuccess} onError={onCreditsError || onPaymentError} metadata={metadata} couponCode={couponCode}/>
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
});
//# sourceMappingURL=PaymentModal.js.map