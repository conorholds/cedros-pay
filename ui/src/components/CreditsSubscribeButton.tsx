import { useCallback, useMemo, useEffect, useRef } from 'react';
import { useCedrosTheme } from '../context';
import { useCreditsSubscription } from '../hooks/useCreditsSubscription';
import { getLogger } from '../utils/logger';
import {
  emitPaymentStart,
  emitPaymentProcessing,
  emitPaymentSuccess,
  emitPaymentError,
} from '../utils/eventEmitter';
import { createDedupedClickHandler } from '../utils/requestDeduplication';
import { useTranslation } from '../i18n/useTranslation';
import type { BillingInterval, PaymentMethod } from '../types';

/**
 * Props for CreditsSubscribeButton component
 */
interface CreditsSubscribeButtonProps {
  /** Resource/plan ID for the subscription */
  resource: string;
  /** Billing interval */
  interval: BillingInterval;
  /** Custom interval in days (only used when interval is 'custom') */
  intervalDays?: number;
  /** JWT token from cedros-login for authentication */
  authToken?: string;
  /** User ID from cedros-login for subscription status checks */
  userId?: string;
  /** Coupon code for discount */
  couponCode?: string;
  /** Custom button label */
  label?: string;
  /** Disable button */
  disabled?: boolean;
  /** Track subscription attempt for analytics */
  onAttempt?: (method: PaymentMethod) => void;
  /** Callback on successful subscription */
  onSuccess?: (transactionId: string) => void;
  /** Callback on error */
  onError?: (error: string) => void;
  /** Additional CSS class */
  className?: string;
  /** Hide inline success/error messages */
  hideMessages?: boolean;
  /** Auto-check subscription status on mount when userId is provided */
  autoCheckStatus?: boolean;
}

/**
 * Button component for credits subscription payments
 *
 * Handles subscription payments using cedros-login credits balance.
 * Requires user to be authenticated with cedros-login.
 *
 * @example
 * ```tsx
 * <CreditsSubscribeButton
 *   resource="plan-pro"
 *   interval="monthly"
 *   authToken={authToken}
 *   userId={userId}
 *   autoCheckStatus
 *   onSuccess={(txId) => console.log('Subscribed!', txId)}
 * />
 * ```
 */
export function CreditsSubscribeButton({
  resource,
  interval,
  intervalDays,
  authToken,
  userId,
  couponCode,
  label,
  disabled = false,
  onAttempt,
  onSuccess,
  onError,
  className = '',
  hideMessages = false,
  autoCheckStatus = false,
}: CreditsSubscribeButtonProps) {
  const {
    status,
    error,
    subscriptionStatus,
    expiresAt,
    checkStatus,
    processPayment,
  } = useCreditsSubscription();
  const theme = useCedrosTheme();
  const { t, translations } = useTranslation();

  // Store checkStatus in ref to avoid effect dependency issues
  const checkStatusRef = useRef(checkStatus);
  useEffect(() => {
    checkStatusRef.current = checkStatus;
  }, [checkStatus]);

  // Auto-check subscription status on mount when userId is provided
  useEffect(() => {
    if (autoCheckStatus && userId) {
      getLogger().debug('[CreditsSubscribeButton] Auto-checking subscription status', { resource, userId });
      checkStatusRef.current(resource, userId);
    }
  }, [autoCheckStatus, userId, resource]);

  // Use translated default label if not provided
  const buttonLabel = label || t('ui.subscribe_with_credits') || 'Subscribe with Credits';

  // Error message localization
  const errorCode =
    error && typeof error !== 'string' ? ((error as { code?: string })?.code ?? null) : null;

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
  const executeSubscriptionFlow = useCallback(async () => {
    getLogger().debug('[CreditsSubscribeButton] executeSubscriptionFlow', {
      resource,
      interval,
      intervalDays,
      hasAuthToken: !!authToken,
    });

    emitPaymentStart('credits', resource);

    if (onAttempt) {
      onAttempt('credits');
    }

    // Validate auth token
    if (!authToken) {
      const errorMsg = 'Authentication required: please log in to subscribe with credits';
      getLogger().error('[CreditsSubscribeButton]', errorMsg);
      emitPaymentError('credits', errorMsg, resource);
      if (onError) {
        onError(errorMsg);
      }
      return;
    }

    emitPaymentProcessing('credits', resource);

    const result = await processPayment(resource, interval, authToken, {
      couponCode,
      intervalDays,
    });

    if (result.success && result.transactionId) {
      emitPaymentSuccess('credits', result.transactionId, resource);
      if (onSuccess) {
        onSuccess(result.transactionId);
      }
    } else if (!result.success && result.error) {
      emitPaymentError('credits', result.error, resource);
      if (onError) {
        onError(result.error);
      }
    }
  }, [
    resource,
    interval,
    intervalDays,
    authToken,
    couponCode,
    processPayment,
    onAttempt,
    onSuccess,
    onError,
  ]);

  // Deduplication
  const buttonId = useMemo(() => {
    return `credits-subscribe-${resource}-${interval}`;
  }, [resource, interval]);

  const handleClick = useMemo(
    () =>
      createDedupedClickHandler(buttonId, executeSubscriptionFlow, {
        cooldownMs: 200,
        deduplicationWindowMs: 0,
      }),
    [buttonId, executeSubscriptionFlow]
  );

  const isProcessing = status === 'loading' || status === 'checking';
  const isSubscribed = subscriptionStatus === 'active' || subscriptionStatus === 'trialing';
  const isDisabled = disabled || isProcessing || isSubscribed;

  // Determine button label based on state
  let displayLabel = buttonLabel;
  if (isProcessing) {
    displayLabel = t('ui.processing');
  } else if (isSubscribed && expiresAt) {
    const expiryDate = new Date(expiresAt).toLocaleDateString();
    displayLabel = `${t('ui.subscribed_until')} ${expiryDate}`;
  } else if (isSubscribed) {
    displayLabel = t('ui.subscribed');
  }

  const wrapperClassName = theme.unstyled
    ? className
    : `${theme.className} cedros-theme__credits-button ${className}`.trim();

  return (
    <div className={wrapperClassName} style={theme.unstyled ? {} : theme.style}>
      <button
        onClick={handleClick}
        disabled={isDisabled}
        className={theme.unstyled ? className : 'cedros-theme__button cedros-theme__credits'}
        type="button"
      >
        {displayLabel}
      </button>

      {/* Status messages */}
      {!hideMessages && localizedError && (
        <div className={theme.unstyled ? '' : 'cedros-theme__error'}>{localizedError}</div>
      )}
      {!hideMessages && isSubscribed && (
        <div className={theme.unstyled ? '' : 'cedros-theme__success'}>
          {t('ui.subscription_active')}
        </div>
      )}
    </div>
  );
}
