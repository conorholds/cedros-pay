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
  isRestorableStoreProduct,
  resolveNativeStoreMethod,
} from '../policy/nativeStoreSupport';
import { createDedupedClickHandler } from '../utils/requestDeduplication';
import type {
  CedrosProductDefinition,
  DistributionChannel,
  NativeStoreCheckoutContext,
  NativeStorePurchaseResult,
} from '../types/storePolicy';

export interface RestorePurchasesButtonProps {
  product?: CedrosProductDefinition;
  products?: CedrosProductDefinition[];
  distributionChannel: DistributionChannel;
  checkout?: NativeStoreCheckoutContext;
  label?: string;
  disabled?: boolean;
  onSuccess?: (results: NativeStorePurchaseResult[]) => void;
  onError?: (error: string) => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  loadingColor?: string;
}

function getDefaultRestoreLabel() {
  return 'Restore Purchases';
}

export function RestorePurchasesButton({
  product,
  products,
  distributionChannel,
  checkout,
  label,
  disabled = false,
  onSuccess,
  onError,
  style,
  textStyle,
  loadingColor = '#111827',
}: RestorePurchasesButtonProps) {
  const { config, storeBillingManager } = useCedrosContext();
  const theme = useCedrosTheme();
  const [error, setError] = useState<string | null>(null);
  const [restoredCount, setRestoredCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const method = resolveNativeStoreMethod(distributionChannel);
  const handler = method
    ? config.paymentPolicy?.nativeHandlers?.[method]
    : undefined;
  const buttonLabel = label || getDefaultRestoreLabel();
  const restoreProducts = useMemo(() => {
    const combined = [
      ...(products ?? []),
      ...(product ? [product] : []),
    ];
    const seen = new Set<string>();
    return combined.filter((entry) => {
      if (!entry?.id || seen.has(entry.id) || !isRestorableStoreProduct(entry)) {
        return false;
      }

      seen.add(entry.id);
      return true;
    });
  }, [product, products]);

  const executeRestore = useMemo(
    () => async () => {
      if (!method) {
        const unsupportedError =
          'Purchase restore is only available for Apple App Store and Google Play Store products.';
        setError(unsupportedError);
        onError?.(unsupportedError);
        return;
      }

      if (restoreProducts.length === 0) {
        const missingProductError =
          'Cedros needs at least one restorable store product definition to restore purchases safely.';
        setError(missingProductError);
        onError?.(missingProductError);
        return;
      }

      if (
        !handler?.restorePurchases &&
        config.paymentPolicy?.storeBilling?.enabled === false
      ) {
        const missingHandlerError =
          method === 'apple_iap'
            ? 'Apple restore is disabled for this build and no override restore handler is configured.'
            : 'Google Play restore is disabled for this build and no override restore handler is configured.';
        setError(missingHandlerError);
        onError?.(missingHandlerError);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const restored = handler?.restorePurchases
          ? await handler.restorePurchases({
              products: restoreProducts,
              distributionChannel,
              checkout,
            })
          : await storeBillingManager.restorePurchases({
              products: restoreProducts,
              distributionChannel,
              checkout,
            });

        setRestoredCount(restored.length);
        onSuccess?.(restored);
      } catch (restoreError) {
        const message =
          restoreError instanceof Error
            ? restoreError.message
            : 'Purchase restore failed';
        setError(message);
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
      onError,
      onSuccess,
      restoreProducts,
      storeBillingManager,
    ]
  );

  const dedupeKey = useMemo(
    () =>
      `restore-${distributionChannel}-${restoreProducts.map((entry) => entry.id).join('-')}`,
    [distributionChannel, restoreProducts]
  );
  const handlePress = useMemo(
    () => createDedupedClickHandler(dedupeKey, executeRestore),
    [dedupeKey, executeRestore]
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
      {restoredCount !== null ? (
        <Text
          style={[
            styles.successText,
            { color: theme.tokens?.successText || '#22c55e' },
          ]}
        >
          {restoredCount > 0
            ? `Restored ${restoredCount} purchase${restoredCount === 1 ? '' : 's'}`
            : 'No purchases available to restore'}
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
  successText: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
  },
});
