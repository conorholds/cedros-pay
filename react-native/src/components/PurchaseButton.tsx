import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useCedrosContext, useCedrosTheme } from '../context';
import { usePaymentMode } from '../hooks/usePaymentMode';
import { useStripeCheckout } from '../hooks/useStripeCheckout';
import { PaymentModal, type PaymentModalProps } from './PaymentModal';
import { mergeCedrosProductDefinition } from '../policy/resolveStoreProductConfiguration';
import { createDedupedClickHandler } from '../utils/requestDeduplication';
import {
  emitPaymentStart,
  emitPaymentProcessing,
  emitPaymentSuccess,
  emitPaymentError,
} from '../utils/eventEmitter';
import { getCartItemCount } from '../utils/cartHelpers';
import { useTranslation } from '../i18n/useTranslation';
import type {
  CartItem,
  CedrosProductDefinition,
  DistributionChannel,
  NativeStorePurchaseResult,
  PaymentMethod,
} from '../types';

export interface PurchaseButtonProps {
  /** Single resource ID (for single-item payments) */
  resource?: string;
  /** Multiple items (for cart purchases) - mutually exclusive with resource */
  items?: CartItem[];
  product?: CedrosProductDefinition;
  distributionChannel?: DistributionChannel;
  label?: string;
  appleIapLabel?: string;
  googlePlayBillingLabel?: string;
  restorePurchasesLabel?: string;
  manageSubscriptionsLabel?: string;
  cardLabel?: string;
  cryptoLabel?: string;
  creditsLabel?: string;
  showAppleIap?: boolean;
  showGooglePlayBilling?: boolean;
  showRestorePurchases?: boolean;
  showManageSubscriptions?: boolean;
  showCard?: boolean;
  showCrypto?: boolean;
  showCredits?: boolean;
  /** Track payment attempt for analytics */
  onPaymentAttempt?: (method: PaymentMethod) => void;
  /** Legacy: used for auto-Stripe fallback only */
  onPaymentSuccess?: (txId: string) => void;
  /** Legacy: used for auto-Stripe fallback only */
  onPaymentError?: (error: string) => void;
  /** Method-specific callbacks (new, preferred) */
  onAppleIapSuccess?: (txId: string) => void;
  onGooglePlayBillingSuccess?: (txId: string) => void;
  onStripeSuccess?: (txId: string) => void;
  onCryptoSuccess?: (txId: string) => void;
  onCreditsSuccess?: (txId: string) => void;
  onRestorePurchasesSuccess?: (results: NativeStorePurchaseResult[]) => void;
  onManageSubscriptionsOpen?: () => void;
  onAppleIapError?: (error: string) => void;
  onGooglePlayBillingError?: (error: string) => void;
  onStripeError?: (error: string) => void;
  onCryptoError?: (error: string) => void;
  onCreditsError?: (error: string) => void;
  onRestorePurchasesError?: (error: string) => void;
  onManageSubscriptionsError?: (error: string) => void;
  customerEmail?: string;
  successUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, string>;
  couponCode?: string;
  /** JWT token from cedros-login for credits payment authentication */
  authToken?: string;
  autoDetectWallets?: boolean;
  hideMessages?: boolean;
  /** Custom button style */
  style?: ViewStyle;
  /** Custom text style */
  textStyle?: TextStyle;
  /** Loading indicator color */
  loadingColor?: string;
  /** Custom modal renderer */
  renderModal?: (props: PaymentModalProps) => React.ReactNode;
}

export const PurchaseButton: React.FC<PurchaseButtonProps> = ({
  resource,
  items,
  product,
  distributionChannel,
  label,
  appleIapLabel,
  googlePlayBillingLabel,
  restorePurchasesLabel,
  manageSubscriptionsLabel,
  cardLabel,
  cryptoLabel,
  creditsLabel,
  showAppleIap = false,
  showGooglePlayBilling = false,
  showRestorePurchases,
  showManageSubscriptions,
  showCard = true,
  showCrypto = true,
  showCredits = false,
  onPaymentAttempt,
  onPaymentSuccess,
  onPaymentError,
  onAppleIapSuccess,
  onGooglePlayBillingSuccess,
  onStripeSuccess,
  onCryptoSuccess,
  onCreditsSuccess,
  onRestorePurchasesSuccess,
  onManageSubscriptionsOpen,
  onAppleIapError,
  onGooglePlayBillingError,
  onStripeError,
  onCryptoError,
  onCreditsError,
  onRestorePurchasesError,
  onManageSubscriptionsError,
  customerEmail,
  successUrl,
  cancelUrl,
  metadata,
  couponCode,
  authToken,
  autoDetectWallets = true,
  hideMessages = false,
  style,
  textStyle,
  loadingColor = '#ffffff',
  renderModal,
}) => {
  const { config } = useCedrosContext();
  const theme = useCedrosTheme();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { status, processPayment, processCartCheckout } = useStripeCheckout();
  const { isCartMode, effectiveResource } = usePaymentMode(resource, items);
  const { t } = useTranslation();
  const resolvedResource = product?.id ?? effectiveResource;
  const resolvedProduct = useMemo(
    () =>
      mergeCedrosProductDefinition({
        fallbackId: resolvedResource,
        catalogProduct: resolvedResource
          ? config.paymentPolicy?.productCatalog?.[resolvedResource]
          : undefined,
        explicitProduct: product,
      }),
    [config.paymentPolicy?.productCatalog, product, resolvedResource]
  );

  // Use translated default labels if not provided
  const buttonLabel = label || t('ui.purchase');
  const buttonAppleIapLabel = appleIapLabel || 'Buy with Apple';
  const buttonGooglePlayBillingLabel =
    googlePlayBillingLabel || 'Buy with Google Play';
  const buttonCardLabel = cardLabel || t('ui.card');
  const buttonCryptoLabel = cryptoLabel || t('ui.usdc_solana');
  const buttonCreditsLabel = creditsLabel || t('ui.pay_with_credits') || 'Pay with Credits';

  // Core click logic (without deduplication)
  const executeClick = useCallback(async () => {
    // SECURITY FIX: Only auto-fallback to Stripe if BOTH conditions are met:
    // 1. No wallet detected AND
    // 2. Card payments are actually enabled (showCard={true})
    if (autoDetectWallets && showCard && !showAppleIap && !showGooglePlayBilling) {
      // Lazy-load wallet detection to improve tree-shaking
      const { detectSolanaWallets } = await import('../utils/walletDetection');

      if (!detectSolanaWallets()) {
        // AUTO-STRIPE FALLBACK PATH - Add full telemetry
        const resourceId = isCartMode ? undefined : resolvedResource;
        const itemCount = isCartMode && items ? getCartItemCount(items) : undefined;

        emitPaymentStart('stripe', resourceId, itemCount);
        if (onPaymentAttempt) {
          onPaymentAttempt('stripe');
        }

        emitPaymentProcessing('stripe', resourceId, itemCount);

        let result;

        if (isCartMode && items) {
          result = await processCartCheckout(
            items,
            successUrl,
            cancelUrl,
            metadata,
            customerEmail,
            couponCode
          );
        } else if (resolvedResource) {
          result = await processPayment(
            resolvedResource,
            successUrl,
            cancelUrl,
            metadata,
            customerEmail,
            couponCode
          );
        }

        if (result && result.success && result.transactionId) {
          emitPaymentSuccess('stripe', result.transactionId, resourceId, itemCount);
          if (onStripeSuccess) {
            onStripeSuccess(result.transactionId);
          } else if (onPaymentSuccess) {
            onPaymentSuccess(result.transactionId);
          }
        } else if (result && !result.success && result.error) {
          emitPaymentError('stripe', result.error, resourceId, itemCount);
          if (onStripeError) {
            onStripeError(result.error);
          } else if (onPaymentError) {
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
  const buttonId = useMemo(() => {
    if (isCartMode && items) {
      return `purchase-cart-${items.map((i) => i.resource).join('-')}`;
    }
    return `purchase-${resolvedResource || 'unknown'}`;
  }, [isCartMode, items, resolvedResource]);

  // Wrap with deduplication + cooldown
  const handlePress = useMemo(
    () => createDedupedClickHandler(buttonId, executeClick),
    [buttonId, executeClick]
  );

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
    onPaymentSuccess: (txId: string) => {
      setIsModalOpen(false);
      onPaymentSuccess?.(txId);
    },
    onPaymentError: (error: string) => {
      setIsModalOpen(false);
      onPaymentError?.(error);
    },
    onAppleIapSuccess: (txId: string) => {
      setIsModalOpen(false);
      onAppleIapSuccess?.(txId);
    },
    onGooglePlayBillingSuccess: (txId: string) => {
      setIsModalOpen(false);
      onGooglePlayBillingSuccess?.(txId);
    },
    onStripeSuccess: (txId: string) => {
      setIsModalOpen(false);
      onStripeSuccess?.(txId);
    },
    onCryptoSuccess: (txId: string) => {
      setIsModalOpen(false);
      onCryptoSuccess?.(txId);
    },
    onCreditsSuccess: (txId: string) => {
      setIsModalOpen(false);
      onCreditsSuccess?.(txId);
    },
    onRestorePurchasesSuccess: (results: NativeStorePurchaseResult[]) => {
      setIsModalOpen(false);
      onRestorePurchasesSuccess?.(results);
    },
    onManageSubscriptionsOpen: () => {
      setIsModalOpen(false);
      onManageSubscriptionsOpen?.();
    },
    onAppleIapError: (error: string) => {
      setIsModalOpen(false);
      onAppleIapError?.(error);
    },
    onGooglePlayBillingError: (error: string) => {
      setIsModalOpen(false);
      onGooglePlayBillingError?.(error);
    },
    onStripeError: (error: string) => {
      setIsModalOpen(false);
      onStripeError?.(error);
    },
    onCryptoError: (error: string) => {
      setIsModalOpen(false);
      onCryptoError?.(error);
    },
    onCreditsError: (error: string) => {
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

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={handlePress}
        disabled={isLoading}
        style={[
          styles.button,
          theme.unstyled
            ? null
            : { backgroundColor: theme.tokens?.stripeBackground || '#635BFF' },
          isLoading && styles.disabled,
          style,
        ]}
        activeOpacity={0.8}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={buttonLabel}
        accessibilityState={{ disabled: isLoading, busy: isLoading }}
      >
        {isLoading ? (
          <ActivityIndicator color={loadingColor} size="small" />
        ) : (
          <Text style={[styles.buttonText, textStyle]}>{buttonLabel}</Text>
        )}
      </TouchableOpacity>

      {renderModal ? renderModal(modalProps) : <PaymentModal {...modalProps} />}
    </View>
  );
};

const styles = StyleSheet.create({
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
