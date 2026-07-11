"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CryptoSubscribeButton = CryptoSubscribeButton;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_native_1 = require("react-native");
const wallet_adapter_base_1 = require("@solana/wallet-adapter-base");
const wallet_adapter_react_1 = require("@solana/wallet-adapter-react");
const context_1 = require("../context");
const useCryptoSubscription_1 = require("../hooks/useCryptoSubscription");
const useCedrosTranslation_1 = require("../i18n/useCedrosTranslation");
const requestDeduplication_1 = require("../utils/requestDeduplication");
const logger_1 = require("../utils/logger");
const eventEmitter_1 = require("../utils/eventEmitter");
const CryptoWalletControls_1 = require("./crypto/CryptoWalletControls");
const CryptoWalletSelectorModal_1 = require("./crypto/CryptoWalletSelectorModal");
const useWalletConnectionFlow_1 = require("./crypto/useWalletConnectionFlow");
function CryptoSubscribeButton({ resource, interval, intervalDays, couponCode, label, disabled = false, onAttempt, onSuccess, onError, style, textStyle, loadingColor = '#ffffff', hideMessages = false, autoCheckStatus = true, }) {
    const { connected, connecting, connect, disconnect, select, wallets, wallet, publicKey } = (0, wallet_adapter_react_1.useWallet)();
    const { status, error, subscriptionStatus, expiresAt, checkStatus, processPayment, } = (0, useCryptoSubscription_1.useCryptoSubscription)();
    const theme = (0, context_1.useCedrosTheme)();
    const { solanaError } = (0, context_1.useCedrosContext)();
    const { t, translations } = (0, useCedrosTranslation_1.useCedrosTranslation)();
    const installedWallets = (0, react_1.useMemo)(() => wallets.filter(({ readyState }) => readyState === wallet_adapter_base_1.WalletReadyState.Installed || readyState === wallet_adapter_base_1.WalletReadyState.Loadable), [wallets]);
    const { showWalletSelector, ensureConnectedWallet, selectWalletByName, cancelWalletSelection, changeWallet, disconnectWallet, } = (0, useWalletConnectionFlow_1.useWalletConnectionFlow)({
        connected,
        wallet,
        publicKey,
        connect,
        disconnect,
        select: (walletName) => select(walletName),
        logPrefix: 'CryptoSubscribeButton',
    });
    (0, react_1.useEffect)(() => {
        if (autoCheckStatus && connected && publicKey) {
            (0, logger_1.getLogger)().debug('[CryptoSubscribeButton] Auto-checking subscription status');
            void checkStatus(resource);
        }
    }, [autoCheckStatus, checkStatus, connected, publicKey, resource]);
    const getErrorMessage = (0, react_1.useCallback)((code) => {
        if (!code || !translations)
            return '';
        const errorData = translations.errors[code];
        if (!errorData)
            return '';
        return errorData.action ? `${errorData.message} ${errorData.action}` : errorData.message;
    }, [translations]);
    const localizedError = error
        ? typeof error === 'string'
            ? error
            : getErrorMessage(error?.code ?? null)
        : null;
    const localizedSolanaError = solanaError
        ? typeof solanaError === 'string'
            ? solanaError
            : getErrorMessage(solanaError?.code ?? null)
        : null;
    const handleSubscriptionResult = (0, react_1.useCallback)((result) => {
        if (result.success) {
            const transactionId = result.transactionId || 'subscription-active';
            (0, eventEmitter_1.emitPaymentSuccess)('crypto', transactionId, resource);
            onSuccess?.(transactionId);
            return;
        }
        const message = result.error || 'Subscription payment failed';
        (0, eventEmitter_1.emitPaymentError)('crypto', message, resource);
        onError?.(message);
    }, [onError, onSuccess, resource]);
    const executeSubscriptionFlow = (0, react_1.useCallback)(async () => {
        (0, eventEmitter_1.emitPaymentStart)('crypto', resource);
        onAttempt?.('crypto');
        if (solanaError) {
            (0, eventEmitter_1.emitPaymentError)('crypto', solanaError, resource);
            onError?.(solanaError);
            return;
        }
        try {
            if (!connected) {
                if (!wallet && installedWallets.length === 0) {
                    const message = 'No wallets available';
                    (0, eventEmitter_1.emitWalletError)(message);
                    (0, eventEmitter_1.emitPaymentError)('crypto', message, resource);
                    onError?.(message);
                    return;
                }
                await ensureConnectedWallet();
            }
            (0, eventEmitter_1.emitPaymentProcessing)('crypto', resource);
            const result = await processPayment(resource, interval, { couponCode, intervalDays });
            handleSubscriptionResult(result);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to connect wallet';
            (0, eventEmitter_1.emitWalletError)(message, wallet?.adapter.name);
            (0, eventEmitter_1.emitPaymentError)('crypto', message, resource);
            onError?.(message);
        }
    }, [
        connected,
        couponCode,
        handleSubscriptionResult,
        installedWallets.length,
        interval,
        intervalDays,
        onAttempt,
        onError,
        processPayment,
        resource,
        solanaError,
        wallet,
        ensureConnectedWallet,
    ]);
    const buttonId = (0, react_1.useMemo)(() => `crypto-subscribe-${resource}-${interval}`, [interval, resource]);
    const handlePress = (0, react_1.useMemo)(() => (0, requestDeduplication_1.createDedupedClickHandler)(buttonId, executeSubscriptionFlow, {
        cooldownMs: 200,
        deduplicationWindowMs: 0,
    }), [buttonId, executeSubscriptionFlow]);
    const isProcessing = status === 'loading' || status === 'checking';
    const isSubscribed = subscriptionStatus === 'active' || subscriptionStatus === 'trialing';
    const isDisabled = disabled || isProcessing || connecting || Boolean(solanaError) || isSubscribed;
    const displayLabel = getDisplayLabel({
        baseLabel: label || t('ui.subscribe_with_crypto'),
        expiresAt,
        isProcessing,
        isSubscribed,
        t,
    });
    return ((0, jsx_runtime_1.jsxs)(react_native_1.View, { style: [styles.container, style], children: [(0, jsx_runtime_1.jsx)(react_native_1.TouchableOpacity, { onPress: handlePress, disabled: isDisabled, style: [
                    styles.button,
                    theme.unstyled ? null : { backgroundColor: theme.tokens?.cryptoBackground || '#14f195' },
                    isDisabled && styles.disabled,
                ], activeOpacity: 0.8, accessible: true, accessibilityRole: "button", accessibilityLabel: displayLabel, accessibilityState: { disabled: isDisabled, busy: isProcessing }, children: isProcessing ? ((0, jsx_runtime_1.jsx)(react_native_1.ActivityIndicator, { color: loadingColor, size: "small" })) : ((0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [styles.buttonText, textStyle], children: displayLabel })) }), (0, jsx_runtime_1.jsx)(CryptoWalletSelectorModal_1.CryptoWalletSelectorModal, { visible: showWalletSelector && !hideMessages, wallets: installedWallets, title: t('wallet.select_wallet'), closeLabel: t('ui.close'), onSelectWallet: selectWalletByName, onClose: cancelWalletSelection }), connected && !hideMessages && !showWalletSelector ? ((0, jsx_runtime_1.jsx)(CryptoWalletControls_1.CryptoWalletControls, { changeLabel: t('wallet.change'), disconnectLabel: t('ui.disconnect'), onChangeWallet: () => { void changeWallet(); }, onDisconnect: () => { void disconnectWallet(); } })) : null, !hideMessages && localizedSolanaError ? ((0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [styles.errorText, { color: theme.tokens?.errorText || '#ef4444' }], children: localizedSolanaError })) : null, !hideMessages && localizedError ? ((0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [styles.errorText, { color: theme.tokens?.errorText || '#ef4444' }], children: localizedError })) : null, !hideMessages && isSubscribed ? ((0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [styles.successText, { color: theme.tokens?.successText || '#22c55e' }], children: t('ui.subscription_active') })) : null] }));
}
function getDisplayLabel({ baseLabel, expiresAt, isProcessing, isSubscribed, t, }) {
    if (isProcessing)
        return t('ui.processing');
    if (isSubscribed && expiresAt) {
        return `${t('ui.subscribed_until')} ${new Date(expiresAt).toLocaleDateString()}`;
    }
    if (isSubscribed)
        return t('ui.subscribed');
    return baseLabel;
}
const styles = react_native_1.StyleSheet.create({
    container: { width: '100%' },
    button: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 48,
    },
    buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
    disabled: { opacity: 0.6 },
    errorText: { marginTop: 8, fontSize: 14, textAlign: 'center' },
    successText: { marginTop: 8, fontSize: 14, textAlign: 'center' },
});
//# sourceMappingURL=CryptoSubscribeButton.js.map