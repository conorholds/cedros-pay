import { createContext, type ReactNode, useContext, useMemo, useEffect, useRef, useState } from 'react';
import type { CedrosConfig } from '../types';
import { type IStripeManager } from '../managers/StripeManager';
import { type IX402Manager } from '../managers/X402Manager';
import { type IWalletManager } from '../managers/WalletManager';
import { type ISubscriptionManager } from '../managers/SubscriptionManager';
import { type ISubscriptionChangeManager } from '../managers/SubscriptionChangeManager';
import { type ICreditsManager } from '../managers/CreditsManager';
import { getOrCreateManagers, releaseManagers } from '../managers/ManagerCache';
import { validateConfig } from '../utils';
import { CedrosThemeProvider } from './ThemeContext';
import { createLogger, setLogger as setGlobalLogger, getLogger } from '../utils/logger';

// Lazy-load walletPool and solanaCheck to avoid pulling @solana/* into the default entry

/** Minimal interface matching WalletPool to avoid importing the module at parse time */
export interface LazyWalletPool {
  getAdapters(): unknown[];
  cleanup(): Promise<void>;
  isInitialized(): boolean;
  getId(): string;
}

/** Stub wallet pool used before the real one loads (returns empty adapters) */
const STUB_WALLET_POOL: LazyWalletPool = {
  getAdapters: () => [],
  cleanup: async () => {},
  isInitialized: () => false,
  getId: () => 'stub',
};

// Get default log level based on environment
function getDefaultLogLevel(): number {
  // In development, show all logs (DEBUG = 0)
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
    return 0; // LogLevel.DEBUG
  }
  // In production, only show warnings and errors (WARN = 2)
  return 2; // LogLevel.WARN
}

/**
 * Context value containing configuration and manager instances.
 *
 * Managers are typed as interfaces to prevent direct instantiation
 * and allow for future implementation changes.
 */
export interface CedrosContextValue {
  config: CedrosConfig;
  stripeManager: IStripeManager;
  x402Manager: IX402Manager;
  walletManager: IWalletManager;
  subscriptionManager: ISubscriptionManager;
  subscriptionChangeManager: ISubscriptionChangeManager;
  creditsManager: ICreditsManager;
  /** Context-scoped wallet pool (for internal use by CedrosPay component) */
  walletPool: LazyWalletPool;
  /** Cached Solana availability check result (null = not checked yet, string = error message, undefined = available) */
  solanaError: string | null | undefined;
}

/**
 * Props for CedrosProvider
 */
interface CedrosProviderProps {
  config: CedrosConfig;
  children: ReactNode;
}

const CedrosContext = createContext<CedrosContextValue | null>(null);

/**
 * Provider component that initializes managers and provides config
 *
 * Usage:
 * <CedrosProvider config={{ stripePublicKey, serverUrl, solanaCluster }}>
 *   <App />
 * </CedrosProvider>
 */
export function CedrosProvider({ config, children }: CedrosProviderProps) {
  const validatedConfig = useMemo(() => validateConfig(config), [config]);
  const [initError, setInitError] = useState<string | null>(null);

  // Lazy-load wallet pool via dynamic import (avoids @solana/* in default entry)
  const [walletPool, setWalletPool] = useState<LazyWalletPool>(STUB_WALLET_POOL);
  const walletPoolRef = useRef<LazyWalletPool>(STUB_WALLET_POOL);

  useEffect(() => {
    let cancelled = false;

    import('../utils/walletPool')
      .then(({ createWalletPool }) => {
        if (cancelled) return;
        const pool = createWalletPool();
        walletPoolRef.current = pool;
        setWalletPool(pool);
      })
      .catch((error) => {
        if (cancelled) return;
        getLogger().error('[CedrosProvider] Wallet pool initialization failed:', error);
        setInitError('Failed to initialize Cedros provider');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Check Solana availability once at provider level (cached for all children)
  // PERFORMANCE OPTIMIZATION: Eliminates redundant checks in CryptoButton and useX402Payment
  const [solanaError, setSolanaError] = useState<string | null | undefined>(null);

  useEffect(() => {
    let cancelled = false;

    import('../utils/solanaCheck')
      .then(({ checkSolanaAvailability }) =>
        checkSolanaAvailability()
      )
      .then((check) => {
        // Only update state if component is still mounted
        if (cancelled) return;

        if (!check.available) {
          setSolanaError(check.error || 'Solana dependencies not available');
        } else {
          setSolanaError(undefined); // undefined = available
        }
      })
      .catch((error) => {
        if (cancelled) return;
        getLogger().warn('[CedrosProvider] Solana availability check failed:', error);
        setSolanaError('Unable to verify Solana availability');
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

  // Cleanup wallet pool on unmount
  // CRITICAL FIX: Separate wallet pool cleanup from manager cleanup to avoid race conditions
  useEffect(() => {
    return () => {
      // Cleanup wallet pool when component unmounts
      const currentPool = walletPoolRef.current;
      if (currentPool && currentPool !== STUB_WALLET_POOL) {
        currentPool.cleanup().catch((error) => {
          getLogger().warn('[CedrosProvider] Wallet pool cleanup failed:', error);
        });
      }
    };
  }, []);

  // Async manager initialization (getOrCreateManagers is async due to lazy WalletManager import)
  type Managers = {
    stripeManager: IStripeManager;
    x402Manager: IX402Manager;
    walletManager: IWalletManager;
    subscriptionManager: ISubscriptionManager;
    subscriptionChangeManager: ISubscriptionChangeManager;
    creditsManager: ICreditsManager;
  };
  const [managers, setManagers] = useState<Managers | null>(null);

  useEffect(() => {
    let cancelled = false;
    let managersAcquired = false;

    // Capture config values for cleanup
    // stripePublicKey may be undefined in crypto-only integrations (showCard: false)
    const stripeKey = validatedConfig.stripePublicKey ?? '';
    const serverUrl = validatedConfig.serverUrl ?? '';
    const cluster = validatedConfig.solanaCluster;
    const endpoint = validatedConfig.solanaEndpoint;
    const allowUnknownMint = validatedConfig.dangerouslyAllowUnknownMint;

    getOrCreateManagers(stripeKey, serverUrl, cluster, endpoint, allowUnknownMint)
      .then((result) => {
        if (cancelled) {
          // If unmounted before async init completes, release immediately to avoid ref leaks.
          releaseManagers(stripeKey, serverUrl, cluster, endpoint, allowUnknownMint);
          return;
        }

        managersAcquired = true;
        setManagers(result);
      })
      .catch((error) => {
        if (cancelled) return;
        getLogger().error('[CedrosProvider] Manager initialization failed:', error);
        setInitError('Failed to initialize Cedros provider');
      });

    return () => {
      cancelled = true;
      if (managersAcquired) {
        releaseManagers(stripeKey, serverUrl, cluster, endpoint, allowUnknownMint);
      }
    };
  }, [
    validatedConfig.stripePublicKey,
    validatedConfig.serverUrl,
    validatedConfig.solanaCluster,
    validatedConfig.solanaEndpoint,
    validatedConfig.dangerouslyAllowUnknownMint,
  ]);

  // Build context value (null until managers are loaded)
  const contextValue = useMemo(() => {
    if (!managers) return null;

    return {
      config: validatedConfig,
      ...managers,
      walletPool,
      solanaError,
    };
  }, [validatedConfig, managers, walletPool, solanaError]);

  if (initError) {
    return <div role="alert">{initError}</div>;
  }

  // Always mount the theme provider so its internal state (e.g. CSS variables,
  // event subscriptions) is never torn down during the async init phase.
  // Children are rendered only once the context value is ready, preventing
  // useCedrosContext() calls from throwing during the loading window.
  return (
    <CedrosThemeProvider
      initialMode={validatedConfig.theme ?? 'light'}
      overrides={validatedConfig.themeOverrides}
      unstyled={validatedConfig.unstyled ?? false}
    >
      {contextValue ? (
        <CedrosContext.Provider value={contextValue}>
          {children}
        </CedrosContext.Provider>
      ) : null}
    </CedrosThemeProvider>
  );
}

/**
 * Hook to access Cedros context
 *
 * @throws Error if used outside CedrosProvider
 */
export function useCedrosContext(): CedrosContextValue {
  const context = useContext(CedrosContext);

  if (!context) {
    throw new Error('useCedrosContext must be used within CedrosProvider');
  }

  return context;
}
