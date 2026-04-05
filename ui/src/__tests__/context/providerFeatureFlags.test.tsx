import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import type { CedrosConfig } from '../../types';

type MockManagers = {
  stripeManager: unknown;
  x402Manager: unknown;
  walletManager: unknown;
  subscriptionManager: unknown;
  subscriptionChangeManager: unknown;
  creditsManager: unknown;
};

const baseConfig: CedrosConfig = {
  stripePublicKey: 'pk_test_123',
  serverUrl: 'http://localhost:8080',
  solanaCluster: 'devnet',
};

function createMockManagers(): MockManagers {
  return {
    stripeManager: {},
    x402Manager: {},
    walletManager: {},
    subscriptionManager: {},
    subscriptionChangeManager: {},
    creditsManager: {},
  };
}

describe('CedrosProvider feature flags', () => {
  afterEach(() => {
    delete process.env.CEDROS_FEATURE_COMPLIANCE_CHECK;
    vi.doUnmock('../../managers/ManagerCache');
    vi.doUnmock('../../utils/walletPool');
    vi.doUnmock('../../utils/solanaCheck');
    vi.resetModules();
    vi.restoreAllMocks();
  });

  async function renderProvider(config: CedrosConfig) {
    const getOrCreateManagers = vi.fn().mockResolvedValue(createMockManagers());

    vi.resetModules();
    vi.doMock('../../managers/ManagerCache', () => ({
      getOrCreateManagers,
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

    await waitFor(() => expect(getOrCreateManagers).toHaveBeenCalledTimes(1));

    return getOrCreateManagers;
  }

  it('passes featureFlags overrides to manager initialization', async () => {
    const getOrCreateManagers = await renderProvider({
      ...baseConfig,
      featureFlags: {
        complianceCheck: true,
      },
    });

    expect(getOrCreateManagers).toHaveBeenCalledWith(
      baseConfig.stripePublicKey,
      baseConfig.serverUrl,
      baseConfig.solanaCluster,
      undefined,
      undefined,
      true
    );
  });

  it('prefers explicit featureFlags over the legacy complianceCheck alias', async () => {
    const getOrCreateManagers = await renderProvider({
      ...baseConfig,
      complianceCheck: true,
      featureFlags: {
        complianceCheck: false,
      },
    });

    expect(getOrCreateManagers).toHaveBeenCalledWith(
      baseConfig.stripePublicKey,
      baseConfig.serverUrl,
      baseConfig.solanaCluster,
      undefined,
      undefined,
      false
    );
  });
});
