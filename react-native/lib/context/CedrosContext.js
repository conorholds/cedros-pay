"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CedrosProvider = CedrosProvider;
exports.useCedrosContext = useCedrosContext;
const react_1 = require("react");
const react_native_1 = require("react-native");
const stripe_react_native_1 = require("@stripe/stripe-react-native");
const ManagerCache_1 = require("../managers/ManagerCache");
const utils_1 = require("../utils");
const ThemeContext_1 = require("./ThemeContext");
const logger_1 = require("../utils/logger");
const walletPool_1 = require("../utils/walletPool");
const solanaCheck_1 = require("../utils/solanaCheck");
const paywallProductCatalog_1 = require("../policy/paywallProductCatalog");
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
    const [syncedProductCatalog, setSyncedProductCatalog] = (0, react_1.useState)(undefined);
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
    (0, react_1.useEffect)(() => {
        const syncEnabled = validatedConfig.paymentPolicy?.productCatalogSync?.enabled !== false;
        if (!syncEnabled || !validatedConfig.serverUrl) {
            setSyncedProductCatalog(undefined);
            return;
        }
        const controller = new AbortController();
        void (0, paywallProductCatalog_1.fetchCedrosProductCatalog)({
            serverUrl: validatedConfig.serverUrl,
            limit: validatedConfig.paymentPolicy?.productCatalogSync?.limit,
            signal: controller.signal,
        })
            .then((catalog) => {
            setSyncedProductCatalog(catalog);
        })
            .catch((error) => {
            if (controller.signal.aborted) {
                return;
            }
            (0, logger_1.getLogger)().warn('[CedrosProvider] Failed to sync payment policy product catalog from paywall products:', error);
            setSyncedProductCatalog(undefined);
        });
        return () => {
            controller.abort();
        };
    }, [
        validatedConfig.paymentPolicy?.productCatalogSync?.enabled,
        validatedConfig.paymentPolicy?.productCatalogSync?.limit,
        validatedConfig.serverUrl,
    ]);
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
    // Handle Stripe deep links centrally so PaymentSheet can resume app-based auth flows.
    (0, react_1.useEffect)(() => {
        let cancelled = false;
        const maybeHandleStripeUrl = async (url) => {
            if (!url || cancelled) {
                return;
            }
            try {
                await (0, stripe_react_native_1.handleURLCallback)(url);
            }
            catch (error) {
                (0, logger_1.getLogger)().warn('[CedrosProvider] Stripe URL callback handling failed:', error);
            }
        };
        void react_native_1.Linking.getInitialURL().then(maybeHandleStripeUrl);
        const subscription = react_native_1.Linking.addEventListener('url', (event) => {
            void maybeHandleStripeUrl(event.url);
        });
        return () => {
            cancelled = true;
            subscription.remove();
        };
    }, []);
    // Release manager cache reference when config changes or on unmount
    // CRITICAL FIX: Capture config values in closure to ensure correct managers are released
    (0, react_1.useEffect)(() => {
        // Capture config values at effect creation time
        const stripeKey = validatedConfig.stripePublicKey;
        const serverUrl = validatedConfig.serverUrl ?? '';
        const cluster = validatedConfig.solanaCluster;
        const stripeReturnUrl = validatedConfig.stripeReturnUrl;
        const endpoint = validatedConfig.solanaEndpoint;
        const allowUnknownMint = validatedConfig.dangerouslyAllowUnknownMint;
        const storeBillingConfig = validatedConfig.paymentPolicy?.storeBilling;
        return () => {
            // Release the exact managers that were created with these config values
            (0, ManagerCache_1.releaseManagers)(stripeKey, serverUrl, cluster, stripeReturnUrl, endpoint, allowUnknownMint, storeBillingConfig);
        };
    }, [
        validatedConfig.stripePublicKey,
        validatedConfig.serverUrl,
        validatedConfig.solanaCluster,
        validatedConfig.stripeReturnUrl,
        validatedConfig.solanaEndpoint,
        validatedConfig.dangerouslyAllowUnknownMint,
        validatedConfig.paymentPolicy?.storeBilling,
    ]);
    // Get or create managers from global cache
    // Multiple providers with identical configs share manager instances (e.g., same Stripe.js load)
    // Wallet pools remain isolated per provider for multi-tenant security
    const resolvedConfig = (0, react_1.useMemo)(() => {
        const manualCatalog = validatedConfig.paymentPolicy?.productCatalog;
        const hasSyncedCatalog = syncedProductCatalog && Object.keys(syncedProductCatalog).length > 0;
        const hasManualCatalog = manualCatalog && Object.keys(manualCatalog).length > 0;
        if (!hasSyncedCatalog && !hasManualCatalog) {
            return validatedConfig;
        }
        return {
            ...validatedConfig,
            paymentPolicy: {
                ...validatedConfig.paymentPolicy,
                productCatalog: {
                    ...(hasSyncedCatalog ? syncedProductCatalog : {}),
                    ...(hasManualCatalog ? manualCatalog : {}),
                },
            },
        };
    }, [syncedProductCatalog, validatedConfig]);
    const contextValue = (0, react_1.useMemo)(() => {
        const { stripeManager, x402Manager, walletManager, subscriptionManager, subscriptionChangeManager, creditsManager, storeBillingManager, } = (0, ManagerCache_1.getOrCreateManagers)(resolvedConfig.stripePublicKey, resolvedConfig.serverUrl ?? '', resolvedConfig.solanaCluster, resolvedConfig.stripeReturnUrl, resolvedConfig.solanaEndpoint, resolvedConfig.dangerouslyAllowUnknownMint, resolvedConfig.paymentPolicy?.storeBilling);
        return {
            config: resolvedConfig,
            stripeManager,
            x402Manager,
            walletManager,
            subscriptionManager,
            subscriptionChangeManager,
            creditsManager,
            storeBillingManager,
            walletPool: walletPoolRef.current,
            solanaError,
        };
    }, [resolvedConfig, solanaError]);
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