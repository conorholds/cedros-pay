"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CryptoButton = CryptoButton;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const wallet_adapter_react_1 = require("@solana/wallet-adapter-react");
const wallet_adapter_base_1 = require("@solana/wallet-adapter-base");
const context_1 = require("../context");
const useX402Payment_1 = require("../hooks/useX402Payment");
const usePaymentMode_1 = require("../hooks/usePaymentMode");
const logger_1 = require("../utils/logger");
const cartHelpers_1 = require("../utils/cartHelpers");
const requestDeduplication_1 = require("../utils/requestDeduplication");
const eventEmitter_1 = require("../utils/eventEmitter");
const useTranslation_1 = require("../i18n/useTranslation");
/**
 * Button component for Solana crypto payments via x402 (React Native)
 *
 * Handles wallet connection and transaction signing
 */
function CryptoButton({ resource, items, label, disabled = false, onAttempt, onSuccess, onError, style, textStyle, loadingColor = '#ffffff', hideMessages = false, metadata, couponCode, }) {
    const { connected, connecting, connect, disconnect, select, wallets: availableWallets, wallet, publicKey, } = (0, wallet_adapter_react_1.useWallet)();
    const { status, error, transactionId, processPayment, processCartPayment } = (0, useX402Payment_1.useX402Payment)();
    const theme = (0, context_1.useCedrosTheme)();
    const { solanaError: contextSolanaError } = (0, context_1.useCedrosContext)();
    const { isCartMode, effectiveResource } = (0, usePaymentMode_1.usePaymentMode)(resource, items);
    const { t, translations } = (0, useTranslation_1.useTranslation)();
    // Use translated default label if not provided
    const buttonLabel = label || t('ui.pay_with_crypto');
    // Extract error codes
    const errorCode = error && typeof error !== 'string' ? error?.code ?? null : null;
    const solanaErrorCode = contextSolanaError && typeof contextSolanaError !== 'string'
        ? contextSolanaError?.code ?? null
        : null;
    // Localize error messages
    const getErrorMessage = (code) => {
        if (!code || !translations)
            return '';
        const errorData = translations.errors[code];
        if (!errorData)
            return '';
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
    const processPaymentRef = (0, react_1.useRef)(processPayment);
    const processCartPaymentRef = (0, react_1.useRef)(processCartPayment);
    (0, react_1.useEffect)(() => {
        processPaymentRef.current = processPayment;
        processCartPaymentRef.current = processCartPayment;
    }, [processPayment, processCartPayment]);
    // Memoize wallet state key
    const walletStateKey = (0, react_1.useMemo)(() => availableWallets.map((w) => `${w.adapter.name}-${w.readyState}`).join(','), [availableWallets]);
    const installedWallets = (0, react_1.useMemo)(() => availableWallets.filter(({ readyState }) => readyState === wallet_adapter_base_1.WalletReadyState.Installed || readyState === wallet_adapter_base_1.WalletReadyState.Loadable), [walletStateKey]);
    (0, react_1.useEffect)(() => {
        if (status === 'success' && transactionId) {
            const itemCount = isCartMode && items ? (0, cartHelpers_1.getCartItemCount)(items) : undefined;
            (0, eventEmitter_1.emitPaymentSuccess)('crypto', transactionId, effectiveResource, itemCount);
            if (onSuccess) {
                onSuccess(transactionId);
            }
        }
    }, [status, transactionId, onSuccess, isCartMode, items, effectiveResource]);
    (0, react_1.useEffect)(() => {
        if (status === 'error' && error) {
            const itemCount = isCartMode && items ? (0, cartHelpers_1.getCartItemCount)(items) : undefined;
            (0, eventEmitter_1.emitPaymentError)('crypto', error, effectiveResource, itemCount);
            if (onError) {
                onError(error);
            }
        }
    }, [status, error, onError, isCartMode, items, effectiveResource]);
    const [showWalletSelector, setShowWalletSelector] = (0, react_1.useState)(false);
    const [triggerConnect, setTriggerConnect] = (0, react_1.useState)(false);
    const [pendingPayment, setPendingPayment] = (0, react_1.useState)(null);
    const solanaError = contextSolanaError;
    // Auto-connect when wallet is selected
    (0, react_1.useEffect)(() => {
        let cancelled = false;
        const attemptConnect = async () => {
            if (triggerConnect && wallet && !connected && !connecting) {
                (0, logger_1.getLogger)().debug('[CryptoButton] Wallet detected, attempting auto-connect:', wallet.adapter.name);
                setTriggerConnect(false);
                (0, eventEmitter_1.emitWalletConnect)(wallet.adapter.name);
                try {
                    await connect();
                    if (!cancelled) {
                        (0, logger_1.getLogger)().debug('[CryptoButton] Auto-connect successful');
                    }
                }
                catch (err) {
                    if (!cancelled) {
                        (0, logger_1.getLogger)().error('[CryptoButton] Auto-connect failed:', err);
                        const errorMessage = err instanceof Error ? err.message : 'Failed to connect wallet';
                        (0, eventEmitter_1.emitWalletError)(errorMessage, wallet.adapter.name);
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
    (0, react_1.useEffect)(() => {
        (0, logger_1.getLogger)().debug('[CryptoButton] Payment useEffect triggered', {
            connected,
            hasPendingPayment: !!pendingPayment,
            hasPublicKey: !!publicKey,
            pendingPaymentType: pendingPayment?.type,
        });
        if (connected && pendingPayment && publicKey && wallet) {
            (0, eventEmitter_1.emitWalletConnected)(wallet.adapter.name, publicKey.toString());
            (0, logger_1.getLogger)().debug('[CryptoButton] All conditions met! Processing pending payment:', pendingPayment);
            const payment = pendingPayment;
            setPendingPayment(null);
            setShowWalletSelector(false);
            const itemCount = payment.type === 'cart' && payment.items ? (0, cartHelpers_1.getCartItemCount)(payment.items) : undefined;
            (0, eventEmitter_1.emitPaymentProcessing)('crypto', payment.resource, itemCount);
            if (payment.type === 'cart' && payment.items) {
                (0, logger_1.getLogger)().debug('[CryptoButton] Auto-processing cart payment');
                processCartPaymentRef.current(payment.items, payment.metadata, payment.couponCode);
            }
            else if (payment.type === 'single' && payment.resource) {
                (0, logger_1.getLogger)().debug('[CryptoButton] Auto-processing single payment');
                processPaymentRef.current(payment.resource, payment.couponCode, payment.metadata);
            }
        }
    }, [connected, pendingPayment, publicKey, wallet]);
    // Core payment logic
    const executePaymentFlow = (0, react_1.useCallback)(async () => {
        (0, logger_1.getLogger)().debug('[CryptoButton] executePaymentFlow called', {
            connected,
            wallet: wallet?.adapter.name,
            couponCode,
            isCartMode,
            hasItems: !!items,
            effectiveResource,
        });
        const itemCount = isCartMode && items ? (0, cartHelpers_1.getCartItemCount)(items) : undefined;
        (0, eventEmitter_1.emitPaymentStart)('crypto', effectiveResource, itemCount);
        if (onAttempt) {
            onAttempt('crypto');
        }
        if (solanaError) {
            (0, logger_1.getLogger)().error('[CryptoButton] Solana dependencies missing:', solanaError);
            (0, eventEmitter_1.emitPaymentError)('crypto', solanaError, effectiveResource, itemCount);
            if (onError) {
                onError(solanaError);
            }
            return;
        }
        if (!connected) {
            let hasPendingPayment = false;
            if (isCartMode && items) {
                (0, logger_1.getLogger)().debug('[CryptoButton] Setting pending cart payment with coupon:', couponCode);
                setPendingPayment({ type: 'cart', items, metadata, couponCode });
                hasPendingPayment = true;
            }
            else if (effectiveResource) {
                (0, logger_1.getLogger)().debug('[CryptoButton] Setting pending single payment with coupon:', couponCode);
                setPendingPayment({ type: 'single', resource: effectiveResource, metadata, couponCode });
                hasPendingPayment = true;
            }
            if (!hasPendingPayment) {
                (0, logger_1.getLogger)().error('[CryptoButton] No valid payment to process');
                return;
            }
            try {
                if (wallet) {
                    (0, logger_1.getLogger)().debug('[CryptoButton] Wallet already selected, connecting:', wallet.adapter.name);
                    (0, eventEmitter_1.emitWalletConnect)(wallet.adapter.name);
                    await connect();
                }
                else {
                    (0, logger_1.getLogger)().debug('[CryptoButton] No wallet selected, showing selector');
                    if (installedWallets.length === 0) {
                        setPendingPayment(null);
                        const error = 'No wallets available';
                        (0, eventEmitter_1.emitWalletError)(error);
                        throw new Error(error);
                    }
                    setShowWalletSelector(true);
                }
            }
            catch (err) {
                setPendingPayment(null);
                const message = err instanceof Error ? err.message : 'Failed to connect wallet';
                (0, logger_1.getLogger)().error('[CryptoButton] Connection error:', message);
                (0, eventEmitter_1.emitWalletError)(message, wallet?.adapter.name);
            }
        }
        else {
            (0, eventEmitter_1.emitPaymentProcessing)('crypto', effectiveResource, itemCount);
            if (isCartMode && items) {
                (0, logger_1.getLogger)().debug('[CryptoButton] Processing cart payment with coupon:', couponCode);
                await processCartPayment(items, metadata, couponCode);
            }
            else if (effectiveResource) {
                (0, logger_1.getLogger)().debug('[CryptoButton] Processing single payment with coupon:', couponCode);
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
    const buttonId = (0, react_1.useMemo)(() => {
        if (isCartMode && items) {
            return `crypto-cart-${items.map((i) => i.resource).join('-')}`;
        }
        return `crypto-${effectiveResource || 'unknown'}`;
    }, [isCartMode, items, effectiveResource]);
    // Wrap with cooldown only (NO deduplication window for crypto)
    const handlePress = (0, react_1.useMemo)(() => (0, requestDeduplication_1.createDedupedClickHandler)(buttonId, executePaymentFlow, {
        cooldownMs: 200,
        deduplicationWindowMs: 0,
    }), [buttonId, executePaymentFlow]);
    const isProcessing = status === 'loading';
    const isDisabled = disabled || isProcessing || connecting || !!solanaError;
    const displayLabel = isProcessing ? t('ui.processing') : buttonLabel;
    const handleChangeWallet = (0, react_1.useCallback)(async () => {
        try {
            setTriggerConnect(false);
            if (connected) {
                await disconnect();
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            select(null);
            setShowWalletSelector(true);
        }
        catch (err) {
            (0, logger_1.getLogger)().error('Failed to change wallet:', err);
        }
    }, [connected, disconnect, select]);
    const handleSelectWallet = (0, react_1.useCallback)((walletName) => {
        (0, logger_1.getLogger)().debug('[CryptoButton] Wallet clicked:', walletName);
        setShowWalletSelector(false);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        select(walletName);
        setTriggerConnect(true);
    }, [select]);
    const handleDisconnect = (0, react_1.useCallback)(async () => {
        try {
            await disconnect();
            setPendingPayment(null);
        }
        catch (err) {
            (0, logger_1.getLogger)().error('Failed to disconnect wallet:', err);
        }
    }, [disconnect]);
    return (<react_native_1.View style={[styles.container, style]}>
      <react_native_1.TouchableOpacity onPress={handlePress} disabled={isDisabled} style={[
            styles.button,
            theme.unstyled ? null : { backgroundColor: theme.tokens?.cryptoBackground || '#14f195' },
            isDisabled && styles.disabled,
        ]} activeOpacity={0.8} accessible={true} accessibilityRole="button" accessibilityLabel={displayLabel} accessibilityState={{ disabled: isDisabled, busy: isProcessing }}>
        {isProcessing ? (<react_native_1.ActivityIndicator color={loadingColor} size="small"/>) : (<react_native_1.Text style={[styles.buttonText, textStyle]}>{displayLabel}</react_native_1.Text>)}
      </react_native_1.TouchableOpacity>

      {/* Wallet Selector Modal */}
      <react_native_1.Modal visible={showWalletSelector && !hideMessages} transparent={true} animationType="fade" onRequestClose={() => setShowWalletSelector(false)}>
        <react_native_1.View style={styles.modalOverlay}>
          <react_native_1.View style={styles.modalContent}>
            <react_native_1.View style={styles.modalHeader}>
              <react_native_1.Text style={styles.modalTitle}>{t('wallet.select_wallet')}</react_native_1.Text>
              <react_native_1.TouchableOpacity onPress={() => setShowWalletSelector(false)} style={styles.closeButton} accessible={true} accessibilityRole="button" accessibilityLabel={t('ui.close')}>
                <react_native_1.Text style={styles.closeButtonText}>×</react_native_1.Text>
              </react_native_1.TouchableOpacity>
            </react_native_1.View>
            <react_native_1.ScrollView style={styles.walletList}>
              {installedWallets.map((w) => (<react_native_1.TouchableOpacity key={w.adapter.name} onPress={() => handleSelectWallet(w.adapter.name)} style={styles.walletOption} accessible={true} accessibilityRole="button" accessibilityLabel={w.adapter.name}>
                  <react_native_1.View style={styles.walletIcon}>
                    {w.adapter.icon && (<react_native_1.Image source={{ uri: w.adapter.icon }} style={styles.walletIconImage} resizeMode="contain"/>)}
                  </react_native_1.View>
                  <react_native_1.Text style={styles.walletName}>{w.adapter.name}</react_native_1.Text>
                </react_native_1.TouchableOpacity>))}
            </react_native_1.ScrollView>
          </react_native_1.View>
        </react_native_1.View>
      </react_native_1.Modal>

      {/* Wallet controls */}
      {connected && !hideMessages && !showWalletSelector && (<react_native_1.View style={styles.walletControls}>
          <react_native_1.TouchableOpacity onPress={handleChangeWallet} accessible={true} accessibilityRole="button">
            <react_native_1.Text style={styles.walletControlText}>{t('wallet.change')}</react_native_1.Text>
          </react_native_1.TouchableOpacity>
          <react_native_1.TouchableOpacity onPress={handleDisconnect} accessible={true} accessibilityRole="button">
            <react_native_1.Text style={styles.walletControlText}>{t('ui.disconnect')}</react_native_1.Text>
          </react_native_1.TouchableOpacity>
        </react_native_1.View>)}

      {!hideMessages && localizedSolanaError && (<react_native_1.Text style={[styles.errorText, { color: theme.tokens?.errorText || '#ef4444' }]}>
          {localizedSolanaError}
        </react_native_1.Text>)}
      {!hideMessages && localizedError && (<react_native_1.Text style={[styles.errorText, { color: theme.tokens?.errorText || '#ef4444' }]}>
          {localizedError}
        </react_native_1.Text>)}
      {!hideMessages && transactionId && (<react_native_1.Text style={[styles.successText, { color: theme.tokens?.successText || '#22c55e' }]}>
          {t('ui.payment_successful')}
        </react_native_1.Text>)}
    </react_native_1.View>);
}
const styles = react_native_1.StyleSheet.create({
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
//# sourceMappingURL=CryptoButton.js.map