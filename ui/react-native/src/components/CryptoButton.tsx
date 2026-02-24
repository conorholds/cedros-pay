import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  ScrollView,
  ViewStyle,
  TextStyle,
  Image,
} from 'react-native';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletReadyState } from '@solana/wallet-adapter-base';
import { useCedrosTheme, useCedrosContext } from '../context';
import { useX402Payment } from '../hooks/useX402Payment';
import { usePaymentMode } from '../hooks/usePaymentMode';
import { getLogger } from '../utils/logger';
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
  /** Single resource ID (for single-item payments) */
  resource?: string;
  /** Multiple items (for cart payments) - mutually exclusive with resource */
  items?: CartItem[];
  /** Custom button label */
  label?: string;
  /** Disable button */
  disabled?: boolean;
  /** Track payment attempt for analytics */
  onAttempt?: (method: 'stripe' | 'crypto') => void;
  /** Callback on successful payment */
  onSuccess?: (transactionId: string) => void;
  /** Callback on error */
  onError?: (error: string) => void;
  /** Custom container style */
  style?: ViewStyle;
  /** Custom text style */
  textStyle?: TextStyle;
  /** Loading indicator color */
  loadingColor?: string;
  /** Hide inline success/error messages */
  hideMessages?: boolean;
  /** Additional metadata to pass to backend */
  metadata?: Record<string, string>;
  /** Coupon code for discounts */
  couponCode?: string;
}

/**
 * Button component for Solana crypto payments via x402 (React Native)
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
  style,
  textStyle,
  loadingColor = '#ffffff',
  hideMessages = false,
  metadata,
  couponCode,
}: CryptoButtonProps) {
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
  const { status, error, transactionId, processPayment, processCartPayment } = useX402Payment();
  const theme = useCedrosTheme();
  const { solanaError: contextSolanaError } = useCedrosContext();
  const { isCartMode, effectiveResource } = usePaymentMode(resource, items);
  const { t, translations } = useTranslation();

  // Use translated default label if not provided
  const buttonLabel = label || t('ui.pay_with_crypto');

  // Extract error codes
  const errorCode =
    error && typeof error !== 'string' ? (error as { code?: string })?.code ?? null : null;
  const solanaErrorCode =
    contextSolanaError && typeof contextSolanaError !== 'string'
      ? (contextSolanaError as { code?: string })?.code ?? null
      : null;

  // Localize error messages
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

  // Store payment functions in ref
  const processPaymentRef = useRef(processPayment);
  const processCartPaymentRef = useRef(processCartPayment);

  useEffect(() => {
    processPaymentRef.current = processPayment;
    processCartPaymentRef.current = processCartPayment;
  }, [processPayment, processCartPayment]);

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
    [walletStateKey]
  );

  useEffect(() => {
    if (status === 'success' && transactionId) {
      const itemCount = isCartMode && items ? getCartItemCount(items) : undefined;
      emitPaymentSuccess('crypto', transactionId, effectiveResource, itemCount);
      if (onSuccess) {
        onSuccess(transactionId);
      }
    }
  }, [status, transactionId, onSuccess, isCartMode, items, effectiveResource]);

  useEffect(() => {
    if (status === 'error' && error) {
      const itemCount = isCartMode && items ? getCartItemCount(items) : undefined;
      emitPaymentError('crypto', error, effectiveResource, itemCount);
      if (onError) {
        onError(error);
      }
    }
  }, [status, error, onError, isCartMode, items, effectiveResource]);

  const [showWalletSelector, setShowWalletSelector] = useState(false);
  const [triggerConnect, setTriggerConnect] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<{
    type: 'single' | 'cart';
    resource?: string;
    items?: CartItem[];
    metadata?: Record<string, string>;
    couponCode?: string;
  } | null>(null);

  const solanaError = contextSolanaError;

  // Auto-connect when wallet is selected
  useEffect(() => {
    let cancelled = false;

    const attemptConnect = async () => {
      if (triggerConnect && wallet && !connected && !connecting) {
        getLogger().debug(
          '[CryptoButton] Wallet detected, attempting auto-connect:',
          wallet.adapter.name
        );
        setTriggerConnect(false);
        emitWalletConnect(wallet.adapter.name);

        try {
          await connect();
          if (!cancelled) {
            getLogger().debug('[CryptoButton] Auto-connect successful');
          }
        } catch (err) {
          if (!cancelled) {
            getLogger().error('[CryptoButton] Auto-connect failed:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to connect wallet';
            emitWalletError(errorMessage, wallet.adapter.name);
            setPendingPayment(null);
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
    getLogger().debug('[CryptoButton] Payment useEffect triggered', {
      connected,
      hasPendingPayment: !!pendingPayment,
      hasPublicKey: !!publicKey,
      pendingPaymentType: pendingPayment?.type,
    });

    if (connected && pendingPayment && publicKey && wallet) {
      emitWalletConnected(wallet.adapter.name, publicKey.toString());
      getLogger().debug('[CryptoButton] All conditions met! Processing pending payment:', pendingPayment);
      const payment = pendingPayment;
      setPendingPayment(null);
      setShowWalletSelector(false);

      const itemCount = payment.type === 'cart' && payment.items ? getCartItemCount(payment.items) : undefined;

      emitPaymentProcessing('crypto', payment.resource, itemCount);

      if (payment.type === 'cart' && payment.items) {
        getLogger().debug('[CryptoButton] Auto-processing cart payment');
        processCartPaymentRef.current(payment.items, payment.metadata, payment.couponCode);
      } else if (payment.type === 'single' && payment.resource) {
        getLogger().debug('[CryptoButton] Auto-processing single payment');
        processPaymentRef.current(payment.resource, payment.couponCode, payment.metadata);
      }
    }
  }, [connected, pendingPayment, publicKey, wallet]);

  // Core payment logic
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

    emitPaymentStart('crypto', effectiveResource, itemCount);

    if (onAttempt) {
      onAttempt('crypto');
    }

    if (solanaError) {
      getLogger().error('[CryptoButton] Solana dependencies missing:', solanaError);
      emitPaymentError('crypto', solanaError, effectiveResource, itemCount);
      if (onError) {
        onError(solanaError);
      }
      return;
    }

    if (!connected) {
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

      if (!hasPendingPayment) {
        getLogger().error('[CryptoButton] No valid payment to process');
        return;
      }

      try {
        if (wallet) {
          getLogger().debug('[CryptoButton] Wallet already selected, connecting:', wallet.adapter.name);
          emitWalletConnect(wallet.adapter.name);
          await connect();
        } else {
          getLogger().debug('[CryptoButton] No wallet selected, showing selector');

          if (installedWallets.length === 0) {
            setPendingPayment(null);
            const error = 'No wallets available';
            emitWalletError(error);
            throw new Error(error);
          }

          setShowWalletSelector(true);
        }
      } catch (err) {
        setPendingPayment(null);
        const message = err instanceof Error ? err.message : 'Failed to connect wallet';
        getLogger().error('[CryptoButton] Connection error:', message);
        emitWalletError(message, wallet?.adapter.name);
      }
    } else {
      emitPaymentProcessing('crypto', effectiveResource, itemCount);
      if (isCartMode && items) {
        getLogger().debug('[CryptoButton] Processing cart payment with coupon:', couponCode);
        await processCartPayment(items, metadata, couponCode);
      } else if (effectiveResource) {
        getLogger().debug('[CryptoButton] Processing single payment with coupon:', couponCode);
        await processPayment(effectiveResource, couponCode, metadata);
      }
    }
  }, [
    connected,
    wallet,
    couponCode,
    isCartMode,
    items,
    effectiveResource,
    installedWallets,
    connect,
    metadata,
    processCartPayment,
    processPayment,
    solanaError,
    onAttempt,
    onError,
  ]);

  // Create unique button ID for deduplication
  const buttonId = useMemo(() => {
    if (isCartMode && items) {
      return `crypto-cart-${items.map((i) => i.resource).join('-')}`;
    }
    return `crypto-${effectiveResource || 'unknown'}`;
  }, [isCartMode, items, effectiveResource]);

  // Wrap with cooldown only (NO deduplication window for crypto)
  const handlePress = useMemo(
    () =>
      createDedupedClickHandler(buttonId, executePaymentFlow, {
        cooldownMs: 200,
        deduplicationWindowMs: 0,
      }),
    [buttonId, executePaymentFlow]
  );

  const isProcessing = status === 'loading';
  const isDisabled = disabled || isProcessing || connecting || !!solanaError;
  const displayLabel = isProcessing ? t('ui.processing') : buttonLabel;

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
      getLogger().debug('[CryptoButton] Wallet clicked:', walletName);
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
      setPendingPayment(null);
    } catch (err) {
      getLogger().error('Failed to disconnect wallet:', err);
    }
  }, [disconnect]);

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        onPress={handlePress}
        disabled={isDisabled}
        style={[
          styles.button,
          theme.unstyled ? null : { backgroundColor: theme.tokens?.cryptoBackground || '#14f195' },
          isDisabled && styles.disabled,
        ]}
        activeOpacity={0.8}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={displayLabel}
        accessibilityState={{ disabled: isDisabled, busy: isProcessing }}
      >
        {isProcessing ? (
          <ActivityIndicator color={loadingColor} size="small" />
        ) : (
          <Text style={[styles.buttonText, textStyle]}>{displayLabel}</Text>
        )}
      </TouchableOpacity>

      {/* Wallet Selector Modal */}
      <Modal
        visible={showWalletSelector && !hideMessages}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowWalletSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('wallet.select_wallet')}</Text>
              <TouchableOpacity
                onPress={() => setShowWalletSelector(false)}
                style={styles.closeButton}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={t('ui.close')}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.walletList}>
              {installedWallets.map((w) => (
                <TouchableOpacity
                  key={w.adapter.name}
                  onPress={() => handleSelectWallet(w.adapter.name)}
                  style={styles.walletOption}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={w.adapter.name}
                >
                  <View style={styles.walletIcon}>
                    {w.adapter.icon && (
                      <Image
                        source={{ uri: w.adapter.icon }}
                        style={styles.walletIconImage}
                        resizeMode="contain"
                      />
                    )}
                  </View>
                  <Text style={styles.walletName}>{w.adapter.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Wallet controls */}
      {connected && !hideMessages && !showWalletSelector && (
        <View style={styles.walletControls}>
          <TouchableOpacity onPress={handleChangeWallet} accessible={true} accessibilityRole="button">
            <Text style={styles.walletControlText}>{t('wallet.change')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDisconnect}
            accessible={true}
            accessibilityRole="button"
          >
            <Text style={styles.walletControlText}>{t('ui.disconnect')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {!hideMessages && localizedSolanaError && (
        <Text style={[styles.errorText, { color: theme.tokens?.errorText || '#ef4444' }]}>
          {localizedSolanaError}
        </Text>
      )}
      {!hideMessages && localizedError && (
        <Text style={[styles.errorText, { color: theme.tokens?.errorText || '#ef4444' }]}>
          {localizedError}
        </Text>
      )}
      {!hideMessages && transactionId && (
        <Text style={[styles.successText, { color: theme.tokens?.successText || '#22c55e' }]}>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#6b7280',
    lineHeight: 24,
  },
  walletList: {
    maxHeight: 300,
  },
  walletOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  walletIcon: {
    width: 32,
    height: 32,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletIconImage: {
    width: 24,
    height: 24,
  },
  walletName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  walletControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  walletControlText: {
    fontSize: 12,
    color: '#6b7280',
    textDecorationLine: 'underline',
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
