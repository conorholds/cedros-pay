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
import {
  isManageableStoreSubscription,
  resolveNativeStoreMethod,
} from '../policy/nativeStoreSupport';
import { createDedupedClickHandler } from '../utils/requestDeduplication';
import type {
  CedrosProductDefinition,
  DistributionChannel,
} from '../types/storePolicy';

export interface ManageSubscriptionsButtonProps {
  product?: CedrosProductDefinition;
  distributionChannel: DistributionChannel;
  label?: string;
  disabled?: boolean;
  onOpen?: () => void;
  onError?: (error: string) => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  loadingColor?: string;
}

function getDefaultManageLabel() {
  return 'Manage Subscription';
}

export function ManageSubscriptionsButton({
  product,
  distributionChannel,
  label,
  disabled = false,
  onOpen,
  onError,
  style,
  textStyle,
  loadingColor = '#111827',
}: ManageSubscriptionsButtonProps) {
  const { config, storeBillingManager } = useCedrosContext();
  const theme = useCedrosTheme();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const method = resolveNativeStoreMethod(distributionChannel);
  const handler = method
    ? config.paymentPolicy?.nativeHandlers?.[method]
    : undefined;
  const buttonLabel = label || getDefaultManageLabel();

  const executeOpen = useMemo(
    () => async () => {
      if (!method) {
        const unsupportedError =
          'Subscription management is only available for Apple App Store and Google Play Store products.';
        setError(unsupportedError);
        onError?.(unsupportedError);
        return;
      }

      if (
        !handler?.openManageSubscriptions &&
        config.paymentPolicy?.storeBilling?.enabled === false
      ) {
        const missingHandlerError =
          method === 'apple_iap'
            ? 'Apple subscription management is disabled for this build and no override management handler is configured.'
            : 'Google Play subscription management is disabled for this build and no override management handler is configured.';
        setError(missingHandlerError);
        onError?.(missingHandlerError);
        return;
      }

      if (product && !isManageableStoreSubscription(product)) {
        const invalidProductError =
          'Subscription management is only available for store-managed subscription products.';
        setError(invalidProductError);
        onError?.(invalidProductError);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        if (handler?.openManageSubscriptions) {
          await handler.openManageSubscriptions({
            product,
            distributionChannel,
          });
        } else {
          await storeBillingManager.openManageSubscriptions({
            product,
            distributionChannel,
          });
        }

        onOpen?.();
      } catch (openError) {
        const message =
          openError instanceof Error
            ? openError.message
            : 'Unable to open subscription management';
        setError(message);
        onError?.(message);
      } finally {
        setIsLoading(false);
      }
    },
    [
      config.paymentPolicy?.storeBilling?.enabled,
      distributionChannel,
      handler,
      method,
      onError,
      onOpen,
      product,
      storeBillingManager,
    ]
  );

  const dedupeKey = useMemo(
    () => `manage-${distributionChannel}-${product?.id ?? 'default'}`,
    [distributionChannel, product?.id]
  );
  const handlePress = useMemo(
    () => createDedupedClickHandler(dedupeKey, executeOpen),
    [dedupeKey, executeOpen]
  );

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled || isLoading}
        style={[
          styles.button,
          {
            backgroundColor: theme.tokens?.modalBackground || '#ffffff',
            borderColor: theme.tokens?.surfaceBorder || '#d1d5db',
          },
          (disabled || isLoading) && styles.disabled,
        ]}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <ActivityIndicator color={loadingColor} size="small" />
        ) : (
          <Text
            style={[
              styles.buttonText,
              { color: theme.tokens?.surfaceText || '#111827' },
              textStyle,
            ]}
          >
            {buttonLabel}
          </Text>
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
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 15,
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
});
