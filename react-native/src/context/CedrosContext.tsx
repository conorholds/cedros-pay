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
import { createWalletPool, type WalletPool } from '../utils/walletPool';
import { checkSolanaAvailability } from '../utils/solanaCheck';

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
  walletPool: WalletPool;
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

  // Create context-scoped wallet pool (one per CedrosProvider instance)
  // Using useRef to ensure it's only created once per component lifecycle
  const walletPoolRef = useRef<WalletPool | null>(null);
  if (walletPoolRef.current === null) {
    walletPoolRef.current = createWalletPool();
  }

  // Check Solana availability once at provider level (cached for all children)
  // PERFORMANCE OPTIMIZATION: Eliminates redundant checks in CryptoButton and useX402Payment
  const [solanaError, setSolanaError] = useState<string | null | undefined>(null);

  useEffect(() => {
    let cancelled = false;

    checkSolanaAvailability().then((check) => {
      // Only update state if component is still mounted
      if (cancelled) return;

      if (!check.available) {
        setSolanaError(check.error || 'Solana dependencies not available');
      } else {
        setSolanaError(undefined); // undefined = available
      }
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

  // Release manager cache reference when config changes or on unmount
  // CRITICAL FIX: Capture config values in closure to ensure correct managers are released
  useEffect(() => {
    // Capture config values at effect creation time
    const stripeKey = validatedConfig.stripePublicKey;
    const serverUrl = validatedConfig.serverUrl ?? '';
    const cluster = validatedConfig.solanaCluster;
    const endpoint = validatedConfig.solanaEndpoint;
    const allowUnknownMint = validatedConfig.dangerouslyAllowUnknownMint;

    return () => {
      // Release the exact managers that were created with these config values
      releaseManagers(stripeKey, serverUrl, cluster, endpoint, allowUnknownMint);
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
  const contextValue = useMemo(() => {
    const { stripeManager, x402Manager, walletManager, subscriptionManager, subscriptionChangeManager, creditsManager } =
      getOrCreateManagers(
        validatedConfig.stripePublicKey,
        validatedConfig.serverUrl ?? '',
        validatedConfig.solanaCluster,
        validatedConfig.solanaEndpoint,
        validatedConfig.dangerouslyAllowUnknownMint
      );

    return {
      config: validatedConfig,
      stripeManager,
      x402Manager,
      walletManager,
      subscriptionManager,
      subscriptionChangeManager,
      creditsManager,
      walletPool: walletPoolRef.current!,
      solanaError,
    };
  }, [validatedConfig, solanaError]);

  return (
    <CedrosContext.Provider value={contextValue}>
      <CedrosThemeProvider
        initialMode={validatedConfig.theme ?? 'light'}
        overrides={validatedConfig.themeOverrides}
        unstyled={validatedConfig.unstyled ?? false}
      >
        {children}
      </CedrosThemeProvider>
    </CedrosContext.Provider>
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
