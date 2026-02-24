import { afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { CedrosConfig } from '../../types';

describe('CedrosProvider initialization errors', () => {
  const config: CedrosConfig = {
    stripePublicKey: 'pk_test_123',
    serverUrl: 'http://localhost:8080',
    solanaCluster: 'devnet',
  };

  afterEach(() => {
    // Ensure dynamic module mocks never leak into unrelated suites.
    vi.doUnmock('../../managers/ManagerCache');
    vi.doUnmock('../../utils/walletPool');
    vi.doUnmock('../../utils/solanaCheck');
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('renders deterministic error UI when manager initialization fails', async () => {
    vi.resetModules();
    vi.doMock('../../managers/ManagerCache', () => ({
      getOrCreateManagers: vi.fn().mockRejectedValue(new Error('manager init failed')),
      releaseManagers: vi.fn(),
    }));
    vi.doMock('../../utils/walletPool', () => ({
      createWalletPool: () => ({
        getAdapters: () => [],
        cleanup: async () => {},
        isInitialized: () => true,
        getId: () => 'mock-pool',
      }),
    }));
    vi.doMock('../../utils/solanaCheck', () => ({
      checkSolanaAvailability: vi.fn().mockResolvedValue({ available: true }),
    }));

    const { CedrosProvider } = await import('../../context');

    render(
      <CedrosProvider config={config}>
        <div>ready</div>
      </CedrosProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Failed to initialize Cedros provider');
    });

    expect(screen.queryByText('ready')).not.toBeInTheDocument();

  });

  it('releases managers if provider unmounts before async init completes', async () => {
    vi.resetModules();

    type MockManagers = {
      stripeManager: unknown;
      x402Manager: unknown;
      walletManager: unknown;
      subscriptionManager: unknown;
      subscriptionChangeManager: unknown;
      creditsManager: unknown;
      routeDiscovery: unknown;
    };
    let resolveManagers: (value: MockManagers) => void = () => {};
    const getOrCreateManagers = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveManagers = resolve;
        })
    );
    const releaseManagers = vi.fn();

    vi.doMock('../../managers/ManagerCache', () => ({
      getOrCreateManagers,
      releaseManagers,
    }));
    vi.doMock('../../utils/walletPool', () => ({
      createWalletPool: () => ({
        getAdapters: () => [],
        cleanup: async () => {},
        isInitialized: () => true,
        getId: () => 'mock-pool',
      }),
    }));
    vi.doMock('../../utils/solanaCheck', () => ({
      checkSolanaAvailability: vi.fn().mockResolvedValue({ available: true }),
    }));

    const { CedrosProvider } = await import('../../context');

    const { unmount } = render(
      <CedrosProvider config={config}>
        <div>ready</div>
      </CedrosProvider>
    );

    unmount();

    resolveManagers({
      stripeManager: {},
      x402Manager: {},
      walletManager: {},
      subscriptionManager: {},
      subscriptionChangeManager: {},
      creditsManager: {},
      routeDiscovery: {},
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(releaseManagers).toHaveBeenCalledWith(
      config.stripePublicKey,
      config.serverUrl,
      config.solanaCluster,
      undefined,
      undefined
    );

  });
});
