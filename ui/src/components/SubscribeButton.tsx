import { useCallback, useMemo } from 'react';
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
  /** Additional CSS class */
  className?: string;
}

/**
 * Button component for Stripe subscription checkout
 *
 * Handles redirect to Stripe-hosted subscription checkout
 *
 * @example
 * ```tsx
 * <SubscribeButton
 *   resource="plan-pro"
 *   interval="monthly"
 *   trialDays={14}
 *   onSuccess={(sessionId) => console.log('Redirecting...', sessionId)}
 *   onError={(error) => console.error(error)}
 * />
 * ```
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
  className = '',
}: SubscribeButtonProps) {
  const { status, error, sessionId, processSubscription } = useSubscription();
  const theme = useCedrosTheme();
  const { t, translations } = useTranslation();

  // Use translated default label if not provided
  const buttonLabel = label || t('ui.subscribe');
  const wrapperClassName = theme.unstyled
    ? className
    : `${theme.className} cedros-theme__stripe-button ${className}`.trim();

  // Extract error code
  const errorCode =
    error && typeof error !== 'string' ? ((error as { code?: string })?.code ?? null) : null;

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
  const handleClick = useMemo(
    () => createDedupedClickHandler(buttonId, executeSubscription),
    [buttonId, executeSubscription]
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
      {localizedError && (
        <div className={theme.unstyled ? '' : 'cedros-theme__error'}>{localizedError}</div>
      )}
      {sessionId && (
        <div className={theme.unstyled ? '' : 'cedros-theme__success'}>
          {t('ui.redirecting_to_checkout')}
        </div>
      )}
    </div>
  );
}
