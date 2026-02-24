/**
 * Test provider wrappers for Cedros Pay components
 *
 * These providers make it easy to test components that use CedrosContext
 * without needing to mock all dependencies manually.
 */

import type { ReactNode } from 'react';
import type { CedrosConfig } from '../types';
import { CedrosProvider } from '../context/CedrosContext';

/**
 * Configuration for creating a mock Cedros provider
 */
export interface MockCedrosProviderConfig extends Partial<CedrosConfig> {
  /** Mock implementations for managers (optional) */
  mockManagers?: {
    stripeManager?: Record<string, unknown>;
    x402Manager?: Record<string, unknown>;
    walletManager?: Record<string, unknown>;
    routeDiscoveryManager?: Record<string, unknown>;
  };
}

/**
 * Creates a mock CedrosProvider for testing
 *
 * @param config - Optional configuration
 * @returns Mock provider component
 *
 * @example
 * ```typescript
 * import { render } from '@testing-library/react';
 * import { createMockCedrosProvider } from '@cedros/pay-react/testing';
 *
 * const MockProvider = createMockCedrosProvider({
 *   stripePublicKey: 'pk_test_mock',
 *   serverUrl: 'http://localhost:8080',
 * });
 *
 * render(
 *   <MockProvider>
 *     <YourComponent />
 *   </MockProvider>
 * );
 * ```
 */
export function createMockCedrosProvider(config: MockCedrosProviderConfig = {}) {
  // Return a wrapper component that renders the real CedrosProvider
  // CedrosProvider is imported at the top of this file using standard ESM import
  return function MockCedrosProvider({ children }: { children: ReactNode }) {
    // Build a complete CedrosConfig with sensible defaults
    const fullConfig = {
      stripePublicKey: config.stripePublicKey ?? 'pk_test_mock_key_for_testing',
      serverUrl: config.serverUrl ?? 'http://localhost:8080',
      solanaCluster: config.solanaCluster ?? 'devnet',
      solanaEndpoint: config.solanaEndpoint,
      theme: config.theme ?? 'light',
      themeOverrides: config.themeOverrides,
      unstyled: false,
      tokenMint: undefined,
      dangerouslyAllowUnknownMint: true, // Allow any mint in test mode
      logLevel: 4, // LogLevel.SILENT - no logs in tests
    };

    // Render the real CedrosProvider with mock config
    // This ensures all hooks (useCedrosContext, etc.) work correctly in tests
    return <CedrosProvider config={fullConfig}>{children}</CedrosProvider>;
  };
}

/**
 * Creates a minimal mock provider for simple tests
 *
 * @returns Minimal mock provider component
 *
 * @example
 * ```typescript
 * const MinimalProvider = createMinimalMockProvider();
 *
 * render(
 *   <MinimalProvider>
 *     <YourComponent />
 *   </MinimalProvider>
 * );
 * ```
 */
export function createMinimalMockProvider() {
  return createMockCedrosProvider({
    stripePublicKey: 'pk_test_minimal',
    serverUrl: 'http://localhost:8080',
    solanaCluster: 'devnet',
  });
}

/**
 * Wrapper for testing with Solana wallet mocks
 *
 * @param walletState - Mock wallet state
 * @returns Mock wallet provider component
 *
 * @example
 * ```typescript
 * import { mockWalletProvider } from '@cedros/pay-react/testing';
 *
 * const WalletProvider = mockWalletProvider({
 *   connected: true,
 *   publicKey: 'mockWallet123',
 * });
 *
 * render(
 *   <WalletProvider>
 *     <CryptoButton resource="test" />
 *   </WalletProvider>
 * );
 * ```
 */
export function mockWalletProvider(walletState: {
  connected?: boolean;
  publicKey?: string;
  connecting?: boolean;
} = {}) {
  const _walletState = {
    connected: walletState.connected ?? false,
    publicKey: walletState.publicKey ?? 'mockWallet123',
    connecting: walletState.connecting ?? false,
  };

  return function MockWalletProvider({ children }: { children: ReactNode }) {
    // Wallet state is available for testing but not used in this simple mock
    void _walletState;
    return <>{children}</>;
  };
}
