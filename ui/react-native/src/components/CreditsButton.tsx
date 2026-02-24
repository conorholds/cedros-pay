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
import { useCreditsPayment } from '../hooks/useCreditsPayment';
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
 * Props for CreditsButton component
 */
interface CreditsButtonProps {
  /** Single resource ID (for single-item payments) */
  resource?: string;
  /** Multiple items (for cart checkout) - mutually exclusive with resource */
  items?: CartItem[];
  /**
   * @deprecated No longer required - server determines price during hold creation.
   * Kept for backwards compatibility but ignored.
   */
  creditsRequirement?: unknown;
  /** JWT token from cedros-login for user authentication */
  authToken?: string;
  /** Metadata for tracking (e.g., userId, session) */
  metadata?: Record<string, string>;
  /** Optional coupon code for discount */
  couponCode?: string;
  /** Button label */
  label?: string;
  /** Disable button */
  disabled?: boolean;
  /** Track payment attempt for analytics */
  onAttempt?: (method: 'credits') => void;
  /** Called on successful payment */
  onSuccess?: (transactionId: string) => void;
  /** Called on payment error */
  onError?: (error: string) => void;
  /** Custom container style */
  style?: ViewStyle;
  /** Custom text style */
  textStyle?: TextStyle;
  /** Loading indicator color */
  loadingColor?: string;
}

/**
 * Button component for Credits payments (React Native)
 *
 * Handles payment using cedros-login credits balance.
 * Requires user to be authenticated with cedros-login.
 */
export function CreditsButton({
  resource,
  items,
  authToken,
  metadata,
  couponCode,
  label,
  disabled = false,
  onAttempt,
  onSuccess,
  onError,
  style,
  textStyle,
  loadingColor = '#ffffff',
}: CreditsButtonProps) {
  const { status, error, transactionId, processPayment, processCartPayment } = useCreditsPayment();
  const theme = useCedrosTheme();
  const { isCartMode, effectiveResource } = usePaymentMode(resource, items);
  const { t, translations } = useTranslation();

  // Use translated default label if not provided
  const buttonLabel = label || t('ui.pay_with_credits') || 'Pay with Credits';

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

  // Core payment logic
  const executePayment = useCallback(async () => {
    getLogger().debug('[CreditsButton] executePayment');

    const itemCount = isCartMode && items ? getCartItemCount(items) : undefined;

    // Emit payment start event
    emitPaymentStart('credits', effectiveResource, itemCount);

    // Track payment attempt for analytics
    if (onAttempt) {
      onAttempt('credits');
    }

    // Validate authToken is present (required for credits payments)
    if (!authToken) {
      const errorMsg = 'Authentication required: please log in to pay with credits';
      getLogger().error('[CreditsButton]', errorMsg);
      emitPaymentError('credits', errorMsg, effectiveResource, itemCount);
      if (onError) {
        onError(errorMsg);
      }
      return;
    }

    // Validate payment configuration
    if (!isCartMode && !effectiveResource) {
      const errorMsg = 'Invalid payment configuration: missing resource';
      getLogger().error('[CreditsButton]', errorMsg);
      emitPaymentError('credits', errorMsg, effectiveResource, itemCount);
      if (onError) {
        onError(errorMsg);
      }
      return;
    }

    let result;

    // Emit processing event
    emitPaymentProcessing('credits', effectiveResource, itemCount);

    if (isCartMode && items) {
      // Cart checkout flow
      getLogger().debug('[CreditsButton] Processing cart checkout');
      result = await processCartPayment(items, authToken, couponCode, metadata);
    } else if (effectiveResource) {
      // Single-item flow (server determines price during hold creation)
      getLogger().debug('[CreditsButton] Processing single payment');
      result = await processPayment(effectiveResource, authToken, couponCode, metadata);
    }

    if (result && result.success && result.transactionId) {
      emitPaymentSuccess('credits', result.transactionId, effectiveResource, itemCount);
      if (onSuccess) {
        onSuccess(result.transactionId);
      }
    } else if (result && !result.success && result.error) {
      emitPaymentError('credits', result.error, effectiveResource, itemCount);
      if (onError) {
        onError(result.error);
      }
    }
  }, [
    authToken,
    isCartMode,
    effectiveResource,
    items,
    couponCode,
    metadata,
    processPayment,
    processCartPayment,
    onAttempt,
    onSuccess,
    onError,
  ]);

  // Create unique button ID for deduplication
  const buttonId = useMemo(() => {
    if (isCartMode && items) {
      return `credits-cart-${items.map((i) => i.resource).join('-')}`;
    }
    return `credits-${effectiveResource || 'unknown'}`;
  }, [isCartMode, items, effectiveResource]);

  // Wrap with deduplication + cooldown
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
          theme.unstyled
            ? null
            : { backgroundColor: theme.tokens?.cryptoBackground || '#14b8a6' },
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
        <Text
          style={[
            styles.errorText,
            { color: theme.tokens?.errorText || '#ef4444' },
          ]}
        >
          {localizedError}
        </Text>
      )}
      {transactionId && (
        <Text
          style={[
            styles.successText,
            { color: theme.tokens?.successText || '#22c55e' },
          ]}
        >
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
