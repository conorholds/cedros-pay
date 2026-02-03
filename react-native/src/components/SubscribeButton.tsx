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
import { useSubscription } from '../hooks/useSubscription';
import { getLogger } from '../utils/logger';
import {
  emitPaymentStart,
  emitPaymentProcessing,
  emitPaymentSuccess,
  emitPaymentError,
} from '../utils/eventEmitter';
import { createDedupedClickHandler } from '../utils/requestDeduplication';
import { useTranslation } from '../i18n/useTranslation';
import type { BillingInterval } from '../types';

/**
 * Props for SubscribeButton component
 */
interface SubscribeButtonProps {
  /** Resource/plan ID for the subscription */
  resource: string;
  /** Billing interval */
  interval: BillingInterval;
  /** Custom interval in days (only used when interval is 'custom') */
  intervalDays?: number;
  /** Number of trial days (0 for no trial) */
  trialDays?: number;
  /** URL to redirect on success */
  successUrl?: string;
  /** URL to redirect on cancel */
  cancelUrl?: string;
  /** Metadata for tracking */
  metadata?: Record<string, string>;
  /** Customer email (pre-fills Stripe checkout) */
  customerEmail?: string;
  /** Coupon code for discount */
  couponCode?: string;
  /** Custom button label */
  label?: string;
  /** Disable button */
  disabled?: boolean;
  /** Track subscription attempt for analytics */
  onAttempt?: (method: 'stripe' | 'crypto') => void;
  /** Callback on successful subscription redirect */
  onSuccess?: (sessionId: string) => void;
  /** Callback on error */
  onError?: (error: string) => void;
  /** Custom container style */
  style?: ViewStyle;
  /** Custom text style */
  textStyle?: TextStyle;
  /** Loading indicator color */
  loadingColor?: string;
}

/**
 * Button component for Stripe subscription checkout (React Native)
 *
 * Handles redirect to Stripe-hosted subscription checkout
 */
export function SubscribeButton({
  resource,
  interval,
  intervalDays,
  trialDays,
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
}: SubscribeButtonProps) {
  const { status, error, sessionId, processSubscription } = useSubscription();
  const theme = useCedrosTheme();
  const { t, translations } = useTranslation();

  // Use translated default label if not provided
  const buttonLabel = label || t('ui.subscribe');

  // Extract error code
  const errorCode =
    error && typeof error !== 'string' ? (error as { code?: string })?.code ?? null : null;

  // Localize error message
  const getErrorMessage = (code: string | null): string => {
    if (!code || !translations) return '';
    const errorData = translations.errors[code];
    if (!errorData) return '';
    return errorData.action ? `${errorData.message} ${errorData.action}` : errorData.message;
  };

  const localizedError = error
    ? typeof error === 'string'
      ? error
      : getErrorMessage(errorCode)
    : null;

  // Core subscription logic
  const executeSubscription = useCallback(async () => {
    getLogger().debug('[SubscribeButton] executeSubscription:', {
      resource,
      interval,
      intervalDays,
      trialDays,
      couponCode,
    });

    // Emit payment start event
    emitPaymentStart('stripe', resource);

    // Track subscription attempt for analytics
    if (onAttempt) {
      onAttempt('stripe');
    }

    // Emit processing event
    emitPaymentProcessing('stripe', resource);

    const result = await processSubscription({
      resource,
      interval,
      intervalDays,
      trialDays,
      customerEmail,
      metadata,
      couponCode,
      successUrl,
      cancelUrl,
    });

    if (result.success && result.transactionId) {
      emitPaymentSuccess('stripe', result.transactionId, resource);
      if (onSuccess) {
        onSuccess(result.transactionId);
      }
    } else if (!result.success && result.error) {
      emitPaymentError('stripe', result.error, resource);
      if (onError) {
        onError(result.error);
      }
    }
  }, [
    resource,
    interval,
    intervalDays,
    trialDays,
    customerEmail,
    metadata,
    couponCode,
    successUrl,
    cancelUrl,
    processSubscription,
    onAttempt,
    onSuccess,
    onError,
  ]);

  // Create unique button ID for deduplication
  const buttonId = useMemo(() => {
    return `subscribe-${resource}-${interval}`;
  }, [resource, interval]);

  // Wrap with deduplication + cooldown
  const handlePress = useMemo(
    () => createDedupedClickHandler(buttonId, executeSubscription),
    [buttonId, executeSubscription]
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
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={buttonLabel}
        accessibilityState={{ disabled: isDisabled, busy: isLoading }}
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
      {sessionId && (
        <Text style={[styles.successText, { color: theme.tokens?.successText || '#22c55e' }]}>
          {t('ui.redirecting_to_checkout')}
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
