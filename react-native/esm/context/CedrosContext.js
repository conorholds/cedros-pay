import { createContext, useContext, useMemo, useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';
import { handleURLCallback } from '@stripe/stripe-react-native';
import { getOrCreateManagers, releaseManagers } from '../managers/ManagerCache';
import { validateConfig } from '../utils';
import { CedrosThemeProvider } from './ThemeContext';
import { createLogger, setLogger as setGlobalLogger, getLogger } from '../utils/logger';
import { createWalletPool } from '../utils/walletPool';
import { checkSolanaAvailability } from '../utils/solanaCheck';
import { fetchCedrosProductCatalog } from '../policy/paywallProductCatalog';
// Get default log level based on environment
function getDefaultLogLevel() {
    // In development, show all logs (DEBUG = 0)
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
        return 0; // LogLevel.DEBUG
    }
    // In production, only show warnings and errors (WARN = 2)
    return 2; // LogLevel.WARN
}
const CedrosContext = createContext(null);
/**
 * Provider component that initializes managers and provides config
 *
 * Usage:
 * <CedrosProvider config={{ stripePublicKey, serverUrl, solanaCluster }}>
 *   <App />
 * </CedrosProvider>
 */
export function CedrosProvider({ config, children }) {
    const validatedConfig = useMemo(() => validateConfig(config), [config]);
    const [initError, setInitError] = useState(null);
    const [syncedProductCatalog, setSyncedProductCatalog] = useState(undefined);
    // Create context-scoped wallet pool (one per CedrosProvider instance)
    // Using useRef to ensure it's only created once per component lifecycle
    const walletPoolRef = useRef(null);
    if (walletPoolRef.current === null) {
        walletPoolRef.current = createWalletPool();
    }
    // Check Solana availability once at provider level (cached for all children)
    // PERFORMANCE OPTIMIZATION: Eliminates redundant checks in CryptoButton and useX402Payment
    const [solanaError, setSolanaError] = useState(null);
    useEffect(() => {
        let cancelled = false;
        checkSolanaAvailability()
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
            getLogger().error('[CedrosProvider] Solana availability check failed:', error);
            setInitError('Failed to initialize Cedros provider');
        });
        return () => {
            cancelled = true;
        };
    }, []);
    // Initialize logger with user-configured log level
    useEffect(() => {
        const logLevel = validatedConfig.logLevel ?? getDefaultLogLevel();
        const logger = createLogger({
            level: logLevel,
            prefix: '[CedrosPay]',
        });
        // Set as global logger instance
        setGlobalLogger(logger);
    }, [validatedConfig.logLevel]);
    useEffect(() => {
        const syncEnabled = validatedConfig.paymentPolicy?.productCatalogSync?.enabled !== false;
        if (!syncEnabled || !validatedConfig.serverUrl) {
            setSyncedProductCatalog(undefined);
            return;
        }
        const controller = new AbortController();
        void fetchCedrosProductCatalog({
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
            getLogger().warn('[CedrosProvider] Failed to sync payment policy product catalog from paywall products:', error);
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
    useEffect(() => {
        const currentPool = walletPoolRef.current;
        return () => {
            // Cleanup wallet pool when component unmounts
            if (currentPool) {
                currentPool.cleanup().catch((error) => {
                    getLogger().warn('[CedrosProvider] Wallet pool cleanup failed:', error);
                });
            }
        };
        // walletPoolRef.current is intentionally omitted - we only want cleanup on unmount, not on ref changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    // Handle Stripe deep links centrally so PaymentSheet can resume app-based auth flows.
    useEffect(() => {
        let cancelled = false;
        const maybeHandleStripeUrl = async (url) => {
            if (!url || cancelled) {
                return;
            }
            try {
                await handleURLCallback(url);
            }
            catch (error) {
                getLogger().warn('[CedrosProvider] Stripe URL callback handling failed:', error);
            }
        };
        void Linking.getInitialURL().then(maybeHandleStripeUrl);
        const subscription = Linking.addEventListener('url', (event) => {
            void maybeHandleStripeUrl(event.url);
        });
        return () => {
            cancelled = true;
            subscription.remove();
        };
    }, []);
    // Release manager cache reference when config changes or on unmount
    // CRITICAL FIX: Capture config values in closure to ensure correct managers are released
    useEffect(() => {
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
            releaseManagers(stripeKey, serverUrl, cluster, stripeReturnUrl, endpoint, allowUnknownMint, storeBillingConfig);
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
    const resolvedConfig = useMemo(() => {
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
    const contextValue = useMemo(() => {
        const { stripeManager, x402Manager, walletManager, subscriptionManager, subscriptionChangeManager, creditsManager, storeBillingManager, } = getOrCreateManagers(resolvedConfig.stripePublicKey, resolvedConfig.serverUrl ?? '', resolvedConfig.solanaCluster, resolvedConfig.stripeReturnUrl, resolvedConfig.solanaEndpoint, resolvedConfig.dangerouslyAllowUnknownMint, resolvedConfig.paymentPolicy?.storeBilling);
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
      <CedrosThemeProvider initialMode={validatedConfig.theme ?? 'light'} overrides={validatedConfig.themeOverrides} unstyled={validatedConfig.unstyled ?? false}>
        {children}
      </CedrosThemeProvider>
    </CedrosContext.Provider>);
}
/**
 * Hook to access Cedros context
 *
 * @throws Error if used outside CedrosProvider
 */
export function useCedrosContext() {
    const context = useContext(CedrosContext);
    if (!context) {
        throw new Error('useCedrosContext must be used within CedrosProvider');
    }
    return context;
}
//# sourceMappingURL=CedrosContext.js.map