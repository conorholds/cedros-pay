import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useCedrosContext, useCedrosTheme } from '../context';
import type {
  CedrosProductDefinition,
  DistributionChannel,
  NativeStoreMethod,
  NativeStoreCheckoutContext,
} from '../types/storePolicy';
import { createDedupedClickHandler } from '../utils/requestDeduplication';
import {
  emitPaymentError,
  emitPaymentProcessing,
  emitPaymentStart,
  emitPaymentSuccess,
} from '../utils/eventEmitter';

interface NativeStoreButtonProps {
  method: NativeStoreMethod;
  product: CedrosProductDefinition;
  distributionChannel: DistributionChannel;
  checkout?: NativeStoreCheckoutContext;
  label?: string;
  disabled?: boolean;
  onAttempt?: (method: NativeStoreMethod) => void;
  onSuccess?: (transactionId: string) => void;
  onError?: (error: string) => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  loadingColor?: string;
}

function getDefaultLabel(method: NativeStoreMethod) {
  return method === 'apple_iap' ? 'Buy with Apple' : 'Buy with Google Play';
}

export function NativeStoreButton({
  method,
  product,
  distributionChannel,
  checkout,
  label,
  disabled = false,
  onAttempt,
  onSuccess,
  onError,
  style,
  textStyle,
  loadingColor = '#ffffff',
}: NativeStoreButtonProps) {
  const { config, storeBillingManager } = useCedrosContext();
  const theme = useCedrosTheme();
  const [error, setError] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handler = config.paymentPolicy?.nativeHandlers?.[method];
  const buttonLabel = label || handler?.label || getDefaultLabel(method);

  const executePurchase = useMemo(
    () => async () => {
      if (!handler && config.paymentPolicy?.storeBilling?.enabled === false) {
        const missingHandlerError =
          method === 'apple_iap'
            ? 'Apple IAP is disabled for this build and no override handler is configured.'
            : 'Google Play Billing is disabled for this build and no override handler is configured.';
        setError(missingHandlerError);
        emitPaymentError(method, missingHandlerError, product.id);
        onError?.(missingHandlerError);
        return;
      }

      setIsLoading(true);
      setError(null);

      emitPaymentStart(method, product.id);
      onAttempt?.(method);
      emitPaymentProcessing(method, product.id);

      try {
        const result = handler
          ? await handler.purchase({
              product,
              distributionChannel,
              fulfillmentType: product.fulfillmentType,
              checkout,
            })
          : await storeBillingManager.purchase({
              method,
              product,
              distributionChannel,
              fulfillmentType: product.fulfillmentType,
              checkout,
            });

        setTransactionId(result.transactionId);
        emitPaymentSuccess(method, result.transactionId, product.id);
        onSuccess?.(result.transactionId);
      } catch (purchaseError) {
        const message =
          purchaseError instanceof Error
            ? purchaseError.message
            : 'Native store purchase failed';
        setError(message);
        emitPaymentError(method, message, product.id);
        onError?.(message);
      } finally {
        setIsLoading(false);
      }
    },
    [
      checkout,
      config.paymentPolicy?.storeBilling?.enabled,
      distributionChannel,
      handler,
      method,
      onAttempt,
      onError,
      onSuccess,
      product,
      storeBillingManager,
    ]
  );

  const handlePress = useMemo(
    () =>
      createDedupedClickHandler(`${method}-${product.id}`, executePurchase),
    [executePurchase, method, product.id]
  );

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled || isLoading}
        style={[
          styles.button,
          theme.unstyled
            ? null
            : {
                backgroundColor:
                  method === 'apple_iap'
                    ? '#000000'
                    : theme.tokens?.stripeBackground || '#34a853',
              },
          (disabled || isLoading) && styles.disabled,
        ]}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <ActivityIndicator color={loadingColor} size="small" />
        ) : (
          <Text style={[styles.buttonText, textStyle]}>{buttonLabel}</Text>
        )}
      </TouchableOpacity>
      {error ? (
        <Text
          style={[
            styles.errorText,
            { color: theme.tokens?.errorText || '#ef4444' },
          ]}
        >
          {error}
        </Text>
      ) : null}
      {transactionId ? (
        <Text
          style={[
            styles.successText,
            { color: theme.tokens?.successText || '#22c55e' },
          ]}
        >
          Payment successful
        </Text>
      ) : null}
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
