import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletReadyState } from '@solana/wallet-adapter-base';
import { WalletIcon } from '@solana/wallet-adapter-react-ui';
import { useCedrosTheme, useCedrosContext } from '../context';
import { useX402Payment } from '../hooks/useX402Payment';
import { usePaymentMode } from '../hooks/usePaymentMode';
import { getLogger } from '../utils/logger';
import { getModalCloseButtonStyles } from '../utils';
import { getCartItemCount } from '../utils/cartHelpers';
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
import type { CartItem } from '../types';

/**
 * Props for CryptoButton component
 */
interface CryptoButtonProps {
  resource?: string; // Single resource ID (for single-item payments)
  items?: CartItem[]; // Multiple items (for cart payments) - mutually exclusive with resource
  label?: string;
  disabled?: boolean;
  onAttempt?: (method: 'stripe' | 'crypto') => void; // Track payment attempt for analytics
  onSuccess?: (transactionId: string) => void;
  onError?: (error: string) => void;
  className?: string;
  testPageUrl?: string; // URL to open in new tab for testing (e.g., Storybook test page)
  hideMessages?: boolean; // Hide inline success/error messages
  metadata?: Record<string, string>; // Additional metadata to pass to backend
  couponCode?: string; // Coupon code for discounts
}

/**
 * Button component for Solana crypto payments via x402
 *
 * Handles wallet connection and transaction signing
 */
export function CryptoButton({
  resource,
  items,
  label,
  disabled = false,
  onAttempt,
  onSuccess,
  onError,
  className = '',
  testPageUrl,
  hideMessages = false,
  metadata,
  couponCode,
}: CryptoButtonProps) {
  const { connected, connecting, connect, disconnect, select, wallets: availableWallets, wallet, publicKey } = useWallet();
  const { status, error, transactionId, processPayment, processCartPayment } = useX402Payment();
  const theme = useCedrosTheme();
  const { solanaError: contextSolanaError } = useCedrosContext();
  const { isCartMode, effectiveResource } = usePaymentMode(resource, items);
  const { t, translations } = useTranslation();

  // Use translated default label if not provided
  const buttonLabel = label || t('ui.pay_with_crypto');

  // Extract error codes
  const errorCode = error && typeof error !== 'string' ? (error as { code?: string })?.code ?? null : null;
  const solanaErrorCode = contextSolanaError && typeof contextSolanaError !== 'string'
    ? (contextSolanaError as { code?: string })?.code ?? null
    : null;

  // Localize error messages using translations object directly (avoid redundant useTranslation calls)
  const getErrorMessage = (code: string | null): string => {
    if (!code || !translations) return '';
    const errorData = translations.errors[code];
    if (!errorData) return '';
    return errorData.action ? `${errorData.message} ${errorData.action}` : errorData.message;
  };

  const localizedError = error
    ? (typeof error === 'string' ? error : getErrorMessage(errorCode))
    : null;
  const localizedSolanaError = contextSolanaError
    ? (typeof contextSolanaError === 'string' ? contextSolanaError : getErrorMessage(solanaErrorCode))
    : null;

  // Store callback/payment functions in refs to avoid useEffect dependency issues
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const processPaymentRef = useRef(processPayment);
  const processCartPaymentRef = useRef(processCartPayment);
  onSuccessRef.current = onSuccess;
  onErrorRef.current = onError;
  processPaymentRef.current = processPayment;
  processCartPaymentRef.current = processCartPayment;

  // PERFORMANCE OPTIMIZATION: Memoize the wallet state key itself to avoid redundant string operations
  // Only recalculate when the actual wallet list composition changes, not on every reference change
  const walletStateKey = useMemo(
    () => availableWallets.map(w => `${w.adapter.name}-${w.readyState}`).join(','),
    [availableWallets]
  );

  const installedWallets = useMemo(
    () => availableWallets.filter(
      ({ readyState }) => readyState === WalletReadyState.Installed || readyState === WalletReadyState.Loadable
    ),
    // walletStateKey is derived from availableWallets, so we only need availableWallets as dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [walletStateKey]
  );

  useEffect(() => {
    if (status === 'success' && transactionId) {
      const itemCount = isCartMode && items ? getCartItemCount(items) : undefined;
      emitPaymentSuccess('crypto', transactionId, effectiveResource, itemCount);
      onSuccessRef.current?.(transactionId);
    }
  }, [status, transactionId, isCartMode, items, effectiveResource]);

  useEffect(() => {
    if (status === 'error' && error) {
      const itemCount = isCartMode && items ? getCartItemCount(items) : undefined;
      emitPaymentError('crypto', error, effectiveResource, itemCount);
      onErrorRef.current?.(error);
    }
  }, [status, error, isCartMode, items, effectiveResource]);

  const isEmbedded = typeof window !== 'undefined' && window.top !== window.self;
  const [showWalletSelector, setShowWalletSelector] = useState(false);
  const [triggerConnect, setTriggerConnect] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<{
    type: 'single' | 'cart';
    resource?: string;
    items?: CartItem[];
    metadata?: Record<string, string>;
    couponCode?: string;
  } | null>(null);

  // PERFORMANCE OPTIMIZATION: Use cached Solana check from context instead of checking on every mount
  // This eliminates redundant dependency checks across all CryptoButton instances
  const solanaError = contextSolanaError;

  // Auto-connect when wallet is selected (triggered by handleSelectWallet)
  useEffect(() => {
    let cancelled = false;

    const attemptConnect = async () => {
      if (triggerConnect && wallet && !connected && !connecting) {
        getLogger().debug('[CryptoButton] Wallet detected, attempting auto-connect:', wallet.adapter.name);
        // Reset trigger BEFORE async call to prevent duplicate attempts
        setTriggerConnect(false);

        // Emit wallet connect event
        emitWalletConnect(wallet.adapter.name);

        try {
          await connect();
          // Only update state if component is still mounted
          if (!cancelled) {
            getLogger().debug('[CryptoButton] Auto-connect successful');
          }
        } catch (err) {
          // Only update state if component is still mounted
          if (!cancelled) {
            getLogger().error('[CryptoButton] Auto-connect failed:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to connect wallet';
            emitWalletError(errorMessage, wallet.adapter.name);
            setPendingPayment(null);
          }
        }
      }
    };

    // BUGFIX: Only start connection if component is still mounted
    if (!cancelled) {
      attemptConnect();
    }

    return () => {
      cancelled = true;
      // Note: Wallet adapter doesn't support connection abortion,
      // but we prevent state updates on unmounted components
    };
  }, [wallet, triggerConnect, connected, connecting, connect]);

  // Auto-trigger payment when wallet connects after user initiated it
  useEffect(() => {
    let mounted = true;

    getLogger().debug('[CryptoButton] Payment useEffect triggered', {
      connected,
      hasPendingPayment: !!pendingPayment,
      hasPublicKey: !!publicKey,
      pendingPaymentType: pendingPayment?.type,
    });

    if (connected && pendingPayment && publicKey && wallet && mounted) {
      // Emit wallet connected event
      emitWalletConnected(wallet.adapter.name, publicKey.toString());

      getLogger().debug('[CryptoButton] All conditions met! Processing pending payment:', pendingPayment);
      const payment = pendingPayment;
      setPendingPayment(null);
      setShowWalletSelector(false); // Close wallet selector now that we're processing

      const itemCount = payment.type === 'cart' && payment.items
        ? getCartItemCount(payment.items)
        : undefined;

      // Emit payment processing event
      emitPaymentProcessing('crypto', payment.resource, itemCount);

      if (payment.type === 'cart' && payment.items) {
        getLogger().debug('[CryptoButton] Auto-processing cart payment');
        processCartPaymentRef.current(payment.items, payment.metadata, payment.couponCode);
      } else if (payment.type === 'single' && payment.resource) {
        getLogger().debug('[CryptoButton] Auto-processing single payment');
        processPaymentRef.current(payment.resource, payment.couponCode, payment.metadata);
      }
    }

    return () => { mounted = false; };
  }, [connected, pendingPayment, publicKey, wallet]);

  // Core payment logic (without deduplication)
  const executePaymentFlow = useCallback(async () => {
    getLogger().debug('[CryptoButton] executePaymentFlow called', {
      connected,
      wallet: wallet?.adapter.name,
      couponCode,
      isCartMode,
      hasItems: !!items,
      effectiveResource,
    });

    const itemCount = isCartMode && items ? getCartItemCount(items) : undefined;

    // Emit payment start event
    emitPaymentStart('crypto', effectiveResource, itemCount);

    // Track payment attempt for analytics
    if (onAttempt) {
      onAttempt('crypto');
    }

    // Check for Solana dependencies before proceeding
    if (solanaError) {
      getLogger().error('[CryptoButton] Solana dependencies missing:', solanaError);
      emitPaymentError('crypto', solanaError, effectiveResource, itemCount);
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
          getLogger().error('[CryptoButton] Blocked attempt to open external URL:', urlToOpen);
          throw new Error('Cannot open external URLs from embedded context');
        }
        window.open(urlToOpen, '_blank', 'noopener,noreferrer');
      } catch (err) {
        getLogger().error('[CryptoButton] URL validation failed:', err);
        throw err;
      }
      return;
    }

    if (!connected) {
      // Set pending payment - useEffect will auto-trigger once connected
      let hasPendingPayment = false;
      if (isCartMode && items) {
        getLogger().debug('[CryptoButton] Setting pending cart payment with coupon:', couponCode);
        setPendingPayment({ type: 'cart', items, metadata, couponCode });
        hasPendingPayment = true;
      } else if (effectiveResource) {
        getLogger().debug('[CryptoButton] Setting pending single payment with coupon:', couponCode);
        setPendingPayment({ type: 'single', resource: effectiveResource, metadata, couponCode });
        hasPendingPayment = true;
      }

      // Only attempt wallet connection if we have a valid payment to process
      if (!hasPendingPayment) {
        getLogger().error('[CryptoButton] No valid payment to process');
        return;
      }

      try {
        // If wallet is already selected (from localStorage or previous session), auto-connect
        if (wallet) {
          getLogger().debug('[CryptoButton] Wallet already selected, connecting:', wallet.adapter.name);
          emitWalletConnect(wallet.adapter.name);
          await connect();
        } else {
          // No wallet selected - show wallet selector modal
          getLogger().debug('[CryptoButton] No wallet selected, showing selector. Available wallets:',
            installedWallets.map(w => w.adapter.name));

          if (installedWallets.length === 0) {
            setPendingPayment(null);
            const error = 'No wallets available';
            emitWalletError(error);
            throw new Error(error);
          }

          // Show wallet selector for user to choose
          setShowWalletSelector(true);
        }
      } catch (err) {
        setPendingPayment(null);
        const message = err instanceof Error ? err.message : 'Failed to connect wallet';
        getLogger().error('[CryptoButton] Connection error:', message);
        emitWalletError(message, wallet?.adapter.name);
        // Don't show error for user cancellation
      }
    } else {
      // Already connected, process payment immediately
      emitPaymentProcessing('crypto', effectiveResource, itemCount);
      if (isCartMode && items) {
        getLogger().debug('[CryptoButton] Processing cart payment with coupon:', couponCode);
        await processCartPayment(items, metadata, couponCode);
      } else if (effectiveResource) {
        getLogger().debug('[CryptoButton] Processing single payment with coupon:', couponCode);
        await processPayment(effectiveResource, couponCode, metadata);
      }
    }
  }, [connected, wallet, couponCode, isCartMode, items, effectiveResource, isEmbedded, testPageUrl, installedWallets, connect, metadata, processCartPayment, processPayment, solanaError, onAttempt, onError]);

  // Create unique button ID for deduplication
  const buttonId = useMemo(() => {
    if (isCartMode && items) {
      return `crypto-cart-${items.map(i => i.resource).join('-')}`;
    }
    return `crypto-${effectiveResource || 'unknown'}`;
  }, [isCartMode, items, effectiveResource]);

  // Wrap with cooldown only (NO deduplication window for crypto)
  // CRITICAL: Crypto payments require fresh quotes and signatures each time
  // Deduplication would reuse old signed transactions, causing "payment already used" errors
  // Cooldown (200ms) still prevents accidental double-clicks
  const handleClick = useMemo(
    () => createDedupedClickHandler(buttonId, executePaymentFlow, {
      cooldownMs: 200,
      deduplicationWindowMs: 0, // MUST be 0 for crypto - each payment needs fresh transaction
    }),
    [buttonId, executePaymentFlow]
  );

  const isProcessing = status === 'loading';
  const isDisabled = disabled || isProcessing || connecting || !!solanaError;
  const displayLabel = isProcessing ? t('ui.processing') : buttonLabel;

  const handleChangeWallet = useCallback(async () => {
    try {
      // Reset trigger flag first
      setTriggerConnect(false);

      // Disconnect current wallet first
      if (connected) {
        await disconnect();
      }

      // Clear wallet selection to ensure fresh selection
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      select(null as any);

      // DON'T clear pendingPayment - keep it so the new wallet can process the payment

      // Show wallet selector
      setShowWalletSelector(true);
    } catch (err) {
      getLogger().error('Failed to change wallet:', err);
    }
  }, [connected, disconnect, select]);

  const handleSelectWallet = useCallback((walletName: string) => {
    getLogger().debug('[CryptoButton] Wallet clicked:', walletName);

    // Close the modal immediately (like Vue library)
    setShowWalletSelector(false);

    // Select the wallet (synchronous - returns void)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    select(walletName as any);

    // Set trigger flag - useEffect will detect wallet change and call connect()
    setTriggerConnect(true);
    getLogger().debug('[CryptoButton] Wallet selected, useEffect will auto-connect');
  }, [select]);

  const handleDisconnect = useCallback(async () => {
    try {
      await disconnect();
      setPendingPayment(null);

      // Clear wallet preference from localStorage so user gets wallet selector on next visit
      // The wallet adapter stores the last wallet name under 'walletName' key
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
    <div className={theme.unstyled ? className : `${theme.className} cedros-theme__crypto-button ${className || ''}`} style={theme.unstyled ? {} : theme.style}>
      <button
        onClick={handleClick}
        disabled={isDisabled}
        className={theme.unstyled ? className : 'cedros-theme__button cedros-theme__crypto'}
        type="button"
      >
        {displayLabel}
      </button>
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
          onClick={() => { setShowWalletSelector(false); setPendingPayment(null); }}
        >
          <div
            className="cedros-modal-content"
            style={{
              backgroundColor: theme.tokens.modalBackground,
              borderRadius: '12px',
              padding: '2rem',
              maxWidth: '400px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
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
                onClick={() => { setShowWalletSelector(false); setPendingPayment(null); }}
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
      {connected && !hideMessages && !showWalletSelector && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '0.5rem',
          fontSize: '0.75rem',
          color: theme.tokens.surfaceText,
          opacity: 0.7,
        }}>
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
      {!hideMessages && localizedSolanaError && <div className={theme.unstyled ? '' : 'cedros-theme__error'}>{localizedSolanaError}</div>}
      {!hideMessages && localizedError && <div className={theme.unstyled ? '' : 'cedros-theme__error'}>{localizedError}</div>}
      {!hideMessages && transactionId && <div className={theme.unstyled ? '' : 'cedros-theme__success'}>{t('ui.payment_successful')}</div>}
    </div>
  );
}
