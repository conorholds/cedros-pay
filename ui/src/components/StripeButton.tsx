import { useCallback, useMemo } from 'react';
import { useCedrosTheme } from '../context';
import { useStripeCheckout } from '../hooks/useStripeCheckout';
import { usePaymentMode } from '../hooks/usePaymentMode';
import { getLogger } from '../utils/logger';
import { emitPaymentStart, emitPaymentProcessing, emitPaymentSuccess, emitPaymentError } from '../utils/eventEmitter';
import { getCartItemCount } from '../utils/cartHelpers';
import { createDedupedClickHandler } from '../utils/requestDeduplication';
import { useTranslation } from '../i18n/useTranslation';
import type { CartItem } from '../types';

/**
 * Props for StripeButton component
 */
interface StripeButtonProps {
  resource?: string;       // Single resource ID (for single-item payments)
  items?: CartItem[];      // Multiple items (for cart checkout) - mutually exclusive with resource
  successUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, string>; // Metadata for tracking (e.g., userId, session)
  customerEmail?: string; // Customer email
  couponCode?: string;    // Optional coupon code for discount
  label?: string;
  disabled?: boolean;
  onAttempt?: (method: 'stripe' | 'crypto') => void; // Track payment attempt for analytics
  onSuccess?: (transactionId: string) => void;
  onError?: (error: string) => void;
  className?: string;
}

/**
 * Button component for Stripe card payments
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
  className = '',
}: StripeButtonProps) {
  const { status, error, transactionId, processPayment, processCartCheckout } = useStripeCheckout();
  const theme = useCedrosTheme();
  const { isCartMode, effectiveResource } = usePaymentMode(resource, items);
  const { t, translations } = useTranslation();

  // Use translated default label if not provided
  const buttonLabel = label || t('ui.pay_with_card');
  const wrapperClassName = theme.unstyled
    ? className
    : `${theme.className} cedros-theme__stripe-button ${className}`.trim();

  // Extract error code
  const errorCode = error && typeof error !== 'string' ? (error as { code?: string })?.code ?? null : null;

  // Localize error message using translations object directly (avoid redundant useTranslation call)
  const getErrorMessage = (code: string | null): string => {
    if (!code || !translations) return '';
    const errorData = translations.errors[code];
    if (!errorData) return '';
    return errorData.action ? `${errorData.message} ${errorData.action}` : errorData.message;
  };

  const localizedError = error
    ? (typeof error === 'string' ? error : getErrorMessage(errorCode))
    : null;

  // Core payment logic (without deduplication)
  const executePayment = useCallback(async () => {
    getLogger().debug('[StripeButton] executePayment with couponCode:', couponCode);

    const itemCount = isCartMode && items ? getCartItemCount(items) : undefined;

    // Emit payment start event
    emitPaymentStart('stripe', effectiveResource, itemCount);

    // Track payment attempt for analytics
    if (onAttempt) {
      onAttempt('stripe');
    }

    // Validate payment configuration
    if (!isCartMode && !effectiveResource) {
      const error = 'Invalid payment configuration: missing resource or items';
      getLogger().error('[StripeButton]', error);
      emitPaymentError('stripe', error, effectiveResource, itemCount);
      if (onError) {
        onError(error);
      }
      return;
    }

    let result;

    // Emit processing event
    emitPaymentProcessing('stripe', effectiveResource, itemCount);

    if (isCartMode && items) {
      // Cart checkout flow
      getLogger().debug('[StripeButton] Processing cart checkout with coupon:', couponCode);
      result = await processCartCheckout(
        items,
        successUrl,
        cancelUrl,
        metadata,
        customerEmail,
        couponCode
      );
    } else if (effectiveResource) {
      // Single-item flow
      getLogger().debug('[StripeButton] Processing single payment with coupon:', couponCode);
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
      emitPaymentSuccess('stripe', result.transactionId, effectiveResource, itemCount);
      if (onSuccess) {
        onSuccess(result.transactionId);
      }
    } else if (result && !result.success && result.error) {
      emitPaymentError('stripe', result.error, effectiveResource, itemCount);
      if (onError) {
        onError(result.error);
      }
    }
  }, [couponCode, isCartMode, effectiveResource, items, successUrl, cancelUrl, metadata, customerEmail, processCartCheckout, processPayment, onAttempt, onSuccess, onError]);

  // Create unique button ID for deduplication
  const buttonId = useMemo(() => {
    if (isCartMode && items) {
      return `stripe-cart-${items.map(i => i.resource).join('-')}`;
    }
    return `stripe-${effectiveResource || 'unknown'}`;
  }, [isCartMode, items, effectiveResource]);

  // Wrap with deduplication + cooldown (0.2s)
  const handleClick = useMemo(
    () => createDedupedClickHandler(buttonId, executePayment),
    [buttonId, executePayment]
  );

  const isLoading = status === 'loading';
  const isDisabled = disabled || isLoading;

  return (
    <div className={wrapperClassName} style={theme.unstyled ? {} : theme.style}>
      <button
        onClick={handleClick}
        disabled={isDisabled}
        className={theme.unstyled ? className : 'cedros-theme__button cedros-theme__stripe'}
        type="button"
      >
        {isLoading ? t('ui.processing') : buttonLabel}
      </button>
      {localizedError && <div className={theme.unstyled ? '' : 'cedros-theme__error'}>{localizedError}</div>}
      {transactionId && <div className={theme.unstyled ? '' : 'cedros-theme__success'}>{t('ui.payment_successful')}</div>}
    </div>
  );
}
