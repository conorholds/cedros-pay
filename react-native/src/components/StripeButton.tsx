import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useCedrosTheme } from '../context';
import { useStripeCheckout } from '../hooks/useStripeCheckout';
import { usePaymentMode } from '../hooks/usePaymentMode';
import { getLogger } from '../utils/logger';
import {
  emitPaymentStart,
  emitPaymentProcessing,
  emitPaymentSuccess,
  emitPaymentError,
} from '../utils/eventEmitter';
import { getCartItemCount } from '../utils/cartHelpers';
import { createDedupedClickHandler } from '../utils/requestDeduplication';
import { useTranslation } from '../i18n/useTranslation';
import type { CartItem } from '../types';

/**
 * Props for StripeButton component
 */
interface StripeButtonProps {
  resource?: string;
  items?: CartItem[];
  successUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, string>;
  customerEmail?: string;
  couponCode?: string;
  label?: string;
  disabled?: boolean;
  onAttempt?: (method: 'stripe' | 'crypto') => void;
  onSuccess?: (transactionId: string) => void;
  onError?: (error: string) => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  loadingColor?: string;
}

/**
 * Button component for Stripe card payments (React Native)
 *
 * Handles redirect to Stripe-hosted checkout
 */
export function StripeButton({
  resource,
  items,
  successUrl,
  cancelUrl,
  metadata,
  customerEmail,
  couponCode,
  label,
  disabled = false,
  onAttempt,
  onSuccess,
  onError,
  style,
  textStyle,
  loadingColor = '#ffffff',
}: StripeButtonProps) {
  const { status, error, transactionId, processPayment, processCartCheckout } =
    useStripeCheckout();
  const theme = useCedrosTheme();
  const { isCartMode, effectiveResource } = usePaymentMode(resource, items);
  const { t, translations } = useTranslation();

  const buttonLabel = label || t('ui.pay_with_card');

  const errorCode =
    error && typeof error !== 'string'
      ? (error as { code?: string })?.code ?? null
      : null;

  const getErrorMessage = (code: string | null): string => {
    if (!code || !translations) return '';
    const errorData = translations.errors[code];
    if (!errorData) return '';
    return errorData.action
      ? `${errorData.message} ${errorData.action}`
      : errorData.message;
  };

  const localizedError = error
    ? typeof error === 'string'
      ? error
      : getErrorMessage(errorCode)
    : null;

  const executePayment = useCallback(async () => {
    getLogger().debug(
      '[StripeButton] executePayment with couponCode:',
      couponCode
    );

    const itemCount =
      isCartMode && items ? getCartItemCount(items) : undefined;

    emitPaymentStart('stripe', effectiveResource, itemCount);

    if (onAttempt) {
      onAttempt('stripe');
    }

    if (!isCartMode && !effectiveResource) {
      const errorMsg = 'Invalid payment configuration: missing resource or items';
      getLogger().error('[StripeButton]', errorMsg);
      emitPaymentError('stripe', errorMsg, effectiveResource, itemCount);
      if (onError) {
        onError(errorMsg);
      }
      return;
    }

    let result;

    emitPaymentProcessing('stripe', effectiveResource, itemCount);

    if (isCartMode && items) {
      getLogger().debug(
        '[StripeButton] Processing cart checkout with coupon:',
        couponCode
      );
      result = await processCartCheckout(
        items,
        successUrl,
        cancelUrl,
        metadata,
        customerEmail,
        couponCode
      );
    } else if (effectiveResource) {
      getLogger().debug(
        '[StripeButton] Processing single payment with coupon:',
        couponCode
      );
      result = await processPayment(
        effectiveResource,
        successUrl,
        cancelUrl,
        metadata,
        customerEmail,
        couponCode
      );
    }

    if (result && result.success && result.transactionId) {
      emitPaymentSuccess(
        'stripe',
        result.transactionId,
        effectiveResource,
        itemCount
      );
      if (onSuccess) {
        onSuccess(result.transactionId);
      }
    } else if (result && !result.success && result.error) {
      emitPaymentError('stripe', result.error, effectiveResource, itemCount);
      if (onError) {
        onError(result.error);
      }
    }
  }, [
    couponCode,
    isCartMode,
    effectiveResource,
    items,
    successUrl,
    cancelUrl,
    metadata,
    customerEmail,
    processCartCheckout,
    processPayment,
    onAttempt,
    onSuccess,
    onError,
  ]);

  const buttonId = useMemo(() => {
    if (isCartMode && items) {
      return `stripe-cart-${items.map((i) => i.resource).join('-')}`;
    }
    return `stripe-${effectiveResource || 'unknown'}`;
  }, [isCartMode, items, effectiveResource]);

  const handlePress = useMemo(
    () => createDedupedClickHandler(buttonId, executePayment),
    [buttonId, executePayment]
  );

  const isLoading = status === 'loading';
  const isDisabled = disabled || isLoading;

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        onPress={handlePress}
        disabled={isDisabled}
        style={[
          styles.button,
          theme.unstyled ? null : { backgroundColor: theme.tokens?.stripeBackground || '#635BFF' },
          isDisabled && styles.disabled,
        ]}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <ActivityIndicator color={loadingColor} size="small" />
        ) : (
          <Text style={[styles.buttonText, textStyle]}>{buttonLabel}</Text>
        )}
      </TouchableOpacity>
      {localizedError && (
        <Text style={[styles.errorText, { color: theme.tokens?.errorText || '#ef4444' }]}>
          {localizedError}
        </Text>
      )}
      {transactionId && (
        <Text style={[styles.successText, { color: theme.tokens?.successText || '#22c55e' }]}>
          {t('ui.payment_successful')}
        </Text>
      )}
    </View>
  );
}

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
