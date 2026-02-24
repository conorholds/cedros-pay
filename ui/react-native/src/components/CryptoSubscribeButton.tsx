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
import { useCryptoSubscription } from '../hooks/useCryptoSubscription';
import { getLogger } from '../utils/logger';
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
  /** Custom container style */
  style?: ViewStyle;
  /** Custom text style */
  textStyle?: TextStyle;
  /** Loading indicator color */
  loadingColor?: string;
  /** Hide inline success/error messages */
  hideMessages?: boolean;
  /** Auto-check subscription status on mount when wallet is connected */
  autoCheckStatus?: boolean;
}

/**
 * Button component for x402 crypto subscription payments (React Native)
 *
 * Shows subscription status when active, otherwise allows subscribing
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
  style,
  textStyle,
  loadingColor = '#ffffff',
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

  // Store functions in refs
  const processPaymentRef = useRef(processPayment);
  const checkStatusRef = useRef(checkStatus);

  useEffect(() => {
    processPaymentRef.current = processPayment;
    checkStatusRef.current = checkStatus;
  }, [processPayment, checkStatus]);

  // Error message localization
  const errorCode =
    error && typeof error !== 'string' ? (error as { code?: string })?.code ?? null : null;
  const solanaErrorCode =
    contextSolanaError && typeof contextSolanaError !== 'string'
      ? (contextSolanaError as { code?: string })?.code ?? null
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
      if (onSuccess) {
        onSuccess('subscription-active');
      }
    }
  }, [status, subscriptionStatus, resource, onSuccess]);

  useEffect(() => {
    if (status === 'error' && error) {
      emitPaymentError('crypto', error, resource);
      if (onError) {
        onError(error);
      }
    }
  }, [status, error, resource, onError]);

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

  const handlePress = useMemo(
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

      {/* Status messages */}
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
      {!hideMessages && isSubscribed && (
        <Text style={[styles.successText, { color: theme.tokens?.successText || '#22c55e' }]}>
          {t('ui.subscription_active')}
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
