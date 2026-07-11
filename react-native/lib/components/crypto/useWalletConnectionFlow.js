"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useWalletConnectionFlow = useWalletConnectionFlow;
const react_1 = require("react");
const eventEmitter_1 = require("../../utils/eventEmitter");
const logger_1 = require("../../utils/logger");
const DEFAULT_TIMEOUT_MS = 15000;
const POLL_INTERVAL_MS = 25;
function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function useWalletConnectionFlow({ connected, wallet, publicKey, connect, disconnect, select, logPrefix, walletSelectionTimeoutMs = DEFAULT_TIMEOUT_MS, }) {
    const [showWalletSelector, setShowWalletSelector] = (0, react_1.useState)(false);
    const stateRef = (0, react_1.useRef)({ connected, wallet, publicKey, connect, disconnect, select });
    const selectionWaiterRef = (0, react_1.useRef)(null);
    stateRef.current = { connected, wallet, publicKey, connect, disconnect, select };
    (0, react_1.useEffect)(() => {
        return () => {
            selectionWaiterRef.current?.reject(new Error('Wallet selection cancelled'));
            selectionWaiterRef.current = null;
        };
    }, []);
    const waitForState = (0, react_1.useCallback)(async (isReady, timeoutMessage) => {
        const startedAt = Date.now();
        while (!isReady(stateRef.current)) {
            if (Date.now() - startedAt > walletSelectionTimeoutMs) {
                throw new Error(timeoutMessage);
            }
            await delay(POLL_INTERVAL_MS);
        }
        return stateRef.current;
    }, [walletSelectionTimeoutMs]);
    const waitForWalletSelection = (0, react_1.useCallback)(() => (new Promise((resolve, reject) => {
        selectionWaiterRef.current?.reject(new Error('Wallet selection replaced'));
        selectionWaiterRef.current = { resolve, reject };
        setShowWalletSelector(true);
    })), []);
    const connectSelectedWallet = (0, react_1.useCallback)(async () => {
        const current = stateRef.current;
        if (current.connected && current.wallet && current.publicKey)
            return;
        if (!current.wallet)
            throw new Error('No wallet selected');
        (0, eventEmitter_1.emitWalletConnect)(current.wallet.adapter.name);
        await current.connect();
        const next = await waitForState((state) => Boolean(state.connected && state.wallet && state.publicKey), 'Timed out waiting for wallet connection');
        if (!next.wallet || !next.publicKey) {
            throw new Error('Wallet did not finish connecting');
        }
        (0, eventEmitter_1.emitWalletConnected)(next.wallet.adapter.name, next.publicKey.toString());
        (0, logger_1.getLogger)().debug(`[${logPrefix}] Wallet connected`, next.wallet.adapter.name);
    }, [logPrefix, waitForState]);
    const selectWalletByName = (0, react_1.useCallback)((walletName) => {
        setShowWalletSelector(false);
        stateRef.current.select(walletName);
        const waiter = selectionWaiterRef.current;
        if (waiter) {
            selectionWaiterRef.current = null;
            waiter.resolve(walletName);
            return;
        }
        void waitForState((state) => state.wallet?.adapter.name === walletName, 'Timed out waiting for wallet selection')
            .then(() => connectSelectedWallet())
            .catch((error) => {
            const message = error instanceof Error ? error.message : 'Failed to connect wallet';
            (0, eventEmitter_1.emitWalletError)(message, walletName);
            (0, logger_1.getLogger)().error(`[${logPrefix}] Wallet selection failed:`, error);
        });
    }, [connectSelectedWallet, logPrefix, waitForState]);
    const cancelWalletSelection = (0, react_1.useCallback)(() => {
        setShowWalletSelector(false);
        selectionWaiterRef.current?.reject(new Error('Wallet selection cancelled'));
        selectionWaiterRef.current = null;
    }, []);
    const ensureConnectedWallet = (0, react_1.useCallback)(async () => {
        if (stateRef.current.connected && stateRef.current.wallet && stateRef.current.publicKey)
            return;
        if (!stateRef.current.wallet) {
            const walletName = await waitForWalletSelection();
            await waitForState((state) => state.wallet?.adapter.name === walletName, 'Timed out waiting for wallet selection');
        }
        await connectSelectedWallet();
    }, [connectSelectedWallet, waitForState, waitForWalletSelection]);
    const changeWallet = (0, react_1.useCallback)(async () => {
        try {
            if (stateRef.current.connected) {
                await stateRef.current.disconnect();
            }
            stateRef.current.select(null);
            setShowWalletSelector(true);
        }
        catch (error) {
            (0, logger_1.getLogger)().error(`[${logPrefix}] Failed to change wallet:`, error);
        }
    }, [logPrefix]);
    const disconnectWallet = (0, react_1.useCallback)(async () => {
        try {
            await stateRef.current.disconnect();
        }
        catch (error) {
            (0, logger_1.getLogger)().error(`[${logPrefix}] Failed to disconnect wallet:`, error);
        }
    }, [logPrefix]);
    return {
        showWalletSelector,
        ensureConnectedWallet,
        selectWalletByName,
        cancelWalletSelection,
        changeWallet,
        disconnectWallet,
    };
}
//# sourceMappingURL=useWalletConnectionFlow.js.map