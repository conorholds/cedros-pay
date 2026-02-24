import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletReadyState } from '@solana/wallet-adapter-base';
import { WalletIcon } from '@solana/wallet-adapter-react-ui';
import { useCedrosTheme, useCedrosContext } from '../context';
import { useCryptoSubscription } from '../hooks/useCryptoSubscription';
import { getLogger } from '../utils/logger';
import { getModalCloseButtonStyles } from '../utils';
import { createDedupedClickHandler } from '../utils/requestDeduplication';
import {
  emitPaymentStart,
  emitPaymentProcessing,
  emitPaymentSuccess,
  emitPaymentError,
  emitWalletConnect,
  emitWalletConnected,
  emitWalletError,
} from '../utils/eventEmitter';
import { useTranslation } from '../i18n/useTranslation';
import type { BillingInterval } from '../types';

/**
 * Props for CryptoSubscribeButton component
 */
interface CryptoSubscribeButtonProps {
  /** Resource/plan ID for the subscription */
  resource: string;
  /** Billing interval */
  interval: BillingInterval;
  /** Custom interval in days (only used when interval is 'custom') */
  intervalDays?: number;
  /** Coupon code for discount */
  couponCode?: string;
  /** Custom button label */
  label?: string;
  /** Disable button */
  disabled?: boolean;
  /** Track subscription attempt for analytics */
  onAttempt?: (method: 'stripe' | 'crypto') => void;
  /** Callback on successful subscription */
  onSuccess?: (transactionId: string) => void;
  /** Callback on error */
  onError?: (error: string) => void;
  /** Additional CSS class */
  className?: string;
  /** URL to open in new tab for testing (e.g., Storybook test page) */
  testPageUrl?: string;
  /** Hide inline success/error messages */
  hideMessages?: boolean;
  /** Auto-check subscription status on mount when wallet is connected */
  autoCheckStatus?: boolean;
}

/**
 * Button component for x402 crypto subscription payments
 *
 * Shows subscription status when active, otherwise allows subscribing
 *
 * @example
 * ```tsx
 * <CryptoSubscribeButton
 *   resource="plan-pro"
 *   interval="monthly"
 *   autoCheckStatus
 *   onSuccess={(txId) => console.log('Subscribed!', txId)}
 * />
 * ```
 */
export function CryptoSubscribeButton({
  resource,
  interval,
  intervalDays,
  couponCode,
  label,
  disabled = false,
  onAttempt,
  onSuccess,
  onError,
  className = '',
  testPageUrl,
  hideMessages = false,
  autoCheckStatus = true,
}: CryptoSubscribeButtonProps) {
  const {
    connected,
    connecting,
    connect,
    disconnect,
    select,
    wallets: availableWallets,
    wallet,
    publicKey,
  } = useWallet();
  const {
    status,
    error,
    subscriptionStatus,
    expiresAt,
    checkStatus,
    processPayment,
  } = useCryptoSubscription();
  const theme = useCedrosTheme();
  const { solanaError: contextSolanaError } = useCedrosContext();
  const { t, translations } = useTranslation();

  // Use translated default label if not provided
  const buttonLabel = label || t('ui.subscribe_with_crypto');

  // Store callback/payment functions in refs to avoid useEffect dependency issues
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const processPaymentRef = useRef(processPayment);
  const checkStatusRef = useRef(checkStatus);
  onSuccessRef.current = onSuccess;
  onErrorRef.current = onError;
  processPaymentRef.current = processPayment;
  checkStatusRef.current = checkStatus;

  // Error message localization
  const errorCode =
    error && typeof error !== 'string' ? ((error as { code?: string })?.code ?? null) : null;
  const solanaErrorCode =
    contextSolanaError && typeof contextSolanaError !== 'string'
      ? ((contextSolanaError as { code?: string })?.code ?? null)
      : null;

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
  const localizedSolanaError = contextSolanaError
    ? typeof contextSolanaError === 'string'
      ? contextSolanaError
      : getErrorMessage(solanaErrorCode)
    : null;

  // Memoize wallet state key
  const walletStateKey = useMemo(
    () => availableWallets.map((w) => `${w.adapter.name}-${w.readyState}`).join(','),
    [availableWallets]
  );

  const installedWallets = useMemo(
    () =>
      availableWallets.filter(
        ({ readyState }) =>
          readyState === WalletReadyState.Installed || readyState === WalletReadyState.Loadable
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [walletStateKey]
  );

  // Auto-check subscription status when wallet connects
  useEffect(() => {
    if (autoCheckStatus && connected && publicKey) {
      getLogger().debug('[CryptoSubscribeButton] Auto-checking subscription status');
      checkStatusRef.current(resource);
    }
  }, [autoCheckStatus, connected, publicKey, resource]);

  // Success/error callbacks
  useEffect(() => {
    if (status === 'success' && subscriptionStatus === 'active') {
      emitPaymentSuccess('crypto', 'subscription-active', resource);
      onSuccessRef.current?.('subscription-active');
    }
  }, [status, subscriptionStatus, resource]);

  useEffect(() => {
    if (status === 'error' && error) {
      emitPaymentError('crypto', error, resource);
      onErrorRef.current?.(error);
    }
  }, [status, error, resource]);

  const isEmbedded = typeof window !== 'undefined' && window.top !== window.self;
  const [showWalletSelector, setShowWalletSelector] = useState(false);
  const [triggerConnect, setTriggerConnect] = useState(false);
  const [pendingPayment, setPendingPayment] = useState(false);

  const solanaError = contextSolanaError;

  // Auto-connect when wallet is selected
  useEffect(() => {
    let cancelled = false;

    const attemptConnect = async () => {
      if (triggerConnect && wallet && !connected && !connecting) {
        getLogger().debug(
          '[CryptoSubscribeButton] Wallet detected, attempting auto-connect:',
          wallet.adapter.name
        );
        setTriggerConnect(false);
        emitWalletConnect(wallet.adapter.name);

        try {
          await connect();
          if (!cancelled) {
            getLogger().debug('[CryptoSubscribeButton] Auto-connect successful');
          }
        } catch (err) {
          if (!cancelled) {
            getLogger().error('[CryptoSubscribeButton] Auto-connect failed:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to connect wallet';
            emitWalletError(errorMessage, wallet.adapter.name);
            setPendingPayment(false);
          }
        }
      }
    };

    if (!cancelled) {
      attemptConnect();
    }

    return () => {
      cancelled = true;
    };
  }, [wallet, triggerConnect, connected, connecting, connect]);

  // Auto-trigger payment when wallet connects
  useEffect(() => {
    if (connected && pendingPayment && publicKey && wallet) {
      emitWalletConnected(wallet.adapter.name, publicKey.toString());
      getLogger().debug('[CryptoSubscribeButton] Processing pending subscription payment');
      setPendingPayment(false);
      setShowWalletSelector(false);

      emitPaymentProcessing('crypto', resource);
      processPaymentRef.current(resource, interval, { couponCode, intervalDays });
    }
  }, [connected, pendingPayment, publicKey, wallet, resource, interval, couponCode, intervalDays]);

  // Core subscription logic
  const executeSubscriptionFlow = useCallback(async () => {
    getLogger().debug('[CryptoSubscribeButton] executeSubscriptionFlow called', {
      connected,
      wallet: wallet?.adapter.name,
      resource,
      interval,
    });

    emitPaymentStart('crypto', resource);

    if (onAttempt) {
      onAttempt('crypto');
    }

    if (solanaError) {
      getLogger().error('[CryptoSubscribeButton] Solana dependencies missing:', solanaError);
      emitPaymentError('crypto', solanaError, resource);
      if (onError) {
        onError(solanaError);
      }
      return;
    }

    if (isEmbedded) {
      const urlToOpen = testPageUrl || window.location.href;
      // SECURITY: Validate URL to prevent tabnabbing attacks
      // Only allow same-origin URLs or relative paths
      try {
        const url = new URL(urlToOpen, window.location.origin);
        if (url.origin !== window.location.origin) {
          getLogger().error('[CryptoSubscribeButton] Blocked attempt to open external URL:', urlToOpen);
          throw new Error('Cannot open external URLs from embedded context');
        }
        window.open(urlToOpen, '_blank', 'noopener,noreferrer');
      } catch (err) {
        getLogger().error('[CryptoSubscribeButton] URL validation failed:', err);
        throw err;
      }
      return;
    }

    if (!connected) {
      setPendingPayment(true);

      try {
        if (wallet) {
          getLogger().debug(
            '[CryptoSubscribeButton] Wallet already selected, connecting:',
            wallet.adapter.name
          );
          emitWalletConnect(wallet.adapter.name);
          await connect();
        } else {
          getLogger().debug('[CryptoSubscribeButton] No wallet selected, showing selector');

          if (installedWallets.length === 0) {
            setPendingPayment(false);
            const walletError = 'No wallets available';
            emitWalletError(walletError);
            throw new Error(walletError);
          }

          setShowWalletSelector(true);
        }
      } catch (err) {
        setPendingPayment(false);
        const message = err instanceof Error ? err.message : 'Failed to connect wallet';
        getLogger().error('[CryptoSubscribeButton] Connection error:', message);
        emitWalletError(message, wallet?.adapter.name);
      }
    } else {
      emitPaymentProcessing('crypto', resource);
      await processPayment(resource, interval, { couponCode, intervalDays });
    }
  }, [
    connected,
    wallet,
    resource,
    interval,
    couponCode,
    intervalDays,
    isEmbedded,
    testPageUrl,
    installedWallets,
    connect,
    processPayment,
    solanaError,
    onAttempt,
    onError,
  ]);

  // Deduplication
  const buttonId = useMemo(() => {
    return `crypto-subscribe-${resource}-${interval}`;
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
  const isDisabled = disabled || isProcessing || connecting || !!solanaError || isSubscribed;

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

  // Wallet selector handlers
  const handleChangeWallet = useCallback(async () => {
    try {
      setTriggerConnect(false);
      if (connected) {
        await disconnect();
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      select(null as any);
      setShowWalletSelector(true);
    } catch (err) {
      getLogger().error('Failed to change wallet:', err);
    }
  }, [connected, disconnect, select]);

  const handleSelectWallet = useCallback(
    (walletName: string) => {
      getLogger().debug('[CryptoSubscribeButton] Wallet clicked:', walletName);
      setShowWalletSelector(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      select(walletName as any);
      setTriggerConnect(true);
    },
    [select]
  );

  const handleDisconnect = useCallback(async () => {
    try {
      await disconnect();
      setPendingPayment(false);
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          window.localStorage.removeItem('walletName');
        } catch (storageErr) {
          // Gracefully handle quota exceeded or other localStorage errors
          if (storageErr instanceof Error && storageErr.name === 'QuotaExceededError') {
            getLogger().warn('localStorage quota exceeded when removing wallet preference');
          } else {
            getLogger().error('Failed to clear wallet preference from localStorage:', storageErr);
          }
        }
      }
    } catch (err) {
      getLogger().error('Failed to disconnect wallet:', err);
    }
  }, [disconnect]);

  return (
    <div
      className={
        theme.unstyled
          ? className
          : `${theme.className} cedros-theme__crypto-button ${className || ''}`
      }
      style={theme.unstyled ? {} : theme.style}
    >
      <button
        onClick={handleClick}
        disabled={isDisabled}
        className={theme.unstyled ? className : 'cedros-theme__button cedros-theme__crypto'}
        type="button"
      >
        {displayLabel}
      </button>

      {/* Wallet Selector Modal */}
      {showWalletSelector && !hideMessages && (
        <div
          className="cedros-modal-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: theme.tokens.modalOverlay,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
          onClick={() => setShowWalletSelector(false)}
        >
          <div
            className="cedros-modal-content"
            style={{
              backgroundColor: theme.tokens.modalBackground,
              borderRadius: '12px',
              padding: '2rem',
              maxWidth: '400px',
              width: '100%',
              boxShadow:
                '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              border: `1px solid ${theme.tokens.modalBorder}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  color: theme.tokens.surfaceText,
                }}
              >
                {t('wallet.select_wallet')}
              </h3>
              <button
                onClick={() => setShowWalletSelector(false)}
                style={getModalCloseButtonStyles(theme.tokens.surfaceText)}
                aria-label="Close modal"
                type="button"
              >
                ×
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {installedWallets.map((w) => (
                <button
                  key={w.adapter.name}
                  onClick={() => handleSelectWallet(w.adapter.name)}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    backgroundColor: theme.tokens.surfaceBackground,
                    border: `1px solid ${theme.tokens.surfaceBorder}`,
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    textAlign: 'left',
                    color: theme.tokens.surfaceText,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme.tokens.modalBackground;
                    e.currentTarget.style.borderColor = theme.tokens.surfaceText;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = theme.tokens.surfaceBackground;
                    e.currentTarget.style.borderColor = theme.tokens.surfaceBorder;
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                  type="button"
                >
                  <WalletIcon wallet={w} style={{ width: '24px', height: '24px' }} />
                  <span style={{ fontWeight: 500 }}>{w.adapter.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Wallet controls */}
      {connected && !hideMessages && !showWalletSelector && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '0.5rem',
            fontSize: '0.75rem',
            color: theme.tokens.surfaceText,
            opacity: 0.7,
          }}
        >
          <button
            onClick={handleChangeWallet}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              color: 'inherit',
              textDecoration: 'none',
              cursor: 'pointer',
              fontSize: 'inherit',
            }}
            type="button"
          >
            {t('wallet.change')}
          </button>
          <button
            onClick={handleDisconnect}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              color: 'inherit',
              textDecoration: 'none',
              cursor: 'pointer',
              fontSize: 'inherit',
            }}
            type="button"
          >
            {t('ui.disconnect')}
          </button>
        </div>
      )}

      {/* Status messages */}
      {!hideMessages && localizedSolanaError && (
        <div className={theme.unstyled ? '' : 'cedros-theme__error'}>{localizedSolanaError}</div>
      )}
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
