"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CedrosProvider = CedrosProvider;
exports.useCedrosContext = useCedrosContext;
const react_1 = require("react");
const ManagerCache_1 = require("../managers/ManagerCache");
const utils_1 = require("../utils");
const ThemeContext_1 = require("./ThemeContext");
const logger_1 = require("../utils/logger");
const walletPool_1 = require("../utils/walletPool");
const solanaCheck_1 = require("../utils/solanaCheck");
// Get default log level based on environment
function getDefaultLogLevel() {
    // In development, show all logs (DEBUG = 0)
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
        return 0; // LogLevel.DEBUG
    }
    // In production, only show warnings and errors (WARN = 2)
    return 2; // LogLevel.WARN
}
const CedrosContext = (0, react_1.createContext)(null);
/**
 * Provider component that initializes managers and provides config
 *
 * Usage:
 * <CedrosProvider config={{ stripePublicKey, serverUrl, solanaCluster }}>
 *   <App />
 * </CedrosProvider>
 */
function CedrosProvider({ config, children }) {
    const validatedConfig = (0, react_1.useMemo)(() => (0, utils_1.validateConfig)(config), [config]);
    const [initError, setInitError] = (0, react_1.useState)(null);
    // Create context-scoped wallet pool (one per CedrosProvider instance)
    // Using useRef to ensure it's only created once per component lifecycle
    const walletPoolRef = (0, react_1.useRef)(null);
    if (walletPoolRef.current === null) {
        walletPoolRef.current = (0, walletPool_1.createWalletPool)();
    }
    // Check Solana availability once at provider level (cached for all children)
    // PERFORMANCE OPTIMIZATION: Eliminates redundant checks in CryptoButton and useX402Payment
    const [solanaError, setSolanaError] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        let cancelled = false;
        (0, solanaCheck_1.checkSolanaAvailability)()
            .then((check) => {
            // Only update state if component is still mounted
            if (cancelled)
                return;
            if (!check.available) {
                setSolanaError(check.error || 'Solana dependencies not available');
            }
            else {
                setSolanaError(undefined); // undefined = available
            }
        })
            .catch((error) => {
            if (cancelled)
                return;
            (0, logger_1.getLogger)().error('[CedrosProvider] Solana availability check failed:', error);
            setInitError('Failed to initialize Cedros provider');
        });
        return () => {
            cancelled = true;
        };
    }, []);
    // Initialize logger with user-configured log level
    (0, react_1.useEffect)(() => {
        const logLevel = validatedConfig.logLevel ?? getDefaultLogLevel();
        const logger = (0, logger_1.createLogger)({
            level: logLevel,
            prefix: '[CedrosPay]',
        });
        // Set as global logger instance
        (0, logger_1.setLogger)(logger);
    }, [validatedConfig.logLevel]);
    // Cleanup wallet pool on unmount
    // CRITICAL FIX: Separate wallet pool cleanup from manager cleanup to avoid race conditions
    (0, react_1.useEffect)(() => {
        const currentPool = walletPoolRef.current;
        return () => {
            // Cleanup wallet pool when component unmounts
            if (currentPool) {
                currentPool.cleanup().catch((error) => {
                    (0, logger_1.getLogger)().warn('[CedrosProvider] Wallet pool cleanup failed:', error);
                });
            }
        };
        // walletPoolRef.current is intentionally omitted - we only want cleanup on unmount, not on ref changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    // Release manager cache reference when config changes or on unmount
    // CRITICAL FIX: Capture config values in closure to ensure correct managers are released
    (0, react_1.useEffect)(() => {
        // Capture config values at effect creation time
        const stripeKey = validatedConfig.stripePublicKey;
        const serverUrl = validatedConfig.serverUrl ?? '';
        const cluster = validatedConfig.solanaCluster;
        const endpoint = validatedConfig.solanaEndpoint;
        const allowUnknownMint = validatedConfig.dangerouslyAllowUnknownMint;
        return () => {
            // Release the exact managers that were created with these config values
            (0, ManagerCache_1.releaseManagers)(stripeKey, serverUrl, cluster, endpoint, allowUnknownMint);
        };
    }, [
        validatedConfig.stripePublicKey,
        validatedConfig.serverUrl,
        validatedConfig.solanaCluster,
        validatedConfig.solanaEndpoint,
        validatedConfig.dangerouslyAllowUnknownMint,
    ]);
    // Get or create managers from global cache
    // Multiple providers with identical configs share manager instances (e.g., same Stripe.js load)
    // Wallet pools remain isolated per provider for multi-tenant security
    const contextValue = (0, react_1.useMemo)(() => {
        const { stripeManager, x402Manager, walletManager, subscriptionManager, subscriptionChangeManager, creditsManager } = (0, ManagerCache_1.getOrCreateManagers)(validatedConfig.stripePublicKey, validatedConfig.serverUrl ?? '', validatedConfig.solanaCluster, validatedConfig.solanaEndpoint, validatedConfig.dangerouslyAllowUnknownMint);
        return {
            config: validatedConfig,
            stripeManager,
            x402Manager,
            walletManager,
            subscriptionManager,
            subscriptionChangeManager,
            creditsManager,
            walletPool: walletPoolRef.current,
            solanaError,
        };
    }, [validatedConfig, solanaError]);
    if (initError) {
        return <div role="alert">{initError}</div>;
    }
    return (<CedrosContext.Provider value={contextValue}>
      <ThemeContext_1.CedrosThemeProvider initialMode={validatedConfig.theme ?? 'light'} overrides={validatedConfig.themeOverrides} unstyled={validatedConfig.unstyled ?? false}>
        {children}
      </ThemeContext_1.CedrosThemeProvider>
    </CedrosContext.Provider>);
}
/**
 * Hook to access Cedros context
 *
 * @throws Error if used outside CedrosProvider
 */
function useCedrosContext() {
    const context = (0, react_1.useContext)(CedrosContext);
    if (!context) {
        throw new Error('useCedrosContext must be used within CedrosProvider');
    }
    return context;
}
//# sourceMappingURL=CedrosContext.js.map