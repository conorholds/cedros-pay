import { ReactNode } from 'react';
import { CedrosConfig } from '../types';
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
export declare function createMockCedrosProvider(config?: MockCedrosProviderConfig): ({ children }: {
    children: ReactNode;
}) => import("react/jsx-runtime").JSX.Element;
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
export declare function createMinimalMockProvider(): ({ children }: {
    children: ReactNode;
}) => import("react/jsx-runtime").JSX.Element;
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
export declare function mockWalletProvider(walletState?: {
    connected?: boolean;
    publicKey?: string;
    connecting?: boolean;
}): ({ children }: {
    children: ReactNode;
}) => import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=providers.d.ts.map