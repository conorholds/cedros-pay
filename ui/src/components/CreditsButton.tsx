import { useCallback, useMemo } from 'react';
import { useCedrosTheme } from '../context';
import { useCreditsPayment } from '../hooks/useCreditsPayment';
import { usePaymentMode } from '../hooks/usePaymentMode';
import { getLogger } from '../utils/logger';
import { emitPaymentStart, emitPaymentProcessing, emitPaymentSuccess, emitPaymentError } from '../utils/eventEmitter';
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
  /** Custom CSS class name */
  className?: string;
}

/**
 * Button component for Credits payments
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
  className = '',
}: CreditsButtonProps) {
  const { status, error, transactionId, processPayment, processCartPayment } = useCreditsPayment();
  const theme = useCedrosTheme();
  const { isCartMode, effectiveResource } = usePaymentMode(resource, items);
  const { t, translations } = useTranslation();

  // Use translated default label if not provided
  const buttonLabel = label || t('ui.pay_with_credits') || 'Pay with Credits';
  const wrapperClassName = theme.unstyled
    ? className
    : `${theme.className} cedros-theme__credits-button ${className}`.trim();

  // Extract error code
  const errorCode = error && typeof error !== 'string' ? (error as { code?: string })?.code ?? null : null;

  // Localize error message
  const getErrorMessage = (code: string | null): string => {
    if (!code || !translations) return '';
    const errorData = translations.errors[code];
    if (!errorData) return '';
    return errorData.action ? `${errorData.message} ${errorData.action}` : errorData.message;
  };

  const localizedError = error
    ? (typeof error === 'string' ? error : getErrorMessage(errorCode))
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
      const error = 'Authentication required: please log in to pay with credits';
      getLogger().error('[CreditsButton]', error);
      emitPaymentError('credits', error, effectiveResource, itemCount);
      if (onError) {
        onError(error);
      }
      return;
    }

    // Validate payment configuration
    if (!isCartMode && !effectiveResource) {
      const error = 'Invalid payment configuration: missing resource';
      getLogger().error('[CreditsButton]', error);
      emitPaymentError('credits', error, effectiveResource, itemCount);
      if (onError) {
        onError(error);
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
        className={theme.unstyled ? className : 'cedros-theme__button cedros-theme__credits'}
        type="button"
      >
        {isLoading ? t('ui.processing') : buttonLabel}
      </button>
      {localizedError && <div className={theme.unstyled ? '' : 'cedros-theme__error'}>{localizedError}</div>}
      {transactionId && <div className={theme.unstyled ? '' : 'cedros-theme__success'}>{t('ui.payment_successful')}</div>}
    </div>
  );
}
